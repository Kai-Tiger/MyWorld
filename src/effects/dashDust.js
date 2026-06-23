import * as THREE from 'three'

const DEFAULT_TEXTURE_URLS = [
  '/textures/vfx/kenney_particle/smoke_03.png',
  '/textures/vfx/kenney_particle/smoke_05.png',
  '/textures/vfx/kenney_particle/smoke_07.png',
]

const _dir = new THREE.Vector3()
const _side = new THREE.Vector3()
const _up = new THREE.Vector3(0, 1, 0)

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

function makeFallbackDustTexture() {
  return makeCanvasTexture(96, (ctx, size) => {
    const c = size * 0.5
    const g = ctx.createRadialGradient(c, c, 0, c, c, size * 0.45)
    g.addColorStop(0.00, 'rgba(176,154,115,0.55)')
    g.addColorStop(0.42, 'rgba(126,108,82,0.34)')
    g.addColorStop(0.78, 'rgba(82,70,55,0.14)')
    g.addColorStop(1.00, 'rgba(82,70,55,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(c, c, size * 0.45, 0, Math.PI * 2)
    ctx.fill()
  })
}

function makeSprite(map, color) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map,
    color,
    opacity: 0,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.NormalBlending,
  }))
  sprite.visible = false
  sprite.frustumCulled = false
  sprite.raycast = () => {}
  return sprite
}

function makeParticle(map, color) {
  return {
    sprite: makeSprite(map, color),
    active: false,
    age: 0,
    life: 0.42,
    velocity: new THREE.Vector3(),
    startScale: 0.36,
    stretch: 0.72,
    spin: 0,
    opacity: 0.38,
  }
}

export function createDashDust(scene, options = {}) {
  const enabled = options.enabled !== false
  const poolSize = Math.max(0, Math.floor(options.poolSize ?? 28))
  const rate = Math.max(0, options.rate ?? 22)
  const color = options.color ?? 0x76664f
  const baseOpacity = THREE.MathUtils.clamp(options.opacity ?? 0.38, 0, 1)

  if (!enabled || poolSize <= 0 || rate <= 0) {
    return {
      emit() {},
      update() {},
      dispose() {},
    }
  }

  const fallbackTexture = makeFallbackDustTexture()
  const loadedTextures = []
  const particles = Array.from({ length: poolSize }, () => {
    const particle = makeParticle(fallbackTexture, color)
    scene.add(particle.sprite)
    return particle
  })
  let cursor = 0
  let emitCarry = 0

  const loader = new THREE.TextureLoader()
  const textureUrls = Array.isArray(options.textureUrls) && options.textureUrls.length > 0
    ? options.textureUrls
    : DEFAULT_TEXTURE_URLS
  let disposed = false
  textureUrls.forEach((url) => {
    loader.load(
      url,
      (texture) => {
        if (disposed) {
          texture.dispose()
          return
        }
        texture.colorSpace = THREE.SRGBColorSpace
        texture.needsUpdate = true
        loadedTextures.push(texture)
      },
      undefined,
      () => {},
    )
  })

  function nextParticle() {
    const particle = particles[cursor]
    cursor = (cursor + 1) % particles.length
    particle.active = true
    particle.sprite.visible = true
    return particle
  }

  function pickTexture() {
    if (loadedTextures.length === 0) return fallbackTexture
    return loadedTextures[Math.floor(Math.random() * loadedTextures.length)]
  }

  function spawnOne(position, direction, intensity) {
    _dir.copy(direction)
    if (_dir.lengthSq() < 0.0001) _dir.set(0, 0, 1)
    _dir.setY(0).normalize()
    _side.set(-_dir.z, 0, _dir.x)

    const particle = nextParticle()
    const footSide = Math.random() < 0.5 ? -1 : 1
    const sideOffset = footSide * (0.14 + Math.random() * 0.18) + (Math.random() - 0.5) * 0.12
    const backOffset = 0.18 + Math.random() * 0.34
    particle.sprite.position.copy(position)
      .addScaledVector(_dir, -backOffset)
      .addScaledVector(_side, sideOffset)
      .addScaledVector(_up, 0.025 + Math.random() * 0.045)

    particle.velocity.copy(_dir)
      .multiplyScalar(-(0.16 + Math.random() * 0.36))
      .addScaledVector(_side, (Math.random() - 0.5) * 0.36)
      .addScaledVector(_up, 0.035 + Math.random() * 0.09)

    const clampedIntensity = THREE.MathUtils.clamp(intensity, 0.75, 1.55)
    particle.age = 0
    particle.life = 0.32 + Math.random() * 0.2
    particle.startScale = (0.26 + Math.random() * 0.18) * clampedIntensity
    particle.stretch = 0.58 + Math.random() * 0.32
    particle.spin = (Math.random() - 0.5) * 2.4
    particle.opacity = baseOpacity * (0.72 + Math.random() * 0.28)
    const nextMap = pickTexture()
    if (particle.sprite.material.map !== nextMap) {
      particle.sprite.material.map = nextMap
      particle.sprite.material.needsUpdate = true
    }
    particle.sprite.material.color.setHex(color)
    particle.sprite.material.opacity = particle.opacity
    particle.sprite.material.rotation = Math.random() * Math.PI * 2
    particle.sprite.scale.set(particle.startScale, particle.startScale * particle.stretch, 1)
  }

  function emit(position, direction, dt, intensity = 1) {
    if (dt <= 0) return
    const clampedIntensity = THREE.MathUtils.clamp(intensity, 0.65, 1.6)
    emitCarry += dt * rate * clampedIntensity
    const count = Math.min(4, Math.floor(emitCarry))
    if (count <= 0) return
    emitCarry -= count
    for (let i = 0; i < count; i++) spawnOne(position, direction, clampedIntensity)
  }

  function update(dt) {
    const step = Math.min(Math.max(0, dt), 0.05)
    for (const particle of particles) {
      if (!particle.active) continue
      particle.age += step
      const t = particle.age / particle.life
      if (t >= 1) {
        particle.active = false
        particle.sprite.visible = false
        particle.sprite.material.opacity = 0
        continue
      }

      particle.sprite.position.addScaledVector(particle.velocity, step)
      particle.velocity.multiplyScalar(1 - step * 2.6)
      particle.sprite.material.rotation += particle.spin * step

      const fadeIn = Math.min(1, t / 0.18)
      const fadeOut = Math.max(0, 1 - t)
      particle.sprite.material.opacity = particle.opacity * fadeIn * fadeOut * fadeOut
      const grow = 1 + t * 1.25
      particle.sprite.scale.set(particle.startScale * grow, particle.startScale * particle.stretch * grow, 1)
    }
  }

  function dispose() {
    if (disposed) return
    disposed = true
    for (const particle of particles) {
      scene.remove(particle.sprite)
      particle.sprite.material.dispose()
    }
    fallbackTexture.dispose()
    loadedTextures.forEach(texture => texture.dispose())
  }

  return { emit, update, dispose }
}
