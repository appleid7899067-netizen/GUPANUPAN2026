// src/lib/puter.ts — Puter.js bridge for the Next.js builder (hybrid mode).
// When TOTALUM_VCAAS_API_KEY is not set, the app uses Puter.js client-side
// (no API key) for AI. Auth state belongs to the user's Puter account.

"use client";

export type PuterMode = "puter" | "totalum" | "unknown";

declare global {
  interface Window {
    puter?: any;
  }
}

export const PUTER_SCRIPT_URL = "https://js.puter.com/v2/";

/** Model presets known to work via Puter. Empty string = Puter default. */
export const PUTER_MODEL_PRESETS: { id: string; label: string }[] = [
  { id: "", label: "อัตโนมัติ (Puter เลือกให้)" },
  { id: "gpt-5-nano", label: "gpt-5-nano · เร็ว ประหยัด" },
  { id: "gpt-5-mini", label: "gpt-5-mini · สมดุล" },
  { id: "claude-sonnet-4-6", label: "claude-sonnet · โค้ดเนี้ยบ" },
  { id: "google/gemini-3-flash", label: "gemini-flash · เร็ว" },
  { id: "deepseek/deepseek-chat", label: "deepseek · โค้ดดี" },
];

const MODEL_KEY = "gupan:model";

export function getSavedModel(): string {
  try {
    return localStorage.getItem(MODEL_KEY) || "";
  } catch {
    return "";
  }
}

export function saveModel(id: string): void {
  try {
    localStorage.setItem(MODEL_KEY, id);
  } catch {
    /* Non-critical. */
  }
}

// --- Script loading -------------------------------------------------------

export function isPuterAvailable(): boolean {
  return typeof window !== "undefined" && !!window.puter?.auth;
}

let loadPromise: Promise<boolean> | null = null;

async function waitForPuter(timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (isPuterAvailable()) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return isPuterAvailable();
}

/**
 * Ensure puter.js is loaded. Safe to call repeatedly; concurrent calls share
 * one in-flight attempt. Returns true when `window.puter.auth` is usable.
 */
export function ensurePuterLoaded(): Promise<boolean> {
  if (isPuterAvailable()) return Promise.resolve(true);
  if (typeof document === "undefined") return Promise.resolve(false);
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    // A script tag may already exist (layout <Script> or a previous attempt).
    if (!document.querySelector(`script[src="${PUTER_SCRIPT_URL}"]`)) {
      try {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = PUTER_SCRIPT_URL;
          s.async = true;
          s.onload = () => resolve();
          s.onerror = () =>
            reject(new Error("โหลด js.puter.com ไม่ได้"));
          document.head.appendChild(s);
        });
      } catch {
        loadPromise = null;
        return false;
      }
    }
    const ok = await waitForPuter(10000);
    // Allow a later retry if this attempt failed (e.g. ad-blocker toggled off).
    if (!ok) loadPromise = null;
    return ok;
  })();
  return loadPromise;
}

// --- Auth ------------------------------------------------------------------

export type PuterAuthState =
  | { status: "loading" }
  | { status: "unavailable"; detail: string }
  | { status: "signed-out" }
  | { status: "signed-in"; username: string | null };

export function isSignedIn(): boolean {
  try {
    return !!window.puter?.auth?.isSignedIn?.();
  } catch {
    return false;
  }
}

export async function getPuterUsername(): Promise<string | null> {
  try {
    const user = await window.puter?.auth?.getUser?.();
    const name = user?.username ?? user?.uuid ?? null;
    return typeof name === "string" ? name : null;
  } catch {
    return null;
  }
}

/**
 * Non-popup check: is the SDK ready and is there an existing session?
 * Never opens a popup — safe to call on page load or on a timer.
 */
export async function refreshPuterSession(): Promise<PuterAuthState> {
  if (typeof window === "undefined") return { status: "loading" };
  const ok = await ensurePuterLoaded();
  if (!ok) {
    return {
      status: "unavailable",
      detail:
        "โหลด Puter ไม่สำเร็จ อาจถูก ad-blocker หรือเน็ตเวิร์กบล็อก js.puter.com อยู่",
    };
  }
  if (!isSignedIn()) return { status: "signed-out" };
  return { status: "signed-in", username: await getPuterUsername() };
}

export class PuterAuthError extends Error {
  code: "popup-blocked" | "dismissed" | "network" | "unknown";
  constructor(code: PuterAuthError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

/**
 * MUST be called synchronously from a user gesture (button onClick) so the
 * browser allows the Puter popup. Do not `await` anything before signIn()
 * inside the click handler — an async gap loses the gesture on mobile Safari.
 */
export async function signInWithPuter(): Promise<string | null> {
  if (!isPuterAvailable()) {
    throw new PuterAuthError(
      "network",
      "Puter ยังโหลดไม่เสร็จ กดปุ่มอีกครั้งในไม่กี่วินาที",
    );
  }
  if (isSignedIn()) return getPuterUsername();
  try {
    // IMPORTANT: direct call, no awaits before it, to keep the user gesture.
    await window.puter.auth.signIn();
  } catch (e) {
    throw toAuthError(e);
  }
  // The popup may close without signing in (user cancelled / blocked).
  if (!isSignedIn()) {
    throw new PuterAuthError(
      "dismissed",
      "ยังไม่ได้เข้าสู่ระบบ — หน้าต่าง Puter อาจถูกบล็อกหรือถูกปิดไปก่อน กรุณาอนุญาต popup สำหรับเว็บนี้แล้วลองอีกครั้ง",
    );
  }
  return getPuterUsername();
}

export function signOutFromPuter(): void {
  try {
    window.puter?.auth?.signOut?.();
  } catch {
    /* Session already gone. */
  }
}

function toAuthError(e: unknown): PuterAuthError {
  const msg = e instanceof Error ? e.message : String(e);
  const lower = msg.toLowerCase();
  if (
    lower.includes("popup") ||
    lower.includes("blocked") ||
    lower.includes("window.open") ||
    lower.includes("user gesture")
  ) {
    return new PuterAuthError(
      "popup-blocked",
      "เบราว์เซอร์บล็อกหน้าต่างล็อกอิน Puter — แตะ ⋮/aA → อนุญาต popup (หรือปิด ad-blocker ชั่วคราว) แล้วกดเข้าสู่ระบบอีกครั้ง",
    );
  }
  if (
    lower.includes("network") ||
    lower.includes("fetch") ||
    lower.includes("load") ||
    lower.includes("timeout")
  ) {
    return new PuterAuthError(
      "network",
      "เชื่อมต่อ Puter ไม่ได้ ตรวจเน็ต/Ad-blocker แล้วลองอีกครั้ง",
    );
  }
  return new PuterAuthError("unknown", msg || "เข้าสู่ระบบไม่สำเร็จ ลองอีกครั้ง");
}

// --- AI --------------------------------------------------------------------

/** Extract text from one streamed chunk, tolerating shape differences. */
export function chunkText(chunk: unknown): string {
  if (typeof chunk === "string") return chunk;
  if (chunk && typeof chunk === "object") {
    const c = chunk as Record<string, any>;
    if (typeof c.text === "string") return c.text;
    // Non-stream envelope accidentally yielded per-part.
    const content = c.message?.content;
    if (Array.isArray(content)) {
      return content
        .map((b: any) => (typeof b?.text === "string" ? b.text : ""))
        .join("");
    }
    if (typeof c.content === "string") return c.content;
  }
  return "";
}

/** Extract full text from a non-streamed ai.chat() response. */
export function responseText(resp: unknown): string {
  if (typeof resp === "string") return resp;
  if (resp && typeof resp === "object") {
    const r = resp as Record<string, any>;
    if (typeof r.text === "string") return r.text;
    const content = r.message?.content;
    if (Array.isArray(content)) {
      return content
        .map((b: any) => (typeof b?.text === "string" ? b.text : ""))
        .join("");
    }
    if (typeof r.content === "string") return r.content;
  }
  return "";
}

export function isAuthLikeError(e: unknown): boolean {
  const msg = (
    e instanceof Error ? e.message : String(e ?? "")
  ).toLowerCase();
  return (
    msg.includes("sign") ||
    msg.includes("auth") ||
    msg.includes("login") ||
    msg.includes("permission") ||
    msg.includes("401") ||
    msg.includes("403") ||
    msg.includes("token")
  );
}

export function aiErrorText(e: unknown): string {
  const raw =
    e instanceof Error
      ? e.message
      : typeof e === "object" && e !== null
        ? String(
            (e as any).message ?? (e as any).error?.message ?? JSON.stringify(e),
          )
        : String(e);
  const lower = raw.toLowerCase();
  if (isAuthLikeError(e)) {
    return "Puter ต้องการการเข้าสู่ระบบใหม่ กด “เข้าสู่ระบบ Puter” อีกครั้งแล้วลองใหม่";
  }
  if (lower.includes("quota") || lower.includes("limit") || lower.includes("429")) {
    return `โควตา Puter เต็มหรือถึงขีดจำกัด (${raw}) — ลองเปลี่ยนโมเดลหรือรอแล้วลองใหม่`;
  }
  if (lower.includes("model")) {
    return `โมเดลใช้ไม่ได้ (${raw}) — ลองเลือก “อัตโนมัติ” หรือโมเดลอื่น`;
  }
  return raw || "Puter ส่งข้อผิดพลาด กรุณาลองอีกครั้ง";
}

// --- Legacy helpers kept for the Totalum/hybrid panels ---------------------

export function getPuterAppId(): string {
  try {
    return (window as any).puter?.appID || "gupanupan2026-hybrid";
  } catch {
    return "gupanupan2026-hybrid";
  }
}

export function getPuterUser() {
  try {
    return window.puter?.auth?.user || null;
  } catch {
    return null;
  }
}

export async function ensurePuterAuth(): Promise<boolean> {
  if (!isPuterAvailable()) return false;
  try {
    if (isSignedIn()) return true;
    await window.puter.auth.signIn();
    return isSignedIn();
  } catch {
    return false;
  }
}

export async function puterListProjects(): Promise<any[]> {
  if (!isPuterAvailable()) {
    try {
      const raw = localStorage.getItem("puter:projects");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
  try {
    const raw = await window.puter.kv.get("puter:projects");
    if (raw) return JSON.parse(raw);
    try {
      const entries = await window.puter.fs.readdir("chat-history");
      const projects: any[] = [];
      for (const name of entries) {
        if (!name.endsWith(".json") || name === "chat-list.json") continue;
        try {
          const text = await window.puter.fs
            .read(`chat-history/${name}`)
            .then((d: any) => d.text());
          const chat = JSON.parse(text);
          projects.push({
            projectId: chat.id || name.replace(".json", ""),
            label: chat.title || chat.id,
            description: chat.history?.[0]?.content || "",
            createdAt: chat.createdAt || new Date().toISOString(),
            previewImageUrl: null,
          });
        } catch {}
      }
      return projects;
    } catch {
      return [];
    }
  } catch {
    return [];
  }
}

export async function puterCreateProject(opts: {
  projectId: string;
  description: string;
  label?: string;
}): Promise<any> {
  const project = {
    projectId: opts.projectId,
    label: opts.label || opts.projectId,
    description: opts.description,
    createdAt: new Date().toISOString(),
    plan: "puter-free",
    agentServerStatus: "Active" as const,
  };
  if (!isPuterAvailable()) {
    const list = await puterListProjects();
    list.unshift(project);
    localStorage.setItem("puter:projects", JSON.stringify(list));
    return project;
  }
  const list = await puterListProjects();
  list.unshift(project);
  await window.puter.kv.set("puter:projects", JSON.stringify(list));
  try {
    await window.puter.fs.mkdir("chat-history", { recursive: true });
    const chatData = {
      id: opts.projectId,
      title: opts.label || opts.projectId,
      history: [{ role: "user", content: opts.description }],
      createdAt: project.createdAt,
      appDir: `/${window.puter.auth?.user?.username || "user"}/AppData/${getPuterAppId()}/${opts.projectId}`,
    };
    await window.puter.fs.write(
      `chat-history/${opts.projectId}.json`,
      JSON.stringify(chatData),
    );
    await window.puter.fs.mkdir(chatData.appDir, { recursive: true });
  } catch {}
  return project;
}

export async function puterChat(
  messages: any[],
  opts?: { model?: string; stream?: boolean; promptHint?: string },
): Promise<any> {
  if (!isPuterAvailable()) throw new Error("Puter not loaded");
  let model = opts?.model;
  if (!model) {
    try {
      const hint =
        opts?.promptHint ||
        (Array.isArray(messages)
          ? String(messages[messages.length - 1]?.content || "").slice(0, 500)
          : "");
      const { pickBestModel } = await import("./bolt-killer");
      model = pickBestModel(
        hint,
        getSavedModel() || "gpt-5-mini",
      );
    } catch {
      model = getSavedModel() || "gpt-5-mini";
    }
  }
  return window.puter.ai.chat(messages, {
    ...(model ? { model } : {}),
    stream: !!opts?.stream,
  });
}

export function getPuterModeFlag(): boolean {
  if (typeof window === "undefined") return false;
  const flag = localStorage.getItem("puter:hybrid-mode");
  if (flag === "1") return true;
  if (flag === "0") return false;
  return isPuterAvailable();
}
