<template>
  <div class="min-h-screen bg-[var(--bg-primary)] py-12 px-4">
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <NuxtLink to="/" class="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
          ← Back to Map
        </NuxtLink>
        <h1 class="mt-4 text-3xl font-black text-[var(--text-primary)]">EG Grants</h1>
        <p class="mt-2 text-[var(--text-secondary)]">
          Worldwide socio-environmental grants. Sign in to submit or review grants.
        </p>
      </div>

      <!-- Auth Section -->
      <div v-if="!user" class="mb-8 p-6 rounded-xl border-2 border-[var(--border-primary)] bg-[var(--bg-secondary)]">
        <h2 class="text-lg font-bold text-[var(--text-primary)] mb-4">Sign in with Google</h2>
        <p class="text-sm text-[var(--text-secondary)] mb-4">
          Only registered Earth Guardians crew members can access this page.
        </p>
        <button
          @click="signIn"
          class="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg font-semibold hover:bg-black/80 transition-colors"
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Sign in with Google
        </button>
      </div>

      <!-- Logged in as manager -->
      <div v-else-if="isManager" class="mb-8 p-6 rounded-xl border-2 border-green-500/30 bg-green-500/5">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-bold text-green-400">Manager</p>
            <p class="text-[var(--text-secondary)]">{{ user.email }}</p>
          </div>
          <button @click="signOut" class="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">Sign out</button>
        </div>
      </div>

      <!-- Logged in as member -->
      <div v-else class="mb-8 p-6 rounded-xl border-2 border-[var(--border-primary)] bg-[var(--bg-secondary)]">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-bold text-[var(--text-primary)]">Member</p>
            <p class="text-[var(--text-secondary)]">{{ user.email }}</p>
          </div>
          <button @click="signOut" class="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">Sign out</button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div class="p-4 rounded-xl border-2 border-[var(--border-primary)] bg-[var(--bg-secondary)] text-center">
          <p class="text-2xl font-black text-[var(--text-primary)]">{{ stats.pending }}</p>
          <p class="text-xs text-[var(--text-muted)]">Pending</p>
        </div>
        <div class="p-4 rounded-xl border-2 border-[var(--border-primary)] bg-[var(--bg-secondary)] text-center">
          <p class="text-2xl font-black text-green-400">{{ stats.approved }}</p>
          <p class="text-xs text-[var(--text-muted)]">Approved</p>
        </div>
        <div class="p-4 rounded-xl border-2 border-[var(--border-primary)] bg-[var(--bg-secondary)] text-center">
          <p class="text-2xl font-black text-red-400">{{ stats.rejected }}</p>
          <p class="text-xs text-[var(--text-muted)]">Rejected</p>
        </div>
        <div class="p-4 rounded-xl border-2 border-[var(--border-primary)] bg-[var(--bg-secondary)] text-center">
          <p class="text-2xl font-black text-[var(--text-primary)]">{{ stats.total }}</p>
          <p class="text-xs text-[var(--text-muted)]">Total</p>
        </div>
      </div>

      <!-- Tabs for managers -->
      <div v-if="isManager" class="flex gap-2 mb-6">
        <button
          v-for="tab in managerTabs"
          :key="tab"
          @click="activeTab = tab"
          class="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          :class="activeTab === tab
            ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
            : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'"
        >
          {{ tab.charAt(0).toUpperCase() + tab.slice(1) }}
        </button>
      </div>

      <!-- Submit Grant Form (members) -->
      <div v-if="user && !isManager" class="mb-8 p-6 rounded-xl border-2 border-[var(--border-primary)] bg-[var(--bg-secondary)]">
        <h2 class="text-lg font-bold text-[var(--text-primary)] mb-4">Submit a Grant</h2>
        <form @submit.prevent="handleSubmitGrant" class="space-y-4">
          <input v-model="form.title" placeholder="Title" required class="w-full px-3 py-2 rounded-lg border-2 border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)]" />
          <textarea v-model="form.description" placeholder="Description" required rows="3" class="w-full px-3 py-2 rounded-lg border-2 border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)]" />
          <input v-model="form.location_name" placeholder="Location (e.g. Nairobi, Kenya)" required class="w-full px-3 py-2 rounded-lg border-2 border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)]" />
          <div class="grid grid-cols-2 gap-4">
            <input v-model.number="form.latitude" type="number" step="any" placeholder="Latitude" required class="px-3 py-2 rounded-lg border-2 border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)]" />
            <input v-model.number="form.longitude" type="number" step="any" placeholder="Longitude" required class="px-3 py-2 rounded-lg border-2 border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)]" />
          </div>
          <select v-model="form.category" class="w-full px-3 py-2 rounded-lg border-2 border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)]">
            <option value="environment">Environment</option>
            <option value="social">Social</option>
            <option value="art">Art</option>
            <option value="education">Education</option>
            <option value="health">Health</option>
          </select>
          <button type="submit" :disabled="submitting" class="px-4 py-2 bg-black text-white rounded-lg font-semibold hover:bg-black/80 transition-colors disabled:opacity-50">
            {{ submitting ? 'Submitting...' : 'Submit Grant' }}
          </button>
        </form>
        <p v-if="submitMsg" class="mt-3 text-sm" :class="submitOk ? 'text-green-400' : 'text-red-400'">{{ submitMsg }}</p>
      </div>

      <!-- Grants List -->
      <div class="space-y-4">
        <div v-if="loading" class="text-center text-[var(--text-muted)] py-8">Loading grants...</div>
        <div v-else-if="grants.length === 0" class="text-center text-[var(--text-muted)] py-8">No grants found.</div>
        <div
          v-for="grant in grants"
          :key="String(grant.id)"
          class="p-5 rounded-xl border-2 border-[var(--border-primary)] bg-[var(--bg-secondary)]"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <h3 class="font-bold text-[var(--text-primary)]">{{ grant.title }}</h3>
                <span
                  class="px-2 py-0.5 rounded-full text-xs font-bold"
                  :class="{
                    'bg-yellow-500/20 text-yellow-400': grant.status === 'pending',
                    'bg-green-500/20 text-green-400': grant.status === 'approved',
                    'bg-red-500/20 text-red-400': grant.status === 'rejected',
                  }"
                >
                  {{ grant.status }}
                </span>
                <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400">
                  {{ grant.category }}
                </span>
              </div>
              <p class="text-sm text-[var(--text-secondary)] mb-2">{{ grant.description }}</p>
              <p class="text-xs text-[var(--text-muted)]">{{ grant.location_name }}</p>
            </div>
            <!-- Manager actions -->
            <div v-if="isManager && grant.status === 'pending'" class="flex gap-2 shrink-0">
              <button
                @click="handleReview(String(grant.id), 'approved')"
                class="px-3 py-1 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
              >
                Approve
              </button>
              <button
                @click="handleReview(String(grant.id), 'rejected')"
                class="px-3 py-1 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import type { GrantRecord } from '~/composables/useGrants'

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

onMounted(async () => {
  await Promise.all([loadGrants(), loadStats()])
})

watch(activeTab, () => loadGrants())
</script>
