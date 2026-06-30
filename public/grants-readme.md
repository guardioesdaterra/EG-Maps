# 🌱 GRANTS RADAR
### Worldwide Open Grants for Socio-Environmental Art-Activism

> **Earth Guardians South America** / EG-Maps integration  
> AGPL-3.0 — stay free, stay open.

---

## What it does

Crawls **15+ sources** concurrently using async HTTP, parses RSS/Atom feeds, hits official REST APIs, and scrapes grant aggregator sites. Scores each result for relevance to **socio-environmental art-activism**, deduplicates, filters by country/region, and saves outputs in **JSON + CSV + Markdown + GeoJSON** (for EG-Maps map layer integration).

### Sources covered

| Source | Type | Region | Focus |
|--------|------|--------|-------|
| `capta.org.br` | WP REST + HTML scraper | BR | Socioambiental CSOs |
| `prosas.com.br` | WP REST + HTML scraper | BR | Largest BR grants aggregator |
| `casa.org.br` | WP REST + HTML scraper | BR | Fundo Casa Socioambiental |
| `grants.gov` | Official REST API (no key) | US | US Federal grants |
| `eu-funding` | SEDIA REST API | EU | Horizon, LIFE, Erasmus+ |
| `usaspending.gov` | Official REST API | US | Follow-the-money |
| `RSS feeds` | 20+ feeds | GLOBAL | Foundations, gov, advocacy |
| `candid.org` | Public feed | US | Foundation grants |
| `un-multilateral` | HTML scraper | GLOBAL | UNDP, UNEP, GEF, IUCN |
| `greengrants.org` | WP REST + HTML | GLOBAL | Grassroots env |
| `latam-sources` | HTML scraper | LATAM | Avina, Skoll, IAF, etc. |
| `eu-foundations` | HTML scraper | EU | Doen, Porticus, Sida |
| `wp-sites` | WP REST | GLOBAL | Grant-publishing WP sites |
| `grantwatch.com` | HTML scraper | US | Broad aggregator |
| `propublica` | Official REST API | US | Nonprofit / funder profiles |

---

## Quick start

```bash
# Install
pip install -r requirements.txt

# Full global scan
python grants_radar.py

# Brazil only
python grants_radar.py --country BR

# South America + environment keywords
python grants_radar.py --country LATAM --keywords "amazônia,floresta,mineração"

# Only use fast/reliable sources
python grants_radar.py --sources capta,casa,prosas,grantsgov,rss

# Force refresh (clear cache)
python grants_radar.py --refresh

# List available sources
python grants_radar.py --list-sources
```

---

## Scheduler

```bash
# One-shot with digest
python scheduler.py once --country BR

# Daemon: run every 12 hours
python scheduler.py daemon --interval 12

# Show new grants since last run
python scheduler.py diff

# Export GeoJSON for EG-Maps
python scheduler.py export --format geojson
python scheduler.py export --format csv --country BR --min-score 20
```

---

## GitHub Actions

The included workflow `.github/workflows/daily-scan.yml` runs daily at 06:00 UTC and commits outputs back to the repo. Trigger manually from Actions tab with custom country/source filters.

---

## Outputs

All outputs go to `output/`:

| File | Format | Use |
|------|--------|-----|
| `grants_radar_YYYYMMDD_HHMM.json` | JSON | Full structured data |
| `grants_radar_YYYYMMDD_HHMM.csv` | CSV | Spreadsheet / analysis |
| `grants_radar_YYYYMMDD_HHMM.md` | Markdown | Human-readable digest |
| `grants_eg-maps.geojson` | GeoJSON | EG-Maps map layer |
| `digest_YYYYMMDD_HHMM.md` | Markdown | New grants since last run |

### GeoJSON integration with EG-Maps

The GeoJSON export is ready to load as a MapLibre GL layer:

```javascript
// In your EG-Maps Nuxt/MapLibre component:
map.addSource('grants', {
  type: 'geojson',
  data: '/output/grants_eg-maps.geojson',
});

map.addLayer({
  id: 'grants-circles',
  type: 'circle',
  source: 'grants',
  paint: {
    'circle-radius': ['interpolate', ['linear'],
      ['get', 'relevance'], 0, 4, 100, 14],
    'circle-color': ['get', 'marker_color'],
    'circle-opacity': 0.8,
  },
});
```

---

## Relevance scoring

Each grant gets a 0–100 score based on keyword matching:

- **Core keywords** (×8 pts each): socioambiental, environmental justice, indigenous, quilombola, artivismo, sacrifice zone, mineração, Amazônia, etc.
- **Secondary keywords** (×2 pts each): culture, community, sustainability, etc.

Score thresholds in practice:
- **60–100** ⭐ High relevance — direct match to EG mission
- **20–59** 🔹 Medium — worth reviewing
- **5–19** · Low — tangential, included for completeness

Set `--min-score 20` to only see medium+ results.

---

## Adding new sources

Each source is a simple `async def fetch_xxx(session) -> list:` function that returns a list of grant dicts from `make_grant()`. Register it in `ALL_SOURCES` at the bottom of `grants_radar.py`.

```python
async def fetch_my_source(session) -> list:
    grants = []
    html = await fetch(session, "https://example.org/grants/")
    soup = BeautifulSoup(html, "lxml")
    # ... parse
    grants.append(make_grant(
        title="Grant Name",
        source_name="example.org",
        url="https://example.org/grant/1",
        description="...",
        country="BR",
        deadline="2026-09-30",
        amount_max="50000",
        currency="BRL",
        language="pt",
    ))
    return grants

ALL_SOURCES["mysource"] = fetch_my_source
```

---

## Cache

Responses are cached in `cache/` for 6 hours (configurable via `CACHE_TTL_HOURS`). Use `--refresh` to force re-fetching.

---

## License

AGPL-3.0 — if you deploy this as a service, the source must remain open.  
Earth Guardians South America — [guardioesdaterra.org.br](https://guardioesdaterra.org.br)
