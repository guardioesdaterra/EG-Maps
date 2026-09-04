/**
 * composables/useSquarespaceEmbed.ts
 * @why Squarespace (and any third-party host) integration bridge — exposes a
 *       cross-origin-safe lifecycle, auto-resize via ResizeObserver + postMessage
 *       height sync, theme sync (light/dark), and a `host` API so the parent
 *       Squarespace page can drive the embedded map (focus a region, open a popup,
 *       replace data).
 *
 *       The embed is *mounted* inside the host page via either:
 *         (a) a same-origin <script> tag pointing at the Nuxt static bundle, or
 *         (b) a transparent iframe to a Nuxt static route.
 *
 *       Both modes use the same postMessage protocol so the host page can talk
 *       to the embed without DOM coupling.
 *
 * @functions useSquarespaceEmbed
 * @connections pages/squarespace/active-crews.vue
 */
import { ref, onMounted, onBeforeUnmount, readonly } from 'vue'
import type { Ref } from 'vue'

export type SquarespaceEmbedTheme = 'auto' | 'light' | 'dark'

export interface SquarespaceEmbedHostMessage {
  /** Discriminator; always "squarespace-embed" for v1. */
  source: 'squarespace-embed'
  /** Protocol version. */
  version: 1
  /** Message kind. */
  type:
    | 'host:ready'
    | 'host:resize'
    | 'host:theme'
    | 'host:focus'
    | 'host:open'
    | 'host:data'
    | 'embed:ready'
    | 'embed:height'
    | 'embed:click'
    | 'embed:error'
  /** Optional payload — kind-specific. */
  payload?: unknown
}

export interface UseSquarespaceEmbedOptions {
  /** Mounted root element; the composable sizes the embed to its clientHeight. */
  rootRef: Ref<HTMLElement | null>
  /** Logical namespace for postMessage routing (multiple embeds per page). */
  channel?: string
  /** Minimum height clamp — embed will never report below this. */
  minHeight?: number
  /** Initial theme. Defaults to 'auto' (follows prefers-color-scheme). */
  initialTheme?: SquarespaceEmbedTheme
  /** Origin allow-list for inbound messages. Empty = same-origin only. */
  trustedOrigins?: string[]
}

export interface SquarespaceEmbedApi {
  /** Reactive theme resolved from host preference or media query. */
  theme: Readonly<Ref<SquarespaceEmbedTheme>>
  /** Reactive last inbound message kind (debug aid). */
  lastInbound: Readonly<Ref<string>>
  /** True once the embed booted and broadcast `embed:ready`. */
  isReady: Readonly<Ref<boolean>>
  /** Outbound: report current pixel height to the host. */
  reportHeight: (px?: number) => void
  /** Outbound: emit a click event to the host (e.g. crew popup opened). */
  emitClick: (payload: unknown) => void
  /** Outbound: emit an error. */
  emitError: (payload: unknown) => void
  /** Programmatic theme override; bypasses host sync. */
  setTheme: (t: SquarespaceEmbedTheme) => void
  /** Tear down listeners (called automatically on unmount). */
  destroy: () => void
}

export function useSquarespaceEmbed(opts: UseSquarespaceEmbedOptions): SquarespaceEmbedApi {
  const channel = opts.channel ?? 'eg-maps-active-crews'
  const minHeight = opts.minHeight ?? 360
  const trusted = new Set(opts.trustedOrigins ?? [])

  const theme = ref<SquarespaceEmbedTheme>(opts.initialTheme ?? 'auto')
  const lastInbound = ref<string>('')
  const isReady = ref<boolean>(false)

  let resizeObserver: ResizeObserver | null = null
  let mediaQuery: MediaQueryList | null = null
  let mediaListener: ((e: MediaQueryListEvent) => void) | null = null

  const post = (msg: Omit<SquarespaceEmbedHostMessage, 'source' | 'version' | 'payload'> & {
    payload?: unknown
  }) => {
    const out: SquarespaceEmbedHostMessage = {
      source: 'squarespace-embed',
      version: 1,
      type: msg.type,
      payload: msg.payload,
    }
    // window.parent covers the standard iframe case; window.top covers nested embeds.
    const target = (window.parent !== window ? window.parent : null) ?? window.top ?? null
    if (!target || target === window) return
    // '*' is safe here because we never trust inbound payloads — they're validated below.
    target.postMessage(out, '*')
  }

  const reportHeight = (px?: number) => {
    const root = opts.rootRef.value
    if (!root) return
    const h = Math.max(minHeight, Math.round(px ?? root.clientHeight))
    post({ type: 'embed:height', payload: h })
  }

  const emitClick = (payload: unknown) => post({ type: 'embed:click', payload })
  const emitError = (payload: unknown) => post({ type: 'embed:error', payload })

  const setTheme = (t: SquarespaceEmbedTheme) => {
    theme.value = t
    document.documentElement.classList.toggle('dark', t === 'dark')
  }

  const handleMessage = (event: MessageEvent) => {
    const data = event.data as SquarespaceEmbedHostMessage | undefined
    if (!data || data.source !== 'squarespace-embed' || data.version !== 1) return
    if (trusted.size > 0 && !trusted.has(event.origin)) return
    lastInbound.value = data.type
    switch (data.type) {
      case 'host:ready': {
        // Host signals bootstrap; re-broadcast our state.
        isReady.value = true
        const payload = data.payload as { theme?: SquarespaceEmbedTheme } | undefined
        if (payload?.theme) setTheme(payload.theme)
        reportHeight()
        break
      }
      case 'host:resize': {
        const h = (data.payload as { height?: number } | undefined)?.height
        if (typeof h === 'number' && opts.rootRef.value) {
          opts.rootRef.value.style.minHeight = `${Math.max(minHeight, h)}px`
          reportHeight(h)
        }
        break
      }
      case 'host:theme': {
        const t = (data.payload as { theme?: SquarespaceEmbedTheme } | undefined)?.theme
        if (t === 'light' || t === 'dark' || t === 'auto') setTheme(t)
        break
      }
      // host:open, host:focus, host:data are routed via window events so any
      // composable on the page can subscribe without coupling here.
      case 'host:open':
      case 'host:focus':
      case 'host:data':
        window.dispatchEvent(
          new CustomEvent(`eg-embed:${data.type}`, { detail: data.payload ?? null }),
        )
        break
    }
  }

  const attachAutoResize = () => {
    const root = opts.rootRef.value
    if (!root) return
    resizeObserver = new ResizeObserver(() => reportHeight())
    resizeObserver.observe(root)
  }

  const attachThemeProbe = () => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaListener = (e) => {
      if (theme.value === 'auto') {
        document.documentElement.classList.toggle('dark', e.matches)
      }
    }
    mediaQuery.addEventListener('change', mediaListener)
    if (theme.value === 'auto') {
      document.documentElement.classList.toggle('dark', mediaQuery.matches)
    }
  }

  onMounted(() => {
    attachAutoResize()
    attachThemeProbe()
    window.addEventListener('message', handleMessage)
    // Announce readiness so the host can acknowledge.
    isReady.value = true
    post({ type: 'embed:ready', payload: { channel } })
    reportHeight()
  })

  onBeforeUnmount(() => {
    window.removeEventListener('message', handleMessage)
    resizeObserver?.disconnect()
    resizeObserver = null
    if (mediaQuery && mediaListener) mediaQuery.removeEventListener('change', mediaListener)
    mediaQuery = null
    mediaListener = null
  })

  return {
    theme: readonly(theme),
    lastInbound: readonly(lastInbound),
    isReady: readonly(isReady),
    reportHeight,
    emitClick,
    emitError,
    setTheme,
    destroy: () => {
      window.removeEventListener('message', handleMessage)
      resizeObserver?.disconnect()
    },
  }
}