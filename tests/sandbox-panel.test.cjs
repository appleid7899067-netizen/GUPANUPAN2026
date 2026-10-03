const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { mkdtempSync, rmSync, writeFileSync, mkdirSync } = require("node:fs");
const path = require("node:path");
const Module = require("node:module");

/**
 * ทดสอบว่า SandboxPanel เรนเดอร์ได้จริง (SSR) และโครงที่ผู้ใช้เห็นครบ
 * — คอมไพล์ TSX ด้วย tsc ของโปรเจกต์ แล้วเรนเดอร์ด้วย react-dom/server
 */
const out = mkdtempSync(path.join(require("node:os").tmpdir(), "gupan-panel-"));
const tsconfig = path.join(out, "tsconfig.json");
writeFileSync(
  tsconfig,
  JSON.stringify({
    compilerOptions: {
      target: "es2020",
      module: "commonjs",
      moduleResolution: "node",
      jsx: "react-jsx",
      esModuleInterop: true,
      skipLibCheck: true,
      strict: false,
      outDir: out,
      rootDir: process.cwd(),
      baseUrl: process.cwd(),
      paths: { "@/*": ["src/*"] },
      types: ["node"],
      // tsconfig อยู่คนละโฟลเดอร์กับโปรเจกต์ จึงต้องชี้ typeRoots เอง
      typeRoots: [path.join(process.cwd(), "node_modules/@types")],
    },
    files: [
      path.join(process.cwd(), "src/components/builder/SandboxPanel.tsx"),
      path.join(process.cwd(), "src/lib/sandbox.ts"),
    ],
  }),
);

execFileSync(process.execPath, ["node_modules/typescript/bin/tsc", "-p", tsconfig], {
  stdio: "pipe",
});

// โค้ดที่คอมไพล์อยู่ในโฟลเดอร์ชั่วคราว จึงต้องช่วย Node สองเรื่อง:
// 1) tsc ไม่แปลง path alias "@/" ให้ → แปลงไปยังไฟล์ที่คอมไพล์แล้ว
// 2) แพ็กเกจอย่าง react/lucide-react ต้อง resolve จากรากโปรเจกต์ ไม่ใช่จาก /tmp
const originalResolve = Module._resolveFilename;

function resolveFromProject(specifier) {
  // ปิด hook ชั่วคราวเพื่อไม่ให้ require.resolve เรียกตัวเองวนซ้ำ
  Module._resolveFilename = originalResolve;
  try {
    return require.resolve(specifier, { paths: [process.cwd()] });
  } finally {
    Module._resolveFilename = hook;
  }
}

function hook(request, ...rest) {
  if (request.startsWith("@/")) {
    request = path.join(out, "src", `${request.slice(2)}.js`);
  } else if (!request.startsWith(".") && !path.isAbsolute(request) && !request.startsWith("node:")) {
    request = resolveFromProject(request);
  }
  return originalResolve.call(this, request, ...rest);
}

Module._resolveFilename = hook;

const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const SandboxPanel = require(path.join(out, "src/components/builder/SandboxPanel.js")).default;

after(() => {
  Module._resolveFilename = originalResolve;
  rmSync(out, { recursive: true, force: true });
});

test("SandboxPanel เรนเดอร์พร้อมแท็บ คอนโซล REPL และตัวตรวจ", () => {
  const html = renderToStaticMarkup(
    React.createElement(SandboxPanel, { html: "<h1>ทดสอบ</h1>" }),
  );
  // React escape เครื่องหมายคำพูดในค่าของ attribute (srcDoc) — ถอดกลับก่อนตรวจเนื้อใน
  const decoded = html.replace(/&#x27;/g, "'").replace(/&quot;/g, '"');

  for (const label of ["Console", "ทดลองโค้ด", "ตรวจสอบ"]) {
    assert.ok(html.includes(label), `ต้องมีแท็บ ${label}`);
  }
  assert.ok(html.includes("sandbox / index.html"));
  assert.ok(html.includes("ไม่มี allow-same-origin"), "ต้องบอกผู้ใช้ว่าแซนด์บ็อกซ์แยกออกจากบิลเดอร์");
  const sandboxAttr = /sandbox="([^"]*)"/.exec(html);
  assert.equal(
    sandboxAttr?.[1],
    "allow-scripts",
    'iframe ต้องมี sandbox="allow-scripts" เท่านั้น (ห้ามให้ same-origin)',
  );
  assert.ok(decoded.includes("Content-Security-Policy"), "srcDoc ต้องมี CSP ฝังอยู่");
  assert.ok(decoded.includes("connect-src 'none'"), "srcDoc ต้องปิดเครือข่าย");
  assert.ok(decoded.includes("'unsafe-eval'"), "ต้องเปิด eval สำหรับ REPL โดยเจตนา");
  assert.ok(
    !sandboxAttr[1].includes("allow-same-origin"),
    "ห้ามให้สิทธิ์ same-origin แก่โค้ดที่รัน",
  );
  assert.ok(html.includes("ยังไม่มี console output"), "มีสถานะเริ่มต้นของคอนโซล");
});

test("SandboxPanel ฝังโค้ดของโปรเจกต์ลงใน srcDoc", () => {
  const marker = "<p>เครื่องหมาย-ทดสอบ-12345</p>";
  const html = renderToStaticMarkup(React.createElement(SandboxPanel, { html: marker }));
  assert.ok(html.includes("เครื่องหมาย-ทดสอบ-12345"), "โค้ดโปรเจกต์ต้องอยู่ในเอกสารแซนด์บ็อกซ์");
});
