import { shallowRef, ref, computed } from 'vue'
import { computeSpeculatorIndex, type RareEarthFeature, type RareEarthFeatureCollection, type SpeculatorIndexEntry } from '@/lib/observatory-analysis'

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
  const features = ref<RareEarthFeatureSummary[]>([])
  const deepAnalysis = shallowRef<DeepAnalysis | undefined>(undefined)
  const isLoading = ref(false)
  const loadPhase = ref<LoadPhase>('idle')
  const loadProgress = ref(0)
  const error = ref<Error | null>(null)
  const isRegional = ref(initialRegion === 'pococaldas')
  let overlapsByProcesso: Record<string, Array<{ name: string; kind: string; distance_km: number }>> = {}

  function dataDir(): string {
    return region.value === 'pococaldas'
      ? `${baseURL}data/rare-earth/pococaldas/`
      : `${baseURL}data/rare-earth/`
  }

  function transformPoints(pointsGJ: RareEarthFeatureCollection): RareEarthFeatureSummary[] {
    return pointsGJ.features.map((f: RareEarthFeature) => {
      const p = f.properties
      return {
        p: String(p.processo ?? ''),
        n: String(p.nome ?? ''),
        s: String(p.subs ?? ''),
        c: String(p.category ?? ''),
        f: String(p.fase ?? ''),
        u: String(p.uf ?? ''),
        a: Number(p.area_ha ?? 0),
        ds: Number(p.danger_score ?? 0),
        net: String(p.network_id ?? ''),
        y: Number(p.ano ?? 0),
        lo: ((f.geometry as GeoJSON.Point)?.coordinates?.[0] as number) ?? 0,
        la: ((f.geometry as GeoJSON.Point)?.coordinates?.[1] as number) ?? 0,
        ov: overlapsByProcesso[String(p.processo ?? '')] || null,
        dsprocesso: String(p.dsprocesso ?? ''),
      }
    })
  }

  // Track individual resource errors for isolation
  const resourceErrors = ref<Record<string, string>>({})

  async function loadResource<T>(name: string, url: string, setter: (_data: T) => void): Promise<T | null> {
    try {
      const res = await fetch(url)
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
    isLoading.value = true
    loadPhase.value = 'points'
    loadProgress.value = 0
    error.value = null
    resourceErrors.value = {}
    const dir = dataDir()

    // Phase 1: Load points immediately (critical for map display)
    const pointsRes = await fetch(`${dir}points.geojson`).catch(() => null)
    if (!pointsRes?.ok) {
      error.value = new Error('Failed to load points data — cannot render map')
      isLoading.value = false
      return
    }
    const pointsGJ = (await pointsRes.json()) as RareEarthFeatureCollection
    features.value = transformPoints(pointsGJ)
    pointsData.value = pointsGJ
    loadProgress.value = 20

    // Defer remaining loads until after first paint
    await new Promise(resolve => requestAnimationFrame(resolve))

    // Phase 2: Load overlaps (needed for popup enrichment)
    loadPhase.value = 'overlaps'
    loadProgress.value = 30
    const overlapsUrl = region.value === 'pococaldas'
      ? `${dir}points_overlaps.geojson`
      : `${dir}points_with_overlaps.geojson`
    const overlapsRes = await fetch(overlapsUrl).catch(() => null)
    if (overlapsRes?.ok) {
      const overlapsGJ = await overlapsRes.json()
      overlapsByProcesso = {}
      for (const f of overlapsGJ.features) {
        const proc = (f.properties as Record<string, unknown>)?.processo
        if (proc && Array.isArray((f.properties as Record<string, unknown>).overlaps) && ((f.properties as Record<string, unknown>).overlaps as unknown[]).length) {
          overlapsByProcesso[proc as string] = (f.properties as Record<string, unknown>).overlaps as Array<{ name: string; kind: string; distance_km: number }>
        }
      }
      features.value = features.value.map(f => ({ ...f, ov: overlapsByProcesso[f.p] || null }))
    }

    // Phase 3: Load polygons (heavy, for polygon layers)
    loadProgress.value = 50
    await loadResource('polygons', `${dir}polygons.geojson`, (data: RareEarthFeatureCollection) => { polygonsData.value = data })

    await new Promise(resolve => requestAnimationFrame(resolve))

    // Phase 4: Load protected areas + deep analysis + waterbodies + cultural features
    loadPhase.value = 'protected'
    loadProgress.value = 60
    await Promise.all([
      loadResource('protected', `${dir}protected-areas.geojson`, (data: RareEarthFeatureCollection) => { protectedData.value = data }),
      loadResource('analysis', `${dir}deep_analysis.json`, (data: DeepAnalysis) => { deepAnalysis.value = data }),
      loadResource('water', `${dir}waterbodies.geojson`, (data: GeoJSON.FeatureCollection) => { waterData.value = data }),
      loadResource('cultural', `${dir}cultural-features.geojson`, (data: GeoJSON.FeatureCollection) => { culturalData.value = data }),
    ])
    loadProgress.value = 100

    loadPhase.value = 'complete'
    isLoading.value = false
  }

  /** Expand from regional to full Brazil dataset */
  async function loadFullBrazil() {
    if (region.value === 'all' && pointsData.value) return
    region.value = 'all'
    isRegional.value = false
    await load()
  }

  const speculatorIndex = computed<SpeculatorIndexEntry[]>(() =>
    pointsData.value ? computeSpeculatorIndex(pointsData.value) : [],
  )

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
    load,
    loadFullBrazil,
    region,
    isRegional,
  }
}
