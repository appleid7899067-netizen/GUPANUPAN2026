import { useEffect, useState } from "react";
import { BossnuDeploy } from "@/lib/bossnu-deploy";

interface DeployModalProps {
  projectId: string;
  projectName: string;
  html: string;
  currentSubdomain?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (url: string) => void;
}

export function DeployModal({ projectId, projectName, html, currentSubdomain = "", isOpen, onClose, onSuccess }: DeployModalProps) {
  const [subdomain, setSubdomain] = useState("");
  const [deploying, setDeploying] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setSubdomain(currentSubdomain || projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "").slice(0, 48));
    setUrl(null);
    setError("");
  }, [isOpen, currentSubdomain, projectName]);

  if (!isOpen) return null;

  const deploy = async () => {
    setDeploying(true);
    setError("");
    const result = await BossnuDeploy.deployProject(projectId, subdomain, html, projectName);
    setDeploying(false);
    if (result.success && result.url) {
      setUrl(result.url);
      onSuccess(result.url);
    } else {
      setError(result.error || "Deploy ไม่สำเร็จ");
    }
  };

  const copy = () => { if (url) void navigator.clipboard?.writeText(url); };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div><div className="text-sm font-semibold">🚀 One-Click Deploy</div><div className="mt-1 text-xs text-muted">Puter Cloud → .puter.site</div></div>
          <button className="text-muted hover:text-fg" onClick={onClose} aria-label="ปิด">✕</button>
        </div>
        {!url ? (
          <div className="space-y-4">
            <div className="text-xs text-muted">โครงการ <span className="font-medium text-fg">{projectName}</span></div>
            <div className="flex overflow-hidden rounded-xl border border-border bg-bg">
              <input value={subdomain} onChange={e => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none" placeholder="my-app" />
              <span className="border-l border-border px-3 py-2.5 text-xs text-muted">.puter.site</span>
            </div>
            {error && <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-400">⚠️ {error}</div>}
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="rounded-lg bg-muted-fill px-4 py-2 text-xs">ยกเลิก</button>
              <button onClick={() => void deploy()} disabled={deploying || !subdomain} className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-zinc-950 disabled:opacity-50">
                {deploying ? "กำลัง Deploy..." : "🚀 เผยแพร่ทันที"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-center">
            <div className="text-3xl">🎉</div>
            <div><div className="text-sm font-semibold">เผยแพร่สำเร็จ</div><div className="mt-1 text-xs text-muted">ระบบยืนยันการสร้าง/อัปเดต Hosting แล้ว</div></div>
            <div className="rounded-xl border border-border bg-bg p-3 text-left text-xs font-mono text-emerald-400 break-all">{url}</div>
            <div className="flex gap-2">
              <button onClick={copy} className="flex-1 rounded-lg bg-muted-fill px-3 py-2 text-xs">คัดลอก URL</button>
              <a href={url} target="_blank" rel="noreferrer" className="flex-1 rounded-lg bg-emerald-500 px-3 py-2 text-center text-xs font-semibold text-zinc-950">เปิดเว็บไซต์ ↗</a>
            </div>
            <button onClick={onClose} className="w-full rounded-lg bg-muted-fill px-3 py-2 text-xs">ปิด</button>
          </div>
        )}
      </div>
    </div>
  );
}
