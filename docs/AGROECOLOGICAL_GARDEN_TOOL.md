# Agroecological Garden Tool — Detailed Specification

## Overview

The **Agroecological Garden Tool** is a localized planting map manager planner built for Earth Guardians Crews and communities to design, plan, and manage regenerative agroecological gardens. It integrates with the existing EG-Maps platform to provide satellite imagery overlay with drawing tools for creating detailed garden plans.

---

## Core Features

### 1. Satellite Base Map with Overlay Drawing
- **MapLibre GL** integration using existing MapTiler satellite tiles
- **Drawing modes** for creating vector overlays on satellite imagery
- **Layer management** for organizing different garden elements
- **Real-time coordinate display** (lat/lng) for precision placement
- **Measurement tools** (distance, area) for bed sizing

### 2. Garden Element Types (Drawable Layers)

| Category | Elements | Icon | Color | Description |
|----------|----------|------|-------|-------------|
| **Seeds & Seedlings** | Seeds, Seedlings, Transplants | 🌱 | Green | Planting points with species/variety metadata |
| **Soil & Fertility** | Fertile Earth, Compost, Mulch, Biochar | 🌱 | Brown | Soil amendment zones with nutrient profiles |
| **Water Systems** | Water Ways, Springs, Sources (Natural), Torneiras (Taps), Irrigation | 💧 | Blue | Hydrological features and irrigation infrastructure |
| **Structures** | Greenhouses, Sheds, Fences, Trellises, Beds, Paths | 🏗️ | Gray | Built infrastructure |
| **Plant Library** | Hortaliças (Vegetables), Árvores Nativas (Native Trees), Rizomas (Rhizomes), Cover Crops, Herbs | 🌿 | Various | Searchable plant database with companion planting data |

### 3. Plant Database (Localized)

#### Hortaliças (Vegetables)
- **Leafy Greens**: Alface, Couve, Espinafre, Agrião, Rúcula, Mostarda
- **Root Vegetables**: Cenoura, Beterraba, Rabanete, Batata-doce, Mandioca, Inhame
- **Fruiting**: Tomate, Pimentão, Berinjela, Abóbora, Pepino, Abobrinha, Quiabo, Jiló
- **Legumes**: Feijão, Ervilha, Grão-de-bico, Lentilha, Soja
- **Alliums**: Cebola, Alho, Alho-poró, Cebolinha
- **Brassicas**: Brócolis, Couve-flor, Repolho, Couve-de-bruxelas

#### Árvores Nativas (Native Trees) — Brazil Focus
- **Fruit Trees**: Jabuticabeira, Pitangueira, Araçazeiro, Goiabeira, Mangueira, Cajueiro, Pequi, Buriti, Bacaba, Açaí
- **Nitrogen Fixers**: Ingá, Angico, Pau-ferro, Sabiá, Gliricídia
- **Timber/Ecological**: Ipê, Cedro, Mogno, Jacarandá, Pau-brasil, Jequitibá
- **Palm Trees**: Babaçu, Buriti, Açaí, Pupunha, Licuri

#### Rizomas (Rhizomes & Tubers)
- **Edible**: Gengibre, Cúrcuma, Inhame, Cará, Taioba, Batata-doce, Mandioca
- **Medicinal**: Cana-de-açúcar, Vetiver, Capim-limão
- **Soil Builders**: Consolda, Confrei, Tansy

#### Cover Crops & Green Manures
- **Legumes**: Mucuna, Crotalária, Feijão-guandu, Estilozóbio
- **Grasses**: Milheto, Sorgo, Aveia-preta, Centeio
- **Brassicas**: Nabo-forrageiro, Mostarda

### 4. Water Management Features
- **Natural Springs** (Nascentes) — GPS marking with flow rate estimation
- **Water Courses** (Cursos d'água) — Polyline drawing for streams, swales
- **Water Bodies** — Ponds, tanks, cisterns with capacity
- **Torneiras (Taps)** — Municipal/well connection points
- **Irrigation Systems** — Drip lines, sprinklers, gravity-fed
- **Swales & Berms** — Contour lines for water harvesting
- **Keyline Design** — Contour mapping for optimal water distribution

### 6. Companion Planting & Guilds
- **Plant Guild Builder** — Drag-and-drop guild creation
- **Compatibility Matrix** — Visual companion/antagonist indicators
- **Succession Planning** — Seasonal rotation scheduler
- **Polyculture Templates** — Pre-designed guilds (Three Sisters, Mediterranean, Tropical)

### 7. Data Management
- **Project Save/Load** — LocalStorage + Supabase sync
- **Export Formats**: GeoJSON, Shapefile, PDF plan, PNG map image
- **Import**: GPS coordinates, CSV plant lists, existing garden plans
- **Version History** — Track changes over time
- **Collaborative Editing** — Real-time multi-user (future)

### 8. Localization (i18n)
- **16 Languages**: en, es, fr, pt, ar, hi, ja, zh, nl, de, it, ko, pl, ru, sv, tr
- **Regional Plant Databases** — Locale-specific species lists
- **Measurement Units** — Metric/Imperial toggle
- **Seasonal Calendars** — Hemisphere-aware planting dates

---

## Technical Architecture

### Component Structure
```
components/tools/
├── ToolsSheet.vue              # Main full-screen overlay container
├── AgroecologicalGardenTool.vue # Main tool component
├── garden/
│   ├── GardenMap.vue           # MapLibre integration for garden planning
│   ├── DrawingToolbar.vue      # Drawing mode controls
│   ├── LayerPanel.vue          # Layer visibility/order management
│   ├── PlantLibraryPanel.vue   # Searchable plant database
│   ├── PlantDetailModal.vue    # Plant info + companion data
│   ├── GuildBuilder.vue        # Companion planting guild creator
│   ├── WaterDesignPanel.vue    # Water system design tools
│   ├── MeasurementTools.vue    # Distance/area measurement
│   ├── ProjectPanel.vue        # Save/load/export project
│   └── SeasonalCalendar.vue    # Planting/harvest calendar
```

### Composables
```
composables/
├── useGardenProject.ts         # Project state management (Pinia)
├── useGardenDrawing.ts         # Drawing mode logic
├── usePlantDatabase.ts         # Plant data fetching/filtering
├── useCompanionPlanting.ts     # Compatibility logic
├── useWaterDesign.ts           # Hydrology calculations
├── useGardenExport.ts          # Export utilities
└── useGardenMap.ts             # MapLibre garden-specific helpers
```

### Data Layer
```
lib/
├── garden-plants.ts            # Plant database (JSON-imported)
├── garden-companions.ts        # Companion planting matrix
├── garden-types.ts             # TypeScript interfaces
├── garden-constants.ts         # Enums, defaults, config
└── garden-utils.ts             # Helpers (area calc, spacing, etc.)
```

### Types (garden-types.ts)
```typescript
interface GardenProject {
  id: string
  name: string
  description: string
  location: { lat: number; lng: number; zoom: number }
  bounds: [[number, number], [number, number]]
  layers: GardenLayer[]
  metadata: {
    createdAt: number
    updatedAt: number
    version: number
    author: string
    locale: string
    hemisphere: 'north' | 'south'
  }
}

interface GardenLayer {
  id: string
  name: string
  type: GardenLayerType
  visible: boolean
  locked: boolean
  opacity: number
  features: GardenFeature[]
  style: LayerStyle
}

type GardenLayerType = 
  | 'seeds' | 'seedlings' | 'transplants'
  | 'fertile-earth' | 'compost' | 'mulch' | 'biochar'
  | 'water-way' | 'spring' | 'water-source-natural' | 'water-source-tap' | 'irrigation'
  | 'greenhouse' | 'shed' | 'fence' | 'trellis' | 'bed' | 'path'
  | 'vegetable' | 'native-tree' | 'rhizome' | 'cover-crop' | 'herb'

interface GardenFeature {
  id: string
  type: 'point' | 'line' | 'polygon'
  geometry: GeoJSON.Geometry
  properties: {
    label: string
    plantId?: string
    variety?: string
    quantity?: number
    spacing?: number
    depth?: number
    plantingDate?: string
    harvestDate?: string
    notes?: string
    metadata?: Record<string, unknown>
  }
}

interface Plant {
  id: string
  name: string
  scientificName: string
  category: PlantCategory
  family: string
  description: string
  spacing: number // cm
  depth: number // cm
  daysToGermination: number
  daysToHarvest: number
  sunRequirement: 'full' | 'partial' | 'shade'
  waterRequirement: 'low' | 'medium' | 'high'
  soilPh: { min: number; max: number }
  hardinessZone: { min: number; max: number }
  companionPlants: string[] // plant IDs
  antagonistPlants: string[] // plant IDs
  guildRole: 'nitrogen-fixer' | 'dynamic-accumulator' | 'ground-cover' | 'pest-repellent' | 'pollinator-attractor' | 'support' | 'root-breaker' | 'biomass'
  harvestableParts: ('leaf' | 'fruit' | 'root' | 'flower' | 'seed' | 'stem')[]
  perennial: boolean
  nativeRange: string[]
  imageUrl?: string
  wikipediaUrl?: string
}

type PlantCategory = 'vegetable' | 'native-tree' | 'rhizome' | 'cover-crop' | 'herb' | 'fruit' | 'flower'
```

---

## User Usability

### Onboarding Flow
1. **Welcome Screen** — Brief intro + "Create New Garden" / "Open Existing"
2. **Location Setup** — Search address, use current location, or pick on map
3. **Garden Basics** — Name, size, orientation, climate zone auto-detect
4. **Guided Tour** — Interactive tooltips for drawing tools, plant library, layers

### Primary Workflows

#### Creating a New Garden Bed
1. Select "Bed" tool from toolbar
2. Draw polygon on satellite map
3. Auto-calculate area, perimeter, soil volume
4. Choose bed type: raised, in-ground, hugelkultur, keyhole
5. Assign plants from library (drag-drop or click)

#### Designing Water System
1. Enable "Water" layer
2. Mark spring/source (natural or torneira)
3. Draw swales on contour (elevation overlay)
4. Connect to beds with irrigation lines
5. Calculate flow rates, pipe sizing

#### Building Plant Guilds
1. Open Plant Library → Filter by category
2. Drag plants to "Guild Builder" canvas
3. Auto-show compatibility lines (green/red)
4. Save guild as template
5. Apply guild to multiple beds

#### Seasonal Planning
1. Open Seasonal Calendar
2. Select hemisphere → auto-adjust dates
3. Drag plants to timeline
4. View succession gaps/overlaps
5. Export planting schedule (CSV/ICS)

### Accessibility
- **Keyboard Navigation** — All tools accessible via keyboard
- **Screen Reader Support** — ARIA labels, live regions for map updates
- **High Contrast Mode** — Compatible with OS-level settings
- **Reduced Motion** — Respects `prefers-reduced-motion`
- **Touch Support** — Mobile-friendly drawing (pinch-zoom, pan, tap-draw)

### Responsive Design
- **Desktop** — Full sidebar panels, multi-column layouts
- **Tablet** — Collapsible panels, touch-optimized toolbar
- **Mobile** — Bottom sheet panels, simplified toolbar, gesture drawing

---

## Connections & Integration

### EG-Maps Platform Integration

#### MapLibre GL Shared Instance
- Reuses existing `useMapLibre` composable
- Shares MapTiler satellite tile source
- Respects existing tile provider toggle (satellite/offline)

#### State Management
- **Pinia Store**: `stores/garden.ts` for project state
- **Shared UI State**: `stores/ui.ts` for theme, language, modals
- **URL Sync**: Project state in hash for shareable links

#### Authentication (Supabase)
- Save projects to user account
- Community garden sharing
- Crew-based collaboration

#### Existing Components Reused
- `Icon.vue` — All icons
- `Button.vue` — Toolbar buttons
- `Sheet.vue` — Modals (plant detail, export)
- `Tooltip.vue` — Tool tips
- `Skeleton.vue` — Loading states
- `ToastHost` — Notifications
- `CommandPalette` — Keyboard shortcuts (Ctrl+K for tools)

#### Pages Integration
- **New Route**: `/tools/agroecological-garden` (optional direct access)
- **Dock Access**: Tools icon in bottom dock → opens ToolsSheet
- **Header Access**: Future "Tools" menu in unified header

### External Integrations

#### Data Sources
- **OpenStreetMap** — Building footprints, water ways, land use
- **SoilGrids** — Soil property data (pH, texture, organic carbon)
- **WorldClim / CHIRPS** — Historical climate data
- **FAO Ecocrop** — Crop suitability database
- **Plants of the World Online (POWO)** — Taxonomic data
- **Tropicos / GBIF** — Species occurrence data

#### Export Targets
- **QGIS/GeoJSON** — Professional GIS workflow
- **PDF Report** — Printable garden plan with legend
- **PNG/Map Image** — Sharing, presentations
- **CSV/Excel** — Plant lists, schedules, yields
- **ICS Calendar** — Planting/harvest reminders

---

## Resources Needed

### Plant Database
- **Source**: Compile from multiple open datasets
- **Format**: JSON/TypeScript module (~500+ species)
- **Maintenance**: Quarterly updates, community contributions

### Icons
- **New Icons Needed**: 
  - Swiss Army knife (tools dock) → `streamline-freehand:tools-wrench-screwdriver`
  - Seed, seedling, transplant
  - Compost, mulch, biochar
  - Spring, torneira, irrigation
  - Greenhouse, trellis, bed types
  - Plant category icons
- **Existing**: Use streamline-freehand nature/agriculture icons

### Imagery
- **Plant Photos**: Wikimedia Commons (CC-BY), iNaturalist
- **Default Patterns**: SVG fills for bed types (hatch, dots, lines)

### Libraries (Already Available)
- `maplibre-gl` — Map rendering
- `supercluster` — Marker clustering (if needed for plant markers)
- `turf.js` — Geospatial calculations (area, distance, buffer, contour)
- `date-fns` — Date handling for calendars
- `clsx` + `tailwind-merge` — Class utilities

### New Dependencies (If Needed)
- `geojson-vt` — Vector tile slicing for large projects
- `papaparse` — CSV import/export
- `jspdf` + `html2canvas` — PDF generation
- `ical-generator` — Calendar export

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Tools dock icon + ToolsSheet component
- [ ] Basic map integration (satellite base)
- [ ] Layer system + drawing toolbar (point, line, polygon)
- [ ] Project save/load (localStorage)

### Phase 2: Plant Database (Week 2-3)
- [ ] Plant data module (vegetables, native trees, rhizomes, cover crops)
- [ ] Plant library panel with search/filter
- [ ] Plant detail modal with companion data
- [ ] Category icons and styling

### Phase 3: Advanced Features (Week 3-4)
- [ ] Water design tools (springs, swales, irrigation)
- [ ] Companion planting guild builder
- [ ] Measurement tools (distance, area)
- [ ] Seasonal calendar with hemisphere support

### Phase 4: Polish & Export (Week 4-5)
- [ ] Export: GeoJSON, PDF, PNG, CSV, ICS
- [ ] Import: CSV, GPS, existing projects
- [ ] Supabase sync + auth integration
- [ ] Keyboard shortcuts + accessibility audit
- [ ] Mobile responsive + touch drawing

### Phase 5: Localization & Docs (Week 5-6)
- [ ] i18n keys for all 16 locales
- [ ] Regional plant databases
- [ ] User guide + video tutorials
- [ ] Community contribution workflow

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Time to create first garden bed | < 2 minutes |
| Plant library search latency | < 100ms |
| Map rendering (1000 features) | 60fps |
| Project save/load | < 500ms |
| Export generation (PDF) | < 3s |
| Mobile usability score | > 90/100 |
| Accessibility (axe-core) | 0 violations |

---

## Future Enhancements

- **AR View** — Camera overlay showing planned garden on real space
- **IoT Integration** — Soil moisture sensors, weather station data
- **Yield Tracking** — Harvest logging, yield prediction
- **Community Marketplace** — Seed/plant sharing between Crews
- **AI Assistant** — Planting recommendations based on location/soil
- **Carbon Sequestration Calculator** — Soil carbon estimation
- **Biodiversity Index** — Pollinator habitat scoring
- **Offline-First** — Full PWA with background sync

---

*Document Version: 1.0*  
*Created: 2026-11-05*  
*Author: EG-Maps Development Team*