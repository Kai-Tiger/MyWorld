# 山体营火位置Correction

## 背景与目标

山体营火应出现在玩家-报告的位置 `pos=(-386.3, -490.7) y=61.9`。 保持启用来源仍然使用 older `(-390.2, -489.2, y=60.2)` 坐标，其中 could 使营火出现缺失从预期的 spot。

## 成功标准

- 默认地图包含山体营火在 `x=-386.3`，`z=-490.7`，`y=61.9`。
- 运行时布局 normalization restores或corrects 山体营火到该相同位置。
- 草清理和随机树避让使用 corrected 营火中心。

## 计划改动

- 更新山体营火入口在`defaultMap`。
- 更新`MOUNTAIN_CAMPFIRE_POSITION`在运行时布局过滤逻辑。
- 更新营火清理 references 使用由草和随机森林放置。

## 测试与验证计划

- 在源码中搜索旧山体营火坐标和确认保持启用来源不再 references 它们。
- 运行 `npm run build`。
- 检查corrected 山体位置在游戏和确认fire，石材环，glow，和本地清理是可见。

## 假设与范围外

- `pos=(-386.3, -490.7) y=61.9`是预期最终位置。
- 其他营火位置保持不变。
- 地图编辑器和 `localStorage.mapLayout` 行为保持范围外的范围。
