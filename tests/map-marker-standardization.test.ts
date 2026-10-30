import { describe, expect, it } from 'vitest'
import { buildCrewStatusGeoJSON, toSpeciesGeoJSON } from '@/composables/useMapMarker'
import { STANDARD_MAP_MARKER_SIZE } from '@/composables/useGeoJSONMarkers'
import type { SpeciesIndexItem } from '@/composables/useGeoJSONMarkers'
import type { CrewLocation } from '@/lib/crew-data'

describe('rendered map marker sizes', () => {
  it('uses the same standard circle size for every endangered category and crew locations', () => {
    const categories = ['CR', 'EN', 'VU', 'LC']
    const speciesIndex: SpeciesIndexItem[] = categories.map((category, index) => ({
      id: `species-${category}`,
      commonName: `Test species ${category}`,
      scientificName: `Species ${category.toLowerCase()}`,
      taxonomicGroup: 'Mammal',
      category,
      lat: -15 - index,
      lng: -47 - index,
      imageUrl: null,
    }))
    const speciesFeatures = toSpeciesGeoJSON(speciesIndex, [], ['Mammal']).features

    const crewLocation: CrewLocation = {
      name: 'Test crew',
      country: 'Brazil',
      city: 'Brasília',
      state: 'DF',
      region: 'Central Brazil',
      status: 'active',
      lat: -15.7,
      lng: -47.9,
    }
    const crewFeature = buildCrewStatusGeoJSON([], [crewLocation], ['active']).features[0]
    const crewSize = crewFeature?.properties?.size

    expect(crewSize).toBe(STANDARD_MAP_MARKER_SIZE)
    expect(crewSize).toBe(6)
    expect(speciesFeatures.map(feature => feature.properties?.size)).toEqual(
      categories.map(() => crewSize),
    )
  })
})
