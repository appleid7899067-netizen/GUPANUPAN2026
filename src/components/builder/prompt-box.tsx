import { ArrowUp, Square, Paperclip, Mic, WandSparkles, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useBuilder } from "@/lib/builder/store";
import { sendPrompt } from "@/lib/builder/send";
import { cn } from "@/lib/utils";

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
  const [exampleIndex, setExampleIndex] = useState(0);
  const [listening, setListening] = useState(false);
  const [mode, setMode] = useState<"fast" | "quality">("fast");

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

  function enhancePrompt() {
    const value = draft.trim();
    if (!value) return;
    setDraft(`${value}. Build this as a polished production-ready ${mode === "quality" ? "high-quality" : "fast"} web app with responsive layout, clear navigation, reusable components, real interactions, loading/empty/error states, and a refined visual system.`);
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
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) setDraft(draft ? `${draft}\n[แนบภาพอ้างอิง: ${file.name}]` : `[แนบภาพอ้างอิง: ${file.name}]`);
          e.currentTarget.value = "";
        }}
      />
      <div className="prompt-toolbar mt-2 flex items-center gap-1 rounded-xl px-1.5 py-1">
        <Button type="button" variant="ghost" size="icon-sm" aria-label="แนบภาพ" onClick={() => fileRef.current?.click()} className="text-muted hover:text-fg"><Paperclip /></Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="ขยาย Prompt ด้วย AI" onClick={enhancePrompt} disabled={!draft.trim()} className="text-muted hover:text-accent"><WandSparkles /></Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="สั่งงานด้วยเสียง" onClick={startVoice} className={cn("text-muted hover:text-fg", listening && "text-accent")}><Mic /></Button>
        <button type="button" onClick={() => setMode(mode === "fast" ? "quality" : "fast")} className="ml-1 inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-2.5 py-1 text-[10px] font-medium text-muted transition hover:bg-white/[0.09] hover:text-fg"><Sparkles className="size-3" /> {mode === "fast" ? "Fast" : "High Quality"}</button>
        <span className="ml-auto text-[10px] text-subtle">{listening ? "กำลังฟัง…" : "Enter เพื่อสร้าง"}</span>
        <Button size="icon-sm" disabled={!canSend} aria-label={generating ? "Building" : "Send"} onClick={() => void sendPrompt(draft)} className="rounded-full">
          {generating ? <Square className="size-3 fill-current" /> : <ArrowUp className="size-4" />}
        </Button>
      </div>
    </div>
  );
}
