# EG-Maps — revisão de clustering e integração Squarespace

## Escopo revisado

A revisão cobriu o branch `develop`, o núcleo 2D em `useMapBase`/`useMapMarker`, a página `/iframe`, o embed de Active Crews e as superfícies `/eg-grants` e `/eg-grants/fullscreen`.

## Achados principais

O clustering já estava implementado com `GeoJSONSource.cluster`, `getClusterExpansionZoom()` e camadas dedicadas de círculo/rótulo. O comportamento anterior, entretanto, limitava-se a executar `flyTo`: não havia uma representação textual do conteúdo do cluster, o que tornava difícil localizar um crew ou projeto específico em regiões densas. O novo fluxo mantém a expansão no mapa e, simultaneamente, abre um painel lateral que desloca visualmente o conteúdo sobre o mapa, oferece busca local e permite focar cada item.

O painel foi extraído para `components/map/ClusterResultsPanel.vue`, com contrato reutilizável para projetos, espécies e crews. O núcleo de marcadores agora consulta `getClusterLeaves()` antes do zoom e envia os identificadores para `useMapBase`, que resolve os dados completos do dataset. A seleção de um item executa foco geográfico; a abertura do detalhe completo continua seguindo o fluxo específico do dataset.

O embed atual de Active Crews continha uma inconsistência entre `ref="mapRef"` no template e o `mapContainer` usado pelo script. Esse erro foi corrigido. A implementação Squarespace continua sem fundo, com água transparente quando o basemap MapTiler está disponível, fallback para fronteiras e sincronização de altura via `postMessage`.

A página `/iframe` antes documentava principalmente páginas inteiras. Ela agora inclui exemplos para as superfícies públicas separadas do EG-Grants, usando `/squarespace/eg-grants?view=...` para `overview`, `community`, `crew`, `partners`, `worldwide` e `egprojects`.

## Contrato público de embeds

| Superfície | URL | Uso |
|---|---|---|
| Active Crews transparente | `/squarespace/active-crews` | Mapa sem fundo, marcadores e popups; adequado a seção de marca do Squarespace |
| EG-Grants overview | `/squarespace/eg-grants?view=overview` | Resumo compacto de impacto |
| EG-Grants community | `/squarespace/eg-grants?view=community` | Oportunidades comunitárias |
| EG-Grants crew | `/squarespace/eg-grants?view=crew` | Projetos de crews |
| EG-Grants partners | `/squarespace/eg-grants?view=partners` | Oportunidades de parceiros |
| EG-Grants worldwide | `/squarespace/eg-grants?view=worldwide` | Diretório público de oportunidades |
| EG-Grants projects | `/squarespace/eg-grants?view=egprojects` | Projetos Earth Guardians |

A recomendação de integração é manter cada iframe público como superfície read-only. Login, votação, criação, edição e revisão continuam pertencendo ao dashboard autenticado, evitando múltiplas sessões Supabase concorrentes dentro de uma mesma página Squarespace. A próxima etapa pode adicionar um bridge de eventos `postMessage` para sincronizar seleção de grant, tema e altura entre os iframes.

## Validação

O checkout inicial passou por instalação congelada de dependências, testes, lint e build. Após as alterações desta revisão, deve-se repetir `pnpm lint`, `pnpm test` e `pnpm build`; o build estático precisa incluir `/squarespace/eg-grants`.

## Próximos incrementos recomendados

A camada atual de `eg-grants` embeddable usa dados estáticos de projetos como fallback. Para uma integração completa com as abas dinâmicas já existentes no dashboard, o próximo passo é expor um endpoint público read-only para oportunidades, adicionar `postMessage` com `embed:ready`, `embed:height`, `embed:select` e `host:theme`, e depois compartilhar um único adaptador de dados entre o dashboard autenticado e os iframes públicos.

## Segunda auditoria — campanhas e densidade visual

A segunda revisão confirmou que a homepage apresentava um card chamado Campaigns, mas o link levava diretamente a `/endangered-species`. Isso colocava biodiversidade como sinônimo de todas as campanhas. A navegação agora abre `/campaigns`, que funciona como hub com cinco entradas: Endangered Species/Biodiversity, Choose Action Now, Sustainable Solutions, Crews & local action e Project Grants.

A nova página organiza o caminho de participação em Learn, Organize e Fund. O conteúdo foi conferido contra as páginas oficiais do Earth Guardians e inclui links para a missão, recursos, CAN, soluções sustentáveis, crews, grants e youth leadership. Endangered Species permanece com o mapa 2D e globo 3D, mas como uma campanha/data explorer dentro de um sistema maior.

A construção de linhas do mapa usava seleção aleatória de alvos, causando mudanças visuais entre renders. Também podia produzir muitas conexões no desktop. A geração agora é determinística e limita a camada a 7 conexões de projetos, 10 de espécies e 8 de crews no desktop; em mobile, 3, 5 e 4 respectivamente. Partículas continuam sendo controladas pelo botão existente e são pausadas fora da viewport/aba do navegador.
