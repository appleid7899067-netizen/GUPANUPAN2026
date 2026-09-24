/** Real product identity for GUPANUPAN2026. */

export const BRAND = {
  name: "Panupan",
  fullName: "Panupan • BOSSNU",
  tagline: "ONE SYSTEM • ENDLESS POSSIBILITIES",
  taglineEn: "Build, run, verify and publish with an AI workspace",
  description:
    "Panupan BOSSNU คือ AI workspace สำหรับสร้าง แก้ไข รัน ตรวจสอบ และเผยแพร่เว็บหรือแอปจากเป้าหมายเดียว",
  year: 2026,
  repo: "https://github.com/appleid7899067-netizen/GUPANUPAN2026",
  puterDocs: "https://developer.puter.com/",
} as const;

export {
  MODEL_OPTIONS,
  DEFAULT_MODEL_ID,
  FREE_MODEL_IDS,
  DOWNLOAD_MOCK_MESSAGES,
  UI_TH,
} from "@/lib/models";

import { FREE_MODEL_IDS, DEFAULT_MODEL_ID, BOSS_MODEL_POOL } from "@/lib/models";
export const FREE_MODELS = FREE_MODEL_IDS;
export const DEFAULT_FREE_MODEL = DEFAULT_MODEL_ID;
export { BOSS_MODEL_POOL };
