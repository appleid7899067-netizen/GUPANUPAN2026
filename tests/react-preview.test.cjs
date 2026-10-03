/**
 * ═══ ทดสอบเอกสารพรีวิวจริงด้วย React ตัวจริง ═══════════════════════════════
 *
 * เทสต์ชุดอื่น (`react-runtime` / `react-runner`) ตรวจชิ้นส่วนและรัน runner ใน VM
 * ส่วนชุดนี้เอาผลลัพธ์ปลายทาง — เอกสาร HTML ที่จะกลายเป็น `srcdoc` — ไปรันใน
 * DOM จำลองของ jsdom พร้อม React/ReactDOM UMD ตัวจริงที่ vendor ไว้
 * เพื่อพิสูจน์ว่าโปรเจกต์ React/Vite ที่โคลนมารันขึ้นจริงในเบราว์เซอร์จำลอง
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");
const { compileLib } = require("./ts-compile.cjs");

const { mods } = compileLib([
  "src/lib/builder.ts",
  "src/lib/react-runtime/transform.ts",
  "src/lib/react-runtime/runner-source.ts",
  "src/lib/react-runtime/preview.ts",
  "src/lib/github-import.ts",
]);
const builder = mods[0];
const transform = mods[1];
const preview = mods[3];
const githubImport = mods[4];

const VENDOR = path.join(__dirname, "..", "public", "vendor", "react");

// `buildPreviewDocument` โหลด UMD ผ่าน fetch("/vendor/react/…") เหมือนในเบราว์เซอร์
// ส่วนเทสต์รันใน Node จึงเสิร์ฟไฟล์จากดิสก์ให้เส้นทางเดียวกัน
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input.url;
  if (url.startsWith("/vendor/react/")) {
    const file = path.join(VENDOR, path.basename(url));
    return new Response(fs.readFileSync(file, "utf8"), {
      status: 200,
      headers: { "content-type": "application/javascript" },
    });
  }
  return realFetch(input, init);
};
const vendorScripts = [
  fs.readFileSync(path.join(VENDOR, "react.production.min.js"), "utf8"),
  fs.readFileSync(path.join(VENDOR, "react-dom.production.min.js"), "utf8"),
];
assert.ok(vendorScripts[0].length > 5_000, "ต้องมี React UMD ในโปรเจกต์");
assert.ok(vendorScripts[1].length > 50_000, "ต้องมี ReactDOM UMD ในโปรเจกต์");

/** โปรเจกต์ Vite+React แบบย่อที่โคลนจาก GitHub (มี origin เหมือนของจริง) */
const VITE_FILES = {
  "index.html": `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>ร้านกาแฟ GUPAN</title>
<link rel="stylesheet" href="/src/index.css"></head>
<body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>`,
  "src/main.tsx": `import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
createRoot(document.getElementById("root")!).render(<App />);
`,
  "src/App.tsx": `import { useMemo, useState } from "react";
import styles from "./App.module.css";
import menu from "./data/menu.json";
import logo from "./assets/logo.svg";

export default function App() {
  const [cups, setCups] = useState(2);
  const total = useMemo(() => menu.length * 45, []);
  return (
    <div className={styles.card}>
      <img src={logo} alt="โลโก้ร้าน" width={48} />
      <h1>ร้านกาแฟ GUPAN</h1>
      <ul>{menu.map((item: { name: string }) => <li key={item.name}>{item.name}</li>)}</ul>
      <button id="order" onClick={() => setCups(cups + 1)}>สั่งเพิ่ม</button>
      <p id="summary">ทั้งหมด {menu.length} เมนู · {cups} แก้ว · {total} บาท</p>
    </div>
  );
}
`,
  "src/App.module.css": ".card{padding:16px;color:#3b2314}",
  "src/index.css": "body{margin:0;font-family:sans-serif}",
  "src/data/menu.json": JSON.stringify([{ name: "เอสเพรสโซ่" }, { name: "ลาเต้" }, { name: "มอคค่า" }]),
  "src/assets/logo.svg": '<svg xmlns="http://www.w3.org/2000/svg"><circle r="5"/></svg>',
  "package.json": JSON.stringify({ name: "cafe", dependencies: { react: "^18.3.1", "react-dom": "^18.3.1" }, devDependencies: { vite: "^5.0.0" } }),
};

const ORIGIN = { provider: "github", owner: "acme", repo: "cafe", ref: "main" };

/** รันเอกสารเป็นหน้าจริงใน jsdom (สคริปต์ inline ทำงาน, ไม่โหลดresource ภายนอก) */
function openPreview(doc) {
  const dom = new JSDOM(doc, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://preview.gupan.local/" });
  return dom;
}

test("โปรเจกต์ Vite+React ที่โคลนมารันขึ้นในพรีวิวจริง (React ตัวจริง + DOM จริง)", async () => {
  const engine = transform.detectPreviewEngine(VITE_FILES);
  assert.equal(engine, "react", "ต้องตรวจพบว่าเป็นโปรเจกต์ React");

  const built = await preview.buildPreviewDocument(
    VITE_FILES,
    "index.html",
    "chan-live",
    { engine, origin: ORIGIN },
    builder.previewDocument,
  );
  assert.ok(built.bundle, "ต้องได้บันเดิลที่คอมไพล์แล้ว");
  assert.deepEqual(built.bundle.errors, [], "ต้องคอมไพล์ผ่านทุกไฟล์");
  assert.deepEqual(built.bundle.missing, [], "ต้องไม่ขาดแพ็กเกจ");

  const doc = preview.reactPreviewDocument(built.bundle, "chan-live", vendorScripts);
  const dom = openPreview(doc);
  // ให้ jsdom ประมวลผลสคริปต์ inline ให้ครบ
  await new Promise((resolve) => setTimeout(resolve, 120));

  const { document } = dom.window;
  const root = document.getElementById("root");
  assert.ok(root, "ต้องมี #root");
  assert.ok(root.children.length > 0, "React ต้อง mount จริง (มี DOM ลูก)");

  const text = document.body.textContent || "";
  assert.match(text, /ร้านกาแฟ GUPAN/, "ต้องเห็นข้อความจากคอมโพเนนต์");
  assert.match(text, /เอสเพรสโซ่/, "ต้องอ่าน JSON ได้");
  assert.match(text, /มอคค่า/);
  assert.match(text, /ทั้งหมด 3 เมนู · 2 แก้ว · 135 บาท/, "useState+useMemo ต้องทำงาน");

  // สไตล์: ทั้งที่ HTML อ้างและที่ import ในโค้ด ต้องถูกฉีดเข้า <head>
  const styles = [...document.querySelectorAll("style[data-file]")].map((node) => node.getAttribute("data-file"));
  assert.deepEqual(styles.sort(), ["src/App.module.css", "src/index.css"]);
  assert.match(document.head.textContent || "", /padding:16px/);

  // รูปต้องชี้ไฟล์จริงบน GitHub เพราะพรีวิวเก็บไบนารีไม่ได้
  const img = document.querySelector("img");
  assert.equal(
    img.getAttribute("src"),
    "https://raw.githubusercontent.com/acme/cafe/main/src/assets/logo.svg",
  );

  // คลิกจริง: React ต้องตอบสนอง state
  const button = document.getElementById("order");
  button.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.match(document.body.textContent || "", /3 แก้ว/, "ต้องกดปุ่มแล้ว state เปลี่ยน");

  // ไม่มีอะไรพัง → ต้องไม่มีแบนเนอร์วินิจฉัย
  assert.equal(document.querySelector("[data-gupan-diagnostics]"), null);
  dom.window.close();
});

test("โปรเจกต์ Next.js: mount หน้าแรกให้อัตโนมัติและบอกข้อจำกัดในพรีวิว", async () => {
  const nextFiles = {
    "package.json": JSON.stringify({ name: "next-app", dependencies: { next: "14.2.0", react: "^18", "react-dom": "^18" } }),
    "pages/_app.tsx": `import type { AppProps } from "next/app";
import "../styles/globals.css";
export default function MyApp({ Component, pageProps }: AppProps) { return <Component {...pageProps} />; }
`,
    "pages/index.tsx": `import Link from "next/link";
import Head from "next/head";
export default function Home() {
  return (
    <main>
      <Head><title>หน้าแรกจาก Next</title></Head>
      <h1>สวัสดีจาก Next.js บน GUPAN</h1>
      <Link href="/about">ไปหน้าถัดไป</Link>
    </main>
  );
}
`,
    "styles/globals.css": "body{background:#fafafa}",
  };
  assert.equal(transform.detectPreviewEngine(nextFiles), "react");

  const built = await preview.buildPreviewDocument(nextFiles, "package.json", "chan-next", {
    engine: "react",
  }, builder.previewDocument);
  assert.ok(built.bundle);
  assert.equal(built.bundle.mount, "synthetic", "ไม่มี HTML ในรีโป → ต้อง mount เอง");
  assert.deepEqual(built.bundle.errors, []);

  const doc = preview.reactPreviewDocument(built.bundle, "chan-next", vendorScripts);
  const dom = openPreview(doc);
  await new Promise((resolve) => setTimeout(resolve, 120));
  const text = dom.window.document.body.textContent || "";
  assert.match(text, /สวัสดีจาก Next.js บน GUPAN/, "ต้องเห็นหน้าแรกของ Next");
  assert.equal(dom.window.document.title, "หน้าแรกจาก Next", "next/head ต้องตั้งชื่อเรื่องได้");
  assert.match(dom.window.document.head.textContent || "", /background:#fafafa/, "globals.css ต้องถูกฉีด");
  dom.window.close();
});

test("แอปที่เรนเดอร์ไม่ผ่านได้ข้อความอ่านรู้เรื่อง ไม่ใช่หน้าเปล่า", async () => {
  const files = {
    "index.html": '<!doctype html><html><body><div id="root"></div><script type="module" src="/main.jsx"></script></body></html>',
    "main.jsx": `import { createRoot } from "react-dom/client";
import { broken } from "./missing-module";
function App() { return <h1>{broken}</h1>; }
createRoot(document.getElementById("root")).render(<App />);
`,
    "src/App.jsx": "export default function App() { throw new Error('การเชื่อมต่อ API ล้มเหลว'); }",
  };
  const built = await preview.buildPreviewDocument(files, "index.html", "chan-broken", {
    engine: "react",
  }, builder.previewDocument);
  const doc = preview.reactPreviewDocument(built.bundle, "chan-broken", vendorScripts);
  const dom = openPreview(doc);
  await new Promise((resolve) => setTimeout(resolve, 150));
  const text = dom.window.document.body.textContent || "";
  assert.match(
    text,
    /หน้านี้รันได้ไม่ครบในพรีวิว|missing-module/,
    "ต้องเห็นข้อความอธิบายแทนหน้าเปล่า/สแต็กหลุด",
  );
  assert.ok(dom.window.document.querySelector("[data-gupan-diagnostics]"), "ต้องมีแบนเนอร์วินิจฉัย");
  dom.window.close();
});

test("โปรเจกต์แบบ create-react-app (HTML ไม่มี <script>) ยัง mount ได้", async () => {
  // CRA ฉีดสคริปต์ตอน build — ในรีโปจึงมีแค่ src/index.js ที่รันตัวเอง
  const files = {
    "package.json": JSON.stringify({ dependencies: { react: "^18", "react-dom": "^18", "react-scripts": "5.0.1" } }),
    "public/index.html": `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>CRA App</title></head>
<body><noscript>ต้องเปิด JavaScript</noscript><div id="root"></div></body></html>`,
    "src/index.js": `import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
createRoot(document.getElementById("root")).render(<App />);
`,
    "src/App.js": `import logo from "./logo.svg";
export default function App() { return (<div><img src={logo} alt="logo" width="80" /><h1>สวัสดี CRA</h1></div>); }
`,
    "src/index.css": "body{margin:0;background:#eef}",
    "src/logo.svg": "<svg xmlns='http://www.w3.org/2000/svg'></svg>",
  };
  assert.equal(transform.detectPreviewEngine(files), "react");
  assert.equal(transform.pickClientEntry(files), "src/index.js");

  const built = await preview.buildPreviewDocument(files, "index.html", "chan-cra", {
    engine: "react",
  }, builder.previewDocument);
  assert.equal(built.bundle.entryModule, "src/index.js", "ต้องใช้ src/index.js เป็น entry");
  assert.deepEqual(built.bundle.errors, []);
  const dom = openPreview(preview.reactPreviewDocument(built.bundle, "chan-cra", vendorScripts));
  await new Promise((resolve) => setTimeout(resolve, 150));
  const text = dom.window.document.body.textContent || "";
  assert.match(text, /สวัสดี CRA/, "ต้องเห็นเนื้อหาที่ React เรนเดอร์");
  assert.equal(dom.window.document.getElementById("root").children.length > 0, true);
  assert.equal(dom.window.document.querySelector("[data-gupan-fatal]"), null, "ต้องไม่ขึ้นการ์ดแจ้งปัญหา");
  dom.window.close();
});

test("โปรเจกต์ที่หา entry ไม่เจอเห็นการ์ดแจ้งปัญหากลางจอ ไม่ใช่จอขาว", async () => {
  const files = {
    "index.html": '<!doctype html><html><body><h1>เปล่า</h1></body></html>',
    "styles.css": "body{font-family:sans-serif}",
    "package.json": JSON.stringify({ dependencies: { react: "^18" } }),
    "README.md": "# ไม่มีฟล์ตั้งต้น",
  };
  // จงใจให้ engine เป็น react เพื่อดูพฤติกรรมตอนหา entry ไม่เจอ
  const built = await preview.buildPreviewDocument(files, "index.html", "chan-noentry", {
    engine: "react",
  }, builder.previewDocument);
  assert.equal(built.bundle.entryModule, null);
  assert.ok(built.bundle.errors.length > 0, "ต้องรายงานว่าไม่พบไฟล์ตั้งต้น");
  const dom = openPreview(preview.reactPreviewDocument(built.bundle, "chan-noentry", vendorScripts));
  await new Promise((resolve) => setTimeout(resolve, 150));
  const card = dom.window.document.querySelector("[data-gupan-fatal]");
  assert.ok(card, "ต้องมีการ์ดแจ้งปัญหากลางจอ");
  assert.match(card.textContent || "", /หาไฟล์ตั้งต้นของแอปไม่เจอ/);
  dom.window.close();
});

test("เอกสารกำลังคอมไพล์และเอกสารแจ้งพังมีข้อความให้อ่านเสมอ", () => {
  const loading = preview.previewPlaceholderDocument();
  assert.match(loading, /กำลัง/);
  assert.match(loading, /Content-Security-Policy/);
  const failed = preview.previewFailureDocument('คอมไพล์ไม่ผ่าน <script>x</script>');
  assert.match(failed, /พรีวิวนี้ยังแสดงไม่ได้/);
  assert.ok(!failed.includes("<script>x</script>"), "ข้อความ error ต้องถูก escape");
  assert.match(failed, /&lt;script&gt;/);
});

test("คอมโพเนนต์ที่โยน error ตอนเรนเดอร์เห็นข้อความอธิบาย ไม่ใช่หน้าเปล่า", async () => {
  const files = {
    "index.html": '<!doctype html><html><body><div id="root"></div><script type="module" src="/main.jsx"></script></body></html>',
    "main.jsx": `import { createRoot } from "react-dom/client";
import App from "./App";
createRoot(document.getElementById("root")).render(<App />);
`,
    "App.jsx": `export default function App() { throw new Error("พังตอนเรนเดอร์"); }`,
  };
  const built = await preview.buildPreviewDocument(files, "index.html", "chan-throw", {
    engine: "react",
  }, builder.previewDocument);
  const dom = openPreview(
    preview.reactPreviewDocument(built.bundle, "chan-throw", vendorScripts),
  );
  await new Promise((resolve) => setTimeout(resolve, 150));
  const text = dom.window.document.body.textContent || "";
  assert.match(text, /หน้านี้รันได้ไม่ครบในพรีวิว/);
  assert.match(text, /พังตอนเรนเดอร์/, "ต้องบอกสาเหตุให้อ่านออก");
  dom.window.close();
});

test("โปรเจกต์ HTML ล้วนยังเดินเส้นทาง static เดิม (ไม่โหลด Babel)", async () => {
  const plan = githubImport.planImport({
    meta: { owner: "startbootstrap", repo: "agency", ref: "master", defaultBranch: "master", htmlUrl: "https://github.com/startbootstrap/agency" },
    files: [
      { path: "startbootstrap-agency-master/index.html", size: 200, text: '<!doctype html><html><body><h1>เอเจนซี่</h1><script src="js/app.js"></script></body></html>' },
      { path: "startbootstrap-agency-master/js/app.js", size: 40, text: "console.log('x');" },
    ],
    assets: [],
    skipped: [],
    notes: [],
  });
  assert.equal(
    transform.detectPreviewEngine(plan.files),
    "static",
    "เว็บ HTML+JS คลาสสิกยังใช้เส้นทาง static เดิม",
  );
  assert.equal(plan.origin.owner, "startbootstrap");
  assert.equal(plan.origin.webRoot, "startbootstrap-agency-master");
  // สคริปต์ที่อยู่ในโปรเจกต์ต้องไม่ถูกเขียนเป็น URL ของ GitHub
  assert.match(plan.files["index.html"], /src="js\/app\.js"/, "สคริปต์ในเครื่องต้องคงพาธเดิม");

  const htmlOnly = { "index.html": "<!doctype html><html><body><h1>สวัสดี</h1></body></html>" };
  assert.equal(transform.detectPreviewEngine(htmlOnly), "static");
  const built = await preview.buildPreviewDocument(htmlOnly, "index.html", "chan-static", { engine: "static" }, builder.previewDocument);
  assert.equal(built.bundle, undefined, "เส้นทาง static ต้องไม่คอมไพล์");
  assert.match(built.doc, /สวัสดี/);
  assert.ok(!built.doc.includes("__GUPAN_BOOT__"), "เอกสาร static ต้องไม่มี boot ของ React");
});
