import { shallowRef, ref, computed, type Ref } from 'vue'
import { computeSpeculatorIndex, type RareEarthFeatureCollection, type SpeculatorIndexEntry } from '@/lib/observatory-analysis'

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

export function useRareEarthData(baseURL: string) {
  const pointsData = shallowRef<RareEarthFeatureCollection | undefined>(undefined)
  const polygonsData = shallowRef<RareEarthFeatureCollection | undefined>(undefined)
  const protectedData = shallowRef<RareEarthFeatureCollection | undefined>(undefined)
  const features = ref<RareEarthFeatureSummary[]>([])
  const deepAnalysis = shallowRef<DeepAnalysis | undefined>(undefined)
  const isLoading = ref(false)
  const error = ref<Error | null>(null)
  let overlapsByProcesso: Record<string, Array<{ name: string; kind: string; distance_km: number }>> = {}

  async function load() {
    if (isLoading.value) return
    isLoading.value = true
    error.value = null
    try {
      const [pointsRes, polysRes, protectedRes, overlapsRes, analysisRes] = await Promise.all([
        fetch(`${baseURL}data/rare-earth/points.geojson`),
        fetch(`${baseURL}data/rare-earth/polygons.geojson`).catch(() => null),
        fetch(`${baseURL}data/rare-earth/protected-areas.geojson`).catch(() => null),
        fetch(`${baseURL}data/rare-earth/points_with_overlaps.geojson`).catch(() => null),
        fetch(`${baseURL}data/rare-earth/deep_analysis.json`).catch(() => null),
      ])
      if (!pointsRes.ok) throw new Error('Failed to load points')
      const pointsGJ = (await pointsRes.json()) as RareEarthFeatureCollection
      if (overlapsRes && overlapsRes.ok) {
        const overlapsGJ = await overlapsRes.json()
        overlapsByProcesso = {}
        for (const f of overlapsGJ.features) {
          const proc = (f.properties as any)?.processo
          if (proc && Array.isArray((f.properties as any).overlaps) && (f.properties as any).overlaps.length) {
            overlapsByProcesso[proc] = (f.properties as any).overlaps
          }
        }
      }
      features.value = pointsGJ.features.map((f: any) => ({
        p: f.properties.processo,
        n: f.properties.nome,
        s: f.properties.subs,
        c: f.properties.category,
        f: f.properties.fase,
        u: f.properties.uf,
        a: f.properties.area_ha ?? 0,
        ds: f.properties.danger_score ?? 0,
        net: f.properties.network_id ?? '',
        y: f.properties.ano ?? 0,
        lo: f.geometry.coordinates[0] ?? 0,
        la: f.geometry.coordinates[1] ?? 0,
        ov: overlapsByProcesso[f.properties.processo] || null,
      }))
      pointsData.value = pointsGJ
      if (polysRes && polysRes.ok) polygonsData.value = await polysRes.json()
      if (protectedRes && protectedRes.ok) protectedData.value = await protectedRes.json()
      if (analysisRes && analysisRes.ok) deepAnalysis.value = await analysisRes.json()
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e))
      console.error('Failed to load rare earth data:', error.value)
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
    error,
    load,
  }
}
