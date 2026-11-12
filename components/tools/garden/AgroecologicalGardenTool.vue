<!--
  components/tools/garden/AgroecologicalGardenTool.vue
  @why Full-screen garden editor for Earth Guardians Crews. First run asks for
       the area address and a metric X/Y grid, then opens a satellite workspace
       with layer, plant and measurement tools.
  @component AgroecologicalGardenTool
  @emits close: []
  @deps vue; maplibre-gl; @/composables/useGardenProject; @/composables/useToast;
        @/composables/useI18n; @/composables/useMapTileStyle; @/lib/garden-*;
        @/lib/tile-styles; @/components/tools/garden/AreaSetupWizard.vue
  @connections pages/tools/[tool].vue
-->
<template>
  <div class="garden-tool">
    <!-- ── Top bar ───────────────────────────────────────────────────────── -->
    <header class="garden-tool__bar">
      <button type="button" class="garden-tool__icon-btn" :aria-label="t('general.back')" @click="emit('close')">
        <Icon name="tabler:arrow-left" class="h-5 w-5" />
      </button>

      <div class="min-w-0 flex-1">
        <h1 class="truncate text-[13px] font-bold leading-tight text-[var(--text-primary)]">
          {{ activeProject?.name || t('tools.agroecologicalGarden.title') }}
        </h1>
        <p class="mt-0.5 truncate text-[10px] leading-tight text-[var(--text-muted)]">
          {{ subtitle }}
        </p>
      </div>

      <div class="garden-tool__actions">
        <button
          v-if="activeProject?.grid && !setupOpen"
          type="button"
          class="garden-tool__pill"
          :title="t('tools.agroecologicalGarden.onboarding.editGrid')"
          @click="openSetup"
        >
          <Icon name="tabler:grid-dots" class="h-3.5 w-3.5" />
          <span class="hidden sm:inline">{{ gridChip }}</span>
          <Icon name="tabler:chevron-right" class="hidden h-3 w-3 sm:inline" />
        </button>

        <span class="garden-tool__sep" />

        <button type="button" class="garden-tool__icon-btn" :disabled="!garden.canUndo" :aria-label="t('tools.agroecologicalGarden.toolbar.undo')" @click="undoEdit">
          <Icon name="tabler:arrow-back-up" class="h-4 w-4" />
        </button>
        <button type="button" class="garden-tool__icon-btn" :disabled="!garden.canRedo" :aria-label="t('tools.agroecologicalGarden.toolbar.redo')" @click="redoEdit">
          <Icon name="tabler:arrow-forward-up" class="h-4 w-4" />
        </button>

        <span class="garden-tool__sep garden-tool__sep--optional" />

        <button type="button" class="garden-tool__icon-btn garden-tool__optional" :aria-label="t('tools.agroecologicalGarden.project.import')" @click="openImportPicker">
          <Icon name="tabler:file-import" class="h-4 w-4" />
        </button>
        <input ref="importInputRef" type="file" accept="application/json,.json,.geojson" class="hidden" :aria-label="t('tools.agroecologicalGarden.project.import')" @change="handleImportFile" />
        <button type="button" class="garden-tool__icon-btn" :aria-label="t('tools.agroecologicalGarden.project.save')" @click="saveProject">
          <Icon name="tabler:device-floppy" class="h-4 w-4" />
        </button>
        <button type="button" class="garden-tool__icon-btn" :aria-label="t('tools.agroecologicalGarden.project.export')" @click="showExport = true">
          <Icon name="tabler:share" class="h-4 w-4" />
        </button>
      </div>
    </header>

    <!-- ── Map + panels ──────────────────────────────────────────────────── -->
    <div class="garden-tool__body">
      <div class="garden-tool__map-wrap">
        <div ref="mapContainerRef" class="garden-tool__map" @contextmenu.prevent />

        <!-- Map state overlays -->
        <div v-if="mapLoading" class="garden-tool__map-state" role="status" aria-live="polite">
          <Icon name="tabler:loader-2" class="h-6 w-6 animate-spin text-cyan-400" />
          <p class="text-xs font-semibold">{{ t('tools.agroecologicalGarden.map.loading') }}</p>
          <p v-if="mapError" class="max-w-[16rem] text-center text-[10px] text-amber-300">
            {{ t('tools.agroecologicalGarden.map.loadError') }}
          </p>
          <button v-if="mapError" type="button" class="garden-tool__pill mt-1" @click="retryMap">
            <Icon name="tabler:refresh" class="h-3.5 w-3.5" />
            {{ t('tools.agroecologicalGarden.map.retry') }}
          </button>
        </div>

        <div v-else-if="mapError" class="garden-tool__map-banner" role="status">
          <Icon name="tabler:alert-triangle" class="h-3.5 w-3.5" />
          <span>{{ t('tools.agroecologicalGarden.map.loadError') }}</span>
          <button type="button" class="underline" @click="retryMap">{{ t('tools.agroecologicalGarden.map.retry') }}</button>
        </div>

        <!-- First-run wizard -->
        <AreaSetupWizard
          v-if="setupOpen"
          ref="wizardRef"
          v-model:location="setupLocation"
          v-model:grid="setupGrid"
          v-model:address="setupAddress"
          v-model:name="setupName"
          :can-cancel="Boolean(activeProject?.grid)"
          @fly-to="flyTo"
          @fit-grid="fitGrid(true)"
          @confirm="confirmSetup"
          @cancel="cancelSetup"
        />

        <template v-else>
          <!-- Drawing rail -->
          <div class="garden-tool__rail" role="toolbar" :aria-label="t('tools.agroecologicalGarden.draw')">
            <button
              v-for="mode in drawingModes"
              :key="mode.key"
              type="button"
              class="garden-tool__mode"
              :class="{ 'is-active': activeMode === mode.key }"
              :aria-label="t(mode.labelKey)"
              :aria-pressed="activeMode === mode.key"
              :title="t(mode.labelKey)"
              @click="setMode(mode.key)"
            >
              <Icon :name="mode.icon" class="h-4 w-4" />
              <span>{{ t(mode.shortKey) }}</span>
            </button>

            <span class="my-1 h-px w-6 bg-white/15" />

            <button
              type="button"
              class="garden-tool__mode"
              :class="{ 'is-active': panelTab === 'plants' && panelOpen }"
              :aria-label="t('tools.agroecologicalGarden.plantLibrary.title')"
              :title="t('tools.agroecologicalGarden.plantLibrary.title')"
              @click="openPlantsTab"
            >
              <Icon name="tabler:plant" class="h-4 w-4" />
              <span>{{ t('tools.agroecologicalGarden.placePlant') }}</span>
            </button>

            <button
              v-if="activeProject?.grid"
              type="button"
              class="garden-tool__mode"
              :aria-label="t('tools.agroecologicalGarden.map.zoomToGrid')"
              :title="t('tools.agroecologicalGarden.map.zoomToGrid')"
              @click="fitGrid(true)"
            >
              <Icon name="tabler:target-arrow" class="h-4 w-4" />
              <span>{{ t('tools.agroecologicalGarden.map.fit') }}</span>
            </button>
          </div>

          <!-- Map readout -->
          <div class="garden-tool__readout">
            <span v-if="coordinate" class="font-mono">{{ coordinate.lat.toFixed(5) }}, {{ coordinate.lng.toFixed(5) }}</span>
            <span v-if="zoomLevel" class="font-mono">z{{ zoomLevel }}</span>
            <span v-if="gridSummaryChip" class="garden-tool__readout-chip">{{ gridSummaryChip }}</span>
          </div>

          <!-- Measurement -->
          <div v-if="measurement" class="garden-tool__measure">
            <span class="font-semibold">{{ measurement.label }}</span>
            <button type="button" class="garden-tool__unit" @click="toggleUnit">
              {{ unitSystem === 'metric' ? t('tools.agroecologicalGarden.measurement.metric') : t('tools.agroecologicalGarden.measurement.imperial') }}
            </button>
          </div>

          <!-- In-progress drawing actions -->
          <div v-if="isDrawing" class="garden-tool__draw-actions">
            <button type="button" class="garden-tool__pill garden-tool__pill--ok" @click="finishDraw">
              <Icon name="tabler:check" class="h-3.5 w-3.5" />
              {{ t('tools.agroecologicalGarden.drawActions.finish') }}
            </button>
            <button type="button" class="garden-tool__pill" @click="cancelDraw">
              <Icon name="tabler:x" class="h-3.5 w-3.5" />
              {{ t('tools.agroecologicalGarden.drawActions.cancel') }}
            </button>
          </div>

          <!-- Pending plant -->
          <div v-if="pendingPlant" class="garden-tool__planting">
            <Icon name="tabler:plant" class="h-4 w-4" />
            <span>{{ t('tools.agroecologicalGarden.panels.planting', { name: pendingPlant.name }) }}</span>
            <button type="button" class="underline" @click="clearPendingPlant">{{ t('tools.agroecologicalGarden.panels.cancelPlant') }}</button>
          </div>

          <!-- Mobile panel toggle -->
          <button type="button" class="garden-tool__panel-toggle" :aria-label="t('tools.agroecologicalGarden.panels.panel')" @click="panelOpen = !panelOpen">
            <Icon name="tabler:layout-sidebar-right-collapse" class="h-4 w-4" />
          </button>
        </template>
      </div>

      <!-- Right panel -->
      <aside v-if="!setupOpen" class="garden-tool__panel" :class="{ 'is-open': panelOpen }">
        <div class="garden-tool__tabs" role="tablist">
          <button type="button" role="tab" :aria-selected="panelTab === 'layers'" :class="{ 'is-active': panelTab === 'layers' }" @click="panelTab = 'layers'">
            <Icon name="gis:layers" class="h-3.5 w-3.5" />
            {{ t('tools.agroecologicalGarden.panels.layers') }}
          </button>
          <button type="button" role="tab" :aria-selected="panelTab === 'plants'" :class="{ 'is-active': panelTab === 'plants' }" @click="openPlantsTab">
            <Icon name="tabler:plant" class="h-3.5 w-3.5" />
            {{ t('tools.agroecologicalGarden.panels.plants') }}
          </button>
          <button type="button" class="garden-tool__panel-close" :aria-label="t('general.close')" @click="panelOpen = false">
            <Icon name="tabler:x" class="h-4 w-4" />
          </button>
        </div>

        <!-- Layers -->
        <div v-if="panelTab === 'layers'" class="garden-tool__panel-body">
          <div class="garden-tool__add-layer">
            <select v-model="newLayerType" class="garden-tool__select" :aria-label="t('tools.agroecologicalGarden.panels.addLayer')">
              <optgroup v-for="group in layerGroups" :key="group.key" :label="t(group.labelKey)">
                <option v-for="type in group.types" :key="type" :value="type">{{ layerTypeLabel(type) }}</option>
              </optgroup>
            </select>
            <button type="button" class="garden-tool__icon-btn garden-tool__icon-btn--solid" :aria-label="t('tools.agroecologicalGarden.panels.addLayer')" @click="addSelectedLayer">
              <Icon name="tabler:plus" class="h-4 w-4" />
            </button>
          </div>

          <label class="garden-tool__check">
            <input v-model="showEmptyLayers" type="checkbox" />
            {{ showEmptyLayers ? t('tools.agroecologicalGarden.panels.hideEmpty') : t('tools.agroecologicalGarden.panels.showEmpty') }}
          </label>

          <p v-if="!layerList.length" class="garden-tool__empty">{{ t('tools.agroecologicalGarden.panels.noLayers') }}</p>

          <ul class="space-y-1" role="list">
            <li v-for="layer in layerList" :key="layer.id" class="garden-tool__layer" :class="{ 'is-active': activeLayerId === layer.id }">
              <div class="flex items-center gap-1.5">
                <button type="button" class="garden-tool__mini" :aria-label="t('tools.agroecologicalGarden.layers.visibility')" @click="setLayerVisibility(layer.id, !layer.visible)">
                  <Icon :name="layer.visible ? 'tabler:eye' : 'tabler:eye-off'" class="h-3.5 w-3.5" :class="layer.visible ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'" />
                </button>
                <span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ backgroundColor: layer.style.color }" />
                <button type="button" class="min-w-0 flex-1 truncate text-left text-[11px] font-semibold" @click="setActiveLayer(layer.id)">
                  {{ layerTypeLabel(layer.type) }}
                </button>
                <span class="text-[9px] font-mono text-[var(--text-muted)]">{{ layer.features.length }}</span>
                <button type="button" class="garden-tool__mini" :aria-label="t('tools.agroecologicalGarden.layers.lock')" @click="setLayerLocked(layer.id, !layer.locked)">
                  <Icon :name="layer.locked ? 'tabler:lock' : 'tabler:lock-open'" class="h-3.5 w-3.5" />
                </button>
                <button type="button" class="garden-tool__mini garden-tool__mini--danger" :aria-label="t('tools.agroecologicalGarden.layers.delete')" @click="deleteLayer(layer.id)">
                  <Icon name="tabler:trash-x" class="h-3.5 w-3.5" />
                </button>
              </div>
              <div v-if="activeLayerId === layer.id" class="mt-1 flex items-center gap-2 pl-7">
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  class="h-1 flex-1 cursor-pointer accent-cyan-500"
                  :value="layer.opacity"
                  :aria-label="t('tools.agroecologicalGarden.layers.opacity')"
                  @input="setLayerOpacity(layer.id, Number(($event.target as HTMLInputElement).value))"
                />
                <span class="w-7 text-right font-mono text-[9px] text-[var(--text-muted)]">{{ Math.round(layer.opacity * 100) }}%</span>
              </div>
            </li>
          </ul>

          <p v-if="selectedFeatureId" class="mt-3">
            <button type="button" class="garden-tool__danger w-full justify-center" @click="deleteSelectedFeature">
              <Icon name="tabler:trash" class="h-3.5 w-3.5" />
              {{ t('tools.agroecologicalGarden.drawActions.deleteSelected') }}
            </button>
          </p>
        </div>

        <!-- Plants -->
        <div v-else class="garden-tool__panel-body">
          <div class="relative">
            <Icon name="tabler:search" class="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input v-model="plantSearch" type="search" class="garden-tool__select w-full !pl-8" :placeholder="t('tools.agroecologicalGarden.plantLibrary.search')" />
          </div>

          <div class="mt-2 flex flex-wrap gap-1">
            <button type="button" class="garden-tool__chip" :class="{ 'is-active': plantCategory === 'all' }" @click="plantCategory = 'all'">
              {{ t('tools.agroecologicalGarden.plantLibrary.categories.all') }}
            </button>
            <button
              v-for="category in plantCategories"
              :key="category"
              type="button"
              class="garden-tool__chip"
              :class="{ 'is-active': plantCategory === category }"
              @click="plantCategory = category"
            >
              {{ t(PLANT_CATEGORY_KEYS[category]) }}
            </button>
          </div>

          <p v-if="!filteredPlants.length" class="garden-tool__empty">{{ t('tools.agroecologicalGarden.emptyStates.noPlants') }}</p>

          <ul class="mt-2 space-y-0.5" role="list">
            <li v-for="plant in filteredPlants" :key="plant.id">
              <button type="button" class="garden-tool__plant" :class="{ 'is-active': garden.selectedPlantId === plant.id }" @click="selectPlant(plant.id)">
                <span class="text-base leading-none">{{ plantIcon(plant.category) }}</span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-[11px] font-semibold">{{ plant.name }}</span>
                  <span class="block truncate text-[9px] text-[var(--text-muted)]">{{ plant.scientificName }}</span>
                </span>
                <span class="shrink-0 text-[8px] uppercase tracking-wide text-[var(--text-muted)]">{{ plant.category.replace('-', ' ') }}</span>
              </button>
            </li>
          </ul>
        </div>
      </aside>
    </div>

    <!-- Export modal -->
    <Teleport to="body">
      <div v-if="showExport" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" @click.self="showExport = false">
        <div class="w-full max-w-md rounded-xl border border-[var(--glass-border)] bg-[var(--panel-bg)] p-5 shadow-2xl">
          <h3 class="mb-3 text-sm font-bold text-[var(--text-primary)]">{{ t('tools.agroecologicalGarden.project.export') }}</h3>
          <div class="mb-4 space-y-2">
            <button v-for="fmt in exportFormats" :key="fmt" type="button" class="garden-tool__ghost w-full justify-between px-3 py-2 text-xs" @click="exportProject(fmt)">
              {{ fmt }}
              <Icon name="tabler:arrow-narrow-right" class="h-4 w-4" />
            </button>
          </div>
          <button type="button" class="garden-tool__ghost w-full justify-center text-sm" @click="showExport = false">
            {{ t('general.close') }}
          </button>
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
import AreaSetupWizard from '@/components/tools/garden/AreaSetupWizard.vue'
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
const coordinate = ref<{ lat: number; lng: number } | null>(null)
const zoomLevel = ref<number | null>(null)
let styleTimer: ReturnType<typeof setTimeout> | null = null
let resizeObserver: ResizeObserver | null = null
let fallbackLevel = 0
let tileErrors = 0

// ── Setup wizard state ──────────────────────────────────────────────────────
const setupOpen = ref(false)
const wizardRef = ref<InstanceType<typeof AreaSetupWizard> | null>(null)
const setupLocation = ref<GardenLocation>({ ...DEFAULT_LOCATION })
const setupGrid = ref<GardenGrid>({ ...DEFAULT_GRID })
const setupAddress = ref('')
const setupName = ref('')

// ── UI state ────────────────────────────────────────────────────────────────
const panelOpen = ref(false)
const panelTab = ref<'layers' | 'plants'>('layers')
const showEmptyLayers = ref(false)
const newLayerType = ref<GardenLayerType>('bed')
const plantSearch = ref('')
const plantCategory = ref<PlantCategory | 'all'>('all')
const showExport = ref(false)
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

const subtitle = computed(() => {
  if (setupOpen.value) return t('tools.agroecologicalGarden.onboarding.locationHint')
  if (activeProject.value?.address) return activeProject.value.address
  if (gridChip.value) return gridChip.value
  return activeProject.value?.description || t('tools.agroecologicalGarden.description')
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
  // Level 0: MapTiler (with key), Level 1: CARTO Voyager (no key), Level 2: ESRI Satellite
  fallbackLevel = apiKey ? 0 : 1
  return buildGardenStyle(apiKey, tileStyleDef(mapStyle.styleId.value).maptilerStyle)
}

function getStyleForLevel(level: number) {
  if (level === 0) {
    const apiKey = String(useRuntimeConfig().public.maptilerApiKey || '')
    return buildGardenStyle(apiKey, tileStyleDef(mapStyle.styleId.value).maptilerStyle)
  }
  if (level === 1) return streetsStyle()
  return satelliteStyle()
}

function initMap() {
  if (!mapContainerRef.value || mapRef.value) return

  // Ensure container has dimensions
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

  console.log('[Garden] Map created, waiting for style.load...')

  map.on('style.load', () => {
    console.log('[Garden] style.load event fired')
    if (styleTimer) {
      clearTimeout(styleTimer)
      styleTimer = null
    }
    isMapReady.value = true
    mapError.value = false
    tileErrors = 0
    setupMapLayers(map)
    renderAll()
    if (!didInitialView && activeProject.value?.grid && !setupOpen.value) {
      didInitialView = true
      fitGrid(false)
    }
  })

  map.on('idle', () => {
    console.log('[Garden] idle event fired')
    isMapReady.value = true
    mapError.value = false
  })

  map.on('error', (event) => {
    console.error('[Garden] Map error:', event.error)
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
    if (setupOpen.value) {
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

  styleTimer = setTimeout(() => {
    console.warn('[Garden] Style load timeout, applying fallback...')
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
    console.error('[Garden] All fallbacks failed')
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
  console.log('[Garden] Retrying with fallbackLevel:', fallbackLevel)
  map.setStyle(getStyleForLevel(fallbackLevel))
  styleTimer = setTimeout(() => {
    console.warn('[Garden] Retry style load timeout')
    if (!map.isStyleLoaded()) mapError.value = true
  }, 5_000)
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
  const grid = setupOpen.value ? setupGrid.value : project?.grid
  const center = setupOpen.value ? setupLocation.value : project?.location

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
    map.setPaintProperty('garden-grid-fill', 'fill-opacity', setupOpen.value ? 0.1 : 0.05)
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
  const grid = setupOpen.value ? setupGrid.value : activeProject.value?.grid
  const center = setupOpen.value ? setupLocation.value : activeProject.value?.location
  if (!grid || !center) return
  const geometry = buildGridGeometry(center, grid)
  map.fitBounds(gridBounds(geometry.boundary), {
    padding: { top: 90, bottom: 90, left: 90, right: panelOpen.value && !setupOpen.value ? 360 : 90 },
    maxZoom: 21,
    duration: animate ? 600 : 0,
  })
}

function fitMapToFeatures() {
  const map = mapRef.value
  const features = visibleFeatures.value
  if (!map || features.length === 0) return
  const bounds = computeBounds(features)
  if (bounds[0][0] === 0 && bounds[0][1] === 0 && bounds[1][0] === 0 && bounds[1][1] === 0) return
  map.fitBounds(bounds, { padding: 90, maxZoom: 20 })
}

// ── Setup wizard ────────────────────────────────────────────────────────────

function openSetup() {
  const project = activeProject.value
  setupName.value = project?.name ?? ''
  setupAddress.value = project?.address ?? ''
  setupLocation.value = { ...(project?.location ?? DEFAULT_LOCATION) }
  setupGrid.value = project?.grid ? { ...project.grid } : gridFromProject(project)
  setupOpen.value = true
  mapRef.value?.flyTo({ center: [setupLocation.value.lng, setupLocation.value.lat], zoom: Math.max(18, mapRef.value.getZoom()), duration: 500 })
  nextTick(() => {
    renderGrid()
    fitGrid(true)
  })
}

function cancelSetup() {
  if (!activeProject.value?.grid) return
  setupOpen.value = false
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
  setupOpen.value = false
  setupGrid.value = { ...grid }
  nextTick(() => {
    renderAll()
    fitGrid(true)
    panelOpen.value = true
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

function openPlantsTab() {
  panelTab.value = 'plants'
  panelOpen.value = true
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
  panelTab.value = 'plants'
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
  panelTab.value = 'layers'
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

function openImportPicker() {
  importInputRef.value?.click()
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
    if (setupOpen.value) return
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
  setupOpen.value = !project?.grid
  if (typeof window !== 'undefined') panelOpen.value = window.innerWidth >= 768

  nextTick(() => {
    initMap()
    if (setupOpen.value) {
      mapRef.value?.once('idle', () => fitGrid(false))
    }
  })
  window.addEventListener('keydown', handleKeyDown)
})

watch([setupLocation, setupGrid], () => {
  if (setupOpen.value) renderGrid()
}, { deep: true })

watch(setupOpen, (open) => {
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
/* ── Animation keyframes ─────────────────────────────────────────────────── */
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fade-in-down {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fade-in-scale {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes slide-in-right {
  from { opacity: 0; transform: translateX(100%); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes slide-in-left {
  from { opacity: 0; transform: translateX(-100%); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes slide-in-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes glow-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(6, 182, 212, 0.4); }
  50% { box-shadow: 0 0 12px 4px rgba(6, 182, 212, 0.2); }
}

.garden-tool {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-primary);
  color: var(--text-primary);
  animation: fade-in-up 0.4s var(--ease-out-expo);
}

.garden-tool__bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 3.25rem;
  flex-shrink: 0;
  border-bottom: 1px solid var(--glass-border);
  background: var(--panel-bg);
  padding: 0.4rem 0.65rem;
  backdrop-filter: blur(16px) saturate(1.4);
  -webkit-backdrop-filter: blur(16px) saturate(1.4);
  z-index: 20;
  animation: fade-in-down 0.35s var(--ease-out-expo);
}

.garden-tool__actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.garden-tool__sep {
  height: 1.5rem;
  width: 1px;
  background: var(--glass-border);
  margin: 0 0.15rem;
  animation: fade-in-up 0.3s var(--ease-out-expo) 0.1s both;
}

.garden-tool__icon-btn {
  display: inline-flex;
  min-width: 2rem;
  min-height: 2rem;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 7px;
  color: var(--text-secondary);
  background: transparent;
  cursor: pointer;
  transition: background 0.15s var(--ease-out-soft), color 0.15s var(--ease-out-soft), border-color 0.15s var(--ease-out-soft), transform 0.1s var(--ease-out-soft);
}
.garden-tool__icon-btn:hover:not(:disabled) { background: var(--bg-secondary); color: var(--text-primary); transform: scale(1.05); }
.garden-tool__icon-btn:active:not(:disabled) { transform: scale(0.95); }
.garden-tool__icon-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.garden-tool__icon-btn--solid {
  border-color: var(--ring);
  background: var(--ring);
  color: #fff;
}
.garden-tool__icon-btn--solid:hover { background: color-mix(in srgb, var(--ring) 85%, white); }

.garden-tool__pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid var(--glass-border);
  border-radius: 999px;
  padding: 0.28rem 0.6rem;
  font-size: 10px;
  font-weight: 700;
  color: var(--text-secondary);
  background: var(--input-bg);
  cursor: pointer;
  transition: background 0.15s var(--ease-out-soft), color 0.15s var(--ease-out-soft), border-color 0.15s var(--ease-out-soft), transform 0.1s var(--ease-out-soft), box-shadow 0.15s var(--ease-out-soft);
}
.garden-tool__pill:hover { color: var(--text-primary); border-color: var(--ring); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); }
.garden-tool__pill:active { transform: translateY(0) scale(0.98); }
.garden-tool__pill--ok { border-color: #15803d; background: #15803d; color: #fff; }
.garden-tool__pill--ok:hover { background: #16a34a; border-color: #16a34a; box-shadow: 0 4px 12px rgba(21, 128, 61, 0.3); }

.garden-tool__body {
  display: flex;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.garden-tool__map-wrap {
  position: relative;
  min-width: 0;
  flex: 1;
  overflow: hidden;
  background: #0b1210;
}

.garden-tool__map {
  position: absolute;
  inset: 0;
}

.garden-tool__map-state {
  position: absolute;
  inset: 0;
  z-index: 25;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: #07110d;
  color: #e5e5e5;
  animation: fade-in-scale 0.3s var(--ease-out-expo);
}
.garden-tool__map-state .icon {
  animation: spin-slow 1.2s linear infinite;
}

.garden-tool__map-banner {
  position: absolute;
  top: 0.6rem;
  left: 50%;
  z-index: 26;
  display: flex;
  transform: translateX(-50%);
  align-items: center;
  gap: 0.4rem;
  border-radius: 999px;
  border: 1px solid rgba(245, 158, 11, 0.45);
  background: rgba(20, 14, 4, 0.9);
  padding: 0.3rem 0.6rem;
  font-size: 10px;
  color: #fcd34d;
  backdrop-filter: blur(8px);
  white-space: nowrap;
  animation: fade-in-down 0.3s var(--ease-out-back);
}

.garden-tool__rail {
  position: absolute;
  top: 0.65rem;
  left: 0.65rem;
  z-index: 22;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 12px;
  background: rgba(9, 14, 13, 0.86);
  padding: 0.3rem;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(10px);
  animation: slide-in-left 0.4s var(--ease-out-expo);
}

.garden-tool__mode {
  display: flex;
  width: 2.9rem;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 0.32rem 0.15rem;
  color: #cbd5e1;
  background: transparent;
  cursor: pointer;
  transition: background 0.12s var(--ease-out-soft), color 0.12s var(--ease-out-soft), border-color 0.12s var(--ease-out-soft), transform 0.1s var(--ease-out-soft);
}
.garden-tool__mode span {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.garden-tool__mode:hover { background: rgba(255, 255, 255, 0.08); color: #fff; transform: translateY(-1px); }
.garden-tool__mode:active { transform: translateY(0) scale(0.98); }
.garden-tool__mode .icon { transition: transform 0.2s var(--ease-spring); }
.garden-tool__mode:hover .icon { transform: scale(1.15); }

.garden-tool__mode.is-active {
  border-color: rgba(34, 211, 238, 0.6);
  background: rgba(34, 211, 238, 0.16);
  color: #67e8f9;
  animation: glow-pulse 2s ease-in-out infinite;
}
.garden-tool__mode.is-active .icon { transform: scale(1.1); }

.garden-tool__readout {
  position: absolute;
  bottom: 0.65rem;
  left: 50%;
  z-index: 21;
  display: flex;
  transform: translateX(-50%);
  align-items: center;
  gap: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  background: rgba(9, 14, 13, 0.8);
  padding: 0.25rem 0.6rem;
  font-size: 9px;
  color: #d1d5db;
  backdrop-filter: blur(8px);
  white-space: nowrap;
  pointer-events: none;
  animation: fade-in-up 0.35s var(--ease-out-expo) 0.2s both;
}
.garden-tool__readout-chip {
  border-left: 1px solid rgba(255, 255, 255, 0.2);
  padding-left: 0.5rem;
  color: #67e8f9;
}

.garden-tool__measure {
  position: absolute;
  bottom: 3.2rem;
  left: 50%;
  z-index: 22;
  display: flex;
  transform: translateX(-50%);
  align-items: center;
  gap: 0.5rem;
  border: 1px solid rgba(34, 211, 238, 0.5);
  border-radius: 8px;
  background: rgba(9, 14, 13, 0.92);
  padding: 0.3rem 0.55rem;
  font-size: 11px;
  color: #67e8f9;
  animation: slide-in-up 0.3s var(--ease-out-back);
}
.garden-tool__unit {
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  padding: 0.08rem 0.35rem;
  font-size: 8px;
  color: #e5e7eb;
  cursor: pointer;
  transition: background 0.12s var(--ease-out-soft), color 0.12s var(--ease-out-soft), border-color 0.12s var(--ease-out-soft);
}
.garden-tool__unit:hover { background: rgba(255, 255, 255, 0.1); border-color: #67e8f9; color: #67e8f9; }

.garden-tool__draw-actions,
.garden-tool__planting {
  position: absolute;
  bottom: 5.6rem;
  left: 50%;
  z-index: 24;
  display: flex;
  transform: translateX(-50%);
  align-items: center;
  gap: 0.4rem;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(9, 14, 13, 0.92);
  padding: 0.35rem 0.45rem;
  color: #e5e7eb;
  font-size: 10px;
  backdrop-filter: blur(10px);
  white-space: nowrap;
  animation: slide-in-up 0.3s var(--ease-out-back);
}
.garden-tool__draw-actions .garden-tool__pill { color: #e5e7eb; background: rgba(255, 255, 255, 0.06); border-color: rgba(255, 255, 255, 0.2); }
.garden-tool__planting { color: #bbf7d0; border-color: rgba(74, 222, 128, 0.45); }

.garden-tool__panel-toggle {
  position: absolute;
  top: 0.65rem;
  right: 0.65rem;
  z-index: 23;
  display: none;
  align-items: center;
  justify-content: center;
  width: 2.2rem;
  height: 2.2rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 9px;
  background: rgba(9, 14, 13, 0.86);
  color: #e5e7eb;
  transition: background 0.15s var(--ease-out-soft), color 0.15s var(--ease-out-soft), border-color 0.15s var(--ease-out-soft), transform 0.1s var(--ease-out-soft);
}
.garden-tool__panel-toggle:hover { background: rgba(255, 255, 255, 0.1); color: #fff; transform: scale(1.05); }
.garden-tool__panel-toggle:active { transform: scale(0.95); }

.garden-tool__panel {
  display: flex;
  width: 20rem;
  flex-shrink: 0;
  flex-direction: column;
  min-height: 0;
  border-left: 1px solid var(--glass-border);
  background: var(--panel-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  z-index: 18;
  animation: slide-in-right 0.35s var(--ease-out-expo);
}

.garden-tool__tabs {
  display: flex;
  align-items: center;
  gap: 0.15rem;
  border-bottom: 1px solid var(--glass-border);
  padding: 0.3rem;
  flex-shrink: 0;
}
.garden-tool__tabs > button {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  border-radius: 6px;
  padding: 0.35rem 0.55rem;
  font-size: 10px;
  font-weight: 700;
  color: var(--text-muted);
  cursor: pointer;
  transition: background 0.15s var(--ease-out-soft), color 0.15s var(--ease-out-soft), transform 0.1s var(--ease-out-soft);
}
.garden-tool__tabs > button:hover { background: var(--bg-secondary); color: var(--text-primary); transform: translateY(-1px); }
.garden-tool__tabs > button:active { transform: translateY(0) scale(0.98); }
.garden-tool__tabs > button.is-active { background: var(--text-primary); color: var(--bg-primary); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2); }
.garden-tool__panel-close { margin-left: auto; display: none; transition: transform 0.15s var(--ease-out-soft); }
.garden-tool__panel-close:hover { transform: rotate(90deg); }

.garden-tool__panel-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0.5rem;
}

.garden-tool__add-layer {
  display: flex;
  gap: 0.3rem;
}
.garden-tool__select {
  min-width: 0;
  flex: 1;
  border: 1px solid var(--glass-border);
  border-radius: 7px;
  background: var(--input-bg);
  padding: 0.38rem 0.45rem;
  font-size: 11px;
  color: var(--text-primary);
  outline: none;
  transition: border-color 0.15s var(--ease-out-soft), box-shadow 0.15s var(--ease-out-soft);
}
.garden-tool__select:focus { border-color: var(--ring); box-shadow: 0 0 0 2px color-mix(in srgb, var(--ring) 25%, transparent); }

.garden-tool__check {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0.5rem 0 0.4rem;
  font-size: 10px;
  color: var(--text-muted);
}

.garden-tool__layer {
  border: 1px solid transparent;
  border-radius: 7px;
  padding: 0.32rem 0.35rem;
  background: var(--input-bg);
  transition: border-color 0.15s var(--ease-out-soft), background 0.15s var(--ease-out-soft), transform 0.1s var(--ease-out-soft);
}
.garden-tool__layer:hover { transform: translateX(2px); }
.garden-tool__layer.is-active { border-color: rgba(6, 182, 212, 0.45); background: rgba(6, 182, 212, 0.07); }

.garden-tool__mini {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  flex-shrink: 0;
  border-radius: 5px;
  color: var(--text-muted);
  cursor: pointer;
  transition: background 0.12s var(--ease-out-soft), color 0.12s var(--ease-out-soft), transform 0.1s var(--ease-out-soft);
}
.garden-tool__mini:hover { background: var(--bg-secondary); color: var(--text-primary); transform: scale(1.1); }
.garden-tool__mini:active { transform: scale(0.95); }
.garden-tool__mini--danger:hover { color: #dc2626; transform: scale(1.1); }

.garden-tool__plant {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.4rem;
  border-radius: 6px;
  padding: 0.28rem 0.35rem;
  text-align: left;
  transition: background 0.12s var(--ease-out-soft), transform 0.1s var(--ease-out-soft);
}
.garden-tool__plant:hover { background: var(--bg-secondary); transform: translateX(2px); }
.garden-tool__plant.is-active { background: rgba(6, 182, 212, 0.1); }

.garden-tool__chip {
  border: 1px solid var(--glass-border);
  border-radius: 999px;
  padding: 0.15rem 0.42rem;
  font-size: 9px;
  font-weight: 700.
  color: var(--text-muted);
  cursor: pointer;
  transition: background 0.12s var(--ease-out-soft), color 0.12s var(--ease-out-soft), border-color 0.12s var(--ease-out-soft), transform 0.1s var(--ease-out-soft);
}
.garden-tool__chip:hover { background: var(--bg-secondary); color: var(--text-primary); transform: scale(1.05); }
.garden-tool__chip:active { transform: scale(0.98); }
.garden-tool__chip.is-active { border-color: var(--ring); background: rgba(6, 182, 212, 0.12); color: var(--ring); box-shadow: 0 0 0 2px color-mix(in srgb, var(--ring) 25%, transparent); }

.garden-tool__empty {
  margin-top: 0.75rem;
  font-size: 10px;
  line-height: 1.4;
  color: var(--text-muted);
  animation: fade-in-up 0.3s var(--ease-out-expo) 0.1s both;
}

.garden-tool__ghost {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid var(--glass-border);
  border-radius: 7px;
  padding: 0.4rem 0.65rem;
  font-size: 11px;
  font-weight: 700.
  color: var(--text-secondary).
  cursor: pointer.
  transition: background 0.15s var(--ease-out-soft), color 0.15s var(--ease-out-soft), border-color 0.15s var(--ease-out-soft), transform 0.1s var(--ease-out-soft).
}
.garden-tool__ghost:hover { background: var(--bg-secondary); color: var(--text-primary); transform: translateY(-1px); }
.garden-tool__ghost:active { transform: translateY(0) scale(0.98); }

.garden-tool__danger {
  display: inline-flex;
  align-items: center.
  gap: 0.35rem.
  border: 1px solid rgba(220, 38, 38, 0.4).
  border-radius: 7px.
  padding: 0.35rem 0.55rem.
  font-size: 10px.
  font-weight: 700.
  color: #dc2626.
  cursor: pointer.
  transition: background 0.15s var(--ease-out-soft), border-color 0.15s var(--ease-out-soft), transform 0.1s var(--ease-out-soft).
}
.garden-tool__danger:hover { background: rgba(220, 38, 38, 0.1); border-color: #dc2626; transform: translateY(-1px); }
.garden-tool__danger:active { transform: translateY(0) scale(0.98); }

@media (max-width: 767px) {
  .garden-tool__optional,
  .garden-tool__sep--optional { display: none; }
  .garden-tool__panel-toggle { display: inline-flex; }
  .garden-tool__panel {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: min(20rem, 88vw);
    transform: translateX(105%);
    transition: transform 0.22s var(--ease-out-expo);
    box-shadow: -16px 0 40px rgba(0, 0, 0, 0.35);
    z-index: 30;
  }
  .garden-tool__panel.is-open { transform: translateX(0); }
  .garden-tool__panel-close { display: inline-flex; }
  .garden-tool__rail {
    top: auto;
    bottom: 3.1rem;
    left: 0.5rem;
    right: 0.5rem;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
  }
  .garden-tool__mode { width: 2.65rem; }
  .garden-tool__readout { display: none; }
  .garden-tool__draw-actions,
  .garden-tool__planting { bottom: 8.4rem; }
}

/* ── Staggered entrance for rail buttons ───────────────────────────────── */
.garden-tool__rail > .garden-tool__mode:nth-child(1) { animation-delay: 0.05s; }
.garden-tool__rail > .garden-tool__mode:nth-child(2) { animation-delay: 0.1s; }
.garden-tool__rail > .garden-tool__mode:nth-child(3) { animation-delay: 0.15s; }
.garden-tool__rail > .garden-tool__mode:nth-child(4) { animation-delay: 0.2s; }
.garden-tool__rail > .garden-tool__mode:nth-child(5) { animation-delay: 0.25s; }
.garden-tool__rail > .garden-tool__mode:nth-child(6) { animation-delay: 0.3s; }
.garden-tool__rail > .garden-tool__mode:nth-child(7) { animation-delay: 0.35s; }
.garden-tool__rail > .garden-tool__mode:nth-child(8) { animation-delay: 0.4s; }

/* ── Layer list stagger ───────────────────────────────────────────────── */
.garden-tool__layer:nth-child(1) { animation: fade-in-up 0.3s var(--ease-out-expo) 0.05s both; }
.garden-tool__layer:nth-child(2) { animation: fade-in-up 0.3s var(--ease-out-expo) 0.1s both; }
.garden-tool__layer:nth-child(3) { animation: fade-in-up 0.3s var(--ease-out-expo) 0.15s both; }
.garden-tool__layer:nth-child(4) { animation: fade-in-up 0.3s var(--ease-out-expo) 0.2s both; }
.garden-tool__layer:nth-child(5) { animation: fade-in-up 0.3s var(--ease-out-expo) 0.25s both; }
.garden-tool__layer:nth-child(6) { animation: fade-in-up 0.3s var(--ease-out-expo) 0.3s both; }
.garden-tool__layer:nth-child(7) { animation: fade-in-up 0.3s var(--ease-out-expo) 0.35s both; }
.garden-tool__layer:nth-child(8) { animation: fade-in-up 0.3s var(--ease-out-expo) 0.4s both; }

/* ── Plant list stagger ───────────────────────────────────────────────── */
.garden-tool__plant:nth-child(1) { animation: fade-in-up 0.25s var(--ease-out-expo) 0.02s both; }
.garden-tool__plant:nth-child(2) { animation: fade-in-up 0.25s var(--ease-out-expo) 0.04s both; }
.garden-tool__plant:nth-child(3) { animation: fade-in-up 0.25s var(--ease-out-expo) 0.06s both; }
.garden-tool__plant:nth-child(4) { animation: fade-in-up 0.25s var(--ease-out-expo) 0.08s both; }
.garden-tool__plant:nth-child(5) { animation: fade-in-up 0.25s var(--ease-out-expo) 0.1s both; }
.garden-tool__plant:nth-child(6) { animation: fade-in-up 0.25s var(--ease-out-expo) 0.12s both; }
.garden-tool__plant:nth-child(7) { animation: fade-in-up 0.25s var(--ease-out-expo) 0.14s both; }
.garden-tool__plant:nth-child(8) { animation: fade-in-up 0.25s var(--ease-out-expo) 0.16s both; }
.garden-tool__plant:nth-child(9) { animation: fade-in-up 0.25s var(--ease-out-expo) 0.18s both; }
.garden-tool__plant:nth-child(10) { animation: fade-in-up 0.25s var(--ease-out-expo) 0.2s both; }

/* ── Reduced motion ────────────────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .garden-tool,
  .garden-tool__bar,
  .garden-tool__sep,
  .garden-tool__map-state,
  .garden-tool__map-banner,
  .garden-tool__rail,
  .garden-tool__mode,
  .garden-tool__readout,
  .garden-tool__measure,
  .garden-tool__draw-actions,
  .garden-tool__planting,
  .garden-tool__panel,
  .garden-tool__empty,
  .garden-tool__layer,
  .garden-tool__plant,
  .garden-tool__chip {
    animation: none !important;
    transition-duration: 0.01ms !important;
  }
  .garden-tool__mode.is-active { animation: none !important; }
}
</style>
