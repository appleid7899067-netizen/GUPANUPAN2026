import { uid } from "@/lib/utils";
import { streamGenerate } from "./generate-client";
import { extractDisplayText, extractHtml, extractSuggestions, extractTitle } from "./parse";
import { useBuilder } from "./store";
import type { ExampleApp } from "./templates";

export async function sendPrompt(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return;

  const store = useBuilder.getState();
  if (store.generating) return;

  let id = store.activeId;
  let html = "";
  let history: { role: "user" | "assistant"; content: string }[] = [];

  if (!id) {
    id = store.createAndActivate({ title: trimmed.slice(0, 48) });
  } else {
    const project = store.projects.find((p) => p.id === id);
    html = project?.html ?? "";
    history = (project?.messages ?? []).map((m) => ({ role: m.role, content: m.content }));
  }

  store.pushMessage(id, {
    id: uid(),
    role: "user",
    content: trimmed,
    createdAt: Date.now(),
  });
  store.setDraft("");
  store.setGenerating(true);
  store.setStreamText("");
  store.setSuggestions(id, []);
  store.setMobilePane("chat");
  store.setSelectMode(false);

  try {
    const full = await streamGenerate(
      { prompt: trimmed, html, history },
      (t) => useBuilder.getState().setStreamText(t),
    );
    const nextHtml = extractHtml(full);
    const display = extractDisplayText(full);
    const suggestions = extractSuggestions(full);

    store.pushMessage(id, {
      id: uid(),
      role: "assistant",
      content: display || (nextHtml ? "Ready. Take a look at the preview." : "I need a bit more detail before building."),
      createdAt: Date.now(),
    });

    if (nextHtml) {
      store.setHtml(id, nextHtml, trimmed.slice(0, 42));
      const project = useBuilder.getState().projects.find((p) => p.id === id);
      if (project && (project.title === "Untitled" || project.messages.filter((m) => m.role === "user").length <= 1)) {
        store.renameProject(id, extractTitle(nextHtml, project.title));
      }
      store.setMobilePane("preview");
    }
    store.setSuggestions(id, suggestions);
  } catch (err) {
    let message = err instanceof Error ? err.message : "Something went wrong.";
    if (/PUTER_SIGN_IN|Sign in with Puter/i.test(message)) {
      message = "กรุณาล็อกอิน Puter (มุมขวาบน) เพื่อใช้โมเดลฟรี";
    }
    store.pushMessage(id, {
      id: uid(),
      role: "assistant",
      content: message,
      createdAt: Date.now(),
    });
  } finally {
    store.setGenerating(false);
    store.setStreamText("");
  }
}

export function openExample(example: ExampleApp) {
  const store = useBuilder.getState();
  store.createAndActivate({
    title: example.name,
    html: example.html,
    messages: [
      {
        id: uid(),
        role: "user",
        content: `Start from the ${example.name} example.`,
        createdAt: Date.now(),
      },
      {
        id: uid(),
        role: "assistant",
        content: `${example.name} is ready in the preview. Tell me what to change, or pick a suggestion below.`,
        createdAt: Date.now(),
      },
    ],
    suggestions: [
      { label: "Restyle it", prompt: `Give ${example.name} a bolder visual identity while keeping the same features.` },
      { label: "Add dark mode", prompt: "Add a dark mode toggle and remember the preference." },
      { label: "Add a page", prompt: "Add another section or screen that this product would naturally have." },
      { label: example.prompt.split(":")[0] ?? "Remix", prompt: example.prompt },
    ],
    versions: [
      {
        id: uid(),
        html: example.html,
        label: "Example",
        createdAt: Date.now(),
      },
    ],
  });
  store.setEditorTab("preview");
  store.setMobilePane("preview");
}
