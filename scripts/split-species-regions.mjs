/**
 * scripts/split-species-regions.mjs
 * @why Species region splitter — partitions species data by biogeographic region
 * @deps fs (readFileSync, writeFileSync, mkdirSync)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const srcPath = './public/data/species/icmbio-brazil.json';
const outDir = './public/data/species/regions';

mkdirSync(outDir, { recursive: true });

const fullData = JSON.parse(readFileSync(srcPath, 'utf8'));

const byRegion = new Map();
for (const s of fullData) {
  const region = s.region || 'unknown';
  if (!byRegion.has(region)) byRegion.set(region, []);
  byRegion.get(region).push(s);
}

const manifest = {};
for (const [region, species] of byRegion) {
  const slug = region.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
  const fileName = `${slug}.json`;
  const outPath = `${outDir}/${fileName}`;
  writeFileSync(outPath, JSON.stringify(species, null, 0));

  const sizeKB = (Buffer.byteLength(JSON.stringify(species)) / 1024).toFixed(0);
  manifest[region] = { file: fileName, count: species.length, sizeKB: Number(sizeKB) };
  console.log(`  ${region}: ${species.length} species → ${fileName} (${sizeKB} KB)`);
}

writeFileSync(`${outDir}/manifest.json`, JSON.stringify(manifest, null, 2));
console.log(`\nManifest: ${outDir}/manifest.json`);
console.log(`Total regions: ${Object.keys(manifest).length}`);
