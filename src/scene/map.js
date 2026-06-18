import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { WORLD_SIZE, CANYON } from '../config/world.js'
import { createHeightmapTerrain } from './heightmapTerrain.js'
import { CASTLE_EXTERIOR } from '../config/castle.js'
import oldChurchRuinsUrl from '../place/old_church_ruins_medium.glb?url'
import { cloneGLTFScene } from '../systems/modelAssets.js'
import oldChurchRuinsColliders from '../place/old_church_ruins_colliders.json'


// ── 工具函数 ──────────────────────────────────────────
const ROAD_TEXTURE_VERSION = 'v=1'
const ROAD_TEXTURE_BASE = '/textures/road_paving_stones_150'
const ROAD_TEXTURE_TILE_METERS = 3.6
const ROCKERY_TEXTURE_VERSION = 'v=1'
const ROCKERY_TEXTURE_BASE = '/models/rocks/namaqualand_boulder_03/textures'
const OLD_CHURCH_RUINS_PLACEMENT = { x: -13, z: 35, rotY: 0 }
const OLD_CHURCH_RUINS_Y_OFFSET = -1.38
const OLD_CHURCH_GRASS_PATCHES = [
  { x: -19.2, z: 31.4, rx: 3.8, rz: 1.9, count: 24 },
  { x: -18.6, z: 38.7, rx: 4.2, rz: 2.3, count: 26 },
  { x: -12.4, z: 43.2, rx: 4.8, rz: 2.0, count: 22 },
  { x: -7.7, z: 32.7, rx: 3.1, rz: 2.4, count: 18 },
  { x: -15.2, z: 28.4, rx: 3.6, rz: 1.7, count: 16 },
]
const FOREST_GROVE_ORIGIN = { x: 5, z: -49 }
const FOREST_SECOND_GROVE_ORIGIN = { x: 47, z: -57 }
const FOREST_THIRD_GROVE_ORIGIN = { x: 27, z: -34 }
const FOREST_LINE_GROVE_ORIGIN = { x: 30, z: -70 }
const FOREST_LINE_GROVE_LENGTH = 8
const FOREST_GROVE_CASTLE_TARGET = CASTLE_EXTERIOR.transitionTarget
const FOREST_GROVE_ASSETS_BASE = '/models/forest_pack'
const FOREST_GROVE_TREE_TYPES = [
  { file: 'tree_01.glb', scale: 0.42, r: 1.35 },
  { file: 'tree_02.glb', scale: 0.50, r: 1.25 },
  { file: 'tree_03.glb', scale: 0.88, r: 1.05 },
  { file: 'tree_04.glb', scale: 0.84, r: 1.05 },
]
const FOREST_GROVE_SHRUB_TYPES = [
  { file: 'background_tree_09.glb', scale: 0.75 },
  { file: 'background_tree_10.glb', scale: 0.70 },
  { file: 'background_tree_11.glb', scale: 0.90 },
  { file: 'background_tree_12.glb', scale: 0.85 },
  { file: 'background_tree_13.glb', scale: 0.68 },
]
const FOREST_GROVE_ROCK_TYPES = [
  { file: 'rock_02.glb', scale: 1.15, r: 0.70 },
  { file: 'rock_03.glb', scale: 1.20, r: 0.62 },
  { file: 'rock_05.glb', scale: 1.35, r: 0.58 },
  { file: 'rock_07.glb', scale: 1.00, r: 0.55 },
  { file: 'rock_09.glb', scale: 1.45 },
]
const FOREST_TREE_COLLIDER_SCALE = 0.6
const FOREST_ROCK_COLLIDER_SCALE = 0.85
const FOREST_CASTLE_GATE_CLEARING = { minX: 39, maxX: 52, minZ: -11, maxZ: 4 }
const FOREST_GROVE_PLACEMENTS = createForestGrovePlacements()
const CASTLE_APPROACH_MOUNDS = [
  { x: 8, z: -13, rx: 5.6, rz: 3.7, h: 4.8, rot: -0.32, r: 5.4 },
  { x: 11, z: 20, rx: 6.2, rz: 4.1, h: 5.4, rot: 0.18, r: 5.8 },
  { x: 22, z: -16, rx: 5.8, rz: 3.8, h: 5.5, rot: 0.22, r: 5.6 },
  { x: 24, z: 20, rx: 6.4, rz: 4.0, h: 6.2, rot: -0.28, r: 6.0 },
  { x: 34, z: 17, rx: 5.6, rz: 3.7, h: 5.8, rot: 0.32, r: 5.3 },
  { x: 38, z: -23, rx: 6.8, rz: 4.3, h: 6.8, rot: -0.12, r: 6.4 },
  { x: 47, z: 16, rx: 5.8, rz: 4.0, h: 5.9, rot: 0.34, r: 5.4 },
  { x: 49, z: -18, rx: 6.2, rz: 4.0, h: 6.3, rot: 0.26, r: 5.7 },
]
const CASTLE_APPROACH_ROCKERY_RIDGES = [
  {
    name: 'north-wall',
    points: [
      [4, 14.5, 4.2, 5.0], [14, 22.0, 4.8, 5.9], [26.5, 21.0, 5.1, 6.4],
      [38.5, 17.0, 4.8, 6.0], [50.0, 15.5, 4.4, 5.6],
    ],
  },
  {
    name: 'south-wall',
    points: [
      [5, -11.5, 4.5, 5.1], [17.0, -13.5, 4.8, 5.7], [30.0, -19.0, 5.2, 6.4],
      [42.0, -23.0, 5.8, 7.0], [51.0, -17.5, 4.8, 5.7],
    ],
  },
]
const CURVED_CLIFF_CONTROL_POINTS = [
  [82, 26],
  [59, 69],
  [-36, 75],
]
const SOUTH_CURVED_CLIFF_CONTROL_POINTS = [
  [67, -79],
  [0, -100],
  [-42, -94],
]
const _roadTextureLoader = new THREE.TextureLoader()

function createCurvedCliffRidgePoints(controlPoints, phase = 0) {
  const curve = new THREE.CatmullRomCurve3(
    controlPoints.map(([x, z]) => new THREE.Vector3(x, 0, z))
  )
  return curve.getPoints(18).map((point, i) => {
    const t = i / 18
    const width = 7.2 + Math.sin(t * Math.PI * 2.2 + phase) * 0.5
    const height = 19.5 + Math.sin(t * Math.PI * 1.35 + phase) * 3.2 + Math.abs(Math.sin(i * 1.19 + phase)) * 1.6
    return [point.x, point.z, width, height]
  })
}

const CURVED_CLIFF_RIDGES = [
  {
    name: 'north-east-cliff',
    points: createCurvedCliffRidgePoints(CURVED_CLIFF_CONTROL_POINTS),
  },
  {
    name: 'south-cliff',
    points: createCurvedCliffRidgePoints(SOUTH_CURVED_CLIFF_CONTROL_POINTS, 1.7),
  },
]

function forestPlacementNoise(seed) {
  const n = Math.sin(seed * 157.31 + 19.73) * 43758.5453
  return n - Math.floor(n)
}

function keepForestRoadGap(dx, dz, index) {
  if (dx > -6.0 && dx < -1.2 && Math.abs(dz) < 17.5) {
    const side = index % 2 === 0 ? 1 : -1
    return {
      dx: side > 0 ? Math.max(dx, -0.6) + 3.2 : Math.min(dx, -6.6) - 2.4,
      dz,
    }
  }
  return { dx, dz }
}

function keepForestCastleLaneGap(dx, dz, lane, side, index) {
  const progress = THREE.MathUtils.clamp(
    (dx * lane.forwardX + dz * lane.forwardZ) / lane.length,
    0,
    1,
  )
  const lateral = dx * lane.rightX + dz * lane.rightZ
  const halfGap = THREE.MathUtils.lerp(5.2, 7.6, progress)
  if (Math.abs(lateral) < halfGap) {
    const laneSide = side || (index % 2 === 0 ? 1 : -1)
    return {
      dx: dx + lane.rightX * (laneSide * (halfGap - Math.abs(lateral) + 1.4)),
      dz: dz + lane.rightZ * (laneSide * (halfGap - Math.abs(lateral) + 1.4)),
    }
  }
  return { dx, dz }
}

function getForestPlacementOrigin(placement) {
  return placement.origin ?? FOREST_GROVE_ORIGIN
}

function attachForestOrigin(placements, origin) {
  return placements.map((placement) => ({ ...placement, origin }))
}

function isInForestCastleGateClearing(placement) {
  const isTallPlant = placement.file.startsWith('tree_') || placement.file.startsWith('background_tree_')
  if (!isTallPlant) return false

  const origin = getForestPlacementOrigin(placement)
  const x = origin.x + placement.dx
  const z = origin.z + placement.dz
  return x >= FOREST_CASTLE_GATE_CLEARING.minX
    && x <= FOREST_CASTLE_GATE_CLEARING.maxX
    && z >= FOREST_CASTLE_GATE_CLEARING.minZ
    && z <= FOREST_CASTLE_GATE_CLEARING.maxZ
}

function createForestPlacementsForTypes(types, count, {
  radiusMin,
  radiusMax,
  angleOffset = 0,
  scaleJitter = 0.12,
  colliderScale = 1,
  seedOffset = 0,
} = {}) {
  const placements = []
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < count; i++) {
    const type = types[i % types.length]
    const ringT = (i + 0.5) / count
    const radius = THREE.MathUtils.lerp(radiusMin, radiusMax, Math.sqrt(ringT))
      + (forestPlacementNoise(seedOffset + i * 3 + 1) - 0.5) * 1.4
    const angle = angleOffset + i * goldenAngle + (forestPlacementNoise(seedOffset + i * 3 + 2) - 0.5) * 0.42
    const pos = keepForestRoadGap(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      i + seedOffset,
    )
    const scaleNoise = 1 + (forestPlacementNoise(seedOffset + i * 3 + 3) - 0.5) * 2 * scaleJitter
    const scale = type.scale * scaleNoise
    const placement = {
      file: type.file,
      dx: Number(pos.dx.toFixed(2)),
      dz: Number(pos.dz.toFixed(2)),
      rotY: Number((angle + forestPlacementNoise(seedOffset + i * 3 + 4) * Math.PI * 2).toFixed(3)),
      scale: Number(scale.toFixed(3)),
    }
    if (type.r) placement.r = Number((type.r * scaleNoise * colliderScale).toFixed(2))
    placements.push(placement)
  }
  return placements
}

function createForestLanePlacementsForTypes(types, count, {
  lane,
  sideBias = 0,
  minAlong = 0,
  maxAlong = 1,
  minSide = 7,
  maxSide = 19,
  forwardJitter = 2.6,
  sideJitter = 2.1,
  angleOffset = 0,
  scaleJitter = 0.12,
  colliderScale = 1,
  seedOffset = 0,
} = {}) {
  const placements = []
  const goldenT = 0.61803398875
  for (let i = 0; i < count; i++) {
    const type = types[i % types.length]
    const tNoise = forestPlacementNoise(seedOffset + i * 5 + 1)
    const alongT = minAlong + ((i * goldenT + tNoise * 0.18) % 1) * (maxAlong - minAlong)
    const side = sideBias || (forestPlacementNoise(seedOffset + i * 5 + 2) > 0.5 ? 1 : -1)
    const sideT = forestPlacementNoise(seedOffset + i * 5 + 3)
    const along = alongT * lane.length + (forestPlacementNoise(seedOffset + i * 5 + 4) - 0.5) * forwardJitter
    const sideDistance = THREE.MathUtils.lerp(minSide, maxSide, Math.pow(sideT, 0.78))
      + (forestPlacementNoise(seedOffset + i * 5 + 5) - 0.5) * sideJitter
    let dx = lane.forwardX * along + lane.rightX * side * sideDistance
    let dz = lane.forwardZ * along + lane.rightZ * side * sideDistance
    let pos = keepForestCastleLaneGap(dx, dz, lane, side, i + seedOffset)
    pos = keepForestRoadGap(pos.dx, pos.dz, i + seedOffset)
    dx = pos.dx
    dz = pos.dz
    const scaleNoise = 1 + (forestPlacementNoise(seedOffset + i * 5 + 6) - 0.5) * 2 * scaleJitter
    const scale = type.scale * scaleNoise
    const placement = {
      file: type.file,
      dx: Number(dx.toFixed(2)),
      dz: Number(dz.toFixed(2)),
      rotY: Number((angleOffset + forestPlacementNoise(seedOffset + i * 5 + 7) * Math.PI * 2).toFixed(3)),
      scale: Number(scale.toFixed(3)),
    }
    if (type.r) placement.r = Number((type.r * scaleNoise * colliderScale).toFixed(2))
    placements.push(placement)
  }
  return placements
}

function createForestSegmentPlacementsForTypes(types, count, {
  length,
  minSide = 0.7,
  maxSide = 2.5,
  forwardJitter = 0.65,
  sideJitter = 0.65,
  angleOffset = 0,
  scaleJitter = 0.12,
  colliderScale = 1,
  seedOffset = 0,
} = {}) {
  const placements = []
  for (let i = 0; i < count; i++) {
    const type = types[i % types.length]
    const lineT = count === 1 ? 0.5 : i / (count - 1)
    const stagger = i % 2 === 0 ? 1 : -1
    const along = lineT * length + (forestPlacementNoise(seedOffset + i * 5 + 1) - 0.5) * forwardJitter
    const sideDistance = THREE.MathUtils.lerp(minSide, maxSide, forestPlacementNoise(seedOffset + i * 5 + 2))
      + (forestPlacementNoise(seedOffset + i * 5 + 3) - 0.5) * sideJitter
    const scaleNoise = 1 + (forestPlacementNoise(seedOffset + i * 5 + 4) - 0.5) * 2 * scaleJitter
    const scale = type.scale * scaleNoise
    const placement = {
      file: type.file,
      dx: Number(along.toFixed(2)),
      dz: Number((stagger * sideDistance).toFixed(2)),
      rotY: Number((angleOffset + forestPlacementNoise(seedOffset + i * 5 + 5) * Math.PI * 2).toFixed(3)),
      scale: Number(scale.toFixed(3)),
    }
    if (type.r) placement.r = Number((type.r * scaleNoise * colliderScale).toFixed(2))
    placements.push(placement)
  }
  return placements
}

function createForestGrovePlacements() {
  const targetDx = FOREST_GROVE_CASTLE_TARGET.x - FOREST_GROVE_ORIGIN.x
  const targetDz = FOREST_GROVE_CASTLE_TARGET.z - FOREST_GROVE_ORIGIN.z
  const targetLength = Math.hypot(targetDx, targetDz)
  const lane = {
    length: targetLength * 0.82,
    forwardX: targetDx / targetLength,
    forwardZ: targetDz / targetLength,
    rightX: -targetDz / targetLength,
    rightZ: targetDx / targetLength,
  }
  const castleLanePlacements = [
    ...createForestPlacementsForTypes(FOREST_GROVE_TREE_TYPES, 24, {
      radiusMin: 4.2,
      radiusMax: 16.5,
      angleOffset: 0.24,
      colliderScale: FOREST_TREE_COLLIDER_SCALE,
      seedOffset: 100,
    }),
    ...createForestLanePlacementsForTypes(FOREST_GROVE_TREE_TYPES, 66, {
      lane,
      minAlong: 0.10,
      maxAlong: 1,
      minSide: 8.5,
      maxSide: 20.0,
      forwardJitter: 3.4,
      sideJitter: 2.6,
      angleOffset: 0.56,
      colliderScale: FOREST_TREE_COLLIDER_SCALE,
      seedOffset: 700,
    }),
    ...createForestPlacementsForTypes(FOREST_GROVE_SHRUB_TYPES, 18, {
      radiusMin: 3.0,
      radiusMax: 17.0,
      angleOffset: 1.18,
      scaleJitter: 0.18,
      seedOffset: 300,
    }),
    ...createForestLanePlacementsForTypes(FOREST_GROVE_SHRUB_TYPES, 57, {
      lane,
      minAlong: 0.05,
      maxAlong: 0.98,
      minSide: 6.8,
      maxSide: 18.5,
      forwardJitter: 3.2,
      sideJitter: 2.8,
      angleOffset: 1.32,
      scaleJitter: 0.18,
      seedOffset: 900,
    }),
    ...createForestPlacementsForTypes(FOREST_GROVE_ROCK_TYPES, 12, {
      radiusMin: 3.8,
      radiusMax: 16.0,
      angleOffset: 2.42,
      scaleJitter: 0.16,
      colliderScale: FOREST_ROCK_COLLIDER_SCALE,
      seedOffset: 500,
    }),
    ...createForestLanePlacementsForTypes(FOREST_GROVE_ROCK_TYPES, 33, {
      lane,
      minAlong: 0.08,
      maxAlong: 0.95,
      minSide: 7.4,
      maxSide: 18.0,
      forwardJitter: 3.0,
      sideJitter: 2.2,
      angleOffset: 2.86,
      scaleJitter: 0.16,
      colliderScale: FOREST_ROCK_COLLIDER_SCALE,
      seedOffset: 1100,
    }),
  ]
  const secondGrovePlacements = attachForestOrigin([
    ...createForestPlacementsForTypes(FOREST_GROVE_TREE_TYPES, 30, {
      radiusMin: 4.2,
      radiusMax: 16.5,
      angleOffset: 0.72,
      colliderScale: FOREST_TREE_COLLIDER_SCALE,
      seedOffset: 1300,
    }),
    ...createForestPlacementsForTypes(FOREST_GROVE_SHRUB_TYPES, 25, {
      radiusMin: 3.0,
      radiusMax: 17.0,
      angleOffset: 1.66,
      scaleJitter: 0.18,
      seedOffset: 1500,
    }),
    ...createForestPlacementsForTypes(FOREST_GROVE_ROCK_TYPES, 15, {
      radiusMin: 3.8,
      radiusMax: 16.0,
      angleOffset: 2.92,
      scaleJitter: 0.16,
      colliderScale: FOREST_ROCK_COLLIDER_SCALE,
      seedOffset: 1700,
    }),
  ], FOREST_SECOND_GROVE_ORIGIN)
  const thirdGrovePlacements = attachForestOrigin([
    ...createForestPlacementsForTypes(FOREST_GROVE_TREE_TYPES, 18, {
      radiusMin: 5.0,
      radiusMax: 18.0,
      angleOffset: 0.38,
      colliderScale: FOREST_TREE_COLLIDER_SCALE,
      seedOffset: 1900,
    }),
    ...createForestPlacementsForTypes(FOREST_GROVE_SHRUB_TYPES, 15, {
      radiusMin: 4.0,
      radiusMax: 18.5,
      angleOffset: 1.44,
      scaleJitter: 0.18,
      seedOffset: 2100,
    }),
    ...createForestPlacementsForTypes(FOREST_GROVE_ROCK_TYPES, 9, {
      radiusMin: 5.2,
      radiusMax: 17.0,
      angleOffset: 2.74,
      scaleJitter: 0.16,
      colliderScale: FOREST_ROCK_COLLIDER_SCALE,
      seedOffset: 2300,
    }),
  ], FOREST_THIRD_GROVE_ORIGIN)
  const lineGrovePlacements = attachForestOrigin([
    ...createForestSegmentPlacementsForTypes(FOREST_GROVE_TREE_TYPES, 14, {
      length: FOREST_LINE_GROVE_LENGTH,
      minSide: 0.7,
      maxSide: 2.4,
      forwardJitter: 0.8,
      sideJitter: 0.55,
      angleOffset: 0.18,
      colliderScale: FOREST_TREE_COLLIDER_SCALE,
      seedOffset: 2500,
    }),
    ...createForestSegmentPlacementsForTypes(FOREST_GROVE_SHRUB_TYPES, 8, {
      length: FOREST_LINE_GROVE_LENGTH,
      minSide: 1.4,
      maxSide: 3.2,
      forwardJitter: 0.9,
      sideJitter: 0.7,
      angleOffset: 1.08,
      scaleJitter: 0.18,
      seedOffset: 2700,
    }),
  ], FOREST_LINE_GROVE_ORIGIN)

  return [...castleLanePlacements, ...secondGrovePlacements, ...thirdGrovePlacements, ...lineGrovePlacements]
    .filter((placement) => !isInForestCastleGateClearing(placement))
}

function loadRoadTexture(fileName, { color = false } = {}) {
  const texture = _roadTextureLoader.load(`${ROAD_TEXTURE_BASE}/${fileName}?${ROAD_TEXTURE_VERSION}`)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.anisotropy = 8
  if (color) texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function createRoadMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0x9a9384,
    map: loadRoadTexture('PavingStones150_1K-JPG_Color.jpg', { color: true }),
    aoMap: loadRoadTexture('PavingStones150_1K-JPG_AmbientOcclusion.jpg'),
    normalMap: loadRoadTexture('PavingStones150_1K-JPG_NormalGL.jpg'),
    normalScale: new THREE.Vector2(0.42, 0.42),
    roughness: 0.99,
    metalness: 0,
  })
}

function loadRockeryTexture(fileName, { color = false } = {}) {
  const texture = _roadTextureLoader.load(`${ROCKERY_TEXTURE_BASE}/${fileName}?${ROCKERY_TEXTURE_VERSION}`)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1.8, 1.8)
  texture.anisotropy = 8
  if (color) texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function createRockeryMaterial({ dark = false } = {}) {
  const arm = loadRockeryTexture('namaqualand_boulder_03_arm_1k.jpg')
  return new THREE.MeshStandardMaterial({
    color: dark ? 0x4f4e49 : 0x69665f,
    map: loadRockeryTexture('namaqualand_boulder_03_diff_1k.jpg', { color: true }),
    normalMap: loadRockeryTexture('namaqualand_boulder_03_nor_gl_1k.jpg'),
    normalScale: new THREE.Vector2(0.75, 0.75),
    roughnessMap: arm,
    aoMap: arm,
    roughness: 0.98,
    metalness: 0,
    flatShading: true,
    side: THREE.DoubleSide,
  })
}

// 沿 CatmullRom 曲线生成顶点带路面，返回采样点和切线供草地使用
function makeCurvedPath(scene, controlPoints, width = 1.5, material = null, y = 0.08) {
  const curve = new THREE.CatmullRomCurve3(
    controlPoints.map(([x, z]) => new THREE.Vector3(x, 0, z))
  )

  const SEGS = 60
  const pts      = curve.getPoints(SEGS)
  const tangents = Array.from({ length: SEGS + 1 }, (_, i) => curve.getTangent(i / SEGS))
  const lengths  = curve.getLengths(SEGS)

  const verts = [], uvs = [], idxs = []
  for (let i = 0; i <= SEGS; i++) {
    const p = pts[i]
    const t = tangents[i]
    const rx = -t.z, rz = t.x   // XZ 平面垂直向量（已归一化）
    verts.push(
      p.x - rx * width / 2, y, p.z - rz * width / 2,
      p.x + rx * width / 2, y, p.z + rz * width / 2
    )
    const uMax = Math.max(1, width / ROAD_TEXTURE_TILE_METERS)
    const v = lengths[i] / ROAD_TEXTURE_TILE_METERS
    uvs.push(0, v, uMax, v)
    if (i < SEGS) {
      const a = i * 2
      idxs.push(a, a + 1, a + 2,  a + 1, a + 3, a + 2)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs,   2))
  geo.setAttribute('uv2',      new THREE.Float32BufferAttribute(uvs,   2))
  geo.setIndex(idxs)
  geo.computeVertexNormals()

  const mat  = material ?? new THREE.MeshLambertMaterial({ color: 0x756d5e })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.receiveShadow = true
  scene.add(mesh)

  return { pts, tangents, width }
}

// 收集路边 + 路缝草地的位置 [x, z, scale]
function collectPathGrass({ pts, tangents, width }) {
  const result = []
  for (let i = 0; i < pts.length; i += 2) {
    const p = pts[i], t = tangents[i]
    const rx = -t.z, rz = t.x

    for (const side of [-1, 1]) {
      const n = 1 + Math.floor(Math.random() * 2)
      for (let k = 0; k < n; k++) {
        const eOff = width / 2 * side + (Math.random() - 0.5) * 0.9
        const aOff = (Math.random() - 0.5) * 1.25
        result.push([
          p.x + rx * eOff + t.x * aOff,
          p.z + rz * eOff + t.z * aOff,
          0.55 + Math.random() * 0.65,
        ])
      }
    }
    if (Math.random() < 0.12) {   // 路缝稀疏枯草
      result.push([
        p.x + (Math.random() - 0.5) * width * 0.5,
        p.z + (Math.random() - 0.5) * width * 0.5,
        0.32 + Math.random() * 0.28,
      ])
    }
  }
  return result
}

function stableNoise(seed) {
  const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return n - Math.floor(n)
}

function stableNoise2(x, z, salt = 0) {
  const n = Math.sin(x * 12.9898 + z * 78.233 + salt * 37.719) * 43758.5453
  return n - Math.floor(n)
}

function collectOldChurchGrass() {
  const result = []
  const center = OLD_CHURCH_RUINS_PLACEMENT

  OLD_CHURCH_GRASS_PATCHES.forEach((patch, patchIndex) => {
    for (let i = 0; i < patch.count; i++) {
      const seed = patchIndex * 97 + i + 1
      const angle = stableNoise(seed) * Math.PI * 2
      const radius = Math.sqrt(stableNoise(seed + 19))
      const x = patch.x + Math.cos(angle) * patch.rx * radius
      const z = patch.z + Math.sin(angle) * patch.rz * radius
      const dx = Math.abs(x - center.x)
      const dz = Math.abs(z - center.z)
      if (dx < 2.15 && dz < 2.35) continue
      result.push([x, z, 1.35 + stableNoise(seed + 43) * 1.15])
    }
  })

  return result
}

const _grassWindMaterials = []
const _grassInstances = []

function createGrassMaterial({
  color = 0x8a8462,
  windStrength = 0.035,
  flutterStrength = 0.010,
} = {}) {
  const uniforms = {
    uTime: { value: 0 },
    uWindDir: { value: new THREE.Vector2(0.78, 0.62).normalize() },
    uWindStrength: { value: windStrength },
    uFlutterStrength: { value: flutterStrength },
  }
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 1,
    metalness: 0,
    side: THREE.DoubleSide,
  })

  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = `
      attribute float windWeight;
      attribute float instancePhase;
      attribute float instanceHeightBoost;
      attribute vec2 instanceBend;
      uniform float uTime;
      uniform vec2 uWindDir;
      uniform float uWindStrength;
      uniform float uFlutterStrength;
    ` + shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      float windPhase = instancePhase + dot((instanceMatrix * vec4(position, 1.0)).xz, vec2(0.09, 0.13));
      float broadWind = sin(uTime * 1.15 + windPhase) * 0.65
                    + sin(uTime * 0.47 + windPhase * 1.7) * 0.35;
      float flutter = sin(uTime * 7.2 + windPhase * 2.3) * 0.5
                  + sin(uTime * 11.6 + windPhase * 0.7) * 0.25;
      float tipMask = windWeight * windWeight;
      float instanceYScale = max(length(instanceMatrix[1].xyz), 0.001);
      transformed.y += instanceHeightBoost * windWeight / instanceYScale;
      transformed.xz += instanceBend * tipMask;
      transformed.xz += uWindDir * broadWind * uWindStrength * tipMask;
      transformed.xz += vec2(-uWindDir.y, uWindDir.x) * flutter * uFlutterStrength * tipMask;
      `
    )
  }
  mat.customProgramCacheKey = () => 'wind-grass-v1'
  mat.userData.windUniforms = uniforms
  _grassWindMaterials.push(mat)
  return mat
}

function updateGrassWind(time) {
  _grassWindMaterials.forEach((mat) => {
    mat.userData.windUniforms.uTime.value = time
  })
}

function setGrassInstanceMatrix(dummy, [x, z, scale], yOffset) {
  const groundY = _terrainReady ? getGroundHeight(x, z) : 0
  dummy.position.set(x, groundY + yOffset, z)
  dummy.rotation.y = stableNoise2(x, z, 11) * Math.PI * 2
  dummy.scale.set(
    scale * (0.85 + stableNoise2(x, z, 21) * 0.3),
    scale * (0.9 + stableNoise2(x, z, 31) * 0.25),
    scale * (0.85 + stableNoise2(x, z, 51) * 0.3)
  )
  dummy.updateMatrix()
}

function regroundGrassInstances() {
  const dummy = new THREE.Object3D()
  _grassInstances.forEach(({ mesh, placements, yOffset }) => {
    placements.forEach((placement, i) => {
      setGrassInstanceMatrix(dummy, placement, yOffset)
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  })
}

// 用 InstancedMesh 一次性绘制低矮草簇，避免矩形草片看起来像绿色方块。
function makeGrass(scene, placements, options = {}) {
  if (!placements.length) return

  const verts = []
  const weights = []
  for (let i = 0; i < 7; i++) {
    const angle = i / 7 * Math.PI * 2
    const bladeHeight = 0.13 + (i % 3) * 0.035
    const bladeWidth = 0.018 + (i % 2) * 0.006
    const rootRadius = 0.018 + (i % 4) * 0.006
    const lean = 0.026 + (i % 3) * 0.012
    const cx = Math.cos(angle) * rootRadius
    const cz = Math.sin(angle) * rootRadius
    const px = Math.cos(angle + Math.PI * 0.5) * bladeWidth
    const pz = Math.sin(angle + Math.PI * 0.5) * bladeWidth
    const tipX = cx + Math.cos(angle) * lean
    const tipZ = cz + Math.sin(angle) * lean
    verts.push(
      cx - px, 0, cz - pz,
      cx + px, 0, cz + pz,
      tipX, bladeHeight, tipZ,
    )
    weights.push(0, 0, 1)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  geo.setAttribute('windWeight', new THREE.Float32BufferAttribute(weights, 1))
  const phases = new Float32Array(placements.length)
  const heightBoosts = new Float32Array(placements.length)
  const bends = new Float32Array(placements.length * 2)
  const heightBoost = options.heightBoost ?? 0
  const bendStrength = options.bendStrength ?? 0
  placements.forEach(([x, z], i) => {
    phases[i] = stableNoise2(x, z, 41) * Math.PI * 2
    heightBoosts[i] = heightBoost * (0.86 + stableNoise2(x, z, 61) * 0.28)
    const bendAngle = stableNoise2(x, z, 71) * Math.PI * 2
    const bend = bendStrength * (0.65 + stableNoise2(x, z, 81) * 0.5)
    bends[i * 2] = Math.cos(bendAngle) * bend
    bends[i * 2 + 1] = Math.sin(bendAngle) * bend
  })
  geo.setAttribute('instancePhase', new THREE.InstancedBufferAttribute(phases, 1))
  geo.setAttribute('instanceHeightBoost', new THREE.InstancedBufferAttribute(heightBoosts, 1))
  geo.setAttribute('instanceBend', new THREE.InstancedBufferAttribute(bends, 2))
  geo.computeVertexNormals()

  const mat = createGrassMaterial(options)
  const mesh = new THREE.InstancedMesh(geo, mat, placements.length)
  const dummy = new THREE.Object3D()
  const color = new THREE.Color()
  const yOffset = options.yOffset ?? 0.035
  const palette = options.palette ?? [0x4b5437, 0x5b5d3f, 0x6f6848, 0x3f4a35, 0x756f50]

  placements.forEach(([x, z, scale], i) => {
    setGrassInstanceMatrix(dummy, [x, z, scale], yOffset)
    mesh.setMatrixAt(i, dummy.matrix)
    mesh.setColorAt(i, color.setHex(palette[i % palette.length]))
  })

  mesh.instanceMatrix.needsUpdate = true
  mesh.instanceColor.needsUpdate  = true
  mesh.computeBoundingSphere()
  mesh.name = options.name ?? 'wind_grass_instances'
  mesh.castShadow = false
  mesh.receiveShadow = true
  scene.add(mesh)
  _grassInstances.push({ mesh, placements, yOffset })
}

function createCheapStaticMaterial(source) {
  const material = new THREE.MeshLambertMaterial({
    color: source?.color ? source.color.clone() : new THREE.Color(0xffffff),
    map: source?.map ?? null,
    transparent: Boolean(source?.transparent),
    opacity: source?.opacity ?? 1,
    alphaTest: source?.alphaTest ?? 0,
    side: source?.side ?? THREE.FrontSide,
  })
  if (material.map) material.map.colorSpace = THREE.SRGBColorSpace
  material.name = source?.name ? `${source.name}_cheap` : 'cheap_static_material'
  return material
}

function configureStaticGltfModel(root, { shadows = true, cheapMaterials = false } = {}) {
  const cheapMaterialCache = new Map()
  root.traverse((child) => {
    if (!child.isMesh) return
    child.castShadow = shadows
    child.receiveShadow = shadows
    const mats = Array.isArray(child.material) ? child.material : [child.material]
    if (cheapMaterials) {
      const nextMaterials = mats.map((mat) => {
        if (!mat) return mat
        if (!cheapMaterialCache.has(mat.uuid)) cheapMaterialCache.set(mat.uuid, createCheapStaticMaterial(mat))
        return cheapMaterialCache.get(mat.uuid)
      })
      child.material = Array.isArray(child.material) ? nextMaterials : nextMaterials[0]
      return
    }
    mats.forEach((mat) => { if (mat) mat.needsUpdate = true })
  })
}

function addOldChurchRuinsColliders(group, collidables) {
  const c = Math.cos(group.rotation.y)
  const s = Math.sin(group.rotation.y)
  oldChurchRuinsColliders.forEach((collider) => {
    const x = group.position.x + collider.x * c + collider.z * s
    const z = group.position.z - collider.x * s + collider.z * c
    collidables.push({
      ...collider,
      name: `old_church_ruins_${collider.name}`,
      x,
      z,
      ux: collider.ux * c + collider.uz * s,
      uz: -collider.ux * s + collider.uz * c,
      vx: collider.vx * c + collider.vz * s,
      vz: -collider.vx * s + collider.vz * c,
    })
  })
}

function loadOldChurchRuins(scene, collidables, onReady = null) {
  cloneGLTFScene(oldChurchRuinsUrl).then((root) => {
    const group = new THREE.Group()
    const { x, z, rotY } = OLD_CHURCH_RUINS_PLACEMENT

    group.name = 'old_church_ruins'
    group.position.set(x, 0, z)
    group.rotation.y = rotY

    configureStaticGltfModel(root, { shadows: true, cheapMaterials: false })
    group.add(root)
    scene.add(group)
    snapObjectToGround(group, OLD_CHURCH_RUINS_Y_OFFSET)
    addOldChurchRuinsColliders(group, collidables)
    onReady?.(group)
  }).catch((error) => {
    console.warn(`Old church model fallback active: ${oldChurchRuinsUrl}`, error)
  })
}

function loadForestGrove(scene, collidables) {
  FOREST_GROVE_PLACEMENTS.forEach((placement, index) => {
    const origin = getForestPlacementOrigin(placement)
    const x = origin.x + placement.dx
    const z = origin.z + placement.dz

    if (placement.r) {
      collidables.push({
        name: `forest_grove_${index + 1}_${placement.file}`,
        x,
        z,
        r: placement.r,
      })
    }

    cloneGLTFScene(`${FOREST_GROVE_ASSETS_BASE}/${placement.file}`).then((root) => {
      const group = new THREE.Group()
      group.name = `forest_grove_${placement.file.replace(/\.glb$/i, '')}`
      group.position.set(x, 0, z)
      group.rotation.y = placement.rotY ?? 0
      group.scale.setScalar(placement.scale ?? 1)
      configureStaticGltfModel(root, { shadows: true, cheapMaterials: false })
      group.add(root)
      scene.add(group)
      snapObjectToGround(group)
    }).catch((error) => {
      console.warn(`Forest grove asset failed: ${placement.file}`, error)
    })
  })
}

function moundNoise(x, z) {
  return Math.sin(x * 0.19 + z * 0.31) * 0.5
    + Math.sin(x * 0.47 - z * 0.23) * 0.3
    + Math.sin(x * 0.83 + z * 0.61) * 0.2
}

function distanceToSegment2D(px, pz, ax, az, bx, bz) {
  const abx = bx - ax
  const abz = bz - az
  const apx = px - ax
  const apz = pz - az
  const lenSq = abx * abx + abz * abz || 1
  const t = THREE.MathUtils.clamp((apx * abx + apz * abz) / lenSq, 0, 1)
  const cx = ax + abx * t
  const cz = az + abz * t
  return Math.hypot(px - cx, pz - cz)
}

function applyCastleApproachHeight(x, z, height) {
  let result = height
  for (const mound of CASTLE_APPROACH_MOUNDS) {
    const c = Math.cos(-mound.rot)
    const s = Math.sin(-mound.rot)
    const dx = x - mound.x
    const dz = z - mound.z
    const lx = dx * c - dz * s
    const lz = dx * s + dz * c
    const d = Math.hypot(lx / mound.rx, lz / mound.rz)
    if (d >= 1.25) continue
    const core = 1 - THREE.MathUtils.smoothstep(d, 0.18, 1.25)
    const broken = 0.86 + moundNoise(x, z) * 0.08
    result = Math.max(result, height + mound.h * core * broken)
  }
  for (const ridge of CASTLE_APPROACH_ROCKERY_RIDGES) {
    for (let i = 0; i < ridge.points.length - 1; i++) {
      const [ax, az, aw, ah] = ridge.points[i]
      const [bx, bz, bw, bh] = ridge.points[i + 1]
      const width = (aw + bw) * 0.5
      const distance = distanceToSegment2D(x, z, ax, az, bx, bz)
      if (distance >= width * 1.55) continue
      const core = 1 - THREE.MathUtils.smoothstep(distance, width * 0.36, width * 1.55)
      const ridgeHeight = Math.max(ah, bh) * (0.58 + moundNoise(x, z) * 0.035)
      result = Math.max(result, height + ridgeHeight * core)
    }
  }
  return result
}

function applyCurvedCliffHeight(x, z, height) {
  let result = height
  CURVED_CLIFF_RIDGES.forEach((ridge) => {
    const points = ridge.points
    for (let i = 0; i < points.length - 1; i++) {
      const [ax, az, aw, ah] = points[i]
      const [bx, bz, bw, bh] = points[i + 1]
      const width = (aw + bw) * 0.5
      const distance = distanceToSegment2D(x, z, ax, az, bx, bz)
      if (distance >= width * 1.25) continue
      const core = 1 - THREE.MathUtils.smoothstep(distance, width * 0.08, width * 1.25)
      const ridgeHeight = Math.max(ah, bh) * (0.95 + Math.max(0, moundNoise(x, z)) * 0.08)
      result = Math.max(result, height + ridgeHeight * Math.pow(core, 0.72))
    }
  })
  return result
}

function createRockeryRidgeNetworkGeometry(ridges) {
  const verts = []
  const uvs = []
  const idx = []
  const stride = 7
  const bottomY = -0.45
  const addQuad = (a, b, c, d) => idx.push(a, b, c, a, c, d)
  const addCap = (base, reverse = false) => {
    const tris = [
      [base + 5, base + 0, base + 1],
      [base + 5, base + 1, base + 2],
      [base + 5, base + 2, base + 3],
      [base + 5, base + 3, base + 4],
      [base + 5, base + 4, base + 6],
    ]
    tris.forEach(([a, b, c]) => {
      if (reverse) idx.push(a, c, b)
      else idx.push(a, b, c)
    })
  }

  ridges.forEach((ridge, ridgeIndex) => {
    const ridgeStart = verts.length / 3
    const sections = ridge.points.length

    ridge.points.forEach(([x, z, width, height], i) => {
      const prev = ridge.points[Math.max(0, i - 1)]
      const next = ridge.points[Math.min(sections - 1, i + 1)]
      const tangentX = next[0] - prev[0]
      const tangentZ = next[1] - prev[1]
      const len = Math.hypot(tangentX, tangentZ) || 1
      const normalX = -tangentZ / len
      const normalZ = tangentX / len
      const t = i / Math.max(1, sections - 1)
      const jag = Math.sin((i + 1) * 1.71 + ridgeIndex * 2.3)
      const shoulderY = height * (0.31 + Math.abs(jag) * 0.045)
      const peakY = height * (0.98 + Math.abs(Math.sin(i * 1.13 + ridgeIndex)) * 0.28)
      const peakShift = Math.sin(i * 0.87 + ridgeIndex * 1.9) * width * 0.16
      const halfWidth = width * (0.9 + Math.abs(Math.sin(i * 0.59)) * 0.13)
      const shoulderInset = halfWidth * (0.46 + Math.abs(Math.cos(i * 0.73)) * 0.08)
      const offsets = [-halfWidth, -shoulderInset, peakShift, shoulderInset, halfWidth]
      const heights = [0, shoulderY, peakY, shoulderY * 0.92, 0]

      offsets.forEach((offset, j) => {
        const vx = x + normalX * offset
        const vz = z + normalZ * offset
        verts.push(vx, heights[j], vz)
        uvs.push(t * 5.0, (j / 4) + ridgeIndex * 0.03)
      })
      for (const edgeOffset of [-halfWidth, halfWidth]) {
        const vx = x + normalX * edgeOffset
        const vz = z + normalZ * edgeOffset
        verts.push(vx, bottomY, vz)
        uvs.push(t * 5.0, ridgeIndex * 0.03 - 0.16)
      }
    })

    for (let i = 0; i < sections - 1; i++) {
      const a = ridgeStart + i * stride
      const b = ridgeStart + (i + 1) * stride
      for (let j = 0; j < 4; j++) {
        idx.push(a + j, b + j, a + j + 1, a + j + 1, b + j, b + j + 1)
      }
      addQuad(a + 0, a + 5, b + 5, b + 0)
      addQuad(a + 6, a + 4, b + 4, b + 6)
      addQuad(a + 5, a + 6, b + 6, b + 5)
    }

    addCap(ridgeStart, false)
    const last = ridgeStart + (sections - 1) * stride
    addCap(last, true)

    for (let i = 1; i < sections - 1; i += 2) {
      const base = ridgeStart + i * stride
      const next = ridgeStart + (i + 1) * stride
      const prev = ridgeStart + (i - 1) * stride
      idx.push(base + 2, prev + 1, base + 1, base + 2, base + 3, prev + 3)
      idx.push(base + 2, base + 1, next + 1, base + 2, next + 3, base + 3)
    }
  })

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setAttribute('uv2', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(idx)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

function makeApproachRockery(scene, material) {
  const rockery = new THREE.Mesh(createRockeryRidgeNetworkGeometry(CASTLE_APPROACH_ROCKERY_RIDGES), material)
  rockery.name = 'approach-rockery-continuous-mountain'
  rockery.castShadow = true
  rockery.receiveShadow = true
  scene.add(rockery)
}

function makeCurvedCliff(scene, material) {
  const cliff = new THREE.Mesh(createRockeryRidgeNetworkGeometry(CURVED_CLIFF_RIDGES), material)
  cliff.name = 'curved-cliffs'
  cliff.castShadow = true
  cliff.receiveShadow = true
  scene.add(cliff)
}

function addCurvedCliffColliders(collidables) {
  CURVED_CLIFF_RIDGES.forEach((ridge) => {
    const points = ridge.points
    points.forEach(([x, z, width, height], pointIndex) => {
      collidables.push({
        name: `CURVED_CLIFF_POINT_${ridge.name}_${pointIndex}`,
        x,
        z,
        r: Math.max(5.5, width * 0.82),
        minY: -0.5,
        maxY: height + 6,
      })
    })

    for (let i = 0; i < points.length - 1; i++) {
      const [ax, az, aw, ah] = points[i]
      const [bx, bz, bw, bh] = points[i + 1]
      const distance = Math.hypot(bx - ax, bz - az)
      const samples = Math.max(1, Math.ceil(distance / 3.2))
      for (let step = 1; step < samples; step++) {
        const t = step / samples
        const x = THREE.MathUtils.lerp(ax, bx, t)
        const z = THREE.MathUtils.lerp(az, bz, t)
        const width = THREE.MathUtils.lerp(aw, bw, t)
        const height = THREE.MathUtils.lerp(ah, bh, t)
        collidables.push({
          name: `CURVED_CLIFF_SEGMENT_${ridge.name}_${i}_${step}`,
          x,
          z,
          r: Math.max(5.2, width * 0.74),
          minY: -0.5,
          maxY: height + 6,
        })
      }
    }
  })
}

function addApproachRockeryColliders(collidables) {
  CASTLE_APPROACH_ROCKERY_RIDGES.forEach((ridge) => {
    ridge.points.forEach(([x, z, width, height], pointIndex) => {
      collidables.push({
        name: `ROCKERY_POINT_${ridge.name}_${pointIndex}`,
        x,
        z,
        r: Math.max(2.9, width * 0.82),
        minY: -0.5,
        maxY: height + 1.0,
      })
    })
    for (let i = 0; i < ridge.points.length - 1; i++) {
      const [ax, az, aw, ah] = ridge.points[i]
      const [bx, bz, bw, bh] = ridge.points[i + 1]
      const distance = Math.hypot(bx - ax, bz - az)
      const samples = Math.max(1, Math.ceil(distance / 3.2))
      for (let step = 1; step < samples; step++) {
        const t = step / samples
        const x = THREE.MathUtils.lerp(ax, bx, t)
        const z = THREE.MathUtils.lerp(az, bz, t)
        const width = THREE.MathUtils.lerp(aw, bw, t)
        const height = THREE.MathUtils.lerp(ah, bh, t)
        collidables.push({
          name: `ROCKERY_SEGMENT_${ridge.name}_${i}_${step}`,
          x,
          z,
          r: Math.max(2.7, width * 0.72),
          minY: -0.5,
          maxY: height + 1.0,
        })
      }
    }
  })
}

function buildCastleApproach(scene, collidables, roadMaterial, castleGateX, castleGateZ) {
  const path = makeCurvedPath(scene, [
    [-20, 1.5], [-12, 0.6], [-4, -0.8], [1.5, 4.4], [8.5, 9.2],
    [18.5, 8.2], [26.0, -4.8], [37.5, -11.4], [49.0, -4.2],
    [56.5, 5.8], [64.5, 0.8], [castleGateX - 4.8, castleGateZ - 0.8],
    [castleGateX, castleGateZ],
  ], 2.05, roadMaterial, 0.115)

  const moundMaterial = createRockeryMaterial()
  makeApproachRockery(scene, moundMaterial)
  addApproachRockeryColliders(collidables)
  makeGrass(scene, collectPathGrass(path))
}

function createTerrainBlendMaterial(texLoader) {
  const applyRepeat = (tex) => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(96, 96)
    return tex
  }

  const mat = new THREE.MeshStandardMaterial({
    map:          applyRepeat(texLoader.load('/textures/coast_sand_rocks_02_diff_1k.jpg')),
    normalMap:    applyRepeat(texLoader.load('/textures/coast_sand_rocks_02_nor_gl_1k.jpg')),
    roughness: 0.99,
    metalness: 0,
  })

  const uniforms = {
    uLowColor:        { value: new THREE.Color(0x3f4939) },
    uSlopeColor:      { value: new THREE.Color(0x5a554b) },
    uHighColor:       { value: new THREE.Color(0x8b8678) },
    uSlopeStart:      { value: 0.18 },
    uSlopeEnd:        { value: 0.4 },
    uHeightStart:     { value: 4.5 },
    uHeightEnd:       { value: 22 },
    uContourScale:    { value: 0.36 },
    uContourStrength: { value: 0.42 },
    uNoiseScale:      { value: 0.12 },
  }

  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)

    shader.vertexShader = `
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
    ` + shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      `#include <worldpos_vertex>
       vWorldPos = worldPosition.xyz;
       vWorldNormal = normalize(mat3(modelMatrix) * objectNormal);`
    )

    shader.fragmentShader = `
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      uniform vec3 uLowColor;
      uniform vec3 uSlopeColor;
      uniform vec3 uHighColor;
      uniform float uSlopeStart;
      uniform float uSlopeEnd;
      uniform float uHeightStart;
      uniform float uHeightEnd;
      uniform float uContourScale;
      uniform float uContourStrength;
      uniform float uNoiseScale;

      float terrainNoise(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
    ` + shader.fragmentShader.replace(
      '#include <color_fragment>',
      `
      float slope = 1.0 - clamp(dot(normalize(vWorldNormal), vec3(0.0, 1.0, 0.0)), 0.0, 1.0);
      float slopeMask = smoothstep(uSlopeStart, uSlopeEnd, slope);
      float highMask = smoothstep(uHeightStart, uHeightEnd, vWorldPos.y);

      float contourPhase = abs(fract(vWorldPos.y * uContourScale) - 0.5) * 2.0;
      float contourMask = pow(1.0 - contourPhase, 3.0) * (0.35 + 0.65 * slopeMask);

      float n = terrainNoise(vWorldPos.xz * uNoiseScale);
      vec3 terrainTint = mix(uLowColor, uSlopeColor, slopeMask);
      terrainTint = mix(terrainTint, uHighColor, highMask);
      terrainTint *= 0.94 + n * 0.12;
      terrainTint = mix(terrainTint, terrainTint * 0.74, contourMask * uContourStrength);

      diffuseColor.rgb *= terrainTint;
      #include <color_fragment>
      `
    )
  }

  mat.customProgramCacheKey = () => 'terrain-blend-soft-pbr-v1'
  return mat
}


// ── 编辑器模板缓存 ────────────────────────────────────────
let _treeGltfScene = null
let _rockGltfScene = null
const _campfireStates = []   // 所有火堆的动画状态，update() 中迭代
// 启动时 GLB 尚未加载完成时的待处理队列
const _pendingTreeClones    = []   // { group, scale }
const _pendingRockClones    = []   // { group, scale } — 编辑器单独克隆时用
let   _pendingRockInstances = null // { scene, rocks } — 非编辑器 InstancedMesh 构建

let _rockInstancedMesh = null  // 游戏模式下的岩石 InstancedMesh
let _sampleTerrainHeight = () => 0
let _terrainReady = false
const _pendingGroundings = []
const TREE_MODEL_SCALE = 3

function _applyGrounding(group, yOffset = 0) {
  if (!group) return
  const targetY = _sampleTerrainHeight(group.position.x, group.position.z) + yOffset
  group.updateWorldMatrix(true, true)
  const box = new THREE.Box3().setFromObject(group)
  group.position.y += box.isEmpty() ? targetY - group.position.y : targetY - box.min.y
}

export function getGroundHeight(x, z) {
  return _sampleTerrainHeight(x, z)
}

export function snapObjectToGround(group, yOffset = 0) {
  if (!group) return
  if (_terrainReady) {
    _applyGrounding(group, yOffset)
  } else {
    _pendingGroundings.push({ group, yOffset })
  }
}

function _buildRockInstancedMesh(scene, rocks) {
  if (!rocks.length) return
  let templateMesh = null
  _rockGltfScene.traverse(c => { if (c.isMesh && !templateMesh) templateMesh = c })
  if (!templateMesh) return

  const inst = new THREE.InstancedMesh(templateMesh.geometry, templateMesh.material, rocks.length)
  inst.castShadow = true
  inst.receiveShadow = true
  inst.userData.editorMeta = { type: 'rock_instanced', rocks }

  const dummy = new THREE.Object3D()
  rocks.forEach(({ x, z, scale = 0.9 }, i) => {
    dummy.position.set(x, getGroundHeight(x, z), z)
    dummy.scale.setScalar(scale)
    // 基于位置的确定性旋转，避免每次刷新朝向不同
    dummy.rotation.y = ((x * 127 + z * 31) & 0xffff) / 0xffff * Math.PI * 2
    dummy.updateMatrix()
    inst.setMatrixAt(i, dummy.matrix)
  })
  inst.instanceMatrix.needsUpdate = true
  scene.add(inst)
  _rockInstancedMesh = inst
}

/** 游戏模式：将所有岩石合批为一个 InstancedMesh */
export function buildRockInstances(scene, rocks) {
  if (!rocks?.length) return
  if (_rockGltfScene) {
    _buildRockInstancedMesh(scene, rocks)
  } else {
    _pendingRockInstances = { scene, rocks }
  }
}

/** 进入编辑器前移除 InstancedMesh（编辑器会换成独立克隆） */
export function destroyRockInstances(scene) {
  if (_rockInstancedMesh) {
    scene.remove(_rockInstancedMesh)
    _rockInstancedMesh = null
  }
}

export function cloneTreeForEditor(scene, x, z, scale = 1.0) {
  const group = new THREE.Group()
  group.position.set(x, 0, z)
  group.userData.editorMeta = { type: 'tree', x, z, scale, rotY: 0 }
  scene.add(group)
  snapObjectToGround(group)
  if (_treeGltfScene) {
    const mesh = _treeGltfScene.clone()
    mesh.scale.setScalar(scale * TREE_MODEL_SCALE)
    mesh.traverse(c => {
      if (c.isMesh) { c.castShadow = true; c.receiveShadow = false }
    })
    group.add(mesh)
  } else {
    _pendingTreeClones.push({ group, scale })
  }
  return group
}

export function cloneRockForEditor(scene, x, z, scale = 1.0) {
  const group = new THREE.Group()
  group.position.set(x, 0, z)
  group.userData.editorMeta = { type: 'rock', x, z, scale }
  scene.add(group)
  snapObjectToGround(group)
  if (_rockGltfScene) {
    const mesh = _rockGltfScene.clone(true)
    mesh.scale.setScalar(scale)
    mesh.traverse(c => {
      if (c.isMesh) { c.castShadow = true; c.receiveShadow = true }
    })
    group.add(mesh)
  } else {
    _pendingRockClones.push({ group, scale })
  }
  return group
}



export function makeHouse(scene, x, z, rotY = 0) {
  const group = new THREE.Group()

  const wallMat  = new THREE.MeshLambertMaterial({ color: 0xf0dbb0 })
  const roofMat  = new THREE.MeshLambertMaterial({ color: 0xb03020 })
  const woodMat  = new THREE.MeshLambertMaterial({ color: 0x7a4820 })
  const glassMat = new THREE.MeshLambertMaterial({ color: 0xb8e0f8, transparent: true, opacity: 0.75 })
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x999080 })

  // 地基
  const foundation = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.2, 2.7),
    stoneMat
  )
  foundation.position.y = 0.1
  foundation.receiveShadow = true
  group.add(foundation)

  // 墙体
  const wall = new THREE.Mesh(new THREE.BoxGeometry(3, 2.1, 2.5), wallMat)
  wall.position.y = 1.15
  wall.castShadow = true
  wall.receiveShadow = true
  group.add(wall)

  // 屋顶
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.3, 1.5, 4), roofMat)
  roof.position.y = 2.95
  roof.rotation.y = Math.PI / 4
  roof.castShadow = true
  group.add(roof)

  // 屋檐（压住墙顶的薄板）
  const eave = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 0.1, 2.9),
    new THREE.MeshLambertMaterial({ color: 0x8b5030 })
  )
  eave.position.y = 2.25
  eave.castShadow = true
  group.add(eave)

  // 烟囱
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.0, 0.35), stoneMat)
  chimney.position.set(0.7, 3.2, -0.4)
  chimney.castShadow = true
  group.add(chimney)
  const chimneyTop = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.1, 0.45), stoneMat)
  chimneyTop.position.set(0.7, 3.75, -0.4)
  group.add(chimneyTop)

  // 门框
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.08, 0.08), woodMat)
  doorFrame.position.set(0, 0.54, 1.29)
  group.add(doorFrame)
  // 门板
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.96, 0.07), woodMat)
  door.position.set(0, 0.52, 1.32)
  group.add(door)
  // 门把手
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6),
    new THREE.MeshLambertMaterial({ color: 0xd4a520 }))
  knob.position.set(0.22, 0.5, 1.36)
  group.add(knob)

  // 台阶
  const step = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.35), stoneMat)
  step.position.set(0, 0.06, 1.55)
  step.receiveShadow = true
  group.add(step)

  // 窗户（含窗框 + 十字横档）
  ;[-0.9, 0.9].forEach(wx => {
    // 窗框
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.52, 0.08), woodMat)
    frame.position.set(wx, 1.15, 1.29)
    group.add(frame)
    // 玻璃
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.42, 0.06), glassMat)
    glass.position.set(wx, 1.15, 1.31)
    group.add(glass)
    // 横档
    const barH = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.05), woodMat)
    barH.position.set(wx, 1.15, 1.33)
    group.add(barH)
    const barV = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.42, 0.05), woodMat)
    barV.position.set(wx, 1.15, 1.33)
    group.add(barV)
  })

  // 墙角木梁装饰（两侧竖条）
  ;[-1.48, 1.48].forEach(bx => {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.1, 0.1), woodMat)
    beam.position.set(bx, 1.15, 1.25)
    group.add(beam)
  })

  // ── 按材质合并子 Mesh，从 ~17 Draw Call → ~6 Draw Call ──
  const byMat = new Map()
  for (const child of group.children) {
    if (!child.isMesh) continue
    child.updateMatrix()
    const geo = child.geometry.clone()
    geo.applyMatrix4(child.matrix)
    const key = child.material.uuid
    if (!byMat.has(key)) byMat.set(key, { mat: child.material, geos: [], transparent: !!child.material.transparent })
    byMat.get(key).geos.push(geo)
  }
  // 移除原始散件
  for (let i = group.children.length - 1; i >= 0; i--) {
    const c = group.children[i]
    if (c.isMesh) { c.geometry.dispose(); group.remove(c) }
  }
  // 添加合并后的 Mesh
  for (const { mat, geos, transparent } of byMat.values()) {
    const merged = mergeGeometries(geos)
    geos.forEach(g => g.dispose())
    const mesh = new THREE.Mesh(merged, mat)
    mesh.castShadow    = !transparent
    mesh.receiveShadow = true
    group.add(mesh)
  }

  group.position.set(x, 0, z)
  group.rotation.y = rotY
  group.userData.editorMeta = { type: 'house', x, z, rotY }
  scene.add(group)
  snapObjectToGround(group)
  return group
}


function makePond(scene, x, z, r = 1.8) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime:       { value: 0 },
      uCenter:     { value: new THREE.Vector2(x, z) },
      uRadius:     { value: r },
      uRipples:    { value: Array.from({ length: 8 }, () => new THREE.Vector2()) },
      uRippleAges: { value: new Float32Array(8).fill(-1) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec2  uCenter;
      uniform float uRadius;
      uniform vec2  uRipples[8];
      uniform float uRippleAges[8];
      varying vec2 vUv;

      void main() {
        vec2 local = (vUv - vec2(0.5)) * uRadius * 2.0;

        float w = sin(local.x * 2.8 + uTime * 0.9)  * 0.07
                + sin(local.y * 2.2 + uTime * 0.7)  * 0.06
                + sin(length(local) * 3.5 - uTime * 1.4) * 0.04;

        for (int i = 0; i < 8; i++) {
          float age = uRippleAges[i];
          if (age < 0.0 || age > 2.5) continue;
          vec2 origin = uRipples[i] - uCenter;
          float dist = length(local - origin);
          float waveR = age * 2.0;
          float env = exp(-abs(dist - waveR) * 5.0) * exp(-age * 1.5);
          w += sin(dist * 6.0 - age * 13.0) * env * 0.35;
        }

        vec3 deep  = vec3(0.17, 0.52, 0.75);
        vec3 crest = vec3(0.60, 0.86, 1.00);
        vec3 color = mix(deep, crest, clamp(w + 0.5, 0.0, 1.0));

        float edgeR = length(vUv - vec2(0.5)) * 2.0;
        float alpha  = smoothstep(1.0, 0.88, edgeR) * 0.88;

        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
  })

  const pond = new THREE.Mesh(new THREE.CircleGeometry(r, 48), material)
  pond.rotation.x = -Math.PI / 2
  pond.position.set(x, 0, z)
  scene.add(pond)
  snapObjectToGround(pond, 0.02)

  const rim = new THREE.Mesh(
    new THREE.RingGeometry(r, r + 0.3, 24),
    new THREE.MeshLambertMaterial({ color: 0x999080 })
  )
  rim.rotation.x = -Math.PI / 2
  rim.position.set(x, 0, z)
  rim.receiveShadow = true
  scene.add(rim)
  snapObjectToGround(rim, 0.01)

  return material
}

export function makeCampfire(scene, x, z) {
  const group = new THREE.Group()
  group.position.set(x, 0, z)
  group.userData.editorMeta = { type: 'campfire', x, z }

  // 石圈
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x888070 })
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2
    const stone = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.13 + Math.random() * 0.06, 0),
      stoneMat
    )
    stone.position.set(Math.cos(angle) * 0.45, 0.08, Math.sin(angle) * 0.45)
    stone.rotation.set(Math.random(), Math.random(), Math.random())
    stone.castShadow = true
    group.add(stone)
  }

  // 木柴（两根交叉）
  const logMat = new THREE.MeshLambertMaterial({ color: 0x5a3010 })
  ;[0, Math.PI / 2].forEach(ry => {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.9, 6), logMat)
    log.rotation.set(Math.PI / 2, ry, 0.15)
    log.position.y = 0.07
    log.castShadow = true
    group.add(log)
  })

  // 余烬底座
  const ember = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.22, 0.06, 10),
    new THREE.MeshLambertMaterial({ color: 0xff2200, emissive: 0xff1100, emissiveIntensity: 0.8 })
  )
  ember.position.y = 0.06
  group.add(ember)

  // 火焰层（4 层锥体，不同颜色和高度）
  const flameDefs = [
    { color: 0xff2200, emissive: 0xdd1100, h: 0.55, r: 0.22, y: 0.32 },
    { color: 0xff5500, emissive: 0xff2200, h: 0.45, r: 0.16, y: 0.44 },
    { color: 0xff8800, emissive: 0xff5500, h: 0.35, r: 0.11, y: 0.54 },
    { color: 0xffcc00, emissive: 0xffaa00, h: 0.22, r: 0.06, y: 0.64 },
  ]
  const flames = flameDefs.map(({ color, emissive, h, r, y }) => {
    const mesh = new THREE.Mesh(
      new THREE.ConeGeometry(r, h, 7, 1, true),
      new THREE.MeshLambertMaterial({
        color, emissive, emissiveIntensity: 1.0,
        transparent: true, opacity: 0.92,
        side: THREE.DoubleSide,
      })
    )
    mesh.position.y = y
    mesh.userData.baseY = y
    group.add(mesh)
    return mesh
  })

  // 烟雾（半透明灰球，静态装饰，不投影）
  for (let i = 0; i < 3; i++) {
    const smoke = new THREE.Mesh(
      new THREE.SphereGeometry(0.08 + i * 0.04, 6, 6),
      new THREE.MeshLambertMaterial({
        color: 0x888888, transparent: true,
        opacity: 0.18 - i * 0.04,
      })
    )
    smoke.castShadow = false
    smoke.position.set(
      (Math.random() - 0.5) * 0.15,
      1.0 + i * 0.22,
      (Math.random() - 0.5) * 0.15
    )
    group.add(smoke)
  }

  // 灯光作为 group 子节点（相对坐标），随 group 移动/删除
  const light = new THREE.PointLight(0xff5500, 4.0, 14)
  light.position.set(0, 0.8, 0)
  light.castShadow = false
  group.add(light)

  const glow = new THREE.PointLight(0xff3300, 1.5, 28)
  glow.position.set(0, 0.3, 0)
  group.add(glow)

  scene.add(group)
  snapObjectToGround(group, -0.08)

  const phase = Math.random() * Math.PI * 2
  _campfireStates.push({ flames, light, glow, phase, group })
  return group
}

function canyonCenterZ(x) {
  const t = THREE.MathUtils.clamp((CANYON.startX - x) / (CANYON.startX - CANYON.endX), 0, 1)
  return CANYON.centerZ + Math.sin(t * Math.PI * 1.8) * 5.8 + Math.sin(t * Math.PI * 4.6) * 1.6
}

function canyonLongitudinalMask(x) {
  const inFromStart = THREE.MathUtils.smoothstep(CANYON.startX - x, 0, 46)
  const inFromEnd = THREE.MathUtils.smoothstep(x - CANYON.endX, 0, 46)
  return inFromStart * inFromEnd
}

function canyonNoise(x, z) {
  return Math.sin(x * 0.043 + z * 0.071) * 0.5
    + Math.sin(x * 0.117 - z * 0.053) * 0.32
    + Math.sin(x * 0.219 + z * 0.173) * 0.18
}

function applyCanyonHeight(x, z, height) {
  const mask = canyonLongitudinalMask(x)
  if (mask <= 0) return height

  const centerZ = canyonCenterZ(x)
  const distance = Math.abs(z - centerZ)
  const t = THREE.MathUtils.clamp((CANYON.startX - x) / (CANYON.startX - CANYON.endX), 0, 1)
  const bend = Math.sin(t * Math.PI * 3.1)
  const floorHalfWidth = CANYON.walkHalfWidth + bend * 0.8
  const floorMask = 1 - THREE.MathUtils.smoothstep(distance, floorHalfWidth - 1.2, floorHalfWidth + 2.2)
  const bankT = THREE.MathUtils.smoothstep(distance, floorHalfWidth, CANYON.wallHalfGap)
  const cliffT = THREE.MathUtils.smoothstep(distance, CANYON.wallHalfGap, CANYON.wallHalfGap + CANYON.wallThickness)
  const upperT = THREE.MathUtils.smoothstep(distance, CANYON.wallHalfGap + CANYON.wallThickness * 0.45, CANYON.wallHalfGap + CANYON.wallThickness)
  const noise = canyonNoise(x, z)
  const canyonFloor = 0.08 + t * 0.7 + Math.sin(x * 0.045) * 0.08
  const gravelBank = canyonFloor + 0.35 + bankT * bankT * (4.8 + Math.max(0, noise) * 1.4)
  const cliffHeight = 8 + t * 12 + Math.max(0, noise) * 4.2 + Math.abs(Math.sin(x * 0.16)) * 1.8
  const ridgeHeight = cliffHeight + 4 + Math.abs(Math.sin(x * 0.09 + z * 0.12)) * 3

  let result = THREE.MathUtils.lerp(height, canyonFloor, floorMask * mask)
  result = THREE.MathUtils.lerp(result, Math.max(result, gravelBank), bankT * 0.65 * mask)
  result = THREE.MathUtils.lerp(result, Math.max(result, cliffHeight), Math.pow(cliffT, 0.9) * 0.82 * mask)
  result = THREE.MathUtils.lerp(result, Math.max(result, ridgeHeight), upperT * 0.46 * mask)
  return result
}

function sampleCanyonHeight(x, z) {
  return applyCanyonHeight(x, z, 0)
}

function makeCanyonCliffFace(scene, side, material) {
  const segments = 92
  const verts = []
  const idxs = []
  const colors = []
  const color = new THREE.Color()

  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const x = THREE.MathUtils.lerp(CANYON.startX - 6, CANYON.endX + 8, t)
    const centerZ = canyonCenterZ(x)
    const bite = Math.sin(i * 1.17) * 1.1 + Math.sin(i * 0.31) * 2.2
    const baseZ = centerZ + side * (CANYON.walkHalfWidth + 2.8 + bite * 0.12)
    const midZ = centerZ + side * (CANYON.wallHalfGap + 4.0 + bite)
    const topZ = centerZ + side * (CANYON.wallHalfGap + 18 + bite * 1.8)
    const tHeight = THREE.MathUtils.clamp((CANYON.startX - x) / (CANYON.startX - CANYON.endX), 0, 1)
    const jag = Math.abs(Math.sin(i * 2.31)) * 3.2 + Math.sin(i * 0.71) * 1.6
    const midY = 4.2 + tHeight * 7.5 + jag * 0.35
    const topY = 11 + tHeight * 12 + jag

    verts.push(x, 0.12, baseZ, x + Math.sin(i) * 1.2, midY, midZ, x + Math.cos(i * 0.8) * 2.0, topY, topZ)
    for (const shade of [0.72, 0.86, 0.54]) {
      color.setRGB(0.24 * shade, 0.23 * shade, 0.2 * shade)
      colors.push(color.r, color.g, color.b)
    }
    if (i < segments) {
      const a = i * 3
      const b = a + 3
      idxs.push(a, b, a + 1, a + 1, b, b + 1, a + 1, b + 1, a + 2, a + 2, b + 1, b + 2)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(idxs)
  geometry.computeVertexNormals()
  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  scene.add(mesh)
}

function buildCanyonDetails(scene) {
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x4c4942, roughness: 1, flatShading: true })
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x3c4b32, roughness: 1 })
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x243c3f,
    roughness: 0.55,
    metalness: 0,
    transparent: true,
    opacity: 0.46,
  })

  const streamPoints = []
  for (let i = 0; i <= 18; i++) {
    const t = i / 18
    const x = THREE.MathUtils.lerp(CANYON.startX + 2, CANYON.endX + 12, t)
    streamPoints.push([x, canyonCenterZ(x) + Math.sin(t * Math.PI * 8) * 0.55])
  }
  makeCurvedPath(scene, streamPoints, 2.0, waterMat, 0.105)

  for (let i = 0; i < 72; i++) {
    const t = i / 71
    const x = THREE.MathUtils.lerp(CANYON.startX - 10, CANYON.endX + 14, t)
    const centerZ = canyonCenterZ(x)
    const side = i % 2 === 0 ? -1 : 1
    const lateral = CANYON.walkHalfWidth + 3 + (i % 5) * 2.4 + Math.abs(Math.sin(i * 1.7)) * 2.2
    const z = centerZ + side * lateral
    const rockX = x + Math.sin(i * 2.4) * 1.8
    const radius = 0.7 + (i % 4) * 0.22
    const scaleY = 0.55 + (i % 4) * 0.18
    const groundY = sampleCanyonHeight(rockX, z)
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(radius, 0),
      rockMat,
    )
    rock.position.set(rockX, groundY + radius * scaleY * 0.68, z)
    rock.scale.set(1.3 + (i % 3) * 0.5, scaleY, 0.9 + (i % 5) * 0.25)
    rock.rotation.set(i * 0.37, i * 0.71, i * 0.19)
    rock.castShadow = true
    rock.receiveShadow = true
    scene.add(rock)

    if (i % 2 === 0) {
      const grassX = x + Math.cos(i) * 2.1
      const grassZ = centerZ - side * (CANYON.walkHalfWidth + 1.5 + (i % 4))
      const grassHeight = 1.1 + (i % 4) * 0.2
      const grass = new THREE.Mesh(new THREE.ConeGeometry(0.28 + (i % 3) * 0.08, grassHeight, 5), grassMat)
      grass.position.set(grassX, sampleCanyonHeight(grassX, grassZ) + grassHeight * 0.5, grassZ)
      grass.rotation.y = i * 0.53
      grass.castShadow = true
      scene.add(grass)
    }
  }
}

function buildCanyon(scene, collidables) {
  const pathMaterial = new THREE.MeshStandardMaterial({
    color: 0x6a6253,
    roughness: 0.99,
    metalness: 0,
  })
  const points = []
  for (let i = 0; i <= 12; i++) {
    const t = i / 12
    const x = THREE.MathUtils.lerp(CANYON.startX + 4, CANYON.endX + 16, t)
    points.push([x, canyonCenterZ(x)])
  }
  makeCurvedPath(scene, points, CANYON.walkHalfWidth * 1.45, pathMaterial, 0.18)
  buildCanyonDetails(scene)

  const markerMat = new THREE.MeshStandardMaterial({ color: 0x262728, roughness: 0.95 })
  for (let i = 0; i < 20; i++) {
    const t = i / 19
    const x = THREE.MathUtils.lerp(CANYON.startX - 10, CANYON.endX + 14, t)
    const z = canyonCenterZ(x)
    const side = i % 2 === 0 ? -1 : 1
    const pillarZ = z + side * (CANYON.wallHalfGap + 14 + (i % 4) * 2.2)
    const pillarHeight = 4.2 + (i % 5) * 1.1
    const pillar = new THREE.Mesh(new THREE.ConeGeometry(1.4 + (i % 3) * 0.45, pillarHeight, 6), markerMat)
    pillar.position.set(x, sampleCanyonHeight(x, pillarZ) + pillarHeight * 0.5 - 0.18, pillarZ)
    pillar.rotation.set(0.15 * side, (i * 0.83) % (Math.PI * 2), -0.08 * side)
    pillar.castShadow = true
    pillar.receiveShadow = true
    scene.add(pillar)
  }
}

// ── 主函数 ────────────────────────────────────────────

export function createMap(scene, { onStaticModelReady = null } = {}) {
  // 地面
  const texLoader = new THREE.TextureLoader()
  const collidables = []
  const groundMat = createTerrainBlendMaterial(texLoader)
  createHeightmapTerrain(scene, {
    material: groundMat,
    size: WORLD_SIZE,
    segments: 512,
    maxHeight: 18,
    sharpenMix: 0.35,
    sharpenPower: 1.35,
    flatAreas: [
      {
        x: 0,
        z: 0,
        halfWidth: 34,
        halfDepth: 32,
        feather: 16,
        height: 0,
      },
      {
        x: CASTLE_EXTERIOR.origin.x,
        z: CASTLE_EXTERIOR.origin.z - 12,
        halfWidth: 34,
        halfDepth: 32,
        feather: 12,
        height: 0,
      },
    ],
    heightModifiers: [applyCanyonHeight, applyCastleApproachHeight, applyCurvedCliffHeight],
    heightmapUrl: '/heightmaps/main_height_1024.png',
    onReady: (sampleHeight) => {
      _sampleTerrainHeight = sampleHeight
      _terrainReady = true

      if (_rockInstancedMesh?.userData?.editorMeta?.rocks) {
        const rocks = _rockInstancedMesh.userData.editorMeta.rocks
        scene.remove(_rockInstancedMesh)
        _rockInstancedMesh = null
        _buildRockInstancedMesh(scene, rocks)
      }

      const pending = _pendingGroundings.splice(0, _pendingGroundings.length)
      pending.forEach(({ group, yOffset }) => {
        if (group.parent) _applyGrounding(group, yOffset)
      })
      regroundGrassInstances()
    },
  })

  // 曲线路面 + 路边草
  const roadMaterial = createRoadMaterial()
  const castleGateX = CASTLE_EXTERIOR.origin.x + CASTLE_EXTERIOR.fogDoor.x
  const castleGateZ = CASTLE_EXTERIOR.origin.z + CASTLE_EXTERIOR.fogDoor.z
  // 主横路西段：连接村庄和峡谷入口。
  makeCurvedPath(scene, [
    [-96, 2.8], [-78, 2.4], [-58, 1.5], [-38, 0.6], [-20, 1.5],
  ], 2.15, roadMaterial, 0.105)
  buildCastleApproach(scene, collidables, roadMaterial, castleGateX, castleGateZ)
  // 主纵路：从南北两侧延伸进村庄，形成更长的穿村道路。
  makeCurvedPath(scene, [
    [2.4, -86], [2.0, -66], [1.2, -46], [1.5, -20], [0.6, -12],
    [-0.8, -4], [0.4, 4], [-0.6, 12], [-0.3, 20], [-1.4, 40],
    [-2.8, 62], [-4.5, 84],
  ], 2.0, roadMaterial, 0.11)
  // 东南支路：连接外缘空地。
  makeCurvedPath(scene, [[10, 0], [12, -4], [14, -9], [20, -16], [30, -25], [43, -35], [58, -43]], 1.55, roadMaterial, 0.108)
  // 东北支路：让村庄东侧不再只有城堡方向一条短路。
  makeCurvedPath(scene, [[8, 5], [18, 12], [30, 20], [44, 29], [60, 36]], 1.45, roadMaterial, 0.108)
  // 通往峡谷的西侧岔路。
  makeCurvedPath(scene, [[-18, 0.8], [-26, -1.8], [-34, -5.0], [CANYON.startX + 3, CANYON.centerZ]], 1.55, roadMaterial, 0.112)
  // 西北支路。
  makeCurvedPath(scene, [[-10, 0], [-14, 6], [-20, 13], [-30, 22], [-44, 31], [-60, 39]], 1.45, roadMaterial, 0.108)
  // 西南支路。
  makeCurvedPath(scene, [[0, 10], [-7, 15], [-16, 21], [-28, 29], [-42, 37], [-56, 47]], 1.45, roadMaterial, 0.108)
  buildCanyon(scene, collidables)
  makeCurvedCliff(scene, createRockeryMaterial({ dark: true }))
  addCurvedCliffColliders(collidables)
  loadOldChurchRuins(scene, collidables, onStaticModelReady)
  loadForestGrove(scene, collidables)
  makeGrass(scene, collectOldChurchGrass(), {
    name: 'old_church_wind_grass',
    color: 0x817a57,
    palette: [0x4a5138, 0x5f5d3f, 0x756d49, 0x8a7b55, 0x3f4b34],
    windStrength: 0.052,
    flutterStrength: 0.015,
    heightBoost: 0.3,
    bendStrength: 0.08,
  })

  // ── 树木 ─────────────────────────────────────────
  // 仅预加载 GLB 模板，供编辑器/地图文件使用；不再硬编码任何树木位置
  cloneGLTFScene('/models/trees/custom_tree.glb').then((model) => {
    _treeGltfScene = model
    _pendingTreeClones.forEach(({ group, scale }) => {
      const mesh = _treeGltfScene.clone()
      mesh.scale.setScalar(scale * TREE_MODEL_SCALE)
      mesh.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = false } })
      group.add(mesh)
    })
    _pendingTreeClones.length = 0
  }).catch((error) => {
    console.warn('Tree template preload failed', error)
  })


  // ── 岩石 GLB（仅加载模板）─────────────────────────────
  cloneGLTFScene('/models/rocks/namaqualand_boulder_03/namaqualand_boulder_03_1k.gltf').then((model) => {
    _rockGltfScene = model
    // 消费编辑器的个别克隆请求
    _pendingRockClones.forEach(({ group, scale }) => {
      const mesh = _rockGltfScene.clone(true)
      mesh.scale.setScalar(scale)
      mesh.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true } })
      group.add(mesh)
    })
    _pendingRockClones.length = 0
    // 消费游戏启动时的 InstancedMesh 请求
    if (_pendingRockInstances) {
      _buildRockInstancedMesh(_pendingRockInstances.scene, _pendingRockInstances.rocks)
      _pendingRockInstances = null
    }
  }).catch((error) => {
    console.warn('Rock template preload failed', error)
  })

  // 房屋/岩石/树木/火堆碰撞在 main.js 从地图文件动态添加

  // ── 风动画 + 火堆动画更新函数 ─────────
  let _lastTime = 0
  function update(time) {
    const dt = Math.min(time - _lastTime, 0.05)
    _lastTime = time
    updateGrassWind(time)

    for (const { flames, light, glow, phase, group } of _campfireStates) {
      if (!group.parent) continue   // 已从场景移除，跳过
      const f = Math.sin(time * 7.3  + phase) * 0.22
              + Math.sin(time * 13.1 + phase * 1.7) * 0.10
              + Math.sin(time * 19.7 + phase * 0.9) * 0.05

      light.intensity = 4.0 + f * 3.0
      light.color.setHSL(0.065 + f * 0.015, 1.0, 0.55)
      glow.intensity = 1.5 + f * 1.0

      flames.forEach((mesh, i) => {
        const fi = Math.sin(time * (8 + i * 2.3) + phase + i) * 0.14
                 + Math.sin(time * (5 + i * 1.7) + phase)     * 0.08
        mesh.scale.x = 1.0 + fi
        mesh.scale.z = 1.0 - fi * 0.6
        mesh.scale.y = 0.9 + Math.abs(fi) * 0.4
        mesh.position.y = mesh.userData.baseY + Math.sin(time * 6 + phase + i) * 0.04
        mesh.rotation.y = time * (0.8 + i * 0.3) + phase
      })
    }

  }

  return { collidables, update, ponds: [], spawnRipple: () => {}, getTerrainHeight: getGroundHeight }
}
