# 主河道收窄、两岸贴水

## 背景与目标

玩家反馈主河道"不贴岸"：站在宽阔干河滩上，水在远处中间细细一条，两岸/阶地离水很远。

headless 横剖面实测（探针 `getTerrainHeight` + 读 `unified_water` 顶点）确认主河横断面是宽缓碗：水带（=床+0.75 贴床浅水）只占中间 ~12–40m，两侧地形从水边很缓地抬升、40–80m 才到岸/阶地。成因是两塑形函数把岸推得又远又缓：
- `applyHeroRiverHeight`：宽漫滩台阶 `halfWidth+9..44`、`valleyWidth=halfWidth+76..136`；
- `applyLargeRiverValleyHeight`：`valleyWidth=halfWidth+145..250` 一大圈压低成缓谷。

用户选择**收窄河道、两岸贴水**。

## 实施改动（`src/scene/map.js`）

### `applyHeroRiverHeight`
- `valleyWidth`：`lerp(76,136)` → `lerp(28,44)`。
- 去掉宽漫滩台阶：删 `floodplain`/`floodplainMask`/`bankToPlain`，碳刻带改为 `bankMask = 1 - smoothstep(d, halfWidth+6, halfWidth+20)`（近槽强、外侧迅速归零，外侧自然高地留作岸）。
- 近岸陡起：`pointBar`/`cutBank` 在 `halfWidth+7~8` 内升到 ~waterY+2.6~3.6；`terraceT = smoothstep(d, halfWidth+8, halfWidth+26)` 从近岸即抬升；`terrace` 基准升到 waterY+3.0。
- 床 `riverFloor` 与 `applySteepChannelCarve` 内槽不动 → 水位/水深不变。

### `applyLargeRiverValleyHeight`
- `valleyWidth`：`lerp(145,250)` → `lerp(40,72)`；`terraceT` 起点 `halfWidth+78` → `halfWidth+24`。外侧自然高地保留，近岸更陡更近。

## 验证（已完成）

- `npx vite build` 通过。
- 横剖面重测：如 (-300,55) + 侧地形由原 2.48→1.58/44m 缓坡 改为水边外 ~4m 内升到 +3.5；两侧岸普遍收到水边 ~4–8m。水仍贴床（深 ~0.7–1m，未浮高）。
- 跨河低视角截图（-300,55 / -230,-25 / -330,96）：主河为有两岸的明确河道、水贴岸，宽干滩消失；岸为干岸（水面以上），无垂直水片。
- 汇流池（-274,8 等）由水潭主导未受影响；近邻支流/rill 不受影响。

## 假设与不做项
- 收窄是主河整体形态变化（宽谷→明确河道），用户已确认。
- 不改水位/水深与材质；不动各汇流池与非主河地形。
- 若个别段嫌岸太陡（峡谷感），按截图回放 `cutBank`/`bankMask` 系数。
