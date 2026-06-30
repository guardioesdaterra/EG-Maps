<template>
  <div class="relative min-h-screen overflow-hidden bg-[#08080a]">
    <!-- Three.js Globe Canvas (layer 0) -->
    <canvas ref="globeCanvas" class="fixed inset-0 z-0 pointer-events-none" />

    <!-- DotField overlay (layer 1) -->
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

    <!-- Scroll indicator -->
    <div class="scroll-indicator">SCROLL TO EXPLORE</div>

    <!-- Content overlay (layer 10) -->
    <div id="ui-overlay" class="relative z-10">
      <!-- Hero Section -->
      <section id="hero" class="min-h-screen flex flex-col justify-center px-[10%] pointer-events-auto">
        <span class="data-label">SINCE 2014 / GLOBAL GRANT INITIATIVES</span>
        <h1>Earth Guardians<br/>GRANTS</h1>
        <p class="hero-desc">
          Socio-environmental grants empowering youth-led climate action worldwide. Submit, review, and fund transformative projects.
        </p>
      </section>

      <!-- Stats Section -->
      <section id="details" class="min-h-screen flex flex-col justify-center px-[10%] pointer-events-auto">
        <span class="data-label">REAL IMPACT / REAL TIME</span>
        <div class="stats-grid">
          <div class="stat-card">
            <span class="data-label">TOTAL GRANTS</span>
            <span class="stat-value">{{ stats.total || '—' }}</span>
          </div>
          <div class="stat-card">
            <span class="data-label">APPROVED</span>
            <span class="stat-value" style="color: var(--accent);">{{ stats.approved || '—' }}</span>
          </div>
          <div class="stat-card">
            <span class="data-label">BENEFICIARIES</span>
            <span class="stat-value">10K+</span>
          </div>
          <div class="stat-card">
            <span class="data-label">COUNTRIES</span>
            <span class="stat-value">47+</span>
          </div>
        </div>
      </section>

      <!-- Features Section -->
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

      <!-- Grants Portal Section -->
      <section class="projects-section" id="grants-portal">
        <div class="projects-header">
          <span class="data-label">GRANTS PORTAL // SUBMIT & REVIEW</span>
          <h2>GRANTS DASHBOARD</h2>
          <p class="projects-subtitle">Manage grant proposals and track funding decisions</p>
        </div>

        <div class="portal-container">
          <!-- Sign in prompt -->
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

          <!-- Logged in header -->
          <div v-else class="portal-card user-card">
            <div class="user-info">
              <div class="user-avatar" :class="isManager ? 'manager' : 'member'">
                {{ isManager ? 'M' : 'C' }}
              </div>
              <div>
                <p class="user-role">{{ isManager ? 'Manager' : 'Crew Member' }}</p>
                <p class="user-email">{{ user.email }}</p>
              </div>
            </div>
            <button @click="signOut" class="signout-btn">Sign out</button>
          </div>

          <!-- Stats row (logged in) -->
          <div v-if="user" class="stats-row">
            <div v-for="s in statCards" :key="s.label" class="stat-mini">
              <span class="stat-mini-value" :style="{ color: s.color }">{{ s.value }}</span>
              <span class="stat-mini-label">{{ s.label }}</span>
            </div>
          </div>

          <!-- Manager tabs -->
          <div v-if="isManager" class="tabs-row">
            <button
              v-for="tab in managerTabs"
              :key="tab"
              @click="activeTab = tab"
              class="tab-btn"
              :class="activeTab === tab ? 'active' : ''"
            >
              {{ tab }}
            </button>
          </div>

          <!-- Submit form (members) -->
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
              <button type="submit" :disabled="submitting" class="submit-btn">
                {{ submitting ? 'Submitting...' : 'Submit Grant' }}
              </button>
              <p v-if="submitMsg" class="submit-msg" :class="submitOk ? 'ok' : 'err'">{{ submitMsg }}</p>
            </form>
          </div>

          <!-- Grants list -->
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

      <!-- Footer -->
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
            <div><h4>COUNTRIES</h4><p class="footer-stat-value">47+</p><p class="footer-stat-label">GLOBAL REACH</p></div>
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
const stats = reactive({ pending: 0, approved: 0, rejected: 0, total: 0 })
const loading = ref(true)
const submitting = ref(false)
const submitMsg = ref('')
const submitOk = ref(false)
const activeTab = ref<'pending' | 'approved' | 'rejected'>('pending')
const managerTabs = ['pending', 'approved', 'rejected'] as const

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

function scrollToPortal() {
  document.getElementById('grants-portal')?.scrollIntoView({ behavior: 'smooth' })
}

watch(activeTab, () => loadGrants())

// --- Three.js Globe + GSAP ---
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
  // Load grants data
  await Promise.all([loadGrants(), loadStats()])

  // Load external libs
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js')
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js')
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js')

  await nextTick()

  const win = window as unknown as { THREE: unknown; gsap: unknown; ScrollTrigger: unknown }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const THREE: any = win.THREE
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gsap: any = win.gsap
  if (!THREE || !gsap) return

  gsap.registerPlugin(win.ScrollTrigger)

  const canvas = globeCanvas.value
  if (!canvas) return

  // Scene
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x08080a)
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000)
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x08080a, 1)

  // Textures
  const loader = new THREE.TextureLoader()
  const earthMap = loader.load('https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg')
  earthMap.anisotropy = renderer.capabilities.getMaxAnisotropy()
  earthMap.minFilter = THREE.LinearMipmapLinearFilter
  earthMap.magFilter = THREE.LinearFilter

  // Globe
  const geo = new THREE.SphereGeometry(2, 96, 96)
  const mat = new THREE.MeshPhongMaterial({
    map: earthMap,
    specular: new THREE.Color('#111111'),
    shininess: 10,
  })
  const globe = new THREE.Mesh(geo, mat)
  scene.add(globe)

  // Stars
  const starGeo = new THREE.BufferGeometry()
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.015 })
  const starVerts: number[] = []
  for (let i = 0; i < 6000; i++) {
    starVerts.push((Math.random() - 0.5) * 2000, (Math.random() - 0.5) * 2000, (Math.random() - 0.5) * 2000)
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVerts, 3))
  scene.add(new THREE.Points(starGeo, starMat))

  // Lighting
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

  // Mouse parallax
  let mouseX = 0, mouseY = 0
  const mouseHandler = (e: MouseEvent) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 0.2
    mouseY = (e.clientY / window.innerHeight - 0.5) * 0.2
  }
  window.addEventListener('mousemove', mouseHandler)

  // GSAP scroll animations
  gsap.to(globe.rotation, {
    y: Math.PI * 2,
    scrollTrigger: {
      trigger: '#ui-overlay',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.5,
    },
  })

  gsap.to(globe.position, {
    x: 1.5,
    scrollTrigger: {
      trigger: '#hero',
      start: 'bottom center',
      end: 'center center',
      scrub: 1.5,
    },
  })

  const footerTL = gsap.timeline({
    scrollTrigger: {
      trigger: '#footer',
      start: 'top bottom',
      end: 'bottom top',
      scrub: 3,
      invalidateOnRefresh: true,
    },
  })
  footerTL.to(globe.position, { x: 0, ease: 'power2.inOut', duration: 2 })
    .to(globe.scale, { x: 2.5, y: 2.5, z: 2.5, ease: 'power2.out', duration: 1.5 }, '-=0.5')
    .to(camera.position, { z: 2.8, ease: 'power2.out', duration: 1.5 }, '-=1.5')

  // Reveal animations
  gsap.from('#hero h1', { opacity: 0, y: 100, duration: 1.5, stagger: 0.2, ease: 'power4.out' })
  gsap.from('.stat-card', {
    opacity: 0, x: -50, duration: 1, stagger: 0.1,
    scrollTrigger: { trigger: '#details', start: 'top center' },
  })
  gsap.from('.join-card', {
    opacity: 0, y: 80, duration: 1.2, stagger: 0.3, force3D: true,
    scrollTrigger: { trigger: '.join-section', start: 'top 75%', toggleActions: 'play none none none' },
  })
  gsap.from('.portal-card', {
    opacity: 0, y: 60, duration: 1, stagger: 0.1, force3D: true,
    scrollTrigger: { trigger: '#grants-portal', start: 'top 75%', toggleActions: 'play none none none' },
  })

  // Animate
  const animate = () => {
    rafId = requestAnimationFrame(animate)
    globe.rotation.y += 0.001
    scene.rotation.y += (mouseX - scene.rotation.y) * 0.05
    scene.rotation.x += (mouseY - scene.rotation.x) * 0.05
    renderer.render(scene, camera)
  }
  let rafId = requestAnimationFrame(animate)

  // Resize
  const resizeHandler = () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  }
  window.addEventListener('resize', resizeHandler)

  // Reset
  const resetTimeout = setTimeout(() => {
    globe.position.set(0, 0, 0)
    globe.scale.set(1, 1, 1)
    camera.position.z = 6
  }, 100)

  cleanupThree = () => {
    clearTimeout(resetTimeout)
    cancelAnimationFrame(rafId)
    window.removeEventListener('mousemove', mouseHandler)
    window.removeEventListener('resize', resizeHandler)
    renderer.dispose()
  }
})

onBeforeUnmount(() => {
  cleanupThree?.()
})
</script>

<style scoped>
div {
  --obsidian: #08080a;
  --tectonic-white: #f0f0f0;
  --glass: rgba(255, 255, 255, 0.03);
  --border: rgba(255, 255, 255, 0.1);
  --accent: #00ff85;
}

canvas {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 0;
  pointer-events: none;
  background-color: transparent;
}

#ui-overlay {
  position: relative;
  z-index: 10;
}

section {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 10%;
  pointer-events: auto;
}

.data-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.3em;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 1rem;
  display: block;
}

h1 {
  font-size: clamp(3rem, 10vw, 8rem);
  line-height: 0.9;
  text-transform: uppercase;
  letter-spacing: -0.05em;
  max-width: 800px;
  color: var(--tectonic-white);
}

h2 {
  font-size: clamp(2rem, 6vw, 4rem);
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: -0.03em;
  margin-bottom: 2rem;
  color: var(--tectonic-white);
}

.hero-desc {
  margin-top: 2rem;
  max-width: 600px;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.7);
  font-size: 1rem;
}

/* Stats */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 2rem;
  margin-top: 3rem;
}

.stat-card {
  background: var(--glass);
  backdrop-filter: blur(10px);
  border: 1px solid var(--border);
  padding: 2rem;
  transition: border-color 0.3s ease;
}
.stat-card:hover {
  border-color: rgba(255, 255, 255, 0.4);
}

.stat-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 2rem;
  display: block;
  color: var(--accent);
}

/* Join/Features Section */
.join-section {
  padding: 8rem 10%;
  border-top: 1px solid var(--border);
  position: relative;
}
.join-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at 50% 50%, rgba(0, 255, 133, 0.03) 0%, transparent 70%);
  pointer-events: none;
}

.join-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 3rem;
  margin-top: 4rem;
  width: 100%;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
}

.join-card {
  background: var(--glass);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  padding: 4rem 3rem;
  transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
  position: relative;
  min-height: 450px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  overflow: visible;
}

.join-card::after {
  content: '';
  position: absolute;
  inset: 2px;
  background: linear-gradient(135deg, rgba(8, 8, 10, 0.95) 0%, rgba(8, 8, 10, 0.8) 100%);
  z-index: 0;
}

.join-card-content {
  position: relative;
  z-index: 10;
  width: 100%;
}

.join-card h3 {
  font-size: 1.8rem;
  text-transform: uppercase;
  margin-bottom: 1.5rem;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.05em;
  background: linear-gradient(135deg, var(--tectonic-white) 0%, rgba(255, 255, 255, 0.6) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.join-card p {
  line-height: 1.8;
  color: rgba(255,255,255,0.6);
  font-size: 0.95rem;
  margin-bottom: 2rem;
}

.join-card-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
  padding: 1.25rem 2.5rem;
  background: linear-gradient(135deg, rgba(0, 255, 133, 0.1) 0%, rgba(0, 255, 133, 0.05) 100%);
  border: 1px solid var(--accent);
  color: var(--accent);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
  position: relative;
  overflow: hidden;
  z-index: 1;
  border-radius: 4px;
}

.join-card-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(0, 255, 133, 0.3), transparent);
  transition: left 0.6s ease;
  z-index: -1;
}
.join-card-btn:hover::before { left: 100%; }

.join-card-btn::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--accent);
  opacity: 0;
  transition: opacity 0.4s ease;
  z-index: -1;
}
.join-card-btn:hover::after { opacity: 1; }

.join-card-btn:hover {
  color: var(--obsidian);
  box-shadow: 0 0 40px rgba(0, 255, 133, 0.6), 0 0 80px rgba(0, 255, 133, 0.3);
  transform: translateY(-3px);
  border-color: var(--accent);
}

.join-card-btn svg {
  width: 20px;
  height: 20px;
  transition: transform 0.4s ease;
}
.join-card-btn:hover svg { transform: translateX(5px); }

.preview-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%) translateY(-15px);
  background: var(--obsidian);
  border: 1px solid var(--accent);
  padding: 1.5rem;
  min-width: 320px;
  max-width: 400px;
  opacity: 0;
  visibility: hidden;
  transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
  font-size: 0.75rem;
  line-height: 1.6;
  z-index: 1000;
  pointer-events: none;
  box-shadow: 0 10px 40px rgba(0, 255, 133, 0.3), 0 0 20px rgba(0, 255, 133, 0.2);
}
.join-card:hover .preview-tooltip {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) translateY(-25px);
}
.preview-tooltip strong {
  display: block;
  margin-bottom: 0.75rem;
  font-size: 0.85rem;
  letter-spacing: 0.1em;
  color: var(--accent);
  text-transform: uppercase;
  font-family: 'JetBrains Mono', monospace;
}

.contact-info {
  margin-top: 4rem;
  padding: 2rem;
  border: 1px solid var(--border);
  text-align: center;
}
.contact-text {
  margin-bottom: 0.5rem;
  color: rgba(255,255,255,0.7);
  font-size: 0.9rem;
}
.contact-text a {
  color: var(--accent);
  text-decoration: none;
}
.contact-text a:hover { text-decoration: underline; }

/* Portal Section */
.projects-section {
  padding: 8rem 10%;
  border-top: 1px solid var(--border);
  position: relative;
}
.projects-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at 30% 50%, rgba(0, 255, 133, 0.04) 0%, transparent 60%);
  pointer-events: none;
}

.projects-header {
  text-align: center;
  margin-bottom: 4rem;
  position: relative;
  z-index: 1;
}
.projects-header h2 {
  font-size: clamp(2.5rem, 6vw, 4.5rem);
  background: linear-gradient(135deg, var(--tectonic-white) 0%, var(--accent) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 1rem;
}
.projects-subtitle {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.portal-container {
  max-width: 700px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

.portal-card {
  background: var(--glass);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  padding: 2.5rem;
  margin-bottom: 2rem;
  transition: all 0.3s;
}
.portal-card:hover { border-color: rgba(255,255,255,0.15); }

.signin-card {
  text-align: center;
  padding: 4rem 2.5rem;
}
.portal-icon-big {
  width: 48px;
  height: 48px;
  stroke: var(--accent);
  margin: 0 auto 1.5rem;
}
.portal-card-inner h3 {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--tectonic-white);
  margin-bottom: 0.75rem;
  font-family: 'JetBrains Mono', monospace;
}
.portal-card-inner p {
  color: rgba(255,255,255,0.5);
  font-size: 0.9rem;
  margin-bottom: 2rem;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.6;
}

.signin-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 0.85rem 2rem;
  background: #fff;
  color: #000;
  font-weight: 700;
  font-size: 0.9rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.25s;
  border: none;
}
.signin-btn:hover { transform: scale(1.03); box-shadow: 0 4px 20px rgba(0,0,0,0.3); }

.user-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 2rem;
}
.user-info { display: flex; align-items: center; gap: 12px; }
.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 900;
}
.user-avatar.manager { background: rgba(0,255,133,0.2); color: var(--accent); }
.user-avatar.member { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.5); }
.user-role { font-size: 0.8rem; font-weight: 700; color: var(--tectonic-white); }
.user-email { font-size: 0.7rem; color: rgba(255,255,255,0.3); }
.signout-btn {
  background: none;
  border: 1px solid rgba(255,255,255,0.15);
  color: rgba(255,255,255,0.4);
  padding: 0.4rem 1rem;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.signout-btn:hover { color: #fff; border-color: rgba(255,255,255,0.3); }

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}
.stat-mini {
  background: var(--glass);
  border: 1px solid var(--border);
  padding: 1rem;
  text-align: center;
}
.stat-mini-value {
  display: block;
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.5rem;
  font-weight: 700;
}
.stat-mini-label {
  display: block;
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(255,255,255,0.3);
  margin-top: 2px;
}

.tabs-row {
  display: flex;
  gap: 6px;
  margin-bottom: 1.5rem;
  padding: 4px;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--border);
  border-radius: 10px;
}
.tab-btn {
  flex: 1;
  padding: 0.5rem;
  border-radius: 6px;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  background: none;
  border: none;
  color: rgba(255,255,255,0.3);
  cursor: pointer;
  transition: all 0.2s;
}
.tab-btn.active {
  background: var(--accent);
  color: #000;
  box-shadow: 0 4px 12px rgba(0,255,133,0.2);
}
.tab-btn:hover:not(.active) { color: rgba(255,255,255,0.6); }

.portal-card-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--tectonic-white);
  font-family: 'JetBrains Mono', monospace;
  margin-bottom: 1.5rem;
}

.grant-form { display: flex; flex-direction: column; gap: 0.75rem; }

.form-input {
  width: 100%;
  padding: 0.7rem 1rem;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  color: var(--tectonic-white);
  font-size: 0.85rem;
  outline: none;
  transition: border-color 0.2s;
}
.form-input:focus { border-color: rgba(0,255,133,0.4); }
.form-input::placeholder { color: rgba(255,255,255,0.2); }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
select.form-input option { background: #000; }

.submit-btn {
  width: 100%;
  padding: 0.85rem;
  background: var(--accent);
  color: #000;
  font-weight: 800;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.submit-btn:hover { opacity: 0.9; transform: scale(1.01); }
.submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.submit-msg {
  font-size: 0.75rem;
  font-weight: 600;
  text-align: center;
}
.submit-msg.ok { color: var(--accent); }
.submit-msg.err { color: #ef4444; }

.grants-list { display: flex; flex-direction: column; gap: 0.75rem; }
.list-status {
  text-align: center;
  color: rgba(255,255,255,0.2);
  padding: 2rem 0;
  font-size: 0.85rem;
}

.grant-item {
  background: var(--glass);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  padding: 1.25rem;
  transition: border-color 0.2s;
}
.grant-item:hover { border-color: rgba(255,255,255,0.15); }

.grant-item-body { flex: 1; }
.grant-item-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}
.grant-item-header h4 {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--tectonic-white);
}
.grant-status {
  font-size: 0.55rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 2px 8px;
  border-radius: 20px;
}
.grant-status.pending { background: rgba(234,179,8,0.15); color: #eab308; }
.grant-status.approved { background: rgba(0,255,133,0.15); color: var(--accent); }
.grant-status.rejected { background: rgba(239,68,68,0.15); color: #ef4444; }
.grant-category {
  font-size: 0.55rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 2px 8px;
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.4);
  border-radius: 20px;
}
.grant-desc {
  font-size: 0.75rem;
  color: rgba(255,255,255,0.4);
  line-height: 1.5;
  margin-bottom: 0.25rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.grant-location { font-size: 0.65rem; color: rgba(255,255,255,0.2); }

.grant-actions {
  display: flex;
  gap: 6px;
  margin-top: 0.75rem;
}
.action-btn {
  padding: 0.4rem 1rem;
  border-radius: 6px;
  font-size: 0.65rem;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}
.action-btn.approve { background: rgba(0,255,133,0.15); color: var(--accent); }
.action-btn.approve:hover { background: rgba(0,255,133,0.25); }
.action-btn.reject { background: rgba(239,68,68,0.15); color: #ef4444; }
.action-btn.reject:hover { background: rgba(239,68,68,0.25); }

/* Footer */
.footer-section {
  min-height: 60vh;
  justify-content: flex-end;
  padding-bottom: 4rem;
  position: relative;
}
.footer-glow {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at 50% 30%, rgba(0, 255, 133, 0.05) 0%, transparent 70%);
  pointer-events: none;
}
.footer-content {
  position: relative;
  z-index: 1;
  width: 100%;
}
.footer-title {
  font-size: clamp(2.5rem, 8vw, 6rem);
  margin-bottom: 1rem;
}

.footer-links {
  margin: 3rem 0;
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
  justify-content: flex-start;
}

.footer-link {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 2rem;
  background: var(--glass);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--tectonic-white);
  text-decoration: none;
  transition: all 0.3s ease;
}
.footer-link:hover {
  border-color: var(--accent);
  background: rgba(0, 255, 133, 0.1);
}
.footer-link svg { width: 20px; height: 20px; }
.footer-link span {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8rem;
  text-transform: uppercase;
}

.tectonic-line {
  width: 100%;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--border), transparent);
  margin: 4rem 0;
}

.footer-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 2rem;
  margin: 2rem 0;
}
.footer-stats-grid h4 {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--accent);
  margin-bottom: 1rem;
}
.footer-stat-value {
  font-size: 2rem;
  font-weight: 900;
  color: var(--tectonic-white);
}
.footer-stat-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.7rem;
  color: rgba(255,255,255,0.5);
  margin-top: 0.5rem;
}

.footer-copy {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.7rem;
  color: rgba(255,255,255,0.4);
  text-align: center;
  margin-top: 3rem;
  line-height: 1.8;
}
.footer-copy span {
  opacity: 0.6;
  display: block;
  margin-top: 0.5rem;
}

.scroll-indicator {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.7rem;
  opacity: 0.5;
  z-index: 10;
  animation: bounce 2s infinite;
  color: rgba(255,255,255,0.5);
}
@keyframes bounce {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(10px); }
}

/* Responsive */
@media (max-width: 768px) {
  section, .join-section, .projects-section {
    padding: 4rem 5%;
  }
  .join-grid {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
  .join-card {
    min-height: 400px;
    padding: 3rem 2rem;
  }
  .preview-tooltip {
    min-width: 280px;
    max-width: 320px;
    left: 50%;
    transform: translateX(-50%) translateY(-10px);
  }
  .join-card:hover .preview-tooltip {
    transform: translateX(-50%) translateY(-20px);
  }
  .stats-grid,
  .stats-row {
    grid-template-columns: 1fr 1fr;
  }
  .footer-stats-grid {
    grid-template-columns: 1fr 1fr;
  }
  .form-row {
    grid-template-columns: 1fr;
  }
  .footer-links {
    flex-direction: column;
  }
}
</style>
