import type { CanvasPatch, CanvasState, IntentResult } from "./types";

export type BuilderCorePhase = "WHY" | "PLAN" | "PATCH" | "APPLY" | "VERIFY" | "REPAIR" | "DONE" | "FAILED";
export type BuilderCoreEvent = { phase: BuilderCorePhase; message: string };

export type CanvasVerification = {
  ok: boolean;
  errors: string[];
  pages: number;
  components: number;
};

export function verifyCanvas(canvas: CanvasState): CanvasVerification {
  const errors: string[] = [];
  const pages = Object.values(canvas.pages);
  const components = pages.reduce((n, p) => n + p.components.length, 0);
  if (!pages.length) errors.push("ไม่มีหน้าใน Canvas");
  if (!canvas.stack.length) errors.push("route stack ว่าง");
  if (!canvas.stack.every((entry) => Boolean(canvas.pages[entry.id]))) errors.push("route stack มี page ที่ไม่มีอยู่จริง");
  for (const key of ["background","text","primary","accent","surface","muted"]) {
    if (!canvas.theme[key]?.trim()) errors.push("theme ขาด " + key);
  }
  return { ok: errors.length === 0, errors, pages: pages.length, components };
}

export type BuilderCoreDeps = {
  generate: (state: CanvasState, prompt: string, history: { role: "user" | "assistant"; content: string }[]) => Promise<IntentResult>;
  apply: (patch: CanvasPatch) => void;
  snapshot: (label: string) => void;
  getCanvas: () => CanvasState;
  onEvent?: (event: BuilderCoreEvent) => void;
  repair?: (state: CanvasState, prompt: string, history: { role: "user" | "assistant"; content: string }[], errors: string[]) => Promise<IntentResult>;
  restore?: () => void;
};

export async function runBuilderTurn(
  deps: BuilderCoreDeps,
  prompt: string,
  history: { role: "user" | "assistant"; content: string }[],
): Promise<{ intent: IntentResult; verification: CanvasVerification; attempts: number }> {
  const emit=(phase:BuilderCorePhase,message:string)=>deps.onEvent?.({phase,message});
  emit("WHY","Grok กำลังวิเคราะห์เป้าหมาย");
  const before=deps.getCanvas();
  emit("PLAN","Grok กำลังวางแผน Builder");

  let intent=await deps.generate(before,prompt,history);
  let attempts=0;

  for (;;) {
    attempts++;
    if (!intent.operations.length) throw new Error("Grok ไม่มี PATCH ที่นำไปใช้ได้");
    emit("PATCH",`Grok สร้าง PATCH ${intent.operations.length} รายการ`);
    deps.snapshot(`Grok checkpoint #${attempts}`);
    emit("APPLY","กำลังใช้ PATCH กับ Store");
    for (const patch of intent.operations) deps.apply(patch);
    if (intent.nextPredict?.preload?.length) deps.apply({op:"preload",pageIds:intent.nextPredict.preload});

    emit("VERIFY","กำลังตรวจผลบน Canvas");
    const verification=verifyCanvas(deps.getCanvas());
    if (verification.ok) {
      emit("DONE",`ผ่านการตรวจสอบ · ${verification.pages} หน้า · ${verification.components} components · รอบ ${attempts}`);
      return {intent,verification,attempts};
    }

    if (attempts >= 3 || !deps.repair) {
      deps.restore?.();
      emit("FAILED",verification.errors.join(" • "));
      throw new Error("Canvas verification failed: "+verification.errors.join(", "));
    }

    deps.restore?.();
    emit("REPAIR",`Grok กำลังแก้ผลตรวจสอบ · รอบ ${attempts + 1}/3`);
    intent=await deps.repair(deps.getCanvas(),prompt,history,verification.errors);
  }
}
