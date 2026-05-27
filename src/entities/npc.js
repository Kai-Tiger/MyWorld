import * as THREE from 'three'

/**
 * createNPC
 * 简单 NPC：在原地随机游荡，靠近玩家时显示对话气泡。
 */
export function createNPC(scene, { x = 0, z = 0, color = 0xff6b6b, name = 'NPC', speed = 1.2, wanderRadius = 2.5 } = {}) {
  const group = new THREE.Group()

  // 阴影
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.3, 12),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.15 })
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = 0.01
  group.add(shadow)

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

  // 动态碰撞体，位置每帧同步，由外部注册到 CollisionSystem
  const collidable = { x, z, r: 0.32 }

  // ── 名字标签（HTML Overlay，简单实现）────────────
  const label = document.createElement('div')
  label.textContent = name
  label.style.cssText = `
    position: absolute;
    color: white;
    font-size: 11px;
    font-family: monospace;
    background: rgba(0,0,0,0.55);
    padding: 2px 6px;
    border-radius: 4px;
    pointer-events: none;
    white-space: nowrap;
    transform: translateX(-50%);
    display: none;
  `
  document.getElementById('app').appendChild(label)

  // ── 内部状态 ──────────────────────────────────────
  const origin = new THREE.Vector3(x, 0, z)
  let walkTime  = 0
  let wanderDir = new THREE.Vector2(Math.random() - 0.5, Math.random() - 0.5).normalize()
  let wanderTimer = 0
  const WANDER_SPEED  = speed
  const WANDER_RADIUS = wanderRadius
  const TALK_DISTANCE = 2.5
  let talking = false

  return {
    update(dt, player, collision) {
      if (talking) return

      // 游荡逻辑：每隔一段时间换方向
      wanderTimer -= dt
      if (wanderTimer <= 0) {
        wanderDir.set(Math.random() - 0.5, Math.random() - 0.5).normalize()
        wanderTimer = 1.5 + Math.random() * 2
      }

      // 偏向原点，防止走太远
      const toOrigin = new THREE.Vector2(
        origin.x - group.position.x,
        origin.z - group.position.z
      )
      const distFromOrigin = toOrigin.length()
      if (distFromOrigin > WANDER_RADIUS) {
        toOrigin.normalize()
        wanderDir.lerp(toOrigin, 0.3)
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
      group.rotation.y = Math.atan2(wanderDir.x, wanderDir.y)
      walkTime += dt * 5

      const swing = Math.sin(walkTime) * 0.4
      legs[0].rotation.x =  swing
      legs[1].rotation.x = -swing

      const playerPos = player.getPosition()
      const dist = group.position.distanceTo(playerPos)

      if (dist < TALK_DISTANCE) {
        const toPlayer = new THREE.Vector2(
          playerPos.x - group.position.x,
          playerPos.z - group.position.z
        ).normalize()
        group.rotation.y = Math.atan2(toPlayer.x, toPlayer.y)
        label.style.display = 'block'
      } else {
        label.style.display = 'none'
      }

      const canvas = document.querySelector('canvas')
      const rect   = canvas.getBoundingClientRect()
      label.style.left = (rect.left + rect.width  * 0.5) + 'px'
      label.style.top  = (rect.top  + rect.height * 0.3) + 'px'
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

    startTalk(playerPos) {
      if (playerPos) {
        const dx = playerPos.x - group.position.x
        const dz = playerPos.z - group.position.z
        group.rotation.y = Math.atan2(dx, dz)
      }
      talking = true
      label.style.display = 'none'
    },

    endTalk() {
      talking = false
    },

    collidable,
  }
}
