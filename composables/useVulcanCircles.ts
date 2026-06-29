import type { Map as MapLibreMap } from 'maplibre-gl'
import maplibregl from 'maplibre-gl'

export interface VulcanCircle {
  radiusKm: number
  color: string
  label: string
  fillOpacity: number
  labelKey: string
}

export const VULCAN_CENTER: [number, number] = [-46.53311955736603, -21.914138005195028]

export const VULCAN_CIRCLES: VulcanCircle[] = [
  { radiusKm: 25,  color: '#e74c3c', label: 'Core Zone',      fillOpacity: 0.08, labelKey: 'observatory.regional.coreZone' },
  { radiusKm: 50,  color: '#f39c12', label: 'Extended Zone',   fillOpacity: 0.05, labelKey: 'observatory.regional.extendedZone' },
  { radiusKm: 100, color: '#27ae60', label: 'Regional Zone',   fillOpacity: 0.03, labelKey: 'observatory.regional.regionalZone' },
]

const SOURCE_ID = 'vulcan-circles'
const LAYER_PREFIX = 'vulcan-circle'

function generateCirclePolygon(center: [number, number], radiusKm: number, points = 64): number[][] {
  const [cx, cy] = center
  const coords: number[][] = []
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI
    const dLat = (radiusKm / 6371) * (180 / Math.PI)
    const dLng = dLat / Math.cos(cy * Math.PI / 180)
    const lat = cy + dLat * Math.cos(angle)
    const lng = cx + dLng * Math.sin(angle)
    coords.push([lng, lat])
  }
  return coords
}

export function setupVulcanCircles(map: maplibregl.Map): () => void {
  if (map.getSource(SOURCE_ID)) return () => {}

  const features = VULCAN_CIRCLES.map((circle, i) => ({
    type: 'Feature' as const,
    id: i,
    properties: {
      radiusKm: circle.radiusKm,
      color: circle.color,
      label: circle.label,
      fillOpacity: circle.fillOpacity,
    },
    geometry: {
      type: 'Polygon' as const,
      coordinates: [generateCirclePolygon(VULCAN_CENTER, circle.radiusKm)],
    },
  }))

  map.addSource(SOURCE_ID, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features },
  })

  // Fills (bottom to top: largest first)
  for (let i = VULCAN_CIRCLES.length - 1; i >= 0; i--) {
    const circle = VULCAN_CIRCLES[i]
    map.addLayer({
      id: `${LAYER_PREFIX}-fill-${i}`,
      type: 'fill',
      source: SOURCE_ID,
      filter: ['==', 'radiusKm', circle.radiusKm],
      paint: {
        'fill-color': circle.color,
        'fill-opacity': circle.fillOpacity,
      },
    })
  }

  // Lines
  for (let i = 0; i < VULCAN_CIRCLES.length; i++) {
    const circle = VULCAN_CIRCLES[i]
    map.addLayer({
      id: `${LAYER_PREFIX}-line-${i}`,
      type: 'line',
      source: SOURCE_ID,
      filter: ['==', 'radiusKm', circle.radiusKm],
      paint: {
        'line-color': circle.color,
        'line-width': i === 0 ? 2 : 1.5,
        'line-opacity': 0.6,
        'line-dasharray': i === 2 ? [4, 2] : [8, 2],
      },
    })
  }

  // Labels
  for (let i = 0; i < VULCAN_CIRCLES.length; i++) {
    const circle = VULCAN_CIRCLES[i]
    map.addLayer({
      id: `${LAYER_PREFIX}-label-${i}`,
      type: 'symbol',
      source: SOURCE_ID,
      filter: ['==', 'radiusKm', circle.radiusKm],
      layout: {
        'text-field': `${circle.radiusKm}km — ${circle.label}`,
        'text-size': 10,
        'text-anchor': 'top',
        'text-offset': [0, 0.5],
        'symbol-placement': 'point',
      },
      paint: {
        'text-color': circle.color,
        'text-opacity': 0.7,
        'text-halo-color': 'rgba(0,0,0,0.8)',
        'text-halo-width': 1,
      },
    })
  }

  // Center marker
  const centerEl = document.createElement('div')
  centerEl.style.cssText = `
    width: 14px; height: 14px; border-radius: 50%;
    background: rgba(231,76,60,0.9); border: 2px solid rgba(255,255,255,0.8);
    box-shadow: 0 0 12px rgba(231,76,60,0.6), inset 0 0 4px rgba(255,255,255,0.3);
    cursor: pointer; position: relative;
  `
  centerEl.title = 'Poços de Caldas — Vulcan Alkaline Complex Center'

  new maplibregl.Marker({ element: centerEl, anchor: 'center' })
    .setLngLat(VULCAN_CENTER)
    .addTo(map)

  return () => cleanupVulcanCircles(map)
}

export function cleanupVulcanCircles(map: maplibregl.Map) {
  for (let i = 0; i < VULCAN_CIRCLES.length; i++) {
    const fillId = `${LAYER_PREFIX}-fill-${i}`
    const lineId = `${LAYER_PREFIX}-line-${i}`
    const labelId = `${LAYER_PREFIX}-label-${i}`
    try { if (map.getLayer(fillId)) map.removeLayer(fillId) } catch { /* layer may not exist */ }
    try { if (map.getLayer(lineId)) map.removeLayer(lineId) } catch { /* layer may not exist */ }
    try { if (map.getLayer(labelId)) map.removeLayer(labelId) } catch { /* layer may not exist */ }
  }
  try { if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID) } catch { /* source may not exist */ }
}

export function setVulcanCirclesVisibility(map: maplibregl.Map, visible: boolean) {
  const visibility = visible ? 'visible' : 'none'
  for (let i = 0; i < VULCAN_CIRCLES.length; i++) {
    const fillId = `${LAYER_PREFIX}-fill-${i}`
    const lineId = `${LAYER_PREFIX}-line-${i}`
    const labelId = `${LAYER_PREFIX}-label-${i}`
    try { if (map.getLayer(fillId)) map.setLayoutProperty(fillId, 'visibility', visibility) } catch { /* ignore */ }
    try { if (map.getLayer(lineId)) map.setLayoutProperty(lineId, 'visibility', visibility) } catch { /* ignore */ }
    try { if (map.getLayer(labelId)) map.setLayoutProperty(labelId, 'visibility', visibility) } catch { /* ignore */ }
  }
}
