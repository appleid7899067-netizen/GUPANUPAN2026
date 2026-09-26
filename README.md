# GUPAN Studio — AI Web Builder

เว็บสร้างเว็บจากคำสั่ง พร้อมแชต โค้ด และพรีวิวในหน้าเดียว ได้แรงบันดาลใจจาก workflow ของ Bolt.new **ไม่ได้มี runtime หรือทุกฟีเจอร์เท่ากับ Bolt**

## เริ่มใช้งาน (Node.js 22+)

```bash
npm ci
npm run dev -- --hostname 0.0.0.0
```

เปิด `http://localhost:3000` บนเครื่องที่รัน หรือเปิด Live Preview ของสภาพแวดล้อมที่ใช้

### โหมดเริ่มต้น: Puter frontend workspace

เมื่อไม่ได้ตั้ง `TOTALUM_VCAAS_API_KEY` หน้าแรกจะเปิด GUPAN Studio:

1. พิมพ์เว็บที่ต้องการ เช่น “สร้างเว็บร้านกาแฟ มีเมนูและตะกร้าทดลอง เป็นภาษาไทย” แล้วกด **เริ่มสร้าง**
2. กด **เข้าสู่ระบบ Puter** อนุญาต popup ถ้าเบราว์เซอร์ถาม
3. กด **ส่งคำสั่ง** ด้วยตัวเอง ไม่มีการใช้ AI/เครดิตโดยอัตโนมัติเมื่อเปิดโปรเจกต์
4. AI ส่ง HTML แบบ streaming → ตรวจเอกสารครบ → บันทึก → อัปเดต **Preview**
5. สั่งแก้ต่อได้ โดยส่งโค้ดปัจจุบันและข้อความล่าสุดให้ AI เป็นบริบท
6. **Code**: แก้ `index.html` แล้วกดบันทึกและรัน หรือ Ctrl/⌘+S
7. **History**: กู้คืนโค้ดก่อนแก้ไขได้ 8 ครั้งล่าสุด
8. **Export ZIP**: ดาวน์โหลด `index.html`, `project.json`, `README.txt` เพื่อสำรองงาน
9. ย้ายเว็บไปเครื่องอื่น: แตก ZIP สร้างโปรเจกต์เปล่า แล้ว **นำเข้า HTML** (ไม่ได้นำเข้าประวัติแชต/เวอร์ชัน)

ใช้ AI ผ่าน Puter SDK โดยตรง ใช้ model เริ่มต้นของบริการ หรือเลือกจากรายการ/ระบุ model ID ที่บัญชีคุณใช้ได้ ไม่มี API key ฝั่งผู้ใช้ ค่าใช้จ่าย/โควตาเป็นไปตามบัญชี Puter **ไม่รับรองว่าฟรีไม่จำกัด**

### ล็อกอิน Puter ไม่ได้? (เช็คตามนี้)

1. กด **เข้าสู่ระบบ Puter** จากปุ่มในแอปเท่านั้น — ห้ามเปิด popup จากแท็บอื่น เพราะเบราว์เซอร์จะบล็อก
2. ถ้าไม่มี popup ขึ้น: แตะ ⋮ (Chrome) / aA (Safari) → **อนุญาตป๊อปอัป** สำหรับเว็บนี้ แล้วกดใหม่
3. ปิด **ad-blocker** ชั่วคราว (บางตัวบล็อก `js.puter.com`) แล้วกด “ลองเชื่อมต่ออีกครั้ง”
4. โหมดไม่ระบุตัวตนต้องอนุญาต **คุกกี้ third-party** ไม่งั้น session จะไม่ค้าง
5. ทางลัด: เปิด **puter.com** ล็อกอินให้เสร็จในอีกแท็บ แล้วกลับมากด “เช็คสถานะ”
6. ปุ่ม **ส่งคำสั่ง** จะกดได้เมื่อเชื่อมต่อ Puter แล้วเท่านั้น แต่แก้โค้ด/ดูพรีวิวได้โดยไม่ต้องล็อกอิน

### Deploy ขึ้น Render (เว็บจริง)

รีโพมี `render.yaml` แล้ว — โหมด Puter ไม่ต้องตั้ง API key ใด ๆ:

1. ใน [Render Dashboard](https://dashboard.render.com) กด **New → Blueprint** เลือกรีโพนี้
2. ใช้ค่าเริ่มต้นได้เลย (`build: npm ci && npm run build`, `start: npm start -- --hostname 0.0.0.0 --port $PORT`)
3. ตั้ง `NEXT_PUBLIC_APP_URL` เป็น URL จริงของเว็บ (เช่น `https://xboss123.onrender.com`)
4. ทุก push ขึ้น `main` จะ deploy อัตโนมัติ (autoDeploy)

> หมายเหตุ: แผนฟรีของ Render จะ sleep เมื่อไม่มีคนเข้า ~15 นาที เข้าครั้งแรกหลัง sleep อาจต้องรอโหลด ~1 นาที

### สิ่งที่มีจริงในโหมด Puter ใหม่นี้

- HTML/CSS/JavaScript แบบเอกสารเดียว ไม่ใช่ React/Next.js runtime สำหรับแอปที่สร้าง
- พรีวิวมือถือ/เดสก์ท็อปใน `iframe sandbox="allow-scripts"` ไม่มี `allow-same-origin`
- CSP บล็อก fetch, external scripts, forms; อนุญาต inline CSS/JS และรูป HTTPS/data
- Console รับ log/warn/error จาก iframe ที่ตรงกันเท่านั้น (ไม่ใช่ shell terminal)
- ไม่อนุญาตโค้ดพรีวิวเข้าถึง Puter, cookies หรือ storage ของ builder
- เก็บโปรเจกต์ใน localStorage ของ **เบราว์เซอร์และ origin นี้เท่านั้น** ไม่มี cloud sync
- โค้ดสูงสุด 400 KB/เวอร์ชัน; quota storage ของเบราว์เซอร์อาจเต็มก่อนถึงเพดาน แจ้ง error โดยไม่อ้างว่าบันทึกแล้ว
- เมื่อ AI error, output ไม่ครบ หรือหยุดรับผล จะไม่ทับโค้ดที่บันทึกไว้ คำสั่งยังอยู่ให้ลองใหม่
- ปุ่มหยุดยกเลิกการรับผลใน UI เท่านั้น ไม่รับรองยกเลิกค่าใช้จ่ายของผู้ให้บริการ
- ไม่มี npm, Node.js server, backend/database/auth/payment จริง, deploy หรือ GitHub sync ในโหมดนี้
- โปรเจกต์ Puter legacy เดิมยังไม่ได้ migrate เข้า storage รูปแบบใหม่นี้ และไม่ได้ถูกลบ

ตรวจโค้ด AI ก่อนเผยแพร่เสมอ Sandbox นี้ไม่ใช่ container สำหรับรันโค้ดที่เชื่อถือไม่ได้ทุกประเภท (เช่น infinite loop ยังใช้ CPU ได้) ไฟล์ HTML ที่ export ไม่ได้มีข้อจำกัด sandbox ของ builder ติดไปด้วย

### โหมด Totalum (เส้นทาง full-stack เดิม)

```bash
cp .env.example .env.local
# ตั้ง TOTALUM_VCAAS_API_KEY ใน .env.local ฝั่ง server เท่านั้น แล้ว restart
```

ถ้ามี key หน้าแรกใช้ dashboard เดิม และโปรเจกต์เปิดผ่าน `/project/<id>` ส่วน workspace ใหม่ใช้ `/build/<id>` ไม่ปนกัน

**ห้ามเปิด Totalum สู่สาธารณะโดยไม่มี auth/ownership guards:** API เดิมเป็น single-tenant และยังไม่มีการป้องกันผู้ใช้รายอื่นใช้เครดิตของเจ้าของ key ดู `AGENTS.md` ส่วน Boilerplate mode ไม่ได้แก้ระบบสิทธิ์หรือรับรอง production readiness ในรอบนี้

## ตรวจสอบ

```bash
npm test                     # unit tests: parser, history, persistence, storage failure, CSP
npm run check-types-errors
npm run build
npm start -- --hostname 0.0.0.0
```

Optional browser regression: `tests/browser-smoke.cjs` ใช้ Playwright ที่ติดตั้งแยก ไม่เพิ่ม dependency ให้แอป และ **mock Puter SDK** เพื่อไม่ใช้เครดิตจริง:

```bash
PLAYWRIGHT_MODULE=/path/to/playwright node tests/browser-smoke.cjs
```

ทดสอบ create → login mock → streaming → preview interaction → code save → reload → ZIP → follow-up context → provider error/invalid HTML → stop → restore → import → mobile layout → reopen

การผ่าน test/build ไม่ได้แปลว่าได้ยืนยัน Puter login, โมเดล AI, quota หรือ Totalum บนบัญชีจริง ต้องลองด้วยบัญชีของผู้ใช้เองอีกครั้ง

ฟอนต์ไทย self-hosted จาก `@fontsource/noto-sans-thai` (SIL OFL ใน `public/fonts/OFL-NotoSansThai.txt`) จึงไม่ต้องโหลด Google Fonts ตอน build

---

## เอกสารต้นทาง: Totalum workspace

ส่วนด้านล่างเป็นคู่มือ backend **Totalum** เดิม ไม่ใช่รายการฟีเจอร์ของ Puter workspace ข้างบน

## What is this?

A ready-to-run AI app builder, open source under MIT.

A user types what they want, for example *"a CRM with kanban boards and Stripe billing"*. The AI builds a real full-stack **Next.js** app, shows it live in the browser, and publishes it to a public URL when the user is happy.

Everything a builder like this normally needs is already handled:

- **The hard part is done by the [Totalum API](https://www.totalum.app/docs/api/overview).** Totalum runs the AI agent that writes the code, and hosts every generated app with its database, file storage, SSL, CDN, deploys and custom domains. One API key gives you all of it.
- **This repo is the product on top.** It is the user interface: the prompt box, the live preview, the code editor, the visual editor, the database browser, the logs, the version history and everything else you see in the demo.

> **In one sentence:** clone this repo, paste one API key, and you have your own AI app builder running in minutes, for yourself or for your customers.

---

## 🌟 Who is it for?

| You are… | What you get |
| --- | --- |
| 🧑‍💻 **A builder or indie hacker** | Your own free, self-hosted v0 / Lovable / Bolt alternative. Prompt → deployed app. |
| 🏢 **A SaaS or software company** | Let *your* users build full-stack apps inside *your* product, without building the infrastructure. |
| 🎨 **An agency or no-code team** | Ship client apps faster, under your own brand. |
| 🧪 **Curious, not technical** | No servers to manage. One key, and everything works. |

---

## ✨ What it does

All of this works with **one API key**. No other cloud accounts, no glue code:

- 🤖 **Prompt → full-stack app.** Describe an app in plain English and the AI agent builds a complete Next.js project.
- 👀 **Live preview.** Watch the running app update while the agent works.
- 🖱️ **Visual editor.** Click any element in the preview and change its text, size, colours or image. The change is written back to the exact file and line, and the app rebuilds.
- 🧑‍💻 **Code editor.** A Monaco (VS Code) editor to read and edit every generated file. Save, rebuild, done.
- 🗄️ **Database.** Every app gets a real database. Browse, query and edit its records from the UI.
- 🔐 **Secrets and environment variables.** Managed per project and per environment.
- 🚀 **Hosting and one-click deploy.** Every project has a live URL. Publish to production in one click.
- 🌐 **Custom domains.** Attach your own domain with guided DNS setup and watch it go live.
- 🔗 **GitHub sync.** Connect a repo and push or pull changes in both directions.
- 🎨 **Figma.** Paste a Figma frame link in the chat and the agent builds from the design.
- 📦 **Export, import and duplicate projects.** Package a whole project into an import code, restore it, or clone it in one action.
- 🕓 **Version history.** Every AI build is a restorable checkpoint, with a diff viewer showing exactly what changed.
- 📜 **Logs.** Read runtime logs from the preview server and from production.
- 🧱 **Isolated sandboxes.** Each project runs in its own environment. A sleeping one wakes on demand, and the UI tells the user instead of failing silently.
- 🏢 **Multi-tenant.** Create isolated projects per user or per customer with no extra work.
- 🌍 **Deploy anywhere.** Vercel, Docker, or any Node.js host.

---

## 🚀 Quick Start

You can have it running locally in about three minutes.

### 1. Clone and install

```bash
git clone https://github.com/totalumlabs/ai-app-builder-open.git
cd ai-app-builder-open
npm install
```

### 2. Add your API key

Create a `.env` file (or `.env.local`) in the project root:

```bash
TOTALUM_VCAAS_API_KEY=your_key_here
```

> 👉 No key yet? It is free to start. See [Getting your API key](#-getting-your-api-key) just below.

### 3. Run it

```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)**, type what you want to build, and watch it happen. 🎉

**Requirements:** [Node.js](https://nodejs.org) 20+ and npm. Nothing else.

---

## 🔑 Getting your API key

The only thing this app needs is a Totalum API key. **The first 50 AI credits are free.**

1. **Create an account** at **[totalum.app/api](https://www.totalum.app/api)**.
2. During onboarding, choose **"Use the Totalum API"**.
3. **Copy your API key** into your `.env` file as `TOTALUM_VCAAS_API_KEY`.

That single key covers hosting, databases, AI, custom domains, GitHub sync and sandboxes. No other providers are required.

---

## ⚙️ Environment variables

| Variable | Required | What it is |
| --- | :---: | --- |
| `TOTALUM_VCAAS_API_KEY` | ✅ **Yes** | Your Totalum API key. The only variable the app needs. It is read on the server only and never reaches the browser. |
| `NEXT_PUBLIC_APP_URL` | ⬜ Optional | The public URL of your deployment, e.g. `https://your-domain.com`. Used to allow-list your origin for CSP and CORS in production. Defaults to the same host. |

To start from the example file:

```bash
cp .env.example .env.local
```

> 🔒 **Security:** the API key is only read in `src/lib/vcaas-server.ts`, which never ships to the browser. It is deliberately **not** a `NEXT_PUBLIC_` variable.

---

## ☁️ Deploy it

This is a standard Next.js app with no platform lock-in. It runs wherever Next.js runs.

> ### ⚠️ Important: this project ships with NO authentication
>
> That is on purpose — we want you to add the auth that fits how your system works, or
> however you prefer. Out of the box every route is public and the app acts on a single
> API key, so **anyone who can reach the URL can use it and spend that key's credits.**
>
> **Before you publish this anywhere public, put an auth layer in front of it.** The
> hooks are already there: make the two guards in `src/app/api/vcaas/_shared.ts` real and
> protect the pages in `src/proxy.ts`. See [Use it as a boilerplate](#use-it-as-a-boilerplate-login--payments) for the step-by-step. Running it locally or on a private
> network with no login is fine.

### Vercel, one click

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/totalumlabs/ai-app-builder-open&env=TOTALUM_VCAAS_API_KEY)

Import the repo, set `TOTALUM_VCAAS_API_KEY` under **Environment Variables**, and deploy.

### Any Node.js host (VM, Docker, Railway, Render, Fly.io…)

```bash
npm run build
npm start          # serves on $PORT (default 3000)
```

Set `TOTALUM_VCAAS_API_KEY` in the host's environment and point your process manager or container at `npm start`.

---

## 🧩 Put it inside your own product

This is not only a standalone tool. It is a drop-in AI app-builder layer for a SaaS you are launching or already run.

- 🏢 **Multi-tenant by design.** Every generated app is an isolated Totalum project. Create one per user, team or customer.
- 🎨 **White-label.** It is your codebase and your UI. Rebrand it, restyle it, embed it in your dashboard.
- 🔌 **One integration.** A single API key gives your users hosting, databases, AI, domains, GitHub and sandboxes. You do not stitch together five vendors.
- 📈 **A new revenue stream.** Resell app building, hosting or premium AI credits on top of your product.

> **The pitch to your customers:** *"Build and ship a full-stack app right here, inside our platform."*

> ⚠️ **Before you put real users behind it, read `src/app/api/vcaas/_shared.ts`.** This app runs on one API key, so "who is asking?" and "may they touch this project?" are answered with "yes" by default. That file is where you add your own auth and ownership checks. The API routes already delegate the decision to it.

### Two ways to integrate

- **Run it beside your product.** Deploy this app on a subdomain, put your login in front, rebrand it, and link or iframe to it. Hours, not weeks.
- **Port the flow into your stack.** Keep the contract, not the UI: a server-side proxy that adds the `api-key` header, then `launch` → poll agent status → show the preview URL → follow-up prompts → deploy. One Totalum project per customer, ownership checked on every proxied call. The step-by-step version, with the exact files to mirror, is in [`AGENTS.md`](AGENTS.md#adding-an-ai-app-builder-to-an-existing-product-any-stack).

### Use it as a boilerplate: login + payments

Want to ship this as your own product? Add an auth provider such as **Supabase** for login (a `profiles` and a `projects` table, make the two guards in `_shared.ts` real, protect the pages in `src/proxy.ts`) and **Stripe** for payments (checkout for credit packs or a plan, a webhook that tops up `profiles.credits`, a 402 on spend-shaped calls when the balance is empty, which the UI already turns into a "buy credits" dialog). The concrete checklist is in [`AGENTS.md`](AGENTS.md#boilerplate-mode-login-with-supabase-payments-with-stripe).

---

## 🔐 Auth, database and third-party providers

Two different things live here, and it is worth keeping them apart:

- **The apps the AI builds for you** come with a managed database, hosting, auth and everything else they need to run — all provided by the Totalum API. Nothing to install.
- **This builder UI itself** is deliberately lean. It ships no auth, payment or AI SDK, because it needs none: it is a thin client in front of one API key. When you turn it into your own product you add exactly the providers you want — the step-by-step is in [`AGENTS.md`](AGENTS.md#boilerplate-mode-login-with-supabase-payments-with-stripe):

  - **Auth**: Supabase Auth, Better Auth, Clerk, Auth0 or your own.
  - **Payments**: Stripe, or any provider — for credit packs or plans.
  - **Database (for your own users/billing)**: Supabase, Postgres, PlanetScale, MongoDB, anything.

Add a provider by installing its SDK and setting its key in the **Secrets** panel.

### What this repo actually depends on

The builder runs on **Next.js 16 / React 19 / TypeScript / Tailwind 4**. The only other runtime dependencies are UI and utility libraries:

| Area | Packages |
|---|---|
| UI primitives | Radix UI, `lucide-react`, `sonner`, `cmdk`, `next-themes`, `class-variance-authority`, `clsx`, `tailwind-merge` |
| Code editor | `@monaco-editor/react` |
| Forms | `react-hook-form` |
| Dates / archives | `react-day-picker`, `fflate` |



---

## 🏗️ How it works

```
┌──────────────────────────────────────────────────────────────┐
│  This repo (the Next.js front-end, or your own SaaS)         │
│                                                              │
│   UI components ──► API client (src/lib/vcaas.ts)            │
│                        │  same-origin fetch                  │
│                        ▼                                     │
│   /api/vcaas/*  (server proxy routes) ──► adds the api-key   │
└────────────────────────────┬─────────────────────────────────┘
                             │  HTTPS + your secret API key
                             ▼
        ╔═══════════════════════════════════════════╗
        ║   Totalum API                              ║
        ║   AI agent · hosting · sandboxes           ║
        ║   database · deploys · domains · GitHub    ║
        ╚═══════════════════════════════════════════╝
```

Three things worth knowing:

- **The browser never sees your API key.** Client code calls same-origin proxy routes under `/api/vcaas/*`. The server adds the key and forwards the request to Totalum.
- **Every Totalum call goes through one file.** The client side is `src/lib/vcaas.ts`, with its types in `src/lib/vcaas-types.ts`. The part that holds the key is `src/lib/vcaas-server.ts`. If you want to see how an endpoint is really called, polled and error-handled, read there.
- **Credits belong to the operator.** Every action runs on the one API key in your environment. When that account runs out of credits the app says so once and links to the billing page. ⚠️ That message is for **you**, not your users. Remove it before you sell this to customers.

---

## 📚 API reference

Everything this app calls is documented in one Markdown file, written to be read by people and by AI coding assistants alike:

### 👉 **[www.totalum.app/totalum-api.md](https://www.totalum.app/totalum-api.md)**

It covers the whole core API (account and credits, projects, the AI agent, deployments, server and logs, versions, secrets, custom domains, analytics) and links to the optional areas (GitHub, Figma, database, webhooks, files, project transfer, project groups). The browsable docs are at [www.totalum.app/docs](https://www.totalum.app/docs), with the [quickstart](https://www.totalum.app/docs/quickstart) and the [OpenAPI spec](https://www.totalum.app/openapi.json).

Working on this repo with an AI agent? Start from [`AGENTS.md`](AGENTS.md). It is the short, agent-oriented map of the project: commands, architecture, where each feature lives, the rules that are not obvious from the code, and how to take the next steps.

---

## 🗂️ Project structure

```
src/
├─ app/
│  ├─ page.tsx                 # Dashboard: prompt box, your projects, import/duplicate
│  ├─ project/[projectId]/     # The workspace (chat, preview, code, database, …)
│  └─ api/
│     ├─ vcaas/[...path]/      # Server proxy to the Totalum API
│     ├─ preview/[projectId]/  # Same-origin proxy of a project, needed by the visual editor
│     ├─ visual-edit/…/apply   # Turns visual changes into real source edits
│     └─ config/               # Reports whether the API key is configured
├─ components/
│  └─ workspace/               # Chat, Preview, Code, Database, GitHub, Figma, Logs…
│     └─ visual-editor/        # Inspector panel, changes bar, the editor's own hook
├─ i18n/                       # One English dictionary + `useT()`
├─ lib/
│  ├─ vcaas.ts                 # 🧠 The Totalum API client (browser side)
│  ├─ vcaas-server.ts          # The half that holds the API key, server only
│  ├─ vcaas-types.ts           # Shared API types
│  └─ visual-edit*.ts          # Matching a clicked element back to its source
└─ proxy.ts                    # CORS / CSP boundary
AGENTS.md                      # The map for AI coding agents working on this repo
```

---

## ❓ FAQ

<details>
<summary><b>Is it really free?</b></summary>

The code is free and open source. Running it needs a Totalum API key, which is free to start (the first 50 AI credits are included). You pay only as usage grows. See [pricing](https://www.totalum.app/api#pricing).
</details>

<details>
<summary><b>Do I need to set up a database, hosting or an AI provider?</b></summary>

No. The single Totalum API key provides hosting, databases, AI, domains, GitHub and sandboxes. You can still add your own providers such as Supabase or Stripe if you want them.
</details>

<details>
<summary><b>Can my users build apps inside my own product?</b></summary>

Yes. It is multi-tenant and white-label by design. See [Put it inside your own product](#-put-it-inside-your-own-product).
</details>

<details>
<summary><b>What can it build?</b></summary>

Full-stack Next.js web apps: dashboards, CRMs, internal tools, marketplaces, SaaS MVPs, landing pages with a backend, and more.
</details>

<details>
<summary><b>Where is the API key stored? Is it safe?</b></summary>

Server side only. It is read in `src/lib/vcaas-server.ts` and never shipped to the browser. Client requests go through same-origin proxy routes that add the key on the server.
</details>

<details>
<summary><b>Can I self-host without Vercel?</b></summary>

Yes. `npm run build && npm start` runs on any Node.js host: a VM, Docker, Railway, Render, Fly.io and so on.
</details>

---

## 🆚 How it compares

| | **AI App Builder Open** | v0 · Lovable · Bolt · Replit |
| --- | :---: | :---: |
| Open source | ✅ | ❌ |
| Self-hostable | ✅ | ❌ |
| White-label, embeddable in your SaaS | ✅ | ❌ |
| Multi-tenant out of the box | ✅ | Limited |
| Hosting + database + domains + GitHub included | ✅ (one key) | Varies |
| Bring your own providers (Supabase, Stripe…) | ✅ | Limited |
| Deploy anywhere | ✅ | ❌ |

---

## 🤝 Contributing

Contributions are welcome, whether a bug fix, a new panel, docs or a feature idea:

1. Fork the repo and create a branch: `git checkout -b my-feature`
2. Read [`AGENTS.md`](AGENTS.md) for the layout and the rules, make your changes, and run `npm run build` to check them.
3. Open a pull request describing what you changed and why.

Found a bug or have an idea? [Open an issue](https://github.com/totalumlabs/ai-app-builder-open/issues).

---

## 📄 License

Released under the **MIT License**. Free for personal and commercial use. See [`LICENSE`](LICENSE).

---

<div align="center">

### If this project helps you, please give it a ⭐. It helps others find it.

**Open-source AI app builder** · self-hosted **v0 / Lovable / Bolt / Replit alternative** · prompt-to-app · full-stack Next.js · multi-tenant · embeddable AI app builder for your SaaS.

Built with ❤️ on the [Totalum API](https://www.totalum.app/api) · [Docs](https://www.totalum.app/docs) · [Get your free API key](https://www.totalum.app/api)

</div>

---
