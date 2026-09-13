/**
 * tests/crew-grants.test.ts
 * @why Unit tests for crew ↔ project-grant matching — guards the active-crews popup grant section
 * @deps vitest (describe, it, expect); ../lib/crew-grants; ../lib/project-data (allProjectsData)
 */
import { describe, it, expect } from 'vitest'
import {
  findGrantsForCrewLocation,
  findGrantsForRegion,
  normalizeCrewText,
  haversineKm,
} from '../lib/crew-grants'
import { allProjectsData } from '../lib/project-data'
import { allCrewRegionsData, type CrewLocation } from '../lib/crew-data'

function loc(partial: Partial<CrewLocation>): CrewLocation {
  return {
    name: '', country: '', city: '', state: '', region: '',
    status: 'active', lat: 0, lng: 0, ...partial,
  }
}

describe('normalizeCrewText', () => {
  it('strips accents and lowercases', () => {
    expect(normalizeCrewText('Águas da Prata')).toBe('aguas da prata')
    expect(normalizeCrewText('Abomey-Calavi')).toBe('abomey calavi')
  })
})

describe('haversineKm', () => {
  it('returns ~0 for same point', () => {
    expect(haversineKm(0, 0, 0, 0)).toBeCloseTo(0, 1)
  })
})

describe('findGrantsForCrewLocation', () => {
  it('matches Bell crew to Bell School Chicago grant', () => {
    const matches = findGrantsForCrewLocation(
      loc({ name: 'Bell Windy City "Legacy Crew"', city: 'Chicago', country: 'USA', lat: 41.87, lng: -87.62 }),
      allProjectsData,
    )
    expect(matches.map(m => m.project.project_title)).toContain(
      'Make a Change with Sustainable Initiatives @ Bell School',
    )
  })

  it('matches Aguas da Prata crew to Meliponary grant', () => {
    const matches = findGrantsForCrewLocation(
      loc({ name: 'Águas da Prata', city: 'Águas da Prata', country: 'Brazil', lat: -21.94, lng: -46.71 }),
      allProjectsData,
    )
    expect(matches.some(m => m.project.project_title.includes('Meliponary'))).toBe(true)
  })

  it('matches acronym crew U-RCA to U-RCA CREW grant', () => {
    const matches = findGrantsForCrewLocation(
      loc({ name: 'U-RCA (Uganda-Rwenzori Climate Action)', city: 'Kasese', country: 'Uganda', lat: 0.18, lng: 30.08 }),
      allProjectsData,
    )
    expect(matches.some(m => m.project.project_title.includes('charcoal briquettes'))).toBe(true)
  })

  it('matches Bamenda crew to Bamenda grant', () => {
    const matches = findGrantsForCrewLocation(
      loc({ name: 'Bamenda', city: 'Bamenda', country: 'Cameroun', lat: 5.96, lng: 10.15 }),
      allProjectsData,
    )
    expect(matches.some(m => m.project.project_title.includes('Bamenda'))).toBe(true)
  })

  it('does not match African crews to distant non-African grants', () => {
    const matches = findGrantsForCrewLocation(
      loc({ name: 'CJFAT (Climate Justice For All in Togo)', city: 'LOME', country: 'Togo', lat: 6.13, lng: 1.22 }),
      allProjectsData,
    )
    const titles = matches.map(m => m.project.project_title)
    expect(titles).not.toContain('Climate Courage: Collective Mental Health Support')
    expect(titles).not.toContain('Make a Change with Sustainable Initiatives @ Bell School')
    // ...but still finds its own grant
    expect(titles).toContain('Climate Justice for All in Togo (CJFAT)')
  })

  it('does not match USA crews to Zambia LUBWA grant ("usa" vs "lusaka")', () => {
    const matches = findGrantsForCrewLocation(
      loc({ name: 'Manhattan, NY', city: 'New York', country: 'USA', lat: 40.78, lng: -73.97 }),
      allProjectsData,
    )
    const titles = matches.map(m => m.project.project_title)
    expect(titles).not.toContain('LUBWA Health Center Cleaning and Donation Project')
    expect(titles).toContain('Climate Courage: Collective Mental Health Support')
  })

  it('does not match Maple Grove to Sierra Leone ("grove" vs "mangroves")', () => {
    const matches = findGrantsForCrewLocation(
      loc({ name: 'Maple Grove', city: 'Maple Grove', country: 'USA', lat: 45.08, lng: -93.45 }),
      allProjectsData,
    )
    expect(matches.some(m => m.project.country_province === 'Sierra Leone')).toBe(false)
  })

  it('does not match Santa Fe USA to Florianopolis Brazil (shared "santa")', () => {
    const matches = findGrantsForCrewLocation(
      loc({ name: 'Santa Fe', city: 'Santa Fe', country: 'USA', lat: 35.69, lng: -105.94 }),
      allProjectsData,
    )
    expect(matches.some(m => m.project.country_province.includes('Florianopolis'))).toBe(false)
  })

  it('does not match Niger crew to Nigeria grants ("niger" vs "nigeria")', () => {
    const matches = findGrantsForCrewLocation(
      loc({ name: 'Niger', city: 'Niamey', country: 'Niger', lat: 13.51, lng: 2.11 }),
      allProjectsData,
    )
    expect(matches).toEqual([])
  })

  it('does not match Beijing crew to Kenya/Goma grants via generic "nature"', () => {
    const matches = findGrantsForCrewLocation(
      loc({ name: 'Nature Corner', city: 'Beijing', country: 'China', lat: 39.91, lng: 116.39 }),
      allProjectsData,
    )
    expect(matches).toEqual([])
  })

  it('does not match Bangui "RCA" crew to Uganda "U-RCA CREW" grant', () => {
    const matches = findGrantsForCrewLocation(
      loc({ name: 'RCA', city: 'Bangui', country: 'Central Africa Republic', lat: 4.36, lng: 18.58 }),
      allProjectsData,
    )
    expect(matches.some(m => m.project.country_province === 'U-RCA CREW')).toBe(false)
  })

  it('does not match Benin Save crew to Odisha "Save Marine" grant', () => {
    const matches = findGrantsForCrewLocation(
      loc({ name: 'Savè', city: 'Savè', country: 'Benin', lat: 7.99, lng: 2.54 }),
      allProjectsData,
    )
    expect(matches.some(m => m.project.country_province === 'Odisha, India')).toBe(false)
    // ...but keeps genuine Benin grants
    expect(matches.some(m => m.project.country_province === 'Cotonou, Benin')).toBe(true)
  })

  it('does not match Togo EcoChange crew to Kigali EcoChange grant', () => {
    const matches = findGrantsForCrewLocation(
      loc({ name: 'EcoChange', city: 'LOME', country: 'Togo', lat: 6.13, lng: 1.22 }),
      allProjectsData,
    )
    expect(matches.some(m => m.project.country_province === 'Kigali, Rwanda')).toBe(false)
    expect(matches.some(m => m.project.project_title.includes('CJFAT'))).toBe(true)
  })

  it('does not match Uvira crew to Mali grant via "arbre"', () => {
    const matches = findGrantsForCrewLocation(
      loc({ name: 'Arbre de Vie', city: 'Uvira', country: 'DR Congo', lat: -3.41, lng: 29.14 }),
      allProjectsData,
    )
    expect(matches.some(m => m.project.country_province === 'Mali')).toBe(false)
    expect(matches.some(m => m.project.country_province === 'Sud-Kivu, DRC')).toBe(true)
  })

  it('does not match Trans_Eco Burundi to Togo/FOIN grants via "trans"', () => {
    const matches = findGrantsForCrewLocation(
      loc({ name: 'Trans_Eco', city: 'Cibitoke', country: 'Burundi', lat: -2.85, lng: 29.26 }),
      allProjectsData,
    )
    const titles = matches.map(m => m.project.project_title)
    expect(titles).not.toContain('CHARCOAL WASTE TRANSFORMATION')
    expect(matches.some(m => m.project.country_province === 'BURUNDI, MWARO')).toBe(true)
  })

  it('does not match Tanzania crew to Nigeria grant via "planet"', () => {
    const matches = findGrantsForCrewLocation(
      loc({ name: 'Blue Planet Protectors', city: 'Nyamagana', country: 'Tanzania', lat: -2.58, lng: 32.95 }),
      allProjectsData,
    )
    expect(matches).toEqual([])
  })

  it('keeps Gourma suffix match for E-DEV crew (Fada N’Gourma)', () => {
    const matches = findGrantsForCrewLocation(
      loc({ name: 'E-DEV (Éduquer pour Développer)', city: 'Fada N’Gourma', country: 'BURKINA FASO', lat: 12.06, lng: 0.36 }),
      allProjectsData,
    )
    expect(matches.some(m => m.project.country_province === 'Burkina Faso, province du Gourma')).toBe(true)
  })

  it('keeps Mauritania alias match (Lexème ↔ Mauritanie grant)', () => {
    const matches = findGrantsForCrewLocation(
      loc({ name: 'Lexème', city: 'Nouakchott', country: 'Mauritania', lat: 18.08, lng: -15.98 }),
      allProjectsData,
    )
    expect(matches.some(m => m.project.country_province === 'Mauritanie')).toBe(true)
  })

  it('matches Action Environnement crew to its namesake grant (full-name phrase)', () => {
    const matches = findGrantsForCrewLocation(
      loc({ name: 'Action Environnement', city: 'LOME', country: 'Togo', lat: 6.13, lng: 1.22 }),
      allProjectsData,
    )
    expect(matches.some(m => m.project.country_province === 'Action Environnement')).toBe(true)
  })

  it('returns empty for missing data', () => {
    expect(findGrantsForCrewLocation(loc({}), [])).toEqual([])
  })
})

describe('findGrantsForRegion', () => {
  it('unions location matches for Africa', () => {
    const africa = allCrewRegionsData.find(r => r.id === 'africa')!
    const matches = findGrantsForRegion(africa, allProjectsData, [
      loc({ name: 'Bamenda', city: 'Bamenda', country: 'Cameroun', region: 'Africa', lat: 5.96, lng: 10.15 }),
      loc({ name: 'Benin (main crew)', city: 'Cotonou', country: 'Benin', region: 'Africa', lat: 6.37, lng: 2.43 }),
    ])
    const titles = matches.map(m => m.project.project_title)
    expect(titles).toContain('IAA Earth Guardian Champions Bamenda')
    expect(titles).toContain('JARDIN EARTH GUARDIANS')
  })

  it('excludes non-African grants from Africa region', () => {
    const africa = allCrewRegionsData.find(r => r.id === 'africa')!
    const matches = findGrantsForRegion(africa, allProjectsData, [
      loc({ name: 'Bamenda', city: 'Bamenda', country: 'Cameroun', region: 'Africa', lat: 5.96, lng: 10.15 }),
    ])
    const titles = matches.map(m => m.project.project_title)
    expect(titles).not.toContain('Empowering youth and kids in environmental action')
  })
})
