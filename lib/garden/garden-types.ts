/**
 * lib/garden/garden-types.ts
 * @why Core TypeScript interfaces for the Agroecological Garden tool
 * @deps geojson (GeoJSON types)
 */

import type { GeoJSON } from 'geojson'

// ============================================================================
// Project & Persistence
// ============================================================================

export interface GardenProject {
  id: string
  name: string
  description: string
  location: MapLocation
  bounds: MapBounds
  layers: GardenLayer[]
  metadata: ProjectMetadata
  version: number
}

export interface MapLocation {
  lat: number
  lng: number
  zoom: number
  bearing?: number
  pitch?: number
}

export interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}

export interface ProjectMetadata {
  createdAt: number
  updatedAt: number
  author: string
  locale: string
  hemisphere: Hemisphere
  tags: string[]
  isPublic: boolean
  shareToken?: string
}

export type Hemisphere = 'north' | 'south'

// ============================================================================
// Layer System
// ============================================================================

export interface GardenLayer {
  id: string
  name: string
  type: LayerType
  category: LayerCategory
  visible: boolean
  locked: boolean
  opacity: number
  order: number
  features: GardenFeature[]
  style: LayerStyle
  metadata?: Record<string, unknown>
}

export type LayerCategory =
  | 'planting'      // Seeds, seedlings, transplants
  | 'soil'          // Fertile earth, compost, mulch, biochar
  | 'water'         // Water ways, springs, sources, irrigation
  | 'structure'     // Greenhouse, shed, fence, trellis, bed, path
  | 'plants'        // Vegetables, native trees, rhizomes, cover crops, herbs

export type LayerType =
  // Planting
  | 'seeds'
  | 'seedlings'
  | 'transplants'
  // Soil
  | 'fertile-earth'
  | 'compost'
  | 'mulch'
  | 'biochar'
  // Water
  | 'water-way'
  | 'spring'
  | 'water-source-natural'
  | 'water-source-tap'
  | 'irrigation'
  // Structures
  | 'greenhouse'
  | 'shed'
  | 'fence'
  | 'trellis'
  | 'bed'
  | 'path'
  // Plants
  | 'vegetable'
  | 'native-tree'
  | 'rhizome'
  | 'cover-crop'
  | 'herb'
  | 'fruit'
  | 'flower'

export interface LayerStyle {
  fillColor?: string
  fillOpacity?: number
  strokeColor?: string
  strokeWidth?: number
  strokeOpacity?: number
  strokeDasharray?: number[]
  icon?: string
  iconSize?: number
  iconColor?: string
  textField?: string
  textSize?: number
  textColor?: string
  textHaloColor?: string
  textHaloWidth?: number
}

export const DEFAULT_LAYER_STYLES: Record<LayerType, LayerStyle> = {
  'seeds': { fillColor: '#4ade80', fillOpacity: 0.6, strokeColor: '#22c55e', strokeWidth: 1, icon: 'tabler:seedling', iconSize: 16, iconColor: '#166534' },
  'seedlings': { fillColor: '#22c55e', fillOpacity: 0.7, strokeColor: '#16a34a', strokeWidth: 1.5, icon: 'tabler:plant', iconSize: 18, iconColor: '#15803d' },
  'transplants': { fillColor: '#16a34a', fillOpacity: 0.8, strokeColor: '#15803d', strokeWidth: 2, icon: 'tabler:plant', iconSize: 20, iconColor: '#166534' },
  'fertile-earth': { fillColor: '#8b5e3c', fillOpacity: 0.5, strokeColor: '#6b4423', strokeWidth: 1, strokeDasharray: [4, 4] },
  'compost': { fillColor: '#5d4037', fillOpacity: 0.6, strokeColor: '#3e2723', strokeWidth: 1 },
  'mulch': { fillColor: '#a1887f', fillOpacity: 0.5, strokeColor: '#8d6e63', strokeWidth: 1, strokeDasharray: [2, 2] },
  'biochar': { fillColor: '#1c1c1c', fillOpacity: 0.7, strokeColor: '#000', strokeWidth: 1 },
  'water-way': { strokeColor: '#0ea5e9', strokeWidth: 2, strokeOpacity: 0.8 },
  'spring': { fillColor: '#06b6d4', fillOpacity: 0.9, strokeColor: '#0891b2', strokeWidth: 2, icon: 'tabler:fountain', iconSize: 20, iconColor: '#0e7490' },
  'water-source-natural': { fillColor: '#0891b2', fillOpacity: 0.8, strokeColor: '#0e7490', strokeWidth: 2, icon: 'tabler:droplet', iconSize: 20, iconColor: '#06b6d4' },
  'water-source-tap': { fillColor: '#2563eb', fillOpacity: 0.9, strokeColor: '#1d4ed8', strokeWidth: 2, icon: 'tabler:fountain', iconSize: 20, iconColor: '#3b82f6' },
  'irrigation': { strokeColor: '#3b82f6', strokeWidth: 1.5, strokeOpacity: 0.7, strokeDasharray: [6, 4] },
  'greenhouse': { fillColor: '#fef08a', fillOpacity: 0.3, strokeColor: '#eab308', strokeWidth: 2 },
  'shed': { fillColor: '#a3a3a3', fillOpacity: 0.4, strokeColor: '#737373', strokeWidth: 2 },
  'fence': { strokeColor: '#78716c', strokeWidth: 2, strokeDasharray: [8, 4] },
  'trellis': { strokeColor: '#a855f7', strokeWidth: 1.5, strokeOpacity: 0.8, strokeDasharray: [4, 2] },
  'bed': { fillColor: '#84cc16', fillOpacity: 0.2, strokeColor: '#65a30d', strokeWidth: 2 },
  'path': { fillColor: '#d6d3d1', fillOpacity: 0.5, strokeColor: '#a8a29e', strokeWidth: 1, strokeDasharray: [10, 5] },
  'vegetable': { fillColor: '#4ade80', fillOpacity: 0.6, strokeColor: '#22c55e', strokeWidth: 1, icon: 'tabler:carrot', iconSize: 18, iconColor: '#166534' },
  'native-tree': { fillColor: '#22c55e', fillOpacity: 0.7, strokeColor: '#16a34a', strokeWidth: 2, icon: 'tabler:tree', iconSize: 24, iconColor: '#15803d' },
  'rhizome': { fillColor: '#f97316', fillOpacity: 0.6, strokeColor: '#ea580c', strokeWidth: 1, icon: 'tabler:plant', iconSize: 18, iconColor: '#c2410c' },
  'cover-crop': { fillColor: '#84cc16', fillOpacity: 0.4, strokeColor: '#65a30d', strokeWidth: 1, strokeDasharray: [3, 3] },
  'herb': { fillColor: '#a3e635', fillOpacity: 0.6, strokeColor: '#84cc16', strokeWidth: 1, icon: 'tabler:leaf', iconSize: 16, iconColor: '#65a30d' },
  'fruit': { fillColor: '#fb923c', fillOpacity: 0.6, strokeColor: '#f97316', strokeWidth: 1, icon: 'tabler:apple', iconSize: 18, iconColor: '#c2410c' },
  'flower': { fillColor: '#f472b6', fillOpacity: 0.6, strokeColor: '#ec4899', strokeWidth: 1, icon: 'tabler:flower', iconSize: 16, iconColor: '#be185d' },
}

// ============================================================================
// Features (GeoJSON-based)
// ============================================================================

export interface GardenFeature extends GeoJSON.Feature<GeoJSON.Geometry, FeatureProperties> {
  id: string
}

export interface FeatureProperties {
  label: string
  layerType: LayerType
  plantId?: string
  variety?: string
  quantity?: number
  spacing?: number          // cm
  depth?: number            // cm
  plantingDate?: string     // ISO date
  harvestDate?: string      // ISO date
  notes?: string
  metadata?: Record<string, unknown>
  // Water-specific
  flowRate?: number         // L/min
  capacity?: number         // Liters
  // Bed-specific
  bedType?: BedType
  soilDepth?: number        // cm
  // Measurement
  measurementType?: 'distance' | 'area' | 'perimeter'
  measurementValue?: number
  measurementUnit?: string
}

export type BedType = 'raised' | 'in-ground' | 'hugelkultur' | 'keyhole' | 'container' | 'vertical'

// ============================================================================
// Plant Database
// ============================================================================

export interface Plant {
  id: string
  name: string
  scientificName: string
  category: PlantCategory
  family: string
  description: string
  // Growing requirements
  spacing: number               // cm between plants
  rowSpacing?: number           // cm between rows
  depth: number                 // cm planting depth
  daysToGermination: number
  daysToHarvest: number
  sunRequirement: SunRequirement
  waterRequirement: WaterRequirement
  soilPh: PhRange
  hardinessZone: ZoneRange
  // Companion planting
  companionPlants: string[]     // Plant IDs that grow well together
  antagonistPlants: string[]    // Plant IDs to avoid
  guildRole: GuildRole[]
  // Harvest
  harvestableParts: HarvestablePart[]
  // Lifecycle
  perennial: boolean
  nativeRange: string[]         // Country/region codes
  // Media
  imageUrl?: string
  wikipediaUrl?: string
  // Seasonal
  plantingMonths: PlantingMonths
  // Metadata
  tags: string[]
  createdAt: number
  updatedAt: number
}

export type PlantCategory =
  | 'vegetable'
  | 'native-tree'
  | 'rhizome'
  | 'cover-crop'
  | 'herb'
  | 'fruit'
  | 'flower'

export type SunRequirement = 'full' | 'partial' | 'shade' | 'full-partial' | 'partial-shade'
export type WaterRequirement = 'low' | 'medium' | 'high' | 'very-high'

export interface PhRange { min: number; max: number }
export interface ZoneRange { min: number; max: number }

export type GuildRole =
  | 'nitrogen-fixer'
  | 'dynamic-accumulator'
  | 'ground-cover'
  | 'pest-repellent'
  | 'pollinator-attractor'
  | 'support'
  | 'root-breaker'
  | 'biomass'
  | 'shade-provider'
  | 'windbreak'

export type HarvestablePart = 'leaf' | 'fruit' | 'root' | 'flower' | 'seed' | 'stem' | 'bark' | 'sap'

export interface PlantingMonths {
  north: number[]  // 1-12
  south: number[]  // 1-12
}

// ============================================================================
// Companion Planting / Guilds
// ============================================================================

export interface PlantGuild {
  id: string
  name: string
  description: string
  plants: GuildPlant[]
  layout?: GuildLayout
  tags: string[]
  hemisphere?: Hemisphere
}

export interface GuildPlant {
  plantId: string
  quantity: number
  position?: { x: number; y: number }  // Relative position in guild
  role: GuildRole
}

export type GuildLayout = 'circular' | 'linear' | 'keyhole' | 'scattered' | 'rows' | 'polyculture'

export interface CompatibilityResult {
  plantId: string
  targetPlantId: string
  status: 'companion' | 'antagonist' | 'neutral'
  reason?: string
}

// ============================================================================
// Water Design
// ============================================================================

export interface WaterFeature extends GardenFeature {
  properties: FeatureProperties & {
    waterType: WaterType
    flowRate?: number
    capacity?: number
    elevation?: number
    connectedTo?: string[]  // Feature IDs
  }
}

export type WaterType = 'spring' | 'stream' | 'pond' | 'tank' | 'tap' | 'well' | 'swale' | 'irrigation' | 'drainage'

export interface ElevationPoint {
  lat: number
  lng: number
  elevation: number
}

export interface ContourLine {
  elevation: number
  coordinates: [number, number][]
}

// ============================================================================
// Measurement
// ============================================================================

export interface Measurement {
  id: string
  type: 'distance' | 'area' | 'perimeter'
  value: number
  unit: 'metric' | 'imperial'
  coordinates: [number, number][]
  label?: string
  color?: string
}

export interface MeasurementResult {
  distance?: number       // meters
  area?: number           // square meters
  perimeter?: number      // meters
  hectares?: number
  acres?: number
  squareFeet?: number
}

// ============================================================================
// Drawing Tools
// ============================================================================

export type DrawingMode = 'none' | 'point' | 'line' | 'polygon' | 'rectangle' | 'circle' | 'measure-distance' | 'measure-area'

export interface DrawingState {
  mode: DrawingMode
  activeLayerId: string | null
  temporaryFeature: GardenFeature | null
  vertices: [number, number][]
  isDrawing: boolean
  snapToGrid: boolean
  gridSize: number        // meters
}

// ============================================================================
// Grid System
// ============================================================================

export interface GridConfig {
  enabled: boolean
  type: 'square' | 'hexagonal' | 'triangular'
  size: number            // meters
  unit: 'metric' | 'imperial'
  color: string
  opacity: number
  snapEnabled: boolean
  showLabels: boolean
  origin: [number, number]  // lat, lng of grid origin
  rotation: number        // degrees
}

export interface GridCell {
  id: string
  bounds: MapBounds
  center: [number, number]
  row: number
  col: number
  features: string[]  // Feature IDs in this cell
}

// ============================================================================
// Export/Import
// ============================================================================

export type ExportFormat = 'geojson' | 'pdf' | 'png' | 'csv' | 'ics' | 'shapefile' | 'kml'

export interface ExportOptions {
  format: ExportFormat
  includeLayers: string[]
  includeMeasurements: boolean
  includePhotos: boolean
  bounds?: MapBounds
  scale?: number
  dpi?: number
  metadata?: Record<string, unknown>
}

export interface ImportResult {
  project: GardenProject
  warnings: string[]
  errors: string[]
}

// ============================================================================
// Seasonal Calendar
// ============================================================================

export interface SeasonalEvent {
  id: string
  plantId: string
  type: 'planting' | 'harvest' | 'maintenance' | 'fertilize' | 'prune' | 'transplant'
  startDate: string
  endDate?: string
  recurrence?: 'yearly' | 'monthly' | 'custom'
  notes?: string
  color?: string
}

export interface CalendarMonth {
  month: number
  year: number
  events: SeasonalEvent[]
  plantingWindow: PlantingWindow[]
  harvestWindow: HarvestWindow[]
}

export interface PlantingWindow {
  plantId: string
  plantName: string
  startWeek: number
  endWeek: number
  isOptimal: boolean
}

export interface HarvestWindow {
  plantId: string
  plantName: string
  startWeek: number
  endWeek: number
  expectedYield?: number
}

// ============================================================================
// UI State
// ============================================================================

export interface GardenUIState {
  selectedFeatureIds: string[]
  activePanel: 'layers' | 'plants' | 'water' | 'guilds' | 'measurements' | 'project' | 'calendar' | 'help'
  sidebarOpen: boolean
  sidebarWidth: number
  mapStyle: 'satellite' | 'streets' | 'outdoors' | 'terrain'
  showGrid: boolean
  showCoordinates: boolean
  showScale: boolean
  units: 'metric' | 'imperial'
  language: string
}

// ============================================================================
// Constants
// ============================================================================

export const LAYER_CATEGORIES: Record<LayerCategory, { label: string; icon: string; color: string; order: number }> = {
  'planting': { label: 'Planting', icon: 'tabler:plant', color: '#22c55e', order: 1 },
  'soil': { label: 'Soil & Fertility', icon: 'tabler:leaf', color: '#8b5e3c', order: 2 },
  'water': { label: 'Water Systems', icon: 'tabler:droplet', color: '#0ea5e9', order: 3 },
  'structure': { label: 'Structures', icon: 'tabler:building', color: '#78716c', order: 4 },
  'plants': { label: 'Plants', icon: 'tabler:tree', color: '#16a34a', order: 5 },
}

export const LAYER_TYPES_BY_CATEGORY: Record<LayerCategory, LayerType[]> = {
  'planting': ['seeds', 'seedlings', 'transplants'],
  'soil': ['fertile-earth', 'compost', 'mulch', 'biochar'],
  'water': ['water-way', 'spring', 'water-source-natural', 'water-source-tap', 'irrigation'],
  'structure': ['greenhouse', 'shed', 'fence', 'trellis', 'bed', 'path'],
  'plants': ['vegetable', 'native-tree', 'rhizome', 'cover-crop', 'herb', 'fruit', 'flower'],
}

export const DRAWING_MODES: DrawingMode[] = ['point', 'line', 'polygon', 'rectangle', 'circle', 'measure-distance', 'measure-area']

export const DEFAULT_GRID_CONFIG: GridConfig = {
  enabled: false,
  type: 'square',
  size: 1,
  unit: 'metric',
  color: '#ffffff',
  opacity: 0.15,
  snapEnabled: true,
  showLabels: false,
  origin: [0, 0],
  rotation: 0,
}

export const SUPPORTED_EXPORT_FORMATS: ExportFormat[] = ['geojson', 'pdf', 'png', 'csv', 'ics', 'shapefile', 'kml']

export const DEFAULT_MAP_LOCATION: MapLocation = {
  lat: -22.9068,  // São Paulo, Brazil
  lng: -43.1729,
  zoom: 16,
}