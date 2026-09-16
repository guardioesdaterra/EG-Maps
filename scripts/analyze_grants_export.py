#!/usr/bin/env python3
"""Grants export analyzer — CI + local use.

Reads a grants.py export (``{"grants": [...], "meta": {...}}`` or a bare
list), prints a markdown analysis to stdout (workflows redirect it into
``$GITHUB_STEP_SUMMARY``), appends machine outputs to ``$GITHUB_OUTPUT``,
and enforces the temporal gates:

* accepted == 0            → broken pipeline, fail
* any expired (past-deadline) grant in export → temporal gate leaked, fail
* any closed grant in export                     → temporal gate leaked, fail

Rolling / dateless grants are live (unknown != closed) and never fail.

Stdlib only — importable by scripts/grants_gates_test.py.

Usage:
    python3 scripts/analyze_grants_export.py <export.json>
    python3 scripts/analyze_grants_export.py --no-outputs <export.json>
"""

import json
import os
import sys
from datetime import date


def is_past_deadline(deadline, today=None) -> bool:
    """ISO-prefix date compare (lexicographic == chronological)."""
    today = today or date.today().isoformat()
    m = (deadline or "")
    return bool(m) and len(m) >= 10 and m[:10] < today and m[:4].isdigit()


def analyze(grants, meta=None, today=None):
    """Return a dict of counts + row lists. Pure function (testable)."""
    today = today or date.today().isoformat()
    meta = meta or {}
    status_counts, urgency_counts, src_counts = {}, {}, {}
    expired_rows, closed_rows, live = [], [], []
    for g in grants or []:
        st = (g.get("status") or "unknown").lower()
        ur = (g.get("urgency") or "unknown").lower()
        status_counts[st] = status_counts.get(st, 0) + 1
        urgency_counts[ur] = urgency_counts.get(ur, 0) + 1
        src = g.get("source", "?")
        src_counts[src] = src_counts.get(src, 0) + 1
        expired = ur == "expired" or is_past_deadline(g.get("deadline", ""), today)
        closed = st == "closed"
        if closed:
            closed_rows.append(g)
        if expired:
            expired_rows.append(g)
        if not closed and not expired:
            live.append(g)
    return {
        "total": len(grants or []),
        "live": len(live),
        "open": status_counts.get("open", 0),
        "expired": len(expired_rows),
        "closed": len(closed_rows),
        "with_both": sum(1 for g in grants or [] if g.get("deadline") and g.get("amount_max")),
        "non_standing": sum(1 for g in grants or [] if not g.get("is_standing", False)),
        "status_counts": status_counts,
        "urgency_counts": urgency_counts,
        "src_counts": src_counts,
        "live_rows": live,
        "expired_rows": expired_rows,
        "closed_rows": closed_rows,
        "meta": meta,
    }


def gate_failures(stats) -> list:
    """Human-readable gate violations (empty == all gates pass)."""
    failures = []
    if stats["total"] == 0:
        failures.append(
            "Grants pipeline produced 0 accepted grants — scraper or gates broken."
        )
    if stats["expired"] > 0:
        failures.append(
            f"Temporal gate leaked: {stats['expired']} expired (past-deadline) "
            "grant(s) in export — scraper must drop these before Supabase."
        )
    if stats["closed"] > 0:
        failures.append(
            f"Temporal gate leaked: {stats['closed']} closed grant(s) in export — "
            "scraper must drop these before Supabase."
        )
    return failures


def render_markdown(filename, stats) -> str:
    """Full $GITHUB_STEP_SUMMARY section."""
    lines = [
        f"## 🌱 Grants scrape — {filename}",
        "",
        f"- Accepted grants: **{stats['total']}** (live/shippable: **{stats['live']}**)",
    ]
    if stats["status_counts"]:
        lines.append(
            "- Status: "
            + ", ".join(f"{k}=**{v}**" for k, v in sorted(stats["status_counts"].items()))
        )
    if stats["urgency_counts"]:
        lines.append(
            "- Urgency: "
            + ", ".join(f"{k}=**{v}**" for k, v in sorted(stats["urgency_counts"].items()))
        )
    lines.append(
        f"- With deadline+amount: **{stats['with_both']}** · "
        f"non-standing: **{stats['non_standing']}**"
    )
    meta = stats.get("meta") or {}
    if meta:
        lines.append(
            f"- Scraper temporal gate dropped: closed=**{meta.get('excluded_closed', '?')}**, "
            f"deadline-passed=**{meta.get('excluded_expired', '?')}**"
        )
    lines += [
        "",
        "### 🏆 Top 5 live by priority",
        "",
        "| Score | Deadline | Source | Title |",
        "|---|---|---|---|",
    ]
    ranked = sorted(stats["live_rows"], key=lambda x: x.get("priority_score", 0), reverse=True)[:5]
    for g in ranked:
        dl = g.get("deadline") or "—"
        lines.append(f"| {g.get('priority_score', 0)} | {dl} | {g.get('source', '')} | {g.get('title', '')[:60]} |")
    if not ranked:
        lines.append("| — | — | — | _no live grants_ |")
    lines += ["", "### 📚 Top sources", ""]
    for src, n in sorted(stats["src_counts"].items(), key=lambda x: -x[1])[:8]:
        lines.append(f"- {src}: **{n}**")
    if stats["expired_rows"]:
        lines += ["", f"### ⚠️ Expired in export ({len(stats['expired_rows'])}) — must be 0", ""]
        for g in stats["expired_rows"][:8]:
            lines.append(f"- `{g.get('deadline', '?')}` {g.get('source', '')} | {g.get('title', '')[:70]}")
    if stats["closed_rows"]:
        lines += ["", f"### ⚠️ Closed in export ({len(stats['closed_rows'])}) — must be 0", ""]
        for g in stats["closed_rows"][:8]:
            lines.append(f"- {g.get('source', '')} | {g.get('title', '')[:70]}")
    return "\n".join(lines) + "\n"


def load_export(path):
    with open(path, encoding="utf-8") as f:
        d = json.load(f)
    if isinstance(d, dict):
        return d.get("grants", d), d.get("meta", {})
    return d, {}


def main(argv) -> int:
    args = [a for a in argv if a != "--no-outputs"]
    write_outputs = len(args) == len(argv)
    if not args:
        print("Usage: analyze_grants_export.py [--no-outputs] <export.json>", file=sys.stderr)
        return 2
    path = args[0]
    if not os.path.exists(path):
        print("## 🌱 Grants scrape\n\n- Result: **no export produced** (scraper may have failed — see logs)")
        if write_outputs and os.environ.get("GITHUB_OUTPUT"):
            with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as f:
                f.write("accepted=0\nopen=0\nexpired=0\nclosed=0\n")
        return 0
    grants, meta = load_export(path)
    stats = analyze(grants, meta)
    print(render_markdown(os.path.basename(path), stats), end="")
    if write_outputs and os.environ.get("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as f:
            f.write(
                f"accepted={stats['total']}\nopen={stats['open']}\n"
                f"expired={stats['expired']}\nclosed={stats['closed']}\n"
            )
    failures = gate_failures(stats)
    for msg in failures:
        print(f"::error::{msg}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
