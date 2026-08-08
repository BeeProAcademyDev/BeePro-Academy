const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "../src");
const exts = new Set([".js", ".jsx", ".ts", ".tsx"]);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((dirent) => {
    const fullPath = path.join(dir, dirent.name);
    if (dirent.isDirectory()) return walk(fullPath);
    return [fullPath];
  });
}

const files = walk(root).filter((file) => exts.has(path.extname(file)));
const modifiedFiles = [];

for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);
  let changed = false;
  const transformed = lines.map((line) => {
    const trimmed = line.trim();
    if (!/^console\.(log|warn|error|info|debug)\(/.test(trimmed)) {
      return line;
    }
    if (/import\.meta\.env\.DEV/.test(line)) {
      return line;
    }
    if (/^\s*\/\//.test(line) || /^\s*\*/.test(line) || /^\s*\/\*/.test(line)) {
      return line;
    }
    changed = true;
    const indent = (line.match(/^\s*/) || [""])[0];
    return `${indent}if (import.meta.env.DEV) ${trimmed}`;
  });
  if (changed) {
    fs.writeFileSync(file, transformed.join("\n"));
    modifiedFiles.push(file);
  }
}

console.log(`Patched ${modifiedFiles.length} files`);
modifiedFiles.forEach((file) => console.log(file));
