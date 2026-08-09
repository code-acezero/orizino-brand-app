import { chromium } from "playwright";
import path from "path";

const ARTIFACT_DIR = "C:\\Users\\azim3\\.gemini\\antigravity-ide\\brain\\3035d092-663b-444e-b1f4-4f273b5791fa";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

page.on("console", (msg) => {
  if (msg.type() === "error") console.log(`[E] ${msg.text().slice(0, 200)}`);
});

await page.goto("http://localhost:3001", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(2000);

const totalHeight = await page.evaluate(() => document.body.scrollHeight);
console.log(`[Info] Total height after 2s wait: ${totalHeight}px`);

// Full page screenshot
await page.screenshot({ path: path.join(ARTIFACT_DIR, "full_page.png"), fullPage: true });
console.log("[Screenshot] full_page.png");

// Check for footer element
const footerText = await page.evaluate(() => {
  const footer = document.querySelector("footer");
  if (!footer) return "no footer element found";
  const rect = footer.getBoundingClientRect();
  const scrollTop = window.scrollY;
  return `footer found: offsetTop=${footer.offsetTop}, scrollHeight=${footer.scrollHeight}, rect.top+scrollY=${rect.top + scrollTop}`;
});
console.log(`[Footer check]: ${footerText}`);

await browser.close();
