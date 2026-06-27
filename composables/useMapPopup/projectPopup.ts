import { ref, nextTick } from 'vue'
import type { ProjectData } from '@/lib/types'
import { buildProjectPopupHTML } from '@/lib/map-utils'
import { useI18n } from '@/composables/useI18n'

export function useProjectPopup() {
  const { t } = useI18n()

  const showOverlay = ref(false)
  const overlayHTML = ref('')
  const closeBtnRef = ref<HTMLElement | null>(null)
  const overlayRef = ref<HTMLElement | null>(null)

  function open(project: ProjectData) {
    overlayHTML.value = buildProjectPopupHTML(project, {
      projectGrantee: t('stats.projectGrantees'),
      directBeneficiaries: t('stats.directBeneficiaries'),
      indirectBeneficiaries: t('stats.indirectBeneficiaries'),
      location: t('project.location'),
      status: t('project.status'),
      unknownLocation: t('project.unknownLocation'),
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
    overlayRef,
    open,
    close,
  }
}
