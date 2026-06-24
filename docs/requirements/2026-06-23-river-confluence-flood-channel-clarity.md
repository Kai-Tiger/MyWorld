# 修复 (-270, 8) 汇流口河水泛滥 / 河道不清

## 背景与目标

玩家在世界坐标约 (-270, 8) 处看到河水漫过河岸、看不清主河道，水下还有错台的多边形河床。

排查结论：(-270, 8) 是「三河汇流口」——几乎压在主河 hero river 控制点 `{-274, 8}` 上，同时是 `southwest_creek` 河口、并紧邻 `center_west_stream`（中西溪）河口段。

根因：三条河在汇流口各用各的"解析水位"且互不调和——
- 主河 `riverWaterYAt`（`src/scene/map.js:2402`）≈ +2.7m；
- 中西溪 `centerWestStreamWaterYAt`（`map.js:2694`，硬编码 `lerp(1.8,-2.8,t)`）≈ -0.5m，且没有像支流那样在河口与主河对齐；
- `southwest_creek` 已通过 `getBranchMouthWaterY` 与主河对齐（OK）。

`sampleChannelNetwork`（`map.js:2836`）的"最近河道胜出"逐点仲裁在汇流口于 +2.7 与 -0.5 间反复切换 →（1）河床被两套深度分别挖出 → 水下错台；（2）主河水面铺到被压低的地形上 → 漫溢、两槽混成大水洼。

目标：保留汇流口水潭，但把水收回河道、止住向平沙地的漫溢，并抹平水下错台。允许调整该处地形。

## 成功标准

- 水面不再铺到河岸外的平沙地。
- 水下河床平整、无错台多边形。
- 仍保留一个连贯水潭，主河道走向清晰可辨。
- 邻近河段（主河上下游、中西溪上游、southwest_creek）不被波及，无新漫溢/飘空。
- (-270,8) 可行走区/碰撞未异常塌陷。

## 计划改动（src/scene/map.js）

1. **中西溪水位汇流口调和（核心）**：`getCenterWestStreamSampleAt`(2698)/`centerWestStreamWaterYAt`(2694)
   按到主河距离 blend，使下游靠近汇流口时水位平滑收敛到 `getRiverSampleAt(x,z).waterY`；上游保持原溪流水位。
   水位统一后，碳刻 `bedTarget` 与水面 `channelNetworkWaterYAt` 自动一致，错台消除。
2. **统一汇流口碳刻盆地**：复核 `applyLargeRiverValleyHeight`(2674)/`applyCenterWestStreamValleyHeight`(2718)
   在汇流口的叠加压低，用以 (-270,8) 为中心的 Gauss 权重抬升/收紧外圈河谷下压，让水潭外缘升过统一水面。
   碳刻保持只加深(Math.min)语义。
3. **水带收回河道止漫溢**：`buildHeroRiverGeometry`(4322) 的 `maxShoreExtend` 在汇流口段适度下调（10→6）作安全冗余，
   不破坏 `shoreExtent`(4261) 已有的"被另一水道主导即停止外延"逻辑。

## 验证计划

1. `npx vite build` 通过。
2. headless 截图脚本走 vite preview，移动到 (-270,8) 正对汇流口截图对照原始截图。
3. 走查邻近河段未受影响。
4. 确认地形改动温和、碰撞正常。

## 假设与不做项

- 只在汇流口邻域调和中西溪/支流水位，不全程改为主河水位（避免上游被淹）。
- 不重构 `sampleChannelNetwork` 为全局加权混合。
- 不改水的材质/透明度/焦散外观，本次只解决高度/河道关系。
