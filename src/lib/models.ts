/** Puter-native model catalog. The live Puter catalog is discovered at runtime. */

export type ModelOption = {
  id: string;
  label: string;
  labelTh: string;
  free: boolean;
  tier: "free" | "fast" | "quality";
};

export const MODEL_OPTIONS: ModelOption[] = [
  { id: "gpt-5.6-luna", label: "GPT-5.6 Luna", labelTh: "GPT-5.6 Luna", free: false, tier: "quality" },
  { id: "gpt-5-nano", label: "GPT-5 Nano", labelTh: "GPT-5 Nano", free: true, tier: "fast" },
];

export const DEFAULT_MODEL_ID = "gpt-5.6-luna";
export const FREE_MODEL_IDS = MODEL_OPTIONS.filter((m) => m.free).map((m) => m.id);

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
