import { ChatPanel } from "./chat-panel";
import { Landing } from "./landing";
import { PreviewPane } from "./preview-pane";
import { ProjectSidebar } from "./project-sidebar";
import { Toolbar } from "./toolbar";
import { useBuilder } from "@/lib/builder/store";
import { cn } from "@/lib/utils";
import { useShallow } from "zustand/shallow";

export function AppShell() {
  const { activeId, project } = useBuilder(useShallow((s) => ({ activeId: s.activeId, project: s.projects.find((p) => p.id === s.activeId) ?? null })));
  const mobilePane = useBuilder((s) => s.mobilePane);
  const inEditor = Boolean(activeId && project && (project.messages.length > 0 || project.html));

  return (
    <div className="boss-app-bg flex h-dvh flex-col bg-bg text-fg">
      <div className="boss-glass mobile-no-blur relative z-50 min-w-0 overflow-hidden"><Toolbar inEditor={inEditor} /></div>
      <ProjectSidebar />
      <div className="flex min-h-0 min-w-0 max-w-full flex-1 overflow-hidden">
        {inEditor ? (
          <>
            <div
              className={cn(
                "min-h-0",
                mobilePane === "chat" ? "flex flex-1" : "hidden",
                "md:flex md:w-[26rem] md:flex-none lg:w-[28rem]",
              )}
            >
              <ChatPanel />
            </div>
            <div
              className={cn(
                "min-h-0 min-w-0",
                mobilePane === "preview" ? "flex flex-1" : "hidden",
                "md:flex md:flex-1",
              )}
            >
              <PreviewPane />
            </div>
          </>
        ) : (
          <Landing />
        )}
      </div>
    </div>
  );
}
