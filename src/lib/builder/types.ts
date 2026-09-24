export type ChatRole = "user" | "assistant";

export type Suggestion = {
  label: string;
  prompt: string;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
};

export type Version = {
  id: string;
  html: string;
  label: string;
  createdAt: number;
};

export type Project = {
  id: string;
  title: string;
  messages: ChatMessage[];
  html: string;
  versions: Version[];
  suggestions: Suggestion[];
  createdAt: number;
  updatedAt: number;
};

export type ThemeChoice = "light" | "dark" | "system";
export type PreviewDevice = "desktop" | "tablet" | "phone";
export type EditorTab = "preview" | "code";
export type MobilePane = "chat" | "preview";


export type AgentActivityStatus = "working" | "success" | "error" | "fixing" | "verifying";

export type AgentActivity = {
  id: string;
  label: string;
  detail?: string;
  status: AgentActivityStatus;
  createdAt: number;
};
