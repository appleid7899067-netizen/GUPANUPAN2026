import { ModelSelect } from "./model-select";
import { DeployModal } from "./DeployModal";
import { usePuterAuth } from "@/lib/puter-auth";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Menu, Monitor, Moon, Plus, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { useBuilder } from "@/lib/builder/store";
import { cn } from "@/lib/utils";
import React from "react";

function PuterSessionButton() {
  const { ready, signedIn, user, loading, signIn, signOut } = usePuterAuth();
  if (!ready) return null;
  if (signedIn) {
    return (
      <button
        type="button"
        onClick={() => void signOut()}
        className="rounded-full border border-border px-3 py-1 text-xs text-muted transition-all duration-300 hover:scale-[1.02] hover:text-fg"
        title={user?.username ?? "Puter"}
      >
        {user?.username ? `@${user.username}` : "Puter"} · ออก
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => void signIn()}
      disabled={loading}
      className="rounded-full bg-violet-500 px-3 py-1 text-xs font-medium text-white shadow-[0_0_24px_rgba(139,92,246,.22)] disabled:opacity-50"
    >
      {loading ? "…" : "ล็อกอิน Puter"}
    </button>
  );
}

export function Toolbar({ inEditor }: { inEditor: boolean }) {
  const theme = useBuilder((s) => s.theme);
  const setTheme = useBuilder((s) => s.setTheme);
  const setSidebarOpen = useBuilder((s) => s.setSidebarOpen);
  const newProject = useBuilder((s) => s.newProject);
  const mobilePane = useBuilder((s) => s.mobilePane);
  const setMobilePane = useBuilder((s) => s.setMobilePane);
  const active = useBuilder((s) => s.projects.find((p) => p.id === s.activeId) ?? null);
  const [deployOpen, setDeployOpen] = React.useState(false);

  const nextTheme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
  const ThemeIcon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  return (
    <header className="flex h-12 shrink-0 items-center gap-1 border-b border-white/[0.06] bg-zinc-950/55 px-2 backdrop-blur-2xl supports-[backdrop-filter]:bg-zinc-950/40">
      <Tooltip label={inEditor ? "ย้อนกลับ" : "กลับ"}>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={inEditor ? "ย้อนกลับ" : "กลับ"}
          onClick={() => {
            if (inEditor) {
              newProject();
              return;
            }
            window.history.back();
          }}
        >
          <ArrowLeft />
        </Button>
      </Tooltip>
      <Tooltip label="โปรเจกต์">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="โปรเจกต์"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu />
        </Button>
      </Tooltip>
      <Tooltip label="โปรเจกต์ใหม่">
        <Button variant="ghost" size="icon-sm" aria-label="โปรเจกต์ใหม่" onClick={newProject}>
          <Plus />
        </Button>
      </Tooltip>

      {inEditor ? (
        <div className="mx-auto flex rounded-full bg-muted-fill p-0.5 md:hidden">
          {(["chat", "preview"] as const).map((pane) => (
            <button
              key={pane}
              type="button"
              onClick={() => setMobilePane(pane)}
              className={cn(
                "h-7 rounded-full px-3 text-xs font-medium",
                mobilePane === pane ? "bg-surface text-fg shadow-border" : "text-muted",
              )}
            >
              {pane === "preview" ? "พรีวิว" : "แชท"}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {!inEditor ? <div className="flex-1" /> : <div className="hidden flex-1 md:block" />}

      {inEditor && active?.html ? <button type="button" onClick={() => setDeployOpen(true)} className="mr-1 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 shadow-sm hover:bg-emerald-400">🚀 Deploy</button> : null}
      <Tooltip label={`ธีม: ${theme}`}>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="สลับธีม"
          onClick={() => setTheme(nextTheme)}
        >
          <ThemeIcon />
        </Button>
      </Tooltip>
      <Link
        to="/"
        className="mr-1 hidden text-xs font-medium text-muted hover:text-fg sm:inline"
        onClick={newProject}
      >
        Bossnu.silelo
      </Link>
      <ModelSelect className="hidden md:inline-flex" />
      <PuterSessionButton />
      {active?.html ? <DeployModal projectId={active.id} projectName={active.title} html={active.html} isOpen={deployOpen} onClose={() => setDeployOpen(false)} onSuccess={() => {}} /> : null}
    </header>
  );
}
