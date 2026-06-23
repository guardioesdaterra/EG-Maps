import { readFileSync, writeFileSync } from 'fs';

const DATASETS = [
  { id: 'icmbio-brazil', file: 'icmbio-brazil.json' },
  { id: 'iucn', file: 'iucn.json' },
];

for (const ds of DATASETS) {
  const srcPath = `./public/data/species/${ds.file}`;
  const outPath = `./public/data/species/${ds.id}-index.json`;

  const fullData = JSON.parse(readFileSync(srcPath, 'utf8'));

  const lightweight = fullData.map(s => ({
    id: s.id,
    commonName: s.commonName,
    scientificName: s.scientificName,
    taxonomicGroup: s.taxonomicGroup,
    category: s.category,
    lat: s.lat,
    lng: s.lng,
    imageUrl: s.imageUrl || null,
    description: s.content?.en?.description || '',
    endangerment: s.content?.en?.endangerment || '',
    threatTypes: s.threatTypes || [],
  }));

  writeFileSync(outPath, JSON.stringify(lightweight, null, 0));

  const srcSize = (readFileSync(srcPath).length / 1024 / 1024).toFixed(2);
  const outSize = (readFileSync(outPath).length / 1024).toFixed(0);
  console.log(`${ds.id}: ${srcSize} MB → ${outSize} KB (${lightweight.length} species)`);
}
