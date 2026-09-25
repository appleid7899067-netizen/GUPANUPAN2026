import { useEffect, useState } from "react";
import { GuPanuMark } from "./logo";
import { PromptBox } from "./prompt-box";
import { FeaturedFeed } from "./featured-feed";
import { EXAMPLES } from "@/lib/builder/templates";
import { useBuilder } from "@/lib/builder/store";
import { buildWorldPlan } from "@/lib/boss-unified-core";

const TYPEWORDS = ["ความฝันของคุณ", "ธุรกิจของคุณ", "ชีวิตของคุณ", "โลกใหม่ของคุณ"];

const WORLD_ACTIONS = [
  ["🏢", "สร้างธุรกิจ", "เปลี่ยนไอเดียธุรกิจให้เป็นระบบที่ใช้งานจริง"],
  ["🌱", "สร้างชีวิต", "สร้างเครื่องมือส่วนตัวที่ช่วยให้ชีวิตง่ายขึ้น"],
  ["🌌", "สร้างโลกใหม่", "สร้างระบบหลายส่วนที่เชื่อมต่อและเติบโตต่อได้"],
] as const;

export function Landing() {
  const setDraft = useBuilder((s) => s.setDraft);
  const [sandboxId, setSandboxId] = useState(EXAMPLES[0]?.id ?? "");
  const [typeIndex, setTypeIndex] = useState(0);
  useEffect(() => { const timer = window.setInterval(() => setTypeIndex((i) => (i + 1) % TYPEWORDS.length), 2600); return () => window.clearInterval(timer); }, []);
  const sandbox = EXAMPLES.find((x) => x.id === sandboxId) ?? EXAMPLES[0];


  return (
    <div className="boss-app-bg relative flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-none">
      <div className="boss-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="boss-orb left-[8%] top-8 size-48 bg-violet-500" aria-hidden="true" />
      <div className="boss-orb right-[10%] top-24 size-56 bg-fuchsia-500" aria-hidden="true" />

      <div className="boss-ai-hero relative z-10 mx-auto flex w-full max-w-5xl flex-col justify-center px-5 pb-8 pt-8 md:min-h-[calc(100dvh-16rem)]">
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="boss-typography-hero mb-6 w-full max-w-4xl rounded-2xl px-6 py-10 sm:px-10 sm:py-14" aria-label="Panupan × Sliola • BOSSNU UNIFIED">
            <div className="boss-typography-kicker">BOSSNU UNIFIED</div>
            <div className="boss-typography-title">Panupan</div>
            <div className="boss-typography-subtitle">× Sliola</div>
          </div>

          <GuPanuMark className="mb-4 size-10" />
          <div className="mb-3 inline-flex items-center rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-[11px] font-medium tracking-[0.12em] text-zinc-400 backdrop-blur-md">
            BOSSNU.SILELO · PUTER
          </div>
          <h1 className="max-w-4xl font-display text-3xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl">
            บอกความฝันมา เดี๋ยวบอสสร้างโลกให้ <span className="boss-typewriter">{TYPEWORDS[typeIndex]}</span>
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-zinc-400 sm:text-base">
            ONE SYSTEM • ENDLESS POSSIBILITIES
          </p>
        </div>

        <div className="boss-shimmer-border boss-hero-glow prompt-command-glow mx-auto w-full max-w-3xl rounded-2xl bg-zinc-950/75 p-px backdrop-blur-2xl">
          <div className="rounded-2xl bg-zinc-950/90">
            <PromptBox large />
          </div>
        </div>

        <section className="mx-auto mt-7 w-full max-w-4xl" aria-labelledby="world-actions-title">
          <div className="mb-4 text-center">
            <h2 id="world-actions-title" className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-300">เลือกโลกที่อยากสร้าง</h2>
            <p className="mt-1 text-xs text-zinc-500">ไม่ต้องรู้ภาษาโปรแกรม บอสจะถามสิ่งสำคัญก่อนเริ่มลงมือ</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {WORLD_ACTIONS.map(([icon, title, detail]) => (
              <button key={title} type="button"
                onClick={() => {
                  const prompt = title === "สร้างธุรกิจ" ? "ฉันอยากสร้างธุรกิจ ช่วยถามฉัน 3 คำถามสำคัญก่อน แล้วออกแบบระบบที่ต้องใช้ให้ครบ" : title === "สร้างชีวิต" ? "ฉันอยากสร้างเครื่องมือสำหรับชีวิต ช่วยถามฉัน 3 คำถามสำคัญก่อน แล้วออกแบบระบบที่ต้องใช้ให้ครบ" : "ฉันอยากสร้างโลกใหม่ ช่วยถามฉัน 3 คำถามสำคัญก่อน แล้วแตกเป็นระบบที่เชื่อมต่อกันให้ครบ";
                  const plan = buildWorldPlan(prompt);
                  setDraft(prompt + "\n\n[World surfaces: " + plan.surfaces.join(", ") + "]");
                }}
                className="group min-h-36 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5 text-left backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-violet-400/40 hover:bg-white/[0.07] active:scale-[0.99]">
                <div className="text-3xl">{icon}</div>
                <div className="mt-5 text-lg font-semibold text-white">{title}</div>
                <div className="mt-1 text-xs leading-5 text-zinc-500 group-hover:text-zinc-400">{detail}</div>
              </button>
            ))}
          </div>
        </section>

        {sandbox ? (
          <section className="mx-auto mt-7 w-full max-w-5xl" aria-labelledby="sandbox-title">
            <div className="mb-3 flex items-end justify-between gap-3"><div><h2 id="sandbox-title" className="text-sm font-semibold text-zinc-100">Live Preview Sandbox</h2><p className="mt-1 text-xs text-zinc-500">เลือกตัวอย่าง แล้วดูหน้าเว็บจริงก่อนเริ่มแก้ด้วย Boss</p></div><button type="button" onClick={() => setDraft(sandbox.prompt)} className="shrink-0 rounded-full bg-violet-500 px-3 py-1.5 text-xs font-semibold text-white">ใช้ Prompt นี้</button></div>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
              <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white shadow-2xl">
                <div className="flex h-8 items-center gap-1 border-b border-zinc-200 bg-zinc-50 px-3"><i className="size-2 rounded-full bg-zinc-300" /><i className="size-2 rounded-full bg-zinc-300" /><i className="size-2 rounded-full bg-zinc-300" /><span className="ml-2 truncate text-[9px] text-zinc-400">{sandbox.name} · Live Preview</span></div>
                <iframe title={sandbox.name + " live preview"} srcDoc={sandbox.html} sandbox="" className="h-[360px] w-full border-0 bg-white" />
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-1">{EXAMPLES.slice(0, 6).map((ex) => <button key={ex.id} type="button" onClick={() => setSandboxId(ex.id)} className={sandbox.id === ex.id ? "rounded-xl border border-violet-400/40 bg-violet-400/[0.08] p-3 text-left" : "rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 text-left"}><div className="text-sm font-medium text-zinc-100">{ex.name}</div><div className="mt-1 text-[11px] text-zinc-500">{ex.category}</div></button>)}</div>
            </div>
          </section>
        ) : null}

        <div className="mx-auto mt-6 grid w-full max-w-3xl grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            ["01", "Describe", "บอกเป้าหมายของแอป"],
            ["02", "Build", "สร้างและพรีวิวทันที"],
            ["03", "Publish", "เผยแพร่ผ่าน Puter .site"],
          ].map(([n, title, detail]) => (
            <div key={n} className="boss-bento rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-left backdrop-blur-md">
              <div className="text-[10px] font-mono text-violet-400">{n}</div>
              <div className="mt-1 text-sm font-medium text-zinc-200">{title}</div>
              <div className="mt-0.5 text-xs text-zinc-500">{detail}</div>
            </div>
          ))}
        </div>

        <section className="boss-ecosystem mx-auto mt-8 w-full max-w-3xl" aria-label="Technology ecosystem">
          <div className="boss-ecosystem-label">BOSSNU UNIFIED · WORLD OS</div>
          <div className="boss-ecosystem-track">
            {["PUTER OS", "GITHUB MEMORY", "VERCEL PORTAL", "NETLIFY PORTAL", "SILELO CORE"].map((brand) => (
              <span key={brand} className="boss-brand-pill">
                <span className="boss-brand-dot" aria-hidden="true" />
                {brand}
              </span>
            ))}
          </div>
        </section>

      </div>
      <FeaturedFeed />
    </div>
  );
}
