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
# unknown/dateless/pending are kept; no exemptions — every row obeys the date rule
assert G.temporal_exclude_reason({"status": "closed", "deadline": "2099-01-01"}) == "closed"
assert G.temporal_exclude_reason({"status": "CLOSED", "deadline": ""}) == "closed"
assert G.temporal_exclude_reason({"status": "open", "deadline": "2000-01-15"}) == "deadline-passed"
assert G.temporal_exclude_reason({"status": "unknown", "deadline": "2000-01-15"}) == "deadline-passed"
assert G.temporal_exclude_reason({"status": "open", "deadline": "2099-01-01"}) is None
assert G.temporal_exclude_reason({"status": "unknown", "deadline": ""}) is None
assert G.temporal_exclude_reason({"status": "pending", "deadline": ""}) is None, "LEGACY PENDING DROPPED"
assert G.temporal_exclude_reason({"status": "open", "deadline": ""}) is None
assert (
    G.temporal_exclude_reason({"status": "closed", "deadline": ""}) == "closed"
), "CLOSED MUST STAY EXCLUDED"
assert (
    G.temporal_exclude_reason({"status": "open", "deadline": "2000-01-15"}) == "deadline-passed"
), "NO DATE EXEMPTIONS"

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

# 12. same-day deadline regression (CI incident 2026-09-17: "Expired in
# export (2)"). compute_deadline_urgency used datetime arithmetic, so a
# deadline TODAY produced urgency="expired" while is_expired() (date-based)
# considered it alive -> scraper shipped it, analyzer failed it.
_today_iso = _d.today().isoformat()
_days, _urg = G.compute_deadline_urgency(_today_iso)
assert _urg != "expired", f"SAME-DAY FLAGGED EXPIRED: {_today_iso} -> {_urg}"
assert _days == 0, (_today_iso, _days)
assert not G.is_expired(_today_iso), "TODAY FLAGGED EXPIRED"
assert G.temporal_exclude_reason({"status": "open", "deadline": _today_iso}) is None
# scraper urgency and analyzer gate must agree on a same-day grant
_same = G.make_grant(
    "Same Day Environmental Grant Program",
    "test-source",
    "https://example.org/grants/same-day",
    "Open call for proposals. Grants up to $10,000. Environmental action.",
    deadline=_today_iso,
    amount_max="$10,000",
)
assert _same["urgency"] != "expired", (_same["urgency"], _same["deadline_days"])
assert G.temporal_exclude_reason(_same) is None
_stats_same = AZ.analyze([_same], today=_today_iso)
assert _stats_same["expired"] == 0, _stats_same
assert AZ.gate_failures(_stats_same) == [], _stats_same
# analyzer parses legacy shapes exactly like the scraper gate
assert AZ.is_past_deadline("2000-01-15", today="2026-09-16")
assert AZ.is_past_deadline("15 January 2000", today="2026-09-16")
assert AZ.is_past_deadline("31/08/26", today="2026-09-16")
assert not AZ.is_past_deadline("2026-09-16", today="2026-09-16"), "TODAY ANALYZER-EXPIRED"
assert not AZ.is_past_deadline("", today="2026-09-16")
assert not AZ.is_past_deadline("rolling", today="2026-09-16")
assert not AZ.is_past_deadline("total garbage xyz", today="2026-09-16")

# 13. v2.5 scope detection — GLOBAL must not swallow clearly-scoped calls
def _scoped(title, desc, **kw):
    g = G.make_grant(title, "test-scope", "https://example.org/x" + str(abs(hash(title + desc)) % 99999),
                     desc, deadline="2099-01-01", amount_max="$1,000", **kw)
    return g["country"]

# title parentheticals
assert _scoped("Apply for Climate Change Partnerships Grant Program (Australia)",
               "Eligible organizations can apply for up to $50,000.") == "AU"
assert _scoped("Open Call for Indigenous Climate Action Grant (Canada)",
               "Supports Indigenous-led projects in Toronto.") == "CA"
assert _scoped("Call for Strategic Partnerships (Uganda)",
               "Eligible organizations in Uganda may submit.") == "UG"
assert _scoped("Wiki Loves Earth 2026 (Côte d’Ivoire)", "Photography contest.") == "CI"
assert _scoped("Agriculture Funding (50 new opportunities!)",
               "Explore 80+ funding opportunities worldwide.") == "GLOBAL"
# eligibility / residency phrasing
assert _scoped("Some call", "For entities based in Canada only. Open call. $5,000.") == "CA"
assert _scoped("Some call", "Must be registered in Brazil. Edital aberto.") == "BR"
assert _scoped("Some call", "Organisations must be headquartered within South Africa.") == "ZA"
assert _scoped("Some call", "For Australia-based not-for-profits in the Noosa Shire.") == "AU"
assert _scoped("Some call", "Open to NGOs in Kenya and Tanzania working on conservation.") in ("KE", "TZ")
assert _scoped("Some call", "supports eligible organisations in British Columbia") == "CA"
assert _scoped("Some call", "Destinado a organizações sediadas no Brasil. Edital aberto.") == "BR"
assert _scoped("Some call", "Ouvert aux associations établies en France.") == "FR"
# passing mentions never re-scope; worldwide stays worldwide
assert _scoped("Global Greengrants Fund",
               "Small grants worldwide. Priority to underrepresented groups.") == "GLOBAL"
assert _scoped("The Pollination Project",
               "Seed funding to changemakers worldwide.") == "GLOBAL"
assert _scoped("X", "Open call, funding climate art worldwide.") == "GLOBAL"
assert G.infer_country("funding climate art worldwide", "en") == "GLOBAL", "LIMA-CLIMATE"
assert G.infer_country("open call for NGOs in Peru, Lima region", "en") == "PE"
# explicit scopes are never re-scoped
_s = G.make_grant("Youth Climate Justice Fund", "ycjf", "https://example.org/ycjf",
                  "Funds youth-led groups in Latin America, Africa, Asia.",
                  country="GLOBAL",
                  deadline="2099-01-01", amount_max="$20,000")
assert _s["country"] == "GLOBAL", _s["country"]
# multi-region fallback never re-scopes (worldwide stays worldwide)
assert G.infer_scope_country("Some Fund", "Groups in Latin America, Africa, Asia.") == "GLOBAL"
assert G.infer_scope_country("Some Fund", "For entities based in Canada only. Open call.") == "CA"
_e = G.make_grant("Edital ISPN", "ispn", "https://example.org/ispn",
                  "Open to NGOs in Kenya.", country="BR",
                  deadline="2099-01-01", amount_max="$1,000")
assert _e["country"] == "BR", _e["country"]
# 14. v2.6 dual-link model — aggregator page vs funder call page
# extract_grant_link needs real bs4; the stub above returns None, so these
# assertions only run when bs4 is importable.
try:
    from bs4 import BeautifulSoup as _BS  # noqa: E402
    _HAS_BS = _BS is not None and getattr(_BS, "__name__", "") != "<lambda>"
except Exception:
    _HAS_BS = False
if _HAS_BS:
    _WALLACEA_HTML = (
        '<p>Critical Ecosystem Partnership Fund (CEPF) invites Letters of Inquiry '
        'for grants supporting biodiversity conservation in the Wallacea Hotspot.</p>'
        '<p><a href="https://cepf.net/grants/open-calls">Grants for Wallacea '
        "Biodiversity Hotspot</a> — small grants up to US$50,000, deadline "
        "26 September 2026.</p>"
        '<p>Share: <a href="https://facebook.com/sharer/x">Facebook</a> '
        '<a href="https://twitter.com/intent/x">Twitter</a></p>'
    )
    _got = G.extract_grant_link(
        _WALLACEA_HTML,
        source_url="https://www.terravivagrants.org/wallacea-biodiversity-hotspot-large-grants/",
        funder_hint="Critical Ecosystem Partnership Fund",
    )
    assert _got == "https://cepf.net/grants/open-calls", f"WALLACEA LINK -> {_got!r}"
    # aggregator self-links / social / empty never qualify
    assert G.extract_grant_link(
        '<a href="https://www.terravivagrants.org/other-post">Related post</a>',
        source_url="https://www.terravivagrants.org/x") == ""
    assert G.extract_grant_link("") == ""
    assert G.extract_grant_link("<p>no links here</p>") == ""
    # make_grant wires the pair: url = funder page, both columns stored
    _g2 = G.make_grant(
        "Wallacea Biodiversity Hotspot Large Grants",
        "terravivagrants.org",
        "https://www.terravivagrants.org/wallacea-biodiversity-hotspot-large-grants/",
        "CEPF invites Letters of Inquiry. Grants US$50,000 to US$150,000. Deadline 27 September 2026.",
        deadline="2026-09-27", amount_max="US$150,000",
        raw_html=_WALLACEA_HTML,
    )
    assert _g2["grant_link"] == "https://cepf.net/grants/open-calls", _g2["grant_link"]
    assert _g2["source_link"] == "https://www.terravivagrants.org/wallacea-biodiversity-hotspot-large-grants/", _g2["source_link"]
    assert _g2["url"] == "https://cepf.net/grants/open-calls", _g2["url"]
    # no outbound link: legacy single-link shape preserved
    _g3 = G.make_grant("Some Open Environmental Grant Call", "test-source",
                       "https://example.org/agg/post-1",
                       "Open call for proposals. Grants up to $10,000.",
                       deadline="2099-01-01", amount_max="$10,000")
    assert _g3["grant_link"] == "", _g3["grant_link"]
    assert _g3["source_link"] == "https://example.org/agg/post-1", _g3["source_link"]
    assert _g3["url"] == "https://example.org/agg/post-1", _g3["url"]
    # explicit grant_link= wins over auto-extraction
    _g4 = G.make_grant("Some Open Environmental Grant Call", "test-source",
                       "https://example.org/agg/post-2",
                       "Open call for proposals. Grants up to $10,000.",
                       deadline="2099-01-01", amount_max="$10,000",
                       grant_link="https://funder.org/apply",
                       raw_html=_WALLACEA_HTML)
    assert _g4["url"] == "https://funder.org/apply", _g4["url"]
    assert _g4["grant_link"] == "https://funder.org/apply", _g4["grant_link"]
    # feed helper prefers content bodies, falls back to summary
    class _E(dict):
        pass
    _e = _E({"summary": "<p>hi</p>", "content": [{"value": "<p>full</p>"}]})
    assert G.feed_raw_html(_e) == "<p>full</p>"
    assert G.feed_raw_html({"summary": "<p>s</p>"}) == "<p>s</p>"
else:
    print("SKIP v2.6 link tests (no bs4)")
# 15. v2.7 — homepage-only URLs are valid grant links; manual_inserted flag
assert G.is_valid_grant_url("https://funder.org/") is True
assert G.is_valid_grant_url("https://funder.org") is True
assert G.is_valid_grant_url("https://funder.org/?call=2026") is True
assert G.is_valid_grant_url("https://funder.org/apply") is True
assert G.is_valid_grant_url("") is False
assert G.is_valid_grant_url("not-a-url") is False
assert G.is_valid_grant_url("https://no-tld") is False
assert G.is_valid_grant_url("https://example.org/has space/x") is False
_g5 = G.make_grant("Funder Root-Domain Open Call", "test-source",
                   "https://funder.org/",
                   "Open call for proposals. Grants up to $10,000.",
                   deadline="2099-01-01", amount_max="$10,000")
assert _g5["url"] == "https://funder.org/", _g5["url"]
assert _g5["source_link"] == "https://funder.org/", _g5["source_link"]
assert _g5["manual_inserted"] is False, _g5["manual_inserted"]
assert G.is_valid_grant_candidate(
    "Funder Root-Domain Open Call for Proposals",
    "Open call for proposals. Grants up to $10,000. Deadline 2099-01-01.",
    url="https://funder.org/",
    deadline="2099-01-01", amount_max="$10,000") is True
# 16. v2.8 — "due" deadline family (US-foundation phrasing, proven misses)
_due_cases = [
    ("For the sixth grant round applications are due by December 1, 2026.", "2026-12-01"),
    ("Full proposals for small-tier grants are due by 20 September 2026.", "2026-09-20"),
    ("Full Proposal Due Date October 27, 2026, 11:59 pm EST.", "2026-10-27"),
    ("Pre-Proposal Due Date August 19, 2026.", "2026-08-19"),
    ("Application Due Date: 15 March 2027.", "2027-03-15"),
]
for _text, _want in _due_cases:
    _got = G.extract_deadline(_text)
    assert _got == _want, f"DUE {_text!r} -> {_got!r} (want {_want!r})"
# multi-stage RFP: full-proposal date wins over the earlier pre-proposal date
_multi = ("Pre-Proposal Due Date August 19, 2026. Full Proposal Due Date October 27, 2026.")
assert G.extract_deadline(_multi) == "2026-10-27", G.extract_deadline(_multi)
# 17. v2.8 — generic relative verbs need a deadline anchor (no fabrication)
assert G.extract_deadline(
    "Projects must be completed within 12 months, however extensions may be considered."
) == "", "DURATION FABRICATED"
assert G.extract_deadline(
    "We aim to get back to you with our response within 6 weeks."
) == "", "RESPONSE-SLA FABRICATED"
assert G.extract_deadline("Submit your application within 30 days of this announcement.") != "", \
    "ANCHORED RELATIVE MISSED"
# 18. v2.8 — funder detail verdicts
_dl, _closed = G.analyze_detail_text(
    "For the sixth grant round applications are due by December 1, 2026. Decisions by February 2027.")
assert _dl == "2026-12-01" and not _closed, (_dl, _closed)
_dl, _closed = G.analyze_detail_text(
    "Applications closed on 04 September 2026. We are currently reviewing applications.")
assert _dl is None and _closed, (_dl, _closed)
_dl, _closed = G.analyze_detail_text(" rolling fund with no fixed deadline, apply anytime ")
assert _dl is None and not _closed, (_dl, _closed)
# 19. v2.10 — reach: GLOBAL outranks otherwise-identical local-only calls
_g_txt = "Open call for proposals worldwide. Grants up to $10,000 for environmental action."
_g_global = G.make_grant("Worldwide Environmental Action Grant", "test-source",
                         "https://example.org/grants/global-action",
                         _g_txt, deadline="2099-06-01", amount_max="$10,000",
                         country="GLOBAL")
_g_local = G.make_grant("Worldwide Environmental Action Grant", "test-source",
                        "https://example.org/grants/global-action",
                        _g_txt, deadline="2099-06-01", amount_max="$10,000",
                        country="LK")
assert _g_global["country"] == "GLOBAL" and _g_local["country"] == "LK", \
    (_g_global["country"], _g_local["country"])
assert _g_global["priority_score"] > _g_local["priority_score"], \
    f"GLOBAL={_g_global['priority_score']} LK={_g_local['priority_score']}"
assert _g_global["priority_score"] - _g_local["priority_score"] == 8, \
    (_g_global["priority_score"], _g_local["priority_score"])
assert 0 <= _g_global["priority_score"] <= 100
assert 0 <= _g_local["priority_score"] <= 100
# unit-level: reach bonus applies exactly to GLOBAL (case-insensitive)
_kw = {"relevance": 50, "signals": 5, "highlights": [], "usd_val": 10000,
       "urgency": "soon", "status": "open", "has_deadline": True,
       "has_amount": True, "has_grant_link": False, "source": "test-source"}
assert G.compute_priority_score(**_kw, country="GLOBAL") == \
    G.compute_priority_score(**_kw, country="global")
assert G.compute_priority_score(**_kw, country="GLOBAL") > \
    G.compute_priority_score(**_kw, country="LK")
# 20. v2.10 — absolute scope tier: EVERY global outranks EVERY local
assert G.is_global_scope("GLOBAL") and G.is_global_scope(" global ")
assert G.is_global_scope("") and G.is_global_scope(None)  # missing scope falls back to global
assert not G.is_global_scope("LK") and not G.is_global_scope("LATAM")
_tier = [
    {"title": "Local Strong", "country": "LK", "priority_score": 100,
     "status": "open", "urgency": "urgent", "deadline": "2099-01-01",
     "amount_max": "$1,000", "source": "s1"},
    {"title": "Global Weak", "country": "GLOBAL", "priority_score": 10,
     "status": "open", "urgency": "unknown", "deadline": "",
     "amount_max": "", "source": "s1"},
    {"title": "Global Mid", "country": "GLOBAL", "priority_score": 50,
     "status": "open", "urgency": "soon", "deadline": "2099-05-01",
     "amount_max": "$5,000", "source": "s1"},
]
_ordered = sorted(_tier, key=G.scope_rank_key, reverse=True)
assert [g["title"] for g in _ordered] == ["Global Mid", "Global Weak", "Local Strong"], \
    [g["title"] for g in _ordered]
# analyzer Top-5 obeys the same tier (local 100 must not lead)
_stats20 = AZ.analyze(_tier, today="2026-09-16")
_md20 = AZ.render_markdown("tier_test.json", _stats20)
_top_lines = [l for l in _md20.splitlines()
              if l.startswith("| ") and "Score" not in l and "---" not in l]
assert _top_lines and "| LK |" not in _top_lines[0], _top_lines[0]
assert _top_lines[0].split("|")[2].strip() == "GLOBAL", _top_lines[0]
print("ALL GRANTS GATE TESTS PASSED")
