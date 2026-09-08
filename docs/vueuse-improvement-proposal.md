# Proposta modular de melhorias com VueUse

## Contexto

O EG-Maps já possui `@vueuse/core` e `@vueuse/nuxt` na versão `14.3.0`, portanto a maior parte das melhorias pode ser implementada sem aumentar dependências. O VueUse é tree-shakeable, tipado, compatível com SSR e oferece utilitários para eventos, sensores, estado persistido, rede, timing, acessibilidade e integração com browser APIs. As recomendações abaixo foram comparadas com a documentação oficial do projeto em 8 de setembro de 2026.

Fontes oficiais: [VueUse](https://vueuse.org/), [guia Nuxt/SSR](https://vueuse.org/guide/) e [repositório](https://github.com/vueuse/vueuse).

## Já implementado na terceira rodada

A terceira rodada foi concluída e validada com `pnpm test`, `pnpm lint`, `pnpm build` e `git diff --check`. Foram corrigidos o cleanup de mapas reconstruídos, o cancelamento de retries de partículas, o resize com `requestAnimationFrame`, a semântica do mapa 2D e a sincronização do dark mode da página Campaigns. Essas alterações são independentes da aprovação da lista abaixo.

## Plano de implementação proposto

| ID | Área | VueUse recomendado | Implementação | Benefício | Risco | Aprovação |
|---|---|---|---|---|---|---|
| VU-01 | Performance do mapa | `useRafFn`, `useDebounceFn`, `useThrottleFn` | Unificar throttling de resize, pan, filtros, reconstrução de markers e atualização de conexões | Menos layouts, menos rebuilds e menor consumo de CPU sem reduzir recursos | Baixo | Recomendada |
| VU-02 | Observers | `useResizeObserver`, `useIntersectionObserver`, `useElementVisibility` | Substituir observers manuais em mapas, iframes, previews e painéis | Cleanup automático, menos listeners órfãos e código mais consistente | Baixo | Recomendada |
| VU-03 | Lifecycle | `tryOnMounted`, `tryOnUnmounted`, `useEventListener` | Padronizar listeners de `resize`, `message`, teclado, online/offline e visibility | Menos vazamentos e melhor compatibilidade SSR | Baixo | Recomendada |
| VU-04 | Preferências | `usePreferredDark`, `usePreferredReducedMotion`, `usePreferredLanguages` | Integrar tema, animações e idioma ao host/usuário | Acessibilidade e consistência em embeds e app principal | Baixo | Recomendada |
| VU-05 | Estado da interface | `useStorage`, `useLocalStorage`, `useSessionStorage` | Persistir dataset, filtros, visibilidade de conexões, hex grid, tema e última posição de mapa | Retorno ao app mais rápido e experiência personalizada | Médio | Aprovar campos |
| VU-06 | Command palette | `useMagicKeys`, `onKeyStroke`, `useFocusTrap` | Atalhos para busca, datasets, filtros, painel de cluster, 2D/3D e fechar overlays | Navegação eficiente para usuários avançados e acessibilidade | Baixo | Recomendada |
| VU-07 | Cluster panel | `useVirtualList`, `useFuse` ou `useAsyncState` | Virtualizar listas grandes e debounced search no painel lateral de clusters | Busca mais fluida em clusters densos | Baixo | Recomendada |
| VU-08 | Data loading | `useAsyncState`, `useFetch`, `useTimeoutFn` | Unificar loading/error/retry de espécies, tiles, grants e dados rare-earth | Estados de erro mais claros e retry sem código duplicado | Médio | Recomendada |
| VU-09 | Offline | `useOnline`, `useNetwork`, `useStorageAsync` | Mostrar status offline, preservar filtros e oferecer retry de dados | Melhor uso em conexões móveis e trabalho de campo | Baixo | Recomendada |
| VU-10 | Mobile UX | `useBreakpoints`, `useWindowSize`, `useElementSize` | Substituir media-query manual em componentes críticos e ajustar painéis ao container real | Melhor responsividade em iframes estreitos e rotação de tela | Baixo | Recomendada |
| VU-11 | Tema Squarespace | `useEventListener`, `useMutationObserver`, `useColorMode` | Bridge `host:theme`, `host:resize` e `prefers-color-scheme` com contrato único | Iframes claros/escuros sincronizados com Squarespace | Médio | Recomendada |
| VU-12 | Iframe lifecycle | `useEventListener`, `useElementSize`, `useTimeoutFn` | `embed:ready`, `embed:height`, `embed:error`, timeout de host e unload seguro | Embeds mais previsíveis e sem scrollbars | Baixo | Recomendada |
| VU-13 | Script loader modular | `useScriptTag` | Loader configurável para `squarespace-embed.js`, múltiplos componentes, versão e fallback | Integração modular sem duplicar scripts | Médio | Aprovar contrato |
| VU-14 | Cross-frame security | `useEventListener` + validação própria de origin/channel | Allow-list configurável, nonce/channel e rejeição de mensagens fora do iframe | Mais segurança para integrações cross-origin | Médio | Recomendada antes de produção |
| VU-15 | Analytics | `useEventBus` ou `useEventListener` | Eventos normalizados: `map:ready`, `cluster:open`, `item:select`, `embed:error`, `cta:click` | Integração com Plausible/analytics do host sem acoplamento | Médio | Aprovar nomes dos eventos |
| VU-16 | URL state | `useRouteQuery` / `useUrlSearchParams` | Compartilhar dataset, filtros, localização e view de grants por URL | Links reproduzíveis e integração Squarespace mais poderosa | Médio | Recomendada |
| VU-17 | PWA/cache | `useRegisterSW` | Atualizar assets e dados estáticos com estratégia segura | Melhor performance de retorno e uso em campo | Alto | Não implementar sem aprovação de política de cache |
| VU-18 | Geolocation | `useGeolocation` | Botão “find near me” para crews, grants e ações locais | Descoberta local mais útil | Alto | Requer aprovação de privacidade/UX |
| VU-19 | Clipboard/share | `useClipboard`, `useShare` | Compartilhar campanha, cluster, projeto e snippet iframe | Crescimento orgânico e uso editorial | Baixo | Recomendada |
| VU-20 | Accessibility | `useFocusTrap`, `useFocusWithin`, `useActiveElement`, `useScrollLock` | Padronizar overlays, drawers, painel de cluster e modais | Melhor teclado, foco e mobile screen-reader UX | Baixo | Recomendada |

## Pacotes modulares sugeridos

### Módulo A — `ui-runtime`

Concentrar `useEventListener`, `useResizeObserver`, `useIntersectionObserver`, `useElementSize`, `usePreferredReducedMotion`, `usePreferredDark`, `useStorage` e `useBreakpoints`. Esse módulo elimina listeners manuais dispersos e deve ser o primeiro a ser implementado.

### Módulo B — `map-performance`

Usar `useRafFn`, `useThrottleFn`, `useDebounceFn`, `useVirtualList` e `useAsyncState` para coordenar resize, filtros, conexão de linhas, cluster panel e carregamento de dados. Não deve alterar a quantidade de informações disponíveis; apenas o momento e a forma de renderização.

### Módulo C — `embed-bridge`

Criar um adaptador compartilhado entre `useSquarespaceEmbed.ts`, `squarespace-embed.js`, Active Crews e EG-Grants. O contrato deve suportar `host:ready`, `host:theme`, `host:resize`, `host:focus`, `host:open`, `host:data`, `embed:ready`, `embed:height`, `embed:click` e `embed:error`, com `channel`, `version` e allow-list de origins.

### Módulo D — `shareable-state`

Usar `useUrlSearchParams` e `useStorage` para permitir URLs como:

```text
/campaigns?view=endangered-species
/active-crews?cluster=...
/squarespace/eg-grants?view=worldwide&theme=dark
```

Esse módulo deve manter compatibilidade com os parâmetros atuais `embed`, `hideAll`, `controls` e `no-control`.

### Módulo E — `action-events`

Usar `useEventBus` para uma camada de eventos de domínio sem acoplar o mapa ao Squarespace, Plausible ou ao dashboard de grants. O host poderá ouvir eventos sem conhecer componentes internos.

## Ordem recomendada

1. **VU-01 a VU-04:** performance, cleanup e acessibilidade de baixo risco.
2. **VU-07, VU-08 e VU-10:** cluster panel, loading e responsividade.
3. **VU-11 a VU-16:** contrato completo de iframe/Squarespace e URLs reproduzíveis.
4. **VU-19 e VU-20:** compartilhamento e acabamento de acessibilidade.
5. **VU-17 e VU-18:** PWA/cache e geolocalização somente após decisões de produto e privacidade.

## Decisões necessárias antes da implementação

A implementação pode começar imediatamente para VU-01 a VU-04, VU-07 a VU-12, VU-16, VU-19 e VU-20. Antes de VU-05, deve ser confirmado quais preferências podem ser persistidas. Antes de VU-13 a VU-15, deve ser confirmado o domínio final de produção e a allow-list de origins. VU-17 exige uma política explícita de atualização de dados, e VU-18 exige decisão sobre consentimento e precisão de localização.

## Não recomendado

Não recomendo adicionar VueUse apenas para substituir código simples que já funciona, nem importar o pacote inteiro em scripts externos. A integração Squarespace deve continuar usando um launcher pequeno e tree-shakeable; VueUse deve ser usado no bundle Nuxt quando oferecer lifecycle, observers, estado ou timing reais. O `squarespace-embed.js` externo deve receber apenas o protocolo mínimo necessário.

## Auditoria adicional baseada em `vueuse/skills`

A análise do repositório oficial `vueuse/skills` confirmou que há uma skill principal, `vueuse-functions`, criada para orientar agentes a escolher composables VueUse com menor alucinação e uso progressivo de referências. A política central da skill é: sempre verificar primeiro se uma função VueUse atende ao requisito; preferir composables tree-shakeable e tipados; respeitar a regra de invocação da função (`AUTO`, `EXTERNAL` ou `EXPLICIT_ONLY`); e consultar a referência detalhada antes de implementar.

O catálogo oficial agrupa funções em **State, Elements, Browser, Sensors, Network, Animation, Component, Watch, Reactivity, Array, Time e Utilities**, além de add-ons para Electron, Firebase, Head, Integrations, Math, Motion, Router, RxJS, SchemaOrg e Sound. Para o EG-Maps, os add-ons externos não devem ser adicionados automaticamente; as oportunidades abaixo cobrem também funções que não estavam na primeira lista.

## Matriz ampliada de cobertura

### Estado compartilhado e arquitetura Vue

| Função | Aplicação no EG-Maps | Prioridade |
|---|---|---|
| `createGlobalState` | Preferências globais de tema, qualidade, conexões e dataset entre páginas 2D/3D | Alta |
| `createSharedComposable` | Compartilhar uma única fonte de estado de embed, device capability e preferências entre componentes | Alta |
| `createInjectionState` | Contexto do mapa para controles, painéis, popups e legenda sem prop drilling | Alta |
| `provideLocal` / `injectLocal` | Composição local de contexto em páginas embeddable | Média |
| `useAsyncState` | Carregamento padronizado de species, grants, tiles e dados rare-earth | Alta |
| `useRefHistory` | Undo/redo de filtros, desenho/importação e estado de análise no observatório | Média |
| `useDebouncedRefHistory` | Histórico de filtros sem registrar cada tecla | Média |
| `useLastChanged` | Invalidar caches e mostrar “updated” de datasets | Baixa |
| `useStorage` / `useSessionStorage` | Preferências e estado temporário do mapa | Alta |
| `useStorageAsync` | Persistência de preferências quando storage assíncrono/IndexedDB for adotado | Média |

### Elementos, observers e DOM

| Função | Aplicação no EG-Maps | Prioridade |
|---|---|---|
| `useElementBounding` | Posicionar controles e painel de cluster com base no container real do iframe | Alta |
| `useElementOverflow` | Detectar conteúdo cortado em cards, tooltips e tabelas | Média |
| `useElementSize` | Altura real para `embed:height` e layout responsivo | Alta |
| `useElementVisibility` | Inicializar previews, mapas e recursos apenas quando visíveis | Alta |
| `useResizeObserver` | Substituir observers manuais em mapas e embeds | Alta |
| `useIntersectionObserver` | Lazy mounting de iframes e seções da galeria | Alta |
| `useMutationObserver` | Detectar tema/classe do Squarespace e mudanças de host | Alta |
| `useParentElement` | Resolver contexto de host/container em componentes modulares | Baixa |
| `useActiveElement` | Restaurar foco após popup/painel | Alta |
| `useWindowFocus` | Pausar efeitos somente quando a janela perder foco | Média |
| `useWindowScroll` | Navegação contextual e sticky actions na galeria `/iframe` | Baixa |
| `onElementRemoval` | Cleanup defensivo quando Squarespace remove dinamicamente um bloco | Alta |

### Browser APIs e integração host

| Função | Aplicação no EG-Maps | Prioridade |
|---|---|---|
| `useBroadcastChannel` | Sincronizar tema, seleção e estado entre múltiplos iframes da mesma página | Alta |
| `useUrlSearchParams` | Estado compartilhável para dataset, filtro, cluster e view de grants | Alta |
| `useColorMode` / `useDark` | Unificar dark/light mode entre app, iframe e host | Alta |
| `useCssVar` | Receber/acertar accent colors e tokens do Squarespace | Alta |
| `usePreferredContrast` | Aumentar contraste em mapas e painéis quando solicitado pelo sistema | Média |
| `usePreferredReducedTransparency` | Remover blur/glass effects para usuários que pedem menos transparência | Média |
| `usePreferredLanguages` | Escolher idioma inicial do embed quando o host não envia `lang` | Média |
| `useSSRWidth` | Evitar hydration mismatch em breakpoints e iframes SSR | Alta |
| `useScreenOrientation` | Recalcular layout em landscape/portrait | Média |
| `useScreenSafeArea` | Respeitar notch e safe areas em embeds mobile | Média |
| `useScriptTag` | Loader modular de `squarespace-embed.js` e futuras integrações | Alta |
| `useStyleTag` | Injetar tokens CSS de host com lifecycle controlado | Média |
| `useTitle` | Atualizar título com dataset/campanha ativa | Baixa |
| `useFavicon` | Favicon contextual para views embeddable | Baixa |
| `useFullscreen` | Padronizar fullscreen 2D/3D e embeds | Média |
| `useClipboard` | Copiar snippets, URLs e dados de clusters | Alta |
| `useShare` | Compartilhar campanha, espécie, projeto ou cluster | Média |
| `useFileDialog` / `useDropZone` | Importação de GeoJSON/CSV mais acessível | Alta |
| `useObjectUrl` | Preview seguro de arquivos importados antes do processamento | Média |
| `usePermission` | Detectar permissão de geolocalização, clipboard e fullscreen | Média |
| `useWebWorker` / `useWebWorkerFn` | Processar GeoJSON, filtros, clustering auxiliar e parsing sem bloquear UI | Alta |
| `usePerformanceObserver` | Telemetria local de long tasks, LCP e recursos de mapa | Média |
| `useMemory` | Ajustar qualidade em browsers com pressão de memória | Média |
| `useDevicePixelRatio` | Recalcular canvas e partículas em monitores retina/zoom | Média |
| `useWakeLock` | Modo de campo para manter mapa ativo durante coleta/uso autorizado | Baixa |
| `useOnline` / `useNetwork` | Estado offline, retry e banner de conectividade | Alta |

### Sensors e acessibilidade

| Função | Aplicação no EG-Maps | Prioridade |
|---|---|---|
| `onClickOutside` | Fechar busca, filtros e painel de cluster sem listeners manuais | Alta |
| `onKeyStroke` | Atalhos 2D/3D, fechar overlays e navegar resultados | Alta |
| `onStartTyping` | Abrir busca ao começar a digitar fora de inputs | Média |
| `onLongPress` | Alternativa mobile para abrir detalhes de marcadores | Baixa |
| `useFocus` / `useFocusWithin` | Foco visível e roving focus em listas/painéis | Alta |
| `useLiveAnnouncer` | Anunciar cluster aberto, número de resultados, filtros e erros a leitores de tela | Alta |
| `useScrollLock` | Impedir scroll de fundo em modais/overlays | Alta |
| `useElementHover` / `useMouseInElement` | Tooltips e previews com fallback touch | Baixa |
| `useDevicePixelRatio` | Melhorar precisão visual do hex grid e canvas | Média |
| `useGeolocation` | “Find nearby crews/projects” | Condicional |
| `useDeviceOrientation` / `useDeviceMotion` | Interação experimental em globe/mobile | Não priorizar |
| `useVibrate` | Feedback opcional em ações de campo/mobile | Baixa |

### Tempo, reatividade, arrays e utilitários

| Função | Aplicação no EG-Maps | Prioridade |
|---|---|---|
| `useRafFn` | Loop de partículas, resize e métricas de canvas | Alta |
| `useDebounceFn` / `useThrottleFn` | Busca, filtros, map move e rebuild de markers | Alta |
| `useTimeoutFn` / `useIntervalFn` | Retry, banners, timeouts de iframe e polling controlado | Alta |
| `useTimeout` | Delays de UX sem timers órfãos | Média |
| `useArrayFilter` / `useArrayFind` / `useArrayMap` | Computeds declarativos em listas de grants/species | Baixa |
| `useMemoize` | Cache de labels, cores, previews e transformação de dados | Média |
| `until` | Esperar mapa pronto, dados ou sessão sem watchers manuais | Alta |
| `computedAsync` | Computeds assíncronos para filtros e agregações | Média |
| `useSupported` | Feature detection de fullscreen, share, worker, geolocation e clipboard | Alta |
| `useEventBus` | Eventos internos de domínio e bridge desacoplado | Alta |
| `useEventHook` | Hooks de lifecycle de mapas/embeds sem EventEmitter próprio | Média |
| `useToggle` | Toggles de conexões, hex grid, filtros e temas | Baixa |
| `useCloned` | Estado editável de filtros e dados importados | Média |
| `useInfiniteScroll` | Grants, claims, resultados e cards longos | Média |
| `useVirtualList` | Cluster panel, claims table e species list densos | Alta |
| `useFuse` | Busca fuzzy de espécies, crews, grants e campanhas | Alta |
| `useScroll` | Navegação para item selecionado e deep-linking visual | Média |

## Add-ons avaliados

| Add-on | Decisão | Motivo |
|---|---|---|
| VueUse Router | Avaliar apenas se o estado de URL ficar complexo | Nuxt router já existe; não adicionar abstração sem necessidade |
| VueUse Firebase | Não usar agora | O app usa Supabase, não Firebase |
| VueUse RxJS | Não usar agora | Não há stream complexo que justifique dependência adicional |
| VueUse Electron | Não usar | Não é aplicação Electron |
| VueUse Sound | Não usar por padrão | Som não é necessário para o mapa e pode prejudicar acessibilidade |
| VueUse Motion | Já existe `@vueuse/motion/nuxt` | Aproveitar para microinterações, respeitando reduced motion |
| VueUse Head | Avaliar | Nuxt `useHead` já cobre o caso atual |
| VueUse SchemaOrg | Baixa prioridade | Pode melhorar SEO da página Campaigns, mas não é prioridade de performance |
| VueUse Math | Não adicionar | Preferir funções locais simples para geodados/mapa |

## Novos módulos recomendados após a auditoria

### Módulo F — `shared-map-state`

Combinar `createSharedComposable`, `createGlobalState`, `useStorage`, `useUrlSearchParams` e `useEventBus` para que 2D, 3D, `/iframe`, painel de cluster e campanha compartilhem um contrato de estado sem acoplamento direto.

### Módulo G — `accessibility-runtime`

Combinar `useActiveElement`, `useFocus`, `useFocusWithin`, `useLiveAnnouncer`, `useScrollLock`, `onClickOutside`, `onKeyStroke` e `usePreferredReducedMotion` para padronizar overlays, drawers e listas.

### Módulo H — `worker-data-pipeline`

Combinar `useWebWorkerFn`, `useAsyncState`, `useSupported`, `usePerformanceObserver` e `useMemory` para mover parsing, agregação, fuzzy search e transformação de GeoJSON pesado para fora da UI principal quando a medição confirmar benefício.

### Módulo I — `host-integration-runtime`

Combinar `useScriptTag`, `useStyleTag`, `useMutationObserver`, `useElementSize`, `useBroadcastChannel`, `useUrlSearchParams` e `useSupported` para a integração Squarespace modular, com fallback para iframe puro quando scripts forem bloqueados.

## Ajuste de prioridade após a skill

A primeira lista subestimava quatro oportunidades importantes: **`useSSRWidth` para hydration**, **`useWebWorkerFn` para dados pesados**, **`useLiveAnnouncer` para acessibilidade de mapas** e **`useBroadcastChannel` para múltiplos iframes na mesma página**. Elas agora entram na prioridade alta.

A ordem recomendada passa a ser:

1. `useEventListener`, observers, `useRafFn`, debounce/throttle, `useTimeoutFn`, `useSupported` e lifecycle.
2. `useSSRWidth`, `useColorMode`, `usePreferredReducedMotion`, `useLiveAnnouncer`, `onClickOutside`, `onKeyStroke` e `useScrollLock`.
3. `useVirtualList`, `useFuse`, `useAsyncState`, `until`, `useWebWorkerFn` e `usePerformanceObserver`.
4. `createSharedComposable`, `createInjectionState`, `useEventBus`, `useUrlSearchParams`, `useBroadcastChannel` e `useScriptTag`.
5. `useClipboard`, `useShare`, `useFileDialog`, `useDropZone`, `useObjectUrl`, `useOnline` e `useNetwork`.
6. Geolocation, Wake Lock, PWA/cache, motion/orientation e integrações opcionais somente após aprovação de produto, privacidade e medição.

## Regra de implementação

Nenhuma função deve ser adicionada apenas por estar no catálogo. Para cada item aprovado, a implementação deve registrar: problema observado, função VueUse escolhida, componente impactado, métrica de sucesso, fallback SSR e estratégia de cleanup. O bundle deve continuar tree-shakeable, e `squarespace-embed.js` deve permanecer pequeno, sem carregar VueUse completo via CDN.

## Status de implementação — 8 de setembro de 2026

Implementado e validado: `createSharedComposable`, `useLocalStorage`, `usePreferredDark`, `usePreferredReducedMotion`, `useOnline`, `useBreakpoints`, `useUrlSearchParams`, `useEventBus`, `useBroadcastChannel`, `useSupported`, `useResizeObserver`, `useEventListener` no bridge, `useClipboard`, persistência de conexões/hex grid, reduced motion na navegação, status offline do mapa, eventos de cluster e link copiável no painel de cluster.

Também foram mantidos os cleanup e throttling implementados na terceira rodada. O bridge Squarespace passou a usar o cleanup automático do VueUse para resize e mensagens.

As APIs de geolocalização, wake lock, PWA/service worker, motion/orientation, Web Worker para processamento pesado e share nativo foram avaliadas, mas não foram acionadas automaticamente: geolocation e wake lock requerem ação explícita do usuário; PWA requer política de cache/atualização; Web Worker exige benchmark para evitar overhead em datasets pequenos; e Web Share/clipboard têm fallback e devem ser expostos somente em ações de UI aprovadas. O projeto já tem fallback de clipboard no painel de cluster e capability detection para share, geolocation, clipboard e workers.
