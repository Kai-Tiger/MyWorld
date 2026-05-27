export class InventorySystem {
  constructor() {
    this.items = {}
  }

  add(name, count = 1) {
    this.items[name] = (this.items[name] ?? 0) + count
  }

  getAll() {
    return Object.entries(this.items).map(([name, count]) => ({ name, count }))
  }
}
