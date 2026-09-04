/**
 * composables/useVulcanObservatoryPage.ts
 * @why Vulcan observatory page state — combines observatory data, filters, selection, and map layers
 * @functions useVulcanObservatoryPage
 * @deps vue (ref, computed, watch, onMounted, onUnmounted); @/composables/useObservatoryControls (useObservatoryControls, type ObservatoryData, type ObservatoryTabKey); @/composables/useObservatorySelection (useObservatorySelection); @/composables/useRareEarthData (useRareEarthData, type DataRegion); @/composables/useCulturalAgentsData (useCulturalAgentsData)
 * @connections pages/vulcan-observatory/3d.vue, pages/vulcan-observatory/index.vue
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type maplibregl from 'maplibre-gl'
import { useObservatoryControls, type ObservatoryData, type ObservatoryTabKey } from '@/composables/useObservatoryControls'
import { useObservatorySelection } from '@/composables/useObservatorySelection'
import { useRareEarthData, type DataRegion } from '@/composables/useRareEarthData'
import { useCulturalAgentsData } from '@/composables/useCulturalAgentsData'

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

  const { pointsData: _rawPointsData, polygonsData: _rawPolygonsData, protectedData: _rawProtectedData, waterData: _rawWaterData, culturalData: _rawCulturalData, features: allFeatures, speculatorIndex, deepAnalysis, isLoading, loadPhase, loadProgress, error, load: loadRareEarthData, loadFullBrazil, isRegional } = useRareEarthData(baseURL, initialRegion)

  const { combinedData: culturalAgentsCombined, load: loadCulturalAgents } = useCulturalAgentsData(baseURL)

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
    const baseFeatures = base?.features ?? []
    return {
      type: 'FeatureCollection',
      features: baseFeatures.length ? [...baseFeatures, ...agents] : agents,
    }
  })

  controls.setupObservatory({
    allFeatures,
    pointsData: _rawPointsData,
    polygonsData: _rawPolygonsData,
    protectedData: _rawProtectedData,
    waterData: _rawWaterData,
    culturalData: _rawCulturalData,
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
    culturalData: _rawCulturalData,
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
      showClaimDetail.value = true
    }
  })

  function closeClaimDetail() {
    showClaimDetail.value = false
    claimDetailProps.value = null
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
    filteredCount.value = allFeatures.value.length
    mapContainerRef.value = document.querySelector('.maplibregl-canvas-container')?.closest('.relative') as HTMLElement | null

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
    } else {
      setTimeout(() => { showGeoLocate.value = true }, 800)
    }

    window.addEventListener('keydown', handleKeydown)
    window.addEventListener('keydown', handleKeydownPage)
  })

  onUnmounted(() => {
    detachPinClick()
    window.removeEventListener('keydown', handleKeydown)
    window.removeEventListener('keydown', handleKeydownPage)
  })

  return {
    controls,
    stats,
    data,
    pointsData, filteredPoints, polygonsData, protectedData, waterData, culturalData,
    layerVis, flyToTarget, onMapInit,
    allFeatures, speculatorIndex, deepAnalysis, isLoading, loadPhase, loadProgress, error,
    loadRareEarthData, loadFullBrazil, isRegional,
    showRedeCorporativa, showDownload, showUserContribution, showAll,
    showClaimDetail, claimDetailProps, closeClaimDetail,
    userPin, userPinShared, pinPickerMode, shareCopied,
    togglePinPicker, flyToUserPin, copyPinUrl, loadingMessage,
    toggleEnterpriseLayer, flyToEnterprise, zoomToDanger, flyToCoord, onGeoLocate, expandToFullBrazil,
    activeTab, activeFilterSummary, showShortcuts, showDataTable, showTimeline, showExport, showGeoLocate, showClaimReport, reportClaim,
    yearMin, yearMax, selectedPhases, searchTerm, sobDemandaOnly, filtersExpanded,
    displayCounts, startCounterAnimation, animatedCount,
    mapContainerRef, filteredCount,
    debouncedFilter,
    clearPin, getShareUrl, copyShareUrl,
  }
}
