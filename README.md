# My Game 🎮

俯视斜角 3D 游戏 Demo，基于 Three.js + Vite。

## 快速开始

```bash
npm install
npm run dev
```

浏览器会自动打开 http://localhost:3000

## 操作

| 按键 | 动作 |
|------|------|
| WASD / 方向键 | 移动角色 |
| 手机 | 点击屏幕下方虚拟方向键 |

## 项目结构

```
src/
├── main.js              # 入口：初始化、游戏主循环
├── ui.js                # HUD 界面 + 虚拟方向键
├── scene/
│   ├── scene.js         # 场景 + 摄像机
│   ├── lighting.js      # 灯光
│   └── map.js           # 地图生成（地面、树、房屋、碰撞体）
├── entities/
│   ├── player.js        # 玩家角色 + 走路动画
│   └── npc.js           # NPC（随机游荡、靠近显示名字）
└── systems/
    ├── input.js          # 输入管理（键盘 + 触屏）
    └── collision.js      # 圆形碰撞检测
```

## 下一步扩展

- **换真实模型**：在 `player.js` 中用 `GLTFLoader` 替换几何体角色
- **加载 Tiled 地图**：用 `@loaders.gl/tiles` 或手写解析器读取 `.tmx`
- **NPC 对话系统**：在 `npc.js` 中扩展对话树逻辑
- **区块链集成**：在 `main.js` 初始化时连接钱包，读取链上地块数据
- **音效**：用 `THREE.AudioListener` + `THREE.PositionalAudio` 添加空间音频
