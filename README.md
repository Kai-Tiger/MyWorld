# My Game

第三人称 3D 动作探索原型，基于 Three.js + Vite。项目当前包含室外高山/河谷地形、城堡室内外场景、矿洞交互、NPC 对话、敌人战斗、装备/道具 HUD、法术和音效等运行时模块。

## 快速开始

```bash
npm install
npm run dev
```

Vite 会自动打开浏览器，默认地址是 http://localhost:3000。

生产构建：

```bash
npm run build
npm run preview
```

## 操作

| 按键 | 动作 |
|------|------|
| WASD / 方向键 | 移动角色；在矿洞梯子上控制上下攀爬 |
| 鼠标拖拽 | 旋转第三人称镜头 |
| Q | 锁定/切换敌人目标 |
| E | 与白雾、门、梯子等场景入口交互；可用时释放火球 |
| H | 拾取附近物品 |
| R | 使用当前快捷道具 |
| T | 打开/关闭背包面板 |
| Z | 切换武器 |
| F | 切换快捷道具；在战斗系统中也用于投掷输入 |
| Esc | 退出对话或关闭当前交互状态 |

## 当前内容

- 大型室外地形：高山、河谷、河流、湖泊、草地、树木和远景元素。
- 城堡系统：城堡外观、白雾入口、室内分区、门和露台视角。
- 矿洞系统：地表入口、地下路径、梯子攀爬和敌人可见性处理。
- 角色系统：玩家 FBX 动画、NPC 对话、敌人巡逻/追击/受击/死亡。
- 战斗系统：近战、格挡反馈、锁定目标、火球法术、投掷物、受击特效。
- UI 与音效：生命/法力/精力条、装备菱形 HUD、背包、拾取提示、篝火菜单、脚步和战斗音效。
- 性能/调试：启动加载遮罩、运行时性能监控、可选调试参数。

## 项目结构

```text
.
├── index.html              # Vite 入口 HTML
├── vite.config.js          # 本地端口、自动打开浏览器、构建输出配置
├── package.json            # npm 脚本与依赖
├── src/
│   ├── main.js             # 游戏启动、主循环、场景切换、交互编排
│   ├── ui.js               # HUD、提示、背包、对话、战斗覆盖层
│   ├── config/             # 平衡数值、世界坐标、灯光、城堡、拾取物配置
│   ├── scene/              # 室外地图、地形、天空、灯光、城堡、室内场景
│   ├── entities/           # 玩家、NPC、敌人实体
│   ├── systems/            # 输入、碰撞、相机、战斗、法术、音频、背包、性能
│   ├── effects/            # 拾取光环、治疗光效、血迹等运行时特效
│   ├── characters/         # 玩家/NPC/敌人的 FBX 模型与动画
│   ├── place/              # 旧教堂废墟等场景模型与碰撞数据
│   └── weapons/            # 武器 GLB 资源
├── public/
│   ├── audio/              # 运行时音效
│   ├── castle/             # 城堡运行时 GLB 与 manifest
│   ├── heightmaps/         # 高度图与地形元数据
│   ├── icons/              # 装备图标
│   └── models/             # 地形、树木、草、石头、角色等公开模型资源
├── assets/
│   └── blender/            # Blender 源文件
├── tools/
│   ├── blender/            # Blender 资源构建/导出脚本
│   └── *.mjs               # 纹理生成等 Node 工具
└── docs/
    └── requirements/       # 已落地或计划中的功能需求文档
```

## 常用脚本

| 命令 | 用途 |
|------|------|
| `npm run dev` | 启动本地开发服务器 |
| `npm run build` | 生成生产构建到 `dist/` |
| `npm run preview` | 预览生产构建 |
| `npm run castle:build` | 使用 Blender 重建城堡运行时资源 |
| `npm run grass:build` | 使用 Blender 重建草丛模型资源 |
| `npm run terrain:alpine:heightmap` | 生成大型高山地形高度图 |

Blender 相关脚本依赖本机 `/Applications/Blender.app/Contents/MacOS/Blender` 路径；非 macOS 或 Blender 安装路径不同的环境需要先调整 `package.json` 中对应脚本。

## 调试参数

开发环境下可以通过 URL query 或 `localStorage` 打开部分性能选项：

- `perfNoClouds=1`：关闭云层渲染。
- `perfLowDpr=1`：降低渲染像素比。
- `perfSceneRtObjectStats=0`：关闭场景实时对象统计。

示例：

```text
http://localhost:3000/?perfLowDpr=1&perfNoClouds=1
```
