import { chromium } from "playwright";
import path from "path";

const ARTIFACT_DIR = "C:\\Users\\azim3\\.gemini\\antigravity-ide\\brain\\3035d092-663b-444e-b1f4-4f273b5791fa";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 }
});

// Setup guest cart in localStorage before loading page
await page.goto("http://localhost:3001");
await page.evaluate(() => {
  localStorage.setItem("guest_cart", JSON.stringify([{
    product_id: "test-id",
    name: "Test Shirt",
    price: 550,
    qty: 1,
    image: "https://example.com/test.jpg"
  }]));
});

await page.goto("http://localhost:3001/checkout-guest");
await page.waitForTimeout(3000);

await page.screenshot({ path: path.join(ARTIFACT_DIR, "guest_checkout.png"), fullPage: true });
console.log("[Screenshot] guest_checkout.png");

await browser.close();
