import fs from 'node:fs'
import zlib from 'node:zlib'

const width = 1024
const height = 1024
const outPath = 'public/textures/generated/model_grass_ground.png'

function clamp(v, min = 0, max = 255) {
  return Math.max(min, Math.min(max, v))
}

function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

function mix(a, b, t) {
  return [
    a[0] * (1 - t) + b[0] * t,
    a[1] * (1 - t) + b[1] * t,
    a[2] * (1 - t) + b[2] * t,
  ]
}

function writeU32(buf, offset, value) {
  buf.writeUInt32BE(value >>> 0, offset)
}

const crcTable = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  crcTable[n] = c >>> 0
}

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type)
  const out = Buffer.alloc(12 + data.length)
  writeU32(out, 0, data.length)
  typeBuf.copy(out, 4)
  data.copy(out, 8)
  writeU32(out, 8 + data.length, crc32(Buffer.concat([typeBuf, data])))
  return out
}

const dark = [9, 20, 7]
const root = [15, 33, 13]
const mid = [32, 55, 22]
const lit = [56, 72, 28]
const dryTip = [72, 72, 34]
const pixels = Buffer.alloc((width * 4 + 1) * height)

for (let y = 0; y < height; y++) {
  const row = y * (width * 4 + 1)
  pixels[row] = 0
  for (let x = 0; x < width; x++) {
    const p = row + 1 + x * 4
    const n1 = hash(x * 0.73 + y * 1.31)
    const n2 = hash(x * 3.11 - y * 0.41)
    const n3 = hash(Math.floor(x / 9) * 19 + Math.floor(y / 9) * 23)
    let color = mix(dark, mid, 0.25 + n1 * 0.45)
    color = mix(color, root, n3 * 0.35)
    if (n2 > 0.76) color = mix(color, lit, (n2 - 0.76) * 1.9)
    if (n1 > 0.93) color = mix(color, dryTip, (n1 - 0.93) * 1.7)
    const shade = 0.78 + hash(x * 1.7 + y * 2.3) * 0.28
    pixels[p] = clamp(Math.round(color[0] * shade))
    pixels[p + 1] = clamp(Math.round(color[1] * shade))
    pixels[p + 2] = clamp(Math.round(color[2] * shade))
    pixels[p + 3] = 255
  }
}

// Add long, wrap-safe blade strokes matching the model grass palette.
for (let i = 0; i < 6200; i++) {
  const seed = 1000 + i * 17
  const cx = Math.floor(hash(seed + 1) * width)
  const cy = Math.floor(hash(seed + 2) * height)
  const angle = hash(seed + 3) * Math.PI * 2
  const len = 18 + hash(seed + 4) * 44
  const bladeColor = mix(mid, lit, hash(seed + 5) * 0.55)
  const alpha = 0.20 + hash(seed + 6) * 0.28
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)

  for (let step = -len * 0.45; step <= len * 0.55; step += 1) {
    const t = (step / len) + 0.45
    const taper = 1 - Math.abs(t - 0.5) * 1.7
    if (taper <= 0) continue
    const sx = Math.round(cx + dx * step)
    const sy = Math.round(cy + dy * step)
    for (let side = -1; side <= 1; side++) {
      const px = (sx + Math.round(-dy * side) + width) % width
      const py = (sy + Math.round(dx * side) + height) % height
      const p = py * (width * 4 + 1) + 1 + px * 4
      const a = alpha * taper * (side === 0 ? 1 : 0.45)
      pixels[p] = clamp(Math.round(pixels[p] * (1 - a) + bladeColor[0] * a))
      pixels[p + 1] = clamp(Math.round(pixels[p + 1] * (1 - a) + bladeColor[1] * a))
      pixels[p + 2] = clamp(Math.round(pixels[p + 2] * (1 - a) + bladeColor[2] * a))
    }
  }
}

const ihdr = Buffer.alloc(13)
writeU32(ihdr, 0, width)
writeU32(ihdr, 4, height)
ihdr[8] = 8
ihdr[9] = 6
ihdr[10] = 0
ihdr[11] = 0
ihdr[12] = 0

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(pixels, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
])

fs.writeFileSync(outPath, png)
console.log(`Wrote ${outPath}`)
