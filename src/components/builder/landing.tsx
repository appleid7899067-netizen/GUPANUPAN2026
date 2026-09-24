import { useEffect, useState } from "react";
import { GuPanuMark } from "./logo";
import { PromptBox } from "./prompt-box";
import { FeaturedFeed } from "./featured-feed";
import { pickStarters, STARTERS } from "@/lib/builder/starters";
import { useBuilder } from "@/lib/builder/store";

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
      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col justify-center px-5 pb-8 pt-12 md:min-h-[calc(100dvh-16rem)]">
        <div className="mb-8 flex flex-col items-center text-center">
          <GuPanuMark className="mb-5 size-12" />
          <div className="mb-4 inline-flex items-center rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400 backdrop-blur-md">GuPanu AI Builder · Puter</div>
          <h1 className="max-w-4xl font-display text-3xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl">
            สร้างแอปและเว็บไซต์ด้วย AI
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-zinc-400 sm:text-base">
            อธิบายไอเดีย แล้ว GuPanu จะสร้างให้ — ล็อกอิน Puter ใช้โมเดลฟรี
          </p>
        </div>
        <div className="boss-shimmer-border boss-hero-glow mx-auto w-full max-w-3xl rounded-2xl bg-zinc-950/80 p-px backdrop-blur-xl">
          <div className="rounded-2xl bg-zinc-950/90">
            <PromptBox large />
          </div>
        </div>
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
        <p className="mt-6 text-center text-xs font-medium uppercase tracking-[0.16em] text-subtle">
          Looking for an idea?
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
