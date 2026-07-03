export function getMapStyle(apiKey: string): string {
  return apiKey
    ? `https://api.maptiler.com/maps/satellite-v2/style.json?key=${apiKey}`
    : 'https://demotiles.maplibre.org/style.json'
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
