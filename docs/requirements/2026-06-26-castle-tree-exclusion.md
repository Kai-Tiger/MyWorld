# 城堡树排除

## 背景与目标

Some 生成树出现内部或intersecting 外部城堡结构。 修复应防止树生成内部城堡占地范围而不是 manually 删除 individual 树。

## 成功标准

- 无世界树或hand-放置 tall 树实例出生点内部城堡外部占地范围。
- Tree-under-草生成由世界树是也不存在从城堡占地范围。
- 现有树覆盖外部城堡 buffer 保持 intact。
- 城堡入口和入口路线清理行为保持不变。

## 计划改动

- Derive 一个城堡树-exclusion rectangle 从 `CASTLE_ZONES` 和 `CASTLE_EXTERIOR.origin`。
- 新增一个 modest p新增围绕 unioned 城堡边界到覆盖墙体，stairs，platforms，和树树冠靠近结构。
- 复用排除在世界树放置，旧 random-森林清理，和 hand-authored 森林放置过滤逻辑。

## 测试与验证计划

- 运行 `npm run build`。
- 检查城堡外部和确认树不再 intersect 墙体，stairs，platforms，or gateho使用。
- 确认森林覆盖仍然出现外部城堡 buffer。

## 假设与范围外

- 问题是生成树木放置，不城堡碰撞或地形。
- 一个单层 p新增的 2D 排除占地范围是sufficient 用于这修复。
- 这不调整草，岩石，水，地形，or 城堡模型。
