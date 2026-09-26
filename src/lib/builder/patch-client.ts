import { runGrokBuilder } from "./grok-builder";
import type { CanvasState, IntentResult } from "./types";

export async function generateIntent(
  state: CanvasState,
  userMessage: string,
  history: { role: "user" | "assistant"; content: string }[] = [],
): Promise<IntentResult> {
  let builderMessage=userMessage;
  const urlMatch=userMessage.match(/https?:\/\/[^\s]+/i);
  if (urlMatch) {
    try {
      const inspect=await fetch("/api/inspect-url",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:urlMatch[0].replace(/[),.]+$/,"")})});
      if (inspect.ok) builderMessage=[userMessage,"SOURCE ANALYSIS:",JSON.stringify(await inspect.json())].join("\n");
    } catch {}
  }
  return runGrokBuilder({canvas:state,prompt:builderMessage,history});
}
