export const BALANCE = {
  combat: {
    lock: {
      maxDistance: 24,
      releaseDistance: 27,
      uiRange: 24,
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
      triggerRange: 20,
      attackRange: 2,
      disengageRange: 22,
      leashRadius: 24,
      returnSpeed: 1.6,
      returnArriveDistance: 0.35,
      moveSpeed: 4,
      guardDashTriggerDistance: 3,
      guardDashStopDistance: 1,
      guardDashSpeedMultiplier: 1.8,
      guardDashUseOnHitAggro: true,
      guardDashDustEnabled: true,
      guardDashDustRate: 22,
      guardDashDustPoolSize: 28,
      guardDashDustColor: 0x76664f,
      attackCooldown: 1.0,
      attackDamage: 14,
      attackTimeScale: 1.25,
      //伤害窗口在攻击动画中的归一化时间。0 是动画开始，1 是动画结束
      // range  这一段攻击真正能打到玩家的距离。感觉“隔空打中”主要调这个。
      //
      attackWindows: [
        { start: 0.23, end: 0.28, range: 2, angleDeg: 95, damageMul: 0.8 },
        { start: 0.38, end: 0.45, range: 2.2, angleDeg: 105, damageMul: 1.0 },
        { start: 0.70, end: 0.85, range: 2.4, angleDeg: 115, damageMul: 1.2 },
      ],
      turnSpeed: 10,
      attackTurnScale: 0.1,
      animFade: 0.18,
      alertDuration: 0.45,
      attackEndGrace: 0.06,
    },
    enemyAudio: {
      maxVolume: 0.585,
      fullVolumeDistance: 4,
      fadeOutDistance: 22,
      fadeSeconds: 0.25,
    },
    melee: {
      hitRange: 2.64,
      hitAngleDeg: 90,
    },
    playerAttack: {
      timeScale: 1.8,
      hitWindow: { start: 0.30, end: 0.52 },
      secondHitWindow: { start: 0.28, end: 0.50 },
      comboInputWindow: { start: 0.45, end: 0.78 },
      comboLinkAt: 0.45,
      secondDamageMul: 1.2,
      secondRangeMul: 1.2,
      secondLungeDistance: 0.6,
      secondLungeDuration: 0.18,
    },
    hitstop: {
      attackHit: 0.05,
      blockHit: 0.03,
    },
  },

  player: {
    maxHp: 9999999,
    maxMp: 100,
    atk: 20,
    throwCooldown: 0.45,
    stamina: {
      max: 100,
      regenPerSecond: 22.5,
      attackCost: 25,
      comboAttackCost: 35,
      blockCostDamageMultiplier: 1.5,
      guardBreakDamageMultiplier: 0.5,
      emptyMoveSpeedMultiplier: 0.8,
      runRegenMultiplier: 0.75,
      defenseRegenMultiplier: 0.5,
    },
  },

  estusFlask: {
    itemName: '元素瓶',
    maxCharges: 3,
    hpRestoreRatio: 0.30,
    mpRestoreRatio: 0.20,
    recoverDuration: 1.2,
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

  spells: {
    fireball: {
      key: 'KeyE',
      mpCost: 25,
      cooldown: 0.72,
      damage: 32,
      radius: 0.34,
      speed: 15.65,
      lifeTime: 1.55,
      launchUpVelocity: 4.0,
      gravity: 8.5,
      spawnForward: 0.72,
      spawnHeight: 1.18,
      hitRadiusBonus: 0.18,
      trailParticles: 180,
      burstParticles: 110,
    },
  },
}
