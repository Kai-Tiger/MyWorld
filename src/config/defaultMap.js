// 默认地图布局 — 游戏首次启动或清除存档后加载此配置
// 格式与编辑器导出的 map_layout.json 完全一致
export const defaultMap = {
  houses: [],
  rocks: [
    // 中心区域
    { x: -8, z: -10, scale: 0.9 }, { x: -10, z: 18, scale: 0.9 }, { x: -4, z:  18, scale: 0.9 },
    { x:  9, z: -10, scale: 0.9 }, { x:  18, z: 14, scale: 0.9 }, { x: -7, z:  6, scale: 0.9 },
    { x:  2, z: -12, scale: 0.9 }, { x: -5, z:  2, scale: 0.9 }, { x: -6, z: -16, scale: 0.9 },
    // 中圈
    { x:  14, z: -13, scale: 0.9 }, { x: -10, z:   8, scale: 0.9 }, { x:   8, z: -15, scale: 0.9 },
    { x:  -7, z:  14, scale: 0.9 }, { x:  26, z:   8, scale: 0.9 }, { x: -15, z:  -8, scale: 0.9 },
    { x:  24, z:   9, scale: 0.9 }, { x: -12, z:  -6, scale: 0.9 }, { x:   9, z:  15, scale: 0.9 },
    { x:  -8, z: -13, scale: 0.9 }, { x:  22, z: -10, scale: 0.9 }, { x: -16, z:  11, scale: 0.9 },
    // 外缘
    { x:  29, z:  -7, scale: 0.9 }, { x: -22, z:  10, scale: 0.9 }, { x:  19, z:  22, scale: 0.9 },
    { x: -20, z: -18, scale: 0.9 }, { x:  28, z:   3, scale: 0.9 }, { x: -25, z:  16, scale: 0.9 },
    { x:  15, z: -24, scale: 0.9 }, { x: -17, z:  20, scale: 0.9 }, { x:  30, z: -14, scale: 0.9 },
    { x: -28, z:  -8, scale: 0.9 },
    // 远处
    { x:  36, z:  -8, scale: 0.9 }, { x: -34, z:  15, scale: 0.9 }, { x:  25, z:  35, scale: 0.9 },
    { x: -23, z: -32, scale: 0.9 }, { x:  42, z:   5, scale: 0.9 }, { x: -40, z:  12, scale: 0.9 },
    { x:  18, z: -40, scale: 0.9 }, { x: -16, z:  38, scale: 0.9 }, { x:  45, z: -20, scale: 0.9 },
    { x: -42, z:  25, scale: 0.9 }, { x:  32, z: -42, scale: 0.9 }, { x: -30, z:  40, scale: 0.9 },
  ],
  campfires: [
    { x:   2, z:  -2 },
    { x:  10, z: -18 },
    { x: -18, z:  -2 },
    { x:  22, z:  22 },
  ],
  trees: [],
  npcs:  [],
}
