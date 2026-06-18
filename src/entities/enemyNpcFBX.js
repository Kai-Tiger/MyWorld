import * as THREE from 'three'
import { BALANCE } from '../config/balance.js'
import { cloneFBX, loadFBXClips } from '../systems/modelAssets.js'
import mainFbxUrl from '../characters/enemy/main.fbx?url'
import sitFbxUrl from '../characters/enemy/sit.fbx?url'
import standFbxUrl from '../characters/enemy/Stand.fbx?url'
import runFbxUrl from '../characters/enemy/run.fbx?url'
import walkFbxUrl from '../characters/enemy/walk.fbx?url'
import attackFbxUrl from '../characters/enemy/attack.fbx?url'
import hurtFbxUrl from '../characters/enemy/hurt.fbx?url'
import deathFbxUrl from '../characters/enemy/death.fbx?url'

const _toPlayer = new THREE.Vector2()
let _nextEnemyInstanceId = 1
const _activePursuerIds = new Set()
const AVOIDANCE_ANGLES = [
  THREE.MathUtils.degToRad(35),
  THREE.MathUtils.degToRad(70),
  THREE.MathUtils.degToRad(110),
]
const HIT_AGGRO_MEMORY_SECONDS = 6
const HIT_AGGRO_LEASH_BUFFER_SECONDS = 3
const ENEMY_MODEL_SCALE = 0.015

function getTrackTargetName(trackName) {
  const dot = trackName.lastIndexOf('.')
  if (dot <= 0) return null
  return trackName.slice(0, dot)
}

function getTrackPropertyName(trackName) {
  const dot = trackName.lastIndexOf('.')
  if (dot <= 0) return ''
  return trackName.slice(dot)
}

function normalizeRigNodeName(name) {
  return String(name)
    .replace(/[:|_\-\s]/g, '')
    .replace(/^mixamorig\d*/i, '')
    .toLowerCase()
}

function freezeRootXZ(clip) {
  const hipsPos = clip.tracks.find(t => /hips.*position/i.test(t.name))
  if (!hipsPos) return
  const baseX = hipsPos.values[0]
  const baseZ = hipsPos.values[2]
  for (let i = 0; i < hipsPos.values.length; i += 3) {
    hipsPos.values[i] = baseX
    hipsPos.values[i + 2] = baseZ
  }
}

export function createEnemyNpcFBX(scene, {
  x = 0,
  z = 0,
  rotY = 0,
  name = 'Enemy',
  modelPath = mainFbxUrl,
  getTerrainHeight = null,
  maxHp = BALANCE.npc.fbx.maxHp,
  triggerRange = BALANCE.combat.enemy.triggerRange,
  attackRange = BALANCE.combat.enemy.attackRange,
  disengageRange = BALANCE.combat.enemy.disengageRange,
  leashRadius = BALANCE.combat.enemy.leashRadius,
  returnSpeed = BALANCE.combat.enemy.returnSpeed,
  returnArriveDistance = BALANCE.combat.enemy.returnArriveDistance,
  moveSpeed = BALANCE.combat.enemy.moveSpeed,
  attackCooldown = BALANCE.combat.enemy.attackCooldown,
  attackDamage = BALANCE.combat.enemy.attackDamage,
  attackTimeScale = BALANCE.combat.enemy.attackTimeScale,
  attackWindows = BALANCE.combat.enemy.attackWindows,
  turnSpeed = BALANCE.combat.enemy.turnSpeed,
  attackTurnScale = BALANCE.combat.enemy.attackTurnScale,
  animFade = BALANCE.combat.enemy.animFade,
  alertDuration = BALANCE.combat.enemy.alertDuration,
  attackEndGrace = BALANCE.combat.enemy.attackEndGrace,
  patrol = null,
  patrolSpeed = 1.25,
  patrolArriveDistance = 0.45,
} = {}) {
  const instanceId = _nextEnemyInstanceId++
  const pursuitPhase = instanceId * 1.73
  let avoidanceSide = instanceId % 2 === 0 ? 1 : -1
  const homeX = x
  const homeZ = z
  const homeRotY = rotY
  const patrolPoints = Array.isArray(patrol)
    ? patrol
      .filter(point => Array.isArray(point) && point.length >= 2)
      .map(([px, pz]) => ({ x: px, z: pz }))
    : []
  const hasPatrol = patrolPoints.length >= 2
  let patrolTargetIndex = hasPatrol ? 1 : 0
  const group = new THREE.Group()
  group.position.set(x, 0, z)
  group.rotation.y = rotY
  scene.add(group)

  if (getTerrainHeight) group.position.y = getTerrainHeight(x, z)

  const lockRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.02, 8, 28),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x111111,
      emissiveIntensity: 0.15,
      roughness: 0.4,
      metalness: 0.0,
      transparent: true,
      opacity: 0.92,
    })
  )
  lockRing.rotation.x = Math.PI / 2
  lockRing.position.y = 0.03
  lockRing.visible = false
  group.add(lockRing)

  let lockVisualState = 'hidden'
  let lockPulseTime = 0
  function applyLockVisualState(state) {
    lockVisualState = state
    if (state === 'hidden') {
      lockRing.visible = false
      lockRing.scale.setScalar(1)
      return
    }
    lockRing.visible = true
    lockRing.scale.setScalar(1)
    const mat = lockRing.material
    if (state === 'locked') {
      mat.color.setHex(0xff4b4b)
      mat.emissive.setHex(0xff2a2a)
      mat.emissiveIntensity = 0.45
    } else {
      mat.color.setHex(0xffffff)
      mat.emissive.setHex(0x222222)
      mat.emissiveIntensity = 0.12
    }
  }

  const collidable = { x, z, r: 0.42 }
  const hitRadius = BALANCE.npc.fbx.hitRadius
  let hp = maxHp
  let alive = true
  let hitShakeTime = 0
  const HIT_SHAKE_DURATION = 0.22

  let mixer = null
  let rootModel = null
  let idleClip = null
  let sitClip = null
  let standClip = null
  let runClip = null
  let walkClip = null
  let attackClip = null
  let hurtClip = null
  let deathClip = null
  let idleAction = null
  let sitAction = null
  let standAction = null
  let runAction = null
  let walkAction = null
  let attackAction = null
  let hurtAction = null
  let deathAction = null
  let currentAction = null
  let rigNodeNameMap = null
  const retargetedClipCache = new WeakMap()

  let attackCdRemain = 0
  let pursuitTime = 0
  let blockedTime = 0
  let avoidanceLockTime = 0
  let attacking = false
  const normalizedAttackWindows = Array.isArray(attackWindows) ? attackWindows
    .map((w) => ({
      start: THREE.MathUtils.clamp(w?.start ?? 0, 0, 1),
      end: THREE.MathUtils.clamp(w?.end ?? 0, 0, 1),
      range: Math.max(0, w?.range ?? attackRange),
      angleDeg: THREE.MathUtils.clamp(w?.angleDeg ?? 100, 1, 180),
      damageMul: Math.max(0, w?.damageMul ?? 1),
    }))
    .filter((w) => w.end > w.start)
    : []
  let attackWindowDone = normalizedAttackWindows.map(() => false)
  let prevAttackNorm = 0
  let engaged = false
  let aggroByHit = false
  let aggroMemoryTimer = 0
  let alerting = false
  let alertTimer = 0
  let returningHome = false
  let _attackFinishGrace = 0
  let hurting = false
  let preHurtAction = null
  let hurtThresholdReached = false
  let hurtPending = false
  let dying = false
  let deathPending = false

  function endAttack() {
    if (dying) return
    attacking = false
    attackWindowDone.fill(false)
    prevAttackNorm = 0
    attackCdRemain = Math.max(attackCdRemain, attackCooldown)
    if (attackAction) attackAction.stop()
    if (currentAction === attackAction) currentAction = null
    if (engaged && !alerting && !hurting) playStandLoop()
  }

  function playDeathOnce() {
    if (!deathAction || dying) return false
    dying = true
    hurting = false
    preHurtAction = null
    alerting = false
    alertTimer = 0
    engaged = false
    aggroByHit = false
    aggroMemoryTimer = 0
    returningHome = false
    attacking = false
    attackCdRemain = 0
    if (hurtAction) hurtAction.stop()
    if (attackAction) attackAction.stop()
    if (runAction) runAction.stop()
    if (walkAction) walkAction.stop()
    if (standAction) standAction.stop()
    if (sitAction) sitAction.stop()
    if (idleAction) idleAction.stop()
    deathAction.paused = false
    deathAction.setLoop(THREE.LoopOnce, 1)
    deathAction.clampWhenFinished = true
    switchAction(deathAction, true)
    return true
  }

  function triggerDeath() {
    if (dying) return
    _activePursuerIds.delete(instanceId)
    hp = 0
    alive = false
    applyLockVisualState('hidden')
    if (!playDeathOnce()) deathPending = true
  }

  function stopCombatStateForReturn() {
    engaged = false
    aggroByHit = false
    aggroMemoryTimer = 0
    alerting = false
    alertTimer = 0
    attacking = false
    attackWindowDone.fill(false)
    prevAttackNorm = 0
    _attackFinishGrace = 0
    _activePursuerIds.delete(instanceId)
    if (attackAction) attackAction.stop()
    if (runAction) runAction.stop()
    if (standAction) standAction.stop()
    if (hurtAction) hurtAction.stop()
    hurting = false
    preHurtAction = null
  }

  function refreshHitAggroMemory() {
    const leashTravelTime = leashRadius / Math.max(0.001, moveSpeed)
    aggroMemoryTimer = Math.max(
      aggroMemoryTimer,
      HIT_AGGRO_MEMORY_SECONDS,
      leashTravelTime + HIT_AGGRO_LEASH_BUFFER_SECONDS,
    )
  }

  function aggroFromHit() {
    if (!alive || dying) return
    returningHome = false
    aggroByHit = false
    refreshHitAggroMemory()
    if (!engaged) {
      engaged = true
      alerting = true
      alertTimer = alertDuration
      if (!hurting) playAlertOnce()
    }
  }

  function aggroFromSight() {
    if (!alive || dying) return
    returningHome = false
    refreshHitAggroMemory()
    if (!engaged) {
      engaged = true
      alerting = true
      alertTimer = alertDuration
      if (!hurting) playAlertOnce()
    }
  }

  function resumeAfterHurt() {
    if (dying) return
    const resumeAction = preHurtAction
    preHurtAction = null
    hurting = false
    if (!alive) return

    if (!engaged) {
      if (hasPatrol) playWalkLoop()
      else setSeatedPose()
      return
    }

    if (resumeAction === attackAction && attackAction) {
      attacking = true
      _attackFinishGrace = attackEndGrace
      switchAction(attackAction, true)
      return
    }
    if (resumeAction === runAction) {
      playRunLoop()
      return
    }
    if (resumeAction === standAction) {
      playStandLoop()
      return
    }
    if (resumeAction === sitAction || resumeAction === idleAction) {
      if (alerting) playAlertOnce()
      else setSeatedPose()
      return
    }

    if (alerting) playAlertOnce()
    else playStandLoop()
  }

  function playHurtOnce() {
    if (!hurtAction || hurting || !alive || dying) return false
    preHurtAction = currentAction
    hurting = true
    if (attacking) endAttack()
    hurtAction.paused = false
    hurtAction.setLoop(THREE.LoopOnce, 1)
    hurtAction.clampWhenFinished = true
    switchAction(hurtAction, true)
    return true
  }

  function switchAction(next, reset = false) {
    if (!next || next === currentAction) return
    if (currentAction) currentAction.fadeOut(animFade)
    if (reset) next.reset()
    next.fadeIn(animFade).play()
    currentAction = next
  }

  function getRigNodeNameMap() {
    if (rigNodeNameMap) return rigNodeNameMap
    rigNodeNameMap = new Map()
    rootModel?.traverse((node) => {
      const key = normalizeRigNodeName(node.name)
      if (key && !rigNodeNameMap.has(key)) rigNodeNameMap.set(key, node.name)
    })
    return rigNodeNameMap
  }

  function retargetClipToModel(clip) {
    if (!clip || !rootModel) return clip
    if (retargetedClipCache.has(clip)) return retargetedClipCache.get(clip)
    const nodeMap = getRigNodeNameMap()
    const clone = clip.clone()
    clone.tracks.forEach((track) => {
      const targetName = getTrackTargetName(track.name)
      if (!targetName || rootModel.getObjectByName(targetName)) return
      const mappedName = nodeMap.get(normalizeRigNodeName(targetName))
      if (mappedName) track.name = `${mappedName}${getTrackPropertyName(track.name)}`
    })
    retargetedClipCache.set(clip, clone)
    return clone
  }

  function tryBuildActions() {
    if (!mixer) return
    if (idleClip && !idleAction) {
      idleClip = retargetClipToModel(idleClip)
      freezeRootXZ(idleClip)
      idleAction = mixer.clipAction(idleClip)
      idleAction.enabled = true
      if (!engaged && !alerting && !attacking && !hasPatrol) setSeatedPose()
    }
    if (sitClip && !sitAction) {
      sitClip = retargetClipToModel(sitClip)
      freezeRootXZ(sitClip)
      sitAction = mixer.clipAction(sitClip)
      sitAction.enabled = true
      sitAction.setLoop(THREE.LoopRepeat, Infinity)
      sitAction.clampWhenFinished = false
      if (!engaged && !alerting && !attacking && !hasPatrol) setSeatedPose()
    }
    if (standClip && !standAction) {
      standClip = retargetClipToModel(standClip)
      freezeRootXZ(standClip)
      standAction = mixer.clipAction(standClip)
      standAction.enabled = true
      standAction.setLoop(THREE.LoopRepeat, Infinity)
      standAction.clampWhenFinished = false
    }
    if (runClip && !runAction) {
      runClip = retargetClipToModel(runClip)
      freezeRootXZ(runClip)
      runAction = mixer.clipAction(runClip)
      runAction.timeScale = 1.15
    }
    if (walkClip && !walkAction) {
      walkClip = retargetClipToModel(walkClip)
      freezeRootXZ(walkClip)
      walkAction = mixer.clipAction(walkClip)
      walkAction.timeScale = 1.0
      if (!engaged && !alerting && !attacking && hasPatrol) playWalkLoop()
    }
    if (attackClip && !attackAction) {
      attackClip = retargetClipToModel(attackClip)
      freezeRootXZ(attackClip)
      attackAction = mixer.clipAction(attackClip)
      attackAction.setLoop(THREE.LoopOnce, 1)
      attackAction.clampWhenFinished = true
      attackAction.timeScale = attackTimeScale
    }
    if (hurtClip && !hurtAction) {
      hurtClip = retargetClipToModel(hurtClip)
      freezeRootXZ(hurtClip)
      hurtAction = mixer.clipAction(hurtClip)
      hurtAction.setLoop(THREE.LoopOnce, 1)
      hurtAction.clampWhenFinished = true
      hurtAction.timeScale = 1.0
      if (hurtPending) {
        hurtPending = false
        playHurtOnce()
      }
    }
    if (deathClip && !deathAction) {
      deathClip = retargetClipToModel(deathClip)
      freezeRootXZ(deathClip)
      deathAction = mixer.clipAction(deathClip)
      deathAction.setLoop(THREE.LoopOnce, 1)
      deathAction.clampWhenFinished = true
      deathAction.timeScale = 1.0
      if (deathPending) {
        deathPending = false
        playDeathOnce()
      }
    }
  }

  function playAttack() {
    if (!attackAction || attacking || dying) return
    attacking = true
    attackWindowDone.fill(false)
    prevAttackNorm = 0
    _attackFinishGrace = attackEndGrace
    switchAction(attackAction, true)
  }

  function playRunLoop() {
    if (!runAction || dying) return
    runAction.paused = false
    runAction.setLoop(THREE.LoopRepeat, Infinity)
    runAction.clampWhenFinished = false
    if (currentAction !== runAction) switchAction(runAction, true)
  }

  function playWalkLoop() {
    if (dying) return
    const action = walkAction ?? runAction
    if (!action) return
    action.paused = false
    action.setLoop(THREE.LoopRepeat, Infinity)
    action.clampWhenFinished = false
    if (action === runAction) action.timeScale = 0.62
    if (currentAction !== action) switchAction(action, true)
  }

  function playStandLoop() {
    if (dying) return
    if (!standAction) {
      playRunLoop()
      return
    }
    standAction.paused = false
    standAction.setLoop(THREE.LoopRepeat, Infinity)
    standAction.clampWhenFinished = false
    if (currentAction !== standAction) switchAction(standAction, true)
  }

  function setSeatedPose() {
    if (!idleAction && !sitAction) return
    if (dying) return
    hurting = false
    preHurtAction = null
    if (hurtAction) hurtAction.stop()
    if (standAction) standAction.stop()
    if (runAction) runAction.stop()
    if (walkAction) walkAction.stop()
    if (attackAction) attackAction.stop()

    if (sitAction) {
      sitAction.paused = false
      sitAction.enabled = true
      sitAction.setLoop(THREE.LoopRepeat, Infinity)
      sitAction.clampWhenFinished = false
      if (currentAction === sitAction) {
        if (!sitAction.isRunning()) sitAction.play()
      } else {
        switchAction(sitAction, true)
      }
      return
    }

    idleAction.stop()
    idleAction.paused = false
    idleAction.enabled = true
    idleAction.setLoop(THREE.LoopOnce, 1)
    idleAction.clampWhenFinished = true
    idleAction.reset()
    idleAction.play()
    idleAction.paused = true
    idleAction.time = 0
    currentAction = idleAction
    if (mixer) mixer.update(0)
  }

  function playAlertOnce() {
    if (!idleAction || dying) return
    idleAction.paused = false
    idleAction.setLoop(THREE.LoopOnce, 1)
    idleAction.clampWhenFinished = true
    if (currentAction === idleAction) {
      idleAction.reset()
      idleAction.play()
    } else {
      switchAction(idleAction, true)
    }
  }

  cloneFBX(modelPath).then((fbx) => {
    rootModel = fbx
    rootModel.scale.setScalar(ENEMY_MODEL_SCALE)
    const _lights = []
    rootModel.traverse(c => {
      if (c.isMesh) { c.castShadow = true; c.receiveShadow = true }
      if (c.isLight) _lights.push(c)
    })
    _lights.forEach(l => l.removeFromParent())
    group.add(rootModel)

    mixer = new THREE.AnimationMixer(rootModel)
    mixer.addEventListener('finished', (e) => {
      if (e.action === attackAction) {
        endAttack()
      }
      if (e.action === hurtAction) {
        resumeAfterHurt()
      }
    })

    if (fbx.animations.length > 0) idleClip = fbx.animations[0]
    tryBuildActions()
  }).catch((err) => {
    console.error(`Failed to load enemy model: ${modelPath}`, err)
  })

  loadFBXClips(sitFbxUrl).then((clips) => {
    if (clips.length > 0) sitClip = clips[0]
    tryBuildActions()
  })

  loadFBXClips(standFbxUrl).then((clips) => {
    if (clips.length > 0) standClip = clips[0]
    tryBuildActions()
  })

  loadFBXClips(runFbxUrl).then((clips) => {
    if (clips.length > 0) runClip = clips[0]
    tryBuildActions()
  })

  loadFBXClips(walkFbxUrl).then((clips) => {
    if (clips.length > 0) walkClip = clips[0]
    tryBuildActions()
  })

  loadFBXClips(attackFbxUrl).then((clips) => {
    if (clips.length > 0) attackClip = clips[0]
    tryBuildActions()
  })

  loadFBXClips(hurtFbxUrl).then((clips) => {
    if (clips.length > 0) hurtClip = clips[0]
    tryBuildActions()
  })

  loadFBXClips(deathFbxUrl).then((clips) => {
    if (clips.length > 0) deathClip = clips[0]
    tryBuildActions()
  })

  function getShakeYaw(dt) {
    if (hitShakeTime <= 0) return 0
    hitShakeTime = Math.max(0, hitShakeTime - dt)
    const t = 1 - hitShakeTime / HIT_SHAKE_DURATION
    const amp = 0.22 * (hitShakeTime / HIT_SHAKE_DURATION)
    return Math.sin(t * Math.PI * 6) * amp
  }

  function isPlayerInFront(toPlayerNormX, toPlayerNormZ) {
    const facingX = Math.sin(group.rotation.y)
    const facingZ = Math.cos(group.rotation.y)
    const dot = facingX * toPlayerNormX + facingZ * toPlayerNormZ
    return dot > 0
  }

  function rotateMoveDir(x, z, angle) {
    const c = Math.cos(angle)
    const s = Math.sin(angle)
    return { x: x * c - z * s, z: x * s + z * c }
  }

  function makeStepCandidate(dirX, dirZ, dt, collision, speedScale = 1, baseSpeed = moveSpeed) {
    const len = Math.hypot(dirX, dirZ)
    if (len <= 0.0001) return null
    const step = baseSpeed * dt * speedScale
    const nx = group.position.x + (dirX / len) * step
    const nz = group.position.z + (dirZ / len) * step
    if (collision.check(nx, nz, 0.32, group.position.y, collidable)) return null
    return { x: nx, z: nz, dirX: dirX / len, dirZ: dirZ / len }
  }

  function scoreStepCandidate(candidate, playerPos) {
    const dx = playerPos.x - candidate.x
    const dz = playerPos.z - candidate.z
    return dx * dx + dz * dz
  }

  function pickAvoidanceMove(baseX, baseZ, dt, collision, targetPos, baseSpeed = moveSpeed) {
    avoidanceLockTime = Math.max(0, avoidanceLockTime - dt)

    const direct = makeStepCandidate(baseX, baseZ, dt, collision, 1, baseSpeed)
    if (direct) {
      blockedTime = Math.max(0, blockedTime - dt * 2)
      return direct
    }

    blockedTime += dt
    if (blockedTime > 0.4 && avoidanceLockTime <= 0) {
      avoidanceSide *= -1
      avoidanceLockTime = 0.7
      blockedTime = 0.12
    }

    const blocker = collision.getBlockingCollidable?.(
      group.position.x + baseX * moveSpeed * dt,
      group.position.z + baseZ * moveSpeed * dt,
      0.32,
      group.position.y,
      collidable,
    )
    const candidates = []

    if (blocker?.r !== undefined) {
      const awayX = group.position.x - blocker.x
      const awayZ = group.position.z - blocker.z
      const awayLen = Math.hypot(awayX, awayZ)
      if (awayLen > 0.0001) {
        const tangentX = (-awayZ / awayLen) * avoidanceSide
        const tangentZ = (awayX / awayLen) * avoidanceSide
        candidates.push(
          { x: baseX * 0.35 + tangentX, z: baseZ * 0.35 + tangentZ, scale: 0.94 },
          { x: baseX * 0.25 - tangentX, z: baseZ * 0.25 - tangentZ, scale: 0.82 },
        )
      }
    }

    for (const angle of AVOIDANCE_ANGLES) {
      const preferred = rotateMoveDir(baseX, baseZ, angle * avoidanceSide)
      const opposite = rotateMoveDir(baseX, baseZ, -angle * avoidanceSide)
      candidates.push(
        { x: preferred.x, z: preferred.z, scale: angle > 1.4 ? 0.78 : 0.92 },
        { x: opposite.x, z: opposite.z, scale: angle > 1.4 ? 0.72 : 0.86 },
      )
    }

    let best = null
    let bestScore = Infinity
    for (const candidateDir of candidates) {
      const candidate = makeStepCandidate(candidateDir.x, candidateDir.z, dt, collision, candidateDir.scale, baseSpeed)
      if (!candidate) continue
      const score = scoreStepCandidate(candidate, targetPos)
      if (score < bestScore) {
        best = candidate
        bestScore = score
      }
    }

    if (best) return best

    const slideX = makeStepCandidate(baseX, 0, dt, collision, 0.65, baseSpeed)
    const slideZ = makeStepCandidate(0, baseZ, dt, collision, 0.65, baseSpeed)
    if (slideX && slideZ) return scoreStepCandidate(slideX, targetPos) < scoreStepCandidate(slideZ, targetPos) ? slideX : slideZ
    return slideX ?? slideZ
  }

  function distanceFromHome() {
    return Math.hypot(group.position.x - homeX, group.position.z - homeZ)
  }

  function startReturnHome() {
    if (dying || returningHome) return
    stopCombatStateForReturn()
    returningHome = true
    blockedTime = 0
    avoidanceLockTime = 0
    playWalkLoop()
  }

  function finishReturnHome() {
    returningHome = false
    group.position.x = homeX
    group.position.z = homeZ
    group.rotation.y = homeRotY
    collidable.x = homeX
    collidable.z = homeZ
    if (getTerrainHeight) group.position.y = getTerrainHeight(homeX, homeZ)
    if (hasPatrol) {
      patrolTargetIndex = 1
      playWalkLoop()
    } else {
      setSeatedPose()
    }
  }

  function updateReturnHome(dt, collision) {
    const dx = homeX - group.position.x
    const dz = homeZ - group.position.z
    const distHome = Math.hypot(dx, dz)
    if (distHome <= returnArriveDistance) {
      finishReturnHome()
      return
    }

    playWalkLoop()
    const target = { x: homeX, z: homeZ }
    const move = pickAvoidanceMove(dx / distHome, dz / distHome, dt, collision, target, returnSpeed)
    if (move) {
      group.position.x = move.x
      group.position.z = move.z
      const moveYaw = Math.atan2(move.dirX, move.dirZ)
      const moveTurn = THREE.MathUtils.euclideanModulo(moveYaw - group.rotation.y + Math.PI, Math.PI * 2) - Math.PI
      group.rotation.y += moveTurn * Math.min(1, dt * turnSpeed * 0.45)
    }
  }

  function updatePatrol(dt, collision) {
    if (!hasPatrol || hurting || attacking || alerting || dying) return
    const target = patrolPoints[patrolTargetIndex]
    if (!target) return
    const dx = target.x - group.position.x
    const dz = target.z - group.position.z
    const distTarget = Math.hypot(dx, dz)

    if (distTarget <= patrolArriveDistance) {
      patrolTargetIndex = (patrolTargetIndex + 1) % patrolPoints.length
      return
    }

    playWalkLoop()
    const move = pickAvoidanceMove(dx / distTarget, dz / distTarget, dt, collision, target, patrolSpeed)
    if (move) {
      group.position.x = move.x
      group.position.z = move.z
      const moveYaw = Math.atan2(move.dirX, move.dirZ)
      const moveTurn = THREE.MathUtils.euclideanModulo(moveYaw - group.rotation.y + Math.PI, Math.PI * 2) - Math.PI
      group.rotation.y += moveTurn * Math.min(1, dt * turnSpeed * 0.45)
    }
  }

  return {
    isHostile: true,

    update(dt, player, collision) {
      if (mixer) mixer.update(dt)
      if (!alive) return

      if (lockVisualState === 'locked') {
        lockPulseTime += dt
        lockRing.scale.setScalar(1 + Math.sin(lockPulseTime * 8.0) * 0.06)
      } else {
        lockRing.scale.setScalar(1)
      }

      const shakeYaw = getShakeYaw(dt)
      if (getTerrainHeight) group.position.y = getTerrainHeight(group.position.x, group.position.z)

      attackCdRemain = Math.max(0, attackCdRemain - dt)

      if (attacking && attackAction && !attackAction.isRunning()) {
        _attackFinishGrace -= dt
        if (_attackFinishGrace <= 0) {
          endAttack()
        }
      }

      const playerPos = player.getPosition()
      _toPlayer.set(playerPos.x - group.position.x, playerPos.z - group.position.z)
      const dist = _toPlayer.length()
      const hasToPlayerDir = dist > 0.0001
      const invDist = hasToPlayerDir ? 1 / dist : 0
      const toPlayerX = _toPlayer.x * invDist
      const toPlayerZ = _toPlayer.y * invDist

      if (attacking && attackAction && normalizedAttackWindows.length > 0) {
        const clip = attackAction.getClip?.()
        const duration = clip?.duration ?? 0
        if (duration > 0) {
          const norm = attackAction.time / duration
          const from = prevAttackNorm
          const to = norm
          const facingX = Math.sin(group.rotation.y)
          const facingZ = Math.cos(group.rotation.y)
          const dot = hasToPlayerDir ? facingX * toPlayerX + facingZ * toPlayerZ : -1

          for (let i = 0; i < normalizedAttackWindows.length; i++) {
            if (attackWindowDone[i]) continue
            const window = normalizedAttackWindows[i]
            const overlaps = to >= window.start && from <= window.end
            if (!overlaps) {
              if (to > window.end) attackWindowDone[i] = true
              continue
            }

            const cosHalf = Math.cos(THREE.MathUtils.degToRad(window.angleDeg * 0.5))
            if (dist <= window.range && dot >= cosHalf) {
              const damage = attackDamage * window.damageMul
              player.receiveEnemyAttack?.(damage)
            }
            attackWindowDone[i] = true
          }

          prevAttackNorm = norm
        }
      }

      const prevEngaged = engaged
      const inSightTrigger = hasToPlayerDir && dist <= triggerRange && isPlayerInFront(toPlayerX, toPlayerZ)
      if (aggroByHit) {
        aggroFromHit()
        aggroByHit = false
      } else {
        aggroMemoryTimer = Math.max(0, aggroMemoryTimer - dt)
      }
      if (returningHome && inSightTrigger) aggroFromSight()
      if (!returningHome && (inSightTrigger || aggroMemoryTimer > 0)) engaged = true
      if (engaged && aggroMemoryTimer <= 0 && distanceFromHome() > leashRadius) startReturnHome()
      if (returningHome) engaged = false
      if (dist > disengageRange && aggroMemoryTimer <= 0) {
        engaged = false
      }
      if (engaged && alive && !dying) _activePursuerIds.add(instanceId)
      else _activePursuerIds.delete(instanceId)

      if (!prevEngaged && engaged) {
        alerting = true
        alertTimer = alertDuration
        playAlertOnce()
      }

      if (prevEngaged && !engaged) {
        alerting = false
        alertTimer = 0
        if (attacking) endAttack()
        if (!returningHome && !hasPatrol) setSeatedPose()
      }

      if (returningHome) {
        updateReturnHome(dt, collision)
        collidable.x = group.position.x
        collidable.z = group.position.z
        return
      }

      if (engaged && hasToPlayerDir) {
        _toPlayer.normalize()
        const targetYaw = Math.atan2(_toPlayer.x, _toPlayer.y)
        const currentTurnSpeed = attacking ? turnSpeed * attackTurnScale : turnSpeed
        const t = Math.min(1, dt * currentTurnSpeed)
        const d = THREE.MathUtils.euclideanModulo(targetYaw - group.rotation.y + Math.PI, Math.PI * 2) - Math.PI
        group.rotation.y += d * t
      }
      group.rotation.y += shakeYaw

      if (!engaged) {
        updatePatrol(dt, collision)
      } else if (hurting) {
        // 受伤中：播放一次 hurt，不切换其他动作
      } else if (alerting) {
        alertTimer -= dt
        if (alertTimer <= 0) {
          alerting = false
          if (!attacking && dist > attackRange) playRunLoop()
        }
      } else if (dist <= attackRange) {
        if (!attacking) {
          if (attackCdRemain <= 0) playAttack()
          else playStandLoop()
        }
      } else {
        if (!attacking) {
          playRunLoop()
          pursuitTime += dt
          const pursuerCount = _activePursuerIds.size
          const weave = pursuerCount > 1
            ? Math.sin(pursuitTime * 3.15 + pursuitPhase) * THREE.MathUtils.clamp(0.22 + pursuerCount * 0.08, 0.28, 0.52)
            : 0
          const moveX = _toPlayer.x - _toPlayer.y * weave
          const moveZ = _toPlayer.y + _toPlayer.x * weave
          const moveLen = Math.hypot(moveX, moveZ) || 1
          const move = pickAvoidanceMove(moveX / moveLen, moveZ / moveLen, dt, collision, playerPos)
          if (move) {
            group.position.x = move.x
            group.position.z = move.z
            if (dist > attackRange + 0.8) {
              const moveYaw = Math.atan2(move.dirX, move.dirZ)
              const moveTurn = THREE.MathUtils.euclideanModulo(moveYaw - group.rotation.y + Math.PI, Math.PI * 2) - Math.PI
              group.rotation.y += moveTurn * Math.min(1, dt * turnSpeed * 0.55)
            }
          }
        }
      }

      collidable.x = group.position.x
      collidable.z = group.position.z
    },

    getPosition() { return group.position },
    getGroup() { return group },
    getName() { return name },
    getColor() { return 0xff5a5a },
    getHeadWorldPos() {
      const p = group.position
      return { x: p.x, y: p.y + 1.6, z: p.z }
    },

    getHp() { return hp },
    getMaxHp() { return maxHp },
    getHpRatio() { return maxHp > 0 ? hp / maxHp : 0 },
    isAlive() { return alive && hp > 0 },
    shouldUpdateWhenDead() { return dying },
    getHitRadius() { return hitRadius },

    takeDamage(amount) {
      hp = Math.max(0, hp - Math.max(0, amount))
      if (!hurtThresholdReached && hp > 0 && hp <= maxHp * 0.5) {
        hurtThresholdReached = true
        if (!playHurtOnce()) hurtPending = true
      }
      if (hp <= 0) {
        triggerDeath()
      }
      return hp
    },

    onHit(amount) {
      hitShakeTime = HIT_SHAKE_DURATION
      const nextHp = this.takeDamage(amount)
      if (nextHp > 0) aggroFromHit()
      return nextHp
    },

    aggroFromHit,

    die() {
      triggerDeath()
    },

    setLockVisualState(state) {
      if (!alive) {
        applyLockVisualState('hidden')
        return
      }
      applyLockVisualState(state)
    },

    startTalk() {},
    endTalk() {},

    collidable,
  }
}
