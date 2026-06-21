import * as THREE from 'three'

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

function makeGlowTexture() {
  return makeCanvasTexture(128, (ctx, size) => {
    const c = size * 0.5
    const g = ctx.createRadialGradient(c, c, 0, c, c, c)
    g.addColorStop(0.00, 'rgba(255,245,205,1)')
    g.addColorStop(0.24, 'rgba(255,176,54,0.72)')
    g.addColorStop(0.56, 'rgba(255,95,18,0.18)')
    g.addColorStop(1.00, 'rgba(255,95,18,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
  })
}

function makeStreakTexture() {
  return makeCanvasTexture(96, (ctx, size) => {
    const cx = size * 0.5
    const g = ctx.createLinearGradient(0, 0, 0, size)
    g.addColorStop(0.00, 'rgba(255,210,95,0)')
    g.addColorStop(0.20, 'rgba(255,194,74,0.22)')
    g.addColorStop(0.52, 'rgba(255,245,185,0.88)')
    g.addColorStop(0.78, 'rgba(255,120,28,0.22)')
    g.addColorStop(1.00, 'rgba(255,120,28,0)')
    ctx.strokeStyle = g
    ctx.lineWidth = size * 0.10
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(cx, size * 0.08)
    ctx.bezierCurveTo(cx - size * 0.12, size * 0.35, cx + size * 0.13, size * 0.58, cx, size * 0.92)
    ctx.stroke()
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

function makeAuraMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uAlpha: { value: 1 },
      uColorA: { value: new THREE.Color(0xfff0a8) },
      uColorB: { value: new THREE.Color(0xff6818) },
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
      uniform float uAlpha;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      varying vec2 vUv;

      void main() {
        float vertical = smoothstep(0.0, 0.20, vUv.y) * (1.0 - smoothstep(0.78, 1.0, vUv.y));
        float bands = sin(vUv.x * 37.0 + vUv.y * 9.0 - uTime * 5.4);
        float strands = smoothstep(0.48, 1.0, bands);
        float lift = smoothstep(0.0, 1.0, fract(vUv.y - uTime * 0.42));
        float alpha = (0.05 + strands * 0.34 + lift * 0.10) * vertical * uAlpha;
        vec3 color = mix(uColorB, uColorA, strands * 0.8 + lift * 0.2);
        gl_FragColor = vec4(color * (1.25 + strands * 0.9), alpha);
      }
    `,
  })
}

export function createHealAura(playerGroup, options = {}) {
  const duration = Math.max(0.1, options.duration ?? 1.2)
  const group = new THREE.Group()
  group.name = 'HealAura'
  group.userData.cameraIgnore = true
  group.position.set(0, 0.05, 0)

  const glowTexture = makeGlowTexture()
  const streakTexture = makeStreakTexture()
  const auraMat = makeAuraMaterial()
  const aura = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.50, 1.95, 48, 1, true), auraMat)
  aura.position.y = 0.88
  group.add(aura)

  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xffa72b,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.012, 8, 96), ringMat)
  ring.rotation.x = Math.PI / 2
  ring.position.y = 0.08
  group.add(ring)

  const groundGlow = makeSprite(glowTexture, 0xff9f22, 0.48)
  groundGlow.position.y = 0.08
  groundGlow.scale.set(1.25, 1.25, 1)
  group.add(groundGlow)

  const wisps = Array.from({ length: 16 }, (_, i) => {
    const sprite = makeSprite(streakTexture, i % 3 === 0 ? 0xfff0a8 : 0xff9228, 0)
    const phase = i * 1.73 + Math.random() * Math.PI * 2
    const radius = 0.24 + Math.random() * 0.34
    const height = 1.1 + Math.random() * 0.68
    sprite.userData.heal = {
      phase,
      radius,
      height,
      age: Math.random(),
      speed: 0.65 + Math.random() * 0.55,
      width: 0.05 + Math.random() * 0.05,
      length: 0.34 + Math.random() * 0.36,
    }
    group.add(sprite)
    return sprite
  })

  const sparks = Array.from({ length: 34 }, (_, i) => {
    const sprite = makeSprite(glowTexture, 0xffcf61, 0)
    sprite.userData.heal = {
      phase: i * 2.13 + Math.random() * Math.PI * 2,
      radius: 0.08 + Math.random() * 0.42,
      height: 0.8 + Math.random() * 1.2,
      age: Math.random(),
      speed: 0.75 + Math.random() * 0.7,
      size: 0.035 + Math.random() * 0.045,
    }
    group.add(sprite)
    return sprite
  })

  const light = new THREE.PointLight(0xff9a2c, 1.7, 4.5, 2)
  light.position.y = 0.9
  group.add(light)

  playerGroup.add(group)
  let elapsed = 0

  function update(dt, time) {
    elapsed += Math.max(0, dt)
    const progress = THREE.MathUtils.clamp(elapsed / duration, 0, 1)
    const fadeIn = THREE.MathUtils.smoothstep(progress, 0, 0.16)
    const fadeOut = 1 - THREE.MathUtils.smoothstep(progress, 0.72, 1)
    const alpha = fadeIn * fadeOut

    auraMat.uniforms.uTime.value = time
    auraMat.uniforms.uAlpha.value = alpha
    aura.rotation.y += dt * 1.1
    aura.scale.setScalar(0.96 + Math.sin(time * 8) * 0.025)

    ring.rotation.z += dt * 2.4
    ring.material.opacity = alpha * 0.48
    ring.scale.setScalar(0.9 + progress * 0.55)
    groundGlow.material.opacity = alpha * 0.36
    groundGlow.material.rotation += dt * 0.9
    light.intensity = alpha * (1.1 + Math.sin(time * 10) * 0.4)

    wisps.forEach((sprite) => {
      const state = sprite.userData.heal
      state.age = (state.age + dt * state.speed / duration) % 1
      const lifeFade = THREE.MathUtils.smoothstep(state.age, 0, 0.18) * (1 - THREE.MathUtils.smoothstep(state.age, 0.72, 1))
      const spiral = state.phase + state.age * Math.PI * 2.25 + time * 1.4
      const r = state.radius * (0.72 + state.age * 0.35)
      sprite.position.set(Math.cos(spiral) * r, 0.12 + state.age * state.height, Math.sin(spiral) * r)
      sprite.scale.set(state.width * (0.8 + lifeFade), state.length * (0.9 + state.age), 1)
      sprite.material.opacity = alpha * lifeFade * 0.46
      sprite.material.rotation = spiral * 0.16 + Math.sin(time * 1.5 + state.phase) * 0.2
    })

    sparks.forEach((sprite) => {
      const state = sprite.userData.heal
      state.age = (state.age + dt * state.speed / duration) % 1
      const lifeFade = THREE.MathUtils.smoothstep(state.age, 0, 0.12) * (1 - THREE.MathUtils.smoothstep(state.age, 0.58, 1))
      const spiral = state.phase + state.age * Math.PI * 3.0 + time * 1.9
      const r = state.radius * (0.55 + state.age * 0.9)
      sprite.position.set(Math.cos(spiral) * r, 0.1 + state.age * state.height, Math.sin(spiral) * r)
      sprite.scale.setScalar(state.size * (1 + state.age * 1.8))
      sprite.material.opacity = alpha * lifeFade * 0.55
    })

    return progress < 1
  }

  function dispose() {
    group.removeFromParent()
    aura.geometry.dispose()
    auraMat.dispose()
    ring.geometry.dispose()
    ringMat.dispose()
    groundGlow.material.dispose()
    wisps.forEach(sprite => sprite.material.dispose())
    sparks.forEach(sprite => sprite.material.dispose())
    glowTexture.dispose()
    streakTexture.dispose()
  }

  update(0, 0)
  return { group, update, dispose }
}
