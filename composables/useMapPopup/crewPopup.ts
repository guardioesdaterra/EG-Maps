import { ref, nextTick } from 'vue'
import type { CrewRegionData, CrewLocation } from '@/lib/crew-data'
import { buildCrewPopupHTML, buildCrewLocationPopupHTML } from '@/lib/map-utils'
import { useI18n } from '@/composables/useI18n'

export function useCrewPopup() {
  const { t } = useI18n()

  const showOverlay = ref(false)
  const overlayHTML = ref('')
  const closeBtnRef = ref<HTMLElement | null>(null)

  function open(crew: CrewRegionData | CrewLocation) {
    if ('activeCrews' in crew) {
      overlayHTML.value = buildCrewPopupHTML(crew as CrewRegionData, {
        activeCrews: t('crews.activeCrews'),
        inactiveCrews: t('crews.inactiveCrews'),
        totalMembers: t('crews.totalMembers'),
        countries: t('crews.countries'),
        region: t('crews.region'),
        growthSince2022: t('crews.growthSince2022'),
      })
    } else {
      overlayHTML.value = buildCrewLocationPopupHTML(crew as CrewLocation, {
        crewName: t('crews.activeCrews'),
        country: t('crews.countries'),
        city: t('crews.region'),
        region: t('crews.region'),
      })
    }
    showOverlay.value = true
    nextTick(() => closeBtnRef.value?.focus())
  }

  function close() {
    showOverlay.value = false
    overlayHTML.value = ''
  }

  return {
    showOverlay,
    overlayHTML,
    closeBtnRef,
    open,
    close,
  }
}
