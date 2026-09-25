import {
  Code2,
  Download,
  ExternalLink,
  Globe2,
  History,
  Monitor,
  MousePointer2,
  Smartphone,
  Tablet,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
    t.style.outline = '2px solid #1f4e8c';
    t.style.outlineOffset = '2px';
    last = t;
    var text = (t.innerText || '').trim().slice(0, 80);
    parent.postMessage({ type: 'gupanu-select', tag: t.tagName.toLowerCase(), text: text }, '*');
  }, true);
})();
<\/script>`;

function withPicker(html: string) {
  if (html.includes("</body>")) return html.replace("</body>", `${PICKER}</body>`);
  return html + PICKER;
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

export function PreviewPane() {
  const project = useBuilder((s) => s.projects.find((p) => p.id === s.activeId) ?? null);
  const device = useBuilder((s) => s.device);
  const setDevice = useBuilder((s) => s.setDevice);
  const tab = useBuilder((s) => s.editorTab);
  const setTab = useBuilder((s) => s.setEditorTab);
  const selectMode = useBuilder((s) => s.selectMode);
  const setSelectMode = useBuilder((s) => s.setSelectMode);
  const restoreVersion = useBuilder((s) => s.restoreVersion);
  const setDraft = useBuilder((s) => s.setDraft);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);
  const [publishBusy, setPublishBusy] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [codeKind, setCodeKind] = useState<"html" | "markdown" | "javascript" | "implementation">("html");
  const [pageIndex, setPageIndex] = useState(0);
  const pages = project?.pages?.length ? project.pages : project ? [{
    id: "home",
    title: project.title || "หน้าแรก",
    path: "/",
    html: project.html,
    markdown: project.markdown,
    javascript: project.javascript,
    implementation: project.implementation,
  }] : [];
  const activePage = pages[Math.min(pageIndex, Math.max(0, pages.length - 1))];
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setPageIndex(0);
  }, [project?.id]);

  useEffect(() => {
    setPreviewLoading(Boolean(activePage?.html));
  }, [activePage?.html, activePage?.path]);

  const srcdoc = useMemo(() => {
    if (!activePage?.html) return "";
    const html = activePage.html;
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
      const data = e.data as { type?: string; tag?: string; text?: string; path?: string };
      if (data?.type === "gupanu-page" && data.path) {
        const next = pages.findIndex((p) => p.path === data.path);
        if (next >= 0) setPageIndex(next);
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
    a.download = `${current.title.replace(/[^\w\u0E00-\u0E7F]+/g, "-").toLowerCase() || "gupanu-app"}.html`;
    a.click();
    URL.revokeObjectURL(url);
    setTimeout(() => setDownloadStatus(null), 2000);
  }

  async function publishSite() {
    if (!current.html.trim() || publishBusy) return;
    setPublishBusy(true);
    setDownloadStatus("กำลังเผยแพร่ไป Puter .site...");
    try {
      const result = await publishToPuterSite(current.html, current.title);
      setDownloadStatus(`เผยแพร่แล้ว: ${result.url}`);
      window.open(result.url, "_blank", "noopener");
    } catch (error) {
      setDownloadStatus(error instanceof Error ? error.message : "เผยแพร่ .site ไม่สำเร็จ");
    } finally {
      setPublishBusy(false);
      setTimeout(() => setDownloadStatus(null), 6000);
    }
  }

  function openNew() {
    const blob = new Blob([current.html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
  }

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-bg p-2 md:p-3">
      {downloadStatus ? (
        <div className="mb-2 rounded-lg border border-border bg-muted-fill px-3 py-1.5 text-xs text-fg">
          {downloadStatus}
        </div>
      ) : null}
      <div className="mb-2 flex items-center gap-1">
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
        <div className="ml-auto flex items-center gap-0.5">
          {(["desktop", "tablet", "phone"] as const).map((d) => {
            const Icon = d === "desktop" ? Monitor : d === "tablet" ? Tablet : Smartphone;
            return (
              <Tooltip key={d} label={DEVICE_LABEL[d]}>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={DEVICE_LABEL[d]}
                  onClick={() => setDevice(d)}
                  className={device === d ? "text-fg" : "text-muted"}
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
              disabled={!project.html || publishBusy}
              className={publishBusy ? "text-accent" : "text-muted"}
            >
              <Globe2 />
            </Button>
          </Tooltip>
          <Tooltip label="เปิดแท็บใหม่">
            <Button variant="ghost" size="icon-sm" aria-label="เปิดแท็บใหม่" onClick={openNew} disabled={!project.html}>
              <ExternalLink />
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

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl bg-surface shadow-border">
        {!project.html ? (
          <div className="flex h-full flex-col items-center justify-center px-8 text-center">
            <p className="text-sm text-muted">แอปจะแสดงที่นี่เมื่อ GuPanu สร้างเสร็จ</p>
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
            <div
              className={cn(
                "relative flex min-h-full shrink-0 flex-col overflow-hidden rounded-xl bg-surface shadow-border transition-[width] duration-200",
                device === "desktop" ? "w-full" : "max-w-full border border-border",
              )}
              style={{ width: DEVICE_WIDTH[device] }}
            >
              {device !== "desktop" ? (
                <div className="flex h-7 shrink-0 items-center gap-1 border-b border-border bg-muted-fill px-2">
                  <span className="size-1.5 rounded-full bg-red-400/70" />
                  <span className="size-1.5 rounded-full bg-amber-400/70" />
                  <span className="size-1.5 rounded-full bg-green-400/70" />
                  <span className="ml-2 truncate text-[9px] text-subtle">{activePage?.path || "/"}</span>
                </div>
              ) : null}
              {previewLoading && srcdoc ? (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-surface/60 backdrop-blur-[2px]">
                  <div className="rounded-full bg-muted-fill px-3 py-1.5 text-[11px] text-muted shadow-border">กำลังโหลดพรีวิว…</div>
                </div>
              ) : null}
              <iframe
                key={project.id + ":" + (activePage?.path || "/") + ":" + device}
                ref={frame}
                title="พรีวิวสด"
                srcDoc={srcdoc}
                onLoad={() => setPreviewLoading(false)}
                sandbox="allow-scripts allow-forms allow-modals allow-popups allow-downloads"
                className="min-h-0 flex-1 bg-surface"
                style={{ width: "100%", minHeight: "100%" }}
              />
            </div>
          </div>
        )}
        {selectMode && tab === "preview" ? (
          <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-fg">
            คลิกองค์ประกอบเพื่อแก้ไข
          </div>
        ) : null}
      </div>
    </section>
  );
}
