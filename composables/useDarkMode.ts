import { storeToRefs } from 'pinia'
import { useUiStore } from '@/stores/ui'

/**
 * Backwards-compatible composable that reads from the global UI store.
 * Existing call sites continue to work, but state is now centralized in Pinia
 * so devtools, HMR, and other Pinia plugins can see it.
 */
export function useDarkMode() {
  const ui = useUiStore()
  const { isDark, isDarkInitialized } = storeToRefs(ui)
  return {
    isDark,
    isInitialized: isDarkInitialized,
    toggle: ui.toggleDarkMode,
    set: ui.setDarkMode,
  }
}
