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
    "UY": "LATAM", "LATAM": "LATAM",
    "EU": "EUROPE", "FR": "EUROPE", "ES": "EUROPE", "DE": "EUROPE", "IT": "EUROPE",
    "PT": "EUROPE", "UK": "EUROPE", "GB": "EUROPE", "NORDIC": "EUROPE",
    "AFRICA": "AFRICA", "ASIA": "ASIA", "JP": "ASIA", "CN": "ASIA", "KR": "ASIA",
    "IN": "ASIA", "TH": "ASIA", "VN": "ASIA", "ID": "ASIA", "PH": "ASIA",
    "TW": "ASIA", "MY": "ASIA", "SG": "ASIA", "SEA": "ASIA",
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
]

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

def score_relevance(text: str, is_standing: bool = False) -> int:
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
    # Moderate penalty for standing entries — they're valid reference grants, not just SEO
    if is_standing:
        hits = min(hits, 40)
        hits = int(hits * 0.5)
    return min(100, hits)


def parse_amount_value(amount_max, currency):
    """Return numeric value in approximate USD for ranking. Handles BRL, EUR, GBP, JPY, INR, KRW, CNY, THB, IDR, and more."""
    if not amount_max or amount_max in ("None", ""):
        return 0
    raw = str(amount_max)
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
    # Handle "million", "thousand", "k", "万", "億" suffixes
    m = re.search(r'([\d,]+(?:\.\d+)?)\s*(million|milhão|mil|thousand|k|万|億|mrd|billion|bn)', raw, re.I)
    if m:
        num = float(m.group(1).replace(",", ""))
        suffix = m.group(2).lower()
        if suffix in ("million", "milhão"):
            num *= 1000000
        elif suffix in ("thousand", "mil", "k"):
            num *= 1000
        elif suffix in ("万",):
            num *= 10000
        elif suffix in ("億",):
            num *= 100000000
        elif suffix in ("mrd", "billion", "bn"):
            num *= 1000000000
        return num
    # Try to extract raw number
    try:
        val = float(re.sub(r"[^0-9.]", "", raw))
    except (ValueError, TypeError):
        return 0
    if not currency:
        return val
    c = currency.upper()
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
    if c in rates:
        return val / rates[c]
    return val


def compute_deadline_urgency(deadline_str):
    """Return days until deadline and urgency label."""
    if not deadline_str or deadline_str in ("None", ""):
        return None, "unknown"
    for fmt in [
        "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d",
        "%B %d, %Y", "%d %B %Y", "%B %Y",
    ]:
        try:
            dt = datetime.strptime(deadline_str.split("T")[0].split(" ")[0], fmt)
            today = datetime.now(timezone.utc).replace(tzinfo=None)
            delta = (dt - today).days
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

def make_grant(title, source_name, url, description="", funder="",
               deadline="", amount_max="", amount_min="", currency="",
               country="", region="", categories=None, language="en",
               status="open", is_standing=False):
    uid = hashlib.md5(f"{source_name}::{url}".encode()).hexdigest()[:12]
    blob = f"{title} {description} {funder}".lower()

    base_relevance = score_relevance(blob, is_standing=is_standing)
    # Heavy penalty for likely non-grant posts (news, results, etc.)
    if is_likely_non_grant(title, description):
        base_relevance = min(base_relevance, 10)
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
    # Penalize standing entries in priority (less aggressive — they're valid reference grants)
    if is_standing:
        priority = int(priority * 0.6)

    days, urgency = compute_deadline_urgency(deadline)

    return {
        "id":              uid,
        "title":           title.strip(),
        "funder":          funder.strip(),
        "source":          source_name,
        "url":             url,
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
        "priority_score":  priority,
        "fetched_at":      datetime.now(timezone.utc).isoformat(),
        "status":          status,         # open/closed/unknown (grant's temporal state)
        "is_standing":     is_standing,    # true for hardcoded reference entries
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

def parse_date(s):
    if not s: return ""
    try: return dateparser.parse(str(s), fuzzy=True).date().isoformat()
    except (ValueError, OverflowError) as e:
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

def extract_amount(text):
    """Extract first currency amount from text. Handles ranges, multiple currencies, edge cases."""
    if not text:
        return ""
    # ── Brazilian Real (BRL) — most common in this scraper ──
    # Range: "R$ 50.000,00 a R$ 200.000,00" or "R$50.000 a R$200.000"
    m_brl_range = re.search(
        r'R\$\s*([\d\.]+(?:,\d{2})?)\s*(?:a|até|–|-)\s*R\$\s*([\d\.]+(?:,\d{2})?)', text)
    if m_brl_range:
        return f"R$ {m_brl_range.group(1)} – R$ {m_brl_range.group(2)}"
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
    m = re.search(
        r'(€|USD?\s*[\d]|EUR?\s*[\d]|GBP?\s*[\d]|£|¥|JPY|CNY?|₹|INR?|₩|KRW|฿|THB?|Rp|IDR?|RM|MYR?|PHP?|SGD?|CAD?|AUD?|NZD?|CHF?|SEK?|NOK?|DKK?)'
        r'\s*([\d,\.]+(?:\s*(?:million|mil|thousand|万|億|lakh|crore))?)', text, re.I)
    if m:
        raw = m.group(0).strip()
        # Avoid matching single digits like "$1" unless followed by more
        num_part = re.search(r'[\d,\.]+', raw)
        if num_part and len(num_part.group().replace(',','').replace('.','')) >= 2:
            return raw

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

    # ── "from X to Y" patterns ──
    m_from_to = re.search(r'(?:from|de|von|da)\s*(?:R\$\s*|US\$\s*|\$\s*|€\s*|£\s*)?([\d,\.]+)\s*(?:to|a|até|bis|fino a)\s*(?:R\$\s*|US\$\s*|\$\s*|€\с*|£\s*)?([\d,\.]+)', text, re.I)
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

    # ── "closing soon" / "próximo" / "em breve" / "bald" / "prossimamente" — assume 14 days ──
    if re.search(r'(?:closing\s+soon|pr[oó]xim[oa]|em\s+breve|soon|urgent|bald|prossimamente|prochainement|pr[oó]xim[oa])', blob):
        return (today + timedelta(days=14)).strftime("%Y-%m-%d")

    # ══════════════════════════════════════════════════════════
    # ABSOLUTE DATE PATTERNS
    # ══════════════════════════════════════════════════════════
    patterns = [
        # English
        r'[Dd]eadline[:\s]+([A-Za-z]+ \d{1,2},?\s*\d{4})',
        r'[Dd]eadline[:\s]+(\d{1,2}\s+[A-Za-z]+\s+\d{4})',
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
        # DD/MM/YYYY
        r'(\d{2}/\d{2}/\d{4})',
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
            return parse_date(m.group(1) if m.lastindex else m.group(0))
    return ""

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
        # ── Nordic ──
        "SE": ["sweden","sverige","stockholm","göteborg"],
        "NO": ["norway","norge","noreg","oslo","bergen"],
        "DK": ["denmark","danmark","copenhagen","københavn"],
        "FI": ["finland","suomi","helsinki","turku"],
        "IS": ["iceland","ísland","reykjavik"],
        # ── Americas ──
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
    if lang == "fr": return "FR" if "france" in text_lower else "EU"
    if lang == "es":
        for country, hints in regions.items():
            if any(h in text_lower for h in hints):
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
        if any(h in text_lower for h in hints):
            return country
    # Fall back to regions
    for country, hints in regions.items():
        if country not in ("EU","LATAM","AFRICA","ASIA","OCEANIA"):
            continue
        if any(h in text_lower for h in hints):
            return country
    return "GLOBAL"


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
            if score_relevance(f"{title} {content}") < 2: continue
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
                if score_relevance(title) < 1: continue
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
                if score_relevance(f"{title} {content}") < 3: continue
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
            if score_relevance(f"{title} {content}") < 2: continue
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
        country="EU", language="en", currency="EUR", status="unknown", is_standing=True,
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
        country="EU", language="en", currency="EUR", status="unknown", is_standing=True,
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
        country="EU", language="en", currency="EUR", status="unknown", is_standing=True,
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
        currency="EUR", status="unknown", is_standing=True,
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
        country="GLOBAL", language="en", status="unknown", is_standing=True,
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
            if len(title) < 10: continue
            link = urljoin("https://commonwealthfoundation.com", a["href"]) if a else url
            text = art.get_text(" ")
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
            desc  = clean_html(e.get("summary",""))
            grants.append(make_grant(title=title, source_name=f"{SOURCE}:rss", url=link,
                description=desc[:MAX_DESCRIPTION_LEN], country="GLOBAL",
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
        country="GLOBAL", language="en", is_standing=True,
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
        country="GLOBAL", language="en", status="unknown", is_standing=True,
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
        country="GLOBAL", language="en", status="unknown", is_standing=True,
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
            content = clean_html(p.get("content",{}).get("rendered",""))
            url     = p.get("link","")
            if score_relevance(f"{title} {content}") < 4: continue
            grants.append(make_grant(title=title, source_name=SOURCE, url=url,
                description=content[:MAX_DESCRIPTION_LEN], country="GLOBAL", language="en",
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
                description=text[:MAX_DESCRIPTION_LEN], country="GLOBAL", language="en",
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
            if score_relevance(f"{title} {desc}") < 2: continue
            grants.append(make_grant(title=title, source_name=SOURCE, url=link,
                description=desc[:MAX_DESCRIPTION_LEN], country="GLOBAL", language="en",
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
            if score_relevance(f"{title} {desc} {' '.join(tags)}") < 2: continue
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
                categories=tags[:5]))
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
        country="GLOBAL", language="en", status="unknown", is_standing=True,
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
            grants.append(make_grant(title=title, source_name=SOURCE, url=url,
                description=text, country="GLOBAL", language="en",
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
            if score_relevance(f"{title} {desc}") < 2: continue
            grants.append(make_grant(title=title, source_name=SOURCE, url=link,
                description=desc[:MAX_DESCRIPTION_LEN], country="GLOBAL", language="en",
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
            if score_relevance(f"{title} {desc}") < 2: continue
            grants.append(make_grant(title=title, source_name=SOURCE, url=link,
                description=desc[:MAX_DESCRIPTION_LEN], country="GLOBAL", language="en",
                deadline=extract_deadline(desc), amount_max=extract_amount(desc),
                categories=["global south","development","environment"]))
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
        country="LATAM", language="es", status="unknown", is_standing=True,
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
        country="LATAM", language="en", status="unknown", is_standing=True,
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
        country="AFRICA", language="en", status="unknown", is_standing=True,
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
        country="AFRICA", language="en", status="unknown", is_standing=True,
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
    ("The Conversation Env",       "https://theconversation.com/us/environment/articles/feed",        "GLOBAL","en"),
    ("Mongabay",                   "https://feeds.feedburner.com/mongabay",                           "GLOBAL","en"),

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
                desc  = clean_html(e.get("summary") or e.get("description",""))
                blob  = f"{title} {desc}".lower()
                if score_relevance(blob) < 3: continue
                result.append(make_grant(title=title, source_name=f"rss:{name}",
                    url=link, description=desc[:MAX_DESCRIPTION_LEN], country=country,
                    language=lang, deadline="",
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
        country="GLOBAL", language="en", currency="USD", status="unknown", is_standing=True,
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
        country="GLOBAL", language="en", status="unknown", is_standing=True,
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
            if len(title) < 6: continue
            url  = urljoin("https://www.changemakers.com", a["href"]) if a else "https://www.changemakers.com"
            text = art.get_text(" ")
            if score_relevance(f"{title} {text}") < 3: continue
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
        country="GLOBAL", language="en", status="unknown", is_standing=True,
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
        country="FR", language="fr", currency="EUR", status="unknown", is_standing=True,
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
        country="FR", language="fr", currency="EUR", status="unknown", is_standing=True,
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
        country="ES", language="es", currency="EUR", status="unknown", is_standing=True,
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
        country="ES", language="es", currency="EUR", status="unknown", is_standing=True,
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
            if len(title) < 10: continue
            link = urljoin(url, a["href"]) if a else url
            text = art.get_text(" ")
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
        country="ASIA", language="en", status="unknown", is_standing=True,
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
        country="IN", language="en", status="unknown", is_standing=True,
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
        country="ASIA", language="en", status="unknown", is_standing=True,
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
        country="GLOBAL", language="en", currency="USD", status="unknown", is_standing=True,
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
        country="GLOBAL", language="en", currency="USD", status="unknown", is_standing=True,
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
            if len(title) < 8: continue
            link = urljoin(url, a["href"]) if a else url
            text = art.get_text(" ")
            if score_relevance(f"{title} {text}") < 2: continue
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
            if len(title) < 8: continue
            link = urljoin(url, a["href"]) if a else url
            text = art.get_text(" ")
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
    """Remove duplicate grants. Uses URL normalization + fuzzy title matching."""
    seen_u, seen_t, result = set(), set(), []

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

        # Skip if URL already seen
        if uk in seen_u:
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

def save_json(grants, path):
    with open(path,"w",encoding="utf-8") as f:
        json.dump({"generated":datetime.now(timezone.utc).isoformat(),
                   "total":len(grants),"grants":grants}, f, ensure_ascii=False, indent=2)

def save_csv(grants, path):
    if not grants: return
    fields = ["id","title","grant_type","grant_types","highlights","priority_score","funder","source","url","description",
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

async def run_radar(sources_filter, country_filter, keywords,
                   category_filter, highlight_filter, urgent_only, min_amount,
                   refresh, min_relevance, output_prefix, include_standing=False):
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

    unique    = deduplicate(all_grants)
    # By default, exclude standing/reference entries from output
    if not include_standing:
        unique = [g for g in unique if not g.get("is_standing", False)]
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

    filtered = [g for g in filtered if g["relevance"] >= min_relevance]
    filtered.sort(key=lambda x: x.get("priority_score", x["relevance"]), reverse=True)
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
@click.option("--min-score","-m", default=5, type=int,
              help="Min relevance score 0–100 (default 5)")
@click.option("--output",   "-o", default="grants_radar",
              help="Output file prefix")
@click.option("--list-sources", is_flag=True)
@click.option("--list-types", is_flag=True,
              help="Show available grant types and highlights")
@click.option("--include-standing", is_flag=True,
              help="Include reference/standing entries (omitted by default)")
def main(country, sources, keywords, category, highlight, urgent, min_amount,
         refresh, min_score, output, list_sources, list_types, include_standing):
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
    asyncio.run(run_radar(sources, country, keywords, category, highlight, urgent, min_amount, refresh, min_score, output, include_standing))

if __name__ == "__main__":
    main()
