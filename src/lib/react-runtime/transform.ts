/**
 * ═══ คอมไพล์โปรเจกต์ React/Vite/Next ให้รันในพรีวิว (ฝั่งเบราว์เซอร์) ═══════
 *
 * พรีวิวของบิลเดอร์เป็น `iframe srcDoc` ที่ไม่มี same-origin และ **ไม่มี Node.js
 * server** ดังนั้น React ที่นี่คือ React UMD (ไฟล์ที่ vendor ไว้ใน
 * `public/vendor/react/`) + บันเดิลที่ประกอบสด ๆ ในเบราว์เซอร์:
 *
 *   1. อ่าน `index.html` → เก็บ `<link rel=stylesheet>` เป็นสไตล์ และตัด
 *      `<script src>` ที่ชี้ไฟล์ในโปรเจกต์ออก (ไฟล์นั้นถูกคอมไพล์แทน)
 *   2. เดินกราฟการ import จากโมดูลตั้งต้น (`/src/main.tsx`, bundle ใน `dist/`, …)
 *   3. คอมไพล์ TS/TSX/JSX → CommonJS ด้วย Babel standalone (โหลดแบบ lazy เฉพาะ
 *      โปรเจกต์ที่ต้องใช้ จึงไม่ถ่วงหน้าอื่น) + เขียน URL ของรูป/ฟอนต์ให้ชี้ที่
 *      raw.githubusercontent.com ของ repo ต้นทาง
 *   4. คืนชุดโมดูลให้ `runner-source.ts` รันในเบราว์เซอร์ (ไม่มี network ฝั่งรัน)
 *
 * ไม่รองรับ (และจะบอกผู้ใช้ตรง ๆ ผ่าน console/banner): โมดูล npm ที่ไม่ได้ vendor,
 * SSR/API routes ของ Next, `import.meta.glob`, และ fetch ที่ออกเครือข่าย
 */

import type { ProjectOrigin } from "../builder";

export type PreviewEngine = "static" | "react";

/** แพ็กเกจ npm ที่ runner มีให้ใช้ (ที่เหลือ = missing แล้วรายงานผู้ใช้) */
export const PROVIDED_PACKAGES = [
  "react",
  "react-dom",
  "react-dom/client",
  "react-dom/server",
  "react/jsx-runtime",
  "react/jsx-dev-runtime",
  "react-router",
  "react-router-dom",
  "prop-types",
  "classnames",
  "clsx",
  "next",
  "next/link",
  "next/image",
  "next/head",
  "next/router",
  "next/navigation",
  "next/app",
  "next/document",
  "next/font/google",
  "next/font/local",
  "next-themes",
  "next-seo",
  "next-auth/react",
  "@vercel/analytics/react",
  "@vercel/speed-insights/next",
  "scheduler",
] as const;

const SOURCE_EXT = [".tsx", ".ts", ".jsx", ".js", ".mjs", ".cjs"];
const MODULE_EXT = [...SOURCE_EXT, ".json", ".css"];
const ASSET_EXT_RE =
  /\.(png|jpe?g|gif|webp|avif|ico|bmp|svg|mp4|webm|mov|mp3|wav|ogg|woff2?|ttf|otf|eot)$/i;
const JSX_IN_EXT = new Set([".js", ".jsx", ".tsx", ".mjs", ".cjs"]);

export interface RuntimeModule {
  path: string;
  code: string;
}

export interface RuntimeStyle {
  path: string;
  css: string;
}

export interface RuntimeBundle {
  entryHtml: string;
  entryModule: string | null;
  modules: RuntimeModule[];
  styles: RuntimeStyle[];
  missing: { specifier: string; from: string }[];
  errors: { path: string; message: string }[];
  warnings: string[];
  /** "self" = โมดูลตั้งต้น mount เอง, "synthetic" = runner สร้าง entry ให้ (Next) */
  mount: "self" | "synthetic";
}

// ── ตัวช่วยพาธ (ใช้ร่วมกับ lib/github-import) ────────────────────────────

function dirOf(path: string): string {
  const slash = path.lastIndexOf("/");
  return slash < 0 ? "" : path.slice(0, slash);
}

function extOf(path: string): string {
  const base = path.slice(path.lastIndexOf("/") + 1).toLowerCase();
  const dot = base.lastIndexOf(".");
  return dot <= 0 ? "" : base.slice(dot);
}

function baseName(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

/** รวมพาธและยุบ `..` (คืน "" เมื่อหลุดเหนือราก) */
function joinPath(baseDir: string, relative: string): string {
  const parts = baseDir ? baseDir.split("/").filter((part) => !!part && part !== ".") : [];
  for (const part of relative.split("/")) {
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

// ── JSON แบบมีคอมเมนต์ (tsconfig) ───────────────────────────────────────

/** อ่าน tsconfig.json ที่อาจมีคอมเมนต์/ลูกน้ำเกิน (JSONC) */
export function parseJsonc(text: string): Record<string, unknown> | null {
  let out = "";
  let inString = false;
  let inLine = false;
  let inBlock = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (inLine) {
      if (char === "\n") {
        inLine = false;
        out += char;
      }
      continue;
    }
    if (inBlock) {
      if (char === "*" && next === "/") {
        inBlock = false;
        i += 1;
      }
      continue;
    }
    if (inString) {
      out += char;
      if (char === "\\") {
        out += next ?? "";
        i += 1;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      out += char;
      continue;
    }
    if (char === "/" && next === "/") {
      inLine = true;
      i += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      inBlock = true;
      i += 1;
      continue;
    }
    out += char;
  }
  try {
    return JSON.parse(
      out.replace(/,\s*([}\]])/g, "$1").replace(/^\uFEFF/, ""),
    ) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** แปลง `compilerOptions.paths` ของ tsconfig เป็น alias แบบง่าย ๆ */
export function aliasesFromTsconfig(
  files: Record<string, string>,
): Record<string, string> {
  const aliases: Record<string, string> = { "@": "src", "~": "src" };
  const candidates = [
    "tsconfig.json",
    "tsconfig.app.json",
    "jsconfig.json",
    "tsconfig.base.json",
  ];
  for (const name of candidates) {
    const raw = files[name];
    if (!raw) continue;
    const parsed = parseJsonc(raw);
    const paths = (
      (parsed?.compilerOptions as { paths?: Record<string, string[]> } | undefined)
        ?.paths ?? {}
    ) as Record<string, string[]>;
    for (const [key, targets] of Object.entries(paths)) {
      const target = Array.isArray(targets) ? targets[0] : undefined;
      if (!target) continue;
      const alias = key.replace(/\/\*$/, "");
      const dir = target.replace(/\/\*$/, "").replace(/^\.\//, "");
      if (alias) aliases[alias] = dir;
    }
  }
  return aliases;
}

// ── ตัวจับคู่โมดูล ─────────────────────────────────────────────────────

/**
 * จับคู่สเปซิไฟเออร์ import กับไฟล์จริงในโปรเจกต์
 * ลองตามลำดับแบบ Vite: ไฟล์ตรงตัว → เติมนามสกุล → โฟลเดอร์/index
 */
export function createResolver(
  files: Record<string, string>,
  aliases: Record<string, string> = {},
): (specifier: string, importer: string) => string | null {
  const paths = new Set(Object.keys(files));
  const sortedAliases = Object.entries(aliases).sort(
    (a, b) => b[0].length - a[0].length,
  );

  const withExtension = (candidate: string): string | null => {
    const clean = candidate.split("?")[0].split("#")[0];
    if (!clean) return null;
    if (paths.has(clean) && extOf(clean) !== ".css") return clean;
    for (const ext of MODULE_EXT) {
      if (paths.has(clean + ext)) return clean + ext;
    }
    for (const ext of MODULE_EXT) {
      const index = `${clean}/index${ext}`;
      if (paths.has(index)) return index;
    }
    if (paths.has(clean)) return clean; // .css หรือไฟล์อื่นที่ตรงตัว
    return null;
  };

  return (specifier, importer) => {
    const raw = (specifier || "").trim();
    if (!raw) return null;
    if (/^(node:|https?:|data:|virtual:)/i.test(raw)) return null;
    // ?raw / ?url / ?inline ของ Vite — จับที่ไฟล์ต้นทางก่อน
    const query = /[?&](raw|url|inline|worker|module)\b/.test(raw) ? raw.split("?")[0] : null;

    if (raw.startsWith("/")) {
      return withExtension(raw.slice(1));
    }
    if (raw.startsWith(".")) {
      return withExtension(joinPath(dirOf(importer), raw));
    }
    for (const [alias, dir] of sortedAliases) {
      if (raw === alias || raw.startsWith(`${alias}/`)) {
        const rest = raw === alias ? "" : raw.slice(alias.length + 1);
        const hit = withExtension(joinPath(dir, rest));
        if (hit) return hit;
      }
    }
    if (query) return withExtension(query);
    return null; // แพ็กเกจ npm
  };
}

// ── อ่าน index.html ────────────────────────────────────────────────────

/**
 * จับคู่พาธที่อ้างใน HTML (`<script src>`, `<link href>`, `src` ของรูป)
 * ต่างจาก import ใน JS: ค่าแบบ `app.js` ไม่มี `./` นำหน้าแต่ก็เป็นไฟล์ในเครื่อง
 */
export function resolveHtmlReference(
  value: string,
  htmlPath: string,
  resolve: (specifier: string, importer: string) => string | null,
): string | null {
  const clean = (value || "").trim().split("?")[0].split("#")[0];
  if (!clean) return null;
  if (clean.startsWith("/")) return resolve(clean, htmlPath);
  const asRelative = resolve(clean.startsWith(".") ? clean : `./${clean}`, htmlPath);
  if (asRelative) return asRelative;
  return resolve(clean, htmlPath);
}

export interface HtmlAssets {
  scripts: string[];
  /** สคริปต์ที่ประกาศ `type="module"` (มี import/export ต้องผ่านตัวคอมไพล์) */
  moduleScripts: string[];
  styles: string[];
}

/** ดึง `<script src>` และ `<link rel=stylesheet href>` ที่ชี้ไฟล์ในโปรเจกต์ */
export function readHtmlAssets(
  html: string,
  resolve: (specifier: string) => string | null,
): HtmlAssets {
  const scripts: string[] = [];
  const moduleScripts: string[] = [];
  const styles: string[] = [];
  for (const tag of html.match(/<script\b[^>]*>/gi) ?? []) {
    if (/\btype\s*=\s*["']?(?:application\/(?:ld\+)?json|text\/template)/i.test(tag)) continue;
    const src = /src\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i.exec(tag);
    const value = (src?.[1] ?? src?.[2] ?? src?.[3] ?? "").trim();
    if (!value || /^(https?:|\/\/|data:)/i.test(value)) continue;
    const hit = resolve(value);
    if (!hit) continue;
    scripts.push(hit);
    if (/\btype\s*=\s*["']?module/i.test(tag)) moduleScripts.push(hit);
  }
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    if (!/rel\s*=\s*["']?stylesheet/i.test(tag)) continue;
    const href = /href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i.exec(tag);
    const value = (href?.[1] ?? href?.[2] ?? href?.[3] ?? "").trim();
    if (!value || /^(https?:|\/\/|data:)/i.test(value)) continue;
    const hit = resolve(value);
    if (hit && extOf(hit) === ".css") styles.push(hit);
  }
  return { scripts, moduleScripts, styles };
}

/** ตรวจว่าโปรเจกต์นี้ควรใช้ engine ไหน (คำนวณจากไฟล์ล้วน ๆ) */
export function detectPreviewEngine(files: Record<string, string>): PreviewEngine {
  const has = (path: string) => files[path] !== undefined;
  const htmlPath = has("index.html")
    ? "index.html"
    : Object.keys(files).find((path) => extOf(path) === ".html");
  if (htmlPath) {
    const resolve = createResolver(files, aliasesFromTsconfig(files));
    const { scripts, moduleScripts } = readHtmlAssets(files[htmlPath], (spec) =>
      resolveHtmlReference(spec, htmlPath, resolve),
    );
    // JSX/TS หรือ ES module ต้องผ่านตัวคอมไพล์ — ส่วนเว็บ HTML+JS คลาสสิก
    // (เช่น ธีม Bootstrap ทั่วไป) ใช้เส้นทาง static เดิมที่อินไลน์สคริปต์ให้อยู่แล้ว
    const needsCompile =
      moduleScripts.length > 0 || scripts.some((path) => /\.(jsx|tsx|ts)$/.test(path));
    if (scripts.length && needsCompile) return "react";
  }
  const pkg = files["package.json"] ? parseJsonc(files["package.json"]) : null;
  const deps = {
    ...((pkg?.dependencies as Record<string, string>) ?? {}),
    ...((pkg?.devDependencies as Record<string, string>) ?? {}),
  } as Record<string, string>;
  if (deps.react || deps["react-dom"] || deps.next || deps.vite) {
    const paths = Object.keys(files);
    const looksLikeApp =
      has("src/main.tsx") || has("src/main.jsx") || has("src/main.js") ||
      has("src/App.jsx") || has("src/App.tsx") || has("src/index.js") ||
      // หน้า/เลย์เอาต์แบบ Next (รองรับทั้ง pages/ และ app/ ที่อยู่ใต้ src/)
      paths.some((path) =>
        /^(src\/)?(pages|app)\/(?:_app|_document|_error|layout|page)\.[cm]?[jt]sx?$/.test(path),
      ) ||
      paths.some((path) => /^(src\/)?(pages|app)\/.+\.(t|j)sx?$/.test(path));
    if (looksLikeApp) return "react";
  }
  return "static";
}

// ── URL ของไฟล์ภายนอก (รูป/ฟอนต์) ─────────────────────────────────────

/**
 * สร้าง URL ของรูป/ฟอนต์/สื่อที่อ้างในโปรเจกต์ให้ชี้ไฟล์จริงบน GitHub
 * (พรีวิวเก็บเฉพาะไฟล์ข้อความ จึงต้องโหลดไฟล์ไบนารีจาก repo ต้นทาง)
 */
export function createAssetUrlBuilder(
  origin?: ProjectOrigin,
): (literal: string, modulePath: string) => string | null {
  if (!origin) return () => null;
  const root = origin.webRoot ? `${origin.webRoot}/` : "";
  const ref = encodeURIComponent(origin.ref);
  return (literal, modulePath) => {
    const clean = (literal || "").split("?")[0].split("#")[0];
    if (!clean || !ASSET_EXT_RE.test(clean)) return null;
    if (/^(https?:|data:|blob:|\/\/)/i.test(clean)) return null;
    const repoPath = clean.startsWith("/")
      ? `${root}${clean.replace(/^\/+/, "")}`
      : `${root}${joinPath(dirOf(modulePath), clean)}`;
    if (!repoPath || repoPath.includes("..")) return null;
    const url =
      `https://raw.githubusercontent.com/${origin.owner}/${origin.repo}/${ref}/` +
      repoPath.split("/").map(encodeURIComponent).join("/");
    return url + (literal.length > clean.length ? literal.slice(clean.length) : "");
  };
}

/** เขียน URL ของ asset ใน CSS (`url(...)` และ `@import`) */
export function rewriteCssAssets(
  css: string,
  modulePath: string,
  build: (literal: string, modulePath: string) => string | null,
): string {
  return css.replace(
    /url\(\s*(?:"([^"]+)"|'([^']+)'|([^)'"\s]+))\s*\)|@import\s+(?:"([^"]+)"|'([^']+)')/gi,
    (match, a: string, b: string, c: string, d: string, e: string) => {
      const literal = a ?? b ?? c ?? d ?? e ?? "";
      const url = build(literal, modulePath);
      if (!url) return match;
      return match.trimStart().toLowerCase().startsWith("@import")
        ? `@import "${url}"`
        : `url("${url}")`;
    },
  );
}

/** เขียน URL ของ asset ที่อ้างใน HTML (src/href/poster) ให้ชี้ไฟล์บน GitHub */
export function rewriteHtmlAssets(
  html: string,
  modulePath: string,
  build: (literal: string, modulePath: string) => string | null,
): string {
  return html.replace(
    /\b(src|href|poster|data-src)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi,
    (match, attribute: string, double: string, single: string) => {
      const literal = double ?? single ?? "";
      const url = build(literal, modulePath);
      if (!url || url === literal) return match;
      return `${attribute}="${url}"`;
    },
  );
}

/**
 * ไฟล์ asset (svg/รูป/ฟอนต์) ที่ถูก import → โมดูลที่คืน URL ของไฟล์
 * (bundler จริงก็ทำแบบนี้: `import logo from "./logo.svg"` ได้ URL เป็นสตริง)
 */
export function assetModuleCode(
  path: string,
  build: (literal: string, modulePath: string) => string | null,
): string {
  // ส่งพาธเต็มพร้อม importer ว่าง เพื่อให้ build() ใช้พาธนั้นตรง ๆ
  const url = build(path.startsWith("/") ? path.slice(1) : path, "") ?? "";
  return `module.exports = ${JSON.stringify(url)};`;
}

/** นามสกุลที่เป็น asset (ใช้ตัดสินว่าไม่ต้องคอมไพล์ด้วย Babel) */
export function isAssetPath(path: string): boolean {
  return ASSET_EXT_RE.test(path);
}

// ── คอมไพล์ ─
// ── คอมไพล์ ────────────────────────────────────────────────────────────

type BabelApi = {
  types: {
    identifier: (name: string) => unknown;
    memberExpression: (object: unknown, property: unknown) => unknown;
    callExpression: (callee: unknown, args: unknown[]) => unknown;
    stringLiteral: (value: string) => unknown;
    objectExpression: (props: unknown[]) => unknown;
  };
  assertVersion?: (version: string) => void;
};

interface BabelLike {
  transform: (
    code: string,
    options: Record<string, unknown>,
  ) => { code: string | null; metadata?: BabelMetadata };
  availablePresets: Record<string, unknown>;
  availablePlugins: Record<string, unknown>;
}

interface BabelMetadata {
  gupan?: {
    /** พาธโมดูลในโปรเจกต์ที่ถูกเขียนทับแล้ว (ต้องคอมไพล์ต่อ) */
    locals: string[];
    /** แพ็กเกจ npm ที่ถูกอ้างถึง */
    packages: string[];
    /** ข้อความปัญหาเฉพาะไฟล์นี้ */
    errors: string[];
  };
}

type BabelPath = {
  node: { type: string; source?: { value: string } | null };
  get: (key: string) => BabelPath;
  isMetaProperty?: () => boolean;
  isMemberExpression?: () => boolean;
  isCallExpression?: () => boolean;
  isImport?: () => boolean;
  isStringLiteral?: () => boolean;
  replaceWith?: (node: unknown) => void;
};

let babelPromise: Promise<BabelLike> | null = null;

/**
 * โหลด Babel แบบ lazy — โปรเจกต์ static (HTML ล้วน) ไม่ต้องแบกน้ำหนักนี้เลย
 * ตัว bundle จะถูกแยกเป็น chunk ของหน้าเวิร์กสเปซเอง
 */
export async function loadBabel(): Promise<BabelLike> {
  if (!babelPromise) {
    babelPromise = import("@babel/standalone").then((mod) => {
      const api = ((mod as unknown as { default?: BabelLike }).default ??
        (mod as unknown as BabelLike)) as BabelLike;
      return api;
    });
  }
  return babelPromise;
}

/** สเปซิไฟเออร์ที่ชี้ไฟล์ในโปรเจกต์ (ไม่ใช่แพ็กเกจ npm) */
function isLocalSpecifier(spec: string): boolean {
  return (
    spec.startsWith(".") ||
    spec.startsWith("/") ||
    spec.startsWith("@/") ||
    spec.startsWith("~/")
  );
}

/**
 * plugin ของเรา — ทำสามอย่างในรอบเดียว:
 *  1. เขียนสเปซิไฟเออร์ import/require ที่ชี้ไฟล์ในโปรเจกต์ให้เป็นพาธจริง
 *     (`@/components/Header` → `src/components/Header.tsx`) เพื่อให้ runner
 *     แค่ `require()` ตรง ๆ ไม่ต้องเดา alias อีก
 *  2. เก็บ dependency ที่ค้นพบลง metadata ให้ตัวเดินกราฟ
 *  3. แทนที่ `import.meta.*` (syntax error นอกโมดูล) และ `import()` ด้วย
 *     ตัวช่วยของ runner
 */
function gupanPlugin(
  api: BabelApi,
  options: {
    resolve?: (specifier: string, importer: string) => string | null;
    assetUrl?: (literal: string, modulePath: string) => string | null;
    /** พาธของโมดูลนี้ในโปรเจกต์ (Babel เปลี่ยน filename เป็น absolute เอง) */
    path?: string;
  },
) {
  const t = api.types;
  const from = options.path ?? "";
  const state = (file: { metadata: BabelMetadata }) => {
    file.metadata.gupan ??= { locals: [], packages: [], errors: [] };
    return file.metadata.gupan;
  };
  const isImportMeta = (path: BabelPath | undefined | null): boolean => {
    if (!path || !path.isMetaProperty || !path.isMetaProperty()) return false;
    const node = path.node as unknown as {
      meta?: { name: string };
      property?: { name: string };
    };
    return node.meta?.name === "import" && node.property?.name === "meta";
  };

  /** เขียน source ของ import/export ให้เป็นพาธจริง (คืนค่าเมื่อไม่ใช่ไฟล์ในโปรเจกต์) */
  const rewriteSource = (
    node: { source?: { value?: string } | null },
    from: string,
    meta: { locals: string[]; packages: string[]; errors: string[] },
  ): void => {
    const spec = node.source?.value;
    if (typeof spec !== "string" || !node.source) return;
    const hit = options.resolve?.(spec, from) ?? null;
    if (hit) {
      node.source.value = hit;
      meta.locals.push(hit);
      return;
    }
    if (isLocalSpecifier(spec)) {
      meta.errors.push(`ไม่พบไฟล์ที่นำเข้า: "${spec}" (จาก ${from})`);
      return;
    }
    meta.packages.push(spec);
  };

  /** สตริงนี้เป็นสเปซิไฟเออร์ของ import/require หรือไม่ (ห้ามเขียนทับ) */
  const isModuleSpecifier = (path: BabelPath): boolean => {
    const parent = (path as unknown as { parent?: { type: string; callee?: { type: string; name?: string } } })
      .parent;
    if (!parent) return false;
    if (
      parent.type === "ImportDeclaration" ||
      parent.type === "ExportNamedDeclaration" ||
      parent.type === "ExportAllDeclaration"
    ) {
      return true;
    }
    if (parent.type === "CallExpression") {
      const callee = parent.callee;
      if (!callee) return false;
      if (callee.type === "Import") return true;
      if (callee.type === "Identifier" && callee.name === "require") return true;
    }
    return false;
  };

  return {
    visitor: {
      StringLiteral(
        path: { node: { value?: string; extra?: unknown }; parent?: unknown; replaceWith?: (node: unknown) => void },
        fileState: { file: { metadata: BabelMetadata }; filename?: string },
      ) {
        if (!options.assetUrl) return;
        if (typeof path.node.value !== "string") return;
        if (isModuleSpecifier(path as unknown as BabelPath)) return;
        const url = options.assetUrl(path.node.value, from);
        if (!url || url === path.node.value) return;
        path.node.value = url;
        // ล้าง raw เดิม เพื่อให้ code generator พิมพ์ค่าที่เขียนทับแล้ว
        path.node.extra = undefined;
      },
      ImportDeclaration(path: BabelPath, fileState: { file: { metadata: BabelMetadata } }) {
        rewriteSource(path.node, from, state(fileState.file));
      },
      ExportNamedDeclaration(path: BabelPath, fileState: { file: { metadata: BabelMetadata } }) {
        rewriteSource(path.node, from, state(fileState.file));
      },
      ExportAllDeclaration(path: BabelPath, fileState: { file: { metadata: BabelMetadata } }) {
        rewriteSource(path.node, from, state(fileState.file));
      },
      CallExpression(path: BabelPath, fileState: { file: { metadata: BabelMetadata } }) {
        const callee = path.get("callee");
        const meta = state(fileState.file);
        if (callee.isImport && callee.isImport()) {
          const args = (path.node as unknown as { arguments?: BabelPath[] }).arguments ?? [];
          const first = args[0];
          const value =
            first && first.node && (first.node as { value?: string }).value;
          if (typeof value === "string" && path.replaceWith) {
            const hit = options.resolve?.(value, from) ?? null;
            if (hit) {
              meta.locals.push(hit);
              path.replaceWith(
                t.callExpression(t.identifier("__gupanImport"), [
                  t.stringLiteral(hit),
                ]),
              );
              return;
            }
            path.replaceWith(
              t.callExpression(t.identifier("__gupanImport"), [
                t.stringLiteral(value),
              ]),
            );
          }
          return;
        }
        if (callee.isMemberExpression && callee.isMemberExpression()) {
          const object = callee.get("object");
          const property = callee.get("property");
          const name = (property.node as unknown as { name?: string }).name;
          if (isImportMeta(object) && (name === "glob" || name === "globEager")) {
            meta.errors.push(
              "import.meta.glob ใช้ในพรีวิวไม่ได้ (ต้องมี bundler ของจริง)",
            );
            if (path.replaceWith) path.replaceWith(t.objectExpression([]));
            return;
          }
        }
        if ((callee.node as unknown as { name?: string }).name === "require") {
          const args = (path.node as unknown as { arguments?: BabelPath[] }).arguments ?? [];
          const first = args[0];
          const value = first?.node ? (first.node as { value?: string }).value : undefined;
          if (typeof value === "string") {
            const hit = options.resolve?.(value, from) ?? null;
            if (hit) {
              meta.locals.push(hit);
              if (first.replaceWith) first.replaceWith(t.stringLiteral(hit));
            } else if (isLocalSpecifier(value)) {
              meta.errors.push(`ไม่พบไฟล์ที่ require: "${value}" (จาก ${from})`);
            } else {
              meta.packages.push(value);
            }
          }
        }
      },
      MemberExpression(path: BabelPath, fileState: { file: { metadata: BabelMetadata } }) {
        const object = path.get("object");
        const property = path.get("property");
        const name = (property.node as unknown as { name?: string }).name;
        const meta = state(fileState.file);
        if (!isImportMeta(object)) {
          // import.meta.env.X — node นอกสุดจัดการ import.meta.env ไปแล้ว
          if (
            object.isMemberExpression &&
            object.isMemberExpression() &&
            isImportMeta(object.get("object")) &&
            (object.get("property").node as unknown as { name?: string }).name === "env"
          ) {
            if (name === "env") return;
            path.replaceWith?.(
              t.memberExpression(t.identifier("__gupanEnv"), t.identifier(String(name))),
            );
            return;
          }
          return;
        }
        if (name === "env") {
          path.replaceWith?.(t.identifier("__gupanEnv"));
          return;
        }
        if (name === "url") {
          path.replaceWith?.(t.identifier("__gupanUrl"));
          return;
        }
        meta.errors.push(`import.meta.${String(name)} ใช้ในพรีวิวไม่ได้`);
        path.replaceWith?.(t.identifier("__gupanImportMeta"));
      },
    },
  };
}

const ENV_SOURCE = {
  MODE: "production",
  DEV: false,
  PROD: true,
  BASE_URL: "/",
  SSR: false,
};

export interface CompileInput {
  files: Record<string, string>;
  /** หน้าที่ใช้เป็นเปลือกเอกสาร (ค่าเริ่มต้น index.html) */
  htmlPath?: string;
  origin?: ProjectOrigin;
  maxModules?: number;
}

interface CompileContext {
  files: Record<string, string>;
  resolve: (specifier: string, importer: string) => string | null;
  assetUrl: (literal: string, modulePath: string) => string | null;
  babel: BabelLike;
  modules: Map<string, string>;
  styles: Map<string, string>;
  deps: Set<string>;
  /** โมดูลที่ถูกค้นพบระหว่างคอมไพล์รอบนี้ (ต้องเข้าคิว) */
  found: Set<string>;
  missing: Map<string, string>;
  errors: { path: string; message: string }[];
  warnings: string[];
  maxModules: number;
}

const EMPTY_MODULE = `/* ไม่มีโค้ด: โมดูลนี้ถูกตัดออกเพราะคอมไพล์ไม่ผ่าน */`;

/** คอมไพล์ไฟล์เดียวเป็น CommonJS (คืน null เมื่อล้มเหลว) */
function compileFile(
  ctx: CompileContext,
  path: string,
  code: string,
): string | null {
  const ext = extOf(path);
  const isTs = ext === ".ts" || ext === ".tsx";
  try {
    const result = ctx.babel.transform(code, {
      filename: path,
      sourceType: "unambiguous",
      compact: false,
      comments: false,
      configFile: false,
      babelrc: false,
      presets: [
        [ctx.babel.availablePresets.react, { runtime: "automatic" }],
        [
          ctx.babel.availablePresets.typescript,
          { isTSX: ext !== ".ts", allExtensions: true },
        ],
      ],
      plugins: [
        [
          gupanPlugin,
          { resolve: ctx.resolve, assetUrl: ctx.assetUrl, path },
        ],
        [
          ctx.babel.availablePlugins["transform-modules-commonjs"],
          { strict: false, loose: true, allowTopLevelThis: true },
        ],
      ],
    });
    const meta = result.metadata?.gupan ?? { locals: [], packages: [], errors: [] };
    for (const local of meta.locals) {
      ctx.deps.add(local);
      ctx.found.add(local); // ต้องคอมไพล์ต่อ
    }
    for (const pkg of meta.packages) {
      ctx.deps.add(pkg);
      if (!isProvided(pkg) && !ctx.missing.has(pkg)) ctx.missing.set(pkg, path);
    }
    for (const message of meta.errors) {
      ctx.errors.push({ path, message });
    }
    if (!isTs && !JSX_IN_EXT.has(ext) && ext !== "") {
      ctx.warnings.push(`${path}: ตรวจเฉพาะไฟล์นามสกุลที่รองรับ`);
    }
    return result.code ?? "";
  } catch (error) {
    ctx.errors.push({
      path,
      message: error instanceof Error ? error.message.split("\n")[0] : String(error),
    });
    return null;
  }
}

/** แพ็กเกจ npm ที่ runner เตรียมไว้ให้ (ไม่ต้องรายงานว่าขาด) */
export function isProvided(specifier: string): boolean {
  const name = specifier.startsWith("@")
    ? specifier.split("/").slice(0, 2).join("/")
    : specifier.split("/")[0];
  if (name === "react" || name === "react-dom" || name === "scheduler") return true;
  return (PROVIDED_PACKAGES as readonly string[]).includes(specifier) ||
    (PROVIDED_PACKAGES as readonly string[]).includes(name);
}

/** โมดูล JSON → CJS หนึ่งบรรทัด */
function jsonModule(code: string): string | null {
  try {
    const value = JSON.parse(code);
    return `module.exports = ${JSON.stringify(value)};`;
  } catch {
    return null;
  }
}

/**
 * เดินกราฟและคอมไพล์ทั้งหมด — คืนบันเดิลที่ runner รันได้ทันที
 */
export async function compileReactProject(input: CompileInput): Promise<RuntimeBundle> {
  const files = input.files;
  const htmlPath =
    input.htmlPath && files[input.htmlPath] !== undefined
      ? input.htmlPath
      : files["index.html"] !== undefined
        ? "index.html"
        : Object.keys(files).find((path) => extOf(path) === ".html");
  const warnings: string[] = [];
  const errors: { path: string; message: string }[] = [];
  const missing = new Map<string, string>();
  const babel = await loadBabel();
  const resolve = createResolver(files, aliasesFromTsconfig(files));
  const assetUrl = createAssetUrlBuilder(input.origin);
  const rewriteAssets = (text: string, modulePath: string) =>
    rewriteCssAssets(text, modulePath, assetUrl);

  const ctx: CompileContext = {
    files,
    resolve,
    assetUrl,
    babel,
    modules: new Map(),
    styles: new Map(),
    deps: new Set(),
    found: new Set(),
    missing,
    errors,
    warnings,
    maxModules: input.maxModules ?? 400,
  };

  // ── 1) เปลือกเอกสาร + สไตล์/สคริปต์ที่อ้างจาก HTML ─────────────────────
  const rawHtml = htmlPath ? files[htmlPath] ?? "" : "";
  const htmlDir = htmlPath ? dirOf(htmlPath) : "";
  const fromHtml = readHtmlAssets(rawHtml, (spec) =>
    resolveHtmlReference(spec, htmlPath ?? "index.html", resolve),
  );
  const htmlStyles: string[] = [];
  for (const stylePath of fromHtml.styles) {
    const css = files[stylePath];
    if (css !== undefined && !ctx.styles.has(stylePath)) {
      ctx.styles.set(stylePath, rewriteAssets(css, stylePath));
      htmlStyles.push(stylePath);
    }
  }

  // ── 2) โมดูลตั้งต้น ───────────────────────────────────────────────────
  const entryScripts = [...new Set(fromHtml.scripts)];
  // มี <script src> ในเครื่องแล้ว = ใช้ตัวนั้นเป็น entry เสมอ (Vite/HTML) —
  // synthetic entry ของ Next ใช้เฉพาะโปรเจกต์ที่ไม่มี HTML ให้ mount เอง
  const nextPage = entryScripts.length ? null : pickNextPage(files);
  // ไม่มี <script> ใน HTML และไม่ใช่ Next: ใช้ไฟล์ main/index ที่รันตัวเองได้
  // (แบบ create-react-app) แทนการปล่อยให้พรีวิวว่างเปล่า
  const clientEntry =
    entryScripts.length || nextPage ? null : pickClientEntry(files);
  let mount: RuntimeBundle["mount"] = entryScripts.length ? "self" : "synthetic";
  let entryModule: string | null = entryScripts[0] ?? null;
  if (clientEntry) {
    mount = "self";
    entryModule = clientEntry;
    warnings.push(
      `หน้า HTML ไม่ได้อ้างสคริปต์ — ใช้ ${clientEntry} เป็นโมดูลตั้งต้นให้`,
    );
  }

  /** รายการโมดูลตั้งต้นที่ต้องคอมไพล์ (entry จาก HTML + หน้าแรก/เลย์เอาต์ของ Next) */
  const queue: string[] = [...entryScripts];
  if (nextPage) {
    // Next: ไม่มี <script src> ใน repo — ประกอบ entry เองแล้ว mount หน้าแรก
    const synthetic = "__gupan_next_entry.js";
    const nextDeps = collectNextDeps(files, nextPage).filter(
      (dep) => files[dep] !== undefined || ctx.modules.has(dep),
    );
    const layout = nextDeps.find((dep) => /(^|\/)(_(app|document)|layout)\.[cm]?[jt]sx?$/.test(dep)) ?? null;
    const code = buildNextEntry(nextPage, layout);
    ctx.modules.set(synthetic, code);
    entryModule = synthetic;
    mount = "synthetic";
    for (const dep of nextDeps) {
      if (files[dep] !== undefined) queue.push(dep);
    }
    // สไตล์โกลบอลของ Next
    for (const candidate of [
      "app/globals.css",
      "styles/globals.css",
      "src/app/globals.css",
      "pages/globals.css",
      "styles/globals.scss",
    ]) {
      const css = files[candidate];
      if (css !== undefined && !ctx.styles.has(candidate) && extOf(candidate) === ".css") {
        ctx.styles.set(candidate, rewriteAssets(css, candidate));
        htmlStyles.push(candidate);
      }
    }
  }

  // ── 3) เดินกราฟ dependency แล้วคอมไพล์ ────────────────────────────────
  const compiled = new Set<string>();
  const pending: string[] = [];
  const enqueue = (path: string) => {
    if (!path || compiled.has(path) || pending.includes(path)) return;
    if (ctx.modules.get(path) === path || files[path] !== undefined) pending.push(path);
  };
  for (const item of queue) enqueue(item);
  if (clientEntry) enqueue(clientEntry);
  if (nextPage) enqueue(nextPage);
  if (entryModule) enqueue(entryModule);

  while (pending.length) {
    const path = pending.shift() as string;
    if (compiled.has(path)) continue;
    if (compiled.size >= ctx.maxModules) {
      warnings.push(`มีโมดูลเกิน ${ctx.maxModules} ไฟล์ จึงหยุดคอมไพล์เท่านี้`);
      break;
    }
    const ext = extOf(path);
    const source = files[path];

    // โมดูลที่ runner สร้างเอง (synthetic entry ของ Next) — โค้ดถูกใส่ไว้แล้ว
    if (source === undefined) {
      compiled.add(path);
      continue;
    }
    if (ext === ".css") {
      if (!ctx.styles.has(path)) ctx.styles.set(path, rewriteAssets(source, path));
      compiled.add(path);
      continue;
    }
    if (isAssetPath(path)) {
      // import รูป/ฟอนต์ → โมดูลที่คืน URL ของไฟล์บน GitHub (เหมือน bundler ทั่วไป)
      ctx.modules.set(path, assetModuleCode(path, ctx.assetUrl));
      compiled.add(path);
      continue;
    }
    if (ext === ".json") {
      const code = jsonModule(source);
      if (code === null) {
        ctx.errors.push({ path, message: "JSON ไม่ถูกต้อง" });
        ctx.modules.set(path, EMPTY_MODULE);
      } else {
        ctx.modules.set(path, code);
      }
      compiled.add(path);
      continue;
    }

    ctx.found = new Set();
    const code = compileFile(ctx, path, source);
    ctx.modules.set(path, code ?? EMPTY_MODULE);
    compiled.add(path);
    for (const found of ctx.found) enqueue(found);
  }

  // ── 4) เปลือกเอกสารที่ตัดสคริปต์/สไตล์ในเครื่องออก ──────────────────────
  const entryHtml = buildShellHtml(rawHtml, {
    files,
    htmlPath,
    resolve,
    assetUrl,
    keepStyles: (path) => htmlStyles.includes(path),
    synthetic: mount === "synthetic",
  });

  const modules: RuntimeModule[] = [...ctx.modules.entries()].map(([path, code]) => ({
    path,
    code,
  }));
  const styles: RuntimeStyle[] = [...ctx.styles.entries()].map(([path, css]) => ({
    path,
    css,
  }));

  if (!entryModule) {
    errors.push({
      path: htmlPath ?? "index.html",
      message:
        "หาไฟล์ตั้งต้นของแอปไม่เจอ — หน้า HTML ไม่มี <script src> และไม่พบไฟล์ src/main.* หรือ src/index.* ในโปรเจกต์",
    });
  }

  return {
    entryHtml,
    entryModule,
    modules,
    styles,
    missing: [...missing.entries()].map(([specifier, from]) => ({ specifier, from })),
    errors,
    warnings,
    mount,
  };
}

// ── Next.js (แบบจำกัด) ────────────────────────────────────────────────

/** หน้าที่จะ mount: pages/index.* → app/page.* → หน้าอื่นที่ตื้นที่สุด */
/**
 * ไฟล์ตั้งต้นที่ "รันตัวเองได้" — โปรเจกต์อย่าง create-react-app ไม่มี `<script>`
 * ใน `public/index.html` เลย (react-scripts ฉีดให้ตอน build) แต่ `src/index.js`
 * เรียก `createRoot(...).render(...)` เองอยู่แล้ว จึงใช้ไฟล์นั้นเป็น entry ได้
 */
export function pickClientEntry(files: Record<string, string>): string | null {
  const candidates = [
    "src/main.tsx", "src/main.jsx", "src/main.ts", "src/main.js",
    "src/index.tsx", "src/index.jsx", "src/index.ts", "src/index.js",
    "src/app.tsx", "src/app.jsx", "src/app.ts", "src/app.js",
    "src/App.tsx", "src/App.jsx", "src/App.ts", "src/App.js",
    "index.tsx", "index.jsx", "index.ts", "index.js",
    "main.tsx", "main.jsx", "main.js",
  ];
  return candidates.find((path) => files[path] !== undefined) ?? null;
}

/**
 * โปรเจกต์นี้เป็น Next.js จริงไหม — ดูจาก dependency `next` หรือไฟล์ที่เป็นเอกลักษณ์
 * ของ Next (`pages/_app`, `app/layout`, `next.config`) เพราะโปรเจกต์ Vite บางตัวก็มี
 * โฟลเดอร์ `src/pages` ที่ไม่ใช่ระบบเราเตอร์ของ Next
 */
export function isNextProject(files: Record<string, string>): boolean {
  const pkg = files["package.json"] ? parseJsonc(files["package.json"]) : null;
  const deps = {
    ...((pkg?.dependencies as Record<string, string>) ?? {}),
    ...((pkg?.devDependencies as Record<string, string>) ?? {}),
  } as Record<string, string>;
  if (deps.next) return true;
  return Object.keys(files).some((path) =>
    /(^|\/)(pages\/_(app|document)\.[cm]?[jt]sx?|app\/layout\.[cm]?[jt]sx?|next\.config\.[cm]?[jt]s)$/.test(
      path,
    ),
  );
}

export function pickNextPage(files: Record<string, string>): string | null {
  if (!isNextProject(files)) return null;
  const sorted = Object.keys(files)
    .filter((path) => /\.(t|j)sx?$/.test(path))
    .sort((a, b) => a.split("/").length - b.split("/").length || a.localeCompare(b));
  const find = (test: (path: string) => boolean) => sorted.find(test) ?? null;
  return (
    find((path) => /^(src\/)?pages\/index\.(t|j)sx?$/.test(path)) ||
    find((path) => /^(src\/)?app\/page\.(t|j)sx?$/.test(path)) ||
    find((path) => /^(src\/)?pages\/(?!_app|_document|_error).+\.(t|j)sx?$/.test(path)) ||
    find((path) => /^(src\/)?app\/.+\/page\.(t|j)sx?$/.test(path))
  );
}

/**
 * ไฟล์ที่ synthetic entry ต้องใช้ — หน้าแรก + เลย์เอาต์/_app ที่อยู่ใกล้ที่สุด
 * (รองรับทั้ง `pages/_app` แบบเดิมและ `app/layout` ที่อยู่ใน `src/` หรือซ้อนหลายชั้น)
 */
export function collectNextDeps(
  files: Record<string, string>,
  page: string,
): string[] {
  const deps: string[] = [page];
  const dirs: string[] = [];
  let dir = dirOf(page);
  while (true) {
    dirs.push(dir);
    if (!dir) break;
    const parent = dirOf(dir);
    if (parent === dir) break;
    dir = parent;
  }
  for (const base of dirs) {
    for (const name of ["layout", "_app"]) {
      for (const ext of ["tsx", "jsx", "ts", "js"]) {
        const candidate = base ? `${base}/${name}.${ext}` : `${name}.${ext}`;
        if (files[candidate] !== undefined && !deps.includes(candidate)) deps.push(candidate);
      }
    }
  }
  return deps;
}

/** โค้ด entry สำหรับโปรเจกต์ Next (mount แทน `next dev`) */
function buildNextEntry(page: string, layout?: string | null): string {
  // app router: layout รับ children — ส่วน pages router: _app รับ { Component, pageProps }
  const appRouter = !!layout && /(^|\/)layout\.[cm]?[jt]sx?$/.test(layout);
  const wrap = appRouter
    ? "React.createElement(App, null, React.createElement(Page, {}))"
    : "React.createElement(App, { Component: Page, pageProps: {} })";
  return `/* สร้างโดย GUPAN Studio — mount หน้าแรกของ Next แบบ client-only */
"use strict";
var React = require("react");
var client = require("react-dom/client");
var pageMod = require(${JSON.stringify(`./${page}`)});
var Page = pageMod && (pageMod.default || pageMod);
var App = null;
${
  layout
    ? `try { var m = require(${JSON.stringify(`./${layout}`)}); App = m && (m.default || m); } catch (e) {}`
    : "/* รีโปนี้ไม่มี _app/layout — mount หน้าแรกตรง ๆ */"
}
var element = App
  ? ${wrap}
  : React.createElement(Page, {});
var rootId = "root";
var container = document.getElementById(rootId);
if (!container) {
  container = document.createElement("div");
  container.id = rootId;
  document.body.appendChild(container);
}
client.createRoot(container).render(element);
`;
}

// ── เปลือกเอกสาร ──────────────────────────────────────────────────────

interface ShellOptions {
  files: Record<string, string>;
  htmlPath?: string;
  resolve: (specifier: string, importer: string) => string | null;
  assetUrl: (literal: string, modulePath: string) => string | null;
  keepStyles: (path: string) => boolean;
  /** true = ไม่มี HTML ในรีโป (Next) → สร้างเปลือกสะอาดให้ runner mount เอง */
  synthetic?: boolean;
}

/** เปลือกเอกสารเริ่มต้น (ใช้เมื่อรีโปไม่มี HTML ที่ใช้ได้) */
export function bareShellHtml(title = "พรีวิว React"): string {
  return (
    `<!doctype html><html lang="th"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>${title.replace(/[<>]/g, "")}</title></head>` +
    `<body><div id="root"></div></body></html>`
  );
}

/**
 * เปลือกเอกสารสำหรับ engine react: ตัด `<script src>` และ `<link rel=stylesheet>`
 * ที่ชี้ไฟล์ในโปรเจกต์ (เพราะถูกคอมไพล์/อินไลน์แยกแล้ว) แล้วเขียน URL รูปใน HTML
 */
function buildShellHtml(rawHtml: string, options: ShellOptions): string {
  const { files, htmlPath, resolve, assetUrl, keepStyles } = options;
  if (options.synthetic || !rawHtml.trim()) {
    // Next.js ไม่มี index.html ที่รันได้ (หรือเป็นหน้ารายการไฟล์ที่สร้างขึ้น)
    // → ใช้เปลือกสะอาด แล้วให้ runner mount คอมโพเนนต์หน้าลงในนั้น
    const title = /<title[^>]*>([^<]{1,120})<\/title>/i.exec(rawHtml)?.[1];
    return bareShellHtml(title?.trim() || "พรีวิว React");
  }
  const htmlDir = htmlPath ? dirOf(htmlPath) : "";
  const localHit = (value: string): string | null => {
    if (!value || /^(https?:|\/\/|data:|#|mailto:|tel:)/i.test(value)) return null;
    return resolveHtmlReference(value, htmlPath ?? "index.html", resolve);
  };

  let out = rawHtml;
  // <script src> ที่ชี้ไฟล์ในโปรเจกต์ → ตัดออก (โมดูลถูกรันโดย runner)
  out = out.replace(/<script\b[^>]*\bsrc\s*=\s*(?:"[^"]+"|'[^']+'|[^\s>]+)[^>]*>\s*<\/script>/gi, (tag) => {
    const src = /src\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i.exec(tag);
    const value = (src?.[1] ?? src?.[2] ?? src?.[3] ?? "").trim();
    return localHit(value) ? `<!-- ตัดสคริปต์ ${value}: runner รันให้แล้ว -->` : tag;
  });
  // <link rel=stylesheet> ที่ชี้ไฟล์ในโปรเจกต์ → เอาไว้เฉพาะที่โหลดจากภายนอก
  out = out.replace(/<link\b[^>]*>/gi, (tag) => {
    if (!/rel\s*=\s*["']?stylesheet/i.test(tag)) return tag;
    const href = /href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i.exec(tag);
    const value = (href?.[1] ?? href?.[2] ?? href?.[3] ?? "").trim();
    const hit = localHit(value);
    if (!hit) return tag;
    return keepStyles(hit) ? `<!-- สไตล์ ${hit} ถูกอินไลน์โดย runner -->` : tag;
  });
  // รูป/ไอคอนใน HTML → URL ของ repo ต้นทาง
  out = rewriteHtmlAssets(out, htmlPath ?? "index.html", assetUrl);
  if (!/id\s*=\s*["'](root|app|__next)["']/i.test(out)) {
    // เติม container ให้ React มีที่ mount
    out = out.replace(/<body([^>]*)>/i, `<body$1><div id="root"></div>`);
  }
  return out;
}

/** ตัวแปร environment ที่ runner ประกาศให้โค้ดที่ถูก rewrite ใช้ */
export const RUNTIME_ENV = ENV_SOURCE;

/** ชื่อไฟล์ UMD ที่ vendor ไว้ (เสิร์ฟจาก /vendor/react/…) */
export const REACT_VENDOR_FILES = [
  "react.production.min.js",
  "react-dom.production.min.js",
] as const;
