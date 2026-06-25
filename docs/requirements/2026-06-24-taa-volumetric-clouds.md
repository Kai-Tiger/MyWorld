# TAA 时间累积体积云

> ⚠️ 已弃用（2026-06-25）：体积云太吃性能，改为 billboard 贴图云，见 `2026-06-25-billboard-clouds.md`。本文档仅作历史记录。

## 背景与目标
单遍体积 raymarch 云迭代 7 轮，始终在「糊 vs 噪」间无法两全（贴脸偏糊 + 半透明区残留 banding），达到单遍天花板。目标：用 **TAA（时间累积抖动样本 + 历史重投影）** 达到参考照片那种**锐利有结构、柔和不糊不噪的真实积云**，同时**保留体积/视差**（不回贴图）。

## 成功标准
- 贴脸近看云锐利有结构、边缘有花椰菜簇感、无糊、无 banding/网点、无颗粒。
- 保留真实体积与视差（相机移动/旋转时云世界锁定、有立体感）。
- 相机静止时收敛到最锐；旋转/移动时不拖影（最坏退化为单遍、不更糟）。
- 地平线云被地形遮挡、太阳被云遮、色彩与现状一致（ACES 只做一次）。
- 战斗/低端经 setQuality 分级降级，帧率友好；indoor/castle 等无云状态走原直渲不受影响。

## 计划改动（分 4 阶段）
1. **离屏管线**：云从穹顶 ShaderMaterial 剥离成全屏 quad GLSL3 pass，渲到 `cloudMRT`（2× RGBA16F：RT0 预乘色+alpha、RT1 代表距离 tRepr）；主场景渲到 `sceneRT`(color+DepthTexture)；深度门控合成（云只画天空远平面像素）。视觉与现状一致。
2. **抖动 + 累积**：Halton(2,3) 8 样本逐帧子像素抖动（取代 IGN）；history ping-pong RGBA16F，`mix(history,current,α)`，仅静止累积。
3. **重投影**：缓存真实相机上帧 viewProj+pos，当前像素世界点 `uCameraPos+dir*tRepr` 投影取历史 UV，云世界锁定。
4. **抗 ghosting + 兜底**：YCoCg 3×3 clamp + disocclusion 弃历史 + 风补偿；setQuality 分级（全分辨率TAA / 半分辨率+全分辨率历史 / 退单遍）；场景切换/resize `invalidateHistory()`。

集成点：`main.js renderWithAO` 单一 hook（其余 16 处 render 不动）、`renderCastle` 守卫（vista 用单遍云）、resize→`sky.resize`、`setCombatPerfMode`。色彩管线：sceneRT 线性 HDR（关 tone mapping），最终合成 quad 才做一次 ACES+sRGB。

## 测试 / 验证计划
无头 puppeteer（vite 127.0.0.1:3001）：阶段1 固定相机与 baseline 近似；阶段2 静止 ~30 帧验证收敛；阶段3 相机旋转序列验证世界锁定不拖；阶段4 快速转头无拖影、风静止无 smear、战斗降档、场景切换首帧干净。

## 假设与范围外
- 假设：白天锁定（太阳方向固定）、相机第三人称以旋转为主、风缓慢世界平移。
- 范围外：贴图/billboard 云、昼夜/天气、云投影到地面阴影。
- 风险：HalfFloat RT 移动端支持（无则退单遍）、快速转头 TAA 拖影（clamp+退化兜底）、ACES 重复编码（须只做一次）、castle 双相机历史混叠（vista 单遍）。
