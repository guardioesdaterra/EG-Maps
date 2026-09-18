/**
 * pages/privacy.vue
 * @why Privacy Policy page — required for Google OAuth verification: discloses
 *  what Google user data is accessed, how it is used, sharing, protection,
 *  and retention/deletion. Linked from the homepage footer and sign-in gates.
 * @component privacy
 */
<template>
  <main id="main-content" tabindex="-1" class="flex min-h-[100svh] justify-center bg-[var(--bg-primary)] section-padding-x py-[max(4.75rem,8vh)] pb-[max(7rem,env(safe-area-inset-bottom))] text-[var(--text-primary)]">
    <article class="w-container-narrow rounded-[14px] border border-white/10 bg-white/[0.06] backdrop-blur-[20px] backdrop-saturate-[1.5] shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:border-white/[0.06] dark:bg-white/[0.03] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
      <header class="border-b-2 border-[var(--border-color)] card-padding-lg">
        <p class="text-[clamp(10px,1.5vw,13px)] font-black uppercase tracking-[0.24em] text-[var(--text-muted)]">Earth Guardians · EG-Maps</p>
        <h1 class="mt-1.5 text-fluid-4xl font-black leading-tight tracking-normal">Privacy Policy</h1>
        <p class="mt-1.5 max-w-[min(100%,44rem)] text-fluid-sm leading-6 text-[var(--text-secondary)]">Last updated: September 18, 2026</p>
      </header>

      <div class="legal-body card-padding-lg">
        <section>
          <h2>1. Who we are</h2>
          <p>
            This Privacy Policy covers <strong>EG-Maps</strong>, the interactive data-visualization platform
            operated by <strong>Earth Guardians</strong> (earthguardians.org), including the public maps
            (project grants, endangered species, active crews, Vulcan observatory) and the restricted
            <strong>EG-Grants</strong> portal that requires Google sign-in.
          </p>
        </section>

        <section>
          <h2>2. Google user data we access</h2>
          <p>
            When you sign in with Google, we request only the minimum OAuth scopes needed for
            authentication — <code>openid</code>, <code>email</code>, and <code>profile</code>. Through these
            scopes Google shares with us:
          </p>
          <ul>
            <li>Your <strong>name</strong> (to identify you in the app)</li>
            <li>Your <strong>email address</strong> (to verify Earth Guardians staff access and attribute your contributions)</li>
            <li>Your <strong>Google profile picture</strong> (displayed next to your contributions, if you contribute)</li>
          </ul>
          <p>We do not request access to your Gmail, Google Drive, contacts, calendar, or any other Google service.</p>
        </section>

        <section>
          <h2>3. How we use Google user data</h2>
          <p>We use your Google account information <strong>solely to provide, operate, and improve EG-Maps</strong>:</p>
          <ul>
            <li>Authenticating you and keeping you signed in</li>
            <li>Determining whether your account is authorized for restricted areas (e.g. Earth Guardians staff access to EG-Grants)</li>
            <li>Attributing content you create (grant submissions, votes, comments) to you inside the app</li>
            <li>Preventing abuse and keeping the platform secure</li>
          </ul>
          <p>
            We do <strong>not</strong> use Google user data for advertising, profiling, or any purpose unrelated
            to providing and improving EG-Maps functionality.
          </p>
        </section>

        <section>
          <h2>4. Sharing and disclosure</h2>
          <p>
            We do <strong>not</strong> sell, rent, or transfer your Google user data to third parties, except to the
            service providers strictly necessary to operate the app:
          </p>
          <ul>
            <li><strong>Supabase</strong> — our authentication and database backend, which stores your account record and app content</li>
            <li><strong>Google</strong> — the OAuth provider that authenticates you</li>
            <li><strong>MapTiler</strong> — map tile provider (receives no account data, only map-tile requests)</li>
          </ul>
          <p>
            We will disclose data only if required by law or to protect the safety and integrity of the platform.
            We never transfer Google user data to third parties for purposes other than providing or improving
            EG-Maps functionality.
          </p>
        </section>

        <section>
          <h2>5. Data protection</h2>
          <ul>
            <li>All traffic is encrypted in transit (HTTPS/TLS)</li>
            <li>Account and content data is stored encrypted at rest by our backend provider</li>
            <li>Database access is restricted by row-level security rules and least-privilege credentials</li>
            <li>Restricted areas (EG-Grants) are additionally gated by server-verified staff checks</li>
          </ul>
        </section>

        <section>
          <h2>6. Cookies and local storage</h2>
          <p>EG-Maps stores small amounts of data in your browser to function:</p>
          <ul>
            <li>Authentication session and login-security tokens (required for sign-in)</li>
            <li>Preferences such as theme (dark/light) and language</li>
          </ul>
          <p>Clearing your browser storage will sign you out and reset these preferences.</p>
        </section>

        <section>
          <h2>7. Data retention and deletion</h2>
          <p>
            We retain your account data for as long as your account is active or as needed to provide the service.
            You may request export or deletion of your personal data at any time by emailing
            <a href="mailto:privacy@earthguardians.org">privacy@earthguardians.org</a> — we will respond within 30 days.
          </p>
          <p>
            You can also revoke EG-Maps' access to your Google account at any time from your
            <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">Google Account third-party access settings</a>;
            revoking access signs you out and prevents further data collection, though content you already
            published (e.g. comments) may remain until you request its deletion.
          </p>
        </section>

        <section>
          <h2>8. Children's privacy</h2>
          <p>
            EG-Maps is not directed at children under 13, and we do not knowingly collect personal data from
            children. Accounts for youth crew members are managed through a parent, guardian, or crew coordinator.
          </p>
        </section>

        <section>
          <h2>9. Changes to this policy</h2>
          <p>
            If we change how we use Google user data, we will update this page, revise the date above, and
            notify signed-in users in the app before the changes take effect.
          </p>
        </section>

        <section>
          <h2>10. Contact</h2>
          <p>
            Questions about this policy: <a href="mailto:privacy@earthguardians.org">privacy@earthguardians.org</a><br />
            Earth Guardians · PO Box 1561, Laurel, MD 20725
          </p>
        </section>

        <nav class="legal-nav" aria-label="Legal">
          <NuxtLink to="/terms">Terms of Service</NuxtLink>
          <span aria-hidden="true">·</span>
          <NuxtLink to="/">Back to home</NuxtLink>
        </nav>
      </div>
    </article>
  </main>
</template>

<script setup lang="ts">
useHead({
  title: 'Privacy Policy | Earth Guardians EG-Maps',
  meta: [
    { name: 'description', content: 'Privacy Policy for Earth Guardians EG-Maps: what Google user data we access, how we use it, sharing, protection, retention and deletion.' },
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
.legal-body code {
  font-family: ui-monospace, monospace;
  font-size: 0.85em;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 0.05em 0.35em;
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
