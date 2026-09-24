import { ensurePuter, puterIsSignedIn } from "@/lib/puter";

type PuterFS = {
  write: (
    path: string,
    data: string,
    options?: { overwrite?: boolean; createMissingParents?: boolean },
  ) => Promise<unknown>;
};

type PuterHosting = {
  get?: (subdomain: string) => Promise<unknown>;
  create: (subdomain: string, dirPath: string) => Promise<unknown>;
  update?: (subdomain: string, dirPath: string) => Promise<unknown>;
};

function siteSlug(title: string) {
  const base = title
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 28) || "gupanu-app";
  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}

function hostingUrl(value: unknown, fallback: string) {
  if (value && typeof value === "object") {
    const row = value as Record<string, unknown>;
    for (const key of ["url", "subdomain", "site_url", "siteUrl"]) {
      if (typeof row[key] === "string" && row[key]) {
        const raw = row[key] as string;
        if (/^https?:\/\//i.test(raw)) return raw;
        if (raw.includes(".puter.site")) return `https://${raw}`;
        return `https://${raw}.puter.site`;
      }
    }
  }
  return `https://${fallback}.puter.site`;
}

export async function publishToPuterSite(html: string, title: string) {
  if (!html.trim()) throw new Error("ยังไม่มี HTML ให้เผยแพร่");
  if (!(await puterIsSignedIn())) throw new Error("กรุณาล็อกอิน Puter ก่อนเผยแพร่ .puter.site");

  const puter = await ensurePuter();
  const fs = puter.fs as PuterFS | undefined;
  const hosting = puter.hosting as PuterHosting | undefined;
  if (!fs?.write || !hosting?.create) {
    throw new Error("Puter Hosting ยังไม่พร้อมในเซสชันนี้");
  }

  const subdomain = siteSlug(title);
  const rootDir = `/GUPANU-PUBLISHED/${subdomain}`;
  await fs.write(`${rootDir}/index.html`, html, {
    overwrite: true,
    createMissingParents: true,
  });

  let site: unknown;
  try {
    site = await hosting.create(subdomain, rootDir);
  } catch (error) {
    if (!hosting.update) throw error;
    site = await hosting.update(subdomain, rootDir);
  }

  // Do not report a publish as successful until Puter confirms that the
  // subdomain actually exists. The create/update response alone is not our
  // final evidence gate.
  let verifiedSite: unknown = site;
  if (hosting.get) {
    verifiedSite = await hosting.get(subdomain);
  }

  const url = hostingUrl(verifiedSite, subdomain);
  if (!/^https:\/\/[a-z0-9-]+\.puter\.site(?:\/.*)?$/i.test(url)) {
    throw new Error("Puter Hosting returned an invalid public URL");
  }

  return {
    subdomain,
    url,
    rootDir,
    verified: true,
  };
}
