const CASTLE_ASSET_VERSION = 'v=16'
const castleAsset = (path) => `${path}?${CASTLE_ASSET_VERSION}`

const CASTLE_EXTERIOR_ORIGIN = { x: 124, y: 0, z: 0 }
const CASTLE_FOG_DOOR = { x: -61.58, y: 2.3, z: -5 }

export const CASTLE_ENTRANCE = {
  x: CASTLE_EXTERIOR_ORIGIN.x + CASTLE_FOG_DOOR.x,
  y: 0,
  z: CASTLE_EXTERIOR_ORIGIN.z + CASTLE_FOG_DOOR.z,
  range: 4.0,
  modelUrl: castleAsset('/castle/exterior/gatehouse.glb'),
}

export const CASTLE_EXTERIOR = {
  origin: CASTLE_EXTERIOR_ORIGIN,
  fogDoor: CASTLE_FOG_DOOR,
  closedDoor: { x: -56.45, y: 1.8, z: 5 },
  exitSpawn: { x: CASTLE_EXTERIOR_ORIGIN.x - 59.4, y: 0, z: CASTLE_EXTERIOR_ORIGIN.z - 5 },
  transitionTarget: { x: CASTLE_EXTERIOR_ORIGIN.x - 54.8, z: CASTLE_EXTERIOR_ORIGIN.z - 5 },
}

export const CASTLE_ENTRY_TRANSITION = {
  fadeOutStart: 0.5,
  switchAt: 1.1,
  fadeInEnd: 1.8,
  completeAt: 2.4,
  indoorSpawn: { x: 0, y: 0, z: 3 },
  indoorWalkTarget: { x: 0, y: 0, z: -2.5 },
  indoorYaw: 0,
}

export const CASTLE_INTERIOR_EXIT = {
  x: 0,
  z: -42.8,
  range: 3.2,
}

export const CASTLE_ZONES = [
  {
    id: 'gatehouse',
    name: '城门',
    modelUrl: castleAsset('/castle/zones/gatehouse.glb'),
    bounds: { minX: -7, maxX: 7, minZ: 0, maxZ: 16 },
    minY: -1,
    maxY: 4.5,
    neighbors: ['courtyard', 'north-wing', 'south-wing'],
  },
  {
    id: 'courtyard',
    name: '下层庭院与中庭前厅',
    modelUrl: castleAsset('/castle/zones/courtyard.glb'),
    bounds: { minX: -42, maxX: 42, minZ: -48, maxZ: 16 },
    minY: -1,
    maxY: 4.5,
    neighbors: ['gatehouse', 'north-wing', 'south-wing', 'great-hall', 'atrium'],
  },
  {
    id: 'atrium',
    name: '中央中庭',
    modelUrl: castleAsset('/castle/zones/atrium.glb'),
    bounds: { minX: -50, maxX: 50, minZ: -80, maxZ: 24 },
    minY: -1,
    maxY: 20.5,
    neighbors: ['courtyard', 'north-wing', 'south-wing', 'great-hall', 'upper-floor', 'floor-3', 'floor-4'],
  },
  {
    id: 'north-wing',
    name: '北翼兵器库',
    modelUrl: castleAsset('/castle/zones/north-wing.glb'),
    bounds: { minX: -50, maxX: -14, minZ: -78, maxZ: 20 },
    minY: -1,
    maxY: 5.5,
    neighbors: ['gatehouse', 'courtyard', 'atrium', 'great-hall', 'upper-floor'],
  },
  {
    id: 'south-wing',
    name: '南翼礼拜堂',
    modelUrl: castleAsset('/castle/zones/south-wing.glb'),
    bounds: { minX: 14, maxX: 50, minZ: -78, maxZ: 20 },
    minY: -1,
    maxY: 5.5,
    neighbors: ['gatehouse', 'courtyard', 'atrium', 'great-hall', 'upper-floor'],
  },
  {
    id: 'great-hall',
    name: '主厅',
    modelUrl: castleAsset('/castle/zones/great-hall.glb'),
    bounds: { minX: -42, maxX: 42, minZ: -80, maxZ: -44 },
    minY: -1,
    maxY: 5.5,
    neighbors: ['courtyard', 'atrium', 'north-wing', 'south-wing', 'upper-floor'],
  },
  {
    id: 'upper-floor',
    name: '二楼大厅群',
    modelUrl: castleAsset('/castle/zones/upper-floor.glb'),
    bounds: { minX: -50, maxX: 50, minZ: -80, maxZ: 24 },
    minY: 4.5,
    maxY: 9.5,
    neighbors: ['atrium', 'north-wing', 'south-wing', 'great-hall', 'floor-3'],
  },
  {
    id: 'floor-3',
    name: '三楼回廊',
    modelUrl: castleAsset('/castle/zones/floor-3.glb'),
    bounds: { minX: -50, maxX: 50, minZ: -80, maxZ: 24 },
    minY: 9.5,
    maxY: 14.5,
    neighbors: ['atrium', 'upper-floor', 'floor-4'],
  },
  {
    id: 'floor-4',
    name: '四楼观景层',
    modelUrl: castleAsset('/castle/zones/floor-4.glb'),
    bounds: { minX: -50, maxX: 50, minZ: -80, maxZ: 24 },
    minY: 14.5,
    maxY: 20.5,
    neighbors: ['atrium', 'floor-3', 'roof'],
  },
  {
    id: 'roof',
    name: '屋顶垛口',
    modelUrl: castleAsset('/castle/zones/roof.glb'),
    bounds: { minX: -54, maxX: 54, minZ: -84, maxZ: 26 },
    minY: 19.5,
    maxY: 28,
    neighbors: ['floor-4'],
  },
]
