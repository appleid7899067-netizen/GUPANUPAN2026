/* GUPAN Agent — static agent-mode chat UI. Puter AI when signed in, demo mode otherwise. */
"use strict";

const LS_KEY = "gupan:agent:v1";
const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const uid = () => "c" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);

const MODES = {
  agent: { name: "GUPAN Agent", sys: "You are GUPAN Agent, an autonomous AI assistant. Answer in Thai. For multi-step tasks, show a short plan first, then work through it clearly." },
  chat: { name: "ถาม–ตอบ", sys: "You are a helpful assistant. Answer in Thai, concise and friendly." },
  plan: { name: "โหมดวางแผน", sys: "You are a planning assistant. Always respond in Thai with a numbered plan first, then ask which step to start with." },
};

/* ================= preloader 1% → 99% ================= */
(function preloader() {
  const loader = document.getElementById("loader");
  const pct = document.getElementById("loaderPct");
  const bar = document.getElementById("loaderBar");
  if (!loader || !pct || !bar) return;
  let p = 1;
  let pageLoaded = document.readyState === "complete";
  let finished = false;
  const started = Date.now();
  const paint = () => {
    pct.textContent = p + "%";
    bar.style.width = p + "%";
  };
  const finish = () => {
    if (finished) return;
    finished = true;
    p = 100;
    paint();
    setTimeout(() => {
      loader.classList.add("done");
      setTimeout(() => loader.remove(), 500);
    }, 250);
  };
  window.addEventListener("load", () => { pageLoaded = true; });
  // safety: never trap the user on the loader
  setTimeout(finish, 6000);
  const tick = () => {
    if (finished) return;
    if (p < 99) {
      // fast at first, crawl near 99
      const step = p < 50 ? 1 + Math.floor(Math.random() * 3)
        : p < 80 ? 1 + Math.floor(Math.random() * 2)
        : Math.random() < 0.45 ? 1 : 0;
      p = Math.min(99, p + step);
      paint();
    } else if (pageLoaded && Date.now() - started > 1400) {
      finish();
      return;
    }
    setTimeout(tick, 40);
  };
  paint();
  tick();
})();

/* ================= store ================= */
function loadStore() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (Array.isArray(d.chats)) return { chats: d.chats, mode: d.mode || "agent", model: d.model || "" };
    }
  } catch { /* fresh start */ }
  return { chats: [], mode: "agent", model: "" };
}
function persist() {
  try { localStorage.setItem(LS_KEY, JSON.stringify({ chats: store.chats.slice(0, 50), mode: store.mode, model: store.model })); }
  catch { /* quota — keep going in memory */ }
}
const store = loadStore();
let currentId = null;
let files = [];
let busy = false;
let stopFlag = false;

/* ================= puter (optional real AI) ================= */
const puterReady = () => !!(window.puter && window.puter.auth && window.puter.ai);
const puterSignedIn = () => { try { return !!window.puter.auth.isSignedIn(); } catch { return false; } };

function refreshLogin() {
  const chip = $("loginChip");
  const aiState = $("aiState");
  if (puterReady() && puterSignedIn()) {
    let name = "Puter";
    try { name = window.puter.auth.user?.username || window.puter.auth.user?.uuid || "Puter"; } catch {}
    chip.textContent = "● " + name;
    chip.classList.add("in");
    chip.title = "แตะเพื่อออกจากระบบ";
    aiState.textContent = "AI จริงพร้อมใช้ (Puter)";
  } else {
    chip.textContent = "เข้าสู่ระบบ Puter";
    chip.classList.remove("in");
    chip.title = "";
    aiState.textContent = "โหมดเดโม — เข้าสู่ระบบ Puter เพื่อใช้ AI จริง";
  }
}

/* ================= markdown-lite ================= */
function md(src) {
  const lines = String(src || "").split("\n");
  let html = "", inCode = false, inList = false;
  const closeList = () => { if (inList) { html += "</ul>"; inList = false; } };
  let para = [];
  const flush = () => { if (para.length) { html += "<p>" + inline(para.join(" ")) + "</p>"; para = []; } };
  for (const raw of lines) {
    const line = raw.replace(/\r$/, "");
    if (/^```/.test(line)) {
      if (inCode) { html += "</code></pre>"; inCode = false; }
      else { flush(); closeList(); html += "<pre><code>"; inCode = true; }
      continue;
    }
    if (inCode) { html += esc(line) + "\n"; continue; }
    if (/^\s*$/.test(line)) { flush(); closeList(); continue; }
    let m;
    if ((m = line.match(/^#{1,3}\s+(.+)/))) { flush(); closeList(); html += "<h3>" + inline(m[1]) + "</h3>"; continue; }
    if ((m = line.match(/^[-*]\s+(.+)/))) {
      flush();
      if (!inList) { html += "<ul>"; inList = true; }
      html += "<li>" + inline(m[1]) + "</li>";
      continue;
    }
    para.push(line.trim());
  }
  flush(); closeList();
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

/* ================= chat ================= */
const current = () => store.chats.find((c) => c.id === currentId) || null;

function newChat() {
  currentId = null;
  files = [];
  renderFiles();
  $("input").value = "";
  autosize();
  showHero();
  renderDrawer("");
}

function showHero() {
  $("hero").classList.remove("hidden");
  $("thread").classList.add("hidden");
  $("thread").innerHTML = "";
}
function showThread() {
  $("hero").classList.add("hidden");
  $("thread").classList.remove("hidden");
}

function renderThread() {
  const c = current();
  const box = $("thread");
  if (!c) { showHero(); return; }
  showThread();
  box.innerHTML = c.msgs.map((m) => m.role === "user"
    ? `<div class="msg user"><div class="bubble">${esc(m.content)}</div><span class="meta">${timeAgo(m.at)}</span></div>`
    : `<div class="msg agent"><span class="who">✳ ${esc(MODES[store.mode].name).toUpperCase()}</span><div class="bubble">${md(m.content)}</div><span class="meta">${timeAgo(m.at)}</span></div>`
  ).join("");
  $("stage").scrollTop = $("stage").scrollHeight;
}

function timeAgo(ts) {
  const d = Date.now() - ts, m = Math.floor(d / 60000);
  if (m < 1) return "เมื่อสักครู่";
  if (m < 60) return m + " นาทีที่แล้ว";
  const h = Math.floor(m / 60);
  if (h < 24) return h + " ชม. ที่แล้ว";
  return new Date(ts).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

function setBusy(v) {
  busy = v;
  $("sendBtn").classList.toggle("hidden", v);
  $("stopBtn").classList.toggle("hidden", !v);
  $("sendBtn").disabled = v;
}

let toastTimer;
function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add("hidden"), 2400);
}

function autosize() {
  const ta = $("input");
  ta.style.height = "auto";
  ta.style.height = Math.min(ta.scrollHeight, 180) + "px";
}

/* ---------- demo agent reply (no login needed) ---------- */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function demoReply(task) {
  const steps = [
    "🔍 วิเคราะห์คำสั่งและแยกงานย่อย",
    "📚 รวบรวมข้อมูลที่เกี่ยวข้อง",
    "🛠️ ลงมือทำตามแผนทีละขั้น",
    "✅ ตรวจทานและสรุปผล",
  ];
  const short = task.length > 90 ? task.slice(0, 90) + "…" : task;
  let out = `### ✳ รับงานแล้ว: “${short}”\n\n`;
  for (const s of steps) {
    if (stopFlag) return out + "\n\n_หยุดการทำงานตามคำสั่ง_";
    await sleep(650);
    out += `- ✅ ${s.replace(/^[^\s]+\s/, "")} — เสร็จ\n`;
    paintStreaming(out);
  }
  await sleep(400);
  out += `\n### สรุป\n\nนี่คือ**โหมดเดโม** — ผมจำลองขั้นตอนเอเจนต์ให้ดูว่าโฟลว์จะเป็นแบบนี้: รับงาน → วางแผน → ทำทีละขั้น → สรุป\n\n> กด **เข้าสู่ระบบ Puter** มุมขวาบน แล้วสั่งงานเดิมอีกครั้ง ผมจะตอบด้วย AI จริงทันที 🚀`;
  return out;
}

let streamEl = null;
function paintStreaming(text) {
  if (!streamEl) return;
  streamEl.innerHTML = md(text);
  $("stage").scrollTop = $("stage").scrollHeight;
}

/* ---------- real AI via Puter ---------- */
async function puterReply(chat) {
  const msgs = [
    { role: "system", content: MODES[store.mode].sys },
    ...chat.msgs.slice(-10).map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.content })),
  ];
  const opts = { stream: true };
  if (store.model) opts.model = store.model;
  const stream = await window.puter.ai.chat(msgs, opts);
  let text = "";
  if (stream && typeof stream[Symbol.asyncIterator] === "function") {
    for await (const part of stream) {
      if (stopFlag) break;
      if (typeof part === "string") text += part;
      else if (part && typeof part.text === "string") text += part.text;
      if (text.length % 40 < 12) paintStreaming(text);
    }
  } else if (typeof stream === "string") {
    text = stream;
  } else if (stream && stream.message && Array.isArray(stream.message.content)) {
    text = stream.message.content.map((b) => b.text || "").join("");
  }
  return text.trim() || "_(AI ไม่ส่งคำตอบกลับมา ลองใหม่อีกครั้ง)_";
}

/* ---------- send ---------- */
async function send(prefill) {
  const ta = $("input");
  const text = (typeof prefill === "string" ? prefill : ta.value).trim();
  if (!text || busy) return;
  let chat = current();
  if (!chat) {
    chat = { id: uid(), title: text.slice(0, 60), msgs: [], updated: Date.now() };
    store.chats.unshift(chat);
    currentId = chat.id;
  }
  const fileNote = files.length ? `\n\n📎 ไฟล์แนบ: ${files.join(", ")}` : "";
  chat.msgs.push({ role: "user", content: text + fileNote, at: Date.now() });
  chat.updated = Date.now();
  ta.value = "";
  files = [];
  renderFiles();
  autosize();
  persist();
  renderThread();

  // typing indicator
  stopFlag = false;
  setBusy(true);
  const box = $("thread");
  const wrap = document.createElement("div");
  wrap.className = "msg agent";
  wrap.innerHTML = `<span class="who">✳ ${esc(MODES[store.mode].name).toUpperCase()}</span><div class="typing"><i></i><i></i><i></i></div>`;
  box.appendChild(wrap);
  $("stage").scrollTop = $("stage").scrollHeight;

  try {
    await sleep(500);
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    wrap.querySelector(".typing").replaceWith(bubble);
    streamEl = bubble;
    let reply;
    if (puterReady() && puterSignedIn()) {
      try {
        reply = await puterReply(chat);
      } catch (e) {
        const msg = e && e.message ? e.message : String(e);
        reply = `⚠️ เรียก AI ไม่สำเร็จ (${esc(msg)})\n\nขอตอบด้วยโหมดเดโมแทนนะ:\n\n` + await demoReply(text);
      }
    } else {
      reply = await demoReply(text);
    }
    streamEl = null;
    chat.msgs.push({ role: "assistant", content: reply, at: Date.now() });
    chat.updated = Date.now();
    persist();
    renderThread();
    renderDrawer($("drawerQ").value);
  } finally {
    streamEl = null;
    setBusy(false);
  }
}

/* ================= files ================= */
function renderFiles() {
  const box = $("fileChips");
  box.classList.toggle("hidden", !files.length);
  box.innerHTML = files.map((f, i) => `<span><b title="${esc(f)}">${esc(f)}</b><button data-i="${i}" aria-label="ลบไฟล์ ${esc(f)}">✕</button></span>`).join("");
  box.querySelectorAll("button").forEach((b) =>
    b.addEventListener("click", () => { files.splice(Number(b.dataset.i), 1); renderFiles(); }),
  );
}

/* ================= drawer ================= */
function renderDrawer(q) {
  const query = (q || "").trim().toLowerCase();
  const list = store.chats.filter((c) =>
    !query || c.title.toLowerCase().includes(query) ||
    c.msgs.some((m) => m.content.toLowerCase().includes(query)),
  );
  $("drawerList").innerHTML = list.length
    ? list.map((c) => `
      <div class="chat-item ${c.id === currentId ? "active" : ""}" data-id="${c.id}" role="button" tabindex="0">
        <span>${esc(c.title)}</span>
        <small>${timeAgo(c.updated)}</small>
        <em data-del="${c.id}" title="ลบแชท" role="button" tabindex="0" aria-label="ลบแชท ${esc(c.title)}">🗑</em>
      </div>`).join("")
    : `<p class="drawer-empty">ยังไม่มีแชทที่ค้นหา</p>`;
  $("drawerList").querySelectorAll(".chat-item").forEach((el) => {
    el.addEventListener("click", (e) => {
      const del = e.target.closest("[data-del]");
      if (del) {
        e.stopPropagation();
        store.chats = store.chats.filter((c) => c.id !== del.dataset.del);
        if (currentId === del.dataset.del) { currentId = null; showHero(); }
        persist();
        renderDrawer($("drawerQ").value);
        return;
      }
      currentId = el.dataset.id;
      closeDrawer();
      renderThread();
    });
  });
}
function openDrawer() {
  $("drawer").classList.remove("hidden");
  $("scrim").classList.remove("hidden");
  renderDrawer($("drawerQ").value);
}
function closeDrawer() {
  $("drawer").classList.add("hidden");
  $("scrim").classList.add("hidden");
}

/* ================= wire up ================= */
function init() {
  // restore mode + model UI
  $("modeName").textContent = MODES[store.mode] ? (store.mode === "agent" ? "GUPAN Agent" : MODES[store.mode].name) : "GUPAN Agent";
  document.querySelectorAll("#modeMenu button").forEach((b) =>
    b.setAttribute("aria-checked", String(b.dataset.mode === store.mode)),
  );
  document.querySelectorAll("#modelMenu button").forEach((b) =>
    b.setAttribute("aria-checked", String(b.dataset.model === store.model)),
  );

  $("input").addEventListener("input", autosize);
  $("input").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  });
  $("sendBtn").addEventListener("click", () => send());
  $("stopBtn").addEventListener("click", () => { stopFlag = true; });

  document.querySelectorAll("#suggest button").forEach((b) =>
    b.addEventListener("click", () => send(b.dataset.prompt)),
  );

  // mode menu
  const modeMenu = $("modeMenu");
  $("modeBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    modeMenu.classList.toggle("hidden");
    $("modeBtn").setAttribute("aria-expanded", String(!modeMenu.classList.contains("hidden")));
  });
  modeMenu.querySelectorAll("button").forEach((b) =>
    b.addEventListener("click", () => {
      store.mode = b.dataset.mode;
      persist();
      $("modeName").textContent = store.mode === "agent" ? "GUPAN Agent" : MODES[store.mode].name;
      modeMenu.querySelectorAll("button").forEach((x) =>
        x.setAttribute("aria-checked", String(x === b)),
      );
      modeMenu.classList.add("hidden");
      toast("สลับเป็นโหมด " + MODES[store.mode].name);
    }),
  );

  // model menu
  const modelMenu = $("modelMenu");
  $("modelBtn").addEventListener("click", (e) => { e.stopPropagation(); modelMenu.classList.toggle("hidden"); });
  modelMenu.querySelectorAll("button").forEach((b) =>
    b.addEventListener("click", () => {
      store.model = b.dataset.model;
      persist();
      modelMenu.querySelectorAll("button").forEach((x) =>
        x.setAttribute("aria-checked", String(x === b)),
      );
      modelMenu.classList.add("hidden");
      toast(b.dataset.model ? "ใช้โมเดล " + b.dataset.model : "ใช้โมเดลอัตโนมัติ");
    }),
  );
  document.addEventListener("click", () => { modeMenu.classList.add("hidden"); modelMenu.classList.add("hidden"); });

  // files
  $("addFiles").addEventListener("click", () => $("fileInput").click());
  $("fileInput").addEventListener("change", (e) => {
    for (const f of e.target.files || []) {
      if (files.length >= 5) { toast("แนบได้สูงสุด 5 ไฟล์"); break; }
      files.push(f.name);
    }
    e.target.value = "";
    renderFiles();
  });

  // rail + drawer
  $("railNew").addEventListener("click", newChat);
  $("drawerNew").addEventListener("click", () => { closeDrawer(); newChat(); });
  $("railHistory").addEventListener("click", openDrawer);
  $("folderBtn").addEventListener("click", openDrawer);
  $("railSearch").addEventListener("click", () => { openDrawer(); $("drawerQ").focus(); });
  $("drawerClose").addEventListener("click", closeDrawer);
  $("scrim").addEventListener("click", closeDrawer);
  $("drawerQ").addEventListener("input", (e) => renderDrawer(e.target.value));

  // help
  $("railHelp").addEventListener("click", () => $("helpModal").classList.remove("hidden"));
  $("helpClose").addEventListener("click", () => $("helpModal").classList.add("hidden"));
  $("helpModal").addEventListener("click", (e) => {
    if (e.target === $("helpModal")) $("helpModal").classList.add("hidden");
  });

  // puter login (must stay in click gesture for popup)
  $("loginChip").addEventListener("click", () => {
    if (!puterReady()) { toast("⏳ Puter กำลังโหลด กดอีกครั้งในไม่กี่วินาที"); return; }
    if (puterSignedIn()) {
      try { window.puter.auth.signOut(); } catch {}
      refreshLogin();
      toast("ออกจากระบบแล้ว (กลับสู่โหมดเดโม)");
      return;
    }
    window.puter.auth.signIn().then(
      () => { refreshLogin(); toast("🎉 เข้าสู่ระบบแล้ว — ใช้ AI จริงได้เลย"); },
      () => toast("ยังไม่ได้เข้าสู่ระบบ — อนุญาต popup แล้วลองใหม่"),
    );
  });

  // watch puter script load + session
  let ticks = 0;
  const id = setInterval(() => {
    refreshLogin();
    if (++ticks > 40) clearInterval(id);
  }, 1000);

  window.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeDrawer(); $("helpModal").classList.add("hidden"); } });

  newChat();
  refreshLogin();
  autosize();
}

document.addEventListener("DOMContentLoaded", init);
