import { uid } from "@/lib/utils";
import { useBuilder } from "./store";
import { generateIntent } from "./patch-client";
import type { AgentActivityStatus, BuilderLifecycleState, CanvasPatch } from "./types";

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
  store.setGeneratingStatus("กำลังอ่านความต้องการ");
  store.setMobilePane("chat");
  useBuilder.getState().setLifecycleState("PLANNING" as BuilderLifecycleState);
  activity("อ่านคำขอ", "working", trimmed.slice(0, 120));

  try {
    const history = project.messages.map((m) => ({ role: m.role, content: m.content }));
    activity("แตก Intent (WHY)", "working", "แก้พฤติกรรม ไม่ใช่แค่ UI");
    useBuilder.getState().setGeneratingStatus("กำลังแตก Intent");

    const intent = await generateIntent(project.canvas, trimmed, history);

    if (intent.thought) {
      activity("Thought", "working", intent.thought.slice(0, 200));
    }
    activity("Operations", "working", `${intent.operations.length} ops · ${intent.operations.map((o) => o.op).join(", ")}`);

    for (const patch of intent.operations) {
      applyPatch(id, patch);
    }

    if (intent.nextPredict?.preload?.length) {
      activity("Preload", "working", intent.nextPredict.preload.join(", "));
      applyPatch(id, { op: "preload", pageIds: intent.nextPredict.preload });
    }

    const reply = intent.reply || `อัปเดต App แล้ว • ${intent.operations.map((p) => p.op).join(", ")}`;
    store.pushMessage(id, {
      id: uid(),
      role: "assistant",
      content: intent.thought ? `${reply}\n\n_(${intent.thought})_` : reply,
      createdAt: Date.now(),
    });
    useBuilder.getState().setGeneratingStatus("เรียบร้อย");
    useBuilder.getState().setLifecycleState("DONE");
    activity("Intent ครบ", "success", "Chat + App = สมองเดียวกัน");
    store.setMobilePane("app");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Intent failed";
    useBuilder.getState().setGeneratingStatus("ผิดพลาด");
    useBuilder.getState().setLifecycleState("FAILED");
    store.pushMessage(id, {
      id: uid(),
      role: "assistant",
      content: `ทำ Intent ไม่สำเร็จ: ${message}`,
      createdAt: Date.now(),
    });
    activity("Intent ล้มเหลว", "error", message);
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
