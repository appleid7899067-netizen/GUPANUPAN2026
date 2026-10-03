/**
 * เทสต์คอมไพเลอร์ React/Vite/Next: จับคู่โมดูล · alias · TS/JSX · สไตล์ ·
 * asset URL · แพ็กเกจที่ขาด · เปลือกเอกสาร (ไม่ต่อเครือข่าย)
 *
 * การรันจริงในเบราว์เซอร์ถูกทดสอบด้วย `tests/browser-react.test.cjs` (Playwright)
 * ส่วนไฟล์นี้ตรวจ "บันเดิลที่ได้" ว่าโครงสร้างถูกต้อง
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { compileLib } = require("./ts-compile.cjs");

const { mods } = compileLib([
  "src/lib/builder.ts",
  "src/lib/react-runtime/transform.ts",
  "src/lib/react-runtime/runner-source.ts",
  "src/lib/github-import.ts",
]);
const builder = mods[0];
const transform = mods[1];
const runner = mods[2];

// ── โปรเจกต์ Vite + React + TS ตัวอย่าง ────────────────────────────────
const VITE_APP = {
  "package.json": JSON.stringify({
    name: "vite-app",
    dependencies: { react: "^18.2.0", "react-dom": "^18.2.0" },
    devDependencies: { vite: "^5.0.0", typescript: "^5.4.0" },
  }),
  "tsconfig.json": `{
  // alias แบบที่ vite template ใช้
  "compilerOptions": { "paths": { "@/*": ["./src/*"] } },
}`,
  "index.html": `<!doctype html>
<html lang="th">
  <head><meta charset="UTF-8"><title>ร้านกาแฟ</title>
    <link rel="stylesheet" href="/src/index.css">
    <link rel="icon" href="/vite.svg">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
  "src/main.tsx": `import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "@/App";

const root = document.getElementById("root")!;
createRoot(root).render(<App title="สวัสดี" />);
`,
  "src/App.tsx": `import { useState } from "react";
import { Header } from "@/components/Header";
import { ThemeProvider } from "styled-components";
import styles from "./App.module.css";
import items from "./data/items.json";
import logo from "./assets/logo.svg";

export interface Props { title: string }

export default function App(props: Props) {
  const [count, setCount] = useState(0);
  const cls: string = styles.card;
  return (
    <div className={cls}>
      <Header title={props.title} />
      <img src={logo} alt="โลโก้" width={48} />
      <p>มีสินค้า {items.length} รายการ · กดแล้ว {count} ครั้ง</p>
      <button onClick={() => setCount(count + 1)}>กด</button>
      {false ? <ThemeProvider theme={{}} /> : null}
    </div>
  );
}
`,
  "src/components/Header.tsx": `export function Header({ title }: { title: string }) {
  return <header><h1>{title}</h1></header>;
}
`,
  "src/App.module.css": ".card{padding:16px;border-radius:12px}",
  "src/index.css": "body{margin:0;font-family:system-ui}",
  "src/data/items.json": JSON.stringify([{ id: 1 }, { id: 2 }, { id: 3 }]),
  "src/assets/logo.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>",
  "src/unused.ts": "export const never = 1;",
  "public/vite.svg": "<svg></svg>",
};

const ORIGIN = {
  provider: "github",
  owner: "acme",
  repo: "vite-app",
  ref: "main",
  webRoot: "",
};

test("detectPreviewEngine แยกโปรเจกต์ React ออกจาก HTML ล้วน", () => {
  assert.equal(transform.detectPreviewEngine(VITE_APP), "react");
  assert.equal(
    transform.detectPreviewEngine({
      "index.html": '<!doctype html><html><body><h1>hi</h1><script type="module" src="app.js"></script></body></html>',
      "app.js": "console.log(1)",
    }),
    "react",
    "สคริปต์แบบ ES module = ต้องคอมไพล์",
  );
  assert.equal(
    transform.detectPreviewEngine({
      "index.html": '<!doctype html><html><body><h1>hi</h1><script src="js/theme.js"></script></body></html>',
      "js/theme.js": "console.log(1)",
    }),
    "static",
    "เว็บ HTML+JS คลาสสิกไม่ต้องย้ายเส้นทาง — static เดิมอินไลน์สคริปต์ให้อยู่แล้ว",
  );
  assert.equal(
    transform.detectPreviewEngine({
      "index.html": "<!doctype html><html><body><h1>hi</h1></body></html>",
      "styles.css": "body{}",
    }),
    "static",
  );
});

test("compileReactProject คอมไพล์ TS/TSX, alias, JSON, CSS และสไตล์จาก HTML", async () => {
  const bundle = await transform.compileReactProject({
    files: VITE_APP,
    origin: ORIGIN,
  });

  assert.equal(bundle.entryModule, "src/main.tsx");
  assert.equal(bundle.mount, "self");
  assert.deepEqual(bundle.errors, [], JSON.stringify(bundle.errors));

  const byPath = Object.fromEntries(bundle.modules.map((mod) => [mod.path, mod.code]));
  assert.ok(byPath["src/main.tsx"], "ต้องมี entry module");
  assert.ok(byPath["src/App.tsx"], "ต้องเดินตาม import ต่อ");
  assert.ok(byPath["src/components/Header.tsx"], "alias @/ ต้องถูกแก้เป็นพาธจริง");
  assert.ok(byPath["src/data/items.json"], "JSON ต้องถูกแปลงเป็นโมดูล");
  assert.equal(byPath["src/unused.ts"], undefined, "ไฟล์ที่ไม่ถูกใช้ต้องไม่ถูกคอมไพล์");

  // alias ถูกเขียนทับเป็นพาธจริง และ JSX/TS ถูกแปลงเป็น CommonJS
  assert.match(byPath["src/main.tsx"], /require\("src\/App\.tsx"\)/);
  assert.doesNotMatch(byPath["src/App.tsx"], /useState.*:\s*string/, "type annotation ต้องหายไป");
  assert.match(byPath["src/App.tsx"], /jsx-runtime/);
  assert.ok(
    byPath["src/App.tsx"].includes("App.module.css"),
    "CSS module ต้องถูก require (runner คืน proxy ของชื่อคลาส)",
  );
  assert.match(byPath["src/data/items.json"], /^module\.exports = /);

  // สไตล์: จาก <link> ใน HTML + จาก import ในโค้ด
  const stylePaths = bundle.styles.map((style) => style.path).sort();
  assert.deepEqual(stylePaths, ["src/App.module.css", "src/index.css"]);

  // เปลือกเอกสาร: สคริปต์ในเครื่องถูกตัด, CSP/link ภายนอกยังอยู่, div#root ยังอยู่
  assert.ok(bundle.entryHtml.includes('id="root"'), "ต้องมี container ให้ React");
  assert.ok(!/<script[^>]*src=/i.test(bundle.entryHtml), "ต้องตัดสคริปต์ในเครื่องออก");
  assert.ok(!bundle.entryHtml.includes("/src/index.css"), "ต้องตัดลิงก์ CSS ที่จะถูกอินไลน์");
  assert.ok(bundle.entryHtml.includes('<link rel="icon"'), "ไอคอน (asset) ต้องคงไว้");

  // แพ็กเกจที่ไม่มีในออฟไลน์ต้องถูกรายงาน ไม่ใช่พังเงียบ ๆ
  assert.deepEqual(
    bundle.missing.map((item) => item.specifier),
    ["styled-components"],
  );

  // asset ในโมดูลถูกเขียน URL ไปที่ repo (พรีวิวไม่เก็บไฟล์ไบนารี)
  assert.match(
    byPath["src/App.tsx"],
    /require\("src\/assets\/logo\.svg"\)/,
    "สเปซิไฟเออร์ของ require ต้องไม่ถูกเขียนทับเป็น URL",
  );
  assert.equal(
    byPath["src/assets/logo.svg"],
    'module.exports = "https://raw.githubusercontent.com/acme/vite-app/main/src/assets/logo.svg";',
    "import รูปต้องได้ URL ของไฟล์จริงบน GitHub",
  );
  assert.ok(
    bundle.entryHtml.includes("https://raw.githubusercontent.com/acme/vite-app/main/vite.svg"),
    "asset ใน HTML (พาธ /) ต้องชี้ที่ราก repo",
  );
});

test("compileReactProject ใช้ webRoot ของโฟลเดอร์ที่ถูกยึดเป็นรากเว็บ", async () => {
  // หมายเหตุ: ไฟล์ที่บันทึกในโปรเจกต์ถูกตัด prefix ของรากเว็บ (dist/) ออกแล้ว
  // โดย planImport — ส่วน webRoot เก็บไว้ใน ProjectOrigin เพื่อเขียน URL กลับ
  const files = {
    "index.html": `<!doctype html><html><body><div id="root"></div>
      <script src="/assets/index-abc.js"></script>
      <link rel="stylesheet" href="/assets/index-abc.css"></body></html>`,
    "assets/index-abc.js": `/* บันเดิลที่ build แล้ว */ document.getElementById("root").innerHTML="ok";`,
    "assets/index-abc.css": "body{margin:0}",
    "logo.png": "binary",
    "package.json": JSON.stringify({ dependencies: { react: "^18" } }),
  };
  const bundle = await transform.compileReactProject({
    files,
    origin: { ...ORIGIN, repo: "built-app", webRoot: "dist" },
  });
  assert.equal(bundle.entryModule, "assets/index-abc.js");
  assert.deepEqual(bundle.styles.map((style) => style.path), ["assets/index-abc.css"]);
  assert.deepEqual(bundle.errors, []);
  const js = bundle.modules.find((mod) => mod.path === "assets/index-abc.js").code;
  assert.ok(js.includes("document.getElementById"), "บันเดิลที่ build แล้วต้องรันได้ตรง ๆ");
});

test("compileReactProject สร้าง entry ให้โปรเจกต์ Next และเตือนเรื่องข้อจำกัด", async () => {
  const files = {
    "package.json": JSON.stringify({ dependencies: { next: "14.0.0", react: "^18" } }),
    "pages/index.tsx": `import Head from "next/head";
import Link from "next/link";
export default function Home() {
  return <main><Head><title>หน้าแรก</title></Head><h1>ยินดีต้อนรับ</h1>
    <Link href="/about">เกี่ยวกับ</Link></main>;
}`,
    "pages/_app.tsx": `export default function App({ Component, pageProps }: any) {
  return <Component {...pageProps} />;
}`,
    "styles/globals.css": "body{background:#111;color:#eee}",
  };
  const bundle = await transform.compileReactProject({ files, origin: ORIGIN });
  assert.equal(bundle.mount, "synthetic");
  assert.equal(bundle.entryModule, "__gupan_next_entry.js");
  const entry = bundle.modules.find((mod) => mod.path === "__gupan_next_entry.js");
  assert.ok(entry.code.includes("pages/index.tsx"), "entry ต้อง mount หน้าแรก");
  assert.ok(entry.code.includes("pages/_app.tsx"), "ต้องห่อด้วย _app ถ้ามี");
  assert.ok(
    bundle.modules.some((mod) => mod.path === "pages/_app.tsx"),
    "เลย์เอาต์ที่ entry เรียกต้องถูกคอมไพล์เข้าไปด้วย ไม่ใช่หายไป",
  );
  assert.deepEqual(bundle.errors, []);
  assert.deepEqual(bundle.missing, [], "next/* ต้องมี shim");
  assert.ok(bundle.entryHtml.includes('id="root"'));
  assert.ok(!bundle.entryHtml.includes("ยินดีต้อนรับ"), "เปลือกต้องสะอาด ไม่มีเศษหน้ารายการไฟล์");
  assert.deepEqual(bundle.styles.map((style) => style.path), ["styles/globals.css"]);

  // โปรเจกต์ app-router ที่วางไว้ใต้ src/ (แบบ monorepo จริง) ต้องเข้าเส้นทาง React
  const srcRouter = {
    "package.json": JSON.stringify({ dependencies: { next: "14.0.0", react: "^18" } }),
    "src/app/layout.tsx": `export default function Layout({ children }: any) { return <html><body>{children}</body></html>; }`,
    "src/app/page.tsx": "export default function Page() { return <h1>หน้าแรก</h1>; }",
  };
  assert.equal(transform.detectPreviewEngine(srcRouter), "react");
  assert.equal(transform.pickNextPage(srcRouter), "src/app/page.tsx");
  const srcBundle = await transform.compileReactProject({ files: srcRouter });
  assert.ok(
    srcBundle.modules.some((mod) => mod.path === "src/app/layout.tsx"),
    "layout ต้องถูกคอมไพล์",
  );
  assert.deepEqual(srcBundle.missing, []);
  const srcEntry = srcBundle.modules.find((mod) => mod.path === "__gupan_next_entry.js");
  assert.match(
    srcEntry.code,
    /React\.createElement\(App, null, React\.createElement\(Page, \{\}\)\)/,
    "layout ของ app router ต้องได้ children เป็นหน้าแรก (ไม่ใช่ {Component, pageProps})",
  );
});

test("alias แบบ '@/*' ชี้รากโปรเจกต์ (tsconfig ./) ต้องแก้พาธได้เหมือน Next starter", async () => {
  const files = {
    "tsconfig.json": `{ "compilerOptions": { "paths": { "@/*": ["./*"] } } }`,
    "package.json": JSON.stringify({ dependencies: { next: "14.0.0", react: "^18" } }),
    "app/page.tsx": `import { siteConfig } from "@/config/site";
export default function Page() { return <h1>{siteConfig.name}</h1>; }`,
    "config/site.ts": `export const siteConfig = { name: "ร้านกาแฟ" };`,
  };
  assert.deepEqual(transform.aliasesFromTsconfig(files), { "@": ".", "~": "src" });
  const bundle = await transform.compileReactProject({ files });
  assert.deepEqual(bundle.missing, [], "@/config ต้องถูกแก้เป็นไฟล์ในโปรเจกต์ ไม่ใช่แพ็กเกจ npm");
  assert.ok(bundle.modules.some((mod) => mod.path === "config/site.ts"));
});

test("compileReactProject รายงานข้อผิดพลาดที่อ่านรู้เรื่องแทนการพัง", async () => {
  const files = {
    "index.html": '<!doctype html><html><body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body></html>',
    "src/main.jsx": `import { missing } from "./missing-file";
import lodash from "lodash";
export default function App() { return <div>{lodash}{missing}</div>; }
`,
  };
  const bundle = await transform.compileReactProject({ files });
  assert.equal(bundle.entryModule, "src/main.jsx");
  const messages = bundle.errors.map((item) => item.message).join(" | ");
  assert.match(messages, /ไม่พบไฟล์ที่นำเข้า: "\.\/missing-file"/);
  assert.deepEqual(bundle.missing.map((item) => item.specifier), ["lodash"]);
});

test("compileReactProject ไม่ล้มเมื่อ JSX ผิดไวยากรณ์ (รายงานเป็น error ของไฟล์นั้น)", async () => {
  const bundle = await transform.compileReactProject({
    files: {
      "index.html": '<!doctype html><html><body><div id="root"></div><script type="module" src="/main.jsx"></script></body></html>',
      "main.jsx": "export default function App() { return <div>unclosed; }",
    },
  });
  assert.equal(bundle.errors.length, 1);
  assert.equal(bundle.errors[0].path, "main.jsx");
  assert.ok(bundle.modules.some((mod) => mod.path === "main.jsx"));
});

test("runner source ฝังได้ใน <script> โดยไม่ทำเอกสารพัง", () => {
  const source = runner.runnerSource();
  assert.ok(source.startsWith(";(function"));
  assert.ok(!/<\/script/i.test(source), "ห้ามมี </script> ในซอร์สของ runner");
  assert.ok(!/<\/script/i.test(transform.bareShellHtml()), "เปลือกเอกสารต้องไม่มีสคริปต์ค้าง");
});

test("planImport เก็บไฟล์โปรเจกต์เฟรมเวิร์กเท่าที่แอปใช้จริง", () => {
  const gh = mods[3];
  const payload = {
    meta: {
      owner: "acme",
      repo: "vite-app",
      ref: "main",
      defaultBranch: "main",
      htmlUrl: "https://github.com/acme/vite-app",
    },
    files: [
      {
        path: "index.html",
        size: 10,
        text: '<!doctype html><html><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>',
      },
      {
        path: "package.json",
        size: 10,
        text: JSON.stringify({ dependencies: { react: "^18", vite: "^5" } }),
      },
      { path: "src/main.tsx", size: 10, text: 'import App from "./App";\nimport "./index.css";' },
      { path: "src/App.tsx", size: 10, text: "export default function App(){return <div/>;}" },
      { path: "src/index.css", size: 10, text: "body{margin:0}" },
      { path: "e2e/home.spec.ts", size: 10, text: "test('x',()=>{})" },
      { path: "scripts/deploy.sh", size: 10, text: "echo hi" },
      { path: "fixtures/big.json", size: 10, text: "[]" },
      { path: "README.md", size: 10, text: "# app" },
    ],
    assets: [{ path: "src/assets/logo.svg", size: 20, kind: "image" }],
    skipped: [],
    notes: [],
  };
  const plan = gh.planImport(payload);
  assert.equal(plan.entry, "index.html");
  assert.equal(plan.webRoot, "");
  for (const keep of ["index.html", "package.json", "src/main.tsx", "src/App.tsx", "src/index.css", "README.md"]) {
    assert.ok(plan.files[keep] !== undefined, `ต้องเก็บ ${keep}`);
  }
  for (const drop of ["e2e/home.spec.ts", "scripts/deploy.sh", "fixtures/big.json"]) {
    assert.equal(plan.files[drop], undefined, `ต้องไม่เก็บ ${drop}`);
  }
  assert.ok(
    plan.warnings.some((text) => text.includes("เฟรมเวิร์ก")),
    "ต้องบอกผู้ใช้ว่าพรีวิวจะคอมไพล์ให้",
  );
});

test("planImport ของโปรเจกต์ static ยังเก็บทุกไฟล์ในโฟลเดอร์เว็บเหมือนเดิม", () => {
  const gh = mods[3];
  const plan = gh.planImport({
    meta: { owner: "a", repo: "b", ref: "main", defaultBranch: "main", htmlUrl: "" },
    files: [
      { path: "index.html", size: 10, text: "<!doctype html><html><body>hi</body></html>" },
      { path: "about.html", size: 10, text: "<!doctype html><html><body>about</body></html>" },
      { path: "css/site.css", size: 10, text: "body{}" },
      { path: "js/app.js", size: 10, text: "console.log(1)" },
      { path: "other/notes.txt", size: 10, text: "hi" },
    ],
    assets: [],
    skipped: [],
    notes: [],
  });
  // โปรเจกต์ static ที่อยู่ราก repo ยังเก็บทุกไฟล์ในโปรเจกต์ (พฤติกรรมเดิม)
  assert.deepEqual(
    Object.keys(plan.files).sort(),
    ["about.html", "css/site.css", "index.html", "js/app.js", "other/notes.txt"],
  );
  assert.equal(plan.webRoot, "");
});
