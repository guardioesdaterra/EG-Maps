import { useUiStore } from '@/stores/ui'

export function useDarkMode() {
  const ui = useUiStore()
  return {
    isDark: ui.isDark,
    isInitialized: ui.isDarkInitialized,
    toggle: ui.toggleDarkMode,
    set: ui.setDarkMode,
  }
}
