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
import type { CanvasComponent, CanvasState } from "@/lib/builder/types";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    if (char === "&") return "&amp;";
    if (char === "<") return "&lt;";
    if (char === ">") return "&gt;";
    if (char === '"') return "&quot;";
    return "&#39;";
  });
}

function canvasToHtml(canvas: CanvasState) {
  const page = canvas.pages[canvas.stack[canvas.stack.length - 1]?.id] ?? canvas.pages.home;
  if (!page) return "<!doctype html><html><body></body></html>";
  const theme = canvas.theme;
  const render = (node: CanvasComponent): string => {
    const p = node.props ?? {};
    const text = escapeHtml(typeof p.text === "string" ? p.text : typeof p.label === "string" ? p.label : "");
    const children = (node.children ?? []).map(render).join("");
    if (node.type === "heading") return `<h1>${text}</h1>`;
    if (node.type === "text") return `<p>${text}</p>`;
    if (node.type === "banner") return `<div class="banner">${text}</div>`;
    if (node.type === "button" || node.type === "nav") return `<button>${text}</button>`;
    if (node.type === "input") return `<input placeholder="${escapeHtml(String(p.placeholder ?? ""))}">`;
    if (node.type === "card" || node.type === "form") return `<section class="card">${text}${children}</section>`;
    if (node.type === "list") return `<ul>${children}</ul>`;
    return `<div>${text}${children}</div>`;
  };
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(page.title)}</title><style>:root{font-family:Inter,system-ui,sans-serif;color:${theme.text ?? "#172033"};background:${theme.background ?? "#f7f8fc"}}body{margin:0;padding:32px;max-width:1000px;margin-inline:auto}h1{font-size:42px}p{line-height:1.7}.banner{padding:16px 20px;border-radius:16px;background:${theme.primary ?? "#6d5dfc"};color:#fff;font-weight:700;margin-bottom:18px}.card{padding:20px;border:1px solid #00000014;border-radius:20px;background:#ffffffcc;margin:14px 0}button{border:0;border-radius:12px;padding:11px 16px;margin:6px;background:${theme.primary ?? "#6d5dfc"};color:#fff;font-weight:700}input{padding:12px;border:1px solid #0002;border-radius:12px;background:transparent;color:inherit}</style></head><body>${page.components.map(render).join("")}</body></html>`;
}

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
          <Button variant="ghost" size="icon-sm hidden sm:inline-flex" aria-label="โปรเจกต์ใหม่" onClick={newProject}>
            <Plus />
          </Button>
        </Tooltip>
      </div>

      {/* Center: AI Chat / App — flex, not absolute (fixes overlap) */}
      {inEditor ? (
        <nav
          aria-label="ห้องทำงาน"
          className="mx-1 flex min-w-0 flex-1 justify-center overflow-hidden sm:mx-2"
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
      <div className="ml-auto flex min-w-0 shrink-0 items-center gap-0.5 sm:gap-1">
        {inEditor && active?.canvas ? (
          <button
            type="button"
            onClick={() => setDeployOpen(true)}
            className="shrink-0 whitespace-nowrap rounded-full bg-emerald-500 px-2 py-1 text-[10px] font-semibold text-zinc-950 shadow-sm hover:bg-emerald-400 sm:px-2.5 sm:text-xs"
          >
            Deploy
          </button>
        ) : null}
        <div className="hidden sm:block">
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
        </div>
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
          html={active.canvas ? canvasToHtml(active.canvas) : ""}
          isOpen={deployOpen}
          onClose={() => setDeployOpen(false)}
          onSuccess={() => {}}
        />
      ) : null}
    </header>
  );
}
