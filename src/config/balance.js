export const BALANCE = {
  combat: {
    lock: {
      maxDistance: 16,
      releaseDistance: 18,
      uiRange: 16,
    },
    aimAssist: {
      angleDeg: 18,
      distance: 12,
    },
    throw: {
      windup: 0.10,
      turnSpeed: 12,
    },
    enemy: {
      triggerRange: 12,
      attackRange: 2.2,
      disengageRange: 16,
      moveSpeed: 3.2,
      attackCooldown: 1.0,
      attackDamage: 14,
      attackWindows: [
        { start: 0.13, end: 0.20, range: 2.1, angleDeg: 95, damageMul: 0.8 },
        { start: 0.30, end: 0.40, range: 2.3, angleDeg: 105, damageMul: 1.0 },
        { start: 0.70, end: 0.85, range: 2.5, angleDeg: 115, damageMul: 1.2 },
      ],
      turnSpeed: 10,
      attackTurnScale: 0.1,
      animFade: 0.18,
      alertDuration: 0.45,
      attackEndGrace: 0.06,
    },
    melee: {
      hitRange: 2.64,
      hitAngleDeg: 90,
    },
    playerAttack: {
      hitWindow: { start: 0.30, end: 0.52 },
    },
    hitstop: {
      attackHit: 0.05,
      blockHit: 0.03,
    },
  },

  player: {
    maxHp: 100,
    atk: 20,
    throwCooldown: 0.45,
  },

  npc: {
    normal: {
      maxHp: 60,
      hitRadius: 0.45,
    },
    fbx: {
      maxHp: 90,
      hitRadius: 0.55,
    },
  },

  projectile: {
    stone: {
      radius: 0.18,
      speed: 12,
      arcY: 3.6,
      gravity: 22,
      lifeTime: 2.2,
      spawnForward: 0.35,
      spawnHeight: 1.15,
    },
  },
}
