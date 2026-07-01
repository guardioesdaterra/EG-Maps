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
    <div class="scroll-indicator">{{ t('grantsPortal.scrollToExplore') }}</div>
    <div class="top-right-auth">
      <div v-if="user" class="relative">
        <button class="auth-avatar" :class="isManager ? 'manager' : ''" @click="showAuthDropdown = !showAuthDropdown" :title="isManager ? t('grantsPortal.manager') + ' — ' + t('grantsPortal.viewDashboard') : t('grantsPortal.crewMember') + ' — ' + t('grantsPortal.viewDashboard')">
          <span class="auth-avatar-letter">{{ isManager ? 'M' : 'C' }}</span>
          <span class="auth-avatar-email">{{ user.email?.split('@')[0] }}</span>
        </button>
        <Transition name="modal-fade">
          <div v-if="showAuthDropdown" class="auth-dropdown" @click.stop>
            <div class="auth-dropdown-header">
              <span class="auth-dropdown-role">{{ isManager ? t('grantsPortal.manager') : t('grantsPortal.crewMember') }}</span>
              <span class="auth-dropdown-email">{{ user.email }}</span>
            </div>
            <hr class="border-white/10 my-1" />
            <button class="auth-dropdown-item auth-dropdown-item--danger" @click="confirmSignOut = true; showAuthDropdown = false">
              Sign out
            </button>
          </div>
        </Transition>
      </div>
      <button v-else class="auth-signin" @click="signIn">
        <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        {{ t('grantsPortal.signInBtn') }}
      </button>
    </div>

    <!-- Click-outside backdrop for auth dropdown -->
    <Transition name="modal-fade">
      <div v-if="showAuthDropdown" class="fixed inset-0 z-[9998]" @click="showAuthDropdown = false" />
    </Transition>

    <!-- Sign-out confirmation dialog -->
    <Transition name="modal-fade">
      <div v-if="confirmSignOut" class="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm" @click.self="confirmSignOut = false">
        <div class="bg-[#111] border border-white/10 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
          <h3 class="text-white font-bold text-sm mb-2">{{ t('grantsPortal.signOutConfirmTitle') }}</h3>
          <p class="text-white/50 text-xs mb-5">{{ t('grantsPortal.signOutConfirmDesc') }}</p>
          <div class="flex gap-2 justify-end">
            <button class="px-3 py-1.5 text-xs font-semibold text-white/60 hover:text-white rounded-lg transition-colors" @click="confirmSignOut = false">{{ t('grantsPortal.cancel') }}</button>
            <button class="px-3 py-1.5 text-xs font-bold bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors" @click="signOut(); confirmSignOut = false">{{ t('grantsPortal.signOut') }}</button>
          </div>
        </div>
      </div>
    </Transition>
    <div id="ui-overlay" class="relative z-10">
      <section id="hero" class="min-h-screen flex flex-col justify-center px-[10%] pointer-events-auto">
        <span class="data-label">{{ t('grantsPortal.heroLabel') }}</span>
        <h1>{{ t('grantsPortal.heroTitle1') }}<br/>{{ t('grantsPortal.heroTitle2') }}</h1>
        <p class="hero-desc" v-html="t('grantsPortal.heroDesc', { strong1: '<strong>', strong2: '</strong>', strong3: '<strong>', strong4: '</strong>', strong5: '<strong>', strong6: '</strong>' })" />
      </section>
      <section id="details" class="min-h-screen flex flex-col justify-center px-[10%] pointer-events-auto">
        <span class="data-label">{{ t('grantsPortal.statsLabel') }}</span>
        <div class="stats-grid">
          <div class="stat-card">
            <span class="data-label">PROJECT GRANTS</span>
            <span class="stat-value">{{ projectStats.total }}</span>
          </div>
          <div class="stat-card">
            <span class="data-label">COUNTRIES</span>
            <span class="stat-value">{{ projectStats.countries }}+</span>
          </div>
          <div class="stat-card">
            <span class="data-label">BENEFICIARIES</span>
            <span class="stat-value">{{ beneficiaryCount }}</span>
          </div>
        </div>
        <div class="mt-8"></div>
        <div class="stats-grid">
          <div class="stat-card">
            <span class="data-label">OPEN</span>
            <span class="stat-value" style="color: var(--stat-open);">{{ scrapedOpenCount }}</span>
          </div>
          <div class="stat-card">
            <span class="data-label">APPROVED</span>
            <span class="stat-value" style="color: var(--stat-approved);">{{ scrapedApprovedCount }}</span>
          </div>
          <div class="stat-card">
            <span class="data-label">CLOSED</span>
            <span class="stat-value" style="color: var(--stat-closed);">{{ scrapedClosedCount }}</span>
          </div>
          <div class="stat-card">
            <span class="data-label">DECLINED</span>
            <span class="stat-value" style="color: var(--stat-declined);">{{ scrapedDeclinedCount }}</span>
          </div>
        </div>
        <div class="mt-6 flex gap-3 flex-wrap items-center">
          <span class="text-[10px] uppercase tracking-widest text-white/30 mr-2">COMMUNITY OPEN GRANTS</span>
          <button class="px-4 py-2 bg-[var(--tool-btn-active-bg)] text-white rounded text-xs font-semibold hover:opacity-90 transition-all" @click="openRegistryModal">{{ t('grantsPortal.viewRegistry') }}</button>
          <NuxtLink to="/project-grants" class="px-4 py-2 border border-white/20 text-white rounded text-xs font-semibold hover:bg-white/10 transition-all">{{ t('grantsPortal.exploreMap') }}</NuxtLink>
        </div>
      </section>
      <section class="join-section" id="join">
        <span class="data-label">{{ t('grantsPortal.twoProgramsLabel') }}</span>
        <h2>{{ t('grantsPortal.howGrantsWork') }}</h2>
        <div class="join-grid">
          <div class="join-card">
            <div class="join-card-content">
              <div class="preview-tooltip">
                <strong>{{ t('grantsPortal.openGrantsTooltipTitle') }}</strong>
                {{ t('grantsPortal.openGrantsTooltipDesc') }}
              </div>
              <h3>{{ t('grantsPortal.openGrantsTitle') }}</h3>
              <p>{{ t('grantsPortal.openGrantsDesc') }}</p>
              <NuxtLink v-if="!user" to="#" @click.prevent="scrollToPortal" class="join-card-btn">
                <span>{{ t('grantsPortal.signInToSubmit') }}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </NuxtLink>
              <NuxtLink v-else to="#" @click.prevent="scrollToPortal" class="join-card-btn">
                <span>{{ t('grantsPortal.submitGrant') }}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </NuxtLink>
            </div>
          </div>
          <div class="join-card">
            <div class="join-card-content">
              <div class="preview-tooltip">
                <strong>{{ t('grantsPortal.projectGrantsTooltipTitle') }}</strong>
                {{ t('grantsPortal.projectGrantsTooltipDesc') }}
              </div>
              <h3>{{ t('grantsPortal.projectGrantsTitle') }}</h3>
              <p>{{ t('grantsPortal.projectGrantsDesc') }}</p>
              <NuxtLink to="/project-grants/3d" class="join-card-btn">
                <span>{{ t('grantsPortal.viewOn3DGlobe') }}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              </NuxtLink>
            </div>
          </div>
          <div class="join-card">
            <div class="join-card-content">
              <div class="preview-tooltip">
                <strong>{{ t('grantsPortal.reviewTooltipTitle') }}</strong>
                {{ t('grantsPortal.reviewTooltipDesc') }}
              </div>
              <h3>{{ t('grantsPortal.reviewTitle') }}</h3>
              <p>{{ t('grantsPortal.reviewDesc') }}</p>
              <NuxtLink to="#" @click.prevent="scrollToPortal" class="join-card-btn">
                <span>{{ t('grantsPortal.viewDashboard') }}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </NuxtLink>
            </div>
          </div>
        </div>
        <div class="contact-info">
          <p class="contact-text" v-html="contactEmailHtml" />
          <p class="contact-text">
            <a href="https://www.earthguardians.org/" target="_blank">{{ t('grantsPortal.visitEarthGuardians') }}</a>
          </p>
        </div>
      </section>
      <section class="projects-section" id="grants-portal">
        <div class="projects-header">
          <span class="data-label">{{ t('grantsPortal.portalLabel') }}</span>
          <h2>{{ t('grantsPortal.portalTitle') }}</h2>
          <p class="projects-subtitle">{{ t('grantsPortal.portalSubtitle') }}</p>
        </div>
        <div class="portal-container">
          <div v-if="!user" class="portal-card signin-card">
            <div class="portal-card-inner">
              <svg class="portal-icon-big" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
              <h3>{{ t('grantsPortal.signInTitle') }}</h3>
              <p>{{ t('grantsPortal.signInDesc') }}</p>
              <div class="flex flex-col gap-2 mt-2">
                <button @click="signIn" class="signin-btn">
                  <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  {{ t('grantsPortal.signInBtn') }}
                </button>
                <a href="https://www.earthguardians.org/" target="_blank" class="text-[11px] text-center text-white/40 hover:text-white/70 transition-colors underline underline-offset-2">Not a member? Join Earth Guardians →</a>
              </div>
            </div>
          </div>
          <div v-else class="portal-card user-card">
            <div class="user-info">
              <div class="user-avatar" :class="isManager ? 'manager' : 'member'">{{ isManager ? 'M' : 'C' }}</div>
              <div>
                <p class="user-role">{{ isManager ? t('grantsPortal.manager') : t('grantsPortal.crewMember') }}</p>
                <p class="user-email">{{ user.email }}</p>
              </div>
            </div>
            <button @click="signOut" class="signout-btn">{{ t('grantsPortal.signOut') }}</button>
          </div>
          <div v-if="user" class="stats-row">
            <div class="stat-mini">
              <span class="stat-mini-value" style="color: var(--stat-open);">{{ scrapedOpenCount }}</span>
              <span class="stat-mini-label">Open</span>
            </div>
            <div class="stat-mini">
              <span class="stat-mini-value" style="color: var(--stat-approved);">{{ scrapedApprovedCount }}</span>
              <span class="stat-mini-label">Approved</span>
            </div>
            <div class="stat-mini">
              <span class="stat-mini-value" style="color: var(--stat-closed);">{{ scrapedClosedCount }}</span>
              <span class="stat-mini-label">Closed</span>
            </div>
            <div class="stat-mini">
              <span class="stat-mini-value" style="color: var(--stat-declined);">{{ scrapedDeclinedCount }}</span>
              <span class="stat-mini-label">Declined</span>
            </div>
            <div class="stat-mini">
              <span class="stat-mini-value" style="color: var(--tectonic-white);">{{ projectStats.total }}</span>
              <span class="stat-mini-label">Projects</span>
            </div>
          </div>
          <div v-if="user" class="tabs-row">
            <button v-for="tab in portalTabs" :key="tab.key" @click="activePortalTab = tab.key" class="tab-btn" :class="activePortalTab === tab.key ? 'active' : ''">{{ t(`grantsPortal.${tab.key}`) }}</button>
          </div>
          <p v-if="!user" class="text-xs text-white/40 text-center mt-3">Sign in with Google to access your dashboard, submit projects, and explore funding opportunities.</p>

          <!-- Tab: Submit / My Grants -->
          <div v-if="activePortalTab === 'tabSubmit'" class="portal-card">
            <h3 class="portal-card-title">{{ t('grantsPortal.submitGrantTitle') }}</h3>
            <form @submit.prevent="handleSubmitGrant" class="grant-form">
              <input v-model="form.title" :placeholder="t('grantsPortal.formTitle')" required class="form-input" />
              <textarea v-model="form.description" :placeholder="t('grantsPortal.formDescription')" required rows="3" class="form-input" />
              <input v-model="form.location_name" :placeholder="t('grantsPortal.formLocation')" required class="form-input" />
              <div class="form-row">
                <input v-model.number="form.latitude" type="number" step="any" :placeholder="t('grantsPortal.formLatitude')" required class="form-input" />
                <input v-model.number="form.longitude" type="number" step="any" :placeholder="t('grantsPortal.formLongitude')" required class="form-input" />
              </div>
              <select v-model="form.category" class="form-input">
                <option value="environment">{{ t('grantsPortal.categoryEnvironment') }}</option>
                <option value="social">{{ t('grantsPortal.categorySocial') }}</option>
                <option value="art">{{ t('grantsPortal.categoryArt') }}</option>
                <option value="education">{{ t('grantsPortal.categoryEducation') }}</option>
                <option value="health">{{ t('grantsPortal.categoryHealth') }}</option>
                <option value="socioenvironmental">{{ t('grantsPortal.categorySocioenvironmental') }}</option>
                <option value="sociocultural">{{ t('grantsPortal.categorySociocultural') }}</option>
                <option value="artistic">{{ t('grantsPortal.categoryArtistic') }}</option>
                <option value="community">{{ t('grantsPortal.categoryCommunity') }}</option>
              </select>
              <button type="submit" :disabled="submitting" class="submit-btn">{{ submitting ? t('grantsPortal.submitting') : t('grantsPortal.submitBtn') }}</button>
              <p v-if="submitMsg" class="submit-msg" :class="submitOk ? 'ok' : 'err'">{{ submitOk ? t('grantsPortal.submittedSuccess') : submitMsg }}</p>
            </form>
          </div>

          <!-- Tab: Submitted Grants (managers can filter by status + see history) -->
          <div v-if="activePortalTab === 'tabSubmitted'" v-show="user">
            <div v-if="isManager" class="flex flex-wrap gap-2 mb-4">
              <button v-for="s in (['pending', 'approved', 'rejected'] as const)" :key="s" @click="activeTab = s" class="tab-btn text-xs px-3 py-1" :class="activeTab === s ? 'active' : ''">{{ t(`grantsPortal.${s}`) }}</button>
              <button @click="showHistory = !showHistory" class="tab-btn text-xs px-3 py-1 ml-auto" :class="showHistory ? 'active' : ''">
                <svg class="inline-block w-3.5 h-3.5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {{ t('grantsPortal.history') }}
              </button>
            </div>
            <div class="grants-list">
              <div v-if="loading" class="list-status">{{ t('grantsPortal.loadingGrants') }}</div>
              <div v-else-if="filteredGrants.length === 0" class="list-status">{{ t('grantsPortal.noGrants') }}</div>
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
                  <button @click="handleReview(String(grant.id), 'approved')" class="action-btn approve">{{ t('grantsPortal.approve') }}</button>
                  <button @click="handleReview(String(grant.id), 'rejected')" class="action-btn reject">{{ t('grantsPortal.reject') }}</button>
                </div>
                <div v-if="isManager && showHistory && grant.status !== 'pending'" class="grant-actions">
                  <button @click="handleReview(String(grant.id), 'pending')" class="action-btn restore">↩ {{ t('grantsPortal.restore') }}</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab: Open (pending) -->
          <div v-if="activePortalTab === 'tabOpen'" v-show="user">
            <div class="portal-card">
              <h3 class="portal-card-title">🌍 Open Grants <span class="text-xs text-white/40 font-normal">({{ scrapedOpenCount }} available)</span></h3>
              <p class="text-sm text-white/60 mb-4">{{ t('grantsPortal.openGrantsDashboardDesc') }}</p>
              <div v-if="scrapedLoading" class="list-status">{{ t('grantsPortal.loadingOpenGrants') }}</div>
              <div v-else-if="filteredScrapedGrants.length === 0" class="list-status">{{ t('grantsPortal.noOpenGrants') }}</div>
              <div v-for="g in filteredScrapedGrants" :key="g.id" class="grant-item">
                <div class="grant-item-body">
                  <div class="grant-item-header">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="grant-type-badge" :class="g.grant_type || 'general'">{{ typeEmoji(g.grant_type) }} {{ g.grant_type || 'general' }}</span>
                      <h4>{{ g.title }}</h4>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0">
                      <span v-if="g.priority_score != null" class="priority-score" :class="priorityClass(g.priority_score)">{{ g.priority_score }}</span>
                      <span class="grant-status pending">OPEN</span>
                    </div>
                  </div>

                  <div v-if="g.highlights?.length" class="flex flex-wrap gap-1.5 mt-2">
                    <span v-for="hl in g.highlights.slice(0, 5)" :key="hl" class="highlight-badge" :class="hl.toLowerCase().replace(/\s+/g, '_')">{{ hl }}</span>
                  </div>

                  <div v-if="g.urgency === 'urgent'" class="mt-1.5 text-[11px] text-red-400 font-semibold flex items-center gap-1">
                    ⚠️ {{ t('grantsPortal.urgencyUrgent') }}
                  </div>
                  <div v-else-if="g.urgency === 'soon'" class="mt-1.5 text-[11px] text-yellow-400 flex items-center gap-1">
                    ⏰ {{ t('grantsPortal.urgencySoon') }}
                  </div>
                  <div v-else-if="g.urgency === 'expired'" class="mt-1.5 text-[11px] text-red-600 flex items-center gap-1">
                    🔴 {{ t('grantsPortal.urgencyExpired') }}
                  </div>

                  <p class="grant-desc text-xs mt-2">{{ g.description?.slice(0, 200) }}{{ g.description?.length > 200 ? '...' : '' }}</p>

                  <div class="flex flex-wrap gap-2 mt-2 text-xs text-white/50">
                    <span v-if="g.funder">🏛 {{ t('grantsPortal.funder') }}: {{ g.funder }}</span>
                    <span v-if="g.country">📍 {{ t('grantsPortal.country') }}: {{ g.country }}</span>
                    <span v-if="g.deadline">📅 {{ t('grantsPortal.deadline') }}: {{ g.deadline }}</span>
                    <span v-if="g.amount_max">💰 {{ t('grantsPortal.amount') }}: {{ g.amount_max }} {{ g.currency }}</span>
                    <span v-if="g.amount_usd != null" class="text-green-400/70">≈ ${{ formatAmount(g.amount_usd) }} USD</span>
                    <span v-if="g.source">📡 {{ t('grantsPortal.source') }}: {{ g.source }}</span>
                  </div>

                  <div v-if="g.categories?.length" class="flex flex-wrap gap-1 mt-2">
                    <span v-for="cat in g.categories.slice(0, 4)" :key="cat" class="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white/70">{{ cat }}</span>
                  </div>

                  <div class="mt-3 flex items-center gap-3">
                    <div class="star-voter">
                      <button v-for="n in 8" :key="n" @click="handleVoteScraped(g.id, n)" class="star-btn" :class="getStarClass(g.id, n, true)" :title="n + ' ' + t('grantsPortal.stars')">★</button>
                      <span class="text-[10px] text-white/40 ml-2">{{ getVoteCount(g.id, true) }} {{ t('grantsPortal.votes') }}</span>
                    </div>
                    <button @click="openScrapedDetail(g)" class="text-[11px] text-blue-400 hover:text-blue-300">{{ t('grantsPortal.details') }}</button>
                    <a :href="g.url" target="_blank" class="text-[11px] text-green-400 hover:text-green-300" rel="noopener">{{ t('grantsPortal.apply') }} ↗</a>
                    <button v-if="isManager" @click="handleReviewScraped(g.id, 'approved')" class="action-btn approve text-[11px] py-0.5">✓ {{ t('grantsPortal.approve') }}</button>
                    <button v-if="isManager" @click="handleReviewScraped(g.id, 'hidden')" class="action-btn reject text-[11px] py-0.5">✗ {{ t('grantsPortal.reject') }}</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab: Approved -->
          <div v-if="activePortalTab === 'tabApproved'" v-show="user">
            <div class="portal-card">
              <h3 class="portal-card-title">✅ Approved Grants <span class="text-xs text-white/40 font-normal">({{ scrapedApprovedCount }} approved)</span></h3>
              <p class="text-sm text-white/60 mb-4">Approved open grant opportunities from worldwide sources.</p>
              <div v-if="scrapedLoading" class="list-status">{{ t('grantsPortal.loadingOpenGrants') }}</div>
              <div v-else-if="filteredScrapedGrants.length === 0" class="list-status">No approved grants yet.</div>
              <div v-for="g in filteredScrapedGrants" :key="g.id" class="grant-item">
                <div class="grant-item-body">
                  <div class="grant-item-header">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="grant-type-badge" :class="g.grant_type || 'general'">{{ typeEmoji(g.grant_type) }} {{ g.grant_type || 'general' }}</span>
                      <h4>{{ g.title }}</h4>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0">
                      <span v-if="g.priority_score != null" class="priority-score" :class="priorityClass(g.priority_score)">{{ g.priority_score }}</span>
                      <span class="grant-status approved">APPROVED</span>
                    </div>
                  </div>

                  <p class="grant-desc text-xs mt-2">{{ g.description?.slice(0, 200) }}{{ g.description?.length > 200 ? '...' : '' }}</p>

                  <div class="flex flex-wrap gap-2 mt-2 text-xs text-white/50">
                    <span v-if="g.funder">🏛 {{ t('grantsPortal.funder') }}: {{ g.funder }}</span>
                    <span v-if="g.country">📍 {{ t('grantsPortal.country') }}: {{ g.country }}</span>
                    <span v-if="g.deadline">📅 {{ t('grantsPortal.deadline') }}: {{ g.deadline }}</span>
                    <span v-if="g.amount_max">💰 {{ t('grantsPortal.amount') }}: {{ g.amount_max }} {{ g.currency }}</span>
                    <span v-if="g.amount_usd != null" class="text-green-400/70">≈ ${{ formatAmount(g.amount_usd) }} USD</span>
                  </div>

                  <div class="mt-3 flex items-center gap-3">
                    <div class="star-voter">
                      <button v-for="n in 8" :key="n" @click="handleVoteScraped(g.id, n)" class="star-btn" :class="getStarClass(g.id, n, true)" :title="n + ' ' + t('grantsPortal.stars')">★</button>
                      <span class="text-[10px] text-white/40 ml-2">{{ getVoteCount(g.id, true) }} {{ t('grantsPortal.votes') }}</span>
                    </div>
                    <button @click="openScrapedDetail(g)" class="text-[11px] text-blue-400 hover:text-blue-300">{{ t('grantsPortal.details') }}</button>
                    <a :href="g.url" target="_blank" class="text-[11px] text-green-400 hover:text-green-300" rel="noopener">{{ t('grantsPortal.apply') }} ↗</a>
                    <button v-if="isManager" @click="handleReviewScraped(g.id, 'pending')" class="action-btn restore text-[11px] py-0.5">↩ {{ t('grantsPortal.restore') }}</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab: Closed -->
          <div v-if="activePortalTab === 'tabClosed'" v-show="user">
            <div class="portal-card">
              <h3 class="portal-card-title">🔒 Closed Grants <span class="text-xs text-white/40 font-normal">({{ scrapedClosedCount }} closed)</span></h3>
              <p class="text-sm text-white/60 mb-4">Grants that have passed their deadline or been closed.</p>
              <div v-if="scrapedLoading" class="list-status">{{ t('grantsPortal.loadingOpenGrants') }}</div>
              <div v-else-if="filteredScrapedGrants.length === 0" class="list-status">No closed grants.</div>
              <div v-for="g in filteredScrapedGrants" :key="g.id" class="grant-item opacity-60">
                <div class="grant-item-body">
                  <div class="grant-item-header">
                    <h4>{{ g.title }}</h4>
                    <span class="grant-status closed">CLOSED</span>
                  </div>
                  <p class="grant-desc text-xs mt-2">{{ g.description?.slice(0, 200) }}{{ g.description?.length > 200 ? '...' : '' }}</p>
                  <div class="flex flex-wrap gap-2 mt-2 text-xs text-white/50">
                    <span v-if="g.funder">🏛 {{ t('grantsPortal.funder') }}: {{ g.funder }}</span>
                    <span v-if="g.country">📍 {{ t('grantsPortal.country') }}: {{ g.country }}</span>
                    <span v-if="g.deadline">📅 {{ t('grantsPortal.deadline') }}: {{ g.deadline }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab: Declined -->
          <div v-if="activePortalTab === 'tabDeclined'" v-show="user">
            <div class="portal-card">
              <h3 class="portal-card-title">🚫 Declined Grants <span class="text-xs text-white/40 font-normal">({{ scrapedDeclinedCount }} declined)</span></h3>
              <p class="text-sm text-white/60 mb-4">Grants that were rejected or hidden by managers.</p>
              <div v-if="scrapedLoading" class="list-status">{{ t('grantsPortal.loadingOpenGrants') }}</div>
              <div v-else-if="filteredScrapedGrants.length === 0" class="list-status">No declined grants.</div>
              <div v-for="g in filteredScrapedGrants" :key="g.id" class="grant-item opacity-50">
                <div class="grant-item-body">
                  <div class="grant-item-header">
                    <h4>{{ g.title }}</h4>
                    <span class="grant-status" :class="g.status === 'rejected' ? 'rejected' : 'hidden'">{{ g.status === 'rejected' ? 'REJECTED' : 'HIDDEN' }}</span>
                  </div>
                  <p class="grant-desc text-xs mt-2">{{ g.description?.slice(0, 200) }}{{ g.description?.length > 200 ? '...' : '' }}</p>
                  <div class="flex flex-wrap gap-2 mt-2 text-xs text-white/50">
                    <span v-if="g.funder">🏛 {{ t('grantsPortal.funder') }}: {{ g.funder }}</span>
                    <span v-if="g.country">📍 {{ t('grantsPortal.country') }}: {{ g.country }}</span>
                    <span v-if="g.deadline">📅 {{ t('grantsPortal.deadline') }}: {{ g.deadline }}</span>
                  </div>
                  <div class="mt-2">
                    <button v-if="isManager" @click="handleReviewScraped(g.id, 'pending')" class="action-btn restore text-[11px] py-0.5">↩ {{ t('grantsPortal.restore') }}</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab: Leaderboard -->
          <div v-if="activePortalTab === 'tabLeaderboard'" v-show="user">
            <div class="portal-card">
              <h3 class="portal-card-title">{{ t('grantsPortal.grantsLeaderboard') }}</h3>
              <p class="text-sm text-white/60 mb-4">{{ t('grantsPortal.leaderboardDesc') }}</p>
              <div v-if="leaderboardLoading" class="list-status">{{ t('grantsPortal.loadingLeaderboard') }}</div>
              <div v-else-if="leaderboard.length === 0" class="list-status">{{ t('grantsPortal.noLeaderboard') }}</div>
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
                    <button @click="openLeaderboardDetail(entry)" class="text-[11px] text-white/60 hover:text-white">{{ t('grantsPortal.details') }}</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Full-screen registry modal -->
      <Teleport to="body">
        <div v-if="showRegistry" class="fixed inset-0 z-[9000] bg-black/90 p-4 overflow-y-auto" role="dialog" aria-modal="true" :aria-label="t('grantsPortal.approvedGrants')">
          <div class="mx-auto max-w-6xl w-full">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-bold text-white">{{ t('grantsPortal.approvedGrants') }}</h2>
              <button class="text-white/70 hover:text-white" :aria-label="t('grantsPortal.close')" @click="closeRegistryModal">{{ t('grantsPortal.close') }}</button>
            </div>
            <div v-if="registryLoading" class="text-white/70">{{ t('grantsPortal.loadingRegistry') }}</div>
            <div v-else-if="!registry.length" class="text-white/70">{{ t('grantsPortal.noApprovedGrants') }}</div>
            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div v-for="grant in registry" :key="String(grant.id)" class="rounded border border-white/10 bg-white/5 p-3 text-white">
                <div class="flex items-start justify-between gap-2">
                  <h3 class="text-sm font-semibold leading-snug">{{ grant.title }}</h3>
                  <span v-if="grant.relevante" class="text-[10px] font-bold uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded">{{ t('grantsPortal.public') }}</span>
                </div>
                <p class="mt-2 text-xs text-white/70 line-clamp-3">{{ grant.description }}</p>
                <div class="mt-3 flex items-center justify-between text-[11px] text-white/60">
                  <span>{{ grant.location_name }}</span>
                  <span>{{ new Date(grant.created_at).toLocaleDateString() }}</span>
                </div>
                <button class="mt-3 w-full rounded bg-white/10 py-2 text-xs font-semibold text-white hover:bg-white/20" @click="openGrantDetail(grant)">{{ t('grantsPortal.viewDetails') }}</button>
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
                      <h3 class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/40">{{ t('grantsPortal.descDescription') }}</h3>
                      <p class="mt-2 sm:mt-3 text-xs sm:text-sm leading-relaxed text-white/80">{{ detailGrant.description }}</p>
                    </div>
                    <div class="rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:p-5">
                      <h3 class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/40">{{ t('grantsPortal.descStatus') }}</h3>
                      <span class="mt-2 inline-block px-3 py-1 rounded-full text-xs font-medium capitalize" :class="statusClass(detailGrant.status)">{{ t(`grantsPortal.${detailGrant.status === 'pending' ? 'open' : detailGrant.status}`) }}</span>
                    </div>
                    <div v-if="detailGrant.location_name || (detailGrant.latitude != null)" class="rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:p-5">
                      <h3 class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/40">{{ t('grantsPortal.descLocation') }}</h3>
                      <p class="mt-2 text-xs sm:text-sm text-white/70">{{ detailGrant.location_name || '' }}{{ detailGrant.latitude != null ? ` (${detailGrant.latitude}, ${detailGrant.longitude})` : '' }}</p>
                    </div>
                    <div v-if="detailGrant.source_type === 'scraped' && detailGrant.url" class="rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:p-5">
                      <h3 class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/40">{{ t('grantsPortal.descApply') }}</h3>
                      <a :href="detailGrant.url" target="_blank" rel="noopener" class="mt-2 inline-flex items-center gap-2 text-xs sm:text-sm text-green-400 hover:text-green-300">{{ t('grantsPortal.visitSource') }} ↗</a>
                    </div>
                  </div>
                  <!-- Sidebar -->
                  <div class="space-y-4">
                    <!-- Priority + Type -->
                    <div class="rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:p-5">
                      <div class="flex items-center justify-between">
                        <h3 class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/40">{{ t('grantsPortal.descPriority') }}</h3>
                        <span v-if="detailGrant.priority_score != null" class="priority-score text-sm" :class="priorityClass(detailGrant.priority_score)">{{ detailGrant.priority_score }}</span>
                      </div>
                      <div v-if="detailGrant.grant_type" class="mt-2">
                        <span class="grant-type-badge text-xs" :class="detailGrant.grant_type">{{ typeEmoji(detailGrant.grant_type) }} {{ detailGrant.grant_type }}</span>
                      </div>
                      <div v-if="detailGrant.relevance != null" class="mt-1 text-[11px] text-white/40">{{ t('grantsPortal.relevance', { score: detailGrant.relevance }) }}</div>
                    </div>

                    <!-- Highlights -->
                    <div v-if="detailGrant.highlights?.length" class="rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:p-5">
                      <h3 class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/40">{{ t('grantsPortal.descHighlights') }}</h3>
                      <div class="mt-2 flex flex-wrap gap-1.5">
                        <span v-for="hl in detailGrant.highlights" :key="hl" class="highlight-badge" :class="hl.toLowerCase().replace(/\s+/g, '_')">{{ hl }}</span>
                      </div>
                    </div>

                    <!-- Urgency -->
                    <div v-if="detailGrant.urgency && detailGrant.urgency !== 'unknown'" class="rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:p-5">
                      <h3 class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/40">{{ t('grantsPortal.descDeadline') }}</h3>
                      <div v-if="detailGrant.urgency === 'urgent'" class="mt-2 text-xs text-red-400 font-semibold">⚠️ {{ t('grantsPortal.urgencyUrgent') }}</div>
                      <div v-else-if="detailGrant.urgency === 'soon'" class="mt-2 text-xs text-yellow-400">⏰ {{ t('grantsPortal.urgencySoon') }}</div>
                      <div v-else-if="detailGrant.urgency === 'expired'" class="mt-2 text-xs text-red-600">🔴 {{ t('grantsPortal.urgencyExpired') }}</div>
                      <div v-if="detailGrant.deadline_days != null" class="mt-1 text-[11px] text-white/40">{{ detailGrant.deadline_days >= 0 ? `${detailGrant.deadline_days} days remaining` : `${Math.abs(detailGrant.deadline_days)} days ago` }}</div>
                    </div>

                    <!-- Funding -->
                    <div class="rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:p-5">
                      <h3 class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/40">{{ t('grantsPortal.descFunding') }}</h3>
                      <p class="mt-2 text-xs sm:text-sm text-white/70">{{ detailGrant.amount_max ? `${detailGrant.amount_max} ${detailGrant.currency || ''}` : t('grantsPortal.notSpecified') }}</p>
                      <p v-if="detailGrant.amount_usd != null" class="mt-1 text-[11px] text-green-400/70">≈ ${{ formatAmount(detailGrant.amount_usd) }} USD</p>
                      <p v-if="detailGrant.deadline" class="mt-1 text-xs text-white/50">Deadline: {{ detailGrant.deadline }}</p>
                    </div>

                    <div v-if="detailGrant.funder || detailGrant.source" class="rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:p-5">
                      <h3 class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/40">{{ t('grantsPortal.descSource') }}</h3>
                      <p class="mt-2 text-xs sm:text-sm text-white/70">{{ detailGrant.funder || detailGrant.source }}</p>
                    </div>
                    <div v-if="detailGrant.submitted_by" class="rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:p-5">
                      <h3 class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/40">{{ t('grantsPortal.submittedBy') }}</h3>
                      <p class="mt-2 text-xs sm:text-sm text-white/70">{{ detailGrant.submitted_by }}</p>
                    </div>
                    <div v-if="detailGrant.reviewed_by" class="rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:p-5">
                      <h3 class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/40">{{ t('grantsPortal.review') }}</h3>
                      <p class="mt-2 text-xs sm:text-sm text-white/70">{{ detailGrant.reviewed_by }}</p>
                      <p class="text-xs text-white/40">{{ detailGrant.reviewed_at ? new Date(detailGrant.reviewed_at).toLocaleString() : '' }}</p>
                    </div>
                    <!-- Star voting -->
                    <div class="rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:p-5">
                      <h3 class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/40">{{ t('grantsPortal.voteLabel') }}</h3>
                      <div class="mt-3 flex gap-1">
                        <button v-for="n in 8" :key="n" @click="handleVoteDetail(n)" class="star-btn text-lg sm:text-xl" :class="n <= detailUserVote ? 'active' : ''" :title="n + ' ' + t('grantsPortal.stars')">★</button>
                      </div>
                      <p class="mt-2 text-[11px] text-white/40">{{ t('grantsPortal.yourVote', { count: detailUserVote || t('grantsPortal.noVotes') }) }}</p>
                    </div>
                    <div v-if="detailGrant.categories?.length" class="rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:p-5">
                      <h3 class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/40">{{ t('grantsPortal.categories') }}</h3>
                      <div class="mt-2 flex flex-wrap gap-1.5">
                        <span v-for="cat in detailGrant.categories" :key="cat" class="text-[10px] sm:text-xs px-2 py-1 rounded-md bg-white/5 text-white/60">{{ cat }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="flex justify-end pt-2 border-t border-white/5">
                  <button class="px-4 py-2 rounded-lg bg-white/5 text-xs sm:text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors" @click="closeGrantDetail">{{ t('grantsPortal.close') }}</button>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>

      <!-- Edit scraped grant modal -->
      <Teleport to="body">
        <Transition name="modal-fade">
          <div v-if="editGrant" class="fixed inset-0 z-[9200] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Edit grant">
            <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" @click="closeEditScraped" />
            <div class="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0c0c0e] shadow-2xl">
              <div class="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-white/5 bg-[#0c0c0e]/95 backdrop-blur-sm">
                <div class="min-w-0 flex-1 mr-3">
                  <h2 class="text-sm font-bold text-white truncate">{{ editForm.title || t('grantsPortal.editGrant') }}</h2>
                  <p class="text-[10px] text-white/40 truncate mt-0.5">{{ editGrant?.source || editGrant?.id }}</p>
                </div>
                <button class="rounded-full p-1.5 text-white/50 hover:text-white hover:bg-white/10 transition-colors" aria-label="Close" @click="closeEditScraped">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div class="p-4 space-y-3">
                <label class="edit-field">
                  <span>Title</span>
                  <input v-model="editForm.title" class="edit-input" />
                </label>
                <label class="edit-field">
                  <span>Funder</span>
                  <input v-model="editForm.funder" class="edit-input" />
                </label>
                <label class="edit-field">
                  <span>Description</span>
                  <textarea v-model="editForm.description" rows="3" class="edit-input" />
                </label>
                <label class="edit-field">
                  <span>Deadline</span>
                  <input v-model="editForm.deadline" placeholder="e.g. 2026-12-31" class="edit-input" />
                </label>
                <div class="grid grid-cols-3 gap-2">
                  <label class="edit-field">
                    <span>Amount Max</span>
                    <input v-model="editForm.amount_max" class="edit-input" />
                  </label>
                  <label class="edit-field">
                    <span>Amount Min</span>
                    <input v-model="editForm.amount_min" class="edit-input" />
                  </label>
                  <label class="edit-field">
                    <span>Currency</span>
                    <input v-model="editForm.currency" placeholder="USD" class="edit-input" />
                  </label>
                </div>
                <label class="edit-field">
                  <span>Country</span>
                  <input v-model="editForm.country" class="edit-input" />
                </label>
                <label class="edit-field">
                  <span>URL</span>
                  <input v-model="editForm.url" class="edit-input" />
                </label>
                <label class="edit-field">
                  <span>Categories (comma-separated)</span>
                  <input v-model="editForm.categories" placeholder="e.g. environment, climate, youth" class="edit-input" />
                </label>
                <div v-if="editErr" class="text-[11px] text-red-400">{{ editErr }}</div>
                <div class="flex justify-end gap-2 pt-2">
                  <button class="px-3 py-1.5 rounded-lg bg-white/5 text-xs text-white/70 hover:bg-white/10 transition-colors" @click="closeEditScraped">{{ t('grantsPortal.cancel') }}</button>
                  <button class="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-semibold hover:bg-blue-500/30 transition-colors" :disabled="editSaving" @click="handleSaveEdit">
                    {{ editSaving ? t('grantsPortal.saving') : t('grantsPortal.saveChanges') }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>

      <section id="footer" class="footer-section">
        <div class="footer-glow" />
        <div class="footer-content">
          <span class="data-label">{{ t('grantsPortal.footerLabel') }}</span>
          <h1 class="footer-title">{{ t('grantsPortal.footerTitle1') }}<br/>{{ t('grantsPortal.footerTitle2') }}</h1>
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
            <div><h4>{{ t('grantsPortal.since') }}</h4><p class="footer-stat-value">2014</p><p class="footer-stat-label">{{ t('grantsPortal.overADecade') }}</p></div>
            <div><h4>PROJECT GRANTS</h4><p class="footer-stat-value">{{ projectStats.total }}</p><p class="footer-stat-label">{{ t('grantsPortal.fundedProjects') }}</p></div>
            <div><h4>OPEN GRANTS</h4><p class="footer-stat-value">{{ scrapedOpenCount + scrapedApprovedCount + scrapedClosedCount + scrapedDeclinedCount }}</p><p class="footer-stat-label">{{ t('grantsPortal.worldwideOpportunities') }}</p></div>
            <div><h4>{{ t('grantsPortal.countries') }}</h4><p class="footer-stat-value">{{ countryCount }}</p><p class="footer-stat-label">{{ t('grantsPortal.globalReach') }}</p></div>
          </div>
          <div class="tectonic-line" />
          <p class="footer-copy">{{ t('grantsPortal.footerCopyright') }}</p>
          <p class="footer-copy footer-copy-dim">
            <span>{{ t('grantsPortal.builtForPurpose') }}</span>
          </p>
          <div class="mt-6 flex items-center justify-center gap-6 text-[10px] text-white/25">
            <span>PO Box 1561 Laurel, MD 20725</span>
            <span>Tax ID/EIN: 84-1397083</span>
            <a href="https://www.earthguardians.org/privacy-policy" target="_blank" class="hover:text-white/50 transition-colors underline underline-offset-2">Privacy Policy</a>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import type { GrantRecord, ScrapedGrant, LeaderboardEntry } from '~/composables/useGrants'
import { allProjectsData } from '~/lib/project-data'
import type { ProjectData } from '~/lib/types'

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

const { t } = useI18n()
const { user, isManager, signIn, signOut } = useSupabaseAuth()
const showAuthDropdown = ref(false)
const confirmSignOut = ref(false)
const { listGrants, listScrapedGrants, submitGrant: apiSubmitGrant, reviewGrant: apiReviewGrant, reviewScrapedGrant: apiReviewScraped, updateScrapedGrant: apiUpdateScrapedGrant, getStats, voteGrant, voteScrapedGrant, deleteVote, getLeaderboard } = useGrants()

// Internal grants
const grants = ref<GrantRecord[]>([])
const registry = ref<Array<GrantRecord & { relevante?: boolean }>>([])
const stats = reactive({ pending: 0, approved: 0, rejected: 0, total: 0 })
const loading = ref(true)

// Static project data fallback
const projectStats = computed(() => {
  const countries = new Set(allProjectsData.map(p => p.country_province.split(',').pop()?.trim()).filter(Boolean))
  const direct = allProjectsData.reduce((s, p) => s + (p.direct_beneficiaries || 0), 0)
  const indirect = allProjectsData.reduce((s, p) => s + (p.indirect_beneficiaries || 0), 0)
  return { total: allProjectsData.length, countries: countries.size, beneficiaries: direct + indirect }
})
const submitting = ref(false)
const submitMsg = ref('')
const submitOk = ref(false)
const activeTab = ref<'pending' | 'approved' | 'rejected'>('pending')
const showHistory = ref(false)

// Scraped (open) grants
const scrapedGrants = ref<ScrapedGrant[]>([])
const scrapedLoading = ref(false)
const scrapedUserVotes = reactive<Record<string, number>>({})

const filteredScrapedGrants = computed(() => {
  const tab = activePortalTab.value
  if (tab === 'tabOpen') return scrapedGrants.value.filter(g => g.status === 'pending')
  if (tab === 'tabApproved') return scrapedGrants.value.filter(g => g.status === 'approved')
  if (tab === 'tabClosed') return scrapedGrants.value.filter(g => g.status === 'closed')
  if (tab === 'tabDeclined') return scrapedGrants.value.filter(g => g.status === 'rejected' || g.status === 'hidden')
  return scrapedGrants.value
})

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
  // Enhanced fields from scraper v2
  grant_type?: string
  grant_types?: string[]
  highlights?: string[]
  urgency?: string
  deadline_days?: number | null
  amount_usd?: number | null
  priority_score?: number
  relevance?: number
}

// Edit state
const editGrant = ref<ScrapedGrant | null>(null)
const editSaving = ref(false)
const editForm = reactive({
  title: '',
  funder: '',
  description: '',
  deadline: '',
  amount_max: '',
  amount_min: '',
  currency: '',
  country: '',
  url: '',
  categories: '',
})

// UI state
const activePortalTab = ref('tabSubmit')
const showRegistry = ref(false)
const registryLoading = ref(false)
const detailGrant = ref<DetailGrantData | null>(null)
const detailUserVote = ref(0)

const portalTabs = computed(() => {
  const tabs = [
    { key: 'tabSubmit', label: '📝 Submit' },
    { key: 'tabOpen', label: '🌍 Open' },
    { key: 'tabApproved', label: '✅ Approved' },
    { key: 'tabClosed', label: '🔒 Closed' },
    { key: 'tabDeclined', label: '🚫 Declined' },
    { key: 'tabLeaderboard', label: '🏆 Leaderboard' },
  ]
  if (isManager.value) {
    tabs.splice(1, 0, { key: 'tabSubmitted', label: '📋 Submitted' })
  }
  if (!user.value) return tabs.filter(t => t.key === 'tabSubmit')
  return tabs
})

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

const scrapedOpenCount = computed(() => scrapedGrants.value.filter(g => g.status === 'pending').length)
const scrapedApprovedCount = computed(() => scrapedGrants.value.filter(g => g.status === 'approved').length)
const scrapedClosedCount = computed(() => scrapedGrants.value.filter(g => g.status === 'closed').length)
const scrapedDeclinedCount = computed(() => scrapedGrants.value.filter(g => g.status === 'rejected' || g.status === 'hidden').length)
const approvedGrantsCount = computed(() => Math.max(stats.approved, projectStats.value.total))
const pendingGrantsCount = computed(() => stats.pending)
const scrapedGrantsCount = computed(() => Math.max(scrapedGrants.value.length, projectStats.value.total))
const beneficiaryCount = computed(() => {
  const b = projectStats.value.beneficiaries
  if (b >= 1000000) return (b / 1000000).toFixed(1) + 'M+'
  if (b >= 1000) return (b / 1000).toFixed(0) + 'K+'
  return b + '+'
})
const countryCount = computed(() => Math.max(stats.approved > 0 ? 47 : 0, projectStats.value.countries) + '+')

const contactEmailHtml = computed(() => {
  const emailLink = '<a href="mailto:GRANTS@EARTHGUARDIANS.ORG">GRANTS@EARTHGUARDIANS.ORG</a>'
  return t('grantsPortal.contactLabel', { email: emailLink })
})

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

function typeEmoji(type?: string): string {
  const map: Record<string, string> = {
    artivism: '🎨',
    climate_justice: '🌍',
    conservation: '🌿',
    human_rights: '⚖️',
    indigenous_rights: '🏹',
    youth: '🌟',
  }
  return map[type || ''] || '📋'
}

function priorityClass(score: number): string {
  if (score >= 60) return 'high'
  if (score >= 30) return 'mid'
  return 'low'
}

function formatAmount(val: number): string {
  if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M'
  if (val >= 1000) return (val / 1000).toFixed(val >= 10000 ? 0 : 1) + 'K'
  return val.toFixed(0)
}

function openScrapedDetail(g: ScrapedGrant) {
  detailGrant.value = {
    id: g.id,
    title: g.title,
    description: g.description,
    status: g.status,
    created_at: g.fetched_at || g.created_at,
    source_type: 'scraped',
    source_id: g.id,
    url: g.url,
    funder: g.funder,
    source: g.source,
    country: g.country,
    amount_max: g.amount_max,
    currency: g.currency,
    deadline: g.deadline,
    categories: g.categories,
    fetched_at: g.fetched_at,
    grant_type: g.grant_type,
    grant_types: g.grant_types,
    highlights: g.highlights,
    urgency: g.urgency,
    deadline_days: g.deadline_days,
    amount_usd: g.amount_usd,
    priority_score: g.priority_score,
    relevance: g.relevance,
  }
}

async function loadGrants() {
  loading.value = true
  const result = await listGrants()
  grants.value = result.grants ?? []
  loading.value = false
}

async function loadStats() {
  const s = await getStats()
  if (s.total > 0) {
    Object.assign(stats, s)
  } else {
    Object.assign(stats, { pending: 0, approved: projectStats.value.total, rejected: 0, total: projectStats.value.total })
  }
}

function projectToScrapedGrant(p: ProjectData, i: number): ScrapedGrant {
  return {
    id: `project-${i}`,
    source_id: `project-${i}`,
    title: p.project_title,
    funder: 'Earth Guardians',
    source: 'project-grants',
    url: '',
    description: `Project in ${p.country_province} with ${p.direct_beneficiaries} direct and ${p.indirect_beneficiaries} indirect beneficiaries.`,
    deadline: '',
    amount_max: '',
    amount_min: '',
    currency: '',
    country: p.country_province.split(',').pop()?.trim() || p.country_province,
    region: p.country_province,
    categories: ['environment', 'community'],
    language: 'en',
    status: 'approved',
    fetched_at: new Date().toISOString(),
    created_at: new Date('2024-01-01').toISOString(),
    grant_type: 'conservation',
    highlights: ['eg_core', 'high_value'],
    urgency: 'unknown',
    amount_usd: null,
    priority_score: 50,
  }
}

async function loadScrapedGrants() {
  scrapedLoading.value = true
  if (user.value) {
    const result = await listScrapedGrants()
    scrapedGrants.value = result.grants ?? []
  }
  if (scrapedGrants.value.length === 0) {
    scrapedGrants.value = allProjectsData.map(projectToScrapedGrant)
  }
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

async function handleReviewScraped(grantId: string, decision: 'approved' | 'rejected' | 'hidden' | 'pending') {
  await apiReviewScraped(grantId, decision)
  loadScrapedGrants()
}

const editErr = ref('')

function openEditScraped(g: ScrapedGrant) {
  editGrant.value = g
  editForm.title = g.title || ''
  editForm.funder = g.funder || ''
  editForm.description = g.description || ''
  editForm.deadline = g.deadline || ''
  editForm.amount_max = g.amount_max || ''
  editForm.amount_min = g.amount_min || ''
  editForm.currency = g.currency || ''
  editForm.country = g.country || ''
  editForm.url = g.url || ''
  editForm.categories = (g.categories || []).join(', ')
  editErr.value = ''
}

function closeEditScraped() {
  editGrant.value = null
  editErr.value = ''
}

async function handleSaveEdit() {
  if (!editGrant.value) return
  editSaving.value = true
  editErr.value = ''
  const updates: Record<string, unknown> = {
    title: editForm.title,
    funder: editForm.funder,
    description: editForm.description,
    deadline: editForm.deadline,
    amount_max: editForm.amount_max,
    amount_min: editForm.amount_min,
    currency: editForm.currency,
    country: editForm.country,
    url: editForm.url,
    categories: editForm.categories.split(',').map(c => c.trim()).filter(Boolean),
  }
  const result = await apiUpdateScrapedGrant(editGrant.value.id, updates)
  editSaving.value = false
  if ('error' in result && result.error) {
    editErr.value = result.error as string
    return
  }
  closeEditScraped()
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
watch(activePortalTab, (tab) => {
  if (['tabOpen', 'tabApproved', 'tabClosed', 'tabDeclined'].includes(tab)) loadScrapedGrants()
  if (tab === 'tabLeaderboard') loadLeaderboardData()
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
div {
  --obsidian: #08080a;
  --tectonic-white: #f0f0f0;
  --glass: rgba(255, 255, 255, 0.03);
  --border: rgba(255, 255, 255, 0.1);
  --accent: #00ff85;
  --stat-open: #eab308;
  --stat-approved: var(--accent);
  --stat-closed: rgba(255, 255, 255, 0.4);
  --stat-declined: #ef4444;
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
.join-section h2 {
  margin-top: 1rem;
  text-align: center;
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
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
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

.portal-card-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--tectonic-white);
  font-family: 'JetBrains Mono', monospace;
  margin-bottom: 1.5rem;
}

/* Tabs row */
.tabs-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-bottom: 1.5rem;
}

/* Grant items */
.grant-item {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 1rem;
  transition: border-color 0.2s;
}
.grant-item:hover {
  border-color: rgba(255, 255, 255, 0.12);
}

.grant-item-body {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.grant-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.grant-item-header h4 {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--tectonic-white);
  margin: 0;
}

.grant-desc {
  font-size: 0.78rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.55);
}

.grant-location {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.35);
  font-family: 'JetBrains Mono', monospace;
}

.grant-category {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.5);
}

.grant-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.list-status {
  text-align: center;
  padding: 2rem 1rem;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.4);
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
.footer-copy-dim {
  color: rgba(255, 255, 255, 0.3);
  font-size: 0.6rem;
  letter-spacing: 0.15em;
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

/* Auth overlay (new) */
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

/* Star voter (new) */
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

/* Modal transitions (new) */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
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

.auth-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 200px;
  background: rgba(17, 17, 17, 0.95);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 6px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  z-index: 10001;
}

.auth-dropdown-header {
  padding: 8px 10px;
}

.auth-dropdown-role {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  color: white;
}

.auth-dropdown-email {
  display: block;
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.auth-dropdown-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  background: none;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.auth-dropdown-item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: white;
}

.auth-dropdown-item--danger {
  color: #ef4444;
}

.auth-dropdown-item--danger:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #f87171;
}

/* ── Grant type badge ─────────────────────────────────── */
.grant-type-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 1px 8px;
  border-radius: 9999px;
  font-size: 0.65rem;
  font-weight: 600;
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.grant-type-badge.artivism        { background: rgba(168, 85, 247, 0.15); color: #c084fc; }
.grant-type-badge.climate_justice  { background: rgba(34, 197, 94, 0.15); color: #4ade80; }
.grant-type-badge.conservation     { background: rgba(34, 197, 94, 0.15); color: #4ade80; }
.grant-type-badge.human_rights     { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
.grant-type-badge.indigenous_rights { background: rgba(234, 179, 8, 0.15); color: #facc15; }
.grant-type-badge.youth            { background: rgba(236, 72, 153, 0.15); color: #f472b6; }
.grant-type-badge.general          { background: rgba(255, 255, 255, 0.08); color: rgba(255,255,255,0.6); }

/* ── Grant status badge ───────────────────────────────── */
.grant-status {
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  border-radius: 9999px;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}
.grant-status.pending    { background: rgba(234, 179, 8, 0.12); color: #eab308; }
.grant-status.approved   { background: rgba(0, 200, 83, 0.12); color: #00c853; }
.grant-status.rejected   { background: rgba(239, 68, 68, 0.12); color: #ef4444; }
.grant-status.hidden     { background: rgba(255, 255, 255, 0.05); color: rgba(255,255,255,0.4); }
.grant-status.closed     { background: rgba(255, 255, 255, 0.05); color: rgba(255,255,255,0.4); }

/* ── Highlight badge ──────────────────────────────────── */
.highlight-badge {
  display: inline-block;
  padding: 0 6px;
  border-radius: 4px;
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.highlight-badge.eg_core       { background: rgba(0, 255, 133, 0.15); color: #00ff85; }
.highlight-badge.urgent        { background: rgba(239, 68, 68, 0.2);  color: #f87171; }
.highlight-badge.soon          { background: rgba(234, 179, 8, 0.2);  color: #facc15; }
.highlight-badge.expired       { background: rgba(239, 68, 68, 0.1);  color: #ef4444; opacity: 0.6; }
.highlight-badge.high_value    { background: rgba(34, 197, 94, 0.2);  color: #4ade80; }
.highlight-badge.good_value    { background: rgba(34, 197, 94, 0.12); color: #4ade80; }
.highlight-badge.has_amount    { background: rgba(34, 197, 94, 0.08); color: #86efac; }
.highlight-badge.artivism      { background: rgba(168, 85, 247, 0.15); color: #c084fc; }
.highlight-badge.climate       { background: rgba(34, 197, 94, 0.15); color: #4ade80; }
.highlight-badge.indigenous    { background: rgba(234, 179, 8, 0.15); color: #facc15; }
.highlight-badge.scholarship   { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
.highlight-badge.open          { background: rgba(34, 197, 94, 0.1);  color: #4ade80; }
.highlight-badge.closed        { background: rgba(255, 255, 255, 0.05); color: rgba(255,255,255,0.4); }

/* ── Tab buttons ───────────────────────────────────────── */
.tab-btn {
  border: none;
  cursor: pointer;
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255,255,255,0.5);
  background: transparent;
  transition: all 0.15s;
}
.tab-btn:hover {
  color: rgba(255,255,255,0.8);
  background: rgba(255,255,255,0.06);
}
.tab-btn.active {
  color: #fff;
  background: rgba(255,255,255,0.1);
}

/* ── Priority score ───────────────────────────────────── */
.priority-score {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  height: 1.5rem;
  border-radius: 9999px;
  font-weight: 700;
  font-size: 0.7rem;
  padding: 0 6px;
}
.priority-score.high { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
.priority-score.mid  { background: rgba(234, 179, 8, 0.2); color: #facc15; }
.priority-score.low  { background: rgba(255, 255, 255, 0.06); color: rgba(255,255,255,0.5); }

/* ── Edit modal ────────────────────────────────────────── */
.edit-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.edit-field > span {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255,255,255,0.4);
}
.edit-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 6px;
  color: #f0f0f0;
  font-size: 0.8rem;
  outline: none;
  transition: border-color 0.2s;
}
.edit-input:focus {
  border-color: rgba(0,255,133,0.4);
}
.edit-input::placeholder {
  color: rgba(255,255,255,0.2);
}
textarea.edit-input {
  resize: vertical;
  font-family: inherit;
}

/* ── Action button variants ────────────────────────────── */
.action-btn {
  border: none;
  cursor: pointer;
  border-radius: 6px;
  font-weight: 600;
  transition: all 0.15s;
}
.action-btn.approve {
  background: rgba(0, 200, 83, 0.15);
  color: #00c853;
}
.action-btn.approve:hover {
  background: rgba(0, 200, 83, 0.25);
}
.action-btn.reject {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}
.action-btn.reject:hover {
  background: rgba(239, 68, 68, 0.25);
}
.action-btn.restore {
  background: rgba(250, 204, 21, 0.15);
  color: #facc15;
}
.action-btn.restore:hover {
  background: rgba(250, 204, 21, 0.25);
}
.action-btn.edit {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
}
.action-btn.edit:hover {
  background: rgba(59, 130, 246, 0.25);
}
</style>
