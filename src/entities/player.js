import * as THREE from 'three'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'

export function createPlayer(scene) {
  const SPEED = 5.0

  const group = new THREE.Group()
  scene.add(group)

  // 加载 FBX 模型
  let mixer = null
  let walkAction = null
  let idleAction = null
  let currentAction = null

  const loader = new FBXLoader()
  loader.load('/models/player.fbx', (object) => {
    object.scale.setScalar(0.01) // FBX 通常以厘米为单位，缩小到米
    const _pLights = []
    object.traverse(c => {
      if (c.isMesh) c.castShadow = true
      if (c.isLight) _pLights.push(c)
    })
    _pLights.forEach(l => l.removeFromParent())
    group.add(object)

    mixer = new THREE.AnimationMixer(object)
    idleAction = mixer.clipAction(object.animations[0])
    currentAction = idleAction
    currentAction.play()

    // 行走动画从单独文件加载（共用同一个 mixer，Mixamo 骨骼名一致）
    const walkLoader = new FBXLoader()
    walkLoader.load('/models/player_walk.fbx', (walkFbx) => {
      walkAction = mixer.clipAction(walkFbx.animations[0])
      walkAction.timeScale = 2  // 调整行走动画速度，1.0 = 原速
    })
  })

  function switchAction(next) {
    if (!next || next === currentAction) return
    next.reset().fadeIn(0.2).play()
    currentAction.fadeOut(0.2)
    currentAction = next
  }

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

  return {
    update(dt, input, collision, getTerrainHeight = null, selfCollidable = null) {
      let dx = 0, dz = 0
      if (input.isPressed('up'))    { dx -= 1; dz -= 1 }
      if (input.isPressed('down'))  { dx += 1; dz += 1 }
      if (input.isPressed('left'))  { dx -= 1; dz += 1 }
      if (input.isPressed('right')) { dx += 1; dz -= 1 }

      const moving = dx !== 0 || dz !== 0
      currentSpeed = 0
      const effectiveSpeed = inWater ? SPEED * 0.45 : SPEED

      if (moving) {
        const len = Math.sqrt(dx * dx + dz * dz)
        dx /= len
        dz /= len

        const nx = group.position.x + dx * effectiveSpeed * dt
        const nz = group.position.z + dz * effectiveSpeed * dt

        const targetTerrainH = getTerrainHeight ? getTerrainHeight(nx, nz) : 0
        const heightDiff = targetTerrainH - group.position.y

        const blocker = collision.getBlockingCollidable(nx, nz, 0.4, group.position.y, selfCollidable)

        if (!blocker) {
          if (heightDiff <= AUTO_STEP) {
            group.position.x = nx
            group.position.z = nz
            currentSpeed = effectiveSpeed
          }
        } else if (blocker.h !== undefined && heightDiff > 0 && heightDiff <= AUTO_STEP) {
          group.position.x = nx
          group.position.z = nz
          vy = 0
          onGround = true
          currentSpeed = effectiveSpeed
        }

        group.rotation.y = Math.atan2(dx, dz)
        // if (mixer) mixer.timeScale = 1
        switchAction(walkAction)
      } else {
        switchAction(idleAction)
      }

      // 跳跃
      const spaceNow = input.isPressed('Space')
      if (spaceNow && !spaceWasPressed && onGround) {
        vy = JUMP_SPEED
        onGround = false
      }
      spaceWasPressed = spaceNow

      // 重力
      const terrainH = getTerrainHeight ? getTerrainHeight(group.position.x, group.position.z) : 0
      const surfaceH = Math.max(collision.getSurfaceHeight(group.position.x, group.position.z), terrainH)

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

      if (mixer) mixer.update(dt)
    },

    getPosition() {
      return group.position
    },

    getSpeed() {
      return currentSpeed
    },

    getGroup() {
      return group
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
      if (!idleAction) return
      switchAction(idleAction)
    },

    faceToward(targetX, targetZ) {
      const dx = targetX - group.position.x
      const dz = targetZ - group.position.z
      group.rotation.y = Math.atan2(dx, dz)
    },

    updateAnimation(dt) {
      if (mixer) mixer.update(dt)
    },
  }
}
