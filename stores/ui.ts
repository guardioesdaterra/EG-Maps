/**
 * stores/ui.ts
 * @why Pinia store for UI state — dark mode, sidebar, mobile nav, search, modals
 * @functions useUiStore
 * @types SupportedLocale
 * @deps vue (ref, watch)
 * @connections composables/useDarkMode.ts, composables/useI18n.ts
 */
import { ref, watch } from 'vue'

const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'pt', 'ar', 'hi', 'ja', 'zh', 'nl', 'de'] as const
export type SupportedLocale = typeof SUPPORTED_LOCALES[number]

let _isDark: ReturnType<typeof ref<boolean>> | null = null
let _isDarkInitialized: ReturnType<typeof ref<boolean>> | null = null
let _locale: ReturnType<typeof ref<SupportedLocale>> | null = null
let _watchInstalled = false

function installDarkModeWatch() {
  if (!import.meta.client || _watchInstalled || !_isDark) return
  _watchInstalled = true
  watch(_isDark, (value) => {
    try { localStorage.setItem('darkMode', String(value)) } catch { /* noop */ }
    applyDarkClass(!!value)
  })
}

function applyDarkClass(value: boolean) {
  if (import.meta.client) {
    document.documentElement.classList.toggle('dark', value)
  }
}

export function useUiStore() {
  if (!_isDark) _isDark = ref<boolean>(true)
  if (!_isDarkInitialized) _isDarkInitialized = ref<boolean>(false)
  if (!_locale) _locale = ref<SupportedLocale>('en')

  const isDark = _isDark
  const isDarkInitialized = _isDarkInitialized
  const locale = _locale

  function getInitialDarkMode(): boolean {
    if (!import.meta.client) return true
    const saved = localStorage.getItem('darkMode')
    if (saved !== null) return saved === 'true'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  function initDarkMode() {
    installDarkModeWatch()
    if (isDarkInitialized.value || !import.meta.client) return
    isDark.value = getInitialDarkMode()
    isDarkInitialized.value = true
    applyDarkClass(isDark.value)
  }

  function toggleDarkMode() {
    installDarkModeWatch()
    isDark.value = !isDark.value
    applyDarkClass(isDark.value)
  }

  function setDarkMode(value: boolean) {
    installDarkModeWatch()
    isDark.value = value
    applyDarkClass(value)
  }

  const locales = SUPPORTED_LOCALES

  function getInitialLocale(): SupportedLocale {
    if (!import.meta.client) return 'en'
    const saved = localStorage.getItem('locale') as SupportedLocale | null
    if (saved && SUPPORTED_LOCALES.includes(saved)) return saved
    const nav = navigator.language.split('-')[0]
    if (SUPPORTED_LOCALES.includes(nav as SupportedLocale)) {
      return nav as SupportedLocale
    }
    return 'en'
  }

  function initLocale() {
    if (!import.meta.client) return
    locale.value = getInitialLocale()
  }

  function setLocale(value: SupportedLocale) {
    locale.value = value
    if (import.meta.client) {
      localStorage.setItem('locale', value)
      document.documentElement.setAttribute('lang', value)
      document.documentElement.setAttribute('dir', value === 'ar' ? 'rtl' : 'ltr')
    }
  }

  return {
    isDark,
    isDarkInitialized,
    initDarkMode,
    toggleDarkMode,
    setDarkMode,
    locale,
    locales,
    initLocale,
    setLocale,
  }
}
