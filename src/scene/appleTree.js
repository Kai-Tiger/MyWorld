import * as THREE from 'three'

// 组合苹果模型：果身 + 高光 + 果梗 + 叶片
function makeAppleModel() {
  const g = new THREE.Group()

  // 果身（稍扁的球体）
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0xcc2020 })
  )
  body.scale.y = 0.88
  body.castShadow = true
  g.add(body)

  // 顶部凹陷（深色小球叠在顶部，模拟苹果顶部的凹窝）
  const dimple = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 7, 6),
    new THREE.MeshLambertMaterial({ color: 0x991010 })
  )
  dimple.position.y = 0.118
  g.add(dimple)

  // 高光（偏白小球，透明叠加在左上方）
  const shine = new THREE.Mesh(
    new THREE.SphereGeometry(0.048, 6, 5),
    new THREE.MeshLambertMaterial({ color: 0xff9999, transparent: true, opacity: 0.55 })
  )
  shine.position.set(-0.055, 0.07, 0.09)
  g.add(shine)

  // 果梗（细短圆柱）
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.016, 0.10, 5),
    new THREE.MeshLambertMaterial({ color: 0x5a3010 })
  )
  stem.position.y = 0.16
  stem.rotation.z = 0.18
  g.add(stem)

  // 叶片（贝塞尔叶形，绕梗倾斜）
  const leaf = new THREE.Mesh(
    makeLeafGeo(),
    new THREE.MeshLambertMaterial({ color: 0x3a8a20, side: THREE.DoubleSide })
  )
  leaf.position.set(0.06, 0.21, 0)
  leaf.rotation.set(0.2, 0.3, -0.5)
  g.add(leaf)

  return g
}

function makeLeafGeo() {
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  shape.bezierCurveTo(0.04, 0.03, 0.08, 0.035, 0.10, 0)
  shape.bezierCurveTo(0.08, -0.02, 0.04, -0.025, 0, 0)
  return new THREE.ShapeGeometry(shape)
}

export function createAppleTree(scene, x, z) {
  const group = new THREE.Group()

  const h = 2.8

  // 树根鼓包
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.30, 0.18, 7),
    new THREE.MeshLambertMaterial({ color: 0x8B4513 })
  )
  base.position.y = 0.09
  base.castShadow = true
  group.add(base)

  // 下段树干
  const trunkLow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.24, h * 0.30, 7),
    new THREE.MeshLambertMaterial({ color: 0x9B5a30 })
  )
  trunkLow.position.y = h * 0.15 + 0.18
  trunkLow.castShadow = true
  group.add(trunkLow)

  // 上段树干
  const trunkHigh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.14, h * 0.20, 6),
    new THREE.MeshLambertMaterial({ color: 0xaa6a40 })
  )
  trunkHigh.position.y = h * 0.35 + 0.18
  trunkHigh.rotation.z = (Math.random() - 0.5) * 0.06
  trunkHigh.castShadow = true
  group.add(trunkHigh)

  // 树冠组（用球体叠加，区别于普通锥形树）
  const crownGroup = new THREE.Group()
  crownGroup.position.y = h * 0.42 + 0.18

  const crownDefs = [
    { dy: 0,    r: 1.40, color: 0x3a7a1e },
    { dy: 0.50, r: 1.25, color: 0x4a8e24 },
    { dy: 0.95, r: 1.00, color: 0x55aa30 },
    { dy: 1.30, r: 0.68, color: 0x4a9a28 },
  ]
  crownDefs.forEach(({ dy, r, color }) => {
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(r, 10, 8),
      new THREE.MeshLambertMaterial({ color })
    )
    sphere.position.y = dy
    sphere.castShadow = true
    crownGroup.add(sphere)
  })

  // 6 个苹果，均匀散布在冠层内
  const apples = []
  for (let i = 0; i < 6; i++) {
    const angle  = (i / 6) * Math.PI * 2 + (Math.random() - 0.5) * 0.8
    const radius = 0.45 + Math.random() * 0.65
    const hy     = 0.15 + Math.random() * 1.1
    const apple  = makeAppleModel()
    apple.position.set(Math.cos(angle) * radius, hy, Math.sin(angle) * radius)
    // 果实朝外轻微倾斜，更自然
    apple.rotation.y = angle + Math.PI
    apple.rotation.z = (Math.random() - 0.5) * 0.3
    crownGroup.add(apple)
    apples.push({ mesh: apple, picked: false })
  }

  group.add(crownGroup)
  group.position.set(x, 0, z)
  scene.add(group)

  const windPhase = Math.random() * Math.PI * 2
  const windSpeed = 0.3 + Math.random() * 0.2

  return {
    group,
    crownGroup,
    windPhase,
    windSpeed,
    apples,
    getPosition() { return group.position },
    getNearestAppleWorldPos() {
      const unpicked = apples.find(a => !a.picked)
      if (!unpicked) return null
      const wp = new THREE.Vector3()
      unpicked.mesh.getWorldPosition(wp)
      return wp
    },
    update(time) {
      const sway = Math.sin(time * windSpeed       + windPhase) * 0.030
                 + Math.sin(time * windSpeed * 2.5 + windPhase) * 0.010
      crownGroup.rotation.z = sway
      crownGroup.rotation.x = Math.sin(time * windSpeed * 0.7 + windPhase + 1.2) * 0.015
    },
  }
}
