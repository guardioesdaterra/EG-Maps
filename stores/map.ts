import { defineStore } from 'pinia'

export type DatasetKey = 'project-grants' | 'endangered-species' | 'endangered-species-3d' | 'observatory-of-vulcan' | 'observatory-of-vulcan-3d' | 'active-crews' | 'active-crews-3d'

export interface FilterState {
  selectedGroups: string[]
  selectedRegions: string[]
  search: string
  showAll: boolean
}

export interface MapViewState {
  center: [number, number]
  zoom: number
  bearing: number
  pitch: number
}

export interface LayerState {
  /** Observatory rare-earth categories */
  categories: Record<string, boolean>
  /** Extra layers: polygons, water, sites, network, etc. */
  extras: Record<string, boolean>
  enterpriseHq: boolean
  protectedTi: boolean
  protectedQuilombo: boolean
  overlaps: boolean
}

export const useFiltersStore = defineStore('filters', () => {
  const selectedGroups = ref<string[]>([])
  const selectedRegions = ref<string[]>([])
  const search = ref('')
  const showAll = ref(false)

  function reset() {
    selectedGroups.value = []
    selectedRegions.value = []
    search.value = ''
    showAll.value = false
  }

  return { selectedGroups, selectedRegions, search, showAll, reset }
})

export const useMapStore = defineStore('map', () => {
  const activeDataset = ref<DatasetKey>('project-grants')
  const showHexGrid = ref(true)
  const showConnections = ref(true)
  const isFullscreen = ref(false)
  const showFilterPanel = ref(false)
  const showSearch = ref(false)
  const isMapReady = ref(false)
  const visibleItemCount = ref(0)
  const totalItemCount = ref(0)

  function setActiveDataset(key: DatasetKey) {
    activeDataset.value = key
  }

  function setMapReady(ready: boolean) {
    isMapReady.value = ready
  }

  function setVisibleItemCount(count: number) {
    visibleItemCount.value = count
  }

  function setTotalItemCount(count: number) {
    totalItemCount.value = count
  }

  return {
    activeDataset,
    showHexGrid,
    showConnections,
    isFullscreen,
    showFilterPanel,
    showSearch,
    isMapReady,
    visibleItemCount,
    totalItemCount,
    setActiveDataset,
    setMapReady,
    setVisibleItemCount,
    setTotalItemCount,
  }
})

export const useLayersStore = defineStore('layers', () => {
  const categories = ref<Record<string, boolean>>({})
  const extras = ref<Record<string, boolean>>({})
  const enterpriseHq = ref(false)
  const protectedTi = ref(true)
  const protectedQuilombo = ref(true)
  const overlaps = ref(true)

  function toggleCategory(key: string) {
    categories.value[key] = !categories.value[key]
  }

  function toggleExtra(key: string) {
    extras.value[key] = !extras.value[key]
  }

  function toggleEnterpriseHq() {
    enterpriseHq.value = !enterpriseHq.value
  }

  function toggleProtectedTi() {
    protectedTi.value = !protectedTi.value
  }

  function toggleProtectedQuilombo() {
    protectedQuilombo.value = !protectedQuilombo.value
  }

  function toggleOverlaps() {
    overlaps.value = !overlaps.value
  }

  function setCategory(key: string, value: boolean) {
    categories.value[key] = value
  }

  function setExtra(key: string, value: boolean) {
    extras.value[key] = value
  }

  return {
    categories,
    extras,
    enterpriseHq,
    protectedTi,
    protectedQuilombo,
    overlaps,
    toggleCategory,
    toggleExtra,
    toggleEnterpriseHq,
    toggleProtectedTi,
    toggleProtectedQuilombo,
    toggleOverlaps,
    setCategory,
    setExtra,
  }
})
