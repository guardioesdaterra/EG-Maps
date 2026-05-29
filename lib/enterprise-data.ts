export interface EnterpriseHQ {
  name: string
  ticker: string | null
  logoUrl: string | null
  country: string
  city: string
  lat: number
  lng: number
  description: string
  sector: string
  link: string
  subsidiaries: string[]
  shareholders: string[]
  holdings: string[]
  color: string
}

export interface CorporateConnection {
  from: string
  to: string
  type: 'shareholding' | 'joint_venture' | 'subsidiary' | 'board_overlap' | 'partnership'
  label: string
}

export interface MiningClaim {
  id: string
  enterprise: string
  claimName: string
  lat: number
  lng: number
  substance: string
  phase: 'REQUERIMENTO' | 'DISPONIBILIDADE' | 'CONCESSÃO' | 'APROVEITAMENTO' | 'LICENCIAMENTO'
  uf: string
  areaHa: number
  dangerScore: number
  networkId: string
  category: string
  year: number
}

export const ENTERPRISES: EnterpriseHQ[] = [
  {
    name: 'VALE S.A.',
    ticker: 'VALE3.SA',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Vale_logo.svg/320px-Vale_logo.svg.png',
    country: 'Brazil',
    city: 'Rio de Janeiro',
    lat: -22.9542,
    lng: -43.1761,
    description: 'Brazilian multinational mining company, largest producer of iron ore and nickel',
    sector: 'Mining & Metals',
    link: 'https://vale.com',
    subsidiaries: ['Vale Base Metals', 'Vale Canada', 'Vale Indonesia'],
    shareholders: ['BNDES (6.3%)', 'Mitsui (5.1%)', 'BlackRock (4.8%)'],
    holdings: ['Salobo', 'S11D', 'Carajás', 'Sudbury'],
    color: '#d32f2f',
  },
  {
    name: 'Rio Tinto',
    ticker: 'RIO.L',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Rio_Tinto_Logo.svg/320px-Rio_Tinto_Logo.svg.png',
    country: 'UK',
    city: 'London',
    lat: 51.5074,
    lng: -0.1278,
    description: 'Anglo-Australian multinational mining group, one of the Big Three mining companies',
    sector: 'Mining & Metals',
    link: 'https://riotinto.com',
    subsidiaries: ['Rio Tinto Aluminium', 'Rio Tinto Copper', 'Rio Tinto Diamonds', 'Rio Tinto Energy & Minerals'],
    shareholders: ['BlackRock (8.3%)', 'Vanguard (5.1%)', 'HSBC (4.2%)'],
    holdings: ['Oyu Tolgoi', 'Pilbara', 'Bingham Canyon', 'Argyle', 'Simandou'],
    color: '#e63946',
  },
  {
    name: 'CBMM',
    ticker: null,
    logoUrl: null,
    country: 'Brazil',
    city: 'Araxá',
    lat: -19.5936,
    lng: -46.9419,
    description: 'Companhia Brasileira de Metalurgia e Mineração — world leader in niobium production',
    sector: 'Mining & Metals',
    link: 'https://cbmm.com',
    subsidiaries: ['CBMM International', 'CBMM Europe', 'CBMM Asia'],
    shareholders: ['Moreira Salles family', 'Mamori (Japanese consortium)'],
    holdings: ['Araxá Niobium Mine', 'Catalão'],
    color: '#1565c0',
  },
  {
    name: 'Serra Verde Mining',
    ticker: null,
    logoUrl: null,
    country: 'Brazil',
    city: 'Belo Horizonte',
    lat: -19.8173,
    lng: -43.9542,
    description: 'Brazilian mining company developing the Serra Verde rare earth project in Goiás',
    sector: 'Rare Earth Mining',
    link: 'https://serraverderm.com',
    subsidiaries: ['Serra Verde Mineração Ltda'],
    shareholders: ['Denham Capital', 'Vision Ridge Partners'],
    holdings: ['Serra Verde REE Project'],
    color: '#2e7d32',
  },
  {
    name: 'Viridis Mining & Minerals',
    ticker: 'VMM.AX',
    logoUrl: null,
    country: 'Australia',
    city: 'Perth',
    lat: -31.9505,
    lng: 115.8605,
    description: 'Australian mining company focused on rare earths — flagship Colossus Project in Brazil',
    sector: 'Rare Earth Mining',
    link: 'https://viridismining.com.au',
    subsidiaries: ['Viridis Brasil Mineração Ltda'],
    shareholders: ['Sophrosyne Capital (12.4%)', 'Board & Management (8.7%)'],
    holdings: ['Colossus Project (MG)', 'Pocinhos Project'],
    color: '#7b1fa2',
  },
  {
    name: 'Meteoric Resources',
    ticker: 'MEI.AX',
    logoUrl: null,
    country: 'Australia',
    city: 'West Perth',
    lat: -31.9485,
    lng: 115.8395,
    description: 'Australian explorer developing the Caldeira ionic clay REE project in Minas Gerais',
    sector: 'Rare Earth Mining',
    link: 'https://meteoric.com.au',
    subsidiaries: ['Meteoric Brasil Mineração Ltda'],
    shareholders: ['Dr. Andrew Tunks (11.2%)', 'Hengtai Mining (9.8%)', 'US EXIM Bank (LOI US$250M)'],
    holdings: ['Caldeira REE Project', 'Poços de Caldas'],
    color: '#00838f',
  },
  {
    name: 'Foxfire Metals',
    ticker: null,
    logoUrl: null,
    country: 'Australia',
    city: 'Melbourne',
    lat: -37.8136,
    lng: 144.9631,
    description: 'Australian exploration company focused on REEs, lithium and gold in the Amazon, Brazil',
    sector: 'Mining Exploration',
    link: 'https://foxfiremetals.com.au',
    subsidiaries: ['Foxfire Metals Pty Ltd', 'Foxfire Brasil Ltda'],
    shareholders: ['Board & Management', 'Private Australian investors'],
    holdings: ['Apui Region (AM)', 'Lithium Valley (MG)', 'Poços de Caldas REE'],
    color: '#e65100',
  },
  {
    name: 'Axel REE',
    ticker: 'AXL.AX',
    logoUrl: null,
    country: 'Australia',
    city: 'Kew East',
    lat: -37.8085,
    lng: 145.0585,
    description: 'Australian REE company focused on the Caladão REE-Gallium Project in Minas Gerais',
    sector: 'Rare Earth Mining',
    link: 'https://axelreelimited.com.au',
    subsidiaries: ['Axel REE Brasil Ltda'],
    shareholders: ['Foxfire Metals (majority owner)', 'Patrick Volpe (Director)'],
    holdings: ['Caladão REE-Gallium Project'],
    color: '#c62828',
  },
  {
    name: 'Aclara Resources',
    ticker: 'ARA.TO',
    logoUrl: null,
    country: 'Chile',
    city: 'Santiago (Las Condes)',
    lat: -33.4083,
    lng: -70.5686,
    description: 'Chilean-Canadian rare earths developer — circular mineral harvesting, Penco Module',
    sector: 'Rare Earth Mining',
    link: 'https://aclara-re.com',
    subsidiaries: ['Aclara Resources Mineração Ltda (Brazil)', 'Aclara Technologies Inc (USA)', 'Aclara Metals (JV with CAP)'],
    shareholders: ['Hochschild Group (57.7%)', 'CAP S.A. (strategic investor)'],
    holdings: ['Penco Module (Chile)', 'Carina Module (Brazil — MG/GO)'],
    color: '#0d47a1',
  },
  {
    name: 'Alpha Minerals',
    ticker: null,
    logoUrl: null,
    country: 'Australia',
    city: 'South Perth',
    lat: -31.9765,
    lng: 115.8625,
    description: 'Australian mining company with REE exploration in Brazil',
    sector: 'Mining Exploration',
    link: 'https://alpha-minerals.com',
    subsidiaries: ['Alpha Mining Pty Ltd'],
    shareholders: ['Private Australian'],
    holdings: ['Brazil REE tenements'],
    color: '#4a148c',
  },
  {
    name: 'GR8 Energetic',
    ticker: null,
    logoUrl: null,
    country: 'Brazil',
    city: 'Belo Horizonte',
    lat: -19.8173,
    lng: -43.9542,
    description: 'Brazilian energy and mining company with rare earth interests',
    sector: 'Energy & Mining',
    link: '#',
    subsidiaries: [],
    shareholders: ['Private Brazilian'],
    holdings: ['MG REE claims'],
    color: '#bf360c',
  },
  {
    name: 'Nazca Gold Mining',
    ticker: null,
    logoUrl: null,
    country: 'Brazil',
    city: 'Brasília',
    lat: -15.7975,
    lng: -47.8919,
    description: 'Mining company focused on gold and REE exploration',
    sector: 'Mining Exploration',
    link: '#',
    subsidiaries: [],
    shareholders: ['Private'],
    holdings: ['Brazil exploration tenements'],
    color: '#827717',
  },
  {
    name: 'Ponticor Brasil',
    ticker: null,
    logoUrl: null,
    country: 'Brazil',
    city: 'Belo Horizonte',
    lat: -19.8173,
    lng: -43.9542,
    description: 'Brazilian mining and exploration company',
    sector: 'Mining',
    link: '#',
    subsidiaries: [],
    shareholders: ['Private Brazilian'],
    holdings: ['MG mineral rights'],
    color: '#37474f',
  },
  {
    name: 'Mars GMN / Gol',
    ticker: null,
    logoUrl: null,
    country: 'Brazil',
    city: 'São Paulo',
    lat: -23.5505,
    lng: -46.6333,
    description: 'Brazilian mining company with strategic mineral interests',
    sector: 'Mining',
    link: '#',
    subsidiaries: [],
    shareholders: ['Private Brazilian'],
    holdings: ['Strategic mineral claims'],
    color: '#4e342e',
  },
  {
    name: 'Talisman / Spar',
    ticker: null,
    logoUrl: null,
    country: 'Canada',
    city: 'Toronto',
    lat: 43.6532,
    lng: -79.3832,
    description: 'Canadian mining company with Brazilian REE interests',
    sector: 'Mining',
    link: '#',
    subsidiaries: ['Talisman Brasil'],
    shareholders: ['Canadian institutional investors'],
    holdings: ['Brazil REE projects'],
    color: '#1b5e20',
  },
  {
    name: 'Palmares / Magbras',
    ticker: null,
    logoUrl: null,
    country: 'Brazil',
    city: 'Belo Horizonte',
    lat: -19.8173,
    lng: -43.9542,
    description: 'Brazilian rare earths processor and downstream partner',
    sector: 'Rare Earth Processing',
    link: '#',
    subsidiaries: [],
    shareholders: ['Private Brazilian'],
    holdings: ['REE processing facilities', 'JV with Meteoric Resources'],
    color: '#283593',
  },
]

export const CORPORATE_CONNECTIONS: CorporateConnection[] = [
  { from: 'Foxfire Metals', to: 'Axel REE', type: 'subsidiary', label: 'Wholly owned subsidiary' },
  { from: 'Foxfire Metals', to: 'Viridis Mining & Minerals', type: 'joint_venture', label: 'JV on Poços de Caldas tenements' },
  { from: 'Foxfire Metals', to: 'Alpha Minerals', type: 'partnership', label: 'Asset sale 50% of Brazil portfolio' },
  { from: 'Viridis Mining & Minerals', to: 'Meteoric Resources', type: 'board_overlap', label: 'Adjacent claims in Poços de Caldas' },
  { from: 'Meteoric Resources', to: 'Palmares / Magbras', type: 'partnership', label: 'MREC offtake & downstream MOU' },
  { from: 'Aclara Resources', to: 'VALE S.A.', type: 'partnership', label: 'Brazil exploration alliances' },
  { from: 'CBMM', to: 'VALE S.A.', type: 'board_overlap', label: 'Shared institutional investors' },
  { from: 'Rio Tinto', to: 'VALE S.A.', type: 'board_overlap', label: 'Competing Big Three miners' },
  { from: 'Serra Verde Mining', to: 'Denham Capital', type: 'shareholding', label: 'Funded by Denham Capital' },
  { from: 'Aclara Resources', to: 'Hochschild Group', type: 'shareholding', label: '57.7% controlling stake' },
  { from: 'Aclara Resources', to: 'CAP S.A.', type: 'shareholding', label: 'Strategic investment partner' },
  { from: 'Meteoric Resources', to: 'US EXIM Bank', type: 'partnership', label: 'US$250M LOI for equipment' },
  { from: 'Viridis Mining & Minerals', to: 'Sophrosyne Capital', type: 'shareholding', label: '12.4% major shareholder' },
  { from: 'VALE S.A.', to: 'BNDES', type: 'shareholding', label: '6.3% state development bank' },
  { from: 'VALE S.A.', to: 'Mitsui & Co', type: 'shareholding', label: '5.1% Japanese trading giant' },
  { from: 'Rio Tinto', to: 'BlackRock', type: 'shareholding', label: '8.3% institutional investor' },
  { from: 'Rio Tinto', to: 'Simandou', type: 'subsidiary', label: 'Simandou iron ore project (Guinea)' },
  { from: 'VALE S.A.', to: 'Carajás', type: 'subsidiary', label: 'Carajás mineral province' },
]

export const MINING_PHASES: { key: string; label: string; color: string }[] = [
  { key: 'REQUERIMENTO', label: 'Requerimento', color: '#f39c12' },
  { key: 'DISPONIBILIDADE', label: 'Disponibilidade', color: '#e67e22' },
  { key: 'CONCESSÃO', label: 'Concessão', color: '#3498db' },
  { key: 'APROVEITAMENTO', label: 'Aproveitamento', color: '#27ae60' },
  { key: 'LICENCIAMENTO', label: 'Licenciamento', color: '#2ecc71' },
]

export function getPhaseColor(phase: string): string {
  return MINING_PHASES.find(p => p.key === phase)?.color ?? '#666'
}

export function getEnterpriseByName(name: string): EnterpriseHQ | undefined {
  return ENTERPRISES.find(e => e.name === name || name.startsWith(e.name))
}

export function getEnterpriseConnections(name: string): { from: CorporateConnection[]; to: CorporateConnection[] } {
  return {
    from: CORPORATE_CONNECTIONS.filter(c => c.from === name),
    to: CORPORATE_CONNECTIONS.filter(c => c.to === name),
  }
}

export function buildEnterpriseHQGeoJSON(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: ENTERPRISES.filter(e => e.lat !== 0).map(e => ({
      type: 'Feature',
      properties: {
        name: e.name,
        ticker: e.ticker,
        country: e.country,
        city: e.city,
        description: e.description,
        sector: e.sector,
        color: e.color,
        type: 'enterprise_hq',
      },
      geometry: { type: 'Point', coordinates: [e.lng, e.lat] },
    })),
  }
}
