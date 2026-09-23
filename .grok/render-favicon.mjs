import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="8" fill="#1f4e8c"/>
  <rect x="8" y="9" width="16" height="3.2" rx="1.4" fill="#fbfaf7"/>
  <rect x="8" y="14.4" width="12" height="3.2" rx="1.4" fill="#fbfaf7"/>
  <rect x="8" y="19.8" width="8" height="3.2" rx="1.4" fill="#fbfaf7"/>
</svg>`;
writeFileSync("/workspace/.grok/favicon-check.html", `<!DOCTYPE html>
<html><body style="margin:0;background:#ddd">
  <div style="display:flex;gap:24px;padding:16px;align-items:end">
    <img src="data:image/svg+xml;utf8,${encodeURIComponent(svg)}" width="16" height="16" />
    <img src="data:image/svg+xml;utf8,${encodeURIComponent(svg)}" width="32" height="32" />
    <img src="data:image/svg+xml;utf8,${encodeURIComponent(svg)}" width="64" height="64" />
  </div>
</body></html>`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 280, height: 120 }, deviceScaleFactor: 2 });
await page.goto("file:///workspace/.grok/favicon-check.html");
await page.screenshot({ path: "/workspace/.grok/favicon-check.png", type: "png" });
await browser.close();
console.log("wrote favicon check");
