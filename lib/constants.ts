// Dataset type constants to avoid magic strings throughout the codebase
export const DatasetKey = {
  PROJECT_GRANTS: 'project-grants',
  ENDANGERED_SPECIES: 'endangered-species',
} as const

export type DatasetKey = typeof DatasetKey[keyof typeof DatasetKey]

// Helper to check if a string is a valid dataset key
export function isValidDatasetKey(value: string): value is DatasetKey {
  return value === DatasetKey.PROJECT_GRANTS || value === DatasetKey.ENDANGERED_SPECIES
}

// Route paths
export const RoutePath = {
  PROJECT_GRANTS: '/project-grants',
  PROJECT_GRANTS_3D: '/project-grants/3d',
  ENDANGERED_SPECIES: '/endangered-species',
  ENDANGERED_SPECIES_3D: '/endangered-species/3d',
  HOME: '/',
  INFO: '/info',
} as const