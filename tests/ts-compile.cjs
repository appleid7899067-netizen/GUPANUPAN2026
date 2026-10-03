/**
 * ตัวช่วยคอมไพล์โมดูลใน src/lib เป็น CommonJS ชั่วคราว เพื่อทดสอบด้วย node --test
 * (โปรเจกต์ใช้ tsc ที่ติดตั้งอยู่แล้ว ไม่เพิ่ม dependency ใหม่)
 */
const { execFileSync } = require("node:child_process");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");

const cache = new Map();

/**
 * @param {string[]} files พาธของไฟล์ .ts (relative ถึงรากโปรเจกต์)
 * @returns {{ mods: any[], dir: string, cleanup: () => void }}
 */
function compileLib(files) {
  const key = files.join("|");
  if (cache.has(key)) return cache.get(key);

  const out = mkdtempSync(path.join(tmpdir(), "gupan-lib-"));
  execFileSync(
    process.execPath,
    [
      "node_modules/typescript/bin/tsc",
      ...files,
      "--target",
      "es2020",
      "--module",
      "commonjs",
      "--skipLibCheck",
      "--outDir",
      out,
    ],
    { stdio: "pipe" },
  );

  const api = {
    mods: files.map((file) =>
      require(path.join(out, path.basename(file).replace(/\.ts$/, ".js"))),
    ),
    dir: out,
    cleanup: () => rmSync(out, { recursive: true, force: true }),
  };
  cache.set(key, api);
  return api;
}

module.exports = { compileLib };
