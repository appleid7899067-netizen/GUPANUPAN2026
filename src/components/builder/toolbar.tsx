import { ModelSelect } from "./model-select";
import { DeployModal } from "./DeployModal";
import { usePuterAuth } from "@/lib/puter-auth";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Menu, Monitor, Moon, Plus, Sun, MessageSquare, AppWindow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { useBuilder } from "@/lib/builder/store";
import { cn } from "@/lib/utils";
import React from "react";
import { useShallow } from "zustand/shallow";

function PuterSessionButton() {
  const { ready, signedIn, user, loading, signIn, signOut } = usePuterAuth();
  if (!ready) {
    return (
      <span className="hidden shrink-0 rounded-full border border-border px-2 py-1 text-[10px] text-muted sm:inline">
        Puter…
      </span>
    );
  }
  if (signedIn) {
    return (
      <button
        type="button"
        onClick={() => void signOut()}
        className="max-w-[88px] min-w-0 shrink-0 truncate rounded-full border border-border px-2 py-1 text-[11px] text-muted transition-colors hover:text-fg sm:max-w-[120px] sm:px-2.5 sm:text-xs"
        title={user?.username ?? "Puter"}
      >
        {user?.username ? `@${user.username}` : "Puter"}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => void signIn()}
      disabled={loading}
      className="shrink-0 rounded-full bg-violet-500 px-2.5 py-1 text-[11px] font-medium text-white shadow-[0_0_16px_rgba(139,92,246,.16)] disabled:opacity-50 sm:px-3 sm:text-xs"
    >
      {loading ? "…" : "Puter"}
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
  const { active } = useBuilder(useShallow((s) => ({ active: s.projects.find((p) => p.id === s.activeId) ?? null })));
  const [deployOpen, setDeployOpen] = React.useState(false);

  const nextTheme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
  const ThemeIcon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  return (
    <header className="mobile-no-blur flex h-12 min-w-0 shrink-0 items-center gap-0.5 overflow-hidden border-b border-white/[0.06] bg-zinc-950/95 px-1.5 sm:gap-1 sm:px-2">
      {/* Left cluster */}
      <div className="flex shrink-0 items-center gap-0.5">
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
      </div>

      {/* Center: AI Chat / App — flex, not absolute (fixes overlap) */}
      {inEditor ? (
        <nav
          aria-label="ห้องทำงาน"
          className="mx-1 flex min-w-0 flex-1 justify-center sm:mx-2"
        >
          <div className="inline-flex max-w-full rounded-full bg-muted-fill p-0.5">
            <button
              type="button"
              onClick={() => setMobilePane("chat")}
              aria-current={mobilePane === "chat" ? "page" : undefined}
              className={cn(
                "flex h-8 items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold transition-colors sm:gap-1.5 sm:px-3 sm:text-xs",
                mobilePane === "chat" ? "bg-surface text-fg shadow-border" : "text-muted hover:text-fg",
              )}
            >
              <MessageSquare className="size-3.5 shrink-0" />
              <span className="truncate">AI Chat</span>
            </button>
            <button
              type="button"
              onClick={() => setMobilePane("app")}
              aria-current={mobilePane === "app" ? "page" : undefined}
              className={cn(
                "flex h-8 items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold transition-colors sm:gap-1.5 sm:px-3 sm:text-xs",
                mobilePane === "app" ? "bg-surface text-fg shadow-border" : "text-muted hover:text-fg",
              )}
            >
              <AppWindow className="size-3.5 shrink-0" />
              <span className="truncate">App</span>
            </button>
          </div>
        </nav>
      ) : (
        <div className="flex-1" />
      )}

      {/* Right cluster — never overlap center */}
      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        {inEditor && active?.canvas ? (
          <button
            type="button"
            onClick={() => setDeployOpen(true)}
            className="hidden max-w-[72px] truncate rounded-full bg-emerald-500 px-2 py-1 text-[11px] font-semibold text-zinc-950 shadow-sm hover:bg-emerald-400 sm:inline-block sm:max-w-none sm:px-2.5 sm:text-xs"
          >
            Deploy
          </button>
        ) : null}
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
          className="mr-0.5 hidden text-xs font-medium text-muted hover:text-fg lg:inline"
          onClick={newProject}
        >
          Bossnu
        </Link>
        <ModelSelect className="hidden max-w-[9rem] md:inline-flex lg:max-w-[14rem]" />
        <PuterSessionButton />
      </div>

      {active?.canvas ? (
        <DeployModal
          projectId={active.id}
          projectName={active.title}
          html=""
          isOpen={deployOpen}
          onClose={() => setDeployOpen(false)}
          onSuccess={() => {}}
        />
      ) : null}
    </header>
  );
}
