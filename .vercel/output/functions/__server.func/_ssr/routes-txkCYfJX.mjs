import { i as __toESM } from "../_runtime.mjs";
import { n as formatRelativeTime, r as uid, t as cn } from "./utils-wU4Hs1yY.mjs";
import { a as Overlay2, c as Title2, i as Description2, n as Cancel, o as Portal2, r as Content2, s as Root2, t as Action, x as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { n as ForgeMark, t as Button } from "./button-RQCafFQ_.mjs";
import { _ as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Square, c as MousePointer2, d as Menu, f as History, g as ArrowUp, h as CodeXml, i as Sun, l as Moon, m as Download, n as Trash2, o as Smartphone, p as ExternalLink, r as Tablet, s as Plus, u as Monitor } from "../_libs/lucide-react.mjs";
import { n as useBuilder, r as Tooltip } from "./router-DoBO8eUV.mjs";
import { n as pickStarters } from "./starters-C_JKZ5Yy.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-txkCYfJX.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var Textarea = (0, import_react.forwardRef)(function Textarea({ className, ...props }, ref) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
		ref,
		className: cn("flex min-h-24 w-full resize-none bg-transparent text-base text-fg", "placeholder:text-subtle focus-visible:outline-none disabled:opacity-50", className),
		...props
	});
});
async function streamGenerate(payload, onDelta, signal) {
	const res = await fetch("/api/generate", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
		signal
	});
	if (!res.ok) {
		let message = `Could not reach the model (${res.status})`;
		try {
			const body = await res.json();
			if (body.error) message = body.error;
		} catch {}
		throw new Error(message);
	}
	if (!res.body) throw new Error("Empty response from the model");
	const reader = res.body.getReader();
	const decoder = new TextDecoder();
	let full = "";
	let buffer = "";
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });
		const chunks = buffer.split("\n\n");
		buffer = chunks.pop() ?? "";
		for (const chunk of chunks) for (const line of chunk.split("\n")) {
			if (!line.startsWith("data: ")) continue;
			const data = line.slice(6).trim();
			if (!data || data === "[DONE]") continue;
			try {
				const json = JSON.parse(data);
				if (json.error?.message) throw new Error(json.error.message);
				const delta = json.choices?.[0]?.delta?.content ?? "";
				if (delta) {
					full += delta;
					onDelta(full);
				}
			} catch (err) {
				if (err instanceof SyntaxError) continue;
				throw err;
			}
		}
	}
	return full;
}
var HTML_FENCE = /```(?:html|htm|xml)?\s*\n([\s\S]*?)```/gi;
var SUGGEST_FENCE = /```suggestions\s*\n([\s\S]*?)```/i;
function looksLikeHtml(s) {
	const t = s.trim();
	return t.startsWith("<!DOCTYPE") || t.startsWith("<!doctype") || t.startsWith("<html") || t.includes("<html");
}
function extractHtml(raw) {
	const fences = [];
	let m;
	const re = new RegExp(HTML_FENCE.source, "gi");
	while (m = re.exec(raw)) {
		const body = (m[1] ?? "").trim();
		if (body) fences.push(body);
	}
	for (let i = fences.length - 1; i >= 0; i--) {
		const f = fences[i];
		if (looksLikeHtml(f) || f.includes("<body") || f.includes("<div")) return f;
	}
	const trimmed = raw.trim();
	if (looksLikeHtml(trimmed)) return trimmed;
	return null;
}
function extractSuggestions(raw) {
	const m = raw.match(SUGGEST_FENCE);
	if (!m?.[1]) return [];
	try {
		const parsed = JSON.parse(m[1]);
		if (!Array.isArray(parsed)) return [];
		return parsed.map((item) => {
			if (!item || typeof item !== "object") return null;
			const rec = item;
			const label = typeof rec.label === "string" ? rec.label.trim() : "";
			const prompt = typeof rec.prompt === "string" ? rec.prompt.trim() : "";
			if (!label || !prompt) return null;
			return {
				label: label.slice(0, 40),
				prompt
			};
		}).filter((x) => x !== null).slice(0, 6);
	} catch {
		return [];
	}
}
function extractDisplayText(raw) {
	let text = raw.replace(SUGGEST_FENCE, "").replace(/```(?:html|htm|xml)?\s*\n[\s\S]*?```/gi, "").trim();
	text = text.replace(/```[\s\S]*?```/g, "").trim();
	return text;
}
function extractTitle(html, fallback) {
	const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
	if (title) return title.slice(0, 80);
	const h1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1]?.trim();
	if (h1) return h1.slice(0, 80);
	return fallback;
}
async function sendPrompt(text) {
	const trimmed = text.trim();
	if (!trimmed) return;
	const store = useBuilder.getState();
	if (store.generating) return;
	let id = store.activeId;
	let html = "";
	let history = [];
	if (!id) id = store.createAndActivate({ title: trimmed.slice(0, 48) });
	else {
		const project = store.projects.find((p) => p.id === id);
		html = project?.html ?? "";
		history = (project?.messages ?? []).map((m) => ({
			role: m.role,
			content: m.content
		}));
	}
	store.pushMessage(id, {
		id: uid(),
		role: "user",
		content: trimmed,
		createdAt: Date.now()
	});
	store.setDraft("");
	store.setGenerating(true);
	store.setStreamText("");
	store.setSuggestions(id, []);
	store.setMobilePane("chat");
	store.setSelectMode(false);
	try {
		const full = await streamGenerate({
			prompt: trimmed,
			html,
			history
		}, (t) => useBuilder.getState().setStreamText(t));
		const nextHtml = extractHtml(full);
		const display = extractDisplayText(full);
		const suggestions = extractSuggestions(full);
		store.pushMessage(id, {
			id: uid(),
			role: "assistant",
			content: display || (nextHtml ? "Ready. Take a look at the preview." : "I need a bit more detail before building."),
			createdAt: Date.now()
		});
		if (nextHtml) {
			store.setHtml(id, nextHtml, trimmed.slice(0, 42));
			const project = useBuilder.getState().projects.find((p) => p.id === id);
			if (project && (project.title === "Untitled" || project.messages.filter((m) => m.role === "user").length <= 1)) store.renameProject(id, extractTitle(nextHtml, project.title));
			store.setMobilePane("preview");
		}
		store.setSuggestions(id, suggestions);
	} catch (err) {
		const message = err instanceof Error ? err.message : "Something went wrong.";
		store.pushMessage(id, {
			id: uid(),
			role: "assistant",
			content: message,
			createdAt: Date.now()
		});
	} finally {
		store.setGenerating(false);
		store.setStreamText("");
	}
}
function openExample(example) {
	const store = useBuilder.getState();
	store.createAndActivate({
		title: example.name,
		html: example.html,
		messages: [{
			id: uid(),
			role: "user",
			content: `Start from the ${example.name} example.`,
			createdAt: Date.now()
		}, {
			id: uid(),
			role: "assistant",
			content: `${example.name} is ready in the preview. Tell me what to change, or pick a suggestion below.`,
			createdAt: Date.now()
		}],
		suggestions: [
			{
				label: "Restyle it",
				prompt: `Give ${example.name} a bolder visual identity while keeping the same features.`
			},
			{
				label: "Add dark mode",
				prompt: "Add a dark mode toggle and remember the preference."
			},
			{
				label: "Add a page",
				prompt: "Add another section or screen that this product would naturally have."
			},
			{
				label: example.prompt.split(":")[0] ?? "Remix",
				prompt: example.prompt
			}
		],
		versions: [{
			id: uid(),
			html: example.html,
			label: "Example",
			createdAt: Date.now()
		}]
	});
	store.setEditorTab("preview");
	store.setMobilePane("preview");
}
function PromptBox({ large, placeholder = "What should we build today?" }) {
	const draft = useBuilder((s) => s.draft);
	const generating = useBuilder((s) => s.generating);
	const setDraft = useBuilder((s) => s.setDraft);
	const ref = (0, import_react.useRef)(null);
	function autosize() {
		const el = ref.current;
		if (!el) return;
		el.style.height = "auto";
		el.style.height = `${Math.min(el.scrollHeight, large ? 220 : 160)}px`;
	}
	function onKeyDown(e) {
		if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
			e.preventDefault();
			sendPrompt(draft);
		}
	}
	const canSend = draft.trim().length > 0 && !generating;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("relative bg-surface shadow-border transition-[box-shadow] duration-[var(--motion-quick)]", "focus-within:shadow-border-hover", large ? "rounded-[20px] p-3" : "rounded-[16px] p-2.5"),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
			ref,
			value: draft,
			onChange: (e) => {
				setDraft(e.target.value);
				autosize();
			},
			onKeyDown,
			placeholder,
			"aria-label": "Describe what to build",
			rows: large ? 3 : 2,
			className: cn("px-2 py-1 leading-relaxed", large ? "min-h-20 text-base" : "min-h-14 text-sm")
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex items-center justify-end pt-1",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				size: "icon-sm",
				disabled: !canSend && !generating,
				"aria-label": generating ? "Building" : "Send",
				onClick: () => void sendPrompt(draft),
				className: "rounded-full",
				children: generating ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Square, { className: "size-3 fill-current" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUp, { className: "size-4" })
			})
		})]
	});
}
var STEPS = [
	"Reading the request",
	"Designing the layout",
	"Writing the page",
	"Adding interactions"
];
function ChatPanel() {
	const project = useBuilder((s) => s.projects.find((p) => p.id === s.activeId) ?? null);
	const generating = useBuilder((s) => s.generating);
	const streamText = useBuilder((s) => s.streamText);
	const bottom = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		bottom.current?.scrollIntoView({ behavior: "smooth" });
	}, [
		project?.messages.length,
		streamText,
		generating
	]);
	if (!project) return null;
	const live = generating ? extractDisplayText(streamText) : "";
	const stepIndex = streamText.includes("```") ? 3 : streamText.length > 80 ? 2 : streamText.length > 0 ? 1 : 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "flex h-full min-h-0 w-full flex-col md:max-w-[26rem] md:shrink-0 lg:max-w-[28rem]",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-h-0 flex-1 overflow-y-auto px-4 py-3 scrollbar-none",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ol", {
					className: "space-y-4",
					children: [project.messages.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageBubble, { message: m }, m.id)), generating ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "space-y-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "space-y-1.5 text-sm",
							children: STEPS.map((label, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: cn("flex items-center gap-2", i < stepIndex ? "text-success" : i === stepIndex ? "text-fg" : "text-subtle"),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn("size-1.5 rounded-full", i < stepIndex ? "bg-success" : i === stepIndex ? "bg-accent" : "bg-border-strong") }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: i === stepIndex ? "shimmer" : void 0,
									children: label
								})]
							}, label))
						}), live ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm leading-relaxed text-muted",
							children: live
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "shimmer text-sm",
							children: "Working on it…"
						})]
					}) : null]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { ref: bottom })]
			}),
			!generating && project.suggestions.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "chip-fade flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-none",
				children: project.suggestions.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => void sendPrompt(s.prompt),
					className: "shrink-0 rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-fg shadow-border hover:shadow-border-hover",
					children: s.label
				}, s.label))
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "px-4 pb-4 pt-1",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PromptBox, { placeholder: "Ask for a change…" })
			})
		]
	});
}
function MessageBubble({ message }) {
	if (message.role === "user") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
		className: "flex justify-end",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "max-w-[90%] rounded-2xl rounded-br-sm bg-accent px-3.5 py-2 text-sm leading-relaxed text-accent-fg",
			children: message.content
		})
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-sm leading-relaxed text-fg",
		children: message.content
	}) });
}
function wrap(title, body, extraHead = "") {
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
${extraHead}
<script src="https://cdn.tailwindcss.com"><\/script>
<script type="module">
  import { createIcons, icons } from "https://cdn.jsdelivr.net/npm/lucide@latest/+esm";
  window.addEventListener("DOMContentLoaded", () => createIcons({ icons }));
<\/script>
</head>
<body class="min-h-screen antialiased">${body}</body>
</html>`;
}
var northstar = wrap("Northstar — Portfolio", `
<nav class="flex items-center justify-between px-6 py-5 max-w-5xl mx-auto">
  <strong class="tracking-tight">NORTHSTAR</strong>
  <div class="flex gap-5 text-sm text-stone-500">
    <a href="#work">Work</a><a href="#about">About</a><a href="#contact">Contact</a>
  </div>
</nav>
<header class="max-w-5xl mx-auto px-6 pt-16 pb-20">
  <p class="text-sm uppercase tracking-[0.2em] text-stone-500 mb-4">Photographer & director</p>
  <h1 class="text-5xl md:text-7xl font-light leading-[0.95] max-w-3xl">Quiet pictures of loud places.</h1>
</header>
<section id="work" class="grid md:grid-cols-2 gap-3 max-w-5xl mx-auto px-6 pb-20">
  ${[
	"Harbor dawn",
	"Glass atrium",
	"Cedar trail",
	"Night market",
	"Studio still",
	"River fog"
].map((n, i) => `
    <article class="relative overflow-hidden group min-h-64" style="background:hsl(${28 + i * 18} 22% ${72 - i * 6}%)">
      <div class="absolute inset-0 bg-stone-900/0 group-hover:bg-stone-900/25 transition"></div>
      <p class="absolute bottom-4 left-4 text-white text-sm tracking-wide">${n}</p>
    </article>`).join("")}
</section>
<section id="about" class="max-w-5xl mx-auto px-6 pb-20 grid md:grid-cols-2 gap-10">
  <h2 class="text-3xl font-light">About</h2>
  <p class="text-stone-600 leading-relaxed">Based in Portland. Ten years of editorial work for magazines, hotels, and independent labels. Available for commissions worldwide.</p>
</section>
<footer id="contact" class="border-t border-stone-200 px-6 py-10 text-sm text-stone-500 max-w-5xl mx-auto flex justify-between">
  <span>hello@northstar.studio</span><span>© 2026</span>
</footer>`, `<style>body{background:#f6f1ea;color:#1c1916;font-family:ui-sans-serif,system-ui}</style>`);
var pulse = wrap("Pulse — Focus timer", `
<div class="min-h-screen flex flex-col items-center justify-center px-6" style="background:#111418;color:#e8e6e1">
  <p class="text-xs tracking-[0.3em] uppercase text-stone-400 mb-8">Pulse</p>
  <div id="ring" class="size-64 rounded-full border border-white/10 flex items-center justify-center mb-10">
    <div class="text-center">
      <div id="time" class="text-6xl font-light tabular-nums">25:00</div>
      <div id="mode" class="text-xs uppercase tracking-widest text-stone-400 mt-2">Focus</div>
    </div>
  </div>
  <div class="flex gap-3">
    <button id="start" class="px-6 h-11 rounded-full bg-white text-stone-900 text-sm font-medium">Start</button>
    <button id="reset" class="px-6 h-11 rounded-full border border-white/15 text-sm">Reset</button>
  </div>
  <p class="mt-8 text-stone-500 text-sm">Sessions completed: <span id="count">0</span></p>
</div>
<script>
let remaining=25*60, timer=null, sessions=Number(localStorage.getItem("pulse")||0);
const $ = id => document.getElementById(id);
$("count").textContent = sessions;
function render(){const m=String(Math.floor(remaining/60)).padStart(2,"0");const s=String(remaining%60).padStart(2,"0");$("time").textContent=m+":"+s;}
$("start").onclick=()=>{if(timer){clearInterval(timer);timer=null;$("start").textContent="Start";return;}
$("start").textContent="Pause";timer=setInterval(()=>{remaining--;if(remaining<=0){clearInterval(timer);timer=null;sessions++;localStorage.setItem("pulse",sessions);$("count").textContent=sessions;remaining=25*60;$("start").textContent="Start";}render();},1000);};
$("reset").onclick=()=>{clearInterval(timer);timer=null;remaining=25*60;$("start").textContent="Start";render();};
render();
<\/script>`);
var ledger = wrap("Ledger — Expenses", `
<div class="max-w-lg mx-auto px-5 py-10" style="font-family:ui-sans-serif,system-ui;background:#f4f1eb;min-height:100vh;color:#1b1916">
  <header class="flex items-end justify-between mb-8">
    <div><p class="text-xs uppercase tracking-widest text-stone-500">This month</p>
    <h1 id="total" class="text-4xl font-semibold tabular-nums">$0</h1></div>
    <span class="text-sm text-stone-500">Ledger</span>
  </header>
  <form id="form" class="flex gap-2 mb-6">
    <input name="note" placeholder="Coffee" required class="flex-1 h-11 px-3 rounded-lg bg-white border border-stone-200" />
    <input name="amount" type="number" step="0.01" placeholder="4.50" required class="w-24 h-11 px-3 rounded-lg bg-white border border-stone-200" />
    <button class="h-11 px-4 rounded-lg bg-stone-900 text-white text-sm">Add</button>
  </form>
  <ul id="list" class="space-y-2"></ul>
</div>
<script>
const KEY="ledger-items";
let items=JSON.parse(localStorage.getItem(KEY)||"[]");
const list=document.getElementById("list");
function save(){localStorage.setItem(KEY,JSON.stringify(items));draw();}
function draw(){
  const t=items.reduce((s,i)=>s+i.amount,0);
  document.getElementById("total").textContent="$"+t.toFixed(2);
  list.innerHTML=items.map((i,idx)=>\`<li class="flex justify-between items-center bg-white rounded-lg px-4 h-12 text-sm"><span>\${i.note}</span><span class="flex items-center gap-3 tabular-nums">$\${i.amount.toFixed(2)}<button data-i="\${idx}" class="text-stone-400">×</button></span></li>\`).join("");
  list.querySelectorAll("button").forEach(b=>b.onclick=()=>{items.splice(+b.dataset.i,1);save();});
}
document.getElementById("form").onsubmit=e=>{e.preventDefault();const fd=new FormData(e.target);
items.unshift({note:fd.get("note"),amount:Number(fd.get("amount"))});e.target.reset();save();};
draw();
<\/script>`);
var harvest = wrap("Harvest — Recipes", `
<div style="font-family:ui-sans-serif,system-ui;background:#f7f3ee;color:#241c14;min-height:100vh">
  <header class="max-w-5xl mx-auto px-6 py-10 flex items-end justify-between">
    <div><p class="text-xs uppercase tracking-[0.25em] text-amber-800/70">Kitchen notes</p>
    <h1 class="text-4xl font-semibold">Harvest</h1></div>
    <input id="q" placeholder="Search recipes" class="h-10 px-3 rounded-full bg-white border border-stone-200 w-48 text-sm" />
  </header>
  <main id="grid" class="max-w-5xl mx-auto px-6 pb-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-4"></main>
</div>
<script>
const recipes=[
  {t:"Tomato tart",c:"Dinner",m:"Flaky pastry, slow tomatoes, thyme."},
  {t:"Lemon cake",c:"Dessert",m:"Olive oil crumb, thin glaze."},
  {t:"Herb oil",c:"Pantry",m:"Parsley, garlic, good olive oil."},
  {t:"Bean stew",c:"Dinner",m:"White beans, rosemary, toasted bread."},
  {t:"Berry fool",c:"Dessert",m:"Yogurt, crushed berries, honey."},
  {t:"Seed loaf",c:"Pantry",m:"Overnight rise, sesame crust."}
];
const hues=[28,18,42,32,12,22];
function draw(q=""){
  const f=recipes.filter(r=>r.t.toLowerCase().includes(q.toLowerCase()));
  grid.innerHTML=f.map((r,i)=>\`<article class="rounded-2xl overflow-hidden bg-white">
    <div class="h-36" style="background:hsl(\${hues[i%hues.length]} 40% 72%)"></div>
    <div class="p-4"><p class="text-xs uppercase tracking-widest text-stone-400">\${r.c}</p>
    <h2 class="text-lg font-medium mt-1">\${r.t}</h2><p class="text-sm text-stone-500 mt-1">\${r.m}</p></div></article>\`).join("");
}
draw();
q.oninput=()=>draw(q.value);
<\/script>`);
var matchlight = wrap("Matchlight — Memory", `
<div class="min-h-screen flex flex-col items-center justify-center px-4" style="background:#16141a;color:#f3efe8;font-family:ui-sans-serif,system-ui">
  <h1 class="text-2xl font-medium mb-1">Matchlight</h1>
  <p class="text-stone-400 text-sm mb-6">Moves <span id="moves">0</span> · Time <span id="time">0</span>s</p>
  <div id="board" class="grid grid-cols-4 gap-2 w-full max-w-sm mb-6"></div>
  <button id="new" class="h-10 px-5 rounded-full bg-white text-stone-900 text-sm">New game</button>
</div>
<script>
const ICONS=["sun","moon","star","heart","leaf","cloud","anchor","compass"];
let first=null,lock=false,moves=0,t=0,tick;
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function start(){
  clearInterval(tick);moves=0;t=0;first=null;lock=false;
  movesEl.textContent=0;timeEl.textContent=0;
  const cards=shuffle([...ICONS,...ICONS]).map((k,i)=>({k,i,open:false,done:false}));
  board.innerHTML=cards.map((c,i)=>\`<button data-i="\${i}" class="aspect-square rounded-xl bg-white/10 text-lg capitalize"></button>\`).join("");
  const btns=[...board.children];
  function render(){btns.forEach((b,i)=>{const c=cards[i];b.textContent=c.open||c.done?c.k:"";b.className="aspect-square rounded-xl text-xs "+(c.done?"bg-emerald-400/80 text-stone-900":c.open?"bg-white text-stone-900":"bg-white/10");});}
  btns.forEach(b=>b.onclick=()=>{
    if(lock)return;const i=+b.dataset.i;const c=cards[i];if(c.open||c.done)return;
    c.open=true;render();
    if(!first){first=c;return;}
    moves++;movesEl.textContent=moves;
    if(first.k===c.k){first.done=c.done=true;first=null;if(cards.every(x=>x.done))clearInterval(tick);}
    else{lock=true;setTimeout(()=>{first.open=c.open=false;first=null;lock=false;render();},700);}
  });
  render();tick=setInterval(()=>{t++;timeEl.textContent=t;},1000);
}
const board=document.getElementById("board"),movesEl=document.getElementById("moves"),timeEl=document.getElementById("time");
document.getElementById("new").onclick=start;start();
<\/script>`);
var harbor = wrap("Harbor — Notes for teams", `
<div style="font-family:ui-sans-serif,system-ui;background:#fbfaf7;color:#1a1916">
  <nav class="flex items-center justify-between max-w-5xl mx-auto px-6 h-16">
    <strong class="tracking-tight">Harbor</strong>
    <div class="hidden sm:flex gap-6 text-sm text-stone-500"><a>Product</a><a>Pricing</a><a>Journal</a></div>
    <a class="h-9 px-4 rounded-full bg-stone-900 text-white text-sm inline-flex items-center">Start free</a>
  </nav>
  <header class="max-w-5xl mx-auto px-6 py-20">
    <p class="text-xs uppercase tracking-[0.25em] text-stone-400 mb-4">Quiet software</p>
    <h1 class="text-5xl md:text-6xl font-semibold tracking-tight max-w-3xl leading-[1.05]">Notes that stay out of the way.</h1>
    <p class="mt-6 text-lg text-stone-500 max-w-xl">Harbor is a shared notebook for small teams who prefer calm over chrome.</p>
    <div class="mt-8 flex gap-3">
      <a class="h-11 px-5 rounded-full bg-stone-900 text-white text-sm inline-flex items-center">Try Harbor</a>
      <a class="h-11 px-5 rounded-full border border-stone-300 text-sm inline-flex items-center">See a demo</a>
    </div>
  </header>
  <section class="max-w-5xl mx-auto px-6 pb-24 grid md:grid-cols-3 gap-4">
    ${[
	"Shared pages",
	"Keyboard first",
	"Offline by default"
].map((t, i) => `
      <article class="rounded-2xl p-5 bg-white border border-stone-200">
        <div class="size-8 rounded-lg mb-4" style="background:hsl(${30 + i * 20} 30% 80%)"></div>
        <h2 class="font-medium mb-1">${t}</h2>
        <p class="text-sm text-stone-500">Built for writers who want less interface and more room to think.</p>
      </article>`).join("")}
  </section>
</div>`);
var EXAMPLES = [
	{
		id: "northstar",
		name: "Northstar",
		description: "A quiet photography portfolio.",
		category: "Sites",
		accent: "#c4b4a0",
		ink: "#1c1916",
		prompt: "Remix this photography portfolio: keep the editorial tone, add a journal page.",
		html: northstar
	},
	{
		id: "pulse",
		name: "Pulse",
		description: "A focus timer with session tracking.",
		category: "Apps",
		accent: "#2a2e34",
		ink: "#e8e6e1",
		prompt: "Remix this Pomodoro timer: add short and long breaks and a settings drawer.",
		html: pulse
	},
	{
		id: "ledger",
		name: "Ledger",
		description: "A simple monthly expense log.",
		category: "Apps",
		accent: "#d9cfc0",
		ink: "#1b1916",
		prompt: "Remix this expense tracker: add categories and a monthly chart.",
		html: ledger
	},
	{
		id: "harvest",
		name: "Harvest",
		description: "A recipe book you can search.",
		category: "Apps",
		accent: "#e2c9a8",
		ink: "#241c14",
		prompt: "Remix this recipe book: let me add my own recipes and mark favorites.",
		html: harvest
	},
	{
		id: "matchlight",
		name: "Matchlight",
		description: "A memory matching card game.",
		category: "Games",
		accent: "#3a3544",
		ink: "#f3efe8",
		prompt: "Remix this memory game: add difficulty levels and a win celebration.",
		html: matchlight
	},
	{
		id: "harbor",
		name: "Harbor",
		description: "A product landing page for a notes app.",
		category: "Sites",
		accent: "#ece7dc",
		ink: "#1a1916",
		prompt: "Remix this SaaS landing page: add pricing tiers and an FAQ.",
		html: harbor
	}
];
function FeaturedFeed() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "mx-auto w-full max-w-5xl px-5 pb-16 pt-10",
		"aria-label": "Example apps",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "mb-5 text-xs font-medium uppercase tracking-[0.18em] text-subtle",
			children: "Example apps"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3",
			children: EXAMPLES.map((ex) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: () => openExample(ex),
				className: "group overflow-hidden rounded-xl bg-surface text-left shadow-border transition-[box-shadow,transform] duration-[var(--motion-fast)] hover:shadow-border-hover",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "relative h-36 overflow-hidden",
					style: {
						background: ex.accent,
						color: ex.ink
					},
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniPreview, { id: ex.id })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "px-3.5 py-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-baseline justify-between gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "text-sm font-semibold",
							children: ex.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[11px] uppercase tracking-wider text-subtle",
							children: ex.category
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted",
						children: ex.description
					})]
				})]
			}, ex.id))
		})]
	});
}
function MiniPreview({ id }) {
	if (id === "northstar") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "absolute inset-4 grid grid-cols-2 gap-1.5 opacity-90",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "rounded-sm bg-black/15" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "rounded-sm bg-black/10" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "col-span-2 h-8 rounded-sm bg-black/20" })
		]
	});
	if (id === "pulse") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "absolute inset-0 flex items-center justify-center",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "size-20 rounded-full border border-white/25" })
	});
	if (id === "ledger") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "absolute inset-5 space-y-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-3 w-24 rounded-full bg-black/20" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-8 rounded-md bg-white/50" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-8 rounded-md bg-white/40" })
		]
	});
	if (id === "harvest") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "absolute inset-4 grid grid-cols-3 gap-1.5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "rounded-sm bg-white/40" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "rounded-sm bg-white/30" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "rounded-sm bg-white/50" })
		]
	});
	if (id === "matchlight") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "absolute inset-6 grid grid-cols-4 gap-1.5",
		children: Array.from({ length: 8 }).map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "rounded-sm bg-white/15" }, i))
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "absolute inset-5 space-y-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-3 w-20 rounded-full bg-black/15" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-6 w-3/4 rounded-sm bg-black/10" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 flex gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-6 w-16 rounded-full bg-black/20" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-6 w-16 rounded-full bg-white/50" })]
			})
		]
	});
}
function Landing() {
	const setDraft = useBuilder((s) => s.setDraft);
	const starters = (0, import_react.useMemo)(() => pickStarters(6), []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-none",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex min-h-[calc(100dvh-2.75rem)] flex-col",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-5 py-10",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-6 flex flex-col items-center text-center",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ForgeMark, { className: "mb-5 size-12" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
								className: "font-display text-3xl font-medium tracking-tight text-fg sm:text-4xl",
								children: "Build apps and websites with AI"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-3 max-w-md text-sm text-muted sm:text-base",
								children: "Describe your idea and Forge will build it — no code required."
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PromptBox, { large: true }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-6 text-center text-xs font-medium uppercase tracking-[0.16em] text-subtle",
						children: "Looking for an idea?"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "chip-fade mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none",
						children: starters.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setDraft(s.prompt),
							className: "shrink-0 rounded-full bg-surface px-3 py-1.5 text-sm text-fg shadow-border transition-[box-shadow] hover:shadow-border-hover",
							children: s.label
						}, s.label))
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("footer", {
				className: "px-5 pb-4 text-center text-xs text-subtle",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
					className: "mb-2 flex flex-wrap justify-center gap-x-4 gap-y-1",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/features",
							className: "hover:text-fg",
							children: "Features"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/ideas",
							className: "hover:text-fg",
							children: "What to build"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/guides",
							className: "hover:text-fg",
							children: "Guides"
						})
					]
				})
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FeaturedFeed, {})]
	});
}
var PICKER = `
<script>
(function(){
  let last;
  document.addEventListener('click', function(e){
    var t = e.target;
    if (!t || !t.tagName) return;
    e.preventDefault(); e.stopPropagation();
    if (last) last.style.outline = '';
    t.style.outline = '2px solid #1f4e8c';
    t.style.outlineOffset = '2px';
    last = t;
    var text = (t.innerText || '').trim().slice(0, 80);
    parent.postMessage({ type: 'forge-select', tag: t.tagName.toLowerCase(), text: text }, '*');
  }, true);
})();
<\/script>`;
function withPicker(html) {
	if (html.includes("</body>")) return html.replace("</body>", `${PICKER}</body>`);
	return html + PICKER;
}
var DEVICE_WIDTH = {
	desktop: "100%",
	tablet: "768px",
	phone: "390px"
};
function PreviewPane() {
	const project = useBuilder((s) => s.projects.find((p) => p.id === s.activeId) ?? null);
	const device = useBuilder((s) => s.device);
	const setDevice = useBuilder((s) => s.setDevice);
	const tab = useBuilder((s) => s.editorTab);
	const setTab = useBuilder((s) => s.setEditorTab);
	const selectMode = useBuilder((s) => s.selectMode);
	const setSelectMode = useBuilder((s) => s.setSelectMode);
	const restoreVersion = useBuilder((s) => s.restoreVersion);
	const setDraft = useBuilder((s) => s.setDraft);
	const [historyOpen, setHistoryOpen] = (0, import_react.useState)(false);
	const frame = (0, import_react.useRef)(null);
	const srcdoc = (0, import_react.useMemo)(() => {
		if (!project?.html) return "";
		return selectMode ? withPicker(project.html) : project.html;
	}, [project?.html, selectMode]);
	(0, import_react.useEffect)(() => {
		function onMsg(e) {
			const data = e.data;
			if (data?.type !== "forge-select") return;
			const hint = data.text ? ` (“${data.text}”)` : "";
			setDraft(`Update the selected ${data.tag}${hint}: `);
			setSelectMode(false);
		}
		window.addEventListener("message", onMsg);
		return () => window.removeEventListener("message", onMsg);
	}, [setDraft, setSelectMode]);
	if (!project) return null;
	const current = project;
	function download() {
		const blob = new Blob([current.html], { type: "text/html" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${current.title.replace(/[^\w]+/g, "-").toLowerCase() || "app"}.html`;
		a.click();
		URL.revokeObjectURL(url);
	}
	function openNew() {
		const blob = new Blob([current.html], { type: "text/html" });
		const url = URL.createObjectURL(blob);
		window.open(url, "_blank", "noopener");
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "flex min-h-0 min-w-0 flex-1 flex-col bg-bg p-2 md:p-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-2 flex items-center gap-1",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex rounded-full bg-muted-fill p-0.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setTab("preview"),
					className: cn("h-7 rounded-full px-3 text-xs font-medium", tab === "preview" ? "bg-surface text-fg shadow-border" : "text-muted"),
					children: "Preview"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => setTab("code"),
					className: cn("inline-flex h-7 items-center gap-1 rounded-full px-3 text-xs font-medium", tab === "code" ? "bg-surface text-fg shadow-border" : "text-muted"),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CodeXml, { className: "size-3" }), " Code"]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "ml-auto flex items-center gap-0.5",
				children: [
					[
						"desktop",
						"tablet",
						"phone"
					].map((d) => {
						return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
							label: d,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								size: "icon-sm",
								"aria-label": d,
								onClick: () => setDevice(d),
								className: device === d ? "text-fg" : "text-subtle",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(d === "desktop" ? Monitor : d === "tablet" ? Tablet : Smartphone, {})
							})
						}, d);
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
						label: "Select an element to edit",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "icon-sm",
							"aria-label": "Select element",
							"aria-pressed": selectMode,
							onClick: () => {
								setSelectMode(!selectMode);
								setTab("preview");
							},
							className: selectMode ? "text-accent" : "text-subtle",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MousePointer2, {})
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
							label: "Version history",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								size: "icon-sm",
								"aria-label": "Version history",
								onClick: () => setHistoryOpen((v) => !v),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(History, {})
							})
						}), historyOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "absolute right-0 top-9 z-20 w-64 rounded-lg bg-surface p-2 shadow-border",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "px-2 pb-1 text-xs font-medium uppercase tracking-wider text-subtle",
								children: "Versions"
							}), project.versions.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "px-2 py-3 text-sm text-muted",
								children: "No versions yet."
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
								className: "max-h-64 overflow-auto",
								children: [...project.versions].reverse().map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => {
										restoreVersion(project.id, v.id);
										setHistoryOpen(false);
									},
									className: "flex w-full flex-col rounded-md px-2 py-2 text-left hover:bg-muted-fill",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "truncate text-sm",
										children: v.label
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-xs text-subtle",
										children: formatRelativeTime(v.createdAt)
									})]
								}) }, v.id))
							})]
						}) : null]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
						label: "Download HTML",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "icon-sm",
							"aria-label": "Download",
							onClick: download,
							disabled: !project.html,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {})
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
						label: "Open in new tab",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "icon-sm",
							"aria-label": "Open in new tab",
							onClick: openNew,
							disabled: !project.html,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, {})
						})
					})
				]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative min-h-0 flex-1 overflow-hidden rounded-xl bg-surface shadow-border",
			children: [!project.html ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex h-full flex-col items-center justify-center px-8 text-center",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "Your app will appear here as Forge builds it."
				})
			}) : tab === "code" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
				className: "h-full overflow-auto p-4 font-mono text-xs leading-relaxed text-fg",
				children: project.html
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex h-full justify-center overflow-auto bg-muted-fill/50",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("iframe", {
					ref: frame,
					title: "Live preview",
					srcDoc: srcdoc,
					sandbox: "allow-scripts allow-forms allow-modals allow-popups allow-downloads",
					className: "h-full bg-surface",
					style: {
						width: DEVICE_WIDTH[device],
						maxWidth: "100%"
					}
				})
			}), selectMode && tab === "preview" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "pointer-events-none absolute left-3 top-3 rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-fg",
				children: "Click an element to edit it"
			}) : null]
		})]
	});
}
function AlertDialog({ open, onOpenChange, title, description, confirmLabel = "Confirm", destructive, onConfirm }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Root2, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Portal2, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Overlay2, { className: "fixed inset-0 z-50 bg-fg/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Content2, {
			className: cn("fixed left-1/2 top-1/2 z-50 w-[min(92vw,400px)] -translate-x-1/2 -translate-y-1/2", "rounded-xl bg-surface p-5 text-fg shadow-xl", "data-[state=open]:animate-in data-[state=closed]:animate-out"),
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Title2, {
					className: "text-base font-semibold",
					children: title
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Description2, {
					className: "mt-2 text-sm text-muted",
					children: description
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-5 flex justify-end gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cancel, {
						asChild: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							children: "Cancel"
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Action, {
						asChild: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: destructive ? "destructive" : "default",
							onClick: onConfirm,
							children: confirmLabel
						})
					})]
				})
			]
		})] })
	});
}
function Input({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
		className: cn("flex h-10 w-full rounded-md bg-surface px-3 text-sm text-fg shadow-border", "placeholder:text-subtle", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", "disabled:opacity-50", className),
		...props
	});
}
function ProjectSidebar() {
	const open = useBuilder((s) => s.sidebarOpen);
	const setOpen = useBuilder((s) => s.setSidebarOpen);
	const projects = useBuilder((s) => s.projects);
	const activeId = useBuilder((s) => s.activeId);
	const setActive = useBuilder((s) => s.setActive);
	const newProject = useBuilder((s) => s.newProject);
	const deleteProject = useBuilder((s) => s.deleteProject);
	const [query, setQuery] = (0, import_react.useState)("");
	const [pendingDelete, setPendingDelete] = (0, import_react.useState)(null);
	const filtered = (0, import_react.useMemo)(() => {
		const q = query.trim().toLowerCase();
		if (!q) return projects;
		return projects.filter((p) => p.title.toLowerCase().includes(q));
	}, [projects, query]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: cn("fixed inset-0 z-40 bg-fg/30 transition-opacity duration-[var(--motion-fast)]", open ? "opacity-100" : "pointer-events-none opacity-0"),
			onClick: () => setOpen(false)
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
			id: "projects",
			"aria-label": "Projects",
			className: cn("fixed inset-y-0 left-0 z-50 flex w-[min(20rem,88vw)] flex-col bg-surface shadow-border transition-transform duration-[var(--motion-fast)] ease-[var(--ease-out)]", open ? "translate-x-0" : "-translate-x-full"),
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between px-4 py-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-sm font-semibold",
						children: "Projects"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "ghost",
						size: "sm",
						onClick: () => {
							newProject();
							setOpen(false);
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-3.5" }), " New"]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "px-3 pb-3",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						value: query,
						onChange: (e) => setQuery(e.target.value),
						placeholder: "Search projects...",
						"aria-label": "Search projects"
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "min-h-0 flex-1 overflow-y-auto px-2 pb-4",
					children: filtered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "px-3 py-8 text-center text-sm text-muted",
						children: "No projects yet."
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "space-y-0.5",
						children: filtered.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "group relative",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => setActive(p.id),
								className: cn("w-full rounded-md px-3 py-2.5 text-left", p.id === activeId ? "bg-muted-fill" : "hover:bg-muted-fill/70"),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "truncate text-sm font-medium",
									children: p.title
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xs text-subtle",
									children: formatRelativeTime(p.updatedAt)
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-label": `Delete ${p.title}`,
								className: "absolute right-2 top-1/2 hidden size-8 -translate-y-1/2 items-center justify-center rounded-sm text-muted hover:text-danger group-hover:flex",
								onClick: (e) => {
									e.stopPropagation();
									setPendingDelete(p.id);
								},
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-3.5" })
							})]
						}, p.id))
					})
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialog, {
			open: pendingDelete !== null,
			onOpenChange: (v) => {
				if (!v) setPendingDelete(null);
			},
			title: "Delete this project?",
			description: "The conversation, preview, and version history will be removed from this browser.",
			confirmLabel: "Delete",
			destructive: true,
			onConfirm: () => {
				if (pendingDelete) deleteProject(pendingDelete);
				setPendingDelete(null);
			}
		})
	] });
}
function Toolbar({ inEditor }) {
	const theme = useBuilder((s) => s.theme);
	const setTheme = useBuilder((s) => s.setTheme);
	const setSidebarOpen = useBuilder((s) => s.setSidebarOpen);
	const newProject = useBuilder((s) => s.newProject);
	const mobilePane = useBuilder((s) => s.mobilePane);
	const setMobilePane = useBuilder((s) => s.setMobilePane);
	const nextTheme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
	const ThemeIcon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
		className: "flex h-11 shrink-0 items-center gap-1 px-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
				label: "Projects",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "ghost",
					size: "icon-sm",
					"aria-label": "Projects",
					onClick: () => setSidebarOpen(true),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Menu, {})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
				label: "New project",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "ghost",
					size: "icon-sm",
					"aria-label": "New project",
					onClick: newProject,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, {})
				})
			}),
			inEditor ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mx-auto flex rounded-full bg-muted-fill p-0.5 md:hidden",
				children: ["chat", "preview"].map((pane) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setMobilePane(pane),
					className: cn("h-7 rounded-full px-3 text-xs font-medium capitalize", mobilePane === pane ? "bg-surface text-fg shadow-border" : "text-muted"),
					children: pane === "preview" ? "App" : "Chat"
				}, pane))
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex-1" }),
			!inEditor ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex-1" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "hidden flex-1 md:block" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
				label: `Theme: ${theme}`,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "ghost",
					size: "icon-sm",
					"aria-label": "Toggle theme",
					onClick: () => setTheme(nextTheme),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThemeIcon, {})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/",
				className: "mr-1 hidden text-xs font-medium text-muted hover:text-fg sm:inline",
				onClick: newProject,
				children: "Forge"
			})
		]
	});
}
function AppShell() {
	const activeId = useBuilder((s) => s.activeId);
	const project = useBuilder((s) => s.projects.find((p) => p.id === s.activeId) ?? null);
	const mobilePane = useBuilder((s) => s.mobilePane);
	const inEditor = Boolean(activeId && project && (project.messages.length > 0 || project.html));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-dvh flex-col bg-bg text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toolbar, { inEditor }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProjectSidebar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex min-h-0 flex-1",
				children: inEditor ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: cn("min-h-0", mobilePane === "chat" ? "flex flex-1" : "hidden", "md:flex md:w-[26rem] md:flex-none lg:w-[28rem]"),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatPanel, {})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: cn("min-h-0 min-w-0", mobilePane === "preview" ? "flex flex-1" : "hidden", "md:flex md:flex-1"),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PreviewPane, {})
				})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Landing, {})
			})
		]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {});
}
//#endregion
export { Home as component };
