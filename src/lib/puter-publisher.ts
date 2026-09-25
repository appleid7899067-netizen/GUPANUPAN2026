/**
 * Compatibility adapter for the builder's existing publish capability.
 * The real One-Click deployment flow lives in bossnu-deploy.ts.
 */
import { BossnuDeploy } from "./bossnu-deploy";

export type PublishResult = {
  ok: boolean;
  subdomain: string;
  url?: string;
  evidence: string[];
  error?: string;
};

export async function publishToPuterSite(
  subdomain: string,
  folderPath: string,
): Promise<PublishResult> {
  const projectId = folderPath.split("/").filter(Boolean).pop() || "project";
  const result = await BossnuDeploy.deployProject(projectId, subdomain);
  return {
    ok: result.success,
    subdomain: result.subdomain || subdomain,
    url: result.url,
    evidence: result.evidence || [],
    error: result.error,
  };
}
