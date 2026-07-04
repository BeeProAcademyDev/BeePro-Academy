import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.join(__dirname, '../src')
const localesDir = path.join(srcDir, 'i18n/locales')

function walk(dir, files = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name)
    if (e.isDirectory() && !f.includes('locales')) walk(f, files)
    else if (/\.(jsx|js)$/.test(e.name) && !f.includes('i18n')) files.push(f)
  }
  return files
}

const ternaryFiles = []
const arabicFiles = []
const useTranslationFiles = []

for (const f of walk(srcDir)) {
  const c = fs.readFileSync(f, 'utf8')
  if (/language === 'ar' \?|isAr \?/.test(c)) ternaryFiles.push(path.relative(srcDir, f))
  if (/[\u0600-\u06FF]/.test(c)) arabicFiles.push(path.relative(srcDir, f))
  if (/useTranslation/.test(c)) useTranslationFiles.push(path.relative(srcDir, f))
}

const en = JSON.parse(fs.readFileSync(path.join(localesDir, 'en.json'), 'utf8'))
const ar = JSON.parse(fs.readFileSync(path.join(localesDir, 'ar.json'), 'utf8'))

function countKeys(obj, prefix = '') {
  let n = 0
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object') n += countKeys(v, `${prefix}${k}.`)
    else n++
  }
  return n
}

let gitFiles = []
try {
  gitFiles = execSync('git diff --name-only', { cwd: path.join(__dirname, '..'), encoding: 'utf8' })
    .trim().split('\n').filter(Boolean)
} catch { /* not a git repo */ }

const report = {
  translationKeysEn: countKeys(en),
  translationKeysAr: countKeys(ar),
  filesUsingUseTranslation: useTranslationFiles.length,
  filesWithRemainingTernaries: ternaryFiles.length,
  remainingTernaryFiles: ternaryFiles,
  filesWithHardcodedArabic: arabicFiles.length,
  remainingArabicFiles: arabicFiles,
  modifiedFiles: gitFiles,
}

fs.writeFileSync(path.join(__dirname, '../i18n-audit-report.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
