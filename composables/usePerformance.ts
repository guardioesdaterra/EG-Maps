import { ref, onMounted, onUnmounted } from 'vue'

export interface PerformanceMetrics {
  fps: number
  avgFps: number
  frameTime: number
  memoryUsage: number
  memoryLimit: number
  isMemoryPressure: boolean
  jankCount: number
  longTaskCount: number
  isThrottled: boolean
}

const SHARED_FPS = ref(60)
const SHARED_AVG_FPS = ref(60)
const SHARED_FRAME_TIME = ref(16.67)
const SHARED_MEMORY_USAGE = ref(0)
const SHARED_MEMORY_LIMIT = ref(0)
const SHARED_IS_MEMORY_PRESSURE = ref(false)
const SHARED_JANK_COUNT = ref(0)
const SHARED_LONG_TASK_COUNT = ref(0)
const SHARED_IS_THROTTLED = ref(false)

let initialized = false
let rafId: number | null = null
let lastTime = 0
let frameCount = 0
let fpsAccumulator = 0
let fpsSamples = 0
let longTaskObserver: PerformanceObserver | null = null
let visibilityHandler: (() => void) | null = null

const FPS_SAMPLE_INTERVAL_MS = 1000
const JANK_THRESHOLD_MS = 32 // Two frames at 60fps
const MEMORY_PRESSURE_RATIO = 0.85

function startTracking() {
  if (initialized) return
  initialized = true

  let lastFpsSample = performance.now()

  const tick = (now: number) => {
    rafId = requestAnimationFrame(tick)

    const delta = now - lastTime
    lastTime = now
    frameCount++

    // Track jank (frames > 32ms)
    if (delta > JANK_THRESHOLD_MS) {
      SHARED_JANK_COUNT.value++
    }

    // Sample FPS every second
    if (now - lastFpsSample >= FPS_SAMPLE_INTERVAL_MS) {
      const instantFps = Math.round((frameCount * 1000) / (now - lastFpsSample))
      SHARED_FPS.value = Math.min(instantFps, 120) // Cap at monitor refresh
      SHARED_FRAME_TIME.value = frameCount > 0 ? (now - lastFpsSample) / frameCount : 16.67

      fpsAccumulator += instantFps
      fpsSamples++
      SHARED_AVG_FPS.value = Math.round(fpsAccumulator / fpsSamples)

      frameCount = 0
      lastFpsSample = now

      // Detect throttling (e.g., background tab, low power mode)
      SHARED_IS_THROTTLED.value = SHARED_FPS.value < 20 && fpsSamples > 3
    }
  }

  rafId = requestAnimationFrame(tick)

  // Memory monitoring (Chrome-only API)
  const updateMemory = () => {
    const perf = performance as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }
    if (perf.memory) {
      const used = perf.memory.usedJSHeapSize
      const limit = perf.memory.jsHeapSizeLimit
      SHARED_MEMORY_USAGE.value = used
      SHARED_MEMORY_LIMIT.value = limit
      SHARED_IS_MEMORY_PRESSURE.value = limit > 0 && used / limit > MEMORY_PRESSURE_RATIO
    }
  }

  updateMemory()
  const memoryInterval = setInterval(updateMemory, 5000)

  // Long task detection
  try {
    longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          SHARED_LONG_TASK_COUNT.value++
        }
      }
    })
    longTaskObserver.observe({ type: 'longtask', buffered: true } as PerformanceObserverInit)
  } catch {
    // Longtask API not supported
  }

  // Pause tracking when tab is hidden
  visibilityHandler = () => {
    if (document.hidden) {
      if (rafId != null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
    } else {
      lastTime = performance.now()
      lastFpsSample = performance.now()
      frameCount = 0
      if (rafId == null) {
        rafId = requestAnimationFrame(tick)
      }
    }
  }
  document.addEventListener('visibilitychange', visibilityHandler)

  // Store cleanup ref
  ;(window as unknown as { __egPerfCleanup?: () => void }).__egPerfCleanup = () => {
    if (rafId != null) cancelAnimationFrame(rafId)
    longTaskObserver?.disconnect()
    document.removeEventListener('visibilitychange', visibilityHandler!)
    clearInterval(memoryInterval)
  }
}

function stopTracking() {
  const w = window as unknown as { __egPerfCleanup?: () => void }
  if (w.__egPerfCleanup) {
    w.__egPerfCleanup()
    delete w.__egPerfCleanup
  }
  initialized = false
}

/**
 * Real-time performance monitoring — FPS, memory, jank detection.
 * Singleton: first call starts tracking, subsequent calls share reactive state.
 */
export function usePerformance() {
  onMounted(() => {
    startTracking()
  })

  onUnmounted(() => {
    // Don't stop on individual component unmount — keep running for the app lifetime
  })

  return {
    fps: SHARED_FPS,
    avgFps: SHARED_AVG_FPS,
    frameTime: SHARED_FRAME_TIME,
    memoryUsage: SHARED_MEMORY_USAGE,
    memoryLimit: SHARED_MEMORY_LIMIT,
    isMemoryPressure: SHARED_IS_MEMORY_PRESSURE,
    jankCount: SHARED_JANK_COUNT,
    longTaskCount: SHARED_LONG_TASK_COUNT,
    isThrottled: SHARED_IS_THROTTLED,
  }
}

export { stopTracking }
