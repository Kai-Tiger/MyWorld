# 天气改造：蓝天白云 + 大气散射（固定晴朗白天）

## 背景与目标

用户要把天空从原来的灰阴天改成参考图那样的蓝天 + 白色蓬松积云 + 大气散射。选择：固定晴朗白天（去昼夜循环）、中等积云。

## 实施改动

### `src/main.js`
- 新增 `const SUN_PHASE_FIXED = 0.95`，把 7 处 `(clock.elapsedTime % 1800)/1800 * Math.PI * 2` 全替换为该常量 → 光照/太阳位/曝光恒为白天（`nightFactor≈0`，月亮 inert）。

### `src/scene/sky.js`（重写穹顶着色器）
- 调色：天顶蓝 `#2f6fd0`、地平线霾白蓝 `#d4e6f5`、云白 `#ffffff`/云底灰蓝 `#b7c3d0`、太阳暖白光晕 `#fff1d6`、`uCloudCover=0.42`。
- fragment：
  - 大气散射渐变 `mix(horizon, zenith, pow(dir.y,0.5))` + 低空更白 + 太阳侧 Mie 光晕/日盘。
  - 白积云：软投影 `dir.xz/(dir.y+0.32)*0.55`，三层 fbm 成块；体积阴影（与下方密度差→云顶亮云底略灰）；朝阳侧描边提亮；近地平线淡出；随风缓慢平移。
- `update()`：去掉灰色覆盖，把 `scene.background`/`scene.fog.color` 设为地平线霾色 `#cfe2f3`（远山泛蓝白大气透视）。移除了不再用的 FBX 云层（穹顶 shader 已提供云）。

## 验证（已完成）

- `npx vite build` 通过。
- headless 抬头多角度截图：蓝天天顶→地平线渐变、白色蓬松积云（上亮下暗）、太阳光晕/日盘正常。
- 远景 vista：远山蓝白大气透视；地面/角色受暖阳照明明亮、有清晰阴影；全程白天不变黑。

## 假设与不做项
- 固定白天，无昼夜/星空（代码保留但 inert）。
- 不引第三方天空库；用现有穹顶 shader 升级。
- 中等云量（`uCloudCover` 可调）；太阳角度 `SUN_PHASE_FIXED` 可调。
