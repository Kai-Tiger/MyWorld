# 消除 central_north_rill 沿线"水上坡 / 垂直水片"

## 背景与目标

接「(-160,40) 路口汇水潭清理」之后，玩家在 (-160,50) 及沿 rill 整条河仍看到**水贴着陡坡形成垂直玻璃水片 / 水往坡上爬**。

根因：渲染水面 = 河床 + 深度（`channelNetworkWaterYAt` 用 `getTerrainHeight(中心线)+depth`），水面忠实跟随河床纵向起伏。实测沿线河床剖面（headless `getTerrainHeight` 探针）发现两类陡纵坡：

1. **源头跌水头（57–61°）**：每条河从高源头沙丘（+4~5m）一步跌进碳刻河床（−2m），落差 6–7m——rill 在 (−132,101)、old_center 在 (−181,106)。属**向下跌水**。
2. **上爬台阶（17–30°）**：河床局部抬升处水往坡上爬——rill 河口段 z−36(24°)、old_center 跨 −2.3 沙脊 z52(27°)（正在玩家脚下）、center_left 河口 z−25(30°)。

用户决定：**全河平滑重塑**且**保留 (-160,34) 的 −4.3 深汇流水潭**。两类陡坡分别对应两种修法（碳刻只能加深，不能抬高下游来削平跌水）。

## 成功标准

- 沿 rill / old_center / center_left 全程纵向水面坡度 ≤~15°；无垂直玻璃水片、无突兀水上坡台阶。
- 保留 −4.3 深水潭；rill 平缓跌入/缓出，池口不再竖直台阶。
- 水不飘空、不漫岸；(-274,8) 老水潭、主河、邻近地形不受影响；河道可行走。

## 实施改动（均在 `src/scene/map.js`）

1. **裁剪高源头段 + 降 sourceLift（消向下跌水头）**
   - `central_north_rill`：删源点 `{-90,170}`，起点改 `{-133,100}`（床 −2.25）；`sourceLift` 3.5→1.0，`halfWidthStart` 1.05→1.4。
   - `old_center`：起点 `{-235,140}/{-171,100}` 改为 `{-181,106}/{-168,78}`（床 −2.56）；显式 `sourceLift: 0.8`。
   - `center_left` 源头已低，不裁。

2. **新增纵向限坡碳刻 `applyChannelSmoothGrade`（消向上台阶/池口上爬）**
   - 对 rill/old_center/center_left 懒加载预计算平滑床剖面 `B(t)`：沿中心线密采 `channelBedNoSmooth`（直接重跑「平滑前」修改器链求床，不依赖 onReady 时序、不递归）；做双向上坡限速（每米上升 ≤ tan(12°)）。按弧长缓存，含 `makePathBounds` 早退。
   - 作为 heightModifier 排在 `applyConfluencePoolCarve` 之后；核心区内 `Math.min(height, lerp(B(t), height, 岸坡 t))`，只加深不填浅深潭。

3. **保留深水潭**：`CONFLUENCE_POOLS` 不动；限坡碳刻把进/出池竖直台阶缓化。

## 验证（已完成）

- `npx vite build` 通过。
- headless 探针重测三条河中心线纵剖面：全程 ≤~14°，57–61° 跌水头消失（rill 由 +4→−2 改为 −2.25 平滑降到 −4.3；河口台阶 24°→13°；center_left 30°→9°）。
- headless 截图（玩家位 (-160,50)、两处旧跌水头、南出水口、斜俯总览）：水均为平坦下沉小溪，无垂直水片/水上坡。
- (-274,8) 老水潭外观不变；池本身、主河不受影响。

## 假设与不做项

- 保留深潭，故 rill 南段（池→河口 +1）为缓出水洼（限坡后 ≤13°），不强行改成全程单调下降（会牵动 central_side_channel 水位）。
- 不改水材质/透明度/焦散；不重构 `sampleChannelNetwork`。
