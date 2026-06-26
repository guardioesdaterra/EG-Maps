import { ref, nextTick } from 'vue'
import type { CrewRegionData } from '@/lib/crew-data'
import { buildCrewPopupHTML } from '@/lib/map-utils'
import { useI18n } from '@/composables/useI18n'

export function useCrewPopup() {
  const { t } = useI18n()

  const showOverlay = ref(false)
  const overlayHTML = ref('')
  const closeBtnRef = ref<HTMLElement | null>(null)

  function open(crew: CrewRegionData) {
    overlayHTML.value = buildCrewPopupHTML(crew, {
      activeCrews: t('crews.activeCrews'),
      inactiveCrews: t('crews.inactiveCrews'),
      totalMembers: t('crews.totalMembers'),
      countries: t('crews.countries'),
      region: t('crews.region'),
      growthSince2022: t('crews.growthSince2022'),
    })
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
