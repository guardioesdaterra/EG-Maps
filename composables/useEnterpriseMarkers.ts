import type { Map as MapLibreMap } from 'maplibre-gl'
import maplibregl from 'maplibre-gl'
import { ENTERPRISES, CORPORATE_CONNECTIONS, buildEnterpriseHQGeoJSON, type EnterpriseHQ } from '@/lib/enterprise-data'

const ENTERPRISE_SOURCE = 'enterprise-hq'
const ENTERPRISE_LAYER = 'enterprise-hq-layer'
const ENTERPRISE_GLOW = 'enterprise-hq-glow'
const ENTERPRISE_LABEL = 'enterprise-hq-label'
const ENTERPRISE_CONN_SOURCE = 'enterprise-connections'
const ENTERPRISE_CONN_LAYER = 'enterprise-connections-layer'
const ENTERPRISE_CONN_GLOW = 'enterprise-connections-glow'

const LAYER_IDS = [ENTERPRISE_CONN_GLOW, ENTERPRISE_CONN_LAYER, ENTERPRISE_GLOW, ENTERPRISE_LAYER, ENTERPRISE_LABEL]
const SOURCE_IDS = [ENTERPRISE_CONN_SOURCE, ENTERPRISE_SOURCE]

let mapInstance: MapLibreMap | null = null
let hqMarkers: maplibregl.Marker[] = []
let onHQClick: ((enterprise: EnterpriseHQ) => void) | null = null

function safeRemoveLayer(map: MapLibreMap, id: string) {
  try { if (map.getLayer(id)) map.removeLayer(id) } catch { /* empty */ }
}

function safeRemoveSource(map: MapLibreMap, id: string) {
  try { if (map.getSource(id)) map.removeSource(id) } catch { /* empty */ }
}

function canAddSource(map: MapLibreMap, id: string): boolean {
  return !!(map.isStyleLoaded() && !map.getSource(id))
}

export function setupEnterpriseLayer(map: MapLibreMap, onClick?: (e: EnterpriseHQ) => void) {
  try {
    mapInstance = map
    onHQClick = onClick || null

    cleanupEnterpriseLayer(map)

    if (!map.isStyleLoaded()) {
      map.once('style.load', () => setupEnterpriseLayer(map, onClick))
      return
    }

    const geojson = buildEnterpriseHQGeoJSON()

    if (!canAddSource(map, ENTERPRISE_SOURCE)) return
    map.addSource(ENTERPRISE_SOURCE, { type: 'geojson', data: geojson })

    map.addLayer({
      id: ENTERPRISE_GLOW,
      type: 'circle',
      source: ENTERPRISE_SOURCE,
      paint: {
        'circle-color': ['get', 'color'],
        'circle-radius': 18,
        'circle-opacity': 0.12,
        'circle-blur': 3,
      },
    })

    map.addLayer({
      id: ENTERPRISE_LAYER,
      type: 'circle',
      source: ENTERPRISE_SOURCE,
      paint: {
        'circle-color': ['get', 'color'],
        'circle-radius': 9,
        'circle-opacity': 0.85,
        'circle-stroke-width': 2,
        'circle-stroke-color': 'rgba(255,255,255,0.3)',
      },
    })

    map.addLayer({
      id: ENTERPRISE_LABEL,
      type: 'symbol',
      source: ENTERPRISE_SOURCE,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Open Sans Regular'],
        'text-size': 9,
        'text-offset': [0, 1.8],
        'text-anchor': 'top',
        'text-allow-overlap': false,
      },
      paint: {
        'text-color': '#ddd',
        'text-halo-color': 'rgba(0,0,0,0.85)',
        'text-halo-width': 1.5,
      },
    })

    map.on('click', ENTERPRISE_LAYER, (e: any) => {
      if (!e.features?.length) return
      const props = e.features[0].properties
      const enterprise = ENTERPRISES.find(ent => ent.name === props.name)
      if (enterprise && onHQClick) onHQClick(enterprise)
    })

    map.on('mouseenter', ENTERPRISE_LAYER, () => { map.getCanvas().style.cursor = 'pointer' })
    map.on('mouseleave', ENTERPRISE_LAYER, () => { map.getCanvas().style.cursor = '' })

    ENTERPRISES.forEach(ent => {
      if (!ent.lat || !ent.lng) return
      const el = document.createElement('div')
      el.style.width = '32px'
      el.style.height = '32px'
      el.style.borderRadius = '50%'
      el.style.background = ent.color
      el.style.border = '2px solid rgba(255,255,255,0.4)'
      el.style.boxShadow = `0 0 16px ${ent.color}66`
      el.style.display = 'flex'
      el.style.alignItems = 'center'
      el.style.justifyContent = 'center'
      el.style.cursor = 'pointer'
      el.style.fontSize = '11px'
      el.style.fontWeight = '800'
      el.style.color = '#fff'
      el.textContent = ent.name.slice(0, 2)
      el.title = ent.name
      el.addEventListener('click', () => {
        if (onHQClick) onHQClick(ent)
      })

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([ent.lng, ent.lat])
        .addTo(map)
      hqMarkers.push(marker)
    })

    addEnterpriseConnections(map)
  } catch (e) {
    console.warn('Failed to setup enterprise layer:', e)
  }
}

function addEnterpriseConnections(map: MapLibreMap) {
  if (!canAddSource(map, ENTERPRISE_CONN_SOURCE)) return
  const features: GeoJSON.Feature[] = CORPORATE_CONNECTIONS.map(conn => {
    const from = ENTERPRISES.find(e => e.name === conn.from)
    const to = ENTERPRISES.find(e => e.name === conn.to)
    if (!from || !to) return null
    const color = getConnectionColor(conn.type)
    return {
      type: 'Feature',
      properties: { type: conn.type, color, from: conn.from, to: conn.to },
      geometry: {
        type: 'LineString',
        coordinates: [
          [from.lng, from.lat],
          [(from.lng + to.lng) / 2 + 2, (from.lat + to.lat) / 2],
          [to.lng, to.lat],
        ],
      },
    }
  }).filter(Boolean) as GeoJSON.Feature[]

  if (!features.length) return

  map.addSource(ENTERPRISE_CONN_SOURCE, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features },
  })

  map.addLayer({
    id: ENTERPRISE_CONN_GLOW,
    type: 'line',
    source: ENTERPRISE_CONN_SOURCE,
    paint: {
      'line-color': ['get', 'color'],
      'line-width': 3,
      'line-opacity': 0.15,
      'line-blur': 3,
    },
  })

  map.addLayer({
    id: ENTERPRISE_CONN_LAYER,
    type: 'line',
    source: ENTERPRISE_CONN_SOURCE,
    paint: {
      'line-color': ['get', 'color'],
      'line-width': 0.8,
      'line-opacity': 0.3,
      'line-dasharray': [1, 3],
    },
  })
}

function getConnectionColor(type: string): string {
  switch (type) {
    case 'shareholding': return '#e74c3c'
    case 'subsidiary': return '#3498db'
    case 'joint_venture': return '#27ae60'
    case 'board_overlap': return '#8e44ad'
    case 'partnership': return '#f39c12'
    default: return '#666'
  }
}

export function cleanupEnterpriseLayer(map: MapLibreMap) {
  hqMarkers.forEach(m => m.remove())
  hqMarkers = []
  LAYER_IDS.forEach(id => safeRemoveLayer(map, id))
  SOURCE_IDS.forEach(id => safeRemoveSource(map, id))
  mapInstance = null
}
