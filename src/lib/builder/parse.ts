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
    .replace(/\`\`\`(?:html|htm|xml)?\s*\n[\s\S]*?\`\`\`/gi, "")
    .trim();

  // Some models omit code fences. Never dump generated HTML, JSON data, or
  // JavaScript into the conversation bubble. Those artifacts belong in preview.
  const sourceStart = text.search(
    /(?:<!doctype|<html|<head|<body|<script|<style|<div|<section|<main|(?:^|\\n)\\s*[\\[{].*(?:question|answers|correct|explanation)\\s*[:"]|(?:^|\\n)\\s*(?:const|let|var|function)\\s+[A-Za-z_$]|document\\.getElementById|querySelector\\(|addEventListener\\()/i,
  );
  if (sourceStart >= 0) {
    const before = text.slice(0, sourceStart).trim();
    return before || "สร้างให้แล้ว ดูผลลัพธ์ได้ที่พรีวิว";
  }

  // Some models append raw implementation without a code fence.
  // Chat should show the useful result, while source stays in Preview.
  const inlineCodeStart = text.search(
    /(?:\\bif\\s*\\(|\\belse\\s*\\{|\\bfor\\s*\\(|\\bconst\\s+[A-Za-z_$][\\w$]*\\s*=|\\blet\\s+[A-Za-z_$][\\w$]*\\s*=|\\bfunction\\s+[A-Za-z_$]|\\.join\\(\\s*["']\\\\n|\\$\\{[^}]+\\})/i,
  );
  if (inlineCodeStart > 24) {
    const before = text.slice(0, inlineCodeStart).trim();
    if (before.length >= 8) return before;
  }

  const codeSignals = (text.match(/(?:=>|\\bconst\\b|\\blet\\b|\\bfunction\\b|\\breturn\\b|\\bif\\s*\\(|\\bhtml\\s*\\+=|<\\/?[A-Za-z][^>]*>)/g) ?? []).length;
  if (codeSignals >= 4) {
    return "สร้างให้แล้ว ดูผลลัพธ์ได้ที่พรีวิว";
  }

  text = text.replace(/\\`\\`\\`[\\s\\S]*?\\`\\`\\`/g, "").trim();
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
