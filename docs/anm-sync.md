# ANM Vulcan sync — sources & daily job

Vulcan center: **21°54'47.66"S 46°32'30.81"W** → `(-46.5418917, -21.9132389)`,
50 km radius (covers Poços de Caldas + Caldas MG and the SP border strip:
Águas da Prata, São João da Boa Vista side).

## Where each page's infos come from (Playwright sniff, 2026-09-14)

Reports: `scripts/output/anm-sniff/*.json` — full request logs captured in
headless Chrome via `node scripts/sniff-anm.mjs [--only ID]`.

### 1. dadosabertos listing (1 request — static HTML, no JS)

`GET dadosabertos.anm.gov.br/SIGMINE/PROCESSOS_MINERARIOS/` → Apache-style
index. **Requires a browser User-Agent (403 otherwise).** Files per UF:

- `{UF}.zip` — shapefile set (`.shp` PolygonZ SIRGAS-2000 degrees,
  `.dbf` UTF-8, `.shx/.sbn/.sbx/.cpg/.prj`). DBF schema verbatim:
  `PROCESSO C11, NUMERO N6, ANO N4, AREA_HA N19.8, ID C38, FASE C40,
  ULT_EVENTO C90, NOME C120, SUBS C30, USO C30, UF C20, DSProcesso C12`.
- `{UF}.kmz` — simplified KML visualization (no full attributes).
- `BRASIL.zip`, `PROCESSOS_INATIVOS.zip` — national / inactive dumps.
- Zips re-stamped roughly daily (observed `Last-Modified: 2026-09-13`).

### 2. SIGMINE webappviewer (154 requests)

Boot chain: `portals/self` → portal app-data
(`content/items/6a8f5ccc…/data`, 226 KB, references 5 itemIds) → webmap
`1f5535fc…/data` (11 operational MapServers, all visible) → per-service
`?f=json` metadata → `World_Imagery` tiles → **`MapServer/export` image
tiles** for rendering. Vector `/query` fires only on identify/deep zoom —
at rest zoom the browser sees **pictures**, not claim rows.

Live service inventory (`geo.anm.gov.br/arcgis/rest/services/…`):

| Service | Layer 0 (representative) |
|---|---|
| `SIGMINE/dados_anm/MapServer` | **Processos minerários ativos** (Polygon, 14 fields — byte-identical schema to the zips) |
| `SIGMINE/aguas_interiores` | inland waters |
| `SIGMINE/estrutura_territorial` | states/municipalities |
| `SIGMINE/sociedade_cultura` | society/culture |
| `SIGMINE/transportes` | transport |
| `SIGMINE/protecao_conservacao_natureza` | protected areas |
| `SIGMINE/planejamento_cadastro` | planning/cadastre |
| `SIGMINE/informacao_militar` | military info |
| `SIGMINE/geociencias` | geosciences |
| `SIGMINE/concessoes_comunicacao` | concessions/comms |
| `grade` | grid |

### 3. Disponibilidade dashboard (477 requests)

Boot chain: portal self → dashboard item + data (61 KB) → webmap
`fcca53…/data` (3 layers: `estrutura_territorial` + two
`Producao/*Disponibilidade*` FeatureServers) → layer metadata → **live
statistic queries** (`query?…&groupByFieldsForStatistics=Res_Final|Rodada|Uf`,
`returnDistinctValues` on `Res_Final/Rodada/Uf`) → tiled `pbf` geometry
queries (WebMercator bbox tiles) + one 9.4 MB full-geometry JSON query.
I.e. every chart number is a live aggregation over:

- `Producao/Estoque_Áreas_Disponibilidade_2024/FeatureServer/0`
- `Producao/Áreas_Disponibilidade___Resultado/FeatureServer/0`

That panel tracks **auction rounds** (oferta pública/leilão, arrematada/
fracassada, em andamento) — a different topic from active mining claims,
so the daily job does not consume it.

## The daily job

`scripts/sync-anm-vulcan.mjs` (Node stdlib only — manual ZIP/SHP/DBF
parsers, no GDAL):

```
node scripts/sync-anm-vulcan.mjs [--out DIR] [--source zip|arcgis|auto]
  [--radius-km 50] [--center lng,lat] [--ufs SP,MG] [--substances ree|all]
  [--dry-run] [--no-download] [--tmp DIR] [--keep-tmp]
  [--with-overlaps PROTECTED:OUT] [--report PATH]
```

1. **Load** — `zip` (default path of `auto` fallback): download SP+MG zips,
   parse Polygon/PolygonZ + DBF. `arcgis`: paginated envelope query on
   `dados_anm/0` with quad-split (the service rejects paging params with
   HTTP 400). Both paths validated to converge (237 claims, identical
   histogram, 2026-09-14).
2. **Filter** — centroid haversine ≤ radius; dedupe by `DSProcesso`
   (border claims repeat per UF, nearest wins); default `--substances ree`
   keeps rare-earth-relevant claims only (exact SUBS table + keyword
   fallback for new substances; `--substances all` keeps bulk mining too).
3. **Emit** — `polygons.geojson` (UPPERCASE schema + category/lon/lat),
   `points.geojson` (lowercase schema), `deep_analysis.json` patch
   (`last_sync`, `year_counts`, `regional` 25/50 km counts + area),
   optional `points_overlaps.geojson` recompute (`--with-overlaps`).
4. **Guardrails** — aborts on zero results (never wipes); prints
   added/removed processo diff (`SYNC_STATUS=changed|unchanged`).

Scheduled: `.github/workflows/anm-sync.yml` — daily 06:30 UTC +
`workflow_dispatch`; commits `public/data/rare-earth/pococaldas/` only on
change; uploads the JSON report as artifact.

Local validation:

```
node scripts/sync-anm-vulcan.mjs --source zip --dry-run   # full pipeline, no writes
```
