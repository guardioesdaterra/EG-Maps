#!/usr/bin/env node
/**
 * scripts/merge-osm-cultural.mjs
 * @why Merge OSM amenities with existing cultural-features.geojson
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Known municipalities in the region with their centers for spatial assignment
const MUNICIPALITIES = [
  { name: 'Poços de Caldas', lng: -46.558, lat: -21.792 },
  { name: 'Caldas', lng: -46.388, lat: -21.925 },
  { name: 'Águas da Prata', lng: -46.742, lat: -21.935 },
  { name: 'Andradas', lng: -46.567, lat: -22.068 },
  { name: 'Santa Rita de Caldas', lng: -46.336, lat: -22.028 },
  { name: 'Caconde', lng: -46.687, lat: -21.527 },
  { name: 'Divinolândia', lng: -46.738, lat: -21.665 },
  { name: 'Botelhos', lng: -46.395, lat: -21.649 },
  { name: 'São João da Boa Vista', lng: -46.798, lat: -21.964 },
  { name: 'Casa Branca', lng: -46.883, lat: -21.776 },
  { name: 'Vargem Grande do Sul', lng: -46.895, lat: -21.830 },
  { name: 'Ouro Fino', lng: -46.375, lat: -22.286 },
  { name: 'Jacutinga', lng: -46.608, lat: -22.282 },
  { name: 'Inconfidentes', lng: -46.328, lat: -22.319 },
  { name: 'Muzambinho', lng: -46.102, lat: -21.577 },
  { name: 'Bandeira do Sul', lng: -46.392, lat: -21.376 },
  { name: 'Cabo Verde', lng: -46.395, lat: -21.487 },
];

function haversine(lng1, lat1, lng2, lat2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function assignMunicipality(lng, lat) {
  let best = null;
  let bestDist = Infinity;
  for (const m of MUNICIPALITIES) {
    const d = haversine(lng, lat, m.lng, m.lat);
    if (d < bestDist) {
      bestDist = d;
      best = m.name;
    }
  }
  // Only assign if within reasonable distance (40km)
  return bestDist < 40 ? best : 'Unknown';
}

// Load existing cultural features
const existingPath = 'public/data/rare-earth/pococaldas/cultural-features.geojson';
const existing = JSON.parse(readFileSync(existingPath, 'utf8'));
console.log(`Existing features: ${existing.features.length}`);

// Load OSM data
const osmPath = 'scripts/output/osm-amenities-latest.geojson';
const osm = JSON.parse(readFileSync(osmPath, 'utf8'));
console.log(`OSM features: ${osm.features.length}`);

// Track existing names to avoid duplicates
const existingNames = new Set();
for (const f of existing.features) {
  existingNames.add(f.properties.name.toLowerCase().trim());
}

// Also track by OSM ID
const existingOsmIds = new Set();
for (const f of existing.features) {
  if (f.properties.osm_id) {
    existingOsmIds.add(String(f.properties.osm_id));
  }
}

console.log(`Existing unique names: ${existingNames.size}`);
console.log(`Existing OSM IDs: ${existingOsmIds.size}`);

// Filter OSM features: keep only those not already in existing
const newFeatures = [];
for (const f of osm.features) {
  const name = f.properties.name.toLowerCase().trim();
  const osmId = String(f.properties.osm_id);
  
  // Skip if already exists by name or OSM ID
  if (existingNames.has(name)) continue;
  if (existingOsmIds.has(osmId)) continue;
  
  // Skip unnamed
  if (!f.properties.name || !f.properties.name.trim()) continue;
  
  // Assign municipality if Unknown
  let municipality = f.properties.municipality;
  if (!municipality || municipality === 'Unknown') {
    const [lng, lat] = f.geometry.coordinates;
    municipality = assignMunicipality(lng, lat);
  }
  
  // Only keep if municipality is in our region
  const knownMunicipalities = MUNICIPALITIES.map(m => m.name);
  if (!knownMunicipalities.includes(municipality)) continue;
  
  // Create feature in our schema
  const props = {
    name: f.properties.name,
    type: f.properties.type,
    subtype: f.properties.subtype,
    description: f.properties.description || '',
    community: municipality,
    municipality,
    status: 'active',
    osm_id: osmId,
    source: 'OpenStreetMap',
    source_date: f.properties.source_date,
    ...(f.properties.religion && { religion: f.properties.religion }),
    ...(f.properties.denomination && { denomination: f.properties.denomination }),
  };
  
  newFeatures.push({
    type: 'Feature',
    properties: props,
    geometry: f.geometry,
  });
  
  existingNames.add(name);
  existingOsmIds.add(osmId);
}

console.log(`\nNew features to add: ${newFeatures.length}`);

// Group by type
const byType = {};
for (const f of newFeatures) {
  byType[f.properties.type] = (byType[f.properties.type] || 0) + 1;
}
console.log('By type:', byType);

// Group by municipality
const byMunicipality = {};
for (const f of newFeatures) {
  byMunicipality[f.properties.municipality] = (byMunicipality[f.properties.municipality] || 0) + 1;
}
console.log('By municipality:', byMunicipality);

// Combine
const combined = {
  type: 'FeatureCollection',
  features: [...existing.features, ...newFeatures],
};

console.log(`\nTotal combined: ${combined.features.length}`);

// Write output
const outPath = join(process.cwd(), 'public', 'data', 'rare-earth', 'pococaldas', 'cultural-features.geojson');
writeFileSync(outPath, JSON.stringify(combined, null, 2));
console.log(`\nWritten to: ${outPath}`);

// Validation
try {
  JSON.parse(readFileSync(outPath, 'utf8'));
  console.log('✓ Valid JSON');
} catch (e) {
  console.error('✗ Invalid JSON:', e.message);
}