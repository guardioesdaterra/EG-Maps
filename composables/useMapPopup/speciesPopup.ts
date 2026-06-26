import { ref, computed, watch, nextTick } from 'vue'
import { buildSpeciesPopupHTML } from '@/lib/map-utils'
import { useI18n } from '@/composables/useI18n'
import { getLocalizedSpecies, getTaxonomicGroupLabels, type PopupSpecies } from './utils'

export function useSpeciesPopup(baseURL?: string) {
  const { t, locale } = useI18n()

  const showOverlay = ref(false)
  const overlayHTML = ref('')
  const popupLocale = ref<string>(locale.value)
  const selectedSpecies = ref<PopupSpecies | null>(null)
  const closeBtnRef = ref<HTMLElement | null>(null)
  const overlayRef = ref<HTMLElement | null>(null)

  const availableLocales = computed(() => {
    const s = selectedSpecies.value
    if (!s || !('content' in s) || !s.content) return []
    return (Object.keys(s.content) as string[]).filter(l => l !== popupLocale.value)
  })

  function rebuild() {
    const species = selectedSpecies.value
    if (!species) return
    const localized = getLocalizedSpecies(species, popupLocale.value)
    overlayHTML.value = buildSpeciesPopupHTML(localized, {
      scientificName: t('species.scientificName'),
      threatTypes: t('species.threatTypes'),
      population: t('species.population'),
      habitat: t('species.habitat'),
      region: t('filter.region'),
      ecosystem: t('filter.ecosystem'),
      groupLabels: getTaxonomicGroupLabels(t),
    }, baseURL)
  }

  function open(species: PopupSpecies) {
    selectedSpecies.value = species
    popupLocale.value = locale.value
    rebuild()
    showOverlay.value = true
    nextTick(() => closeBtnRef.value?.focus())
  }

  function close() {
    showOverlay.value = false
    overlayHTML.value = ''
    selectedSpecies.value = null
  }

  watch(popupLocale, () => {
    if (showOverlay.value) rebuild()
  })

  return {
    showOverlay,
    overlayHTML,
    popupLocale,
    selectedSpecies,
    availableLocales,
    closeBtnRef,
    overlayRef,
    open,
    close,
    rebuild,
  }
}
