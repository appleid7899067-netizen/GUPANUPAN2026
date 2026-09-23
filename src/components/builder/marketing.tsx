import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ForgeWordmark } from "./logo";
import { Button } from "@/components/ui/button";

export function Marketing({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
        <Link to="/" aria-label="Forge home">
          <ForgeWordmark />
        </Link>
        <Button asChild size="sm">
          <Link to="/">Start building</Link>
        </Button>
      </header>
      <main className="mx-auto max-w-3xl px-5 pb-20 pt-10">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-subtle">{eyebrow}</p>
        <h1 className="mt-3 font-display text-4xl font-medium tracking-tight">{title}</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">{lead}</p>
        <div className="mt-12 space-y-12">{children}</div>
      </main>
    </div>
  );
}

export function FeatureGrid({
  heading,
  items,
}: {
  heading: string;
  items: { title: string; body: string }[];
}) {
  return (
    <section>
      <h2 className="mb-5 text-xl font-semibold tracking-tight">{heading}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <article key={item.title} className="rounded-xl bg-surface p-4 shadow-border">
            <h3 className="text-sm font-semibold">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
