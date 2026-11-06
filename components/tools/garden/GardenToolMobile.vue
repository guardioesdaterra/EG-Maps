<!--
  components/tools/garden/GardenToolMobile.vue
  @why Flat, theme-aware mobile garden editor — no glassmorphism, solid colors.
  @component GardenToolMobile
  @emits close: []
-->
<template>
  <div class="garden-mobile" :class="{ 'has-grid': hasGrid }">
    <!-- Map Layer -->
    <div class="garden-map-layer" ref="mapContainerRef" @contextmenu.prevent>
      <!-- Map loading state -->
      <div v-if="mapLoading" class="map-loading" role="status" aria-live="polite">
        <div class="loading-spinner" />
        <p class="loading-text">{{ t('tools.agroecologicalGarden.map.loading') }}</p>
        <p v-if="mapError" class="loading-error">
          {{ t('tools.agroecologicalGarden.map.loadError') }}
          <button class="btn btn-secondary" @click="retryMap">{{ t('tools.agroecologicalGarden.map.retry') }}</button>
        </p>
      </div>

      <!-- Map error banner -->
      <div v-else-if="mapError" class="map-error-banner" role="alert">
        <Icon name="tabler:alert-triangle" class="w-5 h-5" />
        <span>{{ t('tools.agroecologicalGarden.map.loadError') }}</span>
        <button class="btn btn-ghost btn-sm" @click="retryMap">{{ t('tools.agroecologicalGarden.map.retry') }}</button>
      </div>

      <!-- Setup Wizard Overlay -->
      <GardenSetupWizardMobile
        v-if="showSetup"
        ref="wizardRef"
        v-model:location="setupLocation"
        v-model:grid="setupGrid"
        v-model:address="setupAddress"
        v-model:name="setupName"
        :can-cancel="hasGrid"
        @confirm="confirmSetup"
        @cancel="cancelSetup"
        @fit-grid="fitGrid"
      />

      <!-- Main UI (when not in setup) -->
      <template v-else>
        <!-- Top Bar -->
        <header class="top-bar" :class="{ scrolled: mapScrolled }">
          <button class="btn-icon" @click="close" :aria-label="t('general.back')">
            <Icon name="tabler:arrow-left" class="w-5 h-5" />
          </button>

          <div class="title-section" :class="{ 'has-subtitle': activeProject?.address }">
            <h1 class="title">{{ activeProject?.name || t('tools.agroecologicalGarden.title') }}</h1>
            <p v-if="activeProject?.address" class="subtitle">{{ activeProject.address }}</p>
            <p v-else-if="gridChip" class="subtitle">{{ gridChip }}</p>
          </div>

          <div class="top-actions">
            <button
              v-if="hasGrid"
              class="btn-icon btn-grid-chip"
              @click="openSetup"
              :aria-label="t('tools.agroecologicalGarden.onboarding.editGrid')"
            >
              <Icon name="tabler:grid-dots" class="w-5 h-5" />
              <span class="chip-text">{{ gridChip }}</span>
              <Icon name="tabler:chevron-right" class="w-4 h-4" />
            </button>

            <button
              class="btn-icon"
              :disabled="!garden.canUndo"
              @click="undoEdit"
              :aria-label="t('tools.agroecologicalGarden.toolbar.undo')"
            >
              <Icon name="tabler:arrow-back-up" class="w-5 h-5" />
            </button>
            <button
              class="btn-icon"
              :disabled="!garden.canRedo"
              @click="redoEdit"
              :aria-label="t('tools.agroecologicalGarden.toolbar.redo')"
            >
              <Icon name="tabler:arrow-forward-up" class="w-5 h-5" />
            </button>

            <div class="action-divider" />

            <button class="btn-icon" @click="showImport = true" :aria-label="t('tools.agroecologicalGarden.project.import')">
              <Icon name="tabler:file-import" class="w-5 h-5" />
            </button>
            <input ref="importInputRef" type="file" accept="application/json,.json,.geojson" class="hidden" @change="handleImportFile" />
            <button class="btn-icon" @click="saveProject" :aria-label="t('tools.agroecologicalGarden.project.save')">
              <Icon name="tabler:device-floppy" class="w-5 h-5" />
            </button>
            <button class="btn-icon" @click="showExport = true" :aria-label="t('tools.agroecologicalGarden.project.export')">
              <Icon name="tabler:share" class="w-5 h-5" />
            </button>
          </div>
        </header>

        <!-- Bottom Toolbar -->
        <footer class="bottom-toolbar" :class="{ expanded: activeSheet !== null }">
          <div class="toolbar-main">
            <!-- Drawing Modes -->
            <div class="mode-group" role="toolbar" :aria-label="t('tools.agroecologicalGarden.draw')">
              <button
                v-for="mode in drawingModes"
                :key="mode.key"
                class="mode-btn"
                :class="{ active: activeMode === mode.key }"
                :aria-label="t(mode.labelKey)"
                :aria-pressed="activeMode === mode.key"
                @click="setMode(mode.key)"
              >
                <Icon :name="mode.icon" class="w-6 h-6" />
                <span class="mode-label">{{ t(mode.shortKey) }}</span>
              </button>
            </div>

            <div class="toolbar-divider" />

            <!-- Plant Library Trigger -->
            <button
              class="mode-btn btn-plant"
              :class="{ active: activeSheet === 'plants' }"
              :aria-label="t('tools.agroecologicalGarden.plantLibrary.title')"
              @click="toggleSheet('plants')"
            >
              <Icon name="tabler:plant" class="w-6 h-6" />
              <span class="mode-label">{{ t('tools.agroecologicalGarden.placePlant') }}</span>
            </button>

            <!-- Layers Trigger -->
            <button
              class="mode-btn"
              :class="{ active: activeSheet === 'layers' }"
              :aria-label="t('tools.agroecologicalGarden.panels.layers')"
              @click="toggleSheet('layers')"
            >
              <Icon name="gis:layers" class="w-6 h-6" />
              <span class="mode-label">{{ t('tools.agroecologicalGarden.panels.layers') }}</span>
            </button>

            <!-- Fit Grid -->
            <button
              v-if="hasGrid"
              class="mode-btn"
              :aria-label="t('tools.agroecologicalGarden.map.zoomToGrid')"
              @click="() => fitGrid()"
            >
              <Icon name="tabler:target-arrow" class="w-6 h-6" />
              <span class="mode-label">{{ t('tools.agroecologicalGarden.map.fit') }}</span>
            </button>
          </div>

          <!-- Active Sheet Indicator -->
          <div v-if="activeSheet" class="sheet-indicator" @click="closeSheet">
            <span>{{ activeSheet === 'plants' ? t('tools.agroecologicalGarden.panels.plants') : t('tools.agroecologicalGarden.panels.layers') }}</span>
            <Icon name="tabler:chevron-down" class="w-4 h-4" />
          </div>
        </footer>

        <!-- Floating Action Buttons (Right Side) -->
        <div class="fab-column">
          <button
            v-if="activeDraw"
            class="fab fab-primary"
            @click="finishDraw"
            :aria-label="t('tools.agroecologicalGarden.drawActions.finish')"
          >
            <Icon name="tabler:check" class="w-5 h-5" />
          </button>
          <button
            v-if="activeDraw"
            class="fab fab-danger"
            @click="cancelDraw"
            :aria-label="t('tools.agroecologicalGarden.drawActions.cancel')"
          >
            <Icon name="tabler:x" class="w-5 h-5" />
          </button>

          <button
            v-else-if="pendingPlant"
            class="fab fab-plant"
            @click="clearPendingPlant"
            :aria-label="t('tools.agroecologicalGarden.panels.cancelPlant')"
          >
            <Icon name="tabler:plant" class="w-5 h-5" />
            <span class="fab-label">{{ t('tools.agroecologicalGarden.panels.planting', { name: pendingPlant.name }) }}</span>
          </button>
        </div>

        <!-- Map Readout -->
        <div v-if="coordinate || zoomLevel" class="map-readout">
          <span v-if="coordinate" class="readout-item">{{ coordinate.lat.toFixed(5) }}, {{ coordinate.lng.toFixed(5) }}</span>
          <span v-if="zoomLevel" class="readout-item">z{{ zoomLevel }}</span>
          <span v-if="gridSummaryChip" class="readout-item grid-chip">{{ gridSummaryChip }}</span>
        </div>

        <!-- Measurement Display -->
        <div v-if="measurement" class="measurement-bar">
          <span class="measure-label">{{ measurement.label }}</span>
          <button class="btn btn-ghost btn-sm" @click="toggleUnit">
            {{ unitSystem === 'metric' ? t('tools.agroecologicalGarden.measurement.metric') : t('tools.agroecologicalGarden.measurement.imperial') }}
          </button>
        </div>

        <!-- Drawing Actions -->
        <div v-if="isDrawing" class="draw-actions">
          <button class="btn btn-primary" @click="finishDraw">
            <Icon name="tabler:check" class="w-4 h-4" />
            {{ t('tools.agroecologicalGarden.drawActions.finish') }}
          </button>
          <button class="btn btn-secondary" @click="cancelDraw">
            <Icon name="tabler:x" class="w-4 h-4" />
            {{ t('tools.agroecologicalGarden.drawActions.cancel') }}
          </button>
        </div>
      </template>
    </div>

    <!-- Side Sheets -->
    <GardenSheetMobile
      v-model:open="sheetOpen"
      :side="'bottom'"
      :title="activeSheet === 'plants' ? t('tools.agroecologicalGarden.panels.plants') : t('tools.agroecologicalGarden.panels.layers')"
      @close="closeSheet"
    >
      <template #default>
        <div class="sheet-content">
          <!-- Plants Tab -->
          <div v-if="activeSheet === 'plants'" class="plants-panel">
            <div class="search-wrapper">
              <Icon name="tabler:search" class="w-5 h-5" />
              <input
                v-model="plantSearch"
                type="search"
                class="field-input"
                :placeholder="t('tools.agroecologicalGarden.plantLibrary.search')"
              />
            </div>

            <div class="category-chips">
              <button
                class="category-chip"
                :class="{ active: plantCategory === 'all' }"
                @click="plantCategory = 'all'"
              >
                {{ t('tools.agroecologicalGarden.plantLibrary.categories.all') }}
              </button>
              <button
                v-for="category in plantCategories"
                :key="category"
                class="category-chip"
                :class="{ active: plantCategory === category }"
                @click="plantCategory = category"
              >
                {{ t(PLANT_CATEGORY_KEYS[category]) }}
              </button>
            </div>

            <div v-if="!filteredPlants.length" class="empty-state">
              <Icon name="tabler:search" class="w-8 h-8" />
              <p>{{ t('tools.agroecologicalGarden.emptyStates.noPlants') }}</p>
            </div>

            <ul class="plant-list" role="listbox">
              <li
                v-for="plant in filteredPlants"
                :key="plant.id"
                class="plant-item"
                :class="{ selected: garden.selectedPlantId === plant.id }"
                role="option"
                @click="selectPlant(plant.id)"
              >
                <span class="plant-emoji">{{ plantIcon(plant.category) }}</span>
                <div class="plant-info">
                  <span class="plant-name">{{ plant.name }}</span>
                  <span class="plant-sci">{{ plant.scientificName }}</span>
                </div>
                <span class="plant-category">{{ plant.category.replace('-', ' ') }}</span>
              </li>
            </ul>
          </div>

          <!-- Layers Tab -->
          <div v-else class="layers-panel">
            <div class="add-layer-row">
              <select v-model="newLayerType" class="field-select" :aria-label="t('tools.agroecologicalGarden.panels.addLayer')">
                <optgroup v-for="group in layerGroups" :key="group.key" :label="t(group.labelKey)">
                  <option v-for="type in group.types" :key="type" :value="type">{{ layerTypeLabel(type) }}</option>
                </optgroup>
              </select>
              <button class="btn btn-primary" @click="addSelectedLayer" :aria-label="t('tools.agroecologicalGarden.panels.addLayer')">
                <Icon name="tabler:plus" class="w-4 h-4" />
              </button>
            </div>

            <label class="checkbox-label">
              <input type="checkbox" v-model="showEmptyLayers" />
              <span>{{ showEmptyLayers ? t('tools.agroecologicalGarden.panels.hideEmpty') : t('tools.agroecologicalGarden.panels.showEmpty') }}</span>
            </label>

            <p v-if="!layerList.length" class="empty-state">
              <Icon name="gis:layers" class="w-8 h-8" />
              <span>{{ t('tools.agroecologicalGarden.panels.noLayers') }}</span>
            </p>

            <ul class="layer-list" role="list">
              <li
                v-for="layer in layerList"
                :key="layer.id"
                class="layer-item"
                :class="{ active: activeLayerId === layer.id }"
              >
                <div class="layer-main" @click="setActiveLayer(layer.id)">
                  <button
                    class="layer-visibility"
                    @click.stop="setLayerVisibility(layer.id, !layer.visible)"
                    :aria-label="layer.visible ? t('tools.agroecologicalGarden.layers.visibility') : t('tools.agroecologicalGarden.layers.visibility')"
                  >
                    <Icon :name="layer.visible ? 'tabler:eye' : 'tabler:eye-off'" class="w-5 h-5" />
                  </button>
                  <span class="layer-color" :style="{ backgroundColor: layer.style.color }" />
                  <span class="layer-name">{{ layerTypeLabel(layer.type) }}</span>
                  <span class="layer-count">{{ layer.features.length }}</span>
                </div>

                <div v-if="activeLayerId === layer.id" class="layer-details">
                  <div class="opacity-control">
                    <label :aria-label="t('tools.agroecologicalGarden.layers.opacity')">
                      <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.1"
                        :value="layer.opacity"
                        @input="setLayerOpacity(layer.id, Number(($event.target as HTMLInputElement).value))"
                      />
                    </label>
                    <span class="opacity-value">{{ Math.round(layer.opacity * 100) }}%</span>
                  </div>
                  <div class="layer-actions">
                    <button
                      class="btn-icon-sm"
                      @click.stop="setLayerLocked(layer.id, !layer.locked)"
                      :aria-label="layer.locked ? t('tools.agroecologicalGarden.layers.unlock') : t('tools.agroecologicalGarden.layers.lock')"
                    >
                      <Icon :name="layer.locked ? 'tabler:lock' : 'tabler:lock-open'" class="w-4 h-4" />
                    </button>
                    <button
                      class="btn-icon-sm btn-danger"
                      @click.stop="deleteLayer(layer.id)"
                      :aria-label="t('tools.agroecologicalGarden.layers.delete')"
                    >
                      <Icon name="tabler:trash-x" class="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </li>
            </ul>

            <button v-if="selectedFeatureId" class="btn btn-danger btn-full" @click="deleteSelectedFeature">
              <Icon name="tabler:trash" class="w-4 h-4" />
              {{ t('tools.agroecologicalGarden.drawActions.deleteSelected') }}
            </button>
          </div>
        </div>
      </template>
    </GardenSheetMobile>

    <!-- Export Modal -->
    <Teleport to="body">
      <div v-if="showExport" class="modal-overlay" @click.self="showExport = false">
        <div class="modal" role="dialog" aria-modal="true" :aria-label="t('tools.agroecologicalGarden.project.export')">
          <header class="modal-header">
            <h3>{{ t('tools.agroecologicalGarden.project.export') }}</h3>
            <button class="modal-close" @click="showExport = false" :aria-label="t('general.close')">
              <Icon name="tabler:x" class="w-5 h-5" />
            </button>
          </header>
          <div class="modal-body">
            <button v-for="fmt in exportFormats" :key="fmt" class="modal-option" @click="exportProject(fmt)">
              <Icon name="tabler:file" class="w-5 h-5" />
              <span>{{ fmt }}</span>
              <Icon name="tabler:arrow-narrow-right" class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Import Modal -->
    <Teleport to="body">
      <div v-if="showImport" class="modal-overlay" @click.self="showImport = false">
        <div class="modal" role="dialog" aria-modal="true" :aria-label="t('tools.agroecologicalGarden.project.import')">
          <header class="modal-header">
            <h3>{{ t('tools.agroecologicalGarden.project.import') }}</h3>
            <button class="modal-close" @click="showImport = false" :aria-label="t('general.close')">
              <Icon name="tabler:x" class="w-5 h-5" />
            </button>
          </header>
          <div class="modal-body">
            <p class="modal-hint">{{ t('tools.agroecologicalGarden.project.importHint') }}</p>
            <input ref="importInputRef" type="file" accept="application/json,.json,.geojson" class="hidden" @change="handleImportFile" />
            <button class="btn btn-primary btn-full" @click="triggerFileInput">
              <Icon name="tabler:upload" class="w-4 h-4" />
              {{ t('tools.agroecologicalGarden.project.selectFile') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl'
import maplibregl from 'maplibre-gl'
import { useI18n } from '@/composables/useI18n'
import { useToast } from '@/composables/useToast'
import { useGardenProject } from '@/composables/useGardenProject'
import { useMapTileStyle } from '@/composables/useMapTileStyle'
import { tileStyleDef } from '@/lib/tile-styles'
import { buildGardenStyle, satelliteStyle, streetsStyle } from '@/lib/garden-basemap'
import { GRID_MAX_CELLS, buildGridGeometry, gridBounds, gridToGeoJSON, normalizeGrid } from '@/lib/garden-grid'
import type { GardenFeature, GardenGrid, GardenLayerType, GardenLocation, LayerStyle, DrawingMode, PlantCategory } from '@/lib/garden-types'
import { PLANTS, getPlant, searchPlants } from '@/lib/garden-plants'
import { createDistanceMeasurement, computeBounds, formatDistance as formatMeters, generateId, haversineDistance } from '@/lib/garden-utils'
import { DEFAULT_LOCATION } from '@/lib/garden-constants'
import GardenSetupWizardMobile from '@/components/tools/garden/GardenSetupWizardMobile.vue'
import GardenSheetMobile from '@/components/ui/GardenSheetMobile.vue'
import Icon from '@/components/Icon.vue'

const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const toast = useToast()
const garden = useGardenProject()
const mapStyle = useMapTileStyle()

const exportFormats = ['GeoJSON', 'JSON']
const DEFAULT_GRID: GardenGrid = normalizeGrid({ widthM: 10, heightM: 10, cellM: 1 })

// ── Map refs/state ──────────────────────────────────────────────────────────
const mapContainerRef = ref<HTMLDivElement | null>(null)
const mapRef = shallowRef<MapLibreMap | null>(null)
const isMapReady = ref(false)
const mapError = ref(false)
const mapScrolled = ref(false)
const coordinate = ref<{ lat: number; lng: number } | null>(null)
const zoomLevel = ref<number | null>(null)
let styleTimer: ReturnType<typeof setTimeout> | null = null
let resizeObserver: ResizeObserver | null = null
let fallbackLevel = 0
let tileErrors = 0

// ── Setup wizard state ──────────────────────────────────────────────────────
const showSetup = ref(false)
const wizardRef = ref<InstanceType<typeof GardenSetupWizardMobile> | null>(null)
const setupLocation = ref<GardenLocation>({ ...DEFAULT_LOCATION })
const setupGrid = ref<GardenGrid>({ ...DEFAULT_GRID })
const setupAddress = ref('')
const setupName = ref('')

// ── UI state ────────────────────────────────────────────────────────────────
const sheetOpen = ref(false)
const activeSheet = ref<'layers' | 'plants' | null>(null)
const showEmptyLayers = ref(false)
const newLayerType = ref<GardenLayerType>('bed')
const plantSearch = ref('')
const plantCategory = ref<PlantCategory | 'all'>('all')
const showExport = ref(false)
const showImport = ref(false)
const importInputRef = ref<HTMLInputElement | null>(null)
const pendingPlant = ref<{ plantId: string; name: string } | null>(null)

// ── Computed project state ──────────────────────────────────────────────────
const activeProject = computed(() => garden.activeProject)
const activeLayerId = computed(() => garden.activeLayerId)
const selectedFeatureId = computed(() => garden.selectedFeatureId)
const visibleFeatures = computed(() => garden.visibleFeatures)
const measurement = computed(() => garden.measurement)
const unitSystem = computed(() => garden.unitSystem)
const activeMode = computed(() => garden.drawingMode)
const canUndo = computed(() => garden.canUndo)
const canRedo = computed(() => garden.canRedo)
const hasGrid = computed(() => !!activeProject.value?.grid)

const drawingModes: Array<{ key: DrawingMode; icon: string; labelKey: string; shortKey: string }> = [
  { key: 'select', icon: 'tabler:pointer', labelKey: 'tools.agroecologicalGarden.toolbar.select', shortKey: 'tools.agroecologicalGarden.toolbar.selectShort' },
  { key: 'pan', icon: 'tabler:arrows-move', labelKey: 'tools.agroecologicalGarden.toolbar.pan', shortKey: 'tools.agroecologicalGarden.toolbar.panShort' },
  { key: 'point', icon: 'tabler:map-pin', labelKey: 'tools.agroecologicalGarden.toolbar.point', shortKey: 'tools.agroecologicalGarden.toolbar.pointShort' },
  { key: 'line', icon: 'tabler:route', labelKey: 'tools.agroecologicalGarden.toolbar.line', shortKey: 'tools.agroecologicalGarden.toolbar.lineShort' },
  { key: 'polygon', icon: 'tabler:polygon', labelKey: 'tools.agroecologicalGarden.toolbar.polygon', shortKey: 'tools.agroecologicalGarden.toolbar.polygonShort' },
  { key: 'measure', icon: 'tabler:ruler', labelKey: 'tools.agroecologicalGarden.toolbar.measure', shortKey: 'tools.agroecologicalGarden.toolbar.measureShort' },
]

const layerGroups: Array<{ key: string; labelKey: string; types: GardenLayerType[] }> = [
  { key: 'soil', labelKey: 'tools.agroecologicalGarden.layerGroups.soil', types: ['bed', 'path', 'fertile-earth', 'compost', 'mulch', 'biochar'] },
  { key: 'water', labelKey: 'tools.agroecologicalGarden.layerGroups.water', types: ['water-way', 'spring', 'water-source-natural', 'water-source-tap', 'irrigation'] },
  { key: 'structures', labelKey: 'tools.agroecologicalGarden.layerGroups.structures', types: ['greenhouse', 'shed', 'fence', 'trellis'] },
  { key: 'planting', labelKey: 'tools.agroecologicalGarden.layerGroups.planting', types: ['seeds', 'seedlings', 'transplants', 'vegetable', 'native-tree', 'rhizome', 'cover-crop', 'herb'] },
]

const plantCategories: PlantCategory[] = ['vegetable', 'native-tree', 'rhizome', 'cover-crop', 'herb', 'fruit', 'flower']
const PLANT_CATEGORY_KEYS: Record<PlantCategory, string> = {
  vegetable: 'tools.agroecologicalGarden.plantLibrary.categories.vegetable',
  'native-tree': 'tools.agroecologicalGarden.plantLibrary.categories.nativeTree',
  rhizome: 'tools.agroecologicalGarden.plantLibrary.categories.rhizome',
  'cover-crop': 'tools.agroecologicalGarden.plantLibrary.categories.coverCrop',
  herb: 'tools.agroecologicalGarden.plantLibrary.categories.herb',
  fruit: 'tools.agroecologicalGarden.plantLibrary.categories.fruit',
  flower: 'tools.agroecologicalGarden.plantLibrary.categories.flower',
}

const layerList = computed(() => {
  const layers = activeProject.value?.layers ?? []
  if (showEmptyLayers.value) return layers
  return layers.filter(layer => layer.features.length > 0 || layer.id === activeLayerId.value)
})

const gridChip = computed(() => {
  const grid = activeProject.value?.grid
  if (!grid) return ''
  return t('tools.agroecologicalGarden.onboarding.gridChip', {
    width: trimNumber(grid.widthM),
    length: trimNumber(grid.heightM),
    cols: grid.cols,
    rows: grid.rows,
  })
})

const gridSummaryChip = computed(() => {
  const grid = activeProject.value?.grid
  if (!grid) return ''
  return `${trimNumber(grid.cellM)} m · ${grid.cols}×${grid.rows}`
})

const filteredPlants = computed(() => {
  const query = plantSearch.value.trim()
  const base = query ? searchPlants(query) : PLANTS
  return base
    .filter(plant => plantCategory.value === 'all' || plant.category === plantCategory.value)
    .slice(0, 80)
})

const isDrawing = computed(() => activeDraw.value !== null)
const mapLoading = computed(() => !isMapReady.value)

// ── Drawing state ───────────────────────────────────────────────────────────
interface DrawState {
  type: 'line' | 'polygon'
  coords: [number, number][]
  layerId: string
  style: LayerStyle
  featureId: string
}
const activeDraw = ref<DrawState | null>(null)

// ── Map lifecycle ───────────────────────────────────────────────────────────

function initialStyle() {
  const apiKey = String(useRuntimeConfig().public.maptilerApiKey || '')
  fallbackLevel = apiKey ? 0 : 1
  return buildGardenStyle(apiKey, tileStyleDef(mapStyle.styleId.value).maptilerStyle)
}

function initMap() {
  if (!mapContainerRef.value || mapRef.value) return

  const rect = mapContainerRef.value.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) {
    console.warn('[Garden] Map container has zero dimensions, retrying...')
    setTimeout(initMap, 100)
    return
  }

  const project = garden.activeProject
  const center = project?.location ?? setupLocation.value
  const map = new maplibregl.Map({
    container: mapContainerRef.value,
    style: initialStyle() as maplibregl.StyleSpecification | string,
    center: [center.lng, center.lat],
    zoom: Math.max(project?.location.zoom ?? 17, 17),
    hash: false,
    interactive: true,
    dragRotate: false,
    attributionControl: false,
  })
  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
  map.addControl(new maplibregl.ScaleControl({ unit: 'metric', maxWidth: 90 }), 'bottom-left')

  mapRef.value = map
  zoomLevel.value = map.getZoom()

  map.on('style.load', () => {
    if (styleTimer) {
      clearTimeout(styleTimer)
      styleTimer = null
    }
    isMapReady.value = true
    mapError.value = false
    tileErrors = 0
    setupMapLayers(map)
    renderAll()
    if (!didInitialView && activeProject.value?.grid && !showSetup.value) {
      didInitialView = true
      fitGrid(false)
    }
  })

  map.on('idle', () => {
    isMapReady.value = true
    mapError.value = false
  })

  map.on('error', (event) => {
    const message = String((event.error as Error | undefined)?.message ?? '')
    if (!map.isStyleLoaded()) {
      applyFallback()
      return
    }
    if (/tile|network|fetch|failed/i.test(message)) {
      tileErrors += 1
      if (tileErrors === 4) mapError.value = true
    }
  })

  map.on('click', (event) => {
    if (showSetup.value) {
      wizardRef.value?.setLocationFromMap(event.lngLat.lng, event.lngLat.lat)
      return
    }
    handleMapClick(event.lngLat.lng, event.lngLat.lat)
  })

  map.on('dblclick', () => {
    if (activeDraw.value) finishDraw()
  })

  map.on('mousemove', (event) => {
    coordinate.value = { lat: event.lngLat.lat, lng: event.lngLat.lng }
    if (activeDraw.value) updateDrawPreview(map, event.lngLat.lng, event.lngLat.lat)
  })

  map.on('zoom', () => {
    zoomLevel.value = Math.round(map.getZoom() * 10) / 10
  })

  map.on('move', () => {
    mapScrolled.value = true
  })

  styleTimer = setTimeout(() => {
    if (!map.isStyleLoaded()) {
      mapError.value = true
      applyFallback()
    }
  }, 5_000)

  resizeObserver = new ResizeObserver(() => map.resize())
  resizeObserver.observe(mapContainerRef.value)
}

function applyFallback() {
  const map = mapRef.value
  if (!map) return
  if (fallbackLevel >= 2) {
    mapError.value = true
    return
  }
  fallbackLevel += 1
  const nextStyle = getStyleForLevel(fallbackLevel)
  console.log('[Garden] Applying fallback level:', fallbackLevel)
  map.setStyle(nextStyle)
}

function retryMap() {
  const map = mapRef.value
  if (!map) return
  mapError.value = false
  isMapReady.value = false
  fallbackLevel = Math.max(fallbackLevel, 1)
  map.setStyle(getStyleForLevel(fallbackLevel))
  styleTimer = setTimeout(() => {
    if (!map.isStyleLoaded()) mapError.value = true
  }, 5_000)
}

function getStyleForLevel(level: number) {
  if (level === 0) {
    const apiKey = String(useRuntimeConfig().public.maptilerApiKey || '')
    return buildGardenStyle(apiKey, tileStyleDef(mapStyle.styleId.value).maptilerStyle)
  }
  if (level === 1) return streetsStyle()
  return satelliteStyle()
}

function flyTo(target: { lng: number; lat: number; zoom?: number }) {
  mapRef.value?.flyTo({
    center: [target.lng, target.lat],
    zoom: target.zoom ?? mapRef.value.getZoom(),
    duration: 600,
  })
}

let didInitialView = false

// ── Map layers ──────────────────────────────────────────────────────────────

function setupMapLayers(map: MapLibreMap) {
  ensureSource(map, 'garden-grid-area')
  ensureSource(map, 'garden-grid-lines')
  ensureSource(map, 'garden-draw-points')
  ensureSource(map, 'garden-draw-lines')
  ensureSource(map, 'garden-draw-polygons')
  ensureSource(map, 'garden-active-draw')

  if (!map.getLayer('garden-grid-fill')) {
    map.addLayer({
      id: 'garden-grid-fill',
      type: 'fill',
      source: 'garden-grid-area',
      paint: { 'fill-color': 'var(--garden-color-brand-primary)', 'fill-opacity': 0.08 },
    })
  }
  if (!map.getLayer('garden-grid-lines')) {
    map.addLayer({
      id: 'garden-grid-lines',
      type: 'line',
      source: 'garden-grid-lines',
      paint: {
        'line-color': ['case', ['==', ['get', 'kind'], 'boundary'], 'var(--garden-color-brand-primary)', 'var(--garden-color-brand-300)'],
        'line-width': ['case', ['==', ['get', 'kind'], 'boundary'], 2.5, 1],
        'line-opacity': ['case', ['==', ['get', 'kind'], 'boundary'], 0.9, 0.4],
      },
    })
  }
  if (!map.getLayer('garden-layer-polygons-fill')) {
    map.addLayer({
      id: 'garden-layer-polygons-fill',
      type: 'fill',
      source: 'garden-draw-polygons',
      paint: {
        'fill-color': ['get', 'fillColor'],
        'fill-opacity': ['*', ['get', 'fillOpacity'], ['get', 'layerOpacity']],
      },
    })
  }
  if (!map.getLayer('garden-layer-polygons-outline')) {
    map.addLayer({
      id: 'garden-layer-polygons-outline',
      type: 'line',
      source: 'garden-draw-polygons',
      paint: {
        'line-color': ['get', 'color'],
        'line-width': ['case', ['==', ['get', 'selected'], true], 4, 2],
        'line-opacity': ['*', ['get', 'opacity'], ['get', 'layerOpacity']],
      },
    })
  }
  if (!map.getLayer('garden-layer-lines')) {
    map.addLayer({
      id: 'garden-layer-lines',
      type: 'line',
      source: 'garden-draw-lines',
      paint: {
        'line-color': ['get', 'color'],
        'line-width': ['case', ['==', ['get', 'selected'], true], ['+', ['get', 'width'], 2], ['get', 'width']],
        'line-opacity': ['*', ['get', 'opacity'], ['get', 'layerOpacity']],
      },
    })
  }
  if (!map.getLayer('garden-layer-points')) {
    map.addLayer({
      id: 'garden-layer-points',
      type: 'circle',
      source: 'garden-draw-points',
      paint: {
        'circle-radius': ['get', 'radius'],
        'circle-color': ['get', 'color'],
        'circle-opacity': ['*', ['get', 'opacity'], ['get', 'layerOpacity']],
        'circle-stroke-color': ['case', ['==', ['get', 'selected'], true], 'var(--garden-color-brand-primary)', 'var(--garden-color-neutral-100)'],
        'circle-stroke-width': ['case', ['==', ['get', 'selected'], true], 3, 1],
      },
    })
  }
  if (!map.getLayer('garden-active-line')) {
    map.addLayer({
      id: 'garden-active-line',
      type: 'line',
      source: 'garden-active-draw',
      paint: { 'line-color': 'var(--garden-color-brand-primary)', 'line-width': 3, 'line-opacity': 0.9, 'line-dasharray': [4, 2] },
    })
  }
  if (!map.getLayer('garden-active-polygon')) {
    map.addLayer({
      id: 'garden-active-polygon',
      type: 'fill',
      source: 'garden-active-draw',
      filter: ['==', ['geometry-type'], 'Polygon'],
      paint: { 'fill-color': 'var(--garden-color-brand-primary)', 'fill-opacity': 0.15 },
    })
  }
  if (!map.getLayer('garden-active-point')) {
    map.addLayer({
      id: 'garden-active-point',
      type: 'circle',
      source: 'garden-active-draw',
      filter: ['==', ['geometry-type'], 'Point'],
      paint: { 'circle-color': 'var(--garden-color-brand-primary)', 'circle-radius': 5, 'circle-opacity': 0.9 },
    })
  }
}

function ensureSource(map: MapLibreMap, id: string) {
  if (!map.getSource(id)) {
    map.addSource(id, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
  }
}

function renderAll() {
  renderGrid()
  renderFeatures()
}

function renderGrid() {
  const map = mapRef.value
  if (!map) return
  const project = activeProject.value
  const grid = showSetup.value ? setupGrid.value : project?.grid
  const center = showSetup.value ? setupLocation.value : project?.location

  const areaSource = map.getSource('garden-grid-area') as GeoJSONSource | undefined
  const lineSource = map.getSource('garden-grid-lines') as GeoJSONSource | undefined
  if (!areaSource || !lineSource) return

  if (!grid || !center) {
    areaSource.setData({ type: 'FeatureCollection', features: [] })
    lineSource.setData({ type: 'FeatureCollection', features: [] })
    return
  }

  const data = gridToGeoJSON(center, grid)
  areaSource.setData(data.area)
  lineSource.setData(data.lines)
  if (map.getLayer('garden-grid-fill')) {
    map.setPaintProperty('garden-grid-fill', 'fill-opacity', showSetup.value ? 0.12 : 0.06)
  }
}

function renderFeatures() {
  const map = mapRef.value
  if (!map) return
  const pointSource = map.getSource('garden-draw-points') as GeoJSONSource | undefined
  const lineSource = map.getSource('garden-draw-lines') as GeoJSONSource | undefined
  const polygonSource = map.getSource('garden-draw-polygons') as GeoJSONSource | undefined
  if (!pointSource || !lineSource || !polygonSource) return

  const pointFeatures: GeoJSON.Feature[] = []
  const lineFeatures: GeoJSON.Feature[] = []
  const polygonFeatures: GeoJSON.Feature[] = []

  for (const feature of visibleFeatures.value) {
    const layer = activeProject.value?.layers.find(l => l.id === feature.layerId)
    if (!layer || !layer.visible) continue

    const style = layer.style
    const color = style.color ?? 'var(--garden-color-brand-primary)'
    const fillColor = style.fillColor ?? color
    const fillOpacity = style.fillOpacity ?? 0.3
    const layerOpacity = layer.opacity ?? 1
    const selected = garden.selectedFeatureId === feature.id

    if (feature.type === 'point') {
      pointFeatures.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: feature.geometry.coordinates as [number, number] },
        properties: { color, radius: style.radius ?? 6, opacity: 0.95, layerOpacity, selected, id: feature.id, label: feature.properties.label },
      })
    } else if (feature.type === 'line') {
      lineFeatures.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: feature.geometry.coordinates as [number, number][] },
        properties: { color, width: style.lineWidth ?? 2, opacity: 0.9, layerOpacity, selected, id: feature.id, label: feature.properties.label },
      })
    } else if (feature.type === 'polygon') {
      polygonFeatures.push({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [(feature.geometry as GeoJSON.Polygon).coordinates as unknown as [number, number][]] },
        properties: { color, fillColor, fillOpacity, opacity: 0.9, layerOpacity, selected, id: feature.id, label: feature.properties.label },
      })
    }
  }

  pointSource.setData({ type: 'FeatureCollection', features: pointFeatures })
  lineSource.setData({ type: 'FeatureCollection', features: lineFeatures })
  polygonSource.setData({ type: 'FeatureCollection', features: polygonFeatures })
}

function fitGrid(animate = false) {
  const map = mapRef.value
  if (!map) return
  const grid = showSetup.value ? setupGrid.value : activeProject.value?.grid
  const center = showSetup.value ? setupLocation.value : activeProject.value?.location
  if (!grid || !center) return
  const geometry = buildGridGeometry(center, grid)
  map.fitBounds(gridBounds(geometry.boundary), {
    padding: { top: 100, bottom: 180, left: 20, right: 20 },
    maxZoom: 21,
    duration: animate ? 600 : 0,
  })
}

// ── Setup wizard ────────────────────────────────────────────────────────────

function openSetup() {
  const project = activeProject.value
  setupName.value = project?.name ?? ''
  setupAddress.value = project?.address ?? ''
  setupLocation.value = { ...(project?.location ?? DEFAULT_LOCATION) }
  setupGrid.value = project?.grid ? { ...project.grid } : gridFromProject(project)
  showSetup.value = true
  mapRef.value?.flyTo({ center: [setupLocation.value.lng, setupLocation.value.lat], zoom: Math.max(18, mapRef.value.getZoom()), duration: 500 })
  nextTick(() => {
    renderGrid()
    fitGrid(true)
  })
}

function cancelSetup() {
  if (!activeProject.value?.grid) return
  showSetup.value = false
  nextTick(() => renderAll())
}

function confirmSetup() {
  const grid = normalizeGrid(setupGrid.value)
  garden.configureProject({
    name: setupName.value,
    address: setupAddress.value,
    location: setupLocation.value,
    grid,
  })
  showSetup.value = false
  setupGrid.value = { ...grid }
  nextTick(() => {
    renderAll()
    fitGrid(true)
    toast.success(t('tools.agroecologicalGarden.toasts.areaReady'))
  })
}

function gridFromProject(project: ReturnType<typeof useGardenProject>['activeProject'] | null): GardenGrid {
  const features = project?.layers.flatMap(layer => layer.features) ?? []
  if (features.length === 0) return { ...DEFAULT_GRID }
  const [[minLng, minLat], [maxLng, maxLat]] = computeBounds(features)
  const widthM = Math.max(2, haversineDistance([minLng, minLat], [maxLng, minLat]))
  const heightM = Math.max(2, haversineDistance([minLng, minLat], [minLng, maxLat]))
  const cellM = Math.max(0.5, Math.min(10, Math.round((Math.max(widthM, heightM) / 20) * 2) / 2))
  return normalizeGrid({ widthM, heightM, cellM })
}

// ── Drawing ─────────────────────────────────────────────────────────────────

function setMode(mode: DrawingMode) {
  if (mode !== activeMode.value) {
    activeDraw.value = null
    clearDrawPreview()
  }
  garden.setDrawingMode(mode)
  pendingPlant.value = null
  const map = mapRef.value
  if (map) {
    map.getCanvas().style.cursor = mode === 'pan' ? 'grab' : mode === 'select' ? 'default' : 'crosshair'
    if (mode === 'line' || mode === 'polygon') map.doubleClickZoom.disable()
    else map.doubleClickZoom.enable()
  }
  if (mode === 'select') garden.clearSelection()
}

function handleMapClick(lng: number, lat: number) {
  if (!isMapReady.value || !mapRef.value) return
  const mode = activeMode.value
  if (mode === 'select') {
    selectFeatureAt(lng, lat)
    return
  }
  if (mode === 'pan') return

  const layerId = resolveLayerForMode()
  if (!layerId) {
    toast.warning(t('tools.agroecologicalGarden.panels.noLayers'))
    return
  }
  const layer = activeProject.value?.layers.find(l => l.id === layerId)
  if (!layer || layer.locked) return

  if (mode === 'point') {
    const plant = pendingPlant.value
    const feature: GardenFeature = {
      id: generateId('feat'),
      type: 'point',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: { label: plant?.name ?? layerTypeLabel(layer.type), plantId: plant?.plantId, variety: '' },
    }
    garden.addFeature(feature, layerId)
    renderFeatures()
    pendingPlant.value = null
    toast.success(t('tools.agroecologicalGarden.toasts.featureAdded'))
    return
  }

  if (mode === 'line' || mode === 'polygon' || mode === 'measure') {
    if (!activeDraw.value) {
      activeDraw.value = {
        type: mode === 'polygon' ? 'polygon' : 'line',
        coords: [[lng, lat]],
        layerId,
        style: layer.style,
        featureId: generateId('feat'),
      }
    } else {
      activeDraw.value.coords.push([lng, lat])
      if (mode === 'measure') {
        garden.setMeasurement(createDistanceMeasurement(activeDraw.value.coords, unitSystem.value))
      }
    }
    updateDrawPreview(mapRef.value, lng, lat)
    if (mode === 'measure' && activeDraw.value.coords.length > 1) {
      garden.setMeasurement(createDistanceMeasurement(activeDraw.value.coords, unitSystem.value))
    }
  }
}

function resolveLayerForMode(): string | null {
  const active = garden.activeLayer
  if (active && !active.locked) return active.id
  const first = activeProject.value?.layers.find(layer => !layer.locked)
  if (first) {
    garden.setActiveLayer(first.id)
    return first.id
  }
  return null
}

function updateDrawPreview(map: MapLibreMap, lng: number, lat: number) {
  const draw = activeDraw.value
  const source = map.getSource('garden-active-draw') as GeoJSONSource | undefined
  if (!draw || !source) return
  const coords: [number, number][] = [...draw.coords, [lng, lat]]
  const feature: GeoJSON.Feature = draw.type === 'polygon'
    ? { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] }, properties: {} }
    : { type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} }
  source.setData({ type: 'FeatureCollection', features: [feature] })
}

function clearDrawPreview() {
  const map = mapRef.value
  if (!map) return
  const source = map.getSource('garden-active-draw') as GeoJSONSource | undefined
  source?.setData({ type: 'FeatureCollection', features: [] })
}

function finishDraw() {
  const map = mapRef.value
  const draw = activeDraw.value
  if (!map || !draw) return
  if (activeMode.value === 'measure') {
    activeDraw.value = null
    clearDrawPreview()
    return
  }
  if (draw.coords.length < 2) {
    cancelDraw()
    return
  }

  if (draw.type === 'line') {
    garden.addFeature({
      id: draw.featureId,
      type: 'line',
      geometry: { type: 'LineString', coordinates: draw.coords },
      properties: { label: layerTypeLabel(activeProject.value?.layers.find(l => l.id === draw.layerId)?.type ?? 'path') },
    }, draw.layerId)
  } else {
    const first = draw.coords[0]!
    const last = draw.coords[draw.coords.length - 1]!
    const ring = first[0] === last[0] && first[1] === last[1] ? draw.coords : [...draw.coords, first]
    garden.addFeature({
      id: draw.featureId,
      type: 'polygon',
      geometry: { type: 'Polygon', coordinates: [ring] },
      properties: { label: layerTypeLabel(activeProject.value?.layers.find(l => l.id === draw.layerId)?.type ?? 'bed') },
    }, draw.layerId)
  }

  activeDraw.value = null
  clearDrawPreview()
  renderFeatures()
  toast.success(t('tools.agroecologicalGarden.toasts.featureAdded'))
}

function cancelDraw() {
  activeDraw.value = null
  clearDrawPreview()
  garden.setMeasurement(null)
}

function selectFeatureAt(lng: number, lat: number) {
  const all = visibleFeatures.value
  let nearest: { id: string; dist: number } | null = null
  for (const feature of all) {
    const points = featurePoints(feature)
    for (const point of points) {
      const distance = haversineDistance([lng, lat], point)
      if (distance < 30 && (!nearest || distance < nearest.dist)) nearest = { id: feature.id, dist: distance }
    }
  }
  garden.selectFeature(nearest?.id ?? null)
  if (nearest) renderFeatures()
}

function featurePoints(feature: GardenFeature): [number, number][] {
  if (feature.type === 'point') return [feature.geometry.coordinates as [number, number]]
  if (feature.type === 'line') return feature.geometry.coordinates as [number, number][]
  return ((feature.geometry as GeoJSON.Polygon).coordinates as unknown as [number, number][][])[0] ?? []
}

// ── Plants ──────────────────────────────────────────────────────────────────

function toggleSheet(sheet: 'layers' | 'plants') {
  if (activeSheet.value === sheet) {
    closeSheet()
  } else {
    activeSheet.value = sheet
    sheetOpen.value = true
  }
}

function close() {
  emit('close')
}

function closeSheet() {
  sheetOpen.value = false
  activeSheet.value = null
}

function openPlantsTab() {
  toggleSheet('plants')
}

function selectPlant(plantId: string) {
  const plant = getPlant(plantId)
  if (!plant) return
  garden.setSelectedPlant(plantId)
  const layerType = layerTypeForPlant(plant.category)
  const layer = ensureLayer(layerType)
  if (!layer) {
    toast.warning(t('tools.agroecologicalGarden.panels.noLayers'))
    return
  }
  garden.setActiveLayer(layer.id)
  setMode('point')
  pendingPlant.value = { plantId: plant.id, name: plant.name }
  closeSheet()
}

function clearPendingPlant() {
  pendingPlant.value = null
  garden.setSelectedPlant(null)
}

function ensureLayer(type: GardenLayerType) {
  const project = activeProject.value
  if (!project) return null
  const existing = project.layers.find(layer => layer.type === type)
  if (existing) return existing
  return garden.addLayer(type)
}

function layerTypeForPlant(category: PlantCategory): GardenLayerType {
  if (category === 'native-tree') return 'native-tree'
  if (category === 'rhizome') return 'rhizome'
  if (category === 'cover-crop') return 'cover-crop'
  if (category === 'herb') return 'herb'
  return 'vegetable'
}

function plantIcon(category: string): string {
  const icons: Record<string, string> = {
    vegetable: '🥬',
    'native-tree': '🌳',
    rhizome: '🥔',
    'cover-crop': '🌾',
    herb: '🌿',
    fruit: '🍎',
    flower: '🌸',
  }
  return icons[category] ?? '🌱'
}

// ── Layers ──────────────────────────────────────────────────────────────────

function layerTypeLabel(type: GardenLayerType): string {
  const camel = type.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())
  return t(`tools.agroecologicalGarden.layers.layerTypes.${camel}`)
}

function addSelectedLayer() {
  garden.addLayer(newLayerType.value)
  showEmptyLayers.value = true
  toast.success(t('tools.agroecologicalGarden.toasts.layerAdded'))
}

function setLayerVisibility(layerId: string, visible: boolean) {
  garden.setLayerVisibility(layerId, visible)
  renderFeatures()
}

function setLayerOpacity(layerId: string, opacity: number) {
  garden.setLayerOpacity(layerId, opacity)
  renderFeatures()
}

function setLayerLocked(layerId: string, locked: boolean) {
  garden.setLayerLocked(layerId, locked)
}

function deleteLayer(layerId: string) {
  garden.deleteLayer(layerId)
  renderFeatures()
}

function setActiveLayer(layerId: string) {
  garden.setActiveLayer(layerId)
}

function deleteSelectedFeature() {
  if (!selectedFeatureId.value) return
  garden.deleteFeature(selectedFeatureId.value)
  renderFeatures()
}

function toggleUnit() {
  const next = unitSystem.value === 'metric' ? 'imperial' : 'metric'
  garden.setUnitSystem(next)
  if (measurement.value && activeDraw.value) {
    garden.setMeasurement(createDistanceMeasurement(activeDraw.value.coords, next))
  }
}

// ── Project actions ─────────────────────────────────────────────────────────

function undoEdit() {
  if (!canUndo.value) return
  garden.undo()
  renderFeatures()
}

function redoEdit() {
  if (!canRedo.value) return
  garden.redo()
  renderFeatures()
}

async function handleImportFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    const imported = garden.importProject(await file.text())
    if (!imported) {
      toast.error(t('tools.agroecologicalGarden.toasts.error'))
      return
    }
    setupGrid.value = imported.grid ? { ...imported.grid } : gridFromProject(imported)
    setupLocation.value = { ...imported.location }
    nextTick(() => {
      renderAll()
      if (imported.grid) fitGrid(true)
      else fitMapToFeatures()
    })
    toast.success(t('tools.agroecologicalGarden.toasts.imported'))
  } catch {
    toast.error(t('tools.agroecologicalGarden.toasts.error'))
  }
}

function saveProject() {
  garden.saveToStorage()
  toast.success(t('tools.agroecologicalGarden.toasts.saved'))
}

function exportProject(format: string) {
  const json = garden.exportProject(activeProject.value?.id || '')
  if (!json) return
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `garden-${activeProject.value?.name || 'project'}.${format === 'GeoJSON' ? 'geojson' : 'json'}`
  link.click()
  URL.revokeObjectURL(url)
  showExport.value = false
  toast.success(t('tools.agroecologicalGarden.toasts.exported'))
}

function fitMapToFeatures() {
  const map = mapRef.value
  const features = visibleFeatures.value
  if (!map || features.length === 0) return
  const bounds = computeBounds(features)
  if (bounds[0][0] === 0 && bounds[0][1] === 0 && bounds[1][0] === 0 && bounds[1][1] === 0) return
  map.fitBounds(bounds, { padding: 90, maxZoom: 20 })
}

// ── Keyboard shortcuts ──────────────────────────────────────────────────────

const MODE_SHORTCUTS: Record<string, DrawingMode> = { v: 'select', s: 'select', h: 'pan', p: 'point', l: 'line', g: 'polygon', m: 'measure' }

function handleKeyDown(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return

  const key = event.key.toLowerCase()
  if ((event.ctrlKey || event.metaKey) && key === 'z') {
    event.preventDefault()
    if (event.shiftKey) redoEdit()
    else undoEdit()
    return
  }
  if ((event.ctrlKey || event.metaKey) && key === 'y') {
    event.preventDefault()
    redoEdit()
    return
  }
  if (event.key === 'Escape') {
    if (showSetup.value) return
    if (sheetOpen.value) { closeSheet(); return }
    cancelDraw()
    return
  }
  if (event.key === 'Enter' && activeDraw.value) {
    event.preventDefault()
    finishDraw()
    return
  }
  if ((event.key === 'Delete' || event.key === 'Backspace') && selectedFeatureId.value) {
    event.preventDefault()
    deleteSelectedFeature()
    return
  }
  if (event.ctrlKey || event.metaKey || event.altKey) return
  const mode = MODE_SHORTCUTS[key]
  if (mode) setMode(mode)
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function trimNumber(value: number): string {
  return String(Math.round(value * 100) / 100)
}

// ── Lifecycle ───────────────────────────────────────────────────────────────

onMounted(() => {
  const project = garden.activeProject
  setupLocation.value = { ...(project?.location ?? DEFAULT_LOCATION) }
  setupGrid.value = project?.grid ? { ...project.grid } : gridFromProject(project)
  setupAddress.value = project?.address ?? ''
  setupName.value = project?.name ?? ''
  showSetup.value = !project?.grid
  if (typeof window !== 'undefined') sheetOpen.value = false

  nextTick(() => {
    initMap()
    if (showSetup.value) {
      mapRef.value?.once('idle', () => fitGrid(false))
    }
  })
  window.addEventListener('keydown', handleKeyDown)
})

watch([setupLocation, setupGrid], () => {
  if (showSetup.value) renderGrid()
}, { deep: true })

watch(showSetup, (open) => {
  if (open) nextTick(renderGrid)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  if (styleTimer) clearTimeout(styleTimer)
  resizeObserver?.disconnect()
  resizeObserver = null
  mapRef.value?.remove()
  mapRef.value = null
  isMapReady.value = false
  activeDraw.value = null
})

function triggerFileInput() {
  importInputRef.value?.click()
}
</script>

<style scoped>
/* ── CSS Variables (Theme-Aware) ─────────────────────────────────────────── */
:root {
  /* Light theme (default) */
  --garden-space-xs: 4px;
  --garden-space-sm: 8px;
  --garden-space-md: 12px;
  --garden-space-lg: 16px;
  --garden-space-xl: 24px;
  --garden-space-xxl: 32px;

  --garden-radius-sm: 6px;
  --garden-radius-md: 10px;
  --garden-radius-lg: 14px;
  --garden-radius-xl: 18px;
  --garden-radius-full: 999px;

  --garden-touch-sm: 40px;
  --garden-touch-md: 48px;
  --garden-touch-lg: 56px;

  --garden-transition-fast: 120ms ease-out;
  --garden-transition-base: 180ms ease-out;
  --garden-transition-slow: 250ms ease-out;
  --garden-transition-spring: 300ms cubic-bezier(0.34, 1.56, 0.64, 1);

  --garden-z-base: 10;
  --garden-z-toolbar: 100;
  --garden-z-sheet: 200;
  --garden-z-modal: 300;

  /* Light theme colors */
  --garden-color-neutral-50: #f8fafc;
  --garden-color-neutral-100: #f1f5f9;
  --garden-color-neutral-200: #e2e8f0;
  --garden-color-neutral-300: #cbd5e1;
  --garden-color-neutral-400: #94a3b8;
  --garden-color-neutral-500: #64748b;
  --garden-color-neutral-600: #475569;
  --garden-color-neutral-700: #334155;
  --garden-color-neutral-800: #1e293b;
  --garden-color-neutral-900: #0f172a;
  --garden-color-neutral-950: #020617;

  --garden-color-brand-50: #f0f9ff;
  --garden-color-brand-100: #e0f2fe;
  --garden-color-brand-200: #bae6fd;
  --garden-color-brand-300: #7dd3fc;
  --garden-color-brand-400: #38bdf8;
  --garden-color-brand-400: #38bdf8;
  --garden-color-brand-500: #0ea5e9;
  --garden-color-brand-600: #0284c7;
  --garden-color-brand-700: #0369a1;
  --garden-color-brand-800: #075985;
  --garden-color-brand-900: #0c4a6e;

  --garden-color-success-50: #f0fdf4;
  --garden-color-success-100: #dcfce7;
  --garden-color-success-500: #22c55e;
  --garden-color-success-600: #16a34a;
  --garden-color-success-700: #15803d;

  --garden-color-warning-50: #fffbeb;
  --garden-color-warning-100: #fef3c7;
  --garden-color-warning-500: #f59e0b;
  --garden-color-warning-600: #d97706;

  --garden-color-danger-50: #fef2f2;
  --garden-color-danger-100: #fee2e2;
  --garden-color-danger-500: #ef4444;
  --garden-color-danger-600: #dc2626;

  --garden-color-bg-primary: #f8fafc;
  --garden-color-bg-secondary: #f1f5f9;
  --garden-color-bg-tertiary: #e2e8f0;
  --garden-color-bg-inverse: #0f172a;

  --garden-color-surface-primary: #ffffff;
  --garden-color-surface-secondary: #f1f5f9;
  --garden-color-surface-tertiary: #e2e8f0;
  --garden-color-surface-hover: #f1f5f9;
  --garden-color-surface-active: #e2e8f0;

  --garden-color-border-primary: #cbd5e1;
  --garden-color-border-secondary: #e2e8f0;
  --garden-color-border-focus: #0ea5e9;
  --garden-color-border-error: #ef4444;

  --garden-color-text-primary: #020617;
  --garden-color-text-secondary: #64748b;
  --garden-color-text-muted: #64748b;
  --garden-color-text-inverse: #f8fafc;
  --garden-color-text-link: #38bdf8;

  --garden-color-brand-primary: #0ea5e9;
  --garden-color-brand-hover: #0284c7;
  --garden-color-brand-light: #f0f9ff;
  --garden-color-brand-dark: #0369a1;

  --garden-color-success-primary: #22c55e;
  --garden-color-success-hover: #16a34a;
  --garden-color-success-light: #f0fdf4;

  --garden-color-warning-primary: #f59e0b;
  --garden-color-warning-hover: #d97706;
  --garden-color-warning-light: #fffbeb;

  --garden-color-danger-primary: #ef4444;
  --garden-color-danger-hover: #dc2626;
  --garden-color-danger-light: #fef2f2;

  --garden-color-neutral-100: #f1f5f9;
}

/* Dark theme overrides */
@media (prefers-color-scheme: dark) {
  :root {
    --garden-color-neutral-50: #f8fafc;
    --garden-color-neutral-100: #f1f5f9;
    --garden-color-neutral-200: #e2e8f0;
    --garden-color-neutral-300: #cbd5e1;
    --garden-color-neutral-400: #94a3b8;
    --garden-color-neutral-500: #64748b;
    --garden-color-neutral-600: #475569;
    --garden-color-neutral-700: #334155;
    --garden-color-neutral-800: #1e293b;
    --garden-color-neutral-900: #0f172a;
    --garden-color-neutral-950: #020617;

    --garden-color-bg-primary: #020617;
    --garden-color-bg-secondary: #0f172a;
    --garden-color-bg-tertiary: #1e293b;
    --garden-color-bg-inverse: #f8fafc;

    --garden-color-surface-primary: #0f172a;
    --garden-color-surface-secondary: #1e293b;
    --garden-color-surface-tertiary: #334155;
    --garden-color-surface-hover: #1e293b;
    --garden-color-surface-active: #334155;

    --garden-color-border-primary: #334155;
    --garden-color-border-secondary: #1e293b;
    --garden-color-border-focus: #38bdf8;
    --garden-color-border-error: #f87171;

    --garden-color-text-primary: #f8fafc;
    --garden-color-text-secondary: #94a3b8;
    --garden-color-text-muted: #64748b;
    --garden-color-text-inverse: #020617;
    --garden-color-text-link: #7dd3fc;

    --garden-color-brand-primary: #38bdf8;
    --garden-color-brand-hover: #0ea5e9;
    --garden-color-brand-light: #0c4a6e;
    --garden-color-brand-dark: #0369a1;

    --garden-color-success-primary: #4ade80;
    --garden-color-success-hover: #22c55e;
    --garden-color-success-light: #052e16;

    --garden-color-warning-primary: #fbbf24;
    --garden-color-warning-hover: #f59e0b;
    --garden-color-warning-light: #422006;

    --garden-color-danger-primary: #f87171;
    --garden-color-danger-hover: #ef4444;
    --garden-color-danger-light: #450a0a;

    --garden-color-neutral-100: #1e293b;
  }
}

/* ── Main Layout ─────────────────────────────────────────────────────────── */
.garden-mobile {
  position: relative;
  width: 100%;
  height: 100dvh;
  background: var(--garden-color-bg-primary);
  color: var(--garden-color-text-primary);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: inherit;
}

.garden-map-layer {
  position: relative;
  flex: 1;
  overflow: hidden;
  background: var(--garden-color-bg-tertiary);
}

/* ── Map Loading/Error ───────────────────────────────────────────────────── */
.map-loading {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--garden-space-lg);
  background: var(--garden-color-surface-primary);
  color: var(--garden-color-text-primary);
  animation: fade-in var(--garden-transition-base) var(--garden-transition-spring);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--garden-color-border-secondary);
  border-top-color: var(--garden-color-brand-primary);
  border-radius: 50%;
  animation: spin var(--garden-transition-slow) linear infinite;
}

.loading-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--garden-color-text-secondary);
}

.loading-error {
  color: var(--garden-color-warning-primary);
  font-size: 13px;
  text-align: center;
  max-width: 280px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--garden-space-sm);
  border: none;
  border-radius: var(--garden-radius-md);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--garden-transition-fast) ease-out;
}
.btn:active { transform: scale(0.98); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-primary {
  background: var(--garden-color-brand-primary);
  color: var(--garden-color-text-inverse);
}
.btn-primary:hover:not(:disabled) { background: var(--garden-color-brand-hover); }

.btn-secondary {
  background: var(--garden-color-surface-secondary);
  color: var(--garden-color-text-primary);
  border: 1px solid var(--garden-color-border-primary);
}
.btn-secondary:hover:not(:disabled) { background: var(--garden-color-surface-hover); }

.btn-secondary:hover:not(:disabled) { background: var(--garden-color-surface-hover); }

.btn-ghost {
  background: transparent;
  color: var(--garden-color-text-secondary);
  border: 1px solid transparent;
}
.btn-ghost:hover:not(:disabled) { background: var(--garden-color-surface-hover); color: var(--garden-color-text-primary); }

.btn-danger {
  background: var(--garden-color-danger-primary);
  color: var(--garden-color-text-inverse);
}
.btn-danger:hover:not(:disabled) { background: var(--garden-color-danger-hover); }

.btn-full { width: 100%; }
.btn-sm { padding: var(--garden-space-xs) var(--garden-space-md); font-size: 12px; }

.retry-btn {
  margin-top: var(--garden-space-md);
  padding: var(--garden-space-sm) var(--garden-space-lg);
  background: var(--garden-color-warning-primary);
  color: var(--garden-color-bg-primary);
  border: none;
  border-radius: var(--garden-radius-md);
  font-weight: 600;
  cursor: pointer;
  transition: background var(--garden-transition-fast) ease-out;
}
.retry-btn:hover { background: var(--garden-color-warning-hover); }

.map-error-banner {
  position: absolute;
  top: var(--garden-space-md);
  left: 50%;
  transform: translateX(-50%);
  z-index: 25;
  display: flex;
  align-items: center;
  gap: var(--garden-space-md);
  padding: var(--garden-space-sm) var(--garden-space-md);
  background: var(--garden-color-warning-light);
  border: 1px solid var(--garden-color-warning-primary);
  border-radius: var(--garden-radius-full);
  color: var(--garden-color-warning-primary);
  font-size: 13px;
  animation: slide-down var(--garden-transition-base) var(--garden-transition-spring);
}

.btn-retry {
  padding: var(--garden-space-xs) var(--garden-space-md);
  background: transparent;
  border: 1px solid currentColor;
  border-radius: var(--garden-radius-sm);
  color: inherit;
  font-weight: 600;
  font-size: 12px;
  cursor: pointer;
  transition: background var(--garden-transition-fast) ease-out;
}
.btn-retry:hover { background: var(--garden-color-warning-primary); color: var(--garden-color-bg-primary); }

/* ── Top Bar ──────────────────────────────────────────────────────────────── */
.top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--garden-space-md);
  height: 64px;
  padding: 0 var(--garden-space-lg);
  background: var(--garden-color-surface-primary);
  border-bottom: 1px solid var(--garden-color-border-primary);
  box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03);
  transition: box-shadow var(--garden-transition-base) ease-out, background var(--garden-transition-base) ease-out;
}

.top-bar.scrolled {
  box-shadow: 0 4px 12px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04);
  background: var(--garden-color-surface-primary);
}

.title-section {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.title {
  font-size: 16px;
  font-weight: 700;
  color: var(--garden-color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.subtitle {
  font-size: 12px;
  color: var(--garden-color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.top-actions {
  display: flex;
  align-items: center;
  gap: var(--garden-space-sm);
}

.action-divider {
  width: 1px;
  height: 24px;
  background: var(--garden-color-border-secondary);
  margin: 0 var(--garden-space-sm);
}

.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border: none;
  border-radius: var(--garden-radius-md);
  background: var(--garden-color-surface-secondary);
  color: var(--garden-color-text-secondary);
  cursor: pointer;
  transition: background var(--garden-transition-fast) ease-out, color var(--garden-transition-fast) ease-out, transform var(--garden-transition-fast) ease-out;
}
.btn-icon:hover:not(:disabled) { background: var(--garden-color-surface-hover); color: var(--garden-color-text-primary); transform: scale(1.03); }
.btn-icon:active:not(:disabled) { transform: scale(0.97); }
.btn-icon:disabled { opacity: 0.4; cursor: not-allowed; }

.btn-grid-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--garden-space-sm);
  width: auto;
  padding: 0 var(--garden-space-md) 0 var(--garden-space-sm);
  background: var(--garden-color-brand-light);
  border: 1px solid var(--garden-color-brand-primary);
  color: var(--garden-color-brand-primary);
}
.btn-grid-chip:hover:not(:disabled) { background: var(--garden-color-brand-100); }
.chip-text {
  font-size: 11px;
  font-weight: 600;
  color: var(--garden-color-brand-primary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* ── Bottom Toolbar ──────────────────────────────────────────────────────── */
.bottom-toolbar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding: var(--garden-space-md) var(--garden-space-lg) max(var(--garden-space-md), env(safe-area-inset-bottom));
  background: var(--garden-color-surface-primary);
  border-top: 1px solid var(--garden-color-border-primary);
  box-shadow: 0 -1px 3px rgba(0,0,0,0.05), 0 -1px 2px rgba(0,0,0,0.03);
  transition: transform var(--garden-transition-base) ease-out;
}

.toolbar-main {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--garden-space-md);
  max-width: 600px;
  margin: 0 auto;
}

.mode-group {
  display: flex;
  align-items: center;
  gap: var(--garden-space-xs);
  padding: var(--garden-space-xs);
  background: var(--garden-color-surface-secondary);
  border: 1px solid var(--garden-color-border-primary);
  border-radius: var(--garden-radius-lg);
}

.toolbar-divider {
  width: 1px;
  height: 40px;
  background: var(--garden-color-border-secondary);
}

.mode-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--garden-space-xs);
  width: 56px;
  min-height: 56px;
  padding: var(--garden-space-sm) var(--garden-space-xs);
  border: none;
  border-radius: var(--garden-radius-md);
  background: transparent;
  color: var(--garden-color-text-secondary);
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--garden-transition-fast) ease-out;
  white-space: nowrap;
}
.mode-btn:hover { background: var(--garden-color-surface-hover); color: var(--garden-color-text-primary); }
.mode-btn:active { transform: scale(0.97); }
.mode-btn.active {
  background: var(--garden-color-brand-light);
  color: var(--garden-color-brand-primary);
  border: 1px solid var(--garden-color-brand-primary);
}
.mode-btn .icon { transition: transform var(--garden-transition-fast) ease-out; }
.mode-btn:hover .icon { transform: scale(1.1); }

.btn-plant.active {
  background: var(--garden-color-success-light);
  color: var(--garden-color-success-primary);
  border: 1px solid var(--garden-color-success-primary);
}

.mode-label {
  line-height: 1;
}

.toolbar-divider {
  width: 1px;
  height: 40px;
  background: var(--garden-color-border-secondary);
}

.sheet-indicator {
  position: absolute;
  bottom: calc(72px + var(--garden-space-md));
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: var(--garden-space-sm);
  padding: var(--garden-space-xs) var(--garden-space-md);
  background: var(--garden-color-brand-primary);
  border-radius: var(--garden-radius-full);
  color: var(--garden-color-text-inverse);
  font-size: 11px;
  font-weight: 600;
  box-shadow: 0 4px 16px rgba(14, 165, 233, 0.3);
  animation: slide-up var(--garden-transition-base) var(--garden-transition-spring);
  cursor: pointer;
}

/* ── FAB Column ──────────────────────────────────────────────────────────── */
.fab-column {
  position: absolute;
  right: var(--garden-space-lg);
  bottom: calc(72px + var(--garden-space-xl));
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: var(--garden-space-md);
  pointer-events: none;
}

.fab {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--garden-space-sm);
  width: 56px;
  height: 56px;
  border: none;
  border-radius: var(--garden-radius-full);
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08);
  transition: transform var(--garden-transition-spring), box-shadow var(--garden-transition-base) ease-out;
  animation: fab-in var(--garden-transition-slow) var(--garden-transition-spring) backwards;
}
.fab:hover { transform: scale(1.08); box-shadow: 0 8px 24px rgba(0,0,0,0.16); }
.fab:active { transform: scale(0.95); }

.fab-primary {
  background: var(--garden-color-brand-primary);
  color: var(--garden-color-bg-primary);
  animation-delay: 0ms;
}
.fab-primary:hover { background: var(--garden-color-brand-hover); }

.fab-danger {
  background: var(--garden-color-danger-primary);
  color: var(--garden-color-text-inverse);
  animation-delay: 60ms;
}
.fab-danger:hover { background: var(--garden-color-danger-hover); }

.fab-plant {
  background: var(--garden-color-success-primary);
  color: var(--garden-color-text-inverse);
  width: auto;
  padding: 0 var(--garden-space-lg);
  animation-delay: 120ms;
}
.fab-plant:hover { background: var(--garden-color-success-hover); }

.fab-label {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

/* ── Map Readout ─────────────────────────────────────────────────────────── */
.map-readout {
  position: absolute;
  bottom: calc(72px + var(--garden-space-md));
  left: 50%;
  transform: translateX(-50%);
  z-index: 50;
  display: flex;
  align-items: center;
  gap: var(--garden-space-lg);
  padding: var(--garden-space-sm) var(--garden-space-md);
  background: var(--garden-color-surface-primary);
  border: 1px solid var(--garden-color-border-primary);
  border-radius: var(--garden-radius-full);
  font-size: 11px;
  color: var(--garden-color-text-secondary);
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
  pointer-events: none;
  animation: fade-in var(--garden-transition-base) var(--garden-transition-spring) var(--garden-transition-base) both;
}

.readout-item { font-variant-numeric: tabular-nums; color: var(--garden-color-text-secondary); }

.grid-chip {
  border-left: 1px solid var(--garden-color-border-primary);
  padding-left: var(--garden-space-md);
  color: var(--garden-color-brand-primary);
  font-weight: 600;
}

/* ── Measurement Bar ─────────────────────────────────────────────────────── */
.measurement-bar {
  position: absolute;
  bottom: calc(72px + 60px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 50;
  display: flex;
  align-items: center;
  gap: var(--garden-space-md);
  padding: var(--garden-space-sm) var(--garden-space-lg);
  background: var(--garden-color-surface-primary);
  border: 1px solid var(--garden-color-brand-primary);
  border-radius: var(--garden-radius-lg);
  font-size: 13px;
  color: var(--garden-color-brand-primary);
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
  animation: slide-up var(--garden-transition-base) var(--garden-transition-spring);
}

.measure-label { font-weight: 500; }

/* ── Draw Actions ────────────────────────────────────────────────────────── */
.draw-actions {
  position: absolute;
  bottom: calc(72px + var(--garden-space-md));
  left: 50%;
  transform: translateX(-50%);
  z-index: 50;
  display: flex;
  gap: var(--garden-space-md);
  animation: slide-up var(--garden-transition-base) var(--garden-transition-spring);
}

/* ── Side Sheet (Mobile) ─────────────────────────────────────────────────── */
/* Handled by GardenSheetMobile component */

/* ── Modals ──────────────────────────────────────────────────────────────── */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--garden-space-lg);
  animation: fade-in var(--garden-transition-fast) ease-out;
}

.modal {
  width: 100%;
  max-width: 360px;
  background: var(--garden-color-surface-primary);
  border: 1px solid var(--garden-color-border-primary);
  border-radius: var(--garden-radius-xl);
  box-shadow: 0 24px 48px rgba(0,0,0,0.12), 0 0 0 1px var(--garden-color-border-primary);
  overflow: hidden;
  animation: slide-up var(--garden-transition-slow) var(--garden-transition-spring);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--garden-space-lg) var(--garden-space-xl);
  border-bottom: 1px solid var(--garden-color-border-primary);
}

.modal-header h3 {
  font-size: 16px;
  font-weight: 700;
  color: var(--garden-color-text-primary);
}

.modal-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: var(--garden-radius-md);
  background: transparent;
  color: var(--garden-color-text-secondary);
  cursor: pointer;
  transition: background var(--garden-transition-fast) ease-out, color var(--garden-transition-fast) ease-out, transform var(--garden-transition-fast) ease-out;
}
.modal-close:hover { background: var(--garden-color-surface-hover); color: var(--garden-color-text-primary); transform: scale(1.05); }
.modal-close:active { transform: scale(0.95); }

.modal-body {
  padding: var(--garden-space-xl);
  display: flex;
  flex-direction: column;
  gap: var(--garden-space-md);
}

.modal-hint {
  font-size: 13px;
  color: var(--garden-color-text-muted);
  margin-bottom: var(--garden-space-sm);
}

.modal-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--garden-space-lg);
  padding: var(--garden-space-md) var(--garden-space-lg);
  border: 1px solid var(--garden-color-border-primary);
  border-radius: var(--garden-radius-md);
  background: var(--garden-color-surface-secondary);
  color: var(--garden-color-text-primary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--garden-transition-fast) ease-out;
}
.modal-option:hover { background: var(--garden-color-surface-hover); border-color: var(--garden-color-border-focus); }

/* ── Sheet Content ───────────────────────────────────────────────────────── */
.sheet-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.plants-panel,
.layers-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.search-wrapper {
  position: relative;
  padding: var(--garden-space-lg);
  flex-shrink: 0;
}
.search-wrapper .icon {
  position: absolute;
  left: var(--garden-space-lg);
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  color: var(--garden-color-text-muted);
}
.field-input {
  width: 100%;
  padding: var(--garden-space-md) var(--garden-space-md) var(--garden-space-md) 44px;
  border: 1px solid var(--garden-color-border-primary);
  border-radius: var(--garden-radius-md);
  background: var(--garden-color-surface-secondary);
  color: var(--garden-color-text-primary);
  font-size: 14px;
  outline: none;
  transition: border-color var(--garden-transition-fast) ease-out, box-shadow var(--garden-transition-fast) ease-out, background var(--garden-transition-fast) ease-out;
}
.field-input:focus {
  border-color: var(--garden-color-border-focus);
  box-shadow: 0 0 0 3px var(--garden-color-brand-100);
  background: var(--garden-color-surface-primary);
}
.field-input:hover:not(:focus) { border-color: var(--garden-color-border-secondary); }

.category-chips {
  display: flex;
  gap: var(--garden-space-sm);
  padding: 0 var(--garden-space-lg) var(--garden-space-lg);
  overflow-x: auto;
  flex-shrink: 0;
  -webkit-overflow-scrolling: touch;
}
.category-chip {
  flex-shrink: 0;
  padding: var(--garden-space-xs) var(--garden-space-lg);
  border: 1px solid var(--garden-color-border-primary);
  border-radius: var(--garden-radius-full);
  background: transparent;
  color: var(--garden-color-text-secondary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--garden-transition-fast) ease-out;
  white-space: nowrap.
}
.category-chip:hover { background: var(--garden-color-surface-hover); color: var(--garden-color-text-primary); }
.category-chip.active {
  border-color: var(--garden-color-border-focus);
  background: var(--garden-color-brand-light);
  color: var(--garden-color-brand-primary);
}

.plant-list {
  flex: 1;
  overflow-y: auto.
  padding: 0 var(--garden-space-lg) var(--garden-space-xl).
  list-style: none.
  margin: 0.
}

.plant-item {
  display: flex.
  align-items: center.
  gap: var(--garden-space-md).
  padding: var(--garden-space-md).
  border-radius: var(--garden-radius-md).
  background: var(--garden-color-surface-secondary).
  cursor: pointer.
  transition: background var(--garden-transition-fast) ease-out, transform var(--garden-transition-fast) ease-out.
  margin-bottom: var(--garden-space-sm).
}
.plant-item:hover { background: var(--garden-color-surface-hover); transform: translateX(4px); }
.plant-item:active { transform: translateX(0) scale(0.98); }
.plant-item.selected {
  background: var(--garden-color-brand-light).
  border: 1px solid var(--garden-color-brand-primary).
}

.plant-emoji { font-size: 24px; line-height: 1; }

.plant-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: var(--garden-space-xs); }
.plant-name {
  font-size: 14px.
  font-weight: 600.
  color: var(--garden-color-text-primary).
  white-space: nowrap.
  overflow: hidden.
  text-overflow: ellipsis.
}
.plant-sci {
  font-size: 11px.
  color: var(--garden-color-text-muted).
  font-style: italic.
  white-space: nowrap.
  overflow: hidden.
  text-overflow: ellipsis.
}
.plant-category {
  font-size: 10px.
  font-weight: 600.
  color: var(--garden-color-text-muted).
  text-transform: uppercase.
  letter-spacing: 0.04em.
}

.layer-list {
  flex: 1.
  overflow-y: auto.
  padding: 0 var(--garden-space-lg) var(--garden-space-xl).
  list-style: none.
  margin: 0.
}

.layer-item {
  background: var(--garden-color-surface-secondary).
  border-radius: var(--garden-radius-md).
  margin-bottom: var(--garden-space-sm).
  overflow: hidden.
  transition: background var(--garden-transition-fast) ease-out.
}
.layer-item.active { background: var(--garden-color-brand-light); }

.layer-main {
  display: flex.
  align-items: center.
  gap: var(--garden-space-md).
  padding: var(--garden-space-md).
  cursor: pointer.
}

.layer-visibility {
  display: inline-flex.
  align-items: center.
  justify-content: center.
  width: 40px.
  height: 40px.
  border: none.
  border-radius: var(--garden-radius-md).
  background: transparent.
  color: var(--garden-color-text-secondary).
  cursor: pointer.
  transition: background var(--garden-transition-fast) ease-out, color var(--garden-transition-fast) ease-out.
}
.layer-visibility:hover { background: var(--garden-color-surface-hover); color: var(--garden-color-text-primary); }

.layer-color {
  width: 12px.
  height: 12px.
  border-radius: 3px.
  flex-shrink: 0.
}

.layer-name {
  flex: 1.
  font-size: 13px.
  font-weight: 600.
  color: var(--garden-color-text-primary).
  white-space: nowrap.
  overflow: hidden.
  text-overflow: ellipsis.
}

.layer-count {
  font-size: 11px.
  color: var(--garden-color-text-muted).
  font-variant-numeric: tabular-nums.
}

.layer-details {
  display: flex.
  align-items: center.
  justify-content: space-between.
  gap: var(--garden-space-md).
  padding: 0 var(--garden-space-lg) var(--garden-space-md).
  border-top: 1px solid var(--garden-color-border-primary).
  background: var(--garden-color-surface-tertiary).
}

.opacity-control {
  display: flex.
  align-items: center.
  gap: var(--garden-space-md).
  flex: 1.
  min-width: 0.
}
.opacity-control label {
  flex: 1.
  display: flex.
  align-items: center.
  cursor: pointer.
}
.opacity-control input[type="range"] {
  width: 100%.
  accent-color: var(--garden-color-brand-primary).
}
.opacity-value {
  font-size: 11px.
  color: var(--garden-color-text-muted).
  font-variant-numeric: tabular-nums.
  min-width: 40px.
  text-align: right.
}

.layer-actions {
  display: flex.
  gap: var(--garden-space-sm).
}
.btn-icon-sm {
  display: inline-flex.
  align-items: center.
  justify-content: center.
  width: 36px.
  height: 36px.
  border: none.
  border-radius: var(--garden-radius-sm).
  background: transparent.
  color: var(--garden-color-text-secondary).
  cursor: pointer.
  transition: background var(--garden-transition-fast) ease-out, color var(--garden-transition-fast) ease-out.
}
.btn-icon-sm:hover { background: var(--garden-color-surface-hover); color: var(--garden-color-text-primary); }
.btn-icon-sm.btn-danger:hover { color: var(--garden-color-danger-primary); }

.add-layer-row {
  display: flex.
  gap: var(--garden-space-md).
  padding: var(--garden-space-lg).
  flex-shrink: 0.
}
.field-select {
  flex: 1.
  padding: var(--garden-space-md) var(--garden-space-md).
  border: 1px solid var(--garden-color-border-primary).
  border-radius: var(--garden-radius-md).
  background: var(--garden-color-surface-secondary).
  color: var(--garden-color-text-primary).
  font-size: 13px.
  outline: none.
  appearance: none.
  transition: border-color var(--garden-transition-fast) ease-out, box-shadow var(--garden-transition-fast) ease-out.
}
.field-select:focus { border-color: var(--garden-color-border-focus); box-shadow: 0 0 0 3px var(--garden-color-brand-100); }

.checkbox-label {
  display: flex.
  align-items: center.
  gap: var(--garden-space-sm).
  padding: 0 var(--garden-space-lg) var(--garden-space-lg).
  font-size: 12px.
  color: var(--garden-color-text-muted).
  cursor: pointer.
}
.checkbox-label input[type="checkbox"] {
  width: 18px.
  height: 18px.
  accent-color: var(--garden-color-brand-primary).
}

.empty-state {
  display: flex.
  flex-direction: column.
  align-items: center.
  justify-content: center.
  gap: var(--garden-space-sm).
  padding: var(--garden-space-xl) var(--garden-space-lg).
  color: var(--garden-color-text-muted).
  text-align: center.
}
.empty-state .icon { width: 32px; height: 32px; color: var(--garden-color-text-muted); }
.empty-state p { font-size: 13px; }

/* ── Animations ──────────────────────────────────────────────────────────── */
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slide-down {
  from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
@keyframes slide-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
@keyframes fab-in {
  from { opacity: 0; transform: scale(0.8) translateY(20px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

/* ── Staggered animations ────────────────────────────────────────────────── */
.mode-group .mode-btn:nth-child(1) { animation: slide-up var(--garden-transition-base) var(--garden-transition-spring) 0.05s both; }
.mode-group .mode-btn:nth-child(2) { animation: slide-up var(--garden-transition-base) var(--garden-transition-spring) 0.1s both; }
.mode-group .mode-btn:nth-child(3) { animation: slide-up var(--garden-transition-base) var(--garden-transition-spring) 0.15s both; }
.mode-group .mode-btn:nth-child(4) { animation: slide-up var(--garden-transition-base) var(--garden-transition-spring) 0.2s both; }
.mode-group .mode-btn:nth-child(5) { animation: slide-up var(--garden-transition-base) var(--garden-transition-spring) 0.25s both; }
.mode-group .mode-btn:nth-child(6) { animation: slide-up var(--garden-transition-base) var(--garden-transition-spring) 0.3s both; }
.mode-group .mode-btn:nth-child(7) { animation: slide-up var(--garden-transition-base) var(--garden-transition-spring) 0.35s both; }
.mode-group .mode-btn:nth-child(8) { animation: slide-up var(--garden-transition-base) var(--garden-transition-spring) 0.35s both; }

.layer-item:nth-child(1) { animation: fade-in var(--garden-transition-fast) ease-out 0.05s both; }
.layer-item:nth-child(2) { animation: fade-in var(--garden-transition-fast) ease-out 0.1s both; }
.layer-item:nth-child(3) { animation: fade-in var(--garden-transition-fast) ease-out 0.15s both; }
.layer-item:nth-child(4) { animation: fade-in var(--garden-transition-fast) ease-out 0.2s both; }
.layer-item:nth-child(5) { animation: fade-in var(--garden-transition-fast) ease-out 0.25s both; }

.plant-item:nth-child(1) { animation: slide-up var(--garden-transition-fast) var(--garden-transition-spring) 0.02s both; }
.plant-item:nth-child(2) { animation: slide-up var(--garden-transition-fast) var(--garden-transition-spring) 0.04s both; }
.plant-item:nth-child(3) { animation: slide-up var(--garden-transition-fast) var(--garden-transition-spring) 0.06s both; }
.plant-item:nth-child(4) { animation: slide-up var(--garden-transition-fast) var(--garden-transition-spring) 0.08s both; }
.plant-item:nth-child(5) { animation: slide-up var(--garden-transition-fast) var(--garden-transition-spring) 0.1s both; }
.plant-item:nth-child(6) { animation: slide-up var(--garden-transition-fast) var(--garden-transition-spring) 0.12s both; }
.plant-item:nth-child(7) { animation: slide-up var(--garden-transition-fast) var(--garden-transition-spring) 0.14s both; }
.plant-item:nth-child(8) { animation: slide-up var(--garden-transition-fast) var(--garden-transition-spring) 0.16s both; }
.plant-item:nth-child(9) { animation: slide-up var(--garden-transition-fast) var(--garden-transition-spring) 0.18s both; }
.plant-item:nth-child(10) { animation: slide-up var(--garden-transition-fast) var(--garden-transition-spring) 0.2s both; }

.fab:nth-child(1) { animation-delay: 0ms; }
.fab:nth-child(2) { animation-delay: 60ms; }
.fab:nth-child(3) { animation-delay: 120ms; }

/* ── Reduced Motion ──────────────────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .garden-mobile,
  .top-bar,
  .bottom-toolbar,
  .mode-btn,
  .fab,
  .map-readout,
  .measurement-bar,
  .draw-actions,
  .modal,
  .sheet,
  .plant-item,
  .layer-item,
  .category-chip,
  .mode-btn {
    animation: none !important;
    transition-duration: 0.01ms !important;
  }
  .mode-btn.active { animation: none !important; }
}
</style>