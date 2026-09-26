import { uid } from "@/lib/utils";
import { useBuilder } from "./store";
import { generateIntent } from "./patch-client";
import { runBuilderTurn } from "./builder-core";
import type { AgentActivityStatus, BuilderLifecycleState, CanvasPatch, CanvasState } from "./types";

function activity(label: string, status: AgentActivityStatus, detail?: string) {
  const s = useBuilder.getState();
  if (!s.activeId) return;
  s.pushActivity(s.activeId, { id: uid(), label, detail, status, createdAt: Date.now() });
}

function applyPatch(id: string, patch: CanvasPatch) {
  const store = useBuilder.getState();
  if (patch.op === "pushRoute" || patch.op === "setPage") {
    store.pushCanvasRoute(id, patch.pageId);
    return;
  }
  store.applyCanvasPatch(id, patch);
}

export async function sendPrompt(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return;
  const store = useBuilder.getState();
  if (store.generating) return;

  let id = store.activeId;
  if (!id) id = store.createAndActivate({ title: trimmed.slice(0, 48) });

  const project = useBuilder.getState().projects.find((p) => p.id === id);
  if (!project) return;

  store.clearActivities(id);
  store.pushMessage(id, { id: uid(), role: "user", content: trimmed, createdAt: Date.now() });
  store.setDraft("");
  store.setGenerating(true);
  store.setGeneratingStatus("กำลังวิเคราะห์เป้าหมาย");
  store.setMobilePane("chat");
  useBuilder.getState().setLifecycleState("PLANNING" as BuilderLifecycleState);
  activity("Grok Builder", "working", trimmed.slice(0, 120));

  try {
    const history = project.messages.map((m) => ({ role: m.role, content: m.content }));
    let checkpointId: string | null = null;

    const snapshot = (label: string) => {
      checkpointId = useBuilder.getState().snapshotCanvas(id, label);
      return checkpointId;
    };
    const restore = () => {
      if (checkpointId) useBuilder.getState().restoreVersion(id, checkpointId);
    };
    const getCanvas = (): CanvasState =>
      useBuilder.getState().projects.find((p) => p.id === id)?.canvas ?? project.canvas;

    const repair = (
      state: CanvasState,
      prompt: string,
      turnHistory: { role: "user" | "assistant"; content: string }[],
      errors: string[],
    ) =>
      generateIntent(
        state,
        prompt + "\n\nVERIFY ERRORS FROM PREVIOUS ATTEMPT:\n" + errors.join("\n") +
          "\nRepair the Canvas with a new valid PATCH only.",
        turnHistory,
      );

    const result = await runBuilderTurn({
      generate: generateIntent,
      apply: (patch) => applyPatch(id, patch),
      snapshot,
      getCanvas,
      repair,
      restore,
      onEvent: ({ phase, message }) => {
        const statusMap: Record<string, string> = {
          WHY: "Grok กำลังวิเคราะห์เป้าหมาย",
          PLAN: "Grok กำลังวางแผน",
          PATCH: "Grok กำลังสร้าง Patch",
          APPLY: "กำลังอัปเดต Canvas",
          VERIFY: "กำลังตรวจสอบผลลัพธ์",
          REPAIR: "Grok กำลังแก้ไข",
          DONE: "เรียบร้อย",
          FAILED: "ผิดพลาด",
        };
        useBuilder.getState().setGeneratingStatus(statusMap[phase] ?? message);
        activity(
          phase,
          phase === "FAILED" ? "error" : phase === "DONE" ? "success" : phase === "REPAIR" ? "fixing" : "working",
          message,
        );
      },
    }, trimmed, history);

    const intent = result.intent;
    if (intent.thought) activity("Grok", "working", intent.thought.slice(0, 200));
    activity("VERIFY", "success", result.verification.pages + " หน้า · " + result.verification.components + " components · รอบ " + result.attempts);

    store.pushMessage(id, {
      id: uid(),
      role: "assistant",
      content: intent.reply || "อัปเดต App แล้ว",
      createdAt: Date.now(),
    });
    useBuilder.getState().setGeneratingStatus("เรียบร้อย");
    useBuilder.getState().setLifecycleState("DONE");
    activity("Builder ครบวงจร", "success", "Grok → Patch → Canvas → Verify");
    store.setMobilePane("app");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Grok Builder failed";
    useBuilder.getState().setGeneratingStatus("ผิดพลาด");
    useBuilder.getState().setLifecycleState("FAILED");
    store.pushMessage(id, {
      id: uid(),
      role: "assistant",
      content: "Grok Builder ทำงานไม่สำเร็จ: " + message,
      createdAt: Date.now(),
    });
    activity("Builder ล้มเหลว", "error", message);
  } finally {
    useBuilder.getState().setGenerating(false);
    useBuilder.getState().setStreamText("");
  }
}

export function openExample(example: { prompt: string }) {
  const store = useBuilder.getState();
  if (!store.activeId) store.createAndActivate({ title: "Example App" });
  void sendPrompt(example.prompt);
}
