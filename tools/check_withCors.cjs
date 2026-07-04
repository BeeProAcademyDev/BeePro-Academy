const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const apiV1 = path.join(root, "api", "v1");

function walk(dir, cb) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full, cb);
    } else if (stat.isFile()) {
      cb(full);
    }
  }
}

const violations = [];
walk(apiV1, (file) => {
  if (!file.endsWith(".js")) return;
  if (file.endsWith("withCors.js")) return;
  const txt = fs.readFileSync(file, "utf8");
  if (!/withCors\s*\(|import\s+\{?\s*withCors\s*\}?/.test(txt)) {
    violations.push(file);
  }
});

if (violations.length) {
  console.error(
    "CORS wrapper violations: the following api/v1 files do not use withCors()",
  );
  violations.forEach((f) => console.error("- " + f));
  process.exit(1);
} else {
  console.log("All api/v1 handlers use withCors.");
  process.exit(0);
}
