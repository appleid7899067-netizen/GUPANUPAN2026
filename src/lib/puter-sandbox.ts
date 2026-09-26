// src/lib/puter-sandbox.ts — Isolated sandbox per project for Puter hybrid
// Mirrors Totalum's sandbox model (Active/Archived/Unarchiving) but backed by Puter.
// Each project gets: fs folder + hosting subdomain + metadata in puter.kv

"use client";

import { isPuterAvailable, getPuterAppId } from "./puter";

export type SandboxStatus = "Active" | "Archived" | "Unarchiving" | "Creating" | "Starting";
export interface PuterSandbox {
  projectId: string;
  status: SandboxStatus;
  url?: string; // puter.site url
  subdomain?: string;
  fsPath: string; // e.g. /user/AppData/appId/projectId
  createdAt: string;
  lastActiveAt: string;
  // published vs preview
  previewUrl?: string;
  productionUrl?: string;
}

const KV_KEY = "puter:sandboxes";
const ARCHIVE_AFTER_MS = 60 * 60 * 1000; // 1 hour idle → Archived (like Totalum's hourly job but faster for demo)

function nowISO() { return new Date().toISOString(); }

async function loadAll(): Promise<Record<string, PuterSandbox>> {
  if (!isPuterAvailable()) {
    try { const raw = localStorage.getItem(KV_KEY); return raw ? JSON.parse(raw) : {}; } catch { return {}; }
  }
  try {
    const raw = await window.puter.kv.get(KV_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
async function saveAll(map: Record<string, PuterSandbox>) {
  if (!isPuterAvailable()) {
    localStorage.setItem(KV_KEY, JSON.stringify(map));
    return;
  }
  await window.puter.kv.set(KV_KEY, JSON.stringify(map));
}

function fsPathFor(projectId: string): string {
  try {
    const user = window.puter?.auth?.user?.username || "user";
    return `/${user}/AppData/${getPuterAppId()}/${projectId}`;
  } catch { return `/user/AppData/${getPuterAppId()}/${projectId}`; }
}

function makeSubdomain(projectId: string): string {
  // puter hosting subdomain must be unique, dns-safe
  const base = projectId.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 20);
  return `preview-${base}-${Math.random().toString(36).slice(2,6)}`;
}

export async function getSandbox(projectId: string): Promise<PuterSandbox | null> {
  const all = await loadAll();
  let sb = all[projectId] || null;
  if (sb) {
    // auto-archive check
    const idle = Date.now() - new Date(sb.lastActiveAt).getTime();
    if (sb.status === "Active" && idle > ARCHIVE_AFTER_MS) {
      sb.status = "Archived";
      sb.lastActiveAt = nowISO();
      all[projectId] = sb;
      await saveAll(all);
    }
  }
  return sb;
}

export async function ensureSandbox(projectId: string): Promise<PuterSandbox> {
  const existing = await getSandbox(projectId);
  if (existing) {
    // touch
    existing.lastActiveAt = nowISO();
    if (existing.status === "Archived") existing.status = "Active";
    const all = await loadAll();
    all[projectId] = existing;
    await saveAll(all);
    return existing;
  }
  const sb: PuterSandbox = {
    projectId,
    status: "Creating",
    fsPath: fsPathFor(projectId),
    createdAt: nowISO(),
    lastActiveAt: nowISO(),
  };
  // create fs folder
  if (isPuterAvailable()) {
    try { await window.puter.fs.mkdir(sb.fsPath, { recursive: true }); } catch {}
    // create hosting
    try {
      const sub = makeSubdomain(projectId);
      const site = await window.puter.hosting.create(sub, sb.fsPath);
      sb.subdomain = site.subdomain;
      sb.url = `https://${site.subdomain}.puter.site`;
      sb.previewUrl = sb.url;
    } catch (e) {
      // hosting may fail if subdomain taken — keep fs only
      sb.url = undefined;
    }
  } else {
    sb.url = `http://localhost:3000/preview/${projectId}`; // fallback
  }
  sb.status = "Active";
  const all = await loadAll();
  all[projectId] = sb;
  await saveAll(all);
  return sb;
}

export async function wakeSandbox(projectId: string): Promise<PuterSandbox> {
  const sb = await getSandbox(projectId);
  if (!sb) return ensureSandbox(projectId);
  if (sb.status === "Active") return sb;
  // Unarchiving simulation (2-4 sec vs Totalum's 2-4 min)
  sb.status = "Unarchiving";
  const all = await loadAll();
  all[projectId] = sb;
  await saveAll(all);
  await new Promise(r => setTimeout(r, 1500));
  sb.status = "Active";
  sb.lastActiveAt = nowISO();
  // ensure hosting still exists
  if (isPuterAvailable() && sb.subdomain) {
    try {
      // verify hosting exists, if not recreate
      const sites = await window.puter.hosting.list?.() || [];
      const found = Array.isArray(sites) ? sites.find((s:any)=> s.subdomain===sb.subdomain) : null;
      if (!found) {
        const site = await window.puter.hosting.create(sb.subdomain, sb.fsPath);
        sb.url = `https://${site.subdomain}.puter.site`;
      }
    } catch {}
  }
  await saveAll(all);
  return sb;
}

export async function sleepSandbox(projectId: string): Promise<void> {
  const all = await loadAll();
  const sb = all[projectId];
  if (!sb) return;
  sb.status = "Archived";
  sb.lastActiveAt = nowISO();
  await saveAll(all);
}

export async function deleteSandbox(projectId: string): Promise<void> {
  const all = await loadAll();
  const sb = all[projectId];
  if (sb) {
    if (isPuterAvailable()) {
      try { if (sb.subdomain) await window.puter.hosting.delete(sb.subdomain); } catch {}
      try { await window.puter.fs.delete(sb.fsPath, { recursive: true }); } catch {}
    }
    delete all[projectId];
    await saveAll(all);
  }
}

export async function listSandboxes(): Promise<PuterSandbox[]> {
  const all = await loadAll();
  return Object.values(all).sort((a,b)=> new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime());
}

// Helper to map to Totalum's agentServerStatus for UI compatibility
export function toAgentServerStatus(s: SandboxStatus): "Active"|"Archived"|"Unarchiving"|"Creating"|"Starting" {
  return s;
}

// For server-side mock (when puter not available) — returns fake but plausible
export function mockSandboxStatus(projectId: string): { agentServerStatus: SandboxStatus; agentProcessStatus: string } {
  return { agentServerStatus: "Active", agentProcessStatus: "idle" };
}
