/**
 * pages/vulcan-observatory/index.vue
 * @why Vulcan observatory 2D map — culture-first layout: rare-earth mining
 *      claims overlaid on a full-bleed 2D map with Mapa Cultura +
 *      Floresta Ativista agents highlighted as a featured overlay.
 *
 *      UI shape (top→bottom):
 *        - topbar  · brand, live counters, action icons
 *        - map     · fills the whole screen, panels overlay on top
 *        - right   · floating glass panel: Cultural Agents browser + legend
 *        - bottom  · year slider + my-territory pin tools + 3D toggle
 *
 *      Data flow (unchanged from v1):
 *        public/data/rare-earth/pococaldas/*.geojson        → useRareEarthData
 *        public/data/cultural-agents/cultural-agents.json   → useCulturalAgentsData (mapa_cultura + floresta_ativista merged)
 *        public/data/cultural-agents/floresta-ativista.json → useCulturalAgentsData (additive)
 *
 * @deps @/composables/useI18n (useI18n);
 *       @/composables/useVulcanObservatoryPage (useVulcanObservatoryPage);
 *       @/components/observatory/ObservatorySidebar.vue (Cultural browser — replaces the old 6-tab grid);
 * @connections /vulcan-observatory/3d.vue (3D counterpart sharing the same data composable)
 */
<template>
  <div id="main-content" tabindex="-1" class="relative w-full h-[100svh] overflow-hidden bg-black focus:outline-none" :class="{ 'vulc-has-panel': rightPanelOpen, 'vulc-has-left': leftSidebarOpen }">
    <!-- ── Loading overlay ─────────────────────────────────────────────── -->
    <Transition name="fade">
      <div
        v-if="isLoading || error"
        class="fixed inset-0 z-[9980] bg-black/90 flex flex-col items-center justify-center gap-5"
      >
        <template v-if="error && !isLoading">
          <div class="text-center">
            <Icon name="lucide:alert-triangle" class="text-5xl mb-4 mx-auto text-red-400" />
            <h2 class="text-lg font-bold text-red-400 uppercase tracking-wider mb-2">
              {{ t('observatory.error.loadFailed') }}
            </h2>
            <p class="text-sm text-zinc-500 mb-5 max-w-md">{{ error.message }}</p>
            <button
              type="button"
              class="px-5 py-2 text-sm font-bold rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
              @click="loadRareEarthData()"
            >
              {{ t('observatory.error.retry') }}
            </button>
          </div>
        </template>
        <template v-else>
          <div class="relative">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-20 h-20 text-red-500" viewBox="0 0 24 24">
              <path d="M0 0h24v24H0z" fill="none" />
              <path fill="currentColor" d="M20.27,4.74a4.93,4.93,0,0,1,1.52,4.61,5.32,5.32,0,0,1-4.1,4.51,5.12,5.12,0,0,1-5.2-1.5,5.53,5.53,0,0,0,6.13-1.48A5.66,5.66,0,0,0,20.27,4.74ZM12.32,11.53a5.49,5.49,0,0,0-1.47-6.2A5.57,5.57,0,0,0,4.71,3.72,5.17,5.17,0,0,1,9.53,2.2,5.52,5.52,0,0,1,13.9,6.45,5.28,5.28,0,0,1,12.32,11.53ZM19.2,20.29a4.92,4.92,0,0,1-4.72,1.49,5.32,5.32,0,0,1-4.34-4.05A5.2,5.2,0,0,1,11.6,12.5a5.6,5.6,0,0,0,1.51,6.13A5.63,5.63,0,0,0,19.2,20.29ZM3.79,19.38A5.18,5.18,0,0,1,2.32,14a5.3,5.3,0,0,1,4.59-4,5,5,0,0,1,4.58,1.61,5.55,5.55,0,0,0-6.32,1.69A5.46,5.46,0,0,0,3.79,19.38ZM12.23,12a5.11,5.11,0,0,0,3.66-5,5.75,5.75,0,0,0-3.18-6,5,5,0,0,1,4.42,2.3,5.21,5.21,0,0,1,.24,5.92A5.4,5.4,0,0,1,12.23,12ZM11.76,12a5.18,5.18,0,0,0-3.68,5.09,5.58,5.58,0,0,0,3.19,5.79c-1,.35-2.9-.46-4-1.68A5.51,5.51,0,0,1,11.76,12ZM23,12.63a5.07,5.07,0,0,1-2.35,4.52,5.23,5.23,0,0,1-5.91.2,5.24,5.24,0,0,1-2.67-4.77,5.51,5.51,0,0,0,5.45,3.33A5.52,5.52,0,0,0,23,12.63ZM1,11.23a5,5,0,0,1,2.49-4.5,5.23,5.23,0,0,1,5.81-.06,5.3,5.3,0,0,1,2.61,4.74A5.56,5.56,0,0,0,6.56,8.06,5.71,5.71,0,0,0,1,11.23Z">
                <animateTransform attributeName="transform" dur="1.5s" repeatCount="indefinite" type="rotate" values="0 12 12;360 12 12" />
              </path>
            </svg>
            <div class="absolute inset-0 flex items-center justify-center">
              <Icon name="lucide:mountain" class="text-3xl text-red-500" />
            </div>
          </div>
          <div class="text-center">
            <h2 class="text-base font-bold text-zinc-200 uppercase tracking-wider mb-1">
              {{ t('loading.observatoryOfVulcan') }}
            </h2>
            <p class="text-xs text-zinc-500">{{ loadingMessage }}</p>
          </div>
          <div class="w-56 h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500 ease-out"
              :style="{
                width: `${loadProgress}%`,
                background: 'linear-gradient(90deg, var(--obs-red), var(--obs-amber))',
              }"
            />
          </div>
          <span class="text-xs text-zinc-600 font-mono">{{ loadProgress }}%</span>
        </template>
      </div>
    </Transition>

    <!-- ── Map (fills the viewport; panels overlay on top) ─────────────── -->
    <ClientOnly>
      <MapView2D
        :default-dataset="'vulcan-observatory'"
        :rare-earth-points="pointsData"
        :rare-earth-filtered="filteredPoints"
        :rare-earth-polygons="visiblePolygons"
        :rare-earth-protected="protectedData"
        :rare-earth-water="waterData"
        :rare-earth-cultural="culturalData"
        :layer-visibility="layerVis"
        :fly-to-target="flyToTarget"
        @map-init="onMapInit"
      >
        <template #overlays>
          <!-- ── Merged topbar (brand + stats + menu in one bar) ─── -->
          <ObservatoryTopbar
            :category-stats="categoryStats"
            :total-count="totalCount"
            :animated-count="controls.animatedCount"
            :on-near-me="toggleGeoLocate"
            :near-me-active="controls.showGeoLocate.value"
          />

          <!-- ── Desktop: Floating action bubble (bottom-right) ──── -->
          <div class="vulc-actions-bubble" role="region" :aria-label="t('observatory.v2.actions')">
            <button
              type="button"
              class="vulc-actions-bubble__toggle"
              :aria-label="actionsExpanded ? 'Collapse actions' : 'Expand actions'"
              :aria-expanded="actionsExpanded"
              @click="actionsExpanded = !actionsExpanded"
            >
              <Icon :name="actionsExpanded ? 'lucide:x' : 'lucide:settings-2'" />
            </button>
            <Transition name="vulc-actions-expand">
              <nav v-show="actionsExpanded" class="vulc-actions-bubble__menu" :aria-label="t('observatory.v2.actions')">
                <button
                  type="button"
                  class="vulc-icon-btn"
                  :class="{ 'is-active': rightPanelOpen && rightPanelTab === 'timeline' }"
                  :aria-label="t('observatory.tabs.timeline')"
                  :aria-pressed="rightPanelOpen && rightPanelTab === 'timeline'"
                  @click="toggleTimeline"
                >
                  <Icon name="lucide:clock" />
                  <span class="vulc-icon-btn__tip">{{ t('observatory.tabs.timeline') }}</span>
                </button>
                <button
                  type="button"
                  class="vulc-icon-btn"
                  :aria-label="t('observatory.v2.corporateNetwork')"
                  @click="onRedeCorporativa()"
                >
                  <Icon name="lucide:share-2" />
                  <span class="vulc-icon-btn__tip">{{ t('observatory.v2.corporateNetwork') }}</span>
                </button>
                <button
                  type="button"
                  class="vulc-icon-btn"
                  :aria-label="t('observatory.v2.downloadData')"
                  @click="onDataDownload()"
                >
                  <Icon name="lucide:download" />
                  <span class="vulc-icon-btn__tip">{{ t('observatory.v2.downloadData') }}</span>
                </button>
                <button
                  type="button"
                  class="vulc-icon-btn"
                  :class="{ 'is-active': controls.enterpriseLayerVisible.value }"
                  :aria-label="t('observatory.v2.enterpriseHq')"
                  :aria-pressed="controls.enterpriseLayerVisible.value"
                  @click="controls.toggleEnterpriseLayer()"
                >
                  <Icon name="lucide:building-2" />
                  <span class="vulc-icon-btn__tip">{{ t('observatory.v2.enterpriseHq') }}</span>
                </button>
                <button
                  type="button"
                  class="vulc-icon-btn"
                  :class="{ 'is-active': controls.showDataTable.value }"
                  :aria-label="t('observatory.v2.dataTable')"
                  :aria-pressed="controls.showDataTable.value"
                  @click="controls.showDataTable.value = !controls.showDataTable.value"
                >
                  <Icon name="lucide:table" />
                  <span class="vulc-icon-btn__tip">{{ t('observatory.v2.dataTable') }}</span>
                </button>
                <button
                  type="button"
                  class="vulc-icon-btn"
                  :aria-label="t('observatory.v2.export')"
                  @click="controls.showExport.value = !controls.showExport.value"
                >
                  <Icon name="lucide:file-down" />
                  <span class="vulc-icon-btn__tip">{{ t('observatory.v2.export') }}</span>
                </button>
                <button
                  type="button"
                  class="vulc-icon-btn"
                  :aria-label="t('observatory.v2.shortcuts')"
                  @click="controls.showShortcuts.value = !controls.showShortcuts.value"
                >
                  <Icon name="lucide:keyboard" />
                  <span class="vulc-icon-btn__tip">{{ t('observatory.v2.shortcuts') }}</span>
                </button>
                <button
                  type="button"
                  class="vulc-icon-btn"
                  :aria-label="t('observatory.v2.nearMe')"
                  @click="controls.showGeoLocate.value = !controls.showGeoLocate.value"
                >
                  <Icon name="lucide:map-pin" />
                  <span class="vulc-icon-btn__tip">{{ t('observatory.v2.nearMe') }}</span>
                </button>
                <button
                  v-if="isRegional && onExpandToFullBrazil"
                  type="button"
                  class="vulc-icon-btn vulc-icon-btn--accent"
                  :aria-label="t('observatory.v2.fullBrazil')"
                  @click="onExpandToFullBrazil()"
                >
                  <Icon name="lucide:earth" />
                  <span class="vulc-icon-btn__tip">{{ t('observatory.v2.fullBrazil') }}</span>
                </button>
                <button
                  type="button"
                  class="vulc-icon-btn"
                  :aria-label="t('observatory.v2.monitor')"
                  @click="onUserContribution()"
                >
                  <Icon name="lucide:notebook-pen" />
                  <span class="vulc-icon-btn__tip">{{ t('observatory.v2.monitor') }}</span>
                </button>
                <button
                  type="button"
                  class="vulc-icon-btn vulc-icon-btn--primary"
                  :aria-label="t('observatory.v2.viewGlobe')"
                  @click="navigateTo('/vulcan-observatory/3d')"
                >
                  <Icon name="lucide:globe" />
                  <span class="vulc-icon-btn__tip">{{ t('observatory.v2.viewGlobe') }}</span>
                </button>
              </nav>
            </Transition>
          </div>

          <!-- ── Mobile: Vertical action menu (right side) ──────── -->
          <nav class="vulc-mobile-actions" :aria-label="t('observatory.v2.actions')">
            <button
              type="button"
              class="vulc-icon-btn vulc-icon-btn--primary"
              :class="{ 'is-active': rightPanelOpen }"
              :aria-label="t('observatory.v2.panel.expand')"
              :aria-pressed="rightPanelOpen"
              @click="rightPanelOpen = !rightPanelOpen"
            >
              <Icon :name="rightPanelOpen ? 'lucide:panel-right-close' : 'lucide:panel-right-open'" />
              <span class="vulc-icon-btn__tip">{{ t('observatory.v2.panel.expand') }}</span>
            </button>
            <button
              type="button"
              class="vulc-icon-btn"
              :class="{ 'is-active': rightPanelOpen && rightPanelTab === 'timeline' }"
              :aria-label="t('observatory.tabs.timeline')"
              :aria-pressed="rightPanelOpen && rightPanelTab === 'timeline'"
              @click="toggleTimeline"
            >
              <Icon name="lucide:clock" />
              <span class="vulc-icon-btn__tip">{{ t('observatory.tabs.timeline') }}</span>
            </button>
            <button
              type="button"
              class="vulc-icon-btn"
              :aria-label="t('observatory.v2.corporateNetwork')"
              @click="onRedeCorporativa()"
            >
              <Icon name="lucide:share-2" />
              <span class="vulc-icon-btn__tip">{{ t('observatory.v2.corporateNetwork') }}</span>
            </button>
            <button
              type="button"
              class="vulc-icon-btn"
              :aria-label="t('observatory.v2.downloadData')"
              @click="onDataDownload()"
            >
              <Icon name="lucide:download" />
              <span class="vulc-icon-btn__tip">{{ t('observatory.v2.downloadData') }}</span>
            </button>
            <button
              type="button"
              class="vulc-icon-btn"
              :class="{ 'is-active': controls.enterpriseLayerVisible.value }"
              :aria-label="t('observatory.v2.enterpriseHq')"
              :aria-pressed="controls.enterpriseLayerVisible.value"
              @click="controls.toggleEnterpriseLayer()"
            >
              <Icon name="lucide:building-2" />
              <span class="vulc-icon-btn__tip">{{ t('observatory.v2.enterpriseHq') }}</span>
            </button>
            <button
              type="button"
              class="vulc-icon-btn"
              :class="{ 'is-active': controls.showDataTable.value }"
              :aria-label="t('observatory.v2.dataTable')"
              :aria-pressed="controls.showDataTable.value"
              @click="controls.showDataTable.value = !controls.showDataTable.value"
            >
              <Icon name="lucide:table" />
              <span class="vulc-icon-btn__tip">{{ t('observatory.v2.dataTable') }}</span>
            </button>
            <button
              type="button"
              class="vulc-icon-btn"
              :aria-label="t('observatory.v2.export')"
              @click="controls.showExport.value = !controls.showExport.value"
            >
              <Icon name="lucide:file-down" />
              <span class="vulc-icon-btn__tip">{{ t('observatory.v2.export') }}</span>
            </button>
            <button
              type="button"
              class="vulc-icon-btn"
              :aria-label="t('observatory.v2.shortcuts')"
              @click="controls.showShortcuts.value = !controls.showShortcuts.value"
            >
              <Icon name="lucide:keyboard" />
              <span class="vulc-icon-btn__tip">{{ t('observatory.v2.shortcuts') }}</span>
            </button>
            <button
              type="button"
              class="vulc-icon-btn"
              :aria-label="t('observatory.v2.nearMe')"
              @click="controls.showGeoLocate.value = !controls.showGeoLocate.value"
            >
              <Icon name="lucide:map-pin" />
              <span class="vulc-icon-btn__tip">{{ t('observatory.v2.nearMe') }}</span>
            </button>
            <button
              v-if="isRegional && onExpandToFullBrazil"
              type="button"
              class="vulc-icon-btn vulc-icon-btn--accent"
              :aria-label="t('observatory.v2.fullBrazil')"
              @click="onExpandToFullBrazil()"
            >
              <Icon name="lucide:earth" />
              <span class="vulc-icon-btn__tip">{{ t('observatory.v2.fullBrazil') }}</span>
            </button>
            <button
              type="button"
              class="vulc-icon-btn"
              :aria-label="t('observatory.v2.monitor')"
              @click="onUserContribution()"
            >
              <Icon name="lucide:notebook-pen" />
              <span class="vulc-icon-btn__tip">{{ t('observatory.v2.monitor') }}</span>
            </button>
            <button
              type="button"
              class="vulc-icon-btn vulc-icon-btn--primary"
              :aria-label="t('observatory.v2.viewGlobe')"
              @click="navigateTo('/vulcan-observatory/3d')"
            >
              <Icon name="lucide:globe" />
              <span class="vulc-icon-btn__tip">{{ t('observatory.v2.viewGlobe') }}</span>
            </button>
          </nav>

          <!-- ── Left-side: Mining claim filters ──────────────────── -->
          <aside v-show="leftSidebarOpen" class="vulc-leftpanel" aria-label="Mining claim filters">
            <div class="vulc-leftpanel__scroll">
              <!-- Claim text search -->
              <div class="vulc-leftpanel__section" role="search">
                <div class="vulc-searchbox">
                  <Icon name="lucide:search" class="vulc-searchbox__icon" />
                  <input
                    :value="controls.searchTerm.value"
                    type="search"
                    class="vulc-searchbox__input"
                    :placeholder="t('observatory.territory.searchPlaceholder')"
                    :aria-label="t('observatory.territory.searchPlaceholder')"
                    @input="onUpdateSearchTerm(($event.target as HTMLInputElement).value)"
                  >
                  <button
                    v-if="controls.searchTerm.value"
                    type="button"
                    class="vulc-searchbox__clear"
                    :aria-label="t('observatory.v2.panel.searchClear')"
                    @click="onUpdateSearchTerm('')"
                  >
                    <Icon name="lucide:x" />
                  </button>
                </div>
                <span v-if="activeFilterCount > 0" class="vulc-filtercount" :title="activeFilterSummary">
                  {{ t('observatory.territory.filtersActive', { count: activeFilterCount }) }}
                </span>
                <!-- Protected-area / buffer-zone hits for the same query -->
                <div v-if="controls.searchTerm.value.trim().length >= 2" class="vulc-protmatches" role="list" :aria-label="t('observatory.layers.protectedSearch')">
                  <button
                    v-for="hit in controls.protectedMatches.value"
                    :key="`prot-${hit.kind}-${hit.name}`"
                    type="button"
                    role="listitem"
                    class="vulc-protmatch"
                    :title="hit.municipality ? `${hit.municipality}${hit.state ? ` · ${hit.state}` : ''}` : hit.kind"
                    @click="controls.flyToProtectedArea(hit)"
                  >
                    <Icon name="lucide:shield-check" class="vulc-protmatch__icon" />
                    <span class="vulc-protmatch__name">{{ hit.name }}</span>
                    <span class="vulc-protmatch__kind">{{ hit.kind === 'buffer' ? 'ZA' : hit.kind === 'uc' ? 'UC' : hit.kind === 'ti' ? 'TI' : hit.kind === 'quilombo' ? 'QUILOMBO' : hit.kind }}</span>
                  </button>
                  <span v-if="!controls.protectedMatches.value.length" class="vulc-protmatch__empty">{{ t('observatory.layers.noProtectedSearch') }}</span>
                </div>
              </div>

              <hr class="vulc-leftpanel__divider">

              <!-- Mining phase filter -->
              <div class="vulc-leftpanel__section">
                <PhaseFilter :selected="controls.selectedPhases.value" @update:selected="updatePhases" />
                <label class="vulc-leftpanel__check" @click.stop="onUpdateSobDemanda(!controls.sobDemandaOnly.value)">
                  <div :class="['vulc-leftpanel__box', !controls.sobDemandaOnly.value && 'is-off']" style="--cb-c: #9b59b6">
                    <Icon v-if="controls.sobDemandaOnly.value" name="lucide:check" class="w-2.5 h-2.5" />
                  </div>
                  <span class="vulc-leftpanel__label">{{ t('observatory.territory.sobDemanda') }}</span>
                </label>
              </div>

              <hr class="vulc-leftpanel__divider">

              <div class="vulc-leftpanel__section">
                <h3 class="vulc-leftpanel__heading">{{ t('observatory.layers.title') }}</h3>
                <div
                  v-for="c in categoryStats" :key="c.key"
                  class="vulc-leftpanel__check"
                  role="checkbox"
                  :aria-checked="controls.layerVis.value[c.key]"
                  :aria-label="c.label"
                  tabindex="0"
                  @click="controls.toggleLayer(c.key)"
                  @keydown.enter="controls.toggleLayer(c.key)"
                  @keydown.space.prevent="controls.toggleLayer(c.key)"
                >
                  <div :class="['vulc-leftpanel__box', !controls.layerVis.value[c.key] && 'is-off']" :style="{ '--cb-c': c.color }">
                    <Icon v-if="controls.layerVis.value[c.key]" name="lucide:check" class="w-2.5 h-2.5" />
                  </div>
                  <span class="vulc-leftpanel__label">{{ c.label }}</span>
                </div>
              </div>

              <hr class="vulc-leftpanel__divider">

              <div class="vulc-leftpanel__section">
                <div
                  v-for="ex in controls.extraLayers" :key="ex.key"
                  class="vulc-leftpanel__check"
                  role="checkbox"
                  :aria-checked="controls.layerVis.value[ex.key]"
                  :aria-label="t(ex.labelKey)"
                  tabindex="0"
                  @click="controls.toggleLayer(ex.key)"
                  @keydown.enter="controls.toggleLayer(ex.key)"
                  @keydown.space.prevent="controls.toggleLayer(ex.key)"
                >
                  <div :class="['vulc-leftpanel__box', !controls.layerVis.value[ex.key] && 'is-off']" :style="{ '--cb-c': ex.color }">
                    <Icon v-if="controls.layerVis.value[ex.key]" name="lucide:check" class="w-2.5 h-2.5" />
                  </div>
                  <span class="vulc-leftpanel__label">{{ t(ex.labelKey) }}</span>
                </div>
              </div>

              <hr class="vulc-leftpanel__divider">

              <div class="vulc-leftpanel__section">
                <h3 class="vulc-leftpanel__heading">{{ t('observatory.layers.protectedAreas') }}</h3>
                <div
                  class="vulc-leftpanel__check"
                  role="checkbox"
                  :aria-checked="controls.layerVis.value['protected_ti'] !== false"
                  :aria-label="t('observatory.layers.indigenousLands')"
                  tabindex="0"
                  @click="controls.toggleLayer('protected_ti')"
                  @keydown.enter="controls.toggleLayer('protected_ti')"
                  @keydown.space.prevent="controls.toggleLayer('protected_ti')"
                >
                  <div :class="['vulc-leftpanel__box', controls.layerVis.value['protected_ti'] === false && 'is-off']" style="--cb-c: #c0392b">
                    <Icon v-if="controls.layerVis.value['protected_ti'] !== false" name="lucide:check" class="w-2.5 h-2.5" />
                  </div>
                  <span class="vulc-leftpanel__label">{{ t('observatory.layers.indigenousLands') }}</span>
                </div>
                <div
                  class="vulc-leftpanel__check"
                  role="checkbox"
                  :aria-checked="controls.layerVis.value['protected_quilombo'] !== false"
                  :aria-label="t('observatory.layers.quilombolaTerritories')"
                  tabindex="0"
                  @click="controls.toggleLayer('protected_quilombo')"
                  @keydown.enter="controls.toggleLayer('protected_quilombo')"
                  @keydown.space.prevent="controls.toggleLayer('protected_quilombo')"
                >
                  <div :class="['vulc-leftpanel__box', controls.layerVis.value['protected_quilombo'] === false && 'is-off']" style="--cb-c: #f39c12">
                    <Icon v-if="controls.layerVis.value['protected_quilombo'] !== false" name="lucide:check" class="w-2.5 h-2.5" />
                  </div>
                  <span class="vulc-leftpanel__label">{{ t('observatory.layers.quilombolaTerritories') }}</span>
                </div>
                <div
                  class="vulc-leftpanel__check"
                  role="checkbox"
                  :aria-checked="controls.layerVis.value['protected_uc'] !== false"
                  :aria-label="t('observatory.layers.conservationUnits')"
                  tabindex="0"
                  @click="controls.toggleLayer('protected_uc')"
                  @keydown.enter="controls.toggleLayer('protected_uc')"
                  @keydown.space.prevent="controls.toggleLayer('protected_uc')"
                >
                  <div :class="['vulc-leftpanel__box', controls.layerVis.value['protected_uc'] === false && 'is-off']" style="--cb-c: #27ae60">
                    <Icon v-if="controls.layerVis.value['protected_uc'] !== false" name="lucide:check" class="w-2.5 h-2.5" />
                  </div>
                  <span class="vulc-leftpanel__label">{{ t('observatory.layers.conservationUnits') }}</span>
                </div>
                <div
                  class="vulc-leftpanel__check"
                  role="checkbox"
                  :aria-checked="controls.layerVis.value['protected_buffer'] !== false"
                  :aria-label="t('observatory.layers.bufferZones')"
                  tabindex="0"
                  @click="controls.toggleLayer('protected_buffer')"
                  @keydown.enter="controls.toggleLayer('protected_buffer')"
                  @keydown.space.prevent="controls.toggleLayer('protected_buffer')"
                >
                  <div :class="['vulc-leftpanel__box', controls.layerVis.value['protected_buffer'] === false && 'is-off']" style="--cb-c: #2dd4bf">
                    <Icon v-if="controls.layerVis.value['protected_buffer'] !== false" name="lucide:check" class="w-2.5 h-2.5" />
                  </div>
                  <span class="vulc-leftpanel__label">{{ t('observatory.layers.bufferZones') }}</span>
                </div>
                <div
                  class="vulc-leftpanel__check"
                  role="checkbox"
                  :aria-checked="controls.layerVis.value['overlaps'] !== false"
                  :aria-label="t('observatory.layers.overlaps')"
                  tabindex="0"
                  @click="controls.toggleLayer('overlaps')"
                  @keydown.enter="controls.toggleLayer('overlaps')"
                  @keydown.space.prevent="controls.toggleLayer('overlaps')"
                >
                  <div :class="['vulc-leftpanel__box', controls.layerVis.value['overlaps'] === false && 'is-off']" style="--cb-c: #ff00ff">
                    <Icon v-if="controls.layerVis.value['overlaps'] !== false" name="lucide:check" class="w-2.5 h-2.5" />
                  </div>
                  <span class="vulc-leftpanel__label">{{ t('observatory.layers.overlaps') }}</span>
                </div>
              </div>

              <hr class="vulc-leftpanel__divider">

              <!-- ── Layer status: live counts per loaded source ── -->
              <div class="vulc-leftpanel__section" role="status" :aria-label="t('observatory.layers.statusTitle')">
                <h3 class="vulc-leftpanel__heading">{{ t('observatory.layers.statusTitle') }}</h3>
                <div class="vulc-status">
                  <span class="vulc-status__row">
                    <span class="vulc-status__dot" :class="{ 'is-empty': !(layerCounts?.points || filteredPoints?.features?.length) }" aria-hidden="true" />
                    {{ t('observatory.v2.claimsTotal') }} · <strong>{{ (layerCounts?.points ?? pointsData?.features?.length ?? 0).toLocaleString() }}</strong>
                  </span>
                  <span class="vulc-status__row">
                    <span class="vulc-status__dot" :class="{ 'is-empty': !(layerCounts?.polygons || polygonsData?.features?.length) }" aria-hidden="true" />
                    {{ t('observatory.layers.polygons') }} · <strong>{{ (layerCounts?.polygons ?? polygonsData?.features?.length ?? 0).toLocaleString() }}</strong>
                  </span>
                  <span class="vulc-status__row">
                    <span class="vulc-status__dot" :class="{ 'is-empty': !((layerCounts?.protectedTi ?? 0) + (layerCounts?.protectedQuilombo ?? 0) + (layerCounts?.protectedUc ?? 0) + (layerCounts?.protectedBuffer ?? 0)) }" aria-hidden="true" />
                    {{ t('observatory.layers.protectedAreas') }} · <strong>{{ (layerCounts?.protectedTi ?? 0) + (layerCounts?.protectedQuilombo ?? 0) + (layerCounts?.protectedUc ?? 0) + (layerCounts?.protectedBuffer ?? 0) }}</strong>
                  </span>
                  <span v-if="lastSync" class="vulc-status__sync">{{ lastSync }}</span>
                  <span v-for="(msg, key) in (resourceErrors ?? {})" :key="key" class="vulc-status__error">
                    {{ key }} · {{ t('observatory.layers.statusFailed') }} ({{ msg }})
                  </span>
                </div>
              </div>
            </div>
            <button type="button" class="vulc-leftpanel__toggle" :aria-label="leftSidebarOpen ? 'Collapse layers' : 'Expand layers'" @click="leftSidebarOpen = false">
              <Icon name="lucide:chevron-left" class="w-3.5 h-3.5" />
            </button>
          </aside>
          <button v-if="!leftSidebarOpen" type="button" class="vulc-leftpanel__show" aria-label="Show layers" @click="leftSidebarOpen = true">
            <Icon name="lucide:layers" class="w-4 h-4" />
          </button>

          <!-- ── Right-side: Territory / Culture / Powers / Timeline intel ── -->
          <ObservatorySidebar
            v-model:open="rightPanelOpen"
            v-model:active-tab="rightPanelTab"
            :rare-earth-cultural="culturalData"
            :speculator-index="speculatorIndex"
            :layer-vis="controls.layerVis.value"
            :toggle-layer="controls.toggleLayer"
            :deep-analysis="deepAnalysis"
            :protected-breakdown="protectedSummary"
            :overlap-summary="overlapSummary"
            :water-summary="waterSummary"
            :foreign-holders="foreignHolders"
            :search-term="controls.searchTerm.value"
            :selected-phases="controls.selectedPhases.value"
            :sob-demanda-only="controls.sobDemandaOnly.value"
            :pin-threats="pinThreats"
            :layer-counts="layerCounts"
            :category-stats="categoryStats"
            :total-claims="totalCount"
            :last-sync="lastSync"
            :year-min="yearMin"
            :year-max="yearMax"
            :filtered-count="filteredCount"
            :protected-matches="controls.protectedMatches.value"
            :cultural-loading="culturalLoading"
            :cultural-error="culturalError?.message ?? null"
            @fly-to-coord="flyToCoord"
            @fly-to-enterprise="zoomToDanger"
            @jump-to-cultural="onJumpToCultural"
            @retry-cultural="loadCulturalAgents"
            @report-enterprise="onReportEnterprise"
            @report-pattern="onReportPattern"
            @add-observation="onUserContribution()"
            @update:year-min="onUpdateYearMin"
            @update:year-max="onUpdateYearMax"
            @update:search-term="onUpdateSearchTerm"
            @update:selected-phases="updatePhases"
            @update:sob-demanda-only="onUpdateSobDemanda"
          />

        </template>
      </MapView2D>

      <!-- ── Modals ──────────────────────── -->
      <RedeCorporativa
        :visible="showRedeCorporativa"
        @close="showRedeCorporativa = false"
        @fly-to-enterprise="flyToEnterprise"
      />
      <DataDownloadPanel :visible="showDownload" @close="showDownload = false" />
      <ClaimReportModal :visible="showClaimReport" :claim="reportClaim" @close="showClaimReport = false" />
      <ExportModal :visible="showExport" :map-container="mapContainerRef" :filter-summary="activeFilterSummary" @close="showExport = false" />
      <KeyboardShortcuts :visible="showShortcuts" @close="showShortcuts = false" />
      <GeoLocateModal :visible="showGeoLocate" @close="showGeoLocate = false" @locate="onGeoLocateWithPin" />
      <UserContributionModal :visible="showUserContribution" @close="showUserContribution = false" />
      <ClaimsDataTable
        :visible="showDataTable"
        :data="allFeatures"
        @close="showDataTable = false"
        @fly-to="(coords: [number, number]) => (flyToTarget = { lng: coords[0], lat: coords[1], zoom: 8 })"
      />
      <ClaimDetailModal :visible="showClaimDetail" :claim="claimDetailProps" :context="claimDetailContext" @close="closeClaimDetail" />

      <template #fallback>
        <div class="flex h-screen w-full items-center justify-center bg-zinc-950 text-white">
          <LoadingSpinner :message="t('loading.observatoryOfVulcan')" :inline="true" />
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, defineAsyncComponent } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useVulcanObservatoryPage } from '@/composables/useVulcanObservatoryPage'

import MapView2D from '@/components/MapView2D.vue'
import ObservatorySidebar from '@/components/observatory/ObservatorySidebar.vue'
import ObservatoryTopbar from '@/components/observatory/ObservatoryTopbar.vue'
import PhaseFilter from '@/components/observatory/PhaseFilter.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
// Below-fold modals/panels load on demand so the initial bundle stays lean
// (all render behind `visible` gates — no feature change, just timing).
const RedeCorporativa = defineAsyncComponent(() => import('@/components/RedeCorporativa.vue'))
const DataDownloadPanel = defineAsyncComponent(() => import('@/components/DataDownloadPanel.vue'))
const ClaimReportModal = defineAsyncComponent(() => import('@/components/observatory/ClaimReportModal.vue'))
const ExportModal = defineAsyncComponent(() => import('@/components/observatory/ExportModal.vue'))
const KeyboardShortcuts = defineAsyncComponent(() => import('@/components/observatory/KeyboardShortcuts.vue'))
const GeoLocateModal = defineAsyncComponent(() => import('@/components/observatory/GeoLocateModal.vue'))
const UserContributionModal = defineAsyncComponent(() => import('@/components/observatory/UserContributionModal.vue'))
const ClaimsDataTable = defineAsyncComponent(() => import('@/components/observatory/ClaimsDataTable.vue'))
const ClaimDetailModal = defineAsyncComponent(() => import('@/components/observatory/ClaimDetailModal.vue'))

const { t } = useI18n()

useHead({
  title: 'Vulcan Observatory · Poços de Caldas | Earth Guardians',
  meta: [
    {
      name: 'description',
      content:
        'A community observatory for Poços de Caldas: public mining records, water, protected territories and cultural agents brought together for context-aware Earth Guardians action.',
    },
  ],
})

const {
  controls,
  stats,
  pointsData,
  filteredPoints,
  filteredPolygons,
  polygonsData,
  protectedData,
  waterData,
  culturalData,
  layerVis,
  flyToTarget,
  onMapInit,
  allFeatures,
  speculatorIndex,
  deepAnalysis,
  layerCounts,
  overlapSummary,
  protectedSummary,
  waterSummary,
  foreignHolders,
  pinThreats,
  setUserPin,
  resourceErrors,
  lastSync,
  yearMin,
  yearMax,
  filteredCount,
  isLoading,
  loadPhase,
  loadProgress,
  error,
  loadRareEarthData,
  loadFullBrazil,
  isRegional,
  showRedeCorporativa,
  showDownload,
  showUserContribution,
  showClaimDetail,
  claimDetailProps,
  claimDetailContext,
  closeClaimDetail,
  loadingMessage,
  flyToEnterprise,
  zoomToDanger,
  flyToCoord,
  onGeoLocate,
  activeFilterSummary,
  showShortcuts,
  showDataTable,
  showTimeline,
  showExport,
  showGeoLocate,
  showClaimReport,
  reportClaim,
  mapContainerRef,
  culturalLoading,
  culturalError,
  loadCulturalAgents,
} = useVulcanObservatoryPage('pococaldas')

const { categoryStats, totalCount, activeFilterCount } = stats

// Polygons honour the mining-phase filter (see useObservatoryControls):
// prefer the filtered set, falling back to raw only before the first
// filter pass runs (filtered empty + no active filters + raw present).
const visiblePolygons = computed(() => {
  const f = filteredPolygons.value as unknown as GeoJSON.FeatureCollection | undefined
  const raw = polygonsData.value as unknown as GeoJSON.FeatureCollection | undefined
  if (f?.features?.length) return f
  if (!raw?.features?.length) return f ?? raw
  if ((activeFilterCount?.value ?? 0) > 0) return f ?? raw
  return raw
})

const leftSidebarOpen = ref(false)
const actionsExpanded = ref(false)

// Right intel panel state (bound to ObservatorySidebar via v-model).
// Desktop starts open; phones/tablets start closed and auto-coordinate
// with the left filter drawer so the two never overlap.
type VulcPanelTab = 'territory' | 'culture' | 'power' | 'timeline'
const isNarrowScreen = typeof window !== 'undefined' ? window.innerWidth < 769 : false
const rightPanelOpen = ref(!isNarrowScreen)
const rightPanelTab = ref<VulcPanelTab>('territory')
const smallScreen = ref(isNarrowScreen)
let viewportMql: MediaQueryList | null = null
function handleViewportChange(e: MediaQueryListEvent) {
  smallScreen.value = e.matches
}
onMounted(() => {
  if (window.innerWidth >= 768) leftSidebarOpen.value = true
  viewportMql = window.matchMedia('(max-width: 768px)')
  smallScreen.value = viewportMql.matches
  viewportMql.addEventListener('change', handleViewportChange)
})
onUnmounted(() => {
  viewportMql?.removeEventListener('change', handleViewportChange)
})

/** Timeline action: opens the intel panel on the timeline tab. */
function toggleTimeline() {
  if (rightPanelOpen.value && rightPanelTab.value === 'timeline') {
    rightPanelOpen.value = false
    return
  }
  rightPanelTab.value = 'timeline'
  rightPanelOpen.value = true
  controls.showTimeline.value = true
}

// Small screens: the left drawer and right sheet are mutually exclusive.
watch(rightPanelOpen, (open) => {
  if (open && smallScreen.value) leftSidebarOpen.value = false
  if (!open) controls.showTimeline.value = false
})
watch(leftSidebarOpen, (open) => {
  if (open && smallScreen.value) rightPanelOpen.value = false
})
watch(rightPanelTab, (tab) => {
  if (tab !== 'timeline') controls.showTimeline.value = false
})

// Hoist callbacks for template (so they're defined before used)
function onRedeCorporativa() {
  showRedeCorporativa.value = true
}
function onDataDownload() {
  showDownload.value = true
}
function onUserContribution() {
  showUserContribution.value = true
}
/** Header Nearby action: opens the geolocate dialog (drops a watch pin). */
function toggleGeoLocate() {
  controls.showGeoLocate.value = !controls.showGeoLocate.value
}
function onExpandToFullBrazil() {
  loadFullBrazil()
}
function updatePhases(value: Set<string>) {
  controls.selectedPhases.value = value
  controls.debouncedFilter()
}
function onJumpToCultural(coord: [number, number], name: string) {
  flyToTarget.value = { lng: coord[0], lat: coord[1], zoom: 10 }
}
function onReportEnterprise(name: string, score: number, flags: string[]) {
  reportClaim.value = { n: name, score, flags }
  showClaimReport.value = true
}
function onReportPattern(_key: string) {
  // Illegal-pattern reports flow into the community Field Monitor inbox.
  showUserContribution.value = true
}
function onUpdateYearMin(v: number) {
  controls.yearMin.value = v
  controls.debouncedFilter()
}
function onUpdateYearMax(v: number) {
  controls.yearMax.value = v
  controls.debouncedFilter()
}
function onUpdateSearchTerm(v: string) {
  controls.searchTerm.value = v
  controls.debouncedFilter()
}
function onUpdateSobDemanda(v: boolean) {
  controls.sobDemandaOnly.value = v
  controls.debouncedFilter()
}
/** Geolocate + drop a watch pin so the Territory tab reports nearby claims. */
function onGeoLocateWithPin(lat: number, lng: number, city: string) {
  onGeoLocate(lat, lng, city)
  setUserPin({ lng, lat }, city || 'My location')
}
</script>

<style>
/* ════════════════════════════════════════════════════════════════════════════════
 *  Vulcan Observatory v2 — culture-first overlay shell
 *  Single merged top bar (ObservatoryTopbar: brand · counters · menu).
 *  The global app header is hidden on this route (see layouts/default),
 *  so the stack owns its band alone and panels anchor below it:
 *    merged topbar → panels/pillar → bottom dock.
 *  Top-bar visuals live in components/observatory/ObservatoryTopbar.vue.
 * ════════════════════════════════════════════════════════════════════════════════ */

/* No global header on this route — panels anchor below the merged bar. */
#main-content {
  --vulc-bar-top: calc(env(safe-area-inset-top) + 0.5rem);
  --vulc-bar-h: 3rem;
  --vulc-panel-top: calc(var(--vulc-bar-top) + var(--vulc-bar-h) + 0.9rem);
}

/* ── Icon buttons (shared) ──────────────────────────────────────── */
.vulc-icon-btn {
  position: relative;
  width: clamp(1.85rem, 3.5vw, 2.25rem);
  height: clamp(1.85rem, 3.5vw, 2.25rem);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  flex-shrink: 0;
}
.vulc-icon-btn svg,
.vulc-icon-btn :deep(svg) {
  width: 60%;
  height: 60%;
}
.vulc-icon-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.18);
  color: #fff;
}
.vulc-icon-btn.is-active {
  background: color-mix(in srgb, var(--obs-red, #e74c3c) 22%, transparent);
  border-color: color-mix(in srgb, var(--obs-red, #e74c3c) 45%, transparent);
  color: var(--obs-red, #e74c3c);
}
.vulc-icon-btn--accent {
  background: color-mix(in srgb, var(--obs-amber, #f39c12) 14%, transparent);
  border-color: color-mix(in srgb, var(--obs-amber, #f39c12) 35%, transparent);
  color: var(--obs-amber, #f39c12);
}
.vulc-icon-btn--primary {
  background: color-mix(in srgb, var(--obs-emerald, #10b981) 18%, transparent);
  border-color: color-mix(in srgb, var(--obs-emerald, #10b981) 45%, transparent);
  color: var(--obs-emerald, #10b981);
}
.vulc-icon-btn:focus-visible {
  outline: 2px solid var(--obs-red, #e74c3c);
  outline-offset: 2px;
}
.vulc-icon-btn__tip {
  position: absolute;
  top: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  padding: 0.25rem 0.55rem;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: #000;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s;
  z-index: 1;
}
.vulc-icon-btn:hover .vulc-icon-btn__tip {
  opacity: 1;
}

/* ── Desktop: Floating action bubble (bottom-right) ─────────────── */
.vulc-actions-bubble {
  position: absolute;
  bottom: clamp(1rem, 3vh, 1.5rem);
  right: clamp(0.75rem, 1.5vw, 1.25rem);
  z-index: 550;
  pointer-events: auto;
  display: none;
}
.vulc-actions-bubble__toggle {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #111113;
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, border-color 0.15s, color 0.15s, transform 0.2s;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}
.vulc-actions-bubble__toggle svg {
  width: 55%;
  height: 55%;
}
.vulc-actions-bubble__toggle:hover {
  background: #1a1a1e;
  border-color: rgba(255, 255, 255, 0.2);
  color: #fff;
  transform: scale(1.05);
}
.vulc-actions-bubble__menu {
  position: absolute;
  bottom: calc(100% + 0.5rem);
  right: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.5rem;
  background: #111113;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}
.vulc-actions-bubble__menu .vulc-icon-btn__tip {
  right: calc(100% + 8px);
  left: auto;
  top: 50%;
  transform: translateY(-50%);
}

/* ── Mobile: Vertical action menu (right side pillar) ───────────── */
.vulc-mobile-actions {
  position: absolute;
  top: var(--vulc-panel-top);
  right: clamp(0.35rem, 0.8vw, 0.5rem);
  bottom: 0;
  z-index: 540;
  pointer-events: auto;
  display: none;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.4rem;
  background: rgba(10, 10, 12, 0.85);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  overflow-y: auto;
  scrollbar-width: none;
}
.vulc-mobile-actions::-webkit-scrollbar { display: none; }
.vulc-mobile-actions .vulc-icon-btn {
  width: 2rem;
  height: 2rem;
}

/* ── Desktop show/hide ──────────────────────────────────────────── */
@media (min-width: 769px) {
  .vulc-actions-bubble { display: block; }
}
/* ── Mobile show/hide ───────────────────────────────────────────── */
@media (max-width: 768px) {
  .vulc-mobile-actions { display: flex; }
}

/* ── Actions expand transition ──────────────────────────────────── */
.vulc-actions-expand-enter-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.vulc-actions-expand-leave-active { transition: opacity 0.1s ease, transform 0.1s ease; }
.vulc-actions-expand-enter-from,
.vulc-actions-expand-leave-to { opacity: 0; transform: translateY(8px); }

/* ── Merged topbar responsive: handled inside ObservatoryTopbar.vue ── */

/* ── Left Panel (mining claim filters) ─────────────────────────────── */
.vulc-leftpanel {
  position: absolute;
  top: var(--vulc-panel-top);
  left: clamp(0.5rem, 1vw, 0.75rem);
  bottom: clamp(1rem, 3vh, 1.5rem);
  width: clamp(14rem, 20vw, 17rem);
  z-index: 530;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  background: #111113;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.vulc-leftpanel__scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0.65rem 0.75rem;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
}
.vulc-leftpanel__scroll::-webkit-scrollbar { width: 4px; }
.vulc-leftpanel__scroll::-webkit-scrollbar-track { background: transparent; }
.vulc-leftpanel__scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 2px; }
.vulc-leftpanel__section { display: flex; flex-direction: column; gap: 0.15rem; }
.vulc-leftpanel__heading {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.4);
  margin: 0 0 0.3rem;
}
.vulc-leftpanel__divider {
  border: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  margin: 0.4rem 0;
}
.vulc-leftpanel__check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0;
  cursor: pointer;
  user-select: none;
  border-radius: 4px;
  transition: background 0.1s;
}
.vulc-leftpanel__check:hover { background: rgba(255, 255, 255, 0.03); }
.vulc-leftpanel__check:focus-visible { outline: 2px solid var(--obs-red, #e74c3c); outline-offset: -2px; }
.vulc-leftpanel__box {
  width: 13px;
  height: 13px;
  border-radius: 3px;
  border: 2px solid var(--cb-c, #666);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  flex-shrink: 0;
}
.vulc-leftpanel__box.is-off { opacity: 0.3; }
.vulc-leftpanel__box svg { width: 0.6rem; height: 0.6rem; color: #fff; }
.vulc-leftpanel__label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.75);
  font-weight: 500;
  overflow-wrap: break-word;
  min-width: 0;
}
.vulc-leftpanel__check:hover .vulc-leftpanel__label { color: #fff; }
.vulc-leftpanel__toggle {
  flex-shrink: 0;
  padding: 0.35rem;
  background: transparent;
  border: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  font-family: inherit;
  transition: color 0.15s, background 0.15s;
  text-align: center;
}
.vulc-leftpanel__toggle:hover { color: #fff; background: rgba(255, 255, 255, 0.04); }
.vulc-leftpanel__show {
  position: absolute;
  top: var(--vulc-panel-top);
  left: clamp(0.5rem, 1vw, 0.75rem);
  width: 2.25rem;
  height: 2.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #111113;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  font-family: inherit;
  z-index: 530;
  pointer-events: auto;
  transition: background 0.15s, color 0.15s;
}
.vulc-leftpanel__show:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }

/* ── Claim search box ─────────────────────────────────────────── */
.vulc-searchbox {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  height: 2rem;
  padding: 0 0.6rem;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
}
.vulc-searchbox:focus-within {
  border-color: rgba(231, 76, 60, 0.5);
  box-shadow: 0 0 0 2px rgba(231, 76, 60, 0.12);
}
.vulc-searchbox__icon { width: 0.85rem; height: 0.85rem; color: rgba(255, 255, 255, 0.4); flex-shrink: 0; }
.vulc-searchbox__input {
  flex: 1;
  background: transparent;
  border: 0;
  outline: 0;
  color: #fff;
  font-size: 11px;
  font-family: inherit;
  padding: 0;
  min-width: 0;
}
.vulc-searchbox__input::placeholder { color: rgba(255, 255, 255, 0.35); }
.vulc-searchbox__clear {
  width: 1rem;
  height: 1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 0;
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  font-family: inherit;
}
.vulc-searchbox__clear svg { width: 0.75rem; height: 0.75rem; }
.vulc-searchbox__clear:hover { background: rgba(231, 76, 60, 0.15); color: var(--obs-red, #e74c3c); }
.vulc-filtercount {
  display: inline-block;
  margin-top: 0.3rem;
  font-size: 10px;
  font-weight: 700;
  color: var(--obs-amber, #f39c12);
  font-variant-numeric: tabular-nums;
}

/* ── Protected-area quick matches under the claim search ──────── */
.vulc-protmatches {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 0.45rem;
}
.vulc-protmatch {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
  padding: 0.35rem 0.5rem;
  background: rgba(39, 174, 96, 0.07);
  border: 1px solid rgba(39, 174, 96, 0.25);
  border-radius: 6px;
  color: #fff;
  font-family: inherit;
  font-size: 10px;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s, border-color 0.15s;
}
.vulc-protmatch:hover { background: rgba(39, 174, 96, 0.16); border-color: rgba(39, 174, 96, 0.5); }
.vulc-protmatch:focus-visible { outline: 2px solid #27ae60; outline-offset: 1px; }
.vulc-protmatch__icon { width: 0.75rem; height: 0.75rem; color: #27ae60; flex-shrink: 0; }
.vulc-protmatch__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}
.vulc-protmatch__kind {
  flex-shrink: 0;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.04em;
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.75);
}
.vulc-protmatch__empty { font-size: 10px; color: rgba(255, 255, 255, 0.4); padding: 0.2rem 0; }

/* ── Layer status readout ─────────────────────────────────────── */
.vulc-status { display: flex; flex-direction: column; gap: 0.2rem; }
.vulc-status__row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.65);
  font-variant-numeric: tabular-nums;
}
.vulc-status__row strong { color: #fff; font-weight: 800; }
.vulc-status__dot {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  background: var(--obs-emerald, #10b981);
  flex-shrink: 0;
}
.vulc-status__dot.is-empty { background: var(--obs-red, #e74c3c); }
.vulc-status__sync {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  font-family: ui-monospace, monospace;
}
.vulc-status__error {
  font-size: 10px;
  color: var(--obs-amber, #f39c12);
  overflow-wrap: break-word;
}

/* ── Tablet/phone: non-overlapping auto-adjust stack ──────────────
   From top to bottom, each layer owns its band:
     merged topbar → left drawer / right sheet / action pillar → bottom dock.
   The left filter drawer and right intel sheet are mutually exclusive
   (see watchers); the action pillar hides while the sheet is open. */
@media (max-width: 768px) {
  .vulc-mobile-actions {
    top: var(--vulc-panel-top);
    bottom: var(--vulc-dock-clear);
    max-height: none;
  }
  .vulc-has-panel .vulc-mobile-actions { display: none; }
  .vulc-leftpanel {
    top: var(--vulc-panel-top);
    bottom: var(--vulc-dock-clear);
    width: min(19rem, calc(100vw - 4.5rem));
  }
  .vulc-leftpanel__show {
    top: var(--vulc-panel-top);
    left: 0.5rem;
    width: 2.75rem;
    height: 2.75rem;
  }
  .vulc-has-panel .vulc-leftpanel__show { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .vulc-icon-btn { animation: none; transition: none; }
}
</style>
