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

export type AppPage = {
  id: string;
  title: string;
  path: string;
  html: string;
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
export type EditorTab = "preview" | "code";
export type MobilePane = "chat" | "preview";


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
