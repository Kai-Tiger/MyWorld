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
  chunkSize = null,
  chunkSegments = 48,
  activeRadius = 2,
  preloadRadius = 3,
  distantProxyMaterial = null,
  distantProxySegments = 8,
  distantProxyYOffset = -0.08,
  maxHeight = 8,
  sharpenMix = 0.7,
  sharpenPower = 1.75,
  flatAreas = [],
  heightModifiers = [],
  postHeightModifiers = [],
  holeMasks = [],
  heightmapUrl = '/heightmaps/main_height_1024.png',
  onReady = null,
} = {}) {
  let hmW = 0
  let hmH = 0
  let hmData = null
  const meshes = new Map()
  const proxyMeshes = new Map()
  const chunked = Number.isFinite(chunkSize) && chunkSize > 0
  const useDistantProxy = chunked && distantProxyMaterial
  const terrainHalf = size * 0.5
  const chunkCount = chunked ? Math.ceil(size / chunkSize) : 0
  const chunkExtent = chunked ? chunkCount * chunkSize : size
  const chunkHalf = chunkExtent * 0.5
  let mesh = null
  let lastCenterKey = null

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
    return applyPostHeightModifiers(x, z, applyFlatAreas(x, z, applyHeightModifiers(x, z, sampleBaseHeight(x, z))))
  }

  function applyHeightModifiers(x, z, height) {
    let result = height
    for (const modifier of heightModifiers) {
      result = modifier(x, z, result, sampleBaseHeight)
    }
    return result
  }

  function applyPostHeightModifiers(x, z, height) {
    let result = height
    for (const modifier of postHeightModifiers) {
      result = modifier(x, z, result, sampleBaseHeight)
    }
    return result
  }

  function isInsideHoleMask(x, z) {
    for (const mask of holeMasks) {
      const dx = x - mask.x
      const dz = z - mask.z
      const radius = mask.radius ?? 0
      if (dx * dx + dz * dz <= radius * radius) return true
    }
    return false
  }

  function applyHoleMasks(geometry, worldXForVertex, worldZForVertex) {
    if (!holeMasks.length || !geometry.index) return
    const pos = geometry.attributes.position
    const index = geometry.index.array
    const next = []

    for (let i = 0; i < index.length; i += 3) {
      const a = index[i]
      const b = index[i + 1]
      const c = index[i + 2]
      const ax = worldXForVertex(pos, a), az = worldZForVertex(pos, a)
      const bx = worldXForVertex(pos, b), bz = worldZForVertex(pos, b)
      const cx = worldXForVertex(pos, c), cz = worldZForVertex(pos, c)
      if (isInsideHoleMask(ax, az) || isInsideHoleMask(bx, bz) || isInsideHoleMask(cx, cz)) continue
      next.push(a, b, c)
    }

    geometry.setIndex(next)
  }

  function setWorldSpaceNormals(geometry, worldXForVertex, worldZForVertex, step) {
    const pos = geometry.attributes.position
    const normal = geometry.attributes.normal
    const eps = Math.max(0.5, step)
    for (let i = 0; i < pos.count; i++) {
      const x = worldXForVertex(pos, i)
      const z = worldZForVertex(pos, i)
      const hL = getHeightAt(x - eps, z)
      const hR = getHeightAt(x + eps, z)
      const hD = getHeightAt(x, z - eps)
      const hU = getHeightAt(x, z + eps)
      const dhdx = (hR - hL) / (eps * 2)
      const dhdz = (hU - hD) / (eps * 2)
      const nx = -dhdx
      const ny = dhdz
      const nz = 1
      const invLen = 1 / Math.max(0.000001, Math.hypot(nx, ny, nz))
      normal.setXYZ(i, nx * invLen, ny * invLen, nz * invLen)
    }
    normal.needsUpdate = true
  }

  function applyHeightsToGeometry(geometry, worldXForVertex, worldZForVertex, step) {
    const pos = geometry.attributes.position
    for (let i = 0; i < pos.count; i++) {
      pos.setZ(i, getHeightAt(worldXForVertex(pos, i), worldZForVertex(pos, i)))
    }
    pos.needsUpdate = true
    setWorldSpaceNormals(geometry, worldXForVertex, worldZForVertex, step)
  }

  function buildSingleMesh() {
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments)
    geometry.setAttribute('uv2', geometry.attributes.uv.clone())
    const step = size / Math.max(1, segments)
    applyHeightsToGeometry(
      geometry,
      (pos, i) => pos.getX(i),
      (pos, i) => -pos.getY(i),
      step,
    )
    applyHoleMasks(geometry, (pos, i) => pos.getX(i), (pos, i) => -pos.getY(i))
    geometry.computeBoundingBox()
    geometry.computeBoundingSphere()
    mesh = new THREE.Mesh(geometry, material)
    mesh.rotation.x = -Math.PI / 2
    mesh.receiveShadow = true
    scene.add(mesh)
  }

  function chunkKey(ix, iz) {
    return `${ix}:${iz}`
  }

  function chunkCenter(ix, iz) {
    return {
      x: -chunkHalf + ix * chunkSize + chunkSize * 0.5,
      z: -chunkHalf + iz * chunkSize + chunkSize * 0.5,
    }
  }

  function buildChunk(ix, iz) {
    const center = chunkCenter(ix, iz)
    const geometry = new THREE.PlaneGeometry(chunkSize, chunkSize, chunkSegments, chunkSegments)
    geometry.setAttribute('uv2', geometry.attributes.uv.clone())
    const step = chunkSize / Math.max(1, chunkSegments)
    applyHeightsToGeometry(
      geometry,
      (pos, i) => center.x + pos.getX(i),
      (pos, i) => center.z - pos.getY(i),
      step,
    )
    applyHoleMasks(
      geometry,
      (pos, i) => center.x + pos.getX(i),
      (pos, i) => center.z - pos.getY(i),
    )
    geometry.computeBoundingBox()
    geometry.computeBoundingSphere()
    const chunk = new THREE.Mesh(geometry, material)
    chunk.name = `terrain_chunk_${ix}_${iz}`
    chunk.rotation.x = -Math.PI / 2
    chunk.position.set(center.x, 0, center.z)
    chunk.receiveShadow = true
    chunk.frustumCulled = true
    scene.add(chunk)
    meshes.set(chunkKey(ix, iz), chunk)
    return chunk
  }

  function buildDistantProxyChunk(ix, iz) {
    const center = chunkCenter(ix, iz)
    const segments = Math.max(1, distantProxySegments)
    const geometry = new THREE.PlaneGeometry(chunkSize, chunkSize, segments, segments)
    geometry.setAttribute('uv2', geometry.attributes.uv.clone())
    const step = chunkSize / segments
    applyHeightsToGeometry(
      geometry,
      (pos, i) => center.x + pos.getX(i),
      (pos, i) => center.z - pos.getY(i),
      step,
    )
    applyHoleMasks(
      geometry,
      (pos, i) => center.x + pos.getX(i),
      (pos, i) => center.z - pos.getY(i),
    )
    geometry.computeBoundingBox()
    geometry.computeBoundingSphere()

    const proxy = new THREE.Mesh(geometry, distantProxyMaterial)
    proxy.name = `terrain_proxy_chunk_${ix}_${iz}`
    proxy.rotation.x = -Math.PI / 2
    proxy.position.set(center.x, distantProxyYOffset, center.z)
    proxy.receiveShadow = false
    proxy.frustumCulled = true
    scene.add(proxy)
    proxyMeshes.set(chunkKey(ix, iz), proxy)
    return proxy
  }

  function buildDistantProxyChunks() {
    if (!useDistantProxy || proxyMeshes.size) return
    for (let iz = 0; iz < chunkCount; iz++) {
      for (let ix = 0; ix < chunkCount; ix++) {
        buildDistantProxyChunk(ix, iz)
      }
    }
  }

  function updateDistantProxyVisibility(centerIx, centerIz) {
    if (!useDistantProxy) return
    for (let iz = 0; iz < chunkCount; iz++) {
      for (let ix = 0; ix < chunkCount; ix++) {
        const proxy = proxyMeshes.get(chunkKey(ix, iz))
        if (!proxy) continue
        proxy.visible = Math.max(Math.abs(ix - centerIx), Math.abs(iz - centerIz)) > activeRadius
      }
    }
  }

  function updateChunks(playerPosition = null, force = false) {
    if (!chunked || !hmData) return
    const px = Number.isFinite(playerPosition?.x) ? playerPosition.x : 0
    const pz = Number.isFinite(playerPosition?.z) ? playerPosition.z : 0
    const centerIx = THREE.MathUtils.clamp(Math.floor((px + chunkHalf) / chunkSize), 0, chunkCount - 1)
    const centerIz = THREE.MathUtils.clamp(Math.floor((pz + chunkHalf) / chunkSize), 0, chunkCount - 1)
    const centerKey = chunkKey(centerIx, centerIz)
    if (!force && centerKey === lastCenterKey) return
    lastCenterKey = centerKey
    updateDistantProxyVisibility(centerIx, centerIz)

    const keep = new Set()
    for (let iz = centerIz - preloadRadius; iz <= centerIz + preloadRadius; iz++) {
      if (iz < 0 || iz >= chunkCount) continue
      for (let ix = centerIx - preloadRadius; ix <= centerIx + preloadRadius; ix++) {
        if (ix < 0 || ix >= chunkCount) continue
        const dx = Math.abs(ix - centerIx)
        const dz = Math.abs(iz - centerIz)
        if (Math.max(dx, dz) > preloadRadius) continue
        const key = chunkKey(ix, iz)
        keep.add(key)
        const chunk = meshes.get(key) ?? buildChunk(ix, iz)
        chunk.visible = Math.max(dx, dz) <= activeRadius
      }
    }

    for (const [key, chunk] of meshes) {
      if (keep.has(key)) continue
      scene.remove(chunk)
      chunk.geometry.dispose()
      meshes.delete(key)
    }
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

    if (chunked) {
      buildDistantProxyChunks()
      updateChunks({ x: 0, z: 0 }, true)
    } else {
      buildSingleMesh()
    }

    if (onReady) onReady(getHeightAt)
  }
  img.src = heightmapUrl

  return {
    mesh,
    getHeightAt,
    update(playerPosition = null) {
      updateChunks(playerPosition)
    },
  }
}
