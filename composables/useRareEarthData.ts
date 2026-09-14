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
   */
  function normalizeAll(
    pointsGJ: RareEarthFeatureCollection,
    overlaps: OverlapsByProcesso,
    holderIndex: Map<string, SpeculatorIndexEntry>,
  ): { fc: RareEarthFeatureCollection; summaries: RareEarthFeatureSummary[] } {
    const summaries: RareEarthFeatureSummary[] = []
    const features = pointsGJ.features.map((f: RareEarthFeature) => {
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
      return norm as unknown as RareEarthFeature
    })
    return { fc: { type: 'FeatureCollection', features }, summaries }
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
    const dir = dataDir()

    try {
      // Points are critical: two attempts, then a surfaced error. Everything
      // else below is fail-soft (recorded in resourceErrors, shown in the
      // layer-status panel) so one bad file can't blank the whole observatory.
      let pointsRes: Response | null = null
      for (let attempt = 1; attempt <= 2 && !pointsRes?.ok; attempt++) {
        try {
          pointsRes = await fetchWithTimeout(`${dir}points.geojson`)
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
      // Fresh region → drop stale overlap index before transform.
      overlapsByProcesso = {}
      const holderIndex = dangerByHolder(pointsGJ)
      const normalized = normalizeAll(pointsGJ, overlapsByProcesso, holderIndex)
      features.value = normalized.summaries
      pointsData.value = normalized.fc
      loadProgress.value = 20

      await yieldToUI()
      if (token !== loadToken || region.value !== startingRegion) return

      loadPhase.value = 'overlaps'
      loadProgress.value = 30
      const overlapsUrl = region.value === 'pococaldas'
        ? `${dir}points_overlaps.geojson`
        : `${dir}points_with_overlaps.geojson`
      const overlapsRes = await fetchWithTimeout(overlapsUrl, 30000).catch(() => null)
      if (overlapsRes?.ok) {
        const overlapsGJ = await overlapsRes.json()
        overlapsByProcesso = {}
        for (const f of overlapsGJ.features ?? []) {
          const proc = (f.properties as Record<string, unknown>)?.processo
          if (proc && Array.isArray((f.properties as Record<string, unknown>).overlaps) && ((f.properties as Record<string, unknown>).overlaps as unknown[]).length) {
            overlapsByProcesso[proc as string] = (f.properties as Record<string, unknown>).overlaps as Array<{ name: string; kind: string; distance_km: number }>
          }
        }
        // Rebuild normalized points from the RAW source now that overlaps
        // are known, so danger scores and overlap counters include
        // territory pressure (normalization is idempotent).
        const rebuilt = normalizeAll(pointsGJ, overlapsByProcesso, holderIndex)
        features.value = rebuilt.summaries
        pointsData.value = rebuilt.fc
      }
      if (token !== loadToken || region.value !== startingRegion) return

      loadProgress.value = 50
      await loadResource('polygons', `${dir}polygons.geojson`, (data: RareEarthFeatureCollection) => {
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
      if (token !== loadToken || region.value !== startingRegion) return

      loadPhase.value = 'protected'
      loadProgress.value = 60
      await Promise.all([
        loadResource('protected', `${dir}protected-areas.geojson`, (data: RareEarthFeatureCollection) => { protectedData.value = data }),
        loadResource('analysis', `${dir}deep_analysis.json`, (data: DeepAnalysis) => { deepAnalysis.value = data }),
        loadResource('water', `${dir}waterbodies.geojson`, (data: GeoJSON.FeatureCollection) => { waterData.value = data }),
        loadResource('cultural', `${dir}cultural-features.geojson`, (data: GeoJSON.FeatureCollection) => { culturalData.value = data }),
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
      if (token !== loadToken || region.value !== startingRegion) return
      loadProgress.value = 100

      loadPhase.value = 'complete'
    } finally {
      if (token === loadToken && region.value === startingRegion) {
        isLoading.value = false
      }
    }
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
