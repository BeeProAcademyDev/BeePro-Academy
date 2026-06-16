import sharp from 'sharp'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const source = path.join(root, 'logo', '3f1d81da-1977-489a-af14-09cc9908bf06.jpg')
const output = path.join(root, 'public', 'assets', 'platform-logo.png')

const { data, info } = await sharp(source)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })

const { width, height, channels } = info
const threshold = 28

for (let i = 0; i < data.length; i += channels) {
  const r = data[i]
  const g = data[i + 1]
  const b = data[i + 2]

  if (r <= threshold && g <= threshold && b <= threshold) {
    data[i + 3] = 0
  } else {
    data[i + 3] = 255
  }
}

const trimmed = await sharp(data, { raw: { width, height, channels } })
  .trim({ threshold: 10 })
  .png({ compressionLevel: 9, quality: 100 })
  .toBuffer()

await sharp(trimmed)
  .resize({ width: 640, withoutEnlargement: true })
  .png()
  .toFile(output)

const meta = await sharp(output).metadata()
console.log(`Saved ${output} (${meta.width}x${meta.height})`)
