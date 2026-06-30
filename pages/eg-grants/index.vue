<template>
  <div class="relative min-h-screen overflow-hidden bg-[#08080a]">
    <canvas ref="globeCanvas" class="fixed inset-0 z-0 pointer-events-none" />
    <DotField
      class="absolute inset-0 z-[1]"
      :dot-radius="1"
      :dot-spacing="18"
      :cursor-radius="350"
      :bulge-strength="35"
      :glow-radius="100"
      gradient-from="rgba(124, 255, 103, 0.05)"
      gradient-to="rgba(160, 255, 188, 0.03)"
      glow-color="#08080a"
    />
    <div class="scroll-indicator">SCROLL TO EXPLORE</div>
    <div id="ui-overlay" class="relative z-10">
      <section id="hero" class="min-h-screen flex flex-col justify-center px-[10%] pointer-events-auto">
        <span class="data-label">SINCE 2014 / GLOBAL GRANT INITIATIVES</span>
        <h1>Earth Guardians<br/>GRANTS</h1>
        <p class="hero-desc">
          Socio-environmental grants empowering youth-led climate action worldwide. Submit, review, and fund transformative projects.
        </p>
      </section>
      <section id="details" class="min-h-screen flex flex-col justify-center px-[10%] pointer-events-auto">
        <span class="data-label">REAL IMPACT / REAL TIME</span>
        <div class="stats-grid">
          <div class="stat-card">
            <span class="data-label">TOTAL GRANTS</span>
            <span class="stat-value">{{ approvedGrantsCount }}</span>
          </div>
          <div class="stat-card">
            <span class="data-label">PENDING</span>
            <span class="stat-value" style="color: var(--accent);">{{ pendingGrantsCount }}</span>
          </div>
          <div class="stat-card">
            <span class="data-label">BENEFICIARIES</span>
            <span class="stat-value">{{ beneficiaryCount }}</span>
          </div>
          <div class="stat-card">
            <span class="data-label">COUNTRIES</span>
            <span class="stat-value">{{ countryCount }}</span>
          </div>
        </div>
        <div class="mt-4">
          <button class="px-4 py-2 bg-[var(--tool-btn-active-bg)] text-white rounded" @click="openRegistryModal">Open Grants Registry</button>
        </div>
      </section>
      <section class="join-section" id="join">
        <span class="data-label">HOW IT WORKS // GRANTS PROCESS</span>
        <h2 style="margin-top: 1rem; text-align: center;">GRANTS PROGRAM</h2>
        <div class="join-grid">
          <div class="join-card">
            <div class="join-card-content">
              <div class="preview-tooltip">
                <strong>SUBMIT A GRANT</strong>
                Crew members can submit socio-environmental grant proposals. Describe your project, location, and expected impact.
              </div>
              <h3>Submit Proposals</h3>
              <p>Earth Guardians crew members can submit grant proposals for environmental and social projects in their communities.</p>
              <NuxtLink v-if="!user" to="#" @click.prevent="scrollToPortal" class="join-card-btn">
                <span>SIGN IN TO SUBMIT</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </NuxtLink>
              <NuxtLink v-else to="#" @click.prevent="scrollToPortal" class="join-card-btn">
                <span>SUBMIT A GRANT</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </NuxtLink>
            </div>
          </div>
          <div class="join-card">
            <div class="join-card-content">
              <div class="preview-tooltip">
                <strong>REVIEW & APPROVE</strong>
                Managers review submissions, approve funding, and track project progress across all regions.
              </div>
              <h3>Review & Fund</h3>
              <p>Grants are reviewed by EG managers who evaluate impact potential, feasibility, and alignment with Earth Guardians' mission.</p>
              <NuxtLink to="#" @click.prevent="scrollToPortal" class="join-card-btn">
                <span>VIEW GRANTS</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </NuxtLink>
            </div>
          </div>
        </div>
        <div class="contact-info">
          <p class="contact-text">
            QUESTIONS? EMAIL <a href="mailto:GRANTS@EARTHGUARDIANS.ORG">GRANTS@EARTHGUARDIANS.ORG</a>
          </p>
          <p class="contact-text">
            VISIT <a href="https://www.earthguardians.org/" target="_blank">EARTHGUARDIANS.ORG</a>
          </p>
        </div>
      </section>
      <section class="projects-section" id="grants-portal">
        <div class="projects-header">
          <span class="data-label">GRANTS PORTAL // SUBMIT & REVIEW</span>
          <h2>GRANTS DASHBOARD</h2>
          <p class="projects-subtitle">Manage grant proposals and track funding decisions</p>
        </div>
        <div class="portal-container">
          <div v-if="!user" class="portal-card signin-card">
            <div class="portal-card-inner">
              <svg class="portal-icon-big" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
              <h3>Sign in with Google</h3>
              <p>Only registered Earth Guardians crew members can access the grants portal.</p>
              <button @click="signIn" class="signin-btn">
                <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Sign in with Google
              </button>
            </div>
          </div>
          <div v-else class="portal-card user-card">
            <div class="user-info">
              <div class="user-avatar" :class="isManager ? 'manager' : 'member'">{{ isManager ? 'M' : 'C' }}</div>
              <div>
                <p class="user-role">{{ isManager ? 'Manager' : 'Crew Member' }}</p>
                <p class="user-email">{{ user.email }}</p>
              </div>
            </div>
            <button @click="signOut" class="signout-btn">Sign out</button>
          </div>
          <div v-if="user" class="stats-row">
            <div v-for="s in statCards" :key="s.label" class="stat-mini">
              <span class="stat-mini-value" :style="{ color: s.color }">{{ s.value }}</span>
              <span class="stat-mini-label">{{ s.label }}</span>
            </div>
          </div>
          <div v-if="isManager" class="tabs-row">
            <button v-for="tab in managerTabs" :key="tab" @click="activeTab = tab" class="tab-btn" :class="activeTab === tab ? 'active' : ''">{{ tab }}</button>
          </div>
          <div v-if="user && !isManager" class="portal-card">
            <h3 class="portal-card-title">Submit a Grant</h3>
            <form @submit.prevent="handleSubmitGrant" class="grant-form">
              <input v-model="form.title" placeholder="Title" required class="form-input" />
              <textarea v-model="form.description" placeholder="Description" required rows="3" class="form-input" />
              <input v-model="form.location_name" placeholder="Location (e.g. Nairobi, Kenya)" required class="form-input" />
              <div class="form-row">
                <input v-model.number="form.latitude" type="number" step="any" placeholder="Latitude" required class="form-input" />
                <input v-model.number="form.longitude" type="number" step="any" placeholder="Longitude" required class="form-input" />
              </div>
              <select v-model="form.category" class="form-input">
                <option value="environment">Environment</option>
                <option value="social">Social</option>
                <option value="art">Art</option>
                <option value="education">Education</option>
                <option value="health">Health</option>
              </select>
              <button type="submit" :disabled="submitting" class="submit-btn">{{ submitting ? 'Submitting...' : 'Submit Grant' }}</button>
              <p v-if="submitMsg" class="submit-msg" :class="submitOk ? 'ok' : 'err'">{{ submitMsg }}</p>
            </form>
          </div>
          <div v-if="user" class="grants-list">
            <div v-if="loading" class="list-status">Loading grants...</div>
            <div v-else-if="grants.length === 0" class="list-status">No grants found.</div>
            <div v-for="grant in grants" :key="String(grant.id)" class="grant-item">
              <div class="grant-item-body">
                <div class="grant-item-header">
                  <h4>{{ grant.title }}</h4>
                  <span class="grant-status" :class="grant.status">{{ grant.status }}</span>
                  <span class="grant-category">{{ grant.category }}</span>
                </div>
                <p class="grant-desc">{{ grant.description }}</p>
                <p class="grant-location">{{ grant.location_name }}</p>
              </div>
              <div v-if="isManager && grant.status === 'pending'" class="grant-actions">
                <button @click="handleReview(String(grant.id), 'approved')" class="action-btn approve">Approve</button>
                <button @click="handleReview(String(grant.id), 'rejected')" class="action-btn reject">Reject</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Full-screen registry modal -->
      <Teleport to="body">
        <div v-if="showRegistry" class="fixed inset-0 z-[9000] bg-black/90 p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Approved grants registry">
          <div class="mx-auto max-w-6xl w-full">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-bold text-white">Approved Grants</h2>
              <button class="text-white/70 hover:text-white" aria-label="Close" @click="closeRegistryModal">Close</button>
            </div>
            <div v-if="registryLoading" class="text-white/70">Loading registry...</div>
            <div v-else-if="!registry.length" class="text-white/70">No approved grants yet.</div>
            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div v-for="grant in registry" :key="String(grant.id)" class="rounded border border-white/10 bg-white/5 p-3 text-white">
                <div class="flex items-start justify-between gap-2">
                  <h3 class="text-sm font-semibold leading-snug">{{ grant.title }}</h3>
                  <span v-if="grant.relevante" class="text-[10px] font-bold uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded">Public</span>
                </div>
                <p class="mt-2 text-xs text-white/70 line-clamp-3">{{ grant.description }}</p>
                <div class="mt-3 flex items-center justify-between text-[11px] text-white/60">
                  <span>{{ grant.location_name }}</span>
                  <span>{{ new Date(grant.created_at).toLocaleDateString() }}</span>
                </div>
                <button class="mt-3 w-full rounded bg-white/10 py-2 text-xs font-semibold text-white hover:bg-white/20" @click="openGrantDetail(grant)">View details</button>
              </div>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Full-screen grant detail -->
      <Teleport to="body">
        <div v-if="selectedGrant" class="fixed inset-0 z-[9100] bg-black/95 p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Grant detail">
          <div class="mx-auto max-w-4xl w-full">
            <div class="flex items-center justify-between mb-4">
              <div class="text-white">
                <h2 class="text-lg font-bold">{{ selectedGrant.title }}</h2>
                <p class="text-xs text-white/60">{{ selectedGrant.location_name }} • {{ new Date(selectedGrant.created_at).toLocaleString() }}</p>
              </div>
              <button class="text-white/70 hover:text-white" aria-label="Close" @click="closeGrantDetail">Close</button>
            </div>
            <div class="grid gap-4 sm:grid-cols-3">
              <div class="sm:col-span-2 space-y-3">
                <div class="rounded border border-white/10 bg-white/5 p-4 text-white">
                  <h3 class="text-xs font-bold uppercase tracking-wider text-white/60">Description</h3>
                  <p class="mt-2 text-sm leading-relaxed">{{ selectedGrant.description }}</p>
                </div>
                <div class="rounded border border-white/10 bg-white/5 p-4 text-white">
                  <h3 class="text-xs font-bold uppercase tracking-wider text-white/60">Status</h3>
                  <p class="mt-2 text-sm capitalize">{{ selectedGrant.status }}</p>
                </div>
                <div class="rounded border border-white/10 bg-white/5 p-4 text-white">
                  <h3 class="text-xs font-bold uppercase tracking-wider text-white/60">Location</h3>
                  <p class="mt-2 text-sm">Lat: {{ selectedGrant.latitude }} • Lng: {{ selectedGrant.longitude }}</p>
                  <p class="text-sm">{{ selectedGrant.location_name }}</p>
                </div>
              </div>
              <div class="space-y-3">
                <div class="rounded border border-white/10 bg-white/5 p-4 text-white">
                  <h3 class="text-xs font-bold uppercase tracking-wider text-white/60">Submitted by</h3>
                  <p class="mt-2 text-sm">{{ selectedGrant.submitted_by }}</p>
                </div>
                <div class="rounded border border-white/10 bg-white/5 p-4 text-white">
                  <h3 class="text-xs font-bold uppercase tracking-wider text-white/60">Review</h3>
                  <p class="mt-2 text-sm">{{ selectedGrant.reviewed_by || 'Pending review' }}</p>
                  <p class="text-xs text-white/60">{{ selectedGrant.reviewed_at || '' }}</p>
                </div>
                <button class="w-full rounded bg-white/10 py-2 text-xs font-semibold text-white hover:bg-white/20" @click="closeGrantDetail">Back to registry</button>
              </div>
            </div>
          </div>
        </div>
      </Teleport>

      <section id="footer" class="footer-section">
        <div class="footer-glow" />
        <div class="footer-content">
          <span class="data-label">EARTH GUARDIANS GRANTS</span>
          <h1 class="footer-title">FUNDING<br/>IMPACT</h1>
          <div class="footer-links">
            <a href="https://www.earthguardians.org/" target="_blank" class="footer-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              <span>earthguardians.org</span>
            </a>
            <a href="https://www.instagram.com/earthguardians_br/" target="_blank" class="footer-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              <span>@earthguardians_br</span>
            </a>
          </div>
          <div class="tectonic-line" />
          <div class="footer-stats-grid">
            <div><h4>SINCE</h4><p class="footer-stat-value">2014</p><p class="footer-stat-label">OVER A DECADE</p></div>
            <div><h4>GRANTS</h4><p class="footer-stat-value">{{ stats.total || '—' }}</p><p class="footer-stat-label">PROPOSALS SUBMITTED</p></div>
            <div><h4>APPROVED</h4><p class="footer-stat-value">{{ stats.approved || '—' }}</p><p class="footer-stat-label">FUNDED PROJECTS</p></div>
            <div><h4>COUNTRIES</h4><p class="footer-stat-value">{{ countryCount }}</p><p class="footer-stat-label">GLOBAL REACH</p></div>
          </div>
          <div class="tectonic-line" />
          <p class="footer-copy">
            © 2014-2024 EARTH GUARDIANS // SOCIO-ENVIRONMENTAL GRANTS PROGRAM<br/>
            <span>BUILT FOR PURPOSE</span>
          </p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import type { GrantRecord } from '~/composables/useGrants'

useHead({
  title: 'EG Grants | Earth Guardians',
  meta: [
    { name: 'description', content: 'Earth Guardians Grants — socio-environmental grant initiatives empowering youth-led climate action worldwide.' },
  ],
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@900&family=JetBrains+Mono:wght@300;500;700;800&display=swap' },
  ],
})

const { user, isManager, signIn, signOut } = useSupabaseAuth()
const { listGrants, submitGrant: apiSubmitGrant, reviewGrant: apiReviewGrant, getStats } = useGrants()

const grants = ref<GrantRecord[]>([])
const registry = ref<Array<GrantRecord & { relevante?: boolean }>>([])
const stats = reactive({ pending: 0, approved: 0, rejected: 0, total: 0 })
const loading = ref(true)
const submitting = ref(false)
const submitMsg = ref('')
const submitOk = ref(false)
const activeTab = ref<'pending' | 'approved' | 'rejected'>('pending')
const managerTabs = ['pending', 'approved', 'rejected'] as const

const showRegistry = ref(false)
const registryLoading = ref(false)
const selectedGrant = ref<GrantRecord | null>(null)

const statCards = computed(() => [
  { label: 'Pending', value: stats.pending, color: '#eab308' },
  { label: 'Approved', value: stats.approved, color: '#00ff85' },
  { label: 'Rejected', value: stats.rejected, color: '#ef4444' },
  { label: 'Total', value: stats.total, color: '#ffffff' },
])

const form = reactive({
  title: '',
  description: '',
  location_name: '',
  latitude: null as number | null,
  longitude: null as number | null,
  category: 'environment' as string,
})

const approvedGrantsCount = computed(() => stats.approved)
const pendingGrantsCount = computed(() => stats.pending)
const beneficiaryCount = computed(() => '10K+')
const countryCount = computed(() => '47+')

async function loadRegistry() {
  registryLoading.value = true
  const result = await listGrants('approved')
  registry.value = (result.grants ?? []).slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  registryLoading.value = false
}

function openRegistryModal() {
  showRegistry.value = true
  loadRegistry()
}

function closeRegistryModal() {
  showRegistry.value = false
  selectedGrant.value = null
}

function openGrantDetail(grant: GrantRecord) {
  selectedGrant.value = grant
}

function closeGrantDetail() {
  selectedGrant.value = null
}

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
  if (showRegistry.value) loadRegistry()
}

function scrollToPortal() {
  document.getElementById('grants-portal')?.scrollIntoView({ behavior: 'smooth' })
}

watch(activeTab, () => loadGrants())

const globeCanvas = ref<HTMLCanvasElement | null>(null)

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = src
    s.onload = () => resolve()
    s.onerror = reject
    document.head.appendChild(s)
  })
}

let cleanupThree: (() => void) | null = null

onMounted(async () => {
  await Promise.all([loadGrants(), loadStats()])
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js')
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js')
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js')
  await nextTick()

  const win = window as unknown as { THREE: unknown; gsap: unknown; ScrollTrigger: unknown }
  const THREE: any = win.THREE
  const gsap: any = win.gsap
  if (!THREE || !gsap) return

  gsap.registerPlugin(win.ScrollTrigger)

  const canvas = globeCanvas.value
  if (!canvas) return

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x08080a)
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000)
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x08080a, 1)

  const loader = new THREE.TextureLoader()
  const earthMap = loader.load('https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg')
  earthMap.anisotropy = renderer.capabilities.getMaxAnisotropy()
  earthMap.minFilter = THREE.LinearMipmapLinearFilter
  earthMap.magFilter = THREE.LinearFilter

  const geo = new THREE.SphereGeometry(2, 96, 96)
  const mat = new THREE.MeshPhongMaterial({ map: earthMap, specular: new THREE.Color('#111111'), shininess: 10 })
  const globe = new THREE.Mesh(geo, mat)
  scene.add(globe)

  const starGeo = new THREE.BufferGeometry()
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.015 })
  const starVerts: number[] = []
  for (let i = 0; i < 6000; i++) starVerts.push((Math.random() - 0.5) * 2000, (Math.random() - 0.5) * 2000, (Math.random() - 0.5) * 2000)
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVerts, 3))
  scene.add(new THREE.Points(starGeo, starMat))

  scene.add(new THREE.AmbientLight(0xffffff, 0.3))
  const mainLight = new THREE.DirectionalLight(0xffffff, 1.5)
  mainLight.position.set(5, 3, 5)
  scene.add(mainLight)
  const rimLight = new THREE.PointLight(0x00ff85, 0.6)
  rimLight.position.set(-5, -3, -5)
  scene.add(rimLight)
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.4)
  fillLight.position.set(-3, 1, 2)
  scene.add(fillLight)
  camera.position.z = 6

  let mouseX = 0, mouseY = 0
  const mouseHandler = (e: MouseEvent) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 0.2
    mouseY = (e.clientY / window.innerHeight - 0.5) * 0.2
  }
  window.addEventListener('mousemove', mouseHandler)

  gsap.to(globe.rotation, { y: Math.PI * 2, scrollTrigger: { trigger: '#ui-overlay', start: 'top top', end: 'bottom bottom', scrub: 1.5 } })
  gsap.to(globe.position, { x: 1.5, scrollTrigger: { trigger: '#hero', start: 'bottom center', end: 'center center', scrub: 1.5 } })
  const footerTL = gsap.timeline({
    scrollTrigger: { trigger: '#footer', start: 'top bottom', end: 'bottom top', scrub: 3, invalidateOnRefresh: true },
  })
  footerTL.to(globe.position, { x: 0, ease: 'power2.inOut', duration: 2 }).to(globe.scale, { x: 2.5, y: 2.5, z: 2.5, ease: 'power2.out', duration: 1.5 }, '-=0.5').to(camera.position, { z: 2.8, ease: 'power2.out', duration: 1.5 }, '-=1.5')

  gsap.from('#hero h1', { opacity: 0, y: 100, duration: 1.5, stagger: 0.2, ease: 'power4.out' })
  gsap.from('.stat-card', { opacity: 0, x: -50, duration: 1, stagger: 0.1, scrollTrigger: { trigger: '#details', start: 'top center' } })
  gsap.from('.join-card', { opacity: 0, y: 80, duration: 1.2, stagger: 0.3, force3D: true, scrollTrigger: { trigger: '.join-section', start: 'top 75%', toggleActions: 'play none none none' } })
  gsap.from('.portal-card', { opacity: 0, y: 60, duration: 1, stagger: 0.1, force3D: true, scrollTrigger: { trigger: '#grants-portal', start: 'top 75%', toggleActions: 'play none none none' } })

  const animate = () => {
    rafId = requestAnimationFrame(animate)
    globe.rotation.y += 0.001
    scene.rotation.y += (mouseX - scene.rotation.y) * 0.05
    scene.rotation.x += (mouseY - scene.rotation.x) * 0.05
    renderer.render(scene, camera)
  }
  let rafId = requestAnimationFrame(animate)

  const resizeHandler = () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  }
  window.addEventListener('resize', resizeHandler)

  cleanupThree = () => {
    window.removeEventListener('resize', resizeHandler)
    window.removeEventListener('mousemove', mouseHandler)
    cancelAnimationFrame(rafId)
    renderer.dispose()
  }
})

onBeforeUnmount(() => cleanupThree?.())
</script>