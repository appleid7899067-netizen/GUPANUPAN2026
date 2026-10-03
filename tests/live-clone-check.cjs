/**
 * ตรวจปลายทาง: คลังจริงบน GitHub → API route → planImport → คอมไพล์ → รันใน jsdom
 * ใช้งาน: node tests/live-clone-check.cjs <owner/repo> [subpath]
 * (ต้องมี dev server ที่ http://127.0.0.1:3000 หรือกำหนด GUPAN_BASE)
 */
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM, VirtualConsole } = require("jsdom");
const { compileLib } = require("./ts-compile.cjs");

// เครื่องมือตรวจ ไม่ใช่เทสต์: แอปจริงอาจโยน error ออกมาจาก effect/timer — เก็บไว้รายงาน ไม่ให้โปรเซสตาย
process.on("uncaughtException", (error) => console.log("UNCAUGHT:", error && error.message));
process.on("unhandledRejection", (error) => console.log("UNHANDLED:", error && error.message));

const repo = process.argv[2] || "theodorusclarence/vite-react-tailwind-starter";
const subpath = process.argv[3] || "";
const base = process.env.GUPAN_BASE || "http://127.0.0.1:3000";

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
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input.url;
  if (url.startsWith("/vendor/react/")) {
    return new Response(fs.readFileSync(path.join(VENDOR, path.basename(url)), "utf8"), { status: 200 });
  }
  return realFetch(input, init);
};

(async () => {
  const query = new URLSearchParams({ repo });
  if (subpath) query.set("subpath", subpath);
  const url = `${base}/api/github/import?${query}`;
  console.log("→", url);
  const res = await fetch(url);
  console.log("HTTP", res.status, `${(Number(res.headers.get("content-length") || 0) / 1024).toFixed(0)} KB`);
  const envelope = await res.json();
  if (!envelope.ok) {
    console.log("envelope:", JSON.stringify(envelope).slice(0, 400));
    process.exit(1);
  }
  const plan = githubImport.planImport(envelope.data);
  console.log("plan:", {
    entry: plan.entry,
    kept: plan.kept.length,
    dropped: plan.dropped.length,
    webRoot: plan.webRoot,
    origin: plan.origin,
    bytes: plan.totalBytes,
    warnings: plan.warnings,
  });

  const engine = transform.detectPreviewEngine(plan.files);
  console.log("engine:", engine);
  if (engine !== "react") {
    console.log("ไม่ใช่โปรเจกต์ React — จบการตรวจ");
    return;
  }

  const t0 = Date.now();
  const built = await preview.buildPreviewDocument(
    plan.files,
    plan.entry,
    "live",
    { engine, origin: plan.origin },
    builder.previewDocument,
  );
  console.log("คอมไพล์", built.bundle.modules.length, "โมดูล ใน", Date.now() - t0, "ms");
  console.log("errors:", built.bundle.errors);
  console.log("missing:", built.bundle.missing);
  console.log("styles:", built.bundle.styles.map((s) => s.path));
  console.log("warnings:", built.bundle.warnings);

  const vendor = [
    fs.readFileSync(path.join(VENDOR, "react.production.min.js"), "utf8"),
    fs.readFileSync(path.join(VENDOR, "react-dom.production.min.js"), "utf8"),
  ];
  const doc = preview.reactPreviewDocument(built.bundle, "live", vendor);
  fs.writeFileSync("/tmp/live-preview.html", doc);
  console.log("เอกสารพรีวิว:", (doc.length / 1024).toFixed(0), "KB → /tmp/live-preview.html");

  const seen = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("error", (...args) => seen.push(args.join(" ")));
  virtualConsole.on("warn", (...args) => seen.push("[เตือน] " + args.join(" ")));
  // error ที่ React รายงานผ่าน window.onerror ต้องไม่ทำให้โปรเซสตรวจสอบตาย
  virtualConsole.on("jsdomError", (error) => seen.push("jsdomError: " + error.message));
  const dom = new JSDOM(doc, {
    runScripts: "dangerously",
    pretendToBeVisual: true,
    virtualConsole,
    url: "https://preview.gupan.local/",
  });
  await new Promise((r) => setTimeout(r, 400));
  const clone = dom.window.document.body.cloneNode(true);
  clone.querySelectorAll("script").forEach((node) => node.remove());
  const text = (clone.textContent || "").replace(/\s+/g, " ").slice(0, 400);
  console.log("ข้อความที่เรนเดอร์:", text || "(ว่าง)");
  console.log("#root ลูก:", dom.window.document.getElementById("root")?.children.length ?? "ไม่มี #root");
  const errors = seen.filter((line) => line.startsWith("Error") || line.includes("[gupan]"));
  if (errors.length) console.log("ข้อผิดพลาดในหน้า:", errors.slice(0, 6));
  const banner = dom.window.document.querySelector("[data-gupan-diagnostics]");
  if (banner) {
    const items = [...banner.querySelectorAll("li")].map((node) => node.textContent || "");
    console.log("แบนเนอร์วินิจฉัย:", items.length ? items : (banner.textContent || "").slice(0, 300));
  } else {
    console.log("แบนเนอร์วินิจฉัย: ไม่มี");
  }
  dom.window.close();
})();
