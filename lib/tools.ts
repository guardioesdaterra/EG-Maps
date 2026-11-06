/**
 * lib/tools.ts
 * @why Registry for the Tools section — one source of truth for which tools
 *      exist, how they are labelled, and how they deep-link (#tools/<id>).
 * @functions getTool, isToolId
 * @consts TOOLS
 * @types ToolId, ToolDefinition
 * @connections components/tools/ToolsHub.vue, layouts/default.vue
 */
export type ToolId = 'agroecological-garden' | 'satellite-downloader' | 'species-watchlist' | 'crew-outreach'

export interface ToolDefinition {
  id: ToolId
  /** Hash fragment used to deep-link the tool: `#tools/<hash>`. */
  hash: string
  nameKey: string
  descriptionKey: string
  icon: string
  /** 'ready' opens immediately; 'planned' shows the coming-soon badge. */
  status: 'ready' | 'planned'
  accent: string
}

export const TOOLS: readonly ToolDefinition[] = [
  {
    id: 'agroecological-garden',
    hash: 'garden',
    nameKey: 'tools.agroecologicalGarden.title',
    descriptionKey: 'tools.agroecologicalGarden.description',
    icon: 'tabler:seedling',
    status: 'ready',
    accent: 'text-emerald-300',
  },
  {
    id: 'satellite-downloader',
    hash: 'satellite',
    nameKey: 'tools.satelliteDownloader.title',
    descriptionKey: 'tools.satelliteDownloader.description',
    icon: 'tabler:cloud-download',
    status: 'ready',
    accent: 'text-cyan-300',
  },
  {
    id: 'species-watchlist',
    hash: 'watchlist',
    nameKey: 'tools.speciesWatchlist.title',
    descriptionKey: 'tools.speciesWatchlist.description',
    icon: 'tabler:eye-check',
    status: 'planned',
    accent: 'text-violet-300',
  },
  {
    id: 'crew-outreach',
    hash: 'outreach',
    nameKey: 'tools.crewOutreach.title',
    descriptionKey: 'tools.crewOutreach.description',
    icon: 'tabler:users-group',
    status: 'planned',
    accent: 'text-amber-300',
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
