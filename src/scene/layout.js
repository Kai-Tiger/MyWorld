import * as THREE from 'three'
import { buildRockInstances, cloneTreeForEditor, makeCampfire, snapObjectToGround } from './map.js'

export function applyLayoutToScene(scene, layout) {
  const d = typeof layout === 'string' ? JSON.parse(layout) : layout
  for (const { x, z, rotY = 0, scale = 1 } of d.trees ?? []) {
    const g = cloneTreeForEditor(scene, x, z, scale)
    g.rotation.y = rotY
    g.userData.editorMeta.rotY = rotY
  }
  buildRockInstances(scene, d.rocks ?? [])
  for (const { x, z, y } of d.campfires ?? [])
    makeCampfire(scene, x, z, y)
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
