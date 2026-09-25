import { createFileRoute } from "@tanstack/react-router";
import { chromium } from "playwright";

type SandboxBody = {
  html?: unknown;
  timeoutMs?: unknown;
};

const MAX_HTML_BYTES = 750_000;
const MAX_TIMEOUT_MS = 15_000;
const DEFAULT_TIMEOUT_MS = 8_000;

function asTimeout(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_TIMEOUT_MS;
  return Math.max(1000, Math.min(MAX_TIMEOUT_MS, Math.floor(value)));
}

function asHtml(value: unknown): string {
  return typeof value === "string" ? value : "";
}

async function runBrowserSandbox(html: string, timeoutMs: number) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  const startedAt = Date.now();
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });

    const context = await browser.newContext({
      offline: true,
      serviceWorkers: "block",
    });
    const page = await context.newPage();

    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text().slice(0, 500));
      }
    });
    page.on("pageerror", (error) => {
      pageErrors.push(String(error.message || error).slice(0, 500));
    });
    page.on("requestfailed", (request) => {
      failedRequests.push(
        `${request.url().slice(0, 300)}: ${request.failure()?.errorText || "request failed"}`,
      );
    });

    await page.setContent(html, {
      waitUntil: "domcontentloaded",
      timeout: timeoutMs,
    });
    await page.waitForTimeout(150);

    const snapshot = await page.evaluate(() => ({
      title: document.title,
      bodyTextLength: document.body?.innerText?.length ?? 0,
      bodyChildren: document.body?.children.length ?? 0,
      readyState: document.readyState,
    }));

    const ok =
      pageErrors.length === 0 &&
      consoleErrors.length === 0 &&
      snapshot.readyState === "complete" &&
      snapshot.bodyChildren > 0;

    return {
      ok,
      runtime: "playwright-browser-sandbox",
      durationMs: Date.now() - startedAt,
      evidence: [
        "browser_started",
        "html_loaded",
        snapshot.readyState === "complete" ? "document_complete" : "document_not_complete",
        snapshot.bodyChildren > 0 ? "dom_present" : "dom_empty",
        consoleErrors.length === 0 ? "console_clean" : "console_error",
        pageErrors.length === 0 ? "page_error_free" : "page_error",
      ],
      snapshot,
      consoleErrors,
      pageErrors,
      failedRequests: failedRequests.slice(0, 10),
    };
  } catch (error) {
    return {
      ok: false,
      runtime: "playwright-browser-sandbox",
      durationMs: Date.now() - startedAt,
      evidence: ["browser_execution_failed"],
      error: error instanceof Error ? error.message : String(error),
      consoleErrors,
      pageErrors,
      failedRequests: failedRequests.slice(0, 10),
    };
  } finally {
    await browser?.close().catch(() => undefined);
  }
}

export const Route = createFileRoute("/api/sandbox")({
  server: {
    handlers: {
      GET: async () => {
        const smokeHtml = `<!doctype html><html><head><title>GUPANU Sandbox Smoke</title></head><body><main id="sandbox-smoke">Sandbox OK</main><script>document.querySelector("#sandbox-smoke").dataset.executed = "true";</script></body></html>`;
        const result = await runBrowserSandbox(smokeHtml, 5000);
        return Response.json({ smokeTest: true, ...result }, { status: result.ok ? 200 : 503 });
      },
      POST: async ({ request }) => {
        let body: SandboxBody;
        try {
          body = (await request.json()) as SandboxBody;
        } catch {
          return Response.json({ ok: false, error: "Invalid sandbox request." }, { status: 400 });
        }

        const html = asHtml(body.html);
        if (!html.trim()) {
          return Response.json({ ok: false, error: "Sandbox requires HTML." }, { status: 400 });
        }
        if (Buffer.byteLength(html, "utf8") > MAX_HTML_BYTES) {
          return Response.json(
            { ok: false, error: `Sandbox artifact exceeds ${MAX_HTML_BYTES} bytes.` },
            { status: 413 },
          );
        }

        const result = await runBrowserSandbox(html, asTimeout(body.timeoutMs));
        return Response.json(result, { status: result.ok ? 200 : 422 });
      },
    },
  },
});
