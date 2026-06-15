import * as THREE from 'three'
import { createScene } from './scene/scene.js'
import { createMap } from './scene/map.js'
import { createLighting } from './scene/lighting.js'
import { createPlayer } from './entities/player.js'
import { createNPC } from './entities/npc.js'
import { createFBXNPC } from './entities/npcFBX.js'
import { createEnemyNpcFBX } from './entities/enemyNpcFBX.js'
import { InputSystem } from './systems/input.js'
import { CollisionSystem } from './systems/collision.js'
import { createUI } from './ui.js'
import { createIndoorScene } from './scene/indoor.js'
import { InteractionSystem } from './systems/interaction.js'
import { createAppleTree } from './scene/appleTree.js'
import { createFishingRod } from './scene/fishingRod.js'
import { InventorySystem } from './systems/inventory.js'
import { appleTree as appleTreeConfig, fishingLake, enemyNpc as enemyNpcConfig } from './config/world.js'
import { defaultMap } from './config/defaultMap.js'
import { BALANCE } from './config/balance.js'
import { createHolidayDecorations } from './scene/holiday.js'
import { createSky } from './scene/sky.js'
import { createMapEditor, applyLayoutToScene } from './editor/mapEditor.js'
import { buildRockInstances } from './scene/map.js'
import { createEditorUI } from './editor/editorUI.js'
import { ThirdPersonCameraController } from './systems/cameraThirdPerson.js'
import { createCastleWorld } from './scene/castle.js'

// ── 初始化渲染器 ──────────────────────────────────────
const app = document.getElementById('app')
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
const _pixelRatio = Math.min(window.devicePixelRatio, 1.25)
renderer.setPixelRatio(_pixelRatio)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.shadowMap.autoUpdate = true
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.2
renderer.outputColorSpace = THREE.SRGBColorSpace
app.appendChild(renderer.domElement)

// ── 搭建场景 ──────────────────────────────────────────
const { scene, camera: editorCamera } = createScene()
const { sun, moon, hemi, fill } = createLighting(scene)
const thirdPerson = new ThirdPersonCameraController(renderer.domElement)
const gameCamera = thirdPerson.camera
thirdPerson.setCollisionObjects(scene.children)

function setCameraIgnoreRecursive(obj, ignore = true) {
  if (!obj) return
  obj.userData.cameraIgnore = ignore
  for (const child of obj.children) {
    setCameraIgnoreRecursive(child, ignore)
  }
}

let _shadowCaster = 'sun'
function renderWithAO(activeCamera, _sceneName = 'outdoor', targetScene = scene) {
  renderer.render(targetScene, activeCamera)
}

function updateDayNightLighting(sunPhase) {
  const sunH = Math.sin(sunPhase) * 30 + 15
  const nightFactor = THREE.MathUtils.clamp((-sunH + 10) / 16, 0, 1)
  sun.intensity = THREE.MathUtils.lerp(2.2, 0.85, nightFactor)
  moon.intensity = THREE.MathUtils.lerp(0.0, 0.55, nightFactor)
  hemi.intensity = THREE.MathUtils.lerp(0.62, 0.40, nightFactor)
  fill.intensity = THREE.MathUtils.lerp(0.34, 0.18, nightFactor)
  renderer.toneMappingExposure = THREE.MathUtils.lerp(1.15, 1.02, nightFactor)

  const nextCaster = nightFactor > 0.35 ? 'moon' : 'sun'
  if (nextCaster !== _shadowCaster) {
    _shadowCaster = nextCaster
    sun.castShadow = _shadowCaster === 'sun'
    moon.castShadow = _shadowCaster === 'moon'
  }
}
// 优先加载存档，无存档时使用默认地图配置
const _layoutData = localStorage.getItem('mapLayout') ? JSON.parse(localStorage.getItem('mapLayout')) : defaultMap
const { collidables, update: updateMap, ponds, spawnRipple, getTerrainHeight } = createMap(scene)
applyLayoutToScene(scene, _layoutData)

// ── 创建玩家 ──────────────────────────────────────────
const player = createPlayer(scene)
const playerCollidable = { x: 0, z: 0, r: 0.4 }
setCameraIgnoreRecursive(player.getGroup(), true)
thirdPerson.syncToTarget(player.getPosition())

// ── 室内场景 ──────────────────────────────────────────
const { scene: indoorScene, camera: indoorCamera, collidables: indoorCollidables } = createIndoorScene()
const castle = createCastleWorld(scene)

let activeNpc = null

// ── 交互系统（门检测）────────────────────────────────
const interaction = new InteractionSystem(_layoutData.houses ?? [])
let activeScene = 'outdoor'
let _editor = null
let _editorUi = null

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
const npcs = (_layoutData.houses ?? []).map(({ x, z, rotY }, i) => {
  const def = npcDefs[i % npcDefs.length]
  return createNPC(scene, {
    x: x + Math.sin(rotY) * 3.2,
    z: z + Math.cos(rotY) * 3.2,
    color: def.color,
    name:  def.name,
    speed:        0.8 + Math.random() * 1.4,
    wanderRadius: 2.0 + Math.random() * 3.0,
    getTerrainHeight,
  })
})

// ── FBX NPC（npc1.fbx，放在村中广场）────────────────────
const fbxNpc = createFBXNPC(scene, { x: -30, z: -15, name: 'Nora', speed: 0.9, wanderRadius: 2.5, getTerrainHeight })
npcs.push(fbxNpc)

const enemyNpc = createEnemyNpcFBX(scene, {
  x: enemyNpcConfig.x,
  z: enemyNpcConfig.z,
  rotY: enemyNpcConfig.rotY,
  name: 'Bandit',
  getTerrainHeight,
})
npcs.push(enemyNpc)

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
collision.add(playerCollidable)
npcs.forEach(npc => collision.add(npc.collidable))
castle.outdoorColliders.forEach(collider => collision.add(collider))
// 记录"固定/动态碰撞体"结束位置，布局碰撞体从此之后追加
// 退出编辑器时截断这里并用新布局重填，保证新增对象也有碰撞
const _layoutCollidableIdx = collision.collidables.length
function _applyLayoutCollidables(layout) {
  collision.collidables.splice(_layoutCollidableIdx)
  layout.houses?.forEach(({ x, z }) => collision.add({ x, z, r: 2.2 }))
  layout.rocks?.forEach(({ x, z }) => collision.add({ x, z, r: 0.8 }))
  layout.trees?.forEach(({ x, z }) => collision.add({ x, z, r: 0.5 }))
  layout.campfires?.forEach(({ x, z }) => collision.add({ x, z, r: 0.6 }))
}
_applyLayoutCollidables(_layoutData)

// ── UI ───────────────────────────────────────────────
const ui = createUI(app)

// ── 编辑器入口按钮 ────────────────────────────────────
const _editBtn = document.createElement('button')
_editBtn.textContent = '✏️ 编辑地图'
_editBtn.style.cssText = `
  position:absolute; top:12px; right:12px; z-index:50;
  padding:7px 14px; border:none; border-radius:8px; cursor:pointer;
  background:rgba(30,30,50,0.75); color:#ddd; font-size:13px;
  backdrop-filter:blur(4px); pointer-events:all;
`
_editBtn.onmouseenter = () => { _editBtn.style.background = 'rgba(60,60,100,0.9)' }
_editBtn.onmouseleave = () => { _editBtn.style.background = 'rgba(30,30,50,0.75)' }
_editBtn.onclick = enterEditor
app.appendChild(_editBtn)

function enterEditor() {
  player.getGroup().visible = false
  activeScene = 'editor'
  thirdPerson.setEnabled(false)
  _editBtn.style.display = 'none'
  _editor = createMapEditor(scene, editorCamera, renderer, player.getPosition().clone())
  _editorUi = createEditorUI(app, {
    onSelectType: (type) => _editor.setPlacingType(type),
    onExport:     ()     => _editor.exportLayout(),
    onLoad:       (json) => _editor.loadLayout(json),
    onExit:       exitEditor,
  })
  _editorUi.show()
}

function exitEditor() {
  const _exportedJson = _editor.exportLayout()
  localStorage.setItem('mapLayout', _exportedJson)

  _editor.destroy()
  _editorUi.destroy()
  _editor = null
  _editorUi = null

  const _newLayout = JSON.parse(_exportedJson)

  // 将编辑器留下的个别岩石克隆替换为 InstancedMesh，恢复游戏渲染性能
  const _rockClones = scene.children.filter(obj => obj.userData?.editorMeta?.type === 'rock')
  _rockClones.forEach(obj => scene.remove(obj))
  buildRockInstances(scene, _newLayout.rocks ?? [])

  // 用新布局刷新碰撞系统，确保编辑器新增的对象也有碰撞体积
  _applyLayoutCollidables(_newLayout)

  player.getGroup().visible = true
  thirdPerson.syncToTarget(player.getPosition())
  thirdPerson.setEnabled(true)
  _editBtn.style.display = ''
  activeScene = 'outdoor'
}

// ── 游戏主循环 ────────────────────────────────────────
const clock = new THREE.Clock()
// 预分配，避免每帧产生 GC 压力
const _indoorOffset   = new THREE.Vector3(10, 10, 10)
const _fishLakeWorld  = new THREE.Vector3(fishingLake.x, 0.1, fishingLake.z)  // 钓鱼按钮位置
const _moveForward    = new THREE.Vector3()
const _moveRight      = new THREE.Vector3()
const _moveVec        = new THREE.Vector3()
const _tpMoveIntent   = { x: 0, z: 0 }
const _toLockTarget   = new THREE.Vector3()
const _lockLookAt     = new THREE.Vector3()
const _lockLookRaw    = new THREE.Vector3()
const _toCandidate    = new THREE.Vector3()
const _meleeForward   = new THREE.Vector3()
const _toMeleeTarget  = new THREE.Vector3()
const LOCK_LOOK_Y_OFFSET = 1.25

const lockState = {
  targetNpc: null,
  maxDistance: BALANCE.combat.lock.maxDistance,
  releaseDistance: BALANCE.combat.lock.releaseDistance,
  uiRange: BALANCE.combat.lock.uiRange,
  qWasPressed: false,
  lookReady: false,
}

const indoorCollision = new CollisionSystem(indoorCollidables, 3.6, 2.6)
let savedOutdoorPos = null
let _rippleTimer = 0
let _escWasPressed = false
let _hitstopTimer = 0

function requestHitstop(duration) {
  _hitstopTimer = Math.max(_hitstopTimer, Math.max(0, duration))
}

function exitDialogue() {
  ui.hideDialoguePanel()
  if (activeNpc) activeNpc.endTalk()
  activeNpc = null
  activeScene = 'outdoor'
}

function clearLock() {
  if (!lockState.targetNpc) return
  lockState.targetNpc = null
  lockState.lookReady = false
  ui.setLockTarget?.('OFF')
}

function isNpcInView(npc, camera) {
  const head = npc.getHeadWorldPos()
  _toCandidate.set(head.x, head.y, head.z).project(camera)
  if (_toCandidate.z <= 0 || _toCandidate.z >= 1) return false
  if (_toCandidate.x < -1 || _toCandidate.x > 1) return false
  if (_toCandidate.y < -1 || _toCandidate.y > 1) return false
  return true
}

function scoreViewTarget(npc, playerPos, camera) {
  const head = npc.getHeadWorldPos()
  _toCandidate.set(head.x, head.y, head.z).project(camera)
  const centerDist = Math.sqrt(_toCandidate.x * _toCandidate.x + _toCandidate.y * _toCandidate.y)
  const centerScore = Math.max(0, 1 - centerDist)
  const worldDist = playerPos.distanceTo(npc.getPosition())
  const distScore = Math.max(0, 1 - worldDist / lockState.maxDistance)
  return centerScore * 0.7 + distScore * 0.3
}

function acquireViewLockTarget(playerPos) {
  const prev = lockState.targetNpc
  let best = null
  let bestScore = -Infinity
  npcs.forEach(npc => {
    if (!npc.isAlive || !npc.isAlive()) return
    const d = playerPos.distanceTo(npc.getPosition())
    if (d > lockState.maxDistance) return
    if (!isNpcInView(npc, gameCamera)) return
    const score = scoreViewTarget(npc, playerPos, gameCamera)
    if (score > bestScore) {
      bestScore = score
      best = npc
    }
  })
  lockState.targetNpc = best
  if (prev !== best) lockState.lookReady = false
  ui.setLockTarget?.(best ? best.getName() : 'OFF')
}

function validateLock(playerPos) {
  const npc = lockState.targetNpc
  if (!npc) return
  if (!npc.isAlive || !npc.isAlive()) { clearLock(); return }
  if (playerPos.distanceTo(npc.getPosition()) > lockState.releaseDistance) clearLock()
}

function updateLockToggle(input, playerPos) {
  const qNow = input.isPressed('KeyQ')
  if (qNow && !lockState.qWasPressed) {
    if (lockState.targetNpc) clearLock()
    else acquireViewLockTarget(playerPos)
  }
  lockState.qWasPressed = qNow
}

function lerpAngle(a, b, t) {
  const d = THREE.MathUtils.euclideanModulo(b - a + Math.PI, Math.PI * 2) - Math.PI
  return a + d * t
}

function handleNpcDeath(npc) {
  npc.die?.()
  ui.hideNpcHpBar?.(npc)
  npc.setLockVisualState?.('hidden')
  const idx = collision.collidables.indexOf(npc.collidable)
  if (idx !== -1) collision.collidables.splice(idx, 1)
  if (activeNpc === npc) exitDialogue()
  if (lockState.targetNpc === npc) clearLock()
}

function handleNpcHit(npc, damage) {
  ui.spawnDamageText?.(npc.getHeadWorldPos(), damage)
}

function processPlayerMeleeAttack() {
  if (!player.consumeAttackHitWindow?.()) return

  player.getForwardXZ(_meleeForward)
  const playerPos = player.getPosition()
  const cfg = BALANCE.combat.melee
  const maxDistSq = cfg.hitRange * cfg.hitRange
  const cosHalf = Math.cos(THREE.MathUtils.degToRad(cfg.hitAngleDeg * 0.5))

  const isNpcInMeleeArc = (npc) => {
    if (!npc?.isHostile) return false
    if (!npc.isAlive?.() || !npc.isAlive()) return false
    _toMeleeTarget.subVectors(npc.getPosition(), playerPos).setY(0)
    const distSq = _toMeleeTarget.lengthSq()
    if (distSq <= 0.0001 || distSq > maxDistSq) return false
    const invLen = 1 / Math.sqrt(distSq)
    const dot = (_toMeleeTarget.x * _meleeForward.x + _toMeleeTarget.z * _meleeForward.z) * invLen
    if (dot < cosHalf) return false
    return true
  }

  let best = null
  let bestDistSq = maxDistSq

  const lockTarget = lockState.targetNpc
  if (lockTarget && isNpcInMeleeArc(lockTarget)) {
    best = lockTarget
    _toMeleeTarget.subVectors(best.getPosition(), playerPos).setY(0)
    bestDistSq = _toMeleeTarget.lengthSq()
  }

  npcs.forEach(npc => {
    if (!npc?.isHostile) return
    if (!npc.isAlive?.() || !npc.isAlive()) return
    if (best && npc === best) return
    _toMeleeTarget.subVectors(npc.getPosition(), playerPos).setY(0)
    const distSq = _toMeleeTarget.lengthSq()
    if (distSq <= 0.0001 || distSq > maxDistSq) return
    const invLen = 1 / Math.sqrt(distSq)
    const dot = (_toMeleeTarget.x * _meleeForward.x + _toMeleeTarget.z * _meleeForward.z) * invLen
    if (dot < cosHalf) return
    if (distSq < bestDistSq) {
      best = npc
      bestDistSq = distSq
    }
  })

  if (!best) return
  const damage = player.getAtk?.() ?? BALANCE.player.atk
  const hp = best.onHit ? best.onHit(damage) : best.takeDamage(damage)
  handleNpcHit(best, damage)
  if (hp <= 0) handleNpcDeath(best)
  requestHitstop(BALANCE.combat.hitstop.attackHit)
}

function getThirdPersonMoveIntent(input) {
  const lockNpc = lockState.targetNpc
  const playerPos = player.getPosition()
  if (lockNpc && lockNpc.isAlive?.()) {
    _toLockTarget.subVectors(lockNpc.getPosition(), playerPos).setY(0)
    if (_toLockTarget.lengthSq() > 0.0001) {
      _toLockTarget.normalize()
      _moveForward.copy(_toLockTarget)
      _moveRight.set(-_moveForward.z, 0, _moveForward.x)
    } else {
      thirdPerson.getMoveBasis(_moveForward, _moveRight)
    }
  } else {
    thirdPerson.getMoveBasis(_moveForward, _moveRight)
  }
  _moveVec.set(0, 0, 0)
  if (input.isPressed('up'))    _moveVec.add(_moveForward)
  if (input.isPressed('down'))  _moveVec.addScaledVector(_moveForward, -1)
  if (input.isPressed('left'))  _moveVec.addScaledVector(_moveRight, -1)
  if (input.isPressed('right')) _moveVec.add(_moveRight)

  if (_moveVec.lengthSq() > 0.0001) {
    _moveVec.normalize()
    _tpMoveIntent.x = _moveVec.x
    _tpMoveIntent.z = _moveVec.z
    return _tpMoveIntent
  }
  return null
}

function updateNpcCombatUi(camera) {
  const playerPos = player.getPosition()
  npcs.forEach(npc => {
    if (!npc.isAlive || !npc.isAlive()) {
      ui.hideNpcHpBar?.(npc)
      npc.setLockVisualState?.('hidden')
      return
    }

    const d = playerPos.distanceTo(npc.getPosition())
    const inUiRange = d <= lockState.uiRange
    if (!inUiRange) {
      ui.hideNpcHpBar?.(npc)
      npc.setLockVisualState?.('hidden')
      return
    }

    const ratio = npc.getHpRatio ? npc.getHpRatio() : 1
    const head = npc.getHeadWorldPos()
    ui.showNpcHpBar?.(npc, { x: head.x, y: head.y + 0.35, z: head.z }, ratio, camera, renderer)
    npc.setLockVisualState?.(lockState.targetNpc === npc ? 'locked' : 'candidate')
  })
}

function clearNpcCombatUi() {
  npcs.forEach(npc => {
    ui.hideNpcHpBar?.(npc)
    npc.setLockVisualState?.('hidden')
  })
}

function enterCastle() {
  activeScene = 'castle'
  savedOutdoorPos = player.getPosition().clone()
  _editBtn.style.display = 'none'
  clearLock()
  ui.hideEnterPrompt()
  ui.hideTalkButton()
  ui.hidePickButton()
  ui.hideFishButton()
  castle.scene.add(player.getGroup())
  player.setPosition(castle.spawn.x, castle.spawn.z, castle.spawn.y)
  castle.update(0, player.getPosition())
  thirdPerson.setCollisionObjects(castle.scene.children)
  thirdPerson.syncToTarget(player.getPosition())
}

function exitCastle() {
  activeScene = 'outdoor'
  _editBtn.style.display = ''
  ui.hideExitButton()
  scene.add(player.getGroup())
  if (savedOutdoorPos) player.setPosition(savedOutdoorPos.x, savedOutdoorPos.z, savedOutdoorPos.y)
  thirdPerson.setCollisionObjects(scene.children)
  thirdPerson.syncToTarget(player.getPosition())
}

function gameLoop() {
  requestAnimationFrame(gameLoop)
  const rawDt = Math.min(clock.getDelta(), 0.05)
  if (_hitstopTimer > 0) _hitstopTimer = Math.max(0, _hitstopTimer - rawDt)
  const dt = _hitstopTimer > 0 ? 0 : rawDt

  if (activeScene === 'editor') {
    _editor.update(dt)
    ui.clearCombatOverlays?.()
    clearNpcCombatUi()
    clearLock()
    lockState.qWasPressed = input.isPressed('KeyQ')
    renderWithAO(editorCamera, 'editor')
    return
  }

  if (activeScene === 'indoor') {
    player.update(dt, input, indoorCollision)
    ui.clearCombatOverlays?.()
    clearNpcCombatUi()
    clearLock()
    lockState.qWasPressed = input.isPressed('KeyQ')
    const ipos = player.getPosition()
    indoorCamera.position.copy(ipos).add(_indoorOffset)
    indoorCamera.lookAt(ipos)
    renderWithAO(indoorCamera, 'indoor', indoorScene)
    return
  }

  if (activeScene === 'castle') {
    clearNpcCombatUi()
    clearLock()
    lockState.qWasPressed = input.isPressed('KeyQ')
    player.setInWater(false)

    castle.update(0, player.getPosition())
    const moveIntent = getThirdPersonMoveIntent(input)
    player.update(dt, input, castle.collision, () => 0, playerCollidable, moveIntent)
    castle.update(dt, player.getPosition())

    const castlePos = player.getPosition()
    playerCollidable.x = castlePos.x
    playerCollidable.z = castlePos.z
    thirdPerson.update(dt, castlePos)

    if (castle.isNearExit(castlePos)) ui.showExitButton(exitCastle)
    else ui.hideExitButton()

    ui.update(player, 0)
    ui.clearCombatOverlays?.()
    renderWithAO(gameCamera, 'castle', castle.scene)
    return
  }

  if (activeScene === 'npc-talk') {
    updateMap(clock.elapsedTime)
    appleTree.update(clock.elapsedTime)
    player.updateAnimation(dt)
    npcs.forEach(npc => {
      if (npc.isAlive?.() || npc.shouldUpdateWhenDead?.()) npc.update(dt, player, collision)
    })
    thirdPerson.update(dt, player.getPosition())
    updateNpcCombatUi(gameCamera)
    ui.updateCombatOverlay?.(dt, gameCamera, renderer)

    const escNow = input.isPressed('Escape')
    if (escNow && !_escWasPressed) exitDialogue()
    _escWasPressed = escNow
    lockState.qWasPressed = input.isPressed('KeyQ')
    if (activeNpc) ui.updateDialoguePanelPosition(activeNpc.getHeadWorldPos(), gameCamera, renderer)

    const sunPhaseNpc = (clock.elapsedTime % 1800) / 1800 * Math.PI * 2
    updateDayNightLighting(sunPhaseNpc)
    sky.update(sunPhaseNpc, dt, true)

    renderWithAO(gameCamera, 'npc-talk')
    return
  }

  if (activeScene === 'fishing') {
    updateMap(clock.elapsedTime)
    appleTree.update(clock.elapsedTime)
    npcs.forEach(npc => {
      if (npc.isAlive?.() || npc.shouldUpdateWhenDead?.()) npc.update(dt, player, collision)
    })
    player.updateAnimation(dt)
    lockState.qWasPressed = input.isPressed('KeyQ')

    fishingRod.update(dt, clock.elapsedTime, _fishPhase)

    const fpos = player.getPosition()
    thirdPerson.update(dt, fpos)

    const sunPhase = (clock.elapsedTime % 1800) / 1800 * Math.PI * 2
    updateDayNightLighting(sunPhase)
    const _fsx = Math.cos(sunPhase) * 40
    const _fsy = Math.sin(sunPhase) * 30 + 15
    const _fsz = Math.sin(sunPhase * 0.6) * 25
    const _fsl = Math.sqrt(_fsx * _fsx + _fsy * _fsy + _fsz * _fsz)
    sun.target.position.copy(fpos)
    sun.position.set(fpos.x + _fsx / _fsl * 80, fpos.y + _fsy / _fsl * 80, fpos.z + _fsz / _fsl * 80)
    sun.target.updateMatrixWorld()
    moon.target.position.copy(fpos)
    moon.position.set(fpos.x - _fsx / _fsl * 80, fpos.y - _fsy / _fsl * 80, fpos.z - _fsz / _fsl * 80)
    moon.target.updateMatrixWorld()

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
    updateNpcCombatUi(gameCamera)
    ui.updateCombatOverlay?.(dt, gameCamera, renderer)
    renderWithAO(gameCamera, 'fishing')
    return
  }

  // 更新地图（风动画）
  updateMap(clock.elapsedTime)
  appleTree.update(clock.elapsedTime)
  castle.updateOutdoor(dt)

  // 更新玩家
  updateLockToggle(input, player.getPosition())
  validateLock(player.getPosition())
  const moveIntent = getThirdPersonMoveIntent(input)
  const suppressRun = Boolean(lockState.targetNpc?.isAlive?.())
  player.update(dt, input, collision, getTerrainHeight, playerCollidable, moveIntent, suppressRun)

  // 水中检测
  const pos = player.getPosition()
  playerCollidable.x = pos.x
  playerCollidable.z = pos.z
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
  npcs.forEach(npc => {
    if (npc.isAlive?.() || npc.shouldUpdateWhenDead?.()) npc.update(dt, player, collision)
  })
  if (player.consumeBlockImpact?.()) {
    requestHitstop(BALANCE.combat.hitstop.blockHit)
  }
  processPlayerMeleeAttack()

  if (lockState.targetNpc && lockState.targetNpc.isAlive?.()) {
    const targetPos = lockState.targetNpc.getPosition()
    _toLockTarget.subVectors(targetPos, pos).setY(0)
    if (_toLockTarget.lengthSq() > 0.0001) {
      _toLockTarget.normalize()
      const camDirX = -_toLockTarget.x
      const camDirZ = -_toLockTarget.z
      const desiredYaw = Math.atan2(camDirX, camDirZ)
      thirdPerson.yaw = lerpAngle(thirdPerson.yaw, desiredYaw, Math.min(dt * 10, 1))
      if (!player.isInBlockReaction?.()) {
        player.faceToward(targetPos.x, targetPos.z)
      }
    }
  }

  thirdPerson.update(dt, pos)
  if (lockState.targetNpc && lockState.targetNpc.isAlive?.()) {
    const targetPos = lockState.targetNpc.getPosition()
    _lockLookRaw.set((pos.x + targetPos.x) * 0.5, pos.y + LOCK_LOOK_Y_OFFSET, (pos.z + targetPos.z) * 0.5)
    if (!lockState.lookReady) {
      _lockLookAt.copy(_lockLookRaw)
      lockState.lookReady = true
    } else {
      _lockLookAt.lerp(_lockLookRaw, Math.min(dt * 8, 1))
    }
    gameCamera.lookAt(_lockLookAt)
  }

  // 太阳绕场景旋转，60 分钟一循环
  const sunPhase = (clock.elapsedTime % 1800) / 1800 * Math.PI * 2
  updateDayNightLighting(sunPhase)
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
  moon.target.position.copy(pos)
  moon.position.set(
    pos.x - _sx / _sl * 80,
    pos.y - _sy / _sl * 80,
    pos.z - _sz / _sl * 80,
  )
  moon.target.updateMatrixWorld()

  // 门交互检测
  const castleDx = pos.x - castle.entrance.x
  const castleDz = pos.z - castle.entrance.z
  const distanceToCastle = Math.sqrt(castleDx * castleDx + castleDz * castleDz)
  const nearCastle = distanceToCastle < castle.entranceRange
  const nearDoor = interaction.getNearbyDoor(pos)
  if (nearCastle) {
    ui.showEnterPrompt(pos, gameCamera, renderer, enterCastle, '进入古堡')
  } else if (nearDoor) {
    ui.showEnterPrompt(pos, gameCamera, renderer, () => {
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
        if (savedOutdoorPos) player.setPosition(savedOutdoorPos.x, savedOutdoorPos.z, savedOutdoorPos.y)
      })
    })
  } else {
    ui.hideEnterPrompt()
  }

  // NPC 对话检测
  let nearNpc = null
  let nearDist = 3.5
  npcs.forEach(npc => {
    if (npc.isAlive && !npc.isAlive()) return
    if (npc.isHostile) return
    const d = pos.distanceTo(npc.getPosition())
    if (d < nearDist) { nearDist = d; nearNpc = npc }
  })
  // 苹果树检测（与进门/对话互斥）
  const appleWorldPos = appleTree.getNearestAppleWorldPos()
  const distToTree = pos.distanceTo(appleTree.getPosition())
  const nearApple = distToTree < 3.0 && !!appleWorldPos
  if (nearApple && !nearCastle && !nearDoor && !nearNpc) {
    ui.showPickButton(appleWorldPos, gameCamera, renderer, () => {
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
  if (distToLake < fishingLake.r + 2.5 && !nearCastle && !nearDoor && !nearNpc && !nearApple) {
    ui.showFishButton(_fishLakeWorld, gameCamera, renderer, () => {
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

  if (nearNpc && !nearCastle && !nearDoor) {
    const headPos = nearNpc.getHeadWorldPos()
    ui.showTalkButton(headPos, gameCamera, renderer, () => {
      activeNpc = nearNpc
      activeNpc.startTalk(player.getPosition())
      ui.hideTalkButton()

      const playerPos = player.getPosition()
      const npcPos    = activeNpc.getPosition()

      player.playIdle()
      player.faceToward(npcPos.x, npcPos.z)

      clearLock()

      ui.showDialoguePanel(activeNpc.getName(), activeNpc.getColor(), exitDialogue)
      ui.updateDialoguePanelPosition(activeNpc.getHeadWorldPos(), gameCamera, renderer)
      _escWasPressed = input.isPressed('Escape')
      activeScene = 'npc-talk'
    })
  } else {
    ui.hideTalkButton()
  }

  sky.update(sunPhase, dt, false)

  // 更新 UI
  ui.update(player, sunPhase)
  updateNpcCombatUi(gameCamera)
  ui.updateCombatOverlay?.(dt, gameCamera, renderer)

  renderWithAO(gameCamera, 'outdoor')
}

gameLoop()

// ── 响应窗口大小变化 ──────────────────────────────────
window.addEventListener('resize', () => {
  const w = window.innerWidth
  const h = window.innerHeight
  const aspect = w / h
  const s = 6
  editorCamera.left   = -s * aspect
  editorCamera.right  =  s * aspect
  editorCamera.top    =  s
  editorCamera.bottom = -s
  editorCamera.far    = 400
  editorCamera.updateProjectionMatrix()
  gameCamera.aspect = aspect
  gameCamera.updateProjectionMatrix()
  renderer.setPixelRatio(_pixelRatio)
  renderer.setSize(w, h)
})
