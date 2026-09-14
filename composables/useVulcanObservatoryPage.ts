/**
 * composables/useVulcanObservatoryPage.ts
 * @why Vulcan observatory page state — combines observatory data, filters, selection, and map layers
 * @functions useVulcanObservatoryPage
 * @deps vue (ref, computed, watch, onMounted, onUnmounted); @/composables/useObservatoryControls (useObservatoryControls, type ObservatoryData, type ObservatoryTabKey); @/composables/useObservatorySelection (useObservatorySelection); @/composables/useRareEarthData (useRareEarthData, type DataRegion); @/composables/useCulturalAgentsData (useCulturalAgentsData)
 * @connections pages/vulcan-observatory/3d.vue, pages/vulcan-observatory/index.vue
 */
import { ref, shallowRef, computed, watch, onMounted, onUnmounted } from 'vue'
import type maplibregl from 'maplibre-gl'
import { useObservatoryControls, type ObservatoryData, type ObservatoryTabKey } from '@/composables/useObservatoryControls'
import { useObservatorySelection } from '@/composables/useObservatorySelection'
import { useRareEarthData, type DataRegion } from '@/composables/useRareEarthData'
import { useCulturalAgentsData } from '@/composables/useCulturalAgentsData'
import { normalizeName } from '@/lib/observatory-analysis'
import { foreignHolderRanking, type ForeignHolderRank } from '@/lib/enterprise-data'
import { haversineKm } from '@/lib/water-defense'

export function useVulcanObservatoryPage(initialRegion: DataRegion = 'pococaldas') {
  const { t } = useI18n()
  const baseURL = useRuntimeConfig().app.baseURL

  const controls = useObservatoryControls()
  const {
    yearMin, yearMax, selectedPhases, searchTerm, sobDemandaOnly, filtersExpanded, activeTab,
    showShortcuts, showDataTable, showTimeline, showExport, showGeoLocate, showClaimReport,
    reportClaim, userLocationRadius, mapContainerRef, filteredCount,
    layerVis, enterpriseLayerVisible, toggleLayer, toggleEnterpriseLayer,
    flyToTarget, mapRef: _mapRef, onMapInit, flyToCoord, onGeoLocate, expandToFullBrazil, zoomToDanger, flyToEnterprise,
    filteredPoints,
    categoryStats, totalCount, activeFilterCount, activeFilterSummary, formatSyncDate, formatHa,
    displayCounts, startCounterAnimation, animatedCount, animateCounters,
    restoredState,
    handleKeydown,
    debouncedFilter, updateFilter,
  } = controls

  const { pointsData: _rawPointsData, polygonsData: _rawPolygonsData, protectedData: _rawProtectedData, waterData: _rawWaterData, culturalData: _rawCulturalData, features: allFeatures, speculatorIndex, deepAnalysis, layerCounts, overlapSummary, protectedSummary, waterThreats, waterSummary, resourceErrors, isLoading, loadPhase, loadProgress, error, load: loadRareEarthData, loadFullBrazil, isRegional } = useRareEarthData(baseURL, initialRegion)

  const { combinedData: culturalAgentsCombined, sourceCounts, load: loadCulturalAgents } = useCulturalAgentsData(baseURL)

  const EMPTY_FC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }
  const pointsData = computed(() => _rawPointsData.value ?? EMPTY_FC)
  const polygonsData = computed(() => _rawPolygonsData.value)
  const protectedData = computed(() => _rawProtectedData.value)
  const waterData = computed(() => _rawWaterData.value)

  /**
   * Combined cultural layer for the observatory map.
   *
   * `culturalAgentsCombined` already contains:
   *   - Mapa Cultura BR (digested from public/map-culture.json)
   *   - Floresta Ativista (live HTTP fetch, deduplicated against Mapa Cultura)
   *   - Community pins (Supabase)
   *
   * `_rawCulturalData` is the curated rare-earth/cultural-features.geojson
   * overlay; we append the API/community layer on top.
   */
  const culturalData = computed<GeoJSON.FeatureCollection | undefined>(() => {
    const base = _rawCulturalData.value
    const agents = culturalAgentsCombined.value?.features ?? []
    if (!agents.length) return base
    const baseFeatures = (base?.features ?? [])
    return {
      type: 'FeatureCollection',
      features: baseFeatures.length ? [...baseFeatures, ...agents] : agents,
    }
  })

  // Cultural-agent counts derived from `culturalAgentsCombined` (already
  // contains mapa_cultura + floresta_ativista, deduped).
  const culturalTotalCount = computed(() => culturalAgentsCombined.value?.features?.length ?? 0)
  const culturalSourceCounts = computed<Record<string, number>>(() => {
    const out: Record<string, number> = { mapa_cultura: 0, floresta_ativista: 0 }
    for (const f of culturalAgentsCombined.value?.features ?? []) {
      const s = (f.properties as { source?: string } | undefined)?.source
      if (s && s in out) out[s]++
    }
    return out
  })

  // Merged cultural ref (raw cultural-features.geojson + Mapa Cultura /
  // Floresta Ativista agents) kept in sync so controls/data consumers see
  // the same layer the map renders.
  const mergedCulturalRef = shallowRef<GeoJSON.FeatureCollection | undefined>(undefined)
  watch(culturalData, (v) => { mergedCulturalRef.value = v }, { immediate: true })

  function handleMapInit(map: maplibregl.Map) {
    controls.onMapInit(map)
    try {
      const container = map.getContainer() as HTMLElement | null
      if (container) controls.mapContainerRef.value = container
    } catch { /* ignore */ }
  }

  controls.setupObservatory({
    allFeatures,
    pointsData: _rawPointsData,
    polygonsData: _rawPolygonsData,
    protectedData: _rawProtectedData,
    waterData: _rawWaterData,
    culturalData: mergedCulturalRef as unknown as typeof _rawCulturalData,
    speculatorIndex,
    deepAnalysis,
    isLoading,
    loadPhase,
    loadProgress,
    error,
    loadRareEarthData,
    loadFullBrazil,
    isRegional,
  })

  const stats = { categoryStats, totalCount, filteredCount, activeFilterCount, activeFilterSummary, formatSyncDate, formatHa }
  const data: ObservatoryData = {
    allFeatures,
    pointsData: _rawPointsData,
    filteredPoints,
    polygonsData: _rawPolygonsData,
    protectedData: _rawProtectedData,
    waterData: _rawWaterData,
    culturalData: mergedCulturalRef as unknown as typeof _rawCulturalData,
    speculatorIndex,
    deepAnalysis,
    isLoading,
    loadPhase,
    loadProgress,
    error,
    loadRareEarthData,
    loadFullBrazil,
    isRegional,
    setupObservatory: () => {},
  }

  const showRedeCorporativa = ref(false)
  const showDownload = ref(false)
  const showUserContribution = ref(false)
  const showAll = ref(false)

  const showClaimDetail = ref(false)
  const claimDetailProps = ref<Record<string, unknown> | null>(null)
  const claimDetailContext = ref<{
    suspicionScore: number
    suspicionFlags: string[]
    holderClaims: number
    holderAreaHa: number
  } | null>(null)
  const obsSel = useObservatorySelection()

  watch(() => obsSel.selection.value.processo, (processo) => {
    if (processo) {
      const sel = obsSel.selection.value
      const features = allFeatures.value as Array<Record<string, unknown>>
      const feature = features.find(f => f.p === processo) ?? { p: processo, n: sel.nome }
      claimDetailProps.value = {
        ...feature,
        lo: sel.coords?.[0] ?? feature.lo,
        la: sel.coords?.[1] ?? feature.la,
      } as Record<string, unknown>
      // Holder intelligence: join the speculator index so the modal can
      // explain WHY a claim scores dangerous (flags, volume, rush).
      const holderName = String(feature.n ?? sel.nome ?? '')
      const entry = (speculatorIndex.value as Array<{
        normalizedName: string
        displayName: string
        count: number
        totalAreaHa: number
        suspicionScore: number
        suspicionFlags: string[]
      }>).find(s =>
        s.normalizedName === normalizeName(holderName)
        || s.displayName === holderName,
      )
      claimDetailContext.value = entry
        ? {
            suspicionScore: entry.suspicionScore,
            suspicionFlags: entry.suspicionFlags ?? [],
            holderClaims: entry.count,
            holderAreaHa: Math.round(entry.totalAreaHa),
          }
        : null
      showClaimDetail.value = true
    }
  })

  function closeClaimDetail() {
    showClaimDetail.value = false
    claimDetailProps.value = null
    claimDetailContext.value = null
  }

  const { pin: userPin, sharedFromUrl: userPinShared, setPin: setUserPin, clearPin, getShareUrl, copyShareUrl } = useUserPin()
  const pinPickerMode = ref(false)
  const shareCopied = ref(false)
  let pinClickHandler: ((_e: maplibregl.MapMouseEvent) => void) | null = null
  let pinKeyHandler: ((_e: KeyboardEvent) => void) | null = null

  function togglePinPicker() {
    if (pinPickerMode.value) {
      pinPickerMode.value = false
      detachPinClick()
    } else {
      pinPickerMode.value = true
      attachPinClick()
    }
  }

  function attachPinClick() {
    const m = _mapRef.value
    if (!m) return
    m.getCanvas().style.cursor = 'crosshair'
    pinClickHandler = (e: maplibregl.MapMouseEvent) => {
      if (!pinPickerMode.value) return
      const { lng, lat } = e.lngLat
      setUserPin({ lng, lat }, t('observatory.myTerritory.defaultLabel'))
      pinPickerMode.value = false
      if (m) m.getCanvas().style.cursor = ''
      flyToTarget.value = { lng, lat, zoom: 8 }
    }
    m.on('click', pinClickHandler)
    pinKeyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && pinPickerMode.value) togglePinPicker()
    }
    window.addEventListener('keydown', pinKeyHandler)
  }

  function detachPinClick() {
    const m = _mapRef.value
    if (m && pinClickHandler) {
      m.off('click', pinClickHandler)
      m.getCanvas().style.cursor = ''
      pinClickHandler = null
    }
    if (pinKeyHandler) {
      window.removeEventListener('keydown', pinKeyHandler)
      pinKeyHandler = null
    }
  }

  function flyToUserPin() {
    if (userPin.value) {
      flyToTarget.value = { lng: userPin.value.lng, lat: userPin.value.lat, zoom: 8 }
    }
  }

  async function copyPinUrl() {
    const toast = useToast()
    const ok = await copyShareUrl()
    if (ok) {
      shareCopied.value = true
      setTimeout(() => { shareCopied.value = false }, 2000)
      toast.success(t('observatory.myTerritory.copied'))
    } else {
      toast.error(t('observatory.myTerritory.shareError') || 'Copy failed')
    }
  }

  const loadingMessage = computed(() => {
    const regionLabel = isRegional.value ? 'Poços de Caldas region' : 'Brazil'
    switch (loadPhase.value) {
      case 'points': return `Loading mining claims (${regionLabel})...`
      case 'overlaps': return 'Loading territory overlaps...'
      case 'polygons': return 'Loading claim boundaries...'
      case 'protected': return 'Loading protected areas, waterbodies & analysis...'
      case 'complete': return 'Ready'
      default: return 'Initializing...'
    }
  })

  function handleKeydownPage(e: KeyboardEvent) {
    if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return
    if (e.key === 'Escape') {
      if (showTimeline.value) { showTimeline.value = false; return }
      if (showRedeCorporativa.value) { showRedeCorporativa.value = false; return }
      if (showDownload.value) { showDownload.value = false; return }
      if (showClaimReport.value) { showClaimReport.value = false; return }
      if (showUserContribution.value) { showUserContribution.value = false; return }
      if (showClaimDetail.value) { closeClaimDetail(); return }
    }
  }

  onMounted(async () => {
    startCounterAnimation()
    await Promise.all([loadRareEarthData(), loadCulturalAgents()])
    debouncedFilter()
    // mapContainerRef is set from the real map container in handleMapInit
    // (map.getContainer()). No global querySelector — fragile with modals
    // and multiple maps.

    if (restoredState.value) {
      const s = restoredState.value as Record<string, unknown>
      if (s.center) flyToTarget.value = { lng: (s.center as number[])[0], lat: (s.center as number[])[1], zoom: (s.zoom as number) ?? 6 }
      if (s.yearMin) yearMin.value = s.yearMin as number
      if (s.yearMax) yearMax.value = s.yearMax as number
      if (s.phases) selectedPhases.value = new Set(s.phases as string[])
      if (s.heatmap || s.enterprise) {
        const patch: Record<string, boolean> = {}
        if (s.heatmap) patch['heatmap'] = true
        if (s.enterprise) patch['enterprise_hq'] = true
        layerVis.value = { ...layerVis.value, ...patch }
      }
      if (s.tab) activeTab.value = s.tab as ObservatoryTabKey
      debouncedFilter()
    }

    window.addEventListener('keydown', handleKeydown)
    window.addEventListener('keydown', handleKeydownPage)
  })

  onUnmounted(() => {
    detachPinClick()
    window.removeEventListener('keydown', handleKeydown)
    window.removeEventListener('keydown', handleKeydownPage)
  })

  const lastSync = computed(() => {
    const raw = deepAnalysis.value as unknown as Record<string, unknown> | undefined
    const iso = typeof raw?.last_sync === 'string' ? raw.last_sync : undefined
    if (!iso) return undefined
    try {
      return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    } catch { return iso }
  })

  /** Live foreign-holder ranking from the loaded (normalized) points. */
  const foreignHolders = computed<ForeignHolderRank[]>(() =>
    foreignHolderRanking(_rawPointsData.value as unknown as GeoJSON.FeatureCollection | undefined),
  )

  /**
   * "Watch my territory": claims within 10km of the user's pin, with the
   * nearest claim identified. Recomputed when the pin or the data changes.
   */
  const pinThreats = computed(() => {
    const pin = userPin.value
    if (!pin || !Number.isFinite(pin.lng) || !Number.isFinite(pin.lat)) return null
    let within10 = 0
    let nearest: { nearestProcesso: string; nearestHolder: string; nearestKm: number } | null = null
    for (const f of allFeatures.value as Array<{
      p: string; n: string; lo: number; la: number
    }>) {
      if (!Number.isFinite(f.lo) || !Number.isFinite(f.la)) continue
      const d = haversineKm(pin.lng, pin.lat, f.lo, f.la)
      if (d <= 10) within10++
      if (!nearest || d < nearest.nearestKm) {
        nearest = { nearestProcesso: f.p, nearestHolder: f.n, nearestKm: Math.round(d * 10) / 10 }
      }
    }
    if (!nearest) return null
    return { within10, ...nearest, pinLabel: pin.label }
  })

  return {
    controls,
    stats,
    data,
    pointsData, filteredPoints, polygonsData, protectedData, waterData, culturalData,
    layerVis, flyToTarget, onMapInit: handleMapInit,
    allFeatures, speculatorIndex, deepAnalysis, layerCounts, overlapSummary,
    protectedSummary, waterThreats, waterSummary, foreignHolders, pinThreats,
    resourceErrors, lastSync,
    isLoading, loadPhase, loadProgress, error,
    loadRareEarthData, loadFullBrazil, isRegional,
    showRedeCorporativa, showDownload, showUserContribution, showAll,
    showClaimDetail, claimDetailProps, claimDetailContext, closeClaimDetail,
    userPin, userPinShared, pinPickerMode, shareCopied,
    togglePinPicker, flyToUserPin, copyPinUrl, setUserPin, loadingMessage,
    toggleEnterpriseLayer, flyToEnterprise, zoomToDanger, flyToCoord, onGeoLocate, expandToFullBrazil,
    activeTab, activeFilterSummary, showShortcuts, showDataTable, showTimeline, showExport, showGeoLocate, showClaimReport, reportClaim,
    yearMin, yearMax, selectedPhases, searchTerm, sobDemandaOnly, filtersExpanded,
    displayCounts, startCounterAnimation, animatedCount,
    mapContainerRef, filteredCount,
    culturalTotalCount, culturalSourceCounts,
    debouncedFilter,
    clearPin, getShareUrl, copyShareUrl,
  }
}
