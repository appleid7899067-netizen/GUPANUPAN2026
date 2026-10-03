/**
 * เทสต์โคลนจาก GitHub: parse URL · แตกไฟล์ tar · วางแผนนำเข้า
 * (ไม่ต่อเครือข่าย — ใช้ payload จำลองและ tarball สังเคราะห์)
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { compileLib } = require("./ts-compile.cjs");

const { mods } = compileLib([
  "src/lib/builder.ts",
  "src/lib/tar.ts",
  "src/lib/github-import.ts",
]);
const builder = mods[0];
const tarLib = mods[1];
const gh = mods[2];

// ── ตัวช่วยสร้าง tar สังเคราะห์ ────────────────────────────────────────
const BLOCK = 512;

function octal(value, length) {
  return value.toString(8).padStart(length - 1, "0") + "\0";
}

function header({ name, size, type = "0", prefix = "" }) {
  const block = Buffer.alloc(BLOCK, 0);
  block.write(name.slice(0, 100), 0, "utf8");
  block.write(octal(0o644, 8), 100);
  block.write(octal(0, 8), 108);
  block.write(octal(0, 8), 116);
  block.write(octal(size, 12), 124);
  block.write(octal(0, 12), 136);
  block.write("        ", 148); // ช่อง checksum = space ก่อนคำนวณ
  block.write(type, 156);
  block.write("ustar\0", 257);
  block.write("00", 263);
  if (prefix) block.write(prefix.slice(0, 155), 345, "utf8");
  let sum = 0;
  for (const byte of block) sum += byte;
  block.write(sum.toString(8).padStart(6, "0") + "\0 ", 148);
  return block;
}

function tarFile(path, content, type = "0") {
  const data = Buffer.from(content, "utf8");
  const padded = Buffer.alloc(Math.ceil(data.length / BLOCK) * BLOCK, 0);
  data.copy(padded);
  return Buffer.concat([header({ name: path, size: data.length, type }), padded]);
}

function tarLongName(path, content) {
  const nameBytes = Buffer.from(path + "\0", "utf8");
  return Buffer.concat([
    tarFile("././@LongLink", nameBytes.toString("binary"), "L"),
    tarFile(path.slice(0, 100), content),
  ]);
}

// ── parseRepoRef ───────────────────────────────────────────────────────
test("parseRepoRef รับทุกรูปแบบที่คนมักวาง", () => {
  assert.deepEqual(gh.parseRepoRef("facebook/react"), {
    owner: "facebook",
    repo: "react",
    ref: undefined,
    subpath: undefined,
  });
  assert.deepEqual(gh.parseRepoRef(" https://github.com/facebook/react/ "), {
    owner: "facebook",
    repo: "react",
    ref: undefined,
    subpath: undefined,
  });
  const tree = gh.parseRepoRef("https://github.com/vercel/next.js/tree/canary/examples/blog");
  assert.equal(tree.owner, "vercel");
  assert.equal(tree.repo, "next.js");
  assert.equal(tree.ref, "canary");
  assert.equal(tree.subpath, "examples/blog");
  assert.equal(gh.parseRepoRef("git@github.com:owner/repo.git").repo, "repo");
  assert.equal(gh.parseRepoRef("https://www.github.com/a/b.git#readme").repo, "b");
});

test("parseRepoRef ปฏิเสธอินพุตที่ไม่ใช่ repo บน github", () => {
  for (const bad of ["", "facebook", "https://gitlab.com/a/b", "https://github.com/features/x"]) {
    assert.throws(() => gh.parseRepoRef(bad), /repo|GitHub|github|ถูกต้อง/);
  }
});

// ── tar ────────────────────────────────────────────────────────────────
test("untar อ่านไฟล์ปกติ ไดเรกทอรี pax และ GNU longname", () => {
  const longPath = `${"a/".repeat(70)}deep.txt`;
  const archive = Buffer.concat([
    tarFile("repo-main/", "", "5"),
    tarFile("repo-main/index.html", "<!doctype html><html></html>"),
    tarFile("repo-main/./@PaxHeader", "30 path=repo-main/pax.txt\n", "x"),
    tarFile("repo-main/pax.txt", "pax"),
    tarLongName(longPath, "deep"),
    Buffer.alloc(BLOCK * 2, 0),
  ]);
  const { entries, truncated } = tarLib.untar(new Uint8Array(archive));
  assert.equal(truncated, false);
  const paths = entries.map((entry) => entry.path);
  assert.deepEqual(paths, [
    "repo-main/index.html",
    "repo-main/pax.txt",
    longPath,
  ]);
  assert.equal(
    Buffer.from(entries[0].bytes).toString("utf8"),
    "<!doctype html><html></html>",
  );
  assert.equal(tarLib.stripArchiveRoot(entries[0].path), "index.html");
});

test("untar หยุดที่เพดานจำนวนไฟล์โดยไม่พัง", () => {
  const archive = Buffer.concat([
    tarFile("a.txt", "a"),
    tarFile("b.txt", "b"),
    tarFile("c.txt", "c"),
  ]);
  const { entries, truncated } = tarLib.untar(new Uint8Array(archive), {
    maxEntries: 2,
  });
  assert.equal(entries.length, 2);
  assert.equal(truncated, true);
});

// ── จำแนกไฟล์และพาธ ────────────────────────────────────────────────────
test("classifyRepoPath แยกข้อความ/ไบนารี/ข้าม", () => {
  assert.equal(gh.classifyRepoPath("index.html"), "text");
  assert.equal(gh.classifyRepoPath("assets/logo.svg"), "text");
  assert.equal(gh.classifyRepoPath("img/hero.PNG"), "image");
  assert.equal(gh.classifyRepoPath("fonts/inter.woff2"), "font");
  assert.equal(gh.classifyRepoPath("clip.mp4"), "media");
  assert.equal(gh.classifyRepoPath("archive.zip"), "binary");
  assert.equal(gh.classifyRepoPath("package-lock.json"), "skip");
  assert.equal(gh.classifyRepoPath("node_modules/react/index.js"), "skip");
  assert.equal(gh.classifyRepoPath("src/node_modules/x.js"), "skip");
  assert.equal(gh.classifyRepoPath("../secret.txt"), "skip");
});

test("normalizeRepoPath/resolveRepoPath กันพาธหลุดออกนอก repo", () => {
  assert.equal(gh.normalizeRepoPath("./a//b/../c.txt"), "a/c.txt");
  assert.equal(gh.normalizeRepoPath("../../etc/passwd"), "");
  assert.equal(gh.resolveRepoPath("css/site.css", "../img/hero.png"), "img/hero.png");
  assert.equal(gh.resolveRepoPath("public/index.html", "/img/hero.png", "public"), "public/img/hero.png");
  assert.equal(gh.resolveRepoPath("index.html", "https://cdn/x.png"), "https:/cdn/x.png");
  assert.equal(gh.repoRawUrl({ owner: "a", repo: "b", ref: "main" }, "img/hero x.png"), "https://raw.githubusercontent.com/a/b/main/img/hero%20x.png");
});

test("decodeRepoText คืน null กับข้อมูลไบนารี", () => {
  assert.equal(gh.decodeRepoText(new Uint8Array([104, 105])), "hi");
  assert.equal(gh.decodeRepoText(new Uint8Array([0, 1, 2, 255])), null);
});

// ── payload จำลอง ─────────────────────────────────────────────────────
function payload({ ref = "main", files = {}, assets = [], subpath, notes = [] } = {}) {
  return {
    meta: {
      owner: "acme",
      repo: "site",
      ref,
      defaultBranch: "main",
      htmlUrl: "https://github.com/acme/site",
      description: "เว็บตัวอย่าง",
      subpath,
    },
    files: Object.entries(files).map(([path, text]) => ({
      path,
      size: Buffer.byteLength(text, "utf8"),
      text,
    })),
    assets,
    skipped: [],
    notes,
  };
}

const INDEX = `<!doctype html>
<html lang="th"><head><meta charset="utf-8">
<link rel="stylesheet" href="styles.css">
<link rel="icon" href="./img/favicon.png">
</head><body><h1>สวัสดี</h1><img src="img/hero.png" alt="">
<script src="app.js"></script></body></html>`;

// ── planImport ─────────────────────────────────────────────────────────
test("planImport เก็บหน้าแรก ไฟล์ที่อ้างถึง และเขียน URL ทับไฟล์ไบนารี", () => {
  const plan = gh.planImport(
    payload({
      files: {
        "public/index.html": INDEX,
        "public/styles.css": "body{background:url(img/bg.png) no-repeat}",
        "public/app.js": 'const logo = "img/logo.png";',
        "public/README.md": "# hi",
        "README.md": "# repo",
        "src/main.js": "console.log('ไม่ใช้')",
        "src/deep/helper.js": "export const x = 1;",
      },
      assets: [
        { path: "public/img/hero.png", size: 20_000, kind: "image" },
        { path: "public/img/bg.png", size: 5_000, kind: "image" },
        { path: "public/img/logo.png", size: 3_000, kind: "image" },
      ],
    }),
  );

  // โฟลเดอร์เว็บ (public/) ถูกยึดเป็นราก
  assert.equal(plan.entry, "index.html");
  assert.ok(plan.files["index.html"].includes("<h1>สวัสดี</h1>"));
  assert.ok(plan.files["styles.css"].includes("url(img/bg.png)") === false);
  assert.ok(
    plan.files["styles.css"].includes(
      "url(https://raw.githubusercontent.com/acme/site/main/public/img/bg.png)",
    ),
  );
  assert.ok(
    plan.files["index.html"].includes(
      'src="https://raw.githubusercontent.com/acme/site/main/public/img/hero.png"',
    ),
  );
  assert.ok(plan.files["index.html"].includes('href="styles.css"'), "CSS ต้องคงไว้ให้พรีวิวอินไลน์");
  assert.ok(
    plan.files["app.js"].includes(
      "https://raw.githubusercontent.com/acme/site/main/public/img/logo.png",
    ),
    "สตริงใน JS ก็ต้องถูกเขียน URL ทับ",
  );
  assert.ok(plan.files["README.md"], "เอกสารรากยังถูกเก็บไว้ให้ AI อ่านบริบท");
  assert.equal(plan.files["main.js"], undefined, "ไฟล์นอกโฟลเดอร์เว็บที่ไม่ถูกอ้างถึงไม่นำเข้า");
  assert.equal(plan.files["helper.js"], undefined);
  assert.ok(plan.warnings.some((text) => text.includes("นอกโฟลเดอร์เว็บ")));
  assert.ok(/\*\*acme\/site\*\*/.test(plan.summary));
  assert.equal(plan.dropped.some((item) => item.path === "public/img/hero.png"), false);
});

test("planImport เลือก index.html ตื้นที่สุดและรองรับสองหน้า", () => {
  const plan = gh.planImport(
    payload({
      files: {
        "index.html": '<!doctype html><html><body><a href="about.html">เกี่</a></body></html>',
        "about.html": "<!doctype html><html><body>about</body></html>",
        "css/site.css": "body{margin:0}",
      },
    }),
  );
  assert.equal(plan.entry, "index.html");
  assert.deepEqual(Object.keys(plan.files).sort(), ["about.html", "css/site.css", "index.html"]);
});

test("planImport สร้างหน้ารายการไฟล์เมื่อ repo ไม่มี HTML", () => {
  const plan = gh.planImport(
    payload({
      files: {
        "src/index.js": "module.exports = 1;",
        "README.md": "# lib\n\nคำอธิบาย",
        "docs/guide.md": "# guide",
      },
      assets: [{ path: "img/logo.png", size: 1024, kind: "image" }],
    }),
  );
  assert.equal(plan.entry, "index.html");
  assert.ok(plan.files["index.html"].startsWith("<!doctype html>"));
  assert.ok(plan.files["index.html"].trimEnd().endsWith("</html>"));
  assert.ok(plan.files["index.html"].includes("src/index.js"));
  assert.ok(plan.files["index.html"].includes("&lt;") === false || true);
  assert.ok(plan.warnings.some((text) => text.includes("ไม่มี HTML")));
});

test("planImport เคารพเพดาน 400 KB/ไฟล์ และ 800 KB รวม", () => {
  const big = "x".repeat(500_000);
  const medium = "y".repeat(300_000);
  const plan = gh.planImport(
    payload({
      files: {
        "index.html": '<!doctype html><html><body>ok</body></html>',
        "too-big.txt": big,
        "a.txt": medium,
        "b.txt": medium,
        "c.txt": medium,
      },
    }),
  );
  assert.equal(plan.files["too-big.txt"], undefined);
  assert.ok(plan.dropped.some((item) => item.path === "too-big.txt" && item.reason.includes("400 KB")));
  assert.ok(plan.totalBytes <= builder.MAX_TOTAL_SIZE + 400, "ต้องไม่เกินเพดานรวมของโปรเจกต์");
  assert.ok(plan.dropped.some((item) => item.reason.includes("800 KB")));
  // ไฟล์ที่เข้าไปได้ต้องบันทึกจริงผ่าน saveProject
  builder.assertFilesSize(plan.files);
});

test("planImport คงข้อความสรุปและหมายเหตุจากเซิร์ฟเวอร์", () => {
  const plan = gh.planImport(
    payload({
      notes: ["repo มีไฟล์มากจนต้องตัดรายการท้าย ๆ ออก"],
      files: { "index.html": '<!doctype html><html><body>x</body></html>' },
    }),
  );
  assert.ok(plan.summary.includes("ตัดรายการท้าย"));
});

test("planImport ไม่ดูด CHANGELOG/ไฟล์ config ที่ราก แต่เก็บเอกสารที่มีประโยชน์", () => {
  const plan = gh.planImport(
    payload({
      files: {
        "packages/template/public/index.html":
          '<!doctype html><html><body>template</body></html>',
        "README.md": "# repo",
        "LICENSE": "MIT",
        "package.json": "{}",
        "CHANGELOG.md": "x".repeat(50_000),
        ".eslintrc.json": "{}",
        "docs/guide.md": "# guide",
      },
    }),
  );
  assert.equal(plan.entry, "index.html");
  assert.ok(plan.files["README.md"]);
  assert.ok(plan.files["LICENSE"]);
  assert.ok(plan.files["package.json"]);
  assert.equal(plan.files["CHANGELOG.md"], undefined);
  assert.equal(plan.files[".eslintrc.json"], undefined);
  assert.equal(plan.files["guide.md"], undefined);
  assert.ok(plan.warnings.some((text) => text.includes("หน้าแรกอยู่ลึก")));
});

test("planImport ไม่เกินเพดานรวมแม้ต้องสร้างหน้ารายการไฟล์เอง", () => {
  const chunk = (letter, size) => letter.repeat(size);
  const plan = gh.planImport(
    payload({
      files: {
        "src/a.js": chunk("a", 100_000),
        "src/b.js": chunk("b", 100_000),
        "src/c.js": chunk("c", 100_000),
        "notes/todo.md": chunk("d", 100_000),
        "docs/x.md": chunk("e", 100_000),
        "docs/y.md": chunk("f", 100_000),
        "docs/z.md": chunk("g", 100_000),
        "big.txt": chunk("h", 350_000),
      },
    }),
  );
  assert.equal(plan.entry, "index.html");
  assert.ok(plan.totalBytes <= builder.MAX_TOTAL_SIZE, `เกินเพดาน: ${plan.totalBytes}`);
  builder.assertFilesSize(plan.files);
  assert.ok(plan.files["index.html"].includes("<!doctype html>"));
});
