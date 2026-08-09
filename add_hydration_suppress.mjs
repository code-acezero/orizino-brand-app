import fs from "fs";
import path from "path";

const root = "d:/ACE ZERO/My web Project Data/Ace Web Project/orizino-brand/apps";

for (const app of ["company", "storefront", "masterpanel", "orderops"]) {
  const p = path.join(root, app, "src/app/layout.tsx");
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, "utf-8");
    if (!content.includes("suppressHydrationWarning")) {
      content = content.replace("<html ", "<html suppressHydrationWarning ");
      content = content.replace("<body ", "<body suppressHydrationWarning ");
      fs.writeFileSync(p, content);
      console.log(`Added suppressHydrationWarning to ${p}`);
    }
  }
}
