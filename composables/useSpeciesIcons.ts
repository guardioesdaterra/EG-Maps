/**
 * composables/useSpeciesIcons.ts
 * @why Species icon construction — builds Wikimedia Commons image URLs with fallback to game-icons
 * @functions useSpeciesIcons
 * @deps vue (ref, readonly)
 */
import { ref, readonly } from 'vue'
import type { SpeciesIconMapping, SpeciesIconMatch } from '@/lib/game-icons-map'

const MAPPING_PATH = '/data/species/species-icon-mapping.json'

let cachedMapping: SpeciesIconMapping | null = null

async function loadMapping(baseURL?: string): Promise<SpeciesIconMapping> {
  if (cachedMapping) return cachedMapping
  const prefix = baseURL && baseURL !== '/' ? baseURL : ''
  const url = `${prefix}${MAPPING_PATH}`
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    cachedMapping = await res.json() as SpeciesIconMapping
    return cachedMapping
  } catch (err) {
    console.warn('[useSpeciesIcons] Failed to load mapping:', err)
    return {}
  }
}

export function useSpeciesIcons(baseURL?: string) {
  const mapping = ref<SpeciesIconMapping>({})
  const loading = ref(true)
  const error = ref<Error | null>(null)

  async function init() {
    try {
      loading.value = true
      mapping.value = await loadMapping(baseURL)
    } catch (e) {
      error.value = e as Error
    } finally {
      loading.value = false
    }
  }

  function getIcon(speciesId: string): SpeciesIconMatch | undefined {
    return mapping.value[speciesId]
  }

  function getIconifyName(speciesId: string): string | undefined {
    return mapping.value[speciesId]?.iconifyName
  }

  function getIconSvgUrl(speciesId: string): string | undefined {
    const match = mapping.value[speciesId]
    if (!match) return undefined
    return `https://api.iconify.design/${match.iconifyName.replace(':', '/')}.svg`
  }

  return {
    mapping: readonly(mapping),
    loading: readonly(loading),
    error: readonly(error),
    init,
    getIcon,
    getIconifyName,
    getIconSvgUrl,
  }
}
