import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.join(__dirname, '../src')

function walk(dir, files = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name)
    if (e.isDirectory() && !f.includes('locales')) walk(f, files)
    else if (/\.(jsx|js)$/.test(e.name)) files.push(f)
  }
  return files
}

function fixContent(content) {
  let c = content
  const original = c

  // Inside ternaries: ? {t(' -> ? t('  and  : {t(' -> : t(
  c = c.replace(/\?\s*\{t\(/g, '? t(')
  c = c.replace(/:\s*\{t\(/g, ': t(')

  // Double-wrapped: {t('key')} inside already-braced context from bad migration
  // Fix {t('key')}` leftover from broken template literals at start of alert
  c = c.replace(/t\('([^']+)'\)\}`\s*\n\s*:\s*`([^`]+)`/g, "`${t('$1')}`")

  // Missing closing brace on JSX t() lines: {t('key') at EOL -> {t('key')}
  c = c.replace(/\{t\('([^']+)'\)\s*$/gm, "{t('$1')}")

  // Extra closing brace: {t('key')}} -> {t('key')}
  c = c.replace(/\{t\('([^']+)'\)\}\}/g, "{t('$1')}")

  // Broken pattern: t('key')}` alone on line (orphan backtick)
  c = c.replace(/^\s*t\('([^']+)'\)\}`\s*$/gm, "        `${t('$1')}`")

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
