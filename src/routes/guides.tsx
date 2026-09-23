import { createFileRoute, Link } from "@tanstack/react-router";
import { FeatureGrid, Marketing } from "@/components/builder/marketing";

export const Route = createFileRoute("/guides")({ component: GuidesPage });

function GuidesPage() {
  return (
    <Marketing
      eyebrow="Guides"
      title="How to get a better first build"
      lead="Forge does the designing. Your job is to say what the thing is for, who it is for, and what should happen on the first visit."
    >
      <FeatureGrid
        heading="Writing a prompt"
        items={[
          {
            title: "Name the product",
            body: "“A recipe book for weeknight cooking” beats “a website.” Kind, audience, and job-to-be-done give Forge something to design around.",
          },
          {
            title: "Mention the must-haves",
            body: "If it needs search, dark mode, or saving between visits, say so. Anything you skip will be filled with conventional defaults.",
          },
          {
            title: "Describe the feeling, not the hex codes",
            body: "“Quiet, paper, editorial” is more useful than a list of fonts. You can always restyle after the first preview.",
          },
          {
            title: "Iterate in small turns",
            body: "Get a first version, then ask for one change at a time: a new section, a different layout, a bug you noticed in the preview.",
          },
        ]}
      />
      <section className="rounded-xl bg-surface p-5 shadow-border">
        <h2 className="text-lg font-semibold">A walkthrough</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-muted">
          <li>Open Forge and type a sentence, or pick an example app from the gallery.</li>
          <li>Wait for the live preview. Click around — this is the real app, not a mock.</li>
          <li>Use Select to point at an element, or type a follow-up in the chat.</li>
          <li>Restore a version if you liked an earlier pass better.</li>
          <li>Download the HTML when you want to keep it, or open it in a new tab to share a look.</li>
        </ol>
        <p className="mt-5 text-sm">
          <Link to="/" className="font-medium text-accent hover:underline">
            Start a project
          </Link>
        </p>
      </section>
    </Marketing>
  );
}
