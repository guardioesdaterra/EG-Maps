/**
 * KMZ (ZIP containing KML) parser. It reads local ZIP entries defensively,
 * rejects malformed boundaries and boundedly streams deflate output.
 */
import { parseKML, type KMLParseResult } from './kml'
import { MAX_FEATURES, MAX_IMPORT_TEXT_BYTES, MAX_KMZ_ARCHIVE_BYTES, MAX_KMZ_ENTRIES, MAX_KMZ_UNCOMPRESSED_BYTES, emptyImportResult } from './limits'

function u16(bytes: Uint8Array, off: number): number { return bytes[off] | (bytes[off + 1] << 8) }
function u32(bytes: Uint8Array, off: number): number { return (bytes[off] | (bytes[off + 1] << 8) | (bytes[off + 2] << 16) | (bytes[off + 3] << 24)) >>> 0 }
function result(fileName: string, error: string): KMLParseResult { return emptyImportResult<KMLParseResult>(fileName, error) }

async function inflateBounded(raw: Uint8Array, fileName: string): Promise<Uint8Array | KMLParseResult> {
  try {
    const ds = new DecompressionStream('deflate-raw')
    const rawCopy = new Uint8Array(raw.byteLength)
    rawCopy.set(raw)
    const reader = new Response(new Blob([rawCopy.buffer as ArrayBuffer]).stream().pipeThrough(ds)).body!.getReader()
    const chunks: Uint8Array[] = []
    let total = 0
    while (true) {
      const part = await reader.read()
      if (part.done) break
      total += part.value.byteLength
      if (total > MAX_KMZ_UNCOMPRESSED_BYTES) {
        await reader.cancel()
        return result(fileName, `KMZ uncompressed data exceeds the ${MAX_KMZ_UNCOMPRESSED_BYTES / 1024 / 1024} MiB limit`)
      }
      chunks.push(part.value)
    }
    const output = new Uint8Array(total)
    let offset = 0
    for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.length }
    return output
  } catch {
    return result(fileName, 'Invalid or unsupported KMZ compression data')
  }
}

export async function parseKMZ(data: ArrayBuffer, fileName: string): Promise<KMLParseResult> {
  const bytes = new Uint8Array(data)
  if (bytes.byteLength > MAX_KMZ_ARCHIVE_BYTES) return result(fileName, `KMZ archive exceeds the ${MAX_KMZ_ARCHIVE_BYTES / 1024 / 1024} MiB limit`)
  const errors: string[] = []
  let offset = 0
  let entries = 0
  let declaredUncompressed = 0
  let kmlText: string | null = null
  let foundEnd = false

  while (offset + 4 <= bytes.length) {
    const signature = u32(bytes, offset)
    if (signature === 0x04034b50) {
      if (offset + 30 > bytes.length) return result(fileName, 'Malformed KMZ: truncated local file header')
      entries++
      if (entries > MAX_KMZ_ENTRIES) return result(fileName, `KMZ contains too many entries (maximum ${MAX_KMZ_ENTRIES.toLocaleString()})`)
      const flags = u16(bytes, offset + 6)
      const compression = u16(bytes, offset + 8)
      const compSize = u32(bytes, offset + 18)
      const uncompSize = u32(bytes, offset + 22)
      const nameLen = u16(bytes, offset + 26)
      const extraLen = u16(bytes, offset + 28)
      if ((flags & 0x08) !== 0) return result(fileName, 'Malformed KMZ: data-descriptor ZIP entries are not supported safely')
      if (compSize === 0xffffffff || uncompSize === 0xffffffff) return result(fileName, 'Malformed KMZ: ZIP64 sizes are not supported')
      declaredUncompressed += uncompSize
      if (declaredUncompressed > MAX_KMZ_UNCOMPRESSED_BYTES) return result(fileName, `KMZ uncompressed data exceeds the ${MAX_KMZ_UNCOMPRESSED_BYTES / 1024 / 1024} MiB limit`)
      const headerEnd = offset + 30 + nameLen + extraLen
      const dataEnd = headerEnd + compSize
      if (headerEnd > bytes.length || dataEnd < headerEnd || dataEnd > bytes.length) return result(fileName, 'Malformed KMZ: entry extends beyond archive')
      const entryName = new TextDecoder().decode(bytes.slice(offset + 30, offset + 30 + nameLen)).replaceAll('\\', '/')
      if (entryName.endsWith('.kml')) {
        if (kmlText !== null) {
          offset = dataEnd
          continue
        }
        if (compression !== 0 && compression !== 8) return result(fileName, `Unsupported compression: method ${compression}`)
        const raw = bytes.slice(headerEnd, dataEnd)
        let decoded: Uint8Array
        if (compression === 0) {
          if (raw.byteLength > MAX_KMZ_UNCOMPRESSED_BYTES) return result(fileName, `KMZ uncompressed data exceeds the ${MAX_KMZ_UNCOMPRESSED_BYTES / 1024 / 1024} MiB limit`)
          decoded = raw
        } else {
          const inflated = await inflateBounded(raw, fileName)
          if (!(inflated instanceof Uint8Array)) return inflated
          decoded = inflated
        }
        if (uncompSize !== 0 && decoded.byteLength !== uncompSize) return result(fileName, 'Malformed KMZ: decompressed size does not match ZIP header')
        if (decoded.byteLength > MAX_IMPORT_TEXT_BYTES) return result(fileName, `KML entry exceeds the ${MAX_IMPORT_TEXT_BYTES / 1024 / 1024} MiB text limit`)
        kmlText = new TextDecoder().decode(decoded)
      }
      offset = dataEnd
      continue
    }
    if (signature === 0x02014b50) {
      // A valid archive may have a central directory between local entries and EOCD.
      // Validate that an EOCD record exists in the remaining bounded archive.
      for (let endOffset = offset; endOffset + 22 <= bytes.length; endOffset++) {
        if (u32(bytes, endOffset) === 0x06054b50) { foundEnd = true; break }
      }
      if (!foundEnd) return result(fileName, 'Malformed KMZ: missing ZIP end record')
      break
    }
    if (signature === 0x06054b50 || signature === 0x06064b50 || signature === 0x07064b50) {
      foundEnd = signature === 0x06054b50 || signature === 0x06064b50
      break
    }
    return result(fileName, 'Malformed KMZ: invalid ZIP structure')
  }

  if (!foundEnd && !kmlText) return result(fileName, 'Malformed KMZ: missing ZIP end record')
  if (!kmlText) return { features: [], name: fileName, count: 0, properties: [], errors: errors.length ? errors : ['No KML file found inside KMZ archive'] }
  const parsed = parseKML(kmlText, fileName)
  if (parsed.count > MAX_FEATURES) return result(fileName, `Feature limit exceeded: maximum is ${MAX_FEATURES.toLocaleString()} features`)
  return parsed
}
