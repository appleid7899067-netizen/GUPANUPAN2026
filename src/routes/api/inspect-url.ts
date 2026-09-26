import { createFileRoute } from "@tanstack/react-router";

type InspectBody = { url?: unknown };

function stripHtml(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim();
}

function matches(html: string, re: RegExp): string[] {
  return [...html.matchAll(re)].map((m) => (m[1] ?? "").trim()).filter(Boolean).slice(0, 80);
}

export const Route = createFileRoute("/api/inspect-url")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: InspectBody;
        try { body = await request.json() as InspectBody; } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
        const raw = typeof body.url === "string" ? body.url.trim() : "";
        if (!/^https?:\/\/[^\s]+$/i.test(raw)) return Response.json({ error: "Valid http(s) URL required." }, { status: 400 });

        let url: URL;
        try { url = new URL(raw); } catch { return Response.json({ error: "Invalid URL." }, { status: 400 }); }

        try {
          const upstream = await fetch(url, { headers: { "User-Agent": "GUPANUPAN-App-Builder/1.0" }, redirect: "follow" });
          if (!upstream.ok) return Response.json({ error: `Website returned ${upstream.status}.` }, { status: 502 });
          const html = await upstream.text();
          const headings = matches(html, /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi).map(stripHtml).filter(Boolean);
          const links = [...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
            .map((m) => ({ href: m[1], text: stripHtml(m[2]) })).filter((x) => x.text).slice(0, 80);
          const images = matches(html, /<img[^>]+src=["']([^"']+)["']/gi).slice(0, 30);
          const classes = [...html.matchAll(/class=["']([^"']+)["']/gi)].flatMap((m) => m[1].split(/\s+/)).filter(Boolean);
          const classHints = [...new Set(classes.filter((x) => /rounded|grid|flex|hero|card|button|nav|header|footer|container|text-|bg-|p-|m-/i.test(x)))].slice(0, 120);
          const colors = [...new Set(html.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [])].slice(0, 40);
          const title = stripHtml((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ""));
          const description = stripHtml((html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1] ?? ""));
          const text = stripHtml(html).slice(0, 12000);

          return Response.json({
            url: upstream.url || raw,
            title,
            description,
            headings,
            links,
            images,
            colors,
            classHints,
            text,
            note: "This is a structural/design analysis for rebuilding an app. It does not copy the source HTML as the app source.",
          });
        } catch (error) {
          return Response.json({ error: error instanceof Error ? error.message : "Could not inspect website." }, { status: 502 });
        }
      },
    },
  },
});