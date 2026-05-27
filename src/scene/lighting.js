import * as THREE from 'three'

export function createLighting(scene) {
  // 环境光（PBR 用 PMREMGenerator 效果最好，这里用半球光近似天空/地面反射）
  const hemi = new THREE.HemisphereLight(0x87ceeb, 0x4a7c3f, 0.8)
  scene.add(hemi)

  // 主方向光（太阳）
  const sun = new THREE.DirectionalLight(0xfff5e0, 2.0)
  sun.position.set(15, 25, 10)
  sun.castShadow = true
  sun.shadow.mapSize.set(4096, 4096)
  sun.shadow.camera.near = 1
  sun.shadow.camera.far  = 220
  sun.shadow.camera.left   = -44
  sun.shadow.camera.right  =  44
  sun.shadow.camera.top    =  44
  sun.shadow.camera.bottom = -44
  scene.add(sun)
  scene.add(sun.target)

  // 补光
  const fill = new THREE.DirectionalLight(0xaaccff, 0.4)
  fill.position.set(-10, 10, -10)
  scene.add(fill)

  return { sun, hemi, fill }
}
