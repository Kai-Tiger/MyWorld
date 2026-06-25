# Pathname 控制地形全量加载

## Context and Goal

当前全量地形加载已经接入启动流程，但它是默认启用。目标是只在访问 `/full` 或 `/full/` 时启用全量地形加载，默认路径恢复原来的增量 chunk 加载。

## Success Criteria

- `/full` 和 `/full/` 会显示地形加载进度，并等待全量地形完成后进入游戏。
- `/` 和其他路径不等待全量地形，按原来的增量加载流程进入游戏。
- 地形高度、水体、树、草和材质逻辑不改变。

## Planned Changes

- 在 `src/main.js` 用 `window.location.pathname` 判断是否为 full 模式。
- 将 `fullTerrainLoad` 传入 `createMap`。
- 在 `src/scene/map.js` 用 `fullTerrainLoad` 控制 `buildAllChunksOnLoad`。
- `startGame()` 只在 full 模式下等待 `terrainReadyPromise`。

## Test / Verification Plan

- 运行 `npm run build`。
- 静态确认默认路径不会等待 `terrainReadyPromise`。
- 静态确认 `/full` 和 `/full/` 才传入 `fullTerrainLoad: true`。

## Assumptions and Out of Scope

- `/full` 是同一个前端应用路径，由 dev server fallback 到 `index.html`。
- 不新增 UI 开关，只通过 pathname 控制。
