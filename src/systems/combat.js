import * as THREE from 'three'
import { BALANCE } from '../config/balance.js'

const _tmpNpcPos = new THREE.Vector3()
const _tmpDist = new THREE.Vector3()

export class CombatSystem {
  constructor(scene) {
    this.scene = scene
    this.projectiles = []
    this._throwPressed = false
    this._throwCd = 0
    this._isWinding = false
    this._windupTimer = 0
    this._pendingOrigin = new THREE.Vector3()
    this._pendingDir = new THREE.Vector3(0, 0, 1)
    this._pendingDamage = 0

    this._stoneGeo = new THREE.IcosahedronGeometry(BALANCE.projectile.stone.radius, 0)
    this._stoneMat = new THREE.MeshLambertMaterial({ color: 0x8f8575 })
  }

  _spawnStone(origin, forward, damage) {
    const cfg = BALANCE.projectile.stone
    const mesh = new THREE.Mesh(this._stoneGeo, this._stoneMat)
    mesh.castShadow = true
    mesh.receiveShadow = true

    mesh.position.copy(origin)
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
    this.scene.add(mesh)

    const velocity = new THREE.Vector3(
      forward.x * cfg.speed,
      cfg.arcY,
      forward.z * cfg.speed,
    )

    this.projectiles.push({
      mesh,
      velocity,
      ttl: cfg.lifeTime,
      damage,
      radius: cfg.radius,
    })
  }

  tryThrow(dt, input, playerPos, throwForward, playerAtk) {
    this._throwCd = Math.max(0, this._throwCd - dt)

    if (this._isWinding) {
      this._pendingOrigin.copy(playerPos)
      this._pendingDir.set(throwForward.x, 0, throwForward.z).normalize()
      this._pendingDamage = playerAtk
      this._windupTimer -= dt
      if (this._windupTimer <= 0) {
        const cfg = BALANCE.projectile.stone
        const origin = new THREE.Vector3(
          this._pendingOrigin.x + this._pendingDir.x * cfg.spawnForward,
          this._pendingOrigin.y + cfg.spawnHeight,
          this._pendingOrigin.z + this._pendingDir.z * cfg.spawnForward,
        )
        this._spawnStone(origin, this._pendingDir, this._pendingDamage)
        this._throwCd = BALANCE.player.throwCooldown
        this._isWinding = false
      }
    }

    const throwNow = input.isPressed('KeyF')
    if (throwNow && !this._throwPressed && this._throwCd <= 0 && !this._isWinding) {
      this._isWinding = true
      this._windupTimer = BALANCE.combat.throw.windup
      this._pendingOrigin.copy(playerPos)
      this._pendingDir.set(throwForward.x, 0, throwForward.z).normalize()
      this._pendingDamage = playerAtk
    }
    this._throwPressed = throwNow
  }

  isWindingUp() {
    return this._isWinding
  }

  update(dt, npcs, getTerrainHeight, onNpcDie, onNpcHit) {
    const cfg = BALANCE.projectile.stone
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]
      p.ttl -= dt
      p.velocity.y -= cfg.gravity * dt

      p.mesh.position.x += p.velocity.x * dt
      p.mesh.position.y += p.velocity.y * dt
      p.mesh.position.z += p.velocity.z * dt
      p.mesh.rotation.x += dt * 10
      p.mesh.rotation.z += dt * 8

      let hit = false
      for (const npc of npcs) {
        if (!npc?.isAlive || !npc.isAlive()) continue
        const np = npc.getPosition()
        _tmpNpcPos.set(np.x, np.y + 0.9, np.z)
        _tmpDist.subVectors(p.mesh.position, _tmpNpcPos)
        const r = p.radius + (npc.getHitRadius ? npc.getHitRadius() : BALANCE.npc.normal.hitRadius)
        if (_tmpDist.lengthSq() <= r * r) {
          const hp = npc.onHit ? npc.onHit(p.damage) : npc.takeDamage(p.damage)
          if (onNpcHit) onNpcHit(npc, p.damage, hp)
          if (hp <= 0 && onNpcDie) onNpcDie(npc)
          hit = true
          break
        }
      }

      const groundY = getTerrainHeight ? getTerrainHeight(p.mesh.position.x, p.mesh.position.z) : 0
      if (p.ttl <= 0 || hit || p.mesh.position.y <= groundY + p.radius * 0.35) {
        this.scene.remove(p.mesh)
        this.projectiles.splice(i, 1)
      }
    }
  }
}
