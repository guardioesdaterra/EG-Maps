import { describe, expect, it } from 'vitest'
import { parseFile } from '../lib/parsers'
import { parseGeoJSON } from '../lib/parsers/geojson'
import { parseKML } from '../lib/parsers/kml'
import { parseKMZ } from '../lib/parsers/kmz'
import { MAX_FEATURES, MAX_KMZ_ARCHIVE_BYTES } from '../lib/parsers/limits'

function storedKmz(name: string, content: string): ArrayBuffer {
  const encoder = new TextEncoder()
  const nameBytes = encoder.encode(name)
  const contentBytes = encoder.encode(content)
  const local = new Uint8Array(30 + nameBytes.length + contentBytes.length)
  const view = new DataView(local.buffer)
  view.setUint32(0, 0x04034b50, true)
  view.setUint16(4, 20, true)
  view.setUint16(18, contentBytes.length, true)
  view.setUint32(22, contentBytes.length, true)
  view.setUint16(26, nameBytes.length, true)
  local.set(nameBytes, 30)
  local.set(contentBytes, 30 + nameBytes.length)
  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  endView.setUint32(0, 0x06054b50, true)
  endView.setUint16(8, 1, true)
  endView.setUint16(10, 1, true)
  endView.setUint32(12, 30 + nameBytes.length, true)
  endView.setUint32(16, local.length, true)
  const result = new Uint8Array(local.length + end.length)
  result.set(local)
  result.set(end, local.length)
  return result.buffer
}

const kmlWithHole = `<?xml version="1.0"?><kml><Document><name>Hole</name><Placemark><Polygon>
<outerBoundaryIs><LinearRing><coordinates>0,0 10,0 10,10 0,10</coordinates></LinearRing></outerBoundaryIs>
<innerBoundaryIs><LinearRing><coordinates>2,2 4,2 4,4 2,4</coordinates></LinearRing></innerBoundaryIs>
<innerBoundaryIs><LinearRing><coordinates>6,6 8,6 8,8 6,8</coordinates></LinearRing></innerBoundaryIs>
</Polygon></Placemark></Document></kml>`

describe('safe import parsers', () => {
  it('preserves every KML innerBoundaryIs and closes rings', () => {
    const result = parseKML(kmlWithHole, 'holes.kml')
    expect(result.errors).toEqual([])
    expect(result.features[0].geometry).toEqual({
      type: 'Polygon',
      coordinates: [
        [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
        [[2, 2], [4, 2], [4, 4], [2, 4], [2, 2]],
        [[6, 6], [8, 6], [8, 8], [6, 8], [6, 6]],
      ],
    })
  })

  it('rejects GeoJSON collections over the feature limit without truncating', () => {
    const text = JSON.stringify({ type: 'FeatureCollection', features: Array.from({ length: MAX_FEATURES + 1 }, () => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} })) })
    const result = parseGeoJSON(text, 'too-many.geojson')
    expect(result.features).toHaveLength(0)
    expect(result.errors[0]).toContain('Feature limit exceeded')
  })

  it('rejects a truncated KMZ local entry before slicing past the archive', async () => {
    const bytes = new Uint8Array(30)
    const view = new DataView(bytes.buffer)
    view.setUint32(0, 0x04034b50, true)
    view.setUint16(18, 100, true)
    view.setUint16(26, 1, true)
    const result = await parseKMZ(bytes.buffer, 'broken.kmz')
    expect(result.features).toHaveLength(0)
    expect(result.errors[0]).toContain('entry extends beyond archive')
  })

  it('parses a bounded stored KMZ without network access', async () => {
    const result = await parseKMZ(storedKmz('doc.kml', kmlWithHole), 'holes.kmz')
    expect(result.count).toBe(1)
    expect((result.features[0].geometry as GeoJSON.Polygon).coordinates).toHaveLength(3)
  })

  it('rejects an archive above the raw KMZ limit through parseFile', async () => {
    const result = await parseFile('', new ArrayBuffer(MAX_KMZ_ARCHIVE_BYTES + 1), 'large.kmz')
    expect(result.features).toHaveLength(0)
    expect(result.errors[0]).toContain('archive exceeds')
  })
})
