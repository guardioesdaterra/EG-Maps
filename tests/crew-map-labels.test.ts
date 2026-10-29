import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PREVIOUS_LABELS: Record<string, string> = {
  en: 'Active Crews',
  es: 'Equipos Activos',
  pt: 'Equipes Ativas',
  fr: 'Équipes actives',
  ja: 'アクティブクルー',
  zh: '活跃团队',
  ar: 'الفرق النشطة',
  hi: 'सक्रिय दल',
  nl: 'Actieve Crews',
  de: 'Aktive Crews',
}

interface LocaleMessages {
  home: { activeCrewsTitle?: string }
  stats: {
    activeCrewsTitle?: string
    activeCrews?: string
    crewsInactive?: string
  }
}

function loadLocale(locale: string): LocaleMessages {
  return JSON.parse(readFileSync(join(ROOT, 'locales', `${locale}.json`), 'utf8')) as LocaleMessages
}

describe('global Crews Map naming', () => {
  const locales = Object.keys(PREVIOUS_LABELS)

  it('uses the new English map name for the rendered page and statistics bubble', () => {
    const english = loadLocale('en')
    expect(english.home.activeCrewsTitle).toBe('Crews Map')
    expect(english.stats.activeCrewsTitle).toBe('Crews Map')
  })

  it.each(locales)('keeps the %s map/bubble name localized and status labels distinct', (locale) => {
    const messages = loadLocale(locale)
    const mapTitle = messages.home.activeCrewsTitle
    const bubbleTitle = messages.stats.activeCrewsTitle

    expect(mapTitle).toBeTruthy()
    expect(bubbleTitle).toBe(mapTitle)
    expect(mapTitle).not.toBe(PREVIOUS_LABELS[locale])
    expect(messages.stats.activeCrews).toBeTruthy()
    expect(messages.stats.crewsInactive).toBeTruthy()
    expect(messages.stats.activeCrews).not.toBe(mapTitle)
    expect(messages.stats.crewsInactive).not.toBe(mapTitle)
  })
})
