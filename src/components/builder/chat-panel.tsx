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
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [project?.messages.length, streamText, generating]);

  if (!project) return null;

  const live = generating ? extractDisplayText(streamText) : "";
  const stepIndex = streamText.includes("```") ? 3 : streamText.length > 80 ? 2 : streamText.length > 0 ? 1 : 0;

  return (
    <section className="flex h-full min-h-0 w-full flex-col md:max-w-[26rem] md:shrink-0 lg:max-w-[28rem]">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <span className="text-xs font-medium text-muted">แชท</span>
        <ModelSelect />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 scrollbar-none">
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
      <div className="px-4 pb-4 pt-1">
        <PromptBox placeholder="บอกสิ่งที่อยากเปลี่ยน…" />
      </div>
    </section>
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
      <p className="text-sm leading-relaxed text-fg">{message.content}</p>
    </li>
  );
}
