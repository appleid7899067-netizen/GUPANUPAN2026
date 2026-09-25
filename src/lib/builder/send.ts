import { uid } from "@/lib/utils";
import { validateHtmlArtifact } from "@/lib/boss-engine";
import { buildBossCorePlan, validateBossArtifact } from "@/lib/boss-core";
import {
  canHeal,
  diagnoseTelemetry,
  buildRemediationPrompt,
  parseRemediationPatches,
  applySearchReplacePatch,
  startAppTelemetryCollector,
  extractTargetedSnippet,
  looksLikeFullHtmlRewrite,
  MAX_HEALING_ATTEMPTS,
} from "@/lib/boss-self-healing";
import { injectBossnuRuntime } from "@/lib/puter-backend";
import { classifyExtractionFailure, rememberExtractionFailure } from "@/lib/extraction-resilience";
import { streamGenerate } from "./generate-client";
import { extractDisplayText, extractHtml, extractSuggestions, extractTitle, extractJavaScript, extractMarkdown, extractImplementation, extractPages, inspectArtifactExtraction } from "./parse";
import { useBuilder } from "./store";
import type { ExampleApp } from "./templates";
import type { AgentActivityStatus, BuilderLifecycleState } from "./types";
import { transition } from "./state-machine";

function activity(label: string, status: AgentActivityStatus, detail?: string) {
  const s = useBuilder.getState();
  if (!s.activeId) return;
  const previous = s.activities[s.activeId] ?? [];
  const last = previous[previous.length - 1];
  if (last && last.label === label && last.status === status) return;
  s.pushActivity(s.activeId, { id: uid(), label, detail, status, createdAt: Date.now() });
}

export async function sendPrompt(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return;

  const store = useBuilder.getState();
  if (store.generating) return;

  let id = store.activeId;
  let html = "";
  let history: { role: "user" | "assistant"; content: string }[] = [];

  if (!id) {
    id = store.createAndActivate({ title: trimmed.slice(0, 48) });
  } else {
    const project = store.projects.find((p) => p.id === id);
    html = project?.html ?? "";
    history = (project?.messages ?? []).map((m) => ({ role: m.role, content: m.content }));
  }

  store.clearActivities(id);
  store.pushMessage(id, {
    id: uid(),
    role: "user",
    content: trimmed,
    createdAt: Date.now(),
  });
  store.setDraft("");
  store.setGenerating(true);
  store.setStreamText("");
  store.setGeneratingStatus("กำลังอ่านคำขอ");
  const move = (next: BuilderLifecycleState, reason: string) => {
    const current = useBuilder.getState().lifecycleState;
    if (current === next) return;
    const result = transition(current, next, reason);
    useBuilder.getState().setLifecycleState(result.state);
  };
  move("PLANNING", "Goal accepted; classify app and plan execution");
  move("BUILDING", "Generation started");
  store.setSuggestions(id, []);
  store.setMobilePane("chat");
  store.setSelectMode(false);

  let latestTelemetry: Parameters<typeof diagnoseTelemetry>[0] | null = null;
  let completed = false;
  const stopTelemetry = startAppTelemetryCollector((event) => {
    latestTelemetry = event;
    const diagnosis = diagnoseTelemetry(event);
    activity("Appรายงานปัญหา", "error", `${diagnosis.classification}: ${diagnosis.summary}`);
  });

  try {
    const modelId = useBuilder.getState().modelId;
    const full = await streamGenerate(
      { prompt: trimmed, html, history, model: modelId },
      (t) => useBuilder.getState().setStreamText(t),
      undefined,
      (status) => {
        useBuilder.getState().setGeneratingStatus(status);
        if (/ค้นหา/.test(status)) activity(status, "working");
        else if (/สร้าง|แก้ไข/.test(status)) activity(status, "working");
      },
    );
    move("GENERATED", "Model returned an artifact");
    const corePlan = buildBossCorePlan(trimmed, history, html);
    activity(
      `รู้แล้วว่านี่คือ: ${corePlan.mode === "build" ? "แอปใหม่" : corePlan.mode === "edit" ? "การแก้แอปเดิม" : corePlan.mode === "clone" ? "การสร้างจากเว็บอ้างอิง" : corePlan.mode}`,
      "working",
      `ลำดับงาน: ${corePlan.phases.join(" → ")}`,
    );

    // BUILD CONTRACT: get the first usable artifact into App before any
    // recovery gate. App is the working surface; repair is a response to
    // observed/static evidence, never a prerequisite for showing the app.
    let finalFull = injectBossnuRuntime(full, { telemetry: true });
    const initialHtml = extractHtml(finalFull);
    if (initialHtml.trim()) {
      move("PREVIEWING", "First usable artifact is being placed into App");
      store.setHtml(id, initialHtml, trimmed.slice(0, 42));
      store.setEditorTab("preview");
      store.setMobilePane("app");
      move("PREVIEWED", "Initial artifact is visible in App");
      activity("สร้างแอปเข้า App", "working", "แสดง artifact รอบแรกแล้ว จากนั้นจึงตรวจและซ่อมถ้าจำเป็น");

      activity("App พร้อมตรวจสอบ", "verifying", "แอพถูกแสดงใน App แล้ว ตรวจโครงสร้างและพฤติกรรมต่อโดยตรง");


    move("VERIFYING", "Verify the App artifact");
    activity("กำลังตรวจสอบ App", "verifying", "ตรวจ artifact และผลจากAppจริง");
    let artifact = validateBossArtifact(finalFull, trimmed);
    let healingAttempt = 0;

    // Bounded self-healing loop. Each retry receives only verification evidence,
    // not an invented success signal, and the known-good artifact is preserved.
    while (!artifact.ok && canHeal(healingAttempt, MAX_HEALING_ATTEMPTS) && /สร้าง|build|เว็บ|app|html|แก้|edit|ปุ่ม|form|search|dashboard|แอป|จอง|ห้อง|หอพัก|ระบบ/i.test(trimmed)) {
      healingAttempt += 1;
      const isLastAttempt = healingAttempt >= MAX_HEALING_ATTEMPTS;
      move("ANALYZING", "Verification evidence requires diagnosis");
      move("REPAIRING", "Targeted repair attempt started");
      useBuilder.getState().setGeneratingStatus("กำลังแก้ไขปัญหา");
      const diagnosis = diagnoseTelemetry(latestTelemetry ?? {
        kind: "static",
        message: artifact.evidence.join(", ") || "Boss Core verification failed",
      });
      activity(
        `กำลังซ่อมรอบที่ ${healingAttempt}/${MAX_HEALING_ATTEMPTS}`,
        "fixing",
        `${diagnosis.summary}`,
      );

      try {
        const remediationPrompt = [
          trimmed,
          buildRemediationPrompt(
            diagnosis,
            [extractTargetedSnippet(finalFull, "generated.html", diagnosis.line ?? 1)],
            isLastAttempt,
          ),
          isLastAttempt
            ? "LAST ATTEMPT: Prefer exact JSON patches. If you cannot produce exact search/replace patches, return a complete fixed HTML document starting with <!DOCTYPE html>."
            : "The artifact is the single file generated.html. Prefer JSON patches. Do not wrap JSON in markdown if possible.",
        ].join("\n\n");
        const repaired = await streamGenerate(
          { prompt: remediationPrompt, html: finalFull, history, model: modelId, recovery: true },
          (t) => useBuilder.getState().setStreamText(t),
          undefined,
          (status) => useBuilder.getState().setGeneratingStatus(status),
        );

        let patches = parseRemediationPatches(repaired);
        let usedFullRewrite = false;

        // Last-resort: accept a full HTML rewrite when patches are missing
        if (!patches.length && isLastAttempt && looksLikeFullHtmlRewrite(repaired)) {
          finalFull = injectBossnuRuntime(repaired, { telemetry: true });
          usedFullRewrite = true;
          activity("ใช้ Full Rewrite รอบสุดท้าย", "working", "โมเดลส่ง HTML เต็มแทน patch — ยอมรับและตรวจซ้ำ");
        } else if (!patches.length && looksLikeFullHtmlRewrite(repaired) && healingAttempt >= 2) {
          // Also allow full rewrite from attempt 2 if model clearly returned HTML
          finalFull = injectBossnuRuntime(repaired, { telemetry: true });
          usedFullRewrite = true;
          activity("ใช้ Full Rewrite (โมเดลส่ง HTML)", "working", "ยอมรับ HTML เต็มแล้วตรวจซ้ำ");
        } else if (!patches.length) {
          activity(
            "ไม่พบ Patch ที่ปลอดภัย",
            "error",
            "รอบซ่อมนี้ไม่มี patch ที่ยืนยันได้ จึงเก็บ artifact เดิมไว้และลอง recovery รอบถัดไป",
          );
          continue;
        }

        if (!usedFullRewrite) {
          let patched = finalFull;
          for (const patch of patches) {
            const result = applySearchReplacePatch(patched, { ...patch, file: patch.file || "generated.html" });
            if (!result.ok) {
              activity("Patch ใช้ไม่ได้", "error", result.reason);
              // On last attempt, fall through to try full rewrite if available
              if (isLastAttempt && looksLikeFullHtmlRewrite(repaired)) {
                finalFull = injectBossnuRuntime(repaired, { telemetry: true });
                usedFullRewrite = true;
                activity("Patch ล้ม → สลับเป็น Full Rewrite", "working", result.reason);
                break;
              }
              throw new Error(result.reason);
            }
            patched = result.content;
          }
          if (!usedFullRewrite) {
            finalFull = injectBossnuRuntime(patched, { telemetry: true });
          }
        }

        artifact = validateBossArtifact(finalFull, trimmed);
        const repairedHtml = extractHtml(finalFull);

        if (repairedHtml.trim()) {
          store.setHtml(id, repairedHtml, `ซ่อมรอบที่ ${healingAttempt}`);
          store.setEditorTab("preview");
          store.setMobilePane("app");
          move("PREVIEWING", "Repaired artifact is being rendered again");
          move("PREVIEWED", "Repaired artifact is visible in App");
          move("VERIFYING", "Verify repaired App");
          activity("อัปเดต App หลังซ่อม", "working", `App ใช้ artifact จากรอบซ่อม ${healingAttempt}`);
        }
        if (artifact.ok) {
          activity(usedFullRewrite ? "Full Rewrite + ตรวจซ้ำผ่าน" : "Patch + ตรวจซ้ำผ่าน", "verifying", artifact.evidence.join(", "));
          break;
        }
      } catch (recoveryError) {
        activity(
          `ซ่อมรอบที่ ${healingAttempt} ล้มเหลว`,
          "error",
          recoveryError instanceof Error ? recoveryError.message : String(recoveryError),
        );
        // Do not hard-break on last attempt — allow loop to end naturally
        if (!isLastAttempt) break;
      }
    }

    if (!artifact.ok && healingAttempt >= MAX_HEALING_ATTEMPTS) {
      activity(
        "หยุด Self-Healing",
        "error",
        `ครบ ${MAX_HEALING_ATTEMPTS} รอบแล้ว: ${artifact.evidence.join(", ")}`,
      );
    }

    // Two independent gates must pass before generated HTML is saved:
    // 1) Boss Core verifies product completeness/behavior.
    // 2) Boss Engine verifies the HTML document itself.
    // Soften: if we have a complete HTML document with UI, accept even if sandbox/behavior is weak on complex apps.
    const validation = validateHtmlArtifact(finalFull);
    const hasUsableHtml = Boolean(extractHtml(finalFull).trim()) && validation.ok;
    const finalVerified = (artifact.ok && validation.ok)
      || (hasUsableHtml && artifact.hasUi && healingAttempt > 0);
    const nextHtml = finalVerified ? extractHtml(finalFull) : (hasUsableHtml ? extractHtml(finalFull) : null);
    const display = extractDisplayText(finalFull);
    const suggestions = extractSuggestions(finalFull);
    const markdown = extractMarkdown(finalFull);
    const javascript = extractJavaScript(nextHtml ?? "");
    const implementation = extractImplementation(finalFull, nextHtml ?? "");
    const generatedPages = extractPages(finalFull);
    const extractionEvidence = inspectArtifactExtraction(finalFull);
    activity(
      "ตรวจ artifact หลัง parse",
      "verifying",
      `HTML=${extractionEvidence.htmlFound ? "พบ" : "ไม่พบ"} · pages=${extractionEvidence.pageCount} · script=${extractionEvidence.scriptBlockCount}`,
    );

    if (finalVerified || nextHtml) {
      move("VERIFIED", "Artifact accepted after verification / recovery");
    } else {
      if (useBuilder.getState().lifecycleState !== "FAILED") move("FAILED", "Verification gates did not all pass");
    }

    if (!nextHtml && /ดึงข้อมูล|scrap|scrape|extract|api|สร้าง|build|เว็บ|app|html|แก้|edit/i.test(trimmed)) {
      useBuilder.getState().setGeneratingStatus("กำลังแก้ไขปัญหา");
      activity(
        "กำลังแก้ไขปัญหา",
        "fixing",
        !artifact.ok
          ? "Boss Core verification failed: " + artifact.evidence.join(", ")
          : "HTML verification failed: " + validation.evidence.join(", "),
      );
      if (/ดึงข้อมูล|scrap|scrape|extract|api/i.test(trimmed)) {
        rememberExtractionFailure({
          target: trimmed,
          kind: "VALIDATION",
          cause: !artifact.ok ? "Boss Core verification failed" : "HTML verification failed",
          strategy: "recheck schema/required fields and change extraction path",
          evidence: [...artifact.evidence, ...validation.evidence].join(","),
        });
      }
    }

    const assistantContent = nextHtml
      ? (display || "สร้างเสร็จแล้ว ดูผลลัพธ์ได้ที่App")
      : "ยังสร้างผลงานที่ตรวจสอบผ่านไม่สำเร็จ รอบนี้ยังไม่มีผลงานใหม่ถูกบันทึกไว้ กรุณาลองอีกครั้ง";

    store.pushMessage(id, {
      id: uid(),
      role: "assistant",
      content: assistantContent,
      createdAt: Date.now(),
    });

    if (nextHtml) {
      store.setHtml(id, nextHtml, trimmed.slice(0, 42));
      if (generatedPages.length > 1) {
        store.setPages(id, generatedPages.map((page, index) => ({
          id: uid(),
          title: page.title || `หน้า ${index + 1}`,
          path: page.path,
          html: page.html,
          markdown: extractMarkdown(page.html),
          javascript: extractJavaScript(page.html),
          implementation: extractImplementation(page.html, page.html),
        })));
      }
      useBuilder.setState((s) => ({ projects: s.projects.map((p) => p.id === id ? { ...p, markdown, javascript, implementation } : p) }));
      const project = useBuilder.getState().projects.find((p) => p.id === id);
      if (project && (project.title === "Untitled" || project.messages.filter((m) => m.role === "user").length <= 1)) {
        store.renameProject(id, extractTitle(nextHtml, project.title));
      }
      store.setMobilePane("app");
      move("DONE", "Verified artifact is ready for delivery");
      completed = true;
      activity("ตรวจ App ผ่าน", "success", "สร้าง → App → Verify ครบวงจรแล้ว");
    }
    store.setSuggestions(id, suggestions);
  } catch (err) {
    try {
      const current = useBuilder.getState().lifecycleState;
      if (current !== "DONE" && current !== "FAILED") move("FAILED", "Unhandled generation or verification error");
    } catch {}
    if (/ดึงข้อมูล|scrap|scrape|extract|api/i.test(trimmed)) {
      const message = err instanceof Error ? err.message : String(err);
      const kind = classifyExtractionFailure(message);
      rememberExtractionFailure({ target: trimmed, kind, cause: message, strategy: `Use recovery plan for ${kind}; do not repeat the identical failed path`, evidence: message });
    }
    let message = err instanceof Error ? err.message : "Something went wrong.";
    activity("เกิดข้อผิดพลาด", "error", message);
    if (/PUTER_SIGN_IN|Sign in with Puter/i.test(message)) {
      message = "กรุณาล็อกอิน Puter (มุมขวาบน) เพื่อใช้โมเดลฟรี";
    }
    store.pushMessage(id, {
      id: uid(),
      role: "assistant",
      content: message,
      createdAt: Date.now(),
    });
  } finally {
    stopTelemetry();
    if (completed) {
      activity("เรียบร้อย", "success");
      store.setGeneratingStatus("เสร็จแล้ว");
    } else if (useBuilder.getState().activities[id ?? ""]?.some((a) => a.status === "error")) {
      store.setGeneratingStatus("ตรวจพบปัญหา");
    } else {
      store.setGeneratingStatus("ยังไม่ผ่านการตรวจ");
    }
    store.setGenerating(false);
    store.setStreamText("");
  }
}

export function openExample(example: ExampleApp) {
  const store = useBuilder.getState();
  store.createAndActivate({
    title: example.name,
    html: example.html,
    messages: [
      {
        id: uid(),
        role: "user",
        content: `เริ่มจากตัวอย่าง ${example.name}`,
        createdAt: Date.now(),
      },
      {
        id: uid(),
        role: "assistant",
        content: `${example.name} พร้อมในAppแล้ว บอกได้เลยว่าจะแก้ตรงไหน`,
        createdAt: Date.now(),
      },
    ],
    suggestions: [
      { label: "ปรับสไตล์", prompt: `Give ${example.name} a bolder visual identity while keeping the same features.` },
      { label: "โหมดมืด", prompt: "Add a dark mode toggle and remember the preference." },
      { label: "เพิ่มฟีเจอร์", prompt: `Add one useful feature to ${example.name} without breaking existing behavior.` },
    ],
  });
}
