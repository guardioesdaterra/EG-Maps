/**
 * Guard the checked-in crew region polygons that power hover-highlight and
 * click-to-open on the active-crews map (built by scripts/build-crew-regions.mjs).
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { allCrewRegionsData } from '../lib/crew-data'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const REGIONS_FIXTURE = join(ROOT, 'public', 'data', 'crew-regions.geojson')

interface RegionFeature {
  type: 'Feature'
  id?: string | number
  properties: { id: string; region: string }
  geometry: { type: 'MultiPolygon'; coordinates: number[][][][] }
}

function loadRegions(): RegionFeature[] {
  const collection = JSON.parse(readFileSync(REGIONS_FIXTURE, 'utf8')) as {
    type: string
    features: RegionFeature[]
  }
  expect(collection.type).toBe('FeatureCollection')
  return collection.features
}

function bboxOf(feature: RegionFeature): [number, number, number, number] {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const polygon of feature.geometry.coordinates) {
    for (const ring of polygon) {
      for (const [lng, lat] of ring) {
        if (lng < minX) minX = lng
        if (lng > maxX) maxX = lng
        if (lat < minY) minY = lat
        if (lat > maxY) maxY = lat
      }
    }
  }
  return [minX, minY, maxX, maxY]
}

describe('crew region polygons', () => {
  const features = loadRegions()

  it('has exactly one polygon feature per crew region id', () => {
    const ids = features.map(f => f.properties.id).sort()
    const expected = allCrewRegionsData.map(r => r.id).sort()
    expect(ids).toEqual(expected)
    expect(new Set(ids).size).toBe(features.length)
  })

  it('stamps matching region display names for the hover tooltip', () => {
    const byId = new Map(allCrewRegionsData.map(r => [r.id, r.region]))
    for (const f of features) {
      expect(f.properties.region, f.properties.id).toBe(byId.get(f.properties.id))
      expect(f.id ?? f.properties.id).toBe(f.properties.id)
    }
  })

  it('only contains valid closed MultiPolygon rings', () => {
    for (const f of features) {
      expect(f.geometry.type, f.properties.id).toBe('MultiPolygon')
      expect(f.geometry.coordinates.length, f.properties.id).toBeGreaterThan(0)
      for (const polygon of f.geometry.coordinates) {
        expect(polygon.length, f.properties.id).toBeGreaterThan(0)
        for (const ring of polygon) {
          expect(ring.length, f.properties.id).toBeGreaterThanOrEqual(4)
          expect(ring[0], f.properties.id).toEqual(ring[ring.length - 1])
          for (const [lng, lat] of ring) {
            expect(lng).toBeGreaterThanOrEqual(-180)
            expect(lng).toBeLessThanOrEqual(180)
            expect(lat).toBeGreaterThanOrEqual(-90)
            expect(lat).toBeLessThanOrEqual(90)
          }
        }
      }
    }
  })

  it('places each region on its expected side of the world', () => {
    const boxes = Object.fromEntries(features.map(f => [f.properties.id, bboxOf(f)])) as Record<string, [number, number, number, number]>

    // Americas are west of the prime meridian; South America crosses the
    // equator (Colombia reaches ~12°N) down to Tierra del Fuego.
    expect(boxes['north-america'][2]).toBeLessThan(0)
    expect(boxes['south-america'][2]).toBeLessThan(0)
    expect(boxes['north-america'][1]).toBeGreaterThan(0)
    expect(boxes['south-america'][1]).toBeLessThan(-50)
    expect(boxes['south-america'][3]).toBeGreaterThan(5)

    // Africa straddles the equator around the prime meridian.
    expect(boxes.africa[0]).toBeLessThan(25)
    expect(boxes.africa[2]).toBeGreaterThan(30)
    expect(boxes.africa[1]).toBeLessThan(0)
    expect(boxes.africa[3]).toBeGreaterThan(30)

    // Europe is northern + eastern-longitude (west of the Urals split).
    expect(boxes.europe[1]).toBeGreaterThan(30)
    expect(boxes.europe[3]).toBeGreaterThan(60)

    // East Asia reaches the dateline (Chukotka split from Russia).
    expect(boxes['east-asia'][2]).toBeGreaterThan(140)
    expect(boxes['east-asia'][3]).toBeGreaterThan(40)

    // South Asia covers the Indian subregion and Southeast Asia.
    expect(boxes['south-asia'][0]).toBeGreaterThan(25)
    expect(boxes['south-asia'][2]).toBeGreaterThan(90)
    expect(boxes['south-asia'][1]).toBeLessThan(0)

    // Oceania is entirely southern-hemisphere land (AU/NZ/PG).
    expect(boxes.oceania[3]).toBeLessThan(0)
    expect(boxes.oceania[2]).toBeGreaterThan(110)
  })
})
