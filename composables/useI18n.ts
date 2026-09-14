/**
 * composables/useI18n.ts
 * @why Internationalization — wraps vue-i18n's $t with the same call signature
 *  as the project's previous useI18n so all existing call sites work unchanged.
 *  vue-i18n (configured via @nuxtjs/i18n) handles locale lookup, fallback to
 *  English, lazy bundle loading, and interpolation.
 * @functions useI18n
 * @types Locale
 * @deps @/stores/ui (useUiStore, type SupportedLocale)
 * @connections app.vue, components/DataBubble.vue, components/GlobalStats.vue, components/MapControls.vue, components/ProjectFilterPanel.vue, components/RedeCorporativa.vue, components/SpeciesFilterPanel.vue, components/SpeciesPanel.vue, components/map/SpeciesPopup.vue, components/observatory/ObservatoryLayout.vue, composables/useMapBase.ts, composables/useMapPopup/previewCard.ts, composables/useMapPopup/speciesPopup.ts, layouts/default.vue, pages/vulcan-observatory/3d.vue, pages/vulcan-observatory/index.vue, plugins/command-palette.client.ts
 */
import { useUiStore, type SupportedLocale } from '@/stores/ui'

export type Locale = SupportedLocale

const localeIds: Locale[] = ['en', 'es', 'pt', 'fr', 'ja', 'zh', 'ar', 'hi', 'nl', 'de']

export function useI18n() {
  const nuxtApp = useNuxtApp()
  const i18n = (nuxtApp as Record<string, unknown>).$i18n as { t: (_key: string, ..._args: unknown[]) => string; locale: import('vue').Ref<string> } | undefined

  const ui = useUiStore()

  const vt = i18n?.t ?? ((k: string): string => k)
  const vLocale = i18n?.locale ?? ref<Locale>('en')

  if (import.meta.client) {
    watch(
      ui.locale,
      (val) => {
        if (val && vLocale.value !== val) vLocale.value = val
      },
    )
  }
  if (i18n) {
    watch(vLocale, (val) => {
      if (ui.locale.value !== val) ui.setLocale(val as Locale)
    })
  }

  function t(key: string, ...args: unknown[]): string {
    return vt(key, ...args)
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
