<template>
  <div class="min-h-screen bg-[var(--bg-secondary)] flex flex-col items-center justify-center relative overflow-hidden">
    <!-- Background effects -->
    <div class="absolute inset-0 bg-gradient-to-b from-purple-900/20 to-cyan-900/20 pointer-events-none" />
    <div class="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-purple-900/20 pointer-events-none" />
    <div class="absolute inset-0 pointer-events-none" style="box-shadow: inset 0 0 150px 20px rgba(0,0,0,0.7)" />

    <!-- Hex grid overlay -->
    <canvas ref="hexCanvasRef" class="absolute inset-0 w-full h-full pointer-events-none opacity-20" />

    <!-- Animated background elements -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute top-0 left-0 w-full h-full opacity-10">
        <div class="absolute top-0 left-0 w-1/3 h-1/3 bg-cyan-500/20 blur-3xl animate-pulse-slow" />
        <div class="absolute bottom-0 right-0 w-1/3 h-1/3 bg-purple-500/20 blur-3xl animate-pulse-slow-delay" />
        <div class="absolute top-1/2 right-1/4 w-1/4 h-1/4 bg-pink-500/20 blur-3xl animate-pulse-slow-delay-2" />
      </div>
    </div>

    <!-- Main content -->
    <div class="relative z-10 flex flex-col items-center px-4">
      <!-- Logo -->
      <div class="mb-8">
        <img src="/eg-logo.png" alt="Earth Guardians" class="h-32 w-32 object-contain rounded-full shadow-[0_0_40px_rgba(6,182,212,0.3)] border-2 border-cyan-500/30" />
      </div>

      <!-- Title -->
      <h1 class="text-4xl sm:text-5xl font-bold text-center mb-3">
        <span class="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          Earth Guardians
        </span>
      </h1>
      <p class="text-lg text-[var(--text-secondary)] mb-12 text-center max-w-md">
        Interactive Data Visualization Platform
      </p>

      <!-- Dataset selector cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl w-full">
        <!-- Project Grants Card -->
        <NuxtLink
          to="/project-grants"
          class="group relative block rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_30px_rgba(6,182,212,0.4)]"
        >
          <div class="absolute inset-0 bg-gradient-to-br from-cyan-600/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div class="relative bg-[var(--bg-tertiary)]/80 backdrop-blur-sm border border-[var(--border-color)] rounded-xl p-6 h-full">
            <div class="flex flex-col items-center text-center">
              <!-- Icon -->
              <div class="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-cyan-500/30 group-hover:shadow-cyan-500/50 transition-shadow">
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
          class="group relative block rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]"
        >
          <div class="absolute inset-0 bg-gradient-to-br from-green-600/20 to-emerald-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div class="relative bg-[var(--bg-tertiary)]/80 backdrop-blur-sm border border-[var(--border-color)] rounded-xl p-6 h-full">
            <div class="flex flex-col items-center text-center">
              <!-- Icon -->
              <div class="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mb-4 shadow-lg shadow-green-500/30 group-hover:shadow-green-500/50 transition-shadow">
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
                  200 Species
                </span>
                <span class="flex items-center gap-1">
                  <Icon name="lucide:map" class="h-3 w-3" />
                  Global Coverage
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { allProjectsData } from '@/lib/project-data'

useHead({
  title: 'Earth Guardians Data Visualization',
  meta: [
    { name: 'description', content: 'Interactive maps for Earth Guardians project grants and endangered species data visualization' },
  ],
})

const hexCanvasRef = ref<HTMLCanvasElement | null>(null)

// Compute stats from actual data
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

  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const hexSize = 50
  const hexHeight = hexSize * Math.sqrt(3)
  const hexWidth = hexSize * 2
  const hexVerticalOffset = hexHeight * 0.75
  const hexHorizontalOffset = hexWidth * 0.5
  const columns = Math.ceil(window.innerWidth / hexHorizontalOffset) + 1
  const rows = Math.ceil(window.innerHeight / hexVerticalOffset) + 1

  ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)'
  ctx.lineWidth = 1.5

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

onMounted(() => {
  setupHexGrid()
  window.addEventListener('resize', setupHexGrid)
})

onUnmounted(() => {
  window.removeEventListener('resize', setupHexGrid)
})
</script>
