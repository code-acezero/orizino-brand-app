import { chromium } from "playwright";
import path from "path";

const ARTIFACT_DIR = "C:\\Users\\azim3\\.gemini\\antigravity-ide\\brain\\3035d092-663b-444e-b1f4-4f273b5791fa";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

await page.goto("http://localhost:3001", { waitUntil: "networkidle", timeout: 25000 });

const totalHeight = await page.evaluate(() => document.body.scrollHeight);
console.log(`[Info] Total height: ${totalHeight}px`);

// Scrolled navbar (past hero)
await page.evaluate(() => window.scrollTo({ top: 950, behavior: "instant" }));
await page.waitForTimeout(700);
await page.screenshot({ path: path.join(ARTIFACT_DIR, "navbar_visible.png") });
console.log("[Screenshot] navbar_visible.png (scrolled past hero)");

// Footer — scroll to very bottom minus 1 screen
const footerY = Math.max(0, totalHeight - 1800);
await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), footerY);
await page.waitForTimeout(800);
await page.screenshot({ path: path.join(ARTIFACT_DIR, "footer_top.png") });
console.log(`[Screenshot] footer_top.png (scrollY=${footerY})`);

await page.evaluate((h) => window.scrollTo({ top: h, behavior: "instant" }), totalHeight);
await page.waitForTimeout(600);
await page.screenshot({ path: path.join(ARTIFACT_DIR, "footer_bottom.png") });
console.log("[Screenshot] footer_bottom.png (bottom of page)");

await browser.close();
