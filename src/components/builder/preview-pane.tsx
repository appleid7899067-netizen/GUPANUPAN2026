import {
  Code2,
  Download,
  ExternalLink,
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
  const frame = useRef<HTMLIFrameElement>(null);

  const srcdoc = useMemo(() => {
    if (!project?.html) return "";
    return selectMode ? withPicker(project.html) : project.html;
  }, [project?.html, selectMode]);

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const data = e.data as { type?: string; tag?: string; text?: string };
      if (data?.type !== "gupanu-select") return;
      const hint = data.text ? ` (“${data.text}”)` : "";
      setDraft(`แก้ ${data.tag}${hint}: `);
      setSelectMode(false);
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [setDraft, setSelectMode]);

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
            <Button variant="ghost" size="icon-sm" aria-label="ดาวน์โหลด" onClick={() => void download()} disabled={!project.html}>
              <Download />
            </Button>
          </Tooltip>
          <Tooltip label="เปิดแท็บใหม่">
            <Button variant="ghost" size="icon-sm" aria-label="เปิดแท็บใหม่" onClick={openNew} disabled={!project.html}>
              <ExternalLink />
            </Button>
          </Tooltip>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl bg-surface shadow-border">
        {!project.html ? (
          <div className="flex h-full flex-col items-center justify-center px-8 text-center">
            <p className="text-sm text-muted">แอปจะแสดงที่นี่เมื่อ GuPanu สร้างเสร็จ</p>
          </div>
        ) : tab === "code" ? (
          <pre className="h-full overflow-auto p-4 font-mono text-xs leading-relaxed text-fg">
            {project.html}
          </pre>
        ) : (
          <div className="flex h-full justify-center overflow-auto bg-muted-fill/50">
            <iframe
              ref={frame}
              title="พรีวิวสด"
              srcDoc={srcdoc}
              sandbox="allow-scripts allow-forms allow-modals allow-popups allow-downloads"
              className="h-full bg-surface"
              style={{ width: DEVICE_WIDTH[device], maxWidth: "100%" }}
            />
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
