<template>
  <Transition name="modal-fade">
    <div v-if="visible" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm" @click.self="$emit('close')" @keydown.escape="$emit('close')" tabindex="0" ref="modalRef">
      <div class="obs-panel w-[min(92vw,520px)] max-h-[88vh] overflow-y-auto" @click.stop>
        <!-- Header -->
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h2 class="text-sm font-black text-emerald-400 uppercase tracking-wider">Community Monitoring</h2>
            <span v-if="contributions.length" class="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">{{ contributions.length }}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <button type="button" class="text-[9px] text-zinc-500 hover:text-emerald-400 px-2 py-1 rounded border border-zinc-800 hover:border-emerald-500/30 transition-colors" @click="exportContributions" title="Export as JSON">Export</button>
            <label class="text-[9px] text-zinc-500 hover:text-emerald-400 px-2 py-1 rounded border border-zinc-800 hover:border-emerald-500/30 transition-colors cursor-pointer" title="Import from JSON">
              Import
              <input type="file" accept=".json" class="hidden" @change="importContributions" />
            </label>
            <button type="button" class="text-zinc-500 hover:text-red-400 text-lg leading-none" @click="$emit('close')" aria-label="Close">×</button>
          </div>
        </div>

        <!-- Mode Toggle -->
        <div class="flex gap-1 mb-4 p-0.5 rounded-lg border border-zinc-800 bg-zinc-900/50">
          <button
            type="button"
            class="flex-1 text-[9px] font-bold py-1.5 rounded-md transition-all"
            :class="formMode === 'update' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-zinc-500 hover:text-zinc-300 border border-transparent'"
            @click="formMode = 'update'"
          >Monitoring Update</button>
          <button
            type="button"
            class="flex-1 text-[9px] font-bold py-1.5 rounded-md transition-all"
            :class="formMode === 'pin' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-zinc-500 hover:text-zinc-300 border border-transparent'"
            @click="formMode = 'pin'"
          >Community Pin</button>
        </div>

        <!-- Contribution Form -->
        <div class="mb-4 p-3 rounded-lg border border-zinc-800 bg-zinc-900/50">
          <h3 class="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-3">Add Monitoring Update</h3>

          <!-- Location -->
          <div class="mb-3">
            <label class="text-[9px] text-zinc-500 uppercase tracking-wider mb-1 block">Location <span class="text-red-400">*</span></label>
            <div class="flex gap-2">
              <div class="flex-1 relative">
                <input
                  v-model="form.locationName"
                  placeholder="Location name..."
                  class="obs-input"
                  @input="onLocationInput"
                  @focus="showAutocomplete = locationSuggestions.length > 0"
                  @blur="hideAutocompleteDelayed"
                  autocomplete="off"
                />
                <div v-if="showAutocomplete && locationSuggestions.length" class="absolute z-50 top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden shadow-xl max-h-40 overflow-y-auto">
                  <button
                    v-for="(suggestion, i) in locationSuggestions"
                    :key="i"
                    type="button"
                    class="w-full text-left px-3 py-2 text-[10px] text-zinc-300 hover:bg-zinc-800 transition-colors border-b border-zinc-800/50 last:border-0"
                    @mousedown.prevent="selectSuggestion(suggestion)"
                  >
                    <span class="font-bold">{{ suggestion.name }}</span>
                    <span class="text-zinc-500 ml-1">— {{ suggestion.municipality }}</span>
                  </button>
                </div>
              </div>
              <button
                type="button"
                class="obs-btn-sm"
                @click="getCurrentLocation"
                :disabled="geoPending"
                title="Use my current location"
              >
                {{ geoPending ? '...' : '📍' }}
              </button>
              <button
                type="button"
                class="obs-btn-sm"
                :class="{ 'obs-btn-sm--active': pinMode }"
                @click="togglePinMode"
                title="Click on map to set location"
              >
                🗺️
              </button>
            </div>
            <div v-if="pinMode" class="text-[8px] text-emerald-400 mt-1 animate-pulse">Click anywhere on the map to place your pin</div>
            <div v-if="form.lat && form.lng" class="flex items-center gap-2 mt-1">
              <span class="text-[8px] text-zinc-600 font-mono">{{ form.lat.toFixed(4) }}, {{ form.lng.toFixed(4) }}</span>
              <button type="button" class="text-[8px] text-red-400/60 hover:text-red-400" @click="clearCoords">clear</button>
            </div>
          </div>

          <!-- Type -->
          <div class="mb-3">
            <label class="text-[9px] text-zinc-500 uppercase tracking-wider mb-1 block">Type <span class="text-red-400">*</span></label>
            <select v-model="form.type" class="obs-select">
              <option value="observation">General Observation</option>
              <option value="contamination">Water/Soil Contamination</option>
              <option value="activity">Mining Activity</option>
              <option value="wildlife">Wildlife Impact</option>
              <option value="community">Community Impact</option>
              <option value="heritage">Cultural Heritage</option>
            </select>
            <p class="text-[8px] text-zinc-600 mt-1">{{ typeGuidance }}</p>
          </div>

          <!-- Description -->
          <div class="mb-3">
            <label class="text-[9px] text-zinc-500 uppercase tracking-wider mb-1 block">Description <span class="text-red-400">*</span></label>
            <textarea
              v-model="form.description"
              :placeholder="typePlaceholder"
              class="obs-textarea"
              rows="3"
            />
            <div class="flex items-center justify-between mt-1">
              <span v-if="form.description.length > 0 && form.description.length < 10" class="text-[8px] text-amber-400">Minimum 10 characters ({{ form.description.length }}/10)</span>
              <span v-else-if="form.description.length >= 10" class="text-[8px] text-emerald-400">{{ form.description.length }} characters</span>
              <span v-else class="text-[8px] text-zinc-600">Describe what you observed</span>
            </div>
          </div>

          <!-- Photos -->
          <div class="mb-3">
            <label class="text-[9px] text-zinc-500 uppercase tracking-wider mb-1 block">Photos</label>
            <div class="flex flex-wrap gap-2">
              <div
                v-for="(photo, i) in form.photos"
                :key="i"
                class="relative w-16 h-16 rounded-lg overflow-hidden border border-zinc-700 group"
              >
                <img :src="photo" class="w-full h-full object-cover cursor-pointer" @click="previewPhoto = photo" />
                <button
                  type="button"
                  class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-400 text-xs transition-opacity"
                  @click="removePhoto(i)"
                >×</button>
              </div>
              <label
                v-if="form.photos.length < 5"
                class="w-16 h-16 rounded-lg border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500/50 transition-colors"
              >
                <span class="text-zinc-500 text-lg">+</span>
                <span class="text-[7px] text-zinc-600">Photo</span>
                <input type="file" accept="image/*" class="hidden" @change="onPhotoUpload" multiple />
              </label>
            </div>
            <p class="text-[8px] text-zinc-600 mt-1">Max 5 photos, 10MB each. Images compressed on upload.</p>
          </div>

          <!-- Actions -->
          <div class="flex gap-2">
            <button
              type="button"
              class="obs-btn obs-btn--primary flex-1"
              :disabled="!canSubmit || submitting"
              @click="submitContribution"
            >
              <span v-if="submitting" class="flex items-center gap-1.5">
                <span class="w-3 h-3 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                Compressing...
              </span>
              <span v-else>{{ canSubmit ? 'Submit Update' : 'Fill required fields' }}</span>
            </button>
            <button type="button" class="obs-btn" @click="resetForm">Clear</button>
          </div>
          <div v-if="submitResult" class="mt-2 text-[8px]" :class="submitResult.synced ? 'text-emerald-400' : submitResult.error ? 'text-amber-400' : 'text-zinc-500'">
            {{ submitResult.synced ? '✓ Synced to cloud' : submitResult.error ? `⚠ Saved locally: ${submitResult.error}` : 'Saved locally (sign in to sync)' }}
          </div>
        </div>

        <!-- Community Pin Form (shown when formMode === 'pin') -->
        <div v-if="formMode === 'pin'" class="mb-4 p-3 rounded-lg border border-amber-800/30 bg-amber-900/10">
          <h3 class="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-3">Add Community Pin</h3>
          <p class="text-[8px] text-zinc-500 mb-3">Register a cultural agent, venue, event, or point of attention on the Vulcan Observatory map.</p>

          <!-- Pin Type -->
          <div class="mb-3">
            <label class="text-[9px] text-zinc-500 uppercase tracking-wider mb-1 block">Pin Type <span class="text-red-400">*</span></label>
            <select v-model="pinForm.pin_type" class="obs-select">
              <option value="cultural_agent">Cultural Agent (pessoa/organização)</option>
              <option value="cultural_avenue">Cultural Avenue / Space</option>
              <option value="show_event">Show / Event / Festival</option>
              <option value="action">Action / Campaign / Mobilization</option>
              <option value="point_of_attention">Point of Attention / Heritage</option>
            </select>
          </div>

          <!-- Name -->
          <div class="mb-3">
            <label class="text-[9px] text-zinc-500 uppercase tracking-wider mb-1 block">Name <span class="text-red-400">*</span></label>
            <input v-model="pinForm.name" placeholder="Agent name, venue, event..." class="obs-input" />
          </div>

          <!-- Description -->
          <div class="mb-3">
            <label class="text-[9px] text-zinc-500 uppercase tracking-wider mb-1 block">Description</label>
            <textarea v-model="pinForm.description" placeholder="Brief description of the cultural agent or activity..." class="obs-textarea" rows="2" />
          </div>

          <!-- Location -->
          <div class="mb-3">
            <label class="text-[9px] text-zinc-500 uppercase tracking-wider mb-1 block">Location <span class="text-red-400">*</span></label>
            <div class="flex gap-2">
              <button type="button" class="obs-btn-sm flex-1" @click="getCurrentLocationPin" :disabled="geoPending">
                {{ geoPending ? 'Locating...' : '📍 Use my location' }}
              </button>
              <button type="button" class="obs-btn-sm flex-1" :class="{ 'obs-btn-sm--active': pinMode }" @click="togglePinMode" title="Click map to place">
                🗺️ Click on map
              </button>
            </div>
            <div v-if="pinMode" class="text-[8px] text-amber-400 mt-1 animate-pulse">Click anywhere on the map to place your pin</div>
            <div v-if="pinForm.latitude && pinForm.longitude" class="flex items-center gap-2 mt-1">
              <span class="text-[8px] text-zinc-600 font-mono">{{ pinForm.latitude.toFixed(4) }}, {{ pinForm.longitude.toFixed(4) }}</span>
              <button type="button" class="text-[8px] text-red-400/60 hover:text-red-400" @click="clearPinCoords">clear</button>
            </div>
          </div>

          <!-- Submit -->
          <div class="flex gap-2">
            <button type="button" class="obs-btn obs-btn--primary obs-btn--amber flex-1" :disabled="!canSubmitPin || pinSubmitting" @click="submitPin">
              <span v-if="pinSubmitting" class="flex items-center gap-1.5">
                <span class="w-3 h-3 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                Submitting...
              </span>
              <span v-else>{{ canSubmitPin ? 'Register Pin' : 'Fill required fields' }}</span>
            </button>
            <button type="button" class="obs-btn" @click="resetPinForm">Clear</button>
          </div>
          <div v-if="pinSubmitResult" class="mt-2 text-[8px]" :class="pinSubmitResult.success ? 'text-emerald-400' : 'text-amber-400'">
            {{ pinSubmitResult.success ? '✓ Pin created — pending approval' : `⚠ ${pinSubmitResult.error}` }}
          </div>
        </div>

        <!-- Existing Contributions -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Your Updates ({{ contributions.length }})
            </h3>
            <button
              v-if="contributions.length > 0"
              type="button"
              class="text-[9px] text-zinc-600 hover:text-red-400 transition-colors"
              @click="confirmClearAll"
            >Clear all</button>
          </div>

          <div v-if="contributions.length === 0" class="text-center py-6">
            <span class="text-2xl mb-2 block">📝</span>
            <p class="text-[10px] text-zinc-500">No monitoring updates yet. Be the first to contribute!</p>
          </div>

          <div
            v-for="(contrib, i) in contributions"
            :key="contrib.id || i"
            class="mb-2 p-3 rounded-lg border border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 transition-colors"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5 mb-1">
                  <span class="text-[8px] font-bold px-1.5 py-0.5 rounded" :style="{ background: typeColor(contrib.update_type), color: '#fff' }">
                    {{ typeLabel(contrib.update_type) }}
                  </span>
                  <span class="text-[8px] text-zinc-500">{{ formatDate(contrib.created_at) }}</span>
                </div>
                <h4 class="text-[11px] font-bold text-zinc-200 truncate">{{ contrib.location_name || 'Unnamed location' }}</h4>
                <p class="text-[9px] text-zinc-400 mt-0.5 line-clamp-2">{{ contrib.description }}</p>
                <div v-if="contrib.lat && contrib.lng" class="text-[8px] text-zinc-600 font-mono mt-1">
                  {{ contrib.lat.toFixed(4) }}, {{ contrib.lng.toFixed(4) }}
                </div>
              </div>
              <button
                type="button"
                class="text-zinc-600 hover:text-red-400 text-xs shrink-0"
                @click="removeContribution(contrib)"
                aria-label="Remove"
              >×</button>
            </div>
            <div v-if="contrib.photo_base64?.length" class="flex gap-1 mt-2">
              <img
                v-for="(photo, pi) in contrib.photo_base64"
                :key="pi"
                :src="photo"
                class="w-12 h-12 rounded object-cover border border-zinc-800 cursor-pointer hover:opacity-80 transition-opacity"
                @click="previewPhoto = photo"
              />
            </div>
          </div>
        </div>

        <!-- Keyboard hint -->
        <div class="mt-3 text-center">
          <p class="text-[7px] text-zinc-700">ESC to close · Enter to submit</p>
        </div>
      </div>
    </div>
  </Transition>

  <!-- Photo Preview Modal -->
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="previewPhoto" class="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90" @click.self="previewPhoto = null" @keydown.escape="previewPhoto = null">
        <img :src="previewPhoto" class="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl" />
        <button type="button" class="absolute top-4 right-4 text-white/70 hover:text-white text-2xl" @click="previewPhoto = null">×</button>
      </div>
    </Transition>
  </Teleport>

  <!-- Confirmation Dialog -->
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="confirmDialog" class="fixed inset-0 z-[10001] flex items-center justify-center bg-black/80" @click.self="confirmDialog = null">
        <div class="obs-panel w-[min(85vw,360px)] text-center">
          <p class="text-[12px] text-zinc-200 mb-4">{{ confirmDialog.message }}</p>
          <div class="flex gap-2 justify-center">
            <button type="button" class="obs-btn obs-btn--danger" @click="confirmDialog.action(); confirmDialog = null">Confirm</button>
            <button type="button" class="obs-btn" @click="confirmDialog = null">Cancel</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import type { ObservatoryUpdate } from '~/composables/useObservatoryUpdates'

interface LocationSuggestion {
  name: string
  municipality: string
  lat: number
  lng: number
}

interface ConfirmDialog {
  message: string
  action: () => void
}

interface SubmitResult {
  synced: boolean
  error?: string
}

interface PinSubmitResult {
  success: boolean
  error?: string
}

const props = defineProps<{ visible: boolean; mapClickMode?: boolean; existingFeatureNames?: LocationSuggestion[] }>()
const emit = defineEmits<{ close: []; 'pin-placed': [lat: number, lng: number]; 'map-click-mode-change': [active: boolean] }>()

const { submitUpdate, deleteUpdate, getLocalUpdates } = useObservatoryUpdates()
const { submitPin: submitCommunityPin } = useCulturalAgentsData(useRuntimeConfig().app.baseURL as string)

const formMode = ref<'update' | 'pin'>('update')

const form = ref({
  locationName: '',
  type: 'observation',
  description: '',
  photos: [] as string[],
  lat: undefined as number | undefined,
  lng: undefined as number | undefined,
})

const pinForm = ref({
  pin_type: 'cultural_agent',
  name: '',
  description: '',
  latitude: undefined as number | undefined,
  longitude: undefined as number | undefined,
})

const geoPending = ref(false)
const pinMode = ref(false)
const showAutocomplete = ref(false)
const locationSuggestions = ref<LocationSuggestion[]>([])
const contributions = ref<ObservatoryUpdate[]>(loadContributions())
const previewPhoto = ref<string | null>(null)
const confirmDialog = ref<ConfirmDialog | null>(null)
const modalRef = ref<HTMLElement | null>(null)
const submitting = ref(false)
const submitResult = ref<SubmitResult | null>(null)
const pinSubmitting = ref(false)
const pinSubmitResult = ref<PinSubmitResult | null>(null)

const TYPE_GUIDANCE: Record<string, string> = {
  observation: 'General observation about environmental or community conditions.',
  contamination: 'Report water or soil contamination. Include affected water bodies, visible pollution, or health symptoms in the community.',
  activity: 'Document mining activity, exploration, or related infrastructure. Include company names, dates, and scale if known.',
  wildlife: 'Record wildlife impacts: habitat loss, species displacement, mortality events, or behavioral changes.',
  community: 'Document social, economic, or health impacts on local communities. Include affected population and severity.',
  heritage: 'Report threats to cultural heritage sites, indigenous territories, traditional practices, or historical landmarks.',
}

const TYPE_PLACEHOLDERS: Record<string, string> = {
  observation: 'Describe the environmental conditions you observed...',
  contamination: 'Describe contamination signs: color, smell, affected area, health impacts...',
  activity: 'Describe the mining activity: type, location, company, estimated scale...',
  wildlife: 'Describe wildlife impact: species, habitat area, behavioral changes...',
  community: 'Describe community impact: affected people, services, severity...',
  heritage: 'Describe heritage threat: site name, type of threat, urgency...',
}

const typeGuidance = computed(() => TYPE_GUIDANCE[form.value.type] || TYPE_GUIDANCE.observation)
const typePlaceholder = computed(() => TYPE_PLACEHOLDERS[form.value.type] || TYPE_PLACEHOLDERS.observation)

const canSubmit = computed(() => form.value.description.trim().length >= 10 && form.value.type)
const canSubmitPin = computed(() => pinForm.value.name.trim().length >= 2 && pinForm.value.latitude != null && pinForm.value.longitude != null)

const DEFAULT_FEATURE_NAMES: LocationSuggestion[] = [
  { name: 'Poços de Caldas', municipality: 'Poços de Caldas', lat: -21.7878, lng: -46.5614 },
  { name: 'Caldas', municipality: 'Caldas', lat: -21.924, lng: -46.386 },
  { name: 'Águas da Prata', municipality: 'Águas da Prata', lat: -21.933, lng: -46.739 },
  { name: 'Andradas', municipality: 'Andradas', lat: -22.069, lng: -46.568 },
  { name: 'Santa Rita de Caldas', municipality: 'Santa Rita de Caldas', lat: -22.029, lng: -46.337 },
  { name: 'Caconde', municipality: 'Caconde', lat: -21.528, lng: -46.688 },
  { name: 'Divinolândia', municipality: 'Divinolândia', lat: -21.664, lng: -46.736 },
  { name: 'São João da Boa Vista', municipality: 'São João da Boa Vista', lat: -21.968, lng: -46.797 },
  { name: 'Vargem Grande do Sul', municipality: 'Vargem Grande do Sul', lat: -21.830, lng: -46.895 },
  { name: 'Aldeia Xucuru Kariri — Fazenda Boa Vista', municipality: 'Caldas', lat: -21.865, lng: -46.355 },
  { name: 'Aldeia Ibiramã Kiriri — Rio Verde', municipality: 'Caldas', lat: -21.915, lng: -46.375 },
  { name: 'Quilombo da Favela', municipality: 'Poços de Caldas', lat: -21.650, lng: -46.550 },
]

function getAllFeatureNames(): LocationSuggestion[] {
  const names = [...DEFAULT_FEATURE_NAMES]
  if (props.existingFeatureNames?.length) {
    for (const f of props.existingFeatureNames) {
      if (!names.find(n => n.name === f.name)) names.push(f)
    }
  }
  return names
}

function onLocationInput() {
  const query = form.value.locationName.toLowerCase().trim()
  if (query.length < 2) {
    locationSuggestions.value = []
    showAutocomplete.value = false
    return
  }
  const all = getAllFeatureNames()
  locationSuggestions.value = all.filter(n =>
    n.name.toLowerCase().includes(query) || n.municipality.toLowerCase().includes(query)
  ).slice(0, 8)
  showAutocomplete.value = locationSuggestions.value.length > 0
}

function selectSuggestion(suggestion: LocationSuggestion) {
  form.value.locationName = suggestion.name
  form.value.lat = suggestion.lat
  form.value.lng = suggestion.lng
  showAutocomplete.value = false
}

function hideAutocompleteDelayed() {
  setTimeout(() => { showAutocomplete.value = false }, 200)
}

function togglePinMode() {
  pinMode.value = !pinMode.value
  emit('map-click-mode-change', pinMode.value)
}

function onMapClick(lat: number, lng: number) {
  if (pinMode.value) {
    if (formMode.value === 'pin') {
      pinForm.value.latitude = lat
      pinForm.value.longitude = lng
    } else {
      form.value.lat = lat
      form.value.lng = lng
    }
    pinMode.value = false
    emit('map-click-mode-change', false)
  }
}

function clearCoords() {
  form.value.lat = undefined
  form.value.lng = undefined
}

function getCurrentLocation() {
  if (!navigator.geolocation) return
  geoPending.value = true
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      form.value.lat = pos.coords.latitude
      form.value.lng = pos.coords.longitude
      geoPending.value = false
    },
    () => { geoPending.value = false },
    { enableHighAccuracy: true, timeout: 10000 },
  )
}

function onPhotoUpload(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files) return
  const files = Array.from(input.files).slice(0, 5 - form.value.photos.length)
  for (const file of files) {
    if (file.size > 10 * 1024 * 1024) continue
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        form.value.photos.push(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }
  input.value = ''
}

function removePhoto(idx: number) {
  form.value.photos.splice(idx, 1)
}

async function submitContribution() {
  if (!canSubmit.value || submitting.value) return
  submitting.value = true
  submitResult.value = null

  try {
    const result = await submitUpdate({
      update_type: form.value.type,
      description: form.value.description,
      location_name: form.value.locationName || undefined,
      lat: form.value.lat,
      lng: form.value.lng,
      photos: form.value.photos,
    })

    submitResult.value = { synced: result.synced ?? false, error: result.error }

    // Refresh contributions list
    contributions.value = getLocalUpdates()

    if (!result.error) {
      resetForm()
    }
  } finally {
    submitting.value = false
    setTimeout(() => { submitResult.value = null }, 5000)
  }
}

function resetForm() {
  form.value = { locationName: '', type: 'observation', description: '', photos: [], lat: undefined, lng: undefined }
}

function clearPinCoords() {
  pinForm.value.latitude = undefined
  pinForm.value.longitude = undefined
}

function getCurrentLocationPin() {
  if (!navigator.geolocation) return
  geoPending.value = true
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      pinForm.value.latitude = pos.coords.latitude
      pinForm.value.longitude = pos.coords.longitude
      geoPending.value = false
    },
    () => { geoPending.value = false },
    { enableHighAccuracy: true, timeout: 10000 },
  )
}

function resetPinForm() {
  pinForm.value = { pin_type: 'cultural_agent', name: '', description: '', latitude: undefined, longitude: undefined }
}

async function submitPin() {
  if (!canSubmitPin.value || pinSubmitting.value) return
  pinSubmitting.value = true
  pinSubmitResult.value = null

  try {
    const result = await submitCommunityPin({
      pin_type: pinForm.value.pin_type,
      name: pinForm.value.name.trim(),
      description: pinForm.value.description.trim() || undefined,
      latitude: pinForm.value.latitude!,
      longitude: pinForm.value.longitude!,
    })

    pinSubmitResult.value = result
    if (result.success) {
      resetPinForm()
    }
  } catch (e) {
    pinSubmitResult.value = { success: false, error: e instanceof Error ? e.message : 'Network error' }
  } finally {
    pinSubmitting.value = false
    setTimeout(() => { pinSubmitResult.value = null }, 6000)
  }
}

async function removeContribution(contrib: ObservatoryUpdate) {
  await deleteUpdate(contrib.id)
  contributions.value = getLocalUpdates()
}

function confirmClearAll() {
  confirmDialog.value = {
    message: `Clear all ${contributions.value.length} monitoring updates? This cannot be undone.`,
    action: async () => {
      for (const c of contributions.value) {
        await deleteUpdate(c.id)
      }
      contributions.value = getLocalUpdates()
    },
  }
}

function exportContributions() {
  const data = JSON.stringify(contributions.value, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `community-contributions-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function importContributions(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return
  const file = input.files[0]
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result as string) as ObservatoryUpdate[]
      if (!Array.isArray(imported)) throw new Error('Invalid format')
      const valid = imported.filter(c => c.description && c.update_type && c.created_at)
      contributions.value = [...valid, ...contributions.value]
      // Note: imported items stay local only, not synced
    } catch { /* invalid file */ }
  }
  reader.readAsText(file)
  input.value = ''
}

function loadContributions(): ObservatoryUpdate[] {
  return getLocalUpdates()
}

function typeLabel(type: string): string {
  const labels: Record<string, string> = {
    observation: 'OBS',
    contamination: 'WATER',
    activity: 'MINING',
    wildlife: 'WILD',
    community: 'COMM',
    heritage: 'HERIT',
  }
  return labels[type] || 'OBS'
}

function typeColor(type: string): string {
  const colors: Record<string, string> = {
    observation: '#3498db',
    contamination: '#e74c3c',
    activity: '#f39c12',
    wildlife: '#27ae60',
    community: '#9b59b6',
    heritage: '#e67e22',
  }
  return colors[type] || '#3498db'
}

function formatDate(ts: string | number): string {
  const d = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return d.toLocaleDateString()
}

function handleKeydown(e: KeyboardEvent) {
  if (!props.visible) return
  if (e.key === 'Escape') {
    if (previewPhoto.value) { previewPhoto.value = null; return }
    if (confirmDialog.value) { confirmDialog.value = null; return }
    emit('close')
  }
  if (e.key === 'Enter' && e.ctrlKey && canSubmit.value) {
    submitContribution()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

watch(() => props.visible, async (v) => {
  if (v) {
    await nextTick()
    modalRef.value?.focus()
  }
})

defineExpose({ onMapClick })
</script>

<style scoped>
.obs-panel {
  background: var(--obs-panel-bg-dark);
  backdrop-filter: blur(20px) saturate(1.3);
  -webkit-backdrop-filter: blur(20px) saturate(1.3);
  border: 1px solid var(--obs-panel-border);
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.obs-input, .obs-select, .obs-textarea {
  width: 100%;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 6px 10px;
  color: var(--obs-text-primary);
  font-size: 11px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
}
.obs-input:focus, .obs-select:focus, .obs-textarea:focus {
  border-color: rgba(46, 204, 113, 0.4);
}
.obs-textarea { resize: vertical; min-height: 60px; }
.obs-select { appearance: none; cursor: pointer; }
.obs-btn {
  padding: 6px 12px;
  font-size: 10px;
  font-weight: 700;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: var(--obs-text-label);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.obs-btn:hover { background: rgba(255, 255, 255, 0.08); }
.obs-btn--primary {
  background: rgba(46, 204, 113, 0.15);
  border-color: rgba(46, 204, 113, 0.3);
  color: #2ecc71;
}
.obs-btn--primary:hover { background: rgba(46, 204, 113, 0.25); }
.obs-btn--primary:disabled { opacity: 0.3; cursor: not-allowed; }
.obs-btn--danger {
  background: rgba(231, 76, 60, 0.15);
  border-color: rgba(231, 76, 60, 0.3);
  color: #e74c3c;
}
.obs-btn--danger:hover { background: rgba(231, 76, 60, 0.25); }
.obs-btn-sm {
  padding: 4px 8px;
  font-size: 11px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  cursor: pointer;
  transition: all 0.15s;
}
.obs-btn-sm:hover { background: rgba(255, 255, 255, 0.08); }
.obs-btn-sm:disabled { opacity: 0.3; cursor: not-allowed; }
.obs-btn-sm--active {
  background: rgba(46, 204, 113, 0.2);
  border-color: rgba(46, 204, 113, 0.4);
}

.modal-fade-enter-active { transition: opacity 0.2s ease; }
.modal-fade-leave-active { transition: opacity 0.15s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
</style>
