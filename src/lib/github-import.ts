/**
 * ═══ โคลนโปรเจกต์จาก GitHub (repo สาธารณะ) ══════════════════════════════
 *
 * สองหน้าที่ในไฟล์เดียว เพราะใช้ตัวช่วยชุดเดียวกันทั้งฝั่งเซิร์ฟเวอร์และเบราว์เซอร์:
 *
 *  1. ฝั่งเซิร์ฟเวอร์ (`app/api/github/import/route.ts`) — ดาวน์โหลด tarball
 *     จาก codeload.github.com แล้วคัดแยกไฟล์ข้อความ/ไฟล์ไบนารีออกเป็น payload
 *     (ทำฝั่งเซิร์ฟเวอร์เพราะ codeload ไม่ส่ง CORS ให้ origin อื่น)
 *  2. ฝั่งเบราว์เซอร์ — `planImport()` เป็นฟังก์ชันบริสุทธิ์ที่ตัดสินใจว่า
 *     ไฟล์ไหนควรเข้าโปรเจกต์จริง เรียงตามความสำคัญ (หน้าเว็บ → ไฟล์ที่หน้านั้น
 *     อ้างถึง → ไฟล์อื่นในโฟลเดอร์เว็บ) ภายใต้เพดาน 400 KB/ไฟล์ · 800 KB/โปรเจกต์
 *     ของ `lib/builder.ts` แล้วคืนชุดไฟล์ที่บันทึกได้ทันที
 *
 * ไม่มี AI/เครดิตเกี่ยวข้อง: ทุกอย่างเกิดหลังผู้ใช้กดโคลนเอง
 */

import { MAX_FILE_SIZE, MAX_TOTAL_SIZE, type ProjectOrigin } from "./builder";

// ── ชนิดข้อมูลที่รับส่งระหว่าง route กับหน้าเว็บ ──────────────────────────

export interface RepoImportMeta {
  owner: string;
  repo: string;
  /** ref ที่ใช้จริง (branch/tag/commit) */
  ref: string;
  defaultBranch: string;
  htmlUrl: string;
  description?: string;
  language?: string;
  stars?: number;
  license?: string;
  /** ขนาด repo ตาม GitHub (KB) ใช้เตือนก่อนดาวน์โหลด */
  sizeKb?: number;
  /** โฟลเดอร์ย่อยที่ผู้ใช้ระบุจาก URL /tree/<ref>/<subpath> */
  subpath?: string;
}

export type AssetKind = "image" | "font" | "media" | "binary";

export interface RepoImportFile {
  path: string;
  size: number;
  text: string;
}

export interface RepoImportAsset {
  path: string;
  size: number;
  kind: AssetKind;
}

export interface RepoImportNote {
  path: string;
  reason: string;
}

export interface RepoImportPayload {
  meta: RepoImportMeta;
  files: RepoImportFile[];
  assets: RepoImportAsset[];
  /** ไฟล์ที่ฝั่งเซิร์ฟเวอร์ไม่ส่งมา พร้อมเหตุผล (ไบนารี · ใหญ่เกิน · ถูกข้าม) */
  skipped: RepoImportNote[];
  /** หมายเหตุระดับ repo เช่น tarball ใหญ่จนต้องตัดไฟล์ท้าย ๆ */
  notes: string[];
}

export interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

// ── เพดานและรายการที่ข้าม ───────────────────────────────────────────────

/** เนื้อไฟล์ข้อความรวมสูงสุดที่ route ส่งกลับ (ไบต์) */
export const MAX_PAYLOAD_TEXT = 3_000_000;
/** tarball สูงสุดที่ยอมดาวน์โหลด (ไบต์) */
export const MAX_ARCHIVE_BYTES = 60 * 1024 * 1024;
/** จำนวนไฟล์ข้อความสูงสุดในหนึ่ง payload */
export const MAX_PAYLOAD_FILES = 600;
/** ไฟล์ข้อความใหญ่กว่านี้ไม่ต้องส่งมา (เกินเพดานโปรเจกต์อยู่แล้ว) */
export const MAX_TEXT_FILE_BYTES = 400_000;

/** โฟลเดอร์ที่ไม่ต้องนำเข้าเลย (ไม่เกี่ยวกับพรีวิว และกินพื้นที่มาก) */
export const SKIP_DIR_PREFIXES = [
  "node_modules/",
  ".git/",
  ".next/",
  ".nuxt/",
  ".cache/",
  ".parcel-cache/",
  "__pycache__/",
  ".venv/",
  "venv/",
  ".vscode/",
  ".idea/",
  "coverage/",
  ".turbo/",
];

/** ไฟล์ที่ไม่ต้องนำเข้า (ชื่อไฟล์ตรง ๆ) */
export const SKIP_FILE_NAMES = [
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  "composer.lock",
  "cargo.lock",
  "poetry.lock",
  "gemfile.lock",
  "go.sum",
  ".ds_store",
];

const TEXT_EXT = new Set([
  "html", "htm", "xhtml", "css", "scss", "sass", "less", "js", "mjs", "cjs",
  "jsx", "ts", "tsx", "vue", "svelte", "astro", "json", "jsonc", "md",
  "markdown", "mdx", "txt", "svg", "xml", "yml", "yaml", "toml", "ini",
  "cfg", "conf", "env", "example", "csv", "tsv", "sql", "sh", "bash", "zsh",
  "ps1", "bat", "php", "py", "rb", "go", "rs", "java", "cs", "kt", "swift",
  "c", "h", "cpp", "hpp", "lua", "dart", "graphql", "gql", "webmanifest",
  "gitignore", "gitattributes", "editorconfig", "htaccess", "lock", "patch",
  "diff", "dockerfile", "makefile",
]);

const ASSET_KINDS: Record<string, AssetKind> = {
  png: "image", jpg: "image", jpeg: "image", gif: "image", webp: "image",
  avif: "image", ico: "image", bmp: "image", tiff: "image", jfif: "image",
  woff: "font", woff2: "font", ttf: "font", otf: "font", eot: "font",
  mp4: "media", webm: "media", mov: "media", mp3: "media", wav: "media",
  ogg: "media", m4a: "media", flac: "media", ogv: "media",
};

/** นามสกุลที่แสดงชัดว่าเป็นไบนารี/ไม่เกี่ยวกับพรีวิว */
const BINARY_EXT = new Set([
  "zip", "gz", "tgz", "tar", "rar", "7z", "pdf", "doc", "docx", "xls", "xlsx",
  "ppt", "pptx", "exe", "dll", "so", "dylib", "bin", "class", "jar", "wasm",
  "psd", "ai", "sketch", "fig", "map", "db", "sqlite", "woff3",
]);

export function extensionOf(path: string): string {
  const base = path.slice(path.lastIndexOf("/") + 1).toLowerCase();
  if (!base.includes(".")) return base; // Dockerfile, Makefile, LICENSE
  return base.slice(base.lastIndexOf(".") + 1);
}

function baseName(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1).toLowerCase();
}

export type FileKind = "text" | AssetKind | "skip";

/**
 * แยกชนิดไฟล์จากพาธอย่างเดียว (ไม่ต้องมีเนื้อไฟล์)
 * ไฟล์นามสกุลไม่รู้จักคืน "text" แล้วให้ผู้เรียกตรวจไบนารีด้วย `isProbablyBinary`
 */
export function classifyRepoPath(rawPath: string): FileKind {
  const path = normalizeRepoPath(rawPath);
  if (!path) return "skip";
  const lower = path.toLowerCase();
  if (SKIP_DIR_PREFIXES.some((prefix) => lower.startsWith(prefix))) return "skip";
  if (lower.split("/").some((part) => SKIP_DIR_PREFIXES.includes(`${part}/`))) {
    return "skip";
  }
  if (SKIP_FILE_NAMES.includes(baseName(path))) return "skip";
  const ext = extensionOf(path);
  if (ASSET_KINDS[ext]) return ASSET_KINDS[ext];
  if (BINARY_EXT.has(ext)) return "binary";
  if (TEXT_EXT.has(ext)) return "text";
  return "text";
}

/** ตรวจไบนารีแบบหยาบ: มี NUL หรือไบต์ควบคุมเกินสัดส่วน */
export function isProbablyBinary(bytes: Uint8Array): boolean {
  const sample = Math.min(bytes.length, 4096);
  let suspicious = 0;
  for (let i = 0; i < sample; i += 1) {
    const byte = bytes[i];
    if (byte === 0) return true;
    if (byte < 9 || (byte > 13 && byte < 32)) suspicious += 1;
  }
  return sample > 0 && suspicious / sample > 0.3;
}

/** ถอดข้อความ UTF-8 (คืน null เมื่อดูเหมือนไบนารี) */
export function decodeRepoText(bytes: Uint8Array): string | null {
  if (isProbablyBinary(bytes)) return null;
  if (typeof TextDecoder === "function") {
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  }
  let out = "";
  for (let i = 0; i < bytes.length; i += 1) out += String.fromCharCode(bytes[i]);
  return out;
}

// ── พาธ ────────────────────────────────────────────────────────────────

/** ทำพาธให้เป็นรูปแบบเดียว: ไม่มี ./ นำหน้า, ไม่มี / ปิดท้าย, ไม่มี .. */
export function normalizeRepoPath(raw: string): string {
  let path = (raw || "").replace(/\\/g, "/").trim();
  if (!path) return "";
  path = path.replace(/^\.\//, "").replace(/^\/+/, "");
  while (path.startsWith("./")) path = path.slice(2);
  path = path.replace(/\/{2,}/g, "/");
  if (path.endsWith("/")) path = path.slice(0, -1);
  const parts: string[] = [];
  for (const part of path.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (!parts.length) return ""; // พาธหลุดออกนอก repo
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  return parts.join("/");
}

/** โฟลเดอร์ของพาธ ("" = ราก) */
export function dirOf(path: string): string {
  const slash = path.lastIndexOf("/");
  return slash < 0 ? "" : path.slice(0, slash);
}

/** รวมพาธอ้างอิง (relative หรือ /absolute) ให้เป็นพาธจากราก repo */
export function resolveRepoPath(
  fromPath: string,
  literal: string,
  rootPrefix = "",
): string {
  const clean = (literal || "").trim().split(/[?#]/)[0];
  if (!clean) return "";
  if (clean.startsWith("/")) {
    return normalizeRepoPath(`${rootPrefix ? `${rootPrefix}/` : ""}${clean.slice(1)}`);
  }
  const dir = dirOf(fromPath);
  const joined = dir ? `${dir}/${clean}` : clean;
  const parts: string[] = [];
  for (const part of joined.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (!parts.length) return "";
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  return parts.join("/");
}

/** URL ตรงไปยังไฟล์ใน repo (ใช้เมื่อพรีวิวต้องโหลดรูป/ฟอนต์จากภายนอก) */
export function repoRawUrl(meta: RepoImportMeta, path: string): string {
  const ref = encodeURIComponent(meta.ref);
  const clean = path.split("/").map(encodeURIComponent).join("/");
  return `https://raw.githubusercontent.com/${meta.owner}/${meta.repo}/${ref}/${clean}`;
}

// ── parse URL/ชื่อ repo ────────────────────────────────────────────────

export interface RepoRef {
  owner: string;
  repo: string;
  ref?: string;
  subpath?: string;
}

export class GitHubImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitHubImportError";
  }
}

const OWNER_RE = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,38})$/;
const RESERVED_OWNERS = new Set(["features", "topics", "collections", "orgs", "settings"]);

/**
 * รับได้ทุกรูปแบบที่คนมักวาง: `owner/repo`, URL เต็ม, URL แบบ /tree/<ref>/<path>
 * รวมถึง SSH (`git@github.com:owner/repo.git`) และมี .git ต่อท้าย
 */
export function parseRepoRef(input: string): RepoRef {
  const raw = (input || "").trim();
  if (!raw) throw new GitHubImportError("ใส่ URL หรือชื่อ repo GitHub ก่อน");
  let text = raw
    .replace(/^git@github\.com:/i, "")
    .replace(/^git\+/i, "")
    .replace(/^(https?:\/\/)?(www\.)?github\.com\//i, "")
    .replace(/^(https?:\/\/)?(www\.)?githubusercontent\.com\//i, "");
  text = text.replace(/[#?].*$/, "").replace(/\/+$/, "");
  if (/^https?:/i.test(text)) {
    throw new GitHubImportError("รองรับเฉพาะ repo บน github.com เท่านั้น");
  }

  const parts = text.split("/").filter(Boolean);
  if (parts.length < 2) {
    throw new GitHubImportError("ต้องเป็นรูปแบบ owner/repo เช่น facebook/react");
  }
  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/i, "");
  if (!OWNER_RE.test(owner) || RESERVED_OWNERS.has(owner.toLowerCase())) {
    throw new GitHubImportError("ชื่อเจ้าของ repo ไม่ถูกต้อง");
  }
  if (!OWNER_RE.test(repo)) {
    throw new GitHubImportError("ชื่อ repo ไม่ถูกต้อง");
  }

  const rest = parts.slice(2);
  let ref: string | undefined;
  let subpath: string | undefined;
  if (rest.length >= 2 && ["tree", "blob", "raw", "commits"].includes(rest[0])) {
    ref = rest[1];
    const tail = rest.slice(2);
    if (tail.length) subpath = normalizeRepoPath(tail.join("/"));
  } else if (rest.length === 1) {
    ref = rest[0]; // owner/repo@branch หรือ owner/repo/branch
  }
  return { owner, repo, ref, subpath: subpath || undefined };
}

// ── เลือกหน้าแรกของเว็บ ────────────────────────────────────────────────

const HTML_EXT = new Set(["html", "htm", "xhtml"]);

export function isHtmlPath(path: string): boolean {
  return HTML_EXT.has(extensionOf(path));
}

/** เทียบความลึกของพาธ (จำนวนโฟลเดอร์) */
function depthOf(path: string): number {
  return path.split("/").length - 1;
}

/**
 * หน้าแรกที่ควรใช้: index.html ตื้นที่สุด → ไฟล์ .html ตื้นที่สุด → null
 */
export function pickEntryPath(paths: string[]): string | null {
  const pages = paths.filter(isHtmlPath);
  if (!pages.length) return null;
  const score = (path: string) => {
    const base = path.slice(path.lastIndexOf("/") + 1).toLowerCase();
    const isIndex = base.startsWith("index.") ? 0 : 1;
    const isReadmeLike = /^(404|readme)\b/.test(base) ? 1 : 0;
    return isIndex * 2 + isReadmeLike * 4 + depthOf(path);
  };
  return [...pages].sort((a, b) => score(a) - score(b) || a.localeCompare(b))[0];
}

// ── สแกนการอ้างถึงไฟล์ภายใน ────────────────────────────────────────────

const REF_ATTR_RE =
  /(?:src|href|poster|data-src|content)\s*=\s*(?:"([^"<>]+)"|'([^'<>]+)'|([^\s"'<>`]+))/gi;
const URL_FUNC_RE = /url\(\s*(?:"([^"]+)"|'([^']+)'|([^)'"]+))\s*\)/gi;
const QUOTED_ASSET_RE =
  /(?:"|'|`)((?:\.\.?\/|\/)?[\w.@%+~-]+(?:\/[\w.@%+~-]+)*\.[A-Za-z0-9]{1,6})(?:"|'|`)/g;

/**
 * เก็บ "ข้อความอ้างอิง" ที่ปรากฏจริงในไฟล์ (ใช้ทั้งเดินตามกราฟไฟล์และเขียน URL ทับ)
 * คืนค่ารูปแบบที่เจอเป๊ะ ๆ เพื่อให้แทนที่ได้ตรงตำแหน่ง
 */
export function findReferences(text: string): string[] {
  const found: string[] = [];
  for (const match of text.matchAll(REF_ATTR_RE)) {
    const value = match[1] ?? match[2] ?? match[3] ?? "";
    if (value) found.push(value);
  }
  for (const match of text.matchAll(URL_FUNC_RE)) {
    const value = match[1] ?? match[2] ?? match[3] ?? "";
    if (value) found.push(value.trim());
  }
  for (const match of text.matchAll(QUOTED_ASSET_RE)) {
    if (match[1]) found.push(match[1]);
  }
  // ข้ามการอ้างถึงภายนอก (http:, data:, mailto:, //) — เหลือเฉพาะพาธในโปรเจกต์
  return found.filter(
    (value) => !!value && !/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value),
  );
}

/** ไฟล์ที่อาจมีพาธอ้างอิงอยู่ข้างใน จึงต้องตรวจรอบสอง */
const REWRITABLE_TEXT_RE = /\.(html?|css|js|mjs|cjs|jsx|tsx?|svg)$/i;
/** ไฟล์ที่ไม่ถูกเก็บเข้าโปรเจกต์แต่พรีวิวยังแสดงได้ด้วย URL ของ GitHub (ไบนารี/รูป) */
const REWRITABLE_ASSET_RE =
  /\.(png|jpe?g|gif|webp|avif|svg|ico|bmp|woff2?|ttf|otf|eot|mp4|webm|ogg|oga|mp3|wav|pdf|json)$/i;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── วางแผนนำเข้า ───────────────────────────────────────────────────────

export interface ImportedFile {
  path: string;
  size: number;
}

export interface ImportPlan {
  /** ชุดไฟล์พร้อมบันทึกด้วย `saveProject()` */
  files: Record<string, string>;
  /** หน้าที่จะเปิดในพรีวิว */
  entry: string;
  /** โฟลเดอร์ที่ถูกยึดเป็นรากเว็บ ("" = ราก repo) — ใช้เขียน URL ของรูปกลับไปที่ repo */
  webRoot: string;
  /**
   * ต้นทางของ repo — เก็บไว้กับโปรเจกต์เพื่อสร้าง URL ของรูป/ฟอนต์ (`raw.githubusercontent.com`)
   * เพราะพรีวิวเก็บได้เฉพาะไฟล์ข้อความ ไม่ได้เก็บไฟล์ไบนารี
   */
  origin: ProjectOrigin;
  name: string;
  /** ข้อความผู้ช่วยสรุปงาน (แสดงในการสนทนาของโปรเจกต์) */
  summary: string;
  kept: ImportedFile[];
  dropped: RepoImportNote[];
  warnings: string[];
  totalBytes: number;
}

/** กันที่ไว้ให้หน้ารายการไฟล์ที่สร้างเอง (มี README ได้ถึง 6,000 ตัวอักษร) */
export const GENERATED_PAGE_RESERVE = 8_000;

export interface PlanOptions {
  maxFileBytes?: number;
  maxTotalBytes?: number;
  /** ชื่อโปรเจกต์ที่ต้องการ (ค่าเริ่มต้น = ชื่อ repo) */
  name?: string;
}

/** มุมมอง Record ของไฟล์ที่ส่งมา (ให้ตัวตรวจ package.json ใช้) */
function filesByPath(index: Map<string, RepoImportFile>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [path, file] of index) out[path] = file.text;
  return out;
}

/** ตัด prefix ของโฟลเดอร์เว็บออกจากพาธ (ไฟล์นอกรากจะคงพาธเดิมไว้) */
function flatten(path: string, rootPrefix: string): string {
  if (!rootPrefix) return path;
  return path.startsWith(`${rootPrefix}/`)
    ? path.slice(rootPrefix.length + 1)
    : path;
}

/**
 * โฟลเดอร์โค้ดของโปรเจกต์เฟรมเวิร์ก (React/Vue/Next/…)
 * ไฟล์นอกโฟลเดอร์เหล่านี้ไม่เกี่ยวกับพรีวิว จึงไม่ต้องดูดเข้ามา
 */
export const FRAMEWORK_SOURCE_DIRS = new Set([
  "src", "app", "pages", "components", "lib", "hooks", "utils", "util",
  "styles", "style", "css", "scss", "assets", "img", "images", "fonts",
  "public", "static", "context", "contexts", "store", "stores", "state",
  "services", "api", "types", "config", "constants", "layouts", "features",
  "modules", "views", "screens", "helpers", "i18n", "locales", "router",
  "routes", "graphql", "providers", "theme", "themes", "data", "models",
]);

/** ไฟล์ config/เอกสารระดับรากที่ควรเก็บไว้แม้เป็นโปรเจกต์เฟรมเวิร์ก */
const FRAMEWORK_ROOT_FILES =
  /^(package\.json|index\.html|tsconfig[\w.-]*\.json|jsconfig\.json|vite\.config\.[jt]s|next\.config\.[jt]s|tailwind\.config\.[jt]s|postcss\.config\.[jt]s|svelte\.config\.[jt]s|vue\.config\.[jt]s|nuxt\.config\.[jt]s|angular\.json|index\.css|index\.scss|\.env\.example|readme.*|license.*|licence.*|notice.*|copying.*|contributing\.md|code_of_conduct\.md|security\.md|dockerfile|makefile)/i;

/** อ่านชื่อ dependency จาก package.json (ไม่พึ่ง JSON ที่สมบูรณ์) */
export function packageDependencies(
  files: Record<string, string>,
): Record<string, string> {
  const raw = files["package.json"];
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      ...((parsed.dependencies as Record<string, string>) ?? {}),
      ...((parsed.devDependencies as Record<string, string>) ?? {}),
      ...((parsed.peerDependencies as Record<string, string>) ?? {}),
    };
  } catch {
    return {};
  }
}

const FRAMEWORK_DEPS = [
  "react", "react-dom", "next", "vue", "nuxt", "svelte", "@angular/core",
  "solid-js", "preact", "astro", "gatsby", "remix", "@remix-run/react", "vite",
];

/** โปรเจกต์นี้เป็นแอปเฟรมเวิร์ก (ต้องเดินกราฟ import ไม่ใช่เก็บทุกไฟล์) หรือไม่ */
export function isFrameworkProject(files: Record<string, string>): boolean {
  const deps = packageDependencies(files);
  return FRAMEWORK_DEPS.some((name) => deps[name] !== undefined);
}

/** ไฟล์ของโปรเจกต์เฟรมเวิร์กที่ "เกี่ยวกับแอป" จริง ๆ */
function isFrameworkAppFile(path: string): boolean {
  if (!path.includes("/")) return FRAMEWORK_ROOT_FILES.test(path);
  const first = path.split("/")[0].toLowerCase();
  return FRAMEWORK_SOURCE_DIRS.has(first);
}

/** เอกสารรากที่ควรพาเข้ามาเป็นบริบท (ที่เหลืออย่าง CHANGELOG ถือเป็น noise) */
const ROOT_DOC_RE =
  /^(readme|license|licence|copying|notice|contributing|code_of_conduct|security|package\.json|pyproject\.toml|requirements\.txt|go\.mod|cargo\.toml|composer\.json|dockerfile|makefile|index\.md|manifest\.json)/i;

function isUsefulRootDoc(path: string): boolean {
  const base = path.slice(path.lastIndexOf("/") + 1);
  if (base.startsWith(".")) return false; // .eslintrc, .alexrc, .gitignore… ไม่เกี่ยวกับพรีวิว
  return ROOT_DOC_RE.test(base);
}

/**
 * ลำดับความสำคัญ: หน้าแรก → ไฟล์ที่อ้างถึง (และที่ import ต่อกันเป็นทอด) →
 * ไฟล์อื่นในโฟลเดอร์เว็บ → เอกสารราก
 *
 * โปรเจกต์เฟรมเวิร์ก (React/Vite/Next/…) เก็บเฉพาะไฟล์ที่ "เกี่ยวกับแอป"
 * เพื่อไม่ให้โปรเจกต์บวมด้วย test/fixtures/สคริปต์ที่ไม่ถูกเรียกใช้
 */
function orderFiles(
  index: Map<string, RepoImportFile>,
  entryPath: string | null,
  rootPrefix: string,
  framework: boolean,
): { order: string[]; outside: string[] } {
  const order: string[] = [];
  const outside: string[] = [];
  const seen = new Set<string>();

  const queue: string[] = [];
  if (entryPath && index.has(entryPath)) queue.push(entryPath);
  while (queue.length) {
    const path = queue.shift() as string;
    if (seen.has(path)) continue;
    seen.add(path);
    order.push(path);
    if (!isHtmlPath(path) && ![ "css", "js", "mjs", "cjs", "svg" ].includes(extensionOf(path))) {
      continue;
    }
    const text = index.get(path)?.text ?? "";
    for (const literal of findReferences(text)) {
      const resolved = resolveRepoPath(path, literal, rootPrefix);
      if (resolved && index.has(resolved) && !seen.has(resolved)) queue.push(resolved);
    }
  }

  const inside: string[] = [];
  const rootDocs: string[] = [];
  for (const path of index.keys()) {
    if (seen.has(path)) continue;
    const inRoot = !rootPrefix || path.startsWith(`${rootPrefix}/`);
    // โปรเจกต์เฟรมเวิร์กเก็บเฉพาะไฟล์ที่เกี่ยวกับแอป แม้จะอยู่ที่รากก็ตาม
    if (framework && !isFrameworkAppFile(path)) {
      outside.push(path);
      continue;
    }
    if (inRoot) {
      inside.push(path);
    } else if (dirOf(path) === "" && isUsefulRootDoc(path)) {
      // เอกสารรากมีประโยชน์เป็นบริบทให้ AI (แต่ไม่ดูด CHANGELOG ครึ่งเมกะไบต์เข้ามา)
      rootDocs.push(path);
    } else if (framework && isFrameworkAppFile(path)) {
      // โค้ดแอปที่อยู่คนละโฟลเดอร์กับหน้าแรก (เช่น src/ นอก dist/)
      inside.push(path);
    } else {
      outside.push(path);
    }
  }
  const byDepth = (a: string, b: string) =>
    depthOf(a) - depthOf(b) || a.localeCompare(b);
  inside.sort(byDepth);
  rootDocs.sort(byDepth);
  outside.sort(byDepth);
  // ไฟล์นอกโฟลเดอร์เว็บที่ไม่ถูกอ้างถึงไม่นำเข้า (เช่นโค้ดต้นทางของเฟรมเวิร์ก)
  return { order: [...order, ...inside, ...rootDocs], outside };
}

/** หน้าที่สร้างขึ้นเองเมื่อ repo ไม่มี HTML (แสดงรายการไฟล์ + README) */
function listingPage(
  meta: RepoImportMeta,
  files: ImportedFile[],
  assets: RepoImportAsset[],
  readme: string | null,
): string {
  const rows = [
    ...files.map((file) => `<li><code>${escapeHtml(file.path)}</code><span>${Math.round(file.size / 1024) || 1} KB</span></li>`),
    ...assets.map((asset) => `<li class="dim"><code>${escapeHtml(asset.path)}</code><span>${asset.kind} · ${Math.round(asset.size / 1024) || 1} KB</span></li>`),
  ].join("\n      ");
  const readmeBlock = readme
    ? `<h2>README</h2>\n    <pre>${escapeHtml(readme.slice(0, 6_000))}</pre>`
    : "";
  return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(meta.owner)}/${escapeHtml(meta.repo)} · นำเข้าจาก GitHub</title>
<style>
:root{color-scheme:light}
body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;background:#f5f6f8;color:#161b22;line-height:1.7}
main{max-width:820px;margin:0 auto;padding:32px 20px 64px}
.badge{display:inline-block;font-size:12px;background:#e7edff;color:#2743a6;border-radius:999px;padding:3px 10px}
h1{font-size:clamp(24px,4vw,34px);margin:10px 0 4px;letter-spacing:-.5px}
p.lead{color:#5b6472;margin:0 0 20px}
ul{list-style:none;padding:0;margin:0;background:#fff;border:1px solid #e3e6ec;border-radius:12px;overflow:hidden}
li{display:flex;justify-content:space-between;gap:12px;padding:10px 14px;border-bottom:1px solid #f0f2f5;font-size:14px}
li:last-child{border-bottom:0}
li.dim{opacity:.65}
code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px;word-break:break-all}
li span{color:#7c8593;white-space:nowrap}
pre{background:#fff;border:1px solid #e3e6ec;border-radius:12px;padding:16px;overflow:auto;font-size:13px}
h2{font-size:18px;margin:28px 0 10px}
.note{margin-top:24px;font-size:13px;color:#5b6472}
</style>
</head>
<body>
<main>
  <span class="badge">นำเข้าจาก GitHub · ${escapeHtml(meta.ref)}${meta.subpath ? ` · ${escapeHtml(meta.subpath)}` : ""}</span>
  <h1>${escapeHtml(meta.owner)}/${escapeHtml(meta.repo)}</h1>
  <p class="lead">${escapeHtml(meta.description || "repo นี้ไม่มีไฟล์ HTML ที่รันได้ในพรีวิว จึงแสดงรายการไฟล์ที่นำเข้าแทน — ลองสั่ง AI ต่อได้เลย เช่น “สร้างหน้าเว็บจาก README นี้เป็นภาษาไทย”")}</p>
  <ul>
      ${rows || "<li><code>ไม่มีไฟล์</code><span></span></li>"}
  </ul>
  ${readmeBlock}
  <p class="note">ไฟล์ทั้งหมดอยู่ในแท็บ Code ของบิลเดอร์นี้ (จำกัด 400 KB/ไฟล์ · 800 KB/โปรเจกต์) รูปภาพและฟอนต์ถูกอ้างด้วย URL ของ GitHub แบบตรง จึงต้องต่ออินเทอร์เน็ตจึงจะแสดง</p>
</main>
</body>
</html>`;
}

/**
 * แปลง payload จาก route เป็นชุดไฟล์ที่บันทึกเป็นโปรเจกต์ได้
 * (ฟังก์ชันบริสุทธิ์ — ไม่แตะ localStorage/เครือข่าย จึงเทสต์ตรงได้)
 */
export function planImport(
  payload: RepoImportPayload,
  options: PlanOptions = {},
): ImportPlan {
  const maxFile = options.maxFileBytes ?? MAX_FILE_SIZE;
  const maxTotal = options.maxTotalBytes ?? MAX_TOTAL_SIZE;
  const meta = payload.meta;
  const warnings: string[] = [];
  const dropped: RepoImportNote[] = [];
  const droppedPaths = new Set<string>();
  const drop = (path: string, reason: string) => {
    if (droppedPaths.has(path)) return;
    droppedPaths.add(path);
    dropped.push({ path, reason });
  };

  const index = new Map<string, RepoImportFile>();
  for (const file of payload.files) {
    const path = normalizeRepoPath(file.path);
    if (!path) continue;
    if (file.text.length > maxFile) {
      drop(path, `ใหญ่เกิน ${Math.round(maxFile / 1000)} KB`);
      continue;
    }
    index.set(path, { path, size: file.size || file.text.length, text: file.text });
  }
  const assets = new Map<string, RepoImportAsset>();
  for (const asset of payload.assets) {
    const path = normalizeRepoPath(asset.path);
    if (path) assets.set(path, { ...asset, path });
  }
  for (const note of payload.skipped) drop(normalizeRepoPath(note.path) || note.path, note.reason);

  const entryPath = pickEntryPath([...index.keys()]);
  const rootPrefix = entryPath ? dirOf(entryPath) : "";
  const framework = isFrameworkProject(filesByPath(index));
  const { order, outside } = orderFiles(index, entryPath, rootPrefix, framework);

  const files: Record<string, string> = {};
  const kept: ImportedFile[] = [];
  let totalBytes = 0;
  /** กันที่ไว้ให้หน้ารายการไฟล์ที่อาจต้องสร้างขึ้นเอง (repo ไม่มี HTML) */
  const reserve = entryPath ? 0 : GENERATED_PAGE_RESERVE;
  const budget = Math.max(0, maxTotal - reserve);

  /**
   * เขียนพาธอ้างอิงของไฟล์ที่ไม่ถูกเก็บเข้าโปรเจกต์ (ไบนารี: รูป/ฟอนต์/สื่อ) ให้เป็น
   * URL ของ GitHub แทน — ส่วนไฟล์ที่เก็บไว้เป็นข้อความ (โค้ด/สไตล์/HTML) ต้องคงพาธ
   * เดิมไว้ เพราะเครื่องยนต์พรีวิวจะอินไลน์/คอมไพล์ให้เอง
   *
   * ต้องเรียกหลังรู้รายการไฟล์ที่เก็บแล้ว (keptPaths) จึงแยกเป็นสองรอบ
   */
  const assetRewrite = (
    repoPath: string,
    text: string,
    keptPaths: Set<string>,
  ): string => {
    const root = rootPrefix;
    const url = (path: string) => repoRawUrl(meta, path);
    let out = text;
    const literals = new Set(findReferences(text));
    for (const literal of literals) {
      const resolved = resolveRepoPath(repoPath, literal, root);
      if (!resolved) continue;
      if (keptPaths.has(resolved)) continue;
      if (!REWRITABLE_ASSET_RE.test(resolved)) continue;
      if (!assets.has(resolved) && !index.has(resolved)) continue;
      out = out.replace(new RegExp(escapeRegExp(literal), "g"), url(resolved));
    }
    return out;
  };

  /** repoPath → path ที่บันทึกในโปรเจกต์ (ใช้ตัดสินว่าอะไรถูกเก็บเป็นข้อความแล้ว) */
  const keptByRepo = new Map<string, string>();
  const pendingRewrite: { repoPath: string; keptPath: string }[] = [];

  for (const repoPath of order) {
    const file = index.get(repoPath);
    if (!file) continue;
    const keptPath = flatten(repoPath, rootPrefix);
    if (!keptPath || files[keptPath] !== undefined) continue;
    const size = file.text.length;
    if (size > maxFile) {
      drop(repoPath, `ใหญ่เกิน ${Math.round(maxFile / 1000)} KB`);
      continue;
    }
    if (totalBytes + size > budget) {
      drop(repoPath, "เกินเพดานรวม 800 KB ของโปรเจกต์");
      continue;
    }
    files[keptPath] = file.text;
    keptByRepo.set(repoPath, keptPath);
    if (REWRITABLE_TEXT_RE.test(repoPath)) pendingRewrite.push({ repoPath, keptPath });
    kept.push({ path: keptPath, size });
    totalBytes += size;
  }

  // รอบสอง: เขียนพาธของ asset ที่ไม่ได้ถูกเก็บ (ไบนารี) ให้ชี้ GitHub
  const keptRepoPaths = new Set(keptByRepo.keys());
  for (const item of pendingRewrite) {
    files[item.keptPath] = assetRewrite(
      item.repoPath,
      files[item.keptPath],
      keptRepoPaths,
    );
  }

  let entry = entryPath ? flatten(entryPath, rootPrefix) : "";
  if (!entry || files[entry] === undefined) {
    // กันพลาด: ถ้าไฟล์ที่เก็บไว้กินงบจนไม่มีที่ให้หน้ารายการ ให้ตัดไฟล์ท้ายสุดออกก่อน
    for (const file of [...kept].reverse()) {
      if (totalBytes + GENERATED_PAGE_RESERVE <= maxTotal) break;
      delete files[file.path];
      kept.splice(kept.indexOf(file), 1);
      totalBytes -= file.size;
      drop(file.path, "เกินเพดานรวม 800 KB ของโปรเจกต์");
    }
    const generated = listingPage(
      meta,
      kept,
      [...assets.values()],
      index.get("README.md")?.text ?? index.get("readme.md")?.text ?? null,
    );
    entry = "index.html";
    files[entry] = generated;
    totalBytes += generated.length;
    // ความปลอดภัยขั้นสุดท้าย: โปรเจกต์ต้องอยู่ในเพดานรวมเสมอ ไม่ให้ saveProject โยน error
    while (totalBytes > maxTotal && kept.length) {
      const file = kept.pop() as ImportedFile;
      if (file.path === entry) continue;
      delete files[file.path];
      totalBytes -= file.size;
      drop(file.path, "เกินเพดานรวม 800 KB ของโปรเจกต์");
    }
    warnings.push(
      entryPath
        ? "หน้าแรกของ repo ใหญ่เกินเพดาน จึงสร้างหน้ารายการไฟล์ให้แทน"
        : "repo นี้ไม่มี HTML จึงสร้างหน้ารายการไฟล์ (พร้อม README) ให้เป็นหน้าแรก",
    );
  }

  if (outside.length) {
    warnings.push(
      `มี ${outside.length} ไฟล์นอกโฟลเดอร์เว็บ (เช่น โค้ดต้นทางของเฟรมเวิร์ก) ไม่ได้นำเข้า`,
    );
  }
  if (framework) {
    warnings.push(
      "ตรวจพบว่าเป็นโปรเจกต์เฟรมเวิร์ก (React/Vue/Next…) — พรีวิวจะคอมไพล์และรันให้ในเบราว์เซอร์แบบ static",
    );
  }
  if (entryPath && depthOf(entryPath) >= 3) {
    warnings.push(
      `หน้าแรกอยู่ลึก (${entryPath}) — repo นี้อาจไม่ใช่เว็บสำเร็จรูป ลองระบุโฟลเดอร์ย่อยให้ตรงกับหน้าของเว็บ`,
    );
  }
  const budgetDropped = dropped.filter(
    (item) => item.reason.includes("800 KB") || item.reason.includes("400 KB"),
  ).length;
  if (budgetDropped) {
    warnings.push(
      `ตัด ${budgetDropped} ไฟล์เพราะเกินเพดานขนาดของบิลเดอร์ (400 KB/ไฟล์ · 800 KB/โปรเจกต์)`,
    );
  }
  // รูป/ฟอนต์/สื่อในโฟลเดอร์เว็บ: ไม่เก็บไฟล์แต่เขียน URL ของ GitHub ทับให้พรีวิวแสดงได้
  const inScope = rootPrefix
    ? [...assets.values()].filter((asset) => asset.path.startsWith(`${rootPrefix}/`))
    : [...assets.values()];
  warnings.push(...payload.notes);

  const name = (options.name || meta.repo).slice(0, 60);
  const keptKb = Math.max(1, Math.round(totalBytes / 1024));
  const summaryLines = [
    `- โคลน **${meta.owner}/${meta.repo}** (ref \`${meta.ref}\`) เข้ามาแล้ว **${kept.length} ไฟล์** ≈ ${keptKb} KB`,
    `- หน้าเริ่มต้น: \`${entry}\` · แก้ต่อได้ในแท็บ Code หรือสั่ง AI ปรับหน้าตา/เพิ่มฟีเจอร์ได้เลย`,
  ];
  if (inScope.length) {
    summaryLines.push(
      `- รูป/ฟอนต์/สื่อ ${inScope.length} ไฟล์ไม่อยู่ในโปรเจกต์ แต่ถูกอ้างด้วย URL ของ GitHub แบบตรง (ต้องต่ออินเทอร์เน็ต)`,
    );
  }
  if (budgetDropped) {
    summaryLines.push(`- ตัด ${budgetDropped} ไฟล์เพราะเกินเพดานขนาดของบิลเดอร์`);
  }
  if (warnings.length) {
    summaryLines.push(...warnings.map((text) => `- ${text}`));
  }

  return {
    files,
    entry,
    webRoot: rootPrefix,
    origin: {
      provider: "github",
      owner: meta.owner,
      repo: meta.repo,
      ref: meta.ref,
      subpath: meta.subpath || undefined,
      webRoot: rootPrefix || undefined,
    },
    name,
    summary: summaryLines.join("\n"),
    kept,
    dropped,
    warnings,
    totalBytes,
  };
}

// ── เรียก route ฝั่งเบราว์เซอร์ ─────────────────────────────────────────

export interface FetchImportOptions {
  /** เลือกเฉพาะโฟลเดอร์ย่อย (มาจาก URL /tree/<ref>/<path> หรือช่องกรอก) */
  subpath?: string;
  signal?: AbortSignal;
}

/**
 * ดึงรายการไฟล์ของ repo ผ่าน route ของเราเอง (เลี่ยงปัญหา CORS ของ codeload)
 * ขว้าง `GitHubImportError` พร้อมข้อความไทยที่เอาไปแสดงได้เลย
 */
export async function fetchRepoImport(
  input: string,
  options: FetchImportOptions = {},
): Promise<RepoImportPayload> {
  const ref = parseRepoRef(input);
  const params = new URLSearchParams({
    repo: `${ref.owner}/${ref.repo}`,
  });
  if (ref.ref) params.set("ref", ref.ref);
  const subpath = options.subpath ?? ref.subpath;
  if (subpath) params.set("subpath", subpath);
  const res = await fetch(`/api/github/import?${params.toString()}`, {
    signal: options.signal,
    headers: { accept: "application/json" },
  });
  let body: ApiEnvelope<RepoImportPayload> | null = null;
  try {
    body = (await res.json()) as ApiEnvelope<RepoImportPayload>;
  } catch {
    throw new GitHubImportError("เซิร์ฟเวอร์ตอบกลับไม่ใช่ JSON — ลองใหม่อีกครั้ง");
  }
  if (!res.ok || !body?.ok || !body.data) {
    throw new GitHubImportError(body?.error || `โคลนไม่สำเร็จ (HTTP ${res.status})`);
  }
  return body.data;
}
