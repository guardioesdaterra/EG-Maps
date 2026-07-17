/**
 * components/observatory/GeoLocateModal.vue
 * @why Modal for searching locations by name with geocoding
 * @component GeoLocateModal
 * @props visible: boolean
 * @emits 'close': []
  'locate': [lat: number, lng: number, city: string]
 * @deps vue (ref, nextTick); @/composables/useGeoLocate (useGeoLocate, type CitySuggestion)
 */
<template>
  <Teleport to="body">
    <Transition name="geo-modal">
      <div v-if="visible" class="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-md geo-locate-backdrop" @click.self="onDismiss">
        <div class="obs-geo-modal" role="dialog" :aria-label="t('observatory.geoLocate.title')" ref="geoModalRef">
          
          <template v-if="step === 'prompt'">
            <Icon name="lucide:globe" class="obs-geo-modal__icon w-9 h-9" />
            <h2 class="obs-geo-modal__title">{{ t('observatory.geoLocate.title') }}</h2>
            <p class="obs-geo-modal__desc">{{ t('observatory.geoLocate.description') }}</p>

            <button
              type="button"
              class="obs-geo-modal__btn obs-geo-modal__btn--primary"
              :disabled="isLocating"
              @click="onLocate"
            >
              <span v-if="isLocating" class="obs-geo-modal__spinner" />
              <Icon v-else name="lucide:map-pin" class="w-3.5 h-3.5" />
              {{ isLocating ? t('observatory.geoLocate.locating') : t('observatory.geoLocate.useLocation') }}
            </button>

            <div class="obs-geo-modal__divider">
              <span>{{ t('observatory.geoLocate.or') }}</span>
            </div>

            <div class="obs-geo-modal__city-input-wrap">
              <input
                ref="cityInput"
                v-model="cityQuery"
                class="obs-geo-modal__city-input"
                :placeholder="t('observatory.geoLocate.cityPlaceholder')"
                :aria-label="t('observatory.geoLocate.cityPlaceholder')"
                @input="onCityInput"
                @keydown.enter="onCitySearch"
              />
              <button
                type="button"
                class="obs-geo-modal__city-search-btn"
                :disabled="!cityQuery.trim() || isSearching"
                @click="onCitySearch"
              >
                {{ isSearching ? '...' : '→' }}
              </button>
            </div>

            
            <div v-if="suggestions.length > 0" class="obs-geo-modal__suggestions">
              <button
                v-for="(s, i) in suggestions"
                :key="i"
                type="button"
                class="obs-geo-modal__suggestion"
                @click="onSelectCity(s)"
              >
                <span class="obs-geo-modal__suggestion-city">{{ s.city }}</span>
                <span class="obs-geo-modal__suggestion-detail">{{ s.state }}, {{ s.country }}</span>
              </button>
            </div>

            
            <div v-if="geoError" class="obs-geo-modal__error">
              ⚠️ {{ geoError }}
            </div>

            <button type="button" class="obs-geo-modal__skip" @click="onDismiss">
              {{ t('observatory.geoLocate.skip') }}
            </button>
          </template>

          
          <template v-else-if="step === 'confirm'">
            <Icon name="lucide:map-pin" class="obs-geo-modal__icon w-9 h-9" />
            <h2 class="obs-geo-modal__title">{{ t('observatory.geoLocate.foundTitle') }}</h2>
            <div class="obs-geo-modal__location-card">
              <div class="obs-geo-modal__location-city">{{ detectedCity }}</div>
              <div class="obs-geo-modal__location-detail">{{ detectedDetail }}</div>
            </div>
            <p class="obs-geo-modal__desc">{{ t('observatory.geoLocate.foundDesc') }}</p>

            <div class="obs-geo-modal__actions">
              <button type="button" class="obs-geo-modal__btn obs-geo-modal__btn--primary" @click="onConfirm">
                {{ t('observatory.geoLocate.showNearby') }}
              </button>
              <button type="button" class="obs-geo-modal__btn obs-geo-modal__btn--secondary" @click="step = 'prompt'">
                {{ t('observatory.geoLocate.wrongPlace') }}
              </button>
            </div>

            <button type="button" class="obs-geo-modal__skip" @click="onDismiss">
              {{ t('observatory.geoLocate.skip') }}
            </button>
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">

import { ref, computed, nextTick } from 'vue'
import { useGeoLocate, type CitySuggestion } from '@/composables/useGeoLocate'
import { useFocusTrap } from '@/composables/useFocusTrap'

const { t } = useI18n()

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'close': []
  'locate': [lat: number, lng: number, city: string]
}>()

const geo = useGeoLocate()

const geoModalRef = ref<HTMLElement | null>(null)
const isActive = computed(() => props.visible)
useFocusTrap(geoModalRef, { active: isActive })

const step = ref<'prompt' | 'confirm'>('prompt')
const cityQuery = ref('')
const cityInput = ref<HTMLInputElement | null>(null)
const isLocating = ref(false)
const isSearching = ref(false)
const detectedCity = ref('')
const detectedDetail = ref('')
const detectedLat = ref(0)
const detectedLng = ref(0)
const geoError = ref<string | null>(null)
const suggestions = ref<CitySuggestion[]>([])

nextTick(() => { cityInput.value?.focus() })

let searchTimer: ReturnType<typeof setTimeout> | null = null

function onCityInput() {
  if (searchTimer) clearTimeout(searchTimer)
  if (cityQuery.value.trim().length < 2) {
    suggestions.value = []
    return
  }
  searchTimer = setTimeout(onCitySearch, 400)
}

async function onCitySearch() {
  if (!cityQuery.value.trim()) return
  isSearching.value = true
  geoError.value = null
  try {
    const results = await geo.searchCity(cityQuery.value)
    suggestions.value = results
    if (results.length === 0) {
      geoError.value = t('observatory.geoLocate.noResults')
    }
  } catch {
    geoError.value = t('observatory.geoLocate.searchFailed')
  } finally {
    isSearching.value = false
  }
}

function onSelectCity(city: CitySuggestion) {
  const loc = geo.selectCity(city)
  detectedLat.value = loc.lat
  detectedLng.value = loc.lng
  detectedCity.value = city.city
  detectedDetail.value = [city.state, city.country].filter(Boolean).join(', ')
  step.value = 'confirm'
  suggestions.value = []
  cityQuery.value = ''
}

async function onLocate() {
  isLocating.value = true
  geoError.value = null
  try {
    const loc = await geo.locate()
    if (!loc) {
      geoError.value = t('observatory.geoLocate.denied')
      return
    }
    detectedLat.value = loc.lat
    detectedLng.value = loc.lng
    detectedCity.value = geo.address.value?.city || t('observatory.geoLocate.yourArea')
    detectedDetail.value = [geo.address.value?.state, geo.address.value?.country].filter(Boolean).join(', ')
    step.value = 'confirm'
  } catch {
    geoError.value = t('observatory.geoLocate.failed')
  } finally {
    isLocating.value = false
  }
}

function onConfirm() {
  emit('locate', detectedLat.value, detectedLng.value, detectedCity.value)
  emit('close')
}

function onDismiss() {
  emit('close')
}

</script>

<style scoped>
.obs-geo-modal {
  background: rgba(12, 12, 15, 0.96);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.03) inset;
  width: clamp(300px, 40vw, 380px);
  padding: clamp(16px, 2.5vw, 28px) clamp(16px, 2.5vw, 28px) clamp(10px, 1.5vw, 20px);
  text-align: center;
  font-family: inherit;
}
.obs-geo-modal__icon {
  font-size: 36px;
  margin-bottom: 10px;
}
.obs-geo-modal__title {
  margin: 0 0 6px;
  font-size: clamp(15px, 2.2vw, 20px);
  font-weight: 800;
  color: #e8e8e8;
  letter-spacing: -0.01em;
}
.obs-geo-modal__desc {
  margin: 0 0 18px;
  font-size: clamp(11px, 1.6vw, 14px);
  color: rgba(255, 255, 255, 0.4);
  line-height: 1.5;
}

.obs-geo-modal__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: clamp(6px, 1.2vw, 12px) clamp(10px, 2vw, 20px);
  border-radius: 10px;
  font-size: clamp(12px, 1.8vw, 15px);
  font-weight: 700;
  border: 1px solid transparent;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s ease;
}
.obs-geo-modal__btn--primary {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
  color: #fff;
  border-color: rgba(231, 76, 60, 0.4);
  box-shadow: 0 4px 16px rgba(231, 76, 60, 0.25);
}
.obs-geo-modal__btn--primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #ff5533, #e74c3c);
  box-shadow: 0 6px 20px rgba(231, 76, 60, 0.35);
  transform: translateY(-1px);
}
.obs-geo-modal__btn--primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.obs-geo-modal__btn--secondary {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.6);
  border-color: rgba(255, 255, 255, 0.1);
}
.obs-geo-modal__btn--secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
}

.obs-geo-modal__divider {
  display: flex;
  align-items: center;
  gap: clamp(6px, 1.2vw, 12px);
  margin: clamp(10px, 1.5vw, 20px) 0;
  font-size: clamp(9px, 1.4vw, 12px);
  color: rgba(255, 255, 255, 0.25);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.obs-geo-modal__divider::before,
.obs-geo-modal__divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
}

.obs-geo-modal__city-input-wrap {
  display: flex;
  gap: clamp(4px, 0.8vw, 8px);
}
.obs-geo-modal__city-input {
  flex: 1;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: clamp(6px, 1.2vw, 12px);
  font-size: clamp(12px, 1.8vw, 15px);
  color: rgba(255, 255, 255, 0.85);
  outline: none;
  font-family: inherit;
  transition: border-color 0.15s;
}
.obs-geo-modal__city-input:focus {
  border-color: rgba(231, 76, 60, 0.4);
}
.obs-geo-modal__city-input::placeholder {
  color: rgba(255, 255, 255, 0.25);
}
.obs-geo-modal__city-search-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(231, 76, 60, 0.15);
  border: 1px solid rgba(231, 76, 60, 0.3);
  border-radius: 8px;
  color: #e74c3c;
  font-size: clamp(14px, 2vw, 18px);
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}
.obs-geo-modal__city-search-btn:hover:not(:disabled) {
  background: rgba(231, 76, 60, 0.25);
}
.obs-geo-modal__city-search-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.obs-geo-modal__suggestions {
  margin-top: 8px;
  max-height: 160px;
  overflow-y: auto;
}
.obs-geo-modal__suggestion {
  display: flex;
  align-items: center;
  gap: clamp(6px, 1.2vw, 12px);
  width: 100%;
  padding: clamp(6px, 1.2vw, 12px);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  margin-bottom: 4px;
  cursor: pointer;
  text-align: left;
  transition: all 0.12s;
}
.obs-geo-modal__suggestion:hover {
  background: rgba(231, 76, 60, 0.1);
  border-color: rgba(231, 76, 60, 0.2);
}
.obs-geo-modal__suggestion-city {
  font-size: clamp(12px, 1.8vw, 15px);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
}
.obs-geo-modal__suggestion-detail {
  font-size: clamp(10px, 1.5vw, 13px);
  color: rgba(255, 255, 255, 0.35);
}

.obs-geo-modal__error {
  margin-top: 10px;
  padding: clamp(6px, 1.2vw, 12px);
  background: rgba(231, 76, 60, 0.1);
  border: 1px solid rgba(231, 76, 60, 0.2);
  border-radius: 8px;
  font-size: clamp(10px, 1.5vw, 13px);
  color: #e74c3c;
}

.obs-geo-modal__location-card {
  margin: clamp(8px, 1.5vw, 16px) 0;
  padding: clamp(8px, 1.5vw, 16px) clamp(10px, 2vw, 20px);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
}
.obs-geo-modal__location-city {
  font-size: clamp(16px, 2.5vw, 22px);
  font-weight: 800;
  color: #e8e8e8;
  margin-bottom: 2px;
}
.obs-geo-modal__location-detail {
  font-size: clamp(10px, 1.5vw, 13px);
  color: rgba(255, 255, 255, 0.35);
}

.obs-geo-modal__actions {
  display: flex;
  flex-direction: column;
  gap: clamp(6px, 1.2vw, 12px);
}

.obs-geo-modal__skip {
  display: block;
  margin: 14px auto 0;
  background: transparent;
  border: 0;
  color: rgba(255, 255, 255, 0.3);
  font-size: clamp(10px, 1.5vw, 13px);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
  font-family: inherit;
  transition: color 0.15s;
}
.obs-geo-modal__skip:hover {
  color: rgba(255, 255, 255, 0.6);
}

.obs-geo-modal__spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-top-color: #fff;
  border-radius: 50%;
  animation: geo-spin 0.7s linear infinite;
}

@keyframes geo-spin {
  to { transform: rotate(360deg); }
}

.geo-locate-backdrop { z-index: var(--obs-z-modal-backdrop); }
.geo-modal-enter-active { transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
.geo-modal-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.geo-modal-enter-from { opacity: 0; transform: scale(0.95) translateY(8px); }
.geo-modal-leave-to { opacity: 0; transform: scale(0.97) translateY(4px); }

@media (prefers-reduced-motion: reduce) {
  .geo-modal-enter-active, .geo-modal-leave-active { transition: none; }
  .obs-geo-modal__spinner { animation: none; }
}
</style>
