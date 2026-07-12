import { ref, computed, watch, onMounted, onUnmounted, type Ref } from 'vue'
import { useDeviceCapabilities, type DeviceTier } from '@/composables/useDeviceCapabilities'
import { usePerformance } from '@/composables/usePerformance'

export type QualityLevel = 'low' | 'medium' | 'high' | 'ultra'

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

const QUALITY_PRESETS: Record<QualityLevel, QualitySettings> = {
  low: {
    level: 'low',
    tileResolution: 'low',
    hexGridScale: 0.5,
    particleMaxCount: 0,
    particleFps: 15,
    particleTrailLength: 0,
    particleShadowBlur: 0,
    particleSpawnRate: 0,
    connectionLineBlur: 0,
    showConnections: false,
    showParticles: false,
    showHexGrid: false,
    maxMarkerCount: 200,
    maxTileCacheSize: 50,
    maxTileCacheZoomLevels: 2,
    antialiasing: false,
    shadowQuality: 'off',
    dprCap: 1,
    starCount: 0,
    autoRotate: false,
  },
  medium: {
    level: 'medium',
    tileResolution: 'medium',
    hexGridScale: 0.75,
    particleMaxCount: 20,
    particleFps: 20,
    particleTrailLength: 3,
    particleShadowBlur: 2,
    particleSpawnRate: 0.2,
    connectionLineBlur: 1.5,
    showConnections: true,
    showParticles: true,
    showHexGrid: true,
    maxMarkerCount: 500,
    maxTileCacheSize: 100,
    maxTileCacheZoomLevels: 3,
    antialiasing: false,
    shadowQuality: 'low',
    dprCap: 1.5,
    starCount: 40,
    autoRotate: true,
  },
  high: {
    level: 'high',
    tileResolution: 'high',
    hexGridScale: 1,
    particleMaxCount: 60,
    particleFps: 30,
    particleTrailLength: 5,
    particleShadowBlur: 4,
    particleSpawnRate: 0.35,
    connectionLineBlur: 3,
    showConnections: true,
    showParticles: true,
    showHexGrid: true,
    maxMarkerCount: 2000,
    maxTileCacheSize: 200,
    maxTileCacheZoomLevels: 5,
    antialiasing: true,
    shadowQuality: 'high',
    dprCap: 2,
    starCount: 80,
    autoRotate: true,
  },
  ultra: {
    level: 'ultra',
    tileResolution: 'high',
    hexGridScale: 1,
    particleMaxCount: 90,
    particleFps: 36,
    particleTrailLength: 7,
    particleShadowBlur: 6,
    particleSpawnRate: 0.45,
    connectionLineBlur: 5.6,
    showConnections: true,
    showParticles: true,
    showHexGrid: true,
    maxMarkerCount: 5000,
    maxTileCacheSize: 300,
    maxTileCacheZoomLevels: 6,
    antialiasing: true,
    shadowQuality: 'high',
    dprCap: 3,
    starCount: 120,
    autoRotate: true,
  },
}

const TIER_TO_QUALITY: Record<DeviceTier, QualityLevel> = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  ultra: 'ultra',
}

// Singleton shared state
const currentLevel = ref<QualityLevel>('high')
const currentSettings = ref<QualitySettings>({ ...QUALITY_PRESETS.high })
const isAutoAdjusting = ref(true)
let adjustTimer: ReturnType<typeof setTimeout> | null = null
let lastAdjustTime = 0
const ADJUST_COOLDOWN_MS = 5000

function computeQualityFromMetrics(
  tier: DeviceTier,
  fps: number,
  avgFps: number,
  isMemoryPressure: boolean,
  jankCount: number,
  isThrottled: boolean,
): QualityLevel {
  let base = TIER_TO_QUALITY[tier]

  // Downgrade if performance is poor
  if (fps < 24 || isThrottled) {
    base = 'low'
  } else if (fps < 40 || avgFps < 45) {
    base = base === 'ultra' ? 'high' : base === 'high' ? 'medium' : base
  }

  // Downgrade on memory pressure
  if (isMemoryPressure) {
    if (base === 'ultra') base = 'high'
    else if (base === 'high') base = 'medium'
  }

  // Downgrade on excessive jank (more than 30 janks in the window)
  if (jankCount > 30) {
    if (base === 'ultra') base = 'high'
    else if (base === 'high') base = 'medium'
  }

  // Upgrade if we have headroom
  if (fps > 55 && avgFps > 50 && !isMemoryPressure && jankCount < 5) {
    if (base === 'low') base = 'medium'
    else if (base === 'medium') base = 'high'
  }

  return base
}

function applyLevel(level: QualityLevel) {
  if (currentLevel.value === level) return
  currentLevel.value = level
  currentSettings.value = { ...QUALITY_PRESETS[level] }
}

function adjust() {
  const now = performance.now()
  if (now - lastAdjustTime < ADJUST_COOLDOWN_MS) return
  lastAdjustTime = now

  // Import dynamic refs — these are from the shared singletons
  const fps = SHARED_FPS_REF.value
  const avgFps = SHARED_AVG_FPS_REF.value
  const memPressure = SHARED_MEM_PRESSURE_REF.value
  const jank = SHARED_JANK_REF.value
  const throttled = SHARED_THROTTLED_REF.value
  const tier = SHARED_TIER_REF.value

  const newLevel = computeQualityFromMetrics(tier, fps, avgFps, memPressure, jank, throttled)
  applyLevel(newLevel)
}

// These refs are set once during init from the external singletons
let SHARED_FPS_REF: Ref<number> = { value: 60 } as Ref<number>
let SHARED_AVG_FPS_REF: Ref<number> = { value: 60 } as Ref<number>
let SHARED_MEM_PRESSURE_REF: Ref<boolean> = { value: false } as Ref<boolean>
let SHARED_JANK_REF: Ref<number> = { value: 0 } as Ref<number>
let SHARED_THROTTLED_REF: Ref<boolean> = { value: false } as Ref<boolean>
let SHARED_TIER_REF: Ref<DeviceTier> = { value: 'high' } as Ref<DeviceTier>

/**
 * Adaptive quality controller — monitors FPS/memory and auto-adjusts
 * rendering quality to maintain smooth 60fps on all devices.
 *
 * Singleton: first call initializes, subsequent calls share state.
 */
export function useAdaptiveQuality() {
  const { capabilities } = useDeviceCapabilities()
  const perf = usePerformance()

  onMounted(() => {
    // Link shared refs
    SHARED_FPS_REF = perf.fps
    SHARED_AVG_FPS_REF = perf.avgFps
    SHARED_MEM_PRESSURE_REF = perf.isMemoryPressure
    SHARED_JANK_REF = perf.jankCount
    SHARED_THROTTLED_REF = perf.isThrottled

    // Set initial quality from device capabilities
    if (capabilities.value) {
      SHARED_TIER_REF = { value: capabilities.value.tier } as Ref<DeviceTier>
      applyLevel(TIER_TO_QUALITY[capabilities.value.tier])
    }

    // Start adaptive loop
    if (!adjustTimer) {
      adjustTimer = setInterval(() => {
        if (isAutoAdjusting.value) adjust()
      }, 2000)
    }
  })

  onUnmounted(() => {
    if (adjustTimer) {
      clearInterval(adjustTimer)
      adjustTimer = null
    }
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

  function getTileUrl(style: string, apiKey: string): string {
    const res = currentSettings.value.tileResolution
    if (res === 'low') {
      // Use a lighter style or add source-specific resolution params
      return style
    }
    return style
  }

  return {
    level: currentLevel,
    settings,
    isAutoAdjusting,
    setManual,
    enableAuto,
    getTileUrl,
    QUALITY_PRESETS,
  }
}
