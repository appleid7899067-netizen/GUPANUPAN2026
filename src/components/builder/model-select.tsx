import { MODEL_OPTIONS } from "@/lib/models";
import { useBuilder } from "@/lib/builder/store";
import { cn } from "@/lib/utils";

export function ModelSelect({ className }: { className?: string }) {
  const modelId = useBuilder((s) => s.modelId);
  const setModelId = useBuilder((s) => s.setModelId);

  return (
    <label className={cn("inline-flex items-center gap-1.5 text-xs text-muted", className)}>
      <span className="hidden sm:inline">โมเดล</span>
      <select
        value={modelId}
        onChange={(e) => setModelId(e.target.value)}
        className="max-w-[11rem] truncate rounded-full border border-border bg-surface px-2 py-1 text-xs text-fg outline-none focus:border-accent sm:max-w-[14rem]"
        aria-label="เลือกโมเดล"
      >
        {MODEL_OPTIONS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.labelTh}
            {m.free ? "" : " · เสียเงิน"}
          </option>
        ))}
      </select>
    </label>
  );
}
