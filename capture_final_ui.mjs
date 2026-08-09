import { chromium } from "playwright";
import path from "path";

const ARTIFACT_DIR = "C:\\Users\\azim3\\.gemini\\antigravity-ide\\brain\\3035d092-663b-444e-b1f4-4f273b5791fa";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// Fake auth state via localStorage
await page.goto("http://localhost:3001");
await page.evaluate(() => {
  localStorage.setItem("sb-local-auth-token", JSON.stringify({
    user: { id: "test", email: "test@example.com", user_metadata: { full_name: "Test User" } },
    access_token: "test"
  }));
});
await page.reload();
await page.waitForTimeout(3000);

// 1. Capture Header & Search
await page.click("button[aria-label='Search']");
await page.waitForTimeout(1000);
await page.screenshot({ path: path.join(ARTIFACT_DIR, "ui_search_dropdown.png") });

// close search
await page.click("button:has(.lucide-x)");
await page.waitForTimeout(1000);

// 2. Capture Header & Profile Menu
await page.click("button[aria-label='Account']");
await page.waitForTimeout(1000);
await page.screenshot({ path: path.join(ARTIFACT_DIR, "ui_profile_menu.png") });

// close profile menu
await page.click("button[aria-label='Account']");
await page.waitForTimeout(1000);

// 3. Capture Product Card (scroll to New Arrivals)
await page.evaluate(() => window.scrollTo(0, 1500));
await page.waitForTimeout(2000);
await page.screenshot({ path: path.join(ARTIFACT_DIR, "ui_product_cards.png") });

// 4. Capture Footer (scroll to bottom)
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(2000);
await page.screenshot({ path: path.join(ARTIFACT_DIR, "ui_footer.png") });

await browser.close();
