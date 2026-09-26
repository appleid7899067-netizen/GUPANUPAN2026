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
          const host = url.hostname.toLowerCase();
          const isPlayStore = host === "play.google.com" && url.pathname.startsWith("/store/apps");
          const isGitHub = host === "github.com";
          if (isGitHub) {
            const parts = url.pathname.split("/").filter(Boolean);
            if (parts.length >= 2) {
              const owner = parts[0];
              const repo = parts[1].replace(/\\.git$/, "");
              const api = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
                headers: { Accept: "application/vnd.github+json", "User-Agent": "GUPANUPAN-App-Builder/1.0" },
              });
              if (api.ok) {
                const meta = await api.json() as Record<string, unknown>;
                const readme = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`, {
                  headers: { Accept: "application/vnd.github.raw+json", "User-Agent": "GUPANUPAN-App-Builder/1.0" },
                });
                const readmeText = readme.ok ? await readme.text() : "";
                return Response.json({
                  sourceType: "github",
                  url: raw,
                  title: meta.name ?? repo,
                  description: meta.description ?? "",
                  language: meta.language ?? null,
                  topics: meta.topics ?? [],
                  stars: meta.stargazers_count ?? 0,
                  forks: meta.forks_count ?? 0,
                  defaultBranch: meta.default_branch ?? "main",
                  license: (meta.license as Record<string, unknown> | null)?.spdx_id ?? null,
                  readme: readmeText.slice(0, 20000),
                  instruction: "Use this repository as a product/feature/architecture reference. Rebuild the app natively with GUPANUPAN components; do not copy source code unless the user has rights to it.",
                });
              }
            }
          }

          const upstream = await fetch(url, { headers: { "User-Agent": "GUPANUPAN-App-Builder/1.0" }, redirect: "follow" });
          if (!upstream.ok) return Response.json({ error: `Website returned ${upstream.status}.` }, { status: 502 });
          const html = await upstream.text();
          const headings = matches(html, /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi).map(stripHtml).filter(Boolean);
          const sections = [...html.matchAll(/<(header|nav|main|section|article|aside|footer)[^>]*>([\s\S]*?)<\/\\1>/gi)]
            .map((m) => ({ type: m[1].toLowerCase(), text: stripHtml(m[2]).slice(0, 500) }))
            .filter((x) => x.text);
          const buttons = [
            ...matches(html, /<button[^>]*>([\s\S]*?)<\/button>/gi),
            ...matches(html, /<a[^>]*(?:role=["']button["']|class=["'][^"']*button[^"']*)[^>]*>([\s\S]*?)<\/a>/gi),
          ].map(stripHtml).filter(Boolean).slice(0, 60);
          const forms = [...html.matchAll(/<form[^>]*>([\s\S]*?)<\/form>/gi)]
            .map((m) => stripHtml(m[1]).slice(0, 1000)).slice(0, 20);
          const inputs = [...html.matchAll(/<(input|textarea|select)[^>]*>/gi)].map((m) => m[0].slice(0, 500)).slice(0, 40);
          const fonts = [...new Set([
            ...(html.match(/font-family\s*:\s*([^;}{]+)/gi) ?? []).map((x) => x.replace(/^font-family\s*:\s*/i, "").trim()),
            ...(html.match(/<link[^>]+href=["'][^"']*(?:fonts|font)[^"']*["'][^>]*>/gi) ?? []),
          ])].slice(0, 30);
          const viewport = html.match(/<meta[^>]+name=["']viewport["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? null;
          const cssVariables = [...new Set((html.match(/--[a-zA-Z0-9_-]+\s*:\s*[^;}{]+/g) ?? []))].slice(0, 80);
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
            sourceType: isPlayStore ? "play-store" : "website",
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