import type { BuilderLifecycleState } from "./types";

export type LifecycleTransition = {
  from: BuilderLifecycleState;
  to: BuilderLifecycleState;
  reason: string;
  at: number;
};

const allowed: Record<BuilderLifecycleState, BuilderLifecycleState[]> = {
  GOAL: ["PLANNING", "FAILED"],
  PLANNING: ["BUILDING", "FAILED"],
  BUILDING: ["GENERATED", "FAILED"],
  GENERATED: ["PREVIEWING", "FAILED"],
  PREVIEWING: ["PREVIEWED", "ANALYZING", "FAILED"],
  PREVIEWED: ["VERIFYING", "ANALYZING", "FAILED"],
  VERIFYING: ["VERIFIED", "ANALYZING", "FAILED"],
  VERIFIED: ["DONE", "REPAIRING", "FAILED"],
  DONE: [],
  FAILED: ["GOAL", "PLANNING"],
  ANALYZING: ["REPAIRING", "FAILED"],
  REPAIRING: ["PREVIEWING", "FAILED"],
};

export function canTransition(from: BuilderLifecycleState, to: BuilderLifecycleState): boolean {
  return allowed[from]?.includes(to) ?? false;
}

export function transition(
  from: BuilderLifecycleState,
  to: BuilderLifecycleState,
  reason: string,
): { state: BuilderLifecycleState; event: LifecycleTransition } {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid lifecycle transition: ${from} -> ${to}`);
  }
  return {
    state: to,
    event: { from, to, reason, at: Date.now() },
  };
}

export function repairReturnsToPreview(state: BuilderLifecycleState): boolean {
  return state === "REPAIRING";
}

export function isTerminal(state: BuilderLifecycleState): boolean {
  return state === "DONE" || state === "FAILED";
}

export function lifecycleLabel(state: BuilderLifecycleState): string {
  const labels: Record<BuilderLifecycleState, string> = {
    GOAL: "รับเป้าหมาย",
    PLANNING: "กำลังวางแผน",
    BUILDING: "กำลังสร้าง",
    GENERATED: "สร้าง artifact แล้ว",
    PREVIEWING: "กำลังเปิด Preview",
    PREVIEWED: "Preview พร้อม",
    VERIFYING: "กำลังตรวจสอบ",
    VERIFIED: "ตรวจสอบผ่าน",
    DONE: "ส่งมอบแล้ว",
    FAILED: "ล้มเหลว",
    ANALYZING: "กำลังวิเคราะห์ปัญหา",
    REPAIRING: "กำลังซ่อม",
  };
  return labels[state];
}
