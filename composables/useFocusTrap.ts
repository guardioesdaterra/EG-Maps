/**
 * Lightweight focus trap for modals/sidebars.
 * - Traps Tab/Shift+Tab within the container
 * - Restores focus on deactivate
 * - Optionally auto-activates on first focusable element
 */
export interface FocusTrapOptions {
  active?: Ref<boolean> | boolean
  /** Auto-focus the first focusable element on activate */
  autoFocus?: boolean
  /** Selector for focusable elements (defaults to common interactive tags) */
  selector?: string
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  'audio[controls]',
  'video[controls]',
].join(',')

export function useFocusTrap(
  container: Ref<HTMLElement | null>,
  options: FocusTrapOptions = {},
) {
  const isActive = computed(() =>
    typeof options.active === 'object' && 'value' in options.active
      ? (options.active as Ref<boolean>).value
      : !!options.active,
  )
  const autoFocus = options.autoFocus !== false
  const selector = options.selector || FOCUSABLE_SELECTOR

  let previouslyFocused: HTMLElement | null = null

  function getFocusable(): HTMLElement[] {
    const el = container.value
    if (!el) return []
    return Array.from(el.querySelectorAll<HTMLElement>(selector))
      .filter(node => !node.hasAttribute('disabled') && node.tabIndex !== -1)
  }

  function onKeydown(e: KeyboardEvent) {
    if (!isActive.value || e.key !== 'Tab') return
    const focusable = getFocusable()
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const active = document.activeElement as HTMLElement | null

    if (e.shiftKey) {
      if (active === first || !container.value?.contains(active)) {
        e.preventDefault()
        last.focus()
      }
    } else {
      if (active === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  watch(isActive, (active) => {
    if (typeof window === 'undefined') return
    if (active) {
      previouslyFocused = document.activeElement as HTMLElement | null
      if (autoFocus) {
        nextTick(() => {
          const focusable = getFocusable()
          if (focusable.length > 0) focusable[0].focus()
        })
      }
      window.addEventListener('keydown', onKeydown)
    } else {
      window.removeEventListener('keydown', onKeydown)
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        try { previouslyFocused.focus() } catch { /* */ }
      }
      previouslyFocused = null
    }
  }, { immediate: true })

  onScopeDispose(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', onKeydown)
    }
  })

  return { isActive: computed(() => isActive.value) }
}
