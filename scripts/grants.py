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
  python grants_radar.py --country ASIA      # Japan, China, India, SE Asia
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
import os
import re
import time
import logging
from pathlib import Path
from datetime import datetime, timezone
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
MAX_DESCRIPTION_LEN = 600

REGION_MAP = {
    "BR": "LATAM", "AR": "LATAM", "CO": "LATAM", "MX": "LATAM", "PE": "LATAM",
    "CL": "LATAM", "EC": "LATAM", "VE": "LATAM", "BO": "LATAM", "PY": "LATAM",
    "UY": "LATAM", "LATAM": "LATAM", "CR": "LATAM", "PA": "LATAM",
    "GT": "LATAM", "CU": "LATAM", "DO": "LATAM", "HT": "LATAM", "JM": "LATAM",
    "EU": "EUROPE", "FR": "EUROPE", "ES": "EUROPE", "DE": "EUROPE", "IT": "EUROPE",
    "PT": "EUROPE", "UK": "EUROPE", "GB": "EUROPE", "NORDIC": "EUROPE",
    "IE": "EUROPE", "NL": "EUROPE", "BE": "EUROPE", "CH": "EUROPE",
    "AT": "EUROPE", "PL": "EUROPE", "SE": "EUROPE", "NO": "EUROPE",
    "DK": "EUROPE", "FI": "EUROPE",
    "US": "NORTH_AMERICA", "CA": "NORTH_AMERICA", "NORTH_AMERICA": "NORTH_AMERICA",
    "AFRICA": "AFRICA", "ASIA": "ASIA", "JP": "ASIA", "CN": "ASIA", "KR": "ASIA",
    "IN": "ASIA", "TH": "ASIA", "VN": "ASIA", "ID": "ASIA", "PH": "ASIA",
    "TW": "ASIA", "MY": "ASIA", "SG": "ASIA", "SEA": "ASIA",
    "UG": "AFRICA", "KE": "AFRICA", "NG": "AFRICA", "GH": "AFRICA",
    "ZA": "AFRICA", "TZ": "AFRICA", "SN": "AFRICA", "RW": "AFRICA",
    "AU": "OCEANIA", "NZ": "OCEANIA", "PACIFIC": "OCEANIA",
    "GLOBAL": "GLOBAL",
}

NON_GRANT_KEYWORDS = [
    "resultado", "selecionad", "confira", "divulgad", "notícia", "noticia",
    "lança ferramenta", "participação no", "principais destaques",
    "congresso desmonta", "intercâmbios agroecológicos",
    "encontros das comunidades", "contam suas histórias",
    "my account", "register or sign in", "page not found",
    "the page you are looking for", "file not found",
    "evento", "conferência", "seminário", "webinar", "workshop",
    "newsletter", "boletim", "reportagem",
    # ── v2: login walls / error pages / nav chrome ──
    "sign in to continue", "log in to", "create an account", "subscribe to continue",
    "access denied", "forbidden", "error 404", "error 403", "bad gateway",
    "service unavailable", "cookie policy", "privacy policy update",
    "agenda", "programação do evento", "event schedule", "keynote speaker",
    "obituary", "obituário", "weather forecast", "sports results",
    "job opening", "we're hiring", "vaga de emprego", "classified",
    # ── v2.1: job postings / hiring (major false-positive source —
    # globalsouth + ofy rows like "YLabs Hiring…", "Greenpeace Hiring…")
    "hiring", "we are hiring", "we're hiring", "now hiring",
    "career opportunit", "job opportunit", "remote job",
    "vacancy", "vacancies", "vaga ", "vagas ", "trabalhe conosco",
    "job vacancy", "position available", "open position",
    "salary of", "salary up to", "paying up to", "per year",
    "full-time role", "part-time opportunity", "consultant wanted",
    "request for cv", "terms of reference",
    # ── v2.1: conferences / calls for papers (not grants)
    "call for papers", "call for abstracts", "submit your abstract",
    "conference", "proceedings",
    # ── v2.2: explicitly non-monetary programmes (mentorships etc.)
    "no funding", "no stipend", "non-monetary", "no prize is offered",
    "no monetary award",
]

# Generic navigation/chrome headings that generic selectors (article/li/h2)
# used to promote into "grants" — e.g. "Overview", "Our Work", "Read more".
GENERIC_NAV_TITLES = {
    "overview", "our work", "ourwork", "about us", "about", "contact",
    "home", "news", "blog", "stories", "themes in this portfolio",
    "read more", "learn more", "see all", "view all", "load more",
    "choose from the domains below", "our initiatives", "what we do",
    "who we are", "where we work", "annual report",
}

# A grant candidate MUST contain at least one of these (or carry a real
# deadline + real amount). Without this gate any page mentioning "culture"
# or "environment" scores relevance and becomes a false positive.
GRANT_TERMS_RE = re.compile(
    r'(edital|chamada pública|chamada de propostas|open call|call for '
    r'(?:proposals|applications|entries|submissions)|request for proposals|'
    r'\brfp\b|grant|grantmaking|fellowship|bolsa|subvenç|convocatória|'
    r'convocatoria|appel à projets?|bando|bewerbung|antrag|fundo concursable|'
    r'prize|award|scholarship|microgrant|micro-grant|seed fund|seed grant|'
    r'bridge fund|matching fund|crowdfund|donor circle|aplicar|inscreva-se|'
    r'candidatura|postulación|apply (?:now|here|today|by))',
    re.I,
)

# Minimum quality bar shared by every scraper. Tuned on 581-row audit
# (2026-06-30 exports): 64% had neither deadline nor amount.
MIN_RELEVANCE_DEFAULT = 12
MIN_SIGNALS_DEFAULT = 10

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
    # English env/conservation (core)
    "environmental","conservation","wildlife","forest conservation","ocean conservation",
    "environmental protection","ecosystem","habitat restoration",
    # Français
    "environnement","justice climatique","autochtone","biodiversité",
    "droits humains","défenseurs","changement climatique","transition écologique",
    "artivisme","communauté","peuples autochtones","déforestation","climat",
    # Español
    "ambiente","justicia climática","indígena","biodiversidad",
    "derechos humanos","defensores","cambio climático","transición ecológica",
    "arte activismo","comunitario","pueblos originarios","desmatamiento",
    # 中文 (Chinese)
    "环境","保护","生物多样性","气候","土著","社区","可持续","生态","森林",
    "气候变化","野生动物"," conservation","reforestation",
    # 日本語 (Japanese)
    "環境","保全","生物多様性","気候","先住","コミュニティ","持続可能","生態系",
    # 한국어 (Korean)
    "환경","보전","생물다양성","기후","원주민","생태계",
    # हिन्दी (Hindi)
    "पर्यावरण","संरक्षण","जलवायु","समुदाय","जैवविविधता",
    # ภาษาไทย (Thai)
    "สิ่งแวดล้อม","อนุรักษ์","ชุมชน","ความยั่งยืน",
    # Bahasa Indonesia
    "lingkungan","konservasi","keanekaragaman hayati","hutan","masyarakat adat",
]

SECONDARY_KEYWORDS = [
    "culture","cultura","arts","artes","environment","ambiente",
    "sustainability","sustentabilidade","community","comunidade",
    "ecology","ecologia","conservation","conservação",
    "development","desenvolvimento","green","verde",
    "youth","juventude","women","mulheres","gender","gênero",
    "africa","asia","latin america","global south","sul global",
    "grant","funding","fellowship","open call","call for",
    "restoration","protect","preserve","climate action",
    "education","health","food security","water","energy",
    "livelihood","resilience","adaptation","regenerative",
    # Français
    "subvention","financement","bourse","appel à","appel à projets",
    "développement","jeunesse","femmes","durable","résilience",
    "adaptation","transition","solidaire","inclusion","territoire",
    # Español
    "subvención","financiamiento","beca","convocatoria","desarrollo",
    "juventud","mujeres","sostenible","resiliencia","adaptación",
    "transición","solidario","inclusión","territorio","comunitarias",
    # 中文 (Chinese grant)
    "资助","基金","项目","申请","截止日期","奖学金","招标","公告","资金",
    "补助","奖励","捐赠","合作","征集","开放申请",
    # 日本語 (Japanese grant)
    "助成金","補助金","基金","申込","締切","募集","助成","支援","資金援助",
    "補助","grant","助成事業","公募",
    # 한국어 (Korean grant)
    "보조금","기금","신청","마감","모집","지원","보조","공모","펀드",
    # हिन्दी (Hindi grant)
    "अनुदान","फंड","आवेदन","छात्रवृत्ति","सहायता","निधि",
    # ภาษาไทย (Thai grant)
    "ทุน","กองทุน","สมัคร","กำหนดเวลา","ทุนสนับสนุน","เงินสนับสนุน",
    # Bahasa Indonesia
    "hibah","dana","pendaftaran","batas waktu","beasiswa","bantuan","program hibah",
]



def is_likely_non_grant(title: str, description: str = "") -> bool:
    blob = f"{title} {description}".lower()
    return any(kw in blob for kw in NON_GRANT_KEYWORDS)


# ── v2.1: dedicated job-posting gate ──────────────────────────────
# Title-led: a grant never has "hiring"/"career"/"vacancy" in its title.
# Fellowship/scholarship titles are explicitly exempt (they ARE grants).
JOB_TITLE_RE = re.compile(
    r'(hiring|now hiring|career opportunit|job opportunit|remote jobs?|'
    r'vacanc|open position|we are hiring|we\'re hiring|trabalhe conosco|'
    r'is hiring a|is hiring an)',
    re.I,
)

JOB_EXEMPT_RE = re.compile(
    r'(fellowship|scholarship|bolsa|bourse|beca|stipendium|grant\b)',
    re.I,
)


def is_likely_job(title: str, description: str = "") -> bool:
    """True for job/hiring posts. Fellowship & scholarship offers are
    grants, not jobs — never flag those."""
    t = title or ""
    if JOB_EXEMPT_RE.search(t):
        return False
    if JOB_TITLE_RE.search(t):
        return True
    blob = f"{t} {description or ''}".lower()
    job_body_markers = (
        "salary of", "salary up to", "paying up to", "per year",
        "full-time role", "terms of reference", "request for cv",
        "position available",
    )
    return any(m in blob for m in job_body_markers)


CLOSED_KEYWORDS = [
    "encerrad", "finalizada", "concluída", "concluida", "resultado",
    "selecionad", "divulgad", "closed", "expired", "ended", "completed",
    "no longer accepting", "no longer accepting applications",
    "applications are closed", "deadline has passed",
]

OPEN_KEYWORDS = [
    "inscri", "prazo", "abert", "submissão", "submissao", "proposta",
    "chamada", "edital", "open call", "call for", "accepting applications",
    "applications open", "apply now", "submit proposal", "submit your",
    "registration open", "is open", "are open",
]

ACTIVE_KEYWORDS = [
    "em andamento", "ativo", "active", "ongoing", "running",
    "current", "vigor", "vigente",
]

UNKNOWN_KEYWORDS = [
    "rolling", "continuous", "ongoing basis", "year-round",
    "at any time", "no deadline", "always open",
]


def detect_status_from_text(text: str) -> str:
    """Detect grant status from content text. Returns 'open', 'closed', or 'unknown'."""
    blob = text.lower()
    # Check closed first (higher priority — if something says "encerrado", it's closed)
    for kw in CLOSED_KEYWORDS:
        if kw in blob:
            return "closed"
    # Check active/open
    for kw in ACTIVE_KEYWORDS + OPEN_KEYWORDS:
        if kw in blob:
            return "open"
    # Check rolling/continuous
    for kw in UNKNOWN_KEYWORDS:
        if kw in blob:
            return "unknown"
    return ""  # No signal — caller decides default


def detect_status_from_badge(badge_text: str) -> str:
    """Detect status from badge/label text (e.g., 'Abertas', 'Encerradas')."""
    bt = badge_text.lower().strip()
    if any(w in bt for w in ["aberta", "open", "ativo", "andamento"]):
        return "open"
    if any(w in bt for w in ["encerrad", "closed", "finalizad", "concluid"]):
        return "closed"
    return ""


def detect_status_from_parent(parent_classes: list) -> str:
    """Detect status from parent container CSS classes."""
    classes_str = " ".join(parent_classes).lower()
    if "encerrad" in classes_str or "closed" in classes_str:
        return "closed"
    if "abert" in classes_str or "open" in classes_str or "active" in classes_str:
        return "open"
    return ""

def has_grant_signals(title: str, description: str, deadline: str, amount_max: str) -> int:
    """Detect grant signals in text. Returns 0-53 signal score."""
    signals = 0
    blob = f"{title} {description}".lower()
    # ── Deadline present — strong signal ──
    if deadline and deadline not in ("None", ""):
        signals += 15
    # ── Amount present — strong signal ──
    if amount_max and amount_max not in ("None", ""):
        signals += 15
    # ── Grant-related terms in multiple languages ──
    grant_terms = (
        r'(edital|chamada|open call|grant|fellowship|bolsa|subvenção|convocatória|beca|subvention|'
        r'appel à projets|补助|助成金|bando|convocatoria|propuesta|progetto|bewerbung|antrag|'
        r'proposal|funding|financiamento|financement|financiación|finanziamento|'
        r'prize|premio|premio|award|bourse|stipendium|scholarship|beca|'
        r'research fund|development fund|environmental fund|climate fund|'
        r'microgrant|micro-grant|seed fund|seed grant|bridge fund)'
    )
    if re.search(grant_terms, blob):
        signals += 10
    # ── Currency symbols present ──
    if re.search(r'(R\$|€|\$|£|¥|₹|₩|฿|Rp|USD|EUR|BRL|GBP|JPY|INR|KRW|CNY)', blob):
        signals += 8
    # ── Date patterns present ──
    if re.search(r'\d{4}[-/]\d{1,2}[-/]\d{1,2}', blob):
        signals += 5
    # ── Application-related terms ──
    if re.search(r'(apply|inscreva|solicitar|postular|applicare|bewerben|candidatar)', blob):
        signals += 3
    # ── Eligibility terms ──
    if re.search(r'(eligible|elegível|elegible|éligible|berechtigt|idoneo)', blob):
        signals += 2
    return signals

def score_relevance(text: str) -> int:
    """Score relevance 0-100 based on keyword hits. Higher = more grant-like."""
    text = text.lower()
    # ── Core keywords (strong grant signals) — 8 points each ──
    core_hits = sum(1 for k in CORE_KEYWORDS if k in text)
    # ── Secondary keywords (weaker signals) — 2 points each ──
    secondary_hits = sum(1 for k in SECONDARY_KEYWORDS if k in text)
    # ── Bonus for multiple core hits (diminishing returns) ──
    if core_hits >= 3:
        core_bonus = min(core_hits * 8, 50)  # Cap at 50 for core
    else:
        core_bonus = core_hits * 8
    hits = core_bonus + secondary_hits * 2
    # ── Penalty for likely non-grant content ──
    if is_likely_non_grant(text, text):
        hits = max(0, hits - 20)
    # ── v2.1: jobs are never grants (except fellowships, exempt above) ──
    if is_likely_job(text, ""):
        hits = max(0, hits - 30)
    return min(100, hits)


# ──────────────────────────────────────────────────────────────
# URL VALIDATION + CANDIDATE QUALITY GATE (v2)
# ──────────────────────────────────────────────────────────────

LOGIN_WALL_RE = re.compile(
    r'(sign in to continue|log in to|register or sign in|create an account|'
    r'subscribe to continue|my account|access denied|forbidden|'
    r'page not found|the page you are looking for|file not found|'
    r'error 404|error 403)',
    re.I,
)

TRACKING_PARAMS_RE = re.compile(
    r'[?&](utm_\w+|fbclid|gclid|gclsrc|mc_cid|mc_eid|ref|source|medium|campaign|mc_|_hsenc|_hsmi|vero_id)=[^&]*',
)


def normalize_url(url: str) -> str:
    """Normalize URL for comparison/dedupe — strip tracking, fragments, trailing slashes."""
    u = (url or "").strip()
    u = TRACKING_PARAMS_RE.sub("", u)
    u = u.split("#")[0].rstrip("/")
    return u


def is_valid_grant_url(url: str) -> bool:
    """Reject empty, non-http, or too-short URLs.

    Homepage-only links (https://example.org/ with no path) are ACCEPTED
    since v2.7 — several real funders run the call from their root domain,
    and the old rejection was silently dropping valid grants. Depth is
    still rewarded downstream (extract_grant_link scores deep call pages
    higher), but a bare homepage is no longer a validity failure.
    """
    if not url or not isinstance(url, str):
        return False
    u = url.strip()
    if not re.match(r'https?://', u, re.I):
        return False
    if len(u) < 15 or " " in u:
        return False
    try:
        parts = urlparse(u)
        if not parts.netloc or "." not in parts.netloc:
            return False
    except (ValueError, AttributeError):
        return False
    return True


# ──────────────────────────────────────────────────────────────
# GRANT-LINK EXTRACTION (v2.6)
# Aggregator posts (TerraViva, fundsforNGOs, Opportunity Desk, RSS
# feeds…) link OUT to the real funder call page, but the scraper used
# to store only the aggregator permalink. Every record now carries
# both: `source_link` (aggregator page we scraped) and `grant_link`
# (best-guess funder/official call URL found inside the post HTML).
# `url` stays the primary action URL = grant_link when valid, else
# source_link (back-compat for UI / Supabase / dedupe).
# ──────────────────────────────────────────────────────────────

# Link domains that are never a grant call page.
SKIP_LINK_DOMAINS = frozenset({
    "facebook.com", "twitter.com", "x.com", "linkedin.com",
    "instagram.com", "youtube.com", "youtu.be", "pinterest.com",
    "whatsapp.com", "wa.me", "t.me", "telegram.me",
    "gravatar.com", "wordpress.com", "wordpress.org",
    "google.com", "googletagmanager.com", "google-analytics.com",
    "addtoany.com", "sharethis.com", "feedburner.com",
    "paypal.com", "patreon.com", "buymeacoffee.com",
    "wikipedia.org",
})

# Anchor-text signals: the link really points at the call.
GRANT_ANCHOR_HINTS = (
    "apply", "application", "guidelines", "guidance", "official",
    "call page", "call for", "request for proposal", "letter of inquiry",
    "concept note", "how to apply", "eligibility", "submit",
    "more information", "learn more about the grant",
    "grant details", "funding opportunity", "program page",
    "candidatura", "inscreva-se", "candidatez", "postuler",
    "appel à", "convocatoria", "bando", "edital",
)

# URL-path signals: the href looks like a call page.
GRANT_PATH_HINTS = (
    "/grant", "/fund", "/apply", "/call", "/edital", "/chamada",
    "/oportun", "/opportunit", "/fellowship", "/scholarship",
    "/award", "/proposal", "/loi", "/concept", "/guideline",
    "/financ", "/subven", "/beca", "/bourse", "/prize",
)


def _link_domain(href: str) -> str:
    try:
        host = urlparse(href).netloc.lower()
    except (ValueError, AttributeError):
        return ""
    if host.startswith("www."):
        host = host[4:]
    return host


def extract_grant_link(html_raw: str, source_url: str = "",
                       funder_hint: str = "") -> str:
    """Pick the best outbound funder/call URL from a post's raw HTML.

    Returns "" when nothing qualifies. Never returns the aggregator's
    own permalink, social/share links, images, or anchors. Funder
    homepages ARE valid candidates since v2.7 (scored like any other
    link — deep call pages still outscore them via path hints).
    """
    if not html_raw or "<a" not in html_raw.lower():
        return ""
    try:
        soup = BeautifulSoup(html_raw, "lxml")
        anchors = soup.find_all("a", href=True) if soup else []
    except Exception:
        return ""
    src_dom = _link_domain(source_url or "")
    funder_tokens = [t for t in re.split(r"[^a-z0-9]+", (funder_hint or "").lower())
                     if len(t) >= 4]

    candidates: list[tuple[int, str]] = []
    try:
        anchor_list = list(anchors)
    except Exception:
        return ""
    for a in anchor_list:
        href = (a.get("href") or "").strip()
        if not href or href.startswith(("#", "mailto:", "tel:", "javascript:")):
            continue
        href = urljoin(source_url or "https://example.org/", href)
        if not is_valid_grant_url(href):
            continue
        dom = _link_domain(href)
        if not dom or dom in SKIP_LINK_DOMAINS:
            continue
        if src_dom and dom == src_dom:
            continue  # aggregator self-link, not the funder call
        # Skip obvious non-call assets.
        low_href = href.lower()
        if re.search(r"\.(png|jpe?g|gif|svg|webp|css|js|ico|pdf)(\?|$)", low_href):
            # PDFs *can* be guidelines, but bare asset links without any
            # grant anchor text are noise — require an anchor hint.
            anchor = (a.get_text(" ", strip=True) or "").lower()
            if not any(h in anchor for h in GRANT_ANCHOR_HINTS):
                continue
        anchor = (a.get_text(" ", strip=True) or "").lower()
        path = urlparse(href).path.lower()
        score = 0
        if any(h in anchor for h in GRANT_ANCHOR_HINTS):
            score += 3
        if any(h in path for h in GRANT_PATH_HINTS):
            score += 2
        if funder_tokens and any(t in dom.replace("-", "") or t in dom
                                 for t in funder_tokens):
            score += 2
        if "cepf" in dom or "cepf" in path or "cepf" in anchor:
            score += 1  # recurring funder seen bare in aggregator posts
        if href.startswith("https://"):
            score += 1
        if score > 0:
            candidates.append((score, href))
    if not candidates:
        return ""
    # Highest score wins; tie-break: longest path (deepest call page),
    # first seen wins remaining ties (stable).
    best_href, best_key = "", (-1, -1)
    for score, href in candidates:
        key = (score, len(urlparse(href).path))
        if key > best_key:
            best_key, best_href = key, href
    return best_href


def is_valid_grant_candidate(title: str, description: str = "",
                             url: str = "", deadline: str = "",
                             amount_max: str = "",
                             min_relevance: int = MIN_RELEVANCE_DEFAULT,
                             min_signals: int = MIN_SIGNALS_DEFAULT) -> bool:
    """Central anti-false-positive gate. Returns True only for grant-like items.

    Drops: nav/chrome headings, login walls, error pages, items with neither
    grant vocabulary nor (deadline + amount), and low-score items.
    """
    t = (title or "").strip()
    if len(t) < 15:
        return False
    if t.lower().strip() in GENERIC_NAV_TITLES:
        return False
    blob = f"{t} {description or ''}"
    if is_likely_non_grant(t, description or ""):
        return False
    if is_likely_job(t, description or ""):
        return False
    if LOGIN_WALL_RE.search(blob):
        return False
    if url and not is_valid_grant_url(url):
        return False
    has_terms = bool(GRANT_TERMS_RE.search(blob))
    has_deadline = bool(deadline and deadline not in ("None", ""))
    has_amount = bool(amount_max and amount_max not in ("None", ""))
    if not has_terms and not (has_deadline and has_amount):
        return False
    relevance = score_relevance(blob)
    signals = has_grant_signals(t, description or "", deadline, amount_max)
    # v2.2 completeness exemption (mirrors run_radar): fully-evidenced
    # grants pass regardless of mission-relevance.
    if has_terms and has_deadline and has_amount:
        return True
    if relevance < min_relevance or signals < min_signals:
        return False
    return True


def compute_quality_score(relevance: int, signals: int, has_deadline: bool,
                          has_amount: bool, url_ok: bool = True) -> int:
    """Composite 0-100 quality score for ranking + Supabase `quality_score`."""
    q = min(relevance, 40) + min(signals, 30)
    if has_deadline:
        q += 15
    if has_amount:
        q += 15
    if not url_ok:
        q -= 30
    return max(0, min(100, q))


def is_scrape_hit(title: str, text: str, threshold: int = 8) -> bool:
    """Per-card pre-filter for broad generic sweeps (article/section/li).

    Lets through cards that carry grant vocabulary; otherwise requires a
    solid relevance score. Kills nav-chrome hits ("Overview", "Our Work")
    at the source instead of relying only on the pipeline gate.
    """
    t = (title or "").strip()
    if len(t) < 15:
        return False
    if t.lower() in GENERIC_NAV_TITLES:
        return False
    if is_likely_non_grant(t, text or ""):
        return False
    if is_likely_job(t, text or ""):
        return False
    blob = f"{t} {text or ''}"
    if GRANT_TERMS_RE.search(blob):
        return True
    return score_relevance(blob) >= threshold


async def verify_grant_urls(session, grants, max_check: int = 400):
    """HEAD/GET each grant URL; flag broken + login-wall pages.

    v2.6: grants carry `grant_link` (funder call page) + `source_link`
    (aggregator page). The primary `url` (= grant_link when present) is
    checked first; when it is dead but the source_link is alive, `url`
    falls back to source_link so the record stays actionable.
    Mutates grants in place: sets `url_status` (ok/broken/login_wall/timeout/
    unchecked), `url_status_code`, `url_checked_at`. Returns (kept, dropped).
    """
    checked_at = datetime.now(timezone.utc).isoformat()
    kept, dropped = [], []

    async def _probe(url: str):
        """Return (verdict, code) where verdict is ok/login_wall/broken/timeout."""
        try:
            timeout = aiohttp.ClientTimeout(total=15)
            async with session.head(url, headers=HEADERS, timeout=timeout,
                                    allow_redirects=True) as r:
                code = r.status
                ctype = r.headers.get("Content-Type", "")
                if code < 400:
                    return "ok", code
        except asyncio.TimeoutError:
            pass
        except (aiohttp.ClientError, OSError):
            pass
        # HEAD failed or non-2xx: fall back to GET (also catches login walls).
        try:
            timeout = aiohttp.ClientTimeout(total=15)
            async with session.get(url, headers=HEADERS, timeout=timeout,
                                   allow_redirects=True) as r:
                code = r.status
                ctype = r.headers.get("Content-Type", "")
                if code < 400 and "text/html" in ctype:
                    snippet = (await r.text())[:2000].lower()
                    if LOGIN_WALL_RE.search(snippet):
                        return "login_wall", code
                if code >= 400:
                    return "broken", code
                if code == 405:
                    return "unchecked", code
                return "ok", code
        except asyncio.TimeoutError:
            return "timeout", None
        except (aiohttp.ClientError, OSError):
            return "broken", None

    for g in grants:
        grant_link = (g.get("grant_link") or "").strip()
        source_link = (g.get("source_link") or g.get("url") or "").strip()
        # Ordered candidates: funder call page first, aggregator fallback.
        candidates = []
        for cand in (grant_link, source_link):
            if cand and is_valid_grant_url(cand) and cand not in candidates:
                candidates.append(cand)
        url = g.get("url", "")
        if not candidates:
            g.update(url_status="broken", url_status_code=None,
                     url_checked_at=checked_at)
            dropped.append(g)
            continue
        if len(kept) + len(dropped) >= max_check:
            g.setdefault("url_status", "unchecked")
            kept.append(g)
            continue
        winner, verdict, code = "", "", None
        for cand in candidates:
            verdict, code = await _probe(cand)
            if verdict in ("ok", "unchecked"):
                winner = cand
                break
        if not winner:
            # v2.6: a dead grant_link must not linger as the primary URL.
            if grant_link and grant_link == url:
                g["grant_link"] = ""
            # Preserve the old quirk: a login-walled primary reads as
            # login_wall, anything else dead reads broken/timeout.
            g.update(url_status="login_wall" if verdict == "login_wall" else verdict,
                     url_status_code=code, url_checked_at=checked_at)
            dropped.append(g)
            continue
        g["url"] = winner
        # Keep the pair consistent: winner is one of the two links.
        if winner == grant_link and not source_link:
            g["source_link"] = source_link
        if code == 405:  # HEAD not allowed — don't punish, leave unchecked
            g.update(url_status="unchecked", url_status_code=code,
                     url_checked_at=checked_at)
            kept.append(g)
            continue
        g.update(url_status="ok", url_status_code=code,
                 url_checked_at=checked_at)
        kept.append(g)
    return kept, dropped


def parse_amount_value(amount_max, currency):
    """Return numeric value in approximate USD for ranking. Handles BRL, EUR, GBP, JPY, INR, KRW, CNY, THB, IDR, and more."""
    if not amount_max or amount_max in ("None", ""):
        return 0
    raw = str(amount_max)
    # Approximate exchange rates to USD (as of 2025)
    rates = {
        "BRL": 5.5,    # 1 USD ≈ 5.5 BRL
        "EUR": 0.92,   # 1 USD ≈ 0.92 EUR
        "GBP": 0.79,   # 1 USD ≈ 0.79 GBP
        "JPY": 150,    # 1 USD ≈ 150 JPY
        "INR": 83,     # 1 USD ≈ 83 INR
        "KRW": 1300,   # 1 USD ≈ 1300 KRW
        "CNY": 7.2,    # 1 USD ≈ 7.2 CNY
        "THB": 35,     # 1 USD ≈ 35 THB
        "IDR": 16000,  # 1 USD ≈ 16000 IDR
        "MYR": 4.7,    # 1 USD ≈ 4.7 MYR
        "PHP": 56,     # 1 USD ≈ 56 PHP
        "SGD": 1.35,   # 1 USD ≈ 1.35 SGD
        "CAD": 1.36,   # 1 USD ≈ 1.36 CAD
        "AUD": 1.53,   # 1 USD ≈ 1.53 AUD
        "NZD": 1.65,   # 1 USD ≈ 1.65 NZD
        "CHF": 0.88,   # 1 USD ≈ 0.88 CHF
        "SEK": 10.5,   # 1 USD ≈ 10.5 SEK
        "NOK": 10.8,   # 1 USD ≈ 10.8 NOK
        "DKK": 6.9,    # 1 USD ≈ 6.9 DKK
        "PLN": 4.0,    # 1 USD ≈ 4.0 PLN
        "CZK": 23,     # 1 USD ≈ 23 CZK
        "HUF": 360,    # 1 USD ≈ 360 HUF
        "RON": 4.5,    # 1 USD ≈ 4.5 RON
        "BGN": 1.8,    # 1 USD ≈ 1.8 BGN
        "TRY": 30,     # 1 USD ≈ 30 TRY
        "ZAR": 18,     # 1 USD ≈ 18 ZAR
        "MXN": 17,     # 1 USD ≈ 17 MXN
        "ARS": 350,    # 1 USD ≈ 350 ARS
        "CLP": 900,    # 1 USD ≈ 900 CLP
        "COP": 4000,   # 1 USD ≈ 4000 COP
        "PEN": 3.7,    # 1 USD ≈ 3.7 PEN
    }

    def _to_usd(num, cur):
        if cur:
            c = cur.upper()
            if c in rates:
                return num / rates[c]
        return num

    # Handle "million", "milhões", "thousand", "mil", "k", "万", "億" suffixes
    # FIRST — "R$ 4 milhões" must not fall into the plain-BRL branch below.
    m = re.search(r'([\d,]+(?:\.\d+)?)\s*(millions?|milh(?:ão|ões|ao|oes)|bilh(?:ão|ões|ao|oes)|billions?|thousands?|\bmil\b|k|万|億|mrd|billion|bn)', raw, re.I)
    if m:
        num = float(m.group(1).replace(",", ""))
        suffix = m.group(2).lower()
        if suffix in ("million", "millions", "milhão", "milhões", "milhoes"):
            num *= 1000000
        elif suffix in ("billion", "billions", "bilhão", "bilhões", "bilhoes", "mrd", "bn"):
            num *= 1000000000
        elif suffix in ("thousand", "thousands", "mil", "k"):
            num *= 1000
        elif suffix in ("万",):
            num *= 10000
        elif suffix in ("億",):
            num *= 100000000
        return _to_usd(num, currency)
    # Handle Brazilian format: "R$ 150.000,00" -> 150000.00
    br_match = re.search(r'R\$\s*([\d\.]+(?:,\d{2})?)', raw)
    if br_match:
        num = br_match.group(1).replace(".", "").replace(",", ".")
        try:
            val = float(num)
            return val / 5.5 if currency and currency.upper() == "BRL" else val
        except ValueError:
            pass
    # Handle Indian format: "₹ 50,00,000" or "₹5 Crore"
    crore_match = re.search(r'(?:₹|INR|Rs[.\s]*)?(\d+(?:,\d+)*)\s*(?:crore|Cr|CR)', raw, re.I)
    if crore_match:
        val = float(crore_match.group(1).replace(",", ""))
        return val * 10000000 / 83  # 1 crore = 10M INR -> USD
    lakh_match = re.search(r'(?:₹|INR|Rs[.\s]*)?(\d+(?:,\d+)*)\s*(?:lakh|Lakh|LAC)', raw, re.I)
    if lakh_match:
        val = float(lakh_match.group(1).replace(",", ""))
        return val * 100000 / 83
    # Try to extract raw number
    try:
        val = float(re.sub(r"[^0-9.]", "", raw))
    except (ValueError, TypeError):
        return 0
    return _to_usd(val, currency)


def compute_deadline_urgency(deadline_str):
    """Return days until deadline and urgency label.

    Date-based (calendar days, UTC): a deadline *today* is urgent (delta 0),
    not expired. This must agree with is_expired(), which uses ``day < today`` —
    previously this used datetime arithmetic, so a same-day deadline produced
    urgency="expired" while the temporal gate considered it alive, leaking an
    "expired" row into the export that the CI analyzer then (correctly) failed.
    """
    if not deadline_str or deadline_str in ("None", ""):
        return None, "unknown"
    for fmt in [
        "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d",
        "%B %d, %Y", "%d %B %Y", "%B %Y",
        # v2.3: abbreviated months ("19 Jun 2026", "Sep 29, 2026")
        "%b %d, %Y", "%d %b %Y", "%d-%b-%y", "%d-%b-%Y",
    ]:
        try:
            dt = datetime.strptime(deadline_str.split("T")[0].split(" ")[0], fmt)
            today = datetime.now(timezone.utc).date()
            delta = (dt.date() - today).days
            if delta < 0:
                return delta, "expired"
            if delta <= 30:
                return delta, "urgent"
            if delta <= 90:
                return delta, "soon"
            return delta, "distant"
        except ValueError:
            continue
    return None, "unknown"


# ── v2.4 temporal helpers: dead calls must never ship ──────────────
# A grant is excludable when its page says CLOSED or its deadline already
# passed as of right now. Rolling / no-deadline grants (unknown) are KEPT:
# absence of a date is not evidence of closure.
def parse_deadline_day(deadline_str):
    """Parse a deadline string to a `datetime.date`. Returns None when the
    string carries no parseable calendar date (rolling / unknown / garbage).

    No dateutil dependency here on purpose — stdlib only, so the gate
    works in the stdlib-only CI test sandbox too.
    """
    if not deadline_str or deadline_str in ("None", ""):
        return None
    from datetime import date as _date
    s = str(deadline_str).strip()
    # Fast path: ISO prefix ("2026-09-18" or "2026-09-18T…").
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})", s)
    if m:
        try:
            return _date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        except ValueError:
            return None
    # Legacy raw shapes ("19 June 2026", "31/08/26", …) — same shapes as
    # compute_deadline_urgency, plus 2-digit-year slash forms.
    dayfirst = bool(re.match(r"^\d{1,2}/\d{1,2}/", s))
    for fmt in [
        "%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d",
        "%d/%m/%y", "%m/%d/%y",
        "%B %d, %Y", "%d %B %Y", "%B %Y",
        "%b %d, %Y", "%d %b %Y", "%d-%b-%y", "%d-%b-%Y",
    ]:
        try:
            token = s.split("T")[0].split(" at ")[0].strip()
            if dayfirst and fmt in ("%m/%d/%Y", "%m/%d/%y"):
                continue
            if not dayfirst and fmt in ("%d/%m/%Y", "%d/%m/%y"):
                continue
            return datetime.strptime(token, fmt).date()
        except ValueError:
            continue
    return None


def is_expired(deadline_str, grace_days: int = 0) -> bool:
    """True when the deadline is a real calendar date strictly before today
    (minus an optional grace window). Unparseable / empty deadlines are
    NEVER expired — unknown stays shippable."""
    day = parse_deadline_day(deadline_str)
    if day is None:
        return False
    from datetime import date as _date, timedelta as _td
    today = datetime.now(timezone.utc).date()
    return day < (today - _td(days=max(0, grace_days)))


def temporal_exclude_reason(g: dict, grace_days: int = 0) -> str | None:
    """Why this grant must not ship, or None when it is temporally alive.

    Order matters: an explicit CLOSED page signal wins over the date, and
    a past deadline forces exclusion even when the scraper left status
    at "open"/"unknown" (stale badge, the common leak).
    NOTE (2026-09): "pending" is not scraper vocabulary — manager manual
    inserts are auto-approved and flagged with manual_inserted=true instead
    of going through any review queue. A stray "pending" reaching here is
    treated as unknown (kept); the sync layer stores it as status=open
    downstream.
    """
    status = str(g.get("status") or "").strip().lower()
    if status == "closed":
        return "closed"
    if is_expired(g.get("deadline", ""), grace_days):
        return "deadline-passed"
    return None


EG_CORE_KEYWORDS = [
    "artivism","artivismo","art activism","arte ativismo","cultural activism",
    "socioambiental","socio-environmental","environmental justice","justiça climática",
    "climate justice","sacrifice zone","zona de sacrifício",
    "indigenous","indígena","quilombola","traditional communities",
    "community media","comunicação comunitária","creative activism",
    "grassroots","base comunitária","social movement","movimento social",
    "environmental defenders","defensores ambientais",
    "arte política","documentary","documentário",
    "just transition","transição justa",
    "land rights","territorial rights","direito territorial",
]

ARTIVISM_KW = [
    "artivism","artivismo","art activism","arte ativismo","arte política",
    "cultural activism","ativismo cultural","community art","arte comunitária",
    "creative activism","documentary","documentário","arte e meio ambiente",
    "art environment","fotografia","photography","música","music","teatro",
    "theatre","performance","instalação","installation","multimídia","multimedia",
    "video","vídeo","cinema","film","animation","animação","storytelling",
    "narrativa","intervention","intervenção",
]

CLIMATE_JUSTICE_KW = [
    "climate justice","justiça climática","climate change","mudanças climáticas",
    "climate adaptation","climate resilience","green transition","just transition",
    "transição justa","climate action","climate fund","climate grant",
    "net zero","decarbonization","descarbonização","renewable energy",
    "energia renovável","carbon","carbono","emissions","emissões",
]

CONSERVATION_KW = [
    "biodiversity","biodiversidade","conservation","conservação","wildlife",
    "forest","floresta","amazônia","amazon","ocean","oceano","marine","marinho",
    "ecosystem","ecossistema","habitat restoration","reforestation",
    "restauração","protected area","área protegida","species","espécies",
    "wildlife protection","forest conservation","ocean conservation",
]

HUMAN_RIGHTS_KW = [
    "human rights","direitos humanos","social justice","justiça social",
    "civil society","sociedade civil","democracy","democracia","equity",
    "equidade","gender","gênero","racial justice","justiça racial",
    "lgbtqia","feminist","feminista","anti-racism","antirracismo",
    "migration","migração","refugee","refugiado","prison","prisão",
]

INDIGENOUS_KW = [
    "indigenous","indígena","quilombola","traditional communities",
    "comunidades tradicionais","native","originário","povos originários",
    "tribal","territorial rights","land rights","autoctone",
    "first nations","native american","aboriginal","maori","sami",
]

YOUTH_KW = [
    "youth","juventude","young","jovem","student","estudante","children",
    "criança","adolescent","adolescente","next generation","próxima geração",
    "emerging leaders","leadership","liderança",
]


def classify_grant(title, description, funder, categories, language):
    """Auto-classify a grant into a primary type and sub-categories. Uses keyword matching with confidence scoring."""
    blob = f"{title} {description} {funder}".lower()
    types = []
    scores = {}  # Track match confidence for each type

    # ── Artivism (art + activism) ──
    artivism_hits = sum(1 for kw in ARTIVISM_KW if kw in blob)
    if artivism_hits > 0:
        types.append("artivism")
        scores["artivism"] = artivism_hits

    # ── Climate Justice ──
    climate_hits = sum(1 for kw in CLIMATE_JUSTICE_KW if kw in blob)
    if climate_hits > 0:
        types.append("climate_justice")
        scores["climate_justice"] = climate_hits

    # ── Conservation ──
    conservation_hits = sum(1 for kw in CONSERVATION_KW if kw in blob)
    if conservation_hits > 0:
        types.append("conservation")
        scores["conservation"] = conservation_hits

    # ── Human Rights ──
    human_rights_hits = sum(1 for kw in HUMAN_RIGHTS_KW if kw in blob)
    if human_rights_hits > 0:
        types.append("human_rights")
        scores["human_rights"] = human_rights_hits

    # ── Indigenous Rights ──
    indigenous_hits = sum(1 for kw in INDIGENOUS_KW if kw in blob)
    if indigenous_hits > 0:
        types.append("indigenous_rights")
        scores["indigenous_rights"] = indigenous_hits

    # ── Youth ──
    youth_hits = sum(1 for kw in YOUTH_KW if kw in blob)
    if youth_hits > 0:
        types.append("youth")
        scores["youth"] = youth_hits

    # ── Education (additional type) ──
    education_kw = ["education","educação","education","enseignement","bildung","scuola","learning","aprendizagem","school","escola","university","universidade","research","pesquisa"]
    education_hits = sum(1 for kw in education_kw if kw in blob)
    if education_hits > 0:
        types.append("education")
        scores["education"] = education_hits

    # ── Health (additional type) ──
    health_kw = ["health","saúde","health","santé","gesundheit","salud","medical","médico","hospital","vaccination","vacinação","public health","saúde pública"]
    health_hits = sum(1 for kw in health_kw if kw in blob)
    if health_hits > 0:
        types.append("health")
        scores["health"] = health_hits

    # ── Technology/Innovation (additional type) ──
    tech_kw = ["technology","tecnologia","innovation","inovação","digital","startup","entrepreneurship","empreendedorismo","tech","tech for good","impact tech"]
    tech_hits = sum(1 for kw in tech_kw if kw in blob)
    if tech_hits > 0:
        types.append("technology")
        scores["technology"] = tech_hits

    # ── Also check existing categories ──
    for cat in (categories or []):
        cl = cat.lower()
        if "art" in cl or "creativ" in cl or "cultur" in cl:
            if "artivism" not in types:
                types.append("artivism")
                scores["artivism"] = scores.get("artivism", 0) + 1
        if "climate" in cl or "environment" in cl:
            if "climate_justice" not in types:
                types.append("climate_justice")
                scores["climate_justice"] = scores.get("climate_justice", 0) + 1
        if "conserv" in cl or "biodivers" in cl or "wildlife" in cl or "forest" in cl:
            if "conservation" not in types:
                types.append("conservation")
                scores["conservation"] = scores.get("conservation", 0) + 1
        if "human right" in cl or "social justice" in cl or "feminist" in cl:
            if "human_rights" not in types:
                types.append("human_rights")
                scores["human_rights"] = scores.get("human_rights", 0) + 1
        if "indigenous" in cl or "tribal" in cl:
            if "indigenous_rights" not in types:
                types.append("indigenous_rights")
                scores["indigenous_rights"] = scores.get("indigenous_rights", 0) + 1
        if "youth" in cl or "education" in cl or "student" in cl:
            if "youth" not in types:
                types.append("youth")
                scores["youth"] = scores.get("youth", 0) + 1

    # ── Deduplicate while preserving order ──
    seen = set()
    unique_types = []
    for t in types:
        if t not in seen:
            seen.add(t)
            unique_types.append(t)

    # ── If nothing matched, mark as general ──
    if not unique_types:
        unique_types.append("general")

    # ── Primary type is the one with highest confidence score ──
    if len(unique_types) > 1 and scores:
        primary = max(unique_types, key=lambda t: scores.get(t, 0))
        # Move primary to front
        unique_types.remove(primary)
        unique_types.insert(0, primary)
    else:
        primary = unique_types[0]

    return primary, unique_types


def compute_highlights(title, description, funder, amount_max, currency, deadline, status, categories, language):
    """Compute highlight markers for a grant."""
    blob = f"{title} {description} {funder}".lower()
    highlights = []

    # Mission affinity
    if any(kw in blob for kw in EG_CORE_KEYWORDS):
        highlights.append("EG_CORE")

    # Deadline urgency
    days, urgency = compute_deadline_urgency(deadline)
    if urgency == "urgent":
        highlights.append("URGENT")
    elif urgency == "soon":
        highlights.append("SOON")
    elif urgency == "expired":
        highlights.append("EXPIRED")

    # Amount
    usd_val = parse_amount_value(amount_max, currency)
    if usd_val > 50000:
        highlights.append("HIGH_VALUE")
    elif usd_val >= 5000:
        highlights.append("GOOD_VALUE")
    elif usd_val > 0:
        highlights.append("HAS_AMOUNT")

    # Artivism match
    if any(kw in blob for kw in ARTIVISM_KW):
        highlights.append("ARTIVISM")

    # Climate justice
    if any(kw in blob for kw in CLIMATE_JUSTICE_KW):
        highlights.append("CLIMATE")

    # Indigenous focus
    if any(kw in blob for kw in INDIGENOUS_KW):
        highlights.append("INDIGENOUS")

    # Status
    if status == "closed":
        highlights.append("CLOSED")
    elif status == "open":
        highlights.append("OPEN")

    # Scholarship / fellowship
    if any(w in blob for w in ["scholarship","fellowship","bolsa","bourse","beca"]):
        highlights.append("SCHOLARSHIP")

    return highlights


# ──────────────────────────────────────────────────────────────
# DATA MODEL
# ──────────────────────────────────────────────────────────────

# Single-funder sources: funder is known without parsing.
SOURCE_FUNDER_DEFAULTS = {
    "ycjf": "Youth Climate Justice Fund",
    "cjrfund": "Climate Justice Resilience Fund",
    "emerging-climate-champions": "Enlight Foundation / Lever For Change",
    "commonwealthfoundation.com": "Commonwealth Foundation",
    "unesco": "UNESCO",
    "ispn.org.br": "ISPN",
    "casa.org.br": "Fundo Casa Socioambiental",
    "fundobrasil.org.br": "Fundo Brasil de Direitos Humanos",
    "capta.org.br": "Capta",
    "cepf": "Critical Ecosystem Partnership Fund",
    "env:cepf": "Critical Ecosystem Partnership Fund",
    "greengrants.org": "Global Greengrants Fund",
    "weall.org": "Wellbeing Economy Alliance",
    "changemakers.com": "Ashoka / Changemakers",
    "e-flux.com": "e-flux",
    "moleskine": "Moleskine Foundation",
    "sustainablepractice.org": "Centre for Sustainable Practice in the Arts",
}

# Well-known funder acronyms — high precision, searched in title first.
FUNDER_ACRONYMS = (
    "GEF", "UNDP", "UNEP", "UNESCO", "WWF", "IUCN", "FAO", "UNICEF",
    "USAID", "GCF", "EU", "WHO", "UNHCR", "WWF",
)

# "Applications Open for X …" / "Call for …: X …" — strip the call phrase
# so the funder-name pattern below sees the actual name.
CALL_PREFIX_RE = re.compile(
    r'^(?:applications?\s+open\s+for|apply\s+(?:now\s+)?(?:for|:)|'
    r'open\s+call\s+for|call\s+for\s+[^:]{2,60}:\s*|'
    r'grants?\s+for|funding\s+(?:opportunity\s+)?for)\s+',
    re.I,
)

FUNDER_LEAD_RE = re.compile(
    r'^(?:the\s+)?([A-ZÀ-Þ][\w&\'’\-., ]{2,48}?)\s+'
    r'(Foundation|Fund|Fundo|Fundação|Fundación|Trust|Programme|Program|'
    r'Initiative|Iniciativa|Prize|Awards?|Grants?|Fellowship|Competition|Challenge)\b'
)


def infer_currency(amount_raw: str, text: str = "") -> str:
    """Derive ISO-ish currency code from an amount fragment + context.

    Deterministic and safe: only returns a code when a symbol or code is
    literally present. R$ checked before $ (it contains $).
    """
    blob = f"{amount_raw or ''} {text or ''}"
    if re.search(r'R\$', blob):
        return "BRL"
    m = re.search(
        r'\b(USD|EUR|GBP|JPY|INR|KRW|CNY|THB|IDR|MYR|PHP|SGD|CAD|AUD|'
        r'NZD|CHF|SEK|NOK|DKK|PLN|CZK|BRL|MXN|ARS|CLP|COP|PEN|ZAR|TRY)\b',
        blob, re.I)
    if m:
        return m.group(1).upper()
    for sym, code in (("$", "USD"), ("€", "EUR"), ("£", "GBP"),
                      ("¥", "JPY"), ("₹", "INR"), ("₩", "KRW"), ("฿", "THB")):
        if sym in blob:
            return code
    return ""


def infer_funder(title: str, description: str = "",
                 source: str = "") -> str:
    """Best-effort funder name. Order: explicit source default, known
    acronym in title, 'X Foundation/Fund…' lead pattern. Returns '' when
    nothing is certain — an honest empty beats a wrong funder."""
    if source in SOURCE_FUNDER_DEFAULTS:
        return SOURCE_FUNDER_DEFAULTS[source]
    t = (title or "").strip()
    for acro in FUNDER_ACRONYMS:
        if re.search(rf'\b{acro}\b', t):
            return acro
    # v2.2: "Funder — Program" / "Funder: Program" titles (Terra Viva style).
    # Left part must look like an org name, not a call phrase.
    split = re.split(r'\s+[—–]\s+|\s*:\s+', t, maxsplit=1)
    if len(split) == 2:
        left = split[0].strip()
        if (len(left) >= 3 and len(left) <= 45
                and re.match(r'[A-ZÀ-Þ]', left)
                and not re.search(
                    r'(open call|call for|applications?|apply|grants?|funding|'
                    r'opportunit|programmes?|projects?|announces?|now open)',
                    left, re.I)):
            return left
    t2 = CALL_PREFIX_RE.sub("", t)
    m = FUNDER_LEAD_RE.match(t2)
    if m:
        name = f"{m.group(1).strip()} {m.group(2)}"
        # Reject over-long captures (program subtitles, not names)
        if len(name) <= 55:
            return name
    return ""


def make_grant(title, source_name, url, description="", funder="",
               deadline="", amount_max="", amount_min="", currency="",
               country="", region="", categories=None, language="en",
               status="open",
               grant_link="", source_link="", raw_html=""):
    # v2.6 dual-link model: `source_link` = aggregator page we scraped,
    # `grant_link` = outbound funder/official call URL found inside the
    # post. `url` stays the primary action URL (grant_link when valid,
    # else source_link) for dedupe/hash/quality + legacy export readers.
    # The merged Supabase grants table has NO url column — sync writes the
    # pair only. Callers with raw post HTML pass raw_html= and the link is
    # auto-extracted; an explicit grant_link= always wins.
    source_link = (source_link or url or "").strip()
    auto_link = ""
    if not grant_link and raw_html:
        auto_link = extract_grant_link(raw_html, source_url=source_link,
                                       funder_hint=funder or title)
    grant_link = (grant_link or auto_link or "").strip()
    if grant_link and not is_valid_grant_url(grant_link):
        grant_link = ""
    primary_url = grant_link or source_link
    url = primary_url  # primary action URL, used below for uid/hash/quality
    uid = hashlib.md5(f"{source_name}::{url}".encode()).hexdigest()[:12]
    # v2.2: fill funder + currency when the scraper didn't provide them.
    # Explicit values always win; inference only fills blanks.
    if not (funder or "").strip():
        funder = infer_funder(title, description, source_name)
    if not (currency or "").strip():
        currency = infer_currency(amount_max, f"{title} {description}")
    # v2.5 scope refinement: generic aggregators pass country="GLOBAL",
    # which buried clearly-scoped calls ("… (Uganda)", "entities based in
    # Canada"). Re-scope from eligibility phrasing — explicitly-scoped
    # calls are never touched.
    if (not (country or "").strip()
            or (country or "").strip().upper() == "GLOBAL"):
        scoped = infer_scope_country(title, description, language)
        if scoped and scoped != "GLOBAL":
            country = scoped
    if not (country or "").strip():
        country = "GLOBAL"
    blob = f"{title} {description} {funder}".lower()

    base_relevance = score_relevance(blob)
    # Heavy penalty for likely non-grant posts (news, results, etc.)
    if is_likely_non_grant(title, description):
        base_relevance = min(base_relevance, 10)
    # v2.1: jobs are never grants — bury unconditionally
    if is_likely_job(title, description):
        base_relevance = min(base_relevance, 5)
    grant_type, type_list = classify_grant(title, description, funder, categories, language)
    highlights = compute_highlights(title, description, funder, amount_max, currency, deadline, status, categories, language)
    usd_val = parse_amount_value(amount_max, currency)
    grant_signals = has_grant_signals(title, description, deadline, amount_max)
    inferred_region = region or REGION_MAP.get(country, "GLOBAL")

    # Priority score: base relevance + signals + bonuses
    priority = base_relevance + grant_signals
    if "EG_CORE" in highlights:
        priority += 15
    if "URGENT" in highlights:
        priority += 10
    if "SOON" in highlights:
        priority += 5
    if "HIGH_VALUE" in highlights:
        priority += 10
    if "GOOD_VALUE" in highlights:
        priority += 5
    if status == "closed":
        priority -= 20

    days, urgency = compute_deadline_urgency(deadline)

    content_hash = hashlib.md5(
        f"{re.sub(r'[^\\w\\s]', '', title.lower()).strip()[:80]}::{normalize_url(url)}".encode()
    ).hexdigest()[:16]
    quality_score = compute_quality_score(
        base_relevance, grant_signals,
        has_deadline=bool(deadline and deadline not in ("None", "")),
        has_amount=bool(amount_max and amount_max not in ("None", "")),
        url_ok=is_valid_grant_url(url),
    )

    return {
        "id":              uid,
        "title":           title.strip(),
        "funder":          funder.strip(),
        "source":          source_name,
        "source_id":       uid,              # alias for Supabase compat
        "url":             url,
        "source_link":     source_link,      # aggregator page scraped
        "grant_link":      grant_link,       # funder/official call page ("")
        "url_status":      "unchecked",      # filled by verify_grant_urls()
        "url_status_code": None,
        "url_checked_at":  "",
        "content_hash":    content_hash,
        "quality_score":   quality_score,
        "description":     description.strip()[:MAX_DESCRIPTION_LEN],
        "deadline":        deadline,
        "amount_max":      amount_max,
        "amount_min":      amount_min,
        "currency":        currency,
        "country":         country,
        "region":          inferred_region,
        "categories":      categories or [],
        "language":        language,
        "grant_type":      grant_type,
        "grant_types":     type_list,
        "highlights":      highlights,
        "urgency":         urgency,
        "deadline_days":   days,
        "amount_usd":      round(usd_val, 2) if usd_val > 0 else None,
        "relevance":       base_relevance,
        "priority_score":  max(0, priority),  # clamp to non-negative
        "fetched_at":      datetime.now(timezone.utc).isoformat(),
        "status":          status,         # single temporal column: open/closed/unknown(rolling)
        "manual_inserted": False,          # origin flag — scraper rows are never manual (managers set true on insert, auto-approved)
    }
def _cpath(key): return CACHE_DIR / f"{hashlib.md5(key.encode()).hexdigest()}.json"

async def cache_get(key):
    p = _cpath(key)
    if not p.exists(): return None
    try:
        d = json.loads(p.read_text())
        if (time.time() - d["_ts"]) / 3600 > CACHE_TTL_HOURS: return None
        return d["v"]
    except (json.JSONDecodeError, KeyError, OSError) as e:
        logging.debug(f"cache_get fail {p.name}: {e}")
        return None

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
                extra_headers=None, use_cache=True, max_retries=3):
    """Fetch URL with caching, rate limiting, and retry with exponential backoff."""
    ck = f"{method}::{url}::{json.dumps(json_body or {}, sort_keys=True)}"
    if use_cache:
        cached = await cache_get(ck)
        if cached is not None: return cached

    domain = urlparse(url).netloc
    wait = RATE_LIMIT_DELAY - (time.time() - _domain_ts.get(domain, 0))
    if wait > 0: await asyncio.sleep(wait)
    _domain_ts[domain] = time.time()

    h = {**HEADERS, **(extra_headers or {})}
    for attempt in range(max_retries):
        try:
            kw = dict(headers=h, timeout=aiohttp.ClientTimeout(total=REQUEST_TIMEOUT))
            if method == "POST":
                async with session.post(url, json=json_body, **kw) as r:
                    if r.status >= 400:
                        logging.debug(f"fetch {r.status} {url[:80]}")
                        return None
                    text = await r.text()
            else:
                async with session.get(url, **kw) as r:
                    if r.status >= 400:
                        logging.debug(f"fetch {r.status} {url[:80]}")
                        return None
                    text = await r.text()
            if use_cache: await cache_set(ck, text)
            return text
        except asyncio.TimeoutError:
            logging.debug(f"fetch timeout (attempt {attempt+1}/{max_retries}) {url[:80]}")
            await asyncio.sleep(1.5 ** attempt)
        except Exception as e:
            logging.debug(f"fetch fail (attempt {attempt+1}/{max_retries}) {url[:80]}: {e}")
            await asyncio.sleep(1.5 ** attempt)
    return None

async def fetch_json(session, url, method="GET", json_body=None, use_cache=True):
    text = await fetch(session, url, method=method, json_body=json_body,
                       extra_headers={"Accept": "application/json"}, use_cache=use_cache)
    if not text: return None
    # Strip leading non-JSON garbage (some WP sites render content before the JSON payload)
    clean = text.lstrip()
    for ch in clean:
        if ch in ('[', '{'):
            break
        clean = clean[1:]
    else:
        clean = text  # fallback: nothing looks like JSON
    try: return json.loads(clean)
    except (json.JSONDecodeError, ValueError) as e:
        logging.debug(f"fetch_json parse fail {url[:80]}: {e}")
        return None

def clean_html(html):
    return re.sub(r'\s+', ' ', BeautifulSoup(html or "", "lxml").get_text(" ")).strip()


def feed_raw_html(entry) -> str:
    """Best-effort raw HTML from a feedparser entry for grant-link mining.

    Prefers full <content:encoded> bodies, falls back to summary /
    description (both often carry the outbound funder <a href> links).
    """
    try:
        content = entry.get("content") if hasattr(entry, "get") else None
        if content and isinstance(content, list) and content[0].get("value"):
            return content[0]["value"]
    except (AttributeError, KeyError, IndexError, TypeError):
        pass
    try:
        return entry.get("summary", "") or entry.get("description", "") or ""
    except AttributeError:
        return getattr(entry, "summary", "") or ""

def parse_date(s, dayfirst=False):
    if not s: return ""
    try:
        # v2.2: dateparser returns None (no raise) for unparseable input —
        # guard it, a crash here used to kill the whole source batch.
        dt = dateparser.parse(str(s), fuzzy=True, dayfirst=dayfirst)
        return dt.date().isoformat() if dt else str(s)[:20]
    except (ValueError, OverflowError, TypeError, AttributeError) as e:
        logging.debug(f"parse_date fail '{s[:50]}': {e}")
        return str(s)[:20]


def extract_grant_items(soup, base_url, selectors=None):
    """Extract grant items from a BeautifulSoup page using robust fallback selectors.
    Returns list of dicts with title, url, text, and selector that matched.
    """
    if selectors is None:
        selectors = [
            # High-confidence selectors
            "article", ".grant", ".opportunity", ".call", ".chamada", ".edital",
            "[class*='grant']", "[class*='fund']", "[class*='opportunity']",
            "[class*='call']", "[class*='edital']", "[class*='chamada']",
            # Medium-confidence selectors
            "section", "li", ".card", "[class*='card']", "[class*='item']",
            # Low-confidence fallbacks
            "h2 a", "h3 a", "h4 a",
        ]
    items = []
    seen_titles = set()
    for selector in selectors:
        for el in soup.select(selector):
            a = el.find("a", href=True)
            t = el.find(["h1","h2","h3","h4","h5"])
            if not t:
                # Try to get title from the element itself
                title_text = el.get_text(strip=True)
                if len(title_text) > 10 and len(title_text) < 200:
                    title = title_text
                else:
                    continue
            else:
                title = t.get_text(strip=True)
            if len(title) < 10:
                continue
            # Deduplicate within this page
            title_key = re.sub(r'\s+', ' ', title.lower())[:60]
            if title_key in seen_titles:
                continue
            seen_titles.add(title_key)
            url = urljoin(base_url, a["href"]) if a else base_url
            text = el.get_text(" ")
            items.append({"title": title, "url": url, "text": text, "selector": selector})
        if items:
            break  # Stop at first selector that yields results
    return items


def extract_body_text(soup):
    """Extract meaningful body text from a page, trying multiple selectors."""
    for selector in [".entry-content", ".post-content", "article", ".et_pb_section",
                     ".content", "main", "[role='main']", "#content", ".page-content"]:
        body = soup.select_one(selector)
        if body:
            parts = []
            for p in body.select("p, li, h2, h3, h4"):
                pt = p.get_text(strip=True)
                if len(pt) > 30:
                    parts.append(pt)
            if parts:
                return " | ".join(parts[:10])
    # Fallback: just get all paragraph text
    paragraphs = []
    for p in soup.select("p"):
        pt = p.get_text(strip=True)
        if len(pt) > 30:
            paragraphs.append(pt)
    return " | ".join(paragraphs[:10]) if paragraphs else ""

def _extract_amount_raw(text):
    """Extract first currency amount from text. Handles ranges, multiple currencies, edge cases."""
    if not text:
        return ""
    # ── Brazilian Real (BRL) — most common in this scraper ──
    # Range: "R$ 50.000,00 a R$ 200.000,00" or "R$50.000 a R$200.000"
    m_brl_range = re.search(
        r'R\$\s*([\d\.]+(?:,\d{2})?)\s*(?:a|até|–|-)\s*R\$\s*([\d\.]+(?:,\d{2})?)', text)
    if m_brl_range:
        return f"R$ {m_brl_range.group(1)} – R$ {m_brl_range.group(2)}"
    # Single with magnitude: "R$ 4 milhões", "R$ 200 mil", "R$ 1,2 bilhão"
    m_brl_mag = re.search(
        r'R\$\s*([\d\.,]+)\s*(milh(?:ão|ões|ao|oes)|bilh(?:ão|ões|ao|oes)|\bmil\b)', text, re.I)
    if m_brl_mag:
        return f"R$ {m_brl_mag.group(1)} {m_brl_mag.group(2)}"
    # Single: "R$ 150.000,00" or "até R$ 150.000" or "R$150.000"
    m_brl = re.search(r'R\$\s*([\d\.]+(?:,\d{2})?)', text)
    if m_brl:
        return f"R$ {m_brl.group(1)}"

    # ── USD/EUR/GBP ranges ──
    # "$5,000 – $10,000" or "$5,000 to $10,000" or "€5,000 – €10,000"
    m_usd_range = re.search(
        r'[\$€£]\s*([\d,\.]+)\s*(?:–|-|to|a|até)\s*[\$€£]\s*([\d,\.]+)', text)
    if m_usd_range:
        sym = '$' if '$' in text[m_usd_range.start():m_usd_range.end()] else (
            '€' if '€' in text[m_usd_range.start():m_usd_range.end()] else '£')
        return f"{sym}{m_usd_range.group(1)} – {sym}{m_usd_range.group(2)}"

    # ── Named currency ranges: "USD 5,000 – USD 10,000" ──
    m_named_range = re.search(
        r'(USD|EUR|GBP|JPY|CNY|INR|KRW|THB|IDR|MYR|PHP|SGD|CAD|AUD|NZD|CHF|SEK|NOK|DKK)'
        r'\s*([\d,\.]+)\s*(?:–|-|to)\s*(?:USD|EUR|GBP|JPY|CNY|INR|KRW|THB|IDR|MYR|PHP|SGD|CAD|AUD|NZD|CHF|SEK|NOK|DKK)'
        r'\s*([\d,\.]+)', text, re.I)
    if m_named_range:
        cur = m_named_range.group(1).upper()
        return f"{cur} {m_named_range.group(2)} – {cur} {m_named_range.group(3)}"

    # ── Standard currencies with suffixes (million, lakh, crore, 万, 億) ──
    # ── Standard currencies (symbols match any case; alpha codes must be
    # UPPERCASE with word boundaries — otherwise "in 1997" matches INR,
    # "my," matches MYR, "rm." matches RM). ──
    m = re.search(
        r'(€|\$|£|¥|₹|₩|฿|Rp|R\$|US\$)'
        r'\s*([\d,\.]+(?:\s*(?:million|mil|thousand|万|億|lakh|crore))?)', text)
    if m:
        raw = m.group(0).strip()
        # Avoid matching single digits like "$1" unless followed by more
        num_part = re.search(r'[\d,\.]+', raw)
        if num_part and len(num_part.group().replace(',','').replace('.','')) >= 2:
            return raw
    # UPPERCASE alpha codes only (case-SENSITIVE on purpose)
    m_code = re.search(
        r'\b(USD|EUR|GBP|JPY|CNY|INR|KRW|THB|IDR|MYR|PHP|SGD|CAD|AUD|NZD|CHF|SEK|NOK|DKK|BRL)\b'
        r'\s*([\d,\.]{3,}(?:\s*(?:million|mil|thousand|lakh|crore))?)', text)
    if m_code:
        return m_code.group(0).strip()

    # ── Dollar sign with amount: "$5,000" or "$ 5000" ──
    m2 = re.search(r'\$\s*([\d,\.]{2,})', text)
    if m2:
        return m2.group(0).strip()

    # ── Euro sign with amount ──
    m3 = re.search(r'€\s*([\d,\.]{2,})', text)
    if m3:
        return m3.group(0).strip()

    # ── Pound sign with amount ──
    m4 = re.search(r'£\s*([\d,\.]{2,})', text)
    if m4:
        return m4.group(0).strip()

    # ── Yen sign (¥) — careful: matches both JPY and CNY ──
    m5 = re.search(r'¥\s*([\d,\.]{2,})', text)
    if m5:
        return m5.group(0).strip()

    # ── "up to X" or "até X" patterns ──
    m_up = re.search(r'(?:up to|até|jusqu\'à|bis zu|fino a)\s*(?:R\$\s*|US\$\s*|\$\s*|€\s*|£\s*)?([\d,\.]+)', text, re.I)
    if m_up:
        # Find the currency symbol before "up to"
        prefix = text[max(0, m_up.start()-15):m_up.start()]
        sym = "$"
        if "R$" in prefix: sym = "R$"
        elif "€" in prefix: sym = "€"
        elif "£" in prefix: sym = "£"
        elif "¥" in prefix: sym = "¥"
        return f"{sym}{m_up.group(1)}"

    # ── "from X to Y" patterns (fixed: was €\с* with a Cyrillic с) ──
    m_from_to = re.search(r'(?:from|de|von|da)\s*(?:R\$\s*|US\$\s*|\$\s*|€\s*|£\s*)?([\d,\.]+)\s*(?:to|a|até|bis|fino a)\s*(?:R\$\s*|US\$\s*|\$\s*|€\s*|£\s*)?([\d,\.]+)', text, re.I)
    if m_from_to:
        prefix = text[max(0, m_from_to.start()-15):m_from_to.start()]
        sym = "$"
        if "R$" in prefix: sym = "R$"
        elif "€" in prefix: sym = "€"
        elif "£" in prefix: sym = "£"
        return f"{sym}{m_from_to.group(1)} – {sym}{m_from_to.group(2)}"

    # ── Plain number + currency word: "5000 USD", "10000 euros" ──
    m_word = re.search(r'([\d,\.]{2,})\s*(?:USD|dollars?|euros?|euro|pounds?|sterling|reais|BRL|EUR|GBP)', text, re.I)
    if m_word:
        return m_word.group(0).strip()

    return ""

def _is_plausible_amount(raw: str) -> bool:
    """Reject parser garbage: fragments without a real money figure.

    Kills audit findings like "in.", "my,", "rm.", "in 1997," — bare years
    (1900–2100), sub-3-digit numbers, or candidates with no digit run ≥3.
    """
    if not raw:
        return False
    nums = re.findall(r'\d[\d,\.]*', raw)
    if not nums:
        return False
    # Magnitude words always count ("$5k", "₹5 Crore", "¥20 million") —
    # checked before the length guard so compact forms like "$5k" survive.
    if re.search(r'(millions?|milh(?:ão|ões|ao|oes)|bilh(?:ão|ões|ao|oes)|billions?|thousands?|\bmil\b|\bk\b|\dk\b|lakh|crore|万|億|mrd|\bbn\b)', raw, re.I):
        return True
    if len(raw.strip()) < 4:
        return False
    # v2.1: bare digit runs with NO money marker are not amounts
    # ("th 501", "20000000", "501"). Real money always carries a
    # symbol/code or a magnitude word inside the matched fragment.
    has_marker = bool(re.search(
        r'\$|€|£|¥|₹|₩|฿|R\$|\b(USD|EUR|GBP|JPY|INR|KRW|CNY|THB|IDR|MYR|'
        r'PHP|SGD|CAD|AUD|NZD|CHF|SEK|NOK|DKK|PLN|CZK|BRL)\b', raw, re.I))
    if not has_marker:
        return False
    for n in nums:
        digits = re.sub(r'\D', '', n)
        if len(digits) < 3:
            continue
        # Bare year without a currency SYMBOL attached → not money
        if len(digits) == 4 and 1900 <= int(digits) <= 2100 \
                and not re.search(r'[$€£¥₹₩฿]|R\$', raw):
            continue
        return True
    return False


def extract_amount(text):
    """Validated wrapper — never returns garbage fragments."""
    if not text:
        return ""
    raw = _extract_amount_raw(text)
    if not raw or not _is_plausible_amount(raw):
        return ""
    # v2.2: strip trailing sentence punctuation ("US$60,000." → "US$60,000")
    return raw.strip().rstrip(".,;:")

def extract_deadline(text):
    """Extract deadline from text. Supports absolute dates and relative expressions in 10+ languages."""
    if not text:
        return ""
    from datetime import timedelta
    today = datetime.now(timezone.utc).replace(tzinfo=None)
    blob = text.lower()

    # ══════════════════════════════════════════════════════════
    # RELATIVE DEADLINES — convert to absolute dates
    # ══════════════════════════════════════════════════════════

    # ── Portuguese: "em 30 dias", "daqui 30 dias", "prazo de 30 dias" ──
    rel_pt = re.search(r'(?:daqui|em|prazo\s+de)\s+(\d+)\s+dias?', blob)
    if rel_pt:
        return (today + timedelta(days=int(rel_pt.group(1)))).strftime("%Y-%m-%d")
    rel_pt_weeks = re.search(r'(?:daqui|em)\s+(\d+)\s+semanas?', blob)
    if rel_pt_weeks:
        return (today + timedelta(days=int(rel_pt_weeks.group(1)) * 7)).strftime("%Y-%m-%d")
    rel_pt_months = re.search(r'(?:daqui|em)\s+(\d+)\s+meses?', blob)
    if rel_pt_months:
        return (today + timedelta(days=int(rel_pt_months.group(1)) * 30)).strftime("%Y-%m-%d")
    rel_pt_years = re.search(r'(?:daqui|em)\s+(\d+)\s+anos?', blob)
    if rel_pt_years:
        return (today + timedelta(days=int(rel_pt_years.group(1)) * 365)).strftime("%Y-%m-%d")

    # ── English: "in 30 days", "30 days from now", "closing in 2 weeks" ──
    rel_en_days = re.search(r'(?:in|within|closing\s+in|next)\s+(\d+)\s+days?', blob)
    if rel_en_days:
        return (today + timedelta(days=int(rel_en_days.group(1)))).strftime("%Y-%m-%d")
    rel_en_weeks = re.search(r'(?:in|within|closing\s+in|next)\s+(\d+)\s+weeks?', blob)
    if rel_en_weeks:
        return (today + timedelta(days=int(rel_en_weeks.group(1)) * 7)).strftime("%Y-%m-%d")
    rel_en_months = re.search(r'(?:in|within|closing\s+in|next)\s+(\d+)\s+months?', blob)
    if rel_en_months:
        return (today + timedelta(days=int(rel_en_months.group(1)) * 30)).strftime("%Y-%m-%d")
    # "30 days from now", "by end of month", "by end of year"
    rel_en_from_now = re.search(r'(\d+)\s+days?\s+from\s+now', blob)
    if rel_en_from_now:
        return (today + timedelta(days=int(rel_en_from_now.group(1)))).strftime("%Y-%m-%d")
    if re.search(r'by\s+end\s+of\s+month', blob):
        import calendar
        next_month = today.month + 1 if today.month < 12 else 1
        next_year = today.year if today.month < 12 else today.year + 1
        last_day = calendar.monthrange(next_year, next_month)[1]
        return f"{next_year}-{next_month:02d}-{last_day:02d}"
    if re.search(r'by\s+end\s+of\s+year', blob):
        return f"{today.year}-12-31"

    # ── French: "dans 30 jours", "dans 2 semaines", "dans 3 mois" ──
    rel_fr_days = re.search(r'dans\s+(\d+)\s+jours?', blob)
    if rel_fr_days:
        return (today + timedelta(days=int(rel_fr_days.group(1)))).strftime("%Y-%m-%d")
    rel_fr_weeks = re.search(r'dans\s+(\d+)\s+semaines?', blob)
    if rel_fr_weeks:
        return (today + timedelta(days=int(rel_fr_weeks.group(1)) * 7)).strftime("%Y-%m-%d")
    rel_fr_months = re.search(r'dans\s+(\d+)\s+mois', blob)
    if rel_fr_months:
        return (today + timedelta(days=int(rel_fr_months.group(1)) * 30)).strftime("%Y-%m-%d")

    # ── Spanish: "en 30 días", "en 2 semanas", "en 3 meses" ──
    rel_es_days = re.search(r'en\s+(\d+)\s+d[ií]as?', blob)
    if rel_es_days:
        return (today + timedelta(days=int(rel_es_days.group(1)))).strftime("%Y-%m-%d")
    rel_es_weeks = re.search(r'en\s+(\d+)\s+semanas?', blob)
    if rel_es_weeks:
        return (today + timedelta(days=int(rel_es_weeks.group(1)) * 7)).strftime("%Y-%m-%d")
    rel_es_months = re.search(r'en\s+(\d+)\s+meses?', blob)
    if rel_es_months:
        return (today + timedelta(days=int(rel_es_months.group(1)) * 30)).strftime("%Y-%m-%d")

    # ── German: "in 30 Tagen", "in 2 Wochen", "in 3 Monaten" ──
    rel_de_days = re.search(r'in\s+(\d+)\s+Tag(?:en)?', blob)
    if rel_de_days:
        return (today + timedelta(days=int(rel_de_days.group(1)))).strftime("%Y-%m-%d")
    rel_de_weeks = re.search(r'in\s+(\d+)\s+Woch(?:en)?', blob)
    if rel_de_weeks:
        return (today + timedelta(days=int(rel_de_weeks.group(1)) * 7)).strftime("%Y-%m-%d")
    rel_de_months = re.search(r'in\s+(\d+)\s+Monat(?:en)?', blob)
    if rel_de_months:
        return (today + timedelta(days=int(rel_de_months.group(1)) * 30)).strftime("%Y-%m-%d")

    # ── Italian: "entro 30 giorni", "entro 2 settimane", "entro 3 mesi" ──
    rel_it_days = re.search(r'entro\s+(\d+)\s+giorni?', blob)
    if rel_it_days:
        return (today + timedelta(days=int(rel_it_days.group(1)))).strftime("%Y-%m-%d")
    rel_it_weeks = re.search(r'entro\s+(\d+)\s+settiman[ae]', blob)
    if rel_it_weeks:
        return (today + timedelta(days=int(rel_it_weeks.group(1)) * 7)).strftime("%Y-%m-%d")
    rel_it_months = re.search(r'entro\s+(\d+)\s+mesi', blob)
    if rel_it_months:
        return (today + timedelta(days=int(rel_it_months.group(1)) * 30)).strftime("%Y-%m-%d")

    # ── Vague "soon"-style prose NEVER yields a date (v2 fix).
    # The old code fabricated today+14d for words like "próximo"/"soon"/
    # "urgent", inventing deadlines for grants that had none. Return ""
    # and let urgency stay "unknown".
    # (Intentionally no "closing soon" → +14 days heuristic.)

    # ══════════════════════════════════════════════════════════
    # ABSOLUTE DATE PATTERNS
    # ══════════════════════════════════════════════════════════
    # v2.3 BR ranges: "Chamada de 03/08/26 até o dia 31/08/26" — deadline
    # is the END date. Checked before the generic DD/MM/YYYY pattern.
    m_range = re.search(
        r'(\d{1,2}/\d{1,2}/\d{2,4})\s*(?:a|até|ate|until|through|to|–|-)\s*'
        r'(?:o dia\s*)?(\d{1,2}/\d{1,2}/\d{2,4})', text)
    if m_range:
        return parse_date(m_range.group(2), dayfirst=True)
    # v2.4: "Closes Friday, September 18, 2026" / "Closes Sep 29, 2026"
    # (CEPF, Gates Grand Challenges). Spaced ordinals "31 st August".
    ORD = r'(?:\s*(?:st|nd|rd|th))?'
    patterns = [
        # English
        rf'[Dd]eadline[:\s]+([A-Za-z]+ \d{{1,2}}{ORD},?\s*\d{{4}})',
        rf'[Dd]eadline[:\s]+(\d{{1,2}}{ORD}\s+[A-Za-z]+\s+\d{{4}})',
        rf'[Dd]eadline\s+is\s+(\d{{1,2}}{ORD}\s+[A-Za-z]+\s+\d{{4}})',
        rf'[Cc]loses?(?:\s+\w+,?)?\s+([A-Za-z]+ \d{{1,2}}{ORD},?\s+\d{{4}})',
        rf'[Cc]loses?(?:\s+\w+,?)?\s+(\d{{1,2}}{ORD}\s+[A-Za-z]+,?\s+\d{{4}})',
        # v2.4: month-day ranges "September 26-27, 2026" → END date
        r'([A-Za-z]+) (\d{1,2})\s*[–-]\s*(\d{1,2}),?\s*(\d{4})',
        # v2.2: fundsforNGOs feed style "Deadline: 18-Sep-26" / "18-Sep-2026"
        r'[Dd]eadline:?\s*(\d{1,2}-[A-Za-z]{3}-?\d{2,4})',
        r'(\d{1,2}-[A-Za-z]{3}-\d{2,4})',
        # v2.3: aggregator style "Application Deadline: 07 October 2026"
        rf'[Aa]pplication\s+[Dd]eadline:?\s*(\d{{1,2}}{ORD}\s+[A-Za-z]+,?\s+\d{{4}})',
        # v2.3: loose "deadline to submit your application is 19 June 2026"
        rf'[Dd]eadline[^.\n]{{0,60}}?(\d{{1,2}}{ORD}\s+[A-Za-z]+,?\s+\d{{4}})',
        r'[Cc]losing[:\s]+([A-Za-z]+ \d{1,2},?\s*\d{4})',
        r'[Cc]losing[:\s]+(\d{1,2}\s+[A-Za-z]+\s+\d{4})',
        r'[Aa]pplication\s+deadline[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
        # Portuguese
        r'[Dd]ata.limite[:\s]+(\d{2}/\d{2}/\d{4})',
        r'[Ii]nscrições até[:\s]+(\d{2}/\d{2}/\d{4})',
        r'[Pp]razo[:\s]+(\d{2}/\d{2}/\d{4})',
        r'[Ee]ncerramento[:\s]+(\d{2}/\d{2}/\d{4})',
        r'[Cc]onclusão[:\s]+(\d{2}/\d{2}/\d{4})',
        r'[Dd]ata.limite[:\s]+(\d{2}\.\d{2}\.\d{4})',
        r'[Pp]razo[:\s]+(\d{2}\.\d{2}\.\d{4})',
        # Spanish
        r'[Ff]echa.límite[:\s]+(\d{2}/\d{2}/\d{4})',
        r'[Cc]ierre[:\s]+(\d{2}/\d{2}/\d{4})',
        r'[Hh]asta.el[:\s]+(\d{2}/\d{2}/\d{4})',
        r'[Dd]ate.limite[:\s]+(\d{2}/\d{2}/\d{4})',
        r'[Ff]echa.límite[:\s]+([A-Za-z]+ \d{1,2},?\s*\d{4})',
        # French
        r'[Cc]lôture[:\s]+(\d{2}/\d{2}/\d{4})',
        r'[Aa]vant.le[:\s]+(\d{2}/\d{2}/\d{4})',
        r'[Dd]ate.limite[:\s]+(\d{2}/\d{2}/\d{4})',
        r'[Dd]ate.de.limite[:\s]+(\d{2}/\d{2}/\d{4})',
        r'[Aa]vant.le[:\s]+(\d{1,2}\s+[A-Za-z]+\s+\d{4})',
        # German
        r'[Ss]chluss[:\s]+(\d{2}\.\d{2}\.\d{4})',
        r'[Ee]inreichungsfrist[:\s]+(\d{2}\.\d{2}\.\d{4})',
        r'[Bb]ewerbungsfrist[:\s]+(\d{2}\.\d{2}\.\d{4})',
        # Italian
        r'[Ss]cadenza[:\s]+(\d{2}/\d{2}/\d{4})',
        r'[Tt]ermine[:\s]+(\d{2}/\d{2}/\d{4})',
        # ISO format
        r'(\d{4}-\d{2}-\d{2})',
        # DD/MM/YYYY (v2.3: also 2-digit years "31/08/26", 1-2 digit parts)
        r'(\d{1,2}/\d{1,2}/\d{2,4})',
        # DD.MM.YYYY
        r'(\d{2}\.\d{2}\.\d{4})',
        # Brazilian date with month name: "24 de abril de 2025"
        r'[Dd]ia\s+(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})',
        # Japanese (日本語)
        r'[Ss]himekiri[:\s]+(\d{4}/\d{2}/\d{2})',
        r'応募締切[:\s]*(\d{4}年\d{1,2}月\d{1,2}日)',
        r'締切[日]?[:\s]*(\d{4}年\d{1,2}月\d{1,2}日)',
        r'締切[日]?[:\s]*(\d{4}/\d{2}/\d{2})',
        r'募集期間.*?(\d{4}年\d{1,2}月\d{1,2}日)',
        # Chinese (中文)
        r'截止日期[:\s]*(\d{4}年\d{1,2}月\d{1,2}日)',
        r'申请截止[:\s]*(\d{4}年\d{1,2}月\d{1,2}日)',
        r'截止[日期]?[:\s]*(\d{4}年\d{1,2}月\d{1,2}日)',
        r'截止[日期]?[:\s]*(\d{4}/\d{2}/\d{2})',
        # Korean (한국어)
        r'마감[일]?[:\s]*(\d{4}년 \d{1,2}월 \d{1,2}일)',
        r'마감[일]?[:\s]*(\d{4}/\d{2}/\d{2})',
        r'신청마감[:\s]*(\d{4}/\d{2}/\d{2})',
        # Thai (ภาษาไทย)
        r'กำหนดเวลา[:\s]*(\d{1,2}\s+[A-Za-z]+\s+\d{4})',
        r'หมดเขต[:\s]*(\d{1,2}\s+[A-Za-z]+\s+\d{4})',
        # Generic Asian date formats
        r'(\d{4})年(\d{1,2})月(\d{1,2})日',
        r'(\d{4})년 (\d{1,2})월 (\d{1,2})일',
    ]
    for pat in patterns:
        m = re.search(pat, text)
        if m:
            d = m.group(0)
            # v2.4: month-day ranges "September 26-27, 2026" → END date
            rng = re.fullmatch(
                r'([A-Za-z]+) (\d{1,2})\s*[–-]\s*(\d{1,2}),?\s*(\d{4})',
                d.strip())
            if rng:
                en_mo = {"january":1,"jan":1,"february":2,"feb":2,"march":3,"mar":3,
                         "april":4,"apr":4,"may":5,"june":6,"jun":6,"july":7,"jul":7,
                         "august":8,"aug":8,"september":9,"sept":9,"sep":9,
                         "october":10,"oct":10,"november":11,"nov":11,
                         "december":12,"dec":12}
                mo = en_mo.get(rng.group(1).lower(), 0)
                if mo:
                    return f"{rng.group(4)}-{mo:02d}-{int(rng.group(3)):02d}"
            # Normalize CJK dates: "2024年12月31日" → "2024-12-31"
            cjk = re.search(r'(\d{4})[年년]\s*(\d{1,2})[月월]\s*(\d{1,2})[日일]', d)
            if cjk:
                return f"{cjk.group(1)}-{int(cjk.group(2)):02d}-{int(cjk.group(3)):02d}"
            # Handle "dia 24 de abril de 2025" pattern
            br_month = re.search(r'(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})', d)
            if br_month:
                month_map = {
                    "janeiro":1,"fevereiro":2,"março":3,"abril":4,"maio":5,"junho":6,
                    "julho":7,"agosto":8,"setembro":9,"outubro":10,"novembro":11,"dezembro":12,
                }
                day, month_name, year = br_month.group(1), br_month.group(2).lower(), br_month.group(3)
                mo = month_map.get(month_name, 0)
                if mo:
                    return f"{year}-{mo:02d}-{int(day):02d}"
            raw_m = m.group(1) if m.lastindex else m.group(0)
            # v2.3: slash dates are day-first outside the US ("31/08/26")
            return parse_date(raw_m, dayfirst=("/" in raw_m))
    return ""

def _hint_hit(text_lower: str, hint: str) -> bool:
    """Word-boundary hint match. Plain ``in`` matching caused false
    positives like 'lima' ⊂ 'climate' → Peru, so hints must stand alone."""
    h = (hint or "").strip().lower()
    if not h:
        return False
    return re.search(r'(?<![\w])' + re.escape(h) + r'(?![\w])', text_lower) is not None


def infer_country(text, lang):
    """Infer country/region from content text and language. Uses keyword matching with city/country hints."""
    text_lower = text.lower()
    regions = {
        # ── Europe ──
        "FR": ["france","paris","marseille","lyon","toulouse","hexagone","outre-mer","république française","français","francophone"],
        "ES": ["españa","madrid","barcelona","valencia","andalucía","reino de españa","español"],
        "DE": ["deutschland","germany","berlin","munich","hamburg","köln","frankfurt","deutsch"],
        "IT": ["italia","italy","roma","rome","milano","milan","napoli","naples","italiano"],
        "PT": ["portugal","lisboa","lisbon","porto","português","lusófono"],
        "NL": ["netherlands","holland","amsterdam","rotterdam","dutch","nederland"],
        "BE": ["belgium","belgique","belgië","brussels","bruxelles","brugge"],
        "CH": ["switzerland","schweiz","suisse","zürich","geneva","genève","basel"],
        "AT": ["austria","österreich","wien","vienna","graz"],
        "PL": ["poland","polska","warsaw","warszawa","kraków"],
        "CZ": ["czech","czechia","česko","prague","praha"],
        "HU": ["hungary","magyarország","budapest"],
        "RO": ["romania","românia","bucharest","bucurești"],
        "BG": ["bulgaria","bulgária","sofia"],
        "GR": ["greece","elláda","athens","athína"],
        "IE": ["ireland","éire","dublin","baile átha cliath"],
        "GB": ["united kingdom","great britain","britain","england","scotland","wales","london","manchester","birmingham"],
        # ── Nordic ──
        "SE": ["sweden","sverige","stockholm","göteborg"],
        "NO": ["norway","norge","noreg","oslo","bergen"],
        "DK": ["denmark","danmark","copenhagen","københavn"],
        "FI": ["finland","suomi","helsinki","turku"],
        "IS": ["iceland","ísland","reykjavik"],
        # ── Americas ──
        "US": ["united states","usa","u.s.a","washington d.c","new york","california","texas","florida"],
        "CA": ["canada","canadian","toronto","vancouver","montreal","ottawa","british columbia"],
        "BR": ["brasil","brazil","são paulo","sao paulo","rio de janeiro","brasília","brasilia","belo horizonte","salvador","fortaleza","curitiba","manaus","belém","recife","porto alegre","goiânia","guarulhos","campinas","são luís","natal"," João Pessoa","aracaju","campo grande","florianópolis","vitória","londrina","maringá","foz do iguacu"],
        "AR": ["argentina","buenos aires","córdoba","cordoba","rosario","mendoza"],
        "MX": ["méxico","méjico","ciudad de méxico","guadalajara","monterrey","puebla","tijuana"],
        "CO": ["colombia","bogotá","bogota","medellín","medellin","cali","barranquilla"],
        "PE": ["perú","peru","lima","arequipa","cusco","trujillo"],
        "CL": ["chile","santiago","valparaíso","valparaiso","concepción"],
        "EC": ["ecuador","quito","guayaquil"],
        "VE": ["venezuela","caracas","maracaibo","valencia"],
        "BO": ["bolivia","la paz","santa cruz","cochabamba"],
        "PY": ["paraguay","asunción","asuncion"],
        "UY": ["uruguay","montevideo"],
        "CR": ["costa rica","san josé","san jose"],
        "PA": ["panamá","panama","ciudad de panamá"],
        "GT": ["guatemala","guatemala city"],
        "CU": ["cuba","habana","havana"],
        # ── Africa ──
        "NG": ["nigeria","lagos","abuja","kano","ibadan"],
        "KE": ["kenya","nairobi","mombasa","kisumu"],
        "GH": ["ghana","accra","kumasi","tema"],
        "ZA": ["south africa","áfrica do sul","johannesburg","cape town","durban","pretoria","south african"],
        "TZ": ["tanzania","dar es salaam","dodoma","arusha"],
        "ET": ["ethiopia","ethiopia","addis ababa","adís Abeba"],
        "SN": ["senegal","dakar","thiès","saint-louis"],
        "MZ": ["mozambique","maputo","beira"],
        "AO": ["angola","luanda","huambo","lobito"],
        "CD": ["congo","kinshasa","lubumbashi"],
        "CM": ["cameroon","yaoundé","douala"],
        "CI": ["côte d'ivoire","ivoire","abidjan","yamoussoukro"],
        "MG": ["madagascar","antananarivo"],
        "RW": ["rwanda","kigali"],
        "UG": ["uganda","kampala"],
        "MW": ["malawi","lilongwe"],
        "ZM": ["zambia","lusaka"],
        "ZW": ["zimbabwe","harare"],
        "BF": ["burkina faso","ouagadougou"],
        "ML": ["mali","bamako"],
        "NE": ["niger","niamey"],
        "TD": ["chad","ndjamena"],
        "GN": ["guinea","conakry"],
        "SL": ["sierra leone","freetown"],
        "LR": ["liberia","monrovia"],
        "GM": ["gambia","banjul"],
        "BJ": ["benin","porto-novo"],
        "TG": ["togo","lomé"],
        "GA": ["gabon","libreville"],
        "CG": ["congo","brazzaville"],
        "BW": ["botswana","gaborone"],
        "NA": ["namibia","windhoek"],
        "LS": ["lesotho","maseru"],
        "SZ": ["eswatini","mbabane"],
        "MU": ["mauritius","port louis"],
        "CV": ["cabo verde","cape verde","praia"],
        "ST": ["são tomé","sao tome"],
        # ── Middle East ──
        "TR": ["turkey","türkiye","istanbul","ankara","izmir"],
        "IL": ["israel","tel aviv","jerusalem","haifa"],
        "AE": ["united arab emirates","uae","dubai","abu dhabi"],
        "SA": ["saudi arabia","riyadh","jeddah"],
        "QA": ["qatar","doha"],
        "JO": ["jordan","amman"],
        "LB": ["lebanon","beirut"],
        "EG": ["egypt","cairo","alexandria"],
        "MA": ["morocco","maroc","casablanca","rabat","marrakech"],
        "TN": ["tunisia","tunis"],
        "DZ": ["algeria","algiers","alger"],
        # ── Asia ──
        "JP": ["japan","japon","tóquio","tokyo","nihon","nippon","日本語","東京","日本"],
        "CN": ["china","chine","beijing","shanghai","中文","中国","chinese","guangzhou","shenzhen","hangzhou"],
        "KR": ["korea","seoul","한국","korean","busan","인천"],
        "IN": ["india","mumbai","delhi","bangalore","bengaluru","new delhi","hindi","chennai","kolkata","pune","hyderabad"],
        "TH": ["thailand","thai","bangkok","กรุงเทพ","chiang mai"],
        "VN": ["vietnam","vietnã","hanoi","ho chi minh","da nang"],
        "ID": ["indonesia","jakarta","indonesian","surabaya","bandung","bali"],
        "PH": ["philippines","manila","filipinas","cebu","davao"],
        "TW": ["taiwan","taipei","taipé"],
        "MY": ["malaysia","kuala lumpur","penang","johor"],
        "SG": ["singapore","singapura","cingapura"],
        "PK": ["pakistan","islamabad","karachi","punjab","lahore"],
        "BD": ["bangladesh","dhaka","chittagong"],
        "NP": ["nepal","kathmandu","himalaya"],
        "LK": ["sri lanka","colombo","ceylon"],
        "MM": ["myanmar","burma","yangon","rangoon"],
        "KH": ["cambodia","camboja","phnom penh"],
        "LA": ["laos","vientiane"],
        "MN": ["mongolia","ulaanbaatar"],
        "KZ": ["kazakhstan","almaty","astana"],
        "UZ": ["uzbekistan","tashkent"],
        # ── Oceania ──
        "AU": ["australia","sydney","melbourne","brisbane","perth","adelaide","canberra"],
        "NZ": ["new zealand","aotearoa","wellington","auckland","christchurch"],
        "FJ": ["fiji","suva"],
        "PG": ["papua new guinea","port moresby"],
        "WS": ["samoa","apia"],
        "TO": ["tonga","nuku'alofa"],
        "VU": ["vanuatu","port vila"],
        "SB": ["solomon islands","honiara"],
        "CK": ["cook islands","rarotonga"],
        "NR": ["nauru","yaren"],
        "TV": ["tuvalu","funafuti"],
        "KI": ["kiribati","tarawa"],
        "MH": ["marshall islands","majuro"],
        "FM": ["micronesia","palikir"],
        "PW": ["palau","ngerulmud"],
        # ── Regions ──
        "EU": ["europe","europa","european union","union européenne","unión europea","portugal","spain","france","italy","germany","netherlands","sweden","european"],
        "LATAM": ["américa latina","latin america","amérique latine","latinoamérica","brasil","brazil","latinoamericano"],
        "AFRICA": ["áfrica","afrique","africa","kenya","nigeria","senegal","ghana","tanzania","ethiopia","mozambique","angola","african","africain"],
        "ASIA": ["asia","asien","asie","asía","アジア","아시아","एशिया","เอเชีย","asia tenggara","asian"],
        "OCEANIA": ["oceania","pacific","pacifico","pacifique","oceânico"],
    }
    # Language-based defaults
    if lang == "pt": return "BR"
    if lang == "fr": return "FR" if _hint_hit(text_lower, "france") else "EU"
    if lang == "es":
        for country, hints in regions.items():
            if any(_hint_hit(text_lower, h) for h in hints):
                return country
        return "LATAM"
    if lang == "zh": return "CN" if "中国" in text_lower else "ASIA"
    if lang == "ja": return "JP" if "日本" in text_lower else "ASIA"
    if lang in ("ko","kr"): return "KR"
    if lang == "hi": return "IN"
    if lang == "th": return "TH"
    if lang == "id": return "ID"
    if lang == "vi": return "VN"
    if lang == "de": return "DE"
    if lang == "it": return "IT"
    if lang == "nl": return "NL"
    if lang == "pl": return "PL"
    if lang == "tr": return "TR"
    if lang == "ar": return "EG"  # Default Arabic to Egypt
    # General region check for any language — try specific countries first
    for country, hints in regions.items():
        if country in ("EU","LATAM","AFRICA","ASIA","OCEANIA"):
            continue  # Skip regions for now, check specific countries first
        if any(_hint_hit(text_lower, h) for h in hints):
            return country
    # Fall back to regions
    for country, hints in regions.items():
        if country not in ("EU","LATAM","AFRICA","ASIA","OCEANIA"):
            continue
        if any(_hint_hit(text_lower, h) for h in hints):
            return country
    return "GLOBAL"


# ──────────────────────────────────────────────────────────────
# SCOPE DETECTION v2.5 — who can actually apply?
# ──────────────────────────────────────────────────────────────
# Generic aggregators hardcode country="GLOBAL", which buried clearly
# scoped calls like "… Grant Program (Uganda)" or "for entities based
# in Canada". infer_scope_country() re-scopes those with HIGH-PRECISION
# signals only: title parentheticals, based-in/registered-in captures,
# and eligibility/priority sentences. A passing mention with no
# eligibility trigger never re-scopes ("working in Africa, Asia…"
# stays GLOBAL). Curated standing entries are exempt (see make_grant).
#
# Returns an ISO-ish country code, a region bucket (AFRICA/ASIA/EU/
# EUROPE/LATAM/NORTH_AMERICA/OCEANIA), or "GLOBAL".

COUNTRY_ALIASES = {
    # ── Explicitly worldwide (keeps GLOBAL when eligibility says so) ──
    "worldwide": "GLOBAL", "global": "GLOBAL", "international": "GLOBAL",
    "around the world": "GLOBAL", "across the globe": "GLOBAL",
    # ── Region buckets ──
    "africa": "AFRICA", "african": "AFRICA", "sub-saharan africa": "AFRICA",
    "asia": "ASIA", "asian": "ASIA", "southeast asia": "ASIA",
    "south-east asia": "ASIA", "south asia": "ASIA", "east asia": "ASIA",
    "europe": "EUROPE", "european": "EUROPE", "european union": "EU",
    "latin america": "LATAM", "latinoamerica": "LATAM", "latinoamérica": "LATAM",
    "amérique latine": "LATAM", "south america": "LATAM",
    "central america": "LATAM", "caribbean": "LATAM",
    "north america": "NORTH_AMERICA",
    "oceania": "OCEANIA", "pacific": "OCEANIA", "pacific islands": "OCEANIA",
    # ── North America ──
    "united states": "US", "united states of america": "US", "usa": "US",
    "u.s.a": "US", "u.s.": "US",
    "canada": "CA", "canadian": "CA", "british columbia": "CA",
    "district of columbia": "US", "washington d.c.": "US",
    "mexico": "MX", "méxico": "MX", "mexican": "MX",
    "guatemala": "GT", "honduras": "HN", "el salvador": "SV", "salvadoran": "SV",
    "nicaragua": "NI", "costa rica": "CR", "panama": "PA", "panamá": "PA",
    "cuba": "CU", "cuban": "CU",
    "dominican republic": "DO", "haiti": "HT", "haitian": "HT",
    "jamaica": "JM", "jamaican": "JM", "puerto rico": "PR",
    "trinidad and tobago": "TT",
    # ── South America ──
    "brazil": "BR", "brasil": "BR", "brazilian": "BR", "brasileiro": "BR",
    "argentina": "AR", "argentinian": "AR", "argentine": "AR",
    "colombia": "CO", "colombian": "CO",
    "peru": "PE", "perú": "PE", "peruvian": "PE",
    "chile": "CL", "chilean": "CL",
    "ecuador": "EC", "ecuadorian": "EC", "ecuadorean": "EC",
    "venezuela": "VE", "venezuelan": "VE",
    "bolivia": "BO", "bolivian": "BO",
    "paraguay": "PY", "paraguayan": "PY",
    "uruguay": "UY", "uruguayan": "UY",
    "guyana": "GY", "suriname": "SR",
    # ── Europe ──
    "united kingdom": "GB", "great britain": "GB", "britain": "GB",
    "england": "GB", "scotland": "GB", "wales": "GB", "british": "GB",
    "ireland": "IE", "irish": "IE",
    "france": "FR", "french": "FR",
    "spain": "ES", "españa": "ES", "spanish": "ES",
    "germany": "DE", "deutschland": "DE", "german": "DE",
    "italy": "IT", "italia": "IT", "italian": "IT",
    "portugal": "PT", "portuguese": "PT",
    "netherlands": "NL", "holland": "NL", "dutch": "NL",
    "belgium": "BE", "belgian": "BE",
    "switzerland": "CH", "swiss": "CH",
    "austria": "AT", "austrian": "AT",
    "poland": "PL", "polish": "PL",
    "sweden": "SE", "swedish": "SE",
    "norway": "NO", "norwegian": "NO",
    "denmark": "DK", "danish": "DK",
    "finland": "FI", "finnish": "FI",
    "iceland": "IS", "icelandic": "IS",
    "greece": "GR", "greek": "GR",
    "ukraine": "UA", "ukrainian": "UA",
    "romania": "RO", "romanian": "RO",
    "hungary": "HU", "hungarian": "HU",
    "czech republic": "CZ", "czechia": "CZ", "czech": "CZ",
    # ── Africa ──
    "south africa": "ZA", "south african": "ZA",
    "nigeria": "NG", "nigerian": "NG",
    "kenya": "KE", "kenyan": "KE",
    "ghana": "GH", "ghanaian": "GH",
    "uganda": "UG", "ugandan": "UG",
    "tanzania": "TZ", "tanzanian": "TZ",
    "ethiopia": "ET", "ethiopian": "ET",
    "senegal": "SN", "senegalese": "SN",
    "rwanda": "RW", "rwandan": "RW",
    "mozambique": "MZ", "mozambican": "MZ",
    "angola": "AO", "angolan": "AO",
    "cameroon": "CM", "cameroun": "CM", "cameroonian": "CM",
    "madagascar": "MG", "malagasy": "MG",
    "zimbabwe": "ZW", "zimbabwean": "ZW",
    "zambia": "ZM", "zambian": "ZM",
    "malawi": "MW", "malawian": "MW",
    "mali": "ML", "malian": "ML",
    "burkina faso": "BF", "burkinabe": "BF",
    "niger": "NE",
    "chad": "TD", "chadian": "TD",
    "sierra leone": "SL", "liberia": "LR", "liberian": "LR",
    "guinea": "GN", "guinean": "GN", "guinea-conakry": "GN",
    "guinea-bissau": "GW", "equatorial guinea": "GQ",
    "côte d'ivoire": "CI", "cote d'ivoire": "CI", "ivory coast": "CI",
    "ivoirian": "CI", "ivoirien": "CI",
    "togo": "TG", "togolese": "TG",
    "benin": "BJ", "beninese": "BJ",
    "gabon": "GA", "gabonese": "GA",
    "democratic republic of congo": "CD", "drc": "CD",
    "republic of congo": "CG", "congo-brazzaville": "CG",
    "botswana": "BW", "namibia": "NA", "namibian": "NA",
    "morocco": "MA", "moroccan": "MA", "maroc": "MA",
    "tunisia": "TN", "tunisian": "TN",
    "algeria": "DZ", "algerian": "DZ",
    "egypt": "EG", "egyptian": "EG",
    "mauritius": "MU", "mauritian": "MU",
    "cape verde": "CV", "cabo verde": "CV",
    # ── Middle East (UN Western Asia; dashboard maps to Asia) ──
    "turkey": "TR", "türkiye": "TR", "turkish": "TR",
    "israel": "IL", "israeli": "IL",
    "united arab emirates": "AE", "uae": "AE", "emirati": "AE",
    "saudi arabia": "SA", "saudi": "SA",
    "qatar": "QA", "qatari": "QA",
    "jordan": "JO", "jordanian": "JO",
    "lebanon": "LB", "lebanese": "LB",
    # ── Asia ──
    "japan": "JP", "japanese": "JP",
    "china": "CN", "chinese": "CN",
    "south korea": "KR", "korea": "KR", "korean": "KR",
    "india": "IN", "indian": "IN",
    "thailand": "TH", "thai": "TH",
    "vietnam": "VN", "vietnamese": "VN",
    "indonesia": "ID", "indonesian": "ID",
    "philippines": "PH", "filipino": "PH", "philippine": "PH",
    "taiwan": "TW", "taiwanese": "TW",
    "malaysia": "MY", "malaysian": "MY",
    "singapore": "SG", "singaporean": "SG",
    "pakistan": "PK", "pakistani": "PK",
    "bangladesh": "BD", "bangladeshi": "BD",
    "nepal": "NP", "nepalese": "NP", "nepali": "NP",
    "sri lanka": "LK", "sri lankan": "LK",
    "myanmar": "MM", "burma": "MM", "burmese": "MM",
    "cambodia": "KH", "cambodian": "KH",
    "laos": "LA", "laotian": "LA",
    "mongolia": "MN", "mongolian": "MN",
    "kazakhstan": "KZ", "kazakh": "KZ",
    "uzbekistan": "UZ", "uzbek": "UZ",
    # ── Oceania ──
    "australia": "AU", "australian": "AU",
    "new zealand": "NZ", "aotearoa": "NZ",
    "fiji": "FJ", "fijian": "FJ",
    "papua new guinea": "PG", "samoa": "WS", "samoan": "WS",
}

# Longest-alias-first so "south africa" beats "africa",
# "sri lanka" beats "lanka", "costa rica" beats "rica".
_ALIASES_SORTED = sorted(COUNTRY_ALIASES.items(), key=lambda kv: -len(kv[0]))

# Eligibility / residency / priority triggers (EN + PT + ES + FR).
# A country name only re-scopes a grant when it shares a sentence with
# one of these — passing mentions never re-scope.
_SCOPE_TRIGGER_RE = re.compile(
    r'(eligib|éligib|eleg[ií]v|open to|applications?(?: are)? (?:open|invited)|'
    r'calling for|must be|should be|based in|registered in|incorporated in|'
    r'located in|headquarter|residen|living in|domiciled|citizens?|nationals?|'
    r'priority|preference|preferred|giving priority|focus(?:es|ed|ing)? on|'
    r'target(?:s|ed|ing)?|exclusively|only (?:open|available|eligible)|'
    r'restricted to|limited to|'
    # PT: com sede em, sediadas em, registrada no, abertas a/para, prioridade, destinadas a
    r'com sede em|sediad|registrad|domiciliad|eleg[ií]ve|'
    r'abert[oa]s?(?: a| para)|prioridade|priorit[áa]ri|destinad[oa]s?(?: a| para)|foco em|'
    # ES: con sede en, radicadas en, abiertas, prioridad, destinadas a
    r'con sede en|radicad|abiert[oa]s?|prioridad|prioritari|destinad[oa]s?|enfoque en|'
    # FR: siège à/en, établi(e) en, ouvert aux, priorité, destiné aux
    r'si[eè]ge [aàe]|ouvert(?:s|es)? aux|priorit[ée]|destin[ée]e?s? aux?)',
    re.I,
)

# Strong standalone captures (checked over the whole blob, not per sentence).
_BASED_IN_RE = re.compile(
    r'\b(?:based|registered|incorporated|located|headquartered|situated|'
    r'operating|working|living|residing)\s+(?:in|within)\s+'
    r"([A-Za-zÀ-Þ][\w .'\-–—]{1,48})",
    re.I,
)
_HYPHEN_BASED_RE = re.compile(
    r'\bfor\s+([A-Za-zÀ-Þ][\w.\-]*?)[-\s]based\b', re.I,
)
_CITIZEN_OF_RE = re.compile(
    r'\b(?:citizens?|residents?|nationals?)\s+of\s+'
    r"([A-Za-zÀ-Þ][\w .'\-–—]{1,48})",
    re.I,
)
_TITLE_PAREN_RE = re.compile(r'\(\s*([^()]{2,60}?)\s*\)')


def _normalize_scope_text(s: str) -> str:
    return ((s or "").lower().replace("’", "'").replace("‘", "'")
            .replace("´", "'").replace("\xa0", " ").strip())


def _lookup_country_alias(fragment: str) -> str:
    """Longest-match alias lookup. Returns code/bucket or ''."""
    frag = _normalize_scope_text(fragment)
    if not frag:
        return ""
    if frag in COUNTRY_ALIASES:
        return COUNTRY_ALIASES[frag]
    for alias, code in _ALIASES_SORTED:
        if len(alias) < 3:
            continue
        if re.search(r'(?<![\w])' + re.escape(alias) + r'(?![\w])', frag):
            return code
    return ""


def infer_scope_country(title: str, description: str = "",
                        language: str = "en", default: str = "GLOBAL") -> str:
    """Re-scope a GLOBAL grant to the country/region that can actually apply.

    Signal order (highest precision first):
      1. Title parenthetical — "… Grant Program (Uganda)" → UG.
      2. "for X-based …" hyphen form — "for Uganda-based NGOs" → UG.
      3. based-in / citizen-of captures — "entities based in Canada" → CA.
      4. Eligibility/priority sentences — "open to NGOs in Kenya …",
         "priority to groups in the Pacific …", "sediadas no Brasil" → BR.
      5. Fallback to infer_country() (legacy keyword scan).
    """
    title = title or ""
    description = description or ""
    blob = f"{title} {description}"
    # 1. Title parentheticals (trailing first — the scope slot).
    parens = _TITLE_PAREN_RE.findall(title)
    for par in reversed(parens):
        code = _lookup_country_alias(par)
        if code:
            return code
    # 2. "for X-based" hyphen form.
    m = _HYPHEN_BASED_RE.search(blob)
    if m:
        code = _lookup_country_alias(m.group(1))
        if code and code != "GLOBAL":
            return code
    # 3. based-in / citizen-of captures.
    for rx in (_BASED_IN_RE, _CITIZEN_OF_RE):
        m = rx.search(blob)
        if m:
            code = _lookup_country_alias(m.group(1))
            if code and code != "GLOBAL":
                return code
    # 4. Trigger sentences: country must share a sentence with an
    #    eligibility / residency / priority trigger.
    for sent in re.split(r'[.!?;\n]+|\s\|\s', blob):
        if not _SCOPE_TRIGGER_RE.search(sent):
            continue
        code = _lookup_country_alias(sent)
        if code:
            return code
    # 5. Legacy fallback — but a blob naming 2+ distinct world regions
    # ("…youth-led groups in Latin America, Africa, Asia") is worldwide,
    # not whatever region matched first. Single-region/country fallbacks
    # still re-scope.
    try:
        fb = infer_country(blob, language or "en")
    except (ValueError, AttributeError, TypeError):
        fb = ""
    _REGION_BUCKETS = frozenset(
        {"AFRICA", "ASIA", "EUROPE", "EU", "LATAM", "NORTH_AMERICA", "OCEANIA"})
    if fb in _REGION_BUCKETS:
        low = blob.lower()
        seen: set = set()
        for alias, code in COUNTRY_ALIASES.items():
            if code not in _REGION_BUCKETS:
                continue
            if _hint_hit(low, alias):
                seen.add("EUROPE" if code == "EU" else code)
            if len(seen) >= 2:
                return default
    return fb or default


# ══════════════════════════════════════════════════════════════
#  ── BRAZIL ──────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════

async def fetch_capta(session):
    """ISPN/Capta — primary Brazilian socio-environmental grants hub."""
    grants = []
    SOURCE, BASE = "capta.org.br", "https://capta.org.br"
    # Fetch all pages from WP API (36 total posts, 100 per page = 1 page)
    for page in range(1, 2):
        api = f"{BASE}/wp-json/wp/v2/posts?per_page=100&page={page}"
        data = await fetch_json(session, api)
        if not data or not isinstance(data, list): break
        for p in data:
            title   = clean_html(p.get("title", {}).get("rendered", ""))
            content = clean_html(p.get("content", {}).get("rendered", ""))
            url     = p.get("link", "")
            # Relevance filter — skip generic blog posts, keep grant/opportunity content
            if not is_scrape_hit(title, content):
                continue
            # Detect open/closed from WP post content
            raw_content = p.get("content", {}).get("rendered", "")
            status = detect_status_from_text(raw_content) or "open"
            grants.append(make_grant(title=title, source_name=SOURCE, url=url,
                description=content[:MAX_DESCRIPTION_LEN], country="BR", language="pt",
                deadline=extract_deadline(content), status=status,
                amount_max=extract_amount(content)))
    console.print(f"  [cyan]capta.org.br[/] → {len(grants)} ({sum(1 for g in grants if g['status']=='open')} open)")
    return grants


async def fetch_prosas(session):
    """Prosas.com.br — largest Brazilian CSO grants aggregator."""
    grants = []
    SOURCE = "prosas.com.br"
    urls = [
        "https://prosas.com.br/editais",
        "https://prosas.com.br/editais?abertos=1",
        "https://prosas.com.br/",
    ]
    for url in urls:
        html = await fetch(session, url, use_cache=False)
        if not html: continue
        soup = BeautifulSoup(html, "lxml")
        found = 0
        for selector in ["[class*='edital']", "[class*='card']", "article", "[class*='oportunidade']", "[class*='chamada']", "[class*='item']"]:
            for card in soup.select(selector):
                a = card.find("a", href=True)
                t = card.find(["h2","h3","h4","h5"])
                if not t: continue
                title = t.get_text(strip=True)
                if len(title) < 10: continue
                # Relevance filter
                if not is_scrape_hit(title, text):
                    continue
                link = urljoin("https://prosas.com.br", a["href"]) if a else ""
                text = card.get_text(" ")
                # Detect open/closed from card text and URL
                card_lower = text.lower()
                url_has_abertos = "abertos=1" in url
                status = detect_status_from_text(text)
                if not status:
                    if url_has_abertos:
                        status = "open"
                    else:
                        status = "open"  # Default when no signal
                grants.append(make_grant(title=title, source_name=SOURCE, url=link,
                    description=text[:MAX_DESCRIPTION_LEN], country="BR", language="pt",
                    deadline=extract_deadline(text), amount_max=extract_amount(text),
                    status=status))
                found += 1
            if found: break
        if found: break
    console.print(f"  [cyan]prosas.com.br[/] → {len(grants)} ({sum(1 for g in grants if g['status']=='open')} open)")
    return grants


async def fetch_casa(session):
    """Fundo Casa Socioambiental — key Brazilian env/indigenous fund.

    Strategy: Parse the /chamadas/ archive page which lists ALL chamadas
    (open + closed) in one page. Each card is an <a class="grid-item chamada">
    with a <span class="grid-note"> badge showing "Abertas" or "Encerradas".
    Also fetches individual chamada pages to extract deadlines and amounts.
    """
    grants = []
    SOURCE, BASE = "casa.org.br", "https://casa.org.br"

    # --- Primary: parse /chamadas/ archive page ---
    html = await fetch(session, f"{BASE}/chamadas/")
    if html:
        soup = BeautifulSoup(html, "lxml")
        cards = soup.select("a.grid-item.chamada")
        # Determine status from parent container or badge
        open_section = None
        closed_section = None
        for div in soup.select("div.row.flexbox.chamadas"):
            classes = div.get("class", [])
            if "encerradas" in classes:
                closed_section = div
            else:
                open_section = div

        # Collect card data first
        card_data = []
        for card in cards:
            title = (card.get("title") or "").strip()
            if not title:
                h2 = card.select_one("h2.listHeader")
                title = h2.get_text(strip=True) if h2 else ""
            if not title:
                continue
            url = urljoin(BASE, card.get("href", ""))
            badge = card.select_one("span.grid-note")
            badge_text = badge.get_text(strip=True) if badge else ""
            status = detect_status_from_badge(badge_text)
            if not status:
                parent = card.parent
                parent_classes = parent.get("class", []) if parent else []
                status = detect_status_from_parent(parent_classes) or "open"
            card_data.append({"title": title, "url": url, "status": status, "text": card.get_text(" ")})

        # Fetch detail pages for open chamadas to get real data
        for cd in card_data:
            detail_text = cd["text"]
            deadline = extract_deadline(detail_text)
            amount = extract_amount(detail_text)
            description = detail_text[:MAX_DESCRIPTION_LEN]

            if cd["status"] == "open" and cd["url"]:
                detail = await fetch(session, cd["url"])
                if detail:
                    dsoup = BeautifulSoup(detail, "lxml")
                    body = dsoup.select_one(".entry-content, .post-content, article, .et_pb_section")
                    full_text = body.get_text(" ") if body else dsoup.get_text(" ")

                    dl = extract_deadline(full_text)
                    if dl: deadline = dl
                    amt = extract_amount(full_text)
                    if amt: amount = amt

                    # Build richer description
                    content_parts = []
                    for p in dsoup.select("p, li"):
                        pt = p.get_text(strip=True)
                        if len(pt) > 30 and any(kw in pt.lower() for kw in [
                            "prazo", "inscri", "valor", "limite", "data", "edital",
                            "requisit", "elegib", "critéri", "seleção", "etapa",
                            "document", "comprovant", "camp", "área", "temática",
                            "finalidade", "objetivo", "apoio", "fundo", "recurso",
                        ]):
                            content_parts.append(pt)
                    if content_parts:
                        description = " | ".join(content_parts[:8])[:MAX_DESCRIPTION_LEN]

            grants.append(make_grant(
                title=cd["title"], source_name=SOURCE, url=cd["url"],
                description=description, deadline=deadline, amount_max=amount,
                country="BR", language="pt",
                funder="Fundo Casa Socioambiental", status=cd["status"],
            ))

    # --- Fallback: WP REST API (only if HTML scraping returned nothing) ---
    if not grants:
        data = await fetch_json(session, f"{BASE}/wp-json/wp/v2/posts?per_page=80&_embed=true")
        if data and isinstance(data, list):
            for p in data:
                title   = clean_html(p.get("title",{}).get("rendered",""))
                content = clean_html(p.get("content",{}).get("rendered",""))
                url     = p.get("link","")
                if not is_scrape_hit(title, content):
                    continue
                raw_content = p.get("content",{}).get("rendered","")
                status = detect_status_from_text(raw_content) or "open"
                grants.append(make_grant(title=title, source_name=SOURCE, url=url,
                    description=content[:MAX_DESCRIPTION_LEN], country="BR", language="pt",
                    funder="Fundo Casa Socioambiental",
                    deadline=extract_deadline(content), status=status))

    console.print(f"  [cyan]casa.org.br[/] → {len(grants)} ({sum(1 for g in grants if g['status']=='open')} open, {sum(1 for g in grants if g['status']=='closed')} closed)")
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
            if not is_scrape_hit(title, content):
                continue
            # Detect open/closed from WP post content
            raw_content = p.get("content",{}).get("rendered","")
            status = detect_status_from_text(raw_content) or "open"
            grants.append(make_grant(title=title, source_name=SOURCE, url=url,
                description=content[:MAX_DESCRIPTION_LEN], country="BR", language="pt",
                funder="ISPN", deadline=extract_deadline(content), status=status,
                amount_max=extract_amount(content)))
    console.print(f"  [cyan]ispn.org.br[/] → {len(grants)} ({sum(1 for g in grants if g['status']=='open')} open)")
    return grants


async def fetch_fundobrasil(session):
    """Fundo Brasil de Direitos Humanos — fetch listing pages + detail pages for real data."""
    grants = []
    SOURCE = "fundobrasil.org.br"
    BASE = "https://www.fundobrasil.org.br"
    seen = set()

    # Try primary listing URL
    list_urls = [
        f"{BASE}/editais/",
        f"{BASE}/nosso-trabalho/apoio-a-sociedade-civil/editais-gerais-e-especificos/",
        f"{BASE}/nosso-trabalho/apoio-a-sociedade-civil/editais-gerais-e-especificos/editais-especificos/",
        # Also try WP API as fallback
        f"{BASE}/wp-json/wp/v2/posts?per_page=100&_embed=true&categories=68",
    ]

    edital_links = []
    for url in list_urls:
        html = await fetch(session, url)
        if not html: continue
        soup = BeautifulSoup(html, "lxml")
        # Find all edital links via multiple strategies
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if "/edital/" not in href: continue
            edital_url = urljoin(BASE, href)
            if edital_url not in seen:
                seen.add(edital_url)
                edital_links.append(edital_url)
        # Also try finding in div/post content
        for article in soup.select("article, .post, .card, [class*='edital'], li"):
            a = article.find("a", href=True)
            if a and "/edital/" in a["href"]:
                edital_url = urljoin(BASE, a["href"])
                if edital_url not in seen:
                    seen.add(edital_url)
                    edital_links.append(edital_url)
        if edital_links:
            break  # Found links, skip remaining URLs

    if not edital_links:
        console.print(f"  [yellow]fundobrasil.org.br[/] — no edital links found (site may be blocking)")
        return grants

    # Now fetch each edital detail page for real data
    for edital_url in edital_links:
        detail = await fetch(session, edital_url)
        if not detail:
            # Still add as minimal entry
            grants.append(make_grant(
                title=f"Edital (unavailable — {edital_url.split('/')[-1]})",
                source_name=SOURCE, url=edital_url,
                description="", country="BR", language="pt",
                funder="Fundo Brasil de Direitos Humanos", status="unknown",
            ))
            continue

        dsoup = BeautifulSoup(detail, "lxml")
        detail_text = dsoup.get_text(" ", strip=True)

        # Extract title from <h1> or <title>
        title = ""
        h1 = dsoup.find("h1")
        if h1:
            title = h1.get_text(strip=True)
        if not title:
            title_tag = dsoup.find("title")
            if title_tag:
                title = title_tag.get_text(strip=True).split("|")[0].strip()

        # Extract status: "Encerrado" / "Aberto"
        status = "unknown"
        # Look for Status label first
        status_section = re.search(r'(?:Status|Situação)\s*:?\s*(\w+)', detail_text, re.I)
        if status_section:
            s = status_section.group(1).lower()
            status = detect_status_from_text(s)
        if not status or status == "unknown":
            # Fall back to full text detection
            status = detect_status_from_text(detail_text) or "unknown"

        # Extract deadline
        deadline = extract_deadline(detail_text)
        # Look for RESULTADO A PARTIR DE date
        if not deadline:
            resultado = re.search(r'RESULTADO A PARTIR DE[:\s]+(\d{1,2})[°º\s]+(?:de\s+)?(\w+)(?:\s+de\s+)?(\d{4})', detail_text, re.I)
            if resultado:
                month_map = {
                    "janeiro":1,"fevereiro":2,"março":3,"abril":4,"maio":5,"junho":6,
                    "julho":7,"agosto":8,"setembro":9,"outubro":10,"novembro":11,"dezembro":12,
                }
                day, month_name, year = resultado.group(1), resultado.group(2).lower(), resultado.group(3)
                mo = month_map.get(month_name, 0)
                if mo:
                    deadline = f"{year}-{mo:02d}-{int(day):02d}"

        # Extract amount
        amount = extract_amount(detail_text)
        if not amount:
            amt_range = re.search(r'(?:valor|investimento|orçamento|custeio)[^:]*:\s*R?\$?\s*([\d.]+\s*(?:a|,|-|até)\s*R?\$?\s*[\d.]+)', detail_text, re.I)
            if amt_range:
                amount = f"R$ {amt_range.group(1)}"

        # Build better description from key sections
        content_parts = []
        for selector in [".entry-content", "article", "main", ".post-content", ".et_pb_section"]:
            body = dsoup.select_one(selector)
            if body:
                for p in body.select("p, li, h2, h3, h4"):
                    pt = p.get_text(strip=True)
                    if len(pt) > 30:
                        content_parts.append(pt)
                break
        if not content_parts:
            content_parts.append(detail_text[:600])

        description = " | ".join(content_parts[:10])[:MAX_DESCRIPTION_LEN]

        # Detect categories from content
        detail_lower = detail_text.lower()
        cats = ["human rights", "Brazil"]
        if any(w in detail_lower for w in ["ambiental", "clima", "socioambiental", "natureza"]):
            cats.append("environmental justice")
        if any(w in detail_lower for w in ["cultura", "arte", "artista", "música"]):
            cats.append("culture")
        if any(w in detail_lower for w in ["mulher", "feminist", "gênero", "genero"]):
            cats.append("gender")
        if any(w in detail_lower for w in ["indígena", "indigena", "quilombola", "tradicional"]):
            cats.append("indigenous")
        if any(w in detail_lower for w in ["jovem", "juventude", "criança", "adolescente"]):
            cats.append("youth")

        grants.append(make_grant(
            title=title or f"Edital {edital_url.split('/')[-1]}",
            source_name=SOURCE, url=edital_url,
            description=description, country="BR", language="pt",
            funder="Fundo Brasil de Direitos Humanos",
            deadline=deadline, amount_max=amount, status=status,
            categories=cats,
        ))

    console.print(f"  [cyan]fundobrasil.org.br[/] → {len(grants)} editais ({sum(1 for g in grants if g['status']=='open')} open, {sum(1 for g in grants if g['status']=='closed')} closed)")
    return grants


# ══════════════════════════════════════════════════════════════
#  ── EU / EUROPE ─────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════

async def fetch_eu_tenders(session):
    """EU Funding & Tenders Portal — reference entry."""
    grants = []
    grants.append(make_grant(
        title="European Commission — EU Funding Programmes (LIFE, Horizon, Creative Europe)",
        source_name="eu-funding.europa.eu",
        url="https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/home",
        description=(
            "The European Commission offers grants and tenders through multiple programmes: "
            "LIFE (environment & climate), Horizon Europe (research & innovation), Creative "
            "Europe (culture & arts), Erasmus+ (education & youth), and more. Open calls "
            "published on the Funding & Tenders Portal throughout the year."
        ),
        funder="European Commission",
        country="EU", language="en", currency="EUR", status="unknown",
        categories=["EU","Horizon","LIFE","Creative Europe","Erasmus","environment","culture"],
    ))
    console.print(f"  [cyan]eu-funding[/] → {len(grants)}")
    return grants


async def fetch_eea_grants(session):
    """EEA and Norway Grants — reference entry."""
    grants = []
    grants.append(make_grant(
        title="EEA and Norway Grants — Funding Programmes",
        source_name="eeagrants.org",
        url="https://eeagrants.org/",
        description=(
            "EEA and Norway Grants provide funding to 15 EU member states for projects "
            "in environment, climate change, civil society, culture, and social inclusion. "
            "Funded by Iceland, Liechtenstein, and Norway. Open calls managed by national "
            "Focal Points in each beneficiary country. Focus: green transition, democratic "
            "engagement, human rights, and cultural cooperation."
        ),
        funder="EEA and Norway Grants",
        country="EU", language="en", currency="EUR", status="unknown",
        categories=["environment","climate","civil society","culture","human rights"],
    ))
    console.print(f"  [cyan]eeagrants.org[/] → {len(grants)}")
    return grants


async def fetch_gulbenkian(session):
    """Calouste Gulbenkian Foundation — reference entry."""
    grants = []
    SOURCE = "gulbenkian.pt"
    grants.append(make_grant(
        title="Calouste Gulbenkian Foundation — Programmes",
        source_name=SOURCE,
        url="https://gulbenkian.pt/programas/",
        description=(
            "Gulbenkian Foundation supports projects in arts, environment, science, and "
            "social development. Focus areas: climate action, ocean conservation, cultural "
            "heritage, education, and social inclusion. Multi-year programmes with open "
            "calls throughout the year. Grants for NGOs, research institutions, and cultural "
            "organizations in Portugal and internationally."
        ),
        funder="Calouste Gulbenkian Foundation",
        country="EU", language="en", currency="EUR", status="unknown",
        categories=["arts","environment","science","culture","climate","ocean"],
    ))
    console.print(f"  [cyan]gulbenkian[/] → {len(grants)}")
    return grants


async def fetch_doen(session):
    """Doen Foundation (Netherlands) — reference entry."""
    grants = []
    SOURCE = "doen.nl"
    grants.append(make_grant(
        title="Doen Foundation — Open Calls",
        source_name=SOURCE,
        url="https://www.doen.nl/en/open-calls/",
        description=(
            "Doen Foundation supports cultural, green-economy, and social initiatives "
            "in the Netherlands and abroad. Focus areas: culture, environment, social "
            "cohesion, and fair economy. Open calls for projects and organisations."
        ),
        funder="Doen Foundation",
        country="EU", language="en",
        currency="EUR", status="unknown",
        categories=["culture","green economy","arts","social cohesion"],
    ))
    console.print(f"  [cyan]doen.nl[/] → {len(grants)}")
    return grants


async def fetch_porticus(session):
    """Porticus Foundation — reference entry."""
    grants = []
    SOURCE = "porticus.com"
    grants.append(make_grant(
        title="Porticus Foundation — Programme Grants",
        source_name=SOURCE,
        url="https://www.porticus.com/en/what-we-fund/",
        description=(
            "Porticus funds organisations that strengthen the social and emotional "
            "well-being of children and young people, foster climate and environmental "
            "justice, and support meaningful education in Europe, Africa, Latin America, "
            "Asia, and the Middle East. Multi-year core and programme grants."
        ),
        funder="Porticus Foundation",
        country="GLOBAL", language="en", status="unknown",
        categories=["education","environment","climate justice","youth","global"],
    ))
    console.print(f"  [cyan]porticus.com[/] → {len(grants)}")
    return grants


async def fetch_commonwealth_foundation(session):
    """Commonwealth Foundation — civil society, arts, governance."""
    grants = []
    SOURCE = "commonwealthfoundation.com"
    urls = [
        "https://commonwealthfoundation.com/grants/annual/",
        "https://commonwealthfoundation.com/what-we-fund/",
        "https://commonwealthfoundation.com/",
    ]
    for url in urls:
        html = await fetch(session, url, use_cache=False)
        if not html: continue
        soup = BeautifulSoup(html, "lxml")
        found = 0
        for art in soup.select("article, .entry, .grant, section, [class*='grant'], [class*='fund'], li"):
            t = art.find(["h2","h3","h4"]); a = art.find("a",href=True)
            if not t: continue
            title = t.get_text(strip=True)
            link = urljoin("https://commonwealthfoundation.com", a["href"]) if a else url
            text = art.get_text(" ")
            if not is_scrape_hit(title, text):
                continue
            grants.append(make_grant(title=title, source_name=SOURCE, url=link,
                description=text[:MAX_DESCRIPTION_LEN], country="GLOBAL",
                funder="Commonwealth Foundation", deadline=extract_deadline(text),
                categories=["civil society","arts","governance","commonwealth"]))
            found += 1
        if found: break
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
                description=text[:MAX_DESCRIPTION_LEN], country="GLOBAL",
                funder="UNESCO", deadline=extract_deadline(text),
                categories=["culture","creative economy","cultural diversity","IFCD"]))
    # UNESCO RSS feed
    rss_text = await fetch(session, "https://www.unesco.org/creativity/en/rss")
    if rss_text:
        feed = feedparser.parse(rss_text)
        for e in feed.entries[:20]:
            title = e.get("title","")
            link  = e.get("link", "https://www.unesco.org")
            raw = feed_raw_html(e)
            desc  = clean_html(raw)
            grants.append(make_grant(title=title, source_name=f"{SOURCE}:rss", url=link,
                description=desc[:MAX_DESCRIPTION_LEN], country="GLOBAL",
                funder="UNESCO", deadline=extract_deadline(desc),
                raw_html=raw))
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
                description=text_block[:MAX_DESCRIPTION_LEN], country="GLOBAL",
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
    """Climate Justice Resilience Fund — reference entry."""
    grants = []
    grants.append(make_grant(
        title="Climate Justice Resilience Fund — Grantmaking",
        source_name="cjrfund.org",
        url="https://cjrfund.org/our-grants/",
        description=(
            "CJRF funds women, youth, and Indigenous communities responding to climate "
            "change. Focus on locally-led adaptation, climate justice, and community "
            "resilience in Africa, Asia, Latin America, and the Arctic. Multi-year "
            "grants for grassroots organizations. Priority: gender equity, Indigenous "
            "knowledge, and youth leadership in climate action."
        ),
        funder="Climate Justice Resilience Fund",
        country="GLOBAL", language="en", status="unknown",
        categories=["climate justice","women","indigenous","community","resilience"],
    ))
    console.print(f"  [cyan]cjrfund.org[/] → {len(grants)}")
    return grants


async def fetch_moleskine_pioneers(session):
    """Moleskine Foundation — Creativity Pioneers Fund."""
    grants = []
    SOURCE = "creativitypioneersfund.org"
    html = await fetch(session, "https://creativitypioneersfund.org/opencall")
    text_extra = ""
    if html:
        soup = BeautifulSoup(html, "lxml")
        text_extra = soup.get_text(" ")[:300]
    grants.append(make_grant(
        title="Creativity Pioneers Fund Open Call — Moleskine Foundation",
        source_name=SOURCE,
        url="https://creativitypioneersfund.org/opencall",
        description=(
            "€5,000 unrestricted grants for nonprofits using creativity for social "
            "transformation. Open globally. Focus: youth 16-27, marginalized communities, "
            "social + environmental challenges, intersectional approach. "
            + text_extra
        ),
        funder="Moleskine Foundation",
        amount_max="5000", currency="EUR",
        country="GLOBAL", language="en", status="unknown",
        deadline=extract_deadline(text_extra),
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
            raw_html = p.get("content",{}).get("rendered","") or ""
            content = clean_html(raw_html)
            url     = p.get("link","")
            if not is_scrape_hit(title, content):
                continue
            grants.append(make_grant(title=title, source_name=SOURCE, url=url,
                description=content[:MAX_DESCRIPTION_LEN], country="GLOBAL", language="en",
                deadline=extract_deadline(content),
                amount_max=extract_amount(content),
                raw_html=raw_html))
    # v2.2: main RSS feed — full content with "Deadline: 18-Sep-26" lines
    # and <category> tags (missed by the search API above).
    rss = await fetch(session, "https://www2.fundsforngos.org/feed/")
    if rss:
        feed = feedparser.parse(rss)
        for e in feed.entries[:50]:
            title = e.get("title","")
            link  = e.get("link","")
            raw = feed_raw_html(e)
            desc  = clean_html(raw)
            tags  = [t.get("term","") for t in e.get("tags",[])]
            if not is_scrape_hit(title, f"{desc} {' '.join(tags)}"):
                continue
            grants.append(make_grant(title=title, source_name=SOURCE, url=link,
                description=desc[:MAX_DESCRIPTION_LEN], country="GLOBAL", language="en",
                deadline=extract_deadline(desc), amount_max=extract_amount(desc),
                categories=[t for t in tags if t][:5],
                raw_html=raw))
    # Also scrape their listing page
    html = await fetch(session, "https://www2.fundsforngos.org/listing/")
    if html:
        soup = BeautifulSoup(html, "lxml")
        for art in soup.select("article, .entry"):
            t = art.find(["h2","h3"]); a = art.find("a",href=True)
            if not t: continue
            title = t.get_text(strip=True)
            if len(title) < 10: continue
            url = urljoin("https://www2.fundsforngos.org", a["href"]) if a else ""
            text = art.get_text(" ")
            if not is_scrape_hit(title, text):
                continue
            grants.append(make_grant(title=title, source_name=SOURCE, url=url,
                description=text[:MAX_DESCRIPTION_LEN], country="GLOBAL", language="en",
                deadline=extract_deadline(text), amount_max=extract_amount(text)))
    console.print(f"  [cyan]fundsforngos.org[/] → {len(grants)}")
    return grants


async def fetch_terraviva(session):
    """Terra Viva Grants — funding-news blog for agriculture, energy,
    environment and natural resources in the developing world.
    Public WP-JSON API; posts carry explicit deadlines + amounts and
    "Funder — Program" titles. v2.2."""
    grants = []
    SOURCE = "terravivagrants.org"
    for search_term in ["environment", "climate", "conservation", "biodiversity",
                        "indigenous", "women", "youth", "forest", "water", "energy"]:
        api = (f"https://www.terravivagrants.org/wp-json/wp/v2/posts"
               f"?per_page=25&search={quote(search_term)}&_embed=true")
        data = await fetch_json(session, api)
        if not data or not isinstance(data, list):
            continue
        for p in data:
            title   = clean_html(p.get("title", {}).get("rendered", ""))
            raw_html = p.get("content", {}).get("rendered", "") or ""
            content = clean_html(raw_html)
            url     = p.get("link", "")
            if not is_scrape_hit(title, content):
                continue
            grants.append(make_grant(
                title=title, source_name=SOURCE, url=url,
                description=content[:MAX_DESCRIPTION_LEN],
                country="GLOBAL", language="en",
                deadline=extract_deadline(content),
                amount_max=extract_amount(content),
                categories=["environment", "developing world"],
                raw_html=raw_html))
    console.print(f"  [cyan]terravivagrants.org[/] → {len(grants)}")
    return grants


async def fetch_afac(session):
    """AFAC — Arab Fund for Arts and Culture. The /Programs listing page
    carries per-program cards with Open Call / Deadline / Announcement
    badges; detail pages carry amounts ("up to USD 25,000"). v2.3."""
    grants = []
    BASE = "https://www.arabculturefund.org"
    html = await fetch(session, f"{BASE}/Programs")
    if not html:
        return grants
    soup = BeautifulSoup(html, "lxml")
    today = datetime.now(timezone.utc).date().isoformat()
    for card in soup.select("a.programs-item"):
        title_el = card.select_one(".title")
        if not title_el:
            continue
        name = title_el.get_text(strip=True)
        if len(name) < 3:
            continue
        url = urljoin(BASE, card.get("href", ""))
        card_text = card.get_text(" ")
        dl = ""
        m = re.search(r'Deadline\s*\|\s*(\d{1,2} \w+ \d{4})', card_text)
        if m:
            dl = parse_date(m.group(1))
        is_open_badge = "Open Call" in card_text
        # Amount lives on the detail page
        body = card_text
        detail = await fetch(session, url)
        if detail:
            body = extract_body_text(BeautifulSoup(detail, "lxml")) or card_text
        title = f"AFAC {name} Grant"
        if not is_scrape_hit(title, body):
            continue
        if dl and dl < today:
            status = "closed"
        elif is_open_badge:
            status = "open"
        else:
            status = detect_status_from_text(body) or "open"
        grants.append(make_grant(
            title=title, source_name="arabculturefund.org", url=url,
            description=body[:MAX_DESCRIPTION_LEN],
            funder="Arab Fund for Arts and Culture (AFAC)",
            country="MENA", language="en", status=status,
            deadline=dl or extract_deadline(body),
            raw_html=detail or "",
            amount_max=extract_amount(body),
            categories=["mena", "art", "culture"]))
    console.print(f"  [cyan]arabculturefund.org[/] → {len(grants)}")
    return grants


async def fetch_ofa(session):
    """Opportunities For Africans — high-volume WP RSS aggregator
    (scholarships/fellowships/contests with "Application Deadline:" lines
    and country tags). Strict-gated like the other aggregators. v2.3."""
    grants = []
    SOURCE = "opportunitiesforafricans.com"
    rss = await fetch(session, "https://www.opportunitiesforafricans.com/feed/")
    if not rss:
        return grants
    feed = feedparser.parse(rss)
    for e in feed.entries[:40]:
        title = e.get("title", "")
        link = e.get("link", "")
        raw = feed_raw_html(e)
        desc = clean_html(raw)
        tags = [t.get("term", "") for t in e.get("tags", [])]
        if not is_scrape_hit(title, f"{desc} {' '.join(tags)}"):
            continue
        grants.append(make_grant(title=title, source_name=SOURCE, url=link,
            description=desc[:MAX_DESCRIPTION_LEN], country="AFRICA", language="en",
            deadline=extract_deadline(desc), amount_max=extract_amount(desc),
            categories=[t for t in tags if t][:5],
            raw_html=raw))
    console.print(f"  [cyan]opportunitiesforafricans.com[/] → {len(grants)}")
    return grants


async def fetch_ics(session):
    """Instituto Clima e Sociedade (iCS) — BR climate funder with rolling
    editais (R$ millions, "Chamada de DD/MM/YY até DD/MM/YY", "Inscrições
    Abertas" badges). Listing + detail pages. v2.3."""
    grants = []
    BASE = "https://climaesociedade.org"
    html = await fetch(session, f"{BASE}/editais/")
    if not html:
        return grants
    soup = BeautifulSoup(html, "lxml")
    seen = set()
    for a in soup.select('a[href*="/edital/"]'):
        url = urljoin(BASE, a["href"])
        if url in seen:
            continue
        seen.add(url)
        detail = await fetch(session, url)
        if not detail:
            continue
        dsoup = BeautifulSoup(detail, "lxml")
        h1 = dsoup.select_one("h1")
        title = h1.get_text(strip=True) if h1 else a.get_text(strip=True)
        if len(title) < 15:
            continue
        body = extract_body_text(dsoup) or dsoup.get_text(" ", strip=True)[:2000]
        if not is_scrape_hit(title, body):
            continue
        blob_low = body.lower()
        if "inscrições abertas" in blob_low or "inscricoes abertas" in blob_low:
            status = "open"
        elif "inscrições encerradas" in blob_low or "inscricoes encerradas" in blob_low:
            status = "closed"
        else:
            status = detect_status_from_text(body) or "open"
        grants.append(make_grant(title=title, source_name="climaesociedade.org",
            url=url, description=body[:MAX_DESCRIPTION_LEN],
            funder="Instituto Clima e Sociedade (iCS)",
            country="BR", language="pt", status=status,
            deadline=extract_deadline(body), amount_max=extract_amount(body),
            categories=["climate", "brasil"]))
    console.print(f"  [cyan]climaesociedade.org[/] → {len(grants)}")
    return grants


async def fetch_cepf_calls(session):
    """CEPF open calls page — hotspot + call title + "Closes <date>"
    blocks with links to call detail pages (amounts there). v2.4."""
    grants = []
    html = await fetch(session, "https://www.cepf.net/grants/open-calls-for-proposals")
    if not html:
        return grants
    soup = BeautifulSoup(html, "lxml")
    today = datetime.now(timezone.utc).date().isoformat()
    seen = set()
    for txt in soup.find_all(string=re.compile(r'Closes?\b')):
        parent = txt.parent
        block = parent
        for _ in range(4):
            if block is None or block.name in ("main", "body"):
                break
            sib_text = block.get_text(" ")
            if len(sib_text) > 60:
                break
            block = block.parent
        scope = block if block is not None else parent
        scope_text = scope.get_text(" ") if scope else str(txt)
        link_el = scope.select_one("a[href]") if scope and hasattr(scope, "select_one") else None
        url = urljoin("https://www.cepf.net", link_el["href"]) if link_el else \
            "https://www.cepf.net/grants/open-calls-for-proposals"
        if url in seen:
            continue
        seen.add(url)
        head = scope.select_one("h1,h2,h3,h4") if scope and hasattr(scope, "select_one") else None
        hotspot = head.get_text(strip=True) if head else ""
        title = f"CEPF {hotspot} — Call for Proposals" if hotspot else \
            "CEPF — Call for Proposals"
        dl = extract_deadline(str(txt))
        body = scope_text
        detail = await fetch(session, url) if url != "https://www.cepf.net/grants/open-calls-for-proposals" else None
        if detail:
            body = extract_body_text(BeautifulSoup(detail, "lxml")) or scope_text
            if not dl:
                dl = extract_deadline(body)
        if not is_scrape_hit(title, body):
            continue
        status = "closed" if (dl and dl < today) else "open"
        grants.append(make_grant(
            title=title, source_name="cepf.net", url=url,
            description=body[:MAX_DESCRIPTION_LEN],
            funder="Critical Ecosystem Partnership Fund",
            country="GLOBAL", language="en", status=status,
            deadline=dl or extract_deadline(body),
            amount_max=extract_amount(body),
            categories=["conservation", "biodiversity"]))
    console.print(f"  [cyan]cepf.net calls[/] → {len(grants)}")
    return grants


async def fetch_darwin(session):
    """UK Darwin Initiative Round 32 — scheme blocks on how-to-apply with
    open/closed status words, deadlines ("Monday 31 st August 2026") and
    scheme detail pages (amounts £200k–£1M). v2.4."""
    grants = []
    BASE = "https://www.darwininitiative.org.uk"
    html = await fetch(session, f"{BASE}/how-to-apply/")
    if not html:
        return grants
    soup = BeautifulSoup(html, "lxml")
    page_text = soup.get_text(" ")
    today = datetime.now(timezone.utc).date().isoformat()
    for m in re.finditer(
            r'Darwin Initiative\s+(Main|Extra|Capability\s*(?:&|and)\s*Capacity)'
            r'(.{0,400}?)((?:Stage\s*\d|Single Stage)?\s*(?:–|-)?\s*'
            r'(open|closed)[^.]{0,120}?deadline\s+([^\n.]{4,60}))',
            page_text, re.I | re.S):
        scheme = re.sub(r'\s+', ' ', m.group(1)).strip()
        status_word = m.group(4).lower()
        dl_raw = m.group(5).strip()
        dl = extract_deadline(dl_raw) or extract_deadline(m.group(0))
        link_el = soup.find("a", href=re.compile(r'how-to-apply|scheme|guidance', re.I))
        url = urljoin(BASE, link_el["href"]) if link_el else f"{BASE}/how-to-apply/"
        title = f"Darwin Initiative {scheme} — Biodiversity Grants (UK)"
        body = m.group(0)
        detail = await fetch(session, url)
        if detail:
            body = extract_body_text(BeautifulSoup(detail, "lxml")) or body
        if not is_scrape_hit(title, body):
            continue
        if dl and dl < today:
            status = "closed"
        else:
            status = "open" if status_word == "open" else (
                "closed" if status_word == "closed" else "open")
        grants.append(make_grant(
            title=title, source_name="darwininitiative.org.uk", url=url,
            description=body[:MAX_DESCRIPTION_LEN],
            funder="UK DEFRA Darwin Initiative",
            country="GLOBAL", language="en", status=status,
            deadline=dl or extract_deadline(body),
            amount_max=extract_amount(body),
            categories=["conservation", "biodiversity", "poverty reduction"]))
    console.print(f"  [cyan]darwininitiative.org.uk[/] → {len(grants)}")
    return grants


async def fetch_gates_gc(session):
    """Gates Grand Challenges homepage — "Open Grant Opportunities" cards
    with "Applications Closes <date>" + /challenge/ detail pages.
    Emotion-CSS markup: discover via Closes-strings, walk up to the
    challenge link, take the longest non-chrome text as title. v2.4."""
    grants = []
    html = await fetch(session, "https://gcgh.grandchallenges.org/")
    if not html:
        return grants
    soup = BeautifulSoup(html, "lxml")
    today = datetime.now(timezone.utc).date().isoformat()
    seen = set()
    chrome = ("Grand Challenges", "Applications Closes", "Learn More",
              "Open Grant Opportunities")
    # v2.4: cards are <article> blocks (title + /challenge/ link +
    # "Applications Closes" + date as sibling nodes).
    blocks = [a for a in soup.select("article")
              if "Closes" in a.get_text(" ")]
    if not blocks:
        # Fallback: walk up from any Closes text node to the challenge link.
        for txt in soup.find_all(string=re.compile(r'Applications?\s+Closes?')):
            block = txt.parent
            for _ in range(7):
                if block is None or getattr(block, "name", None) in ("main", "body"):
                    break
                if hasattr(block, "select_one") and \
                        block.select_one('a[href*="/challenge/"]'):
                    blocks.append(block)
                    break
                block = block.parent
    for block in blocks:
        url = urljoin("https://gcgh.grandchallenges.org", link["href"])
        if url in seen:
            continue
        seen.add(url)
        # v2.4: collect visible texts only — skip Emotion <style>/<script>
        # blobs (long CSS strings would outrank real titles).
        texts = []
        for s in block.find_all(string=True):
            if getattr(s, "parent", None) is not None and \
                    s.parent.name in ("style", "script", "noscript"):
                continue
            t = s.strip()
            if len(t) >= 15:
                texts.append(t)
        cands = [t for t in texts if not any(c in t for c in chrome)]
        if not cands:
            continue
        title = max(cands, key=len)
        card_text = block.get_text(" ")
        dl = extract_deadline(card_text)
        body = card_text
        detail = await fetch(session, url)
        if detail:
            body = extract_body_text(BeautifulSoup(detail, "lxml")) or card_text
            if not dl:
                dl = extract_deadline(body)
        if not is_scrape_hit(title, body):
            continue
        status = "closed" if (dl and dl < today) else "open"
        grants.append(make_grant(
            title=title, source_name="gcgh.grandchallenges.org", url=url,
            description=body[:MAX_DESCRIPTION_LEN],
            funder="Gates Foundation Grand Challenges",
            country="GLOBAL", language="en", status=status,
            deadline=dl or extract_deadline(body),
            amount_max=extract_amount(body),
            categories=["health", "development", "innovation"]))
    console.print(f"  [cyan]grandchallenges.org[/] → {len(grants)}")
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
            raw = feed_raw_html(e)
            desc  = clean_html(raw)
            if not is_scrape_hit(title, desc):
                continue
            grants.append(make_grant(title=title, source_name=SOURCE, url=link,
                description=desc[:MAX_DESCRIPTION_LEN], country="GLOBAL", language="en",
                deadline=extract_deadline(desc),
                amount_max=extract_amount(desc),
                raw_html=raw))
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
            raw = feed_raw_html(e)
            desc  = clean_html(raw)
            tags  = [t.get("term","") for t in e.get("tags",[])]
            if not is_scrape_hit(title, f"{desc} {' '.join(tags)}"):
                continue
            # Infer country from tags
            country = "GLOBAL"
            tag_str = " ".join(tags).lower()
            if "south america" in tag_str or "latin america" in tag_str: country = "LATAM"
            elif "africa" in tag_str: country = "AFRICA"
            elif "europe" in tag_str: country = "EU"
            elif "asia" in tag_str: country = "ASIA"
            grants.append(make_grant(title=title, source_name=SOURCE, url=link,
                description=desc[:MAX_DESCRIPTION_LEN], country=country, language="en",
                deadline=extract_deadline(desc), amount_max=extract_amount(desc),
                categories=tags[:5],
                raw_html=raw))
    console.print(f"  [cyan]opportunitiesforyouth.org[/] → {len(grants)}")
    return grants


async def fetch_eflux(session):
    """e-flux — reference entry (their announcements require JS)."""
    grants = []
    grants.append(make_grant(
        title="e-flux Announcements — Art & Activism Open Calls",
        source_name="e-flux.com",
        url="https://www.e-flux.com/announcements/",
        description=(
            "e-flux Announcements is a platform for art, film, architecture, and activism "
            "open calls, grants, residencies, and opportunities worldwide. Curated listings "
            "from institutions, collectives, and artists globally. Categories include open "
            "calls for exhibitions, residencies, grants, fellowships, and commissions."
        ),
        funder="e-flux",
        country="GLOBAL", language="en", status="unknown",
        categories=["art","culture","open call","residency","activism"],
    ))
    console.print(f"  [cyan]e-flux.com[/] → {len(grants)}")
    return grants


async def fetch_sustainable_practice(session):
    """Centre for Sustainable Practice in the Arts — env art open calls."""
    grants = []
    SOURCE = "sustainablepractice.org"
    html = await fetch(session, "https://sustainablepractice.org/open-calls/")
    if html:
        soup = BeautifulSoup(html, "lxml")
        for h2 in soup.select("h2"):
            a = h2.find("a", href=True)
            if not a: continue
            title = h2.get_text(strip=True)
            if len(title) < 10: continue
            url   = urljoin("https://sustainablepractice.org", a["href"])
            # Fetch detail page for description
            detail_html = await fetch(session, url)
            if detail_html:
                detail = BeautifulSoup(detail_html, "lxml")
                text = detail.get_text(" ", strip=True)[:600]
            else:
                text = title
            if not is_scrape_hit(title, text):
                continue
            grants.append(make_grant(title=title, source_name=SOURCE, url=url,
                description=text, country="GLOBAL", language="en",
                deadline=extract_deadline(text), amount_max=extract_amount(text),
                categories=["art","environment","sustainability","open call"],
                raw_html=detail_html or ""))
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
            raw = feed_raw_html(e)
            desc  = clean_html(raw)
            if not is_scrape_hit(title, desc):
                continue
            grants.append(make_grant(title=title, source_name=SOURCE, url=link,
                description=desc[:MAX_DESCRIPTION_LEN], country="GLOBAL", language="en",
                deadline=extract_deadline(desc),
                categories=["aggregator","social enterprise","environment","global"],
                raw_html=raw))
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
            raw = feed_raw_html(e)
            desc  = clean_html(raw)
            if not is_scrape_hit(title, desc):
                continue
            grants.append(make_grant(title=title, source_name=SOURCE, url=link,
                description=desc[:MAX_DESCRIPTION_LEN], country="GLOBAL", language="en",
                deadline=extract_deadline(desc), amount_max=extract_amount(desc),
                categories=["global south","development","environment"],
                raw_html=raw))
    console.print(f"  [cyan]globalsouthopportunities.com[/] → {len(grants)}")
    return grants


# ══════════════════════════════════════════════════════════════
#  ── LATIN AMERICA ───────────────────────────────────────────
# ══════════════════════════════════════════════════════════════

async def fetch_latam(session):
    """LATAM foundations — reference entries (most sites dead/blocked)."""
    grants = []
    grants.append(make_grant(
        title="Fondo Acción Urgente — Financiamiento Feminista",
        source_name="latam:fau",
        url="https://fondoaccionurgente.org.co/",
        description=(
            "Fondo Acción Urgente es un fondo feminista que financia y acompaña a "
            "defensoras de derechos humanos y ambientales en América Latina y el Caribe. "
            "Apoya organizaciones y movimientos sociales con financiamiento rápido y "
            "flexible para protección, seguridad y acción urgente."
        ),
        funder="Fondo Acción Urgente",
        country="LATAM", language="es", status="unknown",
        categories=["feminist","human rights","environmental defenders","Latin America"],
    ))
    grants.append(make_grant(
        title="Amazon Conservation Team — Grants for Indigenous & Local Communities",
        source_name="latam:amazonconservation",
        url="https://www.amazonconservation.org/grants/",
        description=(
            "Amazon Conservation Team supports Indigenous and local communities in "
            "protecting the Amazon rainforest. Grants for territorial management, "
            "cultural preservation, and sustainable livelihoods in Brazil, Colombia, "
            "Suriname, and Guyana."
        ),
        funder="Amazon Conservation Team",
        country="LATAM", language="en", status="unknown",
        categories=["Amazon","indigenous","conservation","rainforest","Latin America"],
    ))
    console.print(f"  [cyan]LATAM sources[/] → {len(grants)}")
    return grants


# ══════════════════════════════════════════════════════════════
#  ── AFRICA / ASIA ───────────────────────────────────────────
# ══════════════════════════════════════════════════════════════

async def fetch_africa(session):
    """African grant sources — Southern Africa Trust + standing entries."""
    grants = []

    # ── Southern Africa Trust — live open calls ────────────────
    BASE = "https://southernafricatrust.org"
    html = await fetch(session, BASE + "/grantmaking/")
    if html:
        soup = BeautifulSoup(html, "lxml")
        found = 0
        # The grantmaking page lists open calls as <h3> with links
        for h3 in soup.select("h3"):
            a = h3.find("a", href=True)
            if not a: continue
            title = h3.get_text(strip=True)
            if len(title) < 15: continue
            href = a["href"]
            if href.startswith("/"): href = BASE + href
            # Fetch detail page for more info
            detail_html = await fetch(session, href)
            desc, deadline = "", ""
            if detail_html:
                detail = BeautifulSoup(detail_html, "lxml")
                detail_text = detail.get_text(" ", strip=True)
                desc = detail_text[:800]
                deadline = extract_deadline(detail_text)
            grants.append(make_grant(title=title, source_name="africa:sat", url=href,
                description=desc, country="AFRICA", language="en",
                funder="Southern Africa Trust", deadline=deadline,
                categories=["climate justice","natural resources","governance","southern africa"]))
            found += 1
        if found:
            console.print(f"    [dim]Southern Africa Trust: {found} calls[/]")

    # ── Reference: Tony Elumelu Foundation ──────────────────────
    grants.append(make_grant(
        title="Tony Elumelu Foundation — Entrepreneurship Programme",
        source_name="africa:tef",
        url="https://www.tonyelumelufoundation.org/programmes/",
        description=(
            "Annual $5,000 seed capital entrepreneurship grant for African startups. "
            "Open to African entrepreneurs with business ideas in any sector including "
            "environment, agriculture, technology, and social impact. Program includes "
            "mentorship, training, and networking alongside seed funding."
        ),
        funder="Tony Elumelu Foundation (TEF)",
        amount_max="5000", currency="USD",
        country="AFRICA", language="en", status="unknown",
        categories=["entrepreneurship","startup","seed funding","africa","youth"],
    ))

    # ── Reference: African Wildlife Foundation ───────────────────
    grants.append(make_grant(
        title="African Wildlife Foundation — Conservation Partnerships",
        source_name="africa:awf",
        url="https://www.awf.org/",
        description=(
            "AWF partners with African communities, governments, and conservation "
            "organizations to protect wildlife and wild lands. Focus areas include "
            "protected area management, species conservation, community-based natural "
            "resource management, and climate resilience across sub-Saharan Africa."
        ),
        funder="African Wildlife Foundation (AWF)",
        country="AFRICA", language="en", status="unknown",
        categories=["wildlife","conservation","community","biodiversity","africa"],
    ))

    console.print(f"  [cyan]Africa sources[/] → {len(grants)}")
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

    # ── LatAm (Fondo Acción Urgente and IICA are covered by `latam` scraper)

    # ── EU programmes
    ("EEA Grants",                 "https://www.eeagrants.org/news/rss.xml",                          "EU",    "en"),
    ("Creative Europe news",       "https://culture.ec.europa.eu/news/rss",                           "EU",    "en"),
    ("Sida Sweden",                "https://www.sida.se/en/feed/rss",                                 "EU",    "en"),

    # ── Colossal (arts open calls — curated monthly lists)
    ("Colossal open calls",        "https://www.thisiscolossal.com/feed/",                            "GLOBAL","en"),

    # NOTE: Impact Funding, Opportunity Desk, Opportunities for Youth,
    # Global South Opportunities, fundsforNGOs, and Green Grants are NOT here
    # because they have dedicated scrapers above (impactfunding, opdesk, ofy,
    # globalsouth, fundsforngos, greengrants). Running both wastes requests.
    ("IUCN",                       "https://www.iucn.org/feeds/news",                                 "GLOBAL","en"),

    # ── Francophone
    ("AFD Appels à projets",       "https://www.afd.fr/fr/appels-projets/rss",                        "FR",    "fr"),
    ("Fondation de France RSS",    "https://www.fondationdefrance.org/fr/appels-projets/rss",         "FR",    "fr"),
    ("France Volontaires",         "https://www.france-volontaires.org/feed/",                        "FR",    "fr"),
    ("Le Média Social",            "https://www.lemediasocial.fr/feed/",                              "FR",    "fr"),
    ("Carenews",                   "https://www.carenews.com/feed",                                   "FR",    "fr"),

    # ── Hispanophone
    ("AECID Convocatorias",        "https://www.aecid.es/ES/convocatorios/rss",                       "ES",    "es"),
    ("Fundación Carolina",         "https://www.fundacioncarolina.es/feed/",                          "ES",    "es"),
    ("Cooperación Española",       "https://www.cooperacionespanola.es/feed/",                        "ES",    "es"),
    ("Agenda Pública",             "https://agendapublica.elpais.com/feed/",                          "ES",    "es"),

    # ── Global env
    ("UNEP Funding",               "https://www.unep.org/grants-funding/rss",                         "GLOBAL","en"),
    ("CEPF News",                  "https://www.cepf.net/rss.xml",                                    "GLOBAL","en"),
    ("Rainforest Foundation",      "https://rainforestfoundation.org/feed/",                          "GLOBAL","en"),
    ("World Resources Institute",  "https://www.wri.org/feed",                                        "GLOBAL","en"),
    ("Biodiversity International", "https://www.biodiversityinternational.org/feed/",                 "GLOBAL","en"),
    ("Global Greengrants RSS",     "https://www.greengrants.org/feed/",                               "GLOBAL","en"),
    # v2.1: pure journalism outlets removed — they publish zero open calls
    # and produced 478 news rows in prod (audited 2026-09):
    #   ("Mongabay", "https://feeds.feedburner.com/mongabay", ...)
    #   ("The Conversation Env", "https://theconversation.com/us/environment/articles/feed", ...)

    # ── Arts + culture foundations
    ("Prince Claus Fund",         "https://princeclausfund.org/feed/",                             "GLOBAL","en"),
    ("European Cultural Fdtn",    "https://culturalfoundation.eu/feed/",                           "EU",    "en"),
    ("Goethe Institute",          "https://www.goethe.de/feed/",                                   "GLOBAL","en"),
    ("British Council",           "https://www.britishcouncil.org/feed/all.xml",                   "GLOBAL","en"),

    # ── Environmental foundations
    ("Rufford Foundation",        "https://www.rufford.org/feed/",                                 "GLOBAL","en"),
    ("ClientEarth",               "https://www.clientearth.org/feed/",                             "GLOBAL","en"),
    ("King Baudouin Foundation",  "https://www.kbs-frb.be/rss.xml",                                "EU",    "en"),

    # ── Social/grantmaking foundations
    ("Global Fund for Women",     "https://www.globalfundforwomen.org/feed/",                      "GLOBAL","en"),
    ("The Baring Foundation",     "https://baringfoundation.org.uk/feed/",                         "UK",    "en"),
    ("Comic Relief",              "https://www.comicrelief.com/feed/",                             "UK",    "en"),

    # ── EU programmes
    ("Erasmus+",                  "https://erasmus-plus.ec.europa.eu/rss",                         "EU",    "en"),
    ("Interreg Europe",           "https://www.interregeurope.eu/rss",                             "EU",    "en"),

    # ── French environmental
    ("ADEME",                     "https://www.ademe.fr/feed/",                                    "FR",    "fr"),

    # ── Asia / Pacific development
    ("ADB News",                  "https://www.adb.org/rss",                                        "ASIA",  "en"),
    ("Asian Foundation",          "https://asiafoundation.org/feed/",                               "ASIA",  "en"),
    ("UNDP Asia Pacific",         "https://www.undp.org/asia-pacific/rss",                          "ASIA",  "en"),
    ("Save the Children Asia",    "https://www.savethechildren.net/feed/",                          "ASIA",  "en"),

    # ── Japan
    ("Japan Foundation",          "https://www.jpf.go.jp/e/feed/",                                  "JP",    "en"),
    ("Nippon Foundation EN",      "https://www.nippon-foundation.or.jp/en/feed/",                   "JP",    "en"),
    ("Toyota Foundation",         "https://www.toyotafoundation.or.jp/en/feed/",                    "JP",    "en"),

    # ── India
    ("Tata Trusts",               "https://www.tatatrusts.org/feed/",                               "IN",    "en"),
    ("Wipro Foundation",          "https://www.wiprofoundation.org/feed/",                         "IN",    "en"),
    ("GiveIndia Grants",          "https://give.do/feed",                                           "IN",    "en"),

    # ── China
    ("China Green Foundation",    "https://www.cgf.org.cn/rss/",                                    "CN",    "zh"),
    ("Alibaba Foundation",        "https://www.alibabafoundation.com/feed/",                        "CN",    "en"),

    # ── Southeast Asia
    ("ASEAN Foundation",          "https://aseanfoundation.org/feed/",                              "SEA",   "en"),
    ("KEHATI Indonesia",          "https://kehati.or.id/feed/",                                     "ID",    "id"),
    ("Tzu Chi Foundation",        "https://global.tzuchi.org/feed/",                                "TW",    "en"),

    # ── Korea
    ("Korea Foundation",          "https://www.kf.or.kr/rss",                                       "KR",    "en"),

    # ── Africa
    ("African Wildlife Fdn",      "https://www.awf.org/rss.xml",                                    "AFRICA","en"),
    ("Southern Africa Trust",     "https://southernafricatrust.org/feed/",                           "AFRICA","en"),
    ("Tony Elumelu Foundation",   "https://www.tonyelumelufoundation.org/feed/",                     "AFRICA","en"),
    ("NCF Nigeria",               "https://www.ncfnigeria.org/feed/",                                "AFRICA","en"),
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
                raw = feed_raw_html(e)
                desc  = clean_html(raw)
                # v2.1: org-news feeds only pass with explicit grant
                # vocabulary (or deadline+amount). The old relevance>=3
                # gate let 600+ news rows into prod with zero deadlines.
                blob = f"{title} {desc}"
                if is_likely_job(title, desc):
                    continue
                if not GRANT_TERMS_RE.search(blob):
                    if not (extract_deadline(desc) and extract_amount(desc)):
                        continue
                if not is_scrape_hit(title, desc):
                    continue
                result.append(make_grant(title=title, source_name=f"rss:{name}",
                    url=link, description=desc[:MAX_DESCRIPTION_LEN], country=country,
                    language=lang, deadline=extract_deadline(desc),
                    amount_max=extract_amount(desc),
                    raw_html=raw))
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
    """Global Greengrants Fund — reference entry (WAF blocks all requests)."""
    grants = []
    grants.append(make_grant(
        title="Global Greengrants Fund — Grassroots Environmental Grants",
        source_name="greengrants.org",
        url="https://www.greengrants.org/apply-for-a-grant/",
        description=(
            "Global Greengrants Fund provides small grants ($500–$5,000) for grassroots "
            "environmental and climate justice movements worldwide. Focus areas: indigenous "
            "rights, biodiversity, water justice, climate action, community-led conservation, "
            "and environmental health. Rolling applications with priority to underrepresented groups."
        ),
        funder="Global Greengrants Fund",
        country="GLOBAL", language="en", currency="USD", status="unknown",
        categories=["grassroots","environment","indigenous","climate justice","small grants"],
    ))
    console.print(f"  [cyan]greengrants.org[/] → {len(grants)}")
    return grants


async def fetch_wellbeing_economy(session):
    """Wellbeing Economy Alliance — reference entry (not a grant source)."""
    grants = []
    grants.append(make_grant(
        title="Wellbeing Economy Alliance — Membership & Advocacy",
        source_name="weall.org",
        url="https://weall.org/",
        description=(
            "The Wellbeing Economy Alliance (WEAll) is a global collaboration of organisations, "
            "governments, and individuals working to transform the economic system. While WEAll "
            "does not directly offer grants, members can access networking, policy advocacy, "
            "and capacity-building resources for post-growth, wellbeing-centered economic projects."
        ),
        funder="Wellbeing Economy Alliance",
        country="GLOBAL", language="en", status="unknown",
        categories=["wellbeing economy","community","environment","advocacy","post-growth"],
    ))
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
            url  = urljoin("https://www.changemakers.com", a["href"]) if a else "https://www.changemakers.com"
            text = art.get_text(" ")
            if not is_scrape_hit(title, text):
                continue
            grants.append(make_grant(title=title, source_name=SOURCE, url=url,
                description=text[:MAX_DESCRIPTION_LEN], country="GLOBAL",
                funder="Ashoka / Changemakers",
                deadline=extract_deadline(text), amount_max=extract_amount(text),
                categories=["social entrepreneurship","environment","community"]))
    console.print(f"  [cyan]changemakers.com[/] → {len(grants)}")
    return grants


async def fetch_emerging_climate_champions(session):
    """Emerging Climate Champions Award — reference entry."""
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
        country="GLOBAL", language="en", status="unknown",
        categories=["youth","climate","social change","large grant","global south"],
    ))
    console.print(f"  [cyan]emerging climate champions[/] → {len(grants)}")
    return grants


# ══════════════════════════════════════════════════════════════
#  ── FRANCOPHONE ────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════

async def fetch_francophone(session):
    """Francophone grant sources — reference entries."""
    grants = []
    grants.append(make_grant(
        title="AFD — Appels à Projets (Agence Française de Développement)",
        source_name="fr:afd",
        url="https://www.afd.fr/fr/appels-projets",
        description=(
            "L'AFD lance régulièrement des appels à projets pour les OSC, collectivités "
            "territoriales et secteur privé dans les domaines du développement durable, "
            "climat, biodiversité, éducation, et santé. Projets en Afrique, Méditerranée, "
            "Asie et Outre-mer. Subventions et financements pour projets à impact."
        ),
        funder="Agence Française de Développement (AFD)",
        country="FR", language="fr", currency="EUR", status="unknown",
        categories=["development","climate","biodiversity","Africa","French"],
    ))
    grants.append(make_grant(
        title="Fondation de France — Appels à Projets",
        source_name="fr:fondationdef",
        url="https://www.fondationdefrance.org/fr/appels-projets",
        description=(
            "Fondation de France soutient des projets dans les domaines de l'environnement, "
            "de la solidarité, de la culture, de l'éducation et de la recherche. Appels à "
            "projets réguliers pour associations et organisations à but non lucratif en France."
        ),
        funder="Fondation de France",
        country="FR", language="fr", currency="EUR", status="unknown",
        categories=["environment","solidarity","culture","education","French"],
    ))
    console.print(f"  [cyan]Francophone sources[/] → {len(grants)}")
    return grants


# ══════════════════════════════════════════════════════════════
#  ── HISPANOPHONE ───────────────────────────────────────────
# ══════════════════════════════════════════════════════════════

async def fetch_hispanophone(session):
    """Hispanophone grant sources — reference entries."""
    grants = []
    grants.append(make_grant(
        title="Cooperación Española — Convocatorias MAEC-AECID",
        source_name="es:cooperacion",
        url="https://www.cooperacionespanola.es/convocatorias/",
        description=(
            "Cooperación Española ofrece becas, lectorados y convocatorias para proyectos "
            "de cooperación internacional, desarrollo sostenible, cultura y educación en "
            "países socios de América Latina, África y Asia."
        ),
        funder="Cooperación Española / MAEC-AECID",
        country="ES", language="es", currency="EUR", status="unknown",
        categories=["development","culture","education","cooperation","Spanish"],
    ))
    grants.append(make_grant(
        title="Fundación Carolina — Convocatorias de Becas",
        source_name="es:fundacioncarolina",
        url="https://www.fundacioncarolina.es/convocatorias/",
        description=(
            "Fundación Carolina ofrece becas y programas de formación para estudiantes, "
            "investigadores y profesionales de América Latina en áreas como medio ambiente, "
            "cultura, ciencia y tecnología."
        ),
        funder="Fundación Carolina",
        country="ES", language="es", currency="EUR", status="unknown",
        categories=["scholarships","environment","culture","science","Latin America"],
    ))
    console.print(f"  [cyan]Hispanophone sources[/] → {len(grants)}")
    return grants


# ══════════════════════════════════════════════════════════════
#  ── GLOBAL ENVIRONMENTAL GRANTS ─────────────────────────────
# ══════════════════════════════════════════════════════════════

async def fetch_global_env(session):
    """Additional global environmental grant sources."""
    grants = []
    sources = [
        ("gef",          "https://www.thegef.org/programs-funds",                       "GLOBAL","en","Global Environment Facility"),
        ("unep-eco",     "https://www.unep.org/grants-funding",                          "GLOBAL","en","UNEP"),
        ("undp-grants",  "https://www.undp.org/grants",                                  "GLOBAL","en","UNDP"),
        ("cepf",         "https://www.cepf.net/grants",                                  "GLOBAL","en","Critical Ecosystem Partnership Fund"),
        ("oceanfdn",     "https://oceanfdn.org/grants/",                                 "GLOBAL","en","Ocean Foundation"),
        ("rainforest",   "https://rainforestfoundation.org/grants/",                     "GLOBAL","en","Rainforest Foundation"),
        ("wwf-grants",   "https://www.wwf.org.uk/what-we-do/grants",                     "GLOBAL","en","WWF"),
        ("birdlife",     "https://www.birdlife.org/grants/",                             "GLOBAL","en","BirdLife International"),
    ]
    for name, url, country, lang, funder in sources:
        html = await fetch(session, url)
        if not html: continue
        soup = BeautifulSoup(html, "lxml")
        found = 0
        for art in soup.select("article, .card, .grant, [class*='grant'], [class*='fund'], section, li"):
            t = art.find(["h2","h3","h4"]); a = art.find("a",href=True)
            if not t: continue
            title = t.get_text(strip=True)
            link = urljoin(url, a["href"]) if a else url
            text = art.get_text(" ")
            if not is_scrape_hit(title, text):
                continue
            grants.append(make_grant(title=title, source_name=f"env:{name}", url=link,
                description=text[:MAX_DESCRIPTION_LEN], country=country, language=lang,
                funder=funder, deadline=extract_deadline(text)))
            found += 1
        if found:
            console.print(f"    [dim]{name}: {found} grants[/]")
    console.print(f"  [cyan]Global env sources[/] → {len(grants)}")
    return grants


# ══════════════════════════════════════════════════════════════
#  ── ASIAN GRANT SOURCES ─────────────────────────────────────
# ══════════════════════════════════════════════════════════════

async def fetch_asia(session):
    """Asian grant sources — ASEAN Foundation (live scrape) + standing entries."""
    grants = []

    # ── ASEAN Foundation — live open calls ─────────────────────
    # List page has <h4> items with direct links to call detail pages
    BASE = "https://aseanfoundation.org"
    html = await fetch(session, BASE + "/call-for-applications/")
    if html:
        soup = BeautifulSoup(html, "lxml")
        seen = set()
        for h4 in soup.select("h4"):
            a = h4.find("a", href=True)
            if not a: continue
            title = h4.get_text(strip=True)
            if len(title) < 15: continue
            href = a["href"]
            if href.startswith("/"): href = BASE + href
            if href in seen: continue
            seen.add(href)
            # Fetch detail page for full info
            detail_html = await fetch(session, href)
            desc, deadline, amount = "", "", ""
            if detail_html:
                detail = BeautifulSoup(detail_html, "lxml")
                detail_text = detail.get_text(" ", strip=True)
                desc = detail_text[:800]
                deadline = extract_deadline(detail_text)
                amount = extract_amount(detail_text)
                # Try to find country context
                for kw in ["Indonesia","Thailand","Vietnam","Philippines",
                           "Myanmar","Cambodia","Laos","Brunei","Singapore",
                           "Malaysia","ASEAN","Southeast Asia"]:
                    if kw.lower() in detail_text.lower():
                        break
            grants.append(make_grant(title=title, source_name="asia:asean", url=href,
                description=desc, country="SEA", language="en",
                funder="ASEAN Foundation", deadline=deadline, amount_max=amount,
                categories=["youth","culture","social enterprise","education"]))
        console.print(f"    [dim]ASEAN Foundation: {len(seen)} calls[/]")

    # ── Reference: Keidanren Nature Conservation Fund ────────────
    grants.append(make_grant(
        title="Keidanren Nature Conservation Fund (KNCF) — Grant Program",
        source_name="asia:kncf",
        url="https://www.keidanren.net/kncf/en/fund/program",
        description=(
            "KNCF offers annual biodiversity conservation grants up to ¥20 million/year "
            "for Asia-Pacific NGOs and research institutions. Reference entry — check the "
            "website for current open call dates and application guidelines."
        ),
        funder="Keidanren Nature Conservation Fund / Nippon Keidanren",
        amount_max="20000000", currency="JPY",
        country="ASIA", language="en", status="unknown",
        categories=["biodiversity","conservation","nature","asia","oceania"],
    ))

    # ── Reference: HCL Foundation HCLTech Grant ─────────────────
    grants.append(make_grant(
        title="HCLTech Grant — Water, Biodiversity & Environment",
        source_name="asia:hcl",
        url="https://www.hclfoundation.org/hcltech-grant",
        description=(
            "HCLFoundation offers annual grants up to ₹5 Crore for Indian NGOs working on "
            "water, biodiversity, and climate resilience. Reference entry — check website "
            "for current open call dates and application guidelines."
        ),
        funder="HCLFoundation",
        amount_max="50000000", currency="INR",
        country="IN", language="en", status="unknown",
        categories=["water","biodiversity","environment","climate","community"],
    ))

    # ── Reference: Sasakawa Peace Foundation Idea Submission ────
    grants.append(make_grant(
        title="Sasakawa Peace Foundation — Idea Submission Program",
        source_name="asia:sasakawa",
        url="https://www.spf.org/en/about/idea_submission/",
        description=(
            "Open call for idea submissions to the Sasakawa Peace Foundation. "
            "Focus areas: peacebuilding, maritime affairs, women in peace & security, "
            "US-Japan exchange, Middle East peace, and Pacific Islands development."
        ),
        funder="Sasakawa Peace Foundation",
        country="ASIA", language="en", status="unknown",
        categories=["peace","security","maritime","women","exchange","development"],
    ))

    console.print(f"  [cyan]Asian sources[/] → {len(grants)}")
    return grants


# ══════════════════════════════════════════════════════════════
#  ── ADDITIONAL FOUNDATIONS ─────────────────────────────────
# ══════════════════════════════════════════════════════════════

async def fetch_pollination_project(session):
    """The Pollination Project — reference entry."""
    grants = []
    grants.append(make_grant(
        title="The Pollination Project — Grassroots Grants",
        source_name="pollinationproject.org",
        url="https://pollinationproject.org/grants/",
        description=(
            "The Pollination Project provides $500–$8,000 seed funding to grassroots "
            "changemakers worldwide. Focus areas: environmental justice, animal protection, "
            "community health, human rights, and sustainable agriculture. Priority given to "
            "early-stage, community-led initiatives with strong social impact potential."
        ),
        funder="The Pollination Project",
        country="GLOBAL", language="en", currency="USD", status="unknown",
        categories=["grassroots","environment","social justice","small grants","seed funding"],
    ))
    console.print(f"  [cyan]pollinationproject.org[/] → {len(grants)}")
    return grants


async def fetch_globalgiving(session):
    """GlobalGiving — reference entry."""
    grants = []
    grants.append(make_grant(
        title="GlobalGiving — Open Call Funding & Matching Campaigns",
        source_name="globalgiving.org",
        url="https://www.globalgiving.org/learn/funding-opportunities/",
        description=(
            "GlobalGiving offers recurring Open Call grants ($5,000–$10,000) for community-led "
            "projects worldwide. Topics include disaster recovery, education, environment, health, "
            "gender equality, human rights, and economic development. Also runs matching campaigns "
            "where donations are matched by corporate and foundation partners."
        ),
        funder="GlobalGiving Foundation",
        country="GLOBAL", language="en", currency="USD", status="unknown",
        categories=["crowdfunding","capacity building","environment","community","disaster relief"],
    ))
    console.print(f"  [cyan]globalgiving.org[/] → {len(grants)}")
    return grants


async def fetch_nordic_funding(session):
    """Nordic cultural and environmental funding sources."""
    grants = []
    sources = [
        ("nordic-culture", "https://www.nordiskkulturfond.org/en/",         "NORDIC","en","Nordic Culture Fund"),
        ("kulturradet-se", "https://www.kulturradet.se/en/",                "SE",   "en","Swedish Arts Council"),
        ("kulturradet-no", "https://www.kulturradet.no/",                   "NO",   "no","Norwegian Directorate for Culture"),
        ("taike-fi",       "https://www.taike.fi/en",                       "FI",   "en","Arts Promotion Centre Finland"),
    ]
    for name, url, country, lang, funder in sources:
        html = await fetch(session, url)
        if not html: continue
        soup = BeautifulSoup(html, "lxml")
        for art in soup.select("article, .card, .grant, .opportunity, [class*='grant'], [class*='fund'], li, section"):
            t = art.find(["h1","h2","h3","h4"]); a = art.find("a",href=True)
            if not t: continue
            title = t.get_text(strip=True)
            link = urljoin(url, a["href"]) if a else url
            text = art.get_text(" ")
            if not is_scrape_hit(title, text):
                continue
            cty = infer_country(text, lang)
            grants.append(make_grant(title=title, source_name=f"nordic:{name}", url=link,
                description=text[:MAX_DESCRIPTION_LEN], country=cty, language=lang,
                funder=funder, deadline=extract_deadline(text),
                amount_max=extract_amount(text)))
    console.print(f"  [cyan]Nordic funding[/] → {len(grants)}")
    return grants


async def fetch_oceania(session):
    """Oceania / Pacific region grant sources."""
    grants = []
    sources = [
        ("aus-council",    "https://www.australiacouncil.gov.au/funding/",                    "AU","en","Australia Council for the Arts"),
        ("creative-nz",    "https://creativenz.govt.nz/funding/",                             "NZ","en","Creative New Zealand"),
        ("pac-community",  "https://www.spc.int/opportunities",                               "PACIFIC","en","Pacific Community (SPC)"),
        ("aus-dfat",       "https://www.dfat.gov.au/about-us/business-opportunities/grants",  "AU","en","Australian Dept of Foreign Affairs"),
        ("nz-mfat",        "https://www.mfat.govt.nz/en/aid-and-development/our-work/",       "NZ","en","NZ Ministry of Foreign Affairs"),
        ("aus-indigenous", "https://www.niaa.gov.au/grants",                                   "AU","en","National Indigenous Australians Agency"),
    ]
    for name, url, country, lang, funder in sources:
        html = await fetch(session, url)
        if not html: continue
        soup = BeautifulSoup(html, "lxml")
        for art in soup.select("article, .card, .grant, .opportunity, [class*='grant'], li"):
            t = art.find(["h2","h3","h4"]); a = art.find("a",href=True)
            if not t: continue
            title = t.get_text(strip=True)
            link = urljoin(url, a["href"]) if a else url
            text = art.get_text(" ")
            if not is_scrape_hit(title, text):
                continue
            cty = infer_country(text, lang)
            grants.append(make_grant(title=title, source_name=f"oceania:{name}", url=link,
                description=text[:MAX_DESCRIPTION_LEN], country=cty, language=lang,
                funder=funder, deadline=extract_deadline(text),
                amount_max=extract_amount(text)))
    console.print(f"  [cyan]Oceania funding[/] → {len(grants)}")
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
    "terraviva":      fetch_terraviva,
    "ofa":            fetch_ofa,
    # MENA art-activism funder
    "afac":           fetch_afac,
    # Brazil climate funder
    "ics":            fetch_ics,
    "opdesk":         fetch_opportunity_desk,
    "ofy":            fetch_opportunities_for_youth,
    "eflux":          fetch_eflux,
    "susart":         fetch_sustainable_practice,
    "impactfunding":  fetch_impactfunding_substack,
    "globalsouth":    fetch_global_south_opportunities,
    # LatAm
    "latam":          fetch_latam,
    # Africa
    "africa":         fetch_africa,
    # Asia
    "asia":           fetch_asia,
    # Francophone
    "francophone":    fetch_francophone,
    "hispanophone":   fetch_hispanophone,
    # Global env foundations
    "greengrants":    fetch_global_greengrants,
    "cepf_calls":     fetch_cepf_calls,
    "darwin":         fetch_darwin,
    "gates_gc":       fetch_gates_gc,
    "wellbeing":      fetch_wellbeing_economy,
    "ashoka":         fetch_ashoka,
    "globalenv":      fetch_global_env,
    # New foundations
    "pollination":    fetch_pollination_project,
    "globalgiving":   fetch_globalgiving,
    "nordic":         fetch_nordic_funding,
    "oceania":        fetch_oceania,
    # RSS mega-sweep (covers 55+ feeds)
    "rss":            fetch_rss,
}


# ══════════════════════════════════════════════════════════════
#  PIPELINE
# ══════════════════════════════════════════════════════════════

def deduplicate(grants):
    """Remove duplicate grants. Uses URL normalization + fuzzy title matching + content hash."""
    seen_u, seen_t, seen_h, result = set(), set(), set(), []

    def normalize_url(url):
        """Normalize URL for deduplication — strip tracking, fragments, trailing slashes."""
        u = url.lower().strip()
        # Remove common tracking parameters
        u = re.sub(r'[?&](utm_\w+|fbclid|gclid|mc_cid|mc_eid|ref|source|medium|campaign)=[^&]*', '', u)
        # Remove fragment
        u = u.split("#")[0]
        # Remove trailing slash
        u = u.rstrip("/")
        # Remove www. prefix
        u = re.sub(r'^https?://www\.', '', u)
        # Remove protocol for comparison
        u = re.sub(r'^https?://', '', u)
        # Remove trailing slashes again after normalization
        u = u.rstrip("/")
        return u

    def normalize_title(title):
        """Normalize title for fuzzy matching — lowercase, strip punctuation, truncate."""
        t = re.sub(r'[^\w\s]', '', title.lower())
        t = re.sub(r'\s+', ' ', t).strip()
        # Remove common suffixes/prefixes that don't affect identity
        for suffix in [" - grant", " - fellowship", " - scholarship", " - call for", " - open call"]:
            if t.endswith(suffix):
                t = t[:-len(suffix)]
        return t[:80]

    for g in sorted(grants, key=lambda x: x.get("priority_score", x["relevance"]), reverse=True):
        uk = normalize_url(g["url"])
        tk = normalize_title(g["title"])
        hk = g.get("content_hash", "")

        # Skip if URL already seen
        if uk in seen_u:
            continue

        # Skip if content hash already seen (same title+URL core)
        if hk and hk in seen_h:
            continue

        # Skip if title is very similar to an existing one (fuzzy match)
        is_dup = False
        for existing_t in seen_t:
            # Simple prefix match — if one title starts with the other
            if tk.startswith(existing_t) or existing_t.startswith(tk):
                is_dup = True
                break
            # Check for high word overlap (>80% shared words)
            if len(tk) > 20 and len(existing_t) > 20:
                tk_words = set(tk.split())
                et_words = set(existing_t.split())
                if len(tk_words) > 0 and len(et_words) > 0:
                    overlap = len(tk_words & et_words) / max(len(tk_words), len(et_words))
                    if overlap > 0.8:
                        is_dup = True
                        break

        if is_dup:
            continue

        seen_u.add(uk)
        seen_t.add(tk)
        if hk:
            seen_h.add(hk)
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
        "ASIA":   {"ASIA","JP","CN","KR","IN","TH","VN","ID","PH","TW","MY","SG","PK","BD","NP","LK","MM","KH","LA","MN","SEA","GLOBAL"},
        "NORDIC": {"NORDIC","EU","FI","SE","NO","DK","IS","GLOBAL"},
        "OCEANIA":{"AU","NZ","PACIFIC","OCEANIA","GLOBAL"},
    }
    include = mapping.get(cf, {cf, "GLOBAL"})
    return [g for g in grants if (g.get("country") or "").upper() in include]

def filter_by_keywords(grants, keywords):
    if not keywords: return grants
    kws = [k.strip().lower() for k in keywords.split(",") if k.strip()]
    if not kws: return grants
    return [g for g in grants if any(kw in f"{g['title']} {g['description']} {g['funder']}".lower() for kw in kws)]

def save_json(grants, path, meta=None):
    payload = {"generated": datetime.now(timezone.utc).isoformat(),
               "total": len(grants), "grants": grants}
    if meta:
        payload["meta"] = meta
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

def save_csv(grants, path):
    if not grants: return
    fields = ["id","title","grant_type","grant_types","highlights","priority_score","quality_score",
              "content_hash","funder","source","url","source_link","grant_link","url_status","url_status_code","description",
              "deadline","urgency","deadline_days","amount_max","amount_min","currency","amount_usd",
              "country","region","categories","language","relevance","status","fetched_at"]
    with open(path,"w",newline="",encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        w.writeheader(); w.writerows(grants)

def save_markdown(grants, path, title="Grants Radar"):
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines = [f"# {title}",f"",f"> Generated: {now} | Total: {len(grants)}",f"",f"---",f""]
    by_type = {}
    for g in grants:
        gt = g.get("grant_type","general")
        by_type.setdefault(gt,[]).append(g)
    type_emojis = {"artivism":"🎨","climate_justice":"🌍","conservation":"🌿","human_rights":"⚖️",
                   "indigenous_rights":"🏹","youth":"🌟","general":"📋"}
    for gt in sorted(by_type, key=lambda t: len(by_type[t]), reverse=True):
        items = sorted(by_type[gt], key=lambda x: x.get("priority_score", x["relevance"]), reverse=True)
        emoji = type_emojis.get(gt, "📌")
        lines += [f"## {emoji} {gt.replace('_',' ').title()} ({len(items)})",""]
        for g in items:
            hl = " ".join(f"`{h}`" for h in g.get("highlights",[]))
            dl  = f" · 📅 {g['deadline']}" if g.get("deadline") and g["deadline"] not in ("None","") else ""
            amt = f" · 💰 {g['amount_max']} {g.get('currency','')}" if g.get("amount_max") and g["amount_max"] not in ("None","") else ""
            country = f"🌍 {g['country']}" if g.get("country") else ""
            status_badge = "🔴" if g.get("status") == "closed" else "🟢"
            score_bar = "█"*min(10,g.get("priority_score",g["relevance"])//10)
            lines += [
                f"### {status_badge} [{g['title']}]({g['url']}) {hl}",
                f"**{g.get('funder') or g['source']}** · {country}{dl}{amt}",
                f"Priority: `{score_bar}` {g.get('priority_score',g['relevance'])}/100",
                f"",f"{g['description'][:300]}...",f"",f"---",f"",
            ]
    path.write_text("\n".join(lines), encoding="utf-8")

def print_table(grants):
    t = Table(title="🌱 Grants Radar — Results", show_header=True, header_style="bold green", min_width=100)
    t.add_column("Pri",  style="cyan",   width=4)
    t.add_column("Type",  style="blue",  width=12)
    t.add_column("Country", style="yellow", width=8)
    t.add_column("Title",   style="white",  width=40)
    t.add_column("Highlights", style="magenta", width=18)
    t.add_column("Amount", style="green",  width=10)
    t.add_column("Source",  style="dim",    width=16)
    for g in grants[:50]:
        hl = ",".join(g.get("highlights",[])[:3])
        amt = f"{g.get('currency','')} {g.get('amount_max','')}" if g.get("amount_max") and g["amount_max"] not in ("None","") else "—"
        t.add_row(str(g.get("priority_score", g["relevance"])),
                  g.get("grant_type","?")[:10],
                  g.get("country","?"),
                  g["title"][:38],
                  hl[:16],
                  amt[:10],
                  g["source"][:15])
    console.print(t)


# ══════════════════════════════════════════════════════════════
#  ORCHESTRATOR
# ══════════════════════════════════════════════════════════════

async def run_radar(sources_filter, country_filter, keywords, category_filter,
                   highlight_filter, urgent_only, min_amount,
                   refresh, min_relevance, output_prefix,
                   min_signals=MIN_SIGNALS_DEFAULT, verify_urls=True,
                   require_terms=True, exclude_closed=True, exclude_expired=True,
                   expired_grace_days=0):
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

    # ── v2 QUALITY PIPELINE ──────────────────────────────────────
    # 1. Drop invalid URLs + obvious non-grants at ingest (cheap, offline)
    pre = len(all_grants)
    all_grants = [g for g in all_grants
                  if is_valid_grant_url(g.get("url", ""))
                  and not is_likely_non_grant(g.get("title", ""), g.get("description", ""))
                  and not is_likely_job(g.get("title", ""), g.get("description", ""))
                  and (g.get("title", "").strip().lower() not in GENERIC_NAV_TITLES)]
    console.print(f"[green]✓ URL/shape gate:[/] {len(all_grants)} kept ({pre - len(all_grants)} dropped)")

    unique    = deduplicate(all_grants)

    # 2. Verify URLs live (HEAD → GET fallback; flags broken/login walls)
    url_dropped = []
    if verify_urls and unique:
        connector2 = aiohttp.TCPConnector(limit=MAX_CONCURRENT, ssl=False)
        async with aiohttp.ClientSession(connector=connector2,
                                         timeout=aiohttp.ClientTimeout(total=120)) as vsession:
            unique, url_dropped = await verify_grant_urls(vsession, unique)
        console.print(f"[green]✓ URL verify:[/] {len(unique)} ok, {len(url_dropped)} broken/walled")

    # 3. Grant-vocabulary gate: require grant terms OR (deadline + amount)
    if require_terms:
        pre = len(unique)
        gated = []
        for g in unique:
            blob = f"{g.get('title','')} {g.get('description','')} {g.get('funder','')}"
            has_terms = bool(GRANT_TERMS_RE.search(blob))
            has_both = bool(g.get("deadline")) and bool(g.get("amount_max"))
            if has_terms or has_both:
                gated.append(g)
        unique = gated
        console.print(f"[green]✓ Grant-terms gate:[/] {len(unique)} kept ({pre - len(unique)} dropped)")

    filtered  = filter_by_country(unique, country_filter)
    filtered  = filter_by_keywords(filtered, keywords)

    # Category filter
    if category_filter:
        cats = [c.strip() for c in category_filter.split(",")]
        filtered = [g for g in filtered if any(c in (g.get("grant_types") or [g.get("grant_type","")]) for c in cats)]

    # Highlight filter
    if highlight_filter:
        hls = [h.strip().upper() for h in highlight_filter.split(",")]
        filtered = [g for g in filtered if any(h in (g.get("highlights") or []) for h in hls)]

    # Urgent only
    if urgent_only:
        filtered = [g for g in filtered if g.get("urgency") == "urgent"]

    # Min amount
    if min_amount:
        filtered = [g for g in filtered if (g.get("amount_usd") or 0) >= min_amount]

    # v2.2 completeness exemption: a fully-evidenced grant (deadline +
    # amount + grant vocabulary) is kept even when mission-relevance is
    # low — it lands at the bottom by priority, managers decide. Partial
    # items still need topical relevance.
    def _complete(g):
        if not (g.get("deadline") and g.get("amount_max")):
            return False
        return bool(GRANT_TERMS_RE.search(
            f"{g.get('title', '')} {g.get('description', '')} {g.get('funder', '')}"))

    filtered = [g for g in filtered
                if g["relevance"] >= min_relevance or _complete(g)]
    # Signal gate: has_grant_signals() must clear the bar (deadline/amount/
    # grant-terms/currency evidence).
    pre = len(filtered)
    filtered = [g for g in filtered
                if has_grant_signals(g.get("title", ""), g.get("description", ""),
                                     g.get("deadline", ""), g.get("amount_max", "")) >= min_signals]
    console.print(f"[green]✓ Signal gate (≥{min_signals}):[/] {len(filtered)} kept ({pre - len(filtered)} dropped)")
    # 4. Temporal gate (v2.4): never ship dead calls. Drops grants whose
    # page says CLOSED and grants whose deadline already passed as of right
    # now — these used to leak into Supabase (e.g. rows with deadline_days
    # of -175). Rolling / dateless grants are KEPT (unknown ≠ closed).
    # Disable explicitly with --include-closed / --include-expired.
    excluded_closed, excluded_expired = 0, 0
    if exclude_closed or exclude_expired:
        alive = []
        for g in filtered:
            reason = temporal_exclude_reason(g, grace_days=expired_grace_days)
            if reason == "closed" and exclude_closed:
                excluded_closed += 1
                continue
            if reason == "deadline-passed" and exclude_expired:
                excluded_expired += 1
                continue
            alive.append(g)
        filtered = alive
        console.print(f"[green]✓ Temporal gate:[/] {len(filtered)} alive "
                      f"({excluded_closed} closed + {excluded_expired} deadline-passed dropped)")
    filtered.sort(key=lambda x: x.get("priority_score", x["relevance"]), reverse=True)
    # ── Quality report (feeds CI summary + Supabase quality_score) ──
    n_dl = sum(1 for g in filtered if g.get("deadline"))
    n_amt = sum(1 for g in filtered if g.get("amount_max"))
    n_both = sum(1 for g in filtered if g.get("deadline") and g.get("amount_max"))
    status_counts: dict = {}
    urgency_counts: dict = {}
    for g in filtered:
        status_counts[g.get("status") or "unknown"] = status_counts.get(g.get("status") or "unknown", 0) + 1
        urgency_counts[g.get("urgency") or "unknown"] = urgency_counts.get(g.get("urgency") or "unknown", 0) + 1
    console.print(f"[green]✓ Final:[/] {len(filtered)} relevant grants "
                  f"({n_dl} w/ deadline, {n_amt} w/ amount, {n_both} w/ both)\n")
    run_meta = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total": len(filtered),
        "with_deadline": n_dl,
        "with_amount": n_amt,
        "with_both": n_both,
        "status_counts": status_counts,
        "urgency_counts": urgency_counts,
        "excluded_closed": excluded_closed,
        "excluded_expired": excluded_expired,
        "exclude_closed": exclude_closed,
        "exclude_expired": exclude_expired,
        "expired_grace_days": expired_grace_days,
        "sources_scraped": len(active),
    }

    ts     = datetime.now().strftime("%Y%m%d_%H%M")
    prefix = f"{output_prefix}_{ts}" if output_prefix else f"grants_radar_{ts}"

    save_json(filtered,     OUTPUT_DIR / f"{prefix}.json", meta=run_meta)
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
@click.option("--category", "-g", default=None,
              help="Grant type: artivism, climate_justice, conservation, human_rights, indigenous_rights, youth, general")
@click.option("--highlight", "-hl", default=None,
              help="Highlight filter: EG_CORE, URGENT, SOON, HIGH_VALUE, ARTIVISM, CLIMATE, INDIGENOUS, OPEN, CLOSED")
@click.option("--urgent",   "-u", is_flag=True,
              help="Show only grants closing within 30 days")
@click.option("--min-amount", "--ma", default=None, type=int,
              help="Minimum grant amount in USD")
@click.option("--refresh",  "-r", is_flag=True,
              help="Clear cache and force re-fetch")
@click.option("--min-score","-m", default=MIN_RELEVANCE_DEFAULT, type=int,
              help=f"Min relevance score 0–100 (default {MIN_RELEVANCE_DEFAULT})")
@click.option("--min-signals", default=MIN_SIGNALS_DEFAULT, type=int,
              help=f"Min grant-signal score 0–53 (default {MIN_SIGNALS_DEFAULT})")
@click.option("--verify-urls/--no-verify-urls", default=True,
              help="HEAD/GET-check every URL; drop broken + login walls (default on)")
@click.option("--require-terms/--no-require-terms", default=True,
              help="Require grant vocabulary or deadline+amount (default on)")
@click.option("--output",   "-o", default="grants_radar",
              help="Output file prefix")
@click.option("--list-sources", is_flag=True)
@click.option("--list-types", is_flag=True,
              help="Show available grant types and highlights")
@click.option("--include-closed", is_flag=True,
              help="Keep grants whose page says CLOSED (dropped by default)")
@click.option("--include-expired", is_flag=True,
              help="Keep grants whose deadline already passed (dropped by default)")
@click.option("--expired-grace-days", default=0, type=int,
              help="Grace window in days: deadlines this recent still ship (default 0)")
def main(country, sources, keywords, category, highlight, urgent, min_amount,
         refresh, min_score, min_signals, verify_urls, require_terms,
         output, list_sources, list_types,
         include_closed, include_expired, expired_grace_days):
    """
    \b
    GRANTS RADAR v2 — Earth Guardians South America
    No US government sources. Community-first, global.

    Examples:
      python grants_radar.py
      python grants_radar.py --country BR
      python grants_radar.py --country LATAM --keywords "amazônia,artivismo"
      python grants_radar.py --sources capta,casa,ycjf,rss
      python grants_radar.py --category artivism --urgent
      python grants_radar.py --highlight EG_CORE,HIGH_VALUE --min-amount 10000
      python grants_radar.py --refresh --min-score 20
    """
    if list_types:
        console.print("[bold]Grant types:[/] artivism, climate_justice, conservation, human_rights, indigenous_rights, youth, general")
        console.print("[bold]Highlights:[/] EG_CORE, URGENT, SOON, HIGH_VALUE, GOOD_VALUE, ARTIVISM, CLIMATE, INDIGENOUS, OPEN, CLOSED, SCHOLARSHIP")
        return
    if list_sources:
        console.print("[bold]Available sources:[/]")
        for k in ALL_SOURCES:
            console.print(f"  [cyan]{k}[/]")
        return
    logging.basicConfig(
        filename=LOG_DIR/f"radar_{datetime.now().strftime('%Y%m%d')}.log",
        level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    asyncio.run(run_radar(sources, country, keywords, category, highlight, urgent, min_amount, refresh, min_score, output,
                          min_signals=min_signals, verify_urls=verify_urls, require_terms=require_terms,
                          exclude_closed=not include_closed, exclude_expired=not include_expired,
                          expired_grace_days=expired_grace_days))

if __name__ == "__main__":
    main()
