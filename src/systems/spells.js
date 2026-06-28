import * as THREE from 'three'
import { BALANCE } from '../config/balance.js'

const VFX_TEXTURE_BASE = '/textures/vfx/kenney_particle'
const CUSTOM_FIREBALL_TEXTURE = '/textures/vfx/custom/fireball_1024.png'
const FIRE_TEXTURES = {
  fire: ['fire_01.png', 'fire_02.png'],
  flame: ['flame_01.png', 'flame_02.png', 'flame_03.png', 'flame_04.png', 'flame_05.png', 'flame_06.png'],
  smoke: ['smoke_01.png', 'smoke_02.png', 'smoke_03.png', 'smoke_04.png', 'smoke_05.png', 'smoke_06.png', 'smoke_07.png', 'smoke_08.png', 'smoke_09.png', 'smoke_10.png'],
  spark: ['spark_01.png', 'spark_02.png', 'spark_03.png', 'spark_04.png', 'spark_05.png', 'spark_06.png', 'spark_07.png'],
  muzzle: ['muzzle_01.png', 'muzzle_02.png', 'muzzle_03.png', 'muzzle_04.png', 'muzzle_05.png'],
  trace: ['trace_01.png', 'trace_02.png', 'trace_03.png', 'trace_04.png', 'trace_05.png', 'trace_06.png', 'trace_07.png'],
}

const _tmpDist = new THREE.Vector3()
const _tmpForward = new THREE.Vector3()
const _tmpSide = new THREE.Vector3()
const _tmpUp = new THREE.Vector3(0, 1, 0)
const _tmpColor = new THREE.Color()
const _tmpLocalBack = new THREE.Vector3()
const _tmpTrailBase = new THREE.Vector3()
const _tmpSegmentA = new THREE.Vector3()
const _tmpSegmentB = new THREE.Vector3()
const _tmpSegmentR = new THREE.Vector3()
const _tmpClosestA = new THREE.Vector3()
const _tmpClosestB = new THREE.Vector3()
const _tmpCapsuleStart = new THREE.Vector3()
const _tmpCapsuleEnd = new THREE.Vector3()
const FIREBALL_POOL_PREWARM = 3
const FIREBALL_BURST_POOL_PREWARM = 2

function makeParticleGeometry(count) {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(count * 3, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(count * 3, 3))
  geometry.setAttribute('size', new THREE.Float32BufferAttribute(count, 1))
  geometry.setAttribute('alpha', new THREE.Float32BufferAttribute(count, 1))
  return geometry
}

function randomUnitVector(out) {
  const y = Math.random() * 2 - 1
  const a = Math.random() * Math.PI * 2
  const r = Math.sqrt(Math.max(0, 1 - y * y))
  out.set(Math.cos(a) * r, y, Math.sin(a) * r)
  return out
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)]
}

function smooth01(t) {
  const x = THREE.MathUtils.clamp(t, 0, 1)
  return x * x * (3 - 2 * x)
}

function distanceSqSegmentToSegment(startA, endA, startB, endB) {
  _tmpSegmentA.subVectors(endA, startA)
  _tmpSegmentB.subVectors(endB, startB)
  _tmpSegmentR.subVectors(startA, startB)

  const a = _tmpSegmentA.dot(_tmpSegmentA)
  const e = _tmpSegmentB.dot(_tmpSegmentB)
  const f = _tmpSegmentB.dot(_tmpSegmentR)
  const eps = 0.000001
  let s = 0
  let t = 0

  if (a <= eps && e <= eps) return startA.distanceToSquared(startB)
  if (a <= eps) {
    t = THREE.MathUtils.clamp(f / e, 0, 1)
  } else {
    const c = _tmpSegmentA.dot(_tmpSegmentR)
    if (e <= eps) {
      s = THREE.MathUtils.clamp(-c / a, 0, 1)
    } else {
      const b = _tmpSegmentA.dot(_tmpSegmentB)
      const denom = a * e - b * b
      if (denom !== 0) s = THREE.MathUtils.clamp((b * f - c * e) / denom, 0, 1)
      const tnom = b * s + f
      if (tnom < 0) {
        t = 0
        s = THREE.MathUtils.clamp(-c / a, 0, 1)
      } else if (tnom > e) {
        t = 1
        s = THREE.MathUtils.clamp((b - c) / a, 0, 1)
      } else {
        t = tnom / e
      }
    }
  }

  _tmpClosestA.copy(startA).addScaledVector(_tmpSegmentA, s)
  _tmpClosestB.copy(startB).addScaledVector(_tmpSegmentB, t)
  return _tmpClosestA.distanceToSquared(_tmpClosestB)
}

function configureTexture(texture) {
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = true
  return texture
}

function loadTrackedTexture(loader, url, pending) {
  let resolveLoad
  const promise = new Promise((resolve) => { resolveLoad = resolve })
  const texture = loader.load(
    url,
    (loadedTexture) => resolveLoad(loadedTexture),
    undefined,
    (error) => {
      console.warn(`Spell texture preload failed: ${url}`, error)
      resolveLoad(null)
    },
  )
  pending.push(promise)
  return configureTexture(texture)
}

function loadTextureSet(loader, files, pending) {
  return files.map((file) => loadTrackedTexture(loader, `${VFX_TEXTURE_BASE}/${file}`, pending))
}

function makeSprite(map, {
  color = 0xffffff,
  opacity = 1,
  blending = THREE.AdditiveBlending,
  depthTest = true,
} = {}) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map,
    color,
    opacity,
    transparent: true,
    depthWrite: false,
    depthTest,
    blending,
  }))
  sprite.visible = false
  sprite.frustumCulled = false
  return sprite
}

function makeFireRingMaterial() {
  return new THREE.MeshBasicMaterial({
    color: 0xffb13a,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
}

function makeShockwaveMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uAge: { value: 0 },
      uLife: { value: 1 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uAge;
      uniform float uLife;
      varying vec2 vUv;

      void main() {
        float t = clamp(uAge / max(uLife, 0.001), 0.0, 1.0);
        float r = distance(vUv, vec2(0.5));
        float ring = smoothstep(0.48, 0.36, r) * smoothstep(0.20, 0.34, r);
        float crackle = sin((vUv.x + vUv.y) * 44.0 + uAge * 18.0) * 0.5 + 0.5;
        float alpha = ring * (1.0 - t) * (0.55 + crackle * 0.45);
        vec3 color = mix(vec3(1.0, 0.24, 0.03), vec3(1.0, 0.86, 0.34), 1.0 - t);
        gl_FragColor = vec4(color * 1.8, alpha);
      }
    `,
  })
}

function makeTexturedPointsMaterial(map) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uMap: { value: map },
    },
    vertexShader: `
      attribute float size;
      attribute float alpha;
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vColor = color;
        vAlpha = alpha;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (330.0 / max(0.1, -mvPosition.z));
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vec4 tex = texture2D(uMap, gl_PointCoord);
        float alpha = tex.a * vAlpha;
        if (alpha <= 0.01) discard;
        gl_FragColor = vec4(vColor * tex.rgb, alpha);
      }
    `,
    vertexColors: true,
  })
}

export const SPELLS = {
  fireball: {
    config: BALANCE.spells.fireball,
  },
}

export class SpellSystem {
  constructor(scene) {
    this.scene = scene
    this.projectiles = []
    this.bursts = []
    this.cooldowns = new Map()
    this._pressed = new Set()

    const textureLoader = new THREE.TextureLoader()
    const textureLoads = []
    this._textures = Object.fromEntries(
      Object.entries(FIRE_TEXTURES).map(([key, files]) => [key, loadTextureSet(textureLoader, files, textureLoads)])
    )
    this._fireballTexture = loadTrackedTexture(textureLoader, CUSTOM_FIREBALL_TEXTURE, textureLoads)
    this._textureReadyPromise = Promise.allSettled(textureLoads)

    this._ringGeo = new THREE.TorusGeometry(SPELLS.fireball.config.radius * 1.32, 0.016, 8, 64)
    this._shockwaveGeo = new THREE.RingGeometry(0.24, 0.42, 96)
    this._trailMat = makeTexturedPointsMaterial(this._textures.spark[4])
    this._burstMat = makeTexturedPointsMaterial(this._textures.spark[1])
    this._fireballPool = []
    for (let i = 0; i < FIREBALL_POOL_PREWARM; i++) {
      this._fireballPool.push(this._createFireballProjectile())
    }
    this._burstPool = []
    for (let i = 0; i < FIREBALL_BURST_POOL_PREWARM; i++) {
      this._burstPool.push(this._createBurst())
    }
  }

  _cooldown(spellId) {
    return this.cooldowns.get(spellId) ?? 0
  }

  _setCooldown(spellId, value) {
    this.cooldowns.set(spellId, value)
  }

  consumeCastRequest(spellId, input) {
    const spell = SPELLS[spellId]
    if (!spell) return false
    const key = spell.config.key
    const pressed = input.isPressed(key)
    const wasPressed = this._pressed.has(key)
    if (pressed) this._pressed.add(key)
    else this._pressed.delete(key)
    return pressed && !wasPressed && this._cooldown(spellId) <= 0
  }

  beginCast(spellId) {
    const spell = SPELLS[spellId]
    if (!spell || this._cooldown(spellId) > 0) return false
    this._setCooldown(spellId, spell.config.cooldown)
    return true
  }

  release(spellId, origin, direction, playerAtk = BALANCE.player.atk) {
    const spell = SPELLS[spellId]
    if (!spell) return false
    const cfg = spell.config

    _tmpForward.copy(direction)
    if (_tmpForward.lengthSq() < 0.0001) return false
    _tmpForward.normalize()

    if (spellId === 'fireball') this._spawnFireball(origin, _tmpForward, playerAtk + cfg.damage)
    return true
  }

  _createFireballProjectile() {
    const cfg = SPELLS.fireball.config
    const group = new THREE.Group()
    group.visible = false

    const baseHeight = cfg.radius * 2.25
    const baseWidth = baseHeight * (1024 / 576)
    const fireballLayers = [
      { scale: 1.18, color: 0xff6420, opacity: 0.55, spin: -1.6 },
      { scale: 0.96, color: 0xffffff, opacity: 0.92, spin: 1.1 },
      { scale: 0.62, color: 0xfff0a8, opacity: 0.72, spin: 2.2 },
    ].map((layer) => {
      const sprite = makeSprite(this._fireballTexture, {
        color: layer.color,
        opacity: layer.opacity,
      })
      sprite.scale.set(baseWidth * layer.scale, baseHeight * layer.scale, 1)
      group.add(sprite)
      return {
        sprite,
        baseWidth: baseWidth * layer.scale,
        baseHeight: baseHeight * layer.scale,
        baseOpacity: layer.opacity,
        spin: layer.spin,
      }
    })

    const ringA = new THREE.Mesh(this._ringGeo, makeFireRingMaterial())
    ringA.rotation.x = Math.PI / 2
    group.add(ringA)

    const ringB = new THREE.Mesh(this._ringGeo, makeFireRingMaterial())
    ringB.rotation.y = Math.PI / 2
    ringB.rotation.z = Math.PI / 5
    group.add(ringB)

    const light = new THREE.PointLight(0xff8a22, 6.4, 11, 2)
    light.position.set(0, 0, 0)
    group.add(light)

    const trailGeometry = makeParticleGeometry(cfg.trailParticles)
    const trail = new THREE.Points(trailGeometry, this._trailMat)
    trail.frustumCulled = false
    trail.visible = false
    this.scene.add(trail)

    const flameState = Array.from({ length: 22 }, (_, i) => {
      const sprite = makeSprite(pick(i % 4 === 0 ? this._textures.trace : this._textures.flame), {
        color: i % 5 === 0 ? 0xfff0a8 : 0xff7a22,
        opacity: 0,
      })
      this.scene.add(sprite)
      return {
        sprite,
        age: 1,
        life: 1,
        velocity: new THREE.Vector3(),
        startScale: 1,
        spin: 0,
      }
    })

    this.scene.add(group)

    const particleState = Array.from({ length: cfg.trailParticles }, () => ({
      age: 1,
      life: 1,
      velocity: new THREE.Vector3(),
      size: 0,
    }))

    const projectile = {
      spellId: 'fireball',
      group,
      fireballLayers,
      ringA,
      ringB,
      light,
      trail,
      trailGeometry,
      particleState,
      particleCursor: 0,
      flameState,
      flameCursor: 0,
      age: 0,
      velocity: new THREE.Vector3(),
      previousPosition: new THREE.Vector3(),
      ttl: cfg.lifeTime,
      damage: 0,
      radius: cfg.radius,
    }
    this._resetFireballProjectile(projectile)
    return projectile
  }

  _resetFireballProjectile(p) {
    const cfg = SPELLS.fireball.config
    p.group.visible = false
    p.trail.visible = false
    p.particleCursor = 0
    p.flameCursor = 0
    p.age = 0
    p.ttl = cfg.lifeTime
    p.damage = 0
    p.velocity.set(0, 0, 0)
    p.previousPosition.set(0, 0, 0)

    const positions = p.trailGeometry.getAttribute('position')
    const colors = p.trailGeometry.getAttribute('color')
    const sizes = p.trailGeometry.getAttribute('size')
    const alphas = p.trailGeometry.getAttribute('alpha')
    for (let i = 0; i < cfg.trailParticles; i++) {
      const state = p.particleState[i]
      state.age = 1
      state.life = 1
      state.velocity.set(0, 0, 0)
      state.size = 0
      positions.setXYZ(i, 0, 0, 0)
      colors.setXYZ(i, 1, 0.35, 0.05)
      sizes.setX(i, 0)
      alphas.setX(i, 0)
    }
    positions.needsUpdate = true
    colors.needsUpdate = true
    sizes.needsUpdate = true
    alphas.needsUpdate = true

    p.fireballLayers.forEach((layer) => {
      layer.sprite.visible = false
      layer.sprite.material.opacity = layer.baseOpacity
      layer.sprite.material.rotation = 0
      layer.sprite.scale.set(layer.baseWidth, layer.baseHeight, 1)
    })
    p.ringA.material.opacity = 0.62
    p.ringB.material.opacity = 0.62
    p.ringA.rotation.set(Math.PI / 2, 0, 0)
    p.ringB.rotation.set(0, Math.PI / 2, Math.PI / 5)
    p.light.intensity = 0

    for (const state of p.flameState) {
      state.sprite.visible = false
      state.sprite.material.opacity = 0
      state.age = 1
      state.life = 1
      state.velocity.set(0, 0, 0)
      state.startScale = 1
      state.spin = 0
    }
  }

  _acquireFireballProjectile() {
    return this._fireballPool.pop() ?? this._createFireballProjectile()
  }

  _spawnFireball(origin, direction, damage) {
    const cfg = SPELLS.fireball.config
    const projectile = this._acquireFireballProjectile()
    this._resetFireballProjectile(projectile)
    projectile.group.position.copy(origin)
    projectile.previousPosition.copy(origin)
    projectile.group.visible = true
    projectile.trail.visible = true
    projectile.velocity.copy(direction).multiplyScalar(cfg.speed)
    projectile.velocity.y += cfg.launchUpVelocity
    projectile.ttl = cfg.lifeTime
    projectile.damage = damage
    projectile.radius = cfg.radius
    projectile.fireballLayers.forEach((layer) => {
      layer.sprite.visible = true
      layer.sprite.material.rotation = Math.random() * Math.PI * 2
    })
    projectile.light.intensity = 6.4
    this.projectiles.push(projectile)
  }

  _emitFlameSprite(p, base, localBack, side, up, seed) {
    const state = p.flameState[p.flameCursor]
    p.flameCursor = (p.flameCursor + 1) % p.flameState.length

    const lateral = (Math.random() - 0.5) * 0.28
    const lift = (Math.random() - 0.5) * 0.16
    state.sprite.position.copy(base)
      .addScaledVector(side, lateral)
      .addScaledVector(up, lift)
    state.velocity.copy(localBack)
      .multiplyScalar(1.1 + Math.random() * 1.2)
      .addScaledVector(side, (Math.random() - 0.5) * 0.65)
      .addScaledVector(up, 0.18 + Math.random() * 0.34)
    state.age = 0
    state.life = 0.18 + Math.random() * 0.22
    state.startScale = 0.46 + Math.random() * 0.38
    state.spin = (Math.random() - 0.5) * 8
    state.sprite.visible = true
    state.sprite.material.rotation = seed + Math.random() * Math.PI
    state.sprite.material.opacity = 0.78
    state.sprite.scale.setScalar(state.startScale)
  }

  _emitTrail(p, count) {
    const positions = p.trailGeometry.getAttribute('position')
    const colors = p.trailGeometry.getAttribute('color')
    const sizes = p.trailGeometry.getAttribute('size')
    const alphas = p.trailGeometry.getAttribute('alpha')
    const forward = _tmpForward.copy(p.velocity).normalize()
    const localBack = _tmpLocalBack.copy(forward).multiplyScalar(-0.34)
    const side = _tmpSide.set(-forward.z, 0, forward.x)
    if (side.lengthSq() < 0.0001) side.set(1, 0, 0)
    side.normalize()

    for (let n = 0; n < count; n++) {
      const i = p.particleCursor
      const state = p.particleState[i]
      state.age = 0
      state.life = 0.42 + Math.random() * 0.36
      state.size = 0.18 + Math.random() * 0.18
      randomUnitVector(state.velocity)
      state.velocity.multiplyScalar(0.28 + Math.random() * 0.9).add(localBack)

      const swirl = p.age * 18 + n * 1.4 + Math.random() * 0.9
      const radius = 0.08 + Math.random() * 0.22
      const sx = Math.cos(swirl) * radius
      const sy = Math.sin(swirl) * radius
      const back = 0.06 + Math.random() * 0.5
      const base = _tmpTrailBase.copy(p.group.position)
        .addScaledVector(forward, -back)
        .addScaledVector(side, sx)
        .addScaledVector(_tmpUp, sy)
      const jitter = 0.04 + Math.random() * 0.07
      positions.setXYZ(
        i,
        base.x + (Math.random() - 0.5) * jitter,
        base.y + (Math.random() - 0.5) * jitter,
        base.z + (Math.random() - 0.5) * jitter,
      )
      if (Math.random() < 0.12) colors.setXYZ(i, 1.0, 0.88, 0.36)
      else colors.setXYZ(i, 1, 0.28 + Math.random() * 0.42, 0.03)
      sizes.setX(i, state.size)
      alphas.setX(i, 0.9)
      p.particleCursor = (p.particleCursor + 1) % p.particleState.length

      if (n % 3 === 0) this._emitFlameSprite(p, base, localBack, side, _tmpUp, swirl)
    }
  }

  _createBurst() {
    const cfg = SPELLS.fireball.config
    const geometry = makeParticleGeometry(cfg.burstParticles)
    const points = new THREE.Points(geometry, this._burstMat)
    points.frustumCulled = false
    points.visible = false
    this.scene.add(points)

    const shockwaveMat = makeShockwaveMaterial()
    const shockwave = new THREE.Mesh(this._shockwaveGeo, shockwaveMat)
    shockwave.rotation.x = -Math.PI / 2
    shockwave.visible = false
    this.scene.add(shockwave)

    const sparkState = Array.from({ length: cfg.burstParticles }, () => ({
      age: 1,
      life: 1,
      velocity: new THREE.Vector3(),
      size: 0,
    }))

    const flameSprites = Array.from({ length: 10 }, (_, i) => {
      const sprite = makeSprite(pick(i % 3 === 0 ? this._textures.muzzle : this._textures.fire), {
        color: i % 4 === 0 ? 0xfff0a6 : 0xff6a1a,
        opacity: 0.96,
      })
      this.scene.add(sprite)
      return {
        sprite,
        age: 1,
        life: 1,
        velocity: new THREE.Vector3(),
        startScale: 1,
        spin: 0,
      }
    })

    const smokeSprites = Array.from({ length: 14 }, (_, i) => {
      const sprite = makeSprite(pick(this._textures.smoke), {
        color: i % 4 === 0 ? 0xff9a42 : 0x5f5045,
        opacity: 0,
        blending: THREE.NormalBlending,
      })
      this.scene.add(sprite)
      return {
        sprite,
        age: 1,
        life: 1,
        delay: 0,
        velocity: new THREE.Vector3(),
        startScale: 1,
        spin: 0,
      }
    })

    const light = new THREE.PointLight(0xff7a22, 10.5, 14, 2)
    light.intensity = 0
    light.visible = false
    this.scene.add(light)
    const burst = {
      points,
      geometry,
      sparkState,
      light,
      shockwave,
      flameSprites,
      smokeSprites,
      age: 0,
      life: 1.08,
    }
    this._resetBurst(burst)
    return burst
  }

  _resetBurst(burst) {
    const cfg = SPELLS.fireball.config
    burst.age = 0
    burst.life = 1.08
    burst.points.visible = false
    burst.points.position.set(0, 0, 0)
    burst.light.intensity = 0
    burst.light.visible = false
    burst.shockwave.visible = false
    burst.shockwave.position.set(0, 0, 0)
    burst.shockwave.rotation.set(-Math.PI / 2, 0, 0)
    burst.shockwave.scale.setScalar(1)
    if (burst.shockwave.material.uniforms) {
      burst.shockwave.material.uniforms.uAge.value = 0
      burst.shockwave.material.uniforms.uLife.value = 1
    }

    const positions = burst.geometry.getAttribute('position')
    const colors = burst.geometry.getAttribute('color')
    const sizes = burst.geometry.getAttribute('size')
    const alphas = burst.geometry.getAttribute('alpha')
    for (let i = 0; i < cfg.burstParticles; i++) {
      const state = burst.sparkState[i]
      state.age = 1
      state.life = 1
      state.velocity.set(0, 0, 0)
      state.size = 0
      positions.setXYZ(i, 0, 0, 0)
      colors.setXYZ(i, 1, 0.35, 0.05)
      sizes.setX(i, 0)
      alphas.setX(i, 0)
    }
    positions.needsUpdate = true
    colors.needsUpdate = true
    sizes.needsUpdate = true
    alphas.needsUpdate = true

    for (const state of burst.flameSprites) {
      state.sprite.visible = false
      state.sprite.material.opacity = 0
      state.sprite.scale.setScalar(1)
      state.age = 1
      state.life = 1
      state.velocity.set(0, 0, 0)
      state.startScale = 1
      state.spin = 0
    }
    for (const state of burst.smokeSprites) {
      state.sprite.visible = false
      state.sprite.material.opacity = 0
      state.sprite.scale.setScalar(1)
      state.age = 1
      state.life = 1
      state.delay = 0
      state.velocity.set(0, 0, 0)
      state.startScale = 1
      state.spin = 0
    }
  }

  _activateBurst(burst, position) {
    const cfg = SPELLS.fireball.config
    this._resetBurst(burst)
    burst.points.position.copy(position)
    burst.points.visible = true
    burst.shockwave.position.copy(position)
    burst.shockwave.visible = true
    burst.light.position.copy(position)
    burst.light.intensity = 10.5
    burst.light.visible = true

    const positions = burst.geometry.getAttribute('position')
    const colors = burst.geometry.getAttribute('color')
    const sizes = burst.geometry.getAttribute('size')
    const alphas = burst.geometry.getAttribute('alpha')
    for (let i = 0; i < cfg.burstParticles; i++) {
      const state = burst.sparkState[i]
      randomUnitVector(state.velocity).multiplyScalar(2.4 + Math.random() * 7.2)
      state.velocity.y += 0.7 + Math.random() * 1.8
      state.age = 0
      state.life = 0.32 + Math.random() * 0.42
      state.size = 0.18 + Math.random() * 0.26
      positions.setXYZ(i, 0, 0, 0)
      if (i % 7 === 0) colors.setXYZ(i, 1.0, 0.92, 0.48)
      else colors.setXYZ(i, 1, 0.26 + Math.random() * 0.44, 0.02)
      sizes.setX(i, state.size)
      alphas.setX(i, 1)
    }
    positions.needsUpdate = true
    colors.needsUpdate = true
    sizes.needsUpdate = true
    alphas.needsUpdate = true

    burst.flameSprites.forEach((state, i) => {
      const dir = randomUnitVector(state.velocity)
      dir.y *= 0.45
      state.sprite.position.copy(position).addScaledVector(dir, 0.18 + Math.random() * 0.22)
      state.sprite.scale.setScalar(0.9 + Math.random() * 0.85)
      state.sprite.material.rotation = Math.random() * Math.PI * 2
      state.sprite.material.opacity = 0.96
      state.sprite.visible = true
      state.age = 0
      state.life = 0.22 + Math.random() * 0.24
      state.velocity.copy(dir).multiplyScalar(1.3 + Math.random() * 2.8)
      state.startScale = state.sprite.scale.x
      state.spin = (Math.random() - 0.5) * 8
      state.sprite.material.color.set(i % 4 === 0 ? 0xfff0a6 : 0xff6a1a)
    })

    burst.smokeSprites.forEach((state, i) => {
      const dir = randomUnitVector(state.velocity)
      dir.y = Math.abs(dir.y) * 0.75 + 0.25
      state.sprite.position.copy(position).addScaledVector(dir, Math.random() * 0.38)
      state.sprite.scale.setScalar(0.8 + Math.random() * 0.9)
      state.sprite.material.rotation = Math.random() * Math.PI * 2
      state.sprite.material.opacity = 0
      state.sprite.visible = true
      state.age = 0
      state.life = 0.78 + Math.random() * 0.48
      state.delay = Math.random() * 0.14
      state.velocity.copy(dir).multiplyScalar(0.45 + Math.random() * 1.0)
      state.startScale = state.sprite.scale.x
      state.spin = (Math.random() - 0.5) * 1.8
      state.sprite.material.color.set(i % 4 === 0 ? 0xff9a42 : 0x5f5045)
    })
  }

  _acquireBurst() {
    return this._burstPool.pop() ?? this._createBurst()
  }

  _releaseBurst(burst) {
    this._resetBurst(burst)
    this._burstPool.push(burst)
  }

  _spawnBurst(position) {
    const burst = this._acquireBurst()
    this._activateBurst(burst, position)
    this.bursts.push(burst)
  }

  tryCast(spellId, input, origin, direction, playerAtk = BALANCE.player.atk) {
    const spell = SPELLS[spellId]
    if (!spell) return false
    if (!this.consumeCastRequest(spellId, input)) return false
    const cfg = spell.config
    _tmpForward.copy(direction).setY(0)
    if (_tmpForward.lengthSq() < 0.0001) return false
    _tmpForward.normalize()
    const castOrigin = new THREE.Vector3(
      origin.x + _tmpForward.x * cfg.spawnForward,
      origin.y + cfg.spawnHeight,
      origin.z + _tmpForward.z * cfg.spawnForward,
    )
    if (!this.beginCast(spellId)) return false
    return this.release(spellId, castOrigin, _tmpForward, playerAtk)
  }

  update(dt, npcs, getTerrainHeight, onNpcDie, onNpcHit) {
    for (const [spellId, value] of this.cooldowns.entries()) {
      this.cooldowns.set(spellId, Math.max(0, value - dt))
    }

    this._updateProjectiles(dt, npcs, getTerrainHeight, onNpcDie, onNpcHit)
    this._updateBursts(dt)
  }

  _updateProjectiles(dt, npcs, getTerrainHeight, onNpcDie, onNpcHit) {
    const cfg = SPELLS.fireball.config
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]
      p.ttl -= dt
      p.age += dt
      p.previousPosition.copy(p.group.position)
      p.velocity.y -= cfg.gravity * dt
      p.group.position.addScaledVector(p.velocity, dt)
      const pulse = 0.5 + 0.5 * Math.sin(p.age * 18)
      p.fireballLayers.forEach((layer, layerIndex) => {
        const layerPulse = 0.9 + pulse * (layerIndex === 0 ? 0.18 : 0.12)
        layer.sprite.material.rotation += layer.spin * dt
        layer.sprite.material.opacity = layer.baseOpacity * (0.82 + pulse * 0.22)
        layer.sprite.scale.set(layer.baseWidth * layerPulse, layer.baseHeight * layerPulse, 1)
      })
      p.ringA.rotation.z += dt * 7.5
      p.ringB.rotation.x += dt * 5.8
      p.ringB.rotation.z -= dt * 4.2
      p.ringA.material.opacity = 0.34 + pulse * 0.28
      p.ringB.material.opacity = 0.24 + (1 - pulse) * 0.22
      p.light.intensity = 5.0 + pulse * 2.8

      this._emitTrail(p, Math.max(4, Math.ceil(dt * 250)))
      this._updateTrailParticles(p, dt)
      this._updateFlameSprites(p, dt)

      let hitNpc = null
      for (const npc of npcs) {
        if (!npc?.isHostile) continue
        if (!npc.isAlive?.()) continue
        const np = npc.getPosition()
        const head = npc.getHeadWorldPos?.()
        const topY = Number.isFinite(head?.y) ? Math.max(np.y + 0.65, head.y - 0.15) : np.y + 1.55
        _tmpCapsuleStart.set(np.x, Math.min(np.y + 0.25, topY - 0.35), np.z)
        _tmpCapsuleEnd.set(np.x, topY, np.z)
        const hitRadius = p.radius + cfg.hitRadiusBonus + (npc.getHitRadius ? npc.getHitRadius() : BALANCE.npc.normal.hitRadius)
        if (distanceSqSegmentToSegment(p.previousPosition, p.group.position, _tmpCapsuleStart, _tmpCapsuleEnd) <= hitRadius * hitRadius) {
          hitNpc = npc
          break
        }
      }

      const groundY = getTerrainHeight ? getTerrainHeight(p.group.position.x, p.group.position.z) : 0
      const hitGround = p.group.position.y <= groundY + p.radius * 0.4
      if (hitNpc) {
        const hp = hitNpc.onHit ? hitNpc.onHit(p.damage) : hitNpc.takeDamage(p.damage)
        if (hp > 0) hitNpc.aggroFromHit?.()
        onNpcHit?.(hitNpc, p.damage, hp)
        if (hp <= 0) onNpcDie?.(hitNpc)
      }

      if (p.ttl <= 0 || hitNpc || hitGround) {
        this._spawnBurst(p.group.position)
        this._disposeProjectile(p)
        this.projectiles.splice(i, 1)
      }
    }
  }

  _updateTrailParticles(p, dt) {
    const positions = p.trailGeometry.getAttribute('position')
    const colors = p.trailGeometry.getAttribute('color')
    const sizes = p.trailGeometry.getAttribute('size')
    const alphas = p.trailGeometry.getAttribute('alpha')
    for (let i = 0; i < p.particleState.length; i++) {
      const state = p.particleState[i]
      if (state.age >= state.life) {
        alphas.setX(i, 0)
        sizes.setX(i, 0)
        continue
      }
      state.age += dt
      const lifeT = state.age / state.life
      const fade = Math.max(0, 1 - lifeT)
      positions.setXYZ(
        i,
        positions.getX(i) + state.velocity.x * dt,
        positions.getY(i) + state.velocity.y * dt,
        positions.getZ(i) + state.velocity.z * dt,
      )
      state.velocity.multiplyScalar(1 - dt * 0.85)
      state.velocity.y += dt * 0.18
      _tmpColor.setRGB(1, 0.16 + fade * 0.66, 0.02).multiplyScalar(0.45 + fade * 0.9)
      colors.setXYZ(i, _tmpColor.r, _tmpColor.g, _tmpColor.b)
      sizes.setX(i, state.size * (0.72 + lifeT * 0.9))
      alphas.setX(i, fade * fade)
    }
    positions.needsUpdate = true
    colors.needsUpdate = true
    sizes.needsUpdate = true
    alphas.needsUpdate = true
  }

  _updateFlameSprites(p, dt) {
    for (const state of p.flameState) {
      if (!state.sprite.visible) continue
      state.age += dt
      if (state.age >= state.life) {
        state.sprite.visible = false
        state.sprite.material.opacity = 0
        continue
      }
      const t = state.age / state.life
      const fade = Math.max(0, 1 - t)
      state.sprite.position.addScaledVector(state.velocity, dt)
      state.velocity.multiplyScalar(1 - dt * 1.4)
      state.velocity.y += dt * 0.25
      state.sprite.material.rotation += state.spin * dt
      state.sprite.material.opacity = fade * (0.42 + smooth01(1 - t) * 0.42)
      state.sprite.scale.setScalar(state.startScale * (0.58 + t * 1.45))
      state.sprite.material.color.setRGB(1, 0.28 + fade * 0.54, 0.06)
    }
  }

  _updateBursts(dt) {
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const burst = this.bursts[i]
      burst.age += dt
      const fade = Math.max(0, 1 - burst.age / burst.life)
      const grow = burst.age / burst.life
      const positions = burst.geometry.getAttribute('position')
      const colors = burst.geometry.getAttribute('color')
      const sizes = burst.geometry.getAttribute('size')
      const alphas = burst.geometry.getAttribute('alpha')
      for (let j = 0; j < burst.sparkState.length; j++) {
        const state = burst.sparkState[j]
        state.age += dt
        const sparkFade = Math.max(0, 1 - state.age / state.life)
        state.velocity.y -= dt * 4.2
        positions.setXYZ(
          j,
          positions.getX(j) + state.velocity.x * dt,
          positions.getY(j) + state.velocity.y * dt,
          positions.getZ(j) + state.velocity.z * dt,
        )
        if (j % 7 === 0) _tmpColor.setRGB(1, 0.92, 0.42).multiplyScalar(sparkFade)
        else _tmpColor.setRGB(1, 0.22 + sparkFade * 0.6, 0.02).multiplyScalar(sparkFade)
        colors.setXYZ(j, _tmpColor.r, _tmpColor.g, _tmpColor.b)
        sizes.setX(j, state.size * (0.6 + (1 - sparkFade) * 1.25))
        alphas.setX(j, sparkFade * sparkFade)
      }
      positions.needsUpdate = true
      colors.needsUpdate = true
      sizes.needsUpdate = true
      alphas.needsUpdate = true

      this._updateBurstSprites(burst.flameSprites, dt, false)
      this._updateBurstSprites(burst.smokeSprites, dt, true)

      burst.light.intensity = 10.5 * Math.max(0, 1 - grow) + Math.sin(burst.age * 44) * 0.7 * fade
      burst.shockwave.scale.setScalar(0.35 + smooth01(grow) * 6.0)
      if (burst.shockwave.material.uniforms) {
        burst.shockwave.material.uniforms.uAge.value = burst.age
        burst.shockwave.material.uniforms.uLife.value = 0.62
      }
      if (burst.age >= burst.life) {
        this._releaseBurst(burst)
        this.bursts.splice(i, 1)
      }
    }
  }

  _updateBurstSprites(states, dt, smoky) {
    for (const state of states) {
      state.age += dt
      const effectiveAge = Math.max(0, state.age - (state.delay ?? 0))
      if (effectiveAge >= state.life) {
        state.sprite.visible = false
        state.sprite.material.opacity = 0
        continue
      }
      const t = effectiveAge / state.life
      const fadeIn = smoky ? smooth01(t / 0.22) : 1
      const fadeOut = Math.max(0, 1 - t)
      const alpha = smoky ? fadeIn * fadeOut * 0.42 : fadeOut * 0.96
      state.sprite.position.addScaledVector(state.velocity, dt)
      state.velocity.multiplyScalar(1 - dt * (smoky ? 0.38 : 1.1))
      state.velocity.y += dt * (smoky ? 0.22 : 0.08)
      state.sprite.material.rotation += state.spin * dt
      state.sprite.material.opacity = alpha
      state.sprite.scale.setScalar(state.startScale * (smoky ? 0.9 + t * 2.2 : 0.72 + t * 1.65))
      if (!smoky) state.sprite.material.color.setRGB(1, 0.24 + fadeOut * 0.58, 0.04)
    }
  }

  _disposeProjectile(p) {
    this._resetFireballProjectile(p)
    this._fireballPool.push(p)
  }

  async warmup(renderer, camera) {
    if (!renderer || !camera) return false
    await this._textureReadyPromise
    const projectile = this._acquireFireballProjectile()
    const burst = this._acquireBurst()
    this._resetFireballProjectile(projectile)
    try {
      renderer.initTexture?.(this._fireballTexture)
      Object.values(this._textures).forEach((textures) => {
        textures.forEach((texture) => renderer.initTexture?.(texture))
      })
      projectile.group.position.set(0, -10000, 0)
      projectile.group.visible = true
      projectile.trail.visible = true
      projectile.fireballLayers.forEach((layer) => {
        layer.sprite.visible = true
        layer.sprite.material.opacity = 0.001
      })
      for (const state of projectile.flameState) {
        state.sprite.position.copy(projectile.group.position)
        state.sprite.visible = true
        state.sprite.material.opacity = 0.001
      }
      this._activateBurst(burst, new THREE.Vector3(0, -10000, 0))
      renderer.compile(this.scene, camera)
      return true
    } finally {
      this._resetFireballProjectile(projectile)
      this._fireballPool.push(projectile)
      this._releaseBurst(burst)
    }
  }

  clear() {
    for (const p of this.projectiles) this._disposeProjectile(p)
    this.projectiles.length = 0

    for (const burst of this.bursts) this._releaseBurst(burst)
    this.bursts.length = 0
    this.cooldowns.clear()
    this._pressed.clear()
  }
}
