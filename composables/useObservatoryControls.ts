import { ref, shallowRef, computed, onMounted, onUnmounted, watch, type Ref } from 'vue'
import type { Map as MapInstance, MapOptions } from 'maplibre-gl'
import type { EnterpriseHQ } from '@/lib/enterprise-data'
import { ENTERPRISES } from '@/lib/enterprise-data'
import { setupEnterpriseLayer, cleanupEnterpriseLayer } from '@/composables/useEnterpriseMarkers'
import { RARE_EARTH_CATEGORIES } from '@/lib/map-utils'
import { useStateHash } from '@/composables/useStateHash'

const isSmallScreen = typeof window !== 'undefined' ? window.innerWidth < 768 : false

export type ObservatoryTabKey = 'danger' | 'military' | 'illegal' | 'env' | 'network' | 'timeline'

export interface ObservatoryFilters {
  yearMin: Ref<number>
  yearMax: Ref<number>
  selectedPhases: Ref<Set<string>>
  searchTerm: Ref<string>
  sobDemandaOnly: Ref<boolean>
  filtersExpanded: Ref<boolean>
  activeTab: Ref<ObservatoryTabKey>
  showShortcuts: Ref<boolean>
  showDataTable: Ref<boolean>
  showTimeline: Ref<boolean>
  showExport: Ref<boolean>
  showGeoLocate: Ref<boolean>
  showClaimReport: Ref<boolean>
  reportClaim: Ref<{ p?: string; n?: string; u?: string; s?: string; la?: number; lo?: number; [key: string]: unknown } | null>
  userLocationRadius: Ref<number>
  mapContainerRef: Ref<HTMLElement | null>
  debouncedFilter: () => void
  updateFilter: () => void
}

export interface ObservatoryLayers {
  layerVis: Ref<Record<string, boolean>>
  enterpriseLayerVisible: Ref<boolean>
  extraLayers: Array<{ key: string; labelKey: string; color: string }>
  toggleLayer: (key: string) => void
  toggleEnterpriseLayer: () => void
  onEnterpriseClick: (enterprise: EnterpriseHQ) => void
}

export interface ObservatoryMap {
  flyToTarget: Ref<{ lng: number; lat: number; zoom?: number } | null>
  mapRef: Ref<MapInstance | null>
  onMapInit: (map: MapInstance) => void
  flyToCoord: (coord: [number, number]) => void
  onGeoLocate: (lat: number, lng: number, _city: string) => void
  expandToFullBrazil: (loadFn?: () => Promise<void> | void) => Promise<void> | void
  zoomToDanger: (name: string, speculatorIndex?: Ref<{ normalizedName: string; displayName: string; centroid?: { lng: number; lat: number } }[]>) => void
  flyToEnterprise: (name: string) => void
  onEnterpriseClick: (enterprise: EnterpriseHQ) => void
}

export interface ObservatoryAnimations {
  displayCounts: Ref<Record<string, number>>
  startCounterAnimation: () => void
  animatedCount: (categoryKey: string, target: number) => number
  animateCounters: () => void
  totalCount: Ref<number>
}

export interface ObservatoryData {
  allFeatures: Ref<unknown[]>
  pointsData: Ref<GeoJSON.FeatureCollection | undefined>
  filteredPoints: Ref<GeoJSON.FeatureCollection>
  polygonsData: Ref<unknown>
  protectedData: Ref<unknown>
  waterData: Ref<unknown>
  culturalData: Ref<unknown>
  speculatorIndex: Ref<unknown[]>
  deepAnalysis: Ref<{ last_sync?: string; sigilo_stats?: { total: number; total_area_ha: number } } | null | undefined>
  isLoading: Ref<boolean>
  loadPhase: Ref<string>
  loadProgress: Ref<number>
  error: Ref<{ message?: string } | null | undefined>
  loadRareEarthData: () => Promise<void> | void
  loadFullBrazil: () => Promise<void> | void
  isRegional: Ref<boolean>
  setupObservatory: (data: {
    allFeatures: Ref<unknown[]>
    pointsData: Ref<GeoJSON.FeatureCollection | undefined>
    polygonsData: Ref<unknown>
    protectedData: Ref<unknown>
    waterData: Ref<unknown>
    culturalData: Ref<unknown>
    speculatorIndex: Ref<unknown[]>
    deepAnalysis: Ref<{ last_sync?: string; sigilo_stats?: { total: number; total_area_ha: number } } | null | undefined>
    isLoading: Ref<boolean>
    loadPhase: Ref<string>
    loadProgress: Ref<number>
    error: Ref<{ message?: string } | null | undefined>
    loadRareEarthData: () => Promise<void> | void
    loadFullBrazil: () => Promise<void> | void
    isRegional: Ref<boolean>
  }) => void
}

export interface ObservatoryStats {
  categoryStats: Ref<{ key: string; label: string; color: string; count: number }[]>
  totalCount: Ref<number>
  filteredCount: Ref<number>
  activeFilterCount: Ref<number>
  activeFilterSummary: Ref<string>
  formatSyncDate: (iso?: string) => string
  formatHa: (ha: number) => string
}

export interface ObservatoryHash {
  restoredState: Ref<unknown | null>
  updateHash: (state: Record<string, unknown>) => void
}

export interface ObservatoryKeyboard {
  handleKeydown: (e: KeyboardEvent) => void
}

export interface ObservatoryFilterLogic {
  debouncedFilter: () => void
  updateFilter: () => void
}

export interface ObservatoryControls extends ObservatoryFilters, ObservatoryLayers, ObservatoryMap, ObservatoryAnimations, ObservatoryData, ObservatoryStats, ObservatoryHash, ObservatoryKeyboard, ObservatoryFilterLogic {}

export function useObservatoryControls(): ObservatoryControls {
  // ---- filters ----
  const yearMin = ref(1935)
  const yearMax = ref(2026)
  const selectedPhases = ref(new Set<string>([
    'REQUERIMENTO',
    'REQUERIMENTO DE PESQUISA',
    'AUTORIZAÇÃO DE PESQUISA',
    'DISPONIBILIDADE',
    'LICENCIAMENTO',
    'CONCESSÃO',
    'LAVRA',
  ]))
  const searchTerm = ref('')
  const sobDemandaOnly = ref(false)
  const filtersExpanded = ref(!isSmallScreen)
  const activeTab = ref<ObservatoryTabKey>('danger')
  const showShortcuts = ref(false)
  const showDataTable = ref(false)
  const showTimeline = ref(false)
  const showExport = ref(false)
  const showGeoLocate = ref(false)
  const showClaimReport = ref(false)
  const reportClaim = ref<{ p?: string; n?: string; u?: string; s?: string; la?: number; lo?: number; [key: string]: unknown } | null>(null)
  const userLocationRadius = ref(0)
  const mapContainerRef = ref<HTMLElement | null>(null)
  const filteredCount = ref(0)

  // ---- layers ----
  const layerVis = ref<Record<string, boolean>>({})
  const categories = Object.entries(RARE_EARTH_CATEGORIES) as [string, { label: string; color: string }][]
  categories.forEach(([key]) => { layerVis.value[key] = true })
  layerVis.value['protected_ti'] = true
  layerVis.value['protected_quilombo'] = true
  layerVis.value['overlaps'] = true
  layerVis.value['enterprise_hq'] = false
  layerVis.value['heatmap'] = false
  layerVis.value['cultural'] = false
  layerVis.value['sites'] = false
  layerVis.value['polygons'] = true
  layerVis.value['water'] = true
  layerVis.value['network'] = true
  layerVis.value['cities'] = true

  const extraLayers = [
    { key: 'polygons', labelKey: 'observatory.layers.polygons', color: '#e74c3c' },
    { key: 'water', labelKey: 'observatory.layers.hydrography', color: '#3498db' },
    { key: 'sites', labelKey: 'observatory.layers.conflictZones', color: '#c0392b' },
    { key: 'network', labelKey: 'observatory.layers.corpNetwork', color: '#5dade2' },
    { key: 'heatmap', labelKey: 'observatory.layers.heatmap', color: '#f39c12' },
    { key: 'cultural', labelKey: 'observatory.layers.cultural', color: '#9b59b6' },
  ]

  const enterpriseLayerVisible = ref(false)

  function toggleLayer(key: string) {
    const newVal = !layerVis.value[key]
    layerVis.value = { ...layerVis.value, [key]: newVal }
    if (key === 'enterprise_hq') {
      enterpriseLayerVisible.value = newVal
      const m = mapRef.value
      if (m) {
        if (enterpriseLayerVisible.value) {
          setupEnterpriseLayer(m, onEnterpriseClick, speculatorIndex.value as { normalizedName: string; centroid: { lng: number; lat: number } | null }[])
        } else {
          cleanupEnterpriseLayer(m)
        }
      }
    }
    debouncedFilter()
  }

  function toggleEnterpriseLayer() {
    toggleLayer('enterprise_hq')
  }

  const onEnterpriseClick = ((_enterprise: EnterpriseHQ) => {
    // Handled by page-level flyToEnterprise callback
  }) as (_enterprise: EnterpriseHQ) => void

  // ---- map ----
  const flyToTarget = ref<{ lng: number; lat: number; zoom?: number } | null>(null)
  const mapRef = shallowRef<MapInstance | null>(null)

  function onMapInit(map: MapInstance) {
    mapRef.value = map
  }

  function flyToCoord(coord: [number, number]) {
    flyToTarget.value = { lng: coord[0], lat: coord[1], zoom: 8 }
  }

  function onGeoLocate(_lat: number, _lng: number, _city: string) {
    flyToTarget.value = { lng: _lng, lat: _lat, zoom: 7 }
    userLocationRadius.value = 1
  }

  async function expandToFullBrazil(loadFn?: () => Promise<void> | void) {
    if (loadFn) await loadFn()
    flyToTarget.value = { lng: -48, lat: -15, zoom: 4.2 }
  }

  function zoomToDanger(name: string, _speculatorIndex?: Ref<{ normalizedName: string; displayName: string; centroid?: { lng: number; lat: number } }[]>) {
    const idx = (_speculatorIndex ?? speculatorIndex).value as { normalizedName: string; displayName: string; centroid?: { lng: number; lat: number } | null }[]
    const target = idx.find(s =>
      s.normalizedName === name ||
      s.displayName.toLowerCase().split('/')[0].trim() === name.toLowerCase().split('/')[0].trim()
    )
    if (target?.centroid) {
      flyToTarget.value = { lng: target.centroid.lng, lat: target.centroid.lat, zoom: 9 }
      return
    }
  }

  function flyToEnterprise(name: string) {
    const normalized = name.toUpperCase().split(' ')[0]
    const idx = speculatorIndex.value as { normalizedName: string; displayName: string; centroid?: { lng: number; lat: number } | null }[]
    const specEntry = idx.find(s =>
      s.normalizedName.includes(normalized) ||
      name.toUpperCase().includes(s.displayName.split('/')[0].trim().split(' ')[0])
    )
    if (specEntry?.centroid) {
      flyToTarget.value = { lng: specEntry.centroid.lng, lat: specEntry.centroid.lat, zoom: 6 }
      return
    }
    const ent = ENTERPRISES.find(e => e.name === name || name.includes(e.name))
    if (ent) {
      flyToTarget.value = { lng: ent.lng, lat: ent.lat, zoom: 6 }
    }
  }

  // ---- data placeholders ----
  // Pages MUST provide these via setupObservatory(dataBindings)
  let allFeatures: Ref<unknown[]> = ref<unknown[]>([])
  let pointsData: Ref<GeoJSON.FeatureCollection | undefined> = ref<GeoJSON.FeatureCollection | undefined>(undefined)
  let polygonsData: Ref<unknown> = ref<unknown>(null)
  let protectedData: Ref<unknown> = ref<unknown>(null)
  let waterData: Ref<unknown> = ref<unknown>(null)
  let culturalData: Ref<unknown> = ref<unknown>(null)
  let speculatorIndex: Ref<unknown[]> = ref<unknown[]>([])
  let deepAnalysis: Ref<{ last_sync?: string; sigilo_stats?: { total: number; total_area_ha: number } } | null | undefined> = ref<{ last_sync?: string; sigilo_stats?: { total: number; total_area_ha: number } } | null | undefined>(null)
  let isLoading: Ref<boolean> = ref(false)
  let loadPhase: Ref<string> = ref('idle')
  let loadProgress: Ref<number> = ref(0)
  let error: Ref<{ message?: string } | null | undefined> = ref<{ message?: string } | null | undefined>(null)
  let loadRareEarthData: () => Promise<void> | void = () => Promise.resolve()
  let loadFullBrazil: () => Promise<void> | void = () => Promise.resolve()
  let isRegional: Ref<boolean> = ref(true)

  function setupObservatory(data: {
    allFeatures: Ref<unknown[]>
    pointsData: Ref<GeoJSON.FeatureCollection | undefined>
    polygonsData: Ref<unknown>
    protectedData: Ref<unknown>
    waterData: Ref<unknown>
    culturalData: Ref<unknown>
    speculatorIndex: Ref<unknown[]>
    deepAnalysis: Ref<{ last_sync?: string; sigilo_stats?: { total: number; total_area_ha: number } } | null | undefined>
    isLoading: Ref<boolean>
    loadPhase: Ref<string>
    loadProgress: Ref<number>
    error: Ref<{ message?: string } | null | undefined>
    loadRareEarthData: () => Promise<void> | void
    loadFullBrazil: () => Promise<void> | void
    isRegional: Ref<boolean>
  }) {
    allFeatures = data.allFeatures
    pointsData = data.pointsData
    polygonsData = data.polygonsData
    protectedData = data.protectedData
    waterData = data.waterData
    culturalData = data.culturalData
    speculatorIndex = data.speculatorIndex
    deepAnalysis = data.deepAnalysis
    isLoading = data.isLoading
    loadPhase = data.loadPhase
    loadProgress = data.loadProgress
    error = data.error
    loadRareEarthData = data.loadRareEarthData
    loadFullBrazil = data.loadFullBrazil
    isRegional = data.isRegional

    // Initialize filteredPoints with the full dataset so the map has data immediately
    const raw = pointsData.value
    if (raw?.features?.length) {
      filteredPoints.value = raw as GeoJSON.FeatureCollection
      filteredCount.value = raw.features.length
    }
  }

  // ---- animations ----
  const displayCounts = ref<Record<string, number>>({})
  let counterRaf: number | null = null

  function animatedCount(categoryKey: string, target: number): number {
    return displayCounts.value[categoryKey] ?? target
  }

  function animateCounters() {
    let anyChanged = false
    const allKeys: Array<{ key: string; target: number }> = [
      ...categoryStats.value.map(s => ({ key: s.key, target: s.count })),
      { key: '__total', target: totalCount.value },
    ]
    for (const { key, target } of allKeys) {
      const current = displayCounts.value[key] ?? 0
      if (current === target) continue
      const diff = target - current
      const step = Math.ceil(Math.abs(diff) / 10)
      displayCounts.value[key] = diff > 0 ? Math.min(current + step, target) : Math.max(current - step, target)
      anyChanged = true
    }
    if (anyChanged) {
      counterRaf = requestAnimationFrame(tick)
    }
  }

  function tick() { animateCounters() }

  function startCounterAnimation() {
    if (counterRaf) cancelAnimationFrame(counterRaf)
    counterRaf = requestAnimationFrame(tick)
  }

  // ---- stats ----
  const categoryStats = computed(() => {
    const counts: Record<string, number> = {}
    categories.forEach(([key]) => { counts[key] = 0 })
    ;(allFeatures.value as Array<{ c?: string }>).forEach((d) => { const k = d.c; if (k && counts[k] !== undefined) counts[k]++ })
    return categories.map(([key, val]) => ({ key, label: val.label.split(' ')[0], color: val.color, count: counts[key] || 0 }))
  })

  const totalCount = computed(() => allFeatures.value.length)

  const activeFilterCount = computed(() => {
    let count = 0
    if (yearMin.value > 1935 || yearMax.value < 2026) count++
    if (selectedPhases.value.size < 7) count++
    if (sobDemandaOnly.value) count++
    if (searchTerm.value.trim()) count++
    return count
  })

  const activeFilterSummary = computed(() => {
    const parts: string[] = []
    if (yearMin.value > 1935 || yearMax.value < 2026) parts.push(`${yearMin.value}-${yearMax.value}`)
    if (selectedPhases.value.size < 7) parts.push(`${selectedPhases.value.size} phases`)
    if (sobDemandaOnly.value) parts.push('Sob Demanda')
    if (searchTerm.value.trim()) parts.push(`"${searchTerm.value.trim()}"`)
    return parts.join(', ') || 'All claims'
  })

  function formatSyncDate(iso?: string): string {
    if (!iso) return '—'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    const days = Math.floor((Date.now() - d.getTime()) / 86_400_000)
    if (days <= 0) return 'today'
    if (days === 1) return '1d ago'
    if (days < 30) return `${days}d ago`
    if (days < 365) return `${Math.floor(days / 30)}mo ago`
    return `${Math.floor(days / 365)}y ago`
  }

  function formatHa(ha: number): string {
    if (ha >= 1_000_000) return `${(ha / 1_000_000).toFixed(1)}M`
    if (ha >= 1000) return `${Math.round(ha / 1000)}K`
    return `${ha}`
  }

  // ---- hash / URL state ----
  const { restoredState, updateHash } = useStateHash()

  let hashTimer: ReturnType<typeof setTimeout> | null = null

  function scheduleHashUpdate() {
    if (hashTimer) clearTimeout(hashTimer)
    hashTimer = setTimeout(() => {
      updateHash({
        yearMin: yearMin.value > 1935 ? yearMin.value : undefined,
        yearMax: yearMax.value < 2026 ? yearMax.value : undefined,
        phases: selectedPhases.value.size < 7 ? Array.from(selectedPhases.value) : undefined,
        heatmap: layerVis.value['heatmap'] || undefined,
        enterprise: layerVis.value['enterprise_hq'] || undefined,
        tab: activeTab.value !== 'danger' ? activeTab.value : undefined,
      })
    }, 500)
  }

  watch([yearMin, yearMax], scheduleHashUpdate)
  watch(selectedPhases, scheduleHashUpdate, { deep: true })
  watch(() => layerVis.value['heatmap'], scheduleHashUpdate)
  watch(() => layerVis.value['enterprise_hq'], scheduleHashUpdate)
  watch(activeTab, scheduleHashUpdate)
  watch(totalCount, () => { animateCounters() })

  // ---- derived points data ----
  const filteredPoints = ref<GeoJSON.FeatureCollection>({ type: 'FeatureCollection', features: [] })
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  function debouncedFilter() {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(updateFilter, 250)
  }

  function updateFilter() {
    const term = searchTerm.value.toLowerCase().trim()
    const catKeys = Object.keys(RARE_EARTH_CATEGORIES) as string[]
    const visKeys = Object.entries(layerVis.value).filter(([k, v]) => v && catKeys.includes(k)).map(([k]) => k)
    const allFeaturesTyped = allFeatures.value as Array<{ c: string; n: string; s: string; u: string; p: string; f: string; lo: number; la: number; net?: string; y?: number; dsprocesso?: string }>
    const filtered = allFeaturesTyped.filter((d) => {
      if (!visKeys.includes(d.c)) return false
      if (term) {
        const fields = `${d.n} ${d.s} ${d.u} ${d.p} ${d.f} ${d.net || ''} ${d.dsprocesso || ''}`.toLowerCase()
        if (!fields.includes(term)) return false
      }
      if (typeof d.y === 'number') {
        if (d.y < yearMin.value || d.y > yearMax.value) return false
      }
      const phaseField = typeof d.f === 'string' ? d.f : ''
      if (!selectedPhases.value.has(phaseField)) return false
      if (sobDemandaOnly.value && !String(d.dsprocesso || '').includes('DEMANDA')) return false
      return true
    })
    filteredCount.value = filtered.length
    filteredPoints.value = {
      type: 'FeatureCollection',
      features: filtered.map((d, i) => ({
        type: 'Feature',
        id: `${d.c}-${i}`,
        properties: { ...d, id: `${d.c}-${i}` },
        geometry: { type: 'Point', coordinates: [d.lo, d.la] },
      })),
    }
  }

  watch(pointsData, () => {
    updateFilter()
  })

  // ---- keyboard ----
  function handleKeydown(e: KeyboardEvent) {
    if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return

    if (e.key === '?' || (e.shiftKey && e.key === '/')) {
      e.preventDefault()
      showShortcuts.value = !showShortcuts.value
      return
    }

    if (e.key === 't' || e.key === 'T') {
      showDataTable.value = !showDataTable.value
      return
    }

    if (e.key === 'Escape') {
      showShortcuts.value &&= false
      showDataTable.value &&= false
      showTimeline.value &&= false
      showExport.value &&= false
      showGeoLocate.value &&= false
      showClaimReport.value &&= false
      if (searchTerm.value) {
        searchTerm.value = ''
        debouncedFilter()
      }
      return
    }
  }

  onUnmounted(() => {
    if (counterRaf) cancelAnimationFrame(counterRaf)
    if (debounceTimer) clearTimeout(debounceTimer)
    if (hashTimer) clearTimeout(hashTimer)
  })

  return {
    // filters
    yearMin, yearMax, selectedPhases, searchTerm, sobDemandaOnly, filtersExpanded, activeTab,
    showShortcuts, showDataTable, showTimeline, showExport, showGeoLocate, showClaimReport,
    reportClaim, userLocationRadius, mapContainerRef, filteredCount,
    // layers
    layerVis, enterpriseLayerVisible, extraLayers, toggleLayer, toggleEnterpriseLayer, onEnterpriseClick,
    // map
    flyToTarget, mapRef, onMapInit, flyToCoord, onGeoLocate, expandToFullBrazil, zoomToDanger, flyToEnterprise,
    // data
    allFeatures, pointsData, filteredPoints, polygonsData, protectedData, waterData, culturalData,
    speculatorIndex, deepAnalysis, isLoading, loadPhase, loadProgress, error,
    loadRareEarthData, loadFullBrazil, isRegional, setupObservatory,
    // stats
    categoryStats, totalCount, activeFilterCount, activeFilterSummary, formatSyncDate, formatHa,
    // animations
    displayCounts, startCounterAnimation, animatedCount, animateCounters,
    // hash
    restoredState, updateHash,
    // keyboard
    handleKeydown,
    // filter logic
    debouncedFilter, updateFilter,
  }
}
