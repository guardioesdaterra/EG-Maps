/**
 * composables/useMapPopup/projectPopup.ts
 * @why Project grant popup HTML builder — constructs popup content for project markers
 * @functions useProjectPopup
 * @deps vue (ref, computed, nextTick)
 */
import { ref, computed, nextTick } from 'vue'
import type { ProjectData } from '@/lib/types'

export function useProjectPopup() {
  const showOverlay = ref(false)
  const selectedProject = ref<ProjectData | null>(null)
  const closeBtnRef = ref<HTMLElement | null>(null)
  const overlayRef = ref<HTMLElement | null>(null)

  const project = computed(() => selectedProject.value)

  function open(data: ProjectData) {
    selectedProject.value = data
    showOverlay.value = true
    nextTick(() => closeBtnRef.value?.focus())
  }

  function close() {
    showOverlay.value = false
    selectedProject.value = null
  }

  return {
    showOverlay,
    project,
    closeBtnRef,
    overlayRef,
    open,
    close,
  }
}
