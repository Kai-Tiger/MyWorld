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
  { name: 'fresh2', url: '/models/grass/grass_clump_fresh.glb', lodUrl: '/models/grass/grass_clump_fresh_lod.glb' },
  { name: 'fresh', url: '/models/grass/grass_clump_fresh.glb', lodUrl: '/models/grass/grass_clump_fresh_lod.glb' },
  { name: 'dry', url: '/models/grass/grass_clump_dry.glb', lodUrl: '/models/grass/grass_clump_dry_lod.glb' },
]
// 模型草距离 LOD：块中心到玩家水平距离 < 此值用 3 段高模，否则换 2 段低模（仅切 geometry 指针）
const GRASS_LOD_NEAR_DIST = 60
const GRASS_LOD_INTERVAL = 0.2   // LOD 评估节流（秒）
const SPAWN_GRASS_60_REF_MODEL_URL = '/models/grass/grass_clump_60_ref.glb'
const SPAWN_GRASS_60_REF_PLACEMENT = { x: 2.5, z: 42, rotY: 0.35, scale: 1.15 }
const GROUND_LEAF_TEXTURES = ['/textures/leaf1.png', '/textures/leaf2.png']
const TERRAIN_CHUNK_SIZE = 128
// 顶点间距 128/72≈1.78m（原 56≈2.29m），让网格能更好表现河岸坡度，减少人物/水面穿模
const TERRAIN_CHUNK_SEGMENTS = 72
const TERRAIN_ACTIVE_RADIUS = 2
const TERRAIN_PRELOAD_RADIUS = 3
const TERRAIN_DISTANT_PROXY_SEGMENTS = 24
const TERRAIN_DISTANT_PROXY_Y_OFFSET = -0.08
const GROUND_INDIVIDUAL_LEAF_Y_OFFSET = 0.075
const GROUND_DEBRIS_MAX_GROUND_Y = 7.5
const GROUND_DEBRIS_CLEAR_PADDING = 3.2
const GROUND_LEAVES_PER_TREE = 30
const GROUND_TREE_LEAF_RADIUS_MIN = 1.1
const GROUND_TREE_LEAF_RADIUS_MAX = 3.8
const LOCAL_MODEL_GRASS_PILE_AREA = 5
const LOCAL_MODEL_GRASS_PER_PILE = 39
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
const LOCAL_MODEL_GRASS_Y_OFFSET = -0.10
// 三层模型草统一的形状调整：竖向压扁 + 横向展开 → 叶片更平贴、叶尖间距更大，覆盖更好（不改 glb 几何）
const MODEL_GRASS_FLATTEN_Y = 0.6   // 乘到 scaleY：变矮变平，减小叶片与地面夹角
const MODEL_GRASS_SPREAD_XZ = 1.4   // 乘到 scaleX/scaleZ：叶片横向展开、间距变大
const LOCAL_MODEL_GRASS_SPACING = 0.28
const LOCAL_MODEL_GRASS_JITTER = 0.30
const LOCAL_MODEL_GRASS_SHAPE_SEGMENTS = 10
// 河岸生态草：沿主河 + 全部支流两岸铺草。生态分区：坡顶平台密、河岸斜坡空、露出的干河床稀疏。
const RIVERSIDE_GRASS_ALONG_SPACING = 0.44   // 沿河中心线行走步距（米），密度 +30%
const RIVERSIDE_GRASS_LATERAL_SPACING = 0.42 // 坡顶带横向网格步距（米），密度 +30%
const RIVERSIDE_GRASS_TERRACE_WIDTH = 14.0   // 坡顶平台铺草带宽（米），向外延伸覆盖更大地面
const RIVERSIDE_GRASS_TERRACE_PLATEAU = 0.30 // 内侧满密度占带宽比例，其后向外自然渐稀淡出
const RIVERSIDE_GRASS_SLOPE_MARGIN = 0.5     // 坡顶让出余量，避开下切斜坡肩（米）
const RIVERSIDE_GRASS_BED_PROB = 0.05        // 干河床稀疏几丛的放置概率
const RIVERSIDE_GRASS_BED_SAMPLES = 4        // 每 station 在干河床横向尝试的采样数
const RIVERSIDE_GRASS_JITTER = 0.55          // 位置抖动比例（相对步距）
const RIVERSIDE_GRASS_CHUNK_LEN = 40         // 空间分块边长（米），用于视锥剔除
const RIVERSIDE_GRASS_MAX_INSTANCES = 500000 // 实例上限（效果优先，已大幅抬高）
const RIVERSIDE_GRASS_MAX_GROUND_RISE = 0.85 // 局部坡度守卫：1m 内地面抬升超过此值则跳过（防爬谷壁）
// 草甸草：把整片低谷地面（地面高度 ≤ 7.5m）铺满 3D 模型草，原裸沙地变草地。河岸密草层保留为近水细节层。
const MEADOW_GRASS_SPACING = 0.745           // 全场网格步距（米），密度 +30%（高密铺满）
const MEADOW_GRASS_JITTER = 0.7              // 位置抖动比例（相对步距），打散网格感
const MEADOW_GRASS_CHUNK_LEN = 64            // 空间分块边长（米），比河岸大以压低 draw call
const MEADOW_GRASS_MAX_INSTANCES = 2500000   // 实例上限（效果优先，已大幅抬高）
const MEADOW_GRASS_MAX_GROUND_Y = 26         // 草甸高度上限（米）：覆盖整个高度图丘陵（~24m），陡坡/雪峰靠坡度守卫排除
const MEADOW_GRASS_MAX_GROUND_RISE = 0.85    // 局部坡度守卫：1m 内地面抬升超过此值则跳过（防爬陡坎/谷壁）
const MEADOW_GRASS_RIVER_HANDOFF = 16.5      // 距河道边缘 < 此值跳过：排除水面/斜坡，并在河岸层密度淡出到 0 处接手
const GRASS_FIELD_BOUNDS = OUTDOOR_MOUNTAIN_BOUNDS
const DISTANT_GRASS_MAX_GROUND_Y = 7.5    // 地表高于此值不铺草（草甸/坡度守卫共用）
const GRASS_CAMPFIRE_CLEAR_RADIUS = 4.5
const MODEL_GRASS_FOOTPRINT_PADDING = 2.5
const MINE_CAVE_MODEL_GRASS_PADDING = 4
const MINE_CAVE_CARD_GRASS_PADDING = 4
const GRASS_CAMPFIRE_CLEARINGS = [
  { x: 0, z: 50 },
  { x: 19, z: -66 },
  { x: -18, z: -2 },
  { x: 22, z: 22 },
]
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

// ── 世界级实例化树木散布（铺满全世界，复用草地分块/实例化框架）──
const FOREST_GROVE_HEIGHT_BOOST = 1.8        // 手工林地树/灌木同步加高（岩石不受影响）
const WORLD_TREE_CELL_LEN = 128              // 空间分块边长（米）：每 (cell×模型×子件) 一个 InstancedMesh
const WORLD_TREE_SPACING = 6.5               // 撒点网格步距（米）
const WORLD_TREE_JITTER = 0.75               // 位置抖动比例（相对步距）
const WORLD_TREE_MAX_SLOPE = 1.3             // 每 1.5m 地面起伏上限（超出=崖/陡坡，不种）
const WORLD_TREE_TREELINE_LO = 46            // 树线软带下沿（开始变稀）
const WORLD_TREE_TREELINE_HI = 64            // 树线软带上沿（以上裸岩/雪，不种）
const WORLD_TREE_RIVER_HANDOFF = 6           // 距水道边缘 <此值 不种（避水/河岸）
const WORLD_TREE_HEIGHT_BOOST = 1.8          // 散布树高度倍数（与手工林地一致）
const WORLD_TREE_MAX_INSTANCES = 38000       // 总实例上限（护栏）
const WORLD_TREE_VISIBLE_DIST = 360          // cell 可见距离（外则隐藏，限制 overdraw）
const WORLD_TREE_CLUSTER_THRESHOLD = 0.4     // 林斑噪声阈值（下方=林间空地）
const WORLD_TREE_BUILD_MS_PER_FRAME = 5      // 增量构建每帧预算（毫秒）
const WORLD_TREE_VIS_INTERVAL = 0.25         // cell 可见性评估节流（秒）
const WORLD_TREE_THIN = 0.10                 // 确定性概率剔除比例（减少 ~10% 树）
const WORLD_TREE_GRASS_PER_TREE = 6          // 每棵树脚下补的草簇数
const WORLD_TREE_GRASS_RADIUS = 2.6          // 树下补草散布半径（米）
const WORLD_TREE_MODELS = [                  // 复用 forest_pack 模型 + 基准缩放
  { file: 'tree_01.glb', scale: 0.42 },
  { file: 'tree_02.glb', scale: 0.50 },
  { file: 'tree_03.glb', scale: 0.88 },
  { file: 'tree_04.glb', scale: 0.84 },
  { file: 'background_tree_11.glb', scale: 0.90 },
]
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
// 用 centripetal Catmull-Rom 把折线控制点重采样为平滑曲线点列；曲线过控制点，端点不变。
// 同一密化结果同时驱动地形碳刻、水面网格与碰撞采样，消除 waypoint 处折角。
function resampleRiverPath(points, segmentsPerSpan = 6) {
  if (!points || points.length < 3) return (points || []).map(p => ({ x: p.x, z: p.z }))
  const curve = new THREE.CatmullRomCurve3(
    points.map(p => new THREE.Vector3(p.x, 0, p.z)), false, 'centripetal')
  const n = Math.max(1, (points.length - 1) * segmentsPerSpan)
  return curve.getPoints(n).map(v => ({ x: v.x, z: v.z }))
}

const HERO_RIVER_CONTROL = [
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
// 采样密度 2：平滑曲线（消除折角）同时把每顶点的全路径扫描成本压到基线的 ~2 倍。
// 此路径同时用于碳刻/碰撞/水面网格中心线，并与地形着色器 GLSL 湿泥带（同为密度 2）精确对齐。
const HERO_RIVER_POINTS = resampleRiverPath(HERO_RIVER_CONTROL, 2)
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
    id: 'central_north_rill',
    // 源头从高沙丘 (-90,170)/(-128,112)(床≈+4~5) 裁掉，起点挪进低地形 (-133,100)(床≈-2)，
    // 消除从 +4 一步跌进 -2 河床的 57° 垂直跌水水片。
    points: [
      { x: -133, z: 100 },
      { x: -160, z: 40 },
      { x: -160, z: -52 },
    ],
    halfWidthStart: 1.4,
    halfWidthEnd: 2.7,
    sourceLift: 1.0,
  },
]
// 支流控制点同样平滑；保留原控制点供地形着色器低密度生成 GLSL 采样器
for (const branch of RIVER_BRANCHES) {
  branch.controlPoints = branch.points
  branch.points = resampleRiverPath(branch.points, 3)
}

// 由同一份（密化后）路径生成地形着色器的 GLSL 距离采样器，消除 JS/GLSL 路径重复定义，
// 保证湿泥带在弯道处始终贴合实际碳刻出的水道。GLSL 用较低密度以控制逐像素段数开销。
function formatGlslFloat(n) {
  return n.toFixed(3)
}
function emitTerrainRiverGLSL(fnName, paths) {
  let body = `      vec3 ${fnName}(vec2 p) {\n        vec3 best = vec3(99999.0, 0.0, 0.0);\n`
  for (const pts of paths) {
    if (!pts || pts.length < 2) continue
    const lengths = []
    let total = 0
    for (let i = 0; i < pts.length - 1; i++) {
      total += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].z - pts[i].z)
      lengths.push(total)
    }
    total = Math.max(0.0001, total)
    for (let i = 0; i < pts.length - 1; i++) {
      const t0 = (i === 0 ? 0 : lengths[i - 1]) / total
      const t1 = lengths[i] / total
      const a = pts[i]
      const b = pts[i + 1]
      body += `        best = terrainRiverSegment(p, vec2(${formatGlslFloat(a.x)}, ${formatGlslFloat(a.z)}), vec2(${formatGlslFloat(b.x)}, ${formatGlslFloat(b.z)}), ${t0.toFixed(4)}, ${t1.toFixed(4)}, best);\n`
    }
  }
  body += `        return best;\n      }\n`
  return body
}
// 性能：GLSL 逐像素遍历这些线段，是每帧全屏地形的恒定开销。只让主河平滑（用户实际看到的那条），
// 且用较低密度；支流/中心溪的泥带回退到原控制折线（细流，弯道回退不可见），把段数拉回接近基线。
const TERRAIN_RIVER_SAMPLE_GLSL = emitTerrainRiverGLSL('terrainRiverSample', [resampleRiverPath(HERO_RIVER_CONTROL, 2)])
const TERRAIN_BRANCH_SAMPLE_GLSL = emitTerrainRiverGLSL('terrainBranchSample', RIVER_BRANCHES.map(b => b.controlPoints))
const EROSION_GULLIES = [
  { id: 'nw_terrace', wet: true, width: 4.2, influence: 34, depth: 2.8, points: [{ x: -250, z: 180 }, { x: -220, z: 138 }, { x: -171, z: 100 }, { x: -128, z: 70 }] },
  // 干沟末端从汇聚节点 (-160,40) 拉回上坡、扇开，避免紧贴 rill 水潭缘再切出尖角沙楔
  { id: 'west_ridge', wet: false, width: 5.0, influence: 38, depth: 3.2, points: [{ x: -330, z: 155 }, { x: -260, z: 116 }, { x: -205, z: 82 }, { x: -182, z: 52 }] },
  { id: 'central_fan', wet: false, width: 4.8, influence: 36, depth: 2.9, points: [{ x: -50, z: 155 }, { x: -82, z: 110 }, { x: -128, z: 75 }, { x: -150, z: 60 }] },
  { id: 'center_left', wet: true, width: 3.8, influence: 30, depth: 2.4, points: [{ x: -210, z: 60 }, { x: -180, z: 20 }, { x: -160, z: -52 }] },
  { id: 'center_right', wet: false, width: 4.4, influence: 34, depth: 2.7, points: [{ x: -22, z: 132 }, { x: -30, z: 70 }, { x: -42, z: -72 }] },
  { id: 'east_north', wet: true, width: 4.2, influence: 32, depth: 2.5, points: [{ x: 80, z: 150 }, { x: 145, z: 84 }, { x: 220, z: 70 }] },
  { id: 'east_mid', wet: false, width: 5.2, influence: 40, depth: 3.1, points: [{ x: 20, z: 120 }, { x: 78, z: 55 }, { x: 92, z: -64 }] },
  { id: 'east_slope', wet: false, width: 4.4, influence: 34, depth: 2.8, points: [{ x: 190, z: 120 }, { x: 240, z: 45 }, { x: 270, z: -8 }] },
  { id: 'southwest_furrow', wet: false, width: 4.6, influence: 36, depth: 2.9, points: [{ x: -300, z: -180 }, { x: -230, z: -130 }, { x: -170, z: -150 }] },
  { id: 'south_channel', wet: true, width: 3.8, influence: 30, depth: 2.5, points: [{ x: -80, z: -210 }, { x: -88, z: -116 }] },
  { id: 'far_west', wet: false, width: 5.4, influence: 42, depth: 3.4, points: [{ x: -520, z: 150 }, { x: -440, z: 90 }, { x: -430, z: 20 }] },
  // old_center 源头从高沙丘 (-235,140)/(-171,100)(床≈+5~-2.5) 裁掉，起点挪进低地形 (-181,106)(床≈-2.5)，
  // 消除 61° 垂直跌水；sourceLift 显式压低，避免解析水位在源头架高。
  { id: 'old_center', wet: true, width: 3.6, influence: 30, depth: 2.2, sourceLift: 0.8, points: [{ x: -181, z: 106 }, { x: -168, z: 78 }, { x: -160, z: 40 }] },
]
function makePathBounds(points, padding = 0) {
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  points.forEach((point) => {
    minX = Math.min(minX, point.x)
    maxX = Math.max(maxX, point.x)
    minZ = Math.min(minZ, point.z)
    maxZ = Math.max(maxZ, point.z)
  })
  return {
    minX: minX - padding,
    maxX: maxX + padding,
    minZ: minZ - padding,
    maxZ: maxZ + padding,
  }
}

function isInsideBounds(bounds, x, z) {
  return x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ
}

const RIVER_BRANCH_QUERY_PADDING = 40
const RIVER_BRANCH_BOUNDS = RIVER_BRANCHES.map(branch => ({
  branch,
  bounds: makePathBounds(branch.points, RIVER_BRANCH_QUERY_PADDING),
}))
const RIVER_BRANCH_BOUNDS_BY_ID = new Map(RIVER_BRANCH_BOUNDS.map(({ branch, bounds }) => [branch.id, bounds]))
const EROSION_GULLY_BOUNDS = EROSION_GULLIES.map(gully => ({
  gully,
  bounds: makePathBounds(gully.points, gully.influence + 6),
}))
const EROSION_GULLY_BOUNDS_BY_ID = new Map(EROSION_GULLY_BOUNDS.map(({ gully, bounds }) => [gully.id, bounds]))
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

// ── 草色聚类：低频平滑空间场，使绿/枯成片而非逐株随机噪点 ──
function _grassHash2(ix, iz) {
  return forestPlacementNoise(ix * 127.1 + iz * 311.7)
}
function valueNoise2(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z)
  const fx = x - ix, fz = z - iz
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz)
  const a = _grassHash2(ix, iz), b = _grassHash2(ix + 1, iz)
  const c = _grassHash2(ix, iz + 1), d = _grassHash2(ix + 1, iz + 1)
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a, b, u), THREE.MathUtils.lerp(c, d, u), v)
}
// 0..1 平滑"干燥度"场（~12m 主特征 + 细节）→ 黄枯成片
function grassDryAt(x, z) {
  const n = valueNoise2(x * 0.085, z * 0.085) * 0.68
          + valueNoise2(x * 0.19 + 41.3, z * 0.19 + 17.7) * 0.32
  return THREE.MathUtils.clamp(n, 0, 1)
}
// 按空间聚类选变体：干燥场高的成片区出黄枯(2)，其余绿(0/1)；freshWeight 高(近水/低地)更绿
function grassClusterVariant(x, z, seed, freshWeight = 1) {
  const dry = grassDryAt(x, z)
  const thr = 0.75 - (1 - THREE.MathUtils.clamp(freshWeight, 0, 1)) * 0.12   // 基数 +0.07：枯黄面积减半
  const jitter = (forestPlacementNoise(seed + 10) - 0.5) * 0.10   // 簇边软化
  if (dry + jitter > thr) return 2                                // 成簇黄枯（少数）
  return forestPlacementNoise(seed + 11) < 0.62 ? 0 : 1           // 绿（两种 fresh 变体）
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
      variantIndex: grassClusterVariant(x, z, seed),
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
// 距离 LOD 管理的分块草 mesh（河岸/草甸）；每项 userData.grassLod = { hi, lo, cur }
let _grassLodMeshes = []
let _grassLodTimer = 0

// 同一变体的高/低模 geometry 只解析一次；返回 { hi, lo }
function loadGrassVariantGeometries(variant) {
  return Promise.all([
    loadGLTF(variant.url),
    variant.lodUrl ? loadGLTF(variant.lodUrl) : Promise.resolve(null),
  ]).then(([hiGltf, loGltf]) => {
    const hi = hiGltf ? findFirstMesh(hiGltf.scene)?.geometry ?? null : null
    const lo = loGltf ? findFirstMesh(loGltf.scene)?.geometry ?? null : null
    return { hi, lo: lo ?? hi }
  })
}

// 给分块草 mesh 登记 LOD 高/低模，纳入逐帧距离切换
function registerGrassLodMesh(inst, geometries) {
  if (!inst || !geometries || !geometries.lo || geometries.lo === geometries.hi) return
  inst.userData.grassLod = { hi: geometries.hi, lo: geometries.lo, cur: 'hi' }
  _grassLodMeshes.push(inst)
}

// 按块中心到玩家水平距离切换 geometry（仅在档位变化时赋值，避免每帧 churn）
function updateGrassLod(playerPosition) {
  if (!playerPosition || !_grassLodMeshes.length) return
  const px = playerPosition.x
  const pz = playerPosition.z
  const nearSq = GRASS_LOD_NEAR_DIST * GRASS_LOD_NEAR_DIST
  for (let i = 0; i < _grassLodMeshes.length; i++) {
    const inst = _grassLodMeshes[i]
    const lod = inst.userData.grassLod
    const c = inst.boundingSphere?.center
    if (!lod || !c) continue
    const dx = c.x - px
    const dz = c.z - pz
    const want = (dx * dx + dz * dz) < nearSq ? 'hi' : 'lo'
    if (want !== lod.cur) {
      inst.geometry = want === 'hi' ? lod.hi : lod.lo
      lod.cur = want
    }
  }
}

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
    _spawnGrassDummy.scale.set(scaleX * edgeScale * MODEL_GRASS_SPREAD_XZ, scaleY * edgeScale * MODEL_GRASS_FLATTEN_Y, scaleZ * edgeScale * MODEL_GRASS_SPREAD_XZ)
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

function isInsideCastleApproachClearing(x, z) {
  return x >= -8 && x <= 58 && z >= -26 && z <= 24
}

function shouldSkipGroundDebrisPlacement(x, z) {
  if (!isInsideOutdoorMountainBounds(x, z, 0)) return true
  if (getGroundHeight(x, z) > GROUND_DEBRIS_MAX_GROUND_Y) return true
  if (isNearGrassCampfire(x, z, GRASS_CAMPFIRE_CLEAR_RADIUS + GROUND_DEBRIS_CLEAR_PADDING)) return true
  if (isInsideMineCaveClearing(x, z, MINE_CAVE_CARD_GRASS_PADDING + GROUND_DEBRIS_CLEAR_PADDING)) return true
  if (isInsideCastleApproachClearing(x, z)) return true
  return false
}

// 草甸专用排除：复用碎屑层的清场项，但不含 7.5m 高度门（高度由 MEADOW_GRASS_MAX_GROUND_Y 单独管，以铺满丘陵山坡）
function shouldSkipMeadowGrassPlacement(x, z) {
  if (!isInsideOutdoorMountainBounds(x, z, 0)) return true
  if (isNearGrassCampfire(x, z, GRASS_CAMPFIRE_CLEAR_RADIUS + GROUND_DEBRIS_CLEAR_PADDING)) return true
  if (isInsideMineCaveClearing(x, z, MINE_CAVE_CARD_GRASS_PADDING + GROUND_DEBRIS_CLEAR_PADDING)) return true
  if (isInsideCastleApproachClearing(x, z)) return true
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

function createSnowMountainCliffMaterial() {
  const material = new THREE.MeshStandardMaterial({
    color: 0x9ca2a2,
    roughness: 1,
    metalness: 0,
    flatShading: true,
    side: THREE.DoubleSide,
  })
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = `
      varying vec3 vSnowWorldPos;
      varying vec3 vSnowWorldNormal;
    ` + shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      `#include <worldpos_vertex>
       vSnowWorldPos = worldPosition.xyz;
       vSnowWorldNormal = normalize(mat3(modelMatrix) * objectNormal);`
    )
    shader.fragmentShader = `
      varying vec3 vSnowWorldPos;
      varying vec3 vSnowWorldNormal;

      float snowCliffHash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float snowCliffNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = snowCliffHash(i);
        float b = snowCliffHash(i + vec2(1.0, 0.0));
        float c = snowCliffHash(i + vec2(0.0, 1.0));
        float d = snowCliffHash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }
    ` + shader.fragmentShader.replace(
      '#include <map_fragment>',
      `
      float slope = 1.0 - clamp(dot(normalize(vSnowWorldNormal), vec3(0.0, 1.0, 0.0)), 0.0, 1.0);
      float broad = snowCliffNoise(vSnowWorldPos.xz * 0.018 + vec2(4.1, 8.7));
      float fine = snowCliffNoise(vSnowWorldPos.xz * 0.17 + vec2(2.9, 13.4));
      vec3 coldRock = mix(vec3(0.42, 0.45, 0.47), vec3(0.62, 0.65, 0.66), broad);
      coldRock = mix(coldRock, vec3(0.30, 0.35, 0.39), smoothstep(0.40, 0.92, slope) * 0.45);
      coldRock *= vec3(0.84, 0.92, 1.0) * (0.92 + fine * 0.10);
      float settledSnow = smoothstep(42.0, 116.0, vSnowWorldPos.y) * (1.0 - smoothstep(0.18, 0.66, slope));
      float streakSnow = smoothstep(64.0, 148.0, vSnowWorldPos.y)
        * smoothstep(0.48, 0.82, broad + fine * 0.20)
        * (1.0 - smoothstep(0.78, 1.0, slope));
      float summitSnow = smoothstep(118.0, 174.0, vSnowWorldPos.y) * 0.90;
      float snow = clamp(max(settledSnow, streakSnow) + summitSnow, 0.0, 1.0);
      vec3 snowColor = vec3(0.92, 0.96, 0.98) * (0.96 + fine * 0.06);
      diffuseColor *= vec4(mix(coldRock, snowColor, snow), 1.0);
      `
    )
  }
  material.customProgramCacheKey = () => 'snow-mountain-cliff-v1'
  return material
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
      // 树/灌木加高（岩石 rock_* 保持原尺寸）
      const heightBoost = /^(tree_|background_tree_)/i.test(placement.file) ? FOREST_GROVE_HEIGHT_BOOST : 1
      group.scale.setScalar((placement.scale ?? 1) * heightBoost)
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
  _grassLodMeshes = []
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

// ---- 河岸生态草（Riverside riparian grass）----
function riverPathTotalLength(points) {
  let total = 0
  for (let i = 0; i < points.length - 1; i++) {
    total += Math.hypot(points[i + 1].x - points[i].x, points[i + 1].z - points[i].z)
  }
  return total
}

// 通用版 getHeroRiverPointAtT：对任意中心线点数组按归一化参数 t 取点与流向
function pointAlongPathAtT(points, pathT) {
  const lengths = []
  let total = 0
  for (let i = 0; i < points.length - 1; i++) {
    const len = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].z - points[i].z)
    lengths.push(len)
    total += len
  }
  let accumulated = 0
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    const segmentStart = accumulated / total
    const segmentEnd = (accumulated + lengths[i]) / total
    if (pathT <= segmentEnd || i === points.length - 2) {
      const localT = THREE.MathUtils.clamp((pathT - segmentStart) / Math.max(0.0001, segmentEnd - segmentStart), 0, 1)
      const len = Math.max(0.0001, lengths[i])
      return {
        x: THREE.MathUtils.lerp(a.x, b.x, localT),
        z: THREE.MathUtils.lerp(a.z, b.z, localT),
        dirX: (b.x - a.x) / len,
        dirZ: (b.z - a.z) / len,
      }
    }
    accumulated += lengths[i]
  }
  return { ...points[0], dirX: 1, dirZ: 0 }
}

// 低频"沙斑"掩码：让坡顶草不连成死板地毯，露出沙地空斑（0=沙地，1=可密铺）
function riparianPatchMask(x, z) {
  const coarse = forestPlacementNoise(Math.floor(x / 6) * 131.1 + Math.floor(z / 6) * 197.3 + 31.7)
  const fine = forestPlacementNoise(Math.floor(x / 2.5) * 53.7 + Math.floor(z / 2.5) * 89.1 + 7.3)
  return THREE.MathUtils.smoothstep(coarse * 0.65 + fine * 0.35, 0.15, 0.55)
}

// 湿度梯度选变体：freshWeight 越高（越近水）越偏 fresh 绿草，越远越偏 dark/dry
function chooseRiparianVariant(seed, freshWeight) {
  const r = forestPlacementNoise(seed + 10)
  const fresh = THREE.MathUtils.clamp(freshWeight, 0, 1) * 0.7
  if (r < fresh) return 1            // fresh 绿草
  if (r < fresh + 0.25) return 0     // dark 暗草
  return 2                            // dry 枯草
}

// 通过排除区/淹没/陡坡检查后，生成一条草的 placement（与 spawn grass 同格式）
function emitRiparianGrass(placements, counters, x, z, waterY, seed, freshWeight) {
  if (placements.length >= RIVERSIDE_GRASS_MAX_INSTANCES) { counters.dropped++; return }
  if (shouldSkipModelGrassPlacement(x, z)) return
  const groundY = getGroundHeight(x, z)
  if (groundY <= waterY + 0.04) return  // 在水面或水下 → 不种
  // 局部坡度守卫：避免草爬上谷壁/陡坎
  const riseX = Math.abs(getGroundHeight(x + 1, z) - groundY)
  const riseZ = Math.abs(getGroundHeight(x, z + 1) - groundY)
  if (riseX > RIVERSIDE_GRASS_MAX_GROUND_RISE || riseZ > RIVERSIDE_GRASS_MAX_GROUND_RISE) return
  placements.push({
    x: Number(x.toFixed(2)),
    z: Number(z.toFixed(2)),
    rotY: Number((forestPlacementNoise(seed + 3) * Math.PI * 2).toFixed(3)),
    scaleX: Number(THREE.MathUtils.lerp(0.75, 1.35, forestPlacementNoise(seed + 4)).toFixed(3)),
    scaleY: Number(THREE.MathUtils.lerp(0.75, 1.25, forestPlacementNoise(seed + 5)).toFixed(3)),
    scaleZ: Number(THREE.MathUtils.lerp(0.75, 1.35, forestPlacementNoise(seed + 6)).toFixed(3)),
    tiltX: Number(THREE.MathUtils.lerp(-0.16, 0.16, forestPlacementNoise(seed + 7)).toFixed(3)),
    tiltZ: Number(THREE.MathUtils.lerp(-0.16, 0.16, forestPlacementNoise(seed + 8)).toFixed(3)),
    variantIndex: grassClusterVariant(x, z, seed, freshWeight),
  })
  counters.kept++
}

// 沿一条河道行走，按生态分区把草写入 placements
function appendRiparianGrassForChannel(spec, placements, counters) {
  const total = riverPathTotalLength(spec.points)
  if (total < 1) return
  const run = channelBankRun(spec.cutDepth, spec.slopeDeg)
  const stationCount = Math.max(2, Math.ceil(total / RIVERSIDE_GRASS_ALONG_SPACING))
  const lateralCount = Math.max(1, Math.ceil(RIVERSIDE_GRASS_TERRACE_WIDTH / RIVERSIDE_GRASS_LATERAL_SPACING))
  const alongJitter = RIVERSIDE_GRASS_ALONG_SPACING * RIVERSIDE_GRASS_JITTER
  const latJitter = RIVERSIDE_GRASS_LATERAL_SPACING * RIVERSIDE_GRASS_JITTER

  for (let s = 0; s <= stationCount; s++) {
    const t = s / stationCount
    const c = pointAlongPathAtT(spec.points, t)
    const halfWidth = spec.halfWidthAt(t)
    const waterY = spec.waterYAt(t)
    const rightX = -c.dirZ
    const rightZ = c.dirX
    const terraceInner = halfWidth + run + RIVERSIDE_GRASS_SLOPE_MARGIN
    const terraceOuter = terraceInner + RIVERSIDE_GRASS_TERRACE_WIDTH

    for (const side of [-1, 1]) {
      const sideSeed = spec.seedBase + (side > 0 ? 500003 : 0)
      // 1) 坡顶平台带（密）：近坡顶密、向外渐稀
      for (let l = 0; l < lateralCount; l++) {
        const seed = sideSeed + s * 1009 + l * 53
        const baseD = terraceInner + (l + 0.5) * RIVERSIDE_GRASS_LATERAL_SPACING
        const d = baseD + (forestPlacementNoise(seed + 1) - 0.5) * latJitter
        if (d <= terraceInner || d > terraceOuter) continue
        const along = (forestPlacementNoise(seed + 2) - 0.5) * alongJitter
        const x = c.x + c.dirX * along + rightX * side * d
        const z = c.z + c.dirZ * along + rightZ * side * d
        // 近坡顶权重（也用作 fresh 权重）：靠内 ~1，靠外 ~0
        // 内侧 plateau 满密度，其后向外平滑淡出到 0（自然边界，无矩形硬边）
        const proximity = 1 - THREE.MathUtils.smoothstep(d, terraceInner + RIVERSIDE_GRASS_TERRACE_WIDTH * RIVERSIDE_GRASS_TERRACE_PLATEAU, terraceOuter)
        const keepProb = proximity * riparianPatchMask(x, z)
        if (forestPlacementNoise(seed + 9) > keepProb) continue
        emitRiparianGrass(placements, counters, x, z, waterY, seed, 0.35 + proximity * 0.6)
      }
      // 2) 干河床带（稀疏几丛）：仅露出水面处，emitRiparianGrass 内已做淹没剔除
      for (let b = 0; b < RIVERSIDE_GRASS_BED_SAMPLES; b++) {
        const seed = sideSeed + s * 1009 + 777 + b * 17
        if (forestPlacementNoise(seed + 9) > RIVERSIDE_GRASS_BED_PROB) continue
        const d = forestPlacementNoise(seed + 1) * halfWidth
        const along = (forestPlacementNoise(seed + 2) - 0.5) * alongJitter
        const x = c.x + c.dirX * along + rightX * side * d
        const z = c.z + c.dirZ * along + rightZ * side * d
        emitRiparianGrass(placements, counters, x, z, waterY, seed, 0.25)
      }
    }
  }
}

function buildRiparianChannelSpecs() {
  const specs = [{
    points: HERO_RIVER_POINTS,
    halfWidthAt: (t) => riverHalfWidthAt(t),
    waterYAt: (t) => riverWaterYAt(t),
    cutDepth: MAIN_RIVER_CHANNEL_CUT,
    slopeDeg: MAIN_RIVER_CHANNEL_SLOPE_DEG,
    seedBase: 30000,
  }]
  RIVER_BRANCHES.forEach((branch, i) => {
    specs.push({
      points: branch.points,
      halfWidthAt: (t) => branchHalfWidthAt(branch, t),
      waterYAt: (t) => branchWaterYAt(branch, t),
      cutDepth: RIVER_CHANNEL_MIN_CUT,
      slopeDeg: RIVER_CHANNEL_MIN_SLOPE_DEG,
      seedBase: 40000 + i * 3000,
    })
  })
  return specs
}

function createRiversideGrassPlacements() {
  const placements = []
  const counters = { kept: 0, dropped: 0 }
  for (const spec of buildRiparianChannelSpecs()) {
    appendRiparianGrassForChannel(spec, placements, counters)
  }
  return { placements, dropped: counters.dropped }
}

function loadRiversideGrass(scene) {
  const { placements, dropped } = createRiversideGrassPlacements()
  if (!placements.length) return

  // 按空间网格 + 变体分块，使离屏河段可被视锥剔除
  const groups = new Map()
  for (const p of placements) {
    const cx = Math.floor(p.x / RIVERSIDE_GRASS_CHUNK_LEN)
    const cz = Math.floor(p.z / RIVERSIDE_GRASS_CHUNK_LEN)
    const key = `${cx}|${cz}|${p.variantIndex}`
    let arr = groups.get(key)
    if (!arr) { arr = []; groups.set(key, arr) }
    arr.push(p)
  }

  Promise.all(SPAWN_GRASS_MODEL_VARIANTS.map((variant, variantIndex) => (
    loadGrassVariantGeometries(variant).then((geom) => ({ variant, variantIndex, geom }))
  ))).then((loadedVariants) => {
    // 每变体一份共享高/低模几何 + 共享材质（材质带风动 uniform，复用现有更新循环）
    const perVariant = loadedVariants.map(({ variant, variantIndex, geom }) => {
      const material = geom.hi ? configureSpawnGrassMaterial(new THREE.MeshBasicMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        depthWrite: true,
      })) : null
      return { variant, variantIndex, geom, material }
    })

    groups.forEach((arr, key) => {
      const variantIndex = Number(key.split('|')[2])
      const v = perVariant[variantIndex]
      if (!v || !v.geom.hi || !v.material) return
      const inst = new THREE.InstancedMesh(v.geom.hi, v.material, arr.length)
      inst.name = `riverside_grass_${v.variant.name}_${key}`
      inst.castShadow = false
      inst.receiveShadow = false
      inst.frustumCulled = true
      arr.forEach((p, index) => {
        _spawnGrassDummy.position.set(p.x, getGroundHeight(p.x, p.z) + LOCAL_MODEL_GRASS_Y_OFFSET, p.z)
        _spawnGrassDummy.rotation.set(p.tiltX, p.rotY, p.tiltZ)
        _spawnGrassDummy.scale.set(p.scaleX * MODEL_GRASS_SPREAD_XZ, p.scaleY * MODEL_GRASS_FLATTEN_Y, p.scaleZ * MODEL_GRASS_SPREAD_XZ)
        _spawnGrassDummy.updateMatrix()
        inst.setMatrixAt(index, _spawnGrassDummy.matrix)
      })
      inst.instanceMatrix.needsUpdate = true
      inst.computeBoundingBox()
      inst.computeBoundingSphere()
      _spawnGrassInstancedMeshes.push(inst)
      registerGrassLodMesh(inst, v.geom)
      scene.add(inst)
    })
    console.log(`[riverside-grass] placed ${placements.length} clumps across ${groups.size} chunks` + (dropped ? `, dropped ${dropped} over cap` : ''))
  }).catch((error) => {
    console.warn('Riverside grass asset failed', error)
  })
}

// ---- 全场草甸草（Meadow grass）：铺满低谷地面（≤7.5m），河岸层在 ~16m 处接手 ----
// 为避免一次性同步生成造成启动卡顿（全场 getGroundHeight 全管线极贵），改为跨帧增量构建：
// 地图即时加载，草甸按 64m 块由出生区向外逐帧填充（每帧 ~5ms 预算），整块高地廉价跳过。
let _meadowBuild = null
const MEADOW_BUILD_MS_PER_FRAME = 6

function initMeadowGrass(scene) {
  Promise.all(SPAWN_GRASS_MODEL_VARIANTS.map((variant, variantIndex) => (
    loadGrassVariantGeometries(variant).then((geom) => ({ variant, variantIndex, geom }))
  ))).then((loaded) => {
    const perVariant = loaded.map(({ variant, variantIndex, geom }) => {
      const material = geom.hi ? configureSpawnGrassMaterial(new THREE.MeshBasicMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        depthWrite: true,
      })) : null
      return { variant, variantIndex, geom, material }
    })
    const cellStep = MEADOW_GRASS_CHUNK_LEN
    const cells = []
    for (let cz = Math.floor(GRASS_FIELD_BOUNDS.minZ / cellStep); cz < Math.ceil(GRASS_FIELD_BOUNDS.maxZ / cellStep); cz++) {
      for (let cx = Math.floor(GRASS_FIELD_BOUNDS.minX / cellStep); cx < Math.ceil(GRASS_FIELD_BOUNDS.maxX / cellStep); cx++) {
        const minX = cx * cellStep
        const minZ = cz * cellStep
        const ccx = minX + cellStep / 2
        const ccz = minZ + cellStep / 2
        cells.push({ minX, minZ, d2: ccx * ccx + ccz * ccz })
      }
    }
    cells.sort((a, b) => a.d2 - b.d2) // 由中心（出生区）向外逐块填充
    _meadowBuild = { scene, perVariant, cells, ci: 0, cur: null, total: 0, dropped: 0, t0: performance.now() }
  }).catch((error) => console.warn('Meadow grass asset failed', error))
}

function buildMeadowCellMeshes(b, cell, byVariant) {
  for (let vi = 0; vi < byVariant.length; vi++) {
    const arr = byVariant[vi]
    if (!arr.length) continue
    const v = b.perVariant[vi]
    if (!v || !v.geom.hi || !v.material) continue
    const inst = new THREE.InstancedMesh(v.geom.hi, v.material, arr.length)
    inst.name = `meadow_grass_${v.variant.name}_${cell.minX}_${cell.minZ}`
    inst.castShadow = false
    inst.receiveShadow = false
    inst.frustumCulled = true
    for (let i = 0; i < arr.length; i++) {
      const p = arr[i]
      const seed = p.seed
      _spawnGrassDummy.position.set(p.x, p.y, p.z)
      _spawnGrassDummy.rotation.set(
        THREE.MathUtils.lerp(-0.16, 0.16, forestPlacementNoise(seed + 7)),
        forestPlacementNoise(seed + 3) * Math.PI * 2,
        THREE.MathUtils.lerp(-0.16, 0.16, forestPlacementNoise(seed + 8)),
      )
      _spawnGrassDummy.scale.set(
        THREE.MathUtils.lerp(1.0, 1.7, forestPlacementNoise(seed + 4)) * MODEL_GRASS_SPREAD_XZ,
        THREE.MathUtils.lerp(0.9, 1.45, forestPlacementNoise(seed + 5)) * MODEL_GRASS_FLATTEN_Y,
        THREE.MathUtils.lerp(1.0, 1.7, forestPlacementNoise(seed + 6)) * MODEL_GRASS_SPREAD_XZ,
      )
      _spawnGrassDummy.updateMatrix()
      inst.setMatrixAt(i, _spawnGrassDummy.matrix)
    }
    inst.instanceMatrix.needsUpdate = true
    inst.computeBoundingBox()
    inst.computeBoundingSphere()
    _spawnGrassInstancedMeshes.push(inst)
    registerGrassLodMesh(inst, v.geom)
    b.scene.add(inst)
  }
}

function stepMeadowGrassBuild() {
  const b = _meadowBuild
  if (!b) return
  const spacing = MEADOW_GRASS_SPACING
  const jitter = spacing * MEADOW_GRASS_JITTER
  const cellStep = MEADOW_GRASS_CHUNK_LEN
  const tStart = performance.now()
  let processed = 0

  while (b.ci < b.cells.length) {
    const cell = b.cells[b.ci]
    const baseGX = Math.floor(cell.minX / spacing)
    const endGX = Math.ceil((cell.minX + cellStep) / spacing) - 1
    const endGZ = Math.ceil((cell.minZ + cellStep) / spacing) - 1
    if (!b.cur) {
      // 廉价整块剔除：四角+中心地面都高于上限 → 整块高地，跳过（省下全块 getGroundHeight）
      const cs = cellStep
      let minH = Infinity
      for (const [cxw, czw] of [
        [cell.minX + 1, cell.minZ + 1], [cell.minX + cs - 1, cell.minZ + 1],
        [cell.minX + 1, cell.minZ + cs - 1], [cell.minX + cs - 1, cell.minZ + cs - 1],
        [cell.minX + cs / 2, cell.minZ + cs / 2],
      ]) minH = Math.min(minH, getGroundHeight(cxw, czw))
      if (minH > MEADOW_GRASS_MAX_GROUND_Y + 1.5) { b.ci++; continue }
      b.cur = { gx: baseGX, gz: Math.floor(cell.minZ / spacing), byVariant: [[], [], []] }
    }
    let { gx, gz, byVariant } = b.cur

    while (gz <= endGZ) {
      const seed = 90000 + gx * 100003 + gz * 4099
      const x = (gx + 0.5) * spacing + (forestPlacementNoise(seed + 1) - 0.5) * jitter
      const z = (gz + 0.5) * spacing + (forestPlacementNoise(seed + 2) - 0.5) * jitter
      processed++
      if (!(x < GRASS_FIELD_BOUNDS.minX || x > GRASS_FIELD_BOUNDS.maxX || z < GRASS_FIELD_BOUNDS.minZ || z > GRASS_FIELD_BOUNDS.maxZ)) {
        const groundY = getGroundHeight(x, z)
        if (groundY <= MEADOW_GRASS_MAX_GROUND_Y && !shouldSkipMeadowGrassPlacement(x, z)) {
          const channel = sampleChannelNetwork(x, z)
          if (!(channel && channel.edge < MEADOW_GRASS_RIVER_HANDOFF)) {
            const riseX = Math.abs(getGroundHeight(x + 1, z) - groundY)
            const riseZ = Math.abs(getGroundHeight(x, z + 1) - groundY)
            if (riseX <= MEADOW_GRASS_MAX_GROUND_RISE && riseZ <= MEADOW_GRASS_MAX_GROUND_RISE) {
              if (b.total < MEADOW_GRASS_MAX_INSTANCES) {
                const freshWeight = THREE.MathUtils.lerp(0.85, 0.4, THREE.MathUtils.smoothstep(groundY, 1, 7.5))
                byVariant[grassClusterVariant(x, z, seed, freshWeight)].push({ x, y: groundY + LOCAL_MODEL_GRASS_Y_OFFSET, z, seed })
                b.total++
              } else { b.dropped++ }
            }
          }
        }
      }
      gx++
      if (gx > endGX) { gx = baseGX; gz++ }
      if ((processed & 63) === 0 && performance.now() - tStart > MEADOW_BUILD_MS_PER_FRAME) {
        b.cur = { gx, gz, byVariant }
        return
      }
    }
    // 本块完成 → 建该块各变体 InstancedMesh
    buildMeadowCellMeshes(b, cell, byVariant)
    b.ci++
    b.cur = null
    if (performance.now() - tStart > MEADOW_BUILD_MS_PER_FRAME) return
  }
  console.log(`[meadow-grass] built ${b.total} clumps over ${(performance.now() - b.t0).toFixed(0)}ms wall` + (b.dropped ? `, dropped ${b.dropped} over cap` : ''))
  _meadowBuild = null
}

// ════════════════════════════════════════════════════
//  世界级实例化树木散布
// ════════════════════════════════════════════════════
const _worldTreeDummy = new THREE.Object3D()
let _worldTreeBuild = null
let _worldTreeVisTimer = 0

// 把一个 forest_pack GLB 解析为可实例化的 parts：[{geometry, material}]。
// 树为 2 mesh（树干+树冠分材质）→ 每子件一个 part；几何烘入节点世界变换并把整模型 base 对齐到 y=0（贴地）。
function loadTreeInstanceParts(file, baseScale) {
  return loadGLTF(`${FOREST_GROVE_ASSETS_BASE}/${file}`).then((gltf) => {
    const root = gltf.scene
    root.updateMatrixWorld(true)
    const parts = []
    root.traverse((c) => {
      if (!c.isMesh || !c.geometry) return
      const geom = c.geometry.clone()
      geom.applyMatrix4(c.matrixWorld)          // 烘入节点变换 → 各子件落在同一根坐标系
      const mat = c.material                      // 复用材质（保留树叶 alpha 等设置）
      parts.push({ geometry: geom, material: mat })
    })
    let minY = Infinity
    for (const p of parts) { p.geometry.computeBoundingBox(); minY = Math.min(minY, p.geometry.boundingBox.min.y) }
    if (Number.isFinite(minY)) for (const p of parts) p.geometry.translate(0, -minY, 0)  // base→y=0
    return { file, baseScale, parts }
  })
}

function initWorldTrees(scene) {
  Promise.all([
    Promise.all(WORLD_TREE_MODELS.map((m) => loadTreeInstanceParts(m.file, m.scale))),
    loadGrassVariantGeometries(SPAWN_GRASS_MODEL_VARIANTS[0]), // 树下补草复用草甸几何
  ])
    .then(([models, grassGeom]) => {
      // 树下草材质：与草甸同款（configureSpawnGrassMaterial 会注册风 uniform → 自动随风动）
      const grassMat = grassGeom?.hi
        ? configureSpawnGrassMaterial(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, depthWrite: true }))
        : null
      const cellStep = WORLD_TREE_CELL_LEN
      const b = OUTDOOR_MOUNTAIN_BOUNDS
      const cells = []
      for (let cz = Math.floor(b.minZ / cellStep); cz < Math.ceil(b.maxZ / cellStep); cz++) {
        for (let cx = Math.floor(b.minX / cellStep); cx < Math.ceil(b.maxX / cellStep); cx++) {
          const minX = cx * cellStep
          const minZ = cz * cellStep
          const ccx = minX + cellStep / 2
          const ccz = minZ + cellStep / 2
          cells.push({ minX, minZ, d2: ccx * ccx + ccz * ccz })
        }
      }
      cells.sort((a, b2) => a.d2 - b2.d2) // 由中心（出生区）向外逐块成型
      _worldTreeBuild = { scene, models, grassHi: grassGeom?.hi ?? null, grassMat, cells, ci: 0, cur: null, total: 0, grassTotal: 0, dropped: 0, cellMeshes: [], done: false, t0: performance.now() }
    })
    .catch((error) => console.warn('World trees asset failed', error))
}

// 低频聚集噪声 → 林斑/林间空地（返回 ~[0,1]）。
function worldTreeClusterNoise(x, z) {
  return 0.5
    + Math.sin(x * 0.0125 + z * 0.0083) * 0.30
    + Math.sin(x * 0.0041 - z * 0.0061 + 2.1) * 0.13
    + Math.sin(x * 0.027 + z * 0.019 + 0.7) * 0.07
}

function buildWorldTreeCellMeshes(b, cell, byModel, grassArr) {
  const meshes = []
  for (let mi = 0; mi < b.models.length; mi++) {
    const arr = byModel[mi]
    if (!arr.length) continue
    const model = b.models[mi]
    for (const part of model.parts) {
      const inst = new THREE.InstancedMesh(part.geometry, part.material, arr.length)
      inst.name = `world_tree_${model.file.replace(/\.glb$/i, '')}_${cell.minX}_${cell.minZ}`
      inst.castShadow = false
      inst.receiveShadow = true
      inst.frustumCulled = true
      for (let i = 0; i < arr.length; i++) {
        const p = arr[i]
        _worldTreeDummy.position.set(p.x, p.y, p.z)
        _worldTreeDummy.rotation.set(0, forestPlacementNoise(p.seed + 3) * Math.PI * 2, 0)
        const s = model.baseScale * WORLD_TREE_HEIGHT_BOOST * THREE.MathUtils.lerp(0.82, 1.22, forestPlacementNoise(p.seed + 5))
        _worldTreeDummy.scale.setScalar(s)
        _worldTreeDummy.updateMatrix()
        inst.setMatrixAt(i, _worldTreeDummy.matrix)
      }
      inst.instanceMatrix.needsUpdate = true
      inst.computeBoundingSphere()
      b.scene.add(inst)
      meshes.push(inst)
    }
  }
  // 树下草：单个 InstancedMesh（复刻 buildMeadowCellMeshes 的缩放/旋转），随树一起剔除
  if (grassArr && grassArr.length && b.grassHi && b.grassMat) {
    const ginst = new THREE.InstancedMesh(b.grassHi, b.grassMat, grassArr.length)
    ginst.name = `world_tree_grass_${cell.minX}_${cell.minZ}`
    ginst.castShadow = false
    ginst.receiveShadow = false
    ginst.frustumCulled = true
    for (let i = 0; i < grassArr.length; i++) {
      const p = grassArr[i]
      _spawnGrassDummy.position.set(p.x, p.y, p.z)
      _spawnGrassDummy.rotation.set(
        THREE.MathUtils.lerp(-0.16, 0.16, forestPlacementNoise(p.seed + 7)),
        forestPlacementNoise(p.seed + 3) * Math.PI * 2,
        THREE.MathUtils.lerp(-0.16, 0.16, forestPlacementNoise(p.seed + 8)),
      )
      _spawnGrassDummy.scale.set(
        THREE.MathUtils.lerp(1.0, 1.7, forestPlacementNoise(p.seed + 4)) * MODEL_GRASS_SPREAD_XZ,
        THREE.MathUtils.lerp(0.9, 1.45, forestPlacementNoise(p.seed + 5)) * MODEL_GRASS_FLATTEN_Y,
        THREE.MathUtils.lerp(1.0, 1.7, forestPlacementNoise(p.seed + 6)) * MODEL_GRASS_SPREAD_XZ,
      )
      _spawnGrassDummy.updateMatrix()
      ginst.setMatrixAt(i, _spawnGrassDummy.matrix)
    }
    ginst.instanceMatrix.needsUpdate = true
    ginst.computeBoundingSphere()
    b.scene.add(ginst)
    meshes.push(ginst)
    b.grassTotal += grassArr.length
  }
  if (meshes.length) {
    b.cellMeshes.push({ cx: cell.minX + WORLD_TREE_CELL_LEN / 2, cz: cell.minZ + WORLD_TREE_CELL_LEN / 2, meshes })
  }
}

function stepWorldTreeBuild() {
  const b = _worldTreeBuild
  if (!b || b.done) return
  const spacing = WORLD_TREE_SPACING
  const jitter = spacing * WORLD_TREE_JITTER
  const cellStep = WORLD_TREE_CELL_LEN
  const bounds = OUTDOOR_MOUNTAIN_BOUNDS
  const tStart = performance.now()
  let processed = 0

  while (b.ci < b.cells.length) {
    const cell = b.cells[b.ci]
    const baseGX = Math.floor(cell.minX / spacing)
    const endGX = Math.ceil((cell.minX + cellStep) / spacing) - 1
    const endGZ = Math.ceil((cell.minZ + cellStep) / spacing) - 1
    if (!b.cur) {
      // 廉价整块剔除：四角+中心地面都高于树线 → 整块高山，跳过
      const cs = cellStep
      let minH = Infinity
      for (const [cxw, czw] of [
        [cell.minX + 1, cell.minZ + 1], [cell.minX + cs - 1, cell.minZ + 1],
        [cell.minX + 1, cell.minZ + cs - 1], [cell.minX + cs - 1, cell.minZ + cs - 1],
        [cell.minX + cs / 2, cell.minZ + cs / 2],
      ]) minH = Math.min(minH, getGroundHeight(cxw, czw))
      if (minH > WORLD_TREE_TREELINE_HI + 2) { b.ci++; continue }
      b.cur = { gx: baseGX, gz: Math.floor(cell.minZ / spacing), byModel: b.models.map(() => []), grassArr: [] }
    }
    let { gx, gz, byModel, grassArr } = b.cur

    while (gz <= endGZ) {
      const seed = 70000 + gx * 100003 + gz * 4099
      const x = (gx + 0.5) * spacing + (forestPlacementNoise(seed + 1) - 0.5) * jitter
      const z = (gz + 0.5) * spacing + (forestPlacementNoise(seed + 2) - 0.5) * jitter
      processed++
      placeOne: {
        if (x < bounds.minX || x > bounds.maxX || z < bounds.minZ || z > bounds.maxZ) break placeOne
        // 林斑/空地：聚集噪声低于（带抖动的）阈值 → 留空
        if (worldTreeClusterNoise(x, z) < WORLD_TREE_CLUSTER_THRESHOLD + (forestPlacementNoise(seed + 9) - 0.5) * 0.12) break placeOne
        // 整体减密 ~10%（确定性，按坐标稳定，不破坏林斑形态）
        if (forestPlacementNoise(seed + 11) < WORLD_TREE_THIN) break placeOne
        // 避开手工林地中心区（防与 curated 堆叠）+ 结构空地
        if (x >= RANDOM_FOREST_BOUNDS.minX && x <= RANDOM_FOREST_BOUNDS.maxX && z >= RANDOM_FOREST_BOUNDS.minZ && z <= RANDOM_FOREST_BOUNDS.maxZ) break placeOne
        if (isInsideRandomForestClearing(x, z)) break placeOne
        const groundY = getGroundHeight(x, z)
        // 树线：高处按概率渐稀，>HI 不种
        const treelineP = 1 - THREE.MathUtils.smoothstep(groundY, WORLD_TREE_TREELINE_LO, WORLD_TREE_TREELINE_HI)
        if (treelineP <= 0 || forestPlacementNoise(seed + 10) > treelineP) break placeOne
        // 水体避让
        const channel = sampleChannelNetwork(x, z)
        if (channel && channel.edge < WORLD_TREE_RIVER_HANDOFF) break placeOne
        // 坡度守卫（不上崖面）
        const riseX = Math.abs(getGroundHeight(x + 1.5, z) - groundY)
        const riseZ = Math.abs(getGroundHeight(x, z + 1.5) - groundY)
        if (riseX > WORLD_TREE_MAX_SLOPE || riseZ > WORLD_TREE_MAX_SLOPE) break placeOne
        if (b.total >= WORLD_TREE_MAX_INSTANCES) { b.dropped++; break placeOne }
        const mi = Math.floor(forestPlacementNoise(seed + 4) * b.models.length) % b.models.length
        byModel[mi].push({ x, y: groundY, z, seed })
        b.total++
        // 树下补草：脚下散布一小簇（逐簇采样地面高度，贴坡）
        if (b.grassMat) {
          for (let g = 0; g < WORLD_TREE_GRASS_PER_TREE; g++) {
            const gxw = x + (forestPlacementNoise(seed + 20 + g) - 0.5) * 2 * WORLD_TREE_GRASS_RADIUS
            const gzw = z + (forestPlacementNoise(seed + 30 + g) - 0.5) * 2 * WORLD_TREE_GRASS_RADIUS
            grassArr.push({ x: gxw, y: getGroundHeight(gxw, gzw) + LOCAL_MODEL_GRASS_Y_OFFSET, z: gzw, seed: seed + 50 + g })
          }
        }
      }
      gx++
      if (gx > endGX) { gx = baseGX; gz++ }
      if ((processed & 63) === 0 && performance.now() - tStart > WORLD_TREE_BUILD_MS_PER_FRAME) {
        b.cur = { gx, gz, byModel, grassArr }
        return
      }
    }
    buildWorldTreeCellMeshes(b, cell, byModel, grassArr)
    b.ci++
    b.cur = null
    if (performance.now() - tStart > WORLD_TREE_BUILD_MS_PER_FRAME) return
  }
  b.done = true
  console.log(`[world-trees] built ${b.total} trees + ${b.grassTotal} under-tree grass over ${(performance.now() - b.t0).toFixed(0)}ms wall` + (b.dropped ? `, dropped ${b.dropped} over cap` : ''))
}

// 按 cell 中心到玩家水平距离剔除（远处隐藏，限制 overdraw）。
function updateWorldTreeVisibility(playerPosition) {
  const b = _worldTreeBuild
  if (!b || !playerPosition) return
  const px = playerPosition.x
  const pz = playerPosition.z
  const maxSq = WORLD_TREE_VISIBLE_DIST * WORLD_TREE_VISIBLE_DIST
  for (const c of b.cellMeshes) {
    const dx = c.cx - px
    const dz = c.cz - pz
    const vis = (dx * dx + dz * dz) < maxSq
    for (const m of c.meshes) m.visible = vis
  }
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

const pathMetaCache = new WeakMap()
function getPathMeta(points) {
  let meta = pathMetaCache.get(points)
  if (!meta) {
    const lengths = []
    let total = 0
    for (let i = 0; i < points.length - 1; i++) {
      const len = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].z - points[i].z)
      lengths.push(len)
      total += len
    }
    meta = { lengths, total: Math.max(0.0001, total) }
    pathMetaCache.set(points, meta)
  }
  return meta
}

function getPathSample(points, x, z) {
  let best = null
  let accumulated = 0
  const { lengths, total } = getPathMeta(points)
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


function riverHalfWidthAt(t) {
  const centralBelt = Math.exp(-Math.pow((t - 0.56) / 0.25, 2))
  return THREE.MathUtils.lerp(4.8, 7.8, Math.pow(t, 0.62)) + centralBelt * 3.2
}

function riverWaterYAt(t) {
  let descent
  if (t < 0.26) {
    descent = THREE.MathUtils.lerp(64, 40, t / 0.26)
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

const RIVER_CHANNEL_MIN_CUT = 2
// 河岸坡度放缓：斜坡水平宽度 run > 地形顶点间距(1.78m)，使网格能忠实表现河岸、解析高度≈渲染网格，
// 消除人物陷入河岸与水面插进抹平网格的穿模。min: 2.0/tan44≈2.07m；main: 2.4/tan46≈2.32m。
const RIVER_CHANNEL_MIN_SLOPE_DEG = 44
const MAIN_RIVER_CHANNEL_CUT = 2.4
const MAIN_RIVER_CHANNEL_SLOPE_DEG = 46
const MAIN_RIVER_WATER_DEPTH = 0.75
const BRANCH_RIVER_WATER_DEPTH = 0.45
const GULLY_STREAM_WATER_DEPTH = 0.35

function channelBankRun(cutDepth, slopeDeg = RIVER_CHANNEL_MIN_SLOPE_DEG) {
  return cutDepth / Math.tan(THREE.MathUtils.degToRad(slopeDeg))
}

function applySteepChannelCarve(height, distance, halfWidth, {
  cutDepth = RIVER_CHANNEL_MIN_CUT,
  slopeDeg = RIVER_CHANNEL_MIN_SLOPE_DEG,
  bedTarget = height - cutDepth,
} = {}) {
  const run = Math.max(0.35, channelBankRun(cutDepth, slopeDeg))
  if (distance > halfWidth + run) return height
  const floor = Math.min(height - cutDepth, bedTarget)
  if (distance <= halfWidth) return Math.min(height, floor)
  const t = THREE.MathUtils.clamp((distance - halfWidth) / run, 0, 1)
  return Math.min(height, THREE.MathUtils.lerp(floor, height, t))
}

function getWaterSurfaceY(sample, getTerrainHeight, depth) {
  if (!getTerrainHeight) return sample.waterY
  return getTerrainHeight(sample.x, sample.z) + depth
}

function withWaterSurface(sample, getTerrainHeight, depth) {
  return {
    ...sample,
    sourceWaterY: sample.waterY,
    waterY: getWaterSurfaceY(sample, getTerrainHeight, depth),
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
  for (const { branch, bounds } of RIVER_BRANCH_BOUNDS) {
    if (!isInsideBounds(bounds, x, z)) continue
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
    + THREE.MathUtils.smoothstep(branch.distance, branch.halfWidth + 0.1, branch.halfWidth + 3) * 1.15
    + Math.max(0, swaleNoise) * 0.10
  const swale = branch.waterY + 0.86
    + slopeT * (branch.branch.sideChannel ? 1.0 : 1.55)
    + swaleNoise * 0.36
  let target = THREE.MathUtils.lerp(swale, nearBank, wetBankMask)
  target = THREE.MathUtils.lerp(target, floor, floorMask)
  const channelProtect = branch.distance < branch.halfWidth + 2 ? 0 : protect * 0.85
  const blend = Math.max(floorMask, swaleMask * 0.82) * (1 - channelProtect)
  const shaped = THREE.MathUtils.lerp(height, target, blend)
  const carved = applySteepChannelCarve(height, branch.distance, branch.halfWidth, {
    cutDepth: RIVER_CHANNEL_MIN_CUT,
    slopeDeg: RIVER_CHANNEL_MIN_SLOPE_DEG,
    bedTarget: floor,
  })
  return Math.min(height, shaped, carved)
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
  for (const { gully, bounds } of EROSION_GULLY_BOUNDS) {
    if (!isInsideBounds(bounds, x, z)) continue
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
    + THREE.MathUtils.smoothstep(gully.distance, gully.halfWidth + 0.1, gully.halfWidth + 2.8) * 0.95
    + Math.max(0, bankNoise) * 0.08
  const apron = gully.waterY + 0.72
    + THREE.MathUtils.smoothstep(gully.distance, gully.halfWidth + 5, gully.influence) * (0.9 + gully.depth * 0.22)
    + bankNoise * 0.28
  let target = THREE.MathUtils.lerp(apron, wetBank, wetBankMask)
  target = THREE.MathUtils.lerp(target, floor, floorMask)
  target += shoulderMask * 0.24
  const blend = Math.max(floorMask, apronMask * 0.72) * (1 - protect * 0.72)
  const shaped = THREE.MathUtils.lerp(height, target, blend)
  const carved = applySteepChannelCarve(height, gully.distance, gully.halfWidth, {
    cutDepth: RIVER_CHANNEL_MIN_CUT,
    slopeDeg: RIVER_CHANNEL_MIN_SLOPE_DEG,
    bedTarget: floor,
  })
  return Math.min(height, shaped, carved)
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
  // 宽缓大谷：把主河两侧一大圈地形从自然深坑抬升到 valleyFloor，避免远区塌坑。
  // （主河"贴岸"由 applyHeroRiverHeight 的近岸收窄负责，与此大谷宽度无关，故此处保持宽。）
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


// 山脚平缓化：corePower>1 让穹顶外凸(山顶不变、中段与脚部压低)；半径保持原值(放大会让山体探入河谷、加高谷壁崖)；
// h 较原值下调 ~50 以补偿切底从 -100 改为 -50 带来的整体抬升(净山顶高度基本不变)。
// 山脚平缓化（保峰高，零河流改动）：切底从 -100 放开到 -35（见 applySnowMountainHeight），
// 保留穹顶下半段缓坡 → 山脚不再从 100m 等高线突兀冒出。各峰 h 同步下调 65 补偿，
// 使净峰顶高度不变（base+h-100 == base+(h-65)-35）：同样高度摊在更大穹顶半径上 → 山面更缓。
const SNOW_PEAKS = [
  { x: -530, z: 545, rx: 295, rz: 258, h: 250, axis: 0.62, corePower: 0.86, ridgeHalfWidth: 32, ridgeAmp: 0.32, ridgeFreq: 0.019, ridgeShift: 1.2 },
  { x: -305, z: 650, rx: 275, rz: 232, h: 190, axis: 1.18, corePower: 0.9, ridgeHalfWidth: 28, ridgeAmp: 0.24, ridgeFreq: 0.021, ridgeShift: 0.5 },
  { x: -690, z: 330, rx: 244, rz: 292, h: 167, axis: 0.34, corePower: 0.92, ridgeHalfWidth: 30, ridgeAmp: 0.26, ridgeFreq: 0.017, ridgeShift: 2.4 },
  { x: -120, z: 500, rx: 306, rz: 280, h: 123, axis: 0.92, corePower: 0.94, ridgeHalfWidth: 34, ridgeAmp: 0.22, ridgeFreq: 0.016, ridgeShift: 1.9 },
]

const SNOW_RIDGE_LINES = [
  { a: { x: -690, z: 298 }, b: { x: -555, z: 548 }, h: 56, width: 42, freq: 0.013, freq2: 0.019, phase: 0.8, rough: 0.44 },
  { a: { x: -555, z: 548 }, b: { x: -445, z: 590 }, h: 46, width: 38, freq: 0.016, freq2: 0.021, phase: 1.2, rough: 0.39 },
  { a: { x: -445, z: 590 }, b: { x: -290, z: 630 }, h: 58, width: 40, freq: 0.014, freq2: 0.017, phase: 0.3, rough: 0.36 },
  { a: { x: -290, z: 630 }, b: { x: -120, z: 500 }, h: 44, width: 36, freq: 0.018, freq2: 0.015, phase: 0.6, rough: 0.35 },
  { a: { x: -680, z: 350 }, b: { x: -540, z: 390 }, h: 34, width: 32, freq: 0.021, freq2: 0.009, phase: 2.2, rough: 0.31 },
]

// 多向叠加正弦基噪声，归一到 ~[-1,1]（3 个旋转方向避免轴向规整）。
function snowNoiseBase(x, z, f, p) {
  return (Math.sin(x * f + z * f * 0.81 + p)
    + Math.sin(x * f * 0.79 - z * f * 1.11 + p * 1.7)
    + Math.sin(-x * f * 0.57 + z * f * 1.29 + p * 0.4)) / 3
}

// 雪山表面 ridged 噪声：把平滑径向穹顶打散成锐利岩脊 + 次级山脊/沟槽。
// 频率按 sin 标定（脊—谷间距 ≈ π/f）：oct1≈70m / oct2≈33m / oct3≈16m，最细全波长 ~31m
// 远在 active mesh 1.78m 分辨率之内（避免走样），更细破碎交给 shader 法线。exposed 越高越增锐。
function snowMountainSurfaceNoise(x, z, exposed) {
  // 域扭曲：低频偏移打破轴向条纹的规整
  const wx = x + Math.sin(x * 0.0067 + z * 0.011) * 26 + Math.sin(z * 0.013) * 13
  const wz = z + Math.sin(z * 0.0071 - x * 0.009) * 26 + Math.sin(x * 0.015) * 13

  // ridged = 1 - |n| 形成尖脊；减 0.5 中心化 → 有脊(+)有沟(-)，保整体山形体量。
  const r1 = 1 - Math.abs(snowNoiseBase(wx, wz, 0.045, 1.2))
  const r2 = 1 - Math.abs(snowNoiseBase(wx, wz, 0.095, 3.7))
  const r3 = 1 - Math.abs(snowNoiseBase(wx, wz, 0.20, 0.5))

  let disp = (r1 - 0.5) * 7.0
    + (r2 - 0.5) * 3.6
    + (r3 - 0.5) * 1.8

  // 轻微 fBm 非对称起伏，避免纯脊过于规则
  disp += snowNoiseBase(wx, wz, 0.062, 2.1) * 1.3

  // 极顶回收振幅：避免把已很陡的峰尖再推成近垂直细柱（heightfield 近垂直面会暴露竖条）。
  const summitCalm = 1 - THREE.MathUtils.smoothstep(exposed, 130, 280) * 0.6
  return disp * summitCalm
}

// 高大陡峭雪山（阿尔卑斯式）：4 峰 + 山脊，原始高度与陡度，靠岩雪贴图呈现真实感。
function applySnowMountainHeight(x, z, height) {
  let mountain = height
  for (const peak of SNOW_PEAKS) {
    const axis = peak.axis
    const d = Math.hypot((x - peak.x) / peak.rx, (z - peak.z) / peak.rz)
    if (d > 1.42) continue
    const localX = x - peak.x
    const localZ = z - peak.z
    const axisU = localX * Math.cos(axis) + localZ * Math.sin(axis)
    const axisV = -localX * Math.sin(axis) + localZ * Math.cos(axis)
    const body = 1 - THREE.MathUtils.smoothstep(0.02, 1.42, d)
    const bodySharp = Math.pow(body, peak.corePower)
    // 山脚平缓化：把窄裙边(0.58~1.18 砍 80%)改为长而缓的过渡(0.40~1.42 砍 60%)。
    const footScale = 1 - 0.8 * THREE.MathUtils.smoothstep(0.58, 1.18, d)
    const ridgeBand = Math.max(0, 1 - THREE.MathUtils.smoothstep(0.0, peak.ridgeHalfWidth, Math.abs(axisV)))
    const ridgeBandShape = Math.pow(ridgeBand, 2.0)
    const ridgeNoise = Math.sin(axisU * peak.ridgeFreq + peak.ridgeShift) * 0.44 + Math.cos(axisV * 0.042 + peak.ridgeShift * 1.6) * 0.28
    const ridge = Math.max(0, ridgeNoise) * peak.ridgeAmp * (0.45 + ridgeBandShape)
    mountain = Math.max(mountain, height + (peak.h * bodySharp + peak.h * ridgeBandShape * ridge) * footScale)
  }

  for (const ridge of SNOW_RIDGE_LINES) {
    const ax = ridge.a.x
    const az = ridge.a.z
    const vx = ridge.b.x - ax
    const vz = ridge.b.z - az
    const wx = x - ax
    const wz = z - az
    const segLen2 = Math.max(vx * vx + vz * vz, 0.0001)
    const t = THREE.MathUtils.clamp((wx * vx + wz * vz) / segLen2, 0, 1)
    const px = ax + vx * t
    const pz = az + vz * t
    const ridgeD = Math.hypot(x - px, z - pz)
    if (ridgeD > ridge.width) continue
    const crest = 1 - THREE.MathUtils.smoothstep(ridge.width * 0.16, ridge.width, ridgeD)
    const span = Math.sin(Math.PI * t)
    const seamNoise = (Math.sin(x * ridge.freq + z * ridge.freq2 + ridge.phase) + 1) * 0.5
    const ridgeFootScale = 1 - 0.8 * THREE.MathUtils.smoothstep(ridge.width * 0.58, ridge.width, ridgeD)
    const ridgeLift = ridge.h * Math.pow(crest, 1.3) * Math.pow(Math.max(0.0, span), 0.6) * (0.72 + seamNoise * ridge.rough)
    mountain = Math.max(mountain, height + ridgeLift * ridgeFootScale)
  }

  const pass = getRiverSampleAt(x, z)
  if (pass.t < 0.46 && pass.distance < 58) {
    const pathBlend = 1 - THREE.MathUtils.smoothstep(pass.distance, 18, 58)
    mountain = THREE.MathUtils.lerp(mountain, Math.min(mountain, pass.waterY + 3 + pass.distance * 0.28), pathBlend * 0.65)
  }

  const mountainLift = Math.max(0, mountain - height)
  // 切底 100→35：保留穹顶下半段缓坡（各峰 h 已下调 65 补偿净峰顶），山脚摊缓不再竖墙。
  const exposed = Math.max(0, mountainLift - 35)
  if (exposed <= 0) return height

  // 表面 ridged 噪声：打散平滑径向穹顶造成的网格台阶/列拉丝。
  // 山脚渐隐（避免悬空凸起/撞平地竖墙）+ 山口衰减（避免回填已下压的河道）。
  const footFade = THREE.MathUtils.smoothstep(exposed, 0, 40)
  let passFade = 1
  if (pass.t < 0.46 && pass.distance < 58) {
    passFade = THREE.MathUtils.smoothstep(pass.distance, 18, 58)
  }
  const disp = snowMountainSurfaceNoise(x, z, exposed) * footFade * passFade
  return height + exposed + disp
}

function applyHeroRiverHeight(x, z, height) {
  const river = getRiverSampleAt(x, z)
  const halfWidth = river.halfWidth
  const centralBelt = Math.exp(-Math.pow((river.t - 0.56) / 0.28, 2))
  // 收窄主河塑形半径：宽谷 → 较明确河道（外侧自然高地作贴水的岸）
  const valleyWidth = halfWidth + THREE.MathUtils.lerp(28, 44, centralBelt)
  if (river.distance > valleyWidth) return height
  const protect = protectedTerrainMask(x, z)
  const side = Math.sign((x - river.x) * -river.dirZ + (z - river.z) * river.dirX) || 1
  const bend = Math.sin(river.t * Math.PI * 5.2 + 0.8)
  const innerBank = THREE.MathUtils.clamp(0.5 + side * bend * 0.5, 0, 1)
  const outerBank = 1 - innerBank
  const floorMask = 1 - THREE.MathUtils.smoothstep(river.distance, halfWidth * 0.58, halfWidth + 0.8)
  // 收窄：碳刻只在近槽强、到 halfWidth+20 内迅速归零 → 外侧自然高地保留作贴水的岸
  const bankMask = 1 - THREE.MathUtils.smoothstep(river.distance, halfWidth + 6, halfWidth + 20)
  // 阶地从近岸即开始抬升（去掉宽漫滩台阶），让地形从水边 ~8–12m 内升过 waterY+2.5
  const terraceT = THREE.MathUtils.smoothstep(river.distance, halfWidth + 8, halfWidth + 26)
  const bedNoise = Math.sin(x * 0.21 + z * 0.08) * 0.18 + Math.sin(x * 0.07 - z * 0.18) * 0.12
  const swaleNoise = Math.sin(x * 0.032 + z * 0.047) * 0.34 + Math.sin(x * 0.061 - z * 0.024) * 0.22
  const terraceNoise = Math.sin(x * 0.018 - z * 0.014) * 0.85 + Math.sin(x * 0.011 + z * 0.027) * 0.55
  const riverFloor = river.waterY - THREE.MathUtils.lerp(0.58, 1.08, river.whitewater) + bedNoise
  // 近岸陡起：在 halfWidth+7~8 内升到 ~waterY+2.6~3.6 的明确河岸（内弯点沙坝略缓，外弯切岸更陡高）
  const pointBar = river.waterY + 0.7
    + THREE.MathUtils.smoothstep(river.distance, halfWidth - 0.2, halfWidth + 8) * (2.1 + innerBank * 0.5)
    + swaleNoise * 0.18
  const cutBank = river.waterY + 0.85
    + THREE.MathUtils.smoothstep(river.distance, halfWidth - 0.2, halfWidth + 7) * (2.8 + outerBank * 1.5)
    + Math.max(0, swaleNoise) * 0.22
  const nearBank = THREE.MathUtils.lerp(pointBar, cutBank, outerBank * 0.72)
  const terrace = river.waterY + 3.0
    + terraceT * (THREE.MathUtils.lerp(4.0, 7.5, centralBelt) + Math.max(0, terraceNoise))
    + terraceNoise * 0.28
  let target = THREE.MathUtils.lerp(nearBank, terrace, terraceT)
  target = THREE.MathUtils.lerp(target, riverFloor, floorMask)
  if (river.whitewater > 0.55 && river.distance < halfWidth + 4) target -= river.whitewater * 1.4
  const channelProtect = river.distance < halfWidth + 2 ? 0 : protect * 0.82
  const carve = Math.max(floorMask, bankMask * 0.92) * (1 - channelProtect)
  const shaped = THREE.MathUtils.lerp(height, target, carve)
  const carved = applySteepChannelCarve(height, river.distance, halfWidth, {
    cutDepth: MAIN_RIVER_CHANNEL_CUT,
    slopeDeg: MAIN_RIVER_CHANNEL_SLOPE_DEG,
    bedTarget: riverFloor,
  })
  return Math.min(height, shaped, carved)
}

// ── 统一河道场：返回全网最近的一条水道（主河/支流/wet 冲沟/中心西溪）──
function getBestWetGullyStreamSampleAt(x, z) {
  let best = null
  for (const { gully, bounds } of EROSION_GULLY_BOUNDS) {
    if (!gully.wet) continue
    if (!isInsideBounds(bounds, x, z)) continue
    const sample = getGullyStreamSampleAt(gully, x, z)
    if (!best || sample.distance < best.distance) best = sample
  }
  return best
}

// 返回该点「第二近水道」的边缘距离 edge(=distance-halfWidth)。
// 取主河/最近支流/最近 wet 冲沟三类各自的 edge，返回第二小者。
// 第二近水道越近（edge 越小）→ 此处越是两条水道交叠的交汇区；用于在交汇处抑制岸线白边。
function nearbyChannelSecondEdge(x, z) {
  const edges = []
  const push = (s) => { if (s) edges.push(s.distance - s.halfWidth) }
  push(getRiverSampleAt(x, z))
  push(getBestBranchSampleAt(x, z))
  push(getBestWetGullyStreamSampleAt(x, z))
  if (edges.length < 2) return Infinity
  edges.sort((a, b) => a - b)
  return edges[1]
}

// ── 河道交汇水潭 ──
// 多条水道在同一节点堆叠时，水带各按"最近河道"取水高、河道间地脊又挖不到 →
// 渲染出多块错台平面 + 沙楔 + 贴陡岸的垂直水片。每个交汇口用一个显式水潭统一为
// 单一水面 + 碗状盆地：① 水高在池内收敛到同一 surfaceY（消台阶）② 盆地碳刻把池内
// 地形统一降到水面下（消沙楔/淹没干沟末端）③ 另配一块水盘网格兜底覆盖（填补水带间缝）。
const CONFLUENCE_POOLS = [
  // 三河汇流口：主河 + southwest_creek + 中西溪。该处真实地形是被 applyLargeWorldHeight 压低的宽缓低盆
  // （实测床 +0.9~+1.7），与解析河水位(+3.0)脱钩 ~1.7m → 解析水面会铺成浮高水板、人物没胸穿模。
  // 故用实测显式高度锚定到河床：surfaceY≈池外主河水带(床+0.75≈+2.0)；bedY 1.2 碗状统一盆底、消错台。
  { x: -274, z: 8, rInner: 10, rOuter: 18, depth: 1.0, surfaceY: 2.0, bedY: 1.2 },
  // rill 汇聚路口：central_north_rill 深槽(床≈-4) + 周边 -2 沙脊上的 west_ridge/central_fan/old_center 碎坑。
  // 该处地形是与解析水位脱钩的深坑，故用实测的绝对高度直接定面/挖盆：水面≈渲染水带(床+0.45≈-3.6)，
  // 盆底 -4.3 把 -2 沙脊统一下挖成一处真正下沉的水潭（消尖角沙楔/错台），而非浮在沙上的水包。
  // （大谷抬升已恢复 → 周边回到 ~-2..-4，故水面/盆底回到 -3.5/-4.3 锚定；不再用 -16 盆地值。）
  { x: -160, z: 34, rInner: 7, rOuter: 15, depth: 0.8, surfaceY: -3.5, bedY: -4.3 },
  // 中央三河交汇口：主河 + central_north_rill 终点 + central_side_channel 起点 + center_left 冲沟终点。
  // 正压主河上、地形≈解析水位，故自动水面即可（同 -274,8）；统一成一个潭以消除白边/分段台阶。
  { x: -160, z: -52, rInner: 9, rOuter: 17, depth: 0.9 },
  // central_north_rill × nw_terrace 的 X 形交叉口（约 -145,82）：两条 wet 水道交叉、互不为汇口、
  // 水位不同且交叉间地脊未挖通 → 干沙坝堵住 + 错台。用水潭统一水面并把沙坝碗状挖到水下打通互通。
  // 该处地形与解析水位脱钩（实测自然地形 -3.6~-1.3，解析 waterY=2.72 偏高会浮空），故用实测显式高度：
  // surfaceY≈主导水道(nw_terrace,depth0.35)渲染水面(床-3.6+0.35≈-3.3)；bedY -4.1 把 -1.5 沙坝挖到水下打通。
  // （大谷抬升已恢复 → 周边回到 ~-2..-4，故回到 -3.3/-4.1 锚定；不再用 -16 盆地值。）
  { x: -146, z: 80, rInner: 11, rOuter: 19, depth: 0.8, surfaceY: -3.3, bedY: -4.1 },
]
function confluencePoolSurfaceY(pool) {
  // 显式 surfaceY（实测锚定，用于与解析水位脱钩的坑地）优先；否则按解析河水位推导
  // （与河道渲染水面同高：waterY - 0.15，见 applyChannelNetworkCarve）。
  if (pool.surfaceY !== undefined) return pool.surfaceY
  if (pool._surfaceY === undefined || pool._surfaceY === null) {
    const s = sampleChannelNetwork(pool.x, pool.z)
    pool._surfaceY = (s ? s.waterY : getRiverSampleAt(pool.x, pool.z).waterY) - 0.15
  }
  return pool._surfaceY
}
// 返回该点权重最大的水潭及其权重；无任何池覆盖则 weight=0,pool=null。
function confluencePoolWeightAt(x, z) {
  let weight = 0
  let pool = null
  for (const p of CONFLUENCE_POOLS) {
    const d = Math.hypot(x - p.x, z - p.z)
    const w = 1 - THREE.MathUtils.smoothstep(d, p.rInner, p.rOuter)
    if (w > weight) { weight = w; pool = p }
  }
  return { weight, pool }
}

function sampleChannelNetwork(x, z) {
  let best = null
  const consider = (s, depth) => {
    if (!s) return
    const edge = s.distance - s.halfWidth   // <0 表示在水道内，越小越主导
    if (!best || edge < best.edge) {
      best = { edge, distance: s.distance, halfWidth: s.halfWidth, waterY: s.waterY, dirX: s.dirX, dirZ: s.dirZ, x: s.x, z: s.z, depth }
    }
  }
  consider(getRiverSampleAt(x, z), MAIN_RIVER_WATER_DEPTH)
  consider(getBestBranchSampleAt(x, z), BRANCH_RIVER_WATER_DEPTH)
  consider(getBestWetGullyStreamSampleAt(x, z), GULLY_STREAM_WATER_DEPTH)
  return best
}

// 统一逐顶点水高：返回该世界点处「最近水道」的实际水面 Y（河床地形 + 深度）。
// 两片水带在同一 (x,z) 重叠时取到同一 Y → 共面，消除交叉口硬切面。无水道则 null。
function channelNetworkWaterYAt(x, z, getTerrainHeight) {
  const s = sampleChannelNetwork(x, z)
  const { weight: poolW, pool } = confluencePoolWeightAt(x, z)
  if (!s) {
    // 池内即使不属于任何水带也给出池面（让水盘/水带在池心共面覆盖）
    return poolW > 0 ? confluencePoolSurfaceY(pool) : null
  }
  const base = getTerrainHeight ? getTerrainHeight(s.x, s.z) + s.depth : s.waterY
  // 交汇口：把逐顶点水高平滑收敛到统一池面，消除"最近河道分段"造成的台阶
  if (poolW > 0) return THREE.MathUtils.lerp(base, confluencePoolSurfaceY(pool), poolW)
  return base
}

// ── 统一碳刻：保证任何水道（含交叉口）都被挖到河床，消除漏挖/水漫/飘空 ──
// 作为最后一道"兜底"碳刻附加在所有河谷塑形之后；Math.min 只会加深，不破坏既有塑形。
const CHANNEL_NETWORK_CARVE_RUN = Math.max(0.35, channelBankRun(RIVER_CHANNEL_MIN_CUT, RIVER_CHANNEL_MIN_SLOPE_DEG))
function applyChannelNetworkCarve(x, z, height) {
  const s = sampleChannelNetwork(x, z)
  if (!s) return height
  if (s.distance > s.halfWidth + CHANNEL_NETWORK_CARVE_RUN) return height
  // 保护区（城堡引道/矿洞等）外圈不强行开挖；河道核心仍保证开挖
  const protect = protectedTerrainMask(x, z)
  if (s.distance > s.halfWidth + 1 && protect > 0.6) return height
  // 直接碳刻到「绝对河床高度」（基于解析水面，不随已碳刻的 height 浮动），
  // 避免在 modifier 链里用 height-cutDepth 二次下挖导致整条河越挖越深。
  const bedTarget = s.waterY - s.depth - 0.15
  if (s.distance <= s.halfWidth) return Math.min(height, bedTarget)
  const t = THREE.MathUtils.clamp((s.distance - s.halfWidth) / CHANNEL_NETWORK_CARVE_RUN, 0, 1)
  return Math.min(height, THREE.MathUtils.lerp(bedTarget, height, t))
}

// 交汇水潭碗状盆地：把池内地形统一降到水面下，抹掉河道间地脊（沙楔），并给水盘让出水深。
// 只加深(Math.min)、平滑权重 → 不破坏既有塑形、池缘斜坡温和。加在 applyChannelNetworkCarve 之后。
function applyConfluencePoolCarve(x, z, height) {
  let out = height
  for (const pool of CONFLUENCE_POOLS) {
    const d = Math.hypot(x - pool.x, z - pool.z)
    const w = 1 - THREE.MathUtils.smoothstep(d, pool.rInner, pool.rOuter)
    if (w <= 0) continue
    // 显式 bedY（实测盆底）优先；否则按池面 - 深度
    const bed = pool.bedY !== undefined ? pool.bedY : confluencePoolSurfaceY(pool) - pool.depth
    // 原来只 Math.min（只挖深）：若上游 rill 把潭区过挖到远低于 bed，潭底被拖到 -18、水面凸出。
    // 改为向 bed 双向收敛：池心(w→1)坐落到 bed（含回填被 rill 过挖的部分），池缘(w→0)不动 → 正常水盆。
    out = THREE.MathUtils.lerp(out, bed, w)
  }
  return out
}

// ── 湿河道纵向限坡缓化：消除"水往坡上爬"的向上台阶/沙脊 ──
// 渲染水面=河床+depth，河床纵向陡升处水面随之竖起成片。这里把每条 wet 河道的河床沿程做
// 「双向上坡限速」缓化（每米上升不超过 tan(12°)），只加深(Math.min) → 抹平向上台阶、把进/出
// 深潭的竖直水台阶缓化为斜坡；向下跌水头另由「裁剪高源头段」消除（碳刻无法抬高下游来削平跌水）。
const GRADE_MAX_SLOPE = Math.tan(THREE.MathUtils.degToRad(12))
const GRADE_BANK_RUN = Math.max(0.35, channelBankRun(RIVER_CHANNEL_MIN_CUT, RIVER_CHANNEL_MIN_SLOPE_DEG))
const GRADE_SAMPLE_STEP = 3
let _gradeProfiles = null
// 直接重跑「平滑前」的修改器链求某点河床（不依赖 onReady 时序、不递归进本 modifier）。
// 仅含影响河道床位的几道；城堡/山缘/矿洞与本河道区无关，略去。
function channelBedNoSmooth(x, z, sampleBaseHeight) {
  let h = sampleBaseHeight(x, z)
  h = applyLargeWorldHeight(x, z, h)
  h = applyLargeRiverValleyHeight(x, z, h)
  h = applySnowMountainHeight(x, z, h)
  h = applyHeroRiverHeight(x, z, h)
  h = applyRiverBranchHeight(x, z, h)
  h = applyGullyNetworkHeight(x, z, h)
  h = applyChannelNetworkCarve(x, z, h)
  h = applyConfluencePoolCarve(x, z, h)
  return h
}
function getGradeChannels() {
  const rill = getBranchById('central_north_rill')
  const oldc = EROSION_GULLIES.find(g => g.id === 'old_center')
  const cleft = EROSION_GULLIES.find(g => g.id === 'center_left')
  return [
    { points: rill.points, halfWidthAt: t => branchHalfWidthAt(rill, t) },
    { points: oldc.points, halfWidthAt: t => gullyStreamHalfWidthAt(oldc, t) },
    { points: cleft.points, halfWidthAt: t => gullyStreamHalfWidthAt(cleft, t) },
  ]
}
function buildChannelGradeProfiles(sampleBaseHeight) {
  const profiles = []
  for (const ch of getGradeChannels()) {
    const pts = ch.points
    const { lengths, total } = getPathMeta(pts)
    const ts = [], bs = [], xs = [], zs = []
    let acc = 0
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1]
      const segLen = lengths[i]
      const n = Math.max(1, Math.round(segLen / GRADE_SAMPLE_STEP))
      for (let j = 0; j <= n; j++) {
        if (i > 0 && j === 0) continue
        const lt = j / n
        const x = a.x + (b.x - a.x) * lt
        const z = a.z + (b.z - a.z) * lt
        ts.push((acc + segLen * lt) / Math.max(0.0001, total))
        xs.push(x)
        zs.push(z)
        bs.push(channelBedNoSmooth(x, z, sampleBaseHeight))
      }
      acc += segLen
    }
    // 双向上坡限速：相邻 B 上升不超过 tan(12°)·ds（只压不抬）→ 削平向上台阶
    for (let i = 1; i < bs.length; i++) {
      const ds = Math.hypot(xs[i] - xs[i - 1], zs[i] - zs[i - 1]) || 1
      bs[i] = Math.min(bs[i], bs[i - 1] + GRADE_MAX_SLOPE * ds)
    }
    for (let i = bs.length - 2; i >= 0; i--) {
      const ds = Math.hypot(xs[i + 1] - xs[i], zs[i + 1] - zs[i]) || 1
      bs[i] = Math.min(bs[i], bs[i + 1] + GRADE_MAX_SLOPE * ds)
    }
    profiles.push({ points: pts, halfWidthAt: ch.halfWidthAt, ts, bs, bounds: makePathBounds(pts, 6) })
  }
  _gradeProfiles = profiles
}
function gradeBedAt(prof, t) {
  const { ts, bs } = prof
  if (t <= ts[0]) return bs[0]
  if (t >= ts[ts.length - 1]) return bs[bs.length - 1]
  for (let i = 1; i < ts.length; i++) {
    if (t <= ts[i]) {
      const f = (t - ts[i - 1]) / ((ts[i] - ts[i - 1]) || 1)
      return bs[i - 1] + (bs[i] - bs[i - 1]) * f
    }
  }
  return bs[bs.length - 1]
}
function applyChannelSmoothGrade(x, z, height, sampleBaseHeight) {
  if (!_gradeProfiles) buildChannelGradeProfiles(sampleBaseHeight)
  let out = height
  for (const prof of _gradeProfiles) {
    if (!isInsideBounds(prof.bounds, x, z)) continue
    const s = getPathSample(prof.points, x, z)
    const hw = prof.halfWidthAt(s.t)
    if (s.distance > hw + GRADE_BANK_RUN) continue
    const bed = gradeBedAt(prof, s.t)
    const target = s.distance <= hw
      ? bed
      : THREE.MathUtils.lerp(bed, height, THREE.MathUtils.clamp((s.distance - hw) / GRADE_BANK_RUN, 0, 1))
    out = Math.min(out, target)
  }
  return out
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

      // 法线驱动的三平面混合权重：陡面权重转向 zy/xy 投影，避免 xz 俯视投影在竖直坡上拉伸
      vec3 tpWeights() {
        vec3 n = abs(normalize(vWorldNormal));
        n = pow(n, vec3(4.0));            // 锐化，缩窄过渡带、减少接缝糊
        return n / max(n.x + n.y + n.z, 1e-4);
      }

      vec3 triplanarColor(sampler2D t, float s, vec3 w) {
        vec3 cx = texture2D(t, vWorldPos.zy * s).rgb;
        vec3 cy = texture2D(t, vWorldPos.xz * s).rgb;
        vec3 cz = texture2D(t, vWorldPos.xy * s).rgb;
        return cx * w.x + cy * w.y + cz * w.z;
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

      // 三平面程序化噪声：在陡面上同样不沿竖直方向拉伸
      float terrainNoiseTP(float s, vec3 w) {
        return terrainNoise(vWorldPos.zy * s) * w.x
             + terrainNoise(vWorldPos.xz * s) * w.y
             + terrainNoise(vWorldPos.xy * s) * w.z;
      }

      // 坐标显式版三平面噪声（供细节法线做有限差分；权重 w 为常量）
      float terrainNoiseTPAt(vec3 p, float s, vec3 w) {
        return terrainNoise(p.zy * s) * w.x
             + terrainNoise(p.xz * s) * w.y
             + terrainNoise(p.xy * s) * w.z;
      }

      // 高频细节法线：对三平面噪声做世界空间有限差分梯度，投影到切平面后微扰法线，
      // 打散几何网格分辨率（~1.78m）以下、几何噪声无法表达的残余细条带。
      vec3 terrainDetailNormalWS(vec3 wn, vec3 w, float s, float strength) {
        float e = 0.6;
        float f0 = terrainNoiseTPAt(vWorldPos, s, w);
        float fx = terrainNoiseTPAt(vWorldPos + vec3(e, 0.0, 0.0), s, w);
        float fy = terrainNoiseTPAt(vWorldPos + vec3(0.0, e, 0.0), s, w);
        float fz = terrainNoiseTPAt(vWorldPos + vec3(0.0, 0.0, e), s, w);
        vec3 grad = vec3(fx - f0, fy - f0, fz - f0) / e;
        vec3 tang = grad - dot(grad, wn) * wn;   // 仅取切平面分量
        return normalize(wn - tang * strength);
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

${TERRAIN_RIVER_SAMPLE_GLSL}
${TERRAIN_BRANCH_SAMPLE_GLSL}

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
      vec3 tpW = tpWeights();
      // 反照率走三平面：陡坡不再把草/岩沿竖直方向拉成条纹
      vec4 dirtColor = vec4(triplanarColor(map, uDirtUvScale, tpW), 1.0);
      // 土壤加深：压暗 + 偏暖褐，从浅沙黄变更深的泥土色
      dirtColor.rgb *= vec3(0.66, 0.58, 0.50);
      vec4 rockColor = vec4(triplanarColor(uRockMap, uRockUvScale, tpW), 1.0);
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
      // 用噪声扰动到河距离，使湿泥/黏土带边界呈不规则锯齿状蜿蜒，而非同心硬边
      float bankEdgeNoise = (terrainNoise(vWorldPos.xz * 0.14 + vec2(3.1, 9.4)) - 0.5) * 4.0
                          + (terrainNoise(vWorldPos.xz * 0.46) - 0.5) * 1.6;
      float wetDist = riverSample.x + bankEdgeNoise;
      // 加宽湿泥滩：黏土带外沿 +18→+26，湿泥带外沿 +5.6→+11
      float riverBank = (1.0 - smoothstep(riverWidth + 1.5, riverWidth + 26.0, wetDist)) * smoothstep(riverWidth - 1.2, riverWidth + 4.5, wetDist);
      float riverWetEdge = 1.0 - smoothstep(riverWidth - 0.6, riverWidth + 14.0, wetDist);
      float riverMoss = (1.0 - smoothstep(riverWidth + 14.0, riverWidth + 34.0, wetDist)) * smoothstep(riverWidth + 6.0, riverWidth + 18.0, wetDist);
      float riverBankNoise = terrainNoise(vWorldPos.xz * 0.38 + vec2(2.7, 8.1));
      float riverWetBreakup = terrainNoise(vWorldPos.xz * 0.72 + vec2(10.6, 4.7));
      // 多色斑驳：用独立尺度/相位的噪声把"湿黑腐殖 / 暖棕泥 / 赭黄黏土 / 苔绿"交错混入岸带，
      // 而非按距离单调分层，对应参考图那种丰富自然的河岸土壤。
      float mottleA = terrainNoise(vWorldPos.xz * 0.22 + vec2(13.1, 5.5));
      float mottleB = terrainNoise(vWorldPos.xz * 0.55 + vec2(4.3, 18.9));
      float mottleC = terrainNoise(vWorldPos.xz * 1.05 + vec2(9.7, 2.2));
      vec3 bankMoss = vec3(0.17, 0.26, 0.12) * (0.84 + riverBankNoise * 0.22);
      vec3 riverClay = vec3(0.30, 0.24, 0.15) * (0.84 + riverBankNoise * 0.26);   // 偏暖赭黄黏土
      vec3 warmHumus = vec3(0.13, 0.10, 0.06) * (0.82 + mottleB * 0.28);          // 暖棕腐殖
      // 更暗、偏黑棕的湿泥（参考图水边特征）
      vec3 wetMud = vec3(0.050, 0.035, 0.022) * (0.82 + riverBankNoise * 0.24);
      vec3 wetSheen = vec3(0.15, 0.14, 0.105) * (0.74 + riverWetBreakup * 0.34);
      // 整条近岸带（水边→外）都铺多色斑驳土壤：近水偏湿黑泥，向外渐变到暖棕腐殖/赭黏土/苔绿。
      // riverWetEdge 作"近水度"：1=贴水边、0=岸带外缘。
      float nearWet = riverWetEdge;
      // 距离基底：近水 wetMud↔暖棕腐殖，外侧 黏土↔苔绿
      vec3 bankSoil = mix(warmHumus, wetMud, smoothstep(0.35, 0.9, nearWet));
      bankSoil = mix(riverClay, bankSoil, smoothstep(0.12, 0.55, nearWet));
      // 斑驳：叠加交错的腐殖/黏土/苔绿，使其不是单调一色
      bankSoil = mix(bankSoil, warmHumus, smoothstep(0.40, 0.78, mottleA) * 0.5);
      bankSoil = mix(bankSoil, riverClay, smoothstep(0.48, 0.86, mottleB) * 0.4);
      bankSoil = mix(bankSoil, bankMoss, smoothstep(0.58, 0.9, mottleC) * 0.45);
      // 覆盖整条近岸带：合并 黏土带 + 湿泥带 + 苔藓带 作 mask（最外到 riverWidth+34）
      float bankZone = clamp(max(max(riverWetEdge, riverBank), riverMoss * 0.85), 0.0, 1.0);
      terrainColor = mix(terrainColor, bankSoil, bankZone * 0.88);
      terrainColor = mix(terrainColor, wetSheen, riverWetEdge * smoothstep(0.56, 0.94, riverWetBreakup) * 0.22);
      float centralRiverBelt = exp(-pow((riverSample.y - 0.56) / 0.25, 2.0));
      float centralRiverWidth = mix(4.8, 7.8, pow(riverSample.y, 0.62)) + centralRiverBelt * 3.2;
      float centralWetEdge = 1.0 - smoothstep(centralRiverWidth - 0.5, centralRiverWidth + 22.0, wetDist);
      // 把浅色点沙坝推到更外侧，给紧贴水边的深色湿泥让出空间
      float centralPointBar = (1.0 - smoothstep(centralRiverWidth + 12.0, centralRiverWidth + 30.0, riverSample.x)) * smoothstep(centralRiverWidth + 9.0, centralRiverWidth + 16.0, riverSample.x);
      float centralFloodplain = (1.0 - smoothstep(centralRiverWidth + 26.0, centralRiverWidth + 92.0 + centralRiverBelt * 38.0, riverSample.x)) * smoothstep(centralRiverWidth + 14.0, centralRiverWidth + 42.0, riverSample.x);
      float centralRiverNoise = terrainNoise(vWorldPos.xz * 0.31 + vec2(6.4, 3.9));
      vec3 centralSand = vec3(0.48, 0.44, 0.34) * (0.86 + centralRiverNoise * 0.24);
      vec3 centralFloodplainGreen = vec3(0.25, 0.34, 0.20) * (0.82 + centralRiverNoise * 0.20);
      terrainColor = mix(terrainColor, centralSand, centralPointBar * 0.50);
      terrainColor = mix(terrainColor, centralFloodplainGreen, centralFloodplain * 0.34);
      terrainColor = mix(terrainColor, wetMud * 0.9, centralWetEdge * 0.9);
      terrainColor = mix(terrainColor, wetSheen * 0.92, centralWetEdge * smoothstep(0.48, 0.92, centralRiverNoise) * 0.24);
      vec3 branchSample = terrainBranchSample(vWorldPos.xz);
      float branchWidth = mix(1.35, 3.0, branchSample.y) + sin(branchSample.y * 3.14159265) * 0.35;
      // 支流较窄，用较小幅度噪声打碎湿泥边界并适度加宽 +4.4→+8
      float branchEdgeNoise = (terrainNoise(vWorldPos.xz * 0.2 + vec2(7.7, 2.3)) - 0.5) * 2.6
                            + (terrainNoise(vWorldPos.xz * 0.6) - 0.5) * 1.1;
      float branchWetDist = branchSample.x + branchEdgeNoise;
      float branchWetEdge = 1.0 - smoothstep(branchWidth - 0.25, branchWidth + 8.0, branchWetDist);
      float branchBank = (1.0 - smoothstep(branchWidth + 2.0, branchWidth + 18.0, branchWetDist)) * smoothstep(branchWidth + 0.6, branchWidth + 5.5, branchWetDist);
      float branchLowland = (1.0 - smoothstep(branchWidth + 10.0, branchWidth + 30.0, branchSample.x)) * smoothstep(branchWidth + 5.0, branchWidth + 14.0, branchSample.x);
      float branchNoise = terrainNoise(vWorldPos.xz * 0.52 + vec2(4.2, 15.8));
      vec3 branchGravel = vec3(0.40, 0.38, 0.31) * (0.84 + branchNoise * 0.22);
      vec3 branchWetMud = vec3(0.085, 0.066, 0.044) * (0.80 + branchNoise * 0.22);   // 更暗偏棕
      vec3 branchLowGrass = vec3(0.17, 0.26, 0.13) * (0.86 + branchNoise * 0.18);
      // 支流湿泥也斑驳：复用主河 mottle 噪声，棕腐/黏土/苔绿交错
      vec3 branchSoil = branchWetMud;
      branchSoil = mix(branchSoil, warmHumus, smoothstep(0.35, 0.75, mottleA));
      branchSoil = mix(branchSoil, riverClay * 0.92, smoothstep(0.45, 0.85, mottleB) * 0.6);
      branchSoil = mix(branchSoil, bankMoss, smoothstep(0.55, 0.88, mottleC) * 0.5);
      terrainColor = mix(terrainColor, branchGravel, branchBank * 0.42);
      terrainColor = mix(terrainColor, branchLowGrass, branchLowland * 0.30);
      terrainColor = mix(terrainColor, branchSoil, branchWetEdge * 0.82);
      vec3 gullySample = terrainGullySample(vWorldPos.xz);
      float gullyCore = 1.0 - smoothstep(2.4, 8.5, gullySample.x);
      float gullyApron = (1.0 - smoothstep(8.0, 34.0, gullySample.x)) * smoothstep(3.0, 12.0, gullySample.x);
      float gullyNoise = terrainNoise(vWorldPos.xz * 0.6 + vec2(8.8, 1.9));
      vec3 gullyGravel = vec3(0.43, 0.41, 0.34) * (0.86 + gullyNoise * 0.22);
      vec3 wetCut = vec3(0.105, 0.094, 0.066) * (0.82 + gullyNoise * 0.24);
      vec3 gullyGrass = vec3(0.20, 0.29, 0.16) * (0.86 + gullyNoise * 0.16);
      terrainColor = mix(terrainColor, gullyGravel, gullyApron * 0.22);
      terrainColor = mix(terrainColor, wetCut, gullyCore * 0.74);
      terrainColor = mix(terrainColor, gullyGrass, gullyApron * 0.26);
      // ── 陡河岸斑驳岩壁/地衣（参考图对岸特征）：靠近河 ∩ 坡陡 处把 rock 染绿灰 + 深色地衣斑 ──
      float bankProximity = max(
        1.0 - smoothstep(riverWidth + 2.0, riverWidth + 30.0, wetDist),
        1.0 - smoothstep(branchWidth + 1.0, branchWidth + 18.0, branchWetDist)
      );
      float bankSteep = smoothstep(0.14, 0.40, 1.0 - clamp(dot(normalize(vWorldNormal), vec3(0.0, 1.0, 0.0)), 0.0, 1.0));
      float bankRockMask = bankProximity * bankSteep;
      vec3 lichenRock = rockColor.rgb * vec3(0.62, 0.66, 0.55);   // 绿灰风化岩
      float lichenPatch = smoothstep(0.52, 0.84, terrainNoise(vWorldPos.xz * 0.30 + vec2(3.3, 7.7)));
      lichenRock = mix(lichenRock, vec3(0.17, 0.19, 0.15), lichenPatch * 0.7);   // 深色地衣斑
      lichenRock = mix(lichenRock, vec3(0.30, 0.36, 0.24), smoothstep(0.6, 0.9, terrainNoise(vWorldPos.xz * 0.7)) * 0.35);  // 零星苔绿
      terrainColor = mix(terrainColor, lichenRock, bankRockMask * 0.7);
      // ── 远景地面着色（按到相机水平距离）：远山丘刷草绿、河道附近刷岩石色；近处保持土壤/河岸原色 ──
      float camDistXZ = distance(vWorldPos.xz, cameraPosition.xz);
      float farFactor = smoothstep(40.0, 110.0, camDistXZ);              // 近处=0 不变，向远处渐入
      float farGentle = smoothstep(0.55, 0.80,
        clamp(dot(normalize(vWorldNormal), vec3(0.0, 1.0, 0.0)), 0.0, 1.0));   // 陡坡/崖不染绿
      // 河道附近（远处）→ 岩石色（复用 bankProximity：主河+支流近岸度）
      vec3 farRock = rockColor.rgb * vec3(0.78, 0.80, 0.80);
      terrainColor = mix(terrainColor, farRock, farFactor * bankProximity * 0.7);
      // 远处山丘缓坡（远离河道、非岩、非高坡）→ 草绿
      float farMeadowMask = farFactor * farGentle * (1.0 - rockMask)
        * (1.0 - bankProximity) * (1.0 - smoothstep(24.0, 34.0, vWorldPos.y));
      vec3 farMeadowGreen = mix(vec3(0.150, 0.250, 0.090), vec3(0.205, 0.330, 0.120),
        terrainNoise(vWorldPos.xz * 0.21 + vec2(8.3, 2.6)));
      terrainColor = mix(terrainColor, farMeadowGreen, farMeadowMask * 0.75);
      // ── 陡面强制裸岩：坡度大处一律盖掉草绿/河岸地衣绿，露中性冷灰岩，
      //    避免绿草爬上近垂直崖面（河道穿山导致 2D 距离近，绿苔本会染到高崖）──
      float cliffSlope = 1.0 - clamp(dot(normalize(vWorldNormal), vec3(0.0, 1.0, 0.0)), 0.0, 1.0);
      float cliffMask = smoothstep(0.44, 0.74, cliffSlope) * smoothstep(12.0, 30.0, vWorldPos.y);
      vec3 cliffRock = rockColor.rgb * vec3(0.70, 0.73, 0.76);
      cliffRock = mix(cliffRock, cliffRock * vec3(0.82, 0.86, 0.92), smoothstep(0.62, 0.92, cliffSlope) * 0.5); // 越陡越冷暗
      cliffRock *= 0.86 + terrainNoiseTP(0.42, tpW) * 0.20;
      terrainColor = mix(terrainColor, cliffRock, cliffMask * 0.92);
      float snowMountainMask = smoothstep(22.0, 64.0, vWorldPos.y);
      float highAlpineMask = smoothstep(112.0, 198.0, vWorldPos.y);
      float slopeMask = terrainSlopeMask();
      // ── 高山岩：三平面噪声做"地层带"明暗 + 颗粒，陡面深冷灰、缓坡略暖，杜绝竖直拉伸 ──
      float strata = terrainNoiseTP(0.045, tpW);          // 低频：沉积/节理大带
      float rockGrain = terrainNoiseTP(0.5, tpW);         // 高频：岩石颗粒
      vec3 alpineRock = mix(vec3(0.40, 0.42, 0.44), vec3(0.60, 0.61, 0.62), strata);
      alpineRock = mix(alpineRock, vec3(0.30, 0.33, 0.37), slopeMask * 0.45);                 // 陡面更深冷
      alpineRock = mix(alpineRock, alpineRock * vec3(1.05, 1.0, 0.93), (1.0 - slopeMask) * 0.22); // 缓坡略暖
      alpineRock *= 0.90 + rockGrain * 0.18;
      terrainColor = mix(terrainColor, alpineRock, snowMountainMask * (1.0 - highAlpineMask * 0.30));
      // ── 雪分布：缓坡/凹处堆积，陡面露岩；雪线用三平面噪声犬牙交错 ──
      float snowPatch = terrainNoiseTP(0.03, tpW);
      float windSnow = terrainNoiseTP(0.16, tpW);
      float settledSnow = smoothstep(46.0, 100.0, vWorldPos.y) * (1.0 - smoothstep(0.18, 0.62, slopeMask));
      float streakSnow = smoothstep(44.0, 116.0, vWorldPos.y)
        * smoothstep(0.42, 0.74, snowPatch + windSnow * 0.22)
        * (1.0 - smoothstep(0.66, 0.96, slopeMask));
      float summitSnow = highAlpineMask * (1.0 - smoothstep(0.72, 1.0, slopeMask)) * 0.95;    // 极陡岩峰仍露岩
      float snowMask = clamp(max(max(settledSnow, streakSnow), summitSnow), 0.0, 1.0);
      // ── 雪色：亮白基底 + 细颗粒微光，陡面/阴影冷蓝，起伏轻微明暗 ──
      float snowGrain = terrainNoiseTP(1.1, tpW);
      vec3 snowColor = vec3(0.95, 0.97, 0.99) * (0.97 + snowGrain * 0.05);
      snowColor = mix(snowColor, vec3(0.74, 0.82, 0.92), slopeMask * 0.30);                   // 冷蓝阴影面
      snowColor *= 0.95 + snowPatch * 0.06;
      terrainColor = mix(terrainColor, snowColor, snowMask);
      terrainColor *= 0.93 + terrainNoiseTP(1.3, tpW) * 0.10;
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

        // dirt 法线仍走切线空间（平地为主，不会拉伸）
        vec3 dirtN = texture2D(normalMap, terrainDirtUv()).xyz * 2.0 - 1.0;
        dirtN.xy *= normalScale;
        vec3 dirtWorldN = normalize(tbn * dirtN);

        // rock 法线走三平面 Whiteout blend，直接得到世界空间法线，峭壁细节不拉伸
        vec3 wn = normalize(vWorldNormal);
        vec3 tpWn = abs(wn);
        tpWn = pow(tpWn, vec3(4.0));
        tpWn /= max(tpWn.x + tpWn.y + tpWn.z, 1e-4);
        vec3 nax = texture2D(uRockNormalMap, vWorldPos.zy * uRockUvScale).xyz * 2.0 - 1.0;
        vec3 nay = texture2D(uRockNormalMap, vWorldPos.xz * uRockUvScale).xyz * 2.0 - 1.0;
        vec3 naz = texture2D(uRockNormalMap, vWorldPos.xy * uRockUvScale).xyz * 2.0 - 1.0;
        nax.xy *= normalScale;
        nay.xy *= normalScale;
        naz.xy *= normalScale;
        nax = vec3(nax.xy + wn.zy, abs(nax.z) * wn.x);
        nay = vec3(nay.xy + wn.xz, abs(nay.z) * wn.y);
        naz = vec3(naz.xy + wn.xy, abs(naz.z) * wn.z);
        vec3 rockWorldN = normalize(
          nax.zyx * tpWn.x +
          nay.xzy * tpWn.y +
          naz.xyz * tpWn.z
        );

        normal = normalize(mix(dirtWorldN, rockWorldN, terrainRockMask()));

        // 高频程序化细节法线：在高山岩/雪区破碎残余网格列拉丝（陡面竖条）。
        // 两档尺度叠加：粗档(0.5)给岩面起伏，细档(1.4)直接打散 ~1.78m 网格列。
        float alpineDetail = smoothstep(22.0, 64.0, vWorldPos.y);
        if (alpineDetail > 0.001) {
          vec3 detW = abs(wn);
          detW = pow(detW, vec3(4.0));
          detW /= max(detW.x + detW.y + detW.z, 1e-4);
          vec3 detN = terrainDetailNormalWS(wn, detW, 0.5, 0.6);
          detN = terrainDetailNormalWS(detN, detW, 1.4, 0.9);
          normal = normalize(mix(normal, detN, alpineDetail * 0.75));
        }

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

  mat.customProgramCacheKey = () => 'terrain-dirt-rock-pbr-v9'
  return mat
}

function createDistantTerrainProxyMaterial(texLoader) {
  const map = texLoader.load('/textures/souls_terrain/Ground103_1K-JPG_Color.jpg')
  map.wrapS = map.wrapT = THREE.RepeatWrapping
  map.repeat.set(16, 16)
  map.anisotropy = 4
  map.colorSpace = THREE.SRGBColorSpace

  const material = new THREE.MeshBasicMaterial({
    map,
    color: 0xa0a4a0,
    fog: true,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  })
  // 远山虽用无光照的 MeshBasicMaterial，但通过这些 uniform 在 shader 里手算廉价
  // 太阳光照与大气透视；每帧由 map.update() 写入（见 material.userData.uniforms）。
  const uniforms = {
    uSunDir: { value: new THREE.Vector3(0.4, 0.85, 0.35).normalize() },
    uNightFactor: { value: 0 },
    uSkyColor: { value: new THREE.Color(0xb8ddff) },    // 半球环境光-天空
    uGroundColor: { value: new THREE.Color(0x6a6e72) }, // 半球环境光-地面（中性灰，非草绿）
  }
  material.userData.uniforms = uniforms
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = `
      varying vec3 vProxyWorldPos;
      varying vec3 vProxyWorldNormal;
    ` + shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      `#include <worldpos_vertex>
       vProxyWorldPos = worldPosition.xyz;
       // MeshBasicMaterial 不含 <beginnormal_vertex>，无 objectNormal；直接用 normal 属性。
       vProxyWorldNormal = normalize(mat3(modelMatrix) * normal);`
    )
    shader.fragmentShader = `
      varying vec3 vProxyWorldPos;
      varying vec3 vProxyWorldNormal;
      uniform vec3 uSunDir;
      uniform float uNightFactor;
      uniform vec3 uSkyColor;
      uniform vec3 uGroundColor;

      float proxyHash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float proxyNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = proxyHash(i);
        float b = proxyHash(i + vec2(1.0, 0.0));
        float c = proxyHash(i + vec2(0.0, 1.0));
        float d = proxyHash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }
    ` + shader.fragmentShader.replace(
      '#include <map_fragment>',
      `
      vec4 sampledDiffuseColor = texture2D(map, vMapUv);
      diffuseColor *= sampledDiffuseColor;
      vec3 proxyN = normalize(vProxyWorldNormal);
      float slope = 1.0 - clamp(proxyN.y, 0.0, 1.0);
      float broad = proxyNoise(vProxyWorldPos.xz * 0.018 + vec2(5.1, 3.7));
      float fine = proxyNoise(vProxyWorldPos.xz * 0.20 + vec2(9.4, 1.8));
      float streakN = proxyNoise(vProxyWorldPos.xz * 0.42 + vec2(13.7, 2.4));
      float alpine = smoothstep(22.0, 74.0, vProxyWorldPos.y);
      vec3 lowGround = diffuseColor.rgb * vec3(0.76, 0.78, 0.70);
      // 远景低地染草绿，与近处草地衔接（alpine=高山因子，slope=坡度）
      float proxyMeadow = (1.0 - alpine) * (1.0 - smoothstep(0.30, 0.62, slope));
      vec3 proxyMeadowGreen = mix(vec3(0.150, 0.250, 0.090), vec3(0.200, 0.320, 0.120), broad);
      lowGround = mix(lowGround, proxyMeadowGreen, proxyMeadow * 0.6);
      vec3 coldRock = mix(vec3(0.40, 0.43, 0.45), vec3(0.64, 0.66, 0.67), broad);
      // 陡岩更暗更冷，强化裸岩与雪的明度对比
      coldRock = mix(coldRock, vec3(0.26, 0.31, 0.36), smoothstep(0.30, 0.82, slope) * 0.55);
      coldRock *= vec3(0.84, 0.92, 1.0) * (0.92 + fine * 0.10);
      vec3 baseMountain = mix(lowGround, coldRock, alpine);
      // 大尺度伪 AO：山谷/背阴处压暗，增加体积层次
      baseMountain *= 0.82 + broad * 0.18;
      // 平缓处积雪
      float settledSnow = smoothstep(56.0, 120.0, vProxyWorldPos.y) * (1.0 - smoothstep(0.14, 0.58, slope));
      // 雪沟 streak：顺坡而下的纵向雪带，陡面被裸岩切断
      float streakMask = smoothstep(0.42, 0.78, broad * 0.7 + streakN * 0.5 + fine * 0.18);
      float streakSnow = smoothstep(78.0, 150.0, vProxyWorldPos.y)
        * streakMask
        * (1.0 - smoothstep(0.62, 0.92, slope));
      float summitSnow = smoothstep(120.0, 176.0, vProxyWorldPos.y) * 0.92;
      float snow = clamp(max(settledSnow, streakSnow) + summitSnow, 0.0, 1.0);
      vec3 snowColor = vec3(0.95, 0.97, 1.0) * (0.97 + fine * 0.05);
      diffuseColor.rgb = mix(baseMountain, snowColor, snow);

      // ── 廉价太阳光照（MeshBasicMaterial 本身不受光，这里手算）──
      vec3 sunDir = normalize(uSunDir);
      float ndl = dot(proxyN, sunDir);
      float lit = clamp(ndl, 0.0, 1.0);            // 直射高光项
      float wrap = ndl * 0.5 + 0.5;                // half-lambert 软填充，避免背光死黑
      float hemi = proxyN.y * 0.5 + 0.5;
      vec3 ambient = mix(uGroundColor, uSkyColor, hemi) * mix(0.55, 0.34, uNightFactor);
      vec3 sunCol = mix(vec3(1.0, 0.95, 0.86), vec3(0.50, 0.58, 0.74), uNightFactor); // 夜晚转冷
      float sunStrength = mix(1.05, 0.30, uNightFactor);
      vec3 lightTerm = ambient + sunCol * (wrap * 0.55 + lit * 0.55) * sunStrength;
      diffuseColor.rgb *= lightTerm;

      // ── 高度感知大气透视（在线性雾之上叠加，营造纵深）──
      float aerial = smoothstep(420.0, 2400.0, vFogDepth);
      aerial *= 1.0 - smoothstep(50.0, 180.0, vProxyWorldPos.y) * 0.55; // 山脚比峰顶更"化"
      vec3 hazeColor = mix(vec3(0.60, 0.69, 0.82), vec3(0.16, 0.20, 0.30), uNightFactor);
      float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(lum), aerial * 0.22);   // 去饱和
      diffuseColor.rgb = mix(diffuseColor.rgb, hazeColor, aerial * 0.34);   // 偏冷蓝
      `
    )
  }
  material.customProgramCacheKey = () => 'distant-terrain-snow-proxy-v3'
  return material
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
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      { uTime: { value: 0 } },
    ]),
    fog: true,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: `
      attribute float aShore;
      attribute float aSubmerge;
      varying float vShore;
      varying float vSubmerge;
      varying vec2 vUv;
      varying float vEdge;
      varying float vFlow;
      varying vec3 vWorldPos;
      varying vec3 vViewDir;
      #include <fog_pars_vertex>
      void main() {
        vUv = uv;
        vShore = aShore;
        vSubmerge = aSubmerge;
        vEdge = abs(uv.x - 0.5) * 2.0;
        vFlow = uv.y;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        vViewDir = normalize(cameraPosition - worldPos.xyz);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
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
      #include <fog_pars_fragment>

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
        // 世界噪声扰动横向边缘坐标，使支流泡沫/边缘同样不规则蜿蜒
        float bankWarp = (fbm(world * 0.08) - 0.5) * 0.5
                       + (fbm(world * 0.2 + vec2(5.1, 8.7)) - 0.5) * 0.22;
        float sideW = clamp(side + bankWarp, 0.0, 1.15);
        float center = 1.0 - smoothstep(0.04, 0.55, side);
        float edge = smoothstep(0.66, 1.0, sideW);

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
        float softShoreBand = smoothstep(0.48, 0.92, sideW) * (1.0 - smoothstep(0.98, 1.0, sideW) * 0.35);
        float softShoreFoam = softShoreBand * smoothstep(0.28, 0.78, edgeFoamNoise + ripple * 0.20);
        float foamLine = edge * smoothstep(0.38, 0.86, edgeFoamNoise + ripple * 0.20);
        float brokenFoam = smoothstep(0.72, 0.96, rapidNoise + fine * 0.28) * rapid;
        float foamMask = clamp(softShoreFoam * 0.52 + foamLine * 0.74 + streak * 0.64 + brokenFoam * center * 0.42, 0.0, 1.0);

        vec3 deep = vec3(0.018, 0.105, 0.125);
        vec3 shallow = vec3(0.115, 0.300, 0.300);
        vec3 glint = vec3(0.46, 0.68, 0.76);
        vec3 foam = vec3(0.78, 0.90, 0.88);
        float shallowMix = clamp(edge * 0.45 + h * 0.32 + fine * 0.18 + 0.22, 0.0, 1.0);
        vec3 color = mix(deep, shallow, shallowMix);
        color = mix(color, glint, fresnel * (0.30 + center * 0.18));
        color += vec3(0.88, 0.96, 0.94) * spec * (0.28 + fresnel * 0.42);
        color = mix(color, foam, foamMask);

        float alpha = 0.42 + edge * 0.10 + softShoreFoam * 0.16 + foamMask * 0.28 + fresnel * 0.16;
        // 边缘渐隐溶入岸边湿泥，去掉笔直多边形收边
        alpha *= 1.0 - smoothstep(0.84, 1.12, sideW);
        gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.95));
        #include <fog_fragment>
      }
    `,
  })
}

function createMainRiverMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      { uTime: { value: 0 } },
    ]),
    fog: true,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: `
      attribute float aShore;
      attribute float aSubmerge;
      varying float vShore;
      varying float vSubmerge;
      varying vec2 vUv;
      varying float vEdge;
      varying float vFlow;
      varying vec3 vWorldPos;
      varying vec3 vViewDir;
      #include <fog_pars_vertex>
      void main() {
        vUv = uv;
        vShore = aShore;
        vSubmerge = aSubmerge;
        vEdge = abs(uv.x - 0.5) * 2.0;
        vFlow = uv.y;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        vViewDir = normalize(cameraPosition - worldPos.xyz);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform float uTime;
      varying float vShore;
      varying float vSubmerge;
      varying vec2 vUv;
      varying float vEdge;
      varying float vFlow;
      varying vec3 vWorldPos;
      varying vec3 vViewDir;
      #include <fog_pars_fragment>

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
        for (int i = 0; i < 5; i++) {
          v += noise(p) * a;
          p = p * 2.04 + vec2(13.7, 8.9);
          a *= 0.52;
        }
        return v;
      }

      float waterHeight(vec2 p, float time) {
        vec2 flowA = vec2(p.y * 0.026 - time * 0.36, p.x * 0.070 + time * 0.045);
        vec2 flowB = vec2(p.y * 0.066 - time * 0.78, p.x * 0.150 - time * 0.060);
        float broad = fbm(flowA) * 0.66;
        float detail = fbm(flowB) * 0.30;
        float cross = sin(p.x * 0.15 + p.y * 0.055 - time * 2.0) * 0.12;
        return broad + detail + cross;
      }

      void main() {
        // 地形穿出水面（vSubmerge<0 = 水面在地形之下）→ 丢弃，消除"水盖在沙脊/深槽伪影上"
        if (vSubmerge < -0.12) discard;
        vec2 world = vWorldPos.xz;
        float time = uTime;
        float side = abs(vUv.x - 0.5) * 2.0;
        // 用世界坐标噪声扰动横向边缘坐标，让岸线/泡沫/网格边缘不规则蜿蜒，消除笔直平行条带
        float bankWarp = (fbm(world * 0.07) - 0.5) * 0.5
                       + (fbm(world * 0.19 + vec2(7.3, 2.1)) - 0.5) * 0.22;
        float sideW = clamp(side + bankWarp, 0.0, 1.05);
        float centerDepth = 1.0 - smoothstep(0.12, 0.88, side);
        float shallowBank = smoothstep(0.42, 0.94, sideW);
        float edgeBand = smoothstep(0.70, 1.0, sideW);
        float flow = vFlow * 18.0 - time * 2.25;

        float h = waterHeight(world, time);
        float hX = waterHeight(world + vec2(0.75, 0.0), time);
        float hZ = waterHeight(world + vec2(0.0, 0.75), time);
        vec3 normal = normalize(vec3((h - hX) * 1.45, 1.0, (h - hZ) * 1.45));

        vec3 viewDir = normalize(vViewDir);
        vec3 lightDir = normalize(vec3(-0.35, 0.78, 0.48));
        vec3 halfDir = normalize(lightDir + viewDir);
        float fresnel = pow(1.0 - clamp(dot(normal, viewDir), 0.0, 1.0), 3.1);
        float spec = pow(max(dot(normal, halfDir), 0.0), 86.0);

        float longRipple = sin(flow + h * 3.2 + vUv.x * 10.0) * 0.5 + 0.5;
        float fine = fbm(vec2(vUv.x * 10.5 + h * 0.6, vFlow * 0.72 - time * 0.32));
        // 网格状焦散：两层不同尺度/方向滚动的脊状噪声相乘，提取细亮网线（参考图的折射光纹）
        vec2 cuv = world * 0.42;
        float cn1 = fbm(cuv + vec2(time * 0.22, -time * 0.10) + h * 0.4);
        float cn2 = fbm(cuv * 1.7 + vec2(-time * 0.16, time * 0.20) + fine * 0.6);
        float ridge1 = pow(1.0 - abs(2.0 * cn1 - 1.0), 3.0);
        float ridge2 = pow(1.0 - abs(2.0 * cn2 - 1.0), 3.0);
        float causticNet = ridge1 * ridge2;
        // 浅/中最亮、深处略暗
        float caustic = causticNet * (0.5 + shallowBank * 0.7) * (0.55 + centerDepth * 0.45);

        // vShore：浅水/真实岸线度（1=贴陆地浅水，0=深水/盖在另一片水之上）。
        // 边缘高光（绿边/泡沫/水线）只在真实岸线出现，避免交叉口内部重叠边发亮。
        float shoreGate = smoothstep(0.25, 0.7, vShore);
        float shoreNoise = fbm(vec2(vFlow * 0.62 - time * 0.42, vUv.x * 8.5 + time * 0.10));
        float softFoamBand = smoothstep(0.48, 0.84, sideW) * (1.0 - smoothstep(0.98, 1.0, sideW) * 0.28);
        float softShoreFoam = softFoamBand * smoothstep(0.24, 0.78, shoreNoise + longRipple * 0.22 + fine * 0.10) * shoreGate;
        float shoreFoam = edgeBand * smoothstep(0.42, 0.82, shoreNoise + longRipple * 0.18) * shoreGate;
        float brokenFoam = smoothstep(0.72, 0.96, caustic + shoreNoise * 0.22) * (edgeBand * 0.72) * shoreGate;
        float foamMask = clamp(softShoreFoam * 0.66 + shoreFoam * 0.58 + brokenFoam * 0.52, 0.0, 1.0);
        // 飞溅白点/气泡：高频阈值噪声，散布在水面（中心/浅滩稍多），对应参考图的小白点
        float speckNoise = fbm(world * 2.6 + vec2(time * 0.35, -time * 0.28));
        float specks = smoothstep(0.84, 0.96, speckNoise) * (0.4 + shallowBank * 0.5);
        foamMask = clamp(foamMask + specks * 0.7, 0.0, 1.0);

        // 更饱和的深→浅分层：深蓝绿色中心、青绿浅滩，对应参考图的强烈深浅对比
        vec3 deep = vec3(0.015, 0.085, 0.150);
        vec3 mid = vec3(0.045, 0.190, 0.235);
        vec3 shallow = vec3(0.150, 0.355, 0.300);
        vec3 silt = vec3(0.300, 0.265, 0.165);
        vec3 glint = vec3(0.44, 0.66, 0.72);
        vec3 foam = vec3(0.82, 0.92, 0.90);

        vec3 color = mix(mid, deep, centerDepth);
        // 浅水色只在真实浅水（贴岸）出现；盖在另一片深水之上的水带边缘不变浅 → 消除深水里的浅色斜带
        color = mix(color, shallow, shallowBank * shoreGate * (0.72 + fine * 0.18));
        // 明亮青绿浅滩发光带（参考图水边特征）：sideW 中段一条亮绿带，最外缘前收住；只在真实岸线
        float greenFringe = smoothstep(0.46, 0.82, sideW) * (1.0 - smoothstep(0.90, 1.06, sideW)) * shoreGate;
        color = mix(color, vec3(0.16, 0.56, 0.40), greenFringe * 0.34);
        color = mix(color, silt, edgeBand * shoreGate * (0.26 + shoreNoise * 0.22));
        // 网格焦散：偏青白的亮光纹（保持深水偏蓝的基调），叠加在整条水面
        color += vec3(0.30, 0.50, 0.46) * caustic;
        color += vec3(0.05, 0.26, 0.20) * greenFringe * (0.5 + caustic * 0.6);
        color = mix(color, glint, fresnel * (0.22 + centerDepth * 0.14));
        color += vec3(0.90, 0.98, 0.94) * spec * (0.24 + fresnel * 0.42);
        color = mix(color, foam, foamMask);

        // ── 柔和动画水线：alpha 在网格内完全淡出（隐藏"平面切坡"的硬交界），水线随时间轻微涨落 ──
        // 用 raw side（网格边界处恒为 1.0）做淡出，保证 side→1 时 alpha=0，绝不留硬边；
        // 有机蜿蜒来自 bankWarp，时间涨落来自 lap。
        float lap = 0.055 * sin(time * 0.9 + vFlow * 4.5 + shoreNoise * 2.5)
                  + 0.03 * sin(time * 0.37 + vFlow * 1.7);
        float edgeCut = clamp(0.86 + lap + bankWarp * 0.35, 0.6, 0.95);
        float edgeAlpha = 1.0 - smoothstep(edgeCut - 0.10, edgeCut + 0.05, side);
        float lapFoam = smoothstep(0.05, 0.0, abs(side - edgeCut)) * smoothstep(0.55, 0.85, side) * shoreGate;
        color = mix(color, foam, lapFoam * 0.55);
        float alpha = (mix(0.58, 0.94, centerDepth)
          + edgeBand * 0.04 + softShoreFoam * 0.18 + foamMask * 0.24 + fresnel * 0.10
          + lapFoam * 0.30) * edgeAlpha;
        gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.96));
        #include <fog_fragment>
      }
    `,
  })
}

function buildRiverStripGeometry(points, getSampleAt, {
  widthPad = 0.45,
  stepDistance = 14,
  crossSegments = 1,
  getSurfaceYAt = null,
  getGroundYAt = null,
  maxShoreExtend = 9,
} = {}) {
  const verts = []
  const uvs = []
  const shores = []
  const submerges = []
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
    const y = getSurfaceYAt ? getSurfaceYAt(sample) : sample.waterY
    // 逐侧把水带延伸到真实岸线（地形升到水面 y 处）：填满碳刻河道/交叉口盆地，消除飘空。
    // 同时：一旦该点被「另一条水道」主导就停止外延，避免与其水带重叠（消除交叉口叠加亮线）。
    const shoreExtent = (sign) => {
      if (!getGroundYAt) return halfWidth
      const maxExt = sample.halfWidth + maxShoreExtend
      let ext = halfWidth
      for (let off = sample.halfWidth; off <= maxExt; off += 0.6) {
        const wx = sample.x + rightX * sign * off
        const wz = sample.z + rightZ * sign * off
        // 只裁「外侧裙边」与另一水道的重叠（消除远处大片叠加亮线）；近核心(±2.5)不裁，
        // 让两条水带在汇入口附近薄薄重叠，填满交角处的干缝楔形（共面重叠≈churning 水，自然）。
        if (off > sample.halfWidth + 2.5) {
          const own = getSampleAt(wx, wz)
          const net = sampleChannelNetwork(wx, wz)
          if (net && net.edge < (own.distance - own.halfWidth) - 1.2) return Math.min(off + 0.8, maxExt)
        }
        // 地形相对本水带水面骤降（进入旁边的深槽）→ 停止外延，避免浅水带浮在深槽上方（穿水）
        if (y - getGroundYAt(wx, wz) > 1.2) return Math.min(off + 0.2, maxExt)
        if (getGroundYAt(wx, wz) >= y) return Math.min(off + 0.4, maxExt)
        ext = off
      }
      return Math.min(ext, maxExt)
    }
    const leftExt = shoreExtent(-1)
    const rightExt = shoreExtent(1)
    const whitewaterUv = THREE.MathUtils.clamp(sample.whitewater, 0, 1)
    for (let col = 0; col <= crossSegments; col++) {
      const u = col / crossSegments
      // 分段映射：u 0→-leftExt，0.5→中心线，1→+rightExt（side=0 仍在中心，两岸为 side=1）
      const offset = u <= 0.5
        ? THREE.MathUtils.lerp(-leftExt, 0, u / 0.5)
        : THREE.MathUtils.lerp(0, rightExt, (u - 0.5) / 0.5)
      const wx = sample.x + rightX * offset
      const wz = sample.z + rightZ * offset
      // 逐顶点统一水高：用世界坐标从河道场取水面 Y，重叠水带在同一点取同一 Y → 共面、无硬切面
      const vy = getGroundYAt ? (channelNetworkWaterYAt(wx, wz, getGroundYAt) ?? y) : y
      const gy = getGroundYAt ? getGroundYAt(wx, wz) : (vy - 0.5)
      // 浅水度 aShore：水浅（贴陆地岸线）→1，深水/盖在另一片水之上→0。
      // shader 用它门控边缘高光，使绿边/泡沫/水线只在真实岸线出现，消除交叉口内部亮线。
      let shoreF = getGroundYAt ? (1 - THREE.MathUtils.smoothstep(vy - gy, 0.4, 1.6)) : 1
      // 交汇抑制：第二近水道在 ~0.5–4m 内 → 判为两道交叠的交汇区，平滑压低 aShore，
      // 让交汇内部接缝不起白色岸线泡沫/亮边；单条河（无第二近水道）不受影响、岸边泡沫照旧。
      if (getGroundYAt) {
        const secondEdge = nearbyChannelSecondEdge(wx, wz)
        const confluence = 1 - THREE.MathUtils.smoothstep(secondEdge, 0.5, 4.0)
        shoreF *= (1 - confluence)
      }
      verts.push(wx, vy, wz)
      uvs.push(u, flowV + whitewaterUv * 0.18)
      shores.push(shoreF)
      submerges.push(vy - gy)  // 水面高出地形的量；<0 表示地形穿出水面（着色器据此丢弃）
    }
    if (row < samples.length - 1) {
      const rowStride = crossSegments + 1
      const a = row * rowStride
      const b = (row + 1) * rowStride
      for (let col = 0; col < crossSegments; col++) {
        idx.push(a + col, a + col + 1, b + col, a + col + 1, b + col + 1, b + col)
      }
    }
    row += 1
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setAttribute('aShore', new THREE.Float32BufferAttribute(shores, 1))
  geometry.setAttribute('aSubmerge', new THREE.Float32BufferAttribute(submerges, 1))
  geometry.setIndex(idx)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function buildHeroRiverGeometry(getTerrainHeight) {
  return buildRiverStripGeometry(HERO_RIVER_POINTS, getRiverSampleAt, {
    widthPad: 0.45,
    stepDistance: 12,
    crossSegments: 8,
    getSurfaceYAt: sample => getWaterSurfaceY(sample, getTerrainHeight, MAIN_RIVER_WATER_DEPTH),
    getGroundYAt: getTerrainHeight,
    maxShoreExtend: 10,
  })
}

function buildRiverBranchGeometry(branch, getTerrainHeight) {
  return buildRiverStripGeometry(branch.points, (x, z) => getBranchSampleAt(branch, x, z), {
    widthPad: 0.08,
    stepDistance: 7,
    crossSegments: 5,
    getSurfaceYAt: sample => getWaterSurfaceY(sample, getTerrainHeight, BRANCH_RIVER_WATER_DEPTH),
    getGroundYAt: getTerrainHeight,
    maxShoreExtend: 6,
  })
}

function buildGullyStreamGeometry(gully, getTerrainHeight) {
  return buildRiverStripGeometry(gully.points, (x, z) => getGullyStreamSampleAt(gully, x, z), {
    widthPad: 0.05,
    stepDistance: 6,
    crossSegments: 4,
    getSurfaceYAt: sample => getWaterSurfaceY(sample, getTerrainHeight, GULLY_STREAM_WATER_DEPTH),
    getGroundYAt: getTerrainHeight,
    maxShoreExtend: 5,
  })
}

// 交汇水潭水盘：以池心为心的放射状网格，与各河水带共面同材质，兜底填补水带间缝。
// 逐顶点水高用 channelNetworkWaterYAt（池内即 poolSurfaceY）；aSubmerge=水面-地形，
// 外圈地形高于水面处 <-0.12 被着色器自动裁掉 → 水盘自动贴合实际水域形状。
function buildConfluencePoolGeometry(pool, getTerrainHeight) {
  const cx = pool.x, cz = pool.z
  const R = pool.rOuter + 2
  const rings = 9, seg = 56
  const poolY = confluencePoolSurfaceY(pool)
  const verts = [], uvs = [], shores = [], submerges = [], idx = []
  for (let r = 0; r <= rings; r++) {
    const radius = R * r / rings
    for (let s = 0; s < seg; s++) {
      const ang = (s / seg) * Math.PI * 2
      const x = cx + Math.cos(ang) * radius
      const z = cz + Math.sin(ang) * radius
      const y = channelNetworkWaterYAt(x, z, getTerrainHeight) ?? poolY
      const gy = getTerrainHeight ? getTerrainHeight(x, z) : y - 0.5
      verts.push(x, y, z)
      // 径向 uv：side=|uv.x-0.5|*2 = r/rings（各方向一致），外缘各角度均匀淡出，
      // 避免原圆盘贴图映射导致 ±z 方向 side≈0、潭盘 near 缘留下不淡出的硬直边。
      // uv.y 取常数（潭水无流向），规避按角度取 uv.y 时在 0/2π 接缝处的径向裂缝。
      uvs.push(0.5 + (r / rings) * 0.5, 0.5)
      shores.push(0)          // 深水，不出岸线高光
      submerges.push(y - gy)
    }
  }
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < seg; s++) {
      const a = r * seg + s
      const b = r * seg + (s + 1) % seg
      const c = (r + 1) * seg + s
      const d = (r + 1) * seg + (s + 1) % seg
      idx.push(a, c, b, b, c, d)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setAttribute('aShore', new THREE.Float32BufferAttribute(shores, 1))
  geometry.setAttribute('aSubmerge', new THREE.Float32BufferAttribute(submerges, 1))
  geometry.setIndex(idx)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

// 把所有水道（主河 + 支流 + wet 冲沟 + 中心西溪）的水带几何合并为单一网格 + 单一主河材质，
// 渲染为一个对象。交汇处水面因共面同高同材质 → 消除原来多片重叠的硬斜缝/分片。
function createUnifiedWaterRender(scene, getTerrainHeight) {
  const geos = [buildHeroRiverGeometry(getTerrainHeight)]
  for (const branch of RIVER_BRANCHES) geos.push(buildRiverBranchGeometry(branch, getTerrainHeight))
  for (const gully of EROSION_GULLIES) if (gully.wet) geos.push(buildGullyStreamGeometry(gully, getTerrainHeight))
  for (const pool of CONFLUENCE_POOLS) geos.push(buildConfluencePoolGeometry(pool, getTerrainHeight))
  const merged = mergeGeometries(geos, false)
  geos.forEach(g => g.dispose())
  const material = createMainRiverMaterial()
  const mesh = new THREE.Mesh(merged, material)
  mesh.name = 'unified_water'
  mesh.frustumCulled = false
  scene.add(mesh)
  return {
    mesh,
    update(time) { material.uniforms.uTime.value = time },
  }
}

function createRiverSystem(scene, getTerrainHeight) {
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
    .map(point => withWaterSurface(getRiverSampleAt(point.x, point.z), getTerrainHeight, MAIN_RIVER_WATER_DEPTH))
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
    const sample = withWaterSurface(getRiverSampleAt(x, z), getTerrainHeight, MAIN_RIVER_WATER_DEPTH)
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
    update,
    sampleRiver,
  }
}

function createRiverBranchSystems(scene, getTerrainHeight) {
  // 渲染由 createUnifiedWaterRender 统一负责；这里只保留采样逻辑（落水/水流判定）
  const systems = RIVER_BRANCHES.map((branch) => {
    function sampleRiver(x, z) {
      const sample = withWaterSurface(getBranchSampleAt(branch, x, z), getTerrainHeight, BRANCH_RIVER_WATER_DEPTH)
      const terrainY = getTerrainHeight(x, z)
      const depth = Math.max(0, sample.waterY - terrainY)
      const inWater = sample.distance <= sample.halfWidth && depth > 0.03
      return {
        ...sample,
        inWater,
        depth,
      }
    }

    return { branch, sampleRiver }
  })

  return {
    systems,
    update() {},
    sampleRiver(x, z) {
      let best = null
      for (const system of systems) {
        const bounds = RIVER_BRANCH_BOUNDS_BY_ID.get(system.branch.id)
        if (bounds && !isInsideBounds(bounds, x, z)) continue
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
  // 只有 wet 冲沟才有水（干沟仅地形/湿色）；渲染由 createUnifiedWaterRender 统一负责，这里只采样
  const systems = EROSION_GULLIES.filter(gully => gully.wet).map((gully) => {
    function sampleRiver(x, z) {
      const sample = withWaterSurface(getGullyStreamSampleAt(gully, x, z), getTerrainHeight, GULLY_STREAM_WATER_DEPTH)
      const terrainY = getTerrainHeight(x, z)
      const depth = Math.max(0, sample.waterY - terrainY)
      const inWater = sample.distance <= sample.halfWidth && depth > 0.025
      return {
        ...sample,
        inWater,
        depth,
      }
    }

    return { gully, sampleRiver }
  })

  return {
    systems,
    update() {},
    sampleRiver(x, z) {
      let best = null
      for (const system of systems) {
        const bounds = EROSION_GULLY_BOUNDS_BY_ID.get(system.gully.id)
        if (bounds && !isInsideBounds(bounds, x, z)) continue
        const sample = system.sampleRiver(x, z)
        if (!best || (sample.inWater && !best.inWater) || (sample.inWater === best.inWater && sample.depth > best.depth)) {
          best = sample
        }
      }
      return best
    },
  }
}

// ── 仅开发期：河道诊断 ───────────────────────────────────────────────
// 沿每条水道中线步进，用真实 getGroundHeight 与各水系采样器评估：
//  · 堵/埋/没水：河床(碳刻后地形) 高于该处「设计水面」→ 水道没切开，水会被埋/断流
//  · 岸坡过缓：两侧 [halfWidth, halfWidth+run] 实测坡角远低于设计(44~46°)→ 河岸糊平
//  · 水面逆向抬升：沿源头→出水口方向渲染水面反而升高 → 视觉上的「堵/倒流」
function runChannelDiagnostics(getGroundHeight) {
  try {
    const minRun = Math.max(0.35, channelBankRun(RIVER_CHANNEL_MIN_CUT, RIVER_CHANNEL_MIN_SLOPE_DEG))
    const mainRun = Math.max(0.35, channelBankRun(MAIN_RIVER_CHANNEL_CUT, MAIN_RIVER_CHANNEL_SLOPE_DEG))
    const channels = [
      { id: 'MAIN 主河', points: HERO_RIVER_POINTS, depth: MAIN_RIVER_WATER_DEPTH, run: mainRun, sample: (x, z) => getRiverSampleAt(x, z) },
      ...RIVER_BRANCHES.map(b => ({ id: `支流 ${b.id}`, points: b.points, depth: BRANCH_RIVER_WATER_DEPTH, run: minRun, sample: (x, z) => getBranchSampleAt(b, x, z) })),
      ...EROSION_GULLIES.filter(g => g.wet).map(g => ({ id: `冲沟(wet) ${g.id}`, points: g.points, depth: GULLY_STREAM_WATER_DEPTH, run: minRun, sample: (x, z) => getGullyStreamSampleAt(g, x, z) })),
    ]
    const STEP = 5
    const summary = []
    for (const ch of channels) {
      const rows = []
      let prevRendered = null
      let count = 0
      let minAngle = 999
      let nBlock = 0, nSlope = 0, nRise = 0
      let maxBlock = -Infinity, maxBlockAt = null
      for (let i = 0; i < ch.points.length - 1; i++) {
        const a = ch.points[i], b = ch.points[i + 1]
        const segLen = Math.hypot(b.x - a.x, b.z - a.z)
        const n = Math.max(1, Math.round(segLen / STEP))
        for (let j = (i > 0 ? 1 : 0); j <= n; j++) {
          const tt = j / n
          const wx = a.x + (b.x - a.x) * tt
          const wz = a.z + (b.z - a.z) * tt
          const s = ch.sample(wx, wz)
          const cx = s.x, cz = s.z
          const bedY = getGroundHeight(cx, cz)
          const designWater = s.waterY
          const rendered = bedY + ch.depth
          const blocked = bedY - designWater
          const hw = s.halfWidth
          const pxx = -s.dirZ, pzz = s.dirX
          const edgeL = getGroundHeight(cx + pxx * hw, cz + pzz * hw)
          const topL = getGroundHeight(cx + pxx * (hw + ch.run), cz + pzz * (hw + ch.run))
          const edgeR = getGroundHeight(cx - pxx * hw, cz - pzz * hw)
          const topR = getGroundHeight(cx - pxx * (hw + ch.run), cz - pzz * (hw + ch.run))
          const angL = Math.atan2(Math.max(0, topL - edgeL), ch.run) * 180 / Math.PI
          const angR = Math.atan2(Math.max(0, topR - edgeR), ch.run) * 180 / Math.PI
          const angle = Math.min(angL, angR)
          const waterRise = prevRendered == null ? 0 : rendered - prevRendered
          prevRendered = rendered
          count++
          minAngle = Math.min(minAngle, angle)
          const flags = []
          if (blocked > 0.3) { flags.push('堵/埋'); nBlock++; if (blocked > maxBlock) { maxBlock = blocked; maxBlockAt = { x: Math.round(cx), z: Math.round(cz), t: +s.t.toFixed(2) } } }
          if (angle < 25) { flags.push('岸坡过缓'); nSlope++ }
          if (waterRise > 0.4) { flags.push('水面逆向抬升'); nRise++ }
          if (flags.length) {
            rows.push({
              t: +s.t.toFixed(2), x: Math.round(cx), z: Math.round(cz),
              河床Y: +bedY.toFixed(2), 设计水面: +designWater.toFixed(2), 渲染水面: +rendered.toFixed(2),
              岸坡角: Math.round(angle), 问题: flags.join(' / '),
            })
          }
        }
      }
      summary.push({
        水道: ch.id, 采样点: count,
        堵埋: nBlock, 坡缓: nSlope, 逆升: nRise,
        最缓角: Math.round(minAngle),
        最大堵埋m: maxBlock > -Infinity ? +maxBlock.toFixed(2) : 0,
        最堵处: maxBlockAt ? `(${maxBlockAt.x},${maxBlockAt.z}) t=${maxBlockAt.t}` : '-',
      })
      if (rows.length) {
        console.groupCollapsed(`⚠ ${ch.id} — ${rows.length}/${count} 问题采样点`)
        console.table(rows)
        console.groupEnd()
      }
    }
    console.log('—— 河道诊断汇总（展开上方分组看明细）——')
    console.table(summary)
  } catch (e) {
    console.warn('[channel-diagnostics] 失败：', e)
  }
}

// ── 仅开发期：定点探针（区分"水盖在地形上"vs"水被埋"）──────────────────
// 逐格遍历所有水道，只统计真正盖住该格的水带(dist ≤ halfWidth+PAD)，取最高水面：
//  · 水面 > 地形 → 「水盖在地形上方」= 穿水伪影（用户看到的"河流盖上去"）
//  · 水面 < 地形 → 「水被埋在地形下」= 没水/堵
function runChannelProbe(getGroundHeight) {
  try {
    const PROBE_POINTS = [{ x: -164, z: 50 }, { x: -167, z: -36 }]
    const RADIUS = 8, STEP = 1, PAD = 0.6
    const chans = [
      { id: '主河', depth: MAIN_RIVER_WATER_DEPTH, sample: (x, z) => getRiverSampleAt(x, z) },
      ...RIVER_BRANCHES.map(b => ({ id: '支流:' + b.id, depth: BRANCH_RIVER_WATER_DEPTH, sample: (x, z) => getBranchSampleAt(b, x, z) })),
      ...EROSION_GULLIES.filter(g => g.wet).map(g => ({ id: '沟:' + g.id, depth: GULLY_STREAM_WATER_DEPTH, sample: (x, z) => getGullyStreamSampleAt(g, x, z) })),
    ]
    for (const P of PROBE_POINTS) {
      const onTop = [], buried = []
      for (let dz = -RADIUS; dz <= RADIUS; dz += STEP) {
        for (let dx = -RADIUS; dx <= RADIUS; dx += STEP) {
          const x = P.x + dx, z = P.z + dz
          const terrain = getGroundHeight(x, z)
          let top = null
          for (const c of chans) {
            const s = c.sample(x, z)
            if (s.distance > s.halfWidth + PAD) continue   // 不在该水带覆盖足迹内
            const w = getGroundHeight(s.x, s.z) + c.depth
            if (!top || w > top.w) top = { w, id: c.id, dist: +s.distance.toFixed(1), hw: +s.halfWidth.toFixed(1) }
          }
          if (!top) continue
          if (top.w > terrain + 0.1) {
            onTop.push({ x, z, 地形: +terrain.toFixed(2), 水面: +top.w.toFixed(2), 高出: +(top.w - terrain).toFixed(2), 覆盖水道: top.id, hw: top.hw })
          } else if (top.w < terrain - 0.3) {
            buried.push({ x, z, 地形: +terrain.toFixed(2), 水面: +top.w.toFixed(2), 埋深: +(terrain - top.w).toFixed(2), 覆盖水道: top.id, hw: top.hw })
          }
        }
      }
      onTop.sort((a, b) => b.高出 - a.高出)
      buried.sort((a, b) => b.埋深 - a.埋深)
      console.groupCollapsed(`🔎 探针(${P.x},${P.z}) — 水盖地形上 ${onTop.length} 格 / 水被埋 ${buried.length} 格`)
      console.log('① 水盖在地形上方(穿水伪影)：'); console.table(onTop.slice(0, 30))
      console.log('② 水被埋在地形下(没水/堵)：'); console.table(buried.slice(0, 30))
      console.groupEnd()
    }
  } catch (e) {
    console.warn('[channel-probe] 失败：', e)
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
  let unifiedWaterRender = null
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
      applyChannelNetworkCarve,
      applyConfluencePoolCarve,
      applyChannelSmoothGrade,
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
      makeMountainCliffSkirt(scene, sampleHeight, createSnowMountainCliffMaterial())
      riverSystem = createRiverSystem(scene, getGroundHeight)
      riverBranchSystems = createRiverBranchSystems(scene, getGroundHeight)
      gullyStreamSystems = createGullyStreamSystems(scene, getGroundHeight)
      unifiedWaterRender = createUnifiedWaterRender(scene, getGroundHeight)
      if (import.meta.env.DEV) runChannelDiagnostics(getGroundHeight)
      if (import.meta.env.DEV) runChannelProbe(getGroundHeight)
      if (import.meta.env.DEV) {
        for (const [tx, tz] of [[-163, 55], [-164, 50], [-160, 40], [-160, -52], [-167, -36]]) {
          terrainController.traceHeightAt?.(tx, tz)
        }
      }
      loadSpawnGrass(scene)
      loadRiversideGrass(scene)
      initMeadowGrass(scene)
      initWorldTrees(scene)
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
    unifiedWaterRender?.update(time)
    riverSystem?.update(time, dt, playerPosition)
    riverBranchSystems?.update(time, dt, playerPosition)
    gullyStreamSystems?.update(time, dt, playerPosition)
    if (_meadowBuild) stepMeadowGrassBuild()
    if (_worldTreeBuild && !_worldTreeBuild.done) stepWorldTreeBuild()
    _spawnGrassWindUniforms.forEach((uniform) => {
      uniform.value = time
    })
    _grassLodTimer += dt
    if (_grassLodTimer >= GRASS_LOD_INTERVAL) {
      _grassLodTimer = 0
      updateGrassLod(playerPosition)
    }
    _worldTreeVisTimer += dt
    if (_worldTreeVisTimer >= WORLD_TREE_VIS_INTERVAL) {
      _worldTreeVisTimer = 0
      updateWorldTreeVisibility(playerPosition)
    }

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

  // 每帧由主循环（updateDayNightLighting）喂入太阳方向与夜晚因子，
  // 驱动远山 proxy 的廉价光照与大气透视冷暖。
  function setDistantTerrainSun(sunDir, nightFactor) {
    const u = distantProxyMat?.userData?.uniforms
    if (!u) return
    u.uSunDir.value.copy(sunDir)
    u.uNightFactor.value = nightFactor
  }

  return {
    collidables,
    update,
    setDistantTerrainSun,
    ponds: [],
    spawnRipple: () => {},
    getTerrainHeight: getGroundHeight,
    sampleRiver: (x, z) => {
      const main = riverSystem?.sampleRiver(x, z)
      const branch = riverBranchSystems?.sampleRiver(x, z)
      const gully = gullyStreamSystems?.sampleRiver(x, z)
      if (gully?.inWater && (!main?.inWater || gully.depth >= main.depth) && (!branch?.inWater || gully.depth >= branch.depth)) return gully
      if (branch?.inWater && (!main?.inWater || branch.depth >= main.depth)) return branch
      if (main?.inWater) return main
      return gully ?? branch ?? main ?? { inWater: false, depth: 0, flowSpeed: 0, dirX: 0, dirZ: 0 }
    },
    getNearbyForestPackLabel,
  }
}
