/**
 * lib/species-utils.ts
 * @why Species utility functions — status label formatting, taxonomy helpers, region matching
 * @functions taxonomicGroupLabel, getTaxonomicGroupLabels, getLocalizedSpecies, findSpeciesAtCoord
 * @types PopupSpecies
 * @deps ./map-utils (GROUP_COLORS)
 * @connections composables/useMapCore.ts, composables/useMapMarker.ts
 */
import type { Species } from './types'
import type { SpeciesIndexItem } from '@/composables/useGeoJSONMarkers'
import { GROUP_COLORS } from './map-utils'

export type PopupSpecies = Species | SpeciesIndexItem

export function taxonomicGroupLabel(group: string, t: (_key: string) => string) {
  return t(`taxonomy.${group}`)
}

export function getTaxonomicGroupLabels(t: (_key: string) => string): Record<string, string> {
  return Object.keys(GROUP_COLORS).reduce<Record<string, string>>((labels, group) => {
    labels[group] = taxonomicGroupLabel(group, t)
    return labels
  }, {})
}

export function getLocalizedSpecies(species: PopupSpecies, targetLocale: string, defaultLocale?: string): Species {
  if (!('content' in species)) {
    return {
      id: species.id,
      commonName: species.commonName,
      scientificName: species.scientificName,
      category: 'category' in species ? (species as { category?: string }).category ?? '' : '',
      taxonomicGroup: species.taxonomicGroup,
      region: 'region' in species ? (species as { region?: string }).region ?? '' : '',
      ecosystem: 'ecosystem' in species ? (species as { ecosystem?: string }).ecosystem ?? '' : '',
      lat: species.lat,
      lng: species.lng,
      imageUrl: species.imageUrl ?? null,
      imageCredit: 'imageCredit' in species ? (species as { imageCredit?: string }).imageCredit ?? '' : '',
      description: 'description' in species ? (species as { description?: string }).description : undefined,
      endangerment: 'endangerment' in species ? (species as { endangerment?: string }).endangerment : undefined,
      ecosystemNeeds: 'ecosystemNeeds' in species ? (species as { ecosystemNeeds?: string }).ecosystemNeeds : undefined,
      actions: 'actions' in species ? (species as { actions?: string }).actions : undefined,
      threatTypes: 'threatTypes' in species ? (species as { threatTypes?: string[] }).threatTypes : undefined,
      iucnUrl: 'iucnUrl' in species ? (species as { iucnUrl?: string }).iucnUrl : undefined,
      content: {},
    }
  }

  const content = species.content?.[targetLocale] ?? species.content?.[defaultLocale ?? 'en']
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

export function findSpeciesAtCoord(lat: number, lng: number, source: SpeciesIndexItem[], tolerance = 0.001): SpeciesIndexItem[] {
  return source.filter(s =>
    Math.abs(s.lat - lat) < tolerance && Math.abs(s.lng - lng) < tolerance
  )
}
