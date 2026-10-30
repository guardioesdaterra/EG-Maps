import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const standaloneMap = readFileSync('public/data/rare-earth/rare_earth_map_v5.html', 'utf8')
const nuxtConfig = readFileSync('nuxt.config.ts', 'utf8')

describe('standalone rare-earth map provider', () => {
  it('uses the same MapTiler hybrid style and local fallback as active map routes', () => {
    expect(standaloneMap).toContain('https://api.maptiler.com/maps/hybrid-v4/style.json?key=')
    expect(standaloneMap).toContain("new URL('../embed/land-110m.geojson',window.location.href).href")
    expect(standaloneMap).toContain("fetch('points_full.geojson')")
    expect(standaloneMap).toContain("fetch('polygons.geojson')")
    expect(standaloneMap).not.toContain('sigmine/')
    expect(standaloneMap).not.toContain('maptilerKey')
    expect(standaloneMap).not.toMatch(/cartocdn\.com|carto-light/)
    expect(nuxtConfig).toContain("name: 'eg-maptiler-api-key'")
  })

  it('preserves its mining, water and military layers and promotes details on mobile', () => {
    expect(standaloneMap).toContain("map.addSource('mines'")
    expect(standaloneMap).toContain('addWaterAndMilitary()')
    expect(standaloneMap).toContain("map.addLayer({id:'clusters'")
    expect(standaloneMap).toContain('className:\'rare-earth-detail-popup\'')
    expect(standaloneMap).toContain('map-popup-mobile-fullscreen')
    expect(standaloneMap).toContain('Perigo: sem dado por processo')
  })
})
