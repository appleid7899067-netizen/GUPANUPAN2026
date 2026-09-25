import { uid } from "@/lib/utils";
import { validateHtmlArtifact } from "@/lib/boss-engine";
import { validateBossArtifact } from "@/lib/boss-core";
import { diagnoseTelemetry, buildRemediationPrompt } from "@/lib/boss-self-healing";
import { injectBossnuRuntime } from "@/lib/puter-backend";
import { classifyExtractionFailure, rememberExtractionFailure } from "@/lib/extraction-resilience";
import { streamGenerate } from "./generate-client";
import { extractDisplayText, extractHtml, extractSuggestions, extractTitle, extractJavaScript, extractMarkdown, extractImplementation, extractPages, inspectArtifactExtraction } from "./parse";
import { useBuilder } from "./store";
import type { ExampleApp } from "./templates";
import type { AgentActivityStatus } from "./types";

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
  store.setSuggestions(id, []);
  store.setMobilePane("chat");
  store.setSelectMode(false);

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
    activity("กำลังตรวจสอบผลลัพธ์", "verifying", "ตรวจ output จริงก่อนบันทึกลงโปรเจกต์");
    let artifact = validateBossArtifact(full, trimmed);
    let finalFull = full;
    if (!artifact.ok && /สร้าง|build|เว็บ|app|html|แก้|edit|ปุ่ม|form|search|dashboard|แอป/i.test(trimmed)) {
      useBuilder.getState().setGeneratingStatus("กำลังแก้ไขปัญหา");
      activity("กำลังแก้ไข output", "fixing", "ผลตรวจไม่ผ่าน กำลังให้ Boss ซ่อมเฉพาะจุดแล้วตรวจซ้ำ");
      try {
        const repaired = await streamGenerate(
          {
            prompt: trimmed + "\n\nBOSS RECOVERY: The previous artifact failed the product verification gate. Repair the missing requirements and return the FULL updated HTML. Verification evidence: " + artifact.evidence.join(", ") + ". Do not remove working features.",
            html,
            history,
            model: modelId,
          },
          (t) => useBuilder.getState().setStreamText(t),
          undefined,
          (status) => useBuilder.getState().setGeneratingStatus(status),
        );
        const repairedCheck = validateBossArtifact(repaired, trimmed);
        if (repairedCheck.ok) {
          finalFull = repaired;
          artifact = repairedCheck;
          activity("ตรวจซ้ำผ่าน", "verifying", repairedCheck.evidence.join(", "));
        }
      } catch (recoveryError) {
        console.warn("[GuPanu] Boss recovery failed", recoveryError);
      }
    }
    // Every generated artifact gets the zero-config Puter runtime and preview telemetry before gates run.\n    finalFull = injectBossnuRuntime(finalFull, { telemetry: true });\n\n    // Two independent gates must pass before generated HTML is saved:
    // 1) Boss Core verifies product completeness/behavior.
    // 2) Boss Engine verifies the HTML document itself.
    const validation = validateHtmlArtifact(finalFull);
    const finalVerified = artifact.ok && validation.ok;
    const nextHtml = finalVerified ? extractHtml(finalFull) : null;
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

    if (!finalVerified && /ดึงข้อมูล|scrap|scrape|extract|api|สร้าง|build|เว็บ|app|html|แก้|edit/i.test(trimmed)) {
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

    store.pushMessage(id, {
      id: uid(),
      role: "assistant",
      content: display || (nextHtml ? "พร้อมแล้ว ดูที่พรีวิวได้เลย" : "ขอรายละเอียดเพิ่มนิดนึงก่อนสร้าง"),
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
      store.setMobilePane("preview");
    }
    store.setSuggestions(id, suggestions);
  } catch (err) {
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
    activity("เรียบร้อย", "success");
    store.setGenerating(false);
    store.setStreamText("");
    store.setGeneratingStatus("เรียบร้อย");
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
        content: `${example.name} พร้อมในพรีวิวแล้ว บอกได้เลยว่าจะแก้ตรงไหน`,
        createdAt: Date.now(),
      },
    ],
    suggestions: [
      { label: "ปรับสไตล์", prompt: `Give ${example.name} a bolder visual identity while keeping the same features.` },
      { label: "โหมดมืด", prompt: "Add a dark mode toggle and remember the preference." },
      { label: "เพิ่มหน้า", prompt: "Add another section or screen that this product would naturally have." },
      { label: example.prompt.split(":")[0] ?? "รีมิกซ์", prompt: example.prompt },
    ],
    versions: [
      {
        id: uid(),
        html: example.html,
        label: "ตัวอย่าง",
        createdAt: Date.now(),
      },
    ],
  });
  store.setEditorTab("preview");
  store.setMobilePane("preview");
}
