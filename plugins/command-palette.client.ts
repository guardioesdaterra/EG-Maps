/**
 * Registers global command palette items: navigation, theme toggle, language switch.
 * Runs once on client init.
 */
import { useCommandPalette } from '@/composables/useCommandPalette'
import { useDarkMode } from '@/composables/useDarkMode'
import { useI18n } from '@/composables/useI18n'

export default defineNuxtPlugin(() => {
  if (import.meta.server) return

  const { register } = useCommandPalette()
  const { t, locale } = useI18n()

  // Navigation
  register({
    id: 'nav:home',
    group: t('palette.groupNavigation'),
    label: t('nav.home'),
    icon: 'mdi:home',
    keywords: ['home', 'index', 'landing'],
    onSelect: () => { void navigateTo('/') },
  })
  register({
    id: 'nav:info',
    group: t('palette.groupNavigation'),
    label: t('nav.info'),
    icon: 'mdi:information',
    keywords: ['about', 'info', 'feedback'],
    onSelect: () => { void navigateTo('/info') },
  })
  register({
    id: 'nav:project-grants',
    group: t('palette.groupNavigation'),
    label: t('nav.projectGrants'),
    icon: 'mdi:chart-line',
    keywords: ['grants', 'projects', 'funding'],
    onSelect: () => { void navigateTo('/project-grants') },
  })
  register({
    id: 'nav:endangered-species',
    group: t('palette.groupNavigation'),
    label: t('nav.endangeredSpecies'),
    icon: 'mdi:paw',
    keywords: ['species', 'wildlife', 'endangered'],
    onSelect: () => { void navigateTo('/endangered-species') },
  })
  register({
    id: 'nav:observatory',
    group: t('palette.groupNavigation'),
    label: t('nav.observatoryOfVulcan'),
    icon: 'mdi:volcano',
    keywords: ['observatory', 'vulcan', 'ree', 'mining'],
    onSelect: () => { void navigateTo('/observatory-of-vulcan') },
  })

  // Theme toggle
  const dark = useDarkMode()
  register({
    id: 'theme:toggle',
    group: t('palette.groupSettings'),
    label: dark.isDark.value ? t('nav.switchToLight') : t('nav.switchToDark'),
    icon: dark.isDark.value ? 'mdi:weather-sunny' : 'mdi:weather-night',
    shortcut: 'Ctrl+Shift+D',
    keywords: ['theme', 'dark', 'light', 'mode'],
    onSelect: () => { dark.toggle() },
  })

  // Locale switch
  const LOCALES = ['en', 'es', 'fr', 'pt', 'ar', 'hi', 'ja', 'zh'] as const
  const LOCALE_NAMES: Record<typeof LOCALES[number], string> = {
    en: 'English', es: 'Español', fr: 'Français', pt: 'Português',
    ar: 'العربية', hi: 'हिन्दी', ja: '日本語', zh: '中文',
  }
  for (const code of LOCALES) {
    register({
      id: `lang:${code}`,
      group: t('palette.groupLanguage'),
      label: LOCALE_NAMES[code],
      icon: 'mdi:translate',
      keywords: ['language', 'locale', code, LOCALE_NAMES[code].toLowerCase()],
      onSelect: () => {
        locale.value = code
      },
    })
  }
})
