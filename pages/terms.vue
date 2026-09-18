/**
 * pages/terms.vue
 * @why Terms of Service page — required alongside the Privacy Policy for
 *  Google OAuth verification and linked from the homepage footer and sign-in gates.
 * @component terms
 */
<template>
  <main id="main-content" tabindex="-1" class="flex min-h-[100svh] justify-center bg-[var(--bg-primary)] section-padding-x py-[max(4.75rem,8vh)] pb-[max(7rem,env(safe-area-inset-bottom))] text-[var(--text-primary)]">
    <article class="w-container-narrow rounded-[14px] border border-white/10 bg-white/[0.06] backdrop-blur-[20px] backdrop-saturate-[1.5] shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:border-white/[0.06] dark:bg-white/[0.03] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
      <header class="border-b-2 border-[var(--border-color)] card-padding-lg">
        <p class="text-[clamp(10px,1.5vw,13px)] font-black uppercase tracking-[0.24em] text-[var(--text-muted)]">Earth Guardians · EG-Maps</p>
        <h1 class="mt-1.5 text-fluid-4xl font-black leading-tight tracking-normal">Terms of Service</h1>
        <p class="mt-1.5 max-w-[min(100%,44rem)] text-fluid-sm leading-6 text-[var(--text-secondary)]">Last updated: September 18, 2026</p>
      </header>

      <div class="legal-body card-padding-lg">
        <section>
          <h2>1. Acceptance</h2>
          <p>
            By accessing <strong>EG-Maps</strong> (the Earth Guardians interactive maps and the EG-Grants portal),
            you agree to these Terms and to our <NuxtLink to="/privacy">Privacy Policy</NuxtLink>.
            If you do not agree, please do not use the platform.
          </p>
        </section>

        <section>
          <h2>2. Who may use EG-Maps</h2>
          <p>
            The public maps are free for everyone to explore. Restricted areas such as the EG-Grants portal
            require Google sign-in and are limited to authorized Earth Guardians staff and crew accounts.
            Access is verified server-side and may be revoked at any time.
          </p>
        </section>

        <section>
          <h2>3. Your account</h2>
          <ul>
            <li>You must sign in with a Google account you are entitled to use</li>
            <li>You are responsible for activity under your account — do not share access or impersonate others</li>
            <li>You must promptly report unauthorized use to <a href="mailto:privacy@earthguardians.org">privacy@earthguardians.org</a></li>
          </ul>
        </section>

        <section>
          <h2>4. Acceptable use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Break the law, infringe rights, or post harmful, hateful, or deceptive content</li>
            <li>Attempt to access restricted areas, other users' accounts, or backend systems without authorization</li>
            <li>Scrape, overload, or disrupt the platform (reasonable personal and research use of public data is fine)</li>
            <li>Submit spam, advertising, or grant listings you are not authorized to publish</li>
          </ul>
        </section>

        <section>
          <h2>5. User content</h2>
          <p>
            Content you submit (grant listings, votes, comments) remains yours. By submitting it you grant
            Earth Guardians a worldwide, non-exclusive license to display and distribute it within EG-Maps
            so the platform can function. We may moderate, edit, or remove content that violates these Terms.
          </p>
        </section>

        <section>
          <h2>6. Intellectual property and data sources</h2>
          <p>
            The EG-Maps software, design, and branding belong to Earth Guardians. Map imagery and species data
            come from third-party providers (e.g. MapTiler, OpenStreetMap contributors, biodiversity databases)
            and remain subject to their respective licenses and attribution requirements.
          </p>
        </section>

        <section>
          <h2>7. Third-party services</h2>
          <p>
            EG-Maps relies on Google (sign-in), Supabase (authentication and database), and MapTiler (map tiles).
            Your use of those services through EG-Maps is also subject to their own terms and policies.
          </p>
        </section>

        <section>
          <h2>8. Availability and disclaimer</h2>
          <p>
            EG-Maps is provided <strong>"as is"</strong> without warranties of any kind. We work to keep the
            platform accurate and available but do not guarantee uninterrupted access, error-free data, or that
            grant listings are current, complete, or fundable — always verify details with the funder.
          </p>
        </section>

        <section>
          <h2>9. Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, Earth Guardians is not liable for indirect, incidental, or
            consequential damages arising from your use of EG-Maps.
          </p>
        </section>

        <section>
          <h2>10. Changes and termination</h2>
          <p>
            We may update these Terms; material changes will be posted here with a new date and notified to
            signed-in users in the app. We may suspend or terminate accounts that violate these Terms.
          </p>
        </section>

        <section>
          <h2>11. Contact</h2>
          <p>
            Questions about these Terms: <a href="mailto:privacy@earthguardians.org">privacy@earthguardians.org</a><br />
            Earth Guardians · PO Box 1561, Laurel, MD 20725
          </p>
        </section>

        <nav class="legal-nav" aria-label="Legal">
          <NuxtLink to="/privacy">Privacy Policy</NuxtLink>
          <span aria-hidden="true">·</span>
          <NuxtLink to="/">Back to home</NuxtLink>
        </nav>
      </div>
    </article>
  </main>
</template>

<script setup lang="ts">
useHead({
  title: 'Terms of Service | Earth Guardians EG-Maps',
  meta: [
    { name: 'description', content: 'Terms of Service for Earth Guardians EG-Maps: eligibility, accounts, acceptable use, content, and liability.' },
  ],
})
</script>

<style scoped>
.legal-body section + section {
  margin-top: 1.75rem;
}
.legal-body h2 {
  font-size: clamp(1.05rem, 2.4vw, 1.35rem);
  font-weight: 800;
  line-height: 1.3;
  margin-bottom: 0.6rem;
}
.legal-body p,
.legal-body li {
  font-size: clamp(0.85rem, 1.8vw, 0.95rem);
  line-height: 1.75;
  color: var(--text-secondary);
}
.legal-body p + p {
  margin-top: 0.6rem;
}
.legal-body strong {
  color: var(--text-primary);
}
.legal-body ul {
  margin: 0.6rem 0 0.6rem 1.25rem;
  list-style: disc;
  display: grid;
  gap: 0.35rem;
}
.legal-body a {
  color: var(--text-primary);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.legal-body a:hover {
  opacity: 0.75;
}
.legal-nav {
  margin-top: 2.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  gap: 0.75rem;
  font-size: 0.85rem;
  font-weight: 700;
}
</style>
