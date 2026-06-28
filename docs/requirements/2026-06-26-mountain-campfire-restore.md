# 恢复山体营火

## 背景与目标

营火附近 `pos=(-386.3, -490.7) y=61.9` 应始终存在在默认户外布局。 重新cent 默认-地图改动可以保留一个附近营火入口不带明确山体高度，其中 makes 营火出现缺失或incorrectly 放置在坡面。

## 成功标准

- 运行时布局始终包含一个营火在 `x=-386.3`，`z=-490.7`，`y=61.9`。
- 如果 `defaultMap.campfires` 已经有一个附近入口，运行时布局 normalizes 它到固定山体营火位置和高度。
- 如果入口是移除从 `defaultMap.campfires`，运行时布局新增它返回。
- 营火渲染 continues 到阶段明确 `y` 进入 `makeCampfire`。

## 计划改动

- 保持山体营火入口在`defaultMap`。
- 更新运行时布局过滤逻辑因此一个现有附近山体营火是corrected 而不是 merely accepted。
- 不要恢复旧地图编辑器或改动无关布局行为。

## 测试与验证计划

- 运行 `rg "MOUNTAIN_CAMPFIRE_POSITION|makeCampfire\\(scene, x, z, y\\)|-386.3" src` 到确认固定位置是wired 通过配置，布局过滤逻辑，和渲染。
- 运行 `npm run build`。
- 手动ly 检查山体位置在游戏和确认fire，石材环，日志，glow，和 flame 是可见在坡面。

## 假设与范围外

- `y=61.9`是预期视觉高度用于这营火。
- 此改动不 handle g它comm其。
- 更宽地图编辑器 resto比例n 和无关默认-地图 cleanup 不在范围内。
