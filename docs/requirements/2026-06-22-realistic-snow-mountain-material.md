# 真实雪山材质调整

## Context and Goal

远处雪山当前裸岩颜色偏棕，不符合参考图 `~/Desktop/mount.png` 中冷灰岩体、白色积雪和山顶连续雪面的效果。目标是在不改变地形高度和碰撞的前提下，让雪山材质更接近真实高山。

## Success Criteria

- 高海拔雪山整体不再偏棕，裸岩呈冷灰色。
- 山顶和高处积雪更白、更连续。
- 陡坡保留岩石质感，同时有山脊/凹槽残雪。
- 低海拔普通地面、城堡、矿洞、河谷和高地材质不被整体漂白。

## Planned Changes

- 在 terrain shader 中为高海拔雪山增加冷灰岩体调色。
- 调整 `snowMask`，降低雪线并增强高海拔积雪覆盖。
- 增加细碎雪面噪声，避免单一纯白。

## Test/Verification Plan

- 静态检查 shader 中雪山调色只按高度/坡度影响高海拔区域。
- 运行 `npm run build`。

## Assumptions and Out of Scope

- `~/Desktop/mout.png` 指的是已找到的 `~/Desktop/mount.png`。
- 本次不新增贴图、不改雪山几何、不改碰撞。
