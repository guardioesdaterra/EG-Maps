#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════╗
║  CULTURAL AGENTS SYNC — Vulcan Observatory Feed                  ║
║  Fetches federal cultural agents from Mapa Cultura BR +          ║
║  Floresta Ativista network, outputs GeoJSON for static build     ║
║  and JSON for Supabase sync. Atomic rollback on failure.         ║
╚══════════════════════════════════════════════════════════════════╝

Usage:
  python scripts/sync-cultural-agents.py
  python scripts/sync-cultural-agents.py --output public/data/cultural-agents
"""

import json
import math
import os
import sys
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

try:
    import urllib.request
    import urllib.error
except ImportError:
    print("ERROR: urllib not available", file=sys.stderr)
    sys.exit(1)

# ──────────────────────────────────────────────────────────────
# CONFIG
# ──────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent
OUTPUT_DIR = BASE_DIR.parent / "public" / "data" / "cultural-agents"
EXPORT_DIR = BASE_DIR / "output"

# Poços de Caldas center for regional filtering
CENTER_LAT = -21.914138005195028
CENTER_LNG = -46.53311955736603
RADIUS_KM = 150  # generous radius for vulcan observatory region

# API endpoints
MAPA_CULTURA_URL = (
    "https://mapa.cultura.gov.br/api/agent/find?"
    "%40select=id%2Ctype%2Cname%2Clocation%2CsingleUrl"
    "&location=%21EQ%28%5B0%2C0%5D%29"
)
FLORESTA_ATIVISTA_URL = (
    "https://rede.florestaativista.org/api/agent/find?"
    "avatar=EQ%281%29"
    "&%40select=id%2Ctype%2Cname%2Clocation%2CsingleUrl"
    "&location=%21EQ%28%5B0%2C0%5D%29"
)

# Mapa Cultura: all agents on mapa.cultura.gov.br are cultural agents
# (Individual / Coletivo). We include all of them within the region.
MAPA_CULTURA_TYPE_NAMES = {
    "individual",
    "coletivo",
    "organização",
    "collective",
    "organization",
}

# Floresta Ativista agent type IDs
FA_TYPE_NAMES = {
    "individual",
    "organization",
    "collective",
    "network",
}


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine distance in km."""
    R = 6371
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def fetch_json(url: str, timeout: int = 30) -> list | dict | None:
    """Fetch JSON from URL with error handling."""
    headers = {
        "Accept": "application/json",
        "User-Agent": "EG-Maps/1.0 (cultural-agents-sync)",
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = resp.read().decode("utf-8")
            return json.loads(data)
    except urllib.error.HTTPError as e:
        print(f"  HTTP {e.code} for {url[:80]}...", file=sys.stderr)
        return None
    except Exception as e:
        print(f"  Error fetching {url[:80]}...: {e}", file=sys.stderr)
        return None


def is_in_region(lat: float, lng: float, radius_km: float = RADIUS_KM) -> bool:
    """Check if coordinates are within radius of center."""
    return haversine(CENTER_LAT, CENTER_LNG, lat, lng) <= radius_km


def normalize_type_name(raw_type: dict | str | None) -> str:
    """Normalize a type object/name to a standard key."""
    if isinstance(raw_type, dict):
        name = raw_type.get("name", "")
    elif isinstance(raw_type, str):
        name = raw_type
    else:
        return "unknown"
    return name.strip().lower()


def is_mapa_cultura_agent(raw_type: dict | str | None) -> bool:
    """All agents on mapa.cultura.gov.br are cultural agents (Individual/Coletivo)."""
    name = normalize_type_name(raw_type)
    return name in MAPA_CULTURA_TYPE_NAMES


def parse_location(loc: dict | None) -> tuple[float, float] | None:
    """Extract (lat, lng) from location dict."""
    if not loc:
        return None
    lat_str = loc.get("latitude", "")
    lng_str = loc.get("longitude", "")
    try:
        lat = float(lat_str)
        lng = float(lng_str)
        if lat == 0 and lng == 0:
            return None
        if -90 <= lat <= 90 and -180 <= lng <= 180:
            return (lat, lng)
    except (ValueError, TypeError):
        pass
    return None


def fetch_mapa_cultura_agents() -> list[dict]:
    """Fetch and filter agents from Mapa Cultura BR."""
    print("Fetching Mapa Cultura BR agents...")
    raw = fetch_json(MAPA_CULTURA_URL, timeout=60)
    if not raw or not isinstance(raw, list):
        print("  Warning: No data or invalid response from Mapa Cultura", file=sys.stderr)
        return []

    print(f"  Received {len(raw)} total agents")

    agents = []
    for agent in raw:
        loc = parse_location(agent.get("location"))
        if not loc:
            continue

        lat, lng = loc
        if not is_in_region(lat, lng):
            continue

        raw_type = agent.get("type")
        if not is_mapa_cultura_agent(raw_type):
            continue

        agents.append({
            "id": f"mapa-{agent.get('id')}",
            "name": agent.get("name", "Unknown"),
            "type_name": normalize_type_name(raw_type),
            "lat": lat,
            "lng": lng,
            "single_url": agent.get("singleUrl", ""),
            "source": "mapa_cultura",
            "external_id": str(agent.get("id", "")),
        })

    print(f"  Filtered to {len(agents)} federal cultural agents in region")
    return agents


def fetch_floresta_ativista_agents() -> list[dict]:
    """Fetch agents from Floresta Ativista network."""
    print("Fetching Floresta Ativista agents...")
    raw = fetch_json(FLORESTA_ATIVISTA_URL, timeout=60)
    if not raw or not isinstance(raw, list):
        print("  Warning: No data or invalid response from Floresta Ativista", file=sys.stderr)
        return []

    print(f"  Received {len(raw)} total agents")

    agents = []
    for agent in raw:
        loc = parse_location(agent.get("location"))
        if not loc:
            continue

        lat, lng = loc
        if not is_in_region(lat, lng):
            continue

        raw_type = agent.get("type")
        type_name = normalize_type_name(raw_type)

        agents.append({
            "id": f"fa-{agent.get('id')}",
            "name": agent.get("name", "Unknown"),
            "type_name": type_name if type_name in FA_TYPE_NAMES else "individual",
            "lat": lat,
            "lng": lng,
            "single_url": agent.get("singleUrl", ""),
            "source": "floresta_ativista",
            "external_id": str(agent.get("id", "")),
        })

    print(f"  Filtered to {len(agents)} agents in region")
    return agents


def deduplicate_agents(agents: list[dict]) -> list[dict]:
    """Remove duplicates by name+location proximity (500m)."""
    seen: list[tuple[str, float, float]] = []
    unique: list[dict] = []

    for agent in agents:
        name_key = agent["name"].strip().lower()
        lat, lng = agent["lat"], agent["lng"]
        is_dup = False

        for seen_name, s_lat, s_lng in seen:
            if name_key == seen_name and haversine(lat, lng, s_lat, s_lng) < 0.5:
                is_dup = True
                break

        if not is_dup:
            seen.append((name_key, lat, lng))
            unique.append(agent)

    removed = len(agents) - len(unique)
    if removed:
        print(f"  Deduplicated: removed {removed} duplicates")
    return unique


def agent_to_geojson_feature(agent: dict) -> dict:
    """Convert agent dict to GeoJSON Feature matching cultural-features.geojson format."""
    # Map source-specific type to standard subtype
    subtype = "cultural_center"
    if agent["source"] == "floresta_ativista":
        if "indigenous" in agent["name"].lower():
            subtype = "indigenous"
        elif agent["type_name"] == "collective":
            subtype = "artist_group"
        else:
            subtype = "rural"

    type_label = "cultural"
    if "escola" in agent["name"].lower() or "school" in agent["name"].lower():
        type_label = "school"
    elif "saude" in agent["name"].lower() or "hospital" in agent["name"].lower():
        type_label = "health"
    elif "evento" in agent["name"].lower() or "festival" in agent["name"].lower():
        subtype = "event"

    return {
        "type": "Feature",
        "properties": {
            "name": agent["name"],
            "type": type_label,
            "subtype": subtype,
            "source": agent["source"],
            "source_id": agent["external_id"],
            "single_url": agent.get("single_url", ""),
            "status": "active",
            "description": f"Cultural agent from {agent['source'].replace('_', ' ').title()}",
        },
        "geometry": {
            "type": "Point",
            "coordinates": [agent["lng"], agent["lat"]],
        },
    }


def build_geojson(features: list[dict]) -> dict:
    """Build a GeoJSON FeatureCollection."""
    return {
        "type": "FeatureCollection",
        "features": features,
    }


def atomic_write(path: Path, data: dict | list) -> bool:
    """Write JSON atomically via temp file + rename. Returns True on success."""
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(
            mode="w",
            dir=path.parent,
            suffix=".tmp",
            delete=False,
        ) as tmp:
            json.dump(data, tmp, indent=2, ensure_ascii=False)
            tmp_path = Path(tmp.name)
        tmp_path.rename(path)
        return True
    except Exception as e:
        print(f"  Error writing {path}: {e}", file=sys.stderr)
        try:
            tmp_path.unlink(missing_ok=True)
        except Exception:
            pass
        return False


def main():
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    export_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else EXPORT_DIR
    output_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else OUTPUT_DIR

    print(f"=== Cultural Agents Sync — {timestamp} ===")
    print(f"Output: {output_dir}")
    print(f"Export: {export_dir}")
    print()

    # Fetch from both sources
    mapa_agents = fetch_mapa_cultura_agents()
    fa_agents = fetch_floresta_ativista_agents()

    all_agents = mapa_agents + fa_agents
    print(f"\nTotal raw agents: {len(all_agents)}")

    # Deduplicate
    unique_agents = deduplicate_agents(all_agents)
    print(f"After dedup: {len(unique_agents)}")

    # Build GeoJSON
    features = [agent_to_geojson_feature(a) for a in unique_agents]
    geojson = build_geojson(features)

    # Build export JSON for Supabase sync (flat list with all fields)
    export_data = {
        "synced_at": timestamp,
        "total_agents": len(unique_agents),
        "mapa_cultura_count": len([a for a in unique_agents if a["source"] == "mapa_cultura"]),
        "floresta_ativista_count": len([a for a in unique_agents if a["source"] == "floresta_ativista"]),
        "agents": unique_agents,
    }

    # Atomic writes — if any fail, existing files remain intact
    print("\nWriting output files...")
    ok = True

    main_path = output_dir / "cultural-agents.json"
    ok = atomic_write(main_path, geojson) and ok
    print(f"  {main_path}: {'OK' if ok else 'FAILED'}")

    # Also write a separate floresta ativista file
    fa_features = [f for f in features if f["properties"].get("source") == "floresta_ativista"]
    fa_path = output_dir / "floresta-ativista.json"
    ok = atomic_write(fa_path, build_geojson(fa_features)) and ok
    print(f"  {fa_path}: {'OK' if ok else 'FAILED'}")

    # Export for Supabase sync
    export_path = export_dir / f"cultural_agents_export_{timestamp}.json"
    ok = atomic_write(export_path, export_data) and ok
    print(f"  {export_path}: {'OK' if ok else 'FAILED'}")

    # Summary
    print(f"\n=== Summary ===")
    print(f"  Mapa Cultura agents:     {len(mapa_agents)}")
    print(f"  Floresta Ativista agents: {len(fa_agents)}")
    print(f"  Total (deduplicated):     {len(unique_agents)}")
    print(f"  GeoJSON features:         {len(features)}")

    if not ok:
        print("\nERROR: Some writes failed — check output above", file=sys.stderr)
        sys.exit(1)

    print("\nDone.")


if __name__ == "__main__":
    main()
