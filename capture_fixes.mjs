import { chromium } from "playwright";
import path from "path";

const ARTIFACT_DIR = "C:\\Users\\azim3\\.gemini\\antigravity-ide\\brain\\3035d092-663b-444e-b1f4-4f273b5791fa";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// 1. Capture Storefront Homepage (Should show CinematicHero and no flash)
await page.goto("http://localhost:3001");
await page.waitForTimeout(3000);
await page.screenshot({ path: path.join(ARTIFACT_DIR, "storefront_homepage_restored.png") });

// 2. Capture Storefront Inventory for Product Card Logo
await page.goto("http://localhost:3001/inventory");
await page.waitForTimeout(3000);
await page.screenshot({ path: path.join(ARTIFACT_DIR, "storefront_product_card_logo_fixed.png") });

await browser.close();
