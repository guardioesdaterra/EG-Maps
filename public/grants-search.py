#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════╗
║  GRANTS RADAR — Socio-Environmental Art-Activism Grants      ║
║  Worldwide open grants aggregator for Earth Guardians / EG   ║
║  Author: Tupã / Earth Guardians South America                ║
║  License: AGPL-3.0 — keep it free, keep it open             ║
╚══════════════════════════════════════════════════════════════╝

Deep-crawls 20+ sources: official APIs (Grants.gov, EU Tenders,
USASpending), RSS/Atom feeds, WordPress REST APIs, scraped HTML,
JSON endpoints. Deduplicates, scores relevance, filters by country,
saves to JSON + CSV + Markdown for EG-Maps integration.

Usage:
  python grants_radar.py               # full run, all sources
  python grants_radar.py --country BR  # Brazil only
  python grants_radar.py --country GLOBAL --keywords "art,climate"
  python grants_radar.py --sources capta,grantsgov,eu
  python grants_radar.py --refresh     # clear cache, force refetch
"""

import asyncio
import aiohttp
import aiofiles
import json
import csv
import hashlib
import re
import sys
import os
import time
import logging
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Optional
from urllib.parse import urlencode, quote, urlparse, urljoin

import feedparser
from bs4 import BeautifulSoup
from dateutil import parser as dateparser
from rich.console import Console
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn
from rich.panel import Panel
from rich.text import Text
import click

# ──────────────────────────────────────────────────────────────
# CONFIG
# ──────────────────────────────────────────────────────────────

BASE_DIR   = Path(__file__).parent
CACHE_DIR  = BASE_DIR / "cache"
OUTPUT_DIR = BASE_DIR / "output"
LOG_DIR    = BASE_DIR / "logs"

for d in [CACHE_DIR, OUTPUT_DIR, LOG_DIR]:
    d.mkdir(exist_ok=True)

CACHE_TTL_HOURS = 6        # re-fetch after this many hours
MAX_CONCURRENT  = 12       # simultaneous HTTP connections
REQUEST_TIMEOUT = 30       # seconds per request
RATE_LIMIT_DELAY = 0.4     # seconds between requests to same domain

console = Console()

# Keywords that signal relevance for our mission
CORE_KEYWORDS = [
    # Socio-environmental
    "socioambiental", "socio-environmental", "environmental justice",
    "climate justice", "justiça climática", "meio ambiente",
    "sacrifice zone", "zona de sacrifício", "mineração", "mining",
    "indigenous", "indígena", "quilombola", "comunidades tradicionais",
    "biodiversity", "biodiversidade", "ecosystem", "ecossistema",
    "deforestation", "desmatamento", "amazônia", "amazon",
    "climate change", "mudanças climáticas", "carbon", "carbono",

    # Art-Activism
    "art activism", "artivismo", "arte ativismo", "arte política",
    "cultural activism", "ativismo cultural", "arte comunitária",
    "community art", "street art", "arte urbana", "muralismo",
    "performance", "teatro popular", "música popular",
    "documentary", "documentário", "journalism", "jornalismo",
    "creative activism", "criatividade", "artes visuais",
    "observatório", "observatory", "monitoramento", "monitoring",

    # Rights & Justice
    "human rights", "direitos humanos", "land rights", "direito territorial",
    "defenders", "defensores", "grassroots", "base comunitária",
    "social justice", "justiça social", "territorial rights",

    # Org types
    "ong", "ngo", "nonprofit", "sociedade civil", "civil society",
    "movimento social", "social movement", "coletivo", "collective",
]

# Broader category terms for secondary scoring
SECONDARY_KEYWORDS = [
    "culture", "cultura", "arts", "artes", "education", "educação",
    "environment", "ambiente", "sustainability", "sustentabilidade",
    "community", "comunidade", "development", "desenvolvimento",
    "green", "verde", "ecology", "ecologia", "conservation",
]

# ──────────────────────────────────────────────────────────────
# DATA MODEL
# ──────────────────────────────────────────────────────────────

def make_grant(
    title: str,
    source_name: str,
    url: str,
    description: str = "",
    funder: str = "",
    deadline: str = "",
    amount_max: str = "",
    amount_min: str = "",
    currency: str = "",
    country: str = "",
    region: str = "",
    categories: list = None,
    language: str = "en",
    raw: dict = None,
) -> dict:
    uid = hashlib.md5(f"{source_name}::{url}".encode()).hexdigest()[:12]
    text_blob = f"{title} {description} {funder}".lower()
    score = score_relevance(text_blob)
    return {
        "id":          uid,
        "title":       title.strip(),
        "funder":      funder.strip(),
        "source":      source_name,
        "url":         url,
        "description": description.strip()[:1200],
        "deadline":    deadline,
        "amount_max":  amount_max,
        "amount_min":  amount_min,
        "currency":    currency,
        "country":     country,
        "region":      region,
        "categories":  categories or [],
        "language":    language,
        "relevance":   score,
        "fetched_at":  datetime.now(timezone.utc).isoformat(),
        "_raw":        raw or {},
    }


def score_relevance(text: str) -> int:
    """Return 0–100 relevance score for our mission."""
    text = text.lower()
    hits_core = sum(1 for kw in CORE_KEYWORDS if kw.lower() in text)
    hits_sec  = sum(1 for kw in SECONDARY_KEYWORDS if kw.lower() in text)
    raw = hits_core * 8 + hits_sec * 2
    return min(100, raw)


# ──────────────────────────────────────────────────────────────
# CACHE
# ──────────────────────────────────────────────────────────────

def cache_path(key: str) -> Path:
    safe = hashlib.md5(key.encode()).hexdigest()
    return CACHE_DIR / f"{safe}.json"


async def cache_get(key: str) -> Optional[dict]:
    p = cache_path(key)
    if not p.exists():
        return None
    try:
        async with aiofiles.open(p) as f:
            data = json.loads(await f.read())
        age_h = (time.time() - data["_ts"]) / 3600
        if age_h > CACHE_TTL_HOURS:
            return None
        return data["payload"]
    except Exception:
        return None


async def cache_set(key: str, payload):
    p = cache_path(key)
    async with aiofiles.open(p, "w") as f:
        await f.write(json.dumps({"_ts": time.time(), "payload": payload}, ensure_ascii=False))


# ──────────────────────────────────────────────────────────────
# HTTP HELPERS
# ──────────────────────────────────────────────────────────────

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; GrantsRadar/1.0; "
        "+https://github.com/guardioesdaterra/EG-Maps) "
        "Python/aiohttp"
    ),
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7,es;q=0.6",
}

_domain_last_req: dict = {}


async def fetch(session: aiohttp.ClientSession, url: str,
                method="GET", json_body=None, headers=None,
                use_cache=True) -> Optional[str]:
    """Fetch URL with caching, rate-limiting, retries."""
    cache_key = f"{method}::{url}::{json.dumps(json_body or {}, sort_keys=True)}"

    if use_cache:
        cached = await cache_get(cache_key)
        if cached is not None:
            return cached

    domain = urlparse(url).netloc
    now = time.time()
    wait = RATE_LIMIT_DELAY - (now - _domain_last_req.get(domain, 0))
    if wait > 0:
        await asyncio.sleep(wait)
    _domain_last_req[domain] = time.time()

    h = {**HEADERS, **(headers or {})}
    for attempt in range(3):
        try:
            if method == "POST":
                async with session.post(url, json=json_body, headers=h,
                                        timeout=aiohttp.ClientTimeout(total=REQUEST_TIMEOUT)) as r:
                    if r.status >= 400:
                        return None
                    text = await r.text()
            else:
                async with session.get(url, headers=h,
                                       timeout=aiohttp.ClientTimeout(total=REQUEST_TIMEOUT)) as r:
                    if r.status >= 400:
                        return None
                    text = await r.text()
            if use_cache:
                await cache_set(cache_key, text)
            return text
        except asyncio.TimeoutError:
            await asyncio.sleep(1.5 ** attempt)
        except Exception as e:
            if attempt == 2:
                logging.debug(f"Failed {url}: {e}")
            await asyncio.sleep(1.5 ** attempt)
    return None


async def fetch_json(session, url, method="GET", json_body=None,
                     use_cache=True) -> Optional[dict]:
    text = await fetch(session, url, method=method, json_body=json_body,
                       headers={"Accept": "application/json"},
                       use_cache=use_cache)
    if not text:
        return None
    try:
        return json.loads(text)
    except Exception:
        return None


def parse_date(s: str) -> str:
    """Try to parse any date string to ISO format."""
    if not s:
        return ""
    try:
        return dateparser.parse(str(s), fuzzy=True).date().isoformat()
    except Exception:
        return str(s)[:20]


def clean_html(html: str) -> str:
    """Strip HTML to plain text."""
    soup = BeautifulSoup(html or "", "lxml")
    return re.sub(r'\s+', ' ', soup.get_text(separator=' ')).strip()


# ══════════════════════════════════════════════════════════════
#  SOURCE PLUGINS
# ══════════════════════════════════════════════════════════════

# ── 1. CAPTA.ORG.BR (WordPress, Brazilian socio-environmental) ─

async def fetch_capta(session) -> list:
    """
    ISPN/Capta: socio-environmental grants for Brazilian CSOs.
    Uses WordPress REST API + HTML fallback scraper.
    """
    grants = []
    SOURCE = "capta.org.br"
    BASE   = "https://capta.org.br"

    # Primary: WP JSON REST API (posts tagged 'oportunidades')
    api_url = f"{BASE}/wp-json/wp/v2/posts?per_page=50&categories=&tags=&_embed=true"
    # Try category slug 'oportunidades'
    urls_to_try = [
        f"{BASE}/wp-json/wp/v2/posts?per_page=100&_embed=true&search=edital",
        f"{BASE}/wp-json/wp/v2/posts?per_page=100&_embed=true&categories_name=oportunidades",
    ]

    wp_posts = []
    for api_url in urls_to_try:
        data = await fetch_json(session, api_url)
        if data and isinstance(data, list) and len(data) > 0:
            wp_posts = data
            break

    for post in wp_posts:
        title   = clean_html(post.get("title", {}).get("rendered", ""))
        content = clean_html(post.get("content", {}).get("rendered", ""))
        url     = post.get("link", "")
        date    = post.get("date", "")

        # Extract deadline from content
        deadline = ""
        m = re.search(r'Inscrições\s+até[:\s]+([0-9/]+)', content)
        if m:
            deadline = parse_date(m.group(1).replace("/", "-"))

        # Extract region
        region = ""
        m = re.search(r'Região[:\s]+([^\n.]+)', content)
        if m:
            region = m.group(1).strip()

        grants.append(make_grant(
            title=title, source_name=SOURCE, url=url,
            description=content[:500], country="BR",
            region=region, deadline=deadline, language="pt",
        ))

    # Fallback: scrape HTML page directly
    if not wp_posts:
        html = await fetch(session, f"{BASE}/fontes-de-financiamento/oportunidades/")
        if html:
            soup = BeautifulSoup(html, "lxml")
            for article in soup.select("article, .entry-content h3, .quadro-oportunidades h3"):
                title_el = article.find(["h2", "h3", "h4"])
                if not title_el:
                    continue
                title = title_el.get_text(strip=True)
                link_el = title_el.find("a") or article.find("a")
                url = urljoin(BASE, link_el["href"]) if link_el and link_el.get("href") else ""
                text = article.get_text(separator=" ")

                deadline = ""
                m = re.search(r'Inscrições até:?\s*([0-9]{2}/[0-9]{2}/[0-9]{4})', text)
                if m:
                    deadline = parse_date(m.group(1).replace("/", "-"))

                m2 = re.search(r'Região:?\s*([^\n]+)', text)
                region = m2.group(1).strip() if m2 else ""

                if not url and link_el:
                    url = f"{BASE}/oportunidades/"

                grants.append(make_grant(
                    title=title, source_name=SOURCE, url=url,
                    description=text[:500], country="BR",
                    region=region, deadline=deadline, language="pt",
                ))

    console.print(f"  [cyan]capta.org.br[/]  → {len(grants)} grants")
    return grants


# ── 2. PROSAS.COM.BR (Brazilian largest grants platform) ───────

async def fetch_prosas(session) -> list:
    """
    Prosas: Brazil's largest grant aggregator for civil society.
    Has public listing endpoints used by their widget.
    """
    grants = []
    SOURCE = "prosas.com.br"

    # Prosas widget API (public, no auth)
    # Inspecting their network calls reveals this endpoint:
    api_urls = [
        "https://prosas.com.br/editais?format=json&per_page=50",
        "https://api.prosas.com.br/v1/editais?open=true&per_page=100",
    ]

    # Also scrape their main editais page
    html = await fetch(session, "https://prosas.com.br/editais")
    if html:
        soup = BeautifulSoup(html, "lxml")
        for card in soup.select(".edital-card, .card-edital, article[class*='edital']"):
            title_el = card.find(["h2","h3","h4","h5"])
            link_el  = card.find("a")
            if not title_el:
                continue
            title = title_el.get_text(strip=True)
            url   = urljoin("https://prosas.com.br", link_el["href"]) if link_el and link_el.get("href") else ""
            text  = card.get_text(separator=" ")

            deadline = ""
            m = re.search(r'(\d{2}/\d{2}/\d{4}|\d{4}-\d{2}-\d{2})', text)
            if m:
                deadline = parse_date(m.group(1))

            grants.append(make_grant(
                title=title, source_name=SOURCE, url=url,
                description=text[:400], country="BR",
                deadline=deadline, language="pt",
            ))

    # WordPress REST API for prosas subdomain/blog
    for api_url in api_urls:
        data = await fetch_json(session, api_url)
        if data and isinstance(data, list):
            for item in data[:50]:
                title = item.get("title") or item.get("nome", "")
                url   = item.get("url") or item.get("link", "")
                desc  = item.get("description") or item.get("descricao", "")
                dl    = item.get("deadline") or item.get("data_fim", "")
                grants.append(make_grant(
                    title=title, source_name=SOURCE, url=url,
                    description=clean_html(desc)[:400], country="BR",
                    deadline=parse_date(dl), language="pt",
                ))
            break

    console.print(f"  [cyan]prosas.com.br[/]  → {len(grants)} grants")
    return grants


# ── 3. GRANTS.GOV (USA federal grants — public REST API) ───────

async def fetch_grantsgov(session) -> list:
    """
    Grants.gov public search API (no key required).
    POST /v1/api/search2 with keyword + category filters.
    """
    grants = []
    SOURCE = "grants.gov"
    API    = "https://api.grants.gov/v1/api/search2"

    keyword_sets = [
        "environmental justice art",
        "socio-environmental activism",
        "indigenous community environment",
        "climate justice arts culture",
        "environmental humanities",
        "community environmental arts",
    ]

    seen_ids = set()
    for kw in keyword_sets:
        body = {
            "keyword": kw,
            "oppStatuses": "posted",
            "rows": 25,
            "sortBy": "openDate|desc",
        }
        data = await fetch_json(session, API, method="POST", json_body=body)
        if not data:
            continue

        hits = (data.get("data") or {}).get("hits") or []
        for h in hits:
            gid = h.get("id") or h.get("opportunity_id", "")
            if gid in seen_ids:
                continue
            seen_ids.add(gid)

            title   = h.get("opportunityTitle") or h.get("title", "")
            agency  = h.get("agencyName", "")
            url     = f"https://grants.gov/search-results-detail/{gid}"
            desc    = h.get("synopsis") or h.get("description", "")
            dl      = h.get("closeDate") or h.get("deadline", "")
            award   = h.get("awardCeiling") or h.get("award_ceiling", "")
            award_f = h.get("awardFloor") or h.get("award_floor", "")

            grants.append(make_grant(
                title=title, source_name=SOURCE, url=url,
                description=clean_html(str(desc))[:500],
                funder=agency, deadline=parse_date(str(dl)),
                amount_max=str(award), amount_min=str(award_f),
                currency="USD", country="US", language="en",
            ))

    console.print(f"  [cyan]grants.gov[/]     → {len(grants)} grants")
    return grants


# ── 4. EU FUNDING & TENDERS PORTAL (official API) ─────────────

async def fetch_eu_tenders(session) -> list:
    """
    European Commission Funding & Tenders Portal.
    SEDIA search API — no auth for read.
    """
    grants = []
    SOURCE = "eu-funding.europa.eu"

    # Official SEDIA search endpoint
    API = "https://api.tech.ec.europa.eu/search-api/prod/rest/search"

    queries = [
        "environmental art culture climate",
        "civil society environment justice",
        "arts climate activism",
        "community environment indigenous",
    ]

    for q in queries:
        params = {
            "apiKey":   "SEDIA",
            "text":     q,
            "pageSize": 20,
            "pageNumber": 1,
            "languages": ["en", "pt", "es", "fr"],
        }
        # Try the public search endpoint used by the portal UI
        url = "https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/calls-for-proposals"

        # LIFE programme specific API
        life_url = (
            "https://ec.europa.eu/environment/life/project/Projects/index.cfm"
            "?fuseaction=search.dspPage&n_proj_id=&w=undefined&keyword="
            + quote(q) + "&type=TRADITIONAL_PROJECTS"
        )

        # Use the SEDIA REST endpoint (discovered via devtools)
        sedia_url = (
            "https://api.tech.ec.europa.eu/search-api/prod/rest/search"
            "?apiKey=SEDIA&text=" + quote(q)
            + "&pageSize=15&pageNumber=1&action=search"
        )

        data = await fetch_json(session, sedia_url)
        if data and data.get("results"):
            for r in data["results"]:
                md = r.get("metadata", {})
                title  = md.get("title", {}).get("value", [""])[0]
                url    = md.get("url", {}).get("value", [""])[0]
                desc   = md.get("description", {}).get("value", [""])[0]
                dl     = md.get("deadline", {}).get("value", [""])[0]
                prog   = md.get("programme", {}).get("value", [""])[0]

                if not title:
                    continue

                grants.append(make_grant(
                    title=title, source_name=SOURCE, url=url or sedia_url,
                    description=clean_html(desc)[:500],
                    funder="European Commission", deadline=parse_date(dl),
                    country="EU", region=prog, currency="EUR",
                    language="en", categories=["EU", "Horizon Europe", "LIFE"],
                ))

    # Also try the simplified public search used by portal
    portal_search = (
        "https://ec.europa.eu/info/funding-tenders/opportunities/portal/"
        "screen/opportunities/calls-for-proposals;freeTextSearchKeyword="
        "environment%20art%20civil%20society;typeCodes=1"
    )

    console.print(f"  [cyan]eu-funding[/]     → {len(grants)} grants")
    return grants


# ── 5. RSS / ATOM FEED AGGREGATION ────────────────────────────

RSS_FEEDS = [
    # US Gov
    ("grants.gov — Environment",
     "https://www.grants.gov/rss/GG_OppNotPosted.xml?oppCategories=ENV",
     "US", "en"),
    ("grants.gov — Art/Culture",
     "https://www.grants.gov/rss/GG_OppNotPosted.xml?oppCategories=AR",
     "US", "en"),
    ("grants.gov — All New",
     "https://www.grants.gov/rss/GG_NewOppPosted.xml",
     "US", "en"),

    # Foundation / Global
    ("Ford Foundation",
     "https://www.fordfoundation.org/feed/",
     "GLOBAL", "en"),
    ("Open Society Foundations",
     "https://www.opensocietyfoundations.org/newsroom/rss",
     "GLOBAL", "en"),
    ("Ashoka Changemakers",
     "https://www.changemakers.com/feeds/challenges",
     "GLOBAL", "en"),

    # Brazil
    ("Fundo Amazônia BNDES",
     "https://www.bndes.gov.br/wps/portal/site/home/transparencia/!ut/p/z0/feed.xml",
     "BR", "pt"),
    ("FINEP Brasil",
     "https://www.finep.gov.br/noticias/rss",
     "BR", "pt"),
    ("MinC Brasil — Cultura",
     "https://www.gov.br/cultura/pt-br/assuntos/noticias/RSS",
     "BR", "pt"),

    # Latin America
    ("IICA Grants",
     "https://www.iica.int/es/content/convocatorias/feed",
     "LATAM", "es"),
    ("Fondo Acción Urgente Colombia",
     "https://fondoaccionurgente.org.co/feed/",
     "LATAM", "es"),
    ("GEF Small Grants Programme",
     "https://sgp.undp.org/news-and-events/news.html?format=feed",
     "GLOBAL", "en"),

    # Environment & Climate
    ("UNEP News",
     "https://www.unep.org/feed.xml",
     "GLOBAL", "en"),
    ("350.org",
     "https://350.org/feed/",
     "GLOBAL", "en"),
    ("Climate Justice Alliance",
     "https://climatejusticealliance.org/feed/",
     "GLOBAL", "en"),

    # Arts & Culture
    ("National Endowment for the Arts",
     "https://www.arts.gov/rss.xml",
     "US", "en"),
    ("Rhizome — Digital Art",
     "https://rhizome.org/feed/",
     "GLOBAL", "en"),

    # Philanthropy news
    ("Inside Philanthropy",
     "https://www.insidephilanthropy.com/home/rss.xml",
     "GLOBAL", "en"),
    ("Alliance Magazine",
     "https://www.alliancemagazine.org/feed/",
     "GLOBAL", "en"),
    ("Devex Funding",
     "https://www.devex.com/news/rss.xml",
     "GLOBAL", "en"),

    # Indigenous / Rights
    ("Cultural Survival Grants",
     "https://www.culturalsurvival.org/rss.xml",
     "GLOBAL", "en"),
    ("Frontline Defenders",
     "https://www.frontlinedefenders.org/rss.xml",
     "GLOBAL", "en"),
]


async def fetch_rss_feeds(session) -> list:
    """Parse all RSS/Atom feeds concurrently."""
    grants = []
    tasks  = []

    async def _one_feed(name, url, country, lang):
        text = await fetch(session, url)
        if not text:
            return []
        result = []
        try:
            feed = feedparser.parse(text)
            for entry in feed.entries[:30]:
                title = entry.get("title", "")
                link  = entry.get("link", url)
                desc  = entry.get("summary") or entry.get("description", "")
                pub   = entry.get("published") or entry.get("updated", "")

                full_text = f"{title} {clean_html(desc)}".lower()
                if score_relevance(full_text) < 5:
                    continue  # skip totally irrelevant entries

                result.append(make_grant(
                    title=title, source_name=f"rss:{name}", url=link,
                    description=clean_html(desc)[:500], country=country,
                    deadline=parse_date(pub), language=lang,
                ))
        except Exception as e:
            logging.debug(f"RSS parse error {url}: {e}")
        return result

    results = await asyncio.gather(*[
        _one_feed(name, url, country, lang)
        for name, url, country, lang in RSS_FEEDS
    ])
    for r in results:
        grants.extend(r)

    console.print(f"  [cyan]RSS feeds[/]      → {len(grants)} relevant entries")
    return grants


# ── 6. CASA SOCIOAMBIENTAL (Brazil — environment + culture) ───

async def fetch_casa_socioambiental(session) -> list:
    """Fundo Casa Socioambiental — major Brazilian env fund."""
    grants = []
    SOURCE = "casa.org.br"
    BASE   = "https://casa.org.br"

    for path in ["/chamadas/", "/chamadas/aberta/", "/chamadas/?status=aberta"]:
        html = await fetch(session, BASE + path)
        if not html:
            continue
        soup = BeautifulSoup(html, "lxml")
        for card in soup.select("article, .chamada-card, .post"):
            title_el = card.find(["h1","h2","h3"])
            if not title_el:
                continue
            title   = title_el.get_text(strip=True)
            link_el = card.find("a")
            url     = urljoin(BASE, link_el["href"]) if link_el and link_el.get("href") else BASE
            text    = card.get_text(separator=" ")

            dl = ""
            m = re.search(r'(\d{2}/\d{2}/\d{4}|\d{4}-\d{2}-\d{2})', text)
            if m:
                dl = parse_date(m.group(1))

            grants.append(make_grant(
                title=title, source_name=SOURCE, url=url,
                description=text[:500], country="BR",
                deadline=dl, language="pt",
            ))
        if grants:
            break

    # Also try WP REST API
    api = f"{BASE}/wp-json/wp/v2/posts?per_page=50&_embed=true"
    data = await fetch_json(session, api)
    if data and isinstance(data, list):
        for post in data:
            title   = clean_html(post.get("title", {}).get("rendered", ""))
            content = clean_html(post.get("content", {}).get("rendered", ""))
            url     = post.get("link", "")
            dl      = ""
            m = re.search(r'(\d{2}/\d{2}/\d{4})', content)
            if m:
                dl = parse_date(m.group(1))
            grants.append(make_grant(
                title=title, source_name=SOURCE, url=url,
                description=content[:500], country="BR",
                deadline=dl, language="pt",
            ))

    console.print(f"  [cyan]casa socioambiental[/] → {len(grants)} grants")
    return grants


# ── 7. USASPENDING.GOV (USA — follow the money) ───────────────

async def fetch_usaspending(session) -> list:
    """
    USASpending.gov open API — search assistance awards
    in environmental / arts categories.
    """
    grants = []
    SOURCE = "usaspending.gov"
    API    = "https://api.usaspending.gov/api/v2/search/spending_by_award/"

    # CFDA (Catalog of Federal Domestic Assistance) codes
    # 15.xxx = Interior/Environment, 45.xxx = NEA/Arts, 66.xxx = EPA
    cfda_targets = ["66", "45", "15", "93", "10"]  # EPA, NEA, Interior, HHS, USDA

    body = {
        "subawards": False,
        "filters": {
            "award_type_codes": ["02", "03", "04", "05"],  # grants only
            "time_period": [{"start_date": "2024-01-01", "end_date": "2026-12-31"}],
            "keywords": ["environmental justice", "art", "indigenous", "climate community"],
        },
        "fields": ["Award ID", "Recipient Name", "Award Amount", "Awarding Agency",
                   "Award Type", "Description", "Period of Performance End Date",
                   "CFDA Number", "CFDA Title"],
        "page": 1,
        "limit": 50,
        "sort": "Award Amount",
        "order": "desc",
    }

    data = await fetch_json(session, API, method="POST", json_body=body)
    if data and data.get("results"):
        for item in data["results"]:
            title   = item.get("Description") or item.get("CFDA Title", "")
            agency  = item.get("Awarding Agency", "")
            amount  = str(item.get("Award Amount", ""))
            recip   = item.get("Recipient Name", "")
            dl      = item.get("Period of Performance End Date", "")
            aid     = item.get("Award ID", "")
            url     = f"https://www.usaspending.gov/award/{aid}" if aid else API

            grants.append(make_grant(
                title=title or f"Award to {recip}",
                source_name=SOURCE, url=url,
                description=f"Recipient: {recip}. Agency: {agency}",
                funder=agency, amount_max=amount,
                deadline=parse_date(dl), currency="USD", country="US",
                language="en",
            ))

    console.print(f"  [cyan]usaspending.gov[/] → {len(grants)} grants")
    return grants


# ── 8. CANDID / GuideStar Foundation Search ───────────────────

async def fetch_candid_grants(session) -> list:
    """
    Candid/Foundation Center: public grant notices feed.
    Their public XML feed is accessible without subscription.
    """
    grants = []
    SOURCE = "candid.org"

    # Candid's public recent grants XML feed
    feeds = [
        "https://candid.org/rss/recent-grants",
        "https://philanthropy.com/feed",  # Chronicle of Philanthropy
    ]

    for feed_url in feeds:
        text = await fetch(session, feed_url)
        if not text:
            continue
        try:
            feed = feedparser.parse(text)
            for e in feed.entries[:40]:
                title = e.get("title", "")
                link  = e.get("link", feed_url)
                desc  = clean_html(e.get("summary", ""))
                pub   = e.get("published", "")
                if score_relevance(f"{title} {desc}".lower()) < 5:
                    continue
                grants.append(make_grant(
                    title=title, source_name=SOURCE, url=link,
                    description=desc[:500], country="US",
                    deadline=parse_date(pub), language="en",
                ))
        except Exception:
            pass

    console.print(f"  [cyan]candid.org[/]     → {len(grants)} grants")
    return grants


# ── 9. UN & MULTILATERAL ORGANIZATIONS ────────────────────────

async def fetch_un_sources(session) -> list:
    """
    UNDP, UNEP, GEF, IUCN — major multilateral grant sources.
    """
    grants = []
    SOURCE = "un-multilateral"

    sources = [
        # GEF Small Grants Programme
        ("gef-sgp",
         "https://sgp.undp.org/sgpdatabase/",
         "GLOBAL", "en"),

        # UNDP Procurement Notices (includes grants)
        ("undp-procurement",
         "https://procurement-notices.undp.org/view_notices.cfm?type=3&status=1",
         "GLOBAL", "en"),

        # IUCN Grants
        ("iucn",
         "https://www.iucn.org/funding",
         "GLOBAL", "en"),

        # Conservation Finance Alliance
        ("cfa",
         "https://www.conservationfinancealliance.org/",
         "GLOBAL", "en"),
    ]

    for name, url, country, lang in sources:
        html = await fetch(session, url)
        if not html:
            continue
        soup = BeautifulSoup(html, "lxml")
        for card in soup.select("article, .grant, .notice, .opportunity, li"):
            a = card.find("a")
            if not a:
                continue
            title = a.get_text(strip=True)
            if len(title) < 10:
                continue
            link = urljoin(url, a.get("href", ""))
            text = card.get_text(separator=" ")
            if score_relevance(text.lower()) < 3:
                continue

            dl = ""
            m = re.search(r'Deadline[:\s]+([A-Za-z0-9 ,/]+\d{4})', text)
            if m:
                dl = parse_date(m.group(1))

            grants.append(make_grant(
                title=title, source_name=f"un:{name}", url=link,
                description=text[:400], country=country,
                deadline=dl, language=lang,
                categories=["multilateral", "UN"],
            ))

    console.print(f"  [cyan]UN/multilateral[/] → {len(grants)} grants")
    return grants


# ── 10. GLOBAL GREEN GRANTS FUND ──────────────────────────────

async def fetch_greengrants(session) -> list:
    """
    Global Green Grants Fund — grassroots env grants worldwide.
    """
    grants = []
    SOURCE = "greengrants.org"
    BASE   = "https://www.greengrants.org"

    html = await fetch(session, f"{BASE}/apply-for-a-grant/")
    if html:
        soup = BeautifulSoup(html, "lxml")
        for section in soup.select("section, .grant-region, article"):
            title_el = section.find(["h2","h3","h4"])
            if not title_el:
                continue
            title = title_el.get_text(strip=True)
            link_el = section.find("a")
            url = urljoin(BASE, link_el["href"]) if link_el and link_el.get("href") else BASE
            text = section.get_text(separator=" ")
            if len(title) < 5:
                continue
            grants.append(make_grant(
                title=title, source_name=SOURCE, url=url,
                description=text[:400], country="GLOBAL",
                language="en", funder="Global Green Grants Fund",
                categories=["environment", "grassroots"],
            ))

    # Also their JSON API if exists
    api = f"{BASE}/wp-json/wp/v2/posts?per_page=50&_embed=true"
    data = await fetch_json(session, api)
    if data and isinstance(data, list):
        for post in data:
            title = clean_html(post.get("title", {}).get("rendered", ""))
            url   = post.get("link", "")
            desc  = clean_html(post.get("content", {}).get("rendered", ""))
            if score_relevance(f"{title} {desc}".lower()) < 3:
                continue
            grants.append(make_grant(
                title=title, source_name=SOURCE, url=url,
                description=desc[:500], country="GLOBAL",
                language="en", funder="Global Green Grants Fund",
            ))

    console.print(f"  [cyan]greengrants.org[/] → {len(grants)} grants")
    return grants


# ── 11. LATIN AMERICA SPECIFIC SOURCES ────────────────────────

async def fetch_latam_sources(session) -> list:
    """
    Sources focused on Latin America: foundations, gov programs.
    """
    grants = []

    latam_sources = [
        # Arcos Dorados (McDonald's) — but also Avina Foundation
        ("avina.net",
         "https://www.avina.net/convocatorias/",
         "LATAM", "es"),

        # Skoll Foundation (global/LA)
        ("skoll.org",
         "https://skoll.org/opportunities/",
         "GLOBAL", "en"),

        # Wellspring Philanthropic Fund
        ("wellspring.net",
         "https://www.wellspring.net/grantmaking/our-grants/",
         "GLOBAL", "en"),

        # Amazon Conservation Association
        ("amazonconservation.org",
         "https://www.amazonconservation.org/grants/",
         "LATAM", "en"),

        # Fondo Latinoamericano de Mujeres
        ("flam.org.ar",
         "https://www.flam.org.ar/convocatorias",
         "LATAM", "es"),

        # Inter-American Foundation
        ("iaf.gov",
         "https://www.iaf.gov/grants/",
         "LATAM", "en"),

        # MacArthur Foundation (Brazil focus)
        ("macfound.org",
         "https://www.macfound.org/programs/",
         "GLOBAL", "en"),

        # Tides Foundation Fiscal Sponsorship
        ("tides.org",
         "https://www.tides.org/grantmaking/",
         "GLOBAL", "en"),
    ]

    for name, url, country, lang in latam_sources:
        html = await fetch(session, url)
        if not html:
            continue
        soup = BeautifulSoup(html, "lxml")

        for tag in soup.select("article, .grant, .opportunity, .convocatoria, "
                                ".grant-item, li.grant"):
            a = tag.find("a")
            title_el = tag.find(["h1","h2","h3","h4","h5"])
            if not title_el:
                continue
            title = title_el.get_text(strip=True)
            url_g = urljoin(url, a["href"]) if a and a.get("href") else url
            text  = tag.get_text(separator=" ")
            if score_relevance(text.lower()) < 4 and score_relevance(title.lower()) < 4:
                continue

            dl = ""
            m = re.search(r'(\d{2}/\d{2}/\d{4}|\d{4}-\d{2}-\d{2}|'
                           r'[A-Z][a-z]+ \d{1,2},?\s*\d{4})', text)
            if m:
                dl = parse_date(m.group(1))

            amount = ""
            m2 = re.search(r'(USD?|BRL?|€|R\$)\s*([\d,\.]+)', text)
            if m2:
                amount = m2.group(0).strip()

            grants.append(make_grant(
                title=title, source_name=f"latam:{name}", url=url_g,
                description=text[:400], country=country,
                deadline=dl, amount_max=amount, language=lang,
            ))

    console.print(f"  [cyan]LATAM sources[/]  → {len(grants)} grants")
    return grants


# ── 12. EUROPEAN FOUNDATIONS ──────────────────────────────────

async def fetch_european_foundations(session) -> list:
    """
    Key European foundations with env/arts/rights programs.
    """
    grants = []

    eu_sources = [
        ("doen.nl",
         "https://www.doen.nl/en/applications/applications.htm",
         "EU", "en"),
        ("stichtingdoen.nl",
         "https://www.stichtingdoen.nl/en/apply/",
         "EU", "en"),
        ("fondation-de-france.org",
         "https://www.fondation-de-france.org/en/calls-for-projects",
         "EU", "fr"),
        ("porticus.com",
         "https://www.porticus.com/what-we-fund/",
         "EU", "en"),
        ("efc.be",  # European Foundation Centre
         "https://www.efc.be/programmes_services/funding/",
         "EU", "en"),
        ("sida.se",  # Swedish International Development
         "https://www.sida.se/en/for-partners/calling-for-proposals",
         "EU", "en"),
    ]

    for name, url, country, lang in eu_sources:
        html = await fetch(session, url)
        if not html:
            continue
        soup = BeautifulSoup(html, "lxml")

        for tag in soup.select("article, .call, .grant, .project, "
                                "[class*='call'], [class*='grant'], [class*='fund']"):
            a = tag.find("a")
            title_el = tag.find(["h1","h2","h3","h4"])
            if not title_el:
                continue
            title = title_el.get_text(strip=True)
            if len(title) < 8:
                continue
            url_g = urljoin(url, a["href"]) if a and a.get("href") else url
            text  = tag.get_text(separator=" ")

            if score_relevance(text.lower()) < 4:
                continue

            dl = ""
            m = re.search(r'Deadline[:\s]+(.{5,30})', text, re.IGNORECASE)
            if m:
                dl = parse_date(m.group(1))

            grants.append(make_grant(
                title=title, source_name=f"eu:{name}", url=url_g,
                description=text[:400], country=country,
                deadline=dl, currency="EUR", language=lang,
            ))

    console.print(f"  [cyan]EU foundations[/] → {len(grants)} grants")
    return grants


# ── 13. WORDPRESS REST API GENERIC CRAWLER ────────────────────

# Sites known to run WP and publish grants
WP_GRANT_SITES = [
    ("iucn.org",       "https://www.iucn.org",           "GLOBAL", "en"),
    ("fbbva.es",       "https://www.fbbva.es",            "EU",     "es"),
    ("fundaçao-bunge", "https://www.fundacaobunge.org.br","BR",     "pt"),
    ("fundobrasil",    "https://www.fundobrasil.org.br",  "BR",     "pt"),
    ("ispn.org.br",    "https://www.ispn.org.br",         "BR",     "pt"),
    ("iser.org.br",    "https://www.iser.org.br",         "BR",     "pt"),
]

async def fetch_wordpress_sites(session) -> list:
    """Generic WordPress REST API crawler for grant-publishing sites."""
    grants = []

    async def _wp_site(name, base, country, lang):
        result = []
        api = f"{base}/wp-json/wp/v2/posts?per_page=50&_embed=true"
        data = await fetch_json(session, api)
        if not data or not isinstance(data, list):
            return result
        for post in data:
            title   = clean_html(post.get("title", {}).get("rendered", ""))
            content = clean_html(post.get("content", {}).get("rendered", ""))
            url     = post.get("link", "")
            if score_relevance(f"{title} {content}".lower()) < 5:
                continue
            dl = ""
            m = re.search(r'(\d{2}/\d{2}/\d{4})', content)
            if m:
                dl = parse_date(m.group(1))
            result.append(make_grant(
                title=title, source_name=f"wp:{name}", url=url,
                description=content[:500], country=country,
                deadline=dl, language=lang,
            ))
        return result

    results = await asyncio.gather(*[
        _wp_site(n, b, c, l) for n, b, c, l in WP_GRANT_SITES
    ])
    for r in results:
        grants.extend(r)

    console.print(f"  [cyan]WordPress sites[/] → {len(grants)} grants")
    return grants


# ── 14. GRANTWATCH PUBLIC LISTINGS ────────────────────────────

async def fetch_grantwatch(session) -> list:
    """
    GrantWatch has some public preview listings (limited without sub).
    Scrape visible grant titles and links.
    """
    grants = []
    SOURCE = "grantwatch.com"

    categories = [
        "environment-grants",
        "art-grants",
        "indigenous-grants",
        "social-justice-grants",
        "international-grants",
    ]

    for cat in categories:
        url = f"https://www.grantwatch.com/cat/{cat}/"
        html = await fetch(session, url)
        if not html:
            continue
        soup = BeautifulSoup(html, "lxml")
        for row in soup.select(".grant_listing, .grant-row, article, .listing"):
            a = row.find("a")
            if not a:
                continue
            title = a.get_text(strip=True)
            link  = urljoin("https://www.grantwatch.com", a.get("href",""))
            text  = row.get_text(separator=" ")
            deadline = ""
            m = re.search(r'Deadline[:\s]+([A-Za-z]+\s+\d+,?\s+\d{4})', text)
            if m:
                deadline = parse_date(m.group(1))
            amount = ""
            m2 = re.search(r'\$([\d,]+)', text)
            if m2:
                amount = m2.group(0)

            if len(title) > 10:
                grants.append(make_grant(
                    title=title, source_name=SOURCE, url=link,
                    description=text[:300], country="US",
                    deadline=deadline, amount_max=amount,
                    language="en", categories=[cat.replace("-grants","")],
                ))

    console.print(f"  [cyan]grantwatch.com[/] → {len(grants)} grants")
    return grants


# ── 15. PHILANTHROPY DATA — ProPublica Nonprofit Explorer ─────

async def fetch_propublica(session) -> list:
    """
    ProPublica Nonprofit Explorer API — free, no key.
    Find funders active in env/arts/rights.
    """
    grants = []
    SOURCE = "propublica-nonprofits"
    API    = "https://projects.propublica.org/nonprofits/api/v2"

    queries = [
        "environmental justice",
        "indigenous rights environment",
        "climate art",
        "socio-environmental",
    ]

    for q in queries:
        url = f"{API}/search.json?q={quote(q)}&state[id]=&ntee[id]="
        data = await fetch_json(session, url)
        if not data:
            continue
        for org in (data.get("organizations") or [])[:15]:
            name   = org.get("name", "")
            ein    = org.get("ein", "")
            city   = org.get("city", "")
            state  = org.get("state", "")
            url_g  = f"https://projects.propublica.org/nonprofits/organizations/{ein}"
            grants.append(make_grant(
                title=f"Funder: {name} ({city}, {state})",
                source_name=SOURCE, url=url_g,
                description=f"EIN {ein} | NTEE: {org.get('ntee_code','')} | "
                             f"Filings available on ProPublica",
                funder=name, country="US", language="en",
                categories=["funder-profile"],
            ))

    console.print(f"  [cyan]ProPublica[/]     → {len(grants)} funder profiles")
    return grants


# ══════════════════════════════════════════════════════════════
#  AGGREGATION ENGINE
# ══════════════════════════════════════════════════════════════

ALL_SOURCES = {
    "capta":       fetch_capta,
    "prosas":      fetch_prosas,
    "casa":        fetch_casa_socioambiental,
    "grantsgov":   fetch_grantsgov,
    "eu":          fetch_eu_tenders,
    "rss":         fetch_rss_feeds,
    "usaspending": fetch_usaspending,
    "candid":      fetch_candid_grants,
    "un":          fetch_un_sources,
    "greengrants": fetch_greengrants,
    "latam":       fetch_latam_sources,
    "eufoundations": fetch_european_foundations,
    "wp":          fetch_wordpress_sites,
    "grantwatch":  fetch_grantwatch,
    "propublica":  fetch_propublica,
}


def deduplicate(grants: list) -> list:
    """Remove duplicates by URL and near-identical titles."""
    seen_urls  = {}
    seen_titles = {}
    result = []
    for g in sorted(grants, key=lambda x: x["relevance"], reverse=True):
        url_key   = g["url"].rstrip("/").lower().split("?")[0]
        title_key = re.sub(r'\s+', ' ', g["title"].lower().strip())[:80]
        if url_key in seen_urls or title_key in seen_titles:
            continue
        seen_urls[url_key]    = True
        seen_titles[title_key] = True
        result.append(g)
    return result


def filter_by_country(grants: list, country_filter: str) -> list:
    if not country_filter or country_filter.upper() == "ALL":
        return grants
    cf = country_filter.upper()
    if cf == "LATAM":
        include = {"BR", "AR", "CO", "MX", "PE", "CL", "EC", "VE", "BO",
                   "PY", "UY", "LATAM", "GLOBAL"}
    elif cf == "BR":
        include = {"BR", "LATAM", "GLOBAL"}
    elif cf == "EU":
        include = {"EU", "GLOBAL"}
    elif cf == "GLOBAL":
        return grants
    else:
        include = {cf, "GLOBAL"}
    return [g for g in grants if g.get("country","").upper() in include]


def filter_by_keywords(grants: list, keywords: str) -> list:
    if not keywords:
        return grants
    kws = [k.strip().lower() for k in keywords.split(",") if k.strip()]
    if not kws:
        return grants
    result = []
    for g in grants:
        blob = f"{g['title']} {g['description']} {g['funder']}".lower()
        if any(kw in blob for kw in kws):
            result.append(g)
    return result


# ══════════════════════════════════════════════════════════════
#  OUTPUT
# ══════════════════════════════════════════════════════════════

def save_json(grants: list, path: Path):
    with open(path, "w", encoding="utf-8") as f:
        json.dump({
            "generated": datetime.now(timezone.utc).isoformat(),
            "total":     len(grants),
            "grants":    grants,
        }, f, ensure_ascii=False, indent=2)


def save_csv(grants: list, path: Path):
    if not grants:
        return
    fields = ["id","title","funder","source","url","description",
              "deadline","amount_max","currency","country","region",
              "relevance","fetched_at"]
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(grants)


def save_markdown(grants: list, path: Path, title: str = "Grants Radar"):
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines = [
        f"# {title}",
        f"",
        f"> Generated: {now} | Total: {len(grants)} grants | "
        f"Sources: {len(set(g['source'] for g in grants))}",
        f"",
        f"---",
        f"",
    ]

    by_country: dict = {}
    for g in grants:
        country = g.get("country") or "GLOBAL"
        by_country.setdefault(country, []).append(g)

    for country in sorted(by_country.keys()):
        items = sorted(by_country[country], key=lambda x: x["relevance"], reverse=True)
        lines.append(f"## 🌍 {country} ({len(items)} opportunities)")
        lines.append("")
        for g in items:
            relevance_bar = "█" * min(10, g["relevance"] // 10)
            dl_str = f" · Deadline: **{g['deadline']}**" if g.get("deadline") else ""
            amt_str = f" · Max: {g['amount_max']} {g.get('currency','')}" \
                      if g.get("amount_max") and g["amount_max"] != "None" else ""
            lines += [
                f"### [{g['title']}]({g['url']})",
                f"**Funder:** {g.get('funder') or g['source']}{dl_str}{amt_str}",
                f"**Relevance:** `{relevance_bar}` {g['relevance']}/100",
                f"",
                f"{g['description'][:300]}...",
                f"",
                f"---",
                f"",
            ]

    path.write_text("\n".join(lines), encoding="utf-8")


def print_summary_table(grants: list):
    table = Table(
        title="🌱 Grants Radar — Top Results",
        show_header=True, header_style="bold green",
        min_width=80,
    )
    table.add_column("Score", style="cyan",    width=6)
    table.add_column("Country", style="yellow", width=8)
    table.add_column("Title",   style="white",  width=45)
    table.add_column("Deadline",style="magenta",width=12)
    table.add_column("Source",  style="dim",    width=18)

    for g in grants[:40]:
        table.add_row(
            str(g["relevance"]),
            g.get("country","?"),
            g["title"][:44],
            g.get("deadline","")[:10] or "—",
            g["source"][:17],
        )
    console.print(table)


# ══════════════════════════════════════════════════════════════
#  MAIN ORCHESTRATOR
# ══════════════════════════════════════════════════════════════

async def run_radar(
    sources_filter: Optional[str],
    country_filter: Optional[str],
    keywords: Optional[str],
    refresh: bool,
    min_relevance: int,
    output_prefix: str,
) -> list:

    if refresh:
        for f in CACHE_DIR.glob("*.json"):
            f.unlink()
        console.print("[yellow]Cache cleared.[/]")

    # Select which sources to run
    if sources_filter:
        src_keys = [s.strip() for s in sources_filter.split(",")]
        active = {k: v for k, v in ALL_SOURCES.items() if k in src_keys}
    else:
        active = ALL_SOURCES

    console.print(Panel(
        Text.from_markup(
            f"[bold green]GRANTS RADAR[/] — Earth Guardians South America\n"
            f"Sources: [cyan]{', '.join(active.keys())}[/]\n"
            f"Country filter: [yellow]{country_filter or 'ALL'}[/] | "
            f"Keywords: [magenta]{keywords or 'default socio-env set'}[/]"
        ),
        title="🌍 Starting deep search",
        border_style="green",
    ))

    connector = aiohttp.TCPConnector(limit=MAX_CONCURRENT, ssl=False)
    timeout   = aiohttp.ClientTimeout(total=120)

    all_grants = []
    async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            console=console,
        ) as progress:
            task = progress.add_task("Fetching sources...", total=len(active))

            async def run_one(name, fn):
                try:
                    result = await fn(session)
                    progress.advance(task)
                    return result or []
                except Exception as e:
                    logging.error(f"Source {name} failed: {e}")
                    progress.advance(task)
                    return []

            # Run all sources concurrently (they rate-limit internally)
            results = await asyncio.gather(*[
                run_one(name, fn) for name, fn in active.items()
            ])

    for r in results:
        all_grants.extend(r)

    console.print(f"\n[green]✓ Raw results:[/] {len(all_grants)} grants collected")

    # Deduplicate
    unique = deduplicate(all_grants)
    console.print(f"[green]✓ After dedup:[/] {len(unique)} unique grants")

    # Filter
    filtered = filter_by_country(unique, country_filter)
    filtered = filter_by_keywords(filtered, keywords)

    # Relevance threshold
    filtered = [g for g in filtered if g["relevance"] >= min_relevance]
    filtered.sort(key=lambda x: x["relevance"], reverse=True)

    console.print(f"[green]✓ After filtering:[/] {len(filtered)} relevant grants\n")

    # Save outputs
    ts = datetime.now().strftime("%Y%m%d_%H%M")
    prefix = f"{output_prefix}_{ts}" if output_prefix else f"grants_radar_{ts}"

    json_path = OUTPUT_DIR / f"{prefix}.json"
    csv_path  = OUTPUT_DIR / f"{prefix}.csv"
    md_path   = OUTPUT_DIR / f"{prefix}.md"

    save_json(filtered, json_path)
    save_csv(filtered,  csv_path)
    save_markdown(filtered, md_path,
                  title=f"Grants Radar — {country_filter or 'Worldwide'}")

    console.print(f"[bold]Outputs saved:[/]")
    console.print(f"  📄 JSON: {json_path}")
    console.print(f"  📊 CSV:  {csv_path}")
    console.print(f"  📝 MD:   {md_path}\n")

    print_summary_table(filtered)

    return filtered


# ══════════════════════════════════════════════════════════════
#  CLI
# ══════════════════════════════════════════════════════════════

@click.command()
@click.option("--country",  "-c", default=None,
              help="Country/region filter: BR, LATAM, EU, US, GLOBAL, or ALL")
@click.option("--sources",  "-s", default=None,
              help=f"Comma-separated source keys: {', '.join(ALL_SOURCES.keys())}")
@click.option("--keywords", "-k", default=None,
              help="Extra comma-separated keywords to filter results")
@click.option("--refresh",  "-r", is_flag=True,
              help="Clear cache and force re-fetch everything")
@click.option("--min-score","-m", default=5, type=int,
              help="Minimum relevance score (0–100, default 5)")
@click.option("--output",   "-o", default="grants_radar",
              help="Output file prefix (default: grants_radar)")
@click.option("--list-sources", is_flag=True,
              help="List all available sources and exit")
def main(country, sources, keywords, refresh, min_score, output, list_sources):
    """
    \b
    GRANTS RADAR — Worldwide open grants for socio-environmental art-activism.
    Earth Guardians South America / EG-Maps integration.

    Examples:
      python grants_radar.py
      python grants_radar.py --country BR
      python grants_radar.py --country LATAM --keywords "amazônia,floresta"
      python grants_radar.py --sources capta,casa,prosas --country BR
      python grants_radar.py --refresh --country GLOBAL --min-score 20
    """
    if list_sources:
        console.print("[bold]Available sources:[/]")
        for k in ALL_SOURCES:
            console.print(f"  [cyan]{k}[/]")
        return

    logging.basicConfig(
        filename=LOG_DIR / f"radar_{datetime.now().strftime('%Y%m%d')}.log",
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )

    asyncio.run(run_radar(
        sources_filter=sources,
        country_filter=country,
        keywords=keywords,
        refresh=refresh,
        min_relevance=min_score,
        output_prefix=output,
    ))


if __name__ == "__main__":
    main()
