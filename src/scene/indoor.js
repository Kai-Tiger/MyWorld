import * as THREE from 'three'

// ── 贴图生成 ──────────────────────────────────────────

function makeFloorTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512; canvas.height = 512
  const ctx = canvas.getContext('2d')
  const plankH = 512 / 5
  const colors = ['#c8945a', '#be8a52', '#d09e62', '#c49058', '#ba8a50']
  colors.forEach((c, i) => {
    ctx.fillStyle = c
    ctx.fillRect(0, i * plankH, 512, plankH)
    // 木纹线
    ctx.strokeStyle = 'rgba(80,40,10,0.18)'
    ctx.lineWidth = 2
    ctx.strokeRect(1, i * plankH + 1, 510, plankH - 2)
    // 细纹
    for (let x = 40; x < 512; x += 60 + Math.floor(Math.random() * 30)) {
      ctx.beginPath()
      ctx.moveTo(x, i * plankH)
      ctx.lineTo(x + 10, i * plankH + plankH)
      ctx.strokeStyle = 'rgba(80,40,10,0.07)'
      ctx.lineWidth = 1
      ctx.stroke()
    }
  })
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(2, 1.5)
  return tex
}

function makeRugTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const ctx = canvas.getContext('2d')
  // 底色渐变
  const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  grad.addColorStop(0, '#f4a0c0')
  grad.addColorStop(0.5, '#d88aaa')
  grad.addColorStop(1, '#c070a0')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 256, 256)
  // 同心圆装饰
  for (let r = 20; r < 115; r += 22) {
    ctx.beginPath()
    ctx.arc(128, 128, r, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.lineWidth = 5
    ctx.stroke()
  }
  // 小花
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
    const px = 128 + Math.cos(angle) * 85
    const py = 128 + Math.sin(angle) * 85
    ctx.beginPath()
    ctx.arc(px, py, 7, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,240,200,0.6)'
    ctx.fill()
  }
  return new THREE.CanvasTexture(canvas)
}

// ── 家具辅助函数 ──────────────────────────────────────

function addMesh(scene, geo, mat, x, y, z, rx = 0, ry = 0) {
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(x, y, z)
  if (rx) mesh.rotation.x = rx
  if (ry) mesh.rotation.y = ry
  mesh.castShadow = true
  mesh.receiveShadow = true
  scene.add(mesh)
  return mesh
}

function makeMat(color, opts = {}) {
  return new THREE.MeshLambertMaterial({ color, ...opts })
}

// ── 家具创建 ──────────────────────────────────────────

function makeTable(scene) {
  // 桌面
  addMesh(scene, new THREE.CylinderGeometry(0.72, 0.72, 0.08, 20), makeMat(0xfff4e8), 0, 0.76, 0.5)
  // 桌腿（中央单腿）
  addMesh(scene, new THREE.CylinderGeometry(0.06, 0.1, 0.72, 8), makeMat(0xe8d0a8), 0, 0.36, 0.5)
  // 底座
  addMesh(scene, new THREE.CylinderGeometry(0.3, 0.3, 0.05, 12), makeMat(0xe8d0a8), 0, 0.025, 0.5)
}

function makeTeaCup(scene, x, z, color) {
  // 杯碟
  addMesh(scene, new THREE.CylinderGeometry(0.13, 0.13, 0.02, 12), makeMat(0xf8f8f8), x, 0.81, z)
  // 杯身
  addMesh(scene, new THREE.CylinderGeometry(0.07, 0.055, 0.11, 10), makeMat(color), x, 0.865, z)
}

function makeSofa(scene) {
  const mat = makeMat(0x98ddca)  // 薄荷绿
  const matArm = makeMat(0x7ecfba)
  // 座面
  addMesh(scene, new THREE.BoxGeometry(0.85, 0.32, 1.7), mat, 2.9, 0.22, 0)
  // 靠背
  addMesh(scene, new THREE.BoxGeometry(0.22, 0.6, 1.7), matArm, 3.5, 0.56, 0)
  // 左扶手
  addMesh(scene, new THREE.BoxGeometry(0.85, 0.2, 0.22), matArm, 2.9, 0.48, -0.76)
  // 右扶手
  addMesh(scene, new THREE.BoxGeometry(0.85, 0.2, 0.22), matArm, 2.9, 0.48, 0.76)
  // 靠垫（粉色）
  addMesh(scene, new THREE.BoxGeometry(0.3, 0.14, 0.52), makeMat(0xffb7c5), 3.0, 0.45, -0.36)
  // 靠垫（黄色）
  addMesh(scene, new THREE.BoxGeometry(0.3, 0.14, 0.52), makeMat(0xffd580), 3.0, 0.45, 0.36)
}

function makeBookshelf(scene) {
  const woodMat = makeMat(0xd4a76a)
  // 主体背板
  addMesh(scene, new THREE.BoxGeometry(0.15, 1.6, 1.3), woodMat, -3.35, 0.8, -2.0)
  // 顶板 + 底板
  addMesh(scene, new THREE.BoxGeometry(0.3, 0.06, 1.3), woodMat, -3.27, 1.57, -2.0)
  addMesh(scene, new THREE.BoxGeometry(0.3, 0.06, 1.3), woodMat, -3.27, 0.03, -2.0)
  // 中层隔板
  addMesh(scene, new THREE.BoxGeometry(0.3, 0.06, 1.3), woodMat, -3.27, 0.8, -2.0)

  // 书（上层 3 本）
  const bookColors = [0xe74c6f, 0x3a8fd4, 0x4caf50, 0xf39c12, 0x9b59b6]
  const bookW = [0.16, 0.14, 0.18, 0.13, 0.15]
  let bz = -2.5
  bookColors.forEach((c, i) => {
    const layer = i < 3 ? 1.15 : 0.38
    addMesh(scene, new THREE.BoxGeometry(0.2, 0.48, bookW[i]), makeMat(c), -3.22, layer, bz)
    bz += bookW[i] + 0.04
    if (i === 2) bz = -2.5
  })
}

function makeWindow(scene) {
  // 窗框外
  addMesh(scene, new THREE.BoxGeometry(1.3, 1.1, 0.08), makeMat(0x9e7040), 1.2, 1.55, -2.97)
  // 玻璃
  addMesh(scene,
    new THREE.PlaneGeometry(1.0, 0.85),
    makeMat(0xc5e8ff, { transparent: true, opacity: 0.55 }),
    1.2, 1.55, -2.93
  )
  // 窗台
  addMesh(scene, new THREE.BoxGeometry(1.4, 0.07, 0.25), makeMat(0xb8905a), 1.2, 1.03, -2.85)
  // 窗框十字
  addMesh(scene, new THREE.BoxGeometry(0.05, 0.85, 0.05), makeMat(0x9e7040), 1.2, 1.55, -2.92)
  addMesh(scene, new THREE.BoxGeometry(1.0, 0.05, 0.05), makeMat(0x9e7040), 1.2, 1.55, -2.92)
}

function makeFlowerPot(scene, x, z) {
  // 花盆
  addMesh(scene, new THREE.CylinderGeometry(0.1, 0.075, 0.16, 8), makeMat(0xe07840), x, 1.16, z)
  // 泥土
  addMesh(scene, new THREE.CylinderGeometry(0.09, 0.09, 0.03, 8), makeMat(0x7a5030), x, 1.245, z)
  // 茎
  addMesh(scene, new THREE.CylinderGeometry(0.015, 0.015, 0.25, 6), makeMat(0x4a9a30), x, 1.37, z)
  // 花
  addMesh(scene, new THREE.SphereGeometry(0.12, 8, 8), makeMat(0xff69b4), x, 1.5, z)
}

function makeCornerPlant(scene, x, z) {
  // 花盆
  addMesh(scene, new THREE.CylinderGeometry(0.2, 0.15, 0.3, 8), makeMat(0xc87040), x, 0.15, z)
  // 叶片（三层锥）
  addMesh(scene, new THREE.ConeGeometry(0.4, 0.5, 7), makeMat(0x3a8a30), x, 0.7, z)
  addMesh(scene, new THREE.ConeGeometry(0.3, 0.45, 7), makeMat(0x4a9a3a), x, 0.95, z)
  addMesh(scene, new THREE.ConeGeometry(0.18, 0.4, 7), makeMat(0x5aaa40), x, 1.15, z)
}

function makeHangingLamp(scene) {
  // 灯线
  addMesh(scene, new THREE.CylinderGeometry(0.015, 0.015, 0.6, 6), makeMat(0x888888), 0, 2.7, 0)
  // 灯罩
  addMesh(scene,
    new THREE.SphereGeometry(0.22, 12, 12),
    makeMat(0xffeea0, { transparent: true, opacity: 0.88 }),
    0, 2.4, 0
  )
}

function makeSmallTable(scene) {
  // 边几（沙发旁）
  addMesh(scene, new THREE.CylinderGeometry(0.28, 0.28, 0.06, 10), makeMat(0xf0e0c0), 3.0, 0.65, 1.4)
  addMesh(scene, new THREE.CylinderGeometry(0.04, 0.06, 0.62, 6), makeMat(0xe0c890), 3.0, 0.31, 1.4)
  // 小台灯
  addMesh(scene, new THREE.CylinderGeometry(0.06, 0.08, 0.22, 8), makeMat(0xd0c0a0), 3.0, 0.87, 1.4)
  addMesh(scene,
    new THREE.ConeGeometry(0.18, 0.2, 10, 1, true),
    makeMat(0xffeecc, { side: THREE.DoubleSide }),
    3.0, 1.0, 1.4
  )
}

// ── 主函数 ────────────────────────────────────────────

export function createIndoorScene() {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0xfff0e0)

  // 灯光
  scene.add(new THREE.AmbientLight(0xfff5e0, 1.0))
  const pointLight = new THREE.PointLight(0xffddaa, 2.5, 18)
  pointLight.position.set(0, 2.4, 0)
  scene.add(pointLight)
  const fillLight = new THREE.DirectionalLight(0xffeedd, 0.4)
  fillLight.position.set(-5, 8, 5)
  scene.add(fillLight)

  // 地板
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 6),
    new THREE.MeshLambertMaterial({ map: makeFloorTexture() })
  )
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  scene.add(floor)

  // 地毯
  const rug = new THREE.Mesh(
    new THREE.CircleGeometry(1.5, 32),
    new THREE.MeshLambertMaterial({ map: makeRugTexture() })
  )
  rug.rotation.x = -Math.PI / 2
  rug.position.set(0, 0.004, 0.5)
  scene.add(rug)

  // 墙体（后墙 + 左墙）
  const wallMat = makeMat(0xfff4e8)
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(8, 3.2), wallMat)
  backWall.position.set(0, 1.6, -3)
  backWall.receiveShadow = true
  scene.add(backWall)

  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 3.2), wallMat)
  leftWall.rotation.y = Math.PI / 2
  leftWall.position.set(-4, 1.6, 0)
  leftWall.receiveShadow = true
  scene.add(leftWall)

  // 踢脚线
  const skirtMat = makeMat(0xd4b896)
  addMesh(scene, new THREE.BoxGeometry(8.05, 0.12, 0.05), skirtMat, 0, 0.06, -3)
  addMesh(scene, new THREE.BoxGeometry(0.05, 0.12, 6.05), skirtMat, -4, 0.06, 0)

  // 家具
  makeTable(scene)
  makeTeaCup(scene, -0.28, 0.25, 0xadd8e6)
  makeTeaCup(scene,  0.28, 0.72, 0xffb7c5)
  makeSofa(scene)
  makeBookshelf(scene)
  makeWindow(scene)
  makeFlowerPot(scene, 0.6, -2.86)
  makeCornerPlant(scene, -3.3, 2.5)
  makeCornerPlant(scene,  3.3, -2.5)
  makeHangingLamp(scene)
  makeSmallTable(scene)

  // 家具碰撞圆（x, z 与家具中心对应）
  const collidables = [
    { x:  0.0, z:  0.5, r: 0.78 },   // 圆桌
    { x:  2.9, z:  0.0, r: 0.75 },   // 沙发座面
    { x:  3.5, z:  0.0, r: 0.40 },   // 沙发靠背
    { x: -3.3, z: -2.0, r: 0.72 },   // 书架
    { x: -3.3, z:  2.5, r: 0.38 },   // 角落植物（左前）
    { x:  3.3, z: -2.5, r: 0.38 },   // 角落植物（右后）
    { x:  3.0, z:  1.4, r: 0.38 },   // 边几
  ]

  // 摄像机（等轴测正交，与室外一致）
  const aspect = window.innerWidth / window.innerHeight
  const s = 5
  const camera = new THREE.OrthographicCamera(
    -s * aspect, s * aspect, s, -s, 0.1, 200
  )
  camera.position.set(10, 10, 10)
  camera.lookAt(0, 0, 0)

  return { scene, camera, collidables }
}
