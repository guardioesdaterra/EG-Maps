export default defineNuxtPlugin((nuxtApp) => {
  if (import.meta.client) {
    const ui = useUiStore()
    // Defer init until after hydration completes to avoid SSR/client mismatch.
    // The server renders with default values (dark=true, locale=en); the inline
    // <script> in app.head already applies the correct <html> class so there is
    // no flash.  Hooking app:mounted keeps the Pinia state in sync without
    // triggering a hydration diff.
    nuxtApp.hook('app:mounted', () => {
      ui.initDarkMode()
      ui.initLocale()
    })
  }
})
