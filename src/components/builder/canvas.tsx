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
  return (
    <main className="flex h-full min-h-0 flex-col overflow-auto" style={{ background: theme.background ?? "#fff", color: theme.text ?? "#111" }}>
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-black/10 bg-white/80 px-4 py-3 backdrop-blur">
        {stack.length > 1 ? <button onClick={() => pop(project.id)} className="rounded-lg px-3 py-1 text-sm hover:bg-black/5">← กลับ</button> : null}
        <strong>{page.title}</strong>
      </div>
      <div className="mx-auto w-full max-w-5xl p-5">
        {page.components.map((component) => <CanvasNode key={component.id} node={component} projectId={project.id} />)}
      </div>
    </main>
  );
}

function CanvasNode({ node, projectId }: { node: CanvasComponent; projectId: string }) {
  const push = useBuilder((s) => s.pushCanvasRoute);
  const props = node.props ?? {};
  const children = node.children ?? [];
  const text = typeof props.text === "string" ? props.text : typeof props.label === "string" ? props.label : node.type;

  if (node.type === "button" || node.type === "nav") {
    const route = typeof props.route === "string" ? props.route : null;
    return <button onClick={() => route ? push(projectId, route) : undefined} className="m-1 rounded-xl bg-black px-4 py-2 text-white">{text}</button>;
  }
  if (node.type === "input") return <input placeholder={String(props.placeholder ?? "")} className="m-1 rounded-xl border border-black/15 px-3 py-2" />;
  if (node.type === "heading") return <h1 className="mb-4 text-3xl font-bold">{text}</h1>;
  if (node.type === "text") return <p className="mb-3 leading-7">{text}</p>;
  if (node.type === "card") return <section className="mb-4 rounded-2xl border border-black/10 p-5">{text}{children.length ? children.map((child) => <CanvasNode key={child.id} node={child} projectId={projectId} />) : null}</section>;
  if (node.type === "list") return <ul className="mb-4 list-disc pl-6">{children.map((child) => <li key={child.id}><CanvasNode node={child} projectId={projectId} /></li>)}</ul>;
  return <div className="mb-3">{text}{children.map((child) => <CanvasNode key={child.id} node={child} projectId={projectId} />)}</div>;
}
