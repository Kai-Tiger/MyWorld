import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { ponds as pondDefs, fishingLake } from '../config/world.js'
import { createHeightmapTerrain } from './heightmapTerrain.js'


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

function createTerrainBlendMaterial(texLoader) {
  const applyRepeat = (tex) => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(48, 48)
    return tex
  }

  const mat = new THREE.MeshStandardMaterial({
    map:          applyRepeat(texLoader.load('/textures/coast_sand_rocks_02_diff_1k.jpg')),
    normalMap:    applyRepeat(texLoader.load('/textures/coast_sand_rocks_02_nor_gl_1k.jpg')),
    roughnessMap: applyRepeat(texLoader.load('/textures/coast_sand_rocks_02_rough_1k.jpg')),
    roughness: 1.0,
    metalness: 0.0,
  })

  const uniforms = {
    uLowColor:        { value: new THREE.Color(0x6f8a54) },
    uSlopeColor:      { value: new THREE.Color(0x8c7a64) },
    uHighColor:       { value: new THREE.Color(0xbeb59a) },
    uSlopeStart:      { value: 0.24 },
    uSlopeEnd:        { value: 0.46 },
    uHeightStart:     { value: 5.5 },
    uHeightEnd:       { value: 15.5 },
    uContourScale:    { value: 0.28 },
    uContourStrength: { value: 0.3 },
    uNoiseScale:      { value: 0.085 },
  }

  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)

    shader.vertexShader = `
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
    ` + shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      `#include <worldpos_vertex>
       vWorldPos = worldPosition.xyz;
       vWorldNormal = normalize(mat3(modelMatrix) * objectNormal);`
    )

    shader.fragmentShader = `
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      uniform vec3 uLowColor;
      uniform vec3 uSlopeColor;
      uniform vec3 uHighColor;
      uniform float uSlopeStart;
      uniform float uSlopeEnd;
      uniform float uHeightStart;
      uniform float uHeightEnd;
      uniform float uContourScale;
      uniform float uContourStrength;
      uniform float uNoiseScale;

      float terrainNoise(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
    ` + shader.fragmentShader.replace(
      '#include <color_fragment>',
      `
      float slope = 1.0 - clamp(dot(normalize(vWorldNormal), vec3(0.0, 1.0, 0.0)), 0.0, 1.0);
      float slopeMask = smoothstep(uSlopeStart, uSlopeEnd, slope);
      float highMask = smoothstep(uHeightStart, uHeightEnd, vWorldPos.y);

      float contourPhase = abs(fract(vWorldPos.y * uContourScale) - 0.5) * 2.0;
      float contourMask = pow(1.0 - contourPhase, 3.0) * (0.35 + 0.65 * slopeMask);

      float n = terrainNoise(vWorldPos.xz * uNoiseScale);
      vec3 terrainTint = mix(uLowColor, uSlopeColor, slopeMask);
      terrainTint = mix(terrainTint, uHighColor, highMask);
      terrainTint *= 0.94 + n * 0.12;
      terrainTint = mix(terrainTint, terrainTint * 0.74, contourMask * uContourStrength);

      diffuseColor.rgb *= terrainTint;
      #include <color_fragment>
      `
    )
  }

  mat.customProgramCacheKey = () => 'terrain-blend-v1'
  return mat
}


// ── 编辑器模板缓存 ────────────────────────────────────────
let _treeGltfScene = null
let _rockGltfScene = null
const _campfireStates = []   // 所有火堆的动画状态，update() 中迭代
// 启动时 GLB 尚未加载完成时的待处理队列
const _pendingTreeClones    = []   // { group, scale }
const _pendingRockClones    = []   // { group, scale } — 编辑器单独克隆时用
let   _pendingRockInstances = null // { scene, rocks } — 非编辑器 InstancedMesh 构建

let _rockInstancedMesh = null  // 游戏模式下的岩石 InstancedMesh
let _sampleTerrainHeight = () => 0
let _terrainReady = false
const _pendingGroundings = []

function _applyGrounding(group, yOffset = 0) {
  if (!group) return
  group.position.y = _sampleTerrainHeight(group.position.x, group.position.z) + yOffset
}

export function getGroundHeight(x, z) {
  return _sampleTerrainHeight(x, z)
}

export function snapObjectToGround(group, yOffset = 0) {
  if (!group) return
  if (_terrainReady) {
    _applyGrounding(group, yOffset)
  } else {
    _pendingGroundings.push({ group, yOffset })
  }
}

function _buildRockInstancedMesh(scene, rocks) {
  if (!rocks.length) return
  let templateMesh = null
  _rockGltfScene.traverse(c => { if (c.isMesh && !templateMesh) templateMesh = c })
  if (!templateMesh) return

  const inst = new THREE.InstancedMesh(templateMesh.geometry, templateMesh.material, rocks.length)
  inst.castShadow = true
  inst.receiveShadow = true
  inst.userData.editorMeta = { type: 'rock_instanced', rocks }

  const dummy = new THREE.Object3D()
  rocks.forEach(({ x, z, scale = 0.9 }, i) => {
    dummy.position.set(x, getGroundHeight(x, z), z)
    dummy.scale.setScalar(scale)
    // 基于位置的确定性旋转，避免每次刷新朝向不同
    dummy.rotation.y = ((x * 127 + z * 31) & 0xffff) / 0xffff * Math.PI * 2
    dummy.updateMatrix()
    inst.setMatrixAt(i, dummy.matrix)
  })
  inst.instanceMatrix.needsUpdate = true
  scene.add(inst)
  _rockInstancedMesh = inst
}

/** 游戏模式：将所有岩石合批为一个 InstancedMesh */
export function buildRockInstances(scene, rocks) {
  if (!rocks?.length) return
  if (_rockGltfScene) {
    _buildRockInstancedMesh(scene, rocks)
  } else {
    _pendingRockInstances = { scene, rocks }
  }
}

/** 进入编辑器前移除 InstancedMesh（编辑器会换成独立克隆） */
export function destroyRockInstances(scene) {
  if (_rockInstancedMesh) {
    scene.remove(_rockInstancedMesh)
    _rockInstancedMesh = null
  }
}

export function cloneTreeForEditor(scene, x, z, scale = 1.0) {
  const group = new THREE.Group()
  group.position.set(x, 0, z)
  group.userData.editorMeta = { type: 'tree', x, z, scale, rotY: 0 }
  scene.add(group)
  snapObjectToGround(group)
  if (_treeGltfScene) {
    const mesh = _treeGltfScene.clone()
    mesh.scale.setScalar(scale)
    mesh.traverse(c => {
      if (c.isMesh) { c.castShadow = true; c.receiveShadow = false }
    })
    group.add(mesh)
  } else {
    _pendingTreeClones.push({ group, scale })
  }
  return group
}

export function cloneRockForEditor(scene, x, z, scale = 1.0) {
  const group = new THREE.Group()
  group.position.set(x, 0, z)
  group.userData.editorMeta = { type: 'rock', x, z, scale }
  scene.add(group)
  snapObjectToGround(group)
  if (_rockGltfScene) {
    const mesh = _rockGltfScene.clone(true)
    mesh.scale.setScalar(scale)
    mesh.traverse(c => {
      if (c.isMesh) { c.castShadow = true; c.receiveShadow = true }
    })
    group.add(mesh)
  } else {
    _pendingRockClones.push({ group, scale })
  }
  return group
}



export function makeHouse(scene, x, z, rotY = 0) {
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

  // ── 按材质合并子 Mesh，从 ~17 Draw Call → ~6 Draw Call ──
  const byMat = new Map()
  for (const child of group.children) {
    if (!child.isMesh) continue
    child.updateMatrix()
    const geo = child.geometry.clone()
    geo.applyMatrix4(child.matrix)
    const key = child.material.uuid
    if (!byMat.has(key)) byMat.set(key, { mat: child.material, geos: [], transparent: !!child.material.transparent })
    byMat.get(key).geos.push(geo)
  }
  // 移除原始散件
  for (let i = group.children.length - 1; i >= 0; i--) {
    const c = group.children[i]
    if (c.isMesh) { c.geometry.dispose(); group.remove(c) }
  }
  // 添加合并后的 Mesh
  for (const { mat, geos, transparent } of byMat.values()) {
    const merged = mergeGeometries(geos)
    geos.forEach(g => g.dispose())
    const mesh = new THREE.Mesh(merged, mat)
    mesh.castShadow    = !transparent
    mesh.receiveShadow = true
    group.add(mesh)
  }

  group.position.set(x, 0, z)
  group.rotation.y = rotY
  group.userData.editorMeta = { type: 'house', x, z, rotY }
  scene.add(group)
  snapObjectToGround(group)
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
  pond.position.set(x, 0, z)
  scene.add(pond)
  snapObjectToGround(pond, 0.02)

  const rim = new THREE.Mesh(
    new THREE.RingGeometry(r, r + 0.3, 24),
    new THREE.MeshLambertMaterial({ color: 0x999080 })
  )
  rim.rotation.x = -Math.PI / 2
  rim.position.set(x, 0, z)
  rim.receiveShadow = true
  scene.add(rim)
  snapObjectToGround(rim, 0.01)

  return material
}

export function makeCampfire(scene, x, z) {
  const group = new THREE.Group()
  group.position.set(x, 0, z)
  group.userData.editorMeta = { type: 'campfire', x, z }

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

  // 烟雾（半透明灰球，静态装饰，不投影）
  for (let i = 0; i < 3; i++) {
    const smoke = new THREE.Mesh(
      new THREE.SphereGeometry(0.08 + i * 0.04, 6, 6),
      new THREE.MeshLambertMaterial({
        color: 0x888888, transparent: true,
        opacity: 0.18 - i * 0.04,
      })
    )
    smoke.castShadow = false
    smoke.position.set(
      (Math.random() - 0.5) * 0.15,
      1.0 + i * 0.22,
      (Math.random() - 0.5) * 0.15
    )
    group.add(smoke)
  }

  // 灯光作为 group 子节点（相对坐标），随 group 移动/删除
  const light = new THREE.PointLight(0xff5500, 4.0, 14)
  light.position.set(0, 0.8, 0)
  light.castShadow = false
  group.add(light)

  const glow = new THREE.PointLight(0xff3300, 1.5, 28)
  glow.position.set(0, 0.3, 0)
  group.add(glow)

  scene.add(group)
  snapObjectToGround(group)

  const phase = Math.random() * Math.PI * 2
  _campfireStates.push({ flames, light, glow, phase, group })
  return group
}

// ── 主函数 ────────────────────────────────────────────

export function createMap(scene) {
  // 地面
  const texLoader = new THREE.TextureLoader()
  const groundMat = createTerrainBlendMaterial(texLoader)
  createHeightmapTerrain(scene, {
    material: groundMat,
    size: 192,
    segments: 256,
    maxHeight: 18,
    sharpenMix: 0.35,
    sharpenPower: 1.35,
    heightmapUrl: '/heightmaps/main_height_1024.png',
    onReady: (sampleHeight) => {
      _sampleTerrainHeight = sampleHeight
      _terrainReady = true

      if (_rockInstancedMesh?.userData?.editorMeta?.rocks) {
        const rocks = _rockInstancedMesh.userData.editorMeta.rocks
        scene.remove(_rockInstancedMesh)
        _rockInstancedMesh = null
        _buildRockInstancedMesh(scene, rocks)
      }

      const pending = _pendingGroundings.splice(0, _pendingGroundings.length)
      pending.forEach(({ group, yOffset }) => {
        if (group.parent) _applyGrounding(group, yOffset)
      })
    },
  })

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
  // 仅预加载 GLB 模板，供编辑器/地图文件使用；不再硬编码任何树木位置
  new GLTFLoader().load('/models/trees/custom_tree.glb', (gltf) => {
    _treeGltfScene = gltf.scene
    _pendingTreeClones.forEach(({ group, scale }) => {
      const mesh = _treeGltfScene.clone()
      mesh.scale.setScalar(scale)
      mesh.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = false } })
      group.add(mesh)
    })
    _pendingTreeClones.length = 0
  })


  // ── 岩石 GLB（仅加载模板）─────────────────────────────
  new GLTFLoader().load('/models/rocks/namaqualand_boulder_03/namaqualand_boulder_03_1k.gltf', (gltf) => {
    _rockGltfScene = gltf.scene
    // 消费编辑器的个别克隆请求
    _pendingRockClones.forEach(({ group, scale }) => {
      const mesh = _rockGltfScene.clone(true)
      mesh.scale.setScalar(scale)
      mesh.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true } })
      group.add(mesh)
    })
    _pendingRockClones.length = 0
    // 消费游戏启动时的 InstancedMesh 请求
    if (_pendingRockInstances) {
      _buildRockInstancedMesh(_pendingRockInstances.scene, _pendingRockInstances.rocks)
      _pendingRockInstances = null
    }
  })

  // ── 水池 ─────────────────────────────────────────
  const pondMaterials = [
    ...pondDefs.map(({ x, z, r }) => makePond(scene, x, z, r)),
    makePond(scene, fishingLake.x, fishingLake.z, fishingLake.r),
  ]

  // 房屋/岩石/树木/火堆碰撞在 main.js 从地图文件动态添加
  const collidables = []

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

    for (const { flames, light, glow, phase, group } of _campfireStates) {
      if (!group.parent) continue   // 已从场景移除，跳过
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

  return { collidables, update, ponds: [...pondDefs, fishingLake], spawnRipple, getTerrainHeight: getGroundHeight }
}
