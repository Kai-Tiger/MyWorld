import * as THREE from 'three'

/**
 * createUI
 * 创建游戏 HUD：左上角信息面板 + 移动端虚拟方向键。
 * 返回 { update(player) } 供主循环调用。
 */
export function createUI(container) {
  // ── 信息面板 ──────────────────────────────────────
  const hud = document.createElement('div')
  hud.style.cssText = `
    position: absolute;
    top: 12px; left: 12px;
    color: #e8f4e8;
    font-size: 12px;
    font-family: monospace;
    background: rgba(0,0,0,0.5);
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.12);
    line-height: 2;
    pointer-events: none;
    min-width: 140px;
  `
  hud.innerHTML = `
    <div><span style="color:#7ec87e">WASD</span> / 方向键 移动</div>
    <div id="hud-pos">位置: (0, 0)</div>
    <div id="hud-spd">速度: 0.00</div>
  `
  container.appendChild(hud)

  // ── 虚拟方向键（移动端）──────────────────────────
  const dpad = document.createElement('div')
  dpad.style.cssText = `
    position: absolute;
    bottom: 20px; left: 50%;
    transform: translateX(-50%);
    display: grid;
    grid-template-columns: repeat(3, 44px);
    grid-template-rows: repeat(2, 44px);
    gap: 5px;
  `
  dpad.innerHTML = `
    <div></div>
    <button class="dpad-btn" data-action="up"    style="grid-column:2">↑</button>
    <div></div>
    <button class="dpad-btn" data-action="left"  style="grid-column:1">←</button>
    <button class="dpad-btn" data-action="down"  style="grid-column:2">↓</button>
    <button class="dpad-btn" data-action="right" style="grid-column:3">→</button>
  `
  container.appendChild(dpad)

  // 按钮样式
  const style = document.createElement('style')
  style.textContent = `
    .dpad-btn {
      width: 44px; height: 44px;
      background: rgba(255,255,255,0.12);
      border: 1px solid rgba(255,255,255,0.25);
      border-radius: 10px;
      color: white;
      font-size: 18px;
      cursor: pointer;
      user-select: none;
      touch-action: none;
      transition: background 0.1s, border-color 0.1s;
      display: flex; align-items: center; justify-content: center;
    }
    .dpad-btn.active {
      background: rgba(126,200,126,0.4);
      border-color: #7ec87e;
    }
  `
  document.head.appendChild(style)

  // ── 进门提示 / 离开按钮 ───────────────────────────
  const promptStyle = document.createElement('style')
  promptStyle.textContent = `
    #enter-prompt {
      position: absolute;
      background: rgba(255,245,235,0.95);
      border: 2px solid #ffb8c6;
      border-radius: 12px;
      padding: 8px 14px;
      font-size: 14px;
      color: #7a4a6a;
      font-family: sans-serif;
      pointer-events: auto;
      transform: translateX(-50%);
      white-space: nowrap;
      box-shadow: 0 4px 16px rgba(180,80,120,0.18);
      z-index: 100;
    }
    #enter-prompt::after {
      content: '';
      position: absolute;
      bottom: -9px; left: 50%;
      transform: translateX(-50%);
      border: 8px solid transparent;
      border-top-color: #ffb8c6;
      border-bottom: 0;
    }
    #enter-prompt button {
      margin-left: 8px;
      padding: 3px 12px;
      border: none;
      border-radius: 20px;
      background: linear-gradient(135deg, #ffb8c6, #ff8fab);
      color: white;
      font-size: 13px;
      cursor: pointer;
      transition: background 0.15s;
    }
    #enter-prompt button:hover {
      background: linear-gradient(135deg, #ff8fab, #ff6b8a);
    }
    #exit-btn {
      position: absolute;
      bottom: 20px; right: 20px;
      padding: 8px 20px;
      border: 2px solid #ffb8c6;
      border-radius: 20px;
      background: rgba(255,245,235,0.95);
      color: #7a4a6a;
      font-size: 14px;
      font-family: sans-serif;
      cursor: pointer;
      z-index: 100;
      box-shadow: 0 4px 16px rgba(180,80,120,0.18);
      transition: background 0.15s;
    }
    #exit-btn:hover {
      background: rgba(255,184,198,0.95);
      color: white;
    }
    #talk-btn {
      position: absolute;
      background: rgba(255,245,235,0.95);
      border: 2px solid #ffb8c6;
      border-radius: 12px;
      padding: 6px 14px;
      font-size: 13px;
      color: #7a4a6a;
      font-family: sans-serif;
      pointer-events: auto;
      transform: translateX(-50%);
      white-space: nowrap;
      box-shadow: 0 4px 16px rgba(180,80,120,0.18);
      z-index: 100;
      cursor: pointer;
      transition: background 0.15s;
    }
    #talk-btn::after {
      content: '';
      position: absolute;
      bottom: -9px; left: 50%;
      transform: translateX(-50%);
      border: 8px solid transparent;
      border-top-color: #ffb8c6;
      border-bottom: 0;
    }
    #talk-btn:hover {
      background: rgba(255,184,198,0.95);
      color: white;
    }
    #dialogue-panel {
      position: absolute;
      left: 0;
      top: 0;
      transform: translate(-50%, -100%);
      background: rgba(20,12,28,0.92);
      border: 2px solid #ffb8c6;
      border-radius: 14px;
      padding: 12px 14px;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      z-index: 200;
      font-family: sans-serif;
      max-width: min(320px, calc(100vw - 24px));
      box-shadow: 0 8px 24px rgba(0,0,0,0.35);
    }
    #dialogue-panel::after {
      content: '';
      position: absolute;
      left: 50%;
      bottom: -10px;
      transform: translateX(-50%);
      border: 8px solid transparent;
      border-top-color: #ffb8c6;
      border-bottom: 0;
    }
    #dialogue-avatar {
      width: 42px; height: 42px;
      border-radius: 50%;
      border: 2px solid #ffb8c6;
      flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;
    }
    #dialogue-body {
      flex: 1;
    }
    #dialogue-name {
      font-size: 13px;
      font-weight: bold;
      color: #ffb8c6;
      margin-bottom: 4px;
    }
    #dialogue-text {
      font-size: 13px;
      color: #f0e8f4;
      line-height: 1.6;
    }
    #dialogue-end-btn {
      align-self: center;
      padding: 5px 12px;
      border: 2px solid #ffb8c6;
      border-radius: 20px;
      background: transparent;
      color: #ffb8c6;
      font-size: 12px;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.15s, color 0.15s;
    }
    #dialogue-end-btn:hover {
      background: #ffb8c6;
      color: #3a1a2a;
    }
    #pick-btn {
      position: absolute;
      background: rgba(235,255,235,0.95);
      border: 2px solid #6abf69;
      border-radius: 12px;
      padding: 6px 14px;
      font-size: 13px;
      color: #2a5a2a;
      font-family: sans-serif;
      pointer-events: auto;
      transform: translateX(-50%);
      white-space: nowrap;
      box-shadow: 0 4px 16px rgba(60,140,60,0.18);
      z-index: 100;
      cursor: pointer;
      transition: background 0.15s;
    }
    #pick-btn::after {
      content: '';
      position: absolute;
      bottom: -9px; left: 50%;
      transform: translateX(-50%);
      border: 8px solid transparent;
      border-top-color: #6abf69;
      border-bottom: 0;
    }
    #pick-btn:hover {
      background: rgba(106,191,105,0.95);
      color: white;
    }
    #bag-btn {
      position: absolute;
      bottom: 20px; left: 20px;
      width: 48px; height: 48px;
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 12px;
      background: rgba(0,0,0,0.45);
      color: white;
      font-size: 22px;
      cursor: pointer;
      z-index: 100;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.15s;
    }
    #bag-btn:hover {
      background: rgba(60,60,60,0.7);
    }
    #bag-panel {
      position: absolute;
      bottom: 78px; left: 20px;
      min-width: 160px;
      background: rgba(16,10,24,0.90);
      border: 1px solid rgba(255,255,255,0.18);
      border-radius: 12px;
      padding: 12px 16px;
      font-family: sans-serif;
      z-index: 101;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    }
    #bag-panel h4 {
      margin: 0 0 8px;
      font-size: 13px;
      color: rgba(255,255,255,0.6);
      font-weight: normal;
      letter-spacing: 1px;
    }
    .bag-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #f0e8f4;
      padding: 3px 0;
    }
    .bag-item .bag-count {
      margin-left: auto;
      color: #aaa;
      font-size: 13px;
    }
    #bag-empty {
      font-size: 13px;
      color: rgba(255,255,255,0.35);
    }
    #fish-btn {
      position: absolute;
      background: rgba(230,245,255,0.95);
      border: 2px solid #4fc3f7;
      border-radius: 12px;
      padding: 6px 14px;
      font-size: 13px;
      color: #1a5a7a;
      font-family: sans-serif;
      pointer-events: auto;
      transform: translateX(-50%);
      white-space: nowrap;
      box-shadow: 0 4px 16px rgba(30,120,180,0.18);
      z-index: 100;
      cursor: pointer;
      transition: background 0.15s;
    }
    #fish-btn::after {
      content: '';
      position: absolute;
      bottom: -9px; left: 50%;
      transform: translateX(-50%);
      border: 8px solid transparent;
      border-top-color: #4fc3f7;
      border-bottom: 0;
    }
    #fish-btn:hover {
      background: rgba(79,195,247,0.95);
      color: white;
    }
    #fish-result {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(10,18,34,0.93);
      border: 2px solid #4fc3f7;
      border-radius: 16px;
      padding: 32px 44px;
      text-align: center;
      font-family: sans-serif;
      z-index: 300;
      min-width: 200px;
      box-shadow: 0 8px 32px rgba(10,80,140,0.4);
    }
    #fish-result .fish-icon {
      font-size: 48px;
      display: block;
      margin-bottom: 12px;
    }
    #fish-result .fish-msg {
      font-size: 18px;
      font-weight: bold;
      color: #e0f4ff;
      margin-bottom: 6px;
    }
    #fish-result .fish-sub {
      font-size: 13px;
      color: rgba(200,230,255,0.6);
      margin-bottom: 18px;
    }
    #fish-result button {
      padding: 8px 24px;
      border: 2px solid #4fc3f7;
      border-radius: 20px;
      background: transparent;
      color: #4fc3f7;
      font-size: 13px;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }
    #fish-result button:hover {
      background: #4fc3f7;
      color: #0a1222;
    }
  `
  document.head.appendChild(promptStyle)

  let promptEl = null
  let exitBtn = null
  let talkBtn = null
  let pickBtn = null
  let fishBtn = null
  let fishResultEl = null
  let dialoguePanel = null

  // ── 背包按钮（固定，常驻）────────────────────────
  const bagBtn = document.createElement('button')
  bagBtn.id = 'bag-btn'
  bagBtn.textContent = '🎒'
  container.appendChild(bagBtn)

  let bagPanel = null
  let bagItems = []

  bagBtn.addEventListener('click', () => {
    if (bagPanel) {
      bagPanel.remove()
      bagPanel = null
    } else {
      bagPanel = document.createElement('div')
      bagPanel.id = 'bag-panel'
      renderBagPanel()
      container.appendChild(bagPanel)
    }
  })

  function renderBagPanel() {
    if (!bagPanel) return
    if (bagItems.length === 0) {
      bagPanel.innerHTML = `<h4>背包</h4><div id="bag-empty">空空如也</div>`
    } else {
      const rows = bagItems.map(({ name, count }) =>
        `<div class="bag-item"><span>🍎 ${name}</span><span class="bag-count">×${count}</span></div>`
      ).join('')
      bagPanel.innerHTML = `<h4>背包</h4>${rows}`
    }
  }

  // ── 太阳表盘 ──────────────────────────────────────
  const sunCanvas = document.createElement('canvas')
  sunCanvas.width  = 72
  sunCanvas.height = 72
  sunCanvas.style.cssText = `
    position: absolute;
    top: 12px; right: 12px;
    pointer-events: none;
  `
  container.appendChild(sunCanvas)
  const sc = sunCanvas.getContext('2d')

  function drawSunDial(phase) {
    const W = 72, cx = 36, cy = 36
    const outerR = 33, trackR = 24

    sc.clearRect(0, 0, W, W)

    // 背景圆
    sc.beginPath()
    sc.arc(cx, cy, outerR, 0, Math.PI * 2)
    sc.fillStyle = 'rgba(8,12,28,0.75)'
    sc.fill()
    sc.strokeStyle = 'rgba(255,255,255,0.16)'
    sc.lineWidth = 1
    sc.stroke()

    // 白天弧（经过顶部的大弧，顺时针方向：黄昏 5π/6 → 经过 3π/2 顶部 → 黎明 π/6）
    sc.beginPath()
    sc.arc(cx, cy, trackR, 5 * Math.PI / 6, Math.PI / 6, true)
    sc.strokeStyle = 'rgba(255,210,80,0.30)'
    sc.lineWidth = 7
    sc.stroke()

    // 夜晚弧（经过底部的短弧）
    sc.beginPath()
    sc.arc(cx, cy, trackR, 5 * Math.PI / 6, Math.PI / 6, false)
    sc.strokeStyle = 'rgba(60,80,160,0.30)'
    sc.lineWidth = 7
    sc.stroke()

    // 轨道环（细线覆盖在色弧上）
    sc.beginPath()
    sc.arc(cx, cy, trackR, 0, Math.PI * 2)
    sc.strokeStyle = 'rgba(255,255,255,0.18)'
    sc.lineWidth = 1
    sc.stroke()

    // 四个刻度点（正午/午夜/两侧）
    ;[0, Math.PI / 2, Math.PI, 3 * Math.PI / 2].forEach(p => {
      const tx = cx - Math.cos(p) * trackR
      const ty = cy - Math.sin(p) * trackR
      sc.beginPath()
      sc.arc(tx, ty, 1.5, 0, Math.PI * 2)
      sc.fillStyle = 'rgba(255,255,255,0.35)'
      sc.fill()
    })

    // 太阳/月亮位置（x 取负 cos → 顺时针）
    const sx = cx - Math.cos(phase) * trackR
    const sy = cy - Math.sin(phase) * trackR
    const worldY = Math.sin(phase) * 30 + 15
    const isDay  = worldY > 0

    // 从圆心到太阳的指针
    sc.beginPath()
    sc.moveTo(cx, cy)
    sc.lineTo(sx, sy)
    sc.strokeStyle = isDay ? 'rgba(255,220,60,0.45)' : 'rgba(180,200,255,0.30)'
    sc.lineWidth = 1
    sc.stroke()

    if (isDay) {
      // 光晕
      const grd = sc.createRadialGradient(sx, sy, 0, sx, sy, 10)
      grd.addColorStop(0, 'rgba(255,230,60,0.75)')
      grd.addColorStop(1, 'rgba(255,160,0,0)')
      sc.beginPath()
      sc.arc(sx, sy, 10, 0, Math.PI * 2)
      sc.fillStyle = grd
      sc.fill()
      // 太阳核心
      sc.beginPath()
      sc.arc(sx, sy, 4.5, 0, Math.PI * 2)
      sc.fillStyle = '#ffe040'
      sc.fill()
      sc.strokeStyle = 'rgba(255,255,200,0.7)'
      sc.lineWidth = 1
      sc.stroke()
    } else {
      // 月牙（遮挡法）
      sc.beginPath()
      sc.arc(sx, sy, 4, 0, Math.PI * 2)
      sc.fillStyle = '#c8d8f0'
      sc.fill()
      sc.beginPath()
      sc.arc(sx + 1.8, sy - 0.5, 3.2, 0, Math.PI * 2)
      sc.fillStyle = 'rgba(8,12,28,0.75)'
      sc.fill()
    }

    // 圆心点
    sc.beginPath()
    sc.arc(cx, cy, 2, 0, Math.PI * 2)
    sc.fillStyle = 'rgba(255,255,255,0.4)'
    sc.fill()
  }

  // ── 更新函数 ──────────────────────────────────────
  const posEl = hud.querySelector('#hud-pos')
  const spdEl = hud.querySelector('#hud-spd')

  return {
    update(player, sunPhase) {
      const pos = player.getPosition()
      posEl.textContent = `位置: (${pos.x.toFixed(1)}, ${pos.z.toFixed(1)})`
      spdEl.textContent = `速度: ${player.getSpeed().toFixed(2)}`
      if (sunPhase !== undefined) drawSunDial(sunPhase)
    },

    showEnterPrompt(worldPos, camera, renderer, onEnter) {
      const v = worldPos.clone().project(camera)
      const w = renderer.domElement.clientWidth
      const h = renderer.domElement.clientHeight
      const sx = (v.x * 0.5 + 0.5) * w
      const sy = (-v.y * 0.5 + 0.5) * h

      if (!promptEl) {
        promptEl = document.createElement('div')
        promptEl.id = 'enter-prompt'
        promptEl.innerHTML = `进入房屋 <button>进门 🚪</button>`
        container.appendChild(promptEl)
        promptEl.querySelector('button').addEventListener('click', onEnter)
      }
      promptEl.style.left = `${sx + 60}px`
      promptEl.style.top  = `${sy - 80}px`
    },

    hideEnterPrompt() {
      if (promptEl) {
        promptEl.remove()
        promptEl = null
      }
    },

    showExitButton(onExit) {
      if (exitBtn) return
      exitBtn = document.createElement('button')
      exitBtn.id = 'exit-btn'
      exitBtn.textContent = '离开 🚪'
      container.appendChild(exitBtn)
      exitBtn.addEventListener('click', onExit)
      hud.style.display = 'none'
      dpad.style.display = 'none'
    },

    hideExitButton() {
      if (exitBtn) {
        exitBtn.remove()
        exitBtn = null
      }
      hud.style.display = ''
      dpad.style.display = ''
    },

    showTalkButton(worldPos, camera, renderer, onTalk) {
      const v = new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z).project(camera)
      const w = renderer.domElement.clientWidth
      const h = renderer.domElement.clientHeight
      const sx = (v.x * 0.5 + 0.5) * w
      const sy = (-v.y * 0.5 + 0.5) * h

      if (!talkBtn) {
        talkBtn = document.createElement('button')
        talkBtn.id = 'talk-btn'
        talkBtn.textContent = '对话 💬'
        container.appendChild(talkBtn)
        talkBtn.addEventListener('click', onTalk)
      }
      talkBtn.style.left = `${sx}px`
      talkBtn.style.top  = `${sy - 54}px`
    },

    hideTalkButton() {
      if (talkBtn) {
        talkBtn.remove()
        talkBtn = null
      }
    },

    showDialoguePanel(npcName, npcColor, onEnd) {
      if (dialoguePanel) return
      const lines = [
        '今天天气真不错呢！',
        '你好呀，旅行者～',
        '我最近在研究星座，你是什么座的？',
        '听说村子的东边新开了一家点心铺～',
        '有时间的话，来我家坐坐吧！',
      ]
      const line = lines[Math.floor(Math.random() * lines.length)]
      const hex = '#' + npcColor.toString(16).padStart(6, '0')

      dialoguePanel = document.createElement('div')
      dialoguePanel.id = 'dialogue-panel'
      dialoguePanel.innerHTML = `
        <div id="dialogue-avatar" style="background:${hex}">🐾</div>
        <div id="dialogue-body">
          <div id="dialogue-name">${npcName}</div>
          <div id="dialogue-text">${line}</div>
        </div>
        <button id="dialogue-end-btn">结束对话</button>
      `
      container.appendChild(dialoguePanel)
      dialoguePanel.querySelector('#dialogue-end-btn').addEventListener('click', onEnd)
      hud.style.display = 'none'
      dpad.style.display = 'none'
    },

    updateDialoguePanelPosition(worldPos, camera, renderer) {
      if (!dialoguePanel || !worldPos) return
      const v = new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z).project(camera)
      if (v.z < -1 || v.z > 1) {
        dialoguePanel.style.display = 'none'
        return
      }
      dialoguePanel.style.display = ''

      const w = renderer.domElement.clientWidth
      const h = renderer.domElement.clientHeight
      const sx = (v.x * 0.5 + 0.5) * w
      const sy = (-v.y * 0.5 + 0.5) * h

      const rect = dialoguePanel.getBoundingClientRect()
      const margin = 12
      const halfW = rect.width * 0.5
      const bubbleH = rect.height
      const clampedX = Math.min(Math.max(sx, margin + halfW), w - margin - halfW)
      const clampedY = Math.min(Math.max(sy - 14, margin + bubbleH), h - margin)

      dialoguePanel.style.left = `${clampedX}px`
      dialoguePanel.style.top  = `${clampedY}px`
    },

    hideDialoguePanel() {
      if (dialoguePanel) {
        dialoguePanel.remove()
        dialoguePanel = null
      }
      hud.style.display = ''
      dpad.style.display = ''
    },

    showPickButton(worldPos, camera, renderer, onPick) {
      const v = new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z).project(camera)
      const w = renderer.domElement.clientWidth
      const h = renderer.domElement.clientHeight
      const sx = (v.x * 0.5 + 0.5) * w
      const sy = (-v.y * 0.5 + 0.5) * h

      if (!pickBtn) {
        pickBtn = document.createElement('button')
        pickBtn.id = 'pick-btn'
        pickBtn.textContent = '摘苹果 🍎'
        container.appendChild(pickBtn)
        pickBtn.addEventListener('click', onPick)
      }
      pickBtn.style.left = `${sx}px`
      pickBtn.style.top  = `${sy - 54}px`
    },

    hidePickButton() {
      if (pickBtn) {
        pickBtn.remove()
        pickBtn = null
      }
    },

    updateBag(items) {
      bagItems = items
      renderBagPanel()
    },

    showFishButton(worldPos, camera, renderer, onFish) {
      const v = new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z).project(camera)
      const w = renderer.domElement.clientWidth
      const h = renderer.domElement.clientHeight
      const sx = (v.x * 0.5 + 0.5) * w
      const sy = (-v.y * 0.5 + 0.5) * h

      if (!fishBtn) {
        fishBtn = document.createElement('button')
        fishBtn.id = 'fish-btn'
        fishBtn.textContent = '钓鱼 🎣'
        container.appendChild(fishBtn)
        fishBtn.addEventListener('click', onFish)
      }
      fishBtn.style.left = `${sx}px`
      fishBtn.style.top  = `${sy - 54}px`
    },

    hideFishButton() {
      if (fishBtn) {
        fishBtn.remove()
        fishBtn = null
      }
    },

    showFishResult(caught, onClose) {
      if (fishResultEl) return
      fishResultEl = document.createElement('div')
      fishResultEl.id = 'fish-result'
      if (caught) {
        fishResultEl.innerHTML = `
          <span class="fish-icon">🐟</span>
          <div class="fish-msg">钓到了！</div>
          <div class="fish-sub">鱼 +1 已存入背包</div>
          <button>收好了</button>
        `
      } else {
        fishResultEl.innerHTML = `
          <span class="fish-icon">💨</span>
          <div class="fish-msg">跑掉了...</div>
          <div class="fish-sub">下次再来试试吧</div>
          <button>好吧</button>
        `
      }
      container.appendChild(fishResultEl)
      fishResultEl.querySelector('button').addEventListener('click', onClose)
      hud.style.display = 'none'
      dpad.style.display = 'none'
    },

    hideFishResult() {
      if (fishResultEl) {
        fishResultEl.remove()
        fishResultEl = null
      }
      hud.style.display = ''
      dpad.style.display = ''
    },
  }
}
