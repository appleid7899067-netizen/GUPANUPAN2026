import { create } from "zustand";
import { persist } from "zustand/middleware";
import { uid } from "@/lib/utils";
import { DEFAULT_MODEL_ID } from "@/lib/models";
import type {
  ChatMessage,
  EditorTab,
  MobilePane,
  PreviewDevice,
  Project,
  Suggestion,
  ThemeChoice,
  Version,
  AgentActivity,
} from "./types";

const MAX_PROJECTS = 24;
const MAX_VERSIONS = 12;

function emptyProject(partial?: Partial<Project>): Project {
  const now = Date.now();
  return {
    id: uid(),
    title: "Untitled",
    messages: [],
    html: "",
    versions: [],
    suggestions: [],
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

type BuilderState = {
  projects: Project[];
  activeId: string | null;
  theme: ThemeChoice;
  device: PreviewDevice;
  editorTab: EditorTab;
  mobilePane: MobilePane;
  sidebarOpen: boolean;
  selectMode: boolean;
  generating: boolean;
  streamText: string;
  generatingStatus: string;
  draft: string;
  activities: Record<string, AgentActivity[]>;
  modelId: string;
  setModelId: (id: string) => void;
  setTheme: (theme: ThemeChoice) => void;
  setDevice: (device: PreviewDevice) => void;
  setEditorTab: (tab: EditorTab) => void;
  setMobilePane: (pane: MobilePane) => void;
  setSidebarOpen: (open: boolean) => void;
  setSelectMode: (on: boolean) => void;
  setDraft: (draft: string) => void;
  setGenerating: (on: boolean) => void;
  setStreamText: (text: string) => void;
  setGeneratingStatus: (status: string) => void;
  pushActivity: (id: string, activity: AgentActivity) => void;
  clearActivities: (id: string) => void;
  newProject: () => void;
  createAndActivate: (seed?: Partial<Project>) => string;
  setActive: (id: string | null) => void;
  deleteProject: (id: string) => void;
  renameProject: (id: string, title: string) => void;
  pushMessage: (id: string, message: ChatMessage) => void;
  setHtml: (id: string, html: string, versionLabel?: string) => void;
  setSuggestions: (id: string, suggestions: Suggestion[]) => void;
  restoreVersion: (id: string, versionId: string) => void;
  active: () => Project | null;
};

export const useBuilder = create<BuilderState>()(
  persist(
    (set, get) => ({
      projects: [],
      activeId: null,
      theme: "system",
      device: "desktop",
      editorTab: "preview",
      mobilePane: "chat",
      sidebarOpen: false,
      selectMode: false,
      generating: false,
      streamText: "",
      generatingStatus: "",
      draft: "",
      activities: {},
      modelId: DEFAULT_MODEL_ID,
      setModelId: (modelId) => set({ modelId }),
      setTheme: (theme) => set({ theme }),
      setDevice: (device) => set({ device }),
      setEditorTab: (editorTab) => set({ editorTab }),
      setMobilePane: (mobilePane) => set({ mobilePane }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setSelectMode: (selectMode) => set({ selectMode }),
      setDraft: (draft) => set({ draft }),
      setGenerating: (generating) => set({ generating }),
      setStreamText: (streamText) => set({ streamText }),
      setGeneratingStatus: (generatingStatus) => set({ generatingStatus }),
      pushActivity: (id, activity) =>
        set((s) => ({
          activities: {
            ...s.activities,
            [id]: [...(s.activities[id] ?? []), activity].slice(-20),
          },
        })),
      clearActivities: (id) =>
        set((s) => ({
          activities: { ...s.activities, [id]: [] },
        })),
      newProject: () =>
        set({
          activeId: null,
          draft: "",
          streamText: "",
          generatingStatus: "",
          generating: false,
          editorTab: "preview",
          mobilePane: "chat",
          sidebarOpen: false,
          selectMode: false,
        }),
      createAndActivate: (seed) => {
        const project = emptyProject(seed);
        set((s) => ({
          projects: [project, ...s.projects].slice(0, MAX_PROJECTS),
          activeId: project.id,
          draft: "",
          streamText: "",
          generating: false,
          editorTab: "preview",
          mobilePane: "chat",
          sidebarOpen: false,
        }));
        return project.id;
      },
      setActive: (id) =>
        set({
          activeId: id,
          sidebarOpen: false,
          streamText: "",
          generating: false,
          editorTab: "preview",
          mobilePane: "chat",
          selectMode: false,
        }),
      deleteProject: (id) =>
        set((s) => {
          const projects = s.projects.filter((p) => p.id !== id);
          return {
            projects,
            activeId: s.activeId === id ? null : s.activeId,
          };
        }),
      renameProject: (id, title) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, title, updatedAt: Date.now() } : p,
          ),
        })),
      pushMessage: (id, message) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id
              ? { ...p, messages: [...p.messages, message], updatedAt: Date.now() }
              : p,
          ),
        })),
      setHtml: (id, html, versionLabel) =>
        set((s) => ({
          projects: s.projects.map((p) => {
            if (p.id !== id) return p;
            const version: Version = {
              id: uid(),
              html,
              label: versionLabel || `Version ${p.versions.length + 1}`,
              createdAt: Date.now(),
            };
            return {
              ...p,
              html,
              versions: [...p.versions, version].slice(-MAX_VERSIONS),
              updatedAt: Date.now(),
            };
          }),
        })),
      setSuggestions: (id, suggestions) =>
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, suggestions } : p)),
        })),
      restoreVersion: (id, versionId) =>
        set((s) => ({
          projects: s.projects.map((p) => {
            if (p.id !== id) return p;
            const v = p.versions.find((x) => x.id === versionId);
            if (!v) return p;
            return { ...p, html: v.html, updatedAt: Date.now() };
          }),
        })),
      active: () => {
        const s = get();
        return s.projects.find((p) => p.id === s.activeId) ?? null;
      },
    }),
    {
      name: "gupanu-builder",
      partialize: (s) => ({
        projects: s.projects,
        activeId: s.activeId,
        theme: s.theme,
        modelId: s.modelId,
        activities: s.activities,
      }),
    },
  ),
);
