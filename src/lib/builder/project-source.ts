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
        scripts: { dev: "next dev", build: "next build", start: "next start" },
        dependencies: { react: "^19.2.0", "react-dom": "^19.2.0" },
        devDependencies: { next: "latest", typescript: "^5.7.0", "@types/react": "^19.2.0", "@types/node": "^22.16.5" },
      },
      null,
      2,
    ),
  },
  {
    path: "src/app/layout.tsx",
    language: "tsx",
    kind: "source",
    content: 'import type { ReactNode } from "react";\nimport "./globals.css";\n\nexport default function RootLayout({ children }: { children: ReactNode }) {\n  return <html lang="th"><body>{children}</body></html>;\n}\n',
  },
  {
    path: "src/app/page.tsx",
    language: "tsx",
    kind: "source",
    content: 'export default function HomePage() {\n  return <main><h1>New App</h1></main>;\n}\n',
  },
  {
    path: "src/app/globals.css",
    language: "css",
    kind: "style",
    content: ':root { font-family: system-ui, sans-serif; }\nbody { margin: 0; min-width: 320px; }\n',
  },
  {
    path: "next.config.ts",
    language: "ts",
    kind: "config",
    content: 'import type { NextConfig } from "next";\nconst nextConfig: NextConfig = {};\nexport default nextConfig;\n',
  },
];

export function createReactViteSource(now = Date.now()): ProjectSource {
  return {
    files: DEFAULT_PROJECT_FILES.map((file) => ({ ...file })),
    entryFile: "src/app/page.tsx",
    framework: "nextjs",
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
