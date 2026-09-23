import { EXAMPLES } from "@/lib/builder/templates";
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
            className="group overflow-hidden rounded-xl bg-surface text-left shadow-border transition-[box-shadow,transform] duration-[var(--motion-fast)] hover:shadow-border-hover"
          >
            <div
              className="relative h-36 overflow-hidden"
              style={{ background: ex.accent, color: ex.ink }}
            >
              <MiniPreview id={ex.id} />
            </div>
            <div className="px-3.5 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold">{ex.name}</h3>
                <span className="text-[11px] uppercase tracking-wider text-subtle">{ex.category}</span>
              </div>
              <p className="mt-1 text-sm text-muted">{ex.description}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function MiniPreview({ id }: { id: string }) {
  if (id === "northstar") {
    return (
      <div className="absolute inset-4 grid grid-cols-2 gap-1.5 opacity-90">
        <div className="rounded-sm bg-black/15" />
        <div className="rounded-sm bg-black/10" />
        <div className="col-span-2 h-8 rounded-sm bg-black/20" />
      </div>
    );
  }
  if (id === "pulse") {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="size-20 rounded-full border border-white/25" />
      </div>
    );
  }
  if (id === "ledger") {
    return (
      <div className="absolute inset-5 space-y-2">
        <div className="h-3 w-24 rounded-full bg-black/20" />
        <div className="h-8 rounded-md bg-white/50" />
        <div className="h-8 rounded-md bg-white/40" />
      </div>
    );
  }
  if (id === "harvest") {
    return (
      <div className="absolute inset-4 grid grid-cols-3 gap-1.5">
        <div className="rounded-sm bg-white/40" />
        <div className="rounded-sm bg-white/30" />
        <div className="rounded-sm bg-white/50" />
      </div>
    );
  }
  if (id === "matchlight") {
    return (
      <div className="absolute inset-6 grid grid-cols-4 gap-1.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-sm bg-white/15" />
        ))}
      </div>
    );
  }
  return (
    <div className="absolute inset-5 space-y-2">
      <div className="h-3 w-20 rounded-full bg-black/15" />
      <div className="h-6 w-3/4 rounded-sm bg-black/10" />
      <div className="mt-4 flex gap-2">
        <div className="h-6 w-16 rounded-full bg-black/20" />
        <div className="h-6 w-16 rounded-full bg-white/50" />
      </div>
    </div>
  );
}
