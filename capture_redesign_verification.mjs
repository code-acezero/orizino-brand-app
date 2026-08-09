import { chromium } from "playwright";
import path from "path";

const ARTIFACT_DIR = "C:\\Users\\azim3\\.gemini\\antigravity-ide\\brain\\3035d092-663b-444e-b1f4-4f273b5791fa";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// 1. Capture Company Landing Page (Newsletter block)
await page.goto("http://localhost:3000");
await page.waitForTimeout(2000);
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(2000);
await page.screenshot({ path: path.join(ARTIFACT_DIR, "company_newsletter.png") });

// 2. Capture Company Lookbook
await page.goto("http://localhost:3000/lookbook");
await page.waitForTimeout(2000);
await page.screenshot({ path: path.join(ARTIFACT_DIR, "company_lookbook.png") });

// 3. Capture Storefront Homepage
await page.goto("http://localhost:3001");
await page.waitForTimeout(3000);
await page.screenshot({ path: path.join(ARTIFACT_DIR, "storefront_homepage_clean.png") });

// 4. Capture Storefront Footer
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(2000);
await page.screenshot({ path: path.join(ARTIFACT_DIR, "storefront_footer_dynamic.png") });

await browser.close();
