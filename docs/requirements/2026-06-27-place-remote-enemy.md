# 放置远处敌人

## 背景与目标

新增一个户外敌对敌人在user-specified location `pos=(-448.9, -474.9)`，带有初始朝向 `280°`。 提供的 `y=57.0`是treated 作为地形高度上下文; 敌人放置应继续使用现有地面-高度采样。

## 成功标准

- 一个敌对敌人出现附近 `x=-448.9, z=-474.9`。
- 敌人使用现有 `e2` 敌人模型和战斗行为。
- 敌人初始ly faces 大约 `280°`。
- 敌人is 地面的由现有地形-高度逻辑，不一个固定 `y` 值。

## 计划改动

- App结束一个入口到 `enemyNpcs`在`src/config/world.js`。
- 使用`rotY: Math.PI * 280 / 180` 到避开新增imports 到配置文件。
- 不要新增patrol 点，新资源，or special-case 运行时逻辑。

## 测试与验证计划

- 运行 `npm run build`。
- 在游戏中，vis它specified 区域和验证敌人是可见，地面的，敌对，和返回到相同出生位置之后 disengaging。

## 假设与范围外

- 所请求的敌人应被一个正常户外敌对 NPC。
- 无 special drop，脚本的 event，patrol 路线，or custom 模型是需要。
