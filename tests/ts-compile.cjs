/**
 * ตัวช่วยคอมไพล์โค้ดใน src/ เป็น CommonJS ชั่วคราว เพื่อทดสอบด้วย node --test
 * (ใช้ tsc ที่โปรเจกต์ติดตั้งอยู่แล้ว ไม่เพิ่ม dependency ใหม่)
 *
 * - compileLib(files)  → โมดูลใน src/lib (มี path alias "@/" ให้ด้วย)
 * - compileTsx(files)  → คอมโพเนนต์ React (ต้องให้ react/lucide-react resolve จากรากโปรเจกต์
 *                        เพราะโค้ดที่คอมไพล์อยู่ในโฟลเดอร์ชั่วคราว)
 */
const { execFileSync } = require("node:child_process");
const { mkdtempSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const Module = require("node:module");

const PROJECT = process.cwd();
const cache = new Map();
/** โฟลเดอร์ผลลัพธ์ที่ hook กำลังชี้อยู่ (ตัวหลังสุดคือชุดที่กำลังทดสอบ) */
const outputDirs = [];

const originalResolve = Module._resolveFilename;

function resolveFromProject(specifier) {
  Module._resolveFilename = originalResolve; // กันการเรียกซ้ำ
  try {
    return require.resolve(specifier, { paths: [PROJECT] });
  } finally {
    Module._resolveFilename = hook;
  }
}

function hook(request, ...rest) {
  const out = outputDirs.at(-1);
  if (out && request.startsWith("@/")) {
    request = path.join(out, "src", `${request.slice(2)}.js`);
  } else if (
    !request.startsWith(".") &&
    !path.isAbsolute(request) &&
    !request.startsWith("node:")
  ) {
    request = resolveFromProject(request);
  }
  return originalResolve.call(this, request, ...rest);
}

Module._resolveFilename = hook;

/**
 * @param {string[]} files พาธของไฟล์ (relative ถึงรากโปรเจกต์)
 * @param {{ jsx?: boolean }} [options]
 */
function compile(files, options = {}) {
  const key = `${options.jsx ? "tsx" : "ts"}:${files.join("|")}`;
  if (cache.has(key)) return cache.get(key);

  const out = mkdtempSync(path.join(tmpdir(), "gupan-build-"));
  // ต้องใช้ tsconfig เพราะ tsc ไม่รับ --paths ทางบรรทัดคำสั่ง
  const tsconfig = path.join(out, "tsconfig.json");
  writeFileSync(
    tsconfig,
    JSON.stringify({
      compilerOptions: {
        target: "es2020",
        module: "commonjs",
        moduleResolution: "node",
        skipLibCheck: true,
        strict: false,
        esModuleInterop: true,
        outDir: out,
        rootDir: PROJECT,
        baseUrl: PROJECT,
        paths: { "@/*": ["src/*"] },
        typeRoots: [path.join(PROJECT, "node_modules/@types")],
        types: ["node"],
        ...(options.jsx ? { jsx: "react-jsx" } : {}),
      },
      files: files.map((file) => path.resolve(PROJECT, file)),
    }),
  );

  execFileSync(process.execPath, ["node_modules/typescript/bin/tsc", "-p", tsconfig], {
    stdio: "pipe",
    cwd: PROJECT,
  });

  outputDirs.push(out);
  const loaded = files.map((file) =>
    require(path.join(out, path.relative(PROJECT, path.resolve(PROJECT, file)).replace(/\.tsx?$/, ".js"))),
  );

  const api = {
    mods: loaded,
    dir: out,
    cleanup: () => {
      const index = outputDirs.indexOf(out);
      if (index >= 0) outputDirs.splice(index, 1);
      cache.delete(key);
      rmSync(out, { recursive: true, force: true });
    },
  };
  cache.set(key, api);
  return api;
}

module.exports = {
  compileLib: (files) => compile(files, { jsx: false }),
  compileTsx: (files) => compile(files, { jsx: true }),
  restoreResolver: () => {
    Module._resolveFilename = originalResolve;
  },
};
