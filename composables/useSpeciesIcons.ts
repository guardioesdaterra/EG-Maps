/**
 * composables/useSpeciesIcons.ts
 * @why Species icon construction — loads the offline species-icon mapping;
 *   icons are not rendered as <iconify-icon> anywhere in the UI, so no CDN
 *   call is made. Markers use the local tabler/gis registry via Icon.vue.
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

  function getIconSvgUrl(_speciesId: string): string | undefined {
    // Species icons are not rendered as <iconify-icon> anywhere in the UI;
    // return undefined so no network/CDN call is made.
    return undefined
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
