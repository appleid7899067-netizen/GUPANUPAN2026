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
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-none">
      <div className="mx-auto flex w-full max-w-xl flex-col justify-center px-5 pb-8 pt-12 md:min-h-[calc(100dvh-16rem)]">
        <div className="mb-6 flex flex-col items-center text-center">
          <GuPanuMark className="mb-5 size-12" />
          <h1 className="font-display text-3xl font-medium tracking-tight text-fg sm:text-4xl">
            สร้างแอปและเว็บไซต์ด้วย AI
          </h1>
          <p className="mt-3 max-w-md text-sm text-muted sm:text-base">
            อธิบายไอเดีย แล้ว GuPanu จะสร้างให้ — ล็อกอิน Puter ใช้โมเดลฟรี
          </p>
        </div>
        <PromptBox large />
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
