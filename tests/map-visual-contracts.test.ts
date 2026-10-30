import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const readSource = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('map visual contracts', () => {
  it('does not mount or ship the animated noise overlay on either map view', () => {
    for (const view of ['components/MapView2D.vue', 'components/MapView3D.vue']) {
      expect(readSource(view)).not.toMatch(/animate-noise-bg|noise\.png/)
    }

    expect(readSource('assets/css/main.css')).not.toMatch(/@keyframes noise-bg|\.animate-noise-bg/)
    expect(existsSync(resolve(root, 'public/noise.png'))).toBe(false)
  })
})
