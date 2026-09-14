/**
 * lib/territory-dossier.ts
 * @why Evidence dossier builder — turns the observatory's live data into a
 *      portable markdown brief communities can take to the MPF, public
 *      hearings, press or the ANM: claims, overlaps, waters, holders,
 *      foreign/military footprint and sources. Pure string building (fully
 *      unit-tested); the DOM download/clipboard helpers are isolated for the
 *      browser-only call sites.
 * @functions buildDossierMarkdown, downloadTextFile, copyTextToClipboard
 * @interfaces DossierInput
 * @connections components/observatory/tabs/TerritoryTab.vue
 */

export interface DossierInput {
  regionLabel: string
  generatedAt: string
  dataSource: string
  syncLabel?: string
  claims: number
  boundaries: number
  totalAreaHa: number
  categories: Array<{ label: string; count: number }>
  overlapClaims: number
  overlapLinks: number
  topTerritories: Array<{ name: string; kind: string; claims: number }>
  protectedTi: Array<{ name: string; municipality: string; area_ha: number; population: number }>
  protectedQuilombos: Array<{ name: string; municipality: string; area_ha: number; population: number }>
  watersAssessed: number
  watersUnderPressure: number
  topWaters: Array<{ name: string; water_type: string; claimsPressure: number; claimsWatch: number; nearestLabel: string }>
  holders: Array<{ name: string; score: number; claims: number; area_ha: number; flags: string[]; subs: string[] }>
  foreign: Array<{ key: string; claims: number; pct: number }>
  military: { total_claims: number; total_area_ha: number; us_connected_claims: number } | null
  sigilo: { total: number; pct: number; total_area_ha: number } | null
}

function fmtHa(ha: number): string {
  if (ha >= 1_000_000) return `${(ha / 1_000_000).toFixed(1)}M ha`
  if (ha >= 1000) return `${Math.round(ha / 1000)}K ha`
  return `${Math.round(ha)} ha`
}

function kindLabel(kind: string): string {
  const k = kind.toLowerCase()
  if (k === 'ti' || k.includes('indigen')) return 'Terra Indígena'
  if (k === 'quilombo' || k.includes('quilomb')) return 'Quilombo'
  return kind
}

export function buildDossierMarkdown(d: DossierInput): string {
  const L: string[] = []
  L.push(`# Evidence dossier — ${d.regionLabel}`)
  L.push('')
  L.push(`Generated ${d.generatedAt}${d.syncLabel ? ` · ANM sync ${d.syncLabel}` : ''} · Source: ${d.dataSource}`)
  L.push('')
  L.push('> Public mining records read together with water, protected territories and cultural life.')
  L.push('> A claim is a public record, not a verdict — verify each process on the ANM SIGMINE before citing.')
  L.push('')
  L.push('## 1. Claims on the ground')
  L.push('')
  L.push(`- Mining claims: **${d.claims.toLocaleString()}**`)
  L.push(`- Claim boundaries mapped: **${d.boundaries.toLocaleString()}**`)
  L.push(`- Total claimed area: **${fmtHa(d.totalAreaHa)}**`)
  if (d.categories.length) {
    L.push(`- By substance: ${d.categories.map(c => `${c.label} (${c.count})`).join('; ')}`)
  }
  L.push('')
  L.push('## 2. Mining × territory overlaps (FPIC watch)')
  L.push('')
  L.push(`- Claims touching protected territories: **${d.overlapClaims}** (${d.overlapLinks} overlap links)`)
  L.push('- Mining inside or beside TI/quilombo land without Free, Prior and Informed Consent violates ILO Convention 169.')
  for (const t of d.topTerritories.slice(0, 15)) {
    L.push(`- ${kindLabel(t.kind)} **${t.name}** — ${t.claims} overlapping claims`)
  }
  L.push('')
  L.push('## 3. Protected territories in the dataset')
  L.push('')
  for (const a of d.protectedTi) {
    L.push(`- TI **${a.name}**${a.municipality ? ` (${a.municipality})` : ''}${a.area_ha ? ` — ${fmtHa(a.area_ha)}` : ''}${a.population ? ` — pop. ${a.population}` : ''}`)
  }
  for (const a of d.protectedQuilombos) {
    L.push(`- Quilombo **${a.name}**${a.municipality ? ` (${a.municipality})` : ''}${a.area_ha ? ` — ${fmtHa(a.area_ha)}` : ''}${a.population ? ` — pop. ${a.population}` : ''}`)
  }
  if (!d.protectedTi.length && !d.protectedQuilombos.length) L.push('- None in the loaded dataset.')
  L.push('')
  L.push('## 4. Waters under pressure')
  L.push('')
  L.push(`- Named waters assessed: **${d.watersAssessed}** · under direct pressure (claims ≤2km): **${d.watersUnderPressure}**`)
  L.push('- Ionic-adsorption (IAC) rare-earth mining uses ammonium-sulfate leaching: soil acidification + groundwater contamination risk; open pits draw down local water tables.')
  for (const w of d.topWaters.slice(0, 12)) {
    L.push(`- **${w.name}** (${w.water_type}) — ${w.claimsPressure} claims ≤2km, ${w.claimsWatch} ≤5km${w.nearestLabel ? ` · nearest ${w.nearestLabel}` : ''}`)
  }
  L.push('')
  L.push('## 5. Who holds the claims')
  L.push('')
  for (const h of d.holders.slice(0, 10)) {
    L.push(`- **${h.name}** — score ${h.score}, ${h.claims} claims, ${fmtHa(h.area_ha)}${h.subs.length ? ` · ${h.subs.slice(0, 4).join(', ')}` : ''}${h.flags.length ? ` · flags: ${h.flags.join(', ')}` : ''}`)
  }
  if (!d.holders.length) L.push('- No holder ranking available.')
  L.push('')
  L.push('## 6. Foreign and military footprint')
  L.push('')
  if (d.foreign.length) {
    for (const f of d.foreign) L.push(`- ${f.key}: ${f.claims.toLocaleString()} claims (${f.pct}%)`)
  } else {
    L.push('- No foreign-capital breakdown available.')
  }
  if (d.military) {
    L.push(`- Military-critical claims: ${d.military.total_claims.toLocaleString()} (${fmtHa(d.military.total_area_ha)}), of which ${d.military.us_connected_claims.toLocaleString()} US-connected.`)
  }
  if (d.sigilo) {
    L.push(`- Secrecy (sigilo): ${d.sigilo.total} claims (${d.sigilo.pct}%) covering ${fmtHa(d.sigilo.total_area_ha)} — hidden holders and substances.`)
  }
  L.push('')
  L.push('## 7. What to do with this')
  L.push('')
  L.push('1. Take it to the Ministério Público (MPF/MPE), Defensoria Pública or a public hearing as a starting brief.')
  L.push('2. Verify each process number on ANM SIGMINE (https://app.anm.gov.br/SIGMINE) before formal citation.')
  L.push('3. Cross-check overlaps on the ground with the affected TI/quilombo/rural community — only they confirm FPIC status.')
  L.push('4. Document water changes (rationing, turbidity, level drops) with dated photos via the observatory Field Monitor.')
  L.push('')
  L.push('---')
  L.push('*Earth Guardians Vulcan Observatory — community intelligence, not legal counsel.*')
  L.push('')
  return L.join('\n')
}

/** Browser-only: trigger a download of a text file. Returns false outside DOM. */
export function downloadTextFile(filename: string, text: string): boolean {
  try {
    if (typeof document === 'undefined' || typeof URL === 'undefined') return false
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    return true
  } catch { return false }
}

/** Browser-only: copy text to clipboard, with textarea fallback. */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch { /* fall through */ }
  try {
    if (typeof document === 'undefined') return false
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  } catch { return false }
}
