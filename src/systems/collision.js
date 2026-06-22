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

  _heightApplies(o, playerY) {
    const minY = o.minY ?? -Infinity
    const maxY = o.maxY ?? Infinity
    return playerY >= minY - 0.2 && playerY <= maxY + 0.2
  }

  _surfaceHeightAt(o, x, z) {
    if (o.type === 'ramp') {
      if (Math.abs(x - o.x) > o.hx || Math.abs(z - o.z) > o.hz) return null
      const axisValue = o.axis === 'x' ? x : z
      const center = o.axis === 'x' ? o.x : o.z
      const half = o.axis === 'x' ? o.hx : o.hz
      let t = (axisValue - (center - half)) / (half * 2)
      if (o.reverse) t = 1 - t
      return o.h0 + Math.min(1, Math.max(0, t)) * (o.h1 - o.h0)
    }
    if (o.h === undefined) return null
    if (o.hx !== undefined && o.hz !== undefined) {
      if (o.ux !== undefined && o.uz !== undefined && o.vx !== undefined && o.vz !== undefined) {
        return this._orientedBoxContains(o, x, z) ? o.h : null
      }
      return Math.abs(x - o.x) < o.hx && Math.abs(z - o.z) < o.hz ? o.h : null
    }
    const dx = x - o.x
    const dz = z - o.z
    return dx * dx + dz * dz < (o.r * 0.75) ** 2 ? o.h : null
  }

  _orientedBoxContains(o, x, z) {
    const dx = x - o.x
    const dz = z - o.z
    const lx = dx * o.ux + dz * o.uz
    const lz = dx * o.vx + dz * o.vz
    return Math.abs(lx) < o.hx && Math.abs(lz) < o.hz
  }

  _orientedBoxHit(o, nx, nz, radius) {
    const dx = nx - o.x
    const dz = nz - o.z
    const lx = dx * o.ux + dz * o.uz
    const lz = dx * o.vx + dz * o.vz
    const closestX = Math.max(-o.hx, Math.min(lx, o.hx))
    const closestZ = Math.max(-o.hz, Math.min(lz, o.hz))
    const ddx = lx - closestX
    const ddz = lz - closestZ
    return ddx * ddx + ddz * ddz < radius * radius
  }

  _distanceSqToSegment(x, z, ax, az, bx, bz) {
    const dx = bx - ax
    const dz = bz - az
    const lenSq = dx * dx + dz * dz
    if (lenSq <= 0.000001) {
      const px = x - ax
      const pz = z - az
      return px * px + pz * pz
    }
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lenSq))
    const cx = ax + dx * t
    const cz = az + dz * t
    const px = x - cx
    const pz = z - cz
    return px * px + pz * pz
  }

  _isInsideClearancePath(path, x, z) {
    if (!Array.isArray(path.points) || path.points.length < 2) return false
    const halfWidth = path.halfWidth ?? 0
    if (halfWidth <= 0) return false
    const maxDistanceSq = halfWidth * halfWidth
    for (let i = 0; i < path.points.length - 1; i++) {
      const a = path.points[i]
      const b = path.points[i + 1]
      if (this._distanceSqToSegment(x, z, a.x, a.z, b.x, b.z) <= maxDistanceSq) return true
    }
    return false
  }

  _isClearedByPath(o, nx, nz, playerY) {
    if (!o.clearancePathId) return false
    for (const path of this.collidables) {
      if (path.type !== 'clearancePath' || path.id !== o.clearancePathId) continue
      if (!this._heightApplies(path, playerY)) continue
      if (this._isInsideClearancePath(path, nx, nz)) return true
    }
    return false
  }

  /**
   * 返回 (nx, nz) 位置的阻挡碰撞体，无则返回 null
   */
  getBlockingCollidable(nx, nz, radius = 0.4, playerY = 0, self = null) {
    if (Math.abs(nx) > this.xBound || Math.abs(nz) > this.zBound) return { x: 0, z: 0, r: 0 }
    for (const o of this.collidables) {
      if (o === self) continue
      if (!this._heightApplies(o, playerY)) continue
      if (o.type === 'clearancePath') continue
      if (o.surface || o.type === 'ramp') continue
      if (o.h !== undefined && playerY >= o.h - 0.2) continue
      if (this._isClearedByPath(o, nx, nz, playerY)) continue
      if (o.hx !== undefined && o.hz !== undefined) {
        if (o.ux !== undefined && o.uz !== undefined && o.vx !== undefined && o.vz !== undefined) {
          if (this._orientedBoxHit(o, nx, nz, radius)) return o
          continue
        }
        const closestX = Math.max(o.x - o.hx, Math.min(nx, o.x + o.hx))
        const closestZ = Math.max(o.z - o.hz, Math.min(nz, o.z + o.hz))
        const dx = nx - closestX
        const dz = nz - closestZ
        if (dx * dx + dz * dz < radius * radius) return o
        continue
      }
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
      if (!this._heightApplies(o, playerY)) continue
      if (o.type === 'clearancePath') continue
      if (o.surface || o.type === 'ramp') continue
      // 有顶面且玩家在顶面附近，不再水平拦截（留 0.2 缓冲防止刚落边缘时被卡住）
      if (o.h !== undefined && playerY >= o.h - 0.2) continue
      if (this._isClearedByPath(o, nx, nz, playerY)) continue
      if (o.hx !== undefined && o.hz !== undefined) {
        if (o.ux !== undefined && o.uz !== undefined && o.vx !== undefined && o.vz !== undefined) {
          if (this._orientedBoxHit(o, nx, nz, radius)) return true
          continue
        }
        const closestX = Math.max(o.x - o.hx, Math.min(nx, o.x + o.hx))
        const closestZ = Math.max(o.z - o.hz, Math.min(nz, o.z + o.hz))
        const dx = nx - closestX
        const dz = nz - closestZ
        if (dx * dx + dz * dz < radius * radius) return true
        continue
      }
      const dx = nx - o.x
      const dz = nz - o.z
      const minDist = radius + o.r
      if (dx * dx + dz * dz < minDist * minDist) return true
    }
    return false
  }

  // 返回玩家脚下最高的可登陆表面高度，无则 0
  getSurfaceHeight(nx, nz, playerY = 0, maxStep = 0.55) {
    let bestBelow = 0
    let bestReachable = -Infinity
    for (const o of this.collidables) {
      const h = this._surfaceHeightAt(o, nx, nz)
      if (h === null) continue
      if (h <= playerY + maxStep) bestReachable = Math.max(bestReachable, h)
      if (h <= playerY + 0.05) bestBelow = Math.max(bestBelow, h)
    }
    return bestReachable > -Infinity ? bestReachable : bestBelow
  }
}
