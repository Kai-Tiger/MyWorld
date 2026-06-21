# 使用 fog.png 重做白雾门效果

## 背景

城堡入口白雾门上一版使用四层 procedural shader plane 叠加。用户新增了 `public/textures/fog.png`，希望改为使用该贴图表现白雾门，并去掉四层结构。

## 目标

- 白雾门使用 `public/textures/fog.png` 作为表面雾气纹理。
- 雾门只保留一个 mesh，不再创建四层叠加结构。
- 雾门表面有缓慢飘动的雾气效果。
- 不改变进入城堡的交互、碰撞和传送逻辑。

## 实施

- 将雾门材质改为单层贴图 shader，使用 `/textures/fog.png`。
- 使用贴图 RGB 亮度作为雾气浓度和透明度来源。
- 在 shader 中对同一贴图做两组滚动 UV 采样，形成纵向飘动和轻微横向漂移。
- 删除 `layerDefs`、`fogLayers` 和每层不同速度、相位、透明度、缩放的逻辑。
- 保留雾门尺寸、位置 socket、边缘羽化、中心微光和 point light。

## 验收

- `npm run build` 成功。
- 城堡门前白雾门表面能看到 `fog.png` 的雾纹并持续飘动。
- 场景中只创建一个名为 `fog-gate` 的雾门 mesh。
- 浏览器控制台没有 `/textures/fog.png` 404 或 shader 编译错误。

## 假设

- `fog.png` 是 RGB 贴图，无 alpha 通道，因此使用亮度生成透明度。
- 对同一贴图做两次 shader 采样用于流动混合，不属于保留四层结构。
