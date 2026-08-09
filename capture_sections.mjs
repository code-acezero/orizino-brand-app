import { chromium } from "playwright";
import { writeFileSync } from "fs";
import path from "path";

const ARTIFACT_DIR = "C:\\Users\\azim3\\.gemini\\antigravity-ide\\brain\\3035d092-663b-444e-b1f4-4f273b5791fa";

async function captureSection(page, filename, scrollY) {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), scrollY);
  await page.waitForTimeout(800);
  const dest = path.join(ARTIFACT_DIR, filename);
  await page.screenshot({ path: dest, fullPage: false });
  console.log(`[Screenshot] Saved ${filename} at scrollY=${scrollY}`);
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

page.on("console", (msg) => {
  if (msg.type() === "error") console.log(`[Console Error] ${msg.text().slice(0, 120)}`);
});

try {
  await page.goto("http://localhost:3001", { waitUntil: "networkidle", timeout: 20000 });
  console.log(`[Page Title] ${await page.title()}`);

  // Hero
  await captureSection(page, "section_1_hero.png", 0);

  // Below hero — Marquee + Editorial Grid
  await captureSection(page, "section_2_featured.png", 950);

  // Brand story
  await captureSection(page, "section_3_brand_story.png", 1900);

  // New Arrivals
  await captureSection(page, "section_4_arrivals.png", 3000);

  // Material / Category
  await captureSection(page, "section_5_material.png", 4200);

  // Footer area
  await captureSection(page, "section_6_footer.png", 6000);

} finally {
  await browser.close();
}
