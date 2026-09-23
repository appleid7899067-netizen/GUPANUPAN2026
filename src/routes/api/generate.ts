import { createFileRoute } from "@tanstack/react-router";
import { buildMessages } from "@/lib/builder/system-prompt";

type Body = {
  prompt?: unknown;
  html?: unknown;
  history?: unknown;
};

export const Route = createFileRoute("/api/generate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.XAI_API_KEY;
        if (!apiKey) {
          return Response.json(
            { error: "AI is not available in this environment." },
            { status: 503 },
          );
        }

        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return Response.json({ error: "Invalid request." }, { status: 400 });
        }

        const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
        if (!prompt || prompt.length > 8000) {
          return Response.json({ error: "Please describe what to build." }, { status: 400 });
        }
        const html = typeof body.html === "string" ? body.html : "";
        const history = Array.isArray(body.history)
          ? body.history
              .filter(
                (m): m is { role: "user" | "assistant"; content: string } =>
                  !!m &&
                  typeof m === "object" &&
                  (m as { role?: string }).role !== undefined &&
                  typeof (m as { content?: unknown }).content === "string",
              )
              .map((m) => ({
                role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
                content: m.content,
              }))
          : [];

        const messages = buildMessages({ history, html, prompt });

        const upstream = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "grok-4.5",
            stream: true,
            temperature: 0.6,
            max_tokens: 12288,
            messages,
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const errText = await upstream.text().catch(() => "");
          return Response.json(
            { error: `The model could not respond (${upstream.status}). ${errText.slice(0, 180)}` },
            { status: 502 },
          );
        }

        return new Response(upstream.body, {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        });
      },
    },
  },
});
