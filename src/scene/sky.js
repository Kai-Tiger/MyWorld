import * as THREE from 'three'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'

// ── 天空色调关键帧（sunPhase: 0=黎明, π/2=正午, π=黄昏, 3π/2=午夜）────
const SKY_KEYS = [
  { t: 0,             hex: '#FF8C60' }, // 黎明
  { t: Math.PI * .18, hex: '#FFD0A0' }, // 日出
  { t: Math.PI * .35, hex: '#A8DAFF' }, // 上午
  { t: Math.PI * .5,  hex: '#5AAFF0' }, // 正午
  { t: Math.PI * .75, hex: '#A8DAFF' }, // 下午
  { t: Math.PI,       hex: '#FF6040' }, // 黄昏
  { t: Math.PI * 1.2, hex: '#2A105A' }, // 入夜
  { t: Math.PI * 1.5, hex: '#07021A' }, // 深夜
  { t: Math.PI * 1.8, hex: '#2A105A' }, // 拂晓前
  { t: Math.PI * 2,   hex: '#FF8C60' }, // 回到黎明
]

const _pal  = SKY_KEYS.map(k => ({ t: k.t, c: new THREE.Color(k.hex) }))
const _tmpC = new THREE.Color()

function skyColorAt(phase) {
  for (let i = 0; i < _pal.length - 1; i++) {
    const a = _pal[i], b = _pal[i + 1]
    if (phase >= a.t && phase <= b.t) {
      return _tmpC.lerpColors(a.c, b.c, (phase - a.t) / (b.t - a.t))
    }
  }
  return _pal[0].c
}

const _fbxLoader = new FBXLoader()

// ── 星星粒子 ──────────────────────────────────────────
function makeStars(scene) {
  const N = 350
  const positions = []
  for (let i = 0; i < N; i++) {
    // 均匀分布在上半球 + 低纬度侧面（让透视摄像机也能看到）
    const theta = Math.random() * Math.PI * 2
    const phi   = Math.random() * Math.PI * 0.7  // 0~126°，覆盖到水平线以下一点
    const r     = 88 + Math.random() * 12
    positions.push(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta)
    )
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.45,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0,
    fog: false,
  }))
  pts.renderOrder = -1
  scene.add(pts)
  return pts
}

export function createSky(scene) {
  // ── 云朵（FBX，固定世界坐标，只在透视摄像机下显示）─
  const cloudDefs = [
    [ -14, 6,   8], [ -8,  7, -14],  [ 12,  5,  16],
    [  18, 6,  -10], [-16,  5,  18],  [  5,  7,  -6],
    [ -22, 5,  -6], [ 20,  6,   4],  [ -10,  6, -18],
    [   8, 5,  22],
  ]
  const clouds = cloudDefs.map(([x, y, z]) => {
    const speed = 0.7 + Math.random() * 0.9
    const rotY  = Math.random() * Math.PI * 2
    const entry = { mesh: null, speed }
    _fbxLoader.load('/models/cloud.fbx', (fbx) => {
      fbx.scale.setScalar(0.02)
      fbx.position.set(x, y, z)
      fbx.rotation.y = rotY
      fbx.visible = false
      const _cLights = []
      fbx.traverse(c => {
        if (c.isMesh) {
          c.material = new THREE.MeshLambertMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9,
            fog: false,
            side: THREE.DoubleSide,
          })
        }
        if (c.isLight) _cLights.push(c)
      })
      _cLights.forEach(l => l.removeFromParent())
      scene.add(fbx)
      entry.mesh = fbx
    })
    return entry
  })

  // ── 月亮 ─────────────────────────────────────────
  const moonMesh = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 14, 14),
    new THREE.MeshBasicMaterial({ color: 0xFFF8E0, fog: false })
  )
  // 月晕（稍大的半透明球）
  const haloBall = new THREE.Mesh(
    new THREE.SphereGeometry(3.4, 14, 14),
    new THREE.MeshBasicMaterial({ color: 0xFFFFCC, transparent: true, opacity: 0.14, fog: false })
  )
  moonMesh.add(haloBall)
  moonMesh.visible = false
  scene.add(moonMesh)

  // ── 星星 ─────────────────────────────────────────
  const starPoints = makeStars(scene)

  let _starTime = 0
  let _prevNightFactor = -1

  return {
    update(sunPhase, dt = 0, showClouds = false) {
      // ── 天空 + 雾颜色 ─────────────────────────────
      const skyColor = skyColorAt(sunPhase)
      scene.background = skyColor
      if (scene.fog) scene.fog.color.copy(skyColor)

      // 太阳高度：正值=白天，负值=夜晚
      const sunH = Math.sin(sunPhase) * 30 + 15
      // nightFactor: 0=白天, 1=深夜
      const nightFactor = THREE.MathUtils.clamp((-sunH + 10) / 16, 0, 1)
      const isNight = nightFactor > 0.05

      // ── 云朵：只在透视模式（NPC 对话）下显示 ─────────
      const cloudOpacity = THREE.MathUtils.lerp(0.9, 0.25, nightFactor)
      for (const { mesh, speed } of clouds) {
        if (!mesh) continue
        mesh.visible = showClouds
        if (showClouds) {
          mesh.position.x += speed * 0.003
          if (mesh.position.x > 65) mesh.position.x = -65
          mesh.traverse(c => { if (c.isMesh) c.material.opacity = cloudOpacity })
        }
      }

      // ── 月亮（与太阳对称）────────────────────────
      moonMesh.visible = isNight
      if (isNight) {
        const mp = sunPhase + Math.PI
        moonMesh.position.set(
          Math.cos(mp) * 42,
          Math.sin(mp) * 28 + 15,
          Math.sin(mp * 0.6) * 22
        )
      }

      // ── 星星：入夜渐现，闪烁 ─────────────────────
      _starTime += dt
      starPoints.visible = isNight
      if (isNight) {
        starPoints.material.opacity = nightFactor * (0.75 + Math.sin(_starTime * 2.1) * 0.12)
        if (Math.abs(nightFactor - _prevNightFactor) > 0.01) {
          starPoints.material.needsUpdate = true
          _prevNightFactor = nightFactor
        }
      }
    }
  }
}
