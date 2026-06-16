import * as THREE from 'three'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { BALANCE } from '../config/balance.js'
import standFbxUrl from '../characters/player/stand.fbx?url'
import walkFbxUrl from '../characters/player/walk.fbx?url'
import runFbxUrl from '../characters/player/run.fbx?url'
import attackFbxUrl from '../characters/player/attack.fbx?url'
import throwMagicFbxUrl from '../characters/player/throwMagic.fbx?url'
import defenseFbxUrl from '../characters/player/defense.fbx?url'
import hurtFbxUrl from '../characters/player/hurt.fbx?url'
import sitFbxUrl from '../characters/player/sit.fbx?url'
import hammerGlbUrl from '../weapons/hammer.glb?url'

function lerpAngle(a, b, t) {
  const d = THREE.MathUtils.euclideanModulo(b - a + Math.PI, Math.PI * 2) - Math.PI
  return a + d * t
}

function normalizeObjectName(name) {
  return String(name ?? '').replace(/[^a-z0-9]/gi, '').toLowerCase()
}

function findObjectByNormalizedName(root, names) {
  const targets = new Set(names.map(normalizeObjectName))
  let found = null
  root.traverse(obj => {
    if (!found && targets.has(normalizeObjectName(obj.name))) found = obj
  })
  return found
}

export function createPlayer(scene) {
  const SPEED = 5.0
  const BONFIRE_SIT_SECONDS = 4.2
  const BONFIRE_STAND_SECONDS = 2.2
  const BONFIRE_STAND_SKIP_SECONDS = 0.8

  const group = new THREE.Group()
  scene.add(group)

  let mixer = null
  let rootModel = null
  let idleClip = null
  let walkClip = null
  let runClip = null
  let attackClip = null
  let throwMagicClip = null
  let defenseClip = null
  let hurtClip = null
  let sitClip = null
  let idleAction = null
  let walkAction = null
  let runAction = null
  let attackAction = null
  let throwMagicAction = null
  let defenseAction = null
  let hurtAction = null
  let sitAction = null
  let currentAction = null
  let attacking = false
  let throwMagicPlaying = false
  let attackHitConsumed = false
  let attackHitPending = false
  let attackPrevNorm = 0
  let defending = false
  let hurting = false
  let bonfireResting = false
  let bonfireRestComplete = false
  let bonfireStandingUp = false
  let bonfireStandComplete = false
  let bonfireRestTimer = 0
  let bonfireStandTimer = 0
  let jWasPressed = false
  let locomotionState = 'idle'
  let forcedLocomotion = null
  let moveHoldTime = 0
  let runToWalkTimer = 0
  let runToWalkDriftRemain = 0
  let lastMoveDirX = 0
  let lastMoveDirZ = 1
  let runToWalkDuration = 0.24
  const RUN_TRIGGER_SECONDS = 1.0
  const RUN_TO_WALK_DRIFT_DISTANCE = 0.8
  const THROW_MAGIC_END_NORM = 0.88
  const _attackWindowCfg = BALANCE.combat.playerAttack?.hitWindow ?? { start: 0.30, end: 0.52 }
  const ATTACK_HIT_WINDOW_START = THREE.MathUtils.clamp(_attackWindowCfg.start ?? 0.30, 0, 1)
  const ATTACK_HIT_WINDOW_END = THREE.MathUtils.clamp(_attackWindowCfg.end ?? 0.52, ATTACK_HIT_WINDOW_START, 1)
  const BLOCK_SHAKE_DURATION = 0.1
  const BLOCK_SHAKE_AMPLITUDE = 0.08
  const BLOCK_RECOIL_DISTANCE = 0.24
  const BLOCK_RECOIL_SPEED = 2.8
  const HAMMER_SOCKET_OFFSET = new THREE.Vector3(0, -33, 0)
  const HAMMER_SOCKET_ROTATION = new THREE.Euler(0, Math.PI, 0)
  const HAMMER_MODEL_SCALE = 126
  let blockShakeTime = 0
  let blockRecoilRemain = 0
  let blockImpactCount = 0
  let weaponSocket = null
  let builtInSword = null
  const playerMeshes = []
  let hammerModel = null
  let hammerLoadStarted = false
  let weaponId = 'sword'

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

  function pickPrimaryClip(animations = []) {
    if (!animations.length) return null
    let best = null
    for (const clip of animations) {
      if (!clip || !clip.tracks || clip.tracks.length === 0) continue
      if (!best || clip.duration > best.duration) best = clip
    }
    return best || animations[0]
  }

  function completeBonfireRest() {
    if (!bonfireResting || !sitAction) return
    if (sitAction.time > 0.001 && bonfireRestTimer < BONFIRE_SIT_SECONDS + 0.1) return
    sitAction.time = 0
    sitAction.paused = true
    bonfireResting = false
    bonfireRestComplete = true
  }

  function completeBonfireStandUp() {
    if (!bonfireStandingUp || !sitAction) return
    const duration = sitAction.getClip()?.duration ?? 0
    if (duration > 0 && sitAction.time < duration - 0.001 && bonfireStandTimer < BONFIRE_STAND_SECONDS + 0.1) return
    sitAction.time = duration
    sitAction.paused = true
    bonfireStandingUp = false
    bonfireStandComplete = true
    if (idleAction) switchAction(idleAction, true)
  }

  function getScaledTimeScale(action, targetSeconds, direction = 1) {
    const duration = action?.getClip?.()?.duration ?? targetSeconds
    return direction * Math.max(0.01, duration / targetSeconds)
  }

  function applyWeaponVisibility() {
    playerMeshes.forEach(mesh => {
      if (mesh !== builtInSword) mesh.visible = true
    })
    if (builtInSword) builtInSword.visible = weaponId !== 'hammer'
    if (hammerModel) hammerModel.visible = weaponId === 'hammer'
  }

  function loadHammerWeapon() {
    if (!weaponSocket || hammerLoadStarted) return
    hammerLoadStarted = true
    const gltfLoader = new GLTFLoader()
    gltfLoader.load(hammerGlbUrl, (gltf) => {
      hammerModel = gltf.scene
      hammerModel.name = 'EquippedHammer'
      hammerModel.traverse((c) => {
        c.name = `EquippedHammer:${c.name || c.type}`
      })
      const weaponAnchor = new THREE.Group()
      weaponAnchor.name = 'EquippedHammerAnchor'
      weaponAnchor.position.copy(HAMMER_SOCKET_OFFSET)
      weaponAnchor.rotation.copy(HAMMER_SOCKET_ROTATION)
      hammerModel.scale.setScalar(HAMMER_MODEL_SCALE)
      hammerModel.position.set(0, HAMMER_MODEL_SCALE * 0.2, -40)
      hammerModel.traverse(c => {
        if (c.isMesh) c.castShadow = true
        c.userData.cameraIgnore = true
      })
      weaponAnchor.add(hammerModel)
      hammerModel = weaponAnchor
      weaponSocket.add(hammerModel)
      applyWeaponVisibility()
    }, undefined, (err) => {
      console.error('Failed to load hammer weapon', err)
    })
  }

  function setupWeaponSockets() {
    if (!rootModel) return
    weaponSocket = findObjectByNormalizedName(rootModel, ['mixamorig:Sword_joint', 'mixamorigSword_joint', 'mixamorigSwordjoint'])
      || findObjectByNormalizedName(rootModel, ['mixamorig:RightHand', 'mixamorigRightHand'])
    playerMeshes.length = 0
    rootModel.traverse(c => {
      if (c.isMesh) playerMeshes.push(c)
    })
    builtInSword = playerMeshes.find(mesh => (
      mesh.skeleton?.bones?.some(bone => normalizeObjectName(bone.name) === 'mixamorigswordjoint')
      && !mesh.skeleton?.bones?.some(bone => normalizeObjectName(bone.name) === 'mixamorighips')
    )) || rootModel.getObjectByName('Paladin_J_Nordstrom')
    applyWeaponVisibility()
    loadHammerWeapon()
  }

  function finishThrowMagic() {
    if (!throwMagicPlaying) return
    throwMagicPlaying = false
    if (throwMagicAction) {
      throwMagicAction.stop()
      throwMagicAction.enabled = false
    }
    if (idleAction) {
      idleAction.reset()
      idleAction.enabled = true
      idleAction.paused = false
      idleAction.setLoop(THREE.LoopRepeat, Infinity)
      idleAction.clampWhenFinished = false
      idleAction.fadeIn(0.04).play()
      currentAction = idleAction
    }
  }

  function updateThrowMagicCutoff() {
    if (!throwMagicPlaying || !throwMagicAction) return
    const duration = throwMagicAction.getClip?.()?.duration ?? 0
    if (duration <= 0) return
    if (throwMagicAction.time / duration >= THROW_MAGIC_END_NORM) finishThrowMagic()
  }

  function switchAction(next, reset = false) {
    if (!next || next === currentAction) return
    if (currentAction) currentAction.fadeOut(0.16)
    if (reset) next.reset()
    next.fadeIn(0.16).play()
    currentAction = next
  }

  function chooseLocomotionAction(moving, suppressRun = false) {
    if (defending && defenseAction) {
      defenseAction.paused = false
      defenseAction.enabled = true
      defenseAction.setLoop(THREE.LoopOnce, 1)
      defenseAction.clampWhenFinished = true
      if (currentAction !== defenseAction) {
        switchAction(defenseAction, true)
      }
      return
    }
    if (attacking && attackAction) {
      attackAction.paused = false
      attackAction.enabled = true
      attackAction.setLoop(THREE.LoopOnce, 1)
      attackAction.clampWhenFinished = true
      if (currentAction !== attackAction) {
        switchAction(attackAction, true)
      } else if (!attackAction.isRunning()) {
        attackAction.reset().play()
      }
      return
    }
    if (throwMagicPlaying && throwMagicAction) {
      throwMagicAction.paused = false
      throwMagicAction.enabled = true
      throwMagicAction.setLoop(THREE.LoopOnce, 1)
      throwMagicAction.clampWhenFinished = false
      if (currentAction !== throwMagicAction) {
        switchAction(throwMagicAction, true)
      } else if (!throwMagicAction.isRunning()) {
        throwMagicAction.reset().play()
      }
      return
    }
    if (hurting && hurtAction) {
      hurtAction.paused = false
      hurtAction.enabled = true
      hurtAction.setLoop(THREE.LoopOnce, 1)
      hurtAction.clampWhenFinished = true
      if (currentAction !== hurtAction) {
        switchAction(hurtAction, true)
      }
      return
    }

    if (locomotionState === 'run') {
      if (!runAction && walkAction) locomotionState = 'walk'
      else if (!runAction && !walkAction) locomotionState = 'idle'
    }

    if ((locomotionState === 'walk' || locomotionState === 'runToWalk') && !walkAction) {
      locomotionState = moving && runAction && !suppressRun ? 'run' : 'idle'
    }

    if (locomotionState === 'run' && runAction) {
      runAction.paused = false
      runAction.enabled = true
      runAction.setLoop(THREE.LoopRepeat, Infinity)
      runAction.clampWhenFinished = false
      if (currentAction !== runAction) {
        switchAction(runAction, true)
      } else if (!runAction.isRunning()) {
        runAction.reset().play()
      }
      return
    }

    if ((locomotionState === 'walk' || locomotionState === 'runToWalk') && walkAction) {
      walkAction.paused = false
      walkAction.enabled = true
      walkAction.setLoop(THREE.LoopRepeat, Infinity)
      walkAction.clampWhenFinished = false
      if (currentAction !== walkAction) {
        switchAction(walkAction, true)
      } else if (!walkAction.isRunning()) {
        walkAction.reset().play()
      }
      return
    }

    if (idleAction) {
      idleAction.paused = false
      idleAction.enabled = true
      idleAction.setLoop(THREE.LoopRepeat, Infinity)
      idleAction.clampWhenFinished = false
      if (currentAction !== idleAction) {
        switchAction(idleAction, true)
      } else if (!idleAction.isRunning()) {
        idleAction.reset().play()
      }
    }
  }

  function tryBuildActions() {
    if (!mixer) return
    if (idleClip && !idleAction) {
      freezeRootXZ(idleClip)
      idleAction = mixer.clipAction(idleClip, rootModel)
      idleAction.setLoop(THREE.LoopRepeat, Infinity)
      idleAction.clampWhenFinished = false
      idleAction.enabled = true
      if (!currentAction) {
        idleAction.play()
        currentAction = idleAction
      }
    }
    if (walkClip && !walkAction) {
      freezeRootXZ(walkClip)
      walkAction = mixer.clipAction(walkClip, rootModel)
      walkAction.setLoop(THREE.LoopRepeat, Infinity)
      walkAction.clampWhenFinished = false
      walkAction.timeScale = 1.0
      walkAction.enabled = true
      runToWalkDuration = THREE.MathUtils.clamp(walkClip.duration * 1, 0.4, 0.6)
      if (forcedLocomotion === 'walk') switchAction(walkAction, true)
    }
    if (runClip && !runAction) {
      freezeRootXZ(runClip)
      runAction = mixer.clipAction(runClip, rootModel)
      runAction.setLoop(THREE.LoopRepeat, Infinity)
      runAction.clampWhenFinished = false
      runAction.timeScale = 1.215
      runAction.enabled = true
    }
    if (attackClip && !attackAction) {
      freezeRootXZ(attackClip)
      attackAction = mixer.clipAction(attackClip, rootModel)
      attackAction.setLoop(THREE.LoopOnce, 1)
      attackAction.clampWhenFinished = true
      attackAction.timeScale = 1.5
      attackAction.enabled = true
    }
    if (throwMagicClip && !throwMagicAction) {
      freezeRootXZ(throwMagicClip)
      throwMagicAction = mixer.clipAction(throwMagicClip, rootModel)
      throwMagicAction.setLoop(THREE.LoopOnce, 1)
      throwMagicAction.clampWhenFinished = false
      throwMagicAction.timeScale = 1.2
      throwMagicAction.enabled = true
    }
    if (defenseClip && !defenseAction) {
      freezeRootXZ(defenseClip)
      defenseAction = mixer.clipAction(defenseClip, rootModel)
      defenseAction.setLoop(THREE.LoopOnce, 1)
      defenseAction.clampWhenFinished = true
      defenseAction.timeScale = 1.0
      defenseAction.enabled = true
    }
    if (hurtClip && !hurtAction) {
      freezeRootXZ(hurtClip)
      hurtAction = mixer.clipAction(hurtClip, rootModel)
      hurtAction.setLoop(THREE.LoopOnce, 1)
      hurtAction.clampWhenFinished = true
      hurtAction.timeScale = 1.0
      hurtAction.enabled = true
    }
    if (sitClip && !sitAction) {
      freezeRootXZ(sitClip)
      sitAction = mixer.clipAction(sitClip, rootModel)
      sitAction.setLoop(THREE.LoopOnce, 1)
      sitAction.clampWhenFinished = true
      sitAction.timeScale = -1.0
      sitAction.enabled = true
    }
  }

  const loader = new FBXLoader()
  loader.load(standFbxUrl, (object) => {
    rootModel = object
    rootModel.scale.setScalar(0.01)
    const _pLights = []
    rootModel.traverse(c => {
      if (c.isMesh) c.castShadow = true
      c.userData.cameraIgnore = true
      if (c.isLight) _pLights.push(c)
    })
    _pLights.forEach(l => l.removeFromParent())
    group.add(rootModel)
    setupWeaponSockets()

    mixer = new THREE.AnimationMixer(rootModel)
    mixer.addEventListener('finished', (e) => {
      if (e.action === attackAction) {
        attacking = false
        attackHitConsumed = false
        attackHitPending = false
        attackPrevNorm = 0
        return
      }
      if (e.action === throwMagicAction) {
        finishThrowMagic()
        return
      }
      if (e.action === hurtAction) {
        hurting = false
        return
      }
      if (e.action === sitAction) {
        completeBonfireRest()
        completeBonfireStandUp()
      }
    })

    idleClip = pickPrimaryClip(object.animations)
    tryBuildActions()
  })

  loader.load(walkFbxUrl, (fbx) => {
    walkClip = pickPrimaryClip(fbx.animations)
    tryBuildActions()
  })

  loader.load(runFbxUrl, (fbx) => {
    runClip = pickPrimaryClip(fbx.animations)
    tryBuildActions()
  })

  loader.load(attackFbxUrl, (fbx) => {
    attackClip = pickPrimaryClip(fbx.animations)
    tryBuildActions()
  })

  loader.load(throwMagicFbxUrl, (fbx) => {
    throwMagicClip = pickPrimaryClip(fbx.animations)
    tryBuildActions()
  })

  loader.load(defenseFbxUrl, (fbx) => {
    defenseClip = pickPrimaryClip(fbx.animations)
    tryBuildActions()
  })

  loader.load(hurtFbxUrl, (fbx) => {
    hurtClip = pickPrimaryClip(fbx.animations)
    tryBuildActions()
  })

  loader.load(sitFbxUrl, (fbx) => {
    sitClip = pickPrimaryClip(fbx.animations)
    tryBuildActions()
  })

  // ── 内部状态 ──────────────────────────────────────
  const MODEL_HEIGHT = 1.8                                   // FBX 厘米 × 0.01 ≈ 1.8m
  const GRAVITY     = 20
  const JUMP_SPEED  = Math.sqrt(2 * GRAVITY * MODEL_HEIGHT)  // v² = 2gh → 约 8.5
  const AUTO_STEP   = 0.55

  let currentSpeed    = 0
  let vy              = 0
  let onGround        = true
  let spaceWasPressed = false
  let inWater         = false
  let _waterDepth     = 0
  let _waterTime      = 0
  let _smoothGroundY  = 0   // 平滑后的地面高度，避免台阶边缘瞬间跳变
  const maxHp = BALANCE.player.maxHp
  let hp = maxHp
  const atk = BALANCE.player.atk

  return {
    update(dt, input, collision, getTerrainHeight = null, selfCollidable = null, moveIntent = null, suppressRun = false) {
      let dx = 0, dz = 0
      if (moveIntent) {
        dx = moveIntent.x
        dz = moveIntent.z
      } else {
        if (input.isPressed('up'))    { dx -= 1; dz -= 1 }
        if (input.isPressed('down'))  { dx += 1; dz += 1 }
        if (input.isPressed('left'))  { dx -= 1; dz += 1 }
        if (input.isPressed('right')) { dx += 1; dz -= 1 }
      }

      const moving = dx !== 0 || dz !== 0
      const locomotionDt = dt > 0 ? dt : (1 / 60)
      currentSpeed = 0
      const effectiveSpeed = inWater ? SPEED * 0.45 : SPEED

      const jNow = input.isPressed('KeyJ')
      const kNow = input.isPressed('KeyK')

      if (kNow && !attacking && !throwMagicPlaying) defending = true
      if (!kNow) defending = false

      if (jNow && !jWasPressed && !attacking && !throwMagicPlaying && !defending && attackAction) {
        attacking = true
        attackHitConsumed = false
        attackHitPending = false
        attackPrevNorm = 0
        switchAction(attackAction, true)
      }
      jWasPressed = jNow

      if (attacking && attackAction && !attackAction.isRunning()) {
        attacking = false
        attackHitConsumed = false
        attackHitPending = false
        attackPrevNorm = 0
      }

      const canLocomotion = !defending && !attacking && !throwMagicPlaying && !hurting
      if (canLocomotion) {
        if (moving) {
          moveHoldTime = suppressRun ? 0 : moveHoldTime + locomotionDt
          if (locomotionState === 'idle') locomotionState = 'walk'
          if (locomotionState === 'runToWalk') locomotionState = 'walk'
          if (suppressRun && locomotionState === 'run') locomotionState = 'walk'
          if (!suppressRun && moveHoldTime >= RUN_TRIGGER_SECONDS && runAction) locomotionState = 'run'
        } else {
          moveHoldTime = 0
          if (locomotionState === 'run' && walkAction) {
            locomotionState = 'runToWalk'
            runToWalkTimer = runToWalkDuration
            runToWalkDriftRemain = RUN_TO_WALK_DRIFT_DISTANCE
          } else if (locomotionState === 'runToWalk') {
            // 保持过渡态，直到计时结束
          } else {
            locomotionState = 'idle'
          }
        }
      }

      if (locomotionState === 'runToWalk') {
        if (moving && canLocomotion) {
          locomotionState = !suppressRun && moveHoldTime >= RUN_TRIGGER_SECONDS && runAction ? 'run' : 'walk'
        } else {
          runToWalkTimer -= locomotionDt
          if (runToWalkTimer <= 0) locomotionState = 'idle'
        }
      }

      if (moving && !defending && !attacking && !throwMagicPlaying && !hurting) {
        const len = Math.sqrt(dx * dx + dz * dz)
        dx /= len
        dz /= len
        lastMoveDirX = dx
        lastMoveDirZ = dz

        const moveDistance = effectiveSpeed * dt
        const moveSteps = Math.max(1, Math.ceil(moveDistance / 0.18))
        const stepX = dx * moveDistance / moveSteps
        const stepZ = dz * moveDistance / moveSteps
        let moved = false

        const tryMove = (nx, nz) => {
          const targetTerrainH = Math.max(
            getTerrainHeight ? getTerrainHeight(nx, nz) : 0,
            collision.getSurfaceHeight(nx, nz, group.position.y, AUTO_STEP),
          )
          const heightDiff = targetTerrainH - group.position.y
          const blocker = collision.getBlockingCollidable(nx, nz, 0.4, group.position.y, selfCollidable)
          if (blocker && !(blocker.h !== undefined && heightDiff > 0 && heightDiff <= AUTO_STEP)) return false
          if (heightDiff > AUTO_STEP) return false
          group.position.x = nx
          group.position.z = nz
          if (blocker?.h !== undefined) {
            vy = 0
            onGround = true
          }
          return true
        }

        for (let i = 0; i < moveSteps; i++) {
          const nx = group.position.x + stepX
          const nz = group.position.z + stepZ
          if (tryMove(nx, nz)) {
            moved = true
            continue
          }
          const movedX = Math.abs(stepX) > 0.0001 && tryMove(group.position.x + stepX, group.position.z)
          const movedZ = Math.abs(stepZ) > 0.0001 && tryMove(group.position.x, group.position.z + stepZ)
          moved = moved || movedX || movedZ
        }
        if (moved) currentSpeed = effectiveSpeed

        group.rotation.y = Math.atan2(dx, dz)
        // if (mixer) mixer.timeScale = 1
      }

      if (!moving && canLocomotion && locomotionState === 'runToWalk' && runToWalkDriftRemain > 0) {
        const driftSpeed = effectiveSpeed * 0.45
        const driftDist = Math.min(runToWalkDriftRemain, driftSpeed * dt)
        const nx = group.position.x + lastMoveDirX * driftDist
        const nz = group.position.z + lastMoveDirZ * driftDist
        const targetTerrainH = getTerrainHeight ? getTerrainHeight(nx, nz) : 0
        const heightDiff = targetTerrainH - group.position.y
        const blocker = collision.getBlockingCollidable(nx, nz, 0.4, group.position.y, selfCollidable)
        if ((!blocker && heightDiff <= AUTO_STEP) || (blocker && blocker.h !== undefined && heightDiff > 0 && heightDiff <= AUTO_STEP)) {
          group.position.x = nx
          group.position.z = nz
          currentSpeed = Math.max(currentSpeed, driftSpeed)
        }
        runToWalkDriftRemain = Math.max(0, runToWalkDriftRemain - driftDist)
      }

      if (blockRecoilRemain > 0) {
        const recoilDist = Math.min(blockRecoilRemain, BLOCK_RECOIL_SPEED * dt)
        const backwardX = -Math.sin(group.rotation.y)
        const backwardZ = -Math.cos(group.rotation.y)
        const nx = group.position.x + backwardX * recoilDist
        const nz = group.position.z + backwardZ * recoilDist
        const targetTerrainH = getTerrainHeight ? getTerrainHeight(nx, nz) : 0
        const heightDiff = targetTerrainH - group.position.y
        const blocker = collision.getBlockingCollidable(nx, nz, 0.4, group.position.y, selfCollidable)
        if ((!blocker && heightDiff <= AUTO_STEP) || (blocker && blocker.h !== undefined && heightDiff > 0 && heightDiff <= AUTO_STEP)) {
          group.position.x = nx
          group.position.z = nz
          currentSpeed = Math.max(currentSpeed, BLOCK_RECOIL_SPEED)
        }
        blockRecoilRemain = Math.max(0, blockRecoilRemain - recoilDist)
      }

      chooseLocomotionAction(moving && !defending && !attacking && !throwMagicPlaying && !hurting, suppressRun)

      // 跳跃
      const spaceNow = input.isPressed('Space')
      if (spaceNow && !spaceWasPressed && onGround && !attacking && !throwMagicPlaying) {
        vy = JUMP_SPEED
        onGround = false
      }
      spaceWasPressed = spaceNow

      // 重力
      const terrainH = getTerrainHeight ? getTerrainHeight(group.position.x, group.position.z) : 0
      const surfaceH = Math.max(
        collision.getSurfaceHeight(group.position.x, group.position.z, group.position.y, AUTO_STEP),
        terrainH,
      )

      // 走到岩石边缘时开始下落
      if (onGround && group.position.y > surfaceH + 0.05) {
        onGround = false
        vy = 0
      }

      if (!onGround) {
        vy -= GRAVITY * dt
        group.position.y += vy * dt
        if (group.position.y <= surfaceH) {
          group.position.y = surfaceH
          vy = 0
          onGround = true
        }
      }

      // 水中：平滑下沉 + 轻微浮动
      const sinkTarget = (onGround && inWater) ? -0.12 : 0
      _waterDepth += (sinkTarget - _waterDepth) * Math.min(dt * 5, 1)
      _waterTime  += dt
      if (onGround) {
        if (group.position.y < surfaceH) {
          _smoothGroundY = surfaceH
          group.position.y = surfaceH
        }
        // 只允许向上贴合 ≤ AUTO_STEP 的高度差；更高的表面（岩石、平台）须跳跃才能到达
        if (surfaceH - group.position.y <= AUTO_STEP) {
          // 平滑逼近目标地面高度，消除台阶边缘的瞬间跳变
          _smoothGroundY += (surfaceH - _smoothGroundY) * Math.min(dt * 18, 1)
          group.position.y = _smoothGroundY + _waterDepth
          if (inWater) group.position.y += Math.sin(_waterTime * 3.5) * 0.028
        }
      } else {
        // 空中时同步 _smoothGroundY，防止落地后出现反弹
        _smoothGroundY = group.position.y
      }

      if (mixer) {
        mixer.update(dt)
        updateThrowMagicCutoff()
        if (bonfireResting) bonfireRestTimer += dt
        if (bonfireStandingUp) bonfireStandTimer += dt
        completeBonfireRest()
        completeBonfireStandUp()
      }

      if (attacking && attackAction && !attackHitConsumed) {
        const clip = attackAction.getClip?.()
        const duration = clip?.duration ?? 0
        if (duration > 0) {
          const currNorm = attackAction.time / duration
          const overlaps = currNorm >= ATTACK_HIT_WINDOW_START && attackPrevNorm <= ATTACK_HIT_WINDOW_END
          if (overlaps) {
            attackHitConsumed = true
            attackHitPending = true
          }
          attackPrevNorm = currNorm
        }
      }

      if (blockShakeTime > 0) {
        blockShakeTime = Math.max(0, blockShakeTime - dt)
        const p = blockShakeTime / BLOCK_SHAKE_DURATION
        const wave = Math.sin((1 - p) * Math.PI * 8)
        group.rotation.y += wave * BLOCK_SHAKE_AMPLITUDE * p
      }
    },

    getPosition() {
      return group.position
    },

    getSpeed() {
      return currentSpeed
    },

    getHp() {
      return hp
    },

    getMaxHp() {
      return maxHp
    },

    getAtk() {
      return atk
    },

    takeDamage(amount) {
      hp = Math.max(0, hp - Math.max(0, amount))
      return hp
    },

    heal(amount) {
      hp = Math.min(maxHp, hp + Math.max(0, amount))
      return hp
    },

    getGroup() {
      return group
    },

    cycleWeapon() {
      weaponId = weaponId === 'hammer' ? 'sword' : 'hammer'
      applyWeaponVisibility()
      return weaponId
    },

    getWeaponId() {
      return weaponId
    },

    getEquipmentState() {
      return {
        spell: 'fireball',
        shield: 'shield',
        weapon: weaponId,
        item: 'bag',
      }
    },

    setPosition(x, z, y = 0) {
      group.position.set(x, y, z)
      vy = 0
      onGround = true
      _smoothGroundY = group.position.y
    },

    setInWater(val) {
      inWater = val
    },

    playIdle() {
      forcedLocomotion = null
      if (!idleAction) return
      defending = false
      hurting = false
      bonfireResting = false
      bonfireRestComplete = false
      bonfireStandingUp = false
      bonfireStandComplete = false
      bonfireRestTimer = 0
      bonfireStandTimer = 0
      moveHoldTime = 0
      runToWalkTimer = 0
      runToWalkDriftRemain = 0
      locomotionState = 'idle'
      switchAction(idleAction)
    },

    playWalk() {
      forcedLocomotion = 'walk'
      defending = false
      hurting = false
      attacking = false
      locomotionState = 'walk'
      if (walkAction) switchAction(walkAction, true)
    },

    playBonfireRestReverse() {
      if (!sitAction) return false
      forcedLocomotion = null
      attacking = false
      attackHitConsumed = false
      attackHitPending = false
      attackPrevNorm = 0
      defending = false
      hurting = false
      bonfireResting = true
      bonfireRestComplete = false
      bonfireStandingUp = false
      bonfireStandComplete = false
      bonfireRestTimer = 0
      bonfireStandTimer = 0
      moveHoldTime = 0
      runToWalkTimer = 0
      runToWalkDriftRemain = 0
      locomotionState = 'idle'

      sitAction.stop()
      sitAction.reset()
      sitAction.enabled = true
      sitAction.paused = false
      sitAction.setLoop(THREE.LoopOnce, 1)
      sitAction.clampWhenFinished = true
      sitAction.timeScale = getScaledTimeScale(sitAction, BONFIRE_SIT_SECONDS, -1)
      sitAction.time = Math.max(0, sitAction.getClip()?.duration ?? 0)
      switchAction(sitAction)
      if (!sitAction.isRunning()) sitAction.play()
      return true
    },

    requestBonfireStandUp() {
      if (!sitAction || (!bonfireRestComplete && !bonfireResting) || bonfireStandingUp) return false
      const duration = sitAction.getClip?.()?.duration ?? 0
      const skipTime = Math.max(0, Math.min(BONFIRE_STAND_SKIP_SECONDS, duration - 0.05))
      const resumeTime = bonfireResting ? Math.max(sitAction.time, skipTime) : skipTime
      forcedLocomotion = null
      attacking = false
      attackHitConsumed = false
      attackHitPending = false
      attackPrevNorm = 0
      defending = false
      hurting = false
      bonfireResting = false
      bonfireRestComplete = false
      bonfireStandingUp = true
      bonfireStandComplete = false
      bonfireRestTimer = 0
      bonfireStandTimer = 0
      moveHoldTime = 0
      runToWalkTimer = 0
      runToWalkDriftRemain = 0
      locomotionState = 'idle'

      sitAction.enabled = true
      sitAction.paused = false
      sitAction.setLoop(THREE.LoopOnce, 1)
      sitAction.clampWhenFinished = true
      sitAction.timeScale = getScaledTimeScale(sitAction, BONFIRE_STAND_SECONDS, 1)
      sitAction.time = resumeTime
      switchAction(sitAction)
      if (!sitAction.isRunning()) sitAction.play()
      return true
    },

    playBonfireStandUp() {
      return this.requestBonfireStandUp()
    },

    isBonfireResting() {
      return bonfireResting
    },

    isBonfireRestComplete() {
      return bonfireRestComplete
    },

    isBonfireStandingUp() {
      return bonfireStandingUp
    },

    isBonfireStandComplete() {
      return bonfireStandComplete
    },

    startAttack() {
      if (!attackAction || attacking || throwMagicPlaying || defending || hurting) return false
      attacking = true
      attackHitConsumed = false
      attackHitPending = false
      attackPrevNorm = 0
      switchAction(attackAction, true)
      return true
    },

    playThrowMagic() {
      if (!throwMagicAction) return false
      throwMagicPlaying = true
      if (currentAction && currentAction !== throwMagicAction) currentAction.fadeOut(0.08)
      throwMagicAction.stop()
      throwMagicAction.reset()
      throwMagicAction.enabled = true
      throwMagicAction.paused = false
      throwMagicAction.setLoop(THREE.LoopOnce, 1)
      throwMagicAction.clampWhenFinished = false
      throwMagicAction.timeScale = 1.2
      throwMagicAction.fadeIn(0.08).play()
      currentAction = throwMagicAction
      return true
    },

    startDefense() {
      if (!defenseAction || attacking || throwMagicPlaying || hurting) return false
      defending = true
      switchAction(defenseAction, true)
      return true
    },

    endDefense() {
      if (!defending) return
      defending = false
      chooseLocomotionAction(currentSpeed > 0.01)
    },

    consumeAttackHitWindow() {
      if (!attackHitPending) return false
      attackHitPending = false
      return true
    },

    isDefending() {
      return defending
    },

    receiveEnemyAttack(amount = 0) {
      if (defending) {
        blockShakeTime = Math.min(BLOCK_SHAKE_DURATION * 1.8, blockShakeTime + BLOCK_SHAKE_DURATION)
        blockRecoilRemain = Math.min(BLOCK_RECOIL_DISTANCE * 2.2, blockRecoilRemain + BLOCK_RECOIL_DISTANCE)
        blockImpactCount += 1
        return { blocked: true, hp }
      }
      hurting = true
      attacking = false
      attackHitConsumed = false
      attackHitPending = false
      attackPrevNorm = 0
      if (hurtAction) switchAction(hurtAction, true)
      const nextHp = this.takeDamage(amount)
      return { blocked: false, hp: nextHp }
    },

    consumeBlockImpact() {
      if (blockImpactCount <= 0) return false
      blockImpactCount -= 1
      return true
    },

    isInBlockReaction() {
      return blockShakeTime > 0
    },

    faceToward(targetX, targetZ) {
      const dx = targetX - group.position.x
      const dz = targetZ - group.position.z
      group.rotation.y = Math.atan2(dx, dz)
    },

    turnTowardDirection(dirX, dirZ, dt, turnSpeed = BALANCE.combat.throw.turnSpeed) {
      if (Math.abs(dirX) + Math.abs(dirZ) < 1e-4) return
      const targetYaw = Math.atan2(dirX, dirZ)
      const t = Math.min(1, dt * turnSpeed)
      group.rotation.y = lerpAngle(group.rotation.y, targetYaw, t)
    },

    getForwardXZ(out = null) {
      const x = Math.sin(group.rotation.y)
      const z = Math.cos(group.rotation.y)
      if (!out) return { x, z }
      out.set(x, 0, z)
      return out
    },

    updateAnimation(dt) {
      if (forcedLocomotion === 'walk' && walkAction) {
        walkAction.paused = false
        walkAction.enabled = true
        walkAction.setLoop(THREE.LoopRepeat, Infinity)
        walkAction.clampWhenFinished = false
        if (currentAction !== walkAction) {
          switchAction(walkAction, true)
        } else if (!walkAction.isRunning()) {
          walkAction.reset().play()
        }
      }
      if (mixer) {
        mixer.update(dt)
        updateThrowMagicCutoff()
        if (bonfireResting) bonfireRestTimer += dt
        if (bonfireStandingUp) bonfireStandTimer += dt
        completeBonfireRest()
        completeBonfireStandUp()
      }
    },
  }
}
