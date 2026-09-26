"use client";

import { useEffect, useState } from "react";
import { Box, Server, Power, Trash2, ExternalLink, RefreshCw, HardDrive, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { isPuterAvailable } from "@/lib/puter";
import { getSandbox, ensureSandbox, wakeSandbox, sleepSandbox, deleteSandbox, type PuterSandbox } from "@/lib/puter-sandbox";
import { toast } from "sonner";

export function PuterSandboxPanel({ projectId }: { projectId: string }) {
  const [sandbox, setSandbox] = useState<PuterSandbox | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const sb = await getSandbox(projectId);
      setSandbox(sb);
    } finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, [projectId]);

  const handleEnsure = async () => {
    setAction("creating");
    try {
      const sb = await ensureSandbox(projectId);
      setSandbox(sb);
      toast.success("Sandbox ready — " + sb.status);
    } catch (e:any) { toast.error(e?.message || "Failed to create sandbox"); }
    setAction(null);
  };
  const handleWake = async () => {
    setAction("waking");
    try {
      const sb = await wakeSandbox(projectId);
      setSandbox(sb);
      toast.success("Sandbox waking — Active");
    } catch (e:any) { toast.error(e?.message || "Wake failed"); }
    setAction(null);
  };
  const handleSleep = async () => {
    setAction("sleeping");
    await sleepSandbox(projectId);
    await refresh();
    setAction(null);
    toast.success("Sandbox archived (sleep)");
  };
  const handleDelete = async () => {
    if (!confirm(`Delete sandbox for ${projectId}? This removes hosting and files.`)) return;
    setAction("deleting");
    await deleteSandbox(projectId);
    setSandbox(null);
    setAction(null);
    toast.success("Sandbox deleted");
  };

  if (loading) return <div className="p-4 text-xs text-gray-400">Loading sandbox…</div>;

  if (!sandbox) {
    return (
      <Card className="p-4 bg-amber-50 border-amber-200">
        <div className="flex items-center gap-2 text-amber-800 text-sm font-medium"><Box className="w-4 h-4"/> ไม่มีแซนบ็อก — Sandbox not found</div>
        <p className="text-xs text-amber-700 mt-1">โปรเจคนี้ยังไม่มี isolated sandbox — กดสร้างเพื่อให้ preview / hosting / FS แยกต่อโปรเจค (เหมือน Totalum)</p>
        <Button size="sm" className="mt-3 bg-amber-600 hover:bg-amber-700 text-white" onClick={handleEnsure} disabled={!!action}>
          {action==="creating" ? "Creating…" : "Create Sandbox (Puter)"}
        </Button>
        {!isPuterAvailable() && <p className="text-[11px] text-gray-500 mt-2">Puter.js not loaded — sandbox will be local mock (ยังใช้งานได้ แต่ไม่ isolate จริง)</p>}
      </Card>
    );
  }

  const statusColor = sandbox.status==="Active" ? "bg-emerald-500" : sandbox.status==="Archived" ? "bg-gray-400" : "bg-amber-500";
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-gray-600"/>
          <span className="text-sm font-semibold">Sandbox</span>
          <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full text-white ${statusColor}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"/>{sandbox.status}
          </span>
        </div>
        <span className="text-[11px] text-gray-400 font-mono">{projectId}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="text-gray-400 flex items-center gap-1"><HardDrive className="w-3 h-3"/> FS Path</div>
          <div className="font-mono text-gray-700 truncate" title={sandbox.fsPath}>{sandbox.fsPath}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="text-gray-400 flex items-center gap-1"><Globe className="w-3 h-3"/> Hosting</div>
          {sandbox.url ? <a href={sandbox.url} target="_blank" className="text-emerald-600 hover:underline flex items-center gap-1 truncate">{sandbox.url}<ExternalLink className="w-3 h-3"/></a> : <span className="text-gray-400">—</span>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {sandbox.status==="Archived" ? (
          <Button size="sm" onClick={handleWake} disabled={!!action} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Power className="w-3.5 h-3.5 mr-1"/>{action==="waking" ? "Waking…" : "Wake (Unarchive)"}
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={handleSleep} disabled={!!action}>
            <RefreshCw className="w-3.5 h-3.5 mr-1"/>{action==="sleeping" ? "Sleeping…" : "Sleep (Archive)"}
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={refresh} disabled={!!action}>Refresh</Button>
        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={handleDelete} disabled={!!action}>
          <Trash2 className="w-3.5 h-3.5 mr-1"/> Delete
        </Button>
      </div>

      <p className="text-[11px] text-gray-400">Isolated per project — files, hosting, AI context. Idle 1ชม. → Archived อัตโนมัติ (เหมือน Totalum hourly job). Wake ใช้เวลา ~1.5s ใน Puter mode (Totalum ~2-4นาที).</p>
    </Card>
  );
}

// Dashboard list version — shows all sandboxes
export function PuterSandboxList() {
  const [list, setList] = useState<PuterSandbox[]>([]);
  useEffect(() => {
    import("@/lib/puter-sandbox").then(m=> m.listSandboxes().then(setList));
  }, []);
  if (list.length===0) return <div className="text-xs text-gray-400 p-2">ยังไม่มี sandbox — สร้างโปรเจคแรกเพื่อสร้าง sandbox อัตโนมัติ</div>;
  return (
    <div className="space-y-2">
      {list.map(sb=> (
        <div key={sb.projectId} className="flex items-center justify-between text-xs border rounded-lg px-3 py-2 bg-white">
          <span className="font-mono">{sb.projectId}</span>
          <span className={`px-2 py-0.5 rounded-full text-white text-[10px] ${sb.status==="Active"?"bg-emerald-500":"bg-gray-400"}`}>{sb.status}</span>
          <span className="text-gray-400 truncate max-w-[150px]">{sb.url || sb.fsPath}</span>
        </div>
      ))}
    </div>
  );
}
