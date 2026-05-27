// One-off: generate favicon from the AMMOC logo.
// Crops to the symbol (top part) to avoid the "ammoc" wordmark looking
// like a smudge at 32x32, then writes multi-size PNG renamed to .ico.
// Run: node scripts/generate-favicon.mjs
import sharp from 'sharp'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SRC = resolve(__dirname, '..', 'assets', 'logos', 'ammoc.png')
const DST = resolve(__dirname, '..', 'apps', 'web', 'src', 'app', 'favicon.ico')

// 1. Inspect the source to know what we are cropping.
const meta = await sharp(SRC).metadata()
const w = meta.width ?? 0
const h = meta.height ?? 0

// 2. Take a square top region containing the flower (symbol only, no wordmark).
//    The flower fills the top ~58% of the source image height; everything
//    below is "ammoc" + tagline. Crop a centered square that contains only
//    the flower with a small padding.
const cropSize = Math.min(w, Math.round(h * 0.58))
const left = Math.round((w - cropSize) / 2)
const top = Math.round(h * 0.02) // tiny top padding so the flower isn't flush against the edge

// 3. Render to a 256x256 PNG (browsers accept multi-size PNG renamed to .ico).
//    Threshold near-black background to transparent so the flower floats.
const THRESHOLD = 24
const { data, info } = await sharp(SRC)
  .extract({ left, top, width: cropSize, height: cropSize })
  .resize(256, 256)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })

const out = Buffer.from(data)
for (let i = 0; i < out.length; i += 4) {
  if (out[i] < THRESHOLD && out[i + 1] < THRESHOLD && out[i + 2] < THRESHOLD) {
    out[i + 3] = 0
  }
}

await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile(DST)

console.log(`Wrote ${DST}`)
