/**
 * Lightweight, framework-agnostic utilities used across components.
 */
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Format a number using compact notation (1.2K, 3.4M, etc.)
 * Used by stat cards, dashboard tiles, and search results.
 */
export function formatCompact(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return String(num)
}

/**
 * Format an ISO date as a relative time string (e.g. "2 days ago").
 */
export function formatRelativeTime(iso?: string | number | Date): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'

  const diff = Date.now() - d.getTime()
  const absDiff = Math.abs(diff)
  const future = diff < 0
  const seconds = absDiff / 1000
  const minutes = seconds / 60
  const hours = minutes / 60
  const days = hours / 24
  const months = days / 30
  const years = days / 365

  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  if (seconds < 60) return rtf.format(future ? Math.ceil(seconds) : -Math.floor(seconds), 'second')
  if (minutes < 60) return rtf.format(future ? Math.ceil(minutes) : -Math.floor(minutes), 'minute')
  if (hours < 24) return rtf.format(future ? Math.ceil(hours) : -Math.floor(hours), 'hour')
  if (days < 30) return rtf.format(future ? Math.ceil(days) : -Math.floor(days), 'day')
  if (months < 12) return rtf.format(future ? Math.ceil(months) : -Math.floor(months), 'month')
  return rtf.format(future ? Math.ceil(years) : -Math.floor(years), 'year')
}

/**
 * Escape a string so it can be safely inserted into innerHTML.
 * Used as a defense-in-depth measure in the rare places where v-html is still
 * used. Prefer Vue components over v-html wherever possible.
 */
export function escapeHtml(input: unknown): string {
  if (input === null || input === undefined) return ''
  const str = String(input)
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Clamp a number between min and max (inclusive).
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Stable debounce implementation. Cancels previous invocations within `wait` ms.
 */
export function debounce<T extends (..._args: never[]) => void>(
  fn: T,
  wait: number,
): T & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null
  const wrapped = ((...args: Parameters<T>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      fn(...args)
    }, wait)
  }) as T & { cancel: () => void }
  wrapped.cancel = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }
  return wrapped
}

/**
 * Throttle a function to fire at most once per `wait` ms (trailing edge).
 */
export function throttle<T extends (..._args: never[]) => void>(fn: T, wait: number): T {
  let last = 0
  let pendingArgs: Parameters<T> | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  return ((...args: Parameters<T>) => {
    const now = Date.now()
    const remaining = wait - (now - last)
    if (remaining <= 0) {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      last = now
      fn(...args)
    } else {
      pendingArgs = args
      if (!timer) {
        timer = setTimeout(() => {
          last = Date.now()
          timer = null
          if (pendingArgs) fn(...pendingArgs)
          pendingArgs = null
        }, remaining)
      }
    }
  }) as T
}

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
