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
    <div class="top-right-auth">
      <button v-if="user" class="auth-avatar" :class="isManager ? 'manager' : ''" @click="signOut" :title="isManager ? 'Manager — click to sign out' : 'Crew Member — click to sign out'">
        <span class="auth-avatar-letter">{{ isManager ? 'M' : 'C' }}</span>
        <span class="auth-avatar-email">{{ user.email?.split('@')[0] }}</span>
      </button>
      <button v-else class="auth-signin" @click="signIn">
        <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        Sign in
      </button>
    </div>
    <div id="ui-overlay" class="relative z-10">
      <section id="hero" class="min-h-screen flex flex-col justify-center px-[10%] pointer-events-auto">
        <span class="data-label">SINCE 2014 / TWO GRANT PROGRAMS</span>
        <h1>Earth Guardians<br/>GRANTS</h1>
        <p class="hero-desc">
          Two transformative funding streams: <strong>Community Collaborative Worldwide Open Grants</strong> — crew-submitted, staff-reviewed socio-environmental opportunities, and <strong>Earth Guardians Project Grants</strong> — distributed impact data from global grantee projects.
        </p>
      </section>
      <section id="details" class="min-h-screen flex flex-col justify-center px-[10%] pointer-events-auto">
        <span class="data-label">REAL IMPACT / REAL TIME</span>
        <div class="stats-grid">
          <div class="stat-card">
            <span class="data-label">CREW GRANTS</span>
            <span class="stat-value">{{ approvedGrantsCount }}</span>
          </div>
          <div class="stat-card">
            <span class="data-label">OPEN GRANTS</span>
            <span class="stat-value" style="color: var(--accent);">{{ scrapedGrantsCount }}</span>
          </div>
          <div class="stat-card">
            <span class="data-label">PENDING REVIEW</span>
            <span class="stat-value" style="color: #eab308;">{{ pendingGrantsCount }}</span>
          </div>
          <div class="stat-card">
            <span class="data-label">COUNTRIES</span>
            <span class="stat-value">{{ countryCount }}</span>
          </div>
        </div>
        <div class="mt-4 flex gap-3 flex-wrap">
          <button class="px-4 py-2 bg-[var(--tool-btn-active-bg)] text-white rounded" @click="openRegistryModal">View Approved Registry</button>
          <NuxtLink to="/project-grants" class="px-4 py-2 bg-white/10 text-white rounded hover:bg-white/20 transition-colors">Explore Project Grants Map</NuxtLink>
        </div>
      </section>
      <section class="join-section" id="join">
        <span class="data-label">TWO GRANT PROGRAMS</span>
        <h2 style="margin-top: 1rem; text-align: center;">HOW GRANTS WORK</h2>
        <div class="join-grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 2rem;">
          <div class="join-card">
            <div class="join-card-content">
              <div class="preview-tooltip">
                <strong>COMMUNITY COLLABORATIVE WORLDWIDE OPEN GRANTS</strong>
                Socio-environmental, artistic, sociocultural opportunities submitted by any crew member, reviewed & approved by Earth Guardians Staff & RCC.
              </div>
              <h3>🌍 Open Grants</h3>
              <p>Worldwide open grants for socioenvironmental, artistic, sociocultural and related opportunities. Submitted by any crew member, reviewed & approved by Earth Guardians Staff & RCC. Plus automatically aggregated grants from 30+ global sources.</p>
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
                <strong>EARTH GUARDIANS PROJECT GRANTS</strong>
                Data of grantees crew members and their measurable impact worldwide. View on the interactive 3D globe.
              </div>
              <h3>📊 Project Grants</h3>
              <p>Earth Guardians distributed project grants — real data from grantees and crew members showing direct & indirect beneficiaries worldwide. Explore on the interactive MapLibre 3D globe with satellite-v2 tiles and project markers.</p>
              <NuxtLink to="/project-grants/3d" class="join-card-btn">
                <span>VIEW ON 3D GLOBE</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              </NuxtLink>
            </div>
          </div>
          <div class="join-card">
            <div class="join-card-content">
              <div class="preview-tooltip">
                <strong>REVIEW & APPROVE</strong>
                Managers review crew submissions, approve funding, and manage open grants from worldwide sources.
              </div>
              <h3>✅ Review & Approve</h3>
              <p>Staff and RCC members review community-submitted grants, evaluate impact potential, and approve funding. Any @earthguardians.org user can highlight, organize, and curate open grants.</p>
              <NuxtLink to="#" @click.prevent="scrollToPortal" class="join-card-btn">
                <span>VIEW DASHBOARD</span>
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
          <div v-if="user" class="tabs-row">
            <button v-for="tab in portalTabs" :key="tab.key" @click="activePortalTab = tab.key" class="tab-btn" :class="activePortalTab === tab.key ? 'active' : ''">{{ tab.label }}</button>
          </div>

          <!-- Tab: Submit / My Grants -->
          <div v-if="activePortalTab === 'submit'" class="portal-card">
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
                <option value="socioenvironmental">Socio-environmental</option>
                <option value="sociocultural">Sociocultural</option>
                <option value="artistic">Artistic</option>
                <option value="community">Community</option>
              </select>
              <button type="submit" :disabled="submitting" class="submit-btn">{{ submitting ? 'Submitting...' : 'Submit Grant' }}</button>
              <p v-if="submitMsg" class="submit-msg" :class="submitOk ? 'ok' : 'err'">{{ submitMsg }}</p>
            </form>
          </div>

          <!-- Tab: Submitted Grants (managers can filter by status + see history) -->
          <div v-if="activePortalTab === 'submitted'" v-show="user">
            <div v-if="isManager" class="flex flex-wrap gap-2 mb-4">
              <button v-for="s in (['pending', 'approved', 'rejected'] as const)" :key="s" @click="activeTab = s" class="tab-btn text-xs px-3 py-1" :class="activeTab === s ? 'active' : ''">{{ s }}</button>
              <button @click="showHistory = !showHistory" class="tab-btn text-xs px-3 py-1 ml-auto" :class="showHistory ? 'active' : ''">
                <svg class="inline-block w-3.5 h-3.5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                History
              </button>
            </div>
            <div class="grants-list">
              <div v-if="loading" class="list-status">Loading grants...</div>
              <div v-else-if="filteredGrants.length === 0" class="list-status">No grants found.</div>
              <div v-for="grant in filteredGrants" :key="String(grant.id)" class="grant-item" :class="{ 'opacity-60': grant.status !== 'pending' }">
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
                <div v-if="isManager && showHistory && grant.status !== 'pending'" class="grant-actions">
                  <button @click="handleReview(String(grant.id), 'pending')" class="action-btn restore">↩ Restore</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab: Worldwide Open Grants (from grants.py scraper) -->
          <div v-if="activePortalTab === 'open'" v-show="user">
            <div class="portal-card">
              <h3 class="portal-card-title">Worldwide Open Grants</h3>
              <p class="text-sm text-white/60 mb-4">Automatically aggregated from 30+ global sources. Updated every 2 hours. Vote on grants to build the leaderboard.</p>
              <div class="flex flex-wrap gap-2 mb-4">
                <button v-for="s in ['pending', 'approved', 'all']" :key="s" @click="scrapedFilter = s" class="tab-btn text-xs px-3 py-1" :class="scrapedFilter === s ? 'active' : ''">{{ s === 'all' ? 'All' : s }}</button>
              </div>
              <div v-if="scrapedLoading" class="list-status">Loading open grants...</div>
              <div v-else-if="scrapedGrants.length === 0" class="list-status">No open grants available yet. The scraper runs every 2 hours.</div>
              <div v-for="g in scrapedGrants" :key="g.id" class="grant-item">
                <div class="grant-item-body">
                  <div class="grant-item-header">
                    <h4>{{ g.title }}</h4>
                    <span class="grant-status" :class="g.status">{{ g.status === 'pending' ? 'open' : g.status }}</span>
                  </div>
                  <p class="grant-desc text-xs">{{ g.description?.slice(0, 200) }}{{ g.description?.length > 200 ? '...' : '' }}</p>
                  <div class="flex flex-wrap gap-2 mt-2 text-xs text-white/50">
                    <span v-if="g.funder">🏛 {{ g.funder }}</span>
                    <span v-if="g.country">📍 {{ g.country }}</span>
                    <span v-if="g.deadline">📅 {{ g.deadline }}</span>
                    <span v-if="g.amount_max">💰 {{ g.amount_max }} {{ g.currency }}</span>
                    <span v-if="g.source">📡 {{ g.source }}</span>
                  </div>
                  <div v-if="g.categories?.length" class="flex flex-wrap gap-1 mt-2">
                    <span v-for="cat in g.categories.slice(0, 4)" :key="cat" class="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white/70">{{ cat }}</span>
                  </div>
                  <div class="mt-3 flex items-center gap-3">
                    <div class="star-voter">
                      <button v-for="n in 8" :key="n" @click="handleVoteScraped(g.id, n)" class="star-btn" :class="getStarClass(g.id, n, true)" :title="n + ' stars'">★</button>
                      <span class="text-[10px] text-white/40 ml-2">{{ getVoteCount(g.id, true) }} votes</span>
                    </div>
                    <a :href="g.url" target="_blank" class="text-[11px] text-green-400 hover:text-green-300" rel="noopener">Apply ↗</a>
                    <button v-if="isManager && g.status === 'pending'" @click="handleReviewScraped(g.id, 'approved')" class="action-btn approve text-[11px] py-0.5">✓ Approve</button>
                    <button v-if="isManager && g.status === 'approved'" @click="handleReviewScraped(g.id, 'pending')" class="action-btn restore text-[11px] py-0.5">↩</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab: Leaderboard -->
          <div v-if="activePortalTab === 'leaderboard'" v-show="user">
            <div class="portal-card">
              <h3 class="portal-card-title">🏆 Grants Leaderboard</h3>
              <p class="text-sm text-white/60 mb-4">Top-rated grants by community votes (⭐ 1-8 stars). Any crew member can vote; @earthguardians.org users can curate.</p>
              <div v-if="leaderboardLoading" class="list-status">Loading leaderboard...</div>
              <div v-else-if="leaderboard.length === 0" class="list-status">No grants rated yet. Be the first to vote!</div>
              <div v-for="(entry, i) in leaderboard" :key="entry.id" class="grant-item">
                <div class="grant-item-body">
                  <div class="flex items-center gap-3">
                    <span class="text-lg font-bold" :style="{ color: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#ffffff40' }">#{{ i + 1 }}</span>
                    <div class="flex-1 min-w-0">
                      <h4 class="text-sm truncate">{{ entry.title }}</h4>
                      <div class="flex items-center gap-2 mt-1">
                        <span class="text-yellow-400 text-sm">{{ '★'.repeat(Math.round(entry.avg_stars)) }}{{ '☆'.repeat(8 - Math.round(entry.avg_stars)) }}</span>
                        <span class="text-xs text-white/50">{{ entry.avg_stars }}/8 ({{ entry.vote_count }} votes)</span>
                        <span class="text-xs text-white/30">{{ entry.view_count }} views</span>
                        <span v-if="entry.source_type === 'scraped'" class="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">Open</span>
                        <span v-else class="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-300">Crew</span>
                      </div>
                    </div>
                    <button @click="openLeaderboardDetail(entry)" class="text-[11px] text-white/60 hover:text-white">Details</button>
                  </div>
                </div>
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

      <!-- Grant detail modal — 85% screen, fully responsive -->
      <Teleport to="body">
        <Transition name="modal-fade">
          <div v-if="detailGrant" class="fixed inset-0 z-[9100] flex items-center justify-center p-2 sm:p-4 md:p-6" role="dialog" aria-modal="true" aria-label="Grant detail">
            <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" @click="closeGrantDetail" />
            <div class="relative w-full max-w-[85vw] sm:max-w-[85vw] max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0c0c0e] shadow-2xl">
              <!-- Header -->
              <div class="sticky top-0 z-10 flex items-start justify-between gap-4 p-4 sm:p-6 md:p-8 border-b border-white/5 bg-[#0c0c0e]/95 backdrop-blur-sm">
                <div class="min-w-0 flex-1">
                  <h2 class="text-base sm:text-lg md:text-xl font-bold text-white leading-snug">{{ detailGrant.title }}</h2>
                  <p class="text-xs sm:text-sm text-white/50 mt-1 truncate">{{ detailGrant.funder || detailGrant.location_name || detailGrant.country }} • {{ new Date(detailGrant.created_at || detailGrant.fetched_at || '').toLocaleDateString() }}</p>
                </div>
                <button class="shrink-0 rounded-full p-2 text-white/50 hover:text-white hover:bg-white/10 transition-colors" aria-label="Close" @click="closeGrantDetail">
                  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <!-- Body -->
              <div class="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                  <!-- Main info -->
                  <div class="md:col-span-2 space-y-4">
                    <div class="rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:p-5">
                      <h3 class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/40">Description</h3>
                      <p class="mt-2 sm:mt-3 text-xs sm:text-sm leading-relaxed text-white/80">{{ detailGrant.description }}</p>
                    </div>
                    <div class="rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:p-5">
                      <h3 class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/40">Status</h3>
                      <span class="mt-2 inline-block px-3 py-1 rounded-full text-xs font-medium capitalize" :class="statusClass(detailGrant.status)">{{ detailGrant.status }}</span>
                    </div>
                    <div v-if="detailGrant.location_name || (detailGrant.latitude != null)" class="rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:p-5">
                      <h3 class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/40">Location</h3>
                      <p class="mt-2 text-xs sm:text-sm text-white/70">{{ detailGrant.location_name || '' }}{{ detailGrant.latitude != null ? ` (${detailGrant.latitude}, ${detailGrant.longitude})` : '' }}</p>
                    </div>
                    <div v-if="detailGrant.source_type === 'scraped' && detailGrant.url" class="rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:p-5">
                      <h3 class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/40">Apply</h3>
                      <a :href="detailGrant.url" target="_blank" rel="noopener" class="mt-2 inline-flex items-center gap-2 text-xs sm:text-sm text-green-400 hover:text-green-300">Visit source ↗</a>
                    </div>
                  </div>
                  <!-- Sidebar -->
                  <div class="space-y-4">
                    <div class="rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:p-5">
                      <h3 class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/40">Funding</h3>
                      <p class="mt-2 text-xs sm:text-sm text-white/70">{{ detailGrant.amount_max ? `${detailGrant.amount_max} ${detailGrant.currency || ''}` : 'Not specified' }}</p>
                      <p v-if="detailGrant.deadline" class="mt-1 text-xs text-white/50">Deadline: {{ detailGrant.deadline }}</p>
                    </div>
                    <div v-if="detailGrant.funder || detailGrant.source" class="rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:p-5">
                      <h3 class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/40">Source</h3>
                      <p class="mt-2 text-xs sm:text-sm text-white/70">{{ detailGrant.funder || detailGrant.source }}</p>
                    </div>
                    <div v-if="detailGrant.submitted_by" class="rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:p-5">
                      <h3 class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/40">Submitted by</h3>
                      <p class="mt-2 text-xs sm:text-sm text-white/70">{{ detailGrant.submitted_by }}</p>
                    </div>
                    <div v-if="detailGrant.reviewed_by" class="rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:p-5">
                      <h3 class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/40">Review</h3>
                      <p class="mt-2 text-xs sm:text-sm text-white/70">{{ detailGrant.reviewed_by }}</p>
                      <p class="text-xs text-white/40">{{ detailGrant.reviewed_at ? new Date(detailGrant.reviewed_at).toLocaleString() : '' }}</p>
                    </div>
                    <!-- Star voting -->
                    <div class="rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:p-5">
                      <h3 class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/40">Vote (1-8 stars)</h3>
                      <div class="mt-3 flex gap-1">
                        <button v-for="n in 8" :key="n" @click="handleVoteDetail(n)" class="star-btn text-lg sm:text-xl" :class="n <= detailUserVote ? 'active' : ''" :title="n + ' stars'">★</button>
                      </div>
                      <p class="mt-2 text-[11px] text-white/40">Your vote: {{ detailUserVote || 'none' }}/8</p>
                    </div>
                    <div v-if="detailGrant.categories?.length" class="rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:p-5">
                      <h3 class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/40">Categories</h3>
                      <div class="mt-2 flex flex-wrap gap-1.5">
                        <span v-for="cat in detailGrant.categories" :key="cat" class="text-[10px] sm:text-xs px-2 py-1 rounded-md bg-white/5 text-white/60">{{ cat }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="flex justify-end pt-2 border-t border-white/5">
                  <button class="px-4 py-2 rounded-lg bg-white/5 text-xs sm:text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors" @click="closeGrantDetail">Close</button>
                </div>
              </div>
            </div>
          </div>
        </Transition>
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
            <div><h4>CREW GRANTS</h4><p class="footer-stat-value">{{ stats.approved || '—' }}</p><p class="footer-stat-label">FUNDED PROJECTS</p></div>
            <div><h4>OPEN GRANTS</h4><p class="footer-stat-value">{{ scrapedGrantsCount }}</p><p class="footer-stat-label">WORLDWIDE OPPORTUNITIES</p></div>
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
import type { GrantRecord, ScrapedGrant, LeaderboardEntry } from '~/composables/useGrants'

useHead({
  title: 'EG Grants | Earth Guardians',
  meta: [
    { name: 'description', content: 'Earth Guardians Grants — Community Collaborative Open Grants + Project Grants empowering youth-led climate action worldwide.' },
  ],
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@900&family=JetBrains+Mono:wght@300;500;700;800&display=swap' },
  ],
})

const { user, isManager, signIn, signOut } = useSupabaseAuth()
const { listGrants, listScrapedGrants, submitGrant: apiSubmitGrant, reviewGrant: apiReviewGrant, reviewScrapedGrant: apiReviewScraped, getStats, voteGrant, voteScrapedGrant, deleteVote, getLeaderboard } = useGrants()

// Internal grants
const grants = ref<GrantRecord[]>([])
const registry = ref<Array<GrantRecord & { relevante?: boolean }>>([])
const stats = reactive({ pending: 0, approved: 0, rejected: 0, total: 0 })
const loading = ref(true)
const submitting = ref(false)
const submitMsg = ref('')
const submitOk = ref(false)
const activeTab = ref<'pending' | 'approved' | 'rejected'>('pending')
const showHistory = ref(false)

// Scraped (open) grants
const scrapedGrants = ref<ScrapedGrant[]>([])
const scrapedLoading = ref(false)
const scrapedFilter = ref('pending')
const scrapedUserVotes = reactive<Record<string, number>>({})

// Leaderboard
const leaderboard = ref<LeaderboardEntry[]>([])
const leaderboardLoading = ref(false)

interface DetailGrantData {
  id: string
  title: string
  description: string
  status: string
  created_at: string
  location_name?: string
  latitude?: number
  longitude?: number
  source_type?: string
  source_id?: string
  url?: string
  funder?: string
  source?: string
  country?: string
  submitted_by?: string | null
  reviewed_by?: string | null
  reviewed_at?: string | null
  amount_max?: string
  currency?: string
  deadline?: string
  categories?: string[]
  fetched_at?: string
}

// UI state
const activePortalTab = ref('submit')
const showRegistry = ref(false)
const registryLoading = ref(false)
const detailGrant = ref<DetailGrantData | null>(null)
const detailUserVote = ref(0)

const portalTabs = computed(() => {
  const tabs = [
    { key: 'submit', label: '📝 Submit' },
    { key: 'submitted', label: '📋 Submitted' },
    { key: 'open', label: '🌍 Open Grants' },
    { key: 'leaderboard', label: '🏆 Leaderboard' },
  ]
  if (!user.value) return tabs.filter(t => t.key === 'submit')
  return tabs
})

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

const filteredGrants = computed(() => {
  if (!isManager.value) return grants.value
  return grants.value.filter(g => g.status === activeTab.value)
})

const approvedGrantsCount = computed(() => stats.approved)
const pendingGrantsCount = computed(() => stats.pending)
const scrapedGrantsCount = computed(() => scrapedGrants.value.length)
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
  detailGrant.value = null
}

function openGrantDetail(grant: GrantRecord) {
  detailGrant.value = grant
  detailUserVote.value = 0
}

function openLeaderboardDetail(entry: LeaderboardEntry) {
  detailGrant.value = entry
  detailUserVote.value = 0
}

function closeGrantDetail() {
  detailGrant.value = null
  detailUserVote.value = 0
}

function statusClass(status: string) {
  const map: Record<string, string> = {
    pending: 'text-yellow-400 bg-yellow-400/10',
    approved: 'text-green-400 bg-green-400/10',
    rejected: 'text-red-400 bg-red-400/10',
    hidden: 'text-gray-400 bg-gray-400/10',
  }
  return map[status] || 'text-white/50 bg-white/5'
}

async function loadGrants() {
  loading.value = true
  const result = await listGrants()
  grants.value = result.grants ?? []
  loading.value = false
}

async function loadStats() {
  const s = await getStats()
  Object.assign(stats, s)
}

async function loadScrapedGrants() {
  if (!user.value) return
  scrapedLoading.value = true
  const status = scrapedFilter.value === 'all' ? undefined : scrapedFilter.value
  const result = await listScrapedGrants(status)
  scrapedGrants.value = result.grants ?? []
  scrapedLoading.value = false
}

async function loadLeaderboardData() {
  leaderboardLoading.value = true
  const result = await getLeaderboard('all', 'approved')
  leaderboard.value = result.grants ?? []
  leaderboardLoading.value = false
}

async function handleSubmitGrant() {
  submitting.value = true
  submitMsg.value = ''
  const result: { error?: string; grant?: GrantRecord } = await apiSubmitGrant(form)
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

async function handleReview(grantId: string, decision: string) {
  await apiReviewGrant(grantId, decision as 'approved' | 'rejected')
  loadGrants()
  loadStats()
  if (showRegistry.value) loadRegistry()
}

async function handleReviewScraped(grantId: string, decision: 'approved' | 'pending') {
  await apiReviewScraped(grantId, decision)
  loadScrapedGrants()
}

async function handleVoteScraped(scrapedId: string, stars: number) {
  if (!user.value) return
  const current = scrapedUserVotes[scrapedId]
  if (current === stars) {
    await deleteVote('', scrapedId)
    scrapedUserVotes[scrapedId] = 0
  } else {
    await voteScrapedGrant(scrapedId, stars)
    scrapedUserVotes[scrapedId] = stars
  }
  loadLeaderboardData()
}

async function handleVoteDetail(stars: number) {
  if (!user.value || !detailGrant.value) return
  const id = detailGrant.value.id
  const isScraped = detailGrant.value.source_type === 'scraped' || 'source_id' in detailGrant.value
  if (detailUserVote.value === stars) {
    if (isScraped) {
      await deleteVote('', id)
    } else {
      await deleteVote(id)
    }
    detailUserVote.value = 0
  } else {
    if (isScraped) {
      await voteScrapedGrant(id, stars)
    } else {
      await voteGrant(id, stars)
    }
    detailUserVote.value = stars
  }
  loadLeaderboardData()
}

function getStarClass(grantId: string, n: number, isScraped: boolean) {
  const vote = scrapedUserVotes[grantId] || 0
  return n <= vote ? 'active' : ''
}

function getVoteCount(grantId: string, isScraped: boolean) {
  const entry = leaderboard.value.find(e => e.id === grantId)
  return entry?.vote_count || 0
}

function scrollToPortal() {
  document.getElementById('grants-portal')?.scrollIntoView({ behavior: 'smooth' })
}

watch(activeTab, () => loadGrants())
watch(scrapedFilter, () => loadScrapedGrants())
watch(activePortalTab, (tab) => {
  if (tab === 'open') loadScrapedGrants()
  if (tab === 'leaderboard') loadLeaderboardData()
})

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const THREE: any = win.THREE
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

<style scoped>
.top-right-auth {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.auth-avatar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(12px);
  color: white;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.auth-avatar:hover {
  background: rgba(255, 255, 255, 0.1);
}

.auth-avatar.manager {
  border-color: rgba(0, 255, 133, 0.3);
}

.auth-avatar-letter {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.1);
}

.auth-avatar.manager .auth-avatar-letter {
  background: rgba(0, 255, 133, 0.2);
  color: #00ff85;
}

.auth-avatar-email {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: 0.7;
}

.auth-signin {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(12px);
  color: white;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.2s;
}

.auth-signin:hover {
  background: rgba(255, 255, 255, 0.1);
}

.star-voter {
  display: inline-flex;
  align-items: center;
  gap: 0.125rem;
}

.star-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.15);
  transition: all 0.15s;
  padding: 0;
  line-height: 1;
}

.star-btn:hover {
  color: rgba(250, 204, 21, 0.6);
  transform: scale(1.15);
}

.star-btn.active {
  color: #facc15;
  text-shadow: 0 0 8px rgba(250, 204, 21, 0.4);
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.action-btn.restore {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.action-btn.restore:hover {
  background: rgba(59, 130, 246, 0.25);
}

.tab-btn {
  padding: 0.375rem 0.875rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.05);
}

.tab-btn.active {
  color: white;
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

.list-status {
  padding: 1.5rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.875rem;
}

.grant-item {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 1rem;
  margin-bottom: 0.5rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.02);
  transition: all 0.2s;
}

.grant-item:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.1);
}

.grant-item-body {
  flex: 1;
  min-width: 0;
}

.grant-item-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.grant-item-header h4 {
  font-size: 0.9375rem;
  font-weight: 600;
  color: white;
  margin: 0;
}

.grant-desc {
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.6);
  margin: 0.375rem 0 0;
  line-height: 1.4;
}

.grant-location {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.35);
  margin: 0.25rem 0 0;
}

.grant-status {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.grant-status.pending {
  background: rgba(234, 179, 8, 0.15);
  color: #eab308;
}

.grant-status.approved {
  background: rgba(0, 255, 133, 0.1);
  color: #00ff85;
}

.grant-status.rejected {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.grant-category {
  font-size: 0.625rem;
  color: rgba(255, 255, 255, 0.35);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.grant-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.action-btn {
  padding: 0.25rem 0.75rem;
  border-radius: 0.375rem;
  border: none;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.action-btn.approve {
  background: rgba(0, 255, 133, 0.12);
  color: #00ff85;
}

.action-btn.approve:hover {
  background: rgba(0, 255, 133, 0.2);
}

.action-btn.reject {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
}

.action-btn.reject:hover {
  background: rgba(239, 68, 68, 0.2);
}

@media (max-width: 640px) {
  .top-right-auth {
    top: 0.5rem;
    right: 0.5rem;
  }
  .auth-avatar-email {
    display: none;
  }
  .auth-signin span {
    display: none;
  }
}
</style>