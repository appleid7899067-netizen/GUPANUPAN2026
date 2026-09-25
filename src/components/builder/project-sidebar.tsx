import { Plus, Sparkles, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBuilder } from "@/lib/builder/store";
import { cn, formatRelativeTime } from "@/lib/utils";

export function ProjectSidebar() {
  const open = useBuilder((s) => s.sidebarOpen);
  const setOpen = useBuilder((s) => s.setSidebarOpen);
  const projects = useBuilder((s) => s.projects);
  const activeId = useBuilder((s) => s.activeId);
  const setActive = useBuilder((s) => s.setActive);
  const newProject = useBuilder((s) => s.newProject);
  const deleteProject = useBuilder((s) => s.deleteProject);
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => p.title.toLowerCase().includes(q));
  }, [projects, query]);

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Close projects"
          className="fixed inset-0 z-40 bg-fg/30"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <nav
        id="projects"
        aria-label="Projects"
        aria-hidden={!open}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(20rem,88vw)] flex-col bg-surface shadow-border transition-transform duration-[var(--motion-fast)] ease-[var(--ease-out)]",
          open ? "translate-x-0" : "pointer-events-none -translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-sm font-semibold">Projects</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              newProject();
              setOpen(false);
            }}
          >
            <Plus className="size-3.5" /> New
          </Button>
        </div>
        <div className="px-3 pb-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects..."
            aria-label="Search projects"
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          {filtered.length === 0 ? (
            <div className="mx-3 my-4 rounded-2xl border border-dashed border-border p-5 text-center"><div className="mx-auto mb-3 flex size-9 items-center justify-center rounded-xl bg-muted-fill"><Sparkles className="size-4 text-accent" /></div><p className="text-sm font-medium text-fg">สร้างโปรเจกต์แรกของคุณ</p><p className="mt-1 text-xs leading-5 text-muted">เริ่มจากไอเดียสั้น ๆ แล้วให้ Boss สร้างโครงแอปให้</p><Button className="mt-3 w-full" size="sm" onClick={() => { newProject(); setOpen(false); }}><Plus className="size-3.5" /> สร้างโครงการแรก</Button></div>
          ) : (
            <ul className="space-y-0.5">
              {filtered.map((p) => (
                <li key={p.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => setActive(p.id)}
                    className={cn(
                      "w-full rounded-md px-3 py-2.5 text-left",
                      p.id === activeId ? "bg-muted-fill" : "hover:bg-muted-fill/70",
                    )}
                  >
                    <div className="truncate text-sm font-medium">{p.title}</div>
                    <div className="text-xs text-subtle">{formatRelativeTime(p.updatedAt)}</div>
                  </button>
                  <button
                    type="button"
                    aria-label={`ลบ ${p.title}`} title="ลบโปรเจกต์"
                    className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-sm text-muted/70 transition-colors hover:bg-danger/10 hover:text-danger focus-visible:text-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPendingDelete(p.id);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </nav>
      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(v) => {
          if (!v) setPendingDelete(null);
        }}
        title="Delete this project?"
        description="The conversation, preview, and version history will be removed from this browser."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (pendingDelete) deleteProject(pendingDelete);
          setPendingDelete(null);
        }}
      />
    </>
  );
}
