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
let total = 0;
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (
      /^console\.(log|warn|error|info|debug)\(/.test(trimmed) &&
      !/import\.meta\.env\.DEV/.test(line)
    ) {
      console.log(`${file}:${i + 1}:${trimmed}`);
      total++;
    }
  }
}
console.log(`total ${total}`);
