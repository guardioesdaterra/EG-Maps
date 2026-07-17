/**
 * components/map/SpeciesPopup.vue
 * @why Endangered species popup for map markers — shows common name, scientific name, IUCN status, image
 * @component SpeciesPopup
 * @props species: Species | null
 * @deps vue (ref, computed, watch); @/composables/useI18n (useI18n); @/lib/map-utils (GROUP_COLORS); @/lib/image-utils (getMarkerPlaceholder)
 */
<script setup lang="ts">

import { ref, computed, watch } from 'vue'
import type { Species } from '@/lib/types'
import { useI18n } from '@/composables/useI18n'
import { GROUP_COLORS } from '@/lib/map-utils'
import { getMarkerPlaceholder } from '@/lib/image-utils'

const props = defineProps<{
  species: Species | null
}>()

const { t, locale } = useI18n()

const imageError = ref(false)
const imageLoading = ref(true)

const color = computed(() => {
  if (!props.species) return '#5dade2'
  return GROUP_COLORS[props.species.taxonomicGroup] ?? '#B64032'
})

const content = computed(() => {
  if (!props.species) return null
  return props.species.content?.[locale.value] ?? props.species.content?.en ?? null
})

const description = computed(() => content.value?.description ?? props.species?.description ?? '')
const endangerment = computed(() => content.value?.endangerment ?? props.species?.endangerment ?? '')
const ecosystemNeeds = computed(() => content.value?.ecosystemNeeds ?? props.species?.ecosystemNeeds ?? '')
const actions = computed(() => content.value?.actions ?? props.species?.actions ?? '')
const region = computed(() => content.value?.region ?? props.species?.region ?? '')

const baseURL = (useRuntimeConfig().app.baseURL || '/').replace(/\/$/, '')
const imageSrc = computed(() => {
  if (!props.species?.imageUrl) return ''
  if (props.species.imageUrl.startsWith('http')) return props.species.imageUrl
  return `${baseURL}/${props.species.imageUrl.replace(/^\//, '')}`
})

const fallbackPlaceholder = computed(() => getMarkerPlaceholder(props.species?.taxonomicGroup))

function handleImageError() {
  imageError.value = true
  imageLoading.value = false
}

function handleImageLoad() {
  imageLoading.value = false
  imageError.value = false
}

function resetImageState() {
  imageError.value = false
  imageLoading.value = true
}

watch(() => props.species, () => {
  if (props.species) resetImageState()
})

const endangermentLevel = computed(() => {
  const e = endangerment.value.toLowerCase()
  if (e.includes('critically') || e.includes('critical')) return 'critical'
  if (e.includes('endangered')) return 'endangered'
  if (e.includes('vulnerable')) return 'vulnerable'
  if (e.includes('near') && e.includes('threatened')) return 'near'
  return 'default'
})

const endangermentColors: Record<string, string> = {
  critical: '#dc2626',
  endangered: '#ea580c',
  vulnerable: '#d97706',
  near: '#a3a3a3',
  default: '#a3a3a3',
}

const endangermentColor = computed(() => endangermentColors[endangermentLevel.value] ?? color.value)

const coords = computed(() => {
  if (!props.species) return ''
  const latDir = props.species.lat >= 0 ? 'N' : 'S'
  const lngDir = props.species.lng >= 0 ? 'E' : 'W'
  return `${Math.abs(props.species.lat).toFixed(2)}°${latDir}, ${Math.abs(props.species.lng).toFixed(2)}°${lngDir}`
})

</script>

<template>
  <article v-if="species" class="species-popup">
    <div
      class="species-popup__accent"
      :style="{ background: color }"
      aria-hidden="true"
    />

    <header class="species-popup__head">
      <div class="species-popup__group-row">
        <span class="species-popup__group" :style="{ borderColor: color, color }">
          {{ t(`taxonomy.${species.taxonomicGroup}`) }}
        </span>
        <span
          v-if="species.category"
          class="species-popup__cat"
          :style="{ background: color }"
        >
          {{ species.category }}
        </span>
      </div>
      <h2 class="species-popup__title">{{ species.commonName }}</h2>
      <p class="species-popup__sci">{{ species.scientificName }}</p>
    </header>

    <figure v-if="imageSrc" class="species-popup__media">
      <div v-if="imageLoading && !imageError" class="species-popup__img-shimmer" :style="{ '--shimmer-color': color + '20' }" />
      <img
        v-show="!imageError"
        :src="imageSrc"
        :alt="species.commonName"
        loading="lazy"
        class="species-popup__img"
        :class="{ 'species-popup__img--loaded': !imageLoading }"
        @error="handleImageError"
        @load="handleImageLoad"
      />
      <div v-if="imageError" class="species-popup__img-fallback" :style="{ borderColor: color + '30' }">
        <div class="species-popup__img-fallback-icon" :style="{ backgroundImage: `url(${fallbackPlaceholder})` }" />
        <span class="species-popup__img-fallback-label">{{ t('general.imageNotAvailable') }}</span>
      </div>
      <figcaption v-if="species.imageCredit && !imageError" class="species-popup__credit">
        {{ species.imageCredit }}
      </figcaption>
    </figure>

    <div class="species-popup__body">
      <section v-if="endangerment" class="species-popup__section">
        <h3 class="species-popup__h3">{{ t('species.endangerment') }}</h3>
        <p class="species-popup__p" :style="{ color: endangermentColor }">
          {{ endangerment }}
        </p>
      </section>

      <section v-if="description" class="species-popup__section">
        <h3 class="species-popup__h3">{{ t('species.about') }}</h3>
        <p class="species-popup__p">{{ description }}</p>
      </section>

      <section v-if="ecosystemNeeds" class="species-popup__section">
        <h3 class="species-popup__h3">{{ t('species.ecosystem') }}</h3>
        <p class="species-popup__p">{{ ecosystemNeeds }}</p>
      </section>

      <section v-if="actions" class="species-popup__section">
        <h3 class="species-popup__h3">{{ t('species.actions') }}</h3>
        <p class="species-popup__p">{{ actions }}</p>
      </section>

      <section v-if="species.threatTypes?.length" class="species-popup__section">
        <h3 class="species-popup__h3">{{ t('species.threatTypes') }}</h3>
        <div class="species-popup__threats">
          <span
            v-for="threat in species.threatTypes"
            :key="threat"
            class="species-popup__threat"
            :style="{ borderColor: color + '40', color, background: color + '0d' }"
          >
            {{ threat }}
          </span>
        </div>
      </section>
    </div>

    <footer class="species-popup__footer">
      <div v-if="region" class="species-popup__chip">
        <Icon name="lucide:map-pin" size="0.75rem" />
        <span>{{ region }}</span>
      </div>
      <div v-if="species.ecosystem" class="species-popup__chip">
        <Icon name="lucide:leaf" size="0.75rem" />
        <span>{{ species.ecosystem }}</span>
      </div>
      <div class="species-popup__chip">
        <Icon name="lucide:crosshair" size="0.75rem" />
        <span>{{ coords }}</span>
      </div>
      <div v-if="species.iucnUrl" class="species-popup__footer-right">
        <a
          :href="species.iucnUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="species-popup__link"
          :style="{ '--link-clr': color }"
        >
          <Icon name="lucide:external-link" size="0.75rem" />
          <span>{{ t('species.iucnProfile') }}</span>
        </a>
      </div>
    </footer>
  </article>
</template>

<style scoped>
.species-popup {
  --popup-radius: 10px;
  display: flex;
  flex-direction: column;
  color: #e2e2e2;
  font-family: 'Inter', system-ui, sans-serif;
  position: relative;
}

.species-popup__accent {
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  border-radius: 4px 0 0 4px;
  transition: background 0.25s ease;
}

.species-popup__head {
  padding-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.species-popup__group-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.25rem;
  flex-wrap: wrap;
}

.species-popup__group {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-weight: 700;
  border: 1px solid;
  padding: 0.1rem 0.55rem;
  border-radius: 4px;
  display: inline-block;
  line-height: 1.4;
}

.species-popup__cat {
  font-size: 0.55rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 800;
  color: #fff;
  padding: 0.1rem 0.45rem;
  border-radius: 3px;
  display: inline-block;
  line-height: 1.4;
}

.species-popup__title {
  font-size: 1.35rem;
  font-weight: 800;
  line-height: 1.2;
  margin: 0;
  color: #fff;
  letter-spacing: -0.01em;
  overflow-wrap: break-word;
}

.species-popup__sci {
  font-size: 0.85rem;
  font-style: italic;
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
  overflow-wrap: break-word;
}

.species-popup__media {
  position: relative;
  margin: 0 0 1rem 0;
  border-radius: var(--popup-radius);
  overflow: hidden;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  min-height: clamp(10rem, 30vh, 14rem);
}

.species-popup__img {
  width: 100%;
  height: clamp(10rem, 30vh, 14rem);
  object-fit: cover;
  display: block;
  transition: opacity 0.4s ease, transform 0.3s ease;
  opacity: 0;
}

.species-popup__img--loaded {
  opacity: 1;
}

.species-popup__img:hover {
  transform: scale(1.02);
}

.species-popup__img-shimmer {
  position: absolute;
  inset: 0;
  height: 100%;
  background: linear-gradient(
    110deg,
    transparent 30%,
    var(--shimmer-color, rgba(255,255,255,0.06)) 50%,
    transparent 70%
  );
  background-size: 200% 100%;
  animation: shimmer 1.6s ease-in-out infinite;
  z-index: 1;
  pointer-events: none;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.species-popup__img-fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: clamp(10rem, 30vh, 14rem);
  gap: 0.5rem;
  border: 1px dashed;
  border-radius: calc(var(--popup-radius) - 1px);
  margin: 0.5rem;
  background: rgba(255, 255, 255, 0.01);
}

.species-popup__img-fallback-icon {
  width: 3.5rem;
  height: 3.5rem;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  opacity: 0.25;
}

.species-popup__img-fallback-label {
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.25);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
}

.species-popup__credit {
  font-size: 0.625rem;
  color: rgba(255, 255, 255, 0.3);
  padding: 0.35rem 0.7rem;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
}

.species-popup__body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.species-popup__section {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.species-popup__h3 {
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: rgba(255, 255, 255, 0.35);
  font-weight: 700;
  margin: 0;
}

.species-popup__p {
  font-size: 0.85rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
  overflow-wrap: break-word;
}

.species-popup__threats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.1rem;
}

.species-popup__threat {
  font-size: 0.7rem;
  padding: 0.15rem 0.55rem;
  border-radius: 6px;
  border: 1px solid;
  line-height: 1.5;
}

.species-popup__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding-top: 0.85rem;
  margin-top: 0.5rem;
}

.species-popup__footer-right {
  margin-left: auto;
}

.species-popup__chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.7rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 999px;
  padding: 0.25rem 0.65rem;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.4;
}

.species-popup__link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.7rem;
  color: var(--link-clr, #5dade2);
  text-decoration: none;
  font-weight: 600;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  line-height: 1.4;
  transition: background 0.15s, border-color 0.2s, color 0.15s;
}

.species-popup__link:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--link-clr, #5dade2);
}
</style>
