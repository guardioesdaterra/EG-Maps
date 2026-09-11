/**
 * plugins/ui-init.client.ts
 * @why Client-side UI initialization — theme restoration, tooltip registry, interaction observers
 * @defaults defineNuxtPlugin
 * @deps ~/stores/ui (useUiStore)
 */
import { useUiStore } from '~/stores/ui'

export default defineNuxtPlugin((nuxtApp) => {
  if (import.meta.client) {
    const ui = useUiStore()
    console.log('[DEBUG:ui-init] plugin running — ui.locale:', ui.locale.value)
    nuxtApp.hook('app:mounted', () => {
      ui.initDarkMode()
      const i18n = (nuxtApp as Record<string, unknown>).$i18n as { locale?: { value: string } } | undefined
      console.log('[DEBUG:ui-init] app:mounted — i18n.locale:', i18n?.locale?.value, 'ui.locale before:', ui.locale.value)
      if (i18n?.locale?.value) {
        ui.setLocale(i18n.locale.value as 'en' | 'es' | 'fr' | 'pt' | 'ar' | 'hi' | 'ja' | 'zh' | 'nl' | 'de')
      } else {
        ui.initLocale()
      }
      console.log('[DEBUG:ui-init] app:mounted — ui.locale after:', ui.locale.value)
    })
  }
})
