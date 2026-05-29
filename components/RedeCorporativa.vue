<template>
  <Transition name="slide-panel">
    <div v-if="visible" class="rede-overlay" @click.self="close">
      <div class="rede-panel">
        <div class="rede-header">
          <div class="rede-header-left">
            <span class="rede-badge">REDE CORPORATIVA</span>
            <h2 class="rede-title">Corporate Network</h2>
            <p class="rede-subtitle">Shareholders, subsidiaries, joint ventures & board interlocks</p>
          </div>
          <button class="rede-close" @click="close" aria-label="Close">&times;</button>
        </div>

        <!-- Network Stats -->
        <div class="rede-stats-row">
          <div class="rede-stat">
            <span class="rede-stat-value">16</span>
            <span class="rede-stat-label">Enterprises</span>
          </div>
          <div class="rede-stat">
            <span class="rede-stat-value">{{ connections.length }}</span>
            <span class="rede-stat-label">Connections</span>
          </div>
          <div class="rede-stat">
            <span class="rede-stat-value">8</span>
            <span class="rede-stat-label">Countries</span>
          </div>
          <div class="rede-stat">
            <span class="rede-stat-value">{{ totalClaims }}</span>
            <span class="rede-stat-label">Total Claims</span>
          </div>
        </div>

        <!-- Connection type filter -->
        <div class="rede-filter-row">
          <button
            v-for="t in connectionTypes" :key="t.key"
            :class="['rede-filter-btn', { active: activeFilter === t.key }]"
            @click="activeFilter = t.key"
          >{{ t.label }} ({{ t.count }})</button>
        </div>

        <!-- Connection graph visual -->
        <div class="rede-graph">
          <div class="rede-graph-note">
            <span class="dot shareholding" /> Shareholding
            <span class="dot subsidiary" /> Subsidiary
            <span class="dot joint_venture" /> Joint Venture
            <span class="dot board_overlap" /> Board Overlap
            <span class="dot partnership" /> Partnership
          </div>
          <div class="rede-flow">
            <div v-for="conn in filteredConnections" :key="conn.from + conn.to" class="rede-conn-row" @click="focusEnterprise(conn.from)">
              <div class="rede-conn-from">
                <div class="enterprise-badge" :style="{ background: getColor(conn.from), color: '#fff' }">
                  {{ conn.from.slice(0, 2) }}
                </div>
                <span class="enterprise-name">{{ conn.from }}</span>
              </div>
              <div class="rede-conn-type">
                <div class="conn-line" :class="conn.type">
                  <div class="conn-arrow" />
                </div>
                <span class="conn-label">{{ conn.label }}</span>
              </div>
              <div class="rede-conn-to">
                <div class="enterprise-badge" :style="{ background: getColor(conn.to), color: '#fff' }">
                  {{ conn.to.slice(0, 2) }}
                </div>
                <span class="enterprise-name">{{ conn.to }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Enterprise detail -->
        <div v-if="focusedEnterprise" class="rede-detail">
          <div class="rede-detail-header">
            <h3>{{ focusedEnterprise.name }}</h3>
            <div class="rede-detail-meta">
              <span>{{ focusedEnterprise.country }} · {{ focusedEnterprise.sector }}</span>
              <span v-if="focusedEnterprise.ticker">· {{ focusedEnterprise.ticker }}</span>
            </div>
          </div>
          <p class="rede-detail-desc">{{ focusedEnterprise.description }}</p>
          <div v-if="focusedEnterprise.subsidiaries.length" class="rede-detail-section">
            <h4>Subsidiaries</h4>
            <div class="rede-tags">
              <span v-for="s in focusedEnterprise.subsidiaries" :key="s" class="tag subsidiary">{{ s }}</span>
            </div>
          </div>
          <div v-if="focusedEnterprise.shareholders.length" class="rede-detail-section">
            <h4>Shareholders</h4>
            <div v-for="(sh, shi) in focusedEnterprise.shareholders" :key="shi" class="rede-sh-row">
              <span class="sh-name">{{ sh }}</span>
            </div>
          </div>
          <div v-if="focusedEnterprise.holdings.length" class="rede-detail-section">
            <h4>Holdings / Projects</h4>
            <div class="rede-tags">
              <span v-for="h in focusedEnterprise.holdings" :key="h" class="tag holding">{{ h }}</span>
            </div>
          </div>
        </div>

        <!-- Connection explanation -->
        <div class="rede-education">
          <h3>🌐 Understanding the Network</h3>
          <div class="edu-grid">
            <div class="edu-card">
              <h4>Shareholding</h4>
              <p>Institutional investors (BlackRock, Vanguard, etc.) that own stakes across multiple mining companies, creating de facto coordination without formal collusion.</p>
            </div>
            <div class="edu-card">
              <h4>Subsidiary</h4>
              <p>Wholly or partially owned companies that extend the parent company's reach into new jurisdictions or mineral types — often used to limit legal liability.</p>
            </div>
            <div class="edu-card">
              <h4>Board Overlap</h4>
              <p>Directors who sit on multiple company boards, enabling information flow and strategic coordination. Dr. Paul Woolrich is the most connected example.</p>
            </div>
            <div class="edu-card">
              <h4>Joint Venture</h4>
              <p>Shared risk arrangements between companies for specific projects. Often reveal strategic partnerships that go beyond individual claims.</p>
            </div>
          </div>
          <div class="edu-callout">
            <strong>💡 Key Insight:</strong> The "free market" narrative hides a tightly coordinated network where capital, information, and strategic decisions flow through a small group of interconnected actors — mostly based in Australia, London, and New York — extracting value from Brazilian territory.
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ENTERPRISES, CORPORATE_CONNECTIONS, type EnterpriseHQ, type CorporateConnection } from '@/lib/enterprise-data'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ close: []; flyToEnterprise: [_name: string] }>()
const close = () => emit('close')

const activeFilter = ref<string>('all')
const focusedEnterprise = ref<EnterpriseHQ | null>(null)

const connections = CORPORATE_CONNECTIONS
const totalClaims = computed(() => {
  return ENTERPRISES.reduce((sum, e) => {
    return sum + (e.holdings?.length || 0)
  }, 0)
})

const connectionTypes = computed(() => {
  const types = ['all', ...new Set(connections.map(c => c.type))]
  return types.map(t => ({
    key: t,
    label: t === 'all' ? 'All' : t.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
    count: t === 'all' ? connections.length : connections.filter(c => c.type === t).length,
  }))
})

const filteredConnections = computed(() => {
  if (activeFilter.value === 'all') return connections
  return connections.filter(c => c.type === activeFilter.value)
})

function getColor(name: string): string {
  const e = ENTERPRISES.find(ent => ent.name === name || name.startsWith(ent.name.split(' ')[0]))
  return e?.color || '#666'
}

function focusEnterprise(name: string) {
  focusedEnterprise.value = ENTERPRISES.find(e => e.name === name) || null
}
</script>

<style scoped>
.rede-overlay {
  position: fixed;
  inset: 0;
  z-index: 2147483646;
  background: rgba(0,0,0,0.8);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 0;
}
.rede-panel {
  width: 480px;
  max-width: 100vw;
  height: 100vh;
  background: #0a0a0f;
  border-left: 1px solid rgba(255,255,255,0.06);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
.rede-header {
  padding: 24px 20px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.rede-badge {
  display: inline-block;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.12em;
  padding: 3px 8px;
  border-radius: 3px;
  background: rgba(231,76,60,0.15);
  color: #e74c3c;
  margin-bottom: 8px;
}
.rede-title {
  font-size: 20px;
  font-weight: 800;
  color: #f0f0f0;
  margin: 0 0 4px;
}
.rede-subtitle {
  font-size: 11px;
  color: #777;
  margin: 0;
}
.rede-close {
  width: 36px;
  height: 36px;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 50%;
  background: transparent;
  color: #888;
  font-size: 22px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.rede-close:hover {
  background: rgba(231,76,60,0.1);
  color: #e74c3c;
}

/* Stats */
.rede-stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.rede-stat {
  text-align: center;
}
.rede-stat-value {
  display: block;
  font-size: 24px;
  font-weight: 900;
  color: #e74c3c;
}
.rede-stat-label {
  font-size: 9px;
  color: #777;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Filter */
.rede-filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 10px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.rede-filter-btn {
  padding: 4px 10px;
  font-size: 9px;
  font-weight: 600;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.08);
  background: transparent;
  color: #888;
  cursor: pointer;
  transition: all 0.2s;
}
.rede-filter-btn.active {
  background: rgba(231,76,60,0.15);
  border-color: rgba(231,76,60,0.3);
  color: #e74c3c;
}
.rede-filter-btn:hover { border-color: rgba(255,255,255,0.15); }

/* Graph */
.rede-graph {
  flex: 1;
  padding: 16px 20px;
  overflow-y: auto;
}
.rede-graph-note {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 9px;
  color: #888;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 3px;
  vertical-align: middle;
}
.dot.shareholding { background: #e74c3c; }
.dot.subsidiary { background: #3498db; }
.dot.joint_venture { background: #27ae60; }
.dot.board_overlap { background: #8e44ad; }
.dot.partnership { background: #f39c12; }

.rede-flow {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.rede-conn-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.04);
  cursor: pointer;
  transition: all 0.15s;
}
.rede-conn-row:hover {
  background: rgba(255,255,255,0.03);
  border-color: rgba(255,255,255,0.08);
}
.rede-conn-from, .rede-conn-to {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}
.rede-conn-to { justify-content: flex-end; }
.enterprise-badge {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 800;
  flex-shrink: 0;
}
.enterprise-name {
  font-size: 10px;
  color: #ccc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rede-conn-type {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  width: 60px;
}
.conn-line {
  width: 40px;
  height: 2px;
  position: relative;
}
.conn-line.shareholding { background: #e74c3c; }
.conn-line.subsidiary { background: #3498db; }
.conn-line.joint_venture { background: #27ae60; }
.conn-line.board_overlap { background: #8e44ad; }
.conn-line.partnership { background: #f39c12; }
.conn-arrow {
  position: absolute;
  right: -3px;
  top: -3px;
  width: 0; height: 0;
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  border-left: 6px solid;
}
.conn-line.shareholding .conn-arrow { border-left-color: #e74c3c; }
.conn-line.subsidiary .conn-arrow { border-left-color: #3498db; }
.conn-line.joint_venture .conn-arrow { border-left-color: #27ae60; }
.conn-line.board_overlap .conn-arrow { border-left-color: #8e44ad; }
.conn-line.partnership .conn-arrow { border-left-color: #f39c12; }
.conn-label {
  font-size: 7px;
  color: #666;
  text-align: center;
  line-height: 1.2;
}

/* Detail */
.rede-detail {
  padding: 16px 20px;
  border-top: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.02);
}
.rede-detail-header h3 {
  font-size: 15px;
  font-weight: 700;
  color: #f0f0f0;
  margin: 0;
}
.rede-detail-meta {
  font-size: 10px;
  color: #888;
  margin-top: 2px;
}
.rede-detail-desc {
  font-size: 11px;
  color: #999;
  line-height: 1.5;
  margin: 8px 0;
}
.rede-detail-section {
  margin-top: 10px;
}
.rede-detail-section h4 {
  font-size: 10px;
  font-weight: 700;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0 0 6px;
}
.rede-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.tag {
  font-size: 9px;
  padding: 3px 8px;
  border-radius: 4px;
  font-weight: 600;
}
.tag.subsidiary { background: rgba(52,152,219,0.12); color: #5dade2; }
.tag.holding { background: rgba(46,204,113,0.12); color: #58d68d; }
.rede-sh-row {
  display: flex;
  justify-content: space-between;
  padding: 3px 0;
  font-size: 10px;
  border-bottom: 1px solid rgba(255,255,255,0.03);
}
.sh-name { color: #ccc; }
.sh-stake { color: #e74c3c; font-weight: 700; }

/* Education */
.rede-education {
  padding: 16px 20px 24px;
  border-top: 1px solid rgba(255,255,255,0.06);
}
.rede-education h3 {
  font-size: 13px;
  font-weight: 700;
  color: #ccc;
  margin: 0 0 10px;
}
.edu-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
.edu-card {
  padding: 10px;
  border-radius: 6px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.04);
}
.edu-card h4 {
  font-size: 10px;
  font-weight: 700;
  color: #e74c3c;
  margin: 0 0 4px;
}
.edu-card p {
  font-size: 9px;
  color: #888;
  line-height: 1.4;
  margin: 0;
}
.edu-callout {
  margin-top: 10px;
  padding: 10px;
  background: rgba(231,76,60,0.06);
  border-left: 3px solid #e74c3c;
  border-radius: 4px;
  font-size: 10px;
  color: #aaa;
  line-height: 1.5;
}

/* Transition */
.slide-panel-enter-active { transition: all 0.3s ease; }
.slide-panel-leave-active { transition: all 0.2s ease; }
.slide-panel-enter-from, .slide-panel-leave-to { opacity: 0; }
.slide-panel-enter-from .rede-panel { transform: translateX(100%); }
.slide-panel-leave-to .rede-panel { transform: translateX(100%); }
</style>
