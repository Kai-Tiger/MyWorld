# 模型树绿色/黄色比例参数

## Context and Goal

forest_pack 模型树现在有绿色和黄色两种观感，但生成逻辑只是在模型列表里轮换或均匀随机，无法统一控制两类树的占比。目标是新增一个配置参数，控制 `tree_*.glb` 绿色组和黄色组的比例，并同时作用于大世界随机散布树和手工林地树。

## Success Criteria

- `src/config/world.js` 中有一个可直接调整的模型树颜色比例配置。
- `yellowRatio=0` 时只从绿色组选择模型，`yellowRatio=1` 时只从黄色组选择模型。
- 大世界实例化树和手工林地树都使用该比例配置。
- 灌木、石头、草、地形、水体和树材质调色逻辑不受影响。

## Planned Changes

- 新增 `MODEL_TREE_COLOR_MIX`，包含 `yellowRatio`、`greenFiles`、`yellowFiles`。
- 在 `src/scene/map.js` 增加确定性的模型树选择 helper，按 seed 先选绿色/黄色组，再在组内选具体模型。
- 将 `FOREST_GROVE_TREE_TYPES` 和 `WORLD_TREE_MODELS` 的选择点改为使用 helper。
- 未列入绿/黄分组的类型保持原来的轮换或随机 fallback。

## Test / Verification Plan

- 运行 `npm run build`。
- 静态确认 `MODEL_TREE_COLOR_MIX` 被 `src/scene/map.js` 使用。
- 静态确认随机散布树和手工林地树都接入比例选择 helper。

## Assumptions and Out of Scope

- 默认 `tree_01.glb`、`tree_02.glb` 为绿色组，`tree_03.glb`、`tree_04.glb` 为黄色组；如果实际颜色不符，只调整配置数组。
- 本次不做 UI 面板，也不新增运行时调试 API。
- 本次不修改材质颜色，只控制模型文件选择比例。
