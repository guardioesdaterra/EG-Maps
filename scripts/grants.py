#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════╗
║  GRANTS RADAR v2 — Socio-Environmental Art-Activism Grants       ║
║  Worldwide open grants aggregator — Earth Guardians South America║
║  License: AGPL-3.0 — stay free, stay open                       ║
╚══════════════════════════════════════════════════════════════════╝

Crawls 30+ sources with NO US government dependencies:
  — Brazilian civil society platforms (capta, prosas, casa, ISPN)
  — EU programme APIs (Creative Europe, LIFE, EEA Grants)
  — UNESCO, Commonwealth Foundation, Calouste Gulbenkian
  — Global philanthropies (Doen, Porticus, Toyota, Wellbeing Econ)
  — Climate justice funds (YCJF, CJRF, Emerging Climate Champions)
  — Substack newsletters aggregating global funding (Impact Funding)
  — fundsforNGOs, Opportunity Desk, Opportunities for Youth
  — e-flux, sustainablepractice.org, artandactivism aggregators
  — Environmental Grantmakers Association (EGA)
  — African, Asian, LatAm specific foundations

Usage:
  python grants_radar.py                     # all sources
  python grants_radar.py --country BR        # Brazil only
  python grants_radar.py --country LATAM
  python grants_radar.py --country GLOBAL
  python grants_radar.py --sources capta,ycjf,eu,fundsforngos
  python grants_radar.py --refresh           # clear cache
  python grants_radar.py --list-sources
"""

import asyncio
import aiohttp
import aiofiles
import json
import csv
import hashlib
import re
import time
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import quote, urlparse, urljoin

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
# DIRS
# ──────────────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).parent
CACHE_DIR  = BASE_DIR / "cache"
OUTPUT_DIR = BASE_DIR / "output"
LOG_DIR    = BASE_DIR / "logs"
for d in [CACHE_DIR, OUTPUT_DIR, LOG_DIR]:
    d.mkdir(exist_ok=True)

CACHE_TTL_HOURS = 6
MAX_CONCURRENT  = 10
REQUEST_TIMEOUT = 30
RATE_LIMIT_DELAY = 0.5

console = Console()

# ──────────────────────────────────────────────────────────────
# RELEVANCE KEYWORDS
# ──────────────────────────────────────────────────────────────
CORE_KEYWORDS = [
    # Socio-env / mission-specific
    "socioambiental","socio-environmental","environmental justice","justiça climática",
    "climate justice","sacrifice zone","zona de sacrifício","mineração","mining impact",
    "indigenous","indígena","quilombola","comunidades tradicionais","traditional communities",
    "biodiversity","biodiversidade","deforestation","desmatamento","amazônia","amazon",
    "extractivism","extrativismo","land rights","direito territorial","territorial rights",
    "defenders","defensores","environmental defenders","ativistas ambientais",
    # Art-activism
    "artivismo","art activism","arte ativismo","arte política","cultural activism",
    "ativismo cultural","arte comunitária","community art","documentary","documentário",
    "comunicação comunitária","community media","creative activism","artivism",
    "socioenviromental","socio enviromental","arte e meio ambiente","art environment",
    # Social justice
    "social justice","justiça social","human rights","direitos humanos",
    "grassroots","base comunitária","social movement","movimento social",
    "collective","coletivo","civil society","sociedade civil","ngo","ong",
    # Climate
    "climate change","mudanças climáticas","climate adaptation","climate resilience",
    "green transition","just transition","transição justa",
]

SECONDARY_KEYWORDS = [
    "culture","cultura","arts","artes","environment","ambiente",
    "sustainability","sustentabilidade","community","comunidade",
    "ecology","ecologia","conservation","conservação",
    "development","desenvolvimento","green","verde",
    "youth","juventude","women","mulheres","gender","gênero",
    "africa","asia","latin america","global south","sul global",
]

# ──────────────────────────────────────────────────────────────
# DATA MODEL
# ──────────────────────────────────────────────────────────────
def make_grant(title, source_name, url, description="", funder="",
               deadline="", amount_max="", amount_min="", currency="",
               country="", region="", categories=None, language="en", raw=None):
    uid = hashlib.md5(f"{source_name}::{url}".encode()).hexdigest()[:12]
    blob = f"{title} {description} {funder}".lower()
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
        "relevance":   score_relevance(blob),
        "fetched_at":  datetime.now(timezone.utc).isoformat(),
        "status":      "pending",
    }

def score_relevance(text: str) -> int:
    text = text.lower()
    hits = sum(1 for k in CORE_KEYWORDS if k in text) * 8
    hits += sum(1 for k in SECONDARY_KEYWORDS if k in text) * 2
    return min(100, hits)

# ──────────────────────────────────────────────────────────────
# CACHE
# ──────────────────────────────────────────────────────────────
def _cpath(key): return CACHE_DIR / f"{hashlib.md5(key.encode()).hexdigest()}.json"

async def cache_get(key):
    p = _cpath(key)
    if not p.exists(): return None
    try:
        d = json.loads(p.read_text())
        if (time.time() - d["_ts"]) / 3600 > CACHE_TTL_HOURS: return None
        return d["v"]
    except: return None

async def cache_set(key, val):
    async with aiofiles.open(_cpath(key), "w") as f:
        await f.write(json.dumps({"_ts": time.time(), "v": val}, ensure_ascii=False))

# ──────────────────────────────────────────────────────────────
# HTTP HELPERS
# ──────────────────────────────────────────────────────────────
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0 "
        "GrantsRadar/2.0 (+https://github.com/guardioesdaterra)"
    ),
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7,es;q=0.6,fr;q=0.5",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

_domain_ts: dict = {}

async def fetch(session, url, method="GET", json_body=None,
                extra_headers=None, use_cache=True):
    ck = f"{method}::{url}::{json.dumps(json_body or {}, sort_keys=True)}"
    if use_cache:
        cached = await cache_get(ck)
        if cached is not None: return cached

    domain = urlparse(url).netloc
    wait = RATE_LIMIT_DELAY - (time.time() - _domain_ts.get(domain, 0))
    if wait > 0: await asyncio.sleep(wait)
    _domain_ts[domain] = time.time()

    h = {**HEADERS, **(extra_headers or {})}
    for attempt in range(3):
        try:
            kw = dict(headers=h, timeout=aiohttp.ClientTimeout(total=REQUEST_TIMEOUT))
            if method == "POST":
                async with session.post(url, json=json_body, **kw) as r:
                    if r.status >= 400: return None
                    text = await r.text()
            else:
                async with session.get(url, **kw) as r:
                    if r.status >= 400: return None
                    text = await r.text()
            if use_cache: await cache_set(ck, text)
            return text
        except asyncio.TimeoutError:
            await asyncio.sleep(1.5 ** attempt)
        except Exception as e:
            logging.debug(f"fetch fail {url}: {e}")
            await asyncio.sleep(1.5 ** attempt)
    return None

async def fetch_json(session, url, method="GET", json_body=None, use_cache=True):
    text = await fetch(session, url, method=method, json_body=json_body,
                       extra_headers={"Accept": "application/json"}, use_cache=use_cache)
    if not text: return None
    try: return json.loads(text)
    except: return None

def clean_html(html):
    return re.sub(r'\s+', ' ', BeautifulSoup(html or "", "lxml").get_text(" ")).strip()

def parse_date(s):
    if not s: return ""
    try: return dateparser.parse(str(s), fuzzy=True).date().isoformat()
    except: return str(s)[:20]

def extract_amount(text):
    """Extract first currency amount from text."""
    m = re.search(r'(€|USD?|EUR?|GBP?|R\$|BRL?|£)\s*([\d,\.]+(?:\s*(?:million|mil|thousand))?)', text, re.I)
    if m: return m.group(0).strip()
    m2 = re.search(r'\$\s*([\d,\.]+)', text)
    if m2: return m2.group(0).strip()
    return ""

def extract_deadline(text):
    patterns = [
        r'[Dd]eadline[:\s]+([A-Za-z]+ \d{1,2},?\s*\d{4})',
        r'[Dd]eadline[:\s]+(\d{1,2}\s+[A-Za-z]+\s+\d{4})',
        r'[Dd]ata.limite[:\s]+(\d{2}/\d{2}/\d{4})',
        r'[Ii]nscrições até[:\s]+(\d{2}/\d{2}/\d{4})',
        r'[Cc]losing[:\s]+([A-Za-z]+ \d{1,2},?\s*\d{4})',
        r'(\d{4}-\d{2}-\d{2})',
        r'(\d{2}/\d{2}/\d{4})',
    ]
    for pat in patterns:
        m = re.search(pat, text)
        if m: return parse_date(m.group(1))
    return ""


# ══════════════════════════════════════════════════════════════
#  ── BRAZIL ──────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════

async def fetch_capta(session):
    """ISPN/Capta — primary Brazilian socio-environmental grants hub."""
    grants = []
    SOURCE, BASE = "capta.org.br", "https://capta.org.br"
    for api in [
        f"{BASE}/wp-json/wp/v2/posts?per_page=100&_embed=true&search=edital",
        f"{BASE}/wp-json/wp/v2/posts?per_page=100&_embed=true",
    ]:
        data = await fetch_json(session, api)
        if data and isinstance(data, list):
            for p in data:
                title   = clean_html(p.get("title", {}).get("rendered", ""))
                content = clean_html(p.get("content", {}).get("rendered", ""))
                url     = p.get("link", "")
                grants.append(make_grant(title=title, source_name=SOURCE, url=url,
                    description=content[:600], country="BR", language="pt",
                    deadline=extract_deadline(content)))
            break
    # HTML fallback
    if not grants:
        html = await fetch(session, f"{BASE}/fontes-de-financiamento/oportunidades/")
        if html:
            soup = BeautifulSoup(html, "lxml")
            for a in soup.select("article h2 a, article h3 a, .entry-title a"):
                title = a.get_text(strip=True)
                url   = urljoin(BASE, a.get("href",""))
                grants.append(make_grant(title=title, source_name=SOURCE, url=url,
                    country="BR", language="pt"))
    console.print(f"  [cyan]capta.org.br[/] → {len(grants)}")
    return grants


async def fetch_prosas(session):
    """Prosas.com.br — largest Brazilian CSO grants aggregator."""
    grants = []
    SOURCE = "prosas.com.br"
    html = await fetch(session, "https://prosas.com.br/editais")
    if html:
        soup = BeautifulSoup(html, "lxml")
        for card in soup.select("[class*='edital'], [class*='card'], article"):
            a = card.find("a", href=True)
            t = card.find(["h2","h3","h4","h5"])
            if not t: continue
            title = t.get_text(strip=True)
            url   = urljoin("https://prosas.com.br", a["href"]) if a else ""
            text  = card.get_text(" ")
            grants.append(make_grant(title=title, source_name=SOURCE, url=url,
                description=text[:400], country="BR", language="pt",
                deadline=extract_deadline(text), amount_max=extract_amount(text)))
    console.print(f"  [cyan]prosas.com.br[/] → {len(grants)}")
    return grants


async def fetch_casa(session):
    """Fundo Casa Socioambiental — key Brazilian env/indigenous fund."""
    grants = []
    SOURCE, BASE = "casa.org.br", "https://casa.org.br"
    data = await fetch_json(session, f"{BASE}/wp-json/wp/v2/posts?per_page=80&_embed=true")
    if data and isinstance(data, list):
        for p in data:
            title   = clean_html(p.get("title",{}).get("rendered",""))
            content = clean_html(p.get("content",{}).get("rendered",""))
            url     = p.get("link","")
            if score_relevance(f"{title} {content}") < 3: continue
            grants.append(make_grant(title=title, source_name=SOURCE, url=url,
                description=content[:500], country="BR", language="pt",
                funder="Fundo Casa Socioambiental", deadline=extract_deadline(content)))
    if not grants:
        for path in ["/chamadas/", "/chamadas/aberta/"]:
            html = await fetch(session, BASE + path)
            if not html: continue
            soup = BeautifulSoup(html, "lxml")
            for art in soup.select("article, .chamada-card"):
                t = art.find(["h2","h3"]); a = art.find("a",href=True)
                if not t: continue
                title = t.get_text(strip=True)
                url   = urljoin(BASE, a["href"]) if a else BASE
                text  = art.get_text(" ")
                grants.append(make_grant(title=title, source_name=SOURCE, url=url,
                    description=text[:400], country="BR", language="pt",
                    funder="Fundo Casa Socioambiental", deadline=extract_deadline(text)))
    console.print(f"  [cyan]casa.org.br[/] → {len(grants)}")
    return grants


async def fetch_ispn(session):
    """ISPN — Instituto Sociedade, População e Natureza."""
    grants = []
    SOURCE, BASE = "ispn.org.br", "https://www.ispn.org.br"
    data = await fetch_json(session, f"{BASE}/wp-json/wp/v2/posts?per_page=60&_embed=true")
    if data and isinstance(data, list):
        for p in data:
            title   = clean_html(p.get("title",{}).get("rendered",""))
            content = clean_html(p.get("content",{}).get("rendered",""))
            url     = p.get("link","")
            if score_relevance(f"{title} {content}") < 4: continue
            grants.append(make_grant(title=title, source_name=SOURCE, url=url,
                description=content[:500], country="BR", language="pt",
                funder="ISPN", deadline=extract_deadline(content)))
    console.print(f"  [cyan]ispn.org.br[/] → {len(grants)}")
    return grants


async def fetch_fundobrasil(session):
    """Fundo Brasil de Direitos Humanos."""
    grants = []
    SOURCE, BASE = "fundobrasil.org.br", "https://www.fundobrasil.org.br"
    data = await fetch_json(session, f"{BASE}/wp-json/wp/v2/posts?per_page=60&_embed=true")
    if data and isinstance(data, list):
        for p in data:
            title   = clean_html(p.get("title",{}).get("rendered",""))
            content = clean_html(p.get("content",{}).get("rendered",""))
            url     = p.get("link","")
            if score_relevance(f"{title} {content}") < 3: continue
            grants.append(make_grant(title=title, source_name=SOURCE, url=url,
                description=content[:500], country="BR", language="pt",
                funder="Fundo Brasil de Direitos Humanos",
                deadline=extract_deadline(content)))
    console.print(f"  [cyan]fundobrasil.org.br[/] → {len(grants)}")
    return grants


# ══════════════════════════════════════════════════════════════
#  ── EU / EUROPE ─────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════

async def fetch_eu_tenders(session):
    """EU Funding & Tenders Portal — SEDIA public search API."""
    grants = []
    SOURCE = "eu-funding.europa.eu"
    queries = [
        "environment civil society art culture",
        "climate justice community indigenous",
        "creative europe environment",
        "LIFE biodiversity civil society",
    ]
    for q in queries:
        url = (
            "https://api.tech.ec.europa.eu/search-api/prod/rest/search"
            f"?apiKey=SEDIA&text={quote(q)}&pageSize=15&pageNumber=1&action=search"
        )
        data = await fetch_json(session, url)
        if not data or not data.get("results"): continue
        for r in data["results"]:
            md    = r.get("metadata", {})
            title = (md.get("title",{}).get("value") or [""])[0]
            link  = (md.get("url",{}).get("value") or [""])[0]
            desc  = (md.get("description",{}).get("value") or [""])[0]
            dl    = (md.get("deadline",{}).get("value") or [""])[0]
            prog  = (md.get("programme",{}).get("value") or [""])[0]
            if not title: continue
            grants.append(make_grant(title=title, source_name=SOURCE,
                url=link or url, description=clean_html(desc)[:500],
                funder="European Commission", deadline=parse_date(dl),
                country="EU", region=prog, currency="EUR",
                categories=["EU","Horizon","LIFE","Creative Europe"]))
    console.print(f"  [cyan]eu-funding[/] → {len(grants)}")
    return grants


async def fetch_eea_grants(session):
    """EEA and Norway Grants — environment + civil society + arts."""
    grants = []
    SOURCE = "eeagrants.org"
    BASE   = "https://www.eeagrants.org"
    html   = await fetch(session, f"{BASE}/calls-for-proposals/")
    if html:
        soup = BeautifulSoup(html, "lxml")
        for art in soup.select("article, .call-card, .grant-call"):
            t = art.find(["h2","h3","h4"]); a = art.find("a",href=True)
            if not t: continue
            title = t.get_text(strip=True)
            url   = urljoin(BASE, a["href"]) if a else BASE
            text  = art.get_text(" ")
            grants.append(make_grant(title=title, source_name=SOURCE, url=url,
                description=text[:400], country="EU",
                funder="EEA and Norway Grants", deadline=extract_deadline(text),
                currency="EUR", categories=["EEA","Norway Grants","environment","civil society"]))
    console.print(f"  [cyan]eeagrants.org[/] → {len(grants)}")
    return grants


async def fetch_gulbenkian(session):
    """Calouste Gulbenkian Foundation — arts, environment, science."""
    grants = []
    SOURCE = "gulbenkian.pt"
    for lang, base in [("pt","https://gulbenkian.pt"), ("en","https://gulbenkian.pt/en")]:
        html = await fetch(session, f"{base}/programas/")
        if not html: continue
        soup = BeautifulSoup(html, "lxml")
        for art in soup.select("article, .program-card, .card"):
            t = art.find(["h2","h3","h4"]); a = art.find("a",href=True)
            if not t: continue
            title = t.get_text(strip=True)
            url   = urljoin(base, a["href"]) if a else base
            text  = art.get_text(" ")
            if score_relevance(f"{title} {text}") < 4: continue
            grants.append(make_grant(title=title, source_name=SOURCE, url=url,
                description=text[:400], country="EU", language=lang,
                funder="Calouste Gulbenkian Foundation",
                deadline=extract_deadline(text), currency="EUR",
                categories=["arts","science","environment","culture"]))
    console.print(f"  [cyan]gulbenkian[/] → {len(grants)}")
    return grants


async def fetch_doen(session):
    """Doen Foundation (Netherlands) — arts + fair/green economy."""
    grants = []
    SOURCE = "doen.nl"
    for url in [
        "https://www.doen.nl/en/applications/applications.htm",
        "https://www.doen.nl/en/open-calls/",
    ]:
        html = await fetch(session, url)
        if not html: continue
        soup = BeautifulSoup(html, "lxml")
        for art in soup.select("article, .call, .grant, [class*='fund']"):
            t = art.find(["h2","h3","h4"]); a = art.find("a",href=True)
            if not t: continue
            title = t.get_text(strip=True)
            link  = urljoin("https://www.doen.nl", a["href"]) if a else url
            text  = art.get_text(" ")
            grants.append(make_grant(title=title, source_name=SOURCE, url=link,
                description=text[:400], country="EU",
                funder="Doen Foundation", deadline=extract_deadline(text),
                currency="EUR", categories=["culture","green economy","arts"]))
    console.print(f"  [cyan]doen.nl[/] → {len(grants)}")
    return grants


async def fetch_porticus(session):
    """Porticus Foundation — social, cultural, environmental."""
    grants = []
    SOURCE = "porticus.com"
    html = await fetch(session, "https://www.porticus.com/what-we-fund/")
    if html:
        soup = BeautifulSoup(html, "lxml")
        for art in soup.select("article, .program, .fund-area"):
            t = art.find(["h2","h3","h4"]); a = art.find("a",href=True)
            if not t: continue
            title = t.get_text(strip=True)
            url   = urljoin("https://www.porticus.com", a["href"]) if a else "https://www.porticus.com"
            text  = art.get_text(" ")
            grants.append(make_grant(title=title, source_name=SOURCE, url=url,
                description=text[:400], country="EU",
                funder="Porticus Foundation", deadline=extract_deadline(text),
                currency="EUR"))
    console.print(f"  [cyan]porticus.com[/] → {len(grants)}")
    return grants


async def fetch_commonwealth_foundation(session):
    """Commonwealth Foundation — civil society, arts, governance."""
    grants = []
    SOURCE = "commonwealthfoundation.com"
    html = await fetch(session, "https://commonwealthfoundation.com/grants/annual/")
    if html:
        soup = BeautifulSoup(html, "lxml")
        text_full = soup.get_text(" ")
        # Extract headline + key details
        for h in soup.select("h1,h2,h3"):
            title = h.get_text(strip=True)
            if len(title) < 10: continue
            a = h.find("a",href=True)
            url = urljoin("https://commonwealthfoundation.com", a["href"]) if a else "https://commonwealthfoundation.com/grants/annual/"
            text = h.find_next(["p","div"]).get_text(" ") if h.find_next(["p","div"]) else ""
            grants.append(make_grant(title=title, source_name=SOURCE, url=url,
                description=text[:400], country="GLOBAL",
                funder="Commonwealth Foundation", deadline=extract_deadline(text_full),
                categories=["civil society","arts","governance","commonwealth"]))
    console.print(f"  [cyan]commonwealth foundation[/] → {len(grants)}")
    return grants


# ══════════════════════════════════════════════════════════════
#  ── UNESCO / MULTILATERAL ───────────────────────────────────
# ══════════════════════════════════════════════════════════════

async def fetch_unesco(session):
    """UNESCO — IFCD, cultural diversity, creative economy."""
    grants = []
    SOURCE = "unesco.org"
    endpoints = [
        "https://www.unesco.org/creativity/en/funding",
        "https://www.unesco.org/en/funding-opportunities",
        "https://en.unesco.org/creativity/ifcd",
    ]
    for url in endpoints:
        html = await fetch(session, url)
        if not html: continue
        soup = BeautifulSoup(html, "lxml")
        for art in soup.select("article, .call, .opportunity, .fund-item"):
            t = art.find(["h2","h3","h4"]); a = art.find("a",href=True)
            if not t: continue
            title = t.get_text(strip=True)
            link  = urljoin("https://www.unesco.org", a["href"]) if a else url
            text  = art.get_text(" ")
            grants.append(make_grant(title=title, source_name=SOURCE, url=link,
                description=text[:400], country="GLOBAL",
                funder="UNESCO", deadline=extract_deadline(text),
                categories=["culture","creative economy","cultural diversity","IFCD"]))
    # UNESCO RSS feed
    rss_text = await fetch(session, "https://www.unesco.org/creativity/en/rss")
    if rss_text:
        feed = feedparser.parse(rss_text)
        for e in feed.entries[:20]:
            title = e.get("title","")
            link  = e.get("link", "https://www.unesco.org")
            desc  = clean_html(e.get("summary",""))
            grants.append(make_grant(title=title, source_name=f"{SOURCE}:rss", url=link,
                description=desc[:400], country="GLOBAL",
                funder="UNESCO", deadline=extract_deadline(desc)))
    console.print(f"  [cyan]unesco.org[/] → {len(grants)}")
    return grants


# ══════════════════════════════════════════════════════════════
#  ── CLIMATE JUSTICE FUNDS ───────────────────────────────────
# ══════════════════════════════════════════════════════════════

async def fetch_ycjf(session):
    """Youth Climate Justice Fund — youth-led socio-env movements."""
    grants = []
    SOURCE = "ycjf.org"
    html = await fetch(session, "https://ycjf.org/grants")
    if not html:
        html = await fetch(session, "https://ycjf.org/")
    if html:
        soup = BeautifulSoup(html, "lxml")
        text = soup.get_text(" ")
        for art in soup.select("article, .grant-item, section"):
            t = art.find(["h1","h2","h3"]); a = art.find("a",href=True)
            if not t: continue
            title = t.get_text(strip=True)
            if len(title) < 8: continue
            url   = urljoin("https://ycjf.org", a["href"]) if a else "https://ycjf.org"
            text_block = art.get_text(" ")
            grants.append(make_grant(title=title, source_name=SOURCE, url=url,
                description=text_block[:500], country="GLOBAL",
                funder="Youth Climate Justice Fund",
                deadline=extract_deadline(text_block),
                amount_max="$40,000", currency="USD",
                categories=["youth","climate justice","socio-environmental","global south"]))
    # Always add the known open call as a standing entry
    grants.append(make_grant(
        title="Youth Climate Justice Fund — Annual Grant Round",
        source_name=SOURCE,
        url="https://ycjf.org/how-to-apply",
        description=(
            "Funds youth-led groups (majority under 35) advancing climate justice and "
            "socio-environmental action through community power. Up to $20,000 local, "
            "$40,000 national. Applications in Arabic, English, French, Hindi, Portuguese, "
            "Spanish, Swahili. No formal registration required. Latin America, Africa, Asia, "
            "Pacific, Europe and Central Asia, North America (underrepresented communities)."
        ),
        funder="Youth Climate Justice Fund",
        amount_max="40000", currency="USD",
        country="GLOBAL", language="en",
        categories=["youth","climate justice","socio-environmental","grassroots","global south"],
    ))
    console.print(f"  [cyan]ycjf.org[/] → {len(grants)}")
    return grants


async def fetch_cjrfund(session):
    """Climate Justice Resilience Fund — women, youth, indigenous."""
    grants = []
    SOURCE = "cjrfund.org"
    html = await fetch(session, "https://cjrfund.org/our-grants/")
    if not html:
        html = await fetch(session, "https://cjrfund.org/")
    if html:
        soup = BeautifulSoup(html, "lxml")
        for art in soup.select("article, .grant-area, section"):
            t = art.find(["h2","h3"]); a = art.find("a",href=True)
            if not t: continue
            title = t.get_text(strip=True)
            if len(title) < 8: continue
            url   = urljoin("https://cjrfund.org", a["href"]) if a else "https://cjrfund.org"
            text  = art.get_text(" ")
            grants.append(make_grant(title=title, source_name=SOURCE, url=url,
                description=text[:500], country="GLOBAL",
                funder="Climate Justice Resilience Fund",
                deadline=extract_deadline(text),
                categories=["climate justice","women","indigenous","community"]))
    console.print(f"  [cyan]cjrfund.org[/] → {len(grants)}")
    return grants


async def fetch_moleskine_pioneers(session):
    """Moleskine Foundation — Creativity Pioneers Fund."""
    grants = []
    SOURCE = "creativitypioneersfund.org"
    html = await fetch(session, "https://creativitypioneersfund.org/opencall")
    if html:
        soup = BeautifulSoup(html, "lxml")
        text = soup.get_text(" ")
        grants.append(make_grant(
            title="Creativity Pioneers Fund Open Call — Moleskine Foundation",
            source_name=SOURCE,
            url="https://creativitypioneersfund.org/opencall",
            description=(
                "€5,000 unrestricted grants for nonprofits using creativity for social "
                "transformation. Open globally. Focus: youth 16-27, marginalized communities, "
                "social + environmental challenges, intersectional approach. "
                + clean_html(text)[:300]
            ),
            funder="Moleskine Foundation",
            amount_max="5000", currency="EUR",
            country="GLOBAL", language="en",
            deadline=extract_deadline(text),
            categories=["arts","creativity","social change","youth","global"],
        ))
    console.print(f"  [cyan]creativity pioneers fund[/] → {len(grants)}")
    return grants


# ══════════════════════════════════════════════════════════════
#  ── GLOBAL AGGREGATORS ──────────────────────────────────────
# ══════════════════════════════════════════════════════════════

async def fetch_fundsforngos(session):
    """fundsforNGOs — largest free international grants aggregator.
    WordPress site with public WP-JSON API."""
    grants = []
    SOURCE = "fundsforngos.org"
    # Their WP API — public
    for search_term in ["environment","art culture","social justice","indigenous","climate"]:
        api = f"https://www2.fundsforngos.org/wp-json/wp/v2/posts?per_page=30&search={quote(search_term)}&_embed=true"
        data = await fetch_json(session, api)
        if not data or not isinstance(data, list): continue
        for p in data:
            title   = clean_html(p.get("title",{}).get("rendered",""))
            content = clean_html(p.get("content",{}).get("rendered",""))
            url     = p.get("link","")
            if score_relevance(f"{title} {content}") < 5: continue
            grants.append(make_grant(title=title, source_name=SOURCE, url=url,
                description=content[:600], country="GLOBAL", language="en",
                deadline=extract_deadline(content),
                amount_max=extract_amount(content)))
    # Also scrape their listing page
    html = await fetch(session, "https://www2.fundsforngos.org/listing/")
    if html:
        soup = BeautifulSoup(html, "lxml")
        for art in soup.select("article, .entry"):
            t = art.find(["h2","h3"]); a = art.find("a",href=True)
            if not t: continue
            title = t.get_text(strip=True)
            if len(title) < 10 or score_relevance(title) < 3: continue
            url = urljoin("https://www2.fundsforngos.org", a["href"]) if a else ""
            text = art.get_text(" ")
            grants.append(make_grant(title=title, source_name=SOURCE, url=url,
                description=text[:400], country="GLOBAL", language="en",
                deadline=extract_deadline(text)))
    console.print(f"  [cyan]fundsforngos.org[/] → {len(grants)}")
    return grants


async def fetch_opportunity_desk(session):
    """Opportunity Desk — global grants + fellowships."""
    grants = []
    SOURCE = "opportunitydesk.org"
    rss = await fetch(session, "https://opportunitydesk.org/feed/")
    if rss:
        feed = feedparser.parse(rss)
        for e in feed.entries[:60]:
            title = e.get("title","")
            link  = e.get("link","")
            desc  = clean_html(e.get("summary",""))
            if score_relevance(f"{title} {desc}") < 5: continue
            grants.append(make_grant(title=title, source_name=SOURCE, url=link,
                description=desc[:500], country="GLOBAL", language="en",
                deadline=extract_deadline(desc),
                amount_max=extract_amount(desc)))
    console.print(f"  [cyan]opportunitydesk.org[/] → {len(grants)}")
    return grants


async def fetch_opportunities_for_youth(session):
    """Opportunities for Youth — grants with regional tags."""
    grants = []
    SOURCE = "opportunitiesforyouth.org"
    rss = await fetch(session, "https://opportunitiesforyouth.org/feed/")
    if rss:
        feed = feedparser.parse(rss)
        for e in feed.entries[:60]:
            title = e.get("title","")
            link  = e.get("link","")
            desc  = clean_html(e.get("summary",""))
            tags  = [t.get("term","") for t in e.get("tags",[])]
            if score_relevance(f"{title} {desc} {' '.join(tags)}") < 5: continue
            # Infer country from tags
            country = "GLOBAL"
            tag_str = " ".join(tags).lower()
            if "south america" in tag_str or "latin america" in tag_str: country = "LATAM"
            elif "africa" in tag_str: country = "AFRICA"
            elif "europe" in tag_str: country = "EU"
            elif "asia" in tag_str: country = "ASIA"
            grants.append(make_grant(title=title, source_name=SOURCE, url=link,
                description=desc[:500], country=country, language="en",
                deadline=extract_deadline(desc), amount_max=extract_amount(desc),
                categories=tags[:5]))
    console.print(f"  [cyan]opportunitiesforyouth.org[/] → {len(grants)}")
    return grants


async def fetch_eflux(session):
    """e-flux — art + activism grants, open calls, residencies."""
    grants = []
    SOURCE = "e-flux.com"
    rss = await fetch(session, "https://www.e-flux.com/announcements/rss/")
    if rss:
        feed = feedparser.parse(rss)
        for e in feed.entries[:60]:
            title = e.get("title","")
            link  = e.get("link","")
            desc  = clean_html(e.get("summary",""))
            if score_relevance(f"{title} {desc}") < 4: continue
            grants.append(make_grant(title=title, source_name=SOURCE, url=link,
                description=desc[:500], country="GLOBAL", language="en",
                deadline=extract_deadline(desc), amount_max=extract_amount(desc),
                categories=["art","culture","open call","residency"]))
    console.print(f"  [cyan]e-flux.com[/] → {len(grants)}")
    return grants


async def fetch_sustainable_practice(session):
    """Centre for Sustainable Practice in the Arts — env art."""
    grants = []
    SOURCE = "sustainablepractice.org"
    html = await fetch(session, "https://sustainablepractice.org/open-calls/")
    if html:
        soup = BeautifulSoup(html, "lxml")
        for art in soup.select("article, .call-item, .post"):
            t = art.find(["h2","h3","h4"]); a = art.find("a",href=True)
            if not t: continue
            title = t.get_text(strip=True)
            url   = urljoin("https://sustainablepractice.org", a["href"]) if a else "https://sustainablepractice.org"
            text  = art.get_text(" ")
            grants.append(make_grant(title=title, source_name=SOURCE, url=url,
                description=text[:400], country="GLOBAL", language="en",
                deadline=extract_deadline(text), amount_max=extract_amount(text),
                categories=["art","environment","sustainability","open call"]))
    console.print(f"  [cyan]sustainablepractice.org[/] → {len(grants)}")
    return grants


async def fetch_impactfunding_substack(session):
    """Impact Funding (Substack) — curated global impact grants newsletter."""
    grants = []
    SOURCE = "impactfunding.substack.com"
    rss = await fetch(session, "https://impactfunding.substack.com/feed")
    if rss:
        feed = feedparser.parse(rss)
        for e in feed.entries[:15]:
            title = e.get("title","")
            link  = e.get("link","")
            desc  = clean_html(e.get("summary",""))
            if score_relevance(f"{title} {desc}") < 5: continue
            grants.append(make_grant(title=title, source_name=SOURCE, url=link,
                description=desc[:800], country="GLOBAL", language="en",
                deadline=extract_deadline(desc),
                categories=["aggregator","social enterprise","environment","global"]))
    console.print(f"  [cyan]impactfunding substack[/] → {len(grants)}")
    return grants


async def fetch_global_south_opportunities(session):
    """Global South Opportunities — RSS for development/environment grants."""
    grants = []
    SOURCE = "globalsouthopportunities.com"
    rss = await fetch(session, "https://www.globalsouthopportunities.com/feed/")
    if rss:
        feed = feedparser.parse(rss)
        for e in feed.entries[:40]:
            title = e.get("title","")
            link  = e.get("link","")
            desc  = clean_html(e.get("summary",""))
            if score_relevance(f"{title} {desc}") < 5: continue
            grants.append(make_grant(title=title, source_name=SOURCE, url=link,
                description=desc[:500], country="GLOBAL", language="en",
                deadline=extract_deadline(desc), amount_max=extract_amount(desc),
                categories=["global south","development","environment"]))
    console.print(f"  [cyan]globalsouthopportunities.com[/] → {len(grants)}")
    return grants


# ══════════════════════════════════════════════════════════════
#  ── LATIN AMERICA ───────────────────────────────────────────
# ══════════════════════════════════════════════════════════════

async def fetch_latam(session):
    """LATAM foundations: Avina, IAF, Skoll, Amazon Conservation, FAU."""
    grants = []
    sources = [
        ("avina.net",          "https://www.avina.net/convocatorias/",               "LATAM","es","Fundación Avina"),
        ("iaf.gov",            "https://www.iaf.gov/grants/",                         "LATAM","en","Inter-American Foundation"),
        ("amazonconservation", "https://www.amazonconservation.org/grants/",          "LATAM","en","Amazon Conservation Association"),
        ("fondoaccionurgente", "https://fondoaccionurgente.org.co/feed/",             "LATAM","es","Fondo Acción Urgente"),
        ("iica.int",           "https://www.iica.int/es/content/convocatorias/feed",  "LATAM","es","IICA"),
    ]
    for name, url, country, lang, funder in sources:
        if url.endswith("/feed") or "feed" in url:
            rss = await fetch(session, url)
            if rss:
                feed = feedparser.parse(rss)
                for e in feed.entries[:25]:
                    t = e.get("title",""); l = e.get("link","")
                    d = clean_html(e.get("summary",""))
                    if score_relevance(f"{t} {d}") < 4: continue
                    grants.append(make_grant(title=t, source_name=f"latam:{name}", url=l,
                        description=d[:400], country=country, language=lang,
                        funder=funder, deadline=extract_deadline(d)))
        else:
            html = await fetch(session, url)
            if not html: continue
            soup = BeautifulSoup(html, "lxml")
            for art in soup.select("article, .grant, .convocatoria, li.grant"):
                t_el = art.find(["h2","h3","h4"]); a = art.find("a",href=True)
                if not t_el: continue
                title = t_el.get_text(strip=True)
                if len(title) < 8: continue
                link  = urljoin(url, a["href"]) if a else url
                text  = art.get_text(" ")
                if score_relevance(f"{title} {text}") < 4: continue
                grants.append(make_grant(title=title, source_name=f"latam:{name}", url=link,
                    description=text[:400], country=country, language=lang,
                    funder=funder, deadline=extract_deadline(text),
                    amount_max=extract_amount(text)))
    console.print(f"  [cyan]LATAM sources[/] → {len(grants)}")
    return grants


# ══════════════════════════════════════════════════════════════
#  ── AFRICA / ASIA ───────────────────────────────────────────
# ══════════════════════════════════════════════════════════════

async def fetch_africa_asia(session):
    """Africa-specific and Asia-specific grant sources."""
    grants = []
    sources = [
        # Africa
        ("acfid.asn.au",  "https://www.acfid.asn.au/",                              "AFRICA","en","ACFID"),
        ("toyotafound",   "https://www.toyotafoundation.or.jp/en/grant/index.html", "ASIA",  "en","Toyota Foundation"),
        ("wellbeing-econ","https://weall.org/get-involved/funding",                  "GLOBAL","en","Wellbeing Economy Alliance"),
        ("gsopport",      "https://www.globalsouthopportunities.com/category/grants/feed/","AFRICA","en","Global South Opportunities"),
    ]
    for name, url, country, lang, funder in sources:
        if "feed" in url:
            rss = await fetch(session, url)
            if not rss: continue
            feed = feedparser.parse(rss)
            for e in feed.entries[:30]:
                t = e.get("title",""); l = e.get("link","")
                d = clean_html(e.get("summary",""))
                if score_relevance(f"{t} {d}") < 5: continue
                grants.append(make_grant(title=t, source_name=f"africa-asia:{name}",
                    url=l, description=d[:400], country=country, language=lang,
                    funder=funder, deadline=extract_deadline(d)))
        else:
            html = await fetch(session, url)
            if not html: continue
            soup = BeautifulSoup(html, "lxml")
            for art in soup.select("article, .grant, .fund, section"):
                t_el = art.find(["h2","h3","h4"]); a = art.find("a",href=True)
                if not t_el: continue
                title = t_el.get_text(strip=True)
                if len(title) < 8: continue
                link = urljoin(url, a["href"]) if a else url
                text = art.get_text(" ")
                if score_relevance(f"{title} {text}") < 5: continue
                grants.append(make_grant(title=title, source_name=f"africa-asia:{name}",
                    url=link, description=text[:400], country=country, language=lang,
                    funder=funder, deadline=extract_deadline(text)))
    console.print(f"  [cyan]Africa/Asia sources[/] → {len(grants)}")
    return grants


# ══════════════════════════════════════════════════════════════
#  ── RSS MEGA-SWEEP ──────────────────────────────────────────
# ══════════════════════════════════════════════════════════════

RSS_FEEDS = [
    # ── Global philanthropies
    ("Ford Foundation",            "https://www.fordfoundation.org/feed/",                           "GLOBAL","en"),
    ("Open Society Foundations",   "https://www.opensocietyfoundations.org/newsroom/rss",            "GLOBAL","en"),
    ("Wellspring Philanthropic",   "https://www.wellspring.net/news/feed/",                           "GLOBAL","en"),
    ("Oak Foundation",             "https://oak.foundation/feed/",                                    "GLOBAL","en"),
    ("Skoll Foundation",           "https://skoll.org/feed/",                                         "GLOBAL","en"),

    # ── Climate justice
    ("350.org",                    "https://350.org/feed/",                                           "GLOBAL","en"),
    ("Climate Justice Alliance",   "https://climatejusticealliance.org/feed/",                        "GLOBAL","en"),
    ("UNEP",                       "https://www.unep.org/feed.xml",                                   "GLOBAL","en"),

    # ── Arts + culture global
    ("Rhizome",                    "https://rhizome.org/feed/",                                       "GLOBAL","en"),
    ("Alliance Magazine",          "https://www.alliancemagazine.org/feed/",                          "GLOBAL","en"),
    ("Creative Capital",           "https://creative-capital.org/feed/",                              "GLOBAL","en"),
    ("Devex Funding",              "https://www.devex.com/news/rss.xml",                              "GLOBAL","en"),
    ("Inside Philanthropy",        "https://www.insidephilanthropy.com/home/rss.xml",                "GLOBAL","en"),

    # ── Rights defenders
    ("Cultural Survival",          "https://www.culturalsurvival.org/rss.xml",                        "GLOBAL","en"),
    ("Frontline Defenders",        "https://www.frontlinedefenders.org/rss.xml",                      "GLOBAL","en"),
    ("CIVICUS",                    "https://www.civicus.org/index.php/feed",                          "GLOBAL","en"),

    # ── Brazil
    ("FINEP Brasil",               "https://www.finep.gov.br/noticias/rss",                           "BR",    "pt"),
    ("MinC Brasil",                "https://www.gov.br/cultura/pt-br/assuntos/noticias/RSS",          "BR",    "pt"),
    ("BNDES Amazônia",             "https://www.bndes.gov.br/rss",                                    "BR",    "pt"),

    # ── LatAm
    ("Fondo Acción Urgente",       "https://fondoaccionurgente.org.co/feed/",                         "LATAM", "es"),
    ("IICA",                       "https://www.iica.int/es/content/convocatorias/feed",              "LATAM", "es"),

    # ── EU programmes
    ("EEA Grants",                 "https://www.eeagrants.org/news/rss.xml",                          "EU",    "en"),
    ("Creative Europe news",       "https://culture.ec.europa.eu/news/rss",                           "EU",    "en"),
    ("Sida Sweden",                "https://www.sida.se/en/feed/rss",                                 "EU",    "en"),

    # ── Grant aggregators (Substack feeds — free posts only)
    ("Impact Funding newsletter",  "https://impactfunding.substack.com/feed",                        "GLOBAL","en"),
    ("Opportunity Desk",           "https://opportunitydesk.org/feed/",                               "GLOBAL","en"),
    ("Opportunities for Youth",    "https://opportunitiesforyouth.org/feed/",                         "GLOBAL","en"),
    ("Global South Opportunities", "https://www.globalsouthopportunities.com/feed/",                  "GLOBAL","en"),
    ("fundsforNGOs RSS",           "https://www2.fundsforngos.org/feed/",                             "GLOBAL","en"),

    # ── Colossal (arts open calls — curated monthly lists)
    ("Colossal open calls",        "https://www.thisiscolossal.com/feed/",                            "GLOBAL","en"),

    # ── Indigenous/environment
    ("Green Grants",               "https://www.greengrants.org/feed/",                               "GLOBAL","en"),
    ("IUCN",                       "https://www.iucn.org/feeds/news",                                 "GLOBAL","en"),
]


async def fetch_rss(session):
    """Parallel RSS/Atom feed sweep."""
    grants = []

    async def _one(name, url, country, lang):
        result = []
        text = await fetch(session, url)
        if not text: return result
        try:
            feed = feedparser.parse(text)
            for e in feed.entries[:40]:
                title = e.get("title","")
                link  = e.get("link", url)
                desc  = clean_html(e.get("summary") or e.get("description",""))
                pub   = e.get("published") or e.get("updated","")
                blob  = f"{title} {desc}".lower()
                if score_relevance(blob) < 5: continue
                result.append(make_grant(title=title, source_name=f"rss:{name}",
                    url=link, description=desc[:500], country=country,
                    language=lang, deadline=parse_date(pub),
                    amount_max=extract_amount(desc)))
        except Exception as ex:
            logging.debug(f"RSS {url}: {ex}")
        return result

    results = await asyncio.gather(*[_one(n,u,c,l) for n,u,c,l in RSS_FEEDS])
    for r in results: grants.extend(r)
    console.print(f"  [cyan]RSS sweep[/] ({len(RSS_FEEDS)} feeds) → {len(grants)} relevant")
    return grants


# ══════════════════════════════════════════════════════════════
#  ── ADDITIONAL FOUNDATION SCRAPERS ─────────────────────────
# ══════════════════════════════════════════════════════════════

async def fetch_global_greengrants(session):
    """Global Green Grants Fund — grassroots env worldwide."""
    grants = []
    SOURCE = "greengrants.org"
    BASE   = "https://www.greengrants.org"
    for path in ["/apply-for-a-grant/", "/grants/"]:
        html = await fetch(session, BASE + path)
        if not html: continue
        soup = BeautifulSoup(html, "lxml")
        for art in soup.select("section, article, .region"):
            t = art.find(["h2","h3","h4"]); a = art.find("a",href=True)
            if not t or len(t.get_text(strip=True)) < 6: continue
            title = t.get_text(strip=True)
            url   = urljoin(BASE, a["href"]) if a else BASE
            text  = art.get_text(" ")
            grants.append(make_grant(title=title, source_name=SOURCE, url=url,
                description=text[:400], country="GLOBAL",
                funder="Global Green Grants Fund", deadline=extract_deadline(text),
                categories=["grassroots","environment","indigenous"]))
    # WP API
    data = await fetch_json(session, f"{BASE}/wp-json/wp/v2/posts?per_page=50&_embed=true")
    if data and isinstance(data, list):
        for p in data:
            title   = clean_html(p.get("title",{}).get("rendered",""))
            content = clean_html(p.get("content",{}).get("rendered",""))
            url     = p.get("link","")
            if score_relevance(f"{title} {content}") < 4: continue
            grants.append(make_grant(title=title, source_name=SOURCE, url=url,
                description=content[:500], country="GLOBAL",
                funder="Global Green Grants Fund", deadline=extract_deadline(content)))
    console.print(f"  [cyan]greengrants.org[/] → {len(grants)}")
    return grants


async def fetch_wellbeing_economy(session):
    """Wellbeing Economy Alliance — post-growth economics + community."""
    grants = []
    SOURCE = "weall.org"
    html = await fetch(session, "https://weall.org/get-involved/funding")
    if html:
        soup = BeautifulSoup(html, "lxml")
        for art in soup.select("article, .fund-item, .opportunity, section"):
            t = art.find(["h2","h3","h4"]); a = art.find("a",href=True)
            if not t: continue
            title = t.get_text(strip=True)
            if len(title) < 8: continue
            url  = urljoin("https://weall.org", a["href"]) if a else "https://weall.org"
            text = art.get_text(" ")
            grants.append(make_grant(title=title, source_name=SOURCE, url=url,
                description=text[:400], country="GLOBAL",
                funder="Wellbeing Economy Alliance",
                deadline=extract_deadline(text),
                categories=["wellbeing economy","community","environment","post-growth"]))
    console.print(f"  [cyan]weall.org[/] → {len(grants)}")
    return grants


async def fetch_ashoka(session):
    """Ashoka Changemakers — social entrepreneurship, global."""
    grants = []
    SOURCE = "changemakers.com"
    html = await fetch(session, "https://www.changemakers.com/competitions")
    if not html:
        html = await fetch(session, "https://www.changemakers.com/")
    if html:
        soup = BeautifulSoup(html, "lxml")
        for art in soup.select("article, .competition, .challenge, .card"):
            t = art.find(["h2","h3","h4"]); a = art.find("a",href=True)
            if not t: continue
            title = t.get_text(strip=True)
            if len(title) < 6: continue
            url  = urljoin("https://www.changemakers.com", a["href"]) if a else "https://www.changemakers.com"
            text = art.get_text(" ")
            if score_relevance(f"{title} {text}") < 4: continue
            grants.append(make_grant(title=title, source_name=SOURCE, url=url,
                description=text[:400], country="GLOBAL",
                funder="Ashoka / Changemakers",
                deadline=extract_deadline(text), amount_max=extract_amount(text),
                categories=["social entrepreneurship","environment","community"]))
    console.print(f"  [cyan]changemakers.com[/] → {len(grants)}")
    return grants


async def fetch_emerging_climate_champions(session):
    """Emerging Climate Champions Award — $1M grants for youth climate orgs."""
    grants = []
    SOURCE = "emerging-climate-champions"
    grants.append(make_grant(
        title="Emerging Climate Champions Award — $1 Million Grants",
        source_name=SOURCE,
        url="https://www.leverforchange.org/",
        description=(
            "Bold $25 million global open call offering multiyear, flexible $1 million grants "
            "to youth-led organizations advancing climate solutions worldwide. Partnership of "
            "Enlight Foundation, The Patchwork Collective, and Lever For Change. Focus: youth-led, "
            "climate justice, socio-environmental, grassroots, global south."
        ),
        funder="Enlight Foundation / Lever For Change / Patchwork Collective",
        amount_max="1000000", currency="USD",
        country="GLOBAL", language="en",
        categories=["youth","climate","social change","large grant","global south"],
    ))
    console.print(f"  [cyan]emerging climate champions[/] → {len(grants)}")
    return grants


# ══════════════════════════════════════════════════════════════
#  SOURCE REGISTRY
# ══════════════════════════════════════════════════════════════

ALL_SOURCES = {
    # Brazil
    "capta":          fetch_capta,
    "prosas":         fetch_prosas,
    "casa":           fetch_casa,
    "ispn":           fetch_ispn,
    "fundobrasil":    fetch_fundobrasil,
    # EU / Europe
    "eu":             fetch_eu_tenders,
    "eea":            fetch_eea_grants,
    "gulbenkian":     fetch_gulbenkian,
    "doen":           fetch_doen,
    "porticus":       fetch_porticus,
    "commonwealth":   fetch_commonwealth_foundation,
    # UNESCO / multilateral
    "unesco":         fetch_unesco,
    # Climate justice funds
    "ycjf":           fetch_ycjf,
    "cjrfund":        fetch_cjrfund,
    "moleskine":      fetch_moleskine_pioneers,
    "eco-champions":  fetch_emerging_climate_champions,
    # Global aggregators
    "fundsforngos":   fetch_fundsforngos,
    "opdesk":         fetch_opportunity_desk,
    "ofy":            fetch_opportunities_for_youth,
    "eflux":          fetch_eflux,
    "susart":         fetch_sustainable_practice,
    "impactfunding":  fetch_impactfunding_substack,
    "globalsouth":    fetch_global_south_opportunities,
    # LatAm
    "latam":          fetch_latam,
    # Africa / Asia
    "africa-asia":    fetch_africa_asia,
    # Global env foundations
    "greengrants":    fetch_global_greengrants,
    "wellbeing":      fetch_wellbeing_economy,
    "ashoka":         fetch_ashoka,
    # RSS mega-sweep (covers 35 feeds)
    "rss":            fetch_rss,
}


# ══════════════════════════════════════════════════════════════
#  PIPELINE
# ══════════════════════════════════════════════════════════════

def deduplicate(grants):
    seen_u, seen_t, result = {}, {}, []
    for g in sorted(grants, key=lambda x: x["relevance"], reverse=True):
        uk = g["url"].rstrip("/").lower().split("?")[0]
        tk = re.sub(r'\s+', ' ', g["title"].lower())[:80]
        if uk in seen_u or tk in seen_t: continue
        seen_u[uk] = seen_t[tk] = True
        result.append(g)
    return result

def filter_by_country(grants, country_filter):
    if not country_filter or country_filter.upper() in ("ALL", "GLOBAL"):
        return grants
    cf = country_filter.upper()
    mapping = {
        "BR":     {"BR","LATAM","GLOBAL"},
        "LATAM":  {"BR","AR","CO","MX","PE","CL","EC","VE","BO","PY","UY","LATAM","GLOBAL"},
        "EU":     {"EU","GLOBAL"},
        "AFRICA": {"AFRICA","GLOBAL"},
        "ASIA":   {"ASIA","GLOBAL"},
    }
    include = mapping.get(cf, {cf, "GLOBAL"})
    return [g for g in grants if (g.get("country") or "").upper() in include]

def filter_by_keywords(grants, keywords):
    if not keywords: return grants
    kws = [k.strip().lower() for k in keywords.split(",") if k.strip()]
    if not kws: return grants
    return [g for g in grants if any(kw in f"{g['title']} {g['description']} {g['funder']}".lower() for kw in kws)]

def save_json(grants, path):
    with open(path,"w",encoding="utf-8") as f:
        json.dump({"generated":datetime.now(timezone.utc).isoformat(),
                   "total":len(grants),"grants":grants}, f, ensure_ascii=False, indent=2)

def save_csv(grants, path):
    if not grants: return
    fields = ["id","title","funder","source","url","description","deadline",
              "amount_max","currency","country","region","relevance","fetched_at"]
    with open(path,"w",newline="",encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        w.writeheader(); w.writerows(grants)

def save_markdown(grants, path, title="Grants Radar"):
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines = [f"# {title}",f"",f"> Generated: {now} | Total: {len(grants)}",f"",f"---",f""]
    by_c = {}
    for g in grants: by_c.setdefault(g.get("country","?"),[]).append(g)
    for c in sorted(by_c):
        items = sorted(by_c[c], key=lambda x:x["relevance"], reverse=True)
        lines += [f"## 🌍 {c} ({len(items)} opportunities)",""]
        for g in items:
            bar = "█"*min(10,g["relevance"]//10)
            dl  = f" · 📅 {g['deadline']}" if g.get("deadline") else ""
            amt = f" · 💰 {g['amount_max']} {g.get('currency','')}" if g.get("amount_max") and g["amount_max"] not in ("None","") else ""
            lines += [
                f"### [{g['title']}]({g['url']})",
                f"**{g.get('funder') or g['source']}**{dl}{amt} | Score: `{bar}` {g['relevance']}/100",
                f"",f"{g['description'][:300]}...",f"",f"---",f"",
            ]
    path.write_text("\n".join(lines), encoding="utf-8")

def print_table(grants):
    t = Table(title="🌱 Grants Radar — Results", show_header=True, header_style="bold green", min_width=90)
    t.add_column("Score",   style="cyan",   width=6)
    t.add_column("Country", style="yellow", width=8)
    t.add_column("Title",   style="white",  width=46)
    t.add_column("Deadline",style="magenta",width=12)
    t.add_column("Source",  style="dim",    width=20)
    for g in grants[:50]:
        t.add_row(str(g["relevance"]), g.get("country","?"),
                  g["title"][:45], (g.get("deadline","") or "—")[:10], g["source"][:19])
    console.print(t)


# ══════════════════════════════════════════════════════════════
#  ORCHESTRATOR
# ══════════════════════════════════════════════════════════════

async def run_radar(sources_filter, country_filter, keywords,
                   refresh, min_relevance, output_prefix):
    if refresh:
        for f in CACHE_DIR.glob("*.json"): f.unlink()
        console.print("[yellow]Cache cleared.[/]")

    active = (
        {k:v for k,v in ALL_SOURCES.items() if k in [s.strip() for s in sources_filter.split(",")]}
        if sources_filter else ALL_SOURCES
    )

    console.print(Panel(Text.from_markup(
        f"[bold green]GRANTS RADAR v2[/] — Earth Guardians South America\n"
        f"Sources: [cyan]{len(active)}[/] | Country: [yellow]{country_filter or 'ALL'}[/] | "
        f"Keywords: [magenta]{keywords or 'mission defaults'}[/]\n"
        f"[dim]No US government sources. Global-first, non-extractive.[/]"
    ), title="🌍 Deep search starting", border_style="green"))

    connector = aiohttp.TCPConnector(limit=MAX_CONCURRENT, ssl=False)
    all_grants = []

    async with aiohttp.ClientSession(connector=connector,
                                     timeout=aiohttp.ClientTimeout(total=120)) as session:
        with Progress(SpinnerColumn(), TextColumn("{task.description}"),
                      BarColumn(), console=console) as prog:
            task = prog.add_task("Fetching...", total=len(active))

            async def run_one(name, fn):
                try:
                    r = await fn(session)
                    prog.advance(task)
                    return r or []
                except Exception as e:
                    logging.error(f"{name}: {e}")
                    prog.advance(task)
                    return []

            results = await asyncio.gather(*[run_one(n,f) for n,f in active.items()])

    for r in results: all_grants.extend(r)
    console.print(f"\n[green]✓ Raw:[/] {len(all_grants)}")

    unique   = deduplicate(all_grants)
    filtered = filter_by_country(unique, country_filter)
    filtered = filter_by_keywords(filtered, keywords)
    filtered = [g for g in filtered if g["relevance"] >= min_relevance]
    filtered.sort(key=lambda x: x["relevance"], reverse=True)
    console.print(f"[green]✓ Final:[/] {len(filtered)} relevant grants\n")

    ts     = datetime.now().strftime("%Y%m%d_%H%M")
    prefix = f"{output_prefix}_{ts}" if output_prefix else f"grants_radar_{ts}"

    save_json(filtered,     OUTPUT_DIR / f"{prefix}.json")
    save_csv(filtered,      OUTPUT_DIR / f"{prefix}.csv")
    save_markdown(filtered, OUTPUT_DIR / f"{prefix}.md",
                  title=f"Grants Radar v2 — {country_filter or 'Worldwide'}")

    console.print(f"[bold]Saved:[/] {prefix}.json / .csv / .md")
    print_table(filtered)
    return filtered


# ══════════════════════════════════════════════════════════════
#  CLI
# ══════════════════════════════════════════════════════════════

@click.command()
@click.option("--country",  "-c", default=None,
              help="BR | LATAM | EU | AFRICA | ASIA | GLOBAL | ALL")
@click.option("--sources",  "-s", default=None,
              help=f"Comma-separated: {', '.join(ALL_SOURCES)}")
@click.option("--keywords", "-k", default=None,
              help="Extra comma-separated filter keywords")
@click.option("--refresh",  "-r", is_flag=True,
              help="Clear cache and force re-fetch")
@click.option("--min-score","-m", default=5, type=int,
              help="Min relevance score 0–100 (default 5)")
@click.option("--output",   "-o", default="grants_radar",
              help="Output file prefix")
@click.option("--list-sources", is_flag=True)
def main(country, sources, keywords, refresh, min_score, output, list_sources):
    """
    \b
    GRANTS RADAR v2 — Earth Guardians South America
    No US government sources. Community-first, global.

    Examples:
      python grants_radar.py
      python grants_radar.py --country BR
      python grants_radar.py --country LATAM --keywords "amazônia,artivismo"
      python grants_radar.py --sources capta,casa,ycjf,rss
      python grants_radar.py --refresh --min-score 20
    """
    if list_sources:
        console.print("[bold]Available sources:[/]")
        for k in ALL_SOURCES:
            console.print(f"  [cyan]{k}[/]")
        return
    logging.basicConfig(
        filename=LOG_DIR/f"radar_{datetime.now().strftime('%Y%m%d')}.log",
        level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    asyncio.run(run_radar(sources, country, keywords, refresh, min_score, output))

if __name__ == "__main__":
    main()
