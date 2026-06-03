import type { ToastMessage } from '@/lib/types'

interface ToastState {
  toasts: ToastMessage[]
}

let counter = 0
function makeId() {
  counter += 1
  return `${Date.now()}-${counter}`
}

const DEFAULT_DURATIONS: Record<ToastMessage['kind'], number> = {
  info: 4000,
  success: 3500,
  warning: 5000,
  error: 7000,
}

export function useToast() {
  const state = useState<ToastState>('toast', () => ({ toasts: [] }))

  function push(toast: Omit<ToastMessage, 'id' | 'createdAt'>): string {
    const id = makeId()
    const full: ToastMessage = {
      ...toast,
      id,
      createdAt: Date.now(),
      durationMs: toast.durationMs ?? DEFAULT_DURATIONS[toast.kind],
    }
    state.value.toasts = [...state.value.toasts, full]
    if (full.durationMs && full.durationMs > 0) {
      if (typeof window !== 'undefined') {
        window.setTimeout(() => dismiss(id), full.durationMs!)
      }
    }
    return id
  }

  function dismiss(id: string) {
    state.value.toasts = state.value.toasts.filter(t => t.id !== id)
  }

  function clear() {
    state.value.toasts = []
  }

  function info(title: string, body?: string) { return push({ kind: 'info', title, body }) }
  function success(title: string, body?: string) { return push({ kind: 'success', title, body }) }
  function warning(title: string, body?: string) { return push({ kind: 'warning', title, body }) }
  function error(title: string, body?: string) { return push({ kind: 'error', title, body }) }

  return {
    toasts: computed(() => state.value.toasts),
    push,
    dismiss,
    clear,
    info,
    success,
    warning,
    error,
  }
}
