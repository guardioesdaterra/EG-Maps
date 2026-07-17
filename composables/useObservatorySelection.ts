/**
 * composables/useObservatorySelection.ts
 * @why Observatory selection state — manages selected claims, multi-select, and detail panel
 * @functions useObservatorySelection
 * @interfaces ObservatorySelection
 * @connections components/observatory/ObservatorySidebar.vue, composables/useObservatoryPopup.ts, composables/useVulcanObservatoryPage.ts
 */
export interface ObservatorySelection {
  /** Selected claim process id (processo) */
  processo: string | null
  /** Display name (company) for the selected claim */
  nome: string | null
  /** Coordinates to fly to */
  coords: [number, number] | null
  /** Which tab the selection belongs to (for routing to right sidebar tab) */
  tab: 'danger' | 'military' | 'illegal' | 'env' | 'network' | 'timeline' | null
  /** Optional zoom level for fly-to */
  zoom?: number
}

const EMPTY: ObservatorySelection = {
  processo: null,
  nome: null,
  coords: null,
  tab: null,
}

export function useObservatorySelection() {
  const selection = useState<ObservatorySelection>('observatory.selection', () => ({ ...EMPTY }))
  const highlightedFeature = useState<string | null>('observatory.highlight', () => null)

  function select(s: Partial<ObservatorySelection>) {
    selection.value = { ...selection.value, ...s }
    if (s.nome) highlightedFeature.value = s.nome
  }

  function clear() {
    selection.value = { ...EMPTY }
    highlightedFeature.value = null
  }

  return { selection, highlightedFeature, select, clear }
}
