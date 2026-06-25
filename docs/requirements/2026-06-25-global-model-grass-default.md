# 全地图默认模型草铺设

## Context and Goal

当前模型草会经过草甸、低地侵蚀、沟壑、城堡入口、低海拔等多重过滤，导致玩家附近出现大块不铺草区域。目标是改成默认全地图铺模型草，只保留明确需要空出来的区域。

## Success Criteria

- 室外地图内、低于山地高度阈值的普通地面默认生成模型草。
- 火堆附近不生成模型草。
- 河面、河床/河岸陡坡、湖泊和汇水池不生成模型草。
- 高于现有 `DISTANT_GRASS_MAX_GROUND_Y` 的山地区域不生成模型草。
- 不再因为低地侵蚀、干沟壑概率、城堡入口或低海拔过滤导致草缺失。

## Planned Changes

- 将全局草生成判断改为 `isGlobalModelGrassLand`。
- 移除全局草生成里的低地侵蚀、dendritic gully keep、低海拔和城堡入口过滤。
- 保留现有动态生成、LOD、密度调试、模型草隐藏开关和渲染结构。

## Test/Verification Plan

- 运行 `npm run build`。
- 在普通低地、城堡入口附近、火堆附近、河岸和山地高度区域观察草覆盖。
- 用调试面板调整 Grass Density，确认仍影响模型草密度。

## Assumptions and Out of Scope

- “山上”沿用现有 `DISTANT_GRASS_MAX_GROUND_Y`，当前阈值为 `20`。
- “河岸”包含水面、河床/河岸陡坡、湖泊和汇水池。
- 本次不调整草的预热半径、队列预算或 LOD 距离。
