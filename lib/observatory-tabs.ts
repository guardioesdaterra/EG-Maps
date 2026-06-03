export interface ObservatoryTab {
  key: 'danger' | 'military' | 'illegal' | 'env' | 'network' | 'timeline'
  labelKey: string
  icon: string
}

export const OBSERVATORY_TABS: ObservatoryTab[] = [
  { key: 'danger', labelKey: 'observatory.tabs.danger', icon: '⚠' },
  { key: 'military', labelKey: 'observatory.tabs.military', icon: '🪖' },
  { key: 'illegal', labelKey: 'observatory.tabs.illegal', icon: '⛔' },
  { key: 'env', labelKey: 'observatory.tabs.env', icon: '🌊' },
  { key: 'network', labelKey: 'observatory.tabs.network', icon: '🔗' },
  { key: 'timeline', labelKey: 'observatory.tabs.timeline', icon: '📈' },
]

export interface MilitaryAsset {
  flag: string
  name: string
  country: string
  kgPerUnit: number | null
  description: string
}

export const MILITARY_ASSETS: MilitaryAsset[] = [
  { flag: '🇺🇸', name: 'F-35 Lightning II', country: 'United States', kgPerUnit: 417, description: '417 kg REE per aircraft. 3,000+ units planned. Nd, Dy, Sm for magnets & guidance.' },
  { flag: '🇺🇸', name: 'Virginia-class Submarine', country: 'United States', kgPerUnit: 4175, description: '4,175 kg REE per sub. Sonar, propulsion, radar, electronic warfare systems.' },
  { flag: '🇺🇸', name: 'Arleigh Burke Destroyer', country: 'United States', kgPerUnit: 2358, description: '2,358 kg REE per ship. AEGIS combat system, SPY radar, EW suite.' },
]

export interface InvestmentFlow {
  from: string
  to: string
  amount: string
  year: number
}

export const US_INVESTMENTS: InvestmentFlow[] = [
  { from: 'Pentagon', to: 'MP Materials', amount: '$400M equity', year: 2020 },
  { from: 'Pentagon', to: 'Lynas', amount: '$120M+', year: 2020 },
  { from: 'Pentagon', to: 'Strategic Stockpile', amount: '$12B', year: 2021 },
  { from: 'US DFC', to: 'Serra Verde', amount: '$565M', year: 2023 },
  { from: 'US DFC', to: 'USA Rare Earth', amount: '$2.8B acquisition', year: 2024 },
  { from: 'State Dept', to: 'Aclara Carina (GO)', amount: '$5M', year: 2025 },
  { from: 'Export Finance Australia', to: 'Viridis / Meteoric', amount: '$100M+', year: 2026 },
  { from: 'Ucore', to: 'Caldeira MREC → US oxide', amount: 'MOU', year: 2025 },
]

export interface IllegalPattern {
  titleKey: string
  descKey: string
  color: string
  examples: { key: string }[]
}

export const ILLEGAL_PATTERNS: IllegalPattern[] = [
  {
    titleKey: 'observatory.illegal.landSpec',
    descKey: 'observatory.illegal.landSpecDesc',
    color: '#8e44ad',
    examples: [
      { key: 'observatory.illegal.landSpecEx1' },
      { key: 'observatory.illegal.landSpecEx2' },
      { key: 'observatory.illegal.landSpecEx3' },
    ],
  },
  {
    titleKey: 'observatory.illegal.rejeito',
    descKey: 'observatory.illegal.rejeitoDesc',
    color: '#8e44ad',
    examples: [
      { key: 'observatory.illegal.rejeitoEx1' },
      { key: 'observatory.illegal.rejeitoEx2' },
      { key: 'observatory.illegal.rejeitoEx3' },
    ],
  },
  {
    titleKey: 'observatory.illegal.secrecy',
    descKey: 'observatory.illegal.secrecyDesc',
    color: '#8e44ad',
    examples: [
      { key: 'observatory.illegal.secrecyEx1' },
      { key: 'observatory.illegal.secrecyEx2' },
      { key: 'observatory.illegal.secrecyEx3' },
    ],
  },
  {
    titleKey: 'observatory.illegal.foreign',
    descKey: 'observatory.illegal.foreignDesc',
    color: '#2980b9',
    examples: [
      { key: 'observatory.illegal.foreignEx1' },
      { key: 'observatory.illegal.foreignEx2' },
      { key: 'observatory.illegal.foreignEx3' },
      { key: 'observatory.illegal.foreignEx4' },
    ],
  },
  {
    titleKey: 'observatory.illegal.exclusion',
    descKey: 'observatory.illegal.exclusionDesc',
    color: '#8e44ad',
    examples: [
      { key: 'observatory.illegal.exclusionEx1' },
      { key: 'observatory.illegal.exclusionEx2' },
      { key: 'observatory.illegal.exclusionEx3' },
    ],
  },
  {
    titleKey: 'observatory.illegal.water',
    descKey: 'observatory.illegal.waterDesc',
    color: '#2980b9',
    examples: [
      { key: 'observatory.illegal.waterEx1' },
      { key: 'observatory.illegal.waterEx2' },
      { key: 'observatory.illegal.waterEx3' },
    ],
  },
]

export interface EnvRegion {
  regionKey: string
  regionLabel: string
  danger: number
  companies: string[]
  risks: string[]
  coord: [number, number] | null
}

export const ENV_REGIONS: EnvRegion[] = [
  {
    regionKey: 'pocosDeCaldas',
    regionLabel: 'Poços de Caldas / Caldas MG',
    danger: 9.5,
    companies: ['Viridis', 'Meteoric', 'Axel REE'],
    risks: [
      'Water rationing 2024',
      'Viridis plans to use ALL 4 city reservoirs',
      '20,000+ tons INB radioactive waste on site',
      'IAC method uses ammonium sulfate → soil acidification & groundwater contamination',
    ],
    coord: [-46.57, -21.55],
  },
  {
    regionKey: 'minacu',
    regionLabel: 'Minaçu GO (Serra Verde)',
    danger: 9,
    companies: ['Serra Verde / USA Rare Earth'],
    risks: [
      'R$12.5M fine recommended for stream impact',
      'Cerrado deforestation at headwaters',
      '60 years of asbestos mining → mining dependency',
    ],
    coord: [-48.1, -14.25],
  },
  {
    regionKey: 'bambui',
    regionLabel: 'Aquífero Bambuí (MG/GO)',
    danger: 9,
    companies: ['Axel REE', 'Aclara', 'Various'],
    risks: [
      'Major REE projects over the aquifer',
      'Contamination already detected at monitoring points',
      'IAC mining uses ammonium sulfate leaching → direct aquifer risk',
    ],
    coord: [-47, -17.5],
  },
  {
    regionKey: 'araxa',
    regionLabel: 'Araxá MG',
    danger: 8.5,
    companies: ['CBMM', 'St George Mining', 'Mars GMN'],
    risks: [
      '36+ years of barium contamination (>5mg/L) in groundwater',
      'Radioactive waste used in construction',
    ],
    coord: [-46.94, -19.59],
  },
  {
    regionKey: 'jequie',
    regionLabel: 'Jequié BA',
    danger: 7.5,
    companies: ['Palmares/Magnum', 'Mars GMN', 'Foxfire', 'EDEM'],
    risks: [
      'Carbonatite corridor with IAC-REE clays',
      'Multiple ASX companies with overlapping claims',
    ],
    coord: [-40.48, -13.85],
  },
  {
    regionKey: 'piracanjuba',
    regionLabel: 'Piracanjuba GO (Aclara)',
    danger: 7,
    companies: ['Aclara Resources'],
    risks: [
      'Carina project: $600M over Bambuí Aquifer',
      '"Circular Mineral Harvesting" method unproven at scale',
    ],
    coord: [-49.1, -16.7],
  },
]

export interface NetworkNote {
  titleKey: string
  bodyKey: string
  color: string
}

export const NETWORK_NOTES: NetworkNote[] = [
  {
    titleKey: 'observatory.network.foxfireTitle',
    bodyKey: 'observatory.network.foxfireBody',
    color: '#e74c3c',
  },
  {
    titleKey: 'observatory.network.australianTitle',
    bodyKey: 'observatory.network.australianBody',
    color: '#2980b9',
  },
  {
    titleKey: 'observatory.network.usMilitaryTitle',
    bodyKey: 'observatory.network.usMilitaryBody',
    color: '#e74c3c',
  },
  {
    titleKey: 'observatory.network.cbmmTitle',
    bodyKey: 'observatory.network.cbmmBody',
    color: '#8e44ad',
  },
]

export interface TimelineHighlight {
  year: number
  count: number
  event: string
}

export const TIMELINE_HIGHLIGHTS: TimelineHighlight[] = [
  { year: 2000, count: 53, event: '' },
  { year: 2005, count: 60, event: '' },
  { year: 2010, count: 551, event: 'China bans REE exports to Japan — warning signal' },
  { year: 2015, count: 510, event: '' },
  { year: 2017, count: 566, event: 'EO 13817 — US declares REE "critical mineral"' },
  { year: 2018, count: 662, event: '' },
  { year: 2019, count: 648, event: 'China threatens REE ban on US; Pentagon starts investing' },
  { year: 2020, count: 682, event: '' },
  { year: 2021, count: 860, event: 'REE supercycle; Brazil rush begins' },
  { year: 2022, count: 1505, event: 'Lithium rush; ASX companies invade Brazil (+75% YoY)' },
  { year: 2023, count: 4213, event: 'VIRAL: 4,213 claims — 4.9x 2020 level. DFC funds Serra Verde' },
  { year: 2024, count: 2795, event: 'MPF vs licensing; Operação Rejeito arrests ANM Director' },
  { year: 2025, count: 1370, event: 'China bans 7 REE elements; DFC $565M; State Dept funds Aclara' },
  { year: 2026, count: 581, event: 'Ongoing investigation — current year' },
]
