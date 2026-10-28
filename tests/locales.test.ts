/**
 * Ensure every locale loaded by Nuxt stays structurally complete and preserves
 * interpolation tokens from the English source catalog.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// Keep this list aligned with i18n.locales in nuxt.config.ts.
const loadedLocales = ['en', 'es', 'fr', 'pt', 'ar', 'hi', 'ja', 'zh', 'nl', 'de'] as const

type JsonRecord = Record<string, unknown>

function readLocale(locale: string): JsonRecord {
  return JSON.parse(readFileSync(resolve(process.cwd(), 'locales', `${locale}.json`), 'utf8')) as JsonRecord
}

function flattenLeaves(value: unknown, prefix = ''): Record<string, string> {
  if (typeof value === 'string') return { [prefix]: value }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  return Object.entries(value as JsonRecord).reduce<Record<string, string>>((leaves, [key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return Object.assign(leaves, flattenLeaves(child, path))
  }, {})
}

function appLocaleLeaves(locale: string): Record<string, string> {
  const excludedSection = /^(?:campaigns|projectGrants|grantsPortal|grants)(?:\.|$)/i
  return Object.fromEntries(
    Object.entries(flattenLeaves(readLocale(locale))).filter(([key]) => !excludedSection.test(key)),
  )
}

function interpolationTokens(value: string): string[] {
  return [...value.matchAll(/\{[^{}]+\}/g)].map(([token]) => token).sort()
}

const english = appLocaleLeaves('en')

describe('loaded locale catalogs', () => {
  it.each(loadedLocales.filter((locale) => locale !== 'en'))('%s has the same nested keys as English', (locale) => {
    const translated = appLocaleLeaves(locale)
    expect(Object.keys(translated).sort()).toEqual(Object.keys(english).sort())
  })

  it.each(loadedLocales.filter((locale) => locale !== 'en'))('%s preserves English interpolation tokens', (locale) => {
    const translated = appLocaleLeaves(locale)
    for (const [key, source] of Object.entries(english)) {
      expect(interpolationTokens(translated[key]), `${locale}.${key}`).toEqual(interpolationTokens(source))
    }
  })

  it.each(loadedLocales)('%s uses the endangered-species name for the home count', (locale) => {
    const home = readLocale(locale).home as { species?: unknown; speciesCount?: unknown }
    expect(home.speciesCount, `${locale}.home.speciesCount`).toBe(home.species)
  })

  it.each(loadedLocales)('%s capitalizes the English Crew term in app copy', (locale) => {
    const reservedText = /(?:https?:\/\/|mailto:)[^\s<>]+|(?<!\w)[\w.%+-]+@[\w.-]+|\{[^{}]*\}/g
    const lowercaseCrewWord = /(?<![\w/@{])crews?(?![\w@}])/
    for (const [key, value] of Object.entries(appLocaleLeaves(locale))) {
      expect(lowercaseCrewWord.test(value.replace(reservedText, '')), `${locale}.${key}`).toBe(false)
    }
  })
})
