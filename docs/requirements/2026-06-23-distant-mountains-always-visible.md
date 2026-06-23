# 远山始终可见 / 河流不再"从天上流下来"

## 背景与目标

游戏中明亮的青色河流向上延伸时，末端悬在灰色天空里，看起来像"从天上流下来"。

根因（读源码确认）：

1. **河流不受雾影响**：`createHeroRiverMaterial`（`src/scene/map.js`）与 `createMainRiverMaterial` 都是 `THREE.ShaderMaterial`，未开启 `fog`，shader 内也无雾处理。Three.js 的 ShaderMaterial 默认不接收雾，河流在任意距离都保持满亮度。
2. **地形/远山受雾影响并消失**：`src/scene/scene.js` 设 `Fog(color, 360, 1500)`；世界尺寸 1600（对角线≈2263），实际游戏相机为 `src/systems/cameraThirdPerson.js` 的 `PerspectiveCamera`（`far = 1800`）。玩家移动到地图一侧时，对面山脉距离超过 fog.far=1500 被完全淡化、融进灰色天空而消失。

两者叠加 → 远处地形淡入天空、唯独高亮河流仍在 → 河流像悬空/从天上流下来。

目标：远山贴图在地图任何位置都可见（雾范围延伸，保留淡淡空气感）；远处河流随距离一起淡出，消除悬空河流观感。

## 成功标准

- 地图任意位置/视角，背景山脉轮廓与贴图都可见，不会整片融进天空。
- 远处河流随距离逐渐淡入雾色，不再比周围地形更亮地悬空；近/中景观感基本不变。
- 帧率相对改动前无明显回退。

## 已实施改动

1. `src/scene/scene.js`：`scene.fog` 由 `Fog(0x87ceeb, 360, 1500)` 改为 `Fog(0x87ceeb, 500, 2600)`。
   - `src/scene/sky.js` 每帧仅改写 `scene.fog.color`，不动 near/far，故此处 near/far 改动持久生效。
2. `src/systems/cameraThirdPerson.js`：构造默认参数 `far` 由 `1800` 提到 `3000`（≥ fog.far，避免远山在雾未淡完时被裁剪）。`src/main.js` 构造时未覆盖 far。
3. `src/scene/map.js` 的 `createHeroRiverMaterial` 与 `createMainRiverMaterial`：
   - `uniforms` 改为 `THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 } }])`，并设 `fog: true`。
     （raw ShaderMaterial 必须把 fog 的 uniform 合并进来，否则 `refreshFogUniforms` 访问 `uniforms.fogColor.value` 会报错。）
   - 顶点着色器：声明区加 `#include <fog_pars_vertex>`；`main()` 内计算 `vec4 mvPosition = modelViewMatrix * vec4(position,1.0)` 用于 `gl_Position`，并加 `#include <fog_vertex>`。
   - 片元着色器：声明区加 `#include <fog_pars_fragment>`；`gl_FragColor` 之后加 `#include <fog_fragment>`（仅混合 rgb、不动 alpha，水的透明边缘行为不受影响）。

## 验证计划

1. 启动游戏，用第三人称在地图多处移动（尤其走到边角），确认对面山脉始终可见、不再整片消失。
2. 观察河流：远段随距离淡入雾色，无悬空高亮的"天降河流"；近段颜色/流动不变。
3. 与现状截图对比（沿用 `river-iter-NN-*.jpeg` 命名习惯）。
4. 检查帧率：fog/相机 far 提升会让更多远处 chunk/proxy 进入视锥；proxy 为低面数（8 段），影响应有限。

## 假设与不在范围内

- 背景大山为 heightmap 高处 + distant proxy（`createDistantTerrainProxyMaterial`），已覆盖全图、永不卸载（`queueDistantProxyChunks` 遍历整张网格）；本次不改 proxy 着色逻辑。
- 不改 heightmap 形状、河道高度（`riverWaterYAt` 等）、地形材质纹理。
- 不处理 `scene.js` 里遗留、游戏未使用的正交相机。
- fog/far 数值为推荐起点，可在验证时微调（fog.far 越大远山越清晰但空气感越弱；建议 fog.far ≈ 相机 far 的 0.85~0.9）。
