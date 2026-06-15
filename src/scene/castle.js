import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { CollisionSystem } from '../systems/collision.js'
import { CASTLE_ENTRANCE, CASTLE_ZONES } from '../config/castle.js'
import { snapObjectToGround } from './map.js'

const STONE = new THREE.MeshStandardMaterial({ color: 0x56585d, roughness: 0.92 })
const DARK_STONE = new THREE.MeshStandardMaterial({ color: 0x33363b, roughness: 0.98 })
const FLOOR = new THREE.MeshStandardMaterial({ color: 0x45474b, roughness: 1 })
const WOOD = new THREE.MeshStandardMaterial({ color: 0x493426, roughness: 0.92 })
const FLAME_OUTER = new THREE.MeshBasicMaterial({
  color: 0xff5a18,
  transparent: true,
  opacity: 0.72,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
})
const FLAME_INNER = new THREE.MeshBasicMaterial({
  color: 0xffe07a,
  transparent: true,
  opacity: 0.92,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
})
const SPARK = new THREE.MeshBasicMaterial({
  color: 0xffb347,
  transparent: true,
  opacity: 0.85,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
})
const FLAME_GEO = new THREE.SphereGeometry(0.16, 8, 8)
const SPARK_GEO = new THREE.SphereGeometry(0.025, 5, 5)
const _torchWorldPos = new THREE.Vector3()
const _gltfLoader = new GLTFLoader()

function configureCastleModel(model) {
  model.traverse(child => {
    if (!child.isMesh) return
    child.receiveShadow = true
    child.castShadow = !child.name.startsWith('NO_SHADOW_')
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    materials.forEach(material => {
      if (!material) return
      material.vertexColors = child.geometry?.getAttribute('color') !== undefined
      material.needsUpdate = true
    })
  })
  return model
}

function hideDirectGrayboxMeshes(group) {
  group.children.forEach(child => {
    if (child.isMesh && !child.userData.keepVisible) child.visible = false
  })
}

function loadVisualModel(url, parent, onReady = null) {
  if (!url) return
  _gltfLoader.load(url, gltf => {
    const model = configureCastleModel(gltf.scene)
    parent.add(model)
    if (onReady) onReady(model)
  }, undefined, error => {
    console.warn(`Castle model fallback active: ${url}`, error)
  })
}

function applyTorchSockets(model, parent, torches) {
  const sockets = []
  model.traverse(child => {
    if (child.name.startsWith('SOCKET_TORCH_')) sockets.push(child)
  })
  sockets.sort((a, b) => a.name.localeCompare(b.name))
  parent.updateMatrixWorld(true)
  sockets.forEach((socket, index) => {
    const torch = torches[index]
    if (!torch) return
    socket.getWorldPosition(_torchWorldPos)
    parent.worldToLocal(_torchWorldPos)
    torch.group.position.copy(_torchWorldPos)
  })
}

function createFogGateMaterial(speed, phase, opacity) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: phase },
      uSpeed: { value: speed },
      uOpacity: { value: opacity },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      uniform float uSpeed;
      uniform float uOpacity;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
      }

      void main() {
        vec2 flowUv = vec2(vUv.x * 3.0, vUv.y * 4.5 + uTime * uSpeed);
        float cloud = noise(flowUv) * 0.58 + noise(flowUv * 2.1 + 4.7) * 0.28
          + noise(flowUv * 4.3 - 2.8) * 0.14;
        float sideFade = smoothstep(0.0, 0.07, vUv.x) * smoothstep(0.0, 0.07, 1.0 - vUv.x);
        float verticalFade = smoothstep(0.0, 0.045, vUv.y) * smoothstep(0.0, 0.06, 1.0 - vUv.y);
        float alpha = (0.48 + cloud * 0.48) * sideFade * verticalFade * uOpacity;
        vec3 color = mix(vec3(0.86, 0.89, 0.94), vec3(1.0), cloud);
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  })
}

function createFogGate(group) {
  const layerDefs = [
    { x: -3.72, speed: 0.20, phase: 0.0, opacity: 0.98 },
    { x: -3.68, speed: 0.31, phase: 7.4, opacity: 0.84 },
    { x: -3.64, speed: 0.13, phase: 13.8, opacity: 0.68 },
    { x: -3.60, speed: 0.25, phase: 19.6, opacity: 0.52 },
  ]
  const fogLayers = layerDefs.map(({ x, speed, phase, opacity }, index) => {
    const material = createFogGateMaterial(speed, phase, opacity)
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 7.8, 1, 1), material)
    mesh.name = `fog-gate-layer:${index}`
    mesh.userData.keepVisible = true
    mesh.position.set(x, 3.9, 0)
    mesh.rotation.y = -Math.PI / 2
    mesh.frustumCulled = false
    mesh.renderOrder = 20 + index
    group.add(mesh)
    return { mesh, material, phase }
  })

  const glow = new THREE.PointLight(0xe7edff, 6.5, 16, 2)
  glow.position.set(-4.0, 3.9, 0)
  group.add(glow)

  return {
    update(time) {
      fogLayers.forEach(layer => {
        layer.material.uniforms.uTime.value = time + layer.phase
        layer.mesh.position.z = Math.sin(time * 0.35 + layer.phase) * 0.035
      })
      glow.intensity = 6.2 + Math.sin(time * 1.3) * 0.45
    },
  }
}

function addBox(group, material, x, y, z, sx, sy, sz, castShadow = false) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material)
  mesh.position.set(x, y, z)
  mesh.castShadow = castShadow
  mesh.receiveShadow = true
  group.add(mesh)
  return mesh
}

function addWall(group, colliders, x, z, sx, sz, height = 5) {
  addBox(group, STONE, x, height * 0.5, z, sx, height, sz)
  colliders.push({ x, z, hx: sx * 0.5, hz: sz * 0.5 })
}

function addBlocker(colliders, x, z, sx, sz, h = undefined) {
  colliders.push({ x, z, hx: sx * 0.5, hz: sz * 0.5, ...(h === undefined ? {} : { h }) })
}

function addFloor(group, bounds, y = -0.12) {
  const sx = bounds.maxX - bounds.minX
  const sz = bounds.maxZ - bounds.minZ
  addBox(group, FLOOR, (bounds.minX + bounds.maxX) * 0.5, y, (bounds.minZ + bounds.maxZ) * 0.5, sx, 0.24, sz)
}

function addTorch(group, torches, x, z, y = 2.2) {
  addBox(group, WOOD, x, y - 0.5, z, 0.08, 1.1, 0.08)
  const flameGroup = new THREE.Group()
  flameGroup.position.set(x, y, z)

  const outer = new THREE.Mesh(FLAME_GEO, FLAME_OUTER)
  outer.scale.set(0.9, 1.8, 0.9)
  flameGroup.add(outer)

  const inner = new THREE.Mesh(FLAME_GEO, FLAME_INNER)
  inner.position.y = -0.02
  inner.scale.set(0.52, 1.25, 0.52)
  flameGroup.add(inner)

  const sparks = Array.from({ length: 4 }, (_, index) => {
    const mesh = new THREE.Mesh(SPARK_GEO, SPARK)
    flameGroup.add(mesh)
    return {
      mesh,
      phase: index / 4,
      angle: index * Math.PI * 0.5,
    }
  })

  const light = new THREE.PointLight(0xff7a32, 18, 14, 2)
  light.position.y = 0.12
  light.castShadow = false
  light.shadow.mapSize.set(256, 256)
  light.shadow.camera.near = 0.2
  light.shadow.camera.far = 14
  flameGroup.add(light)
  group.add(flameGroup)
  torches.push({ group: flameGroup, outer, inner, sparks, light, phase: torches.length * 1.73 })
}

function buildGatehouse(zone) {
  const group = new THREE.Group()
  const colliders = []
  const torches = []
  addFloor(group, zone.bounds)
  addWall(group, colliders, -6.75, 8, 0.5, 16)
  addWall(group, colliders, 6.75, 8, 0.5, 16)
  addWall(group, colliders, -4.7, 15.75, 4.6, 0.5)
  addWall(group, colliders, 4.7, 15.75, 4.6, 0.5)
  addBlocker(colliders, 0, 15.75, 4.8, 0.5)
  addWall(group, colliders, -4.7, 0.25, 4.6, 0.5)
  addWall(group, colliders, 4.7, 0.25, 4.6, 0.5)
  addBox(group, DARK_STONE, -5.4, 5.5, 8, 3, 11, 3)
  addBox(group, DARK_STONE, 5.4, 5.5, 8, 3, 11, 3)
  addBlocker(colliders, -5.4, 8, 3, 3)
  addBlocker(colliders, 5.4, 8, 3, 3)
  addTorch(group, torches, -2.6, 12)
  addTorch(group, torches, 2.6, 12)
  return { group, colliders, torches }
}

function buildCourtyard(zone) {
  const group = new THREE.Group()
  const colliders = []
  const torches = []
  addFloor(group, zone.bounds)
  addWall(group, colliders, -13.75, -12, 0.5, 24, 6)
  addWall(group, colliders, 13.75, -12, 0.5, 24, 6)
  addWall(group, colliders, -8.5, -0.25, 11, 0.5, 6)
  addWall(group, colliders, 8.5, -0.25, 11, 0.5, 6)
  addWall(group, colliders, -8.5, -23.75, 11, 0.5, 7)
  addWall(group, colliders, 8.5, -23.75, 11, 0.5, 7)
  addBox(group, DARK_STONE, 0, 0.35, -12, 2.6, 0.7, 2.6)
  addBox(group, STONE, 0, 1.2, -12, 0.45, 1.7, 0.45)
  addBlocker(colliders, 0, -12, 2.6, 2.6, 0.7)
  addTorch(group, torches, -6, -20)
  addTorch(group, torches, 6, -20)
  return { group, colliders, torches }
}

function buildGreatHall(zone) {
  const group = new THREE.Group()
  const colliders = []
  const torches = []
  addFloor(group, zone.bounds)
  addWall(group, colliders, -9.75, -34, 0.5, 20, 8)
  addWall(group, colliders, -5.8, -24.25, 8.4, 0.5, 8)
  addWall(group, colliders, 5.8, -24.25, 8.4, 0.5, 8)
  addWall(group, colliders, 0, -43.75, 20, 0.5, 9)
  addWall(group, colliders, 9.75, -28.5, 0.5, 9, 8)
  addWall(group, colliders, 9.75, -40.5, 0.5, 7, 8)
  for (const x of [-5.5, 5.5]) {
    for (const z of [-29, -35, -41]) {
      addBox(group, DARK_STONE, x, 2.5, z, 0.9, 5, 0.9)
      addBlocker(colliders, x, z, 0.9, 0.9)
    }
  }
  addBox(group, WOOD, 0, 0.65, -40.8, 4.5, 1.3, 1.5)
  addBlocker(colliders, 0, -40.8, 4.5, 1.5)
  addTorch(group, torches, -7.5, -27)
  addTorch(group, torches, 7.5, -27)
  return { group, colliders, torches }
}

function buildTower(zone) {
  const group = new THREE.Group()
  const colliders = []
  const torches = []
  addFloor(group, zone.bounds)
  addWall(group, colliders, 19, -43.75, 18, 0.5, 12)
  addWall(group, colliders, 27.75, -35, 0.5, 18, 12)
  addWall(group, colliders, 19, -26.25, 18, 0.5, 12)
  addWall(group, colliders, 10.25, -29.5, 0.5, 6.5, 10)
  addWall(group, colliders, 10.25, -40.5, 0.5, 6.5, 10)
  addBox(group, DARK_STONE, 19, 0.25, -35, 9, 0.5, 9)
  addBox(group, STONE, 19, 2.1, -35, 2.6, 3.7, 2.6)
  addBlocker(colliders, 19, -35, 9, 9, 0.5)
  addBlocker(colliders, 19, -35, 2.6, 2.6)
  addTorch(group, torches, 13, -35)
  addTorch(group, torches, 25, -35)
  return { group, colliders, torches }
}

const BUILDERS = {
  gatehouse: buildGatehouse,
  courtyard: buildCourtyard,
  'great-hall': buildGreatHall,
  tower: buildTower,
}

function createOutdoorFacade(outdoorScene) {
  const group = new THREE.Group()
  group.position.set(CASTLE_ENTRANCE.x, 0, CASTLE_ENTRANCE.z)
  addBox(group, DARK_STONE, 0, 8, -8, 7, 16, 7)
  addBox(group, DARK_STONE, 0, 8, 8, 7, 16, 7)
  addBox(group, STONE, 0, 11.5, 0, 4, 7, 9)
  const fogGate = createFogGate(group)
  outdoorScene.add(group)
  snapObjectToGround(group)
  loadVisualModel(CASTLE_ENTRANCE.modelUrl, group, () => hideDirectGrayboxMeshes(group))
  return {
    group,
    fogGate,
    colliders: [
      { x: CASTLE_ENTRANCE.x, z: CASTLE_ENTRANCE.z - 8, hx: 3.5, hz: 3.5 },
      { x: CASTLE_ENTRANCE.x, z: CASTLE_ENTRANCE.z + 8, hx: 3.5, hz: 3.5 },
      { x: CASTLE_ENTRANCE.x - 3.45, z: CASTLE_ENTRANCE.z, hx: 0.5, hz: 3.0 },
    ],
  }
}

export function createCastleWorld(outdoorScene) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x111318)
  scene.fog = new THREE.Fog(0x111318, 32, 88)
  scene.add(new THREE.HemisphereLight(0x68758c, 0x17130f, 0.3))
  const key = new THREE.DirectionalLight(0xb9c8df, 0.42)
  key.position.set(-18, 28, 12)
  key.castShadow = true
  key.shadow.mapSize.set(1024, 1024)
  scene.add(key)

  const exterior = createOutdoorFacade(outdoorScene)
  const zoneById = new Map(CASTLE_ZONES.map(zone => [zone.id, zone]))
  const loaded = new Map()
  const collision = new CollisionSystem([], 34, 50)
  let currentZoneId = 'gatehouse'
  let torchTime = 0
  let outdoorTime = 0
  let shadowTorch = null

  function loadZone(id) {
    if (loaded.has(id)) return
    const zone = zoneById.get(id)
    const built = BUILDERS[id](zone)
    built.group.name = `castle-zone:${id}`
    scene.add(built.group)
    loaded.set(id, built)
    loadVisualModel(zone.modelUrl, built.group, model => {
      hideDirectGrayboxMeshes(built.group)
      applyTorchSockets(model, built.group, built.torches)
    })
  }

  function unloadZone(id) {
    const built = loaded.get(id)
    if (!built) return
    scene.remove(built.group)
    loaded.delete(id)
  }

  function rebuildCollision() {
    collision.collidables.length = 0
    loaded.forEach(built => collision.collidables.push(...built.colliders))
  }

  function updateTorches(dt, playerPosition) {
    torchTime += dt
    let nearest = null
    let nearestDistSq = Infinity

    loaded.forEach(built => {
      built.torches.forEach(torch => {
        const t = torchTime + torch.phase
        const flicker = 0.88 + Math.sin(t * 12.7) * 0.08 + Math.sin(t * 21.3) * 0.04
        torch.outer.scale.set(0.86 + Math.sin(t * 9.4) * 0.08, 1.7 * flicker, 0.86 + Math.cos(t * 11.1) * 0.08)
        torch.outer.position.set(Math.sin(t * 7.3) * 0.025, Math.sin(t * 13.2) * 0.025, Math.cos(t * 8.1) * 0.025)
        torch.outer.rotation.y = t * 0.45
        torch.inner.scale.set(0.5, 1.16 * flicker, 0.5)
        torch.inner.position.y = -0.03 + Math.sin(t * 15.2) * 0.018
        torch.light.intensity = 17 + flicker * 4
        torch.light.position.set(Math.sin(t * 8.7) * 0.045, 0.12 + Math.sin(t * 11.4) * 0.035, Math.cos(t * 7.9) * 0.045)

        torch.sparks.forEach((spark, index) => {
          const progress = (t * (0.35 + index * 0.025) + spark.phase) % 1
          spark.mesh.position.set(
            Math.cos(spark.angle + t) * progress * 0.16,
            0.1 + progress * 0.85,
            Math.sin(spark.angle + t) * progress * 0.16,
          )
          const sparkScale = Math.max(0.05, (1 - progress) * 0.9)
          spark.mesh.scale.setScalar(sparkScale)
        })

        torch.group.getWorldPosition(_torchWorldPos)
        const distSq = _torchWorldPos.distanceToSquared(playerPosition)
        if (distSq < nearestDistSq && distSq < 14 * 14) {
          nearest = torch
          nearestDistSq = distSq
        }
      })
    })

    if (nearest !== shadowTorch) {
      if (shadowTorch) shadowTorch.light.castShadow = false
      shadowTorch = nearest
      if (shadowTorch) shadowTorch.light.castShadow = true
    }
  }

  function syncLoadedZones() {
    const zone = zoneById.get(currentZoneId)
    const wanted = new Set([currentZoneId, ...zone.neighbors])
    wanted.forEach(loadZone)
    Array.from(loaded.keys()).forEach(id => {
      if (!wanted.has(id)) unloadZone(id)
    })
    rebuildCollision()
  }

  function findZone(position) {
    for (const zone of CASTLE_ZONES) {
      const b = zone.bounds
      if (position.x >= b.minX && position.x <= b.maxX && position.z >= b.minZ && position.z <= b.maxZ) {
        return zone.id
      }
    }
    return currentZoneId
  }

  syncLoadedZones()

  return {
    scene,
    collision,
    entrance: new THREE.Vector3(CASTLE_ENTRANCE.x, CASTLE_ENTRANCE.y, CASTLE_ENTRANCE.z),
    entranceRange: CASTLE_ENTRANCE.range,
    outdoorColliders: exterior.colliders,
    spawn: new THREE.Vector3(0, 0, 13),

    update(dt, playerPosition) {
      const nextZone = findZone(playerPosition)
      if (nextZone !== currentZoneId) {
        currentZoneId = nextZone
        syncLoadedZones()
      }
      updateTorches(dt, playerPosition)
    },

    updateOutdoor(dt) {
      outdoorTime += dt
      exterior.fogGate.update(outdoorTime)
    },

    isNearExit(playerPosition) {
      return currentZoneId === 'gatehouse' && playerPosition.z > 11.5 && Math.abs(playerPosition.x) < 3.5
    },

    getCurrentZoneId() {
      return currentZoneId
    },

    getLoadedZoneIds() {
      return Array.from(loaded.keys())
    },
  }
}
