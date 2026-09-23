import { SYSTEM_PROMPT } from "@/lib/builder/system-prompt";
import { buildBossContext, buildExecutionContract, liveStatusFor } from "@/lib/boss-engine";
import { puterFreeChat, puterIsSignedIn } from "@/lib/puter";

export type GeneratePayload = {
  prompt: string;
  html: string;
  history: { role: "user" | "assistant"; content: string }[];
  model?: string;
};

function buildMessages(payload: GeneratePayload): Array<{ role: string; content: string }> {
  const messages: Array<{ role: string; content: string }> = [
    {
      role: "system",
      content: [SYSTEM_PROMPT, buildBossContext(payload.prompt, payload.history.length, Boolean(payload.html.trim()))].join("\n\n"),
    },
  ];
  for (const m of payload.history.slice(-12)) {
    messages.push({ role: m.role, content: m.content.slice(0, 8000) });
  }
  let user = payload.prompt;
  if (payload.html.trim()) {
    const html = payload.html.length > 90000 ? `${payload.html.slice(0, 90000)}\n<!-- truncated -->` : payload.html;
    user = `The current app HTML is:\n\n\`\`\`html\n${html}\n\`\`\`\n\nApply this change and return the FULL updated HTML document:\n\n${payload.prompt}`;
  }
  messages.push({ role: "user", content: user });
  return messages;
}

export async function streamGenerate(
  payload: GeneratePayload,
  onDelta: (text: string) => void,
  signal?: AbortSignal,
  onStatus?: (status: string) => void,
): Promise<string> {
  const contract = buildExecutionContract(payload.prompt);
  onStatus?.(liveStatusFor(payload.prompt, "start"));
  onStatus?.(liveStatusFor(payload.prompt, "plan"));

  try {
    if (await puterIsSignedIn()) {
      onStatus?.(liveStatusFor(payload.prompt, "act"));
      const result = await puterFreeChat(buildMessages(payload), {
        onDelta,
        model: contract.searchUsesLiveWebTool ? "openai/gpt-5.6-luna" : payload.model,
        webSearch: contract.searchUsesLiveWebTool,
      });
      if (result.ok && result.text.trim()) {
        onStatus?.(liveStatusFor(payload.prompt, "verify"));
        onStatus?.(liveStatusFor(payload.prompt, "done"));
        return result.text;
      }
      if (result.error && result.error !== "PUTER_SIGN_IN_REQUIRED") {
        console.warn("[GuPanu] Puter model:", result.error);
      }
    }
  } catch (e) {
    onStatus?.(liveStatusFor(payload.prompt, "recover"));
    console.warn("[GuPanu] Puter path failed, trying API fallback", e);
  }

  onStatus?.(liveStatusFor(payload.prompt, "act"));
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok) {
    let message = `Could not reach the model (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if (!res.body) throw new Error("Empty response from the model");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      for (const line of chunk.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (!data || data === "[DONE]") continue;
        try {
          const json = JSON.parse(data) as {
            choices?: { delta?: { content?: string } }[];
            error?: { message?: string };
          };
          if (json.error?.message) throw new Error(json.error.message);
          const delta = json.choices?.[0]?.delta?.content ?? "";
          if (delta) {
            full += delta;
            onDelta(full);
          }
        } catch (err) {
          if (err instanceof SyntaxError) continue;
          throw err;
        }
      }
    }
  }
  onStatus?.(liveStatusFor(payload.prompt, "verify"));
  onStatus?.(liveStatusFor(payload.prompt, "done"));
  return full;
}
