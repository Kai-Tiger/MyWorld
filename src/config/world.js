export const WORLD_SIZE = 1600
export const WORLD_HALF_SIZE = WORLD_SIZE * 0.5

// 世界向 −X / −Z 各外扩 ~800m（保留 +X 城堡 / +Z 雪山边）；网格在 heightmapTerrain 解耦扩展
export const OUTDOOR_MOUNTAIN_BOUNDS = {
  minX: -1560,
  maxX: 760,
  minZ: -1560,
  maxZ: 760,
}

// 碰撞盒对称：覆盖收缩后的 −1560；+X/+Z 侧仍被 +760 山墙地形挡住，无副作用
export const OUTDOOR_COLLISION_HALF_SIZE = 1620
export const MOUNTAIN_FALL_FLOOR_Y = -180
export const MOUNTAIN_FALL_DEATH_Y = -120

// ════════════════════════════════════════════════════
//  世界布局配置 — 直接编辑这里调整地图元素位置
// ════════════════════════════════════════════════════

// ── 房屋 ─────────────────────────────────────────────
// rotY 单位：弧度（0 = 朝北，Math.PI = 朝南，Math.PI/2 = 朝东）
export const houses = [
]

// ── 石头 [x, z] ──────────────────────────────────────
export const rocks = [
  // 中心区域
  [-4,-3],[3,4],[-2,5],[5,-2],[4,2],[-5,4],[2,-5],[-3,2],[1,-3],
  // 中圈
  [11,-4],[-10,8],[8,-11],[-7,14],[16,2],[-15,-8],
  [13,7],[-12,-6],[9,15],[-8,-13],[17,-9],[-16,11],
  // 外缘
  [24,-5],[-22,10],[19,22],[-20,-18],[28,3],[-25,16],
  [15,-24],[-17,20],[30,-14],[-28,-8],
  // 远处
  [36,-8],[-34,15],[25,35],[-23,-32],[42,5],[-40,12],
  [18,-40],[-16,38],[45,-20],[-42,25],[32,-42],[-30,40],
]

// ── 火堆 [x, z] ──────────────────────────────────────
export const campfires = [
  [  2,  -2],
  [ 19, -66],
  [-18,  -2],
  [ 22,  22],
]

// ── 水池 { x, z, r } — r 为水面半径 ─────────────────
export const ponds = []

// ── 台阶山丘 { x, z } ────────────────────────────────
export const hills = [
  { x:  5, z: -26 },   // 南侧山丘
  { x: 28, z:  12 },   // 东侧山丘
]

// ── GLB 模型树调色（色相/饱和度/明度）──────────────────
// 统一作用于 forest_pack 系列模型树（散布树 + 手工林地树/灌木）。
// saturation=1, brightness=1, hueShift=0 时与原始贴图完全一致（恒等）。
export const TREE_COLOR_GRADE = {
  saturation: 1.5, // 1=原样，<1 去饱和，>1 更艳
  brightness: 1.2, // 整体明度乘子
  hueShift: -0.05,  // 色相旋转（弧度，0=不变）
}

// ── GLB 模型树叶暗部提亮 ──────────────────────────────
// 只抬 tree_*.glb/background_tree_*.glb 的叶片暗部，避免雪地前景里变成黑色剪影。
export const TREE_LIGHT_GRADE = {
  leafDarkLift: 0.02,
  leafMinLuma: 0.05,
  snowContrastCompensation: 0.12,
}

// ── GLB 模型树绿/黄比例 ────────────────────────────────
// yellowRatio=0 只出 greenFiles，=1 只出 yellowFiles；只影响 forest_pack 的 tree_*.glb。
export const MODEL_TREE_COLOR_MIX = {
  yellowRatio: 0.05,
  greenFiles: ['tree_01.glb', 'tree_02.glb'],
  yellowFiles: ['tree_03.glb', 'tree_04.glb'],
}

// ── 敌对 NPC（追击/攻击）──────────────────────────────
export const enemyNpcs = [
  { x: -20.2, z: -4.0, rotY: Math.PI * 0.35, name: '篝火巡守', model: 'e2' },
  { x: -15.8, z: -2.4, rotY: -Math.PI * 0.65, name: '篝火伏击者', model: 'e2' },
  { x: 55, z: 10, rotY: Math.PI, name: '巡逻敌人 e2', model: 'e2', patrol: [[55, 10], [57, -8]] },
  { x: 56, z: 27, rotY: Math.PI, name: '北侧高地守卫', model: 'e2' },
  { x: 66, z: 31, rotY: -Math.PI * 0.35, name: '北侧高地巡逻者', model: 'e2', patrol: [[49, 21], [70, 31]] },
  { x: -40, z: 27, rotY: 0, name: '异乡敌人 e2', model: 'e2' },
  { x: -52, z: -75, rotY: 0, name: '迷宫守卫 e2-1', model: 'e2' },
  { x: -54, z: -73.5, rotY: Math.PI * 0.1, name: '迷宫守卫 e2-2', model: 'e2' },
  { x: -50, z: -73.5, rotY: -Math.PI * 0.1, name: '迷宫守卫 e2', model: 'e2' },
  { x: -448.9, z: -474.9, rotY: Math.PI * 280 / 180, name: '远地巡守', model: 'e2' },
]
