import * as THREE from 'three'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'

/**
 * createFBXNPC
 * 与 createNPC 接口完全一致，但用 FBX 模型替换程序几何体。
 * FBX 中的第一段动画（Take 001）自动循环播放。
 */
export function createFBXNPC(scene, {
  x = 0, z = 0,
  name       = 'NPC',
  modelPath  = '/models/npc1.fbx',
  speed      = 1.0,
  wanderRadius = 3.0,
} = {}) {
  const group = new THREE.Group()
  group.position.set(x, 0, z)
  scene.add(group)

  // 地面阴影
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.35, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 })
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = 0.01
  group.add(shadow)

  // FBX 加载
  let mixer = null
  const loader = new FBXLoader()
  loader.load(modelPath, (fbx) => {
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
  })

  // 名字标签（与现有 NPC 保持一致）
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

  // 动态碰撞体
  const collidable = { x, z, r: 0.4 }

  // 内部状态
  const origin    = new THREE.Vector3(x, 0, z)
  let wanderDir   = new THREE.Vector2(Math.random() - 0.5, Math.random() - 0.5).normalize()
  let wanderTimer = 0
  let talking     = false
  const TALK_DISTANCE = 2.5

  return {
    update(dt, player, collision) {
      if (mixer) mixer.update(dt)
      if (talking) return

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
      group.rotation.y = Math.atan2(wanderDir.x, wanderDir.y)

      // 靠近玩家时朝向玩家并显示名字
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

    getPosition() { return group.position },

    getName()  { return name },

    getColor() { return 0xffd700 },

    getHeadWorldPos() {
      const p = group.position
      return { x: p.x, y: p.y + 1.6, z: p.z }
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

    endTalk() { talking = false },

    collidable,
  }
}
