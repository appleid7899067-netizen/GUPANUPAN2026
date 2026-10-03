"use client";

/**
 * ═══ GitHub สองทาง: push โปรเจกต์ขึ้น repo และโคลน repo เข้าบิลเดอร์ ════
 *
 * เรียก REST API ของ GitHub ตรงจากเบราว์เซอร์ (api.github.com รองรับ CORS)
 * ใช้ Personal Access Token ของผู้ใช้เอง — โทเคนอยู่ในเครื่องผู้ใช้เท่านั้น
 * (memory + localStorage เมื่อติ๊ก "จำโทเคน") ไม่เคยถูกส่งไปที่อื่น
 *
 * push: blobs → tree (base_tree คงไฟล์เดิมของ repo) → commit → อัปเดต ref
 * clone: tree แบบ recursive แล้วดึงเฉพาะไฟล์เว็บ (นามสกุลปลอดภัย, จำกัดจำนวน)
 */
export const GITHUB_API = "https://api.github.com";
const TOKEN_KEY = "gupan:github-token";
export const MAX_IMPORT_FILES = 30;
export const MAX_IMPORT_FILE_SIZE = 400_000;
const IMPORT_EXT = /\.(html?|css|js|mjs|json|md|svg|txt)$/i;

/** ชื่อ repo ที่ GitHub รับ: ตัวอักษร/ตัวเลข/._- เท่านั้น */
export function repoSlug(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 100);
  return slug || "gupan-app";
}

/** กรอง blob จาก tree ของ repo: เฉพาะไฟล์เว็บที่ปลอดภัยและมีขนาดรับไหว */
export function isImportablePath(path: string, size: number): boolean {
  return (
    IMPORT_EXT.test(path) &&
    size <= MAX_IMPORT_FILE_SIZE &&
    !path.includes("..") &&
    !path.startsWith("/")
  );
}

/** base64 → ข้อความ UTF-8 (รองรับภาษาไทยในไฟล์ที่โคลนมา) */
export function decodeBase64Utf8(content: string): string {
  const binary = atob(content.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

export function getStoredGithubToken(): string | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export function storeGithubToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* โหมดไม่อนุญาต storage — ใช้โทเคนเฉพาะเซสชันนี้ */
  }
}
export function clearGithubToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

async function gh(
  path: string,
  token?: string,
  init?: { method?: string; body?: string },
): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (init?.body) headers["Content-Type"] = "application/json";
  return fetch(GITHUB_API + path, { ...init, headers });
}
async function describe(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 160);
  } catch {
    return "";
  }
}

/** ชื่อผู้ใช้ GitHub ของโทเคน (ใช้กรอก owner อัตโนมัติ) */
export async function fetchGithubUser(token: string): Promise<string> {
  const res = await gh("/user", token);
  if (res.status === 401) throw new Error("โทเคน GitHub ไม่ถูกต้องหรือหมดอายุ");
  if (!res.ok)
    throw new Error(`ตรวจสอบโทเคนไม่สำเร็จ (${res.status}) ${await describe(res)}`);
  const data = (await res.json()) as { login?: string };
  if (!data.login) throw new Error("ไม่พบชื่อผู้ใช้จากโทเคนนี้");
  return data.login;
}

export interface PushOptions {
  token: string;
  owner: string;
  repo: string;
  files: Record<string, string>;
  message: string;
  isPrivate?: boolean;
  createIfMissing?: boolean;
  onProgress?: (message: string) => void;
}
export interface PushResult {
  repoUrl: string;
  commitUrl: string;
  created: boolean;
  branch: string;
}

/** push ทุกไฟล์ของโปรเจกต์ขึ้น repo — สร้าง repo ให้ใหม่ถ้ายังไม่มี */
export async function pushProjectToGitHub(
  options: PushOptions,
): Promise<PushResult> {
  const { token, owner, repo, files, message, onProgress } = options;
  if (!token.trim()) throw new Error("ต้องใส่ Personal Access Token ของ GitHub");
  if (!owner.trim() || !repo.trim())
    throw new Error("ต้องระบุเจ้าของและชื่อ repo");
  const paths = Object.keys(files);
  if (!paths.length) throw new Error("ยังไม่มีไฟล์ให้ส่งขึ้น GitHub");

  onProgress?.("ตรวจ repo ปลายทาง…");
  let created = false;
  let repoInfo: { html_url?: string; default_branch?: string } | null = null;
  const repoRes = await gh(`/repos/${owner}/${repo}`, token);
  if (repoRes.status === 404) {
    if (!options.createIfMissing)
      throw new Error(
        `ไม่พบ repo ${owner}/${repo} — ติ๊ก "สร้าง repo ใหม่" หรือตรวจชื่อ`,
      );
    onProgress?.("สร้าง repo ใหม่…");
    const createRes = await gh("/user/repos", token, {
      method: "POST",
      body: JSON.stringify({
        name: repo,
        private: !!options.isPrivate,
        auto_init: false,
      }),
    });
    if (!createRes.ok)
      throw new Error(
        `สร้าง repo ไม่สำเร็จ (${createRes.status}) ${await describe(createRes)}`,
      );
    created = true;
    repoInfo = (await createRes.json()) as typeof repoInfo;
  } else if (!repoRes.ok) {
    throw new Error(
      `เข้าถึง repo ไม่ได้ (${repoRes.status}) ${await describe(repoRes)}`,
    );
  } else {
    repoInfo = (await repoRes.json()) as typeof repoInfo;
  }
  const branch = repoInfo?.default_branch || "main";

  // ฐานเดิมของ branch (ถ้ามี) — ใช้ base_tree คงไฟล์อื่นใน repo ไว้
  let baseCommit: string | null = null;
  let baseTree: string | undefined;
  const refRes = await gh(`/repos/${owner}/${repo}/git/ref/heads/${branch}`, token);
  if (refRes.ok) {
    const ref = (await refRes.json()) as { object?: { sha?: string } };
    baseCommit = ref.object?.sha ?? null;
    if (baseCommit) {
      const commitRes = await gh(
        `/repos/${owner}/${repo}/git/commits/${baseCommit}`,
        token,
      );
      if (commitRes.ok) {
        const commit = (await commitRes.json()) as { tree?: { sha?: string } };
        baseTree = commit.tree?.sha;
      }
    }
  }

  const tree: { path: string; mode: string; type: string; sha: string }[] = [];
  for (let i = 0; i < paths.length; i += 1) {
    onProgress?.(`อัปโหลด ${paths[i]} (${i + 1}/${paths.length})`);
    const blobRes = await gh(`/repos/${owner}/${repo}/git/blobs`, token, {
      method: "POST",
      body: JSON.stringify({ content: files[paths[i]], encoding: "utf-8" }),
    });
    if (!blobRes.ok)
      throw new Error(
        `อัปโหลด ${paths[i]} ไม่สำเร็จ (${blobRes.status}) ${await describe(blobRes)}`,
      );
    const blob = (await blobRes.json()) as { sha?: string };
    if (!blob.sha) throw new Error(`blob ของ ${paths[i]} ไม่มี sha`);
    tree.push({ path: paths[i], mode: "100644", type: "blob", sha: blob.sha });
  }

  onProgress?.("สร้าง commit…");
  const treeRes = await gh(`/repos/${owner}/${repo}/git/trees`, token, {
    method: "POST",
    body: JSON.stringify({ tree, ...(baseTree ? { base_tree: baseTree } : {}) }),
  });
  if (!treeRes.ok)
    throw new Error(`สร้าง tree ไม่สำเร็จ (${treeRes.status}) ${await describe(treeRes)}`);
  const treeSha = ((await treeRes.json()) as { sha?: string }).sha;
  const commitRes = await gh(`/repos/${owner}/${repo}/git/commits`, token, {
    method: "POST",
    body: JSON.stringify({
      message: message.slice(0, 200) || "อัปเดตจาก GUPAN Studio",
      tree: treeSha,
      parents: baseCommit ? [baseCommit] : [],
    }),
  });
  if (!commitRes.ok)
    throw new Error(`สร้าง commit ไม่สำเร็จ (${commitRes.status}) ${await describe(commitRes)}`);
  const commit = (await commitRes.json()) as { sha?: string; html_url?: string };

  onProgress?.("อัปเดต branch…");
  const refUpdate = baseCommit
    ? await gh(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, token, {
        method: "PATCH",
        body: JSON.stringify({ sha: commit.sha, force: false }),
      })
    : await gh(`/repos/${owner}/${repo}/git/refs`, token, {
        method: "POST",
        body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: commit.sha }),
      });
  if (!refUpdate.ok)
    throw new Error(`อัปเดต branch ไม่สำเร็จ (${refUpdate.status}) ${await describe(refUpdate)}`);
  return {
    repoUrl:
      repoInfo?.html_url || `https://github.com/${owner}/${repo}`,
    commitUrl: commit.html_url || "",
    created,
    branch,
  };
}

export interface CloneOptions {
  owner: string;
  repo: string;
  branch?: string;
  token?: string;
  onProgress?: (message: string) => void;
}
export interface CloneResult {
  files: Record<string, string>;
  branch: string;
  skipped: number;
}

/** โคลน repo (สาธารณะไม่ต้องใช้โทเคน) ดึงเฉพาะไฟล์เว็บมาเปิดในบิลเดอร์ */
export async function cloneRepoFromGitHub(
  options: CloneOptions,
): Promise<CloneResult> {
  const { owner, repo, token, onProgress } = options;
  if (!owner.trim() || !repo.trim())
    throw new Error("ต้องระบุเจ้าของและชื่อ repo");
  onProgress?.("อ่านข้อมูล repo…");
  const repoRes = await gh(`/repos/${owner}/${repo}`, token);
  if (!repoRes.ok)
    throw new Error(
      `อ่าน repo ไม่ได้ (${repoRes.status}) — repo ส่วนตัวต้องใช้โทเคน ${await describe(repoRes)}`,
    );
  const info = (await repoRes.json()) as { default_branch?: string };
  const branch = options.branch?.trim() || info.default_branch || "main";

  onProgress?.("อ่านรายการไฟล์…");
  const treeRes = await gh(
    `/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    token,
  );
  if (!treeRes.ok)
    throw new Error(`อ่าน branch ${branch} ไม่ได้ (${treeRes.status})`);
  const treeData = (await treeRes.json()) as {
    tree?: { path: string; type: string; sha: string; size?: number }[];
  };
  const blobs = (treeData.tree ?? []).filter((entry) => entry.type === "blob");
  const wanted = blobs.filter((entry) =>
    isImportablePath(entry.path, entry.size ?? 0),
  );
  const skipped = blobs.length - wanted.length;
  const take = wanted.slice(0, MAX_IMPORT_FILES);
  if (!take.length) throw new Error("repo นี้ไม่มีไฟล์เว็บให้โคลน");

  const files: Record<string, string> = {};
  for (let i = 0; i < take.length; i += 1) {
    onProgress?.(`ดึง ${take[i].path} (${i + 1}/${take.length})`);
    const blobRes = await gh(
      `/repos/${owner}/${repo}/git/blobs/${take[i].sha}`,
      token,
    );
    if (!blobRes.ok) continue;
    const blob = (await blobRes.json()) as {
      content?: string;
      encoding?: string;
    };
    const content =
      blob.encoding === "base64" && blob.content
        ? decodeBase64Utf8(blob.content)
        : (blob.content ?? "");
    files[take[i].path] = content;
  }
  // บิลเดอร์ต้องมี index.html — ถ้า repo เรียกหน้าหลักชื่ออื่น ใช้หน้านั้นแทน
  if (!files["index.html"]) {
    const alt = Object.keys(files).find((path) => path.endsWith(".html"));
    if (!alt) throw new Error("repo นี้ไม่มีไฟล์ HTML ให้เปิดเป็นเว็บ");
    files["index.html"] = files[alt];
    if (alt !== "index.html") delete files[alt];
  }
  return { files, branch, skipped };
}
