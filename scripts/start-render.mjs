#!/usr/bin/env node
/**
 * Render/production starter — picks the server entry Nitro actually emitted.
 * - node-server preset → .output/server/index.mjs
 * - vercel preset → cannot run as long-lived process; rebuild hint
 */
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
process.env.PLAYWRIGHT_BROWSERS_PATH = "0";
const nodeServer = join(root, ".output/server/index.mjs");
const vercelServer = join(root, ".vercel/output/functions/__server.func/index.mjs");

const port = process.env.PORT || "10000";
process.env.PORT = port;
process.env.NITRO_PORT = port;
process.env.HOST = process.env.HOST || "0.0.0.0";


function run(file) {
  console.log(`[start] ${file} (PORT=${port})`);
  const child = spawn(process.execPath, [file], {
    stdio: "inherit",
    env: process.env,
    cwd: root,
  });
  child.on("exit", (code) => process.exit(code ?? 1));
}

if (existsSync(nodeServer)) {
  run(nodeServer);
} else if (existsSync(vercelServer)) {
  console.error(
    "[start] Found Vercel serverless output only (.vercel/output).\n" +
      "Render needs Nitro preset node-server.\n" +
      "Rebuild with: RENDER=true npm run build   (or NITRO_PRESET=node-server)",
  );
  process.exit(1);
} else {
  console.error(
    "[start] No server entry found. Expected .output/server/index.mjs after build.",
  );
  process.exit(1);
}
