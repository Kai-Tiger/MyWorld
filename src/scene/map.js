import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { WORLD_SIZE, OUTDOOR_MOUNTAIN_BOUNDS, MOUNTAIN_FALL_FLOOR_Y, CANYON } from '../config/world.js'
import { createHeightmapTerrain } from './heightmapTerrain.js'
import { CASTLE_EXTERIOR } from '../config/castle.js'
import oldChurchRuinsUrl from '../place/old_church_ruins_medium.glb?url'
import { cloneGLTFScene, loadGLTF } from '../systems/modelAssets.js'
import oldChurchRuinsColliders from '../place/old_church_ruins_colliders.json'


// ── 工具函数 ──────────────────────────────────────────
const CURVE_UV_TILE_METERS = 3.6
const ROCKERY_TEXTURE_VERSION = 'v=1'
const ROCKERY_TEXTURE_BASE = '/models/rocks/namaqualand_boulder_03/textures'
const OLD_CHURCH_RUINS_PLACEMENT = { x: -13, z: 35, rotY: 0 }
const OLD_CHURCH_RUINS_Y_OFFSET = -1.38
const FOREST_GROVE_ORIGIN = { x: 5, z: -49 }
const FOREST_SECOND_GROVE_ORIGIN = { x: 47, z: -57 }
const FOREST_THIRD_GROVE_ORIGIN = { x: 27, z: -34 }
const FOREST_LINE_GROVE_ORIGIN = { x: 30, z: -70 }
const FOREST_NORTH_GROVE_ORIGIN = { x: 35, z: 45 }
const FOREST_LINE_GROVE_LENGTH = 8
const FOREST_GROVE_CASTLE_TARGET = CASTLE_EXTERIOR.transitionTarget
const FOREST_GROVE_ASSETS_BASE = '/models/forest_pack'
const FOREST_GROVE_COLLIDER_MIN_Y = -0.5
const FOREST_GROVE_COLLIDER_MAX_Y = 9
const MINE_CAVE_MODEL_URL = '/models/mine_cave/mine_cave.glb'
const MINE_CAVE_COLLIDER_MANIFEST_URL = '/models/mine_cave/mine_cave_colliders.json'
const OUTDOOR_LANDMARK_MODEL_URL = '/models/outdoor_landmarks/outdoor_landmarks.glb'
const OUTDOOR_LANDMARK_MANIFEST_URL = '/models/outdoor_landmarks/outdoor-landmarks-manifest.json'
const SPAWN_GRASS_MODEL_VARIANTS = [
  { name: 'dark', url: '/models/grass/grass_clump_low.glb' },
  { name: 'fresh', url: '/models/grass/grass_clump_fresh.glb' },
  { name: 'dry', url: '/models/grass/grass_clump_dry.glb' },
]
const SPAWN_GRASS_60_REF_MODEL_URL = '/models/grass/grass_clump_60_ref.glb'
const SPAWN_GRASS_60_REF_PLACEMENT = { x: 2.5, z: 42, rotY: 0.35, scale: 1.15 }
const DISTANT_GRASS_CARD_TEXTURE_URL = '/textures/generated/model_grass_card.png'
const GROUND_LEAF_TEXTURES = ['/textures/leaf1.png', '/textures/leaf2.png']
const TERRAIN_CHUNK_SIZE = 128
const TERRAIN_CHUNK_SEGMENTS = 56
const TERRAIN_ACTIVE_RADIUS = 2
const TERRAIN_PRELOAD_RADIUS = 3
const TERRAIN_DISTANT_PROXY_SEGMENTS = 8
const TERRAIN_DISTANT_PROXY_Y_OFFSET = -0.08
const GROUND_INDIVIDUAL_LEAF_Y_OFFSET = 0.075
const GROUND_DEBRIS_MAX_GROUND_Y = 7.5
const GROUND_DEBRIS_CLEAR_PADDING = 3.2
const GROUND_LEAVES_PER_TREE = 30
const GROUND_TREE_LEAF_RADIUS_MIN = 1.1
const GROUND_TREE_LEAF_RADIUS_MAX = 3.8
const LOCAL_MODEL_GRASS_PILE_AREA = 5
const LOCAL_MODEL_GRASS_PER_PILE = 30
const LOCAL_MODEL_GRASS_PILE_RADIUS = Math.sqrt(LOCAL_MODEL_GRASS_PILE_AREA / Math.PI)
const LOCAL_MODEL_GRASS_PILES = [
  { x: FOREST_GROVE_ORIGIN.x - 6.5, z: FOREST_GROVE_ORIGIN.z - 5.0, seed: 6100 },
  { x: FOREST_GROVE_ORIGIN.x + 3.0, z: FOREST_GROVE_ORIGIN.z - 8.0, seed: 6200 },
  { x: FOREST_GROVE_ORIGIN.x + 8.0, z: FOREST_GROVE_ORIGIN.z + 3.5, seed: 6300 },
  { x: FOREST_SECOND_GROVE_ORIGIN.x - 5.0, z: FOREST_SECOND_GROVE_ORIGIN.z + 4.0, seed: 7100 },
  { x: FOREST_SECOND_GROVE_ORIGIN.x + 6.0, z: FOREST_SECOND_GROVE_ORIGIN.z - 3.5, seed: 7200 },
  { x: FOREST_THIRD_GROVE_ORIGIN.x - 4.5, z: FOREST_THIRD_GROVE_ORIGIN.z - 4.5, seed: 8100 },
  { x: FOREST_THIRD_GROVE_ORIGIN.x + 5.5, z: FOREST_THIRD_GROVE_ORIGIN.z + 5.0, seed: 8200 },
  { x: FOREST_LINE_GROVE_ORIGIN.x, z: FOREST_LINE_GROVE_ORIGIN.z, seed: 9100 },
  { x: FOREST_NORTH_GROVE_ORIGIN.x - 9.0, z: FOREST_NORTH_GROVE_ORIGIN.z - 6.0, seed: 10100 },
  { x: FOREST_NORTH_GROVE_ORIGIN.x + 4.0, z: FOREST_NORTH_GROVE_ORIGIN.z - 9.0, seed: 10200 },
  { x: FOREST_NORTH_GROVE_ORIGIN.x + 9.0, z: FOREST_NORTH_GROVE_ORIGIN.z + 6.0, seed: 10300 },
  { x: OLD_CHURCH_RUINS_PLACEMENT.x - 10.0, z: OLD_CHURCH_RUINS_PLACEMENT.z - 6.0, seed: 11100 },
  { x: OLD_CHURCH_RUINS_PLACEMENT.x + 9.0, z: OLD_CHURCH_RUINS_PLACEMENT.z - 5.5, seed: 11200 },
  { x: OLD_CHURCH_RUINS_PLACEMENT.x + 1.0, z: OLD_CHURCH_RUINS_PLACEMENT.z + 11.0, seed: 11300 },
]
const LOCAL_MODEL_GRASS_Y_OFFSET = -0.06
const LOCAL_MODEL_GRASS_SPACING = 0.28
const LOCAL_MODEL_GRASS_JITTER = 0.30
const LOCAL_MODEL_GRASS_SHAPE_SEGMENTS = 10
const GRASS_FIELD_BOUNDS = OUTDOOR_MOUNTAIN_BOUNDS
const DISTANT_GRASS_BOUNDS = {
  minX: -WORLD_SIZE * 0.5,
  maxX: WORLD_SIZE * 0.5,
  minZ: -WORLD_SIZE * 0.5,
  maxZ: WORLD_SIZE * 0.5,
}
const DISTANT_GRASS_PATCH_COUNT = 360000
const DISTANT_GRASS_PLANES_PER_PATCH = 2
const DISTANT_GRASS_MAX_GROUND_Y = 7.5
const DISTANT_GRASS_CELL_SIZE = 24
const DISTANT_GRASS_CULL_PADDING = 4
const DISTANT_GRASS_GRID_JITTER = 0.20
const GRASS_CAMPFIRE_CLEAR_RADIUS = 4.5
const MODEL_GRASS_FOOTPRINT_PADDING = 2.5
const GRASS_CARD_CLEAR_PADDING = 2.5
const MINE_CAVE_MODEL_GRASS_PADDING = 4
const MINE_CAVE_CARD_GRASS_PADDING = 4
const GRASS_CAMPFIRE_CLEARINGS = [
  { x: 0, z: 50 },
  { x: 19, z: -66 },
  { x: -18, z: -2 },
  { x: 22, z: 22 },
]
const DISTANT_GRASS_Y_OFFSET = 0.03
const RANDOM_FOREST_TREE_COUNT = 120
const RANDOM_FOREST_BOUNDS = { minX: -118, maxX: 112, minZ: -92, maxZ: 86 }
const RANDOM_FOREST_TREE_MIN_SPACING = 7.5
const RANDOM_FOREST_SPAWN_CLEAR_RADIUS = 16
const RANDOM_FOREST_CAMPFIRE_CLEAR_RADIUS = 7.5
const RANDOM_FOREST_OLD_CHURCH_CLEAR_RADIUS = 15
const RANDOM_FOREST_CASTLE_APPROACH_CLEARING = { x: 64, z: -5, hx: 25, hz: 22 }
const RANDOM_FOREST_CASTLE_ENTRANCE_CLEAR_RADIUS = 20
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
const CANYON_FOREST_REPLACEMENT = { minX: -120, maxX: -40, origin: { x: 0, z: 0 } }
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
const CASTLE_NORTH_HIGHLAND = {
  x: 58,
  z: 28,
  rx: 25.5,
  rz: 18.5,
  height: 5.25,
  top: 0.55,
  edge: 1.12,
  rampStart: { x: 42, z: 11 },
  rampEnd: { x: 50, z: 20 },
  rampHalfWidth: 4.8,
}
const CASTLE_NORTH_HIGHLAND_PLACEMENTS = [
  { file: 'tree_01.glb', dx: 51.0, dz: 38.0, rotY: 0.6, scale: 0.46, r: 0.86 },
  { file: 'tree_02.glb', dx: 52.0, dz: 34.0, rotY: 2.1, scale: 0.52, r: 0.78 },
  { file: 'tree_04.glb', dx: 63.0, dz: 27.5, rotY: 4.4, scale: 0.82, r: 0.86 },
  { file: 'background_tree_09.glb', dx: 47.0, dz: 24.5, rotY: 1.2, scale: 0.76 },
  { file: 'background_tree_11.glb', dx: 58.0, dz: 31.0, rotY: 3.8, scale: 0.92 },
  { file: 'background_tree_13.glb', dx: 61.0, dz: 21.0, rotY: 5.2, scale: 0.70 },
  { file: 'tree_01.glb', dx: 70.0, dz: 32.0, rotY: 2.9, scale: 0.44, r: 0.84 },
  { file: 'background_tree_10.glb', dx: 67.0, dz: 19.0, rotY: 0.9, scale: 0.72 },
  { file: 'background_tree_12.glb', dx: 58.0, dz: 40.0, rotY: 4.7, scale: 0.82 },
  { file: 'rock_02.glb', dx: 45.0, dz: 18.5, rotY: 0.4, scale: 1.18, r: 0.70 },
  { file: 'rock_03.glb', dx: 49.0, dz: 31.0, rotY: 2.7, scale: 1.12, r: 0.62 },
  { file: 'rock_05.glb', dx: 57.5, dz: 18.0, rotY: 4.1, scale: 1.28, r: 0.58 },
  { file: 'rock_07.glb', dx: 64.0, dz: 33.0, rotY: 1.7, scale: 1.05, r: 0.55 },
  { file: 'rock_02.glb', dx: 68.0, dz: 36.0, rotY: 5.0, scale: 1.12, r: 0.70 },
  { file: 'rock_05.glb', dx: 75.0, dz: 29.0, rotY: 0.8, scale: 1.20, r: 0.58 },
  { file: 'rock_07.glb', dx: 60.0, dz: 15.0, rotY: 2.4, scale: 1.00, r: 0.55 },
]
export const MINE_CAVE = {
  x: 36,
  z: 35,
  clearingRadius: 8,
  cavernX: 36,
  cavernZ: 8,
  bottomY: -12,
  shaftRadius: 2.4,
  shaftHoleRadius: 2.15,
  shaftBlockerRadius: 2.2,
  shaftBlockerMinY: -1.5,
  shaftBlockerMaxY: 8,
  ladderVisualZ: 1.78,
  ladderPlayerOffsetX: 1, // 越大越往左
  ladderPlayerOffsetZ: -0.1, // 越小越远离梯子
  ladderTopY: -1.85,
  ladderBottomY: -12,
  climbDuration: 4.2,
  surfaceInteractRange: 3.2,
  bottomInteractRange: 2.8,
  bottomExitX: 36,
  bottomExitZ: 36.05,
  bottomExitHalfWidth: 1.35,
  bottomExitHalfDepth: 1.25,
  surfaceExitX: 36,
  surfaceExitZ: 38.2,
  tunnelZ: 25.75,
  tunnelHalfWidth: 2.25,
  tunnelHalfDepth: 9.4,
  connectorZ: 33.45,
  connectorHalfWidth: 1.75,
  connectorHalfDepth: 1.7,
  connectorWallHalfThickness: 0.2,
  cavernHalfWidth: 6.5,
  cavernHalfDepth: 9.0,
  wallHalfThickness: 0.35,
  undergroundWallTopY: -7.5,
}
const HERO_RIVER_POINTS = [
  { x: -575, z: 560 },
  { x: -470, z: 455 },
  { x: -360, z: 335 },
  { x: -305, z: 210 },
  { x: -332, z: 96 },
  { x: -274, z: 8 },
  { x: -160, z: -52 },
  { x: -42, z: -72 },
  { x: 92, z: -64 },
  { x: 230, z: -86 },
  { x: 420, z: -150 },
  { x: 650, z: -230 },
]
const CENTER_WEST_STREAM_POINTS = [
  { x: -340, z: -44 },
  { x: -310, z: -30 },
  { x: -282, z: -8 },
  { x: -258, z: 2 },
  { x: -226, z: 18 },
  { x: -194, z: 46 },
]
const RIVER_BRANCHES = [
  {
    id: 'north_creek',
    points: [
      { x: -430, z: 250 },
      { x: -382, z: 174 },
      { x: -332, z: 96 },
    ],
    halfWidthStart: 1.35,
    halfWidthEnd: 2.85,
    sourceLift: 5.8,
  },
  {
    id: 'southwest_creek',
    points: [
      { x: -390, z: -94 },
      { x: -330, z: -42 },
      { x: -274, z: 8 },
    ],
    halfWidthStart: 1.2,
    halfWidthEnd: 2.65,
    sourceLift: 2.8,
  },
  {
    id: 'central_side_channel',
    points: [
      { x: -160, z: -52 },
      { x: -88, z: -116 },
      { x: 18, z: -122 },
      { x: 92, z: -64 },
    ],
    halfWidthStart: 2.3,
    halfWidthEnd: 3.2,
    sourceLift: 0,
    sideChannel: true,
  },
  {
    id: 'east_creek',
    points: [
      { x: 320, z: 54 },
      { x: 270, z: -8 },
      { x: 230, z: -86 },
    ],
    halfWidthStart: 1.35,
    halfWidthEnd: 2.75,
    sourceLift: 3.2,
  },
  {
    id: 'northwest_rill',
    points: [
      { x: -260, z: 210 },
      { x: -218, z: 150 },
      { x: -171, z: 100 },
      { x: -274, z: 8 },
    ],
    halfWidthStart: 1.0,
    halfWidthEnd: 2.2,
    sourceLift: 4.2,
  },
  {
    id: 'central_north_rill',
    points: [
      { x: -90, z: 170 },
      { x: -128, z: 112 },
      { x: -160, z: 40 },
      { x: -160, z: -52 },
    ],
    halfWidthStart: 1.05,
    halfWidthEnd: 2.35,
    sourceLift: 3.5,
  },
  {
    id: 'west_slope_rill',
    points: [
      { x: -520, z: 70 },
      { x: -430, z: 20 },
      { x: -330, z: -42 },
    ],
    halfWidthStart: 0.95,
    halfWidthEnd: 2.0,
    sourceLift: 2.8,
    mouthBranchId: 'southwest_creek',
  },
  {
    id: 'south_braid_rill',
    points: [
      { x: -240, z: -210 },
      { x: -170, z: -150 },
      { x: -88, z: -116 },
    ],
    halfWidthStart: 0.95,
    halfWidthEnd: 1.9,
    sourceLift: 2.4,
    mouthBranchId: 'central_side_channel',
  },
  {
    id: 'east_upper_rill',
    points: [
      { x: 170, z: 155 },
      { x: 220, z: 70 },
      { x: 270, z: -8 },
    ],
    halfWidthStart: 1.0,
    halfWidthEnd: 2.1,
    sourceLift: 2.6,
    mouthBranchId: 'east_creek',
  },
  {
    id: 'east_lower_rill',
    points: [
      { x: 420, z: -20 },
      { x: 340, z: -70 },
      { x: 230, z: -86 },
    ],
    halfWidthStart: 1.1,
    halfWidthEnd: 2.25,
    sourceLift: 2.4,
  },
]
const EROSION_GULLIES = [
  { id: 'nw_terrace', wet: true, width: 4.2, influence: 34, depth: 2.8, points: [{ x: -250, z: 180 }, { x: -220, z: 138 }, { x: -171, z: 100 }, { x: -128, z: 70 }] },
  { id: 'west_ridge', wet: false, width: 5.0, influence: 38, depth: 3.2, points: [{ x: -330, z: 155 }, { x: -260, z: 116 }, { x: -205, z: 82 }, { x: -160, z: 40 }] },
  { id: 'central_fan', wet: false, width: 4.8, influence: 36, depth: 2.9, points: [{ x: -50, z: 155 }, { x: -82, z: 110 }, { x: -128, z: 75 }, { x: -160, z: 40 }] },
  { id: 'center_left', wet: true, width: 3.8, influence: 30, depth: 2.4, points: [{ x: -210, z: 60 }, { x: -180, z: 20 }, { x: -160, z: -52 }] },
  { id: 'center_right', wet: false, width: 4.4, influence: 34, depth: 2.7, points: [{ x: -22, z: 132 }, { x: -30, z: 70 }, { x: -42, z: -72 }] },
  { id: 'east_north', wet: true, width: 4.2, influence: 32, depth: 2.5, points: [{ x: 80, z: 150 }, { x: 145, z: 84 }, { x: 220, z: 70 }] },
  { id: 'east_mid', wet: false, width: 5.2, influence: 40, depth: 3.1, points: [{ x: 20, z: 120 }, { x: 78, z: 55 }, { x: 92, z: -64 }] },
  { id: 'east_slope', wet: false, width: 4.4, influence: 34, depth: 2.8, points: [{ x: 190, z: 120 }, { x: 240, z: 45 }, { x: 270, z: -8 }] },
  { id: 'southwest_furrow', wet: false, width: 4.6, influence: 36, depth: 2.9, points: [{ x: -300, z: -180 }, { x: -230, z: -130 }, { x: -170, z: -150 }] },
  { id: 'south_channel', wet: true, width: 3.8, influence: 30, depth: 2.5, points: [{ x: -80, z: -210 }, { x: -88, z: -116 }] },
  { id: 'far_west', wet: false, width: 5.4, influence: 42, depth: 3.4, points: [{ x: -520, z: 150 }, { x: -440, z: 90 }, { x: -430, z: 20 }] },
  { id: 'old_center', wet: true, width: 3.6, influence: 30, depth: 2.2, points: [{ x: -235, z: 140 }, { x: -171, z: 100 }, { x: -160, z: 40 }] },
]
let _mineCaveUndergroundZones = []
const FOREST_GROVE_PLACEMENTS = createForestGrovePlacements()
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

function localGrassShapeRadiusAt(patch, angle) {
  const tau = Math.PI * 2
  const normalized = ((angle % tau) + tau) % tau
  const segmentT = normalized / tau * LOCAL_MODEL_GRASS_SHAPE_SEGMENTS
  const segment = Math.floor(segmentT)
  const nextSegment = (segment + 1) % LOCAL_MODEL_GRASS_SHAPE_SEGMENTS
  const t = segmentT - segment
  const smoothT = t * t * (3 - 2 * t)
  const radiusA = LOCAL_MODEL_GRASS_PILE_RADIUS * THREE.MathUtils.lerp(0.86, 1.10, forestPlacementNoise(patch.seed + segment * 53 + 17))
  const radiusB = LOCAL_MODEL_GRASS_PILE_RADIUS * THREE.MathUtils.lerp(0.86, 1.10, forestPlacementNoise(patch.seed + nextSegment * 53 + 17))
  return THREE.MathUtils.lerp(radiusA, radiusB, smoothT)
}

function isInsideLocalGrassPatchShape(patch, dx, dz) {
  const distance = Math.hypot(dx, dz)
  if (distance < (patch.minRadius ?? 0)) return false
  return distance <= localGrassShapeRadiusAt(patch, Math.atan2(dz, dx))
}

function localGrassPatchEdgeScale(patch, dx, dz) {
  const distance = Math.hypot(dx, dz)
  const minRadius = patch.minRadius ?? 0
  const outerRadius = localGrassShapeRadiusAt(patch, Math.atan2(dz, dx))
  const span = Math.max(0.001, outerRadius - minRadius)
  const outerEdgeT = THREE.MathUtils.smoothstep(distance, minRadius + span * 0.68, outerRadius)
  const innerEdgeT = minRadius > 0
    ? 1 - THREE.MathUtils.smoothstep(distance, minRadius, minRadius + Math.min(span * 0.3, 3.5))
    : 0
  return THREE.MathUtils.lerp(1, 0.45, Math.max(outerEdgeT, innerEdgeT))
}

function spawnGrassVariantIndex(seed) {
  const t = forestPlacementNoise(seed + 10)
  if (t < 0.5) return 0
  if (t < 0.75) return 1
  return 2
}

function createSpawnGrassPlacements() {
  const placements = []

  function addPlacement(seed, x, z, edgeScale) {
    if (
      x < GRASS_FIELD_BOUNDS.minX || x > GRASS_FIELD_BOUNDS.maxX
      || z < GRASS_FIELD_BOUNDS.minZ || z > GRASS_FIELD_BOUNDS.maxZ
    ) return
    if (shouldSkipModelGrassPlacement(x, z)) return
    placements.push({
      x: Number(x.toFixed(2)),
      z: Number(z.toFixed(2)),
      rotY: Number((forestPlacementNoise(seed + 3) * Math.PI * 2).toFixed(3)),
      scaleX: Number(THREE.MathUtils.lerp(0.75, 1.35, forestPlacementNoise(seed + 4)).toFixed(3)),
      scaleY: Number(THREE.MathUtils.lerp(0.75, 1.25, forestPlacementNoise(seed + 5)).toFixed(3)),
      scaleZ: Number(THREE.MathUtils.lerp(0.75, 1.35, forestPlacementNoise(seed + 6)).toFixed(3)),
      edgeScale: Number(edgeScale.toFixed(3)),
      tiltX: Number(THREE.MathUtils.lerp(-0.16, 0.16, forestPlacementNoise(seed + 7)).toFixed(3)),
      tiltZ: Number(THREE.MathUtils.lerp(-0.16, 0.16, forestPlacementNoise(seed + 8)).toFixed(3)),
      variantIndex: spawnGrassVariantIndex(seed),
    })
  }

  LOCAL_MODEL_GRASS_PILES.forEach((patch) => {
    const candidates = []
    const boundsRadius = LOCAL_MODEL_GRASS_PILE_RADIUS * 1.15
    const startGridX = Math.floor((patch.x - boundsRadius) / LOCAL_MODEL_GRASS_SPACING)
    const endGridX = Math.ceil((patch.x + boundsRadius) / LOCAL_MODEL_GRASS_SPACING)
    const startGridZ = Math.floor((patch.z - boundsRadius) / LOCAL_MODEL_GRASS_SPACING)
    const endGridZ = Math.ceil((patch.z + boundsRadius) / LOCAL_MODEL_GRASS_SPACING)
    const jitter = LOCAL_MODEL_GRASS_SPACING * LOCAL_MODEL_GRASS_JITTER

    for (let gridZ = startGridZ; gridZ <= endGridZ; gridZ++) {
      for (let gridX = startGridX; gridX <= endGridX; gridX++) {
        const seed = patch.seed + gridX * 100003 + gridZ * 4099
        const x = (gridX + 0.5) * LOCAL_MODEL_GRASS_SPACING + (forestPlacementNoise(seed + 1) - 0.5) * jitter
        const z = (gridZ + 0.5) * LOCAL_MODEL_GRASS_SPACING + (forestPlacementNoise(seed + 2) - 0.5) * jitter
        const dx = x - patch.x
        const dz = z - patch.z
        if (!isInsideLocalGrassPatchShape(patch, dx, dz)) continue
        candidates.push({
          seed,
          x,
          z,
          edgeScale: localGrassPatchEdgeScale(patch, dx, dz),
          order: forestPlacementNoise(seed + 9),
        })
      }
    }

    candidates.sort((a, b) => a.order - b.order)
    candidates.slice(0, LOCAL_MODEL_GRASS_PER_PILE).forEach(({ seed, x, z, edgeScale }) => {
      addPlacement(seed, x, z, edgeScale)
    })
  })

  return placements
}

function isNearGrassCampfire(x, z, radius = GRASS_CAMPFIRE_CLEAR_RADIUS) {
  const radiusSq = radius * radius
  return GRASS_CAMPFIRE_CLEARINGS.some((fire) => {
    const dx = x - fire.x
    const dz = z - fire.z
    return dx * dx + dz * dz < radiusSq
  })
}

function isInsideMineCaveClearing(x, z, padding = 0) {
  const dx = x - MINE_CAVE.x
  const dz = z - MINE_CAVE.z
  const radius = MINE_CAVE.clearingRadius + padding
  return dx * dx + dz * dz <= radius * radius
}

function shouldSkipModelGrassPlacement(x, z) {
  if (isNearGrassCampfire(x, z, GRASS_CAMPFIRE_CLEAR_RADIUS + MODEL_GRASS_FOOTPRINT_PADDING)) return true
  if (isInsideMineCaveClearing(x, z, MINE_CAVE_MODEL_GRASS_PADDING)) return true
  return getGroundHeight(x, z) > DISTANT_GRASS_MAX_GROUND_Y
}

function shouldSkipDistantGrassPlacement(x, z) {
  if (isNearGrassCampfire(x, z, GRASS_CAMPFIRE_CLEAR_RADIUS + GRASS_CARD_CLEAR_PADDING)) return true
  if (isInsideMineCaveClearing(x, z, MINE_CAVE_CARD_GRASS_PADDING)) return true
  return getGroundHeight(x, z) > DISTANT_GRASS_MAX_GROUND_Y
}

function findFirstMesh(root) {
  let firstMesh = null
  root.traverse((child) => {
    if (!firstMesh && child.isMesh) firstMesh = child
  })
  return firstMesh
}

let _spawnGrassWindUniforms = []
let _spawnGrassInstancedMeshes = []
const _spawnGrassDummy = new THREE.Object3D()

function configureSpawnGrassMaterial(material) {
  material.side = THREE.DoubleSide
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 }
    _spawnGrassWindUniforms.push(shader.uniforms.uTime)
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uTime;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
#ifdef USE_INSTANCING
float grassHeightMask = smoothstep(0.08, 0.82, position.y);
float grassPhase = instanceMatrix[3].x * 1.37 + instanceMatrix[3].z * 2.11;
float grassWave = sin(uTime * 1.25 + grassPhase + position.y * 3.4) * 0.028;
grassWave += sin(uTime * 2.05 + grassPhase * 1.7 + position.y * 5.1) * 0.012;
transformed.x += grassWave * grassHeightMask;
transformed.z += cos(uTime * 1.1 + grassPhase * 1.3 + position.y * 2.8) * 0.018 * grassHeightMask;
#endif`
      )
  }
  material.customProgramCacheKey = () => 'spawn-grass-wind-v1'
  material.needsUpdate = true
  return material
}

function applySpawnGrassPlacements(inst, placements = createSpawnGrassPlacements()) {
  if (!inst) return
  placements.forEach(({ x, z, rotY, scaleX, scaleY, scaleZ, edgeScale, tiltX, tiltZ }, index) => {
    _spawnGrassDummy.position.set(x, getGroundHeight(x, z) + LOCAL_MODEL_GRASS_Y_OFFSET, z)
    _spawnGrassDummy.rotation.set(tiltX, rotY, tiltZ)
    _spawnGrassDummy.scale.set(scaleX * edgeScale, scaleY * edgeScale, scaleZ * edgeScale)
    _spawnGrassDummy.updateMatrix()
    inst.setMatrixAt(index, _spawnGrassDummy.matrix)
  })

  for (let index = placements.length; index < inst.count; index++) {
    _spawnGrassDummy.position.set(0, MOUNTAIN_FALL_FLOOR_Y - 10, 0)
    _spawnGrassDummy.rotation.set(0, 0, 0)
    _spawnGrassDummy.scale.set(0, 0, 0)
    _spawnGrassDummy.updateMatrix()
    inst.setMatrixAt(index, _spawnGrassDummy.matrix)
  }

  inst.instanceMatrix.needsUpdate = true
  inst.computeBoundingBox()
  inst.computeBoundingSphere()
}

function createDistantGrassCardMaterial() {
  const texture = _roadTextureLoader.load(DISTANT_GRASS_CARD_TEXTURE_URL)
  texture.colorSpace = THREE.SRGBColorSpace

  return new THREE.MeshBasicMaterial({
    color: 0xffffff,
    map: texture,
    alphaTest: 0.32,
    depthWrite: true,
    side: THREE.DoubleSide,
  })
}

function setDistantGrassPatchMatrices(inst, patch) {
  for (let plane = 0; plane < DISTANT_GRASS_PLANES_PER_PATCH; plane++) {
    _spawnGrassDummy.position.set(patch.x, patch.y, patch.z)
    _spawnGrassDummy.rotation.set(patch.leanX, patch.baseRotY + plane * Math.PI * 0.5, patch.leanZ)
    _spawnGrassDummy.scale.set(patch.width, patch.height, 1)
    _spawnGrassDummy.updateMatrix()
    inst.setMatrixAt(patch.baseIndex + plane, _spawnGrassDummy.matrix)
  }
}

function buildDistantGrassCards(scene) {
  const geometry = new THREE.PlaneGeometry(1, 1, 1, 3)
  geometry.translate(0, 0.5, 0)
  const material = createDistantGrassCardMaterial()
  const totalArea = (DISTANT_GRASS_BOUNDS.maxX - DISTANT_GRASS_BOUNDS.minX)
    * (DISTANT_GRASS_BOUNDS.maxZ - DISTANT_GRASS_BOUNDS.minZ)
  const patchSpacing = Math.sqrt(totalArea / DISTANT_GRASS_PATCH_COUNT)
  const cols = Math.ceil((DISTANT_GRASS_BOUNDS.maxX - DISTANT_GRASS_BOUNDS.minX) / DISTANT_GRASS_CELL_SIZE)
  const rows = Math.ceil((DISTANT_GRASS_BOUNDS.maxZ - DISTANT_GRASS_BOUNDS.minZ) / DISTANT_GRASS_CELL_SIZE)

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const minX = DISTANT_GRASS_BOUNDS.minX + col * DISTANT_GRASS_CELL_SIZE
      const minZ = DISTANT_GRASS_BOUNDS.minZ + row * DISTANT_GRASS_CELL_SIZE
      const maxX = Math.min(minX + DISTANT_GRASS_CELL_SIZE, DISTANT_GRASS_BOUNDS.maxX)
      const maxZ = Math.min(minZ + DISTANT_GRASS_CELL_SIZE, DISTANT_GRASS_BOUNDS.maxZ)
      const startGridX = Math.floor(minX / patchSpacing)
      const endGridX = Math.ceil(maxX / patchSpacing) - 1
      const startGridZ = Math.floor(minZ / patchSpacing)
      const endGridZ = Math.ceil(maxZ / patchSpacing) - 1
      const candidateCount = Math.max(1, (endGridX - startGridX + 1) * (endGridZ - startGridZ + 1))
      const count = candidateCount * DISTANT_GRASS_PLANES_PER_PATCH
      const inst = new THREE.InstancedMesh(geometry, material, count)
      inst.name = `distant_grass_card_cell_${col}_${row}`
      inst.castShadow = false
      inst.receiveShadow = false
      inst.frustumCulled = true

      let instanceIndex = 0
      const jitter = patchSpacing * DISTANT_GRASS_GRID_JITTER
      for (let gridZ = startGridZ; gridZ <= endGridZ; gridZ++) {
        for (let gridX = startGridX; gridX <= endGridX && instanceIndex < count; gridX++) {
          const seed = 71000 + gridX * 100003 + gridZ * 4099
          const x = (gridX + 0.5) * patchSpacing + (forestPlacementNoise(seed + 1) - 0.5) * jitter
          const z = (gridZ + 0.5) * patchSpacing + (forestPlacementNoise(seed + 2) - 0.5) * jitter
          if (
            x < DISTANT_GRASS_BOUNDS.minX || x > DISTANT_GRASS_BOUNDS.maxX
            || z < DISTANT_GRASS_BOUNDS.minZ || z > DISTANT_GRASS_BOUNDS.maxZ
          ) continue
          if (shouldSkipDistantGrassPlacement(x, z)) continue

          const groundY = getGroundHeight(x, z)

          const y = groundY + DISTANT_GRASS_Y_OFFSET
          const baseRotY = forestPlacementNoise(seed + 3) * Math.PI * 2
          const width = THREE.MathUtils.lerp(0.72, 1.10, forestPlacementNoise(seed + 4))
          const height = THREE.MathUtils.lerp(0.62, 1.05, forestPlacementNoise(seed + 5))
          const leanX = THREE.MathUtils.lerp(-0.08, 0.08, forestPlacementNoise(seed + 6))
          const leanZ = THREE.MathUtils.lerp(-0.08, 0.08, forestPlacementNoise(seed + 7))
          const patch = {
            x,
            y,
            z,
            baseRotY,
            width,
            height,
            leanX,
            leanZ,
            baseIndex: instanceIndex,
          }

          setDistantGrassPatchMatrices(inst, patch)
          instanceIndex += DISTANT_GRASS_PLANES_PER_PATCH
        }
      }

      if (instanceIndex === 0) continue

      for (; instanceIndex < count; instanceIndex++) {
        _spawnGrassDummy.position.set(0, MOUNTAIN_FALL_FLOOR_Y - 10, 0)
        _spawnGrassDummy.rotation.set(0, 0, 0)
        _spawnGrassDummy.scale.set(0, 0, 0)
        _spawnGrassDummy.updateMatrix()
        inst.setMatrixAt(instanceIndex, _spawnGrassDummy.matrix)
      }

      inst.instanceMatrix.needsUpdate = true
      inst.computeBoundingBox()
      inst.computeBoundingSphere()
      if (inst.boundingSphere) inst.boundingSphere.radius += DISTANT_GRASS_CULL_PADDING
      scene.add(inst)
    }
  }
}

function isInsideCastleApproachClearing(x, z) {
  return x >= -8 && x <= 58 && z >= -26 && z <= 24
}

function shouldSkipGroundDebrisPlacement(x, z) {
  if (!isInsideOutdoorMountainBounds(x, z, 0)) return true
  if (getGroundHeight(x, z) > GROUND_DEBRIS_MAX_GROUND_Y) return true
  if (isNearGrassCampfire(x, z, GRASS_CAMPFIRE_CLEAR_RADIUS + GROUND_DEBRIS_CLEAR_PADDING)) return true
  if (isInsideMineCaveClearing(x, z, MINE_CAVE_CARD_GRASS_PADDING + GROUND_DEBRIS_CLEAR_PADDING)) return true
  if (isInsideCastleApproachClearing(x, z)) return true
  if (x >= CANYON.endX && x <= CANYON.startX + 8) {
    const dz = z - canyonCenterZ(x)
    if (Math.abs(dz) <= CANYON.walkHalfWidth + 4.5) return true
  }
  return false
}

function createIndividualLeafMaterial(textureUrl) {
  const texture = _roadTextureLoader.load(textureUrl)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8

  return new THREE.MeshBasicMaterial({
    color: 0xffffff,
    map: texture,
    transparent: true,
    alphaTest: 0.18,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
}

function createTreeLeafPlacements() {
  const placementsByTexture = GROUND_LEAF_TEXTURES.map(() => [])
  const trees = FOREST_GROVE_PLACEMENTS.filter(placement => placement.file?.startsWith('tree_'))

  trees.forEach((tree, treeIndex) => {
    const origin = getForestPlacementOrigin(tree)
    const treeX = origin.x + tree.dx
    const treeZ = origin.z + tree.dz
    const scatterRadius = THREE.MathUtils.clamp(
      (tree.r ?? tree.scale ?? 1) * 3.2,
      GROUND_TREE_LEAF_RADIUS_MIN,
      GROUND_TREE_LEAF_RADIUS_MAX,
    )

    for (let leafIndex = 0; leafIndex < GROUND_LEAVES_PER_TREE; leafIndex++) {
      const seed = 61000 + treeIndex * 397 + leafIndex * 29
      const textureIndex = Math.floor(forestPlacementNoise(seed + 1) * GROUND_LEAF_TEXTURES.length) % GROUND_LEAF_TEXTURES.length
      const angle = forestPlacementNoise(seed + 2) * Math.PI * 2
      const radius = THREE.MathUtils.lerp(scatterRadius * 0.18, scatterRadius, Math.sqrt(forestPlacementNoise(seed + 3)))
      const x = treeX + Math.cos(angle) * radius
      const z = treeZ + Math.sin(angle) * radius
      if (shouldSkipGroundDebrisPlacement(x, z)) continue

      const longScale = THREE.MathUtils.lerp(0.30, 0.64, forestPlacementNoise(seed + 4))
      const aspect = textureIndex === 0 ? 0.48 : 0.66
      placementsByTexture[textureIndex].push({
        x,
        z,
        y: getGroundHeight(x, z) + GROUND_INDIVIDUAL_LEAF_Y_OFFSET,
        rotY: forestPlacementNoise(seed + 5) * Math.PI * 2,
        width: longScale * aspect * THREE.MathUtils.lerp(0.82, 1.18, forestPlacementNoise(seed + 6)),
        depth: longScale,
      })
    }
  })

  return placementsByTexture
}

function buildIndividualLeafLayer(scene) {
  const geometry = new THREE.PlaneGeometry(1, 1, 1, 1)
  geometry.rotateX(-Math.PI / 2)
  const placementsByTexture = createTreeLeafPlacements()

  GROUND_LEAF_TEXTURES.forEach((textureUrl, textureIndex) => {
    const placements = placementsByTexture[textureIndex]
    if (placements.length === 0) return

    const inst = new THREE.InstancedMesh(geometry, createIndividualLeafMaterial(textureUrl), placements.length)
    inst.name = `ground_individual_leaf_${textureIndex + 1}`
    inst.castShadow = false
    inst.receiveShadow = false
    inst.frustumCulled = true

    placements.forEach((placement, index) => {
      _spawnGrassDummy.position.set(placement.x, placement.y, placement.z)
      _spawnGrassDummy.rotation.set(0, placement.rotY, 0)
      _spawnGrassDummy.scale.set(placement.width, 1, placement.depth)
      _spawnGrassDummy.updateMatrix()
      inst.setMatrixAt(index, _spawnGrassDummy.matrix)
    })

    inst.instanceMatrix.needsUpdate = true
    inst.computeBoundingBox()
    inst.computeBoundingSphere()
    scene.add(inst)
  })
}

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

function isInsideOutdoorMountainBounds(x, z, padding = 0) {
  return x >= OUTDOOR_MOUNTAIN_BOUNDS.minX - padding
    && x <= OUTDOOR_MOUNTAIN_BOUNDS.maxX + padding
    && z >= OUTDOOR_MOUNTAIN_BOUNDS.minZ - padding
    && z <= OUTDOOR_MOUNTAIN_BOUNDS.maxZ + padding
}

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

function isInCanyonForestReplacementRange(x) {
  return x >= CANYON_FOREST_REPLACEMENT.minX && x <= CANYON_FOREST_REPLACEMENT.maxX
}

function createCanyonForestReplacementPlacementsForTypes(types, count, {
  minSide,
  maxSide,
  forwardJitter = 2.2,
  sideJitter = 1.8,
  angleOffset = 0,
  scaleJitter = 0.12,
  colliderScale = 1,
  seedOffset = 0,
} = {}) {
  const placements = []
  for (let i = 0; i < count; i++) {
    const type = types[i % types.length]
    const t = count === 1 ? 0.5 : i / (count - 1)
    const side = i % 2 === 0 ? -1 : 1
    const x = THREE.MathUtils.lerp(CANYON_FOREST_REPLACEMENT.minX, CANYON_FOREST_REPLACEMENT.maxX, t)
      + (forestPlacementNoise(seedOffset + i * 5 + 1) - 0.5) * forwardJitter
    const centerZ = canyonCenterZ(x)
    const sideDistance = THREE.MathUtils.lerp(minSide, maxSide, forestPlacementNoise(seedOffset + i * 5 + 2))
      + (forestPlacementNoise(seedOffset + i * 5 + 3) - 0.5) * sideJitter
    const scaleNoise = 1 + (forestPlacementNoise(seedOffset + i * 5 + 4) - 0.5) * 2 * scaleJitter
    const placement = {
      file: type.file,
      origin: CANYON_FOREST_REPLACEMENT.origin,
      dx: Number(x.toFixed(2)),
      dz: Number((centerZ + side * sideDistance).toFixed(2)),
      rotY: Number((angleOffset + forestPlacementNoise(seedOffset + i * 5 + 5) * Math.PI * 2).toFixed(3)),
      scale: Number((type.scale * scaleNoise).toFixed(3)),
    }
    if (type.r) placement.r = Number((type.r * scaleNoise * colliderScale).toFixed(2))
    placements.push(placement)
  }
  return placements
}

function createCanyonForestReplacementPlacements() {
  return [
    ...createCanyonForestReplacementPlacementsForTypes(FOREST_GROVE_TREE_TYPES, 46, {
      minSide: CANYON.walkHalfWidth + 8.8,
      maxSide: CANYON.wallHalfGap + 14.5,
      angleOffset: 0.44,
      colliderScale: FOREST_TREE_COLLIDER_SCALE,
      seedOffset: 2900,
    }),
    ...createCanyonForestReplacementPlacementsForTypes(FOREST_GROVE_SHRUB_TYPES, 34, {
      minSide: CANYON.walkHalfWidth + 6.8,
      maxSide: CANYON.wallHalfGap + 11.0,
      angleOffset: 1.36,
      scaleJitter: 0.18,
      seedOffset: 3100,
    }),
    ...createCanyonForestReplacementPlacementsForTypes(FOREST_GROVE_ROCK_TYPES, 20, {
      minSide: CANYON.walkHalfWidth + 5.2,
      maxSide: CANYON.wallHalfGap + 9.5,
      angleOffset: 2.58,
      scaleJitter: 0.16,
      colliderScale: FOREST_ROCK_COLLIDER_SCALE,
      seedOffset: 3300,
    }),
  ]
}

function isInsideRandomForestClearing(x, z) {
  if (x * x + z * z <= RANDOM_FOREST_SPAWN_CLEAR_RADIUS * RANDOM_FOREST_SPAWN_CLEAR_RADIUS) return true

  const oldChurchDx = x - OLD_CHURCH_RUINS_PLACEMENT.x
  const oldChurchDz = z - OLD_CHURCH_RUINS_PLACEMENT.z
  if (oldChurchDx * oldChurchDx + oldChurchDz * oldChurchDz <= RANDOM_FOREST_OLD_CHURCH_CLEAR_RADIUS * RANDOM_FOREST_OLD_CHURCH_CLEAR_RADIUS) return true

  if (
    Math.abs(x - RANDOM_FOREST_CASTLE_APPROACH_CLEARING.x) <= RANDOM_FOREST_CASTLE_APPROACH_CLEARING.hx
    && Math.abs(z - RANDOM_FOREST_CASTLE_APPROACH_CLEARING.z) <= RANDOM_FOREST_CASTLE_APPROACH_CLEARING.hz
  ) {
    return true
  }

  const castleEntranceDx = x - CASTLE_EXTERIOR.transitionTarget.x
  const castleEntranceDz = z - CASTLE_EXTERIOR.transitionTarget.z
  if (castleEntranceDx * castleEntranceDx + castleEntranceDz * castleEntranceDz <= RANDOM_FOREST_CASTLE_ENTRANCE_CLEAR_RADIUS * RANDOM_FOREST_CASTLE_ENTRANCE_CLEAR_RADIUS) return true
  if (isInsideMineCaveClearing(x, z, 5)) return true

  const campfires = [
    { x: 0, z: 50 },
    { x: 19, z: -66 },
    { x: -18, z: -2 },
    { x: 22, z: 22 },
  ]
  for (const fire of campfires) {
    const dx = x - fire.x
    const dz = z - fire.z
    if (dx * dx + dz * dz <= RANDOM_FOREST_CAMPFIRE_CLEAR_RADIUS * RANDOM_FOREST_CAMPFIRE_CLEAR_RADIUS) return true
  }

  if (x >= CANYON.endX && x <= CANYON.startX + 8) {
    const dz = z - canyonCenterZ(x)
    if (Math.abs(dz) <= CANYON.wallHalfGap + 5) return true
  }

  return false
}

function isTooCloseToForestPlacement(placements, x, z, minSpacing) {
  const minDistSq = minSpacing * minSpacing
  for (const placement of placements) {
    const origin = getForestPlacementOrigin(placement)
    const px = origin.x + placement.dx
    const pz = origin.z + placement.dz
    const dx = x - px
    const dz = z - pz
    if (dx * dx + dz * dz < minDistSq) return true
  }
  return false
}

function createRandomForestTreePlacements(existingPlacements) {
  const placements = []
  const maxAttempts = RANDOM_FOREST_TREE_COUNT * 18
  for (let attempt = 0; placements.length < RANDOM_FOREST_TREE_COUNT && attempt < maxAttempts; attempt++) {
    const seed = 4300 + attempt * 7
    const x = Number(THREE.MathUtils.lerp(
      RANDOM_FOREST_BOUNDS.minX,
      RANDOM_FOREST_BOUNDS.maxX,
      forestPlacementNoise(seed + 1),
    ).toFixed(2))
    const z = Number(THREE.MathUtils.lerp(
      RANDOM_FOREST_BOUNDS.minZ,
      RANDOM_FOREST_BOUNDS.maxZ,
      forestPlacementNoise(seed + 2),
    ).toFixed(2))
    if (!isInsideOutdoorMountainBounds(x, z, 0)) continue
    if (isInsideRandomForestClearing(x, z)) continue
    if (isTooCloseToForestPlacement(existingPlacements, x, z, RANDOM_FOREST_TREE_MIN_SPACING)) continue
    if (isTooCloseToForestPlacement(placements, x, z, RANDOM_FOREST_TREE_MIN_SPACING)) continue

    const type = FOREST_GROVE_TREE_TYPES[attempt % FOREST_GROVE_TREE_TYPES.length]
    const scaleNoise = 1 + (forestPlacementNoise(seed + 3) - 0.5) * 0.28
    placements.push({
      file: type.file,
      origin: { x: 0, z: 0 },
      dx: x,
      dz: z,
      rotY: Number((forestPlacementNoise(seed + 4) * Math.PI * 2).toFixed(3)),
      scale: Number((type.scale * scaleNoise).toFixed(3)),
      r: Number((type.r * scaleNoise * FOREST_TREE_COLLIDER_SCALE).toFixed(2)),
    })
  }
  return placements
}

function getHeroRiverPointAtT(pathT) {
  let total = 0
  const lengths = []
  for (let i = 0; i < HERO_RIVER_POINTS.length - 1; i++) {
    const a = HERO_RIVER_POINTS[i]
    const b = HERO_RIVER_POINTS[i + 1]
    const len = Math.hypot(b.x - a.x, b.z - a.z)
    lengths.push(len)
    total += len
  }
  let accumulated = 0
  for (let i = 0; i < HERO_RIVER_POINTS.length - 1; i++) {
    const a = HERO_RIVER_POINTS[i]
    const b = HERO_RIVER_POINTS[i + 1]
    const segmentStart = accumulated / total
    const segmentEnd = (accumulated + lengths[i]) / total
    if (pathT <= segmentEnd || i === HERO_RIVER_POINTS.length - 2) {
      const localT = THREE.MathUtils.clamp((pathT - segmentStart) / Math.max(0.0001, segmentEnd - segmentStart), 0, 1)
      const dirX = (b.x - a.x) / lengths[i]
      const dirZ = (b.z - a.z) / lengths[i]
      return {
        x: THREE.MathUtils.lerp(a.x, b.x, localT),
        z: THREE.MathUtils.lerp(a.z, b.z, localT),
        dirX,
        dirZ,
      }
    }
    accumulated += lengths[i]
  }
  return { ...HERO_RIVER_POINTS[0], dirX: 1, dirZ: 0 }
}

function createRiverForestPlacementsForTypes(types, count, {
  minT,
  maxT,
  minSide,
  maxSide,
  sideJitter = 4,
  forwardJitter = 7,
  scaleJitter = 0.14,
  colliderScale = 1,
  seedOffset = 0,
} = {}) {
  const placements = []
  const goldenT = 0.61803398875
  for (let i = 0; i < count; i++) {
    const type = types[i % types.length]
    const t = minT + ((i * goldenT + forestPlacementNoise(seedOffset + i * 7 + 1) * 0.16) % 1) * (maxT - minT)
    const sample = getHeroRiverPointAtT(t)
    const side = forestPlacementNoise(seedOffset + i * 7 + 2) > 0.5 ? 1 : -1
    const rightX = -sample.dirZ
    const rightZ = sample.dirX
    const sideDistance = THREE.MathUtils.lerp(minSide, maxSide, forestPlacementNoise(seedOffset + i * 7 + 3))
      + (forestPlacementNoise(seedOffset + i * 7 + 4) - 0.5) * sideJitter
    const alongOffset = (forestPlacementNoise(seedOffset + i * 7 + 5) - 0.5) * forwardJitter
    const scaleNoise = 1 + (forestPlacementNoise(seedOffset + i * 7 + 6) - 0.5) * 2 * scaleJitter
    const placement = {
      file: type.file,
      origin: { x: 0, z: 0 },
      dx: Number((sample.x + sample.dirX * alongOffset + rightX * side * sideDistance).toFixed(2)),
      dz: Number((sample.z + sample.dirZ * alongOffset + rightZ * side * sideDistance).toFixed(2)),
      rotY: Number((forestPlacementNoise(seedOffset + i * 7 + 7) * Math.PI * 2).toFixed(3)),
      scale: Number((type.scale * scaleNoise).toFixed(3)),
    }
    if (type.r) placement.r = Number((type.r * scaleNoise * colliderScale).toFixed(2))
    placements.push(placement)
  }
  return placements
}

function createRiverForestPlacements() {
  return [
    ...createRiverForestPlacementsForTypes(FOREST_GROVE_TREE_TYPES, 34, {
      minT: 0.37,
      maxT: 0.68,
      minSide: 18,
      maxSide: 44,
      colliderScale: FOREST_TREE_COLLIDER_SCALE,
      seedOffset: 5100,
    }),
    ...createRiverForestPlacementsForTypes(FOREST_GROVE_SHRUB_TYPES, 38, {
      minT: 0.36,
      maxT: 0.70,
      minSide: 14,
      maxSide: 38,
      scaleJitter: 0.18,
      seedOffset: 5400,
    }),
    ...createRiverForestPlacementsForTypes(FOREST_GROVE_ROCK_TYPES, 16, {
      minT: 0.38,
      maxT: 0.66,
      minSide: 8,
      maxSide: 24,
      scaleJitter: 0.16,
      colliderScale: FOREST_ROCK_COLLIDER_SCALE,
      seedOffset: 5700,
    }),
  ]
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
  const northGrovePlacements = attachForestOrigin([
    ...createForestPlacementsForTypes(FOREST_GROVE_TREE_TYPES, 16, {
      radiusMin: 8.0,
      radiusMax: 27.2,
      angleOffset: 0.82,
      scaleJitter: 0.14,
      colliderScale: FOREST_TREE_COLLIDER_SCALE,
      seedOffset: 3500,
    }),
    ...createForestPlacementsForTypes(FOREST_GROVE_SHRUB_TYPES, 32, {
      radiusMin: 6.4,
      radiusMax: 25.6,
      angleOffset: 1.76,
      scaleJitter: 0.18,
      seedOffset: 3700,
    }),
    ...createForestPlacementsForTypes(FOREST_GROVE_ROCK_TYPES, 10, {
      radiusMin: 7.2,
      radiusMax: 24.0,
      angleOffset: 2.68,
      scaleJitter: 0.16,
      colliderScale: FOREST_ROCK_COLLIDER_SCALE,
      seedOffset: 3900,
    }),
  ], FOREST_NORTH_GROVE_ORIGIN)
  const castleNorthHighlandPlacements = attachForestOrigin(
    CASTLE_NORTH_HIGHLAND_PLACEMENTS,
    { x: 0, z: 0 },
  )
  const riverForestPlacements = createRiverForestPlacements()

  const existingPlacements = [
    ...castleLanePlacements,
    ...secondGrovePlacements,
    ...thirdGrovePlacements,
    ...lineGrovePlacements,
    ...northGrovePlacements,
    ...castleNorthHighlandPlacements,
    ...riverForestPlacements,
  ]
  const randomTreePlacements = createRandomForestTreePlacements(existingPlacements)

  return [
    ...existingPlacements,
    ...randomTreePlacements,
  ]
    .filter((placement) => {
      const origin = getForestPlacementOrigin(placement)
      return isInsideOutdoorMountainBounds(origin.x + placement.dx, origin.z + placement.dz, 0)
    })
    .filter((placement) => !isInForestCastleGateClearing(placement))
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

// 沿 CatmullRom 曲线生成顶点带；峡谷水流仍复用这个几何生成器
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
    const uMax = Math.max(1, width / CURVE_UV_TILE_METERS)
    const v = lengths[i] / CURVE_UV_TILE_METERS
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

const _forestPackLabelTargets = []
const _forestPackLabelBox = new THREE.Box3()

function getForestPackLabel(file) {
  return String(file).replace(/\.glb$/i, '')
}

function registerForestPackLabelTarget(group, file, range = 3) {
  _forestPackLabelTargets.push({
    group,
    label: getForestPackLabel(file),
    range,
  })
}

function getForestPackLabelPosition(group) {
  group.updateWorldMatrix(true, true)
  _forestPackLabelBox.setFromObject(group)
  if (!_forestPackLabelBox.isEmpty()) {
    const pos = new THREE.Vector3()
    _forestPackLabelBox.getCenter(pos)
    pos.y = _forestPackLabelBox.max.y + 0.25
    return pos
  }
  return group.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1.2, 0))
}

function getNearbyForestPackLabel(playerPosition, defaultRange = 3) {
  let nearest = null
  let nearestDistSq = defaultRange * defaultRange
  for (const target of _forestPackLabelTargets) {
    if (!target.group?.parent) continue
    const range = target.range ?? defaultRange
    const dx = playerPosition.x - target.group.position.x
    const dz = playerPosition.z - target.group.position.z
    const distSq = dx * dx + dz * dz
    if (distSq > range * range || distSq > nearestDistSq) continue
    nearest = target
    nearestDistSq = distSq
  }
  if (!nearest) return null
  return {
    label: nearest.label,
    position: getForestPackLabelPosition(nearest.group),
  }
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
  configureVegetationAlphaCutout(material)
  return material
}

function configureVegetationAlphaCutout(material) {
  if (!material?.map || !material.transparent) return
  const name = material.name ?? ''
  if (!/(tree|branch|leaf|leaves|background)/i.test(name)) return
  material.alphaTest = Math.max(material.alphaTest ?? 0, 0.35)
  material.transparent = false
  material.depthWrite = true
  material.depthTest = true
  material.needsUpdate = true
}

function configureStaticGltfModel(root, {
  shadows = true,
  castShadows = shadows,
  receiveShadows = shadows,
  cheapMaterials = false,
} = {}) {
  const cheapMaterialCache = new Map()
  root.traverse((child) => {
    if (!child.isMesh) return
    child.castShadow = castShadows
    child.receiveShadow = receiveShadows
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
    mats.forEach((mat) => {
      if (!mat) return
      configureVegetationAlphaCutout(mat)
      mat.needsUpdate = true
    })
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

    configureStaticGltfModel(root, { castShadows: false, receiveShadows: true, cheapMaterials: false })
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
    if (isInsideMineCaveClearing(x, z, 4)) return

    if (placement.r) {
      collidables.push({
        name: `forest_grove_${index + 1}_${placement.file}`,
        x,
        z,
        r: placement.r,
        minY: FOREST_GROVE_COLLIDER_MIN_Y,
        maxY: FOREST_GROVE_COLLIDER_MAX_Y,
      })
    }

    cloneGLTFScene(`${FOREST_GROVE_ASSETS_BASE}/${placement.file}`).then((root) => {
      const group = new THREE.Group()
      group.name = `forest_grove_${placement.file.replace(/\.glb$/i, '')}`
      group.position.set(x, 0, z)
      group.rotation.y = placement.rotY ?? 0
      group.scale.setScalar(placement.scale ?? 1)
      configureStaticGltfModel(root, { castShadows: false, receiveShadows: true, cheapMaterials: false })
      group.add(root)
      scene.add(group)
      snapObjectToGround(group)
      registerForestPackLabelTarget(group, placement.file)
    }).catch((error) => {
      console.warn(`Forest grove asset failed: ${placement.file}`, error)
    })
  })
}

function getMineCaveAngleDelta(a, b) {
  return (a - b + Math.PI) % (Math.PI * 2) - Math.PI
}

function isInsideMineCaveRegion(region, x, z) {
  if (region.hx !== undefined && region.hz !== undefined) {
    const dx = x - region.x
    const dz = z - region.z
    if (region.ux !== undefined && region.uz !== undefined && region.vx !== undefined && region.vz !== undefined) {
      const lx = dx * region.ux + dz * region.uz
      const lz = dx * region.vx + dz * region.vz
      return Math.abs(lx) <= region.hx && Math.abs(lz) <= region.hz
    }
    return Math.abs(dx) <= region.hx && Math.abs(dz) <= region.hz
  }
  if (region.r !== undefined) {
    const dx = x - region.x
    const dz = z - region.z
    return dx * dx + dz * dz <= region.r * region.r
  }
  return false
}

function mineCaveManifestShapeToWorld(shape, prefix) {
  const next = { ...shape }
  next.name = `${prefix}_${shape.name ?? 'shape'}`
  if (typeof next.x === 'number') next.x += MINE_CAVE.x
  if (typeof next.z === 'number') next.z += MINE_CAVE.z
  return next
}

function mineCaveManifestPathToWorld(path) {
  if (!Array.isArray(path?.points)) return null
  const points = path.points
    .filter((point) => Number.isFinite(point?.x) && Number.isFinite(point?.z))
    .map((point) => ({
      x: point.x + MINE_CAVE.x,
      z: point.z + MINE_CAVE.z,
    }))
  if (points.length < 2) return null
  return {
    type: 'clearancePath',
    id: path.id ?? 'mine_cave_path',
    name: `mine_cave_path_${path.id ?? 'path'}`,
    points,
    halfWidth: path.halfWidth ?? 0,
    minY: path.minY,
    maxY: path.maxY,
  }
}

function removeMineCaveLayoutColliders(collidables) {
  for (let i = collidables.length - 1; i >= 0; i--) {
    if (String(collidables[i]?.name ?? '').startsWith('mine_cave_')) collidables.splice(i, 1)
  }
}

function addMineCaveShaftWallColliders(collidables, {
  minY,
  maxY,
  leaveBottomOpening = false,
  prefix,
}) {
  const segmentCount = 32
  const colliderRadius = MINE_CAVE.shaftRadius + 0.15
  const radialHalfThickness = 0.16
  const tangentHalfLength = Math.PI * 2 * colliderRadius / segmentCount * 0.62
  const openingCenter = -Math.PI * 0.5
  const openingHalfAngle = 1.08

  for (let i = 0; i < segmentCount; i++) {
    const angle = (i + 0.5) / segmentCount * Math.PI * 2
    if (leaveBottomOpening && Math.abs(getMineCaveAngleDelta(angle, openingCenter)) <= openingHalfAngle) continue

    const radialX = Math.cos(angle)
    const radialZ = Math.sin(angle)
    collidables.push({
      name: `${prefix}_${i}`,
      x: MINE_CAVE.x + radialX * colliderRadius,
      z: MINE_CAVE.z + radialZ * colliderRadius,
      hx: radialHalfThickness,
      hz: tangentHalfLength,
      ux: radialX,
      uz: radialZ,
      vx: -radialZ,
      vz: radialX,
      minY,
      maxY,
    })
  }
}

function addMineCaveCoreColliders(collidables) {
  addMineCaveShaftWallColliders(collidables, {
    prefix: 'mine_cave_shaft_lower_wall',
    minY: MINE_CAVE.bottomY - 0.5,
    maxY: MINE_CAVE.undergroundWallTopY,
    leaveBottomOpening: true,
  })
  addMineCaveShaftWallColliders(collidables, {
    prefix: 'mine_cave_shaft_upper_wall',
    minY: MINE_CAVE.undergroundWallTopY,
    maxY: MINE_CAVE.shaftBlockerMinY,
  })
  collidables.push({
    name: 'mine_cave_shaft_blocker',
    x: MINE_CAVE.x,
    z: MINE_CAVE.z,
    r: MINE_CAVE.shaftBlockerRadius,
    minY: MINE_CAVE.shaftBlockerMinY,
    maxY: MINE_CAVE.shaftBlockerMaxY,
  })
}

function addMineCaveColliders(collidables) {
  const wallHalfThickness = MINE_CAVE.wallHalfThickness
  const cavernFrontWingHalfWidth = (MINE_CAVE.cavernHalfWidth - MINE_CAVE.tunnelHalfWidth) * 0.5
  const cavernFrontWingOffsetX = MINE_CAVE.tunnelHalfWidth + cavernFrontWingHalfWidth
  const cavernFrontZ = MINE_CAVE.cavernZ + MINE_CAVE.cavernHalfDepth
  addMineCaveShaftWallColliders(collidables, {
    prefix: 'mine_cave_shaft_lower_wall',
    minY: MINE_CAVE.bottomY - 0.5,
    maxY: MINE_CAVE.undergroundWallTopY,
    leaveBottomOpening: true,
  })
  addMineCaveShaftWallColliders(collidables, {
    prefix: 'mine_cave_shaft_upper_wall',
    minY: MINE_CAVE.undergroundWallTopY,
    maxY: MINE_CAVE.shaftBlockerMinY,
  })
  collidables.push(
    {
      name: 'mine_cave_shaft_blocker',
      x: MINE_CAVE.x,
      z: MINE_CAVE.z,
      r: MINE_CAVE.shaftBlockerRadius,
      minY: MINE_CAVE.shaftBlockerMinY,
      maxY: MINE_CAVE.shaftBlockerMaxY,
    },
    {
      name: 'mine_cave_connector_left_wall',
      x: MINE_CAVE.x - MINE_CAVE.connectorHalfWidth - MINE_CAVE.connectorWallHalfThickness,
      z: MINE_CAVE.connectorZ,
      hx: MINE_CAVE.connectorWallHalfThickness,
      hz: MINE_CAVE.connectorHalfDepth,
      minY: MINE_CAVE.bottomY - 0.5,
      maxY: MINE_CAVE.undergroundWallTopY,
    },
    {
      name: 'mine_cave_connector_right_wall',
      x: MINE_CAVE.x + MINE_CAVE.connectorHalfWidth + MINE_CAVE.connectorWallHalfThickness,
      z: MINE_CAVE.connectorZ,
      hx: MINE_CAVE.connectorWallHalfThickness,
      hz: MINE_CAVE.connectorHalfDepth,
      minY: MINE_CAVE.bottomY - 0.5,
      maxY: MINE_CAVE.undergroundWallTopY,
    },
    {
      name: 'mine_cave_bottom_exit_surface',
      x: MINE_CAVE.bottomExitX,
      z: MINE_CAVE.bottomExitZ,
      hx: MINE_CAVE.bottomExitHalfWidth,
      hz: MINE_CAVE.bottomExitHalfDepth,
      h: MINE_CAVE.bottomY,
      surface: true,
    },
    {
      name: 'mine_cave_bottom_tunnel_surface',
      x: MINE_CAVE.x,
      z: MINE_CAVE.tunnelZ,
      hx: MINE_CAVE.tunnelHalfWidth,
      hz: MINE_CAVE.tunnelHalfDepth,
      h: MINE_CAVE.bottomY,
      surface: true,
    },
    {
      name: 'mine_cave_bottom_tunnel_left_wall',
      x: MINE_CAVE.x - MINE_CAVE.tunnelHalfWidth - wallHalfThickness,
      z: MINE_CAVE.tunnelZ,
      hx: wallHalfThickness,
      hz: MINE_CAVE.tunnelHalfDepth,
      minY: MINE_CAVE.bottomY - 0.5,
      maxY: MINE_CAVE.undergroundWallTopY,
    },
    {
      name: 'mine_cave_bottom_tunnel_right_wall',
      x: MINE_CAVE.x + MINE_CAVE.tunnelHalfWidth + wallHalfThickness,
      z: MINE_CAVE.tunnelZ,
      hx: wallHalfThickness,
      hz: MINE_CAVE.tunnelHalfDepth,
      minY: MINE_CAVE.bottomY - 0.5,
      maxY: MINE_CAVE.undergroundWallTopY,
    },
    {
      name: 'mine_cave_cavern_surface',
      x: MINE_CAVE.cavernX,
      z: MINE_CAVE.cavernZ,
      hx: MINE_CAVE.cavernHalfWidth,
      hz: MINE_CAVE.cavernHalfDepth,
      h: MINE_CAVE.bottomY,
      surface: true,
    },
    {
      name: 'mine_cave_cavern_front_left_wall',
      x: MINE_CAVE.x - cavernFrontWingOffsetX,
      z: cavernFrontZ,
      hx: cavernFrontWingHalfWidth,
      hz: wallHalfThickness,
      minY: MINE_CAVE.bottomY - 0.5,
      maxY: MINE_CAVE.undergroundWallTopY,
    },
    {
      name: 'mine_cave_cavern_front_right_wall',
      x: MINE_CAVE.x + cavernFrontWingOffsetX,
      z: cavernFrontZ,
      hx: cavernFrontWingHalfWidth,
      hz: wallHalfThickness,
      minY: MINE_CAVE.bottomY - 0.5,
      maxY: MINE_CAVE.undergroundWallTopY,
    },
    {
      name: 'mine_cave_cavern_left_wall',
      x: MINE_CAVE.cavernX - MINE_CAVE.cavernHalfWidth - wallHalfThickness,
      z: MINE_CAVE.cavernZ,
      hx: wallHalfThickness,
      hz: MINE_CAVE.cavernHalfDepth,
      minY: MINE_CAVE.bottomY - 0.5,
      maxY: MINE_CAVE.undergroundWallTopY,
    },
    {
      name: 'mine_cave_cavern_right_wall',
      x: MINE_CAVE.cavernX + MINE_CAVE.cavernHalfWidth + wallHalfThickness,
      z: MINE_CAVE.cavernZ,
      hx: wallHalfThickness,
      hz: MINE_CAVE.cavernHalfDepth,
      minY: MINE_CAVE.bottomY - 0.5,
      maxY: MINE_CAVE.undergroundWallTopY,
    },
    {
      name: 'mine_cave_cavern_back_wall',
      x: MINE_CAVE.x,
      z: MINE_CAVE.cavernZ - MINE_CAVE.cavernHalfDepth - wallHalfThickness,
      hx: MINE_CAVE.cavernHalfWidth + wallHalfThickness,
      hz: wallHalfThickness,
      minY: MINE_CAVE.bottomY - 0.5,
      maxY: MINE_CAVE.undergroundWallTopY,
    },
  )
}

async function loadMineCaveColliderManifest(collidables) {
  try {
    const response = await fetch(MINE_CAVE_COLLIDER_MANIFEST_URL)
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
    const manifest = await response.json()
    if (!Array.isArray(manifest?.colliders) || !Array.isArray(manifest?.zones)) return

    removeMineCaveLayoutColliders(collidables)
    addMineCaveCoreColliders(collidables)
    manifest.colliders.forEach((collider) => {
      collidables.push(mineCaveManifestShapeToWorld(collider, 'mine_cave_manifest'))
    })
    if (Array.isArray(manifest.paths)) {
      manifest.paths.forEach((path) => {
        const clearancePath = mineCaveManifestPathToWorld(path)
        if (clearancePath) collidables.push(clearancePath)
      })
    }
    _mineCaveUndergroundZones = manifest.zones.map((zone) => mineCaveManifestShapeToWorld(zone, 'mine_cave_zone'))
  } catch (error) {
    console.warn(`Mine cave collider manifest fallback active: ${MINE_CAVE_COLLIDER_MANIFEST_URL}`, error)
  }
}

function loadMineCave(scene, collidables, onReady = null) {
  addMineCaveColliders(collidables)
  loadMineCaveColliderManifest(collidables)
  cloneGLTFScene(MINE_CAVE_MODEL_URL).then((root) => {
    const group = new THREE.Group()
    group.name = 'mine_cave'
    group.position.set(MINE_CAVE.x, 0, MINE_CAVE.z)
    configureStaticGltfModel(root, { castShadows: false, receiveShadows: true, cheapMaterials: false })
    group.add(root)
    scene.add(group)
    onReady?.(group)
  }).catch((error) => {
    console.warn(`Mine cave model fallback active: ${MINE_CAVE_MODEL_URL}`, error)
  })
}

async function loadOutdoorLandmarkColliders(collidables) {
  try {
    const response = await fetch(OUTDOOR_LANDMARK_MANIFEST_URL)
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
    const manifest = await response.json()
    if (!Array.isArray(manifest?.colliders)) return
    manifest.colliders.forEach((collider) => {
      collidables.push({
        ...collider,
        name: `outdoor_landmarks_${collider.name ?? 'collider'}`,
      })
    })
  } catch (error) {
    console.warn(`Outdoor landmark manifest fallback active: ${OUTDOOR_LANDMARK_MANIFEST_URL}`, error)
  }
}

function loadOutdoorLandmarks(scene, collidables, onReady = null) {
  loadOutdoorLandmarkColliders(collidables)
  cloneGLTFScene(OUTDOOR_LANDMARK_MODEL_URL).then((root) => {
    root.name = 'outdoor_landmarks'
    configureStaticGltfModel(root, { castShadows: false, receiveShadows: true, cheapMaterials: false })
    scene.add(root)
    onReady?.(root)
  }).catch((error) => {
    console.warn(`Outdoor landmark model fallback active: ${OUTDOOR_LANDMARK_MODEL_URL}`, error)
  })
}

function loadSpawnGrass(scene) {
  const placements = createSpawnGrassPlacements()
  if (!placements.length) return

  _spawnGrassWindUniforms = []
  _spawnGrassInstancedMeshes = []
  Promise.all(SPAWN_GRASS_MODEL_VARIANTS.map((variant, variantIndex) => (
    loadGLTF(variant.url).then((gltf) => ({ variant, variantIndex, gltf }))
  ))).then((loadedVariants) => {
    loadedVariants.forEach(({ variant, variantIndex, gltf }) => {
      const templateMesh = findFirstMesh(gltf.scene)
      if (!templateMesh) return

      const variantPlacements = placements.filter((placement) => placement.variantIndex === variantIndex)
      if (!variantPlacements.length) return

      const material = configureSpawnGrassMaterial(new THREE.MeshBasicMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        depthWrite: true,
      }))

      const inst = new THREE.InstancedMesh(templateMesh.geometry, material, variantPlacements.length)
      inst.name = `spawn_grass_clump_${variant.name}_instances`
      inst.castShadow = false
      inst.receiveShadow = false
      inst.frustumCulled = true
      _spawnGrassInstancedMeshes.push(inst)
      applySpawnGrassPlacements(inst, variantPlacements)
      scene.add(inst)
    })
  }).catch((error) => {
    console.warn('Spawn grass asset failed', error)
  })
}

function loadSpawnGrass60Ref(scene) {
  loadGLTF(SPAWN_GRASS_60_REF_MODEL_URL).then((gltf) => {
    const templateMesh = findFirstMesh(gltf.scene)
    if (!templateMesh) return

    const material = configureSpawnGrassMaterial(new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      depthWrite: true,
    }))

    const inst = new THREE.InstancedMesh(templateMesh.geometry, material, 1)
    inst.name = 'spawn_grass_60_face_reference'
    inst.castShadow = false
    inst.receiveShadow = false
    inst.frustumCulled = true

    const { x, z, rotY, scale } = SPAWN_GRASS_60_REF_PLACEMENT
    _spawnGrassDummy.position.set(x, getGroundHeight(x, z) + LOCAL_MODEL_GRASS_Y_OFFSET, z)
    _spawnGrassDummy.rotation.set(0, rotY, 0)
    _spawnGrassDummy.scale.set(scale, scale, scale)
    _spawnGrassDummy.updateMatrix()
    inst.setMatrixAt(0, _spawnGrassDummy.matrix)
    inst.instanceMatrix.needsUpdate = true

    scene.add(inst)
  }).catch((error) => {
    console.warn('60-face spawn grass reference failed', error)
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

function applyCastleNorthHighlandHeight(x, z, height) {
  const highland = CASTLE_NORTH_HIGHLAND
  const dx = x - highland.x
  const dz = z - highland.z
  const d = Math.hypot(dx / highland.rx, dz / highland.rz)
  const topBlend = 1 - THREE.MathUtils.smoothstep(d, highland.top, highland.edge)
  const plateauNoise = moundNoise(x, z) * 0.10
  let contribution = 0
  if (topBlend > 0) {
    contribution = Math.max(contribution, highland.height * topBlend + plateauNoise * topBlend)
  }

  const ramp = highland.rampEnd
  const start = highland.rampStart
  const abx = ramp.x - start.x
  const abz = ramp.z - start.z
  const apx = x - start.x
  const apz = z - start.z
  const lenSq = abx * abx + abz * abz || 1
  const along = THREE.MathUtils.clamp((apx * abx + apz * abz) / lenSq, 0, 1)
  const cx = start.x + abx * along
  const cz = start.z + abz * along
  const side = Math.hypot(x - cx, z - cz)
  const sideBlend = 1 - THREE.MathUtils.smoothstep(side, highland.rampHalfWidth * 0.45, highland.rampHalfWidth)
  const rampHeight = highland.height * THREE.MathUtils.smoothstep(along, 0.02, 1.0)
  if (sideBlend > 0) {
    contribution = Math.max(contribution, rampHeight * sideBlend)
  }

  const caveDistance = Math.hypot(x - MINE_CAVE.x, z - MINE_CAVE.z)
  const caveBlend = THREE.MathUtils.smoothstep(
    caveDistance,
    MINE_CAVE.clearingRadius + 3,
    MINE_CAVE.clearingRadius + 6,
  )
  return height + contribution * caveBlend
}

function applyCastleApproachHeight(x, z, height) {
  let result = applyCastleNorthHighlandHeight(x, z, height)
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

function applyMineCaveHeight(x, z, height) {
  let result = height
  const dx = x - MINE_CAVE.x
  const dz = z - MINE_CAVE.z

  const entryDistance = Math.hypot(dx, dz)
  const entryBlend = 1 - THREE.MathUtils.smoothstep(entryDistance, MINE_CAVE.shaftRadius * 0.58, MINE_CAVE.shaftRadius * 1.15)
  if (entryBlend > 0) {
    result = Math.min(result, THREE.MathUtils.lerp(result, -0.75, entryBlend))
  }

  return result
}

export function isInsideMineCaveUndergroundPath(x, z) {
  if (_mineCaveUndergroundZones.length) {
    return _mineCaveUndergroundZones.some((zone) => isInsideMineCaveRegion(zone, x, z))
  }
  const inTunnel = Math.abs(x - MINE_CAVE.x) <= MINE_CAVE.tunnelHalfWidth
    && Math.abs(z - MINE_CAVE.tunnelZ) <= MINE_CAVE.tunnelHalfDepth
  const inCavern = Math.abs(x - MINE_CAVE.cavernX) <= MINE_CAVE.cavernHalfWidth
    && Math.abs(z - MINE_CAVE.cavernZ) <= MINE_CAVE.cavernHalfDepth
  const bottomDx = x - MINE_CAVE.bottomExitX
  const bottomDz = z - MINE_CAVE.bottomExitZ
  const inBottomExit = bottomDx * bottomDx + bottomDz * bottomDz <= MINE_CAVE.bottomInteractRange * MINE_CAVE.bottomInteractRange
  return inTunnel || inCavern || inBottomExit
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

function mountainEdgeNoise(x, z) {
  return Math.sin(x * 0.071 + z * 0.113) * 0.5
    + Math.sin(x * 0.173 - z * 0.049) * 0.32
    + Math.sin(x * 0.029 + z * 0.211) * 0.18
}

function applyMountainEdgeHeight(x, z, height) {
  const b = OUTDOOR_MOUNTAIN_BOUNDS
  const outsideX = Math.max(b.minX - x, 0, x - b.maxX)
  const outsideZ = Math.max(b.minZ - z, 0, z - b.maxZ)
  const outside = Math.max(outsideX, outsideZ)
  if (outside <= 0) return height

  const drop = Math.pow(THREE.MathUtils.smoothstep(outside, 0, 18), 0.58)
  const floor = MOUNTAIN_FALL_FLOOR_Y + mountainEdgeNoise(x, z) * 4.5
  return THREE.MathUtils.lerp(height, floor, drop)
}

function circleProtection(x, z, cx, cz, radius, feather = 18) {
  const d = Math.hypot(x - cx, z - cz)
  return 1 - THREE.MathUtils.smoothstep(d, radius, radius + feather)
}

function rectProtection(x, z, cx, cz, hx, hz, feather = 18) {
  const dx = Math.max(0, Math.abs(x - cx) - hx)
  const dz = Math.max(0, Math.abs(z - cz) - hz)
  return 1 - THREE.MathUtils.smoothstep(Math.hypot(dx, dz), 0, feather)
}

function protectedTerrainMask(x, z) {
  let mask = 0
  mask = Math.max(mask, circleProtection(x, z, 0, 45, 42, 24))
  mask = Math.max(mask, circleProtection(x, z, CASTLE_EXTERIOR.transitionTarget.x, CASTLE_EXTERIOR.transitionTarget.z, 48, 28))
  mask = Math.max(mask, circleProtection(x, z, MINE_CAVE.x, MINE_CAVE.z, 30, 18))
  mask = Math.max(mask, circleProtection(x, z, OLD_CHURCH_RUINS_PLACEMENT.x, OLD_CHURCH_RUINS_PLACEMENT.z, 34, 18))
  for (const fire of GRASS_CAMPFIRE_CLEARINGS) mask = Math.max(mask, circleProtection(x, z, fire.x, fire.z, 15, 12))
  mask = Math.max(mask, rectProtection(x, z, 50, 0, 72, 42, 28))
  return THREE.MathUtils.clamp(mask, 0, 1)
}

function distanceToRiverSegment(x, z, a, b) {
  const abx = b.x - a.x
  const abz = b.z - a.z
  const lenSq = abx * abx + abz * abz || 1
  const t = THREE.MathUtils.clamp(((x - a.x) * abx + (z - a.z) * abz) / lenSq, 0, 1)
  const cx = a.x + abx * t
  const cz = a.z + abz * t
  return {
    distance: Math.hypot(x - cx, z - cz),
    x: cx,
    z: cz,
    localT: t,
    dirX: abx / Math.sqrt(lenSq),
    dirZ: abz / Math.sqrt(lenSq),
  }
}

function getPathSample(points, x, z) {
  let best = null
  let accumulated = 0
  let total = 0
  const lengths = []
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    const len = Math.hypot(b.x - a.x, b.z - a.z)
    lengths.push(len)
    total += len
  }
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    const sample = distanceToRiverSegment(x, z, a, b)
    const pathT = (accumulated + lengths[i] * sample.localT) / Math.max(0.0001, total)
    if (!best || sample.distance < best.distance) {
      best = {
        ...sample,
        t: pathT,
        segmentIndex: i,
      }
    }
    accumulated += lengths[i]
  }
  return best
}

function getRiverPathSample(x, z) {
  return getPathSample(HERO_RIVER_POINTS, x, z)
}

function getCenterWestStreamPathSample(x, z) {
  return getPathSample(CENTER_WEST_STREAM_POINTS, x, z)
}

function riverHalfWidthAt(t) {
  const centralBelt = Math.exp(-Math.pow((t - 0.56) / 0.25, 2))
  return THREE.MathUtils.lerp(4.8, 7.8, Math.pow(t, 0.62)) + centralBelt * 3.2
}

function riverWaterYAt(t) {
  let descent
  if (t < 0.26) {
    descent = THREE.MathUtils.lerp(150, 40, t / 0.26)
  } else if (t < 0.36) {
    descent = THREE.MathUtils.lerp(40, 4, (t - 0.26) / 0.10)
  } else {
    descent = THREE.MathUtils.lerp(4, -5, (t - 0.36) / 0.64)
  }
  const falls = Math.exp(-Math.pow((t - 0.18) / 0.055, 2)) * 17
    + Math.exp(-Math.pow((t - 0.31) / 0.05, 2)) * 7
  return descent - falls
}

function getRiverSampleAt(x, z) {
  const sample = getRiverPathSample(x, z)
  const halfWidth = riverHalfWidthAt(sample.t)
  const waterY = riverWaterYAt(sample.t)
  const edgeDistance = Math.abs(sample.distance - halfWidth)
  const whitewater = Math.max(
    Math.exp(-Math.pow((sample.t - 0.19) / 0.045, 2)),
    Math.exp(-Math.pow((sample.t - 0.36) / 0.04, 2)),
    THREE.MathUtils.smoothstep(halfWidth - sample.distance, -2, 3) * 0.45,
  )
  return {
    ...sample,
    halfWidth,
    waterY,
    edgeDistance,
    whitewater: THREE.MathUtils.clamp(whitewater, 0, 1),
    flowSpeed: THREE.MathUtils.lerp(0.65, 3.4, THREE.MathUtils.clamp(whitewater + (1 - sample.t) * 0.35, 0, 1)),
  }
}

function branchHalfWidthAt(branch, t) {
  const mid = Math.sin(t * Math.PI) * 0.35
  return THREE.MathUtils.lerp(branch.halfWidthStart, branch.halfWidthEnd, t) + mid
}

function getBranchById(id) {
  return RIVER_BRANCHES.find(branch => branch.id === id) ?? null
}

function getBranchMouthWaterY(branch) {
  const end = branch.points[branch.points.length - 1]
  if (branch.mouthBranchId) {
    const mouthBranch = getBranchById(branch.mouthBranchId)
    if (mouthBranch) return getBranchSampleAt(mouthBranch, end.x, end.z).waterY
  }
  return getRiverSampleAt(end.x, end.z).waterY
}

function branchWaterYAt(branch, t) {
  const start = branch.points[0]
  const endWater = getBranchMouthWaterY(branch)
  const startWater = branch.sideChannel ? getRiverSampleAt(start.x, start.z).waterY : endWater + branch.sourceLift
  return THREE.MathUtils.lerp(startWater, endWater, t) + Math.sin(t * Math.PI * 2) * 0.08
}

function getBranchSampleAt(branch, x, z) {
  const sample = getPathSample(branch.points, x, z)
  const halfWidth = branchHalfWidthAt(branch, sample.t)
  const waterY = branchWaterYAt(branch, sample.t)
  const edgeDistance = Math.abs(sample.distance - halfWidth)
  const whitewater = Math.max(
    branch.sideChannel ? 0.08 : Math.exp(-Math.pow((sample.t - 0.22) / 0.16, 2)) * 0.24,
    THREE.MathUtils.smoothstep(halfWidth - sample.distance, -0.7, 1.4) * 0.14,
  )
  return {
    ...sample,
    branchId: branch.id,
    branch,
    halfWidth,
    waterY,
    edgeDistance,
    whitewater: THREE.MathUtils.clamp(whitewater, 0, 0.42),
    flowSpeed: THREE.MathUtils.lerp(0.32, branch.sideChannel ? 0.8 : 1.35, THREE.MathUtils.clamp(whitewater + (1 - sample.t) * 0.24, 0, 1)),
  }
}

function getBestBranchSampleAt(x, z) {
  let best = null
  for (const branch of RIVER_BRANCHES) {
    const sample = getBranchSampleAt(branch, x, z)
    if (!best || sample.distance < best.distance) best = sample
  }
  return best
}

function applyRiverBranchHeight(x, z, height) {
  const main = getRiverSampleAt(x, z)
  if (main.distance < main.halfWidth + 6) return height
  const branch = getBestBranchSampleAt(x, z)
  if (!branch) return height
  const bankWidth = branch.halfWidth + (branch.branch.sideChannel ? 26 : 30)
  if (branch.distance > bankWidth) return height
  const protect = protectedTerrainMask(x, z)
  const floorMask = 1 - THREE.MathUtils.smoothstep(branch.distance, branch.halfWidth * 0.56, branch.halfWidth + 0.55)
  const wetBankMask = 1 - THREE.MathUtils.smoothstep(branch.distance, branch.halfWidth + 4, branch.halfWidth + 14)
  const swaleMask = 1 - THREE.MathUtils.smoothstep(branch.distance, branch.halfWidth + 12, bankWidth)
  const slopeT = THREE.MathUtils.smoothstep(branch.distance, branch.halfWidth + 5, bankWidth)
  const bedNoise = Math.sin(x * 0.22 + z * 0.13) * 0.07 + Math.sin(x * 0.09 - z * 0.19) * 0.05
  const swaleNoise = Math.sin(x * 0.055 + z * 0.039) * 0.22 + Math.sin(x * 0.031 - z * 0.071) * 0.16
  const floor = branch.waterY - THREE.MathUtils.lerp(0.32, 0.72, branch.whitewater) + bedNoise
  const nearBank = branch.waterY + 0.34
    + THREE.MathUtils.smoothstep(branch.distance, branch.halfWidth + 0.2, branch.halfWidth + 6) * 0.72
    + Math.max(0, swaleNoise) * 0.10
  const swale = branch.waterY + 0.86
    + slopeT * (branch.branch.sideChannel ? 1.0 : 1.55)
    + swaleNoise * 0.36
  let target = THREE.MathUtils.lerp(swale, nearBank, wetBankMask)
  target = THREE.MathUtils.lerp(target, floor, floorMask)
  const channelProtect = branch.distance < branch.halfWidth + 2 ? 0 : protect * 0.85
  const blend = Math.max(floorMask, swaleMask * 0.82) * (1 - channelProtect)
  return THREE.MathUtils.lerp(height, target, blend)
}

function getGullySampleAt(gully, x, z) {
  const sample = getPathSample(gully.points, x, z)
  return {
    ...sample,
    gully,
    width: gully.width,
    influence: gully.influence,
    depth: gully.depth,
    wet: gully.wet,
  }
}

function gullyStreamHalfWidthAt(gully, t) {
  const start = gully.halfWidthStart ?? Math.max(0.72, gully.width * 0.20)
  const end = gully.halfWidthEnd ?? Math.max(1.05, gully.width * 0.36)
  return THREE.MathUtils.lerp(start, end, t) + Math.sin(t * Math.PI) * 0.16
}

function getGullyMouthWaterY(gully) {
  const end = gully.points[gully.points.length - 1]
  const main = getRiverSampleAt(end.x, end.z)
  const branch = getBestBranchSampleAt(end.x, end.z)
  if (branch && branch.distance < main.distance && branch.distance < branch.halfWidth + 14) return branch.waterY
  return main.waterY
}

function gullyStreamWaterYAt(gully, t) {
  const mouthWater = getGullyMouthWaterY(gully)
  const sourceLift = gully.sourceLift ?? THREE.MathUtils.lerp(1.8, 3.8, THREE.MathUtils.clamp(gully.depth / 3.4, 0, 1))
  return THREE.MathUtils.lerp(mouthWater + sourceLift, mouthWater, t) + Math.sin(t * Math.PI * 2) * 0.05
}

function getGullyStreamSampleAt(gully, x, z) {
  const sample = getGullySampleAt(gully, x, z)
  const halfWidth = gullyStreamHalfWidthAt(gully, sample.t)
  const waterY = gullyStreamWaterYAt(gully, sample.t)
  const edgeDistance = Math.abs(sample.distance - halfWidth)
  const whitewater = Math.max(
    Math.exp(-Math.pow((sample.t - 0.24) / 0.18, 2)) * 0.16,
    THREE.MathUtils.smoothstep(halfWidth - sample.distance, -0.45, 1.1) * 0.12,
  )
  return {
    ...sample,
    gullyId: gully.id,
    halfWidth,
    waterY,
    edgeDistance,
    whitewater: THREE.MathUtils.clamp(whitewater, 0, 0.28),
    flowSpeed: THREE.MathUtils.lerp(0.24, 0.86, THREE.MathUtils.clamp(whitewater + (1 - sample.t) * 0.18, 0, 1)),
  }
}

function getBestGullyStreamSampleAt(x, z) {
  let best = null
  for (const gully of EROSION_GULLIES) {
    const sample = getGullyStreamSampleAt(gully, x, z)
    if (!best || sample.distance < best.distance) best = sample
  }
  return best
}

function applyGullyNetworkHeight(x, z, height) {
  const main = getRiverSampleAt(x, z)
  if (main.distance < main.halfWidth + 5) return height
  const branch = getBestBranchSampleAt(x, z)
  if (branch && branch.distance < branch.halfWidth + 4) return height
  const gully = getBestGullyStreamSampleAt(x, z)
  if (!gully || gully.distance > gully.influence) return height
  const protect = protectedTerrainMask(x, z)
  const floorMask = 1 - THREE.MathUtils.smoothstep(gully.distance, gully.halfWidth * 0.58, gully.halfWidth + 0.45)
  const wetBankMask = 1 - THREE.MathUtils.smoothstep(gully.distance, gully.halfWidth + 3.5, gully.halfWidth + 11)
  const apronMask = 1 - THREE.MathUtils.smoothstep(gully.distance, gully.halfWidth + 9, gully.influence)
  const shoulderMask = THREE.MathUtils.smoothstep(gully.distance, gully.halfWidth + 1.2, gully.halfWidth + 8)
    * (1 - THREE.MathUtils.smoothstep(gully.distance, gully.halfWidth + 8, gully.halfWidth + 18))
  const bedNoise = Math.sin(x * 0.12 + z * 0.065) * 0.08 + Math.sin(x * 0.047 - z * 0.093) * 0.06
  const bankNoise = Math.sin(x * 0.053 + z * 0.041) * 0.24 + Math.sin(x * 0.027 - z * 0.067) * 0.18
  const floor = gully.waterY - THREE.MathUtils.lerp(0.24, 0.52, gully.whitewater) + bedNoise
  const wetBank = gully.waterY + 0.24
    + THREE.MathUtils.smoothstep(gully.distance, gully.halfWidth + 0.15, gully.halfWidth + 5.5) * 0.48
    + Math.max(0, bankNoise) * 0.08
  const apron = gully.waterY + 0.72
    + THREE.MathUtils.smoothstep(gully.distance, gully.halfWidth + 5, gully.influence) * (0.9 + gully.depth * 0.22)
    + bankNoise * 0.28
  let target = THREE.MathUtils.lerp(apron, wetBank, wetBankMask)
  target = THREE.MathUtils.lerp(target, floor, floorMask)
  target += shoulderMask * 0.24
  const blend = Math.max(floorMask, apronMask * 0.72) * (1 - protect * 0.72)
  return THREE.MathUtils.lerp(height, target, blend)
}

function applyLargeWorldHeight(x, z, height) {
  const protect = protectedTerrainMask(x, z)
  const broad = Math.sin(x * 0.010 + z * 0.006) * 6.5
    + Math.sin(x * 0.004 - z * 0.012) * 10.0
    + Math.sin(x * 0.018 + z * 0.021) * 2.2
  const northRise = THREE.MathUtils.smoothstep(z, 80, 600) * (18 + Math.sin(x * 0.009) * 8)
  const westRise = THREE.MathUtils.smoothstep(-x, 120, 620) * (12 + Math.sin(z * 0.008) * 5)
  return height + (broad + northRise + westRise) * (1 - protect * 0.92)
}

function applyLargeRiverValleyHeight(x, z, height) {
  const river = getRiverSampleAt(x, z)
  const centralBelt = Math.exp(-Math.pow((river.t - 0.55) / 0.36, 2))
  const valleyWidth = river.halfWidth + THREE.MathUtils.lerp(145, 250, centralBelt)
  if (river.distance > valleyWidth) return height
  const protect = protectedTerrainMask(x, z)
  const valleyMask = 1 - THREE.MathUtils.smoothstep(river.distance, valleyWidth * 0.68, valleyWidth)
  const terraceT = THREE.MathUtils.smoothstep(river.distance, river.halfWidth + 78, valleyWidth)
  const broadSwale = Math.sin(x * 0.018 + z * 0.022) * 0.8 + Math.sin(x * 0.043 - z * 0.031) * 0.35
  const valleyFloor = river.waterY + 3.4 + centralBelt * 0.8 + broadSwale * 0.35
  const terrace = river.waterY + 6.8 + terraceT * (5.5 + centralBelt * 3.0) + Math.max(0, broadSwale) * 0.8
  const target = THREE.MathUtils.lerp(valleyFloor, terrace, terraceT)
  const blend = valleyMask * 0.62 * (1 - protect * 0.58)
  return THREE.MathUtils.lerp(height, target, blend)
}

function centerWestStreamHalfWidthAt(t) {
  return THREE.MathUtils.lerp(1.9, 3.4, 0.35 + Math.sin(t * Math.PI) * 0.65)
}

function centerWestStreamWaterYAt(t) {
  return THREE.MathUtils.lerp(1.8, -2.8, t) + Math.sin(t * Math.PI * 2.0) * 0.12
}

function getCenterWestStreamSampleAt(x, z) {
  const sample = getCenterWestStreamPathSample(x, z)
  const halfWidth = centerWestStreamHalfWidthAt(sample.t)
  const waterY = centerWestStreamWaterYAt(sample.t)
  const edgeDistance = Math.abs(sample.distance - halfWidth)
  const whitewater = Math.max(
    Math.exp(-Math.pow((sample.t - 0.32) / 0.08, 2)) * 0.34,
    Math.exp(-Math.pow((sample.t - 0.72) / 0.09, 2)) * 0.24,
    THREE.MathUtils.smoothstep(halfWidth - sample.distance, -1.2, 2.2) * 0.22,
  )
  return {
    ...sample,
    halfWidth,
    waterY,
    edgeDistance,
    whitewater: THREE.MathUtils.clamp(whitewater, 0, 0.55),
    flowSpeed: THREE.MathUtils.lerp(0.42, 1.25, THREE.MathUtils.clamp(whitewater + (1 - sample.t) * 0.22, 0, 1)),
  }
}

function applyCenterWestStreamValleyHeight(x, z, height) {
  const stream = getCenterWestStreamSampleAt(x, z)
  const bankWidth = stream.halfWidth + 34
  if (stream.distance > bankWidth) return height
  const floorMask = 1 - THREE.MathUtils.smoothstep(stream.distance, stream.halfWidth * 0.52, stream.halfWidth + 0.45)
  const valleyMask = 1 - THREE.MathUtils.smoothstep(stream.distance, stream.halfWidth + 10, bankWidth)
  const bankRise = THREE.MathUtils.smoothstep(stream.distance, stream.halfWidth + 0.6, bankWidth)
  const outerMoundMask = THREE.MathUtils.smoothstep(stream.distance, stream.halfWidth + 13, stream.halfWidth + 24)
    * (1 - THREE.MathUtils.smoothstep(stream.distance, stream.halfWidth + 28, bankWidth))
  const leftRight = Math.sign((x - stream.x) * -stream.dirZ + (z - stream.z) * stream.dirX) || 1
  const bedNoise = Math.sin(x * 0.18 + z * 0.09) * 0.08 + Math.sin(x * 0.06 - z * 0.21) * 0.07
  const slopeNoise = Math.sin(x * 0.047 + z * 0.038) * 0.42 + Math.sin(x * 0.081 - z * 0.026) * 0.28
  const smallHillA = Math.exp(-Math.pow((x + 302) / 42, 2) - Math.pow((z - 38) / 32, 2)) * 2.4
  const smallHillB = Math.exp(-Math.pow((x + 224) / 36, 2) - Math.pow((z + 26) / 28, 2)) * 2.0
  const swale = Math.exp(-Math.pow((x + 260) / 48, 2) - Math.pow((z - 38) / 24, 2)) * 1.1
  const streamFloor = stream.waterY - THREE.MathUtils.lerp(0.58, 0.96, stream.whitewater) + bedNoise
  const nearBank = stream.waterY + 0.28
    + THREE.MathUtils.smoothstep(stream.distance, stream.halfWidth + 0.2, stream.halfWidth + 8) * 0.82
    + Math.max(0, slopeNoise) * 0.12
  const outerSlope = stream.waterY + 1.0
    + bankRise * (THREE.MathUtils.lerp(2.3, 4.4, Math.sin(stream.t * Math.PI)) + Math.max(0, slopeNoise))
    + outerMoundMask * (smallHillA + smallHillB - swale + leftRight * 0.34)
  const bankTarget = THREE.MathUtils.lerp(nearBank, outerSlope, bankRise)
  const target = THREE.MathUtils.lerp(bankTarget, streamFloor, floorMask)
  const blend = Math.max(floorMask, valleyMask * 0.96)
  return THREE.MathUtils.lerp(height, target, blend)
}

function applySnowMountainHeight(x, z, height) {
  const peaks = [
    { x: -530, z: 545, rx: 240, rz: 210, h: 230 },
    { x: -305, z: 650, rx: 230, rz: 190, h: 185 },
    { x: -690, z: 330, rx: 190, rz: 250, h: 150 },
    { x: -120, z: 500, rx: 260, rz: 230, h: 126 },
  ]
  let mountain = height
  for (const peak of peaks) {
    const d = Math.hypot((x - peak.x) / peak.rx, (z - peak.z) / peak.rz)
    if (d > 1.35) continue
    const core = 1 - THREE.MathUtils.smoothstep(d, 0.08, 1.35)
    const ridge = Math.max(0, Math.sin((x - peak.x) * 0.026) + Math.cos((z - peak.z) * 0.021)) * 5.5
    mountain = Math.max(mountain, height + peak.h * Math.pow(core, 1.35) + ridge * core)
  }
  const pass = getRiverSampleAt(x, z)
  if (pass.t < 0.46 && pass.distance < 58) {
    const pathBlend = 1 - THREE.MathUtils.smoothstep(pass.distance, 18, 58)
    mountain = THREE.MathUtils.lerp(mountain, Math.min(mountain, pass.waterY + 3 + pass.distance * 0.28), pathBlend * 0.65)
  }
  return mountain
}

function applyHeroRiverHeight(x, z, height) {
  const river = getRiverSampleAt(x, z)
  const halfWidth = river.halfWidth
  const centralBelt = Math.exp(-Math.pow((river.t - 0.56) / 0.28, 2))
  const valleyWidth = halfWidth + THREE.MathUtils.lerp(76, 136, centralBelt)
  if (river.distance > valleyWidth) return height
  const protect = protectedTerrainMask(x, z)
  const side = Math.sign((x - river.x) * -river.dirZ + (z - river.z) * river.dirX) || 1
  const bend = Math.sin(river.t * Math.PI * 5.2 + 0.8)
  const innerBank = THREE.MathUtils.clamp(0.5 + side * bend * 0.5, 0, 1)
  const outerBank = 1 - innerBank
  const floorMask = 1 - THREE.MathUtils.smoothstep(river.distance, halfWidth * 0.58, halfWidth + 0.8)
  const floodplainMask = 1 - THREE.MathUtils.smoothstep(river.distance, halfWidth + 46, valleyWidth)
  const terraceT = THREE.MathUtils.smoothstep(river.distance, halfWidth + 42, valleyWidth)
  const bedNoise = Math.sin(x * 0.21 + z * 0.08) * 0.18 + Math.sin(x * 0.07 - z * 0.18) * 0.12
  const swaleNoise = Math.sin(x * 0.032 + z * 0.047) * 0.34 + Math.sin(x * 0.061 - z * 0.024) * 0.22
  const terraceNoise = Math.sin(x * 0.018 - z * 0.014) * 0.85 + Math.sin(x * 0.011 + z * 0.027) * 0.55
  const riverFloor = river.waterY - THREE.MathUtils.lerp(0.58, 1.08, river.whitewater) + bedNoise
  const pointBar = river.waterY + 0.68
    + THREE.MathUtils.smoothstep(river.distance, halfWidth - 0.2, halfWidth + 18) * (1.05 + innerBank * 0.48)
    + swaleNoise * 0.18
  const cutBank = river.waterY + 0.82
    + THREE.MathUtils.smoothstep(river.distance, halfWidth - 0.2, halfWidth + 15) * (1.68 + outerBank * 1.45)
    + Math.max(0, swaleNoise) * 0.22
  const nearBank = THREE.MathUtils.lerp(pointBar, cutBank, outerBank * 0.72)
  const floodplain = river.waterY + 1.05
    + THREE.MathUtils.smoothstep(river.distance, halfWidth + 10, halfWidth + 44) * (0.85 + centralBelt * 0.72)
    + swaleNoise * (0.42 + centralBelt * 0.18)
  const terrace = river.waterY + 2.1
    + terraceT * (THREE.MathUtils.lerp(5.0, 9.0, centralBelt) + Math.max(0, terraceNoise))
    + terraceNoise * 0.28
  const bankToPlain = THREE.MathUtils.smoothstep(river.distance, halfWidth + 9, halfWidth + 34)
  let target = THREE.MathUtils.lerp(nearBank, floodplain, bankToPlain)
  target = THREE.MathUtils.lerp(target, terrace, terraceT)
  target = THREE.MathUtils.lerp(target, riverFloor, floorMask)
  if (river.whitewater > 0.55 && river.distance < halfWidth + 4) target -= river.whitewater * 1.4
  const channelProtect = river.distance < halfWidth + 2 ? 0 : protect * 0.82
  const carve = Math.max(floorMask, floodplainMask * 0.92) * (1 - channelProtect)
  return THREE.MathUtils.lerp(height, target, carve)
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
  rockery.castShadow = false
  rockery.receiveShadow = true
  scene.add(rockery)
}

function makeCurvedCliff(scene, material) {
  const cliff = new THREE.Mesh(createRockeryRidgeNetworkGeometry(CURVED_CLIFF_RIDGES), material)
  cliff.name = 'curved-cliffs'
  cliff.castShadow = false
  cliff.receiveShadow = true
  scene.add(cliff)
}

function makeMountainCliffSkirt(scene, sampleHeight, material) {
  const b = OUTDOOR_MOUNTAIN_BOUNDS
  const bottomY = MOUNTAIN_FALL_FLOOR_Y - 8
  const samples = 84
  const verts = []
  const uvs = []
  const idx = []

  const addSide = (name, start, end, outwardX, outwardZ) => {
    const base = verts.length / 3
    const length = Math.hypot(end.x - start.x, end.z - start.z)
    for (let i = 0; i <= samples; i++) {
      const t = i / samples
      const x = THREE.MathUtils.lerp(start.x, end.x, t)
      const z = THREE.MathUtils.lerp(start.z, end.z, t)
      const topY = sampleHeight(x, z)
      const n = mountainEdgeNoise(x + i * 1.7, z - i * 1.3)
      const shelf = 1.2 + Math.abs(n) * 2.2
      const midY = THREE.MathUtils.lerp(topY, bottomY, 0.42) + n * 3.0
      const bottomOffset = shelf + 8.5 + Math.abs(Math.sin(i * 0.47)) * 5.0
      const u = (length * t) / 7

      verts.push(
        x, topY - 0.08, z,
        x + outwardX * shelf, midY, z + outwardZ * shelf,
        x + outwardX * bottomOffset, bottomY + n * 2.0, z + outwardZ * bottomOffset,
      )
      uvs.push(u, 0, u + n * 0.08, 5.8, u, 12.5)

      if (i < samples) {
        const a = base + i * 3
        const c = a + 3
        if (name === 'north' || name === 'west') {
          idx.push(a, c, a + 1, a + 1, c, c + 1, a + 1, c + 1, a + 2, a + 2, c + 1, c + 2)
        } else {
          idx.push(a, a + 1, c, a + 1, c + 1, c, a + 1, a + 2, c + 1, a + 2, c + 2, c + 1)
        }
      }
    }
  }

  addSide('south', { x: b.minX, z: b.minZ }, { x: b.maxX, z: b.minZ }, 0, -1)
  addSide('east', { x: b.maxX, z: b.minZ }, { x: b.maxX, z: b.maxZ }, 1, 0)
  addSide('north', { x: b.maxX, z: b.maxZ }, { x: b.minX, z: b.maxZ }, 0, 1)
  addSide('west', { x: b.minX, z: b.maxZ }, { x: b.minX, z: b.minZ }, -1, 0)

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setAttribute('uv2', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(idx)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()

  const cliff = new THREE.Mesh(geometry, material)
  cliff.name = 'outdoor-mountain-textured-cliff-skirt'
  cliff.castShadow = false
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
      if (ridge.name === 'north-wall' && pointIndex >= 3) return
      const baseRadius = Math.max(2.9, width * 0.82)
      const radius = ridge.name === 'north-wall' && pointIndex === 0 ? 2.0 : baseRadius
      collidables.push({
        name: `ROCKERY_POINT_${ridge.name}_${pointIndex}`,
        x,
        z,
        r: radius,
        minY: -0.5,
        maxY: height + 1.0,
      })
    })
    for (let i = 0; i < ridge.points.length - 1; i++) {
      if (ridge.name === 'north-wall' && i >= 3) continue
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
        const baseRadius = Math.max(2.7, width * 0.72)
        const radius = ridge.name === 'north-wall' && i === 0 && step === 1 ? Math.min(baseRadius, 2.25) : baseRadius
        collidables.push({
          name: `ROCKERY_SEGMENT_${ridge.name}_${i}_${step}`,
          x,
          z,
          r: radius,
          minY: -0.5,
          maxY: height + 1.0,
        })
      }
    }
  })
}

function buildCastleApproach(scene, collidables) {
  const moundMaterial = createRockeryMaterial()
  makeApproachRockery(scene, moundMaterial)
  addApproachRockeryColliders(collidables)
}

function createTerrainBlendMaterial(texLoader) {
  const applyRepeat = (tex, { color = false } = {}) => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.anisotropy = 8
    if (color) tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }

  const mat = new THREE.MeshStandardMaterial({
    map: applyRepeat(texLoader.load('/textures/souls_terrain/Ground103_1K-JPG_Color.jpg'), { color: true }),
    normalMap: applyRepeat(texLoader.load('/textures/souls_terrain/Ground103_1K-JPG_NormalGL.jpg')),
    roughnessMap: applyRepeat(texLoader.load('/textures/souls_terrain/Ground103_1K-JPG_Roughness.jpg')),
    aoMap: applyRepeat(texLoader.load('/textures/souls_terrain/Ground103_1K-JPG_AmbientOcclusion.jpg')),
    roughness: 1,
    metalness: 0,
    normalScale: new THREE.Vector2(0.78, 0.78),
    aoMapIntensity: 0.72,
  })

  const uniforms = {
    uRockMap: { value: applyRepeat(texLoader.load('/textures/souls_terrain/Rock064_1K-JPG_Color.jpg'), { color: true }) },
    uRockNormalMap: { value: applyRepeat(texLoader.load('/textures/souls_terrain/Rock064_1K-JPG_NormalGL.jpg')) },
    uRockRoughnessMap: { value: applyRepeat(texLoader.load('/textures/souls_terrain/Rock064_1K-JPG_Roughness.jpg')) },
    uRockAoMap: { value: applyRepeat(texLoader.load('/textures/souls_terrain/Rock064_1K-JPG_AmbientOcclusion.jpg')) },
    uDebrisMap: { value: applyRepeat(texLoader.load('/textures/ground_debris/polyhaven/dry_decay_leaves_diff_1k.jpg'), { color: true }) },
    uDirtUvScale: { value: 0.42 },
    uRockUvScale: { value: 0.27 },
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
      uniform sampler2D uRockMap;
      uniform sampler2D uRockNormalMap;
      uniform sampler2D uRockRoughnessMap;
      uniform sampler2D uRockAoMap;
      uniform sampler2D uDebrisMap;
      uniform float uDirtUvScale;
      uniform float uRockUvScale;

      vec2 terrainDirtUv() {
        return vWorldPos.xz * uDirtUvScale;
      }

      vec2 terrainRockUv() {
        return vWorldPos.xz * uRockUvScale;
      }

      float terrainHash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float terrainNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = terrainHash(i);
        float b = terrainHash(i + vec2(1.0, 0.0));
        float c = terrainHash(i + vec2(0.0, 1.0));
        float d = terrainHash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      float terrainSlopeMask() {
        float slope = 1.0 - clamp(dot(normalize(vWorldNormal), vec3(0.0, 1.0, 0.0)), 0.0, 1.0);
        return smoothstep(0.14, 0.44, slope);
      }

      float terrainRockMask() {
        float heightMask = smoothstep(4.0, 14.0, vWorldPos.y) * 0.36;
        float broadNoise = terrainNoise(vWorldPos.xz * 0.055);
        float fineNoise = terrainNoise(vWorldPos.xz * 0.23);
        float patchMask = smoothstep(0.58, 0.92, broadNoise + fineNoise * 0.25);
        return clamp(max(terrainSlopeMask(), heightMask) + patchMask * 0.24, 0.0, 1.0);
      }

      float terrainDampMask() {
        float broadNoise = terrainNoise(vWorldPos.xz * 0.075 + vec2(11.3, 4.7));
        float fineNoise = terrainNoise(vWorldPos.xz * 0.42 + vec2(2.1, 19.6));
        return smoothstep(0.48, 0.88, broadNoise + fineNoise * 0.22);
      }

      vec3 terrainRiverSegment(vec2 p, vec2 a, vec2 b, float t0, float t1, vec3 best) {
        vec2 ab = b - a;
        float lenSq = max(dot(ab, ab), 0.0001);
        float h = clamp(dot(p - a, ab) / lenSq, 0.0, 1.0);
        vec2 c = a + ab * h;
        float d = length(p - c);
        if (d < best.x) best = vec3(d, mix(t0, t1, h), 1.0);
        return best;
      }

      vec3 terrainRiverSample(vec2 p) {
        vec3 best = vec3(99999.0, 0.0, 0.0);
        best = terrainRiverSegment(p, vec2(-575.0, 560.0), vec2(-470.0, 455.0), 0.0000, 0.0907, best);
        best = terrainRiverSegment(p, vec2(-470.0, 455.0), vec2(-360.0, 335.0), 0.0907, 0.1902, best);
        best = terrainRiverSegment(p, vec2(-360.0, 335.0), vec2(-305.0, 210.0), 0.1902, 0.2736, best);
        best = terrainRiverSegment(p, vec2(-305.0, 210.0), vec2(-332.0, 96.0), 0.2736, 0.3452, best);
        best = terrainRiverSegment(p, vec2(-332.0, 96.0), vec2(-274.0, 8.0), 0.3452, 0.4096, best);
        best = terrainRiverSegment(p, vec2(-274.0, 8.0), vec2(-160.0, -52.0), 0.4096, 0.4883, best);
        best = terrainRiverSegment(p, vec2(-160.0, -52.0), vec2(-42.0, -72.0), 0.4883, 0.5614, best);
        best = terrainRiverSegment(p, vec2(-42.0, -72.0), vec2(92.0, -64.0), 0.5614, 0.6434, best);
        best = terrainRiverSegment(p, vec2(92.0, -64.0), vec2(230.0, -86.0), 0.6434, 0.7288, best);
        best = terrainRiverSegment(p, vec2(230.0, -86.0), vec2(420.0, -150.0), 0.7288, 0.8512, best);
        best = terrainRiverSegment(p, vec2(420.0, -150.0), vec2(650.0, -230.0), 0.8512, 1.0000, best);
        return best;
      }

      vec3 terrainCenterWestStreamSample(vec2 p) {
        vec3 best = vec3(99999.0, 0.0, 0.0);
        best = terrainRiverSegment(p, vec2(-340.0, -44.0), vec2(-310.0, -30.0), 0.0000, 0.1864, best);
        best = terrainRiverSegment(p, vec2(-310.0, -30.0), vec2(-282.0, -8.0), 0.1864, 0.3854, best);
        best = terrainRiverSegment(p, vec2(-282.0, -8.0), vec2(-258.0, 2.0), 0.3854, 0.5227, best);
        best = terrainRiverSegment(p, vec2(-258.0, 2.0), vec2(-226.0, 18.0), 0.5227, 0.7114, best);
        best = terrainRiverSegment(p, vec2(-226.0, 18.0), vec2(-194.0, 46.0), 0.7114, 1.0000, best);
        return best;
      }

      vec3 terrainBranchSample(vec2 p) {
        vec3 best = vec3(99999.0, 0.0, 0.0);
        best = terrainRiverSegment(p, vec2(-430.0, 250.0), vec2(-382.0, 174.0), 0.0000, 0.4944, best);
        best = terrainRiverSegment(p, vec2(-382.0, 174.0), vec2(-332.0, 96.0), 0.4944, 1.0000, best);
        best = terrainRiverSegment(p, vec2(-390.0, -94.0), vec2(-330.0, -42.0), 0.0000, 0.5188, best);
        best = terrainRiverSegment(p, vec2(-330.0, -42.0), vec2(-274.0, 8.0), 0.5188, 1.0000, best);
        best = terrainRiverSegment(p, vec2(-160.0, -52.0), vec2(-88.0, -116.0), 0.0000, 0.3528, best);
        best = terrainRiverSegment(p, vec2(-88.0, -116.0), vec2(18.0, -122.0), 0.3528, 0.7430, best);
        best = terrainRiverSegment(p, vec2(18.0, -122.0), vec2(92.0, -64.0), 0.7430, 1.0000, best);
        best = terrainRiverSegment(p, vec2(320.0, 54.0), vec2(270.0, -8.0), 0.0000, 0.4597, best);
        best = terrainRiverSegment(p, vec2(270.0, -8.0), vec2(230.0, -86.0), 0.4597, 1.0000, best);
        best = terrainRiverSegment(p, vec2(-260.0, 210.0), vec2(-218.0, 150.0), 0.0000, 0.2616, best);
        best = terrainRiverSegment(p, vec2(-218.0, 150.0), vec2(-171.0, 100.0), 0.2616, 0.5067, best);
        best = terrainRiverSegment(p, vec2(-171.0, 100.0), vec2(-274.0, 8.0), 0.5067, 1.0000, best);
        best = terrainRiverSegment(p, vec2(-90.0, 170.0), vec2(-128.0, 112.0), 0.0000, 0.2888, best);
        best = terrainRiverSegment(p, vec2(-128.0, 112.0), vec2(-160.0, 40.0), 0.2888, 0.6169, best);
        best = terrainRiverSegment(p, vec2(-160.0, 40.0), vec2(-160.0, -52.0), 0.6169, 1.0000, best);
        best = terrainRiverSegment(p, vec2(-520.0, 70.0), vec2(-430.0, 20.0), 0.0000, 0.4667, best);
        best = terrainRiverSegment(p, vec2(-430.0, 20.0), vec2(-330.0, -42.0), 0.4667, 1.0000, best);
        best = terrainRiverSegment(p, vec2(-240.0, -210.0), vec2(-170.0, -150.0), 0.0000, 0.5095, best);
        best = terrainRiverSegment(p, vec2(-170.0, -150.0), vec2(-88.0, -116.0), 0.5095, 1.0000, best);
        best = terrainRiverSegment(p, vec2(170.0, 155.0), vec2(220.0, 70.0), 0.0000, 0.5156, best);
        best = terrainRiverSegment(p, vec2(220.0, 70.0), vec2(270.0, -8.0), 0.5156, 1.0000, best);
        best = terrainRiverSegment(p, vec2(420.0, -20.0), vec2(340.0, -70.0), 0.0000, 0.4591, best);
        best = terrainRiverSegment(p, vec2(340.0, -70.0), vec2(230.0, -86.0), 0.4591, 1.0000, best);
        return best;
      }

      vec3 terrainGullySegment(vec2 p, vec2 a, vec2 b, float wet, vec3 best) {
        vec2 ab = b - a;
        float lenSq = max(dot(ab, ab), 0.0001);
        float h = clamp(dot(p - a, ab) / lenSq, 0.0, 1.0);
        vec2 c = a + ab * h;
        float d = length(p - c);
        if (d < best.x) best = vec3(d, wet, 1.0);
        return best;
      }

      vec3 terrainGullySample(vec2 p) {
        vec3 best = vec3(99999.0, 0.0, 0.0);
        best = terrainGullySegment(p, vec2(-250.0, 180.0), vec2(-220.0, 138.0), 1.0, best);
        best = terrainGullySegment(p, vec2(-220.0, 138.0), vec2(-171.0, 100.0), 1.0, best);
        best = terrainGullySegment(p, vec2(-171.0, 100.0), vec2(-128.0, 70.0), 1.0, best);
        best = terrainGullySegment(p, vec2(-330.0, 155.0), vec2(-260.0, 116.0), 0.0, best);
        best = terrainGullySegment(p, vec2(-260.0, 116.0), vec2(-205.0, 82.0), 0.0, best);
        best = terrainGullySegment(p, vec2(-205.0, 82.0), vec2(-160.0, 40.0), 0.0, best);
        best = terrainGullySegment(p, vec2(-50.0, 155.0), vec2(-82.0, 110.0), 0.0, best);
        best = terrainGullySegment(p, vec2(-82.0, 110.0), vec2(-128.0, 75.0), 0.0, best);
        best = terrainGullySegment(p, vec2(-128.0, 75.0), vec2(-160.0, 40.0), 0.0, best);
        best = terrainGullySegment(p, vec2(-210.0, 60.0), vec2(-180.0, 20.0), 1.0, best);
        best = terrainGullySegment(p, vec2(-180.0, 20.0), vec2(-160.0, -52.0), 1.0, best);
        best = terrainGullySegment(p, vec2(-22.0, 132.0), vec2(-30.0, 70.0), 0.0, best);
        best = terrainGullySegment(p, vec2(-30.0, 70.0), vec2(-42.0, -72.0), 0.0, best);
        best = terrainGullySegment(p, vec2(80.0, 150.0), vec2(145.0, 84.0), 1.0, best);
        best = terrainGullySegment(p, vec2(145.0, 84.0), vec2(220.0, 70.0), 1.0, best);
        best = terrainGullySegment(p, vec2(20.0, 120.0), vec2(78.0, 55.0), 0.0, best);
        best = terrainGullySegment(p, vec2(78.0, 55.0), vec2(92.0, -64.0), 0.0, best);
        best = terrainGullySegment(p, vec2(190.0, 120.0), vec2(240.0, 45.0), 0.0, best);
        best = terrainGullySegment(p, vec2(240.0, 45.0), vec2(270.0, -8.0), 0.0, best);
        best = terrainGullySegment(p, vec2(-300.0, -180.0), vec2(-230.0, -130.0), 0.0, best);
        best = terrainGullySegment(p, vec2(-230.0, -130.0), vec2(-170.0, -150.0), 0.0, best);
        best = terrainGullySegment(p, vec2(-80.0, -210.0), vec2(-88.0, -116.0), 1.0, best);
        best = terrainGullySegment(p, vec2(-520.0, 150.0), vec2(-440.0, 90.0), 0.0, best);
        best = terrainGullySegment(p, vec2(-440.0, 90.0), vec2(-430.0, 20.0), 0.0, best);
        best = terrainGullySegment(p, vec2(-235.0, 140.0), vec2(-171.0, 100.0), 1.0, best);
        best = terrainGullySegment(p, vec2(-171.0, 100.0), vec2(-160.0, 40.0), 1.0, best);
        return best;
      }
    ` + shader.fragmentShader
    .replace(
      '#include <map_fragment>',
      `
      vec2 dirtUv = terrainDirtUv();
      vec2 rockUv = terrainRockUv();
      vec4 dirtColor = texture2D(map, dirtUv);
      vec4 rockColor = texture2D(uRockMap, rockUv);
      vec3 debrisColor = texture2D(uDebrisMap, dirtUv * 0.46 + vec2(0.17, 0.09)).rgb;
      float rockMask = terrainRockMask();
      float dampMask = terrainDampMask() * (1.0 - rockMask);
      float debrisMask = smoothstep(0.55, 0.9, terrainNoise(vWorldPos.xz * 0.13 + vec2(6.2, 1.4))) * (1.0 - rockMask) * 0.22;

      vec3 dirt = mix(dirtColor.rgb, dirtColor.rgb * vec3(0.52, 0.56, 0.58), dampMask * 0.5);
      dirt = mix(dirt, debrisColor * vec3(0.72, 0.68, 0.58), debrisMask);
      vec3 rock = rockColor.rgb * vec3(0.82, 0.84, 0.78);
      vec3 terrainColor = mix(dirt, rock, rockMask);
      vec3 riverSample = terrainRiverSample(vWorldPos.xz);
      float riverWidth = mix(3.6, 7.2, pow(riverSample.y, 0.72));
      float riverBank = (1.0 - smoothstep(riverWidth + 1.5, riverWidth + 18.0, riverSample.x)) * smoothstep(riverWidth - 1.2, riverWidth + 4.5, riverSample.x);
      float riverWetEdge = 1.0 - smoothstep(riverWidth - 0.4, riverWidth + 2.6, riverSample.x);
      float riverBankNoise = terrainNoise(vWorldPos.xz * 0.38 + vec2(2.7, 8.1));
      vec3 riverClay = vec3(0.43, 0.43, 0.38) * (0.84 + riverBankNoise * 0.24);
      vec3 wetMud = vec3(0.18, 0.16, 0.12) * (0.88 + riverBankNoise * 0.18);
      terrainColor = mix(terrainColor, riverClay, riverBank * 0.58);
      terrainColor = mix(terrainColor, wetMud, riverWetEdge * 0.58);
      float centralRiverBelt = exp(-pow((riverSample.y - 0.56) / 0.25, 2.0));
      float centralRiverWidth = mix(4.8, 7.8, pow(riverSample.y, 0.62)) + centralRiverBelt * 3.2;
      float centralWetEdge = 1.0 - smoothstep(centralRiverWidth - 0.35, centralRiverWidth + 3.0, riverSample.x);
      float centralPointBar = (1.0 - smoothstep(centralRiverWidth + 3.0, centralRiverWidth + 24.0, riverSample.x)) * smoothstep(centralRiverWidth + 0.8, centralRiverWidth + 8.0, riverSample.x);
      float centralFloodplain = (1.0 - smoothstep(centralRiverWidth + 26.0, centralRiverWidth + 92.0 + centralRiverBelt * 38.0, riverSample.x)) * smoothstep(centralRiverWidth + 14.0, centralRiverWidth + 42.0, riverSample.x);
      float centralRiverNoise = terrainNoise(vWorldPos.xz * 0.31 + vec2(6.4, 3.9));
      vec3 centralSand = vec3(0.48, 0.44, 0.34) * (0.86 + centralRiverNoise * 0.24);
      vec3 centralFloodplainGreen = vec3(0.25, 0.34, 0.20) * (0.82 + centralRiverNoise * 0.20);
      terrainColor = mix(terrainColor, centralSand, centralPointBar * 0.50);
      terrainColor = mix(terrainColor, centralFloodplainGreen, centralFloodplain * 0.34);
      terrainColor = mix(terrainColor, wetMud * 0.82, centralWetEdge * 0.68);
      vec3 branchSample = terrainBranchSample(vWorldPos.xz);
      float branchWidth = mix(1.35, 3.0, branchSample.y) + sin(branchSample.y * 3.14159265) * 0.35;
      float branchWetEdge = 1.0 - smoothstep(branchWidth - 0.2, branchWidth + 2.6, branchSample.x);
      float branchBank = (1.0 - smoothstep(branchWidth + 2.0, branchWidth + 15.0, branchSample.x)) * smoothstep(branchWidth + 0.6, branchWidth + 5.5, branchSample.x);
      float branchLowland = (1.0 - smoothstep(branchWidth + 10.0, branchWidth + 30.0, branchSample.x)) * smoothstep(branchWidth + 5.0, branchWidth + 14.0, branchSample.x);
      float branchNoise = terrainNoise(vWorldPos.xz * 0.52 + vec2(4.2, 15.8));
      vec3 branchGravel = vec3(0.40, 0.38, 0.31) * (0.84 + branchNoise * 0.22);
      vec3 branchWetMud = vec3(0.13, 0.12, 0.085) * (0.84 + branchNoise * 0.20);
      vec3 branchLowGrass = vec3(0.19, 0.27, 0.16) * (0.86 + branchNoise * 0.18);
      terrainColor = mix(terrainColor, branchGravel, branchBank * 0.48);
      terrainColor = mix(terrainColor, branchLowGrass, branchLowland * 0.28);
      terrainColor = mix(terrainColor, branchWetMud, branchWetEdge * 0.62);
      vec3 gullySample = terrainGullySample(vWorldPos.xz);
      float gullyCore = 1.0 - smoothstep(2.4, 7.0, gullySample.x);
      float gullyApron = (1.0 - smoothstep(8.0, 34.0, gullySample.x)) * smoothstep(3.0, 12.0, gullySample.x);
      float gullyNoise = terrainNoise(vWorldPos.xz * 0.6 + vec2(8.8, 1.9));
      vec3 gullyGravel = vec3(0.43, 0.41, 0.34) * (0.86 + gullyNoise * 0.22);
      vec3 wetCut = vec3(0.16, 0.145, 0.10) * (0.86 + gullyNoise * 0.20);
      vec3 gullyGrass = vec3(0.20, 0.29, 0.16) * (0.86 + gullyNoise * 0.16);
      terrainColor = mix(terrainColor, gullyGravel, gullyApron * 0.22);
      terrainColor = mix(terrainColor, wetCut, gullyCore * 0.66);
      terrainColor = mix(terrainColor, gullyGrass, gullyApron * 0.26);
      vec2 snowP = vWorldPos.xz;
      float snowRegionA = 1.0 - smoothstep(0.58, 1.34, length((snowP - vec2(-530.0, 545.0)) / vec2(240.0, 210.0)));
      float snowRegionB = 1.0 - smoothstep(0.58, 1.34, length((snowP - vec2(-305.0, 650.0)) / vec2(230.0, 190.0)));
      float snowRegionC = 1.0 - smoothstep(0.58, 1.34, length((snowP - vec2(-690.0, 330.0)) / vec2(190.0, 250.0)));
      float snowRegionD = 1.0 - smoothstep(0.58, 1.34, length((snowP - vec2(-120.0, 500.0)) / vec2(260.0, 230.0)));
      float snowRegion = clamp(max(max(snowRegionA, snowRegionB), max(snowRegionC, snowRegionD)), 0.0, 1.0);
      float snowMountainMask = snowRegion * smoothstep(34.0, 82.0, vWorldPos.y);
      float highAlpineMask = snowRegion * smoothstep(108.0, 196.0, vWorldPos.y);
      float slopeMask = terrainSlopeMask();
      float snowPatchNoise = terrainNoise(vWorldPos.xz * 0.032 + vec2(7.4, 13.1));
      float windSnowNoise = terrainNoise(vWorldPos.xz * 0.18 + vec2(2.6, 9.8));
      vec3 alpineRock = mix(vec3(0.43, 0.45, 0.46), vec3(0.62, 0.65, 0.66), terrainNoise(vWorldPos.xz * 0.18));
      alpineRock = mix(alpineRock, vec3(0.34, 0.38, 0.42), slopeMask * 0.36);
      alpineRock *= vec3(0.86, 0.93, 1.0) * (0.92 + terrainNoise(vWorldPos.xz * 0.46) * 0.10);
      terrainColor = mix(terrainColor, alpineRock, snowMountainMask * (1.0 - highAlpineMask * 0.32));
      float settledSnow = snowRegion * smoothstep(42.0, 112.0, vWorldPos.y) * (1.0 - smoothstep(0.18, 0.70, slopeMask));
      float streakSnow = smoothstep(72.0, 150.0, vWorldPos.y)
        * smoothstep(0.45, 0.78, snowPatchNoise + windSnowNoise * 0.24)
        * (1.0 - smoothstep(0.74, 1.0, slopeMask));
      streakSnow *= snowRegion;
      float summitSnow = highAlpineMask * 0.86;
      float snowMask = clamp(max(settledSnow, streakSnow) + summitSnow, 0.0, 1.0);
      vec3 snowColor = vec3(0.92, 0.96, 0.98) * (0.96 + terrainNoise(vWorldPos.xz * 0.46) * 0.06);
      snowColor = mix(snowColor, vec3(0.80, 0.87, 0.93), slopeMask * 0.16);
      terrainColor = mix(terrainColor, snowColor, snowMask);
      terrainColor *= 0.92 + terrainNoise(vWorldPos.xz * 1.35) * 0.12;
      diffuseColor *= vec4(terrainColor, dirtColor.a);
      `
    )
    .replace(
      '#include <normal_fragment_maps>',
      `
      #ifdef USE_NORMALMAP_OBJECTSPACE

        normal = texture2D(normalMap, terrainDirtUv()).xyz * 2.0 - 1.0;

        #ifdef FLIP_SIDED
          normal = -normal;
        #endif

        #ifdef DOUBLE_SIDED
          normal = normal * faceDirection;
        #endif

        normal = normalize(normalMatrix * normal);

      #elif defined(USE_NORMALMAP_TANGENTSPACE)

        vec3 dirtN = texture2D(normalMap, terrainDirtUv()).xyz * 2.0 - 1.0;
        vec3 rockN = texture2D(uRockNormalMap, terrainRockUv()).xyz * 2.0 - 1.0;
        vec3 mapN = normalize(mix(dirtN, rockN, terrainRockMask()));
        mapN.xy *= normalScale;

        normal = normalize(tbn * mapN);

      #elif defined(USE_BUMPMAP)

        normal = perturbNormalArb(-vViewPosition, normal, dHdxy_fwd(), faceDirection);

      #endif
      `
    )
    .replace(
      '#include <roughnessmap_fragment>',
      `
      float roughnessFactor = roughness;

      #ifdef USE_ROUGHNESSMAP
        float dirtRoughness = texture2D(roughnessMap, terrainDirtUv()).g;
        float rockRoughness = texture2D(uRockRoughnessMap, terrainRockUv()).g;
        roughnessFactor *= mix(dirtRoughness, rockRoughness, terrainRockMask());
        roughnessFactor = clamp(roughnessFactor + terrainDampMask() * 0.05, 0.72, 1.0);
      #endif
      `
    )
    .replace(
      '#include <aomap_fragment>',
      `
      #ifdef USE_AOMAP
        float dirtAo = texture2D(aoMap, terrainDirtUv()).r;
        float rockAo = texture2D(uRockAoMap, terrainRockUv()).r;
        float ambientOcclusion = (mix(dirtAo, rockAo, terrainRockMask()) - 1.0) * aoMapIntensity + 1.0;

        reflectedLight.indirectDiffuse *= ambientOcclusion;

        #if defined(USE_CLEARCOAT)
          clearcoatSpecularIndirect *= ambientOcclusion;
        #endif

        #if defined(USE_SHEEN)
          sheenSpecularIndirect *= ambientOcclusion;
        #endif

        #if defined(USE_ENVMAP) && defined(STANDARD)
          float dotNV = saturate(dot(geometryNormal, geometryViewDir));
          reflectedLight.indirectSpecular *= computeSpecularOcclusion(dotNV, ambientOcclusion, material.roughness);
        #endif
      #endif
      `
    )
  }

  mat.customProgramCacheKey = () => 'terrain-dirt-rock-pbr-v3'
  return mat
}

function createDistantTerrainProxyMaterial(texLoader) {
  const map = texLoader.load('/textures/souls_terrain/Ground103_1K-JPG_Color.jpg')
  map.wrapS = map.wrapT = THREE.RepeatWrapping
  map.repeat.set(16, 16)
  map.anisotropy = 4
  map.colorSpace = THREE.SRGBColorSpace

  return new THREE.MeshBasicMaterial({
    map,
    color: 0x8a8778,
    fog: true,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  })
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

export function getGroundHeight(x, z, playerY = null) {
  if (playerY !== null && playerY < -0.25 && isInsideMineCaveUndergroundPath(x, z)) {
    return MINE_CAVE.bottomY
  }
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
  inst.castShadow = false
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
      if (c.isMesh) { c.castShadow = false; c.receiveShadow = false }
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
      if (c.isMesh) { c.castShadow = false; c.receiveShadow = true }
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
  eave.castShadow = false
  group.add(eave)

  // 烟囱
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.0, 0.35), stoneMat)
  chimney.position.set(0.7, 3.2, -0.4)
  chimney.castShadow = false
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

function makeWaterSplashTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 96
  canvas.height = 96
  const ctx = canvas.getContext('2d')
  const c = 48
  const gradient = ctx.createRadialGradient(c, c, 0, c, c, 42)
  gradient.addColorStop(0, 'rgba(235,250,255,0.92)')
  gradient.addColorStop(0.32, 'rgba(210,238,250,0.55)')
  gradient.addColorStop(0.72, 'rgba(180,220,238,0.16)')
  gradient.addColorStop(1, 'rgba(180,220,238,0)')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(c, c, 42, 0, Math.PI * 2)
  ctx.fill()
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

function createHeroRiverMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: `
      varying vec2 vUv;
      varying float vEdge;
      varying float vFlow;
      varying vec3 vWorldPos;
      varying vec3 vViewDir;
      void main() {
        vUv = uv;
        vEdge = abs(uv.x - 0.5) * 2.0;
        vFlow = uv.y;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        vViewDir = normalize(cameraPosition - worldPos.xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform float uTime;
      varying vec2 vUv;
      varying float vEdge;
      varying float vFlow;
      varying vec3 vWorldPos;
      varying vec3 vViewDir;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) {
          v += noise(p) * a;
          p = p * 2.03 + vec2(17.2, 9.4);
          a *= 0.5;
        }
        return v;
      }

      float waterHeight(vec2 p, float time) {
        vec2 flowA = vec2(p.y * 0.030 - time * 0.44, p.x * 0.085 + time * 0.035);
        vec2 flowB = vec2(p.y * 0.058 - time * 0.82, p.x * 0.135 - time * 0.060);
        float broad = fbm(flowA) * 0.62;
        float detail = fbm(flowB) * 0.28;
        float cross = sin(p.x * 0.18 + p.y * 0.045 - time * 2.2) * 0.10;
        return broad + detail + cross;
      }

      void main() {
        vec2 world = vWorldPos.xz;
        float time = uTime;
        float flow = vFlow * 18.0 - time * 2.45;
        float side = abs(vUv.x - 0.5) * 2.0;
        float center = 1.0 - smoothstep(0.04, 0.55, side);
        float edge = smoothstep(0.66, 1.0, vEdge);

        float h = waterHeight(world, time);
        float hX = waterHeight(world + vec2(0.85, 0.0), time);
        float hZ = waterHeight(world + vec2(0.0, 0.85), time);
        vec3 normal = normalize(vec3((h - hX) * 1.25, 1.0, (h - hZ) * 1.25));

        vec3 viewDir = normalize(vViewDir);
        vec3 lightDir = normalize(vec3(-0.35, 0.78, 0.48));
        vec3 halfDir = normalize(lightDir + viewDir);
        float fresnel = pow(1.0 - clamp(dot(normal, viewDir), 0.0, 1.0), 3.0);
        float spec = pow(max(dot(normal, halfDir), 0.0), 72.0);

        float ripple = sin(flow + vUv.x * 9.5 + h * 2.4) * 0.5 + 0.5;
        float fine = fbm(vec2(vUv.x * 9.5, vFlow * 0.62 - time * 0.34));
        float rapidNoise = fbm(vec2(vFlow * 0.42 - time * 0.28, vUv.x * 4.4 + h));
        float rapid = smoothstep(0.56, 0.88, rapidNoise) * (0.32 + ripple * 0.38);
        float streakWave = sin(flow * 2.1 + fine * 5.8 + h * 4.0) * 0.5 + 0.5;
        float streak = smoothstep(0.66, 0.94, streakWave) * rapid * (0.30 + center * 0.70);

        float edgeFoamNoise = fbm(vec2(vFlow * 0.55 - time * 0.42, vUv.x * 7.2 + time * 0.08));
        float foamLine = edge * smoothstep(0.38, 0.86, edgeFoamNoise + ripple * 0.20);
        float brokenFoam = smoothstep(0.72, 0.96, rapidNoise + fine * 0.28) * rapid;
        float foamMask = clamp(foamLine * 0.86 + streak * 0.72 + brokenFoam * center * 0.46, 0.0, 1.0);

        vec3 deep = vec3(0.018, 0.105, 0.125);
        vec3 shallow = vec3(0.115, 0.300, 0.300);
        vec3 glint = vec3(0.46, 0.68, 0.76);
        vec3 foam = vec3(0.78, 0.90, 0.88);
        float shallowMix = clamp(edge * 0.45 + h * 0.32 + fine * 0.18 + 0.22, 0.0, 1.0);
        vec3 color = mix(deep, shallow, shallowMix);
        color = mix(color, glint, fresnel * (0.30 + center * 0.18));
        color += vec3(0.88, 0.96, 0.94) * spec * (0.28 + fresnel * 0.42);
        color = mix(color, foam, foamMask);

        float alpha = 0.42 + edge * 0.12 + foamMask * 0.30 + fresnel * 0.16;
        alpha *= 1.0 - smoothstep(0.96, 1.0, vEdge) * 0.28;
        gl_FragColor = vec4(color, alpha);
      }
    `,
  })
}

function buildRiverStripGeometry(points, getSampleAt, { widthPad = 0.45, stepDistance = 14 } = {}) {
  const verts = []
  const uvs = []
  const idx = []
  let row = 0
  let flowV = 0
  let prev = null
  const samples = []
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    const steps = Math.max(8, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / stepDistance))
    for (let j = 0; j <= steps; j++) {
      if (i > 0 && j === 0) continue
      const t = j / steps
      const x = THREE.MathUtils.lerp(a.x, b.x, t)
      const z = THREE.MathUtils.lerp(a.z, b.z, t)
      samples.push(getSampleAt(x, z))
    }
  }

  for (const sample of samples) {
    if (prev) flowV += Math.hypot(sample.x - prev.x, sample.z - prev.z) * 0.018
    prev = sample
    const halfWidth = sample.halfWidth + widthPad
    const rightX = -sample.dirZ
    const rightZ = sample.dirX
    const y = sample.waterY + 0.08
    verts.push(
      sample.x - rightX * halfWidth, y, sample.z - rightZ * halfWidth,
      sample.x + rightX * halfWidth, y, sample.z + rightZ * halfWidth,
    )
    const whitewaterUv = THREE.MathUtils.clamp(sample.whitewater, 0, 1)
    uvs.push(0, flowV + whitewaterUv * 0.18, 1, flowV + whitewaterUv * 0.18)
    if (row < samples.length - 1) {
      const a = row * 2
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
    row += 1
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(idx)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function buildHeroRiverGeometry() {
  return buildRiverStripGeometry(HERO_RIVER_POINTS, getRiverSampleAt, { widthPad: 0.45, stepDistance: 14 })
}

function buildCenterWestStreamGeometry() {
  return buildRiverStripGeometry(CENTER_WEST_STREAM_POINTS, getCenterWestStreamSampleAt, { widthPad: 0.12, stepDistance: 8 })
}

function buildRiverBranchGeometry(branch) {
  return buildRiverStripGeometry(branch.points, (x, z) => getBranchSampleAt(branch, x, z), { widthPad: 0.08, stepDistance: 7 })
}

function buildGullyStreamGeometry(gully) {
  return buildRiverStripGeometry(gully.points, (x, z) => getGullyStreamSampleAt(gully, x, z), { widthPad: 0.05, stepDistance: 6 })
}

function createRiverSystem(scene, getTerrainHeight) {
  const material = createHeroRiverMaterial()
  const mesh = new THREE.Mesh(buildHeroRiverGeometry(), material)
  mesh.name = 'hero_style_flowing_river'
  mesh.frustumCulled = true
  scene.add(mesh)

  const splashTexture = makeWaterSplashTexture()
  const splashMaterial = new THREE.SpriteMaterial({
    map: splashTexture,
    color: 0xd8f3ff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  })
  const splashes = Array.from({ length: 96 }, () => {
    const sprite = new THREE.Sprite(splashMaterial.clone())
    sprite.visible = false
    sprite.frustumCulled = false
    scene.add(sprite)
    return {
      sprite,
      active: false,
      age: 0,
      life: 0.8,
      velocity: new THREE.Vector3(),
      scale: 0.8,
    }
  })
  const splashSources = HERO_RIVER_POINTS
    .slice(1, -1)
    .map(point => getRiverSampleAt(point.x, point.z))
    .filter(sample => sample.whitewater > 0.35 || sample.t < 0.42)
  let splashCursor = 0
  let emitCarry = 0

  function spawnSplash(sample, strength = 1) {
    const state = splashes[splashCursor]
    splashCursor = (splashCursor + 1) % splashes.length
    state.active = true
    state.age = 0
    state.life = THREE.MathUtils.lerp(0.42, 0.95, Math.min(1, strength))
    state.scale = THREE.MathUtils.lerp(0.45, 1.6, Math.min(1, strength))
    state.velocity.set(
      (Math.random() - 0.5) * 0.9 - sample.dirX * 0.18,
      0.45 + Math.random() * 0.85,
      (Math.random() - 0.5) * 0.9 - sample.dirZ * 0.18,
    )
    state.sprite.position.set(
      sample.x + (Math.random() - 0.5) * sample.halfWidth * 1.4,
      sample.waterY + 0.25,
      sample.z + (Math.random() - 0.5) * sample.halfWidth * 1.4,
    )
    state.sprite.scale.setScalar(state.scale)
    state.sprite.material.opacity = 0.62
    state.sprite.visible = true
  }

  function sampleRiver(x, z) {
    const sample = getRiverSampleAt(x, z)
    const terrainY = getTerrainHeight(x, z)
    const depth = Math.max(0, sample.waterY - terrainY)
    const inWater = sample.distance <= sample.halfWidth && depth > 0.03
    return {
      ...sample,
      inWater,
      depth,
    }
  }

  function update(time, dt = 0, playerPosition = null) {
    material.uniforms.uTime.value = time
    const step = Math.min(Math.max(dt, 0), 0.05)
    const player = playerPosition ?? { x: 0, z: 0 }
    emitCarry += step * 10
    if (emitCarry >= 1) {
      const count = Math.min(5, Math.floor(emitCarry))
      emitCarry -= count
      for (let i = 0; i < count; i++) {
        const source = splashSources[(Math.floor(time * 3) + i) % Math.max(1, splashSources.length)]
        if (!source) continue
        if (Math.hypot(player.x - source.x, player.z - source.z) > 230) continue
        spawnSplash(source, 0.62 + source.whitewater * 0.55)
      }
    }

    const playerSample = sampleRiver(player.x ?? 0, player.z ?? 0)
    if (playerSample.inWater && playerSample.flowSpeed > 1.2) spawnSplash(playerSample, Math.min(1, playerSample.flowSpeed / 3.2))

    for (const state of splashes) {
      if (!state.active) continue
      state.age += step
      const t = state.age / state.life
      if (t >= 1) {
        state.active = false
        state.sprite.visible = false
        state.sprite.material.opacity = 0
        continue
      }
      state.velocity.y -= 2.2 * step
      state.sprite.position.addScaledVector(state.velocity, step)
      const fade = Math.sin(Math.PI * t)
      state.sprite.material.opacity = 0.62 * fade * fade
      state.sprite.scale.setScalar(state.scale * (1 + t * 1.3))
    }
  }

  return {
    mesh,
    update,
    sampleRiver,
  }
}

function createRiverBranchSystems(scene, getTerrainHeight) {
  const systems = RIVER_BRANCHES.map((branch) => {
    const material = createHeroRiverMaterial()
    const mesh = new THREE.Mesh(buildRiverBranchGeometry(branch), material)
    mesh.name = `river_branch_${branch.id}`
    mesh.frustumCulled = true
    scene.add(mesh)

    function sampleRiver(x, z) {
      const sample = getBranchSampleAt(branch, x, z)
      const terrainY = getTerrainHeight(x, z)
      const depth = Math.max(0, sample.waterY - terrainY)
      const inWater = sample.distance <= sample.halfWidth && depth > 0.03
      return {
        ...sample,
        inWater,
        depth,
      }
    }

    return {
      branch,
      mesh,
      update(time) {
        material.uniforms.uTime.value = time * (branch.sideChannel ? 0.58 : 0.76)
      },
      sampleRiver,
    }
  })

  return {
    systems,
    update(time) {
      systems.forEach(system => system.update(time))
    },
    sampleRiver(x, z) {
      let best = null
      for (const system of systems) {
        const sample = system.sampleRiver(x, z)
        if (!best || (sample.inWater && !best.inWater) || (sample.inWater === best.inWater && sample.depth > best.depth)) {
          best = sample
        }
      }
      return best
    },
  }
}

function createGullyStreamSystems(scene, getTerrainHeight) {
  const systems = EROSION_GULLIES.map((gully) => {
    const material = createHeroRiverMaterial()
    const mesh = new THREE.Mesh(buildGullyStreamGeometry(gully), material)
    mesh.name = `gully_stream_${gully.id}`
    mesh.frustumCulled = true
    scene.add(mesh)

    function sampleRiver(x, z) {
      const sample = getGullyStreamSampleAt(gully, x, z)
      const terrainY = getTerrainHeight(x, z)
      const depth = Math.max(0, sample.waterY - terrainY)
      const inWater = sample.distance <= sample.halfWidth && depth > 0.025
      return {
        ...sample,
        inWater,
        depth,
      }
    }

    return {
      gully,
      mesh,
      update(time) {
        material.uniforms.uTime.value = time * 0.62
      },
      sampleRiver,
    }
  })

  return {
    systems,
    update(time) {
      systems.forEach(system => system.update(time))
    },
    sampleRiver(x, z) {
      let best = null
      for (const system of systems) {
        const sample = system.sampleRiver(x, z)
        if (!best || (sample.inWater && !best.inWater) || (sample.inWater === best.inWater && sample.depth > best.depth)) {
          best = sample
        }
      }
      return best
    },
  }
}

function createCenterWestStreamSystem(scene, getTerrainHeight) {
  const material = createHeroRiverMaterial()
  const mesh = new THREE.Mesh(buildCenterWestStreamGeometry(), material)
  mesh.name = 'center_west_shallow_stream'
  mesh.frustumCulled = true
  scene.add(mesh)

  function sampleRiver(x, z) {
    const sample = getCenterWestStreamSampleAt(x, z)
    const terrainY = getTerrainHeight(x, z)
    const depth = Math.max(0, sample.waterY - terrainY)
    const inWater = sample.distance <= sample.halfWidth && depth > 0.03
    return {
      ...sample,
      inWater,
      depth,
    }
  }

  return {
    mesh,
    update(time) {
      material.uniforms.uTime.value = time * 0.72
    },
    sampleRiver,
  }
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
  mesh.castShadow = false
  mesh.receiveShadow = true
  scene.add(mesh)
}

function buildCanyonDetails(scene) {
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x4c4942, roughness: 1, flatShading: true })
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x10140c, roughness: 1 })

  for (let i = 0; i < 72; i++) {
    const t = i / 71
    const x = THREE.MathUtils.lerp(CANYON.startX - 10, CANYON.endX + 14, t)
    const centerZ = canyonCenterZ(x)
    const side = i % 2 === 0 ? -1 : 1
    const lateral = CANYON.walkHalfWidth + 3 + (i % 5) * 2.4 + Math.abs(Math.sin(i * 1.7)) * 2.2
    const z = centerZ + side * lateral
    const rockX = x + Math.sin(i * 2.4) * 1.8
    if (isInCanyonForestReplacementRange(rockX)) continue

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
    rock.castShadow = false
    rock.receiveShadow = true
    scene.add(rock)

    if (i % 2 === 0) {
      const grassX = x + Math.cos(i) * 2.1
      const grassZ = centerZ - side * (CANYON.walkHalfWidth + 1.5 + (i % 4))
      const grassHeight = 1.1 + (i % 4) * 0.2
      const grass = new THREE.Mesh(new THREE.ConeGeometry(0.28 + (i % 3) * 0.08, grassHeight, 5), grassMat)
      grass.position.set(grassX, sampleCanyonHeight(grassX, grassZ) + grassHeight * 0.5, grassZ)
      grass.rotation.y = i * 0.53
      grass.castShadow = false
      scene.add(grass)
    }
  }
}

function buildCanyon(scene, collidables) {
  buildCanyonDetails(scene)

  const markerMat = new THREE.MeshStandardMaterial({ color: 0x262728, roughness: 0.95 })
  for (let i = 0; i < 20; i++) {
    const t = i / 19
    const x = THREE.MathUtils.lerp(CANYON.startX - 10, CANYON.endX + 14, t)
    if (isInCanyonForestReplacementRange(x)) continue

    const z = canyonCenterZ(x)
    const side = i % 2 === 0 ? -1 : 1
    const pillarZ = z + side * (CANYON.wallHalfGap + 14 + (i % 4) * 2.2)
    const pillarHeight = 4.2 + (i % 5) * 1.1
    const pillar = new THREE.Mesh(new THREE.ConeGeometry(1.4 + (i % 3) * 0.45, pillarHeight, 6), markerMat)
    pillar.position.set(x, sampleCanyonHeight(x, pillarZ) + pillarHeight * 0.5 - 0.18, pillarZ)
    pillar.rotation.set(0.15 * side, (i * 0.83) % (Math.PI * 2), -0.08 * side)
    pillar.castShadow = false
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
  const distantProxyMat = createDistantTerrainProxyMaterial(texLoader)
  let riverSystem = null
  let riverBranchSystems = null
  let gullyStreamSystems = null
  let centerWestStreamSystem = null
  const terrainController = createHeightmapTerrain(scene, {
    material: groundMat,
    size: WORLD_SIZE,
    chunkSize: TERRAIN_CHUNK_SIZE,
    chunkSegments: TERRAIN_CHUNK_SEGMENTS,
    activeRadius: TERRAIN_ACTIVE_RADIUS,
    preloadRadius: TERRAIN_PRELOAD_RADIUS,
    distantProxyMaterial: distantProxyMat,
    distantProxySegments: TERRAIN_DISTANT_PROXY_SEGMENTS,
    distantProxyYOffset: TERRAIN_DISTANT_PROXY_Y_OFFSET,
    maxHeight: 24,
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
    heightModifiers: [
      applyLargeWorldHeight,
      applyLargeRiverValleyHeight,
      applySnowMountainHeight,
      applyHeroRiverHeight,
      applyRiverBranchHeight,
      applyGullyNetworkHeight,
      applyCastleApproachHeight,
      applyMountainEdgeHeight,
    ],
    postHeightModifiers: [applyMineCaveHeight],
    holeMasks: [
      {
        x: MINE_CAVE.x,
        z: MINE_CAVE.z,
        radius: MINE_CAVE.shaftHoleRadius,
      },
    ],
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
      makeMountainCliffSkirt(scene, sampleHeight, createRockeryMaterial({ dark: true }))
      riverSystem = createRiverSystem(scene, getGroundHeight)
      riverBranchSystems = createRiverBranchSystems(scene, getGroundHeight)
      gullyStreamSystems = createGullyStreamSystems(scene, getGroundHeight)
      loadSpawnGrass(scene)
      loadSpawnGrass60Ref(scene)
      buildIndividualLeafLayer(scene)
    },
  })

  buildCastleApproach(scene, collidables)
  loadMineCave(scene, collidables, onStaticModelReady)
  loadOutdoorLandmarks(scene, collidables, onStaticModelReady)
  loadOldChurchRuins(scene, collidables, onStaticModelReady)
  loadForestGrove(scene, collidables)

  // ── 树木 ─────────────────────────────────────────
  // 仅预加载 GLB 模板，供编辑器/地图文件使用；不再硬编码任何树木位置
  cloneGLTFScene('/models/trees/custom_tree.glb').then((model) => {
    _treeGltfScene = model
    _pendingTreeClones.forEach(({ group, scale }) => {
      const mesh = _treeGltfScene.clone()
      mesh.scale.setScalar(scale * TREE_MODEL_SCALE)
      mesh.traverse(c => { if (c.isMesh) { c.castShadow = false; c.receiveShadow = false } })
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
      mesh.traverse(c => { if (c.isMesh) { c.castShadow = false; c.receiveShadow = true } })
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
  function update(time, playerPosition = null) {
    const dt = Math.min(time - _lastTime, 0.05)
    _lastTime = time
    terrainController.update?.(playerPosition)
    riverSystem?.update(time, dt, playerPosition)
    riverBranchSystems?.update(time, dt, playerPosition)
    gullyStreamSystems?.update(time, dt, playerPosition)
    centerWestStreamSystem?.update(time, dt, playerPosition)
    _spawnGrassWindUniforms.forEach((uniform) => {
      uniform.value = time
    })

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

  return {
    collidables,
    update,
    ponds: [],
    spawnRipple: () => {},
    getTerrainHeight: getGroundHeight,
    sampleRiver: (x, z) => {
      const main = riverSystem?.sampleRiver(x, z)
      const branch = riverBranchSystems?.sampleRiver(x, z)
      const gully = gullyStreamSystems?.sampleRiver(x, z)
      const stream = centerWestStreamSystem?.sampleRiver(x, z)
      if (gully?.inWater && (!main?.inWater || gully.depth >= main.depth) && (!branch?.inWater || gully.depth >= branch.depth) && (!stream?.inWater || gully.depth >= stream.depth)) return gully
      if (branch?.inWater && (!main?.inWater || branch.depth >= main.depth) && (!stream?.inWater || branch.depth >= stream.depth)) return branch
      if (stream?.inWater && (!main?.inWater || stream.depth >= main.depth)) return stream
      if (main?.inWater) return main
      return gully ?? branch ?? stream ?? main ?? { inWater: false, depth: 0, flowSpeed: 0, dirX: 0, dirZ: 0 }
    },
    getNearbyForestPackLabel,
  }
}
