/**
 * components/ObservatoryHero.vue
 * @why First-impression panel for the Vulcan Observatory. Replaces the
 *      stale "observatory intro" with a focused culture-first mission
 *      statement: rare-earth mining threats paired with cultural
 *      resistance networks (Mapa Cultura BR + Floresta Ativista).
 *
 *      Lives in the upper-left of the map; auto-dismisses when the user
 *      clicks "Begin" or the close button.
 *
 * @props culturalCount, mapaCount, florestaCount, communityCount, rareEarthCount
 * @emits close
 * @deps vue (ref, computed); @/composables/useI18n
 */
<template>
  <Transition name="vulc-hero">
    <aside
      v-if="visible"
      class="vulc-hero"
      role="complementary"
      :aria-label="t('observatory.v2.hero.title')"
    >
      <div class="vulc-hero__chrome">
        <span class="vulc-hero__dot" aria-hidden="true" />
        <span class="vulc-hero__chrome-label">{{ t('observatory.v2.hero.chrome') }}</span>
        <button
          type="button"
          class="vulc-hero__close"
          :aria-label="t('observatory.v2.hero.close')"
          @click="$emit('close')"
        >
          <Icon name="lucide:x" />
        </button>
      </div>

      <h2 class="vulc-hero__title">{{ t('observatory.v2.hero.title') }}</h2>
      <p class="vulc-hero__lead">{{ t('observatory.v2.hero.lead') }}</p>

      <div class="vulc-hero__stats">
        <div class="vulc-hero__stat vulc-hero__stat--ree">
          <span class="vulc-hero__stat-count">{{ formatCount(rareEarthCount) }}</span>
          <span class="vulc-hero__stat-label">{{ t('observatory.v2.hero.reeLabel') }}</span>
        </div>
        <div class="vulc-hero__stat vulc-hero__stat--mapa">
          <span class="vulc-hero__stat-count">{{ formatCount(mapaCount) }}</span>
          <span class="vulc-hero__stat-label">{{ t('observatory.v2.hero.mapaLabel') }}</span>
        </div>
        <div class="vulc-hero__stat vulc-hero__stat--floresta">
          <span class="vulc-hero__stat-count">{{ formatCount(florestaCount) }}</span>
          <span class="vulc-hero__stat-label">{{ t('observatory.v2.hero.florestaLabel') }}</span>
        </div>
        <div v-if="communityCount > 0" class="vulc-hero__stat vulc-hero__stat--community">
          <span class="vulc-hero__stat-count">{{ formatCount(communityCount) }}</span>
          <span class="vulc-hero__stat-label">{{ t('observatory.v2.hero.communityLabel') }}</span>
        </div>
      </div>

      <p class="vulc-hero__cite">
        {{ t('observatory.v2.hero.sources') }}
        <a href="https://mapa.cultura.gov.br/" target="_blank" rel="noopener">mapa.cultura.gov.br</a>
        ·
        <a href="https://rede.florestaativista.org/" target="_blank" rel="noopener">rede.florestaativista.org</a>
      </p>

      <button
        type="button"
        class="vulc-hero__cta"
        @click="$emit('close')"
      >
        {{ t('observatory.v2.hero.cta') }}
      </button>
    </aside>
  </Transition>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()

defineProps<{
  culturalCount: number
  mapaCount: number
  florestaCount: number
  communityCount: number
  rareEarthCount: number
}>()

defineEmits<{
  close: []
}>()

const visible = ref(true)

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`
  return n.toLocaleString()
}
</script>

<style scoped>
.vulc-hero {
  position: absolute;
  top: clamp(4.5rem, 9vh, 5.5rem);
  left: clamp(0.75rem, 1.5vw, 1.25rem);
  width: clamp(18rem, 28vw, 22rem);
  max-width: calc(100vw - 1.5rem);
  z-index: 530;
  pointer-events: auto;
  background: rgba(8, 8, 10, 0.92);
  backdrop-filter: blur(16px) saturate(1.3);
  -webkit-backdrop-filter: blur(16px) saturate(1.3);
  border: 1px solid rgba(231, 76, 60, 0.25);
  border-radius: 14px;
  padding: 1rem 1.1rem 1.1rem;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.04) inset;
  color: rgba(255, 255, 255, 0.9);
  font-family: inherit;
}

.vulc-hero__chrome {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding-bottom: 0.6rem;
  margin-bottom: 0.6rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.vulc-hero__dot {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  background: var(--obs-red, #e74c3c);
  flex-shrink: 0;
}
.vulc-hero__chrome-label {
  flex: 1;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.45);
}
.vulc-hero__close {
  width: 1.5rem;
  height: 1.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.55);
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, color 0.15s;
}
.vulc-hero__close svg {
  width: 0.85rem;
  height: 0.85rem;
}
.vulc-hero__close:hover {
  background: rgba(231, 76, 60, 0.15);
  border-color: rgba(231, 76, 60, 0.4);
  color: var(--obs-red, #e74c3c);
}

.vulc-hero__title {
  margin: 0 0 0.4rem;
  font-size: 1.05rem;
  font-weight: 800;
  line-height: 1.2;
  color: #fff;
  letter-spacing: -0.01em;
}
.vulc-hero__lead {
  margin: 0 0 0.8rem;
  font-size: 12px;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.65);
}

.vulc-hero__stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.4rem;
  margin-bottom: 0.75rem;
}
.vulc-hero__stat {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.15rem;
  padding: 0.55rem 0.7rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  border-left-width: 3px;
}
.vulc-hero__stat--ree    { border-left-color: var(--obs-red, #e74c3c); }
.vulc-hero__stat--mapa   { border-left-color: var(--obs-amber, #f39c12); }
.vulc-hero__stat--floresta { border-left-color: var(--obs-emerald, #10b981); }
.vulc-hero__stat--community { border-left-color: var(--obs-purple-light, #9b59b6); }
.vulc-hero__stat-count {
  font-size: 1.15rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: #fff;
  line-height: 1;
}
.vulc-hero__stat-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.5);
}

.vulc-hero__cite {
  margin: 0 0 0.85rem;
  font-size: 10px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.4);
  word-break: break-word;
}
.vulc-hero__cite a {
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  border-bottom: 1px dotted rgba(255, 255, 255, 0.3);
  transition: color 0.15s, border-color 0.15s;
}
.vulc-hero__cite a:hover {
  color: var(--obs-amber, #f39c12);
  border-bottom-color: var(--obs-amber, #f39c12);
}

.vulc-hero__cta {
  display: block;
  width: 100%;
  padding: 0.6rem 1rem;
  background: linear-gradient(135deg, var(--obs-red, #e74c3c), color-mix(in srgb, var(--obs-red, #e74c3c) 70%, var(--obs-amber, #f39c12)));
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  cursor: pointer;
  font-family: inherit;
  transition: transform 0.1s, box-shadow 0.15s;
  box-shadow: 0 4px 12px rgba(231, 76, 60, 0.25);
}
.vulc-hero__cta:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(231, 76, 60, 0.4);
}
.vulc-hero__cta:active {
  transform: translateY(0);
}
.vulc-hero__cta:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}

.vulc-hero-enter-active,
.vulc-hero-leave-active {
  transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.vulc-hero-enter-from {
  opacity: 0;
  transform: translateX(-12px);
}
.vulc-hero-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}

@media (prefers-reduced-motion: reduce) {
  .vulc-hero-enter-active, .vulc-hero-leave-active { transition: none; }
}

@media (max-width: 640px) {
  .vulc-hero {
    top: clamp(3.5rem, 7vh, 4rem);
    left: 0.5rem;
    right: 0.5rem;
    width: auto;
    max-width: none;
  }
}
</style>