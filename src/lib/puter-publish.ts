"use client";

import { ensurePuterAuth, getPuterAppId, isPuterAvailable } from "./puter";

/**
 * ═══ เผยแพร่โปรเจกต์ขึ้น Puter Hosting (ปุ่ม "เผยแพร่" แบบ Bolt) ═══════════
 *
 * ของจริงทั้งหมด: อัปโหลดทุกไฟล์ของโปรเจกต์เข้า Puter Drive ของบัญชีผู้ใช้
 * แล้วผูกโฟลเดอร์กับ subdomain บน puter.site ผ่าน `puter.hosting`
 * บันทึกผลไว้ใน puter.kv (fallback localStorage) เพื่ออัปเดตซ้ำได้โดยไม่
 * สร้าง subdomain ใหม่
 *
 * ⚠️ ทุกขั้นเกิดจากการกดปุ่มของผู้ใช้เท่านั้น — ไม่มีคำขออัตโนมัติตอนโหลดหน้า
 * และค่า hosting/โควตาเป็นของบัญชี Puter ผู้ใช้เอง
 */
export interface PublishRecord {
  projectId: string;
  subdomain: string;
  url: string;
  dir: string;
  publishedAt: string;
}

const KV_PREFIX = "puter:publish:";

/** ชื่อ subdomain ต้อง dns-safe: ตัวเล็ก ตัวเลข และยัติภังค์เท่านั้น */
export function suggestSubdomain(projectId: string, name: string): string {
  const slug = (name || "app")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return `gupan-${slug || "app"}-${projectId.slice(0, 6)}`.slice(0, 40);
}

async function readRecord(projectId: string): Promise<PublishRecord | null> {
  if (isPuterAvailable()) {
    try {
      const raw = await window.puter.kv.get(KV_PREFIX + projectId);
      return raw ? (JSON.parse(raw) as PublishRecord) : null;
    } catch {
      return null;
    }
  }
  try {
    const raw = localStorage.getItem(KV_PREFIX + projectId);
    return raw ? (JSON.parse(raw) as PublishRecord) : null;
  } catch {
    return null;
  }
}
async function writeRecord(record: PublishRecord): Promise<void> {
  const raw = JSON.stringify(record);
  if (isPuterAvailable()) {
    try {
      await window.puter.kv.set(KV_PREFIX + record.projectId, raw);
      return;
    } catch {
      /* fall through to localStorage */
    }
  }
  localStorage.setItem(KV_PREFIX + record.projectId, raw);
}

/** ข้อมูลการเผยแพร่ล่าสุด (ถ้ามี) สำหรับแสดงใน dialog */
export async function getPublishInfo(
  projectId: string,
): Promise<PublishRecord | null> {
  return readRecord(projectId);
}

/**
 * อัปโหลดชุดไฟล์และผูก/ใช้ subdomain เดิม
 * @param onProgress ข้อความความคืบหน้าทีละขั้น (แสดงใน dialog)
 */
export async function publishProject(
  projectId: string,
  name: string,
  files: Record<string, string>,
  onProgress?: (message: string) => void,
): Promise<PublishRecord> {
  if (!isPuterAvailable())
    throw new Error("Puter ยังไม่พร้อม — ตรวจการเชื่อมต่อแล้วลองใหม่");
  const signedIn = await ensurePuterAuth();
  if (!signedIn)
    throw new Error("ต้องเข้าสู่ระบบ Puter ก่อนเผยแพร่ (ปุ่มบัญชีมุมขวาบน)");
  const user = window.puter.auth?.user?.username || "user";
  const dir = `/${user}/AppData/${getPuterAppId()}/sites/${projectId}`;
  onProgress?.("เตรียมโฟลเดอร์บน Puter Drive…");
  await window.puter.fs.mkdir(dir, { recursive: true });
  const paths = Object.keys(files);
  if (!paths.length) throw new Error("ยังไม่มีไฟล์ให้เผยแพร่");
  for (let i = 0; i < paths.length; i += 1) {
    onProgress?.(`อัปโหลด ${paths[i]} (${i + 1}/${paths.length})`);
    await window.puter.fs.write(`${dir}/${paths[i]}`, files[paths[i]], {
      overwrite: true,
    });
  }
  const existing = await readRecord(projectId);
  let subdomain = existing?.subdomain ?? "";
  if (!subdomain) {
    subdomain = suggestSubdomain(projectId, name);
    try {
      const site = await window.puter.hosting.create(subdomain, dir);
      subdomain = site?.subdomain || subdomain;
    } catch {
      // subdomain ชน: ต่อท้ายสุ่มแล้วลองอีกครั้งเดียว
      subdomain = `${suggestSubdomain(projectId, name)}-${Math.random()
        .toString(36)
        .slice(2, 6)}`;
      const site = await window.puter.hosting.create(subdomain, dir);
      subdomain = site?.subdomain || subdomain;
    }
  }
  const record: PublishRecord = {
    projectId,
    subdomain,
    url: `https://${subdomain}.puter.site`,
    dir,
    publishedAt: new Date().toISOString(),
  };
  await writeRecord(record);
  onProgress?.("เผยแพร่เสร็จแล้ว");
  return record;
}
