/**
 * BOSSNU UNIFIED - One-Click Puter Hosting Deployment
 * Puter Cloud Storage (puter.fs) -> Puter Hosting (.puter.site)
 */

declare const puter: any;

export interface DeploymentResult {
  success: boolean;
  url?: string;
  subdomain?: string;
  error?: string;
  evidence?: string[];
}

export interface HostedSiteInfo {
  subdomain: string;
  root_dir: string;
  url: string;
}

function cleanSubdomain(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}

function hostingReady() {
  return typeof puter !== "undefined" && Boolean(puter?.hosting) && Boolean(puter?.fs);
}

function siteUrl(subdomain: string, result?: any) {
  return result?.address || result?.url || `https://${subdomain}.puter.site`;
}

class BossnuDeployService {
  private baseDir = "bossnu_projects";

  private async ensureProjectFiles(projectId: string, html: string, projectName: string) {
    const projectDir = `${this.baseDir}/${projectId}`;
    try { await puter.fs.mkdir(this.baseDir); } catch {}
    try { await puter.fs.mkdir(projectDir); } catch {}

    await puter.fs.write(`${projectDir}/index.html`, html);
    const metaPath = `${projectDir}/meta.json`;
    let meta: Record<string, any> = {};
    try {
      const file = await puter.fs.read(metaPath);
      meta = JSON.parse(await file.text());
    } catch {}
    meta.projectId = projectId;
    meta.projectName = projectName;
    meta.updatedAt = new Date().toISOString();
    await puter.fs.write(metaPath, JSON.stringify(meta, null, 2));
    return projectDir;
  }

  async deployProject(projectId: string, requestedSubdomain?: string, html?: string, projectName = projectId): Promise<DeploymentResult> {
    if (!hostingReady()) return { success: false, error: "Puter Cloud Storage/Hosting ยังไม่พร้อม", evidence: ["puter_runtime_missing"] };

    const clean = cleanSubdomain(requestedSubdomain || projectName || projectId);
    if (!clean) return { success: false, error: "ชื่อ Subdomain ไม่ถูกต้อง" };

    try {
      const projectDir = html
        ? await this.ensureProjectFiles(projectId, html, projectName)
        : `${this.baseDir}/${projectId}`;

      const existing = typeof puter.hosting.get === "function"
        ? await puter.hosting.get(clean).catch(() => null)
        : null;

      let site: any;
      if (existing && typeof puter.hosting.update === "function") {
        site = await puter.hosting.update(clean, projectDir);
      } else {
        site = await puter.hosting.create(clean, projectDir);
      }

      const url = siteUrl(clean, site);
      const metaPath = `${projectDir}/meta.json`;
      let meta: Record<string, any> = {};
      try {
        const file = await puter.fs.read(metaPath);
        meta = JSON.parse(await file.text());
      } catch {}
      meta.hostedUrl = url;
      meta.subdomain = clean;
      meta.status = "published";
      meta.publishedAt = new Date().toISOString();
      meta.updatedAt = new Date().toISOString();
      await puter.fs.write(metaPath, JSON.stringify(meta, null, 2));

      const verified = typeof puter.hosting.get === "function"
        ? await puter.hosting.get(clean).catch(() => null)
        : site;

      return {
        success: Boolean(verified || site),
        url,
        subdomain: clean,
        evidence: [
          "project_files_written",
          existing ? "hosting_updated" : "hosting_created",
          "meta_updated",
          verified ? "hosting_verified" : "url_resolved",
        ],
      };
    } catch (err: any) {
      return { success: false, error: err?.message || "Deploy ล้มเหลว", evidence: ["hosting_deploy_failed"] };
    }
  }

  async listHostedSites(): Promise<HostedSiteInfo[]> {
    if (!hostingReady() || typeof puter.hosting.list !== "function") return [];
    try {
      const sites = await puter.hosting.list();
      return Array.isArray(sites) ? sites.map((s: any) => ({
        subdomain: s.subdomain || "",
        root_dir: s.root_dir || "",
        url: siteUrl(s.subdomain || "", s),
      })) : [];
    } catch { return []; }
  }

  async unpublishSite(subdomain: string, projectId?: string): Promise<boolean> {
    if (!hostingReady() || typeof puter.hosting.delete !== "function") return false;
    try {
      await puter.hosting.delete(cleanSubdomain(subdomain));
      if (projectId) {
        const path = `${this.baseDir}/${projectId}/meta.json`;
        try {
          const file = await puter.fs.read(path);
          const meta = JSON.parse(await file.text());
          delete meta.hostedUrl;
          delete meta.subdomain;
          meta.status = "draft";
          meta.updatedAt = new Date().toISOString();
          await puter.fs.write(path, JSON.stringify(meta, null, 2));
        } catch {}
      }
      return true;
    } catch { return false; }
  }
}

export const BossnuDeploy = new BossnuDeployService();
