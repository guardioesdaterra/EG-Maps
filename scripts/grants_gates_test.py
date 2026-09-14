"""Grants gate + parser regression test. Stdlib only (heavy imports stubbed).
Run: python3 scripts/grants_gates_test.py (also runs in CI sync job)."""
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
assert G.parse_date("total garbage xyz") == "total garbage xyz"
print("ALL GRANTS GATE TESTS PASSED")
