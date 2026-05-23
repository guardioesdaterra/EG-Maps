import { ref } from 'vue'
import enTranslations from '../locales/en.json'

export type Locale = 'en' | 'es' | 'pt' | 'fr' | 'ja' | 'zh' | 'ar' | 'hi'

export interface Translation {
  [key: string]: string | Translation
}

const localeState = ref<Locale>('en')

const localeIds: Locale[] = ['en', 'es', 'pt', 'fr', 'ja', 'zh', 'ar', 'hi']

const translationCache = new Map<Locale, Translation>()
const failedLocales = new Set<Locale>()
translationCache.set('en', enTranslations as Translation)

// Deep merge function for fallback
function deepGet(obj: Translation | undefined, path: string[]): string | undefined {
  if (!obj) return undefined
  let current: string | Translation = obj
  for (const part of path) {
    if (current === undefined || current === null || typeof current !== 'object') return undefined
    current = (current as Translation)[part]
  }
  return typeof current === 'string' ? current : undefined
}

// Get translation with deep fallback (locale -> en -> key)
function getTranslation(locale: Locale, key: string, fallbackToKey = true): string {
  const path = key.split('.')

  // Try current locale first
  const localeValue = deepGet(translationCache.get(locale), path)
  if (localeValue !== undefined) return localeValue

  // Fallback to English if not current locale
  if (locale !== 'en') {
    const enValue = deepGet(enTranslations as Translation, path)
    if (enValue !== undefined) return enValue
  }

  // Return key as last resort (or undefined for debugging)
  return fallbackToKey ? key : (undefined as unknown as string)
}

function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'en'

  const stored = localStorage.getItem('eg-maps-locale')
  if (stored && localeIds.includes(stored as Locale)) return stored as Locale

  const browserLang = navigator.language.toLowerCase()
  if (browserLang.startsWith('es')) return 'es'
  if (browserLang.startsWith('pt')) return 'pt'
  if (browserLang.startsWith('fr')) return 'fr'
  if (browserLang.startsWith('ja')) return 'ja'
  if (browserLang.startsWith('zh')) return 'zh'
  if (browserLang.startsWith('ar')) return 'ar'
  if (browserLang.startsWith('hi')) return 'hi'

  return 'en'
}

async function loadLocale(locale: Locale, baseURL?: string): Promise<Translation> {
  if (translationCache.has(locale)) {
    return translationCache.get(locale)!
  }
  if (failedLocales.has(locale)) {
    throw new Error(`Failed to load locale: ${locale}`)
  }
  const prefix = baseURL && baseURL !== '/' ? baseURL.replace(/\/+$/, '') : ''
  const response = await fetch(`${prefix}/locales/${locale}.json`)
  if (!response.ok) {
    failedLocales.add(locale)
    throw new Error(`Failed to load locale: ${locale}`)
  }
  const data = await response.json()
  translationCache.set(locale, data)
  return data
}

// Legacy lookup function for compatibility
function lookup(locale: Locale, key: string): string | undefined {
  const translations = translationCache.get(locale)
  if (!translations) return undefined
  return deepGet(translations, key.split('.'))
}

function interpolate(template: string, args: unknown[]): string {
  let result = template

  args.forEach((arg, index) => {
    result = result.replace(new RegExp(`\\{${index}\\}`, 'g'), String(arg))
  })

  if (args.length === 1 && args[0] && typeof args[0] === 'object') {
    Object.entries(args[0] as Record<string, unknown>).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value))
    })
  }

  return result
}

export function useI18n() {
  const baseURL = useRuntimeConfig().app.baseURL

  // Initialize from localStorage on client-side mount
  if (import.meta.client && localeState.value === 'en') {
    const detected = detectLocale()
    if (detected !== 'en') {
      loadLocale(detected, baseURL).then(() => {
        localeState.value = detected
      })
    }
  }

  function t(key: string, ...args: unknown[]): string {
    // Use new getTranslation for proper fallback chain: locale -> en -> key
    const value = getTranslation(localeState.value, key, true)
    return interpolate(value, args)
  }

  function setLocale(newLocale: Locale) {
    if (!localeIds.includes(newLocale)) return
    loadLocale(newLocale, baseURL).then(() => {
      localeState.value = newLocale
    })
    if (typeof window !== 'undefined') {
      localStorage.setItem('eg-maps-locale', newLocale)
    }
  }

  return {
    locale: localeState,
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
    } satisfies Record<Locale, string>,
    setLocale,
  }
}
