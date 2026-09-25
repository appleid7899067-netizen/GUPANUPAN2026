import { uid } from "@/lib/utils";
import { useBuilder } from "./store";
import { generateCanvasPatches } from "./patch-client";
import type { AgentActivityStatus, BuilderLifecycleState, CanvasPatch } from "./types";
import { transition } from "./state-machine";

function activity(label: string, status: AgentActivityStatus, detail?: string) {
  const s = useBuilder.getState();
  if (!s.activeId) return;
  s.pushActivity(s.activeId, { id: uid(), label, detail, status, createdAt: Date.now() });
}

function applyPatch(id: string, patch: CanvasPatch) {
  const store = useBuilder.getState();
  if (patch.op === "pushRoute") store.pushCanvasRoute(id, patch.pageId);
  else store.applyCanvasPatch(id, patch);
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
  store.setGeneratingStatus("กำลังสร้าง Patch");
  store.setMobilePane("chat");
  useBuilder.getState().setLifecycleState("PLANNING" as BuilderLifecycleState);
  activity("อ่านคำขอ", "working");

  try {
    const history = project.messages.map((m) => ({ role: m.role, content: m.content }));
    const patches = await generateCanvasPatches(project.canvas, trimmed, history);
    if (!patches.length) throw new Error("โมเดลไม่คืน Patch ที่ใช้งานได้");

    activity("ได้รับ JSON Patch", "working", `${patches.length} patch`);
    for (const patch of patches) applyPatch(id, patch);

    const after = useBuilder.getState().projects.find((p) => p.id === id);
    if (!after) throw new Error("Project disappeared");

    store.pushMessage(id, {
      id: uid(),
      role: "assistant",
      content: `อัปเดต App แล้ว • ${patches.map((p) => p.op).join(", ")}`,
      createdAt: Date.now(),
    });
    useBuilder.getState().setGeneratingStatus("เรียบร้อย");
    useBuilder.getState().setLifecycleState("DONE");
    activity("Canvas อัปเดตแล้ว", "success", "Store เดียวกันถูกเปลี่ยนโดย Patch");
    store.setMobilePane("app");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Patch failed";
    useBuilder.getState().setGeneratingStatus("ผิดพลาด");
    useBuilder.getState().setLifecycleState("FAILED");
    store.pushMessage(id, { id: uid(), role: "assistant", content: `ทำ Patch ไม่สำเร็จ: ${message}`, createdAt: Date.now() });
    activity("Patch ล้มเหลว", "error", message);
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
