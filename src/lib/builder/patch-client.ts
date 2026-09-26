import { puterFreeChat, puterIsSignedIn } from "@/lib/puter";
import type { CanvasState, IntentResult } from "./types";
import {
  buildIntentUserPayload,
  intentSystemPrompt,
  localIntentFromGoal,
  parseIntentResult,
} from "./intent-engine";

/**
 * Generate an Intent Graph result for the current canvas + user goal.
 * Beyond Grok: multi-op, goal-aware, with nextPredict preload.
 */
export async function generateIntent(
  state: CanvasState,
  userMessage: string,
  history: { role: "user" | "assistant"; content: string }[] = [],
): Promise<IntentResult> {
  let builderMessage = userMessage;
  const urlMatch = userMessage.match(/https?:\/\/[^\s]+/i);
  if (urlMatch) {
    try {
      const inspect = await fetch("/api/inspect-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlMatch[0].replace(/[),.]+$/, "") }),
      });
      if (inspect.ok) {
        const source = await inspect.json();
        const sourceType = typeof source?.sourceType === "string" ? source.sourceType : "website";
        builderMessage = [
          `SOURCE TYPE: ${sourceType}`,
          userMessage,
          "",
          "SOURCE ANALYSIS (website, Play Store, or GitHub): use it as a product/design/feature reference and rebuild natively with GUPANUPAN components. Do not blindly copy protected source/assets):",
          JSON.stringify(source),
        ].join("\n");
      }
    } catch (e) {
      console.warn("[GUPANUPAN] URL inspection failed; continuing without source", e);
    }
  }
  if (state.selectedComponentId) {
    builderMessage += `\nSELECTED COMPONENT: ${state.selectedComponentId}. If the user's request is an edit, target this component first.`;
  }
  const payload = buildIntentUserPayload(state, builderMessage, history);
  const messages = [
    { role: "system" as const, content: intentSystemPrompt() },
    ...history.slice(-6).map((m) => ({ role: m.role as "user" | "assistant", content: m.content.slice(0, 2000) })),
    { role: "user" as const, content: payload },
  ];

  // 1) Prefer Puter / remote model
  if (await puterIsSignedIn()) {
    try {
      const result = await puterFreeChat(messages, { model: "grok-4.5" });
      if (result.ok && result.text.trim()) {
        const parsed = parseIntentResult(result.text);
        if (parsed?.operations.length) return parsed;
      }
      if (result.error === "PUTER_SIGN_IN_REQUIRED") {
        throw new Error("กรุณาล็อกอิน Puter (มุมขวาบน) เพื่อใช้โมเดลฟรี");
      }
    } catch (e) {
      if (e instanceof Error && /ล็อกอิน Puter/.test(e.message)) throw e;
      console.warn("[Bossnu] Intent remote failed, trying fallback", e);
    }
  }

  // 2) API fallback
  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "intent",
        state,
        prompt: userMessage,
        history,
        system: intentSystemPrompt(),
      }),
    });
    if (res.ok) {
      const text = await res.text();
      const parsed = parseIntentResult(text);
      if (parsed?.operations.length) return parsed;
    }
  } catch (e) {
    console.warn("[Bossnu] Intent API fallback failed", e);
  }

  // 3) Local Intent heuristics (still multi-op — beyond single patch)
  const local = localIntentFromGoal(builderMessage, state);
  if (local) return local;

  throw new Error("ยังแปลงความต้องการเป็น Intent ไม่ได้ — ลองบอกเป้าหมายชัดขึ้น เช่น อยากให้คนซื้อเยอะขึ้น");
}

/** @deprecated Use generateIntent — kept for compatibility */
export async function generateCanvasPatches(
  state: CanvasState,
  userMessage: string,
  history: { role: "user" | "assistant"; content: string }[] = [],
) {
  const intent = await generateIntent(state, userMessage, history);
  return intent.operations;
}
