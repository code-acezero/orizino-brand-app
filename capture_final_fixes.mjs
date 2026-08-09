import { chromium } from "playwright";
import path from "path";

const ARTIFACT_DIR = "C:\\Users\\azim3\\.gemini\\antigravity-ide\\brain\\3035d092-663b-444e-b1f4-4f273b5791fa";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// 1. Capture Storefront Homepage Bottom (Should show CinematicProductShowcase)
await page.goto("http://localhost:3001");
await page.waitForTimeout(3000);
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(1000);
await page.screenshot({ path: path.join(ARTIFACT_DIR, "storefront_cinematic_showcase.png") });

// 2. Capture Company Landing Page (Should show Brand Story)
await page.goto("http://localhost:3000");
await page.waitForTimeout(3000);
await page.screenshot({ path: path.join(ARTIFACT_DIR, "company_brand_story.png") });

// 3. Capture Storefront Navbar Guest Menu (Open)
await page.goto("http://localhost:3001");
await page.waitForTimeout(3000);
// Click the User Profile icon
await page.click('button[aria-label="Account"]');
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(ARTIFACT_DIR, "storefront_guest_menu.png") });

await browser.close();
