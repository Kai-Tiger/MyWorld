const AUDIO_SOURCES = {
  walking: '/audio/walking.mp3',
  running: '/audio/running.mp3',
  sword: '/audio/sword.mp3',
  swordAir: '/audio/swordAir.mp3',
  hammerAir: '/audio/hammerAir.mp3',
  hammerHit: '/audio/hammerHit.mp3',
  shieldHit: '/audio/shieldHit.mp3',
  punch: '/audio/punch.mp3',
  fireMagic: '/audio/fireMagic.mp3',
  heal: '/audio/heal.mp3',
  death: '/audio/death.mp3',
  enemy: '/audio/enemy.mp3',
}

const SFX_COOLDOWNS = {
  sword: 0.08,
  swordAir: 0.08,
  hammerAir: 0.08,
  hammerHit: 0.08,
  shieldHit: 0.12,
  fireMagic: 0.15,
}

const buffers = new Map()
const loops = new Map()
const lastPlayedAt = new Map()
let unlocked = false

function getLoopKey(id, options = {}) {
  return options.key ?? id
}

function makeAudio(id) {
  const src = AUDIO_SOURCES[id]
  if (!src) return null
  const audio = new Audio(src)
  audio.preload = 'auto'
  return audio
}

export function preloadAudio() {
  Object.keys(AUDIO_SOURCES).forEach(id => {
    if (buffers.has(id)) return
    const audio = makeAudio(id)
    if (!audio) return
    audio.load()
    buffers.set(id, audio)
  })
}

export function unlockAudio() {
  if (unlocked) return
  unlocked = true
  preloadAudio()
}

export function warmupSfx(id) {
  if (!unlocked) return false
  const template = buffers.get(id) ?? makeAudio(id)
  if (!template) return false
  if (!buffers.has(id)) buffers.set(id, template)
  const audio = template.cloneNode()
  audio.volume = 0
  audio.muted = true
  const played = audio.play()
  if (played?.then) {
    played.then(() => {
      audio.pause()
      audio.currentTime = 0
    }).catch(() => {})
  }
  return true
}

export function playSfx(id, options = {}) {
  const template = buffers.get(id) ?? makeAudio(id)
  if (!template) return false
  if (!buffers.has(id)) buffers.set(id, template)

  const now = performance.now() / 1000
  const cooldown = SFX_COOLDOWNS[id] ?? 0
  if (cooldown > 0 && now - (lastPlayedAt.get(id) ?? -Infinity) < cooldown) return false
  lastPlayedAt.set(id, now)

  const audio = template.cloneNode()
  audio.volume = options.volume ?? 1
  audio.playbackRate = options.playbackRate ?? 1
  if (options.startAt) {
    try {
      audio.currentTime = Math.max(0, options.startAt)
    } catch {}
  }
  audio.play().catch(() => {})
  return true
}

export function startLoop(id, options = {}) {
  const key = getLoopKey(id, options)
  const existing = loops.get(key)
  const volume = options.volume ?? 1
  if (existing) {
    existing.volume = volume
    if (existing.paused) existing.play().catch(() => {})
    return true
  }

  const template = buffers.get(id) ?? makeAudio(id)
  if (!template) return false
  if (!buffers.has(id)) buffers.set(id, template)

  const audio = template.cloneNode()
  audio.loop = true
  audio.volume = volume
  audio.playbackRate = options.playbackRate ?? 1
  loops.set(key, audio)
  audio.play().catch(() => {})
  return true
}

export function setLoopVolume(id, options = {}) {
  const audio = loops.get(getLoopKey(id, options))
  if (!audio) return false
  audio.volume = options.volume ?? audio.volume
  return true
}

export function stopLoop(id, options = {}) {
  const key = getLoopKey(id, options)
  const audio = loops.get(key)
  if (!audio) return
  audio.pause()
  audio.currentTime = 0
  loops.delete(key)
}

export function stopAllLoops() {
  for (const key of Array.from(loops.keys())) stopLoop(key)
}
