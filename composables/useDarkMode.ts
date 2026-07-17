/**
 * composables/useDarkMode.ts
 * @why Dark mode toggle — persists preference to localStorage, applies .dark class to html
 * @functions useDarkMode
 * @deps @/stores/ui (useUiStore)
 * @connections plugins/command-palette.client.ts
 */
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
