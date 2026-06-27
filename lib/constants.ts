// Dataset type constants to avoid magic strings throughout the codebase
export const DatasetKey = {
  PROJECT_GRANTS: 'project-grants',
  ENDANGERED_SPECIES: 'endangered-species',
  OBSERVATORY_OF_VULCAN: 'observatory-of-vulcan',
  ACTIVE_CREWS: 'active-crews',
} as const

export type DatasetKey = typeof DatasetKey[keyof typeof DatasetKey]

// Helper to check if a string is a valid dataset key
export function isValidDatasetKey(value: string): value is DatasetKey {
  return value === DatasetKey.PROJECT_GRANTS || value === DatasetKey.ENDANGERED_SPECIES || value === DatasetKey.OBSERVATORY_OF_VULCAN || value === DatasetKey.ACTIVE_CREWS
}

// Route paths
export const RoutePath = {
  PROJECT_GRANTS: '/project-grants',
  PROJECT_GRANTS_3D: '/project-grants/3d',
  ENDANGERED_SPECIES: '/endangered-species',
  ENDANGERED_SPECIES_3D: '/endangered-species/3d',
  OBSERVATORY_OF_VULCAN: '/observatory-of-vulcan',
  OBSERVATORY_OF_VULCAN_3D: '/observatory-of-vulcan/3d',
  ACTIVE_CREWS: '/active-crews',
  ACTIVE_CREWS_3D: '/active-crews/3d',
  HOME: '/',
  INFO: '/info',
} as const

// Maximum number of items to show in a cluster marker
export const MAX_CLUSTER_SIZE = 5

// ── Map constants ──

/** Minimum canvas margin (px) outside viewport for marker culling */
export const MARKER_VISIBILITY_MARGIN = 50

/** Cluster rebuild threshold: fraction of viewport pan needed to trigger a rebuild */
export const CLUSTER_REBUILD_THRESHOLD = 0.5

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

/** Species overlay tolerance (degrees) for coordinate matching */
export const SPECIES_COORD_TOLERANCE = 0.001

/** Timeout (ms) for map tile loading before showing error */
export const MAP_LOAD_TIMEOUT_MS = 20000