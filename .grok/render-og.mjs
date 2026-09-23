import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const html = pathToFileURL(resolve("/workspace/.grok/og-card.html")).href;
const out = resolve("/workspace/.grok/og-card-raw.png");

const browser = await chromium.launch({ args: ["--disable-web-security"] });
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
});
await page.goto(html, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(200);
await page.screenshot({ path: out, type: "png" });
await browser.close();
console.log("wrote", out);
