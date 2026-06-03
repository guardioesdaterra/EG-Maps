import { describe, it, expect } from 'vitest'
import { cn, formatCompact } from '../lib/utils'
import { getProjectColorByBeneficiaries, getProjectColor } from '../lib/colors'
import { isValidCoordinate, getGroupColor, calculateDistance, escapeHtml, buildProjectPopupHTML } from '../lib/map-utils'
import type { ProjectData } from '../lib/types'

describe('cn', () => {
  it('merges tailwind classes', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('handles conditional classes', () => {
    const cond = false
    expect(cn('base', cond && 'hidden', 'visible')).toBe('base visible')
  })

  it('handles empty input', () => {
    expect(cn()).toBe('')
  })
})

describe('formatCompact', () => {
  it('formats millions', () => {
    expect(formatCompact(1500000)).toBe('1.5M')
  })

  it('formats thousands', () => {
    expect(formatCompact(2500)).toBe('2.5K')
  })

  it('formats small numbers', () => {
    expect(formatCompact(999)).toBe('999')
  })

  it('rounds .0 suffix', () => {
    expect(formatCompact(1000000)).toBe('1M')
    expect(formatCompact(1000)).toBe('1K')
  })
})

describe('getProjectColorByBeneficiaries', () => {
  it('returns default for zero', () => {
    expect(getProjectColorByBeneficiaries(0, 0)).toBe('#a855f7')
  })

  it('returns blue for <=100', () => {
    expect(getProjectColorByBeneficiaries(50, 50)).toBe('#3b82f6')
  })

  it('returns green for <=500', () => {
    expect(getProjectColorByBeneficiaries(300, 0)).toBe('#22c55e')
  })

  it('returns yellow for <=1000', () => {
    expect(getProjectColorByBeneficiaries(800, 0)).toBe('#eab308')
  })

  it('returns red for >1000', () => {
    expect(getProjectColorByBeneficiaries(1500, 0)).toBe('#ef4444')
  })
})

describe('getProjectColor', () => {
  it('extracts color from project data', () => {
    const project = { direct_beneficiaries: 50, indirect_beneficiaries: 50 } as ProjectData
    expect(getProjectColor(project)).toBe('#3b82f6')
  })
})

describe('isValidCoordinate', () => {
  it('validates correct coords', () => {
    expect(isValidCoordinate(51.5, -0.12)).toBe(true)
  })

  it('rejects null', () => {
    expect(isValidCoordinate(null, 10)).toBe(false)
  })

  it('rejects out of range', () => {
    expect(isValidCoordinate(100, 0)).toBe(false)
  })
})

describe('getGroupColor', () => {
  it('returns color for known group', () => {
    expect(getGroupColor('Mammal')).toBe('#B64032')
  })

  it('returns default for unknown group', () => {
    expect(getGroupColor('Alien')).toBe('#B64032')
  })
})

describe('calculateDistance', () => {
  it('returns ~0 for same point', () => {
    expect(calculateDistance(0, 0, 0, 0)).toBeCloseTo(0, 1)
  })

  it('returns ~111km for 1 degree lat', () => {
    const d = calculateDistance(0, 0, 1, 0)
    expect(d).toBeGreaterThan(100)
    expect(d).toBeLessThan(120)
  })
})

describe('escapeHtml', () => {
  it('escapes < and >', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;')
  })

  it('escapes &', () => {
    expect(escapeHtml('a&b')).toBe('a&amp;b')
  })

  it('leaves safe text', () => {
    expect(escapeHtml('hello world')).toBe('hello world')
  })
})

describe('buildProjectPopupHTML', () => {
  const baseProject = {
    project_title: 'Sample Project',
    country_province: 'Brazil',
    latitude: 0,
    longitude: 0,
    direct_beneficiaries: 100,
    indirect_beneficiaries: 200,
  } as ProjectData

  it('renders both metrics when both are non-zero', () => {
    const html = buildProjectPopupHTML(baseProject)
    expect(html).toContain('Direct Beneficiaries')
    expect(html).toContain('Indirect Beneficiaries')
    expect(html).toContain('100')
    expect(html).toContain('200')
    expect(html).toContain('project-metrics')
  })

  it('hides direct metric when direct_beneficiaries is 0', () => {
    const html = buildProjectPopupHTML({ ...baseProject, direct_beneficiaries: 0 })
    expect(html).not.toContain('Direct Beneficiaries')
    expect(html).toContain('Indirect Beneficiaries')
  })

  it('hides indirect metric when indirect_beneficiaries is 0', () => {
    const html = buildProjectPopupHTML({ ...baseProject, indirect_beneficiaries: 0 })
    expect(html).toContain('Direct Beneficiaries')
    expect(html).not.toContain('Indirect Beneficiaries')
  })

  it('hides metrics block entirely when both are 0', () => {
    const html = buildProjectPopupHTML({ ...baseProject, direct_beneficiaries: 0, indirect_beneficiaries: 0 })
    expect(html).not.toContain('Direct Beneficiaries')
    expect(html).not.toContain('Indirect Beneficiaries')
    expect(html).not.toContain('project-metrics')
    expect(html).not.toContain('project-divider')
  })
})
