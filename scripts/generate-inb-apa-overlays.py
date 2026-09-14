"""
scripts/generate-inb-apa-overlays.py

Derives the two overlay datasets requested for the Vulcan observatory:

1. INB Caldas "zona de amortecimento" — a 3 km buffer ring (donut: outer
   ring + the real ANM claim as hole) around the authoritative INB mining
   claim polygon (processo 180.266/1977, MINERIO DE URANIO) read directly
   from public/data/rare-earth/pococaldas/polygons.geojson. The old
   hardcoded "INB Caldas Nuclear" box in lib/rare-earth-geo-data.ts covered
   most of the Planalto and duplicated this claim — it is replaced by the
   buffer ring.

2. APA "Santuario Ecologico da Pedra Branca" (Caldas/MG, Lei Municipal
   1.973/2006, 119.55 km2) + an indicative 3 km entorno ring. All 41
   memorial vertices (P-01..P-41, Anexo I) are converted from UTM 23S
   (SIRGAS2000) to WGS84; the planar memorial area is self-checked against
   the 119,554,336 m2 stated in the law.

No third-party deps (pure stdlib). Outputs:
  - public/data/rare-earth/pococaldas/protected-areas.geojson (APA + ZA appended)
  - stdout: TypeScript snippet for RARE_EARTH_GEO_BOUNDARIES (INB buffer)

Usage:
  python3 scripts/generate-inb-apa-overlays.py --write
  python3 scripts/generate-inb-apa-overlays.py            # dry run (prints only)
"""

import json
import math
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
POLYGONS = BASE / "public/data/rare-earth/pococaldas/polygons.geojson"
PROTECTED = BASE / "public/data/rare-earth/pococaldas/protected-areas.geojson"

INB_BUFFER_M = 3_000
APA_BUFFER_M = 3_000

# --------------------------------------------------------------------------
# Geodesy helpers (GRS80 / SIRGAS2000, UTM zone 23S, local ENU <-> WGS84)
# --------------------------------------------------------------------------

_A = 6378137.0
_E2 = 0.00669438
_EP2 = 0.006739497
_K0 = 0.9996
_LON0 = math.radians(-45.0)


def utm23s_to_wgs84(e: float, n: float) -> tuple[float, float]:
    """UTM zone 23S (south) -> (lon, lat) degrees. SIRGAS2000 == GRS80."""
    x = e - 500000.0
    y = n - 10000000.0
    m = y / _K0
    mu = m / (_A * (1 - _E2 / 4 - 3 * _E2**2 / 64 - 5 * _E2**3 / 256))
    e1 = (1 - math.sqrt(1 - _E2)) / (1 + math.sqrt(1 - _E2))
    phi1 = (
        mu
        + (3 * e1 / 2 - 27 * e1**3 / 32) * math.sin(2 * mu)
        + (21 * e1**2 / 16 - 55 * e1**4 / 32) * math.sin(4 * mu)
        + (151 * e1**3 / 96) * math.sin(6 * mu)
    )
    c1 = _EP2 * math.cos(phi1) ** 2
    t1 = math.tan(phi1) ** 2
    n1 = _A / math.sqrt(1 - _E2 * math.sin(phi1) ** 2)
    r1 = _A * (1 - _E2) / (1 - _E2 * math.sin(phi1) ** 2) ** 1.5
    d = x / (n1 * _K0)
    lat = phi1 - (n1 * math.tan(phi1) / r1) * (
        d * d / 2
        - (5 + 3 * t1 + 10 * c1 - 4 * c1 * c1 - 9 * _EP2) * d**4 / 24
        + (61 + 90 * t1 + 298 * c1 + 45 * t1 * t1 - 252 * _EP2 - 3 * c1 * c1)
        * d**6
        / 720
    )
    lon = _LON0 + (
        d - (1 + 2 * t1 + c1) * d**3 / 6
        + (5 - 2 * c1 + 28 * t1 - 3 * c1 * c1 + 8 * _EP2 + 24 * t1 * t1)
        * d**5
        / 120
    ) / math.cos(phi1)
    return math.degrees(lon), math.degrees(lat)


def enu_origin(ring: list[list[float]]) -> tuple[float, float]:
    lons = [p[0] for p in ring]
    lats = [p[1] for p in ring]
    return (min(lons) + max(lons)) / 2, (min(lats) + max(lats)) / 2


def to_enu(ring: list[list[float]], lon0: float, lat0: float) -> list[tuple[float, float]]:
    r = 6371000.0
    la0 = math.radians(lat0)
    return [
        ((math.radians(p[0]) - math.radians(lon0)) * math.cos(la0) * r,
         (math.radians(p[1]) - math.radians(lat0)) * r)
        for p in ring
    ]


def from_enu(pts: list[tuple[float, float]], lon0: float, lat0: float) -> list[list[float]]:
    r = 6371000.0
    la0 = math.radians(lat0)
    return [
        [lon0 + math.degrees(x / (r * math.cos(la0))), lat0 + math.degrees(y / r)]
        for x, y in pts
    ]


def signed_area(pts: list[tuple[float, float]]) -> float:
    return sum((x2 - x1) * (y2 + y1) for (x1, y1), (x2, y2) in zip(pts, pts[1:])) / 2


def _seg_intersect(p, q, r, s) -> bool:
    def o(a, b, c):
        return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])

    d1, d2, d3, d4 = o(p, q, r), o(p, q, s), o(r, s, p), o(r, s, q)
    return ((d1 > 0) != (d2 > 0)) and ((d3 > 0) != (d4 > 0))


def _area2(pts: list[tuple[float, float]]) -> float:
    return abs(sum(
        (x2 - x1) * (y2 + y1) for (x1, y1), (x2, y2) in zip(pts, pts[1:] + pts[:1])
    )) / 2


def remove_loops(ring: list[tuple[float, float]]) -> list[tuple[float, float]]:
    """Cut figure-eight ears from an offset ring.

    Outward buffers of concave polygons fold back on themselves around
    narrow spikes, producing ears. Each ear is bounded by two crossing
    non-adjacent segments; of the two vertex chains between them, the ear
    is the one whose removal keeps the LARGER enclosed area (an outward
    buffer only ever grows). Iterates until no crossings remain.
    """
    pts = list(ring[:-1] if ring[0] == ring[-1] else ring)
    guard = 0
    while guard < 200:
        guard += 1
        n = len(pts)
        found = None
        for i in range(n):
            for j in range(i + 2, n):
                if i == 0 and j == n - 1:
                    continue  # closure neighbours, not a loop
                if _seg_intersect(pts[i], pts[(i + 1) % n], pts[j], pts[(j + 1) % n]):
                    found = (i, j)
                    break
            if found:
                break
        if not found:
            break
        i, j = found
        # Rotate so the crossing starts at 0: chains are [1..k] and [k+1..n-1].
        rot = pts[i:] + pts[:i]
        k = j - i
        keep_a = [rot[0]] + rot[k + 1 :]  # drop chain 1..k
        keep_b = rot[: k + 1]  # drop chain k+1..end
        pts = keep_a if _area2(keep_a) >= _area2(keep_b) else keep_b
    pts.append(pts[0])
    return pts


def offset_ring(
    enu: list[tuple[float, float]], dist: float, miter_limit: float = 3.0
) -> list[tuple[float, float]]:
    """Outward offset of a CCW ring by `dist` metres.

    Miter joins with a bevel fallback: spikes longer than
    `miter_limit * dist` (acute vertices) are cut to a bevel so narrow
    spikes (e.g. the APA memorial corner) cannot fling the ring out.
    """
    pts = enu[:-1] if enu[0] == enu[-1] else list(enu)
    # NOTE: this shoelace variant is the negation of the standard form, so
    # CCW rings have NEGATIVE area — reverse only when area is positive (CW).
    if signed_area(pts) > 0:
        pts = list(reversed(pts))
    n = len(pts)
    # Per-edge direction + unit outward normal (CCW => right side).
    edges: list[tuple[float, float, float, float]] = []
    for i in range(n):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % n]
        dx, dy = x2 - x1, y2 - y1
        ln = math.hypot(dx, dy) or 1.0
        edges.append((dx, dy, dy / ln, -dx / ln))
    out: list[tuple[float, float]] = []
    for i in range(n):
        vx, vy = pts[i]
        dx1, dy1, nx1, ny1 = edges[i - 1]
        dx2, dy2, nx2, ny2 = edges[i]
        ax, ay = vx + nx1 * dist, vy + ny1 * dist
        bx, by = vx + nx2 * dist, vy + ny2 * dist
        denom = dx1 * dy2 - dy1 * dx2
        if abs(denom) < 1e-12:
            out.append((bx, by))
            continue
        t = ((bx - ax) * dy2 - (by - ay) * dx2) / denom
        mx, my = ax + t * dx1, ay + t * dy1
        if math.hypot(mx - vx, my - vy) > miter_limit * dist:
            out.extend([(ax, ay), (bx, by)])  # bevel: cut the spike
        else:
            out.append((mx, my))
    out.append(out[0])
    return remove_loops(out)


def ring_area_ha(ring: list[list[float]]) -> float:
    lon0, lat0 = enu_origin(ring)
    return abs(signed_area(to_enu(ring, lon0, lat0))) / 10_000


# --------------------------------------------------------------------------
# 1. INB claim -> 10 km buffer donut
# --------------------------------------------------------------------------

def load_inb_ring() -> list[list[float]]:
    data = json.loads(POLYGONS.read_text(encoding="utf-8"))
    for f in data["features"]:
        p = f.get("properties", {})
        if "NUCLEARES" in str(p.get("NOME", "")) and "NIO" in str(p.get("SUBS", "")):
            geom = f["geometry"]
            assert geom["type"] == "Polygon", geom["type"]
            ring = [[c[0], c[1]] for c in geom["coordinates"][0]]
            return ring
    raise SystemExit("INB claim polygon not found in pococaldas/polygons.geojson")


def build_inb_buffer(ring: list[list[float]]) -> list[list[list[float]]]:
    lon0, lat0 = enu_origin(ring)
    enu = to_enu(ring, lon0, lat0)
    outer_enu = offset_ring(enu, INB_BUFFER_M)
    outer = from_enu(outer_enu, lon0, lat0)
    # hole must be opposite winding of outer
    hole = [list(map(float, c)) for c in ring]
    # RFC7946 winding: exterior CCW (negative in this shoelace variant),
    # holes CW (positive).
    if signed_area([(p[0], p[1]) for p in outer]) > 0:
        outer = list(reversed(outer))
    if signed_area([(p[0], p[1]) for p in hole]) < 0:
        hole = list(reversed(hole))
    return [outer, hole]


# --------------------------------------------------------------------------
# 2. APA Pedra Branca (representative) + 3 km entorno
# --------------------------------------------------------------------------

# --------------------------------------------------------------------------
# 2. APA Pedra Branca (official memorial P-01..P-41) + 3 km entorno
# --------------------------------------------------------------------------

# Memorial vertices, Lei 1.973/2006 Anexo I (UTM 23S, metres).
# P-01: marco topografico do IBGE no pico da Pedra Branca.
APA_MEMORIAL: list[tuple[int, int]] = [
    (358814, 7568840),  # P-01 pico da Pedra Branca
    (361174, 7565935),  # P-02 divisa Caldas–Santa Rita de Caldas
    (362511, 7567765),  # P-03 divisa Caldas–Santa Rita de Caldas
    (362017, 7570555),  # P-04 margens da BR 459
    (361726, 7571680),  # P-05 BR 459
    (361145, 7572559),  # P-06 BR 459, entrada Pecuaria/Tribo indigena
    (360070, 7573780),  # P-07 BR 459, trevo Sao Pedro de Caldas
    (360419, 7574390),  # P-08 entroncamento deposito de residuos
    (360245, 7574942),  # P-09 estrada de terra
    (359896, 7575436),  # P-10
    (359722, 7575843),  # P-11
    (359247, 7576033),  # P-12 curvas de nivel
    (358903, 7575546),  # P-13
    (358707, 7575157),  # P-14 linha reta
    (358154, 7575309),  # P-15
    (357880, 7574908),  # P-16
    (357597, 7574605),  # P-17
    (357210, 7574575),  # P-18
    (356504, 7574742),  # P-19 corrego Mae Florenca (oeste)
    (356321, 7574612),  # P-20
    (355970, 7574834),  # P-21 bairro Morro da Barreira
    (355562, 7575157),  # P-22
    (355108, 7575324),  # P-23
    (354883, 7575498),  # P-24 MG 146 (Caldas–Pocinhos do Rio Verde)
    (354408, 7575266),  # P-25 MG 146
    (353452, 7575953),  # P-26 rumo a Pocinhos
    (353400, 7574435),  # P-27 fonte de agua Mineral (Grande Hotel Pocinhos)
    (353011, 7573701),  # P-28 entrada do Balneario (Pocinhos)
    (352271, 7572909),  # P-29 rodovia
    (351506, 7571783),  # P-30 rumo a Andradas
    (349929, 7570611),  # P-31 estrada de terra (Andradas)
    (348818, 7568482),  # P-32
    (347874, 7565288),  # P-33
    (348041, 7564289),  # P-34 rumo a Andradas
    (347591, 7563811),  # P-35
    (348331, 7562837),  # P-36 curva em nivel
    (349981, 7562673),  # P-37 divisa Ibitiura de Minas/Andradas/Caldas
    (351750, 7562271),  # P-38 divisas de municipios
    (355133, 7565282),  # P-39 divisas de municipios
    (358007, 7564953),  # P-40
    (357955, 7567267),  # P-41 divisa Caldas–Santa Rita de Caldas
]

APA_LEGAL_M2 = 119_554_336

P01 = utm23s_to_wgs84(*APA_MEMORIAL[0])
P02 = utm23s_to_wgs84(*APA_MEMORIAL[1])
P03 = utm23s_to_wgs84(*APA_MEMORIAL[2])


def memorial_area_m2() -> float:
    """Planar shoelace area of the UTM memorial (self-check vs the law)."""
    pts = [(float(e), float(n)) for e, n in APA_MEMORIAL]
    return abs(sum(
        (x2 - x1) * (y2 + y1) for (x1, y1), (x2, y2) in zip(pts, pts[1:] + pts[:1])
    )) / 2


def build_apa_ring() -> list[list[float]]:
    """APA boundary from the official memorial P-01..P-41 (UTM 23S)."""
    ring = [list(utm23s_to_wgs84(e, n)) for e, n in APA_MEMORIAL]
    ring.append(list(ring[0]))
    return [[round(x, 6), round(y, 6)] for x, y in ring]


def build_apa_buffer(apa: list[list[float]]) -> list[list[list[float]]]:
    lon0, lat0 = enu_origin(apa)
    enu = to_enu(apa, lon0, lat0)
    outer_enu = offset_ring(enu, APA_BUFFER_M)
    outer = from_enu(outer_enu, lon0, lat0)
    hole = [list(c) for c in apa]
    # RFC7946 winding: exterior CCW (negative in this shoelace variant),
    # holes CW (positive).
    if signed_area([(p[0], p[1]) for p in outer]) > 0:
        outer = list(reversed(outer))
    if signed_area([(p[0], p[1]) for p in hole]) < 0:
        hole = list(reversed(hole))
    return [outer, hole]


# --------------------------------------------------------------------------
# Emit
# --------------------------------------------------------------------------

LAW_URL = (
    "https://territorioslivres.org/wp-content/uploads/2021/09/"
    "LEI-NA%E2%80%9AAo-1.973-DE-29-12-2006-29_09_2021-23_12_25.pdf"
)


def main() -> None:
    write = "--write" in sys.argv

    inb_ring = load_inb_ring()
    inb_donut = build_inb_buffer(inb_ring)
    apa = build_apa_ring()
    apa_donut = build_apa_buffer(apa)

    print(f"P-01 pico da Pedra Branca: {P01[0]:.6f}, {P01[1]:.6f}")
    print(f"P-02 divisa Santa Rita:    {P02[0]:.6f}, {P02[1]:.6f}")
    print(f"P-03 divisa Santa Rita:    {P03[0]:.6f}, {P03[1]:.6f}")
    mem_m2 = memorial_area_m2()
    print(f"Memorial planar area:      {mem_m2:,.0f} m2 (legal: {APA_LEGAL_M2:,} m2; diff {(mem_m2 - APA_LEGAL_M2) / APA_LEGAL_M2:+.2%})")
    print(f"INB claim drawn area:      {ring_area_ha(inb_ring):,.0f} ha (ANM: 3,193 ha)")
    print(f"INB ZA (3 km) ring area:   {ring_area_ha(inb_donut[0]):,.0f} ha")
    print(f"APA drawn area:            {ring_area_ha(apa):,.0f} ha (legal: 11,955 ha)")
    print(f"APA entorno (3 km) area:   {ring_area_ha(apa_donut[0]):,.0f} ha")

    r = lambda v: round(v, 6)  # noqa: E731
    inb_coords = [[[r(x), r(y)] for x, y in ring] for ring in inb_donut]
    apa_coords = [[[r(x), r(y)] for x, y in ring] for ring in [apa]]
    apa_za_coords = [[[r(x), r(y)] for x, y in ring] for ring in apa_donut]

    ts = (
        "    // INB Caldas — zona de amortecimento (3 km ring around the real\n"
        "    // ANM claim 180.266/1977; generated by scripts/generate-inb-apa-overlays.py).\n"
        "    // Replaces the former oversized 'INB Caldas Nuclear' box that\n"
        "    // duplicated the claim polygon and covered most of the Planalto.\n"
        "    { type: 'Feature', properties: { name: 'INB Caldas \\u00b7 Zona de Amortecimento (3 km)', type: 'nuclear_buffer' }, geometry: { type: 'Polygon', coordinates: "
        + json.dumps(inb_coords, separators=(",", ":"))
        + " } },\n"
    )
    print("\n----- TypeScript snippet (paste into RARE_EARTH_GEO_BOUNDARIES) -----")
    print(ts)

    apa_feature = {
        "type": "Feature",
        "properties": {
            "name": "APA Santuário Ecológico da Pedra Branca",
            "kind": "conservation_unit",
            "category": "conservation_unit",
            "color": "#27ae60",
            "overlap_warning": "Mining prohibited (Lei 1.973/2006, exc. licensed pre-existing)",
            "state": "MG",
            "municipality": "Caldas",
            "area_ha": 11955,
            "people": "",
            "source_url": LAW_URL,
            "status": "sem plano de manejo",
            "legal": "Lei Municipal nº 1.973/2006",
            "boundary_status": "official memorial P-01..P-41, Anexo I (UTM 23S, SIRGAS2000)",
        },
        "geometry": {"type": "Polygon", "coordinates": apa_coords},
    }
    apa_za_feature = {
        "type": "Feature",
        "properties": {
            "name": "Zona de Amortecimento — APA Pedra Branca (indicativa, 3 km)",
            "kind": "buffer_zone",
            "category": "buffer_zone",
            "color": "#2ecc71",
            "overlap_warning": "",
            "state": "MG",
            "municipality": "Caldas",
            "area_ha": round(ring_area_ha(apa_donut[0])),
            "people": "",
            "source_url": LAW_URL,
            "status": "indicativa",
            "legal": "Entorno indicativo (3 km) — APA sem plano de manejo",
            "boundary_status": "3 km entorno ring around the official memorial; pending plano de manejo",
        },
        "geometry": {"type": "Polygon", "coordinates": apa_za_coords},
    }

    if write:
        data = json.loads(PROTECTED.read_text(encoding="utf-8"))
        wanted = [apa_feature, apa_za_feature]
        keep = [
            f for f in data["features"]
            if f.get("properties", {}).get("name") not in {w["properties"]["name"] for w in wanted}
        ]
        replaced = len(data["features"]) - len(keep)
        data["features"] = keep + wanted
        PROTECTED.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
        print(f"replaced {replaced} feature(s), wrote {len(wanted)} APA feature(s) to {PROTECTED}")
    else:
        print("\ndry run: pass --write to replace APA features in protected-areas.geojson")


if __name__ == "__main__":
    main()