# 世界向 −X/−Z 扩到 ~3200×3200 + 新区连续草地丘陵

## 背景与目标

把世界向 **−X（西）和 −Z（南）** 各外扩 ~1600m（~3200×3200），保留 **+X 城堡(x=124) / +Z 雪山(z≈545) / 河流 / 出生点** 原样原位。新区为**连续起伏的草地丘陵**（不放山脉/河流/湖等），外缘沿用现有边界悬崖封边。

关键：`WORLD_SIZE` 原本一值同驱动「高度图 UV」与「网格范围」——解耦后高度图仍按 1600 映射中心 ±800（旧图不变），网格按轴向 −X/−Z 扩。

## 实施改动

### `src/scene/heightmapTerrain.js`（网格解耦 + 按边外扩）
- 入参加 `heightmapSize`（UV 用，与网格解耦）、`extendXNeg`、`extendZNeg`。`sampleBaseHeight` 用 `heightmapSize`。
- 网格由「正方形居中 + clamp」改为「按轴计数 `chunkCountX/Z` + 显式原点 `gridMinX/Z`」；`chunkCenter`/`centerIx,Iz`/各循环/越界判断同步。+X/+Z 边不变。

### `src/config/world.js`
- `OUTDOOR_MOUNTAIN_BOUNDS.minX/minZ`: −760 → **−2360**（max 不变）。
- `OUTDOOR_COLLISION_HALF_SIZE`: 820 → **2420**（对称盒；+侧仍被 +760 边界悬崖挡）。

### `src/scene/map.js`
- `createHeightmapTerrain` 加 `heightmapSize: WORLD_SIZE, extendXNeg: 1600, extendZNeg: 1600`。
- 新增 height modifier `applyExtendedRegionHeight`（排在 `applyLargeWorldHeight` 后）：新区（x<−760 或 z<−760，760→920 平滑接缝）用多倍频 `sin` 噪声生成连绵丘陵（base≈3，起伏 ±~15m），忽略高度图边缘 clamp。山墙悬崖 `applyMountainEdgeHeight`、草甸、距离场自动随新 `OUTDOOR_MOUNTAIN_BOUNDS` 延伸。

### `src/scene/scene.js`
- 远雾 far 2600 → **5200**、near 500→600，适配扩大后的世界（远处地形可见）。

## 验证（已完成）

- `npx vite build` 通过。
- 探针：旧图不变（(-160,40)=−4.3、雪山(-530,545)=119、(0,0)/(124,0)=0）；新 −X/−Z 区（−900~−2360）为连续起伏 −6~+9；−2360 外为边界悬崖（−180）。
- 俯瞰/低视角截图：新区呈起伏丘陵（地平线连绵波动）、与旧图接缝平滑、外缘悬崖封边；旧图在 +X/+Z 角不变。

## 假设与不做项

- 只向 −X/−Z 扩（`extendXNeg/ZNeg` 入参可换边/改量）。新区只做草地丘陵，不放其它。
- 丘陵幅度/雾距/边界悬崖外观为可调项（`applyExtendedRegionHeight` 系数 / fog far / 边界处理）。
- 面积约 4×，proxy chunk 增多；如 FPS 吃紧后续降 proxy 段数或范围。
