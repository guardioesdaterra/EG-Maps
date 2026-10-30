import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const stylesheet = readFileSync(resolve(process.cwd(), 'assets/css/main.css'), 'utf8')

type Tokens = Record<string, string>

function readTokenBlock(selector: ':root' | '.dark'): Tokens {
  const selectorIndex = stylesheet.indexOf(`${selector} {`)
  if (selectorIndex < 0) throw new Error(`Missing ${selector} theme token block`)
  const openBrace = stylesheet.indexOf('{', selectorIndex)
  const closeBrace = stylesheet.indexOf('\n  }', openBrace)
  if (closeBrace < 0) throw new Error(`Unterminated ${selector} theme token block`)

  const block = stylesheet.slice(openBrace + 1, closeBrace)
  return Object.fromEntries(
    Array.from(block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g), match => [match[1], match[2]]),
  )
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255)
  const linear = channels.map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

function contrastRatio(first: string, second: string): number {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a)
  return (lighter + 0.05) / (darker + 0.05)
}

describe('theme token contrast', () => {
  it.each([':root', '.dark'] as const)('%s keeps semantic text and primary controls readable', selector => {
    const tokens = readTokenBlock(selector)
    const background = tokens['bg-primary']

    for (const token of ['text-primary', 'text-secondary', 'text-muted', 'primary', 'accent', 'success', 'warning', 'info', 'danger', 'ring']) {
      expect(contrastRatio(tokens[token], background), `${selector} --${token} on --bg-primary`).toBeGreaterThanOrEqual(4.5)
    }

    expect(
      contrastRatio(tokens['primary-foreground'], tokens.primary),
      `${selector} --primary-foreground on --primary`,
    ).toBeGreaterThanOrEqual(4.5)
  })

  it('keeps the light-theme UI boundary token visible against the page background', () => {
    const light = readTokenBlock(':root')
    expect(contrastRatio(light['border-color'], light['bg-primary'])).toBeGreaterThanOrEqual(3)
  })
})
