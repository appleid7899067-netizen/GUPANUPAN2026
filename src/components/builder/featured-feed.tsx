import { EXAMPLES, type ExampleApp } from "@/lib/builder/templates";
import { openExample } from "@/lib/builder/send";

export function FeaturedFeed() {
  return (
    <section className="mx-auto w-full max-w-5xl px-5 pb-16 pt-10" aria-label="Example apps">
      <h2 className="mb-5 text-xs font-medium uppercase tracking-[0.18em] text-subtle">
        Example apps
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {EXAMPLES.map((ex) => (
          <button
            key={ex.id}
            type="button"
            onClick={() => openExample(ex)}
            className="group overflow-hidden rounded-2xl bg-surface text-left shadow-border transition-[box-shadow,transform] duration-[var(--motion-fast)] hover:-translate-y-0.5 hover:shadow-border-hover"
          >
            <div
              className="relative h-44 overflow-hidden"
              style={{ background: ex.accent, color: ex.ink }}
            >
              <MiniPreview example={ex} />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/10 opacity-70" />
            </div>
            <div className="min-h-[92px] px-3.5 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-fg">{ex.name}</h3>
                <span className="text-[11px] uppercase tracking-wider text-subtle">{ex.category}</span>
              </div>
              <p className="mt-1 text-sm leading-5 text-muted">{ex.description}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function MiniPreview({ example }: { example: ExampleApp }) {
  const { id, category } = example;

  if (id === "northstar") {
    return (
      <div className="absolute inset-4">
        <div className="mb-3 flex items-center justify-between text-[7px] uppercase tracking-[0.18em] opacity-60">
          <span>Northstar</span><span>Work · About · Contact</span>
        </div>
        <div className="mb-3 h-8 w-4/5 rounded-md bg-black/10" />
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 rounded-md bg-black/10" />
          ))}
        </div>
      </div>
    );
  }

  if (id === "pulse") {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="absolute top-5 text-[8px] uppercase tracking-[0.28em] opacity-60">Pulse · Focus</div>
        <div className="size-24 rounded-full border border-white/25 p-2">
          <div className="flex h-full w-full items-center justify-center rounded-full border border-white/10">
            <span className="font-mono text-lg tabular-nums opacity-80">25:00</span>
          </div>
        </div>
        <div className="mt-3 flex gap-1.5">
          <span className="h-5 w-14 rounded-full bg-white/70" />
          <span className="h-5 w-12 rounded-full border border-white/20" />
        </div>
      </div>
    );
  }

  if (id === "ledger") {
    return (
      <div className="absolute inset-4">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <div className="h-2 w-16 rounded-full bg-black/20" />
            <div className="mt-1 h-7 w-28 rounded-md bg-black/10" />
          </div>
          <div className="h-4 w-12 rounded-full bg-black/10" />
        </div>
        <div className="space-y-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex h-8 items-center justify-between rounded-md bg-white/45 px-2">
              <span className="h-2 w-20 rounded-full bg-black/10" />
              <span className="h-2 w-10 rounded-full bg-black/15" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (id === "harvest") {
    return (
      <div className="absolute inset-4">
        <div className="mb-3 flex items-center justify-between">
          <div><div className="h-2 w-16 rounded-full bg-black/15" /><div className="mt-1 h-6 w-24 rounded-md bg-black/10" /></div>
          <div className="h-6 w-24 rounded-full bg-white/45" />
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-md bg-white/35">
              <div className="h-12 bg-white/25" />
              <div className="p-1.5"><div className="h-1.5 w-3/4 rounded-full bg-black/15" /><div className="mt-1 h-1.5 w-1/2 rounded-full bg-black/10" /></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (id === "matchlight") {
    return (
      <div className="absolute inset-5 flex flex-col items-center">
        <div className="mb-3 text-[8px] uppercase tracking-[0.2em] opacity-60">Matchlight · Memory</div>
        <div className="grid w-4/5 grid-cols-4 gap-1.5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className={i === 2 || i === 7 ? "aspect-square rounded-md bg-white/60" : "aspect-square rounded-md bg-white/12"} />
          ))}
        </div>
      </div>
    );
  }

  if (id === "harbor") {
    return (
      <div className="absolute inset-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="h-3 w-16 rounded-full bg-black/20" />
          <div className="flex gap-1"><span className="h-2 w-10 rounded-full bg-black/10" /><span className="h-2 w-10 rounded-full bg-black/10" /></div>
        </div>
        <div className="h-8 w-4/5 rounded-md bg-black/12" />
        <div className="mt-2 h-2 w-3/5 rounded-full bg-black/10" />
        <div className="mt-4 grid grid-cols-3 gap-1.5">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 rounded-md bg-white/45" />)}
        </div>
      </div>
    );
  }

  return <CatalogPreview category={category} />;
}

function CatalogPreview({ category }: { category: string }) {
  const base = "absolute inset-4";
  const pill = "rounded-full bg-black/12";
  const line = "rounded-full bg-black/12";

  if (["AI Apps", "Developer Tools", "Internal Tools"].includes(category)) {
    return (
      <div className={base}>
        <div className="mb-3 flex items-center justify-between">
          <div className="h-2 w-20 rounded-full bg-black/20" />
          <div className="flex gap-1.5"><span className="size-2 rounded-full bg-black/15" /><span className="size-2 rounded-full bg-black/15" /><span className="size-2 rounded-full bg-black/15" /></div>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          <div className="col-span-1 space-y-1.5 rounded-lg bg-white/35 p-2">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className={"h-2 " + line} />)}
          </div>
          <div className="col-span-3 rounded-lg bg-white/45 p-2.5">
            <div className="mb-2 h-5 w-2/3 rounded-md bg-black/10" />
            <div className="space-y-1.5">{Array.from({ length: 4 }).map((_, i) => <div key={i} className={"h-2 " + (i === 2 ? "w-3/4 " : "w-full ") + line} />)}</div>
            <div className="mt-4 h-8 rounded-md bg-black/10" />
          </div>
        </div>
      </div>
    );
  }

  if (["Finance", "Business"].includes(category)) {
    return (
      <div className={base}>
        <div className="mb-3 flex items-end justify-between"><div><div className="h-2 w-16 rounded-full bg-black/15" /><div className="mt-1 h-6 w-24 rounded-md bg-black/15" /></div><div className={"h-6 w-20 " + pill} /></div>
        <div className="grid grid-cols-3 gap-1.5">
          {[0,1,2].map((i)=><div key={i} className="h-14 rounded-lg bg-white/45 p-2"><div className={"h-2 w-12 "+line}/><div className="mt-3 h-4 w-16 rounded-md bg-black/10"/></div>)}
        </div>
        <div className="mt-2 space-y-1.5">{[0,1,2].map(i=><div key={i} className="flex h-7 items-center justify-between rounded-md bg-white/35 px-2"><div className="h-2 w-24 rounded-full bg-black/10"/><div className="h-2 w-10 rounded-full bg-black/15"/></div>)}</div>
      </div>
    );
  }

  if (["Ecommerce", "Food", "Real Estate", "Travel", "Portfolio", "Agency", "Content"].includes(category)) {
    return (
      <div className={base}>
        <div className="mb-3 flex items-center justify-between"><div className="h-2 w-24 rounded-full bg-black/18"/><div className="h-5 w-20 rounded-full bg-white/45"/></div>
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 6 }).map((_, i)=><div key={i} className="overflow-hidden rounded-lg bg-white/35"><div className="h-12 bg-black/8"/><div className="p-1.5"><div className="h-1.5 w-3/4 rounded-full bg-black/12"/><div className="mt-1 h-1.5 w-1/2 rounded-full bg-black/10"/></div></div>)}
        </div>
      </div>
    );
  }

  if (["Productivity", "Community"].includes(category)) {
    return (
      <div className={base}>
        <div className="mb-3 h-6 w-32 rounded-md bg-black/12"/>
        <div className="grid grid-cols-3 gap-1.5">
          {["Todo","Doing","Done"].map((label,i)=><div key={label} className="rounded-lg bg-white/35 p-1.5"><div className="mb-2 h-1.5 w-10 rounded-full bg-black/15"/>{Array.from({length:i===1?3:2}).map((_,j)=><div key={j} className="mb-1.5 h-9 rounded-md bg-white/45"/> )}</div>)}
        </div>
      </div>
    );
  }

  if (["Education", "Fitness"].includes(category)) {
    return (
      <div className={base}>
        <div className="mb-3 h-7 w-2/3 rounded-md bg-black/12"/>
        <div className="grid grid-cols-2 gap-1.5">
          {[0,1,2,3].map(i=><div key={i} className="rounded-lg bg-white/40 p-2"><div className="h-10 rounded-md bg-black/8"/><div className="mt-2 h-2 w-3/4 rounded-full bg-black/12"/><div className="mt-2 h-1.5 rounded-full bg-black/10"/><div className="mt-1 h-1.5 w-2/3 rounded-full bg-black/10"/></div>)}
        </div>
      </div>
    );
  }

  if (["Services", "Websites"].includes(category)) {
    return (
      <div className={base}>
        <div className="mb-3 flex gap-1.5"><div className="h-6 flex-1 rounded-full bg-white/45"/><div className="h-6 w-20 rounded-full bg-black/10"/></div>
        <div className="grid grid-cols-2 gap-1.5">
          {Array.from({length:4}).map((_,i)=><div key={i} className="rounded-lg bg-white/40 p-2"><div className="h-7 rounded-md bg-black/8"/><div className="mt-2 h-2 w-2/3 rounded-full bg-black/12"/><div className="mt-1 h-1.5 w-1/2 rounded-full bg-black/10"/></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className={base}>
      <div className="mb-3 h-7 w-2/3 rounded-md bg-black/12" />
      <div className="grid grid-cols-3 gap-1.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 rounded-lg bg-white/40 p-2">
            <div className="h-7 rounded-md bg-black/8" />
            <div className="mt-2 h-1.5 w-3/4 rounded-full bg-black/12" />
          </div>
        ))}
      </div>
    </div>
  );
}
