/**
 * composables/useMapLibre.ts
 * @why MapLibre GL instance lifecycle — create, destroy, resize, load handlers
 * @functions getMapStyle, detectWebGLSupport
 * @connections composables/useMapBase.ts
 */
export function getMapStyle(apiKey: string, tileResolution?: 'low' | 'medium' | 'high'): string {
  const resParam = tileResolution && tileResolution !== 'high' ? `&res=${tileResolution}` : ''
  if (apiKey) {
    return `https://api.maptiler.com/maps/hybrid-v4/style.json?key=${apiKey}${resParam}`
  }
  return 'https://demotiles.maplibre.org/style.json'
}

export function detectWebGLSupport(): boolean {
  if (typeof document === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    return !!gl
  } catch {
    return false
  }
}
