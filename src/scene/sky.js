import * as THREE from 'three'

// ── 固定晴朗白天：蓝天白云 + 大气散射 ──
// 天顶饱和蓝 → 地平线霾白蓝（Rayleigh 透视），太阳处暖白 Mie 光晕，白色蓬松积云。
const _skyHorizonC = new THREE.Color('#cfe2f3')   // 地平线霾色（雾/背景同色）
const _fogC = new THREE.Color()
const _sunDir = new THREE.Vector3()
const _moonLocal = new THREE.Vector3()

function makeSkyDome(scene) {
  const geo = new THREE.SphereGeometry(180, 48, 24)
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
    uniforms: {
      uTime:         { value: 0 },
      uSunDir:       { value: new THREE.Vector3(0, 1, 0) },
      uZenithColor:  { value: new THREE.Color('#2f6fd0') }, // 天顶蓝
      uHorizonColor: { value: new THREE.Color('#d4e6f5') }, // 地平线霾白蓝
      uCloudColor:   { value: new THREE.Color('#ffffff') }, // 云顶白
      uCloudShadow:  { value: new THREE.Color('#b7c3d0') }, // 云底灰蓝
      uSunGlow:      { value: new THREE.Color('#fff1d6') }, // 太阳暖白光晕
      uCloudCover:   { value: 0.42 },                        // 中等积云覆盖
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      varying vec3 vDir;
      uniform float uTime;
      uniform vec3 uSunDir;
      uniform vec3 uZenithColor;
      uniform vec3 uHorizonColor;
      uniform vec3 uCloudColor;
      uniform vec3 uCloudShadow;
      uniform vec3 uSunGlow;
      uniform float uCloudCover;

      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y);
      }
      float fbm(vec2 p) {
        float v = 0.0, a = 0.5;
        mat2 m = mat2(1.58, 1.12, -1.12, 1.58);
        for (int i = 0; i < 6; i++) { v += a * noise(p); p = m * p + 8.37; a *= 0.5; }
        return v;
      }

      void main() {
        vec3 dir = normalize(vDir);
        vec3 sd = normalize(uSunDir);
        float h = clamp(dir.y, 0.0, 1.0);

        // ── 大气散射渐变：地平线霾白 → 天顶蓝 ──
        vec3 sky = mix(uHorizonColor, uZenithColor, pow(h, 0.50));
        // 太阳一侧整体被照亮（Mie 多重散射）
        float sunDot = max(dot(dir, sd), 0.0);
        sky = mix(sky, uHorizonColor * 1.05, pow(1.0 - h, 3.0) * 0.45); // 低空更白
        float mie = pow(sunDot, 7.0) * 0.45 + pow(sunDot, 260.0) * 0.9;
        sky += uSunGlow * mie;

        // ── 白色蓬松积云 ──
        // 软投影（dir.y+0.32 不让云在天顶缩没、在地平线炸开），大尺度成块、上亮下暗有体积感
        float horizonFade = smoothstep(0.02, 0.20, dir.y);
        vec2 cp = (dir.xz / (dir.y + 0.32)) * 0.55;
        vec2 wind = vec2(uTime * 0.005, uTime * 0.0018);
        cp += wind;
        float dens = fbm(cp) * 0.60 + fbm(cp * 2.3 + 3.1) * 0.28 + fbm(cp * 5.0) * 0.12;
        float cover = uCloudCover;
        float cl = smoothstep(cover, cover + 0.16, dens);           // 软边云块
        // 体积阴影：与稍下方密度差 → 云顶亮、云底略灰（不过暗）
        float below = fbm(cp + vec2(0.0, 0.14)) * 0.60 + fbm((cp + vec2(0.0, 0.14)) * 2.3 + 3.1) * 0.28;
        float vshade = clamp((dens - below) * 1.8 + 0.80, 0.55, 1.05);
        float topLight = smoothstep(cover - 0.04, cover + 0.18, dens);
        vec3 cloudCol = mix(uCloudShadow, uCloudColor, topLight) * vshade;
        cloudCol += vec3(0.10, 0.085, 0.05) * pow(sunDot, 4.0);     // 朝阳侧描边提亮
        cl *= horizonFade;
        sky = mix(sky, cloudCol, clamp(cl, 0.0, 1.0) * 0.95);

        // ── 太阳光盘（被云遮挡：画在云之前会被云覆盖，这里叠在空隙处）──
        float disc = smoothstep(0.9993, 0.99975, sunDot) * (1.0 - clamp(cl, 0.0, 1.0));
        sky += vec3(1.0, 0.95, 0.82) * disc * 1.2;

        // 轻微抖动抗色带
        sky += (hash(gl_FragCoord.xy + uTime) - 0.5) * 0.012;
        gl_FragColor = vec4(max(sky, vec3(0.0)), 1.0);
      }
    `,
  })

  const dome = new THREE.Mesh(geo, mat)
  dome.name = 'procedural-blue-sky'
  dome.frustumCulled = false
  dome.renderOrder = -1000
  dome.onBeforeRender = (_renderer, _scene, camera) => {
    dome.position.copy(camera.position)
  }
  scene.add(dome)
  return dome
}

export function createSky(scene) {
  const skyDome = makeSkyDome(scene)

  // 月亮（固定白天 inert，保留以兼容；始终隐藏）
  const moonMesh = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 14, 14),
    new THREE.MeshBasicMaterial({ color: 0xDCE5FF, fog: false })
  )
  moonMesh.visible = false
  moonMesh.onBeforeRender = (_renderer, _scene, camera) => {
    moonMesh.position.copy(camera.position).add(_moonLocal)
  }
  scene.add(moonMesh)

  return {
    update(sunPhase, dt = 0, _showClouds = false) {
      // 太阳方向（与 main.js updateDayNightLighting 同公式）
      const sunH = Math.sin(sunPhase) * 30 + 15
      _sunDir.set(
        Math.cos(sunPhase) * 40,
        sunH,
        Math.sin(sunPhase * 0.6) * 25
      ).normalize()

      const u = skyDome.material.uniforms
      u.uTime.value += dt
      u.uSunDir.value.copy(_sunDir)

      // 背景 / 雾 = 地平线霾色（蓝白大气透视，远山泛霾）
      scene.background = _skyHorizonC
      if (scene.fog) {
        _fogC.copy(_skyHorizonC)
        scene.fog.color.copy(_fogC)
      }
    }
  }
}
