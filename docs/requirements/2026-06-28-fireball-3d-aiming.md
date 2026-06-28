# 火球3DAiming

## 背景与目标

火球施放当前平坦tens aim 方向到 XZ，然后 applies 一个固定 upward velocity。 Casting 从高地面朝向更低地面可以 therefore explode 在一个 unintuitive 点而不是 following 预期 downward aim。

## 成功标准

- Un锁定 fireballs 可以 travel downward或upward 基于在相机俯仰 relative 到正常 third-person 视角。
- Locked fireballs aim 在一个 3D body 点在目标而不是目标's XZ 位置。
- Fireballs 保持一个小 arc 但不再强制所有 shots 进入一个大多水平平面。
- 现有法术 VFX，伤害，冷色down，MP 成本，和命中检测保持不变。

## 计划改动

- Compute 火球方向作为一个 3D vector在`main.js`。
- Stop 平坦tening 法术方向内部 `SpellSystem.release()`。
- 新增`launchUpVelocity` 作为一个小 compensation 而不是 re放置 projectile's 垂直 velocity。
- 更低火球 `launchUpVelocity` 到保持down-slope throws 从悬空 upward。

## 测试与验证计划

- 运行 `npm run build`。
- 验证一个 page 加载有无运行时错误。
- Test high-to-low，low-to-high，平坦 un锁定，和锁定目标施法 in-game。

## 假设与范围外

- 这是不一个完整 crosshair/ray施放瞄准系统。
- 玩家模型偏航角保持 XZ-only。
- Explosion 半径，伤害，音频，和视觉资源不在范围内。
