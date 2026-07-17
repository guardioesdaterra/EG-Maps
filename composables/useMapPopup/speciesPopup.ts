/**
 * composables/useMapPopup/speciesPopup.ts
 * @why Species popup HTML builder — constructs popup content for species markers
 * @functions useSpeciesPopup
 * @deps vue (ref, computed, nextTick); @/composables/useI18n (useI18n); ./utils (getLocalizedSpecies, type PopupSpecies)
 */
import { ref, computed, nextTick } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { getLocalizedSpecies, type PopupSpecies } from './utils'
import type { Species } from '@/lib/types'

export function useSpeciesPopup() {
  const { locale } = useI18n()

  const showOverlay = ref(false)
  const popupLocale = ref<string>(locale.value)
  const selectedSpecies = ref<PopupSpecies | null>(null)
  const closeBtnRef = ref<HTMLElement | null>(null)
  const overlayRef = ref<HTMLElement | null>(null)

  const availableLocales = computed(() => {
    const s = selectedSpecies.value
    if (!s || !('content' in s) || !s.content) return []
    return (Object.keys(s.content) as string[]).filter(l => l !== popupLocale.value)
  })

  const species = computed<Species | null>(() => {
    const s = selectedSpecies.value
    if (!s) return null
    return getLocalizedSpecies(s, popupLocale.value)
  })

  function open(data: PopupSpecies) {
    selectedSpecies.value = data
    popupLocale.value = locale.value
    showOverlay.value = true
    nextTick(() => closeBtnRef.value?.focus())
  }

  function close() {
    showOverlay.value = false
    selectedSpecies.value = null
  }

  return {
    showOverlay,
    species,
    popupLocale,
    availableLocales,
    closeBtnRef,
    overlayRef,
    open,
    close,
  }
}
