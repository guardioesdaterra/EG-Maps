/**
 * lib/parsers/kmz.ts
 * @why KMZ (zipped KML) parser — reads ZIP local file headers, finds doc.kml or *.kml entry, decompresses with DecompressionStream, and delegates to KML parser. Supports stored and deflate compression.
 */
import { parseKML, type KMLParseResult } from './kml'

function u16(bytes: Uint8Array, off: number): number {
  return bytes[off] | (bytes[off + 1] << 8)
}
function u32(bytes: Uint8Array, off: number): number {
  return bytes[off] | (bytes[off + 1] << 8) | (bytes[off + 2] << 16) | (bytes[off + 3] << 24)
}

export async function parseKMZ(data: ArrayBuffer, fileName: string): Promise<KMLParseResult> {
  const bytes = new Uint8Array(data)
  let offset = 0
  let kmlText: string | null = null
  const errors: string[] = []

  while (offset + 30 <= bytes.length) {
    if (bytes[offset] !== 0x50 || bytes[offset + 1] !== 0x4B) { offset++; continue }
    const sig = u16(bytes, offset + 2)
    if (sig === 0x0403) {
      const compression = u16(bytes, offset + 8)
      const compSize = u32(bytes, offset + 18)
      const uncompSize = u32(bytes, offset + 22)
      const nameLen = u16(bytes, offset + 26)
      const extraLen = u16(bytes, offset + 28)
      const nameBytes = bytes.slice(offset + 30, offset + 30 + nameLen)
      const entryName = new TextDecoder().decode(nameBytes)
      const dataOff = offset + 30 + nameLen + extraLen

      if (entryName.endsWith('.kml') || entryName === 'doc.kml') {
        const raw = bytes.slice(dataOff, dataOff + compSize)
        let decoded: Uint8Array
        if (compression === 0) {
          decoded = raw
        } else if (compression === 8) {
          try {
            const ds = new DecompressionStream('deflate-raw')
            const stream = new Response(new Blob([raw]).stream().pipeThrough(ds))
            decoded = new Uint8Array(await stream.arrayBuffer())
          } catch {
            errors.push('Decompression not available in this browser')
            return { features: [], name: fileName, count: 0, properties: [], errors }
          }
        } else {
          errors.push(`Unsupported compression: method ${compression}`)
          return { features: [], name: fileName, count: 0, properties: [], errors }
        }
        kmlText = new TextDecoder().decode(decoded)
        break
      }
      offset = dataOff + compSize
    } else if (sig === 0x0201 || sig === 0x0506) {
      break
    } else {
      offset++
    }
  }

  if (!kmlText) {
    return { features: [], name: fileName, count: 0, properties: [], errors: ['No KML file found inside KMZ archive'] }
  }
  return parseKML(kmlText, fileName)
}
