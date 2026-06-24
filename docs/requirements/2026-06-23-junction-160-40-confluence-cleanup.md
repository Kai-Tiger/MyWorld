# 整体清理 (-160, 40) 河道汇聚路口

## 背景与目标

玩家在世界坐标约 (-164, 50)（探针点 `PROBE_POINTS` 之一）看到的不是一条自然小溪，而是一堆破碎的深沟：多面体尖角缺口 / 沙楔（左侧"箭头状"干沟切口），以及贴在陡岸上的垂直水墙/水片（低视角下水道像一条竖直玻璃带）。

根因：(-160, 40) 是一个 **channel 堆叠节点**——`central_north_rill` 支流穿过此点，外加 4 条侵蚀沟终止/经过这里：

- `west_ridge`（干, depth 3.2，端点 (-160,40)）、`central_fan`（干, depth 2.9，端点 (-160,40)）→ 切出无水的尖锐干沟楔子；
- `old_center`（湿, 端点 (-160,40)）、`center_left`（湿, 经过 (-180,20)→(-160,-52)）→ 各按"最近河道"取水高；
- `central_north_rill` 本身 ~4m 宽、2m 深 → 窄深水带即竖直水片。

每条河各用 `applySteepChannelCarve`（44° 坡、2m 切深）独立挖一条斜向窄沟，互相之间地脊挖不到 →（1）多面体/沙楔；（2）`sampleChannelNetwork` 的"最近河道胜出"在节点处水高分段跳变 → 错台 + 垂直水片。

这与已修复的 (-274, 8) 三河汇流口是同一种病。目标：复用那套显式"交汇水潭"（统一水面 + 碗状碳刻 + 兜底水盘），把 (-160, 40) 路口统一成一处连贯浅溪汇水，消除尖角沙楔/错台/垂直水片，水收回河道不漫溢，邻近河段不受波及。

## 成功标准

- 路口读起来是一处自然小溪汇水，而非多条破碎深沟。
- 无多面体沙楔、无水下错台、无贴陡岸的垂直水墙。
- 水面不铺到河岸外平沙地（不漫溢），水盘外缘按地形自动淡出（沿用 `aSubmerge` 裁切）。
- (-160,40) 邻近河段（`central_north_rill` 上下游、各沟、主河）不被波及，原 (-274,8) 水潭外观不变，无新漫溢/飘空，可行走/碰撞正常。

## 实施改动（均在 `src/scene/map.js`）

1. **交汇水潭单例 → 数组（核心）**：`CONFLUENCE_POOL*` 一组常量改为 `CONFLUENCE_POOLS = [{x,z,rInner,rOuter,depth}, ...]`，新增 `{ x:-160, z:38, rInner:8, rOuter:15, depth:0.9 }`。`confluencePoolSurfaceY(pool)` 改为取本地 `sampleChannelNetwork(pool.x,pool.z).waterY - 0.15`（避免按主河水位淹小溪），逐池懒加载缓存 `pool._surfaceY`。
2. **多池权重/水面/碳刻**：`confluencePoolWeightAt` 返回 `{weight,pool}`（最强池）；`channelNetworkWaterYAt` 用该池收敛水高；`applyConfluencePoolCarve` 遍历各池 `Math.min` 叠加碗状碳刻（只加深、平滑权重）。
3. **多池水盘网格**：`buildConfluencePoolGeometry(pool, getTerrainHeight)`；`createUnifiedWaterRender` 对每个池各建一张水盘。
4. **轻量去堆叠**：`west_ridge` 末点 (-160,40)→(-182,52)、`central_fan` 末点 (-160,40)→(-150,60)（干沟拉回上坡扇开，不参与 GLSL 泥带，仅影响 JS 碳刻）；`central_north_rill` `halfWidthEnd` 2.35→2.7（出池口水带不至刀片状）。

## 验证计划

1. `npx vite build` 通过（已通过）。
2. headless 截图（puppeteer + swiftshader）走 vite preview，传送 (-164,50)，从玩家身高低视角正对路口截图，对照原始截图：尖角沙楔/错台/垂直水墙消除、汇水潭连贯。
3. 走查邻近：原 (-274,8) 水潭外观不变；rill 上下游、`center_left`/`old_center`、主河无新漫溢/飘空。
4. (-164,50) 附近行走确认地形温和、碰撞正常。

## 假设与不做项

- 假设路口视觉中心在 (-160,38)；如偏移可微调圆心/半径。
- 仅清理本路口；下游 `central_north_rill` 长段窄深水带整体放浅不在本次范围。
- 不改水材质/透明度/焦散外观；不重构 `sampleChannelNetwork` 为全局加权混合；不全程把小溪改成主河水位。
