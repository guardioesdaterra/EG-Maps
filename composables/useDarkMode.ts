export function useDarkMode() {
  // Check system preference as default
  const getSystemPreference = (): boolean => {
    if (process.client) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  }

  const isDark = useState<boolean>('darkMode', () => getSystemPreference())

  // Apply dark class to html element
  function applyDarkClass(value: boolean) {
    if (process.client) {
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

  // Initialize from localStorage on mount to avoid hydration mismatch
  if (process.client) {
    onMounted(() => {
      const saved = localStorage.getItem('darkMode')
      if (saved !== null) {
        isDark.value = saved === 'true'
        applyDarkClass(isDark.value)
      }
    })
  }

  // Watch for changes and persist
  watch(isDark, (value) => {
    if (process.client) {
      localStorage.setItem('darkMode', String(value))
      applyDarkClass(value)
    }
  })

  return {
    isDark,
    toggle: toggleDarkMode,
    set: setDarkMode
  }
}
