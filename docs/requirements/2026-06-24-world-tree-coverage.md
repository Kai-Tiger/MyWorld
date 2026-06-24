# 世界级实例化树木散布：把树铺满全世界 + 树更高

## Context & Goal

用户希望把树铺满整个世界（地形 1600×1600，有效区 `OUTDOOR_MOUNTAIN_BOUNDS` −760~760）并让树更高。

当前 `loadForestGrove`（`src/scene/map.js`）是逐棵独立 GLTF 克隆（726 棵，集中在城堡/河流/峡谷周边小斑块，无实例化/LOD/卸载）。按同密度铺满需 ~38 万棵独立模型，必卡死。

游戏已有成熟的高性能植被框架（草地系统：`stepMeadowGrassBuild` 分块增量构建 + `THREE.InstancedMesh` + `updateGrassLod` 高低模 + 坡度/水体/结构避让 + `getGroundHeight`，承载最多 75 万草实例）。本需求复用该模式新增「世界级实例化树木散布层」。

用户选择：自然林斑+空地（聚集噪声，~2–3 万棵）、设树线（高处裸露，保留雪山观感）、树高 ~1.8×。

## Success Criteria

- 世界各处低地/丘陵都有自然分布的树林斑块与林间空地，不再只集中中心。
- 树明显更高（~1.8×）。
- 树避开：水/河道、陡坡/崖面、城堡/矿洞/篝火/出生点等结构、雪线以上高处。
- 帧率与铺满前持平（实例化 + 增量构建 + 按 cell 剔除 + 实例上限）。
- 现有手工林地保留并同步加高，不与散布层堆叠。

## Planned Changes（均在 `src/scene/map.js`）

1. `stepWorldTreeBuild()`：镜像 `stepMeadowGrassBuild`，在 `update()` 中按独立 ms/帧预算增量构建一次、常驻。撒点（cell 128m，格距 ~6.5m + `forestPlacementNoise` 抖动）、低频聚集噪声形成林斑/空地、cell 廉价整块剔除。
2. 每点守卫复用：`getGroundHeight`；树线 `smoothstep(45,62)` 概率衰减、>62 不种；`sampleChannelNetwork` + `waterY` 水体守卫；草地式坡度守卫（阈值 ~1.2/1m）；`isInsideRandomForestClearing` + `shouldSkipModelGrassPlacement` 结构避让 + 避开 `RANDOM_FOREST_BOUNDS`。
3. 实例化：按 (cell × 模型) 建 `InstancedMesh`（`frustumCulled=true`、`castShadow=false`）；模型复用 `FOREST_GROVE_TREE_TYPES`，多 mesh/材质用 `mergeGeometries` 合并并各建并联实例。
4. 护栏：`WORLD_TREE_MAX_INSTANCES`(~40000) 上限；按玩家距离 cell 可见性剔除（>~350m 隐藏）；按距出生点排序增量；不卸载。
5. 树高：`TREE_MODEL_SCALE` 3→~5.4；碰撞半径 `FOREST_TREE_COLLIDER_SCALE` 不变。
6. 碰撞：散布树无碰撞（可穿过）；保留手工林地碰撞。

## 微调（2026-06-24 后续）

用户试看后两点调整（均在 `src/scene/map.js`，复用草/树代码）：

1. **树数量 −10%**：`stepWorldTreeBuild` 过 cluster 守卫后加确定性概率剔除 `forestPlacementNoise(seed+11) < WORLD_TREE_THIN(0.10)`。
2. **树下补草**（用户选「只在树下补草」，否决「草铺满到树线」以省性能）：`initWorldTrees` 额外 `loadGrassVariantGeometries(SPAWN_GRASS_MODEL_VARIANTS[0])` + `configureSpawnGrassMaterial` 建草材质（自动随风动）；每棵树脚下半径 `WORLD_TREE_GRASS_RADIUS(2.6m)` 内散 `WORLD_TREE_GRASS_PER_TREE(6)` 簇草（逐簇采 `getGroundHeight` 贴坡），并入该 cell 的 InstancedMesh 集随树距离剔除。不动全局草甸（`MEADOW_GRASS_MAX_GROUND_Y`/cap/bounds）。

## Test / Verification Plan

- headless（vite 绑 IPv4 `--host 127.0.0.1` + Chrome `--no-proxy-server` + 清 http_proxy；`window.__game`/临时 `__verify` 传送）。
- 多点传送截图：林斑/空地自然、避水避坡避结构、树线以上裸露、树高 ~1.8×、贴地无穿模。
- 打印总实例数（2–3 万、≤上限）与可见 cell 数；确认帧率持平。

## Assumptions & Out-of-Scope

- 复用现有树模型，不新增美术；无低模时远处用同几何 + cell 距离剔除（不做 billboard，留后续）。
- 散布树无碰撞；保留手工林地碰撞。
- Out-of-scope：billboard impostor LOD、随玩家移动的 chunk 卸载/重载；河道/草地/雪山等其它系统逻辑。
