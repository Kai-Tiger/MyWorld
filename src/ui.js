import * as THREE from 'three'
import elementFlaskImage from '../assets/img/element.png?url'

/**
 * createUI
 * 创建游戏 HUD：左上角信息面板。
 * 返回 { update(player) } 供主循环调用。
 */
export function createUI(container, handlers = {}) {
  const sceneFade = document.createElement('div')
  sceneFade.style.cssText = `
    position: absolute;
    inset: 0;
    z-index: 1000;
    background: #050608;
    opacity: 0;
    pointer-events: none;
  `
  container.appendChild(sceneFade)

  const deathMessage = document.createElement('div')
  deathMessage.id = 'death-message'
  deathMessage.textContent = 'YOU DIED'
  deathMessage.style.display = 'none'
  container.appendChild(deathMessage)

  const areaTitle = document.createElement('div')
  areaTitle.id = 'area-title'
  areaTitle.style.display = 'none'
  container.appendChild(areaTitle)

  const vitals = document.createElement('div')
  vitals.id = 'souls-vitals'
  vitals.innerHTML = `
    <div id="souls-vitals-emblem"></div>
    <div id="souls-vitals-bars">
      <div id="souls-hp-wrap" aria-label="玩家生命值">
        <div id="souls-hp-back"></div>
        <div id="souls-hp-fill"></div>
        <div id="souls-hp-shine"></div>
      </div>
      <div id="souls-mp-wrap" aria-label="玩家法力值">
        <div id="souls-mp-back"></div>
        <div id="souls-mp-fill"></div>
        <div id="souls-mp-shine"></div>
      </div>
      <div id="souls-stamina-wrap" aria-label="玩家精力值">
        <div id="souls-stamina-back"></div>
        <div id="souls-stamina-fill"></div>
        <div id="souls-stamina-shine"></div>
      </div>
    </div>
  `
  container.appendChild(vitals)

  // ── 信息面板 ──────────────────────────────────────
  const hud = document.createElement('div')
  hud.style.cssText = `
    position: absolute;
    top: 82px; left: 12px;
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
    <div><span style="color:#8bd3ff">Q</span> 锁定目标</div>
    <div id="hud-pos">位置: (0, 0)</div>
    <div id="hud-spd">速度: 0.00</div>
    <div id="hud-combat">ATK: 20</div>
    <div id="hud-lock">LOCK: OFF</div>
  `
  container.appendChild(hud)

  // 按钮样式
  const style = document.createElement('style')
  style.textContent = `
    #souls-vitals {
      position: absolute;
      top: 14px;
      left: 16px;
      z-index: 45;
      display: flex;
      align-items: center;
      gap: 10px;
      pointer-events: none;
      filter: drop-shadow(0 3px 8px rgba(0,0,0,0.82));
    }
    #souls-vitals-emblem {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 2px solid rgba(168,139,83,0.92);
      background:
        radial-gradient(circle at 42% 38%, rgba(245,211,123,0.72), rgba(92,58,26,0.38) 28%, rgba(12,10,8,0.96) 66%),
        linear-gradient(145deg, rgba(42,30,18,0.95), rgba(8,7,6,0.98));
      box-shadow:
        inset 0 0 0 2px rgba(0,0,0,0.72),
        inset 0 0 14px rgba(220,152,55,0.22),
        0 0 0 1px rgba(0,0,0,0.88);
    }
    #souls-vitals-bars {
      display: flex;
      flex-direction: column;
      gap: 4px;
      width: min(340px, calc(100vw - 96px));
    }
    #souls-hp-wrap {
      position: relative;
      width: 100%;
      height: 18px;
      border: 1px solid rgba(181,153,96,0.82);
      border-radius: 2px;
      overflow: hidden;
      background:
        linear-gradient(180deg, rgba(30,22,17,0.98), rgba(7,6,5,0.98));
      box-shadow:
        inset 0 0 0 1px rgba(0,0,0,0.78),
        inset 0 0 10px rgba(0,0,0,0.94);
    }
    #souls-mp-wrap {
      position: relative;
      width: 72%;
      height: 8px;
      border: 1px solid rgba(126,154,205,0.78);
      border-radius: 2px;
      overflow: hidden;
      background:
        linear-gradient(180deg, rgba(18,24,36,0.98), rgba(5,7,12,0.98));
      box-shadow:
        inset 0 0 0 1px rgba(0,0,0,0.78),
        inset 0 0 8px rgba(0,0,0,0.88);
    }
    #souls-stamina-wrap {
      position: relative;
      width: 82%;
      height: 8px;
      border: 1px solid rgba(120,176,104,0.78);
      border-radius: 2px;
      overflow: hidden;
      background:
        linear-gradient(180deg, rgba(19,32,20,0.98), rgba(6,11,7,0.98));
      box-shadow:
        inset 0 0 0 1px rgba(0,0,0,0.78),
        inset 0 0 8px rgba(0,0,0,0.88);
    }
    #souls-hp-back,
    #souls-hp-fill,
    #souls-hp-shine,
    #souls-mp-back,
    #souls-mp-fill,
    #souls-mp-shine,
    #souls-stamina-back,
    #souls-stamina-fill,
    #souls-stamina-shine {
      position: absolute;
      inset: 0;
      transform-origin: left center;
    }
    #souls-hp-back {
      background: linear-gradient(90deg, #5b1912, #3b0d0a);
      transform: scaleX(1);
      opacity: 0.9;
    }
    #souls-hp-fill {
      background:
        linear-gradient(180deg, rgba(255,173,135,0.35), rgba(255,255,255,0) 42%),
        linear-gradient(90deg, #a71510, #d73825 52%, #8d120d);
      transform: scaleX(1);
      transition: transform 0.16s ease-out;
      box-shadow:
        inset 0 1px 0 rgba(255,230,190,0.38),
        inset 0 -4px 8px rgba(52,0,0,0.42);
    }
    #souls-mp-back {
      background: linear-gradient(90deg, #122642, #091325);
      transform: scaleX(1);
      opacity: 0.92;
    }
    #souls-mp-fill {
      background:
        linear-gradient(180deg, rgba(199,227,255,0.38), rgba(255,255,255,0) 48%),
        linear-gradient(90deg, #1d5ca7, #4a9cff 54%, #1a4b90);
      transform: scaleX(1);
      transition: transform 0.16s ease-out;
      box-shadow:
        inset 0 1px 0 rgba(225,245,255,0.42),
        inset 0 -3px 6px rgba(0,12,40,0.5);
    }
    #souls-stamina-back {
      background: linear-gradient(90deg, #183719, #0b1b0c);
      transform: scaleX(1);
      opacity: 0.92;
    }
    #souls-stamina-fill {
      background:
        linear-gradient(180deg, rgba(214,255,188,0.34), rgba(255,255,255,0) 48%),
        linear-gradient(90deg, #3d8b33, #78c45f 54%, #2d7029);
      transform: scaleX(1);
      transition: transform 0.16s ease-out;
      box-shadow:
        inset 0 1px 0 rgba(230,255,205,0.4),
        inset 0 -3px 6px rgba(0,34,8,0.5);
    }
    #souls-hp-shine {
      height: 1px;
      top: 2px;
      bottom: auto;
      background: linear-gradient(90deg, rgba(255,238,198,0), rgba(255,238,198,0.55), rgba(255,238,198,0));
      opacity: 0.62;
    }
    #souls-mp-shine {
      height: 1px;
      top: 1px;
      bottom: auto;
      background: linear-gradient(90deg, rgba(190,225,255,0), rgba(190,225,255,0.58), rgba(190,225,255,0));
      opacity: 0.58;
    }
    #souls-stamina-shine {
      height: 1px;
      top: 1px;
      bottom: auto;
      background: linear-gradient(90deg, rgba(210,255,185,0), rgba(210,255,185,0.58), rgba(210,255,185,0));
      opacity: 0.58;
    }
    #death-message {
      position: absolute;
      inset: 0;
      z-index: 1001;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      color: #8e1410;
      font-family: Georgia, 'Times New Roman', serif;
      font-size: clamp(46px, 8vw, 104px);
      font-weight: 400;
      letter-spacing: 0.08em;
      text-shadow:
        0 2px 0 rgba(0,0,0,0.95),
        0 0 18px rgba(80,0,0,0.72);
    }
    #area-title {
      position: absolute;
      inset: 0;
      z-index: 900;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      color: rgba(226,221,205,0.96);
      font-family: Georgia, 'Times New Roman', serif;
      font-size: clamp(34px, 5.2vw, 72px);
      font-weight: 400;
      letter-spacing: 0.16em;
      text-indent: 0.16em;
      text-shadow:
        0 2px 3px rgba(0,0,0,0.95),
        0 0 20px rgba(0,0,0,0.72),
        0 0 34px rgba(190,175,135,0.22);
      opacity: 0;
    }
    #area-title.area-title-visible {
      display: flex;
      animation: area-title-fade 4s ease-in-out forwards;
    }
    #pickup-toast {
      position: absolute;
      left: 50%;
      bottom: 22%;
      transform: translateX(-50%);
      z-index: 260;
      min-width: 180px;
      max-width: min(420px, calc(100vw - 48px));
      box-sizing: border-box;
      padding: 12px 24px;
      border: 1px solid rgba(216,182,106,0.72);
      border-radius: 4px;
      background:
        linear-gradient(180deg, rgba(18,14,10,0.94), rgba(8,7,6,0.92)),
        radial-gradient(circle at 50% 0%, rgba(216,124,38,0.22), transparent 58%);
      color: #fff0bd;
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 17px;
      letter-spacing: 0.08em;
      text-align: center;
      text-shadow: 0 2px 4px rgba(0,0,0,0.95);
      pointer-events: none;
      box-shadow:
        inset 0 0 0 1px rgba(255,236,180,0.07),
        0 16px 34px rgba(0,0,0,0.62);
    }
    @keyframes area-title-fade {
      0% { opacity: 0; transform: translateY(10px); }
      20% { opacity: 0.8; transform: translateY(0); }
      70% { opacity: 0.8; transform: translateY(0); }
      100% { opacity: 0; transform: translateY(-6px); }
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
    #object-name-label {
      position: absolute;
      min-width: 96px;
      padding: 6px 14px;
      border: 1px solid rgba(176, 145, 82, 0.74);
      border-radius: 2px;
      background:
        linear-gradient(180deg, rgba(8, 7, 6, 0.88), rgba(26, 21, 14, 0.8)),
        radial-gradient(circle at 50% 0%, rgba(176,145,82,0.18), transparent 62%);
      color: #d8c89b;
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 12px;
      letter-spacing: 0.08em;
      text-align: center;
      text-shadow: 0 1px 2px rgba(0,0,0,0.95);
      white-space: nowrap;
      pointer-events: none;
      transform: translateX(-50%);
      z-index: 98;
      box-shadow:
        inset 0 0 0 1px rgba(255,230,160,0.07),
        0 8px 20px rgba(0,0,0,0.54);
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
    #castle-action-btn {
      position: absolute;
      background: rgba(235,238,244,0.95);
      border: 2px solid #9aa8bd;
      border-radius: 12px;
      padding: 6px 14px;
      font-size: 13px;
      color: #28313d;
      font-family: sans-serif;
      pointer-events: auto;
      transform: translateX(-50%);
      cursor: pointer;
      z-index: 100;
      box-shadow: 0 4px 16px rgba(0,0,0,0.25);
    }
    #castle-action-btn:hover {
      background: rgba(180,194,215,0.95);
      color: white;
    }
    #bonfire-menu {
      position: absolute;
      transform: translateX(-50%);
      width: min(260px, calc(100vw - 24px));
      padding: 12px;
      box-sizing: border-box;
      z-index: 190;
      pointer-events: auto;
      background:
        linear-gradient(180deg, rgba(8,7,6,0.96), rgba(24,19,12,0.94)),
        radial-gradient(circle at 50% 0%, rgba(205,105,35,0.22), transparent 58%);
      border: 1px solid rgba(176,145,82,0.82);
      border-radius: 2px;
      box-shadow:
        inset 0 0 0 1px rgba(255,230,160,0.08),
        0 12px 32px rgba(0,0,0,0.68);
      font-family: Georgia, 'Times New Roman', serif;
    }
    #bonfire-menu-title {
      color: #d8c89b;
      font-size: 13px;
      letter-spacing: 0.12em;
      margin: 0 0 10px;
      text-align: center;
      text-shadow: 0 1px 2px rgba(0,0,0,0.95);
    }
    .bonfire-menu-option {
      width: 100%;
      height: 34px;
      margin: 5px 0;
      border: 1px solid rgba(176,145,82,0.74);
      border-radius: 1px;
      background: linear-gradient(90deg, rgba(7,7,6,0.96), rgba(34,28,18,0.90), rgba(7,7,6,0.96));
      color: #d8c89b;
      font-family: inherit;
      font-size: 13px;
      letter-spacing: 0.08em;
      cursor: pointer;
      text-shadow: 0 1px 2px rgba(0,0,0,0.95);
      box-shadow: inset 0 0 0 1px rgba(255,230,160,0.06);
    }
    .bonfire-menu-option:hover {
      border-color: #d7b46a;
      color: #fff0bd;
      filter: brightness(1.14);
    }
    .bonfire-menu-option:disabled {
      opacity: 0.48;
      cursor: default;
      filter: none;
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
      box-sizing: border-box;
      width: min(440px, calc(100vw - 24px));
      height: 172px;
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
      min-width: 0;
      height: 100%;
      display: flex;
      flex-direction: column;
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
      flex: 1;
      overflow-y: auto;
      padding-right: 4px;
    }
    #dialogue-end-btn {
      align-self: center;
      flex: 0 0 auto;
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
    #equipment-bar {
      position: absolute;
      bottom: 28px; left: 28px;
      width: 214px; height: 214px;
      z-index: 100;
      pointer-events: auto;
      --ui-gold: #d8b66a;
      --ui-gold-bright: #ffe3a0;
      --ui-iron: #171410;
      --ui-shadow: rgba(0,0,0,0.72);
      font-family: Cinzel, Georgia, 'Times New Roman', serif;
      filter: drop-shadow(0 18px 24px rgba(0,0,0,0.52));
    }
    #equipment-bar::before {
      content: '';
      position: absolute;
      inset: 24px;
      border-radius: 50%;
      background:
        radial-gradient(circle at 50% 50%, rgba(255,214,124,0.20), transparent 18%),
        conic-gradient(from 45deg, transparent 0 10%, rgba(216,182,106,0.18) 10% 13%, transparent 13% 25%),
        radial-gradient(circle at 50% 50%, rgba(8,7,6,0.56), rgba(8,7,6,0.06) 62%, transparent 64%);
      border: 1px solid rgba(216,182,106,0.28);
      box-shadow:
        inset 0 0 24px rgba(0,0,0,0.78),
        0 0 34px rgba(216,124,38,0.08);
      pointer-events: none;
      animation: equipment-ember-breathe 4.8s ease-in-out infinite;
    }
    #equipment-bar::after {
      content: '';
      position: absolute;
      left: 50%; top: 50%;
      width: 44px; height: 44px;
      transform: translate(-50%, -50%) rotate(45deg);
      border: 1px solid rgba(216,182,106,0.46);
      background:
        linear-gradient(135deg, rgba(255,227,160,0.10), rgba(0,0,0,0.20)),
        radial-gradient(circle at 50% 50%, rgba(216,182,106,0.16), rgba(11,9,7,0.82) 62%);
      box-shadow:
        inset 0 0 0 1px rgba(255,238,190,0.07),
        inset 0 -12px 18px rgba(0,0,0,0.62),
        0 0 18px rgba(216,124,38,0.16);
      pointer-events: none;
    }
    @keyframes equipment-ember-breathe {
      0%, 100% { opacity: 0.68; transform: scale(0.985); }
      50% { opacity: 1; transform: scale(1.015); }
    }
    .equipment-slot {
      position: absolute;
      width: 76px; height: 76px;
      border: 1px solid rgba(216,182,106,0.58);
      border-radius: 6px;
      background:
        linear-gradient(145deg, rgba(255,236,180,0.10), rgba(255,236,180,0.02) 24%, rgba(0,0,0,0.44) 80%),
        radial-gradient(circle at 42% 30%, rgba(216,124,38,0.22), transparent 46%),
        linear-gradient(180deg, rgba(24,21,17,0.94), rgba(6,6,5,0.92));
      color: var(--ui-gold);
      box-shadow:
        inset 0 0 0 1px rgba(255,236,180,0.07),
        inset 0 -22px 28px rgba(0,0,0,0.58),
        0 10px 24px var(--ui-shadow);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 5px;
      cursor: default;
      user-select: none;
      touch-action: manipulation;
      overflow: hidden;
      transform: rotate(45deg);
      transition:
        border-color 0.18s ease,
        color 0.18s ease,
        filter 0.18s ease,
        box-shadow 0.18s ease,
        transform 0.18s ease;
    }
    .equipment-slot::before {
      content: '';
      position: absolute;
      inset: 7px;
      border: 1px solid rgba(216,182,106,0.22);
      border-radius: 3px;
      background:
        linear-gradient(135deg, rgba(255,255,255,0.08), transparent 34%),
        radial-gradient(circle at 50% 96%, rgba(216,124,38,0.18), transparent 55%);
      pointer-events: none;
    }
    .equipment-slot::after {
      content: '';
      position: absolute;
      left: -55%; top: -110%;
      width: 48%; height: 260%;
      background: linear-gradient(90deg, transparent, rgba(255,236,180,0.18), transparent);
      transform: rotate(18deg);
      opacity: 0;
      transition: left 0.36s ease, opacity 0.18s ease;
    }
    .equipment-slot[data-clickable="true"] {
      cursor: pointer;
    }
    .equipment-slot[data-clickable="true"]:hover {
      border-color: var(--ui-gold-bright);
      color: var(--ui-gold-bright);
      filter: brightness(1.16) saturate(1.12);
      box-shadow:
        inset 0 0 0 1px rgba(255,236,180,0.16),
        inset 0 -22px 28px rgba(0,0,0,0.52),
        0 12px 28px rgba(0,0,0,0.68),
        0 0 22px rgba(216,124,38,0.22);
      transform: rotate(45deg) scale(1.055);
    }
    .equipment-slot[data-clickable="true"]:hover::after {
      left: 110%;
      opacity: 1;
    }
    .equipment-slot > span:not(.equipment-slot-count) {
      position: relative;
      z-index: 1;
      transform: rotate(-45deg);
    }
    .equipment-slot-icon {
      width: 58px;
      height: 58px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-shadow:
        0 0 12px rgba(216,124,38,0.34),
        0 2px 3px rgba(0,0,0,0.9);
    }
    .equipment-slot-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
      filter:
        drop-shadow(0 4px 5px rgba(0,0,0,0.74))
        drop-shadow(0 0 9px rgba(216,124,38,0.16));
      pointer-events: none;
    }
    .equipment-slot-name {
      max-width: 68px;
      overflow: hidden;
      color: currentColor;
      font-size: 11px;
      line-height: 1.1;
      text-align: center;
      text-overflow: ellipsis;
      white-space: nowrap;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      opacity: 0.82;
      display: none;
    }
    .equipment-slot-key {
      position: absolute;
      top: 8px; right: 9px;
      color: rgba(255,227,160,0.62);
      font-size: 10px;
      line-height: 1;
      transform: rotate(-45deg);
      text-shadow: 0 1px 2px rgba(0,0,0,0.9);
    }
    .equipment-slot-count {
      position: absolute;
      right: 5px; bottom: 7px;
      min-width: 24px;
      padding: 2px 5px 1px;
      border: 1px solid rgba(255,227,160,0.48);
      border-radius: 999px;
      background: rgba(8,7,6,0.84);
      color: #ffe3a0;
      font-size: 11px;
      line-height: 1;
      text-align: center;
      transform: rotate(-45deg);
      text-shadow: 0 1px 2px rgba(0,0,0,0.95);
      box-shadow:
        inset 0 0 0 1px rgba(0,0,0,0.46),
        0 2px 6px rgba(0,0,0,0.72);
      pointer-events: none;
    }
    .equipment-slot-top {
      top: 0; left: 69px;
    }
    .equipment-slot-left {
      top: 69px; left: 0;
    }
    .equipment-slot-right {
      top: 69px; right: 0;
    }
    .equipment-slot-bottom {
      bottom: 0; left: 69px;
    }
    #bag-panel {
      position: absolute;
      inset: 0;
      display: block;
      padding: 30px;
      box-sizing: border-box;
      background:
        radial-gradient(circle at 50% 42%, rgba(55,52,47,0.38), transparent 48%),
        linear-gradient(180deg, rgba(5,6,7,0.78), rgba(2,2,3,0.90));
      backdrop-filter: blur(3px);
      z-index: 180;
      pointer-events: auto;
      font-family: Georgia, 'Times New Roman', serif;
    }
    .bag-modal {
      position: relative;
      width: 100%;
      height: 100%;
      min-height: 520px;
      background:
        linear-gradient(90deg, rgba(8,8,9,0.97), rgba(24,23,25,0.92) 35%, rgba(16,15,17,0.96)),
        radial-gradient(circle at 50% 24%, rgba(180,168,135,0.11), transparent 44%),
        repeating-linear-gradient(0deg, rgba(255,255,255,0.024) 0 1px, transparent 1px 5px);
      border: 1px solid rgba(150,129,83,0.58);
      border-radius: 2px;
      padding: 0;
      box-sizing: border-box;
      box-shadow:
        inset 0 0 0 2px rgba(255,236,180,0.035),
        inset 0 0 74px rgba(0,0,0,0.74),
        0 24px 74px rgba(0,0,0,0.82);
      color: rgba(224,216,194,0.88);
      overflow: hidden;
    }
    .bag-modal::before {
      content: '';
      position: absolute;
      inset: 0;
      pointer-events: none;
      background:
        linear-gradient(90deg, rgba(255,255,255,0.05), transparent 14%, transparent 86%, rgba(255,255,255,0.04)),
        radial-gradient(circle at 52% 50%, transparent 0 34%, rgba(0,0,0,0.22) 68%),
        repeating-linear-gradient(90deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 13px);
      mix-blend-mode: screen;
      opacity: 0.42;
    }
    .bag-header {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      height: 48px;
      padding: 0 18px 0 26px;
      border-bottom: 1px solid rgba(143,125,82,0.42);
      background: linear-gradient(180deg, rgba(29,28,30,0.86), rgba(9,9,10,0.36));
      box-sizing: border-box;
    }
    .bag-title {
      margin: 0;
      font-size: 19px;
      color: rgba(232,222,190,0.92);
      font-weight: normal;
      letter-spacing: 0.06em;
      text-shadow: 0 2px 3px rgba(0,0,0,0.95);
    }
    .bag-close {
      width: 32px;
      height: 32px;
      border: 1px solid rgba(153,132,86,0.62);
      border-radius: 2px;
      background: rgba(8,7,6,0.54);
      color: rgba(232,222,190,0.92);
      font-size: 21px;
      line-height: 1;
      cursor: pointer;
    }
    .bag-body {
      position: relative;
      z-index: 1;
      height: calc(100% - 48px);
      display: grid;
      grid-template-columns: minmax(360px, 34%) minmax(340px, 1fr) minmax(290px, 28%);
      box-sizing: border-box;
    }
    .bag-column {
      min-width: 0;
      min-height: 0;
      padding: 18px;
      box-sizing: border-box;
      border-right: 1px solid rgba(143,125,82,0.42);
      background: linear-gradient(180deg, rgba(11,11,13,0.18), rgba(0,0,0,0.18));
    }
    .bag-column:last-child {
      border-right: 0;
    }
    .bag-column-title {
      margin: 0 0 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(139,120,78,0.46);
      color: rgba(232,222,190,0.9);
      font-size: 18px;
      font-weight: normal;
      line-height: 1.2;
      text-shadow: 0 2px 3px rgba(0,0,0,0.86);
    }
    .bag-tabs {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0;
      height: 58px;
      margin-bottom: 12px;
      border-bottom: 1px solid rgba(139,120,78,0.36);
    }
    .bag-tab {
      min-width: 74px;
      height: 44px;
      margin-right: 8px;
      border: 1px solid rgba(80,75,66,0.78);
      border-radius: 2px;
      background:
        radial-gradient(circle at 50% 16%, rgba(187,176,147,0.14), transparent 44%),
        linear-gradient(180deg, rgba(52,52,58,0.92), rgba(18,18,21,0.92));
      color: rgba(205,198,179,0.78);
      font-family: inherit;
      font-size: 13px;
      cursor: pointer;
      box-shadow: inset 0 -10px 18px rgba(0,0,0,0.32);
    }
    .bag-tab.is-active {
      border-color: rgba(210,185,115,0.82);
      color: rgba(255,238,184,0.96);
      background:
        radial-gradient(circle at 50% 20%, rgba(255,231,160,0.22), transparent 48%),
        linear-gradient(180deg, rgba(83,79,73,0.96), rgba(31,30,30,0.96));
      box-shadow:
        inset 0 0 18px rgba(214,158,59,0.20),
        0 2px 10px rgba(0,0,0,0.46);
    }
    .bag-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 10px;
      max-height: calc(100% - 108px);
      overflow: hidden;
    }
    .bag-cell {
      position: relative;
      aspect-ratio: 1;
      min-width: 0;
      border: 1px solid rgba(45,43,40,0.92);
      border-radius: 2px;
      background:
        linear-gradient(180deg, rgba(17,18,19,0.88), rgba(5,5,6,0.82)),
        radial-gradient(circle at 50% 44%, rgba(80,78,72,0.30), transparent 62%);
      box-shadow:
        inset 0 2px 8px rgba(0,0,0,0.76),
        inset 0 0 0 1px rgba(255,255,255,0.025);
      overflow: hidden;
      font-family: inherit;
      padding: 0;
      cursor: default;
    }
    .bag-cell.is-filled {
      border-color: rgba(94,84,62,0.86);
      cursor: pointer;
    }
    .bag-cell.is-selected {
      border-color: rgba(246,190,79,0.88);
      background:
        radial-gradient(circle at 50% 42%, rgba(231,124,23,0.82), rgba(101,50,12,0.78) 54%, rgba(22,16,10,0.90)),
        linear-gradient(180deg, rgba(54,39,22,0.92), rgba(11,8,5,0.94));
      box-shadow:
        inset 0 0 0 1px rgba(255,229,163,0.18),
        inset 0 0 24px rgba(0,0,0,0.42),
        0 0 12px rgba(230,143,35,0.34);
    }
    .bag-cell-icon {
      width: 58%;
      height: 58%;
      object-fit: contain;
      position: absolute;
      left: 50%;
      top: 44%;
      transform: translate(-50%, -50%);
      filter: drop-shadow(0 4px 6px rgba(0,0,0,0.74));
    }
    .bag-cell-name {
      position: absolute;
      left: 5px;
      right: 5px;
      bottom: 6px;
      color: rgba(232,222,190,0.86);
      font-size: 10px;
      line-height: 1.2;
      text-align: center;
      white-space: normal;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .bag-cell-count {
      position: absolute;
      right: 5px;
      bottom: 5px;
      min-width: 18px;
      height: 18px;
      padding: 0 4px;
      box-sizing: border-box;
      border: 0;
      border-radius: 0;
      background: transparent;
      color: rgba(246,228,180,0.92);
      font-size: 11px;
      line-height: 1;
      text-align: right;
      text-shadow: 0 2px 2px rgba(0,0,0,0.95);
    }
    .bag-detail {
      height: 100%;
      display: grid;
      grid-template-rows: auto auto 1fr;
      gap: 16px;
    }
    .bag-detail-top {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 112px;
      gap: 18px;
      align-items: start;
      min-height: 128px;
      padding-bottom: 14px;
      border-bottom: 1px solid rgba(139,120,78,0.36);
    }
    .bag-detail-name {
      margin: 0 0 18px;
      color: rgba(238,228,198,0.92);
      font-size: 19px;
      font-weight: normal;
      line-height: 1.25;
      text-shadow: 0 2px 3px rgba(0,0,0,0.86);
    }
    .bag-detail-row {
      display: grid;
      grid-template-columns: 86px minmax(0, 1fr);
      gap: 12px;
      min-height: 27px;
      align-items: center;
      border-bottom: 1px solid rgba(116,101,68,0.32);
      color: rgba(210,203,184,0.82);
      font-size: 15px;
      line-height: 1.2;
    }
    .bag-detail-label {
      color: rgba(176,163,130,0.82);
    }
    .bag-detail-value {
      color: rgba(232,222,190,0.9);
      text-align: right;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .bag-detail-icon-wrap {
      width: 112px;
      height: 112px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(68,62,50,0.72);
      background:
        radial-gradient(circle at 50% 42%, rgba(221,207,166,0.12), transparent 60%),
        linear-gradient(180deg, rgba(9,9,10,0.72), rgba(0,0,0,0.46));
      box-shadow: inset 0 0 24px rgba(0,0,0,0.46);
    }
    .bag-detail-icon {
      width: 78px;
      height: 78px;
      object-fit: contain;
      filter: drop-shadow(0 8px 10px rgba(0,0,0,0.8));
    }
    .bag-effect-title {
      margin: 0;
      padding-bottom: 9px;
      border-bottom: 1px solid rgba(139,120,78,0.42);
      color: rgba(203,190,150,0.86);
      font-size: 16px;
      font-weight: normal;
      line-height: 1.2;
    }
    .bag-effect-text {
      margin: 0;
      color: rgba(221,216,204,0.78);
      font-size: 16px;
      line-height: 1.72;
      white-space: pre-line;
    }
    .bag-stats {
      display: grid;
      gap: 0;
    }
    .bag-stat-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 16px;
      min-height: 34px;
      align-items: center;
      border-bottom: 1px solid rgba(139,120,78,0.36);
      color: rgba(218,211,192,0.82);
      font-size: 16px;
      line-height: 1.2;
    }
    .bag-stat-value {
      color: rgba(232,222,190,0.94);
      text-align: right;
      min-width: 68px;
    }
    #bag-empty {
      grid-column: 1 / -1;
      padding: 26px 0;
      text-align: center;
      font-size: 13px;
      color: rgba(216,208,189,0.42);
      letter-spacing: 0.06em;
    }
    @media (max-width: 900px) {
      #equipment-bar {
        left: 16px;
        bottom: 18px;
        transform: scale(0.84);
        transform-origin: left bottom;
      }
      #bag-panel { padding: 14px; overflow: auto; }
      .bag-modal { min-height: 760px; height: auto; }
      .bag-body {
        height: auto;
        grid-template-columns: 1fr;
      }
      .bag-column {
        border-right: 0;
        border-bottom: 1px solid rgba(143,125,82,0.42);
      }
      .bag-column:last-child {
        border-bottom: 0;
      }
      .bag-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
        max-height: none;
      }
      .bag-detail-top {
        grid-template-columns: minmax(0, 1fr) 96px;
      }
      .bag-detail-icon-wrap {
        width: 96px;
        height: 96px;
      }
      .bag-detail-icon {
        width: 66px;
        height: 66px;
      }
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
    #enter-prompt,
    #talk-btn,
    #pick-btn,
    #fish-btn,
    #castle-action-btn,
    #exit-btn {
      min-width: 138px;
      padding: 7px 18px;
      border: 1px solid rgba(176, 145, 82, 0.86);
      border-radius: 2px;
      background:
        linear-gradient(90deg, rgba(7, 7, 6, 0.96), rgba(30, 26, 19, 0.88) 52%, rgba(7, 7, 6, 0.96)),
        radial-gradient(circle at 50% 0%, rgba(176,145,82,0.22), transparent 55%);
      color: #d8c89b;
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 13px;
      letter-spacing: 0.08em;
      text-shadow: 0 1px 2px rgba(0,0,0,0.95);
      box-shadow:
        inset 0 0 0 1px rgba(255, 230, 160, 0.08),
        inset 0 -14px 22px rgba(0,0,0,0.42),
        0 8px 22px rgba(0,0,0,0.56);
      white-space: nowrap;
      pointer-events: auto;
      cursor: pointer;
      z-index: 100;
      transition: border-color 0.16s, color 0.16s, filter 0.16s, transform 0.16s;
    }
    #enter-prompt {
      display: flex;
      align-items: center;
      gap: 14px;
      color: #a99a74;
      transform: translateX(-50%);
    }
    #enter-prompt::before,
    #talk-btn::before,
    #pick-btn::before,
    #fish-btn::before,
    #castle-action-btn::before,
    #exit-btn::before {
      content: '✦';
      margin-right: 9px;
      color: #8e7644;
      font-size: 10px;
      vertical-align: 1px;
    }
    #enter-prompt::after,
    #talk-btn::after,
    #pick-btn::after,
    #fish-btn::after {
      display: none;
    }
    #enter-prompt button {
      margin-left: 0;
      padding: 2px 10px;
      border: 1px solid rgba(176, 145, 82, 0.7);
      border-radius: 1px;
      background: rgba(0, 0, 0, 0.38);
      color: #efe1b6;
      font-family: inherit;
      font-size: 12px;
      letter-spacing: 0.1em;
    }
    #enter-prompt:hover,
    #talk-btn:hover,
    #pick-btn:hover,
    #fish-btn:hover,
    #castle-action-btn:hover,
    #exit-btn:hover,
    #enter-prompt button:hover {
      border-color: #d7b46a;
      color: #fff0bd;
      filter: brightness(1.14);
      background:
        linear-gradient(90deg, rgba(12, 11, 9, 0.98), rgba(48, 39, 25, 0.92) 52%, rgba(12, 11, 9, 0.98));
    }
    #dialogue-panel {
      background:
        linear-gradient(180deg, rgba(8,7,6,0.95), rgba(22,18,13,0.94)),
        radial-gradient(circle at 50% 0%, rgba(176,145,82,0.18), transparent 55%);
      border: 1px solid rgba(176,145,82,0.78);
      border-radius: 2px;
      box-shadow:
        inset 0 0 0 1px rgba(255,230,160,0.08),
        0 10px 30px rgba(0,0,0,0.68);
      font-family: Georgia, 'Times New Roman', serif;
    }
    #dialogue-panel::after {
      display: none;
    }
    #dialogue-avatar {
      border: 1px solid rgba(176,145,82,0.72);
      border-radius: 2px;
      background: rgba(0,0,0,0.25);
      color: #d8c89b;
    }
    #dialogue-name {
      color: #d8c89b;
      letter-spacing: 0.08em;
      font-weight: normal;
    }
    #dialogue-text {
      color: #d8d0bd;
    }
    #dialogue-end-btn {
      border: 1px solid rgba(176,145,82,0.78);
      border-radius: 1px;
      color: #d8c89b;
      font-family: Georgia, 'Times New Roman', serif;
      letter-spacing: 0.08em;
    }
    #dialogue-end-btn:hover {
      background: rgba(176,145,82,0.18);
      color: #fff0bd;
    }
    .npc-hp {
      position: absolute;
      width: 46px;
      height: 6px;
      border-radius: 999px;
      border: 1px solid rgba(0,0,0,0.65);
      background: rgba(20,20,20,0.75);
      transform: translateX(-50%);
      pointer-events: none;
      z-index: 210;
      overflow: hidden;
    }
    .npc-hp-fill {
      width: 100%;
      height: 100%;
      transform-origin: left center;
      background: #e24a4a;
      transition: transform 0.08s linear;
    }
    .damage-float {
      position: absolute;
      transform: translate(-50%, -50%);
      pointer-events: none;
      z-index: 220;
      color: #ffd76a;
      font-family: sans-serif;
      font-size: 16px;
      font-weight: bold;
      text-shadow: 0 1px 4px rgba(0,0,0,0.75);
      white-space: nowrap;
    }
  `
  document.head.appendChild(promptStyle)

  let promptEl = null
  let exitBtn = null
  let actionBtn = null
  let bonfireMenu = null
  let objectNameLabel = null
  const interactionPromptRadius = 110

  function cleanInteractionLabel(label) {
    return String(label).replace(/[^\p{L}\p{N}\s\-_/：:]/gu, '').trim()
  }

  function positionAtCharacterUpperRight(el, worldPos, camera, renderer) {
    const v = new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z).project(camera)
    const w = renderer.domElement.clientWidth
    const h = renderer.domElement.clientHeight
    const angle = THREE.MathUtils.degToRad(30)
    const sx = (v.x * 0.5 + 0.5) * w
    const sy = (-v.y * 0.5 + 0.5) * h
    el.style.left = `${sx + Math.cos(angle) * interactionPromptRadius}px`
    el.style.top = `${sy - Math.sin(angle) * interactionPromptRadius}px`
  }
  let talkBtn = null
  let pickBtn = null
  let fishBtn = null
  let fishResultEl = null
  let pickupToast = null
  let pickupToastTimer = null
  let dialoguePanel = null
  const npcHpBars = new Map()
  const damageFloats = []

  // ── 装备栏（固定，常驻）──────────────────────────
  const equipmentBar = document.createElement('div')
  equipmentBar.id = 'equipment-bar'
  equipmentBar.innerHTML = `
    <button class="equipment-slot equipment-slot-top" data-equipment-slot="spell" type="button">
      <span class="equipment-slot-icon"></span>
      <span class="equipment-slot-name">火球</span>
    </button>
    <button class="equipment-slot equipment-slot-left" data-equipment-slot="shield" type="button">
      <span class="equipment-slot-icon"></span>
      <span class="equipment-slot-name">盾牌</span>
    </button>
    <button class="equipment-slot equipment-slot-right" data-equipment-slot="weapon" data-clickable="true" type="button">
      <span class="equipment-slot-key">Z</span>
      <span class="equipment-slot-icon"></span>
      <span class="equipment-slot-name">长剑</span>
    </button>
    <button class="equipment-slot equipment-slot-bottom" data-equipment-slot="item" data-clickable="true" type="button">
      <span class="equipment-slot-icon"></span>
      <span class="equipment-slot-name">背包</span>
      <span class="equipment-slot-count" aria-hidden="true"></span>
    </button>
  `
  container.appendChild(equipmentBar)

  function equipmentImage(svg) {
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
  }

  const equipmentLabels = {
    fireball: {
      name: '火球',
      image: equipmentImage(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
          <defs>
            <radialGradient id="core" cx="48%" cy="50%" r="44%">
              <stop offset="0" stop-color="#fff5bf"/>
              <stop offset=".32" stop-color="#ffbc42"/>
              <stop offset=".68" stop-color="#d94a1f"/>
              <stop offset="1" stop-color="#3a0b06" stop-opacity=".15"/>
            </radialGradient>
            <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="3.5" result="b"/>
              <feColorMatrix in="b" values="1 0 0 0 1 0 .56 0 0 .25 0 0 .12 0 0 0 0 0 1 0"/>
              <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <path d="M50 6c10 17-5 23 7 35 4-10 13-15 22-17-3 10-1 18 5 27 8 13 2 31-15 38-17 7-39 2-50-12C7 60 15 40 30 29c10-7 14-13 20-23Z" fill="#8f210d" opacity=".78"/>
          <path d="M36 19c6 13-7 21 6 33 2-9 8-16 17-21-2 12 8 17 11 27 5 16-9 27-24 27-17 0-29-11-28-27 .8-14 12-24 18-39Z" fill="url(#core)" filter="url(#glow)"/>
          <path d="M45 45c5 8-2 13 5 19 2-5 5-8 10-10 0 9 5 12 3 18-2 7-10 11-18 8-8-3-13-10-10-19 2-6 7-10 10-16Z" fill="#fff1a6" opacity=".88"/>
        </svg>
      `),
    },
    shield: {
      name: '盾牌',
      image: equipmentImage(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
          <defs>
            <linearGradient id="steel" x1="18" x2="78" y1="10" y2="86">
              <stop offset="0" stop-color="#f2e3b7"/>
              <stop offset=".25" stop-color="#9f8c61"/>
              <stop offset=".55" stop-color="#34302a"/>
              <stop offset="1" stop-color="#d5b469"/>
            </linearGradient>
            <linearGradient id="blood" x1="20" x2="75" y1="20" y2="80">
              <stop offset="0" stop-color="#702018"/>
              <stop offset="1" stop-color="#1a0806"/>
            </linearGradient>
          </defs>
          <path d="M48 7 78 18v28c0 22-12 36-30 44C30 82 18 68 18 46V18L48 7Z" fill="url(#steel)" stroke="#f0d58d" stroke-width="3"/>
          <path d="M48 16 68 23v23c0 16-7 27-20 34-13-7-20-18-20-34V23l20-7Z" fill="url(#blood)" opacity=".86"/>
          <path d="M48 15v66" stroke="#d5b469" stroke-width="4" opacity=".75"/>
          <path d="M29 38h38" stroke="#d5b469" stroke-width="4" opacity=".65"/>
          <path d="M31 24c14 3 23 3 34 0" fill="none" stroke="#fff0bd" stroke-width="2" opacity=".52"/>
        </svg>
      `),
    },
    sword: {
      name: '长剑',
      image: equipmentImage(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
          <defs>
            <linearGradient id="blade" x1="25" x2="72" y1="14" y2="79">
              <stop offset="0" stop-color="#fff4cf"/>
              <stop offset=".34" stop-color="#b7b4aa"/>
              <stop offset=".66" stop-color="#4f514f"/>
              <stop offset="1" stop-color="#e6c46f"/>
            </linearGradient>
          </defs>
          <path d="M70 8 58 57 48 67 38 57 50 22 70 8Z" fill="url(#blade)" stroke="#f2daa0" stroke-width="2"/>
          <path d="M70 8 48 67" stroke="#ffffff" stroke-width="1.5" opacity=".5"/>
          <path d="M30 62 39 53 63 77 54 86 30 62Z" fill="#5c321c" stroke="#d8b66a" stroke-width="2"/>
          <path d="M31 50 46 65" stroke="#d8b66a" stroke-width="8" stroke-linecap="round"/>
          <path d="M27 46 50 69" stroke="#1b1510" stroke-width="4" stroke-linecap="round"/>
          <circle cx="57" cy="80" r="5" fill="#d8b66a" stroke="#21170e" stroke-width="2"/>
        </svg>
      `),
    },
    hammer: {
      name: '锤子',
      image: '/icons/equipment/hammer.png',
    },
    estusFlask: {
      name: '元素瓶',
      image: elementFlaskImage,
    },
    bag: {
      name: '背包',
      image: equipmentImage(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
          <defs>
            <linearGradient id="leather" x1="18" x2="78" y1="10" y2="86">
              <stop offset="0" stop-color="#a86932"/>
              <stop offset=".5" stop-color="#4c2611"/>
              <stop offset="1" stop-color="#c3924f"/>
            </linearGradient>
          </defs>
          <path d="M34 31c1-15 27-15 28 0" fill="none" stroke="#d8b66a" stroke-width="6" stroke-linecap="round"/>
          <path d="M22 33h52l8 47H14l8-47Z" fill="url(#leather)" stroke="#e0bd72" stroke-width="3"/>
          <path d="M23 44h50" stroke="#21140b" stroke-width="4" opacity=".55"/>
          <path d="M48 33v48" stroke="#d8b66a" stroke-width="3" opacity=".58"/>
          <path d="M36 52h24v13H36z" fill="#20150c" stroke="#d8b66a" stroke-width="2"/>
        </svg>
      `),
    },
  }
  let bagPanel = null
  let bagItems = []
  let bagActiveTab = 'spell'
  let bagSelectedItemId = null
  let bagPlayerStats = {
    level: 38,
    curse: 15,
    hp: '-',
    mp: '-',
    stamina: '-',
    atk: '-',
    equipLoad: '38.2 / 55.0',
  }
  const bagTabs = [
    { id: 'weapon', label: '武器' },
    { id: 'shield', label: '盾牌' },
    { id: 'spell', label: '法术' },
    { id: 'item', label: '物品' },
  ]

  const bagCategoryLabels = {
    weapon: '武器',
    shield: '盾牌',
    spell: '法术',
    item: '物品',
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;')
  }

  function getBagItemImage(item) {
    return item?.icon ?? equipmentLabels[item?.id]?.image ?? equipmentLabels.bag.image
  }

  function getBagItemDescription(item) {
    if (!item) return '没有选择物品。'
    if (item.id === 'estusFlask') return '恢复生命与法力。\n在篝火处休息后会补充使用次数。'
    if (item.id === 'spell_scroll') return '能够学习新的法术。\n收藏后可作为法术类物品查看。'
    if (item.id === 'fish') return '普通物品。\n已存入背包，可作为探索收获保存。'
    return '暂无说明。'
  }

  function getSelectedBagItem(tabItems) {
    const selected = tabItems.find(item => item.id === bagSelectedItemId)
    if (selected) return selected
    const first = tabItems[0] ?? null
    bagSelectedItemId = first?.id ?? null
    return first
  }

  function formatStatPair(current, max) {
    if (!Number.isFinite(current) || !Number.isFinite(max)) return '-'
    return `${Math.round(current)} / ${Math.round(max)}`
  }

  function updateBagPlayerStats(player) {
    if (!player) return
    bagPlayerStats = {
      ...bagPlayerStats,
      hp: formatStatPair(player.getHp?.(), player.getMaxHp?.()),
      mp: formatStatPair(player.getMp?.(), player.getMaxMp?.()),
      stamina: formatStatPair(player.getStamina?.(), player.getMaxStamina?.()),
      atk: Number.isFinite(player.getAtk?.()) ? String(player.getAtk()) : '-',
    }
    renderBagStats()
  }

  function getBagStatRows() {
    return [
      ['等级', bagPlayerStats.level],
      ['诅咒', bagPlayerStats.curse],
      ['生命力', bagPlayerStats.hp],
      ['集中力', bagPlayerStats.mp],
      ['持久力', bagPlayerStats.stamina],
      ['攻击力', bagPlayerStats.atk],
      ['装备重量', bagPlayerStats.equipLoad],
      ['记忆空格', 1],
    ]
  }

  function renderBagStats() {
    if (!bagPanel) return
    const statsEl = bagPanel.querySelector('.bag-stats')
    if (!statsEl) return
    statsEl.innerHTML = getBagStatRows().map(([label, value]) => `
      <div class="bag-stat-row">
        <span>${escapeHtml(label)}</span>
        <span class="bag-stat-value">${escapeHtml(value)}</span>
      </div>
    `).join('')
  }

  function toggleBagPanel() {
    if (bagPanel) {
      closeBagPanel()
    } else {
      bagPanel = document.createElement('div')
      bagPanel.id = 'bag-panel'
      renderBagPanel()
      container.appendChild(bagPanel)
    }
  }

  function closeBagPanel() {
    if (!bagPanel) return
    bagPanel.remove()
    bagPanel = null
  }

  function updateEquipmentSlot(slot, itemId, count = null) {
    const slotEl = equipmentBar.querySelector(`[data-equipment-slot="${slot}"]`)
    const label = equipmentLabels[itemId] ?? equipmentLabels.bag
    if (!slotEl) return
    const iconEl = slotEl.querySelector('.equipment-slot-icon')
    iconEl.innerHTML = ''
    const img = document.createElement('img')
    img.className = 'equipment-slot-image'
    img.src = label.image
    img.alt = label.name
    iconEl.appendChild(img)
    slotEl.querySelector('.equipment-slot-name').textContent = label.name
    slotEl.setAttribute('aria-label', label.name)
    slotEl.title = label.name
    const countEl = slotEl.querySelector('.equipment-slot-count')
    if (countEl) {
      const visible = count !== null && count !== undefined
      countEl.textContent = visible ? `×${count}` : ''
      countEl.style.display = visible ? '' : 'none'
    }
  }

  equipmentBar.querySelector('[data-equipment-slot="weapon"]').addEventListener('click', () => {
    const state = handlers.onCycleWeapon?.()
    if (state) updateEquipmentState(state)
  })
  equipmentBar.querySelector('[data-equipment-slot="item"]').addEventListener('click', toggleBagPanel)

  function renderBagPanel() {
    if (!bagPanel) return
    const tabItems = bagItems.filter(item => item.category === bagActiveTab)
    const selectedItem = getSelectedBagItem(tabItems)
    const cells = Array.from({ length: 25 }, (_, index) => {
      const item = tabItems[index]
      if (!item) return `<div class="bag-cell" aria-hidden="true"></div>`
      const image = getBagItemImage(item)
      const isSelected = item.id === selectedItem?.id
      return `
        <button class="bag-cell is-filled ${isSelected ? 'is-selected' : ''}" data-bag-item="${escapeHtml(item.id)}" title="${escapeHtml(item.name)}" type="button">
          <img class="bag-cell-icon" src="${escapeHtml(image)}" alt="${escapeHtml(item.name)}">
          <div class="bag-cell-count">${escapeHtml(item.count)}</div>
          <div class="bag-cell-name">${escapeHtml(item.name)}</div>
        </button>
      `
    }).join('')
    const tabs = bagTabs.map(tab => `
      <button class="bag-tab ${tab.id === bagActiveTab ? 'is-active' : ''}" data-bag-tab="${tab.id}" type="button">${tab.label}</button>
    `).join('')
    const detailImage = selectedItem ? getBagItemImage(selectedItem) : equipmentLabels.bag.image
    const detailName = selectedItem?.name ?? '未选择物品'
    const detailCount = selectedItem?.count ?? '-'
    const detailCategory = selectedItem ? bagCategoryLabels[selectedItem.category] ?? selectedItem.category : '-'
    const detailDescription = getBagItemDescription(selectedItem)
    bagPanel.innerHTML = `
      <div class="bag-modal" role="dialog" aria-modal="true" aria-label="背包">
        <div class="bag-header">
          <h4 class="bag-title">背包</h4>
          <button class="bag-close" type="button" aria-label="关闭背包">×</button>
        </div>
        <div class="bag-body">
          <section class="bag-column" aria-label="物品列表">
            <h5 class="bag-column-title">贵重物品</h5>
            <div class="bag-tabs">${tabs}</div>
            <div class="bag-grid">
              ${tabItems.length === 0 ? '<div id="bag-empty">空空如也</div>' : ''}
              ${cells}
            </div>
          </section>
          <section class="bag-column bag-detail" aria-label="物品详情">
            <div class="bag-detail-top">
              <div>
                <h5 class="bag-detail-name">${escapeHtml(detailName)}</h5>
                <div class="bag-detail-row">
                  <span class="bag-detail-label">持有数</span>
                  <span class="bag-detail-value">${escapeHtml(detailCount)}</span>
                </div>
                <div class="bag-detail-row">
                  <span class="bag-detail-label">分类</span>
                  <span class="bag-detail-value">${escapeHtml(detailCategory)}</span>
                </div>
              </div>
              <div class="bag-detail-icon-wrap">
                <img class="bag-detail-icon" src="${escapeHtml(detailImage)}" alt="${escapeHtml(detailName)}">
              </div>
            </div>
            <h5 class="bag-effect-title">道具效果</h5>
            <p class="bag-effect-text">${escapeHtml(detailDescription)}</p>
          </section>
          <section class="bag-column" aria-label="角色资料">
            <h5 class="bag-column-title">角色资料</h5>
            <div class="bag-stats"></div>
          </section>
        </div>
      </div>
    `
    bagPanel.querySelector('.bag-close')?.addEventListener('click', closeBagPanel)
    bagPanel.querySelectorAll('[data-bag-tab]').forEach(button => {
      button.addEventListener('click', () => {
        bagActiveTab = button.dataset.bagTab
        bagSelectedItemId = null
        renderBagPanel()
      })
    })
    bagPanel.querySelectorAll('[data-bag-item]').forEach(button => {
      button.addEventListener('click', () => {
        bagSelectedItemId = button.dataset.bagItem
        renderBagPanel()
      })
    })
    renderBagStats()
  }

  function updateEquipmentState(state = {}) {
    updateEquipmentSlot('spell', state.spell ?? 'fireball')
    updateEquipmentSlot('shield', state.shield ?? 'shield')
    updateEquipmentSlot('weapon', state.weapon ?? 'sword')
    updateEquipmentSlot('item', state.item ?? 'estusFlask', state.itemCount)
  }
  updateEquipmentState()

  function projectToScreen(worldPos, camera, renderer) {
    const v = new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z).project(camera)
    if (v.z < -1 || v.z > 1) return null
    const canvasRect = renderer.domElement.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    const w = canvasRect.width
    const h = canvasRect.height
    const sx = canvasRect.left - containerRect.left + (v.x * 0.5 + 0.5) * w
    const sy = canvasRect.top - containerRect.top + (-v.y * 0.5 + 0.5) * h
    return { sx, sy, w, h }
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
  const combatEl = hud.querySelector('#hud-combat')
  const lockEl = hud.querySelector('#hud-lock')
  const hpWrapEl = vitals.querySelector('#souls-hp-wrap')
  const hpFillEl = vitals.querySelector('#souls-hp-fill')
  const mpWrapEl = vitals.querySelector('#souls-mp-wrap')
  const mpFillEl = vitals.querySelector('#souls-mp-fill')
  const staminaWrapEl = vitals.querySelector('#souls-stamina-wrap')
  const staminaFillEl = vitals.querySelector('#souls-stamina-fill')
  let areaTitleTimer = null

  function updateVitals(player) {
    if (!player.getHp || !player.getMaxHp) return
    const maxHp = Math.max(1, player.getMaxHp())
    const hp = Math.min(maxHp, Math.max(0, player.getHp()))
    const ratio = hp / maxHp
    hpFillEl.style.transform = `scaleX(${ratio.toFixed(4)})`
    hpWrapEl.setAttribute('aria-label', `玩家生命值 ${Math.round(hp)} / ${Math.round(maxHp)}`)
    hpWrapEl.title = `${Math.round(hp)} / ${Math.round(maxHp)}`

    if (!player.getMp || !player.getMaxMp) return
    const maxMp = Math.max(1, player.getMaxMp())
    const mp = Math.min(maxMp, Math.max(0, player.getMp()))
    const mpRatio = mp / maxMp
    mpFillEl.style.transform = `scaleX(${mpRatio.toFixed(4)})`
    mpWrapEl.setAttribute('aria-label', `玩家法力值 ${Math.round(mp)} / ${Math.round(maxMp)}`)
    mpWrapEl.title = `${Math.round(mp)} / ${Math.round(maxMp)}`

    if (!player.getStamina || !player.getMaxStamina) return
    const maxStamina = Math.max(1, player.getMaxStamina())
    const stamina = Math.min(maxStamina, Math.max(0, player.getStamina()))
    const staminaRatio = stamina / maxStamina
    staminaFillEl.style.transform = `scaleX(${staminaRatio.toFixed(4)})`
    staminaWrapEl.setAttribute('aria-label', `玩家精力值 ${Math.round(stamina)} / ${Math.round(maxStamina)}`)
    staminaWrapEl.title = `${Math.round(stamina)} / ${Math.round(maxStamina)}`
  }

  return {
    update(player, sunPhase) {
      const pos = player.getPosition()
      posEl.textContent = `位置: (${pos.x.toFixed(1)}, ${pos.z.toFixed(1)})`
      spdEl.textContent = `速度: ${player.getSpeed().toFixed(2)}`
      updateVitals(player)
      updateBagPlayerStats(player)
      if (player.getHp && player.getMaxHp && player.getAtk) {
        combatEl.textContent = `ATK: ${player.getAtk()}`
      }
      if (sunPhase !== undefined) drawSunDial(sunPhase)
    },

    updateEquipmentState,

    showNpcHpBar(npc, worldPos, ratio, camera, renderer) {
      if (!npc) return
      const projected = projectToScreen(worldPos, camera, renderer)
      if (!projected) {
        const stale = npcHpBars.get(npc)
        if (stale) stale.el.style.display = 'none'
        return
      }

      let entry = npcHpBars.get(npc)
      if (!entry) {
        const el = document.createElement('div')
        el.className = 'npc-hp'
        const fill = document.createElement('div')
        fill.className = 'npc-hp-fill'
        el.appendChild(fill)
        container.appendChild(el)
        entry = { el, fill }
        npcHpBars.set(npc, entry)
      }

      const clamped = Math.min(1, Math.max(0, ratio))
      entry.fill.style.transform = `scaleX(${clamped})`
      entry.el.style.display = ''
      entry.el.style.left = `${projected.sx}px`
      entry.el.style.top = `${projected.sy - 14}px`
    },

    hideNpcHpBar(npc) {
      const entry = npcHpBars.get(npc)
      if (!entry) return
      entry.el.remove()
      npcHpBars.delete(npc)
    },

    spawnDamageText(worldPos, value) {
      const el = document.createElement('div')
      el.className = 'damage-float'
      el.textContent = `-${value}`
      container.appendChild(el)
      damageFloats.push({
        el,
        age: 0,
        ttl: 0.65,
        world: new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z),
      })
    },

    updateCombatOverlay(dt, camera, renderer) {
      for (let i = damageFloats.length - 1; i >= 0; i--) {
        const f = damageFloats[i]
        f.age += dt
        if (f.age >= f.ttl) {
          f.el.remove()
          damageFloats.splice(i, 1)
          continue
        }

        const rise = f.age * 0.9
        const p = projectToScreen({ x: f.world.x, y: f.world.y + rise, z: f.world.z }, camera, renderer)
        if (!p) {
          f.el.style.display = 'none'
          continue
        }
        const alpha = 1 - f.age / f.ttl
        f.el.style.display = ''
        f.el.style.left = `${p.sx}px`
        f.el.style.top = `${p.sy}px`
        f.el.style.opacity = alpha.toFixed(3)
      }
    },

    clearCombatOverlays() {
      for (const { el } of npcHpBars.values()) el.remove()
      npcHpBars.clear()
      for (const f of damageFloats) f.el.remove()
      damageFloats.length = 0
    },

    setLockTarget(name = 'OFF') {
      lockEl.textContent = `LOCK: ${name}`
    },

    setSceneFade(opacity) {
      sceneFade.style.opacity = Math.min(1, Math.max(0, opacity)).toFixed(3)
    },

    showDeathMessage() {
      deathMessage.style.display = 'flex'
    },

    hideDeathMessage() {
      deathMessage.style.display = 'none'
    },

    showAreaTitle(name) {
      if (!name) return
      if (areaTitleTimer) {
        clearTimeout(areaTitleTimer)
        areaTitleTimer = null
      }
      areaTitle.textContent = name
      areaTitle.style.display = 'flex'
      areaTitle.classList.remove('area-title-visible')
      void areaTitle.offsetWidth
      areaTitle.classList.add('area-title-visible')
      areaTitleTimer = window.setTimeout(() => {
        areaTitle.classList.remove('area-title-visible')
        areaTitle.style.display = 'none'
        areaTitleTimer = null
      }, 4100)
    },

    showPickupToast(name, durationMs = 1500) {
      if (!name) return
      if (pickupToastTimer) {
        clearTimeout(pickupToastTimer)
        pickupToastTimer = null
      }
      if (!pickupToast) {
        pickupToast = document.createElement('div')
        pickupToast.id = 'pickup-toast'
        container.appendChild(pickupToast)
      }
      pickupToast.textContent = name
      pickupToastTimer = window.setTimeout(() => {
        pickupToast?.remove()
        pickupToast = null
        pickupToastTimer = null
      }, Math.max(0, durationMs))
    },

    setTransitionUiVisible(visible) {
      vitals.style.display = ''
      hud.style.display = ''
      equipmentBar.style.display = visible ? '' : 'none'
      if (!visible) {
        closeBagPanel()
        this.hideEnterPrompt()
        this.hideObjectName()
        this.hideExitButton()
        this.hideTalkButton()
        this.hidePickButton()
        this.hideFishButton()
        this.hideActionPrompt()
        this.hideBonfireMenu(false)
      }
    },

    showEnterPrompt(worldPos, camera, renderer, onEnter, label = '进入房屋', characterAngle = false) {
      const promptLabel = cleanInteractionLabel(label)
      if (!promptEl) {
        promptEl = document.createElement('div')
        promptEl.id = 'enter-prompt'
        promptEl.innerHTML = `<span>${promptLabel}</span><button>进入</button>`
        container.appendChild(promptEl)
        promptEl.querySelector('button').addEventListener('click', onEnter)
      } else {
        promptEl.querySelector('span').textContent = promptLabel
      }
      if (characterAngle) {
        positionAtCharacterUpperRight(promptEl, worldPos, camera, renderer)
      } else {
        const v = worldPos.clone().project(camera)
        const w = renderer.domElement.clientWidth
        const h = renderer.domElement.clientHeight
        promptEl.style.left = `${(v.x * 0.5 + 0.5) * w + 60}px`
        promptEl.style.top = `${(-v.y * 0.5 + 0.5) * h - 80}px`
      }
    },

    hideEnterPrompt() {
      if (promptEl) {
        promptEl.remove()
        promptEl = null
      }
    },

    showObjectName(worldPos, camera, renderer, label) {
      const promptLabel = cleanInteractionLabel(label)
      if (!promptLabel) return this.hideObjectName()
      if (!objectNameLabel) {
        objectNameLabel = document.createElement('div')
        objectNameLabel.id = 'object-name-label'
        container.appendChild(objectNameLabel)
      }
      objectNameLabel.textContent = promptLabel
      positionAtCharacterUpperRight(objectNameLabel, worldPos, camera, renderer)
    },

    hideObjectName() {
      if (objectNameLabel) {
        objectNameLabel.remove()
        objectNameLabel = null
      }
    },

    showExitButton(onExit, label = '离开 🚪', worldPos = null, camera = null, renderer = null) {
      if (!exitBtn) {
        exitBtn = document.createElement('button')
        exitBtn.id = 'exit-btn'
        container.appendChild(exitBtn)
        exitBtn.addEventListener('click', onExit)
        vitals.style.display = ''
        hud.style.display = ''
        equipmentBar.style.display = 'none'
        closeBagPanel()
      }
      exitBtn.textContent = cleanInteractionLabel(label)
      if (worldPos && camera && renderer) {
        exitBtn.style.bottom = 'auto'
        exitBtn.style.right = 'auto'
        exitBtn.style.transform = 'translate(-50%, -50%)'
        positionAtCharacterUpperRight(exitBtn, worldPos, camera, renderer)
      }
    },

    hideExitButton() {
      if (exitBtn) {
        exitBtn.remove()
        exitBtn = null
      }
      vitals.style.display = ''
      hud.style.display = ''
      equipmentBar.style.display = ''
    },

    showActionPrompt(worldPos, camera, renderer, onAction, label = '操作') {
      if (!actionBtn) {
        actionBtn = document.createElement('button')
        actionBtn.id = 'castle-action-btn'
        container.appendChild(actionBtn)
      }
      actionBtn.textContent = cleanInteractionLabel(label)
      actionBtn.onclick = onAction
      positionAtCharacterUpperRight(actionBtn, worldPos, camera, renderer)
    },

    hideActionPrompt() {
      if (actionBtn) {
        actionBtn.remove()
        actionBtn = null
      }
    },

    showBonfireMenu(worldPos, camera, renderer, handlers = {}, options = {}) {
      if (!bonfireMenu) {
        bonfireMenu = document.createElement('div')
        bonfireMenu.id = 'bonfire-menu'
        bonfireMenu.innerHTML = `
          <div id="bonfire-menu-title">篝火</div>
          <button class="bonfire-menu-option" data-bonfire-action="rest">休息</button>
          <button class="bonfire-menu-option" data-bonfire-action="memorize">记忆法术</button>
          <button class="bonfire-menu-option" data-bonfire-action="leave">离开</button>
        `
        container.appendChild(bonfireMenu)
      }

      const restBtn = bonfireMenu.querySelector('[data-bonfire-action="rest"]')
      const memorizeBtn = bonfireMenu.querySelector('[data-bonfire-action="memorize"]')
      const leaveBtn = bonfireMenu.querySelector('[data-bonfire-action="leave"]')
      restBtn.disabled = Boolean(options.restDisabled)
      memorizeBtn.disabled = Boolean(options.memorizeDisabled)
      restBtn.onclick = restBtn.disabled ? null : handlers.onRest
      memorizeBtn.onclick = memorizeBtn.disabled ? null : handlers.onMemorize
      leaveBtn.onclick = handlers.onLeave

      positionAtCharacterUpperRight(bonfireMenu, worldPos, camera, renderer)
      vitals.style.display = ''
      hud.style.display = ''
      equipmentBar.style.display = 'none'
      closeBagPanel()
    },

    hideBonfireMenu(restoreHud = true) {
      if (bonfireMenu) {
        bonfireMenu.remove()
        bonfireMenu = null
      }
      if (restoreHud) {
        vitals.style.display = ''
        hud.style.display = ''
        equipmentBar.style.display = ''
      }
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
        talkBtn.textContent = '对话'
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

    showDialoguePanel(npcName, npcColor, onEnd, dialogueLines = []) {
      if (dialoguePanel) return
      const lines = Array.isArray(dialogueLines) && dialogueLines.length > 0
        ? dialogueLines
        : ['你怎么还在这里']
      const hex = '#' + npcColor.toString(16).padStart(6, '0')
      let lineIndex = 0

      dialoguePanel = document.createElement('div')
      dialoguePanel.id = 'dialogue-panel'
      dialoguePanel.innerHTML = `
        <div id="dialogue-avatar" style="background:${hex}">🐾</div>
        <div id="dialogue-body">
          <div id="dialogue-name"></div>
          <div id="dialogue-text"></div>
        </div>
        <button id="dialogue-end-btn"></button>
      `
      container.appendChild(dialoguePanel)
      const nameEl = dialoguePanel.querySelector('#dialogue-name')
      const textEl = dialoguePanel.querySelector('#dialogue-text')
      const endBtn = dialoguePanel.querySelector('#dialogue-end-btn')
      const renderLine = () => {
        nameEl.textContent = npcName
        textEl.textContent = lines[lineIndex]
        endBtn.textContent = lineIndex < lines.length - 1 ? '下一句' : '结束对话'
      }
      endBtn.addEventListener('click', () => {
        if (lineIndex < lines.length - 1) {
          lineIndex += 1
          renderLine()
          return
        }
        onEnd?.()
      })
      renderLine()
      vitals.style.display = ''
      hud.style.display = ''
      equipmentBar.style.display = 'none'
      closeBagPanel()
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
      vitals.style.display = ''
      hud.style.display = ''
      equipmentBar.style.display = ''
    },

    showPickButton(worldPos, camera, renderer, onPick, label = '拾取') {
      const v = new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z).project(camera)
      const w = renderer.domElement.clientWidth
      const h = renderer.domElement.clientHeight
      const sx = (v.x * 0.5 + 0.5) * w
      const sy = (-v.y * 0.5 + 0.5) * h

      if (!pickBtn) {
        pickBtn = document.createElement('button')
        pickBtn.id = 'pick-btn'
        container.appendChild(pickBtn)
      }
      pickBtn.textContent = label
      pickBtn.onclick = onPick
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

    toggleBagPanel,
    closeBagPanel,
    isBagOpen() {
      return Boolean(bagPanel)
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
        fishBtn.textContent = '钓鱼'
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
      vitals.style.display = ''
      hud.style.display = ''
      equipmentBar.style.display = 'none'
      closeBagPanel()
    },

    hideFishResult() {
      if (fishResultEl) {
        fishResultEl.remove()
        fishResultEl = null
      }
      vitals.style.display = ''
      hud.style.display = ''
      equipmentBar.style.display = ''
    },
  }
}
