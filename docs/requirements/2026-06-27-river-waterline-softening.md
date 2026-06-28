# 河流水线Softening

## 背景与目标

河流表面当前有 fast 明亮白色运动在middle 和一个可见 wavy 裁切线 a长河岸。 目标是保持水 alive 同时 making 运动 s降低，reducing 明亮 streaks，和 turning 河岸边缘进入一个柔和er 透明过渡。

## 成功标准

- Mid-河流白色 caustic 和 speckle 运动是s降低和更少明亮。
- 河岸边缘不再读作作为一个尖锐 animated wave 线。
- Sh允许水仍然有 subtle 运动，颜色变化，和泡沫。
- 现有汇流接缝 fixes，河流几何体，地形雕刻，和玩法水检查是不改变。

## 计划改动

- Tune `createMainRiverMaterial()` 着色器时序，caustic，speckle，泡沫，和 alpha parameters。
- 新增一个边缘 caustic 门因此明亮 caustic/细节不 outline 水边缘。
- Widen 河流条带边缘遮罩在`buildRiverStripGeometry()` 略微到 give 着色器一个柔和er alpha 衰减。

## 测试与验证计划

- 运行 `npm run build`。
- 开始本地开发服务器和检查用于 WebGL 着色器错误。
- 检查接近河岸视角和汇流视角用于柔和er 边缘，s降低白色运动，和无明显 regression在水连续性。

## 假设与范围外

- 期望的 result是weaker 和 s降低白色细节，不 removal 的所有水运动。
- 此楼层不落地，改变河流路径，引入深度贴图，或新增`Water.js`。
