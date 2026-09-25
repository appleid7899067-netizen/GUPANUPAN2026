import { classifyBossIntent, createBossRuntime, type BossIntent, type BossRuntime } from "@/lib/boss-engine";
import { buildWorldPlan } from "@/lib/boss-unified-core";

export type BossCoreMode = "chat" | "build" | "edit" | "research" | "debug" | "clone";

export type BossCorePlan = {
  mode: BossCoreMode;
  intent: BossIntent;
  goal: string;
  referenceUrl?: string;
  phases: string[];
  context: string[];
  constraints: string[];
  verify: string[];
};

const URL_RE = /https?:\/\/[^\s<>"']+/i;

function cleanUrl(value: string): string | undefined {
  const match = value.match(URL_RE);
  if (!match) return undefined;
  return match[0].replace(/[),.;]+$/, "");
}

function detectMode(prompt: string, intent: BossIntent, referenceUrl?: string): BossCoreMode {
  const t = prompt.toLowerCase();
  if (referenceUrl && /clone|โคลน|เหมือน|ถอดแบบ|อ้างอิง|reference/.test(t)) return "clone";
  if (intent === "debug") return "debug";
  if (intent === "research" || intent === "search") return "research";
  if (intent === "edit") return "edit";
  if (intent === "build") return "build";
  return "chat";
}

function inferContext(prompt: string, history: { role: string; content: string }[], html: string): string[] {
  const context: string[] = [];
  if (html.trim()) context.push("Existing generated app is available. Preserve working behavior and modify only what the user requested.");
  const recent = history.slice(-6).map((m) => m.content).filter(Boolean);
  if (recent.length) context.push("Recent conversation context is authoritative for continuity: " + recent.join(" | ").slice(0, 4500));
  if (/mobile|มือถือ|โทรศัพท์/.test(prompt.toLowerCase())) context.push("Mobile-first constraints are explicit.");
  if (/desktop|คอม|เดสก์ท็อป/.test(prompt.toLowerCase())) context.push("Desktop layout constraints are explicit.");
  return context;
}

function inferConstraints(prompt: string): string[] {
  const t = prompt.toLowerCase();
  const out = [
    "Preserve existing working features unless explicitly asked to remove them.",
    "Do not invent completed actions or verification evidence.",
    "Use the user's concrete nouns, audience, content, and requested behavior as the source of truth.",
  ];
  if (/ไม่เอา|without|no /.test(t)) out.push("Honor explicit exclusions in the user's request.");
  if (/รูป|image|ภาพ/.test(t)) out.push("Treat requested imagery as structural content, not empty placeholders.");
  if (/ลิงก์|url|website|เว็บ/.test(t)) out.push("Treat supplied URLs as reference/context inputs, not as permission to claim a site was cloned unless it was actually inspected.");
  return out;
}

function inferPhases(mode: BossCoreMode): string[] {
  switch (mode) {
    case "clone":
      return ["Understand request", "Inspect reference", "Extract structure and visual language", "Adapt content and behavior", "Build", "Preview", "Verify"];
    case "research":
      return ["Understand request", "Search/inspect", "Synthesize evidence", "Apply findings", "Verify"];
    case "debug":
      return ["Reproduce/inspect", "Diagnose", "Change smallest relevant part", "Run/observe", "Verify"];
    case "edit":
      return ["Understand requested delta", "Preserve existing app", "Edit", "Preview", "Verify"];
    case "build":
      return ["Understand product", "Plan information architecture", "Build", "Preview", "Verify"];
    default:
      return ["Understand request", "Respond"];
  }
}

export function buildBossCorePlan(
  prompt: string,
  history: { role: string; content: string }[] = [],
  html = "",
): BossCorePlan {
  const intent = classifyBossIntent(prompt);
  const referenceUrl = cleanUrl(prompt);
  const mode = detectMode(prompt, intent, referenceUrl);
  return {
    mode,
    intent,
    goal: prompt.trim(),
    referenceUrl,
    phases: inferPhases(mode),
    context: inferContext(prompt, history, html),
    constraints: inferConstraints(prompt),
    verify: [
      "Verify the generated artifact is complete before saving it.",
      "Verify requested interactions are represented by real behavior.",
      "Verify explicit user requirements were preserved.",
      "Never report success from model text alone.",
    ],
  };
}

/**
 * Additive agent-core contract. Existing Boss Engine remains the source of
 * runtime planning/model routing; this layer adds a higher-level control loop
 * without replacing it.
 */
export function validateBossArtifact(raw: string, prompt = "") {
  const html = /<!doctype html|<html[\s>]/i.test(raw);
  const complete = /<head[\s>][\s\S]*<body[\s>][\s\S]*<\/body>[\s>][\s\S]*<\/html>/i.test(raw);
  const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(raw);
  const hasTitle = /<title[\s>][\s\S]*<\/title>/i.test(raw);
  const hasUi = /<button|<a\b|<input|<nav|<main|<section/i.test(raw);
  const hasBehavior = /<script[\s>]|onclick=|addEventListener\s*\(|localStorage/i.test(raw);
  const interactiveRequest = /button|form|search|filter|toggle|login|cart|checkout|booking|chat|dashboard|แชท|ค้นหา|ปุ่ม|ฟอร์ม|ตะกร้า|จอง|ล็อกอิน/i.test(prompt);
  const evidence = [
    ...(html ? ["html_detected"] : []),
    ...(complete ? ["complete_document"] : []),
    ...(hasViewport ? ["viewport"] : []),
    ...(hasTitle ? ["title"] : []),
    ...(hasUi ? ["product_ui"] : []),
    ...(hasBehavior ? ["behavior_code"] : []),
  ];
  const ok = html && complete && hasViewport && hasTitle && hasUi && (!interactiveRequest || hasBehavior);
  return { ok, html, complete, hasViewport, hasTitle, hasUi, hasBehavior, interactiveRequest, evidence };
}

export function buildBossCoreContext(plan: BossCorePlan): string {
  const runtime: BossRuntime = createBossRuntime(plan.goal);
  return [
    "=== BOSS CORE ===",
    "Operating principle: understand -> plan -> act -> observe -> recover -> verify.",
    "UNIFIED WORLD CONTRACT: BOSSNU builds systems, not isolated screens. World surfaces: " + buildWorldPlan(plan.goal, plan.mode).surfaces.join(", "),
    "DESCRIBE AGENT CONTRACT: if the goal is ambiguous or lacks audience/outcome, ask up to 3 focused questions covering goal, people, and desired real-world outcome before committing to a build plan.",
    "Mode: " + plan.mode,
    "Intent: " + plan.intent,
    "Goal: " + plan.goal,
    plan.referenceUrl ? "Reference URL: " + plan.referenceUrl : "Reference URL: none",
    "Phases: " + plan.phases.join(" -> "),
    "Existing Boss Engine tier: " + runtime.tier,
    "Core context:",
    ...plan.context.map((x) => "- " + x),
    "Core constraints:",
    ...plan.constraints.map((x) => "- " + x),
    "Verification gate:",
    ...plan.verify.map((x) => "- " + x),
    plan.mode === "clone"
      ? "CLONE CONTRACT: inspect the reference first when a real browser/web tool is available. Extract information architecture, spacing rhythm, typography direction, visual hierarchy, component patterns, responsive behavior, and interaction ideas. Then create an original implementation that follows the user's requested content and changes. Do not copy proprietary text, branding, or assets unless authorized."
      : "",
    "MASTER TEMPLATE CONTRACT: choose information architecture before styling. Compose the product from AppShell, Header/Navigation, Hero/Overview, primary workspace, feature/content blocks, data surfaces, actions, states, and Footer when appropriate. For apps, prioritize a usable workspace over a decorative hero. For landing pages, prioritize narrative hierarchy and conversion. Every major block must have a reason to exist and must connect to the requested product.",
    "INTERACTION CONTRACT: primary controls must have real behavior. Use anchors, client-side state, localStorage, filtering, navigation, dialogs, forms, or feedback states where appropriate. Do not leave decorative buttons pretending to work.",
    "QUALITY CONTRACT: first render must be a finished product surface, not a wireframe. Avoid one giant vertical block when the product naturally needs cards, grids, split layouts, tabs, sidebars, or distinct sections.",
    "SELF-HEALING CONTRACT: telemetry -> classify -> minimize context -> targeted patch -> sandbox re-run -> verify. Prefer dependency fixes without LLM when deterministic; for syntax/type/runtime failures, send only the relevant file/stack snippet. Never rewrite unrelated files.",
    "PATCH CONTRACT: remediation should be expressed as exact search/replace patches, not whole-file rewrites. Apply one bounded change, then verify before another.",
    "LOOP GUARD: maximum self-healing attempts are 3. If the guard is exhausted, preserve the last known-good artifact and expose the concrete failure evidence.",
    "PUTER ZERO-CONFIG CONTRACT: generated apps may use window.BossnuBackend for auth, KV/document data, and file storage. Do not require users to configure third-party API keys for these baseline services.",
    "PUTER PUBLISH CONTRACT: publishing is a separate verified action. Build the artifact, verify it, then hand it to the Puter Hosting adapter. Never claim a .puter.site URL exists until the hosting operation returns evidence.",
    "Do not replace the existing Boss Engine. This is an additional control layer.",
    "=== END BOSS CORE ===",
  ].filter(Boolean).join("\n");
}
