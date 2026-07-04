import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.join(__dirname, '../src')

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (/\.(jsx|js)$/.test(entry.name)) fixFile(full)
  }
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8')
  const original = content

  // Fix attribute double-brace: title={{t('key')}} -> title={t('key')}
  content = content.replace(/=\{\{t\('/g, "={t('")
  // Fix text double-brace: {{t('key')}} -> {t('key')}
  content = content.replace(/\{\{t\('/g, "{t('")

  if (content !== original) {
    fs.writeFileSync(filePath, content)
    console.log('Fixed:', path.relative(srcDir, filePath))
  }
}

walk(srcDir)
console.log('Double-brace fix complete')
