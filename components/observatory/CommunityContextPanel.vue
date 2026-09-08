<template>
  <aside class="community-context" aria-labelledby="community-context-title">
    <div class="community-context__eyebrow"><span class="community-context__signal" aria-hidden="true" />{{ t('observatory.v2.community.eyebrow') }}</div>
    <h2 id="community-context-title">{{ t('observatory.v2.community.title') }}</h2>
    <p class="community-context__lead">{{ t('observatory.v2.community.lead') }}</p>
    <div class="community-context__metrics" aria-label="Observatory data counts">
      <span><strong>{{ formatCount(rareEarthCount) }}</strong> claims</span>
      <span><strong>{{ formatCount(culturalCount) }}</strong> cultural agents</span>
      <span><strong>{{ formatCount(communityCount) }}</strong> community pins</span>
    </div>

    <div class="community-context__principles">
      <article>
        <span class="community-context__icon" aria-hidden="true">◌</span>
        <h3>{{ t('observatory.v2.community.readTitle') }}</h3>
        <p>{{ t('observatory.v2.community.readText') }}</p>
      </article>
      <article>
        <span class="community-context__icon" aria-hidden="true">⌘</span>
        <h3>{{ t('observatory.v2.community.connectTitle') }}</h3>
        <p>{{ t('observatory.v2.community.connectText') }}</p>
      </article>
      <article>
        <span class="community-context__icon" aria-hidden="true">✦</span>
        <h3>{{ t('observatory.v2.community.actTitle') }}</h3>
        <p>{{ t('observatory.v2.community.actText') }}</p>
      </article>
    </div>

    <details class="community-context__method">
      <summary>{{ t('observatory.v2.community.methodology') }}</summary>
      <p>{{ t('observatory.v2.community.methodologyText') }}</p>
    </details>

    <button type="button" class="community-context__cta" @click="$emit('monitor')">
      <Icon name="lucide:notebook-pen" />
      {{ t('observatory.v2.community.monitor') }}
    </button>
  </aside>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()
defineProps<{ rareEarthCount: number; culturalCount: number; communityCount: number }>()
defineEmits<{ monitor: [] }>()
function formatCount(value: number) { return value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K` : value.toLocaleString() }
</script>

<style scoped>
.community-context { position:absolute; top:clamp(4.5rem,9vh,5.5rem); left:clamp(.75rem,1.5vw,1.25rem); width:min(25rem,calc(100vw - 1.5rem)); max-height:calc(100svh - 7rem); overflow-y:auto; z-index:531; padding:1.15rem; border:1px solid rgba(52,211,153,.26); border-radius:16px; background:linear-gradient(145deg,rgba(5,18,17,.96),rgba(9,12,16,.94)); color:rgba(255,255,255,.92); box-shadow:0 18px 60px rgba(0,0,0,.48); backdrop-filter:blur(20px) saturate(1.25); font-family:inherit; }
.community-context__eyebrow { display:flex; align-items:center; gap:.5rem; margin-bottom:.8rem; color:#6ee7b7; font:700 .65rem ui-monospace,monospace; letter-spacing:.12em; text-transform:uppercase; }.community-context__signal { width:.5rem; height:.5rem; border-radius:50%; background:#34d399; box-shadow:0 0 0 5px rgba(52,211,153,.12); }.community-context h2 { margin:0 0 .55rem; color:#fff; font-size:1.45rem; line-height:1.1; letter-spacing:-.04em; }.community-context__lead { margin:0 0 1rem; color:rgba(226,232,240,.76); font-size:.82rem; line-height:1.55; }.community-context__principles { display:grid; gap:.55rem; }.community-context__principles article { padding:.75rem; border:1px solid rgba(148,163,184,.14); border-radius:11px; background:rgba(255,255,255,.035); }.community-context__icon { display:block; margin-bottom:.35rem; color:#6ee7b7; font-size:1.05rem; }.community-context h3 { margin:0 0 .25rem; color:#f8fafc; font-size:.8rem; }.community-context article p { margin:0; color:rgba(226,232,240,.62); font-size:.72rem; line-height:1.45; }.community-context__method { margin-top:.8rem; border-top:1px solid rgba(148,163,184,.16); padding-top:.7rem; }.community-context__method summary { color:#a7f3d0; cursor:pointer; font-size:.72rem; font-weight:700; }.community-context__method p { margin:.55rem 0 0; color:rgba(226,232,240,.58); font-size:.7rem; line-height:1.5; }.community-context__cta { display:flex; align-items:center; justify-content:center; gap:.45rem; width:100%; min-height:44px; margin-top:1rem; border:1px solid rgba(52,211,153,.38); border-radius:10px; background:rgba(52,211,153,.12); color:#a7f3d0; font-size:.76rem; font-weight:800; cursor:pointer; transition:background .18s,transform .18s; }.community-context__cta:hover { background:rgba(52,211,153,.2); transform:translateY(-1px); }.community-context__cta:focus-visible { outline:2px solid #6ee7b7; outline-offset:2px; }
.community-context__metrics { display:grid; grid-template-columns:repeat(3,1fr); gap:.35rem; margin:0 0 1rem; }.community-context__metrics span { display:flex; flex-direction:column; gap:.12rem; padding:.45rem; border-left:2px solid #34d399; background:rgba(52,211,153,.06); color:rgba(226,232,240,.58); font-size:.58rem; text-transform:uppercase; letter-spacing:.04em; }.community-context__metrics strong { color:#f8fafc; font-size:1rem; letter-spacing:0; }
@media (max-width:767px) { .community-context { top:auto; bottom:4.75rem; left:.5rem; right:.5rem; width:auto; max-height:min(70svh,33rem); }.community-context__principles { grid-template-columns:repeat(3,minmax(0,1fr)); }.community-context__principles article { padding:.6rem; }.community-context article p { display:none; }.community-context h3 { font-size:.7rem; } }
@media (prefers-reduced-motion:reduce) { .community-context__cta { transition:none; } }
</style>
