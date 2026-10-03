/**
 * รันเอกสารพรีวิว React ที่ประกอบเสร็จแล้วใน VM พร้อม DOM จำลอง
 * เพื่อพิสูจน์ว่า runner โหลดโมดูลตามกราฟ, แก้พาธ, ฉีดสไตล์, คืนค่า CSS module,
 * อ่าน JSON, แทนไอคอนที่ไม่มี และรายงานปัญหาได้จริง (ไม่ต้องมีเบราว์เซอร์)
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { compileLib } = require("./ts-compile.cjs");

const { mods } = compileLib([
  "src/lib/builder.ts",
  "src/lib/react-runtime/transform.ts",
  "src/lib/react-runtime/runner-source.ts",
  "src/lib/react-runtime/preview.ts",
]);
const transform = mods[1];
const runner = mods[2];
const preview = mods[3];

/** เอกสารพรีวิวจริง (ไม่ฉีด React UMD — เทสต์ใช้ React จำลองใน VM) */
function buildDoc(bundle, channel) {
  return preview.reactPreviewDocument(bundle, channel, []);
}

// ── DOM จำลองแบบพอใช้ ──────────────────────────────────────────────────
function createElement(tag) {
  const node = {
    tagName: String(tag).toUpperCase(),
    children: [],
    attributes: {},
    style: {},
    _text: "",
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    getAttribute(name) {
      return this.attributes[name];
    },
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    remove() {},
    addEventListener() {},
    closest() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    get textContent() {
      return this.nodes === undefined ? this._text : this._text;
    },
    set textContent(value) {
      this._text = String(value);
    },
  };
  return node;
}

function createDom() {
  const head = createElement("head");
  const body = createElement("body");
  const root = createElement("div");
  root.id = "root"; // DOM จริงสะท้อน attribute id ให้เป็นพร็อพერვตี
  const byId = { root };
  const document = {
    head,
    body,
    readyState: "complete",
    title: "",
    createElement,
    getElementById: (id) => byId[id] ?? null,
    getElementsByTagName: (tag) => (tag === "head" ? [head] : [body]),
    addEventListener() {},
    querySelectorAll: () => [],
  };
  return { document, head, body, root };
}

/** React จำลอง: เรียกคอมโพเนนต์จริงเพื่อให้เห็นว่าโค้ดแอปรันได้ */
function createReactStub(rendered) {
  const React = {
    version: "18.3.1",
    Fragment: Symbol("Fragment"),
    StrictMode: Symbol("StrictMode"),
    createElement(type, props, ...children) {
      // เหมือน React จริง: children ที่ส่งมาเป็นอาร์กิวเมนต์ทับ props.children
      // แต่ถ้าไม่มีอาร์กิวเมนต์ ต้องใช้ props.children ที่ JSX runtime ใส่มา
      const merged = { ...(props || {}) };
      if (children.length === 1) merged.children = children[0];
      else if (children.length > 1) merged.children = children;
      return { type, props: merged };
    },
    cloneElement(element, props) {
      return { ...element, props: { ...element.props, ...props } };
    },
    isValidElement(value) {
      return !!(value && typeof value === "object" && "type" in value && "props" in value);
    },
    useState: (initial) => [initial, () => {}],
    useReducer: (reducer, initial) => [initial, () => {}],
    useEffect: () => {},
    useLayoutEffect: () => {},
    useMemo: (factory) => factory(),
    useCallback: (fn) => fn,
    useRef: (value) => ({ current: value }),
    useContext: () => null,
    createContext: (value) => ({ Provider: "Provider", Consumer: "Consumer", _default: value }),
    memo: (component) => component,
    forwardRef: (component) => component,
    Children: {
      map: (children, fn) => (Array.isArray(children) ? children.map(fn) : [fn(children, 0)]),
      toArray: (children) => (Array.isArray(children) ? children : [children]),
      count: (children) => (Array.isArray(children) ? children.length : 1),
    },
  };
  React.ReactDOM = null;

  function currentComponent() {
    return rendered.components[rendered.components.length - 1] || "unknown";
  }

  /** เดินต้นไม้ที่ render แล้ว: เรียกฟังก์ชันคอมโพเนนต์และเก็บข้อความที่เห็น */
  function walk(node, depth) {
    if (node === null || node === undefined || depth > 12) return;
    if (typeof node === "string" || typeof node === "number") {
      rendered.text.push(String(node));
      return;
    }
    if (Array.isArray(node)) {
      for (const child of node) walk(child, depth + 1);
      return;
    }
    if (typeof node.type === "function") {
      rendered.components.push(node.type.name || "anonymous");
      walk(node.type(node.props || {}), depth + 1);
      return;
    }
    // เก็บค่า src ของ <img> ที่แอพเรนเดอร์ เพื่อยืนยันว่า asset ชี้ไฟล์จริงบน GitHub
    if (node.props && typeof node.props.src === "string") {
      rendered.assets[currentComponent()] = node.props.src;
      rendered.srcs.push(node.props.src);
    }
    // ลูกอาจเป็นสตริง ตัวเลข อาร์เรย์ หรือ element เดี่ยว (แบบที่ React ทำ)
    walk(node.props ? node.props.children : undefined, depth + 1);
  }

  const ReactDOM = {
    createRoot(container) {
      rendered.container = container;
      return {
        render(node) {
          rendered.rendered = true;
          walk(node, 0);
        },
        unmount() {},
      };
    },
    hydrateRoot(container) {
      return ReactDOM.createRoot(container);
    },
  };
  return { React, ReactDOM };
}

/** แยก boot config + runner จากเอกสารพรีวิวจริง แล้วรันใน VM */
function runPreviewDocument(doc) {
  const bootMatch = /window\.__GUPAN_BOOT__=(\{[\s\S]*?\});<\/script>/.exec(doc);
  assert.ok(bootMatch, "ต้องมี boot config ในเอกสารพรีวิว");
  const boot = JSON.parse(bootMatch[1].replace(/\\u003c/g, "<"));

  const runnerMatch = /<script>;\((function[\s\S]*?)\)\(\);<\/script>/.exec(doc);
  assert.ok(runnerMatch, "ต้องมี runner ในเอกสารพรีวิว");
  const runnerCode = `;(${runnerMatch[1]})();`;

  const dom = createDom();
  const rendered = { text: [], components: [], rendered: false, container: null, assets: {}, srcs: [] };
  const { React, ReactDOM } = createReactStub(rendered);
  const logs = [];

  const window = {
    React,
    ReactDOM,
    __GUPAN_BOOT__: boot,
    addEventListener() {},
    parent: { postMessage() {} },
  };
  const context = {
    window,
    document: dom.document,
    console: {
      log: (...args) => logs.push(["log", args.join(" ")]),
      warn: (...args) => logs.push(["warn", args.join(" ")]),
      error: (...args) => logs.push(["error", args.join(" ")]),
    },
    setTimeout,
    clearTimeout,
    URLSearchParams,
    Date,
    Math,
    JSON,
    Object,
    Array,
    String,
    Number,
    Boolean,
    Error,
    Promise,
    Map,
    Set,
    Symbol,
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(runnerCode, context, { filename: "gupan-runner.js" });
  return { dom, rendered, logs, boot };
}

const FIXTURE = {
  "index.html": `<!doctype html><html lang="th"><head><title>ร้านกาแฟ</title>
    <link rel="stylesheet" href="/src/index.css"></head>
  <body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>`,
  "src/main.tsx": `import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
`,
  "src/App.tsx": `import { useState } from "react";
import styles from "./App.module.css";
import menu from "./data/menu.json";
import logo from "./assets/logo.svg";

export default function App() {
  const [count] = useState(2);
  return (
    <div className={styles.card}>
      <h1>ร้านกาแฟ GUPAN</h1>
      <img src={logo} alt="โลโก้" />
      <ul>{menu.map((item: { name: string }) => <li key={item.name}>{item.name}</li>)}</ul>
      <p>ทั้งหมด {menu.length} เมนู · {count} แก้ว</p>
    </div>
  );
}
`,
  "src/App.module.css": ".card{padding:16px}",
  "src/index.css": "body{margin:0}",
  "src/data/menu.json": JSON.stringify([{ name: "เอสเพรสโซ่" }, { name: "ลาเต้" }]),
  "src/assets/logo.svg": "<svg></svg>",
  "package.json": JSON.stringify({ dependencies: { react: "^18", vite: "^5" } }),
};

const ORIGIN = { provider: "github", owner: "acme", repo: "cafe", ref: "main", webRoot: "" };

test("runner รันโปรเจกต์ Vite+React ได้ครบวงจร (โมดูล, สไตล์, CSS module, JSON, asset)", async () => {
  const bundle = await transform.compileReactProject({ files: FIXTURE, origin: ORIGIN });
  const doc = buildDoc(bundle, "chan-1");
  const { dom, rendered, logs } = runPreviewDocument(doc);

  assert.ok(
    rendered.rendered,
    "ต้องเรียก render() — logs: " + JSON.stringify(logs.slice(0, 8)),
  );
  assert.equal(rendered.container.id, "root");
  const text = rendered.text.join(""); // ข้อความที่ผู้ใช้เห็น เรียงตามลำดับในต้นไม้
  assert.match(text, /ร้านกาแฟ GUPAN/, "ต้องเห็นข้อความไทยจากคอมโพเนนต์");
  assert.match(text, /เอสเพรสโซ่/, "ต้องอ่าน JSON ได้");
  assert.match(text, /ลาเต้/);
  assert.match(text, /ทั้งหมด 2 เมนู · 2 แก้ว/, "useState ต้องคืนค่าเริ่มต้น");

  // CSS module คืนชื่อคลาสให้ใช้ได้ และ CSS ถูกฉีดเข้าเอกสาร
  const styleTags = dom.head.children.filter((node) => node.tagName === "STYLE");
  assert.deepEqual(
    styleTags.map((node) => node.getAttribute("data-file")).sort(),
    ["src/App.module.css", "src/index.css"],
    "ต้องฉีดสไตล์ที่ HTML อ้างและที่ import ไว้",
  );
  assert.match(styleTags.map((node) => node.textContent).join(""), /padding:16px/);

  // ไม่มีปัญหา → ไม่มีแบนเนอร์วินิจฉัย
  assert.equal(
    dom.body.children.filter((node) => node.getAttribute("data-gupan-diagnostics")).length,
    0,
  );
  assert.ok(!logs.some(([level]) => level === "error"), "ต้องไม่มี console.error");
});

test("runner เขียน URL ของ asset ให้ชี้ GitHub และไอคอนที่ไม่มีไม่ทำแอพพัง", async () => {
  const withIcons = {
    ...FIXTURE,
    "src/App.tsx": `import { Coffee } from "lucide-react";
import logo from "./assets/logo.svg";
export default function App() {
  return <div><Coffee size={16} /><img src={logo} alt="โลโก้" /></div>;
}
`,
  };
  const bundle = await transform.compileReactProject({ files: withIcons, origin: ORIGIN });
  const doc = buildDoc(bundle, "chan-2");
  const { rendered, dom } = runPreviewDocument(doc);
  assert.ok(rendered.components.includes("App"), "คอมโพเนนต์ App ต้องถูกเรียก");
  assert.equal(rendered.srcs.length, 1, "ต้องมี <img> หนึ่งรูปที่เรนเดอร์จริง");
  assert.equal(
    rendered.srcs[0],
    "https://raw.githubusercontent.com/acme/cafe/main/src/assets/logo.svg",
    "asset ต้องชี้ไฟล์จริงบน GitHub",
  );
  // lucide-react ไม่มีในออฟไลน์ → ต้องมีแบนเนอร์บอก ไม่ใช่พังเงียบ
  const banner = dom.body.children.find((node) => node.getAttribute("data-gupan-diagnostics"));
  assert.ok(banner, "ต้องมีแบนเนอร์วินิจฉัยเมื่อมีแพ็กเกจที่ใช้ไม่ได้");
  const bannerText = banner.children
    .flatMap((child) => child.children || [])
    .map((node) => node.textContent)
    .join(" | ");
  assert.match(bannerText, /lucide-react/);
});

test("runner รายงานข้อผิดพลาดของโมดูลที่หายไปพร้อมบอกชื่อไฟล์", async () => {
  const files = {
    "index.html": '<!doctype html><html><body><div id="root"></div><script type="module" src="/main.jsx"></script></body></html>',
    "main.jsx": `import { Hero } from "./components/Hero";
import { createRoot } from "react-dom/client";
createRoot(document.getElementById("root")).render(<Hero />);
`,
  };
  const bundle = await transform.compileReactProject({ files });
  const doc = buildDoc(bundle, "chan-3");
  const { dom, logs } = runPreviewDocument(doc);
  const banner = dom.body.children.find((node) => node.getAttribute("data-gupan-diagnostics"));
  assert.ok(banner, "ต้องมีแบนเนอร์เมื่อโมดูลหาย");
  const messages = logs.map(([level, text]) => `${level}:${text}`).join("\n");
  assert.match(messages, /components\/Hero/, "console ต้องบอกว่าไฟล์ไหนหาย");
});

test("runner ให้ jsx-runtime ครบทั้ง jsx/jsxs/Fragment ตามที่ React ต้องใช้", async () => {
  // React 18 เลือก jsxs เมื่อ children เป็นอาร์เรย์ — ขาดตัวนี้แอปจริงพังทั้งหน้า
  const source = runner.runnerSource();
  assert.match(source, /jsxRuntime\.jsxs = jsxRuntime\.jsx/, "ต้องมี jsxs");
  const files = {
    "index.html": '<!doctype html><html><body><div id="root"></div><script type="module" src="/main.jsx"></script></body></html>',
    "main.jsx": `import { createRoot } from "react-dom/client";
const items = ["ก", "ข"];
function App() { return <><h1>หัวข้อ</h1><ul>{items.map((x) => <li key={x}>{x}</li>)}</ul></>; }
createRoot(document.getElementById("root")).render(<App />);
`,
  };
  const bundle = await transform.compileReactProject({ files });
  const built = buildDoc(bundle, "chan-5");
  const { rendered } = runPreviewDocument(built);
  assert.ok(rendered.rendered, "ต้องเรนเดอร์ได้");
  assert.match(rendered.text.join(""), /หัวข้อ/);
});

test("boot config ที่ฝังในเอกสารเป็น JSON ที่ใช้ได้และไม่มี </script> หลุด", async () => {
  const bundle = await transform.compileReactProject({ files: FIXTURE, origin: ORIGIN });
  const doc = buildDoc(bundle, "chan-4");
  assert.ok(doc.includes("Content-Security-Policy"), "ต้องมี CSP");
  assert.match(doc, /script-src 'unsafe-inline' 'unsafe-eval'/);
  assert.match(doc, /connect-src 'none'/, "ยังต้องปิดเครือข่าย");
  assert.ok(!/<\/script>\s*<\/script>/.test(doc));
  const bootCount = (doc.match(/window\.__GUPAN_BOOT__=/g) || []).length;
  assert.equal(bootCount, 1, "ต้องมี boot config ตัวเดียว");
  assert.ok(runner.runnerSource().length > 4000, "runner ต้องมีเนื้อจริง");
});
