export const CASTLE_ENTRANCE = {
  x: 68,
  y: 0,
  z: 0,
  range: 4.5,
  modelUrl: '/castle/exterior/gatehouse.glb',
}

export const CASTLE_ZONES = [
  {
    id: 'gatehouse',
    name: '城门',
    modelUrl: '/castle/zones/gatehouse.glb',
    bounds: { minX: -7, maxX: 7, minZ: 0, maxZ: 16 },
    neighbors: ['courtyard'],
  },
  {
    id: 'courtyard',
    name: '下层庭院',
    bounds: { minX: -14, maxX: 14, minZ: -24, maxZ: 0 },
    neighbors: ['gatehouse', 'great-hall'],
  },
  {
    id: 'great-hall',
    name: '主厅',
    modelUrl: '/castle/zones/great-hall.glb',
    bounds: { minX: -10, maxX: 10, minZ: -44, maxZ: -24 },
    neighbors: ['courtyard', 'tower'],
  },
  {
    id: 'tower',
    name: '守望塔',
    bounds: { minX: 10, maxX: 28, minZ: -44, maxZ: -26 },
    neighbors: ['great-hall'],
  },
]
