import { ref, computed, nextTick } from 'vue'
import type { CrewRegionData, CrewLocation } from '@/lib/crew-data'

export function useCrewPopup() {
  const showOverlay = ref(false)
  const selectedCrew = ref<CrewRegionData | CrewLocation | null>(null)
  const isCrewLocation = ref(false)
  const closeBtnRef = ref<HTMLElement | null>(null)
  const overlayRef = ref<HTMLElement | null>(null)

  const crew = computed(() => selectedCrew.value)

  function open(data: CrewRegionData | CrewLocation) {
    selectedCrew.value = data
    isCrewLocation.value = !('activeCrews' in data)
    showOverlay.value = true
    nextTick(() => closeBtnRef.value?.focus())
  }

  function close() {
    showOverlay.value = false
    selectedCrew.value = null
  }

  return {
    showOverlay,
    crew,
    isCrewLocation,
    closeBtnRef,
    overlayRef,
    open,
    close,
  }
}
