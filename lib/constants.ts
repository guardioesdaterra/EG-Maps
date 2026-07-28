/**
 * lib/constants.ts
 * @why Application-wide constant values — route paths, dataset keys, marker limits, hex grid config
 * @functions isValidDatasetKey
 * @consts DatasetKey, RoutePath, MAX_CLUSTER_SIZE, MARKER_VISIBILITY_MARGIN, CLUSTER_REBUILD_THRESHOLD, MOBILE_PROJECT_LIMIT, MOBILE_SPECIES_LIMIT, NATIVE_GEOJSON_THRESHOLD, HEX_GRID, QUALITY_PRESETS, SPECIES_COORD_TOLERANCE, MAP_LOAD_TIMEOUT_MS
 * @types DatasetKey, QualityLevel
 * @connections composables/useAdaptiveQuality.ts, composables/useMapBase.ts, composables/useMapCore.ts, composables/useMapHexGrid.ts, composables/useMapMarker.ts
 */
export const DatasetKey = {
  PROJECT_GRANTS: 'project-grants',
  ENDANGERED_SPECIES: 'endangered-species',
  OBSERVATORY_OF_VULCAN: 'vulcan-observatory',
  ACTIVE_CREWS: 'active-crews',
} as const

export type DatasetKey = typeof DatasetKey[keyof typeof DatasetKey]

export function isValidDatasetKey(value: string): value is DatasetKey {
  return value === DatasetKey.PROJECT_GRANTS || value === DatasetKey.ENDANGERED_SPECIES || value === DatasetKey.OBSERVATORY_OF_VULCAN || value === DatasetKey.ACTIVE_CREWS
}

export const RoutePath = {
  PROJECT_GRANTS: '/project-grants',
  PROJECT_GRANTS_3D: '/project-grants/3d',
  ENDANGERED_SPECIES: '/endangered-species',
  ENDANGERED_SPECIES_3D: '/endangered-species/3d',
  OBSERVATORY_OF_VULCAN: '/vulcan-observatory',
  OBSERVATORY_OF_VULCAN_3D: '/vulcan-observatory/3d',
  ACTIVE_CREWS: '/active-crews',
  ACTIVE_CREWS_3D: '/active-crews/3d',
  HOME: '/',
  INFO: '/info',
} as const

export const MAX_CLUSTER_SIZE = 5

/** Minimum canvas margin (px) outside viewport for marker culling */
export const MARKER_VISIBILITY_MARGIN = 50

/** Cluster rebuild threshold: fraction of viewport pan needed to trigger a rebuild */
export const CLUSTER_REBUILD_THRESHOLD = 0.75

/** Mobile item limit for project markers */
export const MOBILE_PROJECT_LIMIT = 60

/** Mobile item limit for species markers */
export const MOBILE_SPECIES_LIMIT = 80

/** Threshold (number of points) above which native GeoJSON clustering is used */
export const NATIVE_GEOJSON_THRESHOLD = 500

/** Hex grid defaults */
export const HEX_GRID = {
  mobileSize: 35,
  desktopSize: 50,
  mobileSizeGlobe: 30,
  desktopSizeGlobe: 45,
  strokeColor: 'rgba(6, 182, 212, 0.25)',
  strokeColorGlobe: 'rgba(6, 182, 212, 0.15)',
  lineWidth: 1.5,
  lineWidthGlobe: 1,
  debounceMs: 150,
} as const

/** Adaptive quality presets for old/low-end devices */
export const QUALITY_PRESETS = {
  low: {
    hexScale: 0.5,
    particleMaxCount: 0,
    particleFps: 15,
    particleTrailLength: 0,
    particleShadowBlur: 0,
    particleSpawnRate: 0,
    showConnections: false,
    showParticles: false,
    showHexGrid: false,
    maxMarkerCount: 200,
    maxTileCacheSize: 50,
    maxTileCacheZoomLevels: 2,
    dprCap: 1,
    starCount: 0,
    autoRotate: false,
  },
  medium: {
    hexScale: 0.75,
    particleMaxCount: 20,
    particleFps: 20,
    particleTrailLength: 3,
    particleShadowBlur: 2,
    particleSpawnRate: 0.2,
    showConnections: true,
    showParticles: true,
    showHexGrid: true,
    maxMarkerCount: 500,
    maxTileCacheSize: 100,
    maxTileCacheZoomLevels: 3,
    dprCap: 1.5,
    starCount: 40,
    autoRotate: true,
  },
  high: {
    hexScale: 1,
    particleMaxCount: 60,
    particleFps: 30,
    particleTrailLength: 5,
    particleShadowBlur: 4,
    particleSpawnRate: 0.35,
    showConnections: true,
    showParticles: true,
    showHexGrid: true,
    maxMarkerCount: 2000,
    maxTileCacheSize: 200,
    maxTileCacheZoomLevels: 5,
    dprCap: 2,
    starCount: 80,
    autoRotate: true,
  },
  ultra: {
    hexScale: 1,
    particleMaxCount: 90,
    particleFps: 36,
    particleTrailLength: 7,
    particleShadowBlur: 6,
    particleSpawnRate: 0.45,
    showConnections: true,
    showParticles: true,
    showHexGrid: true,
    maxMarkerCount: 5000,
    maxTileCacheSize: 300,
    maxTileCacheZoomLevels: 6,
    dprCap: 3,
    starCount: 120,
    autoRotate: true,
  },
} as const

export type QualityLevel = keyof typeof QUALITY_PRESETS

/** Species overlay tolerance (degrees) for coordinate matching */
export const SPECIES_COORD_TOLERANCE = 0.001

/** Timeout (ms) for map tile loading before showing error */
export const MAP_LOAD_TIMEOUT_MS = 20000