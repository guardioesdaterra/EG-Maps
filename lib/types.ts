export interface ProjectData {
  project_title: string;
  country_province: string;
  latitude: number;
  longitude: number;
  direct_beneficiaries: number;
  indirect_beneficiaries: number;
}

export interface Species {
  id: string;
  commonName: string;
  scientificName: string;
  category: string;
  taxonomicGroup: string;
  region: string;
  ecosystem: string;
  lat: number;
  lng: number;
  imageUrl: string | null;
  imageCredit: string;
  description?: string;
  endangerment?: string;
  ecosystemNeeds?: string;
  actions?: string;
  threatTypes?: string[];
  iucnUrl?: string;
  range?: {
    type: string;
    coordinates: number[][][];
  };
  content: Record<string, Record<string, string>>;
}

export type RareEarthCategory =
  | 'direct_ree'
  | 'carbonatite_associated'
  | 'pegmatite_associated'
  | 'heavy_mineral_associated'
  | 'phosphate_associated'
  | 'strategic_associated'

export interface RareEarthClaimProperties {
  /** Stable claim ID (from processo or generated) */
  id: string
  /** Claim process number (e.g. ANM processo) */
  processo: string
  /** Company / enterprise name */
  nome: string
  /** Substances (REE + others) */
  subs: string
  /** Category (RARE_EARTH_CATEGORIES key) */
  category: RareEarthCategory
  /** Mining phase (REQUERIMENTO, LICENCIAMENTO, etc.) */
  fase: string
  /** Brazilian state (UF) */
  uf: string
  /** Area in hectares */
  area_ha: number
  /** Pre-computed danger score 0-10 */
  danger_score: number
  /** Optional network/cluster id (corporate group) */
  network_id?: string
  /** Year of last event / filing */
  ano: number
  /** Last event description (if any) */
  ultimo_evento?: string
  /** Latitude */
  lat: number
  /** Longitude */
  lng: number
  /** Overlapping protected areas */
  overlaps?: Array<{ name: string; kind: 'ti' | 'quilombo'; distance_km: number }>
  /** Optional GeoJSON properties (raw passthrough) */
  raw?: Record<string, unknown>
}

export interface RareEarthPointFeature {
  type: 'Feature'
  id?: string | number
  geometry: { type: 'Point'; coordinates: [number, number] }
  properties: RareEarthClaimProperties
}

export interface RareEarthPointCollection {
  type: 'FeatureCollection'
  features: RareEarthPointFeature[]
}

export interface ToastMessage {
  id: string
  kind: 'info' | 'success' | 'warning' | 'error'
  title: string
  body?: string
  durationMs?: number
  /** Optional action button */
  action?: { label: string; onClick: () => void }
  /** ISO timestamp the toast was created */
  createdAt: number
}

export interface CommandPaletteItem {
  id: string
  /** Section/group for the palette */
  group: string
  /** Display label */
  label: string
  /** Optional secondary text */
  hint?: string
  /** Optional icon (iconify name) */
  icon?: string
  /** Optional keyboard shortcut to display */
  shortcut?: string
  /** Handler invoked when selected */
  onSelect: () => void
  /** Optional keywords to match against in addition to label/hint */
  keywords?: string[]
}

export interface DetailGrantData {
  id: string
  title: string
  description: string
  status: string
  created_at: string
  location_name?: string
  latitude?: number
  longitude?: number
  source_type?: string
  source_id?: string
  url?: string
  funder?: string
  source?: string
  country?: string
  submitted_by?: string | null
  reviewed_by?: string | null
  reviewed_at?: string | null
  amount_max?: string
  currency?: string
  deadline?: string
  categories?: string[]
  fetched_at?: string
  grant_type?: string
  grant_types?: string[]
  highlights?: string[]
  urgency?: string
  deadline_days?: number | null
  amount_usd?: number | null
  priority_score?: number
  relevance?: number
}

// ── Vulcan Observatory: Cultural Agents & Community Pins ──

export type CommunityPinType =
  | 'cultural_agent'
  | 'cultural_avenue'
  | 'show_event'
  | 'action'
  | 'point_of_attention'

export interface CulturalAgent {
  id: string
  name: string
  agent_type: string
  lat: number
  lng: number
  single_url?: string
  source: 'mapa_cultura' | 'floresta_ativista' | 'community'
  status: 'active' | 'pending' | 'approved'
  description?: string
}

export interface CommunityPin {
  id: string
  user_id: string
  pin_type: CommunityPinType
  name: string
  description?: string
  latitude: number
  longitude: number
  source_url?: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export interface CulturalAgentFeature {
  type: 'Feature'
  id?: string | number
  geometry: { type: 'Point'; coordinates: [number, number] }
  properties: {
    name: string
    type: string
    subtype?: string
    source: string
    source_id?: string
    single_url?: string
    status: string
    description?: string
  }
}

export interface CulturalAgentFeatureCollection {
  type: 'FeatureCollection'
  features: CulturalAgentFeature[]
}
