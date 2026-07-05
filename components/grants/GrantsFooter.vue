<template>
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
        <a href="https://www.instagram.com/earthguardians/" target="_blank" class="footer-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
          <span>@earthguardians_br</span>
        </a>
      </div>
      <div class="tectonic-line" />
      <div class="footer-stats-grid">
        <div><h4>{{ t('grantsPortal.since') }}</h4><p class="footer-stat-value">1992</p><p class="footer-stat-label">{{ t('grantsPortal.overADecade') }}</p></div>
        <div><h4>{{ t('grantsPortal.countriesCount') }}</h4><p class="footer-stat-value">{{ countryCount }}</p><p class="footer-stat-label">{{ t('grantsPortal.globalReach') }}</p></div>
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
</template>

<script setup lang="ts">
defineProps<{
  countryCount: string
}>()

const { t } = useI18n()
</script>

<style scoped>
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

@media (max-width: 768px) {
  .footer-links {
    flex-direction: column;
  }
}
</style>
