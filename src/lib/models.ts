/** 20 selectable models for GuPanu (Puter / free-first). */

export type ModelOption = {
  id: string;
  label: string;
  labelTh: string;
  free: boolean;
  tier: "free" | "fast" | "quality";
};

export const MODEL_OPTIONS: ModelOption[] = [
  { id: "nex-agi/nex-n2.5-pro:free", label: "Nex N2.5 Pro", labelTh: "Nex Pro (ฟรี)", free: true, tier: "free" },
  { id: "nex-agi/nex-n2.5-mini:free", label: "Nex N2.5 Mini", labelTh: "Nex Mini (ฟรี)", free: true, tier: "free" },
  { id: "openrouter:meta-llama/llama-3.1-8b-instruct:free", label: "Llama 3.1 8B", labelTh: "Llama 8B (ฟรี)", free: true, tier: "free" },
  { id: "openrouter:meta-llama/llama-3.2-3b-instruct:free", label: "Llama 3.2 3B", labelTh: "Llama 3B (ฟรี)", free: true, tier: "free" },
  { id: "openrouter:google/gemma-2-9b-it:free", label: "Gemma 2 9B", labelTh: "Gemma 9B (ฟรี)", free: true, tier: "free" },
  { id: "openrouter:mistralai/mistral-7b-instruct:free", label: "Mistral 7B", labelTh: "Mistral 7B (ฟรี)", free: true, tier: "free" },
  { id: "openrouter:qwen/qwen-2.5-7b-instruct:free", label: "Qwen 2.5 7B", labelTh: "Qwen 7B (ฟรี)", free: true, tier: "free" },
  { id: "openrouter:microsoft/phi-3-mini-128k-instruct:free", label: "Phi-3 Mini", labelTh: "Phi-3 Mini (ฟรี)", free: true, tier: "free" },
  { id: "openrouter:huggingfaceh4/zephyr-7b-beta:free", label: "Zephyr 7B", labelTh: "Zephyr 7B (ฟรี)", free: true, tier: "free" },
  { id: "openrouter:openchat/openchat-7b:free", label: "OpenChat 7B", labelTh: "OpenChat (ฟรี)", free: true, tier: "free" },
  { id: "openrouter:google/gemini-2.0-flash-exp:free", label: "Gemini 2.0 Flash", labelTh: "Gemini Flash (ฟรี)", free: true, tier: "fast" },
  { id: "openrouter:deepseek/deepseek-r1-distill-llama-70b:free", label: "DeepSeek R1 Distill", labelTh: "DeepSeek R1 (ฟรี)", free: true, tier: "quality" },
  { id: "openrouter:nvidia/llama-3.1-nemotron-70b-instruct:free", label: "Nemotron 70B", labelTh: "Nemotron 70B (ฟรี)", free: true, tier: "quality" },
  { id: "gpt-4o-mini", label: "GPT-4o Mini", labelTh: "GPT-4o Mini", free: false, tier: "fast" },
  { id: "gpt-4o", label: "GPT-4o", labelTh: "GPT-4o", free: false, tier: "quality" },
  { id: "claude-3-5-sonnet", label: "Claude 3.5 Sonnet", labelTh: "Claude Sonnet", free: false, tier: "quality" },
  { id: "claude-3-5-haiku", label: "Claude 3.5 Haiku", labelTh: "Claude Haiku", free: false, tier: "fast" },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", labelTh: "Gemini Flash", free: false, tier: "fast" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", labelTh: "Gemini Pro", free: false, tier: "quality" },
  { id: "deepseek-chat", label: "DeepSeek Chat", labelTh: "DeepSeek Chat", free: false, tier: "quality" },
];

export const DEFAULT_MODEL_ID = MODEL_OPTIONS[0].id;

export const FREE_MODEL_IDS = MODEL_OPTIONS.filter((m) => m.free).map((m) => m.id);

/** Mock download status lines (Thai). */
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
  steps: ["อ่านคำขอ", "ออกแบบเลย์เอาต์", "เขียนหน้าเว็บ", "เพิ่มการโต้ตอบ"] as const,
  readyPreview: "พร้อมแล้ว ดูที่พรีวิวได้เลย",
  needDetail: "ขอรายละเอียดเพิ่มนิดนึงก่อนสร้าง",
  signInPuter: "กรุณาล็อกอิน Puter (มุมขวาบน) เพื่อใช้โมเดลฟรี",
} as const;
