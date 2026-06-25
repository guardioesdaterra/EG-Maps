export interface CommandPaletteItem {
  id: string
  group: string
  label: string
  hint?: string
  icon?: string
  shortcut?: string
  keywords?: string[]
  onSelect: () => unknown
  /** Optional: hidden when this returns false */
  visible?: () => boolean
}

interface PaletteState {
  open: boolean
  query: string
}

export function useCommandPalette() {
  const state = useState<PaletteState>('command-palette', () => ({ open: false, query: '' }))
  const items = useState<CommandPaletteItem[]>('command-palette:items', () => [])

  function open() {
    state.value = { ...state.value, open: true, query: '' }
  }
  function close() {
    state.value = { ...state.value, open: false, query: '' }
  }
  function setQuery(q: string) {
    state.value = { ...state.value, query: q }
  }
  function toggle() {
    state.value = state.value.open ? { ...state.value, open: false, query: '' } : { ...state.value, open: true, query: '' }
  }

  function register(item: CommandPaletteItem): () => void {
    if (items.value.some(i => i.id === item.id)) return () => {}
    items.value = [...items.value, item]
    return () => {
      items.value = items.value.filter(i => i.id !== item.id)
    }
  }

  function registerMany(newItems: CommandPaletteItem[]): () => void {
    const disposers = newItems.map(i => register(i))
    return () => disposers.forEach(d => d())
  }

  return {
    open: computed(() => state.value.open),
    query: computed(() => state.value.query),
    items: computed(() => items.value),
    openPalette: open,
    closePalette: close,
    setQuery,
    togglePalette: toggle,
    register,
    registerMany,
  }
}

export function filterPaletteItems(items: CommandPaletteItem[], query: string): CommandPaletteItem[] {
  const q = query.trim().toLowerCase()
  const visible = items.filter(i => !i.visible || i.visible())
  if (!q) return visible
  return visible.filter((i) => {
    if (i.label.toLowerCase().includes(q)) return true
    if (i.hint?.toLowerCase().includes(q)) return true
    if (i.group.toLowerCase().includes(q)) return true
    if (i.keywords?.some(k => k.toLowerCase().includes(q))) return true
    return false
  })
}

export function groupPaletteItems(items: CommandPaletteItem[]): Array<{ group: string; items: CommandPaletteItem[] }> {
  const groups = new Map<string, CommandPaletteItem[]>()
  for (const item of items) {
    const g = item.group
    if (!groups.has(g)) groups.set(g, [])
    groups.get(g)!.push(item)
  }
  return Array.from(groups.entries()).map(([group, list]) => ({ group, items: list }))
}
