/**
 * src/lib/agent-export.ts — ส่งออกโปรเจกต์ให้ทำงานต่อด้วย docker-agent + บัญชี Puter
 *
 * บิลเดอร์นี้สร้างแอป HTML ไฟล์เดียวในเบราว์เซอร์ ส่วน docker-agent
 * (github.com/docker/docker-agent) เป็น agent ฝั่งเทอร์มินัลที่ใช้โมเดลผ่านบัญชี Puter ได้เหมือนกัน
 * — ไฟล์ที่ส่งออกจึงเป็น "ชุดเริ่มงาน" ที่รันต่อได้ทันที:
 *
 *   puter/puter-login.mjs   ล็อกอิน Puter → puter/.env.puter
 *   agent.yaml              provider/model/toolsets พร้อมใช้
 *   README.md               ขั้นตอนรัน
 *   index.html              โค้ดปัจจุบันของโปรเจกต์
 */

import type { BuildProject } from "./builder";
import { getBuildMode } from "./build-modes";

export const PUTER_BASE_URL = "https://api.puter.com/puterai/openai/v1/";
export const DEFAULT_AGENT_MODEL = "gpt-5.4-nano";
/** ชื่อไฟล์/โฟลเดอร์ใน zip ที่ส่งออก */
export const AGENT_KIT_DIR = "agent-kit";
export const AGENT_KIT_FILES = ["puter/puter-login.mjs", "puter/run-agent.sh"] as const;

export interface AgentKitOptions {
  /** โมเดลของ Puter ที่จะใช้ (ชื่อตามที่ Puter เปิดให้ใช้) */
  model?: string;
  /** id ของโหมดสร้าง เพื่อให้ agent รู้ว่ากำลังทำอะไรอยู่ */
  mode?: string;
  /** ชื่อ agent ในไฟล์ yaml */
  agentName?: string;
}

/** ตัดอักขระควบคุมและจำกัดความยาว ก่อนฝังข้อความของผู้ใช้ลง YAML */
export function sanitizeForYaml(text: string, max = 160): string {
  return text
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** สตริง YAML ที่ปลอดภัย: ใช้ double-quoted scalar ของ JSON (เป็น subset ที่ถูกต้องของ YAML) */
export function yamlString(value: string): string {
  return JSON.stringify(value);
}

/** คำสั่ง (instruction) ของ agent — สรุปจากชื่อโปรเจกต์ โหมด และคำสั่งล่าสุดของผู้ใช้ */
export function buildAgentInstruction(project: BuildProject, modeId?: string): string {
  const mode = getBuildMode(modeId);
  const requests = project.messages
    .filter((message) => message.role === "user")
    .slice(-5)
    .map((message) => `- ${sanitizeForYaml(message.content, 120)}`);

  return [
    `You maintain a multi-file static web app called "${sanitizeForYaml(project.name, 60)}" that was built with the GUPANUPAN2026 browser builder (mode: ${mode.label}).`,
    "The app is a set of static files (index.html plus styles.css / app.js / extra pages): no build step, no external assets, no network calls.",
    "Rules:",
    "- Read the relevant files (index.html and any css/js/pages involved) before editing, then change the smallest possible part.",
    "- Keep the CSP-friendly constraints of the preview: no external scripts/styles/fonts, no fetch, no cookies or localStorage for app state.",
    "- Preserve existing behaviour unless the user asks to remove it.",
    "- After editing, run the checks the user has (npm test / your own review) and summarise the change in Thai.",
    requests.length ? "Requests handled so far:" : "No requests recorded yet.",
    ...requests,
  ].join("\n");
}

/** ไฟล์ agent.yaml ที่ใช้ได้กับ docker-agent (provider Puter แบบ OpenAI-compatible) */
export function buildAgentYaml(project: BuildProject, opts: AgentKitOptions = {}): string {
  const model = sanitizeForYaml(opts.model || DEFAULT_AGENT_MODEL, 80) || DEFAULT_AGENT_MODEL;
  const agentName = sanitizeForYaml(opts.agentName || "root", 40) || "root";
  const instruction = buildAgentInstruction(project, opts.mode);

  return [
    `# สร้างจาก GUPANUPAN2026 (${sanitizeForYaml(project.name, 60)}) — ใช้บัญชี Puter เป็นโมเดล`,
    "# 1) node puter/puter-login.mjs     2) ./puter/run-agent.sh \"ช่วยปรับ index.html ให้ ...\"",
    "providers:",
    "  puter:",
    "    provider: openai",
    "    # ต้องเป็น chat completions: endpoint ของ Puter ไม่รองรับ Responses API",
    "    api_type: openai_chatcompletions",
    `    base_url: ${PUTER_BASE_URL}`,
    "    token_key: PUTER_AUTH_TOKEN",
    "models:",
    "  project_model:",
    "    provider: puter",
    `    model: ${yamlString(model)}`,
    "    max_tokens: 16384",
    "    provider_opts:",
    "      context_size: 200000",
    "agents:",
    `  ${agentName}:`,
    "    model: project_model",
    `    description: ${yamlString(`ผู้ดูแลโปรเจกต์ ${project.name}`.slice(0, 80))}`,
    `    instruction: ${yamlString(instruction)}`,
    "    toolsets:",
    "      - type: filesystem",
    "      - type: think",
    "      - type: todo",
    "",
  ].join("\n");
}

/** คู่มือสั้น ๆ ที่แนบไปกับชุดไฟล์ (ภาษาไทย) */
export function buildHandoffReadme(project: BuildProject, opts: AgentKitOptions = {}): string {
  const mode = getBuildMode(opts.mode);
  const model = opts.model || DEFAULT_AGENT_MODEL;

  return `# ${project.name} — ชุดทำงานต่อด้วย docker-agent + Puter

โปรเจกต์นี้ถูกสร้างในเบราว์เซอร์ (GUPANUPAN2026) เป็นแอปสถิตหลายไฟล์
โฟลเดอร์นี้ช่วยให้คุณทำงานต่อด้วย agent ฝั่งเทอร์มินัล โดยใช้ **บัญชี Puter** ของคุณเป็นผู้จ่ายค่าโมเดล
(ไม่ต้องมี API key ของ OpenAI / Anthropic / Google)

- โหมดที่ใช้ตอนสร้าง: ${mode.label}
- โมเดลที่ตั้งไว้: ${model}
- ไฟล์แอป: ${Object.keys(project.files).join(", ")} (หน้าหลักคือ index.html เปิดในเบราว์เซอร์ดูผลได้ทันที)

## ขั้นตอน

\`\`\`bash
# 1) ติดตั้ง docker-agent (เลือกอย่างใดอย่างหนึ่ง)
#    - Docker Desktop 4.63+  → ใช้คำสั่ง \`docker agent\`
#    - Homebrew              → brew install docker-agent
#    - binary                → https://github.com/docker/docker-agent/releases

# 2) ล็อกอิน Puter แล้วเก็บ token (ต้องมี Node.js 20+)
cd puter && npm install --no-save @heyputer/puter.js open && cd ..
node puter/puter-login.mjs

# 3) เริ่ม agent บนโปรเจกต์นี้
./puter/run-agent.sh "ช่วยเพิ่มหน้าติดต่อเราใน index.html แล้วสรุปเป็นภาษาไทย"
\`\`\`

ถ้าไม่มีสคริปต์ (เช่นดาวน์โหลดแยก) ให้สร้าง token เองที่ https://puter.com/dashboard แล้วรัน:

\`\`\`bash
printf 'PUTER_AUTH_TOKEN=%s\\n' 'วาง_TOKEN_ที่นี่' > puter/.env.puter
docker agent run --env-from-file puter/.env.puter agent.yaml
\`\`\`

## ข้อควรระวัง

- token ของ Puter = สิทธิ์ในบัญชีคุณ ห้ามแชร์หรือ commit (ไฟล์ \`.env.puter\` ถูก ignore ไว้แล้ว)
- ค่าใช้จ่าย/โควตาของโมเดลเป็นไปตามบัญชี Puter ของคุณ
- แอปถูกออกแบบให้ทำงานแบบเอกสารเดียว: ไม่มี fetch/CDN/localStorage — agent ควรทำตามกติกาเดียวกัน
`;
}

/** ประวัติคำสั่งล่าสุด (ใช้แสดงบน UI ก่อนส่งออก) */
export function recentRequests(project: BuildProject, limit = 3): string[] {
  return project.messages
    .filter((message) => message.role === "user")
    .slice(-limit)
    .map((message) => message.content);
}

/* ------------------------------------------------------------------ */
/* การทดสอบ: ตรวจสถานะความพร้อมของชุดไฟล์                             */
/* ------------------------------------------------------------------ */

export interface KitPart {
  path: string;
  content: string;
}

/**
 * ตรวจว่าชุดไฟล์ครบและ YAML อ้างถึงสิ่งที่ประกาศจริง
 * (ใช้กับเทสต์และกับปุ่ม "ตรวจชุดไฟล์" ได้โดยไม่ต้องมีเบราว์เซอร์)
 */
export function validateAgentKit(parts: KitPart[]): { ok: boolean; problems: string[] } {
  const problems: string[] = [];
  const yaml = parts.find((part) => part.path.endsWith("agent.yaml"));
  if (!yaml) problems.push("ไม่พบ agent.yaml");
  else {
    for (const needle of [
      "providers:",
      "api_type: openai_chatcompletions",
      `base_url: ${PUTER_BASE_URL}`,
      "token_key: PUTER_AUTH_TOKEN",
      "models:",
      "agents:",
    ]) {
      if (!yaml.content.includes(needle)) problems.push(`agent.yaml ขาด "${needle}"`);
    }
  }
  if (!parts.some((part) => part.path.endsWith("index.html")))
    problems.push("ไม่พบ index.html");
  if (!parts.some((part) => part.path.endsWith("README.md"))) problems.push("ไม่พบ README.md");
  return { ok: problems.length === 0, problems };
}
