# 启动时全量加载地形

## Context and Goal

当前地形 chunk 会在玩家附近逐步构建，而世界树可独立显示更远范围，导致树先显示、地形还没显示的穿帮。目标是在进入可玩画面前完成整张高精地形构建。

## Success Criteria

- loading overlay 移除前，全部高精地形 chunk 已经构建完成。
- 游戏开始后远处不再出现蓝色/空白地面。
- 运行时不再因玩家位置删除已经构建的地形 chunk。
- 树、草、水体、地形高度和颜色逻辑不因本次改动改变。

## Planned Changes

- `heightmapTerrain` 增加全量构建模式和 `allChunksReadyPromise`。
- 全量模式下所有 chunk 保持可见，distant proxy 隐藏。
- `createMap` 默认启用启动全量地形构建，并把进度回调传给主加载界面。
- `startGame()` 等待 `terrainReadyPromise` 后再继续场景预热和预渲染。

## Test / Verification Plan

- 运行 `npm run build`。
- 静态确认 `startGame()` 等待地形 promise。
- 静态确认全量模式不会按玩家位置删除 chunk。
- 静态确认地形 loading 进度会更新到 `loaded/total`。

## Assumptions and Out of Scope

- 接受首屏等待时间增加，以换取进入游戏后整张地形已加载。
- 本次只要求地形全量加载；世界树和草仍可按现有预算构建。
- 不通过扩大运行时 active radius 解决。
