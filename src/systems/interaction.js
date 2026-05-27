/**
 * InteractionSystem
 * 检测玩家是否靠近房屋正门，返回最近的门信息。
 * 门的世界坐标由房屋位置 + rotY 推算：
 *   doorX = houseX + sin(rotY) * 1.55
 *   doorZ = houseZ + cos(rotY) * 1.55
 */
export class InteractionSystem {
  constructor(houses) {
    this.doors = houses.map(({ x, z, rotY }) => ({
      x: x + Math.sin(rotY) * 1.55,
      z: z + Math.cos(rotY) * 1.55,
    }))
  }

  getNearbyDoor(playerPos, range = 2.2) {
    let nearest = null
    let minDist = range
    for (const door of this.doors) {
      const dx = playerPos.x - door.x
      const dz = playerPos.z - door.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      if (dist < minDist) {
        minDist = dist
        nearest = door
      }
    }
    return nearest
  }
}
