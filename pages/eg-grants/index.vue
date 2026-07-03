<template>
  <div class="grants-portal relative min-h-screen overflow-hidden bg-[#08080a]">
    <canvas ref="globeCanvas" class="fixed inset-0 pointer-events-none" :style="{ zIndex: 'var(--z-canvas)' }" />
    <DotField
      class="absolute inset-0"
      :style="{ zIndex: 'var(--z-dots)' }"
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
    <GrantsAuth :user="user" :is-manager="isManager" @sign-in="signIn" @sign-out="handleSignOut" />

    <!-- Sign-out confirmation dialog -->
    <Transition name="modal-fade">
      <div v-if="confirmSignOut" class="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm" :style="{ zIndex: 'var(--z-confirm)' }" @click.self="confirmSignOut = false">
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
    <div id="ui-overlay" class="relative" :style="{ zIndex: 'var(--z-ui)' }">
      <section id="hero" class="min-h-screen flex flex-col justify-center px-[10%] pointer-events-auto">
        <span class="data-label">{{ t('grantsPortal.heroLabel') }}</span>
        <h1>{{ t('grantsPortal.heroTitle1') }}<br/>{{ t('grantsPortal.heroTitle2') }}</h1>
        <p class="hero-desc" v-html="t('grantsPortal.heroDesc', { strong1: '<strong>', strong2: '</strong>', strong3: '<strong>', strong4: '</strong>', strong5: '<strong>', strong6: '</strong>' })" />
      </section>
      <section id="details" class="min-h-screen flex flex-col justify-center px-[10%] pointer-events-auto">
        <span class="data-label">{{ t('grantsPortal.statsLabel') }}</span>
        <div class="stats-grid">
          <div class="stat-card">
            <span class="data-label">{{ t('grantsPortal.projectGrantsStat') }}</span>
            <span class="stat-value">{{ projectStats.total }}</span>
          </div>
          <div class="stat-card">
            <span class="data-label">{{ t('grantsPortal.countriesStat') }}</span>
            <span class="stat-value">{{ projectStats.countries }}+</span>
          </div>
          <div class="stat-card">
            <span class="data-label">{{ t('grantsPortal.beneficiariesStat') }}</span>
            <span class="stat-value">{{ beneficiaryCount }}</span>
          </div>
        </div>
        <div class="stats-grid mt-8">
          <div class="stat-card">
            <span class="data-label">{{ t('grantsPortal.openStat') }}</span>
            <span class="stat-value" style="color: var(--stat-open);">{{ scrapedOpenCount }}</span>
          </div>
          <div class="stat-card">
            <span class="data-label">{{ t('grantsPortal.approvedStat') }}</span>
            <span class="stat-value" style="color: var(--stat-approved);">{{ scrapedApprovedCount }}</span>
          </div>
          <div class="stat-card">
            <span class="data-label">{{ t('grantsPortal.closedStat') }}</span>
            <span class="stat-value" style="color: var(--stat-closed);">{{ scrapedClosedCount }}</span>
          </div>
          <div class="stat-card">
            <span class="data-label">{{ t('grantsPortal.declinedStat') }}</span>
            <span class="stat-value" style="color: var(--stat-declined);">{{ scrapedDeclinedCount }}</span>
          </div>
        </div>
        <div class="mt-6 flex gap-3 flex-wrap items-center">
          <span class="text-[10px] uppercase tracking-widest text-white/30 mr-2">{{ t('grantsPortal.communityOpenGrants') }}</span>
          <button class="px-4 py-2 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-500 transition-all" @click="openRegistryModal">{{ t('grantsPortal.viewRegistry') }}</button>
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
              <NuxtLink to="#" @click.prevent="scrollToPortal" class="join-card-btn">
                <span>{{ user ? t('grantsPortal.submitGrant') : t('grantsPortal.signInToSubmit') }}</span>
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
                <a href="https://www.earthguardians.org/" target="_blank" class="text-[11px] text-center text-white/40 hover:text-white/70 transition-colors underline underline-offset-2">{{ t('grantsPortal.notMemberJoin') }}</a>
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
              <span class="stat-mini-label">{{ t('grantsPortal.statOpen') }}</span>
            </div>
            <div class="stat-mini">
              <span class="stat-mini-value" style="color: var(--stat-approved);">{{ scrapedApprovedCount }}</span>
              <span class="stat-mini-label">{{ t('grantsPortal.statApproved') }}</span>
            </div>
            <div class="stat-mini">
              <span class="stat-mini-value" style="color: var(--stat-closed);">{{ scrapedClosedCount }}</span>
              <span class="stat-mini-label">{{ t('grantsPortal.statClosed') }}</span>
            </div>
            <div class="stat-mini">
              <span class="stat-mini-value" style="color: var(--stat-declined);">{{ scrapedDeclinedCount }}</span>
              <span class="stat-mini-label">{{ t('grantsPortal.statDeclined') }}</span>
            </div>
            <div class="stat-mini">
              <span class="stat-mini-value" style="color: var(--tectonic-white);">{{ projectStats.total }}</span>
              <span class="stat-mini-label">{{ t('grantsPortal.statProjects') }}</span>
            </div>
          </div>
          <div v-if="user" class="tabs-row">
            <button v-for="tab in portalTabs" :key="tab.key" @click="activePortalTab = tab.key" class="tab-btn" :class="activePortalTab === tab.key ? 'active' : ''">{{ t(`grantsPortal.${tab.key}`) }}</button>
          </div>
          <p v-if="!user" class="text-xs text-white/40 text-center mt-3">{{ t('grantsPortal.signInDashboardDesc') }}</p>

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
              <h3 class="portal-card-title">🌍 {{ t('grantsPortal.openGrantsHeading') }} <span class="text-xs text-white/40 font-normal">({{ scrapedOpenCount }} {{ t('grantsPortal.open') }})</span></h3>
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
                      <span class="grant-status pending">{{ t('grantsPortal.statusOpen') }}</span>
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
                      <button v-for="n in 8" :key="n" @click="handleVoteScraped(g.id, n)" class="star-btn" :class="getStarClass(g.id, n)" :title="n + ' ' + t('grantsPortal.stars')">★</button>
                      <span class="text-[10px] text-white/40 ml-2">{{ getVoteCount(g.id) }} {{ t('grantsPortal.votes') }}</span>
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
              <h3 class="portal-card-title">✅ {{ t('grantsPortal.approvedGrantsHeading') }} <span class="text-xs text-white/40 font-normal">({{ scrapedApprovedCount }} {{ t('grantsPortal.approved') }})</span></h3>
              <p class="text-sm text-white/60 mb-4">{{ t('grantsPortal.approvedGrantsDesc') }}</p>
              <div v-if="scrapedLoading" class="list-status">{{ t('grantsPortal.loadingOpenGrants') }}</div>
              <div v-else-if="filteredScrapedGrants.length === 0" class="list-status">{{ t('grantsPortal.noApprovedGrantsYet') }}</div>
              <div v-for="g in filteredScrapedGrants" :key="g.id" class="grant-item">
                <div class="grant-item-body">
                  <div class="grant-item-header">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="grant-type-badge" :class="g.grant_type || 'general'">{{ typeEmoji(g.grant_type) }} {{ g.grant_type || 'general' }}</span>
                      <h4>{{ g.title }}</h4>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0">
                      <span v-if="g.priority_score != null" class="priority-score" :class="priorityClass(g.priority_score)">{{ g.priority_score }}</span>
                      <span class="grant-status approved">{{ t('grantsPortal.statusApproved') }}</span>
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
                      <button v-for="n in 8" :key="n" @click="handleVoteScraped(g.id, n)" class="star-btn" :class="getStarClass(g.id, n)" :title="n + ' ' + t('grantsPortal.stars')">★</button>
                      <span class="text-[10px] text-white/40 ml-2">{{ getVoteCount(g.id) }} {{ t('grantsPortal.votes') }}</span>
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
              <h3 class="portal-card-title">🔒 {{ t('grantsPortal.closedGrantsHeading') }} <span class="text-xs text-white/40 font-normal">({{ scrapedClosedCount }} {{ t('grantsPortal.closed') }})</span></h3>
              <p class="text-sm text-white/60 mb-4">{{ t('grantsPortal.closedGrantsDesc') }}</p>
              <div v-if="scrapedLoading" class="list-status">{{ t('grantsPortal.loadingOpenGrants') }}</div>
              <div v-else-if="filteredScrapedGrants.length === 0" class="list-status">{{ t('grantsPortal.noClosedGrants') }}</div>
              <div v-for="g in filteredScrapedGrants" :key="g.id" class="grant-item opacity-60">
                <div class="grant-item-body">
                  <div class="grant-item-header">
                    <h4>{{ g.title }}</h4>
                    <span class="grant-status closed">{{ t('grantsPortal.statusClosed') }}</span>
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
              <h3 class="portal-card-title">🚫 {{ t('grantsPortal.declinedGrantsHeading') }} <span class="text-xs text-white/40 font-normal">({{ scrapedDeclinedCount }} {{ t('grantsPortal.declined') }})</span></h3>
              <p class="text-sm text-white/60 mb-4">{{ t('grantsPortal.declinedGrantsDesc') }}</p>
              <div v-if="scrapedLoading" class="list-status">{{ t('grantsPortal.loadingOpenGrants') }}</div>
              <div v-else-if="filteredScrapedGrants.length === 0" class="list-status">{{ t('grantsPortal.noDeclinedGrants') }}</div>
              <div v-for="g in filteredScrapedGrants" :key="g.id" class="grant-item opacity-50">
                <div class="grant-item-body">
                  <div class="grant-item-header">
                    <h4>{{ g.title }}</h4>
                    <span class="grant-status" :class="g.status === 'rejected' ? 'rejected' : 'hidden'">{{ g.status === 'rejected' ? t('grantsPortal.statusRejected') : t('grantsPortal.statusHidden') }}</span>
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
                        <span v-if="entry.source_type === 'scraped'" class="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">{{ t('grantsPortal.leaderboardOpen') }}</span>
                        <span v-else class="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-300">{{ t('grantsPortal.leaderboardCrew') }}</span>
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

      <RegistryModal
        :show="showRegistry"
        :loading="registryLoading"
        :grants="registry"
        @close="closeRegistryModal"
        @view-detail="openGrantDetail"
      />

      <GrantDetailModal
        :grant="detailGrant"
        :user-vote="detailUserVote"
        @close="closeGrantDetail"
        @vote="handleVoteDetail"
      />

      <GrantEditModal
        :grant="editGrant"
        :saving="editSaving"
        :error="editErr"
        @close="closeEditScraped"
        @save="handleSaveEditFromModal"
      />

      <GrantsFooter
        :project-stats="projectStats"
        :open-grants-total="scrapedOpenCount + scrapedApprovedCount + scrapedClosedCount + scrapedDeclinedCount"
        :country-count="countryCount"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, nextTick } from 'vue'
import type { GrantRecord, ScrapedGrant, LeaderboardEntry } from '~/composables/useGrants'
import { allProjectsData } from '~/lib/project-data'
import type { ProjectData, DetailGrantData } from '~/lib/types'
import { useThreeGlobe } from '~/composables/useThreeGlobe'
import GrantsAuth from '~/components/grants/GrantsAuth.vue'
import GrantDetailModal from '~/components/grants/GrantDetailModal.vue'
import GrantEditModal from '~/components/grants/GrantEditModal.vue'
import RegistryModal from '~/components/grants/RegistryModal.vue'
import GrantsFooter from '~/components/grants/GrantsFooter.vue'

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
  if (!user.value) return tabs.filter(tab => tab.key === 'tabSubmit')
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
  try {
    const result = await listGrants('approved')
    registry.value = (result.grants ?? []).slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  } catch (e) {
    console.error('Failed to load registry:', e)
  } finally {
    registryLoading.value = false
  }
}

function openRegistryModal() {
  showRegistry.value = true
  loadRegistry()
}

function closeRegistryModal() {
  showRegistry.value = false
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
    ...g,
    source_type: 'scraped',
    source_id: g.id,
    created_at: g.fetched_at || g.created_at,
  }
}

async function loadGrants() {
  loading.value = true
  try {
    const result = await listGrants()
    grants.value = result.grants ?? []
  } catch (e) {
    console.error('Failed to load grants:', e)
  } finally {
    loading.value = false
  }
}

async function loadStats() {
  try {
    const s = await getStats()
    if (s.total > 0) {
      Object.assign(stats, s)
    } else {
      Object.assign(stats, { pending: 0, approved: projectStats.value.total, rejected: 0, total: projectStats.value.total })
    }
  } catch (e) {
    console.error('Failed to load stats:', e)
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
  try {
    const result = await listScrapedGrants()
    scrapedGrants.value = result.grants ?? []
    if (scrapedGrants.value.length === 0) {
      scrapedGrants.value = allProjectsData.map(projectToScrapedGrant)
    }
  } catch (e) {
    console.error('Failed to load scraped grants:', e)
    if (scrapedGrants.value.length === 0) {
      scrapedGrants.value = allProjectsData.map(projectToScrapedGrant)
    }
  } finally {
    scrapedLoading.value = false
  }
}

async function loadLeaderboardData() {
  leaderboardLoading.value = true
  try {
    const result = await getLeaderboard('all', 'approved')
    leaderboard.value = result.grants ?? []
  } catch (e) {
    console.error('Failed to load leaderboard:', e)
  } finally {
    leaderboardLoading.value = false
  }
}

async function handleSubmitGrant() {
  submitting.value = true
  submitMsg.value = ''
  try {
    const result: { error?: string; grant?: GrantRecord } = await apiSubmitGrant(form)
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
  } catch (e) {
    submitMsg.value = 'An unexpected error occurred. Please try again.'
    submitOk.value = false
    console.error('Failed to submit grant:', e)
  } finally {
    submitting.value = false
  }
}

async function handleReview(grantId: string, decision: string) {
  try {
    await apiReviewGrant(grantId, decision as 'approved' | 'rejected')
    loadGrants()
    loadStats()
    if (showRegistry.value) loadRegistry()
  } catch (e) {
    console.error('Failed to review grant:', e)
  }
}

async function handleReviewScraped(grantId: string, decision: 'approved' | 'rejected' | 'hidden' | 'pending') {
  try {
    await apiReviewScraped(grantId, decision)
    loadScrapedGrants()
    loadGrants()
  } catch (e) {
    console.error('Failed to review scraped grant:', e)
  }
}

const editErr = ref('')

function closeEditScraped() {
  editGrant.value = null
  editErr.value = ''
}

async function handleSaveEdit() {
  if (!editGrant.value) return
  editSaving.value = true
  editErr.value = ''
  try {
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
    if ('error' in result && result.error) {
      editErr.value = result.error as string
      return
    }
    closeEditScraped()
    loadScrapedGrants()
  } catch (e) {
    editErr.value = 'An unexpected error occurred. Please try again.'
    console.error('Failed to save edit:', e)
  } finally {
    editSaving.value = false
  }
}

function handleSaveEditFromModal(form: Record<string, string>) {
  Object.assign(editForm, form)
  handleSaveEdit()
}

async function handleVoteScraped(scrapedId: string, stars: number) {
  if (!user.value) return
  try {
    const current = scrapedUserVotes[scrapedId]
    if (current === stars) {
      await deleteVote('', scrapedId)
      scrapedUserVotes[scrapedId] = 0
    } else {
      await voteScrapedGrant(scrapedId, stars)
      scrapedUserVotes[scrapedId] = stars
    }
    loadLeaderboardData()
  } catch (e) {
    console.error('Failed to vote:', e)
  }
}

async function handleVoteDetail(stars: number) {
  if (!user.value || !detailGrant.value) return
  try {
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
  } catch (e) {
    console.error('Failed to vote on detail:', e)
  }
}

function getStarClass(grantId: string, n: number) {
  const vote = scrapedUserVotes[grantId] || 0
  return n <= vote ? 'active' : ''
}

function getVoteCount(grantId: string) {
  const entry = leaderboard.value.find(e => e.id === grantId)
  return entry?.vote_count || 0
}

function scrollToPortal() {
  document.getElementById('grants-portal')?.scrollIntoView({ behavior: 'smooth' })
}

function handleSignOut() {
  confirmSignOut.value = true
}

watch(activeTab, () => loadGrants())
watch(activePortalTab, (tab) => {
  if (['tabOpen', 'tabApproved', 'tabClosed', 'tabDeclined'].includes(tab)) loadScrapedGrants()
  if (tab === 'tabLeaderboard') loadLeaderboardData()
})

const globeCanvas = ref<HTMLCanvasElement | null>(null)
const { init: initGlobe } = useThreeGlobe(globeCanvas)

onMounted(async () => {
  await Promise.all([loadGrants(), loadStats(), loadScrapedGrants()])
  await nextTick()
  initGlobe()
})
</script>

<style scoped>
.grants-portal {
  --obsidian: #08080a;
  --tectonic-white: #f0f0f0;
  --glass: rgba(255, 255, 255, 0.03);
  --border: rgba(255, 255, 255, 0.1);
  --accent: #00ff85;
  --stat-open: #eab308;
  --stat-approved: var(--accent);
  --stat-closed: rgba(255, 255, 255, 0.4);
  --stat-declined: #ef4444;
  --z-canvas: 0;
  --z-dots: 1;
  --z-ui: 10;
  --z-dropdown: 9999;
  --z-dropdown-backdrop: 9998;
  --z-modal-registry: 9000;
  --z-modal-detail: 9100;
  --z-modal-edit: 9200;
  --z-confirm: 10000;
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
  z-index: var(--z-ui);
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

.form-input,
.edit-input {
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
.form-input:focus,
.edit-input:focus { border-color: rgba(0,255,133,0.4); }
.form-input::placeholder,
.edit-input::placeholder { color: rgba(255,255,255,0.2); }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
select.form-input option { background: #000; }
textarea.edit-input {
  resize: vertical;
  font-family: inherit;
}

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

/* Scroll indicator */
.scroll-indicator {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.7rem;
  opacity: 0.5;
  z-index: var(--z-ui);
  animation: bounce-arrow 2s infinite;
  color: rgba(255,255,255,0.5);
}
@keyframes bounce-arrow {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(10px); }
}

/* Star voter */
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

/* Modal transitions */
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
  .form-row {
    grid-template-columns: 1fr;
  }
}

/* Grant type badge */
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

/* Action button variants */
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
</style>
