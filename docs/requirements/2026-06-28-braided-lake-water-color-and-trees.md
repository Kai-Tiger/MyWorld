# 辫状湖水颜色与树

## 背景与目标

湖泊附近 `(-373.2, -335.3)` now 读作作为一个独立水材质从 adjacent 辫状河流，immediate 岸线是过于裸露，和湖表面显示 un真实istic c一次ntric 环 patterns。

目标: 使这湖视觉上匹配周围河流水颜色，移除c一次ntric 湖 ripples，新增白色岸线泡沫，和新增一个密集r 外侧环的湖边树和灌木。

## 成功标准

- 湖泊颜色是接近到 adjacent 河流颜色。
- 湖泊保持静态-水体行为，including 零玩法流动。
- 湖泊表面不再有明显 c一次ntric circle 环。
- 白色破碎泡沫出现围绕真实湖岸线不带覆盖湖中心。
- 树和灌木出现围绕湖边缘不带 growing在湖，even 如果它们是接近到河流或现有树。
- 现有地形高度，湖形状，水层级，和河流路径保持不变。

## 计划改动

- 降低静态-湖泊-only 水颜色上方ride在`createMainRiverMaterial()`。
- 保持`waterKind=3` 用于静态湖因此湖动画和 alpha 保持distinct 从流动河流。
- 使用world-space 湖噪声而不是 radial 湖 UV signals 用于主静态-湖泊 ripple pattern。
- Strengthen 静态-湖泊岸线泡沫和明亮en 湖泡沫朝向白色。
- 提高湖边森林放置生成用于 `BRAIDED_NORTH_BASIN_LAKE`。
- Ignore 间距，河流，营火，和本地清理 rules 用于这湖环; 保持仅户外边界和 not-in-水体检查。

## 测试与验证计划

- 运行 `npm run build`。
- 加载游戏和检查报告的湖视角。
- 确认浏览器控制台有无着色器编译错误。
- Sample 湖和 adjacent 辫状河流水到确认玩法水状态是不变。
- 确认湖边树数量提高和生成树位置保持外部湖水。

## 假设与范围外

- 湖泊应视觉上匹配河流，不其他 way 周围。
- 树放置是范围d 仅到 `BRAIDED_NORTH_BASIN_LAKE`。
- 无地形，水层级，河流路径，or 全局光照改动是包含。
