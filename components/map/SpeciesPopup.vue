<script setup lang="ts">
import type { Species } from '@/lib/types'
import { GROUP_COLORS } from '@/lib/map-utils'

interface Props {
  species: Species | null
  visible?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
})

const { t, locale } = useI18n()

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

const baseURL = useRuntimeConfig().app.baseURL
const imageSrc = computed(() => {
  if (!props.species?.imageUrl) return ''
  if (props.species.imageUrl.startsWith('http')) return props.species.imageUrl
  return `${baseURL}${props.species.imageUrl.replace(/^\//, '')}`
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
      <p class="species-popup__group" :style="{ color }">
        {{ t(`taxonomy.${species.taxonomicGroup}`) }}
      </p>
      <h2 class="species-popup__title">{{ species.commonName }}</h2>
      <p class="species-popup__sci">{{ species.scientificName }}</p>
    </header>

    <figure v-if="imageSrc" class="species-popup__media">
      <img
        :src="imageSrc"
        :alt="species.commonName"
        loading="lazy"
        class="species-popup__img"
      />
      <figcaption v-if="species.imageCredit" class="species-popup__credit">
        {{ species.imageCredit }}
      </figcaption>
    </figure>

    <section v-if="endangerment" class="species-popup__section">
      <h3 class="species-popup__h3">{{ t('species.endangerment') }}</h3>
      <p class="species-popup__p">{{ endangerment }}</p>
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

    <footer class="species-popup__footer">
      <div v-if="region" class="species-popup__chip">
        <Icon name="lucide:map-pin" class="h-3 w-3" />
        <span>{{ region }}</span>
      </div>
      <div v-if="species.ecosystem" class="species-popup__chip">
        <Icon name="lucide:leaf" class="h-3 w-3" />
        <span>{{ species.ecosystem }}</span>
      </div>
      <a
        v-if="species.iucnUrl"
        :href="species.iucnUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="species-popup__link"
      >
        <Icon name="lucide:external-link" class="h-3 w-3" />
        <span>{{ t('species.iucnProfile') }}</span>
      </a>
    </footer>
  </article>
</template>

<style scoped>
.species-popup {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  color: #fafafa;
  font-family: 'Inter', system-ui, sans-serif;
  position: relative;
  max-width: 28rem;
  min-width: 20rem;
}
.species-popup__accent {
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  border-radius: 4px 0 0 4px;
}
.species-popup__head { display: flex; flex-direction: column; gap: 0.25rem; }
.species-popup__group {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-weight: 800;
  margin: 0;
}
.species-popup__title {
  font-size: 1.25rem;
  font-weight: 800;
  line-height: 1.2;
  margin: 0;
}
.species-popup__sci {
  font-size: 0.8125rem;
  font-style: italic;
  color: rgba(255, 255, 255, 0.55);
  margin: 0;
}
.species-popup__media {
  margin: 0;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.04);
}
.species-popup__img {
  width: 100%;
  height: 12rem;
  object-fit: cover;
  display: block;
}
.species-popup__credit {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.45);
  padding: 0.4rem 0.6rem;
}
.species-popup__section { display: flex; flex-direction: column; gap: 0.25rem; }
.species-popup__h3 {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: rgba(255, 255, 255, 0.45);
  font-weight: 800;
  margin: 0;
}
.species-popup__p {
  font-size: 0.8125rem;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.85);
  margin: 0;
}
.species-popup__footer {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 0.75rem;
}
.species-popup__chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.6875rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  padding: 0.3rem 0.65rem;
  color: rgba(255, 255, 255, 0.7);
}
.species-popup__link {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.6875rem;
  color: #5dade2;
  text-decoration: none;
  font-weight: 600;
  padding: 0.3rem 0.65rem;
  border-radius: 999px;
  background: rgba(93, 173, 226, 0.08);
  border: 1px solid rgba(93, 173, 226, 0.2);
}
.species-popup__link:hover { background: rgba(93, 173, 226, 0.15); }
</style>
