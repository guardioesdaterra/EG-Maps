/**
 * lib/crew-grants.ts
 * @why Crew ↔ project-grant matching — links active-crews popup details to project-grants data.
 *  Matching itself is PRECOMPUTED by scripts/generate-crew-grants.ts into
 *  lib/crew-grants-map.ts (static, reviewed); this module holds the algorithm
 *  (reused by the generator + sync tests) and the stable key builders shared
 *  with the generated map.
 * @functions normalizeCrewText, haversineKm, findGrantsForCrewLocation, findGrantsForRegion,
 *  crewLocationKey, crewRegionKey, projectGrantKey
 * @deps @/lib/crew-data (CrewRegionData, CrewLocation); @/lib/types (ProjectData)
 * @connections components/map/CrewPopup.vue, components/MapView2D.vue, components/MapView3D.vue,
 *  scripts/generate-crew-grants.ts, tests/crew-grants.test.ts
 */
import type { CrewRegionData, CrewLocation } from '@/lib/crew-data'
import type { ProjectData } from '@/lib/types'

export type CrewGrantMatchReason = 'crew-name' | 'city' | 'country' | 'nearby'

export interface CrewGrantMatch {
  project: ProjectData
  /** Distance in km between crew and grant coordinates (null when coords invalid) */
  distanceKm: number | null
  reason: CrewGrantMatchReason
}

/** Default radius: crew and grant coordinates within this distance count as related */
export const CREW_GRANT_MAX_DISTANCE_KM = 150

const EARTH_RADIUS_KM = 6371

/** Strip accents, lowercase, collapse non-alphanumerics to single spaces */
export function normalizeCrewText(value: string | null | undefined): string {
  if (!value) return ''
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Canonicalize known country-name variants so text matching works across datasets */
function canonicalCountry(text: string): string {
  let s = ` ${text} `
  const reps: Array<[RegExp, string]> = [
    [/\bcameroun\b/g, 'cameroon'],
    [/\bburkine faso\b/g, 'burkina faso'],
    [/\bburkina(?! faso)\b/g, 'burkina faso'],
    [/\bdemocratic republic of congo\b/g, 'dr congo'],
    [/\brepublique democratique du congo\b/g, 'dr congo'],
    [/\bsud kivu\b/g, 'dr congo'],
    [/\buvira\b|\bgoma\b|\bbukavu\b/g, 'dr congo'],
    [/\bdrc\b/g, 'dr congo'],
    [/\busa turtle island\b/g, 'usa'],
    [/\bunited states\b/g, 'usa'],
    [/\bcote divoire\b/g, 'cote divoire'],
    [/\bivory coast\b/g, 'cote divoire'],
    [/\bmauritani\w*\b/g, 'mauritania'],
  ]
  for (const [re, to] of reps) s = s.replace(re, ` ${to} `)
  // Dedupe repeated words the replacements may introduce (e.g. "burkina faso faso")
  return [...new Set(s.replace(/\s+/g, ' ').trim().split(' '))].join(' ')
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a
    = Math.sin(dLat / 2) ** 2
      + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a))
}

function isValidLatLng(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === 'number'
    && typeof lng === 'number'
    && Number.isFinite(lat)
    && Number.isFinite(lng)
    && Math.abs(lat) <= 90
    && Math.abs(lng) <= 180
  )
}

/** Significant tokens (>= minLen chars, excluding stopwords) used for name matching */
const STOPWORDS = new Set([
  'crew', 'crews', 'earth', 'guardians', 'guardian', 'green', 'eco', 'club', 'group',
  'youth', 'initiative', 'initiatives', 'association', 'community', 'project', 'team', 'teams',
  'network', 'networks', 'alliance', 'foundation', 'agency', 'center', 'centre',
  'action', 'actions', 'climate', 'conservation', 'sustainable', 'sustainability',
  'development', 'developpement', 'environment', 'environmental', 'environnement',
  'empowerment', 'women', 'woman', 'children', 'child', 'kids', 'policy', 'policies',
  'research', 'justice', 'champions', 'champion', 'change', 'global', 'world',
  'international', 'national', 'local', 'rural', 'urban', 'hope', 'future', 'power',
  'forum', 'union', 'federation', 'movement', 'squad', 'squads', 'warriors', 'force',
  'guard', 'guards', 'advocates', 'chapters', 'college', 'school', 'university',
  'lycee', 'main', 'society', 'organisation', 'organization', 'program', 'programme',
  'nature', 'natural', 'ecole', 'ecoles', 'education', 'projet', 'projets',
  'environnementale', 'environnementales', 'ecologique', 'ecological', 'ecologie',
  'energie', 'energy', 'arbre', 'arbres', 'protector', 'protectors',
  'the', 'and', 'for', 'des', 'les', 'las', 'los', 'san', 'new', 'main', 'une', 'pour',
])
function significantTokens(value: string, minLen = 5): string[] {
  return normalizeCrewText(value).split(' ').filter(w => w.length >= minLen && !STOPWORDS.has(w))
}

/**
 * Known countries (canonical form) appearing across the crew + grant datasets.
 * Used for the cross-country veto: a text match is rejected when the crew and
 * the grant demonstrably belong to different countries and coordinates don't
 * confirm closeness.
 */
const KNOWN_COUNTRIES = [
  'papua new guinea', 'central africa republic', 'south korea', 'cote divoire',
  'dr congo', 'burkina faso', 'sierra leone', 'el salvador',
  'usa', 'mexico', 'jamaica', 'haiti', 'brazil', 'ecuador', 'bolivia', 'guatemala',
  'turkey', 'sweden', 'azerbaijan', 'uzbekistan', 'malta', 'botswana', 'burundi',
  'cameroon', 'kenya', 'mauritius', 'malawi', 'morocco', 'nigeria', 'niger', 'rwanda',
  'uganda', 'tanzania', 'zambia', 'zimbabwe', 'benin', 'mali', 'senegal', 'togo',
  'madagascar', 'india', 'indonesia', 'nepal', 'pakistan', 'bangladesh', 'sri lanka',
  'mauritania', 'japan', 'china',
]

/** Countries evidenced by a (canonicalized) grant place string */
function grantCountries(placeCanon: string): string[] {
  const words = new Set(placeCanon.split(' '))
  return KNOWN_COUNTRIES.filter(c => (c.includes(' ') ? placeCanon.includes(c) : words.has(c)))
}

/**
 * Token-vs-word matching (both normalized single words).
 * Exact match, or one side ends with the other (covers agglutinated forms like
 * "N'Gourma" → "ngourma" vs "Gourma"). Both sides must be len >= 5 and prefix
 * matching is deliberately excluded:
 * - "trans" must not match "transformation"/"transformatrices"/"transformar"
 * - "niger" must not match "nigeria", "grove" must not match "mangroves"
 * - "usa" must not match "lusaka", "ecole" must not match "ecoles"
 */
function tokenMatchesWord(token: string, word: string): boolean {
  if (word === token) return true
  if (token.length < 5 || word.length < 5) return false
  return word.endsWith(token) || token.endsWith(word)
}

function anyTokenInWords(tokens: string[], words: Set<string>): boolean {
  for (const token of tokens) {
    for (const word of words) {
      if (tokenMatchesWord(token, word)) return true
    }
  }
  return false
}

/**
 * Short acronym tokens (e.g. "rca", "eliz", "bell") are ambiguous across
 * countries, so they additionally require geographic plausibility: proximity
 * within ACRONYM_MAX_KM, or explicit same-country evidence on both sides.
 * (e.g. "RCA" Bangui must not claim Uganda's "U-RCA CREW" grant, while the
 * Kasese "U-RCA" crew keeps it.)
 */
const ACRONYM_MAX_KM = 400

function acronymPlausible(
  crewCountry: string,
  grantCountryList: string[],
  distanceKm: number | null,
): boolean {
  if (distanceKm !== null && distanceKm <= ACRONYM_MAX_KM) return true
  return crewCountry !== '' && grantCountryList.includes(crewCountry)
}

function crewCoordinates(crew: CrewRegionData | CrewLocation): { lat: number; lng: number } | null {
  const lat = 'lat' in crew ? crew.lat : crew.latitude
  const lng = 'lng' in crew ? crew.lng : crew.longitude
  if (typeof lat !== 'number' || typeof lng !== 'number') return null
  if (!isValidLatLng(lat, lng)) return null
  return { lat, lng }
}

interface CrewTextIndex {
  nameTokens: string[]
  /** Full normalized crew name for exact-phrase matching (only when multiword) */
  fullName: string
  city: string
  country: string
  blob: string
}

/** Minimum length for a full-name phrase to count (avoids trivial collisions) */
const FULL_NAME_MIN_LEN = 10

function indexCrew(crew: CrewRegionData | CrewLocation): CrewTextIndex {
  const isLocation = !('activeCrews' in crew)
  const loc = crew as CrewLocation
  const name = isLocation ? loc.name || '' : (crew as CrewRegionData).region || ''
  const city = isLocation ? loc.city || '' : ''
  const country = isLocation ? loc.country || '' : ''
  const blob = canonicalCountry(normalizeCrewText(`${name} ${city} ${country}`))
  const fullName = normalizeCrewText(name)
  return {
    // Long tokens for word/suffix matching + short acronym tokens (e.g. "U-RCA",
    // "AJDS", "ELIZ") for exact whole-word matching with plausibility checks
    nameTokens: [...significantTokens(name, 5), ...significantTokens(name, 3).filter(t => t.length < 5)],
    fullName: fullName.includes(' ') && fullName.length >= FULL_NAME_MIN_LEN ? fullName : '',
    city: normalizeCrewText(city),
    country: canonicalCountry(normalizeCrewText(country)),
    blob,
  }
}

function matchProject(
  crewIdx: CrewTextIndex,
  crewCoords: { lat: number; lng: number } | null,
  project: ProjectData,
  maxDistanceKm: number,
): CrewGrantMatch | null {
  const grantBlob = canonicalCountry(normalizeCrewText(`${project.country_province} ${project.project_title}`))
  const grantPlace = canonicalCountry(normalizeCrewText(project.country_province))
  const grantWords = new Set(grantBlob.split(' '))
  const placeWords = new Set(grantPlace.split(' '))
  const grantCountryList = grantCountries(grantPlace)

  let distanceKm: number | null = null
  if (crewCoords && isValidLatLng(project.latitude, project.longitude)) {
    distanceKm = haversineKm(crewCoords.lat, crewCoords.lng, project.latitude, project.longitude)
  }
  const crewWords = new Set(crewIdx.blob.split(' '))

  // Cross-country veto: crew and grant demonstrably belong to different
  // countries (e.g. Santa Fe/USA vs Florianopolis/Brazil, Niger vs Nigeria,
  // Savè/Benin vs Odisha/India) and coordinates don't confirm closeness.
  // Proximity (<= maxDistanceKm) always exempts — border metros like
  // Lomé↔Cotonou or Lagos↔Cotonou legitimately share grants.
  const vetoed
    = crewIdx.country !== ''
      && grantCountryList.length > 0
      && !grantCountryList.includes(crewIdx.country)
      && !(distanceKm !== null && distanceKm <= maxDistanceKm)

  // Split name tokens: long tokens match by word/suffix; short acronyms need
  // exact words + geographic plausibility (see acronymPlausible).
  const longTokens = crewIdx.nameTokens.filter(t => t.length >= 5)
  const shortTokens = crewIdx.nameTokens.filter(t => t.length < 5)

  // 1. Crew-name mention in grant place/title (strongest).
  if (!vetoed) {
    // 1a. Exact full-name phrase (e.g. crew "Action Environnement" vs grant
    //     place "Action Environnement" — both words are stopwords, so only a
    //     phrase check can catch it). Still subject to the cross-country veto.
    const placeNorm = normalizeCrewText(project.country_province)
    if (crewIdx.fullName !== '' && grantBlob.includes(crewIdx.fullName)) {
      return { project, distanceKm, reason: 'crew-name' }
    }
    if (placeNorm.includes(' ') && placeNorm.length >= FULL_NAME_MIN_LEN && crewIdx.blob.includes(placeNorm)) {
      return { project, distanceKm, reason: 'crew-name' }
    }
    if (anyTokenInWords(longTokens, grantWords)) {
      return { project, distanceKm, reason: 'crew-name' }
    }
    const shortHit = shortTokens.some(t => grantWords.has(t))
    if (shortHit && acronymPlausible(crewIdx.country, grantCountryList, distanceKm)) {
      return { project, distanceKm, reason: 'crew-name' }
    }
    // Reverse: grant place token mentioned in crew blob (e.g. grant "Aguas da Prata"
    // vs crew "Águas da Prata"; grant "Bolivia" vs crew in Bolivia).
    const placeTokens = significantTokens(project.country_province, 5)
    if (anyTokenInWords(placeTokens, crewWords)) {
      return { project, distanceKm, reason: 'crew-name' }
    }
  }

  // 2. City match (e.g. crew city "Kpalime" vs grant "Kpalime, TOGO").
  //    Exact words always count ("Lome"); affix forms need len >= 5.
  if (!vetoed && crewIdx.city && crewIdx.city.length >= 3) {
    const cityWords = crewIdx.city.split(' ').filter(w => w.length >= 3)
    if (placeWords.has(crewIdx.city) || cityWords.some(w => grantWords.has(w) || [...grantWords].some(gw => tokenMatchesWord(w, gw)))) {
      return { project, distanceKm, reason: 'city' }
    }
  }

  // 3. Country match (canonicalized, handles Cameroun/Cameroon, DRC variants, etc.)
  //    Multiword countries match as phrases; single-word countries as whole words
  //    ("usa" must not match "lusaka", "niger" must not match "nigeria").
  if (crewIdx.country && crewIdx.country.length >= 3) {
    const hit = crewIdx.country.includes(' ')
      ? grantPlace.includes(crewIdx.country)
      : placeWords.has(crewIdx.country)
    if (hit && !vetoed) {
      // Prefer 'nearby' when coordinates confirm closeness
      if (distanceKm !== null && distanceKm <= maxDistanceKm) return { project, distanceKm, reason: 'nearby' }
      return { project, distanceKm, reason: 'country' }
    }
  }

  // 4. Pure proximity fallback for grants whose place string carries no recognizable
  //    geography (e.g. "Reseau des Amis de la Nature", "ONG FABA", "RUDIWA")
  if (distanceKm !== null && distanceKm <= maxDistanceKm) {
    return { project, distanceKm, reason: 'nearby' }
  }

  return null
}

const REASON_RANK: Record<CrewGrantMatchReason, number> = {
  'crew-name': 0,
  city: 1,
  nearby: 2,
  country: 3,
}

/* ── stable keys (shared with the precomputed map) ─────────────────────── */

function round4(n: number): number {
  return Math.round(n * 10000) / 10000
}

/** Stable key for a crew location — content-based, immune to JSON reordering */
export function crewLocationKey(loc: Pick<CrewLocation, 'name' | 'lat' | 'lng'>): string {
  return `loc|${normalizeCrewText(loc.name)}|${round4(loc.lat)}|${round4(loc.lng)}`
}

/** Stable key for a crew region (aggregate popup) */
export function crewRegionKey(region: Pick<CrewRegionData, 'id'>): string {
  return `region|${region.id}`
}

/** Stable key for a project grant — used to intersect the static map with (filtered) projects */
export function projectGrantKey(p: Pick<ProjectData, 'project_title' | 'latitude' | 'longitude'>): string {
  return `${p.project_title}__${p.latitude}__${p.longitude}`
}

/** Prefer stronger reason, then shorter distance (used by the region union) */
function isBetterMatch(a: CrewGrantMatch, b: CrewGrantMatch): boolean {
  const rank = REASON_RANK[a.reason] - REASON_RANK[b.reason]
  if (rank !== 0) return rank < 0
  const ad = a.distanceKm ?? Number.POSITIVE_INFINITY
  const bd = b.distanceKm ?? Number.POSITIVE_INFINITY
  return ad < bd
}

function sortMatches(matches: CrewGrantMatch[]): CrewGrantMatch[] {  return matches.sort((a, b) => {
    const rank = REASON_RANK[a.reason] - REASON_RANK[b.reason]
    if (rank !== 0) return rank
    if (a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm
    if (a.distanceKm !== null) return -1
    if (b.distanceKm !== null) return 1
    return a.project.project_title.localeCompare(b.project.project_title)
  })
}

/**
 * Find project grants related to a single crew location (or region centroid).
 * Matches by crew-name mention, city, canonicalized country, then coordinate proximity.
 */
export function findGrantsForCrewLocation(
  crew: CrewRegionData | CrewLocation,
  projects: ProjectData[],
  maxDistanceKm = CREW_GRANT_MAX_DISTANCE_KM,
): CrewGrantMatch[] {
  if (!crew || !projects?.length) return []
  const idx = indexCrew(crew)
  const coords = crewCoordinates(crew)
  const out: CrewGrantMatch[] = []
  for (const project of projects) {
    const m = matchProject(idx, coords, project, maxDistanceKm)
    if (m) out.push(m)
  }
  return sortMatches(out)
}

/**
 * Find project grants related to a crew *region* (aggregate popup).
 * Unions matches from every crew location in the region, plus region-centroid
 * proximity as a fallback when no locations are provided.
 */
export function findGrantsForRegion(
  region: CrewRegionData,
  projects: ProjectData[],
  locations: CrewLocation[] = [],
  maxDistanceKm = CREW_GRANT_MAX_DISTANCE_KM,
): CrewGrantMatch[] {
  if (!region || !projects?.length) return []
  const seen = new Map<string, CrewGrantMatch>()
  const regionName = normalizeCrewText(region.region)

  const inRegion = locations.filter(
    l => normalizeCrewText(l.region) === regionName || normalizeCrewText(l.region).includes(regionName) || regionName.includes(normalizeCrewText(l.region)),
  )

  // Union of per-location matches (dedupe by grant key, keeping the BEST match:
  // strongest reason first, then shortest distance — so the stored distance is
  // the closest crew's, which the <10 km on-site highlight relies on)
  for (const loc of inRegion) {
    for (const m of findGrantsForCrewLocation(loc, projects, maxDistanceKm)) {
      const key = projectGrantKey(m.project)
      const prev = seen.get(key)
      if (!prev || isBetterMatch(m, prev)) seen.set(key, m)
    }
  }

  // Fallback: region centroid proximity when no locations matched (e.g. locations
  // JSON failed to load but static region data exists)
  if (seen.size === 0 && isValidLatLng(region.latitude, region.longitude)) {
    const idx = indexCrew(region)
    const coords = { lat: region.latitude, lng: region.longitude }
    // Wider radius at region level — centroid is coarse
    for (const project of projects) {
      const m = matchProject(idx, coords, project, Math.max(maxDistanceKm, 800))
      if (m) {
        const key = projectGrantKey(m.project)
        if (!seen.has(key)) seen.set(key, m)
      }
    }
  }

  return sortMatches([...seen.values()])
}
