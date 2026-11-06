/**
 * lib/tools.ts
 * @why Registry for the Tools section — one source of truth for which tools
 *      exist, where they live (`/tools/<id>`), how they are labelled, and how
 *      legacy deep-links (`#tools/<hash>`) still resolve.
 * @functions getTool, isToolId, toolIdFromHash, toolHash, toolRoute
 * @consts TOOLS
 * @types ToolId, ToolDefinition, ToolAccent
 * @connections pages/tools/index.vue, pages/tools/[tool].vue, components/tools/ToolsHub.vue, layouts/default.vue
 */
export type ToolId = 'agroecological-garden' | 'satellite-downloader' | 'species-watchlist' | 'crew-outreach'

/** Visual family for the tool card; maps to a CSS accent, not a Tailwind class. */
export type ToolAccent = 'emerald' | 'cyan' | 'violet' | 'amber'

export interface ToolDefinition {
  id: ToolId
  /** Canonical route for the tool editor. */
  route: string
  /** Legacy hash fragment: `#tools/<hash>` redirects to `route`. */
  hash: string
  nameKey: string
  descriptionKey: string
  icon: string
  /** 'ready' opens immediately; 'planned' shows the coming-soon badge. */
  status: 'ready' | 'planned'
  accent: ToolAccent
}

export const TOOLS: readonly ToolDefinition[] = [
  {
    id: 'agroecological-garden',
    route: '/tools/agroecological-garden',
    hash: 'garden',
    nameKey: 'tools.agroecologicalGarden.title',
    descriptionKey: 'tools.agroecologicalGarden.description',
    icon: 'tabler:seedling',
    status: 'ready',
    accent: 'emerald',
  },
  {
    id: 'satellite-downloader',
    route: '/tools/satellite-downloader',
    hash: 'satellite',
    nameKey: 'tools.satelliteDownloader.title',
    descriptionKey: 'tools.satelliteDownloader.description',
    icon: 'tabler:cloud-download',
    status: 'ready',
    accent: 'cyan',
  },
  {
    id: 'species-watchlist',
    route: '/tools/species-watchlist',
    hash: 'watchlist',
    nameKey: 'tools.speciesWatchlist.title',
    descriptionKey: 'tools.speciesWatchlist.description',
    icon: 'tabler:eye-check',
    status: 'planned',
    accent: 'violet',
  },
  {
    id: 'crew-outreach',
    route: '/tools/crew-outreach',
    hash: 'outreach',
    nameKey: 'tools.crewOutreach.title',
    descriptionKey: 'tools.crewOutreach.description',
    icon: 'tabler:users-group',
    status: 'planned',
    accent: 'amber',
  },
] as const

export function getTool(id: string | null | undefined): ToolDefinition | undefined {
  if (!id) return undefined
  return TOOLS.find(tool => tool.id === id || tool.hash === id)
}

export function isToolId(value: string | null | undefined): value is ToolId {
  return Boolean(getTool(value))
}

/** `#tools/<hash>` → the tool's id, or null for the plain `#tools` catalog. */
export function toolIdFromHash(hash: string): ToolId | null {
  const match = hash.match(/^#tools\/([^/?&#]+)/i)
  const tool = getTool(match?.[1])
  return tool ? tool.id : null
}

export function toolHash(id: ToolId): string {
  return getTool(id)?.hash ?? id
}

/** `/tools/<id>` route for a tool; the hub for unknown ids. */
export function toolRoute(id: string | null | undefined): string {
  return getTool(id)?.route ?? '/tools'
}
