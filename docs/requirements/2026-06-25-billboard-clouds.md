# 贴图云（billboard sprite 云）

## 背景与目标
TAA 体积云太吃性能，改用 **billboard sprite 贴图云**：大朵蓬松、覆盖天空约 30%、随风缓慢飘动、相机移动有视差。性能极好（一组 transparent sprite）。替换之前的体积 raymarch 离屏管线。

**更新（2026-06-25）**：程序生成的 canvas 云纹理糊/有方形边界，被否。改用用户提供的写实积云透明 PNG（billboard sprite）。但静态贴图仍被否——

**最终方案：GPU Points 粒子云（动感）**。用户要云有动感、粒子效果，不要静态贴图。`src/scene/sky.js` 改为：
- **GPU Points 粒子云**：16 朵 × 130 粒子（单 draw call，~2080 粒子），粒子按「底平顶鼓积云轮廓」散布；软云絮 `CanvasTexture`（低 alpha 核心 + 羽化边 + 轻噪声）密集叠加融成蓬松整体。
- **动感**：ShaderMaterial vertex 用 uTime + 多向 sin 湍流逐粒子位移（云絮翻滚）+ size 脉动；整朵云随风 wrap 漂移。`gl_PointSize` 透视缩放。`NormalBlending`、`depthWrite:false`、`depthTest:true`（地形遮挡）。
- 顶亮白→底蓝灰明暗（vHeightN）；云中心相对相机 wrap（铺满头顶 + 视差、不飘空）。
- 性能极轻（单 draw call + 纯 GPU 动画），远低于体积 raymarch。
- 验证：蓬松连贯积云、覆盖~30%、地形遮挡、隔 7s 两帧对比确认粒子流动 + 云漂移（动感生效）。
- 可调：`CLOUD_COUNT`/`PER`/`uSizeK`/`uTurbAmp`/`WIND_SPEED`/云高/halfW。

（billboard 贴图 PNG 暂留 `public/textures/clouds/` 未用。）

## 成功标准
- 云为大朵蓬松卡通积云、柔边自然、顶亮底灰。
- 覆盖天空约 30%，其余干净蓝天。
- 随风缓慢飘动、相机移动/转头有视差、不飘空、不穿帮跳变。
- 地平线方向无突兀竖墙云；穹顶大气/太阳正常。
- 性能显著优于体积云（无离屏 raymarch）。

## 计划改动
- `src/scene/sky.js`：移除离屏 RT/raymarch/TAA/composite；穹顶（大气+太阳）保留；新增程序生成云纹理（canvas 2D 蓬松积云剪影 + 顶白底灰渐变，2~3 变体）+ Sprite 云层（~24 朵、scale 350~650、Y 540~720、相对相机 wrap ±2000、随风平移、分 2 层）。
- `src/main.js`：`renderWithAO` 还原为直渲；移除 `sky.renderClouds`/`composite`/`resize`/`setQuality` 离屏接线；`createSky(scene)`。
- `docs/requirements/2026-06-24-taa-volumetric-clouds.md` 标注已弃用。

## 测试 / 验证计划
无头 puppeteer 截真实 canvas（驱动第三人称相机看天 + `page.screenshot()`）：大朵蓬松、覆盖~30%、随风飘、视差、无竖墙云、性能流畅。参数（数量/大小/高度/覆盖/风速）按截图迭代。

## 假设与范围外
- 假设：白天锁定、风缓慢世界平移、第三人称相机。
- 范围外：体积/raymarch 云、云投影地面阴影、昼夜/天气。
- 取舍：贴图云立体感弱于真体积（用户为性能接受），用世界分布+视差+多变体+大小随机减轻平贴感。
