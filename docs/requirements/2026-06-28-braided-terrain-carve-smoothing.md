# 辫状地形Carve平滑

## 背景与目标

远处敌人区域附近 `(-448.9, -474.9)` 可以显示短，重复 wave-类似地形裁切。 运行时 probing 显示的本地高度改动上方玩家's `0.55m` auto-步骤阈值上方一个 `1m` 采样步骤。 区域 s其在新区辫状河流网络和内部参考/全局侵蚀地形斑块，位置变窄河槽裁切和 high-frequency 侵蚀 details 重叠。

目标: 平滑辫状河流地形裁切因此播放able 草地不再有重复隐藏 l边缘，同时保持河流路径，水连续性，和玩家移动 rules 不变。

## 成功标准

- 远处敌人区域不再有重复变窄地形 waves 该玩家可以明显 sink 进入。
- 玩家可以行走周围 `(-448.9, -474.9)` 不带裁切 ca使用d 由辫状河流雕刻边缘。
- 辫状河流河床保持下方可见水，带有无新明显干洞或悬空水片。
- 项目构建 successfully。

## 计划改动

- Widen 新区辫状河岸运行因此裁切 span 多个地形 vertices 而不是一个变窄条带。
- Broaden 过渡从河槽核心到浅水边缘到防止 neighbo环采样从切换 abruptly 之间差异erent 河槽针对。
- 降低外侧 apron drop 因此地形返回到周围高度更多 gently。
- Dampen 参考块's high-frequency crest 和 fine-切割噪声仅在远处播放able pocket。
- Dampen 全局树枝状侵蚀裁切/shoulder 仅在相同远处播放able pocket。
- 保持`AUTO_STEP` 和其他玩家移动阈值不变。

## 测试与验证计划

- 重新-run 一个目标的运行时高度 probe 周围 `(-448.9, -474.9)` 和对比本地 `1m` neighbor 跳跃 against 之前 `~1.26m` 值。
- 运行 `npm run build` 到 catch syntax 和 module regressions。
- 如果运行时检查ion是实际可用，teleport 到远处敌人区域和确认行走不再 produces 明显地形裁切。

## 假设与范围外

- 报告的截图是从远处敌人区域附近 `(-448.9, -474.9)`。
- 草密度是视觉覆盖仅和是不 root ca使用。
- 此改动不移动辫状河流控制点，重新设计水渲染，or 改变玩家碰撞 rules。
