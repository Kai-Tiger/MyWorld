export class EstusFlaskSystem {
  constructor(config = {}) {
    this.itemName = config.itemName ?? '元素瓶'
    this.maxCharges = Math.max(0, Math.floor(config.maxCharges ?? 3))
    this.charges = this.maxCharges
    this.hpRestoreRatio = Math.max(0, config.hpRestoreRatio ?? 0.30)
    this.mpRestoreRatio = Math.max(0, config.mpRestoreRatio ?? 0.20)
    this.recoverDuration = Math.max(0.01, config.recoverDuration ?? 1.2)
    this._active = null
  }

  setMaxCharges(nextMax, { refill = false } = {}) {
    this.maxCharges = Math.max(0, Math.floor(nextMax ?? 0))
    this.charges = refill ? this.maxCharges : Math.min(this.charges, this.maxCharges)
    return this.charges
  }

  setRestoreRatios({ hp, mp } = {}) {
    if (hp !== undefined) this.hpRestoreRatio = Math.max(0, hp)
    if (mp !== undefined) this.mpRestoreRatio = Math.max(0, mp)
  }

  refill() {
    this.charges = this.maxCharges
    return this.charges
  }

  canUse(player) {
    return this.charges > 0 && Boolean(player) && !this._active && !player.isDead?.()
  }

  tryUse(player) {
    if (!this.canUse(player)) return false
    const maxHp = player.getMaxHp?.() ?? 0
    const maxMp = player.getMaxMp?.() ?? 0
    const hpMissing = maxHp - (player.getHp?.() ?? maxHp)
    const mpMissing = maxMp - (player.getMp?.() ?? maxMp)

    this.charges -= 1
    const hpAmount = Math.min(hpMissing, maxHp * this.hpRestoreRatio)
    const mpAmount = Math.min(mpMissing, maxMp * this.mpRestoreRatio)
    this._active = {
      hpRemaining: hpAmount,
      mpRemaining: mpAmount,
      hpPerSecond: hpAmount / this.recoverDuration,
      mpPerSecond: mpAmount / this.recoverDuration,
      duration: this.recoverDuration,
    }
    return true
  }

  update(dt, player) {
    const active = this._active
    if (!active || !player) return false

    const safeDt = Math.max(0, dt)
    const hpStep = Math.min(active.hpRemaining, active.hpPerSecond * safeDt)
    const mpStep = Math.min(active.mpRemaining, active.mpPerSecond * safeDt)
    if (hpStep > 0) {
      player.heal?.(hpStep)
      active.hpRemaining = Math.max(0, active.hpRemaining - hpStep)
    }
    if (mpStep > 0) {
      player.recoverMp?.(mpStep)
      active.mpRemaining = Math.max(0, active.mpRemaining - mpStep)
    }

    const done = active.hpRemaining <= 0.001 && active.mpRemaining <= 0.001
    if (done) this._active = null
    return !done
  }
}
