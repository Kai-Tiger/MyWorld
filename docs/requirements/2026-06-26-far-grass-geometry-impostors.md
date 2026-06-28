# 远处草几何体Impostors

## 背景与目标

模型草当前变得 very 稀疏之后 70m 和是隐藏之后 90m，因此远景地面读作作为裸露。 新增一个 far-距离草层该是明显草y 不带使用草贴图精灵或expanding 现有 GLB 草半径。

## 成功标准

- G圆形超过模型草范围有宽阔草斑块而不是 looking 裸露。
- 远处草读作作为块y 植被，不 high-frequency 绿色噪声。
- Near 模型草行为保持不变。
- 新的层是轻量足够到避开一个 noticeable 帧-rate drop。
- 现有草调试禁用路径隐藏两者模型草和远处草。

## 计划改动

- 新增一个远处草 impostor 运行时到 `src/scene/map.js`。
- 使用程序化 low-poly crossed blade 簇带有顶点颜色，无图像贴图。
- 生成远处 candidates 从一个 coarse，确定性世界网格和 low-frequency 块噪声。
- Show 远处草从大约 80m 到 280m，带有淡入淡出-in/范围外和 conservative 实例 caps。
- 包含低饱和绿色，干涸，和 moss-染色的 variants 用于块颜色变化。

## 测试与验证计划

- 运行 `npm run build`。
- Smoke-测试户外地图和检查控制台用于 WebGL或着色器错误。
- 验证远处地形超过 90m 不再出现 bald。
- 移动相机/玩家和检查该远处草不 shimmer或crawl 类似随机噪声。
- 切换模型草禁用和验证远处草隐藏使用其余的草系统。

## 假设与范围外

- "不文本ure-基础d" 表示无图像公告板/精灵草贴图。
- 第一实施应 favor 稳定块看起来像ability 和帧 rate 上方高附近-场细节。
- 这不 re放置 close-范围 GLB 草资源或重新设计地形材质。
