export const OUTDOOR_LIGHTING = {
  exposure: {
    initial: 1.22,
    day: 1.22,
    night: 1.18,
  },
  sun: {
    color: 0xfff3d8,
    dayIntensity: 2.7,
    nightIntensity: 1.375,
  },
  moon: {
    color: 0xd4e2ff,
    dayIntensity: 0.242,
    nightIntensity: 1.485,
  },
  hemisphere: {
    skyColor: 0xb7c8d6,
    groundColor: 0x5f684f,
    dayIntensity: 0.88,
    nightIntensity: 1.19669,
  },
  fill: {
    color: 0xbdc9d8,
    dayIntensity: 0.42,
    nightIntensity: 0.80707,
  },
}

export const HOUSE_INDOOR_LIGHTING = {
  background: 0xfff0e0,
  ambient: {
    color: 0xfff5e0,
    intensity: 1.1,
  },
  ceiling: {
    color: 0xffddaa,
    intensity: 2.75,
    distance: 18,
  },
  fill: {
    color: 0xffeedd,
    intensity: 0.44,
  },
}

export const CASTLE_INDOOR_LIGHTING = {
  exposure: 1.562,
  background: 0x181b20,
  fog: {
    color: 0x181b20,
    near: 42,
    far: 110,
  },
  hemisphere: {
    skyColor: 0xaab8cc,
    groundColor: 0x4a4036,
    intensity: 1.012,
  },
  ambient: {
    color: 0x8c9eb5,
    intensity: 0.528,
  },
  key: {
    color: 0xdce8ff,
    intensity: 0.968,
  },
  fill: {
    color: 0xffe4be,
    intensity: 0.396,
  },
}
