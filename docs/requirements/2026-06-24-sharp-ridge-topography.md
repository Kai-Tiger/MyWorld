# 远山山脊锐利化

## Context and Goal

远处雪山当前仍偏土丘感，主峰和脊线过圆，缺少阿尔卑斯/日照金山那种连续多峰、棱脊清晰的远景体量感。

目标是在不修改近景地貌参数、材质和碰撞系统的前提下，收紧远山轮廓，形成更明显的峰顶和山脊线。

## Success Criteria

- 远处雪山的峰体更高更尖，出现连续主峰-副峰关系。
- 山脊区域出现更明显的窄脊带起伏，远山不再出现明显土丘化平顶。
- 不影响河谷 carve 与保护区地形（城堡、矿洞、出发区）。

## Planned Changes

- [ ] 修改 `src/scene/map.js` 中 `applySnowMountainHeight`：
  - 调整峰顶形状幂指数与落差半径，使核心更尖。
  - 增加基于主轴方向的窄脊线项。
  - 补充若干脊线条片段（主峰-副峰连接），只做 `Math.max` 叠加式提拉。
- [ ] 保持 `heightModifiers` 顺序不变，仅替换该函数内部实现。

## Verification Plan

- 先执行本地运行检查远景视觉。
- 执行 `npm run build`（如需发布或合并前确认）。

## Assumptions

- 远景效果主要受 `applySnowMountainHeight` 与远景 proxy 着色共同决定。
- 不改 `scene`、相机、雾和远景材质，仅修改高度函数。
