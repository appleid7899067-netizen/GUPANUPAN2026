/**
 * src/lib/build-modes.ts — โหมดการสร้าง (system prompt เสริม) สำหรับบิลเดอร์
 *
 * แนวคิด "ทีม agent" ยืมมาจาก docker-agent (examples/coder.yaml, review.yaml, writer.yaml …)
 * แต่ย่อให้เหลือสิ่งที่บิลเดอร์ทำได้จริง: ปรับบทบาท + ข้อบังคับของผลลัพธ์ต่อหนึ่งโหมด
 */

import { BUILD_SYSTEM_PROMPT } from "./builder";

export type BuildModeId =
  | "web-app"
  | "landing"
  | "dashboard"
  | "game"
  | "thai-content"
  | "a11y"
  | "review"
  | "docs";

export interface BuildMode {
  id: BuildModeId;
  label: string;
  hint: string;
  /** ข้อกำหนดที่ต่อท้าย BUILD_SYSTEM_PROMPT (อังกฤษ เพื่อให้โมเดลทำตามแม่นกว่า) */
  instruction: string;
}

export const DEFAULT_MODE_ID: BuildModeId = "web-app";

export const BUILD_MODES: BuildMode[] = [
  {
    id: "web-app",
    label: "เว็บแอปใช้งานจริง",
    hint: "แอปที่กดเล่นได้จริง มี state ในหน่วยความจำ",
    instruction: [
      "MODE: complete interactive web application.",
      "Treat the request as a real product, not a landing page or HTML demo.",
      "Choose the smallest appropriate stack from the request (HTML/CSS/JS for simple sites; React/Vite or another supported project structure for substantial apps).",
      "For a substantial app, output a complete project manifest and source entry plus all required modules/components/styles.",
      "Include real navigation, state, forms, loading/error/empty states and meaningful primary actions.",
      "Use in-memory state for temporary UI state and Puter.js for requested cloud capabilities.",
      "Before returning code, mentally check imports, file paths, entry points and package scripts for consistency."
    ].join("\n"),
  },
  {
    id: "landing",
    label: "หน้าแลนดิ้ง / โปรโมต",
    hint: "hero → จุดขาย → หลักฐาน → CTA → footer",
    instruction: [
      "MODE: marketing landing page.",
      "Structure: hero with a single primary call to action, three benefit blocks, one proof section (testimonial or numbers), a short FAQ, and a footer.",
      "Write persuasive copy in the user's language; no lorem ipsum, no placeholder pricing.",
      "Use CSS only for motion (fade/slide on load); keep it readable on a 360px screen.",
    ].join("\n"),
  },
  {
    id: "dashboard",
    label: "แดชบอร์ด / รายงาน",
    hint: "การ์ดสรุป + ตาราง + กราฟ SVG ในตัว",
    instruction: [
      "MODE: analytics dashboard.",
      "Include a header with a period filter, four KPI cards with deltas, one chart drawn with inline SVG (bar or line), and a sortable table.",
      "Generate deterministic example data inside the document and label it as simulated data.",
      "Never fetch remote data; charts must render from the inline data only.",
    ].join("\n"),
  },
  {
    id: "game",
    label: "เกม / อินเทอร์แอกทีฟ",
    hint: "ลูปเกม คะแนน และปุ่มควบคุมที่กดได้",
    instruction: [
      "MODE: browser game or playful interactive.",
      "Use requestAnimationFrame or CSS transitions with a clear game loop, score, start and restart states.",
      "Support both keyboard and on-screen buttons for touch devices; show an on-screen hint for the controls.",
      "Keep frame work light (few dozen elements) so it stays smooth inside the preview iframe.",
    ].join("\n"),
  },
  {
    id: "thai-content",
    label: "เนื้อหาไทย / การตลาด",
    hint: "ถ้อยคำไทยที่อ่านเป็นธรรมชาติ ไม่แปลตรงตัว",
    instruction: [
      "MODE: Thai-first content.",
      "Write every visible string in natural Thai (no machine-translation tone), use Thai typography rules (no spaces inside words, space between phrases) and a system font stack that includes Noto Sans Thai.",
      "Avoid stating or implying real credentials, real customers, or real prices unless the user provided them; mark examples clearly.",
    ].join("\n"),
  },
  {
    id: "a11y",
    label: "ปรับ accessibility",
    hint: "แก้โค้ดเดิมให้ใช้คีย์บอร์ด/screen reader ได้",
    instruction: [
      "MODE: accessibility and performance pass over the existing document.",
      "Keep the visual design and wording; change only what improves access: semantic landmarks, heading order, labels, aria attributes, focus-visible styles, contrast, and reduced-motion support.",
      "Do not remove features. Do not add external resources.",
    ].join("\n"),
  },
  {
    id: "review",
    label: "รีวิวและรีแฟกเตอร์",
    hint: "จัดโครงโค้ดเดิมใหม่โดยหน้าตาเหมือนเดิม",
    instruction: [
      "MODE: refactor of the existing document.",
      "Restructure the inline CSS/JS for readability (grouped sections, no dead code, no inline style soup) while keeping the rendered result visually identical.",
      "Keep the same document size class; do not introduce libraries or build steps.",
    ].join("\n"),
  },
  {
    id: "docs",
    label: "หน้าเอกสาร / คู่มือ",
    hint: "คู่มืออ่านง่าย มีสารบัญและตัวอย่างโค้ด",
    instruction: [
      "MODE: documentation page.",
      "Include a sticky table of contents, section anchors that work without navigation, readable line length (max 72ch), and code samples in <pre><code> blocks.",
      "Copy the code examples literally into the page; never claim behaviour the user did not ask for.",
    ].join("\n"),
  },
];

export function isBuildModeId(value: string): value is BuildModeId {
  return BUILD_MODES.some((mode) => mode.id === value);
}

export function getBuildMode(id: string | null | undefined): BuildMode {
  return BUILD_MODES.find((mode) => mode.id === id) ?? BUILD_MODES[0];
}

/**
 * system prompt จริงที่ส่งให้โมเดล = กติกากลาง (builder) + กติกาของโหมด
 * ค่าที่ไม่รู้จักจะตกไปที่โหมดเริ่มต้นเสมอ จึงส่งค่าจาก UI ตรง ๆ ได้
 */
export function systemPromptFor(modeId: string | null | undefined): string {
  const mode = getBuildMode(modeId);
  return `${BUILD_SYSTEM_PROMPT}\n\n${mode.instruction}`;
}
