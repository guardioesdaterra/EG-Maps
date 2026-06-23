/**
 * Reactive state backed by a URL hash fragment (`#key=...`).
 * Survives page reloads and is shareable.
 * Works on SSR (no-op) and client.
 */
export function useUrlState<T extends Record<string, string | number | boolean | null | undefined>>(
  key: string,
  defaults: T,
) {
  const state = ref<T>({ ...defaults }) as Ref<T>

  const HASH_PREFIX = `${key}=`
  const isClient = () => typeof window !== 'undefined'

  function encode(obj: T): string {
    const parts: string[] = []
    for (const [k, v] of Object.entries(obj)) {
      if (v === null || v === undefined || v === '') continue
      if (v === false) continue
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    }
    return parts.join('&')
  }

  function decode(hash: string): Partial<T> {
    const result: Partial<T> = {}
    if (!hash) return result
    const cleaned = hash.replace(/^#/, '')
    const search = cleaned.startsWith(HASH_PREFIX)
      ? cleaned.slice(HASH_PREFIX.length)
      : cleaned
    const params = new URLSearchParams(search)
    for (const [k, v] of params.entries()) {
      if (k in defaults) {
        const def = defaults[k]
        if (typeof def === 'number') {
          const n = Number(v)
          if (!Number.isNaN(n)) (result as Record<string, unknown>)[k] = n
        } else if (typeof def === 'boolean') {
          (result as Record<string, unknown>)[k] = v === 'true' || v === '1'
        } else {
          (result as Record<string, unknown>)[k] = v
        }
      }
    }
    return result
  }

  function readFromHash() {
    if (!isClient()) return
    const hash = window.location.hash.replace(/^#/, '')
    if (!hash) return
    const parsed = decode(hash)
    if (Object.keys(parsed).length > 0) {
      state.value = { ...defaults, ...parsed } as T
    }
  }

  function writeToHash() {
    if (!isClient()) return
    const encoded = encode(state.value)
    const newHash = encoded ? `#${HASH_PREFIX}${encoded}` : ''
    const url = new URL(window.location.href)
    if (newHash !== url.hash) {
      url.hash = newHash
      // Use replaceState to avoid flooding history on every change
      window.history.replaceState({}, '', url.toString())
    }
  }

  // Read on init
  if (isClient()) readFromHash()

  // Sync to URL on change
  if (isClient()) {
    watch(state, () => writeToHash(), { deep: true })
    // Listen for back/forward navigation
    const handler = () => readFromHash()
    window.addEventListener('hashchange', handler)
    if (typeof onScopeDispose === 'function') {
      onScopeDispose(() => window.removeEventListener('hashchange', handler))
    }
  }

  function set<K extends keyof T>(k: K, v: T[K]) {
    state.value = { ...state.value, [k]: v } as T
  }

  function reset() {
    state.value = { ...defaults }
  }

  return { state, set, reset }
}
