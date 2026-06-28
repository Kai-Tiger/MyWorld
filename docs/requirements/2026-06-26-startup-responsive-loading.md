#启动响应式加载

## 背景与目标

重新freshing page 可以触发 Chrome's "page unresponsive" 提示 even though 游戏是仍然加载。 加载screen 已经存在，但启动工作可以仍然 monopolize 主 th看起来像长足够该浏览器不能 repaint或process 输入。

## 成功标准

- 加载overlay paints 之前 heavy 启动工作开始。
- 加载文本 continues 到报告 meaningful 启动 stages。
- Heavy 地图-看起来像y 初始化 yields 之间 major subsystems。
- Chrome 应被更少类似ly 到显示 unresponsive-page 提示期间 refresh。
- 现有玩法行为保持不变之后加载完成。

## 计划改动

- 替换direct `loadingOverlay.textContent` 写入带有一个小 status 更新r。
- Yield 一个浏览器帧之后overlay是attached 之前构建地图。
- 新增一个 `createMap` 启动-阶段 callback 用于地形/地图 subsystem status。
- 拆分高度图-看起来像y 地图初始化进入帧-独立d 阶段。
- 保持现有模型预加载，地形 progress，预热，和 look-sweep 行为。

## 测试与验证计划

- 运行 `npm run build`。
- 开始开发服务器和 refresh page。
- 验证加载overlay 出现立即和 advances 通过 stages。
- 检查控制台用于新启动，着色器，or WebGL 错误。
- 验证玩法开始 normally 之后加载sweep。

## 假设与范围外

- 提示是ca使用d mainly 由长 main-th看起来像启动 tasks，不网络 stalls。
- 这改变 improves responsiveness 不带重新设计资源 pipeline。
- 这不改变模型，地形，水，草，or 树视觉。
