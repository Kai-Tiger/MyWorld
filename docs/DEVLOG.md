# 等轴测小游戏开发技术分享

> 一次从零搭建浏览器端等轴测 3D 游戏的完整记录，涵盖选型、素材来源、核心功能实现与踩坑经验。

---

## 目录

1. [项目概况](#1-项目概况)
2. [技术选型](#2-技术选型)
3. [项目结构](#3-项目结构)
4. [素材来源](#4-素材来源)
5. [核心功能实现](#5-核心功能实现)
   - 5.1 等轴测摄像机
   - 5.2 PBR 渲染管线
   - 5.3 FBX 角色模型与骨骼动画
   - 5.4 跳跃物理
   - 5.5 地图生成与风动画
   - 5.6 地面岩石质感贴图
   - 5.7 阴影优化
   - 5.8 进入建筑与室内场景
6. [踩坑记录](#6-踩坑记录)

---

## 1 项目概况

**风格定位**：二次元动物之家（Animal Crossing）风格，等轴测俯视视角，程序化生成地图与家具。

**核心玩法**：
- 玩家在室外地图自由移动、跳跃
- 走近房屋正门弹出提示，点击进入室内
- 室内场景可自由移动，点击离开回到室外

**运行方式**：

```bash
npm install
npm run dev   # Vite 开发服务器
```

---

## 2 技术选型

| 层级 | 选择 | 理由 |
|------|------|------|
| 渲染 | **Three.js 0.169** | 成熟、文档齐全，addons 提供 FBXLoader；WebGPU 还不够稳定 |
| 构建 | **Vite 5** | 原生 ESM、热更新快，零配置支持 Three.js addons 的 bare import |
| 语言 | 原生 JS（ESM） | 小项目无需 TypeScript 的编译开销 |
| 着色 | **MeshLambertMaterial**（地图）/ **MeshStandardMaterial**（地面）| Lambert 性价比高；地面用 Standard 才能正确采样法线贴图 |
| 色调映射 | **ACESFilmicToneMapping** | 自动处理 HDR 曝光，室外日光场景颜色更自然 |
| 摄像机 | **OrthographicCamera** | 等轴测风格必需，避免透视畸变，s=10（室外）/ s=5（室内）|

---

## 3 项目结构

```
src/
├── main.js                  # 渲染器初始化、游戏主循环、场景切换
├── ui.js                    # HUD + 虚拟方向键 + 进门/离开弹窗
├── scene/
│   ├── scene.js             # 室外摄像机 + 雾效
│   ├── lighting.js          # 半球光 + 太阳方向光（含阴影）+ 补光
│   ├── map.js               # 地图：地面、树木、房屋、道路、石头
│   └── indoor.js            # 室内场景：家具、灯光、摄像机
├── entities/
│   ├── player.js            # FBX 角色加载、移动、跳跃、动画
│   └── npc.js               # NPC 漫游
└── systems/
    ├── input.js             # 键盘 + 虚拟按钮输入
    ├── collision.js         # 圆形碰撞检测，边界可配置
    └── interaction.js       # 门距离检测
```

---

## 4 素材来源

### 角色模型
- 格式：**FBX**（含骨骼动画）
- 缩放约定：FBX 文件通常以厘米为单位，加载后 `scale.setScalar(0.01)` 换算为米

### 地面贴图
- 来源：[Polyhaven](https://polyhaven.com) — 免费 CC0 PBR 纹理库
- 使用贴图：`coast_sand_rocks_02`（1K 分辨率）
  - `coast_sand_rocks_02_diff_1k.jpg` — 漫反射（颜色）
  - `coast_sand_rocks_02_nor_gl_1k.jpg` — 法线贴图（OpenGL 格式）
  - `coast_sand_rocks_02_rough_1k.jpg` — 粗糙度贴图

### 程序化素材
项目中大量使用 Canvas API 即时生成贴图，无需外部素材文件：
- 地板木纹（5色木条 + 细纹）
- 地毯（径向渐变 + 同心圆 + 小花）

---

## 5 核心功能实现

### 5.1 等轴测摄像机

等轴测视角的关键是用**正交摄像机**代替透视摄像机，消除近大远小效果。

```js
// scene.js
const s = 10
const camera = new THREE.OrthographicCamera(
  -s * aspect, s * aspect,   // left, right
  s, -s,                     // top, bottom
  0.1, 200
)
camera.position.set(20, 20, 20)
camera.lookAt(0, 0, 0)
```

- `s` 控制视野范围，越大看到的场景越多
- 摄像机位于 `(20,20,20)`，三轴等距，形成标准 45° 等轴测角度
- 窗口 resize 时需同步更新 `left/right/top/bottom` 并调用 `updateProjectionMatrix()`

**摄像机跟随**：直接 `copy` 不要用 `lerp`，否则地面会因浮点抖动产生微小抖动感。

```js
camera.position.copy(playerPos).add(_offset)  // ✅
camera.position.lerp(target, 0.1)             // ❌ 会抖
```

---

### 5.2 PBR 渲染管线

```js
// main.js
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.2
renderer.outputColorSpace = THREE.SRGBColorSpace
```

地面使用 `MeshStandardMaterial` 加载三张 PBR 贴图：

```js
new THREE.MeshStandardMaterial({
  map:         diffTex,    // 漫反射颜色
  normalMap:   norTex,     // 法线（增加表面细节）
  roughnessMap: roughTex,  // 粗糙度（控制高光散射）
  roughness: 0.85,
  metalness: 0.0,
})
```

法线贴图需要设置正确的 `normalScale`，过大会显得不自然：

```js
mat.normalScale.set(0.6, 0.6)
```

---

### 5.3 FBX 角色模型与骨骼动画

```js
// player.js
const loader = new FBXLoader()
loader.load('/models/player.fbx', (object) => {
  object.scale.setScalar(0.01)
  group.add(object)

  if (object.animations.length > 0) {
    mixer = new THREE.AnimationMixer(object)
    idleAction = mixer.clipAction(findClip('idle', 'Idle', 'IDLE'))
    walkAction = mixer.clipAction(findClip('walk', 'Walk', 'run', 'Run'))
    currentAction = idleAction
    currentAction.play()
  }
})
```

动画切换用 `fadeIn/fadeOut` 实现平滑过渡（0.2s）：

```js
function switchAction(next) {
  if (!next || next === currentAction) return
  next.reset().fadeIn(0.2).play()
  currentAction.fadeOut(0.2)
  currentAction = next
}
```

`AnimationMixer.update(dt)` 必须在每帧主循环中调用才能推进动画时间轴。

---

### 5.4 跳跃物理

基于运动学公式 `v² = 2gh`，令跳跃高度等于角色模型高度：

```js
const MODEL_HEIGHT = 1.8   // FBX × 0.01 ≈ 1.8m
const GRAVITY      = 20    // m/s²，比现实大以保持手感轻快
const JUMP_SPEED   = Math.sqrt(2 * GRAVITY * MODEL_HEIGHT)  // ≈ 8.5 m/s
```

每帧积分：

```js
if (!onGround) {
  vy -= GRAVITY * dt
  group.position.y += vy * dt
  if (group.position.y <= 0) {
    group.position.y = 0
    vy = 0
    onGround = true
  }
}
```

防连跳：用 `spaceWasPressed` 记录上一帧空格状态，只在「本帧按下 + 上帧未按 + 在地面」时起跳。

**地面阴影随跳跃淡化**：

```js
const heightRatio = group.position.y / MODEL_HEIGHT
shadowMesh.position.y = 0.01 - group.position.y  // 阴影留在地面
shadowMesh.material.opacity = 0.2 * (1 - heightRatio * 0.7)
```

---

### 5.5 地图生成与风动画

**树木**：通过 `ConeGeometry`（多层树冠）+ `CylinderGeometry`（树干）程序生成，每棵树持有随机的 `windPhase` 和 `windSpeed`：

```js
// map.js — update(time) 在主循环每帧调用
trees.forEach(({ crownGroup, windPhase, windSpeed }) => {
  crownGroup.rotation.x = Math.sin(time * windSpeed + windPhase) * 0.030
                        + Math.sin(time * windSpeed * 2.5 + windPhase) * 0.010
  crownGroup.rotation.z = Math.cos(time * windSpeed * 0.7 + windPhase) * 0.020
})
```

双频正弦叠加让摇摆不显机械感。

**弯曲道路**：使用 `CatmullRomCurve3` 生成平滑曲线，沿曲线采样顶点构造带状几何体：

```js
const curve = new THREE.CatmullRomCurve3(controlPoints)
const points = curve.getPoints(60)
// 每个点向左右各偏移 roadWidth/2，构建顶点 strip
```

**太阳运动**：60 分钟一圈，每帧更新位置模拟昼夜：

```js
const sunPhase = (clock.elapsedTime % 3600) / 3600 * Math.PI * 2
sun.position.set(
  Math.cos(sunPhase) * 40,
  Math.sin(sunPhase) * 30 + 15,
  Math.sin(sunPhase * 0.6) * 25
)
```

---

### 5.6 地面岩石质感贴图

地面从纯色换成 PBR 贴图只需修改 `MeshStandardMaterial`：

```js
// 贴图平铺 24×24，覆盖 96×96 地图
const repeat = 24
[diffTex, norTex, roughTex].forEach(t => {
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(repeat, repeat)
})
```

关键：使用法线贴图（`normalMap`）而非凹凸贴图（`bumpMap`），前者效果更真实且性能相近。

---

### 5.7 阴影优化

场景中阴影渲染是最大的性能瓶颈，优化策略分三层：

**① 关闭自动更新，手动控制频率**

```js
renderer.shadowMap.autoUpdate = false  // 不再每帧自动更新

// 玩家移动时每帧更新；静止时每 5 秒更新一次（跟随太阳）
const playerMoved = !pos.equals(_lastPos)
if (playerMoved || shadowTimer >= 5) {
  renderer.shadowMap.needsUpdate = true
  shadowTimer = 0
}
```

**② 缩小阴影相机范围**

```js
sun.shadow.camera.left = sun.shadow.camera.bottom = -22
sun.shadow.camera.right = sun.shadow.camera.top  =  22
// 从 ±50 缩小到 ±22，阴影贴图 2048px / 44 单位 ≈ 46px/单位，清晰度提升
```

**③ 软阴影**

```js
renderer.shadowMap.type = THREE.PCFSoftShadowMap
```

---

### 5.8 进入建筑与室内场景

#### 门位置计算

每栋房屋有世界坐标 `(x, z)` 和旋转角 `rotY`，门在房屋本地坐标 `(0, 0, 1.55)`：

```js
// interaction.js
doorX = houseX + Math.sin(rotY) * 1.55
doorZ = houseZ + Math.cos(rotY) * 1.55
```

#### 3D 位置投影到屏幕

进门提示气泡需要跟随玩家的屏幕坐标：

```js
const v = worldPos.clone().project(camera)   // NDC 坐标 [-1, 1]
const sx = (v.x * 0.5 + 0.5) * renderer.domElement.clientWidth
const sy = (-v.y * 0.5 + 0.5) * renderer.domElement.clientHeight
// 在 (sx+60, sy-80) 处显示气泡
```

#### 场景切换：角色 Group 在两个 Scene 间迁移

Three.js 的 `scene.add(obj)` 会先将 obj 从当前父节点移除，利用这个特性可以优雅地迁移角色：

```js
// 进门
savedOutdoorPos = player.getPosition().clone()
indoorScene.add(player.getGroup())  // 自动从 outdoorScene 移除
player.setPosition(0, 2.5)          // 传送到门口

// 离开
scene.add(player.getGroup())        // 自动从 indoorScene 移除
player.setPosition(savedOutdoorPos.x, savedOutdoorPos.z)
```

#### 室内碰撞边界

室内外使用同一套 `CollisionSystem`，通过构造参数切换边界范围：

```js
// 室外：±22（大地图）
const collision = new CollisionSystem(collidables)

// 室内：房间 8×6，减去玩家半径 0.4
const indoorCollision = new CollisionSystem([], 3.6, 2.6)
```

---

## 6 踩坑记录

| 问题 | 原因 | 解决 |
|------|------|------|
| 移动时地面抖动 | 摄像机跟随用了 `lerp`，浮点精度不足导致微小位移 | 改为 `camera.position.copy()` 直接跟随 |
| 项目黑屏 | `lighting.js` 返回对象中把 `hemi` 写成了 `ambient`（已重命名） | 修正变量名为 `hemi` |
| 岩石穿模 | `makeRock` 没有返回半径 r，未被加入碰撞体列表 | 返回 r，将岩石加入 collidables |
| 树木严重卡顿 | 引入 Polyhaven GLTF 树木，单个 .bin 文件 58MB，含高精度网格 | 回退为程序化手绘树木 |
| 草地显示为球体 | `InstancedMesh` 用的自定义 `BufferGeometry` 没有设 UV，法线方向错误 | 移除草地功能 |
| 阴影闪烁/跳动 | 每帧都调用 `needsUpdate = true`，且太阳在快速移动 | 关闭 autoUpdate，玩家移动时更新，静止每 5s 更新 |
| 掉帧（每 6 帧一次重帧） | 阴影更新改为每 6 帧触发，固定间隔导致周期性卡顿 | 改为基于时间（`shadowTimer >= 5`）触发 |
| FBX 动画静止也在播放 | 移动/静止都调用了 `switchAction(walkAction)` | 待修复（区分 moving/idle 状态） |

---

*最后更新：2026-05-26*
