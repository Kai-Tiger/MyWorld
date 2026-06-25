function readFlag(name) {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  const value = params.get(name)
  if (value != null) return value !== '0' && value !== 'false'
  return window.localStorage?.getItem(name) === '1'
}

function readNumber(name, fallback) {
  if (typeof window === 'undefined') return fallback
  const params = new URLSearchParams(window.location.search)
  const raw = params.get(name) ?? window.localStorage?.getItem(name)
  if (raw == null || raw === '') return fallback
  const value = Number(raw)
  return Number.isFinite(value) ? value : fallback
}

function createBucket() {
  return { count: 0, total: 0, max: 0 }
}

function addSample(map, name, ms) {
  let bucket = map.get(name)
  if (!bucket) {
    bucket = createBucket()
    map.set(name, bucket)
  }
  bucket.count++
  bucket.total += ms
  bucket.max = Math.max(bucket.max, ms)
}

function formatBucket([name, bucket]) {
  const avg = bucket.total / Math.max(1, bucket.count)
  return `${name} avg=${avg.toFixed(2)}ms max=${bucket.max.toFixed(2)}ms n=${bucket.count}`
}

export function createPerfMonitor({
  renderer = null,
  intervalMs = 3000,
  getContext = () => ({}),
} = {}) {
  let enabled = readFlag('perf')
  let frameStart = 0
  let reportAt = 0
  let frames = createBucket()
  let slowFrames = 0
  let sections = new Map()
  let frameSections = new Map()
  let frameMarks = []
  let lastSummary = null
  let previousAutoReset = null
  let spikeThresholdMs = readNumber('perfSpike', 33)

  function setRendererInfoCapture(active) {
    if (!renderer?.info) return
    if (active) {
      if (previousAutoReset == null) previousAutoReset = renderer.info.autoReset
      renderer.info.autoReset = false
      return
    }
    if (previousAutoReset != null) {
      renderer.info.autoReset = previousAutoReset
      previousAutoReset = null
    }
  }

  function resetWindow(now = performance.now()) {
    frames = createBucket()
    slowFrames = 0
    sections = new Map()
    reportAt = now + intervalMs
  }

  function summarize(now = performance.now()) {
    const topSections = [...sections.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 12)
      .map(formatBucket)
    const renderInfo = renderer?.info?.render ?? {}
    const context = getContext?.() ?? {}
    const avgFrame = frames.total / Math.max(1, frames.count)
    lastSummary = {
      frames: frames.count,
      avgFrameMs: avgFrame,
      maxFrameMs: frames.max,
      slowFrames,
      sections: topSections,
      render: {
        calls: renderInfo.calls ?? 0,
        triangles: renderInfo.triangles ?? 0,
        points: renderInfo.points ?? 0,
        lines: renderInfo.lines ?? 0,
      },
      context,
    }
    return lastSummary
  }

  function logSummary(now = performance.now()) {
    const summary = summarize(now)
    console.info(
      `[perf] frames=${summary.frames} avg=${summary.avgFrameMs.toFixed(2)}ms `
      + `max=${summary.maxFrameMs.toFixed(2)}ms slow=${summary.slowFrames} `
      + `calls=${summary.render.calls} tris=${summary.render.triangles} `
      + `scene=${summary.context.scene ?? '-'} pixelRatio=${summary.context.pixelRatio ?? '-'}`,
    )
    if (summary.sections.length) console.info(`[perf] top ${summary.sections.join(' | ')}`)
  }

  function formatFrameMark(mark) {
    const entries = Object.entries(mark.data ?? {})
      .map(([key, value]) => `${key}=${typeof value === 'number' ? value.toFixed ? Number(value.toFixed(2)) : value : value}`)
      .join(',')
    return entries ? `${mark.name}{${entries}}` : mark.name
  }

  function logSpike(ms) {
    const topSections = [...frameSections.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 12)
      .map(formatBucket)
    const renderInfo = renderer?.info?.render ?? {}
    const context = getContext?.() ?? {}
    const contextText = Object.entries(context)
      .map(([key, value]) => `${key}=${value}`)
      .join(' ')
    const markText = frameMarks.length ? ` marks=${frameMarks.map(formatFrameMark).join(' | ')}` : ''
    console.info(
      `[perf-spike] frame=${ms.toFixed(2)}ms threshold=${spikeThresholdMs.toFixed(1)}ms `
      + `calls=${renderInfo.calls ?? 0} tris=${renderInfo.triangles ?? 0} ${contextText}`,
    )
    if (topSections.length) console.info(`[perf-spike] sections ${topSections.join(' | ')}`)
    if (markText) console.info(`[perf-spike]${markText}`)
  }

  const api = {
    get enabled() { return enabled },
    setEnabled(next) {
      enabled = Boolean(next)
      setRendererInfoCapture(enabled)
      if (enabled) resetWindow()
      return enabled
    },
    start() { return api.setEnabled(true) },
    stop() { return api.setEnabled(false) },
    reset() { resetWindow(); return true },
    getSummary() { return lastSummary ?? summarize() },
    beginFrame() {
      if (!enabled) return
      const now = performance.now()
      if (!reportAt) resetWindow(now)
      renderer?.info?.reset?.()
      frameSections = new Map()
      frameMarks = []
      frameStart = now
    },
    endFrame() {
      if (!enabled || !frameStart) return
      const now = performance.now()
      const ms = now - frameStart
      frameStart = 0
      frames.count++
      frames.total += ms
      frames.max = Math.max(frames.max, ms)
      if (ms > 16.7) slowFrames++
      if (ms >= spikeThresholdMs) logSpike(ms)
      if (now >= reportAt) {
        logSummary(now)
        resetWindow(now)
      }
    },
    time(name, fn) {
      if (!enabled) return fn()
      const start = performance.now()
      try {
        return fn()
      } finally {
        const ms = performance.now() - start
        addSample(sections, name, ms)
        addSample(frameSections, name, ms)
      }
    },
    mark(name, data = {}) {
      if (!enabled) return
      frameMarks.push({ name, data })
    },
  }

  if (enabled) {
    setRendererInfoCapture(true)
    resetWindow()
  }
  return api
}
