const fs = require('fs');
const path = require('path');

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      walk(full);
    } else if (full.endsWith('.js')) {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        // Find lines that require AppError without destructuring
        if (line.includes('AppError') && line.includes('require') && !line.includes('{')) {
          console.log(`BAD IMPORT: ${full}:${i + 1}: ${line.trim()}`);
        }
      });
    }
  }
}

walk('./src');
console.log('Done scanning.');
