import fs from "fs";
import path from "path";

const root = "d:/ACE ZERO/My web Project Data/Ace Web Project/orizino-brand";

function cleanPkg(filePath) {
  if (!fs.existsSync(filePath)) return;
  const pkg = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  let changed = false;

  for (const field of ["dependencies", "devDependencies", "peerDependencies"]) {
    if (pkg[field]) {
      if (pkg[field]["@tanstack/react-router"]) {
        delete pkg[field]["@tanstack/react-router"];
        changed = true;
      }
      if (pkg[field]["@tanstack/react-start"]) {
        delete pkg[field]["@tanstack/react-start"];
        changed = true;
      }
      if (pkg[field]["@tanstack/react-router-devtools"]) {
        delete pkg[field]["@tanstack/react-router-devtools"];
        changed = true;
      }
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2));
    console.log(`Cleaned TanStack packages from ${filePath}`);
  }
}

cleanPkg(path.join(root, "package.json"));
for (const sub of ["apps/company", "apps/storefront", "apps/masterpanel", "apps/orderops", "packages/ui", "packages/shared", "packages/supabase"]) {
  cleanPkg(path.join(root, sub, "package.json"));
}
