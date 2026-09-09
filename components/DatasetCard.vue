/**
 * components/DatasetCard.vue
 * @why Glass-morphism dataset card for the home page explorer
 * @component DatasetCard
 * @props dataset: Dataset, featured?: boolean
 * @deps vue (computed)
 */
<template>
  <div class="group flex h-full flex-col" :class="featured ? 'p-5 sm:p-6' : 'p-4 sm:p-5'">
    <!-- header row -->
    <div class="mb-3 flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <div
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.1] bg-gradient-to-br"
          :class="dataset.accent"
        >
          <Icon :name="dataset.icon" class="h-4 w-4 text-white/80" />
        </div>
        <span class="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-white/50">
          {{ dataset.label }}
        </span>
      </div>
      <Icon
        name="lucide:arrow-up-right"
        class="h-3.5 w-3.5 text-white/20 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white/50"
      />
    </div>

    <!-- body -->
    <h3
      class="font-heading leading-tight tracking-tight"
      :class="featured ? 'text-[1.2rem] font-black sm:text-[1.35rem]' : 'text-[1rem] font-black'"
    >
      {{ dataset.title }}
    </h3>
    <p class="mt-1.5 flex-1 text-[0.8rem] leading-relaxed text-white/40">
      {{ dataset.description }}
    </p>

    <!-- stats chips -->
    <div class="mt-3 flex flex-wrap gap-1.5">
      <span
        v-for="stat in dataset.stats"
        :key="stat"
        class="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[0.6rem] font-semibold text-white/45"
      >
        {{ stat }}
      </span>
    </div>

    <!-- action bar -->
    <div class="mt-4 flex gap-1.5">
      <NuxtLink
        :to="dataset.path"
        :target="dataset.external ? '_blank' : undefined"
        :rel="dataset.external ? 'noopener noreferrer' : undefined"
        class="dataset-btn dataset-btn--primary"
        :class="!dataset.single && 'flex-1'"
        :aria-label="dataset.ariaLabel"
      >
        <Icon :name="dataset.single ? 'lucide:arrow-right' : 'lucide:map'" class="h-3.5 w-3.5" />
        <span>{{ dataset.single ? (dataset.external ? 'Visit' : 'Open') : t('home.2d') }}</span>
      </NuxtLink>
      <NuxtLink
        v-if="!dataset.single && !dataset.campaignHub"
        :to="`${dataset.path}/3d`"
        class="dataset-btn dataset-btn--secondary flex-1"
        :aria-label="`${t('home.3d')} — ${dataset.title}`"
      >
        <Icon name="lucide:globe" class="h-3.5 w-3.5" />
        <span>{{ t('home.3d') }}</span>
      </NuxtLink>
      <NuxtLink
        v-if="dataset.campaignHub"
        :to="dataset.path"
        class="dataset-btn dataset-btn--secondary flex-1"
        :aria-label="`Explore — ${dataset.title}`"
      >
        <Icon name="lucide:compass" class="h-3.5 w-3.5" />
        <span>Explore</span>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  dataset: {
    path: string
    icon: string
    label: string
    title: string
    description: string
    ariaLabel: string
    stats: string[]
    accent: string
    single?: boolean
    campaignHub?: boolean
    external?: boolean
  }
  featured?: boolean
}>()

const { t } = useI18n()
</script>

<style scoped>
.dataset-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  min-height: 2.25rem;
  padding: 0.375rem 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.7rem;
  font-weight: 700;
  text-decoration: none;
  transition: all 180ms ease;
}

.dataset-btn--primary {
  background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.06));
  color: rgba(255,255,255,0.8);
  border: 1px solid rgba(255,255,255,0.08);
}
.dataset-btn--primary:hover {
  background: rgba(255,255,255,0.14);
  color: #fff;
  border-color: rgba(255,255,255,0.16);
}
.dataset-btn--primary:focus-visible {
  outline: 2px solid rgba(255,255,255,0.5);
  outline-offset: 2px;
}
.dataset-btn--primary:active {
  transform: scale(0.97);
}

.dataset-btn--secondary {
  background: transparent;
  color: rgba(255,255,255,0.45);
  border: 1px solid rgba(255,255,255,0.06);
}
.dataset-btn--secondary:hover {
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.7);
  border-color: rgba(255,255,255,0.1);
}
.dataset-btn--secondary:focus-visible {
  outline: 2px solid rgba(255,255,255,0.4);
  outline-offset: 2px;
}
.dataset-btn--secondary:active {
  transform: scale(0.97);
}
</style>
