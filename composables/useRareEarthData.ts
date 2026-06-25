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

export function useRareEarthData(baseURL: string) {
  const pointsData = shallowRef<RareEarthFeatureCollection | undefined>(undefined)
  const polygonsData = shallowRef<RareEarthFeatureCollection | undefined>(undefined)
  const protectedData = shallowRef<RareEarthFeatureCollection | undefined>(undefined)
  const features = ref<RareEarthFeatureSummary[]>([])
  const deepAnalysis = shallowRef<DeepAnalysis | undefined>(undefined)
  const isLoading = ref(false)
  const loadPhase = ref<LoadPhase>('idle')
  const loadProgress = ref(0)
  const error = ref<Error | null>(null)
  let overlapsByProcesso: Record<string, Array<{ name: string; kind: string; distance_km: number }>> = {}

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

  async function load() {
    if (isLoading.value) return
    isLoading.value = true
    loadPhase.value = 'points'
    loadProgress.value = 0
    error.value = null
    try {
      // Phase 1: Load points immediately (critical for map display)
      const pointsRes = await fetch(`${baseURL}data/rare-earth/points.geojson`)
      if (!pointsRes.ok) throw new Error('Failed to load points')
      const pointsGJ = (await pointsRes.json()) as RareEarthFeatureCollection
      features.value = transformPoints(pointsGJ)
      pointsData.value = pointsGJ
      loadProgress.value = 20

      // Defer remaining loads until after first paint
      await new Promise(resolve => requestAnimationFrame(resolve))
      await new Promise(resolve => setTimeout(resolve, 0))

      // Phase 2: Load overlaps (needed for popup enrichment)
      loadPhase.value = 'overlaps'
      loadProgress.value = 30
      const overlapsRes = await fetch(`${baseURL}data/rare-earth/points_with_overlaps.geojson`).catch(() => null)
      if (overlapsRes && overlapsRes.ok) {
        const overlapsGJ = await overlapsRes.json()
        overlapsByProcesso = {}
        for (const f of overlapsGJ.features) {
          const proc = (f.properties as Record<string, unknown>)?.processo
          if (proc && Array.isArray((f.properties as Record<string, unknown>).overlaps) && ((f.properties as Record<string, unknown>).overlaps as unknown[]).length) {
            overlapsByProcesso[proc as string] = (f.properties as Record<string, unknown>).overlaps as Array<{ name: string; kind: string; distance_km: number }>
          }
        }
        // Re-enrich features with overlap data
        features.value = features.value.map(f => ({
          ...f,
          ov: overlapsByProcesso[f.p] || null,
        }))
      }

      // Phase 3: Load polygons (heavy, for polygon layers)
      loadProgress.value = 50
      const polysRes = await fetch(`${baseURL}data/rare-earth/polygons.geojson`).catch(() => null)
      if (polysRes && polysRes.ok) {
        polygonsData.value = await polysRes.json()
      }

      await new Promise(resolve => setTimeout(resolve, 0))

      // Phase 4: Load protected areas + deep analysis
      loadPhase.value = 'protected'
      loadProgress.value = 70
      const [protectedRes, analysisRes] = await Promise.all([
        fetch(`${baseURL}data/rare-earth/protected-areas.geojson`).catch(() => null),
        fetch(`${baseURL}data/rare-earth/deep_analysis.json`).catch(() => null),
      ])
      loadProgress.value = 90

      if (protectedRes && protectedRes.ok) protectedData.value = await protectedRes.json()
      if (analysisRes && analysisRes.ok) deepAnalysis.value = await analysisRes.json()

      loadPhase.value = 'complete'
      loadProgress.value = 100
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e))
    } finally {
      isLoading.value = false
    }
  }

  const speculatorIndex = computed<SpeculatorIndexEntry[]>(() =>
    pointsData.value ? computeSpeculatorIndex(pointsData.value) : [],
  )

  return {
    pointsData,
    polygonsData,
    protectedData,
    features,
    speculatorIndex,
    deepAnalysis,
    isLoading,
    loadPhase,
    loadProgress,
    error,
    load,
  }
}
