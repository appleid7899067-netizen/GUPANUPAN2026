/* GUPAN Blog — vanilla JS blog app. No framework, no CDN, works offline. */
"use strict";

/* ================= data ================= */
const LS_KEY = "gupan:blog:v1";
const DAY = 86400000;

const CATS = [
  { id: "all", label: "ทั้งหมด" },
  { id: "code", label: "💻 ทิปส์โค้ด" },
  { id: "design", label: "🎨 ดีไซน์" },
  { id: "business", label: "💼 ธุรกิจ" },
  { id: "note", label: "📝 บันทึก" },
];
const catLabel = (id) => (CATS.find((c) => c.id === id) || {}).label || id;

const EMOJIS = ["✦", "🚀", "💡", "☕", "🎨", "📱", "⚡", "🌙", "🛠️", "📊", "💜", "🔥"];

function seed() {
  const now = Date.now();
  return [
    {
      id: "seed-first-web",
      title: "เริ่มต้นสร้างเว็บแรกด้วย HTML/CSS/JS",
      excerpt: "ไม่ต้องรู้เฟรมเวิร์กก็สร้างเว็บได้ — เปิดไฟล์นี้ด้วย 3 ไฟล์แล้วไปต่อได้เลย",
      cat: "code", emoji: "🚀",
      createdAt: now - 1 * DAY, views: 128, likes: 24, liked: false, saved: false,
      mine: false, author: "ทีม GUPAN",
      comments: [
        { name: "น้องมิ้น", text: "ทำตามแล้วเปิดเว็บตัวเองได้จริง ขอบคุณมากค่ะ 🙏", at: now - 20 * 3600000 },
        { name: "พี่โจ", text: "อยากให้มีตอนต่อไปเรื่อง deploy ขึ้นเน็ตครับ", at: now - 5 * 3600000 },
      ],
      body: [
        "## เริ่มจาก 3 ไฟล์พอ",
        "",
        "เว็บทุกเว็บในโลกเริ่มจากสิ่งเดียวกัน — **HTML** โครงกระดูก, **CSS** เสื้อผ้า, **JavaScript** สมอง ลองสร้าง 3 ไฟล์นี้ในโฟลเดอร์เดียวกัน:",
        "",
        "```",
        "my-web/",
        "├── index.html",
        "├── styles.css",
        "└── app.js",
        "```",
        "",
        "## ไฟล์ HTML ตั้งต้น",
        "",
        "```html",
        "<!doctype html>",
        "<html lang=\"th\">",
        "<head>",
        "  <meta charset=\"UTF-8\">",
        "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
        "  <title>เว็บแรกของฉัน</title>",
        "  <link rel=\"stylesheet\" href=\"./styles.css\">",
        "</head>",
        "<body>",
        "  <h1>สวัสดีเว็บ! 👋</h1>",
        "  <script src=\"./app.js\"></script>",
        "</body>",
        "</html>",
        "```",
        "",
        "## เคล็ดลับมือใหม่",
        "",
        "- อย่าลืม `viewport` ไม่งั้นเว็บบนมือถือจะตัวจิ๋ว",
        "- เปิด DevTools (กด F12) ดู error ได้ทันที",
        "- ทำ **mobile-first** ตั้งแต่บรรทัดแรก ชีวิตจะง่ายขึ้นเยอะ",
        "",
        "> เว็บที่ดีไม่ใช่เว็บที่ใช้เทคโนโลยีเยอะ แต่คือเว็บที่คนใช้แล้วไม่ต้องคิด",
      ].join("\n"),
    },
    {
      id: "seed-css-tricks",
      title: "10 เทคนิค CSS ที่ทำให้เว็บดูแพงทันที",
      excerpt: "แค่เงา ระยะห่าง และฟอนต์ดี ๆ เว็บบ้าน ๆ ก็กลายเป็นเว็บพรีเมียมได้",
      cat: "design", emoji: "🎨",
      createdAt: now - 3 * DAY, views: 342, likes: 51, liked: false, saved: false,
      mine: false, author: "ทีม GUPAN",
      comments: [
        { name: "แพร", text: "ข้อ glassmorphism เอาไปใช้กับร้านเลย สวยมาก", at: now - 2 * DAY },
      ],
      body: [
        "## 1. เงาแบบมีเลเยอร์",
        "",
        "อย่าใช้เงาชั้นเดียว ลองซ้อน 2 ชั้น — ชั้นใกล้คม ชั้นไกลฟุ้ง จะได้มิติแบบเว็บพรีเมียมทันที",
        "",
        "## 2. ระยะห่างคือความหรู",
        "",
        "เพิ่ม `padding` และ `line-height: 1.8` ให้ตัวอักษรไทยมีที่หายใจ ข้อความจะอ่านง่ายขึ้น 200%",
        "",
        "## 3. สีอย่าเกิน 3 + เทา",
        "",
        "- สีหลัก 1 สี (เช่น ม่วง #A78BFA)",
        "- สีเน้น 1 สี (เช่น เขียวสำหรับ success)",
        "- ที่เหลือใช้สเกลเทา",
        "",
        "## 4. มุมโค้งสม่ำเสมอ",
        "",
        "ตั้งตัวแปร `--radius: 14px` แล้วใช้ทั้งเว็บ ความสม่ำเสมอ = ความน่าเชื่อถือ",
        "",
        "## 5. ปุ่มต้องแตะง่าย",
        "",
        "บนมือถือปุ่มควรสูงอย่างน้อย **44px** นิ้วโป้งจะขอบคุณคุณ",
        "",
        "> กฎทอง: ถ้าต้องเลือกระหว่าง “สวย” กับ “อ่านง่าย” — เลือกอ่านง่ายเสมอ",
      ].join("\n"),
    },
    {
      id: "seed-js-2026",
      title: "JavaScript สมัยใหม่: 5 เรื่องที่ต้องรู้ปี 2026",
      excerpt: "ตั้งแต่ async/await ยัน optional chaining — เขียน JS แบบคนปีนี้",
      cat: "code", emoji: "⚡",
      createdAt: now - 6 * DAY, views: 517, likes: 63, liked: false, saved: false,
      mine: false, author: "ทีม GUPAN",
      comments: [],
      body: [
        "## 1. Optional chaining (`?.`)",
        "",
        "เลิกเขียน `a && a.b && a.b.c` ได้แล้ว:",
        "",
        "```js",
        "const name = user?.profile?.name ?? \"ผู้เยี่ยมชม\";",
        "```",
        "",
        "## 2. `??` ต่างจาก `||`",
        "",
        "`??` สนใจแค่ `null/undefined` ส่วน `0` กับ `\"\"` ยังถือว่ามีค่า — เหมาะกับฟอร์มมาก",
        "",
        "## 3. Array methods แทน for",
        "",
        "```js",
        "const total = items",
        "  .filter(i => i.inStock)",
        "  .map(i => i.price)",
        "  .reduce((a, b) => a + b, 0);",
        "```",
        "",
        "## 4. `async/await` + try/catch",
        "",
        "โค้ดอ่านเป็นภาษาคน แทนที่จะเป็น pyramid of doom",
        "",
        "## 5. Modules (`import/export`)",
        "",
        "แยกไฟล์ตามหน้าที่ แล้ว `import` มาใช้ — โปรเจกต์โตแค่ไหนก็ไม่พันกัน",
      ].join("\n"),
    },
    {
      id: "seed-mobile-first",
      title: "ทำไมเว็บต้อง Mobile-First (พร้อมวิธีเริ่ม)",
      excerpt: "คนไทยเข้าเว็บจากมือถือเกิน 80% — ออกแบบจอเล็กก่อน แล้วค่อยขยาย",
      cat: "design", emoji: "📱",
      createdAt: now - 9 * DAY, views: 289, likes: 37, liked: false, saved: false,
      mine: false, author: "ทีม GUPAN",
      comments: [
        { name: "บีม", text: "เพิ่งรู้ว่า media query ควรใช้ min-width เป็นหลัก 👍", at: now - 8 * DAY },
      ],
      body: [
        "## ตัวเลขไม่โกหก",
        "",
        "คนไทยส่วนใหญ่เข้าเว็บจาก**มือถือ** ถ้าเว็บคุณพังบนจอ 390px — คุณเสียลูกค้าไปแล้ว 80%",
        "",
        "## หลัก 3 ข้อ",
        "",
        "1. **CSS ตั้งต้น = มือถือ** แล้วใช้ `@media (min-width: 640px)` ขยายขึ้น",
        "2. **นิ้วโป้งคือเมาส์** — ปุ่มใหญ่ ระยะห่างพอ ไม่ต้องซูม",
        "3. **ทดสอบจอเล็กก่อนเสมอ** — เปิด DevTools กด device toolbar ทุกครั้งที่แก้",
        "",
        "```css",
        "/* มือถือก่อน */",
        ".feed { display: grid; grid-template-columns: 1fr; }",
        "",
        "/* จอใหญ่ค่อยขยาย */",
        "@media (min-width: 960px) {",
        "  .feed { grid-template-columns: repeat(3, 1fr); }",
        "}",
        "```",
        "",
        "> ออกแบบบนจอเล็กให้รอดก่อน จอใหญ่คือของแถม",
      ].join("\n"),
    },
    {
      id: "seed-cafe-menu",
      title: "ร้านกาแฟกับการทำเว็บเมนูออนไลน์",
      excerpt: "ลูกค้าสแกน QR แล้วเห็นเมนูพร้อมราคา — ไม่ต้องพิมพ์เมนูกระดาษอีกต่อไป",
      cat: "business", emoji: "☕",
      createdAt: now - 13 * DAY, views: 198, likes: 29, liked: false, saved: false,
      mine: false, author: "ทีม GUPAN",
      comments: [],
      body: [
        "## ปัญหาของเมนูกระดาษ",
        "",
        "- เปลี่ยนราคา = พิมพ์ใหม่ทั้งชุด",
        "- เมนูหมดแต่ลบออกไม่ได้ ลูกค้าสั่งเก้อ",
        "- ไม่มีรูป ลูกค้าตัดสินใจยาก",
        "",
        "## เว็บเมนูแก้ได้ทุกข้อ",
        "",
        "1. แก้ราคาในไฟล์เดียว อัปเดตทันทีทุกโต๊ะ",
        "2. ติ๊กว่าเมนูไหนหมดได้แบบเรียลไทม์",
        "3. ใส่รูป + ปุ่ม **สั่งผ่านไลน์** จบในคลิกเดียว",
        "",
        "## ต้นทุน?",
        "",
        "เว็บเมนูแบบไฟล์ HTML ล้วน**โฮสต์ฟรีได้** (Render, Cloudflare Pages, GitHub Pages) จ่ายแค่ค่าโดเมนปีละไม่กี่ร้อย",
        "",
        "> ร้านเล็กก็มีเว็บระดับมืออาชีพได้ — เริ่มจากไฟล์เดียวก็พอ",
      ].join("\n"),
    },
    {
      id: "seed-localstorage",
      title: "บันทึกสั้น ๆ: แอปนี้เก็บข้อมูลไว้ที่ไหน?",
      excerpt: "เบื้องหลัง GUPAN Blog — localStorage ทำงานยังไง และปุ่มสำรองมีไว้ทำไม",
      cat: "note", emoji: "💡",
      createdAt: now - 16 * DAY, views: 154, likes: 18, liked: false, saved: false,
      mine: false, author: "ทีม GUPAN",
      comments: [],
      body: [
        "## localStorage คือลิ้นชักในเบราว์เซอร์",
        "",
        "ทุกบทความที่คุณเขียน ความคิดเห็น ยอดไลก์ — เก็บใน **localStorage** ของเบราว์เซอร์เครื่องนี้ ไม่ได้ส่งไปเซิร์ฟเวอร์ไหนเลย",
        "",
        "```js",
        "localStorage.setItem(\"gupan:blog:v1\", JSON.stringify(posts));",
        "```",
        "",
        "## ข้อดี–ข้อควรรู้",
        "",
        "- ✅ เร็ว ใช้ได้แม้เน็ตหลุด เป็นส่วนตัวสุด ๆ",
        "- ⚠️ ล้างข้อมูลเบราว์เซอร์ = หายหมด / ไม่ซิงก์ข้ามเครื่อง",
        "",
        "## นั่นคือเหตุผลของปุ่ม สำรอง/นำเข้า",
        "",
        "กด **⬇ สำรอง** ด้านล่างเพื่อดาวน์โหลด JSON เก็บไว้ ย้ายเครื่องเมื่อไหร่ก็กด **⬆ นำเข้า** กลับมาได้",
      ].join("\n"),
    },
  ];
}

/* ================= store ================= */
function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) {
      const fresh = seed();
      localStorage.setItem(LS_KEY, JSON.stringify(fresh));
      return fresh;
    }
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : seed();
  } catch {
    return seed();
  }
}
function persist() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state.posts));
  } catch {
    toast("⚠️ พื้นที่เบราว์เซอร์เต็ม บันทึกไม่ได้");
  }
}

const state = {
  posts: load(),
  q: "",
  cat: "all",
  sort: "new",
  savedOnly: false,
  editingId: null,
  emoji: EMOJIS[0],
  preview: false,
};

/* ================= helpers ================= */
const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function timeAgo(ts) {
  const d = Date.now() - ts;
  const m = Math.floor(d / 60000);
  if (m < 1) return "เมื่อสักครู่";
  if (m < 60) return m + " นาทีที่แล้ว";
  const h = Math.floor(m / 60);
  if (h < 24) return h + " ชม. ที่แล้ว";
  const day = Math.floor(h / 24);
  if (day < 30) return day + " วันที่แล้ว";
  return new Date(ts).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
}
const readMins = (body) => Math.max(1, Math.round(String(body || "").length / 600));
const uid = () => "p" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);

let toastTimer;
function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add("hidden"), 2400);
}

/* Mini-markdown: ## / ### / ```code / - list / **bold** / [link](url) / > quote / --- */
function md(src) {
  const lines = String(src || "").split("\n");
  let html = "", inCode = false, codeLang = "", inList = false, para = [];
  const flushPara = () => {
    if (!para.length) return;
    html += "<p>" + inline(para.join(" ")) + "</p>";
    para = [];
  };
  const flushList = () => {
    if (inList) { html += "</ul>"; inList = false; }
  };
  for (const raw of lines) {
    const line = raw.replace(/\r$/, "");
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      if (inCode) { html += "</code></pre>"; inCode = false; }
      else { flushPara(); flushList(); html += "<pre><code>"; inCode = true; codeLang = fence[1]; }
      continue;
    }
    if (inCode) { html += esc(line) + "\n"; continue; }
    if (/^\s*$/.test(line)) { flushPara(); flushList(); continue; }
    let m;
    if ((m = line.match(/^###\s+(.+)/))) { flushPara(); flushList(); html += "<h3>" + inline(m[1]) + "</h3>"; continue; }
    if ((m = line.match(/^##\s+(.+)/))) { flushPara(); flushList(); html += "<h2>" + inline(m[1]) + "</h2>"; continue; }
    if ((m = line.match(/^---+\s*$/))) { flushPara(); flushList(); html += "<hr>"; continue; }
    if ((m = line.match(/^>\s?(.*)/))) { flushPara(); flushList(); html += "<blockquote>" + inline(m[1]) + "</blockquote>"; continue; }
    if ((m = line.match(/^[-*]\s+(.+)/))) {
      flushPara();
      if (!inList) { html += "<ul>"; inList = true; }
      html += "<li>" + inline(m[1]) + "</li>";
      continue;
    }
    if (/^\d+\.\s+/.test(line)) { flushPara(); flushList(); html += "<p>" + inline(line) + "</p>"; continue; }
    para.push(line.trim());
  }
  flushPara(); flushList();
  if (inCode) html += "</code></pre>";
  return html || "<p>—</p>";
}
function inline(s) {
  let out = esc(s);
  out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/`(.+?)`/g, "<code>$1</code>");
  out = out.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return out;
}

/* ================= home / feed ================= */
function filtered() {
  let list = state.posts.slice();
  if (state.savedOnly) list = list.filter((p) => p.saved);
  if (state.cat !== "all") list = list.filter((p) => p.cat === state.cat);
  if (state.q.trim()) {
    const q = state.q.trim().toLowerCase();
    list = list.filter((p) =>
      (p.title + "\n" + p.excerpt + "\n" + p.body).toLowerCase().includes(q),
    );
  }
  if (state.sort === "new") list.sort((a, b) => b.createdAt - a.createdAt);
  else if (state.sort === "old") list.sort((a, b) => a.createdAt - b.createdAt);
  else list.sort((a, b) => b.views + b.likes * 8 - (a.views + a.likes * 8));
  return list;
}

function renderCats() {
  $("cats").innerHTML = CATS.map((c) => {
    const n = c.id === "all" ? state.posts.length : state.posts.filter((p) => p.cat === c.id).length;
    return `<button role="tab" aria-selected="${state.cat === c.id}" data-cat="${c.id}">${esc(c.label)} · ${n}</button>`;
  }).join("");
  $("cats").querySelectorAll("button").forEach((b) =>
    b.addEventListener("click", () => {
      state.cat = b.dataset.cat;
      renderCats();
      renderFeed();
    }),
  );
}

function renderFeed() {
  const list = filtered();
  const totalViews = state.posts.reduce((a, p) => a + (p.views || 0), 0);
  $("stats").textContent =
    `📰 ${state.posts.length} บทความ · 👁 ${totalViews.toLocaleString("th-TH")} การอ่าน` +
    (state.savedOnly ? " · แสดงเฉพาะที่บันทึกไว้" : "");
  $("feedEmpty").classList.toggle("hidden", list.length > 0);
  $("feed").innerHTML = list.map((p) => `
    <article class="card" data-cat="${esc(p.cat)}">
      <a class="card-cover" href="#/post/${p.id}" aria-label="อ่าน ${esc(p.title)}">${esc(p.emoji || "✦")}</a>
      <div class="card-body">
        <span class="card-cat">${esc(catLabel(p.cat))}</span>
        <h2><a href="#/post/${p.id}">${esc(p.title)}</a></h2>
        <p class="card-ex">${esc(p.excerpt || "")}</p>
        <div class="card-foot">
          <span>${timeAgo(p.createdAt)}</span>
          <span>· ${readMins(p.body)} นาที</span>
          <span>· 👁 ${Number(p.views || 0).toLocaleString("th-TH")}</span>
          <span class="spacer"></span>
          <button class="icon-btn" data-like="${p.id}" aria-pressed="${!!p.liked}" aria-label="ถูกใจ ${esc(p.title)}">♥ ${p.likes || 0}</button>
          <button class="icon-btn save" data-save="${p.id}" aria-pressed="${!!p.saved}" aria-label="บันทึก ${esc(p.title)}">${p.saved ? "🔖" : "📑"}</button>
        </div>
      </div>
    </article>`).join("");
  $("feed").querySelectorAll("[data-like]").forEach((b) =>
    b.addEventListener("click", () => toggleLike(b.dataset.like)),
  );
  $("feed").querySelectorAll("[data-save]").forEach((b) =>
    b.addEventListener("click", () => toggleSave(b.dataset.save)),
  );
}

function toggleLike(id) {
  const p = state.posts.find((x) => x.id === id);
  if (!p) return;
  p.liked = !p.liked;
  p.likes = Math.max(0, (p.likes || 0) + (p.liked ? 1 : -1));
  persist();
  syncReaderActions(p);
  renderFeed();
  updateSavedCount();
}
function toggleSave(id) {
  const p = state.posts.find((x) => x.id === id);
  if (!p) return;
  p.saved = !p.saved;
  persist();
  toast(p.saved ? "🔖 บันทึกแล้ว" : "📑 เอาออกจากที่บันทึกแล้ว");
  syncReaderActions(p);
  renderFeed();
  updateSavedCount();
}
function updateSavedCount() {
  $("savedCount").textContent = state.posts.filter((p) => p.saved).length;
}

/* ================= reader ================= */
let currentId = null;
function openPost(id, countView) {
  const p = state.posts.find((x) => x.id === id);
  if (!p) {
    toast("ไม่พบบทความนี้");
    location.hash = "#/";
    return;
  }
  currentId = id;
  if (countView) {
    p.views = (p.views || 0) + 1;
    persist();
  }
  const cover = $("rCover");
  cover.textContent = p.emoji || "✦";
  cover.style.setProperty("--cover", {
    code: "linear-gradient(135deg,#1c2b4a,#101a30)",
    design: "linear-gradient(135deg,#3a2340,#1d1220)",
    business: "linear-gradient(135deg,#3a3220,#201a0f)",
    note: "linear-gradient(135deg,#1f3a2e,#0f2019)",
  }[p.cat] || "#25222e");
  $("rCat").textContent = catLabel(p.cat);
  $("rTitle").textContent = p.title;
  $("rMeta").textContent =
    `✍️ ${p.author || "คุณ"} · ${timeAgo(p.createdAt)} · ${readMins(p.body)} นาที · 👁 ${Number(p.views || 0).toLocaleString("th-TH")} การอ่าน`;
  $("rBody").innerHTML = md(p.body);
  $("rEdit").href = "#/edit/" + p.id;
  $("rMine").classList.toggle("hidden", !p.mine);
  syncReaderActions(p);
  renderComments(p);
  window.scrollTo({ top: 0 });
}
function syncReaderActions(p) {
  if (!p || p.id !== currentId) return;
  const like = $("rLike");
  like.setAttribute("aria-pressed", String(!!p.liked));
  like.innerHTML = `♥ <b>${p.likes || 0}</b>`;
  const save = $("rSave");
  save.setAttribute("aria-pressed", String(!!p.saved));
  save.innerHTML = `${p.saved ? "🔖" : "📑"} <b>${p.saved ? "บันทึกแล้ว" : "บันทึก"}</b>`;
}
function renderComments(p) {
  const list = p.comments || [];
  $("cCount").textContent = list.length ? `(${list.length})` : "";
  $("cList").innerHTML = list.length
    ? list.map((c, i) => `
      <div class="comment">
        <div class="comment-head">
          <b>${esc(c.name || "ผู้อ่าน")}</b>
          <time>${timeAgo(c.at)}</time>
          <button data-cdel="${i}" aria-label="ลบคอมเมนต์">✕</button>
        </div>
        <p>${esc(c.text)}</p>
      </div>`).join("")
    : `<p class="no-comments">ยังไม่มีความคิดเห็น — เป็นคนแรกเลย!</p>`;
  $("cList").querySelectorAll("[data-cdel]").forEach((b) =>
    b.addEventListener("click", () => {
      if (!confirm("ลบคอมเมนต์นี้?")) return;
      p.comments.splice(Number(b.dataset.cdel), 1);
      persist();
      renderComments(p);
    }),
  );
}

/* ================= editor ================= */
function renderEmojiPick() {
  $("edEmoji").innerHTML = EMOJIS.map((e) =>
    `<button type="button" role="radio" aria-checked="${state.emoji === e}" data-emoji="${e}">${e}</button>`,
  ).join("");
  $("edEmoji").querySelectorAll("button").forEach((b) =>
    b.addEventListener("click", () => {
      state.emoji = b.dataset.emoji;
      renderEmojiPick();
    }),
  );
}
function openEditor(id) {
  const p = id ? state.posts.find((x) => x.id === id) : null;
  if (id && !p) {
    toast("ไม่พบบทความนี้");
    location.hash = "#/";
    return;
  }
  state.editingId = id || null;
  state.preview = false;
  $("edPreviewBtn").setAttribute("aria-pressed", "false");
  $("edPreview").classList.add("hidden");
  $("edBody").classList.remove("hidden");
  $("edHeading").textContent = p ? "✎ แก้ไขบทความ" : "✍️ เขียนบทความใหม่";
  $("edTitle").value = p ? p.title : "";
  $("edCat").value = p ? p.cat : "note";
  $("edExcerpt").value = p ? p.excerpt || "" : "";
  $("edBody").value = p ? p.body : "";
  state.emoji = p ? p.emoji || EMOJIS[0] : EMOJIS[0];
  renderEmojiPick();
  updateEdCount();
  window.scrollTo({ top: 0 });
}
function updateEdCount() {
  const n = $("edBody").value.length;
  $("edCount").textContent = `${n.toLocaleString("th-TH")} ตัวอักษร · ~${readMins($("edBody").value)} นาที`;
  if (state.preview) $("edPreview").innerHTML = md($("edBody").value);
}

/* ================= router ================= */
const views = { home: $("view-home"), reader: $("view-reader"), editor: $("view-editor") };
function show(name) {
  Object.entries(views).forEach(([k, el]) => el.classList.toggle("hidden", k !== name));
}
let lastPostKey = "";
function route() {
  const h = location.hash || "#/";
  const postM = h.match(/^#\/post\/(.+)$/);
  const editM = h.match(/^#\/edit\/(.+)$/);
  if (h === "#/new") {
    show("editor");
    openEditor(null);
  } else if (editM) {
    show("editor");
    openEditor(decodeURIComponent(editM[1]));
  } else if (postM) {
    const id = decodeURIComponent(postM[1]);
    show("reader");
    const fresh = lastPostKey !== h;
    openPost(id, fresh);
    lastPostKey = h;
  } else {
    lastPostKey = "";
    show("home");
    renderCats();
    renderFeed();
    updateSavedCount();
  }
}

/* ================= backup ================= */
function exportJSON() {
  const blob = new Blob([JSON.stringify(state.posts, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `gupan-blog-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast("⬇ สำรองบทความแล้ว");
}
function importJSON(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result));
      if (!Array.isArray(data)) throw new Error("bad shape");
      const clean = data.filter((p) => p && typeof p.title === "string" && typeof p.body === "string");
      if (!clean.length) throw new Error("empty");
      if (!confirm(`นำเข้า ${clean.length} บทความ (ของเดิมจะถูกแทนที่)? สำรองของเดิมไว้ก่อนถ้าต้องการ`)) return;
      state.posts = clean.map((p) => ({
        id: String(p.id || uid()),
        title: String(p.title).slice(0, 200),
        excerpt: String(p.excerpt || "").slice(0, 300),
        cat: ["code", "design", "business", "note"].includes(p.cat) ? p.cat : "note",
        emoji: String(p.emoji || "✦").slice(0, 4),
        body: String(p.body).slice(0, 100000),
        createdAt: Number(p.createdAt) || Date.now(),
        views: Number(p.views) || 0,
        likes: Number(p.likes) || 0,
        liked: !!p.liked, saved: !!p.saved, mine: true,
        author: "คุณ",
        comments: Array.isArray(p.comments) ? p.comments.slice(0, 200) : [],
      }));
      persist();
      state.q = ""; $("q").value = "";
      state.cat = "all"; state.savedOnly = false;
      $("btnSaved").setAttribute("aria-pressed", "false");
      location.hash = "#/";
      route();
      toast("⬆ นำเข้าบทความแล้ว");
    } catch {
      toast("⚠️ ไฟล์ไม่ถูกต้อง นำเข้าไม่ได้");
    }
  };
  reader.readAsText(file);
}

/* ================= wire up ================= */
function init() {
  $("edCat").innerHTML = CATS.filter((c) => c.id !== "all")
    .map((c) => `<option value="${c.id}">${esc(c.label)}</option>`).join("");

  $("q").addEventListener("input", (e) => { state.q = e.target.value; renderFeed(); });
  $("sort").addEventListener("change", (e) => { state.sort = e.target.value; renderFeed(); });
  $("btnSaved").addEventListener("click", () => {
    state.savedOnly = !state.savedOnly;
    $("btnSaved").setAttribute("aria-pressed", String(state.savedOnly));
    if ((location.hash || "#/") !== "#/") location.hash = "#/";
    else renderFeed();
  });

  $("rLike").addEventListener("click", () => currentId && toggleLike(currentId));
  $("rSave").addEventListener("click", () => currentId && toggleSave(currentId));
  $("rShare").addEventListener("click", async () => {
    const url = location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast("🔗 คัดลอกลิงก์แล้ว");
    } catch {
      prompt("คัดลอกลิงก์บทความ:", url);
    }
  });
  $("rDelete").addEventListener("click", () => {
    const p = state.posts.find((x) => x.id === currentId);
    if (!p) return;
    if (!confirm(`ลบบทความ “${p.title}”? ย้อนกลับไม่ได้`)) return;
    state.posts = state.posts.filter((x) => x.id !== currentId);
    persist();
    location.hash = "#/";
    toast("🗑 ลบบทความแล้ว");
  });

  $("cForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const p = state.posts.find((x) => x.id === currentId);
    if (!p) return;
    const text = $("cText").value.trim();
    if (!text) return;
    p.comments = p.comments || [];
    p.comments.unshift({ name: $("cName").value.trim() || "ผู้อ่าน", text: text.slice(0, 2000), at: Date.now() });
    persist();
    $("cText").value = "";
    renderComments(p);
    toast("💬 ส่งความคิดเห็นแล้ว");
  });

  // editor toolbar: insert snippet at cursor
  document.querySelectorAll("[data-ins]").forEach((b) =>
    b.addEventListener("click", () => {
      const ta = $("edBody");
      const ins = b.dataset.ins;
      const s = ta.selectionStart ?? ta.value.length;
      const e = ta.selectionEnd ?? ta.value.length;
      ta.value = ta.value.slice(0, s) + ins + ta.value.slice(e);
      ta.focus();
      ta.selectionStart = ta.selectionEnd = s + ins.length;
      updateEdCount();
    }),
  );
  $("edBody").addEventListener("input", updateEdCount);
  $("edPreviewBtn").addEventListener("click", () => {
    state.preview = !state.preview;
    $("edPreviewBtn").setAttribute("aria-pressed", String(state.preview));
    $("edPreview").classList.toggle("hidden", !state.preview);
    $("edBody").classList.toggle("hidden", state.preview);
    if (state.preview) $("edPreview").innerHTML = md($("edBody").value);
  });
  $("edForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const title = $("edTitle").value.trim();
    const body = $("edBody").value.trim();
    if (!title) { toast("⚠️ ใส่หัวข้อก่อนนะ"); return; }
    if (!body) { toast("⚠️ เขียนเนื้อหาสักหน่อยก่อนเผยแพร่"); return; }
    let excerpt = $("edExcerpt").value.trim();
    if (!excerpt) {
      excerpt = body.replace(/[#>*`]/g, "").replace(/\s+/g, " ").trim().slice(0, 120);
    }
    if (state.editingId) {
      const p = state.posts.find((x) => x.id === state.editingId);
      if (p) {
        Object.assign(p, {
          title: title.slice(0, 200), excerpt: excerpt.slice(0, 300),
          cat: $("edCat").value, emoji: state.emoji, body: body.slice(0, 100000),
        });
      }
      persist();
      toast("💾 บันทึกการแก้ไขแล้ว");
      location.hash = "#/post/" + state.editingId;
    } else {
      const p = {
        id: uid(), title: title.slice(0, 200), excerpt: excerpt.slice(0, 300),
        cat: $("edCat").value, emoji: state.emoji, body: body.slice(0, 100000),
        createdAt: Date.now(), views: 0, likes: 0,
        liked: false, saved: false, mine: true, author: "คุณ", comments: [],
      };
      state.posts.unshift(p);
      persist();
      toast("🎉 เผยแพร่บทความแล้ว");
      location.hash = "#/post/" + p.id;
    }
  });

  $("btnExport").addEventListener("click", exportJSON);
  $("btnImport").addEventListener("click", () => $("fileInput").click());
  $("fileInput").addEventListener("change", (e) => {
    importJSON(e.target.files && e.target.files[0]);
    e.target.value = "";
  });
  $("btnReset").addEventListener("click", () => {
    if (!confirm("ล้างบทความทั้งหมดแล้วกลับเป็นบทความตัวอย่าง?")) return;
    state.posts = seed();
    persist();
    state.q = ""; $("q").value = "";
    state.cat = "all"; state.savedOnly = false;
    $("btnSaved").setAttribute("aria-pressed", "false");
    location.hash = "#/";
    route();
    toast("↺ รีเซ็ตเป็นบทความตัวอย่างแล้ว");
  });

  window.addEventListener("hashchange", route);
  route();
}

document.addEventListener("DOMContentLoaded", init);
