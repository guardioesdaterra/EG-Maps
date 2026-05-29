export interface TimelineEvent {
  year: number
  type: 'geopolitical' | 'enterprise' | 'regulation' | 'military' | 'environmental'
  title: string
  description: string
  color: string
  icon: string
  significance: 'critical' | 'high' | 'medium' | 'low'
}

export interface PhaseTimeline {
  phase: 'REQUERIMENTO' | 'DISPONIBILIDADE' | 'CONCESSÃO' | 'APROVEITAMENTO' | 'LICENCIAMENTO'
  label: string
  color: string
  description: string
  avgDurationYears: number
  riskLevel: 'high' | 'medium' | 'low'
}

export const GEOPOLITICAL_TIMELINE: TimelineEvent[] = [
  {
    year: 2010,
    type: 'geopolitical',
    title: 'China bans REE exports to Japan',
    description: 'After Senkaku Islands dispute, China halts rare earth shipments to Japan. Global prices spike 10x. The world realizes its total dependence on Chinese REE supply. Japan files WTO complaint — China wins on technicality.',
    color: '#e74c3c',
    icon: '🇨🇳',
    significance: 'critical',
  },
  {
    year: 2011,
    type: 'geopolitical',
    title: 'REE prices crash — China floods market',
    description: 'After the 2010 crisis, China strategically lowers prices to below cost of production, destroying all non-Chinese REE mining competitors (Molycorp (USA), Lynas (AUS) nearly bankrupt). Chinese strategy: "control supply, destroy competition, own the future." Molycorp files Chapter 11 in 2015.',
    color: '#f39c12',
    icon: '📉',
    significance: 'high',
  },
  {
    year: 2017,
    type: 'military',
    title: 'EO 13817 — "Critical Mineral" declaration',
    description: 'Trump Executive Order declares rare earths "critical to US economic and national security." Pentagon begins strategic stockpile review. The US realizes 100% of its REE processing is controlled by China.',
    color: '#c0392b',
    icon: '🇺🇸',
    significance: 'critical',
  },
  {
    year: 2019,
    type: 'geopolitical',
    title: 'China threatens REE ban on US',
    description: 'During trade war escalation, Xi Jinping visits Jiangxi REE hub — "South Korea, Japan, US all need our rare earths." China drafts law to use REE as geopolitical weapon. Pentagon starts investing in domestic REE supply chain.',
    color: '#e74c3c',
    icon: '☢️',
    significance: 'critical',
  },
  {
    year: 2020,
    type: 'enterprise',
    title: 'Australian REE rush into Brazil begins',
    description: 'With US defense needs and Chinese export control threats, ASX-listed explorers flood into Minas Gerais, Brazil. Viridis, Meteoric, Foxfire, and Axel all acquire claims in Poços de Caldas — the world\'s largest ionic clay REE deposit outside China. Brazil becomes the new frontier.',
    color: '#2980b9',
    icon: '🇦🇺',
    significance: 'critical',
  },
  {
    year: 2021,
    type: 'enterprise',
    title: 'Aclara Resources founded — Chilean REE play',
    description: 'Hochschild Group (billion-dollar mining family) spins off Aclara Resources (TSX:ARA). Company targets ionic clay deposits in Chile and Brazil. Circular Mineral Harvesting™ patented — low environmental impact narrative for regulatory approval.',
    color: '#27ae60',
    icon: '🏗️',
    significance: 'high',
  },
  {
    year: 2022,
    type: 'regulation',
    title: 'Brazil REE claims explode — +75% YoY',
    description: '4,213 claims in 2023 vs 682 in 2020. The Brazilian National Mining Agency (ANM) is overwhelmed. Most claims filed as "Pesquisa" (research) — lowest regulatory bar. No environmental impact assessment required for research phase. Regulatory capture begins.',
    color: '#8e44ad',
    icon: '📋',
    significance: 'high',
  },
  {
    year: 2023,
    type: 'enterprise',
    title: 'US DFC funds Serra Verde — $565M',
    description: 'US International Development Finance Corporation (DFC) commits $565M to Serra Verde REE Project in Goiás, Brazil. This is the largest US government investment in South American mining. Serra Verde sold to USA Rare Earth in 2024 for $2.8B.',
    color: '#c0392b',
    icon: '💰',
    significance: 'critical',
  },
  {
    year: 2024,
    type: 'regulation',
    title: 'Operação Rejeito — ANM Director arrested',
    description: 'Brazilian Federal Police arrests ANM Director Caio Mário Seabra in "Operação Rejeito." Billion-dollar license manipulation scheme uncovered. 1/3 of ANM directors were former mining sector employees. Regulatory capture confirmed. 88 mining claims found under illegal secrecy.',
    color: '#e74c3c',
    icon: '🔍',
    significance: 'critical',
  },
  {
    year: 2024,
    type: 'military',
    title: 'DFARS 2027 — US defense mandate',
    description: 'Pentagon mandates that by 2027, ALL US defense contractors must source rare earths from non-Chinese supply chains. F-35 program alone requires 1.2M kg of REE. No non-Chinese source currently exists at scale — making Brazil the only viable option.',
    color: '#c0392b',
    icon: '🎯',
    significance: 'critical',
  },
  {
    year: 2025,
    type: 'geopolitical',
    title: 'China bans 7 REE elements export to US',
    description: 'October 2025: China bans export of 7 heavy rare earth elements (Dy, Tb, Y, Gd, Ho, Er, Yb) to the United States. 78% of US weapons systems depend on Chinese-sourced REE. The ban directly threatens F-35 production, missile guidance, and nuclear submarine construction. Global supply chain panic.',
    color: '#e74c3c',
    icon: '🚫',
    significance: 'critical',
  },
  {
    year: 2025,
    type: 'military',
    title: 'State Dept $5M → Aclara Carina (GO)',
    description: 'US State Department awards $5M grant to Aclara Resources for the Carina Module in Piracanjuba, Goiás. First direct US government funding of a Brazilian REE project. Explicit purpose: "secure non-Chinese heavy REE supply for US defense industry."',
    color: '#c0392b',
    icon: '🇺🇸',
    significance: 'critical',
  },
  {
    year: 2026,
    type: 'enterprise',
    title: 'Export Finance Australia $100M → Viridis/Meteoric',
    description: 'Australian export credit agency commits $100M+ in financing for Viridis and Meteoric REE projects in Brazil. Both companies are ASX-listed but their assets are entirely in Brazil. The "Australian" narrative is a legal fiction — the real beneficiaries are US defense contractors.',
    color: '#2980b9',
    icon: '🇦🇺',
    significance: 'high',
  },
  {
    year: 2026,
    type: 'environmental',
    title: 'Poços de Caldas water crisis — mining vs people',
    description: 'Viridis plans to use ALL FOUR reservoirs of Poços de Caldas for its Colossus project. City already facing water rationing. MPF (Federal Public Ministry) seeks to suspend both Viridis and Meteoric operations. Local communities excluded from decision-making.',
    color: '#27ae60',
    icon: '🌊',
    significance: 'high',
  },
  {
    year: 2026,
    type: 'geopolitical',
    title: 'Global REE supply chain realignment',
    description: 'The US, EU, Japan, and Australia form the "Minerals Security Partnership" (MSP). Brazil invited as key partner. The geopolitical race for rare earths is now a central front in US-China strategic competition. Brazil\'s REE resources valued at $2.7T — the largest outside China.',
    color: '#e74c3c',
    icon: '🌍',
    significance: 'critical',
  },
]

export const MINING_PHASE_TIMELINE: PhaseTimeline[] = [
  {
    phase: 'REQUERIMENTO',
    label: 'Research Requirement',
    color: '#f39c12',
    description: 'Lowest regulatory barrier. Company files a claim with ANM (National Mining Agency). No environmental impact assessment needed. 82% of total claims are in this phase.',
    avgDurationYears: 3,
    riskLevel: 'high',
  },
  {
    phase: 'DISPONIBILIDADE',
    label: 'Availability Declaration',
    color: '#e67e22',
    description: 'ANM declares area as "available" for mining. Minimal technical requirements. Can be extended indefinitely. Often used for land speculation.',
    avgDurationYears: 2,
    riskLevel: 'high',
  },
  {
    phase: 'CONCESSÃO',
    label: 'Mining Concession',
    color: '#3498db',
    description: 'Granted after environmental licensing (usually). Requires approved mining plan. Only 11% of claims reach this phase. Represents real investment commitment.',
    avgDurationYears: 5,
    riskLevel: 'medium',
  },
  {
    phase: 'APROVEITAMENTO',
    label: 'Economic Exploitation',
    color: '#27ae60',
    description: 'Active mining operation. Full environmental licensing required. Subject to ANM oversight and community consultation. Most stringent regulatory phase.',
    avgDurationYears: 20,
    riskLevel: 'low',
  },
  {
    phase: 'LICENCIAMENTO',
    label: 'Environmental Licensing',
    color: '#2ecc71',
    description: 'Environmental license granted by state environmental agencies (SEMAD, etc.). Required before concession can be granted. Often the longest phase due to bureaucratic delays and community opposition.',
    avgDurationYears: 3,
    riskLevel: 'medium',
  },
]

export function getSignificanceColor(sig: string): string {
  switch (sig) {
    case 'critical': return '#e74c3c'
    case 'high': return '#f39c12'
    case 'medium': return '#3498db'
    case 'low': return '#7f8c8d'
    default: return '#666'
  }
}
