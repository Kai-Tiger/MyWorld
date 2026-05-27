import * as THREE from 'three'

export function createFishingRod(scene) {
  const ROD_LENGTH = 1.5

  // ── 竿身 ──────────────────────────────────────────
  const rodGroup = new THREE.Group()
  rodGroup.visible = false

  const rodMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.03, ROD_LENGTH, 6),
    new THREE.MeshLambertMaterial({ color: 0x5a3010 })
  )
  // 底端在组原点，顶端在局部 (0, ROD_LENGTH, 0)
  rodMesh.position.y = ROD_LENGTH / 2
  rodGroup.add(rodMesh)

  scene.add(rodGroup)

  // ── 鱼线（scene 空间，两顶点 Line）────────────────
  const linePosArr = new Float32Array(6)
  const lineGeo = new THREE.BufferGeometry()
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePosArr, 3))
  const fishLine = new THREE.Line(
    lineGeo,
    new THREE.LineBasicMaterial({ color: 0xcccccc })
  )
  fishLine.visible = false
  scene.add(fishLine)

  // ── 浮漂（红上白下）──────────────────────────────
  const bobberGroup = new THREE.Group()

  const bobTop = new THREE.Mesh(
    new THREE.SphereGeometry(0.065, 8, 6),
    new THREE.MeshLambertMaterial({ color: 0xdd2222 })
  )
  bobberGroup.add(bobTop)

  const bobBot = new THREE.Mesh(
    new THREE.SphereGeometry(0.065, 8, 6),
    new THREE.MeshLambertMaterial({ color: 0xf5f5f0 })
  )
  bobBot.position.y = -0.07
  bobberGroup.add(bobBot)

  bobberGroup.visible = false
  scene.add(bobberGroup)

  // ── 内部状态 ──────────────────────────────────────
  const _tipWorld   = new THREE.Vector3()
  const _bobberBase = new THREE.Vector3()
  let   _castT      = 0

  return {
    show(playerPos, playerRotY, lakeConfig) {
      // 右手方向（player facing = (sin Y, 0, cos Y)，right = (cos Y, 0, -sin Y)）
      const rx = Math.cos(playerRotY)
      const rz = -Math.sin(playerRotY)

      rodGroup.position.set(
        playerPos.x + rx * 0.36,
        playerPos.y + 0.88,
        playerPos.z + rz * 0.36
      )
      rodGroup.rotation.y = playerRotY
      rodGroup.rotation.x = -0.9   // 初始：竿向后上方
      rodGroup.visible = true
      _castT = 0

      // 浮漂目标：朝水池方向前方 3 单位
      const dx  = lakeConfig.x - playerPos.x
      const dz  = lakeConfig.z - playerPos.z
      const len = Math.sqrt(dx * dx + dz * dz)
      _bobberBase.set(
        playerPos.x + (dx / len) * 3.0,
        0.05,
        playerPos.z + (dz / len) * 3.0
      )

      bobberGroup.visible = false
      fishLine.visible    = false
    },

    hide() {
      rodGroup.visible    = false
      bobberGroup.visible = false
      fishLine.visible    = false
    },

    update(dt, time, phase) {
      if (!rodGroup.visible) return

      if (phase === 'casting') {
        _castT = Math.min(_castT + dt / 0.8, 1)
        const te = _castT * _castT * (3 - 2 * _castT)
        rodGroup.rotation.x = -0.9 + te * 1.4   // -0.9 → 0.5

        if (_castT >= 1 && !bobberGroup.visible) {
          bobberGroup.position.copy(_bobberBase)
          bobberGroup.visible = true
          fishLine.visible    = true
        }
      }

      if (phase === 'waiting') {
        // 浮漂上下浮动
        bobberGroup.position.y = _bobberBase.y + Math.sin(time * 2.2) * 0.018

        // 竿尖世界坐标
        _tipWorld.set(0, ROD_LENGTH, 0)
        rodGroup.localToWorld(_tipWorld)

        // 更新鱼线两端
        const attr = lineGeo.attributes.position
        attr.setXYZ(0, _tipWorld.x, _tipWorld.y, _tipWorld.z)
        attr.setXYZ(1, bobberGroup.position.x, bobberGroup.position.y, bobberGroup.position.z)
        attr.needsUpdate = true
        lineGeo.computeBoundingSphere()
      }
    },
  }
}
