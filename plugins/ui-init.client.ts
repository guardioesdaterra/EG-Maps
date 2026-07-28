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
      ui.initLocale()
    })
  }
})
