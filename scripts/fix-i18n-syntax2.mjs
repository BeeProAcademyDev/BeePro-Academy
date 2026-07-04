import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.join(__dirname, '../src')

function walk(dir, files = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name)
    if (e.isDirectory() && !f.includes('locales')) walk(f, files)
    else if (/\.jsx$/.test(e.name)) files.push(f)
  }
  return files
}

function fixContent(content) {
  let c = content
  const original = c

  // t('key')} before : in ternary (inside JSX) -> t('key')
  c = c.replace(/t\('([^']+)'\)\}\s*:/g, "t('$1') :")
  c = c.replace(/t\("([^"]+)"\)\}\s*:/g, 't("$1") :')

  // Orphan closing brace on its own line after {t('key')}
  c = c.replace(/(\{t\('[^']+'\)\})\s*\n(\s*)\}(\s*\n)/g, '$1$3')

  return { content: c, changed: c !== original }
}

for (const file of walk(srcDir)) {
  const { content, changed } = fixContent(fs.readFileSync(file, 'utf8'))
  if (changed) {
    fs.writeFileSync(file, content)
    console.log('Fixed:', path.relative(srcDir, file))
  }
}

console.log('Done')
