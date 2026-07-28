/**
 * composables/useStateHash.ts
 * @why URL hash-based state persistence — encodes/decodes state object to location.hash
 * @functions useStateHash
 * @interfaces ShareableState
 * @deps vue (ref, onMounted)
 * @connections composables/useObservatoryControls.ts
 */
import { ref, onMounted } from 'vue'

export interface ShareableState {
  center?: [number, number]
  zoom?: number
  yearMin?: number
  yearMax?: number
  phases?: string[]
  heatmap?: boolean
  enterprise?: boolean
  tab?: string
}

function encodeState(state: ShareableState): string {
  const parts: string[] = []
  if (state.center) parts.push(`${state.center[0].toFixed(4)},${state.center[1].toFixed(4)}`)
  if (state.zoom) parts.push(`z${state.zoom.toFixed(1)}`)
  if (state.yearMin && state.yearMin > 1935) parts.push(`ymin${state.yearMin}`)
  if (state.yearMax && state.yearMax < 2026) parts.push(`ymax${state.yearMax}`)
  if (state.phases && state.phases.length < 7) parts.push(`ph${state.phases.join('.')}`)
  if (state.heatmap) parts.push('heat')
  if (state.enterprise) parts.push('ent')
  if (state.tab && state.tab !== 'danger') parts.push(`tab${state.tab}`)
  return parts.join('/')
}

function decodeState(hash: string): ShareableState {
  if (!hash) return {}
  const state: ShareableState = {}
  const parts = hash.replace(/^#\/?/, '').split('/')
  for (const part of parts) {
    if (part.match(/^-?\d+\.\d+,-?\d+\.\d+$/)) {
      const [lng, lat] = part.split(',').map(Number)
      state.center = [lng, lat]
    } else if (part.startsWith('z')) {
      state.zoom = parseFloat(part.slice(1))
    } else if (part.startsWith('ymin')) {
      state.yearMin = parseInt(part.slice(4), 10)
    } else if (part.startsWith('ymax')) {
      state.yearMax = parseInt(part.slice(4), 10)
    } else if (part.startsWith('ph')) {
      state.phases = part.slice(2).split('.')
    } else if (part === 'heat') {
      state.heatmap = true
    } else if (part === 'ent') {
      state.enterprise = true
    } else if (part.startsWith('tab')) {
      state.tab = part.slice(3)
    }
  }
  return state
}

export function useStateHash() {
  const currentState = ref<ShareableState>({})
  const restoredState = ref<ShareableState | null>(null)

  onMounted(() => {
    const hash = window.location.hash
    if (hash && hash.length > 2) {
      restoredState.value = decodeState(hash)
    }
  })

  function updateHash(state: ShareableState) {
    const encoded = encodeState(state)
    if (encoded) {
      window.location.hash = `/${encoded}`
    } else {
      history.replaceState(null, '', window.location.pathname + window.location.search)
    }
    currentState.value = state
  }

  function copyShareUrl(state: ShareableState): Promise<boolean> {
    const encoded = encodeState(state)
    const url = `${window.location.origin}${window.location.pathname}${encoded ? `#/${encoded}` : ''}`
    return navigator.clipboard.writeText(url).then(() => true).catch(() => false)
  }

  return { currentState, restoredState, updateHash, copyShareUrl }
}
