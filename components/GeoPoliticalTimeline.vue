<template>
  <Transition name="fade-scale">
    <div v-if="visible" class="geotimeline-overlay" @click.self="close" @keydown.esc="close">
      <div class="geotimeline-modal">
        <button class="geotimeline-close" @click="close" aria-label="Close timeline">&times;</button>

        <!-- Hero header -->
        <div class="geotimeline-hero">
          <div class="geotimeline-hero-bg" />
          <div class="geotimeline-hero-content">
            <div class="geotimeline-badge">GEOPOLITICAL INTELLIGENCE BRIEF</div>
            <h1 class="geotimeline-title">The Rare Earth Chessboard</h1>
            <p class="geotimeline-subtitle">How China's export control is driving a global scramble for Brazil's strategic minerals — and why the world must choose between sovereignty and exploitation</p>
            <div class="geotimeline-hero-stats">
              <div class="hero-stat"><span class="hero-stat-value">78%</span><span class="hero-stat-label">US weapons dependent on Chinese REE</span></div>
              <div class="hero-stat"><span class="hero-stat-value">$2.7T</span><span class="hero-stat-label">Brazil's strategic mineral value</span></div>
              <div class="hero-stat"><span class="hero-stat-value">4,213</span><span class="hero-stat-label">Mining claims in 2023 peak</span></div>
              <div class="hero-stat"><span class="hero-stat-value">15</span><span class="hero-stat-label">Years until China's REE reserves depleted</span></div>
            </div>
          </div>
        </div>

        <!-- Executive Summary -->
        <div class="geotimeline-section">
          <h2 class="section-title">Executive Summary</h2>
          <div class="exec-summary">
            <p>Rare Earth Elements (REE) are the <strong>vitamins of modern technology</strong> — tiny amounts required for virtually every advanced electronic, magnetic, and optical system. From <strong>F-35 fighter jets</strong> (417 kg REE each) to <strong>iPhone vibration motors</strong> (0.03g), from <strong>wind turbine generators</strong> (300+ kg) to <strong>nuclear submarine sonar</strong> (4,175 kg).</p>
            <p><strong>China controls 70% of global REE mining and 90% of processing.</strong> In October 2025, China weaponized this dominance — banning 7 heavy REE elements to the US. The result: a <strong>desperate scramble</strong> for alternative sources. Brazil, with the <strong>largest REE reserves outside China</strong>, became ground zero.</p>
            <p>But the invasion of Australian, Canadian, and US companies into Brazil's mining sector is not about clean energy. It is about <strong>military supply chains, geopolitical leverage, and a new form of resource colonialism</strong> — where foreign capital extracts strategic wealth while Brazilian communities bear the environmental cost.</p>
            <div class="exec-callout">
              ⚡ <strong>The question before us:</strong> Will Brazil's rare earths serve the global common good — or become another chapter in the history of resource extraction that enriches the few at the expense of the many?
            </div>
          </div>
        </div>

        <!-- Geopolitical Context Map -->
        <div class="geotimeline-section">
          <h2 class="section-title">The Geopolitical Landscape</h2>
          <div class="geo-grid">
            <div class="geo-card china">
              <div class="geo-card-header">🇨🇳 China</div>
              <div class="geo-card-body">
                <div class="geo-stat"><span class="geo-stat-val">70%</span><span class="geo-stat-lbl">of global REE mining</span></div>
                <div class="geo-stat"><span class="geo-stat-val">90%</span><span class="geo-stat-lbl">of global REE processing</span></div>
                <div class="geo-stat"><span class="geo-stat-val">15 yrs</span><span class="geo-stat-lbl">until reserves depleted at current rate</span></div>
                <div class="geo-stat"><span class="geo-stat-val">2025</span><span class="geo-stat-lbl">Export ban on 7 heavy REE to US</span></div>
                <p class="geo-desc">"Rare earths are China's nuclear option" — strategically controlling supply to maintain manufacturing dominance and geopolitical leverage.</p>
              </div>
            </div>
            <div class="geo-card usa">
              <div class="geo-card-header">🇺🇸 United States</div>
              <div class="geo-card-body">
                <div class="geo-stat"><span class="geo-stat-val">0%</span><span class="geo-stat-lbl">domestic heavy REE processing</span></div>
                <div class="geo-stat"><span class="geo-stat-val">$2.8B</span><span class="geo-stat-lbl">paid for Serra Verde (Brazil)</span></div>
                <div class="geo-stat"><span class="geo-stat-val">$400M</span><span class="geo-stat-lbl">Pentagon → MP Materials</span></div>
                <div class="geo-stat"><span class="geo-stat-val">2027</span><span class="geo-stat-lbl">DFARS mandate: non-China REE for defense</span></div>
                <p class="geo-desc">"America's rare earth problem is a national security crisis" — the military-industrial complex needs Brazilian REE to function.</p>
              </div>
            </div>
            <div class="geo-card brazil">
              <div class="geo-card-header">🇧🇷 Brazil</div>
              <div class="geo-card-body">
                <div class="geo-stat"><span class="geo-stat-val">$2.7T</span><span class="geo-stat-lbl">strategic mineral reserves</span></div>
                <div class="geo-stat"><span class="geo-stat-val">4,213</span><span class="geo-stat-lbl">REE claims in 2023 (peak)</span></div>
                <div class="geo-stat"><span class="geo-stat-val">10.3%</span><span class="geo-stat-lbl">claims controlled by foreign capital</span></div>
                <div class="geo-stat"><span class="geo-stat-val">0</span><span class="geo-stat-lbl">domestic REE processing plants</span></div>
                <p class="geo-desc">"The sleeping giant" — Brazil has the resources but none of the processing capability. Raw ore exported, jobs created elsewhere.</p>
              </div>
            </div>
            <div class="geo-card australia">
              <div class="geo-card-header">🇦🇺 Australia</div>
              <div class="geo-card-body">
                <div class="geo-stat"><span class="geo-stat-val">9</span><span class="geo-stat-lbl">ASX companies mining REE in Brazil</span></div>
                <div class="geo-stat"><span class="geo-stat-val">1,146</span><span class="geo-stat-lbl">claims held by Australian cos.</span></div>
                <div class="geo-stat"><span class="geo-stat-val">1.73M</span><span class="geo-stat-lbl">hectares under Australian control</span></div>
                <div class="geo-stat"><span class="geo-stat-val">$100M+</span><span class="geo-stat-lbl">Export Finance Australia committed</span></div>
                <p class="geo-desc">"Australia's proxy mining" — ASX-listed companies with no Australian assets, using legal fiction to access US defense funding.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- The Corporate Network -->
        <div class="geotimeline-section">
          <h2 class="section-title">The Corporate Network</h2>
          <div class="network-visual">
            <div class="network-intro">
              <strong>Central Hub: Foxfire Metals / Dr. Paul Woolrich</strong> — A single individual connects 6+ companies across 3 continents, controlling 570+ claims. This is not a free market — it is a tightly woven network of interlocking directorates, joint ventures, and hidden beneficiaries.
            </div>
            <div class="network-nodes">
              <div class="network-node central">FOXFIRE<br />METALS</div>
              <div class="network-line" />
              <div class="network-node child">AXEL<br />REE</div>
              <div class="network-line" />
              <div class="network-node child">VIRIDIS<br />MINING</div>
              <div class="network-line" />
              <div class="network-node child">METEORIC<br />RESOURCES</div>
              <div class="network-line" />
              <div class="network-node child">SPARK<br />ENERGY</div>
              <div class="network-line" />
              <div class="network-node child">VERITY<br />RESOURCES</div>
            </div>
            <div class="network-footer">
              <div class="network-investor">💰 Pentagon → DFC $565M → Serra Verde → USA Rare Earth</div>
              <div class="network-investor">💰 State Dept $5M → Aclara Resources → Carina Module (GO)</div>
              <div class="network-investor">💰 Export Finance Australia $100M → Viridis & Meteoric</div>
              <div class="network-investor">💰 CBMM → Baosteel/CITIC/Anshan consortium (15% = $1.95B) → China</div>
            </div>
          </div>
        </div>

        <!-- Full Timeline -->
        <div class="geotimeline-section">
          <h2 class="section-title">Historical Timeline: The Road to Crisis</h2>
          <div class="timeline-container">
            <TimelineEvent
              v-for="evt in timeline" :key="evt.year + evt.title"
              :event="evt"
            />
          </div>
        </div>

        <!-- Mining Phases -->
        <div class="geotimeline-section">
          <h2 class="section-title">Mining Phase Breakdown</h2>
          <div class="phases-container">
            <div v-for="phase in phases" :key="phase.phase" class="phase-card">
              <div class="phase-dot" :style="{ background: phase.color }" />
              <div class="phase-content">
                <div class="phase-header">
                  <span class="phase-label" :style="{ color: phase.color }">{{ phase.label }}</span>
                  <span class="phase-risk" :class="phase.riskLevel">{{ phase.riskLevel.toUpperCase() }} RISK</span>
                </div>
                <p class="phase-desc">{{ phase.description }}</p>
                <div class="phase-meta">
                  <span>⏱ Avg. {{ phase.avgDurationYears }} years</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Call to Action -->
        <div class="geotimeline-section cta-section">
          <h2 class="section-title">What Must Be Done</h2>
          <div class="cta-grid">
            <div class="cta-card">
              <div class="cta-icon">🌍</div>
              <h3>Global Oversight</h3>
              <p>Rare earths are strategic minerals that affect all humanity. Their extraction must be governed by international frameworks — not corporate balance sheets.</p>
            </div>
            <div class="cta-card">
              <div class="cta-icon">🇧🇷</div>
              <h3>Brazilian Sovereignty</h3>
              <p>Brazil must build domestic processing capability. Raw ore export = colonial economics. Value addition = national development. A sovereign REE fund, like Norway's oil fund, is needed.</p>
            </div>
            <div class="cta-card">
              <div class="cta-icon">👥</div>
              <h3>Community Consent</h3>
              <p>Free, prior, and informed consent of affected communities is non-negotiable. Quilombolas, indigenous peoples, and traditional communities must be decision-makers, not spectators.</p>
            </div>
            <div class="cta-card">
              <div class="cta-icon">♻️</div>
              <h3>Circular Economy</h3>
              <p>Before mining more, we must recycle better. Less than 1% of REE in consumer products is currently recycled. A global REE recycling mandate would reduce the need for new mining by 40%.</p>
            </div>
            <div class="cta-card">
              <div class="cta-icon">🔬</div>
              <h3>Technology Alternatives</h3>
              <p>REE-free magnets, induction motors, and solid-state electronics exist. Research funding must be redirected from mining exploration to substitution technologies.</p>
            </div>
            <div class="cta-card cta-uni-vos">
              <div class="cta-icon">✊</div>
              <h3>Uni-vos, Povo!</h3>
              <p>This is not just about rare earths. It is about who controls the resources of the planet. The global community must unite — workers, environmentalists, scientists, and citizens — to demand that strategic minerals serve the common good, not corporate profit or military might.</p>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="geotimeline-footer">
          <p>Earth Guardians — Observatory of Vulcan | Data sources: ANM, SICM, DFC, USGS, Pentagon, MPF</p>
          <p class="footer-sub">This is an educational resource. Verify all data independently. The truth belongs to the people.</p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { h } from 'vue'
import { GEOPOLITICAL_TIMELINE, MINING_PHASE_TIMELINE, type TimelineEvent } from '@/lib/observatory-timeline'

defineProps<{ visible: boolean }>()
const emit = defineEmits<{ close: [] }>()

function close() { emit('close') }

const timeline = GEOPOLITICAL_TIMELINE
const phases = MINING_PHASE_TIMELINE

const TimelineEvent = ({ event }: { event: TimelineEvent }) => {
  const e = event
  const sigColors: Record<string, string> = { critical: '#e74c3c', high: '#f39c12', medium: '#3498db', low: '#7f8c8d' }
  const sigColor = sigColors[e.significance] || '#666'
  return h('div', { class: 'timeline-item' }, [
    h('div', { class: 'timeline-marker', style: { borderColor: e.color } }, [
      h('div', { class: 'timeline-dot', style: { background: e.color } }),
    ]),
    h('div', { class: 'timeline-content' }, [
      h('div', { class: 'timeline-year' }, [
        h('span', { style: { color: e.color } }, `${e.icon} ${e.year}`),
        h('span', {
          class: 'timeline-significance',
          style: { background: sigColor, color: '#fff' },
        }, e.significance.toUpperCase()),
      ]),
      h('h3', { class: 'timeline-title' }, e.title),
      h('p', { class: 'timeline-desc' }, e.description),
    ]),
  ])
}
</script>

<style scoped>
.geotimeline-overlay {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  background: rgba(0, 0, 0, 0.88);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 20px;
  overflow-y: auto;
}
.geotimeline-modal {
  max-width: 900px;
  width: 100%;
  margin: 20px auto;
  background: #0a0a0f;
  border: 1px solid rgba(231, 76, 60, 0.2);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 0 80px rgba(231, 76, 60, 0.1);
}
.geotimeline-close {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 10;
  width: 44px;
  height: 44px;
  border: 2px solid rgba(231, 76, 60, 0.3);
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.8);
  color: #e74c3c;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.geotimeline-close:hover {
  background: rgba(231, 76, 60, 0.2);
  border-color: #e74c3c;
  transform: scale(1.1);
}

/* Hero */
.geotimeline-hero {
  position: relative;
  padding: 48px 32px 36px;
  overflow: hidden;
}
.geotimeline-hero-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(231, 76, 60, 0.12) 0%, transparent 50%, rgba(41, 128, 185, 0.08) 100%);
}
.geotimeline-hero-content {
  position: relative;
  z-index: 1;
}
.geotimeline-badge {
  display: inline-block;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.15em;
  padding: 4px 12px;
  border-radius: 4px;
  background: rgba(231, 76, 60, 0.15);
  color: #e74c3c;
  margin-bottom: 16px;
}
.geotimeline-title {
  font-size: 32px;
  font-weight: 900;
  color: #f0f0f0;
  margin: 0 0 8px;
  letter-spacing: -0.02em;
}
.geotimeline-subtitle {
  font-size: 14px;
  color: #888;
  line-height: 1.5;
  margin: 0 0 24px;
  max-width: 720px;
}
.geotimeline-hero-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.hero-stat {
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
}
.hero-stat-value {
  display: block;
  font-size: 24px;
  font-weight: 900;
  color: #e74c3c;
  margin-bottom: 2px;
}
.hero-stat-label {
  font-size: 9px;
  color: #666;
  line-height: 1.3;
}

/* Sections */
.geotimeline-section {
  padding: 28px 32px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}
.section-title {
  font-size: 18px;
  font-weight: 800;
  color: #e0e0e0;
  margin: 0 0 16px;
  letter-spacing: -0.01em;
}

/* Executive Summary */
.exec-summary p {
  font-size: 13px;
  color: #999;
  line-height: 1.7;
  margin: 0 0 12px;
}
.exec-summary strong {
  color: #ddd;
}
.exec-callout {
  padding: 14px 18px;
  background: rgba(231, 76, 60, 0.08);
  border-left: 3px solid #e74c3c;
  border-radius: 4px;
  font-size: 13px;
  color: #ccc;
  line-height: 1.5;
  margin-top: 16px;
}

/* Geo Grid */
.geo-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.geo-card {
  padding: 16px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.02);
}
.geo-card.china { border-left: 3px solid #e74c3c; }
.geo-card.usa { border-left: 3px solid #c0392b; }
.geo-card.brazil { border-left: 3px solid #27ae60; }
.geo-card.australia { border-left: 3px solid #2980b9; }
.geo-card-header {
  font-size: 13px;
  font-weight: 800;
  margin-bottom: 10px;
  color: #ddd;
}
.geo-stat {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.geo-stat-val {
  font-size: 11px;
  font-weight: 700;
  color: #e74c3c;
  min-width: 50px;
}
.geo-stat-lbl {
  font-size: 10px;
  color: #777;
}
.geo-desc {
  font-size: 10px;
  color: #666;
  line-height: 1.4;
  margin: 8px 0 0;
  font-style: italic;
}

/* Network Visual */
.network-visual {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 20px;
}
.network-intro {
  font-size: 12px;
  color: #999;
  line-height: 1.5;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.network-intro strong {
  color: #e74c3c;
}
.network-nodes {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0;
  margin-bottom: 20px;
}
.network-node {
  padding: 12px 14px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 700;
  text-align: center;
  line-height: 1.3;
  color: #fff;
}
.network-node.central {
  background: #c0392b;
  padding: 16px 20px;
  font-size: 12px;
  box-shadow: 0 0 20px rgba(192, 57, 43, 0.3);
}
.network-line {
  width: 24px;
  height: 2px;
  background: rgba(255, 255, 255, 0.15);
  margin: 0 4px;
}
.network-node.child {
  background: rgba(41, 128, 185, 0.3);
  border: 1px solid rgba(41, 128, 185, 0.4);
}
.network-footer {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}
.network-investor {
  font-size: 10px;
  color: #888;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 4px;
  line-height: 1.4;
}

/* Timeline */
.timeline-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.timeline-item {
  display: flex;
  gap: 14px;
  padding: 10px 14px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
  transition: background 0.2s;
}
.timeline-item:hover {
  background: rgba(255, 255, 255, 0.04);
}
.timeline-marker {
  width: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 4px;
  flex-shrink: 0;
}
.timeline-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}
.timeline-content {
  flex: 1;
  min-width: 0;
}
.timeline-year {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: 700;
}
.timeline-significance {
  font-size: 8px;
  padding: 1px 6px;
  border-radius: 3px;
  font-weight: 700;
  letter-spacing: 0.05em;
}
.timeline-title {
  font-size: 13px;
  font-weight: 700;
  color: #ddd;
  margin: 0 0 4px;
}
.timeline-desc {
  font-size: 11px;
  color: #888;
  line-height: 1.5;
  margin: 0;
}

/* Phases */
.phases-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.phase-card {
  display: flex;
  gap: 10px;
  padding: 14px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.phase-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
}
.phase-content { flex: 1; }
.phase-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}
.phase-label {
  font-size: 11px;
  font-weight: 700;
}
.phase-risk {
  font-size: 7px;
  padding: 1px 5px;
  border-radius: 3px;
  font-weight: 700;
  letter-spacing: 0.05em;
}
.phase-risk.high { background: rgba(231, 76, 60, 0.15); color: #e74c3c; }
.phase-risk.medium { background: rgba(243, 156, 18, 0.15); color: #f39c12; }
.phase-risk.low { background: rgba(39, 174, 96, 0.15); color: #27ae60; }
.phase-desc {
  font-size: 10px;
  color: #888;
  line-height: 1.5;
  margin: 0 0 6px;
}
.phase-meta {
  font-size: 9px;
  color: #666;
}

/* CTA */
.cta-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.cta-card {
  padding: 16px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  text-align: center;
  transition: all 0.2s;
}
.cta-card:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(231, 76, 60, 0.15);
}
.cta-icon {
  font-size: 28px;
  margin-bottom: 8px;
}
.cta-card h3 {
  font-size: 13px;
  font-weight: 700;
  color: #ddd;
  margin: 0 0 8px;
}
.cta-card p {
  font-size: 10px;
  color: #888;
  line-height: 1.5;
  margin: 0;
}
.cta-uni-vos {
  border-color: rgba(231, 76, 60, 0.2) !important;
  background: rgba(231, 76, 60, 0.05) !important;
}
.cta-uni-vos h3 { color: #e74c3c; }

/* Footer */
.geotimeline-footer {
  padding: 20px 32px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  text-align: center;
}
.geotimeline-footer p {
  font-size: 10px;
  color: #555;
  margin: 0;
}
.footer-sub {
  font-size: 9px;
  margin-top: 4px !important;
  font-style: italic;
}

/* Transitions */
.fade-scale-enter-active, .fade-scale-leave-active {
  transition: opacity 0.3s ease;
}
.fade-scale-enter-active .geotimeline-modal, .fade-scale-leave-active .geotimeline-modal {
  transition: transform 0.3s ease;
}
.fade-scale-enter-from, .fade-scale-leave-to { opacity: 0; }
.fade-scale-enter-from .geotimeline-modal { transform: scale(0.95) translateY(20px); }
.fade-scale-leave-to .geotimeline-modal { transform: scale(0.95) translateY(20px); }

/* Responsive */
@media (max-width: 768px) {
  .geotimeline-hero { padding: 32px 20px 24px; }
  .geotimeline-title { font-size: 24px; }
  .geotimeline-hero-stats { grid-template-columns: repeat(2, 1fr); }
  .geo-grid { grid-template-columns: 1fr; }
  .phases-container { grid-template-columns: 1fr; }
  .cta-grid { grid-template-columns: 1fr; }
  .geotimeline-section { padding: 20px; }
  .network-nodes { flex-direction: column; }
  .network-line { width: 2px; height: 12px; }
  .network-footer { grid-template-columns: 1fr; }
}
</style>
