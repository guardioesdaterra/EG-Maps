/**
 * lib/garden-constants.ts
 * @why Defaults, colors, and layer configuration for the Agroecological Garden Tool.
 * @connections lib/garden-types.ts
 */
import type { GardenLayerType, LayerStyle } from './garden-types'

export const GARDEN_STORAGE_KEY = 'eg-garden-projects'
export const GARDEN_PROJECT_VERSION = 1
export const DEFAULT_GARDEN_NAME = 'New Garden'
export const DEFAULT_LOCATION = { lat: -15.7801, lng: -47.9292, zoom: 16 } // Brasília, DF — Brazil agroecology reference
export const DEFAULT_HEMISPHERE: 'north' | 'south' = 'south'
export const DEFAULT_LOCALE = 'pt'

export const LAYER_DEFAULTS: Record<GardenLayerType, { name: string; style: LayerStyle }> = {
  seeds: { name: 'Seeds', style: { color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.35, lineWidth: 2, radius: 5, visible: true } },
  seedlings: { name: 'Seedlings', style: { color: '#4ade80', fillColor: '#4ade80', fillOpacity: 0.35, lineWidth: 2, radius: 6, visible: true } },
  transplants: { name: 'Transplants', style: { color: '#86efac', fillColor: '#86efac', fillOpacity: 0.35, lineWidth: 2, radius: 7, visible: true } },
  'fertile-earth': { name: 'Fertile Earth', style: { color: '#a16207', fillColor: '#a16207', fillOpacity: 0.25, lineWidth: 1, radius: 4, visible: true } },
  compost: { name: 'Compost', style: { color: '#b45309', fillColor: '#b45309', fillOpacity: 0.3, lineWidth: 1, radius: 5, visible: true } },
  mulch: { name: 'Mulch', style: { color: '#78350f', fillColor: '#78350f', fillOpacity: 0.3, lineWidth: 1, radius: 4, visible: true } },
  biochar: { name: 'Biochar', style: { color: '#451a03', fillColor: '#451a03', fillOpacity: 0.35, lineWidth: 1, radius: 4, visible: true } },
  'water-way': { name: 'Water Way', style: { color: '#0ea5e9', fillColor: '#0ea5e9', fillOpacity: 0.2, lineWidth: 3, radius: 5, visible: true } },
  spring: { name: 'Spring / Nascente', style: { color: '#06b6d4', fillColor: '#06b6d4', fillOpacity: 0.4, lineWidth: 2, radius: 7, visible: true } },
  'water-source-natural': { name: 'Natural Water Source', style: { color: '#22d3ee', fillColor: '#22d3ee', fillOpacity: 0.3, lineWidth: 2, radius: 6, visible: true } },
  'water-source-tap': { name: 'Tap / Torneira', style: { color: '#38bdf8', fillColor: '#38bdf8', fillOpacity: 0.35, lineWidth: 2, radius: 6, visible: true } },
  irrigation: { name: 'Irrigation', style: { color: '#0891b2', fillColor: '#0891b2', fillOpacity: 0.15, lineWidth: 2, radius: 4, visible: true } },
  greenhouse: { name: 'Greenhouse', style: { color: '#64748b', fillColor: '#64748b', fillOpacity: 0.2, lineWidth: 2, radius: 4, visible: true } },
  shed: { name: 'Shed', style: { color: '#475569', fillColor: '#475569', fillOpacity: 0.25, lineWidth: 2, radius: 4, visible: true } },
  fence: { name: 'Fence', style: { color: '#94a3b8', fillColor: '#94a3b8', fillOpacity: 0.15, lineWidth: 2, radius: 3, visible: true } },
  trellis: { name: 'Trellis', style: { color: '#cbd5e1', fillColor: '#cbd5e1', fillOpacity: 0.2, lineWidth: 2, radius: 3, visible: true } },
  bed: { name: 'Garden Bed', style: { color: '#78716c', fillColor: '#78716c', fillOpacity: 0.3, lineWidth: 2, radius: 4, visible: true } },
  path: { name: 'Path', style: { color: '#a8a29e', fillColor: '#a8a29e', fillOpacity: 0.25, lineWidth: 2, radius: 3, visible: true } },
  vegetable: { name: 'Vegetable', style: { color: '#16a34a', fillColor: '#16a34a', fillOpacity: 0.3, lineWidth: 2, radius: 6, visible: true } },
  'native-tree': { name: 'Native Tree', style: { color: '#15803d', fillColor: '#15803d', fillOpacity: 0.3, lineWidth: 2, radius: 8, visible: true } },
  rhizome: { name: 'Rhizome', style: { color: '#15803d', fillColor: '#15803d', fillOpacity: 0.3, lineWidth: 2, radius: 5, visible: true } },
  'cover-crop': { name: 'Cover Crop', style: { color: '#4ade80', fillColor: '#4ade80', fillOpacity: 0.3, lineWidth: 2, radius: 5, visible: true } },
  herb: { name: 'Herb', style: { color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.3, lineWidth: 2, radius: 4, visible: true } },
} as const

export const DEFAULT_LAYERS: GardenLayerType[] = [
  'bed', 'path', 'water-way', 'spring', 'water-source-tap', 'irrigation',
  'seeds', 'seedlings', 'transplants', 'vegetable', 'native-tree', 'rhizome',
  'cover-crop', 'herb', 'compost', 'mulch', 'biochar', 'fertile-earth',
  'greenhouse', 'shed', 'fence', 'trellis',
]

export const DRAWING_MODE_COLORS: Record<string, string> = {
  select: '#0ea5e9',
  pan: '#64748b',
  point: '#22c55e',
  line: '#06b6d4',
  polygon: '#f59e0b',
  measure: '#a855f7',
}

export const UNITS = {
  metric: { label: 'Metric (m, ha)', distance: 'm', area: 'ha' },
  imperial: { label: 'Imperial (ft, ac)', distance: 'ft', area: 'ac' },
} as const

export const DEFAULT_UNIT = 'metric'
