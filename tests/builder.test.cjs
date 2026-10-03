const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const output = mkdtempSync(path.join(tmpdir(), "gupan-test-"));
execFileSync(process.execPath, [
  "node_modules/typescript/bin/tsc",
  "src/lib/builder.ts",
  "--target",
  "es2020",
  "--module",
  "commonjs",
  "--skipLibCheck",
  "--outDir",
  output,
]);
const b = require(path.join(output, "builder.js"));
after(() => rmSync(output, { recursive: true, force: true }));
class MemoryStorage {
  data = new Map();
  get length() {
    return this.data.size;
  }
  key(i) {
    return [...this.data.keys()][i] ?? null;
  }
  getItem(k) {
    return this.data.get(k) ?? null;
  }
  setItem(k, v) {
    this.data.set(k, v);
  }
  removeItem(k) {
    this.data.delete(k);
  }
}
test("complete HTML and markdown-wrapped HTML parse", () => {
  assert.equal(b.extractHtml(b.STARTER_FILES["index.html"]), b.STARTER_FILES["index.html"]);
  assert.equal(
    b.extractHtml("```html\n" + b.STARTER_FILES["index.html"] + "\n```"),
    b.STARTER_FILES["index.html"],
  );
});
test("extractHtml cuts a leading summary when there is no fence", () => {
  const reply =
    "- เพิ่ม**เมนู**แล้ว\n<!doctype html><html><body>ok</body></html>";
  assert.equal(b.extractHtml(reply), "<!doctype html><html><body>ok</body></html>");
  assert.equal(b.extractSummary(reply), "- เพิ่ม**เมนู**แล้ว");
});
test("extractSummary is empty when the AI sends code only", () => {
  assert.equal(b.extractSummary("```html\n" + b.STARTER_FILES["index.html"] + "\n```"), "");
  assert.equal(b.extractSummary(b.STARTER_FILES["index.html"]), "");
});
test("partial, non-HTML, oversized responses are rejected", () => {
  for (const text of [
    "hello",
    "<!doctype html><html><body>incomplete",
    "<div>fragment</div>",
    "<html>" + "a".repeat(400001) + "</html>",
  ])
    assert.throws(() => b.extractHtml(text));
});
test("checkpoint preserves previous files and caps history at eight", () => {
  let p = b.createProject("test");
  for (let i = 0; i < 12; i++)
    p = b.checkpoint(p, { "index.html": `<html>${i}</html>` }, `edit ${i}`);
  assert.equal(p.versions.length, 8);
  assert.equal(p.files["index.html"], "<html>11</html>");
  assert.equal(p.versions[0].files["index.html"], "<html>10</html>");
  assert.throws(() =>
    b.checkpoint(p, { "index.html": "x".repeat(400001) }, "too large"),
  );
});
test("loadProject migrates v1 single-html projects to file sets", () => {
  global.localStorage = new MemoryStorage();
  const legacy = {
    id: "legacy-1",
    name: "โปรเจกต์เก่า",
    html: "<!doctype html><html><body>old</body></html>",
    messages: [],
    versions: [
      {
        id: "v1",
        label: "ก่อน",
        html: "<!doctype html><html><body>prev</body></html>",
        createdAt: new Date().toISOString(),
      },
    ],
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(b.PROJECT_PREFIX + "legacy-1", JSON.stringify(legacy));
  const loaded = b.loadProject("legacy-1");
  assert.equal(loaded.files["index.html"], legacy.html);
  assert.equal(loaded.versions[0].files["index.html"], legacy.versions[0].html);
});
test("extractFiles parses file fences and blocks path traversal", () => {
  const reply = [
    "- เพิ่ม**หน้าเกี่ยวกับ**แล้ว",
    "```file:index.html",
    '<!doctype html><html><head><link rel="stylesheet" href="styles.css"></head><body>ok</body></html>',
    "```",
    "```file:styles.css",
    "body{color:red}",
    "```",
    "```file:../evil.html",
    "<!doctype html><html><body>x</body></html>",
    "```",
  ].join("\n");
  const files = b.extractFiles(reply);
  assert.deepEqual(Object.keys(files).sort(), ["index.html", "styles.css"]);
  assert.equal(b.extractSummary(reply), "- เพิ่ม**หน้าเกี่ยวกับ**แล้ว");
  assert.throws(() =>
    b.extractFiles("```file:styles.css\nbody{}\n```"),
  );
});
test("previewDocument inlines local assets and wires page navigation", () => {
  const files = {
    "index.html":
      '<!doctype html><html><head><link rel="stylesheet" href="styles.css"><script src="app.js"></script></head><body><a href="about.html">go</a></body></html>',
    "styles.css": "body{color:blue}",
    "app.js": "console.log(1)",
    "about.html": "<!doctype html><html><body>about</body></html>",
  };
  const doc = b.previewDocument(files, "index.html", "ch1");
  assert.ok(doc.includes("body{color:blue}"), "css ท้องถิ่นต้องถูกอินไลน์");
  assert.ok(doc.includes("console.log(1)"), "js ท้องถิ่นต้องถูกอินไลน์");
  assert.ok(!doc.includes('src="app.js"'), "ต้องไม่เหลือ script src ท้องถิ่น");
  assert.ok(doc.includes("navigate"), "bridge ต้องดักคลิกเพื่อข้ามหน้า");
  assert.ok(b.previewDocument(files, "about.html", "ch1").includes("about"));
});
test("projects persist independently; malformed entries do not hide healthy projects", () => {
  global.localStorage = new MemoryStorage();
  const a = b.createProject("one");
  const c = b.createProject("two");
  b.saveProject(a);
  b.saveProject(c);
  localStorage.setItem(b.PROJECT_PREFIX + "broken", "{");
  assert.deepEqual(b.loadProject(a.id), a);
  assert.equal(b.listProjects().length, 2);
  assert.equal(b.loadProject("missing"), null);
});
test("storage failure propagates without pretending to save", () => {
  global.localStorage = {
    setItem() {
      throw new Error("QuotaExceededError");
    },
  };
  assert.throws(
    () => b.saveProject(b.createProject("full")),
    /QuotaExceededError/,
  );
});
test("preview adds CSP before generated code and scoped console bridge", () => {
  const html = b.previewDocument(
    { "index.html": b.STARTER_FILES["index.html"] },
    "index.html",
    "test-channel",
  );
  assert.match(html, /connect-src 'none'/);
  assert.match(html, /form-action 'none'/);
  assert.match(html, /channel:"test-channel"/);
  assert.ok(
    html.indexOf("Content-Security-Policy") < html.indexOf("My new app"),
  );
});
