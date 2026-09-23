import { ArrowUp, Square } from "lucide-react";
import { useRef, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useBuilder } from "@/lib/builder/store";
import { sendPrompt } from "@/lib/builder/send";
import { cn } from "@/lib/utils";

export function PromptBox({
  large,
  placeholder = "What should we build today?",
}: {
  large?: boolean;
  placeholder?: string;
}) {
  const draft = useBuilder((s) => s.draft);
  const generating = useBuilder((s) => s.generating);
  const setDraft = useBuilder((s) => s.setDraft);
  const ref = useRef<HTMLTextAreaElement>(null);

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

  return (
    <div
      className={cn(
        "relative bg-surface shadow-border transition-[box-shadow] duration-[var(--motion-quick)]",
        "focus-within:shadow-border-hover",
        large ? "rounded-[20px] p-3" : "rounded-[16px] p-2.5",
      )}
    >
      <Textarea
        ref={ref}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          autosize();
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label="Describe what to build"
        rows={large ? 3 : 2}
        className={cn(
          "px-2 py-1 leading-relaxed",
          large ? "min-h-24 text-base" : "min-h-14 text-sm",
        )}
      />
      <div className="flex items-center justify-end pt-1">
        <Button
          size="icon-sm"
          disabled={!canSend}
          aria-label={generating ? "Building" : "Send"}
          onClick={() => void sendPrompt(draft)}
          className="rounded-full"
        >
          {generating ? <Square className="size-3 fill-current" /> : <ArrowUp className="size-4" />}
        </Button>
      </div>
    </div>
  );
}
