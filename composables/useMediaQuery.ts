/**
 * composables/useMediaQuery.ts
 * @why Responsive breakpoint detection — reactive boolean refs for sm/md/lg/xl breakpoints
 * @functions useMediaQuery
 * @deps vue (ref, onMounted, onUnmounted)
 * @connections components/GlobalStats.vue, components/MapControls.vue, components/ProjectFilterPanel.vue, components/SpeciesFilterPanel.vue, composables/useMapBase.ts, composables/useMapConnections.ts, composables/useMapHexGrid.ts
 */
import { ref, onMounted, onUnmounted } from 'vue'

export function useMediaQuery(query: string) {
  const matches = ref(false)

  let mediaQuery: MediaQueryList | null = null

  const updateMatches = (e?: MediaQueryListEvent | MediaQueryList) => {
    const target = e || mediaQuery
    if (target) {
      matches.value = target.matches
    }
  }

  onMounted(() => {
    if (typeof window === 'undefined') return

    mediaQuery = window.matchMedia(query)
    updateMatches(mediaQuery)

    mediaQuery.addEventListener('change', updateMatches)
  })

  onUnmounted(() => {
    if (mediaQuery) {
      mediaQuery.removeEventListener('change', updateMatches)
    }
  })

  return matches
}
