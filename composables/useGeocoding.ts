/**
 * composables/useGeocoding.ts
 * @why Forward/reverse address lookup for the garden setup step. Uses Photon
 *      (CORS-friendly, no key) and falls back to Nominatim, so the first step
 *      can start from a street address instead of raw coordinates.
 * @functions useGeocoding
 * @types GeoSearchResult
 * @connections components/tools/garden/AreaSetupWizard.vue
 */

import { ref } from 'vue'

export interface GeoSearchResult {
  id: string
  label: string
  name: string
  lat: number
  lng: number
}

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] }
  properties?: Record<string, unknown>
}

interface NominatimResult {
  place_id?: number
  display_name?: string
  lat?: string
  lon?: string
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function photonLabel(props: Record<string, unknown>, fallback: string): string {
  const name = text(props.name)
  const street = [text(props.street), text(props.housenumber)].filter(Boolean).join(' ')
  const city = text(props.city) || text(props.town) || text(props.village) || text(props.district)
  const region = text(props.state) || text(props.county)
  const country = text(props.country)
  const parts = [name || street || fallback, street && street !== name ? street : '', city, region, country]
  return parts.filter(Boolean).join(', ')
}

export function useGeocoding() {
  const results = ref<GeoSearchResult[]>([])
  const isSearching = ref(false)
  const isResolving = ref(false)
  const error = ref<'unavailable' | null>(null)
  let controller: AbortController | null = null

  function abort() {
    controller?.abort()
    controller = null
  }

  async function searchPhoton(query: string, signal: AbortSignal): Promise<GeoSearchResult[]> {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6&lang=en`
    const response = await fetch(url, { signal, headers: { Accept: 'application/json' } })
    if (!response.ok) throw new Error(`Photon ${response.status}`)
    const payload = await response.json() as { features?: PhotonFeature[] }
    return (payload.features ?? []).flatMap((feature, index) => {
      const coords = feature.geometry?.coordinates
      if (!coords || !Number.isFinite(coords[0]) || !Number.isFinite(coords[1])) return []
      const props = feature.properties ?? {}
      const fallback = text(props.osm_value) || text(props.osm_key) || 'Address'
      return [{
        id: `photon-${index}-${coords[0]}-${coords[1]}`,
        label: photonLabel(props, fallback),
        name: text(props.name) || fallback,
        lat: coords[1],
        lng: coords[0],
      }]
    })
  }

  async function searchNominatim(query: string, signal: AbortSignal): Promise<GeoSearchResult[]> {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&addressdetails=0&q=${encodeURIComponent(query)}`
    const response = await fetch(url, { signal, headers: { Accept: 'application/json' } })
    if (!response.ok) throw new Error(`Nominatim ${response.status}`)
    const payload = await response.json() as NominatimResult[]
    return (payload ?? []).flatMap((item, index) => {
      const lat = Number(item.lat)
      const lng = Number(item.lon)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return []
      const label = text(item.display_name)
      return [{
        id: `nominatim-${item.place_id ?? index}`,
        label: label || 'Address',
        name: label.split(',')[0] || 'Address',
        lat,
        lng,
      }]
    })
  }

  /** Forward geocode. Resolves to the result list; also stores it in `results`. */
  async function search(query: string): Promise<GeoSearchResult[]> {
    const trimmed = query.trim()
    abort()
    error.value = null
    if (trimmed.length < 3) {
      results.value = []
      return []
    }
    controller = new AbortController()
    const signal = controller.signal
    isSearching.value = true
    try {
      let found = await searchPhoton(trimmed, signal)
      if (found.length === 0) found = await searchNominatim(trimmed, signal)
      results.value = found
      return found
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return results.value
      // Second provider — Photon may be blocked by an extension or network.
      try {
        const found = await searchNominatim(trimmed, signal)
        results.value = found
        return found
      } catch (fallbackErr) {
        if ((fallbackErr as Error)?.name === 'AbortError') return results.value
        error.value = 'unavailable'
        results.value = []
        return []
      }
    } finally {
      isSearching.value = false
      controller = null
    }
  }

  /** Resolve a map-picked point to a readable address. Returns '' when unknown. */
  async function reverse(lng: number, lat: number): Promise<string> {
    abort()
    controller = new AbortController()
    const signal = controller.signal
    isResolving.value = true
    try {
      const url = `https://photon.komoot.io/reverse?lon=${lng}&lat=${lat}&limit=1`
      const response = await fetch(url, { signal, headers: { Accept: 'application/json' } })
      if (!response.ok) throw new Error(`Photon ${response.status}`)
      const payload = await response.json() as { features?: PhotonFeature[] }
      const feature = payload.features?.[0]
      if (!feature) return ''
      return photonLabel(feature.properties ?? {}, 'Pinned location')
    } catch {
      return ''
    } finally {
      isResolving.value = false
      controller = null
    }
  }

  function clear() {
    abort()
    results.value = []
    error.value = null
    isSearching.value = false
  }

  return { results, isSearching, isResolving, error, search, reverse, clear }
}
