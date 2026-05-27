import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import { hills as hillDefs } from '../config/world.js'

const _rayDown = new THREE.Raycaster()
_rayDown.ray.direction.set(0, -1, 0)
let _terrainMesh = null

// Collision step config — each 0.2 m so the tolerance (h-0.2) lets the player
// walk up naturally. Visual models are decorative; collision circles do the work.
const STEP_H = 0.2
const RADII  = [4.5, 3.0, 1.8]  // outer → inner visual radii

const loader = new GLTFLoader()

function place(scene, path, x, y, z, rotY, scale) {
  loader.load(path, (gltf) => {
    const mesh = gltf.scene
    mesh.position.set(x, y, z)
    mesh.rotation.y = rotY
    mesh.scale.setScalar(scale)
    mesh.traverse(c => {
      if (c.isMesh) { c.castShadow = true; c.receiveShadow = true }
    })
    scene.add(mesh)
  })
}

// Hill visuals — one hex tile per hill, scaled up as a landmark
const HILL_MODELS = [
  '/models/terrain/grass-hill.glb',     // 南侧山丘
  '/models/terrain/stone-mountain.glb', // 东侧山丘
]

// Scattered forest + rock decorations [x, z, model, rotY, scale]
const DECORATIONS = [
  [-15, -22, '/models/terrain/grass-forest.glb', 0,              4.0],
  [ 20, -18, '/models/terrain/grass-forest.glb', Math.PI * 0.4,  4.0],
  [ -8,  32, '/models/terrain/grass-forest.glb', Math.PI * 1.1,  3.5],
  [ 15, -30, '/models/terrain/stone-rocks.glb',  Math.PI * 0.7,  3.5],
  [-22,  18, '/models/terrain/stone-rocks.glb',  Math.PI * 1.6,  3.0],
  [ 36,  -6, '/models/terrain/stone-rocks.glb',  Math.PI * 0.3,  3.5],
]

const fbxLoader = new FBXLoader()

export function createTerrain(scene) {
  const collidables = []

  // 大水池地形 FBX
  fbxLoader.load('/models/terrain.fbx', (fbx) => {
    fbx.scale.setScalar(0.01)
    fbx.position.set(-52, 0, -8)
    const _tLights = []
    fbx.traverse(c => {
      if (c.isMesh) { c.castShadow = true; c.receiveShadow = true }
      if (c.isLight) _tLights.push(c)
    })
    _tLights.forEach(l => l.removeFromParent())
    scene.add(fbx)
    _terrainMesh = fbx

    // 一次性高度采样，帮助确认台阶/平台高度
    const _r = new THREE.Raycaster()
    _r.ray.direction.set(0, -1, 0)
    console.log('=== terrain.fbx 高度采样（世界坐标，仅显示 h > 0.05 的点）===')
    for (let xo = -12; xo <= 12; xo += 2) {
      for (let zo = -12; zo <= 12; zo += 2) {
        const wx = -52 + xo, wz = -8 + zo
        _r.ray.origin.set(wx, 30, wz)
        const hits = _r.intersectObject(fbx, true)
        if (hits.length > 0 && hits[0].point.y > 0.05) {
          console.log(`  world(${wx}, ${wz})  →  h = ${hits[0].point.y.toFixed(3)}`)
        }
      }
    }
  })

  // Hills: visual model + concentric circle collidables for step-up mechanic
  hillDefs.forEach(({ x, z }, i) => {
    const modelPath = HILL_MODELS[i % HILL_MODELS.length]
    place(scene, modelPath, x, 0, z, Math.random() * Math.PI * 2, 5)

    RADII.forEach((r, j) => {
      // r / 0.75 compensates for getSurfaceHeight's inner 0.75 factor
      collidables.push({ x, z, r: r / 0.75, h: STEP_H * (j + 1) })
    })
  })

  // Decorations: purely visual, no collision
  for (const [x, z, path, rotY, scale] of DECORATIONS) {
    place(scene, path, x, 0, z, rotY, scale)
  }

  return {
    collidables,
    getSurfaceHeight(x, z) {
      if (!_terrainMesh) return 0
      _rayDown.ray.origin.set(x, 30, z)
      const hits = _rayDown.intersectObject(_terrainMesh, true)
      return hits.length > 0 ? hits[0].point.y : 0
    },
  }
}
