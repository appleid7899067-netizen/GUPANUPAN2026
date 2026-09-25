import { puterFreeChat, puterIsSignedIn } from "@/lib/puter";
import type { CanvasPatch, CanvasState } from "./types";

const PATCH_SYSTEM = `You are the GUPANUPAN2026 App Builder engine.
Never return HTML, JSX, CSS files, markdown, or prose.
Return ONLY a JSON array of patches.
Allowed operations are exactly:
1) { "op": "addComponent", "pageId": string, "component": { "id": string, "type": string, "props"?: object, "children"?: [] } }
2) { "op": "updateTheme", "theme": { [key:string]: string } }
3) { "op": "pushRoute", "pageId": string }
Input is the current pages, stack and userMessage.
Components are data, not markup. Use practical types such as text, button, card, input, list, nav, heading, form, image.
Do not invent an operation. Do not return a full page. Return the smallest useful patch.
IMPORTANT: Output must be a single JSON array starting with [ and ending with ]. No text before or after.`;

/** Extract the first balanced JSON value (array or object) from mixed model output. */
function extractBalancedJson(raw: string): string | null {
  const startArr = raw.indexOf("[");
  const startObj = raw.indexOf("{");
  let start = -1;
  let openChar = "";
  let closeChar = "";
  if (startArr >= 0 && (startObj < 0 || startArr < startObj)) {
    start = startArr;
    openChar = "[";
    closeChar = "]";
  } else if (startObj >= 0) {
    start = startObj;
    openChar = "{";
    closeChar = "}";
  } else {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === openChar) depth++;
    else if (ch === closeChar) {
      depth--;
      if (depth === 0) return raw.slice(start, i + 1);
    }
  }
  return null;
}

function normalize(raw: string): CanvasPatch[] {
  if (!raw || typeof raw !== "string") throw new Error("Empty patch response");

  const candidates: string[] = [];

  // 1) Markdown fenced block
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.push(fenced[1].trim());

  // 2) Balanced [ ... ] or { ... } extraction (handles trailing prose)
  const balanced = extractBalancedJson(raw);
  if (balanced) candidates.push(balanced);

  // 3) Naive strip of fences
  candidates.push(
    raw.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim(),
  );

  let lastError: Error | null = null;
  for (const candidate of candidates) {
    try {
      let parsed: unknown = JSON.parse(candidate);
      // Allow { "patches": [ ... ] } wrapper
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const obj = parsed as Record<string, unknown>;
        if (Array.isArray(obj.patches)) parsed = obj.patches;
        else if (Array.isArray(obj.ops)) parsed = obj.ops;
      }
      if (!Array.isArray(parsed)) {
        lastError = new Error("AI patch response must be an array");
        continue;
      }
      const patches = parsed.filter(
        (p) =>
          p &&
          typeof p === "object" &&
          (p as CanvasPatch).op &&
          ((p as CanvasPatch).op === "addComponent" ||
            (p as CanvasPatch).op === "updateTheme" ||
            (p as CanvasPatch).op === "pushRoute") &&
          typeof ((p as CanvasPatch).op === "addComponent"
            ? (p as { pageId?: unknown }).pageId
            : (p as CanvasPatch).op === "pushRoute"
              ? (p as { pageId?: unknown }).pageId
              : (p as { theme?: unknown }).theme) !== "undefined",
      ) as CanvasPatch[];
      if (patches.length) return patches;
      lastError = new Error("No usable patches in response");
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw lastError ?? new Error("Could not parse patch JSON");
}

export async function generateCanvasPatches(
  state: CanvasState,
  userMessage: string,
  history: { role: "user" | "assistant"; content: string }[] = [],
): Promise<CanvasPatch[]> {
  const user = JSON.stringify({ pages: state.pages, stack: state.stack, userMessage });
  const messages = [
    { role: "system" as const, content: PATCH_SYSTEM },
    ...history.slice(-8),
    { role: "user" as const, content: user },
  ];
  if (await puterIsSignedIn()) {
    const result = await puterFreeChat(messages, { model: "grok-4.5" });
    if (result.ok && result.text.trim()) return normalize(result.text);
    if (result.error === "PUTER_SIGN_IN_REQUIRED") {
      throw new Error("กรุณาล็อกอิน Puter (มุมขวาบน) เพื่อใช้โมเดลฟรี");
    }
    if (result.error) {
      console.warn("[Bossnu] Puter patch:", result.error);
    }
  }
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "patch", state, prompt: userMessage, history }),
  });
  if (!res.ok) throw new Error("Patch model unavailable — ลองล็อกอิน Puter หรือเปลี่ยนโมเดล");
  return normalize(await res.text());
}
