import { describe, expect, it } from 'vitest'
import { clearGeoJSONCache, speciesIndexToGeoJSON, STANDARD_MAP_MARKER_SIZE } from '@/composables/useGeoJSONMarkers'
import type { SpeciesIndexItem } from '@/composables/useGeoJSONMarkers'

describe('standard map markers', () => {
  it('gives endangered-species points the same fixed circle size as crew markers', () => {
    clearGeoJSONCache()
    const species: SpeciesIndexItem[] = [{
      id: 'marker-standardization-fixture',
      commonName: 'Test species',
      scientificName: 'Species testus',
      taxonomicGroup: 'Mammal',
      category: 'Mammal',
      lat: -15.7,
      lng: -47.9,
      imageUrl: null,
    }]

    const feature = speciesIndexToGeoJSON(species).features[0]
    expect(feature?.properties?.size).toBe(STANDARD_MAP_MARKER_SIZE)
    expect(STANDARD_MAP_MARKER_SIZE).toBe(6)
  })
})
