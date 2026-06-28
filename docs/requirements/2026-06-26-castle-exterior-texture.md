# 城堡外部贴图

## 背景与目标

替换户外城堡 facade 石材贴图使用user-提供的浅色灰色不规则石材墙图像，且不改变室内城堡材质。

## 成功标准

- 户外城堡入口/facade 使用 `public/textures/castle_exterior_stone_wall_diff.png`。
- 外部石材材质保持一个 neutral 白色染色因此新浅色灰色贴图是明显可读和不调暗由旧 `Stone_Soot`/`Stone_Ash` 颜色。
- Indoor 城堡 zones 继续到使用现有 `castle_stone_wall_*` 材质设置。
- 无城堡模型，碰撞体，布局，雾门，or 光照行为改动。
- 游戏构建和新贴图 URL resolves在本地开发服务器。

## 计划改动

- Copy 提供的 PNG 从 `/Users/likai.lear/Downloads/Generated image 1 (16).png` 进入 `public/textures/`。
- 新增一个 facade-only 石材差异使用上方ride在`src/scene/castle.js`。
- 使用neutral 外部石材染色用于上方ride 因此提供的图像控制可见墙颜色。
- 禁用旧 brick 正常/roughness 地图用于外部上方ride 因此它们的 brick pattern 不 conflict 使用新图像。

## 测试与验证计划

- 运行 `npm run build`。
- 确认 `/textures/castle_exterior_stone_wall_diff.png` 返回 successfully 从本地开发服务器。
- 加载游戏和检查该户外城堡 facade 使用新浅色灰色不规则石材图像。
- 检查运行时 facade `Stone_*` 材质和确认它们的 `color`是`#ffffff`，带有无正常/roughness 地图 attached。

## 假设与范围外

- "External 城堡贴图" 表示户外 facade 已加载从 `/castle/exterior/gatehouse.glb`。
- 提供的图像是使用作为一个颜色/差异使用地图仅; 无派生正常，roughness，or AO 地图是生成。
- Indoor 城堡 zones 和运行时回退灰色box 材质保持不变。
