/**
 * Defensive limits for user-supplied imports. These are intentionally finite so
 * parsing never allocates unbounded JSON/XML/ZIP data in the browser.
 */
export const MAX_IMPORT_TEXT_BYTES = 25 * 1024 * 1024
export const MAX_KMZ_ARCHIVE_BYTES = 25 * 1024 * 1024
export const MAX_KMZ_UNCOMPRESSED_BYTES = 50 * 1024 * 1024
export const MAX_FEATURES = 50_000
export const MAX_KMZ_ENTRIES = 10_000

export function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength
}

export function emptyImportResult<T extends { features: unknown[]; name: string; count: number; properties: string[]; errors: string[] }>(name: string, error: string): T {
  return { features: [], name, count: 0, properties: [], errors: [error] } as unknown as T
}

export function tooManyFeatures(count: number): string {
  return `Feature limit exceeded: maximum is ${MAX_FEATURES.toLocaleString()} features (received ${count.toLocaleString()})`
}
