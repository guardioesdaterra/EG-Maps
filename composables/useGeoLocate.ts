/**
 * Browser geolocation + OpenStreetMap Nominatim geocoding (no API key).
 * Provides locate → reverse geocode, and city name → forward geocode.
 */
import { ref } from 'vue'

export interface GeoLocation {
  lat: number
  lng: number
  accuracy?: number
}

export interface GeoAddress {
  city?: string
  state?: string
  country?: string
  displayName: string
}

export interface CitySuggestion {
  displayName: string
  lat: number
  lng: number
  city: string
  state?: string
  country?: string
}

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'
const NOMINATIM_HEADERS = {
  'Accept-Language': 'en,pt',
  'User-Agent': 'EG-Maps/1.0 (https://earthguardians.org)',
}

/**
 * Get browser geolocation position.
 * Returns null if denied/unavailable, throws with reason on hard failures.
 */
export function getBrowserLocation(): Promise<GeoLocation | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        })
      },
      (err) => {
        // err.code: 1=PERMISSION_DENIED, 2=POSITION_UNAVAILABLE, 3=TIMEOUT
        if (err.code === 1) {
          // Permission denied — user blocked it, return null gracefully
          resolve(null)
        } else {
          // Position unavailable or timeout — also return null
          resolve(null)
        }
      },
      { timeout: 10000, maximumAge: 300_000, enableHighAccuracy: true },
    )
  })
}

/**
 * Reverse geocode coordinates → address via Nominatim.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<GeoAddress | null> {
  try {
    const url = `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`
    const res = await fetch(url, { headers: NOMINATIM_HEADERS })
    if (!res.ok) return null
    const data = await res.json()
    return {
      city: data.address?.city || data.address?.town || data.address?.village || data.address?.municipality,
      state: data.address?.state,
      country: data.address?.country,
      displayName: data.display_name ?? '',
    }
  } catch {
    return null
  }
}

/**
 * Forward geocode a city name → coordinates via Nominatim.
 * Returns top 5 results.
 */
export async function forwardGeocode(query: string): Promise<CitySuggestion[]> {
  if (!query.trim()) return []
  try {
    const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&countrycodes=br`
    const res = await fetch(url, { headers: NOMINATIM_HEADERS })
    if (!res.ok) return []
    const data = await res.json()
    return data.map((r: Record<string, unknown>) => {
      const addr = (r.address ?? {}) as Record<string, unknown>
      return {
        displayName: String(r.display_name ?? ''),
        lat: Number(r.lat),
        lng: Number(r.lon),
        city: String(addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? ''),
        state: String(addr.state ?? ''),
        country: String(addr.country ?? ''),
      }
    })
  } catch {
    return []
  }
}

/**
 * Composable that manages the full locate flow.
 */
export function useGeoLocate() {
  const isLoading = ref(false)
  const location = ref<GeoLocation | null>(null)
  const address = ref<GeoAddress | null>(null)
  const suggestions = ref<CitySuggestion[]>([])
  const error = ref<string | null>(null)

  async function locate(): Promise<GeoLocation | null> {
    isLoading.value = true
    error.value = null
    try {
      const loc = await getBrowserLocation()
      if (!loc) {
        error.value = 'Location access denied or unavailable'
        return null
      }
      location.value = loc
      const addr = await reverseGeocode(loc.lat, loc.lng)
      address.value = addr
      return loc
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Location failed'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function searchCity(query: string): Promise<CitySuggestion[]> {
    isLoading.value = true
    try {
      const results = await forwardGeocode(query)
      suggestions.value = results
      return results
    } finally {
      isLoading.value = false
    }
  }

  function selectCity(city: CitySuggestion): GeoLocation {
    const loc = { lat: city.lat, lng: city.lng }
    location.value = loc
    address.value = {
      city: city.city,
      state: city.state,
      country: city.country,
      displayName: city.displayName,
    }
    suggestions.value = []
    return loc
  }

  return {
    isLoading,
    location,
    address,
    suggestions,
    error,
    locate,
    searchCity,
    selectCity,
  }
}
