import * as THREE from 'three'
import { CollisionSystem } from '../systems/collision.js'
import { CASTLE_ENTRANCE, CASTLE_EXTERIOR, CASTLE_INTERIOR_EXIT, CASTLE_ZONES } from '../config/castle.js'
import { CASTLE_INDOOR_LIGHTING } from '../config/lighting.js'
import { snapObjectToGround } from './map.js'
import { cloneGLTFScene } from '../systems/modelAssets.js'

const CASTLE_TEXTURE_VERSION = 'v=16'
const STONE_TILE_SIZE = 3.6
const GLB_STONE_UV_STABILIZE_SCALE = 0.78
const ELEVATOR_ROOF_STOP_Y = 20
const ELEVATOR_PLATFORM_OFFSET_Y = 0.2
const ELEVATOR_ACTION_RANGE = 2.5
const _textureLoader = new THREE.TextureLoader()
const _castleTextureCache = new Map()

function loadCastleTexture(path, { color = false } = {}) {
  const cacheKey = `${path}:${color ? 'srgb' : 'linear'}`
  if (_castleTextureCache.has(cacheKey)) return _castleTextureCache.get(cacheKey)
  const texture = _textureLoader.load(`${path}?${CASTLE_TEXTURE_VERSION}`)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = true
  texture.anisotropy = 4
  if (color) texture.colorSpace = THREE.SRGBColorSpace
  _castleTextureCache.set(cacheKey, texture)
  return texture
}

function createCastleStoneMaterial({ color, roughness = 0.95, normalScale = 0.48 } = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    map: loadCastleTexture('/textures/castle_stone_wall_diff_1k.jpg', { color: true }),
    normalMap: loadCastleTexture('/textures/castle_stone_wall_nor_gl_1k.jpg'),
    normalScale: new THREE.Vector2(normalScale, normalScale),
    roughnessMap: loadCastleTexture('/textures/castle_stone_wall_rough_1k.jpg'),
  })
}

const STONE = createCastleStoneMaterial({ color: 0x9a988e, roughness: 0.96, normalScale: 0.34 })
const DARK_STONE = createCastleStoneMaterial({ color: 0x595a55, roughness: 0.98, normalScale: 0.24 })
const FLOOR = new THREE.MeshStandardMaterial({ color: 0x45474b, roughness: 1 })
const WOOD = new THREE.MeshStandardMaterial({ color: 0x493426, roughness: 0.92 })
const ELEVATOR_STONE = new THREE.MeshStandardMaterial({ color: 0x3f4246, roughness: 0.95, metalness: 0.08 })
const ELEVATOR_BUTTON = new THREE.MeshStandardMaterial({ color: 0x8b1f1f, roughness: 0.65, metalness: 0.28 })
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
const CASTLE_MANIFEST_URL = '/castle/castle-manifest.json?v=23'
const FOG_GATE_WIDTH = 16.4
const FOG_GATE_HEIGHT = 10.6
const FOG_GATE_CENTER_Y_OFFSET = 3.0
const OUTDOOR_FACADE_GROUND_OFFSET = -1
const FALLBACK_ZONE_BY_ID = new Map(CASTLE_ZONES.map(zone => [zone.id, zone]))

function mergeManifestZoneDefs(nextManifest) {
  if (!nextManifest?.zones) return CASTLE_ZONES
  return CASTLE_ZONES.map(fallback => {
    const manifestZone = nextManifest.zones[fallback.id]
    if (!manifestZone) return fallback
    return {
      ...fallback,
      ...manifestZone,
      id: fallback.id,
      modelUrl: fallback.modelUrl,
    }
  })
}

function exteriorColliderToWorld(collider) {
  return {
    ...collider,
    x: CASTLE_EXTERIOR.origin.x + (collider.x ?? 0),
    z: CASTLE_EXTERIOR.origin.z + (collider.z ?? 0),
  }
}

function syncColliderObjects(target, nextColliders) {
  nextColliders.forEach((collider, index) => {
    if (target[index]) {
      Object.keys(target[index]).forEach(key => {
        if (!(key in collider)) delete target[index][key]
      })
      Object.assign(target[index], collider)
      return
    }
    target.push({ ...collider })
  })
  for (let index = nextColliders.length; index < target.length; index++) {
    Object.assign(target[index], { x: 0, z: 0, hx: 0, hz: 0, minY: Infinity, maxY: -Infinity })
  }
}

function applyCastleStoneMaterial(material) {
  if (!material?.name?.startsWith('Stone_')) return
  const dark = material.name.includes('Soot')
  const edge = material.name.includes('Edge')
  material.color.setHex(dark ? 0x5f605a : edge ? 0xb3afa1 : 0x9e9b8f)
  material.map = loadCastleTexture('/textures/castle_stone_wall_diff_1k.jpg', { color: true })
  material.normalMap = loadCastleTexture('/textures/castle_stone_wall_nor_gl_1k.jpg')
  material.normalScale = new THREE.Vector2(dark ? 0.2 : edge ? 0.28 : 0.34, dark ? 0.2 : edge ? 0.28 : 0.34)
  material.roughnessMap = loadCastleTexture('/textures/castle_stone_wall_rough_1k.jpg')
  material.roughness = dark ? 1 : edge ? 0.94 : 0.96
  material.metalness = 0
}

function stabilizeStoneUvs(geometry) {
  if (!geometry || geometry.userData.castleStoneUvsStabilized) return
  const uv = geometry.getAttribute('uv')
  if (!uv) return
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * GLB_STONE_UV_STABILIZE_SCALE, uv.getY(i) * GLB_STONE_UV_STABILIZE_SCALE)
  }
  uv.needsUpdate = true
  geometry.userData.castleStoneUvsStabilized = true
}

function configureCastleModel(model, { shadows = true, stabilizeFacade = false } = {}) {
  model.traverse(child => {
    if (!child.isMesh) return
    if (stabilizeFacade && child.name.startsWith('VIS_FOG_ENTRY_')) {
      child.visible = false
      return
    }
    const shadowDisabled = child.name.startsWith('NO_SHADOW_')
    child.receiveShadow = shadows && !shadowDisabled
    child.castShadow = shadows && !shadowDisabled
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    const usesStoneMaterial = materials.some(material => material?.name?.startsWith('Stone_'))
    if (usesStoneMaterial) stabilizeStoneUvs(child.geometry)
    materials.forEach(material => {
      if (!material) return
      material.vertexColors = child.geometry?.getAttribute('color') !== undefined
      applyCastleStoneMaterial(material)
      if (stabilizeFacade) {
        material.polygonOffset = true
        material.polygonOffsetFactor = 1
        material.polygonOffsetUnits = 1
      }
      material.needsUpdate = true
    })
  })
  return model
}

function hideDirectGrayboxMeshes(group) {
  group.children.forEach(child => {
    if (child.isMesh && child.userData.runtimeCastleFloor) {
      child.visible = false
      return
    }
    if (child.isMesh && !child.userData.keepVisible) child.visible = false
  })
}

function loadVisualModel(url, parent, onReady = null, options = undefined) {
  if (!url) return
  cloneGLTFScene(url).then(scene => {
    const model = configureCastleModel(scene, options)
    parent.add(model)
    if (onReady) onReady(model)
  }).catch(error => {
    console.warn(`Castle model fallback active: ${url}`, error)
  })
}

async function loadCastleManifest() {
  try {
    const response = await fetch(CASTLE_MANIFEST_URL)
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
    return await response.json()
  } catch (error) {
    console.warn(`Castle manifest fallback active: ${CASTLE_MANIFEST_URL}`, error)
    return null
  }
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

function applyManifestTorchSockets(socketMap, torches) {
  if (!socketMap) return
  const sockets = Object.entries(socketMap)
    .filter(([name]) => name.startsWith('SOCKET_TORCH_'))
    .sort(([a], [b]) => a.localeCompare(b))
  sockets.forEach(([, socket], index) => {
    const torch = torches[index]
    if (!torch) return
    torch.group.position.set(socket.x ?? 0, socket.y ?? 0, socket.z ?? 0)
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
        float alpha = (0.432 + cloud * 0.432) * sideFade * verticalFade * uOpacity;
        vec3 color = mix(vec3(0.78, 0.80, 0.83), vec3(0.90, 0.91, 0.92), cloud);
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  })
}

function createFogGate(group, position = CASTLE_EXTERIOR.fogDoor) {
  const fogPosition = { ...position, y: position.y + FOG_GATE_CENTER_Y_OFFSET }
  const layerDefs = [
    { offset: 0, speed: 0.20, phase: 0.0, opacity: 0.98 },
    { offset: 0, speed: 0.31, phase: 7.4, opacity: 0.84 },
    { offset: 0, speed: 0.13, phase: 13.8, opacity: 0.68 },
    { offset: 0, speed: 0.25, phase: 19.6, opacity: 0.52 },
  ]
  const fogLayers = layerDefs.map(({ offset, speed, phase, opacity }, index) => {
    const material = createFogGateMaterial(speed, phase, opacity)
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(FOG_GATE_WIDTH, FOG_GATE_HEIGHT, 1, 1), material)
    mesh.name = `fog-gate-layer:${index}`
    mesh.userData.keepVisible = true
    mesh.position.set(
      fogPosition.x + offset,
      fogPosition.y,
      fogPosition.z,
    )
    mesh.rotation.y = -Math.PI / 2
    mesh.frustumCulled = false
    mesh.renderOrder = 20 + index
    group.add(mesh)
    return { mesh, material, phase }
  })

  const glow = new THREE.PointLight(0xcfd3d8, 4.32, 9, 2)
  glow.position.set(fogPosition.x - 0.25, fogPosition.y, fogPosition.z)
  group.add(glow)

  return {
    update(time) {
      fogLayers.forEach(layer => {
        layer.material.uniforms.uTime.value = time + layer.phase
        layer.mesh.position.z = fogPosition.z + Math.sin(time * 0.35 + layer.phase) * 0.018
      })
      glow.intensity = 5.58 + Math.sin(time * 1.3) * 0.405
    },
    setPosition(nextPosition) {
      Object.assign(fogPosition, nextPosition, { y: nextPosition.y + FOG_GATE_CENTER_Y_OFFSET })
      fogLayers.forEach((layer, index) => {
        layer.mesh.position.x = fogPosition.x + layerDefs[index].offset
        layer.mesh.position.y = fogPosition.y
        layer.mesh.position.z = fogPosition.z
      })
      glow.position.set(fogPosition.x - 0.25, fogPosition.y, fogPosition.z)
    },
  }
}

function addBox(group, material, x, y, z, sx, sy, sz, castShadow = false) {
  const geometry = new THREE.BoxGeometry(sx, sy, sz)
  if (material.map) scaleBoxUvs(geometry)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(x, y, z)
  mesh.castShadow = castShadow
  mesh.receiveShadow = true
  group.add(mesh)
  return mesh
}

function stabilizeRuntimeFloorMesh(mesh) {
  mesh.name = mesh.name || 'runtime-castle-floor'
  mesh.userData.runtimeCastleFloor = true
  mesh.material = mesh.material.clone()
  mesh.material.polygonOffset = true
  mesh.material.polygonOffsetFactor = 2
  mesh.material.polygonOffsetUnits = 2
  mesh.material.needsUpdate = true
  mesh.renderOrder = -1
  return mesh
}

function scaleBoxUvs(geometry, tileSize = STONE_TILE_SIZE) {
  const position = geometry.getAttribute('position')
  const normal = geometry.getAttribute('normal')
  const uv = geometry.getAttribute('uv')
  for (let i = 0; i < uv.count; i++) {
    const nx = normal.getX(i)
    const ny = normal.getY(i)
    const nz = normal.getZ(i)
    const px = position.getX(i)
    const py = position.getY(i)
    const pz = position.getZ(i)
    if (Math.abs(ny) > Math.abs(nx) && Math.abs(ny) > Math.abs(nz)) {
      uv.setXY(i, px / tileSize, pz / tileSize)
    } else if (Math.abs(nx) > Math.abs(nz)) {
      uv.setXY(i, pz / tileSize, py / tileSize)
    } else {
      uv.setXY(i, px / tileSize, py / tileSize)
    }
  }
  uv.needsUpdate = true
}

function addCylinder(group, material, x, y, z, radius, height, segments = 16, castShadow = false) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), material)
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

function addUpperWall(group, colliders, x, z, sx, sz, y = 5, height = 4) {
  addBox(group, STONE, x, y + height * 0.5, z, sx, height, sz)
  colliders.push({ x, z, hx: sx * 0.5, hz: sz * 0.5, minY: y, maxY: y + height })
}

function addPlatform(group, colliders, x, z, sx, sz, h = 5) {
  const platform = stabilizeRuntimeFloorMesh(addBox(group, FLOOR, x, h - 0.12, z, sx, 0.24, sz))
  platform.receiveShadow = false
  colliders.push({ x, z, hx: sx * 0.5, hz: sz * 0.5, h, surface: true })
}

function addPersistentPlatform(group, colliders, x, z, sx, sz, h, name) {
  const platform = stabilizeRuntimeFloorMesh(addBox(group, FLOOR, x, h - 0.12, z, sx, 0.24, sz))
  platform.receiveShadow = false
  platform.userData.keepVisible = true
  colliders.push({ name, x, z, hx: sx * 0.5, hz: sz * 0.5, h, surface: true })
}

function addElevatorLandingPlatforms(group, colliders, h, label) {
  addPersistentPlatform(group, colliders, -14.3, -32, 23.2, 7.2, h, `COL_SURFACE_${label}_ELEVATOR_WEST_BRIDGE`)
  addPersistentPlatform(group, colliders, 14.3, -32, 23.2, 7.2, h, `COL_SURFACE_${label}_ELEVATOR_EAST_BRIDGE`)
  addPersistentPlatform(group, colliders, 4.2, -25.8, 7.0, 5.2, h, `COL_SURFACE_${label}_ELEVATOR_LEVER_LANDING`)
}

function addVaultRoof(group, x, z, width, length, eaveY = 9.6, peakY = 12.6) {
  const rise = peakY - eaveY
  const slopeLength = Math.hypot(width * 0.5, rise)
  const angle = Math.atan2(rise, width * 0.5)
  for (const side of [-1, 1]) {
    const roof = addBox(
      group,
      DARK_STONE,
      x + side * width * 0.25,
      eaveY + rise * 0.5,
      z,
      slopeLength,
      0.5,
      length,
    )
    roof.rotation.z = side * angle
  }
}

function addStairRamp(group, colliders, x, z, width, length, h0, h1, reverse = false) {
  const steps = 12
  const stepDepth = length / steps - 0.025
  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) / steps
    const stepZ = z - length * 0.5 + t * length
    const stepH = reverse ? h1 + (h0 - h1) * t : h0 + (h1 - h0) * t
    const step = addBox(group, STONE, x, stepH * 0.5, stepZ, width, stepH, stepDepth)
    step.receiveShadow = false
  }
  colliders.push({ type: 'ramp', x, z, hx: width * 0.5, hz: length * 0.5, axis: 'z', h0, h1, reverse, surface: true })
  colliders.push({ x: x - width * 0.5 - 0.2, z, hx: 0.2, hz: length * 0.5, minY: 0, maxY: h1 + 1 })
  colliders.push({ x: x + width * 0.5 + 0.2, z, hx: 0.2, hz: length * 0.5, minY: 0, maxY: h1 + 1 })
}

function addSpiralStair(group, colliders, {
  x = -24,
  z = -29,
  bottom = 0,
  top = 20,
  radius = 4.4,
  steps = 54,
  phase = Math.PI * 0.15,
} = {}) {
  addCylinder(group, DARK_STONE, x, (top - bottom) * 0.5 + bottom, z, 0.75, top - bottom + 1.2, 18)
  colliders.push({ name: 'COL_BOX_SPIRAL_CORE', x, z, hx: 0.75, hz: 0.75, minY: bottom, maxY: top + 1.2 })

  for (let i = 0; i < steps; i++) {
    const t = (i + 1) / steps
    const angle = phase - t * Math.PI * 5.35
    const stepX = x + Math.cos(angle) * radius
    const stepZ = z + Math.sin(angle) * radius
    const stepY = bottom + t * (top - bottom)
    const step = addBox(group, STONE, stepX, stepY - 0.09, stepZ, 3.2, 0.18, 1.35)
    step.rotation.y = -angle
    step.receiveShadow = false
    colliders.push({
      name: `COL_SURFACE_SPIRAL_STEP_${i}`,
      x: stepX,
      z: stepZ,
      hx: 1.55,
      hz: 1.05,
      h: stepY,
      surface: true,
    })
    if (i % 4 === 0) {
      const railX = x + Math.cos(angle) * (radius + 1.55)
      const railZ = z + Math.sin(angle) * (radius + 1.55)
      addCylinder(group, WOOD, railX, stepY + 0.52, railZ, 0.08, 1.05, 8)
    }
  }

  for (const h of [5, 10, 15, 20]) {
    addPlatform(group, colliders, -27.8, -29, 4.4, 5.6, h)
  }
}

function addBlocker(colliders, x, z, sx, sz, h = undefined) {
  colliders.push({ x, z, hx: sx * 0.5, hz: sz * 0.5, ...(h === undefined ? {} : { h }) })
}

function addFloor(group, bounds, y = -0.12) {
  const sx = bounds.maxX - bounds.minX
  const sz = bounds.maxZ - bounds.minZ
  stabilizeRuntimeFloorMesh(addBox(group, FLOOR, (bounds.minX + bounds.maxX) * 0.5, y, (bounds.minZ + bounds.maxZ) * 0.5, sx, 0.24, sz))
}

function addTorch(group, torches, x, z, y = 2.2) {
  const handle = addBox(group, WOOD, x, y - 0.5, z, 0.08, 1.1, 0.08)
  handle.castShadow = false
  handle.receiveShadow = false
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

  const light = new THREE.PointLight(0xff8a3d, 26, 20, 2)
  light.position.y = 0.12
  light.castShadow = false
  light.shadow.mapSize.set(512, 512)
  light.shadow.camera.near = 0.35
  light.shadow.camera.far = 9
  light.shadow.bias = -0.001
  light.shadow.normalBias = 0.04
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
  for (const x of [-13.75, 13.75]) {
    addWall(group, colliders, x, -22.25, 0.5, 3.5, 6)
    addWall(group, colliders, x, -12, 0.5, 8, 6)
    addWall(group, colliders, x, -1.75, 0.5, 3.5, 6)
  }
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
  for (const x of [-9.75, 9.75]) {
    addWall(group, colliders, x, -28.25, 0.5, 8.5, 8)
    addWall(group, colliders, x, -39.75, 0.5, 8.5, 8)
  }
  addWall(group, colliders, -5.8, -24.25, 8.4, 0.5, 8)
  addWall(group, colliders, 5.8, -24.25, 8.4, 0.5, 8)
  addWall(group, colliders, -5.8, -43.75, 8.4, 0.5, 9)
  addWall(group, colliders, 5.8, -43.75, 8.4, 0.5, 9)
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
  const exitDoor = createInteriorExitDoor(group)
  exitDoor.blocker = { x: 0, z: -43.75, hx: 1.0, hz: 0.25 }
  colliders.push(exitDoor.blocker)
  return { group, colliders, torches, exitDoor }
}

function buildWing(zone, side) {
  const group = new THREE.Group()
  const colliders = []
  const torches = []
  const x = side * 21
  addFloor(group, zone.bounds)
  addWall(group, colliders, side * 27.75, -10, 0.5, 36, 8)
  addWall(group, colliders, x, 7.75, 14, 0.5, 8)
  addWall(group, colliders, x, -27.75, 14, 0.5, 8)
  for (const z of [-20, -8, 4]) {
    addBox(group, DARK_STONE, side * 24.5, 1.4, z, 4.2, 2.8, 2.2)
    addBlocker(colliders, side * 24.5, z, 4.2, 2.2)
  }
  addStairRamp(group, colliders, side * 18, -10, 3.6, 14, 0, 5, true)
  addTorch(group, torches, side * 24.5, -4)
  addTorch(group, torches, side * 24.5, -22)
  return { group, colliders, torches }
}

function buildUpperFloor(zone) {
  const group = new THREE.Group()
  const colliders = []
  const torches = []
  addPlatform(group, colliders, 0, -39.6, 22, 6.8, 5)
  addPlatform(group, colliders, 0, -24.4, 22, 6.8, 5)
  addPlatform(group, colliders, -7.5, -32, 7.0, 8.4, 5)
  addPlatform(group, colliders, 7.5, -32, 7.0, 8.4, 5)
  for (const side of [-1, 1]) {
    const outerStripX = side * 24.15
    const innerStripX = side * 14.85
    const stairX = side * 18
    addPlatform(group, colliders, outerStripX, -10, 7.7, 36, 5)
    addPlatform(group, colliders, innerStripX, -10, 1.7, 36, 5)
    addPlatform(group, colliders, stairX, -22.5, 4.6, 11, 5)
    addPlatform(group, colliders, stairX, 2.75, 4.6, 10.5, 5)
    addUpperWall(group, colliders, stairX - 2.5, -9.75, 0.25, 14.5, 5, 1.1)
    addUpperWall(group, colliders, stairX + 2.5, -9.75, 0.25, 14.5, 5, 1.1)
  }
  addPlatform(group, colliders, 0, -20, 30, 5, 5)
  addPlatform(group, colliders, 0, 8, 30, 12, 5)
  addPlatform(group, colliders, -18, 8, 6, 12, 5)
  addPlatform(group, colliders, 18, 8, 6, 12, 5)
  addVaultRoof(group, 0, -32, 22, 22, 9.7, 13.2)
  addVaultRoof(group, -21, -13, 14, 30, 9.7, 12.4)
  addVaultRoof(group, 21, -13, 14, 30, 9.7, 12.4)
  addBox(group, DARK_STONE, 0, 12.1, -20, 30, 0.6, 5)
  for (const x of [-27.75, 27.75]) addUpperWall(group, colliders, x, -12, 0.5, 40)
  addUpperWall(group, colliders, 0, -43.75, 56, 0.5)
  for (const [x, width] of [[-25.6, 4.8], [-10.6, 16.4], [10.6, 16.4], [25.6, 4.8]]) {
    addUpperWall(group, colliders, x, 2, width, 0.5, 5, 5)
  }
  for (const x of [-12, 12]) {
    addUpperWall(group, colliders, x, 8, 0.5, 12, 5, 1.4)
    addTorch(group, torches, x, -31, 7.1)
  }
  return { group, colliders, torches }
}

function addRuntimeRingPlatforms(group, colliders, h) {
  addPlatform(group, colliders, 0, -60, 84, 24, h)
  addPlatform(group, colliders, 0, 2, 84, 24, h)
  addPlatform(group, colliders, -34, -29, 16, 38, h)
  addPlatform(group, colliders, 34, -29, 16, 38, h)
}

function buildAtrium(zone) {
  const group = new THREE.Group()
  const colliders = []
  const torches = []
  addRuntimeRingPlatforms(group, colliders, 0)
  addSpiralStair(group, colliders)
  for (const h of [0, 5, 10, 15]) {
    addUpperWall(group, colliders, 0, -48, 28, 0.45, h, 1.2)
    addUpperWall(group, colliders, 0, -10, 28, 0.45, h, 1.2)
    addUpperWall(group, colliders, -14, -29, 0.45, 38, h, 1.2)
    addUpperWall(group, colliders, 14, -29, 0.45, 38, h, 1.2)
  }
  addTorch(group, torches, -36, -52)
  addTorch(group, torches, 36, -52)
  addTorch(group, torches, -36, -6)
  addTorch(group, torches, 36, -6)
  return { group, colliders, torches }
}

function buildHighFloor(zone, h) {
  const group = new THREE.Group()
  const colliders = []
  const torches = []
  addRuntimeRingPlatforms(group, colliders, h)
  addElevatorLandingPlatforms(group, colliders, h, h === 10 ? 'FLOOR_3' : 'FLOOR_4')
  addUpperWall(group, colliders, -50, -29, 0.5, 86, h, 5.6)
  addUpperWall(group, colliders, 50, -29, 0.5, 86, h, 5.6)
  addUpperWall(group, colliders, 0, -78, 100, 0.5, h, 5.6)
  addUpperWall(group, colliders, 0, 20, 100, 0.5, h, 5.6)
  for (const x of [-42, -24, 24, 42]) {
    addUpperWall(group, colliders, x, -72, 14, 0.5, h, 5.2)
    addUpperWall(group, colliders, x - 7, -64, 0.45, 16, h, 5.2)
    addUpperWall(group, colliders, x + 7, -64, 0.45, 16, h, 5.2)
  }
  addTorch(group, torches, -36, -52, h + 2.2)
  addTorch(group, torches, 36, -52, h + 2.2)
  addTorch(group, torches, -36, -6, h + 2.2)
  addTorch(group, torches, 36, -6, h + 2.2)
  return { group, colliders, torches }
}

function buildRoof(zone) {
  const group = new THREE.Group()
  const colliders = []
  const torches = []
  const h = 20
  addRuntimeRingPlatforms(group, colliders, h)
  for (const [x, z] of [[-42, -70], [42, -70], [-42, 12], [42, 12]]) {
    addBox(group, STONE, x, h + 2.8, z, 7.5, 5.6, 7.5)
    addBlocker(colliders, x, z, 7.5, 7.5)
  }
  addUpperWall(group, colliders, 0, -78, 100, 0.7, h, 1.6)
  addUpperWall(group, colliders, -50, -29, 0.7, 98, h, 1.6)
  addUpperWall(group, colliders, 50, -29, 0.7, 98, h, 1.6)
  addUpperWall(group, colliders, -28, 20, 44, 0.7, h, 1.6)
  addUpperWall(group, colliders, 28, 20, 44, 0.7, h, 1.6)
  addTorch(group, torches, -36, -52, h + 2.2)
  addTorch(group, torches, 36, -52, h + 2.2)
  addTorch(group, torches, -12, -10, h + 2.2)
  addTorch(group, torches, 12, -10, h + 2.2)
  return { group, colliders, torches }
}

function createInteriorExitDoor(group) {
  const frame = new THREE.Group()
  frame.position.set(0, 0, -43.45)
  const hinge = new THREE.Group()
  hinge.position.x = -0.78
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.56, 2.8, 0.16), WOOD)
  door.position.set(0.78, 1.4, 0)
  door.castShadow = true
  hinge.add(door)
  frame.add(hinge)
  group.add(frame)
  return { hinge, progress: 0, opening: false }
}

const BUILDERS = {
  gatehouse: buildGatehouse,
  courtyard: buildCourtyard,
  'north-wing': zone => buildWing(zone, -1),
  'south-wing': zone => buildWing(zone, 1),
  'great-hall': buildGreatHall,
  'upper-floor': buildUpperFloor,
  atrium: buildAtrium,
  'floor-3': zone => buildHighFloor(zone, 10),
  'floor-4': zone => buildHighFloor(zone, 15),
  roof: buildRoof,
}

function createOutdoorFacade(outdoorScene) {
  const group = new THREE.Group()
  group.position.set(CASTLE_EXTERIOR.origin.x, CASTLE_EXTERIOR.origin.y, CASTLE_EXTERIOR.origin.z)
  const fogGate = createFogGate(group)
  outdoorScene.add(group)
  snapObjectToGround(group, OUTDOOR_FACADE_GROUND_OFFSET)
  loadVisualModel(
    CASTLE_ENTRANCE.modelUrl,
    group,
    () => hideDirectGrayboxMeshes(group),
    { shadows: false, stabilizeFacade: true },
  )
  const colliders = [
    // Perimeter collision with a narrow doorway at the west fog gate.
    { x: CASTLE_EXTERIOR.origin.x - 55.7, z: CASTLE_EXTERIOR.origin.z - 43.7, hx: 0.9, hz: 36.3 },
    { x: CASTLE_EXTERIOR.origin.x - 55.7, z: CASTLE_EXTERIOR.origin.z + 10.7, hx: 0.9, hz: 13.3 },
    { x: CASTLE_EXTERIOR.origin.x + 56, z: CASTLE_EXTERIOR.origin.z - 28, hx: 2.0, hz: 52 },
    { x: CASTLE_EXTERIOR.origin.x, z: CASTLE_EXTERIOR.origin.z - 80, hx: 56, hz: 2.0 },
    { x: CASTLE_EXTERIOR.origin.x, z: CASTLE_EXTERIOR.origin.z + 24, hx: 56, hz: 2.0 },
  ]
  return {
    group,
    fogGate,
    colliders,
    setColliders(nextColliders) {
      syncColliderObjects(colliders, nextColliders)
    },
  }
}

export function createCastleWorld(outdoorScene) {
  const lighting = CASTLE_INDOOR_LIGHTING
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(lighting.background)
  scene.fog = new THREE.Fog(lighting.fog.color, lighting.fog.near, lighting.fog.far)
  scene.add(new THREE.HemisphereLight(
    lighting.hemisphere.skyColor,
    lighting.hemisphere.groundColor,
    lighting.hemisphere.intensity,
  ))
  scene.add(new THREE.AmbientLight(lighting.ambient.color, lighting.ambient.intensity))
  const key = new THREE.DirectionalLight(lighting.key.color, lighting.key.intensity)
  key.position.set(-18, 28, 12)
  key.castShadow = true
  key.shadow.mapSize.set(1024, 1024)
  key.shadow.camera.left = -36
  key.shadow.camera.right = 36
  key.shadow.camera.top = 36
  key.shadow.camera.bottom = -36
  key.shadow.camera.near = 1
  key.shadow.camera.far = 90
  key.shadow.bias = -0.0005
  key.shadow.normalBias = 0.035
  scene.add(key)

  const fill = new THREE.DirectionalLight(lighting.fill.color, lighting.fill.intensity)
  fill.position.set(16, 10, -24)
  scene.add(fill)

  const exterior = createOutdoorFacade(outdoorScene)
  let zoneDefs = CASTLE_ZONES
  let zoneById = new Map(zoneDefs.map(zone => [zone.id, zone]))
  const loaded = new Map()
  const collision = new CollisionSystem([], 60, 90)
  let currentZoneId = 'gatehouse'
  let torchTime = 0
  let outdoorTime = 0
  let shadowTorch = null
  let exitRequested = false
  let manifest = null
  let interiorExit = { x: CASTLE_INTERIOR_EXIT.x, z: CASTLE_INTERIOR_EXIT.z, range: CASTLE_INTERIOR_EXIT.range }
  let roofExit = { x: 0, y: 21, z: 21.5, range: 3.0 }
  const elevator = createElevator()

  function getBottomElevatorIndex() {
    return 0
  }

  function getRoofElevatorIndex() {
    return elevator.stops.length - 1
  }

  function getElevatorStopY(index) {
    return elevator.stops[index] + ELEVATOR_PLATFORM_OFFSET_Y
  }

  function isElevatorIdle() {
    return elevator.targetIndex === elevator.stopIndex
      && Math.abs(elevator.y - getElevatorStopY(elevator.stopIndex)) <= 0.05
  }

  function isElevatorAtIndex(index) {
    return isElevatorIdle() && elevator.stopIndex === index
  }

  function setElevatorTarget(index) {
    elevator.targetIndex = Math.max(0, Math.min(getRoofElevatorIndex(), index))
    elevator.wait = 0
    return elevator.targetIndex
  }

  function syncElevatorToStop(index) {
    const clampedIndex = Math.max(0, Math.min(getRoofElevatorIndex(), index))
    elevator.stopIndex = clampedIndex
    elevator.targetIndex = clampedIndex
    elevator.y = getElevatorStopY(clampedIndex)
    elevator.prevY = elevator.y
    elevator.collider.h = elevator.y
    elevator.group.position.y = elevator.y
  }

  function createElevator() {
    const group = new THREE.Group()
    group.name = 'castle-elevator'
    const platform = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.35, 5.2), ELEVATOR_STONE)
    platform.castShadow = true
    platform.receiveShadow = true
    group.add(platform)

    const pressureButton = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.72, 0.18, 18), ELEVATOR_BUTTON)
    pressureButton.name = 'castle-elevator-pressure-button'
    pressureButton.position.y = 0.27
    pressureButton.castShadow = true
    pressureButton.receiveShadow = true
    group.add(pressureButton)
    scene.add(group)

    const initialY = ELEVATOR_ROOF_STOP_Y + ELEVATOR_PLATFORM_OFFSET_Y
    group.position.y = initialY
    const collider = { name: 'COL_DYNAMIC_ELEVATOR_PLATFORM', x: 0, z: -32, hx: 2.6, hz: 2.6, h: initialY, surface: true }
    return {
      group,
      collider,
      stops: [0, 5, 10, 15, ELEVATOR_ROOF_STOP_Y],
      stopIndex: 4,
      targetIndex: 4,
      y: initialY,
      prevY: initialY,
      speed: 2.4,
      wait: 0,
      occupied: false,
      floorSwitchUnlocked: false,
      pressureButton,
      levers: [
        { x: 4.2, y: 1.0, z: -25.8, floorIndex: 0, role: 'floor-call' },
        { x: 4.2, y: 21.0, z: -25.8, floorIndex: -1, role: 'roof-call' },
      ],
    }
  }

  function loadZone(id) {
    if (loaded.has(id)) return
    const zone = zoneById.get(id) ?? FALLBACK_ZONE_BY_ID.get(id)
    const builder = BUILDERS[id]
    if (!zone || !builder) return
    const built = builder(zone)
    built.group.name = `castle-zone:${id}`
    scene.add(built.group)
    loaded.set(id, built)
    loadVisualModel(zone.modelUrl, built.group, model => {
      hideDirectGrayboxMeshes(built.group)
      applyTorchSockets(model, built.group, built.torches)
      applyManifestZone(id)
    })
    applyManifestZone(id)
  }

  function applyManifestZone(id) {
    const built = loaded.get(id)
    const zoneManifest = manifest?.zones?.[id]
    if (!built || !zoneManifest) return
    if (Array.isArray(zoneManifest.colliders)) {
      built.colliders = zoneManifest.colliders.map(collider => ({ ...collider }))
      if (built.exitDoor) {
        built.exitDoor.blocker = built.colliders.find(collider => collider.name === 'COL_BOX_HALL_EXIT_DOOR') ?? built.exitDoor.blocker
      }
      rebuildCollision()
    }
    applyManifestTorchSockets(zoneManifest.sockets, built.torches)
    const exitSocket = zoneManifest.sockets?.SOCKET_EXIT
    if (exitSocket) {
      interiorExit = { x: exitSocket.x, z: exitSocket.z, range: CASTLE_INTERIOR_EXIT.range }
    }
  }

  function applyManifest(nextManifest) {
    if (!nextManifest) return
    manifest = nextManifest
    zoneDefs = mergeManifestZoneDefs(manifest)
    zoneById = new Map(zoneDefs.map(zone => [zone.id, zone]))
    syncLoadedZones()
    const elevatorPlatform = manifest.elevator?.platform
    if (elevatorPlatform) {
      elevator.collider.x = elevatorPlatform.x ?? elevator.collider.x
      elevator.collider.z = elevatorPlatform.z ?? elevator.collider.z
      elevator.group.position.x = elevator.collider.x
      elevator.group.position.z = elevator.collider.z
    }
    const elevatorStops = manifest.elevator?.stops
      ?.map(stop => stop.y)
      ?.filter(value => Number.isFinite(value))
      ?.sort((a, b) => a - b)
    if (elevatorStops?.length) {
      elevator.stops = [...new Set([...elevatorStops, ELEVATOR_ROOF_STOP_Y])].sort((a, b) => a - b)
      syncElevatorToStop(getRoofElevatorIndex())
    }
    const elevatorLevers = manifest.elevator?.levers
      ?.filter(lever => Number.isFinite(lever.x) && Number.isFinite(lever.y) && Number.isFinite(lever.z))
      ?.filter(lever => lever.y < 2 || lever.y >= ELEVATOR_ROOF_STOP_Y)
      ?.sort((a, b) => a.y - b.y)
    if (elevatorLevers?.length) {
      elevator.levers = elevatorLevers.map(lever => ({
        x: lever.x,
        y: lever.y,
        z: lever.z,
        floorIndex: lever.y >= ELEVATOR_ROOF_STOP_Y ? -1 : 0,
        role: lever.role ?? (lever.y >= ELEVATOR_ROOF_STOP_Y ? 'roof-call' : 'floor-call'),
      }))
    }
    if (manifest.roofExit) {
      roofExit = {
        x: manifest.roofExit.x ?? roofExit.x,
        y: manifest.roofExit.y ?? roofExit.y,
        z: manifest.roofExit.z ?? roofExit.z,
        range: roofExit.range,
      }
    }
    const fogSocket = manifest.exterior?.sockets?.SOCKET_FOG_GATE
    if (fogSocket) exterior.fogGate.setPosition(fogSocket)
    const exteriorColliders = manifest.exterior?.colliders
      ?.filter(collider => Number.isFinite(collider.x) && Number.isFinite(collider.z))
      ?.map(exteriorColliderToWorld)
    if (exteriorColliders?.length) {
      exterior.setColliders(exteriorColliders)
    }
    loaded.forEach((_, id) => applyManifestZone(id))
    rebuildCollision()
  }

  function rebuildCollision() {
    collision.collidables.length = 0
    loaded.forEach(built => collision.collidables.push(...built.colliders))
    collision.collidables.push(elevator.collider)
  }

  function isOnElevator(playerPosition) {
    const dx = playerPosition.x - elevator.collider.x
    const dz = playerPosition.z - elevator.collider.z
    return Math.abs(dx) <= elevator.collider.hx - 0.15
      && Math.abs(dz) <= elevator.collider.hz - 0.15
      && Math.abs(playerPosition.y - elevator.collider.h) <= 0.75
  }

  function summonElevator(floorIndex, playerPosition) {
    return setElevatorTarget(floorIndex)
  }

  function getNextElevatorIndex() {
    const bottomIndex = getBottomElevatorIndex()
    const roofIndex = getRoofElevatorIndex()
    return elevator.stopIndex >= roofIndex ? bottomIndex : roofIndex
  }

  function triggerElevatorPressureButton() {
    const nextIndex = getNextElevatorIndex()
    if (nextIndex === elevator.stopIndex) return elevator.stopIndex
    return setElevatorTarget(nextIndex)
  }

  function updateElevator(dt, playerPosition) {
    elevator.prevY = elevator.y
    const onPlatform = isOnElevator(playerPosition)
    if (elevator.wait > 0) elevator.wait = Math.max(0, elevator.wait - dt)

    const idle = isElevatorIdle()
    const steppedOnPressureButton = onPlatform && !elevator.occupied && idle
    if (steppedOnPressureButton && elevator.wait <= 0) {
      triggerElevatorPressureButton()
    }
    if (!steppedOnPressureButton || elevator.wait <= 0) elevator.occupied = onPlatform
    if (elevator.pressureButton) {
      elevator.pressureButton.position.y = onPlatform ? 0.2 : 0.27
    }

    const targetY = getElevatorStopY(elevator.targetIndex)
    const deltaToTarget = targetY - elevator.y
    if (Math.abs(deltaToTarget) > 0.001) {
      const step = Math.sign(deltaToTarget) * Math.min(Math.abs(deltaToTarget), elevator.speed * dt)
      elevator.y += step
      if (Math.abs(targetY - elevator.y) <= 0.001) {
        elevator.y = targetY
        elevator.stopIndex = elevator.targetIndex
        if (elevator.stopIndex === getBottomElevatorIndex()) elevator.floorSwitchUnlocked = true
        elevator.wait = 0.8
      }
    }

    elevator.group.position.y = elevator.y
    elevator.collider.h = elevator.y
    return onPlatform ? elevator.y - elevator.prevY : 0
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
        torch.light.intensity = 24 + flicker * 6
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
        if (distSq < nearestDistSq && distSq < 9 * 9) {
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
    zoneDefs.forEach(zone => loadZone(zone.id))
    rebuildCollision()
  }

  function findZone(position) {
    for (const zone of zoneDefs) {
      const b = zone.bounds
      if (position.x >= b.minX && position.x <= b.maxX && position.z >= b.minZ && position.z <= b.maxZ
        && position.y >= (zone.minY ?? -Infinity) && position.y <= (zone.maxY ?? Infinity)) {
        return zone.id
      }
    }
    return currentZoneId
  }

  function updateExitDoor(dt) {
    const door = loaded.get('great-hall')?.exitDoor
    if (!door || !door.opening) return
    door.progress = Math.min(1, door.progress + dt / 0.45)
    door.hinge.rotation.y = -door.progress * Math.PI * 0.52
    if (door.progress >= 1) exitRequested = true
  }

  function getNearbyAction(playerPosition) {
    let nearestLever = null
    let nearestDistSq = ELEVATOR_ACTION_RANGE * ELEVATOR_ACTION_RANGE
    for (const lever of elevator.levers) {
      const dx = playerPosition.x - lever.x
      const dy = playerPosition.y - lever.y
      const dz = playerPosition.z - lever.z
      const distSq = dx * dx + dy * dy + dz * dz
      if (distSq < nearestDistSq) {
        nearestDistSq = distSq
        nearestLever = lever
      }
    }
    if (nearestLever) {
      const bottomIndex = getBottomElevatorIndex()
      const roofIndex = getRoofElevatorIndex()
      const isRoofLever = nearestLever.role === 'roof-call'
      let label = '电梯运行中'
      let execute = null
      if (isElevatorIdle()) {
        if (isRoofLever) {
          if (isElevatorAtIndex(roofIndex)) {
            label = '电梯已在屋顶'
          } else if (isElevatorAtIndex(bottomIndex)) {
            label = '召回电梯'
            execute = () => summonElevator(roofIndex, playerPosition)
          } else {
            label = '电梯不可用'
          }
        } else if (isElevatorAtIndex(bottomIndex)) {
          label = '启动电梯上行'
          execute = () => summonElevator(roofIndex, playerPosition)
        } else if (elevator.floorSwitchUnlocked) {
          label = '呼叫电梯'
          execute = () => summonElevator(bottomIndex, playerPosition)
        } else {
          label = '电梯不可用'
        }
      }
      return {
        type: 'elevator-lever',
        label,
        position: new THREE.Vector3(nearestLever.x, nearestLever.y, nearestLever.z),
        execute,
      }
    }

    const roofDx = playerPosition.x - roofExit.x
    const roofDy = playerPosition.y - roofExit.y
    const roofDz = playerPosition.z - roofExit.z
    if (roofDx * roofDx + roofDy * roofDy + roofDz * roofDz < roofExit.range ** 2) {
      return {
        type: 'roof-exit',
        label: '从屋顶离开城堡',
        position: new THREE.Vector3(roofExit.x, roofExit.y, roofExit.z),
        execute: null,
      }
    }
    return null
  }

  syncLoadedZones()
  loadCastleManifest().then(applyManifest)

  return {
    scene,
    collision,
    entrance: new THREE.Vector3(CASTLE_ENTRANCE.x, CASTLE_ENTRANCE.y, CASTLE_ENTRANCE.z),
    entranceRange: CASTLE_ENTRANCE.range,
    exitSpawn: new THREE.Vector3(CASTLE_EXTERIOR.exitSpawn.x, CASTLE_EXTERIOR.exitSpawn.y, CASTLE_EXTERIOR.exitSpawn.z),
    outdoorColliders: exterior.colliders,
    spawn: new THREE.Vector3(0, 0, 13),

    setExteriorVisible(visible) {
      exterior.group.visible = visible
    },

    update(dt, playerPosition) {
      const nextZone = findZone(playerPosition)
      if (nextZone !== currentZoneId) {
        currentZoneId = nextZone
      }
      const elevatorDeltaY = updateElevator(dt, playerPosition)
      updateTorches(dt, playerPosition)
      updateExitDoor(dt)
      return { elevatorDeltaY }
    },

    updateOutdoor(dt) {
      outdoorTime += dt
      exterior.fogGate.update(outdoorTime)
    },

    isNearExit(playerPosition) {
      const dx = playerPosition.x - interiorExit.x
      const dz = playerPosition.z - interiorExit.z
      return playerPosition.y < 2.5 && dx * dx + dz * dz < interiorExit.range ** 2
    },

    getNearbyAction,

    openExitDoor() {
      const door = loaded.get('great-hall')?.exitDoor
      if (!door || door.opening) return
      door.opening = true
      const blockerIndex = collision.collidables.indexOf(door.blocker)
      if (blockerIndex >= 0) collision.collidables.splice(blockerIndex, 1)
    },

    consumeExitRequest() {
      if (!exitRequested) return false
      exitRequested = false
      return true
    },

    resetExitDoor() {
      const door = loaded.get('great-hall')?.exitDoor
      if (!door) return
      door.opening = false
      door.progress = 0
      door.hinge.rotation.y = 0
      rebuildCollision()
    },

    getCurrentZoneId() {
      return currentZoneId
    },

    getLoadedZoneIds() {
      return Array.from(loaded.keys())
    },

    isTerraceViewActive(playerPosition, viewDirection) {
      const inAtriumVoid = Math.abs(playerPosition.x) < 14 && playerPosition.z > -48 && playerPosition.z < -10
      if (inAtriumVoid && viewDirection?.y > 0.05) return true
      if (playerPosition.y >= 19.5) return true
      const nearNorthWindow = playerPosition.z < -70 && viewDirection?.z < -0.2
      const nearSouthWindow = playerPosition.z > 12 && viewDirection?.z > 0.2
      const nearWestWindow = playerPosition.x < -44 && viewDirection?.x < -0.2
      const nearEastWindow = playerPosition.x > 44 && viewDirection?.x > 0.2
      if (playerPosition.y > 4.5 && (nearNorthWindow || nearSouthWindow || nearWestWindow || nearEastWindow)) return true
      if (playerPosition.z > 14 && Math.abs(playerPosition.x) < 30) return true
      if (playerPosition.y <= 4.4 || Math.abs(playerPosition.x) >= 29) return false
      if (playerPosition.z > 2) return true
      return playerPosition.z > -7 && viewDirection?.z > 0.05
    },

    isTerraceFallExit(playerPosition) {
      return playerPosition.z > 15 && Math.abs(playerPosition.x) < 30 && playerPosition.y <= 0.05
    },
  }
}
