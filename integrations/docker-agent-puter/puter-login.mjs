#!/usr/bin/env node
/**
 * puter-login.mjs — ล็อกอินบัญชี Puter แล้วดึง auth token มาใช้กับ docker-agent
 *
 * ทำไมต้องมีสคริปต์นี้
 *   docker-agent รับโมเดลผ่านตัวแปรสภาพแวดล้อม (Bearer token) เท่านั้น
 *   ปกติต้องไปก๊อป token จาก puter.com/dashboard เอง
 *   สคริปต์นี้เปิดเบราว์เซอร์ให้ล็อกอิน Puter แล้วเก็บ token ให้อัตโนมัติ
 *
 * ตัวอย่าง
 *   node puter-login.mjs              # ล็อกอิน (ถ้ามี token เดิมจะตรวจจับให้ก่อน)
 *   node puter-login.mjs --force      # ล็อกอินใหม่ทับของเดิม
 *   node puter-login.mjs --print      # ล็อกอินแล้วพิมพ์ token (ไม่เขียนไฟล์)
 *   node puter-login.mjs --verify     # ตรวจ token ที่มีอยู่ (env หรือ .env.puter)
 *   node puter-login.mjs --verify --ping   # ตรวจ + ยิงทดสอบจริง 1 ครั้งที่ endpoint
 *   node puter-login.mjs --set-token <token>   # ใช้ token ที่ก๊อปจาก dashboard
 *
 * ไฟล์ผลลัพธ์: .env.puter (chmod 600) — ห้าม commit ไฟล์นี้
 */

import { createRequire } from "node:module";
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ENV_FILE = resolve(HERE, ".env.puter");
const TOKEN_KEY = "PUTER_AUTH_TOKEN";
const API_BASE =
  process.env.PUTER_API_BASE ?? "https://api.puter.com/puterai/openai/v1/";
const PING_MODEL = process.env.PUTER_MODEL ?? "gpt-5.4-nano";
const GUI_ORIGIN = (process.env.PUTER_GUI_ORIGIN ?? "https://puter.com").replace(/\/+$/, "");
const LOGIN_TIMEOUT_MS = Number(process.env.PUTER_LOGIN_TIMEOUT_MS ?? 5 * 60 * 1000);

// SDK ของ Puter ทิ้ง promise ภายในไว้บ้าง (เช่น การเช็คสิทธิ์ RAO ตอนเน็ตถูกบล็อก)
// ทำให้มีข้อความ stack trace รบกวนจอโดยไม่เกี่ยวกับผลลัพธ์ — กลืนไว้ก่อนโหลด SDK
process.on("unhandledRejection", (reason) => {
  if (process.env.PUTER_DEBUG_ERRORS === "1") console.error("[puter]", reason);
});

const argv = process.argv.slice(2);
const has = (...flags) => flags.some((f) => argv.includes(f));
const valueOf = (flag) => {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
};

const C = (() => {
  const color =
    process.env.NO_COLOR ? false : process.stdout.isTTY === true || process.env.FORCE_COLOR === "1";
  return color
    ? {
        reset: "\x1b[0m",
        dim: "\x1b[2m",
        bold: "\x1b[1m",
        red: "\x1b[31m",
        green: "\x1b[32m",
        yellow: "\x1b[33m",
        cyan: "\x1b[36m",
      }
    : { reset: "", dim: "", bold: "", red: "", green: "", yellow: "", cyan: "" };
})();
const ok = (m) => console.log(`${C.green}✔${C.reset} ${m}`);
const warn = (m) => console.log(`${C.yellow}!${C.reset} ${m}`);
const bad = (m) => console.log(`${C.red}✘${C.reset} ${m}`);
const info = (m) => console.log(`${C.cyan}•${C.reset} ${m}`);
const head = (m) => console.log(`\n${C.bold}${m}${C.reset}`);

function usage(exitCode = 0) {
  console.log(`
${C.bold}puter-login${C.reset} — ล็อกอิน Puter เพื่อใช้โมเดลกับ docker-agent

${C.bold}ใช้งาน${C.reset}
  node puter-login.mjs [ตัวเลือก]

${C.bold}ตัวเลือก${C.reset}
  (ไม่ใส่)              ล็อกอินผ่านเบราว์เซอร์ แล้วบันทึก token ลง .env.puter
  --force, -f          ล็อกอินใหม่แม้จะมี token เดิมอยู่
  --print, -p          พิมพ์ token ออกทางจอ (ไม่เขียนไฟล์) — ระวังประวัติ shell
  --set-token <token>  บันทึก token ที่ก๊อปจาก puter.com/dashboard
  --verify             ตรวจ token ปัจจุบัน (จาก env ${TOKEN_KEY} หรือ .env.puter)
  --ping               ร่วมกับ --verify: ยิงทดสอบแชตจริง 1 ครั้ง (มีค่าใช้จ่ายเล็กน้อย)
  --sdk-login          ล็อกอินผ่าน getAuthToken() ของ SDK แทนวิธี localhost callback
  --json               แสดงผลลัพธ์แบบ JSON (ใช้กับ automation)
  --help, -h           แสดงข้อความนี้

${C.bold}ตัวแปรสภาพแวดล้อม${C.reset}
  PUTER_AUTH_TOKEN        token (ถ้าตั้งไว้ จะถูกใช้ก่อนไฟล์ .env.puter)
  PUTER_API_BASE          ค่าเริ่มต้น ${API_BASE}
  PUTER_MODEL             โมเดลที่ใช้ตอน --ping (ค่าเริ่มต้น ${PING_MODEL})
  PUTER_LOGIN_TIMEOUT_MS  เวลารอสูงสุดของการล็อกอิน (ค่าเริ่มต้น 300000)
  PUTER_GUI_ORIGIN        ต้นทางหน้าเว็บล็อกอิน (ค่าเริ่มต้น https://puter.com)
  NO_COLOR=1              ปิดสีในข้อความ (เหมาะกับ log/automation)
`);
  process.exit(exitCode);
}

const mask = (t) => (t.length <= 12 ? "***" : `${t.slice(0, 6)}…${t.slice(-4)} (${t.length} ตัวอักษร)`);

function readTokenFromEnv() {
  const t = (process.env[TOKEN_KEY] ?? "").trim();
  return t || null;
}

function readTokenFromFile() {
  if (!existsSync(ENV_FILE)) return null;
  const text = readFileSync(ENV_FILE, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    if (line.slice(0, eq).trim() !== TOKEN_KEY) continue;
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (v) return v;
  }
  return null;
}

function writeEnvFile(token) {
  const body = `# สร้างโดย puter-login.mjs — ไฟล์นี้มี token ส่วนตัว ห้าม commit/แชร์
# docker-agent ใช้ผ่าน:  docker-agent run --env-from-file .env.puter agent.yaml
${TOKEN_KEY}=${token}
`;
  writeFileSync(ENV_FILE, body, { encoding: "utf8", mode: 0o600 });
  try {
    chmodSync(ENV_FILE, 0o600);
  } catch {
    /* Windows ไม่รองรับ chmod — ข้ามได้ */
  }
  return ENV_FILE;
}

function looksLikeToken(t) {
  return typeof t === "string" && t.length >= 20 && !/\s/.test(t);
}

/* ------------------------------------------------------------------ */
/* SDK ของ Puter (@heyputer/puter.js)                                  */
/* ------------------------------------------------------------------ */

let sdkCache = null;
function loadSdk() {
  if (sdkCache) return sdkCache;
  let require;
  try {
    require = createRequire(import.meta.url);
    sdkCache = require("@heyputer/puter.js/src/init.cjs");
  } catch (err) {
    throw new Error(
      `โหลด @heyputer/puter.js ไม่ได้ — รัน \`npm install\` ในโฟลเดอร์นี้ก่อน\n` +
        `สาเหตุ: ${err.message}`
    );
  }
  if (typeof sdkCache.getAuthToken !== "function" || typeof sdkCache.init !== "function") {
    throw new Error("@heyputer/puter.js เวอร์ชันนี้ไม่รองรับ init()/getAuthToken()");
  }
  return sdkCache;
}

const SUCCESS_HTML = `<!DOCTYPE html>
<html lang="th"><head><meta charset="utf-8"><title>ล็อกอินสำเร็จ</title>
<style>
 body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#404C71;margin:0;
      min-height:100vh;display:flex;align-items:center;justify-content:center}
 .box{background:#fff;color:#0f172a;border-radius:16px;padding:40px 48px;text-align:center;max-width:420px;
      box-shadow:0 25px 50px -12px rgba(0,0,0,.25)}
 h1{font-size:22px;margin:0 0 10px} p{color:#64748b;margin:0;line-height:1.6}
 small{display:block;margin-top:24px;color:#94a3b8}
</style></head>
<body><div class="box">
 <h1>✅ ล็อกอิน Puter สำเร็จ</h1>
 <p>กลับไปที่ terminal ได้เลย ปิดหน้าต่างนี้ได้</p>
 <small>docker-agent × Puter</small>
</div></body></html>`;

/** พยายามเปิดเบราว์เซอร์ (ถ้าทำไม่ได้ก็ไม่เป็นไร เพราะเราพิมพ์ URL ให้อยู่แล้ว) */
async function tryOpenBrowser(url) {
  try {
    const require = createRequire(import.meta.url);
    const mod = require("open");
    const fn = typeof mod === "function" ? mod : mod.default;
    if (typeof fn !== "function") return false;
    await fn(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * ล็อกอินผ่านเบราว์เซอร์ โดยเปิด localhost callback รับ token กลับมา
 * (วิธีเดียวกับ getAuthToken() ของ Puter แต่พิมพ์ URL ให้ด้วย เผื่ออยู่บนเครื่องรีโมต/ไม่มีจอ)
 */
function loginWithLocalCallback() {
  return import("node:http").then(
    (http) =>
      new Promise((resolve, reject) => {
        let finished = false;
        let timer = null;

        const settle = (err, token) => {
          if (finished) return;
          finished = true;
          if (timer) clearTimeout(timer);
          server.close(() => {});
          if (err) reject(err);
          else resolve(token);
        };

        const server = http.createServer((req, res) => {
          let token = null;
          try {
            token = new URL(req.url, "http://localhost").searchParams.get("token");
          } catch {
            /* URL แปลก ๆ — ไม่เป็นไร */
          }
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(SUCCESS_HTML);
          if (token) settle(null, token);
        });

        server.on("error", (err) => settle(err));

        server.listen(0, "127.0.0.1", async () => {
          const port = server.address().port;
          const redirect = `http://localhost:${port}`;
          const url = `${GUI_ORIGIN}/?action=authme&redirectURL=${encodeURIComponent(redirect)}`;

          head("ล็อกอิน Puter");
          const opened = await tryOpenBrowser(url);
          if (opened) info("เปิดเบราว์เซอร์ให้แล้ว — ล็อกอิน/กดอนุญาตในหน้าต่างนั้น");
          else warn("เปิดเบราว์เซอร์ให้ไม่ได้ — ก๊อป URL นี้ไปเปิดในเบราว์เซอร์เอง");
          console.log(`\n  ${C.cyan}${url}${C.reset}\n`);
          info(`รอผลลัพธ์สูงสุด ${Math.round(LOGIN_TIMEOUT_MS / 1000)} วินาที (Ctrl+C เพื่อยกเลิก)`);

          timer = setTimeout(
            () =>
              settle(
                new Error(
                  "หมดเวลารอล็อกอิน — ลองใหม่, ใช้ --sdk-login, หรือใช้ --set-token ด้วย token จาก puter.com/dashboard"
                )
              ),
            LOGIN_TIMEOUT_MS
          );
        });
      })
  );
}

/** ทางเลือก: ใช้ getAuthToken() จาก SDK ของ Puter โดยตรง */
async function loginWithSdk() {
  const { getAuthToken } = loadSdk();
  head("ล็อกอิน Puter (ผ่าน SDK)");
  info("กำลังเปิดเบราว์เซอร์ไปที่ puter.com — กรุณาล็อกอิน/กดอนุญาตในหน้าต่างนั้น");
  info(`รอสูงสุด ${Math.round(LOGIN_TIMEOUT_MS / 1000)} วินาที (Ctrl+C เพื่อยกเลิก)`);

  const token = await Promise.race([
    getAuthToken(GUI_ORIGIN),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("หมดเวลารอล็อกอิน (PUTER_LOGIN_TIMEOUT_MS)")), LOGIN_TIMEOUT_MS)
    ),
  ]);
  return token;
}

/** ล็อกอิน (ค่าเริ่มต้น: localhost callback, --sdk-login: ใช้ SDK) */
async function login() {
  const token = has("--sdk-login") ? await loginWithSdk() : await loginWithLocalCallback();
  if (!looksLikeToken(token)) throw new Error("ไม่ได้รับ token ที่ถูกต้องจากเบราว์เซอร์");
  ok("ล็อกอินสำเร็จ");
  return token;
}

/* ------------------------------------------------------------------ */
/* ตรวจสอบ token                                                       */
/* ------------------------------------------------------------------ */

/**
 * ดึงข้อมูลจาก error ได้ทุกรูปแบบ
 * SDK ของ Puter บางครั้ง reject ด้วยอ็อบเจ็กต์คล้าย XHR
 * (มี status / statusText / response / _puterReq.url) ไม่ใช่ Error ปกติ
 */
function errorInfo(err) {
  if (err == null) return { text: "ไม่ทราบสาเหตุ", status: 0 };
  if (typeof err === "string") return { text: err, status: 0 };

  const status = Number(err.status ?? err.error?.status ?? 0) || 0;
  const parts = [];
  if (status) parts.push(`HTTP ${status}`);
  if (err.statusText) parts.push(String(err.statusText));
  if (err.message && typeof err.message === "string") parts.push(err.message);
  if (err.error) {
    if (typeof err.error === "string") parts.push(err.error);
    else if (typeof err.error?.message === "string") parts.push(err.error.message);
  }
  if (err.response) parts.push(String(err.response).replace(/\s+/g, " ").slice(0, 200));
  const url = err._puterReq?.url ?? err._puterReq?.requestURL ?? err.responseURL;
  if (url) parts.push(`(${url})`);

  if (!parts.length) {
    const t = typeof err.toString === "function" ? err.toString() : "";
    if (t && t !== "[object EventTarget]" && t !== "[object Object]") parts.push(t);
  }
  return { text: parts.join(" — ") || "ไม่ทราบสาเหตุ", status };
}

/** @returns {"invalid"|"unreachable"} */
function classifyError(err) {
  const { text, status } = errorInfo(err);
  if (status === 401 || status === 403) return "invalid";
  if (status >= 400 && status < 500) return "invalid";
  if (status >= 500) return "unreachable";
  if (/invalid[_ ]?token|unauthorized|not signed in|no auth token|permission denied/i.test(text))
    return "invalid";
  // ค่าที่เหลือ (status 0 = ต่อเครือข่ายไม่ได้) ถือว่า "ตรวจสอบไม่ได้" ไม่ใช่ token เสีย
  return "unreachable";
}

/**
 * ตรวจ token ผ่าน SDK ของ Puter (เรียก getUser + getMonthlyUsage)
 * @returns {Promise<{status:"valid"|"invalid"|"unreachable"|"unknown", user?:any, usage?:any, error?:string}>}
 */
async function verifyToken(token) {
  const { init } = loadSdk();
  let puter;
  try {
    puter = init(token);
  } catch (err) {
    return { status: "unknown", error: `สร้างไคลเอนต์ Puter ไม่ได้: ${err.message}` };
  }

  let user;
  try {
    user = await puter.auth.getUser();
  } catch (err) {
    return { status: classifyError(err), error: errorInfo(err).text };
  }

  // SDK บางกรณีไม่ throw แต่คืนอ็อบเจ็กต์ error กลับมา
  if (user && typeof user === "object" && user.success === false) {
    const e = user.error;
    const text =
      typeof e === "string"
        ? e
        : e?.message ?? e?.code ?? JSON.stringify(e ?? { error: "unknown" });
    const invalid = /invalid|token|unauthor|not signed|permission|forbidden/i.test(text);
    return { status: invalid ? "invalid" : "unreachable", error: String(text) };
  }

  let usage = null;
  try {
    usage = await puter.auth.getMonthlyUsage();
  } catch {
    /* บางบัญชี/เวอร์ชันไม่มีข้อมูลนี้ — ไม่ถือว่า token เสีย */
  }
  return { status: "valid", user, usage };
}

/** ยิงทดสอบจริงที่ endpoint ที่ docker-agent ใช้ (chat completions) */
async function pingChatCompletions(token) {
  const url = `${API_BASE.replace(/\/+$/, "")}/chat/completions`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: PING_MODEL,
        messages: [{ role: "user", content: "ตอบคำว่า pong เท่านั้น" }],
        max_tokens: 16,
      }),
    });
    const text = await res.text();
    let preview = text.slice(0, 300);
    try {
      const json = JSON.parse(text);
      preview = json?.choices?.[0]?.message?.content ?? json?.error?.message ?? preview;
    } catch {
      /* เก็บข้อความดิบไว้ */
    }
    return { ok: res.ok, status: res.status, preview: String(preview).trim() };
  } catch (err) {
    return { ok: false, status: 0, preview: `เชื่อมต่อไม่ได้: ${err.message}` };
  }
}

function printAccount(v) {
  if (v.status !== "valid") return;
  const name =
    v.user?.username ?? v.user?.email ?? (v.user ? JSON.stringify(v.user).slice(0, 120) : "ไม่ทราบ");
  ok(`token ใช้ได้ — บัญชี: ${C.bold}${name}${C.reset}`);
  if (v.usage) {
    const used = v.usage?.usage?.total ?? v.usage?.total ?? null;
    const limit = v.usage?.entitlement?.remaining ?? v.usage?.allowance ?? null;
    if (used != null) info(`การใช้งานเดือนนี้: ${used}`);
    if (limit != null) info(`โควตาคงเหลือ: ${limit}`);
  } else {
    info("อ่านข้อมูลการใช้งานเดือนนี้ไม่ได้ (ไม่กระทบการใช้งาน)");
  }
}

/* ------------------------------------------------------------------ */
/* main                                                                */
/* ------------------------------------------------------------------ */

async function main() {
  if (has("--help", "-h")) usage(0);

  const jsonMode = has("--json");
  const emitJson = (obj, code) => {
    if (jsonMode) console.log(JSON.stringify(obj, null, 2));
    process.exit(code);
  };

  // 1) บันทึก token ที่ก๊อปมาจาก dashboard
  const setToken = valueOf("--set-token");
  if (setToken !== undefined) {
    const token = String(setToken).trim();
    if (!looksLikeToken(token)) {
      bad("token ดูไม่ถูกต้อง (สั้นเกินไปหรือมีช่องว่าง) — ลองก๊อปใหม่จาก puter.com/dashboard");
      emitJson({ ok: false, error: "invalid-token-format" }, 1);
    }
    const file = writeEnvFile(token);
    ok(`บันทึก token ลง ${file} แล้ว`);
    const v = await verifyToken(token);
    if (v.status === "valid") printAccount(v);
    else if (v.status === "unreachable") warn(`ตรวจสอบออนไลน์ไม่ได้ (เน็ตมีปัญหา): ${v.error}`);
    else {
      bad(`token ถูกบันทึกแต่ตรวจแล้วใช้ไม่ได้: ${v.error}`);
      emitJson({ ok: false, error: v.status }, 1);
    }
    console.log(`\n${C.bold}ขั้นต่อไป${C.reset}\n  ./run-agent.sh "สวัสดี"`);
    emitJson({ ok: true, file, verified: v.status }, 0);
  }

  // 2) ตรวจ token เดิม
  if (has("--verify")) {
    const token = readTokenFromEnv() ?? readTokenFromFile();
    if (!token) {
      bad(`ไม่พบ token — ตั้งตัวแปร ${TOKEN_KEY} หรือรัน \`node puter-login.mjs\` ก่อน`);
      emitJson({ ok: false, error: "no-token" }, 1);
    }
    info(`ตรวจ token ${mask(token)}`);
    const v = await verifyToken(token);
    if (v.status === "valid") {
      printAccount(v);
      if (has("--ping")) {
        head("ทดสอบยิงที่ OpenAI-compatible endpoint ของ Puter");
        const p = await pingChatCompletions(token);
        if (p.ok) ok(`HTTP ${p.status} — ตอบกลับ: ${p.preview}`);
        else bad(`HTTP ${p.status} — ${p.preview}`);
        emitJson({ ok: p.ok, verified: "valid", ping: p }, p.ok ? 0 : 1);
      }
      emitJson({ ok: true, verified: "valid" }, 0);
    }
    if (v.status === "unreachable") {
      bad(`เชื่อมต่อ Puter ไม่ได้: ${v.error}`);
      info("สาเหตุที่พบบ่อย: เน็ตหลุด, ไฟร์วอลล์/พร็อกซีขององค์กร, หรือสภาพแวดล้อมที่บล็อก api.puter.com");
      info("token ในเครื่องอาจยังใช้ได้ปกติ — ลองใหม่เมื่อเน็ตกลับมา");
      emitJson({ ok: false, verified: "unreachable", error: v.error }, 1);
    }
    bad(`token ใช้ไม่ได้: ${v.error ?? v.status}`);
    emitJson({ ok: false, verified: v.status, error: v.error }, 1);
  }

  // 3) ค่าเริ่มต้น: ใช้ token เดิมถ้ายังดี ไม่งั้นล็อกอินใหม่
  const force = has("--force", "-f");
  const printOnly = has("--print", "-p");
  const existing = readTokenFromEnv() ?? readTokenFromFile();

  if (existing && !force) {
    info(`พบ token เดิม ${mask(existing)} — กำลังตรวจสอบ`);
    const v = await verifyToken(existing);
    if (v.status === "valid") {
      printAccount(v);
      if (printOnly) {
        console.log(existing);
        emitJson({ ok: true, token: existing }, 0);
      }
      console.log(`\n${C.bold}พร้อมใช้${C.reset} — รัน:  ./run-agent.sh "สวัสดี"`);
      console.log(`${C.dim}(ต้องการล็อกอินบัญชีใหม่ ใช้ --force)${C.reset}`);
      emitJson({ ok: true, reused: true }, 0);
    }
    if (v.status === "unreachable") {
      bad(`ตรวจสอบ token ไม่ได้เพราะเชื่อมต่อ Puter ไม่ได้: ${v.error}`);
      info("ตรวจเน็ตก่อน แล้วลองใหม่ (หรือใช้ --force ถ้าต้องการล็อกอินใหม่)");
      emitJson({ ok: false, error: "unreachable", detail: v.error }, 1);
    }
    warn(`token เดิมใช้ไม่ได้ (${v.status}) — จะเปิดล็อกอินใหม่`);
  }

  // 4) ล็อกอินผ่านเบราว์เซอร์
  const token = await login();

  const v = await verifyToken(token);
  if (v.status === "valid") printAccount(v);
  else if (v.status === "unreachable") warn(`ตรวจสอบออนไลน์ไม่ได้ (เน็ตมีปัญหา): ${v.error}`);
  else warn(`ตรวจสอบ token ได้ผลลัพธ์: ${v.status}${v.error ? ` — ${v.error}` : ""}`);

  if (printOnly) {
    console.log(token);
    emitJson({ ok: true, token }, 0);
  }

  const file = writeEnvFile(token);
  ok(`บันทึก token ลง ${file} (สิทธิ์ 600)`);

  head("ขั้นต่อไป");
  console.log(`  ./run-agent.sh "สวัสดี แนะนำตัวหน่อย"`);
  console.log(`  ${C.dim}# หรือเรียกใช้ตรง ๆ${C.reset}`);
  console.log(`  docker-agent run --env-from-file .env.puter agent.yaml`);
  console.log(`\n${C.dim}ใช้ token นี้ได้ทุกโปรเจกต์: คัดลอกบรรทัด ${TOKEN_KEY}=… ไปวางใน ~/.config/cagent/.env${C.reset}`);
  emitJson({ ok: true, file, verified: v.status }, 0);
}

main().catch((err) => {
  bad(err?.message ?? String(err));
  process.exit(1);
});

process.on("SIGINT", () => {
  console.log("");
  bad("ยกเลิกโดยผู้ใช้");
  process.exit(130);
});
