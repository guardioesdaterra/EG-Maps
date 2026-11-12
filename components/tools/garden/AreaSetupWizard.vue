<!--
  components/tools/garden/AreaSetupWizard.vue
  @why First-run step for the garden tool: pick the area by address, map tap or
       geolocation, then define the working surface as a metric X/Y grid.
  @component AreaSetupWizard
  @emits flyTo, confirm, cancel
  @deps vue (computed, onMounted, ref, watch); @/composables/useI18n;
        @/composables/useGeocoding; @/lib/garden-grid; @/lib/garden-types
  @connections components/tools/garden/AgroecologicalGardenTool.vue
-->
<template>
  <section class="area-wizard" role="dialog" aria-modal="false" :aria-label="t('tools.agroecologicalGarden.onboarding.title')">
    <header class="area-wizard__head">
      <span class="area-wizard__badge">
        <Icon name="tabler:grid-dots" class="h-4 w-4" />
      </span>
      <div class="min-w-0 flex-1">
        <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          {{ t('tools.agroecologicalGarden.onboarding.step', { current: step, total: 2 }) }}
        </p>
        <h2 class="mt-0.5 truncate text-sm font-bold text-[var(--text-primary)]">
          {{ step === 1 ? t('tools.agroecologicalGarden.onboarding.locationTitle') : t('tools.agroecologicalGarden.onboarding.gridTitle') }}
        </h2>
      </div>
      <button
        v-if="canCancel"
        type="button"
        class="area-wizard__icon-btn"
        :aria-label="t('general.close')"
        @click="emit('cancel')"
      >
        <Icon name="tabler:x" class="h-4 w-4" />
      </button>
    </header>

    <ol class="area-wizard__progress" :aria-label="t('tools.agroecologicalGarden.onboarding.step', { current: step, total: 2 })">
      <li :class="{ 'is-done': step > 1, 'is-active': step === 1 }">
        <span>1</span>
        <em>{{ t('tools.agroecologicalGarden.onboarding.locationTitle') }}</em>
      </li>
      <li :class="{ 'is-active': step === 2 }">
        <span>2</span>
        <em>{{ t('tools.agroecologicalGarden.onboarding.gridTitle') }}</em>
      </li>
    </ol>

    <div class="area-wizard__body">
      <!-- STEP 1 — address / centre point -->
      <div v-if="step === 1" class="space-y-3">
        <p class="text-[11px] leading-relaxed text-[var(--text-secondary)]">
          {{ t('tools.agroecologicalGarden.onboarding.locationHint') }}
        </p>

        <div>
          <label class="area-wizard__label" for="garden-address">{{ t('tools.agroecologicalGarden.onboarding.address') }}</label>
          <div class="relative">
            <Icon name="tabler:search" class="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              id="garden-address"
              v-model="query"
              type="search"
              autocomplete="street-address"
              class="area-wizard__input !pl-8"
              :placeholder="t('tools.agroecologicalGarden.onboarding.addressPlaceholder')"
              @input="onAddressInput"
              @keydown.enter.prevent="runSearch"
            />
            <span v-if="geocoder.isSearching.value" class="absolute right-2.5 top-1/2 -translate-y-1/2">
              <Icon name="tabler:loader-2" class="h-4 w-4 animate-spin text-cyan-500" />
            </span>
          </div>

          <p v-if="geocoder.error.value" class="mt-1.5 text-[11px] text-amber-600 dark:text-amber-400">
            {{ t('tools.agroecologicalGarden.onboarding.searchError') }}
          </p>
          <p v-else-if="searchDone && !results.length && query.trim().length >= 3" class="mt-1.5 text-[11px] text-[var(--text-muted)]">
            {{ t('tools.agroecologicalGarden.onboarding.noResults') }}
          </p>

          <ul v-if="results.length" class="area-wizard__results" role="listbox">
            <li v-for="result in results" :key="result.id">
              <button type="button" class="area-wizard__result" role="option" @click="chooseResult(result)">
                <Icon name="tabler:map-pin" class="h-3.5 w-3.5 shrink-0 text-cyan-600 dark:text-cyan-400" />
                <span class="min-w-0">
                  <span class="block truncate text-[11px] font-semibold text-[var(--text-primary)]">{{ result.name }}</span>
                  <span class="block truncate text-[10px] text-[var(--text-muted)]">{{ result.label }}</span>
                </span>
              </button>
            </li>
          </ul>
        </div>

        <button type="button" class="area-wizard__ghost w-full justify-center" :disabled="locating" @click="useMyLocation">
          <Icon :name="locating ? 'tabler:loader-2' : 'tabler:current-location'" :class="locating ? 'h-4 w-4 animate-spin' : 'h-4 w-4'" />
          {{ locating ? t('tools.agroecologicalGarden.onboarding.locating') : t('tools.agroecologicalGarden.onboarding.useLocation') }}
        </button>
        <p v-if="locationError" class="text-[11px] text-amber-600 dark:text-amber-400">
          {{ t('tools.agroecologicalGarden.onboarding.locationError') }}
        </p>

        <div class="grid grid-cols-2 gap-2">
          <label class="area-wizard__label">
            {{ t('tools.agroecologicalGarden.onboarding.latitude') }}
            <input v-model.number="latitude" type="number" step="0.000001" min="-85" max="85" class="area-wizard__input mt-1 font-mono" />
          </label>
          <label class="area-wizard__label">
            {{ t('tools.agroecologicalGarden.onboarding.longitude') }}
            <input v-model.number="longitude" type="number" step="0.000001" min="-180" max="180" class="area-wizard__input mt-1 font-mono" />
          </label>
        </div>

        <div class="area-wizard__hint">
          <Icon name="tabler:crosshair" class="h-3.5 w-3.5 shrink-0" />
          <span>{{ t('tools.agroecologicalGarden.onboarding.mapHint') }}</span>
        </div>

        <div class="area-wizard__selection">
          <span class="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            {{ t('tools.agroecologicalGarden.onboarding.selected') }}
          </span>
          <p class="mt-0.5 line-clamp-2 text-[11px] font-semibold text-[var(--text-primary)]">
            {{ address || t('tools.agroecologicalGarden.onboarding.addressNotSet') }}
          </p>
        </div>
      </div>

      <!-- STEP 2 — metric grid -->
      <div v-else class="space-y-3">
        <p class="text-[11px] leading-relaxed text-[var(--text-secondary)]">
          {{ t('tools.agroecologicalGarden.onboarding.gridHint') }}
        </p>

        <label class="area-wizard__label">
          {{ t('tools.agroecologicalGarden.onboarding.name') }}
          <input v-model="name" type="text" class="area-wizard__input mt-1" :placeholder="t('tools.agroecologicalGarden.onboarding.namePlaceholder')" />
        </label>

        <div class="grid grid-cols-2 gap-2">
          <label class="area-wizard__label">
            {{ t('tools.agroecologicalGarden.onboarding.widthX') }}
            <div class="relative mt-1">
              <input v-model.number="widthX" type="number" min="1" max="2000" step="0.5" class="area-wizard__input !pr-8 font-mono" />
              <span class="area-wizard__suffix">m</span>
            </div>
          </label>
          <label class="area-wizard__label">
            {{ t('tools.agroecologicalGarden.onboarding.lengthY') }}
            <div class="relative mt-1">
              <input v-model.number="lengthY" type="number" min="1" max="2000" step="0.5" class="area-wizard__input !pr-8 font-mono" />
              <span class="area-wizard__suffix">m</span>
            </div>
          </label>
          <label class="area-wizard__label">
            {{ t('tools.agroecologicalGarden.onboarding.cellSize') }}
            <div class="relative mt-1">
              <input v-model.number="cellM" type="number" min="0.25" max="100" step="0.25" class="area-wizard__input !pr-8 font-mono" />
              <span class="area-wizard__suffix">m</span>
            </div>
          </label>
          <label class="area-wizard__label">
            {{ t('tools.agroecologicalGarden.onboarding.rotation') }}
            <div class="relative mt-1">
              <input v-model.number="rotationDeg" type="number" min="-180" max="180" step="1" class="area-wizard__input !pr-8 font-mono" />
              <span class="area-wizard__suffix">°</span>
            </div>
          </label>
        </div>

        <div class="flex flex-wrap gap-1.5">
          <span class="self-center text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            {{ t('tools.agroecologicalGarden.onboarding.presets') }}
          </span>
          <button
            v-for="preset in presets"
            :key="preset.labelKey"
            type="button"
            class="area-wizard__chip"
            @click="applyPreset(preset.width, preset.height)"
          >
            {{ t(preset.labelKey) }}
          </button>
        </div>

        <dl class="area-wizard__summary">
          <div>
            <dt>{{ t('tools.agroecologicalGarden.grid.title') }}</dt>
            <dd>{{ summary.cols }} × {{ summary.rows }}</dd>
          </div>
          <div>
            <dt>{{ t('tools.agroecologicalGarden.measurement.cells') }}</dt>
            <dd>{{ summary.cells }}</dd>
          </div>
          <div>
            <dt>{{ t('tools.agroecologicalGarden.measurement.area') }}</dt>
            <dd>{{ summary.areaM2.toLocaleString() }} m²</dd>
          </div>
        </dl>

        <p v-if="tooManyCells" class="text-[11px] text-amber-600 dark:text-amber-400">
          {{ t('tools.agroecologicalGarden.onboarding.tooManyCells', { limit: GRID_MAX_CELLS }) }}
        </p>
      </div>
    </div>

    <footer class="area-wizard__foot">
      <button v-if="step === 2" type="button" class="area-wizard__ghost" @click="step = 1">
        <Icon name="tabler:arrow-left" class="h-4 w-4" />
        {{ t('tools.agroecologicalGarden.onboarding.back') }}
      </button>
      <span v-else class="flex-1" />
      <button v-if="step === 1" type="button" class="area-wizard__primary" :disabled="!locationValid" @click="goToGridStep">
        {{ t('tools.agroecologicalGarden.onboarding.next') }}
        <Icon name="tabler:arrow-narrow-right" class="h-4 w-4" />
      </button>
      <button v-else type="button" class="area-wizard__primary" @click="emit('confirm')">
        <Icon name="tabler:check" class="h-4 w-4" />
        {{ t('tools.agroecologicalGarden.onboarding.start') }}
      </button>
    </footer>
  </section>
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
  /** Show the close/back affordance once a project already exists. */
  canCancel?: boolean
}>(), {
  canCancel: false,
})

const emit = defineEmits<{
  flyTo: [target: { lng: number; lat: number; zoom?: number }]
  fitGrid: []
  confirm: []
  cancel: []
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
  emit('fitGrid')
}

function goToGridStep() {
  step.value = 2
  emit('fitGrid')
}

function setLocation(next: GardenLocation, reverseAddress = false) {
  location.value = next
  emit('flyTo', { lng: next.lng, lat: next.lat, zoom: next.zoom })
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

/** Called by the parent when the user taps the map. */
function setLocationFromMap(lng: number, lat: number) {
  setLocation({ lng, lat, zoom: Math.max(location.value.zoom, 19) }, true)
}

onMounted(() => {
  if (address.value && !query.value) query.value = address.value
})

defineExpose({ setLocationFromMap })
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
@keyframes pulse-ring {
  0% { transform: scale(1); opacity: 0.5; }
  70% { transform: scale(1.8); opacity: 0; }
  100% { transform: scale(1.8); opacity: 0; }
}
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.area-wizard {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  z-index: 35;
  display: flex;
  width: min(23rem, calc(100vw - 1.5rem));
  max-height: calc(100% - 1.5rem);
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--glass-border);
  border-radius: 14px;
  background: var(--panel-bg);
  color: var(--text-primary);
  box-shadow: var(--panel-shadow);
  backdrop-filter: blur(18px) saturate(1.4);
  -webkit-backdrop-filter: blur(18px) saturate(1.4);
  animation: fade-in-scale 0.35s var(--ease-out-expo);
}

.area-wizard__head {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  padding: 0.85rem 0.9rem 0.65rem;
  border-bottom: 1px solid var(--glass-border);
  animation: fade-in-down 0.3s var(--ease-out-expo);
}

.area-wizard__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  border-radius: 9px;
  border: 1px solid rgba(6, 182, 212, 0.35);
  background: rgba(6, 182, 212, 0.12);
  color: #0891b2;
  animation: pulse-ring 2s ease-out infinite;
}

.area-wizard__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  flex-shrink: 0;
  border: 1px solid var(--glass-border);
  border-radius: 7px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.15s var(--ease-out-soft), color 0.15s var(--ease-out-soft), transform 0.1s var(--ease-out-soft);
}
.area-wizard__icon-btn:hover { background: var(--bg-secondary); color: var(--text-primary); transform: scale(1.05); }
.area-wizard__icon-btn:active { transform: scale(0.95); }

.area-wizard__progress {
  display: flex;
  gap: 0.35rem;
  padding: 0.55rem 0.9rem 0;
  list-style: none;
  margin: 0;
}
.area-wizard__progress li {
  display: flex;
  flex: 1;
  min-width: 0;
  align-items: center;
  gap: 0.35rem;
  border-radius: 6px;
  padding: 0.2rem 0.35rem;
  background: var(--input-bg);
  color: var(--text-muted);
  transition: background 0.2s var(--ease-out-soft), color 0.2s var(--ease-out-soft);
}
.area-wizard__progress li span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.1rem;
  height: 1.1rem;
  flex-shrink: 0;
  border-radius: 999px;
  background: var(--bg-secondary);
  font-size: 9px;
  font-weight: 800;
  transition: background 0.2s var(--ease-out-soft), color 0.2s var(--ease-out-soft), transform 0.2s var(--ease-spring);
}
.area-wizard__progress li em {
  overflow: hidden;
  font-size: 9px;
  font-style: normal;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: opacity 0.2s var(--ease-out-soft);
}
.area-wizard__progress li.is-active {
  background: rgba(6, 182, 212, 0.12);
  color: #0e7490;
}
.area-wizard__progress li.is-active span { background: #0e7490; color: #fff; transform: scale(1.15); }
.area-wizard__progress li.is-done { color: #15803d; }
.area-wizard__progress li.is-done span { background: #15803d; color: #fff; }

:global(.dark) .area-wizard__progress li.is-active { color: #22d3ee; }
:global(.dark) .area-wizard__progress li.is-done { color: #4ade80; }

.area-wizard__body {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem 0.9rem;
  animation: fade-in-up 0.35s var(--ease-out-expo) 0.1s both;
}

.area-wizard__label {
  display: block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
  transition: color 0.15s var(--ease-out-soft);
}

.area-wizard__input {
  width: 100%;
  border: 1px solid var(--glass-border);
  border-radius: 7px;
  background: var(--input-bg);
  padding: 0.42rem 0.55rem;
  font-size: 12px;
  color: var(--text-primary);
  outline: none;
  transition: border-color 0.15s var(--ease-out-soft), box-shadow 0.15s var(--ease-out-soft), background 0.15s var(--ease-out-soft);
}
.area-wizard__input:focus {
  border-color: var(--ring);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--ring) 25%, transparent);
  background: var(--bg-tertiary);
}
.area-wizard__input:hover:not(:focus) { border-color: color-mix(in srgb, var(--glass-border) 70%, var(--ring)); }

.area-wizard__suffix {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 10px;
  color: var(--text-muted);
  pointer-events: none;
  transition: color 0.15s var(--ease-out-soft);
}
.area-wizard__input:focus + .area-wizard__suffix { color: var(--ring); }

.area-wizard__results {
  max-height: 11rem;
  margin-top: 0.35rem;
  overflow-y: auto;
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  background: var(--bg-tertiary);
  list-style: none;
  padding: 0.2rem;
  animation: fade-in-up 0.25s var(--ease-out-expo);
}
.area-wizard__result {
  display: flex;
  width: 100%;
  align-items: flex-start;
  gap: 0.4rem;
  border-radius: 6px;
  padding: 0.35rem;
  text-align: left;
  transition: background 0.12s var(--ease-out-soft), transform 0.1s var(--ease-out-soft);
}
.area-wizard__result:hover { background: var(--bg-secondary); transform: translateX(2px); }
.area-wizard__result:active { transform: translateX(0) scale(0.98); }

.area-wizard__ghost,
.area-wizard__primary {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border-radius: 7px;
  padding: 0.42rem 0.7rem;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s var(--ease-out-soft), border-color 0.15s var(--ease-out-soft), color 0.15s var(--ease-out-soft), transform 0.1s var(--ease-out-soft), box-shadow 0.15s var(--ease-out-soft);
}
.area-wizard__ghost {
  border: 1px solid var(--glass-border);
  background: transparent;
  color: var(--text-secondary);
}
.area-wizard__ghost:hover { background: var(--bg-secondary); color: var(--text-primary); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); }
.area-wizard__ghost:active { transform: translateY(0) scale(0.98); }
.area-wizard__ghost:disabled { opacity: 0.5; cursor: not-allowed; }
.area-wizard__primary {
  border: 1px solid #0e7490;
  background: #0e7490;
  color: #fff;
}
.area-wizard__primary:hover { background: #155e75; box-shadow: 0 4px 12px rgba(14, 116, 144, 0.3); }
.area-wizard__primary:active { transform: scale(0.98); }
.area-wizard__primary:disabled { opacity: 0.45; cursor: not-allowed; }

.area-wizard__hint {
  display: flex;
  align-items: flex-start;
  gap: 0.35rem;
  border-radius: 7px;
  border: 1px dashed var(--glass-border);
  padding: 0.4rem 0.5rem;
  font-size: 10px;
  line-height: 1.35;
  color: var(--text-secondary);
  animation: fade-in-up 0.3s var(--ease-out-expo) 0.15s both;
}

.area-wizard__selection {
  border-radius: 8px;
  border: 1px solid rgba(6, 182, 212, 0.3);
  background: rgba(6, 182, 212, 0.06);
  padding: 0.45rem 0.55rem;
  animation: fade-in-up 0.3s var(--ease-out-expo) 0.2s both;
}

.area-wizard__chip {
  border: 1px solid var(--glass-border);
  border-radius: 999px;
  padding: 0.18rem 0.5rem;
  font-size: 10px;
  font-weight: 700;
  color: var(--text-secondary);
  background: transparent;
  cursor: pointer;
  transition: background 0.12s var(--ease-out-soft), color 0.12s var(--ease-out-soft), border-color 0.12s var(--ease-out-soft), transform 0.1s var(--ease-out-soft);
}
.area-wizard__chip:hover { background: var(--bg-secondary); color: var(--text-primary); transform: scale(1.05); }
.area-wizard__chip:active { transform: scale(0.98); }

.area-wizard__summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.3rem;
  margin: 0;
  border-radius: 8px;
  border: 1px solid var(--glass-border);
  padding: 0.4rem;
  animation: fade-in-up 0.3s var(--ease-out-expo) 0.1s both;
}
.area-wizard__summary div { text-align: center; transition: transform 0.15s var(--ease-spring); }
.area-wizard__summary div:hover { transform: scale(1.05); }
.area-wizard__summary dt {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.area-wizard__summary dd {
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary);
  transition: color 0.15s var(--ease-out-soft);
}

.area-wizard__foot {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  border-top: 1px solid var(--glass-border);
  padding: 0.55rem 0.9rem;
  animation: fade-in-up 0.3s var(--ease-out-expo) 0.2s both;
}

/* ── Step transition ─────────────────────────────────────────────────────── */
.area-wizard__body > div {
  animation: fade-in-up 0.3s var(--ease-out-expo);
}

/* ── Reduced motion ──────────────────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .area-wizard,
  .area-wizard__head,
  .area-wizard__badge,
  .area-wizard__progress li,
  .area-wizard__progress li span,
  .area-wizard__body,
  .area-wizard__input,
  .area-wizard__suffix,
  .area-wizard__results,
  .area-wizard__result,
  .area-wizard__ghost,
  .area-wizard__primary,
  .area-wizard__hint,
  .area-wizard__selection,
  .area-wizard__chip,
  .area-wizard__summary,
  .area-wizard__summary div,
  .area-wizard__foot,
  .area-wizard__body > div {
    animation: none !important;
    transition-duration: 0.01ms !important;
  }
  .area-wizard__badge { animation: none !important; }
}

@media (max-width: 768px) {
  .area-wizard {
    top: auto;
    bottom: 0.5rem;
    left: 0.5rem;
    right: 0.5rem;
    width: auto;
    max-height: 60svh;
  }
}
</style>
