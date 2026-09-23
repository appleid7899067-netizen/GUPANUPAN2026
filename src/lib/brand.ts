/** Real product identity for GUPANUPAN2026 — not a template placeholder. */

export const BRAND = {
  name: "GuPanu",
  fullName: "GuPanu Builder",
  tagline: "สร้างเว็บและแอปด้วย AI — ล็อกอิน Puter · โมเดลฟรี",
  taglineEn: "Build apps and sites with AI — Puter sign-in · free models",
  description:
    "GuPanu is a real AI app builder. Sign in with Puter, use free models, preview and download working HTML apps.",
  year: 2026,
  repo: "https://github.com/appleid7899067-netizen/GUPANUPAN2026",
  puterDocs: "https://developer.puter.com/",
} as const;

export const FREE_MODELS = [
  "nex-agi/nex-n2.5-pro:free",
  "nex-agi/nex-n2.5-mini:free",
  "openrouter:meta-llama/llama-3.1-8b-instruct:free",
] as const;

export const DEFAULT_FREE_MODEL = FREE_MODELS[0];
