import fs from 'node:fs'
import zlib from 'node:zlib'

const width = 512
const height = 512
const outPath = 'public/textures/generated/model_grass_card.png'

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

const pixels = Buffer.alloc((width * 4 + 1) * height)
for (let y = 0; y < height; y++) {
  pixels[y * (width * 4 + 1)] = 0
}

const root = [3, 8, 3]
const dark = [0, 3, 1]
const mid = [7, 13, 7]
const lit = [10, 18, 10]
const dryTip = [12, 20, 12]

function blendPixel(x, y, color, alpha) {
  if (x < 0 || x >= width || y < 0 || y >= height || alpha <= 0) return
  const p = y * (width * 4 + 1) + 1 + x * 4
  const dstA = pixels[p + 3] / 255
  const srcA = clamp(alpha, 0, 1)
  const outA = srcA + dstA * (1 - srcA)
  if (outA <= 0) return
  pixels[p] = clamp(Math.round((color[0] * srcA + pixels[p] * dstA * (1 - srcA)) / outA))
  pixels[p + 1] = clamp(Math.round((color[1] * srcA + pixels[p + 1] * dstA * (1 - srcA)) / outA))
  pixels[p + 2] = clamp(Math.round((color[2] * srcA + pixels[p + 2] * dstA * (1 - srcA)) / outA))
  pixels[p + 3] = clamp(Math.round(outA * 255))
}

function drawBlade(seed, baseX, baseY, length, widthPx, bend) {
  const side = hash(seed + 1) > 0.5 ? 1 : -1
  const lean = (hash(seed + 2) - 0.5) * 54 + bend * side
  const curve = (hash(seed + 3) - 0.5) * 32 + bend * side * 0.45
  const colorBias = hash(seed + 4)

  for (let step = 0; step <= length; step += 1) {
    const t = step / length
    const taper = Math.pow(1 - t, 0.82)
    const x = baseX + lean * t + curve * Math.sin(t * Math.PI) * t
    const y = baseY - length * t
    const half = Math.max(0.45, widthPx * taper)
    let color = mix(root, mid, Math.min(1, t * 1.35))
    if (colorBias > 0.68) color = mix(color, lit, (colorBias - 0.68) * 1.6 * t)
    if (t > 0.82 && colorBias > 0.45) color = mix(color, dryTip, (t - 0.82) * 2.4)
    const shade = 0.94 + hash(seed + step * 0.37) * 0.10
    color = color.map((v) => v * shade)

    for (let dx = -Math.ceil(half); dx <= Math.ceil(half); dx++) {
      const edge = Math.max(0, 1 - Math.abs(dx) / (half + 0.75))
      blendPixel(Math.round(x + dx), Math.round(y), color, edge * 0.92)
      if (step > 1) blendPixel(Math.round(x + dx), Math.round(y + 1), color, edge * 0.34)
    }
  }
}

for (let cluster = 0; cluster < 5; cluster++) {
  const clusterSeed = 2000 + cluster * 97
  const centerX = width * (0.26 + cluster * 0.12) + (hash(clusterSeed) - 0.5) * 30
  const baseY = height - 34 - hash(clusterSeed + 1) * 12
  const blades = 18 + Math.floor(hash(clusterSeed + 2) * 9)
  for (let i = 0; i < blades; i++) {
    const seed = clusterSeed + i * 13
    const baseX = centerX + (hash(seed + 5) - 0.5) * 42
    const length = 205 + hash(seed + 6) * 220
    const widthPx = 1.8 + hash(seed + 7) * 3.8
    const bend = (hash(seed + 8) - 0.5) * 85
    drawBlade(seed, baseX, baseY, length, widthPx, bend)
  }
}

// Darken and connect the root area so the card reads as one grass clump.
for (let i = 0; i < 2600; i++) {
  const seed = 9000 + i * 5
  const x = Math.round(width * 0.5 + (hash(seed) - 0.5) * 285)
  const y = Math.round(height - 45 + (hash(seed + 1) - 0.5) * 34)
  const radius = 2 + hash(seed + 2) * 5
  for (let yy = -radius; yy <= radius; yy++) {
    for (let xx = -radius; xx <= radius; xx++) {
      const d = Math.sqrt(xx * xx + yy * yy) / radius
      if (d <= 1) blendPixel(x + xx, y + yy, dark, (1 - d) * 0.045)
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
