import * as THREE from 'three'
import { cloneTreeForEditor, cloneRockForEditor, makeCampfire, buildRockInstances, snapObjectToGround } from '../scene/map.js'
import { createNPC } from '../entities/npc.js'

export function applyLayoutToScene(scene, layout) {
  const d = typeof layout === 'string' ? JSON.parse(layout) : layout
  for (const { x, z, rotY = 0, scale = 1 } of d.trees ?? []) {
    const g = cloneTreeForEditor(scene, x, z, scale)
    g.rotation.y = rotY
    g.userData.editorMeta.rotY = rotY
  }
  buildRockInstances(scene, d.rocks ?? [])
  for (const { x, z } of d.campfires ?? [])
    makeCampfire(scene, x, z)
  for (const { x, z, color = 0xff6b6b } of d.npcs ?? []) {
    const group = new THREE.Group()
    group.position.set(x, 0, z)
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 1.2, 8),
      new THREE.MeshLambertMaterial({ color })
    )
    body.position.y = 0.6
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 8, 8),
      new THREE.MeshLambertMaterial({ color: 0xfdbcb4 })
    )
    head.position.y = 1.44
    group.add(body, head)
    scene.add(group)
    snapObjectToGround(group)
  }
}

export function createMapEditor(scene, camera, renderer, initialLookAt) {
  const placedObjects = []  // { type, group, x, z, rotY, scale }
  let selectedObj   = null
  let selectionRing = null
  let placingType   = null
  let ghostGroup    = null
  let ghostRotY     = 0
  let isDragging      = false
  let dragObj         = null
  let _isPanning      = false
  const _panStartClient  = new THREE.Vector2()
  const _panStartLookAt  = new THREE.Vector3()

  // 编辑器视角中心点（camera = lookAt + (20,20,20)）
  const editorLookAt = initialLookAt ? initialLookAt.clone() : new THREE.Vector3()
  const _camOffset   = new THREE.Vector3(20, 20, 20)
  camera.position.copy(editorLookAt).add(_camOffset)
  camera.lookAt(editorLookAt)

  // 将场景中已存在的可编辑对象（带 editorMeta 标记）预先纳入追踪
  const _toExpand = []
  scene.children.forEach(obj => {
    if (!obj.userData.editorMeta) return
    const meta = obj.userData.editorMeta
    // 岩石 InstancedMesh → 展开为独立克隆，方便编辑器单独操作
    if (meta.type === 'rock_instanced') { _toExpand.push(obj); return }
    const { type, scale = 1 } = meta
    if (!placedObjects.some(o => o.group === obj))
      placedObjects.push({
        type, group: obj,
        x: obj.position.x, z: obj.position.z,
        rotY: obj.rotation.y, scale,
      })
  })
  _toExpand.forEach(inst => {
    scene.remove(inst)
    for (const { x, z, scale = 0.9 } of inst.userData.editorMeta.rocks) {
      const group = cloneRockForEditor(scene, x, z, scale)
      placedObjects.push({ type: 'rock', group, x, z, scale })
    }
  })

  // 射线投影
  const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  const _raycaster   = new THREE.Raycaster()
  const _mouse       = new THREE.Vector2()
  const _hit         = new THREE.Vector3()

  function getGroundPos(event) {
    const rect = renderer.domElement.getBoundingClientRect()
    _mouse.x =  ((event.clientX - rect.left) / rect.width)  * 2 - 1
    _mouse.y = -((event.clientY - rect.top)  / rect.height) * 2 + 1
    _raycaster.setFromCamera(_mouse, camera)
    if (!_raycaster.ray.intersectPlane(_groundPlane, _hit)) return null
    return { x: Math.round(_hit.x), z: Math.round(_hit.z) }
  }

  // 选中圆环
  function showRing(group) {
    hideRing()
    selectionRing = new THREE.Mesh(
      new THREE.RingGeometry(0.7, 1.0, 32),
      new THREE.MeshBasicMaterial({ color: 0xffdd00, side: THREE.DoubleSide, depthWrite: false })
    )
    selectionRing.rotation.x = -Math.PI / 2
    selectionRing.position.y = 0.06
    group.add(selectionRing)
  }

  function hideRing() {
    if (selectionRing) {
      selectionRing.removeFromParent()
      selectionRing.geometry.dispose()
      selectionRing.material.dispose()
      selectionRing = null
    }
  }

  // Ghost（半透明预览）
  function makeGhostMat(color) {
    return new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.5 })
  }

  function createGhost(type) {
    clearGhost()
    ghostGroup = new THREE.Group()
    switch (type) {
      case 'tree': {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 2.0, 6), makeGhostMat(0x8B5E3C))
        trunk.position.y = 1.0
        const crown = new THREE.Mesh(new THREE.ConeGeometry(1.0, 2.5, 7), makeGhostMat(0x2d8a2d))
        crown.position.y = 3.2
        ghostGroup.add(trunk, crown)
        break
      }
      case 'rock': {
        const r = new THREE.Mesh(new THREE.SphereGeometry(0.75, 7, 5), makeGhostMat(0x9a9080))
        r.position.y = 0.55
        r.scale.set(1, 0.7, 1)
        ghostGroup.add(r)
        break
      }
      case 'npc': {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.2, 8), makeGhostMat(0xff6b6b))
        body.position.y = 0.6
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), makeGhostMat(0xfdbcb4))
        head.position.y = 1.44
        ghostGroup.add(body, head)
        break
      }
      case 'campfire': {
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.15, 8), makeGhostMat(0x888070))
        base.position.y = 0.08
        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.7, 7), makeGhostMat(0xff6600))
        flame.position.y = 0.55
        ghostGroup.add(base, flame)
        break
      }
    }
    ghostGroup.rotation.y = ghostRotY
    scene.add(ghostGroup)
  }

  function clearGhost() {
    if (!ghostGroup) return
    ghostGroup.traverse(c => {
      if (c.isMesh) { c.geometry.dispose(); c.material.dispose() }
    })
    scene.remove(ghostGroup)
    ghostGroup = null
  }

  // 放置对象
  function placeObject(x, z) {
    switch (placingType) {
      case 'tree': {
        const scale = 0.85 + Math.random() * 0.25
        const group = cloneTreeForEditor(scene, x, z, scale)
        group.rotation.y = ghostRotY
        placedObjects.push({ type: 'tree', group, x, z, rotY: ghostRotY, scale })
        break
      }
      case 'rock': {
        const scale = 0.65 + Math.random() * 0.35
        const group = cloneRockForEditor(scene, x, z, scale)
        placedObjects.push({ type: 'rock', group, x, z, scale })
        break
      }
      case 'campfire': {
        const group = makeCampfire(scene, x, z)
        placedObjects.push({ type: 'campfire', group, x, z })
        break
      }
      case 'npc': {
        // 编辑器中 NPC 只是可视化占位，不参与寻路/对话
        const group = new THREE.Group()
        group.position.set(x, 0, z)
        const body = new THREE.Mesh(
          new THREE.CylinderGeometry(0.22, 0.22, 1.2, 8),
          new THREE.MeshLambertMaterial({ color: 0xff6b6b })
        )
        body.position.y = 0.6
        const head = new THREE.Mesh(
          new THREE.SphereGeometry(0.28, 8, 8),
          new THREE.MeshLambertMaterial({ color: 0xfdbcb4 })
        )
        head.position.y = 1.44
        group.add(body, head)
        scene.add(group)
        snapObjectToGround(group)
        placedObjects.push({ type: 'npc', group, x, z, rotY: ghostRotY, color: 0xff6b6b })
        break
      }
    }
  }

  // 尝试选中鼠标下的对象
  function trySelect(event) {
    const rect = renderer.domElement.getBoundingClientRect()
    _mouse.x =  ((event.clientX - rect.left) / rect.width)  * 2 - 1
    _mouse.y = -((event.clientY - rect.top)  / rect.height) * 2 + 1
    _raycaster.setFromCamera(_mouse, camera)

    // 先检查编辑器已跟踪的对象
    let closest = null, closestD = Infinity
    for (const obj of placedObjects) {
      if (!obj.group) continue
      const hits = _raycaster.intersectObject(obj.group, true)
      if (hits.length && hits[0].distance < closestD) {
        closestD = hits[0].distance
        closest = obj
      }
    }

    // 再扫描场景中现有的（map.js 硬编码放置的）对象
    const sceneHits = _raycaster.intersectObjects(scene.children, true)
    for (const hit of sceneHits) {
      if (hit.distance >= closestD) break

      // 沿父链找到 scene 的直接子节点
      let root = hit.object
      while (root.parent && root.parent !== scene) root = root.parent

      // 跳过：光源、地面平面、已跟踪的对象；InstancedMesh 单独处理
      if (root.isLight) continue
      if (root.isInstancedMesh) continue
      if (root.type === 'Mesh' && root.geometry?.type === 'PlaneGeometry') continue
      if (placedObjects.some(o => o.group === root)) continue

      // 首次命中，加入跟踪列表
      const pos = root.position
      const entry = { type: 'existing', group: root, x: Math.round(pos.x), z: Math.round(pos.z) }
      placedObjects.push(entry)
      closest = entry
      closestD = hit.distance
      break
    }

    if (selectedObj !== closest) {
      hideRing()
      selectedObj = closest
      if (closest) showRing(closest.group)
    }
    return !!closest
  }

  // 删除选中对象
  function deleteSelected() {
    if (!selectedObj) return
    hideRing()
    scene.remove(selectedObj.group)
    // house/npc 使用程序几何体，可安全释放；tree/rock/existing 使用共享 GLB 几何体，只移除不释放
    if (selectedObj.type === 'house' || selectedObj.type === 'npc' || selectedObj.type === 'campfire') {
      selectedObj.group.traverse(c => {
        if (c.isMesh) { c.geometry.dispose(); if (c.material?.dispose) c.material.dispose() }
      })
    }
    const idx = placedObjects.indexOf(selectedObj)
    if (idx !== -1) placedObjects.splice(idx, 1)
    selectedObj = null
  }

  // 键盘状态
  const _keys = {}

  function onMouseMove(e) {
    if (e.target !== renderer.domElement) return
    if (_isPanning) {
      const rect = renderer.domElement.getBoundingClientRect()
      const dx   = e.clientX - _panStartClient.x
      const dy   = e.clientY - _panStartClient.y
      const scaleX = (camera.right - camera.left) / camera.zoom / rect.width
      const scaleY = (camera.top   - camera.bottom) / camera.zoom / rect.height
      const _r = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0)
      const _u = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1)
      editorLookAt.copy(_panStartLookAt)
        .addScaledVector(_r, -dx * scaleX)
        .addScaledVector(_u,  dy * scaleY)
      camera.position.copy(editorLookAt).add(_camOffset)
      camera.lookAt(editorLookAt)
      return
    }
    const pos = getGroundPos(e)
    if (!pos) return
    if (ghostGroup) {
      ghostGroup.position.set(pos.x, 0, pos.z)
      snapObjectToGround(ghostGroup)
    }
    if (isDragging && dragObj?.group) {
      dragObj.group.position.set(pos.x, 0, pos.z)
      snapObjectToGround(dragObj.group)
      dragObj.x = pos.x
      dragObj.z = pos.z
    }
  }

  function onMouseDown(e) {
    if (e.button !== 0 || e.target !== renderer.domElement) return
    if (placingType) {
      const pos = getGroundPos(e)
      if (pos) placeObject(pos.x, pos.z)
      return
    }
    if (trySelect(e) && selectedObj) {
      isDragging = true
      dragObj = selectedObj
    } else {
      // 点击空白处：拖动地图
      _isPanning = true
      _panStartClient.set(e.clientX, e.clientY)
      _panStartLookAt.copy(editorLookAt)
      isDragging = false
      dragObj = null
    }
  }

  function onMouseUp() {
    isDragging  = false
    dragObj     = null
    _isPanning  = false
  }

  function onKeyDown(e) {
    _keys[e.key] = true
    if (e.key === 'r' || e.key === 'R') {
      ghostRotY += Math.PI / 4
      if (ghostGroup) ghostGroup.rotation.y = ghostRotY
      if (selectedObj?.group) {
        selectedObj.group.rotation.y += Math.PI / 4
        selectedObj.rotY = selectedObj.group.rotation.y
      }
    }
    if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected()
    if (e.key === 'Escape') {
      if (placingType) {
        placingType = null
        clearGhost()
        if (_onPlacingChange) _onPlacingChange(null)
      } else {
        hideRing()
        selectedObj = null
      }
    }
  }

  function onKeyUp(e) { delete _keys[e.key] }

  function onWheel(e) {
    camera.zoom = Math.max(0.5, Math.min(4, camera.zoom - e.deltaY * 0.002))
    camera.updateProjectionMatrix()
  }

  renderer.domElement.addEventListener('mousemove', onMouseMove)
  renderer.domElement.addEventListener('mousedown', onMouseDown)
  renderer.domElement.addEventListener('mouseup',   onMouseUp)
  renderer.domElement.addEventListener('wheel',     onWheel, { passive: true })
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup',   onKeyUp)

  let _onPlacingChange = null
  const PAN = 12

  return {
    onPlacingChange(cb) { _onPlacingChange = cb },

    update(dt) {
      let dx = 0, dz = 0
      if (_keys['ArrowLeft']  || _keys['a'] || _keys['A']) dx -= 1
      if (_keys['ArrowRight'] || _keys['d'] || _keys['D']) dx += 1
      if (_keys['ArrowUp']    || _keys['w'] || _keys['W']) dz -= 1
      if (_keys['ArrowDown']  || _keys['s'] || _keys['S']) dz += 1
      if (dx || dz) {
        editorLookAt.x += dx * PAN * dt
        editorLookAt.z += dz * PAN * dt
        camera.position.copy(editorLookAt).add(_camOffset)
        camera.lookAt(editorLookAt)
      }
    },

    setPlacingType(type) {
      placingType = type
      ghostRotY = 0
      hideRing()
      selectedObj = null
      type ? createGhost(type) : clearGhost()
    },

    exportLayout() {
      const out = { houses: [], trees: [], rocks: [], campfires: [], npcs: [] }
      for (const o of placedObjects) {
        const { type, scale = 1, color } = o
        if      (type === 'tree')     out.trees.push({ x: o.group.position.x, z: o.group.position.z, rotY: o.group.rotation.y, scale })
        else if (type === 'rock')     out.rocks.push({ x: o.group.position.x, z: o.group.position.z, scale })
        else if (type === 'campfire') out.campfires.push({ x: o.group.position.x, z: o.group.position.z })
        else if (type === 'npc')      out.npcs.push({ x: o.group.position.x, z: o.group.position.z, color: color ?? 0xff6b6b })
      }
      return JSON.stringify(out, null, 2)
    },

    loadLayout(jsonStr) {
      for (const o of placedObjects) {
        if (o.group) scene.remove(o.group)
      }
      placedObjects.length = 0
      hideRing(); selectedObj = null

      const d = JSON.parse(jsonStr)
      for (const { x, z, rotY = 0, scale = 1 } of d.trees ?? []) {
        const group = cloneTreeForEditor(scene, x, z, scale)
        group.rotation.y = rotY
        group.userData.editorMeta.rotY = rotY
        placedObjects.push({ type: 'tree', group, x, z, rotY, scale })
      }
      for (const { x, z, scale = 1 } of d.rocks ?? []) {
        const group = cloneRockForEditor(scene, x, z, scale)
        placedObjects.push({ type: 'rock', group, x, z, scale })
      }
      for (const { x, z } of d.campfires ?? []) {
        const group = makeCampfire(scene, x, z)
        placedObjects.push({ type: 'campfire', group, x, z })
      }
      for (const { x, z, color = 0xff6b6b } of d.npcs ?? []) {
        const group = new THREE.Group()
        group.position.set(x, 0, z)
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.2, 8), new THREE.MeshLambertMaterial({ color }))
        body.position.y = 0.6
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), new THREE.MeshLambertMaterial({ color: 0xfdbcb4 }))
        head.position.y = 1.44
        group.add(body, head)
        scene.add(group)
        snapObjectToGround(group)
        placedObjects.push({ type: 'npc', group, x, z, color })
      }
      localStorage.setItem('mapLayout', jsonStr)
    },

    destroy() {
      renderer.domElement.removeEventListener('mousemove', onMouseMove)
      renderer.domElement.removeEventListener('mousedown', onMouseDown)
      renderer.domElement.removeEventListener('mouseup',   onMouseUp)
      renderer.domElement.removeEventListener('wheel',     onWheel)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup',   onKeyUp)
      clearGhost()
      hideRing()
      // 放置的对象保留在场景里（退出编辑器时场景不清空）
    },
  }
}
