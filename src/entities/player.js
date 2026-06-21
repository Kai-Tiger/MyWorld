import * as THREE from 'three'
import { BALANCE } from '../config/balance.js'
import { cloneFBX, cloneGLTFScene, loadFBXClips } from '../systems/modelAssets.js'
import { playSfx } from '../systems/audio.js'
import standFbxUrl from '../characters/player/stand.fbx?url'
import walkFbxUrl from '../characters/player/walk.fbx?url'
import runFbxUrl from '../characters/player/run.fbx?url'
import attackFbxUrl from '../characters/player/attack.fbx?url'
import attack2FbxUrl from '../characters/player/SwordAttack2.fbx?url'
import jumpFbxUrl from '../characters/player/jump.fbx?url'
import rollFbxUrl from '../characters/player/roll.fbx?url'
import throwMagicFbxUrl from '../characters/player/throwMagic.fbx?url'
import defenseFbxUrl from '../characters/player/defense.fbx?url'
import defenseMoveFbxUrl from '../characters/player/defenseMove.fbx?url'
import hurtFbxUrl from '../characters/player/hurt.fbx?url'
import healFbxUrl from '../characters/player/heal.fbx?url'
import pickFbxUrl from '../characters/player/pick.fbx?url'
import sitFbxUrl from '../characters/player/sit.fbx?url'
import deathFbxUrl from '../characters/enemy/death.fbx?url'
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

export function createPlayer(scene) {
  const SPEED = 5.0
  const DEFENSE_MOVE_SPEED_MULTIPLIER = 0.675
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
  let attack2Clip = null
  let jumpClip = null
  let rollClip = null
  let throwMagicClip = null
  let defenseClip = null
  let defenseMoveClip = null
  let hurtClip = null
  let healClip = null
  let pickClip = null
  let sitClip = null
  let deathClip = null
  let idleAction = null
  let walkAction = null
  let runAction = null
  let attackAction = null
  let attack2Action = null
  let jumpAction = null
  let rollAction = null
  let throwMagicAction = null
  let defenseAction = null
  let defenseMoveAction = null
  let hurtAction = null
  let healAction = null
  let pickAction = null
  let sitAction = null
  let deathAction = null
  let currentAction = null
  let rigNodeNameMap = null
  const retargetedClipCache = new WeakMap()
  let attacking = false
  let throwMagicPlaying = false
  let throwMagicWarmupRequested = false
  let throwMagicWarmed = false
  let attackHitConsumed = false
  const attackHitEvents = []
  let attackHitEventId = 0
  let swordAirCueConsumed = false
  const swordAirCueEvents = []
  let swordAirCueEventId = 0
  let attackStepId = 0
  let attackPrevNorm = 0
  let activeAttackAction = null
  let comboIndex = 0
  let comboQueued = false
  let jumping = false
  let jumpWindupTimer = 0
  let jumpTakeoffPending = false
  let rolling = false
  let rollTimer = 0
  let rollDirX = 0
  let rollDirZ = 0
  let attackLungeRemain = 0
  let attackLungeTimer = 0
  let attackLungeDirX = 0
  let attackLungeDirZ = 0
  let defending = false
  let hurting = false
  let healing = false
  let picking = false
  let dying = false
  let deathComplete = false
  let bonfireResting = false
  let bonfireRestComplete = false
  let bonfireStandingUp = false
  let bonfireStandComplete = false
  let bonfireRestTimer = 0
  let bonfireStandTimer = 0
  let jWasPressed = false
  let rollComboWasPressed = false
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
  const _playerAttackCfg = BALANCE.combat.playerAttack ?? {}
  const _attackWindowCfg = _playerAttackCfg.hitWindow ?? { start: 0.30, end: 0.52 }
  const _attack2WindowCfg = _playerAttackCfg.secondHitWindow ?? { start: 0.28, end: 0.50 }
  const _comboWindowCfg = _playerAttackCfg.comboInputWindow ?? { start: 0.45, end: 0.78 }
  const ATTACK_HIT_WINDOWS = [
    normalizeWindow(_attackWindowCfg, 0.30, 0.52),
    normalizeWindow(_attack2WindowCfg, 0.28, 0.50),
  ]
  const COMBO_INPUT_WINDOW_START = THREE.MathUtils.clamp(_comboWindowCfg.start ?? 0.45, 0, 1)
  const COMBO_INPUT_WINDOW_END = THREE.MathUtils.clamp(_comboWindowCfg.end ?? 0.78, COMBO_INPUT_WINDOW_START, 1)
  const COMBO_LINK_AT = THREE.MathUtils.clamp(_playerAttackCfg.comboLinkAt ?? 0.52, COMBO_INPUT_WINDOW_START, COMBO_INPUT_WINDOW_END)
  const SECOND_ATTACK_DAMAGE_MUL = Math.max(0, _playerAttackCfg.secondDamageMul ?? 1.2)
  const SECOND_ATTACK_RANGE_MUL = Math.max(0, _playerAttackCfg.secondRangeMul ?? 1.2)
  const SECOND_ATTACK_LUNGE_DISTANCE = Math.max(0, _playerAttackCfg.secondLungeDistance ?? 0.6)
  const SECOND_ATTACK_LUNGE_DURATION = Math.max(0.01, _playerAttackCfg.secondLungeDuration ?? 0.18)
  const PLAYER_ATTACK_TIME_SCALE = Math.max(0.01, _playerAttackCfg.timeScale ?? 1.5)
  const PICK_TIME_SCALE = 5
  const SWORD_AIR_CUE_LEAD_SECONDS = 0.2
  const BLOCK_SHAKE_DURATION = 0.16
  const BLOCK_SHAKE_AMPLITUDE = 0.16
  const BLOCK_RECOIL_DISTANCE = 0.48
  const BLOCK_RECOIL_SPEED = 4.8
  const ROLL_DURATION_SECONDS = 0.62
  const ROLL_DISTANCE = 2.8
  const ROLL_INVINCIBLE_START = 0.08
  const ROLL_INVINCIBLE_END = 0.42
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

  function getRigNodeNameMap() {
    if (rigNodeNameMap) return rigNodeNameMap
    rigNodeNameMap = new Map()
    rootModel?.traverse((node) => {
      const key = normalizeObjectName(node.name).replace(/^mixamorig\d*/i, '')
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
      const mappedName = nodeMap.get(normalizeObjectName(targetName).replace(/^mixamorig\d*/i, ''))
      if (mappedName) track.name = `${mappedName}${getTrackPropertyName(track.name)}`
    })
    retargetedClipCache.set(clip, clone)
    return clone
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

  function normalizeWindow(cfg, fallbackStart, fallbackEnd) {
    const start = THREE.MathUtils.clamp(cfg?.start ?? fallbackStart, 0, 1)
    const end = THREE.MathUtils.clamp(cfg?.end ?? fallbackEnd, start, 1)
    return { start, end }
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
    cloneGLTFScene(hammerGlbUrl).then((model) => {
      hammerModel = model
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
    }).catch((err) => {
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

  function getAttackAction(index = comboIndex) {
    return index === 1 ? attack2Action : attackAction
  }

  function resetAttackHitState() {
    attackHitConsumed = false
    swordAirCueConsumed = false
    attackPrevNorm = 0
  }

  function clearAttackHitEvents() {
    attackHitEvents.length = 0
    swordAirCueEvents.length = 0
  }

  function resetAttackLunge() {
    attackLungeRemain = 0
    attackLungeTimer = 0
    attackLungeDirX = 0
    attackLungeDirZ = 0
  }

  function resetAttackState() {
    attacking = false
    activeAttackAction = null
    comboIndex = 0
    comboQueued = false
    resetAttackLunge()
    resetAttackHitState()
    clearAttackHitEvents()
  }

  function startAttackLunge() {
    if (SECOND_ATTACK_LUNGE_DISTANCE <= 0) return
    attackLungeRemain = SECOND_ATTACK_LUNGE_DISTANCE
    attackLungeTimer = 0
    attackLungeDirX = Math.sin(group.rotation.y)
    attackLungeDirZ = Math.cos(group.rotation.y)
  }

  function startAttackStep(index = 0) {
    const action = getAttackAction(index)
    if (!action) return false
    const staminaCost = index === 1 ? COMBO_ATTACK_STAMINA_COST : ATTACK_STAMINA_COST
    if (!spendStamina(staminaCost)) return false
    attacking = true
    activeAttackAction = action
    comboIndex = index
    attackStepId += 1
    comboQueued = false
    resetAttackHitState()
    action.paused = false
    action.enabled = true
    action.setLoop(THREE.LoopOnce, 1)
    action.clampWhenFinished = true
    if (currentAction === action) {
      action.reset().fadeIn(0.16).play()
    } else {
      switchAction(action, true)
    }
    if (weaponId === 'hammer') playSfx('hammerAir', { volume: 0.7 })
    if (index === 1) startAttackLunge()
    return true
  }

  function updateAttackCombo(justPressed, allowLink = true) {
    if (!attacking || !activeAttackAction || comboIndex !== 0) return
    const duration = activeAttackAction.getClip?.()?.duration ?? 0
    if (duration <= 0) return
    const currNorm = activeAttackAction.time / duration

    if (
      justPressed &&
      !comboQueued &&
      attack2Action &&
      currNorm >= COMBO_INPUT_WINDOW_START &&
      currNorm <= COMBO_INPUT_WINDOW_END
    ) {
      comboQueued = true
    }

    if (allowLink && comboQueued && currNorm >= COMBO_LINK_AT) {
      if (!startAttackStep(1)) comboQueued = false
    }
  }

  function canCancelAttackIntoDefense() {
    if (!defenseAction || !attacking || !activeAttackAction || comboIndex !== 0) return false
    const duration = activeAttackAction.getClip?.()?.duration ?? 0
    if (duration <= 0) return false
    const hitWindow = ATTACK_HIT_WINDOWS[0]
    return activeAttackAction.time / duration >= hitWindow.end
  }

  function cancelAttackIntoDefense() {
    if (!canCancelAttackIntoDefense()) return false
    resetAttackState()
    defending = true
    switchAction(defenseAction, true)
    return true
  }

  function updateAttackHitWindow() {
    if (!attacking || !activeAttackAction || attackHitConsumed) return
    const clip = activeAttackAction.getClip?.()
    const duration = clip?.duration ?? 0
    const hitWindow = ATTACK_HIT_WINDOWS[comboIndex] ?? ATTACK_HIT_WINDOWS[0]
    if (duration <= 0) return
    const currNorm = activeAttackAction.time / duration
    const overlaps = currNorm >= hitWindow.start && attackPrevNorm <= hitWindow.end
    if (overlaps) {
      attackHitConsumed = true
      attackHitEventId += 1
      attackHitEvents.push({
        id: attackHitEventId,
        stepId: attackStepId,
        comboIndex,
        ...(comboIndex === 1
          ? { damageMul: SECOND_ATTACK_DAMAGE_MUL, rangeMul: SECOND_ATTACK_RANGE_MUL }
          : { damageMul: 1, rangeMul: 1 }),
      })
    }
    attackPrevNorm = currNorm
  }

  function updateSwordAirCueWindow() {
    if (!attacking || !activeAttackAction || swordAirCueConsumed || weaponId !== 'sword') return
    const clip = activeAttackAction.getClip?.()
    const duration = clip?.duration ?? 0
    if (duration <= 0) return
    const hitWindow = ATTACK_HIT_WINDOWS[comboIndex] ?? ATTACK_HIT_WINDOWS[0]
    const leadNorm = (SWORD_AIR_CUE_LEAD_SECONDS * Math.max(0.01, activeAttackAction.timeScale ?? PLAYER_ATTACK_TIME_SCALE)) / duration
    const cueNorm = Math.max(0, hitWindow.start - leadNorm)
    const currNorm = activeAttackAction.time / duration
    if (currNorm < cueNorm) return
    swordAirCueConsumed = true
    swordAirCueEventId += 1
    swordAirCueEvents.push({
      id: swordAirCueEventId,
      stepId: attackStepId,
      comboIndex,
      rangeMul: comboIndex === 1 ? SECOND_ATTACK_RANGE_MUL : 1,
    })
  }

  function resetJumpState() {
    jumping = false
    jumpWindupTimer = 0
    jumpTakeoffPending = false
  }

  function resetRollState() {
    rolling = false
    rollTimer = 0
    rollDirX = 0
    rollDirZ = 0
    if (rollAction) rollAction.stop()
  }

  function finishRoll() {
    if (!rolling) return
    rolling = false
    rollTimer = 0
    rollDirX = 0
    rollDirZ = 0
    currentSpeed = 0
    if (idleAction) {
      chooseLocomotionAction(false)
      return
    }
    if (rollAction) rollAction.stop()
    if (currentAction === rollAction) currentAction = null
  }

  function isRollInvincible() {
    return rolling && rollTimer >= ROLL_INVINCIBLE_START && rollTimer <= ROLL_INVINCIBLE_END
  }

  function startRoll(dirX, dirZ) {
    if (!rollAction || !onGround || rolling || attacking || throwMagicPlaying || hurting || healing || picking || dying || bonfireResting || bonfireStandingUp) return false
    if (jumping || jumpTakeoffPending) return false
    const len = Math.sqrt(dirX * dirX + dirZ * dirZ)
    if (len <= 0.0001) return false
    if (!spendStamina(ATTACK_STAMINA_COST)) return false

    rolling = true
    defending = false
    forcedLocomotion = null
    locomotionState = 'idle'
    moveHoldTime = 0
    runToWalkTimer = 0
    runToWalkDriftRemain = 0
    rollTimer = 0
    rollDirX = dirX / len
    rollDirZ = dirZ / len
    lastMoveDirX = rollDirX
    lastMoveDirZ = rollDirZ
    currentSpeed = 0
    group.rotation.y = Math.atan2(rollDirX, rollDirZ)

    rollAction.stop()
    rollAction.reset()
    rollAction.enabled = true
    rollAction.paused = false
    rollAction.setLoop(THREE.LoopOnce, 1)
    rollAction.clampWhenFinished = true
    rollAction.timeScale = getScaledTimeScale(rollAction, ROLL_DURATION_SECONDS, 1)
    switchAction(rollAction, false)
    return true
  }

  function startJumpAnimation() {
    if (!jumpAction) return
    jumping = true
    jumpAction.paused = false
    jumpAction.enabled = true
    jumpAction.setLoop(THREE.LoopOnce, 1)
    jumpAction.clampWhenFinished = true
    if (currentAction === jumpAction) {
      jumpAction.reset().fadeIn(0.08).play()
    } else {
      switchAction(jumpAction, true)
    }
  }

  function chooseLocomotionAction(moving, suppressRun = false) {
    if (dying) return
    if (healing && healAction) {
      healAction.paused = false
      healAction.enabled = true
      healAction.setLoop(THREE.LoopOnce, 1)
      healAction.clampWhenFinished = true
      if (currentAction !== healAction) {
        switchAction(healAction, true)
      } else if (!healAction.isRunning()) {
        healAction.reset().play()
      }
      return
    }
    if (picking && pickAction) {
      pickAction.paused = false
      pickAction.enabled = true
      pickAction.setLoop(THREE.LoopOnce, 1)
      pickAction.clampWhenFinished = true
      if (currentAction !== pickAction) {
        switchAction(pickAction, true)
      } else if (!pickAction.isRunning()) {
        pickAction.reset().play()
      }
      return
    }
    if (rolling && rollAction) {
      rollAction.paused = false
      rollAction.enabled = true
      rollAction.setLoop(THREE.LoopOnce, 1)
      rollAction.clampWhenFinished = true
      if (currentAction !== rollAction) {
        switchAction(rollAction, true)
      } else if (!rollAction.isRunning()) {
        rollAction.reset().play()
      }
      return
    }
    if (defending) {
      const action = moving && defenseMoveAction ? defenseMoveAction : defenseAction
      if (action) {
        action.paused = false
        action.enabled = true
        if (action === defenseMoveAction) {
          action.setLoop(THREE.LoopRepeat, Infinity)
          action.clampWhenFinished = false
        } else {
          action.setLoop(THREE.LoopOnce, 1)
          action.clampWhenFinished = true
        }
        if (currentAction !== action) {
          switchAction(action, true)
        } else if (action === defenseMoveAction && !action.isRunning()) {
          action.reset().play()
        }
      }
      return
    }
    if (attacking && activeAttackAction) {
      activeAttackAction.paused = false
      activeAttackAction.enabled = true
      activeAttackAction.setLoop(THREE.LoopOnce, 1)
      activeAttackAction.clampWhenFinished = true
      if (currentAction !== activeAttackAction) {
        switchAction(activeAttackAction, true)
      } else if (!activeAttackAction.isRunning()) {
        activeAttackAction.reset().play()
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
    if (jumping && jumpAction) {
      jumpAction.paused = false
      jumpAction.enabled = true
      jumpAction.setLoop(THREE.LoopOnce, 1)
      jumpAction.clampWhenFinished = true
      if (currentAction !== jumpAction) {
        switchAction(jumpAction, true)
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
      attackAction.timeScale = PLAYER_ATTACK_TIME_SCALE
      attackAction.enabled = true
    }
    if (attack2Clip && !attack2Action) {
      freezeRootXZ(attack2Clip)
      attack2Action = mixer.clipAction(attack2Clip, rootModel)
      attack2Action.setLoop(THREE.LoopOnce, 1)
      attack2Action.clampWhenFinished = true
      attack2Action.timeScale = PLAYER_ATTACK_TIME_SCALE
      attack2Action.enabled = true
    }
    if (jumpClip && !jumpAction) {
      freezeRootXZ(jumpClip)
      jumpAction = mixer.clipAction(jumpClip, rootModel)
      jumpAction.setLoop(THREE.LoopOnce, 1)
      jumpAction.clampWhenFinished = true
      jumpAction.timeScale = 1.0
      jumpAction.enabled = true
    }
    if (rollClip && !rollAction) {
      freezeRootXZ(rollClip)
      rollAction = mixer.clipAction(rollClip, rootModel)
      rollAction.setLoop(THREE.LoopOnce, 1)
      rollAction.clampWhenFinished = true
      rollAction.timeScale = getScaledTimeScale(rollAction, ROLL_DURATION_SECONDS, 1)
      rollAction.enabled = true
    }
    if (throwMagicClip && !throwMagicAction) {
      freezeRootXZ(throwMagicClip)
      throwMagicAction = mixer.clipAction(throwMagicClip, rootModel)
      throwMagicAction.setLoop(THREE.LoopOnce, 1)
      throwMagicAction.clampWhenFinished = false
      throwMagicAction.timeScale = 1.2
      throwMagicAction.enabled = true
      if (throwMagicWarmupRequested) warmupThrowMagicAction()
    }
    if (defenseClip && !defenseAction) {
      freezeRootXZ(defenseClip)
      defenseAction = mixer.clipAction(defenseClip, rootModel)
      defenseAction.setLoop(THREE.LoopOnce, 1)
      defenseAction.clampWhenFinished = true
      defenseAction.timeScale = 5
      defenseAction.enabled = true
    }
    if (defenseMoveClip && !defenseMoveAction) {
      freezeRootXZ(defenseMoveClip)
      defenseMoveAction = mixer.clipAction(defenseMoveClip, rootModel)
      defenseMoveAction.setLoop(THREE.LoopRepeat, Infinity)
      defenseMoveAction.clampWhenFinished = false
      defenseMoveAction.timeScale = 1.0
      defenseMoveAction.enabled = true
    }
    if (hurtClip && !hurtAction) {
      freezeRootXZ(hurtClip)
      hurtAction = mixer.clipAction(hurtClip, rootModel)
      hurtAction.setLoop(THREE.LoopOnce, 1)
      hurtAction.clampWhenFinished = true
      hurtAction.timeScale = 1.0
      hurtAction.enabled = true
    }
    if (healClip && !healAction) {
      freezeRootXZ(healClip)
      healAction = mixer.clipAction(healClip, rootModel)
      healAction.setLoop(THREE.LoopOnce, 1)
      healAction.clampWhenFinished = true
      healAction.timeScale = 1.0
      healAction.enabled = true
    }
    if (pickClip && !pickAction) {
      freezeRootXZ(pickClip)
      pickAction = mixer.clipAction(pickClip, rootModel)
      pickAction.setLoop(THREE.LoopOnce, 1)
      pickAction.clampWhenFinished = true
      pickAction.timeScale = PICK_TIME_SCALE
      pickAction.enabled = true
    }
    if (sitClip && !sitAction) {
      freezeRootXZ(sitClip)
      sitAction = mixer.clipAction(sitClip, rootModel)
      sitAction.setLoop(THREE.LoopOnce, 1)
      sitAction.clampWhenFinished = true
      sitAction.timeScale = -1.0
      sitAction.enabled = true
    }
    if (deathClip && !deathAction) {
      deathClip = retargetClipToModel(deathClip)
      freezeRootXZ(deathClip)
      deathAction = mixer.clipAction(deathClip, rootModel)
      deathAction.setLoop(THREE.LoopOnce, 1)
      deathAction.clampWhenFinished = true
      deathAction.timeScale = 1.0
      deathAction.enabled = true
    }
  }

  function warmupThrowMagicAction() {
    if (throwMagicWarmed || !throwMagicAction || !mixer) return false
    const previousEnabled = throwMagicAction.enabled
    const previousPaused = throwMagicAction.paused
    const previousTime = throwMagicAction.time
    throwMagicAction.stop()
    throwMagicAction.reset()
    throwMagicAction.enabled = true
    throwMagicAction.paused = false
    throwMagicAction.setLoop(THREE.LoopOnce, 1)
    throwMagicAction.clampWhenFinished = false
    throwMagicAction.timeScale = 1.2
    throwMagicAction.play()
    mixer.update(0)
    throwMagicAction.stop()
    throwMagicAction.reset()
    throwMagicAction.enabled = previousEnabled
    throwMagicAction.paused = previousPaused
    throwMagicAction.time = previousTime
    throwMagicWarmed = true
    return true
  }

  cloneFBX(standFbxUrl).then((object) => {
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
      if (e.action === activeAttackAction && (e.action === attackAction || e.action === attack2Action)) {
        resetAttackState()
        return
      }
      if (e.action === throwMagicAction) {
        finishThrowMagic()
        return
      }
      if (e.action === rollAction) {
        finishRoll()
        return
      }
      if (e.action === hurtAction) {
        hurting = false
        return
      }
      if (e.action === healAction) {
        healing = false
        chooseLocomotionAction(false)
        return
      }
      if (e.action === pickAction) {
        picking = false
        chooseLocomotionAction(false)
        return
      }
      if (e.action === deathAction) {
        deathComplete = true
        return
      }
      if (e.action === sitAction) {
        completeBonfireRest()
        completeBonfireStandUp()
      }
    })

    idleClip = pickPrimaryClip(object.animations)
    tryBuildActions()
  }).catch((err) => {
    console.error('Failed to load player model', err)
  })

  loadFBXClips(walkFbxUrl).then((clips) => {
    walkClip = pickPrimaryClip(clips)
    tryBuildActions()
  })

  loadFBXClips(runFbxUrl).then((clips) => {
    runClip = pickPrimaryClip(clips)
    tryBuildActions()
  })

  loadFBXClips(attackFbxUrl).then((clips) => {
    attackClip = pickPrimaryClip(clips)
    tryBuildActions()
  })

  loadFBXClips(attack2FbxUrl).then((clips) => {
    attack2Clip = pickPrimaryClip(clips)
    tryBuildActions()
  })

  loadFBXClips(jumpFbxUrl).then((clips) => {
    jumpClip = pickPrimaryClip(clips)
    tryBuildActions()
  })

  loadFBXClips(rollFbxUrl).then((clips) => {
    rollClip = pickPrimaryClip(clips)
    tryBuildActions()
  })

  loadFBXClips(throwMagicFbxUrl).then((clips) => {
    throwMagicClip = pickPrimaryClip(clips)
    tryBuildActions()
  })

  loadFBXClips(defenseFbxUrl).then((clips) => {
    defenseClip = pickPrimaryClip(clips)
    tryBuildActions()
  })

  loadFBXClips(defenseMoveFbxUrl).then((clips) => {
    defenseMoveClip = pickPrimaryClip(clips)
    tryBuildActions()
  })

  loadFBXClips(hurtFbxUrl).then((clips) => {
    hurtClip = pickPrimaryClip(clips)
    tryBuildActions()
  })

  loadFBXClips(healFbxUrl).then((clips) => {
    healClip = pickPrimaryClip(clips)
    tryBuildActions()
  })

  loadFBXClips(pickFbxUrl).then((clips) => {
    pickClip = pickPrimaryClip(clips)
    tryBuildActions()
  })

  loadFBXClips(sitFbxUrl).then((clips) => {
    sitClip = pickPrimaryClip(clips)
    tryBuildActions()
  })

  loadFBXClips(deathFbxUrl).then((clips) => {
    deathClip = pickPrimaryClip(clips)
    tryBuildActions()
  })

  // ── 内部状态 ──────────────────────────────────────
  const MODEL_HEIGHT = 1.44                                  // 跳跃目标高度，原 1.8m 降低 20%
  const GRAVITY     = 20
  const JUMP_SPEED  = Math.sqrt(2 * GRAVITY * MODEL_HEIGHT)  // v² = 2gh → 约 8.5
  const JUMP_WINDUP_SECONDS = 0.12
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
  let deathCuePending = false
  const maxMp = BALANCE.player.maxMp
  let mp = maxMp
  const atk = BALANCE.player.atk
  const _staminaCfg = BALANCE.player.stamina ?? {}
  const maxStamina = Math.max(1, _staminaCfg.max ?? 100)
  let stamina = maxStamina
  let staminaDepleted = false
  const STAMINA_REGEN_PER_SECOND = Math.max(0, _staminaCfg.regenPerSecond ?? 25)
  const ATTACK_STAMINA_COST = Math.max(0, _staminaCfg.attackCost ?? 25)
  const COMBO_ATTACK_STAMINA_COST = Math.max(0, _staminaCfg.comboAttackCost ?? 35)
  const BLOCK_STAMINA_COST_DAMAGE_MULTIPLIER = Math.max(0, _staminaCfg.blockCostDamageMultiplier ?? 1.5)
  const GUARD_BREAK_DAMAGE_MULTIPLIER = Math.max(0, _staminaCfg.guardBreakDamageMultiplier ?? 0.5)
  const EMPTY_STAMINA_MOVE_SPEED_MULTIPLIER = THREE.MathUtils.clamp(_staminaCfg.emptyMoveSpeedMultiplier ?? 0.8, 0, 1)
  const RUN_STAMINA_REGEN_MULTIPLIER = Math.max(0, _staminaCfg.runRegenMultiplier ?? 0.75)
  const DEFENSE_STAMINA_REGEN_MULTIPLIER = Math.max(0, _staminaCfg.defenseRegenMultiplier ?? 0.5)

  function spendStamina(amount) {
    const cost = Math.max(0, amount)
    if (stamina < cost) return false
    stamina = Math.max(0, stamina - cost)
    if (stamina <= 0) staminaDepleted = true
    return true
  }

  function restoreFullStamina() {
    stamina = maxStamina
    staminaDepleted = false
    return stamina
  }

  function updateStaminaRecovery(dt) {
    if (stamina >= maxStamina || STAMINA_REGEN_PER_SECOND <= 0) return
    let multiplier = 1
    if (defending) multiplier = DEFENSE_STAMINA_REGEN_MULTIPLIER
    else if (locomotionState === 'run') multiplier = RUN_STAMINA_REGEN_MULTIPLIER
    stamina = Math.min(maxStamina, stamina + STAMINA_REGEN_PER_SECOND * multiplier * Math.max(0, dt))
    if (staminaDepleted && stamina >= ATTACK_STAMINA_COST) staminaDepleted = false
  }

  function playHurtReaction(amount) {
    hurting = true
    defending = false
    healing = false
    picking = false
    if (healAction) healAction.stop()
    if (pickAction) pickAction.stop()
    resetAttackState()
    resetJumpState()
    resetRollState()
    if (hurtAction) switchAction(hurtAction, true)
    const prevHp = hp
    hp = Math.max(0, hp - Math.max(0, amount))
    if (prevHp > 0 && hp <= 0) deathCuePending = true
    return hp
  }

  return {
    update(dt, input, collision, getTerrainHeight = null, selfCollidable = null, moveIntent = null, suppressRun = false, lockFacingTarget = null) {
      if (dying) {
        currentSpeed = 0
        if (mixer) mixer.update(dt)
        return
      }

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
      const staminaSpeedMultiplier = staminaDepleted ? EMPTY_STAMINA_MOVE_SPEED_MULTIPLIER : 1
      const effectiveSpeed = (inWater ? SPEED * 0.45 : SPEED) * staminaSpeedMultiplier

      const jNow = input.isPressed('KeyJ')
      const kNow = input.isPressed('KeyK')
      const jPressed = jNow && !jWasPressed
      const rollPressed = input.consumePressed?.('KeyL') ?? false
      const rollComboPressed = moving && (input.isPressed('KeyL') || rollPressed)

      if (rollComboPressed && !rollComboWasPressed) startRoll(dx, dz)
      rollComboWasPressed = rollComboPressed

      if (kNow && canCancelAttackIntoDefense()) cancelAttackIntoDefense()
      if (kNow && !rolling && !attacking && !throwMagicPlaying && !hurting && !healing && !picking) defending = true
      if (!kNow || rolling) defending = false

      if (jPressed && !rolling && !attacking && !throwMagicPlaying && !defending && !healing && !picking && attackAction) {
        startAttackStep(0)
      }
      updateAttackCombo(jPressed, false)
      jWasPressed = jNow

      if (attacking && activeAttackAction && !activeAttackAction.isRunning()) {
        resetAttackState()
      }

      const canControlMovement = !rolling && !attacking && !throwMagicPlaying && !hurting && !healing && !picking
      const canLocomotion = !defending && canControlMovement
      if (defending) {
        moveHoldTime = 0
        runToWalkTimer = 0
        runToWalkDriftRemain = 0
        if (locomotionState === 'run' || locomotionState === 'runToWalk') locomotionState = 'idle'
      } else if (canLocomotion) {
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

      if (rolling) {
        rollTimer += dt
        const rollDistance = (ROLL_DISTANCE / ROLL_DURATION_SECONDS) * dt
        const moveSteps = Math.max(1, Math.ceil(rollDistance / 0.18))
        const stepX = rollDirX * rollDistance / moveSteps
        const stepZ = rollDirZ * rollDistance / moveSteps
        let movedDist = 0

        for (let i = 0; i < moveSteps; i++) {
          const nx = group.position.x + stepX
          const nz = group.position.z + stepZ
          if (tryMove(nx, nz)) {
            movedDist += rollDistance / moveSteps
            continue
          }
          const movedX = Math.abs(stepX) > 0.0001 && tryMove(group.position.x + stepX, group.position.z)
          const movedZ = Math.abs(stepZ) > 0.0001 && tryMove(group.position.x, group.position.z + stepZ)
          if (movedX || movedZ) movedDist += rollDistance / moveSteps
        }

        if (movedDist > 0) currentSpeed = Math.max(currentSpeed, movedDist / Math.max(dt, 0.0001))
        group.rotation.y = Math.atan2(rollDirX, rollDirZ)
        if (rollTimer >= ROLL_DURATION_SECONDS) finishRoll()
      }

      if (moving && canControlMovement) {
        const len = Math.sqrt(dx * dx + dz * dz)
        dx /= len
        dz /= len
        lastMoveDirX = dx
        lastMoveDirZ = dz

        const moveSpeed = defending ? effectiveSpeed * DEFENSE_MOVE_SPEED_MULTIPLIER : effectiveSpeed
        const moveDistance = moveSpeed * dt
        const moveSteps = Math.max(1, Math.ceil(moveDistance / 0.18))
        const stepX = dx * moveDistance / moveSteps
        const stepZ = dz * moveDistance / moveSteps
        let moved = false

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
        if (moved) currentSpeed = moveSpeed

        if (defending && lockFacingTarget) {
          const faceDx = lockFacingTarget.x - group.position.x
          const faceDz = lockFacingTarget.z - group.position.z
          if (faceDx * faceDx + faceDz * faceDz > 0.0001) {
            group.rotation.y = Math.atan2(faceDx, faceDz)
          }
        } else {
          group.rotation.y = Math.atan2(dx, dz)
        }
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

      if (attackLungeRemain > 0) {
        const prevT = THREE.MathUtils.clamp(attackLungeTimer / SECOND_ATTACK_LUNGE_DURATION, 0, 1)
        attackLungeTimer += dt
        const currT = THREE.MathUtils.clamp(attackLungeTimer / SECOND_ATTACK_LUNGE_DURATION, 0, 1)
        const prevEase = 1 - (1 - prevT) * (1 - prevT)
        const currEase = 1 - (1 - currT) * (1 - currT)
        const lungeDist = Math.min(attackLungeRemain, SECOND_ATTACK_LUNGE_DISTANCE * Math.max(0, currEase - prevEase))
        const moveSteps = Math.max(1, Math.ceil(lungeDist / 0.18))
        const stepX = attackLungeDirX * lungeDist / moveSteps
        const stepZ = attackLungeDirZ * lungeDist / moveSteps
        let movedDist = 0

        for (let i = 0; i < moveSteps && lungeDist > 0; i++) {
          const nx = group.position.x + stepX
          const nz = group.position.z + stepZ
          if (!tryMove(nx, nz)) {
            resetAttackLunge()
            break
          }
          movedDist += lungeDist / moveSteps
          attackLungeRemain = Math.max(0, attackLungeRemain - lungeDist / moveSteps)
        }

        if (movedDist > 0) currentSpeed = Math.max(currentSpeed, movedDist / Math.max(dt, 0.0001))
        if (attackLungeTimer >= SECOND_ATTACK_LUNGE_DURATION || attackLungeRemain <= 0.0001) resetAttackLunge()
      }

      chooseLocomotionAction(moving && canControlMovement, suppressRun)
      updateStaminaRecovery(dt)

      // 跳跃
      const spaceNow = input.isPressed('Space')
      if (spaceNow && !spaceWasPressed && onGround && !rolling && !attacking && !throwMagicPlaying && !healing && !picking) {
        if (jumpAction) {
          startJumpAnimation()
          jumpTakeoffPending = true
          jumpWindupTimer = JUMP_WINDUP_SECONDS
        } else {
          vy = JUMP_SPEED
          onGround = false
        }
      }
      spaceWasPressed = spaceNow

      if (jumpTakeoffPending) {
        if (!onGround || attacking || throwMagicPlaying || hurting || healing || picking || dying) {
          resetJumpState()
        } else {
          jumpWindupTimer -= dt
          if (jumpWindupTimer <= 0) {
            jumpTakeoffPending = false
            jumpWindupTimer = 0
            vy = JUMP_SPEED
            onGround = false
          }
        }
      }

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
          resetJumpState()
          chooseLocomotionAction(moving && canControlMovement, suppressRun)
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

      updateSwordAirCueWindow()
      updateAttackHitWindow()
      updateAttackCombo(false)

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

    getMp() {
      return mp
    },

    getMaxMp() {
      return maxMp
    },

    getStamina() {
      return stamina
    },

    getMaxStamina() {
      return maxStamina
    },

    getAtk() {
      return atk
    },

    takeDamage(amount) {
      const prevHp = hp
      hp = Math.max(0, hp - Math.max(0, amount))
      if (prevHp > 0 && hp <= 0) deathCuePending = true
      return hp
    },

    heal(amount) {
      hp = Math.min(maxHp, hp + Math.max(0, amount))
      if (hp > 0) deathCuePending = false
      return hp
    },

    restoreFullHp() {
      hp = maxHp
      deathCuePending = false
      return hp
    },

    spendMp(amount) {
      const cost = Math.max(0, amount)
      if (mp < cost) return false
      mp = Math.max(0, mp - cost)
      return true
    },

    restoreFullMp() {
      mp = maxMp
      return mp
    },

    restoreFullStamina,

    recoverMp(amount) {
      mp = Math.min(maxMp, mp + Math.max(0, amount))
      return mp
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

    getLocomotionState() {
      return locomotionState
    },

    getMoveHoldTime() {
      return moveHoldTime
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
      resetAttackLunge()
      resetJumpState()
      resetRollState()
      _smoothGroundY = group.position.y
    },

    setInWater(val) {
      inWater = val
    },

    playIdle() {
      forcedLocomotion = null
      if (!idleAction) return
      dying = false
      deathComplete = false
      deathCuePending = false
      if (deathAction) deathAction.stop()
      resetAttackState()
      resetJumpState()
      resetRollState()
      defending = false
      hurting = false
      healing = false
      picking = false
      if (pickAction) pickAction.stop()
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
      if (dying) return
      forcedLocomotion = 'walk'
      defending = false
      hurting = false
      healing = false
      picking = false
      if (pickAction) pickAction.stop()
      resetAttackState()
      resetJumpState()
      resetRollState()
      locomotionState = 'walk'
      if (walkAction) switchAction(walkAction, true)
    },

    playBonfireRestReverse() {
      if (!sitAction || dying) return false
      forcedLocomotion = null
      resetAttackState()
      resetJumpState()
      resetRollState()
      defending = false
      hurting = false
      healing = false
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
      resetAttackState()
      resetJumpState()
      resetRollState()
      defending = false
      hurting = false
      healing = false
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
      if (!attackAction || rolling || attacking || throwMagicPlaying || defending || hurting || healing || picking || dying) return false
      return startAttackStep(0)
    },

    warmupThrowMagic() {
      throwMagicWarmupRequested = true
      return warmupThrowMagicAction()
    },

    playThrowMagic() {
      if (!throwMagicAction || rolling || dying || healing || picking) return false
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
      if (attacking) return cancelAttackIntoDefense()
      if (!defenseAction || rolling || attacking || throwMagicPlaying || hurting || healing || picking || dying) return false
      defending = true
      switchAction(defenseAction, true)
      return true
    },

    playHeal() {
      if (!healAction || rolling || attacking || throwMagicPlaying || defending || hurting || picking || dying || bonfireResting || bonfireStandingUp) return false
      healing = true
      forcedLocomotion = null
      currentSpeed = 0
      resetAttackState()
      resetJumpState()
      resetAttackLunge()
      resetRollState()
      healAction.stop()
      healAction.reset()
      healAction.enabled = true
      healAction.paused = false
      healAction.setLoop(THREE.LoopOnce, 1)
      healAction.clampWhenFinished = true
      healAction.timeScale = 1.0
      if (currentAction && currentAction !== healAction) currentAction.fadeOut(0.08)
      healAction.fadeIn(0.08).play()
      currentAction = healAction
      return true
    },

    playPick() {
      if (!pickAction || rolling || attacking || throwMagicPlaying || defending || hurting || healing || dying || bonfireResting || bonfireStandingUp) return false
      picking = true
      forcedLocomotion = null
      currentSpeed = 0
      resetAttackState()
      resetJumpState()
      resetAttackLunge()
      resetRollState()
      pickAction.stop()
      pickAction.reset()
      pickAction.enabled = true
      pickAction.paused = false
      pickAction.setLoop(THREE.LoopOnce, 1)
      pickAction.clampWhenFinished = true
      pickAction.timeScale = PICK_TIME_SCALE
      if (currentAction && currentAction !== pickAction) currentAction.fadeOut(0.08)
      pickAction.fadeIn(0.08).play()
      currentAction = pickAction
      return true
    },

    endDefense() {
      if (!defending) return
      defending = false
      chooseLocomotionAction(currentSpeed > 0.01)
    },

    consumeAttackHitWindow() {
      if (!attacking || !activeAttackAction) {
        clearAttackHitEvents()
        return false
      }
      return attackHitEvents.shift() ?? false
    },

    consumeSwordAirCue() {
      if (!attacking || !activeAttackAction) {
        swordAirCueEvents.length = 0
        return false
      }
      return swordAirCueEvents.shift() ?? false
    },

    isDefending() {
      return defending
    },

    isAttacking() {
      return attacking
    },

    isThrowMagicPlaying() {
      return throwMagicPlaying
    },

    isHealing() {
      return healing
    },

    isPicking() {
      return picking
    },

    isRolling() {
      return rolling
    },

    receiveEnemyAttack(amount = 0) {
      if (dying || hp <= 0) return { blocked: false, hp }
      if (isRollInvincible()) return { blocked: false, hp }
      if (defending) {
        const blockCost = Math.max(0, amount) * BLOCK_STAMINA_COST_DAMAGE_MULTIPLIER
        if (blockCost <= 0 || stamina > blockCost) {
          spendStamina(blockCost)
          blockShakeTime = Math.min(BLOCK_SHAKE_DURATION * 2.0, blockShakeTime + BLOCK_SHAKE_DURATION)
          blockRecoilRemain = Math.min(BLOCK_RECOIL_DISTANCE * 2.0, blockRecoilRemain + BLOCK_RECOIL_DISTANCE)
          blockImpactCount += 1
          return { blocked: true, hp }
        }
        stamina = 0
        staminaDepleted = true
        const nextHp = playHurtReaction(Math.max(0, amount) * GUARD_BREAK_DAMAGE_MULTIPLIER)
        return { blocked: false, hp: nextHp }
      }
      const nextHp = playHurtReaction(amount)
      return { blocked: false, hp: nextHp }
    },

    playDeath() {
      if (dying) return true
      dying = true
      deathComplete = false
      forcedLocomotion = null
      currentSpeed = 0
      defending = false
      hurting = false
      healing = false
      picking = false
      throwMagicPlaying = false
      bonfireResting = false
      bonfireRestComplete = false
      bonfireStandingUp = false
      bonfireStandComplete = false
      bonfireRestTimer = 0
      bonfireStandTimer = 0
      resetAttackState()
      resetJumpState()
      resetAttackLunge()
      resetRollState()
      if (throwMagicAction) throwMagicAction.stop()
      if (hurtAction) hurtAction.stop()
      if (healAction) healAction.stop()
      if (pickAction) pickAction.stop()
      if (defenseAction) defenseAction.stop()
      if (defenseMoveAction) defenseMoveAction.stop()
      if (jumpAction) jumpAction.stop()
      if (rollAction) rollAction.stop()
      if (walkAction) walkAction.stop()
      if (runAction) runAction.stop()
      if (idleAction) idleAction.stop()
      if (sitAction) sitAction.stop()

      const action = deathAction ?? hurtAction
      if (!action) return false
      action.stop()
      action.reset()
      action.enabled = true
      action.paused = false
      action.setLoop(THREE.LoopOnce, 1)
      action.clampWhenFinished = true
      action.timeScale = 1.0
      if (currentAction && currentAction !== action) currentAction.fadeOut(0.08)
      action.fadeIn(0.08).play()
      currentAction = action
      return true
    },

    isDead() {
      return hp <= 0
    },

    isDying() {
      return dying
    },

    isDeathComplete() {
      return deathComplete
    },

    consumeDeathCue() {
      if (!deathCuePending) return false
      deathCuePending = false
      return true
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
      if (dying) {
        if (mixer) mixer.update(dt)
        return
      }
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
