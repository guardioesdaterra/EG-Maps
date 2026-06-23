import { readFileSync, writeFileSync } from 'fs';

const DATASETS = [
  { id: 'icmbio-brazil', file: 'icmbio-brazil.json' },
  { id: 'iucn', file: 'iucn.json' },
];

/** Deterministic offset per species within a coordinate group.
 *  Spreads co-located species in a ~6 km radius so MapLibre can un-cluster on zoom. */
function spreadOffset(index, total) {
  // Use golden angle and index to produce well-distributed 2D offsets
  const goldenAngle = 2.399963; // radians
  const angle = goldenAngle * index;
  // Radius grows with index so distant indices don't overlap
  const radius = 0.0008 + 0.035 * Math.sqrt(index / Math.max(total, 1));
  return {
    latOffset: radius * Math.cos(angle),
    lngOffset: radius * Math.sin(angle),
  };
}

for (const ds of DATASETS) {
  const srcPath = `./public/data/species/${ds.file}`;
  const outPath = `./public/data/species/${ds.id}-index.json`;

  const fullData = JSON.parse(readFileSync(srcPath, 'utf8'));

  // Group species by coordinate to apply offsets within each group
  const coordMap = new Map();
  for (const s of fullData) {
    const key = `${s.lat},${s.lng}`;
    if (!coordMap.has(key)) coordMap.set(key, []);
    coordMap.get(key).push(s);
  }

  const lightweight = [];
  for (const [, group] of coordMap) {
    for (let i = 0; i < group.length; i++) {
      const s = group[i];
      const { latOffset, lngOffset } = spreadOffset(i, group.length);
      lightweight.push({
        id: s.id,
        commonName: s.commonName,
        scientificName: s.scientificName,
        taxonomicGroup: s.taxonomicGroup,
        category: s.category,
        lat: Number((s.lat + latOffset).toFixed(6)),
        lng: Number((s.lng + lngOffset).toFixed(6)),
        imageUrl: s.imageUrl || null,
        description: s.content?.en?.description || '',
        endangerment: s.content?.en?.endangerment || '',
        threatTypes: s.threatTypes || [],
      });
    }
  }

  writeFileSync(outPath, JSON.stringify(lightweight, null, 0));

  // Also update coordinates in the full data file so detail lookups match
  const offsetMap = new Map();
  for (const s of fullData) {
    offsetMap.set(s.id, s);
  }
  for (const entry of lightweight) {
    const full = offsetMap.get(entry.id);
    if (full) {
      full.lat = entry.lat;
      full.lng = entry.lng;
    }
  }
  writeFileSync(srcPath, JSON.stringify(fullData, null, 0));

  const srcSize = (readFileSync(srcPath).length / 1024 / 1024).toFixed(2);
  const outSize = (readFileSync(outPath).length / 1024).toFixed(0);
  console.log(`${ds.id}: ${srcSize} MB → ${outSize} KB (${lightweight.length} species)`);
}
