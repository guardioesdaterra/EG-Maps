<template>
  <div class="min-h-screen bg-[var(--bg-secondary)] flex flex-col items-center justify-center relative overflow-hidden">
    <!-- Background effects -->
    <div class="absolute inset-0 bg-gradient-to-b from-cyan-950/30 via-purple-950/20 to-emerald-950/30 pointer-events-none" />
    <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent pointer-events-none" />
    <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent pointer-events-none" />
    <div class="absolute inset-0 pointer-events-none" style="box-shadow: inset 0 0 200px 50px rgba(0,0,0,0.8)" />

    <!-- Hex grid overlay -->
    <canvas ref="hexCanvasRef" class="absolute inset-0 w-full h-full pointer-events-none opacity-15" />

    <!-- Animated background elements -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute top-0 left-0 w-full h-full opacity-10">
        <div class="absolute top-0 left-1/4 w-1/3 h-1/3 bg-cyan-500/20 blur-3xl animate-pulse-slow" />
        <div class="absolute bottom-0 right-1/4 w-1/3 h-1/3 bg-purple-500/20 blur-3xl animate-pulse-slow-delay" />
        <div class="absolute top-1/2 left-1/2 w-1/4 h-1/4 bg-emerald-500/15 blur-3xl animate-pulse-slow-delay-2" />
      </div>
    </div>

    <!-- Main content -->
    <div class="relative z-10 flex flex-col items-center px-4 max-w-5xl w-full">
      <!-- Logo -->
      <div class="mb-8 animate-float">
        <img src="/eg-logo.png" alt="Earth Guardians" class="h-28 w-28 sm:h-32 sm:w-32 object-contain rounded-full shadow-[0_0_50px_rgba(6,182,212,0.4)] border-2 border-cyan-500/40" />
      </div>

      <!-- Title -->
      <h1 class="text-4xl sm:text-5xl md:text-6xl font-bold text-center mb-3">
        <span class="bg-gradient-to-r from-cyan-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
          Earth Guardians
        </span>
      </h1>
      <p class="text-base sm:text-lg text-[var(--text-secondary)] mb-12 text-center max-w-md">
        Interactive Data Visualization Platform
      </p>

      <!-- Dataset selector cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl w-full">
        <!-- Project Grants Card -->
        <NuxtLink
          to="/project-grants"
          class="group relative block rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(6,182,212,0.3)] focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          aria-label="View Project Grants data visualization"
        >
          <div class="absolute inset-0 bg-gradient-to-br from-cyan-600/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div class="absolute inset-0 border border-cyan-500/20 rounded-2xl group-hover:border-cyan-500/40 transition-colors duration-300" />
          <div class="relative bg-[var(--bg-tertiary)]/90 backdrop-blur-sm rounded-2xl p-6 h-full">
            <div class="flex flex-col items-center text-center">
              <!-- Icon -->
              <div class="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-cyan-500/30 group-hover:shadow-cyan-500/50 transition-all duration-300 group-hover:scale-110">
                <Icon name="lucide:hand-heart" class="h-8 w-8 text-white" />
              </div>

              <!-- Title -->
              <h2 class="text-xl font-bold text-[var(--text-primary)] mb-2 group-hover:text-cyan-400 transition-colors">
                Project Grants
              </h2>

              <!-- Description -->
              <p class="text-sm text-[var(--text-secondary)] mb-4">
                Explore global grant initiatives and their impact on communities worldwide
              </p>

              <!-- Stats -->
              <div class="flex gap-4 text-xs text-[var(--text-secondary)]">
                <span class="flex items-center gap-1">
                  <Icon name="lucide:map-pin" class="h-3 w-3" />
                  {{ projectStats.totalProjects }} Projects
                </span>
                <span class="flex items-center gap-1">
                  <Icon name="lucide:users" class="h-3 w-3" />
                  {{ formatBeneficiaries(projectStats.totalDirectBeneficiaries + projectStats.totalIndirectBeneficiaries) }}+ Beneficiaries
                </span>
              </div>

              <!-- View modes -->
              <div class="flex gap-2 mt-4">
                <span class="px-2 py-1 rounded text-xs bg-cyan-950/30 text-cyan-400 border border-cyan-900/50">
                  2D Map
                </span>
                <span class="px-2 py-1 rounded text-xs bg-purple-950/30 text-purple-400 border border-purple-900/50">
                  3D Globe
                </span>
              </div>
            </div>
          </div>
        </NuxtLink>

        <!-- Endangered Species Card -->
        <NuxtLink
          to="/endangered-species"
          class="group relative block rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(16,185,129,0.3)] focus:outline-none focus:ring-2 focus:ring-green-500/50"
          aria-label="View Endangered Species data visualization"
        >
          <div class="absolute inset-0 bg-gradient-to-br from-green-600/10 to-emerald-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div class="absolute inset-0 border border-green-500/20 rounded-2xl group-hover:border-green-500/40 transition-colors duration-300" />
          <div class="relative bg-[var(--bg-tertiary)]/90 backdrop-blur-sm rounded-2xl p-6 h-full">
            <div class="flex flex-col items-center text-center">
              <!-- Icon -->
              <div class="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mb-4 shadow-lg shadow-green-500/30 group-hover:shadow-green-500/50 transition-all duration-300 group-hover:scale-110">
                <Icon name="lucide:bird" class="h-8 w-8 text-white" />
              </div>

              <!-- Title -->
              <h2 class="text-xl font-bold text-[var(--text-primary)] mb-2 group-hover:text-green-400 transition-colors">
                Endangered Species
              </h2>

              <!-- Description -->
              <p class="text-sm text-[var(--text-secondary)] mb-4">
                Discover critically endangered species and their habitats around the world
              </p>

              <!-- Stats -->
              <div class="flex gap-4 text-xs text-[var(--text-secondary)]">
                <span class="flex items-center gap-1">
                  <Icon name="lucide:globe-2" class="h-3 w-3" />
                  {{ speciesCount }} Species
                </span>
                <span class="flex items-center gap-1">
                  <Icon name="lucide:map" class="h-3 w-3" />
                  {{ taxonomicGroupCount }} Groups
                </span>
              </div>

              <!-- View modes -->
              <div class="flex gap-2 mt-4">
                <span class="px-2 py-1 rounded text-xs bg-green-950/30 text-green-400 border border-green-900/50">
                  2D Map
                </span>
                <span class="px-2 py-1 rounded text-xs bg-purple-950/30 text-purple-400 border border-purple-900/50">
                  3D Globe
                </span>
              </div>
            </div>
          </div>
        </NuxtLink>
      </div>

      <!-- Footer info -->
      <div class="mt-12 text-center">
        <p class="text-xs text-[var(--text-muted)]">
          Empowering youth-led environmental action worldwide
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { allProjectsData } from '@/lib/project-data'
import speciesData from '~/public/data/species.json'

useHead({
  title: 'Earth Guardians - Interactive Data Visualization',
  meta: [
    { name: 'description', content: 'Explore Earth Guardians project grants and endangered species data through interactive 2D maps and 3D globe visualizations' },
    { name: 'keywords', content: 'earth guardians, environmental, endangered species, project grants, climate action, data visualization' },
    { property: 'og:title', content: 'Earth Guardians - Interactive Data Visualization' },
    { property: 'og:description', content: 'Explore Earth Guardians project grants and endangered species data through interactive 2D maps and 3D globe visualizations' },
    { property: 'og:type', content: 'website' },
  ],
})

const hexCanvasRef = ref<HTMLCanvasElement | null>(null)

const speciesList = speciesData as Array<{ taxonomicGroup: string }>
const speciesCount = computed(() => speciesList.length)
const taxonomicGroupCount = computed(() => new Set(speciesList.map(s => s.taxonomicGroup)).size)

const projectStats = computed(() => {
  const totalProjects = allProjectsData.length
  const totalDirectBeneficiaries = allProjectsData.reduce((sum, p) => sum + p.direct_beneficiaries, 0)
  const totalIndirectBeneficiaries = allProjectsData.reduce((sum, p) => sum + p.indirect_beneficiaries, 0)
  const uniqueCountries = new Set(allProjectsData.map(p => p.country_province).filter(Boolean))
  return {
    totalProjects,
    totalDirectBeneficiaries,
    totalIndirectBeneficiaries,
    countriesCount: uniqueCountries.size
  }
})

function formatBeneficiaries(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace('.0', '') + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1).replace('.0', '') + 'K'
  return num.toString()
}

function setupHexGrid() {
  const canvas = hexCanvasRef.value
  if (!canvas) return

  const dpr = window.devicePixelRatio || 1
  canvas.width = window.innerWidth * dpr
  canvas.height = window.innerHeight * dpr
  canvas.style.width = `${window.innerWidth}px`
  canvas.style.height = `${window.innerHeight}px`

  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.scale(dpr, dpr)

  const hexSize = window.innerWidth < 768 ? 35 : 50
  const hexHeight = hexSize * Math.sqrt(3)
  const hexWidth = hexSize * 2
  const hexVerticalOffset = hexHeight * 0.75
  const hexHorizontalOffset = hexWidth * 0.5
  const columns = Math.ceil(window.innerWidth / hexHorizontalOffset) + 1
  const rows = Math.ceil(window.innerHeight / hexVerticalOffset) + 1

  ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)'
  ctx.lineWidth = 1

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const x = col * hexHorizontalOffset
      const y = row * hexVerticalOffset + (col % 2 === 0 ? 0 : hexHeight / 2)
      if (x < -hexWidth || x > canvas.width + hexWidth || y < -hexHeight || y > canvas.height + hexHeight) continue

      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i
        const hx = x + hexSize * Math.cos(angle)
        const hy = y + hexSize * Math.sin(angle)
        if (i === 0) ctx.moveTo(hx, hy)
        else ctx.lineTo(hx, hy)
      }
      ctx.closePath()
      ctx.stroke()
    }
  }
}

let resizeDebounce: ReturnType<typeof setTimeout> | null = null
function debouncedSetupHexGrid() {
  if (resizeDebounce) clearTimeout(resizeDebounce)
  resizeDebounce = setTimeout(setupHexGrid, 150)
}

onMounted(() => {
  setupHexGrid()
  window.addEventListener('resize', debouncedSetupHexGrid)
})

onUnmounted(() => {
  window.removeEventListener('resize', debouncedSetupHexGrid)
  if (resizeDebounce) clearTimeout(resizeDebounce)
})
</script>
