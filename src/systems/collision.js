/**
 * CollisionSystem
 * 简单圆形碰撞检测。
 * 每个碰撞体为 { x, z, r }，检测玩家新位置是否与任意碰撞体重叠。
 */
export class CollisionSystem {
  constructor(collidables = [], xBound = 44, zBound = 44) {
    this.collidables = collidables
    this.xBound = xBound
    this.zBound = zBound
  }

  /** 添加动态碰撞体（如 NPC） */
  add(obj) {
    this.collidables.push(obj)
  }

  /**
   * 返回 (nx, nz) 位置的阻挡碰撞体，无则返回 null
   */
  getBlockingCollidable(nx, nz, radius = 0.4, playerY = 0, self = null) {
    if (Math.abs(nx) > this.xBound || Math.abs(nz) > this.zBound) return { x: 0, z: 0, r: 0 }
    for (const o of this.collidables) {
      if (o === self) continue
      if (o.h !== undefined && playerY >= o.h - 0.2) continue
      const dx = nx - o.x
      const dz = nz - o.z
      const minDist = radius + o.r
      if (dx * dx + dz * dz < minDist * minDist) return o
    }
    return null
  }

  /**
   * 检查 (nx, nz) 是否可以移动到
   * @param {number} nx  目标 x
   * @param {number} nz  目标 z
   * @param {number} radius  自身碰撞半径，默认 0.4
   * @returns {boolean} true = 发生碰撞，不可移动
   */
  check(nx, nz, radius = 0.4, playerY = 0, self = null) {
    // 地图/房间边界
    if (Math.abs(nx) > this.xBound || Math.abs(nz) > this.zBound) return true

    for (const o of this.collidables) {
      if (o === self) continue  // 跳过自身，防止 NPC 自碰
      // 有顶面且玩家在顶面附近，不再水平拦截（留 0.2 缓冲防止刚落边缘时被卡住）
      if (o.h !== undefined && playerY >= o.h - 0.2) continue
      const dx = nx - o.x
      const dz = nz - o.z
      const minDist = radius + o.r
      if (dx * dx + dz * dz < minDist * minDist) return true
    }
    return false
  }

  // 返回玩家脚下最高的可登陆表面高度，无则 0
  getSurfaceHeight(nx, nz) {
    let maxH = 0
    for (const o of this.collidables) {
      if (o.h === undefined) continue
      const dx = nx - o.x
      const dz = nz - o.z
      if (dx * dx + dz * dz < (o.r * 0.75) ** 2) {
        maxH = Math.max(maxH, o.h)
      }
    }
    return maxH
  }
}
