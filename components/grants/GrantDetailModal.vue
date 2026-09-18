/**
 * components/grants/GrantDetailModal.vue
 * @why Full grant detail view in a modal — shows all fields, comments, votes
 * @component GrantDetailModal
 * @emits close, vote, save
 * @deps vue (ref, reactive, watch, computed, onMounted, onBeforeUnmount)
 */
<template>
  <Teleport to="body">
    <Transition name="gdm">
      <div
        v-if="grant"
        class="gdm-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Grant detail"
        @keydown.esc="handleClose"
      >
        <div class="gdm-backdrop" @click="handleBackdropClick" />
        <div
          ref="panelRef"
          class="gdm-panel"
          role="document"
          tabindex="-1"
          :class="{ 'is-dragging': dragging }"
          :style="dragOffset ? { transform: `translateY(${dragOffset}px)` } : undefined"
        >
          <div class="gdm-grabber" aria-hidden="true"><span /></div>
          <!-- ══ HERO ══ -->
          <header
            class="gdm-hero"
            :data-tone="urgencyTone"
            @touchstart.passive="onSheetTouchStart"
            @touchmove.passive="onSheetTouchMove"
            @touchend="onSheetTouchEnd"
          >
            <div class="gdm-hero-glow" aria-hidden="true" />
            <div class="gdm-hero-grid" aria-hidden="true" />
            <div class="gdm-hero-top">
              <div class="gdm-badges">
                <span class="gdm-status" :data-status="grant.status || 'open'">
                  <span class="gdm-dot" />
                  {{ statusLabel }}
                </span>
                <span v-if="grant.grant_type" class="gdm-type">
                  <span aria-hidden="true">{{ typeGlyph(grant.grant_type) }}</span>
                  {{ formatType(grant.grant_type) }}
                </span>
                <span v-if="urgencyLabel" class="gdm-urgency" :data-tone="urgencyTone">
                  {{ urgencyLabel }}
                </span>
              </div>
              <div class="gdm-hero-actions">
                <button
                  v-if="isManager && !editing"
                  class="gdm-btn gdm-btn-ghost"
                  :aria-label="t('grantsPortal.edit')"
                  @click="startEditing"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                  <span class="gdm-btn-text">{{ t('grantsPortal.edit') }}</span>
                </button>
                <button
                  class="gdm-btn gdm-btn-ghost gdm-btn-icon"
                  :aria-label="copied ? 'Copied' : 'Copy link'"
                  :title="copied ? 'Copied' : 'Copy link'"
                  @click="copyLink"
                >
                  <svg v-if="!copied" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                </button>
                <button class="gdm-btn gdm-btn-ghost gdm-btn-icon" aria-label="Close" @click="handleClose">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>

            <div v-if="!editing" class="gdm-hero-main">
              <div class="gdm-title-wrap">
                <h2 class="gdm-title">{{ grant.title }}</h2>
                <p class="gdm-meta">
                  <span v-if="grant.funder" class="gdm-meta-strong">{{ grant.funder }}</span>
                  <span v-if="grant.funder && metaPlace" class="gdm-meta-sep">·</span>
                  <span v-if="metaPlace">{{ metaPlace }}</span>
                  <span v-if="createdLabel" class="gdm-meta-sep">·</span>
                  <span v-if="createdLabel">{{ createdLabel }}</span>
                </p>
                <div v-if="grant.highlights?.length" class="gdm-highlights">
                  <span v-for="hl in grant.highlights" :key="hl" class="gdm-hl" :data-hl="hl.toLowerCase().replace(/\s+/g, '_')">
                    {{ formatHighlight(hl) }}
                  </span>
                </div>
              </div>
              <div v-if="grant.priority_score != null" class="gdm-score" :title="t('grantsPortal.descPriority')">
                <svg viewBox="0 0 44 44" class="gdm-ring" aria-hidden="true">
                  <circle cx="22" cy="22" r="18" class="gdm-ring-track" />
                  <circle
                    cx="22" cy="22" r="18" class="gdm-ring-fill"
                    :data-tone="priorityTone"
                    :stroke-dasharray="ringCirc"
                    :stroke-dashoffset="ringOffset"
                  />
                </svg>
                <div class="gdm-score-text">
                  <strong>{{ grant.priority_score }}</strong>
                  <span>{{ t('grantsPortal.descPriority') }}</span>
                </div>
              </div>
            </div>

            <div v-else class="gdm-hero-main">
              <div class="gdm-title-wrap" style="flex:1">
                <p class="gdm-eyebrow">{{ t('grantsPortal.editGrant') }}</p>
                <input
                  v-model="editForm.title"
                  class="gdm-title-input"
                  :placeholder="t('grantsPortal.editFormTitle')"
                  aria-label="Grant title"
                />
              </div>
            </div>

            <!-- funding strip -->
            <div v-if="!editing" class="gdm-strip">
              <div class="gdm-strip-item">
                <span class="gdm-strip-label">{{ t('grantsPortal.descFunding') }}</span>
                <strong class="gdm-strip-value">{{ fundingPrimary }}</strong>
                <span v-if="grant.amount_usd != null" class="gdm-strip-sub">≈ ${{ formatAmount(grant.amount_usd) }} USD</span>
              </div>
              <div class="gdm-strip-divider" aria-hidden="true" />
              <div class="gdm-strip-item">
                <span class="gdm-strip-label">{{ t('grantsPortal.descDeadline') }}</span>
                <strong class="gdm-strip-value" :data-tone="urgencyTone">{{ deadlinePrimary }}</strong>
                <span v-if="deadlineSub" class="gdm-strip-sub">{{ deadlineSub }}</span>
              </div>
              <div class="gdm-strip-divider" aria-hidden="true" />
              <div class="gdm-strip-item gdm-strip-cta">
                <a
                  v-if="applyUrl"
                  :href="applyUrl"
                  target="_blank"
                  rel="noopener"
                  class="gdm-apply"
                >
                  {{ applyLabel }}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M7 7h10v10"/></svg>
                </a>
                <span v-else class="gdm-strip-sub">{{ t('grantsPortal.notSpecified') }}</span>
              </div>
            </div>

            <!-- tabs -->
            <nav v-if="!editing" class="gdm-tabs" role="tablist" aria-label="Grant sections">
              <button
                role="tab"
                :aria-selected="activeTab === 'overview'"
                class="gdm-tab"
                :class="{ 'is-active': activeTab === 'overview' }"
                @click="activeTab = 'overview'"
              >{{ t('grantsPortal.details') }}</button>
              <button
                role="tab"
                :aria-selected="activeTab === 'discussion'"
                class="gdm-tab"
                :class="{ 'is-active': activeTab === 'discussion' }"
                @click="activeTab = 'discussion'"
              >
                {{ t('grantsPortal.comments') }}
                <span v-if="comments.length" class="gdm-tab-count">{{ comments.length }}</span>
              </button>
            </nav>
          </header>

          <!-- ══ BODY ══ -->
          <div ref="scrollRef" class="gdm-body">
            <!-- EDIT MODE -->
            <div v-if="editing" class="gdm-edit">
              <div class="gdm-form-grid">
                <label class="gdm-field gdm-span-2">
                  <span class="gdm-field-label">{{ t('grantsPortal.editFormFunder') }}</span>
                  <input v-model="editForm.funder" class="gdm-input" placeholder="e.g. Ford Foundation" />
                </label>
                <label class="gdm-field gdm-span-2">
                  <span class="gdm-field-label">{{ t('grantsPortal.editFormDescription') }}</span>
                  <textarea v-model="editForm.description" rows="5" class="gdm-input gdm-textarea" placeholder="What is this grant about?" />
                </label>
                <label class="gdm-field">
                  <span class="gdm-field-label">{{ t('grantsPortal.editFormAmountMax') }}</span>
                  <input v-model="editForm.amount_max" class="gdm-input" inputmode="decimal" placeholder="50,000" />
                </label>
                <label class="gdm-field">
                  <span class="gdm-field-label">{{ t('grantsPortal.editFormAmountMin') }}</span>
                  <input v-model="editForm.amount_min" class="gdm-input" inputmode="decimal" placeholder="1,000" />
                </label>
                <label class="gdm-field">
                  <span class="gdm-field-label">{{ t('grantsPortal.editFormCurrency') }}</span>
                  <input v-model="editForm.currency" class="gdm-input" :placeholder="t('grantsPortal.editFormCurrencyPlaceholder')" maxlength="8" />
                </label>
                <label class="gdm-field">
                  <span class="gdm-field-label">{{ t('grantsPortal.editFormCountry') }}</span>
                  <input v-model="editForm.country" class="gdm-input" placeholder="Kenya" />
                </label>
                <label class="gdm-field">
                  <span class="gdm-field-label">{{ t('grantsPortal.editFormDeadline') }}</span>
                  <input v-model="editForm.deadline" class="gdm-input" :placeholder="t('grantsPortal.editFormDeadlinePlaceholder')" />
                </label>
                <label class="gdm-field">
                  <span class="gdm-field-label">{{ t('grantsPortal.editFormUrl') }}</span>
                  <input v-model="editForm.url" class="gdm-input" inputmode="url" placeholder="https://" />
                </label>
                <label class="gdm-field gdm-span-2">
                  <span class="gdm-field-label">{{ t('grantsPortal.editFormCategories') }}</span>
                  <input v-model="editForm.categories" class="gdm-input" :placeholder="t('grantsPortal.editFormCategoriesPlaceholder')" />
                </label>
              </div>
              <div v-if="editError" class="gdm-alert gdm-alert-error" role="alert">{{ editError }}</div>
            </div>

            <!-- OVERVIEW -->
            <div v-else-if="activeTab === 'overview'" class="gdm-layout">
              <div class="gdm-main">
                <section class="gdm-card">
                  <h3 class="gdm-card-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>
                    {{ t('grantsPortal.descDescription') }}
                  </h3>
                  <p class="gdm-desc">{{ grant.description || t('grantsPortal.notSpecified') }}</p>
                  <div v-if="grant.categories?.length" class="gdm-chips">
                    <span v-for="cat in grant.categories" :key="cat" class="gdm-chip">#{{ cat }}</span>
                  </div>
                </section>

                <section v-if="grant.location_name || grant.latitude != null" class="gdm-card">
                  <h3 class="gdm-card-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                    {{ t('grantsPortal.descLocation') }}
                  </h3>
                  <p class="gdm-card-text">{{ grant.location_name || grant.country || t('grantsPortal.notSpecified') }}</p>
                  <p v-if="grant.latitude != null" class="gdm-card-sub mono">{{ grant.latitude }}, {{ grant.longitude }}</p>
                </section>

                <section class="gdm-card">
                  <h3 class="gdm-card-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>
                    {{ t('grantsPortal.descSource') }}
                  </h3>
                  <dl class="gdm-dl">
                    <div v-if="grant.funder || grant.source" class="gdm-dl-row">
                      <dt>{{ t('grantsPortal.funder') }}</dt>
                      <dd>{{ grant.funder || grant.source }}</dd>
                    </div>
                    <div v-if="grant.submitted_by" class="gdm-dl-row">
                      <dt>{{ t('grantsPortal.submittedBy') }}</dt>
                      <dd class="truncate">{{ grant.submitted_by }}</dd>
                    </div>
                    <div v-if="isManualInserted" class="gdm-dl-row">
                      <dt>{{ t('grantsPortal.submittedBy') }}</dt>
                      <dd>✓ {{ t('grantsPortal.manager') }}</dd>
                    </div>
                    <div v-if="grant.relevance != null" class="gdm-dl-row">
                      <dt>Relevance</dt>
                      <dd>
                        <span class="gdm-meter"><span class="gdm-meter-fill" :style="{ width: Math.min(100, Math.max(0, grant.relevance)) + '%' }" /></span>
                        <span class="mono">{{ grant.relevance }}/100</span>
                      </dd>
                    </div>
                  </dl>
                  <div v-if="applyUrl || secondaryUrl" class="gdm-links">
                    <a v-if="applyUrl" :href="applyUrl" target="_blank" rel="noopener" class="gdm-link gdm-link-primary">
                      {{ applyLabel }}
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M7 7h10v10"/></svg>
                    </a>
                    <a v-if="secondaryUrl" :href="secondaryUrl" target="_blank" rel="noopener" class="gdm-link">
                      {{ t('grantsPortal.aggregatorSourcePage') }}
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M7 7h10v10"/></svg>
                    </a>
                  </div>
                </section>

              </div>

              <aside class="gdm-side">
                <section v-if="showDeadlineCard" class="gdm-card gdm-tone-card" :data-tone="urgencyTone">
                  <h3 class="gdm-card-title">{{ t('grantsPortal.descDeadline') }}</h3>
                  <p class="gdm-deadline-big">{{ deadlinePrimary }}</p>
                  <p v-if="deadlineSub" class="gdm-card-sub">{{ deadlineSub }}</p>
                  <div v-if="deadlineBar != null" class="gdm-progress" role="progressbar" :aria-valuenow="deadlineBar" aria-valuemin="0" aria-valuemax="100">
                    <span class="gdm-progress-fill" :data-tone="urgencyTone" :style="{ width: deadlineBar + '%' }" />
                  </div>
                </section>

                <section class="gdm-card">
                  <h3 class="gdm-card-title">★ {{ t('grantsPortal.voteLabel') }}</h3>
                  <div class="gdm-stars" role="radiogroup" aria-label="Vote">
                    <button
                      v-for="n in 8"
                      :key="n"
                      role="radio"
                      :aria-checked="displayVote === n"
                      class="gdm-star"
                      :class="{ 'is-on': n <= displayVote, 'is-hover': hoverVote >= n }"
                      :title="n + ' ' + t('grantsPortal.stars')"
                      @mouseenter="hoverVote = n"
                      @mouseleave="hoverVote = 0"
                      @focus="hoverVote = n"
                      @blur="hoverVote = 0"
                      @click="$emit('vote', n)"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.5l2.9 6.26 6.6.7-4.95 4.55 1.35 6.49L12 17.2 6.1 20.5l1.35-6.49L2.5 9.46l6.6-.7L12 2.5z"/></svg>
                    </button>
                  </div>
                  <p class="gdm-card-sub">{{ userVote ? t('grantsPortal.yourVote', { count: displayVote || userVote }) : t('grantsPortal.noVotes') }}</p>
                  <button v-if="userVote" class="gdm-link-btn" @click="$emit('vote', displayVote === userVote && hoverVote === 0 ? userVote : displayVote)">
                    {{ t('grantsPortal.votes') }} · {{ displayVote || userVote }}/8
                  </button>
                </section>

                <section class="gdm-card">
                  <h3 class="gdm-card-title">{{ t('grantsPortal.details') }}</h3>
                  <dl class="gdm-dl">
                    <div class="gdm-dl-row"><dt>{{ t('grantsPortal.descStatus') }}</dt><dd class="capitalize">{{ statusLabel }}</dd></div>
                    <div v-if="grant.country" class="gdm-dl-row"><dt>{{ t('grantsPortal.country') }}</dt><dd>{{ grant.country }}</dd></div>
                    <div v-if="grant.currency" class="gdm-dl-row"><dt>{{ t('grantsPortal.editFormCurrency') }}</dt><dd class="mono">{{ grant.currency }}</dd></div>
                    <div v-if="grant.deadline" class="gdm-dl-row"><dt>{{ t('grantsPortal.deadline') }}</dt><dd class="mono">{{ grant.deadline }}</dd></div>
                  </dl>
                </section>
              </aside>
            </div>

            <!-- DISCUSSION -->
            <div v-else class="gdm-discussion">
              <div v-if="commentsLoading" class="gdm-skel-list" aria-hidden="true">
                <div v-for="n in 3" :key="n" class="gdm-skel-row">
                  <div class="gdm-skel-avatar" />
                  <div class="gdm-skel-lines"><div /><div /></div>
                </div>
              </div>
              <div v-else-if="!comments.length" class="gdm-empty">
                <div class="gdm-empty-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
                <p class="gdm-empty-title">{{ t('grantsPortal.comments') }}</p>
                <p class="gdm-empty-sub">{{ t('grantsPortal.noComments') }}</p>
              </div>
              <ul v-else class="gdm-comments">
                <li v-for="c in comments" :key="c.id" class="gdm-comment">
                  <span class="gdm-avatar" :style="{ '--av': avatarColor(c.email || c.author_name || '?') }" aria-hidden="true">
                    {{ avatarInitial(c) }}
                  </span>
                  <div class="gdm-comment-body">
                    <div class="gdm-comment-head">
                      <span class="gdm-comment-author">{{ c.author_name || (c.email || '').split('@')[0] }}</span>
                      <time v-if="c.created_at" class="gdm-comment-time" :datetime="c.created_at">{{ relativeTime(c.created_at) }}</time>
                    </div>
                    <p class="gdm-comment-text">{{ c.content }}</p>
                  </div>
                  <button
                    v-if="user?.email && c.email && user.email === c.email"
                    class="gdm-comment-del"
                    :title="t('grantsPortal.deleteComment')"
                    :aria-label="t('grantsPortal.deleteComment')"
                    @click="handleDeleteComment(c.id)"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </li>
              </ul>
              <div v-if="commentError" class="gdm-alert gdm-alert-error" role="alert">{{ commentError }}</div>
            </div>
          </div>

          <!-- ══ FOOTER ══ -->
          <footer class="gdm-footer">
            <div v-if="editing" class="gdm-footer-row">
              <button class="gdm-btn gdm-btn-muted" @click="cancelEditing">{{ t('grantsPortal.cancel') }}</button>
              <button class="gdm-btn gdm-btn-primary" :disabled="saving" @click="handleSave">
                <svg v-if="saving" class="gdm-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.2-8.56"/></svg>
                {{ saving ? t('grantsPortal.saving') : t('grantsPortal.saveChanges') }}
              </button>
            </div>
            <template v-else>
              <form v-if="activeTab === 'discussion' && user" class="gdm-composer" @submit.prevent="handleAddComment">
                <input
                  v-model="commentInput"
                  :placeholder="t('grantsPortal.commentPlaceholder')"
                  :aria-label="t('grantsPortal.commentPlaceholder')"
                  class="gdm-composer-input"
                  maxlength="2000"
                />
                <button
                  type="submit"
                  class="gdm-btn gdm-btn-primary gdm-send"
                  :disabled="!commentInput.trim() || commentSending"
                  :aria-label="t('grantsPortal.send')"
                >
                  <svg v-if="commentSending" class="gdm-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.2-8.56"/></svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="gdm-send-icon"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                  <span class="gdm-send-label">{{ t('grantsPortal.send') }}</span>
                </button>
              </form>
              <p v-else-if="activeTab === 'discussion'" class="gdm-signin-hint">{{ t('grantsPortal.signInToComment') }}</p>
              <div v-else class="gdm-footer-row">
                <button class="gdm-btn gdm-btn-muted" @click="$emit('close')">{{ t('grantsPortal.close') }}</button>
                <a v-if="applyUrl" :href="applyUrl" target="_blank" rel="noopener" class="gdm-btn gdm-btn-primary">
                  {{ applyLabel }}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M7 7h10v10"/></svg>
                </a>
              </div>
            </template>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed, onMounted, onBeforeUnmount } from 'vue'
import type { DetailGrantData } from '~/lib/types'
import type { GrantComment } from '~/composables/useGrants'

const props = defineProps<{
  grant: DetailGrantData | null
  userVote: number
  user: { email?: string } | null
  isManager?: boolean
  saving?: boolean
  editError?: string
}>()

const emit = defineEmits<{
  close: []
  vote: [stars: number]
  save: [grantId: string, form: Record<string, string>]
}>()

const { t } = useI18n()
const { getComments, addComment, deleteComment } = useGrants()

const editing = ref(false)
const activeTab = ref<'overview' | 'discussion'>('overview')
const hoverVote = ref(0)
const copied = ref(false)
const panelRef = ref<HTMLElement | null>(null)
const scrollRef = ref<HTMLElement | null>(null)

/* ── bottom-sheet drag-to-close (mobile only) ─────────── */
const dragOffset = ref(0)
const dragging = ref(false)
let dragStartY = 0
let dragScrollTop = 0

function isMobileSheet(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches
}

function onSheetTouchStart(e: TouchEvent) {
  if (!isMobileSheet() || editing.value) return
  // Only start drag when body is scrolled to top so list scroll isn't hijacked
  if (scrollRef.value && scrollRef.value.scrollTop > 0) return
  dragStartY = e.touches[0].clientY
  dragScrollTop = scrollRef.value?.scrollTop ?? 0
}

function onSheetTouchMove(e: TouchEvent) {
  if (!isMobileSheet() || editing.value || !dragStartY) return
  if (dragScrollTop > 0) return
  const dy = e.touches[0].clientY - dragStartY
  if (dy > 8) {
    dragging.value = true
    dragOffset.value = Math.min(dy, 220)
  }
}

function onSheetTouchEnd() {
  if (!dragging.value) {
    dragStartY = 0
    return
  }
  const shouldClose = dragOffset.value > 110
  dragging.value = false
  dragOffset.value = 0
  dragStartY = 0
  if (shouldClose) handleClose()
}

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

const comments = ref<GrantComment[]>([])
const commentsLoading = ref(false)
const commentInput = ref('')
const commentSending = ref(false)
const commentError = ref('')

/* ── derived ─────────────────────────────────────────── */
const displayVote = computed(() => hoverVote.value || props.userVote)

const statusLabel = computed(() => {
  const s = props.grant?.status || 'open'
  try { return t(`grantsPortal.${s}`) } catch { return s }
})

const metaPlace = computed(() => {
  const g = props.grant
  if (!g) return ''
  return g.location_name || g.country || ''
})

const createdLabel = computed(() => {
  const raw = props.grant?.created_at
  if (!raw) return ''
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString()
})

const urgencyTone = computed(() => {
  const g = props.grant
  if (!g) return 'neutral'
  if (g.urgency === 'urgent') return 'urgent'
  if (g.urgency === 'soon') return 'soon'
  if (g.urgency === 'expired') return 'expired'
  if (g.status === 'closed') return 'expired'
  if ((g.deadline_days ?? null) != null && (g.deadline_days as number) < 0) return 'expired'
  return 'open'
})

const urgencyLabel = computed(() => {
  const g = props.grant
  if (!g) return ''
  if (g.urgency === 'urgent') return '⚠ ' + t('grantsPortal.urgencyUrgent')
  if (g.urgency === 'soon') return t('grantsPortal.urgencySoon')
  if (g.urgency === 'expired' || urgencyTone.value === 'expired') return t('grantsPortal.urgencyExpired')
  return ''
})

const fundingPrimary = computed(() => {
  const g = props.grant
  if (!g?.amount_max) return t('grantsPortal.notSpecified')
  return `${g.amount_max} ${g.currency || ''}`.trim()
})

const deadlinePrimary = computed(() => {
  const g = props.grant
  if (g?.deadline) return g.deadline
  if ((g?.deadline_days ?? null) != null) {
    const d = g!.deadline_days as number
    if (d >= 0) return t('grantsPortal.daysRemaining', { count: d })
    return t('grantsPortal.daysAgo', { count: Math.abs(d) })
  }
  return t('grantsPortal.notSpecified')
})

const deadlineSub = computed(() => {
  const g = props.grant
  if (!g) return ''
  if (g.deadline && (g.deadline_days ?? null) != null) {
    const d = g.deadline_days as number
    return d >= 0
      ? t('grantsPortal.daysRemaining', { count: d })
      : t('grantsPortal.daysAgo', { count: Math.abs(d) })
  }
  return ''
})

const deadlineBar = computed<number | null>(() => {
  const d = props.grant?.deadline_days
  if (d == null) return null
  // Map 90d window → 0..100 (full = far away, empty = passed)
  const clamped = Math.min(90, Math.max(0, d))
  return Math.round((clamped / 90) * 100)
})

const showDeadlineCard = computed(() => {
  const g = props.grant
  return Boolean(g?.deadline || (g?.deadline_days ?? null) != null || (g?.urgency && g.urgency !== 'unknown'))
})

const applyUrl = computed(() => {
  const g = props.grant as unknown as Record<string, string | undefined> | null
  if (!g) return ''
  return g.grant_link || g.source_link || g.url || ''
})

const secondaryUrl = computed(() => {
  const g = props.grant as unknown as Record<string, string | undefined> | null
  if (!g) return ''
  const primary = g.grant_link || g.source_link || g.url
  if (g.source_link && g.source_link !== primary) return g.source_link
  return ''
})

const applyLabel = computed(() => {
  const st = props.grant?.source_type
  if (st === 'scraped') return t('grantsPortal.applyOnFunderSite')
  return t('grantsPortal.visitSource')
})

const priorityTone = computed(() => {
  const s = props.grant?.priority_score ?? 0
  if (s >= 60) return 'high'
  if (s >= 30) return 'mid'
  return 'low'
})

const ringCirc = 2 * Math.PI * 18
const isManualInserted = computed(() => {
  return Boolean((props.grant as unknown as Record<string, unknown> | null)?.manual_inserted)
})
const ringOffset = computed(() => {
  const s = Math.min(100, Math.max(0, props.grant?.priority_score ?? 0))
  return ringCirc * (1 - s / 100)
})

/* ── comments ────────────────────────────────────────── */
watch(() => props.grant?.id, async (id) => {
  editing.value = false
  dragOffset.value = 0
  dragging.value = false
  activeTab.value = 'overview'
  hoverVote.value = 0
  commentInput.value = ''
  commentError.value = ''
  if (id) {
    commentsLoading.value = true
    try {
      const result = await getComments(id)
      comments.value = result.comments ?? []
    } catch {
      comments.value = []
    } finally {
      commentsLoading.value = false
    }
  } else {
    comments.value = []
  }
}, { immediate: true })

watch(activeTab, () => {
  scrollRef.value?.scrollTo({ top: 0 })
})

/* ── scroll lock + esc + focus ───────────────────────── */
function lockScroll(lock: boolean) {
  if (typeof document === 'undefined') return
  document.body.style.overflow = lock ? 'hidden' : ''
}

watch(() => props.grant, (g) => {
  lockScroll(!!g)
  if (g) requestAnimationFrame(() => panelRef.value?.focus({ preventScroll: true }))
}, { immediate: true })

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') handleClose()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  lockScroll(false)
})

/* ── actions ─────────────────────────────────────────── */
function startEditing() {
  if (!props.grant) return
  editing.value = true
  editForm.title = props.grant.title || ''
  editForm.funder = props.grant.funder || ''
  editForm.description = props.grant.description || ''
  editForm.deadline = props.grant.deadline || ''
  editForm.amount_max = props.grant.amount_max || ''
  editForm.amount_min = ''
  editForm.currency = props.grant.currency || ''
  editForm.country = props.grant.country || ''
  editForm.url = (props.grant.grant_link || props.grant.source_link || props.grant.url || '') as string
  editForm.categories = (props.grant.categories || []).join(', ')
}

function cancelEditing() {
  editing.value = false
}

function handleSave() {
  if (!props.grant) return
  emit('save', props.grant.id, { ...editForm })
}

function handleClose() {
  if (editing.value) {
    editing.value = false
    return
  }
  emit('close')
}

function handleBackdropClick() {
  if (editing.value) return
  emit('close')
}

async function copyLink() {
  try {
    const url = window.location.href.split('#')[0] + '#grant-' + props.grant?.id
    await navigator.clipboard.writeText(url)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1600)
  } catch { /* clipboard unavailable */ }
}

async function handleAddComment() {
  const content = commentInput.value.trim()
  if (!content || !props.grant) return
  commentSending.value = true
  commentError.value = ''
  try {
    const result = await addComment(props.grant.id, content)
    if ('error' in result) {
      if (result.error) commentError.value = result.error
      return
    }
    comments.value.push(result.comment)
    commentInput.value = ''
  } catch {
    commentError.value = t('grantsPortal.commentError')
  } finally {
    commentSending.value = false
  }
}

async function handleDeleteComment(commentId: string) {
  try {
    await deleteComment(commentId)
    comments.value = comments.value.filter(c => c.id !== commentId)
  } catch {
    commentError.value = t('grantsPortal.commentDeleteError')
  }
}

/* ── presentation helpers ────────────────────────────── */
function typeGlyph(type?: string): string {
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

function formatType(type?: string): string {
  if (!type) return ''
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatHighlight(hl: string): string {
  return hl.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatAmount(val: number): string {
  if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M'
  if (val >= 1000) return (val / 1000).toFixed(val >= 10000 ? 0 : 1) + 'K'
  return val.toFixed(0)
}

function avatarInitial(c: GrantComment): string {
  const name = c.author_name || c.email || '?'
  return name.trim()[0]?.toUpperCase() || '?'
}

function avatarColor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360
  return `hsl(${h} 60% 45%)`
}

function relativeTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'now'
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  const days = Math.floor(h / 24)
  if (days < 7) return `${days}d`
  return d.toLocaleDateString()
}
</script>

<style scoped>
/* ── transition ── */
.gdm-enter-active, .gdm-leave-active { transition: opacity 0.28s ease; }
.gdm-enter-active .gdm-panel, .gdm-leave-active .gdm-panel { transition: transform 0.34s var(--ease-out-expo, cubic-bezier(0.16,1,0.3,1)), opacity 0.28s ease; }
.gdm-enter-from, .gdm-leave-to { opacity: 0; }
.gdm-enter-from .gdm-panel { transform: translateY(22px) scale(0.975); opacity: 0; }
.gdm-leave-to .gdm-panel { transform: translateY(12px) scale(0.98); opacity: 0; }

/* ── shell ── */
.gdm-overlay {
  position: fixed;
  inset: 0;
  z-index: 9100;
  isolation: isolate;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(0.5rem, 2.5vw, 1.5rem);
}
.gdm-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(4, 6, 8, 0.72);
  backdrop-filter: blur(14px) saturate(1.2);
  -webkit-backdrop-filter: blur(14px) saturate(1.2);
}
.gdm-panel {
  position: relative;
  width: min(58rem, 96vw);
  max-height: min(92dvh, 56rem);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: clamp(1rem, 2.5vw, 1.5rem);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  box-shadow: 0 32px 90px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.04) inset;
  outline: none;
}

/* ── hero ── */
.gdm-hero {
  position: relative;
  flex-shrink: 0;
  padding: clamp(1rem, 3vw, 1.6rem) clamp(1rem, 3vw, 1.6rem) 0;
  background:
    radial-gradient(120% 90% at 85% -20%, rgba(16, 185, 129, 0.16), transparent 55%),
    radial-gradient(120% 100% at 0% 0%, rgba(6, 182, 212, 0.14), transparent 55%),
    linear-gradient(180deg, var(--bg-tertiary), var(--bg-secondary));
  border-bottom: 1px solid var(--border-color);
  overflow: hidden;
}
.gdm-hero[data-tone="urgent"] { background: radial-gradient(120% 90% at 85% -20%, rgba(231, 76, 60, 0.2), transparent 55%), radial-gradient(120% 100% at 0% 0%, rgba(6,182,212,0.12), transparent 55%), linear-gradient(180deg, var(--bg-tertiary), var(--bg-secondary)); }
.gdm-hero[data-tone="soon"] { background: radial-gradient(120% 90% at 85% -20%, rgba(243, 156, 18, 0.18), transparent 55%), radial-gradient(120% 100% at 0% 0%, rgba(6,182,212,0.12), transparent 55%), linear-gradient(180deg, var(--bg-tertiary), var(--bg-secondary)); }
.gdm-hero-glow {
  position: absolute; inset: auto -20% -55% -20%; height: 70%;
  background: radial-gradient(50% 100% at 50% 100%, rgba(16,185,129,0.12), transparent 70%);
  pointer-events: none;
}
.gdm-hero-grid {
  position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: linear-gradient(var(--glass-border) 1px, transparent 1px), linear-gradient(90deg, var(--glass-border) 1px, transparent 1px);
  background-size: 28px 28px;
  mask-image: radial-gradient(80% 90% at 50% 0%, black, transparent 75%);
  -webkit-mask-image: radial-gradient(80% 90% at 50% 0%, black, transparent 75%);
}
.gdm-hero-top { position: relative; display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem; }
.gdm-badges { display: flex; flex-wrap: wrap; align-items: center; gap: 0.45rem; min-width: 0; }
.gdm-status, .gdm-type, .gdm-urgency {
  display: inline-flex; align-items: center; gap: 0.4rem;
  font-size: 0.68rem; font-weight: 800; letter-spacing: 0.07em; text-transform: uppercase;
  padding: 0.32rem 0.7rem; border-radius: 999px; border: 1px solid var(--border-color);
  background: var(--bg-secondary); color: var(--text-secondary); white-space: nowrap;
}
.gdm-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--success); box-shadow: 0 0 8px currentColor; }
.gdm-status[data-status="open"] { color: var(--success); border-color: color-mix(in srgb, var(--success) 35%, transparent); background: var(--success-bg); }
.gdm-status[data-status="open"] .gdm-dot { background: var(--success); color: var(--success); }
.gdm-status[data-status="pending"] { color: var(--warning); border-color: color-mix(in srgb, var(--warning) 35%, transparent); background: var(--warning-bg); }
.gdm-status[data-status="pending"] .gdm-dot { background: var(--warning); color: var(--warning); }
.gdm-status[data-status="closed"], .gdm-status[data-status="rejected"], .gdm-status[data-status="hidden"] { color: var(--danger); border-color: color-mix(in srgb, var(--danger) 35%, transparent); background: var(--danger-bg); }
.gdm-status[data-status="closed"] .gdm-dot, .gdm-status[data-status="rejected"] .gdm-dot { background: var(--danger); color: var(--danger); }
.gdm-type { text-transform: none; letter-spacing: 0.01em; font-weight: 700; }
.gdm-urgency[data-tone="urgent"] { color: var(--danger); background: var(--danger-bg); border-color: color-mix(in srgb, var(--danger) 40%, transparent); }
.gdm-urgency[data-tone="soon"] { color: var(--warning); background: var(--warning-bg); border-color: color-mix(in srgb, var(--warning) 40%, transparent); }
.gdm-urgency[data-tone="expired"] { color: var(--text-muted); background: var(--glass-border); }
.gdm-urgency[data-tone="open"] { color: var(--success); background: var(--success-bg); border-color: color-mix(in srgb, var(--success) 35%, transparent); }

.gdm-hero-actions { display: flex; align-items: center; gap: 0.4rem; flex-shrink: 0; }
.gdm-hero-main { position: relative; display: flex; gap: 1.25rem; align-items: flex-start; margin-top: 0.9rem; }
.gdm-title-wrap { flex: 1; min-width: 0; }
.gdm-eyebrow { font-size: 0.65rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-muted); margin: 0 0 0.4rem; }
.gdm-title {
  margin: 0; color: var(--text-primary);
  font-size: clamp(1.25rem, 3.4vw, 1.9rem); line-height: 1.12; font-weight: 800; letter-spacing: -0.02em;
  text-wrap: balance;
}
.gdm-meta { margin: 0.5rem 0 0; font-size: clamp(0.78rem, 1.8vw, 0.88rem); color: var(--text-muted); display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: baseline; }
.gdm-meta-strong { color: var(--text-secondary); font-weight: 700; }
.gdm-meta-sep { opacity: 0.5; }
.gdm-highlights { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.7rem; }
.gdm-hl {
  font-size: 0.62rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
  padding: 0.22rem 0.55rem; border-radius: 6px;
  background: var(--glass-border); color: var(--text-secondary); border: 1px solid var(--border-color);
}
.gdm-hl[data-hl="urgent"] { background: var(--danger-bg); color: var(--danger); border-color: color-mix(in srgb, var(--danger) 30%, transparent); }
.gdm-hl[data-hl="eg_core"], .gdm-hl[data-hl="open"], .gdm-hl[data-hl="high_value"], .gdm-hl[data-hl="has_amount"] { background: var(--success-bg); color: var(--success); border-color: color-mix(in srgb, var(--success) 30%, transparent); }
.gdm-hl[data-hl="soon"] { background: var(--warning-bg); color: var(--warning); border-color: color-mix(in srgb, var(--warning) 30%, transparent); }

/* score ring */
.gdm-score { position: relative; flex-shrink: 0; width: 76px; height: 76px; }
.gdm-ring { width: 100%; height: 100%; transform: rotate(-90deg); }
.gdm-ring-track { fill: none; stroke: var(--border-color); stroke-width: 5; }
.gdm-ring-fill { fill: none; stroke-width: 5; stroke-linecap: round; transition: stroke-dashoffset 0.6s ease; }
.gdm-ring-fill[data-tone="high"] { stroke: var(--success); }
.gdm-ring-fill[data-tone="mid"] { stroke: var(--warning); }
.gdm-ring-fill[data-tone="low"] { stroke: var(--text-muted); }
.gdm-score-text { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.gdm-score-text strong { font-size: 1.05rem; font-weight: 800; color: var(--text-primary); line-height: 1; font-variant-numeric: tabular-nums; }
.gdm-score-text span { font-size: 0.55rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); }

/* strip */
.gdm-strip {
  position: relative; margin-top: 1rem;
  display: grid; grid-template-columns: 1fr auto 1fr auto auto; align-items: center; gap: 0.9rem;
  background: var(--glass-bg); border: 1px solid var(--glass-border);
  border-radius: 1rem; padding: 0.8rem 1rem;
  box-shadow: var(--glass-shadow);
}
.gdm-strip-item { min-width: 0; display: flex; flex-direction: column; gap: 0.1rem; }
.gdm-strip-label { font-size: 0.62rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); }
.gdm-strip-value { font-size: clamp(0.9rem, 2.2vw, 1.05rem); font-weight: 800; color: var(--text-primary); letter-spacing: -0.01em; }
.gdm-strip-value[data-tone="urgent"] { color: var(--danger); }
.gdm-strip-value[data-tone="soon"] { color: var(--warning); }
.gdm-strip-value[data-tone="expired"] { color: var(--text-muted); }
.gdm-strip-sub { font-size: 0.75rem; color: var(--text-muted); font-variant-numeric: tabular-nums; }
.gdm-strip-divider { width: 1px; align-self: stretch; background: var(--border-color); opacity: 0.7; }
.gdm-strip-cta { align-items: flex-end; }
.gdm-apply {
  display: inline-flex; align-items: center; gap: 0.45rem;
  padding: 0.6rem 1.05rem; border-radius: 0.8rem;
  background: var(--success); color: #fff; font-size: 0.82rem; font-weight: 800; text-decoration: none;
  box-shadow: 0 8px 22px color-mix(in srgb, var(--success) 40%, transparent);
  transition: transform 0.15s ease, filter 0.15s ease;
  white-space: nowrap;
}
.gdm-apply:hover { filter: brightness(1.08); transform: translateY(-1px); }
.gdm-apply svg { width: 15px; height: 15px; }

/* tabs */
.gdm-tabs { position: relative; display: flex; gap: 0.25rem; margin-top: 0.9rem; padding-bottom: 0; }
.gdm-tab {
  position: relative; padding: 0.6rem 0.9rem; font-size: 0.8rem; font-weight: 800;
  color: var(--text-muted); background: none; border: none; cursor: pointer;
  border-bottom: 2px solid transparent; transition: color 0.15s;
  display: inline-flex; align-items: center; gap: 0.45rem;
}
.gdm-tab:hover { color: var(--text-primary); }
.gdm-tab.is-active { color: var(--text-primary); border-bottom-color: var(--success); }
.gdm-tab-count {
  min-width: 1.35rem; height: 1.35rem; padding: 0 0.35rem;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 999px; background: var(--glass-border); color: var(--text-secondary);
  font-size: 0.68rem; font-weight: 800; font-variant-numeric: tabular-nums;
}

/* ── body ── */
.gdm-body { flex: 1; min-height: 0; overflow-y: auto; padding: clamp(0.9rem, 2.5vw, 1.4rem); scrollbar-width: thin; }
.gdm-layout { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 0.9rem; align-items: start; }
.gdm-main { display: flex; flex-direction: column; gap: 0.9rem; min-width: 0; }
.gdm-side { display: flex; flex-direction: column; gap: 0.9rem; min-width: 0; position: sticky; top: 0; }

.gdm-card {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 1rem;
  padding: clamp(0.9rem, 2.2vw, 1.15rem);
  box-shadow: 0 2px 12px var(--shadow-color);
}
.gdm-card-title {
  margin: 0 0 0.55rem; display: flex; align-items: center; gap: 0.45rem;
  font-size: 0.68rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted);
}
.gdm-card-title svg { width: 15px; height: 15px; opacity: 0.7; }
.gdm-card-text { margin: 0; font-size: 0.88rem; line-height: 1.55; color: var(--text-secondary); }
.gdm-card-sub { margin: 0.3rem 0 0; font-size: 0.76rem; color: var(--text-muted); }
.gdm-desc { margin: 0; font-size: clamp(0.86rem, 2vw, 0.94rem); line-height: 1.65; color: var(--text-primary); text-wrap: pretty; white-space: pre-wrap; }
.gdm-chips { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.8rem; }
.gdm-chip {
  font-size: 0.72rem; font-weight: 700; color: var(--primary, #0e7490);
  background: color-mix(in srgb, var(--primary, #0e7490) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--primary, #0e7490) 22%, transparent);
  padding: 0.25rem 0.6rem; border-radius: 999px;
}
.gdm-dl { margin: 0; display: flex; flex-direction: column; gap: 0.5rem; }
.gdm-dl-row { display: flex; align-items: center; justify-content: space-between; gap: 0.8rem; font-size: 0.82rem; }
.gdm-dl-row dt { color: var(--text-muted); font-weight: 600; flex-shrink: 0; }
.gdm-dl-row dd { margin: 0; color: var(--text-primary); font-weight: 600; text-align: right; min-width: 0; display: flex; align-items: center; gap: 0.5rem; }
.gdm-meter { flex: 1; min-width: 64px; height: 6px; border-radius: 999px; background: var(--glass-border); overflow: hidden; display: inline-block; }
.gdm-meter-fill { display: block; height: 100%; background: linear-gradient(90deg, var(--primary, #0e7490), var(--success)); border-radius: 999px; }
.gdm-links { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.85rem; }
.gdm-link {
  display: inline-flex; align-items: center; gap: 0.35rem;
  font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); text-decoration: none;
  padding: 0.5rem 0.8rem; border-radius: 0.7rem; border: 1px solid var(--border-color); background: var(--bg-secondary);
  transition: border-color 0.15s, color 0.15s, transform 0.15s;
}
.gdm-link:hover { color: var(--text-primary); border-color: var(--text-muted); transform: translateY(-1px); }
.gdm-link svg { width: 13px; height: 13px; }
.gdm-link-primary { color: #fff; background: var(--success); border-color: transparent; box-shadow: 0 6px 18px color-mix(in srgb, var(--success) 35%, transparent); }
.gdm-link-primary:hover { color: #fff; filter: brightness(1.07); border-color: transparent; }
.mono { font-variant-numeric: tabular-nums; font-feature-settings: "tnum"; }
.truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 14rem; }
.capitalize { text-transform: capitalize; }

/* deadline tone card */
.gdm-tone-card[data-tone="urgent"] { border-color: color-mix(in srgb, var(--danger) 40%, transparent); background: linear-gradient(180deg, var(--danger-bg), var(--bg-tertiary) 70%); }
.gdm-tone-card[data-tone="soon"] { border-color: color-mix(in srgb, var(--warning) 40%, transparent); background: linear-gradient(180deg, var(--warning-bg), var(--bg-tertiary) 70%); }
.gdm-deadline-big { margin: 0; font-size: 1.05rem; font-weight: 800; color: var(--text-primary); letter-spacing: -0.01em; }
.gdm-progress { margin-top: 0.6rem; height: 7px; border-radius: 999px; background: var(--glass-border); overflow: hidden; }
.gdm-progress-fill { display: block; height: 100%; border-radius: 999px; transition: width 0.5s ease; }
.gdm-progress-fill[data-tone="urgent"], .gdm-progress-fill[data-tone="expired"] { background: var(--danger); }
.gdm-progress-fill[data-tone="soon"] { background: var(--warning); }
.gdm-progress-fill[data-tone="open"] { background: var(--success); }
.gdm-progress-fill[data-tone="neutral"] { background: var(--text-muted); }

/* stars */
.gdm-stars { display: flex; gap: 0.15rem; }
.gdm-star {
  background: none; border: none; cursor: pointer; padding: 0.2rem;
  color: var(--border-color); transition: transform 0.12s ease, color 0.12s ease;
  border-radius: 6px;
}
.gdm-star svg { width: clamp(20px, 4.5vw, 24px); height: clamp(20px, 4.5vw, 24px); display: block; }
.gdm-star:hover, .gdm-star:focus-visible { transform: scale(1.18) rotate(-4deg); }
.gdm-star.is-on { color: #f5b301; filter: drop-shadow(0 0 6px rgba(245, 179, 1, 0.45)); }
.gdm-star.is-hover { color: #ffd23e; }
.gdm-link-btn { margin-top: 0.4rem; background: none; border: none; cursor: pointer; font-size: 0.74rem; font-weight: 700; color: var(--text-muted); padding: 0; }
.gdm-link-btn:hover { color: var(--text-primary); }
.gdm-grabber { display: none; }
.gdm-send-icon { display: none; }

/* ── discussion ── */
.gdm-discussion { display: flex; flex-direction: column; gap: 0.8rem; }
.gdm-comments { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.6rem; }
.gdm-comment {
  display: flex; gap: 0.7rem; align-items: flex-start;
  background: var(--bg-tertiary); border: 1px solid var(--border-color);
  border-radius: 0.9rem; padding: 0.75rem 0.85rem;
}
.gdm-avatar {
  flex-shrink: 0; width: 2.1rem; height: 2.1rem; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: var(--av, #0e7490); color: #fff; font-size: 0.85rem; font-weight: 800;
}
.gdm-comment-body { flex: 1; min-width: 0; }
.gdm-comment-head { display: flex; align-items: baseline; gap: 0.5rem; }
.gdm-comment-author { font-size: 0.8rem; font-weight: 800; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gdm-comment-time { font-size: 0.68rem; color: var(--text-muted); flex-shrink: 0; font-variant-numeric: tabular-nums; }
.gdm-comment-text { margin: 0.25rem 0 0; font-size: 0.85rem; line-height: 1.55; color: var(--text-secondary); overflow-wrap: anywhere; }
.gdm-comment-del {
  flex-shrink: 0; border: none; background: none; cursor: pointer; padding: 0.3rem; border-radius: 6px;
  color: var(--text-muted); transition: color 0.15s, background 0.15s;
}
.gdm-comment-del:hover { color: var(--danger); background: var(--danger-bg); }
.gdm-comment-del svg { width: 13px; height: 13px; display: block; }
.gdm-empty {
  text-align: center; padding: 2.2rem 1rem;
  border: 1.5px dashed var(--border-color); border-radius: 1rem; background: var(--bg-tertiary);
}
.gdm-empty-icon { width: 2.8rem; height: 2.8rem; margin: 0 auto 0.7rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--glass-border); color: var(--text-muted); }
.gdm-empty-icon svg { width: 1.4rem; height: 1.4rem; }
.gdm-empty-title { margin: 0; font-weight: 800; color: var(--text-primary); font-size: 0.95rem; }
.gdm-empty-sub { margin: 0.3rem 0 0; font-size: 0.8rem; color: var(--text-muted); }
.gdm-skel-list { display: flex; flex-direction: column; gap: 0.6rem; }
.gdm-skel-row { display: flex; gap: 0.7rem; align-items: center; padding: 0.75rem; border-radius: 0.9rem; background: var(--bg-tertiary); border: 1px solid var(--border-color); }
.gdm-skel-avatar { width: 2.1rem; height: 2.1rem; border-radius: 50%; background: var(--glass-border); animation: gdm-pulse 1.4s ease-in-out infinite; }
.gdm-skel-lines { flex: 1; display: flex; flex-direction: column; gap: 0.4rem; }
.gdm-skel-lines div { height: 0.6rem; border-radius: 4px; background: var(--glass-border); animation: gdm-pulse 1.4s ease-in-out infinite; }
.gdm-skel-lines div:last-child { width: 60%; }
@keyframes gdm-pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }

/* ── edit ── */
.gdm-title-input {
  width: 100%; background: transparent; border: none; border-bottom: 2px solid color-mix(in srgb, var(--success) 50%, transparent);
  color: var(--text-primary); font-size: clamp(1.2rem, 3.2vw, 1.7rem); font-weight: 800; letter-spacing: -0.02em;
  padding: 0.1rem 0 0.35rem; outline: none;
}
.gdm-edit { display: flex; flex-direction: column; gap: 0.9rem; }
.gdm-form-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.7rem; }
.gdm-field { display: flex; flex-direction: column; gap: 0.35rem; min-width: 0; }
.gdm-span-2 { grid-column: span 2; }
.gdm-field-label { font-size: 0.62rem; font-weight: 800; letter-spacing: 0.09em; text-transform: uppercase; color: var(--text-muted); }
.gdm-input {
  width: 100%; padding: 0.65rem 0.85rem; border-radius: 0.7rem;
  background: var(--bg-secondary); border: 1px solid var(--border-color);
  color: var(--text-primary); font-size: 0.86rem; outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.gdm-input:focus { border-color: var(--success); box-shadow: 0 0 0 3px color-mix(in srgb, var(--success) 18%, transparent); }
.gdm-input::placeholder { color: var(--text-muted); opacity: 0.7; }
.gdm-textarea { resize: vertical; min-height: 6.5rem; font-family: inherit; line-height: 1.55; }
.gdm-alert { font-size: 0.78rem; font-weight: 600; padding: 0.6rem 0.85rem; border-radius: 0.7rem; }
.gdm-alert-error { color: var(--danger); background: var(--danger-bg); border: 1px solid color-mix(in srgb, var(--danger) 35%, transparent); }

/* ── footer ── */
.gdm-footer {
  flex-shrink: 0; border-top: 1px solid var(--border-color);
  background: color-mix(in srgb, var(--bg-secondary) 88%, transparent);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  padding: 0.75rem clamp(0.9rem, 2.5vw, 1.4rem);
}
.gdm-footer-row { display: flex; justify-content: flex-end; align-items: center; gap: 0.6rem; }
.gdm-composer { display: flex; gap: 0.55rem; }
.gdm-composer-input {
  flex: 1; min-width: 0; padding: 0.65rem 0.9rem; border-radius: 0.8rem;
  background: var(--bg-tertiary); border: 1px solid var(--border-color);
  color: var(--text-primary); font-size: 0.85rem; outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.gdm-composer-input:focus { border-color: var(--success); box-shadow: 0 0 0 3px color-mix(in srgb, var(--success) 16%, transparent); }
.gdm-composer-input::placeholder { color: var(--text-muted); }
.gdm-signin-hint { margin: 0; text-align: center; font-size: 0.78rem; color: var(--text-muted); }

/* buttons */
.gdm-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem;
  font-size: 0.8rem; font-weight: 800; cursor: pointer; text-decoration: none;
  padding: 0.6rem 1.1rem; border-radius: 0.75rem; border: 1px solid transparent;
  transition: transform 0.14s ease, filter 0.14s ease, background 0.14s ease, border-color 0.14s ease;
  white-space: nowrap;
}
.gdm-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }
.gdm-btn svg { width: 15px; height: 15px; }
.gdm-btn-primary { background: var(--success); color: #fff; box-shadow: 0 8px 20px color-mix(in srgb, var(--success) 35%, transparent); }
.gdm-btn-primary:hover:not(:disabled) { filter: brightness(1.08); transform: translateY(-1px); }
.gdm-btn-muted { background: var(--glass-border); color: var(--text-secondary); border-color: var(--border-color); }
.gdm-btn-muted:hover { color: var(--text-primary); border-color: var(--text-muted); }
.gdm-btn-ghost {
  background: var(--glass-bg); border: 1px solid var(--glass-border);
  color: var(--text-secondary); padding: 0.45rem 0.75rem; font-size: 0.72rem;
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
}
.gdm-btn-ghost:hover { color: var(--text-primary); border-color: var(--text-muted); }
.gdm-btn-icon { padding: 0.45rem; border-radius: 50%; width: 2rem; height: 2rem; }
.gdm-btn-text { display: inline; }
.gdm-spin { animation: gdm-spin 0.9s linear infinite; }
@keyframes gdm-spin { to { transform: rotate(360deg); } }

/* ── responsive ── */
@media (max-width: 860px) {
  .gdm-layout { grid-template-columns: 1fr; }
  .gdm-side { position: static; display: flex; }
  /* keep rating usable: horizontal scroll instead of squeeze */
  .gdm-stars { overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
  .gdm-stars::-webkit-scrollbar { display: none; }
}
@media (max-width: 640px) {
  /* bottom-sheet shell */
  .gdm-overlay { padding: 0; align-items: flex-end; }
  .gdm-panel {
    width: 100%;
    max-height: 94dvh;
    border-radius: 1.25rem 1.25rem 0 0;
    border-left: none; border-right: none; border-bottom: none;
  }
  .gdm-panel.is-dragging { transition: none; }
  .gdm-grabber {
    display: flex; justify-content: center;
    padding: 0.5rem 0 0.1rem;
    touch-action: none;
  }
  .gdm-grabber span {
    width: 2.5rem; height: 0.28rem; border-radius: 999px;
    background: var(--border-color);
  }

  /* compact hero: less chrome, more content */
  .gdm-hero { padding: 0.2rem 0.85rem 0; }
  .gdm-hero-grid, .gdm-hero-glow { display: none; }
  .gdm-hero-top { align-items: center; gap: 0.5rem; }
  .gdm-badges {
    flex-wrap: nowrap; overflow-x: auto; gap: 0.35rem;
    scrollbar-width: none; -webkit-overflow-scrolling: touch;
    padding-bottom: 0.15rem; margin-right: -0.4rem;
  }
  .gdm-badges::-webkit-scrollbar { display: none; }
  .gdm-status, .gdm-type, .gdm-urgency { flex-shrink: 0; font-size: 0.62rem; padding: 0.3rem 0.6rem; }
  .gdm-hero-actions { gap: 0.3rem; }
  .gdm-btn-text { display: none; }
  .gdm-btn-ghost { padding: 0.45rem; min-width: 2.5rem; min-height: 2.5rem; }
  .gdm-btn-icon { width: 2.5rem; height: 2.5rem; }

  .gdm-hero-main { gap: 0.75rem; margin-top: 0.65rem; align-items: center; }
  .gdm-title { font-size: 1.12rem; line-height: 1.2; }
  .gdm-meta { font-size: 0.76rem; margin-top: 0.35rem; }
  .gdm-highlights { margin-top: 0.5rem; gap: 0.3rem; }
  .gdm-hl { font-size: 0.58rem; }
  .gdm-score { width: 54px; height: 54px; }
  .gdm-score-text strong { font-size: 0.9rem; }
  .gdm-score-text span { font-size: 0.48rem; }

  /* funding strip: tighter 2-up + full-width CTA */
  .gdm-strip { grid-template-columns: 1fr 1fr; gap: 0.6rem 0.8rem; padding: 0.7rem 0.8rem; border-radius: 0.9rem; margin-top: 0.75rem; }
  .gdm-strip-divider { display: none; }
  .gdm-strip-label { font-size: 0.58rem; }
  .gdm-strip-value { font-size: 0.88rem; overflow: hidden; text-overflow: ellipsis; }
  .gdm-strip-sub { font-size: 0.7rem; }
  .gdm-strip-cta { grid-column: 1 / -1; align-items: stretch; }
  .gdm-apply { justify-content: center; width: 100%; min-height: 2.75rem; font-size: 0.86rem; }

  /* segmented tabs with 44px targets */
  .gdm-tabs { gap: 0.4rem; margin-top: 0.7rem; background: var(--glass-border); border-radius: 0.8rem; padding: 0.25rem; }
  .gdm-tab {
    flex: 1; justify-content: center; min-height: 2.75rem;
    font-size: 0.82rem; border-bottom: none; border-radius: 0.6rem; padding: 0.5rem;
    -webkit-tap-highlight-color: transparent;
  }
  .gdm-tab.is-active { background: var(--bg-tertiary); color: var(--text-primary); box-shadow: 0 1px 6px var(--shadow-color); }

  /* body: thumb-friendly rhythm */
  .gdm-body {
    padding: 0.75rem;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
  }
  .gdm-layout, .gdm-main, .gdm-side, .gdm-discussion { gap: 0.65rem; }
  .gdm-card { border-radius: 0.9rem; padding: 0.85rem; }
  .gdm-desc { font-size: 0.9rem; line-height: 1.6; }
  .gdm-dl-row { font-size: 0.84rem; }
  .gdm-links .gdm-link { min-height: 2.75rem; }

  /* stars: big tap targets, scroll if needed */
  .gdm-stars { gap: 0; margin: 0 -0.2rem; }
  .gdm-star { padding: 0.35rem 0.2rem; min-width: 2.25rem; min-height: 2.75rem; -webkit-tap-highlight-color: transparent; }
  .gdm-star svg { width: 24px; height: 24px; margin: 0 auto; }
  .gdm-star:hover { transform: none; }
  .gdm-star:active { transform: scale(1.25); }

  /* footer: safe-area aware sticky bar */
  .gdm-footer { padding: 0.65rem 0.75rem calc(0.65rem + env(safe-area-inset-bottom, 0px)); }
  .gdm-footer-row { gap: 0.55rem; }
  .gdm-footer-row .gdm-btn-muted { flex: 0 0 auto; min-height: 3rem; padding: 0.6rem 1rem; }
  .gdm-footer-row .gdm-btn-primary { flex: 1; min-height: 3rem; }
  .gdm-composer { gap: 0.5rem; align-items: center; }
  .gdm-composer-input { min-height: 3rem; font-size: 1rem; border-radius: 0.9rem; }
  .gdm-send { flex-shrink: 0; width: 3rem; height: 3rem; padding: 0; border-radius: 50%; }
  .gdm-send-label { display: none; }
  .gdm-send-icon { display: block; width: 18px; height: 18px; }

  /* comments: roomier rows, easier delete */
  .gdm-comment { padding: 0.7rem; border-radius: 0.85rem; }
  .gdm-comment-del { min-width: 2.5rem; min-height: 2.5rem; display: flex; align-items: center; justify-content: center; }
  .gdm-comment-del svg { width: 15px; height: 15px; }

  /* edit form single column */
  .gdm-form-grid { grid-template-columns: 1fr; }
  .gdm-span-2 { grid-column: span 1; }
  .gdm-input { min-height: 2.9rem; font-size: 1rem; }
  .gdm-title-input { font-size: 1.2rem; }

  /* sheet enter/exit: slide up, not scale */
  .gdm-enter-from .gdm-panel { transform: translateY(48px); opacity: 1; }
  .gdm-leave-to .gdm-panel { transform: translateY(32px); opacity: 1; }
}
@media (max-width: 380px) {
  .gdm-title { font-size: 1.02rem; }
  .gdm-strip { padding: 0.6rem; }
  .gdm-star { min-width: 2rem; }
  .gdm-star svg { width: 21px; height: 21px; }
}

@media (prefers-reduced-motion: reduce) {
  .gdm-enter-active, .gdm-leave-active,
  .gdm-enter-active .gdm-panel, .gdm-leave-active .gdm-panel,
  .gdm-star, .gdm-btn, .gdm-apply, .gdm-link { transition: none; }
}
</style>
