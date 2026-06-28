# 河流视觉升级

## 背景与目标

当前户外河流系统已经使用 custom 地形-following 几何体和着色器而不是Three.js `Water.js`，但视觉 result 仍然读作不平整: 岸线边缘可以看起来硬边，泡沫可以感觉 unmotivated，和所有水 bodies share 过于更的相同着色器行为。 Improve 现有 custom 河流 pipeline 不带 re放置河流网络或玩法采样。

## 成功标准

- 河流视觉使用流动速度，white水体，水深度，和水 body type 作为着色器输入。
- 主河流，湿润冲沟，辫状河流，湖，和汇流池可以 share 一个合并网格同时渲染带有 distinct 视觉行为。
- Shorelines 淡出自然地进入浅水泥/岸线颜色不带矩形水片边缘。
- 泡沫出现 mainly 在岸线，浅水 fast 水，汇流区，和 white水体段落而不是比作为 uniform 明亮条带。
- 现有玩法水体采样保持 API-compatible。

## 计划改动

- 延伸统一水几何体 attributes 带有流动速度，white水体，normalized 深度，和水 kind。
- 重新生效 `createMainRiverMaterial()` 到 drive waves，颜色，泡沫，alpha，和静止-水体行为从这些attributes。
- 移除reliance 在 world-坐标湖泊-specific 泡沫逻辑在共享河流着色器。
- 保持单层合并 `unified_water` 网格和现有调试/性能 toggles。

## 测试与验证计划

- 运行 `npm run build`。
- 运行or 检查 `?riverDebug=1` 诊断用于明显河槽 regressions。
- 手动ly 检查接近和宽视角围绕主河流，分支汇流区，湿润冲沟，辫状河槽，南侧盆地湖，和汇流池。

## 假设与范围外

- 这是一个视觉升级，不一个河流路径或地形-sculpting 阶段。
- 无Three.js `Water.js` dependency是引入d。
- 现有玩家 in-水体，流动速度，和水花行为保持compatible。
