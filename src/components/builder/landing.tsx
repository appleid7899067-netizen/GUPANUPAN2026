import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ForgeMark } from "./logo";
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
          <ForgeMark className="mb-5 size-12" />
          <h1 className="font-display text-3xl font-medium tracking-tight text-fg sm:text-4xl">
            Build apps and websites with AI
          </h1>
          <p className="mt-3 max-w-md text-sm text-muted sm:text-base">
            Describe your idea and Forge will build it — no code required.
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
              className="shrink-0 rounded-full bg-surface px-3 py-1.5 text-sm text-fg shadow-border transition-[box-shadow] hover:shadow-border-hover"
            >
              {s.label}
            </button>
          ))}
        </div>
        <footer className="mt-8 text-center text-xs text-subtle">
          <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1">
            <Link to="/features" className="hover:text-fg">
              Features
            </Link>
            <Link to="/ideas" className="hover:text-fg">
              What to build
            </Link>
            <Link to="/guides" className="hover:text-fg">
              Guides
            </Link>
          </nav>
        </footer>
      </div>
      <FeaturedFeed />
    </div>
  );
}
