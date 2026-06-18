import * as THREE from 'three'

export function createScene() {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x87ceeb)
  scene.fog = new THREE.Fog(0x87ceeb, 180, 460)

  // 等轴测正交摄像机（动森视角）
  const aspect = window.innerWidth / window.innerHeight
  const s = 6
  const camera = new THREE.OrthographicCamera(
    -s * aspect, s * aspect, s, -s, 0.1, 400
  )
  camera.position.set(20, 20, 20)
  camera.lookAt(0, 0, 0)

  return { scene, camera }
}
