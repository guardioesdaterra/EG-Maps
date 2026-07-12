import { ref, computed, onMounted, onUnmounted, type Ref } from 'vue'
import { useDeviceCapabilities, type DeviceTier } from '@/composables/useDeviceCapabilities'
import { usePerformance } from '@/composables/usePerformance'
import { QUALITY_PRESETS as BASE_PRESETS } from '@/lib/constants'
import type { QualityLevel } from '@/lib/constants'

export type { QualityLevel }

export interface QualitySettings {
  level: QualityLevel
  tileResolution: 'low' | 'medium' | 'high'
  hexGridScale: number
  particleMaxCount: number
  particleFps: number
  particleTrailLength: number
  particleShadowBlur: number
  particleSpawnRate: number
  connectionLineBlur: number
  showConnections: boolean
  showParticles: boolean
  showHexGrid: boolean
  maxMarkerCount: number
  maxTileCacheSize: number
  maxTileCacheZoomLevels: number
  antialiasing: boolean
  shadowQuality: 'off' | 'low' | 'high'
  dprCap: number
  starCount: number
  autoRotate: boolean
}

// Build full QualitySettings from base presets (adds computed fields)
function buildSettings(level: QualityLevel): QualitySettings {
  const base = BASE_PRESETS[level]
  return {
    level,
    tileResolution: level === 'low' ? 'low' : level === 'medium' ? 'medium' : 'high',
    hexGridScale: base.hexScale,
    particleMaxCount: base.particleMaxCount,
    particleFps: base.particleFps,
    particleTrailLength: base.particleTrailLength,
    particleShadowBlur: base.particleShadowBlur,
    particleSpawnRate: base.particleSpawnRate,
    connectionLineBlur: level === 'low' ? 0 : level === 'medium' ? 1.5 : level === 'high' ? 3 : 5.6,
    showConnections: base.showConnections,
    showParticles: base.showParticles,
    showHexGrid: base.showHexGrid,
    maxMarkerCount: base.maxMarkerCount,
    maxTileCacheSize: base.maxTileCacheSize,
    maxTileCacheZoomLevels: base.maxTileCacheZoomLevels,
    antialiasing: level === 'high' || level === 'ultra',
    shadowQuality: level === 'low' ? 'off' : level === 'medium' ? 'low' : 'high',
    dprCap: base.dprCap,
    starCount: base.starCount,
    autoRotate: base.autoRotate,
  }
}

const TIER_TO_QUALITY: Record<DeviceTier, QualityLevel> = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  ultra: 'ultra',
}

// ── Singleton shared state ──
const currentLevel = ref<QualityLevel>('high')
const currentSettings = ref<QualitySettings>(buildSettings('high'))
const isAutoAdjusting = ref(true)
let adjustTimer: ReturnType<typeof setInterval> | null = null
let lastAdjustTime = 0
const ADJUST_COOLDOWN_MS = 2000

// Weak ref to performance metrics (set during init)
let perfFps: Ref<number> | null = null
let perfFpsStddev: Ref<number> | null = null
let perfFrameTimeP95: Ref<number> | null = null
let perfIsMemoryPressure: Ref<boolean> | null = null
let perfJankCount: Ref<number> | null = null
let perfIsThrottled: Ref<boolean> | null = null
let perfIsIdle: Ref<boolean> | null = null
let deviceTier: DeviceTier = 'high'
let devicePrefersReducedMotion = false
let devicePrefersReducedData = false
let deviceSaveData = false
let deviceConnectionDownlink = 10

function computeQualityFromMetrics(): QualityLevel {
  const fps = perfFps?.value ?? 60
  const stddev = perfFpsStddev?.value ?? 0
  const p95 = perfFrameTimeP95?.value ?? 16.67
  const memPressure = perfIsMemoryPressure?.value ?? false
  const jank = perfJankCount?.value ?? 0
  const throttled = perfIsThrottled?.value ?? false

  // Start from device tier
  let level: QualityLevel = TIER_TO_QUALITY[deviceTier]

  // ── Hard overrides (immediate downgrade to low) ──
  if (throttled || fps < 15 || (p95 > 64 && fps < 30)) {
    return 'low'
  }

  // ── User preference overrides ──
  if (devicePrefersReducedMotion) {
    return level === 'ultra' ? 'high' : level === 'high' ? 'medium' : 'low'
  }
  if (devicePrefersReducedData || deviceSaveData) {
    if (level === 'ultra') level = 'high'
    if (level === 'high') level = 'medium'
  }

  // ── Network-aware: throttle on slow connections ──
  if (deviceConnectionDownlink < 1) {
    if (level === 'ultra') level = 'high'
    if (level === 'high') level = 'medium'
  }

  // ── Performance-based downgrade ──
  if (fps < 30 || p95 > 40) {
    level = level === 'ultra' ? 'high' : level === 'high' ? 'medium' : level === 'medium' ? 'low' : 'low'
  } else if (fps < 45 || p95 > 28) {
    level = level === 'ultra' ? 'high' : level === 'high' ? 'medium' : level
  }

  // ── Frame time variance penalty ──
  if (stddev > 15 && level !== 'low') {
    level = level === 'ultra' ? 'high' : level === 'high' ? 'medium' : level
  }

  // ── Memory pressure penalty ──
  if (memPressure) {
    level = level === 'ultra' ? 'high' : level === 'high' ? 'medium' : level
  }

  // ── Jank accumulation penalty ──
  if (jank > 50) {
    level = level === 'ultra' ? 'high' : level === 'high' ? 'medium' : level
  }

  // ── Upgrade if we have headroom ──
  if (fps > 55 && stddev < 5 && p95 < 20 && !memPressure && jank < 10) {
    level = level === 'low' ? 'medium' : level === 'medium' ? 'high' : level
  }

  return level
}

function applyLevel(level: QualityLevel) {
  if (currentLevel.value === level) return
  currentLevel.value = level
  currentSettings.value = buildSettings(level)
}

function adjust() {
  const now = performance.now()
  if (now - lastAdjustTime < ADJUST_COOLDOWN_MS) return
  lastAdjustTime = now

  applyLevel(computeQualityFromMetrics())
}

/**
 * Adaptive quality controller — monitors FPS/memory/device and auto-adjusts
 * rendering quality to maintain smooth 60fps on all devices.
 *
 * Singleton: first call initializes, subsequent calls share state.
 */
export function useAdaptiveQuality() {
  const { capabilities } = useDeviceCapabilities()
  const perf = usePerformance()

  onMounted(() => {
    // Link performance refs
    perfFps = perf.fps
    perfFpsStddev = perf.fpsStddev
    perfFrameTimeP95 = perf.frameTimeP95
    perfIsMemoryPressure = perf.isMemoryPressure
    perfJankCount = perf.jankCount
    perfIsThrottled = perf.isThrottled
    perfIsIdle = perf.isIdle

    // Read device capabilities
    if (capabilities.value) {
      deviceTier = capabilities.value.tier
      devicePrefersReducedMotion = capabilities.value.prefersReducedMotion
      devicePrefersReducedData = capabilities.value.prefersReducedData
      deviceSaveData = capabilities.value.saveData
      deviceConnectionDownlink = capabilities.value.connectionDownlink
      applyLevel(TIER_TO_QUALITY[deviceTier])
    }

    // Start adaptive loop
    if (!adjustTimer) {
      adjustTimer = setInterval(() => {
        if (isAutoAdjusting.value) adjust()
      }, ADJUST_COOLDOWN_MS)
    }
  })

  onUnmounted(() => {
    // Don't tear down singleton timer on individual component unmount
  })

  const settings = computed(() => currentSettings.value)

  function setManual(level: QualityLevel) {
    isAutoAdjusting.value = false
    applyLevel(level)
  }

  function enableAuto() {
    isAutoAdjusting.value = true
    adjust()
  }

  return {
    level: currentLevel,
    settings,
    isAutoAdjusting,
    setManual,
    enableAuto,
    QUALITY_PRESETS: BASE_PRESETS,
  }
}
