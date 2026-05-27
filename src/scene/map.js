import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { rocks as rockPositions, campfires as campfirePositions, ponds as pondDefs, fishingLake } from '../config/world.js'
import { createTerrain } from './terrain.js'


// ── 工具函数 ──────────────────────────────────────────

// 沿 CatmullRom 曲线生成顶点带路面，返回采样点和切线供草地使用
function makeCurvedPath(scene, controlPoints, width = 1.5) {
  const curve = new THREE.CatmullRomCurve3(
    controlPoints.map(([x, z]) => new THREE.Vector3(x, 0, z))
  )

  const SEGS = 60
  const pts      = curve.getPoints(SEGS)
  const tangents = Array.from({ length: SEGS + 1 }, (_, i) => curve.getTangent(i / SEGS))

  const verts = [], uvs = [], idxs = []
  for (let i = 0; i <= SEGS; i++) {
    const p = pts[i]
    const t = tangents[i]
    const rx = -t.z, rz = t.x   // XZ 平面垂直向量（已归一化）
    verts.push(
      p.x - rx * width / 2, 0.015, p.z - rz * width / 2,
      p.x + rx * width / 2, 0.015, p.z + rz * width / 2
    )
    uvs.push(0, i / SEGS, 1, i / SEGS)
    if (i < SEGS) {
      const a = i * 2
      idxs.push(a, a + 1, a + 2,  a + 1, a + 3, a + 2)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs,   2))
  geo.setIndex(idxs)
  geo.computeVertexNormals()

  const mat  = new THREE.MeshStandardMaterial({ color: 0xb8a882, roughness: 0.95, metalness: 0 })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.receiveShadow = true
  scene.add(mesh)

  return { pts, tangents, width }
}

// 收集路边 + 路缝草地的位置 [x, z, scale]
function collectPathGrass({ pts, tangents, width }) {
  const result = []
  for (let i = 0; i < pts.length; i += 2) {
    const p = pts[i], t = tangents[i]
    const rx = -t.z, rz = t.x

    for (const side of [-1, 1]) {
      const n = 1 + Math.floor(Math.random() * 3)
      for (let k = 0; k < n; k++) {
        const eOff = width / 2 * side + (Math.random() - 0.5) * 0.6
        const aOff = (Math.random() - 0.5) * 1.0
        result.push([
          p.x + rx * eOff + t.x * aOff,
          p.z + rz * eOff + t.z * aOff,
          0.6 + Math.random() * 0.9,
        ])
      }
    }
    if (Math.random() < 0.25) {   // 路缝稀疏草
      result.push([
        p.x + (Math.random() - 0.5) * width * 0.5,
        p.z + (Math.random() - 0.5) * width * 0.5,
        0.35 + Math.random() * 0.35,
      ])
    }
  }
  return result
}

// 用 InstancedMesh 一次性绘制所有草叶（交叉双平面）
function makeGrass(scene, placements) {
  if (!placements.length) return

  const h = 0.22, w = 0.18
  const pos = new Float32Array([
    -w/2, 0, 0,   w/2, 0, 0,   w/2, h, 0,
    -w/2, 0, 0,   w/2, h, 0,  -w/2, h, 0,
     0, 0,-w/2,   0, 0, w/2,   0, h, w/2,
     0, 0,-w/2,   0, h, w/2,   0, h,-w/2,
  ])
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.computeVertexNormals()

  const mat  = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide })
  const mesh = new THREE.InstancedMesh(geo, mat, placements.length)
  const dummy = new THREE.Object3D()
  const color = new THREE.Color()
  const palette = [0x5d8a3c, 0x4a7a2e, 0x6a9a40, 0x527835, 0x7aaa50]

  placements.forEach(([x, z, scale], i) => {
    dummy.position.set(x, 0, z)
    dummy.rotation.y = Math.random() * Math.PI * 2
    dummy.scale.setScalar(scale)
    dummy.updateMatrix()
    mesh.setMatrixAt(i, dummy.matrix)
    mesh.setColorAt(i, color.setHex(palette[i % palette.length]))
  })

  mesh.instanceMatrix.needsUpdate = true
  mesh.instanceColor.needsUpdate  = true
  scene.add(mesh)
}


// 返回 { group, crownGroup, windPhase, windSpeed } 供风动画使用
function makeTree(scene, x, z, h = 3, r = 1.2) {
  const group = new THREE.Group()

  // 树根鼓包
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.34, 0.2, 7),
    new THREE.MeshLambertMaterial({ color: 0x7a4f2a })
  )
  base.position.y = 0.1
  base.castShadow = true
  group.add(base)

  // 下段树干（粗）
  const trunkLow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.26, h * 0.32, 7),
    new THREE.MeshLambertMaterial({ color: 0x8B5E3C })
  )
  trunkLow.position.y = h * 0.16 + 0.2
  trunkLow.castShadow = true
  group.add(trunkLow)

  // 上段树干（细，轻微倾斜）
  const trunkHigh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.16, h * 0.22, 6),
    new THREE.MeshLambertMaterial({ color: 0x9e6d45 })
  )
  trunkHigh.position.y = h * 0.37 + 0.2
  trunkHigh.rotation.z = (Math.random() - 0.5) * 0.08
  trunkHigh.castShadow = true
  group.add(trunkHigh)

  // 树冠 group（整体随风摆动）
  const crownGroup = new THREE.Group()
  crownGroup.position.y = h * 0.45 + 0.2

  const crownColors = [0x1e6b1e, 0x2d8a2d, 0x3aa03a, 0x237823, 0x4aaa4a]
  const layers = [
    { dy: 0,         pr: r,         seg: 8 },
    { dy: h * 0.18,  pr: r * 0.78,  seg: 7 },
    { dy: h * 0.33,  pr: r * 0.58,  seg: 7 },
    { dy: h * 0.46,  pr: r * 0.40,  seg: 6 },
    { dy: h * 0.56,  pr: r * 0.24,  seg: 6 },
  ]
  layers.forEach(({ dy, pr, seg }, i) => {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(pr, h * 0.32, seg),
      new THREE.MeshLambertMaterial({ color: crownColors[i] })
    )
    cone.position.y = dy
    cone.rotation.y = (Math.random() * Math.PI * 2)
    cone.castShadow = true
    crownGroup.add(cone)
  })

  group.add(crownGroup)
  group.position.set(x, 0, z)
  group.rotation.y = Math.random() * Math.PI * 2
  scene.add(group)

  return {
    group,
    crownGroup,
    windPhase: Math.random() * Math.PI * 2,
    windSpeed: 0.35 + Math.random() * 0.3,
  }
}

function makeHouse(scene, x, z, rotY = 0) {
  const group = new THREE.Group()

  const wallMat  = new THREE.MeshLambertMaterial({ color: 0xf0dbb0 })
  const roofMat  = new THREE.MeshLambertMaterial({ color: 0xb03020 })
  const woodMat  = new THREE.MeshLambertMaterial({ color: 0x7a4820 })
  const glassMat = new THREE.MeshLambertMaterial({ color: 0xb8e0f8, transparent: true, opacity: 0.75 })
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x999080 })

  // 地基
  const foundation = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.2, 2.7),
    stoneMat
  )
  foundation.position.y = 0.1
  foundation.receiveShadow = true
  group.add(foundation)

  // 墙体
  const wall = new THREE.Mesh(new THREE.BoxGeometry(3, 2.1, 2.5), wallMat)
  wall.position.y = 1.15
  wall.castShadow = true
  wall.receiveShadow = true
  group.add(wall)

  // 屋顶
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.3, 1.5, 4), roofMat)
  roof.position.y = 2.95
  roof.rotation.y = Math.PI / 4
  roof.castShadow = true
  group.add(roof)

  // 屋檐（压住墙顶的薄板）
  const eave = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 0.1, 2.9),
    new THREE.MeshLambertMaterial({ color: 0x8b5030 })
  )
  eave.position.y = 2.25
  eave.castShadow = true
  group.add(eave)

  // 烟囱
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.0, 0.35), stoneMat)
  chimney.position.set(0.7, 3.2, -0.4)
  chimney.castShadow = true
  group.add(chimney)
  const chimneyTop = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.1, 0.45), stoneMat)
  chimneyTop.position.set(0.7, 3.75, -0.4)
  group.add(chimneyTop)

  // 门框
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.08, 0.08), woodMat)
  doorFrame.position.set(0, 0.54, 1.29)
  group.add(doorFrame)
  // 门板
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.96, 0.07), woodMat)
  door.position.set(0, 0.52, 1.32)
  group.add(door)
  // 门把手
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6),
    new THREE.MeshLambertMaterial({ color: 0xd4a520 }))
  knob.position.set(0.22, 0.5, 1.36)
  group.add(knob)

  // 台阶
  const step = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.35), stoneMat)
  step.position.set(0, 0.06, 1.55)
  step.receiveShadow = true
  group.add(step)

  // 窗户（含窗框 + 十字横档）
  ;[-0.9, 0.9].forEach(wx => {
    // 窗框
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.52, 0.08), woodMat)
    frame.position.set(wx, 1.15, 1.29)
    group.add(frame)
    // 玻璃
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.42, 0.06), glassMat)
    glass.position.set(wx, 1.15, 1.31)
    group.add(glass)
    // 横档
    const barH = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.05), woodMat)
    barH.position.set(wx, 1.15, 1.33)
    group.add(barH)
    const barV = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.42, 0.05), woodMat)
    barV.position.set(wx, 1.15, 1.33)
    group.add(barV)
  })

  // 墙角木梁装饰（两侧竖条）
  ;[-1.48, 1.48].forEach(bx => {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.1, 0.1), woodMat)
    beam.position.set(bx, 1.15, 1.25)
    group.add(beam)
  })

  group.position.set(x, 0, z)
  group.rotation.y = rotY
  scene.add(group)
  return group
}


function makePond(scene, x, z, r = 1.8) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime:       { value: 0 },
      uCenter:     { value: new THREE.Vector2(x, z) },
      uRadius:     { value: r },
      uRipples:    { value: Array.from({ length: 8 }, () => new THREE.Vector2()) },
      uRippleAges: { value: new Float32Array(8).fill(-1) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec2  uCenter;
      uniform float uRadius;
      uniform vec2  uRipples[8];
      uniform float uRippleAges[8];
      varying vec2 vUv;

      void main() {
        vec2 local = (vUv - vec2(0.5)) * uRadius * 2.0;

        float w = sin(local.x * 2.8 + uTime * 0.9)  * 0.07
                + sin(local.y * 2.2 + uTime * 0.7)  * 0.06
                + sin(length(local) * 3.5 - uTime * 1.4) * 0.04;

        for (int i = 0; i < 8; i++) {
          float age = uRippleAges[i];
          if (age < 0.0 || age > 2.5) continue;
          vec2 origin = uRipples[i] - uCenter;
          float dist = length(local - origin);
          float waveR = age * 2.0;
          float env = exp(-abs(dist - waveR) * 5.0) * exp(-age * 1.5);
          w += sin(dist * 6.0 - age * 13.0) * env * 0.35;
        }

        vec3 deep  = vec3(0.17, 0.52, 0.75);
        vec3 crest = vec3(0.60, 0.86, 1.00);
        vec3 color = mix(deep, crest, clamp(w + 0.5, 0.0, 1.0));

        float edgeR = length(vUv - vec2(0.5)) * 2.0;
        float alpha  = smoothstep(1.0, 0.88, edgeR) * 0.88;

        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
  })

  const pond = new THREE.Mesh(new THREE.CircleGeometry(r, 48), material)
  pond.rotation.x = -Math.PI / 2
  pond.position.set(x, 0.02, z)
  scene.add(pond)

  const rim = new THREE.Mesh(
    new THREE.RingGeometry(r, r + 0.3, 24),
    new THREE.MeshLambertMaterial({ color: 0x999080 })
  )
  rim.rotation.x = -Math.PI / 2
  rim.position.set(x, 0.01, z)
  rim.receiveShadow = true
  scene.add(rim)

  return material
}

// 返回 { flames, light, phase } 供动画更新
function makeCampfire(scene, x, z) {
  const group = new THREE.Group()
  group.position.set(x, 0, z)

  // 石圈
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x888070 })
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2
    const stone = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.13 + Math.random() * 0.06, 0),
      stoneMat
    )
    stone.position.set(Math.cos(angle) * 0.45, 0.08, Math.sin(angle) * 0.45)
    stone.rotation.set(Math.random(), Math.random(), Math.random())
    stone.castShadow = true
    group.add(stone)
  }

  // 木柴（两根交叉）
  const logMat = new THREE.MeshLambertMaterial({ color: 0x5a3010 })
  ;[0, Math.PI / 2].forEach(ry => {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.9, 6), logMat)
    log.rotation.set(Math.PI / 2, ry, 0.15)
    log.position.y = 0.07
    log.castShadow = true
    group.add(log)
  })

  // 余烬底座
  const ember = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.22, 0.06, 10),
    new THREE.MeshLambertMaterial({ color: 0xff2200, emissive: 0xff1100, emissiveIntensity: 0.8 })
  )
  ember.position.y = 0.06
  group.add(ember)

  // 火焰层（4 层锥体，不同颜色和高度）
  const flameDefs = [
    { color: 0xff2200, emissive: 0xdd1100, h: 0.55, r: 0.22, y: 0.32 },
    { color: 0xff5500, emissive: 0xff2200, h: 0.45, r: 0.16, y: 0.44 },
    { color: 0xff8800, emissive: 0xff5500, h: 0.35, r: 0.11, y: 0.54 },
    { color: 0xffcc00, emissive: 0xffaa00, h: 0.22, r: 0.06, y: 0.64 },
  ]
  const flames = flameDefs.map(({ color, emissive, h, r, y }) => {
    const mesh = new THREE.Mesh(
      new THREE.ConeGeometry(r, h, 7, 1, true),
      new THREE.MeshLambertMaterial({
        color, emissive, emissiveIntensity: 1.0,
        transparent: true, opacity: 0.92,
        side: THREE.DoubleSide,
      })
    )
    mesh.position.y = y
    mesh.userData.baseY = y
    group.add(mesh)
    return mesh
  })

  // 烟雾（半透明灰球，静态装饰）
  for (let i = 0; i < 3; i++) {
    const smoke = new THREE.Mesh(
      new THREE.SphereGeometry(0.08 + i * 0.04, 6, 6),
      new THREE.MeshLambertMaterial({
        color: 0x888888, transparent: true,
        opacity: 0.18 - i * 0.04,
      })
    )
    smoke.position.set(
      (Math.random() - 0.5) * 0.15,
      1.0 + i * 0.22,
      (Math.random() - 0.5) * 0.15
    )
    group.add(smoke)
  }

  scene.add(group)

  // 主点光源（暖橙，投射阴影）
  const light = new THREE.PointLight(0xff5500, 4.0, 14)
  light.position.set(x, 0.8, z)
  light.castShadow = false
  scene.add(light)

  // 补充光（更大范围、低强度，模拟地面反光晕染）
  const glow = new THREE.PointLight(0xff3300, 1.5, 28)
  glow.position.set(x, 0.3, z)
  scene.add(glow)

  const phase = Math.random() * Math.PI * 2
  return { flames, light, glow, phase }
}

// ── 主函数 ────────────────────────────────────────────

export function createMap(scene) {
  // 地面
  const texLoader = new THREE.TextureLoader()
  const applyRepeat = (tex) => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(48, 48)
    return tex
  }
  const groundMat = new THREE.MeshStandardMaterial({
    map:          applyRepeat(texLoader.load('/textures/coast_sand_rocks_02_diff_1k.jpg')),
    normalMap:    applyRepeat(texLoader.load('/textures/coast_sand_rocks_02_nor_gl_1k.jpg')),
    roughnessMap: applyRepeat(texLoader.load('/textures/coast_sand_rocks_02_rough_1k.jpg')),
    roughness: 1.0,
    metalness: 0.0,
  })
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(192, 192), groundMat)
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  // 曲线路面 + 路边草
  // 主横路（东西，轻微起伏）
  makeCurvedPath(scene, [[-20,1.5],[-12,0.6],[-4,-0.8],[4,0.4],[12,-0.6],[20,-0.3]], 1.6)
  // 主纵路（南北，轻微起伏）
  makeCurvedPath(scene, [[1.5,-20],[0.6,-12],[-0.8,-4],[0.4,4],[-0.6,12],[-0.3,20]], 1.6)
  // 东南支路
  makeCurvedPath(scene, [[10,0],[12,-4],[14,-9],[18,-14]], 1.2)
  // 西北支路
  makeCurvedPath(scene, [[-10,0],[-12,5],[-14,9],[-18,14]], 1.2)
  // 西南支路
  makeCurvedPath(scene, [[0,10],[-5,13],[-9,15],[-14,18]], 1.2)

  // ── 树木 ─────────────────────────────────────────
  // 内圈（5–10 单位，围绕中心广场）
  const innerTrees = [
    [-5,-5], [-3,-7], [3,-6], [6,-4], [-6, 3],
    [-4, 6], [5, 5],  [7, 3], [-7,-2], [2, 7],
    [-5, 2], [4,-3],  [-2,-6],[6, 1],  [-7, 5],
    [3,  8], [8,-5],  [-8, 6],[5,-8],  [-3, 4],
  ]
  // 中圈（10–20 单位）
  const midTrees = [
    [12,-8],  [-11, 7], [9, 13], [-10,-13], [14, 4],
    [-14,-5], [11, 16], [-13,11],[17, -6],  [-16, 9],
    [13,-17], [-9,-16], [15, 14],[-15, 13], [18, 10],
    [-17,-14],[10,-20], [-8, 19],[19,  5],  [-18,-10],
  ]
  // 外缘（22–38 单位，形成森林边界感）
  const outerTrees = [
    [25,-8],  [-23,14], [18,26],  [-20,-22],[28, 6],
    [-26,-10],[14, 28], [-17,-26],[32,-12], [-30,18],
    [20,-30], [-18, 32],[35, 8],  [-33,-16],[26, 28],
    [-28, 24],[38,-18], [-36, 20],[22,-36], [-24,-34],
  ]
  // 扩展区（40–80 单位，覆盖新增可移动区域）
  const farTrees = [
    [42,-12], [-40,18], [28,42],  [-25,-40],[48, 8],
    [-44,-14],[22, 45], [-20,-44],[55,-18], [-52,22],
    [35,-55], [-32, 50],[60, 12], [-58,-20],[45, 48],
    [-46, 42],[68,-22], [-65, 28],[38,-65], [-35,-62],
    [72, 5],  [-70,-10],[25,-72], [-22, 70],[75,-35],
    [-72, 38],[50,-70], [-48, 65],[78, 18], [-75,-30],
  ]
  const treeData = [...innerTrees, ...midTrees, ...outerTrees, ...farTrees]
  const trees = treeData.map(([x, z]) =>
    makeTree(scene, x, z, 2.5 + Math.random() * 1.2, 1 + Math.random() * 0.5)
  )


  // ── 房屋 ─────────────────────────────────────────
  // 内圈村落
  makeHouse(scene, -6,  -6, 0)
  makeHouse(scene,  6,   6, Math.PI)
  makeHouse(scene, -6,   6, Math.PI / 2)
  // 中圈散布
  makeHouse(scene,  16, -12, Math.PI * 0.25)
  makeHouse(scene, -16,  12, Math.PI * 1.25)
  makeHouse(scene,  14,  16, Math.PI * 0.75)
  makeHouse(scene, -14, -14, Math.PI * 1.75)
  makeHouse(scene,  20,   4, Math.PI * 0.5)
  // 扩展区新增
  makeHouse(scene,  32, -20, Math.PI * 0.125)
  makeHouse(scene, -30,  28, Math.PI * 1.125)
  makeHouse(scene,  28,  32, Math.PI * 0.625)
  makeHouse(scene, -32, -28, Math.PI * 1.625)
  makeHouse(scene,  40,  10, Math.PI * 0.375)
  makeHouse(scene, -38, -15, Math.PI * 0.875)

  const houseCollidables = [
    { x: -6,  z: -6,  r: 2.2 },
    { x:  6,  z:  6,  r: 2.2 },
    { x: -6,  z:  6,  r: 2.2 },
    { x:  16, z: -12, r: 2.2 },
    { x: -16, z:  12, r: 2.2 },
    { x:  14, z:  16, r: 2.2 },
    { x: -14, z: -14, r: 2.2 },
    { x:  20, z:   4, r: 2.2 },
    { x:  32, z: -20, r: 2.2 },
    { x: -30, z:  28, r: 2.2 },
    { x:  28, z:  32, r: 2.2 },
    { x: -32, z: -28, r: 2.2 },
    { x:  40, z:  10, r: 2.2 },
    { x: -38, z: -15, r: 2.2 },
  ]

  // ── 岩石 ─────────────────────────────────────────
  // 碰撞半径用随机种子固定（与 GLTF 加载解耦）
  const rng = rockPositions.map(() => 0.5 + Math.random() * 0.4)
  const rockCollidables = rockPositions.map(([x, z], i) => {
    const s = 0.6 + rng[i] * 0.5   // 与 GLTF 加载时的 scale 一致
    return { x, z, r: rng[i] * 1.6, h: s * 0.85 }
  })

  const boulderLoader = new GLTFLoader()
  boulderLoader.load('/models/rocks/namaqualand_boulder_03/namaqualand_boulder_03_1k.gltf', (gltf) => {
    rockPositions.forEach(([x, z], i) => {
      const rock = gltf.scene.clone(true)
      const s = 0.6 + rng[i] * 0.5          // 0.6–1.1，大小随机
      rock.scale.setScalar(s)
      rock.position.set(x, 0, z)
      rock.rotation.set(
        (Math.random() - 0.5) * 0.4,
        Math.random() * Math.PI * 2,
        (Math.random() - 0.5) * 0.3
      )
      rock.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true } })
      scene.add(rock)
    })
  })

  // ── 水池 ─────────────────────────────────────────
  const pondMaterials = [
    ...pondDefs.map(({ x, z, r }) => makePond(scene, x, z, r)),
    makePond(scene, fishingLake.x, fishingLake.z, fishingLake.r),
  ]

  // ── 火堆 ─────────────────────────────────────────
  const campfires = campfirePositions.map(([x, z]) => makeCampfire(scene, x, z))

  // ── 地形（山丘台阶）─────────────────────────────────
  const { collidables: terrainCollidables, getSurfaceHeight: getTerrainHeight } = createTerrain(scene)

  // ── 碰撞体（水池不加碰撞，玩家可以走入）────────────
  const collidables = [
    ...treeData.map(([x, z]) => ({ x, z, r: 0.8 })),
    ...houseCollidables,
    ...rockCollidables,
    ...campfirePositions.map(([x, z]) => ({ x, z, r: 0.6 })),
    ...terrainCollidables,
  ]

  // ── 涟漪数据池（纯数据，shader 负责渲染）────────
  const rippleData = Array.from({ length: 8 }, () => ({ x: 0, z: 0, age: -1 }))

  function spawnRipple(x, z) {
    const slot = rippleData.find(r => r.age < 0 || r.age > 2.5)
    if (!slot) return
    slot.x = x
    slot.z = z
    slot.age = 0
  }

  // ── 风动画 + 火堆动画 + 波纹动画更新函数 ─────────
  let _lastTime = 0
  function update(time) {
    const dt = Math.min(time - _lastTime, 0.05)
    _lastTime = time

    for (const { crownGroup, windPhase, windSpeed } of trees) {
      const sway = Math.sin(time * windSpeed       + windPhase) * 0.030
                 + Math.sin(time * windSpeed * 2.5 + windPhase) * 0.010
      crownGroup.rotation.z = sway
      crownGroup.rotation.x = Math.sin(time * windSpeed * 0.7 + windPhase + 1.2) * 0.015
    }

    for (const { flames, light, glow, phase } of campfires) {
      const f = Math.sin(time * 7.3  + phase) * 0.22
              + Math.sin(time * 13.1 + phase * 1.7) * 0.10
              + Math.sin(time * 19.7 + phase * 0.9) * 0.05

      light.intensity = 4.0 + f * 3.0
      light.color.setHSL(0.065 + f * 0.015, 1.0, 0.55)
      glow.intensity = 1.5 + f * 1.0

      flames.forEach((mesh, i) => {
        const fi = Math.sin(time * (8 + i * 2.3) + phase + i) * 0.14
                 + Math.sin(time * (5 + i * 1.7) + phase)     * 0.08
        mesh.scale.x = 1.0 + fi
        mesh.scale.z = 1.0 - fi * 0.6
        mesh.scale.y = 0.9 + Math.abs(fi) * 0.4
        mesh.position.y = mesh.userData.baseY + Math.sin(time * 6 + phase + i) * 0.04
        mesh.rotation.y = time * (0.8 + i * 0.3) + phase
      })
    }

    for (const r of rippleData) {
      if (r.age >= 0) r.age += dt
    }

    for (const mat of pondMaterials) {
      mat.uniforms.uTime.value = time
      for (let i = 0; i < 8; i++) {
        mat.uniforms.uRipples.value[i].set(rippleData[i].x, rippleData[i].z)
        mat.uniforms.uRippleAges.value[i] = rippleData[i].age
      }
    }
  }

  return { collidables, update, ponds: [...pondDefs, fishingLake], spawnRipple, getTerrainHeight }
}
