import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const i18nPath = path.join(__dirname, '../src/i18n/i18n.js')
const lines = fs.readFileSync(i18nPath, 'utf8').split(/\r?\n/)
const startIdx = lines.findIndex((l) => l.startsWith('const resources = '))
const endIdx = lines.findIndex((l) => l.startsWith('i18n.use(initReactI18next)'))
if (startIdx === -1 || endIdx === -1) throw new Error('Could not parse i18n.js')

const resourcesCode = lines.slice(startIdx, endIdx).join('\n').replace(/^const resources = /, '')
// eslint-disable-next-line no-eval
const resources = eval('(' + resourcesCode + ')')

const localesDir = path.join(__dirname, '../src/i18n/locales')
fs.mkdirSync(localesDir, { recursive: true })
fs.writeFileSync(path.join(localesDir, 'ar.json'), JSON.stringify(resources.ar.translation, null, 2))
fs.writeFileSync(path.join(localesDir, 'en.json'), JSON.stringify(resources.en.translation, null, 2))
console.log('Extracted to locales/')
