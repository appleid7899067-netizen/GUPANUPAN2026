import { ArrowUp, Square, FileText, Mic, WandSparkles, Sparkles, Lightbulb, Users, ListChecks, StickyNote, Search, Brain } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useBuilder } from "@/lib/builder/store";
import { sendPrompt } from "@/lib/builder/send";
import { cn } from "@/lib/utils";

const EMPTY_DOCUMENTS: NonNullable<import("@/lib/builder/types").Project["documents"]> = [];

const PROMPT_EXAMPLES = [
  "อยากได้ระบบหอพักที่จองห้อง เก็บเงิน และมีแดชบอร์ดเจ้าของ…",
  "อยากสร้างธุรกิจร้านกาแฟที่ต่อยอดเป็น POS และสต็อกได้…",
  "อยากมีระบบจัดการชีวิตที่ใช้ได้ทั้งมือถือและคอม…",
  "อยากสร้างแพลตฟอร์มของตัวเอง แล้วให้บอสแตกเป็นระบบให้ครบ…",
];

export function PromptBox({ large, placeholder = "บอกความฝันมา เดี๋ยวบอสสร้างโลกให้…" }: { large?: boolean; placeholder?: string }) {
  const draft = useBuilder((s) => s.draft);
  const generating = useBuilder((s) => s.generating);
  const setDraft = useBuilder((s) => s.setDraft);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const activeId = useBuilder((s) => s.activeId);
  const addDocument = useBuilder((s) => s.addDocument);
  // Keep the empty fallback referentially stable. A fresh [] here makes Zustand\n  // v5 see a changed snapshot on every render and can trigger React #185.\n  const documents = useBuilder((s) => s.projects.find((x) => x.id === s.activeId)?.documents ?? EMPTY_DOCUMENTS);
  const [documentOpen, setDocumentOpen] = useState(false);
  const [exampleIndex, setExampleIndex] = useState(0);
  const [listening, setListening] = useState(false);
  const [mode, setMode] = useState<"fast" | "quality">("fast");
  const [captureMode, setCaptureMode] = useState<"general" | "meeting" | "idea" | "task">("general");
  const [captureOpen, setCaptureOpen] = useState(false);

  const captureModes = {
    general: { label: "ทั่วไป", hint: "ให้บอสจัดโครงสร้างเอง", icon: StickyNote },
    meeting: { label: "ประชุม", hint: "ประเด็น · มติ · งานต่อ", icon: Users },
    idea: { label: "ไอเดีย", hint: "แตกแนวคิดและโอกาสต่อยอด", icon: Lightbulb },
    task: { label: "งาน", hint: "เป้าหมาย · ขั้นตอน · เช็กผล", icon: ListChecks },
  } as const;

  useEffect(() => {
    const timer = window.setInterval(() => setExampleIndex((i) => (i + 1) % PROMPT_EXAMPLES.length), 2600);
    return () => window.clearInterval(timer);
  }, []);

  function autosize() {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, large ? 220 : 160)}px`;
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void sendPrompt(draft);
    }
  }

  const canSend = draft.trim().length > 0 && !generating;

  function applyCaptureMode() {
    setCaptureOpen((open) => !open);
  }

  async function handleDocument(file: File) {
    if (!activeId) return;
    const isText = /^(text\/|application\/(json|csv))/.test(file.type) || /\.(txt|md|markdown|csv|json|log)$/i.test(file.name);
    const text = isText ? (await file.text()).slice(0, 120_000) : "";
    addDocument(activeId, {
      id: crypto.randomUUID(),
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      text: text || undefined,
      status: text ? "ready" : "metadata",
      createdAt: Date.now(),
    });
    if (text) {
      const context = `[เอกสาร: ${file.name}]\n${text}\n[/เอกสาร]`;
      setDraft(draft ? `${draft}\n\n${context}` : context);
    } else {
      setDraft(draft ? `${draft}\n[แนบเอกสาร: ${file.name}]` : `[แนบเอกสาร: ${file.name}]`);
    }
    setDocumentOpen(false);
    requestAnimationFrame(() => ref.current?.focus());
  }

  function enhancePrompt() {
    const value = draft.trim();
    if (!value) return;
    const capture = captureModes[captureMode];
    const contextInstruction = captureMode === "general"
      ? ""
      : ` Work in ${capture.label.toLowerCase()} capture mode: ${capture.hint}. Extract the useful structure automatically and keep the result actionable.`;
    setDraft(`${value}. Build this as a polished production-ready ${mode === "quality" ? "high-quality" : "fast"} web app with responsive layout, clear navigation, reusable components, real interactions, loading/empty/error states, and a refined visual system.${contextInstruction}`);
    requestAnimationFrame(() => ref.current?.focus());
  }

  function startVoice() {
    const w = window as Window & { webkitSpeechRecognition?: new () => any; SpeechRecognition?: new () => any };
    const Recognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = "th-TH";
    recognition.interimResults = false;
    setListening(true);
    recognition.onresult = (event: any) => {
      const spoken = event.results?.[0]?.[0]?.transcript || "";
      if (spoken) setDraft(draft ? `${draft} ${spoken}` : spoken);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.start();
  }

  return (
    <div className={cn("prompt-command-glow relative bg-surface shadow-border transition-[box-shadow] duration-[var(--motion-quick)]", "focus-within:shadow-border-hover", large ? "rounded-[20px] p-3" : "rounded-[16px] p-2.5")}>
      <Textarea
        ref={ref}
        value={draft}
        onChange={(e) => { setDraft(e.target.value); autosize(); }}
        onKeyDown={onKeyDown}
        placeholder={PROMPT_EXAMPLES[exampleIndex] || placeholder}
        aria-label="Describe what to build"
        rows={large ? 3 : 2}
        className={cn("px-2 py-1 leading-relaxed", large ? "min-h-24 text-base" : "min-h-14 text-sm")}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*,.pdf,.txt,.md,.markdown,.csv,.json,.log,application/pdf,text/plain,text/markdown,text/csv,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleDocument(file);
          e.currentTarget.value = "";
        }}
      />
      {documentOpen ? (
        <div className="mb-2 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-2 backdrop-blur-xl">
          <div className="mb-1.5 flex items-center justify-between px-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-subtle">DOCUMENT INTELLIGENCE</span>
            <span className="text-[10px] text-muted">{documents.length} เอกสาร</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              ["ถามเอกสาร", "ถามเนื้อหาและหาหลักฐาน", Search],
              ["สรุป", "สรุปประเด็นสำคัญ", FileText],
              ["วิเคราะห์", "แยก insight และความเสี่ยง", Brain],
              ["จัดเป็นงาน", "ดึง action items", ListChecks],
            ].map(([label, hint, Icon]) => (
              <button key={String(label)} type="button" onClick={() => { setDraft((draft ? draft + "\n\n" : "") + String(hint) + " จากเอกสารที่แนบ"); setDocumentOpen(false); }} className="flex min-w-0 flex-col items-center gap-1 rounded-xl px-1.5 py-2 text-center text-muted transition-all hover:bg-white/[0.06] hover:text-fg">
                <Icon className="size-4" />
                <span className="truncate text-[10px] font-medium">{String(label)}</span>
              </button>
            ))}
          </div>
          {documents.length ? <div className="mt-2 space-y-1">{documents.slice(-3).map((doc) => <div key={doc.id} className="flex items-center gap-2 rounded-lg bg-white/[0.035] px-2 py-1.5 text-[10px]"><FileText className="size-3 shrink-0 text-accent" /><span className="min-w-0 flex-1 truncate">{doc.name}</span><span className="text-subtle">{doc.status === "ready" ? "อ่านแล้ว" : "ข้อมูลไฟล์"}</span></div>)}</div> : null}
          <p className="mt-2 px-1 text-[10px] leading-relaxed text-subtle">ไฟล์ข้อความจะถูกอ่านเข้า context ทันที · PDF จะแนบเป็นข้อมูลไฟล์ จนกว่าจะต่อ parser ฝั่งเซิร์ฟเวอร์</p>
        </div>
      ) : null}
      {captureOpen ? (
        <div className="mb-2 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-2 backdrop-blur-xl">
          <div className="mb-1.5 flex items-center justify-between px-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-subtle">SMART CAPTURE</span>
            <span className="text-[10px] text-muted">เลือกบริบท แล้วบอสจัดโครงให้</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {Object.entries(captureModes).map(([key, item]) => {
              const Icon = item.icon;
              const selected = captureMode === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setCaptureMode(key as typeof captureMode); setCaptureOpen(false); requestAnimationFrame(() => ref.current?.focus()); }}
                  className={cn(
                    "flex min-w-0 flex-col items-center gap-1 rounded-xl px-1.5 py-2 text-center transition-all",
                    selected ? "bg-accent/15 text-accent shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-accent)_25%,transparent)]" : "text-muted hover:bg-white/[0.06] hover:text-fg",
                  )}
                  aria-pressed={selected}
                >
                  <Icon className="size-4" />
                  <span className="truncate text-[10px] font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      <div className="prompt-toolbar mt-2 flex items-center gap-1 rounded-xl px-1.5 py-1">
        <Button type="button" variant="ghost" size="icon-sm" aria-label="โหมดจับข้อมูลอัจฉริยะ" onClick={applyCaptureMode} className={cn("text-muted hover:text-fg", captureOpen && "text-accent")}><StickyNote /></Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Document Intelligence" onClick={() => setDocumentOpen((open) => !open)} className={cn("text-muted hover:text-fg", documentOpen && "text-accent")}><FileText /></Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="ขยาย Prompt ด้วย AI" onClick={enhancePrompt} disabled={!draft.trim()} className="text-muted hover:text-accent"><WandSparkles /></Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="สั่งงานด้วยเสียง" onClick={startVoice} className={cn("text-muted hover:text-fg", listening && "text-accent")}><Mic /></Button>
        <button type="button" onClick={() => setMode(mode === "fast" ? "quality" : "fast")} className="ml-1 inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-2.5 py-1 text-[10px] font-medium text-muted transition hover:bg-white/[0.09] hover:text-fg"><Sparkles className="size-3" /> {mode === "fast" ? "Fast" : "High Quality"}</button>
        <span className="ml-auto hidden text-[10px] text-subtle sm:inline">{listening ? "กำลังฟัง…" : captureMode !== "general" ? `โหมด ${captureModes[captureMode].label}` : "Enter เพื่อสร้าง"}</span>
        <Button size="icon-sm" disabled={!canSend} aria-label={generating ? "Building" : "Send"} onClick={() => void sendPrompt(draft)} className="rounded-full">
          {generating ? <Square className="size-3 fill-current" /> : <ArrowUp className="size-4" />}
        </Button>
      </div>
    </div>
  );
}
