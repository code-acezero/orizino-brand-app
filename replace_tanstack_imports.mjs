import fs from "fs";
import path from "path";

const root = "d:/ACE ZERO/My web Project Data/Ace Web Project/orizino-brand/apps";

function replaceInDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      replaceInDir(full);
    } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
      let content = fs.readFileSync(full, "utf-8");
      let changed = false;

      if (content.includes("@tanstack/react-router")) {
        content = content.replace(/from\s+["']@tanstack\/react-router["']/g, 'from "@orizino/shared/lib/router-compat"');
        content = content.replace(/import\s+["']@tanstack\/react-router["']/g, 'import "@orizino/shared/lib/router-compat"');
        changed = true;
      }
      if (content.includes("@tanstack/react-start/server")) {
        content = content.replace(/from\s+["']@tanstack\/react-start\/server["']/g, 'from "@orizino/shared/lib/server-fn-compat"');
        changed = true;
      }
      if (content.includes("@tanstack/react-start")) {
        content = content.replace(/from\s+["']@tanstack\/react-start["']/g, 'from "@orizino/shared/lib/server-fn-compat"');
        content = content.replace(/import\s+["']@tanstack\/react-start["']/g, 'import "@orizino/shared/lib/server-fn-compat"');
        changed = true;
      }

      if (changed) {
        fs.writeFileSync(full, content);
      }
    }
  }
}

replaceInDir(root);
console.log("Replaced all @tanstack/react-router and @tanstack/react-start imports across all apps!");
