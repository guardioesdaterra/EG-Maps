/**
 * composables/useHostEmbed.ts
 * @why Host-embed perception for embeddable pages (eg-grants, …) — detects
 *       when the page runs inside a third-party host (iframe or ?embed=1)
 *       and publishes the host header height as `--eg-embed-offset` on
 *       <html> + `data-eg-embedded`. Global CSS in assets/css/main.css shifts
 *       every fixed/sticky descendant (modals, sticky headers, gates) below
 *       the host header, including Teleported overlays that escape the page
 *       root. No per-component edits needed.
 * @functions useHostEmbed
 */

import { ref, computed, onMounted, onBeforeUnmount, readonly } from 'vue'

const DEFAULT_OFFSET = 64
const ATTR = 'data-eg-embedded'
const VAR = '--eg-embed-offset'

/** Query keys that force embedded mode (any truthy value, bare key = true). */
const EMBED_KEYS = ['embed', 'embedded', 'iframe', 'eg-embed']
/** Query keys carrying the host header height in px. */
const OFFSET_KEYS = ['embed-offset', 'embedOffset', 'header-offset', 'headerOffset', 'host-header-height']

function readQuery(): Record<string, string | null> {
  if (typeof window === 'undefined') return {}
  const out: Record<string, string | null> = {}
  try {
    const params = new URLSearchParams(window.location.search)
    for (const k of [...EMBED_KEYS, ...OFFSET_KEYS]) {
      if (params.has(k)) out[k] = params.get(k)
    }
  } catch { /* URL parsing unavailable */ }
  return out
}

function queryWantsEmbed(q: Record<string, string | null>): boolean {
  return EMBED_KEYS.some((k) => {
    if (!(k in q)) return false
    const v = (q[k] ?? '').toLowerCase().trim()
    return v === '' || v === '1' || v === 'true' || v === 'yes'
  })
}

function queryOffset(q: Record<string, string | null>): number | null {
  for (const k of OFFSET_KEYS) {
    if (!(k in q) || q[k] == null) continue
    const n = Number.parseInt(q[k] as string, 10)
    if (Number.isFinite(n) && n >= 0 && n <= 400) return n
  }
  return null
}

function isFramed(): boolean {
  try {
    return typeof window !== 'undefined' && window.self !== window.top
  } catch {
    // Cross-origin access throw == framed cross-origin.
    return true
  }
}

export interface HostEmbedMessage {
  source: 'eg-host'
  type: 'host:ready' | 'host:header-offset'
  payload?: { offset?: number; embedded?: boolean }
}

export interface UseHostEmbedOptions {
  /**
   * Extra origin allow-list for inbound host messages (same-origin is always
   * trusted). Mirrors useSquarespaceEmbed's `trustedOrigins` — without this,
   * any framed page could spoof `host:ready` / `host:header-offset`.
   */
  trustedOrigins?: string[]
}

/** Default hosts allowed to drive the embedded offset protocol. */
const DEFAULT_TRUSTED_ORIGINS = ['https://earthguardians.org', 'https://www.earthguardians.org']

export function useHostEmbed(opts: UseHostEmbedOptions = {}) {
  const trusted = new Set([...DEFAULT_TRUSTED_ORIGINS, ...(opts.trustedOrigins ?? [])])
  const isEmbedded = ref(false)
  const embedOffsetPx = ref(DEFAULT_OFFSET)

  const applyToDom = () => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    if (isEmbedded.value) {
      root.setAttribute(ATTR, 'true')
      root.style.setProperty(VAR, `${embedOffsetPx.value}px`)
    } else {
      root.removeAttribute(ATTR)
      root.style.removeProperty(VAR)
    }
  }

  const detect = () => {
    const q = readQuery()
    isEmbedded.value = queryWantsEmbed(q) || isFramed()
    embedOffsetPx.value = queryOffset(q) ?? embedOffsetPx.value
    applyToDom()
  }

  const handleMessage = (event: MessageEvent) => {
    const data = event.data as HostEmbedMessage | undefined
    if (!data || data.source !== 'eg-host') return
    // Only the framing parent (same-origin or allow-listed host) may drive
    // embedded state — never arbitrary windows/openers.
    if (typeof window !== 'undefined') {
      if (event.source !== window.parent) return
      if (event.origin !== window.location.origin && !trusted.has(event.origin)) return
    }
    if (data.type === 'host:ready') {
      isEmbedded.value = data.payload?.embedded ?? true
      if (typeof data.payload?.offset === 'number') embedOffsetPx.value = data.payload.offset
      applyToDom()
    } else if (data.type === 'host:header-offset') {
      const n = data.payload?.offset
      if (typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 400) {
        isEmbedded.value = true
        embedOffsetPx.value = n
        applyToDom()
      }
    }
  }

  const onMessage = (e: Event) => handleMessage(e as MessageEvent)

  onMounted(() => {
    detect()
    window.addEventListener('message', onMessage)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('message', onMessage)
    // Only clear what we set — another embedded page may own it.
    if (typeof document !== 'undefined' && document.documentElement.getAttribute(ATTR) === 'true') {
      document.documentElement.removeAttribute(ATTR)
      document.documentElement.style.removeProperty(VAR)
    }
  })

  /** Inline style helper for page roots (class handles most cases). */
  const embedStyle = computed(() => ({
    [VAR]: `${embedOffsetPx.value}px`,
  }))

  return {
    isEmbedded: readonly(isEmbedded),
    embedOffsetPx: readonly(embedOffsetPx),
    embedStyle,
  }
}
