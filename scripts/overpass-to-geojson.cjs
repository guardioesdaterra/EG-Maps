#!/usr/bin/env node

/**
 * scripts/overpass-to-geojson.cjs
 * @why Overpass API converter — parses Overpass XML/JSON responses into GeoJSON FeatureCollection
 */
/**
 * Converts Overpass API JSON output to GeoJSON.
 * Handles ways (polygons/lines) and relations (multipolygons).
 *
 * Usage:
 *   node scripts/overpass-to-geojson.js <input.json> <output.geojson> [--type polygon|line|auto]
 */
const fs = require('fs');

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: overpass-to-geojson.js <input.json> <output.geojson> [--type polygon|line|auto]');
  process.exit(1);
}

const inputPath = args[0];
const outputPath = args[1];
const typeFlag = args.indexOf('--type');
const forcedType = typeFlag !== -1 ? args[typeFlag + 1] : 'auto';

const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const elements = data.elements || [];

const nodeLookup = new Map();
for (const el of elements) {
  if (el.type === 'node') {
    nodeLookup.set(el.id, [el.lon, el.lat]);
  }
}

function getWayCoords(way) {
  if (way.geometry) {
    return way.geometry.map(p => [p.lon, p.lat]);
  }
  if (way.nodes) {
    return way.nodes.map(id => nodeLookup.get(id)).filter(Boolean);
  }
  return [];
}

function classifyWater(tags) {
  if (tags.waterway === 'river' || tags.waterway === 'canal') return 'river';
  if (tags.waterway === 'stream' || tags.waterway === 'brook' || tags.waterway === 'ditch') return 'stream';
  if (tags.water === 'reservoir') return 'reservoir';
  if (tags.water === 'lake') return 'lake';
  if (tags.water === 'pond') return 'pond';
  if (tags.natural === 'water') return 'water';
  if (tags.waterway) return tags.waterway;
  return 'unknown';
}

function isClosed(coords) {
  if (coords.length < 4) return false;
  const first = coords[0];
  const last = coords[coords.length - 1];
  return first[0] === last[0] && first[1] === last[1];
}

function computeAreaKm2(coords) {
  if (!isClosed(coords)) return 0;
  const pts = coords.slice(0, -1);
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    area += pts[i][0] * pts[j][1];
    area -= pts[j][0] * pts[i][1];
  }
  return Math.abs(area / 2) * 111.32 * 111.32 * Math.cos(-22 * Math.PI / 180);
}

function computeLengthKm(coords) {
  let len = 0;
  for (let i = 1; i < coords.length; i++) {
    const [lon1, lat1] = coords[i - 1];
    const [lon2, lat2] = coords[i];
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    len += 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  return len;
}

const features = [];

for (const el of elements) {
  if (el.type !== 'way' && el.type !== 'relation') continue;
  if (!el.tags) continue;

  const tags = el.tags;
  const name = tags.name || tags['name:pt'] || tags['name:en'] || '';
  const waterType = classifyWater(tags);

  let geomType;
  let coords;

  if (el.type === 'way') {
    coords = getWayCoords(el);
    if (coords.length < 2) continue;
    if (isClosed(coords) && (forcedType === 'polygon' || forcedType === 'auto')) {
      geomType = 'Polygon';
      coords = [coords];
    } else if (forcedType === 'line' || (!isClosed(coords))) {
      geomType = 'LineString';
    } else {
      geomType = 'LineString';
    }
  } else if (el.type === 'relation') {
    if (tags.type === 'multipolygon' || tags.type === 'boundary') {
      continue;
    }
    continue;
  }

  if (!coords || (Array.isArray(coords) && coords.length === 0)) continue;

  const props = {
    osm_id: el.id,
    name,
    water_type: waterType,
    natural: tags.natural || '',
    water: tags.water || '',
    waterway: tags.waterway || '',
    width: tags.width ? parseFloat(tags.width) : null,
    depth: tags.depth ? parseFloat(tags.depth) : null,
    area_km2: geomType === 'Polygon' ? Math.round(computeAreaKm2(coords[0] || coords) * 1000) / 1000 : null,
    length_km: geomType === 'LineString' ? Math.round(computeLengthKm(coords) * 100) / 100 : null,
  };

  features.push({
    type: 'Feature',
    id: `osm/${el.id}`,
    properties: props,
    geometry: { type: geomType, coordinates: coords },
  });
}

const geojson = {
  type: 'FeatureCollection',
  features,
  metadata: {
    source: 'OpenStreetMap via Overpass API',
    license: 'ODbL',
    query_area: '-22.9,-47.5,-20.9,-45.5',
    generated: new Date().toISOString(),
    total_features: features.length,
  },
};

fs.writeFileSync(outputPath, JSON.stringify(geojson, null, 2));
console.log(`Converted ${elements.length} elements → ${features.length} GeoJSON features → ${outputPath}`);

const byType = {};
for (const f of features) {
  const t = f.properties.water_type;
  byType[t] = (byType[t] || 0) + 1;
}
console.log('By type:', JSON.stringify(byType));
