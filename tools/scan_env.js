import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const ignoreDirs = new Set([
  "node_modules",
  ".git",
  ".tmp-chrome-desktop",
  ".tmp-chrome-mobile",
  ".tmp-chrome-profile",
]);

function walk(dir, cb) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (ignoreDirs.has(name)) continue;
      walk(full, cb);
    } else if (stat.isFile()) {
      cb(full);
    }
  }
}

const procRe = /process\.env\.([A-Z0-9_]+)/g;
const viteRe = /import\.meta\.env\.VITE_([A-Z0-9_]+)/g;

const found = { process: new Set(), vite: new Set() };

walk(root, (file) => {
  try {
    const txt = fs.readFileSync(file, "utf8");
    let m;
    while ((m = procRe.exec(txt))) found.process.add(m[1]);
    while ((m = viteRe.exec(txt))) found.vite.add("VITE_" + m[1]);
  } catch (e) {}
});

const out = {
  required_server_env: Array.from(found.process).sort(),
  required_frontend_env: Array.from(found.vite).sort(),
};

console.log(JSON.stringify(out, null, 2));
