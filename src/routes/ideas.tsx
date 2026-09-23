import { createFileRoute } from "@tanstack/react-router";
import { Marketing } from "@/components/builder/marketing";
import { STARTERS } from "@/lib/builder/starters";
import { useBuilder } from "@/lib/builder/store";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/ideas")({ component: IdeasPage });

function IdeasPage() {
  const setDraft = useBuilder((s) => s.setDraft);
  const newProject = useBuilder((s) => s.newProject);
  const navigate = useNavigate();

  return (
    <Marketing
      eyebrow="What to build"
      title="A dozen starting points"
      lead="Each idea is a complete prompt. Tap one to drop it into Forge and start a build."
    >
      <ul className="grid gap-3 sm:grid-cols-2">
        {STARTERS.map((s) => (
          <li key={s.label}>
            <button
              type="button"
              onClick={() => {
                newProject();
                setDraft(s.prompt);
                void navigate({ to: "/" });
              }}
              className="h-full w-full rounded-xl bg-surface p-4 text-left shadow-border transition-[box-shadow] hover:shadow-border-hover"
            >
              <h2 className="text-sm font-semibold">{s.label}</h2>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{s.prompt}</p>
            </button>
          </li>
        ))}
      </ul>
    </Marketing>
  );
}
