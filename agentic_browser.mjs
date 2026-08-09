import { chromium } from "@playwright/test";
import path from "path";

const targetUrl = process.argv[2] || "http://localhost:3000";
const screenshotName = process.argv[3] || "screenshot.png";
const artifactDir = "C:/Users/azim3/.gemini/antigravity-ide/brain/3035d092-663b-444e-b1f4-4f273b5791fa";

(async () => {
  console.log(`[Agentic Browser] Launching Chromium for ${targetUrl}...`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  page.on("console", (msg) => console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`));
  page.on("pageerror", (err) => console.error(`[Browser Uncaught Error] ${err.message}`));

  try {
    await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 30000 });
    const title = await page.title();
    console.log(`[Agentic Browser] Page Title: "${title}"`);

    const outPath = path.join(artifactDir, screenshotName);
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`[Agentic Browser] Screenshot saved to ${outPath}`);
  } catch (e) {
    console.error(`[Agentic Browser Error] ${e.message}`);
  } finally {
    await browser.close();
  }
})();
