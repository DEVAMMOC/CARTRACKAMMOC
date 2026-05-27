// One-off: generate web-optimized AMMOC logo assets.
// - ammoc.png            -> resized 512px, black bg preserved (for dark theme)
// - ammoc-transparent.png -> resized 512px, near-black pixels made transparent (for light theme)
// Run: node scripts/generate-logo-transparent.mjs
import sharp from 'sharp'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SRC = resolve(__dirname, '..', 'assets', 'logos', 'ammoc.png')
const PUBLIC = resolve(__dirname, '..', 'apps', 'web', 'public')
const DST_DARK = resolve(PUBLIC, 'ammoc.png')
const DST_LIGHT = resolve(PUBLIC, 'ammoc-transparent.png')
const MAX_WIDTH = 512
const THRESHOLD = 24 // pixel is "background" if R<24 AND G<24 AND B<24

// 1. Resize + write the dark-theme variant (keeps black bg)
await sharp(SRC)
  .resize({ width: MAX_WIDTH, withoutEnlargement: true })
  .png({ compressionLevel: 9 })
  .toFile(DST_DARK)
console.log(`Wrote ${DST_DARK}`)

// 2. Same resize, then strip near-black pixels to alpha=0 for the light-theme variant
const { data, info } = await sharp(SRC)
  .resize({ width: MAX_WIDTH, withoutEnlargement: true })
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
  .toFile(DST_LIGHT)
console.log(`Wrote ${DST_LIGHT}`)
