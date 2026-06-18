export class InventorySystem {
  constructor() {
    this.items = {}
  }

  add(name, count = 1) {
    this.items[name] = (this.items[name] ?? 0) + count
  }

  set(name, count = 0) {
    this.items[name] = Math.max(0, count)
  }

  consume(name, count = 1) {
    const amount = Math.max(0, count)
    const current = this.items[name] ?? 0
    if (current < amount) return false
    this.items[name] = current - amount
    return true
  }

  getAll() {
    return Object.entries(this.items).map(([name, count]) => ({ name, count }))
  }
}
