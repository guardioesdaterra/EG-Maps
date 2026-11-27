/**
 * composables/useExitIntent.ts
 * @why Exit-intent detection: fires when the user moves the mouse toward the
 * top edge of the viewport (about to close the tab / navigate away). Used to
 * surface a last-chance grants CTA popup before they leave.
 * @functions useExitIntent
 * @deps vue (ref, computed, onMounted, onBeforeUnmount)
 */
import { ref, computed, onMounted, onBeforeUnmount, type Ref } from 'vue'

export interface UseExitIntentOptions {
  /** Distance from top edge (px) that triggers exit intent. Default 40. */
  threshold?: number
  /** Debounce delay in ms before showing. Default 500. */
  delay?: number
  /** localStorage key used to remember dismissal. Default 'eg_exit_intent_dismissed'. */
  storageKey?: string
  /** Minimum ms between triggers. Default 0 (once per session). */
  cooldownMs?: number
}

export interface UseExitIntentReturn {
  /** Whether the popup is currently open. */
  open: Ref<boolean>
  /** Whether exit intent has ever been triggered this session. */
  triggered: Ref<boolean>
  /** Programmatically dismiss/hide the popup. */
  dismiss: () => void
  /** Programmatically re-enable (reset dismissal). */
  reset: () => void
}

/**
 * Detect exit-intent mouse movement and manage popup open state with
 * session-based dismissal so it doesn't nag on every page load.
 */
export function useExitIntent(
  opts: UseExitIntentOptions = {}
): UseExitIntentReturn {
  const {
    threshold = 40,
    delay = 500,
    storageKey = 'eg_exit_intent_dismissed',
    cooldownMs = 0,
  } = opts

  const open = ref(false)
  const triggered = ref(false)

  let timer: ReturnType<typeof setTimeout> | null = null
  let lastTriggerTime = 0

  const isDismissed = computed(() => {
    if (typeof localStorage === 'undefined') return false
    try {
      return localStorage.getItem(storageKey) === '1'
    } catch {
      return false
    }
  })

  const isTouchDevice = computed(() => {
    if (typeof window === 'undefined') return false
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0
  })

  function dismiss() {
    open.value = false
    triggered.value = true
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(storageKey, '1')
      } catch { /* localStorage unavailable */ }
    }
    clearTimer()
  }

  function reset() {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(storageKey)
      } catch { /* localStorage unavailable */ }
    }
    open.value = false
    triggered.value = false
    lastTriggerTime = 0
  }

  function clearTimer() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  function handleMouseLeave(event: Event) {
    const e = event as MouseEvent
    // Ignore touch devices — no reliable "exit intent" there
    if (isTouchDevice.value) return
    // Don't re-trigger if recently dismissed or cooling down
    if (isDismissed.value || triggered.value) return
    const now = Date.now()
    if (cooldownMs > 0 && now - lastTriggerTime < cooldownMs) return

    // e.clientY < 0 means the cursor left the viewport from the top
    if (e.clientY < 0 || e.clientY < threshold) {
      lastTriggerTime = now
      clearTimer()
      timer = setTimeout(() => {
        open.value = true
        triggered.value = true
        timer = null
      }, delay)
    }
  }

  onMounted(() => {
    if (typeof window === 'undefined') return
    window.addEventListener('mouseleave', handleMouseLeave)
    document.documentElement.addEventListener('mouseout', handleMouseLeave)
  })

  onBeforeUnmount(() => {
    clearTimer()
    if (typeof window === 'undefined') return
    window.removeEventListener('mouseleave', handleMouseLeave)
    document.documentElement.removeEventListener('mouseout', handleMouseLeave)
  })

  return {
    open: computed(() => open.value),
    triggered: computed(() => triggered.value),
    dismiss,
    reset,
  }
}
