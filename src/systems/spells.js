import * as THREE from 'three'
import { BALANCE } from '../config/balance.js'

const _tmpNpcPos = new THREE.Vector3()
const _tmpDist = new THREE.Vector3()
const _tmpForward = new THREE.Vector3()
const _tmpColor = new THREE.Color()

function makeParticleGeometry(count) {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(count * 3, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(count * 3, 3))
  return geometry
}

function randomUnitVector(out) {
  const y = Math.random() * 2 - 1
  const a = Math.random() * Math.PI * 2
  const r = Math.sqrt(Math.max(0, 1 - y * y))
  out.set(Math.cos(a) * r, y, Math.sin(a) * r)
  return out
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

    this._coreGeo = new THREE.SphereGeometry(SPELLS.fireball.config.radius, 14, 10)
    this._auraGeo = new THREE.SphereGeometry(SPELLS.fireball.config.radius * 1.85, 18, 12)
    this._ringGeo = new THREE.TorusGeometry(SPELLS.fireball.config.radius * 1.22, 0.018, 8, 48)
    this._shockwaveGeo = new THREE.RingGeometry(0.22, 0.32, 64)
    this._coreMat = new THREE.MeshStandardMaterial({
      color: 0xffd36a,
      emissive: 0xff4a00,
      emissiveIntensity: 4.6,
      roughness: 0.28,
      metalness: 0,
    })
    this._auraMat = new THREE.MeshBasicMaterial({
      color: 0xff6a16,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    this._ringMat = new THREE.MeshBasicMaterial({
      color: 0xffd96a,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    this._trailMat = new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    this._burstMat = new THREE.PointsMaterial({
      size: 0.22,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
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

    _tmpForward.copy(direction).setY(0)
    if (_tmpForward.lengthSq() < 0.0001) return false
    _tmpForward.normalize()

    const castOrigin = origin.clone()
    if (spellId === 'fireball') this._spawnFireball(castOrigin, _tmpForward, playerAtk + cfg.damage)
    return true
  }

  _spawnFireball(origin, direction, damage) {
    const cfg = SPELLS.fireball.config
    const group = new THREE.Group()
    group.position.copy(origin)

    const core = new THREE.Mesh(this._coreGeo, this._coreMat)
    core.castShadow = true
    group.add(core)

    const aura = new THREE.Mesh(this._auraGeo, this._auraMat.clone())
    group.add(aura)

    const ringA = new THREE.Mesh(this._ringGeo, this._ringMat.clone())
    ringA.rotation.x = Math.PI / 2
    group.add(ringA)

    const ringB = new THREE.Mesh(this._ringGeo, this._ringMat.clone())
    ringB.rotation.y = Math.PI / 2
    ringB.rotation.z = Math.PI / 5
    group.add(ringB)

    const light = new THREE.PointLight(0xff8a22, 5.4, 10, 2)
    light.position.set(0, 0, 0)
    group.add(light)

    const trailGeometry = makeParticleGeometry(cfg.trailParticles)
    const trail = new THREE.Points(trailGeometry, this._trailMat)
    trail.frustumCulled = false
    this.scene.add(trail)

    this.scene.add(group)

    const particleState = Array.from({ length: cfg.trailParticles }, () => ({
      age: 1,
      life: 1,
      velocity: new THREE.Vector3(),
    }))
    const positions = trailGeometry.getAttribute('position')
    const colors = trailGeometry.getAttribute('color')
    for (let i = 0; i < cfg.trailParticles; i++) {
      positions.setXYZ(i, 0, 0, 0)
      colors.setXYZ(i, 1, 0.35, 0.05)
    }

    this.projectiles.push({
      spellId: 'fireball',
      group,
      core,
      aura,
      ringA,
      ringB,
      light,
      trail,
      trailGeometry,
      particleState,
      particleCursor: 0,
      age: 0,
      velocity: direction.clone().multiplyScalar(cfg.speed),
      ttl: cfg.lifeTime,
      damage,
      radius: cfg.radius,
    })
  }

  _emitTrail(p, count) {
    const positions = p.trailGeometry.getAttribute('position')
    const colors = p.trailGeometry.getAttribute('color')
    const forward = _tmpForward.copy(p.velocity).normalize()
    const localBack = forward.clone().multiplyScalar(-0.35)
    const side = new THREE.Vector3(-forward.z, 0, forward.x)
    if (side.lengthSq() < 0.0001) side.set(1, 0, 0)
    side.normalize()
    const up = new THREE.Vector3(0, 1, 0)

    for (let n = 0; n < count; n++) {
      const i = p.particleCursor
      const state = p.particleState[i]
      state.age = 0
      state.life = 0.38 + Math.random() * 0.32
      randomUnitVector(state.velocity)
      state.velocity.multiplyScalar(0.28 + Math.random() * 0.78).add(localBack)

      const swirl = p.age * 16 + n * 1.35 + Math.random() * 0.9
      const radius = 0.08 + Math.random() * 0.18
      const sx = Math.cos(swirl) * radius
      const sy = Math.sin(swirl) * radius
      const back = 0.05 + Math.random() * 0.42
      const base = p.group.position.clone()
        .addScaledVector(forward, -back)
        .addScaledVector(side, sx)
        .addScaledVector(up, sy)
      const jitter = 0.035 + Math.random() * 0.05
      positions.setXYZ(
        i,
        base.x + (Math.random() - 0.5) * jitter,
        base.y + (Math.random() - 0.5) * jitter,
        base.z + (Math.random() - 0.5) * jitter,
      )
      if (Math.random() < 0.28) colors.setXYZ(i, 0.55, 0.26, 1.0)
      else colors.setXYZ(i, 1, 0.48 + Math.random() * 0.42, 0.04)
      p.particleCursor = (p.particleCursor + 1) % p.particleState.length
    }
  }

  _spawnBurst(position) {
    const cfg = SPELLS.fireball.config
    const geometry = makeParticleGeometry(cfg.burstParticles)
    const points = new THREE.Points(geometry, this._burstMat)
    points.position.copy(position)
    points.frustumCulled = false
    this.scene.add(points)

    const shockwaveMat = new THREE.MeshBasicMaterial({
      color: 0xffb33a,
      transparent: true,
      opacity: 0.86,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    })
    const shockwave = new THREE.Mesh(this._shockwaveGeo, shockwaveMat)
    shockwave.position.copy(position)
    shockwave.rotation.x = -Math.PI / 2
    this.scene.add(shockwave)

    const velocities = []
    const positions = geometry.getAttribute('position')
    const colors = geometry.getAttribute('color')
    for (let i = 0; i < cfg.burstParticles; i++) {
      const v = randomUnitVector(new THREE.Vector3()).multiplyScalar(2.1 + Math.random() * 6.2)
      velocities.push(v)
      positions.setXYZ(i, 0, 0, 0)
      if (Math.random() < 0.22) colors.setXYZ(i, 0.55, 0.24, 1.0)
      else colors.setXYZ(i, 1, 0.38 + Math.random() * 0.42, 0.02)
    }
    geometry.attributes.position.needsUpdate = true
    geometry.attributes.color.needsUpdate = true

    const light = new THREE.PointLight(0xff7a22, 8.4, 12, 2)
    light.position.copy(position)
    this.scene.add(light)
    this.bursts.push({ points, geometry, velocities, light, shockwave, age: 0, life: 0.62 })
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
      p.group.position.addScaledVector(p.velocity, dt)
      p.core.rotation.x += dt * 9
      p.core.rotation.y += dt * 12
      const pulse = 0.5 + 0.5 * Math.sin(p.age * 18)
      p.core.scale.setScalar(0.92 + pulse * 0.16)
      p.aura.scale.setScalar(1.0 + pulse * 0.24)
      p.aura.material.opacity = 0.22 + pulse * 0.18
      p.ringA.rotation.z += dt * 7.5
      p.ringB.rotation.x += dt * 5.8
      p.ringB.rotation.z -= dt * 4.2
      p.ringA.material.opacity = 0.46 + pulse * 0.32
      p.ringB.material.opacity = 0.30 + (1 - pulse) * 0.24
      p.light.intensity = 4.2 + pulse * 2.2

      this._emitTrail(p, Math.max(4, Math.ceil(dt * 260)))
      this._updateTrailParticles(p, dt)

      let hitNpc = null
      for (const npc of npcs) {
        if (!npc?.isHostile) continue
        if (!npc.isAlive?.()) continue
        const np = npc.getPosition()
        _tmpNpcPos.set(np.x, np.y + 0.9, np.z)
        _tmpDist.subVectors(p.group.position, _tmpNpcPos)
        const hitRadius = p.radius + cfg.hitRadiusBonus + (npc.getHitRadius ? npc.getHitRadius() : BALANCE.npc.normal.hitRadius)
        if (_tmpDist.lengthSq() <= hitRadius * hitRadius) {
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
        this.scene.remove(p.group)
        this.scene.remove(p.trail)
        p.trailGeometry.dispose()
        p.aura.material.dispose()
        p.ringA.material.dispose()
        p.ringB.material.dispose()
        this.projectiles.splice(i, 1)
      }
    }
  }

  _updateTrailParticles(p, dt) {
    const positions = p.trailGeometry.getAttribute('position')
    const colors = p.trailGeometry.getAttribute('color')
    for (let i = 0; i < p.particleState.length; i++) {
      const state = p.particleState[i]
      if (state.age >= state.life) {
        colors.setXYZ(i, 0, 0, 0)
        continue
      }
      state.age += dt
      const fade = Math.max(0, 1 - state.age / state.life)
      positions.setXYZ(
        i,
        positions.getX(i) + state.velocity.x * dt,
        positions.getY(i) + state.velocity.y * dt,
        positions.getZ(i) + state.velocity.z * dt,
      )
      _tmpColor.setRGB(1, 0.18 + fade * 0.62, 0.02).multiplyScalar(fade)
      colors.setXYZ(i, _tmpColor.r, _tmpColor.g, _tmpColor.b)
    }
    positions.needsUpdate = true
    colors.needsUpdate = true
  }

  _updateBursts(dt) {
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const burst = this.bursts[i]
      burst.age += dt
      const fade = Math.max(0, 1 - burst.age / burst.life)
      const grow = burst.age / burst.life
      const positions = burst.geometry.getAttribute('position')
      const colors = burst.geometry.getAttribute('color')
      for (let j = 0; j < burst.velocities.length; j++) {
        const v = burst.velocities[j]
        v.y -= dt * 3.8
        positions.setXYZ(
          j,
          positions.getX(j) + v.x * dt,
          positions.getY(j) + v.y * dt,
          positions.getZ(j) + v.z * dt,
        )
        if (j % 5 === 0) _tmpColor.setRGB(0.55, 0.22 + fade * 0.18, 1.0).multiplyScalar(fade)
        else _tmpColor.setRGB(1, 0.24 + fade * 0.56, 0.02).multiplyScalar(fade)
        colors.setXYZ(j, _tmpColor.r, _tmpColor.g, _tmpColor.b)
      }
      positions.needsUpdate = true
      colors.needsUpdate = true
      burst.light.intensity = 8.4 * fade
      burst.shockwave.scale.setScalar(0.4 + grow * 5.2)
      burst.shockwave.material.opacity = 0.86 * fade
      if (burst.age >= burst.life) {
        this.scene.remove(burst.points)
        this.scene.remove(burst.light)
        this.scene.remove(burst.shockwave)
        burst.geometry.dispose()
        burst.shockwave.material.dispose()
        this.bursts.splice(i, 1)
      }
    }
  }

  clear() {
    for (const p of this.projectiles) {
      this.scene.remove(p.group)
      this.scene.remove(p.trail)
      p.trailGeometry?.dispose?.()
      p.aura?.material?.dispose?.()
      p.ringA?.material?.dispose?.()
      p.ringB?.material?.dispose?.()
    }
    this.projectiles.length = 0

    for (const burst of this.bursts) {
      this.scene.remove(burst.points)
      this.scene.remove(burst.light)
      this.scene.remove(burst.shockwave)
      burst.geometry?.dispose?.()
      burst.shockwave?.material?.dispose?.()
    }
    this.bursts.length = 0
    this.cooldowns.clear()
    this._pressed.clear()
  }
}
