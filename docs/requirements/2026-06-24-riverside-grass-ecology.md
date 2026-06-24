# 河岸生态草铺设（Riverside Riparian Grass）

## 标题
沿整个河网（主河 + 5 条支流）铺设符合河流生态规律的低面模型草。

## 背景与目标
当前模型草（spawn grass）只分布在出生点周围 14 个森林草堆（`LOCAL_MODEL_GRASS_PILES`），河流两岸是裸露沙土，缺少河岸植被，视觉单薄。
目标：复用现有 spawn grass 的 InstancedMesh + 风动画机制，沿主河和全部支流两岸铺草，密度参考用户提供截图（近坡顶绿草连片、间夹沙地），分布符合河流生态自然规律。

用户明确的生态分区规则：
- **河岸上方平台（坡顶外平地）= 密集**
- **两侧被下切的河岸斜坡（slope 段）= 完全不种草**
- **没水的河床底部（露出沙洲/浅滩）= 稀疏几颗**

## 成功标准
1. 主河 + 5 条支流两岸坡顶平台铺满模型草，近坡顶密、向外渐稀。
2. 被下切的河岸斜坡段完全无草。
3. 露出水面的干河床上稀疏几丛；水下河床无草。
4. 近水偏绿（fresh），向外偏枯/暗（dry/dark），含沙质空斑。
5. 草贴地、随风摆、不穿模、不浮空、不插进水里。
6. 帧率无明显下降（分段 InstancedMesh + 视锥剔除 + 实例上限）。

## 计划改动（全部在 `src/scene/map.js`）
1. 新增 `RIVERSIDE_GRASS_*` 配置常量（沿河步距、横向步距、坡顶带宽、坡顶余量、干床概率、抖动、分块长度、实例上限、最大坡度）。
2. `createRiversideGrassPlacements()` + 通用河道行走器 `appendRiparianGrassForChannel(spec)`：
   - 主河 spec 用 `HERO_RIVER_POINTS` / `riverHalfWidthAt` / `riverWaterYAt` / 主河切深坡度；
   - 支流 spec 用 `branch.points` / `branchHalfWidthAt` / `branchWaterYAt` / 支流切深坡度。
   - 按横向距离 `d` 分三带：坡顶平台密铺（`d∈[hw+run+margin, hw+run+width]`，falloff + 沙斑噪声）、斜坡跳过、干河床稀疏（`d∈[0,hw]` 且 `ground>water` 时低概率）。
   - 变体按湿度梯度（近水 fresh 多，外侧 dry/dark 多）；复用 `shouldSkipModelGrassPlacement` 排除区与局部坡度守卫。
3. `loadRiversideGrass(scene)`：复用 `SPAWN_GRASS_MODEL_VARIANTS` 加载 3 个 glb，建 3 个共享材质（`configureSpawnGrassMaterial`，uniform 复用现有更新循环），按空间网格分块、每 (块×变体) 建一个 `InstancedMesh`（`frustumCulled` + `computeBoundingSphere`）。只 append 到 `_spawnGrassInstancedMeshes`，不重置数组。
4. 在 `createMap` 的 `onReady` 中、`loadSpawnGrass(scene)` 之后调用 `loadRiversideGrass(scene)`。

## 测试 / 验证计划
1. headless 启动（puppeteer-core + 系统 Chrome swiftshader，`window.__game`），读控制台实例数/丢弃数。
2. 低视角（玩家身高相机）截图主河中段、一处汇流口、一条支流。
3. 核对三带分区、绿/枯过渡、沙斑、不穿模/不浮空/不插水。
4. 目测帧率；必要时下调密度常量重截图迭代。

## 密度 / 范围（2026-06-24 第二次调优）
首轮落地后用户要求"草更密 + 向河岸两侧延伸覆盖更大地面"，选定幅度=较大、外缘=自然渐稀淡出。最终参数：
- `RIVERSIDE_GRASS_TERRACE_WIDTH` 6.0 → **14.0**（坡顶带向外延伸更宽）
- `RIVERSIDE_GRASS_LATERAL_SPACING` 0.5 → **0.48**、`RIVERSIDE_GRASS_ALONG_SPACING` 0.55 → **0.5**（加密）
- 新增 `RIVERSIDE_GRASS_TERRACE_PLATEAU=0.30`：内侧 30% 带宽满密度，其后向外平滑淡出到 0（自然边界）
- `riparianPatchMask` 阈值 `(0.22,0.6)` → `(0.15,0.55)`（减小沙斑、整体加密）
- `RIVERSIDE_GRASS_MAX_INSTANCES` 38000 → **140000**（防后段支流饿死）；`RIVERSIDE_GRASS_MAX_GROUND_RISE` 0.7 → **0.85**（更宽带可覆盖缓坡）

## 全场草甸层（2026-06-24 第三次：草铺满整个低谷地）
用户要求"草铺满整个游戏场景"，选定=全场 3D 模型草、只铺低谷地（保留 7.5m 高度上限）。新增"草甸草"层（map.js）：
- 在 `GRASS_FIELD_BOUNDS`（±760）按 `MEADOW_GRASS_SPACING=2.0` 网格铺满低谷地面。
- 排除（先便宜后昂贵）：`shouldSkipGroundDebrisPlacement`（边界+高度>7.5+篝火+矿洞+城堡引道+峡谷路径）→ `sampleChannelNetwork` 的 `edge < MEADOW_GRASS_RIVER_HANDOFF(16.5)`（排除水面/斜坡，并在河岸层密度淡出到 0 处接手）→ 局部坡度守卫 `MEADOW_GRASS_MAX_GROUND_RISE=0.85`。
- 变体按地面高度湿度梯度（低谷更绿、近 7.5m 偏干）；草丛 scale 略放大填充。
- **跨帧增量构建**（`initMeadowGrass` + `stepMeadowGrassBuild`，每帧 ~5ms 预算）：实测一次性同步生成在 swiftshader 上需 ~11.3s（`getGroundHeight` 全管线 ×~58 万候选，纯 CPU），会造成启动卡顿；改为地图即时加载、草甸按 64m 块由出生区向外逐帧填充。整块高地用四角+中心采样廉价跳过。`stepMeadowGrassBuild()` 挂在 `update()`。
- 密度（按用户"继续加密"要求逐步上调）：`MEADOW_GRASS_SPACING=0.85`（约 1 丛/0.7m²，≈最初 2.0m 的 5.5×），草丛 scale 1.0~1.7；`MEADOW_GRASS_CHUNK_LEN=64`、每 (块×变体) 一个 InstancedMesh、视锥剔除、风动 uniform 复用；上限 `MEADOW_GRASS_MAX_INSTANCES=750000`，每帧构建预算 `MEADOW_BUILD_MS_PER_FRAME=6`。
- 接入 `onReady`，`loadRiversideGrass` 之后。河岸密草层保留为近水细节层，~16m 无缝衔接。
- 注：全场 3D 模型草密度有硬上限（构建+渲染都受实例数约束）；若要"草甸像河岸一样连片"，需改走 billboard 卡片层（现成 `buildDistantGrassCards`，便宜、可极密）或近玩家流式高密+远处卡片。

## 草丛形状统一调整（2026-06-24 第四次：压低 / 压扁变平 / 叶片加宽）
用户反馈模型草露出地面太高、叶片太立、覆盖不足。对**全部三层模型草**（出生点/河岸/草甸，共用同一 glb）统一调整（只改实例 Y 偏移与缩放，不改几何）：
- `LOCAL_MODEL_GRASS_Y_OFFSET` `-0.06 → -0.10`（三层共用，整体压低）。
- 新增共享系数 `MODEL_GRASS_FLATTEN_Y=0.6`（乘 scaleY，竖向压扁→叶片更平贴、与地面夹角更小）、`MODEL_GRASS_SPREAD_XZ=1.4`（乘 scaleX/Z，横向展开→叶尖间距更大、覆盖更好）。
- 在三层各自的 `scale.set` 处各乘一次：`applySpawnGrassPlacements`、`loadRiversideGrass`、`buildMeadowCellMeshes`。保留每层原有随机大小范围。
- 系数为初值，按观感可微调。

## 假设与不做范围
- 支流以 `RIVER_BRANCHES` 的 resampled `points` 行走；主河用 `HERO_RIVER_POINTS`。
- 复用 `shouldSkipModelGrassPlacement` 的 `DISTANT_GRASS_MAX_GROUND_Y`（7.5m）高度上限：高海拔雪线以上河源不长草（生态正确）。
- 与出生点既有 spawn grass 草堆可能轻微重叠，不做去重。
- 不改河流几何/水面/地形碳刻；不改既有 spawn grass；不新增草模型资源。
- 不做 LOD/距离淡出；密度常量为初值，依验证截图微调。
