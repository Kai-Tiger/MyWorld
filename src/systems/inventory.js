export class InventorySystem {
  constructor() {
    this.items = {}
  }

  add(itemId, count = 1) {
    const amount = Math.max(0, count)
    if (amount <= 0) return
    this.items[itemId] = (this.items[itemId] ?? 0) + amount
  }

  set(itemId, count = 0) {
    this.items[itemId] = Math.max(0, count)
  }

  consume(itemId, count = 1) {
    const amount = Math.max(0, count)
    const current = this.items[itemId] ?? 0
    if (current < amount) return false
    this.items[itemId] = current - amount
    return true
  }

  getCount(itemId) {
    return this.items[itemId] ?? 0
  }

  getAll(itemDefs = {}) {
    return Object.entries(this.items)
      .filter(([, count]) => count > 0)
      .map(([id, count]) => ({
        id,
        name: itemDefs[id]?.name ?? id,
        category: itemDefs[id]?.category ?? 'item',
        icon: itemDefs[id]?.icon ?? null,
        count,
      }))
  }

  getByCategory(category, itemDefs = {}) {
    return this.getAll(itemDefs).filter(item => item.category === category)
  }
}
