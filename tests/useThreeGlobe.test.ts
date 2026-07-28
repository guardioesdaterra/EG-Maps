/**
 * tests/useThreeGlobe.test.ts
 * @why Unit tests for Three.js globe composable — coordinate projection, rotation calculations
 * @deps vitest (describe, it, expect); ../composables/useThreeGlobe (latLngToVector3, type GlobeProject)
 */
import { describe, it, expect } from 'vitest'
import { latLngToVector3, type GlobeProject } from '../composables/useThreeGlobe'

describe('latLngToVector3', () => {
  it('converts north pole (90, 0) to (0, radius, 0)', () => {
    const result = latLngToVector3(90, 0, 2)
    expect(result.x).toBeCloseTo(0, 5)
    expect(result.y).toBeCloseTo(2, 5)
    expect(result.z).toBeCloseTo(0, 5)
  })

  it('converts south pole (-90, 0) to (0, -radius, 0)', () => {
    const result = latLngToVector3(-90, 0, 2)
    expect(result.x).toBeCloseTo(0, 5)
    expect(result.y).toBeCloseTo(-2, 5)
    expect(result.z).toBeCloseTo(0, 5)
  })

  it('converts equator at 0 longitude correctly', () => {
    const result = latLngToVector3(0, 0, 1)
    expect(result.x).toBeCloseTo(1, 5)
    expect(result.y).toBeCloseTo(0, 5)
    expect(result.z).toBeCloseTo(0, 5)
  })

  it('converts equator at 90 longitude correctly', () => {
    const result = latLngToVector3(0, 90, 1)
    expect(result.x).toBeCloseTo(0, 5)
    expect(result.y).toBeCloseTo(0, 5)
    expect(result.z).toBeCloseTo(-1, 5)
  })

  it('converts equator at 180 longitude correctly', () => {
    const result = latLngToVector3(0, 180, 1)
    expect(result.x).toBeCloseTo(-1, 5)
    expect(result.y).toBeCloseTo(0, 5)
    expect(result.z).toBeCloseTo(0, 5)
  })

  it('converts equator at -90 longitude correctly', () => {
    const result = latLngToVector3(0, -90, 1)
    expect(result.x).toBeCloseTo(0, 5)
    expect(result.y).toBeCloseTo(0, 5)
    expect(result.z).toBeCloseTo(1, 5)
  })

  it('maintains distance from origin equal to radius', () => {
    const radius = 3.5
    const result = latLngToVector3(23.5, -46.6, radius)
    const distance = Math.sqrt(result.x ** 2 + result.y ** 2 + result.z ** 2)
    expect(distance).toBeCloseTo(radius, 5)
  })

  it('returns zero vector for radius 0', () => {
    const result = latLngToVector3(45, 45, 0)
    expect(Math.abs(result.x)).toBe(0)
    expect(result.y).toBe(0)
    expect(Math.abs(result.z)).toBe(0)
  })

  it('handles negative latitudes', () => {
    const result = latLngToVector3(-45, 0, 1)
    expect(result.y).toBeLessThan(0)
    const distance = Math.sqrt(result.x ** 2 + result.y ** 2 + result.z ** 2)
    expect(distance).toBeCloseTo(1, 5)
  })

  it('handles negative longitudes', () => {
    const result = latLngToVector3(0, -45, 1)
    const distance = Math.sqrt(result.x ** 2 + result.y ** 2 + result.z ** 2)
    expect(distance).toBeCloseTo(1, 5)
  })

  it('produces consistent results for same inputs', () => {
    const r1 = latLngToVector3(30, 60, 2)
    const r2 = latLngToVector3(30, 60, 2)
    expect(r1.x).toBe(r2.x)
    expect(r1.y).toBe(r2.y)
    expect(r1.z).toBe(r2.z)
  })

  it('scales linearly with radius', () => {
    const r1 = latLngToVector3(30, 60, 1)
    const r2 = latLngToVector3(30, 60, 3)
    expect(r2.x).toBeCloseTo(r1.x * 3, 5)
    expect(r2.y).toBeCloseTo(r1.y * 3, 5)
    expect(r2.z).toBeCloseTo(r1.z * 3, 5)
  })
})

describe('GlobeProject interface', () => {
  it('accepts a valid project with all fields', () => {
    const project: GlobeProject = {
      latitude: -22.9,
      longitude: -43.2,
      direct_beneficiaries: 150,
      indirect_beneficiaries: 500,
    }
    expect(project.latitude).toBe(-22.9)
    expect(project.longitude).toBe(-43.2)
    expect(project.direct_beneficiaries).toBe(150)
    expect(project.indirect_beneficiaries).toBe(500)
  })

  it('accepts a project with only required fields', () => {
    const project: GlobeProject = {
      latitude: 0,
      longitude: 0,
    }
    expect(project.direct_beneficiaries).toBeUndefined()
    expect(project.indirect_beneficiaries).toBeUndefined()
  })
})

describe('useThreeGlobe module exports', () => {
  it('exports latLngToVector3 as a named export', async () => {
    const mod = await import('../composables/useThreeGlobe')
    expect(typeof mod.latLngToVector3).toBe('function')
  })

  it('exports useThreeGlobe as a named export', async () => {
    const mod = await import('../composables/useThreeGlobe')
    expect(typeof mod.useThreeGlobe).toBe('function')
  })
})
