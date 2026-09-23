import { usePuterAuth } from "@/lib/puter-auth";
import { Link } from "@tanstack/react-router";
import { Menu, Monitor, Moon, Plus, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { useBuilder } from "@/lib/builder/store";
import { cn } from "@/lib/utils";

function PuterSessionButton() {
  const { ready, signedIn, user, loading, signIn, signOut } = usePuterAuth();
  if (!ready) return null;
  if (signedIn) {
    return (
      <button
        type="button"
        onClick={() => void signOut()}
        className="rounded-full border border-border px-3 py-1 text-xs text-muted hover:text-fg"
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
      className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-fg disabled:opacity-50"
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

  const nextTheme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
  const ThemeIcon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  return (
    <header className="flex h-11 shrink-0 items-center gap-1 px-2">
      <Tooltip label="Projects">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Projects"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu />
        </Button>
      </Tooltip>
      <Tooltip label="New project">
        <Button variant="ghost" size="icon-sm" aria-label="New project" onClick={newProject}>
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
                "h-7 rounded-full px-3 text-xs font-medium capitalize",
                mobilePane === pane ? "bg-surface text-fg shadow-border" : "text-muted",
              )}
            >
              {pane === "preview" ? "App" : "Chat"}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {!inEditor ? <div className="flex-1" /> : <div className="hidden flex-1 md:block" />}

      <Tooltip label={`Theme: ${theme}`}>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Toggle theme"
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
        GuPanu
      </Link>
      <PuterSessionButton />
    </header>
  );
}
