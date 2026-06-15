/**
 * InputSystem
 * 统一管理键盘 + 触屏虚拟按钮输入。
 * 外部通过 input.isPressed(action) 查询当前帧某个动作是否激活。
 */
export class InputSystem {
  constructor() {
    this._keys = new Set()
    this._virtual = { up: false, down: false, left: false, right: false }
    this._blockedCodes = new Set([
      'KeyW', 'KeyA', 'KeyS', 'KeyD',
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'Space', 'KeyQ', 'KeyJ', 'KeyK',
    ])

    const shouldIgnoreKeyCapture = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return true
      const el = e.target
      if (!el) return false
      const tag = el.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
      if (el.isContentEditable) return true
      return false
    }

    // 键盘
    window.addEventListener('keydown', e => {
      if (shouldIgnoreKeyCapture(e)) return
      this._keys.add(e.code)
      if (this._blockedCodes.has(e.code)) {
        e.preventDefault()
        e.stopPropagation()
      }
    }, { capture: true })
    window.addEventListener('keyup', e => {
      if (shouldIgnoreKeyCapture(e)) return
      this._keys.delete(e.code)
      if (this._blockedCodes.has(e.code)) {
        e.preventDefault()
        e.stopPropagation()
      }
    }, { capture: true })

    // 自动绑定页面里带 data-action 属性的虚拟按钮
    this._bindVirtualButtons()
  }

  _bindVirtualButtons() {
    // 延迟绑定，等 DOM 渲染完毕
    const bind = () => {
      document.querySelectorAll('[data-action]').forEach(btn => {
        const action = btn.dataset.action
        btn.addEventListener('pointerdown', e => {
          this._virtual[action] = true
          btn.classList.add('active')
          e.preventDefault()
        }, { passive: false })
        btn.addEventListener('pointerup',    () => { this._virtual[action] = false; btn.classList.remove('active') })
        btn.addEventListener('pointerleave', () => { this._virtual[action] = false; btn.classList.remove('active') })
      })
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bind)
    } else {
      bind()
    }
  }

  /** 查询某个动作是否当前激活 */
  isPressed(action) {
    switch (action) {
      case 'up':    return this._keys.has('KeyW') || this._keys.has('ArrowUp')    || this._virtual.up
      case 'down':  return this._keys.has('KeyS') || this._keys.has('ArrowDown')  || this._virtual.down
      case 'left':  return this._keys.has('KeyA') || this._keys.has('ArrowLeft')  || this._virtual.left
      case 'right': return this._keys.has('KeyD') || this._keys.has('ArrowRight') || this._virtual.right
      default:      return this._keys.has(action)
    }
  }

  /** 是否有任意移动键按下 */
  isMoving() {
    return this.isPressed('up') || this.isPressed('down') ||
           this.isPressed('left') || this.isPressed('right')
  }
}
