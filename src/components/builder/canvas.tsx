import { useBuilder } from "@/lib/builder/store";
import type { CanvasComponent } from "@/lib/builder/types";

export function Canvas() {
  const project = useBuilder((s) => s.projects.find((p) => p.id === s.activeId) ?? null);
  const pop = useBuilder((s) => s.popCanvasRoute);
  if (!project) return null;
  const stack = project.canvas?.stack ?? [{ id: "home" }];
  const page = project.canvas?.pages?.[stack[stack.length - 1].id];
  if (!page) return null;

  const theme = project.canvas?.theme ?? {};
  const bg = theme.background ?? "#fff";
  const fg = theme.text ?? "#111";
  const primary = theme.primary ?? "#6d5dfc";
  const accent = theme.accent ?? "#22c55e";
  const surface = theme.surface ?? `${fg}08`;
  const muted = theme.muted ?? `${fg}70`;

  return (
    <main className="flex h-full min-h-0 flex-col overflow-auto" style={{ background: bg, color: fg }}>
      <div
        className="sticky top-0 z-10 flex items-center gap-2 border-b px-4 py-3 backdrop-blur"
        style={{ borderColor: `${fg}15`, background: `${bg}cc` }}
      >
        {stack.length > 1 ? (
          <button
            type="button"
            onClick={() => pop(project.id)}
            className="rounded-lg px-3 py-1 text-sm"
            style={{ background: `${fg}0d` }}
          >
            ← กลับ
          </button>
        ) : null}
        <strong>{page.title}</strong>
        {project.canvas?.preloaded?.length ? (
          <span className="ml-auto text-[10px] opacity-50">
            preload: {project.canvas.preloaded.join(", ")}
          </span>
        ) : null}
      </div>
      <div className="mx-auto w-full max-w-5xl p-5">
        {page.components.map((component) => (
          <CanvasNode key={component.id} node={component} projectId={project.id} primary={primary} fg={fg} accent={accent} surface={surface} muted={muted} />
        ))}
      </div>
    </main>
  );
}

function CanvasNode(props: Parameters<typeof RenderCanvasNode>[0]) {
  const selectMode = useBuilder((s) => s.selectMode);
  const selectedId = useBuilder((s) => s.projects.find((p) => p.id === s.activeId)?.canvas?.selectedComponentId);
  const select = useBuilder((s) => s.selectCanvasComponent);
  if (!selectMode) return <RenderCanvasNode {...props} />;
  const selected = selectedId === props.node.id;
  return (
    <div
      onClick={(event) => {
        event.stopPropagation();
        select(props.projectId, props.node.id);
      }}
      className="relative rounded-xl"
      style={{
        outline: selected ? `2px solid ${props.primary}` : "2px solid transparent",
        outlineOffset: 3,
      }}
    >
      <RenderCanvasNode {...props} />
      {selected ? (
        <span className="pointer-events-none absolute right-2 top-2 rounded-md px-2 py-1 text-[10px] font-semibold text-white" style={{ background: props.primary }}>
          แก้ไข: {props.node.id}
        </span>
      ) : null}
    </div>
  );
}

function RenderCanvasNode({
  node,
  projectId,
  primary,
  fg,
  accent,
  surface,
  muted,
}: {
  node: CanvasComponent;
  projectId: string;
  primary: string;
  fg: string;
  accent: string;
  surface: string;
  muted: string;
}) {
  const push = useBuilder((s) => s.pushCanvasRoute);
  const props = node.props ?? {};
  const children = node.children ?? [];
  const text =
    typeof props.text === "string"
      ? props.text
      : typeof props.label === "string"
        ? props.label
        : node.type;

  if (node.type === "hero") {
    return (
      <section className="mb-6 overflow-hidden rounded-3xl p-7 shadow-sm" style={{ background: surface, border: `1px solid ${fg}12` }}>
        <span className="mb-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold" style={{ background: `${primary}18`, color: primary }}>
          {String(props.badge ?? "Featured")}
        </span>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">{text}</h1>
        {typeof props.subtitle === "string" ? <p className="mt-3 max-w-2xl leading-7" style={{ color: muted }}>{props.subtitle}</p> : null}
        {typeof props.cta === "string" ? <button type="button" className="mt-5 rounded-xl px-5 py-3 text-sm font-semibold text-white" style={{ background: primary }}>{props.cta}</button> : null}
      </section>
    );
  }

  if (node.type === "badge") {
    return <span className="mr-2 mb-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold" style={{ background: `${accent}18`, color: accent }}>{text}</span>;
  }

  if (node.type === "metric") {
    return (
      <section className="mb-3 inline-flex min-w-40 flex-col rounded-2xl p-4" style={{ background: surface, border: `1px solid ${fg}12` }}>
        <span className="text-xs" style={{ color: muted }}>{String(props.label ?? "Metric")}</span>
        <strong className="mt-1 text-2xl">{String(props.value ?? text)}</strong>
        {typeof props.delta === "string" ? <small className="mt-1 font-medium" style={{ color: accent }}>{props.delta}</small> : null}
      </section>
    );
  }

  if (node.type === "divider") {
    return <div className="my-5 h-px w-full" style={{ background: `${fg}12` }} />;
  }

  if (node.type === "image") {
    const src = typeof props.src === "string" ? props.src : "";
    return (
      <div className="mb-4 overflow-hidden rounded-2xl" style={{ background: surface, aspectRatio: String(props.aspectRatio ?? "16/9") }}>
        {src ? <img src={src} alt={String(props.alt ?? "")} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm" style={{ color: muted }}>Visual placeholder</div>}
      </div>
    );
  }

  if (node.type === "tabs") {
    return (
      <div className="mb-4 flex flex-wrap gap-2">
        {children.map((child, index) => (
          <button key={child.id} type="button" className="rounded-full px-4 py-2 text-sm font-medium" style={{ background: index === 0 ? primary : surface, color: index === 0 ? "#fff" : fg }}>
            {typeof child.props?.text === "string" ? child.props.text : child.type}
          </button>
        ))}
      </div>
    );
  }

  if (node.type === "avatar") {
    const initials = String(props.initials ?? text).slice(0, 2).toUpperCase();
    return <div className="mb-3 flex size-10 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: primary }}>{initials}</div>;
  }

  if (node.type === "banner") {
    return (
      <div
        className="mb-4 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg"
        style={{ background: primary }}
      >
        {text}
      </div>
    );
  }

  if (node.type === "button" || node.type === "nav") {
    const route = typeof props.route === "string" ? props.route : null;
    const isPrimary = props.variant === "primary" || props.pulse;
    return (
      <button
        type="button"
        onClick={() => (route ? push(projectId, route) : undefined)}
        className="m-1 rounded-xl px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        style={{
          background: isPrimary ? primary : fg,
          boxShadow: props.pulse ? `0 0 0 3px ${primary}44` : undefined,
        }}
      >
        {text}
      </button>
    );
  }

  if (node.type === "input") {
    return (
      <input
        placeholder={String(props.placeholder ?? "")}
        className="m-1 w-full max-w-md rounded-xl border px-3 py-2"
        style={{ borderColor: `${fg}22`, background: "transparent", color: fg }}
      />
    );
  }

  if (node.type === "heading") {
    return <h1 className="mb-4 text-3xl font-bold">{text}</h1>;
  }

  if (node.type === "text") {
    return <p className="mb-3 leading-7 opacity-90">{text}</p>;
  }

  if (node.type === "card") {
    return (
      <section className="mb-4 rounded-2xl border p-5" style={{ borderColor: `${fg}15` }}>
        {text}
        {children.map((child) => (
          <CanvasNode key={child.id} node={child} projectId={projectId} primary={primary} fg={fg} />
        ))}
      </section>
    );
  }

  if (node.type === "list") {
    return (
      <ul className="mb-4 list-disc pl-6">
        {children.map((child) => (
          <li key={child.id}>
            <CanvasNode node={child} projectId={projectId} primary={primary} fg={fg} />
          </li>
        ))}
      </ul>
    );
  }

  if (node.type === "form") {
    return (
      <form
        className="mb-4 space-y-2 rounded-2xl border p-5"
        style={{ borderColor: `${fg}15` }}
        onSubmit={(e) => e.preventDefault()}
      >
        {children.map((child) => (
          <CanvasNode key={child.id} node={child} projectId={projectId} primary={primary} fg={fg} />
        ))}
      </form>
    );
  }

  return (
    <div className="mb-3">
      {text}
      {children.map((child) => (
        <CanvasNode key={child.id} node={child} projectId={projectId} primary={primary} fg={fg} />
      ))}
    </div>
  );
}
