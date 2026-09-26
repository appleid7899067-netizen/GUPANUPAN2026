import { puterFreeChat, puterIsSignedIn } from "@/lib/puter";
import type { CanvasPatch, CanvasState, IntentResult } from "./types";

export type GrokBuilderTool =
  | "inspect_canvas"
  | "patch_canvas"
  | "verify_canvas"
  | "checkpoint"
  | "visual_edit";

export type GrokBuilderContext = {
  canvas: CanvasState;
  prompt: string;
  history: { role: "user" | "assistant"; content: string }[];
};

const SYSTEM = `You are the GUPANUPAN Grok Builder Agent.
You are the builder brain, not a chatbot and not an HTML generator.

The only source of truth is the Canvas Store:
{ pages, stack, theme, preloaded, selectedComponentId }.

Your job is:
1. Understand the user's goal.
2. Inspect the current Canvas state.
3. Plan the smallest complete change.
4. Return executable Canvas PATCH operations.
5. Never return HTML, JSX, CSS files, prose-only instructions, or fake success.
6. Preserve existing components unless the user asks to remove/replace them.
7. For a new app, build a coherent multi-section UI, not a one-text placeholder.
8. If selectedComponentId exists, treat it as the primary visual-edit target when relevant.
9. Keep navigation valid. Any route target must exist or be created in the same patch.
10. Theme must keep background,text,primary,accent,surface,muted.
11. Clone requests should reproduce the observed information architecture and visual hierarchy natively, without iframes.

OUTPUT JSON ONLY:
{
  "thought": "short reasoning summary",
  "operations": [
    { "op":"addComponent", "pageId":"home", "component":{...} },
    { "op":"updateComponent", "pageId":"home", "componentId":"...", "props":{...} },
    { "op":"removeComponent", "pageId":"home", "componentId":"..." },
    { "op":"addPage", "page":{...} },
    { "op":"updateTheme", "theme":{...} },
    { "op":"pushRoute", "pageId":"..." },
    { "op":"setPage", "pageId":"..." },
    { "op":"preload", "pageIds":["..."] }
  ],
  "reply": "brief Thai confirmation"
}
`;

function extractJson(text: string): unknown {
  const cleaned = text.replace(/^\`\`\`(?:json)?/i, "").replace(/\`\`\`$/i, "").trim();
  try { return JSON.parse(cleaned); } catch {}
  const starts = [cleaned.indexOf("{"), cleaned.indexOf("[")].filter((n) => n >= 0).sort((a,b) => a-b);
  for (const start of starts) {
    let depth = 0; let quote = false; let escape = false;
    for (let i=start;i<cleaned.length;i++) {
      const c=cleaned[i];
      if (escape) { escape=false; continue; }
      if (c==="\\") { escape=true; continue; }
      if (c===""" && !escape) { quote=!quote; continue; }
      if (quote) continue;
      if (c==="{" || c==="[") depth++;
      if (c==="}" || c==="]") { depth--; if (depth===0) { try { return JSON.parse(cleaned.slice(start,i+1)); } catch {} break; } }
    }
  }
  return null;
}

function isPatch(value: unknown): value is CanvasPatch {
  if (!value || typeof value !== "object") return false;
  const op = (value as {op?:unknown}).op;
  return ["addComponent","updateComponent","removeComponent","addPage","updateTheme","pushRoute","setPage","preload"].includes(String(op));
}

function normalize(raw: unknown): IntentResult | null {
  if (Array.isArray(raw)) {
    const operations = raw.filter(isPatch);
    return operations.length ? { thought:"", operations, reply:"อัปเดต Canvas แล้ว" } : null;
  }
  if (!raw || typeof raw !== "object") return null;
  const r=raw as Record<string,unknown>;
  const candidate=Array.isArray(r.operations) ? r.operations : Array.isArray(r.patches) ? r.patches : [];
  const operations=candidate.filter(isPatch);
  if (!operations.length) return null;
  return {
    thought: typeof r.thought==="string" ? r.thought : "",
    operations,
    nextPredict: r.nextPredict && typeof r.nextPredict==="object" && Array.isArray((r.nextPredict as any).preload)
      ? { preload:(r.nextPredict as any).preload.filter((x:unknown)=>typeof x==="string") }
      : undefined,
    reply: typeof r.reply==="string" ? r.reply : "อัปเดต Canvas แล้ว",
  };
}

export async function runGrokBuilder(ctx: GrokBuilderContext): Promise<IntentResult> {
  if (!(await puterIsSignedIn())) throw new Error("กรุณาล็อกอิน Puter เพื่อใช้ Grok Builder");
  const payload = JSON.stringify({
    canvas: ctx.canvas,
    selectedComponentId: ctx.canvas.selectedComponentId ?? null,
    userGoal: ctx.prompt,
    history: ctx.history.slice(-8),
  });
  const result = await puterFreeChat(
    [{ role:"system", content:SYSTEM }, { role:"user", content:payload }],
    { model:"x-ai/grok-4.7" },
  );
  if (!result.ok) throw new Error(result.error || "Grok Builder ไม่ตอบกลับ");
  const parsed=normalize(extractJson(result.text));
  if (!parsed) throw new Error("Grok Builder ส่ง PATCH ที่อ่านไม่ได้");
  return parsed;
}
