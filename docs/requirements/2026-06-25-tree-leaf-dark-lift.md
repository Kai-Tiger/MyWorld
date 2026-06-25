# 模型树雪地前暗部提亮

## Context and Goal

雪地和远景亮度较高时，forest_pack 模型树的深绿色叶片在 ACES 曝光和硬 alpha cutout 下容易变成黑色剪影。目标是在不改变地形、水体、树密度和全局光照的前提下，单独抬高树叶暗部。

## Success Criteria

- 雪地前的模型树叶不再大面积接近纯黑。
- 树干仍保留深色体积感，不被整体洗灰。
- 世界随机树和手工 forest_pack 树都使用同一套树叶暗部补偿。
- 绿色/黄色树比例参数不受影响。

## Planned Changes

- 在 `src/config/world.js` 新增 `TREE_LIGHT_GRADE`，控制叶片暗部提亮、最低亮度和雪地对比补偿。
- 将 `TREE_COLOR_GRADE.saturation` 从过高的黑绿倾向调低到更稳的值。
- 在 `src/scene/map.js` 的树材质 shader 中，只对叶片/crown 材质启用暗部 luminance lift。
- 保持 alpha cutout、LOD、实例化和树模型选择逻辑不变。

## Test / Verification Plan

- 运行 `npm run build`。
- 静态确认新 uniform 只接入树调色 shader。
- 静态确认 world tree crown 和手工 forest_pack 叶片会启用暗部提亮。

## Assumptions and Out of Scope

- 本次目标是减少黑色剪影，不把树改成浅色或卡通风。
- 不通过提高整场灯光解决，避免雪地、角色和山体曝光一起改变。
- 不新增 UI 面板或运行时调试 API。
