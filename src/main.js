import * as THREE from 'three'
import { createScene } from './scene/scene.js'
import { createMap } from './scene/map.js'
import { createLighting } from './scene/lighting.js'
import { createPlayer } from './entities/player.js'
import { createFBXNPC } from './entities/npcFBX.js'
import { createEnemyNpcFBX } from './entities/enemyNpcFBX.js'
import { InputSystem } from './systems/input.js'
import { CollisionSystem } from './systems/collision.js'
import { SpellSystem } from './systems/spells.js'
import { createUI } from './ui.js'
import { createIndoorScene } from './scene/indoor.js'
import { InteractionSystem } from './systems/interaction.js'
import { createFishingRod } from './scene/fishingRod.js'
import { InventorySystem } from './systems/inventory.js'
import { EstusFlaskSystem } from './systems/estusFlask.js'
import { enemyNpcs as enemyNpcConfigs } from './config/world.js'
import { defaultMap } from './config/defaultMap.js'
import { BALANCE } from './config/balance.js'
import { createSky } from './scene/sky.js'
import { createMapEditor, applyLayoutToScene } from './editor/mapEditor.js'
import { buildRockInstances } from './scene/map.js'
import { createEditorUI } from './editor/editorUI.js'
import { ThirdPersonCameraController } from './systems/cameraThirdPerson.js'
import { createCastleWorld } from './scene/castle.js'
import { CASTLE_ENTRY_TRANSITION, CASTLE_EXTERIOR } from './config/castle.js'
import { WORLD_HALF_SIZE } from './config/world.js'
import { CASTLE_INDOOR_LIGHTING, OUTDOOR_LIGHTING } from './config/lighting.js'
import { preloadRuntimeModels } from './systems/modelAssets.js'
import npcF1Url from './characters/npc/f1.fbx?url'
import npcF2Url from './characters/npc/f2.fbx?url'
import enemyE1Url from './characters/enemy/e1.fbx?url'
import enemyE2Url from './characters/enemy/e2.fbx?url'

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
renderer.toneMappingExposure = OUTDOOR_LIGHTING.exposure.initial
renderer.outputColorSpace = THREE.SRGBColorSpace
app.appendChild(renderer.domElement)

const loadingOverlay = document.createElement('div')
loadingOverlay.style.cssText = `
  position:absolute; inset:0; z-index:2000;
  display:flex; align-items:center; justify-content:center;
  background:#050608; color:#d8d5c8;
  font:14px monospace; pointer-events:none;
`
loadingOverlay.textContent = '加载模型 0%'
app.appendChild(loadingOverlay)

const preloadModelsPromise = preloadRuntimeModels(({ loaded, total }) => {
  const pct = total > 0 ? Math.round(loaded / total * 100) : 100
  loadingOverlay.textContent = `加载模型 ${pct}%`
})

// ── 搭建场景 ──────────────────────────────────────────
const { scene, camera: editorCamera } = createScene()
const { sun, moon, hemi, fill } = createLighting(scene)
const thirdPerson = new ThirdPersonCameraController(renderer.domElement)
const gameCamera = thirdPerson.camera
const castleVistaCamera = gameCamera.clone()
const castleViewDirection = new THREE.Vector3()
const castleVistaOffset = new THREE.Vector3(
  CASTLE_EXTERIOR.origin.x,
  CASTLE_EXTERIOR.origin.y,
  CASTLE_EXTERIOR.origin.z,
)
const CASTLE_INTERIOR_EXPOSURE = CASTLE_INDOOR_LIGHTING.exposure
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

function renderCastle(activeCamera, playerPosition) {
  const previousExposure = renderer.toneMappingExposure
  renderer.toneMappingExposure = CASTLE_INTERIOR_EXPOSURE
  activeCamera.getWorldDirection(castleViewDirection)
  if (!castle.isTerraceViewActive(playerPosition, castleViewDirection)) {
    renderWithAO(activeCamera, 'castle', castle.scene)
    renderer.toneMappingExposure = previousExposure
    return
  }

  castleVistaCamera.copy(activeCamera)
  castleVistaCamera.position.add(castleVistaOffset)
  castleVistaCamera.updateMatrixWorld()

  const castleBackground = castle.scene.background
  const autoClear = renderer.autoClear
  castle.scene.background = null
  castle.setExteriorVisible(false)
  renderer.autoClear = false
  renderer.clear()
  renderer.render(scene, castleVistaCamera)
  renderer.clearDepth()
  renderer.render(castle.scene, activeCamera)
  renderer.autoClear = autoClear
  renderer.toneMappingExposure = previousExposure
  castle.setExteriorVisible(true)
  castle.scene.background = castleBackground
}

function updateDayNightLighting(sunPhase) {
  const sunH = Math.sin(sunPhase) * 30 + 15
  const nightFactor = THREE.MathUtils.clamp((-sunH + 10) / 16, 0, 1)
  const cfg = OUTDOOR_LIGHTING
  sun.intensity = THREE.MathUtils.lerp(cfg.sun.dayIntensity, cfg.sun.nightIntensity, nightFactor)
  moon.intensity = THREE.MathUtils.lerp(cfg.moon.dayIntensity, cfg.moon.nightIntensity, nightFactor)
  hemi.intensity = THREE.MathUtils.lerp(cfg.hemisphere.dayIntensity, cfg.hemisphere.nightIntensity, nightFactor)
  fill.intensity = THREE.MathUtils.lerp(cfg.fill.dayIntensity, cfg.fill.nightIntensity, nightFactor)
  renderer.toneMappingExposure = THREE.MathUtils.lerp(cfg.exposure.day, cfg.exposure.night, nightFactor)

  const nextCaster = nightFactor > 0.35 ? 'moon' : 'sun'
  if (nextCaster !== _shadowCaster) {
    _shadowCaster = nextCaster
    sun.castShadow = _shadowCaster === 'sun'
    moon.castShadow = _shadowCaster === 'moon'
  }
}
// 优先加载存档，无存档时使用默认地图配置
const INITIAL_CAMPFIRE_POSITION = { x: 0, z: 50 }
const INITIAL_PLAYER_POSITION = { x: 0, z: 40 }
const RELOCATED_SOUTH_CAMPFIRE_FROM = { x: 10, z: -18 }
const RELOCATED_SOUTH_CAMPFIRE_TO = { x: 19, z: -66 }

function isCastleApproachLayoutRock(rock) {
  if (!rock) return false
  const x = rock.x ?? 0
  const z = rock.z ?? 0
  return x >= -40 && x <= 100 && z >= -45 && z <= 45
}

function filterCastleApproachLayout(layout) {
  const campfires = (layout.campfires ?? []).map(fire => {
    const dx = (fire.x ?? 0) - RELOCATED_SOUTH_CAMPFIRE_FROM.x
    const dz = (fire.z ?? 0) - RELOCATED_SOUTH_CAMPFIRE_FROM.z
    if (Math.hypot(dx, dz) < 2) return { ...fire, ...RELOCATED_SOUTH_CAMPFIRE_TO }
    return fire
  })
  campfires[0] = { ...(campfires[0] ?? {}), ...INITIAL_CAMPFIRE_POSITION }

  return {
    ...layout,
    houses: [],
    rocks: (layout.rocks ?? []).filter(rock => !isCastleApproachLayoutRock(rock)),
    campfires,
  }
}

const _savedLayoutJson = localStorage.getItem('mapLayout')
const _layoutData = filterCastleApproachLayout(_savedLayoutJson ? JSON.parse(_savedLayoutJson) : defaultMap)
let _activeLayout = _layoutData
let resolveOutdoorStaticReady = null
const outdoorStaticReadyPromise = new Promise(resolve => {
  resolveOutdoorStaticReady = resolve
})
const { collidables, update: updateMap, getTerrainHeight } = createMap(scene, {
  onStaticModelReady: (model) => {
    resolveOutdoorStaticReady?.(model)
    const compile = () => {
      if (renderer.compileAsync) renderer.compileAsync(scene, gameCamera)
      else renderer.compile(scene, gameCamera)
    }
    if ('requestIdleCallback' in window) window.requestIdleCallback(compile, { timeout: 1200 })
    else window.setTimeout(compile, 0)
  },
})
applyLayoutToScene(scene, _layoutData)

// ── 创建玩家 ──────────────────────────────────────────
const player = createPlayer(scene)
player.setPosition(
  INITIAL_PLAYER_POSITION.x,
  INITIAL_PLAYER_POSITION.z,
  getTerrainHeight(INITIAL_PLAYER_POSITION.x, INITIAL_PLAYER_POSITION.z),
)
const playerCollidable = { x: INITIAL_PLAYER_POSITION.x, z: INITIAL_PLAYER_POSITION.z, r: 0.4 }
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

const AREA_TITLE_COOLDOWN_SECONDS = 90
const AREA_DEFS = {
  ruins: { name: '城外废墟' },
  forest: { name: '城外密林' },
  'lost-castle': { name: '失落城堡' },
}
let currentAreaId = null
const areaTitleShownAt = new Map()

function getOutdoorAreaId(position) {
  return position.z <= -20 ? 'forest' : 'ruins'
}

function setArea(areaId, { force = false } = {}) {
  const area = AREA_DEFS[areaId]
  if (!area) return
  if (!force && areaId === currentAreaId) return
  const now = performance.now() / 1000
  const lastShownAt = areaTitleShownAt.get(areaId) ?? -Infinity
  currentAreaId = areaId
  if (!force && now - lastShownAt < AREA_TITLE_COOLDOWN_SECONDS) return
  areaTitleShownAt.set(areaId, now)
  ui?.showAreaTitle?.(area.name)
}

function updateOutdoorAreaTitle(position) {
  setArea(getOutdoorAreaId(position))
}

// ── NPC ──────────────────────────────────────────────
const npcs = []
const getYawToCastleEntrance = (x, z) => Math.atan2(
  CASTLE_EXTERIOR.transitionTarget.x - x,
  CASTLE_EXTERIOR.transitionTarget.z - z
)
const spawnNpcs = [
  createFBXNPC(scene, {
    x: -2,
    z: 53,
    name: '异乡防毒面具男人',
    modelPath: npcF1Url,
    rotY: getYawToCastleEntrance(-2, 53),
    speed: 0,
    wanderRadius: 0,
    canWander: false,
    getTerrainHeight,
    dialogueLines: [
      '沿着旧路往城堡走，前方那道白雾就是入口。',
      '雾门前有守卫，别把他们当成路边的石像。',
      '先在旁边篝火休息，它会成为你的落脚点，也能把伤口养好。',
      '如果倒下，记住回到篝火再试，不要硬闯。',
    ],
  }),
  createFBXNPC(scene, {
    x: -1,
    z: 37,
    name: '蒙面女弓箭手',
    modelPath: npcF2Url,
    rotY: getYawToCastleEntrance(-1, 37),
    speed: 0,
    wanderRadius: 0,
    canWander: false,
    getTerrainHeight,
    dialogueLines: [
      '遇敌先用 Q 锁定目标，别让守卫绕到视线外。',
      '距离拉开时用火球，锁定后更容易命中。',
      '穿过雾门后继续找能上行或通往大厅深处的路，别只盯着正门。',
      '你要做的不是清空城堡，而是找到里面能继续前进的出口。',
    ],
  }),
]
npcs.push(...spawnNpcs)
const enemyModelUrls = {
  e1: enemyE1Url,
  e2: enemyE2Url,
  f1: npcF1Url,
}
let hostileNpcs = []
function spawnEnemyNpcs(addToCollision = false) {
  hostileNpcs = []
  enemyNpcConfigs.forEach((enemyConfig, index) => {
    const enemyNpc = createEnemyNpcFBX(scene, {
      x: enemyConfig.x,
      z: enemyConfig.z,
      rotY: enemyConfig.rotY,
      name: enemyConfig.name ?? `Enemy ${index + 1}`,
      modelPath: enemyModelUrls[enemyConfig.model] ?? enemyE1Url,
      getTerrainHeight,
      patrol: enemyConfig.patrol,
    })
    enemyNpc.isHostile = true
    hostileNpcs.push(enemyNpc)
    npcs.push(enemyNpc)
    if (addToCollision) collision.add(enemyNpc.collidable)
  })
}
spawnEnemyNpcs()

// ── 天空系统 ──────────────────────────────────────────
const sky = createSky(scene)

// ── 背包 ─────────────────────────────────────────────
const inventory = new InventorySystem()
const estusFlask = new EstusFlaskSystem(BALANCE.estusFlask)
const usableItems = ['estusFlask']
let currentUsableItemIndex = 0

function getCurrentUsableItemId() {
  return usableItems[currentUsableItemIndex] ?? 'estusFlask'
}

function getCurrentUsableItemCount() {
  if (getCurrentUsableItemId() === 'estusFlask') return estusFlask.charges
  return null
}

function getPlayerEquipmentState() {
  return {
    ...(player.getEquipmentState?.() ?? {}),
    item: getCurrentUsableItemId(),
    itemCount: getCurrentUsableItemCount(),
  }
}

function syncEstusFlaskToBag() {
  inventory.set(estusFlask.itemName, estusFlask.charges)
  ui?.updateBag(inventory.getAll())
  ui?.updateEquipmentState?.(getPlayerEquipmentState())
}

function useEstusFlask() {
  if (!estusFlask.tryUse(player)) return false
  syncEstusFlaskToBag()
  return true
}

function useCurrentItem() {
  if (getCurrentUsableItemId() === 'estusFlask') return useEstusFlask()
  return false
}

function updateEstusFlask(dt) {
  estusFlask.update(dt, player)
}

function refillEstusFlask() {
  estusFlask.refill()
  syncEstusFlaskToBag()
}

// ── 钓鱼 ──────────────────────────────────────────────
const fishingRod = createFishingRod(scene)
let _fishPhase = null   // 'casting' | 'waiting' | 'result'
let _fishTimer = 0

// ── 系统初始化 ────────────────────────────────────────
const input = new InputSystem()
const spells = new SpellSystem(scene)
const collision = new CollisionSystem(collidables, WORLD_HALF_SIZE, WORLD_HALF_SIZE)
collision.add(playerCollidable)
npcs.forEach(npc => collision.add(npc.collidable))
castle.outdoorColliders.forEach(collider => collision.add(collider))
// 记录"固定/动态碰撞体"结束位置，布局碰撞体从此之后追加
// 退出编辑器时截断这里并用新布局重填，保证新增对象也有碰撞
let _layoutCollidableIdx = collision.collidables.length
function _applyLayoutCollidables(layout) {
  collision.collidables.splice(_layoutCollidableIdx)
  layout.houses?.forEach(({ x, z }) => collision.add({ x, z, r: 2.2 }))
  layout.rocks?.forEach(({ x, z }) => collision.add({ x, z, r: 0.8 }))
  layout.trees?.forEach(({ x, z }) => collision.add({ x, z, r: 0.5 }))
  layout.campfires?.forEach(({ x, z }) => collision.add({ x, z, r: 0.6 }))
}
_applyLayoutCollidables(_layoutData)

// ── UI ───────────────────────────────────────────────
let ui = null
let zWasPressed = false
let fWasPressed = false

function cyclePlayerWeapon() {
  player.cycleWeapon?.()
  const state = getPlayerEquipmentState()
  ui?.updateEquipmentState?.(state)
  return state
}

function cycleUsableItem() {
  if (usableItems.length > 1) {
    currentUsableItemIndex = (currentUsableItemIndex + 1) % usableItems.length
  }
  const state = getPlayerEquipmentState()
  ui?.updateEquipmentState?.(state)
  return state
}

function updateWeaponCycleInput() {
  if (input.consumePressed?.('KeyZ')) {
    zWasPressed = input.isPressed('KeyZ')
    cyclePlayerWeapon()
    return
  }
  const zNow = input.isPressed('KeyZ')
  if (zNow && !zWasPressed) cyclePlayerWeapon()
  zWasPressed = zNow

  if (input.consumePressed?.('KeyF')) {
    fWasPressed = input.isPressed('KeyF')
    cycleUsableItem()
    return
  }
  const fNow = input.isPressed('KeyF')
  if (fNow && !fWasPressed) cycleUsableItem()
  fWasPressed = fNow
}

ui = createUI(app, {
  onCycleWeapon: cyclePlayerWeapon,
})
ui.updateEquipmentState?.(getPlayerEquipmentState())
syncEstusFlaskToBag()

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

  const _newLayout = filterCastleApproachLayout(JSON.parse(_exportedJson))
  _activeLayout = _newLayout

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
const _moveForward    = new THREE.Vector3()
const _moveRight      = new THREE.Vector3()
const _moveVec        = new THREE.Vector3()
const _tpMoveIntent   = { x: 0, z: 0 }
const _toLockTarget   = new THREE.Vector3()
const _toCandidate    = new THREE.Vector3()
const _meleeForward   = new THREE.Vector3()
const _toMeleeTarget  = new THREE.Vector3()
const _spellForward   = new THREE.Vector3()
let pendingFireballCast = null

const lockState = {
  targetNpc: null,
  maxDistance: BALANCE.combat.lock.maxDistance,
  releaseDistance: BALANCE.combat.lock.releaseDistance,
  uiRange: BALANCE.combat.lock.uiRange,
  qWasPressed: false,
}

const indoorCollision = new CollisionSystem(indoorCollidables, 3.6, 2.6)
let savedOutdoorPos = null
let _escWasPressed = false
let _hitstopTimer = 0
let castleTransition = null
let activeBonfire = null
let dismissedBonfire = null
let bonfireRestState = null
let deathState = null
let checkpoint = null
const BONFIRE_INTERACTION_RANGE = 2.7
const BONFIRE_SIT_SECONDS = 4.2
const BONFIRE_STAND_SECONDS = 2.2
const DEATH_FADE_DELAY = 0.65
const DEATH_FADE_OUT_SECONDS = 0.85
const DEATH_RESPAWN_HOLD_SECONDS = 0.35
const DEATH_FADE_IN_SECONDS = 0.8
const BONFIRE_RESPAWN_DISTANCE = 1.45

function requestHitstop(duration) {
  _hitstopTimer = Math.max(_hitstopTimer, Math.max(0, duration))
}

function makeCheckpointFromCampfire(fire, playerPos = null) {
  const fireX = fire?.x ?? 0
  const fireZ = fire?.z ?? 0
  let dx = (playerPos?.x ?? fireX) - fireX
  let dz = (playerPos?.z ?? fireZ) - fireZ
  const len = Math.hypot(dx, dz)
  if (len < 0.2) {
    dx = 0
    dz = 1
  } else {
    dx /= len
    dz /= len
  }
  const x = fireX + dx * BONFIRE_RESPAWN_DISTANCE
  const z = fireZ + dz * BONFIRE_RESPAWN_DISTANCE
  return {
    fireX,
    fireZ,
    x,
    z,
    y: getTerrainHeight(x, z),
    yaw: Math.atan2(fireX - x, fireZ - z),
  }
}

function getDefaultCheckpoint() {
  const fire = (_activeLayout.campfires ?? [])[0]
  return makeCheckpointFromCampfire(fire)
}

checkpoint = getDefaultCheckpoint()

function setCheckpointFromCampfire(fire) {
  checkpoint = makeCheckpointFromCampfire(fire, player.getPosition())
}

function isSameCampfire(a, b) {
  if (!a || !b) return false
  return Math.abs(a.x - b.x) < 0.01 && Math.abs(a.z - b.z) < 0.01
}

function getNearbyCampfire(playerPos, range = BONFIRE_INTERACTION_RANGE) {
  let nearest = null
  let minDist = range
  for (const fire of _activeLayout.campfires ?? []) {
    const dx = playerPos.x - fire.x
    const dz = playerPos.z - fire.z
    const dist = Math.sqrt(dx * dx + dz * dz)
    if (dist < minDist) {
      minDist = dist
      nearest = fire
    }
  }
  return nearest
}

function closeBonfireMenu(returnToOutdoor = true) {
  if (activeBonfire) dismissedBonfire = activeBonfire
  activeBonfire = null
  ui.hideBonfireMenu?.()
  if (returnToOutdoor) {
    bonfireRestState = null
    activeScene = 'outdoor'
    player.playIdle()
    thirdPerson.setEnabled(true)
  }
}

function resetHostileNpcs() {
  clearNpcCombatUi()
  clearLock()
  collision.collidables.splice(_layoutCollidableIdx)

  hostileNpcs.forEach(npc => {
    const idx = collision.collidables.indexOf(npc.collidable)
    if (idx !== -1) collision.collidables.splice(idx, 1)
    const npcIdx = npcs.indexOf(npc)
    if (npcIdx !== -1) npcs.splice(npcIdx, 1)
    npc.getGroup?.().removeFromParent()
  })

  spawnEnemyNpcs(true)
  _layoutCollidableIdx = collision.collidables.length
  _applyLayoutCollidables(_activeLayout)
}

function clearDeathRuntimeState() {
  pendingFireballCast = null
  spells.clear?.()
  clearLock()
  clearNpcCombatUi()
  ui.clearCombatOverlays?.()
  ui.hideEnterPrompt?.()
  ui.hideExitButton?.()
  ui.hideTalkButton?.()
  ui.hidePickButton?.()
  ui.hideFishButton?.()
  ui.hideActionPrompt?.()
  ui.hideBonfireMenu?.(false)
  ui.hideDialoguePanel?.()
  if (activeNpc) activeNpc.endTalk?.()
  activeNpc = null
  activeBonfire = null
  dismissedBonfire = null
  bonfireRestState = null
  _fishPhase = null
  _fishTimer = 0
  fishingRod.hide?.()
}

function beginPlayerDeath(sourceScene = activeScene) {
  if (deathState) return true
  deathState = {
    sourceScene,
    time: 0,
    movedToCheckpoint: false,
  }
  activeScene = 'player-dead'
  _hitstopTimer = 0
  clearDeathRuntimeState()
  ui.setTransitionUiVisible(false)
  ui.showDeathMessage?.()
  _editBtn.style.display = 'none'
  thirdPerson.setEnabled(false)
  player.playDeath?.()
  return true
}

function checkPlayerDeath(sourceScene = activeScene) {
  if (!player.isDead?.()) return false
  return beginPlayerDeath(sourceScene)
}

function movePlayerToCheckpointForRespawn() {
  const target = checkpoint ?? getDefaultCheckpoint()
  if (player.getGroup().parent !== scene) scene.add(player.getGroup())
  castle.resetExitDoor()
  ui.hideExitButton?.()
  ui.hideActionPrompt?.()
  const y = getTerrainHeight(target.x, target.z)
  player.setPosition(target.x, target.z, y)
  player.getGroup().rotation.y = target.yaw
  player.restoreFullHp?.()
  player.restoreFullMp?.()
  player.restoreFullStamina?.()
  refillEstusFlask()
  player.playIdle()
  playerCollidable.x = target.x
  playerCollidable.z = target.z
  resetHostileNpcs()
  thirdPerson.setCollisionObjects(scene.children)
  thirdPerson.syncToTarget(player.getPosition())
}

function finishPlayerRespawn() {
  deathState = null
  activeScene = 'outdoor'
  ui.hideDeathMessage?.()
  ui.setSceneFade(0)
  ui.setTransitionUiVisible(true)
  _editBtn.style.display = ''
  thirdPerson.setEnabled(true)
}

function updateOutdoorNpcs(dt) {
  npcs.forEach(npc => {
    if (npc.isAlive?.() || npc.shouldUpdateWhenDead?.()) npc.update(dt, player, collision)
  })
}

function updateDeathSceneRuntime(dt, sourceScene) {
  if (sourceScene === 'castle') {
    const elevatorMove = castle.update(dt, player.getPosition())
    if (elevatorMove?.elevatorDeltaY) {
      player.getGroup().position.y += elevatorMove.elevatorDeltaY
    }
    return
  }

  if (sourceScene === 'outdoor' || sourceScene === 'npc-talk' || sourceScene === 'fishing' || sourceScene === 'bonfire-rest') {
    updateMap(clock.elapsedTime)
    castle.updateOutdoor(dt)
    updateOutdoorNpcs(dt)
    return
  }

  if (sourceScene === 'indoor') {
    return
  }

  updateMap(clock.elapsedTime)
  castle.updateOutdoor(dt)
}

function renderDeathScene(sourceScene) {
  if (sourceScene === 'castle') {
    renderCastle(gameCamera, player.getPosition())
    return
  }

  if (sourceScene === 'indoor') {
    const ipos = player.getPosition()
    indoorCamera.position.copy(ipos).add(_indoorOffset)
    indoorCamera.lookAt(ipos)
    renderWithAO(indoorCamera, 'indoor', indoorScene)
    return
  }

  renderWithAO(gameCamera, sourceScene)
}

function updatePlayerDeath(dt) {
  const state = deathState
  if (!state) return
  state.time += dt
  player.updateAnimation(dt)

  if (!state.movedToCheckpoint) {
    updateDeathSceneRuntime(dt, state.sourceScene)
    const fade = THREE.MathUtils.clamp((state.time - DEATH_FADE_DELAY) / DEATH_FADE_OUT_SECONDS, 0, 1)
    ui.setSceneFade(fade)
    thirdPerson.update(dt, player.getPosition())
    renderDeathScene(state.sourceScene)

    if (state.time >= DEATH_FADE_DELAY + DEATH_FADE_OUT_SECONDS) {
      movePlayerToCheckpointForRespawn()
      state.movedToCheckpoint = true
      state.time = 0
    }
    return
  }

  const fadeInTime = Math.max(0, state.time - DEATH_RESPAWN_HOLD_SECONDS)
  const fade = 1 - THREE.MathUtils.clamp(fadeInTime / DEATH_FADE_IN_SECONDS, 0, 1)
  updateMap(clock.elapsedTime)
  castle.updateOutdoor(dt)
  ui.setSceneFade(fade)
  thirdPerson.update(dt, player.getPosition())
  ui.update(player, clock.elapsedTime)
  renderWithAO(gameCamera, 'outdoor')

  if (fadeInTime >= DEATH_FADE_IN_SECONDS) finishPlayerRespawn()
}

function showBonfireMenu(fire, options = {}) {
  activeBonfire = fire
  const menuPos = {
    x: fire.x,
    y: getTerrainHeight(fire.x, fire.z) + 1.0,
    z: fire.z,
  }
  ui.showBonfireMenu?.(menuPos, gameCamera, renderer, {
    onRest: () => {
      activeBonfire = fire
      setCheckpointFromCampfire(fire)
      player.restoreFullHp?.()
      player.restoreFullMp?.()
      player.restoreFullStamina?.()
      clearLock()
      input.consumeMovePressed?.()
      ui.hideBonfireMenu?.(false)
      player.faceToward(fire.x, fire.z)
      if (player.playBonfireRestReverse?.()) {
        bonfireRestState = { phase: 'sitting-down', startedAt: performance.now(), time: 0 }
        activeScene = 'bonfire-rest'
        thirdPerson.setEnabled(false)
      } else {
        activeScene = 'outdoor'
        thirdPerson.setEnabled(true)
        showBonfireMenu(fire, { restDisabled: true })
      }
    },
    onMemorize: () => {},
    onLeave: () => closeBonfireMenu(true),
  }, options)
}

function finishBonfireStandUp() {
  if (activeBonfire) dismissedBonfire = activeBonfire
  activeBonfire = null
  bonfireRestState = null
  ui.hideBonfireMenu?.()
  activeScene = 'outdoor'
  thirdPerson.setEnabled(true)
  player.playIdle()
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
  let best = null
  let bestScore = -Infinity
  npcs.forEach(npc => {
    if (!npc?.isHostile) return
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
  ui.setLockTarget?.(best ? best.getName() : 'OFF')
}

function validateLock(playerPos) {
  const npc = lockState.targetNpc
  if (!npc) return
  if (!npc.isHostile) { clearLock(); return }
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
  const hitInfo = player.consumeAttackHitWindow?.()
  if (!hitInfo) return

  player.getForwardXZ(_meleeForward)
  const playerPos = player.getPosition()
  const cfg = BALANCE.combat.melee
  const rangeMul = typeof hitInfo === 'object' ? (hitInfo.rangeMul ?? 1) : 1
  const damageMul = typeof hitInfo === 'object' ? (hitInfo.damageMul ?? 1) : 1
  const hitRange = cfg.hitRange * rangeMul
  const maxDistSq = hitRange * hitRange
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
  const damage = Math.round((player.getAtk?.() ?? BALANCE.player.atk) * damageMul)
  const hp = best.onHit ? best.onHit(damage) : best.takeDamage(damage)
  handleNpcHit(best, damage)
  if (hp <= 0) handleNpcDeath(best)
  requestHitstop(BALANCE.combat.hitstop.attackHit)
}

function updatePlayerSpellCasting(dt, playerPos) {
  if (pendingFireballCast) {
    pendingFireballCast.timer -= dt
    if (pendingFireballCast.timer <= 0) {
      const cfg = BALANCE.spells.fireball
      const origin = new THREE.Vector3(
        playerPos.x + pendingFireballCast.direction.x * cfg.spawnForward,
        playerPos.y + cfg.spawnHeight,
        playerPos.z + pendingFireballCast.direction.z * cfg.spawnForward,
      )
      spells.release('fireball', origin, pendingFireballCast.direction, pendingFireballCast.damage)
      pendingFireballCast = null
    }
  }

  if (pendingFireballCast) return

  const lockTarget = lockState.targetNpc
  if (lockTarget?.isAlive?.()) {
    _spellForward.subVectors(lockTarget.getPosition(), playerPos).setY(0)
  } else {
    player.getForwardXZ(_spellForward)
  }
  if (_spellForward.lengthSq() <= 0.0001) return
  _spellForward.normalize()

  if (!spells.consumeCastRequest('fireball', input)) return
  const cfg = BALANCE.spells.fireball
  const mpCost = cfg.mpCost ?? 0
  if ((player.getMp?.() ?? 0) < mpCost) return
  if (!spells.beginCast('fireball')) return
  if (!player.spendMp?.(mpCost)) return

  pendingFireballCast = {
    timer: 0.8,
    direction: _spellForward.clone(),
    damage: player.getAtk?.() ?? BALANCE.player.atk,
  }
  player.playThrowMagic?.()
  if (lockTarget?.isAlive?.()) {
    player.faceToward(lockTarget.getPosition().x, lockTarget.getPosition().z)
  }
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

    const head = npc.getHeadWorldPos()
    if (npc.isHostile) {
      const ratio = npc.getHpRatio ? npc.getHpRatio() : 1
      ui.showNpcHpBar?.(npc, { x: head.x, y: head.y + 0.35, z: head.z }, ratio, camera, renderer)
      npc.setLockVisualState?.(lockState.targetNpc === npc ? 'locked' : 'candidate')
    } else {
      ui.hideNpcHpBar?.(npc)
      npc.setLockVisualState?.('hidden')
    }
  })
}

function clearNpcCombatUi() {
  npcs.forEach(npc => {
    ui.hideNpcHpBar?.(npc)
    npc.setLockVisualState?.('hidden')
  })
}

function switchToCastleInterior() {
  savedOutdoorPos = player.getPosition().clone()
  _editBtn.style.display = 'none'
  castle.scene.add(player.getGroup())
  const spawn = CASTLE_ENTRY_TRANSITION.indoorSpawn
  player.setPosition(spawn.x, spawn.z, spawn.y)
  player.getGroup().rotation.y = CASTLE_ENTRY_TRANSITION.indoorYaw
  castle.update(0, player.getPosition())
  thirdPerson.setCollisionObjects(castle.scene.children)
  thirdPerson.yaw = 0
  thirdPerson.syncToTarget(player.getPosition())
}

function enterCastle() {
  if (castleTransition) return
  activeScene = 'castle-transition'
  castleTransition = { time: 0, switched: false }
  _editBtn.style.display = 'none'
  clearLock()
  ui.setTransitionUiVisible(false)
  thirdPerson.setEnabled(false)
  player.faceToward(CASTLE_EXTERIOR.transitionTarget.x, CASTLE_EXTERIOR.transitionTarget.z)
  player.playWalk()
}

function exitCastle() {
  activeScene = 'outdoor'
  _editBtn.style.display = ''
  ui.hideExitButton()
  ui.hideActionPrompt?.()
  scene.add(player.getGroup())
  const exitY = getTerrainHeight(castle.exitSpawn.x, castle.exitSpawn.z)
  player.setPosition(castle.exitSpawn.x, castle.exitSpawn.z, exitY)
  castle.resetExitDoor()
  thirdPerson.setCollisionObjects(scene.children)
  thirdPerson.syncToTarget(player.getPosition())
}

function exitCastleFromTerrace(castlePosition) {
  activeScene = 'outdoor'
  _editBtn.style.display = ''
  ui.hideExitButton()
  ui.hideActionPrompt?.()
  scene.add(player.getGroup())
  const worldX = CASTLE_EXTERIOR.origin.x + castlePosition.x
  const worldZ = CASTLE_EXTERIOR.origin.z + Math.max(castlePosition.z, 16.8)
  player.setPosition(worldX, worldZ, getTerrainHeight(worldX, worldZ))
  castle.resetExitDoor()
  thirdPerson.setCollisionObjects(scene.children)
  thirdPerson.syncToTarget(player.getPosition())
}

function updateCastleTransition(dt) {
  const state = castleTransition
  if (!state) return
  state.time += dt
  const cfg = CASTLE_ENTRY_TRANSITION

  if (!state.switched) {
    const pos = player.getPosition()
    const target = CASTLE_EXTERIOR.transitionTarget
    const t = Math.min(1, dt * 1.8)
    pos.x = THREE.MathUtils.lerp(pos.x, target.x, t)
    pos.z = THREE.MathUtils.lerp(pos.z, target.z, t)
    player.faceToward(target.x, target.z)
    player.updateAnimation(dt)
    thirdPerson.update(dt, pos)
    if (state.time >= cfg.switchAt) {
      state.switched = true
      switchToCastleInterior()
    }
  } else {
    const pos = player.getPosition()
    const target = cfg.indoorWalkTarget
    const t = Math.min(1, dt * 2.2)
    pos.x = THREE.MathUtils.lerp(pos.x, target.x, t)
    pos.z = THREE.MathUtils.lerp(pos.z, target.z, t)
    player.faceToward(target.x, target.z)
    player.updateAnimation(dt)
    castle.update(dt, pos)
    thirdPerson.update(dt, pos)
  }

  const fade = state.time < cfg.fadeOutStart
    ? 0
    : state.time < cfg.switchAt
      ? (state.time - cfg.fadeOutStart) / (cfg.switchAt - cfg.fadeOutStart)
      : state.time < cfg.fadeInEnd
        ? 1 - (state.time - cfg.switchAt) / (cfg.fadeInEnd - cfg.switchAt)
        : 0
  ui.setSceneFade(fade)

  renderWithAO(gameCamera, state.switched ? 'castle' : 'outdoor', state.switched ? castle.scene : scene)
  if (state.time >= cfg.completeAt) {
    activeScene = 'castle'
    castleTransition = null
    player.playIdle()
    ui.setSceneFade(0)
    ui.setTransitionUiVisible(true)
    thirdPerson.setEnabled(true)
    setArea('lost-castle')
  }
}

function gameLoop() {
  requestAnimationFrame(gameLoop)
  const rawDt = Math.min(clock.getDelta(), 0.05)
  if (_hitstopTimer > 0) _hitstopTimer = Math.max(0, _hitstopTimer - rawDt)
  const dt = _hitstopTimer > 0 ? 0 : rawDt

  if (activeScene === 'player-dead') {
    updatePlayerDeath(rawDt)
    return
  }

  if (activeScene === 'castle-transition') {
    updateCastleTransition(rawDt)
    return
  }

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
    updateWeaponCycleInput()
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
    updateWeaponCycleInput()
    if (input.consumePressed?.('KeyR')) useCurrentItem()
    clearNpcCombatUi()
    clearLock()
    lockState.qWasPressed = input.isPressed('KeyQ')
    player.setInWater(false)

    const elevatorMove = castle.update(dt, player.getPosition())
    if (elevatorMove?.elevatorDeltaY) {
      player.getGroup().position.y += elevatorMove.elevatorDeltaY
    }
    const moveIntent = getThirdPersonMoveIntent(input)
    player.update(dt, input, castle.collision, () => 0, playerCollidable, moveIntent)
    if (checkPlayerDeath('castle')) return
    castle.update(0, player.getPosition())
    updateEstusFlask(dt)

    const castlePos = player.getPosition()
    if (castle.isTerraceFallExit(castlePos)) {
      exitCastleFromTerrace(castlePos)
      return
    }
    playerCollidable.x = castlePos.x
    playerCollidable.z = castlePos.z
    thirdPerson.update(dt, castlePos)

    if (castle.isNearExit(castlePos)) {
      ui.showExitButton(() => castle.openExitDoor(), '离开城堡 🚪', castlePos, gameCamera, renderer)
    }
    else ui.hideExitButton()
    const castleAction = castle.getNearbyAction?.(castlePos)
    if (castleAction) {
      ui.showActionPrompt(
        castleAction.position,
        gameCamera,
        renderer,
        () => {
          if (castleAction.type === 'roof-exit') exitCastleFromTerrace(castlePos)
          else castleAction.execute?.()
        },
        castleAction.label,
      )
    } else {
      ui.hideActionPrompt?.()
    }
    if (castle.consumeExitRequest()) exitCastle()

    ui.update(player, 0)
    ui.clearCombatOverlays?.()
    const sunPhase = (clock.elapsedTime % 1800) / 1800 * Math.PI * 2
    updateDayNightLighting(sunPhase)
    sky.update(sunPhase, dt, false)
    renderCastle(gameCamera, castlePos)
    return
  }

  if (activeScene === 'npc-talk') {
    updateMap(clock.elapsedTime)
    player.updateAnimation(dt)
    updateOutdoorNpcs(dt)
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
    sky.update(sunPhaseNpc, dt, false)
    updateOutdoorAreaTitle(player.getPosition())

    renderWithAO(gameCamera, 'npc-talk')
    return
  }

  if (activeScene === 'fishing') {
    updateMap(clock.elapsedTime)
    updateOutdoorNpcs(dt)
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
    updateOutdoorAreaTitle(fpos)
    ui.update(player, sunPhase)
    updateNpcCombatUi(gameCamera)
    ui.updateCombatOverlay?.(dt, gameCamera, renderer)
    renderWithAO(gameCamera, 'fishing')
    return
  }

  if (activeScene === 'bonfire-rest') {
    updateMap(clock.elapsedTime)
    castle.updateOutdoor(dt)
    clearNpcCombatUi()
    clearLock()
    lockState.qWasPressed = input.isPressed('KeyQ')
    player.setInWater(false)
    player.updateAnimation(dt)

    const restPos = player.getPosition()
    playerCollidable.x = restPos.x
    playerCollidable.z = restPos.z
    updateOutdoorNpcs(dt)
    thirdPerson.update(dt, restPos)

    const sunPhaseRest = (clock.elapsedTime % 1800) / 1800 * Math.PI * 2
    updateDayNightLighting(sunPhaseRest)
    sky.update(sunPhaseRest, dt, false)
    updateOutdoorAreaTitle(restPos)
    ui.update(player, sunPhaseRest)
    ui.updateCombatOverlay?.(dt, gameCamera, renderer)

    if (bonfireRestState) {
      bonfireRestState.time = (performance.now() - bonfireRestState.startedAt) / 1000
      if (bonfireRestState.phase === 'sitting-down' && bonfireRestState.time >= BONFIRE_SIT_SECONDS) {
        bonfireRestState.phase = 'sitting'
        bonfireRestState.startedAt = performance.now()
        bonfireRestState.time = 0
      }
      const shouldStandUp = input.consumeMovePressed?.() || input.isMoving?.()
      if ((bonfireRestState.phase === 'sitting-down' || bonfireRestState.phase === 'sitting') && shouldStandUp && player.requestBonfireStandUp?.()) {
        bonfireRestState.phase = 'standing-up'
        bonfireRestState.startedAt = performance.now()
        bonfireRestState.time = 0
      }
      if (bonfireRestState.phase === 'standing-up' && bonfireRestState.time >= BONFIRE_STAND_SECONDS) {
        finishBonfireStandUp()
      }
    }
    if (player.isBonfireStandComplete?.()) {
      finishBonfireStandUp()
    }

    renderWithAO(gameCamera, 'bonfire-rest')
    return
  }

  // 更新地图（风动画）
  updateMap(clock.elapsedTime)
  castle.updateOutdoor(dt)

  // 更新玩家
  updateWeaponCycleInput()
  if (input.consumePressed?.('KeyR')) useCurrentItem()
  updateLockToggle(input, player.getPosition())
  validateLock(player.getPosition())
  const moveIntent = getThirdPersonMoveIntent(input)
  const lockFacingTarget = lockState.targetNpc?.isAlive?.() ? lockState.targetNpc.getPosition() : null
  const suppressRun = Boolean(lockFacingTarget)
  player.update(dt, input, collision, getTerrainHeight, playerCollidable, moveIntent, suppressRun, lockFacingTarget)

  const pos = player.getPosition()
  playerCollidable.x = pos.x
  playerCollidable.z = pos.z
  player.setInWater(false)
  updatePlayerSpellCasting(dt, pos)
  spells.update(dt, npcs, getTerrainHeight, handleNpcDeath, handleNpcHit)
  updateEstusFlask(dt)

  // 更新 NPC
  updateOutdoorNpcs(dt)
  if (checkPlayerDeath('outdoor')) return
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
  const nearBonfire = !nearCastle && !nearDoor ? getNearbyCampfire(pos) : null
  if (nearCastle) {
    ui.hideBonfireMenu?.()
    ui.showEnterPrompt(pos, gameCamera, renderer, enterCastle, '穿过白雾', true)
  } else if (nearDoor) {
    ui.hideBonfireMenu?.()
    ui.showEnterPrompt(pos, gameCamera, renderer, () => {
      activeScene = 'indoor'
      ui.hideEnterPrompt()
      ui.hideTalkButton()
      ui.hideBonfireMenu?.()
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

  if (nearBonfire) {
    const isDismissedFire = isSameCampfire(nearBonfire, dismissedBonfire)
    if (!isDismissedFire) {
      showBonfireMenu(nearBonfire)
    } else {
      ui.hideBonfireMenu?.()
    }
  } else {
    dismissedBonfire = null
    activeBonfire = null
    ui.hideBonfireMenu?.()
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
  ui.hidePickButton()
  ui.hideFishButton()

  if (nearNpc && !nearCastle && !nearDoor && !nearBonfire) {
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

      const dialogueLines = activeNpc.getDialogueLines?.() ?? ['你怎么还在这里']
      ui.showDialoguePanel(activeNpc.getName(), activeNpc.getColor(), () => {
        activeNpc.completeDialogue?.()
        exitDialogue()
      }, dialogueLines)
      ui.updateDialoguePanelPosition(activeNpc.getHeadWorldPos(), gameCamera, renderer)
      _escWasPressed = input.isPressed('Escape')
      activeScene = 'npc-talk'
    })
  } else {
    ui.hideTalkButton()
  }

  sky.update(sunPhase, dt, false)

  // 更新 UI
  updateOutdoorAreaTitle(pos)
  ui.update(player, sunPhase)
  updateNpcCombatUi(gameCamera)
  ui.updateCombatOverlay?.(dt, gameCamera, renderer)

  renderWithAO(gameCamera, 'outdoor')
}

async function prewarmSpawnLookSweep() {
  const turns = 2
  const totalFrames = 96
  const warmupCamera = new THREE.PerspectiveCamera(gameCamera.fov, gameCamera.aspect, gameCamera.near, gameCamera.far)
  const dir = new THREE.Vector3()
  const look = new THREE.Vector3()

  thirdPerson.syncToTarget(player.getPosition())
  warmupCamera.position.copy(gameCamera.position)
  gameCamera.getWorldDirection(dir)

  const flatLen = Math.hypot(dir.x, dir.z) || 1
  const startYaw = Math.atan2(dir.x, dir.z)
  const pitch = Math.atan2(dir.y, flatLen)

  for (let i = 0; i < totalFrames; i++) {
    const t = i / (totalFrames - 1)
    const yaw = startYaw + Math.PI * 2 * turns * t
    const cp = Math.cos(pitch)
    dir.set(Math.sin(yaw) * cp, Math.sin(pitch), Math.cos(yaw) * cp).normalize()
    look.copy(warmupCamera.position).add(dir)
    warmupCamera.lookAt(look)
    warmupCamera.updateMatrixWorld()
    loadingOverlay.textContent = `预渲染场景 ${Math.min(turns, Math.floor(t * turns) + 1)}/${turns}`
    renderWithAO(warmupCamera, 'outdoor')
    await new Promise(resolve => requestAnimationFrame(resolve))
  }
}

async function startGame() {
  await preloadModelsPromise
  loadingOverlay.textContent = '准备场景...'
  await Promise.resolve()
  await new Promise(resolve => requestAnimationFrame(resolve))
  await Promise.race([
    outdoorStaticReadyPromise,
    new Promise(resolve => window.setTimeout(resolve, 1500)),
  ])
  if (renderer.compileAsync) {
    await renderer.compileAsync(scene, gameCamera)
    await renderer.compileAsync(castle.scene, gameCamera)
  } else {
    renderer.compile(scene, gameCamera)
    renderer.compile(castle.scene, gameCamera)
  }
  await prewarmSpawnLookSweep()
  thirdPerson.syncToTarget(player.getPosition())
  loadingOverlay.remove()
  setArea(getOutdoorAreaId(player.getPosition()), { force: true })
  clock.getDelta()
  gameLoop()
}

startGame()

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
