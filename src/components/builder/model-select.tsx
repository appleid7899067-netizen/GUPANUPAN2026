import { useEffect, useState } from "react";
import { MODEL_OPTIONS } from "@/lib/models";
import { puterListModels } from "@/lib/puter";
import { useBuilder } from "@/lib/builder/store";
import { cn } from "@/lib/utils";

type LiveModel = { id: string; name?: string; provider?: string };

export function ModelSelect({ className }: { className?: string }) {
  const modelId = useBuilder((s) => s.modelId);
  const setModelId = useBuilder((s) => s.setModelId);
  const [liveModels, setLiveModels] = useState<LiveModel[]>([]);

  useEffect(() => {
    let active = true;
    void puterListModels().then((models) => {
      if (!active) return;
      const usable = models
        .filter((m) => typeof m.id === "string" && m.id.trim())
        .map((m) => ({ id: m.id, name: m.name, provider: m.provider }))
        .sort((a, b) => {
          const score = (m: LiveModel) =>
            /gpt-5\.6|opus|sonnet|reason|pro|luna/i.test(m.name ?? m.id) ? 0 : 1;
          return score(a) - score(b) || a.id.localeCompare(b.id);
        })
        .slice(0, 40);
      setLiveModels(usable);
    });
    return () => { active = false; };
  }, []);

  const options = liveModels.length
    ? liveModels
    : MODEL_OPTIONS.map((m) => ({ id: m.id, name: m.label, provider: "puter" }));

  return (
    <label className={cn("inline-flex items-center gap-1.5 text-xs text-muted", className)}>
      <span className="hidden sm:inline">โมเดล</span>
      <select
        value={selected}
        onChange={(e) => setModelId(e.target.value)}
        className="max-w-[11rem] truncate rounded-full border border-border bg-surface px-2 py-1 text-xs text-fg outline-none focus:border-accent sm:max-w-[14rem]"
        aria-label="เลือกโมเดล"
      >
        {options.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name || m.id}{m.provider ? ` · ${m.provider}` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
