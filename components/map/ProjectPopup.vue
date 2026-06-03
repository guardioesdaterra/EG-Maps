<script setup lang="ts">
import type { ProjectData } from '@/lib/types'
import { getProjectColorByBeneficiaries } from '@/lib/colors'
import { formatCompact } from '@/lib/utils'

interface Props {
  project: ProjectData | null
  visible?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
})

const { t } = useI18n()

const totalBeneficiaries = computed(() => {
  if (!props.project) return 0
  return props.project.direct_beneficiaries + props.project.indirect_beneficiaries
})

const accentColor = computed(() => {
  if (!props.project) return '#6366f1'
  return getProjectColorByBeneficiaries(
    props.project.direct_beneficiaries,
    props.project.indirect_beneficiaries,
  )
})
</script>

<template>
  <div v-if="project" class="project-popup">
    <div
      class="project-popup__accent"
      :style="{ background: accentColor }"
      aria-hidden="true"
    />

    <header class="project-popup__head">
      <p class="project-popup__eyebrow">{{ t('project.eyebrow') }}</p>
      <h2 class="project-popup__title">{{ project.project_title }}</h2>
      <p v-if="project.country_province" class="project-popup__location">
        <Icon name="lucide:map-pin" class="h-3.5 w-3.5" />
        <span>{{ project.country_province }}</span>
      </p>
    </header>

    <dl class="project-popup__stats">
      <div class="project-popup__stat">
        <dt>{{ t('stats.directBeneficiaries') }}</dt>
        <dd>{{ formatCompact(project.direct_beneficiaries) }}</dd>
      </div>
      <div class="project-popup__stat">
        <dt>{{ t('stats.indirectBeneficiaries') }}</dt>
        <dd>{{ formatCompact(project.indirect_beneficiaries) }}</dd>
      </div>
      <div class="project-popup__stat project-popup__stat--total">
        <dt>{{ t('stats.totalBeneficiaries') }}</dt>
        <dd>{{ formatCompact(totalBeneficiaries) }}</dd>
      </div>
    </dl>

    <footer class="project-popup__footer">
      <a
        :href="`https://www.google.com/maps?q=${project.latitude},${project.longitude}`"
        target="_blank"
        rel="noopener noreferrer"
        class="project-popup__action"
      >
        <Icon name="lucide:navigation" class="h-3.5 w-3.5" />
        <span>{{ t('project.openInMaps') }}</span>
      </a>
    </footer>
  </div>
</template>

<style scoped>
.project-popup {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  color: #fafafa;
  font-family: 'Inter', system-ui, sans-serif;
  position: relative;
  min-width: 18rem;
  max-width: 26rem;
}
.project-popup__accent {
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  border-radius: 4px 0 0 4px;
}
.project-popup__head { display: flex; flex-direction: column; gap: 0.25rem; }
.project-popup__eyebrow {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: rgba(255, 255, 255, 0.45);
  font-weight: 800;
  margin: 0;
}
.project-popup__title {
  font-size: 1.05rem;
  font-weight: 800;
  line-height: 1.3;
  margin: 0;
}
.project-popup__location {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.65);
  margin: 0;
}
.project-popup__stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin: 0;
}
.project-popup__stat {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 0.6rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.project-popup__stat--total {
  grid-column: 1 / -1;
  background: rgba(6, 182, 212, 0.12);
  border-color: rgba(6, 182, 212, 0.3);
}
.project-popup__stat dt {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 700;
}
.project-popup__stat dd {
  font-size: 1rem;
  font-weight: 800;
  margin: 0;
  font-variant-numeric: tabular-nums;
}
.project-popup__footer {
  display: flex;
  gap: 0.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 0.75rem;
}
.project-popup__action {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  color: #5dade2;
  text-decoration: none;
  font-weight: 600;
  padding: 0.4rem 0.65rem;
  border-radius: 6px;
  transition: background 0.15s;
}
.project-popup__action:hover { background: rgba(93, 173, 226, 0.12); }
</style>
