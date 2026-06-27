import type { Species } from '@/lib/types'
import type { SpeciesIndexItem } from '@/composables/useGeoJSONMarkers'
import { GROUP_COLORS } from '@/lib/map-utils'

export type PopupSpecies = Species | SpeciesIndexItem

export function taxonomicGroupLabel(group: string, t: (_key: string) => string) {
  return t(`taxonomy.${group}`)
}

export function getTaxonomicGroupLabels(t: (_key: string) => string) {
  return Object.keys(GROUP_COLORS).reduce<Record<string, string>>((labels, group) => {
    labels[group] = taxonomicGroupLabel(group, t)
    return labels
  }, {})
}

export function getLocalizedSpecies(
  species: PopupSpecies,
  targetLocale: string,
): Species {
  if (!('content' in species)) {
    return {
      ...species,
      imageUrl: species.imageUrl ?? '',
      region: '',
      ecosystem: '',
      imageCredit: '',
      ecosystemNeeds: undefined,
      actions: undefined,
      content: {},
    }
  }

  const content = species.content?.[targetLocale] ?? species.content?.en
  if (!content) return species

  return {
    ...species,
    description: content.description ?? species.description,
    endangerment: content.endangerment ?? species.endangerment,
    ecosystemNeeds: content.ecosystemNeeds ?? species.ecosystemNeeds,
    actions: content.actions ?? species.actions,
    region: content.region ?? species.region,
  }
}

export function findSpeciesAtCoord(
  lat: number,
  lng: number,
  source: SpeciesIndexItem[],
  tolerance = 0.001,
): SpeciesIndexItem[] {
  return source.filter(s =>
    Math.abs(s.lat - lat) < tolerance && Math.abs(s.lng - lng) < tolerance
  )
}
