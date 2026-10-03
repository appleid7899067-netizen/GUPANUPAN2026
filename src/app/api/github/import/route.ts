import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { gunzipSync } from "node:zlib";
import { stripArchiveRoot, untar } from "@/lib/tar";
import {
  MAX_ARCHIVE_BYTES,
  MAX_PAYLOAD_FILES,
  MAX_PAYLOAD_TEXT,
  MAX_TEXT_FILE_BYTES,
  classifyRepoPath,
  decodeRepoText,
  type ApiEnvelope,
  type RepoImportAsset,
  type RepoImportFile,
  type RepoImportMeta,
  type RepoImportNote,
  type RepoImportPayload,
  normalizeRepoPath,
  parseRepoRef,
} from "@/lib/github-import";

/**
 * ═══ GET /api/github/import ═════════════════════════════════════════════
 *
 * โคลน repo สาธารณะจาก GitHub มาเป็น payload ให้เบราว์เซอร์สร้างโปรเจกต์
 * ทำงานฝั่งเซิร์ฟเวอร์เพราะ `codeload.github.com` ไม่ส่ง CORS ให้ origin อื่น
 * (เบราว์เซอร์ยิงตรงจะโดนบล็อก) — ฝั่งนี้จึงดาวน์โหลด tarball, คลาย gzip/tar,
 * แล้วคืนเฉพาะไฟล์ข้อความ (เนื้อไฟล์) กับรายการไฟล์ไบนารี (พาธ+ขนาด)
 *
 * ความปลอดภัย/เพดาน:
 *  - รับเฉพาะ github.com และชื่อ owner/repo ที่ผ่าน `parseRepoRef`
 *  - จำกัด 60 MB ต่อ tarball · 400 KB/ไฟล์ · 3 MB รวม · 600 ไฟล์
 *  - ไฟล์จาก repo ถือเป็น "ข้อมูล" ไม่ใช่คำสั่ง ไม่ถูก execute ที่นี่
 *  - ตั้ง GITHUB_TOKEN ใน env ได้ (ไม่บังคับ) เพื่อโคลน repo ส่วนตัว/เพิ่มโควตา
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const USER_AGENT = "gupan-studio-github-import";
const MAX_SKIPPED_NOTES = 120;

function json<T>(body: ApiEnvelope<T>, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function fail(error: string, status: number): NextResponse {
  return json({ ok: false, error }, status);
}

/** แปลง error ของ fetch ให้เป็นข้อความที่ผู้ใช้เอาไปแก้ได้จริง */
function describeNetworkError(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  const cause = (error as { cause?: { message?: string; code?: string } }).cause;
  const detail = cause?.code || cause?.message || error.message;
  if (/certificate|self[- ]signed|unable to verify/i.test(detail)) {
    return "เซิร์ฟเวอร์ตรวจใบรับรอง TLS ของ GitHub ไม่ผ่าน — ตรวจ proxy/CA ของเซิร์ฟเวอร์ (ตั้ง NODE_EXTRA_CA_CERTS ได้)";
  }
  if (/ENOTFOUND|EAI_AGAIN|getaddrinfo|ECONNREFUSED/i.test(detail)) {
    return "เชื่อมต่อ github.com ไม่ได้ — ตรวจอินเทอร์เน็ต/ดีเอ็นเอสของเซิร์ฟเวอร์";
  }
  return `${fallback} (${detail})`;
}

function authHeaders(): Record<string, string> {
  const token = (process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "").trim();
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "user-agent": USER_AGENT,
    "x-github-api-version": "2022-11-28",
  };
  if (token) headers.authorization = `Bearer ${token}`;
  return headers;
}

/** ดาวน์โหลดพร้อมเพดานไบต์ (ไม่โหลดทั้งก้อนถ้าเกิน) */
async function downloadCapped(url: string, maxBytes: number): Promise<Uint8Array> {
  const res = await fetch(url, { headers: authHeaders(), redirect: "follow" });
  if (!res.ok || !res.body) {
    throw new Error(`ดาวน์โหลด repo ไม่สำเร็จ (HTTP ${res.status})`);
  }
  const declared = Number(res.headers.get("content-length") || 0);
  if (declared && declared > maxBytes) {
    throw new Error(
      `repo ใหญ่เกินเพดาน ${Math.round(maxBytes / 1024 / 1024)} MB (${Math.round(declared / 1024 / 1024)} MB)`,
    );
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error(
        `repo ใหญ่เกินเพดาน ${Math.round(maxBytes / 1024 / 1024)} MB — ลองระบุโฟลเดอร์ย่อยจาก URL /tree/<branch>/<โฟลเดอร์>`,
      );
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

interface RepoMetaResponse {
  default_branch?: string;
  description?: string | null;
  html_url?: string;
  language?: string | null;
  stargazers_count?: number;
  size?: number;
  private?: boolean;
  license?: { spdx_id?: string | null; name?: string | null } | null;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const params = request.nextUrl.searchParams;
  let ref = "";
  let owner = "";
  let repo = "";
  try {
    const parsed = parseRepoRef(params.get("repo") || "");
    owner = parsed.owner;
    repo = parsed.repo;
    ref = (params.get("ref") || parsed.ref || "").trim();
  } catch (error) {
    return fail(error instanceof Error ? error.message : "ชื่อ repo ไม่ถูกต้อง", 400);
  }
  const subpath = normalizeRepoPath(params.get("subpath") || "");

  // ── 1) ข้อมูล repo (ไม่บังคับ: ถ้าโดนจำกัดโควตาก็ไปต่อได้) ───────────────
  const notes: string[] = [];
  let meta: RepoImportMeta = {
    owner,
    repo,
    ref,
    defaultBranch: ref,
    htmlUrl: `https://github.com/${owner}/${repo}`,
    subpath: subpath || undefined,
  };
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: authHeaders(),
      cache: "no-store",
    });
    if (res.status === 404) {
      return fail(
        "ไม่พบ repo สาธารณะชื่อนี้ — ตรวจการสะกด หรือถ้าเป็น repo ส่วนตัวให้ตั้ง GITHUB_TOKEN ที่เซิร์ฟเวอร์ก่อน",
        404,
      );
    }
    if (res.ok) {
      const data = (await res.json()) as RepoMetaResponse;
      const defaultBranch = data.default_branch || ref || "HEAD";
      ref = ref || defaultBranch;
      meta = {
        owner,
        repo,
        ref,
        defaultBranch,
        htmlUrl: data.html_url || `https://github.com/${owner}/${repo}`,
        description: data.description || undefined,
        language: data.language || undefined,
        stars: data.stargazers_count,
        license: data.license?.spdx_id || data.license?.name || undefined,
        sizeKb: data.size,
        subpath: subpath || undefined,
      };
      if (data.private) {
        notes.push("repo นี้เป็นส่วนตัว — ต้องมี GITHUB_TOKEN ที่เซิร์ฟเวอร์จึงจะโคลนได้");
      }
      if (typeof data.size === "number" && data.size * 1024 > MAX_ARCHIVE_BYTES) {
        return fail(
          `repo ใหญ่ ${Math.round((data.size * 1024) / 1024 / 1024)} MB เกินเพดาน ${Math.round(MAX_ARCHIVE_BYTES / 1024 / 1024)} MB — ระบุโฟลเดอร์ย่อยจาก URL /tree/<branch>/<โฟลเดอร์> แทน`,
          413,
        );
      }
    } else if (res.status === 403 || res.status === 429) {
      notes.push("GitHub จำกัดจำนวนคำขอชั่วคราว — ใช้ข้อมูล repo เท่าที่มี");
    }
  } catch (error) {
    notes.push(describeNetworkError(error, "ดึงข้อมูล repo ไม่ได้ — ใช้ข้อมูลเท่าที่มี"));
  }
  if (!ref) ref = "HEAD";
  meta.ref = ref;

  // ── 2) ดาวน์โหลด tarball + คลาย gzip/tar ────────────────────────────────
  let archive: Uint8Array;
  try {
    archive = await downloadCapped(
      `https://codeload.github.com/${owner}/${repo}/tar.gz/${encodeURIComponent(ref)}`,
      MAX_ARCHIVE_BYTES,
    );
  } catch (error) {
    return fail(describeNetworkError(error, "ดาวน์โหลด repo ไม่สำเร็จ"), 502);
  }

  let entries: ReturnType<typeof untar>["entries"];
  let archiveTruncated = false;
  try {
    const { entries: list, truncated } = untar(gunzipSync(archive));
    entries = list;
    archiveTruncated = truncated;
  } catch {
    return fail("แตกไฟล์ repo ไม่สำเร็จ — ลองใหม่อีกครั้ง", 502);
  }
  if (archiveTruncated) {
    notes.push("repo มีไฟล์มากจนต้องตัดรายการท้าย ๆ ออก — ลองระบุโฟลเดอร์ย่อย");
  }

  // ── 3) คัดแยกไฟล์ข้อความ/ไบนารี ────────────────────────────────────────
  const files: RepoImportFile[] = [];
  const assets: RepoImportAsset[] = [];
  const skipped: RepoImportNote[] = [];
  const seen = new Set<string>();
  let textBytes = 0;
  let payloadFull = false;

  const note = (path: string, reason: string) => {
    if (skipped.length < MAX_SKIPPED_NOTES) skipped.push({ path, reason });
  };

  for (const entry of entries) {
    const rawPath = stripArchiveRoot(entry.path);
    const path = normalizeRepoPath(rawPath);
    if (!path || seen.has(path)) continue;
    seen.add(path);
    if (subpath && path !== subpath && !path.startsWith(`${subpath}/`)) continue;

    const kind = classifyRepoPath(path);
    if (kind === "skip") {
      note(path, "ข้ามไฟล์ที่ไม่จำเป็น (lock/แคช/โฟลเดอร์ระบบ)");
      continue;
    }
    if (kind === "text") {
      if (entry.bytes.byteLength > MAX_TEXT_FILE_BYTES) {
        note(path, `ใหญ่เกิน ${Math.round(MAX_TEXT_FILE_BYTES / 1000)} KB`);
        continue;
      }
      const text = decodeRepoText(entry.bytes);
      if (text === null) {
        assets.push({ path, size: entry.bytes.byteLength, kind: "binary" });
        continue;
      }
      if (payloadFull || files.length >= MAX_PAYLOAD_FILES || textBytes + text.length > MAX_PAYLOAD_TEXT) {
        payloadFull = true;
        note(path, "เกินเพดานข้อมูลต่อครั้ง — ลองระบุโฟลเดอร์ย่อย");
        continue;
      }
      files.push({ path, size: entry.bytes.byteLength, text });
      textBytes += text.length;
      continue;
    }
    assets.push({ path, size: entry.bytes.byteLength, kind });
  }

  if (payloadFull) notes.push("มีไฟล์เกินเพดานต่อครั้ง — ครั้งต่อไประบุโฟลเดอร์ย่อยเพื่อเก็บให้ครบ");
  if (!files.length && !assets.length) {
    return fail(
      subpath
        ? `ไม่พบไฟล์ในโฟลเดอร์ “${subpath}” ของ ${owner}/${repo}@${ref}`
        : `repo ${owner}/${repo}@${ref} ไม่มีไฟล์ที่นำเข้าได้`,
      404,
    );
  }

  const payload: RepoImportPayload = { meta, files, assets, skipped, notes };
  return json({ ok: true, data: payload });
}
