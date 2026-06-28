# 移除地图Layout运行时

## 背景与目标

地图 editing 不再部分的游戏。 运行时布局位置应来自从代码配置而不是 `localStorage.mapLayout`，其中可以保持过期浏览器布局 alive 和创建两套相互竞争的位置系统。

## 成功标准

- 游戏启动忽略 `localStorage.mapLayout`。
- `defaultMap` 保持来源用于旧版布局对象仍然使用由运行时系统。
- Campfires，布局对象碰撞，和营火重生继续工作。
- 编辑器运行时代码不再 imported 由游戏入口。

## 计划改动

- 加载布局数据仅从 `defaultMap`。
- 移动运行时布局场景 application 进入 `src/scene/layout.js`。
- 移除编辑器 UI/编辑器控制ler 文件和入口分支。
- 移除所有 `localStorage.mapLayout` 读作和写入从运行时来源。

## 测试与验证计划

- 运行 `npm run build`。
- 在源码中搜索 `mapLayout`，`createMapEditor`，`createEditorUI`，和 `activeScene === 'editor'`。
- 验证陈旧 `localStorage.mapLayout` 不再影响启动布局。

## 假设与范围外

- 这移除浏览器地图编辑器路径完全。
- 其他调试/性能 localStorage keys 是无关和保持不变。
- Pickups，NPC，城堡，地形，河流，和程序化植被保持它们的现有配置 sources。
