import { useEffect, useRef } from "react";
import { PromptBox } from "./prompt-box";
import { ModelSelect } from "./model-select";
import { useBuilder } from "@/lib/builder/store";
import { sendPrompt } from "@/lib/builder/send";
import { extractDisplayText } from "@/lib/builder/parse";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/builder/types";

const EMPTY_ACTIVITIES: import("@/lib/builder/types").AgentActivity[] = [];

const STEPS = [
  "อ่านคำขอ",
  "ออกแบบเลย์เอาต์",
  "เขียนหน้าเว็บ",
  "เพิ่มการโต้ตอบ",
];

const QUICK_PROMPTS = [
  { label: "สรุป", prompt: "ช่วยสรุปสิ่งที่ทำอยู่ตอนนี้ให้สั้นและเข้าใจง่าย พร้อมประเด็นสำคัญ" },
  { label: "วางแผน", prompt: "ช่วยแตกเป้าหมายนี้เป็นแผนงานที่ทำได้จริง พร้อมลำดับขั้นตอนและสิ่งที่ต้องตรวจ" },
  { label: "จัดเป็นงาน", prompt: "ช่วยเปลี่ยนสิ่งที่คุยกันให้เป็นรายการงานที่ทำต่อได้ พร้อมเป้าหมายและสถานะที่ชัดเจน" },
  { label: "เขียน", prompt: "ช่วยเขียนเนื้อหานี้ใหม่ให้ชัด กระชับ และพร้อมนำไปใช้งานจริง" },
  { label: "แปล", prompt: "ช่วยแปลข้อความนี้ โดยรักษาความหมาย น้ำเสียง และรูปแบบเดิมให้เหมาะกับผู้รับ" },
  { label: "วิเคราะห์", prompt: "ช่วยวิเคราะห์เรื่องนี้ แยกข้อเท็จจริง ปัญหา ทางเลือก และขั้นตอนถัดไป" },
  { label: "แก้โค้ด", prompt: "ช่วยตรวจและแก้โค้ดที่มีปัญหาให้ทำงานได้จริง พร้อมตรวจผลหลังแก้" },
  { label: "อธิบาย", prompt: "ช่วยอธิบายเพิ่มเติมว่าตอนนี้ระบบทำงานอย่างไร และมีอะไรที่ควรทำต่อ" },
];

const RETRY_PATTERNS = [
  /ยังเชื่อมต่อ AI ไม่สำเร็จ/i,
  /เชื่อมต่อ AI ไม่สำเร็จ/i,
  /ai is not available/i,
  /connection.*failed/i,
  /request.*failed/i,
  /gateway.*failed/i,
];

export function ChatPanel() {
  const project = useBuilder((s) => s.projects.find((p) => p.id === s.activeId) ?? null);
  const generating = useBuilder((s) => s.generating);
  const streamText = useBuilder((s) => s.streamText);
  const generatingStatus = useBuilder((s) => s.generatingStatus);
  const activities = useBuilder((s) => project ? (s.activities[project.id] ?? EMPTY_ACTIVITIES) : EMPTY_ACTIVITIES);
  const bottom = useRef<HTMLDivElement>(null);

  // Scroll only when a message/task starts. Do not scroll on every streamed
  // token, otherwise the viewport jumps while the model is generating.
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [project?.messages.length, generating]);

  if (!project) return null;

  const live = generating ? extractDisplayText(streamText) : "";
  const stepIndex = streamText.includes("```") ? 3 : streamText.length > 80 ? 2 : streamText.length > 0 ? 1 : 0;
  const lastUserMessage = [...project.messages].reverse().find((message) => message.role === "user");
  const retryLastPrompt = () => {
    if (!lastUserMessage || generating) return;
    void sendPrompt(lastUserMessage.content);
  };

  return (
    <section className="boss-glass flex h-full min-h-0 w-full min-w-0 max-w-full flex-col overflow-hidden overscroll-none touch-pan-y [contain:layout_paint] md:max-w-[26rem] md:shrink-0 lg:max-w-[28rem]">
      <div className="flex min-w-0 shrink-0 items-center justify-between gap-2 border-b border-white/[0.06] bg-white/[0.025] px-3 py-2 backdrop-blur-2xl sm:px-4">
        <span className="shrink-0 text-xs font-medium text-muted">แชท</span>
        <div className="min-w-0 max-w-[72vw] overflow-hidden"><ModelSelect /></div>
      </div>
      {activities.length > 0 ? <AgentActivityStrip activities={activities} active={generating} /> : null}
      <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-4 pb-5 scrollbar-none sm:px-4 sm:py-5">
        <ol className="space-y-4">
          {project.messages.map((m) => (
            <MessageBubble key={m.id} message={m} onRetry={retryLastPrompt} canRetry={Boolean(lastUserMessage) && !generating} />
          ))}
          {generating ? (
            <li className="generation-starfield relative overflow-hidden rounded-2xl px-1 py-2">
              <div className="generation-stars" aria-hidden="true">
                {["✦", "·", "✧", "•", "✦", "·", "✧", "•", "✦", "·", "✧", "•"].map((star, i) => (
                  <span key={i} className={`generation-star generation-star-${i + 1}`}>{star}</span>
                ))}
              </div>
              <div className="relative space-y-3">
                <div className="flex items-center gap-2">
                  <span className="generation-core" aria-hidden="true">✦</span>
                  <p className="text-sm font-medium text-fg">{generatingStatus || "กำลังทำงาน…"}</p>
                </div>
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
                  <p className="max-w-[92%] text-sm leading-relaxed text-muted">{live}</p>
                ) : (
                  <p className="shimmer text-sm">กำลังทำงาน…</p>
                )}
              </div>
            </li>
          ) : null}
        </ol>
        <div ref={bottom} />
      </div>
      {!generating ? (
        <div className="chip-fade flex gap-2 overflow-x-auto px-3 pb-2 scrollbar-none sm:px-4" aria-label="คำสั่งลัด">
          {QUICK_PROMPTS.map((item) => (
            <button key={item.label} type="button" onClick={() => void sendPrompt(item.prompt)} className="shrink-0 rounded-full border border-white/[0.07] bg-white/[0.045] px-3 py-1.5 text-xs font-medium text-muted backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:bg-white/[0.08] hover:text-fg active:scale-[0.98]">{item.label}</button>
          ))}
          {project.suggestions.map((s) => (
            <button key={s.label} type="button" onClick={() => void sendPrompt(s.prompt)} className="shrink-0 rounded-full border border-white/[0.07] bg-surface/70 px-3 py-1.5 text-xs font-medium text-fg shadow-border transition-all duration-300 hover:scale-[1.02] hover:shadow-border-hover active:scale-[0.98]">{s.label}</button>
          ))}
        </div>
      ) : null}
      <div className="sticky bottom-0 z-10 shrink-0 border-t border-white/[0.06] bg-zinc-950/70 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-2xl sm:px-4">
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
    .replace(/^\s*(?:user\s*safety|response\s*safety)\s*:\s*(?:safe|pass|ok)\s*$/gim, "")
    .replace(/^\s*(?:ความปลอดภัยผู้ใช้|ความปลอดภัยคำตอบ)\s*:\s*(?:ปลอดภัย|ผ่าน|ปกติ)\s*$/gim, "")
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

function MessageBubble({ message, onRetry, canRetry }: { message: ChatMessage; onRetry: () => void; canRetry: boolean }) {
  if (message.role === "user") {
    return (
      <li className="flex justify-end">
        <div className="max-w-[90%] rounded-2xl rounded-br-sm bg-accent px-4 py-2.5 text-sm leading-relaxed text-accent-fg shadow-sm transition-all duration-300 hover:shadow-md">
          {message.content}
        </div>
      </li>
    );
  }
  const displayText = cleanChatOnlyText(message.content);
  const retryable = canRetry && RETRY_PATTERNS.some((pattern) => pattern.test(displayText));
  return (
    <li>
      <div className="max-w-full break-words text-sm leading-relaxed text-fg">
        <ChatText text={displayText} />
        {retryable ? <button type="button" onClick={onRetry} className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition-all duration-300 hover:scale-[1.02] hover:bg-accent/15 active:scale-[0.98]" aria-label="ลองเชื่อมต่อ AI อีกครั้ง">↻ ลองอีกครั้ง</button> : null}
      </div>
    </li>
  );
}

function AgentActivityStrip({ activities, active }: { activities: import("@/lib/builder/types").AgentActivity[]; active: boolean }) {
  return (
    <div className="shrink-0 border-b border-white/[0.06] bg-white/[0.02] px-3 py-1.5 backdrop-blur-xl sm:px-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-subtle">BOSS ACTIVITY</span>
        <span className={cn("text-[9px]", active ? "text-accent" : "text-success")}>{active ? "กำลังทำงาน" : "เสร็จแล้ว"}</span>
      </div>
      <ol className="mt-1.5 max-h-24 space-y-1 overflow-y-auto scrollbar-none">
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
