# 雪山表面去程序化痕迹：注入锐利高山岩脊噪声

## Context & Goal

截图中 ~315m 的大雪山表面有明显的「水平等高线台阶 + 垂直列拉丝」交叉网格痕迹，观感很假。

根因（已读当前真实代码确认）：雪山几何来自 `applySnowMountainHeight`（`src/scene/map.js`）——对 4 个 `SNOW_PEAKS` 与 5 条 `SNOW_RIDGE_LINES` 做 `mountain = max(...)` 累加。山体主面是**平滑径向穹顶** `peak.h * pow(1-smoothstep(d), corePower) * footScale`，本质径向对称、光滑；现有的 `ridgeNoise/seamNoise` 只作用在沿轴的窄带（`ridgeHalfWidth`/`ridgeAmp` 小），覆盖不到大面。这种平滑大面被规则 XZ 网格采样（active mesh ≈1.78m/顶点；远景 proxy ≈5.3m），陡坡上网格行/列对齐成等高线与列条纹；法线由 `getHeightAt` 有限差分计算（heightmapTerrain.js `setWorldSpaceNormals`），进一步放大条带。

目标：给雪山高度场注入锐利的 ridged 程序化噪声（高山岩脊 + 次级山脊/沟槽），打散规则网格条带，使表面自然。`getHeightAt` 同时驱动几何与法线，加噪声后光照自动变化。

风格选择：锐利高山岩脊（ridged 为主）。投入范围：几何 + shader 细节法线 + 远景 proxy 全套。

## Success Criteria

- 山脚低视角（玩家身高）看雪山，水平台阶与垂直列拉丝交叉网格基本消失。
- 表面呈现锐利岩脊、次级山脊与沟槽，silhouette 不再是光滑锥形。
- 山脚与平地、山口河道处自然过渡：无悬空凸起、不回填已挖出的河道/山口。
- 近距离与远景观感风格一致，无「近糙远滑」突变。
- 帧率与改动前持平（噪声为地形构建期逐顶点计算，非每帧）。

## Planned Changes

1. 几何（`src/scene/map.js`，已实现）：新增 `snowNoiseBase` + `snowMountainSurfaceNoise(x, z, exposed)`（复用现有叠加正弦风格，参考 `mountainEdgeNoise`/`moundNoise`），在 `applySnowMountainHeight` 末尾 `exposed = max(0, mountainLift - 100)` 后注入。含域扭曲、3 个 ridged 倍频（sin 频率 0.045/0.095/0.20，脊—谷间距 ≈π/f ≈70/33/16m，最细全波长 ~31m 不超网格分辨率）、中心化（有脊有沟、保体量）、随 exposed 增锐、山脚 `smoothstep(exposed,0,40)` 渐隐、山口 `pass` 衰减。
2. Shader 细节法线（`createTerrainBlendMaterial`，`#include <normal_fragment_maps>` 段）：用 `terrainNoiseTP` 梯度做高频法线微扰，仅在高山岩/雪区按权重混入世界法线；缓存键 `terrain-dirt-rock-pbr-v6` → `v7`。
3. 远景 proxy（`createDistantTerrainProxyMaterial`）：proxy 复用同一 `getHeightAt`，岩脊自动经 5.3m 网格继承。验证时发现 proxy 顶点着色器有**预存编译错误**：`vProxyWorldNormal = normalize(mat3(modelMatrix) * objectNormal)`，但 MeshBasicMaterial 不含 `<beginnormal_vertex>` → `objectNormal` 未声明 → 整个 proxy 不编译、远山不渲染。已改用原始 `normal` 属性修复，缓存键 `distant-terrain-snow-proxy-v2` → `v3`。

实现微调（验证迭代结果）：几何噪声振幅 9/4.5/2.2→7/3.6/1.8，去掉随高度增幅，改为极顶 `summitCalm`（exposed 130–280 回收 0.6）避免把峰尖推成近垂直细柱；shader 细节法线改两档尺度叠加（0.5 + 1.4）破碎陡面网格列，缓存键升至 `terrain-dirt-rock-pbr-v9`。

## Test / Verification Plan

- headless 跑游戏（puppeteer-core + 系统 Chrome swiftshader，`window.__game` DEV hook）。
- 低视角验证：相机置玩家身高、站山脚正对雪山（参考用户 HUD 坐标复现截图视角），不用俯视。
- 前后截图逐项核对 Success Criteria；确认帧率持平。
- 调参回合迭代噪声幅度/频率/增锐系数。

## Assumptions & Out-of-Scope

- 保留圆锥包络作大形骨架，只叠加表面噪声；不重做布局或换高度图。
- 不全局提网格密度（性能），细节靠 shader 法线补。
- Out-of-scope：基础高度图 8-bit 量化（只影响低矮地形，非本雪山台阶来源）；河道/草地/天空等其它系统。
- 已知遗留：最高峰**近垂直的山脊крест/峰尖**仍有竖向条纹。该竖条来自基础山体 `SNOW_RIDGE_LINES` 的 `max()` крест（预存，用户原截图即有），本质是 heightfield 无法干净表示近垂直面——单顶点列在陡面退化成竖向 facet。本次几何噪声已把**山体大面**的横向台阶打散为自然岩脊、并用 `summitClamp` 削弱了我方噪声对峰尖的加剧；但彻底消除竖条需另案（限制最大坡度，或改用非 heightfield 的崖面几何），不在本需求范围。
