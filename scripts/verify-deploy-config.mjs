import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(resolve(root, file), "utf8");

const pkg = JSON.parse(read("package.json"));
const render = read("render.yaml");
const vite = read("vite.config.ts");

const errors = [];

if (pkg.scripts?.build !== "node scripts/verify-deploy-config.mjs && node scripts/with-app-env.mjs vite build && npm run db:migrate") {
  errors.push("package.json build script is not using the deployment config guard");
}
if (pkg.scripts?.start !== "node scripts/start-render.mjs") {
  errors.push("package.json start script must stay: node scripts/start-render.mjs");
}
if (!existsSync(resolve(root, "scripts/start-render.mjs"))) {
  errors.push("scripts/start-render.mjs is missing");
}
if (!/buildCommand:\s*npm install && NITRO_PRESET=node-server npm run build/.test(render)) {
  errors.push("render.yaml must build with NITRO_PRESET=node-server");
}
if (!/startCommand:\s*npm start/.test(render)) {
  errors.push("render.yaml must start with npm start");
}
if (!vite.includes('process.env.NITRO_PRESET ||') || !vite.includes('process.env.RENDER ? "node-server" : "vercel"')) {
  errors.push("vite.config.ts must keep Render -> node-server and local/Vercel -> vercel routing");
}

if (errors.length) {
  console.error("\n[deploy-guard] Configuration lock failed:\n- " + errors.join("\n- "));
  process.exit(1);
}

console.log("[deploy-guard] OK: Render build/start configuration is locked.");
