# 敌人3D视线检测

## 背景与目标

敌人视线检测使用 XZ 距离仅，因此敌人 could notice或攻击玩家 even 当玩家已垂直ly 独立d或隐藏 behind 地形/城堡阻挡体。 敌人视线应 consider 高度和场景遮挡。

## 成功标准

- 敌人视线触发使用 3D 距离。
- 敌人攻击 reach 使用 3D 距离。
- 地形山脊和格挡场景碰撞体可以隐藏玩家从敌人视线。
- 现有hit-基础d 仇恨仍然生效。
- 矿洞洞穴 under地面遮挡保持一个硬边隐藏 condition。

## 计划改动

- 拆分敌人水平移动距离从 3D 视线/攻击距离。
- 新增短视线 memory 因此敌人 briefly remember 一个 seen 玩家，然后 disengage behind 覆盖。
- Compute `canSeePlayer`在户外 NPC 更新路径使用地形采样和碰撞体线检查。
- 阶段视线可见性进入敌对敌人更新。

## 测试与验证计划

- 运行 `npm run build`。
- 验证敌人可以 detect 玩家在清理，same-高度视线线。
- 验证敌人不 detect 玩家 behind 一个丘陵或城堡墙。
- 验证跳跃/飞行上方范围不触发或接收地面攻击。
- 验证hitting 一个敌人仍然触发仇恨。

## 假设与范围外

- 线的视线使用地形/碰撞体 approximation，不 expensive 网格 ray施法。
- 这针对敌人 awareness 和攻击 reach，不玩家锁定瞄准。
