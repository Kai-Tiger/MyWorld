# 河流河岸陡峭岩石

## 背景与目标

河流河岸坡面看起来过于裸露在放置。 新增一个 restrained 层的 3D 岩石 deco比例ns 在陡峭 main-河流和分支-河岸因此岸线读作作为 eroded 和自然。

## 成功标准

- Main-河流和分支-河流陡峭河岸接收 scattered 3D 岩石。
- 岩石是稀疏和不规则，不一个连续墙。
- 岩石避开水内部，营火空地，矿洞洞穴清理，和密集重叠带有现有森林 deco比例ns。
- 现有水，地形雕刻，河流材质，和草系统保持不变。

## 计划改动

- 复用现有森林-pack `rock_*.glb` 资源通过森林林地放置加载er。
- 生成确定性河岸岩石放置从现有 riparian 河槽 specs。
- 放置岩石围绕 geometric 河岸坡面/shoulder band，然后让现有地面阶段 snap 它们到高度图。
- 保持most 岩石 decorative-only; give 碰撞仅到更大采样。

## 测试与验证计划

- 运行 `npm run build`。
- 检查main-河流和分支-河岸在游戏用于稀疏，地面的岩石放置。
- 检查该岩石不出现在水中心，不阻挡主 traversal，和不明显 float。

## 假设与范围外

- request refers 到可见 3D 岩石，不地形贴图改动。
- 湖，远处辫状河流，干涸冲沟，和湿润冲沟不在范围内用于这阶段。
- 无新资源或special 玩法 interactions 是需要。
