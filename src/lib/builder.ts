/**
 * ═══ โปรเจกต์แบบหลายไฟล์ (แอปพลิเคชัน ไม่ใช่หน้าเดียว) ════════════════════
 *
 * ตั้งแต่โปรโตคอล v2 โปรเจกต์หนึ่งคือชุดไฟล์: `index.html` + `styles.css` +
 * `app.js` + หน้าเพิ่มเช่น `about.html` — AI ส่งกลับเป็นบล็อก fence
 * `` ```file:เส้นทาง `` ต่อไฟล์ และพรีวิวประกอบเอกสารด้วยการอินไลน์
 * `<link>`/`<script>` ที่ชี้ไฟล์ท้องถิ่น แล้วใส่ bridge ดักคลิก `<a href>`
 * ภายในเพื่อ postMessage กลับมาเปลี่ยนหน้าใน iframe (ยังเป็น
 * sandbox="allow-scripts" ไม่ให้ same-origin เหมือนเดิม)
 *
 * โปรเจกต์เก่า (ฟิลด์ `html` เดี่ยว) ถูก migrate อัตโนมัติใน `loadProject`
 */
export interface BuildMessage {
  role: "user" | "assistant";
  content: string;
}
export interface BuildVersion {
  id: string;
  label: string;
  files: Record<string, string>;
  createdAt: string;
}
/**
 * ที่มาของโปรเจกต์ (ตอนนี้มีทางเดียวคือโคลนจาก GitHub) — เก็บไว้เพื่อ
 * 1) เขียน URL ของรูป/ฟอนต์ที่ไม่ได้เก็บในโปรเจกต์ให้ชี้ไฟล์จริงใน repo
 * 2) รู้ว่าไฟล์ถูกยึดโฟลเดอร์ไหนเป็นรากเว็บ (`webRoot`) ตอนโคลน
 */
export interface ProjectOrigin {
  provider: "github";
  owner: string;
  repo: string;
  ref: string;
  subpath?: string;
  /** โฟลเดอร์ที่ถูกยึดเป็นรากเว็บ เช่น "dist" (ว่าง = ราก repo) */
  webRoot?: string;
}
export interface BuildProject {
  id: string;
  name: string;
  files: Record<string, string>;
  messages: BuildMessage[];
  versions: BuildVersion[];
  updatedAt: string;
  origin?: ProjectOrigin;
}
export const PROJECT_PREFIX = "gupan:builder:v1:";
export const MAX_FILE_SIZE = 400_000;
export const MAX_TOTAL_SIZE = 4_000_000;

/** ชุดเริ่มต้น 3 ไฟล์ — เปิดมาก็เห็นทันทีว่าโปรเจกต์มีโครงสร้าง */
export const STARTER_FILES: Record<string, string> = {
  "index.html": `<!doctype html>
<html lang="th"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>My new app</title><link rel="stylesheet" href="styles.css"></head>
<body><main><span class="spark">✦</span><h1>Your idea starts here.</h1>
<p>พิมพ์สิ่งที่อยากสร้างในช่องแชท แล้ว AI จะเขียนเป็นแอปหลายไฟล์ให้<br>หรือเปิดแท็บ Code แล้วแก้แต่ละไฟล์ได้เลย</p>
<button id="go">ลองกดปุ่มนี้</button><p id="count" class="hint"></p></main>
<script src="app.js"></script></body></html>`,
  "styles.css": `body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui;background:#f4f5f7;color:#172033}
main{text-align:center;padding:32px}
.spark{font-size:48px}
h1{font-size:clamp(28px,5vw,48px);letter-spacing:-2px}
p{color:#697386;line-height:1.8}
button{font:inherit;padding:10px 22px;border:0;border-radius:10px;background:#172033;color:#fff;cursor:pointer}
.hint{min-height:1.4em;font-size:13px}`,
  "app.js": `const button = document.getElementById("go");
const hint = document.getElementById("count");
let clicks = 0;
button?.addEventListener("click", () => {
  clicks += 1;
  hint.textContent = "กดไป " + clicks + " ครั้ง · state อยู่ในหน่วยความจำ (app.js)";
  console.log("click", clicks);
});`,
};

export function createProject(
  prompt: string,
  id = crypto.randomUUID(),
): BuildProject {
  return {
    id,
    name: prompt.trim().slice(0, 60) || "Untitled project",
    files: { ...STARTER_FILES },
    messages: [],
    versions: [],
    updatedAt: new Date().toISOString(),
  };
}
export function saveProject(project: BuildProject): void {
  // Write the complete project atomically. Quota errors must reach the UI.
  localStorage.setItem(PROJECT_PREFIX + project.id, JSON.stringify(project));
}
function isFiles(files: unknown): files is Record<string, string> {
  return (
    typeof files === "object" &&
    files !== null &&
    Object.values(files as Record<string, unknown>).every(
      (value) => typeof value === "string",
    )
  );
}
export function loadProject(id: string): BuildProject | null {
  const raw = localStorage.getItem(PROJECT_PREFIX + id);
  if (!raw) return null;
  const p = JSON.parse(raw);
  // ── migrate โปรเจกต์ v1 (html เดี่ยว) เป็นชุดไฟล์ ──────────────────────
  if (!isFiles(p.files) && typeof p.html === "string") {
    p.files = { "index.html": p.html };
    p.versions = (p.versions || []).map((v: BuildVersion & { html?: string }) =>
      isFiles(v.files) ? v : { ...v, files: { "index.html": v.html ?? "" } },
    );
  }
  delete p.html;
  if (
    p.id !== id ||
    !isFiles(p.files) ||
    !Array.isArray(p.messages) ||
    !Array.isArray(p.versions)
  ) {
    throw new Error("ข้อมูลโปรเจกต์เสียหาย กรุณานำเข้าไฟล์สำรอง");
  }
  return p;
}
export function listProjects(): BuildProject[] {
  const projects: BuildProject[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(PROJECT_PREFIX)) continue;
    try {
      const p = loadProject(key.slice(PROJECT_PREFIX.length));
      if (p) projects.push(p);
    } catch {
      /* Keep other projects accessible. */
    }
  }
  return projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export function assertFilesSize(files: Record<string, string>): void {
  let total = 0;
  for (const [path, content] of Object.entries(files)) {
    if (content.length > MAX_FILE_SIZE)
      throw new Error(`ไฟล์ ${path} ใหญ่เกิน 400 KB กรุณาลดขนาดก่อนบันทึก`);
    total += content.length;
  }
  if (total > MAX_TOTAL_SIZE)
    throw new Error("ไฟล์ทั้งหมดรวมกันเกิน 800 KB กรุณาลดขนาดก่อนบันทึก");
}
export function checkpoint(
  project: BuildProject,
  files: Record<string, string>,
  label: string,
): BuildProject {
  assertFilesSize(files);
  return {
    ...project,
    files,
    updatedAt: new Date().toISOString(),
    versions: [
      {
        id: crypto.randomUUID(),
        label: label.slice(0, 80),
        files: project.files,
        createdAt: new Date().toISOString(),
      },
      ...project.versions,
    ].slice(0, 8),
  };
}
/** หน้าหลักของชุดไฟล์: index.html ก่อน แล้วค่อยหา .html อื่น */
export function defaultPage(files: Record<string, string>): string {
  if (files["index.html"] !== undefined) return "index.html";
  const html = Object.keys(files).find((path) => path.endsWith(".html"));
  return html ?? Object.keys(files)[0] ?? "index.html";
}
export function sameFiles(
  a: Record<string, string>,
  b: Record<string, string>,
): boolean {
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every((key) => a[key] === b[key])
  );
}
/** เส้นทางที่เนื้อหาต่างไปจากเดิม หรือเพิ่ม/หายไประหว่างสองชุดไฟล์ */
export function changedPaths(
  before: Record<string, string>,
  after: Record<string, string>,
): string[] {
  return [
    ...new Set([...Object.keys(before), ...Object.keys(after)]),
  ].filter((path) => before[path] !== after[path]);
}
function normalizeHref(href: string): string {
  return href.replace(/^\.\//, "");
}
function isLocalHref(href: string): boolean {
  return !/^(https?:|data:|\/\/|mailto:|tel:|#)/.test(href);
}
/**
 * อินไลน์ `<link rel=stylesheet>` และ `<script src>` ที่ชี้ไฟล์ในโปรเจกต์
 * (พรีวิวเป็น iframe srcDoc จึงโหลดไฟล์พี่น้องเองไม่ได้ — และ CSP ก็ปิดเครือข่าย)
 */
export function inlineAssets(
  doc: string,
  files: Record<string, string>,
): string {
  let out = doc.replace(/<link\b([^>]*)>/gi, (tag, attrs: string) => {
    const href = /href=["']([^"'<>]+)["']/i.exec(attrs)?.[1];
    if (!href || !isLocalHref(href)) return tag;
    const path = normalizeHref(href);
    if (files[path] === undefined) return tag;
    return `<style data-file="${path}">\n${files[path]}\n</style>`;
  });
  out = out.replace(
    /<script\b([^>]*)src=["']([^"'<>]+)["']([^>]*)>\s*<\/script>/gi,
    (tag, _before: string, src: string) => {
      if (!isLocalHref(src)) return tag;
      const path = normalizeHref(src);
      if (files[path] === undefined) return tag;
      return `<script data-file="${path}">\n${files[path]}\n</script>`;
    },
  );
  return out;
}
/**
 * บริดจ์ของพรีวิว: ส่ง console log/warn/error กลับให้บิลเดอร์ และดักคลิก
 * `<a href>` แบบพาธภายใน (postMessage `navigate`) เพื่อให้แอปหลายหน้า
 * เปลี่ยนหน้าใน iframe ได้เอง
 *
 * ⚠️ เขียนเป็นฟังก์ชันจริงแล้ว stringify (ไม่ใช่สตริงที่ escapes ด้วยมือ) เพราะ
 * เวอร์ชันก่อนหน้านี้ escapes `</script>` เกินหนึ่งชั้น ทำให้แท็กสคริปต์ไม่ปิด
 * และทั้งเอกสารพรีวิวกลายเป็นเนื้อสคริปต์ (พรีวิวว่างเปล่า)
 */
function gupanPreviewBridge(): void {
  var scope = window as unknown as { __GUPAN_CHANNEL__?: string; parent: Window };
  var channel = scope.__GUPAN_CHANNEL__ || "";
  function send(level: string, args: unknown[]): void {
    try {
      var text = args
        .map(function (value: unknown) {
          if (typeof value === "string") return value;
          try {
            return JSON.stringify(value);
          } catch (error) {
            return String(value);
          }
        })
        .join(" ")
        .slice(0, 2000);
      scope.parent.postMessage({ channel: channel, level: level, text: text }, "*");
    } catch (error) {
      /* ข้าม: ต้องไม่ทำให้โค้ดผู้ใช้พังเพราะการรายงานผลล้มเหลว */
    }
  }
  (["log", "warn", "error"] as const).forEach(function (level) {
    var consoleScope = console as unknown as Record<string, (...args: unknown[]) => void>;
    var original = consoleScope[level];
    consoleScope[level] = function () {
      send(level, Array.prototype.slice.call(arguments) as unknown[]);
      if (original) original.apply(console, arguments as unknown as []);
    };
  });
  window.addEventListener("error", function (event) {
    send("error", [event.message]);
  });
  window.addEventListener("unhandledrejection", function (event) {
    send("error", [String((event as PromiseRejectionEvent).reason)]);
  });
  document.addEventListener("click", function (event) {
    var target = event.target as Element | null;
    var anchor = target && target.closest ? target.closest("a[href]") : null;
    if (!anchor) return;
    var href = anchor.getAttribute("href") || "";
    if (!href || /^(https?:|mailto:|tel:|#|data:)/.test(href)) return;
    event.preventDefault();
    scope.parent.postMessage(
      { channel: channel, navigate: href.replace(/^\.\//, "") },
      "*",
    );
  });
}

/** แท็กสคริปต์ของบริดจ์ (ใช้ทั้งพรีวิว static และ React) */
export function previewConsoleBridge(channel: string): string {
  return (
    `<script>window.__GUPAN_CHANNEL__=${JSON.stringify(channel)};` +
    `(${gupanPreviewBridge.toString()})();</script>`
  );
}

/**
 * เอกสารพรีวิวหนึ่งหน้า: อินไลน์แอสเซต + CSP + bridge (console log กลับออก
 * มา และดักคลิก link ภายในให้ postMessage `navigate` มาเปลี่ยนหน้า)
 */
export function previewDocument(
  files: Record<string, string>,
  path: string,
  channel: string,
): string {
  const doc = inlineAssets(
    files[path] ?? files[defaultPage(files)] ?? "",
    files,
  );
  // CSP comes before user code. No same-origin permission or parent access; only passive
  // resources (images/media/fonts over HTTPS or data:) may load — never scripts, styles, forms or fetch.
  const policy = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: https:; media-src data: https:; font-src data: https:; connect-src 'none'; form-action 'none'; base-uri 'none'">`;
  const bridge = previewConsoleBridge(channel);
  return `<!doctype html><html><head>${policy}${bridge}</head><body>${doc.replace(/<!doctype[^>]*>/i, "")}</body></html>`;
}
function isCompleteHtml(html: string): boolean {
  return (
    /^<!doctype html>|^<html[\s>]/i.test(html) && /<\/html>\s*$/i.test(html)
  );
}
/** นำเข้าไฟล์ .html เดี่ยว (ใช้กับปุ่มนำเข้า HTML) */
export function extractHtml(response: string): string {
  const fenced = /```(?:html)?\s*\n([\s\S]*?)```/i.exec(response);
  let html = (fenced?.[1] ?? "").trim();
  if (!html) {
    // ไม่มี fence: ตัดเฉพาะส่วนที่เป็นเอกสาร HTML จริง เผื่อมีสรุปนำอยู่ข้างหน้า
    const doc = /<!doctype html>[\s\S]*<\/html>/i.exec(response);
    html = (doc?.[0] ?? response).trim();
  }
  if (html.length > MAX_FILE_SIZE) throw new Error("AI ส่งไฟล์ใหญ่เกิน 400 KB");
  if (!isCompleteHtml(html)) {
    throw new Error(
      "AI ไม่ได้ส่ง HTML ที่สมบูรณ์ โค้ดเดิมยังอยู่ ลองระบุคำสั่งใหม่",
    );
  }
  return html;
}
function sanitizePath(raw: string): string {
  const path = raw.trim().replace(/^\/+/, "");
  if (!path || path.includes("..") || !/^[\w.-]+(?:\/[\w.-]+)*$/.test(path))
    return "";
  return path;
}
/**
 * แปลงคำตอบ AI เป็นชุดไฟล์: บล็อก `` ```file:path `` ทุกบล็อก
 * ต้องมี index.html ที่สมบูรณ์เสมอ — ถ้า AI ตอบแบบเก่า (HTML ล้วน)
 * จะห่อเป็น index.html ให้หนึ่งไฟล์
 */
export function extractFiles(response: string): Record<string, string> {
  const files: Record<string, string> = {};
  const fence = /```file:([^\s`]+)\s*\n([\s\S]*?)```/gi;
  let match: RegExpExecArray | null;
  while ((match = fence.exec(response))) {
    const path = sanitizePath(match[1]);
    if (path) files[path] = match[2].trim();
  }
  if (Object.keys(files).length) {
    const index = files["index.html"];
    if (!index || !isCompleteHtml(index))
      throw new Error("AI ส่งไฟล์มาแต่ขาด index.html ที่สมบูรณ์");
    assertFilesSize(files);
    return files;
  }
  return { "index.html": extractHtml(response) };
}
/**
 * ข้อความสรุปที่ AI เขียนนำหน้าบล็อกโค้ด — นำไปแสดง/สตรีมเป็นข้อความผู้ช่วย
 * (markdown เบา: bullet + ตัวหนา) กลับค่าว่างถ้า AI ส่งมาแต่โค้ด
 */
export function extractSummary(response: string): string {
  const fence = response.indexOf("```");
  const cut =
    fence >= 0 ? fence : response.search(/<!doctype html>|<html[\s>]/i);
  const head = cut > 0 ? response.slice(0, cut) : "";
  return head.trim().slice(0, 700);
}
export const BUILD_SYSTEM_PROMPT = "You are Sali, an expert AI application builder working like a modern full-stack app builder.\n\nBuild a COMPLETE, usable application from the user's natural-language request. Do not make a decorative mockup or tiny code demo. Infer the normal product structure from the request and implement the complete first version.\n\nBUILDER CORE:\n- Prefer Puter.js for app capabilities that need cloud/backend behavior: authentication, AI, KV/storage, filesystem, hosting, database, serverless and realtime/peer features when applicable.\n- Generated apps must be designed so the user can continue editing, previewing and publishing them.\n- Never invent unavailable secrets, API keys, credentials, payments, or third-party backend services.\n- When a real external capability is not available in the current app, implement a clearly labelled local/demo state instead of pretending it is connected.\n- Do not use localStorage as a replacement for Puter cloud storage when the requested feature needs persistence. In-memory state is fine for temporary UI state.\n- Use explicit Puter sign-in controls for authenticated features. Never rely on an unexpected implicit auth popup.\n- For realtime peer-to-peer features, use Puter Peer APIs rather than raw WebRTC or third-party signaling.\n\nAPPLICATION COMPLETENESS:\n- Infer the screens, navigation, data states and controls a real app of this type needs.\n- For a chat app, include onboarding/login state, sidebar, new chat, history, conversation view, composer, model selector, settings/profile, theme/voice controls, responsive mobile layout, loading/error/empty states and working interactions.\n- For dashboards, shops, booking, CRM, admin panels and similar products, include the conventional screens and workflows required to make the product coherent.\n- If the user asks for three tabs, make three primary tabs with meaningful content and working navigation.\n- Every primary button must do something useful. Avoid dead controls, TODOs, lorem ipsum and fake links.\n- Make forms, tabs, dialogs, filters, navigation, toggles and common interactions actually work.\n- Build a polished responsive UI that works on small mobile screens as well as desktop.\n- Add accessible labels, keyboard focus states and sensible semantic structure.\n\nPROJECT OUTPUT:\n- Build a REAL MULTI-FILE PROJECT. Add every file needed, not only the changed file.\n- Prefer modular files and folders when the requested app is substantial.\n- Keep generated source within the builder limits.\n- Return an optional short summary followed by one fenced block per file using ```file:path.\n- The first file must be ```file:index.html when the project is an HTML-first project.\n- If the requested stack requires another entry point, create the appropriate complete project structure instead of forcing everything into one HTML file.\n- Never return a tiny placeholder for a substantial request.\n\nPREVIEW AND QUALITY:\n- The preview must represent the actual generated application as closely as the available runtime allows.\n- Do not fake missing dependencies with invented components or empty icon stubs.\n- Do not claim a server, database, API, authentication or deployment is real unless it is actually configured.\n- Include a clear error/empty state when an integration is unavailable.\n- Keep the result deterministic enough to preview and debug.\n- Avoid console errors and broken asset references.\n- Use icons rather than decorative emoji for primary UI controls when an icon library or inline SVG is appropriate.\n\nWhen the user asks for an app, prioritize a finished, coherent product over explaining code.";
