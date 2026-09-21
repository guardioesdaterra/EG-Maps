/**
 * lib/grants-regions.ts
 * @why Continent mapping for scraped grants — powers the dashboard region filter
 * @functions grantContinentOf
 */

export type GrantContinentKey =
  | 'africa'
  | 'asia'
  | 'europe'
  | 'latin-america'
  | 'north-america'
  | 'oceania'
  | 'mena'
  | 'global'

export const GRANT_CONTINENTS: Array<{ key: GrantContinentKey; labelKey: string }> = [
  { key: 'africa', labelKey: 'grantsPortal.regionAfrica' },
  { key: 'asia', labelKey: 'grantsPortal.regionAsia' },
  { key: 'europe', labelKey: 'grantsPortal.regionEurope' },
  { key: 'latin-america', labelKey: 'grantsPortal.regionLatinAmerica' },
  { key: 'north-america', labelKey: 'grantsPortal.regionNorthAmerica' },
  { key: 'oceania', labelKey: 'grantsPortal.regionOceania' },
  { key: 'mena', labelKey: 'grantsPortal.regionMena' },
  { key: 'global', labelKey: 'grantsPortal.regionGlobal' },
]

const AFRICA = new Set(
  'DZ AO BJ BW BF BI CM CV CF TD KM CG CD CI DJ EG GQ ER ET GA GM GH GN GW KE LS LR LY MG MW ML MR MU MA MZ NA NE NG RW ST SN SC SL SO ZA SS SD SZ TZ TG TN UG ZM ZW EH'.split(' '),
)
const ASIA = new Set(
  'AF AM AZ BH BD BT BN KH CN CY GE IN ID IR IQ IL JP JO KZ KP KR KW KG LA LB MO MY MV MN MM NP OM PK PS PH QA SA SG LK SY TW TJ TH TL TR TM AE UZ VN YE'.split(' '),
)
const EUROPE = new Set(
  'AL AD AT BY BE BA BG HR CZ DK EE FI FR DE GR VA HU IS IE IT LV LI LT LU MT MD MC ME NL MK NO PL PT RO RU SM RS SK SI ES SE CH UA GB UK'.split(' '),
)
const NORTH_AMERICA = new Set('US CA GL BM'.split(' '))
const LATIN_AMERICA = new Set(
  'MX GT BZ HN SV NI CR PA BS CU DO HT JM PR TT BB GD LC VC AG KN DM KY TC VG VI GP MQ AW SR GY GF PY UY AR CL BO PE EC CO VE BR'.split(' '),
)
const OCEANIA = new Set(
  'AU NZ FJ PG WS TO VU SB CK NR TV KI MH FM PW NU TK PN NF NC PF GU MP AS'.split(' '),
)

/** Legacy region buckets emitted by the scraper pipeline. */
const BUCKET_TO_CONTINENT: Record<string, GrantContinentKey> = {
  AFRICA: 'africa',
  ASIA: 'asia',
  SEA: 'asia',
  EU: 'europe',
  EUROPE: 'europe',
  NORDIC: 'europe',
  LATAM: 'latin-america',
  NORTH_AMERICA: 'north-america',
  OCEANIA: 'oceania',
  PACIFIC: 'oceania',
  MENA: 'mena',
  GLOBAL: 'global',
}

/**
 * Resolve the dashboard continent for a grant. The ISO country code wins;
 * the legacy region bucket is the fallback. Unknown/empty scopes are global.
 */
export function grantContinentOf(
  country?: string | null,
  region?: string | null,
): GrantContinentKey {
  const code = (country || '').trim().toUpperCase()
  if (code) {
    if (AFRICA.has(code)) return 'africa'
    if (ASIA.has(code)) return 'asia'
    if (EUROPE.has(code)) return 'europe'
    if (LATIN_AMERICA.has(code)) return 'latin-america'
    if (NORTH_AMERICA.has(code)) return 'north-america'
    if (OCEANIA.has(code)) return 'oceania'
    if (code === 'MENA') return 'mena'
    if (code === 'GLOBAL') return 'global'
    // Cross-regional basins (e.g. MEDITERRANEAN spans europe + mena) have
    // no single continent — they filter under global, never dropped.
    if (code === 'MEDITERRANEAN') return 'global'
    // Unknown code — fall through to the region bucket before giving up.
  }
  const bucket = (region || '').trim().toUpperCase()
  if (bucket && BUCKET_TO_CONTINENT[bucket]) return BUCKET_TO_CONTINENT[bucket]
  return 'global'
}
