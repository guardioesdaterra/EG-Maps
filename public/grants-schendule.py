#!/usr/bin/env python3
"""
GRANTS RADAR — Scheduler & Auto-Updater
Runs the radar on a configurable schedule, diffs results against
the previous run, and generates a "new grants" notification digest.
Can be run as a daemon (cron), GitHub Actions workflow, or systemd timer.

Usage:
  python scheduler.py once                  # one-shot run
  python scheduler.py daemon --interval 12  # every 12 hours
  python scheduler.py diff                  # show new since last run
  python scheduler.py export --format geojson  # EG-Maps compatible export
"""

import asyncio
import json
import sys
import time
import hashlib
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional
import click

BASE_DIR   = Path(__file__).parent
OUTPUT_DIR = BASE_DIR / "output"
CACHE_DIR  = BASE_DIR / "cache"
STATE_FILE = BASE_DIR / "last_run_state.json"


# ──────────────────────────────────────────────────────────────
# STATE MANAGEMENT
# ──────────────────────────────────────────────────────────────

def load_state() -> dict:
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text())
    return {"last_run": None, "seen_ids": [], "total_ever": 0}


def save_state(state: dict):
    STATE_FILE.write_text(json.dumps(state, indent=2, ensure_ascii=False))


def latest_output() -> Optional[Path]:
    """Find the most recent JSON output file."""
    files = sorted(OUTPUT_DIR.glob("grants_radar_*.json"), reverse=True)
    return files[0] if files else None


def load_grants(path: Path) -> list:
    if not path or not path.exists():
        return []
    data = json.loads(path.read_text())
    return data.get("grants", [])


# ──────────────────────────────────────────────────────────────
# DIFF ENGINE
# ──────────────────────────────────────────────────────────────

def diff_grants(current: list, seen_ids: set) -> list:
    """Return grants not seen in previous runs."""
    return [g for g in current if g["id"] not in seen_ids]


def format_digest(new_grants: list, run_time: str) -> str:
    """Generate a human-readable digest of new grants."""
    if not new_grants:
        return f"# Grants Radar Digest — {run_time}\n\nNo new grants found.\n"

    lines = [
        f"# 🌱 Grants Radar Digest",
        f"**Run:** {run_time} | **New grants:** {len(new_grants)}",
        "",
        "---",
        "",
    ]

    # Group by country
    by_country = {}
    for g in sorted(new_grants, key=lambda x: x.get("relevance",0), reverse=True):
        c = g.get("country","?")
        by_country.setdefault(c, []).append(g)

    for country in sorted(by_country.keys()):
        items = by_country[country]
        lines.append(f"## {country} — {len(items)} new")
        lines.append("")
        for g in items[:20]:
            dl = g.get("deadline","")
            dl_str = f" · 📅 {dl}" if dl else ""
            amt = g.get("amount_max","")
            amt_str = f" · 💰 {amt} {g.get('currency','')}" if amt and amt != "None" else ""
            score = g.get("relevance",0)
            star = "⭐" if score >= 60 else ("🔹" if score >= 30 else "·")
            lines += [
                f"### {star} [{g['title']}]({g['url']})",
                f"*{g.get('funder') or g['source']}*{dl_str}{amt_str}",
                f"",
                g.get("description","")[:200] + "...",
                f"",
            ]

    return "\n".join(lines)


# ──────────────────────────────────────────────────────────────
# GEOJSON EXPORT for EG-Maps
# ──────────────────────────────────────────────────────────────

# Country → rough centroid for map placement
COUNTRY_CENTROIDS = {
    "BR": [-14.2, -51.9], "AR": [-34.6, -64.2], "CO": [4.6, -74.1],
    "MX": [23.6, -102.6], "PE": [-9.2, -75.0],  "CL": [-35.7, -71.5],
    "EC": [-1.8, -78.2],  "BO": [-16.3, -63.6], "PY": [-23.4, -58.4],
    "UY": [-32.5, -55.8], "VE": [6.4, -66.6],   "US": [37.1, -95.7],
    "EU": [54.5, 15.2],   "GLOBAL": [0.0, 0.0], "LATAM": [-15.0, -60.0],
    "?":  [0.0, 0.0],
}


def to_geojson(grants: list) -> dict:
    """Convert grants to GeoJSON for EG-Maps integration."""
    features = []
    for g in grants:
        c = (g.get("country") or "?").upper()
        coords = COUNTRY_CENTROIDS.get(c, [0.0, 0.0])

        # Add small random offset so markers don't stack
        import random
        jitter = lambda: (random.random() - 0.5) * 4
        lon = coords[1] + jitter()
        lat = coords[0] + jitter()

        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [lon, lat],
            },
            "properties": {
                "id":          g["id"],
                "title":       g["title"],
                "funder":      g.get("funder",""),
                "source":      g["source"],
                "url":         g["url"],
                "deadline":    g.get("deadline",""),
                "amount_max":  g.get("amount_max",""),
                "currency":    g.get("currency",""),
                "country":     c,
                "region":      g.get("region",""),
                "relevance":   g.get("relevance",0),
                "description": g.get("description","")[:300],
                "categories":  g.get("categories",[]),
                "layer":       "grants",
                "marker_color": (
                    "#e74c3c" if g.get("relevance",0) >= 60 else
                    "#f39c12" if g.get("relevance",0) >= 30 else "#3498db"
                ),
            }
        })

    return {
        "type": "FeatureCollection",
        "metadata": {
            "generated": datetime.now(timezone.utc).isoformat(),
            "total": len(features),
            "description": "Socio-environmental art-activism grants — Earth Guardians",
            "source": "grants-radar",
        },
        "features": features,
    }


# ──────────────────────────────────────────────────────────────
# MAIN COMMANDS
# ──────────────────────────────────────────────────────────────

async def _run_once(country=None, sources=None, keywords=None,
                    refresh=False, min_score=5):
    """Import and run the main radar."""
    from grants_radar import run_radar
    return await run_radar(
        sources_filter=sources,
        country_filter=country,
        keywords=keywords,
        refresh=refresh,
        min_relevance=min_score,
        output_prefix="grants_radar",
    )


@click.group()
def cli():
    """Grants Radar scheduler and export tools."""
    pass


@cli.command()
@click.option("--country",  "-c", default=None)
@click.option("--sources",  "-s", default=None)
@click.option("--keywords", "-k", default=None)
@click.option("--refresh",  "-r", is_flag=True)
@click.option("--min-score","-m", default=5, type=int)
def once(country, sources, keywords, refresh, min_score):
    """Run a single radar pass and save outputs."""
    grants = asyncio.run(_run_once(country, sources, keywords, refresh, min_score))

    # Update state
    state = load_state()
    seen_ids = set(state.get("seen_ids", []))
    new_grants = diff_grants(grants, seen_ids)

    run_time = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    digest_md = format_digest(new_grants, run_time)
    digest_path = OUTPUT_DIR / f"digest_{datetime.now().strftime('%Y%m%d_%H%M')}.md"
    digest_path.write_text(digest_md, encoding="utf-8")
    click.echo(f"Digest: {digest_path} ({len(new_grants)} new grants)")

    state["last_run"]   = run_time
    state["seen_ids"]   = list(seen_ids | {g["id"] for g in grants})
    state["total_ever"] = len(state["seen_ids"])
    save_state(state)


@cli.command()
@click.option("--interval", "-i", default=12, type=int,
              help="Hours between runs (default: 12)")
@click.option("--country",  "-c", default=None)
@click.option("--min-score","-m", default=5, type=int)
def daemon(interval, country, min_score):
    """Run radar on a schedule (daemon mode)."""
    click.echo(f"Daemon starting — every {interval}h | country: {country or 'ALL'}")
    while True:
        click.echo(f"\n[{datetime.now().isoformat()}] Running radar pass...")
        try:
            asyncio.run(_run_once(country=country, min_score=min_score))
        except Exception as e:
            click.echo(f"Run failed: {e}", err=True)
        next_run = datetime.now().strftime("%H:%M")
        click.echo(f"Sleeping {interval}h until next run. (started at {next_run})")
        time.sleep(interval * 3600)


@cli.command()
def diff():
    """Show grants found since the last run."""
    state  = load_state()
    latest = latest_output()
    if not latest:
        click.echo("No output files found. Run 'once' first.")
        return
    grants   = load_grants(latest)
    seen_ids = set(state.get("seen_ids", []))
    new      = diff_grants(grants, seen_ids)
    run_time = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    click.echo(format_digest(new, run_time))


@cli.command()
@click.option("--format", "-f", "fmt",
              type=click.Choice(["geojson", "json", "csv"]),
              default="geojson",
              help="Export format (default: geojson for EG-Maps)")
@click.option("--output", "-o", default=None,
              help="Output path (default: output/grants_eg-maps.<ext>)")
@click.option("--country",  "-c", default=None)
@click.option("--min-score","-m", default=0, type=int)
def export(fmt, output, country, min_score):
    """Export latest results in a chosen format for EG-Maps."""
    import csv as csv_mod

    latest = latest_output()
    if not latest:
        click.echo("No output files found. Run 'once' first.", err=True)
        return

    grants = load_grants(latest)

    # Filter
    if country and country.upper() != "ALL":
        cf = country.upper()
        include = {"BR","LATAM","GLOBAL"} if cf == "BR" else \
                  {"EU","GLOBAL"} if cf == "EU" else {cf, "GLOBAL"}
        grants = [g for g in grants if g.get("country","").upper() in include]

    if min_score > 0:
        grants = [g for g in grants if g.get("relevance",0) >= min_score]

    out_dir = OUTPUT_DIR
    if fmt == "geojson":
        out_path = Path(output) if output else out_dir / "grants_eg-maps.geojson"
        data = to_geojson(grants)
        out_path.write_text(json.dumps(data, ensure_ascii=False, indent=2))
        click.echo(f"GeoJSON: {out_path} ({len(grants)} grants)")

    elif fmt == "json":
        out_path = Path(output) if output else out_dir / "grants_eg-maps.json"
        out_path.write_text(json.dumps(
            {"total": len(grants), "grants": grants},
            ensure_ascii=False, indent=2,
        ))
        click.echo(f"JSON: {out_path}")

    elif fmt == "csv":
        out_path = Path(output) if output else out_dir / "grants_eg-maps.csv"
        if grants:
            fields = ["id","title","funder","source","url","description",
                      "deadline","amount_max","currency","country","region","relevance"]
            with open(out_path, "w", newline="", encoding="utf-8") as f:
                w = csv_mod.DictWriter(f, fieldnames=fields, extrasaction="ignore")
                w.writeheader()
                w.writerows(grants)
        click.echo(f"CSV: {out_path}")


if __name__ == "__main__":
    cli()
