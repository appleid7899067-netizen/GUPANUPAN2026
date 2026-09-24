import { useEffect, useState } from "react";
import { GuPanuMark } from "./logo";
import { PromptBox } from "./prompt-box";
import { FeaturedFeed } from "./featured-feed";
import { pickStarters, STARTERS } from "@/lib/builder/starters";
import { useBuilder } from "@/lib/builder/store";

const NEXT_ACTIONS = [
  ["สร้างแอปต่อ", "สร้างแอปจากไอเดียใหม่", "สร้างแอปใหม่ให้ฉัน"],
  ["แก้ไขแอป", "ปรับของที่มีอยู่", "แก้ไขแอปที่กำลังทำอยู่"],
  ["เพิ่มฟีเจอร์", "ต่อยอดความสามารถ", "เพิ่มฟีเจอร์ใหม่ให้แอปนี้"],
  ["เผยแพร่แอป", "นำขึ้นเว็บทันที", "เตรียมแอปนี้เพื่อเผยแพร่"],
] as const;

export function Landing() {
  const setDraft = useBuilder((s) => s.setDraft);
  const [starters, setStarters] = useState(() => STARTERS.slice(0, 6));

  useEffect(() => {
    setStarters(pickStarters(6));
  }, []);

  return (
    <div className="boss-app-bg relative flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-none">
      <div className="boss-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="boss-orb left-[8%] top-8 size-48 bg-violet-500" aria-hidden="true" />
      <div className="boss-orb right-[10%] top-24 size-56 bg-fuchsia-500" aria-hidden="true" />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col justify-center px-5 pb-8 pt-8 md:min-h-[calc(100dvh-16rem)]">
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
            Panupan สร้างให้ จากความคิดของคุณ
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-zinc-400 sm:text-base">
            ONE SYSTEM • ENDLESS POSSIBILITIES
          </p>
        </div>

        <div className="boss-shimmer-border boss-hero-glow mx-auto w-full max-w-3xl rounded-2xl bg-zinc-950/80 p-px backdrop-blur-xl">
          <div className="rounded-2xl bg-zinc-950/90">
            <PromptBox large />
          </div>
        </div>

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

        <p className="mt-6 text-center text-xs font-medium text-subtle">
          หรือเลือกไอเดียเริ่มต้น
        </p>
        <div className="chip-fade mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {starters.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setDraft(s.prompt)}
              className="shrink-0 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted hover:border-fg/20 hover:text-fg"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <FeaturedFeed />
    </div>
  );
}
