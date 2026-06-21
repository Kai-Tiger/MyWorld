import * as THREE from 'three'

const _color = new THREE.Color()
const DEFAULT_VISUAL_SCALE = 0.4
const CURRENT_HEIGHT_SCALE = 0.5

function makeCanvasTexture(size, draw) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  draw(ctx, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

function makeSoftDiscTexture() {
  return makeCanvasTexture(128, (ctx, size) => {
    const c = size * 0.5
    const g = ctx.createRadialGradient(c, c, 0, c, c, c)
    g.addColorStop(0.00, 'rgba(255,255,255,1)')
    g.addColorStop(0.18, 'rgba(232,242,255,0.86)')
    g.addColorStop(0.46, 'rgba(186,208,255,0.34)')
    g.addColorStop(0.72, 'rgba(130,168,255,0.10)')
    g.addColorStop(1.00, 'rgba(130,168,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
  })
}

function makeStreakTexture() {
  return makeCanvasTexture(96, (ctx, size) => {
    const cx = size * 0.5
    const g = ctx.createRadialGradient(cx, size * 0.68, 1, cx, size * 0.56, size * 0.56)
    g.addColorStop(0.00, 'rgba(255,255,255,0.96)')
    g.addColorStop(0.18, 'rgba(218,232,255,0.58)')
    g.addColorStop(0.52, 'rgba(172,202,255,0.16)')
    g.addColorStop(1.00, 'rgba(172,202,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)

    const line = ctx.createLinearGradient(0, 0, 0, size)
    line.addColorStop(0.00, 'rgba(255,255,255,0)')
    line.addColorStop(0.18, 'rgba(220,235,255,0.18)')
    line.addColorStop(0.52, 'rgba(255,255,255,0.82)')
    line.addColorStop(0.82, 'rgba(160,192,255,0.16)')
    line.addColorStop(1.00, 'rgba(160,192,255,0)')
    ctx.strokeStyle = line
    ctx.lineWidth = size * 0.12
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(cx, size * 0.08)
    ctx.bezierCurveTo(cx - size * 0.08, size * 0.28, cx + size * 0.1, size * 0.58, cx, size * 0.92)
    ctx.stroke()
  })
}

function makeGroundGlowTexture() {
  return makeCanvasTexture(256, (ctx, size) => {
    const c = size * 0.5
    const g = ctx.createRadialGradient(c, c, 0, c, c, c)
    g.addColorStop(0.00, 'rgba(244,248,255,0.32)')
    g.addColorStop(0.22, 'rgba(204,224,255,0.18)')
    g.addColorStop(0.52, 'rgba(148,184,255,0.06)')
    g.addColorStop(1.00, 'rgba(148,184,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)

    ctx.translate(c, c)
    ctx.strokeStyle = 'rgba(232,241,255,0.56)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(0, 0, size * 0.28, 0, Math.PI * 2)
    ctx.stroke()

    ctx.strokeStyle = 'rgba(166,202,255,0.26)'
    ctx.lineWidth = 1.5
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2
      const inner = size * 0.34
      const outer = size * (i % 2 === 0 ? 0.42 : 0.39)
      ctx.beginPath()
      ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner)
      ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer)
      ctx.stroke()
    }
  })
}

function makeCoreMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color(0xf7fbff) },
      uColorB: { value: new THREE.Color(0x9fbfff) },
      uOpacity: { value: 0.92 },
    },
    vertexShader: `
      uniform float uTime;
      varying vec3 vNormalW;
      varying vec3 vWorldPos;
      varying float vNoise;

      float wave(vec3 p) {
        return sin(p.x * 8.1 + uTime * 1.9)
          + sin(p.y * 10.7 - uTime * 1.35)
          + sin((p.x + p.z) * 7.3 + uTime * 1.12);
      }

      void main() {
        vNoise = wave(position) * 0.333;
        vec3 displaced = position + normal * (vNoise * 0.035);
        vec4 world = modelMatrix * vec4(displaced, 1.0);
        vWorldPos = world.xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform float uOpacity;
      varying vec3 vNormalW;
      varying vec3 vWorldPos;
      varying float vNoise;

      void main() {
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        float fresnel = pow(1.0 - max(dot(normalize(vNormalW), viewDir), 0.0), 2.25);
        float shimmer = 0.5 + 0.5 * sin(vWorldPos.y * 13.0 + uTime * 4.8 + vNoise * 2.0);
        float alpha = (0.18 + fresnel * 0.78 + shimmer * 0.10) * uOpacity;
        vec3 color = mix(uColorB, uColorA, 0.55 + fresnel * 0.45) * (1.25 + fresnel * 1.15);
        gl_FragColor = vec4(color, alpha);
      }
    `,
  })
}

function makeSprite(map, color, opacity = 1) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map,
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  }))
  sprite.raycast = () => {}
  return sprite
}

function makeParticleState(count) {
  return Array.from({ length: count }, (_, i) => ({
    age: Math.random(),
    life: 1.35 + Math.random() * 1.25,
    speed: 0.34 + Math.random() * 0.46,
    phase: i * 1.91 + Math.random() * Math.PI * 2,
    radius: 0.08 + Math.random() * 0.32,
    drift: (Math.random() - 0.5) * 0.16,
    height: 0.62 + Math.random() * 0.72,
    size: 0.035 + Math.random() * 0.055,
  }))
}

function makeWispState(count) {
  return Array.from({ length: count }, (_, i) => ({
    age: Math.random(),
    life: 1.8 + Math.random() * 1.55,
    speed: 0.22 + Math.random() * 0.32,
    phase: i * 2.23 + Math.random() * Math.PI * 2,
    radius: 0.13 + Math.random() * 0.24,
    height: 0.82 + Math.random() * 0.8,
    width: 0.08 + Math.random() * 0.06,
    length: 0.42 + Math.random() * 0.38,
  }))
}

export function createPickupAura(scene, position, options = {}) {
  const visualScale = options.scale ?? DEFAULT_VISUAL_SCALE
  const verticalScale = CURRENT_HEIGHT_SCALE * (options.heightScale ?? 1)
  const group = new THREE.Group()
  group.name = options.name ?? 'PickupAura'
  group.userData.cameraIgnore = true
  group.position.copy(position)

  const softDisc = makeSoftDiscTexture()
  const streakTexture = makeStreakTexture()
  const groundTexture = makeGroundGlowTexture()

  const coreGeo = new THREE.IcosahedronGeometry(0.23, 4)
  const coreMat = makeCoreMaterial()
  const core = new THREE.Mesh(coreGeo, coreMat)
  core.scale.set(1.0, 0.9, 1.08)
  group.add(core)

  const haloSprites = [
    { scale: 0.84, y: 0, opacity: 0.24, color: 0xeaf3ff },
    { scale: 1.18, y: 0.02, opacity: 0.11, color: 0xbfd6ff },
    { scale: 1.54, y: 0.04, opacity: 0.055, color: 0x8fb2ff },
  ].map(def => {
    const sprite = makeSprite(softDisc, def.color, def.opacity)
    sprite.position.y = def.y
    sprite.scale.setScalar(def.scale)
    group.add(sprite)
    return { sprite, ...def }
  })

  const groundMat = new THREE.MeshBasicMaterial({
    map: groundTexture,
    color: 0xdce8ff,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  })
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1.32, 1.32), groundMat)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.52 * visualScale
  group.add(ground)

  const ringGeo = new THREE.TorusGeometry(0.36, 0.005, 8, 96)
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xf4f8ff,
    transparent: true,
    opacity: 0.46,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const ringA = new THREE.Mesh(ringGeo, ringMat)
  ringA.position.y = -0.47 * visualScale
  ringA.rotation.x = Math.PI / 2
  ringA.scale.setScalar(visualScale)
  group.add(ringA)

  const ringB = new THREE.Mesh(ringGeo, ringMat.clone())
  ringB.position.y = 0.05 * verticalScale
  ringB.rotation.x = Math.PI / 2.35
  ringB.rotation.z = Math.PI / 5
  ringB.scale.setScalar(0.72 * visualScale)
  group.add(ringB)

  const particleState = makeParticleState(options.particleCount ?? 72)
  const particles = particleState.map(() => {
    const sprite = makeSprite(softDisc, 0xdceaff, 0)
    group.add(sprite)
    return sprite
  })

  const wispState = makeWispState(options.wispCount ?? 18)
  const wisps = wispState.map(() => {
    const sprite = makeSprite(streakTexture, 0xe8f2ff, 0)
    group.add(sprite)
    return sprite
  })

  const light = new THREE.PointLight(0xdbe9ff, 2.1, 7, 2)
  light.position.set(0, 0.05, 0)
  group.add(light)
  let fading = false
  let fadeElapsed = 0
  let fadeDuration = 0.6
  let disposed = false

  function update(dt, time) {
    const pulse = 0.5 + 0.5 * Math.sin(time * 3.1)
    const slowPulse = 0.5 + 0.5 * Math.sin(time * 1.22 + 0.65)
    if (fading) fadeElapsed += Math.max(0, dt)
    const fadeAlpha = fading
      ? THREE.MathUtils.clamp(1 - fadeElapsed / Math.max(0.001, fadeDuration), 0, 1)
      : 1

    coreMat.uniforms.uTime.value = time
    coreMat.uniforms.uOpacity.value = 0.92 * fadeAlpha
    core.rotation.y += dt * 0.42
    core.rotation.x += dt * 0.16
    core.scale.set(
      (0.96 + pulse * 0.10) * visualScale,
      (0.86 + slowPulse * 0.11) * visualScale,
      (1.02 + (1 - pulse) * 0.12) * visualScale,
    )

    haloSprites.forEach(({ sprite, scale, opacity }, i) => {
      const p = i % 2 === 0 ? pulse : slowPulse
      sprite.material.opacity = opacity * (0.72 + p * 0.42) * fadeAlpha
      sprite.scale.setScalar(scale * (0.94 + p * 0.11) * visualScale)
      sprite.material.rotation += dt * (i % 2 === 0 ? 0.08 : -0.05)
    })

    ground.rotation.z += dt * 0.12
    ground.material.opacity = (0.22 + slowPulse * 0.18) * fadeAlpha
    ground.scale.setScalar((0.94 + pulse * 0.08) * visualScale)

    ringA.rotation.z += dt * 0.55
    ringA.material.opacity = (0.28 + pulse * 0.22) * fadeAlpha
    ringB.rotation.z -= dt * 0.72
    ringB.material.opacity = (0.18 + slowPulse * 0.22) * fadeAlpha
    light.intensity = (1.3 + pulse * 1.45) * fadeAlpha

    for (let i = 0; i < particleState.length; i++) {
      const state = particleState[i]
      const sprite = particles[i]
      state.age = (state.age + dt * state.speed / state.life) % 1
      const fadeIn = THREE.MathUtils.smoothstep(state.age, 0, 0.12)
      const fadeOut = 1 - THREE.MathUtils.smoothstep(state.age, 0.58, 1)
      const fade = fadeIn * fadeOut
      const spiral = state.phase + state.age * Math.PI * 2.55 + time * 0.42
      const radius = state.radius * (0.56 + state.age * 1.1) * visualScale
      const x = Math.cos(spiral) * radius + state.drift * state.age * visualScale
      const z = Math.sin(spiral) * radius - state.drift * state.age * 0.45 * visualScale
      const y = (-0.18 + state.age * state.height + Math.sin(spiral * 1.6) * 0.03) * verticalScale
      const size = state.size * (0.8 + state.age * 1.7) * visualScale

      sprite.position.set(x, y, z)
      sprite.scale.setScalar(size)
      sprite.material.opacity = fade * (0.38 + pulse * 0.24) * fadeAlpha
      _color.setRGB(0.76 + fade * 0.22, 0.86 + fade * 0.12, 1.0)
      sprite.material.color.copy(_color)
    }

    for (let i = 0; i < wispState.length; i++) {
      const state = wispState[i]
      const sprite = wisps[i]
      state.age = (state.age + dt * state.speed / state.life) % 1
      const fadeIn = THREE.MathUtils.smoothstep(state.age, 0, 0.16)
      const fadeOut = 1 - THREE.MathUtils.smoothstep(state.age, 0.56, 1)
      const fade = fadeIn * fadeOut
      const spiral = state.phase + state.age * Math.PI * 1.72 + time * 0.28
      const radius = state.radius * (0.72 + state.age * 0.55) * visualScale
      const x = Math.cos(spiral) * radius
      const z = Math.sin(spiral) * radius
      const y = (-0.04 + state.age * state.height) * verticalScale

      sprite.position.set(x, y, z)
      sprite.scale.set(
        state.width * (0.72 + fade * 0.5) * visualScale,
        state.length * (0.7 + state.age * 0.9) * visualScale,
        1,
      )
      sprite.material.opacity = fade * 0.32 * fadeAlpha
      sprite.material.rotation = spiral * 0.18 + Math.sin(time * 0.7 + state.phase) * 0.18
    }
  }

  function fadeOut(duration = 0.6) {
    fading = true
    fadeElapsed = 0
    fadeDuration = Math.max(0.001, duration)
  }

  function isFadeComplete() {
    return fading && fadeElapsed >= fadeDuration
  }

  function dispose() {
    if (disposed) return
    disposed = true
    scene.remove(group)
    coreGeo.dispose()
    coreMat.dispose()
    ground.geometry.dispose()
    groundMat.dispose()
    ringGeo.dispose()
    ringMat.dispose()
    ringB.material.dispose()
    for (const sprite of haloSprites.map(h => h.sprite)) sprite.material.dispose()
    for (const sprite of particles) sprite.material.dispose()
    for (const sprite of wisps) sprite.material.dispose()
    softDisc.dispose()
    streakTexture.dispose()
    groundTexture.dispose()
  }

  scene.add(group)
  update(0, 0)
  return { group, update, fadeOut, isFadeComplete, dispose }
}
