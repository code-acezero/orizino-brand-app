import { chromium } from "playwright";
import path from "path";

const ARTIFACT_DIR = "C:\\Users\\azim3\\.gemini\\antigravity-ide\\brain\\3035d092-663b-444e-b1f4-4f273b5791fa";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// 1. Capture Storefront Dark Mode (Should show Midnight Charcoal + Brick Texture)
await page.goto("http://localhost:3001");
await page.waitForTimeout(3000);
await page.screenshot({ path: path.join(ARTIFACT_DIR, "storefront_dark_brick.png") });

// 2. Capture Storefront Light Mode (Should show Cream Vanilla + Brick Texture)
// Click Theme Toggle (Sun/Moon icon)
await page.click('button[aria-label="Toggle theme"]');
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(ARTIFACT_DIR, "storefront_light_brick.png") });

await browser.close();
