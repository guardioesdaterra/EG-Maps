/**
 * Icons render from the offline registry in `lib/icons.ts`, so a name that is
 * missing there silently produces a blank button. This test keeps the two in sync.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ICON_SVG } from '../lib/icons'

const SCAN_DIRS = ['components', 'composables', 'layouts', 'lib', 'pages', 'plugins']
const ICON_LITERAL = /['"`]((?:tabler|gis):[a-z0-9]+(?:-[a-z0-9]+)*)['"`]/g
const REGISTRY = resolve(process.cwd(), 'lib', 'icons.ts')

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.(vue|ts)$/.test(entry) && path !== REGISTRY ? [path] : []
  })
}

const references = new Map<string, string[]>()
for (const dir of SCAN_DIRS) {
  const root = resolve(process.cwd(), dir)
  if (!statSync(root).isDirectory()) continue
  for (const file of sourceFiles(root)) {
    for (const [, icon] of readFileSync(file, 'utf8').matchAll(ICON_LITERAL)) {
      references.set(icon, [...(references.get(icon) ?? []), file.replace(`${process.cwd()}/`, '')])
    }
  }
}

describe('offline icon registry', () => {
  it('finds icon references to check', () => {
    expect(references.size).toBeGreaterThan(20)
  })

  it.each([...references.keys()])('%s is registered', (icon) => {
    expect(ICON_SVG[icon], `referenced by ${references.get(icon)?.join(', ')}`).toBeTruthy()
  })

  it('stores renderable svg markup for every entry', () => {
    for (const [name, svg] of Object.entries(ICON_SVG)) {
      expect(svg, name).toMatch(/^<svg[\s\S]+<\/svg>$/)
      expect(svg, name).toContain('viewBox')
    }
  })
})
