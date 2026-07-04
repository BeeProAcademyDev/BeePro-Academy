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

  // ({t('key')}) -> t('key') in JS expressions
  content = content.replace(/\(\{t\('([^']+)'\)\}\)/g, "t('$1')")
  // setX({t('key')}) -> setX(t('key'))
  content = content.replace(/\(\{t\('([^']+)'\)\}\)/g, "t('$1')")
  content = content.replace(/\{t\('([^']+)'\)\}(?!\})/g, (match, key, offset, str) => {
    // setError({t('key')}) pattern - opening paren before {
    const before = str.slice(Math.max(0, offset - 20), offset)
    if (/set[A-Z]\w*\($/.test(before) || /setError\($/.test(before)) {
      return `t('${key}')`
    }
    return match
  })

  // Fix setError({t('key')}) specifically
  content = content.replace(/set(\w+)\(\{t\('([^']+)'\)\}\)/g, "set$1(t('$2')")

  if (content !== original) {
    fs.writeFileSync(filePath, content)
    console.log('Fixed:', path.relative(srcDir, filePath))
  }
}

walk(srcDir)
console.log('Paren fix complete')
