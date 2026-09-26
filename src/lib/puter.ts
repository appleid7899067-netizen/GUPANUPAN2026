// src/lib/puter.ts — Puter.js bridge for the Next.js builder
// This is the hybrid layer: when TOTALUM_VCAAS_API_KEY is not set, the app
// falls back to Puter.js (client-side, no API key) for AI, storage and hosting.
// Mirrors the Puter Builder (Vite) data model so projects stay compatible.

"use client";

export type PuterMode = "puter" | "totalum" | "unknown";

declare global {
  interface Window {
    puter?: any;
  }
}

const PUTER_SCRIPT_URL = "https://js.puter.com/v2/";

// --- Mode detection ---

export function isPuterAvailable(): boolean {
  return typeof window !== "undefined" && !!window.puter;
}

export async function ensurePuterLoaded(): Promise<boolean> {
  if (isPuterAvailable()) return true;
  if (typeof document === "undefined") return false;
  // inject if missing
  if (document.querySelector(`script[src="${PUTER_SCRIPT_URL}"]`)) {
    // wait a bit
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 200));
      if (isPuterAvailable()) return true;
    }
    return false;
  }
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = PUTER_SCRIPT_URL;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load puter.js"));
    document.head.appendChild(s);
  });
  for (let i = 0; i < 20; i++) {
    if (isPuterAvailable()) return true;
    await new Promise(r => setTimeout(r, 200));
  }
  return isPuterAvailable();
}

export async function ensurePuterAuth(): Promise<boolean> {
  if (!isPuterAvailable()) return false;
  try {
    if (window.puter.auth?.isSignedIn?.()) return true;
    // will trigger sign-in UI
    await window.puter.auth.signIn();
    return !!window.puter.auth.isSignedIn?.();
  } catch {
    return false;
  }
}

// --- Storage helpers (reuse Puter builder's layout) ---
// Puter builder stores: chat-history/<id>.json and /<user>/AppData/<appID>/<id>/
// We reuse the same for hybrid so old projects remain visible if user switches.

export function getPuterAppId(): string {
  // fallback — Puter's appID is assigned at deploy time, but locally we namespace under puter builder's app
  try {
    return (window as any).puter?.appID || "gupanupan2026-hybrid";
  } catch { return "gupanupan2026-hybrid"; }
}

export async function puterListProjects(): Promise<any[]> {
  if (!isPuterAvailable()) {
    // fallback to localStorage when offline
    try {
      const raw = localStorage.getItem("puter:projects");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }
  try {
    const raw = await window.puter.kv.get("puter:projects");
    if (raw) return JSON.parse(raw);
    // try legacy chat-history scan
    try {
      const entries = await window.puter.fs.readdir("chat-history");
      const projects: any[] = [];
      for (const name of entries) {
        if (!name.endsWith(".json") || name === "chat-list.json") continue;
        try {
          const text = await window.puter.fs.read(`chat-history/${name}`).then((d: any) => d.text());
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
    } catch { return []; }
  } catch { return []; }
}

export async function puterCreateProject(opts: { projectId: string; description: string; label?: string }): Promise<any> {
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
  // also init chat-history file for compatibility with Puter builder
  try {
    await window.puter.fs.mkdir("chat-history", { recursive: true });
    const chatData = {
      id: opts.projectId,
      title: opts.label || opts.projectId,
      history: [{ role: "user", content: opts.description }],
      createdAt: project.createdAt,
      appDir: `/${window.puter.auth?.user?.username || "user"}/AppData/${getPuterAppId()}/${opts.projectId}`,
    };
    await window.puter.fs.write(`chat-history/${opts.projectId}.json`, JSON.stringify(chatData));
    // ensure app dir exists
    await window.puter.fs.mkdir(chatData.appDir, { recursive: true });
  } catch {}
  return project;
}

// AI chat via Puter — mirrors Grok Build core
export async function puterChat(messages: any[], opts?: { model?: string; stream?: boolean }): Promise<any> {
  if (!isPuterAvailable()) throw new Error("Puter not loaded");
  const model = opts?.model || localStorage.getItem("gupanupan2026.selectedModel") || "x-ai/grok-4.7";
  return window.puter.ai.chat(messages, {
    model,
    stream: !!opts?.stream,
  });
}

export function getPuterUser() {
  try { return window.puter?.auth?.user || null; } catch { return null; }
}

export function getPuterModeFlag(): boolean {
  if (typeof window === "undefined") return false;
  // explicit localStorage override
  const flag = localStorage.getItem("puter:hybrid-mode");
  if (flag === "1") return true;
  if (flag === "0") return false;
  // auto: if Totalum key not configured (checked via /api/config) and puter available → puter mode
  return isPuterAvailable();
}
