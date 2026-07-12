import { ref, onMounted, onUnmounted } from 'vue'

export interface PerformanceMetrics {
  fps: number
  avgFps: number
  fpsStddev: number
  frameTime: number
  frameTimeP95: number
  memoryUsage: number
  memoryLimit: number
  isMemoryPressure: boolean
  jankCount: number
  longTaskCount: number
  isThrottled: boolean
  isIdle: boolean
}

// ── Shared singleton state ──
const SHARED_FPS = ref(60)
const SHARED_AVG_FPS = ref(60)
const SHARED_FPS_STDDEV = ref(0)
const SHARED_FRAME_TIME = ref(16.67)
const SHARED_FRAME_TIME_P95 = ref(16.67)
const SHARED_MEMORY_USAGE = ref(0)
const SHARED_MEMORY_LIMIT = ref(0)
const SHARED_IS_MEMORY_PRESSURE = ref(false)
const SHARED_JANK_COUNT = ref(0)
const SHARED_LONG_TASK_COUNT = ref(0)
const SHARED_IS_THROTTLED = ref(false)
const SHARED_IS_IDLE = ref(true)

let initialized = false
let rafId: number | null = null
let longTaskObserver: PerformanceObserver | null = null
let memoryObserver: PerformanceObserver | null = null
let visibilityHandler: (() => void) | null = null
let idleCallbackId: number | null = null

// ── FPS tracking via exponential moving average ──
const FPS_EMA_ALPHA = 0.2
const FPS_SAMPLE_WINDOW_MS = 1000
const JANK_THRESHOLD_MS = 20 // >1.2 frames at 60fps
const MEMORY_PRESSURE_RATIO = 0.85
const FRAME_TIME_HISTORY_SIZE = 120 // 2 seconds at 60fps
const LONG_TASK_THRESHOLD_MS = 16 // One frame budget

const frameTimeHistory: number[] = []
const fpsHistory: number[] = []
let lastFrameTime = 0
let lastFpsSampleTime = 0
let frameCountInSample = 0
let emaFps = 60

function computeStddev(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

function computeP95(values: number[]): number {
  if (values.length === 0) return 16.67
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.floor(sorted.length * 0.95)
  return sorted[idx] || sorted[sorted.length - 1]
}

function startTracking() {
  if (initialized) return
  initialized = true

  const tick = (now: number) => {
    rafId = requestAnimationFrame(tick)

    if (lastFrameTime === 0) {
      lastFrameTime = now
      lastFpsSampleTime = now
      return
    }

    const delta = now - lastFrameTime
    lastFrameTime = now

    // Guard against tab-switch large deltas
    if (delta > 200) return

    frameCountInSample++

    // Track frame time
    frameTimeHistory.push(delta)
    if (frameTimeHistory.length > FRAME_TIME_HISTORY_SIZE) frameTimeHistory.shift()

    // Jank detection (>1.2 frames at 60fps)
    if (delta > JANK_THRESHOLD_MS) {
      SHARED_JANK_COUNT.value++
    }

    // FPS sampling every second
    if (now - lastFpsSampleTime >= FPS_SAMPLE_WINDOW_MS) {
      const elapsed = now - lastFpsSampleTime
      const instantFps = Math.min(Math.round((frameCountInSample * 1000) / elapsed), 144)

      // Exponential moving average for smooth, responsive FPS
      emaFps = FPS_EMA_ALPHA * instantFps + (1 - FPS_EMA_ALPHA) * emaFps
      SHARED_FPS.value = Math.round(emaFps)

      // Track FPS history for stddev
      fpsHistory.push(instantFps)
      if (fpsHistory.length > 30) fpsHistory.shift()
      SHARED_FPS_STDDEV.value = Math.round(computeStddev(fpsHistory) * 10) / 10

      // Average FPS (lifetime)
      SHARED_AVG_FPS.value = Math.round((SHARED_AVG_FPS.value * (fpsHistory.length - 1) + instantFps) / fpsHistory.length)

      // Frame time metrics
      SHARED_FRAME_TIME.value = frameCountInSample > 0 ? Math.round((elapsed / frameCountInSample) * 10) / 10 : 16.67
      SHARED_FRAME_TIME_P95.value = Math.round(computeP95(frameTimeHistory) * 10) / 10

      // Throttling detection: sustained low FPS
      SHARED_IS_THROTTLED.value = SHARED_FPS.value < 20 && fpsHistory.length > 3

      frameCountInSample = 0
      lastFpsSampleTime = now
    }
  }

  rafId = requestAnimationFrame(tick)

  // ── Memory monitoring ──
  const updateMemory = () => {
    // Chrome: performance.memory (non-standard but widely available)
    const perf = performance as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number; totalJSHeapSize: number } }
    if (perf.memory) {
      const used = perf.memory.usedJSHeapSize
      const limit = perf.memory.jsHeapSizeLimit
      SHARED_MEMORY_USAGE.value = used
      SHARED_MEMORY_LIMIT.value = limit
      SHARED_IS_MEMORY_PRESSURE.value = limit > 0 && used / limit > MEMORY_PRESSURE_RATIO
      return
    }

    // Chrome 109+: performance.measureUserAgentSpecificMemory() (accurate)
    if ('measureUserAgentSpecificMemory' in performance) {
      (performance as { measureUserAgentSpecificMemory: () => Promise<{ bytes: number }> })
        .measureUserAgentSpecificMemory()
        .then((result) => {
          SHARED_MEMORY_USAGE.value = result.bytes
          // Estimate limit as 4x used (rough heuristic)
          SHARED_MEMORY_LIMIT.value = Math.max(result.bytes * 4, 512 * 1024 * 1024)
          SHARED_IS_MEMORY_PRESSURE.value = false
        })
        .catch(() => { /* not available in this context */ })
    }
  }

  updateMemory()
  const memoryInterval = setInterval(updateMemory, 3000)

  // ── Long task detection ──
  try {
    longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > LONG_TASK_THRESHOLD_MS) {
          SHARED_LONG_TASK_COUNT.value++
        }
      }
    })
    longTaskObserver.observe({ type: 'longtask', buffered: true } as PerformanceObserverInit)
  } catch {
    // Longtask API not supported
  }

  // ── Layout shift tracking (CLS) ──
  try {
    memoryObserver = new PerformanceObserver((list) => {
      // Layout shifts are another indicator of jank
      for (const entry of list.getEntries()) {
        if ((entry as { hadRecentInput?: boolean }).hadRecentInput) continue
        // Each layout shift contributes to perceived jank
        const value = (entry as { value?: number }).value ?? 0
        if (value > 0.1) SHARED_JANK_COUNT.value++
      }
    })
    memoryObserver.observe({ type: 'layout-shift', buffered: true } as PerformanceObserverInit)
  } catch {
    // layout-shift not supported
  }

  // ── Visibility-based pause/resume ──
  visibilityHandler = () => {
    if (document.hidden) {
      if (rafId != null) { cancelAnimationFrame(rafId); rafId = null }
    } else {
      // Reset timing to avoid large delta spike
      lastFrameTime = 0
      lastFpsSampleTime = performance.now()
      frameCountInSample = 0
      if (rafId == null) rafId = requestAnimationFrame(tick)
    }
  }
  document.addEventListener('visibilitychange', visibilityHandler)

  // ── Idle state via requestIdleCallback ──
  const scheduleIdle = () => {
    if (typeof requestIdleCallback !== 'undefined') {
      idleCallbackId = requestIdleCallback((deadline) => {
        SHARED_IS_IDLE.value = deadline.timeRemaining() > 5 || deadline.didTimeout
        scheduleIdle()
      }, { timeout: 1000 })
    } else {
      SHARED_IS_IDLE.value = true
    }
  }
  scheduleIdle()
}

function stopTracking() {
  if (rafId != null) { cancelAnimationFrame(rafId); rafId = null }
  if (idleCallbackId != null && typeof cancelIdleCallback !== 'undefined') { cancelIdleCallback(idleCallbackId); idleCallbackId = null }
  longTaskObserver?.disconnect()
  longTaskObserver = null
  memoryObserver?.disconnect()
  memoryObserver = null
  if (visibilityHandler) { document.removeEventListener('visibilitychange', visibilityHandler); visibilityHandler = null }
  initialized = false
}

/**
 * Real-time performance monitoring — FPS (EMA), frame time P95, memory, jank, idle state.
 * Singleton: first call starts tracking, subsequent calls share reactive state.
 */
export function usePerformance() {
  onMounted(() => {
    startTracking()
  })

  onUnmounted(() => {
    // Don't stop on individual component unmount — app lifetime
  })

  return {
    fps: SHARED_FPS,
    avgFps: SHARED_AVG_FPS,
    fpsStddev: SHARED_FPS_STDDEV,
    frameTime: SHARED_FRAME_TIME,
    frameTimeP95: SHARED_FRAME_TIME_P95,
    memoryUsage: SHARED_MEMORY_USAGE,
    memoryLimit: SHARED_MEMORY_LIMIT,
    isMemoryPressure: SHARED_IS_MEMORY_PRESSURE,
    jankCount: SHARED_JANK_COUNT,
    longTaskCount: SHARED_LONG_TASK_COUNT,
    isThrottled: SHARED_IS_THROTTLED,
    isIdle: SHARED_IS_IDLE,
  }
}

export { stopTracking }
