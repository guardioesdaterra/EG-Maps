<!--
  components/tools/garden/GardenToolMobile.vue
  @why Mobile-first, full-screen garden editor with modern UX.
  @component GardenToolMobile
  @emits close: []
  @deps vue; maplibre-gl; @/composables/useGardenProject; @/composables/useToast; @/composables/useI18n;
        @/lib/garden-*; @/components/ui/*; @/components/tools/garden/GardenSetupWizardMobile.vue
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
          <button class="retry-btn" @click="retryMap">{{ t('tools.agroecologicalGarden.map.retry') }}</button>
        </p>
      </div>

      <!-- Map error banner -->
      <div v-else-if="mapError" class="map-error-banner" role="alert">
        <Icon name="tabler:alert-triangle" class="w-5 h-5" />
        <span>{{ t('tools.agroecologicalGarden.map.loadError') }}</span>
        <button @click="retryMap" class="btn-retry">{{ t('tools.agroecologicalGarden.map.retry') }}</button>
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
        <header class="top-bar" :class="{ 'scrolled': mapScrolled }">
          <button class="btn-icon" @click="close" aria-label="{{ t('general.back') }}">
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
        <footer class="bottom-toolbar" :class="{ 'expanded': activeSheet !== null }">
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
          <button class="measure-unit" @click="toggleUnit">
            {{ unitSystem === 'metric' ? t('tools.agroecologicalGarden.measurement.metric') : t('tools.agroecologicalGarden.measurement.imperial') }}
          </button>
        </div>

        <!-- Drawing Actions -->
        <div v-if="isDrawing" class="draw-actions">
          <button class="btn btn-primary" @click="finishDraw">
            <Icon name="tabler:check" class="w-4 h-4" />
            {{ t('tools.agroecologicalGarden.drawActions.finish') }}
          </button>
          <button class="btn btn-ghost" @click="cancelDraw">
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
                class="search-input"
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
              <select v-model="newLayerType" class="layer-select" :aria-label="t('tools.agroecologicalGarden.panels.addLayer')">
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

function triggerFileInput() {
  importInputRef.value?.click()
}
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
      paint: { 'fill-color': '#22d3ee', 'fill-opacity': 0.06 },
    })
  }
  if (!map.getLayer('garden-grid-lines')) {
    map.addLayer({
      id: 'garden-grid-lines',
      type: 'line',
      source: 'garden-grid-lines',
      paint: {
        'line-color': ['case', ['==', ['get', 'kind'], 'boundary'], '#22d3ee', '#67e8f9'],
        'line-width': ['case', ['==', ['get', 'kind'], 'boundary'], 2.5, 1],
        'line-opacity': ['case', ['==', ['get', 'kind'], 'boundary'], 0.95, 0.4],
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
        'circle-stroke-color': ['case', ['==', ['get', 'selected'], true], '#22d3ee', '#ffffff'],
        'circle-stroke-width': ['case', ['==', ['get', 'selected'], true], 3, 1],
      },
    })
  }
  if (!map.getLayer('garden-active-line')) {
    map.addLayer({
      id: 'garden-active-line',
      type: 'line',
      source: 'garden-active-draw',
      paint: { 'line-color': '#0ea5e9', 'line-width': 3, 'line-opacity': 0.9, 'line-dasharray': [4, 2] },
    })
  }
  if (!map.getLayer('garden-active-polygon')) {
    map.addLayer({
      id: 'garden-active-polygon',
      type: 'fill',
      source: 'garden-active-draw',
      filter: ['==', ['geometry-type'], 'Polygon'],
      paint: { 'fill-color': '#0ea5e9', 'fill-opacity': 0.2 },
    })
  }
  if (!map.getLayer('garden-active-point')) {
    map.addLayer({
      id: 'garden-active-point',
      type: 'circle',
      source: 'garden-active-draw',
      filter: ['==', ['geometry-type'], 'Point'],
      paint: { 'circle-color': '#0ea5e9', 'circle-radius': 5, 'circle-opacity': 0.9 },
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
    map.setPaintProperty('garden-grid-fill', 'fill-opacity', showSetup.value ? 0.1 : 0.05)
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
    const color = style.color ?? '#0ea5e9'
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
</script>

<style scoped>
/* ── CSS Variables for theming ───────────────────────────────────────────── */
:root {
  --toolbar-h: 88px;
  --topbar-h: 64px;
  --sheet-h: 60vh;
  --fab-size: 56px;
  --btn-size: 48px;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-full: 999px;
  --transition-fast: 150ms;
  --transition-base: 250ms;
  --transition-slow: 350ms;
  --ease-out: cubic-bezier(0.25, 0.1, 0.25, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* ── Main Layout ─────────────────────────────────────────────────────────── */
.garden-mobile {
  position: relative;
  width: 100%;
  height: 100dvh;
  background: var(--bg-primary);
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: inherit;
}

.garden-map-layer {
  position: relative;
  flex: 1;
  overflow: hidden;
  background: #0b1210;
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
  gap: 1rem;
  background: #07110d;
  color: #e5e5e5;
  animation: fade-in 0.3s var(--ease-out);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(34, 211, 238, 0.2);
  border-top-color: #22d3ee;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  font-size: 14px;
  font-weight: 500;
}

.loading-error {
  color: #fcd34d;
  font-size: 13px;
  text-align: center;
  max-width: 280px;
}

.retry-btn {
  margin-top: 0.5rem;
  padding: 0.5rem 1rem;
  background: #22d3ee;
  color: #0b1210;
  border: none;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s var(--ease-out);
}
.retry-btn:hover { background: #06b6d4; }

.map-error-banner {
  position: absolute;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 25;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: rgba(20, 14, 4, 0.95);
  border: 1px solid rgba(245, 158, 11, 0.5);
  border-radius: var(--radius-full);
  color: #fcd34d;
  font-size: 13px;
  backdrop-filter: blur(12px);
  animation: slide-down 0.3s var(--ease-spring);
}

.btn-retry {
  padding: 0.25rem 0.75rem;
  background: transparent;
  border: 1px solid currentColor;
  border-radius: var(--radius-sm);
  color: inherit;
  font-weight: 600;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s var(--ease-out);
}
.btn-retry:hover { background: rgba(245, 158, 11, 0.2); }

/* ── Top Bar ──────────────────────────────────────────────────────────────── */
.top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  height: var(--topbar-h);
  padding: 0 1rem;
  background: linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%);
  backdrop-filter: blur(20px) saturate(1.5);
  -webkit-backdrop-filter: blur(20px) saturate(1.5);
  transition: background 0.3s var(--ease-out), box-shadow 0.3s var(--ease-out);
}

.top-bar.scrolled {
  background: linear-gradient(180deg, rgba(0,0,0,0.85) 0%, transparent 100%);
  box-shadow: 0 4px 24px rgba(0,0,0,0.3);
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
  color: #fff;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.subtitle {
  font-size: 11px;
  color: rgba(255,255,255,0.7);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.action-divider {
  width: 1px;
  height: 24px;
  background: rgba(255,255,255,0.15);
  margin: 0 0.25rem;
}

.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--btn-size);
  height: var(--btn-size);
  border: none;
  border-radius: var(--radius-md);
  background: rgba(255,255,255,0.1);
  color: #fff;
  cursor: pointer;
  transition: background 0.15s var(--ease-out), transform 0.1s var(--ease-out);
  backdrop-filter: blur(10px);
}
.btn-icon:hover:not(:disabled) { background: rgba(255,255,255,0.2); transform: scale(1.05); }
.btn-icon:active:not(:disabled) { transform: scale(0.95); }
.btn-icon:disabled { opacity: 0.3; cursor: not-allowed; }

.btn-grid-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  width: auto;
  padding: 0 1rem 0 0.75rem;
  background: rgba(6, 182, 212, 0.2);
  border: 1px solid rgba(6, 182, 212, 0.4);
}
.btn-grid-chip:hover:not(:disabled) { background: rgba(6, 182, 212, 0.3); }
.chip-text {
  font-size: 11px;
  font-weight: 600;
  color: #67e8f9;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* ── Bottom Toolbar ──────────────────────────────────────────────────────── */
.bottom-toolbar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 30;
  padding: 0.75rem 1rem max(0.75rem, env(safe-area-inset-bottom));
  background: linear-gradient(0deg, rgba(0,0,0,0.85) 0%, transparent 100%);
  backdrop-filter: blur(20px) saturate(1.5);
  -webkit-backdrop-filter: blur(20px) saturate(1.5);
  transition: transform 0.3s var(--ease-out);
}

.toolbar-main {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  max-width: 600px;
  margin: 0 auto;
}

.mode-group {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: var(--radius-lg);
  backdrop-filter: blur(12px);
}

.toolbar-divider {
  width: 1px;
  height: 36px;
  background: rgba(255,255,255,0.12);
}

.mode-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.125rem;
  width: 56px;
  min-height: 56px;
  padding: 0.5rem 0.375rem;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: rgba(255,255,255,0.7);
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s var(--ease-out);
  white-space: nowrap;
}
.mode-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }
.mode-btn:active { transform: scale(0.97); }
.mode-btn.active {
  background: rgba(6, 182, 212, 0.2);
  color: #22d3ee;
  border: 1px solid rgba(6, 182, 212, 0.4);
}
.mode-btn .icon { transition: transform 0.2s var(--ease-spring); }
.mode-btn:hover .icon { transform: scale(1.15); }

.btn-plant.active {
  background: rgba(39, 174, 96, 0.2);
  color: #27ae60;
  border-color: rgba(39, 174, 96, 0.4);
}

.mode-label {
  line-height: 1;
}

.sheet-indicator {
  position: absolute;
  bottom: calc(var(--toolbar-h) + 1rem);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background: rgba(6, 182, 212, 0.9);
  border-radius: var(--radius-full);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  box-shadow: 0 4px 16px rgba(6, 182, 212, 0.4);
  animation: slide-up 0.25s var(--ease-spring);
  cursor: pointer;
}

/* ── FAB Column ──────────────────────────────────────────────────────────── */
.fab-column {
  position: absolute;
  right: 1rem;
  bottom: calc(var(--toolbar-h) + 1.5rem);
  z-index: 25;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  pointer-events: none;
}

.fab {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: var(--fab-size);
  height: var(--fab-size);
  border: none;
  border-radius: var(--radius-full);
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0,0,0,0.3), 0 0 0 2px rgba(255,255,255,0.1);
  transition: transform 0.2s var(--ease-spring), box-shadow 0.2s var(--ease-out);
  animation: fab-in 0.3s var(--ease-spring) backwards;
}
.fab:hover { transform: scale(1.1); box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
.fab:active { transform: scale(0.95); }

.fab-primary {
  background: #22d3ee;
  color: #0b1210;
  animation-delay: 0ms;
}
.fab-primary:hover { background: #06b6d4; }

.fab-danger {
  background: #ef4444;
  color: #fff;
  animation-delay: 50ms;
}
.fab-danger:hover { background: #dc2626; }

.fab-plant {
  background: #27ae60;
  color: #fff;
  width: auto;
  padding: 0 1rem;
  animation-delay: 100ms;
}
.fab-plant:hover { background: #1e8a49; }

.fab-label {
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

/* ── Map Readout ─────────────────────────────────────────────────────────── */
.map-readout {
  position: absolute;
  bottom: calc(var(--toolbar-h) + 1rem);
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.375rem 0.75rem;
  background: rgba(9, 14, 13, 0.85);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: var(--radius-full);
  font-size: 11px;
  color: #d1d5db;
  backdrop-filter: blur(10px);
  pointer-events: none;
  animation: fade-in 0.3s var(--ease-out) 0.2s both;
}

.readout-item { font-variant-numeric: tabular-nums; }

.grid-chip {
  border-left: 1px solid rgba(255,255,255,0.15);
  padding-left: 0.75rem;
  color: #67e8f9;
  font-weight: 600;
}

/* ── Measurement Bar ─────────────────────────────────────────────────────── */
.measurement-bar {
  position: absolute;
  bottom: calc(var(--toolbar-h) + 4rem);
  left: 50%;
  transform: translateX(-50%);
  z-index: 22;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
  background: rgba(9, 14, 13, 0.92);
  border: 1px solid rgba(34, 211, 238, 0.5);
  border-radius: var(--radius-lg);
  font-size: 13px;
  color: #67e8f9;
  backdrop-filter: blur(12px);
  animation: slide-up 0.3s var(--ease-spring);
}

.measure-unit {
  padding: 0.125rem 0.5rem;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: var(--radius-full);
  font-size: 10px;
  color: #e5e7eb;
  cursor: pointer;
  transition: all 0.15s var(--ease-out);
}
.measure-unit:hover { background: rgba(255,255,255,0.1); border-color: #67e8f9; color: #67e8f9; }

/* ── Draw Actions ────────────────────────────────────────────────────────── */
.draw-actions {
  position: absolute;
  bottom: calc(var(--toolbar-h) + 1rem);
  left: 50%;
  transform: translateX(-50%);
  z-index: 24;
  display: flex;
  gap: 0.75rem;
  animation: slide-up 0.25s var(--ease-spring);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s var(--ease-out);
}
.btn:active { transform: scale(0.98); }

.btn-primary {
  background: #22d3ee;
  color: #0b1210;
}
.btn-primary:hover { background: #06b6d4; }

.btn-ghost {
  background: rgba(255,255,255,0.1);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.2);
}
.btn-ghost:hover { background: rgba(255,255,255,0.2); }

.btn-danger {
  background: #ef4444;
  color: #fff;
}
.btn-danger:hover { background: #dc2626; }

.btn-full { width: 100%; }

/* ── Side Sheet (Mobile) ─────────────────────────────────────────────────── */
/* Handled by GardenSheetMobile component */

/* ── Modals ──────────────────────────────────────────────────────────────── */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  animation: fade-in 0.2s var(--ease-out);
}

.modal {
  width: 100%;
  max-width: 360px;
  background: var(--panel-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: 0 24px 48px rgba(0,0,0,0.4);
  overflow: hidden;
  animation: slide-up 0.3s var(--ease-spring);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--glass-border);
}

.modal-header h3 {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}

.modal-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.15s var(--ease-out), color 0.15s var(--ease-out);
}
.modal-close:hover { background: var(--bg-secondary); color: var(--text-primary); }

.modal-body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.modal-hint {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}

.modal-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  background: var(--input-bg);
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s var(--ease-out);
}
.modal-option:hover { background: var(--bg-secondary); border-color: var(--ring); }

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
  padding: 0.75rem;
  flex-shrink: 0;
}
.search-wrapper .icon {
  position: absolute;
  left: 1.5rem;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  color: var(--text-muted);
}
.search-input {
  width: 100%;
  padding: 0.75rem 0.75rem 0.75rem 2.75rem;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  background: var(--input-bg);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s var(--ease-out), box-shadow 0.15s var(--ease-out);
}
.search-input:focus {
  border-color: var(--ring);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--ring) 25%, transparent);
}

.category-chips {
  display: flex;
  gap: 0.375rem;
  padding: 0 0.75rem 0.75rem;
  overflow-x: auto;
  flex-shrink: 0;
  -webkit-overflow-scrolling: touch;
}
.category-chip {
  flex-shrink: 0;
  padding: 0.375rem 0.875rem;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s var(--ease-out);
  white-space: nowrap;
}
.category-chip:hover { background: var(--bg-secondary); color: var(--text-primary); }
.category-chip.active {
  border-color: var(--ring);
  background: rgba(6, 182, 212, 0.12);
  color: var(--ring);
}

.plant-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 0.75rem 1rem;
  list-style: none;
  margin: 0;
}

.plant-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: var(--radius-md);
  background: var(--input-bg);
  cursor: pointer;
  transition: background 0.15s var(--ease-out), transform 0.1s var(--ease-out);
  margin-bottom: 0.5rem;
}
.plant-item:hover { background: var(--bg-secondary); transform: translateX(4px); }
.plant-item:active { transform: translateX(0) scale(0.98); }
.plant-item.selected {
  background: rgba(6, 182, 212, 0.1);
  border: 1px solid rgba(6, 182, 212, 0.3);
}

.plant-emoji { font-size: 24px; line-height: 1; }

.plant-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.125rem; }
.plant-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.plant-sci {
  font-size: 11px;
  color: var(--text-muted);
  font-style: italic;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.plant-category {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.layer-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 0.75rem 1rem;
  list-style: none;
  margin: 0;
}

.layer-item {
  background: var(--input-bg);
  border-radius: var(--radius-md);
  margin-bottom: 0.5rem;
  overflow: hidden;
  transition: background 0.15s var(--ease-out);
}
.layer-item.active { background: rgba(6, 182, 212, 0.07); }

.layer-main {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  cursor: pointer;
}

.layer-visibility {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: background 0.15s var(--ease-out), color 0.15s var(--ease-out);
}
.layer-visibility:hover { background: var(--bg-secondary); color: var(--text-primary); }

.layer-color {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  flex-shrink: 0;
}

.layer-name {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.layer-count {
  font-size: 11px;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.layer-details {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0 0.75rem 0.75rem;
  border-top: 1px solid var(--glass-border);
  background: rgba(0,0,0,0.15);
}

.opacity-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}
.opacity-control label {
  flex: 1;
  display: flex;
  align-items: center;
  cursor: pointer;
}
.opacity-control input[type="range"] {
  width: 100%;
  accent-color: var(--ring);
}
.opacity-value {
  font-size: 11px;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
  min-width: 40px;
  text-align: right;
}

.layer-actions {
  display: flex;
  gap: 0.375rem;
}
.btn-icon-sm {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: background 0.15s var(--ease-out), color 0.15s var(--ease-out);
}
.btn-icon-sm:hover { background: var(--bg-secondary); color: var(--text-primary); }
.btn-icon-sm.btn-danger:hover { color: #ef4444; }

.add-layer-row {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem;
  flex-shrink: 0;
}
.layer-select {
  flex: 1;
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  background: var(--input-bg);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  appearance: none;
  transition: border-color 0.15s var(--ease-out), box-shadow 0.15s var(--ease-out);
}
.layer-select:focus { border-color: var(--ring); box-shadow: 0 0 0 2px color-mix(in srgb, var(--ring) 25%, transparent); }

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 0.75rem 0.75rem;
  font-size: 12px;
  color: var(--text-muted);
  cursor: pointer;
}
.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: var(--ring);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem 1rem;
  color: var(--text-muted);
  text-align: center;
}
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
@keyframes spin {
  to { transform: rotate(360deg); }
}
@keyframes fab-in {
  from { opacity: 0; transform: scale(0.8) translateY(20px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

/* ── Staggered animations ────────────────────────────────────────────────── */
.mode-group .mode-btn:nth-child(1) { animation: slide-up 0.3s var(--ease-spring) 0.05s both; }
.mode-group .mode-btn:nth-child(2) { animation: slide-up 0.3s var(--ease-spring) 0.1s both; }
.mode-group .mode-btn:nth-child(3) { animation: slide-up 0.3s var(--ease-spring) 0.15s both; }
.mode-group .mode-btn:nth-child(4) { animation: slide-up 0.3s var(--ease-spring) 0.2s both; }
.mode-group .mode-btn:nth-child(5) { animation: slide-up 0.3s var(--ease-spring) 0.25s both; }
.mode-group .mode-btn:nth-child(6) { animation: slide-up 0.3s var(--ease-spring) 0.3s both; }
.mode-group .mode-btn:nth-child(7) { animation: slide-up 0.3s var(--ease-spring) 0.35s both; }
.mode-group .mode-btn:nth-child(8) { animation: slide-up 0.3s var(--ease-spring) 0.35s both; }

.layer-item:nth-child(1) { animation: fade-in 0.25s var(--ease-out) 0.05s both; }
.layer-item:nth-child(2) { animation: fade-in 0.25s var(--ease-out) 0.1s both; }
.layer-item:nth-child(3) { animation: fade-in 0.25s var(--ease-out) 0.15s both; }
.layer-item:nth-child(4) { animation: fade-in 0.25s var(--ease-out) 0.2s both; }
.layer-item:nth-child(5) { animation: fade-in 0.25s var(--ease-out) 0.25s both; }

.plant-item:nth-child(1) { animation: slide-up 0.25s var(--ease-spring) 0.02s both; }
.plant-item:nth-child(2) { animation: slide-up 0.25s var(--ease-spring) 0.04s both; }
.plant-item:nth-child(3) { animation: slide-up 0.25s var(--ease-spring) 0.06s both; }
.plant-item:nth-child(4) { animation: slide-up 0.25s var(--ease-spring) 0.08s both; }
.plant-item:nth-child(5) { animation: slide-up 0.25s var(--ease-spring) 0.1s both; }
.plant-item:nth-child(6) { animation: slide-up 0.25s var(--ease-spring) 0.12s both; }
.plant-item:nth-child(7) { animation: slide-up 0.25s var(--ease-spring) 0.14s both; }
.plant-item:nth-child(8) { animation: slide-up 0.25s var(--ease-spring) 0.16s both; }

.fab:nth-child(1) { animation-delay: 0ms; }
.fab:nth-child(2) { animation-delay: 50ms; }
.fab:nth-child(3) { animation-delay: 100ms; }

/* ── Reduced Motion ──────────────────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* ── Safe Area / Mobile ──────────────────────────────────────────────────── */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .bottom-toolbar { padding-bottom: max(0.75rem, env(safe-area-inset-bottom)); }
  .fab-column { bottom: calc(var(--toolbar-h) + 1.5rem + env(safe-area-inset-bottom)); }
  .draw-actions { bottom: calc(var(--toolbar-h) + 1rem + env(safe-area-inset-bottom)); }
}
</style>