import * as THREE from 'three'
import { createScene } from './scene/scene.js'
import { createMap } from './scene/map.js'
import { createLighting } from './scene/lighting.js'
import { createPlayer } from './entities/player.js'
import { createNPC } from './entities/npc.js'
import { createFBXNPC } from './entities/npcFBX.js'
import { InputSystem } from './systems/input.js'
import { CollisionSystem } from './systems/collision.js'
import { createUI } from './ui.js'
import { createIndoorScene } from './scene/indoor.js'
import { InteractionSystem } from './systems/interaction.js'
import { createAppleTree } from './scene/appleTree.js'
import { createFishingRod } from './scene/fishingRod.js'
import { InventorySystem } from './systems/inventory.js'
import { houses, appleTree as appleTreeConfig, fishingLake } from './config/world.js'
import { createHolidayDecorations } from './scene/holiday.js'
import { createSky } from './scene/sky.js'

// ── 初始化渲染器 ──────────────────────────────────────
const app = document.getElementById('app')
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.shadowMap.autoUpdate = true
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.2
renderer.outputColorSpace = THREE.SRGBColorSpace
app.appendChild(renderer.domElement)

// ── 搭建场景 ──────────────────────────────────────────
const { scene, camera } = createScene()
const { sun } = createLighting(scene)
const { collidables, update: updateMap, ponds, spawnRipple, getTerrainHeight } = createMap(scene)

// ── 创建玩家 ──────────────────────────────────────────
const player = createPlayer(scene)

// ── 室内场景 ──────────────────────────────────────────
const { scene: indoorScene, camera: indoorCamera, collidables: indoorCollidables } = createIndoorScene()

// ── NPC 对话摄像机 ────────────────────────────────────
const npcTalkCamera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200)
let activeNpc = null

// ── 交互系统（门检测）────────────────────────────────
const interaction = new InteractionSystem(houses)
let activeScene = 'outdoor'

// ── 创建 NPC（依赖 houses，必须在此之后）────────────────
const npcDefs = [
  { name: 'Mika',  color: 0xff6b6b },
  { name: 'Taro',  color: 0xf9ca24 },
  { name: 'Hana',  color: 0xff9ff3 },
  { name: 'Kuma',  color: 0xa29bfe },
  { name: 'Sora',  color: 0x54a0ff },
  { name: 'Niko',  color: 0x6ab04c },
  { name: 'Yuki',  color: 0xdfe6e9 },
  { name: 'Momo',  color: 0xfd79a8 },
  { name: 'Riku',  color: 0x00b894 },
  { name: 'Chibi', color: 0xffa502 },
  { name: 'Luna',  color: 0x81ecec },
  { name: 'Popo',  color: 0xe17055 },
  { name: 'Koko',  color: 0xffeaa7 },
  { name: 'Maru',  color: 0x74b9ff },
]
const npcs = houses.map(({ x, z, rotY }, i) => {
  const def = npcDefs[i % npcDefs.length]
  return createNPC(scene, {
    x: x + Math.sin(rotY) * 3.2,
    z: z + Math.cos(rotY) * 3.2,
    color: def.color,
    name:  def.name,
    speed:        0.8 + Math.random() * 1.4,
    wanderRadius: 2.0 + Math.random() * 3.0,
  })
})

// ── FBX NPC（npc1.fbx，放在村中广场）────────────────────
const fbxNpc = createFBXNPC(scene, { x: -30, z: -15, name: 'Nora', speed: 0.9, wanderRadius: 2.5 })
npcs.push(fbxNpc)

// ── 天空系统 ──────────────────────────────────────────
const sky = createSky(scene)

// ── 节日装饰 ──────────────────────────────────────────
createHolidayDecorations(scene)

// ── 苹果树 + 背包 ─────────────────────────────────────
const appleTree = createAppleTree(scene, appleTreeConfig.x, appleTreeConfig.z)
const inventory = new InventorySystem()

// ── 钓鱼 ──────────────────────────────────────────────
const fishingRod = createFishingRod(scene)
let _fishPhase = null   // 'casting' | 'waiting' | 'result'
let _fishTimer = 0

// ── 系统初始化 ────────────────────────────────────────
const input = new InputSystem()
const collision = new CollisionSystem(collidables, 96, 96)
collision.add({ x: appleTreeConfig.x, z: appleTreeConfig.z, r: 0.35 })
npcs.forEach(npc => collision.add(npc.collidable))

// ── UI ───────────────────────────────────────────────
const ui = createUI(app)


// ── 游戏主循环 ────────────────────────────────────────
const clock = new THREE.Clock()
// 预分配，避免每帧产生 GC 压力
const _offset        = new THREE.Vector3(20, 20, 20)
const _indoorOffset  = new THREE.Vector3(10, 10, 10)
// 透视起点：等轴测方向（1,1,1）归一化后 × 11.5（FOV55 等效距离）
const _npcStartOffset = new THREE.Vector3(6.64, 6.64, 6.64)
const _npcLookOffset  = new THREE.Vector3(0, 0.9, 0)  // 看向玩家腰部，避免俯视感

const indoorCollision = new CollisionSystem(indoorCollidables, 3.6, 2.6)
let savedOutdoorPos = null
let _rippleTimer = 0
let _escWasPressed = false

// ── 对话摄像机过渡状态 ────────────────────────────────
const _talkTrans = {
  active: false, t: 0, duration: 0.55, entering: true,
  startPos: new THREE.Vector3(), startLook: new THREE.Vector3(),
  endPos:   new THREE.Vector3(), endLook:   new THREE.Vector3(),
}
const _tmpCamPos  = new THREE.Vector3()
const _tmpCamLook = new THREE.Vector3()

function exitDialogue() {
  ui.hideDialoguePanel()
  activeNpc.endTalk()
  _talkTrans.startPos.copy(_talkTrans.endPos)
  _talkTrans.startLook.copy(_talkTrans.endLook)
  _talkTrans.endPos.copy(player.getPosition()).add(_npcStartOffset)
  _talkTrans.endLook.copy(player.getPosition()).add(_npcLookOffset)
  _talkTrans.t = 0
  _talkTrans.entering = false
  _talkTrans.active = true
}

function gameLoop() {
  requestAnimationFrame(gameLoop)
  const dt = Math.min(clock.getDelta(), 0.05)

  if (activeScene === 'indoor') {
    player.update(dt, input, indoorCollision)
    const ipos = player.getPosition()
    indoorCamera.position.copy(ipos).add(_indoorOffset)
    indoorCamera.lookAt(ipos)
    renderer.render(indoorScene, indoorCamera)
    return
  }

  if (activeScene === 'npc-talk') {
    updateMap(clock.elapsedTime)
    appleTree.update(clock.elapsedTime)
    player.updateAnimation(dt)
    npcs.forEach(npc => npc.update(dt, player, collision))

    if (_talkTrans.active) {
      _talkTrans.t += dt / _talkTrans.duration
      if (_talkTrans.t >= 1) {
        _talkTrans.t = 1
        _talkTrans.active = false
        if (_talkTrans.entering) {
          ui.showDialoguePanel(activeNpc.getName(), activeNpc.getColor(), exitDialogue)
        } else {
          activeScene = 'outdoor'
          activeNpc = null
        }
      }
      const te = _talkTrans.t * _talkTrans.t * (3 - 2 * _talkTrans.t)
      _tmpCamPos.lerpVectors(_talkTrans.startPos, _talkTrans.endPos, te)
      _tmpCamLook.lerpVectors(_talkTrans.startLook, _talkTrans.endLook, te)
    } else {
      _tmpCamPos.copy(_talkTrans.endPos)
      _tmpCamLook.copy(_talkTrans.endLook)

      // ESC 退出对话（边沿触发，只响应按下瞬间）
      const escNow = input.isPressed('Escape')
      if (escNow && !_escWasPressed) exitDialogue()
      _escWasPressed = escNow
    }

    npcTalkCamera.position.copy(_tmpCamPos)
    npcTalkCamera.lookAt(_tmpCamLook)

    const sunPhaseNpc = (clock.elapsedTime % 1800) / 1800 * Math.PI * 2
    sky.update(sunPhaseNpc, dt, true)

    renderer.render(scene, npcTalkCamera)
    return
  }

  if (activeScene === 'fishing') {
    updateMap(clock.elapsedTime)
    appleTree.update(clock.elapsedTime)
    npcs.forEach(npc => npc.update(dt, player, collision))
    player.updateAnimation(dt)

    fishingRod.update(dt, clock.elapsedTime, _fishPhase)

    const fpos = player.getPosition()
    camera.position.copy(fpos).add(_offset)
    camera.lookAt(fpos)

    const sunPhase = (clock.elapsedTime % 1800) / 1800 * Math.PI * 2
    const _fsx = Math.cos(sunPhase) * 40
    const _fsy = Math.sin(sunPhase) * 30 + 15
    const _fsz = Math.sin(sunPhase * 0.6) * 25
    const _fsl = Math.sqrt(_fsx * _fsx + _fsy * _fsy + _fsz * _fsz)
    sun.target.position.copy(fpos)
    sun.position.set(fpos.x + _fsx / _fsl * 80, fpos.y + _fsy / _fsl * 80, fpos.z + _fsz / _fsl * 80)
    sun.target.updateMatrixWorld()

    if (_fishPhase !== 'result') {
      _fishTimer += dt
      if (_fishPhase === 'casting' && _fishTimer >= 0.8) {
        _fishPhase = 'waiting'
        _fishTimer = 0
      }
      if (_fishPhase === 'waiting' && _fishTimer >= 5.0) {
        _fishPhase = 'result'
        const caught = Math.random() < 0.5
        if (caught) { inventory.add('鱼'); ui.updateBag(inventory.getAll()) }
        ui.showFishResult(caught, () => {
          activeScene = 'outdoor'
          fishingRod.hide()
          ui.hideFishResult()
        })
      }
    }

    sky.update(sunPhase, dt, false)
    ui.update(player, sunPhase)
    renderer.render(scene, camera)
    return
  }

  // 更新地图（风动画）
  updateMap(clock.elapsedTime)
  appleTree.update(clock.elapsedTime)

  // 更新玩家
  player.update(dt, input, collision, getTerrainHeight)

  // 水中检测
  const pos = player.getPosition()
  const inWater = ponds.some(p => {
    const dx = pos.x - p.x, dz = pos.z - p.z
    return dx * dx + dz * dz < p.r * p.r
  })
  player.setInWater(inWater)
  if (inWater && player.getSpeed() > 0) {
    _rippleTimer -= dt
    if (_rippleTimer <= 0) {
      spawnRipple(pos.x, pos.z)
      _rippleTimer = 0.2
    }
  } else {
    _rippleTimer = 0
  }

  // 更新 NPC
  npcs.forEach(npc => npc.update(dt, player, collision))

  // 摄像机跟随玩家（复用向量，不产生临时对象）
  camera.position.copy(pos).add(_offset)
  camera.lookAt(pos)

  // 太阳绕场景旋转，60 分钟一循环
  const sunPhase = (clock.elapsedTime % 1800) / 1800 * Math.PI * 2
  // 计算太阳方向（单位向量），保持光照方向不随玩家位置变化
  const _sx = Math.cos(sunPhase) * 40
  const _sy = Math.sin(sunPhase) * 30 + 15
  const _sz = Math.sin(sunPhase * 0.6) * 25
  const _sl = Math.sqrt(_sx * _sx + _sy * _sy + _sz * _sz)
  // 太阳 position + target 同步平移到玩家上方，方向不变，阴影始终覆盖玩家
  sun.target.position.copy(pos)
  sun.position.set(
    pos.x + _sx / _sl * 80,
    pos.y + _sy / _sl * 80,
    pos.z + _sz / _sl * 80,
  )
  sun.target.updateMatrixWorld()

  // 门交互检测
  const nearDoor = interaction.getNearbyDoor(pos)
  if (nearDoor) {
    ui.showEnterPrompt(pos, camera, renderer, () => {
      activeScene = 'indoor'
      ui.hideEnterPrompt()
      ui.hideTalkButton()
      ui.hidePickButton()
      savedOutdoorPos = player.getPosition().clone()
      indoorScene.add(player.getGroup())   // three.js 会自动从 outdoor scene 移除
      player.setPosition(0, 2.5)
      ui.showExitButton(() => {
        activeScene = 'outdoor'
        ui.hideExitButton()
        scene.add(player.getGroup())       // 移回室外
        if (savedOutdoorPos) player.setPosition(savedOutdoorPos.x, savedOutdoorPos.z)
      })
    })
  } else {
    ui.hideEnterPrompt()
  }

  // NPC 对话检测
  let nearNpc = null
  let nearDist = 3.5
  npcs.forEach(npc => {
    const d = pos.distanceTo(npc.getPosition())
    if (d < nearDist) { nearDist = d; nearNpc = npc }
  })
  // 苹果树检测（与进门/对话互斥）
  const appleWorldPos = appleTree.getNearestAppleWorldPos()
  const distToTree = pos.distanceTo(appleTree.getPosition())
  const nearApple = distToTree < 3.0 && !!appleWorldPos
  if (nearApple && !nearDoor && !nearNpc) {
    ui.showPickButton(appleWorldPos, camera, renderer, () => {
      const unpicked = appleTree.apples.find(a => !a.picked)
      if (!unpicked) return
      unpicked.picked = true
      unpicked.mesh.visible = false
      inventory.add('苹果')
      ui.updateBag(inventory.getAll())
      if (!appleTree.getNearestAppleWorldPos()) ui.hidePickButton()
    })
  } else {
    ui.hidePickButton()
  }

  // 钓鱼水池检测（只对 fishingLake 生效，与其他交互互斥）
  const flDx = pos.x - fishingLake.x, flDz = pos.z - fishingLake.z
  const distToLake = Math.sqrt(flDx * flDx + flDz * flDz)
  if (distToLake < fishingLake.r + 2.5 && !nearDoor && !nearNpc && !nearApple) {
    const lakeWorld = new THREE.Vector3(fishingLake.x, 0.1, fishingLake.z)
    ui.showFishButton(lakeWorld, camera, renderer, () => {
      _fishPhase = 'casting'
      _fishTimer = 0
      activeScene = 'fishing'
      ui.hideFishButton()
      player.playIdle()
      player.faceToward(fishingLake.x, fishingLake.z)
      fishingRod.show(player.getPosition(), player.getGroup().rotation.y, fishingLake)
    })
  } else {
    ui.hideFishButton()
  }

  if (nearNpc && !nearDoor) {
    const headPos = nearNpc.getHeadWorldPos()
    ui.showTalkButton(headPos, camera, renderer, () => {
      activeNpc = nearNpc
      activeNpc.startTalk(player.getPosition())
      ui.hideTalkButton()

      const playerPos = player.getPosition()
      const npcPos    = activeNpc.getPosition()

      player.playIdle()
      player.faceToward(npcPos.x, npcPos.z)

      // 过渡起点：透视摄像机等效位置（FOV55 下与正交 s=6 视觉大小匹配）
      // 正交高度=12u，透视等效距离 = 6 / tan(27.5°) ≈ 11.5u，方向同等轴测
      _talkTrans.startPos.copy(playerPos).add(_npcStartOffset)
      _talkTrans.startLook.copy(playerPos).add(_npcLookOffset)

      // 过渡终点：肩膀透视位置
      const toNpc = new THREE.Vector3().subVectors(npcPos, playerPos).setY(0).normalize()
      _talkTrans.endPos.copy(playerPos)
        .sub(toNpc.clone().multiplyScalar(2.2))
        .add(new THREE.Vector3(0.6, 1.5, 0))
      _talkTrans.endLook.set(npcPos.x, npcPos.y + 1.1, npcPos.z)

      _talkTrans.t = 0
      _talkTrans.entering = true
      _talkTrans.active = true
      activeScene = 'npc-talk'
    })
  } else {
    ui.hideTalkButton()
  }

  sky.update(sunPhase, dt, false)

  // 更新 UI
  ui.update(player, sunPhase)

  renderer.render(scene, camera)
}

gameLoop()

// ── 响应窗口大小变化 ──────────────────────────────────
window.addEventListener('resize', () => {
  const w = window.innerWidth
  const h = window.innerHeight
  const aspect = w / h
  const s = 6
  camera.left   = -s * aspect
  camera.right  =  s * aspect
  camera.top    =  s
  camera.bottom = -s
  camera.far    = 400
  camera.updateProjectionMatrix()
  npcTalkCamera.aspect = aspect
  npcTalkCamera.updateProjectionMatrix()
  renderer.setSize(w, h)
})
