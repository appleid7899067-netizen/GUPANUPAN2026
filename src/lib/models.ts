/** Curated Puter model pool for BOSSNU.
 * The catalog is refreshed by Puter at runtime when available.
 * "Puter free" means the developer does not pay the model bill under Puter's
 * User-Pays model; individual model catalog prices still matter for routing.
 */

export type ModelRole = "cheap" | "fast" | "coding" | "reasoning" | "long-context" | "multimodal";

export type ModelOption = {
  id: string;
  label: string;
  labelTh: string;
  provider: string;
  role: ModelRole;
  inputPerMillion?: number;
  outputPerMillion?: number;
  puterFree: boolean;
};

export const BOSS_MODEL_POOL: ModelOption[] = [
  { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B", labelTh: "GPT-OSS 120B", provider: "OpenAI", role: "reasoning", inputPerMillion: 0.04, outputPerMillion: 0.17, puterFree: true },
  { id: "nvidia/nemotron-3-ultra-550b-a55b", label: "Nemotron 3 Ultra 550B", labelTh: "Nemotron 3 Ultra 550B", provider: "NVIDIA", role: "reasoning", inputPerMillion: 0.5, outputPerMillion: 2.5, puterFree: true },
  { id: "meta-llama/llama-4-scout", label: "Llama 4 Scout", labelTh: "Llama 4 Scout", provider: "Meta", role: "long-context", inputPerMillion: 0.1, outputPerMillion: 0.3, puterFree: true },
  { id: "mistralai/mistral-large-3", label: "Mistral Large 3", labelTh: "Mistral Large 3", provider: "Mistral", role: "coding", inputPerMillion: 0.5, outputPerMillion: 1.5, puterFree: true },
  { id: "qwen/qwen3.5-397b-a17b", label: "Qwen3.5 397B A17B", labelTh: "Qwen3.5 397B A17B", provider: "Qwen", role: "reasoning", inputPerMillion: 0.6, outputPerMillion: 3.6, puterFree: true },
  { id: "minimax/minimax-m3", label: "MiniMax M3", labelTh: "MiniMax M3", provider: "MiniMax", role: "coding", inputPerMillion: 0.3, outputPerMillion: 1.2, puterFree: true },
  { id: "z-ai/glm-5", label: "GLM 5", labelTh: "GLM 5", provider: "Z.AI", role: "reasoning", inputPerMillion: 1, outputPerMillion: 3.2, puterFree: true },
  { id: "deepseek/deepseek-v4-flash", label: "DeepSeek V4 Flash", labelTh: "DeepSeek V4 Flash", provider: "DeepSeek", role: "fast", inputPerMillion: 0.14, outputPerMillion: 0.28, puterFree: true },
  { id: "moonshotai/kimi-k2-thinking", label: "Kimi K2 Thinking", labelTh: "Kimi K2 Thinking", provider: "Moonshot AI", role: "reasoning", inputPerMillion: 0.6, outputPerMillion: 2.5, puterFree: true },
  { id: "google/gemini-3-flash", label: "Gemini 3 Flash", labelTh: "Gemini 3 Flash", provider: "Google", role: "fast", inputPerMillion: 0.5, outputPerMillion: 3, puterFree: true },
  { id: "x-ai/grok-4.1-fast-reasoning", label: "Grok 4.1 Fast Reasoning", labelTh: "Grok 4.1 Fast Reasoning", provider: "xAI", role: "reasoning", inputPerMillion: 0.2, outputPerMillion: 0.5, puterFree: true },
  { id: "anthropic/claude-opus-4.8", label: "Claude Opus 4.8", labelTh: "Claude Opus 4.8", provider: "Anthropic", role: "reasoning", inputPerMillion: 5, outputPerMillion: 25, puterFree: true },
  { id: "cohere/command-a", label: "Command A", labelTh: "Command A", provider: "Cohere", role: "long-context", inputPerMillion: 2.5, outputPerMillion: 10, puterFree: true },
  { id: "upstage/solar-pro-3", label: "Solar Pro 3", labelTh: "Solar Pro 3", provider: "Upstage", role: "fast", inputPerMillion: 0.15, outputPerMillion: 0.6, puterFree: true },
  { id: "nousresearch/hermes-4-405b", label: "Hermes 4 405B", labelTh: "Hermes 4 405B", provider: "Nous Research", role: "reasoning", inputPerMillion: 1, outputPerMillion: 3, puterFree: true },
  { id: "inclusionai/ling-2.6-flash", label: "Ling 2.6 Flash", labelTh: "Ling 2.6 Flash", provider: "InclusionAI", role: "coding", inputPerMillion: 0.1, outputPerMillion: 0.3, puterFree: true },
  { id: "stepfun/step-3.7-flash", label: "Step 3.7 Flash", labelTh: "Step 3.7 Flash", provider: "StepFun", role: "multimodal", inputPerMillion: 0.2, outputPerMillion: 1.15, puterFree: true },
  { id: "perceptron/perceptron-mk1", label: "Perceptron Mk1", labelTh: "Perceptron Mk1", provider: "Perceptron", role: "coding", inputPerMillion: 0.15, outputPerMillion: 1.5, puterFree: true },
  { id: "openai/gpt-5-mini", label: "GPT-5 Mini", labelTh: "GPT-5 Mini", provider: "OpenAI", role: "cheap", inputPerMillion: 0.25, outputPerMillion: 2, puterFree: true },
  { id: "qwen/qwen3-coder-480b-a35b", label: "Qwen3 Coder 480B A35B", labelTh: "Qwen3 Coder 480B A35B", provider: "Qwen", role: "coding", inputPerMillion: 1.5, outputPerMillion: 7.5, puterFree: true },
];

export const MODEL_OPTIONS = BOSS_MODEL_POOL;
export const DEFAULT_MODEL_ID = "openai/gpt-oss-120b";
export const FREE_MODEL_IDS = BOSS_MODEL_POOL.map((m) => m.id);

export function recommendedModelForTier(tier: "cheap" | "standard" | "strong" | "coding"): string {
  if (tier === "cheap") return "openai/gpt-oss-120b";
  if (tier === "coding") return "inclusionai/ling-2.6-flash";
  if (tier === "strong") return "nvidia/nemotron-3-ultra-550b-a55b";
  return "deepseek/deepseek-v4-flash";
}

export function modelsForRole(role: ModelRole): ModelOption[] {
  return BOSS_MODEL_POOL.filter((m) => m.role === role);
}

export function cheapestModels(limit = 5): ModelOption[] {
  return [...BOSS_MODEL_POOL]
    .sort((a, b) => (a.inputPerMillion! + a.outputPerMillion!) - (b.inputPerMillion! + b.outputPerMillion!))
    .slice(0, limit);
}

export const DOWNLOAD_MOCK_MESSAGES = [
  "กำลังเตรียมไฟล์ HTML…",
  "กำลังแพ็กหน้าเว็บ…",
  "กำลังสร้างลิงก์ดาวน์โหลด…",
  "เกือบเสร็จแล้ว…",
  "ดาวน์โหลดพร้อมแล้ว ✓",
] as const;

export const UI_TH = {
  preview: "พรีวิว",
  code: "โค้ด",
  chat: "แชท",
  app: "แอป",
  download: "ดาวน์โหลด",
  downloading: "กำลังดาวน์โหลด…",
  downloadDone: "ดาวน์โหลดเสร็จแล้ว",
  openNew: "เปิดแท็บใหม่",
  selectElement: "เลือกองค์ประกอบ",
  model: "โมเดล",
  free: "ฟรี",
  desktop: "เดสก์ท็อป",
  tablet: "แท็บเล็ต",
  phone: "มือถือ",
  history: "ประวัติ",
  working: "กำลังทำงาน…",
  steps: ["อ่านคำขอ", "วางแผน", "สร้าง/แก้ไข", "ตรวจสอบผล"] as const,
  readyPreview: "พร้อมแล้ว ดูที่พรีวิวได้เลย",
  needDetail: "ขอรายละเอียดเพิ่มนิดนึงก่อนสร้าง",
  signInPuter: "กรุณาล็อกอิน Puter (มุมขวาบน) เพื่อใช้โมเดล",
} as const;
