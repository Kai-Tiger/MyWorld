import * as THREE from 'three'
import { BALANCE } from '../config/balance.js'

// 预分配复用向量，避免每帧每个 NPC 创建临时对象
const _toOrigin = new THREE.Vector2()

/**
 * createNPC
 * 简单 NPC：在原地随机游荡，靠近玩家时显示对话气泡。
 */
export function createNPC(scene, { x = 0, z = 0, color = 0xff6b6b, name = 'NPC', speed = 1.2, wanderRadius = 2.5, getTerrainHeight = null, maxHp = BALANCE.npc.normal.maxHp } = {}) {
  const group = new THREE.Group()

  // 阴影
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.3, 12),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.15 })
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = 0.01
  group.add(shadow)

  const lockRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.018, 8, 28),
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

  // 身体
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.2, 0.45, 4, 8),
    new THREE.MeshLambertMaterial({ color })
  )
  body.position.y = 0.6
  body.castShadow = true
  group.add(body)

  // 头
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 8, 8),
    new THREE.MeshLambertMaterial({ color: 0xffcc99 })
  )
  head.position.y = 1.18
  head.castShadow = true
  group.add(head)

  // 眼睛
  ;[-0.07, 0.07].forEach(ex => {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 5, 5),
      new THREE.MeshBasicMaterial({ color: 0x222222 })
    )
    eye.position.set(ex, 1.21, 0.17)
    group.add(eye)
  })

  // 腿
  const legs = []
  ;[[-0.1, 0], [0.1, 0]].forEach(([lx]) => {
    const leg = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.08, 0.25, 4, 6),
      new THREE.MeshLambertMaterial({ color: 0x444488 })
    )
    leg.position.set(lx, 0.18, 0)
    group.add(leg)
    legs.push(leg)
  })

  group.position.set(x, 0, z)
  scene.add(group)

  if (getTerrainHeight) {
    group.position.y = getTerrainHeight(x, z)
  }

  // 动态碰撞体，位置每帧同步，由外部注册到 CollisionSystem
  const collidable = { x, z, r: 0.32 }

  // ── 内部状态 ──────────────────────────────────────
  const origin = new THREE.Vector3(x, 0, z)
  let walkTime  = 0
  let wanderDir = new THREE.Vector2(Math.random() - 0.5, Math.random() - 0.5).normalize()
  let wanderTimer = 0
  const WANDER_SPEED  = speed
  const WANDER_RADIUS = wanderRadius
  const TALK_DISTANCE = 2.5
  let talking = false
  let focused = false
  let hp = maxHp
  const hitRadius = BALANCE.npc.normal.hitRadius
  let alive = true
  let hitShakeTime = 0
  const HIT_SHAKE_DURATION = 0.22
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

  function getShakeYaw(dt) {
    if (hitShakeTime <= 0) return 0
    hitShakeTime = Math.max(0, hitShakeTime - dt)
    const t = 1 - hitShakeTime / HIT_SHAKE_DURATION
    const amp = 0.22 * (hitShakeTime / HIT_SHAKE_DURATION)
    return Math.sin(t * Math.PI * 6) * amp
  }

  return {
    update(dt, player, collision) {
      if (!alive) return
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
          _toOrigin.set(playerPos.x - group.position.x, playerPos.z - group.position.z).normalize()
          group.rotation.y = Math.atan2(_toOrigin.x, _toOrigin.y) + shakeYaw
          focused = true
        } else {
          focused = false
        }
        if (!talking) {
          legs[0].rotation.x = 0
          legs[1].rotation.x = 0
        }
        return
      }

      // 游荡逻辑：每隔一段时间换方向
      wanderTimer -= dt
      if (wanderTimer <= 0) {
        wanderDir.set(Math.random() - 0.5, Math.random() - 0.5).normalize()
        wanderTimer = 1.5 + Math.random() * 2
      }

      // 偏向原点，防止走太远（复用模块级向量，不产生 GC）
      _toOrigin.set(origin.x - group.position.x, origin.z - group.position.z)
      const distFromOrigin = _toOrigin.length()
      if (distFromOrigin > WANDER_RADIUS) {
        _toOrigin.normalize()
        wanderDir.lerp(_toOrigin, 0.3)
      }

      const nx = group.position.x + wanderDir.x * WANDER_SPEED * dt
      const nz = group.position.z + wanderDir.y * WANDER_SPEED * dt
      if (!collision.check(nx, nz, 0.25, 0, collidable)) {
        group.position.x = nx
        group.position.z = nz
      } else {
        wanderTimer = 0
      }
      collidable.x = group.position.x
      collidable.z = group.position.z
      group.rotation.y = Math.atan2(wanderDir.x, wanderDir.y) + shakeYaw
      walkTime += dt * 5

      const swing = Math.sin(walkTime) * 0.4
      legs[0].rotation.x =  swing
      legs[1].rotation.x = -swing
    },

    getPosition() {
      return group.position
    },

    getName() {
      return name
    },

    getColor() {
      return color
    },

    getHeadWorldPos() {
      const p = group.position
      return { x: p.x, y: p.y + 1.5, z: p.z }
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
      if (playerPos) {
        const dx = playerPos.x - group.position.x
        const dz = playerPos.z - group.position.z
        group.rotation.y = Math.atan2(dx, dz)
      }
      talking = true
    },

    endTalk() {
      talking = false
    },

    collidable,
  }
}
