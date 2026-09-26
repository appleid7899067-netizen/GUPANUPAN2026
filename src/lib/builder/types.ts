export type ChatRole = "user" | "assistant";

export type Suggestion = {
  label: string;
  prompt: string;
};

export type DocumentContext = {
  id: string;
  name: string;
  type: string;
  size: number;
  text?: string;
  status: "ready" | "metadata";
  createdAt: number;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
};

export type ProjectFile = {
  path: string;
  content: string;
  language?: string;
  kind?: "source" | "config" | "style" | "asset" | "test";
};

export type CanvasComponent = {
  id: string;
  type: string;
  props?: Record<string, unknown>;
  children?: CanvasComponent[];
};

export type CanvasPage = {
  id: string;
  title: string;
  path: string;
  components: CanvasComponent[];
};

export type CanvasStackEntry = { id: string };

/** Intent Graph operations — behavior, not markup. */
export type CanvasPatch =
  | { op: "addComponent"; pageId: string; component: CanvasComponent; at?: number }
  | { op: "updateComponent"; pageId: string; componentId: string; props: Record<string, unknown> }
  | { op: "removeComponent"; pageId: string; componentId: string }
  | { op: "addPage"; page: CanvasPage }
  | { op: "updateTheme"; theme: Record<string, string> }
  | { op: "pushRoute"; pageId: string }
  | { op: "setPage"; pageId: string }
  | { op: "preload"; pageIds: string[] };

export type CanvasState = {
  pages: Record<string, CanvasPage>;
  stack: CanvasStackEntry[];
  theme: Record<string, string>;
  /** Pages the Intent Engine thinks the user will open next */
  preloaded?: string[];
};

/** Full Intent Graph response from the model (or local engine). */
export type IntentResult = {
  thought: string;
  operations: CanvasPatch[];
  nextPredict?: { preload?: string[] };
  reply: string;
};

export type ProjectSource = {
  files: ProjectFile[];
  entryFile: string;
  framework: "react-vite" | "nextjs" | "unknown";
  packageManager: "npm" | "pnpm" | "yarn" | "unknown";
  updatedAt: number;
};

export type AppPage = {
  id: string;
  title: string;
  path: string;
  /** @deprecated Legacy artifact. New builds must use source.files. */
  html: string;
  source?: ProjectSource;
  markdown?: string;
  javascript?: string;
  implementation?: string;
};

export type Version = {
  id: string;
  html: string;
  markdown?: string;
  javascript?: string;
  implementation?: string;
  label: string;
  createdAt: number;
};

export type Project = {
  id: string;
  title: string;
  messages: ChatMessage[];
  canvas: CanvasState;
  html: string;
  markdown?: string;
  javascript?: string;
  implementation?: string;
  pages?: AppPage[];
  versions: Version[];
  suggestions: Suggestion[];
  documents?: DocumentContext[];
  lifecycleState?: BuilderLifecycleState;
  createdAt: number;
  updatedAt: number;
};

export type ThemeChoice = "light" | "dark" | "system";
export type PreviewDevice = "desktop" | "tablet" | "phone";
export type EditorTab = "preview" | "code" | "files";
export type MobilePane = "chat" | "app";

export type AgentActivityStatus = "working" | "success" | "error" | "fixing" | "verifying";
export type BuilderLifecycleState =
  | "GOAL" | "PLANNING" | "BUILDING" | "GENERATED" | "PREVIEWING" | "PREVIEWED"
  | "VERIFYING" | "VERIFIED" | "DONE" | "FAILED" | "ANALYZING" | "REPAIRING";

export type AgentActivity = {
  id: string;
  label: string;
  detail?: string;
  status: AgentActivityStatus;
  createdAt: number;
};
