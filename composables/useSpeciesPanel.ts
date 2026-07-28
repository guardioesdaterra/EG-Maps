/**
 * composables/useSpeciesPanel.ts
 * @why Species detail panel state — tracks selected species, loads detail data, manages panel visibility
 * @functions useSpeciesPanel
 * @deps vue (ref)
 * @connections components/SpeciesPanel.vue, composables/useMapBase.ts
 */
import { ref } from 'vue'
import type { SpeciesIndexItem } from './useGeoJSONMarkers'

const isOpen = ref(false)
const speciesList = ref<SpeciesIndexItem[]>([])
const coordinate = ref<{ lat: number; lng: number } | null>(null)

export function useSpeciesPanel() {
  function openPanel(list: SpeciesIndexItem[], coord: { lat: number; lng: number }) {
    speciesList.value = list
    coordinate.value = coord
    isOpen.value = true
  }

  function closePanel() {
    isOpen.value = false
    speciesList.value = []
    coordinate.value = null
  }

  return {
    isOpen,
    speciesList,
    coordinate,
    openPanel,
    closePanel,
  }
}
