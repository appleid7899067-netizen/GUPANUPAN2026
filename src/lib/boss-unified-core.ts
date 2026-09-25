import type { BossCoreMode } from "@/lib/boss-core";

export type BossWorldSurface =
  | "frontend"
  | "backend"
  | "database"
  | "automation"
  | "document"
  | "mobile"
  | "hosting"
  | "github";

export type BossWorldPlan = {
  goal: string;
  mode: BossCoreMode;
  surfaces: BossWorldSurface[];
  describeQuestions: string[];
  executionOrder: string[];
  verificationGate: string[];
};

export type DescribeQuestion = {
  id: "goal" | "people" | "outcome";
  title: string;
  prompt: string;
  required: boolean;
};

export const BOSSNU_UNIFIED_QUESTIONS: DescribeQuestion[] = [
  {
    id: "goal",
    title: "เป้าหมาย",
    prompt: "คุณอยากให้โลกนี้ทำอะไรให้คุณหรือธุรกิจของคุณ?",
    required: true,
  },
  {
    id: "people",
    title: "คนใช้งาน",
    prompt: "ใครจะใช้มัน และเขาต้องทำอะไรเป็นหลัก?",
    required: true,
  },
  {
    id: "outcome",
    title: "ผลลัพธ์",
    prompt: "เมื่อสร้างเสร็จแล้ว คุณอยากให้เกิดอะไรขึ้นจริง?",
    required: true,
  },
];

const SURFACE_RULES: Array<[RegExp, BossWorldSurface]> = [
  [/เงิน|ชำระ|จ่าย|billing|payment|เก็บเงิน/i, "database"],
  [/ฐานข้อมูล|database|ข้อมูล|สมาชิก|ลูกค้า|รายการ/i, "backend"],
  [/บอท|line|แจ้งเตือน|workflow|อัตโนมัติ|automation/i, "automation"],
  [/pdf|สัญญา|เอกสาร|ใบเสร็จ/i, "document"],
  [/มือถือ|mobile|pwa|แอปมือถือ/i, "mobile"],
  [/github|repo|commit|branch/i, "github"],
  [/publish|deploy|hosting|เว็บจริง|ขึ้นเว็บ/i, "hosting"],
];

export function inferWorldSurfaces(prompt: string): BossWorldSurface[] {
  const surfaces = new Set<BossWorldSurface>(["frontend"]);
  for (const [pattern, surface] of SURFACE_RULES) {
    if (pattern.test(prompt)) surfaces.add(surface);
  }
  return [...surfaces];
}

export function buildWorldPlan(prompt: string, mode: BossCoreMode = "build"): BossWorldPlan {
  const surfaces = inferWorldSurfaces(prompt);
  return {
    goal: prompt.trim(),
    mode,
    surfaces,
    describeQuestions: BOSSNU_UNIFIED_QUESTIONS.map((question) => question.prompt),
    executionOrder: [
      "Describe: clarify the human goal before generating",
      "Architect: turn the goal into a world plan and reusable modules",
      "Build: create frontend, backend, data, automation and documents required by the plan",
      "Connect: wire real integrations through available Puter/GitHub/tool adapters",
      "Sandbox: run the world and collect runtime evidence",
      "Verify: check behavior, output, persistence and deployment evidence",
      "Publish: deploy only verified artifacts to the requested portals",
    ],
    verificationGate: [
      "Never claim a feature exists because code was generated.",
      "Every mutation needs observable evidence before completion.",
      "Preserve the last known-good artifact when recovery is exhausted.",
      "Publishing is a separate verified action.",
    ],
  };
}

export function buildUnifiedSystemPrompt(prompt: string): string {
  const plan = buildWorldPlan(prompt);
  return [
    "=== BOSSNU UNIFIED CORE ===",
    "BOSSNU is a world-building agent, not a code editor.",
    "Translate human language into intent, architecture, execution, evidence and verified outcomes.",
    "Puter is the primary browser OS/runtime when available.",
    "GitHub is durable source/memory when connected.",
    "Hosting providers are portals, not the source of truth.",
    "World surfaces: " + plan.surfaces.join(", "),
    "Execution: " + plan.executionOrder.join(" -> "),
    "Verification: " + plan.verificationGate.join(" | "),
    "=== END BOSSNU UNIFIED CORE ===",
  ].join("
");
}
