<template>
  <div class="claims-table-wrapper">
    <div class="claims-table-header">
      <div class="claims-table-title">
        <h3 class="claims-heading">{{ t('grantsPortal.claimsManagement') }}</h3>
        <span class="claims-count">{{ claims.length }} {{ claims.length === 1 ? 'claim' : 'claims' }}</span>
      </div>
      <div class="claims-filters">
        <button
          v-for="f in statusFilters"
          :key="f.key"
          class="claims-filter-btn"
          :class="{ active: activeFilter === f.key }"
          @click="activeFilter = f.key"
        >
          {{ f.label }}
          <span class="claims-filter-count">{{ f.count }}</span>
        </button>
      </div>
    </div>

    <div v-if="loading" class="claims-loading">
      <div class="claims-loading-dot" />
      <span>{{ t('grantsPortal.loading') }}</span>
    </div>

    <div v-else-if="filteredClaims.length === 0" class="claims-empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="claims-empty-icon"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
      <p>{{ t('grantsPortal.noClaimsFound') }}</p>
    </div>

    <div v-else class="claims-list">
      <div
        v-for="claim in filteredClaims"
        :key="claim.id"
        class="claims-row"
        :class="claim.status"
      >
        <div class="claims-row-main">
          <div class="claims-row-info">
            <span class="claims-row-project">{{ claim.project_title || 'Unknown Project' }}</span>
            <span class="claims-row-email">{{ claim.user_email }}</span>
          </div>
          <div class="claims-row-meta">
            <span class="claims-row-date">{{ formatDate(claim.created_at) }}</span>
            <span class="claims-row-status" :class="claim.status">{{ claim.status }}</span>
          </div>
        </div>
        <p v-if="claim.claim_note" class="claims-row-note">{{ claim.claim_note }}</p>
        <div v-if="claim.status === 'pending'" class="claims-row-actions">
          <button class="claims-action-btn approve" @click="$emit('review', claim)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
            {{ t('grantsPortal.review') }}
          </button>
        </div>
        <div v-if="claim.review_note" class="claims-row-review">
          <span class="claims-review-label">{{ t('grantsPortal.reviewNote') }}:</span>
          <span class="claims-review-text">{{ claim.review_note }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ClaimRecord } from '~/lib/types'
import { useI18n } from '~/composables/useI18n'

const props = defineProps<{
  claims: ClaimRecord[]
  loading: boolean
}>()

defineEmits<{
  review: [claim: ClaimRecord]
}>()

const { t } = useI18n()
const activeFilter = ref('all')

const statusFilters = computed(() => {
  const all = props.claims.length
  const pending = props.claims.filter(c => c.status === 'pending').length
  const approved = props.claims.filter(c => c.status === 'approved').length
  const rejected = props.claims.filter(c => c.status === 'rejected').length
  return [
    { key: 'all', label: 'All', count: all },
    { key: 'pending', label: 'Pending', count: pending },
    { key: 'approved', label: 'Approved', count: approved },
    { key: 'rejected', label: 'Rejected', count: rejected },
  ]
})

const filteredClaims = computed(() => {
  if (activeFilter.value === 'all') return props.claims
  return props.claims.filter(c => c.status === activeFilter.value)
})

function formatDate(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>

<style scoped>
.claims-table-wrapper {
  width: 100%;
}

.claims-table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.claims-table-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.claims-heading {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  margin: 0;
}

.claims-count {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.06);
  padding: 2px 8px;
  border-radius: 9999px;
}

.claims-filters {
  display: flex;
  gap: 6px;
}

.claims-filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 9999px;
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.claims-filter-btn:hover {
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.7);
}

.claims-filter-btn.active {
  background: rgba(0, 255, 133, 0.1);
  color: #00ff85;
  border-color: rgba(0, 255, 133, 0.25);
}

.claims-filter-count {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.06);
}

.claims-filter-btn.active .claims-filter-count {
  background: rgba(0, 255, 133, 0.15);
}

.claims-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 13px;
}

.claims-loading-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent, #00ff85);
  animation: pulse-dot 1s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.3); }
}

.claims-empty {
  text-align: center;
  padding: 40px 20px;
  color: rgba(255, 255, 255, 0.3);
}

.claims-empty-icon {
  width: 40px;
  height: 40px;
  margin-bottom: 12px;
  opacity: 0.3;
}

.claims-empty p {
  font-size: 14px;
  margin: 0;
}

.claims-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.claims-row {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 14px 16px;
  transition: border-color 0.2s;
}

.claims-row:hover {
  border-color: rgba(255, 255, 255, 0.1);
}

.claims-row.approved {
  border-left: 3px solid rgba(0, 255, 133, 0.4);
}

.claims-row.rejected {
  border-left: 3px solid rgba(239, 68, 68, 0.4);
}

.claims-row.pending {
  border-left: 3px solid rgba(250, 204, 21, 0.4);
}

.claims-row-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.claims-row-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.claims-row-project {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.claims-row-email {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.claims-row-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.claims-row-date {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
}

.claims-row-status {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.5);
}

.claims-row-status.pending {
  background: rgba(250, 204, 21, 0.1);
  color: #facc15;
}

.claims-row-status.approved {
  background: rgba(0, 255, 133, 0.1);
  color: #00ff85;
}

.claims-row-status.rejected {
  background: rgba(239, 68, 68, 0.1);
  color: #f87171;
}

.claims-row-note {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.5;
  margin: 10px 0 0;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 6px;
}

.claims-row-actions {
  margin-top: 10px;
  display: flex;
  gap: 6px;
}

.claims-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.claims-action-btn svg {
  width: 14px;
  height: 14px;
}

.claims-action-btn.approve:hover {
  background: rgba(0, 255, 133, 0.1);
  border-color: rgba(0, 255, 133, 0.3);
  color: #00ff85;
}

.claims-row-review {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  font-size: 12px;
}

.claims-review-label {
  color: rgba(255, 255, 255, 0.4);
}

.claims-review-text {
  color: rgba(255, 255, 255, 0.6);
  margin-left: 4px;
}

@media (max-width: 640px) {
  .claims-row-main {
    flex-direction: column;
    gap: 8px;
  }

  .claims-row-meta {
    width: 100%;
    justify-content: space-between;
  }

  .claims-filters {
    flex-wrap: wrap;
  }
}
</style>
