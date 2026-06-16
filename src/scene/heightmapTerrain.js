import * as THREE from 'three'

function clamp01(v) {
  return Math.min(1, Math.max(0, v))
}

function sampleBilinear(data, w, h, u, v) {
  const x = clamp01(u) * (w - 1)
  const y = clamp01(v) * (h - 1)

  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const x1 = Math.min(x0 + 1, w - 1)
  const y1 = Math.min(y0 + 1, h - 1)
  const tx = x - x0
  const ty = y - y0

  const i00 = y0 * w + x0
  const i10 = y0 * w + x1
  const i01 = y1 * w + x0
  const i11 = y1 * w + x1

  const a = data[i00] * (1 - tx) + data[i10] * tx
  const b = data[i01] * (1 - tx) + data[i11] * tx
  return a * (1 - ty) + b * ty
}

export function createHeightmapTerrain(scene, {
  material,
  size = 192,
  segments = 256,
  maxHeight = 8,
  sharpenMix = 0.7,
  sharpenPower = 1.75,
  flatAreas = [],
  heightModifiers = [],
  heightmapUrl = '/heightmaps/main_height_1024.png',
  onReady = null,
} = {}) {
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.rotation.x = -Math.PI / 2
  mesh.receiveShadow = true
  scene.add(mesh)

  let hmW = 0
  let hmH = 0
  let hmData = null

  function shapeHeight(hNorm) {
    const curved = Math.pow(clamp01(hNorm), sharpenPower)
    return THREE.MathUtils.lerp(hNorm, curved, sharpenMix)
  }

  function sampleBaseHeight(x, z) {
    const u = x / size + 0.5
    const v = 0.5 - z / size
    return shapeHeight(sampleBilinear(hmData, hmW, hmH, u, v)) * maxHeight
  }

  function applyFlatAreas(x, z, height) {
    let result = height
    for (const area of flatAreas) {
      const feather = Math.max(0.001, area.feather ?? 6)
      const edgeX = Math.max(0, Math.abs(x - area.x) - area.halfWidth)
      const edgeZ = Math.max(0, Math.abs(z - area.z) - area.halfDepth)
      const edgeDistance = Math.hypot(edgeX, edgeZ)
      if (edgeDistance >= feather) continue
      const targetHeight = area.height ?? sampleBaseHeight(area.x, area.z)
      const blend = 1 - THREE.MathUtils.smoothstep(edgeDistance, 0, feather)
      result = THREE.MathUtils.lerp(result, targetHeight, blend)
    }
    return result
  }

  function getHeightAt(x, z) {
    if (!hmData) return 0
    return applyFlatAreas(x, z, applyHeightModifiers(x, z, sampleBaseHeight(x, z)))
  }

  function applyHeightModifiers(x, z, height) {
    let result = height
    for (const modifier of heightModifiers) {
      result = modifier(x, z, result, sampleBaseHeight)
    }
    return result
  }

  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const pixels = ctx.getImageData(0, 0, img.width, img.height).data

    hmW = img.width
    hmH = img.height
    hmData = new Float32Array(hmW * hmH)
    for (let i = 0; i < hmW * hmH; i++) {
      hmData[i] = pixels[i * 4] / 255
    }

    const pos = geometry.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = -pos.getY(i)
      pos.setZ(i, applyFlatAreas(x, z, applyHeightModifiers(x, z, sampleBaseHeight(x, z))))
    }
    pos.needsUpdate = true
    geometry.computeVertexNormals()

    if (onReady) onReady(getHeightAt)
  }
  img.src = heightmapUrl

  return { mesh, getHeightAt }
}
