import * as THREE from 'three'

const _side = new THREE.Vector3()
const _up = new THREE.Vector3(0, 1, 0)
const _forward = new THREE.Vector3()
const BLOOD_TEXTURE_URL = '/textures/blood.png'

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

function makeDropTexture() {
  return makeCanvasTexture(96, (ctx, size) => {
    const c = size * 0.5
    const g = ctx.createRadialGradient(c, c * 0.9, 0, c, c, c * 0.55)
    g.addColorStop(0.00, 'rgba(255,76,54,0.95)')
    g.addColorStop(0.38, 'rgba(136,0,10,0.76)')
    g.addColorStop(0.78, 'rgba(42,0,6,0.28)')
    g.addColorStop(1.00, 'rgba(42,0,6,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.ellipse(c, c, size * 0.16, size * 0.33, -0.2, 0, Math.PI * 2)
    ctx.fill()
  })
}

function makeSprite(map, color, opacity = 0) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map,
    color,
    opacity,
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
  const sprite = makeSprite(map, color)
  return {
    sprite,
    active: false,
    age: 0,
    life: 0.45,
    velocity: new THREE.Vector3(),
    gravity: 2.5,
    startScale: 0.24,
    stretch: 1,
    spin: 0,
    opacity: 1,
  }
}

export function createBloodSplatter(scene, options = {}) {
  const poolSize = options.poolSize ?? 90
  const fallbackTexture = makeDropTexture()
  let loadedTexture = null
  const particles = Array.from({ length: poolSize }, (_, i) => {
    const particle = makeParticle(fallbackTexture, i % 3 === 0 ? 0x8a0711 : 0x5f0008)
    scene.add(particle.sprite)
    return particle
  })
  let cursor = 0

  new THREE.TextureLoader().load(
    options.textureUrl ?? BLOOD_TEXTURE_URL,
    (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace
      texture.needsUpdate = true
      loadedTexture = texture
      for (const particle of particles) {
        particle.sprite.material.map = loadedTexture
        particle.sprite.material.color.setHex(0xffffff)
        particle.sprite.material.needsUpdate = true
      }
    },
    undefined,
    () => {
      loadedTexture = null
    },
  )

  function nextParticle() {
    const particle = particles[cursor]
    cursor = (cursor + 1) % particles.length
    particle.active = true
    particle.sprite.visible = true
    return particle
  }

  function spawn(position, direction, intensity = 1) {
    _forward.copy(direction)
    if (_forward.lengthSq() < 0.0001) _forward.set(0, 0, 1)
    _forward.setY(0).normalize()
    _side.set(-_forward.z, 0, _forward.x)
    const count = Math.round(10 + THREE.MathUtils.clamp(intensity, 0.8, 1.6) * 5)

    for (let i = 0; i < count; i++) {
      const particle = nextParticle()
      const mist = i % 4 === 0
      const spread = (Math.random() - 0.5) * (mist ? 1.7 : 1.15)
      const lift = 0.26 + Math.random() * (mist ? 0.5 : 0.36)
      particle.sprite.position.copy(position)
        .addScaledVector(_forward, 0.12)
        .addScaledVector(_side, (Math.random() - 0.5) * 0.38)
        .addScaledVector(_up, (Math.random() - 0.5) * 0.28)
      particle.velocity.copy(_forward)
        .multiplyScalar((mist ? 1.55 : 2.35) + Math.random() * (mist ? 1.65 : 2.85))
        .addScaledVector(_side, spread)
        .addScaledVector(_up, lift)
      particle.age = 0
      particle.life = mist ? 0.32 + Math.random() * 0.2 : 0.46 + Math.random() * 0.26
      particle.gravity = mist ? 0.7 : 3.6
      particle.startScale = mist ? 0.84 + Math.random() * 0.56 : 0.36 + Math.random() * 0.26
      particle.stretch = mist ? 1.1 + Math.random() * 0.65 : 1.45 + Math.random() * 0.9
      particle.spin = (Math.random() - 0.5) * (mist ? 6 : 12)
      particle.opacity = mist ? 0.58 : 0.92
      particle.sprite.material.opacity = particle.opacity
      particle.sprite.material.rotation = Math.random() * Math.PI * 2
      particle.sprite.scale.set(particle.startScale, particle.startScale * particle.stretch, 1)
    }
  }

  function update(dt) {
    for (const particle of particles) {
      if (!particle.active) continue
      particle.age += dt
      const t = particle.age / particle.life
      if (t >= 1) {
        particle.active = false
        particle.sprite.visible = false
        particle.sprite.material.opacity = 0
        continue
      }
      const fade = Math.max(0, 1 - t)
      particle.sprite.position.addScaledVector(particle.velocity, dt)
      particle.velocity.multiplyScalar(1 - dt * 1.35)
      particle.velocity.y -= particle.gravity * dt
      particle.sprite.material.rotation += particle.spin * dt
      particle.sprite.material.opacity = particle.opacity * fade * fade
      const grow = 1 + t * 0.85
      particle.sprite.scale.set(particle.startScale * grow, particle.startScale * particle.stretch * grow, 1)
    }
  }

  function dispose() {
    for (const particle of particles) {
      scene.remove(particle.sprite)
      particle.sprite.material.dispose()
    }
    fallbackTexture.dispose()
    loadedTexture?.dispose()
  }

  return { spawn, update, dispose }
}
