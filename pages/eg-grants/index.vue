<template>
  <div class="relative min-h-screen overflow-hidden bg-[#0a0f0d]">
    <!-- DotField background -->
    <DotField
      class="absolute inset-0 z-0"
      :dot-radius="1.2"
      :dot-spacing="16"
      :cursor-radius="400"
      :bulge-strength="55"
      :glow-radius="140"
      gradient-from="rgba(124, 255, 103, 0.18)"
      gradient-to="rgba(50, 200, 120, 0.10)"
      glow-color="#14110E"
    />

    <!-- Content overlay -->
    <div class="relative z-10 min-h-screen py-8 px-4">
      <div class="max-w-3xl mx-auto">

        <!-- Top bar -->
        <div class="flex items-center justify-between mb-8">
          <NuxtLink
            to="/"
            class="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/40 hover:text-white/70 transition-colors"
          >
            <Icon name="lucide:arrow-left" class="w-3.5 h-3.5" />
            {{ t('nav.home') }}
          </NuxtLink>
          <span class="text-[10px] font-black uppercase tracking-[0.18em] text-white/20">EG Grants</span>
        </div>

        <!-- Hero -->
        <div class="text-center mb-10">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 mb-4">
            <Icon name="lucide:hand-heart" class="w-4 h-4 text-[#7cff67]" />
            <span class="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">Socio-Environmental Grants</span>
          </div>
          <h1 class="text-3xl sm:text-4xl font-black text-white tracking-tight">
            EG Grants
          </h1>
          <p class="mt-2 text-sm text-white/40 max-w-md mx-auto">
            Worldwide socio-environmental grants. Sign in to submit or review grants.
          </p>
        </div>

        <!-- Auth: Sign in -->
        <div
          v-if="!user"
          class="mb-8 p-6 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md"
        >
          <h2 class="text-sm font-bold text-white mb-3">Sign in with Google</h2>
          <p class="text-xs text-white/40 mb-5">
            Only registered Earth Guardians crew members can access this page.
          </p>
          <button
            @click="signIn"
            class="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 transition-all active:scale-[0.97]"
          >
            <svg class="w-4.5 h-4.5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Sign in with Google
          </button>
        </div>

        <!-- Auth: Logged in -->
        <div
          v-else
          class="mb-8 p-4 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md flex items-center justify-between"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black"
              :class="isManager ? 'bg-[#7cff67]/20 text-[#7cff67]' : 'bg-white/10 text-white/50'"
            >
              {{ isManager ? 'M' : 'C' }}
            </div>
            <div>
              <p class="text-xs font-bold text-white">{{ isManager ? 'Manager' : 'Crew Member' }}</p>
              <p class="text-[11px] text-white/30">{{ user.email }}</p>
            </div>
          </div>
          <button
            @click="signOut"
            class="text-[11px] font-bold uppercase tracking-wider text-white/25 hover:text-white/50 transition-colors"
          >
            Sign out
          </button>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-4 gap-3 mb-8">
          <div
            v-for="s in statCards"
            :key="s.label"
            class="p-3.5 rounded-2xl border border-white/10 bg-white/[0.03] text-center"
          >
            <p class="text-2xl font-black" :class="s.color">{{ s.value }}</p>
            <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-white/30 mt-0.5">{{ s.label }}</p>
          </div>
        </div>

        <!-- Manager tabs -->
        <div v-if="isManager" class="flex gap-1.5 mb-6 p-1 rounded-xl bg-white/[0.04] border border-white/10">
          <button
            v-for="tab in managerTabs"
            :key="tab"
            @click="activeTab = tab"
            class="flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
            :class="activeTab === tab
              ? 'bg-[#7cff67] text-black shadow-lg shadow-[#7cff67]/20'
              : 'text-white/30 hover:text-white/60'"
          >
            {{ tab }}
          </button>
        </div>

        <!-- Submit form (members) -->
        <div
          v-if="user && !isManager"
          class="mb-8 p-6 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md"
        >
          <h2 class="text-sm font-bold text-white mb-4">Submit a Grant</h2>
          <form @submit.prevent="handleSubmitGrant" class="space-y-3">
            <input
              v-model="form.title"
              placeholder="Title"
              required
              class="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#7cff67]/40 focus:ring-1 focus:ring-[#7cff67]/20 transition-all"
            />
            <textarea
              v-model="form.description"
              placeholder="Description"
              required
              rows="3"
              class="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#7cff67]/40 focus:ring-1 focus:ring-[#7cff67]/20 transition-all resize-none"
            />
            <input
              v-model="form.location_name"
              placeholder="Location (e.g. Nairobi, Kenya)"
              required
              class="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#7cff67]/40 focus:ring-1 focus:ring-[#7cff67]/20 transition-all"
            />
            <div class="grid grid-cols-2 gap-3">
              <input
                v-model.number="form.latitude"
                type="number"
                step="any"
                placeholder="Latitude"
                required
                class="px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#7cff67]/40 focus:ring-1 focus:ring-[#7cff67]/20 transition-all"
              />
              <input
                v-model.number="form.longitude"
                type="number"
                step="any"
                placeholder="Longitude"
                required
                class="px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#7cff67]/40 focus:ring-1 focus:ring-[#7cff67]/20 transition-all"
              />
            </div>
            <select
              v-model="form.category"
              class="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-white text-sm focus:outline-none focus:border-[#7cff67]/40 focus:ring-1 focus:ring-[#7cff67]/20 transition-all"
            >
              <option value="environment" class="bg-black">Environment</option>
              <option value="social" class="bg-black">Social</option>
              <option value="art" class="bg-black">Art</option>
              <option value="education" class="bg-black">Education</option>
              <option value="health" class="bg-black">Health</option>
            </select>
            <button
              type="submit"
              :disabled="submitting"
              class="w-full py-2.5 rounded-xl bg-[#7cff67] text-black text-sm font-black hover:bg-[#6bef55] transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {{ submitting ? 'Submitting...' : 'Submit Grant' }}
            </button>
          </form>
          <p
            v-if="submitMsg"
            class="mt-3 text-xs font-medium"
            :class="submitOk ? 'text-[#7cff67]' : 'text-red-400'"
          >
            {{ submitMsg }}
          </p>
        </div>

        <!-- Grants list -->
        <div class="space-y-3">
          <div v-if="loading" class="text-center text-white/20 py-12 text-sm">Loading grants...</div>
          <div v-else-if="grants.length === 0" class="text-center text-white/20 py-12 text-sm">No grants found.</div>
          <div
            v-for="grant in grants"
            :key="String(grant.id)"
            class="p-5 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md hover:border-white/15 transition-colors"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1.5 flex-wrap">
                  <h3 class="font-bold text-white text-sm">{{ grant.title }}</h3>
                  <span
                    class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                    :class="{
                      'bg-yellow-500/15 text-yellow-400': grant.status === 'pending',
                      'bg-[#7cff67]/15 text-[#7cff67]': grant.status === 'approved',
                      'bg-red-500/15 text-red-400': grant.status === 'rejected',
                    }"
                  >
                    {{ grant.status }}
                  </span>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/5 text-white/40">
                    {{ grant.category }}
                  </span>
                </div>
                <p class="text-xs text-white/40 mb-2 line-clamp-2">{{ grant.description }}</p>
                <p class="text-[11px] text-white/20">{{ grant.location_name }}</p>
              </div>
              <div v-if="isManager && grant.status === 'pending'" class="flex gap-1.5 shrink-0">
                <button
                  @click="handleReview(String(grant.id), 'approved')"
                  class="px-3 py-1.5 rounded-lg bg-[#7cff67]/15 text-[#7cff67] text-xs font-bold hover:bg-[#7cff67]/25 transition-colors"
                >
                  Approve
                </button>
                <button
                  @click="handleReview(String(grant.id), 'rejected')"
                  class="px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 text-xs font-bold hover:bg-red-500/25 transition-colors"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import type { GrantRecord } from '~/composables/useGrants'

const { t } = useI18n()

useHead({ title: 'EG Grants | Earth Guardians' })

const { user, isManager, signIn, signOut } = useSupabaseAuth()
const { listGrants, submitGrant: apiSubmitGrant, reviewGrant: apiReviewGrant, getStats } = useGrants()

const grants = ref<GrantRecord[]>([])
const stats = reactive({ pending: 0, approved: 0, rejected: 0, total: 0 })
const loading = ref(true)
const submitting = ref(false)
const submitMsg = ref('')
const submitOk = ref(false)
const activeTab = ref<'pending' | 'approved' | 'rejected'>('pending')
const managerTabs = ['pending', 'approved', 'rejected'] as const

const statCards = computed(() => [
  { label: 'Pending', value: stats.pending, color: 'text-yellow-400' },
  { label: 'Approved', value: stats.approved, color: 'text-[#7cff67]' },
  { label: 'Rejected', value: stats.rejected, color: 'text-red-400' },
  { label: 'Total', value: stats.total, color: 'text-white' },
])

const form = reactive({
  title: '',
  description: '',
  location_name: '',
  latitude: null as number | null,
  longitude: null as number | null,
  category: 'environment' as string,
})

async function loadGrants() {
  loading.value = true
  const status = isManager.value ? activeTab.value : undefined
  const result = await listGrants(status)
  grants.value = result.grants ?? []
  loading.value = false
}

async function loadStats() {
  const s = await getStats()
  Object.assign(stats, s)
}

async function handleSubmitGrant() {
  submitting.value = true
  submitMsg.value = ''
  const result = await apiSubmitGrant(form)
  submitting.value = false
  if (result.error) {
    submitMsg.value = result.error
    submitOk.value = false
  } else {
    submitMsg.value = 'Grant submitted successfully!'
    submitOk.value = true
    form.title = ''
    form.description = ''
    form.location_name = ''
    form.latitude = null
    form.longitude = null
    form.category = 'environment'
    loadGrants()
    loadStats()
  }
}

async function handleReview(grantId: string, decision: 'approved' | 'rejected') {
  await apiReviewGrant(grantId, decision)
  loadGrants()
  loadStats()
}

watch(activeTab, () => loadGrants())

onMounted(async () => {
  await Promise.all([loadGrants(), loadStats()])
})
</script>
