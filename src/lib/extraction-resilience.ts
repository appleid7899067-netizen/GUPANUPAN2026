export type ExtractionFailureKind =
  | "NETWORK"
  | "TIMEOUT"
  | "RATE_LIMIT"
  | "BLOCKED"
  | "AUTH"
  | "DOM_CHANGED"
  | "API_SCHEMA_CHANGED"
  | "NULL_DATA"
  | "PAGINATION"
  | "DUPLICATE_DATA"
  | "VALIDATION"
  | "UNKNOWN";

export type ExtractionLesson = {
  target: string;
  kind: ExtractionFailureKind;
  cause: string;
  strategy: string;
  evidence?: string;
  at: string;
};

const STORAGE_KEY = "gupanu.extraction.lessons";
const MAX_LESSONS = 50;

export function classifyExtractionFailure(error: string, status?: number): ExtractionFailureKind {
  const t = String(error).toLowerCase();
  if (status === 429 || /rate.?limit|too many requests|429/.test(t)) return "RATE_LIMIT";
  if (status === 401 || status === 403 || /unauthorized|forbidden|api key|authentication/.test(t)) return "AUTH";
  if (/cloudflare|captcha|bot detected|access denied|blocked/.test(t)) return "BLOCKED";
  if (status && status >= 500 || /timeout|timed out|econnreset|gateway|502|503|504/.test(t)) return "TIMEOUT";
  if (/network|fetch failed|connection|dns|socket/.test(t)) return "NETWORK";
  if (/selector|element.*not found|dom|css|xpath/.test(t)) return "DOM_CHANGED";
  if (/json|schema|unexpected.*field|parse/.test(t)) return "API_SCHEMA_CHANGED";
  if (/null|undefined|missing|required field|empty/.test(t)) return "NULL_DATA";
  if (/pagination|cursor|next page|duplicate page/.test(t)) return "PAGINATION";
  if (/duplicate|already exists/.test(t)) return "DUPLICATE_DATA";
  if (/validation|invalid data|quality gate/.test(t)) return "VALIDATION";
  return "UNKNOWN";
}

export function extractionRecoveryPlan(kind: ExtractionFailureKind): string[] {
  const plans: Record<ExtractionFailureKind, string[]> = {
    NETWORK: ["retry with exponential backoff", "reduce request concurrency", "validate response before parsing"],
    TIMEOUT: ["increase timeout within a safe bound", "retry with exponential backoff", "switch to an available API or cached/public source"],
    RATE_LIMIT: ["respect Retry-After when present", "back off and reduce request rate", "do not hammer the source"],
    BLOCKED: ["stop repeated requests", "use an authorized API/public endpoint", "report access restriction if no permitted path exists"],
    AUTH: ["refresh/verify credentials", "check required permissions", "use an authorized fallback source"],
    DOM_CHANGED: ["prefer stable data attributes or semantic anchors", "try an alternate selector", "validate extracted fields before accepting"],
    API_SCHEMA_CHANGED: ["inspect actual response shape", "parse optional fields safely", "keep a versioned/fallback parser"],
    NULL_DATA: ["treat missing fields as nullable", "record the missing field", "continue independent records when safe"],
    PAGINATION: ["track page/cursor identifiers", "stop on repeated cursor/page", "validate progress before requesting the next page"],
    DUPLICATE_DATA: ["deduplicate by stable key", "record duplicate count", "stop if pagination repeats"],
    VALIDATION: ["measure completeness and required fields", "discard or quarantine invalid records", "retry only the failed extraction path"],
    UNKNOWN: ["capture concrete error and response evidence", "make the smallest safe change", "retry once with a different extraction strategy"],
  };
  return plans[kind];
}

export function validateExtractedData<T extends Record<string, unknown>>(
  rows: T[],
  requiredFields: string[] = [],
) {
  const seen = new Set<string>();
  let duplicateCount = 0;
  let missingRequired = 0;

  for (const row of rows) {
    const key = typeof row.id === "string" ? row.id : JSON.stringify(row);
    if (seen.has(key)) duplicateCount++;
    seen.add(key);
    if (requiredFields.some((f) => row[f] == null || String(row[f]).trim() === "")) missingRequired++;
  }

  const total = rows.length;
  const missingRatio = total ? missingRequired / total : 1;
  const duplicateRatio = total ? duplicateCount / total : 0;

  return {
    ok: total > 0 && missingRatio <= 0.25 && duplicateRatio <= 0.1,
    total,
    missingRequired,
    missingRatio,
    duplicateCount,
    duplicateRatio,
    evidence: [
      `records=${total}`,
      `missing_required=${missingRequired}`,
      `duplicates=${duplicateCount}`,
    ],
  };
}

export function extractionDefensivePrompt(target: string): string {
  return [
    "=== ADAPTIVE DATA EXTRACTION ENGINE ===",
    "Principle: learn from failures, never repeat the same failed extraction path.",
    `Target: ${target}`,
    "1. Analyze the target and output contract before extracting.",
    "2. Retrieve relevant failure lessons before choosing selectors, API parsing, pagination, or browser automation.",
    "3. Prefer an official/authorized API or structured endpoint when available.",
    "4. Use resilient selectors and semantic/data attributes instead of generated CSS classes.",
    "5. Handle timeout, network errors, 429, 5xx, blocked access, malformed JSON, null fields, pagination loops, and duplicates.",
    "6. Never bypass CAPTCHA, Cloudflare, authentication, robots/access controls, or other protections. Switch to an authorized source or stop with evidence.",
    "7. Validate record count, required fields, duplicates, and null ratio before declaring success.",
    "8. If extraction fails, classify the failure, change strategy, record the lesson, retry only within a bounded recovery budget, then verify again.",
    "9. Never claim successful extraction from HTTP 200 alone.",
    "=== END ADAPTIVE DATA EXTRACTION ENGINE ===",
  ].join("\n");
}

export function getExtractionLessons(target: string): ExtractionLesson[] {
  if (typeof window === "undefined") return [];
  try {
    const all = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]") as ExtractionLesson[];
    const needle = target.toLowerCase();
    return all.filter((x) => x.target.toLowerCase().includes(needle) || needle.includes(x.target.toLowerCase())).slice(-8);
  } catch {
    return [];
  }
}

export function rememberExtractionFailure(lesson: Omit<ExtractionLesson, "at">): void {
  if (typeof window === "undefined") return;
  try {
    const all = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]") as ExtractionLesson[];
    const next = [...all, { ...lesson, at: new Date().toISOString() }].slice(-MAX_LESSONS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Memory is an enhancement; extraction must continue if storage is unavailable.
  }
}
