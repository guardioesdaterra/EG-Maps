/**
 * composables/useMapTileProvider.ts
 * @why Global MapTiler-vs-fallback tile provider state — manual header toggle
 *      plus automatic degradation when tiles are slow or rendering is weak.
 *      MapTiler stays the #1 default; fallback only engages on poor health
 *      (slow style/tile loads, repeated tile errors, sustained low FPS,
 *      offline or data-saver network) or explicit user choice.
 * @functions useMapTileProvider
 * @types TileProvider, ProviderPreference, TileHealthReason
 * @connections layouts/default.vue, composables/useMapBase.ts
 */
import { computed, ref } from 'vue'
import { createSharedComposable } from '@vueuse/core'

export type TileProvider = 'maptiler' | 'fallback'
export type ProviderPreference = 'auto' | TileProvider
export type TileHealthReason =
  | 'manual'
  | 'no-api-key'
  | 'offline'
  | 'save-data'
  | 'slow-network'
  | 'slow-style-load'
  | 'slow-tiles'
  | 'tile-errors'
  | 'low-fps'

const STORAGE_KEY = 'eg-map-tile-provider'

/** Style/load is "slow" when first idle takes longer than this. */
export const SLOW_STYLE_LOAD_MS = 12000
/** Avg tile resource duration above this counts as slow download. */
export const SLOW_TILE_MS = 2500
/** Consecutive low-FPS samples before auto fallback engages. */
export const LOW_FPS_THRESHOLD = 22
export const LOW_FPS_SAMPLES = 3
/** Tile/network errors in a window before auto fallback engages. */
export const TILE_ERROR_THRESHOLD = 4
/** Cooldown between auto-fallback evaluations. */
const EVALUATE_COOLDOWN_MS = 2000

function readPreference(): ProviderPreference {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return 'auto'
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'maptiler' || raw === 'fallback' || raw === 'auto') return raw
  } catch { /* ignore */ }
  return 'auto'
}

function connectionHints(): { saveData: boolean; downlink: number; rtt: number; offline: boolean } {
  if (typeof navigator === 'undefined') return { saveData: false, downlink: 10, rtt: 0, offline: false }
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; downlink?: number; rtt?: number; effectiveType?: string } }).connection
  return {
    saveData: conn?.saveData ?? false,
    downlink: typeof conn?.downlink === 'number' ? conn.downlink : 10,
    rtt: typeof conn?.rtt === 'number' ? conn.rtt : 0,
    offline: typeof navigator.onLine === 'boolean' ? !navigator.onLine : false,
  }
}

/** Mean duration of recent MapTiler tile/resource fetches (Resource Timing API). */
function meanMapTilerResourceMs(maxEntries = 25): number | null {
  if (typeof performance === 'undefined' || typeof performance.getEntriesByType !== 'function') return null
  try {
    const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
    const tiles = entries.filter(e => typeof e.name === 'string' && e.name.includes('api.maptiler.com'))
    if (!tiles.length) return null
    const recent = tiles.slice(-maxEntries)
    const sum = recent.reduce((acc, e) => acc + (e.duration || 0), 0)
    return sum / recent.length
  } catch { return null }
}

export const useMapTileProvider = createSharedComposable(() => {
  const preference = ref<ProviderPreference>(readPreference())
  const autoFallback = ref(false)
  const autoReason = ref<TileHealthReason | null>(null)
  const tileErrorCount = ref(0)
  const styleLoadMs = ref<number | null>(null)
  const avgTileMs = ref<number | null>(null)
  const lastFps = ref<number | null>(null)

  let styleStart = 0
  let lowFpsStreak = 0
  let lastEvaluate = 0
  let errorWindowStart = 0

  const effectiveProvider = computed<TileProvider>(() => {
    if (preference.value === 'maptiler') return 'maptiler'
    if (preference.value === 'fallback') return 'fallback'
    return autoFallback.value ? 'fallback' : 'maptiler'
  })

  const isFallback = computed(() => effectiveProvider.value === 'fallback')
  const isAuto = computed(() => preference.value === 'auto')

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, preference.value) } catch { /* ignore */ }
  }

  function setPreference(next: ProviderPreference) {
    preference.value = next
    persist()
    if (next !== 'auto') {
      autoFallback.value = false
      autoReason.value = 'manual'
      resetCounters()
    } else {
      autoReason.value = null
      resetCounters()
    }
  }

  /** Header toggle: flip the effective provider and pin it as a manual choice. */
  function toggleProvider() {
    setPreference(effectiveProvider.value === 'maptiler' ? 'fallback' : 'maptiler')
  }

  function resetToAuto() {
    setPreference('auto')
  }

  function resetCounters() {
    tileErrorCount.value = 0
    lowFpsStreak = 0
    errorWindowStart = 0
    styleLoadMs.value = null
    avgTileMs.value = null
    lastEvaluate = 0
  }

  function engageAutoFallback(reason: TileHealthReason) {
    if (preference.value !== 'auto' || autoFallback.value) return
    autoFallback.value = true
    autoReason.value = reason
    if (import.meta.dev) console.warn(`[tile-provider] auto fallback engaged (${reason}) — MapTiler remains default once healthy`)
  }

  function clearAutoFallback() {
    autoFallback.value = false
    autoReason.value = null
    resetCounters()
  }

  /** Force auto fallback (e.g. style never became ready within timeout). */
  function forceAutoFallback(reason: TileHealthReason) {
    engageAutoFallback(reason)
  }

  /** Call when a style (re)load starts — returns timestamp for noteStyleReady. */
  function noteStyleStart() {
    styleStart = typeof performance !== 'undefined' ? performance.now() : Date.now()
    tileErrorCount.value = 0
    errorWindowStart = styleStart
  }

  function noteStyleReady() {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
    styleLoadMs.value = Math.max(0, now - (styleStart || now))
    const avg = meanMapTilerResourceMs()
    avgTileMs.value = avg
    if (preference.value === 'auto' && !autoFallback.value) {
      if ((styleLoadMs.value ?? 0) >= SLOW_STYLE_LOAD_MS) {
        engageAutoFallback('slow-style-load')
      } else if (avg != null && avg >= SLOW_TILE_MS) {
        engageAutoFallback('slow-tiles')
      }
    }
  }

  function noteTileError() {
    const now = Date.now()
    if (!errorWindowStart || now - errorWindowStart > 60000) {
      errorWindowStart = now
      tileErrorCount.value = 0
    }
    tileErrorCount.value++
    if (preference.value === 'auto' && !autoFallback.value && tileErrorCount.value >= TILE_ERROR_THRESHOLD) {
      engageAutoFallback('tile-errors')
    }
  }

  /** Feed render FPS (e.g. from usePerformance) — sustained low FPS triggers fallback. */
  function reportFps(fps: number) {
    lastFps.value = fps
    if (preference.value !== 'auto' || autoFallback.value) return
    const now = Date.now()
    if (now - lastEvaluate < EVALUATE_COOLDOWN_MS) return
    lastEvaluate = now
    if (fps > 0 && fps < LOW_FPS_THRESHOLD) {
      lowFpsStreak++
      if (lowFpsStreak >= LOW_FPS_SAMPLES) engageAutoFallback('low-fps')
    } else if (fps >= LOW_FPS_THRESHOLD + 6) {
      lowFpsStreak = 0
    }
  }

  /** Evaluate offline / data-saver / very-slow-network hints (call at map init). */
  function evaluateNetworkHints(apiKey: string): TileProvider {
    const hints = connectionHints()
    if (preference.value !== 'auto') return effectiveProvider.value
    if (!apiKey) {
      autoFallback.value = true
      autoReason.value = 'no-api-key'
      return 'fallback'
    }
    if (hints.offline) {
      engageAutoFallback('offline')
      return effectiveProvider.value
    }
    if (hints.saveData) {
      engageAutoFallback('save-data')
      return effectiveProvider.value
    }
    if (hints.downlink > 0 && hints.downlink < 0.8) {
      engageAutoFallback('slow-network')
    }
    return effectiveProvider.value
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      // Back online in auto mode with an offline-triggered fallback → retry MapTiler.
      if (preference.value === 'auto' && autoReason.value === 'offline') clearAutoFallback()
    })
  }

  return {
    preference,
    effectiveProvider,
    isFallback,
    isAuto,
    autoFallback,
    autoReason,
    tileErrorCount,
    styleLoadMs,
    avgTileMs,
    lastFps,
    setPreference,
    toggleProvider,
    resetToAuto,
    clearAutoFallback,
    forceAutoFallback,
    noteStyleStart,
    noteStyleReady,
    noteTileError,
    reportFps,
    evaluateNetworkHints,
  }
})
