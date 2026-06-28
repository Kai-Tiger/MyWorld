import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { WORLD_SIZE, OUTDOOR_MOUNTAIN_BOUNDS, MOUNTAIN_FALL_FLOOR_Y, TREE_COLOR_GRADE, TREE_LIGHT_GRADE, MODEL_TREE_COLOR_MIX } from '../config/world.js'
import { createHeightmapTerrain } from './heightmapTerrain.js'
import { CASTLE_EXTERIOR } from '../config/castle.js'
import oldChurchRuinsUrl from '../place/old_church_ruins_medium.glb?url'
import { cloneGLTFScene, loadGLTF } from '../systems/modelAssets.js'
import oldChurchRuinsColliders from '../place/old_church_ruins_colliders.json'


// ── 地图配置说明 ──────────────────────────────────────
// 本文件的 top-level 大写常量多数是可调地图配置。注释里的“调大/调小”只描述直接效果；
// 改密度、距离、预算类参数时还要同步看性能日志，尤其是草、树、水道和地形网格。
const CURVE_UV_TILE_METERS = 3.6 // 曲线路面/岩带 UV 平铺米数；调小纹理更密，调大纹理更拉伸。
const ROCKERY_TEXTURE_VERSION = 'v=1' // 岩石贴图缓存版本；改值会强制浏览器重新请求贴图。
const ROCKERY_TEXTURE_BASE = '/models/rocks/namaqualand_boulder_03/textures' // 岩石贴图目录；换路径会整体替换岩石外观资源。
const MOUNTAIN_ROCK_TEXTURE_URL = '/textures/generated/rock-texture-cool-gray-02.png'
const OLD_CHURCH_RUINS_PLACEMENT = { x: -13, z: 35, rotY: 0 } // 旧教堂遗迹位置/朝向；改 x/z 会移动遗迹，改 rotY 会旋转。
const OLD_CHURCH_RUINS_Y_OFFSET = -1.38 // 旧教堂遗迹贴地偏移；调大更浮，调小更埋进地面。
const FOREST_GROVE_ORIGIN = { x: 5, z: -49 } // 第一片手工林地中心；移动会整体平移该林地树/草/岩。
const FOREST_SECOND_GROVE_ORIGIN = { x: 47, z: -57 } // 第二片手工林地中心；移动会影响该片 curated 林地位置。
const FOREST_THIRD_GROVE_ORIGIN = { x: 27, z: -34 } // 第三片手工林地中心；移动会影响该片 curated 林地位置。
const FOREST_LINE_GROVE_ORIGIN = { x: 30, z: -70 } // 线性林带起点；移动会平移沿线树林。
const FOREST_NORTH_GROVE_ORIGIN = { x: 35, z: 45 } // 北侧手工林地中心；移动会影响北侧林地和局部草堆。
const FOREST_LINE_GROVE_LENGTH = 8 // 线性林带长度基准；调大林带更长，调小更短。
const FOREST_GROVE_CASTLE_TARGET = CASTLE_EXTERIOR.transitionTarget // 手工林地朝城堡布局的参考点；改它会影响面向城堡的林地分布。
const FOREST_GROVE_ASSETS_BASE = '/models/forest_pack' // forest_pack 资源目录；换路径会影响手工林和世界树模型加载。
const FOREST_GROVE_COLLIDER_MIN_Y = -0.5 // 手工林碰撞体最低相对高度；调低更容易碰到根部/地面以下。
const FOREST_GROVE_COLLIDER_MAX_Y = 9 // 手工林碰撞体最高相对高度；调高树冠也可能挡路，调低只挡树干。
const MINE_CAVE_MODEL_URL = '/models/mine_cave/mine_cave.glb' // 矿洞模型资源；换路径会替换矿洞外观。
const MINE_CAVE_COLLIDER_MANIFEST_URL = '/models/mine_cave/mine_cave_colliders.json' // 矿洞碰撞清单；换错会导致矿洞穿模或空气墙错误。
const OUTDOOR_LANDMARK_MANIFEST_URL = '/models/outdoor_landmarks/outdoor-landmarks-manifest.json' // 室外地标碰撞/元数据；换错会导致交互/碰撞不同步。
const SPAWN_GRASS_MODEL_VARIANTS = [
  { name: 'fresh2', url: '/models/grass/grass_clump_fresh.glb', lodUrl: '/models/grass/grass_clump_fresh_lod.glb' },
  { name: 'fresh', url: '/models/grass/grass_clump_fresh.glb', lodUrl: '/models/grass/grass_clump_fresh_lod.glb' },
  { name: 'dry', url: '/models/grass/grass_clump_dry.glb', lodUrl: '/models/grass/grass_clump_dry_lod.glb' },
]
// 草模型变体：name 用于 mesh 命名，url 是近处高模，lodUrl 是远处低模；增加变体会增加加载和材质/mesh 数。
// 模型草距离 LOD：越大的距离和保留比例会显示更多草，视觉更密但 CPU 矩阵写入和 GPU 实例渲染更重。
const GRASS_LOD_NEAR_DIST = 35 // 高模草距离；调大高模范围更远、三角面更多，调小近处更早切低模。
const GRASS_LOD_REDUCE_START_DIST = 20 // 草实例开始减量距离；调小更早稀疏省性能，调大近处保持更密。
const GRASS_LOD_SPARSE_DIST = 70 // 草减量接近远端保留比例的距离；调小更快变稀，调大过渡更慢。
const GRASS_LOD_HIDE_DIST = 90 // 模型草显示半径；调大可见草更远但候选更多，调小更省性能但边界更近。
const GRASS_LOD_FAR_KEEP_RATIO = 0.04 // 远处草保留比例；调大远草更连续但实例更多，调小更离散更省。
const GRASS_LOD_INTERVAL = 0.2 // LOD 评估节流秒数；调小响应更快但更耗 CPU，调大可能看到刷新滞后。
const SPAWN_GRASS_60_REF_MODEL_URL = '/models/grass/grass_clump_60_ref.glb' // 草参考模型；只用于调试/对比显示。
const SPAWN_GRASS_60_REF_PLACEMENT = { x: 2.5, z: 42, rotY: 0.35, scale: 1.15 } // 草参考模型位置/朝向/缩放；改了只影响参考模型。
const GROUND_LEAF_TEXTURES = ['/textures/leaf1.png', '/textures/leaf2.png'] // 地面落叶贴图列表；增减会改变随机落叶外观多样性。
const TERRAIN_CHUNK_SIZE = 128 // 地形近景块边长；调大块更少但单块更重，调小块更多但剔除更细。
// 顶点间距 128/72≈1.78m（原 56≈2.29m），让网格能更好表现河岸坡度，减少人物/水面穿模
const TERRAIN_CHUNK_SEGMENTS = 72 // 近景地形细分；调大地形更细但顶点更多，调小更快但河岸/坡面更粗。
const TERRAIN_ACTIVE_RADIUS = 2 // 玩家周围高精地形活动半径（块数）；调大近景更稳但构建和渲染更重。
const TERRAIN_PRELOAD_RADIUS = 3 // 预加载地形半径（块数）；调大移动时更少露空但后台构建更多。
const TERRAIN_DISTANT_PROXY_SEGMENTS = 24 // 远景代理地形细分；调大远景更细但更重，调小远山更粗。
const TERRAIN_DISTANT_PROXY_Y_OFFSET = -0.08 // 远景代理下沉量；调低可避免缝隙闪烁，过低会有台阶感。
const GROUND_INDIVIDUAL_LEAF_Y_OFFSET = 0.075 // 单片落叶离地高度；调大更少 z-fighting，过大会漂浮。
const GROUND_DEBRIS_MAX_GROUND_Y = 7.5 // 地面杂物/落叶高度上限；调大高处也有杂物，调小只在低地。
const GROUND_DEBRIS_CLEAR_PADDING = 3.2 // 杂物避让半径额外 padding；调大清空区更干净，调小杂物更贴近结构。
const GROUND_LEAVES_PER_TREE = 30 // 每棵手工树周围落叶数；调大更丰富但实例更多，调小更干净。
const GROUND_TREE_LEAF_RADIUS_MIN = 1.1 // 落叶离树干最近距离；调小更贴树根，调大树根周围更空。
const GROUND_TREE_LEAF_RADIUS_MAX = 3.8 // 落叶扩散最大半径；调大叶片铺得更散，调小更集中。
const LOCAL_MODEL_GRASS_PILE_AREA = 5 // 局部草堆面积（平方米）；调大草堆半径变大，调小更小簇。
const LOCAL_MODEL_GRASS_PER_PILE = 78 // 每个局部草堆最多草簇；调大更密但实例更多，调小更稀。
const LOCAL_MODEL_GRASS_PILE_RADIUS = Math.sqrt(LOCAL_MODEL_GRASS_PILE_AREA / Math.PI) // 由面积推导的草堆半径；通常改面积而不是改此值。
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
// 局部草堆位置：x/z 是草堆中心，seed 控制形状和随机分布；移动 x/z 会移动草堆，改 seed 会换一套随机外形。
const LOCAL_MODEL_GRASS_Y_OFFSET = -0.10 // 模型草整体贴地偏移；调低更贴/埋入地面，调高更容易露根或漂浮。
// 三层模型草统一的形状调整：竖向压扁 + 横向展开 → 叶片更平贴、叶尖间距更大，覆盖更好（不改 glb 几何）
const MODEL_GRASS_FLATTEN_Y = 0.6   // 乘到 scaleY：变矮变平，减小叶片与地面夹角
const MODEL_GRASS_SPREAD_XZ = 1.4   // 乘到 scaleX/scaleZ：叶片横向展开、间距变大
const LOCAL_MODEL_GRASS_SPACING = 0.198 // 局部草堆采样间距；调小更密但生成更多，调大更稀。
const LOCAL_MODEL_GRASS_JITTER = 0.30 // 局部草堆位置抖动比例；调大更自然但边界更散，调小更网格化。
const LOCAL_MODEL_GRASS_SHAPE_SEGMENTS = 10 // 草堆边界形状分段；调大边缘更细碎，调小更圆滑。
// 河岸生态草：沿主河 + 全部支流两岸铺草。生态分区：坡顶平台密、河岸斜坡空、露出的干河床稀疏。
const RIVERSIDE_GRASS_ALONG_SPACING = 0.311  // 沿河中心线行走步距（米），约 2x 面积密度
const RIVERSIDE_GRASS_LATERAL_SPACING = 0.297 // 坡顶带横向网格步距（米），约 2x 面积密度
const RIVERSIDE_GRASS_TERRACE_WIDTH = 14.0   // 坡顶平台铺草带宽（米），向外延伸覆盖更大地面
const RIVERSIDE_GRASS_TERRACE_PLATEAU = 0.30 // 内侧满密度占带宽比例，其后向外自然渐稀淡出
const RIVERSIDE_GRASS_SLOPE_MARGIN = 2.4     // 坡顶让出余量，避开下切斜坡肩（米）；调大可露出更多湿泥/苔岸线。
const RIVERSIDE_GRASS_BED_PROB = 0.05        // 干河床稀疏几丛的放置概率
const RIVERSIDE_GRASS_BED_SAMPLES = 4        // 每 station 在干河床横向尝试的采样数
const RIVERSIDE_GRASS_JITTER = 0.55          // 位置抖动比例（相对步距）
const RIVERSIDE_GRASS_MAX_GROUND_RISE = 0.85 // 局部坡度守卫：1m 内地面抬升超过此值则跳过（防爬谷壁）
const GLOBAL_WET_GULLY_BED_GRASS_ALONG_SPACING = 0.42 // 新增湿沟沟底草沿沟采样步距；调小更密但实例更多。
const GLOBAL_WET_GULLY_BED_GRASS_LATERAL_SPACING = 0.34 // 新增湿沟沟底草横向采样步距；调小更密，调大更稀。
const GLOBAL_WET_GULLY_BED_GRASS_OUTER_PAD = 1.8 // 沟底草向水边内岸外扩距离；调大更贴沟壁，调小更集中。
const GLOBAL_WET_GULLY_BED_GRASS_KEEP = 0.72 // 沟底草基础保留率；调大更密，调小更稀疏。
// 全局模型草：除火堆、河岸/水面、山上外，把室外陆地铺满 3D 模型草。
const MEADOW_GRASS_SPACING = 0.527           // 全场网格步距（米），约 2x 面积密度
const MEADOW_GRASS_JITTER = 0.7              // 位置抖动比例（相对步距），打散网格感
const GRASS_FIELD_BOUNDS = OUTDOOR_MOUNTAIN_BOUNDS // 全局模型草可生成边界；扩大边界会让更远区域可长草。
const GRASS_HEIGHT_FADE_START_Y = 50 // 全局草开始随高度变稀；低于此高度仍按原密度生成。
const GRASS_HEIGHT_FADE_END_Y = 120 // 全局草高度衰减末端；高于此高度只保留少量簇状草。
const GRASS_HEIGHT_MIN_CLUSTER_COVERAGE = 0.02 // 高处最小草簇覆盖率；调大高处草簇更多，调小更稀。
const GRASS_HEIGHT_CLUSTER_SCALE = 0.055 // 高度衰减草簇噪声尺度；调大簇更小更碎，调小簇更大。
const GRASS_HEIGHT_CLUSTER_EDGE_SOFTNESS = 0.10 // 草簇边缘扰动强度；调大边缘更破碎，调小边界更平滑。
const DRY_GULLY_GRASS_CORE_RATIO = 0.35 // 无水干沟中线可留草宽度（相对沟底半宽）；调大沟底草带更宽。
const DRY_GULLY_GRASS_KEEP = 0.18 // 干沟沟底草簇保留强度；调大中线草更多，调小更稀。
const DRY_GULLY_GRASS_CLUSTER_SCALE = 0.16 // 干沟沟底草簇尺度；调大簇更小更碎，调小簇更大。
const DRY_GULLY_GRASS_EDGE_FADE = 0.18 // 干沟沟底草带边缘淡出宽度；调大边缘更柔和。
const DRY_GULLY_BANK_GRASS_MIN_KEEP = 0.42 // 干沟沟边最低草簇保留率；调大沟边更快长草，调小沟边更空。
const DRY_GULLY_BANK_GRASS_RECOVER = 0.85 // 干沟沟边恢复到满草的距离倍率（相对沟半宽）；调大恢复更慢，调小恢复更快。
const GRASS_CAMPFIRE_CLEAR_RADIUS = 4.5 // 火堆基础清草半径；调大火堆周围更空，调小草更靠近火堆。
const MODEL_GRASS_FOOTPRINT_PADDING = 2.5 // 模型草额外避让 padding；调大结构/洞口周边更干净，调小草更贴边。
const MINE_CAVE_MODEL_GRASS_PADDING = 4 // 矿洞模型草避让；调大矿洞入口更空，调小草可能贴到洞口模型。
const MINE_CAVE_CARD_GRASS_PADDING = 4 // 卡片/杂物草对矿洞避让；调大清空更多，调小更容易穿插。
const GRASS_CAMPFIRE_CLEARINGS = [
  { x: 0, z: 50 },
  { x: 19, z: -66 },
  { x: -18, z: -2 },
  { x: 22, z: 22 },
]
// 火堆清草中心列表；增删点会改变哪些营地周围保持裸地。
const RANDOM_FOREST_TREE_COUNT = 120 // 旧随机林树数量；调大更密但碰撞/渲染更多，调小更稀。
const RANDOM_FOREST_BOUNDS = { minX: -118, maxX: 112, minZ: -92, maxZ: 86 } // 旧随机林范围；扩大可覆盖更多中心区域。
const RANDOM_FOREST_TREE_MIN_SPACING = 7.5 // 随机树最小间距；调大更疏，调小更密且可能互相穿插。
const RANDOM_FOREST_SPAWN_CLEAR_RADIUS = 16 // 出生点/中心清树半径；调大初始区更空，调小树更靠近玩家。
const RANDOM_FOREST_CAMPFIRE_CLEAR_RADIUS = 7.5 // 随机树避开火堆半径；调大营地更空，调小树更贴近火堆。
const RANDOM_FOREST_OLD_CHURCH_CLEAR_RADIUS = 15 // 随机树避开旧教堂半径；调大建筑周围更空。
const RANDOM_FOREST_CASTLE_APPROACH_CLEARING = { x: 64, z: -5, hx: 25, hz: 22 } // 城堡引道矩形清树区；hx/hz 越大空地越大。
const RANDOM_FOREST_CASTLE_ENTRANCE_CLEAR_RADIUS = 20 // 城堡入口圆形清树半径；调大入口更通畅。
const FOREST_GROVE_TREE_TYPES = [
  { file: 'tree_01.glb', scale: 0.42, r: 1.35 },
  { file: 'tree_02.glb', scale: 0.50, r: 1.25 },
  { file: 'tree_03.glb', scale: 0.88, r: 1.05 },
  { file: 'tree_04.glb', scale: 0.84, r: 1.05 },
]
// 手工林地可选树模型；file 换模型，scale 改视觉大小，r 改碰撞/间距估算半径。
const FOREST_GROVE_SHRUB_TYPES = [
  { file: 'background_tree_10.glb', scale: 0.70 },
  { file: 'background_tree_12.glb', scale: 0.85 },
  { file: 'background_tree_13.glb', scale: 0.68 },
]
// 手工林地灌木/背景树模型；调大 scale 会让林下更满，也可能更挡视线。
const FOREST_GROVE_ROCK_TYPES = [
  { file: 'rock_02.glb', scale: 1.15, r: 0.70 },
  { file: 'rock_03.glb', scale: 1.20, r: 0.62 },
  { file: 'rock_05.glb', scale: 1.35, r: 0.58 },
  { file: 'rock_07.glb', scale: 1.00, r: 0.55 },
  { file: 'rock_09.glb', scale: 1.45 },
]
// 手工林地岩石模型；scale/r 与树同理，r 缺省时使用模型包围盒估算。
const SOUTH_BASIN_LAKESIDE_DECORATIONS = [
  { file: 'rock_02.glb', angleDeg: -16, radius: 49, scale: 1.28, r: 0.72 },
  { file: 'rock_05.glb', angleDeg: 24, radius: 48, scale: 1.36, r: 0.64 },
  { file: 'rock_03.glb', angleDeg: 66, radius: 51, scale: 1.12, r: 0.60 },
  { file: 'rock_07.glb', angleDeg: 118, radius: 49, scale: 1.22, r: 0.58 },
  { file: 'rock_09.glb', angleDeg: 164, radius: 52, scale: 1.26, r: 0.68 },
  { file: 'rock_02.glb', angleDeg: 212, radius: 50, scale: 1.08, r: 0.62 },
  { file: 'rock_05.glb', angleDeg: 252, radius: 48, scale: 1.18, r: 0.60 },
  { file: 'rock_07.glb', angleDeg: 298, radius: 51, scale: 1.16, r: 0.58 },
  { file: 'tree_01.glb', angleDeg: 42, radius: 61, scale: 0.42, r: 1.35 },
  { file: 'tree_03.glb', angleDeg: 92, radius: 66, scale: 0.78, r: 1.10 },
  { file: 'tree_02.glb', angleDeg: 142, radius: 59, scale: 0.46, r: 1.25 },
  { file: 'tree_04.glb', angleDeg: 196, radius: 65, scale: 0.76, r: 1.05 },
  { file: 'tree_01.glb', angleDeg: 248, radius: 62, scale: 0.40, r: 1.25 },
  { file: 'tree_03.glb', angleDeg: 314, radius: 67, scale: 0.74, r: 1.10 },
  { file: 'background_tree_10.glb', angleDeg: 8, radius: 56, scale: 0.62 },
  { file: 'background_tree_12.glb', angleDeg: 76, radius: 57, scale: 0.72 },
  { file: 'background_tree_13.glb', angleDeg: 154, radius: 55, scale: 0.58 },
  { file: 'background_tree_10.glb', angleDeg: 232, radius: 58, scale: 0.60 },
  { file: 'background_tree_12.glb', angleDeg: 282, radius: 56, scale: 0.70 },
  { file: 'background_tree_13.glb', angleDeg: 338, radius: 54, scale: 0.56 },
]
// 南部湖岸固定点缀；radius 是相对湖心距离，石头贴岸、树木外圈，避免把湖岸完全封死。
const FOREST_TREE_COLLIDER_SCALE = 0.6 // 手工树碰撞半径倍率；调大更难贴近树干，调小更容易穿进树冠/树干。
const FOREST_ROCK_COLLIDER_SCALE = 0.85 // 手工岩石碰撞半径倍率；调大避让更保守，调小更贴边。

// ── 世界级实例化树木散布（铺满全世界，复用草地分块/实例化框架）──
const FOREST_GROVE_HEIGHT_BOOST = 1.8        // 手工林地树/灌木同步加高（岩石不受影响）
const WORLD_TREE_CELL_LEN = 128              // 空间分块边长（米）：每 (cell×模型×子件) 一个 InstancedMesh
const WORLD_TREE_SPACING = 5.8               // 撒点网格步距（米）
const WORLD_TREE_JITTER = 0.75               // 位置抖动比例（相对步距）
const WORLD_TREE_MAX_SLOPE = 1.3             // 每 1.5m 地面起伏上限（超出=崖/陡坡，不种）
const WORLD_TREE_TREELINE_LO = 46            // 树线软带下沿（开始变稀）
const WORLD_TREE_TREELINE_HI = 64            // 树线软带上沿（以上裸岩/雪，不种）
const WORLD_TREE_RIVER_HANDOFF = 6           // 距水道边缘 <此值 不种（避水/河岸）
const WORLD_TREE_VALLEY_HARD_CLEAR_RATIO = 0.42 // 新河谷 treeClearance 内侧仍硬清树，外侧转为稀疏过渡。
const WORLD_TREE_VALLEY_INNER_KEEP = 0.26    // 河谷软过渡起点保留率；调低会让沟边更空。
const WORLD_TREE_VALLEY_OUTER_KEEP = 0.86    // 河谷软过渡外缘保留率；调高会让坡肩接近普通林密度。
const WORLD_TREE_HEIGHT_BOOST = 2.05         // 散布树高度倍数（与手工林地一致）
// 距离分级 LOD（按 cell 中心到玩家水平距离）：始终渲染到 COVERAGE，靠近逐级提质量
const WORLD_TREE_LOD_NEAR = 130              // <=near：树冠+树干+树下草（全质量）
const WORLD_TREE_LOD_MID = 240               // near..mid：树冠+树干，去树下草
const WORLD_TREE_COVERAGE = 480              // mid..coverage：仅树冠；超出全隐（雾已淡化，< 相机 far 3000）
const WORLD_TREE_LOD_HYST = 24               // 分档滞后带（米），防边界来回抖动
const WORLD_TREE_LEAF_FULL_DIST = 260        // <=此距离：forest_pack 树叶全量显示
const WORLD_TREE_LEAF_SPARSE_DIST = 1400     // >=此距离：forest_pack 树叶仅轻微降密，保持远景树冠连续
const WORLD_TREE_LEAF_MIN_KEEP = 0.90        // 远距离树冠稳定保留的叶片比例
const WORLD_TREE_INSTANCE_FULL_DIST = 100    // >=此距离：世界树实例开始按确定性 rank 减量
const WORLD_TREE_INSTANCE_FAR_KEEP = 0.34    // 远距离世界树实例保留比例（仅 world-tree InstancedMesh）
const WORLD_TREE_CLUSTER_THRESHOLD = 0.43    // 林斑噪声阈值；低频林团，避免俯视均匀撒点
const WORLD_TREE_BUILD_MS_PER_FRAME = 5      // 增量构建每帧预算（毫秒）
const WORLD_TREE_VIS_INTERVAL = 0.25         // cell 可见性评估节流（秒）
const WORLD_TREE_THIN = 0.46                 // 确定性概率剔除比例；0=不额外减密
const WORLD_TREE_GRASS_PER_TREE = 6          // 每棵树脚下补的草簇数
const WORLD_TREE_GRASS_RADIUS = 2.6          // 树下补草散布半径（米）
const WORLD_TREE_MODELS = [                  // 复用 forest_pack 模型 + 基准缩放
  { file: 'tree_01.glb', scale: 0.42 },
  { file: 'tree_02.glb', scale: 0.50 },
  { file: 'tree_03.glb', scale: 0.88 },
  { file: 'tree_04.glb', scale: 0.84 },
]
const MODEL_TREE_GREEN_FILE_SET = new Set(MODEL_TREE_COLOR_MIX.greenFiles || [])
const MODEL_TREE_YELLOW_FILE_SET = new Set(MODEL_TREE_COLOR_MIX.yellowFiles || [])
const MODEL_TREE_YELLOW_RATIO = (() => {
  const value = Number(MODEL_TREE_COLOR_MIX.yellowRatio)
  return Number.isFinite(value) ? THREE.MathUtils.clamp(value, 0, 1) : 0
})()
const FOREST_CASTLE_GATE_CLEARING = { minX: 39, maxX: 52, minZ: -11, maxZ: 4 } // 城堡门口清树矩形；扩大可防树挡门，缩小会让树林更靠近入口。
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
// 城堡引道两侧土丘；x/z 为中心，rx/rz 为椭圆半径，h 为高度，rot 为旋转，r 为避让半径。
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
// 城堡引道岩脊墙；points 里的 [x,z,width,height] 控制位置、山脊宽度和高度。
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
// 城堡北侧高台；rx/rz/height 控制体量，top/edge 控制台顶平整与边缘过渡，ramp* 控制上坡通道。
const CASTLE_NORTH_HIGHLAND_PLACEMENTS = [
  { file: 'tree_01.glb', dx: 51.0, dz: 38.0, rotY: 0.6, scale: 0.46, r: 0.86 },
  { file: 'tree_02.glb', dx: 52.0, dz: 34.0, rotY: 2.1, scale: 0.52, r: 0.78 },
  { file: 'tree_04.glb', dx: 63.0, dz: 27.5, rotY: 4.4, scale: 0.82, r: 0.86 },
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
// 北侧高台上的手工树/石；dx/dz 是世界坐标，rotY 旋转，scale 缩放，r 碰撞/避让半径。
// 矿洞交互与地形配置；x/z 是地表入口，cavern* 是地下洞室，shaft* 是竖井/阻挡体，
// ladder* 控制爬梯视觉和玩家落点，*Range 控制交互距离，*HalfWidth/*HalfDepth 控制地下碰撞空间。
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

// 主河控制点；移动点会同时改变地形碳刻、水面、碰撞采样和湿泥材质带。
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
const HERO_RIVER_POINTS = resampleRiverPath(HERO_RIVER_CONTROL, 2) // 主河平滑后点列；密度越高弯道越顺，但地形/水面采样成本更高。
// 支流配置：points 为控制点，halfWidthStart/End 控制上下游宽度，sourceLift 抬高源头解析水位，sideChannel 表示侧汊。
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

const NEWLAND_BRAIDED_SLOPE_DEG = 45 // 新大陆辫状河岸坡角；调小河岸更缓更宽，调大河道更陡更窄。
const NEWLAND_BRAIDED_CHANNELS = [
  {
    id: 'braid_main',
    points: [
      { x: -450, z: -310 },
      { x: -390, z: -360 },
      { x: -300, z: -410 },
      { x: -220, z: -455 },
      { x: -150, z: -520 },
      { x: -90, z: -590 },
    ],
    halfWidthStart: 7.2,
    halfWidthEnd: 9.2,
    cutDepth: 3.2,
    waterDepth: 0.75,
  },
  {
    id: 'braid_west_split',
    points: [
      { x: -390, z: -360 },
      { x: -365, z: -445 },
      { x: -300, z: -515 },
      { x: -220, z: -455 },
    ],
    halfWidthStart: 4.8,
    halfWidthEnd: 6.8,
    cutDepth: 2.8,
    waterDepth: 0.55,
  },
  {
    id: 'braid_east_split',
    points: [
      { x: -300, z: -410 },
      { x: -245, z: -355 },
      { x: -170, z: -430 },
      { x: -150, z: -520 },
    ],
    halfWidthStart: 4.4,
    halfWidthEnd: 6.5,
    cutDepth: 2.7,
    waterDepth: 0.5,
  },
  {
    id: 'braid_south_loop',
    points: [
      { x: -300, z: -515 },
      { x: -260, z: -565 },
      { x: -190, z: -610 },
      { x: -90, z: -590 },
    ],
    halfWidthStart: 5.2,
    halfWidthEnd: 7.0,
    cutDepth: 2.9,
    waterDepth: 0.6,
  },
  {
    id: 'braid_north_rill',
    points: [
      { x: -430, z: -400 },
      { x: -365, z: -445 },
      { x: -300, z: -410 },
    ],
    halfWidthStart: 3.8,
    halfWidthEnd: 5.4,
    cutDepth: 2.5,
    waterDepth: 0.45,
  },
  {
    id: 'braid_side_cut',
    points: [
      { x: -250, z: -330 },
      { x: -220, z: -395 },
      { x: -170, z: -430 },
    ],
    halfWidthStart: 3.6,
    halfWidthEnd: 5.0,
    cutDepth: 2.4,
    waterDepth: 0.42,
  },
  {
    id: 'braid_west_source',
    points: [
      { x: -520, z: -275 },
      { x: -485, z: -295 },
      { x: -450, z: -310 },
    ],
    halfWidthStart: 3.2,
    halfWidthEnd: 5.4,
    cutDepth: 2.4,
    waterDepth: 0.48,
  },
  {
    id: 'braid_northwest_feeder',
    points: [
      { x: -520, z: -470 },
      { x: -465, z: -450 },
      { x: -365, z: -445 },
    ],
    halfWidthStart: 2.8,
    halfWidthEnd: 5.2,
    cutDepth: 2.2,
    waterDepth: 0.42,
  },
  {
    id: 'braid_north_fork',
    points: [
      { x: -485, z: -390 },
      { x: -455, z: -404 },
      { x: -430, z: -400 },
    ],
    halfWidthStart: 2.6,
    halfWidthEnd: 4.4,
    cutDepth: 2.0,
    waterDepth: 0.38,
  },
  {
    id: 'braid_northeast_feeder',
    points: [
      { x: -330, z: -260 },
      { x: -292, z: -292 },
      { x: -250, z: -330 },
    ],
    halfWidthStart: 2.8,
    halfWidthEnd: 4.8,
    cutDepth: 2.2,
    waterDepth: 0.42,
  },
  {
    id: 'braid_east_upper_leaf',
    points: [
      { x: -85, z: -345 },
      { x: -125, z: -385 },
      { x: -170, z: -430 },
    ],
    halfWidthStart: 2.6,
    halfWidthEnd: 4.8,
    cutDepth: 2.1,
    waterDepth: 0.4,
  },
  {
    id: 'braid_east_fan',
    points: [
      { x: -40, z: -500 },
      { x: -66, z: -545 },
      { x: -90, z: -590 },
    ],
    halfWidthStart: 2.9,
    halfWidthEnd: 5.4,
    cutDepth: 2.3,
    waterDepth: 0.46,
  },
  {
    id: 'braid_south_feeder',
    points: [
      { x: -260, z: -680 },
      { x: -228, z: -642 },
      { x: -190, z: -610 },
    ],
    halfWidthStart: 3.0,
    halfWidthEnd: 5.4,
    cutDepth: 2.3,
    waterDepth: 0.46,
  },
  {
    id: 'braid_southwest_feeder',
    points: [
      { x: -520, z: -620 },
      { x: -430, z: -565 },
      { x: -300, z: -515 },
    ],
    halfWidthStart: 3.1,
    halfWidthEnd: 5.6,
    cutDepth: 2.4,
    waterDepth: 0.48,
  },
]
// 新大陆辫状河配置；points 控制水道路径，halfWidthStart/End 控制宽度变化，cutDepth 控制切深，waterDepth 控制水面高于河床多少。

for (const channel of NEWLAND_BRAIDED_CHANNELS) {
  channel.controlPoints = channel.points
  channel.points = resampleRiverPath(channel.points, 3)
}

const NEWLAND_ENDPOINT_LAKE_CONNECT_RADIUS = 18 // 端点多近算已连接；调大减少自动源头/末端湖，调小会生成更多小湖。
const NEWLAND_ENDPOINT_LAKE_MERGE_RADIUS = 22 // 自动湖多近会合并；调大湖更少更大，调小保留更多独立湖。

function createNewlandEndpointLakes() {
  const allPoints = []
  NEWLAND_BRAIDED_CHANNELS.forEach((channel) => {
    channel.controlPoints.forEach((point, pointIndex) => {
      allPoints.push({ channelId: channel.id, pointIndex, point })
    })
  })

  const lakes = []
  NEWLAND_BRAIDED_CHANNELS.forEach((channel, channelIndex) => {
    const endpoints = [
      { pointIndex: 0, nearIndex: 1, t: 0 },
      { pointIndex: channel.controlPoints.length - 1, nearIndex: channel.controlPoints.length - 2, t: 1 },
    ]

    for (const endpoint of endpoints) {
      const point = channel.controlPoints[endpoint.pointIndex]
      const connected = allPoints.some((other) => {
        if (other.channelId === channel.id && other.pointIndex === endpoint.pointIndex) return false
        return Math.hypot(point.x - other.point.x, point.z - other.point.z) <= NEWLAND_ENDPOINT_LAKE_CONNECT_RADIUS
      })
      if (connected) continue

      const near = channel.controlPoints[endpoint.nearIndex]
      const dirX = near.x - point.x
      const dirZ = near.z - point.z
      const len = Math.max(0.001, Math.hypot(dirX, dirZ))
      const seed = 9300 + channelIndex * 379 + endpoint.pointIndex * 17
      const baseWidth = newlandBraidedHalfWidthAt(channel, endpoint.t)
      const lake = {
        id: `${channel.id}_${endpoint.t === 0 ? 'source' : 'end'}_lake`,
        x: point.x,
        z: point.z,
        rx: THREE.MathUtils.clamp(baseWidth * 2.6 + 7 + (seed % 5), 12, 22),
        rz: THREE.MathUtils.clamp(baseWidth * 1.85 + 5 + (seed % 3), 9, 16),
        rot: Math.atan2(dirZ / len, dirX / len),
        waterDepth: THREE.MathUtils.clamp(channel.waterDepth + 0.18, 0.55, 0.85),
        shoreRun: 7,
        treeClearance: 9,
        seed,
      }

      const existing = lakes.find(existingLake => Math.hypot(existingLake.x - lake.x, existingLake.z - lake.z) < NEWLAND_ENDPOINT_LAKE_MERGE_RADIUS)
      if (existing) {
        existing.x = (existing.x + lake.x) * 0.5
        existing.z = (existing.z + lake.z) * 0.5
        existing.rx = Math.max(existing.rx, lake.rx)
        existing.rz = Math.max(existing.rz, lake.rz)
        existing.waterDepth = Math.max(existing.waterDepth, lake.waterDepth)
        continue
      }
      lakes.push(lake)
    }
  })
  return lakes
}

const NEWLAND_ENDPOINT_LAKES = createNewlandEndpointLakes().filter((lake) => (
  Math.hypot(lake.x + 294, lake.z + 710) > 82
))
// 南部手工湖会覆盖该区域；过滤重叠的自动端点湖，避免湖口出现两套水位。
const NEWLAND_MOUNTAIN_LAKE = {
  id: 'mountain_mid_lake',
  x: -900,
  z: -900,
  rx: 150,
  rz: 115,
  rot: THREE.MathUtils.degToRad(12),
  waterDepth: 1.05,
  shoreRun: 18,
  treeClearance: 18,
  seed: 14920,
}
// 固定山中湖；x/z/rot 定位，rx/rz 定大小，waterDepth/shoreRun/treeClearance 控制水深、岸线过渡和树木避让。
const SOUTH_BASIN_LAKE = {
  id: 'south_basin_lake',
  x: -294,
  z: -710,
  rx: 45,
  rz: 45,
  rot: THREE.MathUtils.degToRad(-8),
  waterDepth: 3.2,
  shoreRun: 18,
  treeClearance: 12,
  boundaryScales: [
    { angle: THREE.MathUtils.degToRad(45), scale: 1.12 },
    { angle: THREE.MathUtils.degToRad(88), scale: 1.05 },
    { angle: THREE.MathUtils.degToRad(145), scale: 0.96 },
    { angle: THREE.MathUtils.degToRad(180), scale: 0.90 },
    { angle: THREE.MathUtils.degToRad(-150), scale: 0.86 },
    { angle: THREE.MathUtils.degToRad(-115), scale: 0.78 },
    { angle: THREE.MathUtils.degToRad(-70), scale: 0.92 },
    { angle: THREE.MathUtils.degToRad(-20), scale: 1.02 },
  ],
  flatBedY: 23.6,
  flatBedRadius: 0.68,
  flatBedFeather: 0.12,
  steepBankPower: 2.6,
  shoreShelfRun: 11,
  shoreBackRun: 7,
  shoreShelfRise: 0.72,
  wetMudRun: 7.5,
  dryBankRun: 10,
  grassStartRun: 9,
  edgeDrop: 1.4,
  seed: 26601,
}
// 南部新湖；boundaryScales/flatBedY/shoreShelf 只加强这个湖的岸线贴合、深平底和外侧承托，不影响其它静态湖。
const BOTTOM_DEPRESSION_LAKE = {
  id: 'bottom_depression_lake',
  x: 74.6,
  z: -319.4,
  rx: 105,
  rz: 105,
  rot: THREE.MathUtils.degToRad(44),
  circular: true,
  preserveWaterShape: true,
  waterDepth: 2.7,
  shoreRun: 22,
  treeClearance: 22,
  flatBedY: -32.9,
  flatBedRadius: 0.7,
  flatBedFeather: 0.16,
  steepBankPower: 2.1,
  shoreShelfRun: 15,
  shoreBackRun: 10,
  shoreShelfRise: 0.72,
  edgeDrop: 0.45,
  seed: 743194,
}
// 底部凹陷深潭；水面锚在低洼底部，避免把整个大凹陷灌满。
const NEWLAND_STATIC_LAKES = [...NEWLAND_ENDPOINT_LAKES, NEWLAND_MOUNTAIN_LAKE, SOUTH_BASIN_LAKE, BOTTOM_DEPRESSION_LAKE] // 所有静态湖集合；由自动端点湖 + 固定山中湖 + 南部新湖组成，供地形/水面/树木避让共用。

const NEWLAND_MOUNTAIN_OUTLET = {
  id: 'mountain_lake_outlet',
  points: [
    { x: -890, z: -790 },
    { x: -850, z: -700 },
    { x: -805, z: -610 },
    { x: -760, z: -520 },
  ],
  halfWidthStart: 8.0,
  halfWidthEnd: 6.0,
  cutDepth: 2.6,
  waterDepth: 0.75,
}
// 山中湖出水道；字段含义与辫状河相同，调宽/调深会同步影响地形、水面与树木避让。
NEWLAND_MOUNTAIN_OUTLET.controlPoints = NEWLAND_MOUNTAIN_OUTLET.points
NEWLAND_MOUNTAIN_OUTLET.points = resampleRiverPath(NEWLAND_MOUNTAIN_OUTLET.points, 3)

const GLOBAL_WET_GULLIES = [
  {
    id: 'mountain_outlet_west_link',
    points: [
      { x: -760, z: -520 },
      { x: -680, z: -555 },
      { x: -585, z: -600 },
      { x: -520, z: -620 },
    ],
    halfWidthStart: 3.2,
    halfWidthEnd: 4.8,
    cutDepth: 2.2,
    waterDepth: 0.42,
  },
  {
    id: 'far_west_mountain_feed',
    points: [
      { x: -1120, z: -650 },
      { x: -1010, z: -690 },
      { x: -880, z: -705 },
      { x: -760, z: -650 },
      { x: -585, z: -600 },
    ],
    halfWidthStart: 2.7,
    halfWidthEnd: 4.4,
    cutDepth: 2.8,
    waterDepth: 0.38,
  },
  {
    id: 'south_basin_feed',
    points: [
      { x: -430, z: -760 },
      { x: -365, z: -736 },
      { x: -318, z: -724 },
      { x: -294, z: -710 },
      { x: -267.5, z: -687.1 },
      { x: -246, z: -650 },
      { x: -190, z: -610 },
    ],
    halfWidthStart: 3.4,
    halfWidthEnd: 5.4,
    cutDepth: 3.2,
    waterDepth: 0.48,
    lakeJoin: 'south_basin_lake',
  },
  {
    id: 'central_lowland_link',
    points: [
      { x: -520, z: 40 },
      { x: -410, z: -18 },
      { x: -285, z: -86 },
      { x: -155, z: -132 },
    ],
    halfWidthStart: 2.8,
    halfWidthEnd: 4.1,
    cutDepth: 2.0,
    waterDepth: 0.36,
  },
  {
    id: 'east_lowland_link',
    points: [
      { x: 315, z: 95 },
      { x: 220, z: 25 },
      { x: 120, z: -60 },
      { x: 30, z: -145 },
    ],
    halfWidthStart: 2.6,
    halfWidthEnd: 4.0,
    cutDepth: 2.1,
    waterDepth: 0.36,
  },
]
// 全局湿沟只挑主连通沟放浅水；大部分程序化细沟仍保持干沟，避免整图变成水网。
for (const gully of GLOBAL_WET_GULLIES) {
  gully.controlPoints = gully.points
  gully.points = resampleRiverPath(gully.points, 3)
}

const NEWLAND_DENDRITIC_GULLIES = [
  { id: 'west_slope_trunk', group: 'west_slope', width: 8.0, influence: 58, treeClearance: 20, depth: 5.8, points: [{ x: -1510, z: -1180 }, { x: -1340, z: -1085 }, { x: -1190, z: -990 }, { x: -1065, z: -890 }] },
  { id: 'west_slope_branch_north', group: 'west_slope', width: 5.4, influence: 42, treeClearance: 16, depth: 4.4, points: [{ x: -1560, z: -980 }, { x: -1430, z: -1015 }, { x: -1290, z: -1035 }] },
  { id: 'west_slope_branch_south', group: 'west_slope', width: 5.1, influence: 40, treeClearance: 16, depth: 4.2, points: [{ x: -1440, z: -1320 }, { x: -1355, z: -1195 }, { x: -1240, z: -1030 }] },
  { id: 'west_slope_branch_high', group: 'west_slope', width: 4.8, influence: 38, treeClearance: 15, depth: 4.0, points: [{ x: -1660, z: -1110 }, { x: -1500, z: -1100 }, { x: -1365, z: -1088 }] },
  { id: 'west_slope_branch_low', group: 'west_slope', width: 4.6, influence: 36, treeClearance: 15, depth: 3.8, points: [{ x: -1290, z: -850 }, { x: -1185, z: -875 }, { x: -1085, z: -900 }] },

  { id: 'south_slope_trunk', group: 'south_slope', width: 8.2, influence: 60, treeClearance: 20, depth: 6.0, points: [{ x: -900, z: -1540 }, { x: -910, z: -1360 }, { x: -920, z: -1195 }, { x: -940, z: -1035 }] },
  { id: 'south_slope_branch_west', group: 'south_slope', width: 5.4, influence: 42, treeClearance: 16, depth: 4.4, points: [{ x: -1110, z: -1480 }, { x: -1025, z: -1340 }, { x: -950, z: -1210 }] },
  { id: 'south_slope_branch_east', group: 'south_slope', width: 5.2, influence: 40, treeClearance: 16, depth: 4.2, points: [{ x: -720, z: -1450 }, { x: -805, z: -1320 }, { x: -895, z: -1180 }] },
  { id: 'south_slope_branch_mid', group: 'south_slope', width: 4.8, influence: 38, treeClearance: 15, depth: 4.0, points: [{ x: -1030, z: -1600 }, { x: -970, z: -1460 }, { x: -925, z: -1320 }] },
  { id: 'south_slope_branch_lower', group: 'south_slope', width: 4.7, influence: 36, treeClearance: 15, depth: 3.9, points: [{ x: -720, z: -1220 }, { x: -820, z: -1160 }, { x: -920, z: -1080 }] },

  { id: 'southwest_corner_trunk', group: 'southwest_corner', width: 8.5, influence: 62, treeClearance: 20, depth: 6.0, points: [{ x: -1950, z: -1900 }, { x: -1740, z: -1700 }, { x: -1510, z: -1490 }, { x: -1270, z: -1260 }] },
  { id: 'southwest_corner_branch_west', group: 'southwest_corner', width: 5.5, influence: 42, treeClearance: 16, depth: 4.5, points: [{ x: -2140, z: -1780 }, { x: -1940, z: -1735 }, { x: -1740, z: -1690 }] },
  { id: 'southwest_corner_branch_south', group: 'southwest_corner', width: 5.2, influence: 40, treeClearance: 16, depth: 4.3, points: [{ x: -1780, z: -2140 }, { x: -1690, z: -1900 }, { x: -1590, z: -1600 }] },
  { id: 'southwest_corner_branch_mid', group: 'southwest_corner', width: 5.0, influence: 39, treeClearance: 15, depth: 4.1, points: [{ x: -1990, z: -2040 }, { x: -1835, z: -1840 }, { x: -1660, z: -1625 }] },
  { id: 'southwest_corner_branch_low', group: 'southwest_corner', width: 4.8, influence: 38, treeClearance: 15, depth: 4.0, points: [{ x: -1570, z: -1320 }, { x: -1440, z: -1285 }, { x: -1290, z: -1265 }] },

  { id: 'northwest_slope_trunk', group: 'northwest_slope', width: 7.8, influence: 56, treeClearance: 19, depth: 5.5, points: [{ x: -1460, z: 630 }, { x: -1320, z: 430 }, { x: -1190, z: 230 }, { x: -1040, z: 20 }] },
  { id: 'northwest_slope_branch_west', group: 'northwest_slope', width: 5.2, influence: 40, treeClearance: 16, depth: 4.2, points: [{ x: -1660, z: 520 }, { x: -1485, z: 475 }, { x: -1320, z: 430 }] },
  { id: 'northwest_slope_branch_north', group: 'northwest_slope', width: 5.0, influence: 39, treeClearance: 15, depth: 4.1, points: [{ x: -1240, z: 720 }, { x: -1255, z: 560 }, { x: -1285, z: 390 }] },
  { id: 'northwest_slope_branch_mid', group: 'northwest_slope', width: 4.8, influence: 38, treeClearance: 15, depth: 3.9, points: [{ x: -1510, z: 240 }, { x: -1350, z: 235 }, { x: -1200, z: 230 }] },
  { id: 'northwest_slope_branch_low', group: 'northwest_slope', width: 4.6, influence: 36, treeClearance: 15, depth: 3.8, points: [{ x: -1230, z: -70 }, { x: -1140, z: -30 }, { x: -1055, z: 10 }] },

  { id: 'midwest_to_wetland_trunk', group: 'midwest_to_wetland', width: 7.6, influence: 56, treeClearance: 19, depth: 5.4, points: [{ x: -1710, z: -260 }, { x: -1500, z: -340 }, { x: -1290, z: -430 }, { x: -1060, z: -520 }] },
  { id: 'midwest_to_wetland_branch_west', group: 'midwest_to_wetland', width: 5.1, influence: 40, treeClearance: 16, depth: 4.2, points: [{ x: -1900, z: -420 }, { x: -1680, z: -390 }, { x: -1490, z: -340 }] },
  { id: 'midwest_to_wetland_branch_north', group: 'midwest_to_wetland', width: 4.9, influence: 38, treeClearance: 15, depth: 4.0, points: [{ x: -1600, z: -80 }, { x: -1505, z: -210 }, { x: -1410, z: -375 }] },
  { id: 'midwest_to_wetland_branch_south', group: 'midwest_to_wetland', width: 4.9, influence: 38, treeClearance: 15, depth: 4.0, points: [{ x: -1430, z: -650 }, { x: -1350, z: -555 }, { x: -1250, z: -450 }] },
  { id: 'midwest_to_wetland_branch_low', group: 'midwest_to_wetland', width: 4.6, influence: 36, treeClearance: 15, depth: 3.8, points: [{ x: -1160, z: -650 }, { x: -1110, z: -585 }, { x: -1065, z: -525 }] },
]
// 山坡树枝状冲沟；width/influence/depth 控制沟宽、影响范围和切深，treeClearance 控制沟边清树距离。
for (const gully of NEWLAND_DENDRITIC_GULLIES) {
  gully.controlPoints = gully.points
  gully.points = resampleRiverPath(gully.points, 3)
}

const EAST_RIM_MEGASLOPE = {
  x: 654,
  z: -844,
  height: 240,
  length: 930,
  backRun: 150,
  halfWidth: 470,
  feather: 190,
  downX: -0.6129,
  downZ: 0.7902,
  sideX: -0.7902,
  sideZ: -0.6129,
}
// 东侧大坡面；height/length/backRun/halfWidth/feather 控制坡体高度、长度、背坡和边缘淡出，down*/side* 是坡向单位向量。
const EAST_RIM_DRY_RIVERS = [
  {
    id: 'east_rim_main',
    tier: 'main',
    widthStart: 14,
    widthEnd: 25,
    influence: 112,
    treeClearance: 34,
    depthStart: 18,
    depthEnd: 34,
    points: [
      { x: 654, z: -844 },
      { x: 592, z: -788 },
      { x: 505, z: -710 },
      { x: 405, z: -620 },
      { x: 285, z: -505 },
      { x: 150, z: -385 },
      { x: 12, z: -270 },
    ],
  },
  { id: 'east_rim_branch_north', tier: 'branch', widthStart: 8.5, widthEnd: 12.5, influence: 70, treeClearance: 24, depthStart: 10.0, depthEnd: 16.5, points: [{ x: 548, z: -748 }, { x: 640, z: -665 }, { x: 735, z: -555 }] },
  { id: 'east_rim_branch_upper', tier: 'branch', widthStart: 8.0, widthEnd: 12.0, influence: 68, treeClearance: 23, depthStart: 9.6, depthEnd: 15.6, points: [{ x: 445, z: -655 }, { x: 560, z: -560 }, { x: 720, z: -458 }] },
  { id: 'east_rim_branch_east', tier: 'branch', widthStart: 8.2, widthEnd: 13.0, influence: 72, treeClearance: 24, depthStart: 10.0, depthEnd: 17.0, points: [{ x: 510, z: -712 }, { x: 682, z: -780 }, { x: 754, z: -862 }] },
  { id: 'east_rim_branch_south', tier: 'branch', widthStart: 8.8, widthEnd: 13.5, influence: 76, treeClearance: 25, depthStart: 10.5, depthEnd: 18.0, points: [{ x: 405, z: -620 }, { x: 548, z: -860 }, { x: 650, z: -1080 }] },
  { id: 'east_rim_branch_southwest', tier: 'branch', widthStart: 7.8, widthEnd: 12.0, influence: 68, treeClearance: 23, depthStart: 9.4, depthEnd: 15.8, points: [{ x: 285, z: -505 }, { x: 358, z: -740 }, { x: 438, z: -1005 }] },
  { id: 'east_rim_north_rill_high', tier: 'rill', widthStart: 3.8, widthEnd: 5.8, influence: 36, treeClearance: 15, depthStart: 5.2, depthEnd: 8.4, points: [{ x: 740, z: -390 }, { x: 708, z: -472 }, { x: 640, z: -665 }] },
  { id: 'east_rim_north_rill_side', tier: 'rill', widthStart: 3.6, widthEnd: 5.6, influence: 34, treeClearance: 14, depthStart: 5.0, depthEnd: 8.0, points: [{ x: 760, z: -640 }, { x: 705, z: -640 }, { x: 638, z: -666 }] },
  { id: 'east_rim_upper_rill_high', tier: 'rill', widthStart: 3.8, widthEnd: 5.8, influence: 36, treeClearance: 15, depthStart: 5.2, depthEnd: 8.4, points: [{ x: 720, z: -320 }, { x: 690, z: -400 }, { x: 600, z: -530 }] },
  { id: 'east_rim_upper_rill_low', tier: 'rill', widthStart: 3.4, widthEnd: 5.4, influence: 34, treeClearance: 14, depthStart: 4.8, depthEnd: 7.8, points: [{ x: 600, z: -430 }, { x: 585, z: -505 }, { x: 560, z: -560 }] },
  { id: 'east_rim_east_rill_north', tier: 'rill', widthStart: 3.6, widthEnd: 5.8, influence: 35, treeClearance: 14, depthStart: 5.0, depthEnd: 8.2, points: [{ x: 760, z: -720 }, { x: 710, z: -750 }, { x: 682, z: -780 }] },
  { id: 'east_rim_east_rill_south', tier: 'rill', widthStart: 3.6, widthEnd: 5.8, influence: 35, treeClearance: 14, depthStart: 5.0, depthEnd: 8.2, points: [{ x: 750, z: -1000 }, { x: 710, z: -930 }, { x: 754, z: -862 }] },
  { id: 'east_rim_south_rill_high', tier: 'rill', widthStart: 4.0, widthEnd: 6.2, influence: 38, treeClearance: 16, depthStart: 5.4, depthEnd: 9.0, points: [{ x: 700, z: -1180 }, { x: 660, z: -1110 }, { x: 650, z: -1080 }] },
  { id: 'east_rim_south_rill_west', tier: 'rill', widthStart: 3.8, widthEnd: 6.0, influence: 37, treeClearance: 15, depthStart: 5.3, depthEnd: 8.7, points: [{ x: 520, z: -1150 }, { x: 580, z: -1110 }, { x: 650, z: -1080 }] },
  { id: 'east_rim_southwest_rill_low', tier: 'rill', widthStart: 3.8, widthEnd: 6.0, influence: 37, treeClearance: 15, depthStart: 5.2, depthEnd: 8.7, points: [{ x: 330, z: -1120 }, { x: 385, z: -1060 }, { x: 438, z: -1005 }] },
  { id: 'east_rim_southwest_rill_mid', tier: 'rill', widthStart: 3.6, widthEnd: 5.8, influence: 35, treeClearance: 14, depthStart: 5.0, depthEnd: 8.4, points: [{ x: 250, z: -910 }, { x: 340, z: -920 }, { x: 438, z: -1005 }] },
]
// 东侧干河沟；tier 只是分层标签，widthStart/End、influence、depthStart/End 控制沟槽体量，treeClearance 控制清树。
for (const river of EAST_RIM_DRY_RIVERS) {
  river.controlPoints = river.points
  river.points = resampleRiverPath(river.points, 3)
}

function newlandStaticLakeBoundaryScale(lake, angle) {
  if (lake.circular) return 1
  if (lake.boundaryScales?.length) {
    const tau = Math.PI * 2
    const normalized = ((angle % tau) + tau) % tau
    const anchors = lake.boundaryScales
    for (let i = 0; i < anchors.length; i++) {
      const a = anchors[i]
      const b = anchors[(i + 1) % anchors.length]
      const aAngle = ((a.angle % tau) + tau) % tau
      let bAngle = ((b.angle % tau) + tau) % tau
      if (i === anchors.length - 1) bAngle += tau
      const sampleAngle = normalized < aAngle ? normalized + tau : normalized
      if (sampleAngle >= aAngle && sampleAngle <= bAngle) {
        const t = (sampleAngle - aAngle) / Math.max(0.001, bAngle - aAngle)
        const smoothT = t * t * (3 - 2 * t)
        return THREE.MathUtils.clamp(THREE.MathUtils.lerp(a.scale, b.scale, smoothT), 0.72, 1.18)
      }
    }
  }
  const phase = lake.seed * 0.013
  const wobble = Math.sin(angle * 3 + 0.7 + phase) * 0.10
    + Math.sin(angle * 5 - 1.2 + phase * 0.7) * 0.06
    + Math.cos(angle * 7 + 2.4 + phase * 1.3) * 0.04
  return THREE.MathUtils.clamp(1 + wobble, 0.82, 1.16)
}

function getNewlandStaticLakeShapeAt(lake, x, z) {
  const cos = Math.cos(lake.rot)
  const sin = Math.sin(lake.rot)
  const dx = x - lake.x
  const dz = z - lake.z
  const lx = dx * cos + dz * sin
  const lz = -dx * sin + dz * cos
  const nx = lx / lake.rx
  const nz = lz / lake.rz
  const radial = Math.hypot(nx, nz)
  const angle = Math.atan2(nz, nx)
  const boundary = newlandStaticLakeBoundaryScale(lake, angle)
  const avgRadius = (lake.rx + lake.rz) * 0.5
  const edge = (radial - boundary) * avgRadius
  return { lx, lz, radial, angle, boundary, edge }
}

function isInsideNewlandStaticLakeClearance(x, z) {
  return NEWLAND_STATIC_LAKES.some(lake => getNewlandStaticLakeShapeAt(lake, x, z).edge < lake.treeClearance)
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
const TERRAIN_NEWLAND_BRAID_SAMPLE_GLSL = emitTerrainRiverGLSL('terrainNewlandBraidSample', NEWLAND_BRAIDED_CHANNELS.map(c => c.controlPoints))
const TERRAIN_NEWLAND_MOUNTAIN_OUTLET_SAMPLE_GLSL = emitTerrainRiverGLSL('terrainNewlandMountainOutletSample', [NEWLAND_MOUNTAIN_OUTLET.controlPoints])
const TERRAIN_NEWLAND_DENDRITIC_GULLY_SAMPLE_GLSL = emitTerrainRiverGLSL('terrainNewlandDendriticGullySample', NEWLAND_DENDRITIC_GULLIES.map(g => g.controlPoints))
const TERRAIN_EAST_RIM_DRY_RIVER_SAMPLE_GLSL = emitTerrainRiverGLSL('terrainEastRimDryRiverSample', EAST_RIM_DRY_RIVERS.map(r => r.controlPoints))
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
  { id: 'taishan_lake_furrow_west', wet: false, width: 6.0, influence: 48, depth: 4.0, points: [{ x: -720, z: -1100 }, { x: -790, z: -1010 }, { x: -850, z: -940 }, { x: -900, z: -875 }] },
  { id: 'taishan_lake_furrow_east', wet: false, width: 5.6, influence: 44, depth: 3.6, points: [{ x: -570, z: -980 }, { x: -690, z: -940 }, { x: -805, z: -910 }, { x: -870, z: -860 }] },
  { id: 'huangshan_outlet_furrow_west', wet: false, width: 5.4, influence: 42, depth: 3.4, points: [{ x: -1120, z: -650 }, { x: -1035, z: -700 }, { x: -950, z: -760 }, { x: -900, z: -825 }] },
  { id: 'huangshan_outlet_furrow_east', wet: false, width: 5.2, influence: 40, depth: 3.2, points: [{ x: -1020, z: -520 }, { x: -940, z: -585 }, { x: -865, z: -670 }, { x: -825, z: -735 }] },
]
// 旧区域侵蚀沟；wet=true 会作为有水细流参与水面/碳刻，wet=false 只作为干沟塑形。
const LOWLAND_EROSION_GULLIES = [
  { id: 'central_lowland_trunk', width: 5.8, influence: 46, treeClearance: 17, depth: 2.9, points: [{ x: -520, z: 40 }, { x: -410, z: -18 }, { x: -285, z: -86 }, { x: -155, z: -132 }] },
  { id: 'central_lowland_branch_north', width: 3.9, influence: 32, treeClearance: 13, depth: 1.9, points: [{ x: -430, z: 128 }, { x: -385, z: 60 }, { x: -330, z: 15 }] },
  { id: 'central_lowland_branch_south', width: 4.4, influence: 36, treeClearance: 14, depth: 2.2, points: [{ x: -370, z: -210 }, { x: -320, z: -150 }, { x: -260, z: -96 }] },
  { id: 'central_lowland_branch_east', width: 3.8, influence: 30, treeClearance: 12, depth: 1.8, points: [{ x: 25, z: -185 }, { x: -48, z: -165 }, { x: -135, z: -136 }] },
  { id: 'braid_basin_trunk', width: 6.4, influence: 54, treeClearance: 20, depth: 3.5, points: [{ x: -575, z: -230 }, { x: -485, z: -315 }, { x: -390, z: -405 }, { x: -300, z: -515 }, { x: -195, z: -635 }] },
  { id: 'braid_basin_west_branch', width: 4.6, influence: 38, treeClearance: 15, depth: 2.5, points: [{ x: -650, z: -485 }, { x: -560, z: -455 }, { x: -455, z: -420 }] },
  { id: 'braid_basin_north_branch', width: 4.1, influence: 34, treeClearance: 14, depth: 2.2, points: [{ x: -455, z: -188 }, { x: -415, z: -268 }, { x: -360, z: -365 }] },
  { id: 'braid_basin_east_branch', width: 4.4, influence: 36, treeClearance: 14, depth: 2.4, points: [{ x: -38, z: -332 }, { x: -125, z: -415 }, { x: -230, z: -515 }] },
  { id: 'braid_basin_south_branch', width: 4.8, influence: 40, treeClearance: 16, depth: 2.7, points: [{ x: -480, z: -720 }, { x: -365, z: -670 }, { x: -245, z: -620 }] },
  { id: 'west_foothill_trunk', width: 6.0, influence: 52, treeClearance: 19, depth: 3.2, points: [{ x: -760, z: 230 }, { x: -650, z: 135 }, { x: -520, z: 45 }, { x: -410, z: -70 }] },
  { id: 'west_foothill_high_branch', width: 4.2, influence: 34, treeClearance: 14, depth: 2.3, points: [{ x: -760, z: 30 }, { x: -650, z: 18 }, { x: -535, z: -8 }] },
  { id: 'south_foothill_trunk', width: 6.2, influence: 54, treeClearance: 20, depth: 3.4, points: [{ x: -95, z: -760 }, { x: -180, z: -665 }, { x: -250, z: -560 }, { x: -320, z: -455 }] },
  { id: 'south_foothill_east_branch', width: 4.5, influence: 38, treeClearance: 15, depth: 2.5, points: [{ x: 60, z: -610 }, { x: -60, z: -590 }, { x: -190, z: -610 }] },
  { id: 'south_foothill_west_branch', width: 4.4, influence: 36, treeClearance: 14, depth: 2.4, points: [{ x: -430, z: -760 }, { x: -375, z: -675 }, { x: -315, z: -585 }] },
  { id: 'east_lowland_trunk', width: 5.4, influence: 44, treeClearance: 17, depth: 2.8, points: [{ x: 315, z: 95 }, { x: 220, z: 25 }, { x: 120, z: -60 }, { x: 30, z: -145 }] },
  { id: 'east_lowland_side_branch', width: 3.8, influence: 31, treeClearance: 12, depth: 1.9, points: [{ x: 305, z: -115 }, { x: 205, z: -98 }, { x: 95, z: -82 }] },
  { id: 'overview_center_fan_west', width: 4.2, influence: 38, treeClearance: 14, depth: 2.3, points: [{ x: -235, z: 210 }, { x: -280, z: 120 }, { x: -340, z: 42 }, { x: -420, z: -35 }] },
  { id: 'overview_center_fan_mid', width: 3.8, influence: 34, treeClearance: 13, depth: 2.0, points: [{ x: -85, z: 210 }, { x: -145, z: 125 }, { x: -220, z: 34 }, { x: -305, z: -55 }] },
  { id: 'overview_center_fan_east', width: 3.6, influence: 32, treeClearance: 12, depth: 1.9, points: [{ x: 120, z: 160 }, { x: 55, z: 85 }, { x: -35, z: 5 }, { x: -145, z: -82 }] },
  { id: 'overview_south_wash', width: 4.0, influence: 36, treeClearance: 13, depth: 2.1, points: [{ x: -35, z: -430 }, { x: -105, z: -360 }, { x: -185, z: -278 }, { x: -270, z: -185 }] },
  { id: 'overview_south_wash_west', width: 3.5, influence: 31, treeClearance: 12, depth: 1.8, points: [{ x: -360, z: -345 }, { x: -295, z: -282 }, { x: -225, z: -220 }] },
]
// 低地侵蚀沟；用于俯视远景的大尺度沟谷，字段含义与普通侵蚀沟相同，treeClearance 会影响沟边铺树。
for (const gully of LOWLAND_EROSION_GULLIES) {
  gully.controlPoints = gully.points
  gully.points = resampleRiverPath(gully.points, 3)
}
const TERRAIN_LOWLAND_EROSION_GULLY_SAMPLE_GLSL = emitTerrainRiverGLSL('terrainLowlandErosionGullySample', LOWLAND_EROSION_GULLIES.map(g => g.controlPoints))
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

const RIVER_BRANCH_QUERY_PADDING = 40 // 支流查询包围盒外扩；调大更不易漏采样但每次查找范围更宽。
const RIVER_BRANCH_BOUNDS = RIVER_BRANCHES.map(branch => ({
  branch,
  bounds: makePathBounds(branch.points, RIVER_BRANCH_QUERY_PADDING),
}))
const RIVER_BRANCH_BOUNDS_BY_ID = new Map(RIVER_BRANCH_BOUNDS.map(({ branch, bounds }) => [branch.id, bounds])) // 支流 id 到查询包围盒的索引；派生缓存，不直接调。
const NEWLAND_BRAIDED_QUERY_PADDING = 30 // 辫状河查询包围盒外扩；太小会漏边缘，太大会增加局部查询成本。
const NEWLAND_BRAIDED_BOUNDS = NEWLAND_BRAIDED_CHANNELS.map(channel => ({
  channel,
  bounds: makePathBounds(channel.points, NEWLAND_BRAIDED_QUERY_PADDING),
}))
const NEWLAND_BRAIDED_BOUNDS_BY_ID = new Map(NEWLAND_BRAIDED_BOUNDS.map(({ channel, bounds }) => [channel.id, bounds])) // 辫状河 id 到包围盒索引；派生缓存。
const NEWLAND_MOUNTAIN_OUTLET_BOUNDS = makePathBounds(NEWLAND_MOUNTAIN_OUTLET.points, 42) // 山中湖出水道查询包围盒；42 是外扩范围。
const GLOBAL_WET_GULLY_BOUNDS = GLOBAL_WET_GULLIES.map(gully => ({
  gully,
  bounds: makePathBounds(gully.points, Math.max(gully.halfWidthStart, gully.halfWidthEnd) + 22),
}))
const GLOBAL_WET_GULLY_BOUNDS_BY_ID = new Map(GLOBAL_WET_GULLY_BOUNDS.map(({ gully, bounds }) => [gully.id, bounds]))
const NEWLAND_DENDRITIC_GULLY_BOUNDS = NEWLAND_DENDRITIC_GULLIES.map(gully => ({
  gully,
  bounds: makePathBounds(gully.points, gully.influence + 8),
}))
// 以下 *BOUNDS 表都是由路径和 influence 派生的查询加速数据；改源路径/影响范围即可，不建议手改这些结果。
const EAST_RIM_DRY_RIVER_BOUNDS = EAST_RIM_DRY_RIVERS.map(river => ({
  river,
  bounds: makePathBounds(river.points, river.influence + 10),
}))
const EROSION_GULLY_BOUNDS = EROSION_GULLIES.map(gully => ({
  gully,
  bounds: makePathBounds(gully.points, gully.influence + 6),
}))
const EROSION_GULLY_BOUNDS_BY_ID = new Map(EROSION_GULLY_BOUNDS.map(({ gully, bounds }) => [gully.id, bounds]))
const LOWLAND_EROSION_GULLY_BOUNDS = LOWLAND_EROSION_GULLIES.map(gully => ({
  gully,
  bounds: makePathBounds(gully.points, gully.influence + 8),
}))
let _mineCaveUndergroundZones = []
// 路径长度元数据缓存（getPathMeta 用）。必须在 createForestGrovePlacements() 之前声明，
// 否则模块初始化时经 braided river 采样链调用 getPathMeta 会触发 TDZ（const 未初始化）。
const pathMetaCache = new WeakMap()
const FOREST_GROVE_PLACEMENTS = createForestGrovePlacements()
const CURVED_CLIFF_CONTROL_POINTS = [
  [82, 26],
  [59, 69],
  [-36, 75],
]
// 北侧弯曲峭壁控制点；点越远曲线越长，后续 createCurvedCliffRidgePoints 会生成实际山脊宽高。
const SOUTH_CURVED_CLIFF_CONTROL_POINTS = [
  [67, -79],
  [0, -100],
  [-42, -94],
]
// 南侧弯曲峭壁控制点；移动点会改变峭壁走向和对应地形塑形。
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

function grassDistantClusterRank(x, z, seed = 0) {
  const broad = valueNoise2(x * 0.040 + 13.1, z * 0.040 + 29.7)
  const pocket = valueNoise2(x * 0.155 + 4.6, z * 0.155 + 18.2)
  const speckle = forestPlacementNoise(seed + Math.floor(x * 17.0) * 31 + Math.floor(z * 17.0) * 47)
  return broad * 0.55 + pocket * 0.35 + speckle * 0.10
}

function grassHeightKeepRatio(groundY) {
  const t = THREE.MathUtils.smoothstep(groundY, GRASS_HEIGHT_FADE_START_Y, GRASS_HEIGHT_FADE_END_Y)
  return THREE.MathUtils.lerp(1, GRASS_HEIGHT_MIN_CLUSTER_COVERAGE, t)
}

function isInsideGrassHeightCluster(x, z, groundY) {
  const keepRatio = grassHeightKeepRatio(groundY)
  if (keepRatio >= 0.999) return true
  const coarse = valueNoise2(x * GRASS_HEIGHT_CLUSTER_SCALE + 71.3, z * GRASS_HEIGHT_CLUSTER_SCALE + 19.7)
  const secondary = valueNoise2(x * GRASS_HEIGHT_CLUSTER_SCALE * 2.15 + 9.4, z * GRASS_HEIGHT_CLUSTER_SCALE * 2.15 + 83.2)
  const edge = (secondary - 0.5) * GRASS_HEIGHT_CLUSTER_EDGE_SOFTNESS
  const cluster = THREE.MathUtils.clamp(coarse * 0.86 + secondary * 0.14 + edge, 0, 1)
  const threshold = THREE.MathUtils.clamp(1 - Math.sqrt(keepRatio) * 0.55, 0, 0.94)
  return cluster >= threshold
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
  return !isInsideGrassHeightCluster(x, z, getGroundHeight(x, z))
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
// 距离 LOD 管理的全局草 mesh group；渲染层不再按空间方块分片。
let _grassLodMeshes = []
let _grassLodTimer = 0
let _meadowGrassRuntime = null
let _debugGrassDensity = 1
let _debugModelGrassDisabled = false
let _debugWaterEffectsDisabled = false
let _debugTreeDensity = 1
let _debugTreeDensityVersion = 0
const GRASS_LOD_QUERY_CELL_SIZE = GRASS_LOD_HIDE_DIST // 草 LOD 查询网格边长；通常跟隐藏半径一致，改小会查更多格，改大可能多扫无关记录。
const GRASS_LOD_VISIBLE_CAPACITY = 18000 // 每个草 mesh 最大可写实例数；调大可显示更密但上传矩阵/GPU 实例更多，调小会提前截断草。
const MEADOW_GRASS_SCAN_BUDGET_MS = 3.0 // 每帧扫描候选草点预算；调大草会更快进入队列，但移动时 CPU 峰值更高。
const MEADOW_GRASS_QUEUE_BUDGET_MS = 5.5 // 每帧生成草记录预算；调大铺草更快，但 height/过滤/矩阵准备可能造成掉帧。
const MEADOW_GRASS_PRELOAD_DIST = 120 // 玩家周围预生成草半径；调大高速移动更不易露空，调小更省内存/CPU。
const MEADOW_GRASS_NEAR_PRIORITY_DIST = 45 // 脚下优先半径；调大更优先补近处草，远处补草会更慢。
const MEADOW_GRASS_ENQUEUE_MOVE_DIST = 8 // 玩家移动超过此距离才重排草生成队列；调小更跟手但频繁重扫，调大更省但可能跟不上。
const GRASS_LOD_PROFILE = false // 草 LOD 详细日志开关；true 会定期输出扫描/队列/矩阵统计，排查后应关掉。
const GRASS_LOD_PROFILE_REPORT_MS = 3000 // 草 LOD 日志间隔；调小日志更密，调大更安静。
let _grassLodProfileNextReport = 0

function createMeadowGrassWorkProfile() {
  return {
    gridChecks: 0,
    cacheHits: 0,
    cacheMisses: 0,
    xzRejected: 0,
    enqueued: 0,
    queuedSkipped: 0,
    processed: 0,
    heightSamples: 0,
    recordsAdded: 0,
    scanMs: 0,
    queueMs: 0,
  }
}

let _meadowGrassQueueProfile = createMeadowGrassWorkProfile()

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

function makeGrassLodMesh(name, geometry, material) {
  const inst = new THREE.InstancedMesh(geometry, material, GRASS_LOD_VISIBLE_CAPACITY)
  inst.name = name
  inst.castShadow = false
  inst.receiveShadow = false
  inst.frustumCulled = false
  inst.count = 0
  inst.visible = false
  return inst
}

function createGrassLodGroup(scene, name, geometries, material) {
  if (!scene || !geometries?.hi || !material) return null
  const hiMesh = makeGrassLodMesh(`${name}_hi`, geometries.hi, material)
  const loMesh = makeGrassLodMesh(`${name}_lo`, geometries.lo ?? geometries.hi, material)
  const group = {
    hiMesh,
    loMesh,
    records: [],
    grid: new Map(),
  }
  scene.add(hiMesh)
  scene.add(loMesh)
  _spawnGrassInstancedMeshes.push(hiMesh, loMesh)
  _grassLodMeshes.push(group)
  return group
}

function grassLodGridKey(cx, cz) {
  return `${cx}|${cz}`
}

function addGrassLodRecord(group, record) {
  if (!group || !record) return
  group.records.push(record)
  const cx = Math.floor(record.x / GRASS_LOD_QUERY_CELL_SIZE)
  const cz = Math.floor(record.z / GRASS_LOD_QUERY_CELL_SIZE)
  const key = grassLodGridKey(cx, cz)
  let cell = group.grid.get(key)
  if (!cell) { cell = []; group.grid.set(key, cell) }
  cell.push(record)
}

function appendGrassLodRecords(group, records) {
  for (let i = 0; i < records.length; i++) addGrassLodRecord(group, records[i])
}

function grassLodKeepRatio(dist) {
  if (dist < GRASS_LOD_REDUCE_START_DIST) return 1
  if (dist >= GRASS_LOD_HIDE_DIST) return 0
  const sparseT = THREE.MathUtils.smoothstep(dist, GRASS_LOD_REDUCE_START_DIST, GRASS_LOD_SPARSE_DIST)
  const hideT = THREE.MathUtils.smoothstep(dist, GRASS_LOD_SPARSE_DIST, GRASS_LOD_HIDE_DIST)
  return THREE.MathUtils.lerp(1, GRASS_LOD_FAR_KEEP_RATIO, sparseT) * (1 - hideT)
}

function meadowGrassGridKey(gx, gz) {
  return `${gx}|${gz}`
}

function readPerfNumber(name, fallback) {
  if (typeof window === 'undefined') return fallback
  const params = new URLSearchParams(window.location.search)
  const raw = params.get(name) ?? window.localStorage?.getItem(name)
  if (raw == null || raw === '') return fallback
  const value = Number(raw)
  return Number.isFinite(value) ? value : fallback
}

function getDebugGrassGenerationDensity() {
  return THREE.MathUtils.clamp(readPerfNumber('perfDebugGrassDensity', 1), 0, 2)
}

function getMeadowGrassSpacing() {
  const density = getDebugGrassGenerationDensity()
  return density > 1 ? MEADOW_GRASS_SPACING / Math.sqrt(density) : MEADOW_GRASS_SPACING
}

function getMeadowGrassCandidate(gx, gz) {
  const seed = 90000 + gx * 100003 + gz * 4099
  const spacing = getMeadowGrassSpacing()
  const jitter = spacing * MEADOW_GRASS_JITTER
  return {
    seed,
    x: (gx + 0.5) * spacing + (forestPlacementNoise(seed + 1) - 0.5) * jitter,
    z: (gz + 0.5) * spacing + (forestPlacementNoise(seed + 2) - 0.5) * jitter,
  }
}

function resetMeadowGrassPendingQueue(runtime) {
  if (!runtime || runtime.queueIndex >= runtime.queue.length) {
    if (runtime) {
      runtime.queue = []
      runtime.queueIndex = 0
      runtime.queued.clear()
    }
    return
  }
  for (let i = runtime.queueIndex; i < runtime.queue.length; i++) {
    runtime.queued.delete(runtime.queue[i].key)
  }
  runtime.queue = []
  runtime.queueIndex = 0
}

function updateMeadowGrassMotion(playerPosition, dt = 0, context = null) {
  const runtime = _meadowGrassRuntime
  if (!runtime || !playerPosition) return
  const px = playerPosition.x
  const pz = playerPosition.z
  let fx = Number(context?.grassForward?.x ?? context?.grassForwardX)
  let fz = Number(context?.grassForward?.z ?? context?.grassForwardZ)
  let forwardLenSq = Number.isFinite(fx) && Number.isFinite(fz) ? fx * fx + fz * fz : 0

  if (runtime.lastPlayerPos) {
    const dx = px - runtime.lastPlayerPos.x
    const dz = pz - runtime.lastPlayerPos.z
    const moveDistSq = dx * dx + dz * dz
    if (moveDistSq > 0.01) {
      fx = dx
      fz = dz
      forwardLenSq = moveDistSq
      runtime.playerSpeed = dt > 0 ? Math.sqrt(moveDistSq) / dt : 0
    } else {
      runtime.playerSpeed = 0
    }
  }

  if (forwardLenSq > 0.0001) {
    const invLen = 1 / Math.sqrt(forwardLenSq)
    runtime.forwardX = fx * invLen
    runtime.forwardZ = fz * invLen
  } else if (!Number.isFinite(runtime.forwardX) || !Number.isFinite(runtime.forwardZ)) {
    runtime.forwardX = 0
    runtime.forwardZ = -1
    runtime.playerSpeed = 0
  }
  runtime.lastPlayerPos = { x: px, z: pz }
}

function createMeadowGrassScanJob(px, pz, spacing, radius, forwardX, forwardZ) {
  return {
    px,
    pz,
    centerGX: Math.floor(px / spacing),
    centerGZ: Math.floor(pz / spacing),
    radiusSq: radius * radius,
    maxRing: Math.ceil(radius / spacing) + 2,
    ring: 0,
    ringPoints: null,
    ringIndex: 0,
    forwardX: Number.isFinite(forwardX) ? forwardX : 0,
    forwardZ: Number.isFinite(forwardZ) ? forwardZ : -1,
  }
}

function meadowGrassScanPriority(job, gx, gz) {
  const candidate = getMeadowGrassCandidate(gx, gz)
  const dx = candidate.x - job.px
  const dz = candidate.z - job.pz
  const distSq = dx * dx + dz * dz
  if (distSq >= job.radiusSq) return null
  if (distSq <= MEADOW_GRASS_NEAR_PRIORITY_DIST * MEADOW_GRASS_NEAR_PRIORITY_DIST) return distSq
  const forward = dx * job.forwardX + dz * job.forwardZ
  const side = Math.abs(dx * job.forwardZ - dz * job.forwardX)
  return -forward + side * 0.05
}

function buildMeadowGrassRingPoints(job, ring) {
  const points = []
  const push = (dx, dz) => {
    const gx = job.centerGX + dx
    const gz = job.centerGZ + dz
    const score = meadowGrassScanPriority(job, gx, gz)
    if (score === null) return
    points.push({ gx, gz, score })
  }

  if (ring === 0) {
    push(0, 0)
  } else {
    for (let dx = -ring; dx <= ring; dx++) {
      push(dx, -ring)
      push(dx, ring)
    }
    for (let dz = -ring + 1; dz <= ring - 1; dz++) {
      push(-ring, dz)
      push(ring, dz)
    }
  }
  points.sort((a, b) => a.score - b.score)
  return points
}

function makeGrassRenderRecord({
  x, y, z, seed = 0,
  rotY = forestPlacementNoise(seed + 3) * Math.PI * 2,
  tiltX = THREE.MathUtils.lerp(-0.16, 0.16, forestPlacementNoise(seed + 7)),
  tiltZ = THREE.MathUtils.lerp(-0.16, 0.16, forestPlacementNoise(seed + 8)),
  scaleX = THREE.MathUtils.lerp(1.0, 1.7, forestPlacementNoise(seed + 4)),
  scaleY = THREE.MathUtils.lerp(0.9, 1.45, forestPlacementNoise(seed + 5)),
  scaleZ = THREE.MathUtils.lerp(1.0, 1.7, forestPlacementNoise(seed + 6)),
}) {
  return {
    x, y, z, seed, rotY, tiltX, tiltZ,
    scaleX: scaleX * MODEL_GRASS_SPREAD_XZ,
    scaleY: scaleY * MODEL_GRASS_FLATTEN_Y,
    scaleZ: scaleZ * MODEL_GRASS_SPREAD_XZ,
    clusterRank: grassDistantClusterRank(x, z, seed),
  }
}

function createGrassLodProfile() {
  return {
    gridChecks: 0,
    cacheHits: 0,
    cacheMisses: 0,
    xzRejected: 0,
    heightSamples: 0,
    distanceRejected: 0,
    keepRejected: 0,
    clusterRejected: 0,
    recordsAdded: 0,
    enqueued: 0,
    queuedSkipped: 0,
    queueProcessed: 0,
    queuePending: 0,
    scanPending: 0,
    recordsVisited: 0,
    recordsDistanceRejected: 0,
    recordsKeepRejected: 0,
    recordsClusterRejected: 0,
    hiCandidates: 0,
    loCandidates: 0,
    matrixWrites: 0,
    generateMs: 0,
    queueMs: 0,
    matrixMs: 0,
    totalMs: 0,
  }
}

function logGrassLodProfile(profile) {
  if (!GRASS_LOD_PROFILE || !profile) return
  const now = performance.now()
  if (now < _grassLodProfileNextReport && profile.totalMs < 16) return
  _grassLodProfileNextReport = now + GRASS_LOD_PROFILE_REPORT_MS
  console.info(
    `[grass-profile] total=${profile.totalMs.toFixed(1)}ms `
    + `generate=${profile.generateMs.toFixed(1)}ms matrix=${profile.matrixMs.toFixed(1)}ms `
    + `grid=${profile.gridChecks} miss=${profile.cacheMisses} hit=${profile.cacheHits} `
    + `enq=${profile.enqueued} queuedSkip=${profile.queuedSkipped} queueProcessed=${profile.queueProcessed} queueMs=${profile.queueMs.toFixed(1)}ms pending=${profile.queuePending} scanPending=${profile.scanPending} `
    + `height=${profile.heightSamples} added=${profile.recordsAdded} `
    + `records=${profile.recordsVisited} hi=${profile.hiCandidates} lo=${profile.loCandidates} `
    + `writes=${profile.matrixWrites} reject={xz:${profile.xzRejected},dist:${profile.distanceRejected},keep:${profile.keepRejected},cluster:${profile.clusterRejected},`
    + `recordDist:${profile.recordsDistanceRejected},recordKeep:${profile.recordsKeepRejected},recordCluster:${profile.recordsClusterRejected}}`
  )
}

function enqueueLocalMeadowGrassRecords(playerPosition, profile = null) {
  const runtime = _meadowGrassRuntime
  if (!runtime || !playerPosition) return
  const t0 = profile ? performance.now() : 0
  const px = playerPosition.x
  const pz = playerPosition.z
  if (runtime.lastEnqueue) {
    const dx = px - runtime.lastEnqueue.x
    const dz = pz - runtime.lastEnqueue.z
    if (dx * dx + dz * dz < MEADOW_GRASS_ENQUEUE_MOVE_DIST * MEADOW_GRASS_ENQUEUE_MOVE_DIST) {
      if (profile) {
        profile.queuePending = Math.max(0, runtime.queue.length - runtime.queueIndex)
        profile.scanPending = runtime.scanJob ? 1 : 0
        profile.generateMs = performance.now() - t0
      }
      return
    }
  }
  runtime.lastEnqueue = { x: px, z: pz }
  const spacing = getMeadowGrassSpacing()
  resetMeadowGrassPendingQueue(runtime)
  runtime.scanJob = createMeadowGrassScanJob(
    px,
    pz,
    spacing,
    MEADOW_GRASS_PRELOAD_DIST,
    runtime.forwardX,
    runtime.forwardZ,
  )
  if (profile) {
    profile.queuePending = Math.max(0, runtime.queue.length - runtime.queueIndex)
    profile.scanPending = 1
    profile.generateMs = performance.now() - t0
  }
}

function processMeadowGrassScanQueue(budgetMs = MEADOW_GRASS_SCAN_BUDGET_MS, profile = null) {
  const runtime = _meadowGrassRuntime
  const job = runtime?.scanJob
  if (!runtime || !job) return
  const t0 = performance.now()
  let gridChecks = 0
  let cacheHits = 0
  let cacheMisses = 0
  let xzRejected = 0
  let enqueued = 0
  let queuedSkipped = 0

  while (job.ring <= job.maxRing) {
    if (gridChecks > 0 && performance.now() - t0 >= budgetMs) break
    if (!job.ringPoints || job.ringIndex >= job.ringPoints.length) {
      job.ringPoints = buildMeadowGrassRingPoints(job, job.ring)
      job.ringIndex = 0
      job.ring++
      if (!job.ringPoints.length) continue
    }
    const item = job.ringPoints[job.ringIndex++]
    const gx = item.gx
    const gz = item.gz

    gridChecks++
    const key = meadowGrassGridKey(gx, gz)
    if (runtime.cache.has(key)) {
      cacheHits++
      continue
    }
    if (runtime.queued.has(key)) {
      queuedSkipped++
      continue
    }
    cacheMisses++
    const candidate = getMeadowGrassCandidate(gx, gz)
    const dx = candidate.x - job.px
    const dz = candidate.z - job.pz
    const distXZSq = dx * dx + dz * dz
    if (distXZSq >= job.radiusSq) {
      xzRejected++
      continue
    }
    runtime.queued.add(key)
    runtime.queue.push({ key, gx, gz })
    enqueued++
  }

  if (job.ring > job.maxRing && (!job.ringPoints || job.ringIndex >= job.ringPoints.length)) runtime.scanJob = null

  const elapsed = performance.now() - t0
  if (GRASS_LOD_PROFILE) {
    _meadowGrassQueueProfile.gridChecks += gridChecks
    _meadowGrassQueueProfile.cacheHits += cacheHits
    _meadowGrassQueueProfile.cacheMisses += cacheMisses
    _meadowGrassQueueProfile.xzRejected += xzRejected
    _meadowGrassQueueProfile.enqueued += enqueued
    _meadowGrassQueueProfile.queuedSkipped += queuedSkipped
    _meadowGrassQueueProfile.scanMs += elapsed
  }
  if (profile) {
    profile.gridChecks += gridChecks
    profile.cacheHits += cacheHits
    profile.cacheMisses += cacheMisses
    profile.xzRejected += xzRejected
    profile.enqueued += enqueued
    profile.queuedSkipped += queuedSkipped
    profile.generateMs += elapsed
    profile.queuePending = Math.max(0, runtime.queue.length - runtime.queueIndex)
    profile.scanPending = runtime.scanJob ? 1 : 0
  }
}

function processMeadowGrassQueue(budgetMs = MEADOW_GRASS_QUEUE_BUDGET_MS, profile = null) {
  const runtime = _meadowGrassRuntime
  processMeadowGrassScanQueue(MEADOW_GRASS_SCAN_BUDGET_MS, profile)
  if (!runtime || !runtime.queue.length) return
  const t0 = performance.now()
  let processed = 0
  let heightSamples = 0
  let recordsAdded = 0

  while (runtime.queueIndex < runtime.queue.length) {
    if (processed > 0 && performance.now() - t0 >= budgetMs) break
    const item = runtime.queue[runtime.queueIndex++]
    runtime.queued.delete(item.key)
    if (runtime.cache.has(item.key)) continue

    let record = null
    const candidate = getMeadowGrassCandidate(item.gx, item.gz)
    if (!(candidate.x < GRASS_FIELD_BOUNDS.minX || candidate.x > GRASS_FIELD_BOUNDS.maxX || candidate.z < GRASS_FIELD_BOUNDS.minZ || candidate.z > GRASS_FIELD_BOUNDS.maxZ)) {
      heightSamples++
      const groundY = getGroundHeight(candidate.x, candidate.z)
      if (isGlobalModelGrassLand(candidate.x, candidate.z, groundY)) {
        const freshWeight = THREE.MathUtils.lerp(0.85, 0.4, THREE.MathUtils.smoothstep(groundY, 1, 7.5))
        const variantIndex = grassClusterVariant(candidate.x, candidate.z, candidate.seed, freshWeight)
        record = makeGrassRenderRecord({
          ...candidate,
          y: groundY + LOCAL_MODEL_GRASS_Y_OFFSET,
        })
        addGrassLodRecord(runtime.groups[variantIndex], record)
        runtime.total++
        recordsAdded++
      }
    }
    runtime.cache.set(item.key, record)
    processed++
  }

  if (runtime.queueIndex > 8192 && runtime.queueIndex * 2 > runtime.queue.length) {
    runtime.queue = runtime.queue.slice(runtime.queueIndex)
    runtime.queueIndex = 0
  }

  const elapsed = performance.now() - t0
  if (GRASS_LOD_PROFILE) {
    _meadowGrassQueueProfile.processed += processed
    _meadowGrassQueueProfile.heightSamples += heightSamples
    _meadowGrassQueueProfile.recordsAdded += recordsAdded
    _meadowGrassQueueProfile.queueMs += elapsed
  }
  if (profile) {
    profile.queueProcessed += processed
    profile.heightSamples += heightSamples
    profile.recordsAdded += recordsAdded
    profile.queueMs += elapsed
    profile.queuePending = Math.max(0, runtime.queue.length - runtime.queueIndex)
  }
}

function writeGrassRecordMatrix(inst, index, record) {
  _spawnGrassDummy.position.set(record.x, record.y, record.z)
  _spawnGrassDummy.rotation.set(record.tiltX, record.rotY, record.tiltZ)
  _spawnGrassDummy.scale.set(record.scaleX, record.scaleY, record.scaleZ)
  _spawnGrassDummy.updateMatrix()
  inst.setMatrixAt(index, _spawnGrassDummy.matrix)
}

function applyGrassCandidates(inst, candidates, profile = null) {
  const t0 = profile ? performance.now() : 0
  const count = _debugModelGrassDisabled ? 0 : Math.min(candidates.length, GRASS_LOD_VISIBLE_CAPACITY)
  if (candidates.length > GRASS_LOD_VISIBLE_CAPACITY) {
    candidates.sort((a, b) => a._lodDistSq - b._lodDistSq)
  }
  for (let i = 0; i < count; i++) writeGrassRecordMatrix(inst, i, candidates[i])
  if (profile) {
    profile.matrixWrites += count
    profile.matrixMs += performance.now() - t0
  }
  inst.count = count
  inst.visible = count > 0
  if (count > 0) inst.instanceMatrix.needsUpdate = true
}

// 按实例到玩家距离刷新全局草 mesh，避免整块方形区域同步显隐。
function updateGrassLod(playerPosition) {
  if (!playerPosition) return
  if (_debugModelGrassDisabled) {
    hideAllModelGrass()
    return
  }
  const profile = GRASS_LOD_PROFILE ? createGrassLodProfile() : null
  const t0 = profile ? performance.now() : 0
  enqueueLocalMeadowGrassRecords(playerPosition, profile)
  if (profile) {
    profile.gridChecks += _meadowGrassQueueProfile.gridChecks
    profile.cacheHits += _meadowGrassQueueProfile.cacheHits
    profile.cacheMisses += _meadowGrassQueueProfile.cacheMisses
    profile.xzRejected += _meadowGrassQueueProfile.xzRejected
    profile.enqueued += _meadowGrassQueueProfile.enqueued
    profile.queuedSkipped += _meadowGrassQueueProfile.queuedSkipped
    profile.queueProcessed += _meadowGrassQueueProfile.processed
    profile.heightSamples += _meadowGrassQueueProfile.heightSamples
    profile.recordsAdded += _meadowGrassQueueProfile.recordsAdded
    profile.generateMs += _meadowGrassQueueProfile.scanMs
    profile.queueMs += _meadowGrassQueueProfile.queueMs
    profile.queuePending = Math.max(profile.queuePending, _meadowGrassRuntime ? _meadowGrassRuntime.queue.length - _meadowGrassRuntime.queueIndex : 0)
    profile.scanPending = _meadowGrassRuntime?.scanJob ? 1 : 0
    _meadowGrassQueueProfile = createMeadowGrassWorkProfile()
  }
  if (!_grassLodMeshes.length) return
  const px = playerPosition.x
  const py = playerPosition.y ?? getGroundHeight(px, playerPosition.z)
  const pz = playerPosition.z
  const nearSq = GRASS_LOD_NEAR_DIST * GRASS_LOD_NEAR_DIST
  const minCX = Math.floor((px - GRASS_LOD_HIDE_DIST) / GRASS_LOD_QUERY_CELL_SIZE)
  const maxCX = Math.floor((px + GRASS_LOD_HIDE_DIST) / GRASS_LOD_QUERY_CELL_SIZE)
  const minCZ = Math.floor((pz - GRASS_LOD_HIDE_DIST) / GRASS_LOD_QUERY_CELL_SIZE)
  const maxCZ = Math.floor((pz + GRASS_LOD_HIDE_DIST) / GRASS_LOD_QUERY_CELL_SIZE)

  for (let i = 0; i < _grassLodMeshes.length; i++) {
    const group = _grassLodMeshes[i]
    const hiCandidates = []
    const loCandidates = []

    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cz = minCZ; cz <= maxCZ; cz++) {
        const cell = group.grid.get(grassLodGridKey(cx, cz))
        if (!cell) continue
        for (let j = 0; j < cell.length; j++) {
          const record = cell[j]
          if (profile) profile.recordsVisited++
          const dx = record.x - px
          const dy = record.y - py
          const dz = record.z - pz
          const distSq = dx * dx + dy * dy + dz * dz
          if (distSq >= GRASS_LOD_HIDE_DIST * GRASS_LOD_HIDE_DIST) {
            if (profile) profile.recordsDistanceRejected++
            continue
          }
          const dist = Math.sqrt(distSq)
          const keepRatio = grassLodKeepRatio(dist)
          if (keepRatio <= 0) {
            if (profile) profile.recordsKeepRejected++
            continue
          }
          if (_debugGrassDensity <= 0 || record.clusterRank < 1 - _debugGrassDensity) {
            if (profile) profile.recordsClusterRejected++
            continue
          }
          if (keepRatio < 1 && record.clusterRank < 1 - keepRatio) {
            if (profile) profile.recordsClusterRejected++
            continue
          }
          record._lodDistSq = distSq
          if (distSq < nearSq) {
            hiCandidates.push(record)
            if (profile) profile.hiCandidates++
          } else {
            loCandidates.push(record)
            if (profile) profile.loCandidates++
          }
        }
      }
    }

    applyGrassCandidates(group.hiMesh, hiCandidates, profile)
    applyGrassCandidates(group.loMesh, loCandidates, profile)
  }
  if (profile) {
    profile.totalMs = performance.now() - t0
    logGrassLodProfile(profile)
  }
}

function hideAllModelGrass() {
  for (let i = 0; i < _grassLodMeshes.length; i++) {
    const group = _grassLodMeshes[i]
    group.hiMesh.count = 0
    group.hiMesh.visible = false
    group.loMesh.count = 0
    group.loMesh.visible = false
  }
  const b = _worldTreeBuild
  if (!b) return
  for (const c of b.cellMeshes) {
    for (const m of c.meshes) {
      if (m.userData.treeLodRole !== 'grass') continue
      m.count = 0
      m.visible = false
    }
  }
}

function configureSpawnGrassMaterial(material) {
  material.side = THREE.DoubleSide
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 }
    shader.uniforms.uGrassWindEnabled = { value: isPerfFlagEnabled('perfNoGrassWind') ? 0 : 1 }
    _spawnGrassWindUniforms.push(shader.uniforms.uTime)
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uTime;
uniform float uGrassWindEnabled;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
#ifdef USE_INSTANCING
if (uGrassWindEnabled > 0.5) {
  float grassHeightMask = smoothstep(0.08, 0.82, position.y);
  float grassPhase = instanceMatrix[3].x * 1.37 + instanceMatrix[3].z * 2.11;
  float grassWave = sin(uTime * 1.25 + grassPhase + position.y * 3.4) * 0.028;
  grassWave += sin(uTime * 2.05 + grassPhase * 1.7 + position.y * 5.1) * 0.012;
  transformed.x += grassWave * grassHeightMask;
  transformed.z += cos(uTime * 1.1 + grassPhase * 1.3 + position.y * 2.8) * 0.018 * grassHeightMask;
}
#endif`
      )
  }
  material.customProgramCacheKey = () => 'spawn-grass-wind-toggle-v1'
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

function shouldSkipGlobalModelGrassPlacement(x, z, groundY = getGroundHeight(x, z)) {
  if (!isInsideOutdoorMountainBounds(x, z, 0)) return true
  if (isNearGrassCampfire(x, z, GRASS_CAMPFIRE_CLEAR_RADIUS + GROUND_DEBRIS_CLEAR_PADDING)) return true
  if (!isInsideGrassHeightCluster(x, z, groundY)) return true
  return false
}

function isGlobalModelGrassWaterSurface(x, z, groundY) {
  const channel = sampleChannelNetwork(x, z)
  if (channel && channel.distance <= channel.halfWidth) {
    const waterY = channelNetworkWaterYAt(x, z, getGroundHeight)
    if (waterY !== null && waterY > groundY + 0.025) return true
  }

  const { weight: poolW, pool } = confluencePoolWeightAt(x, z)
  if (poolW > 0 && confluencePoolSurfaceY(pool) > groundY + 0.025) return true

  const lake = sampleNewlandStaticLake(x, z, getGroundHeight)
  return Boolean(lake?.inWater)
}

function isInsideRiverSteepBank(sample, run) {
  if (!sample) return false
  return sample.distance > sample.halfWidth
    && sample.distance <= sample.halfWidth + run + RIVERSIDE_GRASS_SLOPE_MARGIN
}

function isGlobalModelGrassRiverBank(x, z) {
  const main = getRiverSampleAt(x, z)
  if (isInsideRiverSteepBank(main, Math.max(0.35, channelBankRun(MAIN_RIVER_CHANNEL_CUT, MAIN_RIVER_CHANNEL_SLOPE_DEG)))) return true

  const branch = getBestBranchSampleAt(x, z)
  if (isInsideRiverSteepBank(branch, Math.max(0.35, channelBankRun(RIVER_CHANNEL_MIN_CUT, RIVER_CHANNEL_MIN_SLOPE_DEG)))) return true

  const gully = getBestWetGullyStreamSampleAt(x, z)
  if (isInsideRiverSteepBank(gully, Math.max(0.35, channelBankRun(RIVER_CHANNEL_MIN_CUT, RIVER_CHANNEL_MIN_SLOPE_DEG)))) return true

  const braided = getBestNewlandBraidedSampleAt(x, z)
  const braidedRun = braided
    ? Math.max(0.35, channelBankRun(braided.channel.cutDepth, NEWLAND_BRAIDED_SLOPE_DEG))
    : 0
  return isInsideRiverSteepBank(braided, braidedRun)
}

function isGlobalModelGrassLand(x, z, groundY = getGroundHeight(x, z)) {
  if (shouldSkipGlobalModelGrassPlacement(x, z, groundY)) return false
  if (isGlobalModelGrassRiverBank(x, z)) return false
  if (!allowsDryGullyModelGrass(x, z)) return false
  return !isGlobalModelGrassWaterSurface(x, z, groundY)
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
// 弯曲峭壁山脊；name 只用于识别，points 由控制点生成，[x,z,width,height] 控制峭壁体量。

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

function getSouthBasinLakeRingPoint(angleDeg, radius) {
  const angle = THREE.MathUtils.degToRad(angleDeg)
  const boundary = newlandStaticLakeBoundaryScale(SOUTH_BASIN_LAKE, angle)
  const localRadius = radius * boundary
  const localX = Math.cos(angle) * localRadius
  const localZ = Math.sin(angle) * localRadius
  const cos = Math.cos(SOUTH_BASIN_LAKE.rot)
  const sin = Math.sin(SOUTH_BASIN_LAKE.rot)
  return {
    x: SOUTH_BASIN_LAKE.x + localX * cos - localZ * sin,
    z: SOUTH_BASIN_LAKE.z + localX * sin + localZ * cos,
  }
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

function pickModelTreeType(types, seed, fallbackIndex) {
  if (!types.length) return null
  const fallback = types[((fallbackIndex % types.length) + types.length) % types.length]
  const green = types.filter((type) => MODEL_TREE_GREEN_FILE_SET.has(type.file))
  const yellow = types.filter((type) => MODEL_TREE_YELLOW_FILE_SET.has(type.file))
  if (!green.length && !yellow.length) return fallback

  const useYellow = yellow.length && (!green.length || forestPlacementNoise(seed) < MODEL_TREE_YELLOW_RATIO)
  const pool = useYellow ? yellow : (green.length ? green : yellow)
  const index = Math.floor(forestPlacementNoise(seed + 1) * pool.length) % pool.length
  return pool[index] || fallback
}

function pickModelTreeIndex(types, seed, fallbackIndex) {
  const type = pickModelTreeType(types, seed, fallbackIndex)
  const index = types.indexOf(type)
  return index >= 0 ? index : 0
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
    const type = pickModelTreeType(types, seedOffset + i * 3 + 20, i)
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
    const type = pickModelTreeType(types, seedOffset + i * 5 + 20, i)
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
    const type = pickModelTreeType(types, seedOffset + i * 5 + 20, i)
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

    const type = pickModelTreeType(FOREST_GROVE_TREE_TYPES, seed + 12, attempt)
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
    const type = pickModelTreeType(types, seedOffset + i * 7 + 20, i)
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

function createNewlandBraidedRiverForestPlacements() {
  const placements = []

  const pushPlacement = (placement, minSpacing) => {
    if (isInsideNewlandStaticLakeClearance(placement.dx, placement.dz)) return
    const best = getBestNewlandBraidedSampleAt(placement.dx, placement.dz)
    if (best && best.edge < 7) return
    if (isTooCloseToForestPlacement(placements, placement.dx, placement.dz, minSpacing)) return
    placements.push(placement)
  }

  NEWLAND_BRAIDED_CHANNELS.forEach((channel, channelIndex) => {
    const total = riverPathTotalLength(channel.points)
    const stationCount = Math.max(3, Math.round(total / 30))
    const run = Math.max(0.35, channelBankRun(channel.cutDepth, NEWLAND_BRAIDED_SLOPE_DEG))

    for (let i = 0; i <= stationCount; i++) {
      const t = stationCount === 0 ? 0.5 : i / stationCount
      const sample = pointAlongPathAtT(channel.points, t)
      const halfWidth = newlandBraidedHalfWidthAt(channel, t)
      const rightX = -sample.dirZ
      const rightZ = sample.dirX

      for (const side of [-1, 1]) {
        const seed = 82000 + channelIndex * 3007 + i * 97 + (side > 0 ? 41 : 0)
        const sideDistance = halfWidth + run + THREE.MathUtils.lerp(10, 34, forestPlacementNoise(seed + 1))
        const along = (forestPlacementNoise(seed + 2) - 0.5) * 12
        const x = sample.x + sample.dirX * along + rightX * side * sideDistance
        const z = sample.z + sample.dirZ * along + rightZ * side * sideDistance
        const rotY = forestPlacementNoise(seed + 3) * Math.PI * 2

        if (forestPlacementNoise(seed + 4) < 0.72) {
          const type = pickModelTreeType(FOREST_GROVE_TREE_TYPES, seed + 14, channelIndex + i + (side > 0 ? 1 : 0))
          const scaleNoise = THREE.MathUtils.lerp(0.82, 1.18, forestPlacementNoise(seed + 5))
          pushPlacement({
            file: type.file,
            origin: { x: 0, z: 0 },
            dx: Number(x.toFixed(2)),
            dz: Number(z.toFixed(2)),
            rotY: Number(rotY.toFixed(3)),
            scale: Number((type.scale * scaleNoise).toFixed(3)),
            r: Number((type.r * scaleNoise * FOREST_TREE_COLLIDER_SCALE).toFixed(2)),
          }, 11)
        }

        if (forestPlacementNoise(seed + 6) < 0.62) {
          const type = FOREST_GROVE_SHRUB_TYPES[(channelIndex + i + 2) % FOREST_GROVE_SHRUB_TYPES.length]
          const shrubSide = sideDistance - THREE.MathUtils.lerp(3, 10, forestPlacementNoise(seed + 7))
          const sx = sample.x + sample.dirX * (along * 0.65) + rightX * side * shrubSide
          const sz = sample.z + sample.dirZ * (along * 0.65) + rightZ * side * shrubSide
          pushPlacement({
            file: type.file,
            origin: { x: 0, z: 0 },
            dx: Number(sx.toFixed(2)),
            dz: Number(sz.toFixed(2)),
            rotY: Number((forestPlacementNoise(seed + 8) * Math.PI * 2).toFixed(3)),
            scale: Number((type.scale * THREE.MathUtils.lerp(0.78, 1.14, forestPlacementNoise(seed + 9))).toFixed(3)),
          }, 8)
        }

        if (forestPlacementNoise(seed + 10) < 0.16) {
          const type = FOREST_GROVE_ROCK_TYPES[(channelIndex + i) % FOREST_GROVE_ROCK_TYPES.length]
          const rockSide = halfWidth + run + THREE.MathUtils.lerp(4, 13, forestPlacementNoise(seed + 11))
          const rx = sample.x + sample.dirX * (along * 0.45) + rightX * side * rockSide
          const rz = sample.z + sample.dirZ * (along * 0.45) + rightZ * side * rockSide
          const scaleNoise = THREE.MathUtils.lerp(0.78, 1.2, forestPlacementNoise(seed + 12))
          pushPlacement({
            file: type.file,
            origin: { x: 0, z: 0 },
            dx: Number(rx.toFixed(2)),
            dz: Number(rz.toFixed(2)),
            rotY: Number((forestPlacementNoise(seed + 13) * Math.PI * 2).toFixed(3)),
            scale: Number((type.scale * scaleNoise).toFixed(3)),
            r: Number((type.r * scaleNoise * FOREST_ROCK_COLLIDER_SCALE).toFixed(2)),
          }, 7)
        }
      }
    }
  })

  return placements
}

function createBottomLakeForestPlacements(existingPlacements = []) {
  const placements = []
  const targetX = 41.6
  const targetZ = -277.5
  const baseAngle = Math.atan2(targetZ - BOTTOM_DEPRESSION_LAKE.z, targetX - BOTTOM_DEPRESSION_LAKE.x)
  const arc = THREE.MathUtils.degToRad(38)
  const maxAttempts = 90

  for (let attempt = 0; placements.length < 20 && attempt < maxAttempts; attempt++) {
    const seed = 96000 + attempt * 113
    const t = (attempt * 0.61803398875 + forestPlacementNoise(seed + 1) * 0.18) % 1
    const angle = baseAngle - arc * 0.5 + arc * t + THREE.MathUtils.lerp(-0.055, 0.055, forestPlacementNoise(seed + 2))
    const lakeRadius = (BOTTOM_DEPRESSION_LAKE.rx + BOTTOM_DEPRESSION_LAKE.rz) * 0.5
    const radius = lakeRadius + THREE.MathUtils.lerp(29, 49, forestPlacementNoise(seed + 3))
    const x = BOTTOM_DEPRESSION_LAKE.x + Math.cos(angle) * radius + THREE.MathUtils.lerp(-3.5, 3.5, forestPlacementNoise(seed + 4))
    const z = BOTTOM_DEPRESSION_LAKE.z + Math.sin(angle) * radius + THREE.MathUtils.lerp(-3.5, 3.5, forestPlacementNoise(seed + 5))
    if (!isInsideOutdoorMountainBounds(x, z, 0)) continue
    if (isInsideNewlandStaticLakeClearance(x, z)) continue
    if (isTooCloseToForestPlacement(existingPlacements, x, z, 9)) continue
    if (isTooCloseToForestPlacement(placements, x, z, 8.5)) continue

    const type = pickModelTreeType(FOREST_GROVE_TREE_TYPES, seed + 12, attempt)
    const scaleNoise = THREE.MathUtils.lerp(0.86, 1.18, forestPlacementNoise(seed + 6))
    placements.push({
      file: type.file,
      origin: { x: 0, z: 0 },
      dx: Number(x.toFixed(2)),
      dz: Number(z.toFixed(2)),
      rotY: Number((forestPlacementNoise(seed + 7) * Math.PI * 2).toFixed(3)),
      scale: Number((type.scale * scaleNoise).toFixed(3)),
      r: Number((type.r * scaleNoise * FOREST_TREE_COLLIDER_SCALE).toFixed(2)),
    })
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
  const newlandBraidedRiverForestPlacements = createNewlandBraidedRiverForestPlacements()

  const initialExistingPlacements = [
    ...castleLanePlacements,
    ...secondGrovePlacements,
    ...thirdGrovePlacements,
    ...lineGrovePlacements,
    ...northGrovePlacements,
    ...castleNorthHighlandPlacements,
    ...riverForestPlacements,
    ...newlandBraidedRiverForestPlacements,
  ]
  const bottomLakeForestPlacements = createBottomLakeForestPlacements(initialExistingPlacements)
  const existingPlacements = [
    ...initialExistingPlacements,
    ...bottomLakeForestPlacements,
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
  const rockMap = _roadTextureLoader.load(MOUNTAIN_ROCK_TEXTURE_URL)
  rockMap.wrapS = rockMap.wrapT = THREE.RepeatWrapping
  rockMap.anisotropy = 8
  rockMap.colorSpace = THREE.SRGBColorSpace
  const material = new THREE.MeshStandardMaterial({
    color: 0x9ca2a2,
    map: rockMap,
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

      vec2 snowCliffWarpUv(vec2 uv, vec2 scale) {
        float warpA = snowCliffNoise(uv * 0.36 + vec2(9.4, 3.8));
        float warpB = snowCliffNoise(uv.yx * 0.29 + vec2(2.2, 14.1));
        return uv + vec2(warpA - 0.5, warpB - 0.5) * (0.58 / max(max(scale.x, scale.y), 0.0001));
      }
    ` + shader.fragmentShader.replace(
      '#include <map_fragment>',
      `
      float slope = 1.0 - clamp(dot(normalize(vSnowWorldNormal), vec3(0.0, 1.0, 0.0)), 0.0, 1.0);
      float broad = snowCliffNoise(vSnowWorldPos.xz * 0.018 + vec2(4.1, 8.7));
      float fine = snowCliffNoise(vSnowWorldPos.xz * 0.17 + vec2(2.9, 13.4));
      vec2 cliffScale = vec2(0.030, 0.018);
      vec3 cliffTex = texture2D(map, snowCliffWarpUv(vSnowWorldPos.xy, cliffScale) * cliffScale).rgb;
      vec3 cliffTexSide = texture2D(map, snowCliffWarpUv(vSnowWorldPos.zy, cliffScale) * cliffScale + vec2(0.23, 0.11)).rgb;
      float xFacing = abs(normalize(vSnowWorldNormal).x);
      cliffTex = mix(cliffTex, cliffTexSide, xFacing);
      vec3 coldRock = mix(vec3(0.42, 0.45, 0.47), cliffTex * vec3(0.88, 0.93, 0.98), 0.78);
      coldRock = mix(coldRock, vec3(0.62, 0.65, 0.66), broad * 0.20);
      coldRock = mix(coldRock, vec3(0.30, 0.35, 0.39), smoothstep(0.40, 0.92, slope) * 0.45);
      coldRock *= vec3(0.84, 0.92, 1.0) * (0.92 + fine * 0.10);
      float settledSnow = smoothstep(42.0, 116.0, vSnowWorldPos.y) * (1.0 - smoothstep(0.14, 0.56, slope));
      float streakBreak = snowCliffNoise((vSnowWorldPos.xz + vec2(vSnowWorldPos.y * 0.42, -vSnowWorldPos.y * 0.25)) * 0.076);
      float streakSnow = smoothstep(64.0, 148.0, vSnowWorldPos.y)
        * smoothstep(0.54, 0.86, broad * 0.44 + fine * 0.20 + streakBreak * 0.36)
        * (1.0 - smoothstep(0.54, 0.86, slope));
      float summitSnow = smoothstep(128.0, 184.0, vSnowWorldPos.y) * 0.86;
      float snow = clamp(max(settledSnow, streakSnow) + summitSnow, 0.0, 1.0);
      vec3 snowColor = vec3(0.92, 0.96, 0.98) * (0.96 + fine * 0.06);
      diffuseColor *= vec4(mix(coldRock, snowColor, snow), 1.0);
      `
    )
  }
  material.customProgramCacheKey = () => 'snow-mountain-cliff-v3-stripe-fix'
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
  if (!VEGETATION_NAME_RE.test(name)) return
  material.alphaTest = Math.max(material.alphaTest ?? 0, 0.35)
  material.transparent = false
  material.depthWrite = true
  material.depthTest = true
  material.needsUpdate = true
}

// ── GLB 树调色：共享 uniform + onBeforeCompile 注入 ──
// 所有树材质共享同一组 uniform，运行时改 .value 即可全量生效（见 setTreeColorGrade）。
const _treeGradeUniforms = {
  uTreeSat:                      { value: TREE_COLOR_GRADE.saturation },
  uTreeBright:                   { value: TREE_COLOR_GRADE.brightness },
  uTreeHue:                      { value: TREE_COLOR_GRADE.hueShift },
  uTreeLeafDarkLift:             { value: TREE_LIGHT_GRADE.leafDarkLift },
  uTreeLeafMinLuma:              { value: TREE_LIGHT_GRADE.leafMinLuma },
  uTreeSnowContrastCompensation: { value: TREE_LIGHT_GRADE.snowContrastCompensation },
}

const VEGETATION_NAME_RE = /(tree|branch|leaf|leaves|background)/i
const FOREST_PACK_TREE_RE = /^(tree_|background_tree_)/i
const FOREST_PACK_LEAF_RE = /(leaf|leaves|crown|background)/i
// 以上命名规则用于识别植被/树包/树叶 mesh；放宽会影响更多材质，收紧可能漏掉树叶 LOD。
const _forestPackLeafFadeTargets = []

function getForestPackTreeLeafKeep(dist) {
  const t = THREE.MathUtils.smoothstep(dist, WORLD_TREE_LEAF_FULL_DIST, WORLD_TREE_LEAF_SPARSE_DIST)
  return THREE.MathUtils.lerp(1, WORLD_TREE_LEAF_MIN_KEEP, t)
}

function setForestPackLeafKeep(material, keep) {
  const uniform = material?.userData?.__treeLeafKeepUniform
  if (uniform) uniform.value = keep
}

function getWorldTreeInstanceCount(fullCount, dist) {
  if (dist < WORLD_TREE_INSTANCE_FULL_DIST) return fullCount
  return Math.max(1, Math.ceil(fullCount * WORLD_TREE_INSTANCE_FAR_KEEP))
}

function worldTreeInstanceRank(seed) {
  return forestPlacementNoise(seed + 97)
}

function resetTreeMaterialRuntimeData(material) {
  if (!material?.userData) return
  delete material.userData.__treeGraded
  delete material.userData.__treeLeafKeepUniform
  delete material.userData.__treeLeafFadeEnabledUniform
  delete material.userData.__treeLeafLightEnabledUniform
}

// 给单个树材质注入调色片元钩子（贴图采样后做 色相旋转→饱和度→明度）。幂等。
function applyTreeColorGrade(material, { leafFade = false, leafLight = false } = {}) {
  if (!material) return
  material.userData = material.userData || {}
  if (material.userData.__treeGraded) {
    const fadeEnabled = material.userData.__treeLeafFadeEnabledUniform
    const lightEnabled = material.userData.__treeLeafLightEnabledUniform
    if (leafFade && fadeEnabled) fadeEnabled.value = 1
    if (leafLight && lightEnabled) lightEnabled.value = 1
    return
  }
  material.userData.__treeGraded = true
  material.userData.__treeLeafKeepUniform = { value: 1 }
  material.userData.__treeLeafFadeEnabledUniform = { value: leafFade ? 1 : 0 }
  material.userData.__treeLeafLightEnabledUniform = { value: leafLight ? 1 : 0 }
  const prevOnBeforeCompile = material.onBeforeCompile
  material.onBeforeCompile = (shader, renderer) => {
    if (typeof prevOnBeforeCompile === 'function') prevOnBeforeCompile(shader, renderer)
    shader.uniforms.uTreeSat = _treeGradeUniforms.uTreeSat
    shader.uniforms.uTreeBright = _treeGradeUniforms.uTreeBright
    shader.uniforms.uTreeHue = _treeGradeUniforms.uTreeHue
    shader.uniforms.uTreeLeafDarkLift = _treeGradeUniforms.uTreeLeafDarkLift
    shader.uniforms.uTreeLeafMinLuma = _treeGradeUniforms.uTreeLeafMinLuma
    shader.uniforms.uTreeSnowContrastCompensation = _treeGradeUniforms.uTreeSnowContrastCompensation
    shader.uniforms.uTreeLeafKeep = material.userData.__treeLeafKeepUniform
    shader.uniforms.uTreeLeafFadeEnabled = material.userData.__treeLeafFadeEnabledUniform
    shader.uniforms.uTreeLeafLightEnabled = material.userData.__treeLeafLightEnabledUniform
    shader.vertexShader = `
      varying vec3 vTreeWorldPosition;
    ` + shader.vertexShader.replace(
      '#include <project_vertex>',
      `#include <project_vertex>
      {
        vec4 treeWorldPosition = vec4(transformed, 1.0);
        #ifdef USE_BATCHING
          treeWorldPosition = batchingMatrix * treeWorldPosition;
        #endif
        #ifdef USE_INSTANCING
          treeWorldPosition = instanceMatrix * treeWorldPosition;
        #endif
        treeWorldPosition = modelMatrix * treeWorldPosition;
        vTreeWorldPosition = treeWorldPosition.xyz;
      }
      `
    )
    shader.fragmentShader = `
      uniform float uTreeSat;
      uniform float uTreeBright;
      uniform float uTreeHue;
      uniform float uTreeLeafDarkLift;
      uniform float uTreeLeafMinLuma;
      uniform float uTreeSnowContrastCompensation;
      uniform float uTreeLeafKeep;
      uniform float uTreeLeafFadeEnabled;
      uniform float uTreeLeafLightEnabled;
      varying vec3 vTreeWorldPosition;
      float treeLeafHash(vec3 p) {
        p = fract(p * 0.3183099 + vec3(0.13, 0.37, 0.61));
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }
    ` + shader.fragmentShader.replace(
      '#include <map_fragment>',
      `#include <map_fragment>
      if (uTreeLeafFadeEnabled > 0.5 && uTreeLeafKeep < 0.995) {
        vec3 leafCell = floor(vTreeWorldPosition * vec3(2.7, 1.9, 2.7));
        if (treeLeafHash(leafCell) > max(uTreeLeafKeep, 0.9)) discard;
      }
      {
        // 色相旋转（YIQ 空间，便宜）
        float ch = cos(uTreeHue);
        float sh = sin(uTreeHue);
        vec3 yiq = vec3(
          dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)),
          dot(diffuseColor.rgb, vec3(0.596, -0.274, -0.322)),
          dot(diffuseColor.rgb, vec3(0.211, -0.523, 0.312))
        );
        float i2 = yiq.y * ch - yiq.z * sh;
        float q2 = yiq.y * sh + yiq.z * ch;
        vec3 hueAdj = vec3(
          yiq.x + 0.956 * i2 + 0.621 * q2,
          yiq.x - 0.272 * i2 - 0.647 * q2,
          yiq.x - 1.106 * i2 + 1.703 * q2
        );
        diffuseColor.rgb = clamp(hueAdj, 0.0, 1.0);
        // 饱和度
        float luma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
        diffuseColor.rgb = mix(vec3(luma), diffuseColor.rgb, uTreeSat);
        // 明度
        diffuseColor.rgb *= uTreeBright;
        if (uTreeLeafLightEnabled > 0.5) {
          float leafLuma = max(dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722)), 0.001);
          float darkMask = 1.0 - smoothstep(uTreeLeafMinLuma, uTreeLeafMinLuma + 0.22, leafLuma);
          float lift = (uTreeLeafDarkLift + uTreeSnowContrastCompensation) * darkMask;
          float targetLuma = max(leafLuma + lift, uTreeLeafMinLuma);
          diffuseColor.rgb = clamp(diffuseColor.rgb * (targetLuma / leafLuma), 0.0, 1.0);
        }
      }
      `
    )
  }
  material.customProgramCacheKey = () => 'tree-color-grade-leaf-fade-v2'
  material.needsUpdate = true
}

// 运行时调色：直接写共享 uniform，下一帧生效（无需 needsUpdate）。
export function setTreeColorGrade({ saturation, brightness, hueShift } = {}) {
  if (Number.isFinite(saturation)) _treeGradeUniforms.uTreeSat.value = saturation
  if (Number.isFinite(brightness)) _treeGradeUniforms.uTreeBright.value = brightness
  if (Number.isFinite(hueShift)) _treeGradeUniforms.uTreeHue.value = hueShift
  return {
    saturation: _treeGradeUniforms.uTreeSat.value,
    brightness: _treeGradeUniforms.uTreeBright.value,
    hueShift: _treeGradeUniforms.uTreeHue.value,
  }
}

function materialNameList(material) {
  if (Array.isArray(material)) return material.map((mat) => mat?.name ?? '').join(' ')
  return material?.name ?? ''
}

function cloneForestPackLeafFadeMaterials(mesh) {
  const sourceMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  const nextMaterials = sourceMaterials.map((mat) => {
    if (!mat) return mat
    const next = mat.clone()
    resetTreeMaterialRuntimeData(next)
    configureVegetationAlphaCutout(next)
    applyTreeColorGrade(next, { leafFade: true, leafLight: true })
    return next
  })
  mesh.material = Array.isArray(mesh.material) ? nextMaterials : nextMaterials[0]
  return nextMaterials.filter(Boolean)
}

function enableForestPackTreeLeafFade(root) {
  root.updateMatrixWorld(true)
  const entries = []
  root.traverse((child) => {
    if (!child.isMesh || !child.geometry) return
    const box = new THREE.Box3().setFromObject(child)
    if (box.isEmpty()) return
    entries.push({
      mesh: child,
      top: box.max.y,
      name: `${child.name ?? ''} ${materialNameList(child.material)}`,
    })
  })
  if (!entries.length) return []
  const maxTop = Math.max(...entries.map((entry) => entry.top))
  const targets = []
  for (const entry of entries) {
    if (!FOREST_PACK_LEAF_RE.test(entry.name) && entry.top < maxTop - 0.05) continue
    targets.push(...cloneForestPackLeafFadeMaterials(entry.mesh))
  }
  return targets
}

function updateForestPackLeafFadeTargets(playerPosition) {
  if (!playerPosition) return
  const px = playerPosition.x
  const pz = playerPosition.z
  for (let i = _forestPackLeafFadeTargets.length - 1; i >= 0; i--) {
    const target = _forestPackLeafFadeTargets[i]
    if (!target.group.parent) {
      _forestPackLeafFadeTargets.splice(i, 1)
      continue
    }
    const dx = target.group.position.x - px
    const dz = target.group.position.z - pz
    const keep = getForestPackTreeLeafKeep(Math.sqrt(dx * dx + dz * dz))
    if (Math.abs(keep - target.keep) < 0.015) continue
    target.keep = keep
    target.materials.forEach((mat) => setForestPackLeafKeep(mat, keep))
  }
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
      if (VEGETATION_NAME_RE.test(mat.name ?? '')) applyTreeColorGrade(mat, { leafLight: FOREST_PACK_LEAF_RE.test(mat.name ?? '') })
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
      const isForestPackTree = FOREST_PACK_TREE_RE.test(placement.file)
      const heightBoost = isForestPackTree ? FOREST_GROVE_HEIGHT_BOOST : 1
      group.scale.setScalar((placement.scale ?? 1) * heightBoost)
      const leafFadeMaterials = isForestPackTree ? enableForestPackTreeLeafFade(root) : []
      configureStaticGltfModel(root, { castShadows: false, receiveShadows: true, cheapMaterials: false })
      group.add(root)
      scene.add(group)
      snapObjectToGround(group)
      if (leafFadeMaterials.length) _forestPackLeafFadeTargets.push({ group, materials: leafFadeMaterials, keep: 1 })
      registerForestPackLabelTarget(group, placement.file)
    }).catch((error) => {
      console.warn(`Forest grove asset failed: ${placement.file}`, error)
    })
  })
}

function loadSouthBasinLakesideDecorations(scene, collidables) {
  SOUTH_BASIN_LAKESIDE_DECORATIONS.forEach((placement, index) => {
    const { x, z } = getSouthBasinLakeRingPoint(placement.angleDeg, placement.radius)
    const rotY = THREE.MathUtils.degToRad(placement.angleDeg + 90)
      + THREE.MathUtils.lerp(-0.28, 0.28, forestPlacementNoise(placement.angleDeg * 19 + index))
    if (placement.r) {
      collidables.push({
        name: `south_basin_lakeside_${index + 1}_${placement.file}`,
        x,
        z,
        r: placement.r,
        minY: FOREST_GROVE_COLLIDER_MIN_Y,
        maxY: FOREST_GROVE_COLLIDER_MAX_Y,
      })
    }

    cloneGLTFScene(`${FOREST_GROVE_ASSETS_BASE}/${placement.file}`).then((root) => {
      const group = new THREE.Group()
      group.name = `south_basin_lakeside_${placement.file.replace(/\.glb$/i, '')}`
      group.position.set(x, 0, z)
      group.rotation.y = rotY
      const isForestPackTree = FOREST_PACK_TREE_RE.test(placement.file)
      const heightBoost = isForestPackTree ? FOREST_GROVE_HEIGHT_BOOST : 1
      group.scale.setScalar((placement.scale ?? 1) * heightBoost)
      const leafFadeMaterials = isForestPackTree ? enableForestPackTreeLeafFade(root) : []
      configureStaticGltfModel(root, { castShadows: false, receiveShadows: true, cheapMaterials: false })
      group.add(root)
      scene.add(group)
      snapObjectToGround(group)
      if (leafFadeMaterials.length) _forestPackLeafFadeTargets.push({ group, materials: leafFadeMaterials, keep: 1 })
      registerForestPackLabelTarget(group, placement.file)
    }).catch((error) => {
      console.warn(`South basin lakeside asset failed: ${placement.file}`, error)
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

function loadSpawnGrass(scene) {
  const placements = createSpawnGrassPlacements()
  if (!placements.length) return

  _spawnGrassWindUniforms = []
  _spawnGrassInstancedMeshes = []
  _grassLodMeshes = []
  _meadowGrassRuntime = null
  _meadowGrassQueueProfile = createMeadowGrassWorkProfile()
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
    seed,
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
  const counters = { kept: 0 }
  for (const spec of buildRiparianChannelSpecs()) {
    appendRiparianGrassForChannel(spec, placements, counters)
  }
  return { placements }
}

function emitGlobalWetGullyBedGrass(placements, counters, x, z, waterY, seed, freshWeight) {
  if (isNearGrassCampfire(x, z, GRASS_CAMPFIRE_CLEAR_RADIUS + MODEL_GRASS_FOOTPRINT_PADDING)) return
  if (isInsideMineCaveClearing(x, z, MINE_CAVE_MODEL_GRASS_PADDING)) return
  const groundY = getGroundHeight(x, z)
  if (groundY <= waterY + 0.06) return
  if (groundY > waterY + 1.35) return
  const riseX = Math.abs(getGroundHeight(x + 1, z) - groundY)
  const riseZ = Math.abs(getGroundHeight(x, z + 1) - groundY)
  if (riseX > 0.72 || riseZ > 0.72) return

  placements.push({
    x: Number(x.toFixed(2)),
    z: Number(z.toFixed(2)),
    rotY: Number((forestPlacementNoise(seed + 3) * Math.PI * 2).toFixed(3)),
    scaleX: Number(THREE.MathUtils.lerp(0.72, 1.18, forestPlacementNoise(seed + 4)).toFixed(3)),
    scaleY: Number(THREE.MathUtils.lerp(0.62, 1.04, forestPlacementNoise(seed + 5)).toFixed(3)),
    scaleZ: Number(THREE.MathUtils.lerp(0.72, 1.22, forestPlacementNoise(seed + 6)).toFixed(3)),
    tiltX: Number(THREE.MathUtils.lerp(-0.18, 0.18, forestPlacementNoise(seed + 7)).toFixed(3)),
    tiltZ: Number(THREE.MathUtils.lerp(-0.18, 0.18, forestPlacementNoise(seed + 8)).toFixed(3)),
    variantIndex: grassClusterVariant(x, z, seed, freshWeight),
    seed,
  })
  counters.kept++
}

function appendGlobalWetGullyBedGrass(gully, gullyIndex, placements, counters) {
  const total = riverPathTotalLength(gully.points)
  if (total < 1) return
  const stationCount = Math.max(2, Math.ceil(total / GLOBAL_WET_GULLY_BED_GRASS_ALONG_SPACING))
  const alongJitter = GLOBAL_WET_GULLY_BED_GRASS_ALONG_SPACING * 0.55
  const lateralJitter = GLOBAL_WET_GULLY_BED_GRASS_LATERAL_SPACING * 0.65

  for (let s = 0; s <= stationCount; s++) {
    const t = s / stationCount
    const c = pointAlongPathAtT(gully.points, t)
    const sample = getGlobalWetGullySampleAt(gully, c.x, c.z)
    const halfWidth = sample.halfWidth
    const waterY = getGroundHeight(sample.x, sample.z) + sample.waterDepth
    const rightX = -c.dirZ
    const rightZ = c.dirX
    const lateralMax = halfWidth + GLOBAL_WET_GULLY_BED_GRASS_OUTER_PAD
    const lateralCount = Math.max(2, Math.ceil(lateralMax / GLOBAL_WET_GULLY_BED_GRASS_LATERAL_SPACING))

    for (const side of [-1, 1]) {
      const sideSeed = 68000 + gullyIndex * 7000 + (side > 0 ? 320003 : 0)
      for (let l = 0; l < lateralCount; l++) {
        const seed = sideSeed + s * 577 + l * 37
        const baseD = (l + 0.5) * GLOBAL_WET_GULLY_BED_GRASS_LATERAL_SPACING
        const d = baseD + (forestPlacementNoise(seed + 1) - 0.5) * lateralJitter
        if (d <= 0 || d > lateralMax) continue
        const along = (forestPlacementNoise(seed + 2) - 0.5) * alongJitter
        const x = c.x + c.dirX * along + rightX * side * d
        const z = c.z + c.dirZ * along + rightZ * side * d
        const sampleAtPoint = getGlobalWetGullySampleAt(gully, x, z)
        const edge = sampleAtPoint.distance - sampleAtPoint.halfWidth
        if (edge > GLOBAL_WET_GULLY_BED_GRASS_OUTER_PAD) continue
        const inner = 1 - THREE.MathUtils.smoothstep(sampleAtPoint.distance, sampleAtPoint.halfWidth * 0.45, lateralMax)
        const keep = GLOBAL_WET_GULLY_BED_GRASS_KEEP * riparianPatchMask(x, z) * THREE.MathUtils.lerp(0.72, 1.0, inner)
        if (forestPlacementNoise(seed + 9) > keep) continue
        emitGlobalWetGullyBedGrass(placements, counters, x, z, waterY, seed, 0.75 + inner * 0.2)
      }
    }
  }
}

function createGlobalWetGullyBedGrassPlacements() {
  const placements = []
  const counters = { kept: 0 }
  GLOBAL_WET_GULLIES.forEach((gully, index) => {
    appendGlobalWetGullyBedGrass(gully, index, placements, counters)
  })
  return { placements }
}

function loadGrassPlacementsIntoLodGroups(scene, placements, groupPrefix, logLabel, warnLabel) {
  if (!placements.length) return

  const byVariant = SPAWN_GRASS_MODEL_VARIANTS.map(() => [])
  for (const p of placements) {
    byVariant[p.variantIndex]?.push(makeGrassRenderRecord({
      ...p,
      y: getGroundHeight(p.x, p.z) + LOCAL_MODEL_GRASS_Y_OFFSET,
    }))
  }

  Promise.all(SPAWN_GRASS_MODEL_VARIANTS.map((variant, variantIndex) => (
    loadGrassVariantGeometries(variant).then((geom) => ({ variant, variantIndex, geom }))
  ))).then((loadedVariants) => {
    const perVariant = loadedVariants.map(({ variant, variantIndex, geom }) => {
      const material = geom.hi ? configureSpawnGrassMaterial(new THREE.MeshBasicMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        depthWrite: true,
      })) : null
      return { variant, variantIndex, geom, material }
    })

    byVariant.forEach((arr, variantIndex) => {
      const v = perVariant[variantIndex]
      if (!v || !v.geom.hi || !v.material) return
      const group = createGrassLodGroup(scene, `${groupPrefix}_${v.variant.name}`, v.geom, v.material)
      appendGrassLodRecords(group, arr)
    })
    console.log(`[${logLabel}] placed ${placements.length} clumps in global LOD meshes`)
  }).catch((error) => {
    console.warn(`${warnLabel} asset failed`, error)
  })
}

function loadRiversideGrass(scene) {
  const { placements } = createRiversideGrassPlacements()
  loadGrassPlacementsIntoLodGroups(scene, placements, 'riverside_grass', 'riverside-grass', 'Riverside grass')
}

function loadGlobalWetGullyBedGrass(scene) {
  const { placements } = createGlobalWetGullyBedGrassPlacements()
  loadGrassPlacementsIntoLodGroups(scene, placements, 'global_wet_gully_bed_grass', 'global-wet-gully-bed-grass', 'Global wet gully bed grass')
}

function createSouthBasinLakeGrassPlacements() {
  const placements = []
  const waterY = getNewlandStaticLakeWaterY(SOUTH_BASIN_LAKE, getGroundHeight)
  const grassStartRun = SOUTH_BASIN_LAKE.grassStartRun ?? 9
  for (let ring = 0; ring < 4; ring++) {
    const radius = ((SOUTH_BASIN_LAKE.rx + SOUTH_BASIN_LAKE.rz) * 0.5) + grassStartRun + ring * 4.2
    const count = 30 + ring * 8
    for (let i = 0; i < count; i++) {
      const seed = 42000 + ring * 1000 + i * 37
      if (forestPlacementNoise(seed + 11) < 0.14) continue
      const angleDeg = (i / count) * 360 + ring * 8 + THREE.MathUtils.lerp(-4.2, 4.2, forestPlacementNoise(seed + 2))
      const jitterRadius = radius + THREE.MathUtils.lerp(-1.8, 2.2, forestPlacementNoise(seed + 3))
      const { x, z } = getSouthBasinLakeRingPoint(angleDeg, jitterRadius)
      if (!isInsideOutdoorMountainBounds(x, z, 0)) continue
      if (isNearGrassCampfire(x, z, GRASS_CAMPFIRE_CLEAR_RADIUS + MODEL_GRASS_FOOTPRINT_PADDING)) continue
      const lakeShape = getNewlandStaticLakeShapeAt(SOUTH_BASIN_LAKE, x, z)
      if (lakeShape.edge < grassStartRun - 0.75) continue
      const groundY = getGroundHeight(x, z)
      if (groundY <= waterY + 0.45) continue
      const riseX = Math.abs(getGroundHeight(x + 1, z) - groundY)
      const riseZ = Math.abs(getGroundHeight(x, z + 1) - groundY)
      if (riseX > 1.45 || riseZ > 1.45) continue
      placements.push({
        x: Number(x.toFixed(2)),
        z: Number(z.toFixed(2)),
        rotY: Number((forestPlacementNoise(seed + 4) * Math.PI * 2).toFixed(3)),
        scaleX: Number(THREE.MathUtils.lerp(0.8, 1.45, forestPlacementNoise(seed + 5)).toFixed(3)),
        scaleY: Number(THREE.MathUtils.lerp(0.82, 1.24, forestPlacementNoise(seed + 6)).toFixed(3)),
        scaleZ: Number(THREE.MathUtils.lerp(0.8, 1.45, forestPlacementNoise(seed + 7)).toFixed(3)),
        tiltX: Number(THREE.MathUtils.lerp(-0.14, 0.14, forestPlacementNoise(seed + 8)).toFixed(3)),
        tiltZ: Number(THREE.MathUtils.lerp(-0.14, 0.14, forestPlacementNoise(seed + 9)).toFixed(3)),
        variantIndex: grassClusterVariant(x, z, seed, 0.82),
        seed,
      })
    }
  }
  return placements
}

function loadSouthBasinLakeGrass(scene) {
  const placements = createSouthBasinLakeGrassPlacements()
  loadGrassPlacementsIntoLodGroups(scene, placements, 'south_basin_lake_grass', 'south-basin-lake-grass', 'South basin lake grass')
}

// ---- 玩家周围全局模型草：只为近距离 3D 草建立缓存，远处由地表材质承接 ----
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
    const groups = perVariant.map((v) => (
      v?.geom.hi && v.material
        ? createGrassLodGroup(scene, `meadow_grass_${v.variant.name}`, v.geom, v.material)
        : null
    ))
    _meadowGrassRuntime = {
      groups,
      cache: new Map(),
      queued: new Set(),
      queue: [],
      queueIndex: 0,
      scanJob: null,
      total: 0,
      lastEnqueue: null,
      lastPlayerPos: null,
      forwardX: 0,
      forwardZ: -1,
      playerSpeed: 0,
    }
  }).catch((error) => console.warn('Global model grass asset failed', error))
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
    // 距离 LOD 角色：按 base 对齐后包围盒顶高（max.y）降序，最高者=树冠（主导轮廓，远处也保留），其余=树干。
    // 单 part 模型唯一 part 记为 crown，保证远处永不整树消失。
    const byTop = parts
      .map((p) => ({ p, top: (p.geometry.computeBoundingBox(), p.geometry.boundingBox.max.y) }))
      .sort((a, b) => b.top - a.top)
    byTop.forEach((e, i) => { e.p.lodRole = i === 0 ? 'crown' : 'trunk' })
    return { file, baseScale, parts }
  })
}

function initWorldTrees(scene) {
  Promise.all([
    Promise.all(WORLD_TREE_MODELS.map((m) => loadTreeInstanceParts(m.file, m.scale))),
    loadGrassVariantGeometries(SPAWN_GRASS_MODEL_VARIANTS[0]), // 树下补草复用全局草几何
  ])
    .then(([models, grassGeom]) => {
      // 树下草材质：与全局草同款（configureSpawnGrassMaterial 会注册风 uniform → 自动随风动）
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
      _worldTreeBuild = { scene, models, grassHi: grassGeom?.hi ?? null, grassMat, cells, ci: 0, cur: null, total: 0, grassTotal: 0, cellMeshes: [], done: false, t0: performance.now() }
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
    arr.sort((a, b2) => worldTreeInstanceRank(a.seed) - worldTreeInstanceRank(b2.seed))
    const farCount = getWorldTreeInstanceCount(arr.length, WORLD_TREE_INSTANCE_FULL_DIST)
    const model = b.models[mi]
    for (const part of model.parts) {
      const isCrown = (part.lodRole || 'crown') === 'crown'
      const material = isCrown ? part.material.clone() : part.material
      if (isCrown) resetTreeMaterialRuntimeData(material)
      configureVegetationAlphaCutout(material)
      applyTreeColorGrade(material, { leafFade: isCrown, leafLight: isCrown })
      const inst = new THREE.InstancedMesh(part.geometry, material, arr.length)
      inst.name = `world_tree_${model.file.replace(/\.glb$/i, '')}_${cell.minX}_${cell.minZ}`
      inst.castShadow = false
      inst.receiveShadow = true
      inst.frustumCulled = true
      inst.userData.treeLodRole = part.lodRole || 'crown'  // 距离分级：crown 始终渲染，trunk 远处剔除
      inst.userData.treeFullCount = arr.length
      inst.userData.treeFarCount = farCount
      inst.visible = false                                 // 由首次 LOD pass 点亮，避免远处刚建好闪一帧全质量
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
  // 树下草：单个 InstancedMesh（复刻全局草的缩放/旋转），随树一起剔除
  if (grassArr && grassArr.length && b.grassHi && b.grassMat) {
    const ginst = new THREE.InstancedMesh(b.grassHi, b.grassMat, grassArr.length)
    ginst.name = `world_tree_grass_${cell.minX}_${cell.minZ}`
    ginst.castShadow = false
    ginst.receiveShadow = false
    ginst.frustumCulled = true
    ginst.userData.treeLodRole = 'grass'  // 仅近档显示
    ginst.visible = false
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
    b.cellMeshes.push({ cx: cell.minX + WORLD_TREE_CELL_LEN / 2, cz: cell.minZ + WORLD_TREE_CELL_LEN / 2, meshes, tier: -1 })
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
        const cluster = worldTreeClusterNoise(x, z)
        // 林斑/空地：先用低频阈值塑造森林轮廓，再在林团中心提高保留率，避免俯视均匀撒点。
        if (WORLD_TREE_CLUSTER_THRESHOLD > 0 && cluster < WORLD_TREE_CLUSTER_THRESHOLD + (forestPlacementNoise(seed + 9) - 0.5) * 0.10) break placeOne
        const clusterKeep = THREE.MathUtils.clamp((cluster - WORLD_TREE_CLUSTER_THRESHOLD) / Math.max(0.001, 1 - WORLD_TREE_CLUSTER_THRESHOLD), 0, 1)
        const thin = WORLD_TREE_THIN * THREE.MathUtils.lerp(1.15, 0.32, Math.pow(clusterKeep, 0.7))
        if (thin > 0 && forestPlacementNoise(seed + 11) < thin) break placeOne
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
        if (isInsideNewlandStaticLakeClearance(x, z)) break placeOne
        if (blocksDendriticGullyWorldTree(x, z, seed)) break placeOne
        if (blocksEastRimDryRiverWorldTree(x, z, seed)) break placeOne
        if (blocksLowlandErosionGullyWorldTree(x, z, seed)) break placeOne
        // 坡度守卫（不上崖面）
        const riseX = Math.abs(getGroundHeight(x + 1.5, z) - groundY)
        const riseZ = Math.abs(getGroundHeight(x, z + 1.5) - groundY)
        if (riseX > WORLD_TREE_MAX_SLOPE || riseZ > WORLD_TREE_MAX_SLOPE) break placeOne
        const fallbackMi = Math.floor(forestPlacementNoise(seed + 4) * b.models.length) % b.models.length
        const mi = pickModelTreeIndex(b.models, seed + 40, fallbackMi)
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
  console.log(`[world-trees] built ${b.total} trees + ${b.grassTotal} under-tree grass over ${(performance.now() - b.t0).toFixed(0)}ms wall`)
}

// 按 cell 中心到玩家水平距离分级 LOD：始终渲染到 COVERAGE，靠近逐级提质量。
//   档 0 近 (<NEAR)：树冠+树干+树下草   档 1 中 (..MID)：树冠+树干（去草）
//   档 2 远 (..COVERAGE)：仅树冠         档 3 超出：全隐（雾已淡化）
// 滞后带：靠近需越过 阈值-HYST 才升档，远离需越过 阈值+HYST 才降档，避免悬停时反复开关。
const _WORLD_TREE_LOD_BOUNDS = [WORLD_TREE_LOD_NEAR, WORLD_TREE_LOD_MID, WORLD_TREE_COVERAGE]
function worldTreeLodTier(dist, prev) {
  const hyst = WORLD_TREE_LOD_HYST
  let tier = 0
  for (let i = 0; i < _WORLD_TREE_LOD_BOUNDS.length; i++) {
    const edge = prev > i ? _WORLD_TREE_LOD_BOUNDS[i] - hyst : _WORLD_TREE_LOD_BOUNDS[i] + hyst
    if (dist >= edge) tier = i + 1
  }
  return tier
}
function updateWorldTreeVisibility(playerPosition) {
  const b = _worldTreeBuild
  if (!b || !playerPosition) return
  const px = playerPosition.x
  const pz = playerPosition.z
  for (const c of b.cellMeshes) {
    const dx = c.cx - px
    const dz = c.cz - pz
    const dist = Math.sqrt(dx * dx + dz * dz)
    const tier = worldTreeLodTier(dist, c.tier)
    const leafKeep = getForestPackTreeLeafKeep(dist)
    const instanceTier = dist < WORLD_TREE_INSTANCE_FULL_DIST ? 0 : 1
    const leafKeepChanged = Math.abs(leafKeep - (c.leafKeep ?? -1)) >= 0.015
    const densityChanged = c.treeDensityVersion !== _debugTreeDensityVersion
    if (tier === c.tier && instanceTier === c.instanceTier && !leafKeepChanged && !densityChanged) continue // 档位/叶片密度/调试密度不变 → 跳过冗余写入
    c.tier = tier
    c.leafKeep = leafKeep
    c.instanceTier = instanceTier
    c.treeDensityVersion = _debugTreeDensityVersion
    const crownOn = tier <= 2
    const trunkOn = tier <= 1
    const grassOn = tier === 0 && !_debugModelGrassDisabled
    for (const m of c.meshes) {
      const role = m.userData.treeLodRole
      if (role === 'grass') {
        m.visible = grassOn
        if (!grassOn) m.count = 0
        continue
      }
      const baseCount = Math.max(0, instanceTier === 0 ? m.userData.treeFullCount : m.userData.treeFarCount)
      const nextCount = _debugTreeDensity <= 0 || baseCount <= 0 ? 0 : Math.max(1, Math.floor(baseCount * _debugTreeDensity))
      m.count = nextCount
      m.visible = (role === 'trunk' ? trunkOn : crownOn) && nextCount > 0
      if (role === 'crown') setForestPackLeafKeep(m.material, leafKeep)
    }
  }
}

function setDebugGrassDensity(value) {
  _debugGrassDensity = THREE.MathUtils.clamp(Number(value) || 0, 0, 2)
  _grassLodTimer = GRASS_LOD_INTERVAL
  return _debugGrassDensity
}

function setDebugModelGrassDisabled(value) {
  _debugModelGrassDisabled = Boolean(value)
  _grassLodTimer = GRASS_LOD_INTERVAL
  _worldTreeVisTimer = WORLD_TREE_VIS_INTERVAL
  if (_debugModelGrassDisabled) hideAllModelGrass()
  return _debugModelGrassDisabled
}

function setDebugWaterEffectsDisabled(value) {
  _debugWaterEffectsDisabled = Boolean(value)
  return _debugWaterEffectsDisabled
}

function setDebugTreeDensity(value) {
  const next = THREE.MathUtils.clamp(Number(value) || 0, 0, 1)
  if (Math.abs(next - _debugTreeDensity) >= 0.001) _debugTreeDensityVersion++
  _debugTreeDensity = next
  _worldTreeVisTimer = WORLD_TREE_VIS_INTERVAL
  return _debugTreeDensity
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

const RIVER_CHANNEL_MIN_CUT = 2 // 小河/细流最小切深；调大会更深更陡，调小更浅但可能露出水面边。
// 河岸坡度放缓：斜坡水平宽度 run > 地形顶点间距(1.78m)，使网格能忠实表现河岸、解析高度≈渲染网格，
// 消除人物陷入河岸与水面插进抹平网格的穿模。min: 2.0/tan44≈2.07m；main: 2.4/tan46≈2.32m。
const RIVER_CHANNEL_MIN_SLOPE_DEG = 44 // 小河岸坡角；调小岸更宽更缓，调大岸更窄更陡。
const MAIN_RIVER_CHANNEL_CUT = 2.4 // 主河切深；调大主河床更低，调小可能水面显浅。
const MAIN_RIVER_CHANNEL_SLOPE_DEG = 46 // 主河岸坡角；调小更宽缓，调大更贴岸但更容易出陡面。
const MAIN_RIVER_WATER_DEPTH = 0.75 // 主河水深；调大水面更高，调小更浅。
const BRANCH_RIVER_WATER_DEPTH = 0.45 // 支流水深；影响所有 RIVER_BRANCHES 的水面高度。
const GULLY_STREAM_WATER_DEPTH = 0.35 // wet 冲沟水深；调大细流更明显，也更容易淹没沟底。

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

function newlandBraidedHalfWidthAt(channel, t) {
  const mid = Math.sin(t * Math.PI) * 0.9
  return THREE.MathUtils.lerp(channel.halfWidthStart, channel.halfWidthEnd, t) + mid
}

function newlandBraidedWaterDepthAt(channel, t) {
  return channel.waterDepth + Math.sin(t * Math.PI) * 0.08
}

function getNewlandBraidedSampleAt(channel, x, z) {
  const sample = getPathSample(channel.points, x, z)
  const halfWidth = newlandBraidedHalfWidthAt(channel, sample.t)
  const waterDepth = newlandBraidedWaterDepthAt(channel, sample.t)
  const edgeDistance = Math.abs(sample.distance - halfWidth)
  const whitewater = THREE.MathUtils.smoothstep(halfWidth - sample.distance, -0.8, 1.8) * 0.18
  return {
    ...sample,
    channelId: channel.id,
    channel,
    halfWidth,
    waterDepth,
    waterY: 0,
    edgeDistance,
    whitewater,
    flowSpeed: THREE.MathUtils.lerp(0.38, 1.1, THREE.MathUtils.clamp(whitewater + (1 - sample.t) * 0.18, 0, 1)),
    skipNetworkCarve: true,
  }
}

function getBestNewlandBraidedSampleAt(x, z) {
  let best = null
  for (const { channel, bounds } of NEWLAND_BRAIDED_BOUNDS) {
    if (!isInsideBounds(bounds, x, z)) continue
    const sample = getNewlandBraidedSampleAt(channel, x, z)
    const edge = sample.distance - sample.halfWidth
    if (!best || edge < best.edge) best = { ...sample, edge }
  }
  return best
}

function globalWetGullyHalfWidthAt(gully, t) {
  return THREE.MathUtils.lerp(gully.halfWidthStart, gully.halfWidthEnd, t) + Math.sin(t * Math.PI) * 0.45
}

function globalWetGullyDepthAt(gully, t) {
  return gully.cutDepth * (0.86 + Math.sin(t * Math.PI) * 0.16)
}

function globalWetGullyWaterDepthAt(gully, t) {
  return gully.waterDepth + Math.sin(t * Math.PI) * 0.05
}

function getGlobalWetGullySampleAt(gully, x, z) {
  const sample = getPathSample(gully.points, x, z)
  const halfWidth = globalWetGullyHalfWidthAt(gully, sample.t)
  const waterDepth = globalWetGullyWaterDepthAt(gully, sample.t)
  const edgeDistance = Math.abs(sample.distance - halfWidth)
  const whitewater = Math.max(
    Math.exp(-Math.pow((sample.t - 0.22) / 0.20, 2)) * 0.13,
    THREE.MathUtils.smoothstep(halfWidth - sample.distance, -0.55, 1.3) * 0.10,
  )
  return {
    ...sample,
    gullyId: gully.id,
    gully,
    halfWidth,
    cutDepth: globalWetGullyDepthAt(gully, sample.t),
    waterDepth,
    waterY: 0,
    edgeDistance,
    whitewater: THREE.MathUtils.clamp(whitewater, 0, 0.22),
    flowSpeed: THREE.MathUtils.lerp(0.26, 0.78, THREE.MathUtils.clamp(whitewater + (1 - sample.t) * 0.16, 0, 1)),
    skipNetworkCarve: true,
  }
}

function getBestGlobalWetGullySampleAt(x, z) {
  let best = null
  for (const { gully, bounds } of GLOBAL_WET_GULLY_BOUNDS) {
    if (!isInsideBounds(bounds, x, z)) continue
    const sample = getGlobalWetGullySampleAt(gully, x, z)
    const edge = sample.distance - sample.halfWidth
    if (!best || edge < best.edge) best = { ...sample, edge }
  }
  return best
}

function southBasinLakeWaterY() {
  return Number.isFinite(SOUTH_BASIN_LAKE.flatBedY)
    ? SOUTH_BASIN_LAKE.flatBedY + SOUTH_BASIN_LAKE.waterDepth
    : SOUTH_BASIN_LAKE.waterDepth
}

function southBasinLakeJoinMask(x, z) {
  const lake = getNewlandStaticLakeShapeAt(SOUTH_BASIN_LAKE, x, z)
  return 1 - THREE.MathUtils.smoothstep(lake.edge, -10, 24)
}

function getGlobalWetGullySurfaceY(gully, sample, getTerrainHeight) {
  const streamY = getTerrainHeight(sample.x, sample.z) + sample.waterDepth
  if (gully.lakeJoin !== 'south_basin_lake') return streamY
  const join = southBasinLakeJoinMask(sample.x, sample.z)
  if (join <= 0) return streamY
  return THREE.MathUtils.lerp(streamY, southBasinLakeWaterY(), join)
}

function getGlobalWetGullyWaterMask(gully, x, z, baseMask) {
  if (gully.lakeJoin !== 'south_basin_lake') return baseMask
  const lake = getNewlandStaticLakeShapeAt(SOUTH_BASIN_LAKE, x, z)
  const lakeInterior = 1 - THREE.MathUtils.smoothstep(lake.edge, -9, -1.5)
  return baseMask * (1 - lakeInterior)
}

function getDendriticGullySampleAt(gully, x, z) {
  const sample = getPathSample(gully.points, x, z)
  const halfWidth = gully.width + Math.sin(sample.t * Math.PI) * 0.85
  return {
    ...sample,
    gully,
    halfWidth,
    influence: gully.influence,
    depth: gully.depth,
    treeClearance: gully.treeClearance,
    edge: sample.distance - halfWidth,
  }
}

function getBestDendriticGullySampleAt(x, z) {
  let best = null
  for (const { gully, bounds } of NEWLAND_DENDRITIC_GULLY_BOUNDS) {
    if (!isInsideBounds(bounds, x, z)) continue
    const sample = getDendriticGullySampleAt(gully, x, z)
    if (!best || sample.edge < best.edge) best = sample
  }
  return best
}

function blocksWorldTreeByValleyClearance(sample, seed, noiseOffset) {
  if (!sample) return false
  const treeClearance = Math.max(0, sample.treeClearance ?? 0)
  const hardClear = sample.halfWidth + treeClearance * WORLD_TREE_VALLEY_HARD_CLEAR_RATIO
  const outerClear = sample.halfWidth + treeClearance
  if (sample.distance <= hardClear) return true
  if (sample.distance > outerClear) return false
  const t = THREE.MathUtils.smoothstep(sample.distance, hardClear, outerClear)
  const keep = THREE.MathUtils.lerp(WORLD_TREE_VALLEY_INNER_KEEP, WORLD_TREE_VALLEY_OUTER_KEEP, t)
  return forestPlacementNoise(seed + noiseOffset) > keep
}

function blocksDendriticGullyWorldTree(x, z, seed) {
  return blocksWorldTreeByValleyClearance(getBestDendriticGullySampleAt(x, z), seed, 71)
}

function dendriticGullyGrassKeep(x, z) {
  const sample = getBestDendriticGullySampleAt(x, z)
  if (!sample || sample.distance > sample.halfWidth + sample.influence * 0.62) return 1
  const near = 1 - THREE.MathUtils.smoothstep(sample.distance, sample.halfWidth + 4, sample.halfWidth + sample.influence * 0.62)
  return THREE.MathUtils.lerp(0.72, 0.34, near)
}

function eastRimDryRiverHalfWidthAt(river, t) {
  return THREE.MathUtils.lerp(river.widthStart, river.widthEnd, t) + Math.sin(t * Math.PI) * (river.tier === 'main' ? 1.8 : 0.75)
}

function eastRimDryRiverDepthAt(river, t) {
  return THREE.MathUtils.lerp(river.depthStart, river.depthEnd, t) + Math.sin(t * Math.PI) * (river.tier === 'main' ? 1.4 : 0.55)
}

function getEastRimDryRiverSampleAt(river, x, z) {
  const sample = getPathSample(river.points, x, z)
  const halfWidth = eastRimDryRiverHalfWidthAt(river, sample.t)
  return {
    ...sample,
    river,
    halfWidth,
    influence: river.influence,
    depth: eastRimDryRiverDepthAt(river, sample.t),
    treeClearance: river.treeClearance,
    edge: sample.distance - halfWidth,
  }
}

function getBestEastRimDryRiverSampleAt(x, z) {
  let best = null
  for (const { river, bounds } of EAST_RIM_DRY_RIVER_BOUNDS) {
    if (!isInsideBounds(bounds, x, z)) continue
    const sample = getEastRimDryRiverSampleAt(river, x, z)
    if (!best || sample.edge < best.edge) best = sample
  }
  return best
}

function blocksEastRimDryRiverWorldTree(x, z, seed) {
  return blocksWorldTreeByValleyClearance(getBestEastRimDryRiverSampleAt(x, z), seed, 79)
}

function lowlandErosionGullyHalfWidthAt(gully, t) {
  return gully.width + Math.sin(t * Math.PI) * 0.75
}

function lowlandErosionGullyDepthAt(gully, t) {
  return gully.depth * (0.86 + Math.sin(t * Math.PI) * 0.22)
}

function getLowlandErosionGullySampleAt(gully, x, z) {
  const sample = getPathSample(gully.points, x, z)
  const halfWidth = lowlandErosionGullyHalfWidthAt(gully, sample.t)
  return {
    ...sample,
    gully,
    halfWidth,
    influence: gully.influence,
    depth: lowlandErosionGullyDepthAt(gully, sample.t),
    treeClearance: gully.treeClearance,
    edge: sample.distance - halfWidth,
  }
}

function getBestLowlandErosionGullySampleAt(x, z) {
  let best = null
  for (const { gully, bounds } of LOWLAND_EROSION_GULLY_BOUNDS) {
    if (!isInsideBounds(bounds, x, z)) continue
    const sample = getLowlandErosionGullySampleAt(gully, x, z)
    if (!best || sample.edge < best.edge) best = sample
  }
  return best
}

function blocksLowlandErosionGullyWorldTree(x, z, seed) {
  return blocksWorldTreeByValleyClearance(getBestLowlandErosionGullySampleAt(x, z), seed, 83)
}

function lowlandErosionGrassKeep(x, z) {
  const sample = getBestLowlandErosionGullySampleAt(x, z)
  if (!sample || sample.distance > sample.halfWidth + sample.influence * 0.55) return 1
  const near = 1 - THREE.MathUtils.smoothstep(sample.distance, sample.halfWidth + 2.5, sample.halfWidth + sample.influence * 0.55)
  return THREE.MathUtils.lerp(0.82, 0.18, near)
}

function getBestDryErosionGullySampleAt(x, z) {
  let best = null
  for (const { gully, bounds } of EROSION_GULLY_BOUNDS) {
    if (gully.wet || !isInsideBounds(bounds, x, z)) continue
    const sample = getGullySampleAt(gully, x, z)
    const drySample = {
      ...sample,
      halfWidth: gully.width,
      edge: sample.distance - gully.width,
    }
    if (!best || drySample.edge < best.edge) best = drySample
  }
  return best
}

function getBestDryGullySampleAt(x, z) {
  const candidates = [
    getBestDryErosionGullySampleAt(x, z),
    getBestLowlandErosionGullySampleAt(x, z),
    getBestDendriticGullySampleAt(x, z),
    getBestEastRimDryRiverSampleAt(x, z),
  ].filter(Boolean)
  let best = null
  for (const sample of candidates) {
    if (!best || sample.edge < best.edge) best = sample
  }
  return best
}

function dryGullyGrassKeepRatioAt(x, z) {
  const sample = getBestDryGullySampleAt(x, z)
  if (!sample) return 1
  const core = Math.max(0.75, sample.halfWidth * DRY_GULLY_GRASS_CORE_RATIO)
  const fade = Math.max(0.75, sample.halfWidth * DRY_GULLY_GRASS_EDGE_FADE)
  if (sample.distance <= sample.halfWidth) {
    if (sample.distance > core + fade) return 0
    const edgeT = 1 - THREE.MathUtils.smoothstep(sample.distance, core, core + fade)
    return DRY_GULLY_GRASS_KEEP * edgeT
  }
  const recover = Math.max(1.5, sample.halfWidth * DRY_GULLY_BANK_GRASS_RECOVER)
  if (sample.distance > sample.halfWidth + recover) return 1
  const bankT = THREE.MathUtils.smoothstep(sample.distance, sample.halfWidth, sample.halfWidth + recover)
  return THREE.MathUtils.lerp(DRY_GULLY_BANK_GRASS_MIN_KEEP, 1, bankT)
}

function allowsDryGullyModelGrass(x, z) {
  const keep = dryGullyGrassKeepRatioAt(x, z)
  if (keep >= 0.999) return true
  if (keep <= 0) return false
  const broad = valueNoise2(x * DRY_GULLY_GRASS_CLUSTER_SCALE + 34.2, z * DRY_GULLY_GRASS_CLUSTER_SCALE + 8.9)
  const detail = valueNoise2(x * DRY_GULLY_GRASS_CLUSTER_SCALE * 2.4 + 11.7, z * DRY_GULLY_GRASS_CLUSTER_SCALE * 2.4 + 47.3)
  const cluster = THREE.MathUtils.clamp(broad * 0.78 + detail * 0.22, 0, 1)
  return cluster >= 1 - Math.sqrt(keep) * 0.62
}

function isLowlandErosionProtected(x, z, height) {
  if (height > 58 || height < MOUNTAIN_FALL_FLOOR_Y + 10) return true
  if (protectedTerrainMask(x, z) > 0.08) return true
  const channel = sampleChannelNetwork(x, z)
  if (channel && channel.edge < 20) return true
  const { weight: poolW } = confluencePoolWeightAt(x, z)
  if (poolW > 0) return true
  if (NEWLAND_STATIC_LAKES.some(lake => getNewlandStaticLakeShapeAt(lake, x, z).edge < lake.treeClearance + 8)) return true
  return false
}

function lowlandErosionMicroNoise(x, z) {
  const wx = x + Math.sin(x * 0.009 + z * 0.013) * 28 + Math.sin(z * 0.021) * 10
  const wz = z + Math.sin(z * 0.010 - x * 0.012) * 28 + Math.sin(x * 0.019) * 10
  const r1 = 1 - Math.abs(Math.sin(wx * 0.021 + wz * 0.034))
  const r2 = 1 - Math.abs(Math.sin(wx * 0.037 - wz * 0.020 + 1.8))
  const r3 = 1 - Math.abs(Math.sin(wx * 0.058 + wz * 0.012 + 0.7))
  return Math.max(r1 * 0.78, r2 * 0.68, r3 * 0.52)
}

function applyLowlandMicroErosionHeight(x, z, height) {
  if (isLowlandErosionProtected(x, z, height)) return height
  const lowlandMask = (1 - THREE.MathUtils.smoothstep(height, 24, 64))
    * THREE.MathUtils.smoothstep(height, MOUNTAIN_FALL_FLOOR_Y + 16, MOUNTAIN_FALL_FLOOR_Y + 48)
  if (lowlandMask <= 0) return height

  const broad = Math.sin(x * 0.010 + z * 0.014) * 0.5
    + Math.sin(x * 0.018 - z * 0.009 + 1.4) * 0.34
    + Math.sin(x * 0.034 + z * 0.026 + 0.6) * 0.18
  const rill = THREE.MathUtils.smoothstep(lowlandErosionMicroNoise(x, z), 0.72, 0.96)
  const swale = THREE.MathUtils.smoothstep(-broad, 0.08, 0.78)
  const shoulder = THREE.MathUtils.smoothstep(rill, 0.36, 0.82) * (0.15 + Math.max(0, broad) * 0.18)
  const cut = rill * (0.42 + swale * 0.62) + swale * 0.36
  return height - (cut - shoulder) * lowlandMask
}

function globalDendriticLineDistance(x, z, scale, angle, phase) {
  const ca = Math.cos(angle)
  const sa = Math.sin(angle)
  const u = x * ca + z * sa
  const v = -x * sa + z * ca
  const warpU = u
    + Math.sin(v * scale * 0.62 + phase) * (118 / Math.max(0.001, scale * 1000))
    + Math.sin((u + v) * scale * 0.28 - phase * 0.7) * (54 / Math.max(0.001, scale * 1000))
  const warpV = v
    + Math.sin(u * scale * 0.54 - phase * 1.3) * (92 / Math.max(0.001, scale * 1000))

  const trunk = Math.abs(Math.sin(warpU * scale + Math.sin(warpV * scale * 0.45 + phase) * 1.65))
  const branchA = Math.abs(Math.sin((warpU * 0.62 + warpV * 0.78) * scale * 1.34 + Math.sin(warpU * scale * 0.34 - phase) * 1.1))
  const branchB = Math.abs(Math.sin((warpU * 0.88 - warpV * 0.38) * scale * 1.78 + Math.sin(warpV * scale * 0.48 + phase * 1.7) * 0.85))
  return Math.min(trunk, branchA * 1.08, branchB * 1.18)
}

function globalDendriticMaskFromDistance(distance, coreWidth, apronWidth) {
  const core = 1 - THREE.MathUtils.smoothstep(distance, 0, coreWidth)
  const apron = 1 - THREE.MathUtils.smoothstep(distance, coreWidth * 0.72, apronWidth)
  return { core, apron }
}

function globalDendriticErosionSample(x, z, height) {
  const major = globalDendriticMaskFromDistance(globalDendriticLineDistance(x, z, 0.0062, -0.58, 1.7), 0.060, 0.245)
  const branch = globalDendriticMaskFromDistance(globalDendriticLineDistance(x + 87, z - 41, 0.0115, 0.34, 4.1), 0.047, 0.205)
  const fine = globalDendriticMaskFromDistance(globalDendriticLineDistance(x - 29, z + 113, 0.0235, -1.18, 2.8), 0.034, 0.150)
  const micro = globalDendriticMaskFromDistance(globalDendriticLineDistance(x + 173, z + 59, 0.039, 0.82, 6.2), 0.022, 0.092)
  const protect = Math.pow(1 - protectedTerrainMask(x, z), 1.85)
  const floorMask = Math.max(0.25, THREE.MathUtils.smoothstep(height, MOUNTAIN_FALL_FLOOR_Y + 8, MOUNTAIN_FALL_FLOOR_Y + 46))
  const highMask = 1 - THREE.MathUtils.smoothstep(height, 210, 310)
  const noise = valueNoise2(x * 0.019 + 13.4, z * 0.019 + 7.1)
  const core = Math.max(major.core, branch.core * 0.82, fine.core * 0.48)
  const apron = Math.max(major.apron, branch.apron * 0.78, fine.apron * 0.42)
  const depth = THREE.MathUtils.lerp(2, 5, valueNoise2(x * 0.010 + 52.1, z * 0.010 + 9.4))
  const cutMask = THREE.MathUtils.clamp(Math.max(core, major.apron * 0.38, branch.apron * 0.30, fine.apron * 0.18, micro.core * 0.28), 0, 1)
  const cut = depth * cutMask
  const shoulder = (major.apron * (1 - major.core) * 0.55 + branch.apron * (1 - branch.core) * 0.34 + fine.apron * (1 - fine.core) * 0.16)
    * (0.65 + noise * 0.28)
  const strength = protect * floorMask * highMask
  return {
    core,
    apron,
    cut: cut * strength,
    shoulder: shoulder * strength,
  }
}

function applyGlobalDendriticErosionHeight(x, z, height) {
  const erosion = globalDendriticErosionSample(x, z, height)
  if (erosion.cut <= 0 && erosion.shoulder <= 0) return height
  return height - erosion.cut + erosion.shoulder
}

function applyGlobalWetGullyHeight(x, z, height) {
  const sample = getBestGlobalWetGullySampleAt(x, z)
  if (!sample) return height
  const lakeJoin = sample.gully?.lakeJoin === 'south_basin_lake'
  const join = lakeJoin ? southBasinLakeJoinMask(x, z) : 0
  const outerPad = join > 0 ? 18 : 10
  if (sample.distance > sample.halfWidth + outerPad) return height
  const protect = protectedTerrainMask(x, z)
  if (protect > 0.65 && sample.distance > sample.halfWidth * 0.75) return height

  const run = Math.max(0.35, channelBankRun(sample.cutDepth, 40))
  const bedNoise = Math.sin(x * 0.14 + z * 0.09) * 0.07 + Math.sin(x * 0.045 - z * 0.071) * 0.05
  const wetTrim = THREE.MathUtils.clamp(sample.cutDepth * 0.32, 0.55, 1.15)
  const bedTarget = height - wetTrim + bedNoise
  const carved = applySteepChannelCarve(height, sample.distance, sample.halfWidth, {
    cutDepth: wetTrim,
    slopeDeg: 40,
    bedTarget,
  })
  const apron = 1 - THREE.MathUtils.smoothstep(sample.distance, sample.halfWidth + run, sample.halfWidth + run + 8)
  let result = Math.min(height, carved, height - apron * 0.22)

  if (lakeJoin) {
    if (join > 0) {
      const lakeWaterY = southBasinLakeWaterY()
      const mouthWidth = sample.halfWidth + THREE.MathUtils.lerp(5, 14, join)
      const channelMask = 1 - THREE.MathUtils.smoothstep(sample.distance, sample.halfWidth + 1.2, mouthWidth)
      const bedMask = 1 - THREE.MathUtils.smoothstep(sample.distance, sample.halfWidth * 0.55, sample.halfWidth + 1.5)
      const mouthBedY = lakeWaterY - 0.42 + bedNoise * 0.35
      const mouthBankY = lakeWaterY + 0.10 + THREE.MathUtils.smoothstep(sample.distance, sample.halfWidth, mouthWidth) * 0.58
      const mouthTarget = THREE.MathUtils.lerp(mouthBankY, mouthBedY, bedMask)
      result = Math.min(result, THREE.MathUtils.lerp(height, mouthTarget, join * channelMask))
    }
  }

  return result
}

function isDendriticGullyNearWater(x, z) {
  const channel = sampleChannelNetwork(x, z)
  if (channel && channel.edge < 12) return true
  return NEWLAND_STATIC_LAKES.some(lake => getNewlandStaticLakeShapeAt(lake, x, z).edge < 12)
}

function newlandMountainOutletHalfWidthAt(t) {
  return THREE.MathUtils.lerp(NEWLAND_MOUNTAIN_OUTLET.halfWidthStart, NEWLAND_MOUNTAIN_OUTLET.halfWidthEnd, t)
    + Math.sin(t * Math.PI) * 0.7
}

function getNewlandMountainOutletSampleAt(x, z) {
  const sample = getPathSample(NEWLAND_MOUNTAIN_OUTLET.points, x, z)
  const halfWidth = newlandMountainOutletHalfWidthAt(sample.t)
  const edgeDistance = Math.abs(sample.distance - halfWidth)
  const whitewater = THREE.MathUtils.smoothstep(halfWidth - sample.distance, -0.7, 1.6) * 0.16
  return {
    ...sample,
    outletId: NEWLAND_MOUNTAIN_OUTLET.id,
    halfWidth,
    waterDepth: NEWLAND_MOUNTAIN_OUTLET.waterDepth,
    waterY: 0,
    edgeDistance,
    whitewater,
    flowSpeed: THREE.MathUtils.lerp(0.36, 1.0, THREE.MathUtils.clamp(whitewater + (1 - sample.t) * 0.12, 0, 1)),
    skipNetworkCarve: true,
  }
}

function newlandBraidedOverlapWeightAt(x, z, ownChannelId = null) {
  let bestEdge = Infinity
  for (const { channel, bounds } of NEWLAND_BRAIDED_BOUNDS) {
    if (ownChannelId && channel.id === ownChannelId) continue
    if (!isInsideBounds(bounds, x, z)) continue
    const sample = getNewlandBraidedSampleAt(channel, x, z)
    bestEdge = Math.min(bestEdge, sample.distance - sample.halfWidth)
  }
  return 1 - THREE.MathUtils.smoothstep(bestEdge, -0.8, 4.0)
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

function applyDendriticGullyHeight(x, z, height) {
  const sample = getBestDendriticGullySampleAt(x, z)
  if (!sample || sample.distance > sample.influence) return height
  if (isDendriticGullyNearWater(x, z)) return height
  const floorMask = 1 - THREE.MathUtils.smoothstep(sample.distance, sample.halfWidth * 0.55, sample.halfWidth + 0.5)
  const apronMask = 1 - THREE.MathUtils.smoothstep(sample.distance, sample.halfWidth + 10, sample.influence)
  const bankNoise = Math.sin(x * 0.045 + z * 0.061) * 0.30 + Math.sin(x * 0.019 - z * 0.073) * 0.18
  const bedNoise = Math.sin(x * 0.15 + z * 0.09) * 0.10 + Math.sin(x * 0.053 - z * 0.117) * 0.07
  const floor = height - sample.depth + bedNoise
  const apronDrop = (0.72 + sample.depth * 0.16 + Math.max(0, bankNoise) * 0.18) * apronMask
  const shaped = THREE.MathUtils.lerp(height - apronDrop, floor, floorMask)
  const carved = applySteepChannelCarve(height, sample.distance, sample.halfWidth, {
    cutDepth: sample.depth,
    slopeDeg: 42,
    bedTarget: floor,
  })
  return Math.min(height, shaped, carved)
}

function applyEastRimDryRiverHeight(x, z, height) {
  const sample = getBestEastRimDryRiverSampleAt(x, z)
  if (!sample || sample.distance > sample.influence) return height
  const floorMask = 1 - THREE.MathUtils.smoothstep(sample.distance, sample.halfWidth * 0.58, sample.halfWidth + 0.85)
  const apronMask = 1 - THREE.MathUtils.smoothstep(sample.distance, sample.halfWidth + 18, sample.influence)
  const bankNoise = Math.sin(x * 0.034 + z * 0.047) * 0.46 + Math.sin(x * 0.013 - z * 0.059) * 0.24
  const bedNoise = Math.sin(x * 0.115 + z * 0.072) * 0.16 + Math.sin(x * 0.041 - z * 0.106) * 0.10
  const floor = height - sample.depth + bedNoise
  const apronDrop = (1.2 + sample.depth * 0.18 + Math.max(0, bankNoise) * 0.30) * apronMask
  const shaped = THREE.MathUtils.lerp(height - apronDrop, floor, floorMask)
  const carved = applySteepChannelCarve(height, sample.distance, sample.halfWidth, {
    cutDepth: sample.depth,
    slopeDeg: sample.river.tier === 'main' ? 27 : 34,
    bedTarget: floor,
  })
  return Math.min(height, shaped, carved)
}

function applyLowlandErosionGullyHeight(x, z, height) {
  const sample = getBestLowlandErosionGullySampleAt(x, z)
  if (!sample || sample.distance > sample.influence) return height
  if (isLowlandErosionProtected(x, z, height)) return height

  const lowlandMask = 1 - THREE.MathUtils.smoothstep(height, 34, 58)
  const coreMask = 1 - THREE.MathUtils.smoothstep(sample.distance, sample.halfWidth * 0.48, sample.halfWidth + 0.6)
  const bankMask = 1 - THREE.MathUtils.smoothstep(sample.distance, sample.halfWidth + 2, sample.halfWidth + 12)
  const apronMask = 1 - THREE.MathUtils.smoothstep(sample.distance, sample.halfWidth + 12, sample.influence)
  const shoulderMask = THREE.MathUtils.smoothstep(sample.distance, sample.halfWidth + 0.8, sample.halfWidth + 7.5)
    * (1 - THREE.MathUtils.smoothstep(sample.distance, sample.halfWidth + 7.5, sample.halfWidth + 20))
  const meanderNoise = Math.sin(x * 0.043 + z * 0.071 + sample.gully.depth) * 0.28
    + Math.sin(x * 0.018 - z * 0.052 + sample.gully.width) * 0.20
  const bedNoise = Math.sin(x * 0.18 + z * 0.11 + sample.gully.depth) * 0.13
    + Math.sin(x * 0.061 - z * 0.149) * 0.08

  const floor = height - sample.depth + bedNoise
  const bankDrop = (0.65 + sample.depth * 0.22 + Math.max(0, meanderNoise) * 0.20) * bankMask
  const apronDrop = (0.45 + sample.depth * 0.12 + Math.max(0, meanderNoise) * 0.18) * apronMask
  let target = height - apronDrop
  target = THREE.MathUtils.lerp(target, height - bankDrop, bankMask * 0.72)
  target = THREE.MathUtils.lerp(target, floor, coreMask)
  target += shoulderMask * (0.18 + Math.max(0, meanderNoise) * 0.16)

  const blend = Math.max(coreMask, bankMask * 0.9, apronMask * 0.62) * lowlandMask
  return Math.min(height, THREE.MathUtils.lerp(height, target, blend))
}

function applyNewlandBraidedRiverHeight(x, z, height) {
  let result = height
  for (const { channel, bounds } of NEWLAND_BRAIDED_BOUNDS) {
    if (!isInsideBounds(bounds, x, z)) continue
    const sample = getNewlandBraidedSampleAt(channel, x, z)
    const run = Math.max(0.35, channelBankRun(channel.cutDepth, NEWLAND_BRAIDED_SLOPE_DEG))
    const apronWidth = 9
    if (sample.distance > sample.halfWidth + run + apronWidth) continue
    const bedNoise = Math.sin(x * 0.17 + z * 0.11) * 0.10 + Math.sin(x * 0.049 - z * 0.083) * 0.07
    const bedTarget = height - channel.cutDepth + bedNoise
    const carved = applySteepChannelCarve(height, sample.distance, sample.halfWidth, {
      cutDepth: channel.cutDepth,
      slopeDeg: NEWLAND_BRAIDED_SLOPE_DEG,
      bedTarget,
    })
    const apron = 1 - THREE.MathUtils.smoothstep(sample.distance, sample.halfWidth + run, sample.halfWidth + run + apronWidth)
    result = Math.min(result, carved, height - apron * 0.42)
  }
  return result
}

function applyNewlandMountainOutletHeight(x, z, height) {
  if (!isInsideBounds(NEWLAND_MOUNTAIN_OUTLET_BOUNDS, x, z)) return height
  const sample = getNewlandMountainOutletSampleAt(x, z)
  const run = Math.max(0.35, channelBankRun(NEWLAND_MOUNTAIN_OUTLET.cutDepth, NEWLAND_BRAIDED_SLOPE_DEG))
  const apronWidth = 12
  if (sample.distance > sample.halfWidth + run + apronWidth) return height
  const bedNoise = Math.sin(x * 0.12 + z * 0.075) * 0.09 + Math.sin(x * 0.041 - z * 0.062) * 0.06
  const bedTarget = height - NEWLAND_MOUNTAIN_OUTLET.cutDepth + bedNoise
  const carved = applySteepChannelCarve(height, sample.distance, sample.halfWidth, {
    cutDepth: NEWLAND_MOUNTAIN_OUTLET.cutDepth,
    slopeDeg: NEWLAND_BRAIDED_SLOPE_DEG,
    bedTarget,
  })
  const apron = 1 - THREE.MathUtils.smoothstep(sample.distance, sample.halfWidth + run, sample.halfWidth + run + apronWidth)
  return Math.min(height, carved, height - apron * 0.55)
}

function applyNewlandStaticLakeHeight(x, z, height) {
  let result = height
  for (const endpointLake of NEWLAND_STATIC_LAKES) {
    const lake = getNewlandStaticLakeShapeAt(endpointLake, x, z)
    if (lake.edge > endpointLake.shoreRun) continue
    if (Number.isFinite(endpointLake.flatBedY)) {
      const waterY = endpointLake.flatBedY + endpointLake.waterDepth
      const radialT = lake.radial / Math.max(0.001, lake.boundary)
      if (lake.edge <= 0) {
        const bankT = THREE.MathUtils.smoothstep(radialT, endpointLake.flatBedRadius ?? 0.68, (endpointLake.flatBedRadius ?? 0.68) + (endpointLake.flatBedFeather ?? 0.12))
        const bankShape = Math.pow(bankT, endpointLake.steepBankPower ?? 2.4)
        const target = THREE.MathUtils.lerp(endpointLake.flatBedY, waterY - 0.22, bankShape)
        result = Math.min(result, target)
      } else {
        const shelfRun = endpointLake.shoreShelfRun ?? endpointLake.shoreRun
        const backRun = endpointLake.shoreBackRun ?? Math.max(0.001, endpointLake.shoreRun - shelfRun)
        if (lake.edge <= shelfRun) {
          const shelfT = THREE.MathUtils.smoothstep(lake.edge, 0, shelfRun)
          const shelfY = waterY + THREE.MathUtils.lerp(-0.08, endpointLake.shoreShelfRise ?? 0.55, shelfT)
          result = Math.min(result, shelfY)
        } else {
          const outsideT = THREE.MathUtils.smoothstep(lake.edge, shelfRun, shelfRun + backRun)
          const edgeDrop = (endpointLake.edgeDrop ?? 0) * (1 - outsideT)
          result = Math.min(result, height - edgeDrop)
        }
      }
      continue
    }
    const shore = 1 - THREE.MathUtils.smoothstep(lake.edge, 0, endpointLake.shoreRun)
    const core = 1 - THREE.MathUtils.smoothstep(lake.radial / Math.max(0.001, lake.boundary), 0.18, 0.92)
    const bedNoise = Math.sin(x * 0.12 + z * 0.08 + endpointLake.seed * 0.01) * 0.04
      + Math.sin(x * 0.05 - z * 0.11 + endpointLake.seed * 0.017) * 0.03
    const edgeBand = 1 - THREE.MathUtils.smoothstep(Math.abs(lake.edge), 0, Math.max(0.001, endpointLake.shoreRun * 0.58))
    const depression = endpointLake.waterDepth + (endpointLake.extraDepth ?? 0) + 0.24 * shore + 0.26 * core - bedNoise
    result = Math.min(result, height - depression * shore - (endpointLake.edgeDrop ?? 0) * edgeBand)
  }
  return result
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

// 新区（向 −X/−Z 外扩部分）连绵草地丘陵：忽略高度图边缘 clamp，用干净多倍频起伏；
// 在旧图边界（−760）外用 smoothstep 平滑接缝到新基底，旧图本身不动。只做丘陵，不放其它。
// 域扭曲多倍频脊状噪声 0..1：用于雪脊/矮山的锯齿状起伏（craggy）
function alpineRidgedNoise(x, z) {
  const wx = x + Math.sin(x * 0.006 + z * 0.009) * 40 + Math.sin(z * 0.013) * 18
  const wz = z + Math.sin(z * 0.007 - x * 0.008) * 40 + Math.sin(x * 0.015) * 18
  const r1 = 1 - Math.abs(Math.sin(wx * 0.0042 + wz * 0.0031))
  const r2 = 1 - Math.abs(Math.sin(wx * 0.0098 - wz * 0.0081))
  const r3 = 1 - Math.abs(Math.sin(wx * 0.0205 + wz * 0.0233))
  return r1 * 0.55 + r2 * 0.30 + r3 * 0.15
}

function taishanNewlandRidgeLift(x, z, crag) {
  const ax = -850
  const az = -1180
  const bx = -560
  const bz = -860
  const vx = bx - ax
  const vz = bz - az
  const len = Math.hypot(vx, vz)
  const ux = vx / len
  const uz = vz / len
  const wx = x - ax
  const wz = z - az
  const along = THREE.MathUtils.clamp((wx * ux + wz * uz) / len, 0, 1)
  const side = Math.abs(wx * -uz + wz * ux)
  if (side > 260) return 0

  const alongMask = Math.pow(Math.sin(along * Math.PI), 0.72)
  const crest = Math.exp(-Math.pow(side / 42, 1.18))
  const shoulder = Math.exp(-Math.pow(side / 145, 1.55)) * 0.34
  const cut = 1 - THREE.MathUtils.smoothstep(side, 180, 260)
  const brokenCrest = 0.88
    + Math.sin(along * Math.PI * 5.0 + 0.8) * 0.10
    + Math.sin(x * 0.027 - z * 0.018) * 0.05
  return 86 * alongMask * cut * (crest * brokenCrest + shoulder * (0.72 + crag * 0.34))
}

function huangshanNewlandRidgeLift(x, z, crag) {
  const ax = -1160
  const az = 610
  const bx = -860
  const bz = 742
  const vx = bx - ax
  const vz = bz - az
  const len = Math.hypot(vx, vz)
  const ux = vx / len
  const uz = vz / len
  const wx = x - ax
  const wz = z - az
  const along = THREE.MathUtils.clamp((wx * ux + wz * uz) / len, 0, 1)
  const sideSigned = wx * -uz + wz * ux
  const side = Math.abs(sideSigned)
  if (side > 210) return 0

  const alongMask = Math.pow(Math.sin(along * Math.PI), 0.64)
  const core = 1 - THREE.MathUtils.smoothstep(side, 14, 32)
  const shoulder = Math.exp(-Math.pow(side / 118, 1.35)) * 0.42
  const outerCut = 1 - THREE.MathUtils.smoothstep(side, 150, 210)
  const crestRipple = 0.94
    + Math.sin(along * Math.PI * 4.6 + 1.5) * 0.055
    + Math.sin(x * 0.033 + z * 0.019) * 0.035

  const knobs =
    Math.exp(-Math.pow((along - 0.25) / 0.08, 2) - Math.pow((sideSigned - 38) / 34, 2)) * 13
    + Math.exp(-Math.pow((along - 0.64) / 0.10, 2) - Math.pow((sideSigned + 45) / 38, 2)) * 16
    + Math.exp(-Math.pow((along - 0.78) / 0.07, 2) - Math.pow((sideSigned - 26) / 30, 2)) * 11

  return alongMask * outerCut * (80 * (core * crestRipple + shoulder * (0.75 + crag * 0.30)) + knobs)
}

const REFERENCE_HEIGHT_PATCH_CENTER = { x: -647, z: -650 }
const REFERENCE_HEIGHT_PATCH_RADIUS = 560
const REFERENCE_HEIGHT_PATCH_FADE_RADIUS = 680

function referencePatchSegmentSample(x, z, ax, az, bx, bz) {
  const vx = bx - ax
  const vz = bz - az
  const lenSq = Math.max(0.0001, vx * vx + vz * vz)
  const t = THREE.MathUtils.clamp(((x - ax) * vx + (z - az) * vz) / lenSq, 0, 1)
  const px = ax + vx * t
  const pz = az + vz * t
  return {
    t,
    distance: Math.hypot(x - px, z - pz),
  }
}

function referencePatchRidgeLift(x, z, ax, az, bx, bz, width, lift, shoulderWidth = width * 2.8, shoulderLift = lift * 0.22) {
  const sample = referencePatchSegmentSample(x, z, ax, az, bx, bz)
  const along = Math.pow(Math.sin(sample.t * Math.PI), 0.62)
  const crest = Math.exp(-Math.pow(sample.distance / width, 1.52))
  const shoulder = Math.exp(-Math.pow(sample.distance / shoulderWidth, 1.35))
  return along * (crest * lift + shoulder * shoulderLift)
}

function referencePatchGullyCut(x, z, ax, az, bx, bz, width, cut) {
  const sample = referencePatchSegmentSample(x, z, ax, az, bx, bz)
  const along = Math.pow(THREE.MathUtils.smoothstep(sample.t, 0.08, 0.94), 0.72)
  const channel = Math.exp(-Math.pow(sample.distance / width, 1.38))
  const apron = Math.exp(-Math.pow(sample.distance / (width * 3.2), 1.55)) * 0.24
  return along * (channel + apron) * cut
}

function applyReferenceHeightPatch(x, z, height) {
  const dx = x - REFERENCE_HEIGHT_PATCH_CENTER.x
  const dz = z - REFERENCE_HEIGHT_PATCH_CENTER.z
  const dist = Math.hypot(dx, dz)
  if (dist >= REFERENCE_HEIGHT_PATCH_FADE_RADIUS) return height

  const fade = 1 - THREE.MathUtils.smoothstep(dist, REFERENCE_HEIGHT_PATCH_RADIUS, REFERENCE_HEIGHT_PATCH_FADE_RADIUS)
  const core = 1 - THREE.MathUtils.smoothstep(dist, 60, REFERENCE_HEIGHT_PATCH_RADIUS)
  const broad = 1 - THREE.MathUtils.smoothstep(dist, 210, REFERENCE_HEIGHT_PATCH_FADE_RADIUS)
  const crag = alpineRidgedNoise(x * 1.35 + 41, z * 1.35 - 29)
  let lift = 16 * Math.pow(Math.max(0, broad), 1.2) + 18 * Math.pow(Math.max(0, core), 1.6)

  lift += referencePatchRidgeLift(x, z, -1030, -865, -255, -430, 62, 42, 185, 13)
  lift += referencePatchRidgeLift(x, z, -850, -760, -1035, -520, 42, 24, 130, 7)
  lift += referencePatchRidgeLift(x, z, -720, -680, -520, -930, 38, 22, 118, 6)
  lift += referencePatchRidgeLift(x, z, -610, -590, -325, -690, 36, 18, 112, 5)
  lift += referencePatchRidgeLift(x, z, -690, -735, -900, -1045, 42, 20, 125, 6)

  let cut = 0
  cut += referencePatchGullyCut(x, z, -690, -630, -1125, -505, 26, 13)
  cut += referencePatchGullyCut(x, z, -705, -690, -930, -975, 24, 14)
  cut += referencePatchGullyCut(x, z, -640, -615, -460, -300, 20, 9)
  cut += referencePatchGullyCut(x, z, -620, -675, -305, -735, 22, 10)
  cut += referencePatchGullyCut(x, z, -760, -660, -1010, -760, 18, 8)
  cut += referencePatchGullyCut(x, z, -555, -620, -355, -520, 17, 7)

  const ribbing = Math.max(
    0,
    1 - Math.abs(Math.sin((x + z * 0.42) * 0.030)),
    1 - Math.abs(Math.sin((x * 0.55 - z) * 0.026 + 1.7)),
  )
  const fineCut = THREE.MathUtils.smoothstep(ribbing, 0.86, 0.985) * broad * (1 - core * 0.45) * 2.6
  const brokenCrest = (crag - 0.45) * 7.0 * Math.pow(Math.max(0, broad), 0.9)

  return height + (lift + brokenCrest - cut - fineCut) * fade
}

// 新区（−X/−Z 外扩）完整地形：近区连绵丘陵 → 中景矮山 → 外缘连续雪脊（内缓外陡，比着参考图）。
// 雪/岩着色由地形材质按高度自动出；外缘超出 bounds 部分由 applyMountainEdgeHeight 截成 void 崖藏山后。
function applyExtendedRegionHeight(x, z, height) {
  const w = Math.max(
    THREE.MathUtils.smoothstep(-x, 760, 920),   // 进入 −X 新区
    THREE.MathUtils.smoothstep(-z, 760, 920),   // 进入 −Z 新区
  )
  if (w <= 0) return height
  // 连绵丘陵基底
  const hills =
      Math.sin(x * 0.0115 + z * 0.0083) * 7.0
    + Math.sin(x * 0.0068 - z * 0.0121) * 5.0
    + Math.sin(x * 0.0235 + z * 0.0192) * 2.2
    + Math.sin(x * 0.039 - z * 0.031) * 1.1
  let base = 3.0 + hills
  const crag = alpineRidgedNoise(x, z)

  // ── 外缘雪脊：随 −X/−Z 新边界内移 800m（−700 起脚 → −1500 脊顶），内缓外陡 ──
  const eX = THREE.MathUtils.smoothstep(-x, 700, 1500)
  const eZ = THREE.MathUtils.smoothstep(-z, 700, 1500)
  const e = Math.max(eX, eZ)
  if (e > 0) {
    const shape = Math.pow(e, 2.3)                       // 内侧长缓、临外缘急升
    base += 230 * shape * (0.60 + crag * 0.60)           // 连续雪脊 + 锯齿峰
    base += 175 * Math.pow(eX * eZ, 0.7) * (0.8 + crag * 0.4)  // −X−Z 角填成连绵主峰群（填补转角缺口）
  }

  // ── 中近景独立矮山（低于雪线 → 绿/岩山丘，长草长树）──
  const foot = (cx, cz, r, h) => {
    const d = Math.hypot(x - cx, z - cz) / r
    if (d >= 1) return 0
    const b = 1 - THREE.MathUtils.smoothstep(0, 1, d)
    return h * Math.pow(b, 1.3) * (0.65 + crag * 0.6)
  }
  base += foot(-1250, -650, 360, 55)
        + foot(-1550, -1550, 400, 80)
        + foot(-700, -1300, 300, 22)
        + foot(-950, -1000, 260, 16)
        + taishanNewlandRidgeLift(x, z, crag)
        + huangshanNewlandRidgeLift(x, z, crag)

  return THREE.MathUtils.lerp(height, base, w)
}

function applyEastRimMegaslopeHeight(x, z, height) {
  const dx = x - EAST_RIM_MEGASLOPE.x
  const dz = z - EAST_RIM_MEGASLOPE.z
  const along = dx * EAST_RIM_MEGASLOPE.downX + dz * EAST_RIM_MEGASLOPE.downZ
  const side = Math.abs(dx * EAST_RIM_MEGASLOPE.sideX + dz * EAST_RIM_MEGASLOPE.sideZ)
  if (along < -EAST_RIM_MEGASLOPE.backRun - 140 || along > EAST_RIM_MEGASLOPE.length || side > EAST_RIM_MEGASLOPE.halfWidth + EAST_RIM_MEGASLOPE.feather) return height

  const outerFade = THREE.MathUtils.smoothstep(along, -EAST_RIM_MEGASLOPE.backRun - 120, -EAST_RIM_MEGASLOPE.backRun + 45)
  const downhill = 1 - THREE.MathUtils.smoothstep(along, -EAST_RIM_MEGASLOPE.backRun, EAST_RIM_MEGASLOPE.length)
  const sideFade = 1 - THREE.MathUtils.smoothstep(side, EAST_RIM_MEGASLOPE.halfWidth, EAST_RIM_MEGASLOPE.halfWidth + EAST_RIM_MEGASLOPE.feather)
  const crest = 0.94
    + Math.sin(x * 0.010 + z * 0.013) * 0.045
    + Math.sin(x * 0.026 - z * 0.018) * 0.025
  const lift = EAST_RIM_MEGASLOPE.height * Math.pow(Math.max(0, downhill), 1.18) * outerFade * sideFade * crest
  const shoulder = 34 * Math.pow(Math.max(0, downhill), 1.7) * (1 - THREE.MathUtils.smoothstep(side, EAST_RIM_MEGASLOPE.halfWidth * 0.58, EAST_RIM_MEGASLOPE.halfWidth))
  return height + lift + shoulder
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
// 雪山峰体；x/z 定中心，rx/rz 定占地，h 定高度，axis/corePower 控制形状，ridge* 控制主脊强度/频率/偏移。

const SNOW_RIDGE_LINES = [
  { a: { x: -690, z: 298 }, b: { x: -555, z: 548 }, h: 56, width: 42, freq: 0.013, freq2: 0.019, phase: 0.8, rough: 0.44 },
  { a: { x: -555, z: 548 }, b: { x: -445, z: 590 }, h: 46, width: 38, freq: 0.016, freq2: 0.021, phase: 1.2, rough: 0.39 },
  { a: { x: -445, z: 590 }, b: { x: -290, z: 630 }, h: 58, width: 40, freq: 0.014, freq2: 0.017, phase: 0.3, rough: 0.36 },
  { a: { x: -290, z: 630 }, b: { x: -120, z: 500 }, h: 44, width: 36, freq: 0.018, freq2: 0.015, phase: 0.6, rough: 0.35 },
  { a: { x: -680, z: 350 }, b: { x: -540, z: 390 }, h: 34, width: 32, freq: 0.021, freq2: 0.009, phase: 2.2, rough: 0.31 },
]
// 雪山连接山脊；a/b 是线段端点，h/width 控制山脊高度和宽度，freq/phase/rough 控制破碎感。

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
  push(getBestGlobalWetGullySampleAt(x, z))
  push(getBestNewlandBraidedSampleAt(x, z))
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
// 交汇水潭字段：x/z 中心，rInner/rOuter 是池心和过渡半径，depth 是默认水深，surfaceY/bedY 可用实测绝对高度锚定。
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
      best = { edge, distance: s.distance, halfWidth: s.halfWidth, waterY: s.waterY, dirX: s.dirX, dirZ: s.dirZ, x: s.x, z: s.z, depth, skipNetworkCarve: !!s.skipNetworkCarve }
    }
  }
  consider(getRiverSampleAt(x, z), MAIN_RIVER_WATER_DEPTH)
  consider(getBestBranchSampleAt(x, z), BRANCH_RIVER_WATER_DEPTH)
  consider(getBestWetGullyStreamSampleAt(x, z), GULLY_STREAM_WATER_DEPTH)
  const globalWet = getBestGlobalWetGullySampleAt(x, z)
  consider(globalWet, globalWet?.waterDepth ?? 0)
  const braided = getBestNewlandBraidedSampleAt(x, z)
  consider(braided, braided?.waterDepth ?? 0)
  if (isInsideBounds(NEWLAND_MOUNTAIN_OUTLET_BOUNDS, x, z)) {
    const outlet = getNewlandMountainOutletSampleAt(x, z)
    consider(outlet, NEWLAND_MOUNTAIN_OUTLET.waterDepth)
  }
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
const CHANNEL_NETWORK_CARVE_RUN = Math.max(0.35, channelBankRun(RIVER_CHANNEL_MIN_CUT, RIVER_CHANNEL_MIN_SLOPE_DEG)) // 统一水道碳刻岸坡水平宽度；由切深和坡角派生，通常不直接改。
function applyChannelNetworkCarve(x, z, height) {
  const s = sampleChannelNetwork(x, z)
  if (!s) return height
  if (s.skipNetworkCarve) return height
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
const GRADE_MAX_SLOPE = Math.tan(THREE.MathUtils.degToRad(12)) // 湿河道纵向最大上坡率；角度越小水面越顺但会挖得更深。
const GRADE_BANK_RUN = Math.max(0.35, channelBankRun(RIVER_CHANNEL_MIN_CUT, RIVER_CHANNEL_MIN_SLOPE_DEG)) // 限坡影响到河岸外的水平宽度；派生值，通常改切深/坡角。
const GRADE_SAMPLE_STEP = 3 // 沿河采样步距；调小限坡更精细但预计算更多，调大更快但可能漏短台阶。
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
    map: applyRepeat(texLoader.load('/textures/nature_pbr/aerial_ground_rock/aerial_ground_rock_diff_1k.jpg'), { color: true }),
    normalMap: applyRepeat(texLoader.load('/textures/nature_pbr/aerial_ground_rock/aerial_ground_rock_nor_gl_1k.jpg')),
    roughnessMap: applyRepeat(texLoader.load('/textures/nature_pbr/aerial_ground_rock/aerial_ground_rock_rough_1k.jpg')),
    aoMap: applyRepeat(texLoader.load('/textures/nature_pbr/aerial_ground_rock/aerial_ground_rock_ao_1k.jpg')),
    roughness: 1,
    metalness: 0,
    normalScale: new THREE.Vector2(0.78, 0.78),
    aoMapIntensity: 0.72,
  })

  const uniforms = {
    uRockMap: { value: applyRepeat(texLoader.load('/textures/nature_pbr/aerial_rocks_02/aerial_rocks_02_diff_1k.jpg'), { color: true }) },
    uRockNormalMap: { value: applyRepeat(texLoader.load('/textures/nature_pbr/aerial_rocks_02/aerial_rocks_02_nor_gl_1k.jpg')) },
    uRockRoughnessMap: { value: applyRepeat(texLoader.load('/textures/nature_pbr/aerial_rocks_02/aerial_rocks_02_rough_1k.jpg')) },
    uRockAoMap: { value: applyRepeat(texLoader.load('/textures/nature_pbr/aerial_rocks_02/aerial_rocks_02_ao_1k.jpg')) },
    uMossRockMap: { value: applyRepeat(texLoader.load('/textures/nature_pbr/aerial_grass_rock/aerial_grass_rock_diff_1k.jpg'), { color: true }) },
    uMountainRockMap: { value: applyRepeat(texLoader.load(MOUNTAIN_ROCK_TEXTURE_URL), { color: true }) },
    uDebrisMap: { value: applyRepeat(texLoader.load('/textures/ground_debris/polyhaven/dry_decay_leaves_diff_1k.jpg'), { color: true }) },
    uDirtUvScale: { value: 0.2 },
    uRockUvScale: { value: 0.18 },
    uMountainRockUvScale: { value: 0.018 },
    uRiverBankRockUvScale: { value: 0.055 },
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
      uniform sampler2D uMossRockMap;
      uniform sampler2D uMountainRockMap;
      uniform sampler2D uDebrisMap;
      uniform float uDirtUvScale;
      uniform float uRockUvScale;
      uniform float uMountainRockUvScale;
      uniform float uRiverBankRockUvScale;

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

      vec2 mountainWarpUv(vec2 uv, float s) {
        float warpA = terrainNoise(uv * 0.42 + vec2(13.1, 5.7));
        float warpB = terrainNoise(uv.yx * 0.31 + vec2(2.4, 17.8));
        return uv + vec2(warpA - 0.5, warpB - 0.5) * (0.55 / max(s, 0.0001));
      }

      vec3 mountainTriplanarColor(sampler2D t, float s, vec3 w) {
        vec3 cx = texture2D(t, mountainWarpUv(vWorldPos.zy, s) * s).rgb;
        vec3 cy = texture2D(t, mountainWarpUv(vWorldPos.xz, s) * s + vec2(0.17, 0.29)).rgb;
        vec3 cz = texture2D(t, mountainWarpUv(vWorldPos.xy, s) * s + vec2(0.31, 0.11)).rgb;
        vec3 base = cx * w.x + cy * w.y + cz * w.z;
        vec3 soft = texture2D(t, (vWorldPos.xz + vec2(vWorldPos.y * 0.23, -vWorldPos.y * 0.17)) * s * 0.62).rgb;
        return mix(base, soft, 0.18);
      }

      float brokenSnowStreak(vec3 w) {
        float longBreak = terrainNoise(vWorldPos.xz * 0.055 + vec2(21.6, 3.4));
        float crossBreak = terrainNoise((vWorldPos.xz + vec2(vWorldPos.y * 0.48, -vWorldPos.y * 0.31)) * 0.082);
        float sideBreak = terrainNoiseTP(0.115, w);
        return smoothstep(0.50, 0.83, longBreak * 0.40 + crossBreak * 0.36 + sideBreak * 0.34);
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

      float terrainGlobalDendriticLine(vec2 p, float scale, float angle, float phase) {
        float ca = cos(angle);
        float sa = sin(angle);
        float u = p.x * ca + p.y * sa;
        float v = -p.x * sa + p.y * ca;
        float denom = max(0.001, scale * 1000.0);
        float wu = u
          + sin(v * scale * 0.62 + phase) * (118.0 / denom)
          + sin((u + v) * scale * 0.28 - phase * 0.7) * (54.0 / denom);
        float wv = v
          + sin(u * scale * 0.54 - phase * 1.3) * (92.0 / denom);
        float trunk = abs(sin(wu * scale + sin(wv * scale * 0.45 + phase) * 1.65));
        float branchA = abs(sin((wu * 0.62 + wv * 0.78) * scale * 1.34 + sin(wu * scale * 0.34 - phase) * 1.1));
        float branchB = abs(sin((wu * 0.88 - wv * 0.38) * scale * 1.78 + sin(wv * scale * 0.48 + phase * 1.7) * 0.85));
        return min(trunk, min(branchA * 1.08, branchB * 1.18));
      }

      vec2 terrainGlobalDendriticMask(vec3 p) {
        float major = terrainGlobalDendriticLine(p.xz, 0.0062, -0.58, 1.7);
        float branch = terrainGlobalDendriticLine(p.xz + vec2(87.0, -41.0), 0.0115, 0.34, 4.1);
        float fine = terrainGlobalDendriticLine(p.xz + vec2(-29.0, 113.0), 0.0235, -1.18, 2.8);
        float micro = terrainGlobalDendriticLine(p.xz + vec2(173.0, 59.0), 0.039, 0.82, 6.2);
        float majorCore = 1.0 - smoothstep(0.0, 0.060, major);
        float majorApron = 1.0 - smoothstep(0.043, 0.245, major);
        float branchCore = 1.0 - smoothstep(0.0, 0.047, branch);
        float branchApron = 1.0 - smoothstep(0.034, 0.205, branch);
        float fineCore = 1.0 - smoothstep(0.0, 0.034, fine);
        float fineApron = 1.0 - smoothstep(0.024, 0.150, fine);
        float microCore = 1.0 - smoothstep(0.0, 0.022, micro);
        float heightFade = 1.0 - smoothstep(210.0, 310.0, p.y);
        float core = max(max(majorCore, branchCore * 0.82), max(fineCore * 0.48, microCore * 0.26)) * heightFade;
        float apron = max(max(majorApron, branchApron * 0.78), fineApron * 0.42) * heightFade;
        return vec2(core, apron);
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
${TERRAIN_NEWLAND_BRAID_SAMPLE_GLSL}
${TERRAIN_NEWLAND_MOUNTAIN_OUTLET_SAMPLE_GLSL}
${TERRAIN_NEWLAND_DENDRITIC_GULLY_SAMPLE_GLSL}
${TERRAIN_EAST_RIM_DRY_RIVER_SAMPLE_GLSL}
${TERRAIN_LOWLAND_EROSION_GULLY_SAMPLE_GLSL}

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
        best = terrainGullySegment(p, vec2(-720.0, -1100.0), vec2(-790.0, -1010.0), 0.0, best);
        best = terrainGullySegment(p, vec2(-790.0, -1010.0), vec2(-850.0, -940.0), 0.0, best);
        best = terrainGullySegment(p, vec2(-850.0, -940.0), vec2(-900.0, -875.0), 0.0, best);
        best = terrainGullySegment(p, vec2(-570.0, -980.0), vec2(-690.0, -940.0), 0.0, best);
        best = terrainGullySegment(p, vec2(-690.0, -940.0), vec2(-805.0, -910.0), 0.0, best);
        best = terrainGullySegment(p, vec2(-805.0, -910.0), vec2(-870.0, -860.0), 0.0, best);
        best = terrainGullySegment(p, vec2(-1120.0, -650.0), vec2(-1035.0, -700.0), 0.0, best);
        best = terrainGullySegment(p, vec2(-1035.0, -700.0), vec2(-950.0, -760.0), 0.0, best);
        best = terrainGullySegment(p, vec2(-950.0, -760.0), vec2(-900.0, -825.0), 0.0, best);
        best = terrainGullySegment(p, vec2(-1020.0, -520.0), vec2(-940.0, -585.0), 0.0, best);
        best = terrainGullySegment(p, vec2(-940.0, -585.0), vec2(-865.0, -670.0), 0.0, best);
        best = terrainGullySegment(p, vec2(-865.0, -670.0), vec2(-825.0, -735.0), 0.0, best);
        return best;
      }

      float southBasinLakeBoundaryScale(float angle) {
        float tau = 6.28318531;
        float a = mod(angle + tau, tau);
        float d0 = 0.78539816;
        float d1 = 1.53588974;
        float d2 = 2.53072742;
        float d3 = 3.14159265;
        float d4 = 3.66519143;
        float d5 = 4.27605667;
        float d6 = 5.06145483;
        float d7 = 5.93411946;
        if (a < d0) a += tau;
        float t = 0.0;
        if (a <= d1) { t = smoothstep(d0, d1, a); return mix(1.12, 1.05, t); }
        if (a <= d2) { t = smoothstep(d1, d2, a); return mix(1.05, 0.96, t); }
        if (a <= d3) { t = smoothstep(d2, d3, a); return mix(0.96, 0.90, t); }
        if (a <= d4) { t = smoothstep(d3, d4, a); return mix(0.90, 0.86, t); }
        if (a <= d5) { t = smoothstep(d4, d5, a); return mix(0.86, 0.78, t); }
        if (a <= d6) { t = smoothstep(d5, d6, a); return mix(0.78, 0.92, t); }
        if (a <= d7) { t = smoothstep(d6, d7, a); return mix(0.92, 1.02, t); }
        t = smoothstep(d7, d0 + tau, a);
        return mix(1.02, 1.12, t);
      }

      float southBasinLakeEdge(vec2 p) {
        float rot = -0.13962634;
        float c = cos(rot);
        float s = sin(rot);
        vec2 d = p - vec2(-294.0, -710.0);
        float lx = d.x * c + d.y * s;
        float lz = -d.x * s + d.y * c;
        vec2 n = vec2(lx / 45.0, lz / 45.0);
        float radial = length(n);
        float boundary = southBasinLakeBoundaryScale(atan(n.y, n.x));
        return (radial - boundary) * 45.0;
      }
    ` + shader.fragmentShader
    .replace(
      '#include <map_fragment>',
      `
      vec2 dirtUv = terrainDirtUv();
      vec3 tpW = tpWeights();
      // 反照率走三平面：陡坡不再把草/岩沿竖直方向拉成条纹
      vec4 dirtColor = vec4(triplanarColor(map, uDirtUvScale, tpW), 1.0);
      // 土壤加深：保留新 PBR 航拍纹理的细节，同时压掉旧版浅沙黄游戏感
      dirtColor.rgb *= vec3(0.70, 0.67, 0.58);
      vec4 rockColor = vec4(triplanarColor(uRockMap, uRockUvScale, tpW), 1.0);
      vec3 mossRockColor = triplanarColor(uMossRockMap, 0.18, tpW);
      vec3 debrisColor = texture2D(uDebrisMap, dirtUv * 0.46 + vec2(0.17, 0.09)).rgb;
      float rockMask = terrainRockMask();
      float dampMask = terrainDampMask() * (1.0 - rockMask);
      float debrisMask = smoothstep(0.55, 0.9, terrainNoise(vWorldPos.xz * 0.13 + vec2(6.2, 1.4))) * (1.0 - rockMask) * 0.22;

      vec3 dirt = mix(dirtColor.rgb, dirtColor.rgb * vec3(0.52, 0.56, 0.58), dampMask * 0.5);
      dirt = mix(dirt, debrisColor * vec3(0.72, 0.68, 0.58), debrisMask);
      vec3 rock = rockColor.rgb * vec3(0.86, 0.88, 0.84);
      vec3 terrainColor = mix(dirt, rock, rockMask);
      float meadowBroad = terrainNoise(vWorldPos.xz * 0.030 + vec2(14.2, 5.6));
      float meadowPatch = terrainNoise(vWorldPos.xz * 0.085 + vec2(3.7, 18.4));
      float meadowFine = terrainNoise(vWorldPos.xz * 0.19 + vec2(21.3, 9.1));
      float meadowGentle = smoothstep(0.52, 0.82, clamp(dot(normalize(vWorldNormal), vec3(0.0, 1.0, 0.0)), 0.0, 1.0));
      float meadowHeightMask = 1.0 - smoothstep(56.0, 88.0, vWorldPos.y);
      float meadowOpenSoil = smoothstep(0.70, 0.92, terrainNoise(vWorldPos.xz * 0.055 + vec2(9.8, 2.4))) * 0.28;
      float meadowMask = meadowGentle * meadowHeightMask * (1.0 - rockMask) * (0.62 + meadowBroad * 0.24) * (1.0 - meadowOpenSoil);
      vec3 meadowFresh = vec3(0.230, 0.330, 0.155);
      vec3 meadowDeep = vec3(0.105, 0.190, 0.080);
      vec3 meadowDry = vec3(0.330, 0.300, 0.195);
      vec3 meadowColor = mix(meadowDeep, meadowFresh, meadowBroad);
      meadowColor = mix(meadowColor, meadowDry, smoothstep(0.56, 0.86, meadowPatch) * 0.45);
      meadowColor *= 0.90 + meadowFine * 0.16;
      terrainColor = mix(terrainColor, meadowColor, clamp(meadowMask * 0.56, 0.0, 0.66));
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
      // 多色斑驳：把水线拆成深湿泥 / 浅淤泥 / 青苔点缀 / 外侧岸土，
      // 避免蓝水直接硬接浅色坡面。
      float mottleA = terrainNoise(vWorldPos.xz * 0.22 + vec2(13.1, 5.5));
      float mottleB = terrainNoise(vWorldPos.xz * 0.55 + vec2(4.3, 18.9));
      float mottleC = terrainNoise(vWorldPos.xz * 1.05 + vec2(9.7, 2.2));
      vec3 bankMoss = mix(vec3(0.075, 0.165, 0.070), mossRockColor * vec3(0.46, 0.72, 0.34), 0.62) * (0.86 + riverBankNoise * 0.24);
      vec3 riverClay = vec3(0.30, 0.24, 0.15) * (0.84 + riverBankNoise * 0.26);   // 偏暖赭黄黏土
      vec3 warmHumus = vec3(0.13, 0.10, 0.06) * (0.82 + mottleB * 0.28);          // 暖棕腐殖
      vec3 wetMud = vec3(0.036, 0.029, 0.021) * (0.78 + riverBankNoise * 0.24);
      vec3 shallowSilt = vec3(0.255, 0.235, 0.155) * (0.84 + mottleA * 0.18);
      vec3 outerBankSoil = mix(riverClay, warmHumus, 0.42) * (0.88 + mottleB * 0.18);
      vec3 wetSheen = vec3(0.14, 0.13, 0.095) * (0.74 + riverWetBreakup * 0.34);
      float shoreDistance = wetDist - riverWidth;
      float wetMudBand = 1.0 - smoothstep(0.0, 5.8, shoreDistance);
      float shallowSiltBand = (1.0 - smoothstep(4.5, 14.5, shoreDistance)) * smoothstep(1.8, 6.8, shoreDistance);
      float outerBankBand = (1.0 - smoothstep(12.0, 28.0, shoreDistance)) * smoothstep(8.0, 15.0, shoreDistance);
      float mossDampBand = (1.0 - smoothstep(2.0, 20.0, shoreDistance)) * smoothstep(1.0, 7.5, shoreDistance);
      float mossFlecks = smoothstep(0.54, 0.86, mottleC * 0.62 + riverWetBreakup * 0.38) * mossDampBand * (0.46 + riverMoss * 0.62);
      vec3 bankSoil = mix(outerBankSoil, shallowSilt, shallowSiltBand);
      bankSoil = mix(bankSoil, wetMud, wetMudBand);
      bankSoil = mix(bankSoil, outerBankSoil, outerBankBand * 0.28);
      bankSoil = mix(bankSoil, bankMoss, mossFlecks * 0.74);
      bankSoil = mix(bankSoil, warmHumus, smoothstep(0.42, 0.80, mottleA) * riverBank * 0.24);
      // 覆盖整条近岸带：合并湿泥、浅淤泥、外侧岸土和青苔点缀（最外到 riverWidth+34）
      float bankZone = clamp(max(max(riverWetEdge, riverBank), riverMoss * 0.85), 0.0, 1.0);
      terrainColor = mix(terrainColor, bankSoil, bankZone * 0.96);
      terrainColor = mix(terrainColor, wetSheen, wetMudBand * smoothstep(0.52, 0.92, riverWetBreakup) * 0.34);
      float centralRiverBelt = exp(-pow((riverSample.y - 0.56) / 0.25, 2.0));
      float centralRiverWidth = mix(4.8, 7.8, pow(riverSample.y, 0.62)) + centralRiverBelt * 3.2;
      float centralWetEdge = 1.0 - smoothstep(centralRiverWidth - 0.5, centralRiverWidth + 22.0, wetDist);
      // 把浅色点沙坝推到更外侧，给紧贴水边的深色湿泥让出空间
      float centralPointBar = (1.0 - smoothstep(centralRiverWidth + 12.0, centralRiverWidth + 30.0, riverSample.x)) * smoothstep(centralRiverWidth + 9.0, centralRiverWidth + 16.0, riverSample.x);
      float centralFloodplain = (1.0 - smoothstep(centralRiverWidth + 26.0, centralRiverWidth + 92.0 + centralRiverBelt * 38.0, riverSample.x)) * smoothstep(centralRiverWidth + 14.0, centralRiverWidth + 42.0, riverSample.x);
      float centralRiverNoise = terrainNoise(vWorldPos.xz * 0.31 + vec2(6.4, 3.9));
      vec3 centralSand = vec3(0.48, 0.44, 0.34) * (0.86 + centralRiverNoise * 0.24);
      vec3 centralFloodplainGreen = vec3(0.18, 0.27, 0.14) * (0.82 + centralRiverNoise * 0.20);
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
      vec3 branchLowGrass = vec3(0.13, 0.21, 0.105) * (0.86 + branchNoise * 0.18);
      // 支流湿泥也斑驳：复用主河 mottle 噪声，棕腐/黏土/苔绿交错
      vec3 branchSoil = branchWetMud;
      branchSoil = mix(branchSoil, warmHumus, smoothstep(0.35, 0.75, mottleA));
      branchSoil = mix(branchSoil, riverClay * 0.92, smoothstep(0.45, 0.85, mottleB) * 0.6);
      branchSoil = mix(branchSoil, bankMoss, smoothstep(0.55, 0.88, mottleC) * 0.5);
      terrainColor = mix(terrainColor, branchGravel, branchBank * 0.42);
      terrainColor = mix(terrainColor, branchLowGrass, branchLowland * 0.30);
      terrainColor = mix(terrainColor, branchSoil, branchWetEdge * 0.82);
      float southLakeEdge = southBasinLakeEdge(vWorldPos.xz);
      float southLakeNoise = terrainNoise(vWorldPos.xz * 0.42 + vec2(31.4, 11.8));
      float southLakeFine = terrainNoise(vWorldPos.xz * 1.05 + vec2(8.6, 27.2));
      float southLakeWetDist = southLakeEdge + (southLakeNoise - 0.5) * 1.6 + (southLakeFine - 0.5) * 0.55;
      float southLakeWetMud = (1.0 - smoothstep(0.0, 7.5, southLakeWetDist)) * smoothstep(-1.5, 0.9, southLakeWetDist);
      float southLakeDryBank = (1.0 - smoothstep(7.0, 17.5, southLakeWetDist)) * smoothstep(4.8, 10.0, southLakeWetDist);
      float southLakeGrassGap = 1.0 - smoothstep(8.6, 11.4, southLakeWetDist);
      vec3 southLakeMud = vec3(0.045, 0.034, 0.023) * (0.76 + southLakeNoise * 0.28);
      vec3 southLakeSheen = vec3(0.120, 0.105, 0.074) * (0.74 + southLakeFine * 0.30);
      vec3 southLakeBank = mix(vec3(0.31, 0.27, 0.17), vec3(0.17, 0.13, 0.075), southLakeNoise) * (0.86 + southLakeFine * 0.18);
      terrainColor = mix(terrainColor, southLakeBank, southLakeDryBank * 0.70);
      terrainColor = mix(terrainColor, southLakeMud, southLakeWetMud * 0.92);
      terrainColor = mix(terrainColor, southLakeSheen, southLakeWetMud * smoothstep(0.52, 0.86, southLakeFine) * 0.24);
      terrainColor = mix(terrainColor, southLakeBank, southLakeGrassGap * smoothstep(0.30, 0.72, southLakeDryBank) * 0.36);
      vec3 newlandBraidSample = terrainNewlandBraidSample(vWorldPos.xz);
      float newlandBraidWidth = mix(5.2, 8.4, pow(newlandBraidSample.y, 0.72)) + sin(newlandBraidSample.y * 3.14159265) * 0.9;
      float newlandBraidEdgeNoise = (terrainNoise(vWorldPos.xz * 0.24 + vec2(12.7, 4.9)) - 0.5) * 2.2;
      float newlandBraidWetDist = newlandBraidSample.x + newlandBraidEdgeNoise;
      float newlandBraidWetEdge = 1.0 - smoothstep(newlandBraidWidth - 0.35, newlandBraidWidth + 10.5, newlandBraidWetDist);
      float newlandBraidBank = (1.0 - smoothstep(newlandBraidWidth + 2.0, newlandBraidWidth + 20.0, newlandBraidWetDist)) * smoothstep(newlandBraidWidth + 0.8, newlandBraidWidth + 6.2, newlandBraidWetDist);
      float newlandBraidIsland = (1.0 - smoothstep(newlandBraidWidth + 10.0, newlandBraidWidth + 30.0, newlandBraidSample.x)) * smoothstep(newlandBraidWidth + 6.0, newlandBraidWidth + 14.0, newlandBraidSample.x);
      float newlandBraidNoise = terrainNoise(vWorldPos.xz * 0.48 + vec2(1.8, 12.4));
      float braidShoreDistance = newlandBraidWetDist - newlandBraidWidth;
      float braidWetMudBand = 1.0 - smoothstep(0.0, 5.2, braidShoreDistance);
      float braidSiltBand = (1.0 - smoothstep(4.0, 13.0, braidShoreDistance)) * smoothstep(1.4, 6.0, braidShoreDistance);
      vec3 braidSand = vec3(0.42, 0.38, 0.27) * (0.86 + newlandBraidNoise * 0.22);
      vec3 braidSilt = vec3(0.275, 0.245, 0.155) * (0.86 + newlandBraidNoise * 0.16);
      vec3 braidWetMud = vec3(0.045, 0.035, 0.023) * (0.80 + newlandBraidNoise * 0.24);
      vec3 braidIslandGrass = vec3(0.13, 0.21, 0.10) * (0.86 + newlandBraidNoise * 0.18);
      vec3 braidSoil = mix(braidSand, braidSilt, braidSiltBand);
      braidSoil = mix(braidSoil, braidWetMud, braidWetMudBand);
      terrainColor = mix(terrainColor, braidSand, newlandBraidBank * 0.42);
      terrainColor = mix(terrainColor, braidIslandGrass, newlandBraidIsland * 0.26);
      terrainColor = mix(terrainColor, braidSoil, newlandBraidWetEdge * 0.86);
      vec3 mountainOutletSample = terrainNewlandMountainOutletSample(vWorldPos.xz);
      float mountainOutletWidth = mix(8.0, 6.0, mountainOutletSample.y) + sin(mountainOutletSample.y * 3.14159265) * 0.7;
      float mountainOutletEdgeNoise = (terrainNoise(vWorldPos.xz * 0.18 + vec2(2.6, 14.1)) - 0.5) * 3.2
                                    + (terrainNoise(vWorldPos.xz * 0.58 + vec2(16.2, 1.7)) - 0.5) * 1.2;
      float mountainOutletWetDist = mountainOutletSample.x + mountainOutletEdgeNoise;
      float mountainOutletWetEdge = 1.0 - smoothstep(mountainOutletWidth - 0.35, mountainOutletWidth + 10.0, mountainOutletWetDist);
      float mountainOutletBank = (1.0 - smoothstep(mountainOutletWidth + 2.0, mountainOutletWidth + 18.0, mountainOutletWetDist)) * smoothstep(mountainOutletWidth + 0.8, mountainOutletWidth + 6.5, mountainOutletWetDist);
      float mountainOutletLowland = (1.0 - smoothstep(mountainOutletWidth + 8.0, mountainOutletWidth + 32.0, mountainOutletSample.x)) * smoothstep(mountainOutletWidth + 4.0, mountainOutletWidth + 13.0, mountainOutletSample.x);
      float mountainOutletNoise = terrainNoise(vWorldPos.xz * 0.45 + vec2(10.4, 3.2));
      vec3 mountainOutletSand = vec3(0.40, 0.37, 0.28) * (0.86 + mountainOutletNoise * 0.22);
      vec3 mountainOutletWetMud = vec3(0.058, 0.045, 0.030) * (0.82 + mountainOutletNoise * 0.22);
      vec3 mountainOutletGrass = vec3(0.13, 0.22, 0.105) * (0.86 + mountainOutletNoise * 0.18);
      terrainColor = mix(terrainColor, mountainOutletSand, mountainOutletBank * 0.50);
      terrainColor = mix(terrainColor, mountainOutletGrass, mountainOutletLowland * 0.25);
      terrainColor = mix(terrainColor, mountainOutletWetMud, mountainOutletWetEdge * 0.78);
      vec3 gullySample = terrainGullySample(vWorldPos.xz);
      float gullyCore = 1.0 - smoothstep(2.4, 8.5, gullySample.x);
      float gullyApron = (1.0 - smoothstep(8.0, 34.0, gullySample.x)) * smoothstep(3.0, 12.0, gullySample.x);
      float gullyNoise = terrainNoise(vWorldPos.xz * 0.6 + vec2(8.8, 1.9));
      vec3 gullyGravel = vec3(0.43, 0.41, 0.34) * (0.86 + gullyNoise * 0.22);
      vec3 wetCut = vec3(0.105, 0.094, 0.066) * (0.82 + gullyNoise * 0.24);
      vec3 gullyGrass = vec3(0.15, 0.23, 0.12) * (0.86 + gullyNoise * 0.16);
      terrainColor = mix(terrainColor, gullyGravel, gullyApron * 0.22);
      terrainColor = mix(terrainColor, wetCut, gullyCore * 0.74);
      terrainColor = mix(terrainColor, gullyGrass, gullyApron * 0.26);
      vec3 lowlandErosionSample = terrainLowlandErosionGullySample(vWorldPos.xz);
      float lowlandErosionCore = 1.0 - smoothstep(3.2, 8.8, lowlandErosionSample.x);
      float lowlandErosionApron = (1.0 - smoothstep(9.0, 42.0, lowlandErosionSample.x)) * smoothstep(3.5, 13.0, lowlandErosionSample.x);
      float lowlandErosionNoise = terrainNoise(vWorldPos.xz * 0.54 + vec2(22.8, 6.3));
      vec3 lowlandDryCut = vec3(0.18, 0.145, 0.095) * (0.82 + lowlandErosionNoise * 0.24);
      vec3 lowlandGravel = vec3(0.38, 0.36, 0.29) * (0.84 + lowlandErosionNoise * 0.22);
      vec3 lowlandSparseGrass = vec3(0.125, 0.195, 0.095) * (0.82 + lowlandErosionNoise * 0.20);
      terrainColor = mix(terrainColor, lowlandGravel, lowlandErosionApron * 0.46);
      terrainColor = mix(terrainColor, lowlandSparseGrass, lowlandErosionApron * 0.12);
      terrainColor = mix(terrainColor, lowlandDryCut, lowlandErosionCore * 0.86);
      vec3 dendriticGullySample = terrainNewlandDendriticGullySample(vWorldPos.xz);
      float dendriticCore = 1.0 - smoothstep(4.5, 11.0, dendriticGullySample.x);
      float dendriticApron = (1.0 - smoothstep(12.0, 48.0, dendriticGullySample.x)) * smoothstep(4.0, 15.0, dendriticGullySample.x);
      float dendriticNoise = terrainNoise(vWorldPos.xz * 0.42 + vec2(17.4, 6.6));
      vec3 dendriticPaleGrass = vec3(0.24, 0.34, 0.15) * (0.86 + dendriticNoise * 0.18);
      vec3 dendriticDrySilt = vec3(0.42, 0.40, 0.31) * (0.86 + dendriticNoise * 0.18);
      terrainColor = mix(terrainColor, dendriticPaleGrass, dendriticApron * 0.46);
      terrainColor = mix(terrainColor, dendriticDrySilt, dendriticCore * 0.42);
      terrainColor = mix(terrainColor, dendriticPaleGrass, dendriticCore * 0.18);
      vec3 eastRimDrySample = terrainEastRimDryRiverSample(vWorldPos.xz);
      float eastRimDryNoise = terrainNoise(vWorldPos.xz * 0.37 + vec2(12.4, 21.7));
      float eastRimDryDist = eastRimDrySample.x + (eastRimDryNoise - 0.5) * 3.0;
      float eastRimDryCore = 1.0 - smoothstep(8.0, 22.0, eastRimDryDist);
      float eastRimDryApron = (1.0 - smoothstep(22.0, 76.0, eastRimDrySample.x)) * smoothstep(9.0, 24.0, eastRimDrySample.x);
      vec3 eastRimPaleGrass = vec3(0.25, 0.36, 0.16) * (0.86 + eastRimDryNoise * 0.16);
      vec3 eastRimDrySilt = vec3(0.50, 0.45, 0.34) * (0.88 + eastRimDryNoise * 0.18);
      vec3 eastRimGravel = vec3(0.40, 0.38, 0.32) * (0.88 + eastRimDryNoise * 0.16);
      terrainColor = mix(terrainColor, eastRimPaleGrass, eastRimDryApron * 0.38);
      terrainColor = mix(terrainColor, eastRimDrySilt, eastRimDryCore * 0.66);
      terrainColor = mix(terrainColor, eastRimGravel, eastRimDryCore * 0.34);
      float oldDryGullyCore = (1.0 - gullySample.y) * gullySample.z * (1.0 - smoothstep(2.0, 7.4, gullySample.x));
      float dryGullyMudNoise = terrainNoise(vWorldPos.xz * 0.72 + vec2(19.3, 4.6));
      float dryGullyMudFine = terrainNoise(vWorldPos.xz * 1.45 + vec2(6.1, 28.4));
      vec2 globalDendritic = terrainGlobalDendriticMask(vWorldPos);
      float globalDendriticCore = globalDendritic.x;
      float globalDendriticApron = globalDendritic.y * (1.0 - globalDendriticCore * 0.35);
      float dryGullyMudMask = max(max(oldDryGullyCore, lowlandErosionCore * 0.92), max(max(dendriticCore * 0.74, eastRimDryCore * 0.78), globalDendriticCore * 0.86));
      vec3 dryGullyWetSoil = vec3(0.060, 0.045, 0.030) * (0.76 + dryGullyMudNoise * 0.28);
      vec3 dryGullyWetSheen = vec3(0.135, 0.118, 0.080) * (0.74 + dryGullyMudFine * 0.30);
      vec3 globalGullyGravel = vec3(0.31, 0.30, 0.255) * (0.82 + dryGullyMudNoise * 0.26);
      vec3 globalGullyWall = vec3(0.18, 0.17, 0.145) * (0.78 + dryGullyMudFine * 0.30);
      terrainColor = mix(terrainColor, globalGullyGravel, globalDendriticApron * 0.52);
      terrainColor = mix(terrainColor, globalGullyWall, globalDendriticCore * 0.58);
      terrainColor = mix(terrainColor, dryGullyWetSoil, dryGullyMudMask * 0.82);
      terrainColor = mix(terrainColor, dryGullyWetSheen, dryGullyMudMask * smoothstep(0.58, 0.92, dryGullyMudFine) * 0.20);
      // ── 陡河岸斑驳岩壁/地衣（参考图对岸特征）：靠近河 ∩ 坡陡 处把 rock 染绿灰 + 深色地衣斑 ──
      float bankProximity = max(
        1.0 - smoothstep(riverWidth + 2.0, riverWidth + 30.0, wetDist),
        max(
          1.0 - smoothstep(branchWidth + 1.0, branchWidth + 18.0, branchWetDist),
          max(
            1.0 - smoothstep(newlandBraidWidth + 1.0, newlandBraidWidth + 18.0, newlandBraidWetDist),
            1.0 - smoothstep(mountainOutletWidth + 1.0, mountainOutletWidth + 18.0, mountainOutletWetDist)
          )
        )
      );
      float bankSteep = smoothstep(0.14, 0.40, 1.0 - clamp(dot(normalize(vWorldNormal), vec3(0.0, 1.0, 0.0)), 0.0, 1.0));
      float bankRockMask = bankProximity * bankSteep;
      float riverBankRockMask = bankRockMask * (1.0 - smoothstep(0.0, 0.18, riverWetEdge) * 0.18);
      vec3 riverBankRockA = mountainTriplanarColor(uMountainRockMap, uRiverBankRockUvScale, tpW);
      vec3 riverBankRockB = mountainTriplanarColor(uMountainRockMap, uRiverBankRockUvScale * 0.46, tpW);
      vec3 riverBankRock = mix(riverBankRockA, riverBankRockB, 0.24) * vec3(0.82, 0.88, 0.92);
      float bankStrata = terrainNoiseTP(0.075, tpW);
      float bankDarkGroove = smoothstep(0.56, 0.88, terrainNoiseTP(0.42, tpW) * 0.55 + terrainNoise(vWorldPos.xy * vec2(0.055, 0.15) + vec2(6.7, 2.1)) * 0.45);
      float lichenPatch = smoothstep(0.58, 0.88, terrainNoise(vWorldPos.xz * 0.42 + vec2(3.3, 7.7)));
      riverBankRock = mix(riverBankRock, vec3(0.22, 0.25, 0.25), bankDarkGroove * 0.42);
      riverBankRock = mix(riverBankRock, vec3(0.48, 0.50, 0.47), bankStrata * 0.18);
      riverBankRock = mix(riverBankRock, mossRockColor * vec3(0.40, 0.52, 0.34), lichenPatch * riverMoss * 0.28);
      riverBankRock = mix(riverBankRock, vec3(0.20, 0.23, 0.23), riverWetEdge * 0.18);
      terrainColor = mix(terrainColor, riverBankRock, riverBankRockMask * 0.88);
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
      float farMeadowBroad = terrainNoise(vWorldPos.xz * 0.080 + vec2(8.3, 2.6));
      float farMeadowFine = terrainNoise(vWorldPos.xz * 0.24 + vec2(19.1, 5.4));
      vec3 farMeadowGreen = mix(vec3(0.105, 0.185, 0.070), vec3(0.185, 0.285, 0.105), farMeadowBroad);
      vec3 farMeadowYellow = vec3(0.260, 0.330, 0.125) * (0.88 + farMeadowFine * 0.20);
      farMeadowGreen = mix(farMeadowGreen, farMeadowYellow, smoothstep(0.50, 0.88, farMeadowBroad) * 0.34);
      terrainColor = mix(terrainColor, farMeadowGreen, farMeadowMask * 0.64);
      // ── 陡面强制裸岩：坡度大处一律盖掉草绿/河岸地衣绿，露中性冷灰岩，
      //    避免绿草爬上近垂直崖面（河道穿山导致 2D 距离近，绿苔本会染到高崖）──
      float cliffSlope = 1.0 - clamp(dot(normalize(vWorldNormal), vec3(0.0, 1.0, 0.0)), 0.0, 1.0);
      float cliffMask = smoothstep(0.44, 0.74, cliffSlope) * smoothstep(12.0, 30.0, vWorldPos.y);
      vec3 cliffRock = rockColor.rgb * vec3(0.70, 0.73, 0.76);
      cliffRock = mix(cliffRock, cliffRock * vec3(0.82, 0.86, 0.92), smoothstep(0.62, 0.92, cliffSlope) * 0.5); // 越陡越冷暗
      cliffRock *= 0.86 + terrainNoiseTP(0.42, tpW) * 0.20;
      terrainColor = mix(terrainColor, cliffRock, cliffMask * 0.92);
      float snowMountainMask = smoothstep(22.0, 64.0, vWorldPos.y);
      float highAlpineMask = smoothstep(95.0, 175.0, vWorldPos.y);
      float slopeMask = terrainSlopeMask();
      // ── 高山岩：三平面采样专用岩壁贴图，陡面露灰岩，缓坡保留雪/草过渡 ──
      float strata = terrainNoiseTP(0.045, tpW);          // 低频：沉积/节理大带
      float rockGrain = terrainNoiseTP(0.5, tpW);         // 高频：岩石颗粒
      vec3 mountainRockA = mountainTriplanarColor(uMountainRockMap, uMountainRockUvScale, tpW);
      vec3 mountainRockB = mountainTriplanarColor(uMountainRockMap, uMountainRockUvScale * 0.43, tpW);
      vec3 mountainRockTex = mix(mountainRockA, mountainRockB, 0.28) * vec3(0.86, 0.92, 0.98);
      vec3 alpineRock = mix(vec3(0.40, 0.42, 0.44), vec3(0.60, 0.61, 0.62), strata);
      alpineRock = mix(alpineRock, mountainRockTex, clamp(smoothstep(0.12, 0.62, slopeMask) * 0.86 + highAlpineMask * 0.34, 0.0, 0.96));
      alpineRock = mix(alpineRock, vec3(0.30, 0.33, 0.37), slopeMask * 0.45);                 // 陡面更深冷
      alpineRock = mix(alpineRock, alpineRock * vec3(1.05, 1.0, 0.93), (1.0 - slopeMask) * 0.22); // 缓坡略暖
      alpineRock *= 0.90 + rockGrain * 0.18;
      terrainColor = mix(terrainColor, alpineRock, snowMountainMask * (1.0 - highAlpineMask * 0.30));
      // ── 雪分布：缓坡/凹处堆积，陡面露岩；雪线用三平面噪声犬牙交错 ──
      float snowPatch = terrainNoiseTP(0.03, tpW);
      float windSnow = terrainNoiseTP(0.16, tpW);
      float settledSnow = smoothstep(46.0, 100.0, vWorldPos.y) * (1.0 - smoothstep(0.14, 0.54, slopeMask));
      float streakSnow = smoothstep(44.0, 116.0, vWorldPos.y)
        * smoothstep(0.46, 0.78, snowPatch + windSnow * 0.20)
        * brokenSnowStreak(tpW)
        * (1.0 - smoothstep(0.52, 0.86, slopeMask));
      float summitSnow = highAlpineMask * (1.0 - smoothstep(0.74, 0.98, slopeMask)) * 0.90;    // 高山雪盖（仅近垂直露岩）
      float glacierSnow = smoothstep(150.0, 240.0, vWorldPos.y) * (1.0 - smoothstep(0.82, 1.05, slopeMask)); // 极高处雪原/冰川，覆盖陡雪峰
      float snowMask = clamp(max(max(max(settledSnow, streakSnow), summitSnow), glacierSnow), 0.0, 1.0);
      // ── 雪色：亮白基底 + 细颗粒微光，陡面/阴影冷蓝，起伏轻微明暗 ──
      float snowGrain = terrainNoiseTP(1.1, tpW);
      vec3 snowColor = vec3(0.95, 0.97, 0.99) * (0.97 + snowGrain * 0.05);
      snowColor = mix(snowColor, vec3(0.68, 0.77, 0.90), slopeMask * 0.44);                   // 冷蓝阴影面（坡面更冷暗，出体积）
      snowColor *= 0.95 + snowPatch * 0.06;
      terrainColor = mix(terrainColor, snowColor, snowMask);
      terrainColor *= 0.93 + terrainNoiseTP(1.3, tpW) * 0.10;
      float topdownSoilBreakup = terrainNoise(vWorldPos.xz * 0.018 + vec2(33.0, 12.0));
      vec3 topdownEarth = vec3(0.19, 0.17, 0.12) * (0.82 + topdownSoilBreakup * 0.22);
      float gentleOpen = smoothstep(0.72, 0.94, clamp(dot(normalize(vWorldNormal), vec3(0.0, 1.0, 0.0)), 0.0, 1.0))
        * (1.0 - rockMask) * (1.0 - bankProximity) * (1.0 - snowMask);
      terrainColor = mix(terrainColor, topdownEarth, gentleOpen * smoothstep(0.62, 0.92, topdownSoilBreakup) * 0.18);
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
          vec3 detN = terrainDetailNormalWS(wn, detW, 0.5, 0.46);
          detN = terrainDetailNormalWS(detN, detW, 1.4, 0.62);
          normal = normalize(mix(normal, detN, alpineDetail * 0.58));
        }

        if (riverBankRockMask > 0.001) {
          vec3 bankDetW = abs(wn);
          bankDetW = pow(bankDetW, vec3(4.0));
          bankDetW /= max(bankDetW.x + bankDetW.y + bankDetW.z, 1e-4);
          vec3 bankDetN = terrainDetailNormalWS(wn, bankDetW, 0.85, 0.62);
          bankDetN = terrainDetailNormalWS(bankDetN, bankDetW, 2.1, 0.58);
          normal = normalize(mix(normal, bankDetN, riverBankRockMask * 0.62));
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
        float bankRockRoughness = mix(0.72, 0.48, clamp(riverWetEdge + bankStrata * 0.35, 0.0, 1.0));
        roughnessFactor = mix(roughnessFactor, bankRockRoughness, riverBankRockMask * 0.82);
        roughnessFactor = clamp(roughnessFactor + terrainDampMask() * (1.0 - riverBankRockMask) * 0.05, 0.42, 1.0);
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

  mat.customProgramCacheKey = () => 'terrain-dirt-rock-pbr-v25-mountain-stripe-shore-perf'
  return mat
}

function createDistantTerrainProxyMaterial(texLoader) {
  const map = texLoader.load('/textures/nature_pbr/aerial_ground_rock/aerial_ground_rock_diff_1k.jpg')
  map.wrapS = map.wrapT = THREE.RepeatWrapping
  map.repeat.set(16, 16)
  map.anisotropy = 4
  map.colorSpace = THREE.SRGBColorSpace
  const mountainRockMap = texLoader.load(MOUNTAIN_ROCK_TEXTURE_URL)
  mountainRockMap.wrapS = mountainRockMap.wrapT = THREE.RepeatWrapping
  mountainRockMap.anisotropy = 4
  mountainRockMap.colorSpace = THREE.SRGBColorSpace

  const material = new THREE.MeshBasicMaterial({
    map,
    color: 0x8b8a7e,
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
    uMountainRockMap: { value: mountainRockMap },
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
      uniform sampler2D uMountainRockMap;

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

      vec2 proxyMountainWarpUv(vec2 uv, float s) {
        float warpA = proxyNoise(uv * 0.36 + vec2(9.7, 4.3));
        float warpB = proxyNoise(uv.yx * 0.28 + vec2(1.9, 15.2));
        return uv + vec2(warpA - 0.5, warpB - 0.5) * (0.62 / max(s, 0.0001));
      }

      vec3 proxyMountainRockColor(float s, vec3 n) {
        vec3 w = abs(n);
        w = pow(w, vec3(3.2));
        w /= max(w.x + w.y + w.z, 0.0001);
        vec3 cx = texture2D(uMountainRockMap, proxyMountainWarpUv(vProxyWorldPos.zy, s) * s).rgb;
        vec3 cy = texture2D(uMountainRockMap, proxyMountainWarpUv(vProxyWorldPos.xz, s) * s + vec2(0.17, 0.29)).rgb;
        vec3 cz = texture2D(uMountainRockMap, proxyMountainWarpUv(vProxyWorldPos.xy, s) * s + vec2(0.31, 0.11)).rgb;
        vec3 base = cx * w.x + cy * w.y + cz * w.z;
        vec3 soft = texture2D(uMountainRockMap, (vProxyWorldPos.xz + vec2(vProxyWorldPos.y * 0.20, -vProxyWorldPos.y * 0.14)) * s * 0.58).rgb;
        return mix(base, soft, 0.22);
      }

      float proxyGlobalDendriticLine(vec2 p, float scale, float angle, float phase) {
        float ca = cos(angle);
        float sa = sin(angle);
        float u = p.x * ca + p.y * sa;
        float v = -p.x * sa + p.y * ca;
        float denom = max(0.001, scale * 1000.0);
        float wu = u
          + sin(v * scale * 0.62 + phase) * (118.0 / denom)
          + sin((u + v) * scale * 0.28 - phase * 0.7) * (54.0 / denom);
        float wv = v
          + sin(u * scale * 0.54 - phase * 1.3) * (92.0 / denom);
        float trunk = abs(sin(wu * scale + sin(wv * scale * 0.45 + phase) * 1.65));
        float branchA = abs(sin((wu * 0.62 + wv * 0.78) * scale * 1.34 + sin(wu * scale * 0.34 - phase) * 1.1));
        float branchB = abs(sin((wu * 0.88 - wv * 0.38) * scale * 1.78 + sin(wv * scale * 0.48 + phase * 1.7) * 0.85));
        return min(trunk, min(branchA * 1.08, branchB * 1.18));
      }

      vec2 proxyGlobalDendriticMask(vec3 p) {
        float major = proxyGlobalDendriticLine(p.xz, 0.0062, -0.58, 1.7);
        float branch = proxyGlobalDendriticLine(p.xz + vec2(87.0, -41.0), 0.0115, 0.34, 4.1);
        float fine = proxyGlobalDendriticLine(p.xz + vec2(-29.0, 113.0), 0.0235, -1.18, 2.8);
        float majorCore = 1.0 - smoothstep(0.0, 0.060, major);
        float majorApron = 1.0 - smoothstep(0.043, 0.245, major);
        float branchCore = 1.0 - smoothstep(0.0, 0.047, branch);
        float branchApron = 1.0 - smoothstep(0.034, 0.205, branch);
        float fineCore = 1.0 - smoothstep(0.0, 0.034, fine);
        float fineApron = 1.0 - smoothstep(0.024, 0.150, fine);
        float heightFade = 1.0 - smoothstep(210.0, 310.0, p.y);
        float core = max(max(majorCore, branchCore * 0.82), fineCore * 0.48) * heightFade;
        float apron = max(max(majorApron, branchApron * 0.78), fineApron * 0.42) * heightFade;
        return vec2(core, apron);
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
      vec3 lowGround = diffuseColor.rgb * vec3(0.66, 0.65, 0.56);
      // 远景低地染草绿，与近处草地衔接（alpine=高山因子，slope=坡度）
      float proxyMeadow = (1.0 - alpine) * (1.0 - smoothstep(0.30, 0.62, slope));
      vec3 proxyMeadowGreen = mix(vec3(0.105, 0.185, 0.070), vec3(0.185, 0.285, 0.105), broad);
      vec3 proxyMeadowYellow = vec3(0.260, 0.330, 0.125) * (0.88 + fine * 0.20);
      vec3 proxySoil = vec3(0.22, 0.20, 0.145) * (0.82 + broad * 0.22);
      proxyMeadowGreen = mix(proxyMeadowGreen, proxyMeadowYellow, smoothstep(0.50, 0.88, broad) * 0.34);
      lowGround = mix(lowGround, proxyMeadowGreen, proxyMeadow * 0.50);
      lowGround = mix(lowGround, proxySoil, proxyMeadow * smoothstep(0.62, 0.90, fine) * 0.20);
      vec3 proxyRockTex = mix(
        proxyMountainRockColor(0.024, proxyN),
        proxyMountainRockColor(0.010, proxyN),
        0.24
      ) * vec3(0.86, 0.92, 0.98);
      vec3 coldRock = mix(vec3(0.40, 0.43, 0.45), proxyRockTex, alpine * 0.88);
      coldRock = mix(coldRock, vec3(0.64, 0.66, 0.67), broad * 0.18);
      // 陡岩更暗更冷，强化裸岩与雪的明度对比
      coldRock = mix(coldRock, vec3(0.26, 0.31, 0.36), smoothstep(0.30, 0.82, slope) * 0.55);
      coldRock *= vec3(0.84, 0.92, 1.0) * (0.92 + fine * 0.10);
      vec3 baseMountain = mix(lowGround, coldRock, alpine);
      // 大尺度伪 AO：山谷/背阴处压暗，增加体积层次
      baseMountain *= 0.82 + broad * 0.18;
      vec2 proxyGlobalGully = proxyGlobalDendriticMask(vProxyWorldPos);
      vec3 proxyGullySoil = vec3(0.15, 0.13, 0.095) * (0.82 + fine * 0.22);
      vec3 proxyGullyGravel = vec3(0.29, 0.30, 0.28) * (0.82 + broad * 0.20);
      baseMountain = mix(baseMountain, proxyGullyGravel, proxyGlobalGully.y * 0.34);
      baseMountain = mix(baseMountain, proxyGullySoil, proxyGlobalGully.x * 0.68);
      // 平缓处积雪
      float settledSnow = smoothstep(56.0, 120.0, vProxyWorldPos.y) * (1.0 - smoothstep(0.12, 0.48, slope));
      // 雪沟 streak：顺坡而下的纵向雪带，陡面被裸岩切断
      float streakBreak = proxyNoise((vProxyWorldPos.xz + vec2(vProxyWorldPos.y * 0.36, -vProxyWorldPos.y * 0.24)) * 0.072 + vec2(4.8, 11.6));
      float streakMask = smoothstep(0.50, 0.84, broad * 0.36 + streakN * 0.30 + fine * 0.16 + streakBreak * 0.30);
      float streakSnow = smoothstep(78.0, 150.0, vProxyWorldPos.y)
        * streakMask
        * (1.0 - smoothstep(0.48, 0.78, slope));
      float summitSnow = smoothstep(110.0, 170.0, vProxyWorldPos.y) * (1.0 - smoothstep(0.68, 0.96, slope)) * 0.88;
      float glacierSnow = smoothstep(165.0, 250.0, vProxyWorldPos.y) * (1.0 - smoothstep(0.76, 1.04, slope)); // 极高处雪原；最陡岩壁露灰岩
      float snow = clamp(max(max(max(settledSnow, streakSnow), summitSnow), glacierSnow), 0.0, 1.0);
      // ── 廉价太阳光照（MeshBasicMaterial 本身不受光，这里手算）──
      vec3 sunDir = normalize(uSunDir);
      float ndl = dot(proxyN, sunDir);
      float lit = clamp(ndl, 0.0, 1.0);            // 直射 N·L
      float wrap = ndl * 0.5 + 0.5;                // half-lambert 软填充
      float hemi = proxyN.y * 0.5 + 0.5;
      vec3 ambient = mix(uGroundColor, uSkyColor, hemi) * mix(0.55, 0.34, uNightFactor);
      vec3 sunCol = mix(vec3(1.0, 0.95, 0.86), vec3(0.50, 0.58, 0.74), uNightFactor); // 夜晚转冷
      float sunStrength = mix(1.05, 0.30, uNightFactor);
      // 岩/草基底：偏直射、明暗分明（侧光感）
      vec3 litBase = baseMountain * (ambient + sunCol * (wrap * 0.35 + lit * 0.75) * sunStrength);
      // 雪：方向性光影——朝阳亮白、背阴冷暗蓝，造体积（不再扁平死白）
      // 关键：高太阳 + 平滑低模代理 → N·L 几乎不变 → 死白。
      // 用噪声梯度扰动法线造"假山脊/沟壑"，再去掉 half-lambert 软填充换真实对比。
      vec2 rp = vProxyWorldPos.xz;
      float hC = proxyNoise(rp * 0.020 + vec2(1.7, 8.3));
      float hX = proxyNoise((rp + vec2(11.0, 0.0)) * 0.020 + vec2(1.7, 8.3));
      float hZ = proxyNoise((rp + vec2(0.0, 11.0)) * 0.020 + vec2(1.7, 8.3));
      float gC = proxyNoise(rp * 0.072 + vec2(5.4, 2.1));
      float gX = proxyNoise((rp + vec2(3.4, 0.0)) * 0.072 + vec2(5.4, 2.1));
      float gZ = proxyNoise((rp + vec2(0.0, 3.4)) * 0.072 + vec2(5.4, 2.1));
      vec2 reliefGrad = vec2(hX - hC, hZ - hC) * 4.2 + vec2(gX - gC, gZ - gC) * 1.6;
      vec3 snowN = normalize(proxyN + vec3(reliefGrad.x, 0.0, reliefGrad.y));
      float snowNdl = dot(snowN, sunDir);
      // 真实兰伯特为主、极少填充：朝阳→1，侧/背阴→明显变暗
      float snowShade = pow(clamp(snowNdl * 0.78 + 0.22, 0.0, 1.0), 1.5);
      vec3 snowSun = vec3(1.0, 1.0, 1.02) * (0.97 + fine * 0.05);
      vec3 snowSha = mix(vec3(0.44, 0.53, 0.74), vec3(0.24, 0.28, 0.40), uNightFactor); // 背阴冷暗蓝
      vec3 snowShaded = mix(snowSha, snowSun, snowShade) * mix(1.0, 0.55, uNightFactor);
      diffuseColor.rgb = mix(litBase, snowShaded, snow);

      // ── 高度感知大气透视（在线性雾之上叠加，营造纵深）──
      float aerial = smoothstep(420.0, 2400.0, vFogDepth);
      aerial *= 1.0 - smoothstep(50.0, 180.0, vProxyWorldPos.y) * 0.85; // 峰顶基本不雾化
      vec3 hazeColor = mix(vec3(0.60, 0.69, 0.82), vec3(0.16, 0.20, 0.30), uNightFactor);
      float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(lum), aerial * 0.18);   // 去饱和
      diffuseColor.rgb = mix(diffuseColor.rgb, hazeColor, aerial * 0.30);   // 偏冷蓝
      `
    )
  }
  material.customProgramCacheKey = () => 'distant-terrain-snow-proxy-v12-mountain-stripe-fix'
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
const TREE_MODEL_SCALE = 3 // 编辑器/单独克隆树模型的默认缩放；调大手放树更高，调小更矮，不影响 world-tree 实例配置。

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
      attribute float aConfluence;
      varying float vShore;
      varying float vSubmerge;
      varying float vConfluence;
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
        vConfluence = aConfluence;
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
      uniform float uTime;
      attribute float aShore;
      attribute float aSubmerge;
      attribute float aConfluence;
      attribute float aWaterMask;
      attribute float aFoamBoost;
      varying float vShore;
      varying float vSubmerge;
      varying float vConfluence;
      varying float vWaterMask;
      varying float vFoamBoost;
      varying vec2 vUv;
      varying float vEdge;
      varying float vFlow;
      varying float vTide;
      varying vec3 vWorldPos;
      varying vec3 vViewDir;
      #include <fog_pars_vertex>
      void main() {
        vUv = uv;
        vShore = aShore;
        vSubmerge = aSubmerge;
        vConfluence = aConfluence;
        vWaterMask = aWaterMask;
        vFoamBoost = aFoamBoost;
        vEdge = abs(uv.x - 0.5) * 2.0;
        vFlow = uv.y;
        float shorePulse = smoothstep(0.45, 1.0, vEdge) * (1.0 - clamp(aConfluence, 0.0, 1.0));
        float tide = sin(uTime * 0.62 + uv.y * 0.33) * 0.070
                   + sin(uTime * 0.27 + uv.y * 0.11 + position.x * 0.018 + position.z * 0.014) * 0.045;
        vTide = tide * (0.55 + shorePulse * 1.05) * aWaterMask;
        vec3 displaced = position;
        displaced.y += vTide;
        vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
        vWorldPos = worldPos.xyz;
        vViewDir = normalize(cameraPosition - worldPos.xyz);
        vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform float uTime;
      varying float vShore;
      varying float vSubmerge;
      varying float vConfluence;
      varying float vWaterMask;
      varying float vFoamBoost;
      varying vec2 vUv;
      varying float vEdge;
      varying float vFlow;
      varying float vTide;
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
        if (vWaterMask < 0.06) discard;
        vec2 world = vWorldPos.xz;
        float time = uTime;
        float side = abs(vUv.x - 0.5) * 2.0;
        // 用世界坐标噪声扰动横向边缘坐标，让岸线/泡沫/网格边缘不规则蜿蜒，消除笔直平行条带
        float bankWarp = (fbm(world * 0.07) - 0.5) * 0.5
                       + (fbm(world * 0.19 + vec2(7.3, 2.1)) - 0.5) * 0.22;
        float sideW = clamp(side + bankWarp, 0.0, 1.05);
        float centerDepth = 1.0 - smoothstep(0.12, 0.88, side);
        float shallowBank = smoothstep(0.34, 0.90, sideW);
        float innerShallow = smoothstep(0.24, 0.66, sideW) * (1.0 - smoothstep(0.82, 1.04, sideW));
        float edgeBand = smoothstep(0.66, 1.0, sideW);
        float confluenceGate = 1.0 - clamp(vConfluence, 0.0, 1.0);
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
        float shoreGate = smoothstep(0.25, 0.7, vShore) * confluenceGate;
        float foamBoost = clamp(vFoamBoost, 0.0, 1.0) * confluenceGate;
        float boostedShoreGate = max(shoreGate, smoothstep(0.12, 0.62, vShore) * foamBoost);
        float tideRise = clamp(vTide * 8.0 + 0.5, 0.0, 1.0);
        float edgeLayerGate = max(confluenceGate, 0.42);
        float visibleShore = max(shoreGate, edgeBand * edgeLayerGate * 0.98);
        visibleShore = clamp(visibleShore + edgeBand * tideRise * edgeLayerGate * 0.20, 0.0, 1.0);
        float shoreNoise = fbm(vec2(vFlow * 0.62 - time * 0.42, vUv.x * 8.5 + time * 0.10));
        float softFoamBand = smoothstep(0.48, 0.84, sideW) * (1.0 - smoothstep(0.98, 1.0, sideW) * 0.28);
        float softShoreFoam = softFoamBand * smoothstep(0.24, 0.78, shoreNoise + longRipple * 0.22 + fine * 0.10) * shoreGate;
        float shoreFoam = edgeBand * smoothstep(0.42, 0.82, shoreNoise + longRipple * 0.18) * shoreGate;
        float brokenFoam = smoothstep(0.72, 0.96, caustic + shoreNoise * 0.22) * (edgeBand * 0.72) * shoreGate;
        float lakeFoamNoise = fbm(world * 0.18 + vec2(time * 0.12, -time * 0.08));
        float lakeFoamBand = smoothstep(0.43, 0.86, sideW) * (1.0 - smoothstep(0.93, 1.05, sideW));
        float lakeFoamBreak = smoothstep(0.34, 0.72, shoreNoise + longRipple * 0.20 + lakeFoamNoise * 0.18);
        float lakeFoam = lakeFoamBand * boostedShoreGate * (0.42 + lakeFoamBreak * 0.58) * (0.78 + tideRise * 0.20);
        float foamMask = clamp(softShoreFoam * 0.66 + shoreFoam * 0.58 + brokenFoam * 0.52, 0.0, 1.0);
        foamMask = clamp(foamMask + lakeFoam * 0.72, 0.0, 1.0);
        // 飞溅白点/气泡：高频阈值噪声，散布在水面（中心/浅滩稍多），对应参考图的小白点
        float speckNoise = fbm(world * 2.6 + vec2(time * 0.35, -time * 0.28));
        float specks = smoothstep(0.84, 0.96, speckNoise) * (0.4 + shallowBank * 0.5) * (0.35 + confluenceGate * 0.65);
        foamMask = clamp(foamMask + specks * 0.7, 0.0, 1.0);

        // 深→浅分层：保留动态浪纹，但压低亮青色，避免俯视时像发光贴图条。
        vec3 deep = vec3(0.008, 0.052, 0.092);
        vec3 mid = vec3(0.026, 0.112, 0.145);
        vec3 shallow = vec3(0.120, 0.265, 0.205);
        vec3 shorelineSilt = vec3(0.285, 0.255, 0.160);
        vec3 wetMudTint = vec3(0.105, 0.082, 0.050);
        vec3 mossTint = vec3(0.070, 0.210, 0.080);
        vec3 glint = vec3(0.42, 0.58, 0.62);
        vec3 foam = vec3(0.74, 0.84, 0.80);
        vec3 lakeFoamColor = vec3(0.94, 0.98, 0.95);

        vec3 color = mix(mid, deep, centerDepth);
        // 深水 → 近岸浅水 → 贴水泥色，边缘颜色和 terrain 湿泥/浅淤泥保持同一色系。
        color = mix(color, shallow, innerShallow * visibleShore * (0.62 + fine * 0.15));
        float greenFringe = smoothstep(0.44, 0.78, sideW) * (1.0 - smoothstep(0.86, 1.02, sideW)) * visibleShore;
        float waterlineMud = smoothstep(0.68, 1.02, sideW) * visibleShore;
        color = mix(color, mossTint, greenFringe * (0.20 + shoreNoise * 0.22));
        color = mix(color, shorelineSilt, edgeBand * visibleShore * (0.82 + shoreNoise * 0.28));
        color = mix(color, wetMudTint, waterlineMud * (0.72 + tideRise * 0.24));
        // 网格焦散：偏青白的亮光纹（保持深水偏蓝的基调），叠加在整条水面
        color += vec3(0.18, 0.30, 0.28) * caustic * (0.64 + innerShallow * 0.42);
        color += vec3(0.025, 0.110, 0.080) * greenFringe * (0.45 + caustic * 0.5);
        color = mix(color, glint, fresnel * (0.28 + centerDepth * 0.20));
        color += vec3(0.92, 0.98, 0.94) * spec * (0.28 + fresnel * 0.52);
        color = mix(color, foam, foamMask);
        color = mix(color, lakeFoamColor, lakeFoam * 0.72);

        // ── 柔和动画水线：alpha 在网格内完全淡出（隐藏"平面切坡"的硬交界），水线随时间轻微涨落 ──
        // 用 raw side（网格边界处恒为 1.0）做淡出，保证 side→1 时 alpha=0，绝不留硬边；
        // 有机蜿蜒来自 bankWarp，时间涨落来自 lap。
        float lap = 0.075 * sin(time * 0.9 + vFlow * 4.5 + shoreNoise * 2.5)
                  + 0.04 * sin(time * 0.37 + vFlow * 1.7);
        float edgeCut = clamp(0.72 + lap + bankWarp * 0.38 + vTide * 0.42, 0.46, 0.95);
        float stripEdgeAlpha = 1.0 - smoothstep(edgeCut - 0.30, edgeCut + 0.05, side);
        float realShoreAlpha = mix(1.0, stripEdgeAlpha, smoothstep(0.52, 0.92, side));
        float edgeAlpha = mix(1.0, realShoreAlpha, confluenceGate);
        float lapFoam = smoothstep(0.05, 0.0, abs(side - edgeCut)) * smoothstep(0.55, 0.85, side) * shoreGate;
        color = mix(color, foam, lapFoam * 0.55);
        color = mix(color, lakeFoamColor, lapFoam * foamBoost * 0.62);
        float alpha = (mix(0.36, 0.90, centerDepth)
          + innerShallow * visibleShore * 0.08 + edgeBand * (0.03 + visibleShore * tideRise * 0.08) + softShoreFoam * 0.16 + foamMask * 0.22 + fresnel * 0.14
          + lakeFoam * 0.18 + lapFoam * 0.30) * edgeAlpha * smoothstep(0.08, 0.86, vWaterMask);
        if (alpha < 0.01) discard;
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
  getWaterMaskAt = null,
} = {}) {
  const verts = []
  const uvs = []
  const shores = []
  const submerges = []
  const confluences = []
  const waterMasks = []
  const foamBoosts = []
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
      let confluenceF = 0
      // 交汇抑制：第二近水道在 ~0.5–4m 内 → 判为两道交叠的交汇区，平滑压低 aShore，
      // 让交汇内部接缝不起白色岸线泡沫/亮边；单条河（无第二近水道）不受影响、岸边泡沫照旧。
      if (getGroundYAt) {
        const secondEdge = nearbyChannelSecondEdge(wx, wz)
        const confluence = 1 - THREE.MathUtils.smoothstep(secondEdge, 0.5, 4.0)
        const braidedConfluence = newlandBraidedOverlapWeightAt(wx, wz, sample.channelId)
        confluenceF = Math.max(confluence, braidedConfluence)
        shoreF *= (1 - confluenceF)
      }
      const extent = offset < 0 ? leftExt : rightExt
      const edgeMask = THREE.MathUtils.smoothstep(extent - Math.abs(offset), 0, 0.9)
      const endMask = THREE.MathUtils.smoothstep(row, 0, 2) * THREE.MathUtils.smoothstep(samples.length - 1 - row, 0, 2)
      const depthMask = getGroundYAt ? THREE.MathUtils.smoothstep(vy - gy, -0.08, 0.35) : 1
      verts.push(wx, vy, wz)
      uvs.push(u, flowV + whitewaterUv * 0.18)
      shores.push(shoreF)
      confluences.push(confluenceF)
      const baseWaterMask = edgeMask * endMask * depthMask
      waterMasks.push(getWaterMaskAt ? getWaterMaskAt(sample, wx, wz, baseWaterMask) : baseWaterMask)
      foamBoosts.push(0)
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
  geometry.setAttribute('aConfluence', new THREE.Float32BufferAttribute(confluences, 1))
  geometry.setAttribute('aWaterMask', new THREE.Float32BufferAttribute(waterMasks, 1))
  geometry.setAttribute('aFoamBoost', new THREE.Float32BufferAttribute(foamBoosts, 1))
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

function buildNewlandBraidedRiverGeometry(channel, getTerrainHeight) {
  return buildRiverStripGeometry(channel.points, (x, z) => getNewlandBraidedSampleAt(channel, x, z), {
    widthPad: 0.08,
    stepDistance: 8,
    crossSegments: 5,
    getSurfaceYAt: sample => getTerrainHeight(sample.x, sample.z) + sample.waterDepth,
    getGroundYAt: getTerrainHeight,
    maxShoreExtend: 4,
  })
}

function buildGlobalWetGullyGeometry(gully, getTerrainHeight) {
  return buildRiverStripGeometry(gully.points, (x, z) => getGlobalWetGullySampleAt(gully, x, z), {
    widthPad: 0.06,
    stepDistance: 7,
    crossSegments: 4,
    getSurfaceYAt: sample => getGlobalWetGullySurfaceY(gully, sample, getTerrainHeight),
    getGroundYAt: getTerrainHeight,
    maxShoreExtend: 4,
    getWaterMaskAt: (sample, x, z, baseMask) => getGlobalWetGullyWaterMask(gully, x, z, baseMask),
  })
}

function buildNewlandMountainOutletGeometry(getTerrainHeight) {
  return buildRiverStripGeometry(NEWLAND_MOUNTAIN_OUTLET.points, getNewlandMountainOutletSampleAt, {
    widthPad: 0.12,
    stepDistance: 8,
    crossSegments: 6,
    getSurfaceYAt: sample => getTerrainHeight(sample.x, sample.z) + NEWLAND_MOUNTAIN_OUTLET.waterDepth,
    getGroundYAt: getTerrainHeight,
    maxShoreExtend: 6,
  })
}

function makeNewlandBraidedWaterBounds(padding = 10) {
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (const { bounds } of NEWLAND_BRAIDED_BOUNDS) {
    minX = Math.min(minX, bounds.minX)
    maxX = Math.max(maxX, bounds.maxX)
    minZ = Math.min(minZ, bounds.minZ)
    maxZ = Math.max(maxZ, bounds.maxZ)
  }
  return { minX: minX - padding, maxX: maxX + padding, minZ: minZ - padding, maxZ: maxZ + padding }
}

function buildNewlandBraidedWaterGeometry(getTerrainHeight) {
  const bounds = makeNewlandBraidedWaterBounds(8)
  const step = 1.25
  const nx = Math.ceil((bounds.maxX - bounds.minX) / step)
  const nz = Math.ceil((bounds.maxZ - bounds.minZ) / step)
  const verts = []
  const uvs = []
  const shores = []
  const submerges = []
  const confluences = []
  const waterMasks = []
  const foamBoosts = []
  const idx = []

  for (let iz = 0; iz <= nz; iz++) {
    const z = bounds.minZ + iz * step
    for (let ix = 0; ix <= nx; ix++) {
      const x = bounds.minX + ix * step
      const sample = getBestNewlandBraidedSampleAt(x, z)
      const edge = sample ? sample.distance - sample.halfWidth : Infinity
      const riverMask = sample ? 1 - THREE.MathUtils.smoothstep(edge, -0.15, 1.15) : 0
      const southBasinLakeShape = getNewlandStaticLakeShapeAt(SOUTH_BASIN_LAKE, x, z)
      const southBasinLakeCut = 1 - THREE.MathUtils.smoothstep(southBasinLakeShape.edge, -9, -1.5)
      const mask = riverMask * (1 - southBasinLakeCut)
      const waterY = sample ? getTerrainHeight(sample.x, sample.z) + sample.waterDepth : 0
      const groundY = sample ? getTerrainHeight(x, z) : 0
      const shore = sample ? (1 - THREE.MathUtils.smoothstep(waterY - groundY, 0.36, 1.45)) * mask : 0
      const confluence = sample ? newlandBraidedOverlapWeightAt(x, z, sample.channelId) : 0
      const flowU = ((x - bounds.minX) / Math.max(1, bounds.maxX - bounds.minX))
      const flowV = ((z - bounds.minZ) / Math.max(1, bounds.maxZ - bounds.minZ)) * 9

      verts.push(x, waterY, z)
      uvs.push(flowU, flowV)
      shores.push(shore)
      submerges.push(sample ? Math.max(waterY - groundY, -0.05) : -0.05)
      confluences.push(confluence)
      waterMasks.push(mask)
      foamBoosts.push(0)
    }
  }

  const rowStride = nx + 1
  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      const a = iz * rowStride + ix
      const b = a + 1
      const c = (iz + 1) * rowStride + ix
      const d = c + 1
      const maskCount = [a, b, c, d].reduce((count, vertexIndex) => (
        count + (waterMasks[vertexIndex] > 0.08 && submerges[vertexIndex] > -0.12 ? 1 : 0)
      ), 0)
      if (maskCount < 3) continue
      idx.push(a, c, b, b, c, d)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setAttribute('aShore', new THREE.Float32BufferAttribute(shores, 1))
  geometry.setAttribute('aSubmerge', new THREE.Float32BufferAttribute(submerges, 1))
  geometry.setAttribute('aConfluence', new THREE.Float32BufferAttribute(confluences, 1))
  geometry.setAttribute('aWaterMask', new THREE.Float32BufferAttribute(waterMasks, 1))
  geometry.setAttribute('aFoamBoost', new THREE.Float32BufferAttribute(foamBoosts, 1))
  geometry.setIndex(idx)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function getNewlandStaticLakeWaterY(lake, getTerrainHeight) {
  if (Number.isFinite(lake.flatBedY)) return lake.flatBedY + lake.waterDepth
  return getTerrainHeight(lake.x, lake.z) + lake.waterDepth
}

function buildNewlandStaticLakeGeometry(lake, getTerrainHeight) {
  const rings = 12
  const seg = 72
  const waterY = getNewlandStaticLakeWaterY(lake, getTerrainHeight)
  const cos = Math.cos(lake.rot)
  const sin = Math.sin(lake.rot)
  const verts = []
  const uvs = []
  const shores = []
  const submerges = []
  const confluences = []
  const waterMasks = []
  const foamBoosts = []
  const idx = []
  const preserveWaterShape = lake.preserveWaterShape === true

  for (let r = 0; r <= rings; r++) {
    const ringT = r / rings
    for (let s = 0; s < seg; s++) {
      const angle = (s / seg) * Math.PI * 2
      const boundary = newlandStaticLakeBoundaryScale(lake, angle)
      const localX = Math.cos(angle) * lake.rx * boundary * ringT
      const localZ = Math.sin(angle) * lake.rz * boundary * ringT
      const x = lake.x + localX * cos - localZ * sin
      const z = lake.z + localX * sin + localZ * cos
      const shape = getNewlandStaticLakeShapeAt(lake, x, z)
      const groundY = getTerrainHeight(x, z)
      const mask = 1 - THREE.MathUtils.smoothstep(shape.edge, -0.5, 1.5)
      const isSouthBasinLake = lake.id === 'south_basin_lake'
      const shore = (1 - THREE.MathUtils.smoothstep(Math.abs(shape.edge), 0, isSouthBasinLake ? 8 : 5)) * (isSouthBasinLake ? 0.95 : 0.45)

      verts.push(x, waterY, z)
      uvs.push(0.5 + ringT * 0.5, 0.5)
      shores.push(shore)
      submerges.push(waterY - groundY)
      confluences.push(isSouthBasinLake ? 0 : 1)
      waterMasks.push(mask)
      foamBoosts.push(isSouthBasinLake ? 1 : 0)
    }
  }

  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < seg; s++) {
      const a = r * seg + s
      const b = r * seg + (s + 1) % seg
      const c = (r + 1) * seg + s
      const d = (r + 1) * seg + (s + 1) % seg
      const wetCount = [a, b, c, d].reduce((count, vertexIndex) => (
        count + ((preserveWaterShape || submerges[vertexIndex] > -0.12) && waterMasks[vertexIndex] > 0.015 ? 1 : 0)
      ), 0)
      if (wetCount < 3) continue
      idx.push(a, c, b, b, c, d)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setAttribute('aShore', new THREE.Float32BufferAttribute(shores, 1))
  geometry.setAttribute('aSubmerge', new THREE.Float32BufferAttribute(submerges, 1))
  geometry.setAttribute('aConfluence', new THREE.Float32BufferAttribute(confluences, 1))
  geometry.setAttribute('aWaterMask', new THREE.Float32BufferAttribute(waterMasks, 1))
  geometry.setAttribute('aFoamBoost', new THREE.Float32BufferAttribute(foamBoosts, 1))
  geometry.setIndex(idx)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

// 交汇水潭水盘：以池心为心的放射状网格，与各河水带共面同材质，兜底填补水带间缝。
// 逐顶点水高用 channelNetworkWaterYAt（池内即 poolSurfaceY）；aSubmerge=水面-地形，
// 外圈地形高于水面处 <-0.12 被着色器自动裁掉 → 水盘自动贴合实际水域形状。
function buildConfluencePoolGeometry(pool, getTerrainHeight) {
  const cx = pool.x, cz = pool.z
  const R = pool.rOuter + 2
  const rings = 9, seg = 56
  const poolY = confluencePoolSurfaceY(pool)
  const verts = [], uvs = [], shores = [], submerges = [], confluences = [], waterMasks = [], idx = []
  const foamBoosts = []
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
      confluences.push(1)      // 池面是交汇内部水面，不渲染岸线泡沫
      waterMasks.push(1 - THREE.MathUtils.smoothstep(r / rings, 0.82, 1.0))
      foamBoosts.push(0)
      submerges.push(y - gy)
    }
  }
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < seg; s++) {
      const a = r * seg + s
      const b = r * seg + (s + 1) % seg
      const c = (r + 1) * seg + s
      const d = (r + 1) * seg + (s + 1) % seg
      const wetCount = [a, b, c, d].reduce((count, vertexIndex) => (
        count + (submerges[vertexIndex] > -0.12 && waterMasks[vertexIndex] > 0.08 ? 1 : 0)
      ), 0)
      if (wetCount < 3) continue
      idx.push(a, c, b, b, c, d)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setAttribute('aShore', new THREE.Float32BufferAttribute(shores, 1))
  geometry.setAttribute('aSubmerge', new THREE.Float32BufferAttribute(submerges, 1))
  geometry.setAttribute('aConfluence', new THREE.Float32BufferAttribute(confluences, 1))
  geometry.setAttribute('aWaterMask', new THREE.Float32BufferAttribute(waterMasks, 1))
  geometry.setAttribute('aFoamBoost', new THREE.Float32BufferAttribute(foamBoosts, 1))
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
  geos.push(buildNewlandBraidedWaterGeometry(getTerrainHeight))
  for (const gully of GLOBAL_WET_GULLIES) geos.push(buildGlobalWetGullyGeometry(gully, getTerrainHeight))
  geos.push(buildNewlandMountainOutletGeometry(getTerrainHeight))
  for (const lake of NEWLAND_STATIC_LAKES) geos.push(buildNewlandStaticLakeGeometry(lake, getTerrainHeight))
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

  function hideSplashes() {
    emitCarry = 0
    for (const state of splashes) {
      state.active = false
      state.sprite.visible = false
      state.sprite.material.opacity = 0
    }
  }

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
    if (_debugWaterEffectsDisabled) {
      hideSplashes()
      return
    }
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
    hideSplashes,
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

function createGlobalWetGullySystems(scene, getTerrainHeight) {
  const systems = GLOBAL_WET_GULLIES.map((gully) => {
    function sampleRiver(x, z) {
      const sample = getGlobalWetGullySampleAt(gully, x, z)
      const waterY = getGlobalWetGullySurfaceY(gully, sample, getTerrainHeight)
      const terrainY = getTerrainHeight(x, z)
      const depth = Math.max(0, waterY - terrainY)
      const inWater = sample.distance <= sample.halfWidth && depth > 0.025
      return {
        ...sample,
        sourceWaterY: sample.waterY,
        waterY,
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
        const bounds = GLOBAL_WET_GULLY_BOUNDS_BY_ID.get(system.gully.id)
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

function createNewlandBraidedRiverSystems(scene, getTerrainHeight) {
  const systems = NEWLAND_BRAIDED_CHANNELS.map((channel) => {
    function sampleRiver(x, z) {
      const sample = getNewlandBraidedSampleAt(channel, x, z)
      const waterY = getTerrainHeight(sample.x, sample.z) + sample.waterDepth
      const terrainY = getTerrainHeight(x, z)
      const depth = Math.max(0, waterY - terrainY)
      const inWater = sample.distance <= sample.halfWidth && depth > 0.025
      return {
        ...sample,
        sourceWaterY: sample.waterY,
        waterY,
        inWater,
        depth,
      }
    }

    return { channel, sampleRiver }
  })

  return {
    systems,
    update() {},
    sampleRiver(x, z) {
      let best = null
      for (const system of systems) {
        const bounds = NEWLAND_BRAIDED_BOUNDS_BY_ID.get(system.channel.id)
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

function createNewlandMountainOutletSystem(scene, getTerrainHeight) {
  function sampleRiver(x, z) {
    if (!isInsideBounds(NEWLAND_MOUNTAIN_OUTLET_BOUNDS, x, z)) return null
    const sample = getNewlandMountainOutletSampleAt(x, z)
    const waterY = getTerrainHeight(sample.x, sample.z) + NEWLAND_MOUNTAIN_OUTLET.waterDepth
    const terrainY = getTerrainHeight(x, z)
    const depth = Math.max(0, waterY - terrainY)
    const inWater = sample.distance <= sample.halfWidth && depth > 0.025
    return {
      ...sample,
      sourceWaterY: sample.waterY,
      waterY,
      inWater,
      depth,
    }
  }

  return {
    update() {},
    sampleRiver,
  }
}

function sampleNewlandStaticLake(x, z, getTerrainHeight) {
  let best = null
  for (const lake of NEWLAND_STATIC_LAKES) {
    const shape = getNewlandStaticLakeShapeAt(lake, x, z)
    if (shape.edge > 1.5) continue
    const waterY = getNewlandStaticLakeWaterY(lake, getTerrainHeight)
    const terrainY = getTerrainHeight(x, z)
    const depth = Math.max(0, waterY - terrainY)
    const inWater = shape.edge <= 0 && depth > 0.025
    const sample = {
      x,
      z,
      waterY,
      depth,
      inWater,
      flowSpeed: 0,
      dirX: 0,
      dirZ: 0,
      edge: shape.edge,
      distance: Math.max(0, -shape.edge),
      halfWidth: 0,
    }
    if (!best || (sample.inWater && !best.inWater) || (sample.inWater === best.inWater && sample.depth > best.depth)) {
      best = sample
    }
  }
  return best
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
      ...GLOBAL_WET_GULLIES.map(g => ({
        id: `全局湿沟 ${g.id}`,
        points: g.points,
        depth: g.waterDepth,
        run: Math.max(0.35, channelBankRun(g.cutDepth, 40)),
        sample: (x, z) => {
          const s = getGlobalWetGullySampleAt(g, x, z)
          return { ...s, waterY: getGroundHeight(s.x, s.z) + s.waterDepth }
        },
      })),
      ...NEWLAND_BRAIDED_CHANNELS.map(c => ({
        id: `新区辫状河 ${c.id}`,
        points: c.points,
        depth: c.waterDepth,
        run: Math.max(0.35, channelBankRun(c.cutDepth, NEWLAND_BRAIDED_SLOPE_DEG)),
        sample: (x, z) => {
          const s = getNewlandBraidedSampleAt(c, x, z)
          return { ...s, waterY: getGroundHeight(s.x, s.z) + s.waterDepth }
        },
      })),
      {
        id: '山间湖出水河',
        points: NEWLAND_MOUNTAIN_OUTLET.points,
        depth: NEWLAND_MOUNTAIN_OUTLET.waterDepth,
        run: Math.max(0.35, channelBankRun(NEWLAND_MOUNTAIN_OUTLET.cutDepth, NEWLAND_BRAIDED_SLOPE_DEG)),
        sample: (x, z) => {
          const s = getNewlandMountainOutletSampleAt(x, z)
          return { ...s, waterY: getGroundHeight(s.x, s.z) + NEWLAND_MOUNTAIN_OUTLET.waterDepth }
        },
      },
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
      ...GLOBAL_WET_GULLIES.map(g => ({ id: '全局湿沟:' + g.id, depth: g.waterDepth, sample: (x, z) => getGlobalWetGullySampleAt(g, x, z) })),
      { id: '山间湖出水河', depth: NEWLAND_MOUNTAIN_OUTLET.waterDepth, sample: (x, z) => getNewlandMountainOutletSampleAt(x, z) },
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

function isMapDebugFlagEnabled(name) {
  if (!import.meta.env.DEV || typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  const value = params.get(name)
  if (value != null) return value !== '0' && value !== 'false'
  return window.localStorage?.getItem(name) === '1'
}

function isPerfFlagEnabled(name) {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  const value = params.get(name)
  if (value != null) return value !== '0' && value !== 'false'
  return window.localStorage?.getItem(name) === '1'
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

// ── 主函数 ────────────────────────────────────────────

export function createMap(scene, { onStaticModelReady = null, onTerrainLoadProgress = null, fullTerrainLoad = false, perf = null } = {}) {
  const timePerf = (name, fn) => (perf?.time ? perf.time(name, fn) : fn())
  // 地面
  const texLoader = new THREE.TextureLoader()
  const collidables = []
  const groundMat = createTerrainBlendMaterial(texLoader)
  const distantProxyMat = createDistantTerrainProxyMaterial(texLoader)
  let riverSystem = null
  let riverBranchSystems = null
  let gullyStreamSystems = null
  let globalWetGullySystems = null
  let newlandBraidedRiverSystems = null
  let newlandMountainOutletSystem = null
  let unifiedWaterRender = null
  const terrainController = createHeightmapTerrain(scene, {
    perf,
    material: groundMat,
    size: WORLD_SIZE,
    heightmapSize: WORLD_SIZE,   // 高度图仍按 1600 映射中心 ±800（旧图不变）
    extendXNeg: 800,             // 网格向 −X 外扩 ~800m（西）
    extendZNeg: 800,             // 网格向 −Z 外扩 ~800m（南）
    chunkSize: TERRAIN_CHUNK_SIZE,
    chunkSegments: TERRAIN_CHUNK_SEGMENTS,
    activeRadius: TERRAIN_ACTIVE_RADIUS,
    preloadRadius: TERRAIN_PRELOAD_RADIUS,
    buildAllChunksOnLoad: fullTerrainLoad,
    startupBuildBudgetMs: 12,
    onBuildAllProgress: onTerrainLoadProgress,
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
      applyExtendedRegionHeight,
      applyReferenceHeightPatch,
      applyEastRimMegaslopeHeight,
      applyEastRimDryRiverHeight,
      applyNewlandBraidedRiverHeight,
      applyNewlandStaticLakeHeight,
      applyLargeRiverValleyHeight,
      applySnowMountainHeight,
      applyGlobalDendriticErosionHeight,
      applyGlobalWetGullyHeight,
      applyLowlandErosionGullyHeight,
      applyLowlandMicroErosionHeight,
      applyHeroRiverHeight,
      applyNewlandMountainOutletHeight,
      applyRiverBranchHeight,
      applyGullyNetworkHeight,
      applyDendriticGullyHeight,
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
      globalWetGullySystems = createGlobalWetGullySystems(scene, getGroundHeight)
      newlandBraidedRiverSystems = createNewlandBraidedRiverSystems(scene, getGroundHeight)
      newlandMountainOutletSystem = createNewlandMountainOutletSystem(scene, getGroundHeight)
      unifiedWaterRender = createUnifiedWaterRender(scene, getGroundHeight)
      if (isMapDebugFlagEnabled('riverDebug')) {
        runChannelDiagnostics(getGroundHeight)
        runChannelProbe(getGroundHeight)
      }
      if (import.meta.env.DEV) {
        for (const [tx, tz] of [[-163, 55], [-164, 50], [-160, 40], [-160, -52], [-167, -36]]) {
          terrainController.traceHeightAt?.(tx, tz)
        }
      }
      loadSpawnGrass(scene)
      loadRiversideGrass(scene)
      loadGlobalWetGullyBedGrass(scene)
      loadSouthBasinLakeGrass(scene)
      initMeadowGrass(scene)
      initWorldTrees(scene)
      loadSpawnGrass60Ref(scene)
      buildIndividualLeafLayer(scene)
    },
  })

  buildCastleApproach(scene, collidables)
  loadMineCave(scene, collidables, onStaticModelReady)
  loadOutdoorLandmarkColliders(collidables)
  loadOldChurchRuins(scene, collidables, onStaticModelReady)
  loadForestGrove(scene, collidables)
  loadSouthBasinLakesideDecorations(scene, collidables)

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
  function update(time, playerPosition = null, context = null) {
    const dt = Math.min(time - _lastTime, 0.05)
    _lastTime = time
    timePerf('map.terrain', () => terrainController.update?.(playerPosition))
    timePerf('map.water', () => {
      if (unifiedWaterRender?.mesh) unifiedWaterRender.mesh.visible = !_debugWaterEffectsDisabled
      if (_debugWaterEffectsDisabled) {
        riverSystem?.hideSplashes?.()
        return
      }
      unifiedWaterRender?.update(time)
      riverSystem?.update(time, dt, playerPosition)
      riverBranchSystems?.update(time, dt, playerPosition)
      gullyStreamSystems?.update(time, dt, playerPosition)
      globalWetGullySystems?.update(time, dt, playerPosition)
      newlandBraidedRiverSystems?.update(time, dt, playerPosition)
      newlandMountainOutletSystem?.update(time, dt, playerPosition)
    })
    if (!_debugModelGrassDisabled) {
      updateMeadowGrassMotion(playerPosition, dt, context)
      enqueueLocalMeadowGrassRecords(playerPosition)
      timePerf('map.grassQueue', () => processMeadowGrassQueue())
    }
    if (_worldTreeBuild && !_worldTreeBuild.done) timePerf('map.worldTreeBuild', () => stepWorldTreeBuild())
    if (!_debugModelGrassDisabled) {
      timePerf('map.grassWind', () => _spawnGrassWindUniforms.forEach((uniform) => {
        uniform.value = time
      }))
    }
    _grassLodTimer += dt
    if (_grassLodTimer >= GRASS_LOD_INTERVAL) {
      _grassLodTimer = 0
      if (!_debugModelGrassDisabled) timePerf('map.grassLod', () => updateGrassLod(playerPosition))
    }
    _worldTreeVisTimer += dt
    if (_worldTreeVisTimer >= WORLD_TREE_VIS_INTERVAL) {
      _worldTreeVisTimer = 0
      timePerf('map.worldTreeVisibility', () => updateWorldTreeVisibility(playerPosition))
      timePerf('map.forestLeafFade', () => updateForestPackLeafFadeTargets(playerPosition))
    }

    timePerf('map.campfires', () => {
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
    })

  }

  // 每帧由主循环（updateDayNightLighting）喂入太阳方向与夜晚因子，
  // 驱动远山 proxy 的廉价光照与大气透视冷暖。
  function setDistantTerrainSun(sunDir, nightFactor) {
    const u = distantProxyMat?.userData?.uniforms
    if (!u) return
    u.uSunDir.value.copy(sunDir)
    u.uNightFactor.value = nightFactor
  }

  function applyDebugWaterEffectsDisabled(value) {
    const disabled = setDebugWaterEffectsDisabled(value)
    if (unifiedWaterRender?.mesh) unifiedWaterRender.mesh.visible = !disabled
    if (disabled) riverSystem?.hideSplashes?.()
    return disabled
  }

  return {
    collidables,
    update,
    setDistantTerrainSun,
    setDebugGrassDensity,
    setDebugModelGrassDisabled,
    setDebugWaterEffectsDisabled: applyDebugWaterEffectsDisabled,
    setDebugTreeDensity,
    terrainReadyPromise: terrainController.allChunksReadyPromise,
    ponds: [],
    spawnRipple: () => {},
    getTerrainHeight: getGroundHeight,
    sampleRiver: (x, z) => {
      const main = riverSystem?.sampleRiver(x, z)
      const branch = riverBranchSystems?.sampleRiver(x, z)
      const gully = gullyStreamSystems?.sampleRiver(x, z)
      const globalWet = globalWetGullySystems?.sampleRiver(x, z)
      const braided = newlandBraidedRiverSystems?.sampleRiver(x, z)
      const outlet = newlandMountainOutletSystem?.sampleRiver(x, z)
      const lake = sampleNewlandStaticLake(x, z, getGroundHeight)
      if (lake?.inWater && (!outlet?.inWater || lake.depth >= outlet.depth) && (!braided?.inWater || lake.depth >= braided.depth) && (!globalWet?.inWater || lake.depth >= globalWet.depth) && (!main?.inWater || lake.depth >= main.depth) && (!branch?.inWater || lake.depth >= branch.depth) && (!gully?.inWater || lake.depth >= gully.depth)) return lake
      if (outlet?.inWater && (!braided?.inWater || outlet.depth >= braided.depth) && (!globalWet?.inWater || outlet.depth >= globalWet.depth) && (!main?.inWater || outlet.depth >= main.depth) && (!branch?.inWater || outlet.depth >= branch.depth) && (!gully?.inWater || outlet.depth >= gully.depth)) return outlet
      if (braided?.inWater && (!globalWet?.inWater || braided.depth >= globalWet.depth) && (!main?.inWater || braided.depth >= main.depth) && (!branch?.inWater || braided.depth >= branch.depth) && (!gully?.inWater || braided.depth >= gully.depth)) return braided
      if (globalWet?.inWater && (!main?.inWater || globalWet.depth >= main.depth) && (!branch?.inWater || globalWet.depth >= branch.depth) && (!gully?.inWater || globalWet.depth >= gully.depth)) return globalWet
      if (gully?.inWater && (!main?.inWater || gully.depth >= main.depth) && (!branch?.inWater || gully.depth >= branch.depth)) return gully
      if (branch?.inWater && (!main?.inWater || branch.depth >= main.depth)) return branch
      if (main?.inWater) return main
      return lake ?? outlet ?? braided ?? globalWet ?? gully ?? branch ?? main ?? { inWater: false, depth: 0, flowSpeed: 0, dirX: 0, dirZ: 0 }
    },
    getNearbyForestPackLabel,
  }
}
