import type { ProjectFile, ProjectSource } from "./types";

export const DEFAULT_PROJECT_FILES: ProjectFile[] = [
  {
    path: "package.json",
    language: "json",
    kind: "config",
    content: JSON.stringify(
      {
        private: true,
        type: "module",
        scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
        dependencies: { react: "^19.2.0", "react-dom": "^19.2.0" },
        devDependencies: { "@vitejs/plugin-react": "^5.2.0", vite: "^8.2.0", typescript: "^5.7.0" },
      },
      null,
      2,
    ),
  },
  {
    path: "index.html",
    language: "html",
    kind: "config",
    content: "<!doctype html><html><head><meta charset=\"UTF-8\" /><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" /><title>App</title></head><body><div id=\"root\"></div><script type=\"module\" src=\"/src/main.tsx\"></script></body></html>",
  },
  {
    path: "src/main.tsx",
    language: "tsx",
    kind: "source",
    content: 'import { StrictMode } from "react";\nimport { createRoot } from "react-dom/client";\nimport App from "./App";\n\ncreateRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);\n',
  },
  {
    path: "src/App.tsx",
    language: "tsx",
    kind: "source",
    content: 'export default function App() {\n  return <main><h1>New App</h1></main>;\n}\n',
  },
  {
    path: "src/index.css",
    language: "css",
    kind: "style",
    content: '@import "tailwindcss";\n\n:root { font-family: system-ui, sans-serif; }\nbody { margin: 0; min-width: 320px; }\n',
  },
  {
    path: "vite.config.ts",
    language: "ts",
    kind: "config",
    content: 'import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react";\n\nexport default defineConfig({ plugins: [react()] });\n',
  },
];

export function createReactViteSource(now = Date.now()): ProjectSource {
  return {
    files: DEFAULT_PROJECT_FILES.map((file) => ({ ...file })),
    entryFile: "src/App.tsx",
    framework: "react-vite",
    packageManager: "npm",
    updatedAt: now,
  };
}

export function upsertProjectFile(source: ProjectSource, file: ProjectFile): ProjectSource {
  const files = source.files.some((item) => item.path === file.path)
    ? source.files.map((item) => (item.path === file.path ? file : item))
    : [...source.files, file];
  return { ...source, files, updatedAt: Date.now() };
}

export function removeProjectFile(source: ProjectSource, path: string): ProjectSource {
  return { ...source, files: source.files.filter((file) => file.path !== path), updatedAt: Date.now() };
}
