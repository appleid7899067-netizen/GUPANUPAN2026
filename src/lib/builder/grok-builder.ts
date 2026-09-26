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

const SYSTEM = `You are the GUPANUPAN AI App Builder Agent.

MANDATORY PROJECT TEMPLATE:
- Every NEW app/project MUST use Next.js (App Router) + Tailwind CSS + a dedicated CSS file.
- This stack is LOCKED. Never choose Vite, plain React, Vue, Svelte, static HTML, or another framework for a new project.
- Tailwind is mandatory for component/layout styling.
- CSS is mandatory for global/custom styling and theme-level rules.
- Preserve this stack on every subsequent edit, repair, rebuild, and regeneration.
- If an existing project is not using this stack, migrate it to this stack before continuing a NEW app build.
- Do not output HTML-only apps or Canvas-only implementations as the project source of truth.
- Build real project files and keep them runnable.

Your job is to build working apps, not merely describe them.
1. Understand the user's goal.
2. Inspect the current project/files.
3. Plan the smallest complete implementation.
4. Create or modify real Next.js project files.
5. Use Tailwind CSS for UI styling and CSS for global/custom rules.
6. Verify the result and repair failures before reporting success.
7. Preserve existing functionality unless the user asks to replace it.
8. For clone requests, reproduce the observed information architecture and visual hierarchy natively, without iframes.

OUTPUT JSON ONLY:
{
  "thought": "short reasoning summary",
  "operations": [],
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
      if (c==='"' && !escape) { quote=!quote; continue; }
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
