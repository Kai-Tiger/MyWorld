# 远处高山氛围改造

## 背景与目标

参考图 `mount.png` 的氛围来自四点：太阳照出的明暗立体感、雪积在峰顶/沟槽而陡岩裸露的对比、远山随距离发灰发蓝的大气透视、以及山体本身够大的体量。

当前远山「发平、发闷」的根因：远山 proxy 使用 `THREE.MeshBasicMaterial`（完全不受光），没有受光面/背光面；着色仅靠世界 Y 的 hardcoded smoothstep，缺少大气透视与雪/岩对比；四座雪峰体量偏小。

目标：在不依赖真实树木几何的前提下，让远山呈现「有光、有雪沟、有纵深、体量大」的氛围。

## 成功标准

- 远山有明显受光面/背光面的立体感，并随日夜太阳移动而变化，夜晚整体转冷压暗。
- 雪集中在峰顶与沟槽，陡岩裸露，雪(亮)与岩(暗)对比清晰。
- 远山随距离/高度发灰蓝，呈现层次纵深，且不与现有线性雾叠加过糊。
- 山峰体量更大、更有压迫感。
- 远（proxy）→近（MeshStandard chunk）过渡处雪线/配色无明显跳变。

## 计划改动

文件主要集中在 `src/scene/map.js`，整合点在 `src/main.js`。

1. **远山 proxy 加廉价太阳光照**（`createDistantTerrainProxyMaterial`）：新增
   `uSunDir`/`uNightFactor`/`uSkyColor`/`uGroundColor` uniforms（参照 `createTerrainBlendMaterial`
   的 `Object.assign(shader.uniforms, uniforms)` 写法），fragment 在雪/岩混合后加
   half-lambert 太阳光照 + 半球环境光 + 夜晚压暗；uniforms 挂 `material.userData.uniforms`。
2. **每帧喂太阳方向**：`main.js` 室外分支复用已有太阳轨道与 `nightFactor` 公式，
   将归一化 `sunDir` 与 `nightFactor` 传入 `updateMap`；`map.js` 的 `update()` 写入 proxy uniforms。
3. **雪沟/裸岩对比增强**（proxy fragment）：加强陡坡裸岩、增强雪沟 streak、谷地 AO 压暗，
   对齐近处地形雪/岩配色。
4. **大气透视雾化**（proxy fragment）：在现有 `fog_fragment` 基础上叠加高度感知的去饱和 +
   冷蓝偏移，强度温和。
5. **山峰体量加大**（`applySnowMountainHeight`）：调大每座 peak 的 `h` 与基底半径 `rx/rz`，
   适度降低 `core` 指数让山体更饱满；复核 proxy 与近处地形的雪线阈值。

## 验证计划

1. 运行游戏进入室外，远眺四座雪峰，逐轮截图对照 `mount.png`。
2. 验证日夜：太阳移动时受光面变化、夜晚转冷压暗。
3. 走近确认远→近 chunk 过渡无明显跳变。

## 假设与不做项

- 不加山脚真实树木/森林几何或着色色带。
- 不引入后处理（Bloom/色彩分级），保持现有 ACES + 原生管线。
- 不重做天空/云。
- 四峰位于 x∈[-690,-120]、z∈[330,650]，属远景非主玩区，加高不影响可行走区/碰撞；
  峰高 Y~290 安全低于相机 far(3000)/fog far(2600)。
