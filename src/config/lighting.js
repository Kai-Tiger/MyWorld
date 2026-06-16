export const OUTDOOR_LIGHTING = {
  exposure: {
    initial: 1.35,
    day: 1.35,
    night: 1.24,
  },
  sun: {
    color: 0xfff3d8,
    dayIntensity: 3.0,
    nightIntensity: 1.25,
  },
  moon: {
    color: 0xd4e2ff,
    dayIntensity: 0.22,
    nightIntensity: 0.95,
  },
  hemisphere: {
    skyColor: 0xb8ddff,
    groundColor: 0x687a50,
    dayIntensity: 0.95,
    nightIntensity: 0.68,
  },
  fill: {
    color: 0xc2d6ff,
    dayIntensity: 0.68,
    nightIntensity: 0.42,
  },
}

export const HOUSE_INDOOR_LIGHTING = {
  background: 0xfff0e0,
  ambient: {
    color: 0xfff5e0,
    intensity: 1.0,
  },
  ceiling: {
    color: 0xffddaa,
    intensity: 2.5,
    distance: 18,
  },
  fill: {
    color: 0xffeedd,
    intensity: 0.4,
  },
}

export const CASTLE_INDOOR_LIGHTING = {
  exposure: 1.42,
  background: 0x181b20,
  fog: {
    color: 0x181b20,
    near: 42,
    far: 110,
  },
  hemisphere: {
    skyColor: 0xaab8cc,
    groundColor: 0x4a4036,
    intensity: 0.92,
  },
  ambient: {
    color: 0x8c9eb5,
    intensity: 0.48,
  },
  key: {
    color: 0xdce8ff,
    intensity: 0.88,
  },
  fill: {
    color: 0xffe4be,
    intensity: 0.36,
  },
}
