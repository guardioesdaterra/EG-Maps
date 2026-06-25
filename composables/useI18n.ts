import enTranslations from '../locales/en.json'
import { useUiStore, type SupportedLocale } from '@/stores/ui'

export type Locale = SupportedLocale

export interface Translation {
  [key: string]: string | Translation
}

const localeIds: Locale[] = ['en', 'es', 'pt', 'fr', 'ja', 'zh', 'ar', 'hi', 'nl', 'de']

// English fallback (used when a key is missing in the current locale)
function deepGet(obj: Translation | undefined, path: string[]): string | undefined {
  if (!obj) return undefined
  let current: string | Translation = obj
  for (const part of path) {
    if (current === undefined || current === null || typeof current !== 'object') return undefined
    current = (current as Translation)[part]
  }
  return typeof current === 'string' ? current : undefined
}

function englishFallback(key: string): string | undefined {
  return deepGet(enTranslations as Translation, key.split('.'))
}

/**
 * Composable that wraps vue-i18n's $t with the same call signature as the
 * project's previous useI18n so all existing call sites work unchanged.
 *
 * - vue-i18n handles the current-locale lookup, lazy bundle loading, and
 *   interpolation (this is configured by @nuxtjs/i18n in nuxt.config.ts)
 * - This wrapper provides an English fallback for missing keys (preserving
 *   the previous behavior)
 * - The locale ref comes from the Pinia UI store so cross-component changes
 *   are reactive everywhere
 * - The vue-i18n Composer is retrieved via useNuxtApp().$i18n, not by
 *   importing useI18n, so we don't conflict with the auto-imported version
 *   from @nuxtjs/i18n
 */
export function useI18n() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nuxtApp = useNuxtApp() as any
  const i18n = nuxtApp.$i18n as { t: (_key: string, ..._args: unknown[]) => string; locale: import('vue').Ref<string> } | undefined

  const ui = useUiStore()

  // vue-i18n might not be initialized during certain tests or builds. In that
  // case, fall back to a passthrough that performs English fallback.
  const vt = i18n?.t ?? ((k: string, ...args: unknown[]): string => {
    const v = englishFallback(k) ?? k
    return interpolate(v, args)
  })
  const vLocale = i18n?.locale ?? ref<Locale>('en')

  // Sync vue-i18n locale with Pinia UI store
  watch(
    () => ui.locale,
    (val) => {
      if (vLocale.value !== val) vLocale.value = val
    },
    { immediate: true },
  )
  if (i18n) {
    watch(vLocale, (val) => {
      if (ui.locale !== val) ui.setLocale(val as Locale)
    })
  }

  function t(key: string, ...args: unknown[]): string {
    const value = vt(key, ...args)
    if (value === key) {
      const fb = englishFallback(key)
      if (fb !== undefined) return interpolate(fb, args)
    }
    return value
  }

  function setLocale(newLocale: Locale) {
    if (!localeIds.includes(newLocale)) return
    ui.setLocale(newLocale)
  }

  return {
    locale: computed({
      get: () => vLocale.value as Locale,
      set: (val) => { ui.setLocale(val) },
    }),
    t,
    availableLocales: localeIds,
    localeNames: {
      en: 'English',
      es: 'Español',
      pt: 'Português',
      fr: 'Français',
      ja: '日本語',
      zh: '中文',
      ar: 'العربية',
      hi: 'हिन्दी',
      nl: 'Nederlands',
      de: 'Deutsch',
    } satisfies Record<Locale, string>,
    setLocale,
  }
}

function interpolate(template: string, args: unknown[]): string {
  let result = template
  args.forEach((arg, index) => {
    result = result.replace(new RegExp(`\\{${index}\\}`, 'g'), String(arg))
  })
  if (args.length === 1 && args[0] && typeof args[0] === 'object') {
    for (const [k, v] of Object.entries(args[0] as Record<string, unknown>)) {
      result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
    }
  }
  return result
}
