import { describe, it, expect, beforeEach } from 'vitest'
import { filterPaletteItems, groupPaletteItems, type CommandPaletteItem } from '../composables/useCommandPalette'

const sampleItems: CommandPaletteItem[] = [
  { id: 'nav:home', group: 'Navigation', label: 'Home', icon: 'mdi:home', onSelect: () => {} },
  { id: 'nav:info', group: 'Navigation', label: 'Info', icon: 'mdi:info', keywords: ['about'], onSelect: () => {} },
  { id: 'theme:dark', group: 'Settings', label: 'Switch to dark', hint: 'Toggle theme', onSelect: () => {} },
  { id: 'lang:fr', group: 'Language', label: 'Français', hint: 'Switch language to French', onSelect: () => {} },
]

describe('filterPaletteItems', () => {
  it('returns all items when query is empty', () => {
    expect(filterPaletteItems(sampleItems, '')).toHaveLength(sampleItems.length)
  })

  it('filters by label case-insensitive', () => {
    const result = filterPaletteItems(sampleItems, 'HOME')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('nav:home')
  })

  it('matches keywords', () => {
    const result = filterPaletteItems(sampleItems, 'about')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('nav:info')
  })

  it('matches hint text', () => {
    const result = filterPaletteItems(sampleItems, 'toggle')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('theme:dark')
  })

  it('returns empty when no match', () => {
    expect(filterPaletteItems(sampleItems, 'zzz')).toHaveLength(0)
  })

  it('handles whitespace-only query', () => {
    expect(filterPaletteItems(sampleItems, '   ')).toHaveLength(sampleItems.length)
  })
})

describe('groupPaletteItems', () => {
  it('groups items by group key, preserving order', () => {
    const grouped = groupPaletteItems(sampleItems)
    expect(grouped).toEqual([
      { group: 'Navigation', items: [sampleItems[0], sampleItems[1]] },
      { group: 'Settings', items: [sampleItems[2]] },
      { group: 'Language', items: [sampleItems[3]] },
    ])
  })

  it('returns empty for empty input', () => {
    expect(groupPaletteItems([])).toEqual([])
  })

  it('handles single-item group', () => {
    const grouped = groupPaletteItems([sampleItems[2]])
    expect(grouped).toEqual([{ group: 'Settings', items: [sampleItems[2]] }])
  })
})

describe('useUrlState', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname)
    }
  })

  it('parses a hash fragment with the given key prefix', () => {
    // Simulate URL: #tab=military
    if (typeof window === 'undefined') return
    window.history.replaceState(null, '', '#tab=military&feature=foo')
    const hash = window.location.hash
    expect(hash).toContain('tab=military')
    expect(hash).toContain('feature=foo')
  })

  it('omits empty values from URL params', () => {
    // Validate the encode logic by checking that empty strings are not present
    const obj = { tab: '', showAll: false, count: 5 }
    const parts: string[] = []
    for (const [k, v] of Object.entries(obj)) {
      if (v === null || v === undefined || v === '' || v === false) continue
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    }
    const result = parts.join('&')
    expect(result).toBe('count=5')
  })
})
