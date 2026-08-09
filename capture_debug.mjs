import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

await page.goto("http://localhost:3001", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(2000);

const result = await page.evaluate(() => {
  const h = document.body.scrollHeight;
  const mainDiv = document.querySelector(".min-h-screen");
  
  if (!mainDiv) return { error: "no .min-h-screen" };
  
  const children = Array.from(mainDiv.children).map(c => ({
    tag: c.tagName,
    cls: c.className?.slice(0, 60),
    id: c.id,
    childCount: c.children.length,
    innerHTML: c.innerHTML.slice(0, 100),
  }));
  
  return {
    totalHeight: h,
    mainDivChildren: children,
  };
});

console.log(JSON.stringify(result, null, 2));

await browser.close();
