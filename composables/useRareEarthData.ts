/**
 * composables/useRareEarthData.ts
 * @why Rare earth elements data management — periodic table data, properties, supply chain info
 * @functions useRareEarthData
 * @interfaces RareEarthFeatureSummary, DeepAnalysis
 * @types LoadPhase, DataRegion
 * @deps vue (shallowRef, ref, computed); @/lib/observatory-analysis (computeSpeculatorIndex, type RareEarthFeature, type RareEarthFeatureCollection, type SpeculatorIndexEntry)
 * @connections composables/useVulcanObservatoryPage.ts
 */
import { shallowRef, ref, computed } from 'vue'
import { computeSpeculatorIndex, type RareEarthFeature, type RareEarthFeatureCollection, type SpeculatorIndexEntry } from '@/lib/observatory-analysis'
import {
  buildLayerCounts,
  canonicalProtectedKind,
  inlineOverlaps,
  normalizePointFeature,
  normalizePolygonFeature,
  summarizeOverlaps,
  summarizeProtected,
  type OverlapsByProcesso,
  type OverlapSummary,
  type ProtectedBreakdown,
  type ObservatoryLayerCounts,
} from '@/lib/observatory-normalize'
import {
  computeWaterThreats,
  summarizeWaterThreats,
  enrichWaterFeatures,
  type WaterThreat,
  type WaterThreatSummary,
} from '@/lib/water-defense'

export interface RareEarthFeatureSummary {
  p: string
  n: string
  s: string
  c: string
  f: string
  u: string
  a: number
  ds: number
  net: string
  y: number
  lo: number
  la: number
  ov: Array<{ name: string; kind: string; distance_km: number }> | null
  dsprocesso: string
  hc: string
  he: string
  fr: number
}

export interface DeepAnalysis {
  last_sync?: string
  data_source?: string
  sync_frequency?: string
  sync_url?: string
  suspicious_speculators_count?: number
  sigilo_stats?: { total: number; pct: number; total_area_ha: number }
  military_critical?: { total_claims: number; total_area_ha: number; us_connected_claims: number; us_connected_area_ha: number }
  [k: string]: unknown
}

export type LoadPhase = 'idle' | 'points' | 'overlaps' | 'polygons' | 'protected' | 'complete'
export type DataRegion = 'pococaldas' | 'all'

export function useRareEarthData(baseURL: string, initialRegion: DataRegion = 'pococaldas') {
  const region = ref<DataRegion>(initialRegion)
  const pointsData = shallowRef<RareEarthFeatureCollection | undefined>(undefined)
  const polygonsData = shallowRef<RareEarthFeatureCollection | undefined>(undefined)
  const protectedData = shallowRef<RareEarthFeatureCollection | undefined>(undefined)
  const waterData = shallowRef<GeoJSON.FeatureCollection | undefined>(undefined)
  const culturalData = shallowRef<GeoJSON.FeatureCollection | undefined>(undefined)
  const waterThreats = shallowRef<WaterThreat[]>([])
  const features = ref<RareEarthFeatureSummary[]>([])
  const deepAnalysis = shallowRef<DeepAnalysis | undefined>(undefined)
  const isLoading = ref(false)
  const loadPhase = ref<LoadPhase>('idle')
  const loadProgress = ref(0)
  const error = ref<Error | null>(null)
  const isRegional = ref(initialRegion === 'pococaldas')
  let overlapsByProcesso: Record<string, Array<{ name: string; kind: string; distance_km: number }>> = {}

  function normalizedBase(): string {
    return (baseURL || '/').replace(/\/?$/, '/')
  }
  function dataDir(): string {
    const base = normalizedBase()
    return region.value === 'pococaldas'
      ? `${base}data/rare-earth/pococaldas/`
      : `${base}data/rare-earth/`
  }
  /**
   * Single-fetch points URL per region. The overlaps files are strict
   * supersets of the base points files (same features + inline `overlaps`
   * arrays — verified), so one download + one parse + one normalize pass
   * replaces the old two-file dance (national: −8.5MB, −1 full
   * parse/normalize/rebuild cycle).
   */
  function pointsUrl(): string {
    const dir = dataDir()
    return region.value === 'pococaldas'
      ? `${dir}points_overlaps.geojson`
      : `${dir}points_with_overlaps.geojson`
  }
  function yieldToUI(): Promise<void> {
    if (typeof requestAnimationFrame !== 'undefined') {
      return new Promise(resolve => requestAnimationFrame(() => resolve()))
    }
    return new Promise(resolve => setTimeout(resolve, 0))
  }
  let loadToken = 0

  function dangerByHolder(pointsGJ: RareEarthFeatureCollection): Map<string, SpeculatorIndexEntry> {
    const out = new Map<string, SpeculatorIndexEntry>()
    for (const e of computeSpeculatorIndex(pointsGJ)) out.set(e.normalizedName, e)
    return out
  }

  /**
   * Normalize raw points into scalar-only GeoJSON (MapLibre-safe) plus
   * filter-ready summaries. Danger scores are joined from the speculator
   * index so popups/clusters show live risk instead of a 0.0 placeholder.
   *
   * Chunked + yielding: 20.7k national claims normalize in ~100ms slices so
   * the loading screen keeps animating instead of wedging on one long task.
   * `onProgress(done, total)` reports for the loader bar; stale-token checks
   * live with the caller (this never touches shared refs).
   */
  async function normalizeAll(
    pointsGJ: RareEarthFeatureCollection,
    overlaps: OverlapsByProcesso,
    holderIndex: Map<string, SpeculatorIndexEntry>,
    onProgress?: (_done: number, _total: number) => void,
  ): Promise<{ fc: RareEarthFeatureCollection; summaries: RareEarthFeatureSummary[] }> {
    const summaries: RareEarthFeatureSummary[] = []
    const rawFeatures = pointsGJ.features as RareEarthFeature[]
    const out = new Array<RareEarthFeature>(rawFeatures.length)
    const CHUNK = 2500
    for (let start = 0; start < rawFeatures.length; start += CHUNK) {
      const end = Math.min(start + CHUNK, rawFeatures.length)
      for (let i = start; i < end; i++) {
        const f = rawFeatures[i]
        const norm = normalizePointFeature(
          f as GeoJSON.Feature<GeoJSON.Point>,
          overlaps,
          holderIndex,
        )
        const p = norm.properties as unknown as Record<string, string & number> & {
          p: string; n: string; s: string; c: string; f: string; u: string
          a: number; ds: number; net: string; y: number; dsprocesso: string
          hc: string; he: string; fr: number
        }
        const coords = (norm.geometry as GeoJSON.Point)?.coordinates ?? [0, 0]
        const processo = String(p.p ?? '')
        summaries.push({
          p: processo,
          n: String(p.n ?? ''),
          s: String(p.s ?? ''),
          c: String(p.c ?? ''),
          f: String(p.f ?? ''),
          u: String(p.u ?? ''),
          a: Number(p.a ?? 0),
          ds: Number(p.ds ?? 4),
          net: String(p.net ?? ''),
          y: Number(p.y ?? 0),
          lo: Number(coords[0] ?? 0),
          la: Number(coords[1] ?? 0),
          ov: overlaps[processo] || null,
          dsprocesso: String(p.dsprocesso ?? ''),
          hc: String(p.hc ?? 'Unknown'),
          he: String(p.he ?? ''),
          fr: Number(p.fr ?? 0),
        })
        out[i] = norm as unknown as RareEarthFeature
      }
      onProgress?.(end, rawFeatures.length)
      // Yield between chunks so progress paints; skip the trailing yield.
      if (end < rawFeatures.length) await yieldToUI()
    }
    return { fc: { type: 'FeatureCollection', features: out }, summaries }
  }

  const resourceErrors = ref<Record<string, string>>({})

  /** fetch with an absolute timeout — a stalled 7MB download must never wedge the loader. */
  async function fetchWithTimeout(url: string, ms = 45000): Promise<Response> {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(new Error(`timeout after ${ms}ms: ${url}`)), ms)
    try {
      return await fetch(url, { signal: ctrl.signal })
    } finally {
      clearTimeout(timer)
    }
  }

  async function loadResource<T>(name: string, url: string, setter: (_data: T) => void): Promise<T | null> {
    try {
      const res = await fetchWithTimeout(url)
      if (!res.ok) {
        resourceErrors.value[name] = `HTTP ${res.status}`
        return null
      }
      const data = await res.json() as T
      setter(data)
      return data
    } catch (e) {
      resourceErrors.value[name] = e instanceof Error ? e.message : String(e)
      return null
    }
  }

  async function load() {
    if (isLoading.value) return
    const token = ++loadToken
    const startingRegion = region.value
    isLoading.value = true
    loadPhase.value = 'points'
    loadProgress.value = 0
    error.value = null
    resourceErrors.value = {}
    // Clear previous-region layers so a failed reload never shows stale data
    // mixed with the new region.
    polygonsData.value = undefined
    protectedData.value = undefined
    waterData.value = undefined
    waterThreats.value = []
    culturalData.value = undefined

    try {
      // Points are critical: two attempts, then a surfaced error. Single
      // fetch — the overlaps file is a verified superset of the base points
      // file, carrying inline `overlaps` (national: −8.5MB download, −1 full
      // parse/normalize/rebuild cycle).
      let pointsRes: Response | null = null
      const url = pointsUrl()
      for (let attempt = 1; attempt <= 2 && !pointsRes?.ok; attempt++) {
        try {
          pointsRes = await fetchWithTimeout(url)
        } catch {
          pointsRes = null
          resourceErrors.value.points = `attempt ${attempt} failed`
        }
      }
      if (token !== loadToken || region.value !== startingRegion) return
      if (!pointsRes?.ok) {
        error.value = new Error('Failed to load points data — cannot render map')
        loadPhase.value = 'idle'
        return
      }
      delete resourceErrors.value.points
      const pointsGJ = (await pointsRes.json()) as RareEarthFeatureCollection
      if (token !== loadToken || region.value !== startingRegion) return
      // Fresh region → drop stale overlap index before transform. Inline
      // overlaps are indexed in one cheap pass (no second download).
      overlapsByProcesso = {}
      for (const f of pointsGJ.features ?? []) {
        const raw = (f as RareEarthFeature).properties as Record<string, unknown> | undefined
        const proc = typeof raw?.processo === 'string' ? raw.processo : ''
        if (!proc) continue
        const links = inlineOverlaps(raw)
        if (links.length) overlapsByProcesso[proc] = links
      }
      const holderIndex = dangerByHolder(pointsGJ)
      const normalized = await normalizeAll(pointsGJ, overlapsByProcesso, holderIndex, (done, total) => {
        if (token === loadToken && region.value === startingRegion) {
          loadProgress.value = Math.round(5 + (30 * done) / Math.max(1, total))
        }
      })
      if (token !== loadToken || region.value !== startingRegion) return
      features.value = normalized.summaries
      pointsData.value = normalized.fc
      loadProgress.value = 40
    } finally {
      if (token === loadToken && region.value === startingRegion) {
        // Points-first paint: the map becomes interactive as soon as claims
        // are ready. Heavy polygons/protected/water layers stream in behind
        // via loadSecondary() — same visible end state, faster first paint.
        isLoading.value = false
      }
    }
    if (token !== loadToken || region.value !== startingRegion) return
    // Detached (callers already have their points) but token-guarded so a
    // region switch mid-flight can never mix datasets.
    void loadSecondary(token, startingRegion)
  }

  /**
   * Heavy secondary layers (polygons, protected areas, analysis, water,
   * cultural) load after first paint. Everything here is fail-soft
   * (recorded in resourceErrors) so one bad file can't blank the map.
   */
  async function loadSecondary(token: number, startingRegion: DataRegion) {
    const alive = () => token === loadToken && region.value === startingRegion
    if (!alive()) return
    const base = normalizedBase()
    const dir = startingRegion === 'pococaldas'
      ? `${base}data/rare-earth/pococaldas/`
      : `${base}data/rare-earth/`

    loadPhase.value = 'polygons'
    loadProgress.value = 50
    await yieldToUI()
    if (!alive()) return
    await loadResource('polygons', `${dir}polygons.geojson`, (data: RareEarthFeatureCollection) => {
      if (!alive()) return
      // Normalize the UPPERCASE polygon schema to canonical scalar props
      // (category/danger/overlaps) so fill colors, popups and the overlap
      // glow all read the same fields as points.
      const holderIndex = pointsData.value ? dangerByHolder(pointsData.value) : new Map()
      polygonsData.value = {
        type: 'FeatureCollection',
        features: (data.features ?? []).map(f => normalizePolygonFeature(
          f as unknown as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>,
          overlapsByProcesso,
          holderIndex,
        ) as unknown as RareEarthFeature),
      }
    })

    await yieldToUI()
    if (!alive()) return

    loadPhase.value = 'protected'
    loadProgress.value = 60
    await Promise.all([
      loadResource('protected', `${dir}protected-areas.geojson`, (data: RareEarthFeatureCollection) => {
        if (!alive()) return
        // Canonicalize `kind` once (ti | quilombo | uc | buffer | other,
        // original kept in `kind_raw`) so map-layer filters, counts,
        // sidebar groups and search all match on the same values.
        for (const f of data.features ?? []) {
          const props = (f as GeoJSON.Feature).properties as Record<string, unknown> | null | undefined
          if (!props || typeof props !== 'object') continue
          const rawKind = (props as Record<string, unknown>).kind
          const rawCat = (props as Record<string, unknown>).category
          const canon = canonicalProtectedKind(rawKind, rawCat)
          if (typeof rawKind === 'string' && rawKind !== canon) {
            (props as Record<string, unknown>).kind_raw = rawKind
          }
          (props as Record<string, unknown>).kind = canon
        }
        protectedData.value = data
      }),
      loadResource('analysis', `${dir}deep_analysis.json`, (data: DeepAnalysis) => { if (alive()) deepAnalysis.value = data }),
      loadResource('water', `${dir}waterbodies.geojson`, (data: GeoJSON.FeatureCollection) => { if (alive()) waterData.value = data }),
      loadResource('cultural', `${dir}cultural-features.geojson`, (data: GeoJSON.FeatureCollection) => { if (alive()) culturalData.value = data }),
    ])
    // Stamp mining-pressure context onto named waters (needs points ready).
    // Locals (not ref reads): the refs were reset to undefined at the top
    // of load(), which poisons narrowing for in-flow reads after awaits.
    // Reassigns the wrapper so the shallowRef notifies downstream watchers.
    const waterFC = waterData.value as GeoJSON.FeatureCollection | undefined
    const pointsFC = pointsData.value as unknown as GeoJSON.FeatureCollection | undefined
    if (waterFC?.features.length && pointsFC?.features.length) {
      const threats = computeWaterThreats(waterFC, pointsFC)
      waterThreats.value = threats
      const enriched = enrichWaterFeatures(waterFC, threats)
      if (enriched) waterData.value = { type: 'FeatureCollection', features: enriched.features }
    }
    if (!alive()) return
    loadProgress.value = 100
    loadPhase.value = 'complete'
  }

  /** Expand from regional to full Brazil dataset */
  async function loadFullBrazil() {
    if (region.value === 'all' && pointsData.value) return
    if (isLoading.value) return
    region.value = 'all'
    isRegional.value = false
    // Invalidate the in-flight regional load so it cannot overwrite Brazil data.
    loadToken++
    await load()
  }

  const speculatorIndex = computed<SpeculatorIndexEntry[]>(() =>
    pointsData.value ? computeSpeculatorIndex(pointsData.value) : [],
  )

  /** Per-layer feature counts for status badges and diagnostics. */
  const layerCounts = computed<ObservatoryLayerCounts>(() => buildLayerCounts({
    points: pointsData.value as GeoJSON.FeatureCollection | undefined,
    polygons: polygonsData.value as GeoJSON.FeatureCollection | undefined,
    protected: protectedData.value as GeoJSON.FeatureCollection | undefined,
    water: waterData.value,
    cultural: culturalData.value,
  }))

  /** Territory-overlap aggregation across claim summaries. */
  const overlapSummary = computed<OverlapSummary>(() => summarizeOverlaps(features.value))

  /** Protected areas split into TI / quilombo / other with display fields. */
  const protectedSummary = computed<ProtectedBreakdown>(() =>
    summarizeProtected(protectedData.value as GeoJSON.FeatureCollection | undefined),
  )

  /** Named-water pressure rollup for the Waters defense section + dossier. */
  const waterSummary = computed<WaterThreatSummary>(() => summarizeWaterThreats(waterThreats.value))

  return {
    pointsData,
    polygonsData,
    protectedData,
    waterData,
    culturalData,
    features,
    speculatorIndex,
    deepAnalysis,
    isLoading,
    loadPhase,
    loadProgress,
    error,
    resourceErrors,
    layerCounts,
    overlapSummary,
    protectedSummary,
    waterThreats,
    waterSummary,
    load,
    loadFullBrazil,
    region,
    isRegional,
  }
}
