<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { gsap } from 'gsap'
import type { SpeciesIndexItem } from '@/composables/useGeoJSONMarkers'
import { useSpeciesPanel } from '@/composables/useSpeciesPanel'
import { GROUP_COLORS } from '@/lib/map-utils'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()
const { isOpen, speciesList, coordinate, closePanel } = useSpeciesPanel()

const panelRef = ref<HTMLElement | null>(null)
const listRef = ref<HTMLElement | null>(null)
const backdropRef = ref<HTMLElement | null>(null)
let panelAnim: gsap.core.Timeline | null = null

watch(isOpen, (open) => {
  if (open) {
    nextTick(() => {
      if (panelRef.value && backdropRef.value) {
        panelAnim?.kill()
        panelAnim = gsap.timeline({ paused: true })
        gsap.set(panelRef.value, { x: '-100%', opacity: 0 })
        gsap.set(backdropRef.value, { opacity: 0 })

        panelAnim
          .to(backdropRef.value, { opacity: 1, duration: 0.3, ease: 'power2.out' })
          .to(panelRef.value, { x: '0%', opacity: 1, duration: 0.4, ease: 'power3.out' }, '-=0.15')
        panelAnim.play()

        animateList()
      }
    })
  }
})

function animateList() {
  if (!listRef.value) return
  const cards = listRef.value.querySelectorAll('.species-card')
  if (!cards.length) return
  gsap.fromTo(
    cards,
    { opacity: 0, x: -20 },
    {
      opacity: 1,
      x: 0,
      duration: 0.25,
      stagger: 0.02,
      ease: 'power2.out',
    }
  )
}

function handleBackdropClick() {
  closePanel()
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closePanel()
}

const emit = defineEmits<{
  speciesSelected: [species: SpeciesIndexItem]
}>()

function selectSpecies(species: SpeciesIndexItem) {
  emit('speciesSelected', species)
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  panelAnim?.kill()
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="panel-fade">
      <div
        v-if="isOpen"
        ref="backdropRef"
        class="fixed inset-0 z-[9998] bg-black/50"
        @click="handleBackdropClick"
      />
    </Transition>
    <Transition name="panel-slide">
      <div
        v-if="isOpen"
        ref="panelRef"
        class="fixed top-0 left-0 h-full w-full max-w-[420px] z-[9999] bg-[#0f0f12] border-r border-white/10 flex flex-col shadow-2xl"
        role="dialog"
        aria-modal="true"
        :aria-label="t('species.panelTitle')"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <div class="min-w-0 flex-1">
            <h2 class="text-sm font-semibold text-white/90 truncate">
              {{ speciesList.length }} {{ t('species.panelTitle') }}
            </h2>
            <p v-if="coordinate" class="text-xs text-white/40 mt-0.5">
              {{ coordinate.lat.toFixed(2) }}, {{ coordinate.lng.toFixed(2) }}
            </p>
          </div>
          <button
            class="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/90 transition-colors shrink-0 ml-3"
            @click="closePanel"
            :aria-label="t('general.close')"
          >
            <iconify-icon icon="lucide:x" class="h-4 w-4" />
          </button>
        </div>

        <!-- Species list -->
        <div ref="listRef" class="flex-1 overflow-y-auto px-3 py-3 space-y-1.5 scrollbar-thin">
          <button
            v-for="s in speciesList"
            :key="s.id"
            class="species-card w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left cursor-pointer border border-transparent hover:border-white/10"
            @click="selectSpecies(s)"
          >
            <!-- Thumbnail -->
            <div
              class="w-10 h-10 rounded-lg shrink-0 bg-white/5 overflow-hidden"
              :style="{ borderLeft: `3px solid ${GROUP_COLORS[s.taxonomicGroup] ?? '#B64032'}` }"
            >
              <img
                v-if="s.imageUrl"
                :src="s.imageUrl"
                :alt="s.commonName"
                class="w-full h-full object-cover"
                loading="lazy"
                @error="($event.target as HTMLImageElement).style.display = 'none'"
              />
            </div>

            <!-- Info -->
            <div class="min-w-0 flex-1">
              <div class="text-sm font-medium text-white/90 truncate">{{ s.commonName }}</div>
              <div class="text-xs text-white/50 truncate italic">{{ s.scientificName }}</div>
            </div>

            <!-- Badge -->
            <div
              class="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded"
              :style="{
                color: GROUP_COLORS[s.taxonomicGroup] ?? '#B64032',
                background: `${GROUP_COLORS[s.taxonomicGroup] ?? '#B64032'}20`,
              }"
            >
              {{ s.category }}
            </div>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.scrollbar-thin::-webkit-scrollbar {
  width: 4px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}
.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}

.panel-fade-enter-active,
.panel-fade-leave-active {
  transition: opacity 0.3s ease;
}
.panel-fade-enter-from,
.panel-fade-leave-to {
  opacity: 0;
}

.panel-slide-enter-active {
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease;
}
.panel-slide-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.panel-slide-enter-from {
  transform: translateX(-100%);
  opacity: 0;
}
.panel-slide-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}
</style>
