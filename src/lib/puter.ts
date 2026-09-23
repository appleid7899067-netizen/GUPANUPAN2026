/**
 * Puter.js foundation — auth + free-model chat.
 * Browser only. Closes the "fake backend model" gap by running on Puter when signed in.
 */

import { DEFAULT_FREE_MODEL, FREE_MODELS } from "@/lib/brand";

const SCRIPT_SRC = "https://js.puter.com/v2/";

export type PuterUser = {
  uuid?: string;
  username?: string;
  email?: string;
  [key: string]: unknown;
};

export type PuterAPI = {
  auth: {
    isSignedIn: () => boolean | Promise<boolean>;
    signIn: (opts?: { attempt_temp_user_creation?: boolean }) => Promise<PuterUser | void>;
    signOut: () => Promise<void>;
    getUser: () => Promise<PuterUser | null>;
  };
  ai: {
    chat: (
      messages: Array<{ role: string; content: string }> | string,
      options?: { model?: string; stream?: boolean; tools?: unknown[]; compaction?: boolean },
    ) => Promise<unknown> | AsyncIterable<unknown>;
  };
  fs?: unknown;
  hosting?: unknown;
};

declare global {
  interface Window {
    puter?: PuterAPI;
  }
}

function isBrowser() {
  return typeof window !== "undefined";
}

export function getPuter(): PuterAPI | null {
  return isBrowser() ? window.puter ?? null : null;
}

export function loadPuter(): Promise<PuterAPI> {
  if (!isBrowser()) return Promise.reject(new Error("Puter runs in the browser only."));
  if (window.puter) return Promise.resolve(window.puter);

  const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const tick = () => {
        if (window.puter) return resolve(window.puter);
        if (Date.now() - start > 12000) return reject(new Error("Puter.js loaded but did not initialize."));
        requestAnimationFrame(tick);
      };
      existing.addEventListener("error", () => reject(new Error("Failed to load Puter.js.")));
      tick();
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      const start = Date.now();
      const tick = () => {
        if (window.puter) return resolve(window.puter);
        if (Date.now() - start > 8000) return reject(new Error("Puter.js loaded but did not initialize."));
        requestAnimationFrame(tick);
      };
      tick();
    };
    script.onerror = () => reject(new Error("Failed to load Puter.js."));
    document.head.appendChild(script);
  });
}

export async function ensurePuter(): Promise<PuterAPI> {
  return getPuter() ?? loadPuter();
}

export async function puterSignIn(): Promise<PuterUser | null> {
  const puter = await ensurePuter();
  await puter.auth.signIn({ attempt_temp_user_creation: true });
  return puter.auth.getUser();
}

export async function puterSignOut(): Promise<void> {
  const puter = await ensurePuter();
  await puter.auth.signOut();
}

export async function puterIsSignedIn(): Promise<boolean> {
  try {
    const puter = await ensurePuter();
    const v = puter.auth.isSignedIn();
    return typeof v === "boolean" ? v : await v;
  } catch {
    return false;
  }
}

export async function puterGetUser(): Promise<PuterUser | null> {
  try {
    const puter = await ensurePuter();
    if (!(await puterIsSignedIn())) return null;
    return puter.auth.getUser();
  } catch {
    return null;
  }
}

export function extractPuterText(response: unknown): string {
  if (response == null) return "";
  if (typeof response === "string") return response;

  // Puter/browser integrations can hand us DOM nodes. Never stringify a
  // HTMLDivElement into the chat as "[object HTMLDivElement]".
  if (typeof Element !== "undefined" && response instanceof Element) {
    return (response.textContent ?? response.getAttribute("data-text") ?? "").trim();
  }

  if (typeof response === "object") {
    const r = response as Record<string, unknown>;
    if (typeof r.message === "string") return r.message;
    if (r.message && typeof r.message === "object") {
      const m = r.message as Record<string, unknown>;
      if (typeof m.content === "string") return m.content;
      if (Array.isArray(m.content)) {
        return m.content
          .map((item) => {
            if (typeof item === "string") return item;
            if (typeof Element !== "undefined" && item instanceof Element) return item.textContent ?? "";
            const part = item as { text?: unknown; content?: unknown };
            return typeof part.text === "string" ? part.text :
              typeof part.content === "string" ? part.content : "";
          })
          .join("");
      }
    }
    if (typeof r.text === "string") return r.text;
    if (typeof r.content === "string") return r.content;
  }

  try {
    const json = JSON.stringify(response);
    return json === "{}" ? "" : json;
  } catch {
    return "";
  }
}

/** Chat with free models via Puter. Tries each free model until one works. */
export async function puterFreeChat(
  messages: Array<{ role: string; content: string }>,
  opts?: { model?: string; onDelta?: (text: string) => void },
): Promise<{ ok: boolean; text: string; model?: string; error?: string }> {
  const puter = await ensurePuter();
  if (!(await puterIsSignedIn())) return { ok:false, text:"", error:"PUTER_SIGN_IN_REQUIRED" };
  const models = opts?.model ? [opts.model, ...FREE_MODELS] : [...FREE_MODELS];
  const unique = [...new Set(models)];
  let lastError = "";
  for (const model of unique) {
    try {
      const response = await puter.ai.chat(messages, { model, stream:true, compaction:true });
      if (response && typeof (response as AsyncIterable<unknown>)[Symbol.asyncIterator] === "function") {
        let full = "";
        for await (const part of response as AsyncIterable<Record<string, unknown>>) {
          if (part?.type === "error") throw new Error(String(part.message ?? "Puter stream error"));
          const delta = typeof part?.text === "string" ? part.text : extractPuterText(part);
          if (delta) { full += delta; opts?.onDelta?.(full); }
        }
        if (full.trim()) return {ok:true,text:full,model};
        lastError = "Empty streaming response from " + model;
      } else {
        const text = extractPuterText(response);
        if (text.trim()) { opts?.onDelta?.(text); return {ok:true,text,model}; }
        lastError = "Empty response from " + model;
      }
    } catch (e) { lastError = e instanceof Error ? e.message : String(e); }
  }
  return {ok:false,text:"",error:lastError || "All free models failed"};
}
export { DEFAULT_FREE_MODEL, FREE_MODELS };
