import { useEffect, useMemo, useState } from "react";
import { MODEL_OPTIONS } from "@/lib/models";
import { puterListModels } from "@/lib/puter";
import { useBuilder } from "@/lib/builder/store";
import { cn } from "@/lib/utils";

type LiveModel = { id: string; name?: string; provider?: string };

function cleanModels(models: LiveModel[]): LiveModel[] {
  const seen = new Set<string>();
  return models
    .filter((m) => typeof m.id === "string" && m.id.trim())
    .map((m) => ({
      id: m.id.trim(),
      name: (m.name || "").trim() || undefined,
      provider: (m.provider || "").trim() || "Puter",
    }))
    .filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    })
    .sort((a, b) => {
      const provider = (a.provider || "").localeCompare(b.provider || "");
      if (provider) return provider;
      return (a.name || a.id).localeCompare(b.name || b.id);
    });
}

export function ModelSelect({ className }: { className?: string }) {
  const modelId = useBuilder((s) => s.modelId);
  const setModelId = useBuilder((s) => s.setModelId);
  const [liveModels, setLiveModels] = useState<LiveModel[]>([]);

  useEffect(() => {
    let active = true;
    void puterListModels().then((models) => {
      if (active) setLiveModels(cleanModels(models));
    });
    return () => {
      active = false;
    };
  }, []);

  const options = useMemo(
    () =>
      liveModels.length
        ? liveModels
        : MODEL_OPTIONS.map((m) => ({
            id: m.id,
            name: m.label,
            provider: m.provider,
          })),
    [liveModels],
  );

  const selected = options.some((m) => m.id === modelId) ? modelId : options[0]?.id ?? "";
  const groups = useMemo(() => {
    const map = new Map<string, LiveModel[]>();
    for (const model of options) {
      const provider = model.provider || "Puter";
      const list = map.get(provider) ?? [];
      list.push(model);
      map.set(provider, list);
    }
    return [...map.entries()];
  }, [options]);

  return (
    <label className={cn("inline-flex min-w-0 items-center gap-1.5 text-xs text-muted", className)}>
      <span className="hidden shrink-0 sm:inline">โมเดล</span>
      <select
        value={selected}
        onChange={(e) => setModelId(e.target.value)}
        className="min-w-0 max-w-[12rem] truncate rounded-full border border-border bg-surface px-2 py-1 text-xs text-fg outline-none focus:border-accent sm:max-w-[18rem]"
        aria-label="เลือกโมเดล"
        title={options.find((m) => m.id === selected)?.name || selected}
      >
        {groups.map(([provider, models]) => (
          <optgroup key={provider} label={provider}>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name || m.id}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}
