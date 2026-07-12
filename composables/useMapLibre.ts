export function getMapStyle(apiKey: string, tileResolution?: 'low' | 'medium' | 'high'): string {
  const resParam = tileResolution && tileResolution !== 'high' ? `&res=${tileResolution}` : ''
  return apiKey
    ? `https://api.maptiler.com/maps/hybrid-v4/style.json?key=${apiKey}${resParam}`
    : `https://api.maptiler.com/maps/satellite-v4/style.json?key=${apiKey}${resParam}`
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
