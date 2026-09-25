#!/usr/bin/env node
import { chromium } from "playwright";

const html = `<!doctype html><html><head><title>GUPANU Sandbox Smoke</title></head><body><main id="sandbox-smoke">Sandbox OK</main><script>document.querySelector("#sandbox-smoke").dataset.executed = "true";</script></body></html>`;

const startedAt = Date.now();
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({ offline: true, serviceWorkers: "block" });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 5000 });
  await page.waitForTimeout(100);
  const result = await page.evaluate(() => ({
    readyState: document.readyState,
    bodyChildren: document.body?.children.length ?? 0,
    executed: document.querySelector("#sandbox-smoke")?.getAttribute("data-executed") === "true",
  }));
  if (result.readyState !== "complete" || result.bodyChildren === 0 || !result.executed || errors.length) {
    throw new Error(JSON.stringify({ result, errors }));
  }
  console.log(JSON.stringify({
    sandbox: "playwright-browser",
    ok: true,
    durationMs: Date.now() - startedAt,
    evidence: ["browser_started", "html_loaded", "dom_present", "script_executed", "console_clean"],
  }));
} catch (error) {
  console.error(JSON.stringify({
    sandbox: "playwright-browser",
    ok: false,
    durationMs: Date.now() - startedAt,
    error: error instanceof Error ? error.message : String(error),
  }));
  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => undefined);
}
