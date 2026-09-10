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
    nuxtApp.hook('app:mounted', () => {
      ui.initDarkMode()
      const i18n = (nuxtApp as Record<string, unknown>).$i18n as { locale?: { value: string } } | undefined
      if (i18n?.locale?.value) {
        ui.setLocale(i18n.locale.value as 'en' | 'es' | 'fr' | 'pt' | 'ar' | 'hi' | 'ja' | 'zh' | 'nl' | 'de')
      } else {
        ui.initLocale()
      }
    })
  }
})
