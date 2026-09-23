import { createFileRoute } from "@tanstack/react-router";
import { FeatureGrid, Marketing } from "@/components/builder/marketing";

export const Route = createFileRoute("/features")({ component: FeaturesPage });

function FeaturesPage() {
  return (
    <Marketing
      eyebrow="Features"
      title="Everything the builder does"
      lead="A working first version from a sentence, a live preview beside the chat, and tools to refine what you see. Projects stay in this browser until you download them."
    >
      <FeatureGrid
        heading="Building"
        items={[
          {
            title: "Plain-language builds",
            body: "Describe an app or a site and get a complete first version: layout, logic, and sensible default content — not a skeleton.",
          },
          {
            title: "Follow-up chat",
            body: "Ask for a darker palette, a new section, or a bug fix. Each turn returns the full updated page.",
          },
          {
            title: "Starter ideas",
            body: "Tap a chip — to-do list, portfolio, timer, recipe book — to drop a detailed prompt into the composer.",
          },
          {
            title: "Example apps",
            body: "Open a finished example and remix it. The preview is live immediately so you can start from something real.",
          },
        ]}
      />
      <FeatureGrid
        heading="Preview and editing"
        items={[
          {
            title: "Live preview",
            body: "The app runs beside the conversation. Click through it, type into it, and use it the way a visitor would.",
          },
          {
            title: "Select to edit",
            body: "Point at an element in the preview and tell Forge exactly what to change, without hunting through code.",
          },
          {
            title: "Device frames",
            body: "Switch the preview between desktop, tablet, and phone widths while you refine the layout.",
          },
          {
            title: "Code view",
            body: "Open the HTML whenever you want to read or copy it. Download a single file you can host anywhere.",
          },
        ]}
      />
      <FeatureGrid
        heading="History"
        items={[
          {
            title: "Version snapshots",
            body: "Every successful build is saved. Restore an earlier version if an experiment goes sideways.",
          },
          {
            title: "Project list",
            body: "All of your conversations live in the sidebar, searchable, and stored locally on this device.",
          },
        ]}
      />
    </Marketing>
  );
}
