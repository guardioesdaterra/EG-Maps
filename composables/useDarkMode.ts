export function useDarkMode() {
  // Use a ref to track initialization - default to false to avoid hydration mismatch
  const isDark = useState<boolean>('darkMode', () => true)
  const isInitialized = useState<boolean>('darkModeInitialized', () => false)

  // Apply dark class to html element - only runs on client
  function applyDarkClass(value: boolean) {
    if (import.meta.client) {
      if (value) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }

  function toggleDarkMode() {
    isDark.value = !isDark.value
    applyDarkClass(isDark.value)
  }

  function setDarkMode(value: boolean) {
    isDark.value = value
    applyDarkClass(value)
  }

  // Initialize from localStorage - runs immediately on client to prevent flash
  if (import.meta.client) {
    // Check localStorage synchronously before first render to prevent flash
    const getInitialDarkMode = (): boolean => {
      const saved = localStorage.getItem('darkMode')
      if (saved !== null) {
        return saved === 'true'
      }
      // Fall back to system preference if no saved value
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }

    // Set initial value immediately (client-only)
    const initialValue = getInitialDarkMode()
    isDark.value = initialValue
    isInitialized.value = true
    applyDarkClass(initialValue)
  }

  // Watch for changes and persist
  watch(isDark, (value) => {
    if (import.meta.client) {
      localStorage.setItem('darkMode', String(value))
      applyDarkClass(value)
    }
  })

  return {
    isDark,
    isInitialized,
    toggle: toggleDarkMode,
    set: setDarkMode
  }
}