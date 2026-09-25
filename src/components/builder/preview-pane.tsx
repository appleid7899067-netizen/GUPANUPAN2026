import {
  Code2,
  Columns2,
  Download,
  ExternalLink,
  Globe2,
  History,
  Maximize2,
  Minimize2,
  RefreshCw,
  Monitor,
  MousePointer2,
  Smartphone,
  Tablet,
  Activity,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/shallow";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { useBuilder } from "@/lib/builder/store";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { PreviewDevice } from "@/lib/builder/types";
import { DOWNLOAD_MOCK_MESSAGES } from "@/lib/models";
import { publishToPuterSite } from "@/lib/puter-hosting";

const PICKER = `
<script>
(function(){
  let last;
  document.addEventListener('click', function(e){
    var t = e.target;
    if (!t || !t.tagName) return;
    e.preventDefault(); e.stopPropagation();
    if (last) last.style.outline = '';
    t.style.outline = '2px solid #8b5cf6';
    t.style.outlineOffset = '2px';
    last = t;
    var text = (t.innerText || '').trim().slice(0, 80);
    parent.postMessage({ type: 'gupanu-select', tag: t.tagName.toLowerCase(), text: text }, '*');
  }, true);
})();
<\/script>`;

const TELEMETRY_BRIDGE = `
<script>
(function(){
  const send = (payload) => parent.postMessage({ type: 'bossnu-preview-telemetry', ...payload }, '*');
  window.addEventListener('error', (e) => send({ level: 'error', message: e.message || 'Runtime error', stack: e.error && e.error.stack }));
  window.addEventListener('unhandledrejection', (e) => send({ level: 'error', message: String(e.reason && e.reason.message || e.reason || 'Unhandled rejection') }));
  const orig = console.error;
  console.error = function() {
    try { send({ level: 'error', message: Array.from(arguments).map(String).join(' ') }); } catch {}
    return orig.apply(console, arguments);
  };
  window.addEventListener('load', () => send({ level: 'info', message: 'load', readyState: document.readyState }));
})();
<\/script>`;

function withPicker(html: string) {
  if (html.includes("</body>")) return html.replace("</body>", `${PICKER}</body>`);
  return html + PICKER;
}

function withTelemetry(html: string) {
  if (html.includes("</body>")) return html.replace("</body>", `${TELEMETRY_BRIDGE}</body>`);
  return html + TELEMETRY_BRIDGE;
}

const DEVICE_WIDTH: Record<PreviewDevice, string> = {
  desktop: "100%",
  tablet: "768px",
  phone: "390px",
};

const DEVICE_LABEL: Record<PreviewDevice, string> = {
  desktop: "เดสก์ท็อป",
  tablet: "แท็บเล็ต",
  phone: "มือถือ",
};

type PreviewMode = "single" | "dual";

type ConsoleLine = { id: number; level: "error" | "info"; message: string; at: number };

function DeviceFrame({
  device,
  path,
  children,
  className,
}: {
  device: PreviewDevice;
  path?: string;
  children: React.ReactNode;
  className?: string;
}) {
  if (device === "desktop") {
    return (
      <div className={cn("relative flex min-h-full flex-col overflow-hidden rounded-xl bg-surface shadow-border", className)}>
        <div className="flex h-8 shrink-0 items-center gap-1.5 border-b border-border bg-zinc-900/90 px-3">
          <span className="size-2.5 rounded-full bg-red-400/80" />
          <span className="size-2.5 rounded-full bg-amber-400/80" />
          <span className="size-2.5 rounded-full bg-green-400/80" />
          <div className="ml-3 flex h-5 flex-1 items-center rounded-md bg-zinc-800/80 px-2">
            <span className="truncate text-[10px] text-zinc-400">{path || "/"}</span>
          </div>
        </div>
        {children}
      </div>
    );
  }

  if (device === "tablet") {
    return (
      <div className={cn("relative mx-auto flex flex-col overflow-hidden rounded-[1.25rem] border-[3px] border-zinc-700 bg-zinc-900 shadow-2xl", className)} style={{ width: 768, maxWidth: "100%" }}>
        <div className="flex h-6 shrink-0 items-center justify-center border-b border-zinc-700 bg-zinc-900">
          <div className="h-1 w-16 rounded-full bg-zinc-600" />
        </div>
        <div className="relative min-h-0 flex-1 bg-surface">{children}</div>
        <div className="flex h-5 shrink-0 items-center justify-center border-t border-zinc-700 bg-zinc-900">
          <div className="size-2 rounded-full bg-zinc-600" />
        </div>
      </div>
    );
  }

  // phone — notch style
  return (
    <div className={cn("relative mx-auto flex flex-col overflow-hidden rounded-[1.75rem] border-[3px] border-zinc-700 bg-zinc-900 shadow-2xl", className)} style={{ width: 390, maxWidth: "100%" }}>
      <div className="relative flex h-7 shrink-0 items-center justify-center border-b border-zinc-700 bg-zinc-900">
        <div className="absolute left-1/2 top-1.5 h-4 w-24 -translate-x-1/2 rounded-full bg-zinc-950" />
        <span className="absolute left-4 text-[9px] font-medium text-zinc-400">9:41</span>
        <span className="absolute right-4 flex gap-0.5">
          <span className="block h-1.5 w-3 rounded-sm bg-zinc-500" />
          <span className="block h-1.5 w-1 rounded-sm bg-zinc-500" />
        </span>
      </div>
      <div className="relative min-h-0 flex-1 bg-surface">{children}</div>
      <div className="flex h-5 shrink-0 items-center justify-center border-t border-zinc-700 bg-zinc-900">
        <div className="h-1 w-20 rounded-full bg-zinc-600" />
      </div>
    </div>
  );
}

export function PreviewPane() {
  const { project } = useBuilder(useShallow((s) => ({ project: s.projects.find((p) => p.id === s.activeId) ?? null })));
  const device = useBuilder((s) => s.device);
  const setDevice = useBuilder((s) => s.setDevice);
  const tab = useBuilder((s) => s.editorTab);
  const setTab = useBuilder((s) => s.setEditorTab);
  const selectMode = useBuilder((s) => s.selectMode);
  const setSelectMode = useBuilder((s) => s.setSelectMode);
  const restoreVersion = useBuilder((s) => s.restoreVersion);
  const lifecycleState = useBuilder((s) => s.lifecycleState);
  const setDraft = useBuilder((s) => s.setDraft);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [publishBusy, setPublishBusy] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [runKey, setRunKey] = useState(0);
  const [runStatus, setRunStatus] = useState<"idle" | "running" | "ready">("idle");
  const [codeKind, setCodeKind] = useState<"html" | "markdown" | "javascript" | "implementation">("html");
  const [pageIndex, setPageIndex] = useState(0);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("single");
  const [fullscreen, setFullscreen] = useState(false);
  const [consoleLines, setConsoleLines] = useState<ConsoleLine[]>([]);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [flash, setFlash] = useState(false);
  const [loadMs, setLoadMs] = useState<number | null>(null);
  const loadStarted = useRef<number>(0);
  const consoleId = useRef(0);

  const pages = useMemo(() => project?.pages?.length ? project.pages : project ? [{
    id: "home",
    title: project.title || "หน้าแรก",
    path: "/",
    html: project.html,
    markdown: project.markdown,
    javascript: project.javascript,
    implementation: project.implementation,
  }] : [], [project?.pages, project?.title, project?.html, project?.markdown, project?.javascript, project?.implementation]);
  const activePage = pages[Math.min(pageIndex, Math.max(0, pages.length - 1))];
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setPageIndex(0);
  }, [project?.id]);

  useEffect(() => {
    setPreviewLoading(Boolean(activePage?.html));
    setRunStatus(activePage?.html ? "running" : "idle");
    setConsoleLines([]);
    loadStarted.current = performance.now();
    setLoadMs(null);
    setFlash(true);
    const t = window.setTimeout(() => setFlash(false), 600);
    return () => window.clearTimeout(t);
  }, [activePage?.html, activePage?.path, runKey]);

  function runPreview() {
    if (!activePage?.html) return;
    setRunStatus("running");
    setPreviewLoading(true);
    setRunKey((value) => value + 1);
  }

  const srcdoc = useMemo(() => {
    if (!activePage?.html) return "";
    let html = activePage.html;
    html = withTelemetry(html);
    if (!project?.pages?.length) return selectMode ? withPicker(html) : html;
    const router = `<script>
      document.addEventListener("click", function(e) {
        const a = e.target.closest && e.target.closest("a[href]");
        if (!a) return;
        const href = a.getAttribute("href") || "";
        if (href.startsWith("/") && !href.startsWith("//")) {
          e.preventDefault();
          parent.postMessage({ type: "gupanu-page", path: href.split("#")[0] || "/" }, "*");
        }
      }, true);
    <\/script>`;
    const routed = html.includes("</body>") ? html.replace("</body>", router + "</body>") : html + router;
    return selectMode ? withPicker(routed) : routed;
  }, [activePage?.html, project?.pages?.length, selectMode]);

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const data = e.data as {
        type?: string;
        tag?: string;
        text?: string;
        path?: string;
        level?: string;
        message?: string;
      };
      if (data?.type === "gupanu-page" && data.path) {
        const next = pages.findIndex((p) => p.path === data.path);
        if (next >= 0) setPageIndex(next);
        return;
      }
      if (data?.type === "bossnu-preview-telemetry") {
        const level = data.level === "error" ? "error" : "info";
        const message = String(data.message || "");
        if (message === "load") {
          setLoadMs(Math.round(performance.now() - loadStarted.current));
          return;
        }
        setConsoleLines((prev) => {
          const next = [...prev, { id: ++consoleId.current, level, message: message.slice(0, 300), at: Date.now() }];
          return next.slice(-40);
        });
        if (level === "error") setConsoleOpen(true);
        return;
      }
      if (data?.type !== "gupanu-select") return;
      const hint = data.text ? ` (“${data.text}”)` : "";
      setDraft(`แก้ ${data.tag}${hint}: `);
      setSelectMode(false);
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [pages, setDraft, setSelectMode]);

  if (!project) return null;

  const current = project;
  const errorCount = consoleLines.filter((l) => l.level === "error").length;
  const qualityLabel =
    lifecycleState === "DONE" && errorCount === 0
      ? "Verified"
      : lifecycleState === "DONE"
        ? "Verified · warnings"
        : runStatus === "ready"
          ? "Live"
          : runStatus === "running"
            ? "Running"
            : "Idle";

  async function download() {
    if (!current.html.trim()) {
      setDownloadStatus("ยังไม่มีไฟล์ให้ดาวน์โหลด — สร้างแอปก่อน");
      setTimeout(() => setDownloadStatus(null), 2500);
      return;
    }
    for (const msg of DOWNLOAD_MOCK_MESSAGES) {
      setDownloadStatus(msg);
      await new Promise((r) => setTimeout(r, 280));
    }
    const blob = new Blob([current.html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${current.title.replace(/[^\w\u0E00-\u0E7F]+/g, "-").toLowerCase() || "bossnu-app"}.html`;
    a.click();
    URL.revokeObjectURL(url);
    setTimeout(() => setDownloadStatus(null), 2000);
  }

  async function publishSite() {
    if (!current.html.trim() || publishBusy) return;
    if (lifecycleState !== "DONE") {
      setDownloadStatus("ยังเผยแพร่ไม่ได้: ต้องสร้าง → Preview → Verify ให้ผ่านก่อน");
      setTimeout(() => setDownloadStatus(null), 4500);
      return;
    }
    setPublishBusy(true);
          setDownloadStatus("กำลังเผยแพร่ Canvas เวอร์ชันที่ตรวจผ่านไป Puter .site...");
    try {
      const result = await publishToPuterSite(current.html, current.title);
      setDownloadStatus(`Canvas เผยแพร่แล้ว: ${result.url}`);
      window.open(result.url, "_blank", "noopener");
    } catch (error) {
      setDownloadStatus(error instanceof Error ? error.message : "เผยแพร่ .site ไม่สำเร็จ");
    } finally {
      setPublishBusy(false);
      setTimeout(() => setDownloadStatus(null), 6000);
    }
  }

  async function copyCode() {
    const source = codeKind === "html" ? (activePage?.html || current.html) : codeKind === "markdown" ? (activePage?.markdown || current.markdown || "") : codeKind === "javascript" ? (activePage?.javascript || current.javascript || "") : (activePage?.implementation || current.implementation || current.html);
    if (!source) return;
    await navigator.clipboard?.writeText(source);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  function openNew() {
    const blob = new Blob([current.html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
  }

  function renderIframe(keySuffix: string) {
    return (
      <iframe
        key={project.id + ":" + (activePage?.path || "/") + ":" + keySuffix + ":" + runKey}
        ref={keySuffix === device ? frame : undefined}
        title={`พรีวิว-${keySuffix}`}
        srcDoc={srcdoc}
        onLoad={() => {
          setPreviewLoading(false);
          setRunStatus("ready");
          if (loadMs == null) setLoadMs(Math.round(performance.now() - loadStarted.current));
        }}
        sandbox="allow-scripts allow-forms allow-modals allow-popups allow-downloads"
        className="min-h-0 flex-1 bg-surface"
        style={{ width: "100%", minHeight: "100%", border: 0 }}
      />
    );
  }

  const shellClass = fullscreen
    ? "fixed inset-0 z-[80] flex flex-col bg-bg p-2 md:p-3"
    : "flex min-h-0 min-w-0 flex-1 flex-col bg-bg p-2 md:p-3";

  return (
    <section className={shellClass}>
      {downloadStatus ? (
        <div className="mb-2 rounded-lg border border-border bg-muted-fill px-3 py-1.5 text-xs text-fg">
          {downloadStatus}
        </div>
      ) : null}

      {/* Top bar */}
      <div className="mb-2 flex flex-wrap items-center gap-1">
        <div className="flex rounded-full bg-muted-fill p-0.5">
          <button
            type="button"
            onClick={() => setTab("preview")}
            className={cn(
              "h-7 rounded-full px-3 text-xs font-medium",
              tab === "preview" ? "bg-surface text-fg shadow-border" : "text-muted",
            )}
          >
            พรีวิว
          </button>
          <button
            type="button"
            onClick={() => setTab("code")}
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-full px-3 text-xs font-medium",
              tab === "code" ? "bg-surface text-fg shadow-border" : "text-muted",
            )}
          >
            <Code2 className="size-3" /> โค้ด
          </button>
        </div>

        {/* Quality / live status — beyond Grok */}
        <div className="ml-1 hidden items-center gap-1.5 rounded-full border border-white/10 bg-zinc-950/60 px-2.5 py-1 text-[10px] sm:flex">
          <Activity className={cn("size-3", runStatus === "ready" ? "text-emerald-400" : "text-violet-400")} />
          <span className={cn(
            "font-semibold",
            lifecycleState === "DONE" ? "text-emerald-400" : "text-zinc-300",
          )}>
            {qualityLabel}
          </span>
          {loadMs != null ? <span className="text-zinc-500">· {loadMs}ms</span> : null}
          {errorCount > 0 ? <span className="text-red-400">· {errorCount} err</span> : null}
        </div>

        <div className="ml-auto flex items-center gap-0.5">
          <Tooltip label="Canvas แบบคู่ (เดสก์ท็อป + มือถือ)">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Canvas แบบคู่"
              onClick={() => setPreviewMode((m) => (m === "dual" ? "single" : "dual"))}
              className={previewMode === "dual" ? "text-violet-400" : "text-muted"}
            >
              <Columns2 />
            </Button>
          </Tooltip>
          {(["desktop", "tablet", "phone"] as const).map((d) => {
            const Icon = d === "desktop" ? Monitor : d === "tablet" ? Tablet : Smartphone;
            return (
              <Tooltip key={d} label={DEVICE_LABEL[d]}>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={DEVICE_LABEL[d]}
                  onClick={() => {
                    setDevice(d);
                    setPreviewMode("single");
                  }}
                  className={device === d && previewMode === "single" ? "text-fg" : "text-muted"}
                >
                  <Icon />
                </Button>
              </Tooltip>
            );
          })}
          <Tooltip label="เลือกองค์ประกอบ">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="เลือกองค์ประกอบ"
              onClick={() => setSelectMode(!selectMode)}
              className={selectMode ? "text-accent" : "text-muted"}
            >
              <MousePointer2 />
            </Button>
          </Tooltip>
          <div className="relative">
            <Tooltip label="ประวัติ">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="ประวัติ"
                onClick={() => setHistoryOpen((v) => !v)}
              >
                <History />
              </Button>
            </Tooltip>
            {historyOpen ? (
              <div className="absolute right-0 top-9 z-20 w-56 rounded-xl border border-border bg-surface p-2 shadow-border">
                {project.versions.length === 0 ? (
                  <p className="px-2 py-3 text-xs text-muted">ยังไม่มีเวอร์ชัน</p>
                ) : (
                  <ul className="max-h-48 space-y-1 overflow-auto">
                    {[...project.versions].reverse().map((v) => (
                      <li key={v.id}>
                        <button
                          type="button"
                          onClick={() => {
                            restoreVersion(project.id, v.id);
                            setHistoryOpen(false);
                          }}
                          className="flex w-full flex-col rounded-md px-2 py-2 text-left hover:bg-muted-fill"
                        >
                          <span className="truncate text-sm">{v.label}</span>
                          <span className="text-xs text-subtle">{formatRelativeTime(v.createdAt)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </div>
          <Tooltip label="Console">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Console"
              onClick={() => setConsoleOpen((v) => !v)}
              className={errorCount > 0 ? "text-red-400" : consoleOpen ? "text-fg" : "text-muted"}
            >
              <Activity />
            </Button>
          </Tooltip>
          <Tooltip label="ดาวน์โหลด HTML">
            <Button variant="ghost" size="icon-sm" aria-label="ดาวน์โหลด" onClick={() => void download()} disabled={!activePage?.html}>
              <Download />
            </Button>
          </Tooltip>
          <Tooltip label="เผยแพร่ Puter .site">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="เผยแพร่ Puter .site"
              onClick={() => void publishSite()}
              disabled={!project.html || publishBusy || lifecycleState !== "DONE"}
              className={cn(
                publishBusy ? "text-accent" : lifecycleState === "DONE" ? "text-muted" : "text-subtle",
              )}
            >
              <Globe2 />
            </Button>
          </Tooltip>
          <Tooltip label="รีเฟรช Canvas">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="รีเฟรช Canvas"
              onClick={runPreview}
              disabled={!activePage?.html || previewLoading}
              className={previewLoading ? "text-accent" : "text-muted"}
            >
              <RefreshCw className={cn(previewLoading ? "animate-spin" : "")} />
            </Button>
          </Tooltip>
          <Tooltip label="เปิดแท็บใหม่">
            <Button variant="ghost" size="icon-sm" aria-label="เปิดแท็บใหม่" onClick={openNew} disabled={!project.html}>
              <ExternalLink />
            </Button>
          </Tooltip>
          <Tooltip label={fullscreen ? "ออกจากเต็มจอ" : "เต็มจอ"}>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Fullscreen"
              onClick={() => setFullscreen((v) => !v)}
              className={fullscreen ? "text-violet-400" : "text-muted"}
            >
              {fullscreen ? <Minimize2 /> : <Maximize2 />}
            </Button>
          </Tooltip>
        </div>
      </div>

      {tab === "preview" && pages.length > 1 ? (
        <div className="mb-2 flex items-center gap-1 overflow-x-auto rounded-lg bg-muted-fill p-1">
          {pages.map((page, index) => (
            <button
              key={page.id}
              type="button"
              onClick={() => setPageIndex(index)}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                index === pageIndex ? "bg-surface text-fg shadow-border" : "text-muted hover:text-fg",
              )}
            >
              {page.title}
            </button>
          ))}
        </div>
      ) : null}

      <div className={cn(
        "relative min-h-0 flex-1 overflow-hidden rounded-xl bg-surface shadow-border",
        flash && "ring-2 ring-violet-500/50 transition-shadow duration-500",
      )}>
        {!project.html ? (
          <div className="flex h-full flex-col items-center justify-center px-8 text-center">
            <p className="text-sm text-muted">Canvas จะแสดงแอปเดียวกับที่แชทกำลังแก้</p>
            <p className="mt-1 text-xs text-subtle">Chat ↔ Canvas · Dual device · Live console</p>
          </div>
        ) : tab === "code" ? (
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-border bg-muted-fill/50 p-1.5">
              {([
                ["html", "HTML"],
                ["markdown", "Markdown"],
                ["javascript", "JS"],
                ["implementation", "Implementation"],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCodeKind(key)}
                  className={cn(
                    "shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium",
                    codeKind === key ? "bg-surface text-fg shadow-border" : "text-muted hover:text-fg",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-end border-b border-border bg-muted-fill/30 px-2 py-1">
              <Button variant="ghost" size="sm" onClick={() => void copyCode()} className="h-7 text-[11px]">
                {copied ? "✓ คัดลอกแล้ว" : "Copy Code"}
              </Button>
            </div>
            <pre className="min-h-0 flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed text-fg">
              {codeKind === "html"
                ? (activePage?.html || project.html)
                : codeKind === "markdown"
                  ? (activePage?.markdown || project.markdown || "ยังไม่มี Markdown จากการสร้างครั้งนี้")
                  : codeKind === "javascript"
                    ? (activePage?.javascript || project.javascript || "ยังไม่มี JavaScript จากการสร้างครั้งนี้")
                    : (activePage?.implementation || project.implementation || activePage?.html || project.html)}
            </pre>
          </div>
        ) : (
          <div className="relative flex h-full min-h-0 justify-center overflow-auto bg-[radial-gradient(circle_at_top,rgba(139,92,246,.08),transparent_42%)] p-2 sm:p-4">
            {previewMode === "dual" ? (
              <div className="flex w-full min-h-full flex-col gap-3 lg:flex-row lg:items-stretch">
                <div className="flex min-h-[320px] min-w-0 flex-1 flex-col">
                  <div className="mb-1 text-center text-[10px] font-medium uppercase tracking-wider text-zinc-500">Desktop</div>
                  <DeviceFrame device="desktop" path={activePage?.path}>
                    {renderIframe("desktop")}
                  </DeviceFrame>
                </div>
                <div className="flex min-h-[320px] w-full shrink-0 flex-col lg:w-[400px]">
                  <div className="mb-1 text-center text-[10px] font-medium uppercase tracking-wider text-zinc-500">Phone</div>
                  <DeviceFrame device="phone" path={activePage?.path}>
                    {renderIframe("phone")}
                  </DeviceFrame>
                </div>
              </div>
            ) : (
              <div
                className={cn(
                  "relative flex min-h-full shrink-0 flex-col transition-[width] duration-200",
                  device === "desktop" ? "w-full" : "max-w-full",
                )}
                style={device === "desktop" ? { width: "100%" } : { width: DEVICE_WIDTH[device] }}
              >
                <DeviceFrame device={device} path={activePage?.path}>
                  {previewLoading && srcdoc ? (
                    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-surface/60 backdrop-blur-[2px]">
                      <div className="rounded-full bg-muted-fill px-3 py-1.5 text-[11px] text-muted shadow-border">กำลังโหลดพรีวิว…</div>
                    </div>
                  ) : null}
                  {renderIframe(device)}
                </DeviceFrame>
              </div>
            )}
          </div>
        )}

        {selectMode && tab === "preview" ? (
          <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-violet-500 px-2.5 py-1 text-[11px] font-medium text-white shadow-lg">
            คลิกองค์ประกอบเพื่อแก้ไข
          </div>
        ) : null}

        {/* Live console overlay — beyond Grok */}
        {consoleOpen && tab === "preview" ? (
          <div className="absolute bottom-0 left-0 right-0 z-20 max-h-40 overflow-auto border-t border-border bg-zinc-950/95 p-2 backdrop-blur-md">
            <div className="mb-1 flex items-center justify-between px-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Live Console</span>
              <button type="button" className="text-[10px] text-zinc-500 hover:text-zinc-300" onClick={() => setConsoleLines([])}>
                Clear
              </button>
            </div>
            {consoleLines.length === 0 ? (
              <p className="px-1 text-[11px] text-zinc-600">ไม่มี log — runtime errors จะโชว์ที่นี่อัตโนมัติ</p>
            ) : (
              <ul className="space-y-0.5 font-mono text-[10px]">
                {consoleLines.map((line) => (
                  <li key={line.id} className={line.level === "error" ? "text-red-400" : "text-zinc-400"}>
                    <span className="text-zinc-600">{new Date(line.at).toLocaleTimeString()}</span>{" "}
                    {line.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
