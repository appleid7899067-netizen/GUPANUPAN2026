/**
 * ทดสอบขั้นตอนล็อกอินแบบไม่ต้องมีเบราว์เซอร์/เน็ตจริง
 *
 * วิธีทำ: สร้าง "Puter ปลอม" ขึ้นมาในเครื่อง แล้วตั้ง PUTER_GUI_ORIGIN ให้สคริปต์ไปขอ token ที่นั่น
 * — พิสูจน์ว่า callback server, การรับ token, และการพิมพ์ผล ทำงานครบวงจร
 *
 * รัน: npm test
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import { once } from "node:events";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FAKE_TOKEN = "test_token_abcdefghijklmnopqrstuvwxyz_1234567890";

/** สร้างเซิร์ฟเวอร์เลียนแบบหน้าเว็บล็อกอินของ Puter */
function startFakePuter() {
  return new Promise((done) => {
    const seen = { authme: 0 };
    const server = http.createServer((req, reply) => {
      const url = new URL(req.url, "http://localhost");
      if (url.searchParams.get("action") === "authme") {
        seen.authme += 1;
        const redirect = url.searchParams.get("redirectURL");
        reply.writeHead(302, { Location: `${redirect}?token=${FAKE_TOKEN}` });
        reply.end();
        return;
      }
      reply.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      reply.end("fake puter gui");
    });
    server.listen(0, "127.0.0.1", () => done({ server, port: server.address().port, seen }));
  });
}

function runCli(args, env) {
  const child = spawn(process.execPath, ["puter-login.mjs", ...args], {
    cwd: HERE,
    env: { ...process.env, NO_COLOR: "1", ...env },
  });
  let stdout = "";
  let stderr = "";
  const listeners = [];
  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
    for (const fn of listeners) fn(stdout);
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });
  return { child, onStdout: (fn) => listeners.push(fn), output: () => ({ stdout, stderr }) };
}

test("ล็อกอินผ่าน localhost callback แล้วได้ token กลับมา", async () => {
  const { server, port, seen } = await startFakePuter();
  const { child, onStdout, output } = runCli(["--print", "--force"], {
    PUTER_GUI_ORIGIN: `http://127.0.0.1:${port}`,
    PUTER_LOGIN_TIMEOUT_MS: "20000",
    PUTER_AUTH_TOKEN: "",
  });

  let simulated = false;
  onStdout(async (out) => {
    const match = out.match(/http:\/\/127\.0\.0\.1:\d+\/\?action=authme\S*/);
    if (!match || simulated) return;
    simulated = true;
    // เล่นเป็นเบราว์เซอร์: เปิด URL ที่สคริปต์พิมพ์ แล้วตาม redirect กลับมาที่ callback
    try {
      await fetch(match[0], { redirect: "follow" });
    } catch {
      /* ให้ assert ด้านล่างรายงานผล */
    }
  });

  const [code] = await once(child, "exit");
  server.close();

  const { stdout } = output();
  assert.equal(simulated, true, `ไม่พบ URL ล็อกอินในผลลัพธ์:\n${stdout}`);
  assert.equal(seen.authme, 1, "ต้องยิงไปที่หน้า authme 1 ครั้ง");
  assert.equal(code, 0, `ควรจบด้วย exit 0 แต่ได้ ${code}\n${stdout}`);
  assert.ok(stdout.includes(FAKE_TOKEN), `ควรพิมพ์ token ที่ได้ออกมา:\n${stdout}`);
});

test("--help ใช้งานได้และแสดงชื่อตัวแปรที่ต้องใช้", async () => {
  const { child, output } = runCli(["--help"], {});
  const [code] = await once(child, "exit");
  assert.equal(code, 0);
  assert.match(output().stdout, /PUTER_AUTH_TOKEN/);
  assert.match(output().stdout, /--set-token/);
});

test("run-agent.sh อ่าน token จากไฟล์และส่ง argument ให้ docker-agent ถูกต้อง", async () => {
  // สร้าง docker-agent ปลอม เพื่อดักดูคำสั่งที่สคริปต์จะรันจริง
  const tmp = mkdtempSync(join(tmpdir(), "puter-agent-test-"));
  const fakeBin = join(tmp, "docker-agent");
  writeFileSync(fakeBin, '#!/usr/bin/env bash\necho "ARGS: $*"\n', { mode: 0o755 });

  const envFile = join(tmp, "fake.env");
  writeFileSync(envFile, "PUTER_AUTH_TOKEN=token_from_file_1234567890abcdef\n", { mode: 0o600 });

  const child = spawn("bash", ["run-agent.sh", "สวัสดี"], {
    cwd: HERE,
    env: {
      ...process.env,
      PATH: `${tmp}:${process.env.PATH}`,
      PUTER_ENV_FILE: envFile,
      AUTO_LOGIN: "0",
      PUTER_AUTH_TOKEN: "", // จงใจไม่ตั้ง เพื่อบังคับให้อ่านจากไฟล์
      NO_COLOR: "1",
    },
  });
  let stdout = "";
  child.stdout.on("data", (c) => (stdout += c.toString()));
  child.stderr.on("data", (c) => (stdout += c.toString()));

  // ค่าเริ่มต้นของไฟล์ config ต่างกันได้ตาม layout (ในรีโพ docker-agent ใช้ $HERE/../examples/puter.yaml)
  // สคริปต์แปลงพาธของไฟล์ config ให้เป็น absolute เสมอเมื่อไฟล์มีอยู่
  const defaultAgent = existsSync(resolve(HERE, "../examples/puter.yaml"))
    ? resolve(HERE, "../examples/puter.yaml")
    : resolve(HERE, "agent.yaml");

  const [code] = await once(child, "exit");
  assert.equal(code, 0, `ควรจบด้วย exit 0 แต่ได้ ${code}\n${stdout}`);
  const expected = `ARGS: run --env-from-file ${envFile} ${defaultAgent} สวัสดี`;
  assert.ok(
    stdout.includes(expected),
    `คำสั่งที่ส่งให้ docker-agent ไม่ถูกต้อง\nคาดหวัง: ${expected}\nได้:\n${stdout}`
  );
});

test("--verify ต้องไม่ผ่านเมื่อ token ใช้ไม่ได้", async () => {
  const { child, output } = runCli(["--verify"], {
    PUTER_AUTH_TOKEN: "definitely_not_a_valid_token_0000000000",
  });
  const [code] = await once(child, "exit");
  const { stdout } = output();
  assert.equal(code, 1, `ควรจบด้วย exit 1\n${stdout}`);
  assert.match(stdout, /token/i);
});
