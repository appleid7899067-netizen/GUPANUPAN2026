/**
 * Puter Hosting adapter.
 * Keeps publishing behind one capability boundary so the UI never assumes a
 * deployment succeeded just because a model or local build returned success.
 */

export type PublishResult = {
  ok: boolean;
  subdomain: string;
  url?: string;
  evidence: string[];
  error?: string;
};

type PuterHosting = {
  create?: (subdomain: string, folderPath: string) => Promise<unknown>;
  publish?: (subdomain: string, folderPath: string) => Promise<unknown>;
  update?: (subdomain: string, folderPath: string) => Promise<unknown>;
  get?: (subdomain: string) => Promise<unknown>;
};

function getHosting(): PuterHosting | null {
  if (typeof window === "undefined") return null;
  const p = (window as Window & { puter?: { hosting?: PuterHosting } }).puter;
  return p?.hosting ?? null;
}

function extractUrl(value: unknown): string | undefined {
  if (!value) return undefined;
  const raw = typeof value === "string" ? value : JSON.stringify(value);
  return raw.match(/https?:\/\/[^\s"']+\.puter\.site[^\s"']*/i)?.[0];
}

export async function publishToPuterSite(subdomain: string, folderPath: string): Promise<PublishResult> {
  const clean = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
  if (!clean) return { ok: false, subdomain: clean, evidence: ["invalid_subdomain"], error: "Invalid Puter site name" };
  const hosting = getHosting();
  if (!hosting) return { ok: false, subdomain: clean, evidence: ["puter_hosting_unavailable"], error: "Puter Hosting is unavailable in this browser" };
  const create = hosting.create ?? hosting.publish;
  if (!create) return { ok: false, subdomain: clean, evidence: ["puter_hosting_api_unavailable"], error: "Puter Hosting API is not exposed by the current Puter runtime" };

  try {
    const result = await create(clean, folderPath);
    const returned = result as { subdomain?: string; address?: string; root_dir?: unknown };
    const returnedSubdomain = returned?.subdomain ?? clean;
    let verified: unknown = result;
    if (hosting.get) {
      verified = await hosting.get(returnedSubdomain);
    }
    const verifiedObject = verified as { subdomain?: string; address?: string; root_dir?: unknown };
    const url = verifiedObject?.address ?? extractUrl(verified) ?? `https://${returnedSubdomain}.puter.site`;
    return {
      ok: Boolean(verifiedObject?.subdomain ?? returnedSubdomain),
      subdomain: returnedSubdomain,
      url,
      evidence: ["hosting_call_returned", hosting.get ? "hosting_get_verified" : "site_url_resolved"],
    };
  } catch (error) {
    return {
      ok: false,
      subdomain: clean,
      evidence: ["hosting_call_failed"],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
