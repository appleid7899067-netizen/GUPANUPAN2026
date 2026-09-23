export type ExampleApp = {
  id: string;
  name: string;
  description: string;
  category: string;
  accent: string;
  ink: string;
  prompt: string;
  html: string;
};

function wrap(title: string, body: string, extraHead = "") {
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

const northstar = wrap(
  "Northstar — Portfolio",
  `
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
  ${["Harbor dawn","Glass atrium","Cedar trail","Night market","Studio still","River fog"].map((n,i)=>`
    <article class="relative overflow-hidden group min-h-64" style="background:hsl(${28+i*18} 22% ${72-i*6}%)">
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
</footer>`,
  `<style>body{background:#f6f1ea;color:#1c1916;font-family:ui-sans-serif,system-ui}</style>`,
);

const pulse = wrap(
  "Pulse — Focus timer",
  `
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
<\/script>`,
);

const ledger = wrap(
  "Ledger — Expenses",
  `
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
<\/script>`,
);

const harvest = wrap(
  "Harvest — Recipes",
  `
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
<\/script>`,
);

const matchlight = wrap(
  "Matchlight — Memory",
  `
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
<\/script>`,
);

const harbor = wrap(
  "Harbor — Notes for teams",
  `
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
    ${["Shared pages","Keyboard first","Offline by default"].map((t,i)=>`
      <article class="rounded-2xl p-5 bg-white border border-stone-200">
        <div class="size-8 rounded-lg mb-4" style="background:hsl(${30+i*20} 30% 80%)"></div>
        <h2 class="font-medium mb-1">${t}</h2>
        <p class="text-sm text-stone-500">Built for writers who want less interface and more room to think.</p>
      </article>`).join("")}
  </section>
</div>`,
);

export const EXAMPLES: ExampleApp[] = [
  {
    id: "northstar",
    name: "Northstar",
    description: "A quiet photography portfolio.",
    category: "Sites",
    accent: "#c4b4a0",
    ink: "#1c1916",
    prompt: "Remix this photography portfolio: keep the editorial tone, add a journal page.",
    html: northstar,
  },
  {
    id: "pulse",
    name: "Pulse",
    description: "A focus timer with session tracking.",
    category: "Apps",
    accent: "#2a2e34",
    ink: "#e8e6e1",
    prompt: "Remix this Pomodoro timer: add short and long breaks and a settings drawer.",
    html: pulse,
  },
  {
    id: "ledger",
    name: "Ledger",
    description: "A simple monthly expense log.",
    category: "Apps",
    accent: "#d9cfc0",
    ink: "#1b1916",
    prompt: "Remix this expense tracker: add categories and a monthly chart.",
    html: ledger,
  },
  {
    id: "harvest",
    name: "Harvest",
    description: "A recipe book you can search.",
    category: "Apps",
    accent: "#e2c9a8",
    ink: "#241c14",
    prompt: "Remix this recipe book: let me add my own recipes and mark favorites.",
    html: harvest,
  },
  {
    id: "matchlight",
    name: "Matchlight",
    description: "A memory matching card game.",
    category: "Games",
    accent: "#3a3544",
    ink: "#f3efe8",
    prompt: "Remix this memory game: add difficulty levels and a win celebration.",
    html: matchlight,
  },
  {
    id: "harbor",
    name: "Harbor",
    description: "A product landing page for a notes app.",
    category: "Sites",
    accent: "#ece7dc",
    ink: "#1a1916",
    prompt: "Remix this SaaS landing page: add pricing tiers and an FAQ.",
    html: harbor,
  },
];
