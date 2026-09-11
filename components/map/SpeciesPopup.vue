<script setup lang="ts">

import { ref, computed, watch } from 'vue'
import type { Species } from '@/lib/types'
import { useI18n } from '@/composables/useI18n'
import { GROUP_COLORS } from '@/lib/map-utils'
import { getMarkerPlaceholder, getPopupImageUrl } from '@/lib/image-utils'

const props = defineProps<{
  species: Species | null
}>()

const { t, locale } = useI18n()

const imageError = ref(false)
const imageLoading = ref(true)

const color = computed(() => {
  if (!props.species) return 'var(--info)'
  return GROUP_COLORS[props.species.taxonomicGroup] ?? 'var(--danger)'
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
  return getPopupImageUrl(props.species.imageUrl, baseURL)
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

const endangermentStyles: Record<string, { bg: string; color: string; border: string; icon: string }> = {
  critical: { bg: '#e74c3c18', color: '#e74c3c', border: '#e74c3c30', icon: 'lucide:alert-triangle' },
  endangered: { bg: '#f39c1218', color: '#f39c12', border: '#f39c1230', icon: 'lucide:alert-circle' },
  vulnerable: { bg: '#f39c1218', color: '#f39c12', border: '#f39c1230', icon: 'lucide:shield-alert' },
  near: { bg: 'var(--stat-card-bg)', color: 'var(--text-muted)', border: 'var(--stat-card-border)', icon: 'lucide:info' },
  default: { bg: 'var(--stat-card-bg)', color: 'var(--text-muted)', border: 'var(--stat-card-border)', icon: 'lucide:info' },
}

const endangermentStyle = computed(() => endangermentStyles[endangermentLevel.value] ?? endangermentStyles.default)

const coords = computed(() => {
  if (!props.species) return ''
  const latDir = props.species.lat >= 0 ? 'N' : 'S'
  const lngDir = props.species.lng >= 0 ? 'E' : 'W'
  return `${Math.abs(props.species.lat).toFixed(2)}°${latDir}, ${Math.abs(props.species.lng).toFixed(2)}°${lngDir}`
})

</script>

<template>
  <article v-if="species" class="sp">
    <div class="sp__grid">
      <!-- Left column: image -->
      <div class="sp__media">
        <figure v-if="imageSrc" class="sp__figure">
          <div v-if="imageLoading && !imageError" class="sp__shimmer" :style="{ '--shimmer-color': color + '20' }" />
          <img
            v-show="!imageError"
            :src="imageSrc"
            :alt="species.commonName"
            loading="lazy"
            class="sp__img"
            :class="{ 'sp__img--loaded': !imageLoading }"
            @error="handleImageError"
            @load="handleImageLoad"
          />
          <div v-if="imageError" class="sp__fallback" :style="{ borderColor: color + '30' }">
            <div class="sp__fallback-icon" :style="{ backgroundImage: `url(${fallbackPlaceholder})` }" />
            <span class="sp__fallback-label">{{ t('general.imageNotAvailable') }}</span>
          </div>
          <figcaption v-if="species.imageCredit && !imageError" class="sp__credit">
            {{ species.imageCredit }}
          </figcaption>
        </figure>

        <!-- Endangerment badge (prominent on image side) -->
        <div
          v-if="endangerment"
          class="sp__endangerment"
          :style="{ background: endangermentStyle.bg, borderColor: endangermentStyle.border, color: endangermentStyle.color }"
        >
          <Icon :name="endangermentStyle.icon" size="0.9rem" />
          <div class="sp__endangerment-body">
            <span class="sp__endangerment-label">{{ t('species.endangerment') }}</span>
            <span class="sp__endangerment-value">{{ endangerment }}</span>
          </div>
        </div>

        <!-- Quick info chips -->
        <div class="sp__chips">
          <div v-if="region" class="sp__chip">
            <Icon name="lucide:map-pin" size="0.75rem" />
            <span>{{ region }}</span>
          </div>
          <div v-if="species.ecosystem" class="sp__chip">
            <Icon name="lucide:leaf" size="0.75rem" />
            <span>{{ species.ecosystem }}</span>
          </div>
          <div class="sp__chip">
            <Icon name="lucide:crosshair" size="0.75rem" />
            <span>{{ coords }}</span>
          </div>
        </div>
      </div>

      <!-- Right column: content -->
      <div class="sp__body">
        <header class="sp__head">
          <div class="sp__group-row">
            <span class="sp__group" :style="{ borderColor: color, color }">
              {{ t(`taxonomy.${species.taxonomicGroup}`) }}
            </span>
            <span
              v-if="species.category"
              class="sp__cat"
              :style="{ background: color }"
            >
              {{ species.category }}
            </span>
          </div>
          <h2 class="sp__title">{{ species.commonName }}</h2>
          <p class="sp__sci">{{ species.scientificName }}</p>
        </header>

        <div class="sp__content">
          <section v-if="description" class="sp__section">
            <h3 class="sp__h3">{{ t('species.about') }}</h3>
            <p class="sp__p">{{ description }}</p>
          </section>

          <section v-if="ecosystemNeeds" class="sp__section">
            <h3 class="sp__h3">{{ t('species.ecosystem') }}</h3>
            <p class="sp__p">{{ ecosystemNeeds }}</p>
          </section>

          <section v-if="actions" class="sp__section">
            <h3 class="sp__h3">{{ t('species.actions') }}</h3>
            <p class="sp__p">{{ actions }}</p>
          </section>

          <section v-if="species.threatTypes?.length" class="sp__section">
            <h3 class="sp__h3">{{ t('species.threatTypes') }}</h3>
            <div class="sp__threats">
              <span
                v-for="threat in species.threatTypes"
                :key="threat"
                class="sp__threat"
                :style="{ borderColor: color + '40', color, background: color + '0d' }"
              >
                {{ threat }}
              </span>
            </div>
          </section>
        </div>

        <!-- Footer link -->
        <footer v-if="species.iucnUrl" class="sp__footer">
          <a
            :href="species.iucnUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="sp__link"
            :style="{ '--link-clr': color }"
          >
            <Icon name="lucide:external-link" size="0.8rem" />
            <span>{{ t('species.iucnProfile') }}</span>
          </a>
        </footer>
      </div>
    </div>
  </article>
</template>

<style scoped>
.sp {
  display: flex;
  flex-direction: column;
  color: var(--text-primary);
  font-family: 'Inter', system-ui, sans-serif;
}

/* ── Two-column grid ── */
.sp__grid {
  display: grid;
  grid-template-columns: minmax(14rem, 1fr) minmax(0, 1.2fr);
  min-height: 0;
}

/* ── Left: media ── */
.sp__media {
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-color);
}
.sp__figure {
  position: relative;
  margin: 0;
  min-height: clamp(12rem, 30vh, 18rem);
  overflow: hidden;
  background: var(--stat-card-bg);
}
.sp__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: opacity 0.4s ease;
  opacity: 0;
  min-height: clamp(12rem, 30vh, 18rem);
}
.sp__img--loaded { opacity: 1; }
.sp__img:hover { transform: scale(1.02); transition: transform 0.3s ease; }

.sp__shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(110deg, transparent 30%, var(--shimmer-color, rgba(255,255,255,0.06)) 50%, transparent 70%);
  background-size: 200% 100%;
  animation: shimmer 1.6s ease-in-out infinite;
  z-index: 1;
  pointer-events: none;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.sp__fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: clamp(12rem, 30vh, 18rem);
  gap: 0.6rem;
  border: 1px dashed;
  margin: 0.75rem;
  border-radius: 10px;
  background: var(--stat-card-bg);
}
.sp__fallback-icon {
  width: 3.5rem;
  height: 3.5rem;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  opacity: 0.3;
}
.sp__fallback-label {
  font-size: 0.7rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
}
.sp__credit {
  font-size: 0.65rem;
  color: var(--text-muted);
  padding: 0.4rem 0.75rem;
  border-top: 1px solid var(--stat-card-border);
  margin: 0;
}

/* ── Endangerment badge ── */
.sp__endangerment {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  margin: 0.75rem 0.75rem 0;
  padding: 0.7rem 0.85rem;
  border: 1px solid;
  border-radius: 10px;
}
.sp__endangerment-body {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
.sp__endangerment-label {
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: 700;
  opacity: 0.7;
}
.sp__endangerment-value {
  font-size: 0.85rem;
  font-weight: 700;
  line-height: 1.3;
}

/* ── Chips ── */
.sp__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  padding: 0.75rem;
}
.sp__chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.7rem;
  background: var(--stat-card-bg);
  border: 1px solid var(--stat-card-border);
  border-radius: 999px;
  padding: 0.2rem 0.6rem;
  color: var(--text-muted);
  line-height: 1.4;
}

/* ── Right: body ── */
.sp__body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.sp__head {
  padding: 1.25rem 1.5rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  border-bottom: 1px solid var(--border-color);
}
.sp__group-row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 0.2rem;
  flex-wrap: wrap;
}
.sp__group {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-weight: 700;
  border: 1px solid;
  padding: 0.12rem 0.6rem;
  border-radius: 5px;
  display: inline-block;
  line-height: 1.4;
}
.sp__cat {
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 800;
  color: #fff;
  padding: 0.12rem 0.5rem;
  border-radius: 4px;
  display: inline-block;
  line-height: 1.4;
}
.sp__title {
  font-size: 1.4rem;
  font-weight: 800;
  line-height: 1.2;
  margin: 0;
  color: var(--text-primary);
  letter-spacing: -0.015em;
  overflow-wrap: break-word;
}
.sp__sci {
  font-size: 0.9rem;
  font-style: italic;
  color: var(--text-muted);
  margin: 0;
  overflow-wrap: break-word;
}

/* ── Content sections ── */
.sp__content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem 1.5rem;
  flex: 1;
  overflow-y: auto;
}
.sp__section {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.sp__h3 {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-muted);
  font-weight: 700;
  margin: 0;
}
.sp__p {
  font-size: 0.88rem;
  line-height: 1.6;
  color: var(--text-secondary);
  margin: 0;
  overflow-wrap: break-word;
}
.sp__threats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.15rem;
}
.sp__threat {
  font-size: 0.72rem;
  padding: 0.18rem 0.6rem;
  border-radius: 6px;
  border: 1px solid;
  line-height: 1.5;
}

/* ── Footer ── */
.sp__footer {
  display: flex;
  border-top: 1px solid var(--border-color);
  padding: 0.85rem 1.5rem;
}
.sp__link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  color: var(--link-clr, var(--info));
  text-decoration: none;
  font-weight: 600;
  padding: 0.3rem 0.75rem;
  border-radius: 8px;
  background: var(--stat-card-bg);
  border: 1px solid var(--stat-card-border);
  line-height: 1.4;
  transition: background 0.15s, border-color 0.2s, color 0.15s;
}
.sp__link:hover {
  background: var(--stat-card-border);
  border-color: var(--link-clr, var(--info));
}

/* ── Mobile: stack ── */
@media (max-width: 640px) {
  .sp__grid {
    grid-template-columns: 1fr;
  }
  .sp__media {
    border-right: none;
    border-bottom: 1px solid var(--border-color);
  }
  .sp__figure {
    min-height: 12rem;
  }
  .sp__img {
    min-height: 12rem;
  }
}
</style>
