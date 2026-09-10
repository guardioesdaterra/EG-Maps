/**
 * composables/useMapLibre.ts
 * @why MapLibre GL instance lifecycle — create, destroy, resize, load handlers
 * @functions getMapStyle, detectWebGLSupport
 * @connections composables/useMapBase.ts
 */
export function getMapStyle(apiKey: string, tileResolution?: 'low' | 'medium' | 'high', baseURL = '/'): string | Record<string, unknown> {
  const resParam = tileResolution && tileResolution !== 'high' ? `&res=${tileResolution}` : ''
  if (apiKey) {
    return `https://api.maptiler.com/maps/hybrid-v4/style.json?key=${apiKey}${resParam}`
  }
  return {
    version: 8,
    sources: {
      earthGuardiansLand: {
        type: 'geojson',
        data: `${baseURL.replace(/\/$/, '/')}data/embed/land-110m.geojson`,
      },
    },
    layers: [
      { id: 'local-background', type: 'background', paint: { 'background-color': '#07110d' } },
      { id: 'local-land', type: 'fill', source: 'earthGuardiansLand', paint: { 'fill-color': '#193b2a', 'fill-opacity': 0.92 } },
      { id: 'local-land-outline', type: 'line', source: 'earthGuardiansLand', paint: { 'line-color': '#5b8f63', 'line-opacity': 0.45, 'line-width': 0.7 } },
    ],
  }
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
