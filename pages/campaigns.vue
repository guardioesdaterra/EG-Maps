<template>
  <main id="main-content" class="campaigns-page">
    <section class="campaigns-shell">
      <header class="campaigns-hero">
        <div class="hero-copy">
          <p class="eyebrow">Earth Guardians · campaigns & action</p>
          <h1>Campaigns are how ideas become collective action.</h1>
          <p class="hero-lede">Explore the issues Earth Guardians works on, learn from youth-led movements, and find a practical next step for your community.</p>
          <div class="hero-actions">
            <a class="button button-primary" href="https://www.earthguardians.org/eg-resources" target="_blank" rel="noopener noreferrer">Explore official resources <Icon name="lucide:arrow-up-right" /></a>
            <NuxtLink class="button button-secondary" to="/active-crews">See the global crew network <Icon name="lucide:map" /></NuxtLink>
          </div>
        </div>
        <aside class="hero-note">
          <span class="hero-note-index">01 / 05</span>
          <strong>Youth-led, locally rooted, globally connected.</strong>
          <p>Campaigns connect education, direct action, crews, mentorship, partnerships and project grants.</p>
        </aside>
      </header>

      <section class="section-block" aria-labelledby="campaign-library-title">
        <div class="section-heading">
          <div><p class="eyebrow">Campaign library</p><h2 id="campaign-library-title">Choose your entry point.</h2></div>
          <p>Endangered species is one part of a wider movement. Start with the issue, then choose how you want to participate.</p>
        </div>
        <div class="campaign-grid">
          <article class="campaign-card campaign-card-featured">
            <div class="card-top"><span class="card-kicker">Biodiversity · live map</span><Icon name="lucide:leaf" /></div>
            <h3>Endangered species</h3>
            <p>Discover species data and habitat stories, then use the map as a starting point for learning, advocacy and local protection.</p>
            <div class="card-meta"><span>2D map + 3D globe</span><span>Data explorer</span></div>
            <div class="card-actions"><NuxtLink class="button button-primary" to="/endangered-species">Open 2D map <Icon name="lucide:arrow-right" /></NuxtLink><NuxtLink class="text-link" to="/endangered-species/3d">Open 3D globe <Icon name="lucide:globe-2" /></NuxtLink></div>
          </article>
          <article class="campaign-card">
            <div class="card-top"><span class="card-kicker">Climate action · collective day</span><Icon name="lucide:megaphone" /></div>
            <h3>Choose Action Now</h3>
            <p>A youth-led global day of action connecting grassroots projects, community resilience and a platform of climate justice demands.</p>
            <div class="card-meta"><span>Toolkit</span><span>Direct action</span></div>
            <div class="card-actions"><a class="button button-secondary" href="https://www.earthguardians.org/can" target="_blank" rel="noopener noreferrer">Learn about CAN <Icon name="lucide:arrow-up-right" /></a></div>
          </article>
          <article class="campaign-card">
            <div class="card-top"><span class="card-kicker">Systems · everyday action</span><Icon name="lucide:recycle" /></div>
            <h3>Sustainable solutions</h3>
            <p>Explore waste reduction, environmental audits, EarthTracks and community-scale solutions that turn daily choices into systemic momentum.</p>
            <div class="card-meta"><span>Waste reduction</span><span>Toolkits</span></div>
            <div class="card-actions"><a class="button button-secondary" href="https://www.earthguardians.org/sustainable-solutions-waste-reduction" target="_blank" rel="noopener noreferrer">Explore solutions <Icon name="lucide:arrow-up-right" /></a></div>
          </article>
          <article class="campaign-card">
            <div class="card-top"><span class="card-kicker">People · network</span><Icon name="lucide:users-round" /></div>
            <h3>Crews & local action</h3>
            <p>Join a youth-led, intergenerational group and move from awareness to a project with people who share your place and purpose.</p>
            <div class="card-meta"><span>Global network</span><span>Local projects</span></div>
            <div class="card-actions"><NuxtLink class="button button-secondary" to="/active-crews">Find a crew <Icon name="lucide:arrow-right" /></NuxtLink></div>
          </article>
          <article class="campaign-card">
            <div class="card-top"><span class="card-kicker">Resources · funding</span><Icon name="lucide:hand-heart" /></div>
            <h3>Project grants</h3>
            <p>Turn a community idea into a funded project through youth-led grants, practical guides and a network built to help action grow.</p>
            <div class="card-meta"><span>Micro-grants</span><span>Project guides</span></div>
            <div class="card-actions"><NuxtLink class="button button-secondary" to="/project-grants">Explore grant projects <Icon name="lucide:arrow-right" /></NuxtLink></div>
          </article>
        </div>
      </section>

      <section class="pathway-section" aria-labelledby="pathway-title">
        <div class="section-heading"><div><p class="eyebrow">A simple pathway</p><h2 id="pathway-title">Learn. Organize. Fund.</h2></div><p>Every campaign can become a local project. Choose the next step that matches where you are today.</p></div>
        <div class="pathway-grid">
          <div class="pathway-step"><span>01</span><Icon name="lucide:book-open" /><h3>Learn</h3><p>Use campaign pages, maps, videos and toolkits to understand an issue without losing its human context.</p><a href="https://www.earthguardians.org/eg-resources" target="_blank" rel="noopener noreferrer">Browse resources <Icon name="lucide:arrow-up-right" /></a></div>
          <div class="pathway-step"><span>02</span><Icon name="lucide:handshake" /><h3>Organize</h3><p>Join or start a Crew, build relationships, and design an action grounded in your community’s needs.</p><a href="https://www.earthguardians.org/crews" target="_blank" rel="noopener noreferrer">Join a Crew <Icon name="lucide:arrow-up-right" /></a></div>
          <div class="pathway-step"><span>03</span><Icon name="lucide:sparkles" /><h3>Fund</h3><p>Move from intention to implementation with project grants, mentorship and a global network of peers.</p><NuxtLink to="/project-grants">See project grants <Icon name="lucide:arrow-right" /></NuxtLink></div>
        </div>
      </section>

      <section class="campaign-cta"><div><p class="eyebrow">The movement is open</p><h2>We won’t wait. It’s our future, we decide.</h2><p>Earth Guardians centers youth leadership and the voices of communities most affected by environmental and climate injustice.</p></div><a class="button button-light" href="https://www.earthguardians.org/crews" target="_blank" rel="noopener noreferrer">Become an Earth Guardian <Icon name="lucide:arrow-up-right" /></a></section>
      <p class="source-note">Campaign context adapted from Earth Guardians’ official <a href="https://www.earthguardians.org/" target="_blank" rel="noopener noreferrer">mission</a>, <a href="https://www.earthguardians.org/eg-resources" target="_blank" rel="noopener noreferrer">resources</a>, <a href="https://www.earthguardians.org/can" target="_blank" rel="noopener noreferrer">CAN</a> and <a href="https://www.earthguardians.org/youth-leadership-training" target="_blank" rel="noopener noreferrer">youth leadership</a> pages.</p>
    </section>
  </main>
</template>

<script setup lang="ts">
useHead({
  title: 'Campaigns · Earth Guardians',
  meta: [{ name: 'description', content: 'Explore Earth Guardians campaigns, biodiversity data, youth-led action, crews and project grants.' }],
})
</script>

<style scoped>
.campaigns-page { min-height: 100svh; background: #f7f7f2; color: #101412; }
.campaigns-shell { width: min(1180px, calc(100% - 2rem)); margin: 0 auto; padding: clamp(2rem, 6vw, 5rem) 0 5rem; }
.campaigns-hero { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(240px, .65fr); gap: clamp(2rem, 8vw, 7rem); align-items: end; padding-bottom: clamp(3rem, 8vw, 7rem); }
.eyebrow, .card-kicker { margin: 0; color: #087f70; font: 700 .68rem/1.2 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .13em; text-transform: uppercase; }
.hero-copy h1 { max-width: 790px; margin: .8rem 0 1.2rem; font-size: clamp(2.8rem, 7vw, 6.8rem); line-height: .93; letter-spacing: -.075em; }
.hero-lede { max-width: 610px; margin: 0; color: rgba(16,20,18,.68); font-size: clamp(1rem, 1.7vw, 1.25rem); line-height: 1.55; }
.hero-actions, .card-actions { display: flex; flex-wrap: wrap; align-items: center; gap: .7rem; margin-top: 1.6rem; }
.button { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; min-height: 44px; padding: .7rem 1rem; border-radius: 999px; font-size: .78rem; font-weight: 800; text-decoration: none; transition: transform 160ms ease, background 160ms ease, color 160ms ease; }
.button:hover { transform: translateY(-2px); }.button svg, .text-link svg, .pathway-step a svg { width: 15px; height: 15px; }.button-primary { background: #101412; color: #fff; }.button-secondary { border: 1px solid rgba(16,20,18,.2); color: #101412; }.button-secondary:hover { background: #101412; color: #fff; }.button-light { background: #f7f7f2; color: #101412; }
.hero-note { padding: 1.4rem 0 0 1.4rem; border-left: 1px solid rgba(16,20,18,.25); }.hero-note-index { display: block; margin-bottom: 2.8rem; color: #087f70; font: 700 .7rem ui-monospace, monospace; }.hero-note strong { display: block; max-width: 230px; font-size: 1.25rem; line-height: 1.15; }.hero-note p { max-width: 250px; margin: .8rem 0 0; color: rgba(16,20,18,.62); font-size: .85rem; line-height: 1.55; }
.section-block, .pathway-section { padding: clamp(2.5rem, 6vw, 5rem) 0; border-top: 1px solid rgba(16,20,18,.18); }.section-heading { display: flex; align-items: end; justify-content: space-between; gap: 2rem; margin-bottom: 2rem; }.section-heading h2 { margin: .5rem 0 0; font-size: clamp(2rem, 4vw, 3.7rem); line-height: .95; letter-spacing: -.06em; }.section-heading > p { max-width: 370px; margin: 0; color: rgba(16,20,18,.62); font-size: .9rem; line-height: 1.55; }
.campaign-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }.campaign-card { display: flex; min-height: 300px; flex-direction: column; padding: clamp(1.2rem, 3vw, 2rem); border: 1px solid rgba(16,20,18,.16); border-radius: 1.25rem; background: rgba(255,255,255,.62); }.campaign-card-featured { border-color: #087f70; background: #d9f3e8; }.card-top { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }.card-top > svg { width: 22px; height: 22px; color: #087f70; }.campaign-card h3 { margin: 2.7rem 0 .7rem; font-size: clamp(1.35rem, 2.3vw, 2.1rem); letter-spacing: -.045em; }.campaign-card p { max-width: 46ch; margin: 0; color: rgba(16,20,18,.65); font-size: .9rem; line-height: 1.55; }.card-meta { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: auto; padding-top: 1.5rem; color: #087f70; font: 700 .68rem ui-monospace, monospace; text-transform: uppercase; letter-spacing: .08em; }.card-meta span + span::before { content: '·'; margin-right: .5rem; color: rgba(16,20,18,.35); }.text-link, .pathway-step a { display: inline-flex; align-items: center; gap: .4rem; color: #087f70; font-size: .78rem; font-weight: 800; text-decoration: none; }
.pathway-grid { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 1rem; }.pathway-step { position: relative; padding: 1.4rem 0; border-top: 2px solid #101412; }.pathway-step > span { color: #087f70; font: 700 .7rem ui-monospace, monospace; }.pathway-step > svg { display: block; width: 28px; height: 28px; margin: 2.5rem 0 1.2rem; }.pathway-step h3 { margin: 0 0 .5rem; font-size: 1.3rem; }.pathway-step p { max-width: 32ch; margin: 0 0 1rem; color: rgba(16,20,18,.64); font-size: .85rem; line-height: 1.55; }
.campaign-cta { display: flex; align-items: end; justify-content: space-between; gap: 2rem; margin-top: 2rem; padding: clamp(1.5rem, 4vw, 3rem); border-radius: 1.5rem; background: #101412; color: #fff; }.campaign-cta h2 { max-width: 600px; margin: .6rem 0 .7rem; font-size: clamp(1.8rem, 4vw, 3.5rem); line-height: .98; letter-spacing: -.055em; }.campaign-cta p:not(.eyebrow) { max-width: 550px; margin: 0; color: rgba(255,255,255,.68); font-size: .9rem; line-height: 1.55; }.source-note { margin: 2rem 0 0; color: rgba(16,20,18,.52); font-size: .72rem; line-height: 1.5; }.source-note a { color: inherit; text-decoration: underline; }
@media (max-width: 760px) { .campaigns-shell { width: min(100% - 1.2rem, 1180px); }.campaigns-hero, .section-heading, .campaign-cta { display: block; }.hero-note { margin-top: 2.5rem; padding-top: 1rem; padding-left: 1rem; }.hero-note-index { margin-bottom: 1rem; }.section-heading > p { margin-top: 1rem; }.campaign-grid, .pathway-grid { grid-template-columns: 1fr; }.campaign-card { min-height: 260px; }.campaign-cta .button { margin-top: 1.5rem; } }
@media (prefers-color-scheme: dark) { .campaigns-page { background: #0b110f; color: #f1f5f2; }.hero-lede, .hero-note p, .section-heading > p, .campaign-card p, .pathway-step p, .source-note { color: rgba(241,245,242,.68); }.hero-note, .section-block, .pathway-section { border-color: rgba(241,245,242,.2); }.campaign-card { border-color: rgba(241,245,242,.18); background: rgba(255,255,255,.04); }.campaign-card-featured { background: rgba(8,127,112,.23); }.button-secondary { border-color: rgba(241,245,242,.28); color: #f1f5f2; }.button-secondary:hover { background: #f1f5f2; color: #0b110f; }.pathway-step { border-color: #f1f5f2; }.campaign-cta { background: #d9f3e8; color: #101412; }.campaign-cta p:not(.eyebrow) { color: rgba(16,20,18,.68); }.button-light { background: #101412; color: #fff; } }
:global(.dark) .campaigns-page { background: #0b110f; color: #f1f5f2; }
:global(.dark) .campaigns-page .hero-lede, :global(.dark) .campaigns-page .hero-note p, :global(.dark) .campaigns-page .section-heading > p, :global(.dark) .campaigns-page .campaign-card p, :global(.dark) .campaigns-page .pathway-step p, :global(.dark) .campaigns-page .source-note { color: rgba(241,245,242,.68); }
:global(.dark) .campaigns-page .hero-note, :global(.dark) .campaigns-page .section-block, :global(.dark) .campaigns-page .pathway-section { border-color: rgba(241,245,242,.2); }
:global(.dark) .campaigns-page .campaign-card { border-color: rgba(241,245,242,.18); background: rgba(255,255,255,.04); }
:global(.dark) .campaigns-page .campaign-card-featured { background: rgba(8,127,112,.23); }
:global(.dark) .campaigns-page .button-secondary { border-color: rgba(241,245,242,.28); color: #f1f5f2; }
:global(.dark) .campaigns-page .button-secondary:hover { background: #f1f5f2; color: #0b110f; }
:global(.dark) .campaigns-page .pathway-step { border-color: #f1f5f2; }
:global(.dark) .campaigns-page .campaign-cta { background: #d9f3e8; color: #101412; }
:global(.dark) .campaigns-page .campaign-cta p:not(.eyebrow) { color: rgba(16,20,18,.68); }
:global(.dark) .campaigns-page .button-light { background: #101412; color: #fff; }
</style>
