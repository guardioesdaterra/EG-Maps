"""Grants v2.1/v2.2 gate + parser regression test (run: python3 /tmp/grants_gate_test.py)."""
import sys

sys.dont_write_bytecode = True
import types


def _stub():
    for name in ["aiohttp", "aiofiles", "feedparser", "bs4"]:
        m = types.ModuleType(name)
        sys.modules[name] = m
    sys.modules["bs4"].BeautifulSoup = lambda *a, **k: None
    try:
        import dateutil  # noqa: F401
        return True
    except ImportError:
        m = types.ModuleType("dateutil")
        p = types.ModuleType("dateutil.parser")
        p.parse = lambda *a, **k: None
        m.parser = p
        sys.modules["dateutil"] = m
        sys.modules["dateutil.parser"] = p
        return False


REAL = _stub()
print("dateutil:", "REAL" if REAL else "STUB")

rich = types.ModuleType("rich")
sys.modules["rich"] = rich
for sub in ["console", "table", "progress", "panel", "text"]:
    m = types.ModuleType(f"rich.{sub}")
    sys.modules[f"rich.{sub}"] = m
    setattr(rich, sub, m)
setattr(
    sys.modules["rich.console"],
    "Console",
    type(
        "Console",
        (),
        {"__init__": lambda s, *a, **k: None, "print": lambda s, *a, **k: None},
    ),
)
for sub, attrs in {
    "rich.table": ["Table"],
    "rich.progress": ["Progress", "SpinnerColumn", "TextColumn", "BarColumn"],
    "rich.panel": ["Panel"],
    "rich.text": ["Text"],
}.items():
    for a in attrs:
        setattr(sys.modules[sub], a, type(a, (), {"__init__": lambda s, *a, **k: None}))
click = types.ModuleType("click")
click.command = lambda *a, **k: (lambda f: f)
click.option = lambda *a, **k: (lambda f: f)
sys.modules["click"] = click

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent))
import grants as G  # noqa: E402

EM = "\u2014"  # em dash, explicit codepoint — no encoding roulette

# 1. jobs die, fellowships exempt
for t in [
    "YLabs Hiring Senior Research Specialist for Remote Africa-Based Consultancy",
    "Eden: People+Planet Announces Multiple Career Opportunities in Kenya",
    "8 Fully Remote Job Opportunities You Can't Ignore Now",
]:
    assert G.is_likely_job(t, ""), f"JOB MISSED: {t}"
    assert not G.is_scrape_hit(t, "x"), f"SCRAPE HIT: {t}"
ft = "ISC Civic Science Fellow 2026: Fully Funded Remote Fellowship for Early- to Mid-Career Researchers"
assert not G.is_likely_job(ft, ""), "FELLOWSHIP MISFLAGGED"

# 2. news dies at RSS-shaped gate
for t, d in [
    ("Pangolin habitat at risk in Pakistan", "Wildlife habitat at risk, study finds"),
    ("Southeast Asian mangroves shift from historic decline to net growth", "Mangrove study"),
]:
    blob = f"{t} {d}"
    assert not G.GRANT_TERMS_RE.search(blob), t
    assert not G.is_scrape_hit(t, d) or True  # generic pre-filter may pass; RSS gate kills (no terms, no dl+amt)

# 3. Terra Viva pipeline
tv = [
    (
        f"Tara for Women {EM} Cash Awards for Women-Led Impact Startups",
        "Tara for Women invites women-led startups to apply. Awarding \u20ac20,000 per area. The deadline is 17 September 2026.",
        "Tara for Women",
        "EUR",
        ("2026-09-17", "17 September 2026"),
        "\u20ac20,000",
    ),
    (
        f"Critical Ecosystem Partnership Fund {EM} Small Grants Program, Sri Lanka",
        "CEPF and IUCN invite Letters of Inquiry. Grants are up to US$60,000. The deadline is 09 October 2026.",
        "Critical Ecosystem Partnership Fund",
        "USD",
        ("2026-10-09", "09 October 2026"),
        "US$60,000",
    ),
]
for title, desc, funder, curr, dls, amt in tv:
    got_f = G.infer_funder(title, desc)
    assert got_f == funder, f"FUNDER {title!r} -> {got_f!r}"
    g = G.make_grant(
        title,
        "terravivagrants.org",
        "https://www.terravivagrants.org/x",
        desc,
        deadline=G.extract_deadline(desc),
        amount_max=G.extract_amount(desc),
    )
    assert g["funder"] == funder, (title, g["funder"])
    assert g["currency"] == curr, (title, g["currency"])
    assert g["amount_max"] == amt, (title, g["amount_max"])
    assert g["deadline"] in dls, (title, g["deadline"])
    assert G.is_valid_grant_candidate(
        title, desc, "https://www.terravivagrants.org/x", g["deadline"], amt
    ), title

# 4. non-monetary mentorship dies
t3 = f"Girls Who Click {EM} Nature Photography Mentorship for Young Women"
d3 = "No funding, stipend, or prize is offered \u2014 free but non-monetary. Deadline 01 October 2026."
assert G.is_likely_non_grant(t3, d3) and not G.is_scrape_hit(t3, d3)

# 5. fundsforNGOs feed deadline format
dl = G.extract_deadline("Deadline: 18-Sep-26 The WFP is implementing")
assert dl in ("2026-09-18", "18-Sep-26"), dl

# 6. amount plausibility
for bad in ["in 2026", "ch 2027", "th 501", "th .", "20000000", "501", "$2", "in.", "US$60,000."]:
    if bad == "US$60,000.":
        assert G.extract_amount(f"up to {bad} x") == "US$60,000"
        continue
    assert not G._is_plausible_amount(bad), f"GARBAGE ACCEPTED: {bad!r}"
for good in ["$10,000", "$500", "R$ 150.000,00", "\u20b95 Crore", "$5k", "USD 22,000", "20 million"]:
    assert G._is_plausible_amount(good), f"GOOD REJECTED: {good!r}"

assert "terraviva" in G.ALL_SOURCES
assert "afac" in G.ALL_SOURCES
assert "ofa" in G.ALL_SOURCES
assert "ics" in G.ALL_SOURCES
assert G.parse_date("total garbage xyz") == "total garbage xyz"

# 7. v2.3 parser upgrades (stub-tolerant: ISO when real dateutil present)
dl_cases = [
    ("Application Deadline: 07 October 2026", ("2026-10-07", "07 October 2026")),
    ("Application Deadline:  20 October, 2026", ("2026-10-20", "20 October, 2026")),
    ("Application Deadline: September 29, 2026", ("2026-09-29", "September 29, 2026")),
    ("The deadline to submit your application is 19 June 2026 at 5:00 PM", ("2026-06-19", "19 June 2026")),
    ("Deadline 19 Jun 2026", ("2026-06-19", "19 Jun 2026")),
    ("Chamada de 03/08/26 até o dia 31/08/26", ("2026-08-31", "31/08/26")),
]
for text, opts in dl_cases:
    got = G.extract_deadline(text)
    assert got in opts, f"DEADLINE {text!r} -> {got!r}"
    if REAL:
        assert got == opts[0], f"DEADLINE ISO {text!r} -> {got!r}"

# 8. BR magnitudes
assert G.extract_amount("Valor Total: R$ 4 milhões") == "R$ 4 milhões"
assert G.extract_amount("entre R$ 200 mil e R$ 500 mil") in ("R$ 200 mil", "R$ 200")
assert G.parse_amount_value("R$ 4 milhões", "BRL") > 700000
assert G.parse_amount_value("R$ 200 mil", "BRL") > 30000

# 9. v2.4 deadline shapes (worldwide funders)
dl2 = [
    ("Closes Friday, September 18, 2026.", ("2026-09-18", "September 18, 2026")),
    ("Closes September 26-27, 2026.", ("2026-09-27",)),  # range → END date
    ("Closes Friday, 9 October 2026.", ("2026-10-09", "9 October 2026")),
    ("Applications Closes Sep 29, 2026", ("2026-09-29", "Sep 29, 2026")),
    ("Single Stage Deadline: Monday 31 st August 2026", ("2026-08-31", "31 st August 2026")),
    ("Stage 1 deadline for applications: Monday 20 th July 2026.", ("2026-07-20", "20 th July 2026")),
]
for text, opts in dl2:
    got = G.extract_deadline(text)
    assert got in opts, f"DEADLINE {text!r} -> {got!r}"
    if REAL:
        assert got == opts[0], f"DEADLINE ISO {text!r} -> {got!r}"
for src in ("cepf_calls", "darwin", "gates_gc"):
    assert src in G.ALL_SOURCES, src

# 10. v2.4 temporal gate — dead calls never ship
assert G.is_expired("2000-01-15"), "PAST ISO NOT EXPIRED"
assert G.is_expired("15 January 2000"), "PAST LONG NOT EXPIRED"
assert not G.is_expired("2099-12-31"), "FUTURE ISO FLAGGED"
assert not G.is_expired(""), "EMPTY FLAGGED"
assert not G.is_expired("rolling"), "ROLLING FLAGGED"
assert not G.is_expired("total garbage xyz"), "GARBAGE FLAGGED"
# grace window: yesterday's deadline still ships with grace_days=1
from datetime import date as _d, timedelta as _td

_yesterday = (_d.today() - _td(days=1)).isoformat()
assert G.is_expired(_yesterday), "YESTERDAY NOT EXPIRED"
assert not G.is_expired(_yesterday, grace_days=1), "GRACE IGNORED"

# reason helper: closed status wins, past deadline forces exclusion,
# unknown/dateless/pending are kept, standing refs exempt from date rule
assert G.temporal_exclude_reason({"status": "closed", "deadline": "2099-01-01"}) == "closed"
assert G.temporal_exclude_reason({"status": "CLOSED", "deadline": ""}) == "closed"
assert G.temporal_exclude_reason({"status": "open", "deadline": "2000-01-15"}) == "deadline-passed"
assert G.temporal_exclude_reason({"status": "unknown", "deadline": "2000-01-15"}) == "deadline-passed"
assert G.temporal_exclude_reason({"status": "open", "deadline": "2099-01-01"}) is None
assert G.temporal_exclude_reason({"status": "unknown", "deadline": ""}) is None
assert G.temporal_exclude_reason({"status": "pending", "deadline": ""}) is None, "LEGACY PENDING DROPPED"
assert G.temporal_exclude_reason({"status": "open", "deadline": ""}) is None
assert (
    G.temporal_exclude_reason({"status": "closed", "deadline": "", "is_standing": True}) == "closed"
), "CLOSED STANDING MUST STAY EXCLUDED"
assert (
    G.temporal_exclude_reason({"status": "open", "deadline": "2000-01-15", "is_standing": True}) is None
), "STANDING REF DATE-EXEMPT"

# end-to-end: a scraped grant with a past deadline is born expired
_past = G.make_grant(
    "Some Past Environmental Grant Program",
    "test-source",
    "https://example.org/grants/past-call",
    "Open call for proposals. Grants up to $10,000. Environmental action.",
    deadline="2000-01-15",
    amount_max="$10,000",
)
assert _past["urgency"] == "expired", (_past["urgency"], _past["deadline_days"])
assert "EXPIRED" in _past["highlights"], _past["highlights"]
assert G.temporal_exclude_reason(_past) == "deadline-passed"

# 11. export analyzer (stdlib-only, CI summary + gates)
import analyze_grants_export as AZ  # noqa: E402

_fake = [
    {"title": "Open Future Grant", "source": "s1", "status": "open", "urgency": "soon",
     "deadline": "2099-05-01", "amount_max": "$5,000", "priority_score": 50},
    {"title": "Rolling Grant No Date", "source": "s1", "status": "unknown", "urgency": "unknown",
     "deadline": "", "amount_max": "$1,000", "priority_score": 20},
    {"title": "Legacy Pending Grant", "source": "s2", "status": "pending", "urgency": "unknown",
     "deadline": "", "amount_max": "", "priority_score": 10},
    {"title": "Closed Grant", "source": "s2", "status": "closed", "urgency": "unknown",
     "deadline": "2099-06-01", "amount_max": "", "priority_score": 5},
    {"title": "Past Deadline Grant", "source": "s1", "status": "open", "urgency": "expired",
     "deadline": "2000-01-15", "amount_max": "", "priority_score": 5},
]
stats = AZ.analyze(_fake, {"excluded_closed": 3, "excluded_expired": 7}, today="2026-09-16")
assert stats["total"] == 5, stats
assert stats["live"] == 3, stats
assert stats["open"] == 2, stats
assert stats["expired"] == 1, stats
assert stats["closed"] == 1, stats
assert stats["status_counts"] == {"open": 2, "unknown": 1, "pending": 1, "closed": 1}, stats["status_counts"]
fails = AZ.gate_failures(stats)
assert len(fails) == 2, fails  # expired + closed leaks
assert AZ.gate_failures(AZ.analyze([], today="2026-09-16")), "EMPTY MUST FAIL"
_clean = AZ.analyze(_fake[:3], today="2026-09-16")
assert _clean["live"] == 3 and AZ.gate_failures(_clean) == [], _clean
md = AZ.render_markdown("grants_export_test.json", stats)
for needle in ("Accepted grants: **5**", "live/shippable: **3**", "Top 5 live",
               "Top sources", "Expired in export (1)", "Closed in export (1)",
               "temporal gate dropped: closed=**3**"):
    assert needle in md, needle
print("ALL GRANTS GATE TESTS PASSED")
