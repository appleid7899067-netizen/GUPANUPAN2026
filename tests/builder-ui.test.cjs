const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { compileTsx, restoreResolver } = require("./ts-compile.cjs");

/**
 * ทดสอบเรนเดอร์คอมโพเนนต์ในเวิร์กสเปซ (SSR) — จับ regression ที่ทำให้หน้าเวิร์กสเปซพัง
 * ทั้งตอน build และตอนผู้ใช้เปิดหน้า
 */
const { mods, cleanup } = compileTsx([
  "src/components/builder/SandboxPanel.tsx",
  "src/components/builder/PuterAccountButton.tsx",
]);
const SandboxPanel = mods[0].default;
const PuterAccountButton = mods[1].default;

after(() => {
  cleanup();
  restoreResolver();
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

test("ปุ่มบัญชี Puter เรนเดอร์ได้โดยไม่ต้องมี window และไม่โชว์ token ตั้งแต่แรก", () => {
  const html = renderToStaticMarkup(React.createElement(PuterAccountButton, {}));
  assert.ok(html.includes("Puter"), "ต้องมีป้ายสถานะระหว่างโหลด");
  assert.ok(!/PUTER_AUTH_TOKEN|auth\.token/.test(html), "ห้ามมี token หรือคีย์ storage ใน HTML เริ่มต้น");
});
