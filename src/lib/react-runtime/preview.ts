/**
 * ═══ ประกอบเอกสารพรีวิวสำหรับโปรเจกต์ React/Vite/Next ═════════════════════
 *
 * เอกสารนี้คือ `srcdoc` ของ iframe พรีวิว: CSP ก่อนโค้ดผู้ใช้เสมอ, React UMD ที่
 * vendor ไว้ (inline เพราะ CSP ไม่ให้โหลดสคริปต์ภายนอก), บริดจ์คอนโซลเดิมของ
 * `lib/builder.ts` และ runner ที่รันโมดูลที่คอมไพล์แล้ว
 *
 * โปรเจกต์ static ไม่ผ่านเส้นทางนี้เลย (`previewDocument` ยังทำงานเหมือนเดิม)
 */

import { previewConsoleBridge, type ProjectOrigin } from "../builder";
import { compileReactProject, type PreviewEngine, type RuntimeBundle } from "./transform";
import { runnerSource } from "./runner-source";

/** อ่านไฟล์ UMD ที่ vendor ไว้จาก public/ แล้วจำไว้ใช้ซ้ำ */
const vendorCache = new Map<string, Promise<string>>();

export function loadVendorSource(file: string): Promise<string> {
  const cached = vendorCache.get(file);
  if (cached) return cached;
  const request = fetch(`/vendor/react/${file}`, { cache: "force-cache" })
    .then((res) => {
      if (!res.ok) throw new Error(`โหลด ${file} ไม่ได้ (HTTP ${res.status})`);
      return res.text();
    })
    .catch((error) => {
      vendorCache.delete(file);
      throw error;
    });
  vendorCache.set(file, request);
  return request;
}

/** บริดจ์ + React UMD + boot config + runner ต้องอยู่ท้าย <body> เสมอ */
function insertBeforeBodyEnd(html: string, snippet: string): string {
  if (/<\/body\s*>/i.test(html)) {
    return html.replace(/<\/body\s*>/i, `${snippet}</body>`);
  }
  if (/<\/html\s*>/i.test(html)) {
    return html.replace(/<\/html\s*>/i, `${snippet}</body></html>`);
  }
  return `${html}${snippet}`;
}

/** CSP ต้องเป็นเมตาตัวแรกใน <head> เพื่อครอบทุกอย่างที่ตามมา */
function insertCsp(html: string, policy: string): string {
  const meta = `<meta http-equiv="Content-Security-Policy" content="${policy}">`;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (tag) => `${tag}${meta}`);
  }
  if (/<html[^>]*>/i.test(html)) {
    return html.replace(/<html[^>]*>/i, (tag) => `${tag}<head>${meta}</head>`);
  }
  return `${meta}${html}`;
}

/** กัน `</script>` ในข้อมูล JSON ปิดสคริปต์ของเรา */
function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/**
 * CSP ของ engine react: เพิ่ม `'unsafe-eval'` เพราะ runner ต้องประกอบโมดูลด้วย
 * `new Function` (เทียบเท่า `sandboxDocument()` ของแซนด์บ็อกซ์) — ยังปิดเครือข่าย
 * และยังไม่มี same-origin เหมือนเดิม
 */
export const REACT_PREVIEW_CSP =
  "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline'; " +
  "img-src data: https:; media-src data: https:; font-src data: https:; connect-src 'none'; " +
  "form-action 'none'; base-uri 'none'";

export interface ReactPreviewResult {
  doc: string;
  bundle: RuntimeBundle;
}

/** สร้างเอกสารพรีวิวจากบันเดิลที่คอมไพล์แล้ว (แยกไว้ให้เทสต์ได้) */
export function reactPreviewDocument(
  bundle: RuntimeBundle,
  channel: string,
  vendorScripts: string[],
): string {
  const problems = [
    ...bundle.errors.map((item) => `คอมไพล์ ${item.path} ไม่ผ่าน: ${item.message}`),
    ...bundle.missing.map(
      (item) => `ไม่พบแพ็กเกจ npm “${item.specifier}” ที่ ${item.from} — พรีวิวรันในเบราว์เซอร์จึงติดตั้งแพ็กเกจเพิ่มไม่ได้`,
    ),
    ...bundle.warnings,
  ];
  const boot = {
    modules: Object.fromEntries(bundle.modules.map((mod) => [mod.path, mod.code])),
    styles: bundle.styles,
    entry: bundle.entryModule,
    problems,
    env: {
      MODE: "production",
      DEV: false,
      PROD: true,
      BASE_URL: "/",
      SSR: false,
      NODE_ENV: "production",
    },
    url: "gupan://preview/",
  };

  const scripts = [
    ...vendorScripts.map((code) => `<script>${code}</script>`),
    previewConsoleBridge(channel),
    `<script>window.__GUPAN_BOOT__=${safeJson(boot)};</script>`,
    `<script>${runnerSource()}</script>`,
  ].join("\n");

  const shell = insertCsp(bundle.entryHtml, REACT_PREVIEW_CSP);
  return insertBeforeBodyEnd(shell, scripts);
}

export interface BuildPreviewOptions {
  engine: PreviewEngine;
  origin?: ProjectOrigin;
  /** บังคับ path ของหน้า (ปกติคือหน้าปัจจุบัน) */
  htmlPath?: string;
}

/**
 * ประตูเดียวที่หน้าเวิร์กสเปซใช้: เลือกเส้นทาง static หรือประกอบบันเดิล React
 * (โหลด Babel เฉพาะเมื่อจำเป็นจริง ๆ)
 */
export async function buildPreviewDocument(
  files: Record<string, string>,
  page: string,
  channel: string,
  options: BuildPreviewOptions,
  staticDocument: (files: Record<string, string>, page: string, channel: string) => string,
): Promise<ReactPreviewResult | { doc: string; bundle?: undefined }> {
  if (options.engine !== "react") {
    return { doc: staticDocument(files, page, channel) };
  }
  const bundle = await compileReactProject({
    files,
    htmlPath: options.htmlPath ?? page,
    origin: options.origin,
  });
  const vendorScripts = await Promise.all([
    loadVendorSource("react.production.min.js"),
    loadVendorSource("react-dom.production.min.js"),
  ]);
  return { doc: reactPreviewDocument(bundle, channel, vendorScripts), bundle };
}
