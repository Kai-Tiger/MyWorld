export function createEditorUI(app, { onSelectType, onExport, onLoad, onExit }) {
  const panel = document.createElement('div')
  panel.style.cssText = `
    position: absolute; left: 0; top: 0; width: 160px; height: 100%;
    background: rgba(20,20,30,0.88); color: #eee;
    display: flex; flex-direction: column; gap: 0;
    font-family: sans-serif; font-size: 13px;
    border-right: 1px solid rgba(255,255,255,0.12);
    user-select: none; z-index: 100; pointer-events: all;
  `

  // 标题
  const title = document.createElement('div')
  title.textContent = '✏️ 地图编辑器'
  title.style.cssText = 'padding:14px 12px 10px; font-size:14px; font-weight:bold; color:#fff; border-bottom:1px solid rgba(255,255,255,0.12);'
  panel.appendChild(title)

  // 工具提示
  const hint = document.createElement('div')
  hint.style.cssText = 'padding:6px 12px; font-size:11px; color:#aaa; min-height:32px; line-height:1.5;'
  hint.textContent = '选择元素后点击地图放置'
  panel.appendChild(hint)

  // 类别按钮
  const ITEMS = [
    { type: 'tree',     label: '🌲 树木' },
    { type: 'rock',     label: '🪨 岩石' },
    { type: 'campfire', label: '🔥 火堆' },
    { type: 'npc',      label: '👤 NPC'  },
  ]

  const btns = {}
  let activeType = null

  const itemSection = document.createElement('div')
  itemSection.style.cssText = 'display:flex; flex-direction:column; gap:4px; padding:8px;'

  ITEMS.forEach(({ type, label }) => {
    const btn = document.createElement('button')
    btn.textContent = label
    btn.style.cssText = `
      padding:9px 10px; border:none; border-radius:6px; cursor:pointer;
      background:rgba(255,255,255,0.07); color:#ddd; text-align:left;
      font-size:13px; transition:background 0.15s;
    `
    btn.onmouseenter = () => { if (activeType !== type) btn.style.background = 'rgba(255,255,255,0.13)' }
    btn.onmouseleave = () => { if (activeType !== type) btn.style.background = 'rgba(255,255,255,0.07)' }
    btn.onclick = () => {
      const next = activeType === type ? null : type
      setActive(next)
      onSelectType(next)
    }
    btns[type] = btn
    itemSection.appendChild(btn)
  })
  panel.appendChild(itemSection)

  function setActive(type) {
    activeType = type
    Object.entries(btns).forEach(([t, b]) => {
      b.style.background = t === type ? 'rgba(99,179,237,0.35)' : 'rgba(255,255,255,0.07)'
      b.style.color      = t === type ? '#fff' : '#ddd'
    })
    if (type) {
      hint.textContent = '点击地图放置 | R 旋转 | ESC 取消 | Del 删除选中'
    } else {
      hint.textContent = '点击地图上的元素可选中并拖拽移动'
    }
  }

  // 分隔线
  const sep = document.createElement('div')
  sep.style.cssText = 'margin:8px 12px; border-top:1px solid rgba(255,255,255,0.12);'
  panel.appendChild(sep)

  // 底部操作区
  const actions = document.createElement('div')
  actions.style.cssText = 'display:flex; flex-direction:column; gap:6px; padding:8px; margin-top:auto;'

  function makeActionBtn(label, color, onClick) {
    const b = document.createElement('button')
    b.textContent = label
    b.style.cssText = `
      padding:8px 10px; border:none; border-radius:6px; cursor:pointer;
      background:${color}; color:#fff; font-size:13px; text-align:left;
      transition:filter 0.15s;
    `
    b.onmouseenter = () => { b.style.filter = 'brightness(1.2)' }
    b.onmouseleave = () => { b.style.filter = '' }
    b.onclick = onClick
    return b
  }

  // 导出按钮
  actions.appendChild(makeActionBtn('💾 导出布局', 'rgba(56,161,105,0.75)', () => {
    const json = onExport()
    localStorage.setItem('mapLayout', json)
    const blob = new Blob([json], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'map_layout.json'; a.click()
    URL.revokeObjectURL(url)
  }))

  // 加载按钮（隐藏 file input）
  const fileInput = document.createElement('input')
  fileInput.type = 'file'; fileInput.accept = '.json'
  fileInput.style.display = 'none'
  fileInput.onchange = () => {
    const file = fileInput.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => onLoad(e.target.result)
    reader.readAsText(file)
    fileInput.value = ''
  }
  panel.appendChild(fileInput)

  actions.appendChild(makeActionBtn('📂 加载布局', 'rgba(49,130,206,0.75)', () => fileInput.click()))

  // 清除存档按钮
  actions.appendChild(makeActionBtn('🗑️ 清除存档', 'rgba(120,60,60,0.6)', () => {
    localStorage.removeItem('mapLayout')
    hint.textContent = '存档已清除，退出后刷新生效'
  }))

  // 退出按钮
  const sep2 = document.createElement('div')
  sep2.style.cssText = 'margin:2px 0; border-top:1px solid rgba(255,255,255,0.1);'
  actions.appendChild(sep2)
  actions.appendChild(makeActionBtn('✖ 退出编辑', 'rgba(180,60,60,0.75)', onExit))

  panel.appendChild(actions)

  // 操作说明
  const tips = document.createElement('div')
  tips.style.cssText = 'padding:8px 12px 14px; font-size:10px; color:#777; line-height:1.7;'
  tips.innerHTML = 'WASD 平移镜头<br>滚轮 缩放<br>拖拽已选元素 移动'
  panel.appendChild(tips)

  app.appendChild(panel)

  return {
    show() { panel.style.display = 'flex' },
    hide() { panel.style.display = 'none' },
    resetActive() { setActive(null) },
    destroy() { app.removeChild(panel) },
  }
}
