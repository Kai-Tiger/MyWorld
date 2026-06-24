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
      uCloudColor:   { value: new THREE.Color('#ffffff') }, // 云顶白（受光面）
      uCloudShadow:  { value: new THREE.Color('#c4d2e2') }, // 云底/内部蓝灰（环境，调亮防灰暗）
      uSunGlow:      { value: new THREE.Color('#fff1d6') }, // 太阳暖白光晕
      uCloudCover:   { value: 0.62 },                        // 覆盖阈值（值越高云越少、越成团、越多蓝天）
      // ── 体积云（volumetric raymarch）──
      uCameraPos:    { value: new THREE.Vector3() },         // 相机世界坐标（onBeforeRender 更新）
      uCloudBottom:  { value: 480 },                         // 云底世界高度
      uCloudTop:     { value: 1050 },                        // 云顶世界高度（slab 厚 ~570，云更高更鼓）
      uCloudDensity: { value: 1.5 },                         // 密度倍率
      uWindDir:      { value: new THREE.Vector2(1, 0.35).normalize() },
      uWindSpeed:    { value: 6.0 },                         // 世界单位/秒
      uLightSteps:   { value: 6 },                           // 朝太阳的二次步进
      uMaxDist:      { value: 5000 },                        // 最大 march 距离（防 t 爆大）
      uWorldStep:    { value: 22.0 },                        // 固定世界步长（近处细→无条纹）
      uStepGrowth:   { value: 0.0015 },                      // 步长随距离增长（远处粗，被雾吃掉）
      uFadeNear:     { value: 1500 },                        // 远端大气透视淡出起点
      uFadeFar:      { value: 3500 },                        // 远端大气透视淡出终点
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
      uniform vec3 uCameraPos;
      uniform float uCloudBottom;
      uniform float uCloudTop;
      uniform float uCloudDensity;
      uniform vec2 uWindDir;
      uniform float uWindSpeed;
      uniform float uLightSteps;
      uniform float uMaxDist;
      uniform float uWorldStep;
      uniform float uStepGrowth;
      uniform float uFadeNear;
      uniform float uFadeFar;

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
      // ── 3D value noise + fbm（体积云密度场）──
      float hash3(vec3 p) {
        p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }
      float noise3(vec3 p) {
        vec3 i = floor(p), f = fract(p);
        // quintic 插值：梯度连续，去除三次插值的棱面/格点感
        vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
        return mix(
          mix(mix(hash3(i + vec3(0.0,0.0,0.0)), hash3(i + vec3(1.0,0.0,0.0)), u.x),
              mix(hash3(i + vec3(0.0,1.0,0.0)), hash3(i + vec3(1.0,1.0,0.0)), u.x), u.y),
          mix(mix(hash3(i + vec3(0.0,0.0,1.0)), hash3(i + vec3(1.0,0.0,1.0)), u.x),
              mix(hash3(i + vec3(0.0,1.0,1.0)), hash3(i + vec3(1.0,1.0,1.0)), u.x), u.y),
          u.z);
      }
      float fbm3(vec3 p) {
        float v = 0.0, a = 0.5;
        for (int i = 0; i < 4; i++) {
          v += a * noise3(p);
          p = p * 2.02 + vec3(8.37, 2.17, 4.91);
          a *= 0.5;
        }
        return v;
      }

      // 世界尺度：特征云团（值越小云团越大）
      const float CLOUD_SCALE = 1.0 / 750.0;

      // 某个世界点的云密度（含覆盖阈值 + slab 高度梯度 + 风）
      // 宽过渡羽化 + 中频边缘侵蚀：边缘发虚、内部光滑
      float sampleDensity(vec3 wp) {
        vec3 sp = wp;
        sp.xz += uWindDir * (uTime * uWindSpeed);
        sp *= CLOUD_SCALE;
        float base = fbm3(sp);
        // 加宽过渡带、不做二次圆化 → 边缘羽化发虚
        float d = smoothstep(uCloudCover, uCloudCover + 0.45, base);
        // 中频侵蚀：仅作用于边缘带（云心 d>0.6 不动）→ 内部光滑、边缘碎而软
        float detail = fbm3(sp * 3.2 + vec3(11.7, 3.1, 6.5));
        float edgeBand = smoothstep(0.0, 0.6, d) * (1.0 - smoothstep(0.6, 1.0, d));
        d = clamp(d - (1.0 - detail) * 0.35 * edgeBand, 0.0, 1.0);
        // slab 内高度梯度：顶/底都羽化（不平切）
        float hN = clamp((wp.y - uCloudBottom) / (uCloudTop - uCloudBottom), 0.0, 1.0);
        float grad = smoothstep(0.0, 0.45, hN) * smoothstep(1.0, 0.35, hN);
        return d * grad * uCloudDensity;
      }

      // 朝太阳的二次步进 → 累积光学厚度（用于 Beer 透射）
      float lightMarch(vec3 p) {
        float stepLen = (uCloudTop - uCloudBottom) / (uLightSteps * 1.5);
        float t = 0.0, sigma = 0.0;
        for (int i = 0; i < 12; i++) {
          if (float(i) >= uLightSteps) break;
          sigma += sampleDensity(p + uSunDir * (t + stepLen * 0.5)) * stepLen;
          t += stepLen;
        }
        return sigma;
      }

      // Henyey-Greenstein 相位（g>0 前向，g<0 后向）
      float hg(float c, float g) {
        float g2 = g * g;
        return (1.0 - g2) / (12.566370 * pow(max(1.0 + g2 - 2.0 * g * c, 1e-4), 1.5));
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

        // ── 体积云：在世界空间云层 slab 内 raymarch ──
        // dir 即世界视线（穹顶只平移不旋转），从相机位置往上方 march
        float cloudA = 0.0;            // 云覆盖度（1 - 透射）
        vec3  cloudRGB = vec3(0.0);
        if (dir.y > 0.02) {            // 仅看向上方才 march，省掉下半屏
          vec3 ro = uCameraPos;
          float t0 = (uCloudBottom - ro.y) / dir.y;
          float t1 = (uCloudTop    - ro.y) / dir.y;
          float tEnter = max(min(t0, t1), 0.0);
          float tExit  = min(max(t0, t1), uMaxDist);
          if (tExit > tEnter) {
            // 交错梯度噪声（IGN，不含 uTime → 屏幕稳定、不闪）：起步相位打散条纹
            float ign = fract(52.9829189 * fract(0.06711056 * gl_FragCoord.x + 0.00583715 * gl_FragCoord.y));
            float t = tEnter + uWorldStep * ign;

            float transmittance = 1.0;
            vec3  scatter = vec3(0.0);
            float mu = max(dot(dir, sd), 0.0);
            // 方向性光照：朝阳侧提亮、背阳侧略暗（温和，不把云压灰）
            float phaseLight = 0.85 + 0.45 * pow(mu, 2.5);   // 背阳 0.85 ~ 朝阳 1.3

            for (int i = 0; i < 96; i++) {
              if (t > tExit || transmittance < 0.02) break;
              // 固定世界步长 + 距离增长：近处细（无条纹）、远处粗（被雾吃掉）
              float stepLen = uWorldStep * (1.0 + (t - tEnter) * uStepGrowth);
              vec3 p = ro + dir * t;
              float density = sampleDensity(p);
              if (density > 0.001) {
                float ls = lightMarch(p);
                float beer = exp(-ls * 0.55);                // 朝太阳透射：1=全亮，0=自阴影
                float powder = 1.0 - exp(-ls * 2.0);
                // 云顶亮白 → 云底蓝灰的高度环境梯度
                float hN = clamp((p.y - uCloudBottom) / (uCloudTop - uCloudBottom), 0.0, 1.0);
                vec3 ambient = mix(uCloudShadow, uCloudColor * 1.04, hN);
                vec3 col = mix(ambient, uCloudColor, beer);
                col *= phaseLight;                           // 方向性明暗（不压灰）
                col += uCloudColor * pow(mu, 6.0) * powder * 0.3; // 朝阳侧银边透光
                float dT = exp(-density * stepLen);
                scatter += transmittance * (1.0 - dT) * col;
                transmittance *= dT;
              }
              t += stepLen;                                  // 空/实同步长 → 命中点不量化、无条纹
            }
            // 远端大气透视淡出：96 步截断处自然融入地平线霾色，截断不可见
            float distFade = 1.0 - smoothstep(uFadeNear, uFadeFar, tEnter);
            cloudA = (1.0 - transmittance) * distFade;
            cloudRGB = scatter;
          }
        }
        // 地平线淡出：低仰角云团与雾色平滑融合
        cloudA *= smoothstep(0.04, 0.22, dir.y);
        sky = mix(sky, cloudRGB, cloudA);

        // ── 太阳光盘（被云遮挡）──
        float disc = smoothstep(0.9993, 0.99975, sunDot) * (1.0 - cloudA);
        sky += vec3(1.0, 0.95, 0.82) * disc * 1.2;

        // 轻微抖动抗色带 + 防过曝（ACES + exposure 1.485）
        sky += (hash(gl_FragCoord.xy + uTime) - 0.5) * 0.012;
        sky = min(sky, vec3(1.06));
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
    mat.uniforms.uCameraPos.value.copy(camera.position)
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
    },
    // 质量旋钮（q: 0~1）：战斗/低端用更粗步长保帧率，平时 1.0
    setQuality(q) {
      const u = skyDome.material.uniforms
      const clamped = Math.max(0, Math.min(1, q))
      u.uWorldStep.value = 34 - (34 - 18) * clamped       // q 越大步长越细（无纹）
      u.uLightSteps.value = Math.round(4 + (8 - 4) * clamped)
      u.uStepGrowth.value = 0.0025 - 0.0010 * clamped     // 低质更激进增长省步
    }
  }
}
