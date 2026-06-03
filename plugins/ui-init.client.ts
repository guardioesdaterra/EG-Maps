export default defineNuxtPlugin(() => {
  if (import.meta.client) {
    const ui = useUiStore()
    ui.initDarkMode()
    ui.initLocale()
  }
})
