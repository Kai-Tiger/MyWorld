# 修复河流悬空：水面解析高度 vs 远处低精度地形不匹配

## 背景与目标

河流上游一段拱进天空、末端半空中断。非雾/渲染问题，是几何高度问题。

根因（读源码确认）：

1. 河流源头 `HERO_RIVER_CONTROL[0] = (-575, 560)`（`src/scene/map.js`）落在 `applySnowMountainHeight` 雪峰 `{x:-530, z:545, h:230}` 内——源头在 ~230 高的雪山上。
2. `riverWaterYAt(t)` 上游 `t<0.26` 段为 `lerp(150, 40, …)`，残留过高值。
3. 水面网格 Y = `getGroundHeight(x,z) + depth`，用精确解析高度，全精度块（`TERRAIN_CHUNK_SEGMENTS=72`）能贴合。
4. 远处渲染成 `TERRAIN_DISTANT_PROXY_SEGMENTS=8`（16 单位间距）的低精度 proxy，在河流离开雪山的陡降肩部把曲面线性"抄近路"压到水面下 → 越远越上游、水越抬离地面、末端拱空。

目标：河流在任意距离/视角都贴合地形，无拱空；远景地形与水面贴合；帧率无明显回退。

## 已实施改动（均在 `src/scene/map.js`）

1. `riverWaterYAt`（line 2460）：上游 `t<0.26` 段 `lerp(150, 40, t/0.26)` → `lerp(64, 40, t/0.26)`。所有 carve/雪山下压/河谷/水面/运行时采样都引用 `river.waterY`，故整条河谷一致下沉、水面仍 `= 碳刻河床 + depth` 贴地；平滑接到 t=0.26 处的 40，下游不变。
2. `TERRAIN_DISTANT_PROXY_SEGMENTS`（line 45）：`8` → `24`（128/24≈5.3 单位间距），远景地形贴合解析高度、消除陡坡抄近路。proxy 段数经 `distantProxySegments` 传入 `buildDistantProxyChunk`（`heightmapTerrain.js`），无需改该文件。

## 验证计划

1. `npm run build` 通过。
2. `npm run dev`，第三人称从远到近多角度看河流上游/源头：水带全程贴地，无拱空/半空中断；陡降肩部不穿入地下。
3. 与现状截图对比（`river-iter-NN-*.jpeg`）。
4. 帧率检查：169 个 proxy chunk × 24 段 ≈ 21 万三角面（MeshBasic，开销小）；无明显掉帧。必要时段数回调（16~32），或 waterY 起点微调。

## 假设与不在范围内

- 保留河流"从雪山高处下来"的整体设计，只降绝对高度 + 提高远景精度，不重排河流路径。
- 不改河流颜色/泡沫/水深、不改 chunk 加载半径。
- 不动"远山始终可见"的雾/相机改动（见 `2026-06-23-distant-mountains-always-visible.md`）。
- waterY 起点与 proxy 段数为推荐起点，按验证截图微调。
