import type { Suggestion } from "./types";

const HTML_FENCE = /```(?:html|htm|xml)?\s*\n([\s\S]*?)```/gi;
const SUGGEST_FENCE = /```suggestions\s*\n([\s\S]*?)```/i;

/** Hide provider reasoning/event envelopes from the user-facing chat. */
export function sanitizeModelText(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/\{\s*"type"\s*:\s*"(?:reasoning|thinking)(?:\.delta)?"[\s\S]*?\}\s*/gi, "")
    .replace(/^\s*\{\s*"reasoning"\s*:\s*"[^\n]*"\s*\}\s*$/gim, "")
    .replace(/\{\s*"type"\s*:\s*"usage"[\s\S]*$/i, "")
    .trim();
}

function looksLikeHtml(s: string) {
  const t = s.trim();
  return (
    t.startsWith("<!DOCTYPE") ||
    t.startsWith("<!doctype") ||
    t.startsWith("<html") ||
    t.includes("<html")
  );
}

export function extractHtml(raw: string): string | null {
  raw = sanitizeModelText(raw);

  // Preserve the complete HTML artifact. When several HTML fences exist,
  // prefer the first complete document because extractPages() owns multi-page
  // extraction. Never reconstruct the document by stripping script/style tags.
  const fences: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(HTML_FENCE.source, "gi");
  while ((m = re.exec(raw))) {
    const body = (m[1] ?? "").trim();
    if (body) fences.push(body);
  }

  const complete = fences.filter((f) => looksLikeHtml(f) && /<head[\s>][\s\S]*<body[\s>][\s\S]*<\/body>[\s>][\s\S]*<\/html>/i.test(f));
  if (complete.length) return complete[0]!;

  const candidate = fences.find((f) => looksLikeHtml(f) || f.includes("<body") || f.includes("<main") || f.includes("<div"));
  if (candidate) return candidate;

  const trimmed = raw.trim();
  if (looksLikeHtml(trimmed)) return trimmed;
  return null;
}

export function extractPages(raw: string): Array<{ title: string; path: string; html: string }> {
  raw = sanitizeModelText(raw);
  const pages: Array<{ title: string; path: string; html: string }> = [];
  const re = new RegExp(HTML_FENCE.source, "gi");
  let match: RegExpExecArray | null;

  while ((match = re.exec(raw))) {
    const html = (match[1] ?? "").trim();
    if (!html || (!looksLikeHtml(html) && !html.includes("<body") && !html.includes("<main") && !html.includes("<div"))) continue;
    const title = extractTitle(html, `หน้า ${pages.length + 1}`);
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `page-${pages.length + 1}`;
    const path = pages.length === 0 ? "/" : `/${slug}`;

    // Keep each page as the original artifact. No tag stripping or JS
    // reconstruction happens here, so preview and stored pages remain faithful.
    pages.push({ title, path, html });
  }

  // If the model returned one complete HTML document without a fence, keep it.
  if (pages.length === 0) {
    const html = extractHtml(raw);
    if (html) pages.push({ title: extractTitle(html, "หน้าแรก"), path: "/", html });
  }

  return pages;
}

export function extractSuggestions(raw: string): Suggestion[] {
  const m = raw.match(SUGGEST_FENCE);
  if (!m?.[1]) return [];
  try {
    const parsed = JSON.parse(m[1]) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const rec = item as { label?: unknown; prompt?: unknown };
        const label = typeof rec.label === "string" ? rec.label.trim() : "";
        const prompt = typeof rec.prompt === "string" ? rec.prompt.trim() : "";
        if (!label || !prompt) return null;
        return { label: label.slice(0, 40), prompt };
      })
      .filter((x): x is Suggestion => x !== null)
      .slice(0, 6);
  } catch {
    return [];
  }
}

export function extractDisplayText(raw: string): string {
  let text = sanitizeModelText(raw)
    .replace(SUGGEST_FENCE, "")
    .replace(/\`\`\`(?:html|htm|xml)?\s*\n[\s\S]*?\`\`\`/gi, "")
    .trim();

  // Keep generated source out of the chat bubble. Source belongs in Preview.
  const sourceTokens = [
    "<!doctype", "<html", "<head", "<body", "<script", "<style",
    "<div", "<section", "<main", "document.getElementById",
    "querySelector(", "addEventListener(", "const ", "let ", "var ", "function "
  ];

  let sourceStart = -1;
  const lower = text.toLowerCase();
  for (const token of sourceTokens) {
    const index = lower.indexOf(token.toLowerCase());
    if (index >= 0 && (sourceStart < 0 || index < sourceStart)) sourceStart = index;
  }

  if (sourceStart >= 0) {
    const before = text.slice(0, sourceStart).trim();
    return before || "สร้างให้แล้ว ดูผลลัพธ์ได้ที่พรีวิว";
  }

  const inlineTokens = ["if (", "else {", "for (", "const ", "let ", "function ", "${"];
  let inlineCodeStart = -1;
  for (const token of inlineTokens) {
    const index = text.indexOf(token);
    if (index > 24 && (inlineCodeStart < 0 || index < inlineCodeStart)) inlineCodeStart = index;
  }

  if (inlineCodeStart > 24) {
    const before = text.slice(0, inlineCodeStart).trim();
    if (before.length >= 8) return before;
  }

  const codeSignals =
    ["=>", "const ", "let ", "function ", "return ", "html +=", "if ("].filter((token) => text.includes(token)).length +
    (text.match(/<[A-Za-z]/g) ?? []).length;

  if (codeSignals >= 4) {
    return "สร้างให้แล้ว ดูผลลัพธ์ได้ที่พรีวิว";
  }

  text = text.replace(/\`\`\`[\s\S]*?\`\`\`/g, "").trim();
  return text;
}

export function extractTitle(html: string, fallback: string): string {
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
  if (title) return title.slice(0, 80);
  const h1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1]?.trim();
  if (h1) return h1.slice(0, 80);
  return fallback;
}

export function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}


export function extractJavaScript(html: string): string {
  const results: string[] = [];
  let cursor = 0;
  const lower = html.toLowerCase();

  while (cursor < html.length) {
    const open = lower.indexOf("<script", cursor);
    if (open < 0) break;
    const openEnd = html.indexOf(">", open);
    if (openEnd < 0) break;
    const close = lower.indexOf("</script>", openEnd + 1);
    if (close < 0) break;
    const body = html.slice(openEnd + 1, close).trim();
    if (body) results.push(body);
    cursor = close + 9;
  }

  return results.join("\n\n");
}

export function extractMarkdown(raw: string): string {
  const cleaned = raw.replace(SUGGEST_FENCE, "").replace(/```(?:html|htm|xml|javascript|js|typescript|ts)?\s*\n[\s\S]*?```/gi, "").trim();
  const htmlAt = cleaned.search(/<!doctype|<html|<body|<div|<main|<section/i);
  return (htmlAt > 0 ? cleaned.slice(0, htmlAt) : cleaned).replace(/<[^>]+>/g, "").trim();
}

export function extractImplementation(raw: string, html: string): string {
  const js = extractJavaScript(html);
  return js ? "HTML\n\n" + html + "\n\nJavaScript\n\n" + js : html || raw;
}


export type ArtifactExtractionEvidence = {
  htmlFound: boolean;
  htmlFenceCount: number;
  pageCount: number;
  scriptBlockCount: number;
  extractedJavaScriptChars: number;
  preservedHtml: boolean;
};

export function inspectArtifactExtraction(raw: string): ArtifactExtractionEvidence {
  const cleaned = sanitizeModelText(raw);
  const fenceMatches = cleaned.match(new RegExp(HTML_FENCE.source, "gi")) ?? [];
  const html = extractHtml(cleaned);
  const pages = extractPages(cleaned);
  const scriptBlocks = html?.match(/<script\b/gi)?.length ?? 0;
  const javascript = html ? extractJavaScript(html) : "";

  return {
    htmlFound: Boolean(html),
    htmlFenceCount: fenceMatches.length,
    pageCount: pages.length,
    scriptBlockCount: scriptBlocks,
    extractedJavaScriptChars: javascript.length,
    preservedHtml: Boolean(html && /<style\b/i.test(html) && (!scriptBlocks || /<script\b/i.test(html))),
  };
};
