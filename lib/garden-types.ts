/**
 * lib/garden-types.ts
 * @why TypeScript interfaces for the Agroecological Garden Tool domain model.
 * @connections lib/garden-constants.ts, composables/useGardenProject.ts
 */
import type { GeoJSON } from 'geojson'

export type GardenLayerType =
  | 'seeds' | 'seedlings' | 'transplants'
  | 'fertile-earth' | 'compost' | 'mulch' | 'biochar'
  | 'water-way' | 'spring' | 'water-source-natural' | 'water-source-tap' | 'irrigation'
  | 'greenhouse' | 'shed' | 'fence' | 'trellis' | 'bed' | 'path'
  | 'vegetable' | 'native-tree' | 'rhizome' | 'cover-crop' | 'herb'

export type GardenFeatureGeometry = GeoJSON.Point | GeoJSON.LineString | GeoJSON.Polygon

export interface GardenFeatureProperties {
  label: string
  plantId?: string
  variety?: string
  quantity?: number
  spacing?: number // cm
  depth?: number // cm
  plantingDate?: string // ISO date
  harvestDate?: string // ISO date
  notes?: string
  metadata?: Record<string, unknown>
}

export interface GardenFeature {
  id: string
  type: 'point' | 'line' | 'polygon'
  geometry: GardenFeatureGeometry
  properties: GardenFeatureProperties
}

export interface LayerStyle {
  color: string
  fillColor?: string
  fillOpacity?: number
  lineWidth?: number
  radius?: number // for points, px
  visible: boolean
}

export interface GardenLayer {
  id: string
  name: string
  type: GardenLayerType
  visible: boolean
  locked: boolean
  opacity: number
  features: GardenFeature[]
  style: LayerStyle
}

export interface GardenLocation {
  lat: number
  lng: number
  zoom: number
}

export interface GardenMetadata {
  createdAt: number
  updatedAt: number
  version: number
  author: string
  locale: string
  hemisphere: 'north' | 'south'
}

export interface GardenProject {
  id: string
  name: string
  description: string
  location: GardenLocation
  bounds: [[number, number], [number, number]] // [[swLng, swLat], [neLng, neLat]]
  layers: GardenLayer[]
  metadata: GardenMetadata
}

export type PlantCategory = 'vegetable' | 'native-tree' | 'rhizome' | 'cover-crop' | 'herb' | 'fruit' | 'flower'

export type GuildRole =
  | 'nitrogen-fixer' | 'dynamic-accumulator' | 'ground-cover'
  | 'pest-repellent' | 'pollinator-attractor' | 'support' | 'root-breaker' | 'biomass' | 'fruit'

export type HarvestablePart = 'leaf' | 'fruit' | 'root' | 'flower' | 'seed' | 'stem' | 'pod' | 'bulb' | 'biomass'

export type SunRequirement = 'full' | 'partial' | 'shade'
export type WaterRequirement = 'low' | 'medium' | 'high'

export interface Plant {
  id: string
  name: string
  scientificName: string
  category: PlantCategory
  family: string
  description: string
  spacing: number // cm
  depth: number // cm
  daysToGermination: number
  daysToHarvest: number
  sunRequirement: SunRequirement
  waterRequirement: WaterRequirement
  soilPh: { min: number; max: number }
  hardinessZone: { min: number; max: number }
  companionPlants: string[] // plant IDs
  antagonistPlants: string[] // plant IDs
  guildRole: GuildRole
  harvestableParts: HarvestablePart[]
  perennial: boolean
  nativeRange: string[]
  imageUrl?: string
  wikipediaUrl?: string
}

export interface PlantCompanionScore {
  plantId: string
  compatible: boolean
  notes?: string
}

export interface MeasurementResult {
  type: 'distance' | 'area' | 'perimeter'
  value: number
  unit: 'm' | 'ha' | 'ft' | 'ac'
  label: string
  coordinates: [number, number][] // [lng, lat]
}

export type DrawingMode = 'select' | 'pan' | 'point' | 'line' | 'polygon' | 'measure'

export interface GardenToolState {
  open: boolean
  activeLayerId: string | null
  drawingMode: DrawingMode
  selectedFeatureId: string | null
  measurement: MeasurementResult | null
  plantLibraryOpen: boolean
  selectedPlantId: string | null
}
