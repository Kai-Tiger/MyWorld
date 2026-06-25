# 全局模型草山地阈值提高到 20m

## Context and Goal

`pos=(-291.8, -441.3) y=8.1` 没有模型草，是因为全局模型草沿用 `DISTANT_GRASS_MAX_GROUND_Y = 7.5`，低丘和缓坡也被当成山上排除。目标是把山地过滤阈值提高到 `20m`，让 20m 以下普通地面默认铺模型草。

## Success Criteria

- `y=8.1` 这类低丘/缓坡区域允许生成模型草。
- 高于 `20m` 的山地区域仍不生成模型草。
- 火堆、河岸、水面和地图边界排除逻辑不变。

## Planned Changes

- 将 `DISTANT_GRASS_MAX_GROUND_Y` 从 `7.5` 改为 `20`。
- 更新相关需求文档，避免旧的 `7.5` 假设继续误导后续调整。
- 不修改草的 LOD、动态生成队列、密度滑杆、风动或渲染结构。

## Test/Verification Plan

- 运行 `npm run build`。
- 到 `pos=(-291.8, -441.3)` 附近确认 20m 以下地面可生成模型草。
- 检查高于 20m 的山地、火堆附近和河岸/水面仍保持不铺草。

## Assumptions and Out of Scope

- “山上”从本次起定义为 `groundY > 20m`。
- 本次不解决草动态生成跟随延迟或性能预算问题。
