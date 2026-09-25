import { ChatPanel } from "./chat-panel";
import { Landing } from "./landing";
import { Canvas } from "./canvas";
import { ProjectSidebar } from "./project-sidebar";
import { Toolbar } from "./toolbar";
import { useBuilder } from "@/lib/builder/store";
import { useShallow } from "zustand/shallow";

export function AppShell() {
  const { activeId, project } = useBuilder(useShallow((s) => ({ activeId: s.activeId, project: s.projects.find((p) => p.id === s.activeId) ?? null })));
  const mobilePane = useBuilder((s) => s.mobilePane);
  const inEditor = Boolean(activeId && project && (project.messages.length > 0 || project.canvas));

  return (
    <div className="boss-app-bg flex h-dvh flex-col bg-bg text-fg">
      <div className="boss-glass mobile-no-blur relative z-50 min-w-0 overflow-hidden"><Toolbar inEditor={inEditor} /></div>
      <ProjectSidebar />
      <div className="flex min-h-0 min-w-0 max-w-full flex-1 overflow-hidden">
        {inEditor ? (
          <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
            {mobilePane === "chat" ? <ChatPanel /> : <Canvas />}
          </div>
        ) : (
          <Landing />
        )}
      </div>
    </div>
  );
}
