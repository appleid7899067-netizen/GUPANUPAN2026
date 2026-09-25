/**
 * BOSSNU Unified Self-Healing Runtime
 * Telemetry -> classify -> minimize context -> targeted patch -> verify -> bounded retry.
 *
 * This module is provider/sandbox agnostic. A WebContainer/Sandpack adapter can feed
 * build, static-analysis, and runtime events into it without changing Boss Engine.
 */

export type TelemetryKind = "build" | "static" | "runtime";
export type ErrorClass = "dependency" | "syntax" | "type" | "runtime" | "unknown";

export type TelemetryEvent = {
  kind: TelemetryKind;
  message: string;
  file?: string;
  line?: number;
  column?: number;
  stack?: string;
  code?: string;
  timestamp?: number;
};

export type ErrorDiagnosis = {
  classification: ErrorClass;
  summary: string;
  targetFile?: string;
  line?: number;
  contextBefore: number;
  contextAfter: number;
  evidence: string[];
};

export type TargetedSnippet = {
  file: string;
  startLine: number;
  endLine: number;
  code: string;
};

export type BossPatch = {
  file: string;
  search: string;
  replace: string;
  reason: string;
};

export type HealingAttempt = {
  attempt: number;
  maxAttempts: number;
  diagnosis: ErrorDiagnosis;
  snippets: TargetedSnippet[];
  patches: BossPatch[];
  verified: boolean;
};

export const MAX_HEALING_ATTEMPTS = 3;

export function classifyTelemetry(event: TelemetryEvent): ErrorClass {
  const message = `${event.message} ${event.stack ?? ""}`.toLowerCase();
  if (/cannot find module|module not found|failed to resolve|does not exist|import .* from/.test(message)) return "dependency";
  if (/syntaxerror|unexpected token|parse error|unterminated|expected .*[;,)\]}]/.test(message)) return "syntax";
  if (/type .* is not assignable|property .* does not exist|cannot find name|ts\d{4}/.test(message)) return "type";
  if (event.kind === "runtime" || /referenceerror|typeerror|runtime|is not a function|null|undefined/.test(message)) return "runtime";
  return "unknown";
}

export function diagnoseTelemetry(event: TelemetryEvent): ErrorDiagnosis {
  const classification = classifyTelemetry(event);
  const summary = event.message.split("\n")[0]?.trim().slice(0, 240) || "Unknown error";
  const evidence = [`kind=${event.kind}`, `class=${classification}`];
  if (event.file) evidence.push(`file=${event.file}`);
  if (event.line) evidence.push(`line=${event.line}`);
  return {
    classification,
    summary,
    targetFile: event.file,
    line: event.line,
    contextBefore: 10,
    contextAfter: 10,
    evidence,
  };
}

export function extractTargetedSnippet(code: string, file: string, line = 1, before = 10, after = 10): TargetedSnippet {
  const lines = code.split("\n");
  const center = Math.max(1, Math.min(line, Math.max(1, lines.length)));
  const start = Math.max(1, center - before);
  const end = Math.min(lines.length, center + after);
  return { file, startLine: start, endLine: end, code: lines.slice(start - 1, end).join("\n") };
}

export function extractStackFiles(stack = ""): string[] {
  const files = new Set<string>();
  for (const line of stack.split("\n")) {
    const m = line.match(/(?:at\s+.*?\()?((?:src|app|components|lib|pages)[^\s):]+\.(?:tsx?|jsx?|css|json))/);
    if (m?.[1]) files.add(m[1]);
  }
  return [...files];
}

export function canHeal(attempt: number, maxAttempts = MAX_HEALING_ATTEMPTS): boolean {
  return attempt < maxAttempts;
}

export function applySearchReplacePatch(source: string, patch: BossPatch): { ok: boolean; content: string; reason: string } {
  if (!patch.search) return { ok: false, content: source, reason: "Empty search target" };
  const first = source.indexOf(patch.search);
  if (first < 0) return { ok: false, content: source, reason: `Search target not found in ${patch.file}` };
  const second = source.indexOf(patch.search, first + patch.search.length);
  if (second >= 0) return { ok: false, content: source, reason: `Search target is ambiguous in ${patch.file}` };
  return {
    ok: true,
    content: source.slice(0, first) + patch.replace + source.slice(first + patch.search.length),
    reason: patch.reason,
  };
}

/**
 * Generates a strict patch-only contract for the remediation model.
 * The model must return JSON and must not rewrite unrelated files.
 */
export function buildRemediationPrompt(diagnosis: ErrorDiagnosis, snippets: TargetedSnippet[]): string {
  return [
    "BOSSNU REMEDIATION CONTRACT",
    "Return JSON only: {\"patches\":[{\"file\":\"...\",\"search\":\"exact existing text\",\"replace\":\"replacement text\",\"reason\":\"...\"}]}",
    "Patch only the smallest necessary surface. Do not rewrite full files.",
    "Preserve existing working features and public interfaces.",
    `Error class: ${diagnosis.classification}`,
    `Error: ${diagnosis.summary}`,
    `Evidence: ${diagnosis.evidence.join(" | ")}`,
    "Targeted snippets:",
    ...snippets.map((s) => `FILE ${s.file} L${s.startLine}-${s.endLine}\n${s.code}`),
  ].join("\n\n");
}

/**
 * Browser-side telemetry bridge for generated preview iframes.
 * It intentionally does not expose the parent application's secrets.
 */
export function previewTelemetryScript(): string {
  return `<script>
(() => {
  const send = (event) => window.parent?.postMessage({ source: "bossnu-preview", ...event }, "*");
  window.addEventListener("error", (e) => send({ kind: "runtime", message: e.message || "Runtime error", stack: e.error?.stack || "" }));
  window.addEventListener("unhandledrejection", (e) => send({ kind: "runtime", message: String(e.reason?.message || e.reason || "Unhandled rejection"), stack: e.reason?.stack || "" }));
  const original = console.error;
  console.error = (...args) => {
    try { send({ kind: "runtime", message: args.map(String).join(" ") }); } catch {}
    original(...args);
  };
})();
</script>`;
}
