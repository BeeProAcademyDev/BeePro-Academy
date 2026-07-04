import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.join(__dirname, '../src')

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, files)
    else if (/\.jsx$/.test(entry.name)) files.push(full)
  }
  return files
}

for (const filePath of walk(srcDir)) {
  let content = fs.readFileSync(filePath, 'utf8')
  if (!content.match(/\{t\(['"]/)) continue
  if (content.includes('useTranslation')) continue

  const lines = content.split(/\r?\n/)
  let insertAt = 0
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ')) insertAt = i + 1
    else if (insertAt > 0 && !lines[i].startsWith('import ') && lines[i].trim()) break
  }
  lines.splice(insertAt, 0, "import { useTranslation } from 'react-i18next'")
  content = lines.join('\n')

  // Insert hook after component opening
  const hookPatterns = [
    /^(const \w+ = \(\{[\s\S]*?\}\) => \{\n)/m,
    /^(const \w+ = \(\) => \{\n)/m,
    /^(function \w+\(\{[\s\S]*?\}\) \{\n)/m,
    /^(function \w+\(\) \{\n)/m,
  ]
  let hooked = false
  for (const pattern of hookPatterns) {
    if (pattern.test(content)) {
      content = content.replace(pattern, "$1  const { t } = useTranslation()\n")
      hooked = true
      break
    }
  }

  if (hooked) {
    fs.writeFileSync(filePath, content)
    console.log('Added hook:', path.relative(srcDir, filePath))
  } else {
    console.warn('Could not hook:', path.relative(srcDir, filePath))
  }
}
