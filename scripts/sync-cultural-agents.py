#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════╗
║  CULTURAL AGENTS SYNC — Vulcan Observatory Feed                  ║
║                                                                  ║
║  Sources:                                                        ║
║    1. Mapa Cultura BR — digested locally from                   ║
║       public/map-culture.json (no live API call)                 ║
║    2. Floresta Ativista — live HTTP fetch from                   ║
║       https://rede.florestaativista.org/api/agent/find           ║
║                                                                  ║
║  Outputs (atomic):                                               ║
║    public/data/cultural-agents/cultural-agents.json              ║
║    public/data/cultural-agents/floresta-ativista.json            ║
║    scripts/output/cultural_agents_export_<ts>.json               ║
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
PROJECT_ROOT = BASE_DIR.parent

# Local digest of Mapa Cultura BR — fetched out-of-band and committed
# (see .github/workflows/deploy.yml → "Refresh Mapa Cultura digest").
MAPA_CULTURE_LOCAL = PROJECT_ROOT / "public" / "map-culture.json"

# Floresta Ativista still comes from the live API (small, paginated).
FLORESTA_ATIVISTA_URL = (
    "https://rede.florestaativista.org/api/agent/find?"
    "avatar=EQ%281%29"
    "&%40select=id%2Ctype%2Cname%2Clocation%2CsingleUrl"
    "&location=%21EQ%28%5B0%2C0%5D%29"
)

# Poços de Caldas center for regional filtering
CENTER_LAT = -21.914138005195028
CENTER_LNG = -46.53311955736603
RADIUS_KM = 150  # generous radius for vulcan observatory region

# Mapa Cultura type names → canonical subtype
MAPA_CULTURA_SUBTYPE = {
    "individual": "cultural_center",
    "coletivo": "artist_group",
    "organização": "cultural_center",
    "collective": "artist_group",
    "organization": "cultural_center",
}

# Floresta Ativista agent type IDs / names
FA_TYPE_NAMES = {
    "individual",
    "organization",
    "collective",
    "network",
}


# ──────────────────────────────────────────────────────────────
# GEO HELPERS
# ──────────────────────────────────────────────────────────────
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


def is_in_region(lat: float, lng: float, radius_km: float = RADIUS_KM) -> bool:
    return haversine(CENTER_LAT, CENTER_LNG, lat, lng) <= radius_km


def parse_location(loc: dict | None) -> tuple[float, float] | None:
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


def normalize_type_name(raw_type: dict | str | None) -> str:
    if isinstance(raw_type, dict):
        name = raw_type.get("name", "")
    elif isinstance(raw_type, str):
        name = raw_type
    else:
        return ""
    return name.strip().lower()


# ──────────────────────────────────────────────────────────────
# HTTP
# ──────────────────────────────────────────────────────────────
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


# ──────────────────────────────────────────────────────────────
# LOADERS
# ──────────────────────────────────────────────────────────────
def load_mapa_cultura_from_digest() -> list[dict]:
    """Load Mapa Cultura BR agents from the local digest (public/map-culture.json).

    The upstream API at https://mapa.cultura.gov.br/api/agent/find has
    become unreliable for our use case; a GitHub Action refreshes the
    digest out-of-band. This function only digests that file.
    """
    if not MAPA_CULTURE_LOCAL.exists():
        print(f"  Digest not found at {MAPA_CULTURE_LOCAL}", file=sys.stderr)
        return []

    try:
        with MAPA_CULTURE_LOCAL.open("r", encoding="utf-8") as f:
            raw = json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        print(f"  Failed to read {MAPA_CULTURE_LOCAL}: {e}", file=sys.stderr)
        return []

    if not isinstance(raw, list):
        print(f"  Unexpected digest shape (expected list, got {type(raw).__name__})", file=sys.stderr)
        return []

    print(f"  Digest contains {len(raw)} total records")

    agents: list[dict] = []
    skipped_loc = 0
    skipped_region = 0
    for record in raw:
        loc = parse_location(record.get("location"))
        if not loc:
            skipped_loc += 1
            continue
        lat, lng = loc
        if not is_in_region(lat, lng):
            skipped_region += 1
            continue

        raw_type = record.get("type")
        type_name = normalize_type_name(raw_type)
        if not type_name:
            continue

        agents.append({
            "id": f"mapa-{record.get('id')}",
            "name": record.get("name", "Unknown"),
            "type_name": type_name,
            "lat": lat,
            "lng": lng,
            "single_url": record.get("singleUrl", ""),
            "source": "mapa_cultura",
            "external_id": str(record.get("id", "")),
        })

    print(
        f"  Kept {len(agents)} agents in region "
        f"(skipped {skipped_loc} bad-location, {skipped_region} out-of-region)"
    )
    return agents


def fetch_floresta_ativista_agents() -> list[dict]:
    """Fetch agents from Floresta Ativista network."""
    print("Fetching Floresta Ativista agents...")
    raw = fetch_json(FLORESTA_ATIVISTA_URL, timeout=60)
    if not raw or not isinstance(raw, list):
        print("  Warning: no data from Floresta Ativista (will keep previous digest)", file=sys.stderr)
        return []

    print(f"  Received {len(raw)} total agents")

    agents: list[dict] = []
    for record in raw:
        loc = parse_location(record.get("location"))
        if not loc:
            continue
        lat, lng = loc
        if not is_in_region(lat, lng):
            continue

        type_name = normalize_type_name(record.get("type"))
        if not type_name or type_name not in FA_TYPE_NAMES:
            type_name = "individual"

        agents.append({
            "id": f"fa-{record.get('id')}",
            "name": record.get("name", "Unknown"),
            "type_name": type_name,
            "lat": lat,
            "lng": lng,
            "single_url": record.get("singleUrl", ""),
            "source": "floresta_ativista",
            "external_id": str(record.get("id", "")),
        })

    print(f"  Filtered to {len(agents)} agents in region")
    return agents


# ──────────────────────────────────────────────────────────────
# TRANSFORMS
# ──────────────────────────────────────────────────────────────
def deduplicate_agents(agents: list[dict]) -> list[dict]:
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


def classify_agent(agent: dict) -> tuple[str, str]:
    """Return (type_label, subtype) matching the cultural-layer schema."""
    name_lower = agent["name"].lower()
    if "escola" in name_lower or "school" in name_lower:
        return ("school", "cultural_center")
    if "saude" in name_lower or "hospital" in name_lower or "posto de saúde" in name_lower:
        return ("health", "cultural_center")
    if "indigena" in name_lower or "indigenous" in name_lower:
        return ("cultural", "indigenous")

    if agent["source"] == "floresta_ativista":
        if agent["type_name"] == "collective":
            return ("cultural", "artist_group")
        if agent["type_name"] in {"network", "organization"}:
            return ("cultural", "rural")
        return ("cultural", "rural")

    # mapa_cultura
    subtype = MAPA_CULTURA_SUBTYPE.get(agent["type_name"], "cultural_center")
    return ("cultural", subtype)


def agent_to_geojson_feature(agent: dict) -> dict:
    type_label, subtype = classify_agent(agent)
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
            "description": (
                f"Cultural agent from {agent['source'].replace('_', ' ').title()}"
            ),
        },
        "geometry": {
            "type": "Point",
            "coordinates": [agent["lng"], agent["lat"]],
        },
    }


def build_geojson(features: list[dict]) -> dict:
    return {"type": "FeatureCollection", "features": features}


# ──────────────────────────────────────────────────────────────
# I/O
# ──────────────────────────────────────────────────────────────
def atomic_write(path: Path, data: dict | list) -> bool:
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(
            mode="w",
            dir=path.parent,
            suffix=".tmp",
            delete=False,
            encoding="utf-8",
        ) as tmp:
            json.dump(data, tmp, indent=2, ensure_ascii=False)
            tmp_path = Path(tmp.name)
        tmp_path.replace(path)
        return True
    except Exception as e:
        print(f"  Error writing {path}: {e}", file=sys.stderr)
        try:
            tmp_path.unlink(missing_ok=True)  # type: ignore[name-defined]
        except Exception:
            pass
        return False


# ──────────────────────────────────────────────────────────────
# ENTRY
# ──────────────────────────────────────────────────────────────
def main() -> int:
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    output_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else OUTPUT_DIR
    export_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else EXPORT_DIR

    print(f"=== Cultural Agents Sync — {timestamp} ===")
    print(f"Output: {output_dir}")
    print(f"Export: {export_dir}\n")

    # 1. Mapa Cultura — digest locally
    print("Loading Mapa Cultura agents from local digest...")
    mapa_agents = load_mapa_cultura_from_digest()

    # 2. Floresta Ativista — live fetch (optional, never aborts the run)
    fa_agents = fetch_floresta_ativista_agents()

    all_agents = mapa_agents + fa_agents
    print(f"\nTotal raw agents: {len(all_agents)}")
    unique_agents = deduplicate_agents(all_agents)
    print(f"After dedup: {len(unique_agents)}")

    features = [agent_to_geojson_feature(a) for a in unique_agents]
    geojson = build_geojson(features)

    export_data = {
        "synced_at": timestamp,
        "total_agents": len(unique_agents),
        "mapa_cultura_count": len([a for a in unique_agents if a["source"] == "mapa_cultura"]),
        "floresta_ativista_count": len([a for a in unique_agents if a["source"] == "floresta_ativista"]),
        "agents": unique_agents,
    }

    print("\nWriting output files...")
    ok = True

    main_path = output_dir / "cultural-agents.json"
    ok = atomic_write(main_path, geojson) and ok
    print(f"  {main_path}: {'OK' if ok else 'FAILED'}")

    # floresta-ativista.json — only emitted when we actually fetched fresh data.
    # Otherwise the previous digest stays in place.
    if fa_agents:
        fa_features = [f for f in features if f["properties"].get("source") == "floresta_ativista"]
        fa_path = output_dir / "floresta-ativista.json"
        ok = atomic_write(fa_path, build_geojson(fa_features)) and ok
        print(f"  {fa_path}: {'OK' if ok else 'FAILED'} ({len(fa_features)} features)")
    else:
        print(f"  Skipping floresta-ativista.json write (no fresh data)")

    export_path = export_dir / f"cultural_agents_export_{timestamp}.json"
    ok = atomic_write(export_path, export_data) and ok
    print(f"  {export_path}: {'OK' if ok else 'FAILED'}")

    print("\n=== Summary ===")
    print(f"  Mapa Cultura agents:      {len(mapa_agents)}")
    print(f"  Floresta Ativista agents: {len(fa_agents)}")
    print(f"  Total (deduplicated):     {len(unique_agents)}")
    print(f"  GeoJSON features:         {len(features)}")

    if not ok:
        print("\nERROR: Some writes failed — check output above", file=sys.stderr)
        return 1
    print("\nDone.")
    return 0


if __name__ == "__main__":
    sys.exit(main())