export function getMapStyle(apiKey?: string): string {
  if (apiKey) return `https://api.maptiler.com/maps/hybrid-v4/style.json?key=${apiKey}`
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
