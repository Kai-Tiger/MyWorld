import * as THREE from 'three'
import { BALANCE } from '../config/balance.js'
import { cloneFBX } from '../systems/modelAssets.js'

const _toPlayer = new THREE.Vector2()
const TALK_TURN_SPEED = 7.5

function lerpAngle(a, b, t) {
  const d = THREE.MathUtils.euclideanModulo(b - a + Math.PI, Math.PI * 2) - Math.PI
  return a + d * t
}

/**
 * createFBXNPC
 * 与 createNPC 接口完全一致，但用 FBX 模型替换程序几何体。
 * FBX 中的第一段动画（Take 001）自动循环播放。
 */
export function createFBXNPC(scene, {
  x = 0, z = 0,
  name       = 'NPC',
  modelPath  = '/models/npc1.fbx',
  rotY       = 0,
  speed      = 1.0,
  wanderRadius = 3.0,
  canWander = true,
  getTerrainHeight = null,
  maxHp = BALANCE.npc.fbx.maxHp,
  dialogueLines = [],
  repeatDialogueLine = '你怎么还在这里',
} = {}) {
  const group = new THREE.Group()
  group.position.set(x, 0, z)
  group.rotation.y = rotY
  scene.add(group)

  if (getTerrainHeight) {
    group.position.y = getTerrainHeight(x, z)
  }

  // 地面阴影
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.35, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 })
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = 0.01
  group.add(shadow)

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

  // FBX 加载
  let mixer = null
  cloneFBX(modelPath).then((fbx) => {
    fbx.scale.setScalar(0.01)
    const _nLights = []
    fbx.traverse(c => {
      if (c.isMesh) { c.castShadow = true; c.receiveShadow = true }
      if (c.isLight) _nLights.push(c)
    })
    _nLights.forEach(l => l.removeFromParent())
    group.add(fbx)

    if (fbx.animations.length > 0) {
      mixer = new THREE.AnimationMixer(fbx)
      const clip = fbx.animations[0]
      // 消除根运动：锁定 hips 的 XZ，只保留 Y（自然上下弹动）
      const hipsPos = clip.tracks.find(t => /hips.*position/i.test(t.name))
      if (hipsPos) {
        const baseX = hipsPos.values[0]
        const baseZ = hipsPos.values[2]
        for (let i = 0; i < hipsPos.values.length; i += 3) {
          hipsPos.values[i]     = baseX
          hipsPos.values[i + 2] = baseZ
        }
      }
      const action = mixer.clipAction(clip)
      action.timeScale = 0.5
      action.play()
    }
  }).catch((err) => {
    console.error(`Failed to load NPC model: ${modelPath}`, err)
  })

  // 动态碰撞体
  const collidable = { x, z, r: 0.4 }

  // 内部状态
  const origin    = new THREE.Vector3(x, 0, z)
  let wanderDir   = new THREE.Vector2(Math.random() - 0.5, Math.random() - 0.5).normalize()
  let wanderTimer = 0
  let talking     = false
  let focused     = false
  const TALK_DISTANCE = 2.5
  let hp = maxHp
  const hitRadius = BALANCE.npc.fbx.hitRadius
  let alive = true
  let hitShakeTime = 0
  const HIT_SHAKE_DURATION = 0.22
  let lockVisualState = 'hidden'
  let lockPulseTime = 0
  const homeYaw = rotY
  let dialogueCompleted = false
  const initialDialogueLines = Array.isArray(dialogueLines)
    ? dialogueLines.filter(line => typeof line === 'string' && line.trim().length > 0)
    : []

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

  function getShakeYaw(dt) {
    if (hitShakeTime <= 0) return 0
    hitShakeTime = Math.max(0, hitShakeTime - dt)
    const t = 1 - hitShakeTime / HIT_SHAKE_DURATION
    const amp = 0.22 * (hitShakeTime / HIT_SHAKE_DURATION)
    return Math.sin(t * Math.PI * 6) * amp
  }

  return {
    update(dt, player, collision, options = {}) {
      if (!alive) return
      if (mixer && !options.skipAnimation) mixer.update(dt)
      if (lockVisualState === 'locked') {
        lockPulseTime += dt
        const pulse = 1 + Math.sin(lockPulseTime * 8.0) * 0.06
        lockRing.scale.setScalar(pulse)
      } else {
        lockRing.scale.setScalar(1)
      }
      const shakeYaw = getShakeYaw(dt)
      if (getTerrainHeight) {
        group.position.y = getTerrainHeight(group.position.x, group.position.z)
      }
      const playerPos = player.getPosition()
      const distToPlayer = group.position.distanceTo(playerPos)
      if (talking || distToPlayer < TALK_DISTANCE || focused) {
        if (distToPlayer < TALK_DISTANCE || talking) {
          if (talking || canWander) {
            _toPlayer.set(playerPos.x - group.position.x, playerPos.z - group.position.z)
            if (_toPlayer.lengthSq() > 0.0001) {
              _toPlayer.normalize()
              const targetYaw = Math.atan2(_toPlayer.x, _toPlayer.y) + shakeYaw
              group.rotation.y = lerpAngle(group.rotation.y, targetYaw, Math.min(1, dt * TALK_TURN_SPEED))
            }
          } else {
            group.rotation.y = homeYaw + shakeYaw
          }
          focused = true
        } else {
          focused = false
        }
        return
      }

      if (!canWander) {
        collidable.x = group.position.x
        collidable.z = group.position.z
        group.rotation.y = homeYaw + shakeYaw
        return
      }

      // 游荡
      wanderTimer -= dt
      if (wanderTimer <= 0) {
        wanderDir.set(Math.random() - 0.5, Math.random() - 0.5).normalize()
        wanderTimer = 1.5 + Math.random() * 2
      }
      const toOrigin = new THREE.Vector2(
        origin.x - group.position.x,
        origin.z - group.position.z
      )
      if (toOrigin.length() > wanderRadius) {
        toOrigin.normalize()
        wanderDir.lerp(toOrigin, 0.3)
      }

      const nx = group.position.x + wanderDir.x * speed * dt
      const nz = group.position.z + wanderDir.y * speed * dt
      if (!collision.check(nx, nz, 0.3, 0, collidable)) {
        group.position.x = nx
        group.position.z = nz
      } else {
        wanderTimer = 0
      }
      collidable.x = group.position.x
      collidable.z = group.position.z
      group.rotation.y = Math.atan2(wanderDir.x, wanderDir.y) + shakeYaw
    },

    getPosition() { return group.position },

    getName()  { return name },

    getColor() { return 0xffd700 },

    getDialogueLines() {
      if (dialogueCompleted || initialDialogueLines.length === 0) return [repeatDialogueLine]
      return initialDialogueLines
    },

    completeDialogue() {
      dialogueCompleted = true
    },

    getHeadWorldPos() {
      const p = group.position
      return { x: p.x, y: p.y + 1.6, z: p.z }
    },

    getHp() {
      return hp
    },

    getMaxHp() {
      return maxHp
    },

    getHpRatio() {
      return maxHp > 0 ? hp / maxHp : 0
    },

    isAlive() {
      return alive && hp > 0
    },

    getHitRadius() {
      return hitRadius
    },

    takeDamage(amount) {
      hp = Math.max(0, hp - Math.max(0, amount))
      if (hp <= 0) {
        alive = false
        talking = false
        focused = false
        applyLockVisualState('hidden')
        group.visible = false
      }
      return hp
    },

    onHit(amount) {
      hitShakeTime = HIT_SHAKE_DURATION
      return this.takeDamage(amount)
    },

    die() {
      if (!alive) return
      hp = 0
      alive = false
      talking = false
      focused = false
      applyLockVisualState('hidden')
      group.visible = false
    },

    setLockVisualState(state) {
      if (!alive) {
        applyLockVisualState('hidden')
        return
      }
      applyLockVisualState(state)
    },

    startTalk(playerPos) {
      talking = true
    },

    endTalk() { talking = false },

    collidable,
  }
}
