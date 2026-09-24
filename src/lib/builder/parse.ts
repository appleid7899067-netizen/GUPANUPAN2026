import type { Suggestion } from "./types";

const HTML_FENCE = /```(?:html|htm|xml)?\s*\n([\s\S]*?)```/gi;
const SUGGEST_FENCE = /```suggestions\s*\n([\s\S]*?)```/i;

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
  const fences: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(HTML_FENCE.source, "gi");
  while ((m = re.exec(raw))) {
    const body = (m[1] ?? "").trim();
    if (body) fences.push(body);
  }
  for (let i = fences.length - 1; i >= 0; i--) {
    const f = fences[i]!;
    if (looksLikeHtml(f) || f.includes("<body") || f.includes("<div")) return f;
  }
  const trimmed = raw.trim();
  if (looksLikeHtml(trimmed)) return trimmed;
  return null;
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
  let text = raw
    .replace(SUGGEST_FENCE, "")
    .replace(/\`\`\`(?:html|htm|xml)?\\s*\\n[\\s\\S]*?\`\`\`/gi, "")
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

  text = text.replace(/\`\`\`[\\s\\S]*?\`\`\`/g, "").trim();
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
  const cleaned = raw.replace(SUGGEST_FENCE, "").replace(/```(?:html|htm|xml|javascript|js|typescript|ts)?\\s*\\n[\\s\\S]*?```/gi, "").trim();
  const htmlAt = cleaned.search(/<!doctype|<html|<body|<div|<main|<section/i);
  return (htmlAt > 0 ? cleaned.slice(0, htmlAt) : cleaned).replace(/<[^>]+>/g, "").trim();
}

export function extractImplementation(raw: string, html: string): string {
  const js = extractJavaScript(html);
  return js ? "HTML\n\n" + html + "\n\nJavaScript\n\n" + js : html || raw;
}
