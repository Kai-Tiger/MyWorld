import * as THREE from 'three'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import { BALANCE } from '../config/balance.js'
import mainFbxUrl from '../characters/enemy/main.fbx?url'
import sitFbxUrl from '../characters/enemy/sit.fbx?url'
import standFbxUrl from '../characters/enemy/Stand.fbx?url'
import runFbxUrl from '../characters/enemy/run.fbx?url'
import attackFbxUrl from '../characters/enemy/attack.fbx?url'
import hurtFbxUrl from '../characters/enemy/hurt.fbx?url'
import deathFbxUrl from '../characters/enemy/death.fbx?url'

const _toPlayer = new THREE.Vector2()

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
  getTerrainHeight = null,
  maxHp = BALANCE.npc.fbx.maxHp,
  triggerRange = BALANCE.combat.enemy.triggerRange,
  attackRange = BALANCE.combat.enemy.attackRange,
  disengageRange = BALANCE.combat.enemy.disengageRange,
  moveSpeed = BALANCE.combat.enemy.moveSpeed,
  attackCooldown = BALANCE.combat.enemy.attackCooldown,
  attackDamage = BALANCE.combat.enemy.attackDamage,
  attackWindows = BALANCE.combat.enemy.attackWindows,
  turnSpeed = BALANCE.combat.enemy.turnSpeed,
  attackTurnScale = BALANCE.combat.enemy.attackTurnScale,
  animFade = BALANCE.combat.enemy.animFade,
  alertDuration = BALANCE.combat.enemy.alertDuration,
  attackEndGrace = BALANCE.combat.enemy.attackEndGrace,
} = {}) {
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
  let attackClip = null
  let hurtClip = null
  let deathClip = null
  let idleAction = null
  let sitAction = null
  let standAction = null
  let runAction = null
  let attackAction = null
  let hurtAction = null
  let deathAction = null
  let currentAction = null

  let attackCdRemain = 0
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
  let alerting = false
  let alertTimer = 0
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
    attacking = false
    attackCdRemain = 0
    if (hurtAction) hurtAction.stop()
    if (attackAction) attackAction.stop()
    if (runAction) runAction.stop()
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
    hp = 0
    alive = false
    applyLockVisualState('hidden')
    if (!playDeathOnce()) deathPending = true
  }

  function resumeAfterHurt() {
    if (dying) return
    const resumeAction = preHurtAction
    preHurtAction = null
    hurting = false
    if (!alive) return

    if (!engaged) {
      setSeatedPose()
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

  function tryBuildActions() {
    if (!mixer) return
    if (idleClip && !idleAction) {
      freezeRootXZ(idleClip)
      idleAction = mixer.clipAction(idleClip)
      idleAction.enabled = true
      if (!engaged && !alerting && !attacking) setSeatedPose()
    }
    if (sitClip && !sitAction) {
      freezeRootXZ(sitClip)
      sitAction = mixer.clipAction(sitClip)
      sitAction.enabled = true
      sitAction.setLoop(THREE.LoopRepeat, Infinity)
      sitAction.clampWhenFinished = false
      if (!engaged && !alerting && !attacking) setSeatedPose()
    }
    if (standClip && !standAction) {
      freezeRootXZ(standClip)
      standAction = mixer.clipAction(standClip)
      standAction.enabled = true
      standAction.setLoop(THREE.LoopRepeat, Infinity)
      standAction.clampWhenFinished = false
    }
    if (runClip && !runAction) {
      freezeRootXZ(runClip)
      runAction = mixer.clipAction(runClip)
      runAction.timeScale = 1.15
    }
    if (attackClip && !attackAction) {
      freezeRootXZ(attackClip)
      attackAction = mixer.clipAction(attackClip)
      attackAction.setLoop(THREE.LoopOnce, 1)
      attackAction.clampWhenFinished = true
      attackAction.timeScale = 1.0
    }
    if (hurtClip && !hurtAction) {
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

  const loader = new FBXLoader()
  loader.load(mainFbxUrl, (fbx) => {
    rootModel = fbx
    rootModel.scale.setScalar(0.01)
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
  })

  loader.load(sitFbxUrl, (fbx) => {
    if (fbx.animations.length > 0) sitClip = fbx.animations[0]
    tryBuildActions()
  })

  loader.load(standFbxUrl, (fbx) => {
    if (fbx.animations.length > 0) standClip = fbx.animations[0]
    tryBuildActions()
  })

  loader.load(runFbxUrl, (fbx) => {
    if (fbx.animations.length > 0) runClip = fbx.animations[0]
    tryBuildActions()
  })

  loader.load(attackFbxUrl, (fbx) => {
    if (fbx.animations.length > 0) attackClip = fbx.animations[0]
    tryBuildActions()
  })

  loader.load(hurtFbxUrl, (fbx) => {
    if (fbx.animations.length > 0) hurtClip = fbx.animations[0]
    tryBuildActions()
  })

  loader.load(deathFbxUrl, (fbx) => {
    if (fbx.animations.length > 0) deathClip = fbx.animations[0]
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
      if (inSightTrigger || aggroByHit) engaged = true
      if (dist > disengageRange) {
        engaged = false
        aggroByHit = false
      }

      if (!prevEngaged && engaged) {
        alerting = true
        alertTimer = alertDuration
        playAlertOnce()
      }

      if (prevEngaged && !engaged) {
        alerting = false
        alertTimer = 0
        if (attacking) endAttack()
        setSeatedPose()
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
        // 未激活：不播放任何动画
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
          const nx = group.position.x + _toPlayer.x * moveSpeed * dt
          const nz = group.position.z + _toPlayer.y * moveSpeed * dt
          if (!collision.check(nx, nz, 0.32, 0, collidable)) {
            group.position.x = nx
            group.position.z = nz
          }
        }
      }

      collidable.x = group.position.x
      collidable.z = group.position.z
    },

    getPosition() { return group.position },
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
      if (!engaged) aggroByHit = true
      return this.takeDamage(amount)
    },

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
