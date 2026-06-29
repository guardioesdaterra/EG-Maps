# Review and improve observatory-of-vulcan loading

**Session ID:** ses_0f01c02b4ffeOhtD4ZeyfvOwpT
**Created:** 6/28/2026, 8:20:27 PM
**Updated:** 6/28/2026, 8:50:17 PM

---

## User

double review and improve the whole flow of loading of @pages/observatory-of-vulcan/ - and make sure the default map is a minimized data load of specific zoom on Poços de Caldas Vulcan Alcaline Platou, circle of ~100km, zoomed in this area, with cultural map, hidrography and mining earth rare directly projects and requeriments + indigenous lands, waterbodies and their info + possibility to user to add datails / photos updates of them monitoring all -

---

## Assistant (Build · MiMo V2.5 Free · 7.7s)

_Thinking:_

The user wants me to review and improve the loading flow of the `@pages/observatory-of-vulcan/` directory, specifically focusing on:
1. Default map being a minimized data load of specific zoom on Poços de Caldas Vulcan Alkaline Plateau
2. Circle of ~100km
3. Cultural map, hydrography and mining earth rare projects and requirements
4. Indigenous lands, waterbodies and their info
5. Possibility for users to add details/photos updates with monitoring

I'm in plan mode (read-only), so I need to:
1. First read the existing files to understand the current implementation
2. Explore related components and composables
3. Create a comprehensive plan

Let me start by reading the files in the observatory-of-vulcan directory and exploring related components.

I'll read the existing observatory-of-vulcan pages and explore related components to understand the current implementation and create an improvement plan.

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/ubuntu/EG-Maps/pages/observatory-of-vulcan/index.vue"
}
```

**Output:**
```
<path>/home/ubuntu/EG-Maps/pages/observatory-of-vulcan/index.vue</path>
<type>file</type>
<content>
1: <template>
2:   <div id="main-content" class="relative">
3:     <!-- Loading overlay -->
4:     <Transition name="fade">
5:       <div v-if="isLoading || error" class="fixed inset-0 z-[9998] bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center gap-4">
6:         <template v-if="error && !isLoading">
7:           <div class="text-center">
8:             <span class="text-4xl mb-3 block">⚠️</span>
9:             <h2 class="text-fluid-sm font-bold text-red-400 uppercase tracking-wider mb-1">Failed to load data</h2>
10:             <p class="text-fluid-xs text-zinc-500 mb-4">{{ error.message }}</p>
11:             <button
12:               type="button"
13:               class="px-fluid-md py-fluid-xs text-fluid-xs font-bold rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
14:               @click="loadRareEarthData()">
15:               Retry
16:             </button>
17:           </div>
18:         </template>
19:         <template v-else>
20:           <div class="relative">
21:             <div class="w-[clamp(3.5rem,10vw,5rem)] h-[clamp(3.5rem,10vw,5rem)] border-4 border-zinc-800 border-t-red-500 rounded-full animate-spin" />
22:             <div class="absolute inset-0 flex items-center justify-center">
23:               <span class="text-fluid-xl">🌋</span>
24:             </div>
25:           </div>
26:           <div class="text-center">
27:             <h2 class="text-fluid-sm font-bold text-zinc-200 uppercase tracking-wider mb-1">{{ t('loading.observatoryOfVulcan') }}</h2>
28:             <p class="text-fluid-xs text-zinc-500">{{ loadingMessage }}</p>
29:           </div>
30:           <div class="w-[clamp(10rem,24vw,14rem)] h-1 bg-zinc-800 rounded-full overflow-hidden">
31:             <div
32:               class="h-full rounded-full transition-all duration-500 ease-out"
33:               :style="{ width: `${loadProgress}%`, background: `linear-gradient(90deg, var(--obs-red), var(--obs-amber))` }"
34:             />
35:           </div>
36:           <span class="text-fluid-xs text-zinc-600 font-mono">{{ loadProgress }}%</span>
37:         </template>
38:       </div>
39:     </Transition>
40: 
41:     <ClientOnly>
42:       <UnifiedMap
43:         :default-dataset="'observatory-of-vulcan'"
44:         :rare-earth-points="pointsData"
45:         :rare-earth-polygons="polygonsData"
46:         :rare-earth-protected="protectedData"
47:         :layer-visibility="layerVis"
48:         :fly-to-target="flyToTarget"
49:         @map-init="onMapInit"
50:       >
51:         <template #overlays>
52:           <!-- Stats panel top-left -->
53:           <div class="absolute top-[clamp(0.75rem,2vh,1rem)] left-[clamp(0.75rem,2vw,1rem)] z-[500] obs-stats-panel">
54:             <div class="flex items-center gap-2 mb-1.5">
55:               <span class="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
56:               <h1 class="text-fluid-sm font-black text-red-400 uppercase tracking-tight">Terras Raras Brasil</h1>
57:             </div>
58:             <p class="text-[9px] text-zinc-400 leading-tight hidden sm:block">
59:               <span class="inline-block text-[7px] px-1 py-0.5 rounded font-bold mr-0.5" style="background:var(--obs-red);color:#fff">{{ t('observatory.badges.mil') }}</span>
60:               <span class="inline-block text-[7px] px-1 py-0.5 rounded font-bold mr-0.5" style="background:var(--obs-green);color:#fff">{{ t('observatory.badges.amb') }}</span>
61:               <span class="inline-block text-[7px] px-1 py-0.5 rounded font-bold mr-0.5" style="background:var(--obs-purple);color:#fff">{{ t('observatory.badges.ill') }}</span>
62:               <span class="inline-block text-[7px] px-1 py-0.5 rounded font-bold mr-0.5" style="background:var(--obs-blue-dark);color:#fff">{{ t('observatory.badges.for') }}</span>
63:               {{ t('home.observatoryDesc') }}
64:             </p>
65:           </div>
66: 
67:           <!-- Animated stats counts -->
68:           <div class="absolute top-[clamp(0.75rem,2vh,1rem)] left-1/2 -translate-x-1/2 z-[500] hidden md:flex gap-2 bg-[var(--obs-panel-bg)] backdrop-blur border border-[var(--obs-panel-border)] rounded-xl px-3 py-1.5 shadow-lg">
69:             <div v-for="s in categoryStats" :key="s.key" class="flex items-center gap-1.5 text-[9px] group cursor-default" :title="s.label">
70:               <span class="w-2 h-2 rounded-full transition-transform group-hover:scale-150" :style="{ background: s.color }" />
71:               <span class="font-bold text-zinc-200 tabular-nums">{{ animatedCount(s.key, s.count) }}</span>
72:               <span class="text-zinc-500 hidden lg:inline">{{ s.label }}</span>
73:             </div>
74:             <div class="w-px bg-zinc-700 mx-1" />
75:             <span class="text-[9px] font-bold text-zinc-300 tabular-nums" aria-live="polite" aria-atomic="true">{{ animatedCount('__total', totalCount) }} total</span>
76:           </div>
77: 
78:           <!-- Sync + Secrecy -->
79:           <div v-if="deepAnalysis" class="absolute top-[clamp(0.75rem,2vh,1rem)] right-[clamp(0.75rem,2vw,1rem)] z-[500] hidden lg:flex flex-col gap-1 bg-[var(--obs-panel-bg)] backdrop-blur border border-[var(--obs-panel-border)] rounded-xl px-3 py-2 shadow-lg max-w-[clamp(10rem,20vw,14rem)]">
80:             <div class="flex items-center gap-1.5 text-[8.5px]" :title="t('observatory.sync.syncNote')">
81:               <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
82:               <span class="text-zinc-500 uppercase tracking-wider font-bold">{{ t('observatory.sync.lastSync') }}</span>
83:               <span class="text-zinc-300 font-mono ml-auto">{{ formatSyncDate(deepAnalysis.last_sync) }}</span>
84:             </div>
85:             <div v-if="deepAnalysis.sigilo_stats" class="flex items-center gap-1.5 text-[8.5px] pt-1 border-t border-zinc-800">
86:               <span class="text-zinc-500 uppercase tracking-wider font-bold">🔒</span>
87:               <span class="text-zinc-500">{{ t('observatory.sync.secrecyClaims') }}:</span>
88:               <span class="text-amber-400 font-bold">{{ deepAnalysis.sigilo_stats.total }}</span>
89:               <span class="text-zinc-400 font-mono ml-auto">{{ formatHa(deepAnalysis.sigilo_stats.total_area_ha) }} {{ t('observatory.sync.secrecyArea') }}</span>
90:             </div>
91:           </div>
92: 
93:           <!-- Action Buttons Row -->
94:           <div class="absolute top-[clamp(3.5rem,10vh,5rem)] left-[clamp(0.75rem,2vw,1rem)] z-[500] flex flex-wrap gap-1.5 max-w-[clamp(16rem,40vw,22rem)]">
95:             <button
96: @click="showTimeline = true"
97:               class="obs-action-btn"
98:               :style="{ '--accent': 'var(--obs-red)' }">
99:               <span>📖</span> <span class="hidden sm:inline">Geopolitical Timeline</span><span class="sm:hidden">Timeline</span>
100:             </button>
101:             <button
102: @click="showRedeCorporativa = true"
103:               class="obs-action-btn"
104:               :style="{ '--accent': 'var(--obs-blue-light)' }">
105:               <span>🔗</span> <span class="hidden sm:inline">Rede Corporativa</span><span class="sm:hidden">Network</span>
106:             </button>
107:             <button
108: @click="showDownload = true"
109:               class="obs-action-btn"
110:               :style="{ '--accent': 'var(--obs-green)' }">
111:               <span>⬇️</span> <span class="hidden sm:inline">Download Data</span><span class="sm:hidden">Download</span>
112:             </button>
113:             <button
114: @click="showExport = true"
115:               class="obs-action-btn"
116:               :style="{ '--accent': 'var(--obs-purple-soft)' }">
117:               <span>📄</span> Export
118:             </button>
119:             <button
120: @click="toggleEnterpriseLayer"
121:               class="obs-action-btn"
122:               :class="enterpriseLayerVisible ? 'obs-action-btn--active' : ''"
123:               :style="{ '--accent': 'var(--obs-purple-soft)' }">
124:               <span>🏢</span> <span class="hidden sm:inline">{{ t('observatory.layers.enterpriseHq') }}</span><span class="sm:hidden">HQ</span>
125:             </button>
126:             <button
127: @click="showShortcuts = true"
128:               class="obs-action-btn"
129:               title="Keyboard shortcuts (?)"
130:               :style="{ '--accent': 'var(--obs-gray)' }">
131:               <span>⌨️</span> ?
132:             </button>
133:             <button
134: @click="showDataTable = true"
135:               class="obs-action-btn"
136:               title="View all claims in table (T)"
137:               style="--accent:#3498db">
138:               <span>📊</span> Table
139:             </button>
140:             <button
141: @click="showGeoLocate = true"
142:               class="obs-action-btn"
143:               title="Find claims near you"
144:               style="--accent:#27ae60">
145:               <span>📍</span> <span class="hidden sm:inline">Near Me</span><span class="sm:hidden">Near</span>
146:             </button>
147:           </div>
148: 
149:           <!-- Tab navigation -->
150:           <ObservatorySidebar
151:             :active-tab="activeTab"
152:             :danger-items="speculatorIndex"
153:             :show-all="showAll"
154:             class="absolute"
155:             style="top: clamp(5.5rem, 14vh, 8rem); right: clamp(0.75rem, 2vw, 1rem);"
156:             @update:active-tab="(tab) => activeTab = tab"
157:             @update:show-all="(v) => showAll = v"
158:             @fly-to-enterprise="zoomToDanger"
159:             @fly-to-coord="flyToCoord"
160:           />
161: 
162:           <!-- My Territory Pin -->
163:           <div
164: v-if="userPin" class="absolute z-[500] bg-[var(--obs-panel-bg-dark)] backdrop-blur border border-emerald-700/40 rounded-xl px-3 py-2.5 shadow-lg max-w-[clamp(14rem,35vw,18rem)]"
165:             style="bottom: clamp(5rem, 12vh, 7.5rem); right: clamp(0.75rem, 2vw, 1rem);">
166:             <div class="flex items-center justify-between gap-2 mb-1.5">
167:               <div class="flex items-center gap-1.5">
168:                 <span class="text-fluid-sm">📍</span>
169:                 <h3 class="text-[10px] font-bold uppercase tracking-wider text-emerald-400">{{ t('observatory.myTerritory.title') }}</h3>
170:               </div>
171:               <button type="button" class="text-zinc-500 hover:text-red-400 text-[12px] leading-none" :aria-label="t('observatory.myTerritory.clear')" @click="clearPin">×</button>
172:             </div>
173:             <div class="text-[9px] text-zinc-300 leading-snug mb-1 break-words">
174:               <span v-if="userPinShared" class="inline-block text-[7px] font-bold uppercase text-amber-400 mr-1">{{ t('observatory.myTerritory.sharedBadge') }}</span>
175:               <strong>{{ userPin.label }}</strong>
176:             </div>
177:             <div class="text-[8px] text-zinc-500 font-mono mb-2">
178:               {{ userPin.lng.toFixed(4) }}, {{ userPin.lat.toFixed(4) }}
179:             </div>
180:             <div class="flex gap-1.5">
181:               <button type="button" class="flex-1 px-2 py-1 text-[9px] font-bold rounded border border-emerald-700/50 text-emerald-300 hover:bg-emerald-900/30 transition-colors" @click="flyToUserPin">
182:                 {{ t('observatory.myTerritory.flyTo') }}
183:               </button>
184:               <button type="button" class="flex-1 px-2 py-1 text-[9px] font-bold rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors" @click="copyPinUrl" :aria-label="t('observatory.myTerritory.share')">
185:                 {{ shareCopied ? t('observatory.myTerritory.copied') : t('observatory.myTerritory.share') }}
186:               </button>
187:             </div>
188:           </div>
189: 
190:           <!-- Drop Pin Floating Button -->
191:           <button
192: type="button"
193:             class="absolute z-[500] bg-[var(--obs-panel-bg-dark)] backdrop-blur border border-emerald-700/40 rounded-full px-3 py-2 text-fluid-xs font-bold text-emerald-300 hover:bg-emerald-900/30 hover:border-emerald-500 transition-all flex items-center gap-1.5 shadow-lg"
194:             :style="pinPickerMode ? 'bottom: clamp(4rem, 10vh, 5.5rem); right: clamp(0.75rem, 2vw, 1rem); background: color-mix(in srgb, var(--obs-emerald) 25%, transparent); border-color: var(--obs-emerald); color: #fff;' : 'bottom: clamp(4rem, 10vh, 5.5rem); right: clamp(0.75rem, 2vw, 1rem);'"
195:             @click="togglePinPicker">
196:             <span>📍</span>
197:             {{ pinPickerMode ? t('observatory.myTerritory.cancel') : t('observatory.myTerritory.dropPin') }}
198:           </button>
199: 
200:           <!-- Layer toggles + Year Slider + Phase Filter -->
201:           <div class="absolute bottom-[clamp(1rem,4vh,1.5rem)] left-[clamp(0.75rem,2vw,1rem)] z-[500] obs-filter-panel">
202:             <button
203:               type="button"
204:               class="obs-filter-toggle"
205:               @click="filtersExpanded = !filtersExpanded"
206:             >
207:               <span class="obs-filter-toggle__icon">⚙</span>
208:               <span class="obs-filter-toggle__label">{{ t('observatory.layers.title') }}</span>
209:               <span v-if="activeFilterCount > 0" class="obs-filter-toggle__badge">{{ activeFilterCount }}</span>
210:               <span class="obs-filter-toggle__chevron" :class="{ 'obs-filter-toggle__chevron--open': filtersExpanded }">›</span>
211:             </button>
212: 
213:             <Transition name="obs-filter-expand">
214:               <div v-if="filtersExpanded" class="obs-filter-body">
215:                 <YearSlider
216:                   :year-min="yearMin"
217:                   :year-max="yearMax"
218:                   :filtered-count="filteredCount"
219:                   @update:year-min="(v) => { yearMin = v; debouncedFilter() }"
220:                   @update:year-max="(v) => { yearMax = v; debouncedFilter() }"
221:                 />
222: 
223:                 <hr class="border-zinc-800 my-2" />
224: 
225:                 <PhaseFilter
226:                   :selected="selectedPhases"
227:                   @update:selected="(v) => { selectedPhases = v; debouncedFilter() }"
228:                 />
229: 
230:                 <hr class="border-zinc-800 my-2" />
231: 
232:                 <h3 class="obs-filter-section-title">{{ t('observatory.layers.title') }}</h3>
233:                 <div
234: v-for="c in categories" :key="c.key" class="obs-filter-checkbox"
235:                   role="checkbox"
236:                   :aria-checked="layerVis[c.key]"
237:                   :aria-label="c.label"
238:                   tabindex="0"
239:                   @click="toggleLayer(c.key)"
240:                   @keydown.enter="toggleLayer(c.key)"
241:                   @keydown.space.prevent="toggleLayer(c.key)">
242:                   <div
243: :class="['obs-filter-checkbox__box', layerVis[c.key] ? '' : 'obs-filter-checkbox__box--off']"
244:                     :style="{ '--cb-color': c.color }">
245:                     <svg v-if="layerVis[c.key]" class="obs-filter-checkbox__check" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
246:                   </div>
247:                   <span class="obs-filter-checkbox__label">{{ c.label }}</span>
248:                 </div>
249:                 <hr class="border-zinc-800 my-1.5" />
250:                 <div
251: v-for="e in extraLayers" :key="e.key" class="obs-filter-checkbox"
252:                   role="checkbox"
253:                   :aria-checked="layerVis[e.key]"
254:                   :aria-label="t(e.labelKey)"
255:                   tabindex="0"
256:                   @click="toggleLayer(e.key)"
257:                   @keydown.enter="toggleLayer(e.key)"
258:                   @keydown.space.prevent="toggleLayer(e.key)">
259:                   <div
260: :class="['obs-filter-checkbox__box', layerVis[e.key] ? '' : 'obs-filter-checkbox__box--off']"
261:                     :style="{ '--cb-color': e.color }">
262:                     <svg v-if="layerVis[e.key]" class="obs-filter-checkbox__check" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
263:                   </div>
264:                   <span class="obs-filter-checkbox__label">{{ t(e.labelKey) }}</span>
265:                 </div>
266:                 <hr class="border-zinc-800 my-1.5" />
267:                 <div
268: class="obs-filter-checkbox"
269:                   role="checkbox"
270:                   :aria-checked="layerVis['protected_ti'] !== false"
271:                   :aria-label="t('observatory.layers.indigenousLands')"
272:                   tabindex="0"
273:                   @click="toggleLayer('protected_ti')"
274:                   @keydown.enter="toggleLayer('protected_ti')"
275:                   @keydown.space.prevent="toggleLayer('protected_ti')">
276:                   <div
277: :class="['obs-filter-checkbox__box', layerVis['protected_ti'] !== false ? '' : 'obs-filter-checkbox__box--off']"
278:                     :style="{ '--cb-color': 'var(--obs-red-dark)' }">
279:                     <svg v-if="layerVis['protected_ti'] !== false" class="obs-filter-checkbox__check" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
280:                   </div>
281:                   <span class="obs-filter-checkbox__label">{{ t('observatory.layers.indigenousLands') }}</span>
282:                 </div>
283:                 <div
284: class="obs-filter-checkbox"
285:                   role="checkbox"
286:                   :aria-checked="layerVis['protected_quilombo'] !== false"
287:                   :aria-label="t('observatory.layers.quilombolaTerritories')"
288:                   tabindex="0"
289:                   @click="toggleLayer('protected_quilombo')"
290:                   @keydown.enter="toggleLayer('protected_quilombo')"
291:                   @keydown.space.prevent="toggleLayer('protected_quilombo')">
292:                   <div
293: :class="['obs-filter-checkbox__box', layerVis['protected_quilombo'] !== false ? '' : 'obs-filter-checkbox__box--off']"
294:                     :style="{ '--cb-color': 'var(--obs-amber)' }">
295:                     <svg v-if="layerVis['protected_quilombo'] !== false" class="obs-filter-checkbox__check" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
296:                   </div>
297:                   <span class="obs-filter-checkbox__label">{{ t('observatory.layers.quilombolaTerritories') }}</span>
298:                 </div>
299:                 <div
300: class="obs-filter-checkbox"
301:                   role="checkbox"
302:                   :aria-checked="layerVis['overlaps'] !== false"
303:                   :aria-label="t('observatory.layers.overlaps')"
304:                   tabindex="0"
305:                   @click="toggleLayer('overlaps')"
306:                   @keydown.enter="toggleLayer('overlaps')"
307:                   @keydown.space.prevent="toggleLayer('overlaps')">
308:                   <div
309: :class="['obs-filter-checkbox__box', layerVis['overlaps'] !== false ? '' : 'obs-filter-checkbox__box--off']"
310:                     :style="{ '--cb-color': 'var(--obs-magenta)' }">
311:                     <svg v-if="layerVis['overlaps'] !== false" class="obs-filter-checkbox__check" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
312:                   </div>
313:                   <span class="obs-filter-checkbox__label">{{ t('observatory.layers.overlaps') }}</span>
314:                 </div>
315:                 <div
316: class="obs-filter-checkbox"
317:                   role="checkbox"
318:                   :aria-checked="layerVis['enterprise_hq'] !== false"
319:                   :aria-label="t('observatory.layers.enterpriseHq')"
320:                   tabindex="0"
321:                   @click="toggleLayer('enterprise_hq')"
322:                   @keydown.enter="toggleLayer('enterprise_hq')"
323:                   @keydown.space.prevent="toggleLayer('enterprise_hq')">
324:                   <div
325: :class="['obs-filter-checkbox__box', layerVis['enterprise_hq'] !== false ? '' : 'obs-filter-checkbox__box--off']"
326:                     :style="{ '--cb-color': 'var(--obs-purple-light)' }">
327:                     <svg v-if="layerVis['enterprise_hq'] !== false" class="obs-filter-checkbox__check" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
328:                   </div>
329:                   <span class="obs-filter-checkbox__label">{{ t('observatory.layers.enterpriseHq') }}</span>
330:                 </div>
331: 
332:                 <hr class="border-zinc-800 my-1.5" />
333: 
334:                 <label
335: class="obs-filter-checkbox"
336:                   @click.stop="sobDemandaOnly = !sobDemandaOnly; debouncedFilter()">
337:                   <div
338: :class="['obs-filter-checkbox__box', sobDemandaOnly ? '' : 'obs-filter-checkbox__box--off']"
339:                     :style="{ '--cb-color': 'var(--obs-purple-deep)' }">
340:                     <svg v-if="sobDemandaOnly" class="obs-filter-checkbox__check" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
341:                   </div>
342:                   <span class="obs-filter-checkbox__label">Sob Demanda</span>
343:                 </label>
344:               </div>
345:             </Transition>
346:           </div>
347: 
348:           <!-- Search -->
349:           <div class="absolute bottom-[clamp(1rem,4vh,1.5rem)] left-1/2 -translate-x-1/2 z-[500] hidden sm:block">
350:             <div class="obs-search">
351:               <span class="obs-search__icon">🔍</span>
352:               <input
353: v-model="searchTerm" @input="debouncedFilter" :placeholder="t('observatory.search')"
354:                 class="obs-search__input" />
355:               <span v-if="searchTerm" class="obs-search__clear" @click="searchTerm = ''; debouncedFilter()">×</span>
356:             </div>
357:           </div>
358: 
359:           <!-- Water legend -->
360:           <div class="absolute bottom-[clamp(1rem,4vh,1.5rem)] right-[clamp(0.75rem,2vw,1rem)] z-[500] obs-legend-panel hidden md:block">
361:             <h3 class="obs-legend-title">{{ t('observatory.legend.hydrography') }}</h3>
362:             <div class="obs-legend-item"><div class="obs-legend-line" :style="{ background: 'var(--obs-blue)' }"></div>{{ t('observatory.legend.basins') }}</div>
363:             <div class="obs-legend-item"><div class="obs-legend-line" :style="{ background: 'var(--obs-purple-light)' }"></div>{{ t('observatory.legend.aquifers') }}</div>
364:             <div class="obs-legend-item"><div class="obs-legend-line obs-legend-line--dashed" :style="{ background: 'var(--obs-red)', borderColor: 'var(--obs-red-dark)' }"></div>{{ t('observatory.legend.conflictZones') }}</div>
365:           </div>
366:         </template>
367:       </UnifiedMap>
368: 
369:       <!-- Timeline Modal -->
370:       <GeoPoliticalTimeline :visible="showTimeline" @close="showTimeline = false" />
371: 
372:       <!-- Rede Corporativa Panel -->
373:       <RedeCorporativa :visible="showRedeCorporativa" @close="showRedeCorporativa = false" @fly-to-enterprise="flyToEnterprise" />
374: 
375:       <!-- Download Panel -->
376:       <DataDownloadPanel :visible="showDownload" @close="showDownload = false" />
377: 
378:       <!-- Claim Report Modal -->
379:       <ClaimReportModal :visible="showClaimReport" :claim="reportClaim" @close="showClaimReport = false" />
380: 
381:       <!-- Export Modal -->
382:       <ExportModal :visible="showExport" :map-container="mapContainerRef" :filter-summary="activeFilterSummary" @close="showExport = false" />
383: 
384:       <!-- Keyboard Shortcuts -->
385:       <KeyboardShortcuts :visible="showShortcuts" @close="showShortcuts = false" />
386: 
387:       <!-- Geo Locate -->
388:       <GeoLocateModal :visible="showGeoLocate" @close="showGeoLocate = false" @locate="onGeoLocate" />
389: 
390:       <!-- Claims Data Table -->
391:       <ClaimsDataTable :visible="showDataTable" :data="allFeatures" @close="showDataTable = false" @fly-to="(coords) => flyToTarget = { lng: coords[0], lat: coords[1], zoom: 8 }" />
392: 
393:       <template #fallback>
394:         <div class="flex h-[100svh] w-full items-center justify-center bg-zinc-950 text-white">
395:           <LoadingSpinner :message="t('loading.observatoryOfVulcan')" :inline="true" />
396:         </div>
397:       </template>
398:     </ClientOnly>
399:   </div>
400: </template>
401: 
402: <script setup lang="ts">
403: import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
404: import type maplibregl from 'maplibre-gl'
405: import { RARE_EARTH_CATEGORIES } from '@/lib/map-utils'
406: import type { EnterpriseHQ } from '@/lib/enterprise-data'
407: import { ENTERPRISES } from '@/lib/enterprise-data'
408: import { setupEnterpriseLayer, cleanupEnterpriseLayer } from '@/composables/useEnterpriseMarkers'
409: import ObservatorySidebar from '@/components/observatory/ObservatorySidebar.vue'
410: import YearSlider from '@/components/observatory/YearSlider.vue'
411: import PhaseFilter from '@/components/observatory/PhaseFilter.vue'
412: import ClaimReportModal from '@/components/observatory/ClaimReportModal.vue'
413: import ExportModal from '@/components/observatory/ExportModal.vue'
414: import { useRareEarthData } from '@/composables/useRareEarthData'
415: import { useStateHash } from '@/composables/useStateHash'
416: import KeyboardShortcuts from '@/components/observatory/KeyboardShortcuts.vue'
417: import ClaimsDataTable from '@/components/observatory/ClaimsDataTable.vue'
418: import GeoLocateModal from '@/components/observatory/GeoLocateModal.vue'
419: 
420: type ObservatoryTabKey = 'danger' | 'military' | 'illegal' | 'env' | 'network' | 'timeline'
421: 
422: const { t } = useI18n()
423: const baseURL = useRuntimeConfig().app.baseURL
424: 
425: // Command palette registrations
426: if (import.meta.client) {
427:   const { register, openPalette } = useCommandPalette()
428:   register({
429:     id: 'obs:open-palette',
430:     group: t('nav.observatoryOfVulcan'),
431:     label: t('palette.title'),
432:     icon: 'mdi:command-key',
433:     shortcut: 'Ctrl+K',
434:     keywords: ['palette', 'search', 'command', 'keyboard'],
435:     onSelect: () => openPalette(),
436:   })
437:   register({
438:     id: 'obs:toggle-layers',
439:     group: t('nav.observatoryOfVulcan'),
440:     label: t('observatory.layers.title'),
441:     icon: 'mdi:layers',
442:     keywords: ['layers', 'filters', 'toggle'],
443:     onSelect: () => {
444:       const { success } = useToast()
445:       success(t('observatory.layers.title'), t('observatory.layers.title'))
446:     },
447:   })
448: }
449: 
450: useHead({
451:   title: 'Observatory of Vulcan | Earth Guardians',
452:   meta: [{ name: 'description', content: 'Brazil rare earth mining claims — capital invasion, corporate networks, military interests & socio-environmental impact.' }],
453: })
454: 
455: const { pointsData, polygonsData, protectedData, features: allFeatures, speculatorIndex, deepAnalysis, isLoading, loadPhase, loadProgress, error, load: loadRareEarthData } = useRareEarthData(baseURL)
456: const { restoredState, updateHash } = useStateHash()
457: const searchTerm = ref('')
458: const flyToTarget = ref<{ lng: number; lat: number; zoom?: number } | null>(null)
459: let mapRef: maplibregl.Map | null = null
460: 
461: // Animated counter for smooth number transitions
462: // Keys are category keys (e.g., 'direct_ree') NOT count values — prevents
463: // categories with equal counts from sharing animated state.
464: const displayCounts = ref<Record<string, number>>({})
465: let counterRaf: number | null = null
466: 
467: function animatedCount(categoryKey: string, target: number): number {
468:   return displayCounts.value[categoryKey] ?? target
469: }
470: 
471: function animateCounters() {
472:   let anyChanged = false
473:   const allKeys: Array<{ key: string; target: number }> = [
474:     ...categoryStats.value.map(s => ({ key: s.key, target: s.count })),
475:     { key: '__total', target: totalCount.value },
476:   ]
477:   for (const { key, target } of allKeys) {
478:     const current = displayCounts.value[key] ?? 0
479:     if (current === target) continue
480:     const diff = target - current
481:     const step = Math.ceil(Math.abs(diff) / 10)
482:     displayCounts.value[key] = diff > 0 ? Math.min(current + step, target) : Math.max(current - step, target)
483:     anyChanged = true
484:   }
485:   if (anyChanged) {
486:     counterRaf = requestAnimationFrame(tick)
487:   }
488: }
489: 
490: function tick() {
491:   animateCounters()
492: }
493: 
494: function startCounterAnimation() {
495:   if (counterRaf) cancelAnimationFrame(counterRaf)
496:   counterRaf = requestAnimationFrame(tick)
497: }
498: 
499: onUnmounted(() => { if (counterRaf) cancelAnimationFrame(counterRaf) })
500: 
501: // Loading message based on phase
502: const loadingMessage = computed(() => {
503:   switch (loadPhase.value) {
504:     case 'points': return 'Loading mining claims...'
505:     case 'overlaps': return 'Loading territory overlaps...'
506:     case 'polygons': return 'Loading claim boundaries...'
507:     case 'protected': return 'Loading protected areas & analysis...'
508:     case 'complete': return 'Ready'
509:     default: return 'Initializing...'
510:   }
511: })
512: 
513: // Popups
514: const showTimeline = ref(false)
515: const showRedeCorporativa = ref(false)
516: const showDownload = ref(false)
517: const showExport = ref(false)
518: const showClaimReport = ref(false)
519: interface ClaimReportData { p?: string; n?: string; u?: string; s?: string; la?: number; lo?: number; [key: string]: unknown }
520: const reportClaim = ref<ClaimReportData | null>(null)
521: const enterpriseLayerVisible = ref(false)
522: const mapContainerRef = ref<HTMLElement | null>(null)
523: const showShortcuts = ref(false)
524: const showDataTable = ref(false)
525: const showGeoLocate = ref(false)
526: const userLocationRadius = ref(0)
527: 
528: // Year & Phase filters
529: const yearMin = ref(1935)
530: const yearMax = ref(2026)
531: const selectedPhases = ref(new Set<string>([
532:   'REQUERIMENTO', 'REQUERIMENTO DE PESQUISA', 'AUTORIZAÇÃO DE PESQUISA',
533:   'DISPONIBILIDADE', 'LICENCIAMENTO', 'CONCESSÃO', 'LAVRA',
534: ]))
535: const sobDemandaOnly = ref(false)
536: const filteredCount = ref(0)
537: const filtersExpanded = ref(true)
538: 
539: const activeFilterCount = computed(() => {
540:   let count = 0
541:   if (yearMin.value > 1935 || yearMax.value < 2026) count++
542:   if (selectedPhases.value.size < 7) count++
543:   if (sobDemandaOnly.value) count++
544:   if (searchTerm.value.trim()) count++
545:   // Count hidden categories + extra layers (iterate explicitly for reliable tracking)
546:   const vis = layerVis.value
547:   let hiddenLayers = 0
548:   for (const key of Object.keys(vis)) {
549:     if (!vis[key]) hiddenLayers++
550:   }
551:   if (hiddenLayers > 0) count++
552:   return count
553: })
554: 
555: // My Territory pin
556: const { pin: userPin, sharedFromUrl: userPinShared, setPin: setUserPin, clearPin, copyShareUrl } = useUserPin()
557: const pinPickerMode = ref(false)
558: const shareCopied = ref(false)
559: let pinClickHandler: ((_e: maplibregl.MapMouseEvent) => void) | null = null
560: let pinKeyHandler: ((_e: KeyboardEvent) => void) | null = null
561: 
562: function togglePinPicker() {
563:   if (pinPickerMode.value) {
564:     pinPickerMode.value = false
565:     detachPinClick()
566:   } else {
567:     pinPickerMode.value = true
568:     attachPinClick()
569:   }
570: }
571: 
572: function attachPinClick() {
573:   if (!mapRef) return
574:   mapRef.getCanvas().style.cursor = 'crosshair'
575:   pinClickHandler = (e: maplibregl.MapMouseEvent) => {
576:     if (!pinPickerMode.value) return
577:     const { lng, lat } = e.lngLat
578:     setUserPin({ lng, lat }, t('observatory.myTerritory.defaultLabel'))
579:     pinPickerMode.value = false
580:     if (mapRef) mapRef.getCanvas().style.cursor = ''
581:     flyToTarget.value = { lng, lat, zoom: 8 }
582:   }
583:   mapRef.on('click', pinClickHandler)
584:   pinKeyHandler = (e: KeyboardEvent) => {
585:     if (e.key === 'Escape' && pinPickerMode.value) togglePinPicker()
586:   }
587:   window.addEventListener('keydown', pinKeyHandler)
588: }
589: 
590: function detachPinClick() {
591:   if (mapRef && pinClickHandler) {
592:     mapRef.off('click', pinClickHandler)
593:     mapRef.getCanvas().style.cursor = ''
594:     pinClickHandler = null
595:   }
596:   if (pinKeyHandler) {
597:     window.removeEventListener('keydown', pinKeyHandler)
598:     pinKeyHandler = null
599:   }
600: }
601: 
602: function flyToUserPin() {
603:   if (userPin.value) {
604:     flyToTarget.value = { lng: userPin.value.lng, lat: userPin.value.lat, zoom: 8 }
605:   }
606: }
607: 
608: async function copyPinUrl() {
609:   const toast = useToast()
610:   const ok = await copyShareUrl()
611:   if (ok) {
612:     shareCopied.value = true
613:     setTimeout(() => { shareCopied.value = false }, 2000)
614:     toast.success(t('observatory.myTerritory.copied'))
615:   } else {
616:     toast.error(t('observatory.myTerritory.shareError') || 'Copy failed')
617:   }
618: }
619: 
620: onUnmounted(() => {
621:   detachPinClick()
622: })
623: 
624: const catEntries = Object.entries(RARE_EARTH_CATEGORIES) as [string, { label: string; color: string }][]
625: const categories = catEntries.map(([key, val]) => ({
626:   key,
627:   label: val.label,
628:   color: val.color,
629: }))
630: 
631: const extraLayers = [
632:   { key: 'polygons', labelKey: 'observatory.layers.polygons', color: '#e74c3c' },
633:   { key: 'water', labelKey: 'observatory.layers.hydrography', color: '#3498db' },
634:   { key: 'sites', labelKey: 'observatory.layers.conflictZones', color: '#c0392b' },
635:   { key: 'network', labelKey: 'observatory.layers.corpNetwork', color: '#5dade2' },
636:   { key: 'heatmap', labelKey: 'observatory.layers.heatmap', color: '#f39c12' },
637: ]
638: 
639: const layerVis = ref<Record<string, boolean>>({})
640: categories.forEach(c => { layerVis.value[c.key] = true })
641: extraLayers.forEach(e => { layerVis.value[e.key] = true })
642: layerVis.value['enterprise_hq'] = false
643: layerVis.value['protected_ti'] = true
644: layerVis.value['protected_quilombo'] = true
645: layerVis.value['overlaps'] = true
646: layerVis.value['heatmap'] = false
647: 
648: const activeTab = ref<ObservatoryTabKey>('danger')
649: 
650: const showAll = ref(false)
651: 
652: const categoryStats = computed(() => {
653:   const counts: Record<string, number> = {}
654:   categories.forEach(c => counts[c.key] = 0)
655:   allFeatures.value.forEach((d: { c: string }) => { if (counts[d.c] !== undefined) counts[d.c]++ })
656:   return categories.map(c => ({ key: c.key, label: c.label.split(' ')[0], color: c.color, count: counts[c.key] || 0 }))
657: })
658: 
659: const totalCount = computed(() => allFeatures.value.length)
660: 
661: function formatSyncDate(iso?: string): string {
662:   if (!iso) return '—'
663:   const d = new Date(iso)
664:   if (Number.isNaN(d.getTime())) return '—'
665:   const days = Math.floor((Date.now() - d.getTime()) / 86_400_000)
666:   if (days <= 0) return 'today'
667:   if (days === 1) return '1d ago'
668:   if (days < 30) return `${days}d ago`
669:   if (days < 365) return `${Math.floor(days / 30)}mo ago`
670:   return `${Math.floor(days / 365)}y ago`
671: }
672: 
673: function formatHa(ha: number): string {
674:   if (ha >= 1_000_000) return `${(ha / 1_000_000).toFixed(1)}M`
675:   if (ha >= 1000) return `${Math.round(ha / 1000)}K`
676:   return `${ha}`
677: }
678: 
679: function toggleLayer(key: string) {
680:   layerVis.value[key] = !layerVis.value[key]
681:   if (key === 'enterprise_hq') {
682:     enterpriseLayerVisible.value = layerVis.value[key]
683:     if (mapRef) {
684:       if (enterpriseLayerVisible.value) {
685:         setupEnterpriseLayer(mapRef, onEnterpriseClick, speculatorIndex.value)
686:       } else {
687:         cleanupEnterpriseLayer(mapRef)
688:       }
689:     }
690:   }
691: }
692: 
693: function toggleEnterpriseLayer() {
694:   toggleLayer('enterprise_hq')
695: }
696: 
697: function onEnterpriseClick(enterprise: EnterpriseHQ) {
698:   flyToTarget.value = { lng: enterprise.lng, lat: enterprise.lat, zoom: 6 }
699: }
700: 
701: function flyToEnterprise(name: string) {
702:   const specEntry = speculatorIndex.value.find(s =>
703:     s.normalizedName.includes(name.toUpperCase().split(' ')[0]) ||
704:     name.toUpperCase().includes(s.displayName.split('/')[0].trim().split(' ')[0])
705:   )
706:   if (specEntry?.centroid) { flyToTarget.value = { lng: specEntry.centroid.lng, lat: specEntry.centroid.lat, zoom: 6 }; return }
707:   const ent = ENTERPRISES.find(e => e.name === name || name.includes(e.name))
708:   if (ent) flyToTarget.value = { lng: ent.lng, lat: ent.lat, zoom: 6 }
709: }
710: 
711: function onMapInit(map: maplibregl.Map) {
712:   mapRef = map
713: }
714: 
715: function flyToCoord(coord: [number, number]) {
716:   flyToTarget.value = { lng: coord[0], lat: coord[1], zoom: 8 }
717: }
718: 
719: function onGeoLocate(lat: number, lng: number, _city: string) {
720:   // Fly to the detected location with a good zoom for nearby claims
721:   flyToTarget.value = { lng, lat, zoom: 7 }
722:   userLocationRadius.value = 1 // marker that we have a user location
723: }
724: 
725: function zoomToDanger(name: string) {
726:   const target = speculatorIndex.value.find(s =>
727:     s.normalizedName === name
728:     || s.displayName.toLowerCase().split('/')[0].trim() === name.toLowerCase().split('/')[0].trim()
729:   )
730:   if (target?.centroid) { flyToTarget.value = { lng: target.centroid.lng, lat: target.centroid.lat, zoom: 9 }; return }
731:   const ent = ENTERPRISES.find(e => name.includes(e.name.toUpperCase().split(' ')[0]) || e.name.toUpperCase().includes(name.split('/')[0].trim()))
732:   if (ent) { flyToTarget.value = { lng: ent.lng, lat: ent.lat, zoom: 7 }; return }
733: }
734: 
735: let debounceTimer: ReturnType<typeof setTimeout> | null = null
736: function debouncedFilter() {
737:   if (debounceTimer) clearTimeout(debounceTimer)
738:   debounceTimer = setTimeout(updateFilter, 250)
739: }
740: 
741: function updateFilter() {
742:   const term = searchTerm.value.toLowerCase().trim()
743:   const catKeys = Object.keys(RARE_EARTH_CATEGORIES)
744:   const visKeys = Object.entries(layerVis.value).filter(([k, v]) => v && catKeys.includes(k)).map(([k]) => k)
745:   const filtered = allFeatures.value.filter((d: { c: string; n: string; s: string; u: string; p: string; f: string; net: string; y: number; dsprocesso: string }) => {
746:     if (!visKeys.includes(d.c)) return false
747:     if (term) return `${d.n} ${d.s} ${d.u} ${d.p} ${d.f} ${d.net||''}`.toLowerCase().includes(term)
748:     if (d.y < yearMin.value || d.y > yearMax.value) return false
749:     if (!selectedPhases.value.has(d.f)) return false
750:     if (sobDemandaOnly.value && !String(d.dsprocesso || '').includes('DEMANDA')) return false
751:     return true
752:   })
753:   filteredCount.value = filtered.length
754:   pointsData.value = {
755:     type: 'FeatureCollection',
756:     features: filtered.map((d: { lo: number; la: number; [key: string]: unknown }, i: number) => ({
757:       type: 'Feature', id: i,
758:       properties: { ...d, id: i },
759:       geometry: { type: 'Point', coordinates: [d.lo, d.la] },
760:     })),
761:   }
762: }
763: 
764: const activeFilterSummary = computed(() => {
765:   const parts: string[] = []
766:   if (yearMin.value > 1935 || yearMax.value < 2026) parts.push(`${yearMin.value}-${yearMax.value}`)
767:   if (selectedPhases.value.size < 7) parts.push(`${selectedPhases.value.size} phases`)
768:   if (sobDemandaOnly.value) parts.push('Sob Demanda')
769:   if (searchTerm.value.trim()) parts.push(`"${searchTerm.value.trim()}"`)
770:   return parts.join(', ') || 'All claims'
771: })
772: 
773: onMounted(async () => {
774:   startCounterAnimation()
775:   await loadRareEarthData()
776:   filteredCount.value = allFeatures.value.length
777:   mapContainerRef.value = document.querySelector('.maplibregl-canvas-container')?.closest('.relative') as HTMLElement | null
778: 
779:   // Restore state from URL hash
780:   if (restoredState.value) {
781:     const s = restoredState.value
782:     if (s.center) flyToTarget.value = { lng: s.center[0], lat: s.center[1], zoom: s.zoom ?? 6 }
783:     if (s.yearMin) yearMin.value = s.yearMin
784:     if (s.yearMax) yearMax.value = s.yearMax
785:     if (s.phases) selectedPhases.value = new Set(s.phases)
786:     if (s.heatmap) layerVis.value['heatmap'] = true
787:     if (s.enterprise) layerVis.value['enterprise_hq'] = true
788:     if (s.tab) activeTab.value = s.tab as ObservatoryTabKey
789:     debouncedFilter()
790:   } else {
791:     // First visit: show geo-locate prompt after a short delay
792:     setTimeout(() => { showGeoLocate.value = true }, 800)
793:   }
794: 
795:   // Keyboard shortcuts
796:   window.addEventListener('keydown', handleKeydown)
797: })
798: 
799: onUnmounted(() => {
800:   if (debounceTimer) clearTimeout(debounceTimer)
801:   window.removeEventListener('keydown', handleKeydown)
802: })
803: 
804: function handleKeydown(e: KeyboardEvent) {
805:   // Don't capture if typing in an input
806:   if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return
807: 
808:   // ? — show shortcuts
809:   if (e.key === '?' || (e.shiftKey && e.key === '/')) {
810:     e.preventDefault()
811:     showShortcuts.value = !showShortcuts.value
812:     return
813:   }
814: 
815:   // T — toggle data table
816:   if (e.key === 't' || e.key === 'T') {
817:     showDataTable.value = !showDataTable.value
818:     return
819:   }
820: 
821:   // Escape — close panels / clear search
822:   if (e.key === 'Escape') {
823:     if (showShortcuts.value) { showShortcuts.value = false; return }
824:     if (showDataTable.value) { showDataTable.value = false; return }
825:     if (showTimeline.value) { showTimeline.value = false; return }
826:     if (showRedeCorporativa.value) { showRedeCorporativa.value = false; return }
827:     if (showDownload.value) { showDownload.value = false; return }
828:     if (showExport.value) { showExport.value = false; return }
829:     if (showClaimReport.value) { showClaimReport.value = false; return }
830:     if (searchTerm.value) { searchTerm.value = ''; debouncedFilter(); return }
831:     return
832:   }
833: 
834:   // Ctrl+F — focus search
835:   if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
836:     e.preventDefault()
837:     const searchInput = document.querySelector('.obs-search__input') as HTMLInputElement | null
838:     searchInput?.focus()
839:     return
840:   }
841: 
842:   // H — toggle heatmap
843:   if (e.key === 'h' || e.key === 'H') {
844:     toggleLayer('heatmap')
845:     return
846:   }
847: 
848:   // P — toggle polygons
849:   if (e.key === 'p' || e.key === 'P') {
850:     toggleLayer('polygons')
851:     return
852:   }
853: 
854:   // W — toggle hydrography
855:   if (e.key === 'w' || e.key === 'W') {
856:     toggleLayer('water')
857:     return
858:   }
859: 
860:   // 1-6 — switch sidebar tabs
861:   const tabKeys: ObservatoryTabKey[] = ['danger', 'military', 'illegal', 'env', 'network', 'timeline']
862:   const num = parseInt(e.key, 10)
863:   if (num >= 1 && num <= 6) {
864:     activeTab.value = tabKeys[num - 1]
865:   }
866: }
867: 
868: watch(totalCount, () => { animateCounters() })
869: 
870: // Update URL hash on state changes (debounced)
871: let hashTimer: ReturnType<typeof setTimeout> | null = null
872: function scheduleHashUpdate() {
873:   if (hashTimer) clearTimeout(hashTimer)
874:   hashTimer = setTimeout(() => {
875:     updateHash({
876:       yearMin: yearMin.value > 1935 ? yearMin.value : undefined,
877:       yearMax: yearMax.value < 2026 ? yearMax.value : undefined,
878:       phases: selectedPhases.value.size < 7 ? Array.from(selectedPhases.value) : undefined,
879:       heatmap: layerVis.value['heatmap'] || undefined,
880:       enterprise: layerVis.value['enterprise_hq'] || undefined,
881:       tab: activeTab.value !== 'danger' ? activeTab.value : undefined,
882:     })
883:   }, 500)
884: }
885: 
886: watch([yearMin, yearMax], scheduleHashUpdate)
887: watch(selectedPhases, scheduleHashUpdate, { deep: true })
888: watch(() => layerVis.value['heatmap'], scheduleHashUpdate)
889: watch(() => layerVis.value['enterprise_hq'], scheduleHashUpdate)
890: watch(activeTab, scheduleHashUpdate)
891: </script>
892: 
893: <style>
894: .obs-stats-panel {
895:   background: var(--obs-panel-bg);
896:   backdrop-filter: blur(12px);
897:   -webkit-backdrop-filter: blur(12px);
898:   border: 1px solid var(--obs-panel-border);
899:   border-radius: 12px;
900:   padding: 10px 12px;
901:   box-shadow: var(--obs-panel-shadow), inset var(--obs-panel-inset);
902:   max-width: 320px;
903:   transition: opacity 0.3s, transform 0.3s;
904: }
905: 
906: @media (max-width: 640px) {
907:   .obs-stats-panel {
908:     max-width: 180px;
909:     padding: 8px 10px;
910:   }
911: }
912: 
913: .obs-action-btn {
914:   display: flex;
915:   align-items: center;
916:   gap: 6px;
917:   padding: 6px 10px;
918:   font-size: 9px;
919:   font-weight: 700;
920:   border-radius: 8px;
921:   border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
922:   background: color-mix(in srgb, var(--accent) 12%, transparent);
923:   color: var(--accent);
924:   cursor: pointer;
925:   font-family: inherit;
926:   transition: all 0.15s ease;
927:   white-space: nowrap;
928: }
929: .obs-action-btn:hover {
930:   background: color-mix(in srgb, var(--accent) 22%, transparent);
931:   border-color: color-mix(in srgb, var(--accent) 50%, transparent);
932:   transform: translateY(-1px);
933:   box-shadow: 0 4px 12px color-mix(in srgb, var(--accent) 20%, transparent);
934: }
935: .obs-action-btn:active {
936:   transform: translateY(0);
937: }
938: .obs-action-btn--active {
939:   background: color-mix(in srgb, var(--accent) 20%, transparent);
940:   border-color: color-mix(in srgb, var(--accent) 40%, transparent);
941: }
942: 
943: @media (max-width: 640px) {
944:   .obs-action-btn {
945:     padding: 5px 8px;
946:     font-size: 8px;
947:     gap: 4px;
948:   }
949: }
950: 
951: .fade-enter-active,
952: .fade-leave-active {
953:   transition: opacity 0.3s ease;
954: }
955: .fade-enter-from,
956: .fade-leave-to {
957:   opacity: 0;
958: }
959: 
960: @keyframes flyto-pulse {
961:   0% { transform: scale(1); opacity: 0.6; }
962:   50% { transform: scale(1.3); opacity: 0.3; }
963:   100% { transform: scale(1); opacity: 0.6; }
964: }
965: 
966: @media (prefers-reduced-motion: reduce) {
967:   .obs-action-btn { transition: none; }
968:   .obs-action-btn:hover { transform: none; }
969: }
970: 
971: .obs-filter-panel {
972:   background: var(--obs-panel-bg-dark);
973:   backdrop-filter: blur(16px) saturate(1.2);
974:   -webkit-backdrop-filter: blur(16px) saturate(1.2);
975:   border: 1px solid var(--obs-panel-border-light);
976:   border-radius: 12px;
977:   box-shadow: var(--obs-panel-shadow-deep), inset var(--obs-panel-inset);
978:   max-width: 260px;
979:   overflow: hidden;
980: }
981: 
982: @media (max-width: 640px) {
983:   .obs-filter-panel {
984:     max-width: min(220px, calc(100vw - 2rem));
985:     border-radius: 10px;
986:   }
987: }
988: 
989: .obs-filter-toggle {
990:   display: flex;
991:   align-items: center;
992:   gap: 8px;
993:   width: 100%;
994:   padding: 8px 12px;
995:   background: transparent;
996:   border: 0;
997:   color: var(--obs-text-body);
998:   font-size: 10px;
999:   font-weight: 700;
1000:   text-transform: uppercase;
1001:   letter-spacing: 0.05em;
1002:   cursor: pointer;
1003:   font-family: inherit;
1004:   transition: background 0.15s;
1005: }
1006: .obs-filter-toggle:hover {
1007:   background: rgba(255, 255, 255, 0.04);
1008: }
1009: .obs-filter-toggle__icon {
1010:   font-size: 12px;
1011: }
1012: .obs-filter-toggle__label {
1013:   flex: 1;
1014:   text-align: left;
1015: }
1016: .obs-filter-toggle__badge {
1017:   display: inline-flex;
1018:   align-items: center;
1019:   justify-content: center;
1020:   min-width: 16px;
1021:   height: 16px;
1022:   padding: 0 4px;
1023:   border-radius: 8px;
1024:   background: rgba(231, 76, 60, 0.25);
1025:   color: var(--obs-red);
1026:   font-size: 8px;
1027:   font-weight: 800;
1028: }
1029: .obs-filter-toggle__chevron {
1030:   font-size: 14px;
1031:   transition: transform 0.2s ease;
1032:   transform: rotate(0deg);
1033: }
1034: .obs-filter-toggle__chevron--open {
1035:   transform: rotate(90deg);
1036: }
1037: 
1038: .obs-filter-body {
1039:   padding: 0 10px 10px;
1040: }
1041: 
1042: .obs-filter-section-title {
1043:   font-size: 8px;
1044:   font-weight: 700;
1045:   text-transform: uppercase;
1046:   letter-spacing: 0.08em;
1047:   color: var(--obs-text-muted);
1048:   margin: 0 0 6px;
1049: }
1050: 
1051: .obs-filter-checkbox {
1052:   display: flex;
1053:   align-items: center;
1054:   gap: 8px;
1055:   padding: 4px 0;
1056:   cursor: pointer;
1057:   user-select: none;
1058: }
1059: .obs-filter-checkbox__box {
1060:   width: 14px;
1061:   height: 14px;
1062:   border-radius: 4px;
1063:   border: 2px solid var(--cb-color, #666);
1064:   display: flex;
1065:   align-items: center;
1066:   justify-content: center;
1067:   transition: all 0.15s ease;
1068:   flex-shrink: 0;
1069: }
1070: .obs-filter-checkbox__box--off {
1071:   opacity: 0.3;
1072: }
1073: .obs-filter-checkbox__check {
1074:   width: 10px;
1075:   height: 10px;
1076:   color: var(--cb-color, #666);
1077: }
1078: .obs-filter-checkbox__label {
1079:   font-size: 10px;
1080:   color: var(--obs-text-label);
1081:   font-weight: 500;
1082: }
1083: .obs-filter-checkbox:hover .obs-filter-checkbox__label {
1084:   color: var(--obs-text-primary);
1085: }
1086: 
1087: .obs-filter-expand-enter-active {
1088:   transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
1089:   overflow: hidden;
1090: }
1091: .obs-filter-expand-leave-active {
1092:   transition: all 0.15s ease;
1093:   overflow: hidden;
1094: }
1095: .obs-filter-expand-enter-from {
1096:   opacity: 0;
1097:   max-height: 0;
1098:   transform: translateY(-4px);
1099: }
1100: .obs-filter-expand-enter-to {
1101:   opacity: 1;
1102:   max-height: 600px;
1103: }
1104: .obs-filter-expand-leave-from {
1105:   opacity: 1;
1106:   max-height: 600px;
1107: }
1108: .obs-filter-expand-leave-to {
1109:   opacity: 0;
1110:   max-height: 0;
1111: }
1112: 
1113: @media (prefers-reduced-motion: reduce) {
1114:   .obs-filter-toggle__chevron { transition: none; }
1115:   .obs-filter-expand-enter-active, .obs-filter-expand-leave-active { transition: none; }
1116: }
1117: 
1118: .obs-search {
1119:   display: flex;
1120:   align-items: center;
1121:   gap: 8px;
1122:   width: 260px;
1123:   padding: 0 12px;
1124:   height: 36px;
1125:   background: var(--obs-panel-bg-dark);
1126:   backdrop-filter: blur(16px) saturate(1.2);
1127:   -webkit-backdrop-filter: blur(16px) saturate(1.2);
1128:   border: 1px solid var(--obs-panel-border);
1129:   border-radius: 10px;
1130:   box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
1131:   transition: border-color 0.15s, box-shadow 0.15s;
1132: }
1133: .obs-search:focus-within {
1134:   border-color: rgba(231, 76, 60, 0.4);
1135:   box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4), 0 0 0 2px rgba(231, 76, 60, 0.1);
1136: }
1137: 
1138: @media (max-width: 640px) {
1139:   .obs-search {
1140:     width: min(220px, calc(100vw - 2rem));
1141:     height: 32px;
1142:     padding: 0 10px;
1143:     gap: 6px;
1144:   }
1145: }
1146: .obs-search__icon {
1147:   font-size: 12px;
1148:   opacity: 0.5;
1149:   flex-shrink: 0;
1150: }
1151: .obs-search__input {
1152:   flex: 1;
1153:   background: transparent;
1154:   border: 0;
1155:   outline: 0;
1156:   color: var(--obs-text-primary);
1157:   font-size: 11px;
1158:   font-family: inherit;
1159:   padding: 0;
1160: }
1161: .obs-search__input::placeholder {
1162:   color: var(--obs-text-dim);
1163: }
1164: .obs-search__clear {
1165:   font-size: 14px;
1166:   color: var(--obs-text-dim);
1167:   cursor: pointer;
1168:   line-height: 1;
1169:   transition: color 0.15s;
1170: }
1171: .obs-search__clear:hover {
1172:   color: var(--obs-red);
1173: }
1174: 
1175: .obs-legend-panel {
1176:   background: var(--obs-panel-bg);
1177:   backdrop-filter: blur(12px);
1178:   -webkit-backdrop-filter: blur(12px);
1179:   border: 1px solid var(--obs-panel-border-light);
1180:   border-radius: 10px;
1181:   padding: 8px 10px;
1182:   box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
1183: }
1184: 
1185: @media (max-width: 640px) {
1186:   .obs-legend-panel {
1187:     padding: 6px 8px;
1188:     border-radius: 8px;
1189:   }
1190: }
1191: .obs-legend-title {
1192:   font-size: 8px;
1193:   font-weight: 700;
1194:   text-transform: uppercase;
1195:   letter-spacing: 0.08em;
1196:   color: var(--obs-text-muted);
1197:   margin: 0 0 4px;
1198: }
1199: .obs-legend-item {
1200:   display: flex;
1201:   align-items: center;
1202:   gap: 8px;
1203:   font-size: 9px;
1204:   color: var(--obs-text-label);
1205:   padding: 1px 0;
1206: }
1207: .obs-legend-line {
1208:   width: 12px;
1209:   height: 2px;
1210:   border-radius: 1px;
1211:   flex-shrink: 0;
1212: }
1213: .obs-legend-line--dashed {
1214:   border: 1px dashed;
1215:   background: transparent !important;
1216: }
1217: </style>

(End of file - total 1217 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/ubuntu/EG-Maps/pages/observatory-of-vulcan/3d.vue"
}
```

**Output:**
```
<path>/home/ubuntu/EG-Maps/pages/observatory-of-vulcan/3d.vue</path>
<type>file</type>
<content>
1: <template>
2:   <div class="flex h-[100svh] w-full items-center justify-center bg-black text-white">
3:     <LoadingSpinner :message="t('loading.observatoryOfVulcanGlobe')" :inline="true" />
4:     <p class="absolute bottom-8 text-xs text-gray-500">
5:       <NuxtLink to="/observatory-of-vulcan" class="underline hover:text-white transition-colors">
6:         {{ t('globe.view2D') }} →
7:       </NuxtLink>
8:     </p>
9:   </div>
10: </template>
11: 
12: <script setup lang="ts">
13: const { t } = useI18n()
14: 
15: useHead({
16:   title: 'Observatory of Vulcan | Earth Guardians',
17:   meta: [{ name: 'description', content: 'Brazil rare earth mining claims — capital invasion, corporate networks, military interests & socio-environmental impact.' }],
18: })
19: 
20: onMounted(() => {
21:   navigateTo({ path: '/observatory-of-vulcan' }, { replace: true })
22: })
23: </script>

(End of file - total 23 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/ubuntu/EG-Maps/lib/types.ts"
}
```

**Output:**
```
<path>/home/ubuntu/EG-Maps/lib/types.ts</path>
<type>file</type>
<content>
1: export interface ProjectData {
2:   project_title: string;
3:   country_province: string;
4:   latitude: number;
5:   longitude: number;
6:   direct_beneficiaries: number;
7:   indirect_beneficiaries: number;
8: }
9: 
10: export interface Species {
11:   id: string;
12:   commonName: string;
13:   scientificName: string;
14:   category: string;
15:   taxonomicGroup: string;
16:   region: string;
17:   ecosystem: string;
18:   lat: number;
19:   lng: number;
20:   imageUrl: string | null;
21:   imageCredit: string;
22:   description?: string;
23:   endangerment?: string;
24:   ecosystemNeeds?: string;
25:   actions?: string;
26:   threatTypes?: string[];
27:   iucnUrl?: string;
28:   range?: {
29:     type: string;
30:     coordinates: number[][][];
31:   };
32:   content: Record<string, Record<string, string>>;
33: }
34: 
35: export type RareEarthCategory =
36:   | 'direct_ree'
37:   | 'carbonatite_associated'
38:   | 'pegmatite_associated'
39:   | 'heavy_mineral_associated'
40:   | 'phosphate_associated'
41:   | 'strategic_associated'
42: 
43: export interface RareEarthClaimProperties {
44:   /** Stable claim ID (from processo or generated) */
45:   id: string
46:   /** Claim process number (e.g. ANM processo) */
47:   processo: string
48:   /** Company / enterprise name */
49:   nome: string
50:   /** Substances (REE + others) */
51:   subs: string
52:   /** Category (RARE_EARTH_CATEGORIES key) */
53:   category: RareEarthCategory
54:   /** Mining phase (REQUERIMENTO, LICENCIAMENTO, etc.) */
55:   fase: string
56:   /** Brazilian state (UF) */
57:   uf: string
58:   /** Area in hectares */
59:   area_ha: number
60:   /** Pre-computed danger score 0-10 */
61:   danger_score: number
62:   /** Optional network/cluster id (corporate group) */
63:   network_id?: string
64:   /** Year of last event / filing */
65:   ano: number
66:   /** Last event description (if any) */
67:   ultimo_evento?: string
68:   /** Latitude */
69:   lat: number
70:   /** Longitude */
71:   lng: number
72:   /** Overlapping protected areas */
73:   overlaps?: Array<{ name: string; kind: 'ti' | 'quilombo'; distance_km: number }>
74:   /** Optional GeoJSON properties (raw passthrough) */
75:   raw?: Record<string, unknown>
76: }
77: 
78: export interface RareEarthPointFeature {
79:   type: 'Feature'
80:   id?: string | number
81:   geometry: { type: 'Point'; coordinates: [number, number] }
82:   properties: RareEarthClaimProperties
83: }
84: 
85: export interface RareEarthPointCollection {
86:   type: 'FeatureCollection'
87:   features: RareEarthPointFeature[]
88: }
89: 
90: export interface ToastMessage {
91:   id: string
92:   kind: 'info' | 'success' | 'warning' | 'error'
93:   title: string
94:   body?: string
95:   durationMs?: number
96:   /** Optional action button */
97:   action?: { label: string; onClick: () => void }
98:   /** ISO timestamp the toast was created */
99:   createdAt: number
100: }
101: 
102: export interface CommandPaletteItem {
103:   id: string
104:   /** Section/group for the palette */
105:   group: string
106:   /** Display label */
107:   label: string
108:   /** Optional secondary text */
109:   hint?: string
110:   /** Optional icon (iconify name) */
111:   icon?: string
112:   /** Optional keyboard shortcut to display */
113:   shortcut?: string
114:   /** Handler invoked when selected */
115:   onSelect: () => void
116:   /** Optional keywords to match against in addition to label/hint */
117:   keywords?: string[]
118: }

(End of file - total 118 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/ubuntu/EG-Maps/lib/constants.ts"
}
```

**Output:**
```
<path>/home/ubuntu/EG-Maps/lib/constants.ts</path>
<type>file</type>
<content>
1: // Dataset type constants to avoid magic strings throughout the codebase
2: export const DatasetKey = {
3:   PROJECT_GRANTS: 'project-grants',
4:   ENDANGERED_SPECIES: 'endangered-species',
5:   OBSERVATORY_OF_VULCAN: 'observatory-of-vulcan',
6:   ACTIVE_CREWS: 'active-crews',
7: } as const
8: 
9: export type DatasetKey = typeof DatasetKey[keyof typeof DatasetKey]
10: 
11: // Helper to check if a string is a valid dataset key
12: export function isValidDatasetKey(value: string): value is DatasetKey {
13:   return value === DatasetKey.PROJECT_GRANTS || value === DatasetKey.ENDANGERED_SPECIES || value === DatasetKey.OBSERVATORY_OF_VULCAN || value === DatasetKey.ACTIVE_CREWS
14: }
15: 
16: // Route paths
17: export const RoutePath = {
18:   PROJECT_GRANTS: '/project-grants',
19:   PROJECT_GRANTS_3D: '/project-grants/3d',
20:   ENDANGERED_SPECIES: '/endangered-species',
21:   ENDANGERED_SPECIES_3D: '/endangered-species/3d',
22:   OBSERVATORY_OF_VULCAN: '/observatory-of-vulcan',
23:   OBSERVATORY_OF_VULCAN_3D: '/observatory-of-vulcan/3d',
24:   ACTIVE_CREWS: '/active-crews',
25:   ACTIVE_CREWS_3D: '/active-crews/3d',
26:   HOME: '/',
27:   INFO: '/info',
28: } as const
29: 
30: // Maximum number of items to show in a cluster marker
31: export const MAX_CLUSTER_SIZE = 5
32: 
33: // ── Map constants ──
34: 
35: /** Minimum canvas margin (px) outside viewport for marker culling */
36: export const MARKER_VISIBILITY_MARGIN = 50
37: 
38: /** Cluster rebuild threshold: fraction of viewport pan needed to trigger a rebuild */
39: export const CLUSTER_REBUILD_THRESHOLD = 0.5
40: 
41: /** Mobile item limit for project markers */
42: export const MOBILE_PROJECT_LIMIT = 60
43: 
44: /** Mobile item limit for species markers */
45: export const MOBILE_SPECIES_LIMIT = 80
46: 
47: /** Threshold (number of points) above which native GeoJSON clustering is used */
48: export const NATIVE_GEOJSON_THRESHOLD = 500
49: 
50: /** Hex grid defaults */
51: export const HEX_GRID = {
52:   mobileSize: 35,
53:   desktopSize: 50,
54:   mobileSizeGlobe: 30,
55:   desktopSizeGlobe: 45,
56:   strokeColor: 'rgba(6, 182, 212, 0.25)',
57:   strokeColorGlobe: 'rgba(6, 182, 212, 0.15)',
58:   lineWidth: 1.5,
59:   lineWidthGlobe: 1,
60:   debounceMs: 150,
61: } as const
62: 
63: /** Species overlay tolerance (degrees) for coordinate matching */
64: export const SPECIES_COORD_TOLERANCE = 0.001
65: 
66: /** Timeout (ms) for map tile loading before showing error */
67: export const MAP_LOAD_TIMEOUT_MS = 20000

(End of file - total 67 lines)
</content>
```

---

## Assistant (Build · MiMo V2.5 Free · 216.7s)

_Thinking:_

Let me continue exploring the codebase to understand the data loading, composables, and components used by the observatory page.

Now let me explore the key composables and components used by this page.

**Tool: task**

**Input:**
```json
{
  "description": "Explore observatory composables",
  "prompt": "Thoroughly explore the observatory-of-vulcan page's data loading and map infrastructure. I need to understand:\n\n1. Read `composables/useRareEarthData.ts` completely - understand the full loading pipeline, what data files it fetches, phases, progress tracking\n2. Read `composables/useStateHash.ts` - understand URL state restoration\n3. Read `components/observatory/ObservatorySidebar.vue` - understand the sidebar tabs and what data they display\n4. Read `lib/map-utils.ts` - understand RARE_EARTH_CATEGORIES and map utilities\n5. Read `lib/enterprise-data.ts` - understand enterprise data structure\n6. Check if there are any existing data files under `public/data/` related to observatory or rare earth\n7. Read `components/UnifiedMap.vue` first 100 lines and the script section to understand how it receives and renders observatory data\n8. Read `composables/useUserPin.ts` if it exists\n9. Read `composables/useCommandPalette.ts` if it exists\n10. Read `composables/useToast.ts` if it exists\n\nReturn ALL the code content you find for each file, especially useRareEarthData.ts - I need the complete implementation.",
  "subagent_type": "explore"
}
```

**Output:**
```
<task id="ses_0f01bbac0ffeJ3PeLu2yCDFeH5" state="completed">
<task_result>
Now I have all the code. Here is a comprehensive report of every file found and its complete contents, organized by your 10 requests.

---

## 1. `composables/useRareEarthData.ts` -- COMPLETE (154 lines)

**Path:** `/home/ubuntu/EG-Maps/composables/useRareEarthData.ts`

This is the core data loading pipeline for the Observatory of Vulcan page.

### Types exported
- **`RareEarthFeatureSummary`** -- A compact representation of a mining claim feature with fields: `p` (processo), `n` (nome), `s` (subs), `c` (category), `f` (fase/phase), `u` (UF/state), `a` (area_ha), `ds` (danger_score), `net` (network_id), `y` (ano/year), `lo`/`la` (lon/lat), `ov` (overlaps array), `dsprocesso`.
- **`DeepAnalysis`** -- Shape of `deep_analysis.json`: `last_sync`, `data_source`, `sync_frequency`, `sync_url`, `suspicious_speculators_count`, `sigilo_stats`, `military_critical`, plus arbitrary extra keys.
- **`LoadPhase`** -- Union: `'idle' | 'points' | 'overlaps' | 'polygons' | 'protected' | 'complete'`

### Loading Pipeline (`load()` function)
The function executes a 4-phase sequential loading pipeline with `requestAnimationFrame` + `setTimeout(0)` yield points between phases so the UI can paint:

1. **Phase 1 -- Points (progress 0 -> 20):**
   - Fetches `${baseURL}data/rare-earth/points.geojson`
   - Transforms via `transformPoints()` into `RareEarthFeatureSummary[]`
   - Sets `pointsData` (shallowRef) and `features` (ref)
   - Yields to the browser via `requestAnimationFrame` + `setTimeout`

2. **Phase 2 -- Overlaps (progress 30):**
   - Fetches `${baseURL}data/rare-earth/points_with_overlaps.geojson` (fail-soft via `.catch(() => null)`)
   - Builds `overlapsByProcesso` map keyed by processo -> overlap array
   - Re-enriches the `features` array with overlap data

3. **Phase 3 -- Polygons (progress 50):**
   - Fetches `${baseURL}data/rare-earth/polygons.geojson` (fail-soft)
   - Stores in `polygonsData` shallowRef

4. **Phase 4 -- Protected areas + Deep Analysis (progress 70 -> 90 -> 100):**
   - Fetches in parallel: `protected-areas.geojson` and `deep_analysis.json` (both fail-soft)
   - Stores in `protectedData` and `deepAnalysis` shallowRefs
   - Sets phase to `'complete'`

### Returned state
```typescript
return {
  pointsData,        // shallowRef<RareEarthFeatureCollection | undefined>
  polygonsData,      // shallowRef<RareEarthFeatureCollection | undefined>
  protectedData,     // shallowRef<RareEarthFeatureCollection | undefined>
  features,          // ref<RareEarthFeatureSummary[]>
  speculatorIndex,   // computed<SpeculatorIndexEntry[]> -- derived from pointsData via computeSpeculatorIndex()
  deepAnalysis,      // shallowRef<DeepAnalysis | undefined>
  isLoading,         // ref<boolean>
  loadPhase,         // ref<LoadPhase>
  loadProgress,      // ref<number> (0-100)
  error,             // ref<Error | null>
  load,              // function
}
```

### `transformPoints()` details
Maps each GeoJSON Feature into a flat summary object, extracting coordinates from `geometry.coordinates` (Point type), and attaching overlap data from the pre-built `overlapsByProcesso` map.

### `speculatorIndex` computed
Calls `computeSpeculatorIndex(pointsData.value)` from `lib/observatory-analysis.ts` to generate a sorted index of speculators with suspicion scores.

---

## 2. `composables/useStateHash.ts` -- COMPLETE (87 lines)

**Path:** `/home/ubuntu/EG-Maps/composables/useStateHash.ts`

URL hash state serialization/deserialization for sharing views. Encodes map center, zoom, year range, phases, heatmap toggle, enterprise toggle, and active tab into a compact hash string like `/-48.0000,-15.0000/z4.2/ymin2020/ymax2025/phLAVRA.CONCETO/heat/tabmilitary`.

### `ShareableState` interface
```typescript
interface ShareableState {
  center?: [number, number]
  zoom?: number
  yearMin?: number
  yearMax?: number
  phases?: string[]
  heatmap?: boolean
  enterprise?: boolean
  tab?: string
}
```

### Encoding
- Center: `lat,lng` (4 decimal places)
- Zoom: `z{zoom}` (1 decimal)
- Year min/max: `ymin{year}`, `ymax{year}` (only if non-default)
- Phases: `ph{phase1}.{phase2}` (only if < 7 phases selected)
- Heatmap/enterprise: `heat`, `ent` (boolean flags)
- Tab: `tab{tabName}` (only if not default `'danger'`)

### Decoding
Splits on `/`, pattern-matches each part to determine its type. Handles `#` prefix cleanup.

### Functions
- `updateHash(state)` -- Encodes and writes to `window.location.hash`, or clears hash if empty
- `copyShareUrl(state)` -- Builds full URL with hash and copies to clipboard via `navigator.clipboard.writeText()`
- `restoredState` -- Populated on mount from `window.location.hash` if present

---

## 3. `components/observatory/ObservatorySidebar.vue` -- COMPLETE (410 lines)

**Path:** `/home/ubuntu/EG-Maps/components/observatory/ObservatorySidebar.vue`

A collapsible sidebar with 6 tabs for the observatory. Supports both collapsed (icon strip) and expanded (full panel) modes.

### Tabs (from `OBSERVATORY_TABS`)
1. **Danger** (`danger`) -- Shows `SpeculatorIndexEntry[]` items via `DangerTab`
2. **Military** (`military`) -- Via `MilitaryTab`
3. **Illegal** (`illegal`) -- Via `IllegalTab`
4. **Environment** (`env`) -- Via `EnvironmentTab` (emits `fly-to-coord`)
5. **Network** (`network`) -- Via `NetworkTab`
6. **Timeline** (`timeline`) -- Via `TimelineTab`

### Props
- `activeTab: string | null` -- Currently selected tab key
- `dangerItems: DangerItem[]` -- SpeculatorIndex entries for danger tab
- `showAll?: boolean` -- Controls "show all" toggle in danger tab

### Emits
- `update:activeTab` -- Tab selection change
- `update:showAll` -- Show-all toggle
- `fly-to-enterprise` -- Fly to an enterprise location
- `fly-to-coord` -- Fly to specific coordinates

### State management
- Uses `useUrlState('obs', ...)` to sync `tab`, `feature`, and `showAll` to the URL hash
- `collapsed` state synced with `useMediaQuery('(max-width: 768px)')` -- auto-collapses on mobile
- Keyboard navigation: ArrowLeft/ArrowRight on tabs
- Focus trap via `useFocusTrap()` on the expanded panel

---

## 4. `lib/map-utils.ts` -- COMPLETE (569 lines)

**Path:** `/home/ubuntu/EG-Maps/lib/map-utils.ts`

### `RARE_EARTH_CATEGORIES`
```typescript
const RARE_EARTH_CATEGORIES: Record<string, { label: string; color: string }> = {
  direct_ree:              { label: 'Terras Raras Diretas',       color: '#e74c3c' },
  carbonatite_associated:  { label: 'Carbonatito/Alcalino',      color: '#f39c12' },
  pegmatite_associated:    { label: 'Pegmatito',                 color: '#27ae60' },
  heavy_mineral_associated:{ label: 'Minerais Pesados',          color: '#2980b9' },
  phosphate_associated:    { label: 'Fosfato',                   color: '#8e44ad' },
  strategic_associated:    { label: 'Estratégicos',              color: '#e91e63' },
}
```

### `RARE_EARTH_PHASES`
7 mining phases with labels, short labels, and colors:
`REQUERIMENTO`, `REQUERIMENTO DE PESQUISA`, `AUTORIZAÇÃO DE PESQUISA`, `DISPONIBILIDADE`, `LICENCIAMENTO`, `CONCESSÃO`, `LAVRA`

### Key functions
- `buildProjectPopupHTML()` -- Full HTML for project grant popups with SVG icons, metrics
- `buildCrewPopupHTML()` -- HTML for crew region popups
- `buildCrewLocationPopupHTML()` -- HTML for individual crew location popups
- `buildSpeciesPopupHTML()` -- Rich species popup with image, badges, threat tags, endangerment indicator
- `buildRareEarthPopupHTML(props)` -- Rare earth claim popup with category badge, danger score bar, flags (MIL/ENV/SUS), ANM verify link, report link, overlaps section
- `escapeHtml()` -- HTML entity escaping
- `isValidCoordinate()` -- Lat/lng bounds check
- `getGroupColor()` / `getCategoryColor()` / `getPhaseColor()` / `getPhaseShortLabel()` -- Color lookups
- `generateCurvedPath()` -- Bezier midpoint for connection lines
- `calculateDistance()` -- Haversine distance in km
- Re-exports: `isMilitaryInterest`, `isHighEnvRisk`, `isSuspicious` from `observatory-analysis`

---

## 5. `lib/enterprise-data.ts` -- COMPLETE (464 lines)

**Path:** `/home/ubuntu/EG-Maps/lib/enterprise-data.ts`

### Interfaces
- **`EnterpriseHQ`** -- name, ticker, logoUrl, country, city, lat/lng, description, sector, link, subsidiaries, shareholders, holdings, color
- **`CorporateConnection`** -- from, to, type (shareholding/joint_venture/subsidiary/board_overlap/partnership), label
- **`MiningClaim`** -- id, enterprise, claimName, lat/lng, substance, phase, uf, areaHa, dangerScore, networkId, category, year

### `ENTERPRISES` array (17 enterprises)
Major mining companies involved in Brazilian rare earths: VALE S.A., Rio Tinto, CBMM, Serra Verde Mining, Viridis Mining, Meteoric Resources, Foxfire Metals, Axel REE, Aclara Resources, Alpha Minerals, GR8 Energetic, Nazca Gold Mining, Ponticor Brasil, Mars GMN/Gol, Talisman/Spar, Palmares/Magbras.

### `CORPORATE_CONNECTIONS` array (19 connections)
Defines relationships between enterprises: subsidiary, joint_venture, board_overlap, shareholding, partnership.

### `MINING_PHASES` array
5 phases: REQUERIMENTO, DISPONIBILIDADE, CONCESSAO, APROVEITAMENTO, LICENCIAMENTO (with colors).

### Key functions
- `getPhaseColor(phase)` -- Phase to color lookup
- `getEnterpriseByName(name)` -- Find enterprise by name
- `getEnterpriseConnections(name)` -- Get from/to connections for an enterprise
- `buildEnterpriseNetworkLines(points)` -- Takes a GeoJSON FeatureCollection of points, matches claims to enterprises by normalized name, builds LineString features for: (a) enterprise HQ -> claim centroid lines, (b) corporate inter-enterprise connections
- `buildEnterpriseHQGeoJSON(speculatorIndex?)` -- Builds GeoJSON of enterprise headquarters, optionally repositioned to centroids from the speculator index
- `normalizeEnterpriseName()` -- Strips accents, legal suffixes, punctuation for fuzzy matching

---

## 6. `public/data/` directory -- Observatory/Rare Earth data files

**Path:** `/home/ubuntu/EG-Maps/public/data/rare-earth/`

9 files found:
| File | Purpose |
|------|---------|
| `points.geojson` | Main points dataset (used by `useRareEarthData` Phase 1) |
| `points_full.geojson` | Full points dataset |
| `points_with_overlaps.geojson` | Points enriched with overlap data (Phase 2) |
| `polygons.geojson` | Claim polygon boundaries (Phase 3) |
| `polygons_full.geojson` | Full polygon dataset |
| `protected-areas.geojson` | Indigenous lands and quilombola territories (Phase 4) |
| `deep_analysis.json` | Statistical analysis data (Phase 4) |
| `all.geojson` | Combined dataset |
| `rare_earth_map_v5.html` | Static map HTML |

The `deep_analysis.json` (248 lines) contains: `last_sync` (2026-06-01), `suspicious_speculators_count` (437), `top_suspicious` (10 entries with scores 5-6), `foreign_claims` (Australian 5.5%, US 2.3%, UK/European 1.6%, Canadian 0.9%), `year_counts` (2000-2026), `key_events` (8 geopolitical milestones), `sigilo_stats` (88 secrecy claims), `military_critical` (3363 claims in military UFs, 150 US-connected).

---

## 7. `components/UnifiedMap.vue` -- First 850+ lines (script section for observatory data handling)

**Path:** `/home/ubuntu/EG-Maps/components/UnifiedMap.vue` (1947 lines total)

### Props relevant to observatory
```typescript
interface Props {
  defaultDataset?: 'project-grants' | 'endangered-species' | 'observatory-of-vulcan' | 'active-crews'
  rareEarthPoints?: GeoJSON.FeatureCollection
  rareEarthPolygons?: GeoJSON.FeatureCollection
  rareEarthProtected?: GeoJSON.FeatureCollection
  rareEarthAnalysis?: Record<string, unknown>
  layerVisibility?: Record<string, boolean>
  flyToTarget?: { lng: number; lat: number; zoom?: number } | null
}
```

### Map initialization for observatory
When `activeDataset === 'observatory-of-vulcan'`:
- Map center: `[-48, -15]` (central Brazil)
- Initial zoom: `4.2`
- Min zoom: `2.5`, Max zoom: `16`
- On map load: calls `setupRareEarthLayers()` then `rebuildMarkers()`

### `useRareEarthController` integration
```typescript
const rareEarthController = useRareEarthController({
  map: computed(() => map),
  isActive: computed(() => activeDataset.value === 'observatory-of-vulcan'),
  getProps: () => props,
  popup: { t, locale },
})
```

### Observers for rare earth data
```typescript
watch(() => [props.rareEarthPoints, props.rareEarthPolygons], () => {
  if (!map || activeDataset.value !== 'observatory-of-vulcan') return
  setupRareEarthLayers()
  rebuildMarkers()
}, { deep: true })
```

### Fly-to target support
```typescript
watch(() => props.flyToTarget, (target) => {
  if (!target || !map) return
  map.flyTo({ center: [target.lng, target.lat], zoom: target.zoom ?? 5, duration: 1500, essential: true })
}, { deep: true })
```

### Template slot
Provides `<slot name="overlays" />` for the observatory page to inject custom UI panels (stats, sidebar, filters, etc.).

---

## 8. `composables/useUserPin.ts` -- COMPLETE (126 lines)

**Path:** `/home/ubuntu/EG-Maps/composables/useUserPin.ts`

Manages a user-placed "My Territory" pin that persists in localStorage and can be shared via URL hash.

### `UserPin` interface
```typescript
interface UserPin {
  lng: number
  lat: number
  label: string
  savedAt: number
}
```

### Storage
- **localStorage key:** `egmaps.userPin.v1`
- **Hash format:** `#pin=c{lng},{lat}&l={label}`

### Behavior
- On init: checks URL hash first for shared pin, falls back to localStorage
- Watches `pin` reactively and syncs to localStorage
- `setPin(coords, label)` -- Sets pin and clears shared-from-URL flag
- `clearPin()` -- Removes pin
- `getShareUrl()` -- Builds URL with pin hash
- `copyShareUrl()` -- Copies share URL to clipboard (with `execCommand` fallback)

---

## 9. `composables/useCommandPalette.ts` -- COMPLETE (83 lines)

**Path:** `/home/ubuntu/EG-Maps/composables/useCommandPalette.ts`

A global command palette system using Nuxt's `useState()`.

### `CommandPaletteItem` interface
```typescript
interface CommandPaletteItem {
  id: string
  group: string
  label: string
  hint?: string
  icon?: string
  shortcut?: string
  keywords?: string[]
  onSelect: () => unknown
  visible?: () => boolean
}
```

### State management
- Uses `useState('command-palette', ...)` for `open`/`query` state
- Uses `useState('command-palette:items', ...)` for registered items

### Functions
- `open()` / `close()` / `toggle()` -- Control palette visibility
- `setQuery(q)` -- Update search query
- `register(item)` -- Register a single item, returns unregister function
- `registerMany(items)` -- Register multiple items, returns single unregister function
- `filterPaletteItems(items, query)` -- Filter items by label/hint/group/keywords
- `groupPaletteItems(items)` -- Group items by `group` field

---

## 10. `composables/useToast.ts` -- COMPLETE (73 lines)

**Path:** `/home/ubuntu/EG-Maps/composables/useToast.ts`

Toast notification system using Nuxt's `useState()`.

### `ToastMessage` (from `lib/types.ts`)
```typescript
interface ToastMessage {
  id: string
  kind: 'info' | 'success' | 'warning' | 'error'
  title: string
  body?: string
  durationMs?: number
  action?: { label: string; onClick: () => void }
  createdAt: number
}
```

### Default durations
- `info`: 4000ms
- `success`: 3500ms
- `warning`: 5000ms
- `error`: 7000ms

### Functions
- `push(toast)` -- Add toast with auto-generated ID, starts auto-dismiss timer
- `dismiss(id)` -- Remove specific toast
- `clear()` -- Remove all toasts
- `info(title, body?)` / `success(...)` / `warning(...)` / `error(...)` -- Convenience wrappers

---

## Supporting Files Also Found

### `lib/observatory-analysis.ts` (247 lines)
Core analysis functions for rare earth data:
- `computeSpeculatorIndex(points)` -- Builds `SpeculatorIndexEntry[]` from raw points: groups by normalized name, computes `count`, `totalAreaHa`, `recentPct`, `suspicionScore` (flags: RECENT_RUSH, CARPET_BOMBING, HIGH_VOLUME, LARGE_AREA_FEW_SUBS, MULTI_UF), and centroid.
- `isMilitaryInterest(uf)` -- Checks if UF is in Amazon military states (AM, AP, PA, RR, RO, MT)
- `isHighEnvRisk(props)` -- Fosfato, area > 50k ha, MG + research phase after 2022
- `isSuspiciousBasic(props, speculator)` -- Post-2020, research phase, speculator with 50+ claims, few subs, 90%+ recent
- `computeDangerScore(props, speculator)` -- 0-10 composite danger score
- `getTopDangerEnterprises(points, options)` -- Top N dangerous speculators
- `buildAnmVerifyUrl()` / `buildClaimReportMailtoUrl()` -- ANM verification and report email generators

### `lib/observatory-tabs.ts` (251 lines)
Defines tab structure plus static data for each tab:
- `MILITARY_ASSETS` -- 3 US military platforms with REE kg/unit
- `US_INVESTMENTS` -- 8 US government investment flows
- `ILLEGAL_PATTERNS` -- 6 illegal mining patterns
- `ENV_REGIONS` -- 6 environmental conflict regions with danger scores
- `NETWORK_NOTES` -- 4 network analysis notes
- `TIMELINE_HIGHLIGHTS` -- 14 historical milestones (2000-2026)

### `composables/useRareEarthController.ts` (179 lines)
Bridges the observatory page and the map layers:
- Manages all watchers for layer visibility, points data updates (debounced), protected areas updates, polygon late-add, and fly-to targets
- `setupLayers()` -- Delegates to `setupRareEarthLayers()` from `useRareEarthLayers.ts`
- `addFlyToHighlight(lng, lat)` -- Adds a pulsing red circle marker that auto-removes after 5 seconds

### `composables/useRareEarthLayers.ts` (833 lines)
The actual MapLibre layer setup:
- **7 GeoJSON sources:** `ree-points` (clustered), `ree-polys`, `ree-geo`, `ree-sites`, `ree-network`, `ree-protected`, `ree-cities`
- **26 layers:** point circles, clusters, cluster counts, heatmap, polygon fill/glow/line/labels, geo boundaries (basins, aquifers, conflict zones), conflict site markers, network lines, protected areas (TI + quilombo), city labels, overlap glows
- `syncRareEarthLayerVisibility()` -- Toggles layer visibility based on a `Record<string, boolean>` map
- `addPolygonLayersToMap()` -- Late-add for polygon data
- `buildNetworkLinesFromClaims()` -- Hub-and-spoke network lines from network_id grouping

### `composables/useUrlState.ts` (94 lines)
Generic reactive URL hash state: encodes key-value pairs to `#key=val&key2=val2`, syncs bidirectionally with `hashchange` listener, uses `replaceState` to avoid history flooding.

### Pages
- **`/observatory-of-vulcan/index.vue`** (1217 lines) -- Full 2D page with loading overlay, stats panel, action buttons, filter panel (year slider, phase filter, layer checkboxes), search, sidebar, pin system, keyboard shortcuts, animated counters
- **`/observatory-of-vulcan/3d.vue`** (99 lines) -- Simpler 3D globe version using `GlobeView` component with same data pipeline

### `public/data/rare-earth/deep_analysis.json` (248 lines)
Statistical analysis snapshot with 437 suspicious speculators, foreign claim breakdowns, year-by-year claim counts (peak: 4213 in 2023), 88 secrecy claims covering 105,139 ha, and 3363 claims in military-critical UFs (150 US-connected).
</task_result>
</task>
```

**Tool: task**

**Input:**
```json
{
  "description": "Explore observatory components",
  "prompt": "Thoroughly explore ALL components under `components/observatory/` directory. Read each file completely and return the full content. I need to understand:\n\n1. List all files in `components/observatory/` directory\n2. Read each component file completely - especially YearSlider.vue, PhaseFilter.vue, ClaimReportModal.vue, ExportModal.vue, KeyboardShortcuts.vue, ClaimsDataTable.vue, GeoLocateModal.vue, RedeCorporativa.vue, DataDownloadPanel.vue, GeoPoliticalTimeline.vue\n3. Also check for any observatory-specific CSS/styles in `assets/css/` related to observatory\n4. Check `locales/en.json` for observatory-related translation keys (search for \"observatory\" keys)\n\nReturn ALL the code content for every file found.",
  "subagent_type": "explore"
}
```

**Output:**
```
<task id="ses_0f01bb09bffe1zzckirJkVduR6" state="completed">
<task_result>
Now I have the complete picture. Here is the full comprehensive report:

---

## Complete Inventory of Observatory Components

### Directory: `/home/ubuntu/EG-Maps/components/observatory/`

**15 files total** (9 root-level + 6 in `tabs/` subdirectory):

| # | File | Path | Lines |
|---|------|------|-------|
| 1 | `YearSlider.vue` | `/home/ubuntu/EG-Maps/components/observatory/YearSlider.vue` | 191 |
| 2 | `PhaseFilter.vue` | `/home/ubuntu/EG-Maps/components/observatory/PhaseFilter.vue` | 87 |
| 3 | `ClaimReportModal.vue` | `/home/ubuntu/EG-Maps/components/observatory/ClaimReportModal.vue` | 142 |
| 4 | `ExportModal.vue` | `/home/ubuntu/EG-Maps/components/observatory/ExportModal.vue` | 153 |
| 5 | `KeyboardShortcuts.vue` | `/home/ubuntu/EG-Maps/components/observatory/KeyboardShortcuts.vue` | 179 |
| 6 | `ClaimsDataTable.vue` | `/home/ubuntu/EG-Maps/components/observatory/ClaimsDataTable.vue` | 283 |
| 7 | `GeoLocateModal.vue` | `/home/ubuntu/EG-Maps/components/observatory/GeoLocateModal.vue` | 442 |
| 8 | `ClaimPopup.vue` | `/home/ubuntu/EG-Maps/components/observatory/ClaimPopup.vue` | 163 |
| 9 | `ObservatorySidebar.vue` | `/home/ubuntu/EG-Maps/components/observatory/ObservatorySidebar.vue` | 410 |
| 10 | `tabs/DangerTab.vue` | `/home/ubuntu/EG-Maps/components/observatory/tabs/DangerTab.vue` | 308 |
| 11 | `tabs/MilitaryTab.vue` | `/home/ubuntu/EG-Maps/components/observatory/tabs/MilitaryTab.vue` | 134 |
| 12 | `tabs/IllegalTab.vue` | `/home/ubuntu/EG-Maps/components/observatory/tabs/IllegalTab.vue` | 67 |
| 13 | `tabs/EnvironmentTab.vue` | `/home/ubuntu/EG-Maps/components/observatory/tabs/EnvironmentTab.vue` | 121 |
| 14 | `tabs/NetworkTab.vue` | `/home/ubuntu/EG-Maps/components/observatory/tabs/NetworkTab.vue` | 57 |
| 15 | `tabs/TimelineTab.vue` | `/home/ubuntu/EG-Maps/components/observatory/tabs/TimelineTab.vue` | 123 |

### Observatoire-Related Components Outside `components/observatory/`

The three components you asked about (`RedeCorporativa.vue`, `DataDownloadPanel.vue`, `GeoPoliticalTimeline.vue`) are **NOT** in `components/observatory/` -- they live in the **root `components/` directory**:

| # | File | Path | Lines |
|---|------|------|-------|
| 16 | `RedeCorporativa.vue` | `/home/ubuntu/EG-Maps/components/RedeCorporativa.vue` | 402 |
| 17 | `DataDownloadPanel.vue` | `/home/ubuntu/EG-Maps/components/DataDownloadPanel.vue` | 282 |
| 18 | `GeoPoliticalTimeline.vue` | `/home/ubuntu/EG-Maps/components/GeoPoliticalTimeline.vue` | 684 |

### Observatory-Specific CSS in `assets/css/`

**None found.** A grep for "observatory" in `assets/css/` returned zero matches. All observatory styling is done via scoped `<style>` blocks within each component.

### Observatory Translation Keys in `locales/en.json`

The `observatory` key in `locales/en.json` spans lines 226-459 (approximately 234 lines). The full section includes these sub-keys:
- `tabs` (6 tab labels)
- `dangerPanel` (9 keys)
- `military` (6 keys)
- `illegal` (18 keys -- descriptions + examples for 6 illegal patterns)
- `envPanel` (2 keys)
- `network` (10 keys)
- `timelinePanel` (3 keys)
- `actions` (3 keys)
- `layers` (9 keys)
- `myTerritory` (8 keys)
- `geoLocate` (14 keys)
- `search` (1 key)
- `legend` (4 keys)
- `badges` (6 keys)
- `popups` (16 keys)
- `sync` (5 keys)
- `sidebarLabel`, `sidebarCollapse`, `sidebarExpand`, `selectTab` (4 keys)
- `categories` (6 keys)
- `yearSlider` (6 keys)
- `phaseFilter` (3 keys)
- `claimReport` (14 keys -- including nested `types`)
- `export` (10 keys)

---

## Component-by-Component Summary

### 1. `YearSlider.vue` (191 lines)
**Purpose:** Dual-handle range slider for filtering claims by filing year (1935-2026).
- **Props:** `yearMin`, `yearMax`, `filteredCount`
- **Emits:** `update:yearMin`, `update:yearMax`
- **Features:** Play/pause animation that increments `yearMax` by 1 every 200ms, reset button, live claim count display
- **Style:** Custom CSS range slider with red (#e74c3c) thumbs, `--fill-pct` CSS variable for fill gradient. Scoped, with WebKit and Mozilla slider styles.

### 2. `PhaseFilter.vue` (87 lines)
**Purpose:** Toggle buttons for filtering claims by mining phase.
- **Props:** `selected: Set<string>`
- **Emits:** `update:selected`
- **Data source:** Imports `RARE_EARTH_PHASES` from `@/lib/map-utils`
- **Features:** Select All / Select None buttons, reactive Set-based selection, syncs with parent via `watch`

### 3. `ClaimReportModal.vue` (142 lines)
**Purpose:** Modal form for reporting issues with a specific mining claim.
- **Props:** `visible`, `claim` (with fields `p`, `n`, `u`, `s`, `la`, `lo`)
- **Emits:** `close`
- **Features:** Report type dropdown (5 types), 500-char description textarea, GPS location checkbox (uses `navigator.geolocation`), optional contact field
- **Uses:** `buildClaimReportMailtoUrl()` from `@/lib/observatory-analysis`, `useFocusTrap` composable
- **Submit:** Opens a `mailto:` URL in a new tab

### 4. `ExportModal.vue` (153 lines)
**Purpose:** Modal for exporting the map view as PNG or PDF.
- **Props:** `visible`, `mapContainer: HTMLElement | null`, `filterSummary?`
- **Emits:** `close`
- **Features:** Format selection (PNG/PDF), resolution (1x/2x), paper size (A4/Letter), legend & title checkboxes
- **Uses:** `exportMapToImage()` from `@/lib/map-export`, `useFocusTrap`
- **Export:** Calls `exportMapToImage()` with selected options, shows "Exporting..." state

### 5. `KeyboardShortcuts.vue` (179 lines)
**Purpose:** Help modal showing all keyboard shortcuts for the observatory.
- **Props:** `visible`
- **Emits:** `close`
- **Content:** Three groups of shortcuts: Navigation (4), Filters & Layers (7), Sidebar (6)
- **Style:** Custom `obs-*` BEM CSS classes, `modal-fade` transition, respects `prefers-reduced-motion`

### 6. `ClaimsDataTable.vue` (283 lines)
**Purpose:** Full-screen modal data table showing all claims with sorting, search, and infinite scroll.
- **Props:** `visible`, `data: RareEarthFeatureSummary[]`
- **Emits:** `close`, `fly-to`
- **Features:** 8 columns (Category dot, Name, Processo, UF, Year, Phase, Danger score, Area), client-side search, multi-column sort, infinite scroll (50 rows per page), click row to fly to location
- **Uses:** `RARE_EARTH_CATEGORIES` from `@/lib/map-utils`

### 7. `GeoLocateModal.vue` (442 lines)
**Purpose:** Two-step modal for geolocation -- either browser GPS or city search.
- **Props:** `visible`
- **Emits:** `close`, `locate`
- **Features:** Step 1 (prompt): GPS detection or city search with debounced autocomplete; Step 2 (confirm): shows detected location with option to confirm or go back
- **Uses:** `useGeoLocate` composable from `@/composables/useGeoLocate` (city search, reverse geocoding)
- **Style:** Extensive `obs-geo-modal` BEM CSS, custom spinner animation, `geo-modal` transitions

### 8. `ClaimPopup.vue` (163 lines)
**Purpose:** Rich popup card shown when clicking a claim marker on the map.
- **Props:** `p`, `n`, `s`, `c`, `f`, `u`, `a`, `ds`, `net`, `y`, `lo`, `la`, `ev`, `ov`, `speculator`
- **Features:** Category badge, danger score with color-coded bar, network badge, MIL/ENV/SUS flags, metadata grid (Process, Phase, UF, Area), last event with age label (Recent/Active/Stale), overlap warnings, ANM verify link, report mailto link
- **Uses:** `RARE_EARTH_CATEGORIES`, `isSuspicious` from `@/lib/map-utils`; `isMilitaryInterest`, `isHighEnvRisk`, `buildAnmVerifyUrl`, `buildClaimReportMailtoUrl` from `@/lib/observatory-analysis`

### 9. `ObservatorySidebar.vue` (410 lines)
**Purpose:** Main sidebar container with 6 tabs (Danger, Military, Illegal, Environment, Network, Timeline).
- **Props:** `activeTab`, `dangerItems`, `showAll?`
- **Emits:** `update:activeTab`, `update:showAll`, `fly-to-enterprise`, `fly-to-coord`
- **Features:** Collapsed state (icon strip) vs expanded state (full panel), URL state sync via `useUrlState`, keyboard arrow navigation between tabs, responsive (auto-collapses on mobile)
- **Uses:** All 6 tab components, `OBSERVATORY_TABS` from `@/lib/observatory-tabs`, `useFocusTrap`, `useMediaQuery`

### 10. `tabs/DangerTab.vue` (308 lines)
**Purpose:** Lists top dangerous enterprises ranked by suspicion score.
- **Props:** `items: SpeculatorIndexEntry[]`, `showAll: boolean`
- **Emits:** `fly-to-enterprise`, `update:showAll`
- **Features:** Sorted by suspicion score then area, paginated (20 per page), show all/show top 20 toggle, each card shows rank, score badge, name, danger bar, process count, area, UF list, substances

### 11. `tabs/MilitaryTab.vue` (134 lines)
**Purpose:** Displays military supply chain information for REE.
- **Data:** `MILITARY_ASSETS` and `US_INVESTMENTS` from `@/lib/observatory-tabs`
- **Content:** Two sections: DoD Investments (asset cards with flag, name, kg/units) and State Dept & Export Finance (investment cards), plus China Export Ban callout

### 12. `tabs/IllegalTab.vue` (67 lines)
**Purpose:** Lists illegal/problematic mining patterns.
- **Data:** `ILLEGAL_PATTERNS` from `@/lib/observatory-tabs`
- **Content:** Renders pattern cards with title (color-coded), description, and bulleted examples

### 13. `tabs/EnvironmentTab.vue` (121 lines)
**Purpose:** Lists environmental risk regions with fly-to-map capability.
- **Data:** `ENV_REGIONS` from `@/lib/observatory-tabs`
- **Emits:** `fly-to-coord`
- **Features:** Region cards with danger score, company tags, risk descriptions, fly-to button per region

### 14. `tabs/NetworkTab.vue` (57 lines)
**Purpose:** Displays corporate network information notes.
- **Data:** `NETWORK_NOTES` from `@/lib/observatory-tabs`
- **Content:** Hint text + color-coded note cards (Foxfire Metals hub, Australian Invasion, US Military Interest, CBMM China)

### 15. `tabs/TimelineTab.vue` (123 lines)
**Purpose:** Visual timeline of claim filing activity from 2000-2026.
- **Data:** `TIMELINE_HIGHLIGHTS` from `@/lib/observatory-tabs`
- **Features:** Horizontal bar chart per year, color-coded by count (green/orange/red), cumulative count, event notes on notable years

### 16. `components/RedeCorporativa.vue` (402 lines)
**Purpose:** Canvas-based interactive corporate network force-graph visualization.
- **Props:** `visible`
- **Emits:** `close`, `flyToEnterprise`
- **Features:** Fruchterman-Reingold force layout (`computeForceLayout` from `useForceLayout`), dashed bezier-curve edges colored by type (shareholding, subsidiary, joint venture, board overlap, partnership), radial gradient nodes sized by connection count, hover tooltip on edges, click to focus enterprise, relayout button, "Fly to" action for focused enterprise
- **Uses:** `ENTERPRISES`, `CORPORATE_CONNECTIONS` from `@/lib/enterprise-data`; `useFocusTrap`

### 17. `components/DataDownloadPanel.vue` (282 lines)
**Purpose:** Modal for downloading all observatory datasets (JSON, GeoJSON, CSV).
- **Props:** `visible`
- **Emits:** `close`
- **Features:** "Download ALL" button for bulk download, individual download items with format badges (JSON/CSV/GeoJSON), download feedback via `useToast()`
- **Uses:** `DOWNLOADABLE_DATASETS`, `downloadData`, `downloadAllDatasets` from `@/composables/useDataDownload`; `useFocusTrap`

### 18. `components/GeoPoliticalTimeline.vue` (684 lines)
**Purpose:** Full-page modal geopolitical intelligence brief about rare earth supply chains.
- **Props:** `visible`
- **Emits:** `close`
- **Sections:**
  1. **Hero header** with 4 stat cards (78% US weapons dependency, $2.7T Brazil value, 4,213 claims, 15 years)
  2. **Executive Summary** with callout
  3. **Geopolitical Landscape** -- 4 country cards (China, USA, Brazil, Australia) with stats
  4. **Corporate Network** -- Foxfire Metals hub visualization with 5 connected nodes + 4 investor flows
  5. **Historical Timeline** -- Dynamic `TimelineEvent` render function component showing events from `GEOPOLITICAL_TIMELINE`
  6. **Mining Phase Breakdown** -- 5 phase cards from `MINING_PHASE_TIMELINE`
  7. **Call to Action** -- 6 CTA cards (Global Oversight, Brazilian Sovereignty, Community Consent, Circular Economy, Technology Alternatives, Uni-vos Povo)
- **Uses:** `GEOPOLITICAL_TIMELINE`, `MINING_PHASE_TIMELINE` from `@/lib/observatory-timeline`; `useFocusTrap`; Vue `h()` render function for `TimelineEvent`
</task_result>
</task>
```

**Tool: task**

**Input:**
```json
{
  "description": "Explore map and lib files",
  "prompt": "Read the following files completely and return all content:\n\n1. `lib/map-utils.ts` - full content\n2. `lib/map-effects.ts` - full content  \n3. `lib/enterprise-data.ts` - full content (or at least the structure and first 100 lines if very large)\n4. `composables/useMapLibre.ts` - if exists, full content\n5. `composables/useMapMarkers.ts` - if exists, first 100 lines\n6. `composables/useMapPopup.ts` - if exists, first 100 lines\n7. `composables/useMapConnections.ts` - if exists, first 50 lines\n8. `composables/useMapHexGrid.ts` - if exists, first 50 lines\n9. `composables/useEnterpriseMarkers.ts` - if exists, full content\n10. Check `public/data/` directory structure - list all subdirectories and files\n\nReturn all code found.",
  "subagent_type": "explore"
}
```

**Output:**
```
<task id="ses_0f01ba632ffeH5WuR6LNkWIN2q" state="completed">
<task_result>
Here is the complete content of all requested files:

---

## 1. `/home/ubuntu/EG-Maps/lib/map-utils.ts` (569 lines)

```typescript
import { getProjectColorByBeneficiaries, COLOR_MAMMAL } from './colors'
import type { ProjectData, Species } from './types'
import type { CrewRegionData } from './crew-data'
import { isMilitaryInterest as _isMilitaryInterest, isHighEnvRisk as _isHighEnvRisk, isSuspiciousBasic, buildAnmVerifyUrl, buildClaimReportMailtoUrl, type SpeculatorIndexEntry } from './observatory-analysis'

export type { Species }

export const GROUP_COLORS: Record<string, string> = {
  Mammal: COLOR_MAMMAL,
  Bird: '#D97706',
  Amphibian: '#5A8F3C',
  Reptile: '#7C3AED',
  Fish: '#2563EB',
  Plant: '#15803D',
  Invertebrate: '#DB2777'
}

export interface PopupTranslations {
  projectGrantee: string
  directBeneficiaries: string
  indirectBeneficiaries: string
  location: string
  status: string
  unknownLocation: string
}

export interface SpeciesPopupTranslations {
  scientificName: string
  threatTypes: string
  population: string
  habitat: string
  region: string
  ecosystem: string
  groupLabels?: Record<string, string>
}

export function buildProjectPopupHTML(project: ProjectData, translations?: PopupTranslations): string {
  const color = getProjectColorByBeneficiaries(project.direct_beneficiaries, project.indirect_beneficiaries)
  const t = translations || {
    projectGrantee: 'Project Grantee',
    directBeneficiaries: 'Direct Beneficiaries',
    indirectBeneficiaries: 'Indirect Beneficiaries',
    location: 'Location',
    status: 'Status',
    unknownLocation: 'Unknown location'
  }
  const showDirect = project.direct_beneficiaries > 0
  const showIndirect = project.indirect_beneficiaries > 0
  const showMetrics = showDirect || showIndirect

  const directMetricHTML = showDirect ? `
          <div class="project-metric">
            <div class="project-metric-header">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span>${t.directBeneficiaries}</span>
            </div>
            <span class="project-metric-value direct">${project.direct_beneficiaries.toLocaleString()}</span>
          </div>` : ''

  const indirectMetricHTML = showIndirect ? `
          <div class="project-metric">
            <div class="project-metric-header">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              <span>${t.indirectBeneficiaries}</span>
            </div>
            <span class="project-metric-value indirect">${project.indirect_beneficiaries.toLocaleString()}</span>
          </div>` : ''

  const metricsBlock = showMetrics
    ? `<div class="project-divider"></div>
        <div class="project-metrics">${directMetricHTML}${indirectMetricHTML}
        </div>`
    : ''

  return `
    <div class="project-popup-wrapper" style="word-wrap: break-word; white-space: normal; overflow-wrap: anywhere; overflow: hidden;">
      <div class="project-popup-header">
        <div class="project-corner-accent top-left"></div>
        <div class="project-corner-accent top-right"></div>
        <div class="project-header-content">
          <div class="project-status-bar">
            <span class="project-badge">${t.projectGrantee}</span>
            <span class="project-indicator" style="background: ${color}"></span>
          </div>
          <h3 class="project-title" style="word-wrap: break-word; white-space: normal; overflow-wrap: anywhere;">${escapeHtml(project.project_title)}</h3>
        </div>
        <div class="project-header-line"></div>
      </div>
      <div class="project-popup-body">
        <div class="project-stat-row">
          <div class="project-stat-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <div class="project-stat-content">
            <span class="project-stat-label">${t.location}</span>
            <span class="project-stat-value" style="word-wrap: break-word; white-space: normal; overflow-wrap: anywhere;">${escapeHtml(project.country_province || t.unknownLocation)}</span>
          </div>
        </div>
        ${metricsBlock}
      </div>
      <div class="project-popup-footer">
        <div class="project-footer-glow" style="background: ${color}"></div>
      </div>
    </div>
  `
}

export interface CrewPopupTranslations {
  activeCrews: string
  inactiveCrews: string
  totalMembers: string
  countries: string
  region: string
  growthSince2022: string
}

export function buildCrewPopupHTML(crew: CrewRegionData, translations?: CrewPopupTranslations): string {
  const t = translations || {
    activeCrews: 'Active Crews',
    inactiveCrews: 'Inactive Crews',
    totalMembers: 'Total Members',
    countries: 'Countries',
    region: 'Region',
    growthSince2022: 'Growth since 2022',
  }
  const color = crew.activeCrews > 20 ? '#22c55e' : crew.activeCrews > 5 ? '#3b82f6' : '#a855f7'
  const history2022 = crew.history.find(h => h.year === 2022)
  const growth = history2022 && history2022.activeCrews > 0
    ? Math.round(((crew.activeCrews - history2022.activeCrews) / history2022.activeCrews) * 100)
    : null

  return `
    <div class="project-popup-wrapper" style="word-wrap: break-word; white-space: normal; overflow-wrap: anywhere; overflow: hidden;">
      <div class="project-popup-header">
        <div class="project-corner-accent top-left"></div>
        <div class="project-corner-accent top-right"></div>
        <div class="project-header-content">
          <div class="project-status-bar">
            <span class="project-badge">Earth Guardians Crew</span>
            <span class="project-indicator" style="background: ${color}"></span>
          </div>
          <h3 class="project-title" style="word-wrap: break-word; white-space: normal; overflow-wrap: anywhere;">${escapeHtml(crew.region)}</h3>
        </div>
        <div class="project-header-line"></div>
      </div>
      <div class="project-popup-body">
        <div class="project-stat-row">
          <div class="project-stat-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div class="project-stat-content">
            <span class="project-stat-label">${t.activeCrews}</span>
            <span class="project-stat-value">${crew.activeCrews}</span>
          </div>
        </div>
        <div class="project-stat-row">
          <div class="project-stat-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          </div>
          <div class="project-stat-content">
            <span class="project-stat-label">${t.totalMembers}</span>
            <span class="project-stat-value">${crew.totalMembers.toLocaleString()}</span>
          </div>
        </div>
        <div class="project-stat-row">
          <div class="project-stat-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <div class="project-stat-content">
            <span class="project-stat-label">${t.countries}</span>
            <span class="project-stat-value">${crew.countries}</span>
          </div>
        </div>
        ${growth !== null ? `
        <div class="project-divider"></div>
        <div class="project-metrics">
          <div class="project-metric">
            <div class="project-metric-header">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></svg>
              <span>${t.growthSince2022}</span>
            </div>
            <span class="project-metric-value direct">+${growth}%</span>
          </div>
        </div>` : ''}
      </div>
      <div class="project-popup-footer">
        <div class="project-footer-glow" style="background: ${color}"></div>
      </div>
    </div>
  `
}

export interface CrewLocationPopupTranslations {
  crewName: string
  country: string
  city: string
  region: string
}

export function buildCrewLocationPopupHTML(crew: { name: string; country: string; city: string; state: string; region: string; status?: string }, translations?: CrewLocationPopupTranslations): string {
  const t = translations || {
    crewName: 'Crew Name',
    country: 'Country',
    city: 'City',
    region: 'Region',
  }
  const location = [crew.city, crew.state, crew.country].filter(Boolean).join(', ')
  const isActive = crew.status !== 'inactive'
  const statusColor = isActive ? '#22c55e' : '#f59e0b'
  const statusLabel = isActive ? 'Active' : 'Inactive'

  return `
    <div class="project-popup-wrapper" style="word-wrap: break-word; white-space: normal; overflow-wrap: anywhere; overflow: hidden;">
      <div class="project-popup-header">
        <div class="project-corner-accent top-left"></div>
        <div class="project-corner-accent top-right"></div>
        <div class="project-header-content">
          <div class="project-status-bar">
            <span class="project-badge">Earth Guardians Crew</span>
            <span class="project-badge" style="background: ${statusColor}; color: ${isActive ? '#fff' : '#000'}; margin-left: 6px;">${statusLabel}</span>
            <span class="project-indicator" style="background: ${statusColor}"></span>
          </div>
          <h3 class="project-title" style="word-wrap: break-word; white-space: normal; overflow-wrap: anywhere;">${escapeHtml(crew.name)}</h3>
        </div>
        <div class="project-header-line"></div>
      </div>
      <div class="project-popup-body">
        <div class="project-stat-row">
          <div class="project-stat-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <div class="project-stat-content">
            <span class="project-stat-label">${t.city}</span>
            <span class="project-stat-value">${escapeHtml(location)}</span>
          </div>
        </div>
        <div class="project-stat-row">
          <div class="project-stat-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          </div>
          <div class="project-stat-content">
            <span class="project-stat-label">${t.region}</span>
            <span class="project-stat-value">${escapeHtml(crew.region)}</span>
          </div>
        </div>
      </div>
      <div class="project-popup-footer">
        <div class="project-footer-glow" style="background: ${statusColor}"></div>
      </div>
    </div>
  `
}

export function buildSpeciesPopupHTML(species: Species, translations?: SpeciesPopupTranslations, baseURL?: string): string {
  const color = GROUP_COLORS[species.taxonomicGroup] ?? '#B64032'
  const endangerment = species.endangerment ?? 'Unknown'
  const endangermentColor = endangerment.toLowerCase().includes('critical') ? '#dc2626' : 
                            endangerment.toLowerCase().includes('endangered') ? '#ea580c' : '#d97706'
  const t = translations || {
    scientificName: 'Scientific Name',
    threatTypes: 'Threat Types',
    population: 'Population',
    habitat: 'Habitat',
    region: 'Region',
    ecosystem: 'Ecosystem'
  }
  const groupLabel = t.groupLabels?.[species.taxonomicGroup] ?? species.taxonomicGroup
  
  let imageHTML = ''
  if (species.imageUrl) {
    let thumbUrl = species.imageUrl
    const isLocal = !species.imageUrl.startsWith('http://') && !species.imageUrl.startsWith('https://')
    if (isLocal) {
      const filename = species.imageUrl.replace(/^\//, '')
      const basename = filename.split('/').pop() || filename
      const name = basename.replace(/\.[^.]+$/, '')
      const prefix = baseURL && baseURL !== '/' ? baseURL : '/'
      thumbUrl = `${prefix}images/species/thumb/${name}_full.webp`
    } else if (species.imageUrl.includes('commons.wikimedia.org/wiki/Special:FilePath/')) {
      const filename = species.imageUrl.split('/Special:FilePath/')[1]
      if (filename) {
        thumbUrl = `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(filename)}?width=560`
      }
    } else if (species.imageUrl.includes('upload.wikimedia.org')) {
      const separator = species.imageUrl.includes('?') ? '&' : '?'
      thumbUrl = `${species.imageUrl}${separator}width=560`
    }
    
    imageHTML = `
      <div class="species-image-frame" style="border-color: ${color}55;">
        <img src="${escapeHtml(thumbUrl)}" alt="${escapeHtml(species.commonName)}" class="species-image" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.parentElement.style.display='none'" />
      </div>
    `
  }

  return `
    <div class="species-popup-wrapper" style="word-wrap: break-word; white-space: normal; overflow: hidden;">
      ${imageHTML}
      <div class="species-header" style="border-bottom-color: ${color}40;">
        <div class="species-header-bg" style="background: ${color}08;"></div>
        <div class="species-ornament top">
          <svg width="60" height="12" viewBox="0 0 60 12">
            <path d="M0 6 L15 6 L20 2 L25 10 L30 4 L35 8 L40 6 L60 6" stroke="${color}" fill="none" stroke-width="1" opacity="0.6"/>
          </svg>
        </div>
        <div class="species-badges">
          <span class="species-category-badge" style="background: ${color};">${escapeHtml(species.category)}</span>
          <span class="species-group-badge" style="border-color: ${color}; color: ${color};">${escapeHtml(groupLabel)}</span>
        </div>
        <h3 class="species-common-name" style="word-wrap: break-word; white-space: normal;">${escapeHtml(species.commonName)}</h3>
        <p class="species-scientific-name" style="word-wrap: break-word; white-space: normal;">${escapeHtml(species.scientificName)}</p>
        <div class="species-ornament bottom">
          <svg width="40" height="8" viewBox="0 0 40 8">
            <circle cx="4" cy="4" r="2" fill="${color}" opacity="0.8"/>
            <circle cx="12" cy="4" r="1.5" fill="${color}" opacity="0.5"/>
            <circle cx="20" cy="4" r="2" fill="${color}" opacity="0.8"/>
            <circle cx="28" cy="4" r="1.5" fill="${color}" opacity="0.5"/>
            <circle cx="36" cy="4" r="2" fill="${color}" opacity="0.8"/>
          </svg>
        </div>
      </div>
      <div class="species-body">
        <p class="species-description" style="word-wrap: break-word; white-space: normal;">${escapeHtml(species.description ?? '')}</p>
        <div class="species-details">
          <div class="species-detail-row">
            <div class="species-detail-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div class="species-detail-content">
              <span class="species-detail-label">${t.threatTypes}</span>
              <span class="species-detail-value">${(species.threatTypes ?? []).map(threat => `<span class="species-threat-tag">${escapeHtml(threat)}</span>`).join('')}</span>
            </div>
          </div>
          <div class="species-detail-row">
            <div class="species-detail-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            </div>
            <div class="species-detail-content">
              <span class="species-detail-label">${t.region}</span>
              <span class="species-detail-value" style="word-wrap: break-word; white-space: normal;">${escapeHtml(species.region)}</span>
            </div>
          </div>
          <div class="species-detail-row">
            <div class="species-detail-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            <div class="species-detail-content">
              <span class="species-detail-label">${t.ecosystem}</span>
              <span class="species-detail-value" style="word-wrap: break-word; white-space: normal;">${escapeHtml(species.ecosystem)}</span>
            </div>
          </div>
          <div class="species-detail-row endangerment">
            <div class="species-detail-icon" style="color: ${endangermentColor};">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <div class="species-detail-content">
              <span class="species-detail-label">${t.habitat}</span>
              <span class="species-detail-value endangerment-value" style="color: ${endangermentColor};">${escapeHtml(species.endangerment ?? 'Unknown')}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="species-footer">
        <div class="species-footer-line" style="background: rgba(128, 128, 128, 0.3);"></div>
      </div>
    </div>
  `
}

export function isValidCoordinate(lat: number | undefined | null, lng: number | undefined | null): boolean {
  if (lat == null || lng == null) return false
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && isFinite(lat) && isFinite(lng)
}

export function getGroupColor(taxonomicGroup: string): string {
  return GROUP_COLORS[taxonomicGroup] ?? '#B64032'
}

export function generateCurvedPath(from: [number, number], to: [number, number]): [number, number] {
  const midX = (from[0] + to[0]) / 2
  const midY = (from[1] + to[1]) / 2
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const perpX = -dy
  const perpY = dx
  const length = Math.sqrt(perpX * perpX + perpY * perpY) || 1
  const normalizedPerpX = perpX / length
  const normalizedPerpY = perpY / length
  const distance = Math.sqrt(dx * dx + dy * dy)
  const seed = (from[0] * 1000 + from[1] + to[0] * 100 + to[1]) % 1000 / 1000
  const randomFactor = 0.1 + seed * 0.1
  const distanceFactor = Math.min(1, distance / 50)
  const curveFactor = Math.min(distance * randomFactor * distanceFactor, 25)
  return [midX + normalizedPerpX * curveFactor, midY + normalizedPerpY * curveFactor]
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

// ── Rare Earth popup constants ──
export const RARE_EARTH_CATEGORIES: Record<string, { label: string; color: string }> = {
  direct_ree: { label: 'Terras Raras Diretas', color: '#e74c3c' },
  carbonatite_associated: { label: 'Carbonatito/Alcalino', color: '#f39c12' },
  pegmatite_associated: { label: 'Pegmatito', color: '#27ae60' },
  heavy_mineral_associated: { label: 'Minerais Pesados', color: '#2980b9' },
  phosphate_associated: { label: 'Fosfato', color: '#8e44ad' },
  strategic_associated: { label: 'Estrategicos', color: '#e91e63' },
}

export const RARE_EARTH_PHASES: Record<string, { label: string; shortLabel: string; color: string }> = {
  REQUERIMENTO: { label: 'Requerimento', shortLabel: 'REQ', color: '#9ca3af' },
  'REQUERIMENTO DE PESQUISA': { label: 'Requerimento de Pesquisa', shortLabel: 'REQ', color: '#9ca3af' },
  'AUTORIZACAO DE PESQUISA': { label: 'Autorizacao de Pesquisa', shortLabel: 'AUTH', color: '#f59e0b' },
  DISPONIBILIDADE: { label: 'Disponibilidade', shortLabel: 'AVAIL', color: '#ea580c' },
  LICENCIAMENTO: { label: 'Licenciamento', shortLabel: 'LICEN', color: '#dc2626' },
  CONCESSAO: { label: 'Concessao', shortLabel: 'CONC', color: '#b91c1c' },
  LAVRA: { label: 'Lavra', shortLabel: 'LAVRA', color: '#7f1d1d' },
}

export function getPhaseShortLabel(phase: string): string {
  return RARE_EARTH_PHASES[phase]?.shortLabel ?? phase?.slice(0, 5) ?? '?'
}

export function getPhaseColor(phase: string): string {
  return RARE_EARTH_PHASES[phase]?.color ?? '#666'
}

export function getCategoryColor(cat: string): string {
  return RARE_EARTH_CATEGORIES[cat]?.color ?? '#666'
}

export const isMilitaryInterest = _isMilitaryInterest
export const isHighEnvRisk = _isHighEnvRisk
export function isSuspicious(props: Record<string, unknown>, speculator?: SpeculatorIndexEntry | null): boolean {
  return isSuspiciousBasic(props, speculator ?? null)
}

/** Properties expected on a rare-earth GeoJSON feature for popup rendering. */
interface REEPopupProps {
  c?: string; ds?: number; a?: number; mil?: boolean; env?: boolean; sus?: boolean
  u?: string; p?: string; n?: string; s?: string; f?: string; y?: number
  la?: number; lo?: number; ev?: string; net?: string; ano?: number
  [key: string]: unknown
}

export function buildRareEarthPopupHTML(props: REEPopupProps): string {
  const cat = RARE_EARTH_CATEGORIES[props.c ?? ''] ?? { label: props.c || 'Unknown', color: '#666' }
  const dangerColor = (props.ds ?? 5) >= 8 ? '#e74c3c' : (props.ds ?? 5) >= 6 ? '#f39c12' : '#27ae60'
  const areaHa = Number(props.a ?? 0)
  const area = areaHa >= 10000 ? `${(areaHa / 1000).toFixed(0)}K ha` : `${areaHa.toLocaleString()} ha`

  const milFlag = props.mil !== false && isMilitaryInterest(props.u || '')
  const envFlag = props.env !== false && isHighEnvRisk(props as unknown as Record<string, unknown>)
  const susFlag = props.sus !== false && isSuspicious(props as unknown as Record<string, unknown>)

  const flagsHTML = [milFlag ? '<span style="font-size:7px;padding:1px 5px;border-radius:2px;font-weight:700;background:rgba(231,76,60,0.2);color:#e74c3c">MIL</span>' : '',
    envFlag ? '<span style="font-size:7px;padding:1px 5px;border-radius:2px;font-weight:700;background:rgba(39,174,96,0.2);color:#27ae60">ENV</span>' : '',
    susFlag ? '<span style="font-size:7px;padding:1px 5px;border-radius:2px;font-weight:700;background:rgba(142,68,173,0.2);color:#8e44ad">SUS</span>' : '',
  ].filter(Boolean).join('')

  const anmUrl = buildAnmVerifyUrl(props.p, props.ano ?? props.y)
  const mailtoUrl = buildClaimReportMailtoUrl({
    processo: props.p,
    nome: props.n,
    lat: props.la,
    lng: props.lo,
    uf: props.u,
    subs: props.s,
  })

  const anmLink = anmUrl
    ? `<a href="${escapeHtml(anmUrl)}" target="_blank" rel="noopener" style="flex:1;display:inline-flex;align-items:center;justify-content:center;gap:4px;font-size:9px;font-weight:700;padding:5px 8px;border-radius:4px;text-decoration:none;letter-spacing:0.04em;border:1px solid rgba(52,152,219,0.3);background:rgba(52,152,219,0.10);color:#5dade2">↗ Verify on ANM</a>`
    : ''
  const reportLink = `<a href="${escapeHtml(mailtoUrl)}" style="flex:1;display:inline-flex;align-items:center;justify-content:center;gap:4px;font-size:9px;font-weight:700;padding:5px 8px;border-radius:4px;text-decoration:none;letter-spacing:0.04em;border:1px solid rgba(231,76,60,0.25);background:rgba(231,76,60,0.08);color:#e74c3c">⚑ Report issue</a>`

  const lastEvent = props.ev
  let lastEventHTML = ''
  if (lastEvent) {
    const refYear = Number(props.ano ?? props.y ?? 0)
    const currentYear = new Date().getFullYear()
    const ageYears = refYear ? Math.max(0, currentYear - refYear) : 99
    const evColor = ageYears < 1 ? '#27ae60' : ageYears <= 3 ? '#f39c12' : '#e74c3c'
    const evLabel = ageYears < 1 ? 'Recent' : ageYears <= 3 ? 'Active' : 'Stale'
    lastEventHTML = `<div style="margin-top:7px;padding-top:7px;border-top:1px solid rgba(255,255,255,0.05)">
      <div style="font-size:7.5px;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:0.08em;font-weight:600;margin-bottom:2px">Last event</div>
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
        <span style="font-size:9.5px;color:#ccc;line-height:1.4;flex:1;word-wrap:break-word">${escapeHtml(lastEvent)}</span>
        <span style="font-size:7.5px;padding:1px 6px;border-radius:2px;font-weight:700;background:${evColor}22;color:${evColor}">${evLabel}</span>
      </div>
    </div>`
  }

  const overlaps: Array<{ name: string; kind: string; distance_km: number }> = Array.isArray(props.ov) ? props.ov : []
  let overlapHTML = ''
  if (overlaps.length) {
    const items = overlaps.slice(0, 3).map(o =>
      `<span style="display:inline-flex;align-items:center;gap:3px;font-size:8px;padding:1px 5px;border-radius:2px;background:rgba(231,76,60,0.18);color:#ff6b6b;font-weight:600;margin:1px">⚠ ${escapeHtml(o.name)}${o.distance_km ? ` <span style="opacity:0.7;font-weight:400">· ${o.distance_km}km</span>` : ''}</span>`
    ).join('')
    const more = overlaps.length > 3 ? `<span style="font-size:8px;color:#888;margin-left:4px">+${overlaps.length - 3} more</span>` : ''
    overlapHTML = `<div style="margin-top:7px;padding-top:7px;border-top:1px solid rgba(255,255,255,0.05)">
      <div style="font-size:7.5px;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:0.08em;font-weight:600;margin-bottom:3px">Overlaps</div>
      <div style="display:flex;align-items:center;flex-wrap:wrap;gap:0">${items}${more}</div>
    </div>`
  }

  return `
    <div class="ree-popup-wrapper" style="word-wrap:break-word;white-space:normal;overflow:hidden;min-width:250px;position:relative">
      <!-- Corner accents -->
      <div style="position:absolute;top:8px;left:8px;width:10px;height:10px;border-top:2px solid ${cat.color}60;border-left:2px solid ${cat.color}60;pointer-events:none;z-index:1" />
      <div style="position:absolute;top:8px;right:8px;width:10px;height:10px;border-top:2px solid ${cat.color}60;border-right:2px solid ${cat.color}60;pointer-events:none;z-index:1" />

      <!-- Header -->
      <div style="padding:14px 14px 10px;position:relative">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;flex-wrap:wrap">
          <span style="display:inline-flex;align-items:center;gap:4px;font-size:8px;font-weight:700;padding:2px 8px;border-radius:3px;background:${cat.color};color:#fff;letter-spacing:0.06em;text-transform:uppercase">${escapeHtml(cat.label)}</span>
          <span style="display:inline-flex;align-items:center;gap:3px;font-size:8px;font-weight:700;padding:2px 8px;border-radius:3px;background:${dangerColor};color:#fff">${(props.ds ?? 5).toFixed(1)} Danger</span>
          ${props.net ? `<span style="font-size:7px;padding:2px 6px;border-radius:2px;font-weight:600;background:rgba(41,128,185,0.2);color:#5dade2;letter-spacing:0.03em">${escapeHtml(props.net)}</span>` : ''}
          ${flagsHTML}
        </div>
        <h3 style="margin:0;font-size:13px;font-weight:700;color:#e8e8e8;line-height:1.35;letter-spacing:0.01em;word-wrap:break-word">${escapeHtml(props.n || 'Unknown')}</h3>
        <div style="font-size:10px;color:rgba(255,255,255,0.35);margin-top:2px;font-style:italic">${escapeHtml(props.s || '—')}</div>
      </div>

      <!-- Divider -->
      <div style="height:1px;background:linear-gradient(90deg,transparent,${cat.color}30,transparent);margin:0 12px" />

      <!-- Body -->
      <div style="padding:10px 14px 12px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px 14px">
          <div><div style="font-size:7.5px;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:0.08em;font-weight:600">Process</div><div style="font-size:10.5px;color:#ccc;font-weight:500;word-wrap:break-word">${escapeHtml(props.p || '—')}</div></div>
          <div><div style="font-size:7.5px;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:0.08em;font-weight:600">Phase</div><div style="font-size:10.5px;color:#ccc;font-weight:500">${escapeHtml(props.f || '—')}</div></div>
          <div><div style="font-size:7.5px;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:0.08em;font-weight:600">UF</div><div style="font-size:10.5px;color:#ccc;font-weight:500">${escapeHtml(props.u || '—')}</div></div>
          <div><div style="font-size:7.5px;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:0.08em;font-weight:600">Area</div><div style="font-size:10.5px;color:#ccc;font-weight:500">${area}</div></div>
        </div>
        <div style="margin-top:7px;padding-top:7px;border-top:1px solid rgba(255,255,255,0.05)">
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-size:7.5px;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:0.08em;font-weight:600">Danger Level</span>
            <div style="flex:1;height:4px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden">
              <div style="height:100%;width:${Math.min(100, (props.ds ?? 5) * 10)}%;background:${dangerColor};border-radius:2px;box-shadow:0 0 4px ${dangerColor}"></div>
            </div>
            <span style="font-size:10px;font-weight:700;color:${dangerColor};min-width:24px;text-align:right">${(props.ds ?? 5).toFixed(1)}</span>
          </div>
        </div>
        ${lastEventHTML}
        ${overlapHTML}
      </div>

      <!-- Footer actions -->
      <div style="display:flex;gap:6px;padding:8px 14px 12px;border-top:1px solid rgba(255,255,255,0.06)">
        ${anmLink}
        ${reportLink}
      </div>

      <!-- Footer glow bar -->
      <div style="height:2px;background:linear-gradient(90deg,transparent 0%,${cat.color} 50%,transparent 100%);opacity:0.5;box-shadow:0 0 6px ${cat.color}40" />
    </div>`
}

export function escapeHtml(text: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
  return text.replace(/[&<>"']/g, c => map[c])
}
```

---

## 2. `/home/ubuntu/EG-Maps/lib/map-effects.ts` (459 lines)

```typescript
import type { Map as MapLibreMap } from 'maplibre-gl'
import type { Feature, LineString } from 'geojson'
import type { ProjectData, Species } from './types'
import { getProjectColorByBeneficiaries } from './colors'
import { GROUP_COLORS, generateCurvedPath, isValidCoordinate } from './map-utils'

function pickRandomIndex(length: number): number {
  return Math.floor(Math.random() * length)
}

export type DatasetKey = 'project-grants' | 'endangered-species' | 'observatory-of-vulcan'

export interface ConnectionProperties {
  color: string
  opacity: number
  weight: number
  dataset: DatasetKey
  group?: string
}

export type MapConnectionFeature = Feature<LineString, ConnectionProperties>

const CONNECTION_SOURCE_ID = 'connections-source'
const CONNECTION_GLOW_LAYER_ID = 'connections-glow-layer'
const CONNECTION_LAYER_ID = 'connections-layer'

interface BuildConnectionOptions {
  dataset: DatasetKey
  projects?: ProjectData[]
  species?: Species[]
  isMobile: boolean
}

export function buildMapConnectionFeatures({
  dataset,
  projects = [],
  species = [],
  isMobile,
}: BuildConnectionOptions): MapConnectionFeature[] {
  return dataset === 'project-grants'
    ? buildProjectConnectionFeatures(projects, isMobile)
    : buildSpeciesConnectionFeatures(species, isMobile)
}

function buildProjectConnectionFeatures(projects: ProjectData[], isMobile: boolean): MapConnectionFeature[] {
  const maxConnectionsPerProject = 1
  const projectsToProcess = isMobile ? projects.slice(0, Math.min(15, projects.length)) : projects
  const incomingCountByProject = new Map<string, number>()
  const edgeKeys = new Set<string>()
  const features: MapConnectionFeature[] = []

  projectsToProcess.forEach((project) => {
    if (!isValidCoordinate(project.latitude, project.longitude)) return

    const projectKey = project.project_title
    const color = getProjectColorByBeneficiaries(project.direct_beneficiaries, project.indirect_beneficiaries)

    const availableTargets = projectsToProcess
      .filter(p =>
        p.project_title !== project.project_title &&
        isValidCoordinate(p.latitude, p.longitude) &&
        !edgeKeys.has([projectKey, p.project_title].sort().join('::')) &&
        (incomingCountByProject.get(p.project_title) ?? 0) < 1 &&
        getProjectColorByBeneficiaries(p.direct_beneficiaries, p.indirect_beneficiaries) === color
      )

    const connectionsToMake = Math.min(maxConnectionsPerProject, availableTargets.length)

    for (let i = 0; i < connectionsToMake; i++) {
      if (!availableTargets.length) continue
      const targetIndex = pickRandomIndex(availableTargets.length)
      const target = availableTargets.splice(targetIndex, 1)[0]
      if (!target) continue

      features.push(createConnectionFeature({
        from: [project.longitude, project.latitude],
        to: [target.longitude, target.latitude],
        color,
        opacity: 0.2,
        weight: 1.55,
        dataset: 'project-grants',
      }))

      const targetKey = target.project_title
      edgeKeys.add([projectKey, targetKey].sort().join('::'))
      incomingCountByProject.set(targetKey, (incomingCountByProject.get(targetKey) ?? 0) + 1)
    }
  })

  return features
}

function buildSpeciesConnectionFeatures(species: Species[], isMobile: boolean): MapConnectionFeature[] {
  const maxConnectionsPerSpecies = 1
  const speciesToProcess = isMobile ? species.slice(0, Math.min(50, species.length)) : species
  const incomingCountByGroup = new Map<string, Map<string, number>>()
  const edgeKeys = new Set<string>()
  const features: MapConnectionFeature[] = []

  speciesToProcess.forEach((source) => {
    if (!isValidCoordinate(source.lat, source.lng)) return

    const group = source.taxonomicGroup
    if (!incomingCountByGroup.has(group)) {
      incomingCountByGroup.set(group, new Map())
    }
    const incomingCount = incomingCountByGroup.get(group)!
    const sourceKey = source.id || source.commonName
    const color = GROUP_COLORS[group] ?? '#B64032'

    const availableTargets = speciesToProcess
      .filter(target => {
        const targetKey = target.id || target.commonName
        const normalizedEdgeKey = [sourceKey, targetKey].sort().join('::')
        return targetKey !== sourceKey &&
          target.taxonomicGroup === group &&
          isValidCoordinate(target.lat, target.lng) &&
          !edgeKeys.has(normalizedEdgeKey) &&
          (incomingCount.get(targetKey) ?? 0) < (isMobile ? 1 : 2)
      })

    const connectionsToMake = Math.min(maxConnectionsPerSpecies, availableTargets.length)

    for (let i = 0; i < connectionsToMake; i++) {
      if (!availableTargets.length) continue
      const targetIndex = pickRandomIndex(availableTargets.length)
      const target = availableTargets.splice(targetIndex, 1)[0]
      if (!target) continue

      features.push(createConnectionFeature({
        from: [source.lng, source.lat],
        to: [target.lng, target.lat],
        color,
        opacity: 0.2,
        weight: 1.55,
        dataset: 'endangered-species',
        group,
      }))

      const targetKey = target.id || target.commonName
      edgeKeys.add([sourceKey, targetKey].sort().join('::'))
      incomingCount.set(targetKey, (incomingCount.get(targetKey) ?? 0) + 1)
    }
  })

  return features
}

function createConnectionFeature({
  from,
  to,
  color,
  opacity,
  weight,
  dataset,
  group,
}: {
  from: [number, number]
  to: [number, number]
  color: string
  opacity: number
  weight: number
  dataset: DatasetKey
  group?: string
}): MapConnectionFeature {
  return {
    type: 'Feature',
    properties: {
      color,
      opacity,
      weight,
      dataset,
      ...(group ? { group } : {}),
    },
    geometry: {
      type: 'LineString',
      coordinates: [
        from,
        generateCurvedPath(from, to),
        to,
      ],
    },
  }
}

export function syncMapConnectionLayers(map: MapLibreMap, features: MapConnectionFeature[]) {
  removeMapConnectionLayers(map)

  if (features.length === 0) return

  if (!map.isStyleLoaded()) return

  map.addSource(CONNECTION_SOURCE_ID, {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features,
    },
  })

  map.addLayer({
    id: CONNECTION_GLOW_LAYER_ID,
    type: 'line',
    source: CONNECTION_SOURCE_ID,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': ['get', 'color'],
      'line-width': ['*', ['get', 'weight'], 4],
      'line-opacity': ['*', ['get', 'opacity'], 0.55],
      'line-blur': 4,
    },
  })

  map.addLayer({
    id: CONNECTION_LAYER_ID,
    type: 'line',
    source: CONNECTION_SOURCE_ID,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': ['get', 'color'],
      'line-width': ['get', 'weight'],
      'line-opacity': ['get', 'opacity'],
      'line-dasharray': [0.75, 2.5],
    },
  })
}

export function removeMapConnectionLayers(map: MapLibreMap) {
  if (map.getLayer(CONNECTION_GLOW_LAYER_ID)) map.removeLayer(CONNECTION_GLOW_LAYER_ID)
  if (map.getLayer(CONNECTION_LAYER_ID)) map.removeLayer(CONNECTION_LAYER_ID)
  if (map.getSource(CONNECTION_SOURCE_ID)) map.removeSource(CONNECTION_SOURCE_ID)
}

interface Particle {
  from: [number, number]
  control: [number, number]
  to: [number, number]
  progress: number
  speed: number
  size: number
  color: string
  group?: string
  trail: { x: number; y: number }[]
}

interface ParticleSystemOptions {
  map: MapLibreMap
  container: HTMLElement
  getFeatures: () => MapConnectionFeature[]
  isMobile: () => boolean
  zIndex?: number
}

export interface MapParticleSystem {
  start: () => void
  stop: () => void
}

export function createMapParticleSystem({
  map,
  container,
  getFeatures,
  isMobile,
  zIndex = 2,
}: ParticleSystemOptions): MapParticleSystem {
  let particleCanvas: HTMLCanvasElement | null = null
  let particleAnimationFrame: number | null = null
  let particles: Particle[] = []
  let activeGroup: string | null = null
  let groupChangeTimer: ReturnType<typeof setTimeout> | null = null
  let cancelled = false

  function stop() {
    cancelled = true
    if (particleAnimationFrame) {
      cancelAnimationFrame(particleAnimationFrame)
      particleAnimationFrame = null
    }
    if (groupChangeTimer) {
      clearTimeout(groupChangeTimer)
      groupChangeTimer = null
    }
    particles = []
    activeGroup = null
    if (particleCanvas?.parentNode) {
      particleCanvas.parentNode.removeChild(particleCanvas)
    }
    particleCanvas = null
  }

  function spawnParticle() {
    const features = getFeatures()
    const mobile = isMobile()
    if (!features.length || particles.length > (mobile ? 45 : 90)) return

    const speciesFeatures = features.filter(f => f.properties?.dataset === 'endangered-species')
    if (!speciesFeatures.length) {
      const feature = features[Math.floor(Math.random() * features.length)]
      const [from, control, to] = feature.geometry.coordinates as [number, number][]
      if (!from || !control || !to) return

      particles.push({
        from,
        control,
        to,
        progress: 0,
        speed: mobile ? 0.006 + Math.random() * 0.008 : 0.004 + Math.random() * 0.007,
        size: mobile ? 1.2 : 1.5 + Math.random() * 1.2,
        color: feature.properties?.color || '#ffffff',
        trail: [],
      })
      return
    }

    if (!activeGroup || Math.random() < 0.15) {
      const groups = [...new Set(speciesFeatures.map(f => f.properties?.group).filter(Boolean))]
      if (groups.length) {
        activeGroup = groups[Math.floor(Math.random() * groups.length)] as string
      }
    }

    const groupFeatures = activeGroup
      ? speciesFeatures.filter(f => f.properties?.group === activeGroup)
      : speciesFeatures

    if (!groupFeatures.length) return

    const feature = groupFeatures[Math.floor(Math.random() * groupFeatures.length)]
    const [from, control, to] = feature.geometry.coordinates as [number, number][]
    if (!from || !control || !to) return

    particles.push({
      from,
      control,
      to,
      progress: 0,
      speed: mobile ? 0.006 + Math.random() * 0.008 : 0.004 + Math.random() * 0.007,
      size: mobile ? 1.2 : 1.5 + Math.random() * 1.2,
      color: feature.properties?.color || '#ffffff',
      group: activeGroup || undefined,
      trail: [],
    })
  }

  function start() {
    if (!getFeatures().length) return

    stop()
    cancelled = false

    const computedPosition = window.getComputedStyle(container).position
    if (computedPosition === 'static') {
      container.style.position = 'relative'
    }

    particleCanvas = document.createElement('canvas')
    particleCanvas.className = 'map-particle-canvas'
    particleCanvas.style.position = 'absolute'
    particleCanvas.style.inset = '0'
    particleCanvas.style.width = '100%'
    particleCanvas.style.height = '100%'
    particleCanvas.style.pointerEvents = 'none'
    particleCanvas.style.zIndex = String(zIndex)
    container.appendChild(particleCanvas)

    const ctx = particleCanvas.getContext('2d')
    if (!ctx) return

    let lastFrame = 0
    const frameInterval = isMobile() ? 1000 / 24 : 1000 / 36

    const resizeCanvas = () => {
      if (!particleCanvas) return
      const dpr = window.devicePixelRatio || 1
      const rect = container.getBoundingClientRect()
      particleCanvas.width = Math.max(1, Math.floor(rect.width * dpr))
      particleCanvas.height = Math.max(1, Math.floor(rect.height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resizeCanvas()

    const animate = (timestamp: number) => {
      if (cancelled || !particleCanvas) return
      particleAnimationFrame = requestAnimationFrame(animate)
      if (timestamp - lastFrame < frameInterval) return
      lastFrame = timestamp

      const rect = container.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      if (particleCanvas.width !== Math.floor(rect.width * dpr) || particleCanvas.height !== Math.floor(rect.height * dpr)) {
        resizeCanvas()
      }

      ctx.clearRect(0, 0, rect.width, rect.height)

      const mobile = isMobile()
      const spawnAttempts = mobile ? 1 : 2
      for (let i = 0; i < spawnAttempts; i++) {
        if (Math.random() < (mobile ? 0.32 : 0.45)) spawnParticle()
      }

      particles = particles.filter((particle) => {
        particle.progress += particle.speed
        if (particle.progress >= 1) return false

        const lngLat = getBezierPoint(particle.from, particle.control, particle.to, particle.progress)
        let point
        try {
          point = map.project(lngLat)
        } catch {
          return false
        }

        const visible = point.x > -40 && point.x < rect.width + 40 && point.y > -40 && point.y < rect.height + 40
        if (!visible) return true

        particle.trail.push({ x: point.x, y: point.y })
        if (particle.trail.length > (mobile ? 4 : 7)) particle.trail.shift()

        const fade = particle.progress > 0.8 ? 1 - (particle.progress - 0.8) / 0.2 : 1
        ctx.save()
        ctx.globalAlpha = 0.75 * fade
        ctx.strokeStyle = particle.color
        ctx.lineWidth = particle.size * 0.75
        ctx.shadowColor = particle.color
        ctx.shadowBlur = mobile ? 3 : 6

        if (particle.trail.length > 1) {
          ctx.beginPath()
          ctx.moveTo(particle.trail[0].x, particle.trail[0].y)
          particle.trail.slice(1).forEach(p => ctx.lineTo(p.x, p.y))
          ctx.stroke()
        }

        ctx.globalAlpha = 0.95 * fade
        ctx.beginPath()
        ctx.arc(point.x, point.y, particle.size, 0, Math.PI * 2)
        ctx.fillStyle = particle.color
        ctx.fill()
        ctx.restore()

        return true
      })
    }

    particleAnimationFrame = requestAnimationFrame(animate)
  }

  return { start, stop }
}

function getBezierPoint(from: [number, number], control: [number, number], to: [number, number], t: number): [number, number] {
  const oneMinusT = 1 - t
  return [
    oneMinusT * oneMinusT * from[0] + 2 * oneMinusT * t * control[0] + t * t * to[0],
    oneMinusT * oneMinusT * from[1] + 2 * oneMinusT * t * control[1] + t * t * to[1],
  ]
}
```

---

## 3. `/home/ubuntu/EG-Maps/lib/enterprise-data.ts` (464 lines)

```typescript
export interface EnterpriseHQ {
  name: string
  ticker: string | null
  logoUrl: string | null
  country: string
  city: string
  lat: number
  lng: number
  description: string
  sector: string
  link: string
  subsidiaries: string[]
  shareholders: string[]
  holdings: string[]
  color: string
}

export interface CorporateConnection {
  from: string
  to: string
  type: 'shareholding' | 'joint_venture' | 'subsidiary' | 'board_overlap' | 'partnership'
  label: string
}

export interface MiningClaim {
  id: string
  enterprise: string
  claimName: string
  lat: number
  lng: number
  substance: string
  phase: 'REQUERIMENTO' | 'DISPONIBILIDADE' | 'CONCESSAO' | 'APROVEITAMENTO' | 'LICENCIAMENTO'
  uf: string
  areaHa: number
  dangerScore: number
  networkId: string
  category: string
  year: number
}

export const ENTERPRISES: EnterpriseHQ[] = [
  {
    name: 'VALE S.A.',
    ticker: 'VALE3.SA',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Vale_logo.svg/320px-Vale_logo.svg.png',
    country: 'Brazil',
    city: 'Rio de Janeiro',
    lat: -22.9542,
    lng: -43.1761,
    description: 'Brazilian multinational mining company, largest producer of iron ore and nickel',
    sector: 'Mining & Metals',
    link: 'https://vale.com',
    subsidiaries: ['Vale Base Metals', 'Vale Canada', 'Vale Indonesia'],
    shareholders: ['BNDES (6.3%)', 'Mitsui (5.1%)', 'BlackRock (4.8%)'],
    holdings: ['Salobo', 'S11D', 'Carajas', 'Sudbury'],
    color: '#d32f2f',
  },
  {
    name: 'Rio Tinto',
    ticker: 'RIO.L',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Rio_Tinto_Logo.svg/320px-Rio_Tinto_Logo.svg.png',
    country: 'UK',
    city: 'London',
    lat: 51.5074,
    lng: -0.1278,
    description: 'Anglo-Australian multinational mining group, one of the Big Three mining companies',
    sector: 'Mining & Metals',
    link: 'https://riotinto.com',
    subsidiaries: ['Rio Tinto Aluminium', 'Rio Tinto Copper', 'Rio Tinto Diamonds', 'Rio Tinto Energy & Minerals'],
    shareholders: ['BlackRock (8.3%)', 'Vanguard (5.1%)', 'HSBC (4.2%)'],
    holdings: ['Oyu Tolgoi', 'Pilbara', 'Bingham Canyon', 'Argyle', 'Simandou'],
    color: '#e63946',
  },
  {
    name: 'CBMM',
    ticker: null,
    logoUrl: null,
    country: 'Brazil',
    city: 'Araxa',
    lat: -19.5936,
    lng: -46.9419,
    description: 'Companhia Brasileira de Metalurgia e Mineracao -- world leader in niobium production',
    sector: 'Mining & Metals',
    link: 'https://cbmm.com',
    subsidiaries: ['CBMM International', 'CBMM Europe', 'CBMM Asia'],
    shareholders: ['Moreira Salles family', 'Mamori (Japanese consortium)'],
    holdings: ['Araxa Niobium Mine', 'Catalao'],
    color: '#1565c0',
  },
  {
    name: 'Serra Verde Mining',
    ticker: null,
    logoUrl: null,
    country: 'Brazil',
    city: 'Belo Horizonte',
    lat: -19.8173,
    lng: -43.9542,
    description: 'Brazilian mining company developing the Serra Verde rare earth project in Goias',
    sector: 'Rare Earth Mining',
    link: 'https://serraverderm.com',
    subsidiaries: ['Serra Verde Mineracao Ltda'],
    shareholders: ['Denham Capital', 'Vision Ridge Partners'],
    holdings: ['Serra Verde REE Project'],
    color: '#2e7d32',
  },
  {
    name: 'Viridis Mining & Minerals',
    ticker: 'VMM.AX',
    logoUrl: null,
    country: 'Australia',
    city: 'Perth',
    lat: -31.9505,
    lng: 115.8605,
    description: 'Australian mining company focused on rare earths -- flagship Colossus Project in Brazil',
    sector: 'Rare Earth Mining',
    link: 'https://viridismining.com.au',
    subsidiaries: ['Viridis Brasil Mineracao Ltda'],
    shareholders: ['Sophrosyne Capital (12.4%)', 'Board & Management (8.7%)'],
    holdings: ['Colossus Project (MG)', 'Pocinhos Project'],
    color: '#7b1fa2',
  },
  {
    name: 'Meteoric Resources',
    ticker: 'MEI.AX',
    logoUrl: null,
    country: 'Australia',
    city: 'West Perth',
    lat: -31.9485,
    lng: 115.8395,
    description: 'Australian explorer developing the Caldeira ionic clay REE project in Minas Gerais',
    sector: 'Rare Earth Mining',
    link: 'https://meteoric.com.au',
    subsidiaries: ['Meteoric Brasil Mineracao Ltda'],
    shareholders: ['Dr. Andrew Tunks (11.2%)', 'Hengtai Mining (9.8%)', 'US EXIM Bank (LOI US$250M)'],
    holdings: ['Caldeira REE Project', 'Pocos de Caldas'],
    color: '#00838f',
  },
  {
    name: 'Foxfire Metals',
    ticker: null,
    logoUrl: null,
    country: 'Australia',
    city: 'Melbourne',
    lat: -37.8136,
    lng: 144.9631,
    description: 'Australian exploration company focused on REEs, lithium and gold in the Amazon, Brazil',
    sector: 'Mining Exploration',
    link: 'https://foxfiremetals.com.au',
    subsidiaries: ['Foxfire Metals Pty Ltd', 'Foxfire Brasil Ltda'],
    shareholders: ['Board & Management', 'Private Australian investors'],
    holdings: ['Apui Region (AM)', 'Lithium Valley (MG)', 'Pocos de Caldas REE'],
    color: '#e65100',
  },
  {
    name: 'Axel REE',
    ticker: 'AXL.AX',
    logoUrl: null,
    country: 'Australia',
    city: 'Kew East',
    lat: -37.8085,
    lng: 145.0585,
    description: 'Australian REE company focused on the Caladao REE-Gallium Project in Minas Gerais',
    sector: 'Rare Earth Mining',
    link: 'https://axelreelimited.com.au',
    subsidiaries: ['Axel REE Brasil Ltda'],
    shareholders: ['Foxfire Metals (majority owner)', 'Patrick Volpe (Director)'],
    holdings: ['Caladao REE-Gallium Project'],

...26445 bytes truncated...

The tool call succeeded but the output was truncated. Full output saved to: /home/ubuntu/.local/share/opencode/tool-output/tool_f0fe76643001B295PwXu4Lneoy
Use the Task tool to have explore agent process this file with Grep and Read (with offset/limit). Do NOT read the full file yourself - delegate to save context.
```

---

## Assistant (Build · MiMo V2.5 Free · 10.6s)

_Thinking:_

I now have a comprehensive understanding of the observatory-of-vulcan page. Let me now read the UnifiedMap.vue more carefully for the observatory-specific initialization, and check the 3d.vue page more carefully, as well as the nuxt.config.ts for route configuration.

Let me also look at what the user is asking for:
1. Review and improve the whole flow of loading
2. Default map should be a minimized data load of specific zoom on Poços de Caldas Vulcan Alkaline Plateau
3. Circle of ~100km
4. Cultural map, hydrography and mining earth rare directly projects and requirements + indigenous lands, waterbodies and their info
5. Possibility for users to add details/photos updates of them monitoring all

This is quite different from what currently exists. Currently:
- The map initializes centered on central Brazil at [-48, -15] zoom 4.2
- It loads ALL rare earth data nationwide (4000+ points)
- No specific focus on Poços de Caldas
- No user-submitted content capability

Let me plan the implementation. I need to understand more about the current 3d.vue (which just redirects) and the nuxt config.

Actually, let me focus on what I need for the plan:

1. **Loading flow improvements**: The current 4-phase loading is good but loads ALL data. Need to optimize for initial fast load focused on Poços de Caldas area.

2. **Default map view**: Change from [-48, -15] zoom 4.2 to Poços de Caldas center (~[-46.77, -22.52]) zoom ~10 (for ~100km circle)

3. **Minimal data load**: Only load data within ~100km radius of Poços de Caldas initially, lazy-load rest

4. **Map layers**: Cultural map style, hydrography, mining claims, indigenous lands, waterbodies

5. **User contributions**: Ability to add details/photos/monitoring updates

Let me check the UnifiedMap for how map styles are configured and look at the nuxt config.

Let me check a few more critical files for the plan.

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/ubuntu/EG-Maps/nuxt.config.ts"
}
```

**Output:**
```
<path>/home/ubuntu/EG-Maps/nuxt.config.ts</path>
<type>file</type>
<content>
1: // https://nuxt.com/docs/api/configuration/nuxt-config
2: const baseURL = process.env.NUXT_APP_BASE_URL || '/'
3: 
4: export default defineNuxtConfig({
5:   compatibilityDate: '2025-01-01',
6:   devtools: { enabled: true },
7: 
8:   modules: [
9:     '@nuxtjs/tailwindcss',
10:     '@nuxt/eslint',
11:     '@pinia/nuxt',
12:     '@nuxtjs/i18n',
13:     '@vueuse/motion/nuxt',
14:     '@vueuse/nuxt',
15:     '@nuxtjs/supabase',
16:   ],
17: 
18:   plugins: ['~/plugins/iconify-icon.client.ts', '~/plugins/command-palette.client.ts', '~/plugins/ui-init.client.ts'],
19: 
20:   // vueuse module
21:   vueuse: {
22:     ssrHandlers: true,
23:   },
24: 
25:   // i18n — keep URLs unchanged via no_prefix; the existing useI18n composable
26:   // delegates to vue-i18n's $t so we get lazy-loaded locale bundles and
27:   // proper pluralization/formatting for free.
28:   i18n: {
29:     strategy: 'no_prefix',
30:     defaultLocale: 'en',
31:     vueI18n: './i18n.config.ts',
32:     langDir: '../locales',
33:     locales: [
34:       { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
35:       { code: 'es', language: 'es-ES', name: 'Español', file: 'es.json' },
36:       { code: 'fr', language: 'fr-FR', name: 'Français', file: 'fr.json' },
37:       { code: 'pt', language: 'pt-BR', name: 'Português', file: 'pt.json' },
38:       { code: 'ar', language: 'ar-SA', name: 'العربية', file: 'ar.json' },
39:       { code: 'hi', language: 'hi-IN', name: 'हिन्दी', file: 'hi.json' },
40:       { code: 'ja', language: 'ja-JP', name: '日本語', file: 'ja.json' },
41:       { code: 'zh', language: 'zh-CN', name: '中文', file: 'zh.json' },
42:       { code: 'nl', language: 'nl-NL', name: 'Nederlands', file: 'nl.json' },
43:       { code: 'de', language: 'de-DE', name: 'Deutsch', file: 'de.json' },
44:     ],
45:     detectBrowserLanguage: false,
46:   },
47: 
48:   // Supabase auth redirects
49:   supabase: {
50:     redirectOptions: {
51:       login: '/eg-grants',
52:       callback: '/auth/callback',
53:       include: undefined,
54:       exclude: [],
55:     },
56:   },
57: 
58:   // SSG with prerendered HTML for all routes - enables proper GitHub Pages indexing and refresh
59:   ssr: true,
60:   routeRules: {
61:     '/**': { prerender: true },
62:     '/globe': { redirect: `${baseURL}project-grants/3d` },
63:     '/eg-grants': { prerender: false },
64:     '/auth/callback': { prerender: false },
65:   },
66: 
67:   // App configuration
68:   app: {
69:     baseURL,
70:     head: {
71:       title: 'Earth Guardians - Interactive Data Visualization',
72:       meta: [
73:         { charset: 'utf-8' },
74:         { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=5' },
75:         { name: 'description', content: 'Interactive maps for endangered species and project grants data visualization' },
76:         { name: 'theme-color', content: '#0a0a0a' },
77:         { property: 'og:type', content: 'website' },
78:         { property: 'og:site_name', content: 'Earth Guardians' },
79:       ],
80:       // Inline script to prevent flash of wrong theme - runs before page renders
81:       script: [
82:         {
83:           innerHTML: `(function() {
84:             try {
85:               var saved = localStorage.getItem('darkMode');
86:               if (saved === 'true' || saved === null) {
87:                 document.documentElement.classList.add('dark');
88:               }
89:             } catch (e) {}
90:           })();`,
91:           type: 'text/javascript',
92:           tagPosition: 'head',
93:         },
94:       ],
95:       link: [
96:         { rel: 'icon', type: 'image/png', href: `${baseURL}eg-logo.png` },
97:         { rel: 'manifest', href: `${baseURL}manifest.json` },
98:         { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
99:         { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
100:       ],
101:     },
102:   },
103: 
104:   // Runtime config for API keys + analytics
105:   runtimeConfig: {
106:     public: {
107:       maptilerApiKey: process.env.NUXT_PUBLIC_MAPTILER_API_KEY || process.env.MAPTILER_API_KEY || '',
108:       // Set NUXT_PUBLIC_PLAUSIBLE_DOMAIN to enable Plausible analytics.
109:       // Example: 'eg-maps.example.org'
110:       plausibleDomain: process.env.NUXT_PUBLIC_PLAUSIBLE_DOMAIN || '',
111:     },
112:   },
113: 
114:   // CSS - only MapLibre
115:   css: ['~/assets/css/main.css', 'maplibre-gl/dist/maplibre-gl.css'],
116: 
117:   // Build settings
118:   typescript: {
119:     strict: true,
120:     typeCheck: true,
121:     shim: false,
122:   },
123: 
124:   // Nitro (static output)
125:   nitro: {
126:     preset: 'static',
127:     prerender: {
128:       crawlLinks: true,
129:       routes: ['/', '/globe', '/info', '/project-grants', '/project-grants/3d', '/endangered-species', '/endangered-species/3d', '/observatory-of-vulcan', '/observatory-of-vulcan/3d', '/active-crews', '/active-crews/3d'],
130:       ignore: ['/EG-Maps/manifest.json'],
131:     },
132:     compressPublicAssets: true,
133:   },
134: 
135:   experimental: {
136:     appManifest: false,
137:   },
138: 
139:   // Vite config for MapLibre + WSL HMR
140:   vite: {
141:     optimizeDeps: {
142:       include: ['maplibre-gl'],
143:     },
144:     server: {
145:       hmr: {
146:         protocol: 'ws',
147:         host: 'localhost',
148:       },
149:       watch: {
150:         ignored: ['**/node_modules/**', '**/.git/**', '**/*[*]*/**'],
151:       },
152:     },
153:   },
154: 
155:   vue: {
156:     compilerOptions: {
157:       isCustomElement: (tag) => tag === 'iconify-icon',
158:     },
159:   },
160: });

(End of file - total 160 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/ubuntu/EG-Maps/components/UnifiedMap.vue",
  "limit": 120
}
```

**Output:**
```
<path>/home/ubuntu/EG-Maps/components/UnifiedMap.vue</path>
<type>file</type>
<content>
1: <template>
2:   <div class="w-full h-[100svh] relative overflow-hidden bg-black" role="main" aria-label="Interactive Map Visualization">
3:     <!-- Loading skeleton -->
4:     <Transition name="fade">
5:       <div v-if="isLoading" class="absolute inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center">
6:         <div class="relative mb-5 xs:mb-6">
7:           <div class="w-16 xs:w-20 h-16 xs:h-20 rounded-full border-4 border-white/20 border-t-white animate-spin" />
8:           <div class="absolute inset-0 w-16 xs:w-20 h-16 xs:h-20 rounded-full border-4 border-white/10 border-b-white/50 animate-spin" style="animation-delay: 0.5s; animation-direction: reverse" />
9:         </div>
10:         <p class="text-white font-medium mb-1.5 xs:mb-2 text-sm xs:text-base">{{ t('general.loading') }}</p>
11:         <p class="text-gray-500 text-xs xs:text-sm">{{ t('globe.preparingData', { dataset: activeDataset === 'project-grants' ? t('home.projectGrants').toLowerCase() : activeDataset === 'endangered-species' ? t('home.species').toLowerCase() : t('home.observatoryOfVulcan').toLowerCase() }) }}</p>
12:         <div class="mt-3 xs:mt-4 flex gap-1">
13:           <div class="w-2 h-2 rounded-full bg-white/50 animate-bounce stagger-1" />
14:           <div class="w-2 h-2 rounded-full bg-white/50 animate-bounce stagger-2" />
15:           <div class="w-2 h-2 rounded-full bg-white/50 animate-bounce stagger-3" />
16:         </div>
17:       </div>
18:     </Transition>
19: 
20:     <!-- Background effects -->
21:     <div class="absolute inset-0 bg-black/5 dark:bg-white/5 pointer-events-none" :style="{ zIndex: 'var(--z-map-effects)' }" />
22: 
23:     <!-- Grid overlay with image-set for 2x resolution -->
24:     <div
25:       class="absolute inset-0 pointer-events-none opacity-[0.03]"
26:       :style="{
27:         zIndex: 'calc(var(--z-map-effects) + 1)',
28:         backgroundImage: `image-set(url(${baseURL}grid-overlay.png) 1x, url(${baseURL}grid-overlay.png) 2x)`,
29:         backgroundRepeat: 'repeat',
30:       }"
31:     />
32: 
33:     <!-- Noise overlay with image-set for 2x resolution -->
34:     <div
35:       class="absolute inset-0 pointer-events-none opacity-[0.02] animate-noise-bg"
36:       :style="{
37:         zIndex: 'calc(var(--z-map-effects) + 2)',
38:         backgroundImage: `image-set(url(${baseURL}noise.png) 1x, url(${baseURL}noise.png) 2x)`,
39:         backgroundRepeat: 'repeat',
40:       }"
41:     />
42: 
43:     <!-- Scanline overlay with image-set for 2x resolution -->
44:     <div
45:       aria-hidden="true"
46:       class="absolute inset-0 pointer-events-none opacity-[0.015]"
47:       :style="{
48:         zIndex: 'calc(var(--z-map-effects) + 3)',
49:         backgroundImage: `image-set(url(${baseURL}scanline.gif) 1x, url(${baseURL}scanline.gif) 2x)`,
50:         backgroundRepeat: 'repeat',
51:       }"
52:     />
53: 
54:     <!-- Vignette -->
55:     <div aria-hidden="true" class="absolute inset-0 pointer-events-none" :style="{ zIndex: 'var(--z-map-overlays)',     boxShadow: 'inset 0 0 clamp(30px, 8vw, 100px) clamp(5px, 2vw, 15px) rgba(0,0,0,0.5)' }" />
56: 
57:     <!-- Hex grid overlay -->
58:     <canvas v-if="showHexGrid" ref="hexCanvasRef" aria-hidden="true" class="absolute inset-0 w-full h-full pointer-events-none opacity-20" :style="{ zIndex: 'var(--z-map-hex-grid)' }" />
59: 
60:     <!-- Animated background elements -->
61:     <div aria-hidden="true" class="absolute inset-0 overflow-hidden pointer-events-none" :style="{ zIndex: 'var(--z-map-effects)' }">
62:       <div :class="`absolute top-0 left-0 w-full h-full ${isMobile ? 'opacity-5' : 'opacity-10'}`">
63:         <div class="absolute top-0 left-0 w-1/3 h-1/3 bg-cyan-500/20 blur-3xl animate-pulse-slow" />
64:         <template v-if="!isMobile">
65:           <div class="absolute bottom-0 right-0 w-1/3 h-1/3 bg-purple-500/20 blur-3xl animate-pulse-slow-delay" />
66:           <div class="absolute top-1/2 right-1/4 w-1/4 h-1/4 bg-pink-500/20 blur-3xl animate-pulse-slow-delay-2" />
67:         </template>
68:       </div>
69:     </div>
70: 
71:     <!-- Earth Guardians Banner - Mobile optimized -->
72:     <div v-if="isMobile" class="absolute top-2 left-1/2 -translate-x-1/2 pointer-events-none px-2 sm:px-3" :style="{ zIndex: 'var(--z-map-banner)' }">
73:       <img :src="`${baseURL}white-banner.png`" alt="Earth Guardians" class="h-auto w-auto max-h-[10vh] xs:max-h-[12vh] max-w-[clamp(10rem,24vw,16rem)] object-contain" loading="lazy" />
74:     </div>
75:     <div v-else class="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none hidden lg:block" :style="{ zIndex: 'var(--z-map-banner)' }">
76:       <img :src="`${baseURL}white-banner.png`" alt="Earth Guardians" class="h-auto w-auto max-h-[15vh] max-w-[clamp(10rem,24vw,16rem)] -rotate-90 origin-center" loading="lazy" />
77:     </div>
78: 
79:     <!-- Map Container -->
80:     <div ref="mapContainerRef" class="absolute inset-0 w-full h-full" :style="{ zIndex: 'var(--z-map-base)' }" />
81: 
82:     <!-- Custom overlays slot (used by observatory-of-vulcan) -->
83:     <slot name="overlays" />
84: 
85:     <!-- Project filter panel -->
86:     <ProjectFilterPanel
87:       v-if="activeDataset === 'project-grants' && showFilterPanel"
88:       :projects="projectsData"
89:       @filter-change="handleProjectFilterChange"
90:     />
91: 
92:     <!-- Species filter panel (for endangered species) -->
93:     <SpeciesFilterPanel
94:       v-if="activeDataset === 'endangered-species' && showFilterPanel"
95:       ref="speciesFilterPanelRef"
96:       :species="speciesData"
97:       @filter-change="handleFilterChange"
98:       @group-selection-change="handleSpeciesGroupSelection"
99:       @close="showFilterPanel = false"
100:     />
101: 
102:     <!-- Data Bubble: species groups or project stats -->
103:     <DataBubble
104:       :mode="activeDataset === 'endangered-species' ? 'species' : 'projects'"
105:       :selected-groups="selectedSpeciesGroups"
106:       :projects="visibleProjects"
107:       position-top="clamp(16rem, 40vh, 22rem)"
108:       @toggle-group="toggleLegendGroup"
109:     />
110: 
111:     <!-- Map Controls -->
112:     <MapControls
113:       :is-globe-view="false"
114:       :show-hex-grid="showHexGrid"
115:       :show-connections="showConnections2D"
116:       :dataset="activeDataset"
117:       :projects="activeDataset === 'project-grants' ? visibleProjects : undefined"
118:       :species="activeDataset === 'endangered-species' ? speciesIndexData : undefined"
119:       :filter-open="showFilterPanel"
120:       @toggle-hex-grid="showHexGrid = !showHexGrid"

(Showing lines 1-120 of 1555. Use offset=121 to continue.)
</content>
```

---

## Assistant (Build · MiMo V2.5 Free · 9.2s)

_Thinking:_

Let me read more of the UnifiedMap script section to understand how the observatory map is initialized.

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/ubuntu/EG-Maps/components/UnifiedMap.vue",
  "offset": 121,
  "limit": 200
}
```

**Output:**
```
<path>/home/ubuntu/EG-Maps/components/UnifiedMap.vue</path>
<type>file</type>
<content>
121:       @toggle-connections="toggleConnections2D"
122:       @toggle-filter="showFilterPanel = !showFilterPanel"
123:       @search-open-change="handleSearchOpenChange"
124:       @navigate="navigateToLocation"
125:       :style="{ zIndex: 'var(--z-map-ui-controls)' }"
126:     />
127: 
128:     <!-- Error state -->
129:     <Transition name="fade">
130:       <div v-if="hasError" class="absolute inset-0 bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center text-white z-[var(--z-map-error-overlay)]">
131:         <div class="relative mb-6">
132:           <div class="w-16 h-16 rounded-full bg-[var(--text-primary)]/10 animate-pulse" />
133:           <iconify-icon icon="lucide:alert-triangle" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-[var(--text-primary)]" />
134:         </div>
135:         <p class="text-gray-400 mb-4 text-center px-4 max-w-md">{{ errorMessage || t('globe.connectionError') }}</p>
136:         <button v-if="!noWebglSupport" @click="() => { hasError = false; initMap() }" class="px-6 py-2.5 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-lg font-medium hover:opacity-80 transition-all duration-300 flex items-center gap-2">
137:           <iconify-icon icon="lucide:refresh-cw" class="h-4 w-4" />
138:           {{ t('globe.tryAgain') }}
139:         </button>
140:       </div>
141:     </Transition>
142: 
143:     <!-- Detached fullscreen species popup overlay -->
144:     <div v-if="showSpeciesOverlay" ref="speciesOverlayRef" class="species-popup-overlay-fixed" role="dialog" aria-modal="true" aria-label="Species details" @click.self="closeSpeciesOverlay" @keydown.esc="closeSpeciesOverlay">
145:       <button ref="speciesCloseBtnRef" class="species-popup-close-btn-fixed" @click="closeSpeciesOverlay" aria-label="Close species details"><Icon name="lucide:x" class="h-6 w-6" /></button>
146:       <div v-if="availablePopupLocales.length > 0" class="species-popup-lang-bar">
147:         <button
148:           v-for="loc in availablePopupLocales"
149:           :key="loc"
150:           class="species-popup-lang-btn"
151:           :class="{ active: popupLocale === loc }"
152:           @click="popupLocale = loc"
153:           :aria-label="`Show in ${(localeNames as Record<string, string>)[loc] || loc}`"
154:         >{{ (localeNames as Record<string, string>)[loc] || loc }}</button>
155:       </div>
156:       <div class="species-popup-content-fixed" v-html="speciesOverlayHTML"></div>
157:     </div>
158: 
159:     <!-- Detached fullscreen project popup overlay -->
160:     <div v-if="showProjectOverlay" ref="projectOverlayRef" class="project-popup-overlay-fixed" role="dialog" aria-modal="true" aria-label="Project details" @click.self="closeProjectOverlay" @keydown.esc="closeProjectOverlay">
161:       <button ref="projectCloseBtnRef" class="project-popup-close-btn-fixed" @click="closeProjectOverlay" aria-label="Close project details"><Icon name="lucide:x" class="h-6 w-6" /></button>
162:       <div class="project-popup-content-fixed" v-html="projectOverlayHTML"></div>
163:     </div>
164: 
165:     <!-- Detached fullscreen crew popup overlay -->
166:     <div v-if="showCrewOverlay" class="project-popup-overlay-fixed" role="dialog" aria-modal="true" aria-label="Crew region details" @click.self="closeCrewOverlay" @keydown.esc="closeCrewOverlay">
167:       <button ref="crewCloseBtnRef" class="project-popup-close-btn-fixed" @click="closeCrewOverlay" aria-label="Close crew details"><Icon name="lucide:x" class="h-6 w-6" /></button>
168:       <div class="project-popup-content-fixed" v-html="crewOverlayHTML"></div>
169:     </div>
170: 
171:     <!-- Species cluster panel -->
172:     <SpeciesPanel @species-selected="handleSpeciesSelected" />
173:   </div>
174: </template>
175: 
176: <script setup lang="ts">
177: import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
178: import maplibregl from 'maplibre-gl'
179: import { useMediaQuery } from '@/composables/useMediaQuery'
180: import { useI18n } from '@/composables/useI18n'
181: import { useFocusTrap } from '@/composables/useFocusTrap'
182: import { allProjectsData } from '@/lib/project-data'
183: import type { ProjectData } from '@/lib/types'
184: import type { CrewRegionData, CrewLocation } from '@/lib/crew-data'
185: import type { Species } from '@/lib/map-utils'
186: import { buildRareEarthPopupHTML } from '@/lib/map-utils'
187: import { useToast } from '@/composables/useToast'
188: import { detectWebGLSupport } from '@/composables/useMapLibre'
189: import { useMapHexGrid } from '@/composables/useMapHexGrid'
190: import { useSpeciesPopup, useProjectPopup, useCrewPopup } from '@/composables/useMapPopup'
191: import type { SpeciesIndexItem } from '@/composables/useGeoJSONMarkers'
192: import { useRareEarthController } from '@/composables/useRareEarthController'
193: import { useSpeciesPanel } from '@/composables/useSpeciesPanel'
194: import { useMapConnections } from '@/composables/useMapConnections'
195: import { useMapMarkerOrchestrator } from '@/composables/useMapMarkerOrchestrator'
196: 
197: const { t, locale, localeNames } = useI18n()
198: const speciesPanel = useSpeciesPanel()
199: 
200: const MAPTILER_API_KEY = useRuntimeConfig().public.maptilerApiKey || ''
201: const baseURL = useRuntimeConfig().app.baseURL
202: 
203: const MAP_STYLE = MAPTILER_API_KEY
204:   ? `https://api.maptiler.com/maps/satellite/style.json?key=${MAPTILER_API_KEY}`
205:   : 'https://demotiles.maplibre.org/style.json'
206: 
207: function transformRequest(url: string, _resourceType?: string) {
208:   return { url }
209: }
210: 
211: interface Props {
212:   projects?: ProjectData[]
213:   species?: Species[]
214:   speciesIndex?: SpeciesIndexItem[]  // Lightweight index for markers
215:   defaultDataset?: 'project-grants' | 'endangered-species' | 'observatory-of-vulcan' | 'active-crews'
216:   crews?: CrewRegionData[]
217:   crewLocations?: CrewLocation[]
218:   // Rare Earth dataset (observatory-of-vulcan)
219:   rareEarthPoints?: GeoJSON.FeatureCollection
220:   rareEarthPolygons?: GeoJSON.FeatureCollection
221:   rareEarthProtected?: GeoJSON.FeatureCollection
222:   rareEarthAnalysis?: Record<string, unknown>
223:   layerVisibility?: Record<string, boolean>  // Controlled by parent for rare earth
224:   flyToTarget?: { lng: number; lat: number; zoom?: number } | null  // Parent can trigger fly-to
225: }
226: 
227: const emit = defineEmits<{ mapInit: [map: maplibregl.Map] }>()
228: 
229: const props = withDefaults(defineProps<Props>(), {
230:   defaultDataset: 'project-grants',
231: })
232: const projectsData = computed(() => props.projects || allProjectsData)
233: const crewsData = computed(() => props.crews || [])
234: const crewLocationsData = computed(() => props.crewLocations || [])
235: const speciesData = computed(() => props.species || [])
236: const speciesIndexData = computed(() => props.speciesIndex || [])
237: const filteredProjectsList = ref<ProjectData[] | null>(null)
238: const filteredSpeciesList = ref<Species[] | null>(null)
239: const visibleProjects = computed(() => filteredProjectsList.value ?? projectsData.value)
240: const visibleSpecies = computed(() => filteredSpeciesList.value ?? speciesData.value)
241: 
242: 
243: 
244: const isMobile = useMediaQuery('(max-width: 768px)')
245: const mapContainerRef = ref<HTMLDivElement | null>(null)
246: const hexCanvasRef = ref<HTMLCanvasElement | null>(null)
247: const speciesFilterPanelRef = ref<{ toggleTaxonomicGroup: (_group: string) => void } | null>(null)
248: const selectedSpeciesGroups = ref<string[]>([])
249: const showFilterPanel = ref(false)
250: const activeDataset = ref<'project-grants' | 'endangered-species' | 'observatory-of-vulcan' | 'active-crews'>(props.defaultDataset)
251: 
252: const connections2D = useMapConnections(
253:   () => map,
254:   mapContainerRef as import('vue').Ref<HTMLElement | null>,
255:   { zIndex: 2 },
256: )
257: const { showConnections: showConnections2D, toggleConnections: toggleConnections2D } = connections2D
258: const hasError = ref(false)
259: const errorMessage = ref('')
260: const noWebglSupport = ref(false)
261: const isLoading = ref(true)
262: // ── Popup composables (each handles its own state, i18n, and focus) ──
263: const speciesPopup = useSpeciesPopup(baseURL)
264: const projectPopup = useProjectPopup()
265: const crewPopup = useCrewPopup()
266: 
267: // Destructure for template binding (keeps template unchanged)
268: const {
269:   showOverlay: showSpeciesOverlay,
270:   overlayHTML: speciesOverlayHTML,
271:   popupLocale,
272:   availableLocales: availablePopupLocales,
273:   closeBtnRef: speciesCloseBtnRef,
274:   overlayRef: speciesOverlayRef,
275:   open: openSpeciesPopup,
276:   close: closeSpeciesPopup,
277:   rebuild: rebuildSpeciesPopup,
278: } = speciesPopup
279: const {
280:   showOverlay: showProjectOverlay,
281:   overlayHTML: projectOverlayHTML,
282:   closeBtnRef: projectCloseBtnRef,
283:   overlayRef: projectOverlayRef,
284:   open: openProjectPopup,
285:   close: closeProjectPopup,
286: } = projectPopup
287: const {
288:   showOverlay: showCrewOverlay,
289:   overlayHTML: crewOverlayHTML,
290:   closeBtnRef: crewCloseBtnRef,
291:   open: openCrewPopup,
292:   close: closeCrewPopup,
293: } = crewPopup
294: 
295: // ── Shared map core (i18n, species helpers, visibility, cluster logic) ──
296: 
297: // ── Hex grid composable ──
298: const hexGrid = useMapHexGrid(hexCanvasRef)
299: const { showHexGrid } = hexGrid
300: 
301: // Wrapper functions for template backward-compat
302: function openSpeciesOverlay(species: Species | SpeciesIndexItem) {
303:   lastFocusedEl = document.activeElement as HTMLElement
304:   openSpeciesPopup(species)
305: }
306: function closeSpeciesOverlay() {
307:   closeSpeciesPopup()
308:   nextTick(() => lastFocusedEl?.focus())
309: }
310: function rebuildSpeciesOverlay() { rebuildSpeciesPopup() }
311: function openProjectOverlay(project: ProjectData) {
312:   lastFocusedEl = document.activeElement as HTMLElement
313:   openProjectPopup(project)
314: }
315: function closeProjectOverlay() {
316:   closeProjectPopup()
317:   nextTick(() => lastFocusedEl?.focus())
318: }
319: function openCrewOverlay(crew: CrewRegionData) {
320:   lastFocusedEl = document.activeElement as HTMLElement

(Showing lines 121-320 of 1555. Use offset=321 to continue.)
</content>
```

**Tool: grep**

**Input:**
```json
{
  "pattern": "observatory.*center|observatory.*zoom|Pocos.*Caldas|pocos.*caldas|-22\\.5.*-46\\.7|mapStyle|maptiler.*style",
  "path": "/home/ubuntu/EG-Maps"
}
```

**Error:**
```
Ripgrep JSON record exceeded 65536 bytes
```

---

## Assistant (Build · MiMo V2.5 Free · 9.8s)

_Thinking:_

Let me search for map style and Poços de Caldas references more specifically.

**Tool: grep**

**Input:**
```json
{
  "pattern": "Pocos|pocos|Caldera|caldera|-22\\.5.*-46\\.7|observatory.*center|observatory.*init",
  "path": "/home/ubuntu/EG-Maps",
  "include": "*.vue"
}
```

**Output:**
```
No files found
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/ubuntu/EG-Maps/components/UnifiedMap.vue",
  "offset": 630,
  "limit": 200
}
```

**Output:**
```
<path>/home/ubuntu/EG-Maps/components/UnifiedMap.vue</path>
<type>file</type>
<content>
630:     }, 20000)
631: 
632:     window.addEventListener('resize', hexGrid.debouncedSetup)
633:   } catch (err) {
634:     // eslint-disable-next-line no-console
635:     console.error('[UnifiedMap] Failed to initialize map:', err)
636:     isLoading.value = false
637:     hasError.value = true
638:   }
639: }
640: 
641: onMounted(() => {
642:   // eslint-disable-next-line no-console
643:   console.debug('[UnifiedMap] onMounted', { dataset: props.defaultDataset, mapContainer: !!mapContainerRef.value })
644:   showFilterPanel.value = !isMobile.value
645:   initMap()
646: })
647: 
648: watch(isMobile, (mobile) => {
649:   showFilterPanel.value = !mobile
650: })
651: 
652: watch(locale, () => {
653:   rebuildMarkers()
654: })
655: 
656: watch(crewLocationsData, () => {
657:   if (!map || activeDataset.value !== 'active-crews') return
658:   rebuildMarkers()
659: })
660: 
661: // In-place data update when filters change. Avoids the full teardown +
662: // re-setup cycle (re-fetching the species index, re-installing handlers,
663: // re-adding the source/layers) by calling setData on the existing source.
664: // Falls back to rebuildMarkers() if the GeoJSON source isn't ready yet
665: // (first paint, dataset switch, etc.).
666: watch([visibleSpecies, visibleProjects, selectedSpeciesGroups, speciesIndexData], () => {
667:   if (!map) return
668:   if (!useNativeGeoJSON) {
669:     rebuildMarkers()
670:     return
671:   }
672:   if (geoJSONInitializedFor.value) {
673:     updateGeoJSONMarkerData()
674:   } else {
675:     rebuildMarkers()
676:   }
677: }, { deep: true })
678: 
679: // Watch rare earth data changes (observatory-of-vulcan) to rebuild markers
680: watch(() => [props.rareEarthPoints, props.rareEarthPolygons], () => {
681:   if (!map || activeDataset.value !== 'observatory-of-vulcan') return
682:   setupRareEarthLayers()
683:   rebuildMarkers()
684: }, { deep: true })
685: 
686: watch(showHexGrid, async (visible) => {
687:   if (!visible) return
688:   await nextTick()
689:   hexGrid.setupHexGrid()
690: })
691: 
692: watch(connections2D.showConnections, () => {
693:   connections2D.addConnections(activeDataset.value as 'project-grants' | 'endangered-species', visibleProjects.value, visibleSpecies.value)
694:   if (connections2D.showConnections.value) connections2D.startParticles()
695: })
696: 
697: // Fly-to target from parent (for all datasets)
698: watch(() => props.flyToTarget, (target) => {
699:   if (!target || !map) return
700:   map.flyTo({
701:     center: [target.lng, target.lat],
702:     zoom: target.zoom ?? 5,
703:     duration: 1500,
704:     essential: true,
705:   })
706: }, { deep: true })
707: 
708: // Pause particles when overlay is open to save CPU
709: watch([showSpeciesOverlay, showProjectOverlay, showCrewOverlay], ([speciesOpen, projectOpen, crewOpen]) => {
710:   if (speciesOpen || projectOpen || crewOpen) {
711:     connections2D.cleanupParticles()
712:   } else if (connections2D.showConnections.value) {
713:     connections2D.startParticles()
714:   }
715: })
716: 
717: // Rebuild species overlay when popup language changes
718: watch(popupLocale, () => {
719:   if (showSpeciesOverlay.value) rebuildSpeciesOverlay()
720: })
721: 
722: onUnmounted(() => {
723:   isMounted = false
724:   connections2D.cleanup()
725:   orchestrator.cleanup()
726:   window.removeEventListener('resize', hexGrid.debouncedSetup)
727:   if (map) {
728:     map.remove()
729:     map = null
730:   }
731: })
732: </script>
733: 
734: <style>
735: .fade-enter-active,
736: .fade-leave-active {
737:   transition: opacity 0.3s ease;
738: }
739: 
740: .fade-enter-from,
741: .fade-leave-to {
742:   opacity: 0;
743: }
744: 
745: .maplibregl-popup-content {
746:   background: rgba(0, 0, 0, 0.95) !important;
747:   border-radius: clamp(0.375rem, 1vw, 0.5rem) !important;
748:   border: 1px solid rgba(6, 182, 212, 0.4) !important;
749:   box-shadow: 0 0 30px rgba(6, 182, 212, 0.2), inset 0 0 15px rgba(6, 182, 212, 0.05) !important;
750:   padding: 0 !important;
751:   min-width: clamp(14rem, 18vw, 16.25rem);
752:   max-width: calc(100vw - 2rem) !important;
753:   max-height: calc(100vh - 2rem) !important;
754:   overflow: visible !important;
755:   overflow-y: auto !important;
756:   word-wrap: break-word !important;
757:   white-space: normal !important;
758: }
759: 
760: .maplibregl-popup.cyberpunk-popup {
761:   z-index: 2147483647 !important;
762:   pointer-events: auto !important;
763: }
764: 
765: .maplibregl-popup.cyberpunk-popup .maplibregl-popup-content {
766:   width: auto !important;
767:   min-width: clamp(15rem, 22vw, 17.5rem) !important;
768:   max-width: min(35rem, calc(100vw - 2rem)) !important;
769:   max-height: calc(100vh - 3.75rem) !important;
770:   overflow-y: auto !important;
771: }
772: 
773: .maplibregl-popup-anchor-top .maplibregl-popup-tip {
774:   bottom: -10px !important;
775: }
776: 
777: .maplibregl-popup-anchor-bottom .maplibregl-popup-tip {
778:   top: -10px !important;
779: }
780: 
781: .maplibregl-marker {
782:   pointer-events: auto;
783:   z-index: 10;
784:   position: absolute !important;
785:   top: 0 !important;
786:   left: 0 !important;
787:   will-change: transform;
788: }
789: 
790: .maplibregl-popup-tip {
791:   border-top-color: rgba(6, 182, 212, 0.8) !important;
792:   border-bottom-color: rgba(6, 182, 212, 0.8) !important;
793: }
794: 
795: .maplibregl-popup-close-button {
796:   color: rgba(6, 182, 212, 0.8) !important;
797:   font-size: clamp(1rem, 1.5vw, 1.125rem) !important;
798:   padding: 0.25rem 0.5rem !important;
799:   background: transparent !important;
800:   border: none !important;
801:   top: 0.5rem !important;
802:   right: 0.5rem !important;
803: }
804: 
805: .maplibregl-popup-close-button:hover {
806:   background-color: rgba(6, 182, 212, 0.2) !important;
807:   color: rgba(6, 182, 212, 1) !important;
808: }
809: 
810: .maplibregl-ctrl-bottom-right {
811:   margin-bottom: clamp(0.375rem, 1vw, 0.5rem);
812:   margin-right: clamp(0.375rem, 1vw, 0.5rem);
813: }
814: 
815: .maplibregl-ctrl-attrib-inner {
816:   color: rgba(255, 255, 255, 0.7);
817:   font-size: clamp(0.5625rem, 0.8vw, 0.625rem);
818:   background-color: rgba(0, 0, 0, 0.6);
819:   padding: 0.125rem 0.375rem;
820:   border-radius: 0.25rem;
821: }
822: 
823: .animate-pulse-slow {
824:   animation: pulse-slow 3s ease-in-out infinite;
825: }
826: 
827: /* Project Popup Styles */
828: .project-popup-wrapper {
829:   padding: clamp(0.75rem, 2vw, 1rem);

(Showing lines 630-829 of 1555. Use offset=830 to continue.)
</content>
```

---

## Assistant (Build · MiMo V2.5 Free · 6.1s)

_Thinking:_

Now let me read the initMap section to see the observatory center and zoom.

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/ubuntu/EG-Maps/components/UnifiedMap.vue",
  "offset": 500,
  "limit": 130
}
```

**Output:**
```
<path>/home/ubuntu/EG-Maps/components/UnifiedMap.vue</path>
<type>file</type>
<content>
500:   if (map) {
501:     orchestrator.cleanup()
502:     map.remove()
503:     map = null
504:   }
505: 
506:   noWebglSupport.value = false
507:   isLoading.value = true
508: 
509:   try {
510:     const isRee = activeDataset.value === 'observatory-of-vulcan'
511:     // eslint-disable-next-line no-console
512:     console.debug('[UnifiedMap] creating maplibregl.Map', { style: MAP_STYLE.substring(0, 80), isMobile: isMobile.value })
513:     map = new maplibregl.Map({
514:       container: mapContainerRef.value,
515:       style: MAP_STYLE,
516:       zoom: isRee ? 4.2 : isMobile.value ? 1.8 : 3,
517:       center: isRee ? [-48, -15] : [0, 0],
518:       attributionControl: false,
519:       renderWorldCopies: true,
520:       minZoom: isRee ? 2.5 : isMobile.value ? 0.5 : 1.5,
521:       maxZoom: isRee ? 16 : 18,
522:       fadeDuration: 100,
523:       maxTileCacheSize: 200,
524:       maxTileCacheZoomLevels: 5,
525:       transformRequest,
526:     })
527: 
528:     map.addControl(
529:       new maplibregl.AttributionControl({
530:         customAttribution: `EARTH GUARDIANS @ ${new Date().getFullYear()}`
531:       })
532:     )
533: 
534:     if (!isMobile.value) {
535:       map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-left')
536:     }
537: 
538:     map.on('load', () => {
539:       // eslint-disable-next-line no-console
540:       console.debug('[UnifiedMap] map loaded successfully')
541:       if (!isMounted) return
542:       isLoading.value = false
543:       if (map) emit('mapInit', map)
544:       if (activeDataset.value === 'observatory-of-vulcan') {
545:         setupRareEarthLayers()
546:       }
547:       rebuildMarkers()
548:       if (activeDataset.value !== 'observatory-of-vulcan') {
549:         connections2D.addConnections(activeDataset.value as 'project-grants' | 'endangered-species', visibleProjects.value, visibleSpecies.value)
550:         connections2D.startParticles()
551:       }
552:       hexGrid.setupHexGrid()
553:     })
554: 
555:     map.on('move', () => {
556:       // Only run visibility update for DOM markers (not native GeoJSON)
557:       const usingNativeGeoJSON = useNativeGeoJSON && activeDataset.value === 'endangered-species' && speciesIndexData.value.length > 500
558:       if (!usingNativeGeoJSON && !pendingVisibilityUpdate) {
559:         pendingVisibilityUpdate = true
560:         requestAnimationFrame(() => {
561:           updateMarkerVisibility()
562:           pendingVisibilityUpdate = false
563:         })
564:       }
565:       if (!pendingClusterRebuild && map) {
566:         // Skip cluster rebuilds for GeoJSON path — MapLibre handles viewport natively
567:         if (usingNativeGeoJSON) return
568:         const currentZoom = Math.floor(map.getZoom())
569:         if (orchestrator.mapCore.shouldRebuildClusters(map, currentZoom, orchestrator.lastClusterZoom, orchestrator.lastBboxCenter)) {
570:           pendingClusterRebuild = true
571:           requestAnimationFrame(() => {
572:             rebuildMarkers()
573:             pendingClusterRebuild = false
574:           })
575:         }
576:       }
577:     })
578: 
579:     map.on('moveend', () => {
580:       updateMarkerVisibility()
581:       if (map) {
582:         const currentZoom = Math.floor(map.getZoom())
583:         if (orchestrator.mapCore.shouldRebuildClusters(map, currentZoom, orchestrator.lastClusterZoom, orchestrator.lastBboxCenter)) {
584:           rebuildMarkers()
585:         }
586:       }
587:     })
588: 
589:     map.on('resize', () => {
590:       hexGrid.debouncedSetup()
591:     })
592: 
593:     let errorCount = 0
594:     let usedFallback = false
595: 
596:     map.on('error', (err) => {
597:       // eslint-disable-next-line no-console
598:       console.error('[UnifiedMap] MapLibre error:', err)
599:       errorCount++
600:       if (!usedFallback && errorCount >= 2 && MAP_STYLE.includes('maptiler.com')) {
601:         usedFallback = true
602:         // eslint-disable-next-line no-console
603:         console.warn('MapTiler style failed, falling back to demotiles style')
604:         map!.setStyle('https://demotiles.maplibre.org/style.json')
605:         return
606:       }
607:       if (!map?.loaded()) {
608:         isLoading.value = false
609:         hasError.value = true
610:         const errObj = err as { error?: { status?: number; message?: string } }
611:         if (errObj?.error?.status === 403) {
612:           errorMessage.value = 'MapTiler API key is invalid or restricted. Please update your API key in the .env file.'
613:         } else if (errObj?.error?.message) {
614:           errorMessage.value = errObj.error.message
615:         } else {
616:           errorMessage.value = 'Failed to load map tiles. Please check your network connection and try again.'
617:         }
618:       }
619:     })
620: 
621:     // Timeout fallback — show error instead of silently hiding loading
622:     setTimeout(() => {
623:       if (isLoading.value) {
624:         isLoading.value = false
625:         if (!hasError.value) {
626:           hasError.value = true
627:           errorMessage.value = 'Map tiles took too long to load. Please check your network connection and try again.'
628:         }
629:       }

(Showing lines 500-629 of 1555. Use offset=630 to continue.)
</content>
```

---

## Assistant (Build · MiMo V2.5 Free · 52.0s)

_Thinking:_

Now I have a complete understanding of the codebase. Let me also check the composable useRareEarthLayers.ts to understand the layer setup, and useRareEarthController.ts.

Now let me check the key composables for rare earth layers and the Supabase setup.

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/ubuntu/EG-Maps/composables/useRareEarthController.ts"
}
```

**Output:**
```
<path>/home/ubuntu/EG-Maps/composables/useRareEarthController.ts</path>
<type>file</type>
<content>
1: import { watch, onScopeDispose, type Ref } from 'vue'
2: import type { Map as MapLibreMap } from 'maplibre-gl'
3: import maplibregl from 'maplibre-gl'
4: import {
5:   setupRareEarthLayers as setupRareEarthLayersInternal,
6:   syncRareEarthLayerVisibility as syncRareEarthLayerVisibilityInternal,
7:   addPolygonLayersToMap,
8: } from '@/composables/useRareEarthLayers'
9: import { buildEnterpriseNetworkLines } from '@/lib/enterprise-data'
10: 
11: export interface RareEarthControllerProps {
12:   rareEarthPoints?: GeoJSON.FeatureCollection
13:   rareEarthPolygons?: GeoJSON.FeatureCollection
14:   rareEarthProtected?: GeoJSON.FeatureCollection
15:   layerVisibility?: Record<string, boolean>
16:   flyToTarget?: { lng: number; lat: number; zoom?: number } | null
17: }
18: 
19: export interface RareEarthPopupConfig {
20:   t: (_key: string, _params?: Record<string, unknown>) => string
21:   locale: { value: string }
22:   onSidebarOpen?: (_payload: { processo: string; nome: string; tab: string; coords: [number, number] }) => void
23: }
24: 
25: export interface RareEarthControllerOptions {
26:   /** Map instance (null until ready) */
27:   map: Ref<MapLibreMap | null>
28:   /** True when REE dataset is active (drives whether watchers do anything) */
29:   isActive: Ref<boolean> | (() => boolean)
30:   /** Reactive props getter (so watchers re-fire when upstream changes) */
31:   getProps: () => RareEarthControllerProps
32:   /** Popup configuration for i18n-aware popup rendering */
33:   popup?: RareEarthPopupConfig
34: }
35: 
36: /**
37:  * Owns the Rare Earth Observatory layers, watchers, and fly-to highlight marker
38:  * for a MapLibre map instance. Encapsulates what was previously inlined in
39:  * UnifiedMap.vue so the parent component stays focused on general map wiring.
40:  *
41:  * All watchers gate on `isActive` so the watchers do not fire work for unrelated
42:  * datasets. Cleanup is registered via `onScopeDispose` so the lifecycle is
43:  * tied to the parent effect scope (component or composable).
44:  */
45: export function useRareEarthController(options: RareEarthControllerOptions) {
46:   const { map, isActive, getProps } = options
47:   const isActiveGetter = typeof isActive === 'function' ? isActive : () => isActive.value
48: 
49:   let flyToHighlightMarker: maplibregl.Marker | null = null
50:   let flyToHighlightTimer: ReturnType<typeof setTimeout> | null = null
51: 
52:   function addFlyToHighlight(lng: number, lat: number) {
53:     const m = map.value
54:     if (!m) return
55:     if (flyToHighlightTimer) clearTimeout(flyToHighlightTimer)
56:     if (flyToHighlightMarker) { flyToHighlightMarker.remove(); flyToHighlightMarker = null }
57: 
58:     const el = document.createElement('div')
59:     el.style.width = '40px'
60:     el.style.height = '40px'
61:     el.style.borderRadius = '50%'
62:     el.style.background = 'rgba(231,76,60,0.15)'
63:     el.style.border = '2px solid rgba(231,76,60,0.6)'
64:     el.style.boxShadow = '0 0 20px rgba(231,76,60,0.3), inset 0 0 12px rgba(231,76,60,0.15)'
65:     el.style.animation = 'flyto-pulse 1.5s ease-out 3'
66:     el.style.pointerEvents = 'none'
67: 
68:     flyToHighlightMarker = new maplibregl.Marker({ element: el, anchor: 'center' })
69:       .setLngLat([lng, lat])
70:       .addTo(m)
71: 
72:     flyToHighlightTimer = setTimeout(() => {
73:       if (flyToHighlightMarker) { flyToHighlightMarker.remove(); flyToHighlightMarker = null }
74:       flyToHighlightTimer = null
75:     }, 5000)
76:   }
77: 
78:   function setupLayers() {
79:     const m = map.value
80:     if (!m) return
81:     const p = getProps()
82:     if (!p.rareEarthPoints) return
83: 
84:     setupRareEarthLayersInternal(m, {
85:       points: p.rareEarthPoints,
86:       polys: p.rareEarthPolygons ?? null,
87:       protected: p.rareEarthProtected ?? null,
88:       networkFeatures: buildEnterpriseNetworkLines(p.rareEarthPoints),
89:       popup: options.popup,
90:     })
91:     syncRareEarthLayerVisibilityInternal(m, p.layerVisibility || {})
92:   }
93: 
94:   // Watcher: layer visibility toggles (parent-driven state)
95:   const stopVisWatch = watch(
96:     () => getProps().layerVisibility,
97:     () => {
98:       if (!isActiveGetter()) return
99:       const m = map.value
100:       if (!m) return
101:       syncRareEarthLayerVisibilityInternal(m, getProps().layerVisibility || {})
102:     },
103:     { deep: true },
104:   )
105: 
106:   // Watcher: points data updates (e.g. from search filtering)
107:   // Debounced to avoid rapid setData calls during fast filter changes
108:   let pointsDebounceTimer: ReturnType<typeof setTimeout> | null = null
109:   const stopPointsWatch = watch(
110:     () => getProps().rareEarthPoints,
111:     (newVal) => {
112:       if (!isActiveGetter() || !newVal || !map.value || !map.value.isStyleLoaded()) return
113:       if (pointsDebounceTimer) clearTimeout(pointsDebounceTimer)
114:       pointsDebounceTimer = setTimeout(() => {
115:         try {
116:           const src = map.value?.getSource('ree-points') as maplibregl.GeoJSONSource | undefined
117:           if (src && newVal) src.setData(newVal)
118:           const netFc = buildEnterpriseNetworkLines(newVal)
119:           const netSrc = map.value?.getSource('ree-network') as maplibregl.GeoJSONSource | undefined
120:           if (netSrc) netSrc.setData(netFc)
121:         } catch { /* ignore */ }
122:       }, 16) // ~1 frame debounce
123:     },
124:   )
125: 
126:   // Watcher: protected areas data updates
127:   const stopProtectedWatch = watch(
128:     () => getProps().rareEarthProtected,
129:     (newVal) => {
130:       if (!isActiveGetter() || !newVal || !map.value || !map.value.isStyleLoaded()) return
131:       try {
132:         const src = map.value.getSource('ree-protected') as maplibregl.GeoJSONSource | undefined
133:         if (src) src.setData(newVal)
134:       } catch { /* ignore */ }
135:     },
136:   )
137: 
138:   // Watcher: polygon data updates (loads after points, needs late layer setup)
139:   let polyCleanup: (() => void) | null = null
140:   let polysAdded = false
141:   const stopPolygonsWatch = watch(
142:     () => getProps().rareEarthPolygons,
143:     (newVal) => {
144:       if (!isActiveGetter() || !map.value || !map.value.isStyleLoaded()) return
145:       if (!newVal || polysAdded) return
146:       const cleanup = addPolygonLayersToMap(map.value, newVal, options.popup)
147:       if (cleanup) {
148:         polyCleanup = cleanup
149:         polysAdded = true
150:       }
151:     },
152:   )
153: 
154:   // Watcher: fly-to target from parent
155:   const stopFlyToWatch = watch(
156:     () => getProps().flyToTarget,
157:     (target) => {
158:       if (!target) return
159:       const m = map.value
160:       if (!m) return
161:       m.flyTo({ center: [target.lng, target.lat], zoom: target.zoom ?? 9, duration: 1500 })
162:       m.once('moveend', () => addFlyToHighlight(target.lng, target.lat))
163:     },
164:   )
165: 
166:   onScopeDispose(() => {
167:     stopVisWatch()
168:     stopPointsWatch()
169:     stopProtectedWatch()
170:     stopPolygonsWatch()
171:     stopFlyToWatch()
172:     if (pointsDebounceTimer) clearTimeout(pointsDebounceTimer)
173:     if (flyToHighlightTimer) clearTimeout(flyToHighlightTimer)
174:     if (flyToHighlightMarker) { flyToHighlightMarker.remove(); flyToHighlightMarker = null }
175:     if (polyCleanup) { polyCleanup(); polyCleanup = null }
176:   })
177: 
178:   return { setupLayers, addFlyToHighlight }
179: }

(End of file - total 179 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/ubuntu/EG-Maps/composables/useRareEarthLayers.ts",
  "limit": 80
}
```

**Output:**
```
<path>/home/ubuntu/EG-Maps/composables/useRareEarthLayers.ts</path>
<type>file</type>
<content>
1: import type { Map as MapLibreMap, MapLayerMouseEvent, DataDrivenPropertyValueSpecification } from 'maplibre-gl'
2: import maplibregl from 'maplibre-gl'
3: import { buildRareEarthPopupHTML, escapeHtml } from '@/lib/map-utils'
4: import { openRareEarthPopup } from '@/composables/useObservatoryPopup'
5: import { citiesToGeoJSON } from '@/lib/brazilian-cities'
6: 
7: export const REE_SOURCE_POINTS = 'ree-points'
8: export const REE_SOURCE_POLYS = 'ree-polys'
9: export const REE_SOURCE_GEO = 'ree-geo'
10: export const REE_SOURCE_SITES = 'ree-sites'
11: export const REE_SOURCE_NETWORK = 'ree-network'
12: export const REE_SOURCE_PROTECTED = 'ree-protected'
13: export const REE_SOURCE_CITIES = 'ree-cities'
14: 
15: export const REE_LAYER_IDS = [
16:   'ree-point-circle', 'ree-cluster-circle', 'ree-cluster-count', 'ree-point-hover',
17:   'ree-heat-layer',
18:   'ree-poly-fill', 'ree-poly-glow', 'ree-poly-line', 'ree-poly-label',
19:   'ree-geo-fill', 'ree-geo-aquifer', 'ree-geo-conflict', 'ree-geo-line', 'ree-geo-label',
20:   'ree-site-glow', 'ree-site-label',
21:   'ree-network-lines',
22:   'ree-protected-ti-fill', 'ree-protected-ti-line', 'ree-protected-ti-label',
23:   'ree-protected-quilombo-fill', 'ree-protected-quilombo-line', 'ree-protected-quilombo-label',
24:   'ree-cities-label',
25:   'ree-overlap-glow',
26: ] as const
27: 
28: export const REE_SOURCE_IDS = [
29:   REE_SOURCE_POINTS, REE_SOURCE_POLYS, REE_SOURCE_GEO,
30:   REE_SOURCE_SITES, REE_SOURCE_NETWORK, REE_SOURCE_PROTECTED,
31:   REE_SOURCE_CITIES,
32: ] as const
33: 
34: export interface RareEarthLayerOptions {
35:   points: GeoJSON.FeatureCollection
36:   polys?: GeoJSON.FeatureCollection | null
37:   protected?: GeoJSON.FeatureCollection | null
38:   networkFeatures?: GeoJSON.FeatureCollection | null
39:   onClaimClick?: (_props: Record<string, unknown>, _lngLat: [number, number]) => void
40:   popup?: {
41:     t: (_key: string, _params?: Record<string, unknown>) => string
42:     locale: { value: string }
43:     onSidebarOpen?: (_payload: { processo: string; nome: string; tab: string; coords: [number, number] }) => void
44:   }
45: }
46: 
47: export type CleanupFn = () => void
48: 
49: function safeRemoveLayer(map: MapLibreMap, id: string) {
50:   try { if (map.getLayer(id)) map.removeLayer(id) } catch { /* */ }
51: }
52: function safeRemoveSource(map: MapLibreMap, id: string) {
53:   try { if (map.getSource(id)) map.removeSource(id) } catch { /* */ }
54: }
55: 
56: export function cleanupRareEarthLayers(map: MapLibreMap) {
57:   REE_LAYER_IDS.forEach(id => safeRemoveLayer(map, id))
58:   REE_SOURCE_IDS.forEach(id => safeRemoveSource(map, id))
59: }
60: 
61: export function setupRareEarthLayers(
62:   map: MapLibreMap,
63:   options: RareEarthLayerOptions,
64: ): CleanupFn {
65:   const { points, polys, protected: protectedAreas } = options
66:   const cleanups: Array<() => void> = []
67:   if (!points) return () => {}
68: 
69:   cleanupRareEarthLayers(map)
70: 
71:   map.addSource(REE_SOURCE_POINTS, {
72:     type: 'geojson',
73:     data: points,
74:     cluster: true,
75:     clusterMaxZoom: 11,
76:     clusterRadius: 80,
77:     clusterProperties: {
78:       dr: ['+', ['case', ['==', ['get', 'c'], 'direct_ree'], 1, 0]],
79:       ca: ['+', ['case', ['==', ['get', 'c'], 'carbonatite_associated'], 1, 0]],
80:       pg: ['+', ['case', ['==', ['get', 'c'], 'pegmatite_associated'], 1, 0]],

(Showing lines 1-80 of 833. Use offset=81 to continue.)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/ubuntu/EG-Maps/composables/useRareEarthData.ts"
}
```

**Output:**
```
<path>/home/ubuntu/EG-Maps/composables/useRareEarthData.ts</path>
<type>file</type>
<content>
1: import { shallowRef, ref, computed } from 'vue'
2: import { computeSpeculatorIndex, type RareEarthFeature, type RareEarthFeatureCollection, type SpeculatorIndexEntry } from '@/lib/observatory-analysis'
3: 
4: export interface RareEarthFeatureSummary {
5:   p: string
6:   n: string
7:   s: string
8:   c: string
9:   f: string
10:   u: string
11:   a: number
12:   ds: number
13:   net: string
14:   y: number
15:   lo: number
16:   la: number
17:   ov: Array<{ name: string; kind: string; distance_km: number }> | null
18:   dsprocesso: string
19: }
20: 
21: export interface DeepAnalysis {
22:   last_sync?: string
23:   data_source?: string
24:   sync_frequency?: string
25:   sync_url?: string
26:   suspicious_speculators_count?: number
27:   sigilo_stats?: { total: number; pct: number; total_area_ha: number }
28:   military_critical?: { total_claims: number; total_area_ha: number; us_connected_claims: number; us_connected_area_ha: number }
29:   [k: string]: unknown
30: }
31: 
32: export type LoadPhase = 'idle' | 'points' | 'overlaps' | 'polygons' | 'protected' | 'complete'
33: 
34: export function useRareEarthData(baseURL: string) {
35:   const pointsData = shallowRef<RareEarthFeatureCollection | undefined>(undefined)
36:   const polygonsData = shallowRef<RareEarthFeatureCollection | undefined>(undefined)
37:   const protectedData = shallowRef<RareEarthFeatureCollection | undefined>(undefined)
38:   const features = ref<RareEarthFeatureSummary[]>([])
39:   const deepAnalysis = shallowRef<DeepAnalysis | undefined>(undefined)
40:   const isLoading = ref(false)
41:   const loadPhase = ref<LoadPhase>('idle')
42:   const loadProgress = ref(0)
43:   const error = ref<Error | null>(null)
44:   let overlapsByProcesso: Record<string, Array<{ name: string; kind: string; distance_km: number }>> = {}
45: 
46:   function transformPoints(pointsGJ: RareEarthFeatureCollection): RareEarthFeatureSummary[] {
47:     return pointsGJ.features.map((f: RareEarthFeature) => {
48:       const p = f.properties
49:       return {
50:         p: String(p.processo ?? ''),
51:         n: String(p.nome ?? ''),
52:         s: String(p.subs ?? ''),
53:         c: String(p.category ?? ''),
54:         f: String(p.fase ?? ''),
55:         u: String(p.uf ?? ''),
56:         a: Number(p.area_ha ?? 0),
57:         ds: Number(p.danger_score ?? 0),
58:         net: String(p.network_id ?? ''),
59:         y: Number(p.ano ?? 0),
60:         lo: ((f.geometry as GeoJSON.Point)?.coordinates?.[0] as number) ?? 0,
61:         la: ((f.geometry as GeoJSON.Point)?.coordinates?.[1] as number) ?? 0,
62:         ov: overlapsByProcesso[String(p.processo ?? '')] || null,
63:         dsprocesso: String(p.dsprocesso ?? ''),
64:       }
65:     })
66:   }
67: 
68:   async function load() {
69:     if (isLoading.value) return
70:     isLoading.value = true
71:     loadPhase.value = 'points'
72:     loadProgress.value = 0
73:     error.value = null
74:     try {
75:       // Phase 1: Load points immediately (critical for map display)
76:       const pointsRes = await fetch(`${baseURL}data/rare-earth/points.geojson`)
77:       if (!pointsRes.ok) throw new Error('Failed to load points')
78:       const pointsGJ = (await pointsRes.json()) as RareEarthFeatureCollection
79:       features.value = transformPoints(pointsGJ)
80:       pointsData.value = pointsGJ
81:       loadProgress.value = 20
82: 
83:       // Defer remaining loads until after first paint
84:       await new Promise(resolve => requestAnimationFrame(resolve))
85:       await new Promise(resolve => setTimeout(resolve, 0))
86: 
87:       // Phase 2: Load overlaps (needed for popup enrichment)
88:       loadPhase.value = 'overlaps'
89:       loadProgress.value = 30
90:       const overlapsRes = await fetch(`${baseURL}data/rare-earth/points_with_overlaps.geojson`).catch(() => null)
91:       if (overlapsRes && overlapsRes.ok) {
92:         const overlapsGJ = await overlapsRes.json()
93:         overlapsByProcesso = {}
94:         for (const f of overlapsGJ.features) {
95:           const proc = (f.properties as Record<string, unknown>)?.processo
96:           if (proc && Array.isArray((f.properties as Record<string, unknown>).overlaps) && ((f.properties as Record<string, unknown>).overlaps as unknown[]).length) {
97:             overlapsByProcesso[proc as string] = (f.properties as Record<string, unknown>).overlaps as Array<{ name: string; kind: string; distance_km: number }>
98:           }
99:         }
100:         // Re-enrich features with overlap data
101:         features.value = features.value.map(f => ({
102:           ...f,
103:           ov: overlapsByProcesso[f.p] || null,
104:         }))
105:       }
106: 
107:       // Phase 3: Load polygons (heavy, for polygon layers)
108:       loadProgress.value = 50
109:       const polysRes = await fetch(`${baseURL}data/rare-earth/polygons.geojson`).catch(() => null)
110:       if (polysRes && polysRes.ok) {
111:         polygonsData.value = await polysRes.json()
112:       }
113: 
114:       await new Promise(resolve => setTimeout(resolve, 0))
115: 
116:       // Phase 4: Load protected areas + deep analysis
117:       loadPhase.value = 'protected'
118:       loadProgress.value = 70
119:       const [protectedRes, analysisRes] = await Promise.all([
120:         fetch(`${baseURL}data/rare-earth/protected-areas.geojson`).catch(() => null),
121:         fetch(`${baseURL}data/rare-earth/deep_analysis.json`).catch(() => null),
122:       ])
123:       loadProgress.value = 90
124: 
125:       if (protectedRes && protectedRes.ok) protectedData.value = await protectedRes.json()
126:       if (analysisRes && analysisRes.ok) deepAnalysis.value = await analysisRes.json()
127: 
128:       loadPhase.value = 'complete'
129:       loadProgress.value = 100
130:     } catch (e) {
131:       error.value = e instanceof Error ? e : new Error(String(e))
132:     } finally {
133:       isLoading.value = false
134:     }
135:   }
136: 
137:   const speculatorIndex = computed<SpeculatorIndexEntry[]>(() =>
138:     pointsData.value ? computeSpeculatorIndex(pointsData.value) : [],
139:   )
140: 
141:   return {
142:     pointsData,
143:     polygonsData,
144:     protectedData,
145:     features,
146:     speculatorIndex,
147:     deepAnalysis,
148:     isLoading,
149:     loadPhase,
150:     loadProgress,
151:     error,
152:     load,
153:   }
154: }

(End of file - total 154 lines)
</content>
```

---

## Assistant (Build · MiMo V2.5 Free · 8.3s)

_Thinking:_

Now I have a comprehensive understanding of the entire observatory-of-vulcan page and its data flow. Let me also check if there's a Supabase setup for user contributions, and look at the useUserPin composable to understand the existing user interaction pattern.

Let me now check the Supabase configuration and any existing user contribution features.

Let me check a few more things about Supabase and user contribution capabilities.

**Tool: grep**

**Input:**
```json
{
  "path": "/home/ubuntu/EG-Maps",
  "pattern": "supabase|Supabase",
  "include": "*.ts"
}
```

**Output:**
```
Found 7 matches
/home/ubuntu/EG-Maps/composables/useSupabaseAuth.ts:
  Line 1: export function useSupabaseAuth() {

  Line 2:   const client = useSupabaseClient()

  Line 3:   const user = useSupabaseUser()


/home/ubuntu/EG-Maps/composables/useGrants.ts:
  Line 27:   const client = useSupabaseClient()


/home/ubuntu/EG-Maps/nuxt.config.ts:
  Line 15:     '@nuxtjs/supabase',

  Line 48:   // Supabase auth redirects

  Line 49:   supabase: {

```

**Tool: glob**

**Input:**
```json
{
  "pattern": "**/useDataDownload*"
}
```

**Output:**
```
/home/ubuntu/EG-Maps/composables/useDataDownload.ts
```

**Tool: grep**

**Input:**
```json
{
  "path": "/home/ubuntu/EG-Maps",
  "pattern": "comment|photo|upload|contribution|monitoring|update.*data|user.*data",
  "include": "*.vue"
}
```

**Output:**
```
No files found
```

---

## Assistant (Build · MiMo V2.5 Free · 6.0s)

_Thinking:_

Now I have a complete picture. Let me check the existing useGrants.ts to see the Supabase table pattern used in the project.

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/ubuntu/EG-Maps/composables/useGrants.ts"
}
```

**Output:**
```
<path>/home/ubuntu/EG-Maps/composables/useGrants.ts</path>
<type>file</type>
<content>
1: export interface GrantInput {
2:   title: string
3:   description: string
4:   location_name: string
5:   latitude: number | null
6:   longitude: number | null
7:   category: string
8: }
9: 
10: export interface GrantRecord {
11:   id: string
12:   title: string
13:   description: string
14:   location_name: string
15:   latitude: number
16:   longitude: number
17:   category: string
18:   status: string
19:   submitted_by: string
20:   reviewed_by: string | null
21:   reviewed_at: string | null
22:   rejection_reason: string | null
23:   created_at: string
24: }
25: 
26: export function useGrants() {
27:   const client = useSupabaseClient()
28: 
29:   async function listGrants(status?: string): Promise<{ grants: GrantRecord[]; error?: string }> {
30:     try {
31:       const url = status ? `grants-list?status=${encodeURIComponent(status)}` : 'grants-list'
32:       const { data, error } = await client.functions.invoke(url)
33: 
34:       if (error) return { grants: [], error: error.message }
35:       return { grants: (data as { grants?: GrantRecord[] })?.grants ?? [] }
36:     } catch (e: unknown) {
37:       return { grants: [], error: e instanceof Error ? e.message : 'Failed to load grants' }
38:     }
39:   }
40: 
41:   async function submitGrant(input: GrantInput): Promise<{ grant?: GrantRecord; error?: string }> {
42:     try {
43:       const { data, error } = await client.functions.invoke('grants-submit', {
44:         body: input,
45:       })
46: 
47:       if (error) return { error: error.message }
48:       return { grant: (data as { grant?: GrantRecord })?.grant }
49:     } catch (e: unknown) {
50:       return { error: e instanceof Error ? e.message : 'Failed to submit grant' }
51:     }
52:   }
53: 
54:   async function reviewGrant(grantId: string, decision: 'approved' | 'rejected', notes?: string): Promise<{ error?: string }> {
55:     try {
56:       const { error } = await client.functions.invoke('grants-review', {
57:         body: { grant_id: grantId, decision, notes },
58:       })
59: 
60:       if (error) return { error: error.message }
61:       return {}
62:     } catch (e: unknown) {
63:       return { error: e instanceof Error ? e.message : 'Failed to review grant' }
64:     }
65:   }
66: 
67:   async function getStats(): Promise<{ pending: number; approved: number; rejected: number; total: number }> {
68:     try {
69:       const { data } = await client.functions.invoke('grants-stats')
70:       return (data as { pending: number; approved: number; rejected: number; total: number }) ?? { pending: 0, approved: 0, rejected: 0, total: 0 }
71:     } catch {
72:       return { pending: 0, approved: 0, rejected: 0, total: 0 }
73:     }
74:   }
75: 
76:   return { listGrants, submitGrant, reviewGrant, getStats }
77: }

(End of file - total 77 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/ubuntu/EG-Maps/composables/useDataDownload.ts",
  "limit": 50
}
```

**Output:**
```
<path>/home/ubuntu/EG-Maps/composables/useDataDownload.ts</path>
<type>file</type>
<content>
1: import { ENTERPRISES, CORPORATE_CONNECTIONS } from '@/lib/enterprise-data'
2: import { GEOPOLITICAL_TIMELINE, MINING_PHASE_TIMELINE } from '@/lib/observatory-timeline'
3: import { RARE_EARTH_CATEGORIES } from '@/lib/map-utils'
4: 
5: export interface DownloadableDataset {
6:   id: string
7:   label: string
8:   description: string
9:   filename: string
10:   format: 'json' | 'csv' | 'geojson'
11:   getData: () => unknown
12: }
13: 
14: export const DOWNLOADABLE_DATASETS: DownloadableDataset[] = [
15:   {
16:     id: 'points-geojson',
17:     label: 'Mining Claims — Points (8.5 MB)',
18:     description: 'All 20,700 mining claim points from ANM SIGMINE. Properties: processo, numero, ano, area_ha, fase, nome, subs, uso, uf, category, category_label, dsprocesso.',
19:     filename: 'rare-earth-points',
20:     format: 'geojson',
21:     getData: () => fetchAndPackageGeoJson('/data/rare-earth/points.geojson'),
22:   },
23:   {
24:     id: 'polygons-geojson',
25:     label: 'Mining Claims — Polygons (14.6 MB)',
26:     description: 'All 20,700 mining claim polygons. UPPERCASE properties: PROCESSO, NUMERO, ANO, AREA_HA, FASE, ULT_EVENTO, NOME, SUBS, USO, UF, DSProcesso, category, category_label, lat, lon.',
27:     filename: 'rare-earth-polygons',
28:     format: 'geojson',
29:     getData: () => fetchAndPackageGeoJson('/data/rare-earth/polygons.geojson'),
30:   },
31:   {
32:     id: 'deep-analysis',
33:     label: 'Deep Analysis (5 KB)',
34:     description: 'Aggregated statistics: 437 suspicious speculators, top 10 by suspicion score, foreign claims breakdown by country, year counts 2000-2026, key events, sigilo stats, military-critical totals.',
35:     filename: 'rare-earth-deep-analysis',
36:     format: 'json',
37:     getData: () => fetchAndPackageGeoJson('/data/rare-earth/deep_analysis.json'),
38:   },
39:   {
40:     id: 'protected-areas',
41:     label: 'Protected Areas — Indigenous Lands & Quilombola Territories',
42:     description: '9 TIs (Terra Indígena) + 7 Quilombola territories + 2 Conservation Units, simplified to <50 vertices each. Source: FUNAI + INCRA + ICMBio.',
43:     filename: 'protected-areas',
44:     format: 'geojson',
45:     getData: () => fetchAndPackageGeoJson('/data/rare-earth/protected-areas.geojson'),
46:   },
47:   {
48:     id: 'enterprises',
49:     label: 'Empresas (Enterprises)',
50:     description: '16 mining & REE companies with HQ locations, shareholders, subsidiaries',

(Showing lines 1-50 of 231. Use offset=51 to continue.)
</content>
```

---

## Assistant (Build · MiMo V2.5 Free · 446.8s)

_Thinking:_

Now I have a comprehensive understanding of the entire codebase. Let me also check what MapTiler map styles are available for "cultural" maps.

Let me now summarize my findings and create a detailed plan.

## Current State Summary

### Loading Flow
1. `index.vue` renders a loading overlay with spinner + progress bar
2. `onMounted` calls `loadRareEarthData()` which fetches 4 data files sequentially:
   - `points.geojson` (Phase 1) - All ~20,700 mining claims nationwide
   - `points_with_overlaps.geojson` (Phase 2) - Overlap data
   - `polygons.geojson` (Phase 3) - Polygon boundaries (heavy)
   - `protected-areas.geojson` + `deep_analysis.json` (Phase 4) - Protected areas + analysis
3. Map initializes at `[-48, -15]` zoom 4.2 (central Brazil)
4. All data loaded before map becomes interactive

### Map Configuration
- Uses MapTiler satellite style
- Center: `[-48, -15]` (central Brazil)
- Zoom: 4.2
- No Poços de Caldas focus

### Data Size
- `points.geojson`: ~8.5 MB
- `polygons.geojson`: ~14.6 MB
- Total data: ~23+ MB loaded upfront

### User Features
- Drop pin (My Territory) via localStorage
- No user-submitted content/photos/updates
- Supabase is configured but only used for grants auth, not for user contributions

## What the User Wants

1. **Improved loading flow** - Currently loads ALL data nationwide before showing map
2. **Default map focused on Poços de Caldas** - Vulcan Alkaline Plateau area
3. **~100km circle** - Zoomed to specific area
4. **Cultural map** - Not satellite, but cultural/topographic style
5. **Hydrography** - Water bodies layer
6. **Mining claims** - Direct projects and requirements
7. **Indigenous lands** - Protected areas
8. **Waterbodies info** - Detailed info about water bodies
9. **User contributions** - Add details, photos, updates, monitoring

## Plan

### Phase 1: Optimize Default View & Loading

1. **Create a regional data subset** for Poços de Caldas (~100km radius)
   - Pre-filter `points.geojson` to only include features within ~100km of Poços de Caldas (-22.52, -46.77)
   - Create `public/data/rare-earth/pococaldas-points.geojson` (regional subset)
   - Similarly create regional subsets for polygons and overlaps
   - Keep the full dataset available for "Load all Brazil" option

2. **Change map style to cultural/topographic**
   - MapTiler has `streets-v2` or `basic-v2` style for cultural maps
   - Use `https://api.maptiler.com/maps/streets-v2/style.json` instead of satellite

3. **Set default view to Poços de Caldas**
   - Center: `[-46.77, -22.52]` (Poços de Caldas coordinates)
   - Zoom: ~10 (shows ~100km radius)
   - Add ~100km circle overlay

4. **Optimize loading phases**
   - Phase 1: Load regional points (fast, small file)
   - Phase 2: Load map layers (hydrography, indigenous lands, mining)
   - Phase 3: Lazy-load full Brazil data on demand
   - Show map immediately after Phase 1

### Phase 2: Enhanced Map Layers

5. **Hydrography layer**
   - Add water bodies from OpenStreetMap or IBGE data
   - Show rivers, lakes, reservoirs in the Poços de Caldas area
   - Click for info (name, type, area)

6. **Cultural layer**
   - Roads, cities, landmarks
   - Using MapTiler streets style as base

7. **Mining claims layer**
   - Already exists, just need to filter to regional data initially
   - Show claim boundaries, phases, substances

8. **Indigenous lands layer**
   - Already exists in protected-areas.geojson
   - Filter to regional subset

### Phase 3: User Contributions

9. **Create Supabase table for user contributions**
   - `observatory_updates` table with fields:
     - claim_processo (FK to claim)
     - user_id
     - update_type (comment/photo/status_change)
     - content (text)
     - photo_url (if photo)
     - lat/lng
     - created_at

10. **Create composable for user contributions**
    - `useObservatoryUpdates.ts`
    - CRUD operations for updates
    - Photo upload via Supabase Storage

11. **Add UI for user contributions**
    - "Add Update" button on claim popups
    - Photo upload component
    - Comments/updates feed per claim
    - "My Monitoring" panel showing user's tracked claims

### Phase 4: Monitoring Dashboard

12. **User monitoring panel**
    - List of claims user is monitoring
    - Recent updates/alerts
    - Photo timeline

Let me now write the detailed plan.

I now have a thorough understanding of the entire observatory-of-vulcan page and its data pipeline. Let me synthesize a comprehensive plan.

**Tool: question**

**Input:**
```json
{
  "questions": [
    {
      "question": "For the user contribution feature (add details/photos/updates), should this use Supabase (already configured in the project) for backend storage, or do you want a different approach?",
      "header": "Backend for contributions",
      "options": [
        {
          "label": "Supabase (Recommended)",
          "description": "Use existing Supabase setup with a new 'observatory_updates' table + Storage for photos. Auth already configured."
        },
        {
          "label": "Local-only (no backend)",
          "description": "Store user contributions in localStorage only. No persistence across devices, no sharing between users."
        },
        {
          "label": "Hybrid approach",
          "description": "localStorage for offline-first, with optional Supabase sync when online."
        }
      ],
      "multiple": false
    },
    {
      "question": "For the map style, which cultural/topographic style do you prefer as default for the Poços de Caldas view?",
      "header": "Map style",
      "options": [
        {
          "label": "MapTiler Streets (Recommended)",
          "description": "Clean streets/vectors style with roads, buildings, labels. Good for cultural context."
        },
        {
          "label": "MapTiler Basic",
          "description": "Minimal muted style, lets data layers stand out more."
        },
        {
          "label": "MapTiler Outdoor",
          "description": "Topographic with terrain shading, hiking trails. Good for geographic context."
        },
        {
          "label": "Keep satellite (current)",
          "description": "Keep the current MapTiler satellite imagery."
        }
      ],
      "multiple": false
    },
    {
      "question": "How should the 'Load all Brazil' option work after showing the regional Poços de Caldas view?",
      "header": "Full data loading",
      "options": [
        {
          "label": "Button to expand",
          "description": "Show a 'Load all Brazil' button that loads the full 20K+ points dataset on demand."
        },
        {
          "label": "Auto-expand on zoom out",
          "description": "Automatically load more data as user zooms out past a threshold."
        },
        {
          "label": "Always load full data",
          "description": "Load all data in background after initial regional view is shown."
        }
      ],
      "multiple": false
    }
  ]
}
```

**Output:**
```
User has answered your questions: "For the user contribution feature (add details/photos/updates), should this use Supabase (already configured in the project) for backend storage, or do you want a different approach?"="hybryd approuch, localstorage for offline-first, sync when online, with debouce, to github lfs (create a new with gh repo create) for the data, synced with supabase tables of text and ref data - edge functions supabase", "For the map style, which cultural/topographic style do you prefer as default for the Poços de Caldas view?"="use this in map tiler: https://api.maptiler.com/maps/019f0fee-56db-7efd-a73d-2bd1b646bc72/style.json?key=xATXde4YYGHzf8cXJMsO Embeddable viewer
Insert the following code into your page and use this map. Embedding with an iframe is the simplest way.

  
https://api.maptiler.com/maps/019f0fee-56db-7efd-a73d-2bd1b646bc72/?key=xATXde4YYGHzf8cXJMsO#1.0/0.00000/0.00000
 iframe
Use vector style
Copy link to JSON style into Maplibre, OpenLayers or mobile SDKs.

  
https://api.maptiler.com/maps/019f0fee-56db-7efd-a73d-2bd1b646bc72/style.json?key=xATXde4YYGHzf8cXJMsO", "How should the 'Load all Brazil' option work after showing the regional Poços de Caldas view?"="Button to expand". You can now continue with the user's answers in mind.
```

---

## Assistant (Build · MiMo V2.5 Free · 65.4s)

_Thinking:_

The user wants:

1. **Hybrid approach** for contributions: localStorage offline-first, sync with Supabase tables + Edge Functions, GitHub LFS for photo data synced with Supabase
2. **Custom MapTiler style** from their specific URL: `https://api.maptiler.com/maps/019f0fee-56db-7efd-a73d-2bd1b646bc72/style.json?key=xATXde4YYGHzf8cXJMsO`
3. **Button to expand** for full Brazil data

This is a substantial plan. Let me create a comprehensive, detailed plan now.

Excellent. Now I have all the context needed. Let me compile the comprehensive plan.

**Tool: task**

**Input:**
```json
{
  "description": "Build comprehensive plan",
  "prompt": "You are helping build a detailed implementation plan for modifying an existing Nuxt 3 + Vue 3 + MapLibre GL application called EG-Maps. I need you to read the following files to verify my understanding, then write a comprehensive plan document.\n\nRead these files and report back key details:\n1. `composables/useRareEarthData.ts` - note the exact fetch URLs and data structure\n2. `composables/useRareEarthLayers.ts` lines 1-80 - note source/layer IDs\n3. `components/UnifiedMap.vue` lines 500-530 - note exact map init params for observatory\n4. `lib/observatory-analysis.ts` lines 1-30 - note type exports\n5. `composables/useUserPin.ts` - note localStorage pattern used\n6. `composables/useGrants.ts` - note Supabase Edge Function pattern\n7. `locales/en.json` - search for \"observatory\" keys, report the first 30 lines of observatory section\n8. Check if `public/data/rare-earth/points.geojson` exists and check its size (use `wc -c` on it via bash)\n\nReport ALL findings back. I need this to finalize the plan.",
  "subagent_type": "explore"
}
```

**Output:**
```
<task id="ses_0f00ff964ffeAzp0OzPQ3BNibc" state="completed">
<task_result>
Here are all findings, organized by file:

---

## 1. `composables/useRareEarthData.ts` -- Fetch URLs and Data Structure

**File:** `/home/ubuntu/EG-Maps/composables/useRareEarthData.ts` (154 lines)

**Fetch URLs (all relative to a `baseURL` parameter):**

| Phase | URL | Required? |
|-------|-----|-----------|
| Phase 1 (points) | `${baseURL}data/rare-earth/points.geojson` | Yes (throws on failure) |
| Phase 2 (overlaps) | `${baseURL}data/rare-earth/points_with_overlaps.geojson` | No (`.catch(() => null)`) |
| Phase 3 (polygons) | `${baseURL}data/rare-earth/polygons.geojson` | No |
| Phase 4 (protected) | `${baseURL}data/rare-earth/protected-areas.geojson` | No |
| Phase 4 (analysis) | `${baseURL}data/rare-earth/deep_analysis.json` | No |

**Data structures:**

- `RareEarthFeatureSummary` (the per-point shape after transform): Compact keys -- `p` (processo), `n` (nome), `s` (subs), `c` (category), `f` (fase), `u` (uf), `a` (area_ha), `ds` (danger_score), `net` (network_id), `y` (ano), `lo` (longitude), `la` (latitude), `ov` (overlaps array or null), `dsprocesso`.
- `DeepAnalysis` -- typed with optional fields: `last_sync`, `data_source`, `sync_frequency`, `sync_url`, `suspicious_speculators_count`, `sigilo_stats`, `military_critical`, plus `[k: string]: unknown` catch-all.
- `LoadPhase` -- union type: `'idle' | 'points' | 'overlaps' | 'polygons' | 'protected' | 'complete'`.
- `speculatorIndex` -- a `computed<SpeculatorIndexEntry[]>` derived from `computeSpeculatorIndex(pointsData)` imported from `observatory-analysis.ts`.

**Imports from `observatory-analysis.ts`:** `computeSpeculatorIndex`, `RareEarthFeature`, `RareEarthFeatureCollection`, `SpeculatorIndexEntry`.

---

## 2. `composables/useRareEarthLayers.ts` (lines 1-80) -- Source/Layer IDs

**File:** `/home/ubuntu/EG-Maps/composables/useRareEarthLayers.ts` (833 lines total)

**Source IDs (7 constants):**
| Constant | Value |
|----------|-------|
| `REE_SOURCE_POINTS` | `'ree-points'` |
| `REE_SOURCE_POLYS` | `'ree-polys'` |
| `REE_SOURCE_GEO` | `'ree-geo'` |
| `REE_SOURCE_SITES` | `'ree-sites'` |
| `REE_SOURCE_NETWORK` | `'ree-network'` |
| `REE_SOURCE_PROTECTED` | `'ree-protected'` |
| `REE_SOURCE_CITIES` | `'ree-cities'` |

**Layer IDs (26 in `REE_LAYER_IDS`):**
- Point layers: `ree-point-circle`, `ree-cluster-circle`, `ree-cluster-count`, `ree-point-hover`
- Heat: `ree-heat-layer`
- Polygon layers: `ree-poly-fill`, `ree-poly-glow`, `ree-poly-line`, `ree-poly-label`
- Geology layers: `ree-geo-fill`, `ree-geo-aquifer`, `ree-geo-conflict`, `ree-geo-line`, `ree-geo-label`
- Site layers: `ree-site-glow`, `ree-site-label`
- Network: `ree-network-lines`
- Protected (TI): `ree-protected-ti-fill`, `ree-protected-ti-line`, `ree-protected-ti-label`
- Protected (Quilombo): `ree-protected-quilombo-fill`, `ree-protected-quilombo-line`, `ree-protected-quilombo-label`
- Cities: `ree-cities-label`
- Overlap: `ree-overlap-glow`

**Key source config (line 71-80):** The `ree-points` source is a GeoJSON source with `cluster: true`, `clusterMaxZoom: 11`, `clusterRadius: 80`, and cluster properties `dr` (direct_ree count), `ca` (carbonatite_associated count), `pg` (pegmatite_associated count).

**Cleanup:** `cleanupRareEarthLayers(map)` iterates both `REE_LAYER_IDS` and `REE_SOURCE_IDS` using safe remove helpers.

**Imports:** Uses `openRareEarthPopup` from `useObservatoryPopup` and `citiesToGeoJSON` from `lib/brazilian-cities`.

---

## 3. `components/UnifiedMap.vue` (lines 500-530) -- Map Init for Observatory

**File:** `/home/ubuntu/EG-Maps/components/UnifiedMap.vue` (1555 lines total)

**Key init logic (lines 510-526):**

```typescript
const isRee = activeDataset.value === 'observatory-of-vulcan'
map = new maplibregl.Map({
  container: mapContainerRef.value,
  style: MAP_STYLE,
  zoom: isRee ? 4.2 : isMobile.value ? 1.8 : 3,
  center: isRee ? [-48, -15] : [0, 0],
  attributionControl: false,
  renderWorldCopies: true,
  minZoom: isRee ? 2.5 : isMobile.value ? 0.5 : 1.5,
  maxZoom: isRee ? 16 : 18,
  fadeDuration: 100,
  maxTileCacheSize: 200,
  maxTileCacheZoomLevels: 5,
  transformRequest,
})
```

**Observatory-specific params:**
- **zoom:** `4.2`
- **center:** `[-48, -15]` (central Brazil)
- **minZoom:** `2.5`
- **maxZoom:** `16`
- The map is triggered when `activeDataset.value === 'observatory-of-vulcan'`

**Cleanup (lines 500-504):** Prior to re-init, it calls `orchestrator.cleanup()` then `map.remove()`.

**Attribution:** `EARTH GUARDIANS @ ${new Date().getFullYear()}` (line 530).

---

## 4. `lib/observatory-analysis.ts` (lines 1-30) -- Type Exports

**File:** `/home/ubuntu/EG-Maps/lib/observatory-analysis.ts` (247 lines total)

**Exported interfaces:**

1. **`RareEarthFeature`** -- `{ type: 'Feature'; geometry: GeoJSON.Geometry; properties: Record<string, unknown> }`
2. **`RareEarthFeatureCollection`** -- `{ type: 'FeatureCollection'; features: RareEarthFeature[] }`
3. **`SpeculatorIndexEntry`** -- with fields: `normalizedName`, `displayName`, `count`, `totalAreaHa`, `subs` (string[]), `recentPct`, `earliestYear`, `latestYear`, `primaryPhase`, `ufs` (string[]), `suspicionScore`, `suspicionFlags` (string[]), `centroid` ({ lng, lat } | null).

**Module-level constants (lines 28-30):**
- `MILITARY_UFS` = `Set(['AM', 'AP', 'PA', 'RR', 'RO', 'MT'])` (Brazilian Amazon/military states)
- `RESEARCH_PHASES` = `Set(['REQUERIMENTO DE PESQUISA', ...])` (cut off at line 30)

---

## 5. `composables/useUserPin.ts` -- localStorage Pattern

**File:** `/home/ubuntu/EG-Maps/composables/useUserPin.ts` (126 lines)

**localStorage key:** `'egmaps.userPin.v1'` (versioned key pattern)

**Pattern details:**
- **`UserPin` interface:** `{ lng: number; lat: number; label: string; savedAt: number }`
- **Client guard:** `isClient()` checks `typeof window !== 'undefined'` -- used in all storage/hash operations
- **Read:** `readStorage()` -- `JSON.parse(localStorage.getItem(key))` with type validation (checks `lng` and `lat` are numbers)
- **Write:** `writeStorage(pin)` -- `JSON.stringify(pin)` on set, `localStorage.removeItem(key)` on null (clear)
- **Hash-based sharing:** URL hash format `#pin=c{lng},{lat}&l={label}` -- priority over localStorage; when a hash pin is found, it's also persisted to localStorage via `writeStorage`
- **Reactivity:** Uses `watch(pin, writeStorage, { deep: true })` to auto-persist changes
- **State management:** Plain `ref<UserPin | null>(pin)` -- no `useState()` composable; component-local state
- **Share URL:** Builds URL with hash params via `URLSearchParams`, with clipboard fallback (`document.execCommand('copy')` for older browsers)
- **Error handling:** All storage operations wrapped in try/catch with silent failures ("quota or privacy mode")

---

## 6. `composables/useGrants.ts` -- Supabase Edge Function Pattern

**File:** `/home/ubuntu/EG-Maps/composables/useGrants.ts` (77 lines)

**Pattern:**
- Uses `useSupabaseClient()` to get the Supabase client
- Calls Edge Functions via `client.functions.invoke(functionName, options)`
- **4 Edge Functions referenced:**
  | Function | Method | Purpose |
  |----------|--------|---------|
  | `grants-list` | GET-style (optional `?status=` query) | List grants, optionally filtered by status |
  | `grants-submit` | POST with `{ body: input }` | Submit a new grant |
  | `grants-review` | POST with `{ body: { grant_id, decision, notes } }` | Review/approve/reject a grant |
  | `grants-stats` | GET-style | Get counts by status |

- **Error pattern:** Each function returns `{ data, error }` from Supabase; errors are caught both at Supabase level and in outer try/catch, returning `{ error?: string }` shape
- **Types exported:** `GrantInput` (for submission) and `GrantRecord` (full record with `id`, `status`, `submitted_by`, `reviewed_by`, `reviewed_at`, `rejection_reason`, `created_at`)

---

## 7. `locales/en.json` -- Observatory Keys (first 30 lines of section)

**File:** `/home/ubuntu/EG-Maps/locales/en.json` (501 lines total)

**Observatory-related keys found elsewhere in the file:**
- Line 7: `"nav.observatoryOfVulcan": "Observatory of Vulcan"`
- Line 26: `"globe.observatoryTitle": "Observatory of Vulcan"`
- Line 27: `"globe.observatoryDesc": "Brazil rare earth mining claims..."`
- Line 466: `"loading.observatoryOfVulcan": "Loading Observatory of Vulcan"`
- Line 467: `"loading.observatoryOfVulcanGlobe": "Loading Observatory of Vulcan Globe"`

**Main `"observatory"` section (starting line 226):**

```json
"observatory": {
  "tabs": {
    "danger": "Danger",
    "military": "Military",
    "illegal": "Illegal",
    "env": "Env Risk",
    "network": "Network",
    "timeline": "Timeline"
  },
  "dangerPanel": {
    "title": "Top dangerous enterprises",
    "processes": "processes",
    "area": "ha",
    "showAll": "Show all {count}",
    "showLess": "Show top 20",
    "empty": "No data loaded",
    "flyTo": "Fly to {name}",
    "pager": "Pagination",
    "prevPage": "Previous page",
    "nextPage": "Next page"
  },
  "military": {
    "headline": "The real interest: MILITARY SUPPLY CHAIN",
    "headlineBody": "The \"Energy Transition\" narrative is a facade...",
    "kgPerUnit": "{kg} kg REE",
    "dodTitle": "DoD Investments",
    "stateDeptTitle": "State Dept & Export Finance",
    "chinaBanTitle": "China Export Ban (Oct 2025)",
    "chinaBanBody": "China banned export of 12/17 REE elements to US..."
  },
  "illegal": {
    "landSpec": "Land Speculation",
    "landSpecDesc": "437 companies with speculation patterns...",
    "landSpecEx1": "GR8: R$20K capital, 137 claims, 204,625 ha",
    "landSpecEx2": "Nazca Gold: 129 claims, no corporate data",
    ...
  }
}
```

The section has **6 tabs** defined, 3 of which are fully shown (`dangerPanel`, `military`, `illegal`), with `env`, `network`, and `timeline` presumably defined further down.

---

## 8. `public/data/rare-earth/points.geojson` -- Existence and Size

**File:** `/home/ubuntu/EG-Maps/public/data/rare-earth/points.geojson`

- **Exists:** YES
- **Size:** **8,479,258 bytes** (~8.5 MB)

This is a substantial GeoJSON file. The phased loading in `useRareEarthData.ts` is well-motivated -- the 8.5 MB points file is loaded first, with polygons, protected areas, and deep analysis deferred after first paint via `requestAnimationFrame` + `setTimeout(0)`.

---

## Summary for Plan Finalization

Key takeaways for your implementation plan:

1. **Data pipeline** is already built with a 5-phase progressive load pattern (points -> overlaps -> polygons -> protected/analysis).
2. **26 layers + 7 sources** are already defined as constants, with cleanup infrastructure.
3. **Map center for observatory** is `[-48, -15]` at zoom 4.2 (Brazil-centric), distinct from the global `[0,0]` default.
4. **The `observatory-analysis` module** exports the core GeoJSON types and the `computeSpeculatorIndex` function -- your plan can build on these.
5. **localStorage pattern** is established via `useUserPin.ts` with versioned keys, client guards, and hash-based sharing.
6. **Supabase pattern** uses `client.functions.invoke()` consistently -- this is the established pattern for any new Edge Function integrations.
7. **i18n** already has a `tabs` sub-structure with 6 observatory tabs defined.
8. **The points GeoJSON is 8.5 MB** -- any additional data processing or filtering must account for this payload size.
</task_result>
</task>
```

---

## Assistant (Build · MiMo V2.5 Free · 42.2s)

_Thinking:_

Now I have everything I need to write a comprehensive plan. Let me compile it all into a clear, actionable plan document.

Now I have all the information needed. Here is the comprehensive plan:

---

## Plan: Observatory of Vulcan — Poços de Caldas Default View & User Contributions

### Problem Statement

The current observatory-of-vulcan page:
1. Loads **8.5 MB of points data** (all ~20,700 Brazilian mining claims) before showing anything
2. Centers on `[-48, -15]` at zoom 4.2 (entire Brazil) — no focus on Poços de Caldas
3. Uses **satellite imagery** — not ideal for cultural/geographic context
4. Has **no user contribution** capability (no comments, photos, monitoring updates)
5. No ~100km circle or regional focus on the Vulcan Alkaline Plateau

### Goals

| # | Goal | Approach |
|---|------|----------|
| G1 | Fast initial load | Create regional data subset (~100km around Poços de Caldas), load only that first |
| G2 | Default view on Poços de Caldas | Center `[-46.77, -22.52]`, zoom ~10, ~100km radius circle |
| G3 | Cultural map style | Use user's custom MapTiler style |
| G4 | Key layers visible by default | Hydrography, mining claims, indigenous lands, waterbodies |
| G5 | User contributions | Hybrid localStorage + Supabase + GitHub LFS for photos |
| G6 | Expand to full Brazil | "Load all Brazil" button to expand beyond regional view |

---

### Phase 1: Regional Data Subset (Performance)

**Files to create/modify:**

#### 1a. Create regional data files

Create a Node script `scripts/build-regional-data.ts` that:
- Reads `public/data/rare-earth/points.geojson` (8.5 MB)
- Filters to features within ~100km of Poços de Caldas (`-46.77, -22.52`)
- Uses Haversine distance (already available in `lib/map-utils.ts:calculateDistance`)
- Outputs:
  - `public/data/rare-earth/pococaldas/points.geojson` (expected ~50-200 KB)
  - `public/data/rare-earth/pococaldas/points_with_overlaps.geojson` (filtered)
  - `public/data/rare-earth/pococaldas/polygons.geojson` (filtered from polygons_full.geojson)
  - `public/data/rare-earth/pococaldas/protected-areas.geojson` (filtered)
  - `public/data/rare-earth/pococaldas/deep_analysis.json` (regional stats)
- Also generate `public/data/rare-earth/pococaldas/waterbodies.geojson` — water features from the protected-areas or a new source

#### 1b. Modify `composables/useRareEarthData.ts`

Add a `region` parameter to the composable:

```typescript
export function useRareEarthData(baseURL: string, region?: 'pococaldas' | 'all') {
  const dataPath = region === 'pococaldas' ? 'data/rare-earth/pococaldas/' : 'data/rare-earth/'
  // ... fetch from dataPath instead of hardcoded path
}
```

Add a new phase `'regional'` that loads the regional subset first, and a method `loadFullBrazil()` that loads the full dataset on demand.

#### 1c. Modify `pages/observatory-of-vulcan/index.vue`

- Pass `region: 'pococaldas'` to `useRareEarthData()` initially
- Add a "Load all Brazil" floating button that calls `loadFullBrazil()` and switches region to `'all'`
- Track `isRegional` state to control the expand button visibility

---

### Phase 2: Map View Configuration

**Files to modify:**

#### 2a. `components/UnifiedMap.vue` (line 510-526)

Change observatory init params:

```typescript
// Before:
zoom: isRee ? 4.2 : ...
center: isRee ? [-48, -15] : ...

// After:
zoom: isRee ? 11.5 : ...      // ~100km view
center: isRee ? [-46.77, -22.52] : ...  // Poços de Caldas
minZoom: isRee ? 8 : ...       // Prevent zooming out too far in regional mode
```

#### 2b. Map style

Change `MAP_STYLE` constant to use user's custom MapTiler style:

```typescript
const MAP_STYLE = MAPTILER_API_KEY
  ? `https://api.maptiler.com/maps/019f0fee-56db-7efd-a73d-2bd1b646bc72/style.json?key=${MAPTILER_API_KEY}`
  : 'https://demotiles.maplibre.org/style.json'
```

#### 2c. Add ~100km circle overlay

In `composables/useRareEarthLayers.ts` or a new `composables/useVulcanCircle.ts`:
- Add a GeoJSON circle source `vulcan-circle` with a ~100km radius polygon around Poços de Caldas
- Style: dashed red/amber border, very subtle fill
- Toggle-able via layer visibility

---

### Phase 3: Layer Defaults for Poços de Caldas

**Files to modify:**

#### 3a. `pages/observatory-of-vulcan/index.vue`

Change default `layerVis` for regional mode:

```typescript
// Default layers for Poços de Caldas view:
layerVis.value['direct_ree'] = true
layerVis.value['carbonatite_associated'] = true  // Carbonatito/Alcalino relevant to Poços de Caldas
layerVis.value['water'] = true                    // Hydrography
layerVis.value['protected_ti'] = true             // Indigenous lands
layerVis.value['protected_quilombo'] = true       // Quilombola territories
layerVis.value['polygons'] = true                 // Claim boundaries
layerVis.value['sites'] = true                    // Conflict zones
// Disable by default in regional mode:
layerVis.value['heatmap'] = false
layerVis.value['network'] = false
layerVis.value['enterprise_hq'] = false
```

#### 3b. Hydrography / Waterbodies layer

The `ree-geo` source already contains basins, aquifers, and conflict zones. For enhanced waterbodies:
- Add water body features to the regional GeoJSON data (from IBGE or OSM)
- Create new layers: `ree-water-fill`, `ree-water-line` for rivers/lakes
- Add click handler for waterbody info popup

---

### Phase 4: User Contributions (Hybrid localStorage + Supabase + GitHub LFS)

This is the most complex phase. Architecture:

```
User Action → localStorage (instant) → Debounced Sync → Supabase Edge Function → GitHub LFS (photos)
                     ↓                                              ↓
              Offline-first read                          Supabase tables (text/ref data)
```

#### 4a. Data Model

**Supabase table: `observatory_updates`**
```sql
CREATE TABLE observatory_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_processo TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  update_type TEXT NOT NULL CHECK (update_type IN ('comment', 'photo', 'status', 'monitoring')),
  content TEXT,
  photo_url TEXT,           -- GitHub LFS URL
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_updates_processo ON observatory_updates(claim_processo);
CREATE INDEX idx_updates_user ON observatory_updates(user_id);
```

**localStorage schema** (versioned key `egmaps.obsUpdates.v1`):
```typescript
interface LocalUpdate {
  id: string              // UUID
  claim_processo: string
  update_type: 'comment' | 'photo' | 'status' | 'monitoring'
  content?: string
  photo_data?: string     // base64 thumbnail for offline display
  photo_url?: string      // GitHub LFS URL (set after sync)
  lat?: number
  lng?: number
  created_at: string
  synced: boolean         // false until synced to Supabase
}
```

#### 4b. New Files

| File | Purpose |
|------|---------|
| `composables/useObservatoryUpdates.ts` | Main composable: CRUD, localStorage read/write, debounced sync |
| `composables/usePhotoUpload.ts` | Photo capture, resize, base64 encode, upload to GitHub LFS via Edge Function |
| `components/observatory/ContributionPanel.vue` | UI: list of updates for a claim, add comment/photo form |
| `components/observatory/MonitoringPanel.vue` | UI: user's monitored claims list, recent updates |
| `supabase/functions/submit-update/index.ts` | Edge Function: receive update, store text in Supabase, upload photo to GitHub LFS |
| `supabase/functions/sync-updates/index.ts` | Edge Function: pull new updates from Supabase for given claim processos |

#### 4c. `composables/useObservatoryUpdates.ts`

```typescript
export function useObservatoryUpdates() {
  const STORAGE_KEY = 'egmaps.obsUpdates.v1'
  const updates = ref<LocalUpdate[]>([])
  
  // Read from localStorage on init
  // Watch for changes, write to localStorage
  // Debounced sync every 30s when online:
  //   - Push unsynced local updates to Supabase via Edge Function
  //   - Pull remote updates for visible claims
  //   - Mark as synced
  
  function addUpdate(update: Omit<LocalUpdate, 'id' | 'synced'>) { ... }
  function getUpdatesForClaim(processo: string) { ... }
  function getMonitoredClaims() { ... }
  function monitorClaim(processo: string) { ... }
  function unmonitorClaim(processo: string) { ... }
  
  return { updates, addUpdate, getUpdatesForClaim, getMonitoredClaims, monitorClaim, unmonitorClaim, syncNow }
}
```

#### 4d. Photo Upload Flow

1. User clicks "Add Photo" on a claim popup
2. `usePhotoUpload` opens camera/file picker
3. Image resized to max 1200px width, compressed to JPEG 80%
4. Stored in localStorage as base64 thumbnail (for instant display)
5. Uploaded to GitHub LFS via Supabase Edge Function `submit-update`
6. Edge Function returns the LFS URL, which is stored in the update record

#### 4e. UI Integration

In `pages/observatory-of-vulcan/index.vue`:
- Add "Contribute" button to claim popup (via `ClaimPopup.vue`)
- Add "My Monitoring" tab or floating panel
- Show update count badges on monitored claims

In `components/observatory/ClaimPopup.vue`:
- Add "Add Update", "Add Photo", "Monitor this claim" buttons
- Show recent updates count

---

### Phase 5: "Load all Brazil" Button

In `pages/observatory-of-vulcan/index.vue`:

```typescript
const isRegional = ref(true)

// "Load all Brazil" floating button
// When clicked:
async function expandToFullBrazil() {
  isRegional.value = false
  await loadFullBrazil()  // loads full points.geojson + all layers
  flyToTarget.value = { lng: -48, lat: -15, zoom: 4.2 }  // fly to national view
}
```

UI: Floating button at bottom-center, styled like existing action buttons, with "🇧🇷 Load all Brazil" label.

---

### Implementation Order

| Step | Files | Estimated Complexity |
|------|-------|---------------------|
| 1 | `scripts/build-regional-data.ts` (new), run once | Medium |
| 2 | `composables/useRareEarthData.ts` (add region param) | Medium |
| 3 | `components/UnifiedMap.vue` (change center/zoom/style) | Low |
| 4 | `pages/observatory-of-vulcan/index.vue` (regional defaults, expand button) | Medium |
| 5 | `composables/useRareEarthLayers.ts` (add vulcan circle, waterbody layers) | Medium |
| 6 | `components/observatory/ClaimPopup.vue` (add contribution buttons) | Low |
| 7 | `composables/useObservatoryUpdates.ts` (new) | High |
| 8 | `composables/usePhotoUpload.ts` (new) | High |
| 9 | `components/observatory/ContributionPanel.vue` (new) | Medium |
| 10 | `components/observatory/MonitoringPanel.vue` (new) | Medium |
| 11 | `supabase/functions/submit-update/index.ts` (new) | Medium |
| 12 | `locales/en.json` (new translation keys) | Low |

### Key Risks

1. **Regional data file generation** — Need to filter 8.5 MB GeoJSON; script must handle edge cases at circle boundary
2. **GitHub LFS for photos** — Requires a separate GitHub repo for LFS storage; costs and rate limits
3. **Offline sync conflicts** — Need conflict resolution strategy (last-write-wins or merge)
4. **Supabase auth** — User contributions require auth; currently only used for `/eg-grants` route

### Questions for You

1. Should the Poços de Caldas circle radius be exactly 100km, or should it be configurable?
2. For GitHub LFS photo storage — do you already have a repo, or should I create one?
3. Should the "contribute" feature require user authentication (Supabase auth), or be anonymous with optional contact info?
4. For the waterbodies data — do you have a specific source (IBGE, OSM, or custom), or should I use OSM Overpass API?

---

## User

be it in circular discos with the -21.914138005195028, -46.53311955736603 at the center, with three discos with colored difference, expanding 

---

## Assistant (Build · MiMo V2.5 Free · 2.0s)

---

## User

1 be it in circular discos with the -21.914138005195028, -46.53311955736603 at the center, with three discos with colored difference, expanding 
2 use gh repo create
3 yes google oath
4 search and research, find and download good data

---

## Assistant (Build · MiMo V2.5 Free · 69.2s)

_Thinking:_

The user is providing specific answers to my questions:

1. **Center coordinates**: `-21.914138005195028, -46.53311955736603` (not Poços de Caldas city center, but a specific point - this appears to be the Poços de Caldas Alkaline Complex / Vulcan Alkaline Plateau)
2. **Three concentric circles** with different colors, expanding outward
3. **GitHub repo** - use `gh repo create` for LFS storage
4. **Google OAuth** - use Google authentication via Supabase
5. **Water data** - search and research, find and download good hydrography data for the region

Let me now refine the plan with these specifics and then ask if the user wants me to proceed with implementation.

Let me calculate the three circle radii. The user said "three discos with colored difference, expanding" - I should propose three concentric circles. Common choices might be:
- Inner: ~25km (core area)
- Middle: ~50km 
- Outer: ~100km

Let me refine the plan with all these specifics.

Got it. Let me refine the plan with your specifics.

**Center**: `-21.914138005195028, -46.53311955736603` (Poços de Caldas Alkaline Complex)
**Circles**: 3 concentric discs with distinct colors
**GitHub**: `gh repo create` for photo LFS storage
**Auth**: Google OAuth via Supabase
**Water data**: Research and download real hydrography data

Let me research the hydrography data options and finalize the plan.

**Tool: task**

**Input:**
```json
{
  "description": "Research hydrography data sources",
  "prompt": "Research the best open data sources for hydrography/waterbodies in the Poços de Caldas region of Brazil (coordinates roughly -21.91, -46.53). I need:\n\n1. Search the web for: \"Poços de Caldas hydrography data\", \"Brazil water bodies GIS shapefile\", \"OpenStreetMap water Poços de Caldas\", \"ANA dados abertos água\", \"IBGE hidrografia dados abertos\"\n2. Search for: \"HydroSHEDS download Brazil\", \"Global Surface Water Explorer data\", \"Wikimedia water bodies Brazil\"\n3. Check if there are downloadable GeoJSON/Shapefile resources for rivers, lakes, reservoirs in Minas Gerais / São Paulo border region\n4. Search for specific waterbodies near Poços de Caldas: \"represas Poços de Caldas\", \"rios Poços de Caldas\", \"barragem Poços de Caldas\"\n5. Search for \"OSM Overpass API water bodies Minas Gerais\" and find a working Overpass query we could use\n\nReturn: A list of the best data sources with URLs, formats, and licensing info. Focus on sources that provide GeoJSON or can be easily converted to GeoJSON.",
  "subagent_type": "general"
}
```

**Output:**
```
<task id="ses_0f00aa09effeWC8zFp3k9jznbz" state="completed">
<task_result>
Here are the best open data sources for hydrography/waterbodies in the Poços de Caldas region, organized by priority and ease of use:

---

## Tier 1 — Best for Direct GeoJSON Access (Recommended)

### 1. OpenStreetMap via Overpass API (Best overall)
- **URL:** https://overpass-turbo.eu/
- **Format:** GeoJSON (via Overpass QL export or `osmtogeojson`)
- **License:** ODbL (Open Database License)
- **Why best:** Community-maintained, detailed, real-time, covers rivers, lakes, reservoirs, streams, wetlands

**Working Overpass query for Poços de Caldas water bodies:**
```
[out:json][timeout:60];
(
  way["natural"="water"](bbox:-22.0,-46.7,-21.8,-46.4);
  way["waterway"](bbox:-22.0,-46.7,-21.8,-46.4);
  relation["natural"="water"](bbox:-22.0,-46.7,-21.8,-46.4);
  relation["waterway"](bbox:-22.0,-46.7,-21.8,-46.4);
  way["water"="reservoir"](bbox:-22.0,-46.7,-21.8,-46.4);
  way["water"="lake"](bbox:-22.0,-46.7,-21.8,-46.4);
);
out geom;
```

**Key waterbodies in the area (from OSM):**
- **Represa Saturnino de Brito** — dam on Ribeirão dos Poços
- **Represa Bortolan (Represa do Cipó)** — Ribeirão do Cipó, inaugurated 1999
- **Ribeirão dos Poços** — main urban stream
- **Ribeirão das Antas** — tributary
- **Rio Pardo** — major river flowing through/near the municipality
- **Córrego da Serra**, **Córrego Ponte Alta**, **Córrego Vai e Volta** — tributaries

### 2. OSM for Cities — Poços de Caldas (pre-extracted GeoJSON)
- **URL:** https://github.com/osmforcities/brazil/tree/main/mg/pocos-de-caldas
- **Format:** GeoJSON
- **License:** ODbL
- **Why:** Already curated GeoJSON for drinking water, likely water bodies too

### 3. JRC Global Surface Water Explorer
- **URL:** https://global-surface-water.appspot.com/download
- **Format:** GeoTIFF (30m resolution), convertible to GeoJSON via QGIS
- **License:** CC BY 4.0
- **Coverage:** 1984–2024, global
- **Tiles:** Poços de Caldas falls in the 10°×10° tile around -30°/-50°
- **FTP:** `https://jeodpp.jrc.ec.europa.eu/ftp/jrc-opendata/GSWE/`
- **Good for:** Identifying all water surfaces including seasonal/flood-prone areas

---

## Tier 2 — Brazilian Government Sources (SHP, GeoPackage)

### 4. ANA — Agência Nacional de Águas (Open Data Portal)
- **URL:** https://dadosabertos.ana.gov.br/
- **Metadata catalog:** https://metadados.ana.gov.br/geonetwork/srv/por/catalog.search
- **Format:** Shapefile, GeoPackage, CSV
- **License:** Open data (Brazilian government)
- **Key datasets:**
  - **BHO (Base Hidrográfica Ottocodificada)** — river network with flow direction
  - Download: `https://metadados.snirh.gov.br/files/0c698205-6b59-48dc-8b7e-a58a5dfcc989/bho_2017_v_01_05.gpkg`
  - **Divisão Hidrográfica e corpos hídricos superficiais**
  - Water use authorizations, monitoring stations

### 5. IBGE — Bacias e Divisões Hidrográficas do Brasil (BHB250/DHN250)
- **URL:** https://www.ibge.gov.br/geociencias/informacoes-ambientais/estudos-ambientais/31653-bacias-e-divisoes-hidrograficas-do-brasil.html
- **Format:** Shapefile, GeoPackage
- **License:** Free (Brazilian government)
- **Scale:** 1:250,000
- **EPSG:** 4674 (SIRGAS 2000)
- **Key:** Most precise official hydrographic division available

### 6. IGAM — Minas Gerais State Water Agency
- **URL:** https://igam.mg.gov.br/w/bases-cartograficas-digitais
- **Open data:** https://igam.mg.gov.br/dados-abertos
- **Format:** Shapefile
- **License:** Public domain (state government)
- **Key datasets:**
  - **Hidrografia MG** — `http://www.igam.mg.gov.br/images/stories/arquivos/ArcView/Hidrografia.zip` (8.6 MB)
  - **Bacias Federais** — `http://www.igam.mg.gov.br/images/stories/arquivos/ArcView/Bacias%20Federais.zip`
  - New **BHO 2021** with Otto-coded basins

### 7. São Paulo State Open Data — Hidrografia
- **URL:** https://dadosabertos.sp.gov.br/dataset/hidrografia
- **License:** CC BY 4.0
- **Note:** Poços de Caldas is on the MG/SP border; SP hydro data covers Rio Pardo downstream

### 8. IDE-Sisema (Minas Gerais Environmental Spatial Data Infrastructure)
- **URL:** https://idesisema.meioambiente.mg.gov.br/webgis
- **Format:** Shapefile (via web GIS portal)
- **Coverage:** 752 layers including hydrography, water resources

---

## Tier 3 — Global Hydrological Datasets

### 9. HydroSHEDS (WWF)
- **URL:** https://www.hydrosheds.org/products
- **Download:** https://www.hydrosheds.org/hydrosheds-core-downloads
- **Format:** Shapefile, GeoTIFF
- **License:** Free for non-commercial use (HydroSHEDS Terms of Use)
- **Key products:**
  - **HydroRIVERS** — river network (South America shapefile)
  - **HydroLAKES** — lake polygons
  - **HydroBASINS** — watershed boundaries
  - Download South America: `https://data.hydrosheds.org/file/hydrosheds-v1-riv/hyd_sa_riv.zip`
- **Note:** Good for regional rivers, but may miss smaller streams near Poços de Caldas

### 10. Natural Earth Water Bodies
- **URL:** https://www.naturalearthdata.com/downloads/
- **Format:** Shapefile, GeoJSON
- **License:** Public domain
- **Note:** Only major water features; good for base layers, not detailed local hydro

---

## Tier 4 — Quick Conversion Tools

### 11. Geofabrik Brazil Sudeste OSM Extract
- **URL:** https://download.geofabrik.de/south-america/brazil/sudeste-latest.osm.pbf
- **Format:** .osm.pbf (811 MB), convertible to GeoJSON with `ogr2ogr` or `osmium`
- **License:** ODbL

### 12. HOT/OSM Brazil Waterways (HDX)
- **URL:** https://data.humdata.org/dataset/hotosm_bra_waterways
- **Format:** SHP (points, lines, polygons)
- **License:** ODbL
- **Tags:** `waterway`, `water`, `natural=water/wetland/bay`

### 13. osmtogeojson (converter)
- **URL:** https://github.com/tyrasd/osmtogeojson
- **Format:** Converts OSM XML/Overpass JSON → GeoJSON
- **License:** MIT

---

## Summary Recommendation

| Priority | Source | Format | License | Best For |
|----------|--------|--------|---------|----------|
| **#1** | **OSM Overpass API** | GeoJSON | ODbL | Detailed local water bodies, instant |
| **#2** | **ANA BHO GeoPackage** | GeoPackage | Open | River network with topology |
| **#3** | **IBGE BHB250** | SHP/GPKG | Open | Official watershed boundaries |
| **#4** | **IGAM MG Hidrografia** | SHP | Open | Minas Gerais state-specific |
| **#5** | **JRC Global Surface Water** | GeoTIFF | CC BY 4.0 | Temporal water detection |
| **#6** | **HydroSHEDS** | SHP | Non-commercial | Regional rivers/lakes |

**For a web visualization project like EG-Maps**, the OSM Overpass API is the best starting point — it gives you GeoJSON directly, covers all the specific reservoirs and rivers near Poços de Caldas (Represa do Cipó, Ribeirão dos Poços, Rio Pardo, etc.), and is community-updated. The `osmtogeojson` npm package can convert Overpass output to GeoJSON client-side.
</task_result>
</task>
```

---

## Assistant (Build · MiMo V2.5 Free · 55.1s)

_Thinking:_

Excellent! Now I have all the research. Let me finalize the comprehensive plan with all the specifics:

1. **Center**: `-21.914138005195028, -46.53311955736603` (Poços de Caldas Alkaline Complex)
2. **Three concentric circles** with different colors
3. **GitHub repo** via `gh repo create`
4. **Google OAuth** via Supabase
5. **Hydrography**: OSM Overpass API as primary, with IGAM MG and ANA BHO as supplementary

Let me write the final comprehensive plan.

Now I have all the research needed. Here is the complete, refined plan:

---

## Observatory of Vulcan — Implementation Plan

### Overview

Transform the observatory-of-vulcan page from a national-level mining dashboard into a **regionally-focused Poços de Caldas Vulcan Alkaline Plateau** viewer with three concentric observation zones, real hydrography data, and a user contribution/monitoring system.

**Center point**: `-21.914138005195028, -46.53311955736603`

---

### Phase 1: Regional Data Pipeline

**Goal**: Create pre-filtered GeoJSON files for the ~100km Poços de Caldas region.

#### 1.1 Create `scripts/build-regional-data.ts`

Node script that:
- Reads `public/data/rare-earth/points.geojson` (8.5 MB, ~20,700 features)
- Calculates Haversine distance from center point `[-46.53311955736603, -21.914138005195028]`
- Filters features within 100km radius
- Also generates the 25km and 50km subsets for the inner circles
- Outputs to `public/data/rare-earth/pococaldas/`:
  - `points.geojson` — features within 100km
  - `points_overlaps.geojson` — filtered overlaps
  - `polygons.geojson` — filtered from `polygons_full.geojson`
  - `protected-areas.geojson` — filtered protected areas
  - `deep_analysis.json` — regional statistics

#### 1.2 Run the script

```bash
npx tsx scripts/build-regional-data.ts
```

Verify output files are significantly smaller (target: <500 KB total vs 23 MB national).

---

### Phase 2: Map Configuration

#### 2.1 Map Style

Change `MAP_STYLE` in `components/UnifiedMap.vue` (line 203):

```typescript
const MAP_STYLE = MAPTILER_API_KEY
  ? `https://api.maptiler.com/maps/019f0fee-56db-7efd-a73d-2bd1b646bc72/style.json?key=${MAPTILER_API_KEY}`
  : 'https://demotiles.maplibre.org/style.json'
```

#### 2.2 Default View

In `components/UnifiedMap.vue` (lines 516-521), change observatory params:

```typescript
// Observatory-of-vulcan: Poços de Caldas Vulcan Alkaline Plateau
zoom: isRee ? 11.5 : ...
center: isRee ? [-46.53311955736603, -21.914138005195028] : ...
minZoom: isRee ? 8 : ...
maxZoom: isRee ? 16 : ...
```

#### 2.3 Three Concentric Circles

Create `composables/useVulcanCircles.ts`:

```typescript
const CENTER: [number, number] = [-46.53311955736603, -21.914138005195028]

const CIRCLES = [
  { radiusKm: 25,  color: '#e74c3c', label: 'Core Zone',      fillOpacity: 0.08 },
  { radiusKm: 50,  color: '#f39c12', label: 'Extended Zone',   fillOpacity: 0.05 },
  { radiusKm: 100, color: '#27ae60', label: 'Regional Zone',   fillOpacity: 0.03 },
]
```

Each circle is a GeoJSON Polygon generated by approximating a circle with 64 points using the Haversine formula. Added as a source `vulcan-circles` with three fill+line layers, toggleable via the filter panel.

---

### Phase 3: Data Loading Flow

#### 3.1 Modify `composables/useRareEarthData.ts`

Add a `region` parameter:

```typescript
export function useRareEarthData(baseURL: string, region?: 'pococaldas' | 'all') {
  const dataDir = region === 'pococaldas' 
    ? `${baseURL}data/rare-earth/pococaldas/` 
    : `${baseURL}data/rare-earth/`
  
  // Same 4-phase loading but from regional directory
  // Add: loadFullBrazil() method that switches to 'all' and re-fetches
}
```

#### 3.2 Modify `pages/observatory-of-vulcan/index.vue`

- Initialize with `region: 'pococaldas'`
- Track `isRegional` state
- Add "Load all Brazil" floating button:

```html
<button v-if="isRegional" @click="expandToFullBrazil" class="obs-action-btn" style="--accent: #27ae60">
  <span>🇧🇷</span> Load all Brazil
</button>
```

- When clicked: call `loadFullBrazil()`, set `isRegional = false`, fly to national view `[-48, -15]` zoom 4.2
- Expand `minZoom` back to 2.5

#### 3.3 Loading Phases (Regional)

1. **Phase 1** (0-20%): Load regional `pococaldas/points.geojson` (~100-300 KB)
2. **Phase 2** (20-40%): Load regional overlaps + protected areas
3. **Phase 3** (40-60%): Load regional polygons
4. **Phase 4** (60-80%): Load deep analysis + waterbodies
5. **Phase 5** (80-100%): Complete

Map becomes interactive after Phase 1.

---

### Phase 4: Hydrography & Waterbodies

#### 4.1 Data Acquisition

Download water data via Overpass API and save to `public/data/rare-earth/pococaldas/waterbodies.geojson`:

```bash
# Overpass query for water features within ~100km of center
curl -s "https://overpass-api.de/api/interpreter" \
  --data-urlencode 'data=[out:json][timeout:60];
  (
    way["natural"="water"](bbox:-22.9,-47.5,-20.9,-45.5);
    relation["natural"="water"](bbox:-22.9,-47.5,-20.9,-45.5);
    way["waterway"~"river|stream|canal"](bbox:-22.9,-47.5,-20.9,-45.5);
    way["water"="reservoir"](bbox:-22.9,-47.5,-20.9,-45.5);
  );
  out geom;' | node scripts/overpass-to-geojson.js > public/data/rare-earth/pococaldas/waterbodies.geojson
```

Create `scripts/overpass-to-geojson.js` to convert Overpass JSON → standard GeoJSON with properties:
- `name` — water body name
- `type` — river, lake, reservoir, stream, canal
- `area` — computed area (for polygons)
- `length` — computed length (for lines)

Key waterbodies expected:
- Represa Saturnino de Brito
- Represa Bortolan (Represa do Cipó)
- Ribeirão dos Poços
- Ribeirão das Antas
- Rio Pardo
- Córrego da Serra, Córrego Ponte Alta

#### 4.2 Water Layers in `useRareEarthLayers.ts`

Add to the source/layer constants:

```typescript
export const REE_SOURCE_WATER = 'ree-water'

// New layers:
'ree-water-fill',      // Lake/reservoir polygons (blue fill)
'ree-water-line',      // Rivers/streams (blue line)
'ree-water-label',     // Water body name labels
```

#### 4.3 Waterbody Popups

Click on a waterbody shows:
- Name, type, approximate area/length
- If near mining claims: "X mining claims within Y km"
- Photo placeholder for user contributions

---

### Phase 5: Default Layer Configuration

In `pages/observatory-of-vulcan/index.vue`, set regional defaults:

```typescript
// Layers enabled by default for Poços de Caldas view:
layerVis.value['direct_ree'] = true
layerVis.value['carbonatite_associated'] = true  // Key category for this alkaline complex
layerVis.value['water'] = true                    // Hydrography
layerVis.value['protected_ti'] = true             // Indigenous lands
layerVis.value['protected_quilombo'] = true       // Quilombola territories
layerVis.value['polygons'] = true                 // Claim boundaries
layerVis.value['sites'] = true                    // Conflict zones
layerVis.value['vulcan_circles'] = true           // Three concentric circles

// Disabled by default in regional mode:
layerVis.value['heatmap'] = false
layerVis.value['network'] = false
layerVis.value['enterprise_hq'] = false
layerVis.value['pegmatite_associated'] = false
layerVis.value['heavy_mineral_associated'] = false
layerVis.value['phosphate_associated'] = false
layerVis.value['strategic_associated'] = false
```

---

### Phase 6: User Contributions System

#### 6.1 GitHub LFS Repo

```bash
gh repo create eg-maps-observatory-data --private --description "Observatory of Vulcan user contributions & photos"
cd eg-maps-observatory-data
git lfs install
git lfs track "*.jpg" "*.jpeg" "*.png" "*.webp"
```

#### 6.2 Supabase Setup

**Google OAuth** in Supabase Dashboard → Authentication → Providers → Google:
- Enable Google provider
- Set Client ID and Client Secret from Google Cloud Console
- Callback URL: `https://<project>.supabase.co/auth/v1/callback`

**New table** `observatory_updates`:

```sql
CREATE TABLE observatory_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_processo TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  user_name TEXT,
  update_type TEXT NOT NULL CHECK (update_type IN ('comment', 'photo', 'status', 'monitoring')),
  content TEXT,
  photo_url TEXT,
  photo_thumb_url TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  synced BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_updates_processo ON observatory_updates(claim_processo);
CREATE INDEX idx_updates_user ON observatory_updates(user_id);
CREATE INDEX idx_updates_created ON observatory_updates(created_at DESC);

-- Row Level Security
ALTER TABLE observatory_updates ENABLE ROW LEVEL SECURITY;

-- Anyone can read (public data)
CREATE POLICY "Public read" ON observatory_updates FOR SELECT USING (true);

-- Authenticated users can insert their own
CREATE POLICY "Auth insert" ON observatory_updates FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own
CREATE POLICY "Auth update" ON observatory_updates FOR UPDATE
  USING (auth.uid() = user_id);
```

#### 6.3 Supabase Edge Functions

**`supabase/functions/submit-update/index.ts`**:
- Receives: `{ claim_processo, update_type, content, photo_base64?, lat?, lng? }`
- If photo: uploads to GitHub LFS via API, gets raw URL
- Inserts record into `observatory_updates` table
- Returns the created record

**`supabase/functions/sync-updates/index.ts`**:
- Receives: `{ processos: string[], since: ISO timestamp }`
- Returns all updates for given processos since timestamp
- Used by client to pull remote updates

#### 6.4 New Composable: `composables/useObservatoryUpdates.ts`

```typescript
interface LocalUpdate {
  id: string
  claim_processo: string
  update_type: 'comment' | 'photo' | 'status' | 'monitoring'
  content?: string
  photo_data?: string     // base64 thumbnail
  photo_url?: string      // GitHub LFS URL
  lat?: number
  lng?: number
  created_at: string
  synced: boolean
}

export function useObservatoryUpdates() {
  const STORAGE_KEY = 'egmaps.obsUpdates.v1'
  const updates = ref<LocalUpdate[]>([])
  const pendingSync = ref(false)
  const lastSync = ref<string | null>(null)
  
  // On init: read from localStorage
  // Debounced sync every 30s when online
  // Push unsynced local → Supabase
  // Pull remote → merge into local
  
  function addUpdate(update: Omit<LocalUpdate, 'id' | 'synced'>) { ... }
  function getUpdatesForClaim(processo: string) { ... }
  function getMonitoredClaims() { ... }
  function monitorClaim(processo: string) { ... }
  function removeMonitor(processo: string) { ... }
  async function syncNow() { ... }
  
  return { updates, addUpdate, getUpdatesForClaim, getMonitoredClaims, monitorClaim, removeMonitor, syncNow, pendingSync, lastSync }
}
```

#### 6.5 New Composable: `composables/usePhotoUpload.ts`

```typescript
export function usePhotoUpload() {
  async function capturePhoto(): Promise<File | null> { ... }
  async function resizeImage(file: File, maxPx?: number): Promise<Blob> { ... }
  function toBase64(blob: Blob): Promise<string> { ... }
  async function uploadToLFS(base64: string, filename: string): Promise<string | null> { ... }
  
  return { capturePhoto, resizeImage, toBase64, uploadToLFS }
}
```

#### 6.6 New Component: `components/observatory/ContributionPanel.vue`

Shows when a claim is selected:
- List of existing updates (comments, photos, status changes)
- "Add Comment" text input
- "Add Photo" camera/file picker button
- "Monitor this claim" toggle
- "Last synced: X ago" indicator

#### 6.7 New Component: `components/observatory/MonitoringDashboard.vue`

Floating panel showing:
- List of monitored claims with update badges
- Recent updates across all monitored claims
- "Sync now" button
- Notification count

#### 6.8 Integrate into `ClaimPopup.vue`

Add buttons to existing popup:
```html
<div style="display:flex;gap:6px;padding:8px 14px 12px;border-top:1px solid rgba(255,255,255,0.06)">
  <button @click="openContributionPanel" style="...">📝 Updates</button>
  <button @click="addPhoto" style="...">📷 Photo</button>
  <button @click="toggleMonitor" style="...">👁 Monitor</button>
</div>
```

---

### Phase 7: i18n Keys

Add to `locales/en.json` (and other locales):

```json
{
  "observatory": {
    "regional": {
      "loadAllBrazil": "Load all Brazil",
      "loadAllDesc": "Expand to view all 20,700+ mining claims nationwide",
      "coreZone": "Core Zone (25km)",
      "extendedZone": "Extended Zone (50km)",
      "regionalZone": "Regional Zone (100km)"
    },
    "contributions": {
      "title": "Community Updates",
      "addComment": "Add a comment...",
      "addPhoto": "Add Photo",
      "monitor": "Monitor this claim",
      "unmonitor": "Stop monitoring",
      "myMonitoring": "My Monitoring",
      "lastSync": "Last sync: {time}",
      "pendingSync": "{count} updates pending sync",
      "signInToContribute": "Sign in with Google to contribute",
      "commentAdded": "Comment added",
      "photoUploaded": "Photo uploaded"
    },
    "water": {
      "title": "Waterbodies",
      "river": "River",
      "lake": "Lake",
      "reservoir": "Reservoir",
      "stream": "Stream",
      "nearbyClaims": "{count} mining claims within {distance}"
    }
  }
}
```

---

### File Summary

| Action | File | Purpose |
|--------|------|---------|
| **Create** | `scripts/build-regional-data.ts` | Generate regional GeoJSON subsets |
| **Create** | `scripts/overpass-to-geojson.js` | Convert Overpass output to GeoJSON |
| **Create** | `public/data/rare-earth/pococaldas/` | Regional data directory |
| **Create** | `composables/useVulcanCircles.ts` | Three concentric circle layers |
| **Create** | `composables/useObservatoryUpdates.ts` | User contributions (localStorage + sync) |
| **Create** | `composables/usePhotoUpload.ts` | Photo capture, resize, upload |
| **Create** | `components/observatory/ContributionPanel.vue` | Update list + add comment/photo UI |
| **Create** | `components/observatory/MonitoringDashboard.vue` | User's monitored claims panel |
| **Create** | `supabase/functions/submit-update/index.ts` | Edge Function: submit update |
| **Create** | `supabase/functions/sync-updates/index.ts` | Edge Function: pull remote updates |
| **Modify** | `components/UnifiedMap.vue` | Map style, center, zoom |
| **Modify** | `composables/useRareEarthData.ts` | Region parameter, loadFullBrazil() |
| **Modify** | `composables/useRareEarthLayers.ts` | Water layers, circle layers |
| **Modify** | `pages/observatory-of-vulcan/index.vue` | Regional defaults, expand button, contribution integration |
| **Modify** | `components/observatory/ClaimPopup.vue` | Add update/monitor buttons |
| **Modify** | `locales/en.json` | New translation keys |
| **Create** | GitHub repo `eg-maps-observatory-data` | Photo LFS storage |

---

### Implementation Order

| Step | What | Est. Effort |
|------|------|-------------|
| 1 | Run Overpass query, save waterbodies.geojson | 30 min |
| 2 | Create and run `build-regional-data.ts` | 1 hour |
| 3 | Modify UnifiedMap.vue (style, center, zoom) | 15 min |
| 4 | Create `useVulcanCircles.ts` + integrate layers | 1 hour |
| 5 | Modify `useRareEarthData.ts` (region param) | 1 hour |
| 6 | Modify index.vue (regional defaults, expand button) | 1.5 hours |
| 7 | Add water layers to `useRareEarthLayers.ts` | 1 hour |
| 8 | Create GitHub repo via `gh repo create` | 10 min |
| 9 | Set up Supabase table + Google OAuth | 30 min |
| 10 | Create `useObservatoryUpdates.ts` | 2 hours |
| 11 | Create `usePhotoUpload.ts` | 1 hour |
| 12 | Create Supabase Edge Functions | 1.5 hours |
| 13 | Create ContributionPanel.vue | 1.5 hours |
| 14 | Create MonitoringDashboard.vue | 1 hour |
| 15 | Integrate into ClaimPopup.vue | 30 min |
| 16 | i18n keys + testing | 1 hour |

---

Want me to proceed with implementation? I'd start with Steps 1-6 (data pipeline + map configuration), which deliver the core regional view experience.

---

## User

proceed 100%, dont stop until all edges working integrated 100% tested working at the end

---

## Assistant (Build · MiMo V2.5 Free · 14.5s)

_Thinking:_

The user wants me to proceed with full implementation. Let me start executing the plan step by step, beginning with the data pipeline and map configuration. Let me create a todo list and start working through everything systematically.

**Tool: todowrite**

**Input:**
```json
{
  "todos": [
    {
      "content": "Run Overpass query to download waterbodies GeoJSON data",
      "status": "in_progress",
      "priority": "high"
    },
    {
      "content": "Create scripts/overpass-to-geojson.js converter",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Create scripts/build-regional-data.ts for Poços de Caldas subsets",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Run regional data builder, verify output files",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Modify UnifiedMap.vue: map style, center, zoom for Poços de Caldas",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Create composables/useVulcanCircles.ts (3 concentric circles)",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Modify composables/useRareEarthData.ts: region param + loadFullBrazil",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Modify useRareEarthLayers.ts: water layers + circle layers",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Modify index.vue: regional defaults, expand button, integrate layers",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Create GitHub repo for LFS photo storage",
      "status": "pending",
      "priority": "medium"
    },
    {
      "content": "Set up Supabase table + Google OAuth config",
      "status": "pending",
      "priority": "medium"
    },
    {
      "content": "Create composables/useObservatoryUpdates.ts (localStorage + sync)",
      "status": "pending",
      "priority": "medium"
    },
    {
      "content": "Create composables/usePhotoUpload.ts",
      "status": "pending",
      "priority": "medium"
    },
    {
      "content": "Create Supabase Edge Functions (submit-update, sync-updates)",
      "status": "pending",
      "priority": "medium"
    },
    {
      "content": "Create components/observatory/ContributionPanel.vue",
      "status": "pending",
      "priority": "medium"
    },
    {
      "content": "Create components/observatory/MonitoringDashboard.vue",
      "status": "pending",
      "priority": "medium"
    },
    {
      "content": "Integrate contributions into ClaimPopup.vue",
      "status": "pending",
      "priority": "medium"
    },
    {
      "content": "Add i18n translation keys (en + other locales)",
      "status": "pending",
      "priority": "medium"
    },
    {
      "content": "Run lint + typecheck, fix any errors",
      "status": "pending",
      "priority": "high"
    }
  ]
}
```

**Output:**
```
[
  {
    "content": "Run Overpass query to download waterbodies GeoJSON data",
    "status": "in_progress",
    "priority": "high"
  },
  {
    "content": "Create scripts/overpass-to-geojson.js converter",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Create scripts/build-regional-data.ts for Poços de Caldas subsets",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Run regional data builder, verify output files",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Modify UnifiedMap.vue: map style, center, zoom for Poços de Caldas",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Create composables/useVulcanCircles.ts (3 concentric circles)",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Modify composables/useRareEarthData.ts: region param + loadFullBrazil",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Modify useRareEarthLayers.ts: water layers + circle layers",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Modify index.vue: regional defaults, expand button, integrate layers",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Create GitHub repo for LFS photo storage",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "Set up Supabase table + Google OAuth config",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "Create composables/useObservatoryUpdates.ts (localStorage + sync)",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "Create composables/usePhotoUpload.ts",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "Create Supabase Edge Functions (submit-update, sync-updates)",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "Create components/observatory/ContributionPanel.vue",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "Create components/observatory/MonitoringDashboard.vue",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "Integrate contributions into ClaimPopup.vue",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "Add i18n translation keys (en + other locales)",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "Run lint + typecheck, fix any errors",
    "status": "pending",
    "priority": "high"
  }
]
```

---

## Assistant (Build · MiMo V2.5 Free · 7.3s)

_Thinking:_

Let me start with Step 1: Download waterbodies data via Overpass API, and simultaneously create the converter script and regional data builder.

Starting full implementation. First, let me fetch waterbodies data and create the scripts.

**Tool: bash**

**Input:**
```json
{
  "command": "mkdir -p /home/ubuntu/EG-Maps/public/data/rare-earth/pococaldas /home/ubuntu/EG-Maps/scripts",
  "description": "Create directories for regional data and scripts"
}
```

**Output:**
```
(no output)
```

**Tool: webfetch**

**Input:**
```json
{
  "url": "https://overpass-api.de/api/interpreter?data=[out:json][timeout:60];(way[\"natural\"=\"water\"](bbox:-22.9,-47.5,-20.9,-45.5);relation[\"natural\"=\"water\"](bbox:-22.9,-47.5,-20.9,-45.5);way[\"waterway\"~\"river|stream|canal\"](bbox:-22.9,-47.5,-20.9,-45.5);way[\"water\"=\"reservoir\"](bbox:-22.9,-47.5,-20.9,-45.5););out geom;",
  "format": "text",
  "timeout": 120
}
```

**Error:**
```
StatusCode: non 2xx status code (406 GET https://overpass-api.de/api/interpreter?data=[out:json][timeout:60];(way["natural"="water"](bbox:-22.9,-47.5,-20.9,-45.5);relation["natural"="water"](bbox:-22.9,-47.5,-20.9,-45.5);way["waterway"~"river|stream|canal"](bbox:-22.9,-47.5,-20.9,-45.5);way["water"="reservoir"](bbox:-22.9,-47.5,-20.9,-45.5););out geom;)
```

---

## Assistant (Build · MiMo V2.5 Free · 9.4s)

_Thinking:_

The Overpass API URL didn't work directly via GET. I need to use POST method. Let me use curl with POST data.

**Tool: bash**

**Input:**
```json
{
  "command": "curl -s -X POST \"https://overpass-api.de/api/interpreter\" \\\n  --data-urlencode 'data=[out:json][timeout:60];\n(\n  way[\"natural\"=\"water\"](bbox:-22.9,-47.5,-20.9,-45.5);\n  relation[\"natural\"=\"water\"](bbox:-22.9,-47.5,-20.9,-45.5);\n  way[\"waterway\"~\"river|stream|canal\"](bbox:-22.9,-47.5,-20.9,-45.5);\n  way[\"water\"=\"reservoir\"](bbox:-22.9,-47.5,-20.9,-45.5);\n);\nout geom;' -o /tmp/overpass-water-raw.json 2>&1 && echo \"SUCCESS: $(wc -c < /tmp/overpass-water-raw.json) bytes\" || echo \"FAILED\"",
  "description": "Download waterbodies data from Overpass API via POST",
  "timeout": 120000
}
```

**Output:**
```
SUCCESS: 371 bytes

```

---

## Assistant (Build · MiMo V2.5 Free · 6.9s)

_Thinking:_

Only 371 bytes - that's likely an error response. Let me check what it contains.

**Tool: bash**

**Input:**
```json
{
  "command": "cat /tmp/overpass-water-raw.json",
  "description": "Check Overpass API response"
}
```

**Output:**
```
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
<html><head>
<title>406 Not Acceptable</title>
</head><body>
<h1>Not Acceptable</h1>
<p>An appropriate representation of the requested resource could not be found on this server.</p>
<hr>
<address>Apache/2.4.67 (Debian) Server at overpass-api.de Port 443</address>
</body></html>

```

---

## Assistant (Build · MiMo V2.5 Free · 11.8s)

_Thinking:_

The Overpass API server is rejecting the request. Let me try a different Overpass endpoint or try with a different approach.

**Tool: bash**

**Input:**
```json
{
  "command": "curl -s -X POST \"https://overpass.kumi.systems/api/interpreter\" \\\n  --data-urlencode 'data=[out:json][timeout:90];\n(\n  way[\"natural\"=\"water\"](bbox:-22.9,-47.5,-20.9,-45.5);\n  relation[\"natural\"=\"water\"](bbox:-22.9,-47.5,-20.9,-45.5);\n  way[\"waterway\"~\"river|stream|canal\"](bbox:-22.9,-47.5,-20.9,-45.5);\n  way[\"water\"=\"reservoir\"](bbox:-22.9,-47.5,-20.9,-45.5);\n);\nout body;' -o /tmp/overpass-water-raw.json 2>&1 && echo \"SUCCESS: $(wc -c < /tmp/overpass-water-raw.json) bytes\" || echo \"FAILED\"",
  "description": "Try alternative Overpass API server for waterbodies",
  "timeout": 120000
}
```

**Output:**
```
SUCCESS: 1390 bytes

```

---

## Assistant (Build · MiMo V2.5 Free · 3.4s)

_Thinking:_

Let me check the content - 1390 bytes is still small but might be actual data.

**Tool: bash**

**Input:**
```json
{
  "command": "head -c 500 /tmp/overpass-water-raw.json",
  "description": "Check Overpass response content"
}
```

**Output:**
```
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN"
    "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
<head>
  <meta http-equiv="content-type" content="text/html; charset=utf-8" lang="en"/>
  <title>OSM3S Response</title>
</head>
<body>

<p>The data included in this document is from www.openstreetmap.org. The data is made available under ODbL.</p>
<p><strong style="color:#FF0000
```

---

## Assistant (Build · MiMo V2.5 Free · 6.9s)

_Thinking:_

It looks like it's returning an error page. Let me try yet another Overpass server or approach. Let me try the main Overpass API with a different user agent and simpler query first.

**Tool: bash**

**Input:**
```json
{
  "command": "# Try the lz4 overpass endpoint\nQUERY='[out:json][timeout:90];\n(\n  way[\"natural\"=\"water\"](bbox:-22.9,-47.5,-20.9,-45.5);\n  relation[\"natural\"=\"water\"](bbox:-22.9,-47.5,-20.9,-45.5);\n  way[\"waterway\"~\"river|stream|canal\"](bbox:-22.9,-47.5,-20.9,-45.5);\n);\nout body;'\n\ncurl -v -s -X POST \"https://overpass-api.de/api/interpreter\" \\\n  -H \"Content-Type: application/x-www-form-urlencoded\" \\\n  --data-urlencode \"data=${QUERY}\" \\\n  -o /tmp/overpass-water-raw.json 2>&1 | tail -20\necho \"---\"\nwc -c /tmp/overpass-water-raw.json 2>/dev/null\nhead -c 300 /tmp/overpass-water-raw.json 2>/dev/null",
  "description": "Try Overpass API with explicit content type",
  "timeout": 120000
}
```

**Output:**
```
> Content-Type: application/x-www-form-urlencoded
> Content-Length: 350
> 
} [350 bytes data]
* upload completely sent off: 350 bytes
{ [5 bytes data]
* TLSv1.3 (IN), TLS handshake, Newsession Ticket (4):
{ [57 bytes data]
* TLSv1.3 (IN), TLS handshake, Newsession Ticket (4):
{ [57 bytes data]
< HTTP/1.1 400 Bad Request
< Date: Sun, 28 Jun 2026 20:42:51 GMT
< Server: Apache/2.4.67 (Debian)
< Vary: Accept-Encoding
< Connection: close
< Transfer-Encoding: chunked
< Content-Type: text/html; charset=utf-8
< 
{ [1171 bytes data]
* shutting down connection #0
---
1164 /tmp/overpass-water-raw.json
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN"
    "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
<head>
  <meta http-equiv="content-type" content="text/html; charset=utf-8" lan
```

---

## Assistant (Build · MiMo V2.5 Free · 12.5s)

_Thinking:_

The Overpass API seems to be having issues. Let me try a different approach - I'll create the waterbodies data manually based on known water features in the Poços de Caldas region, and also try the Overpass API with a much simpler query first.

**Tool: bash**

**Input:**
```json
{
  "command": "# Try minimal Overpass query first\ncurl -s -X POST \"https://overpass-api.de/api/interpreter\" \\\n  -H \"Content-Type: application/x-www-form-urlencoded\" \\\n  --data-urlencode 'data=[out:json][timeout:30];way[\"natural\"=\"water\"](-22.2,-46.8,-21.6,-46.2);out body;' \\\n  -o /tmp/overpass-test.json 2>&1\necho \"Exit: $?\"\nwc -c /tmp/overpass-test.json 2>/dev/null\nhead -c 500 /tmp/overpass-test.json 2>/dev/null",
  "description": "Try minimal Overpass query to test connectivity",
  "timeout": 60000
}
```

**Output:**
```
Exit: 0
403461 /tmp/overpass-test.json
{
  "version": 0.6,
  "generator": "Overpass API 0.7.62.11 87bfad18",
  "osm3s": {
    "timestamp_osm_base": "2026-06-28T20:41:01Z",
    "copyright": "The data included in this document is from www.openstreetmap.org. The data is made available under ODbL."
  },
  "elements": [

{
  "type": "way",
  "id": 104628756,
  "nodes": [
    1206922925,
    1206922994,
    1206922912,
    1206922893,
    1206923013,
    4238806246,
    4238806247,
    4238806248,
    4238806249,
    4238806250,
    423880
```

---

## Assistant (Build · MiMo V2.5 Free · 23.9s)

_Thinking:_

It works with a simpler query. The issue was with the union query syntax. Let me now run the full query in parts.

The simpler query works. Let me now fetch all water features with proper formatting and build the converter.

**Tool: bash**

**Input:**
```json
{
  "command": "# Fetch water bodies (polygons) - with geom for coordinates\ncurl -s -X POST \"https://overpass-api.de/api/interpreter\" \\\n  -H \"Content-Type: application/x-www-form-urlencoded\" \\\n  --data-urlencode 'data=[out:json][timeout:60];(way[\"natural\"=\"water\"](-22.9,-47.5,-20.9,-45.5);relation[\"natural\"=\"water\"](-22.9,-47.5,-20.9,-45.5););out geom;' \\\n  -o /tmp/overpass-water.json 2>&1\necho \"Water bodies: $(wc -c < /tmp/overpass-water.json) bytes\"\n\n# Fetch waterways (rivers/streams)\ncurl -s -X POST \"https://overpass-api.de/api/interpreter\" \\\n  -H \"Content-Type: application/x-www-form-urlencoded\" \\\n  --data-urlencode 'data=[out:json][timeout:60];way[\"waterway\"~\"river|stream|canal\"](-22.9,-47.5,-20.9,-45.5);out geom;' \\\n  -o /tmp/overpass-waterways.json 2>&1\necho \"Waterways: $(wc -c < /tmp/overpass-waterways.json) bytes\"\n\n# Verify both are valid JSON\npython3 -c \"import json; d=json.load(open('/tmp/overpass-water.json')); print(f'Water elements: {len(d.get(\\\"elements\\\",[]))}')\" 2>/dev/null\npython3 -c \"import json; d=json.load(open('/tmp/overpass-waterways.json')); print(f'Waterway elements: {len(d.get(\\\"elements\\\",[]))}')\" 2>/dev/null",
  "description": "Fetch water bodies and waterways from Overpass API separately",
  "timeout": 120000
}
```

**Output:**
```
Water bodies: 20131923 bytes
Waterways: 27342681 bytes
Water elements: 8021
Waterway elements: 14103

```

---

## Assistant (Build · MiMo V2.5 Free · 29.6s)

_Thinking:_

Got 8021 water body elements and 14103 waterway elements. Now I need to convert these to GeoJSON. The data is in OSM format with `out geom` so it has coordinates inline.

Let me create a Node.js script to convert Overpass JSON to GeoJSON. I'll use a simple approach that:
1. Converts ways (polygons/lines) to GeoJSON features
2. Converts relations (multipolygons) to GeoJSON features
3. Extracts relevant tags (name, type, etc.)

Let me also create the build-regional-data.ts script and the overpass-to-geojson.js converter.

Got 8021 water bodies and 14103 waterways. Now creating the converter scripts and regional data builder.

**Tool: write**

**Input:**
```json
{
  "filePath": "/home/ubuntu/EG-Maps/scripts/overpass-to-geojson.js",
  "content": "#!/usr/bin/env node\n/**\n * Converts Overpass API JSON output to GeoJSON.\n * Handles ways (polygons/lines) and relations (multipolygons).\n *\n * Usage:\n *   node scripts/overpass-to-geojson.js <input.json> <output.geojson> [--type polygon|line|auto]\n */\nconst fs = require('fs');\n\nconst args = process.argv.slice(2);\nif (args.length < 2) {\n  console.error('Usage: overpass-to-geojson.js <input.json> <output.geojson> [--type polygon|line|auto]');\n  process.exit(1);\n}\n\nconst inputPath = args[0];\nconst outputPath = args[1];\nconst typeFlag = args.indexOf('--type');\nconst forcedType = typeFlag !== -1 ? args[typeFlag + 1] : 'auto';\n\nconst data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));\nconst elements = data.elements || [];\n\n// Build node lookup\nconst nodeLookup = new Map();\nfor (const el of elements) {\n  if (el.type === 'node') {\n    nodeLookup.set(el.id, [el.lon, el.lat]);\n  }\n}\n\nfunction getWayCoords(way) {\n  if (way.geometry) {\n    return way.geometry.map(p => [p.lon, p.lat]);\n  }\n  if (way.nodes) {\n    return way.nodes.map(id => nodeLookup.get(id)).filter(Boolean);\n  }\n  return [];\n}\n\nfunction classifyWater(tags) {\n  if (tags.waterway === 'river' || tags.waterway === 'canal') return 'river';\n  if (tags.waterway === 'stream' || tags.waterway === 'brook' || tags.waterway === 'ditch') return 'stream';\n  if (tags.water === 'reservoir') return 'reservoir';\n  if (tags.water === 'lake') return 'lake';\n  if (tags.water === 'pond') return 'pond';\n  if (tags.natural === 'water') return 'water';\n  if (tags.waterway) return tags.waterway;\n  return 'unknown';\n}\n\nfunction isClosed(coords) {\n  if (coords.length < 4) return false;\n  const first = coords[0];\n  const last = coords[coords.length - 1];\n  return first[0] === last[0] && first[1] === last[1];\n}\n\nfunction computeAreaKm2(coords) {\n  // Shoelace formula for polygon area\n  if (!isClosed(coords)) return 0;\n  const pts = coords.slice(0, -1);\n  let area = 0;\n  for (let i = 0; i < pts.length; i++) {\n    const j = (i + 1) % pts.length;\n    area += pts[i][0] * pts[j][1];\n    area -= pts[j][0] * pts[i][1];\n  }\n  return Math.abs(area / 2) * 111.32 * 111.32 * Math.cos(-22 * Math.PI / 180);\n}\n\nfunction computeLengthKm(coords) {\n  let len = 0;\n  for (let i = 1; i < coords.length; i++) {\n    const [lon1, lat1] = coords[i - 1];\n    const [lon2, lat2] = coords[i];\n    const dLat = (lat2 - lat1) * Math.PI / 180;\n    const dLon = (lon2 - lon1) * Math.PI / 180;\n    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;\n    len += 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));\n  }\n  return len;\n}\n\nconst features = [];\n\nfor (const el of elements) {\n  if (el.type !== 'way' && el.type !== 'relation') continue;\n  if (!el.tags) continue;\n\n  const tags = el.tags;\n  const name = tags.name || tags['name:pt'] || tags['name:en'] || '';\n  const waterType = classifyWater(tags);\n\n  // Determine geometry type\n  let geomType;\n  let coords;\n\n  if (el.type === 'way') {\n    coords = getWayCoords(el);\n    if (coords.length < 2) continue;\n    if (isClosed(coords) && (forcedType === 'polygon' || forcedType === 'auto')) {\n      geomType = 'Polygon';\n      coords = [coords]; // GeoJSON polygon wrapping\n    } else if (forcedType === 'line' || (!isClosed(coords))) {\n      geomType = 'LineString';\n    } else {\n      geomType = 'LineString';\n    }\n  } else if (el.type === 'relation') {\n    // Simple relation handling - skip complex multipolygons for now\n    // Relations with outer ways\n    if (tags.type === 'multipolygon' || tags.type === 'boundary') {\n      continue; // Skip complex multipolygons\n    }\n    continue;\n  }\n\n  if (!coords || (Array.isArray(coords) && coords.length === 0)) continue;\n\n  const props = {\n    osm_id: el.id,\n    name,\n    water_type: waterType,\n    natural: tags.natural || '',\n    water: tags.water || '',\n    waterway: tags.waterway || '',\n    width: tags.width ? parseFloat(tags.width) : null,\n    depth: tags.depth ? parseFloat(tags.depth) : null,\n    area_km2: geomType === 'Polygon' ? Math.round(computeAreaKm2(coords[0] || coords) * 1000) / 1000 : null,\n    length_km: geomType === 'LineString' ? Math.round(computeLengthKm(coords) * 100) / 100 : null,\n  };\n\n  features.push({\n    type: 'Feature',\n    id: `osm/${el.id}`,\n    properties: props,\n    geometry: { type: geomType, coordinates: coords },\n  });\n}\n\nconst geojson = {\n  type: 'FeatureCollection',\n  features,\n  metadata: {\n    source: 'OpenStreetMap via Overpass API',\n    license: 'ODbL',\n    query_area: '-22.9,-47.5,-20.9,-45.5',\n    generated: new Date().toISOString(),\n    total_features: features.length,\n  },\n};\n\nfs.writeFileSync(outputPath, JSON.stringify(geojson, null, 2));\nconsole.log(`Converted ${elements.length} elements → ${features.length} GeoJSON features → ${outputPath}`);\n\n// Stats by type\nconst byType = {};\nfor (const f of features) {\n  const t = f.properties.water_type;\n  byType[t] = (byType[t] || 0) + 1;\n}\nconsole.log('By type:', JSON.stringify(byType));\n"
}
```

**Output:**
```
Wrote file successfully.
```

---

## Assistant (Build · MiMo V2.5 Free · 20.6s)

_Thinking:_

Now let me create the build-regional-data.ts script that filters the mining claims data to the Poços de Caldas region.

**Tool: write**

**Input:**
```json
{
  "content": "#!/usr/bin/env npx tsx\n/**\n * Build regional data subsets for Poços de Caldas Vulcan Alkaline Plateau.\n *\n * Reads the national-level GeoJSON files and filters to features within\n * 100km of the center point. Also splits into 25km/50km zones.\n *\n * Usage:\n *   npx tsx scripts/build-regional-data.ts\n */\nimport { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'\nimport { join } from 'path'\n\nconst CENTER = { lat: -21.914138005195028, lng: -46.53311955736603 }\n\n// Haversine distance in km\nfunction haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {\n  const R = 6371\n  const dLat = (lat2 - lat1) * Math.PI / 180\n  const dLon = (lon2 - lon1) * Math.PI / 180\n  const a = Math.sin(dLat / 2) ** 2 +\n    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *\n    Math.sin(dLon / 2) ** 2\n  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))\n}\n\nfunction filterByRadius(features: any[], radiusKm: number) {\n  return features.filter(f => {\n    let lat: number, lng: number\n    if (f.geometry?.type === 'Point' && Array.isArray(f.geometry.coordinates)) {\n      ;[lng, lat] = f.geometry.coordinates\n    } else if (f.properties?.lat != null && f.properties?.lon != null) {\n      lat = f.properties.lat\n      lng = f.properties.lon\n    } else if (f.properties?.la != null && f.properties?.lo != null) {\n      lat = f.properties.la\n      lng = f.properties.lo\n    } else {\n      return false\n    }\n    return haversine(CENTER.lat, CENTER.lng, lat, lng) <= radiusKm\n  })\n}\n\nconst PUBLIC = join(import.meta.dirname, '..', 'public', 'data', 'rare-earth')\nconst OUTPUT = join(PUBLIC, 'pococaldas')\nif (!existsSync(OUTPUT)) mkdirSync(OUTPUT, { recursive: true })\n\nconsole.log(`Center: ${CENTER.lat}, ${CENTER.lng}`)\n\n// 1. Points (8.5 MB)\nconsole.log('\\n--- Points ---')\nconst pointsRaw = JSON.parse(readFileSync(join(PUBLIC, 'points.geojson'), 'utf8'))\nconsole.log(`Total features: ${pointsRaw.features.length}`)\n\nconst points100 = filterByRadius(pointsRaw.features, 100)\nconsole.log(`Within 100km: ${points100.length}`)\nwriteFileSync(join(OUTPUT, 'points.geojson'), JSON.stringify({ type: 'FeatureCollection', features: points100 }, null, 2))\n\n// Also save zone-specific subsets for reference\nconst points50 = filterByRadius(pointsRaw.features, 50)\nconst points25 = filterByRadius(pointsRaw.features, 25)\nconsole.log(`Within 50km: ${points50.length}`)\nconsole.log(`Within 25km: ${points25.length}`)\n\n// 2. Overlaps\nconsole.log('\\n--- Overlaps ---')\nconst overlapsPath = join(PUBLIC, 'points_with_overlaps.geojson')\nif (existsSync(overlapsPath)) {\n  const overlapsRaw = JSON.parse(readFileSync(overlapsPath, 'utf8'))\n  const overlaps100 = filterByRadius(overlapsRaw.features, 100)\n  console.log(`Overlaps within 100km: ${overlaps100.length}`)\n  writeFileSync(join(OUTPUT, 'points_overlaps.geojson'), JSON.stringify({ type: 'FeatureCollection', features: overlaps100 }, null, 2))\n} else {\n  console.log('Skipping overlaps (file not found)')\n}\n\n// 3. Polygons\nconsole.log('\\n--- Polygons ---')\nconst polysPath = join(PUBLIC, 'polygons.geojson')\nif (existsSync(polysPath)) {\n  const polysRaw = JSON.parse(readFileSync(polysPath, 'utf8'))\n  console.log(`Total polygons: ${polysRaw.features.length}`)\n  const polys100 = filterByRadius(polysRaw.features, 100)\n  console.log(`Polygons within 100km: ${polys100.length}`)\n  writeFileSync(join(OUTPUT, 'polygons.geojson'), JSON.stringify({ type: 'FeatureCollection', features: polys100 }, null, 2))\n} else {\n  console.log('Skipping polygons (file not found)')\n}\n\n// 4. Protected Areas\nconsole.log('\\n--- Protected Areas ---')\nconst protectedPath = join(PUBLIC, 'protected-areas.geojson')\nif (existsSync(protectedPath)) {\n  const protectedRaw = JSON.parse(readFileSync(protectedPath, 'utf8'))\n  console.log(`Total protected: ${protectedRaw.features.length}`)\n  const protected100 = filterByRadius(protectedRaw.features, 100)\n  console.log(`Protected within 100km: ${protected100.length}`)\n  writeFileSync(join(OUTPUT, 'protected-areas.geojson'), JSON.stringify({ type: 'FeatureCollection', features: protected100 }, null, 2))\n} else {\n  console.log('Skipping protected areas (file not found)')\n}\n\n// 5. Deep Analysis (copy with regional stats)\nconsole.log('\\n--- Deep Analysis ---')\nconst analysisPath = join(PUBLIC, 'deep_analysis.json')\nif (existsSync(analysisPath)) {\n  const analysis = JSON.parse(readFileSync(analysisPath, 'utf8'))\n  const regionalAnalysis = {\n    ...analysis,\n    regional: {\n      center: [CENTER.lng, CENTER.lat],\n      radius_km: 100,\n      total_claims_100km: points100.length,\n      total_claims_50km: points50.length,\n      total_claims_25km: points25.length,\n      total_area_ha: points100.reduce((sum: number, f: any) => sum + (f.properties?.area_ha || f.a || 0), 0),\n    },\n    generated: new Date().toISOString(),\n  }\n  writeFileSync(join(OUTPUT, 'deep_analysis.json'), JSON.stringify(regionalAnalysis, null, 2))\n  console.log(`Regional analysis written`)\n}\n\n// Summary\nconsole.log('\\n=== Summary ===')\nconst files = [\n  'points.geojson',\n  'points_overlaps.geojson',\n  'polygons.geojson',\n  'protected-areas.geojson',\n  'deep_analysis.json',\n]\nfor (const f of files) {\n  const fp = join(OUTPUT, f)\n  if (existsSync(fp)) {\n    const stat = require('fs').statSync(fp)\n    console.log(`${f}: ${(stat.size / 1024).toFixed(1)} KB`)\n  }\n}\n",
  "filePath": "/home/ubuntu/EG-Maps/scripts/build-regional-data.ts"
}
```

**Output:**
```
Wrote file successfully.
```

---

## Assistant (Build · MiMo V2.5 Free · 5.6s)

_Thinking:_

Now let me run the Overpass converter on the water data and also run the regional data builder.

**Tool: bash**

**Input:**
```json
{
  "command": "cd /home/ubuntu/EG-Maps && node scripts/overpass-to-geojson.js /tmp/overpass-water.json public/data/rare-earth/pococaldas/waterbodies.geojson --type polygon",
  "description": "Convert Overpass water bodies to GeoJSON"
}
```

**Output:**
```
file:///home/ubuntu/EG-Maps/scripts/overpass-to-geojson.js:9
const fs = require('fs');
           ^

ReferenceError: require is not defined in ES module scope, you can use import instead
This file is being treated as an ES module because it has a '.js' file extension and '/home/ubuntu/EG-Maps/package.json' contains "type": "module". To treat it as a CommonJS script, rename it to use the '.cjs' file extension.
    at file:///home/ubuntu/EG-Maps/scripts/overpass-to-geojson.js:9:12
    at ModuleJob.run (node:internal/modules/esm/module_job:439:25)
    at async node:internal/modules/esm/loader:633:26
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:101:5)

Node.js v24.17.0

```

**Tool: bash**

**Input:**
```json
{
  "command": "cd /home/ubuntu/EG-Maps && node scripts/overpass-to-geojson.js /tmp/overpass-waterways.json /tmp/waterways-lines.geojson --type line",
  "description": "Convert Overpass waterways to GeoJSON LineStrings"
}
```

**Output:**
```
file:///home/ubuntu/EG-Maps/scripts/overpass-to-geojson.js:9
const fs = require('fs');
           ^

ReferenceError: require is not defined in ES module scope, you can use import instead
This file is being treated as an ES module because it has a '.js' file extension and '/home/ubuntu/EG-Maps/package.json' contains "type": "module". To treat it as a CommonJS script, rename it to use the '.cjs' file extension.
    at file:///home/ubuntu/EG-Maps/scripts/overpass-to-geojson.js:9:12
    at ModuleJob.run (node:internal/modules/esm/module_job:439:25)
    at async node:internal/modules/esm/loader:633:26
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:101:5)

Node.js v24.17.0

```

---

## Assistant (Build · MiMo V2.5 Free · 5.7s)

_Thinking:_

The project uses ES modules. Let me rename the file to .cjs or rewrite it as ESM.

**Tool: bash**

**Input:**
```json
{
  "command": "mv /home/ubuntu/EG-Maps/scripts/overpass-to-geojson.js /home/ubuntu/EG-Maps/scripts/overpass-to-geojson.cjs",
  "description": "Rename to .cjs for CommonJS compatibility"
}
```

**Output:**
```
(no output)
```

---

## Assistant (Build · MiMo V2.5 Free · 12.0s)

_Thinking:_

Now let me run both the water bodies and waterways conversion.

**Tool: bash**

**Input:**
```json
{
  "command": "cd /home/ubuntu/EG-Maps && node scripts/overpass-to-geojson.cjs /tmp/overpass-water.json public/data/rare-earth/pococaldas/waterbodies.geojson --type polygon 2>&1",
  "description": "Convert Overpass water bodies to GeoJSON polygons"
}
```

**Output:**
```
Converted 8021 elements → 7885 GeoJSON features → public/data/rare-earth/pococaldas/waterbodies.geojson
By type: {"water":2242,"lake":2923,"reservoir":736,"pond":1983,"river":1}

```

**Tool: bash**

**Input:**
```json
{
  "command": "cd /home/ubuntu/EG-Maps && node scripts/overpass-to-geojson.cjs /tmp/overpass-waterways.json /tmp/waterways-lines.geojson --type line 2>&1",
  "description": "Convert Overpass waterways to GeoJSON lines"
}
```

**Output:**
```
Converted 14103 elements → 14103 GeoJSON features → /tmp/waterways-lines.geojson
By type: {"river":1112,"stream":12991}

```

---

## Assistant (Build · MiMo V2.5 Free · 29.6s)

_Thinking:_

Got 7885 water body polygons and 14103 waterway lines. Now I need to:
1. Merge the waterbodies and waterways into one file (or keep them separate for different layer types)
2. Run the regional data builder

Let me merge the waterways into the waterbodies file, and also run the regional builder.

Now let me merge waterways into the waterbodies file and run the regional data builder.

**Tool: bash**

**Input:**
```json
{
  "command": "cd /home/ubuntu/EG-Maps && node -e \"\nconst fs = require('fs');\nconst water = JSON.parse(fs.readFileSync('public/data/rare-earth/pococaldas/waterbodies.geojson','utf8'));\nconst ways = JSON.parse(fs.readFileSync('/tmp/waterways-lines.geojson','utf8'));\nwater.features.push(...ways.features);\nwater.metadata.total_features = water.features.length;\nwater.metadata.description = 'Water bodies (polygons) and waterways (lines) from OpenStreetMap';\nfs.writeFileSync('public/data/rare-earth/pococaldas/waterbodies.geojson', JSON.stringify(water, null, 2));\nconsole.log('Merged total:', water.features.length, 'features');\n\"",
  "description": "Merge water bodies and waterways into single GeoJSON"
}
```

**Output:**
```
Merged total: 21988 features

```

**Tool: bash**

**Input:**
```json
{
  "command": "cd /home/ubuntu/EG-Maps && npx tsx scripts/build-regional-data.ts 2>&1",
  "description": "Build regional data subsets for Poços de Caldas",
  "timeout": 120000
}
```

**Output:**
```
npm warn exec The following package was not found and will be installed: tsx@4.22.4
Center: -21.914138005195028, -46.53311955736603

--- Points ---
Total features: 20700
Within 100km: 284
Within 50km: 239
Within 25km: 168

--- Overlaps ---
Overlaps within 100km: 284

--- Polygons ---
Total polygons: 20700
Polygons within 100km: 284

--- Protected Areas ---
Total protected: 18
Protected within 100km: 0

--- Deep Analysis ---
Regional analysis written

=== Summary ===
/home/ubuntu/EG-Maps/scripts/build-regional-data.ts:137
    const stat = require('fs').statSync(fp)
                 ^

ReferenceError: require is not defined in ES module scope, you can use import instead
    at <anonymous> (/home/ubuntu/EG-Maps/scripts/build-regional-data.ts:137:18)
    at ModuleJob.run (node:internal/modules/esm/module_job:439:25)
    at async node:internal/modules/esm/loader:633:26
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:101:5)

Node.js v24.17.0

```

---

## Assistant (Build · MiMo V2.5 Free · 8.0s)

_Thinking:_

The regional data was built successfully:
- 284 mining claims within 100km
- 239 within 50km
- 168 within 25km
- 0 protected areas within 100km (need to check this)

The script errored at the summary step but the data was written. Let me check the output files and fix the script, then move on to the map configuration.

Data built successfully — 284 claims within 100km, 168 within 25km. Let me verify the output files and fix the minor error.

**Tool: bash**

**Input:**
```json
{
  "command": "ls -lh /home/ubuntu/EG-Maps/public/data/rare-earth/pococaldas/",
  "description": "Check regional data file sizes"
}
```

**Output:**
```
total 50M
-rw-rw-r-- 1 ubuntu ubuntu 5.5K Jun 28 20:45 deep_analysis.json
-rw-rw-r-- 1 ubuntu ubuntu 170K Jun 28 20:45 points.geojson
-rw-rw-r-- 1 ubuntu ubuntu 210K Jun 28 20:45 points_overlaps.geojson
-rw-rw-r-- 1 ubuntu ubuntu 415K Jun 28 20:45 polygons.geojson
-rw-rw-r-- 1 ubuntu ubuntu   51 Jun 28 20:45 protected-areas.geojson
-rw-rw-r-- 1 ubuntu ubuntu  50M Jun 28 20:44 waterbodies.geojson

```

---

## Assistant (Build · MiMo V2.5 Free · 7.9s)

_Thinking:_

The protected-areas file is only 51 bytes, meaning there are no protected areas within 100km of the center. Let me check the original protected areas to see if they need to be expanded. Let me also check the protected-areas.geojson content.

**Tool: bash**

**Input:**
```json
{
  "command": "cat /home/ubuntu/EG-Maps/public/data/rare-earth/pococaldas/protected-areas.geojson && echo \"---\" && python3 -c \"\nimport json\nd = json.load(open('/home/ubuntu/EG-Maps/public/data/rare-earth/protected-areas.geojson'))\nprint(f'Total protected areas: {len(d[\\\"features\\\"])}')\nfor f in d['features']:\n    coords = f['geometry']['coordinates']\n    if f['geometry']['type'] == 'Polygon':\n        lng = coords[0][0][0]\n        lat = coords[0][0][1]\n    elif f['geometry']['type'] == 'MultiPolygon':\n        lng = coords[0][0][0][0]\n        lat = coords[0][0][0][1]\n    else:\n        continue\n    import math\n    dlat = (lat - (-21.914)) * math.pi / 180\n    dlon = (lng - (-46.533)) * math.pi / 180\n    a = math.sin(dlat/2)**2 + math.cos(-21.914*math.pi/180)*math.cos(lat*math.pi/180)*math.sin(dlon/2)**2\n    dist = 6371 * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))\n    name = f['properties'].get('name', f['properties'].get('nm_legal', 'unknown'))\n    print(f'  {name}: {dist:.0f}km from center')\n\"",
  "description": "Check protected areas distances from center"
}
```

**Output:**
```
{
  "type": "FeatureCollection",
  "features": []
}---
Total protected areas: 18
  Terra Indígena Xingu: 1470km from center
  Terra Indígena Yanomami: 3344km from center
  Terra Indígena Munduruku: 2097km from center
  Terra Indígena Kayapó: 1726km from center
  Terra Indígena Raposa Serra do Sol: 3357km from center
  Terra Indígena Sararé (Massaco): 1584km from center
  Terra Indígena Capoto/Jarina: 1420km from center
  Quilombo Kalunga (Sítio Histórico e Patrimônio Cultural): 941km from center
  Quilombo do Mimoso: 1061km from center
  Quilombo da Favela (Chapéu Preto): 36km from center
  Quilombo de Paiol de Telha: 397km from center
  Quilombo de Mesquita (GO): 861km from center
  Reserva Extrativista Chico Mendes: 2756km from center
  Parque Nacional dos Lençóis Maranhenses: 2189km from center
  Terra Indígena Krahô (TIs Kraolandia e Itacaiúnas): 1609km from center
  Quilombo Ribeirão Grande / Terra Seca: 1126km from center
  Terra Indígena Paresi: 1574km from center
  Quilombo do Povo do Livramento: 281km from center

```

---

## Assistant (Build · MiMo V2.5 Free · 13.5s)

_Thinking:_

I see - the nearest protected area is "Quilombo da Favela (Chapéu Preto)" at 36km. But my Haversine calculation showed 0 results within 100km. Let me check why - the issue might be that the protected areas are stored as Polygons/MultiPolygons and the distance calculation is to the first coordinate, not the centroid. But 36km should be within 100km.

Let me look at the filter function more carefully. The issue might be with how the coordinates are accessed for MultiPolygon geometries.

**Tool: bash**

**Input:**
```json
{
  "command": "python3 -c \"\nimport json, math\nd = json.load(open('/home/ubuntu/EG-Maps/public/data/rare-earth/protected-areas.geojson'))\nCENTER = (-21.914138005195028, -46.53311955736603)\n\ndef haversine(lat1, lon1, lat2, lon2):\n    R = 6371\n    dlat = (lat2 - lat1) * math.pi / 180\n    dlon = (lon2 - lon1) * math.pi / 180\n    a = math.sin(dlat/2)**2 + math.cos(lat1*math.pi/180)*math.cos(lat2*math.pi/180)*math.sin(dlon/2)**2\n    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))\n\ndef get_centroid(geom):\n    if geom['type'] == 'Polygon':\n        pts = geom['coordinates'][0]\n    elif geom['type'] == 'MultiPolygon':\n        pts = geom['coordinates'][0][0]\n    else:\n        return None, None\n    lats = [p[1] for p in pts]\n    lngs = [p[0] for p in pts]\n    return sum(lats)/len(lats), sum(lngs)/len(lngs)\n\nfor f in d['features']:\n    lat, lng = get_centroid(f['geometry'])\n    if lat and lng:\n        dist = haversine(CENTER[0], CENTER[1], lat, lng)\n        name = f['properties'].get('name', f['properties'].get('nm_legal', 'unknown'))\n        if dist < 150:\n            print(f'  {name}: {dist:.0f}km (centroid lat={lat:.4f}, lng={lng:.4f})')\n\"",
  "description": "Check protected areas by centroid distance"
}
```

**Output:**
```
  Quilombo da Favela (Chapéu Preto): 31km (centroid lat=-21.6400, lng=-46.5600)

```

---

## Assistant (Build · MiMo V2.5 Free · 6.9s)

_Thinking:_

So there IS one protected area within 100km - "Quilombo da Favela (Chapéu Preto)" at 31km. The issue in my TypeScript script is that the `filterByRadius` function is checking for Point geometry first, then for `lat`/`lon` or `la`/`lo` properties, but the protected areas have Polygon/MultiPolygon geometries. I need to fix the script to compute centroids for non-Point geometries.

Let me fix the build-regional-data.ts and re-run it.

Found the bug — the filter function doesn't handle Polygon/MultiPolygon centroids. Let me fix and re-run.

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/ubuntu/EG-Maps/scripts/build-regional-data.ts",
  "offset": 1,
  "limit": 50
}
```

**Output:**
```
<path>/home/ubuntu/EG-Maps/scripts/build-regional-data.ts</path>
<type>file</type>
<content>
1: #!/usr/bin/env npx tsx
2: /**
3:  * Build regional data subsets for Poços de Caldas Vulcan Alkaline Plateau.
4:  *
5:  * Reads the national-level GeoJSON files and filters to features within
6:  * 100km of the center point. Also splits into 25km/50km zones.
7:  *
8:  * Usage:
9:  *   npx tsx scripts/build-regional-data.ts
10:  */
11: import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
12: import { join } from 'path'
13: 
14: const CENTER = { lat: -21.914138005195028, lng: -46.53311955736603 }
15: 
16: // Haversine distance in km
17: function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
18:   const R = 6371
19:   const dLat = (lat2 - lat1) * Math.PI / 180
20:   const dLon = (lon2 - lon1) * Math.PI / 180
21:   const a = Math.sin(dLat / 2) ** 2 +
22:     Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
23:     Math.sin(dLon / 2) ** 2
24:   return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
25: }
26: 
27: function filterByRadius(features: any[], radiusKm: number) {
28:   return features.filter(f => {
29:     let lat: number, lng: number
30:     if (f.geometry?.type === 'Point' && Array.isArray(f.geometry.coordinates)) {
31:       ;[lng, lat] = f.geometry.coordinates
32:     } else if (f.properties?.lat != null && f.properties?.lon != null) {
33:       lat = f.properties.lat
34:       lng = f.properties.lon
35:     } else if (f.properties?.la != null && f.properties?.lo != null) {
36:       lat = f.properties.la
37:       lng = f.properties.lo
38:     } else {
39:       return false
40:     }
41:     return haversine(CENTER.lat, CENTER.lng, lat, lng) <= radiusKm
42:   })
43: }
44: 
45: const PUBLIC = join(import.meta.dirname, '..', 'public', 'data', 'rare-earth')
46: const OUTPUT = join(PUBLIC, 'pococaldas')
47: if (!existsSync(OUTPUT)) mkdirSync(OUTPUT, { recursive: true })
48: 
49: console.log(`Center: ${CENTER.lat}, ${CENTER.lng}`)
50: 

(Showing lines 1-50 of 140. Use offset=51 to continue.)
</content>
```

---

## Assistant (Build · MiMo V2.5 Free · 12.2s)

_Thinking:_

I need to fix the `filterByRadius` function to handle Polygon and MultiPolygon geometries by computing centroids. Let me edit the file.

**Tool: edit**

**Input:**
```json
{
  "filePath": "/home/ubuntu/EG-Maps/scripts/build-regional-data.ts",
  "oldString": "function filterByRadius(features: any[], radiusKm: number) {\n  return features.filter(f => {\n    let lat: number, lng: number\n    if (f.geometry?.type === 'Point' && Array.isArray(f.geometry.coordinates)) {\n      ;[lng, lat] = f.geometry.coordinates\n    } else if (f.properties?.lat != null && f.properties?.lon != null) {\n      lat = f.properties.lat\n      lng = f.properties.lon\n    } else if (f.properties?.la != null && f.properties?.lo != null) {\n      lat = f.properties.la\n      lng = f.properties.lo\n    } else {\n      return false\n    }\n    return haversine(CENTER.lat, CENTER.lng, lat, lng) <= radiusKm\n  })\n}",
  "newString": "function getCentroid(geometry: any): { lat: number; lng: number } | null {\n  if (!geometry) return null\n  if (geometry.type === 'Point') {\n    return { lng: geometry.coordinates[0], lat: geometry.coordinates[1] }\n  }\n  let pts: number[][]\n  if (geometry.type === 'Polygon') {\n    pts = geometry.coordinates[0]\n  } else if (geometry.type === 'MultiPolygon') {\n    pts = geometry.coordinates[0][0]\n  } else {\n    return null\n  }\n  if (!pts || !pts.length) return null\n  const lats = pts.map((p: number[]) => p[1])\n  const lngs = pts.map((p: number[]) => p[0])\n  return { lat: lats.reduce((a: number, b: number) => a + b, 0) / lats.length, lng: lngs.reduce((a: number, b: number) => a + b, 0) / lngs.length }\n}\n\nfunction filterByRadius(features: any[], radiusKm: number) {\n  return features.filter(f => {\n    let lat: number, lng: number\n    // Try geometry centroid first (works for Point, Polygon, MultiPolygon)\n    const centroid = getCentroid(f.geometry)\n    if (centroid) {\n      lat = centroid.lat\n      lng = centroid.lng\n    } else if (f.properties?.lat != null && f.properties?.lon != null) {\n      lat = f.properties.lat\n      lng = f.properties.lon\n    } else if (f.properties?.la != null && f.properties?.lo != null) {\n      lat = f.properties.la\n      lng = f.properties.lo\n    } else {\n      return false\n    }\n    return haversine(CENTER.lat, CENTER.lng, lat, lng) <= radiusKm\n  })\n}"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · MiMo V2.5 Free · 5.2s)

_Thinking:_

Also fix the `require('fs')` issue at the end of the script.

**Tool: edit**

**Input:**
```json
{
  "filePath": "/home/ubuntu/EG-Maps/scripts/build-regional-data.ts",
  "oldString": "    const stat = require('fs').statSync(fp)",
  "newString": "    const stat = { size: readFileSync(fp).length }"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · MiMo V2.5 Free · 23.8s)

_Thinking:_

Now let me re-run the script.

**Tool: bash**

**Input:**
```json
{
  "command": "cd /home/ubuntu/EG-Maps && npx tsx scripts/build-regional-data.ts 2>&1",
  "description": "Re-run regional data builder with fixed centroid logic",
  "timeout": 120000
}
```

**Output:**
```
Center: -21.914138005195028, -46.53311955736603

--- Points ---
Total features: 20700
Within 100km: 284
Within 50km: 239
Within 25km: 168

--- Overlaps ---
Overlaps within 100km: 284

--- Polygons ---
Total polygons: 20700
Polygons within 100km: 284

--- Protected Areas ---
Total protected: 18
Protected within 100km: 1

--- Deep Analysis ---
Regional analysis written

=== Summary ===
points.geojson: 169.9 KB
points_overlaps.geojson: 209.9 KB
polygons.geojson: 414.6 KB
protected-areas.geojson: 0.9 KB
deep_analysis.json: 5.5 KB

```

---

## Assistant (Build · MiMo V2.5 Free · 12.4s)

_Thinking:_

Now we have:
- 284 mining claims within 100km
- 239 within 50km
- 168 within 25km
- 1 protected area within 100km (Quilombo da Favela)
- Regional deep analysis

And the waterbodies.geojson is 50MB which is too large. I need to simplify it. Let me also simplify the waterbodies to be within 100km of the center and reduce vertex count.

Regional data is built. The waterbodies file is 50MB — too large. Let me simplify it to the 100km zone.

**Tool: todowrite**

**Input:**
```json
{
  "todos": [
    {
      "content": "Run Overpass query to download waterbodies GeoJSON data",
      "priority": "high",
      "status": "completed"
    },
    {
      "content": "Create scripts/overpass-to-geojson.js converter",
      "priority": "high",
      "status": "completed"
    },
    {
      "content": "Create scripts/build-regional-data.ts for Poços de Caldas subsets",
      "priority": "high",
      "status": "completed"
    },
    {
      "content": "Run regional data builder, verify output files",
      "priority": "high",
      "status": "completed"
    },
    {
      "content": "Simplify waterbodies.geojson to 100km zone + reduce vertices",
      "priority": "high",
      "status": "in_progress"
    },
    {
      "content": "Modify UnifiedMap.vue: map style, center, zoom for Poços de Caldas",
      "priority": "high",
      "status": "pending"
    },
    {
      "content": "Create composables/useVulcanCircles.ts (3 concentric circles)",
      "priority": "high",
      "status": "pending"
    },
    {
      "content": "Modify composables/useRareEarthData.ts: region param + loadFullBrazil",
      "priority": "high",
      "status": "pending"
    },
    {
      "content": "Modify useRareEarthLayers.ts: water layers + circle layers",
      "priority": "high",
      "status": "pending"
    },
    {
      "content": "Modify index.vue: regional defaults, expand button, integrate layers",
      "priority": "high",
      "status": "pending"
    },
    {
      "content": "Create GitHub repo for LFS photo storage",
      "priority": "medium",
      "status": "pending"
    },
    {
      "content": "Set up Supabase table + Google OAuth config",
      "priority": "medium",
      "status": "pending"
    },
    {
      "content": "Create composables/useObservatoryUpdates.ts (localStorage + sync)",
      "priority": "medium",
      "status": "pending"
    },
    {
      "content": "Create composables/usePhotoUpload.ts",
      "priority": "medium",
      "status": "pending"
    },
    {
      "content": "Create Supabase Edge Functions (submit-update, sync-updates)",
      "priority": "medium",
      "status": "pending"
    },
    {
      "content": "Create components/observatory/ContributionPanel.vue",
      "priority": "medium",
      "status": "pending"
    },
    {
      "content": "Create components/observatory/MonitoringDashboard.vue",
      "priority": "medium",
      "status": "pending"
    },
    {
      "content": "Integrate contributions into ClaimPopup.vue",
      "priority": "medium",
      "status": "pending"
    },
    {
      "content": "Add i18n translation keys (en + other locales)",
      "priority": "medium",
      "status": "pending"
    },
    {
      "content": "Run lint + typecheck, fix any errors",
      "priority": "high",
      "status": "pending"
    }
  ]
}
```

**Output:**
```
[
  {
    "content": "Run Overpass query to download waterbodies GeoJSON data",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "Create scripts/overpass-to-geojson.js converter",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "Create scripts/build-regional-data.ts for Poços de Caldas subsets",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "Run regional data builder, verify output files",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "Simplify waterbodies.geojson to 100km zone + reduce vertices",
    "status": "in_progress",
    "priority": "high"
  },
  {
    "content": "Modify UnifiedMap.vue: map style, center, zoom for Poços de Caldas",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Create composables/useVulcanCircles.ts (3 concentric circles)",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Modify composables/useRareEarthData.ts: region param + loadFullBrazil",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Modify useRareEarthLayers.ts: water layers + circle layers",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Modify index.vue: regional defaults, expand button, integrate layers",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Create GitHub repo for LFS photo storage",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "Set up Supabase table + Google OAuth config",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "Create composables/useObservatoryUpdates.ts (localStorage + sync)",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "Create composables/usePhotoUpload.ts",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "Create Supabase Edge Functions (submit-update, sync-updates)",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "Create components/observatory/ContributionPanel.vue",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "Create components/observatory/MonitoringDashboard.vue",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "Integrate contributions into ClaimPopup.vue",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "Add i18n translation keys (en + other locales)",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "Run lint + typecheck, fix any errors",
    "status": "pending",
    "priority": "high"
  }
]
```

---

## Assistant (Build · MiMo V2.5 Free · 18.2s)

_Thinking:_

I need to simplify the waterbodies data - filter to within 100km and reduce vertex count. Let me create a script to do that, and then move on to the core code changes.

**Tool: bash**

**Input:**
```json
{}
```

**Error:**
```
Tool execution aborted
```

---

## User

do not edit directly UnifiedMaps, but create an other that use the same composes to render the map satellite, but with lock min zoom in there, that can be switched to whole country view -- continue all

---

## Assistant (Build · MiMo V2.5 Free · 16.3s)

_Thinking:_

The user wants me to:
1. NOT edit UnifiedMap.vue directly
2. Create a NEW component that wraps/uses the same composables as UnifiedMap but with the Poços de Caldas config
3. This new component should have locked min zoom and be able to switch to whole country view
4. Continue with everything else

Let me revise my approach:
- Create a new `VulcanMap.vue` component that extends or wraps UnifiedMap's functionality
- It uses the same composables (useRareEarthLayers, useRareEarthController, etc.)
- Default view: Poços de Caldas at zoom 11.5, min zoom locked to 8
- Has a "Load all Brazil" mode that expands to national view
- Keep UnifiedMap.vue untouched

Let me also simplify the waterbodies file first, then proceed with all the new files.

Got it — I'll create a new `VulcanMap.vue` component that wraps the same composables, never touch UnifiedMap.vue. Let me continue everything.

**Tool: bash**

**Input:**
```json
{
  "command": "cd /home/ubuntu/EG-Maps && node -e \"\nconst fs = require('fs');\nconst math = require ? Math : null; // just use inline\n\nfunction haversine(lat1, lon1, lat2, lon2) {\n  const R = 6371;\n  const dLat = (lat2 - lat1) * Math.PI / 180;\n  const dLon = (lon2 - lon1) * Math.PI / 180;\n  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;\n  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));\n}\n\nfunction getCentroid(geometry) {\n  if (!geometry) return null;\n  if (geometry.type === 'Point') return { lat: geometry.coordinates[1], lng: geometry.coordinates[0] };\n  let pts;\n  if (geometry.type === 'Polygon') pts = geometry.coordinates[0];\n  else if (geometry.type === 'MultiPolygon') pts = geometry.coordinates[0][0];\n  else return null;\n  if (!pts || !pts.length) return null;\n  return { lat: pts.reduce((a,p)=>a+p[1],0)/pts.length, lng: pts.reduce((a,p)=>a+p[0],0)/pts.length };\n}\n\nfunction simplifyRing(coords, tolerance) {\n  if (coords.length <= 5) return coords;\n  const result = [coords[0]];\n  for (let i = 1; i < coords.length - 1; i++) {\n    const prev = result[result.length - 1];\n    const next = coords[i + 1];\n    const dx = coords[i][0] - prev[0];\n    const dy = coords[i][1] - prev[1];\n    const dnx = next[0] - coords[i][0];\n    const dny = next[1] - coords[i][1];\n    const cross = Math.abs(dx * dny - dy * dnx);\n    if (cross > tolerance) result.push(coords[i]);\n  }\n  result.push(coords[coords.length - 1]);\n  return result;\n}\n\nconst CENTER = { lat: -21.914138005195028, lng: -46.53311955736603 };\nconst w = JSON.parse(fs.readFileSync('public/data/rare-earth/pococaldas/waterbodies.geojson','utf8'));\n\nconst filtered = [];\nfor (const f of w.features) {\n  const c = getCentroid(f.geometry);\n  if (!c || haversine(CENTER.lat, CENTER.lng, c.lat, c.lng) > 120) continue;\n  \n  // Simplify polygons\n  if (f.geometry.type === 'Polygon') {\n    f.geometry.coordinates = f.geometry.coordinates.map(ring => simplifyRing(ring, 0.001));\n  } else if (f.geometry.type === 'MultiPolygon') {\n    f.geometry.coordinates = f.geometry.coordinates.map(poly => poly.map(ring => simplifyRing(ring, 0.001)));\n  }\n  filtered.push(f);\n}\n\nconst out = { type: 'FeatureCollection', features: filtered, metadata: w.metadata };\nout.metadata.total_features = filtered.length;\nout.metadata.description = 'Water bodies within ~120km of Poços de Caldas Alkaline Complex (simplified)';\nfs.writeFileSync('public/data/rare-earth/pococaldas/waterbodies.geojson', JSON.stringify(out));\nconsole.log('Filtered:', w.features.length, '->', filtered.length, 'features');\nconsole.log('Size:', (fs.statSync('public/data/rare-earth/pococaldas/waterbodies.geojson').size / 1024).toFixed(0), 'KB');\n\" 2>&1",
  "description": "Simplify waterbodies to 120km zone with vertex reduction",
  "timeout": 60000
}
```

**Output:**
```
Filtered: 21988 -> 7046 features
Size: 2169 KB

```

---

## Assistant (Build · MiMo V2.5 Free · 11.6s)

_Thinking:_

Good - reduced from 50MB to 2.2MB. Now let me proceed with creating all the code files. Let me start with the core composables and then the new VulcanMap component.

I need to:
1. Create `composables/useVulcanCircles.ts` - 3 concentric circles
2. Create `composables/useRareEarthData.ts` modifications (region param)
3. Create `composables/useWaterLayers.ts` - water layer management
4. Create `components/VulcanMap.vue` - new map component
5. Modify `pages/observatory-of-vulcan/index.vue` to use VulcanMap
6. Create user contribution composables and components
7. Create Supabase edge functions
8. Add i18n keys

Let me proceed efficiently - I'll create the composables first, then the components.

Waterbodies reduced to 2.2MB. Now creating all the composables and components.

**Tool: todowrite**

**Input:**
```json
{
  "todos": [
    {
      "content": "Run Overpass query to download waterbodies GeoJSON data",
      "priority": "high",
      "status": "completed"
    },
    {
      "content": "Create scripts/overpass-to-geojson.js converter",
      "priority": "high",
      "status": "completed"
    },
    {
      "content": "Create scripts/build-regional-data.ts for Poços de Caldas subsets",
      "priority": "high",
      "status": "completed"
    },
    {
      "content": "Run regional data builder, verify output files",
      "priority": "high",
      "status": "completed"
    },
    {
      "content": "Simplify waterbodies.geojson to 100km zone + reduce vertices",
      "priority": "high",
      "status": "completed"
    },
    {
      "content": "Create composables/useVulcanCircles.ts (3 concentric circles)",
      "priority": "high",
      "status": "in_progress"
    },
    {
      "content": "Modify composables/useRareEarthData.ts: region param + loadFullBrazil",
      "priority": "high",
      "status": "pending"
    },
    {
      "content": "Create composables/useWaterLayers.ts for water layer management",
      "priority": "high",
      "status": "pending"
    },
    {
      "content": "Create components/VulcanMap.vue (new map, wraps same composables)",
      "priority": "high",
      "status": "pending"
    },
    {
      "content": "Modify index.vue: use VulcanMap, regional defaults, expand button",
      "priority": "high",
      "status": "pending"
    },
    {
      "content": "Create GitHub repo for LFS photo storage",
      "priority": "medium",
      "status": "pending"
    },
    {
      "content": "Set up Supabase table + Google OAuth config",
      "priority": "medium",
      "status": "pending"
    },
    {
      "content": "Create composables/useObservatoryUpdates.ts (localStorage + sync)",
      "priority": "medium",
      "status": "pending"
    },
    {
      "content": "Create composables/usePhotoUpload.ts",
      "priority": "medium",
      "status": "pending"
    },
    {
      "content": "Create Supabase Edge Functions (submit-update, sync-updates)",
      "priority": "medium",
      "status": "pending"
    },
    {
      "content": "Create components/observatory/ContributionPanel.vue",
      "priority": "medium",
      "status": "pending"
    },
    {
      "content": "Create components/observatory/MonitoringDashboard.vue",
      "priority": "medium",
      "status": "pending"
    },
    {
      "content": "Integrate contributions into ClaimPopup.vue",
      "priority": "medium",
      "status": "pending"
    },
    {
      "content": "Add i18n translation keys (en + other locales)",
      "priority": "medium",
      "status": "pending"
    },
    {
      "content": "Run lint + typecheck, fix any errors",
      "priority": "high",
      "status": "pending"
    }
  ]
}
```

**Output:**
```
[
  {
    "content": "Run Overpass query to download waterbodies GeoJSON data",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "Create scripts/overpass-to-geojson.js converter",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "Create scripts/build-regional-data.ts for Poços de Caldas subsets",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "Run regional data builder, verify output files",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "Simplify waterbodies.geojson to 100km zone + reduce vertices",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "Create composables/useVulcanCircles.ts (3 concentric circles)",
    "status": "in_progress",
    "priority": "high"
  },
  {
    "content": "Modify composables/useRareEarthData.ts: region param + loadFullBrazil",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Create composables/useWaterLayers.ts for water layer management",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Create components/VulcanMap.vue (new map, wraps same composables)",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Modify index.vue: use VulcanMap, regional defaults, expand button",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Create GitHub repo for LFS photo storage",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "Set up Supabase table + Google OAuth config",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "Create composables/useObservatoryUpdates.ts (localStorage + sync)",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "Create composables/usePhotoUpload.ts",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "Create Supabase Edge Functions (submit-update, sync-updates)",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "Create components/observatory/ContributionPanel.vue",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "Create components/observatory/MonitoringDashboard.vue",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "Integrate contributions into ClaimPopup.vue",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "Add i18n translation keys (en + other locales)",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "Run lint + typecheck, fix any errors",
    "status": "pending",
    "priority": "high"
  }
]
```

---

## Assistant (Build · MiMo V2.5 Free · 20.3s)

_Thinking:_

Let me now create all the composables and components in parallel where possible. I'll create:

1. `composables/useVulcanCircles.ts` - 3 concentric circles
2. Modify `composables/useRareEarthData.ts` - add region support
3. Create `composables/useWaterLayers.ts` - water layer management
4. Create `components/VulcanMap.vue` - new map component

Let me start creating these files.

Now creating the core composables and the new VulcanMap component. I'll work on multiple files in parallel.

**Tool: write**

**Input:**
```json
{
  "content": "import type { Map as MapLibreMap } from 'maplibre-gl'\nimport maplibregl from 'maplibre-gl'\n\nexport interface VulcanCircle {\n  radiusKm: number\n  color: string\n  label: string\n  fillOpacity: number\n  labelKey: string\n}\n\nexport const VULCAN_CENTER: [number, number] = [-46.53311955736603, -21.914138005195028]\n\nexport const VULCAN_CIRCLES: VulcanCircle[] = [\n  { radiusKm: 25,  color: '#e74c3c', label: 'Core Zone',      fillOpacity: 0.08, labelKey: 'observatory.regional.coreZone' },\n  { radiusKm: 50,  color: '#f39c12', label: 'Extended Zone',   fillOpacity: 0.05, labelKey: 'observatory.regional.extendedZone' },\n  { radiusKm: 100, color: '#27ae60', label: 'Regional Zone',   fillOpacity: 0.03, labelKey: 'observatory.regional.regionalZone' },\n]\n\nconst SOURCE_ID = 'vulcan-circles'\nconst LAYER_PREFIX = 'vulcan-circle'\n\nfunction generateCirclePolygon(center: [number, number], radiusKm: number, points = 64): number[][] {\n  const [cx, cy] = center\n  const coords: number[][] = []\n  for (let i = 0; i <= points; i++) {\n    const angle = (i / points) * 2 * Math.PI\n    const dLat = (radiusKm / 6371) * (180 / Math.PI)\n    const dLng = dLat / Math.cos(cy * Math.PI / 180)\n    const lat = cy + dLat * Math.cos(angle)\n    const lng = cx + dLng * Math.sin(angle)\n    coords.push([lng, lat])\n  }\n  return coords\n}\n\nexport function setupVulcanCircles(map: maplibregl.Map): () => void {\n  if (map.getSource(SOURCE_ID)) return () => {}\n\n  const features = VULCAN_CIRCLES.map((circle, i) => ({\n    type: 'Feature' as const,\n    id: i,\n    properties: {\n      radiusKm: circle.radiusKm,\n      color: circle.color,\n      label: circle.label,\n      fillOpacity: circle.fillOpacity,\n    },\n    geometry: {\n      type: 'Polygon' as const,\n      coordinates: [generateCirclePolygon(VULCAN_CENTER, circle.radiusKm)],\n    },\n  }))\n\n  map.addSource(SOURCE_ID, {\n    type: 'geojson',\n    data: { type: 'FeatureCollection', features },\n  })\n\n  // Fills (bottom to top: largest first)\n  for (let i = VULCAN_CIRCLES.length - 1; i >= 0; i--) {\n    const circle = VULCAN_CIRCLES[i]\n    map.addLayer({\n      id: `${LAYER_PREFIX}-fill-${i}`,\n      type: 'fill',\n      source: SOURCE_ID,\n      filter: ['==', 'radiusKm', circle.radiusKm],\n      paint: {\n        'fill-color': circle.color,\n        'fill-opacity': circle.fillOpacity,\n      },\n    })\n  }\n\n  // Lines\n  for (let i = 0; i < VULCAN_CIRCLES.length; i++) {\n    const circle = VULCAN_CIRCLES[i]\n    map.addLayer({\n      id: `${LAYER_PREFIX}-line-${i}`,\n      type: 'line',\n      source: SOURCE_ID,\n      filter: ['==', 'radiusKm', circle.radiusKm],\n      paint: {\n        'line-color': circle.color,\n        'line-width': i === 0 ? 2 : 1.5,\n        'line-opacity': 0.6,\n        'line-dasharray': i === 2 ? [4, 2] : [8, 2],\n      },\n    })\n  }\n\n  // Labels\n  for (let i = 0; i < VULCAN_CIRCLES.length; i++) {\n    const circle = VULCAN_CIRCLES[i]\n    map.addLayer({\n      id: `${LAYER_PREFIX}-label-${i}`,\n      type: 'symbol',\n      source: SOURCE_ID,\n      filter: ['==', 'radiusKm', circle.radiusKm],\n      layout: {\n        'text-field': `${circle.radiusKm}km — ${circle.label}`,\n        'text-size': 10,\n        'text-anchor': 'top',\n        'text-offset': [0, 0.5],\n        'symbol-placement': 'point',\n      },\n      paint: {\n        'text-color': circle.color,\n        'text-opacity': 0.7,\n        'text-halo-color': 'rgba(0,0,0,0.8)',\n        'text-halo-width': 1,\n      },\n    })\n  }\n\n  // Center marker\n  const centerEl = document.createElement('div')\n  centerEl.style.cssText = `\n    width: 14px; height: 14px; border-radius: 50%;\n    background: rgba(231,76,60,0.9); border: 2px solid rgba(255,255,255,0.8);\n    box-shadow: 0 0 12px rgba(231,76,60,0.6), inset 0 0 4px rgba(255,255,255,0.3);\n    cursor: pointer; position: relative;\n  `\n  centerEl.title = 'Poços de Caldas — Vulcan Alkaline Complex Center'\n\n  new maplibregl.Marker({ element: centerEl, anchor: 'center' })\n    .setLngLat(VULCAN_CENTER)\n    .addTo(map)\n\n  return () => cleanupVulcanCircles(map)\n}\n\nexport function cleanupVulcanCircles(map: maplibregl.Map) {\n  for (let i = 0; i < VULCAN_CIRCLES.length; i++) {\n    const fillId = `${LAYER_PREFIX}-fill-${i}`\n    const lineId = `${LAYER_PREFIX}-line-${i}`\n    const labelId = `${LAYER_PREFIX}-label-${i}`\n    try { if (map.getLayer(fillId)) map.removeLayer(fillId) } catch {}\n    try { if (map.getLayer(lineId)) map.removeLayer(lineId) } catch {}\n    try { if (map.getLayer(labelId)) map.removeLayer(labelId) } catch {}\n  }\n  try { if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID) } catch {}\n}\n\nexport function setVulcanCirclesVisibility(map: maplibregl.Map, visible: boolean) {\n  const visibility = visible ? 'visible' : 'none'\n  for (let i = 0; i < VULCAN_CIRCLES.length; i++) {\n    const fillId = `${LAYER_PREFIX}-fill-${i}`\n    const lineId = `${LAYER_PREFIX}-line-${i}`\n    const labelId = `${LAYER_PREFIX}-label-${i}`\n    try { if (map.getLayer(fillId)) map.setLayoutProperty(fillId, 'visibility', visibility) } catch {}\n    try { if (map.getLayer(lineId)) map.setLayoutProperty(lineId, 'visibility', visibility) } catch {}\n    try { if (map.getLayer(labelId)) map.setLayoutProperty(labelId, 'visibility', visibility) } catch {}\n  }\n}\n",
  "filePath": "/home/ubuntu/EG-Maps/composables/useVulcanCircles.ts"
}
```

**Output:**
```
Wrote file successfully.
```

---

## Assistant (Build · MiMo V2.5 Free · 8.5s)

_Thinking:_

Now let me modify `useRareEarthData.ts` to add region support, and create the water layers composable. I'll also need to read the existing `useRareEarthLayers.ts` more carefully to understand how to add water layers.

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/ubuntu/EG-Maps/composables/useRareEarthLayers.ts",
  "limit": 100,
  "offset": 80
}
```

**Output:**
```
<path>/home/ubuntu/EG-Maps/composables/useRareEarthLayers.ts</path>
<type>file</type>
<content>
80:       pg: ['+', ['case', ['==', ['get', 'c'], 'pegmatite_associated'], 1, 0]],
81:       hm: ['+', ['case', ['==', ['get', 'c'], 'heavy_mineral_associated'], 1, 0]],
82:       ph: ['+', ['case', ['==', ['get', 'c'], 'phosphate_associated'], 1, 0]],
83:       st: ['+', ['case', ['==', ['get', 'c'], 'strategic_associated'], 1, 0]],
84:       md: ['max', ['get', 'ds']],
85:     },
86:   })
87: 
88:   // Unclustered point layer — individual claims with category color
89:   map.addLayer({
90:     id: 'ree-point-circle',
91:     type: 'circle',
92:     source: REE_SOURCE_POINTS,
93:     filter: ['!', ['has', 'point_count']],
94:     paint: {
95:       'circle-color': ['match', ['get', 'c'],
96:         'direct_ree', '#e74c3c',
97:         'carbonatite_associated', '#f39c12',
98:         'pegmatite_associated', '#27ae60',
99:         'heavy_mineral_associated', '#2980b9',
100:         'phosphate_associated', '#8e44ad',
101:         'strategic_associated', '#e91e63',
102:         '#999',
103:       ],
104:       'circle-radius': [
105:         'interpolate', ['linear'], ['zoom'],
106:         6, 2,
107:         10, 3.5,
108:         14, 5,
109:         18, 7,
110:       ],
111:       'circle-opacity': [
112:         'interpolate', ['linear'], ['zoom'],
113:         6, 0.5,
114:         10, 0.7,
115:         14, 0.9,
116:       ],
117:       'circle-stroke-color': 'rgba(0,0,0,0.5)',
118:       'circle-stroke-width': [
119:         'interpolate', ['linear'], ['zoom'],
120:         6, 0.3,
121:         10, 0.6,
122:         14, 1,
123:       ],
124:     },
125:   })
126: 
127:   // Cluster circle layer with dynamic radius based on count
128:   map.addLayer({
129:     id: 'ree-cluster-circle',
130:     type: 'circle',
131:     source: REE_SOURCE_POINTS,
132:     filter: ['has', 'point_count'],
133:     paint: {
134:       'circle-color': [
135:         'case',
136:         ['>=', ['get', 'point_count'], 100], 'rgba(192,57,43,0.85)',
137:         ['>=', ['get', 'point_count'], 50], 'rgba(231,76,60,0.8)',
138:         ['>=', ['get', 'point_count'], 20], 'rgba(243,156,18,0.75)',
139:         ['>=', ['get', 'point_count'], 5], 'rgba(39,174,96,0.7)',
140:         'rgba(46,204,113,0.65)',
141:       ],
142:       'circle-radius': [
143:         'interpolate', ['linear'], ['sqrt', ['to-number', ['get', 'point_count']]],
144:         1, 6,
145:         10, 16,
146:         50, 28,
147:         100, 40,
148:       ],
149:       'circle-opacity': 0.8,
150:       'circle-stroke-color': 'rgba(255,255,255,0.15)',
151:       'circle-stroke-width': 1,
152:     },
153:   })
154: 
155:   // Cluster count label
156:   map.addLayer({
157:     id: 'ree-cluster-count',
158:     type: 'symbol',
159:     source: REE_SOURCE_POINTS,
160:     filter: ['has', 'point_count'],
161:     layout: {
162:       'text-field': ['get', 'point_count_abbreviated'],
163:       'text-font': ['Open Sans Bold'],
164:       'text-size': [
165:         'interpolate', ['linear'], ['sqrt', ['to-number', ['get', 'point_count']]],
166:         1, 9,
167:         10, 12,
168:         50, 14,
169:         100, 16,
170:       ],
171:     },
172:     paint: {
173:       'text-color': '#fff',
174:       'text-halo-color': 'rgba(0,0,0,0.6)',
175:       'text-halo-width': 1.5,
176:     },
177:   })
178: 
179:   // Heatmap layer for density visualization (togglable)

(Showing lines 80-179 of 833. Use offset=180 to continue.)
</content>
```

---

## Assistant (Build · MiMo V2.5 Free · 8.7s)

_Thinking:_

Let me continue reading the useRareEarthLayers.ts to understand the full layer setup, particularly the protected area layers and the cleanup function, so I can add water layers properly.

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/ubuntu/EG-Maps/composables/useRareEarthLayers.ts",
  "limit": 200,
  "offset": 400
}
```

**Output:**
```
<path>/home/ubuntu/EG-Maps/composables/useRareEarthLayers.ts</path>
<type>file</type>
<content>
400:     addProtectedAreasLayer(map, protectedAreas)
401:   }
402: 
403:   // Track site click/hover handlers for cleanup
404:   const onSiteClick = (e: MapLayerMouseEvent) => {
405:     if (!e.features?.length) return
406:     const p = e.features[0].properties
407:     const dangerScore = p.danger ?? 5
408:     const dColor = dangerScore >= 9 ? '#e74c3c' : dangerScore >= 7 ? '#f39c12' : '#27ae60'
409:     const siteHtml = `<div class="ree-popup-wrapper" style="padding:14px;min-width:200px;position:relative">
410:       <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
411:         <span style="font-size:8px;font-weight:700;padding:2px 8px;border-radius:3px;background:${dColor};color:#fff">${dangerScore.toFixed(1)} Danger</span>
412:         <span style="font-size:7px;padding:2px 6px;border-radius:2px;font-weight:600;background:rgba(192,57,43,0.2);color:#c0392b">CONFLICT ZONE</span>
413:       </div>
414:       <h3 style="margin:0;font-size:13px;font-weight:700;color:#e8e8e8">${escapeHtml(p.name || 'Unknown')}</h3>
415:       <div style="font-size:10px;color:rgba(255,255,255,0.35);margin-top:4px">${escapeHtml(p.tag || '')}</div>
416:     </div>`
417:     new maplibregl.Popup({ offset: 10, closeButton: true, className: 'cyberpunk-popup' })
418:       .setLngLat(e.lngLat)
419:       .setHTML(siteHtml)
420:       .setMaxWidth('none')
421:       .addTo(map)
422:   }
423:   const onSiteEnter = () => { map.getCanvas().style.cursor = 'pointer' }
424:   const onSiteLeave = () => { map.getCanvas().style.cursor = '' }
425:   map.on('click', 'ree-site-label', onSiteClick)
426:   map.on('mouseenter', 'ree-site-label', onSiteEnter)
427:   map.on('mouseleave', 'ree-site-label', onSiteLeave)
428:   cleanups.push(() => {
429:     map.off('click', 'ree-site-label', onSiteClick)
430:     map.off('mouseenter', 'ree-site-label', onSiteEnter)
431:     map.off('mouseleave', 'ree-site-label', onSiteLeave)
432:   })
433: 
434:   // Track protected area click/hover handlers
435:   for (const layerId of ['ree-protected-ti-fill', 'ree-protected-quilombo-fill']) {
436:     const onProtClick = (e: MapLayerMouseEvent) => {
437:       if (!e.features?.length) return
438:       const p = e.features[0].properties
439:       const kind = p.kind === 'ti' ? 'Indigenous Land (Terra Indígena)' : 'Quilombola Territory'
440:       const html = `<div class="ree-popup-wrapper" style="padding:14px;min-width:220px;position:relative">
441:         <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
442:           <span style="font-size:8px;font-weight:700;padding:2px 8px;border-radius:3px;background:${p.kind === 'ti' ? '#c0392b' : '#f39c12'};color:#fff">PROTECTED AREA</span>
443:           <span style="font-size:7px;padding:2px 6px;border-radius:2px;font-weight:600;background:rgba(255,255,255,0.06);color:#888">${escapeHtml(kind)}</span>
444:         </div>
445:         <h3 style="margin:0;font-size:13px;font-weight:700;color:#e8e8e8">${escapeHtml(p.name || 'Unknown')}</h3>
446:         <p style="font-size:10px;color:#888;margin:6px 0 0;line-height:1.45">Mining claims overlapping this territory may violate Free, Prior and Informed Consent (FPIC) under ILO Convention 169.</p>
447:         ${p.source_url ? `<a href="${escapeHtml(p.source_url)}" target="_blank" rel="noopener" style="display:inline-block;margin-top:8px;font-size:10px;color:#5dade2">Source &rarr;</a>` : ''}
448:       </div>`
449:       new maplibregl.Popup({ offset: 8, closeButton: true, className: 'cyberpunk-popup' })
450:         .setLngLat(e.lngLat)
451:         .setHTML(html)
452:         .setMaxWidth('none')
453:         .addTo(map)
454:     }
455:     const onProtEnter = () => { map.getCanvas().style.cursor = 'pointer' }
456:     const onProtLeave = () => { map.getCanvas().style.cursor = '' }
457:     map.on('click', layerId, onProtClick)
458:     map.on('mouseenter', layerId, onProtEnter)
459:     map.on('mouseleave', layerId, onProtLeave)
460:     cleanups.push(() => {
461:       map.off('click', layerId, onProtClick)
462:       map.off('mouseenter', layerId, onProtEnter)
463:       map.off('mouseleave', layerId, onProtLeave)
464:     })
465:   }
466: 
467:   return () => {
468:     cleanups.forEach(fn => fn())
469:     cleanupRareEarthLayers(map)
470:   }
471: }
472: 
473: export function adaptPolygonProps(p: Record<string, unknown>): Record<string, unknown> {
474:   return {
475:     c: p.category,
476:     ds: p.ds ?? p.danger_score ?? 5,
477:     n: p.NOME || p.nome || p.enterprise || 'Polygon',
478:     s: p.SUBS || p.substances || '—',
479:     p: p.PROCESSO || p.processo || '—',
480:     f: p.FASE || p.fase || '—',
481:     u: p.UF || p.uf || '',
482:     a: p.AREA_HA ?? p.area_ha ?? 0,
483:     net: p.network_id || '',
484:     ev: p.ULT_EVENTO || '',
485:     ano: p.ANO ?? p.ano ?? 0,
486:     numero: p.NUMERO ?? p.numero ?? 0,
487:   }
488: }
489: 
490: export function addRareEarthGeoBoundaries(map: MapLibreMap) {
491:   const wb: GeoJSON.FeatureCollection = {
492:     type: 'FeatureCollection',
493:     features: [
494:       { type: 'Feature', properties: { name: 'São Francisco Basin', type: 'basin' }, geometry: { type: 'Polygon', coordinates: [[[-47, -12], [-44, -12], [-42, -13], [-40, -14], [-39, -15.5], [-39.5, -17], [-40, -18.5], [-42, -19.5], [-44, -20], [-46, -20.5], [-48, -19], [-49, -17], [-48.5, -15], [-47.5, -13.5], [-47, -12]]] } },
495:       { type: 'Feature', properties: { name: 'Paranaíba Basin', type: 'basin' }, geometry: { type: 'Polygon', coordinates: [[[-49, -17], [-47.5, -17.5], [-46.5, -18.5], [-46, -19.5], [-47, -20.5], [-48.5, -20.5], [-50, -20], [-51.5, -19], [-51, -17.5], [-50, -17], [-49, -17]]] } },
496:       { type: 'Feature', properties: { name: 'Jequitinhonha Basin', type: 'basin' }, geometry: { type: 'Polygon', coordinates: [[[-42, -15.5], [-40.5, -15.5], [-39.5, -16], [-39.5, -17.5], [-40.5, -18], [-42, -17.5], [-43, -16.5], [-42, -15.5]]] } },
497:       { type: 'Feature', properties: { name: 'Bambuí Aquifer', type: 'aquifer' }, geometry: { type: 'Polygon', coordinates: [[[-49, -15], [-47, -15], [-45, -16], [-44, -18], [-44.5, -20], [-46, -21], [-48.5, -21], [-50, -20], [-51, -18], [-50.5, -16], [-49, -15]]] } },
498:       { type: 'Feature', properties: { name: 'Urucuia Aquifer', type: 'aquifer' }, geometry: { type: 'Polygon', coordinates: [[[-46, -13], [-43.5, -13], [-42, -14.5], [-42.5, -16.5], [-44, -17.5], [-46, -17.5], [-47, -16], [-46, -13]]] } },
499:       { type: 'Feature', properties: { name: 'Poços de Caldas Conflict', type: 'conflict' }, geometry: { type: 'Polygon', coordinates: [[[-47.2, -21.2], [-46, -21.2], [-45.8, -21.8], [-46.2, -22.2], [-47.2, -22.2], [-47.5, -21.8], [-47.2, -21.2]]] } },
500:       { type: 'Feature', properties: { name: 'INB Caldas Nuclear', type: 'nuclear' }, geometry: { type: 'Polygon', coordinates: [[[-47, -21.4], [-46.3, -21.4], [-46.1, -21.9], [-46.5, -22.1], [-47, -22], [-47.2, -21.7], [-47, -21.4]]] } },
501:     ],
502:   }
503:   map.addSource(REE_SOURCE_GEO, { type: 'geojson', data: wb })
504:   map.addLayer({
505:     id: 'ree-geo-fill', type: 'fill', source: REE_SOURCE_GEO,
506:     filter: ['==', ['get', 'type'], 'basin'],
507:     paint: { 'fill-color': '#3498db', 'fill-opacity': 0.05 },
508:   })
509:   map.addLayer({
510:     id: 'ree-geo-aquifer', type: 'fill', source: REE_SOURCE_GEO,
511:     filter: ['==', ['get', 'type'], 'aquifer'],
512:     paint: { 'fill-color': '#9b59b6', 'fill-opacity': 0.07 },
513:   })
514:   map.addLayer({
515:     id: 'ree-geo-conflict', type: 'fill', source: REE_SOURCE_GEO,
516:     filter: ['in', ['get', 'type'], ['literal', ['conflict', 'nuclear']]],
517:     paint: { 'fill-color': '#e74c3c', 'fill-opacity': 0.08 },
518:   })
519:   map.addLayer({
520:     id: 'ree-geo-line', type: 'line', source: REE_SOURCE_GEO,
521:     paint: {
522:       'line-color': ['match', ['get', 'type'], 'basin', '#3498db', 'aquifer', '#9b59b6', 'conflict', '#e74c3c', 'nuclear', '#c0392b', '#3498db'],
523:       'line-width': ['match', ['get', 'type'], 'conflict', 2, 'nuclear', 2, 1],
524:       'line-opacity': 0.4,
525:       'line-dasharray': ['match', ['get', 'type'], 'conflict', ['literal', [2, 2]], 'nuclear', ['literal', [1, 1]], ['literal', [3, 2]]],
526:     },
527:   })
528:   map.addLayer({
529:     id: 'ree-geo-label', type: 'symbol', source: REE_SOURCE_GEO,
530:     layout: {
531:       'text-field': ['get', 'name'],
532:       'text-font': ['Open Sans Regular'],
533:       'text-size': 9,
534:       'text-allow-overlap': true,
535:     },
536:     paint: {
537:       'text-color': ['match', ['get', 'type'], 'basin', '#2980b9', 'aquifer', '#8e44ad', 'conflict', '#c0392b', 'nuclear', '#c0392b', '#2980b9'],
538:       'text-halo-color': 'rgba(255,255,255,0.9)', 'text-halo-width': 1.5,
539:     },
540:   })
541: }
542: 
543: export function addRareEarthConflictSites(map: MapLibreMap) {
544:   const sites: GeoJSON.FeatureCollection = {
545:     type: 'FeatureCollection',
546:     features: [
547:       { type: 'Feature', properties: { name: 'Poços de Caldas', danger: 9.5, tag: 'CONFLICT' }, geometry: { type: 'Point', coordinates: [-46.57, -21.55] } },
548:       { type: 'Feature', properties: { name: 'Araxá', danger: 8.5, tag: 'REE + CBMM' }, geometry: { type: 'Point', coordinates: [-46.94, -19.59] } },
549:       { type: 'Feature', properties: { name: 'Jequié Corridor', danger: 7.5, tag: 'SPECULATION' }, geometry: { type: 'Point', coordinates: [-40.48, -13.85] } },
550:       { type: 'Feature', properties: { name: 'Serra Verde', danger: 9, tag: 'US DFC $565M' }, geometry: { type: 'Point', coordinates: [-48.1, -14.25] } },
551:       { type: 'Feature', properties: { name: 'Aclara Carina', danger: 7, tag: 'State Dept $5M' }, geometry: { type: 'Point', coordinates: [-49.1, -16.7] } },
552:       { type: 'Feature', properties: { name: 'Bambuí Aquifer', danger: 9, tag: 'CONTAMINATION' }, geometry: { type: 'Point', coordinates: [-47, -17.5] } },
553:     ],
554:   }
555:   map.addSource(REE_SOURCE_SITES, { type: 'geojson', data: sites })
556:   map.addLayer({
557:     id: 'ree-site-glow', type: 'circle', source: REE_SOURCE_SITES,
558:     paint: {
559:       'circle-color': '#c0392b',
560:       'circle-radius': 13,
561:       'circle-opacity': 0.2, 'circle-blur': 0.8,
562:     },
563:   })
564:   map.addLayer({
565:     id: 'ree-site-label', type: 'symbol', source: REE_SOURCE_SITES,
566:     layout: {
567:       'text-field': ['format', ['get', 'name'], { 'font-scale': 1.1 }, ' ', ['get', 'tag'], { 'font-scale': 0.75 }],
568:       'text-font': ['Open Sans Regular'],
569:       'text-size': ['interpolate', ['linear'], ['zoom'], 5, 0, 8, 10, 12, 12],
570:       'text-allow-overlap': false, 'text-ignore-placement': false,
571:       'text-anchor': 'bottom', 'text-offset': [0, 2],
572:     },
573:     paint: {
574:       'text-color': '#c0392b', 'text-halo-color': 'rgba(0,0,0,0.9)', 'text-halo-width': 2,
575:       'text-opacity': ['interpolate', ['linear'], ['zoom'], 5, 0, 7, 0.9],
576:     },
577:   })
578: }
579: 
580: export function addRareEarthNetworkLines(map: MapLibreMap, networkFeatures: GeoJSON.FeatureCollection) {
581:   if (!map || !networkFeatures?.features?.length) return
582:   map.addSource(REE_SOURCE_NETWORK, { type: 'geojson', data: networkFeatures })
583:   map.addLayer({
584:     id: 'ree-network-lines', type: 'line', source: REE_SOURCE_NETWORK,
585:     paint: {
586:       'line-color': ['coalesce', ['get', 'color'], '#5dade2'],
587:       'line-width': [
588:         'case',
589:         ['==', ['get', 'connectionType'], 'corporate'], 1.5,
590:         ['==', ['get', 'connectionType'], 'foreign_to_claims'], 1,
591:         0.5,
592:       ],
593:       'line-opacity': 0.4,
594:       'line-dasharray': [
595:         'case',
596:         ['==', ['get', 'connectionType'], 'corporate'], ['literal', [2, 2]],
597:         ['==', ['get', 'connectionType'], 'foreign_to_claims'], ['literal', [4, 2]],
598:         ['literal', [1, 3]],
599:       ],

(Showing lines 400-599 of 833. Use offset=600 to continue.)
</content>
```

---

## Assistant (Build · MiMo V2.5 Free · 4.5s)

_Thinking:_

Let me now read the end of useRareEarthLayers.ts to see the cleanup function and the syncRareEarthLayerVisibility function, which I need to understand for adding water layers.

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/ubuntu/EG-Maps/composables/useRareEarthLayers.ts",
  "limit": 250,
  "offset": 600
}
```

**Output:**
```
<path>/home/ubuntu/EG-Maps/composables/useRareEarthLayers.ts</path>
<type>file</type>
<content>
600:     },
601:   })
602:   map.on('mouseenter', 'ree-network-lines', () => { map.getCanvas().style.cursor = 'pointer' })
603:   map.on('mouseleave', 'ree-network-lines', () => { map.getCanvas().style.cursor = '' })
604: }
605: 
606: export function addBrazilianCitiesLayer(map: MapLibreMap) {
607:   const cityData = citiesToGeoJSON()
608:   map.addSource(REE_SOURCE_CITIES, { type: 'geojson', data: cityData })
609:   map.addLayer({
610:     id: 'ree-cities-label', type: 'symbol', source: REE_SOURCE_CITIES,
611:     layout: {
612:       'text-field': ['get', 'name'],
613:       'text-font': ['Open Sans Regular'],
614:       'text-size': ['interpolate', ['linear'], ['zoom'], 4, 0, 7, 8, 10, 11, 14, 13],
615:       'text-allow-overlap': false,
616:       'text-ignore-placement': false,
617:       'text-anchor': 'bottom',
618:       'text-offset': [0, 1.5],
619:     },
620:     paint: {
621:       'text-color': '#e8e8e8',
622:       'text-halo-color': 'rgba(0,0,0,0.85)',
623:       'text-halo-width': 2,
624:       'text-opacity': ['interpolate', ['linear'], ['zoom'], 4, 0, 7, 0.7, 10, 0.9],
625:     },
626:   })
627: }
628: 
629: export function addProtectedAreasLayer(map: MapLibreMap, protectedAreas: GeoJSON.FeatureCollection) {
630:   if (!protectedAreas?.features?.length) return
631:   map.addSource(REE_SOURCE_PROTECTED, { type: 'geojson', data: protectedAreas })
632: 
633:   map.addLayer({
634:     id: 'ree-protected-ti-fill', type: 'fill', source: REE_SOURCE_PROTECTED,
635:     filter: ['==', ['get', 'kind'], 'ti'],
636:     paint: { 'fill-color': '#c0392b', 'fill-opacity': 0.12 },
637:   })
638:   map.addLayer({
639:     id: 'ree-protected-ti-line', type: 'line', source: REE_SOURCE_PROTECTED,
640:     filter: ['==', ['get', 'kind'], 'ti'],
641:     paint: { 'line-color': '#c0392b', 'line-width': 1.5, 'line-opacity': 0.7, 'line-dasharray': [3, 2] },
642:   })
643:   map.addLayer({
644:     id: 'ree-protected-ti-label', type: 'symbol', source: REE_SOURCE_PROTECTED,
645:     filter: ['==', ['get', 'kind'], 'ti'],
646:     layout: {
647:       'text-field': ['get', 'name'],
648:       'text-font': ['Open Sans Regular'],
649:       'text-size': ['interpolate', ['linear'], ['zoom'], 5, 0, 7, 9, 10, 11],
650:       'text-allow-overlap': false,
651:     },
652:     paint: { 'text-color': '#c0392b', 'text-halo-color': 'rgba(0,0,0,0.9)', 'text-halo-width': 1.5 },
653:   })
654: 
655:   map.addLayer({
656:     id: 'ree-protected-quilombo-fill', type: 'fill', source: REE_SOURCE_PROTECTED,
657:     filter: ['==', ['get', 'kind'], 'quilombo'],
658:     paint: { 'fill-color': '#f39c12', 'fill-opacity': 0.10 },
659:   })
660:   map.addLayer({
661:     id: 'ree-protected-quilombo-line', type: 'line', source: REE_SOURCE_PROTECTED,
662:     filter: ['==', ['get', 'kind'], 'quilombo'],
663:     paint: { 'line-color': '#f39c12', 'line-width': 1.5, 'line-opacity': 0.7, 'line-dasharray': [2, 2] },
664:   })
665:   map.addLayer({
666:     id: 'ree-protected-quilombo-label', type: 'symbol', source: REE_SOURCE_PROTECTED,
667:     filter: ['==', ['get', 'kind'], 'quilombo'],
668:     layout: {
669:       'text-field': ['get', 'name'],
670:       'text-font': ['Open Sans Regular'],
671:       'text-size': ['interpolate', ['linear'], ['zoom'], 5, 0, 7, 9, 10, 11],
672:       'text-allow-overlap': false,
673:     },
674:     paint: { 'text-color': '#f39c12', 'text-halo-color': 'rgba(0,0,0,0.9)', 'text-halo-width': 1.5 },
675:   })
676: 
677:   map.addLayer({
678:     id: 'ree-overlap-glow', type: 'circle', source: REE_SOURCE_POINTS,
679:     filter: ['all', ['!', ['has', 'point_count']], ['>', ['to-number', ['coalesce', ['get', 'overlaps_count'], ['length', ['get', 'ov']]]], 0]],
680:     paint: {
681:       'circle-color': '#ff00ff',
682:       'circle-radius': 14,
683:       'circle-opacity': 0.2, 'circle-blur': 0.8,
684:       'circle-stroke-color': '#ff00ff', 'circle-stroke-width': 1.5, 'circle-stroke-opacity': 0.8,
685:     },
686:   })
687: }
688: 
689: /**
690:  * Add polygon layers to an existing map that was already set up without polygons
691:  * (e.g. when polygon data loads after initial render).
692:  */
693: export function addPolygonLayersToMap(
694:   map: MapLibreMap,
695:   polys: GeoJSON.FeatureCollection,
696:   popup?: RareEarthLayerOptions['popup'],
697: ): (() => void) | null {
698:   if (!polys?.features?.length) return null
699:   if (map.getSource(REE_SOURCE_POLYS)) return null
700: 
701:   const polyColorMatch: DataDrivenPropertyValueSpecification<string> = ['match', ['get', 'category'],
702:     'direct_ree', '#e74c3c', 'carbonatite_associated', '#f39c12',
703:     'pegmatite_associated', '#27ae60', 'heavy_mineral_associated', '#2980b9',
704:     'phosphate_associated', '#8e44ad', 'strategic_associated', '#e91e63', '#999']
705: 
706:   map.addSource(REE_SOURCE_POLYS, { type: 'geojson', data: polys })
707: 
708:   map.addLayer({
709:     id: 'ree-poly-fill', type: 'fill', source: REE_SOURCE_POLYS,
710:     paint: { 'fill-color': polyColorMatch, 'fill-opacity': 0.08 },
711:   })
712:   map.addLayer({
713:     id: 'ree-poly-glow', type: 'line', source: REE_SOURCE_POLYS,
714:     paint: {
715:       'line-color': polyColorMatch,
716:       'line-width': ['interpolate', ['linear'], ['zoom'], 5, 2, 10, 4, 14, 7],
717:       'line-opacity': 0.08, 'line-blur': 2,
718:     },
719:   })
720:   map.addLayer({
721:     id: 'ree-poly-line', type: 'line', source: REE_SOURCE_POLYS,
722:     paint: {
723:       'line-color': polyColorMatch,
724:       'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.5, 10, 1, 14, 2],
725:       'line-opacity': 0.4,
726:     },
727:   })
728:   map.addLayer({
729:     id: 'ree-poly-label', type: 'symbol', source: REE_SOURCE_POLYS,
730:     layout: {
731:       'text-field': ['coalesce', ['get', 'nome'], ['get', 'NOME'], ['get', 'enterprise'], ''],
732:       'text-font': ['Open Sans Regular'],
733:       'text-size': ['interpolate', ['linear'], ['zoom'], 6, 0, 8, 8, 12, 11],
734:       'text-allow-overlap': false, 'text-ignore-placement': false, 'text-anchor': 'center',
735:     },
736:     paint: {
737:       'text-color': '#ccc', 'text-halo-color': 'rgba(0,0,0,0.85)', 'text-halo-width': 1.5,
738:       'text-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0, 9, 0.8],
739:     },
740:   })
741: 
742:   const onPolyClick = (e: MapLayerMouseEvent) => {
743:     if (!e.features?.length) return
744:     const p = e.features[0].properties
745:     if (popup) {
746:       openRareEarthPopup(
747:         map,
748:         adaptPolygonProps(p),
749:         [e.lngLat.lng, e.lngLat.lat],
750:         { onSidebarOpen: popup.onSidebarOpen },
751:         popup.t,
752:         popup.locale,
753:       )
754:       return
755:     }
756:     const html = buildRareEarthPopupHTML(adaptPolygonProps(p))
757:     new maplibregl.Popup({ offset: 10, closeButton: true, className: 'cyberpunk-popup' })
758:       .setLngLat(e.lngLat)
759:       .setHTML(html)
760:       .setMaxWidth('none')
761:       .addTo(map)
762:   }
763:   map.on('click', 'ree-poly-fill', onPolyClick)
764: 
765:   return () => {
766:     map.off('click', 'ree-poly-fill', onPolyClick)
767:     safeRemoveLayer(map, 'ree-poly-fill')
768:     safeRemoveLayer(map, 'ree-poly-glow')
769:     safeRemoveLayer(map, 'ree-poly-line')
770:     safeRemoveLayer(map, 'ree-poly-label')
771:     safeRemoveSource(map, REE_SOURCE_POLYS)
772:   }
773: }
774: 
775: export function syncRareEarthLayerVisibility(map: MapLibreMap, vis: Record<string, boolean>) {
776:   if (!map || !map.isStyleLoaded()) return
777: 
778:   // Point layers - hide when points source has no visible categories
779:   const pointLayers = ['ree-point-circle', 'ree-cluster-circle', 'ree-cluster-count', 'ree-point-hover', 'ree-overlap-glow']
780:   const showPoints = vis['points'] !== false
781:   pointLayers.forEach(id => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', showPoints ? 'visible' : 'none') })
782: 
783:   // Heatmap layer - togglable via 'heatmap' key
784:   if (map.getLayer('ree-heat-layer')) map.setLayoutProperty('ree-heat-layer', 'visibility', vis['heatmap'] !== false ? 'visible' : 'none')
785: 
786:   const polyLayers = ['ree-poly-fill', 'ree-poly-glow', 'ree-poly-line', 'ree-poly-label']
787:   const showPolys = vis['polygons'] !== false
788:   polyLayers.forEach(id => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', showPolys ? 'visible' : 'none') })
789:   const geoFillLayers = ['ree-geo-fill', 'ree-geo-aquifer', 'ree-geo-conflict']
790:   const geoLineLayers = ['ree-geo-line', 'ree-geo-label']
791:   const showWater = vis['water'] !== false
792:   geoFillLayers.forEach(id => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', showWater ? 'visible' : 'none') })
793:   geoLineLayers.forEach(id => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', showWater ? 'visible' : 'none') })
794:   const siteLayers = ['ree-site-glow', 'ree-site-label']
795:   const showSites = vis['sites'] !== false
796:   siteLayers.forEach(id => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', showSites ? 'visible' : 'none') })
797:   if (map.getLayer('ree-network-lines')) map.setLayoutProperty('ree-network-lines', 'visibility', vis['network'] !== false ? 'visible' : 'none')
798: 
799:   const tiLayers = ['ree-protected-ti-fill', 'ree-protected-ti-line', 'ree-protected-ti-label']
800:   tiLayers.forEach(id => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vis['protected_ti'] !== false ? 'visible' : 'none') })
801:   const quilomboLayers = ['ree-protected-quilombo-fill', 'ree-protected-quilombo-line', 'ree-protected-quilombo-label']
802:   quilomboLayers.forEach(id => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vis['protected_quilombo'] !== false ? 'visible' : 'none') })
803:   if (map.getLayer('ree-overlap-glow')) map.setLayoutProperty('ree-overlap-glow', 'visibility', vis['overlaps'] !== false ? 'visible' : 'none')
804:   if (map.getLayer('ree-cities-label')) map.setLayoutProperty('ree-cities-label', 'visibility', vis['cities'] !== false ? 'visible' : 'none')
805: }
806: 
807: export function buildNetworkLinesFromClaims(points: GeoJSON.FeatureCollection, maxPerGroup = 200): GeoJSON.FeatureCollection {
808:   const byNet: Record<string, { lng: number; lat: number; name: string }[]> = {}
809:   for (const f of points.features) {
810:     const props: Record<string, unknown> = (f.properties || {}) as Record<string, unknown>
811:     const net = props.net || props.network_id
812:     if (!net) continue
813:     const netKey = String(net)
814:     if (!byNet[netKey]) byNet[netKey] = []
815:     if (byNet[netKey].length >= maxPerGroup) continue
816:     const coords = (f.geometry as GeoJSON.Point)?.coordinates
817:     if (!Array.isArray(coords) || coords.length < 2) continue
818:     byNet[netKey].push({ lng: coords[0] as number, lat: coords[1] as number, name: String(props.n || props.nome || '') })
819:   }
820:   const features: GeoJSON.Feature[] = []
821:   for (const [netId, nodes] of Object.entries(byNet)) {
822:     if (nodes.length < 2) continue
823:     const hub = nodes[0]
824:     for (let i = 1; i < nodes.length; i++) {
825:       features.push({
826:         type: 'Feature',
827:         properties: { network_id: netId, from: hub.name, to: nodes[i].name },
828:         geometry: { type: 'LineString', coordinates: [[hub.lng, hub.lat], [nodes[i].lng, nodes[i].lat]] },
829:       })
830:     }
831:   }
832:   return { type: 'FeatureCollection', features }
833: }

(End of file - total 833 lines)
</content>
```

---

## Assistant (Build · MiMo V2.5 Free · 19.9s)

_Thinking:_

Now I have a good understanding of the layer structure. Let me now create the water layers composable and modify useRareEarthData.ts. I also need to create the VulcanMap.vue component.

Let me create the files now. I'll create:
1. `composables/useWaterLayers.ts` - Water layer management
2. Modify `composables/useRareEarthData.ts` - Add region support
3. Create `components/VulcanMap.vue` - New map component
4. Create `components/observatory/ContributionPanel.vue` 
5. Create `components/observatory/MonitoringDashboard.vue`

Let me also read the current useRareEarthData.ts to modify it properly.

Now I have full context. Let me create the water layers composable, modify useRareEarthData.ts, and create VulcanMap.vue.

**Tool: write**

**Input:**
```json
{
  "content": "import type { Map as MapLibreMap, MapLayerMouseEvent } from 'maplibre-gl'\nimport maplibregl from 'maplibre-gl'\n\nexport const WATER_SOURCE = 'ree-water'\nexport const WATER_LAYER_IDS = [\n  'ree-water-poly-fill', 'ree-water-poly-line', 'ree-water-poly-label',\n  'ree-water-river-line', 'ree-water-river-label',\n] as const\n\nexport function setupWaterLayers(\n  map: MapLibreMap,\n  waterData: GeoJSON.FeatureCollection,\n): () => void {\n  if (!waterData?.features?.length) return () => {}\n  if (map.getSource(WATER_SOURCE)) return () => {}\n\n  const cleanups: Array<() => void> = []\n\n  map.addSource(WATER_SOURCE, {\n    type: 'geojson',\n    data: waterData,\n  })\n\n  // Water body polygons (lakes, reservoirs, ponds)\n  map.addLayer({\n    id: 'ree-water-poly-fill',\n    type: 'fill',\n    source: WATER_SOURCE,\n    filter: ['==', 'geometryType', 'Polygon'],\n    paint: {\n      'fill-color': '#3498db',\n      'fill-opacity': 0.15,\n    },\n  })\n\n  map.addLayer({\n    id: 'ree-water-poly-line',\n    type: 'line',\n    source: WATER_SOURCE,\n    filter: ['==', 'geometryType', 'Polygon'],\n    paint: {\n      'line-color': '#2980b9',\n      'line-width': 0.8,\n      'line-opacity': 0.5,\n    },\n  })\n\n  map.addLayer({\n    id: 'ree-water-poly-label',\n    type: 'symbol',\n    source: WATER_SOURCE,\n    filter: ['all', ['==', 'geometryType', 'Polygon'], ['has', 'name']],\n    layout: {\n      'text-field': ['get', 'name'],\n      'text-font': ['Open Sans Regular'],\n      'text-size': ['interpolate', ['linear'], ['zoom'], 8, 0, 10, 9, 13, 11],\n      'text-allow-overlap': false,\n      'text-ignore-placement': false,\n    },\n    paint: {\n      'text-color': '#5dade2',\n      'text-halo-color': 'rgba(0,0,0,0.85)',\n      'text-halo-width': 1.5,\n      'text-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0, 10, 0.8],\n    },\n  })\n\n  // Water lines (rivers, streams)\n  map.addLayer({\n    id: 'ree-water-river-line',\n    type: 'line',\n    source: WATER_SOURCE,\n    filter: ['==', 'geometryType', 'LineString'],\n    paint: {\n      'line-color': '#3498db',\n      'line-width': [\n        'interpolate', ['linear'], ['zoom'],\n        8, 0.5,\n        11, 1.5,\n        14, 2.5,\n      ],\n      'line-opacity': 0.6,\n    },\n  })\n\n  map.addLayer({\n    id: 'ree-water-river-label',\n    type: 'symbol',\n    source: WATER_SOURCE,\n    filter: ['all', ['==', 'geometryType', 'LineString'], ['has', 'name']],\n    layout: {\n      'text-field': ['get', 'name'],\n      'text-font': ['Open Sans Regular'],\n      'text-size': ['interpolate', ['linear'], ['zoom'], 9, 0, 11, 8, 14, 10],\n      'symbol-placement': 'line',\n      'text-rotation-alignment': 'map',\n    },\n    paint: {\n      'text-color': '#2980b9',\n      'text-halo-color': 'rgba(0,0,0,0.8)',\n      'text-halo-width': 1,\n      'text-opacity': ['interpolate', ['linear'], ['zoom'], 9, 0, 11, 0.7],\n    },\n  })\n\n  // Click handler for water bodies\n  const onWaterClick = (e: MapLayerMouseEvent) => {\n    if (!e.features?.length) return\n    const p = e.features[0].properties\n    const waterType = p.water_type || p.water || p.waterway || 'water'\n    const name = p.name || 'Unnamed water body'\n    const typeLabel = waterType.charAt(0).toUpperCase() + waterType.slice(1)\n\n    let sizeInfo = ''\n    if (p.area_km2) sizeInfo = `Area: ${p.area_km2} km²`\n    else if (p.length_km) sizeInfo = `Length: ${p.length_km} km`\n\n    const html = `<div class=\"ree-popup-wrapper\" style=\"padding:14px;min-width:200px;position:relative\">\n      <div style=\"display:flex;align-items:center;gap:6px;margin-bottom:6px\">\n        <span style=\"font-size:8px;font-weight:700;padding:2px 8px;border-radius:3px;background:#3498db;color:#fff\">WATER</span>\n        <span style=\"font-size:7px;padding:2px 6px;border-radius:2px;font-weight:600;background:rgba(52,152,219,0.2);color:#5dade2\">${typeLabel}</span>\n      </div>\n      <h3 style=\"margin:0;font-size:13px;font-weight:700;color:#e8e8e8\">${name}</h3>\n      ${sizeInfo ? `<p style=\"font-size:10px;color:#888;margin:6px 0 0\">${sizeInfo}</p>` : ''}\n      ${p.osm_id ? `<a href=\"https://www.openstreetmap.org/${p.osm_id ? 'way' : 'relation'}/${p.osm_id}\" target=\"_blank\" rel=\"noopener\" style=\"display:inline-block;margin-top:8px;font-size:10px;color:#5dade2\">View on OSM &rarr;</a>` : ''}\n    </div>`\n\n    new maplibregl.Popup({ offset: 10, closeButton: true, className: 'cyberpunk-popup' })\n      .setLngLat(e.lngLat)\n      .setHTML(html)\n      .setMaxWidth('none')\n      .addTo(map)\n  }\n\n  const onWaterEnter = () => { map.getCanvas().style.cursor = 'pointer' }\n  const onWaterLeave = () => { map.getCanvas().style.cursor = '' }\n\n  for (const layerId of ['ree-water-poly-fill', 'ree-water-river-line']) {\n    map.on('click', layerId, onWaterClick)\n    map.on('mouseenter', layerId, onWaterEnter)\n    map.on('mouseleave', layerId, onWaterLeave)\n    cleanups.push(() => {\n      map.off('click', layerId, onWaterClick)\n      map.off('mouseenter', layerId, onWaterEnter)\n      map.off('mouseleave', layerId, onWaterLeave)\n    })\n  }\n\n  return () => {\n    cleanups.forEach(fn => fn())\n    cleanupWaterLayers(map)\n  }\n}\n\nexport function cleanupWaterLayers(map: MapLibreMap) {\n  for (const id of WATER_LAYER_IDS) {\n    try { if (map.getLayer(id)) map.removeLayer(id) } catch {}\n  }\n  try { if (map.getSource(WATER_SOURCE)) map.removeSource(WATER_SOURCE) } catch {}\n}\n\nexport function setWaterLayersVisibility(map: MapLibreMap, visible: boolean) {\n  const visibility = visible ? 'visible' : 'none'\n  for (const id of WATER_LAYER_IDS) {\n    try { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visibility) } catch {}\n  }\n}\n",
  "filePath": "/home/ubuntu/EG-Maps/composables/useWaterLayers.ts"
}
```

**Output:**
```
Wrote file successfully.
```

---

## Assistant (Build · MiMo V2.5 Free · 4.9s)

_Thinking:_

Now let me modify useRareEarthData.ts to add region support.

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/ubuntu/EG-Maps/composables/useRareEarthData.ts"
}
```

**Output:**
```
<path>/home/ubuntu/EG-Maps/composables/useRareEarthData.ts</path>
<type>file</type>
<content>
1: import { shallowRef, ref, computed } from 'vue'
2: import { computeSpeculatorIndex, type RareEarthFeature, type RareEarthFeatureCollection, type SpeculatorIndexEntry } from '@/lib/observatory-analysis'
3: 
4: export interface RareEarthFeatureSummary {
5:   p: string
6:   n: string
7:   s: string
8:   c: string
9:   f: string
10:   u: string
11:   a: number
12:   ds: number
13:   net: string
14:   y: number
15:   lo: number
16:   la: number
17:   ov: Array<{ name: string; kind: string; distance_km: number }> | null
18:   dsprocesso: string
19: }
20: 
21: export interface DeepAnalysis {
22:   last_sync?: string
23:   data_source?: string
24:   sync_frequency?: string
25:   sync_url?: string
26:   suspicious_speculators_count?: number
27:   sigilo_stats?: { total: number; pct: number; total_area_ha: number }
28:   military_critical?: { total_claims: number; total_area_ha: number; us_connected_claims: number; us_connected_area_ha: number }
29:   [k: string]: unknown
30: }
31: 
32: export type LoadPhase = 'idle' | 'points' | 'overlaps' | 'polygons' | 'protected' | 'complete'
33: 
34: export function useRareEarthData(baseURL: string) {
35:   const pointsData = shallowRef<RareEarthFeatureCollection | undefined>(undefined)
36:   const polygonsData = shallowRef<RareEarthFeatureCollection | undefined>(undefined)
37:   const protectedData = shallowRef<RareEarthFeatureCollection | undefined>(undefined)
38:   const features = ref<RareEarthFeatureSummary[]>([])
39:   const deepAnalysis = shallowRef<DeepAnalysis | undefined>(undefined)
40:   const isLoading = ref(false)
41:   const loadPhase = ref<LoadPhase>('idle')
42:   const loadProgress = ref(0)
43:   const error = ref<Error | null>(null)
44:   let overlapsByProcesso: Record<string, Array<{ name: string; kind: string; distance_km: number }>> = {}
45: 
46:   function transformPoints(pointsGJ: RareEarthFeatureCollection): RareEarthFeatureSummary[] {
47:     return pointsGJ.features.map((f: RareEarthFeature) => {
48:       const p = f.properties
49:       return {
50:         p: String(p.processo ?? ''),
51:         n: String(p.nome ?? ''),
52:         s: String(p.subs ?? ''),
53:         c: String(p.category ?? ''),
54:         f: String(p.fase ?? ''),
55:         u: String(p.uf ?? ''),
56:         a: Number(p.area_ha ?? 0),
57:         ds: Number(p.danger_score ?? 0),
58:         net: String(p.network_id ?? ''),
59:         y: Number(p.ano ?? 0),
60:         lo: ((f.geometry as GeoJSON.Point)?.coordinates?.[0] as number) ?? 0,
61:         la: ((f.geometry as GeoJSON.Point)?.coordinates?.[1] as number) ?? 0,
62:         ov: overlapsByProcesso[String(p.processo ?? '')] || null,
63:         dsprocesso: String(p.dsprocesso ?? ''),
64:       }
65:     })
66:   }
67: 
68:   async function load() {
69:     if (isLoading.value) return
70:     isLoading.value = true
71:     loadPhase.value = 'points'
72:     loadProgress.value = 0
73:     error.value = null
74:     try {
75:       // Phase 1: Load points immediately (critical for map display)
76:       const pointsRes = await fetch(`${baseURL}data/rare-earth/points.geojson`)
77:       if (!pointsRes.ok) throw new Error('Failed to load points')
78:       const pointsGJ = (await pointsRes.json()) as RareEarthFeatureCollection
79:       features.value = transformPoints(pointsGJ)
80:       pointsData.value = pointsGJ
81:       loadProgress.value = 20
82: 
83:       // Defer remaining loads until after first paint
84:       await new Promise(resolve => requestAnimationFrame(resolve))
85:       await new Promise(resolve => setTimeout(resolve, 0))
86: 
87:       // Phase 2: Load overlaps (needed for popup enrichment)
88:       loadPhase.value = 'overlaps'
89:       loadProgress.value = 30
90:       const overlapsRes = await fetch(`${baseURL}data/rare-earth/points_with_overlaps.geojson`).catch(() => null)
91:       if (overlapsRes && overlapsRes.ok) {
92:         const overlapsGJ = await overlapsRes.json()
93:         overlapsByProcesso = {}
94:         for (const f of overlapsGJ.features) {
95:           const proc = (f.properties as Record<string, unknown>)?.processo
96:           if (proc && Array.isArray((f.properties as Record<string, unknown>).overlaps) && ((f.properties as Record<string, unknown>).overlaps as unknown[]).length) {
97:             overlapsByProcesso[proc as string] = (f.properties as Record<string, unknown>).overlaps as Array<{ name: string; kind: string; distance_km: number }>
98:           }
99:         }
100:         // Re-enrich features with overlap data
101:         features.value = features.value.map(f => ({
102:           ...f,
103:           ov: overlapsByProcesso[f.p] || null,
104:         }))
105:       }
106: 
107:       // Phase 3: Load polygons (heavy, for polygon layers)
108:       loadProgress.value = 50
109:       const polysRes = await fetch(`${baseURL}data/rare-earth/polygons.geojson`).catch(() => null)
110:       if (polysRes && polysRes.ok) {
111:         polygonsData.value = await polysRes.json()
112:       }
113: 
114:       await new Promise(resolve => setTimeout(resolve, 0))
115: 
116:       // Phase 4: Load protected areas + deep analysis
117:       loadPhase.value = 'protected'
118:       loadProgress.value = 70
119:       const [protectedRes, analysisRes] = await Promise.all([
120:         fetch(`${baseURL}data/rare-earth/protected-areas.geojson`).catch(() => null),
121:         fetch(`${baseURL}data/rare-earth/deep_analysis.json`).catch(() => null),
122:       ])
123:       loadProgress.value = 90
124: 
125:       if (protectedRes && protectedRes.ok) protectedData.value = await protectedRes.json()
126:       if (analysisRes && analysisRes.ok) deepAnalysis.value = await analysisRes.json()
127: 
128:       loadPhase.value = 'complete'
129:       loadProgress.value = 100
130:     } catch (e) {
131:       error.value = e instanceof Error ? e : new Error(String(e))
132:     } finally {
133:       isLoading.value = false
134:     }
135:   }
136: 
137:   const speculatorIndex = computed<SpeculatorIndexEntry[]>(() =>
138:     pointsData.value ? computeSpeculatorIndex(pointsData.value) : [],
139:   )
140: 
141:   return {
142:     pointsData,
143:     polygonsData,
144:     protectedData,
145:     features,
146:     speculatorIndex,
147:     deepAnalysis,
148:     isLoading,
149:     loadPhase,
150:     loadProgress,
151:     error,
152:     load,
153:   }
154: }

(End of file - total 154 lines)
</content>
```

---

## Assistant (Build · MiMo V2.5 Free · 17.9s)

_Thinking:_

Now let me modify useRareEarthData.ts to add region support.

**Tool: write**

**Input:**
```json
{
  "content": "import { shallowRef, ref, computed } from 'vue'\nimport { computeSpeculatorIndex, type RareEarthFeature, type RareEarthFeatureCollection, type SpeculatorIndexEntry } from '@/lib/observatory-analysis'\n\nexport interface RareEarthFeatureSummary {\n  p: string\n  n: string\n  s: string\n  c: string\n  f: string\n  u: string\n  a: number\n  ds: number\n  net: string\n  y: number\n  lo: number\n  la: number\n  ov: Array<{ name: string; kind: string; distance_km: number }> | null\n  dsprocesso: string\n}\n\nexport interface DeepAnalysis {\n  last_sync?: string\n  data_source?: string\n  sync_frequency?: string\n  sync_url?: string\n  suspicious_speculators_count?: number\n  sigilo_stats?: { total: number; pct: number; total_area_ha: number }\n  military_critical?: { total_claims: number; total_area_ha: number; us_connected_claims: number; us_connected_area_ha: number }\n  [k: string]: unknown\n}\n\nexport type LoadPhase = 'idle' | 'points' | 'overlaps' | 'polygons' | 'protected' | 'complete'\nexport type DataRegion = 'pococaldas' | 'all'\n\nexport function useRareEarthData(baseURL: string, initialRegion: DataRegion = 'all') {\n  const region = ref<DataRegion>(initialRegion)\n  const pointsData = shallowRef<RareEarthFeatureCollection | undefined>(undefined)\n  const polygonsData = shallowRef<RareEarthFeatureCollection | undefined>(undefined)\n  const protectedData = shallowRef<RareEarthFeatureCollection | undefined>(undefined)\n  const features = ref<RareEarthFeatureSummary[]>([])\n  const deepAnalysis = shallowRef<DeepAnalysis | undefined>(undefined)\n  const isLoading = ref(false)\n  const loadPhase = ref<LoadPhase>('idle')\n  const loadProgress = ref(0)\n  const error = ref<Error | null>(null)\n  const isRegional = ref(initialRegion === 'pococaldas')\n  let overlapsByProcesso: Record<string, Array<{ name: string; kind: string; distance_km: number }>> = {}\n\n  function dataDir(): string {\n    return region.value === 'pococaldas'\n      ? `${baseURL}data/rare-earth/pococaldas/`\n      : `${baseURL}data/rare-earth/`\n  }\n\n  function transformPoints(pointsGJ: RareEarthFeatureCollection): RareEarthFeatureSummary[] {\n    return pointsGJ.features.map((f: RareEarthFeature) => {\n      const p = f.properties\n      return {\n        p: String(p.processo ?? ''),\n        n: String(p.nome ?? ''),\n        s: String(p.subs ?? ''),\n        c: String(p.category ?? ''),\n        f: String(p.fase ?? ''),\n        u: String(p.uf ?? ''),\n        a: Number(p.area_ha ?? 0),\n        ds: Number(p.danger_score ?? 0),\n        net: String(p.network_id ?? ''),\n        y: Number(p.ano ?? 0),\n        lo: ((f.geometry as GeoJSON.Point)?.coordinates?.[0] as number) ?? 0,\n        la: ((f.geometry as GeoJSON.Point)?.coordinates?.[1] as number) ?? 0,\n        ov: overlapsByProcesso[String(p.processo ?? '')] || null,\n        dsprocesso: String(p.dsprocesso ?? ''),\n      }\n    })\n  }\n\n  async function load() {\n    if (isLoading.value) return\n    isLoading.value = true\n    loadPhase.value = 'points'\n    loadProgress.value = 0\n    error.value = null\n    try {\n      const dir = dataDir()\n\n      // Phase 1: Load points immediately (critical for map display)\n      const pointsRes = await fetch(`${dir}points.geojson`)\n      if (!pointsRes.ok) throw new Error('Failed to load points')\n      const pointsGJ = (await pointsRes.json()) as RareEarthFeatureCollection\n      features.value = transformPoints(pointsGJ)\n      pointsData.value = pointsGJ\n      loadProgress.value = 20\n\n      // Defer remaining loads until after first paint\n      await new Promise(resolve => requestAnimationFrame(resolve))\n      await new Promise(resolve => setTimeout(resolve, 0))\n\n      // Phase 2: Load overlaps (needed for popup enrichment)\n      loadPhase.value = 'overlaps'\n      loadProgress.value = 30\n      const overlapsUrl = region.value === 'pococaldas'\n        ? `${dir}points_overlaps.geojson`\n        : `${dir}points_with_overlaps.geojson`\n      const overlapsRes = await fetch(overlapsUrl).catch(() => null)\n      if (overlapsRes && overlapsRes.ok) {\n        const overlapsGJ = await overlapsRes.json()\n        overlapsByProcesso = {}\n        for (const f of overlapsGJ.features) {\n          const proc = (f.properties as Record<string, unknown>)?.processo\n          if (proc && Array.isArray((f.properties as Record<string, unknown>).overlaps) && ((f.properties as Record<string, unknown>).overlaps as unknown[]).length) {\n            overlapsByProcesso[proc as string] = (f.properties as Record<string, unknown>).overlaps as Array<{ name: string; kind: string; distance_km: number }>\n          }\n        }\n        // Re-enrich features with overlap data\n        features.value = features.value.map(f => ({\n          ...f,\n          ov: overlapsByProcesso[f.p] || null,\n        }))\n      }\n\n      // Phase 3: Load polygons (heavy, for polygon layers)\n      loadProgress.value = 50\n      const polysRes = await fetch(`${dir}polygons.geojson`).catch(() => null)\n      if (polysRes && polysRes.ok) {\n        polygonsData.value = await polysRes.json()\n      }\n\n      await new Promise(resolve => setTimeout(resolve, 0))\n\n      // Phase 4: Load protected areas + deep analysis\n      loadPhase.value = 'protected'\n      loadProgress.value = 70\n      const [protectedRes, analysisRes] = await Promise.all([\n        fetch(`${dir}protected-areas.geojson`).catch(() => null),\n        fetch(`${dir}deep_analysis.json`).catch(() => null),\n      ])\n      loadProgress.value = 90\n\n      if (protectedRes && protectedRes.ok) protectedData.value = await protectedRes.json()\n      if (analysisRes && analysisRes.ok) deepAnalysis.value = await analysisRes.json()\n\n      loadPhase.value = 'complete'\n      loadProgress.value = 100\n    } catch (e) {\n      error.value = e instanceof Error ? e : new Error(String(e))\n    } finally {\n      isLoading.value = false\n    }\n  }\n\n  /** Expand from regional to full Brazil dataset */\n  async function loadFullBrazil() {\n    if (region.value === 'all' && pointsData.value) return\n    region.value = 'all'\n    isRegional.value = false\n    await load()\n  }\n\n  const speculatorIndex = computed<SpeculatorIndexEntry[]>(() =>\n    pointsData.value ? computeSpeculatorIndex(pointsData.value) : [],\n  )\n\n  return {\n    pointsData,\n    polygonsData,\n    protectedData,\n    features,\n    speculatorIndex,\n    deepAnalysis,\n    isLoading,\n    loadPhase,\n    loadProgress,\n    error,\n    load,\n    loadFullBrazil,\n    region,\n    isRegional,\n  }\n}\n",
  "filePath": "/home/ubuntu/EG-Maps/composables/useRareEarthData.ts"
}
```

**Output:**
```
Wrote file successfully.
```

---

## Assistant (Build · MiMo V2.5 Free · 30.5s)

_Thinking:_

Now I need to create the VulcanMap.vue component. This is the key component that wraps map rendering for the observatory. It should:
1. Use the same composables as UnifiedMap
2. Initialize with Poços de Caldas center/zoom
3. Support switching between regional and national view
4. Include water layers and vulcan circles
5. Provide the overlays slot for the parent page to inject UI

Let me also check what imports and types the existing UnifiedMap.vue uses that I'll need.

Now creating the VulcanMap.vue component — the new map that wraps the same composables with Poços de Caldas defaults.

**Tool: write**

**Input:**
```json
{
  "content": "<template>\n  <div class=\"w-full h-[100svh] relative overflow-hidden bg-black\" role=\"main\" aria-label=\"Vulcan Observatory Map\">\n    <!-- Loading skeleton -->\n    <Transition name=\"fade\">\n      <div v-if=\"isLoading\" class=\"absolute inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center\">\n        <div class=\"relative mb-5\">\n          <div class=\"w-16 h-16 rounded-full border-4 border-white/20 border-t-red-500 animate-spin\" />\n          <div class=\"absolute inset-0 flex items-center justify-center\">\n            <span style=\"font-size:28px\">🌋</span>\n          </div>\n        </div>\n        <p class=\"text-white font-medium mb-1.5 text-sm\">{{ loadingMessage }}</p>\n        <div class=\"w-48 h-1 bg-zinc-800 rounded-full overflow-hidden mt-2\">\n          <div\n            class=\"h-full rounded-full transition-all duration-500 ease-out\"\n            :style=\"{ width: `${loadProgress}%`, background: 'linear-gradient(90deg, #e74c3c, #f39c12)' }\"\n          />\n        </div>\n        <span class=\"text-xs text-zinc-600 font-mono mt-1\">{{ loadProgress }}%</span>\n      </div>\n    </Transition>\n\n    <!-- Error state -->\n    <Transition name=\"fade\">\n      <div v-if=\"hasError\" class=\"absolute inset-0 bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center text-white z-[200]\">\n        <p class=\"text-gray-400 mb-4 text-center px-4 max-w-md\">{{ errorMessage }}</p>\n        <button @click=\"retryLoad\" class=\"px-6 py-2.5 bg-red-500 text-white rounded-lg font-medium hover:opacity-80 transition-all\">\n          Try Again\n        </button>\n      </div>\n    </Transition>\n\n    <!-- Map Container -->\n    <div ref=\"mapContainerRef\" class=\"absolute inset-0 w-full h-full\" style=\"z-index: 1\" />\n\n    <!-- Custom overlays slot (used by observatory-of-vulcan) -->\n    <slot name=\"overlays\" />\n  </div>\n</template>\n\n<script setup lang=\"ts\">\nimport { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'\nimport maplibregl from 'maplibre-gl'\nimport { useMediaQuery } from '@/composables/useMediaQuery'\nimport { useI18n } from '@/composables/useI18n'\nimport { useRareEarthController } from '@/composables/useRareEarthController'\nimport { setupRareEarthLayers, cleanupRareEarthLayers, syncRareEarthLayerVisibility } from '@/composables/useRareEarthLayers'\nimport { setupWaterLayers, cleanupWaterLayers } from '@/composables/useWaterLayers'\nimport { setupVulcanCircles, cleanupVulcanCircles, setVulcanCirclesVisibility, VULCAN_CENTER } from '@/composables/useVulcanCircles'\nimport type { RareEarthFeatureCollection } from '@/lib/observatory-analysis'\nimport { buildRareEarthPopupHTML } from '@/lib/map-utils'\n\nconst { t } = useI18n()\nconst baseURL = useRuntimeConfig().app.baseURL\nconst MAPTILER_API_KEY = useRuntimeConfig().public.maptilerApiKey || ''\n\nconst MAP_STYLE = MAPTILER_API_KEY\n  ? `https://api.maptiler.com/maps/019f0fee-56db-7efd-a73d-2bd1b646bc72/style.json?key=${MAPTILER_API_KEY}`\n  : 'https://demotiles.maplibre.org/style.json'\n\ninterface Props {\n  pointsData?: RareEarthFeatureCollection\n  polygonsData?: RareEarthFeatureCollection\n  protectedData?: RareEarthFeatureCollection\n  waterData?: GeoJSON.FeatureCollection\n  layerVisibility?: Record<string, boolean>\n  flyToTarget?: { lng: number; lat: number; zoom?: number } | null\n  isRegional?: boolean\n}\n\nconst emit = defineEmits<{\n  mapInit: [map: maplibregl.Map]\n  mapReady: []\n}>()\n\nconst props = withDefaults(defineProps<Props>(), {})\n\nconst mapContainerRef = ref<HTMLDivElement | null>(null)\nconst isLoading = ref(true)\nconst hasError = ref(false)\nconst errorMessage = ref('')\nconst isMobile = useMediaQuery('(max-width: 768px)')\n\nlet map: maplibregl.Map | null = null\nlet isMounted = true\nlet waterCleanup: (() => void) | null = null\nlet circleCleanup: (() => void) | null = null\n\nconst loadProgress = ref(0)\nconst loadingMessage = computed(() => {\n  if (loadProgress.value < 20) return 'Loading mining claims...'\n  if (loadProgress.value < 40) return 'Loading overlaps...'\n  if (loadProgress.value < 60) return 'Loading claim boundaries...'\n  if (loadProgress.value < 80) return 'Loading protected areas & water...'\n  return 'Ready'\n})\n\n// Rare Earth controller\nconst rareEarthController = useRareEarthController({\n  map: computed(() => map),\n  isActive: computed(() => true),\n  getProps: () => ({\n    rareEarthPoints: props.pointsData,\n    rareEarthPolygons: props.polygonsData,\n    rareEarthProtected: props.protectedData,\n    layerVisibility: props.layerVisibility,\n    flyToTarget: props.flyToTarget,\n  }),\n  popup: {\n    t: (key: string) => t(key),\n    locale: { value: 'en' },\n  },\n})\n\nfunction getMapCenter(): [number, number] {\n  return [...VULCAN_CENTER] as [number, number]\n}\n\nfunction getMapZoom(): number {\n  return props.isRegional ? 11.5 : 4.2\n}\n\nfunction getMinZoom(): number {\n  return props.isRegional ? 8 : 1.5\n}\n\nfunction initMap() {\n  if (!mapContainerRef.value) return\n  if (map) {\n    map.remove()\n    map = null\n  }\n  isLoading.value = true\n  hasError.value = false\n  loadProgress.value = 0\n\n  try {\n    map = new maplibregl.Map({\n      container: mapContainerRef.value,\n      style: MAP_STYLE,\n      zoom: getMapZoom(),\n      center: getMapCenter(),\n      attributionControl: false,\n      renderWorldCopies: true,\n      minZoom: getMinZoom(),\n      maxZoom: 16,\n      fadeDuration: 100,\n      maxTileCacheSize: 200,\n    })\n\n    map.addControl(\n      new maplibregl.AttributionControl({\n        customAttribution: `EARTH GUARDIANS @ ${new Date().getFullYear()}`,\n      }),\n    )\n\n    if (!isMobile.value) {\n      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-left')\n    }\n\n    map.on('load', () => {\n      if (!isMounted) return\n      isLoading.value = false\n      loadProgress.value = 100\n      emit('mapInit', map!)\n      emit('mapReady')\n\n      // Setup rare earth layers\n      if (props.pointsData) {\n        rareEarthController.setupLayers()\n      }\n\n      // Setup water layers\n      if (props.waterData) {\n        waterCleanup = setupWaterLayers(map!, props.waterData)\n      }\n\n      // Setup vulcan circles (regional mode only)\n      if (props.isRegional) {\n        circleCleanup = setupVulcanCircles(map!)\n      }\n    })\n\n    map.on('error', (err) => {\n      console.error('[VulcanMap] MapLibre error:', err)\n      if (!map?.loaded()) {\n        isLoading.value = false\n        hasError.value = true\n        errorMessage.value = 'Failed to load map tiles. Please check your network connection.'\n      }\n    })\n\n    // Timeout fallback\n    setTimeout(() => {\n      if (isLoading.value) {\n        isLoading.value = false\n        if (!hasError.value) {\n          hasError.value = true\n          errorMessage.value = 'Map tiles took too long to load.'\n        }\n      }\n    }, 20000)\n  } catch (err) {\n    console.error('[VulcanMap] Init error:', err)\n    isLoading.value = false\n    hasError.value = true\n  }\n}\n\nfunction retryLoad() {\n  hasError.value = false\n  initMap()\n}\n\n// Watch layer visibility changes\nwatch(() => props.layerVisibility, (vis) => {\n  if (!map || !map.isStyleLoaded()) return\n  syncRareEarthLayerVisibility(map, vis || {})\n  if (vis) {\n    setVulcanCirclesVisibility(map, vis['vulcan_circles'] !== false)\n    if (vis['water'] !== undefined) {\n      const waterVis = vis['water'] !== false ? 'visible' : 'none'\n      try {\n        if (map.getLayer('ree-water-poly-fill')) map.setLayoutProperty('ree-water-poly-fill', 'visibility', waterVis)\n        if (map.getLayer('ree-water-poly-line')) map.setLayoutProperty('ree-water-poly-line', 'visibility', waterVis)\n        if (map.getLayer('ree-water-poly-label')) map.setLayoutProperty('ree-water-poly-label', 'visibility', waterVis)\n        if (map.getLayer('ree-water-river-line')) map.setLayoutProperty('ree-water-river-line', 'visibility', waterVis)\n        if (map.getLayer('ree-water-river-label')) map.setLayoutProperty('ree-water-river-label', 'visibility', waterVis)\n      } catch {}\n    }\n  }\n}, { deep: true })\n\n// Watch data changes\nwatch(() => [props.pointsData, props.polygonsData], () => {\n  if (!map || !map.isStyleLoaded()) return\n  rareEarthController.setupLayers()\n}, { deep: true })\n\nwatch(() => props.protectedData, (newVal) => {\n  if (!map || !map.isStyleLoaded() || !newVal) return\n  try {\n    const src = map.getSource('ree-protected') as maplibregl.GeoJSONSource | undefined\n    if (src) src.setData(newVal)\n  } catch {}\n}, { deep: true })\n\nwatch(() => props.waterData, (newVal) => {\n  if (!map || !map.isStyleLoaded() || !newVal) return\n  if (waterCleanup) waterCleanup()\n  waterCleanup = setupWaterLayers(map, newVal)\n}, { deep: true })\n\n// Watch fly-to target\nwatch(() => props.flyToTarget, (target) => {\n  if (!target || !map) return\n  map.flyTo({\n    center: [target.lng, target.lat],\n    zoom: target.zoom ?? 9,\n    duration: 1500,\n    essential: true,\n  })\n}, { deep: true })\n\nonMounted(() => {\n  initMap()\n})\n\nonUnmounted(() => {\n  isMounted = false\n  if (waterCleanup) waterCleanup()\n  if (circleCleanup) circleCleanup()\n  if (map) {\n    map.remove()\n    map = null\n  }\n})\n\n// Expose methods for parent\ndefineExpose({\n  getMap: () => map,\n  flyTo: (lng: number, lat: number, zoom?: number) => {\n    if (map) map.flyTo({ center: [lng, lat], zoom: zoom ?? 9, duration: 1500 })\n  },\n})\n</script>\n\n<style>\n.fade-enter-active,\n.fade-leave-active {\n  transition: opacity 0.3s ease;\n}\n.fade-enter-from,\n.fade-leave-to {\n  opacity: 0;\n}\n</style>\n",
  "filePath": "/home/ubuntu/EG-Maps/components/VulcanMap.vue"
}
```

**Output:**
```
Wrote file successfully.
```

---

## Assistant (Build · MiMo V2.5 Free · 2320.2s)

---

