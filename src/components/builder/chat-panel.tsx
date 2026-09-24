import { useEffect, useRef } from "react";
import { PromptBox } from "./prompt-box";
import { ModelSelect } from "./model-select";
import { useBuilder } from "@/lib/builder/store";
import { sendPrompt } from "@/lib/builder/send";
import { extractDisplayText } from "@/lib/builder/parse";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/builder/types";

const STEPS = [
  "อ่านคำขอ",
  "ออกแบบเลย์เอาต์",
  "เขียนหน้าเว็บ",
  "เพิ่มการโต้ตอบ",
];

export function ChatPanel() {
  const project = useBuilder((s) => s.projects.find((p) => p.id === s.activeId) ?? null);
  const generating = useBuilder((s) => s.generating);
  const streamText = useBuilder((s) => s.streamText);
  const generatingStatus = useBuilder((s) => s.generatingStatus);
  const activities = useBuilder((s) => (project ? s.activities[project.id] ?? [] : []));
  const bottom = useRef<HTMLDivElement>(null);

  // Scroll only when a message/task starts. Do not scroll on every streamed
  // token, otherwise the viewport jumps while the model is generating.
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [project?.messages.length, generating]);

  if (!project) return null;

  const live = generating ? extractDisplayText(streamText) : "";
  const stepIndex = streamText.includes("```") ? 3 : streamText.length > 80 ? 2 : streamText.length > 0 ? 1 : 0;

  return (
    <section className="boss-glass flex h-full min-h-0 w-full min-w-0 max-w-full flex-col overflow-hidden overscroll-none touch-pan-y [contain:layout_paint] md:max-w-[26rem] md:shrink-0 lg:max-w-[28rem]">
      <div className="flex min-w-0 shrink-0 items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2">
        <span className="shrink-0 text-xs font-medium text-muted">แชท</span>
        <div className="min-w-0 max-w-[72vw] overflow-hidden"><ModelSelect /></div>
      </div>
      {activities.length > 0 ? <AgentActivityStrip activities={activities} active={generating} /> : null}
      <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-3 pb-5 scrollbar-none sm:px-4">
        <ol className="space-y-4">
          {project.messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
          {generating ? (
            <li className="space-y-3">
              <p className="text-sm font-medium text-fg">{generatingStatus || "กำลังทำงาน…"}</p>
              <ul className="space-y-1.5 text-sm">
                {STEPS.map((label, i) => (
                  <li
                    key={label}
                    className={cn(
                      "flex items-center gap-2",
                      i < stepIndex ? "text-success" : i === stepIndex ? "text-fg" : "text-subtle",
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        i < stepIndex ? "bg-success" : i === stepIndex ? "bg-accent" : "bg-border-strong",
                      )}
                    />
                    <span className={i === stepIndex ? "shimmer" : undefined}>{label}</span>
                  </li>
                ))}
              </ul>
              {live ? (
                <p className="text-sm leading-relaxed text-muted">{live}</p>
              ) : (
                <p className="shimmer text-sm">กำลังทำงาน…</p>
              )}
            </li>
          ) : null}
        </ol>
        <div ref={bottom} />
      </div>
      {!generating && project.suggestions.length > 0 ? (
        <div className="chip-fade flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-none">
          {project.suggestions.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => void sendPrompt(s.prompt)}
              className="shrink-0 rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-fg shadow-border hover:shadow-border-hover"
            >
              {s.label}
            </button>
          ))}
        </div>
      ) : null}
      <div className="sticky bottom-0 z-10 shrink-0 border-t border-white/[0.06] bg-zinc-950/80 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:px-4">
        <PromptBox placeholder="บอกสิ่งที่อยากเปลี่ยน…" />
      </div>
    </section>
  );
}

function cleanChatOnlyText(raw: string): string {
  let text = raw
    .replace(/\{\s*"type"\s*:\s*"usage"[\s\S]*$/i, "")
    .replace(/\{\s*"usage"\s*:\s*\{[\s\S]*$/i, "")
    .replace(/\s*AI is not available in this environment\.?\s*/gi, "")
    .trim();

  if (!text) return "✦ ยังเชื่อมต่อ AI ไม่สำเร็จ";

  // Keep this formatting local to this chat room. Generated source belongs
  // in Preview, never as a wall of JSON/HTML inside the conversation.
  text = extractDisplayText(text);
  return text;
}

function ChatText({ text }: { text: string }) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length <= 1) {
    return <span>{text}</span>;
  }

  return (
    <span className="block space-y-1.5">
      {lines.slice(0, 12).map((line, i) => (
        <span key={i} className="flex gap-2">
          <span className="shrink-0 text-accent">✦</span>
          <span className="min-w-0">{line}</span>
        </span>
      ))}
      {lines.length > 12 ? (
        <span className="block pt-1 text-xs text-muted">✦ แสดงเฉพาะข้อความสรุปในห้องแชท</span>
      ) : null}
    </span>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <li className="flex justify-end">
        <div className="max-w-[90%] rounded-2xl rounded-br-sm bg-accent px-3.5 py-2 text-sm leading-relaxed text-accent-fg">
          {message.content}
        </div>
      </li>
    );
  }
  return (
    <li>
      <p className="max-w-full break-words text-sm leading-relaxed text-fg">
        <ChatText text={cleanChatOnlyText(message.content)} />
      </p>
    </li>
  );
}


function AgentActivityStrip({ activities, active }: { activities: import("@/lib/builder/types").AgentActivity[]; active: boolean }) {
  return (
    <div className="shrink-0 border-b border-white/[0.06] px-3 py-2 sm:px-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle">BOSS ACTIVITY</span>
        <span className={cn("text-[10px]", active ? "text-accent" : "text-success")}>{active ? "LIVE" : "DONE"}</span>
      </div>
      <ol className="mt-2 max-h-28 space-y-1 overflow-y-auto scrollbar-none">
        {activities.slice(-6).map((item) => (
          <li key={item.id} className="flex min-w-0 items-center gap-2 text-xs">
            <span className={cn("size-1.5 shrink-0 rounded-full", item.status === "error" ? "bg-red-400" : item.status === "success" ? "bg-success" : item.status === "fixing" ? "bg-amber-400" : "bg-accent")} />
            <span className="truncate text-muted">{item.label}</span>
            {item.detail ? <span className="hidden truncate text-subtle sm:inline">{item.detail}</span> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
