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
  assert.equal(b.extractHtml(b.STARTER_HTML), b.STARTER_HTML);
  assert.equal(
    b.extractHtml("```html\n" + b.STARTER_HTML + "\n```"),
    b.STARTER_HTML,
  );
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
test("checkpoint preserves previous code and caps history at eight", () => {
  let p = b.createProject("test");
  for (let i = 0; i < 12; i++)
    p = b.checkpoint(p, `<html>${i}</html>`, `edit ${i}`);
  assert.equal(p.versions.length, 8);
  assert.equal(p.html, "<html>11</html>");
  assert.equal(p.versions[0].html, "<html>10</html>");
  assert.throws(() => b.checkpoint(p, "x".repeat(400001), "too large"));
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
  const html = b.previewDocument(b.STARTER_HTML, "test-channel");
  assert.match(html, /connect-src 'none'/);
  assert.match(html, /form-action 'none'/);
  assert.match(html, /channel:"test-channel"/);
  assert.ok(
    html.indexOf("Content-Security-Policy") < html.indexOf("My new app"),
  );
});
