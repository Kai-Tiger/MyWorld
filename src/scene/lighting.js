import * as THREE from 'three'

export function createLighting(scene) {
  // 环境光（PBR 用 PMREMGenerator 效果最好，这里用半球光近似天空/地面反射）
  const hemi = new THREE.HemisphereLight(0x95cfff, 0x3f5a35, 0.62)
  scene.add(hemi)

  // 主方向光（太阳）
  const sun = new THREE.DirectionalLight(0xfff1d4, 2.2)
  sun.position.set(15, 25, 10)
  sun.castShadow = true
  sun.shadow.mapSize.set(1536, 1536)
  sun.shadow.camera.near = 1
  sun.shadow.camera.far  = 220
  sun.shadow.camera.left   = -40
  sun.shadow.camera.right  =  40
  sun.shadow.camera.top    =  40
  sun.shadow.camera.bottom = -40
  sun.shadow.bias = -0.00015
  sun.shadow.normalBias = 0.02
  sun.shadow.radius = 2
  scene.add(sun)
  scene.add(sun.target)

  // 补光
  const fill = new THREE.DirectionalLight(0x9fc0ff, 0.34)
  fill.position.set(-10, 10, -10)
  scene.add(fill)

  const moon = new THREE.DirectionalLight(0xc7d8ff, 0.0)
  moon.position.set(-15, 25, -10)
  moon.castShadow = false
  moon.shadow.mapSize.set(1536, 1536)
  moon.shadow.camera.near = 1
  moon.shadow.camera.far = 220
  moon.shadow.camera.left = -40
  moon.shadow.camera.right = 40
  moon.shadow.camera.top = 40
  moon.shadow.camera.bottom = -40
  moon.shadow.bias = -0.00015
  moon.shadow.normalBias = 0.02
  moon.shadow.radius = 2
  scene.add(moon)
  scene.add(moon.target)

  return { sun, moon, hemi, fill }
}
