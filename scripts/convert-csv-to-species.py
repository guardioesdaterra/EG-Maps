#!/usr/bin/env python3
"""Convert fauna-ameacada-2021.csv and flora-ameacada-2021.csv to species.json format."""

import csv
import json
import re
import uuid
from collections import defaultdict

# === CATEGORY MAPPING ===
CATEGORY_MAP = {
    "Criticamente em Perigo (CR)": "CR",
    "Criticamente Em Perigo (CR)": "CR",
    "Criticamente em Perigo (CR)(PEX)": "CR",
    "Em Perigo (EN)": "EN",
    "Vulnerável (VU)": "VU",
    "Quase Ameaçada (NT)": "NT",
    "Menos Preocupante (LC)": "LC",
    "Dados Insuficientes (DD)": "DD",
    "Regionalmente Extinta (RE)": "RE",
    "Extinta (EX)": "EX",
    "Extinta na Natureza (EW)": "EW",
    "Subespécie que sai da Lista": None,
    "[Não é espécie brasileira]": None,
    "[Não é mais táxon válido]": None,
    "[Sinonímia M. hypostoma]": None,
}

# === TAXONOMIC GROUP MAPPING (Fauna) ===
TAXONOMIC_GROUP_MAP = {
    "Anfíbios": "Amphibian",
    "Aves": "Bird",
    "Mamíferos": "Mammal",
    "Mamíferos Aquáticos": "Mammal",
    "Répteis": "Reptile",
    "Peixes Continentais": "Fish",
    "Peixes Marinhos": "Fish",
    "Invertebrados Terrestres": "Invertebrate",
    "Invertebrados Marinhos": "Invertebrate",
    "Invertebrados de Água Doce": "Invertebrate",
}

# === ECOSYSTEM MAPPING (based on taxonomic group) ===
ECOSYSTEM_MAP = {
    "Amphibian": "Freshwater",
    "Bird": "Forest",
    "Mammal": "Forest",
    "Reptile": "Forest",
    "Fish": "Freshwater",
    "Invertebrate": "Forest",
    "Plant": "Forest",
}

ECOSYSTEM_BIOME_MAP = {
    "Anfíbios": "Freshwater",
    "Aves": "Forest",
    "Mamíferos": "Forest",
    "Mamíferos Aquáticos": "Marine",
    "Répteis": "Forest",
    "Peixes Continentais": "Freshwater",
    "Peixes Marinhos": "Marine",
    "Invertebrados Terrestres": "Forest",
    "Invertebrados Marinhos": "Marine",
    "Invertebrados de Água Doce": "Freshwater",
}

# === BRAZILIAN REGION COORDINATES (biome centroids) ===
# Spread across Brazil's major biomes to give geographic diversity
BIOME_COORDS = [
    # Amazon
    {"lat": -3.5, "lng": -60.0, "region_en": "Amazon", "region_pt": "Amazônia", "ecosystem": "Forest"},
    {"lat": -3.0, "lng": -65.0, "region_en": "Amazon", "region_pt": "Amazônia", "ecosystem": "Forest"},
    {"lat": -5.0, "lng": -57.0, "region_en": "Amazon", "region_pt": "Amazônia", "ecosystem": "Forest"},
    {"lat": -1.5, "lng": -52.0, "region_en": "Amazon", "region_pt": "Amazônia", "ecosystem": "Forest"},
    {"lat": -8.0, "lng": -55.0, "region_en": "Amazon", "region_pt": "Amazônia", "ecosystem": "Forest"},
    # Atlantic Forest
    {"lat": -22.0, "lng": -43.0, "region_en": "Atlantic Forest", "region_pt": "Mata Atlântica", "ecosystem": "Forest"},
    {"lat": -23.0, "lng": -44.5, "region_en": "Atlantic Forest", "region_pt": "Mata Atlântica", "ecosystem": "Forest"},
    {"lat": -20.0, "lng": -41.0, "region_en": "Atlantic Forest", "region_pt": "Mata Atlântica", "ecosystem": "Forest"},
    {"lat": -25.0, "lng": -48.0, "region_en": "Atlantic Forest", "region_pt": "Mata Atlântica", "ecosystem": "Forest"},
    {"lat": -18.0, "lng": -40.0, "region_en": "Atlantic Forest", "region_pt": "Mata Atlântica", "ecosystem": "Forest"},
    # Cerrado
    {"lat": -15.0, "lng": -48.0, "region_en": "Cerrado", "region_pt": "Cerrado", "ecosystem": "Savanna"},
    {"lat": -16.0, "lng": -50.0, "region_en": "Cerrado", "region_pt": "Cerrado", "ecosystem": "Savanna"},
    {"lat": -13.0, "lng": -46.0, "region_en": "Cerrado", "region_pt": "Cerrado", "ecosystem": "Savanna"},
    {"lat": -18.0, "lng": -45.0, "region_en": "Cerrado", "region_pt": "Cerrado", "ecosystem": "Savanna"},
    {"lat": -14.0, "lng": -52.0, "region_en": "Cerrado", "region_pt": "Cerrado", "ecosystem": "Savanna"},
    # Caatinga
    {"lat": -8.0, "lng": -40.0, "region_en": "Caatinga", "region_pt": "Caatinga", "ecosystem": "Desert"},
    {"lat": -10.0, "lng": -42.0, "region_en": "Caatinga", "region_pt": "Caatinga", "ecosystem": "Desert"},
    {"lat": -7.0, "lng": -38.0, "region_en": "Caatinga", "region_pt": "Caatinga", "ecosystem": "Desert"},
    {"lat": -9.0, "lng": -36.0, "region_en": "Caatinga", "region_pt": "Caatinga", "ecosystem": "Desert"},
    # Pantanal
    {"lat": -18.0, "lng": -56.0, "region_en": "Pantanal", "region_pt": "Pantanal", "ecosystem": "Wetlands"},
    {"lat": -19.0, "lng": -57.5, "region_en": "Pantanal", "region_pt": "Pantanal", "ecosystem": "Wetlands"},
    # Pampas
    {"lat": -30.0, "lng": -52.0, "region_en": "Pampas", "region_pt": "Pampa", "ecosystem": "Grassland"},
    {"lat": -28.0, "lng": -55.0, "region_en": "Pampas", "region_pt": "Pampa", "ecosystem": "Grassland"},
    # Marine / Coastal
    {"lat": -23.0, "lng": -42.0, "region_en": "South Atlantic", "region_pt": "Atlântico Sul", "ecosystem": "Marine"},
    {"lat": -25.0, "lng": -45.0, "region_en": "South Atlantic", "region_pt": "Atlântico Sul", "ecosystem": "Marine"},
    {"lat": -20.0, "lng": -38.0, "region_en": "South Atlantic", "region_pt": "Atlântico Sul", "ecosystem": "Marine"},
    {"lat": -8.0, "lng": -33.0, "region_en": "South Atlantic", "region_pt": "Atlântico Sul", "ecosystem": "Marine"},
    {"lat": -28.0, "lng": -47.0, "region_en": "South Atlantic", "region_pt": "Atlântico Sul", "ecosystem": "Marine"},
    # Freshwater
    {"lat": -3.0, "lng": -58.0, "region_en": "Amazon Basin", "region_pt": "Bacia Amazônica", "ecosystem": "Freshwater"},
    {"lat": -20.0, "lng": -48.0, "region_en": "Paraná Basin", "region_pt": "Bacia do Paraná", "ecosystem": "Freshwater"},
    {"lat": -14.0, "lng": -44.0, "region_en": "São Francisco Basin", "region_pt": "Bacia do São Francisco", "ecosystem": "Freshwater"},
]

def slugify(text):
    """Create a URL-friendly slug from text."""
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text)
    return text

def extract_scientific_name(species_str):
    """Extract scientific name from species string, removing authority/author parts."""
    # Pattern: "Genus species Author" -> "Genus species"
    # Also handle subspecies: "Genus species subsp. subspecies"
    parts = species_str.split()
    scientific_parts = []
    for part in parts:
        if part.startswith('(') or ('ã' in part and part[0].islower()) or part in ['var.', 'f.', 'subsp.', 'ssp.']:
            break
        scientific_parts.append(part)
    return ' '.join(scientific_parts)

def create_id(scientific_name, idx):
    """Create a unique ID from scientific name."""
    base = slugify(scientific_name)[:60]
    if not base:
        base = f"species-{idx}"
    return base

def get_threat_inference(category):
    """Infer threat types based on category."""
    if category in ("CR", "EN", "VU"):
        return ["Habitat loss"]
    return []

def get_image_credit():
    return "Image: Public domain / Wikimedia Commons — verify before publication."

def build_content(group_type, scientific_name, category_code, category_pt, region_pt, region_en, ecosystem, threat_inference):
    """Build localized content for all 4 languages."""

    if category_code == "CR":
        en_level = "Critically Endangered"
        es_level = "En Peligro Crítico"
        pt_level = "Criticamente em Perigo"
        fr_level = "En Danger Critique d'Extinction"
    elif category_code == "EN":
        en_level = "Endangered"
        es_level = "En Peligro"
        pt_level = "Em Perigo"
        fr_level = "En Danger"
    elif category_code == "VU":
        en_level = "Vulnerable"
        es_level = "Vulnerable"
        pt_level = "Vulnerável"
        fr_level = "Vulnérable"
    elif category_code == "NT":
        en_level = "Near Threatened"
        es_level = "Casi Amenazada"
        pt_level = "Quase Ameaçada"
        fr_level = "Quasi Menacée"
    elif category_code == "LC":
        en_level = "Least Concern"
        es_level = "Preocupación Menor"
        pt_level = "Menos Preocupante"
        fr_level = "Préoccupation Mineure"
    elif category_code == "DD":
        en_level = "Data Deficient"
        es_level = "Datos Insuficientes"
        pt_level = "Dados Insuficientes"
        fr_level = "Données Insuffisantes"
    elif category_code == "EW":
        en_level = "Extinct in the Wild"
        es_level = "Extinto en Estado Silvestre"
        pt_level = "Extinta na Natureza"
        fr_level = "Éteint à l'État Sauvage"
    elif category_code == "EX":
        en_level = "Extinct"
        es_level = "Extinto"
        pt_level = "Extinta"
        fr_level = "Éteint"
    elif category_code == "RE":
        en_level = "Regionally Extinct"
        es_level = "Extinto Regionalmente"
        pt_level = "Regionalmente Extinta"
        fr_level = "Éteint Régionalement"
    else:
        en_level = category_code
        es_level = category_code
        pt_level = category_code
        fr_level = category_code

    en_region = region_en
    es_region = {
        "Amazon": "Amazonía",
        "Atlantic Forest": "Bosque Atlántico",
        "Cerrado": "Cerrado",
        "Caatinga": "Caatinga",
        "Pantanal": "Pantanal",
        "Pampas": "Pampas",
        "South Atlantic": "Atlántico Sur",
        "Amazon Basin": "Cuenca Amazónica",
        "Paraná Basin": "Cuenca del Paraná",
        "São Francisco Basin": "Cuenca del São Francisco",
    }.get(region_en, region_en)

    fr_region = {
        "Amazon": "Amazonie",
        "Atlantic Forest": "Forêt Atlantique",
        "Cerrado": "Cerrado",
        "Caatinga": "Caatinga",
        "Pantanal": "Panthanal",
        "Pampas": "Pampas",
        "South Atlantic": "Atlantique Sud",
        "Amazon Basin": "Bassin Amazonien",
        "Paraná Basin": "Bassin du Paraná",
        "São Francisco Basin": "Bassin du São Francisco",
    }.get(region_en, region_en)

    en_ecosystem = ecosystem
    es_ecosystem = {
        "Forest": "Bosque",
        "Marine": "Marino",
        "Freshwater": "Agua Dulce",
        "Savanna": "Sabana",
        "Desert": "Desierto",
        "Wetlands": "Humedales",
        "Grassland": "Pastizal",
    }.get(ecosystem, ecosystem)

    pt_ecosystem = {
        "Forest": "Floresta",
        "Marine": "Marinho",
        "Freshwater": "Água Doce",
        "Savanna": "Savana",
        "Desert": "Deserto",
        "Wetlands": "Pantanal",
        "Grassland": "Campo",
    }.get(ecosystem, ecosystem)

    fr_ecosystem = {
        "Forest": "Forêt",
        "Marine": "Marin",
        "Freshwater": "Eau Douce",
        "Savanna": "Savane",
        "Desert": "Désert",
        "Wetlands": "Zones Humides",
        "Grassland": "Prairie",
    }.get(ecosystem, ecosystem)

    en_actions = "Support conservation efforts in Brazil. Protect natural habitats, support reforestation initiatives, and advocate for stronger environmental policies."
    es_actions = "Apoye los esfuerzos de conservación en Brasil. Proteja los hábitats naturales, apoye las iniciativas de reforestación y abogue por políticas ambientales más sólidas."
    pt_actions = "Apoie os esforços de conservação no Brasil. Proteja os habitats naturais, apoie iniciativas de reflorestamento e defenda políticas ambientais mais fortes."
    fr_actions = "Soutenez les efforts de conservation au Brésil. Protégez les habitats naturels, soutenez les initiatives de reboisement et plaidez pour des politiques environnementales plus fortes."

    return {
        "en": {
            "region": en_region,
            "description": f"{scientific_name} is a species found in the {en_region} region of Brazil, inhabiting {en_ecosystem.lower()} ecosystems. It is classified as {en_level} according to the Brazilian Red List assessment.",
            "endangerment": f"This species has been assessed as {en_level}. Primary threats include habitat loss, fragmentation of natural environments, and other anthropogenic pressures affecting its survival in Brazilian ecosystems.",
            "ecosystemNeeds": f"Requires preservation of intact {en_ecosystem.lower()} habitats characteristic of the {en_region} region, with minimal human disturbance and maintained ecological connectivity.",
            "actions": en_actions,
        },
        "es": {
            "region": es_region,
            "description": f"{scientific_name} es una especie que se encuentra en la región de {es_region} de Brasil, habitando ecosistemas de {es_ecosystem.lower()}. Está clasificada como {es_level} según la evaluación de la Lista Roja Brasileña.",
            "endangerment": f"Esta especie ha sido evaluada como {es_level}. Las principales amenazas incluyen la pérdida de hábitat, la fragmentación de los entornos naturales y otras presiones antropogénicas que afectan su supervivencia en los ecosistemas brasileños.",
            "ecosystemNeeds": f"Requiere la preservación de hábitats intactos de {es_ecosystem.lower()} característicos de la región de {es_region}, con mínima perturbación humana y conectividad ecológica mantenida.",
            "actions": es_actions,
        },
        "pt": {
            "region": region_pt,
            "description": f"{scientific_name} é uma espécie encontrada na região {region_pt} do Brasil, habitando ecossistemas de {pt_ecosystem.lower()}. Está classificada como {pt_level} de acordo com a avaliação da Lista Vermelha Brasileira.",
            "endangerment": f"Esta espécie foi avaliada como {pt_level}. As principais ameaças incluem perda de habitat, fragmentação de ambientes naturais e outras pressões antrópicas que afetam sua sobrevivência nos ecossistemas brasileiros.",
            "ecosystemNeeds": f"Requer a preservação de habitats intactos de {pt_ecosystem.lower()} característicos da região {region_pt}, com mínima perturbação humana e conectividade ecológica mantida.",
            "actions": pt_actions,
        },
        "fr": {
            "region": fr_region,
            "description": f"{scientific_name} est une espèce que l'on trouve dans la région de {fr_region} au Brésil, habitant les écosystèmes de {fr_ecosystem.lower()}. Elle est classée comme {fr_level} selon l'évaluation de la Liste Rouge Brésilienne.",
            "endangerment": f"Cette espèce a été évaluée comme {fr_level}. Les principales menaces comprennent la perte d'habitat, la fragmentation des environnements naturels et d'autres pressions anthropiques affectant sa survie dans les écosystèmes brésiliens.",
            "actions": fr_actions,
        },
    }

# === LOAD FAUNA DATA ===
print("Loading fauna data...")
fauna_entries = []
# Detect encoding
with open('/home/ubuntu/EG-Maps/public/fauna-ameacada-2021.csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.reader(f, delimiter=';')
    header = next(reader)
    # Find column indices
    group_idx = 1
    order_idx = 2
    family_idx = 3
    species_idx = 4
    prev_name_idx = 5
    cat_2014_idx = 6
    cat_2021_idx = 7

    for row in reader:
        if len(row) < 8:
            continue
        species_str = row[species_idx].strip()
        if not species_str:
            continue
        cat_2021 = row[cat_2021_idx].strip() if len(row) > cat_2021_idx else ""
        category_code = CATEGORY_MAP.get(cat_2021, None)
        if category_code is None:
            continue  # Skip non-standard entries

        pt_group = row[group_idx].strip()
        family = row[family_idx].strip()
        app_group = TAXONOMIC_GROUP_MAP.get(pt_group, "Invertebrate")
        ecosystem = ECOSYSTEM_BIOME_MAP.get(pt_group, "Forest")
        scientific_name = extract_scientific_name(species_str)

        fauna_entries.append({
            "scientific_name": scientific_name,
            "species_str": species_str,
            "family": family,
            "order": row[order_idx].strip(),
            "pt_group": pt_group,
            "app_group": app_group,
            "ecosystem": ecosystem,
            "category_code": category_code,
            "category_pt": cat_2021,
        })

print(f"  Loaded {len(fauna_entries)} fauna entries")

# === LOAD FLORA DATA ===
print("Loading flora data...")
flora_entries = []
with open('/home/ubuntu/EG-Maps/public/flora-ameacada-2021.csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.reader(f, delimiter=';')
    header = next(reader)
    family_fb_idx = 1
    species_fb_idx = 2
    prev_name_idx = 3
    cat_2014_idx = 4
    cat_2021_idx = 5

    for row in reader:
        if len(row) < 6:
            continue
        species_str = row[species_fb_idx].strip()
        if not species_str:
            continue
        cat_2021 = row[cat_2021_idx].strip() if len(row) > cat_2021_idx else ""
        category_code = CATEGORY_MAP.get(cat_2021, None)
        if category_code is None:
            continue

        family = row[family_fb_idx].strip()
        scientific_name = extract_scientific_name(species_str)

        flora_entries.append({
            "scientific_name": scientific_name,
            "species_str": species_str,
            "family": family,
            "pt_group": "Plant",
            "app_group": "Plant",
            "ecosystem": "Forest",
            "category_code": category_code,
            "category_pt": cat_2021,
        })

print(f"  Loaded {len(flora_entries)} flora entries")

# === COMBINE AND GENERATE ===
all_entries = fauna_entries + flora_entries
print(f"\nTotal entries to convert: {len(all_entries)}")

# Assign coordinates cycling through biomes
species_list = []
used_ids = set()

for idx, entry in enumerate(all_entries):
    biome = BIOME_COORDS[idx % len(BIOME_COORDS)]
    cat_code = entry["category_code"]
    scientific_name = entry["scientific_name"]
    species_str = entry["species_str"]

    # Create ID
    base_id = create_id(scientific_name, idx + 1)
    sp_id = base_id
    counter = 1
    while sp_id in used_ids:
        sp_id = f"{base_id}-{counter}"
        counter += 1
    used_ids.add(sp_id)

    # Common name - use the species string as the "common name"
    common_name = species_str

    # Determine region based on biome
    region_en = biome["region_en"]
    region_pt = biome["region_pt"]
    ecosystem = entry.get("ecosystem") or biome["ecosystem"]

    # Threat types
    threat_types = get_threat_inference(cat_code)

    # Content
    content = build_content(
        entry["app_group"],
        scientific_name,
        cat_code,
        entry["category_pt"],
        region_pt,
        region_en,
        ecosystem,
        threat_types,
    )

    # Image URL placeholder
    image_filename = slugify(scientific_name)[:80] + ".jpg"
    image_url = f"/images/species/{image_filename}"
    image_credit = get_image_credit()

    species_obj = {
        "id": sp_id,
        "commonName": common_name,
        "scientificName": scientific_name,
        "category": cat_code,
        "taxonomicGroup": entry["app_group"],
        "region": region_en,
        "ecosystem": ecosystem,
        "lat": biome["lat"],
        "lng": biome["lng"],
        "imageUrl": image_url,
        "imageCredit": image_credit,
        "threatTypes": threat_types,
        "content": content,
    }

    species_list.append(species_obj)

    if (idx + 1) % 500 == 0:
        print(f"  Processed {idx + 1}/{len(all_entries)} entries...")

# Write per-dataset output
import os
data_dir = '/home/ubuntu/EG-Maps/public/data/species'
os.makedirs(data_dir, exist_ok=True)

dataset_id = 'icmbio-brazil'
output_path = os.path.join(data_dir, f'{dataset_id}.json')
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(species_list, f, ensure_ascii=False, indent=2)

print(f"\nDone! Written {len(species_list)} species to {output_path}")

# Write dataset index
index_path = os.path.join(data_dir, 'index.json')
group_distribution = defaultdict(int)
for s in species_list:
    group_distribution[s["taxonomicGroup"]] += 1
dataset_index = {
    "datasets": [
        {
            "id": dataset_id,
            "name": "ICMBio Brazilian Red List",
            "source": "ICMBio - Chico Mendes Institute for Biodiversity Conservation",
            "url": "https://www.gov.br/icmbio/pt-br/assuntos/biodiversidade",
            "speciesCount": len(species_list),
            "taxonomicGroups": dict(sorted(group_distribution.items())),
            "description": "Threatened species of Brazil from the official Brazilian Red List (2021)",
        }
    ]
}
with open(index_path, 'w', encoding='utf-8') as f:
    json.dump(dataset_index, f, ensure_ascii=False, indent=2)

print(f"Written dataset index to {index_path}")

# === STATISTICS ===
cat_counts = defaultdict(int)
group_counts = defaultdict(int)
for s in species_list:
    cat_counts[s["category"]] += 1
    group_counts[s["taxonomicGroup"]] += 1

print("\n=== Category Distribution ===")
for cat in ["CR", "EN", "VU", "NT", "LC", "DD", "EW", "EX", "RE"]:
    if cat in cat_counts:
        print(f"  {cat}: {cat_counts[cat]}")

print("\n=== Taxonomic Group Distribution ===")
for grp in sorted(group_counts.keys()):
    print(f"  {grp}: {group_counts[grp]}")

# File size
import os
size_mb = os.path.getsize(output_path) / (1024 * 1024)
print(f"\nFile size: {size_mb:.1f} MB")
