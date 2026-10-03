const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const { compileLib } = require("./ts-compile.cjs");

const { mods, cleanup } = compileLib(["src/lib/github-export.ts"]);
const gh = mods[0];
after(() => cleanup());

test("repoSlug สร้างชื่อ repo ที่ GitHub รับได้เสมอ", () => {
  assert.equal(gh.repoSlug("ร้าน กาแฟ Online!"), "online");
  assert.equal(gh.repoSlug("My Cool App"), "my-cool-app");
  assert.equal(gh.repoSlug("!!!"), "gupan-app");
  assert.ok(gh.repoSlug("x".repeat(500)).length <= 100);
  assert.match(gh.repoSlug("app v2.0 (beta)"), /^[A-Za-z0-9._-]+$/);
});

test("isImportablePath รับเฉพาะไฟล์เว็บที่ปลอดภัยและขนาดรับไหว", () => {
  assert.ok(gh.isImportablePath("index.html", 100));
  assert.ok(gh.isImportablePath("assets/style.CSS", 100));
  assert.ok(!gh.isImportablePath("logo.png", 100));
  assert.ok(!gh.isImportablePath("node_modules/x.js", 500_000));
  assert.ok(!gh.isImportablePath("../evil.html", 10));
  assert.ok(!gh.isImportablePath("/etc/passwd", 10));
});

test("decodeBase64Utf8 ถอดภาษาไทยจาก blob ของ GitHub ได้", () => {
  const text = "สวัสดี hello <h1>แอป</h1>";
  const base64 = Buffer.from(text, "utf8").toString("base64");
  assert.equal(gh.decodeBase64Utf8(base64), text);
  // GitHub ใส่ขึ้นบรรทัดใหม่ทุก 60 ตัวใน blob content — ต้องถอดได้เหมือนกัน
  const wrapped = base64.replace(/(.{10})/g, "$1\n");
  assert.equal(gh.decodeBase64Utf8(wrapped), text);
});
