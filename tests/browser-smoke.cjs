/** Optional UI regression test. Uses a MOCK Puter SDK: never spends AI credits.
 * PLAYWRIGHT_MODULE=/path/to/playwright node tests/browser-smoke.cjs
 * Optional CHROMIUM_MODULE=/path/to/@sparticuz/chromium for sandbox environments.
 * Run `npm run build && npm start` first. BASE_URL defaults to http://localhost:3000.
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
(async () => {
  const launch = { headless: true };
  if (process.env.CHROMIUM_MODULE) {
    const imported = await import(process.env.CHROMIUM_MODULE);
    const bundled = imported.default || imported;
    launch.executablePath = await bundled.executablePath();
    launch.args = bundled.args.filter(
      (arg) =>
        !arg.includes("disable-web-security") &&
        !arg.includes("disable-site-isolation") &&
        !arg.includes("IsolateOrigins") &&
        !arg.includes("single-process"),
    );
  }
  const browser = await chromium.launch(launch);
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 940 },
      acceptDownloads: true,
    });
    await context.route("https://js.puter.com/**", (route) =>
      route.fulfill({
        contentType: "application/javascript",
        body: `
      window.__aiMode='success';window.__aiCalls=0;window.__signedIn=false;
      window.puter={auth:{isSignedIn:()=>window.__signedIn,signIn:async()=>{window.__signedIn=true;}},ai:{chat:async(messages)=>{
        window.__aiCalls++;window.__lastMessages=messages;
        const mode=window.__aiMode;
        if(mode==='error') throw new Error('Test quota exhausted');
        return (async function*(){
          if(mode==='slow') await new Promise(r=>setTimeout(r,2500));
          if(mode==='invalid'){yield {text:'not HTML'};return;}
          yield {text:'<!doctype html><html><head><title>Built</title></head>'};
          yield {text:'<body><h1>Built by test AI</h1><button onclick="this.textContent=\\'Clicked\\'">Try me</button><script>console.log("preview ready");try{parent.localStorage}catch(e){console.log("parent blocked")}</script></body></html>'};
        })();
      }}};
    `,
      }),
    );
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("dialog", (dialog) => dialog.accept());
    const base = process.env.BASE_URL || "http://localhost:3000";
    await page.goto(base);
    await page
      .getByRole("textbox", { name: "อธิบายเว็บที่อยากสร้าง" })
      .fill("สร้างเว็บร้านกาแฟ");
    await page.getByRole("button", { name: "เริ่มสร้าง" }).click();
    await page.waitForURL("**/build/**");
    await page.getByRole("textbox", { name: "คำสั่ง AI" }).waitFor();
    assert.equal(
      await page.getByRole("textbox", { name: "คำสั่ง AI" }).inputValue(),
      "สร้างเว็บร้านกาแฟ",
    );
    assert.equal(
      await page.evaluate(() => window.__aiCalls),
      0,
      "must never automatically spend credits",
    );
    await page
      .getByRole("button", { name: "เข้าสู่ระบบ Puter เพื่อใช้ AI" })
      .click();
    await page.getByRole("button", { name: "ส่งคำสั่ง", exact: true }).click();
    await page
      .frameLocator('iframe[title="App preview"]')
      .getByRole("heading", { name: "Built by test AI" })
      .waitFor();
    await page
      .frameLocator("iframe")
      .getByRole("button", { name: "Try me" })
      .click();
    await page
      .frameLocator("iframe")
      .getByRole("button", { name: "Clicked" })
      .waitFor();
    assert.equal(
      await page.locator("iframe").getAttribute("sandbox"),
      "allow-scripts",
    );
    await page.getByRole("button", { name: /Console/ }).click();
    await page.getByText("log › parent blocked", { exact: true }).waitFor();
    await page.getByRole("tab", { name: "Code", exact: true }).click();
    const editor = page.getByRole("textbox", {
      name: "index.html source code",
    });
    const custom =
      '<!doctype html><html><head><style>h1{color:red}</style></head><body><h1>Manual edit</h1><script>console.log("manual ready")</script></body></html>';
    await editor.fill(custom);
    await page.getByRole("button", { name: "บันทึกและรัน" }).click();
    await page.getByRole("tab", { name: "Preview", exact: true }).click();
    await page
      .frameLocator("iframe")
      .getByRole("heading", { name: "Manual edit" })
      .waitFor();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export ZIP" }).click();
    const download = await downloadPromise;
    assert.match(download.suggestedFilename(), /\.zip$/);
    assert.ok(fs.statSync(await download.path()).size > 200);
    await page.reload();
    await page
      .frameLocator("iframe")
      .getByRole("heading", { name: "Manual edit" })
      .waitFor();
    await page
      .getByRole("button", { name: "เข้าสู่ระบบ Puter เพื่อใช้ AI" })
      .click();
    await page.evaluate(() => (window.__aiMode = "invalid"));
    await page
      .getByRole("textbox", { name: "คำสั่ง AI" })
      .fill("make this better");
    await page.getByRole("button", { name: "ส่งคำสั่ง", exact: true }).click();
    await page
      .getByRole("alert")
      .filter({ hasText: "HTML ที่สมบูรณ์" })
      .waitFor();
    await page
      .frameLocator("iframe")
      .getByRole("heading", { name: "Manual edit" })
      .waitFor();
    assert.ok(
      (
        await page.evaluate(() => window.__lastMessages.at(-1).content)
      ).includes("Manual edit"),
      "follow-up receives current source",
    );
    await page.evaluate(() => (window.__aiMode = "error"));
    await page.getByRole("button", { name: "ส่งคำสั่ง", exact: true }).click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Test quota exhausted" })
      .waitFor();
    await page.evaluate(() => (window.__aiMode = "slow"));
    await page.getByRole("button", { name: "ส่งคำสั่ง", exact: true }).click();
    await page.getByRole("button", { name: "หยุดรับผล", exact: true }).click();
    await page.waitForTimeout(2800);
    await page
      .frameLocator("iframe")
      .getByRole("heading", { name: "Manual edit" })
      .waitFor();
    await page.getByRole("tab", { name: "History", exact: true }).click();
    await page
      .getByRole("button", { name: "กู้คืน", exact: true })
      .first()
      .click();
    await page
      .frameLocator("iframe")
      .getByRole("heading", { name: "Built by test AI" })
      .waitFor();
    await page
      .locator("input[type=file]")
      .setInputFiles({
        name: "sample.html",
        mimeType: "text/html",
        buffer: Buffer.from(custom),
      });
    await page
      .frameLocator("iframe")
      .getByRole("heading", { name: "Manual edit" })
      .waitFor();
    await page
      .getByRole("button", { name: "Mobile preview", exact: true })
      .click();
    assert.ok((await page.locator("iframe").boundingBox()).width <= 390);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "mobile layout must not overflow",
    );
    await page.goto(base);
    await page.getByRole("link", { name: /สร้างเว็บร้านกาแฟ/ }).waitFor();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    fs.mkdirSync(".cache/screenshots", { recursive: true });
    await page.screenshot({
      path: ".cache/screenshots/home-mobile.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 1440, height: 940 });
    await page.screenshot({
      path: ".cache/screenshots/home-desktop.png",
      fullPage: true,
    });
    await page.getByRole("link", { name: /สร้างเว็บร้านกาแฟ/ }).click();
    await page
      .frameLocator("iframe")
      .getByRole("heading", { name: "Manual edit" })
      .waitFor();
    await page.screenshot({
      path: ".cache/screenshots/workspace.png",
      fullPage: true,
    });
    assert.deepEqual(pageErrors, []);
    console.log(
      "PASS: create, no auto-spend, mocked AI stream, preview interaction/isolation, console, edit/save, ZIP, reload, follow-up context, invalid output, provider error, stop, restore, import, mobile layout, project reopen.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
