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


function makeCatalogTemplate(title: string, category: string, style: string, accent: string, features: string[]): ExampleApp {
  const themes: Record<string, [string,string,string]> = {
    minimal:["#f8f8f6","#171717","#6b6b66"], glass:["#edf3ff","#101828","#667085"],
    editorial:["#f4efe8","#241f1a","#766b60"], neo:["#f1efff","#171329","#69627d"],
    dark:["#0d1117","#f3f4f6","#9ca3af"], pastel:["#fff5fa","#35172b","#8d647e"],
    luxury:["#15130f","#f4ead4","#a89c83"], brutalist:["#f7f7f0","#101010","#505050"],
    gradient:["#f4f0ff","#1e1633","#6e6382"], bento:["#eef2f5","#17202a","#68737e"]
  };
  const [bg,ink,muted]=themes[style]??themes.minimal;
  const dark=style==="dark"||style==="luxury";
  const radius=style==="brutalist"?"4px":style==="neo"?"20px":"16px";
  const featureHtml=features.map((x,i)=>`<article class="card"><span class="num">0${i+1}</span><h2>${x}</h2><p>Ready-to-customize ${category.toLowerCase()} building block.</p></article>`).join("");
  const itemHtml=["North","Studio","Field","Atlas","Common","Orbit"].map((x,i)=>`<article class="card item"><div class="thumb" style="background:${accent};opacity:${.55+i*.06}"></div><b>${x}</b><p>${category} · starter</p><button class="open">Open</button></article>`).join("");
  const body=`
  <nav class="shell"><strong>${title}</strong><div class="navlinks"><a href="#main">Home</a><a href="#features">Explore</a><a href="#contact">Contact</a><button id="start">Start</button></div></nav>
  <main id="main"><section class="shell hero"><span class="eyebrow">${category} · ${style}</span><h1>${title}</h1><p>Production-shaped starter with responsive layout, interactive preview and clear extension points.</p><div class="actions"><button id="primary">Try it</button><button class="ghost" onclick="document.getElementById('features').scrollIntoView()">Explore</button></div></section>
  <section id="features" class="shell featuregrid">${featureHtml}</section>
  <section class="shell card work"><div class="toolbar"><b>Interactive preview</b><input id="search" placeholder="Search..."><span id="count"></span></div><div id="items" class="itemgrid">${itemHtml}</div></section>
  <section id="contact" class="shell card contact"><h2>Make it yours</h2><p>Ask Boss to change layout, data, behavior, branding or connect a real backend.</p><button id="contactBtn">Continue</button></section></main>`;
  const script=`<script>
  const root=document.currentScript.parentElement,search=root.querySelector("#search"),count=root.querySelector("#count");
  function draw(q=""){const all=[...root.querySelectorAll(".item")];const visible=all.filter(x=>x.innerText.toLowerCase().includes(q.toLowerCase()));all.forEach(x=>x.style.display=visible.includes(x)?"block":"none");count.textContent=visible.length+" results";visible.forEach(x=>x.querySelector(".open").onclick=()=>alert("Opened "+x.querySelector("b").textContent))}
  search.oninput=()=>draw(search.value);draw();
  root.querySelector("#primary").onclick=()=>alert("Demo started");root.querySelector("#start").onclick=()=>alert("Starter action ready");root.querySelector("#contactBtn").onclick=()=>alert("Request captured");
  <\/script>`;
  const html=`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>
  *{box-sizing:border-box}body{margin:0;background:${bg};color:${ink};font-family:ui-sans-serif,system-ui,sans-serif}a{color:inherit;text-decoration:none}.shell{max-width:1120px;margin:auto;padding:0 20px}
  nav{height:70px;display:flex;align-items:center;justify-content:space-between}.navlinks{display:flex;gap:16px;align-items:center;color:${muted};font-size:14px}.navlinks button,#primary{border:0;background:${dark?accent:ink};color:${dark?"#111":"#fff"};border-radius:999px;padding:10px 16px;font-weight:700}
  .hero{padding:88px 20px 70px}.eyebrow{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:${muted}}h1{font-size:clamp(48px,8vw,82px);line-height:.94;letter-spacing:-.055em;max-width:850px;margin:14px 0}.hero p{max-width:620px;font-size:18px;line-height:1.6;color:${muted}}.actions{display:flex;gap:10px;margin-top:24px}.ghost{border:1px solid #bbb;background:transparent;color:${ink};border-radius:999px;padding:10px 16px}
  .featuregrid,.itemgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px}.featuregrid{padding-bottom:28px}.card{background:${dark?"rgba(255,255,255,.04)":"rgba(255,255,255,.78)"};border:1px solid ${dark?"#30363d":"#ddd"};border-radius:${radius};padding:20px}.card p{color:${muted};line-height:1.55}.num{color:${accent}}.work{margin:28px auto;padding:16px}.toolbar{display:flex;gap:10px;align-items:center;margin-bottom:16px}.toolbar input{margin-left:auto;max-width:220px;width:100%;padding:10px;border-radius:12px;border:1px solid #bbb;background:transparent;color:inherit}.thumb{height:120px;border-radius:${radius};margin-bottom:12px}.item button{margin-top:10px;border:1px solid #bbb;background:transparent;color:inherit;padding:8px 12px;border-radius:10px}.contact{margin-top:28px;margin-bottom:70px}.contact button{background:${accent};color:${dark?"#111":ink};border:0;border-radius:999px;padding:11px 17px;font-weight:700}
  @media(max-width:640px){.shell{padding:0 14px}.hero{padding:60px 14px 45px}.navlinks a{display:none}.toolbar{flex-wrap:wrap}.toolbar input{margin-left:0;max-width:none}h1{font-size:46px}}
  </style></head><body>${body}${script}</body></html>`;
  return {id:"catalog-"+category.toLowerCase().replace(/\s+/g,"-")+"-"+style,name:title,description:category+" · "+style+" style · functional starter",category,accent,ink,prompt:"Build a production-ready "+category.toLowerCase()+" from this starter. Keep the visual style and make all requested interactions real.",html};
}

const CATALOG_TEMPLATES: ExampleApp[] = [
  makeCatalogTemplate("SaaS Launchpad","SaaS","gradient","#8b7cff",["Hero + pricing","Analytics","Teams","Billing"]),
  makeCatalogTemplate("Finance OS","Finance","minimal","#111827",["Accounts","Budgets","Transactions","Reports"]),
  makeCatalogTemplate("Market Store","Ecommerce","bento","#7c8cff",["Products","Cart","Checkout","Orders"]),
  makeCatalogTemplate("Luma Dining","Food","editorial","#c99b64",["Menu","Gallery","Reservation","Contact"]),
  makeCatalogTemplate("Signal Ops","Internal Tools","dark","#7dd3fc",["KPIs","Charts","Tables","Alerts"]),
  makeCatalogTemplate("Pipeline CRM","Business","neo","#8b5cf6",["Leads","Deals","Contacts","Activity"]),
  makeCatalogTemplate("Flow Projects","Productivity","brutalist","#b6d900",["Projects","Tasks","Members","Timeline"]),
  makeCatalogTemplate("Local Loop","Websites","pastel","#e879a9",["Search","Categories","Profiles","Reviews"]),
  makeCatalogTemplate("Gather Events","Community","gradient","#f97316",["Events","Filters","RSVP","Attendees"]),
  makeCatalogTemplate("Bookly","Services","minimal","#111827",["Calendar","Availability","Booking","Confirmation"]),
  makeCatalogTemplate("LearnLab","Education","glass","#4f46e5",["Courses","Lessons","Quizzes","Progress"]),
  makeCatalogTemplate("Strong","Fitness","dark","#86efac",["Workouts","Plans","Goals","Progress"]),
  makeCatalogTemplate("Haven Realty","Real Estate","luxury","#d6b36a",["Listings","Search","Agents","Inquiries"]),
  makeCatalogTemplate("Commons","Community","pastel","#f472b6",["Feed","Profiles","Groups","Notifications"]),
  makeCatalogTemplate("Field Journal","Content","editorial","#c28d5c",["Posts","Categories","Search","Authors"]),
  makeCatalogTemplate("Studio Agency","Agency","brutalist","#111111",["Services","Work","Testimonials","Leads"]),
  makeCatalogTemplate("Nova AI","AI Apps","dark","#67e8f9",["Chat","Models","History","Tools"]),
  makeCatalogTemplate("Atlas Docs","Developer Tools","minimal","#111827",["Sidebar","Search","API","Guides"]),
  makeCatalogTemplate("Maker Portfolio","Portfolio","neo","#8b5cf6",["Projects","Case studies","Resume","Contact"]),
  makeCatalogTemplate("Roam Travel","Travel","luxury","#d6b36a",["Destinations","Search","Itinerary","Saved trips"]),
];

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
  ...CATALOG_TEMPLATES,
];
