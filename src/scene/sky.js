import * as THREE from 'three'
import { cloneFBX } from '../systems/modelAssets.js'

// ── 天空色调关键帧（sunPhase: 0=黎明, π/2=正午, π=黄昏, 3π/2=午夜）────
const SKY_KEYS = [
  { t: 0,             hex: '#B8BCC0' }, // 黎明
  { t: Math.PI * .18, hex: '#C3C3BE' }, // 日出
  { t: Math.PI * .35, hex: '#C7CDD0' }, // 上午
  { t: Math.PI * .5,  hex: '#CFD5D7' }, // 正午
  { t: Math.PI * .75, hex: '#C7CCCC' }, // 下午
  { t: Math.PI,       hex: '#B9B4AF' }, // 黄昏
  { t: Math.PI * 1.2, hex: '#8E949B' }, // 入夜
  { t: Math.PI * 1.5, hex: '#767F8A' }, // 深夜
  { t: Math.PI * 1.8, hex: '#9299A1' }, // 拂晓前
  { t: Math.PI * 2,   hex: '#B8BCC0' }, // 回到黎明
]

const _pal  = SKY_KEYS.map(k => ({ t: k.t, c: new THREE.Color(k.hex) }))
const _tmpC = new THREE.Color()
const _fogC = new THREE.Color()
const _backgroundC = new THREE.Color(0xc4c8c8)
const _horizonTintC = new THREE.Color(0xd6d5cf)
const _fogTargetC = new THREE.Color(0xaeb4ba)
const _sunDir = new THREE.Vector3()
const _moonDir = new THREE.Vector3()
const _moonLocal = new THREE.Vector3()

function skyColorAt(phase) {
  for (let i = 0; i < _pal.length - 1; i++) {
    const a = _pal[i], b = _pal[i + 1]
    if (phase >= a.t && phase <= b.t) {
      return _tmpC.lerpColors(a.c, b.c, (phase - a.t) / (b.t - a.t))
    }
  }
  return _pal[0].c
}

function makeSkyDome(scene) {
  const geo = new THREE.SphereGeometry(180, 48, 24)
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
    uniforms: {
      uTime:          { value: 0 },
      uNightFactor:   { value: 0 },
      uSunDir:        { value: new THREE.Vector3(0, 1, 0) },
      uMoonDir:       { value: new THREE.Vector3(0, 1, 0) },
      uZenithColor:   { value: new THREE.Color('#CFD4D6') },
      uMidColor:      { value: new THREE.Color('#C4CACB') },
      uHorizonColor:  { value: new THREE.Color('#D9D8D1') },
      uStormColor:    { value: new THREE.Color('#9FA6AD') },
      uCloudColor:    { value: new THREE.Color('#D2D4D1') },
      uEmberColor:    { value: new THREE.Color('#D0BEB2') },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      precision highp float;

      varying vec3 vDir;
      uniform float uTime;
      uniform float uNightFactor;
      uniform vec3 uSunDir;
      uniform vec3 uMoonDir;
      uniform vec3 uZenithColor;
      uniform vec3 uMidColor;
      uniform vec3 uHorizonColor;
      uniform vec3 uStormColor;
      uniform vec3 uCloudColor;
      uniform vec3 uEmberColor;

      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        mat2 m = mat2(1.58, 1.12, -1.12, 1.58);
        for (int i = 0; i < 5; i++) {
          v += a * noise(p);
          p = m * p + 8.37;
          a *= 0.52;
        }
        return v;
      }

      float skyFbm(vec3 p) {
        vec3 w = abs(normalize(p));
        w = max(w, vec3(0.0001));
        w /= w.x + w.y + w.z;
        float xy = fbm(p.xy);
        float yz = fbm(p.yz + vec2(17.0, 31.0));
        float zx = fbm(p.zx + vec2(47.0, 11.0));
        return xy * w.z + yz * w.x + zx * w.y;
      }

      void main() {
        vec3 dir = normalize(vDir);
        float skyY = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
        float domeY = clamp(dir.y, 0.0, 1.0);
        float horizon = 1.0 - smoothstep(0.02, 0.42, abs(dir.y));

        vec3 wind = vec3(uTime * 0.008, -uTime * 0.002, uTime * 0.005);
        float broad = skyFbm(dir * 2.4 + wind);
        float detail = skyFbm(dir * 8.5 + wind * 2.3 + vec3(broad, -broad, broad * 0.5));
        float cloud = smoothstep(0.38, 0.69, broad * 0.76 + detail * 0.56);
        float cloudWeight = smoothstep(-0.12, 0.62, dir.y) * (1.0 - smoothstep(0.92, 1.0, dir.y));

        vec3 base = mix(uHorizonColor, uMidColor, smoothstep(0.02, 0.52, skyY));
        base = mix(base, uZenithColor, smoothstep(0.46, 1.0, skyY));

        float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
        float moonDot = max(dot(dir, normalize(uMoonDir)), 0.0);
        float sunLow = smoothstep(-0.12, 0.18, uSunDir.y) * (1.0 - smoothstep(0.22, 0.62, uSunDir.y));
        float emberBand = horizon * (0.22 + sunLow * 0.78);
        base = mix(base, uEmberColor, emberBand * (1.0 - uNightFactor) * 0.34);

        vec3 storm = mix(uCloudColor, uStormColor, cloud * 0.68 + uNightFactor * 0.42);
        base = mix(base, storm, cloud * cloudWeight * mix(0.64, 0.86, uNightFactor));

        float sunGlow = pow(sunDot, 24.0) * 0.36 + pow(sunDot, 420.0) * 1.4;
        base += vec3(1.0, 0.63, 0.34) * sunGlow * (1.0 - uNightFactor) * 0.42;

        float moonGlow = pow(moonDot, 38.0) * 0.34 + pow(moonDot, 850.0) * 1.8;
        base += vec3(0.45, 0.58, 0.85) * moonGlow * uNightFactor;

        float grain = hash(gl_FragCoord.xy + uTime * 11.0) - 0.5;
        base += grain * 0.018;
        base = mix(base, uStormColor * 0.92, uNightFactor * (1.0 - horizon) * 0.12);
        base *= 1.0 - smoothstep(0.0, 1.0, domeY) * 0.04;

        gl_FragColor = vec4(max(base * 1.08, vec3(0.0)), 1.0);
      }
    `,
  })

  const dome = new THREE.Mesh(geo, mat)
  dome.name = 'procedural-dark-fantasy-sky'
  dome.frustumCulled = false
  dome.renderOrder = -1000
  dome.onBeforeRender = (_renderer, _scene, camera) => {
    dome.position.copy(camera.position)
  }
  scene.add(dome)
  return dome
}

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
  const skyDome = makeSkyDome(scene)

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
    cloneFBX('/models/cloud.fbx').then((fbx) => {
      fbx.scale.setScalar(0.02)
      fbx.position.set(x, y, z)
      fbx.rotation.y = rotY
      fbx.visible = false
      const _cLights = []
      fbx.traverse(c => {
        if (c.isMesh) {
          c.material = new THREE.MeshLambertMaterial({
            color: 0x9aa0a0,
            transparent: true,
            opacity: 0.62,
            fog: false,
            side: THREE.DoubleSide,
          })
        }
        if (c.isLight) _cLights.push(c)
      })
      _cLights.forEach(l => l.removeFromParent())
      scene.add(fbx)
      entry.mesh = fbx
    }).catch((error) => {
      console.warn('Cloud model preload failed', error)
    })
    return entry
  })

  // ── 月亮 ─────────────────────────────────────────
  const moonMesh = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 14, 14),
    new THREE.MeshBasicMaterial({ color: 0xDCE5FF, fog: false })
  )
  // 月晕（稍大的半透明球）
  const haloBall = new THREE.Mesh(
    new THREE.SphereGeometry(4.1, 14, 14),
    new THREE.MeshBasicMaterial({ color: 0x9EB6FF, transparent: true, opacity: 0.10, fog: false })
  )
  moonMesh.add(haloBall)
  moonMesh.visible = false
  moonMesh.onBeforeRender = (_renderer, _scene, camera) => {
    moonMesh.position.copy(camera.position).add(_moonLocal)
  }
  scene.add(moonMesh)

  // ── 星星 ─────────────────────────────────────────
  const starPoints = makeStars(scene)
  starPoints.onBeforeRender = (_renderer, _scene, camera) => {
    starPoints.position.copy(camera.position)
  }

  let _starTime = 0
  let _prevNightFactor = -1

  return {
    update(sunPhase, dt = 0, showClouds = false) {
      // ── 天空 + 雾颜色 ─────────────────────────────
      const skyColor = skyColorAt(sunPhase)
      scene.background = _backgroundC

      // 太阳高度：正值=白天，负值=夜晚
      const sunH = Math.sin(sunPhase) * 30 + 15
      // nightFactor: 0=白天, 1=深夜
      const nightFactor = THREE.MathUtils.clamp((-sunH + 10) / 16, 0, 1)
      const isNight = nightFactor > 0.05
      _sunDir.set(
        Math.cos(sunPhase) * 40,
        sunH,
        Math.sin(sunPhase * 0.6) * 25
      ).normalize()
      const moonPhase = sunPhase + Math.PI
      _moonDir.set(
        Math.cos(moonPhase) * 42,
        Math.sin(moonPhase) * 28 + 15,
        Math.sin(moonPhase * 0.6) * 22
      ).normalize()

      const uniforms = skyDome.material.uniforms
      uniforms.uTime.value += dt
      uniforms.uNightFactor.value = nightFactor
      uniforms.uSunDir.value.copy(_sunDir)
      uniforms.uMoonDir.value.copy(_moonDir)
      uniforms.uMidColor.value.copy(skyColor)
      uniforms.uHorizonColor.value.copy(_tmpC.copy(skyColor).lerp(_horizonTintC, 0.32))
      if (scene.fog) {
        _fogC.copy(skyColor).lerp(_fogTargetC, THREE.MathUtils.lerp(0.16, 0.42, nightFactor))
        scene.fog.color.copy(_fogC)
      }

      // ── 云朵：保留为可选层，默认隐藏 ─────────
      const cloudOpacity = THREE.MathUtils.lerp(0.62, 0.18, nightFactor)
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
        _moonLocal.set(
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
