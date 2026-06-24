import * as THREE from 'three'
import { createScene } from './scene/scene.js'
import { createMap, MINE_CAVE, isInsideMineCaveUndergroundPath, setTreeColorGrade } from './scene/map.js'
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
import {
  OUTDOOR_COLLISION_HALF_SIZE,
  OUTDOOR_MOUNTAIN_BOUNDS,
  MOUNTAIN_FALL_FLOOR_Y,
  MOUNTAIN_FALL_DEATH_Y,
} from './config/world.js'
import { CASTLE_INDOOR_LIGHTING, OUTDOOR_LIGHTING } from './config/lighting.js'
import { preloadRuntimeModels } from './systems/modelAssets.js'
import { preloadAudio, unlockAudio, warmupSfx, playSfx, startLoop, stopLoop, stopAllLoops } from './systems/audio.js'
import { createPickupAura } from './effects/pickupAura.js'
import { createHealAura } from './effects/healAura.js'
import { createBloodSplatter } from './effects/bloodSplatter.js'
import { ITEM_DEFS, PICKUP_DEFS } from './config/pickups.js'
import npcF1Url from './characters/npc/f1.fbx?url'
import npcF2Url from './characters/npc/f2.fbx?url'
import enemyE2Url from './characters/enemy/e2.fbx?url'

// ── 初始化渲染器 ──────────────────────────────────────
const app = document.getElementById('app')
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
const _pixelRatio = Math.min(window.devicePixelRatio, 1.25)
renderer.setPixelRatio(_pixelRatio)
const COMBAT_PIXEL_RATIO = Math.min(window.devicePixelRatio, 0.9)
let currentRenderPixelRatio = _pixelRatio
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
loadingOverlay.textContent = '准备启动资源 0%'
app.appendChild(loadingOverlay)

const preloadModelsPromise = preloadRuntimeModels(({ loaded, total }) => {
  const pct = total > 0 ? Math.round(loaded / total * 100) : 100
  loadingOverlay.textContent = `准备启动资源 ${pct}%`
})

// ── 搭建场景 ──────────────────────────────────────────
const { scene, camera: editorCamera } = createScene()
const { sun, moon, hemi, fill } = createLighting(scene)
const thirdPerson = new ThirdPersonCameraController(renderer.domElement)
const gameCamera = thirdPerson.camera
const castleVistaCamera = gameCamera.clone()
if (import.meta.env.DEV) window.__game = { scene, renderer, gameCamera, THREE, getTerrainHeight }
// TEMP(verify): 暴露给 headless 验证脚本——传送玩家、查询解析高度。验证后还原。
if (import.meta.env.DEV) window.__verify = { get player() { return player }, get thirdPerson() { return thirdPerson }, get getRawTerrainHeight() { return getRawTerrainHeight } }
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

// 固定晴朗白天（移除昼夜循环）：高而略偏的太阳，利于出影、贴近参考图蓝天白云
const SUN_PHASE_FIXED = 0.95

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

  // 把太阳方向与夜晚因子喂给远山 proxy，驱动其廉价光照与大气透视
  _proxySunDir.set(Math.cos(sunPhase) * 40, sunH, Math.sin(sunPhase * 0.6) * 25).normalize()
  setDistantTerrainSun?.(_proxySunDir, nightFactor)
}
const _proxySunDir = new THREE.Vector3()
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
const { collidables, update: updateMap, getTerrainHeight: getRawTerrainHeight, sampleRiver, getNearbyForestPackLabel, setDistantTerrainSun } = createMap(scene, {
  onStaticModelReady: (model) => {
    resolveOutdoorStaticReady?.(model)
  },
})

function isInsideOutdoorMountainBounds(x, z) {
  return x >= OUTDOOR_MOUNTAIN_BOUNDS.minX
    && x <= OUTDOOR_MOUNTAIN_BOUNDS.maxX
    && z >= OUTDOOR_MOUNTAIN_BOUNDS.minZ
    && z <= OUTDOOR_MOUNTAIN_BOUNDS.maxZ
}

function getTerrainHeight(x, z, playerY = null) {
  if (!isInsideOutdoorMountainBounds(x, z)) return MOUNTAIN_FALL_FLOOR_Y
  return getRawTerrainHeight(x, z, playerY)
}

function applyRiverCurrent(dt, riverSample) {
  if (!riverSample?.inWater || riverSample.flowSpeed <= 0) return
  const depthFactor = THREE.MathUtils.clamp(riverSample.depth / 1.4, 0.18, 1)
  const pushDistance = riverSample.flowSpeed * depthFactor * 0.38 * Math.min(Math.max(dt, 0), 0.05)
  if (pushDistance <= 0.0001) return
  const steps = Math.max(1, Math.ceil(pushDistance / 0.16))
  const stepX = riverSample.dirX * pushDistance / steps
  const stepZ = riverSample.dirZ * pushDistance / steps

  for (let i = 0; i < steps; i++) {
    const pos = player.getPosition()
    const nx = pos.x + stepX
    const nz = pos.z + stepZ
    const targetTerrainH = getTerrainHeight(nx, nz, pos.y)
    const heightDiff = targetTerrainH - pos.y
    const blocker = collision.getBlockingCollidable(nx, nz, 0.4, pos.y, playerCollidable)
    if (blocker || heightDiff > 0.55) return
    pos.x = nx
    pos.z = nz
  }
}

applyLayoutToScene(scene, _layoutData)

const PICKUP_RANGE = 2.2
const bloodSplatter = createBloodSplatter(scene)
const pickupStates = PICKUP_DEFS.map(def => {
  const scale = def.auraScale ?? 0.4
  const position = new THREE.Vector3(
    def.x,
    getTerrainHeight(def.x, def.z) + 0.55 * scale,
    def.z,
  )
  return {
    def,
    position,
    picked: false,
    fading: false,
    disposed: false,
    aura: createPickupAura(scene, position, {
      name: `PickupAura_${def.id}`,
      scale,
    }),
  }
})

function updatePickupAuras(dt, time) {
  pickupStates.forEach(state => {
    if (state.disposed) return
    state.aura.update(dt, time)
    if (state.fading && state.aura.isFadeComplete?.()) {
      state.aura.dispose()
      state.disposed = true
    }
  })
}

function updateBloodSplatter(dt) {
  bloodSplatter.update(dt)
}

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
let loadingLookSweep = null
let mineCaveClimb = null
let mineCaveInteractionRearmPending = false
const _mineCaveClimbPosition = new THREE.Vector3()
const LOADING_LOOK_SWEEP_TURNS = 2
const LOADING_LOOK_SWEEP_SECONDS = 3.0

function getMineCaveSurfaceY() {
  return getTerrainHeight(MINE_CAVE.surfaceExitX, MINE_CAVE.surfaceExitZ)
}

function getMineCaveClimbX() {
  return MINE_CAVE.x + MINE_CAVE.ladderPlayerOffsetX
}

function getMineCaveClimbZ() {
  return MINE_CAVE.z + MINE_CAVE.ladderVisualZ + MINE_CAVE.ladderPlayerOffsetZ
}

function getMineCaveClimbTop() {
  return new THREE.Vector3(getMineCaveClimbX(), MINE_CAVE.ladderTopY, getMineCaveClimbZ())
}

function getMineCaveClimbBottom() {
  return new THREE.Vector3(getMineCaveClimbX(), MINE_CAVE.ladderBottomY, getMineCaveClimbZ())
}

function isPlayerInMineCaveUnderground(playerPos) {
  return playerPos.y < -1.0 && isInsideMineCaveUndergroundPath(playerPos.x, playerPos.z)
}

function facePlayerTowardMineCaveLadder() {
  const climbX = getMineCaveClimbX()
  const climbZ = getMineCaveClimbZ()
  const ladderZ = MINE_CAVE.z + MINE_CAVE.ladderVisualZ
  player.faceToward(climbX, climbZ + (climbZ - ladderZ))
}

function getMineCaveInteraction(playerPos) {
  if (playerPos.y < -1.0) {
    const dx = playerPos.x - MINE_CAVE.bottomExitX
    const dz = playerPos.z - MINE_CAVE.bottomExitZ
    if (dx * dx + dz * dz <= MINE_CAVE.bottomInteractRange * MINE_CAVE.bottomInteractRange) {
      return {
        label: '抓住梯子 [E]',
        position: playerPos.clone().add(new THREE.Vector3(0, 1.3, 0)),
        action: exitMineCave,
      }
    }
    return null
  }

  const dx = playerPos.x - MINE_CAVE.x
  const dz = playerPos.z - MINE_CAVE.z
  if (dx * dx + dz * dz > MINE_CAVE.surfaceInteractRange * MINE_CAVE.surfaceInteractRange) return null
  return {
    label: '抓住梯子 [E]',
    position: playerPos.clone().add(new THREE.Vector3(0, 1.2, 0)),
    action: enterMineCave,
  }
}

function enterMineCave() {
  beginMineCaveClimb('down')
}

function exitMineCave() {
  beginMineCaveClimb('up')
}

function beginMineCaveClimb(direction) {
  if (mineCaveClimb) return
  clearLock()
  ui?.hideActionPrompt?.()
  ui?.hideEnterPrompt?.()
  ui?.hideBonfireMenu?.()
  ui?.hidePickButton?.()
  ui?.hideTalkButton?.()
  activeScene = 'mine-cave-climb'
  thirdPerson.setEnabled(true)
  player.setInWater(false)

  const top = getMineCaveClimbTop()
  const bottom = getMineCaveClimbBottom()
  const progress = direction === 'down' ? 1 : 0
  const start = new THREE.Vector3().lerpVectors(bottom, top, progress)
  player.setPosition(start.x, start.z, start.y)
  facePlayerTowardMineCaveLadder()
  if (!player.playClimb?.(direction)) player.playWalk()
  player.setClimbPlayback?.(0)
  mineCaveClimb = {
    progress,
    speed: 1 / Math.max(0.001, MINE_CAVE.climbDuration),
    bottom,
    top,
  }
  thirdPerson.syncToTarget(player.getPosition())
}

function finishMineCaveClimb(destination) {
  const state = mineCaveClimb
  if (!state) return
  mineCaveClimb = null
  mineCaveInteractionRearmPending = true
  activeScene = 'outdoor'
  player.stopClimb?.()
  const final = destination === 'bottom'
    ? getMineCaveClimbBottom()
    : new THREE.Vector3(MINE_CAVE.surfaceExitX, getMineCaveSurfaceY(), MINE_CAVE.surfaceExitZ)
  player.setPosition(final.x, final.z, final.y)
  const faceX = destination === 'bottom' ? MINE_CAVE.cavernX : MINE_CAVE.x
  const faceZ = destination === 'bottom' ? MINE_CAVE.cavernZ : MINE_CAVE.z
  player.faceToward(faceX, faceZ)
  player.playIdle()
  playerCollidable.x = final.x
  playerCollidable.z = final.z
  thirdPerson.setEnabled(true)
  thirdPerson.syncToTarget(player.getPosition())
}

function updateMineCaveInteractionRearm(input) {
  if (!mineCaveInteractionRearmPending) return
  if (input.isPressed('KeyE') || input.isPressed('up') || input.isPressed('down')) return
  input.consumePressed?.('KeyE')
  mineCaveInteractionRearmPending = false
}

function getMineCaveClimbInput(input) {
  const climbUp = input.isPressed('up')
  const climbDown = input.isPressed('down')
  if (climbUp === climbDown) return 0
  return climbUp ? 1 : -1
}

function updateMineCaveClimb(dt, input) {
  const state = mineCaveClimb
  if (!state) return
  const climbInput = getMineCaveClimbInput(input)
  state.progress = THREE.MathUtils.clamp(state.progress + climbInput * state.speed * dt, 0, 1)
  player.setClimbPlayback?.(climbInput)
  _mineCaveClimbPosition.lerpVectors(state.bottom, state.top, state.progress)
  player.setPosition(_mineCaveClimbPosition.x, _mineCaveClimbPosition.z, _mineCaveClimbPosition.y)
  facePlayerTowardMineCaveLadder()
  player.updateAnimation(dt)
  const pos = player.getPosition()
  playerCollidable.x = pos.x
  playerCollidable.z = pos.z
  thirdPerson.update(dt, pos)
  if (state.progress <= 0 && climbInput < 0) finishMineCaveClimb('bottom')
  if (state.progress >= 1 && climbInput > 0) finishMineCaveClimb('top')
}

const AREA_TITLE_COOLDOWN_SECONDS = 90
const AREA_DEFS = {
  ruins: { name: '城外废墟' },
  forest: { name: '密林' },
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
      modelPath: enemyModelUrls[enemyConfig.model] ?? enemyE2Url,
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
let mineCaveEnemyOcclusionActive = false

function setMineCaveEnemyOcclusion(active) {
  const next = Boolean(active)
  if (mineCaveEnemyOcclusionActive !== next) {
    mineCaveEnemyOcclusionActive = next
    if (next) {
      clearLock()
      clearNpcCombatUi()
    }
  }

  hostileNpcs.forEach((npc) => {
    npc.setPlayerOccluded?.(next)
    const group = npc.getGroup?.()
    if (group) group.visible = !next
  })
}

// ── 天空系统 ──────────────────────────────────────────
const sky = createSky(scene)

// ── 背包 ─────────────────────────────────────────────
const inventory = new InventorySystem()
const estusFlask = new EstusFlaskSystem(BALANCE.estusFlask)
const usableItems = ['estusFlask']
let currentUsableItemIndex = 0
let activeHealAura = null

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
  inventory.set('estusFlask', estusFlask.charges)
  ui?.updateBag(inventory.getAll(ITEM_DEFS))
  ui?.updateEquipmentState?.(getPlayerEquipmentState())
}

function updateInventoryToggleInput() {
  if (input.consumePressed?.('KeyT')) ui?.toggleBagPanel?.()
}

function syncInventoryToUi() {
  ui?.updateBag(inventory.getAll(ITEM_DEFS))
  ui?.updateEquipmentState?.(getPlayerEquipmentState())
}

function getNearbyPickup(playerPos) {
  let nearest = null
  let nearestDist = PICKUP_RANGE
  pickupStates.forEach(state => {
    if (state.picked) return
    const dx = playerPos.x - state.position.x
    const dz = playerPos.z - state.position.z
    const dist = Math.hypot(dx, dz)
    if (dist <= nearestDist) {
      nearest = state
      nearestDist = dist
    }
  })
  return nearest
}

function collectPickup(state) {
  if (!state || state.picked) return
  if (!player.playPick?.()) return
  state.picked = true
  state.fading = true
  state.aura.fadeOut?.(0.6)
  inventory.add(state.def.itemId, state.def.count ?? 1)
  syncInventoryToUi()
  ui?.hidePickButton?.()
  ui?.showPickupToast?.(ITEM_DEFS[state.def.itemId]?.name ?? state.def.itemId, 1500)
}

function updatePickupInteraction(nearbyPickup, blockedByOtherPrompt = false) {
  if (blockedByOtherPrompt || ui?.isBagOpen?.()) {
    ui?.hidePickButton?.()
    return
  }
  if (!nearbyPickup) {
    ui?.hidePickButton?.()
    return
  }
  const onPick = () => collectPickup(nearbyPickup)
  ui?.showPickButton?.(nearbyPickup.position, gameCamera, renderer, onPick, nearbyPickup.def.prompt ?? '拾取 [H]')
  if (input.consumePressed?.('KeyH')) onPick()
}

function clearHealAura() {
  activeHealAura?.dispose()
  activeHealAura = null
}

function startHealAura() {
  clearHealAura()
  activeHealAura = createHealAura(player.getGroup(), {
    duration: BALANCE.estusFlask.recoverDuration,
  })
}

function updateHealAura(dt, time) {
  if (!activeHealAura) return
  if (!activeHealAura.update(dt, time)) clearHealAura()
}

function useEstusFlask() {
  if (!estusFlask.canUse(player)) return false
  if (!player.playHeal?.()) return false
  if (!estusFlask.tryUse(player)) return false
  startHealAura()
  playSfx('heal', { volume: 0.78 })
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
const collision = new CollisionSystem(collidables, OUTDOOR_COLLISION_HALF_SIZE, OUTDOOR_COLLISION_HALF_SIZE)
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

if (import.meta.env.DEV) {
  globalThis.__MY_GAME_DEBUG__ = {
    scene,
    player,
    camera: gameCamera,
    thirdPerson,
    getTerrainHeight,
    sampleRiver,
    teleport(x, z, y = null) {
      const targetY = Number.isFinite(y) ? y : getTerrainHeight(x, z)
      player.setPosition(x, z, targetY)
      playerCollidable.x = x
      playerCollidable.z = z
      thirdPerson.syncToTarget(player.getPosition())
    },
    setCamera({ yaw = thirdPerson.yaw, pitch = thirdPerson.pitch, distance = thirdPerson.distance } = {}) {
      thirdPerson.yaw = yaw
      thirdPerson.pitch = THREE.MathUtils.clamp(pitch, thirdPerson.minPitch, thirdPerson.maxPitch)
      thirdPerson.distance = THREE.MathUtils.clamp(distance, thirdPerson.minDistance, thirdPerson.maxDistance)
      thirdPerson.syncToTarget(player.getPosition())
    },
    setTreeColorGrade,
  }
}

// ── UI ───────────────────────────────────────────────
let ui = null
let zWasPressed = false
let fWasPressed = false
const RUN_FOOTSTEP_LEAD_SECONDS = 0.15

function bindAudioUnlock() {
  const unlock = () => {
    unlockAudio()
    warmupSfx('fireMagic')
    window.removeEventListener('keydown', unlock, true)
    window.removeEventListener('pointerdown', unlock, true)
  }
  window.addEventListener('keydown', unlock, true)
  window.addEventListener('pointerdown', unlock, true)
}

function stopPlayerFootsteps() {
  stopLoop('walking')
  stopLoop('running')
}

function updatePlayerFootsteps() {
  const speed = player.getSpeed?.() ?? 0
  if (
    speed <= 0.05 ||
    player.isDead?.() ||
    player.isDying?.() ||
    player.isAttacking?.() ||
    player.isRolling?.() ||
    player.isThrowMagicPlaying?.() ||
    player.isHealing?.() ||
    player.isPicking?.() ||
    player.isInBlockReaction?.() ||
    player.isBonfireResting?.() ||
    player.isBonfireStandingUp?.()
  ) {
    stopPlayerFootsteps()
    return
  }

  const state = player.getLocomotionState?.()
  const runFootstepThreshold = Math.max(0, 1.0 - RUN_FOOTSTEP_LEAD_SECONDS)
  const shouldLeadRunFootstep = state === 'walk' && (player.getMoveHoldTime?.() ?? 0) >= runFootstepThreshold
  if (state === 'run' || shouldLeadRunFootstep) {
    stopLoop('walking')
    startLoop('running', { volume: 0.2448 })
    return
  }

  if (state === 'walk' || state === 'runToWalk' || player.isDefending?.()) {
    stopLoop('running')
    startLoop('walking', { volume: player.isDefending?.() ? 0.18 : 0.28 })
    return
  }

  stopPlayerFootsteps()
}

preloadAudio()
bindAudioUnlock()

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

function setEditorButtonVisible(_visible) {}

function enterEditor() {
  player.getGroup().visible = false
  activeScene = 'editor'
  thirdPerson.setEnabled(false)
  setEditorButtonVisible(false)
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
  setEditorButtonVisible(true)
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
const _bloodDirection = new THREE.Vector3()
const _spellForward   = new THREE.Vector3()
let pendingFireballCast = null
let lastProcessedAttackHitEventId = 0
let lastProcessedSwordAirCueEventId = 0
let lastSwordAirPlayedStepId = 0

const lockState = {
  targetNpc: null,
  maxDistance: BALANCE.combat.lock.maxDistance,
  releaseDistance: BALANCE.combat.lock.releaseDistance,
  uiRange: BALANCE.combat.lock.uiRange,
  qWasPressed: false,
}
const CLOSE_LOCK_FACE_DISTANCE = 5
const CLOSE_LOCK_FACE_DISTANCE_SQ = CLOSE_LOCK_FACE_DISTANCE * CLOSE_LOCK_FACE_DISTANCE
const COMBAT_PERF_LOCK_DISTANCE = 14
const COMBAT_PERF_NEAR_ENEMY_DISTANCE = 10
const COMBAT_PERF_EXIT_DELAY = 1.5
const COMBAT_NPC_ANIMATION_DISTANCE = 18
let combatPerfActive = false
let combatPerfExitTimer = 0

const indoorCollision = new CollisionSystem(indoorCollidables, 3.6, 2.6)
let savedOutdoorPos = null
let _escWasPressed = false
let _hitstopTimer = 0
let castleTransition = null
let activeBonfire = null
let dismissedBonfire = null
let bonfireRestState = null
let deathState = null
let deathSfxPlayed = false
let checkpoint = null
const BONFIRE_INTERACTION_RANGE = 2.7
const BONFIRE_SIT_SECONDS = 4.2
const BONFIRE_STAND_SECONDS = 2.2
const DEATH_FADE_DELAY = 0.65
const DEATH_FADE_OUT_SECONDS = 0.85
const DEATH_RESPAWN_HOLD_SECONDS = 2.35
const DEATH_FADE_IN_SECONDS = 0.8
const DEATH_MESSAGE_DELAY_SECONDS = 0.25
const BONFIRE_RESPAWN_DISTANCE = 1.45

function requestHitstop(duration) {
  _hitstopTimer = Math.max(_hitstopTimer, Math.max(0, duration))
}

function playDeathSfxOnce() {
  if (deathSfxPlayed) return false
  deathSfxPlayed = true
  stopAllLoops()
  playSfx('death', { volume: 0.9 })
  return true
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
    npc.dispose?.()
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
    messageShown: false,
  }
  activeScene = 'player-dead'
  _hitstopTimer = 0
  clearDeathRuntimeState()
  clearHealAura()
  ui.setTransitionUiVisible(false)
  ui.update(player, clock.elapsedTime, gameCamera)
  setEditorButtonVisible(false)
  thirdPerson.setEnabled(false)
  player.playDeath?.()
  return true
}

function checkPlayerDeath(sourceScene = activeScene) {
  if (!player.isDead?.()) return false
  return beginPlayerDeath(sourceScene)
}

function checkOutdoorFallDeath(pos) {
  if (deathState || player.isDying?.()) return false
  if (isInsideOutdoorMountainBounds(pos.x, pos.z) && pos.y > MOUNTAIN_FALL_DEATH_Y) return false
  if (pos.y > MOUNTAIN_FALL_DEATH_Y) return false
  player.takeDamage?.(player.getMaxHp?.() ?? 9999)
  return beginPlayerDeath('outdoor')
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
  setMineCaveEnemyOcclusion(false)
  thirdPerson.setCollisionObjects(scene.children)
  thirdPerson.syncToTarget(player.getPosition())
}

function finishPlayerRespawn() {
  deathState = null
  deathSfxPlayed = false
  activeScene = 'outdoor'
  ui.hideDeathMessage?.()
  ui.setSceneFade(0)
  ui.setTransitionUiVisible(true)
  setEditorButtonVisible(true)
  thirdPerson.setEnabled(true)
}

function setRenderPixelRatio(pixelRatio) {
  if (Math.abs(currentRenderPixelRatio - pixelRatio) < 0.001) return
  currentRenderPixelRatio = pixelRatio
  renderer.setPixelRatio(pixelRatio)
  renderer.setSize(window.innerWidth, window.innerHeight)
}

function setCombatPerfMode(active) {
  if (combatPerfActive === active) {
    return
  }
  combatPerfActive = active
  combatPerfExitTimer = 0
  if (active) {
    setRenderPixelRatio(COMBAT_PIXEL_RATIO)
    // Keep dynamic character shadows alive during combat; static shadow savings come from castShadow culling.
    renderer.shadowMap.autoUpdate = true
    renderer.shadowMap.needsUpdate = true
    return
  }
  setRenderPixelRatio(_pixelRatio)
  renderer.shadowMap.autoUpdate = true
  renderer.shadowMap.needsUpdate = true
}

function isNearCombat(playerPos) {
  if (isPlayerInMineCaveUnderground(playerPos)) return false
  const lockTarget = lockState.targetNpc
  if (lockTarget?.isAlive?.() && playerPos.distanceTo(lockTarget.getPosition()) <= COMBAT_PERF_LOCK_DISTANCE) return true
  return npcs.some(npc => {
    if (!npc?.isHostile) return false
    if (!npc.isAlive?.() || !npc.isAlive()) return false
    return playerPos.distanceTo(npc.getPosition()) <= COMBAT_PERF_NEAR_ENEMY_DISTANCE
  })
}

function updateCombatPerfMode(dt, playerPos) {
  if (isNearCombat(playerPos)) {
    combatPerfExitTimer = 0
    setCombatPerfMode(true)
    return
  }
  if (!combatPerfActive) return
  combatPerfExitTimer += Math.max(0, dt)
  if (combatPerfExitTimer >= COMBAT_PERF_EXIT_DELAY) setCombatPerfMode(false)
}

function shouldSkipNpcAnimation(npc, playerPos) {
  if (!combatPerfActive) return false
  if (npc === lockState.targetNpc) return false
  if (npc.shouldUpdateWhenDead?.()) return false
  if (!npc.getPosition) return false
  return playerPos.distanceTo(npc.getPosition()) > COMBAT_NPC_ANIMATION_DISTANCE
}

function updateOutdoorNpcs(dt) {
  const playerPos = player.getPosition()
  const playerOccluded = isPlayerInMineCaveUnderground(playerPos)
  npcs.forEach(npc => {
    if (npc.isAlive?.() || npc.shouldUpdateWhenDead?.()) {
      npc.update(dt, player, collision, {
        skipAnimation: shouldSkipNpcAnimation(npc, playerPos),
        playerOccluded: playerOccluded && npc.isHostile,
      })
    }
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
    updateMap(clock.elapsedTime, player.getPosition())
    castle.updateOutdoor(dt)
    updatePickupAuras(dt, clock.elapsedTime)
    updateOutdoorNpcs(dt)
    return
  }

  if (sourceScene === 'indoor') {
    return
  }

  updateMap(clock.elapsedTime, player.getPosition())
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

  if (!state.messageShown && state.time >= DEATH_MESSAGE_DELAY_SECONDS) {
    state.messageShown = true
    ui.showDeathMessage?.()
    playDeathSfxOnce()
  }

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
  updateMap(clock.elapsedTime, player.getPosition())
  castle.updateOutdoor(dt)
  ui.setSceneFade(fade)
  thirdPerson.update(dt, player.getPosition())
  ui.update(player, clock.elapsedTime, gameCamera)
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

function setLockTarget(npc) {
  lockState.targetNpc = npc ?? null
  ui.setLockTarget?.(npc ? npc.getName() : 'OFF')
}

function clearLock() {
  if (!lockState.targetNpc) return
  setLockTarget(null)
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

function getLockCandidates(playerPos) {
  const candidates = []
  npcs.forEach(npc => {
    if (!npc?.isHostile) return
    if (!npc.isAlive || !npc.isAlive()) return
    const d = playerPos.distanceTo(npc.getPosition())
    if (d > lockState.maxDistance) return
    if (!isNpcInView(npc, gameCamera)) return
    candidates.push({
      npc,
      score: scoreViewTarget(npc, playerPos, gameCamera),
    })
  })
  candidates.sort((a, b) => b.score - a.score)
  return candidates.map(candidate => candidate.npc)
}

function acquireViewLockTarget(playerPos) {
  const candidates = getLockCandidates(playerPos)
  setLockTarget(candidates[0] ?? null)
}

function cycleLockTarget(playerPos) {
  const candidates = getLockCandidates(playerPos)
  if (candidates.length <= 0) {
    setLockTarget(null)
    return
  }

  const currentIndex = candidates.indexOf(lockState.targetNpc)
  if (!lockState.targetNpc || currentIndex < 0) {
    setLockTarget(candidates[0])
    return
  }

  if (currentIndex >= candidates.length - 1) {
    clearLock()
    return
  }

  setLockTarget(candidates[currentIndex + 1])
}

function validateLock(playerPos) {
  const npc = lockState.targetNpc
  if (!npc) return
  if (!npc.isHostile) { clearLock(); return }
  if (!npc.isAlive || !npc.isAlive()) { acquireViewLockTarget(playerPos); return }
  if (playerPos.distanceTo(npc.getPosition()) > lockState.releaseDistance) clearLock()
}

function updateLockToggle(input, playerPos) {
  const qNow = input.isPressed('KeyQ')
  if (qNow && !lockState.qWasPressed) {
    cycleLockTarget(playerPos)
  }
  lockState.qWasPressed = qNow
}

function lerpAngle(a, b, t) {
  const d = THREE.MathUtils.euclideanModulo(b - a + Math.PI, Math.PI * 2) - Math.PI
  return a + d * t
}

function handleNpcDeath(npc) {
  npc.die?.()
  player.cancelEnemyHurtFrom?.(npc.getGroup?.())
  ui.hideNpcHpBar?.(npc)
  npc.setLockVisualState?.('hidden')
  const idx = collision.collidables.indexOf(npc.collidable)
  if (idx !== -1) collision.collidables.splice(idx, 1)
  if (activeNpc === npc) exitDialogue()
  if (lockState.targetNpc === npc) acquireViewLockTarget(player.getPosition())
}

function handleNpcHit(npc, damage) {
  ui.spawnDamageText?.(npc.getHeadWorldPos(), damage)
}

function spawnMeleeBloodSplatter(npc, intensity = 1) {
  const npcPos = npc.getPosition()
  const playerPos = player.getPosition()
  _bloodDirection.subVectors(playerPos, npcPos).setY(0)
  if (_bloodDirection.lengthSq() < 0.0001) {
    player.getForwardXZ(_bloodDirection)
    _bloodDirection.multiplyScalar(-1)
  }
  _bloodDirection.normalize()
  const hitRadius = npc.getHitRadius?.() ?? 0.42
  const surfaceOffset = THREE.MathUtils.clamp(hitRadius * 0.55, 0.18, 0.34)
  const hitY = npcPos.y + 0.95
  bloodSplatter.spawn(
    new THREE.Vector3(npcPos.x, hitY, npcPos.z).addScaledVector(_bloodDirection, surfaceOffset),
    _bloodDirection,
    intensity,
  )
}

function findPlayerMeleeTargets(rangeMul = 1) {
  player.getForwardXZ(_meleeForward)
  const playerPos = player.getPosition()
  const cfg = BALANCE.combat.melee
  const hitRange = cfg.hitRange * rangeMul
  const maxDistSq = hitRange * hitRange
  const cosHalf = Math.cos(THREE.MathUtils.degToRad(cfg.hitAngleDeg * 0.5))

  const getMeleeTargetDistSq = (npc) => {
    if (!npc?.isHostile) return null
    if (!npc.isAlive?.() || !npc.isAlive()) return null
    _toMeleeTarget.subVectors(npc.getPosition(), playerPos).setY(0)
    const distSq = _toMeleeTarget.lengthSq()
    if (distSq <= 0.0001 || distSq > maxDistSq) return null
    const invLen = 1 / Math.sqrt(distSq)
    const dot = (_toMeleeTarget.x * _meleeForward.x + _toMeleeTarget.z * _meleeForward.z) * invLen
    if (dot < cosHalf) return null
    return distSq
  }

  const targets = []

  const lockTarget = lockState.targetNpc
  const lockTargetDistSq = lockTarget ? getMeleeTargetDistSq(lockTarget) : null
  if (lockTargetDistSq !== null) {
    targets.push({ npc: lockTarget, distSq: lockTargetDistSq, priority: -1 })
  }

  npcs.forEach(npc => {
    if (npc === lockTarget) return
    const distSq = getMeleeTargetDistSq(npc)
    if (distSq === null) return
    targets.push({ npc, distSq, priority: 0 })
  })

  targets.sort((a, b) => a.priority - b.priority || a.distSq - b.distSq)
  return targets.map(target => target.npc)
}

function processSwordAirCue() {
  const cue = player.consumeSwordAirCue?.()
  if (!cue) return
  if (typeof cue === 'object' && cue.id !== undefined) {
    if (cue.id <= lastProcessedSwordAirCueEventId) return
    lastProcessedSwordAirCueEventId = cue.id
  }
  if (findPlayerMeleeTargets(typeof cue === 'object' ? (cue.rangeMul ?? 1) : 1).length > 0) return
  if (typeof cue === 'object' && cue.stepId !== undefined) lastSwordAirPlayedStepId = cue.stepId
  playSfx('swordAir', { volume: 0.7, startAt: 0.05 })
}

function processPlayerMeleeAttack() {
  const hitInfo = player.consumeAttackHitWindow?.()
  if (!hitInfo) return false
  if (typeof hitInfo === 'object' && hitInfo.id !== undefined) {
    if (hitInfo.id <= lastProcessedAttackHitEventId) return true
    lastProcessedAttackHitEventId = hitInfo.id
  }

  const rangeMul = typeof hitInfo === 'object' ? (hitInfo.rangeMul ?? 1) : 1
  const damageMul = typeof hitInfo === 'object' ? (hitInfo.damageMul ?? 1) : 1
  const targets = findPlayerMeleeTargets(rangeMul)
  const weaponId = player.getWeaponId?.()
  if (targets.length <= 0) {
    if (
      weaponId === 'sword' &&
      (typeof hitInfo !== 'object' || hitInfo.stepId === undefined || hitInfo.stepId !== lastSwordAirPlayedStepId)
    ) {
      playSfx('swordAir', { volume: 0.7, startAt: 0.05 })
    }
    return true
  }
  const damage = Math.round((player.getAtk?.() ?? BALANCE.player.atk) * damageMul)
  if (weaponId === 'hammer') playSfx('hammerHit', { volume: 0.58 })
  else if (weaponId === 'sword') playSfx('sword', { volume: 0.58, startAt: 0.14 })
  targets.forEach((npc) => {
    const hp = npc.onHit ? npc.onHit(damage) : npc.takeDamage(damage)
    handleNpcHit(npc, damage)
    spawnMeleeBloodSplatter(npc, weaponId === 'hammer' ? 1.25 : damageMul)
    if (hp <= 0) handleNpcDeath(npc)
  })
  requestHitstop(BALANCE.combat.hitstop.attackHit)
  return true
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
      if (spells.release('fireball', origin, pendingFireballCast.direction, pendingFireballCast.damage)) {
        playSfx('fireMagic', { volume: 0.45 })
      }
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
  const playerUnderground = isPlayerInMineCaveUnderground(playerPos)
  npcs.forEach(npc => {
    if (!npc.isAlive || !npc.isAlive()) {
      ui.hideNpcHpBar?.(npc)
      npc.setLockVisualState?.('hidden')
      return
    }
    if (playerUnderground && npc.isHostile) {
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
      npc.setLockVisualState?.(lockState.targetNpc === npc ? 'locked' : 'hidden', camera)
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
  setEditorButtonVisible(false)
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
  setEditorButtonVisible(false)
  clearLock()
  ui.setTransitionUiVisible(false)
  thirdPerson.setEnabled(false)
  player.faceToward(CASTLE_EXTERIOR.transitionTarget.x, CASTLE_EXTERIOR.transitionTarget.z)
  player.playWalk()
}

function exitCastle() {
  activeScene = 'outdoor'
  setEditorButtonVisible(true)
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
  setEditorButtonVisible(true)
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

function scheduleGameLoop() {
  let done = false
  const run = () => {
    if (done) return
    done = true
    gameLoop()
  }
  requestAnimationFrame(run)
  window.setTimeout(run, 50)
}

function gameLoop() {
  scheduleGameLoop()
  const rawDt = Math.min(clock.getDelta(), 0.05)
  if (_hitstopTimer > 0) _hitstopTimer = Math.max(0, _hitstopTimer - rawDt)
  const dt = _hitstopTimer > 0 ? 0 : rawDt

  if (updateLoadingLookSweep(rawDt)) return

  if (activeScene === 'player-dead') {
    setCombatPerfMode(false)
    stopPlayerFootsteps()
    updatePlayerDeath(rawDt)
    return
  }

  if (activeScene === 'castle-transition') {
    setCombatPerfMode(false)
    stopPlayerFootsteps()
    updateCastleTransition(rawDt)
    return
  }

  if (activeScene === 'mine-cave-climb') {
    setCombatPerfMode(false)
    stopPlayerFootsteps()
    updateMap(clock.elapsedTime, player.getPosition())
    castle.updateOutdoor(rawDt)
    updatePickupAuras(rawDt, clock.elapsedTime)
    clearNpcCombatUi()
    clearLock()
    lockState.qWasPressed = input.isPressed('KeyQ')
    player.setInWater(false)
    updateMineCaveClimb(rawDt, input)
    updateHealAura(rawDt, clock.elapsedTime)

    const climbPos = player.getPosition()
    setMineCaveEnemyOcclusion(isPlayerInMineCaveUnderground(climbPos))
    const sunPhaseClimb = SUN_PHASE_FIXED
    updateDayNightLighting(sunPhaseClimb)
    sky.update(sunPhaseClimb, rawDt, false)
    updateOutdoorAreaTitle(climbPos)
    ui.update(player, sunPhaseClimb, gameCamera)
    ui.updateCombatOverlay?.(rawDt, gameCamera, renderer)
    renderWithAO(gameCamera, 'outdoor')
    return
  }

  if (activeScene === 'editor') {
    setCombatPerfMode(false)
    stopPlayerFootsteps()
    _editor.update(dt)
    ui.clearCombatOverlays?.()
    clearNpcCombatUi()
    clearLock()
    lockState.qWasPressed = input.isPressed('KeyQ')
    renderWithAO(editorCamera, 'editor')
    return
  }

  if (activeScene === 'indoor') {
    setCombatPerfMode(false)
    updateInventoryToggleInput()
    updateWeaponCycleInput()
    player.update(dt, input, indoorCollision)
    updateHealAura(dt, clock.elapsedTime)
    updatePlayerFootsteps()
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
    setCombatPerfMode(false)
    updateInventoryToggleInput()
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
    updateHealAura(dt, clock.elapsedTime)
    updatePlayerFootsteps()
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

    ui.update(player, 0, gameCamera)
    ui.clearCombatOverlays?.()
    const sunPhase = SUN_PHASE_FIXED
    updateDayNightLighting(sunPhase)
    sky.update(sunPhase, dt, false)
    renderCastle(gameCamera, castlePos)
    return
  }

  if (activeScene === 'npc-talk') {
    setCombatPerfMode(false)
    stopPlayerFootsteps()
    updateMap(clock.elapsedTime, player.getPosition())
    player.updateAnimation(dt)
    updateHealAura(dt, clock.elapsedTime)
    updateOutdoorNpcs(dt)
    thirdPerson.update(dt, player.getPosition())
    updateNpcCombatUi(gameCamera)
    ui.updateCombatOverlay?.(dt, gameCamera, renderer)

    const escNow = input.isPressed('Escape')
    if (escNow && !_escWasPressed) exitDialogue()
    _escWasPressed = escNow
    lockState.qWasPressed = input.isPressed('KeyQ')
    if (activeNpc) ui.updateDialoguePanelPosition(activeNpc.getHeadWorldPos(), gameCamera, renderer)

    const sunPhaseNpc = SUN_PHASE_FIXED
    updateDayNightLighting(sunPhaseNpc)
    sky.update(sunPhaseNpc, dt, false)
    updateOutdoorAreaTitle(player.getPosition())

    renderWithAO(gameCamera, 'npc-talk')
    return
  }

  if (activeScene === 'fishing') {
    setCombatPerfMode(false)
    stopPlayerFootsteps()
    updateMap(clock.elapsedTime, player.getPosition())
    updatePickupAuras(dt, clock.elapsedTime)
    updateOutdoorNpcs(dt)
    player.updateAnimation(dt)
    updateHealAura(dt, clock.elapsedTime)
    lockState.qWasPressed = input.isPressed('KeyQ')

    fishingRod.update(dt, clock.elapsedTime, _fishPhase)

    const fpos = player.getPosition()
    thirdPerson.update(dt, fpos)

    const sunPhase = SUN_PHASE_FIXED
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
        if (caught) {
          inventory.add('fish')
          syncInventoryToUi()
        }
        ui.showFishResult(caught, () => {
          activeScene = 'outdoor'
          fishingRod.hide()
          ui.hideFishResult()
        })
      }
    }

    sky.update(sunPhase, dt, false)
    updateOutdoorAreaTitle(fpos)
    ui.update(player, sunPhase, gameCamera)
    updateNpcCombatUi(gameCamera)
    ui.updateCombatOverlay?.(dt, gameCamera, renderer)
    renderWithAO(gameCamera, 'fishing')
    return
  }

  if (activeScene === 'bonfire-rest') {
    setCombatPerfMode(false)
    stopPlayerFootsteps()
    updateMap(clock.elapsedTime, player.getPosition())
    castle.updateOutdoor(dt)
    updatePickupAuras(dt, clock.elapsedTime)
    clearNpcCombatUi()
    clearLock()
    lockState.qWasPressed = input.isPressed('KeyQ')
    player.setInWater(false)
    player.updateAnimation(dt)
    updateHealAura(dt, clock.elapsedTime)

    const restPos = player.getPosition()
    playerCollidable.x = restPos.x
    playerCollidable.z = restPos.z
    updateOutdoorNpcs(dt)
    thirdPerson.update(dt, restPos)

    const sunPhaseRest = SUN_PHASE_FIXED
    updateDayNightLighting(sunPhaseRest)
    sky.update(sunPhaseRest, dt, false)
    updateOutdoorAreaTitle(restPos)
    ui.update(player, sunPhaseRest, gameCamera)
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
  updateMap(clock.elapsedTime, player.getPosition())
  castle.updateOutdoor(dt)
  updatePickupAuras(dt, clock.elapsedTime)
  updateBloodSplatter(dt)

  // 更新玩家
  updateInventoryToggleInput()
  updateWeaponCycleInput()
  if (input.consumePressed?.('KeyR')) useCurrentItem()
  updateLockToggle(input, player.getPosition())
  validateLock(player.getPosition())
  const moveIntent = getThirdPersonMoveIntent(input)
  const preMoveRiver = sampleRiver?.(player.getPosition().x, player.getPosition().z)
  player.setInWater(Boolean(preMoveRiver?.inWater))
  player.update(dt, input, collision, getTerrainHeight, playerCollidable, moveIntent, false, null)
  updateHealAura(dt, clock.elapsedTime)
  updatePlayerFootsteps()

  const pos = player.getPosition()
  const riverSample = sampleRiver?.(pos.x, pos.z)
  applyRiverCurrent(dt, riverSample)
  const pushedPos = player.getPosition()
  const pushedRiverSample = sampleRiver?.(pushedPos.x, pushedPos.z)
  player.setInWater(Boolean(pushedRiverSample?.inWater))
  if (checkOutdoorFallDeath(pos)) return
  setMineCaveEnemyOcclusion(isPlayerInMineCaveUnderground(pos))
  updateCombatPerfMode(dt, pos)
  playerCollidable.x = pos.x
  playerCollidable.z = pos.z
  updatePlayerSpellCasting(dt, pos)
  spells.update(dt, npcs, getTerrainHeight, handleNpcDeath, handleNpcHit)
  updateEstusFlask(dt)
  processSwordAirCue()
  for (let i = 0; i < 4 && processPlayerMeleeAttack(); i += 1) {}

  // 更新 NPC
  updateOutdoorNpcs(dt)
  if (checkPlayerDeath('outdoor')) return
  for (let i = 0; i < 3 && player.consumeBlockImpact?.(); i += 1) {
    playSfx('shieldHit', { volume: 0.62 })
    requestHitstop(BALANCE.combat.hitstop.blockHit)
  }

  if (lockState.targetNpc && lockState.targetNpc.isAlive?.()) {
    const targetPos = lockState.targetNpc.getPosition()
    _toLockTarget.subVectors(targetPos, pos).setY(0)
    const lockDistSq = _toLockTarget.lengthSq()
    if (lockDistSq > 0.0001) {
      _toLockTarget.normalize()
      const camDirX = -_toLockTarget.x
      const camDirZ = -_toLockTarget.z
      const desiredYaw = Math.atan2(camDirX, camDirZ)
      thirdPerson.yaw = lerpAngle(thirdPerson.yaw, desiredYaw, Math.min(dt * 10, 1))
      if (
        lockDistSq <= CLOSE_LOCK_FACE_DISTANCE_SQ &&
        !player.isInBlockReaction?.() &&
        !player.isRolling?.()
      ) {
        player.faceToward(targetPos.x, targetPos.z)
      }
    }
  }

  thirdPerson.update(dt, pos)

  // 太阳绕场景旋转，60 分钟一循环
  const sunPhase = SUN_PHASE_FIXED
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
  updateMineCaveInteractionRearm(input)
  const castleDx = pos.x - castle.entrance.x
  const castleDz = pos.z - castle.entrance.z
  const distanceToCastle = Math.sqrt(castleDx * castleDx + castleDz * castleDz)
  const nearCastle = distanceToCastle < castle.entranceRange
  const nearDoor = interaction.getNearbyDoor(pos)
  const nearMineCave = !mineCaveInteractionRearmPending && !nearCastle && !nearDoor ? getMineCaveInteraction(pos) : null
  const nearBonfire = !nearCastle && !nearDoor && !nearMineCave ? getNearbyCampfire(pos) : null
  const suppressConversationPrompts = combatPerfActive
  if (nearCastle) {
    ui.hideActionPrompt?.()
    ui.hideBonfireMenu?.()
    ui.showEnterPrompt(pos, gameCamera, renderer, enterCastle, '穿过白雾', true)
  } else if (nearDoor) {
    ui.hideActionPrompt?.()
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
  } else if (nearMineCave) {
    ui.hideEnterPrompt()
    ui.hideBonfireMenu?.()
    ui.showActionPrompt(nearMineCave.position, gameCamera, renderer, nearMineCave.action, nearMineCave.label)
    if (input.consumePressed?.('KeyE')) nearMineCave.action()
  } else {
    ui.hideEnterPrompt()
    ui.hideActionPrompt?.()
  }

  if (suppressConversationPrompts) {
    activeBonfire = null
    ui.hideBonfireMenu?.()
  } else if (nearBonfire) {
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
  const nearbyPickup = getNearbyPickup(pos)
  updatePickupInteraction(nearbyPickup, Boolean(nearCastle || nearDoor || nearMineCave || nearBonfire))

  if (suppressConversationPrompts) {
    ui.hideTalkButton()
  } else if (nearbyPickup) {
    ui.hideTalkButton()
  } else if (nearNpc && !nearCastle && !nearDoor && !nearMineCave && !nearBonfire) {
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

  if (nearCastle || nearDoor || nearMineCave || nearBonfire || nearbyPickup || nearNpc || suppressConversationPrompts) {
    ui.hideObjectName?.()
  } else {
    const nearbyForestPack = getNearbyForestPackLabel?.(pos)
    if (nearbyForestPack) {
      ui.showObjectName?.(nearbyForestPack.position, gameCamera, renderer, nearbyForestPack.label)
    } else {
      ui.hideObjectName?.()
    }
  }

  sky.update(sunPhase, dt, false)

  // 更新 UI
  updateOutdoorAreaTitle(pos)
  ui.update(player, sunPhase, gameCamera)
  updateNpcCombatUi(gameCamera)
  ui.updateCombatOverlay?.(dt, gameCamera, renderer)

  renderWithAO(gameCamera, 'outdoor')
}

function waitForFrameOrTimeout(timeoutMs = 50) {
  return new Promise(resolve => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      resolve()
    }
    requestAnimationFrame(finish)
    window.setTimeout(finish, timeoutMs)
  })
}

function waitTimeout(timeoutMs) {
  return new Promise(resolve => window.setTimeout(resolve, timeoutMs))
}

function beginLoadingLookSweep() {
  const playerPos = player.getPosition()
  thirdPerson.syncToTarget(playerPos)
  loadingLookSweep = {
    startedAt: performance.now(),
    startYaw: thirdPerson.yaw,
    timeoutId: null,
  }
  loadingLookSweep.timeoutId = window.setTimeout(() => {
    if (loadingLookSweep) finishLoadingLookSweep()
  }, LOADING_LOOK_SWEEP_SECONDS * 1000 + 1000)
  loadingOverlay.textContent = `预渲染场景 1/${LOADING_LOOK_SWEEP_TURNS}`
}

function finishLoadingLookSweep() {
  if (loadingLookSweep?.timeoutId) window.clearTimeout(loadingLookSweep.timeoutId)
  loadingLookSweep = null
  thirdPerson.syncToTarget(player.getPosition())
  loadingOverlay.remove()
  setArea(getOutdoorAreaId(player.getPosition()), { force: true })
  clock.getDelta()
}

function updateLoadingLookSweep(dt) {
  if (!loadingLookSweep) return false
  const elapsed = (performance.now() - loadingLookSweep.startedAt) / 1000
  const t = Math.min(1, elapsed / LOADING_LOOK_SWEEP_SECONDS)
  thirdPerson.yaw = loadingLookSweep.startYaw + Math.PI * 2 * LOADING_LOOK_SWEEP_TURNS * t
  updateMap(clock.elapsedTime, player.getPosition())
  castle.updateOutdoor(dt)
  thirdPerson.update(dt, player.getPosition())
  const currentTurn = Math.min(LOADING_LOOK_SWEEP_TURNS, Math.floor(t * LOADING_LOOK_SWEEP_TURNS) + 1)
  loadingOverlay.textContent = `预渲染场景 ${currentTurn}/${LOADING_LOOK_SWEEP_TURNS}`
  renderWithAO(gameCamera, 'outdoor')
  if (t >= 1) finishLoadingLookSweep()
  return true
}

async function startGame() {
  await preloadModelsPromise
  loadingOverlay.textContent = '准备场景...'
  await Promise.resolve()
  await waitForFrameOrTimeout()
  await Promise.race([
    outdoorStaticReadyPromise,
    waitTimeout(1500),
  ])
  loadingOverlay.textContent = '预热法术...'
  spells.warmup(renderer, gameCamera)
  player.warmupThrowMagic?.()
  await waitForFrameOrTimeout()
  beginLoadingLookSweep()
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
  renderer.setPixelRatio(currentRenderPixelRatio)
  renderer.setSize(w, h)
})
