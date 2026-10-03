const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const { compileLib } = require("./ts-compile.cjs");

const { mods, cleanup } = compileLib(["src/lib/sandbox.ts"]);
const sandbox = mods[0];
after(() => cleanup());

/* ------------------------------------------------------------------ */
/* DOM จำลองเล็ก ๆ พอสำหรับ collectSnapshot                            */
/* ------------------------------------------------------------------ */

const SIMPLE_SELECTOR = /^([a-z0-9]+)?(?:\[([a-z-]+)(?:=["']?([^"'\]]*)["']?)?\])?$/i;

function matches(el, selector) {
  if (selector.trim() === "*") return true;
  const found = SIMPLE_SELECTOR.exec(selector.trim());
  if (!found) throw new Error(`สตับรองรับเฉพาะ selector ง่าย ๆ ไม่รับ: ${selector}`);
  const [, tag, attr, value] = found;
  if (tag && el.tagName !== tag.toUpperCase()) return false;
  if (attr) {
    if (!el.hasAttribute(attr)) return false;
    if (value !== undefined && el.getAttribute(attr) !== value) return false;
  }
  return true;
}

class StubElement {
  constructor(tag, attrs = {}, text = "", children = []) {
    this.tagName = tag.toUpperCase();
    this.attrs = attrs;
    this.ownText = text;
    this.children = children;
    for (const child of children) child.parent = this;
  }
  get id() {
    return this.attrs.id || "";
  }
  get textContent() {
    return [this.ownText, ...this.children.map((c) => c.textContent)]
      .filter(Boolean)
      .join(" ");
  }
  getAttribute(name) {
    return Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name] : null;
  }
  hasAttribute(name) {
    return Object.prototype.hasOwnProperty.call(this.attrs, name);
  }
  querySelectorAll(selector) {
    const results = [];
    const walk = (node) => {
      for (const child of node.children) {
        if (child.matchesAny(selector)) results.push(child);
        walk(child);
      }
    };
    walk(this);
    return results;
  }
  matchesAny(selector) {
    return selector.split(",").some((part) => matches(this, part));
  }
  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }
  closest(tag) {
    let node = this;
    while (node) {
      if (node.tagName === tag.toUpperCase()) return node;
      node = node.parent;
    }
    return null;
  }
}

function makeDocument(root, { title = "", lang = null, viewport = null } = {}) {
  return {
    title,
    body: root,
    documentElement: { getAttribute: (name) => (name === "lang" ? lang : null) },
    querySelector(selector) {
      if (selector === 'meta[name="viewport"]') {
        return viewport === null
          ? null
          : new StubElement("meta", { name: "viewport", content: viewport });
      }
      return root.querySelector(selector);
    },
    querySelectorAll: (selector) => root.querySelectorAll(selector),
  };
}

/** หน้าปกติที่ควรผ่านเกือบทั้งหมด */
function healthyDocument() {
  const button = new StubElement("button", {}, "ส่งข้อมูล");
  const link = new StubElement("a", { href: "#pricing" }, "ดูราคา");
  const field = new StubElement("input", { id: "email" });
  const label = new StubElement("label", { for: "email" }, "อีเมล");
  const image = new StubElement("img", { src: "data:image/png;base64,AA", alt: "แผนภูมิ" });
  const h1 = new StubElement("h1", {}, "รายงานยอดขาย");
  const h2 = new StubElement("h2", {}, "ภาพรวม");
  const body = new StubElement(
    "body",
    {},
    "เนื้อหาตัวอย่างสำหรับทดสอบตัวตรวจ DOM",
    [h1, h2, image, button, link, label, field],
  );
  return makeDocument(body, {
    title: "รายงานยอดขาย",
    lang: "th",
    viewport: "width=device-width, initial-scale=1",
  });
}

/** หน้าที่จงใจทำผิดหลายข้อ */
function brokenDocument() {
  const namelessButton = new StubElement("button", {}, "", []);
  const image = new StubElement("img", { src: "https://cdn.example.com/a.png" });
  const script = new StubElement("script", { src: "https://cdn.example.com/lib.js" });
  const blank = new StubElement("a", { href: "https://example.com", target: "_blank" }, "ออก");
  const input = new StubElement("input", {});
  const h2 = new StubElement("h2", {}, "หัวข้อหลัก");
  const h4 = new StubElement("h4", {}, "หัวข้อย่อย");
  const dup1 = new StubElement("div", { id: "card" }, "");
  const dup2 = new StubElement("div", { id: "card" }, "");
  const body = new StubElement("body", {}, "สั้น", [
    namelessButton,
    image,
    script,
    blank,
    input,
    h2,
    h4,
    dup1,
    dup2,
  ]);
  return makeDocument(body, { title: "", lang: null, viewport: null });
}

/* ------------------------------------------------------------------ */
/* รัน runtime จริงใน VM: ต้องตอบ eval/snapshot กลับทาง postMessage      */
/* ------------------------------------------------------------------ */

const vm = require("node:vm");

function runRuntime(channel, doc) {
  const sent = [];
  const handlers = {};
  const context = vm.createContext({
    parent: { postMessage: (message) => sent.push(message) },
    addEventListener: (type, handler) => {
      handlers[type] = handler;
    },
    console: { log() {}, warn() {}, error() {} },
    document: doc,
    Element: class Element {},
    NodeList: class NodeList {},
    JSON,
    Object,
    Promise,
    Array,
    String,
    Number,
    Boolean,
    Error,
    setTimeout,
  });
  vm.runInContext(sandbox.sandboxRuntimeBody(channel), context);
  return { sent, handlers };
}

const tick = (ms = 30) => new Promise((resolve) => setTimeout(resolve, ms));

test("runtime ตอบคำสั่ง eval กลับเฉพาะ channel ของตัวเอง", async () => {
  const { sent, handlers } = runRuntime("CH-1", healthyDocument());
  assert.equal(sent[0]?.type, "ready", "ต้องประกาศพร้อมใช้ทันทีที่โหลด");

  handlers.message({ data: { channel: "CH-อื่น", type: "eval", id: "x", code: "1+1" } });
  handlers.message({ data: { channel: "CH-1", type: "eval", id: "e1", code: "1+1" } });
  await tick();

  const result = sent.find((message) => message.id === "e1");
  assert.equal(result.ok, true);
  assert.equal(result.text, "2");
  assert.equal(result.channel, "CH-1");
  assert.ok(!sent.some((message) => message.id === "x"), "คำสั่งจาก channel อื่นต้องถูกละเลย");
});

test("runtime คืนค่า object/array/undefined ได้อ่านง่าย และจับ error", async () => {
  const { sent, handlers } = runRuntime("CH", healthyDocument());

  handlers.message({
    data: { channel: "CH", type: "eval", id: "obj", code: "({ a: 1, b: 'สอง' })" },
  });
  handlers.message({
    data: { channel: "CH", type: "eval", id: "arr", code: "[1, 'สอง']" },
  });
  handlers.message({ data: { channel: "CH", type: "eval", id: "undef", code: "undefined" } });
  handlers.message({
    data: { channel: "CH", type: "eval", id: "failed", code: "throw new Error('พังตรงนี้')" },
  });
  handlers.message({
    data: { channel: "CH", type: "eval", id: "async", code: "Promise.resolve(42)" },
  });
  await tick();

  const byId = Object.fromEntries(sent.filter((m) => m.id).map((m) => [m.id, m]));
  assert.equal(byId.obj.text, '{"a":1,"b":"สอง"}');
  assert.equal(byId.arr.text, "1, สอง");
  assert.equal(byId.undef.text, "undefined");
  assert.equal(byId.failed.ok, false);
  assert.match(byId.failed.text, /พังตรงนี้/);
  assert.equal(byId.async.text, "42", "ต้องรอ Promise ให้เสร็จก่อนตอบ");
});

test("runtime ตอบ snapshot ของ DOM จริงในแซนด์บ็อกซ์", async () => {
  const { sent, handlers } = runRuntime("CH", brokenDocument());
  handlers.message({ data: { channel: "CH", type: "snapshot", id: "s1" } });
  await tick();

  const reply = sent.find((message) => message.id === "s1");
  assert.equal(reply.type, "snapshot");
  assert.equal(reply.data.title, "");
  assert.equal(reply.data.images[0].hasAlt, false);
  assert.deepEqual(
    sandbox.analyzeSnapshot(reply.data).filter((check) => check.status === "fail").map((c) => c.id),
    ["viewport", "title", "img-alt", "control-name", "external-assets"],
  );
});

/* ------------------------------------------------------------------ */
/* collectSnapshot ↔ analyzeSnapshot ต้องทำงานคู่กันได้จริง            */
/* ------------------------------------------------------------------ */

test("collectSnapshot อ่าน DOM ได้ตามที่ analyzer คาดหวัง", () => {
  const snapshot = sandbox.collectSnapshot(healthyDocument());
  assert.equal(snapshot.title, "รายงานยอดขาย");
  assert.equal(snapshot.lang, "th");
  assert.equal(snapshot.headings.join(","), "1,2");
  assert.equal(snapshot.images.length, 1);
  assert.equal(snapshot.images[0].hasAlt, true);
  assert.equal(snapshot.buttons[0].name, "ส่งข้อมูล");
  assert.equal(snapshot.fields[0].label, "อีเมล", "label[for] ต้องถูกจับคู่กับ input");
  assert.equal(snapshot.externalScripts.length, 0);
  assert.equal(snapshot.counts.form, 0);

  const checks = sandbox.analyzeSnapshot(snapshot);
  const failed = checks.filter((check) => check.status === "fail");
  assert.deepEqual(failed, [], `หน้าปกติไม่ควรมีข้อที่ไม่ผ่าน: ${JSON.stringify(failed)}`);
});

test("หน้าที่มีปัญหา ถูกจับครบทุกข้อที่ควรจับ", () => {
  const snapshot = sandbox.collectSnapshot(brokenDocument());
  const checks = sandbox.analyzeSnapshot(snapshot);
  const status = Object.fromEntries(checks.map((check) => [check.id, check.status]));

  assert.equal(status.viewport, "fail");
  assert.equal(status.lang, "warn");
  assert.equal(status.title, "fail");
  assert.equal(status.h1, "warn");
  assert.equal(status["heading-order"], "warn", "h2 → h4 ต้องถูกจับว่าข้ามระดับ");
  assert.equal(status["img-alt"], "fail");
  assert.equal(status["control-name"], "fail");
  assert.equal(status["field-label"], "warn");
  assert.equal(status["duplicate-id"], "warn");
  assert.equal(status["external-assets"], "fail", "สคริปต์ภายนอกต้องถูกจับเพราะ CSP บล็อก");
  assert.equal(status["no-popup"], "warn");
  assert.equal(status.content, "warn", "ข้อความสั้นเกินไปต้องเตือน");

  const summary = sandbox.summarizeChecks(checks);
  assert.equal(summary.total, checks.length);
  assert.equal(summary.pass + summary.warn + summary.fail, checks.length);
  assert.match(sandbox.checksHeadline(checks), /ปัญหาที่ควรแก้/);
  assert.match(sandbox.checksHeadline(sandbox.analyzeSnapshot(sandbox.collectSnapshot(healthyDocument()))), /ผ่านทุกข้อ/);
});

test("checksHeadline สรุปจำนวนถูกต้อง", () => {
  const checks = [
    { id: "a", label: "a", status: "pass", detail: "" },
    { id: "b", label: "b", status: "warn", detail: "" },
  ];
  assert.match(sandbox.checksHeadline(checks), /ควรปรับ 1 รายการ · ผ่าน 1/);
});

/* ------------------------------------------------------------------ */
/* เอกสารแซนด์บ็อกซ์                                                   */
/* ------------------------------------------------------------------ */

test("sandboxDocument วาง CSP ก่อนโค้ดผู้ใช้ และเปิด eval เฉพาะที่จำเป็น", () => {
  const html = "<!doctype html><html><body><p>สวัสดี</p></body></html>";
  const doc = sandbox.sandboxDocument(html, "chan-123");

  assert.ok(doc.indexOf("Content-Security-Policy") < doc.indexOf("<p>สวัสดี</p>"));
  assert.ok(doc.includes("connect-src 'none'"), "ต้องปิดเครือข่าย");
  assert.ok(doc.includes("form-action 'none'"));
  assert.ok(doc.includes("'unsafe-eval'"), "REPL ต้องใช้ eval ได้");
  assert.ok(!doc.includes("allow-same-origin"));
  assert.ok(doc.includes('"chan-123"'), "runtime ต้องผูกกับ channel ที่ส่งมา");
  assert.ok(doc.includes("type===\"snapshot\"") || doc.includes('type==="snapshot"'));
  assert.ok(doc.trim().endsWith("</html>"));
});

test("runtime ที่ฝังไป มีทั้ง collectSnapshot และตัวส่งข้อความกลับ", () => {
  const source = sandbox.sandboxRuntimeSource("abc");
  assert.ok(source.startsWith("<script>") && source.endsWith("<\/script>"));
  assert.ok(!/^</.test(sandbox.sandboxRuntimeBody("abc")), "body ต้องเป็น JS ล้วน");

  assert.ok(source.includes("collectSnapshot"), "ฝังตัวเก็บ snapshot ให้ทำงานใน iframe");
  assert.ok(source.includes("parent.postMessage"));
  assert.ok(source.includes('"abc"'));
  // ตัวเก็บ snapshot ต้องพึ่งพาแค่ document (ไม่มีการอ้างถึงตัวแปรนอกฟังก์ชัน)
  // จึงเรียกซ้ำผ่าน new Function ได้เหมือนตอนรันจริงใน iframe
  const isolated = new Function(`return (${sandbox.collectSnapshot.toString()})`)();
  const snapshot = isolated(healthyDocument());
  assert.equal(snapshot.title, "รายงานยอดขาย");
});

test("createSandboxClient ตอบ timeouts และไม่ค้างเมื่อไม่ได้โหลด iframe", async () => {
  const client = sandbox.createSandboxClient(() => null, "chan");
  const reply = await client.evalCode("1+1");
  assert.equal(reply.ok, false);
  assert.match(reply.text, /ยังไม่ได้โหลดแซนด์บ็อกซ์/);

  // iframe ที่แกล้งทำเป็นไม่ตอบ → ต้องคืนผลเป็น timeout ไม่ค้าง
  const fakeFrame = { contentWindow: { postMessage() {} } };
  const slow = sandbox.createSandboxClient(() => fakeFrame, "chan");
  const timedOut = await slow.evalCode("2+2");
  assert.equal(timedOut.ok, false);
  assert.match(timedOut.text, /ไม่ตอบภายในเวลา/);
  slow.dispose();
});

test("createSandboxClient รับผลลัพธ์และ snapshot จาก channel เดียวกันเท่านั้น", async () => {
  const frame = { contentWindow: { postMessage: (payload) => sent.push(payload) } };
  const sent = [];
  const client = sandbox.createSandboxClient(() => frame, "chan-1");

  const pendingEval = client.evalCode("document.title");
  assert.equal(sent.at(-1).type, "eval");
  client.receive({
    data: { channel: "chan-อื่น", type: "result", id: sent.at(-1).id, ok: true, text: "hack" },
  });
  client.receive({
    data: { channel: "chan-1", type: "result", id: sent.at(-1).id, ok: true, text: "รายงาน" },
  });
  assert.deepEqual(await pendingEval, { ok: true, text: "รายงาน" });

  const pendingSnapshot = client.snapshot();
  const snapshotPayload = {
    title: "t",
    lang: "th",
    viewport: "width=device-width",
    textLength: 100,
    elements: 3,
    headings: [1],
    images: [],
    buttons: [],
    links: [],
    fields: [],
    ids: [],
    externalScripts: [],
    externalStyles: [],
    counts: { img: 0, button: 0, a: 0, form: 0, svg: 0 },
  };
  client.receive({
    data: { channel: "chan-1", type: "snapshot", id: sent.at(-1).id, data: snapshotPayload },
  });
  const reply = await pendingSnapshot;
  assert.equal(reply.ok, true);
  assert.equal(reply.data.title, "t");
  client.dispose();
});
