import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCompact(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1).replace('.0', '')}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1).replace('.0', '')}K`
  return String(num)
}
