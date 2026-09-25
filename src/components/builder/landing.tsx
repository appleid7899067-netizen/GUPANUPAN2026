import { useEffect, useState } from "react";
import { GuPanuMark } from "./logo";
import { PromptBox } from "./prompt-box";
import { FeaturedFeed } from "./featured-feed";
import { EXAMPLES } from "@/lib/builder/templates";
import { pickStarters, STARTERS } from "@/lib/builder/starters";
import { useBuilder } from "@/lib/builder/store";

const TYPEWORDS = ["ความคิดของคุณ", "SaaS Dashboard", "AI Tool", "Mobile App", "Landing Page"];\n\nconst NEXT_ACTIONS = [
  ["สร้างแอปต่อ", "สร้างแอปจากไอเดียใหม่", "สร้างแอปใหม่ให้ฉัน"],
  ["แก้ไขแอป", "ปรับของที่มีอยู่", "แก้ไขแอปที่กำลังทำอยู่"],
  ["เพิ่มฟีเจอร์", "ต่อยอดความสามารถ", "เพิ่มฟีเจอร์ใหม่ให้แอปนี้"],
  ["เผยแพร่แอป", "นำขึ้นเว็บทันที", "เตรียมแอปนี้เพื่อเผยแพร่"],
] as const;

export function Landing() {
  const setDraft = useBuilder((s) => s.setDraft);
  const [starters, setStarters] = useState(() => STARTERS.slice(0, 6));
  const [sandboxId, setSandboxId] = useState(EXAMPLES[0]?.id ?? "");\n  const [typeIndex, setTypeIndex] = useState(0);\n  useEffect(() => { const timer = window.setInterval(() => setTypeIndex((i) => (i + 1) % TYPEWORDS.length), 2600); return () => window.clearInterval(timer); }, []);
  const sandbox = EXAMPLES.find((x) => x.id === sandboxId) ?? EXAMPLES[0];

  useEffect(() => {
    setStarters(pickStarters(6));
  }, []);

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
            Panupan สร้างให้ จาก <span className="boss-typewriter">{TYPEWORDS[typeIndex]}</span>
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

        <section className="mx-auto mt-6 w-full max-w-3xl" aria-labelledby="quick-prompts-title">
          <div className="mb-2 flex items-center justify-between gap-3"><div><h2 id="quick-prompts-title" className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-300">ลองเริ่มจากไอเดีย</h2><p className="mt-1 text-xs text-zinc-500">กดแล้วใส่ Prompt ให้พร้อมใช้งานทันที</p></div><span className="text-[10px] text-zinc-600">QUICK PROMPTS</span></div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">{starters.slice(0, 6).map((s) => <button key={s.label} type="button" onClick={() => setDraft(s.prompt)} className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-xs text-zinc-300 hover:border-violet-400/30 hover:text-white">{s.label}</button>)}</div>
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

        <section className="mx-auto mt-7 w-full max-w-3xl" aria-labelledby="next-action-title">
          <div className="mb-3 text-center">
            <h2 id="next-action-title" className="text-sm font-medium text-zinc-200">
              แล้วอยากให้บอสทำอะไรต่อ?
            </h2>
            <p className="mt-1 text-xs text-zinc-500">เลือกได้เลย หรือพิมพ์สิ่งที่ต้องการในช่องด้านบน</p>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {NEXT_ACTIONS.map(([title, detail, prompt]) => (
              <button
                key={title}
                type="button"
                onClick={() => setDraft(prompt)}
                className="boss-bento group rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-3 text-left backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-400/30 hover:bg-white/[0.045] active:scale-[0.98]"
              >
                <div className="text-sm font-medium text-zinc-100">{title}</div>
                <div className="mt-1 text-[11px] leading-4 text-zinc-500 transition-colors group-hover:text-zinc-400">{detail}</div>
              </button>
            ))}
          </div>
        </section>

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
          <div className="boss-ecosystem-label">TECHNOLOGY ECOSYSTEM</div>
          <div className="boss-ecosystem-track">
            {["PUTER", "GITHUB", "VERCEL", "NETLIFY", "BOLT.NEW"].map((brand) => (
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
