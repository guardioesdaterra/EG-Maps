<!--
  components/tools/garden/GardenSetupWizardMobile.vue
  @why Flat, theme-aware mobile setup wizard — address search + metric X/Y grid;
  @component GardenSetupWizardMobile
  @emits confirm, cancel, fit-grid
-->
<template>
  <div class="wizard-overlay" @click.self="close">
    <div class="wizard" ref="wizardRef">
      <!-- Header -->
      <header class="wizard-header">
        <div class="wizard-badge">
          <Icon name="tabler:grid-dots" class="w-6 h-6" />
        </div>
        <div class="wizard-title-group">
          <p class="wizard-step">{{ t('tools.agroecologicalGarden.onboarding.step', { current: step, total: 2 }) }}</p>
          <h2 class="wizard-title">
            {{ step === 1 ? t('tools.agroecologicalGarden.onboarding.locationTitle') : t('tools.agroecologicalGarden.onboarding.gridTitle') }}
          </h2>
        </div>
        <button
          v-if="canCancel"
          class="wizard-close"
          @click="close"
          :aria-label="t('general.close')"
        >
          <Icon name="tabler:x" class="w-6 h-6" />
        </button>
      </header>

      <!-- Progress Indicator -->
      <div class="wizard-progress" :aria-label="t('tools.agroecologicalGarden.onboarding.step', { current: step, total: 2 })">
        <div
          v-for="s in 2"
          :key="s"
          class="progress-step"
          :class="{ active: step === s, done: step > s }"
        >
          <span class="step-dot" :class="{ active: step === s, done: step > s }">{{ s }}</span>
          <span class="step-label">
            {{ s === 1 ? t('tools.agroecologicalGarden.onboarding.locationTitle') : t('tools.agroecologicalGarden.onboarding.gridTitle') }}
          </span>
          <div v-if="s < 2" class="progress-line" :class="{ active: step > 1 }" />
        </div>
      </div>

      <!-- Body -->
      <div class="wizard-body">
        <!-- STEP 1: Location -->
        <div v-if="step === 1" class="wizard-step-content" key="location">
          <p class="wizard-hint">{{ t('tools.agroecologicalGarden.onboarding.locationHint') }}</p>

          <!-- Address Search -->
          <div class="field-group">
            <label class="field-label">{{ t('tools.agroecologicalGarden.onboarding.address') }}</label>
            <div class="search-wrapper">
              <Icon name="tabler:search" class="w-5 h-5" />
              <input
                v-model="query"
                type="search"
                autocomplete="street-address"
                class="field-input"
                :placeholder="t('tools.agroecologicalGarden.onboarding.addressPlaceholder')"
                @input="onAddressInput"
                @keydown.enter.prevent="runSearch"
              />
              <span v-if="geocoder.isSearching" class="search-spinner">
                <Icon name="tabler:loader-2" class="w-5 h-5 animate-spin" />
              </span>
            </div>
            <p v-if="geocoder.error" class="field-error">{{ t('tools.agroecologicalGarden.onboarding.searchError') }}</p>
            <p v-else-if="searchDone && !results.length && query.trim().length >= 3" class="field-hint">
              {{ t('tools.agroecologicalGarden.onboarding.noResults') }}
            </p>

            <!-- Search Results -->
            <ul v-if="results.length" class="results-list" role="listbox">
              <li v-for="result in results" :key="result.id" class="result-item" role="option" @click="chooseResult(result)">
                <Icon name="tabler:map-pin" class="w-5 h-5" />
                <div class="result-info">
                  <span class="result-name">{{ result.name }}</span>
                  <span class="result-label">{{ result.label }}</span>
                </div>
              </li>
            </ul>
          </div>

          <!-- Use My Location -->
          <button class="btn btn-secondary btn-full" :disabled="locating" @click="useMyLocation">
            <Icon :name="locating ? 'tabler:loader-2' : 'tabler:current-location'" :class="locating ? 'w-5 h-5 animate-spin' : 'w-5 h-5'" />
            {{ locating ? t('tools.agroecologicalGarden.onboarding.locating') : t('tools.agroecologicalGarden.onboarding.useLocation') }}
          </button>
          <p v-if="locationError" class="field-error">{{ t('tools.agroecologicalGarden.onboarding.locationError') }}</p>

          <!-- Manual Coordinates -->
          <div class="coords-grid">
            <div class="field-group">
              <label class="field-label">{{ t('tools.agroecologicalGarden.onboarding.latitude') }}</label>
              <input v-model.number="latitude" type="number" step="0.000001" min="-85" max="85" class="field-input" />
            </div>
            <div class="field-group">
              <label class="field-label">{{ t('tools.agroecologicalGarden.onboarding.longitude') }}</label>
              <input v-model.number="longitude" type="number" step="0.000001" min="-180" max="180" class="field-input" />
            </div>
          </div>

          <!-- Map Tap Hint -->
          <div class="map-hint">
            <Icon name="tabler:crosshair" class="w-5 h-5" />
            <span>{{ t('tools.agroecologicalGarden.onboarding.mapHint') }}</span>
          </div>

          <!-- Selected Address Display -->
          <div class="selection-summary">
            <span class="summary-label">{{ t('tools.agroecologicalGarden.onboarding.selected') }}</span>
            <p class="summary-value">{{ address || t('tools.agroecologicalGarden.onboarding.addressNotSet') }}</p>
          </div>
        </div>

        <!-- STEP 2: Grid -->
        <div v-else class="wizard-step-content" key="grid">
          <p class="wizard-hint">{{ t('tools.agroecologicalGarden.onboarding.gridHint') }}</p>

          <!-- Garden Name -->
          <div class="field-group">
            <label class="field-label">{{ t('tools.agroecologicalGarden.onboarding.name') }}</label>
            <input v-model="name" type="text" class="field-input" :placeholder="t('tools.agroecologicalGarden.onboarding.namePlaceholder')" />
          </div>

          <!-- Grid Dimensions -->
          <div class="grid-fields">
            <div class="field-group">
              <label class="field-label">{{ t('tools.agroecologicalGarden.onboarding.widthX') }}</label>
              <div class="input-with-suffix">
                <input v-model.number="widthX" type="number" min="1" max="2000" step="0.5" class="field-input" />
                <span class="input-suffix">m</span>
              </div>
            </div>
            <div class="field-group">
              <label class="field-label">{{ t('tools.agroecologicalGarden.onboarding.lengthY') }}</label>
              <div class="input-with-suffix">
                <input v-model.number="lengthY" type="number" min="1" max="2000" step="0.5" class="field-input" />
                <span class="input-suffix">m</span>
              </div>
            </div>
            <div class="field-group">
              <label class="field-label">{{ t('tools.agroecologicalGarden.onboarding.cellSize') }}</label>
              <div class="input-with-suffix">
                <input v-model.number="cellM" type="number" min="0.25" max="100" step="0.25" class="field-input" />
                <span class="input-suffix">m</span>
              </div>
            </div>
            <div class="field-group">
              <label class="field-label">{{ t('tools.agroecologicalGarden.onboarding.rotation') }}</label>
              <div class="input-with-suffix">
                <input v-model.number="rotationDeg" type="number" min="-180" max="180" step="1" class="field-input" />
                <span class="input-suffix">°</span>
              </div>
            </div>
          </div>

          <!-- Presets -->
          <div class="presets-group">
            <span class="presets-label">{{ t('tools.agroecologicalGarden.onboarding.presets') }}</span>
            <div class="preset-chips">
              <button
                v-for="preset in presets"
                :key="preset.labelKey"
                class="preset-chip"
                @click="applyPreset(preset.width, preset.height)"
              >
                {{ t(preset.labelKey) }}
              </button>
            </div>
          </div>

          <!-- Summary -->
          <dl class="summary-grid">
            <div class="summary-item">
              <dt>{{ t('tools.agroecologicalGarden.grid.title') }}</dt>
              <dd>{{ summary.cols }} × {{ summary.rows }}</dd>
            </div>
            <div class="summary-item">
              <dt>{{ t('tools.agroecologicalGarden.measurement.cells') }}</dt>
              <dd>{{ summary.cells }}</dd>
            </div>
            <div class="summary-item">
              <dt>{{ t('tools.agroecologicalGarden.measurement.area') }}</dt>
              <dd>{{ summary.areaM2.toLocaleString() }} m²</dd>
            </div>
          </dl>

          <p v-if="tooManyCells" class="field-warning">
            {{ t('tools.agroecologicalGarden.onboarding.tooManyCells', { limit: GRID_MAX_CELLS }) }}
          </p>
        </div>
      </div>

      <!-- Footer -->
      <footer class="wizard-footer">
        <button v-if="step === 2" class="btn btn-ghost" @click="step = 1">
          <Icon name="tabler:arrow-left" class="w-4 h-4" />
          {{ t('tools.agroecologicalGarden.onboarding.back') }}
        </button>
        <div v-else class="spacer" />
        <button v-if="step === 1" class="btn btn-primary" :disabled="!locationValid" @click="goToGridStep">
          {{ t('tools.agroecologicalGarden.onboarding.next') }}
          <Icon name="tabler:arrow-narrow-right" class="w-4 h-4" />
        </button>
        <button v-else class="btn btn-primary" @click="$emit('confirm')">
          <Icon name="tabler:check" class="w-4 h-4" />
          {{ t('tools.agroecologicalGarden.onboarding.start') }}
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useGeocoding, type GeoSearchResult } from '@/composables/useGeocoding'
import { GRID_MAX_CELLS, normalizeGrid, gridSummary } from '@/lib/garden-grid'
import type { GardenGrid, GardenLocation } from '@/lib/garden-types'
import Icon from '@/components/Icon.vue'

const location = defineModel<GardenLocation>('location', { required: true })
const grid = defineModel<GardenGrid>('grid', { required: true })
const address = defineModel<string>('address', { default: '' })
const name = defineModel<string>('name', { default: '' })

const props = withDefaults(defineProps<{
  canCancel?: boolean
}>(), {
  canCancel: false,
})

const emit = defineEmits<{
  confirm: []
  cancel: []
  close: []
  'fit-grid': []
}>()

const { t } = useI18n()
const geocoder = useGeocoding()

const step = ref(1)
const query = ref(address.value)
const results = ref<GeoSearchResult[]>([])
const searchDone = ref(false)
const locating = ref(false)
const locationError = ref(false)
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let reverseToken = 0

const presets = [
  { labelKey: 'tools.agroecologicalGarden.onboarding.presetSmall', width: 5, height: 5 },
  { labelKey: 'tools.agroecologicalGarden.onboarding.presetBed', width: 10, height: 10 },
  { labelKey: 'tools.agroecologicalGarden.onboarding.presetPlot', width: 20, height: 10 },
]

const summary = computed(() => gridSummary(grid.value))
const tooManyCells = computed(() => summary.value.cells > GRID_MAX_CELLS)
const locationValid = computed(() => Number.isFinite(location.value.lat) && Number.isFinite(location.value.lng))

const latitude = computed({
  get: () => Math.round(location.value.lat * 1e6) / 1e6,
  set: (value: number) => {
    if (!Number.isFinite(value)) return
    setLocation({ lat: Math.min(85, Math.max(-85, value)), lng: location.value.lng, zoom: location.value.zoom }, true)
  },
})
const longitude = computed({
  get: () => Math.round(location.value.lng * 1e6) / 1e6,
  set: (value: number) => {
    if (!Number.isFinite(value)) return
    setLocation({ lat: location.value.lat, lng: Math.min(180, Math.max(-180, value)), zoom: location.value.zoom }, true)
  },
})
const widthX = computed({
  get: () => grid.value.widthM,
  set: (value: number) => updateGrid({ widthM: value }),
})
const lengthY = computed({
  get: () => grid.value.heightM,
  set: (value: number) => updateGrid({ heightM: value }),
})
const cellM = computed({
  get: () => grid.value.cellM,
  set: (value: number) => updateGrid({ cellM: value }),
})
const rotationDeg = computed({
  get: () => grid.value.rotationDeg,
  set: (value: number) => updateGrid({ rotationDeg: value }),
})

function updateGrid(patch: Partial<GardenGrid>) {
  grid.value = normalizeGrid({ ...grid.value, ...patch })
}

function applyPreset(width: number, height: number) {
  grid.value = normalizeGrid({ ...grid.value, widthM: width, heightM: height })
  emit('fit-grid')
}

function goToGridStep() {
  step.value = 2
  emit('fit-grid')
}

function setLocation(next: GardenLocation, reverseAddress = false) {
  location.value = next
  emit('fit-grid')
  if (reverseAddress) resolveAddress(next.lng, next.lat)
}

async function resolveAddress(lng: number, lat: number) {
  const token = ++reverseToken
  const label = await geocoder.reverse(lng, lat)
  if (token !== reverseToken || !label) return
  address.value = label
  query.value = label
}

function onAddressInput() {
  searchDone.value = false
  if (debounceTimer) clearTimeout(debounceTimer)
  if (query.value.trim().length < 3) {
    results.value = []
    geocoder.clear()
    return
  }
  debounceTimer = setTimeout(runSearch, 450)
}

async function runSearch() {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  results.value = await geocoder.search(query.value)
  searchDone.value = true
}

function chooseResult(result: GeoSearchResult) {
  address.value = result.label
  query.value = result.label
  results.value = []
  searchDone.value = false
  setLocation({ lng: result.lng, lat: result.lat, zoom: 19 })
}

function useMyLocation() {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    locationError.value = true
    return
  }
  locating.value = true
  locationError.value = false
  navigator.geolocation.getCurrentPosition(
    (position) => {
      locating.value = false
      setLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        zoom: 19,
      }, true)
    },
    () => {
      locating.value = false
      locationError.value = true
    },
    { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
  )
}

function setLocationFromMap(lng: number, lat: number) {
  setLocation({ lng, lat, zoom: Math.max(location.value.zoom, 19) }, true)
}

function close() {
  emit('close')
}

onMounted(() => {
  if (address.value && !query.value) query.value = address.value
})

defineExpose({ setLocationFromMap })
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

  --garden-transition-fast: 120ms ease-out;
  --garden-transition-base: 180ms ease-out;
  --garden-transition-slow: 250ms ease-out;
  --garden-transition-spring: 300ms cubic-bezier(0.34, 1.56, 0.64, 1);

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
}

/* Dark theme overrides */
@media (prefers-color-scheme: dark) {
  :root {
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
  }
}

/* ── Overlay ─────────────────────────────────────────────────────────────── */
.wizard-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--garden-space-xl);
  background: rgba(0, 0, 0, 0.4);
  animation: fade-in var(--garden-transition-fast) ease-out;
}

/* ── Wizard Card ─────────────────────────────────────────────────────────── */
.wizard {
  width: min(92vw, 380px);
  max-height: calc(100vh - 4rem);
  display: flex;
  flex-direction: column;
  border-radius: var(--garden-radius-xl);
  border: 1px solid var(--garden-color-border-primary);
  background: var(--garden-color-surface-primary);
  color: var(--garden-color-text-primary);
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.12), 0 0 0 1px var(--garden-color-border-primary);
  overflow: hidden;
  animation: slide-up var(--garden-transition-slow) var(--garden-transition-spring);
}

/* ── Header ──────────────────────────────────────────────────────────────── */
.wizard-header {
  display: flex;
  align-items: center;
  gap: var(--garden-space-lg);
  height: 64px;
  padding: 0 var(--garden-space-xl);
  border-bottom: 1px solid var(--garden-color-border-primary);
  flex-shrink: 0;
}

.wizard-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: var(--garden-radius-lg);
  border: 1px solid var(--garden-color-brand-primary);
  background: var(--garden-color-brand-light);
  color: var(--garden-color-brand-primary);
  animation: pulse-ring 2s ease-out infinite;
}

.wizard-title-group {
  flex: 1;
  min-width: 0;
}

.wizard-step {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--garden-color-text-muted);
}

.wizard-title {
  margin-top: 0.125rem;
  font-size: 16px;
  font-weight: 700;
  color: var(--garden-color-text-primary);
}

.wizard-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border: none;
  border-radius: var(--garden-radius-md);
  background: transparent;
  color: var(--garden-color-text-secondary);
  cursor: pointer;
  transition: background var(--garden-transition-fast) ease-out, color var(--garden-transition-fast) ease-out, transform var(--garden-transition-fast) ease-out;
}
.wizard-close:hover { background: var(--garden-color-surface-hover); color: var(--garden-color-text-primary); transform: scale(1.05); }
.wizard-close:active { transform: scale(0.95); }

/* ── Progress ────────────────────────────────────────────────────────────── */
.wizard-progress {
  display: flex;
  align-items: center;
  height: 48px;
  padding: 0 var(--garden-space-xl);
  border-bottom: 1px solid var(--garden-color-border-primary);
  flex-shrink: 0;
}

.progress-step {
  display: flex;
  align-items: center;
  gap: var(--garden-space-md);
  flex: 1;
  min-width: 0;
  position: relative;
}

.step-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 800;
  transition: all var(--garden-transition-base) var(--garden-transition-spring);
  background: var(--garden-color-surface-secondary);
  color: var(--garden-color-text-muted);
}
.step-dot.active {
  background: var(--garden-color-brand-primary);
  color: var(--garden-color-text-inverse);
  transform: scale(1.15);
  box-shadow: 0 0 0 4px var(--garden-color-brand-100);
}
.step-dot.done {
  background: var(--garden-color-success-primary);
  color: var(--garden-color-text-inverse);
}

.step-label {
  flex: 1;
  font-size: 10px;
  font-weight: 600;
  color: var(--garden-color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color var(--garden-transition-base) ease-out;
}
.progress-step.active .step-label { color: var(--garden-color-brand-primary); }
.progress-step.done .step-label { color: var(--garden-color-success-primary); }

.progress-line {
  position: absolute;
  top: 13px;
  left: 50%;
  right: -50%;
  height: 2px;
  background: var(--garden-color-border-primary);
  transition: background var(--garden-transition-base) ease-out;
}
.progress-line.active { background: var(--garden-color-brand-primary); }

/* ── Body ────────────────────────────────────────────────────────────────── */
.wizard-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--garden-space-xl);
}

.wizard-step-content {
  animation: fade-in-up var(--garden-transition-base) var(--garden-transition-spring);
}

.wizard-hint {
  margin-bottom: var(--garden-space-lg);
  font-size: 13px;
  line-height: 1.5;
  color: var(--garden-color-text-secondary);
}

.field-group {
  margin-bottom: var(--garden-space-lg);
}

.field-label {
  display: block;
  margin-bottom: var(--garden-space-sm);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--garden-color-text-muted);
}

.field-input {
  width: 100%;
  padding: var(--garden-space-md) var(--garden-space-md);
  border: 1px solid var(--garden-color-border-primary);
  border-radius: var(--garden-radius-md);
  background: var(--garden-color-surface-secondary);
  color: var(--garden-color-text-primary);
  font-size: 15px;
  outline: none;
  transition: border-color var(--garden-transition-fast) ease-out, box-shadow var(--garden-transition-fast) ease-out, background var(--garden-transition-fast) ease-out;
}
.field-input:focus {
  border-color: var(--garden-color-border-focus);
  box-shadow: 0 0 0 3px var(--garden-color-brand-100);
  background: var(--garden-color-surface-primary);
}
.field-input:hover:not(:focus) { border-color: var(--garden-color-border-secondary); }

.input-with-suffix {
  position: relative;
}
.input-suffix {
  position: absolute;
  right: var(--garden-space-lg);
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: var(--garden-color-text-muted);
  pointer-events: none;
}
.field-input + .input-suffix { padding-right: 44px; }

.search-wrapper {
  position: relative;
}
.search-wrapper .icon {
  position: absolute;
  left: var(--garden-space-lg);
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  color: var(--garden-color-text-muted);
  pointer-events: none;
}
.search-wrapper .field-input { padding-left: 44px; }

.search-spinner {
  position: absolute;
  right: var(--garden-space-lg);
  top: 50%;
  transform: translateY(-50%);
  color: var(--garden-color-brand-primary);
}

.results-list {
  margin-top: var(--garden-space-sm);
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--garden-color-border-primary);
  border-radius: var(--garden-radius-lg);
  background: var(--garden-color-surface-tertiary);
  list-style: none;
  padding: var(--garden-space-sm);
}
.result-item {
  display: flex;
  align-items: flex-start;
  gap: var(--garden-space-md);
  padding: var(--garden-space-sm);
  border-radius: var(--garden-radius-md);
  cursor: pointer;
  transition: background var(--garden-transition-fast) ease-out;
}
.result-item:hover { background: var(--garden-color-surface-hover); }
.result-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: var(--garden-space-xs); }
.result-name { font-size: 13px; font-weight: 600; color: var(--garden-color-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.result-label { font-size: 11px; color: var(--garden-color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.field-error { margin-top: var(--garden-space-sm); font-size: 11px; color: var(--garden-color-danger-primary); }
.field-hint { margin-top: var(--garden-space-sm); font-size: 11px; color: var(--garden-color-text-muted); }

.coords-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--garden-space-lg);
  margin-bottom: var(--garden-space-lg);
}

.map-hint {
  display: flex;
  align-items: flex-start;
  gap: var(--garden-space-sm);
  padding: var(--garden-space-sm) var(--garden-space-md);
  border-radius: var(--garden-radius-md);
  border: 1px dashed var(--garden-color-border-primary);
  background: var(--garden-color-brand-light);
  font-size: 11px;
  line-height: 1.4;
  color: var(--garden-color-text-secondary);
}

.selection-summary {
  display: flex;
  flex-direction: column;
  gap: var(--garden-space-xs);
  padding: var(--garden-space-md);
  border-radius: var(--garden-radius-lg);
  border: 1px solid var(--garden-color-brand-primary);
  background: var(--garden-color-brand-light);
}

.summary-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--garden-color-text-muted);
}

.summary-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--garden-color-text-primary);
  line-height: 1.4;
}

/* ── Grid Fields ─────────────────────────────────────────────────────────── */
.grid-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--garden-space-lg);
}

.presets-group {
  margin-top: var(--garden-space-xl);
}
.presets-label {
  display: block;
  margin-bottom: var(--garden-space-sm);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--garden-color-text-muted);
}
.preset-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--garden-space-sm);
}
.preset-chip {
  padding: var(--garden-space-xs) var(--garden-space-lg);
  border: 1px solid var(--garden-color-border-primary);
  border-radius: var(--garden-radius-full);
  font-size: 11px;
  font-weight: 600;
  color: var(--garden-color-text-secondary);
  background: transparent;
  cursor: pointer;
  transition: all var(--garden-transition-fast) ease-out;
}
.preset-chip:hover { background: var(--garden-color-surface-hover); color: var(--garden-color-text-primary); }

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--garden-space-md);
  margin-top: var(--garden-space-xl);
  padding: var(--garden-space-lg);
  border-radius: var(--garden-radius-lg);
  border: 1px solid var(--garden-color-border-primary);
  background: var(--garden-color-surface-secondary);
}
.summary-item { text-align: center; }
.summary-item dt {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--garden-color-text-muted);
}
.summary-item dd {
  margin: var(--garden-space-xs) 0 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 15px;
  font-weight: 700;
  color: var(--garden-color-text-primary);
}

.field-warning {
  margin-top: var(--garden-space-lg);
  padding: var(--garden-space-md) var(--garden-space-md);
  border-radius: var(--garden-radius-md);
  background: var(--garden-color-warning-light);
  border: 1px solid var(--garden-color-warning-primary);
  font-size: 11px;
  color: var(--garden-color-warning-primary);
}

/* ── Footer ──────────────────────────────────────────────────────────────── */
.wizard-footer {
  display: flex;
  align-items: center;
  gap: var(--garden-space-md);
  height: 72px;
  padding: 0 var(--garden-space-xl);
  border-top: 1px solid var(--garden-color-border-primary);
  flex-shrink: 0;
}

.spacer { flex: 1; }

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--garden-space-sm);
  padding: var(--garden-space-md) var(--garden-space-xl);
  border: none;
  border-radius: var(--garden-radius-md);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--garden-transition-fast) ease-out;
}
.btn:active { transform: scale(0.98); }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }

.btn-primary {
  background: var(--garden-color-brand-primary);
  color: var(--garden-color-text-inverse);
}
.btn-primary:hover:not(:disabled) { background: var(--garden-color-brand-hover); }
.btn-primary:focus-visible { outline: 2px solid var(--garden-color-border-focus); outline-offset: 2px; }

.btn-secondary {
  border: 1px solid var(--garden-color-border-primary);
  background: transparent;
  color: var(--garden-color-text-secondary);
}
.btn-secondary:hover:not(:disabled) { background: var(--garden-color-surface-hover); color: var(--garden-color-text-primary); border-color: var(--garden-color-border-focus); }

.btn-ghost {
  border: 1px solid var(--garden-color-border-primary);
  background: transparent;
  color: var(--garden-color-text-secondary);
}
.btn-ghost:hover { background: var(--garden-color-surface-hover); color: var(--garden-color-text-primary); }
.btn-full { width: 100%; }

/* ── Animations ──────────────────────────────────────────────────────────── */
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slide-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes pulse-ring {
  0% { transform: scale(1); opacity: 0.5; }
  70% { transform: scale(1.8); opacity: 0; }
  100% { transform: scale(1.8); opacity: 0; }
}

/* ── Reduced Motion ──────────────────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .wizard,
  .wizard-badge,
  .wizard-step-content,
  .step-dot,
  .progress-line,
  .btn {
    animation: none !important;
    transition-duration: 0.01ms !important;
  }
  .wizard-badge { animation: none !important; }
}

/* ── Mobile Adjustments ──────────────────────────────────────────────────── */
@media (max-width: 480px) {
  .wizard { width: 100vw; max-height: 100vh; border-radius: 0; }
  .wizard-body { padding: var(--garden-space-lg); }
  .wizard-header,
  .wizard-progress,
  .wizard-footer { padding-left: var(--garden-space-lg); padding-right: var(--garden-space-lg); }
}
</style>