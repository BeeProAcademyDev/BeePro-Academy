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

  // Fix trailing extra brace: {t('key')}} -> {t('key')}
  content = content.replace(/\{t\('([^']+)'\)\}\}/g, "{t('$1')}")
  // Fix attribute trailing extra brace: ={t('key')}} -> ={t('key')}
  content = content.replace(/=\{t\('([^']+)'\)\}\}/g, "={t('$1')}")

  if (content !== original) {
    fs.writeFileSync(filePath, content)
    console.log('Fixed:', path.relative(srcDir, filePath))
  }
}

walk(srcDir)
console.log('Extra brace fix complete')
