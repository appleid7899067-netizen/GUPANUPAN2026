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
Do not invent an operation. Do not return a full page. Return the smallest useful patch.`;

function normalize(raw: string): CanvasPatch[] {
  const clean = raw.replace(/^\s*\`\`\`json\s*/i, "").replace(/\s*\`\`\`\s*$/i, "").trim();
  const parsed = JSON.parse(clean);
  if (!Array.isArray(parsed)) throw new Error("AI patch response must be an array");
  return parsed.filter((p) =>
    p && (p.op === "addComponent" || p.op === "updateTheme" || p.op === "pushRoute") &&
    typeof (p.op === "addComponent" ? p.pageId : p.op === "pushRoute" ? p.pageId : p.theme) !== "undefined",
  ) as CanvasPatch[];
}

export async function generateCanvasPatches(state: CanvasState, userMessage: string, history: { role: "user" | "assistant"; content: string }[] = []): Promise<CanvasPatch[]> {
  const user = JSON.stringify({ pages: state.pages, stack: state.stack, userMessage });
  const messages = [
    { role: "system" as const, content: PATCH_SYSTEM },
    ...history.slice(-8),
    { role: "user" as const, content: user },
  ];
  if (await puterIsSignedIn()) {
    const result = await puterFreeChat(messages, { model: "grok-4.5" });
    if (result.ok && result.text.trim()) return normalize(result.text);
  }
  const res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "patch", state, prompt: userMessage, history }) });
  if (!res.ok) throw new Error("Patch model unavailable");
  return normalize(await res.text());
}
