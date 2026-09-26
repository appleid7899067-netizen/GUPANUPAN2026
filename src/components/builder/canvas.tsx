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
  const primary = theme.primary ?? "#000";

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
          <CanvasNode key={component.id} node={component} projectId={project.id} primary={primary} fg={fg} />
        ))}
      </div>
    </main>
  );
}

function CanvasNode({
  node,
  projectId,
  primary,
  fg,
}: {
  node: CanvasComponent;
  projectId: string;
  primary: string;
  fg: string;
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
