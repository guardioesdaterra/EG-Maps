import { defineStore } from 'pinia'

const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'pt', 'ar', 'hi', 'ja', 'zh'] as const
export type SupportedLocale = typeof SUPPORTED_LOCALES[number]

export const useUiStore = defineStore('ui', () => {
  // ── Dark mode ──────────────────────────────────────────────────────────────
  const isDark = ref(true)
  const isDarkInitialized = ref(false)

  function applyDarkClass(value: boolean) {
    if (import.meta.client) {
      document.documentElement.classList.toggle('dark', value)
    }
  }

  function getInitialDarkMode(): boolean {
    if (!import.meta.client) return true
    const saved = localStorage.getItem('darkMode')
    if (saved !== null) return saved === 'true'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  function initDarkMode() {
    if (isDarkInitialized.value || !import.meta.client) return
    isDark.value = getInitialDarkMode()
    isDarkInitialized.value = true
    applyDarkClass(isDark.value)
  }

  function toggleDarkMode() {
    isDark.value = !isDark.value
    applyDarkClass(isDark.value)
  }

  function setDarkMode(value: boolean) {
    isDark.value = value
    applyDarkClass(value)
  }

  // Persist on change
  if (import.meta.client) {
    watch(isDark, (value) => {
      localStorage.setItem('darkMode', String(value))
      applyDarkClass(value)
    })
  }

  // ── Locale ────────────────────────────────────────────────────────────────
  const locale = ref<SupportedLocale>('en')
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
    // dark mode
    isDark,
    isDarkInitialized,
    initDarkMode,
    toggleDarkMode,
    setDarkMode,
    // locale
    locale,
    locales,
    initLocale,
    setLocale,
  }
})
