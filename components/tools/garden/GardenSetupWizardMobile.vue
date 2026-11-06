<!--
  components/tools/garden/GardenSetupWizardMobile.vue
  @why Mobile-first setup wizard for garden: address search + metric X/Y grid.
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
          @click="$emit('cancel')"
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
            <Icon
              :name="locating ? 'tabler:loader-2' : 'tabler:current-location'"
              :class="locating ? 'w-5 h-5 animate-spin' : 'w-5 h-5'"
            />
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

function close() {
  emit('close')
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

onMounted(() => {
  if (address.value && !query.value) query.value = address.value
})

defineExpose({ setLocationFromMap })
</script>

<style scoped>
/* ── CSS Variables ───────────────────────────────────────────────────────── */
:root {
  --wizard-w: min(92vw, 380px);
  --wizard-max-h: calc(100vh - 4rem);
  --header-h: 72px;
  --progress-h: 48px;
  --footer-h: 72px;
}

/* ── Overlay ─────────────────────────────────────────────────────────────── */
.wizard-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  animation: fade-in 0.2s var(--ease-out);
}

/* ── Wizard Card ─────────────────────────────────────────────────────────── */
.wizard {
  width: var(--wizard-w);
  max-height: var(--wizard-max-h);
  display: flex;
  flex-direction: column;
  border-radius: 20px;
  border: 1px solid var(--glass-border);
  background: var(--panel-bg);
  color: var(--text-primary);
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  animation: slide-up 0.35s var(--ease-spring);
}

/* ── Header ──────────────────────────────────────────────────────────────── */
.wizard-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  height: var(--header-h);
  padding: 0 1.25rem;
  border-bottom: 1px solid var(--glass-border);
  flex-shrink: 0;
}

.wizard-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 12px;
  border: 1px solid rgba(6, 182, 212, 0.35);
  background: rgba(6, 182, 212, 0.12);
  color: #06b6d4;
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
  color: var(--text-muted);
}

.wizard-title {
  margin-top: 0.125rem;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

.wizard-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.15s var(--ease-out), color 0.15s var(--ease-out), transform 0.1s var(--ease-out);
}
.wizard-close:hover { background: var(--bg-secondary); color: var(--text-primary); transform: scale(1.05); }
.wizard-close:active { transform: scale(0.95); }

/* ── Progress ────────────────────────────────────────────────────────────── */
.wizard-progress {
  display: flex;
  align-items: center;
  height: var(--progress-h);
  padding: 0 1.25rem;
  border-bottom: 1px solid var(--glass-border);
  flex-shrink: 0;
}

.progress-step {
  display: flex;
  align-items: center;
  gap: 0.5rem;
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
  transition: all 0.2s var(--ease-spring);
  background: var(--input-bg);
  color: var(--text-muted);
}
.step-dot.active {
  background: #06b6d4;
  color: #fff;
  transform: scale(1.15);
  box-shadow: 0 0 0 4px rgba(6, 182, 212, 0.2);
}
.step-dot.done {
  background: #27ae60;
  color: #fff;
}

.step-label {
  flex: 1;
  font-size: 10px;
  font-weight: 600;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.2s var(--ease-out);
}
.progress-step.active .step-label { color: #06b6d4; }
.progress-step.done .step-label { color: #27ae60; }

.progress-line {
  position: absolute;
  top: 13px;
  left: 50%;
  right: -50%;
  height: 2px;
  background: var(--glass-border);
  transition: background 0.2s var(--ease-out);
}
.progress-line.active { background: #06b6d4; }

/* ── Body ────────────────────────────────────────────────────────────────── */
.wizard-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem;
}

.wizard-step-content {
  animation: fade-in-up 0.3s var(--ease-out-expo);
}

.wizard-hint {
  margin-bottom: 1rem;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-secondary);
}

.field-group {
  margin-bottom: 1rem;
}

.field-label {
  display: block;
  margin-bottom: 0.375rem;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.field-input {
  width: 100%;
  padding: 0.75rem 0.875rem;
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  background: var(--input-bg);
  color: var(--text-primary);
  font-size: 15px;
  outline: none;
  transition: border-color 0.15s var(--ease-out), box-shadow 0.15s var(--ease-out), background 0.15s var(--ease-out);
}
.field-input:focus {
  border-color: var(--ring);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--ring) 20%, transparent);
  background: var(--bg-tertiary);
}
.field-input:hover:not(:focus) { border-color: color-mix(in srgb, var(--glass-border) 70%, var(--ring)); }

.input-with-suffix {
  position: relative;
}
.input-suffix {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: var(--text-muted);
  pointer-events: none;
}
.field-input + .input-suffix { padding-right: 2.5rem; }

.search-wrapper {
  position: relative;
}
.search-wrapper .icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  color: var(--text-muted);
  pointer-events: none;
}
.search-wrapper .field-input { padding-left: 2.75rem; }

.search-spinner {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--ring);
}

.results-list {
  margin-top: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--glass-border);
  border-radius: 10px;
  background: var(--bg-tertiary);
  list-style: none;
  padding: 0.375rem;
}
.result-item {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  padding: 0.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.12s var(--ease-out);
}
.result-item:hover { background: var(--bg-secondary); }
.result-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.125rem; }
.result-name { font-size: 13px; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.result-label { font-size: 11px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.field-error { margin-top: 0.375rem; font-size: 11px; color: #ef4444; }
.field-hint { margin-top: 0.375rem; font-size: 11px; color: var(--text-muted); }

.coords-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.map-hint {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  border-radius: 10px;
  border: 1px dashed var(--glass-border);
  background: rgba(6, 182, 212, 0.04);
  font-size: 11px;
  line-height: 1.4;
  color: var(--text-secondary);
}

.selection-summary {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem;
  border-radius: 10px;
  border: 1px solid rgba(6, 182, 212, 0.3);
  background: rgba(6, 182, 212, 0.06);
}

.summary-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.summary-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.4;
}

/* ── Grid Fields ─────────────────────────────────────────────────────────── */
.grid-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.presets-group {
  margin-top: 1rem;
}
.presets-label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.preset-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}
.preset-chip {
  padding: 0.375rem 0.875rem;
  border: 1px solid var(--glass-border);
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  background: transparent;
  cursor: pointer;
  transition: all 0.15s var(--ease-out);
}
.preset-chip:hover { background: var(--bg-secondary); color: var(--text-primary); }

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  margin-top: 1rem;
  padding: 0.75rem;
  border-radius: 12px;
  border: 1px solid var(--glass-border);
  background: var(--input-bg);
}
.summary-item { text-align: center; }
.summary-item dt {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.summary-item dd {
  margin: 0.125rem 0 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}

.field-warning {
  margin-top: 0.75rem;
  padding: 0.625rem 0.75rem;
  border-radius: 8px;
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.3);
  font-size: 11px;
  color: #f59e0b;
}

/* ── Footer ──────────────────────────────────────────────────────────────── */
.wizard-footer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  height: var(--footer-h);
  padding: 0 1.25rem;
  border-top: 1px solid var(--glass-border);
  flex-shrink: 0;
}

.spacer { flex: 1; }

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s var(--ease-out);
}
.btn:active { transform: scale(0.98); }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }

.btn-primary {
  background: #06b6d4;
  color: #fff;
}
.btn-primary:hover:not(:disabled) { background: #0891b2; }
.btn-primary:focus-visible { outline: 2px solid #06b6d4; outline-offset: 2px; }

.btn-secondary {
  border: 1px solid var(--glass-border);
  background: transparent;
  color: var(--text-secondary);
}
.btn-secondary:hover:not(:disabled) { background: var(--bg-secondary); color: var(--text-primary); border-color: var(--ring); }

.btn-ghost {
  border: 1px solid var(--glass-border);
  background: transparent;
  color: var(--text-secondary);
}
.btn-ghost:hover { background: var(--bg-secondary); color: var(--text-primary); }
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
}

/* ── Mobile Adjustments ──────────────────────────────────────────────────── */
@media (max-width: 480px) {
  :root {
    --wizard-w: 100vw;
    --wizard-max-h: 100vh;
  }
  .wizard { border-radius: 0; }
  .wizard-body { padding: 1rem; }
  .wizard-header,
  .wizard-progress,
  .wizard-footer { padding-left: 1rem; padding-right: 1rem; }
}
</style>