# 新区阿尔卑斯景观：边缘雪脊 + 近处山脉（+ 后续湖/树）

## 背景与目标

把向 −X/−Z 扩出的新区做成参考图（勃朗峰式）景观：外缘连续雪脊（**内缓外陡**：缓坡在内侧朝可玩区，外侧为世界边界 void 崖藏山后）+ 近处绿/岩矮山 + 小湖 + 草树。**新建专用地形方法**（不用旧 `SNOW_PEAKS`）。雪/岩**着色**复用现有地形材质（按高度自动出，不下载贴图）。

## 已实施（Phase A：地形 + 雪着色代码）

### `src/scene/map.js`
- `applyExtendedRegionHeight` 扩成新区完整地形：连绵丘陵基底 +
  - **外缘雪脊**：沿边距离 `e=max(smoothstep(-x,1500,2300), smoothstep(-z,1500,2300))`，`pow(e,2.3)` 内缓外陡，叠 `alpineRidgedNoise` 锯齿峰；`−X−Z` 角 `175*pow(eX*eZ,0.7)` 填成连绵主峰群（补转角缺口）。
  - **近处矮山**：4 个高斯包（−1250,−650 / −700,−1300 / −1550,−1550 / −950,−1000，h 40~80，低于雪线 → 绿/岩长树）。
- 雪着色增强（让陡峰也雪盖，贴近参考图）：
  - 主材质 `createTerrainBlendMaterial`：`highAlpineMask` 95m 起、`summitSnow` 放宽到坡度 0.86、新增 `glacierSnow`(>150m)。
  - 远景代理 `createDistantTerrainProxyMaterial`：`summitSnow` 95m 起、加 `glacierSnow` + 雪后重新提亮 + 峰顶少雾化 + 末端 `finalSnow` 强制提亮；cache key → v5。
- `src/scene/scene.js`：远雾 far 2600→5200（适配大世界）。

## 验证现状

- `npx vite build` 通过。
- **高度已探针验证**：−X 沿线 x−1700≈4 → −2100≈140 → −2250≈229（内侧长缓坡抬到 ~229m 雪脊）；矮山 (−1550,−1550)≈80；旧图 (−160,40)=−4.3、雪山(−530,545)=119 不变。
- **雪着色无法 headless 验证**：headless 软件渲染（swiftshader）对远景代理材质的雪渲成蓝灰——**连现有旧雪山在 headless 里也是灰的**，故截图不能判断雪。需在真实 GPU 游戏里看。

## 雪光影迭代（去扁平死白）

真实 GPU 上雪山扁平死白、无体积。诊断三因：① 太阳偏高（`uSunDir.y≈0.85`，~58°）→ 朝上雪面 N·L 几乎一致；② half-lambert `ndl*0.5+0.5` 把阴影抬到 0.5 → 死白；③ 远景代理网格仅 24 段、法线平滑无山脊沟壑。

- **远景代理 `createDistantTerrainProxyMaterial`（cache key → v7，核心）**：用 `proxyNoise` 双频有限差分梯度扰动雪法线造"假山脊/沟壑"（`reliefGrad = 低频*4.2 + 高频*1.6`），再去掉 half-lambert 换真实兰伯特对比（`snowShade = pow(clamp(snowNdl*0.78+0.22),1.5)`），背阴色压暗加冷蓝（`snowSha 0.44,0.53,0.74`）。
- **近景主材质 `createTerrainBlendMaterial`**：雪坡冷蓝阴影加强（`slopeMask*0.30→0.44`、阴影色 `0.68,0.77,0.90`），与远景风格统一（近景走 PBR + 已有 alpineDetail 细节法线，体积本就较好）。
- `npx vite build` 通过。headless 软渲对远景代理仍渲灰，**无法验证**——需真实 GPU 看朝阳/背阴体积、山脊是否清晰。

## 待办（Phase B/C，待用户确认山形与雪后再做）

- **小湖**：`CONFLUENCE_POOLS` 加 3–5 个独立湖（实测 surfaceY/bedY），自动挖盆 + 现有水面材质。
- **树/草**：world-trees + meadow grass 已自动覆盖新区（树线 64m 下）；近峰/湖边按需补 curated 林丛。
- 山形/缓坡/雪量/转角按真实游戏截图迭代。

## 假设与不做项
- 新方法生成、不用 SNOW_PEAKS；雪/岩复用现有材质着色（不下载贴图）。
- 内缓外陡。先 Phase A，山形与雪经真实 GPU 确认后再做湖/树。
