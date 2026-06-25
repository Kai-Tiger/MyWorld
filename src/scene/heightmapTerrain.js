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
  heightmapSize = null,   // 高度图 UV 映射尺寸（与网格范围解耦）；null = 用 size
  extendXNeg = 0,         // 网格向 −X 外扩（世界单位），不动 +X 边
  extendZNeg = 0,         // 网格向 −Z 外扩（世界单位），不动 +Z 边
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
  buildAllChunksOnLoad = false,
  startupBuildBudgetMs = 12,
  onBuildAllProgress = null,
  onReady = null,
  perf = null,
} = {}) {
  const timePerf = (name, fn) => (perf?.time ? perf.time(name, fn) : fn())
  let hmW = 0
  let hmH = 0
  let hmData = null
  const meshes = new Map()
  const proxyMeshes = new Map()
  const chunked = Number.isFinite(chunkSize) && chunkSize > 0
  const useDistantProxy = chunked && distantProxyMaterial
  const hmSize = heightmapSize ?? size
  // 网格按轴计数 + 显式原点：基准方格 ±baseHalf，向 −X/−Z 外扩，+X/+Z 边不变
  const baseCount = chunked ? Math.ceil(size / chunkSize) : 0
  const exNegX = chunked ? Math.ceil(Math.max(0, extendXNeg) / chunkSize) : 0
  const exNegZ = chunked ? Math.ceil(Math.max(0, extendZNeg) / chunkSize) : 0
  const chunkCountX = baseCount + exNegX
  const chunkCountZ = baseCount + exNegZ
  const gridMinX = -baseCount * chunkSize * 0.5 - exNegX * chunkSize
  const gridMinZ = -baseCount * chunkSize * 0.5 - exNegZ * chunkSize
  const terrainBuildBudgetMs = 3
  const BUILD_STAGE_HEIGHT = 'height'
  const BUILD_STAGE_NORMAL = 'normal'
  const BUILD_STAGE_FINALIZE = 'finalize'
  let mesh = null
  let lastCenterKey = null
  let currentCenterIx = 0
  let currentCenterIz = 0
  const pendingChunks = new Map()
  const pendingProxyChunks = new Map()
  const activeBuildTasks = []
  const desiredChunkKeys = new Set()
  const visibleChunkKeys = new Set()
  const fullTerrainMode = Boolean(buildAllChunksOnLoad && chunked)
  const fullTerrainTotalChunks = chunkCountX * chunkCountZ
  let fullTerrainReady = !fullTerrainMode
  let fullTerrainLoopRunning = false
  let resolveFullTerrainReady = null
  let rejectFullTerrainReady = null
  const allChunksReadyPromise = new Promise((resolve, reject) => {
    resolveFullTerrainReady = resolve
    rejectFullTerrainReady = reject
  })
  if (fullTerrainReady) resolveFullTerrainReady?.()

  function shapeHeight(hNorm) {
    const curved = Math.pow(clamp01(hNorm), sharpenPower)
    return THREE.MathUtils.lerp(hNorm, curved, sharpenMix)
  }

  function sampleBaseHeight(x, z) {
    const u = x / hmSize + 0.5
    const v = 0.5 - z / hmSize
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

  function chunkEntry(ix, iz, priority = 0) {
    return { ix, iz, priority }
  }

  function queueEntry(queue, key, entry) {
    const existing = queue.get(key)
    if (!existing || entry.priority < existing.priority) queue.set(key, entry)
  }

  function takeNextQueued(queue) {
    let bestKey = null
    let best = null
    for (const [key, entry] of queue) {
      if (!best || entry.priority < best.priority) {
        bestKey = key
        best = entry
      }
    }
    if (!best) return null
    queue.delete(bestKey)
    return { key: bestKey, ...best }
  }

  function chunkCenter(ix, iz) {
    return {
      x: gridMinX + ix * chunkSize + chunkSize * 0.5,
      z: gridMinZ + iz * chunkSize + chunkSize * 0.5,
    }
  }

  function createTerrainBuildTask(type, ix, iz, key) {
    const center = chunkCenter(ix, iz)
    const segmentsForTask = type === 'chunk' ? chunkSegments : Math.max(1, distantProxySegments)
    const geometry = new THREE.PlaneGeometry(chunkSize, chunkSize, segmentsForTask, segmentsForTask)
    geometry.setAttribute('uv2', geometry.attributes.uv.clone())
    const pos = geometry.attributes.position
    return {
      type,
      ix,
      iz,
      key,
      center,
      geometry,
      pos,
      normal: geometry.attributes.normal,
      segments: segmentsForTask,
      rowStride: segmentsForTask + 1,
      step: chunkSize / Math.max(1, segmentsForTask),
      heightValues: new Float32Array(pos.count),
      vertexCursor: 0,
      normalCursor: 0,
      stage: BUILD_STAGE_HEIGHT,
    }
  }

  function taskWorldX(task, i) {
    return task.center.x + task.pos.getX(i)
  }

  function taskWorldZ(task, i) {
    return task.center.z - task.pos.getY(i)
  }

  function processHeightVertices(task, budgetEnd) {
    const count = task.pos.count
    while (task.vertexCursor < count) {
      const i = task.vertexCursor
      if (i > 0 && (i & 15) === 0 && performance.now() >= budgetEnd) return false
      const h = getHeightAt(taskWorldX(task, i), taskWorldZ(task, i))
      task.heightValues[i] = h
      task.pos.setZ(i, h)
      task.vertexCursor++
    }
    task.pos.needsUpdate = true
    task.stage = BUILD_STAGE_NORMAL
    return true
  }

  function getTaskHeightForNormal(task, i, x, z, offsetX, offsetZ) {
    if (i >= 0 && i < task.heightValues.length) return task.heightValues[i]
    return getHeightAt(x + offsetX, z + offsetZ)
  }

  function processNormalVertices(task, budgetEnd) {
    const count = task.pos.count
    const lastCol = task.segments
    const lastRow = task.segments
    const eps = Math.max(0.5, task.step)
    while (task.normalCursor < count) {
      const i = task.normalCursor
      if (i > 0 && (i & 31) === 0 && performance.now() >= budgetEnd) return false
      const col = i % task.rowStride
      const row = Math.floor(i / task.rowStride)
      const x = taskWorldX(task, i)
      const z = taskWorldZ(task, i)
      const leftIndex = col > 0 ? i - 1 : -1
      const rightIndex = col < lastCol ? i + 1 : -1
      const downIndex = row > 0 ? i - task.rowStride : -1
      const upIndex = row < lastRow ? i + task.rowStride : -1
      const hL = getTaskHeightForNormal(task, leftIndex, x, z, -eps, 0)
      const hR = getTaskHeightForNormal(task, rightIndex, x, z, eps, 0)
      const hD = getTaskHeightForNormal(task, downIndex, x, z, 0, -eps)
      const hU = getTaskHeightForNormal(task, upIndex, x, z, 0, eps)
      const dhdx = (hR - hL) / (eps * 2)
      const dhdz = (hU - hD) / (eps * 2)
      const nx = -dhdx
      const ny = dhdz
      const nz = 1
      const invLen = 1 / Math.max(0.000001, Math.hypot(nx, ny, nz))
      task.normal.setXYZ(i, nx * invLen, ny * invLen, nz * invLen)
      task.normalCursor++
    }
    task.normal.needsUpdate = true
    task.stage = BUILD_STAGE_FINALIZE
    return true
  }

  function finalizeTerrainTask(task) {
    applyHoleMasks(task.geometry, (pos, i) => task.center.x + pos.getX(i), (pos, i) => task.center.z - pos.getY(i))
    task.geometry.computeBoundingBox()
    task.geometry.computeBoundingSphere()

    const isChunk = task.type === 'chunk'
    const terrainMesh = new THREE.Mesh(task.geometry, isChunk ? material : distantProxyMaterial)
    terrainMesh.name = isChunk ? `terrain_chunk_${task.ix}_${task.iz}` : `terrain_proxy_chunk_${task.ix}_${task.iz}`
    terrainMesh.rotation.x = -Math.PI / 2
    terrainMesh.position.set(task.center.x, isChunk ? 0 : distantProxyYOffset, task.center.z)
    terrainMesh.receiveShadow = isChunk
    terrainMesh.frustumCulled = true
    scene.add(terrainMesh)

    if (isChunk) {
      meshes.set(task.key, terrainMesh)
      terrainMesh.visible = visibleChunkKeys.has(task.key)
    } else {
      proxyMeshes.set(task.key, terrainMesh)
      terrainMesh.visible = proxyShouldBeVisible(task.ix, task.iz)
    }
    return terrainMesh
  }

  function proxyShouldBeVisible(ix, iz) {
    if (fullTerrainMode) return false
    const key = chunkKey(ix, iz)
    const dx = Math.abs(ix - currentCenterIx)
    const dz = Math.abs(iz - currentCenterIz)
    const inActiveRange = Math.max(dx, dz) <= activeRadius
    if (inActiveRange) return !meshes.has(key)
    return true
  }

  function queueDistantProxyChunks(centerIx, centerIz) {
    if (!useDistantProxy) return
    for (let iz = 0; iz < chunkCountZ; iz++) {
      for (let ix = 0; ix < chunkCountX; ix++) {
        const key = chunkKey(ix, iz)
        if (proxyMeshes.has(key)) continue
        const distance = Math.max(Math.abs(ix - centerIx), Math.abs(iz - centerIz))
        const activeMissingBoost = distance <= activeRadius && !meshes.has(key) ? 0 : 100
        queueEntry(pendingProxyChunks, key, chunkEntry(ix, iz, activeMissingBoost + distance))
      }
    }
  }

  function updateDistantProxyVisibility(centerIx, centerIz) {
    if (!useDistantProxy) return
    for (let iz = 0; iz < chunkCountZ; iz++) {
      for (let ix = 0; ix < chunkCountX; ix++) {
        const proxy = proxyMeshes.get(chunkKey(ix, iz))
        if (!proxy) continue
        proxy.visible = proxyShouldBeVisible(ix, iz)
      }
    }
  }

  function updateBuiltChunkVisibility() {
    for (const [key, chunk] of meshes) {
      chunk.visible = fullTerrainMode || visibleChunkKeys.has(key)
    }
  }

  function discardBuildTask(task) {
    task?.geometry?.dispose?.()
  }

  function isBuildTaskStale(task) {
    if (!task) return true
    if (task.type === 'chunk') return meshes.has(task.key) || !desiredChunkKeys.has(task.key)
    return proxyMeshes.has(task.key)
  }

  function enqueueActiveBuildTask(type, entry) {
    const task = timePerf(`terrain.${type}.create`, () => createTerrainBuildTask(type, entry.ix, entry.iz, entry.key))
    activeBuildTasks.push(task)
    return task
  }

  function takeNextBuildTask() {
    while (true) {
      const entry = takeNextQueued(pendingChunks)
      if (!entry) break
      if (!desiredChunkKeys.has(entry.key) || meshes.has(entry.key)) continue
      return enqueueActiveBuildTask('chunk', entry)
    }

    while (true) {
      const entry = takeNextQueued(pendingProxyChunks)
      if (!entry) break
      if (proxyMeshes.has(entry.key)) continue
      return enqueueActiveBuildTask('proxy', entry)
    }
    return null
  }

  function processTerrainBuildTask(task, budgetEnd) {
    while (performance.now() < budgetEnd) {
      if (task.stage === BUILD_STAGE_HEIGHT) {
        const stageDone = timePerf(`terrain.${task.type}.height`, () => processHeightVertices(task, budgetEnd))
        if (!stageDone) return false
        continue
      }
      if (task.stage === BUILD_STAGE_NORMAL) {
        const stageDone = timePerf(`terrain.${task.type}.normal`, () => processNormalVertices(task, budgetEnd))
        if (!stageDone) return false
        continue
      }
      if (task.stage === BUILD_STAGE_FINALIZE) {
        timePerf(`terrain.${task.type}.finalize`, () => finalizeTerrainTask(task))
        return true
      }
      return true
    }
    return false
  }

  function processBuildQueues(budgetMs = terrainBuildBudgetMs) {
    const budgetEnd = performance.now() + budgetMs
    while (performance.now() < budgetEnd) {
      let task = activeBuildTasks[0]
      if (!task) task = takeNextBuildTask()
      if (!task) break

      if (isBuildTaskStale(task)) {
        discardBuildTask(task)
        activeBuildTasks.shift()
        continue
      }

      const done = processTerrainBuildTask(task, budgetEnd)
      if (!done) break
      activeBuildTasks.shift()
    }

    timePerf('terrain.visibility', () => {
      updateBuiltChunkVisibility()
      updateDistantProxyVisibility(currentCenterIx, currentCenterIz)
    })
  }

  function reportFullTerrainProgress() {
    if (!fullTerrainMode || typeof onBuildAllProgress !== 'function') return
    const loaded = Math.min(meshes.size, fullTerrainTotalChunks)
    onBuildAllProgress({
      loaded,
      total: fullTerrainTotalChunks,
      percent: fullTerrainTotalChunks > 0 ? loaded / fullTerrainTotalChunks : 1,
    })
  }

  function queueAllTerrainChunks() {
    desiredChunkKeys.clear()
    visibleChunkKeys.clear()
    pendingChunks.clear()
    pendingProxyChunks.clear()
    for (let iz = 0; iz < chunkCountZ; iz++) {
      for (let ix = 0; ix < chunkCountX; ix++) {
        const key = chunkKey(ix, iz)
        desiredChunkKeys.add(key)
        visibleChunkKeys.add(key)
        if (!meshes.has(key)) queueEntry(pendingChunks, key, chunkEntry(ix, iz, iz * chunkCountX + ix))
      }
    }
    reportFullTerrainProgress()
  }

  function finishFullTerrainBuild() {
    fullTerrainReady = true
    updateBuiltChunkVisibility()
    updateDistantProxyVisibility(currentCenterIx, currentCenterIz)
    reportFullTerrainProgress()
    resolveFullTerrainReady?.()
  }

  function processFullTerrainBuild() {
    if (fullTerrainReady) return
    processBuildQueues(startupBuildBudgetMs)
    reportFullTerrainProgress()
    if (meshes.size >= fullTerrainTotalChunks) {
      finishFullTerrainBuild()
      return
    }
    window.requestAnimationFrame(processFullTerrainBuild)
  }

  function startFullTerrainBuild() {
    if (!fullTerrainMode || fullTerrainLoopRunning) return
    fullTerrainLoopRunning = true
    queueAllTerrainChunks()
    window.requestAnimationFrame(processFullTerrainBuild)
  }

  function updateChunks(playerPosition = null, force = false) {
    if (!chunked || !hmData) return
    if (fullTerrainMode) {
      if (!fullTerrainReady) processBuildQueues()
      updateBuiltChunkVisibility()
      updateDistantProxyVisibility(currentCenterIx, currentCenterIz)
      return
    }
    const px = Number.isFinite(playerPosition?.x) ? playerPosition.x : 0
    const pz = Number.isFinite(playerPosition?.z) ? playerPosition.z : 0
    const centerIx = THREE.MathUtils.clamp(Math.floor((px - gridMinX) / chunkSize), 0, chunkCountX - 1)
    const centerIz = THREE.MathUtils.clamp(Math.floor((pz - gridMinZ) / chunkSize), 0, chunkCountZ - 1)
    const centerKey = chunkKey(centerIx, centerIz)
    currentCenterIx = centerIx
    currentCenterIz = centerIz

    if (force || centerKey !== lastCenterKey) {
      lastCenterKey = centerKey
      desiredChunkKeys.clear()
      visibleChunkKeys.clear()

      for (let iz = centerIz - preloadRadius; iz <= centerIz + preloadRadius; iz++) {
        if (iz < 0 || iz >= chunkCountZ) continue
        for (let ix = centerIx - preloadRadius; ix <= centerIx + preloadRadius; ix++) {
          if (ix < 0 || ix >= chunkCountX) continue
          const dx = Math.abs(ix - centerIx)
          const dz = Math.abs(iz - centerIz)
          const distance = Math.max(dx, dz)
          if (distance > preloadRadius) continue
          const key = chunkKey(ix, iz)
          desiredChunkKeys.add(key)
          if (distance <= activeRadius) visibleChunkKeys.add(key)
          if (!meshes.has(key)) queueEntry(pendingChunks, key, chunkEntry(ix, iz, distance * 10 + dx + dz))
        }
      }

      for (const key of pendingChunks.keys()) {
        if (!desiredChunkKeys.has(key)) pendingChunks.delete(key)
      }

      for (const [key, chunk] of meshes) {
        if (desiredChunkKeys.has(key)) continue
        scene.remove(chunk)
        chunk.geometry.dispose()
        meshes.delete(key)
      }

      queueDistantProxyChunks(centerIx, centerIz)
    }

    processBuildQueues()
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

    if (fullTerrainMode) {
      startFullTerrainBuild()
    } else if (chunked) {
      updateChunks({ x: 0, z: 0 }, true)
    } else {
      buildSingleMesh()
      fullTerrainReady = true
      resolveFullTerrainReady?.()
    }

    if (onReady) onReady(getHeightAt)
  }
  img.onerror = () => {
    rejectFullTerrainReady?.(new Error(`Failed to load heightmap: ${heightmapUrl}`))
  }
  img.src = heightmapUrl

  function traceHeightAt(x, z) {
    if (!hmData) return
    let h = sampleBaseHeight(x, z)
    const steps = [`base=${h.toFixed(2)}`]
    for (const m of heightModifiers) {
      h = m(x, z, h, sampleBaseHeight)
      steps.push(`${m.name || 'mod'}=${h.toFixed(2)}`)
    }
    h = applyFlatAreas(x, z, h)
    steps.push(`flatAreas=${h.toFixed(2)}`)
    for (const m of postHeightModifiers) {
      h = m(x, z, h, sampleBaseHeight)
      steps.push(`${m.name || 'post'}=${h.toFixed(2)}`)
    }
    console.log(`[trace ${x},${z}] ` + steps.join('  →  '))
  }

  return {
    mesh,
    getHeightAt,
    traceHeightAt,
    allChunksReadyPromise,
    update(playerPosition = null) {
      updateChunks(playerPosition)
    },
  }
}
