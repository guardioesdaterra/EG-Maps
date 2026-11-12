#!/usr/bin/env node
/**
 * scripts/fetch-osm-amenities.mjs
 * @why Fetch schools, hospitals, cultural venues from OSM via Overpass API for Poços de Caldas region
 */

import https from 'https';

const CENTER = { lng: -46.5418917, lat: -21.9132389 }; // Vulcan center
const RADIUS_KM = 60; // 60km radius covers all municipalities in the region

// Split into smaller queries to avoid overloading the API
const QUERIES = [
  // Schools
  `node["amenity"="school"](around:${RADIUS_KM * 1000},${CENTER.lat},${CENTER.lng});way["amenity"="school"](around:${RADIUS_KM * 1000},${CENTER.lat},${CENTER.lng});`,
  // Universities/Colleges
  `node["amenity"="university"](around:${RADIUS_KM * 1000},${CENTER.lat},${CENTER.lng});way["amenity"="university"](around:${RADIUS_KM * 1000},${CENTER.lat},${CENTER.lng});node["amenity"="college"](around:${RADIUS_KM * 1000},${CENTER.lat},${CENTER.lng});way["amenity"="college"](around:${RADIUS_KM * 1000},${CENTER.lat},${CENTER.lng});`,
  // Hospitals
  `node["amenity"="hospital"](around:${RADIUS_KM * 1000},${CENTER.lat},${CENTER.lng});way["amenity"="hospital"](around:${RADIUS_KM * 1000},${CENTER.lat},${CENTER.lng});`,
  // Clinics/Health centers
  `node["amenity"="clinic"](around:${RADIUS_KM * 1000},${CENTER.lat},${CENTER.lng});way["amenity"="clinic"](around:${RADIUS_KM * 1000},${CENTER.lat},${CENTER.lng});node["amenity"="doctors"](around:${RADIUS_KM * 1000},${CENTER.lat},${CENTER.lng});way["amenity"="doctors"](around:${RADIUS_KM * 1000},${CENTER.lat},${CENTER.lng});node["healthcare"="centre"](around:${RADIUS_KM * 1000},${CENTER.lat},${CENTER.lng});way["healthcare"="centre"](around:${RADIUS_KM * 1000},${CENTER.lat},${CENTER.lng});`,
  // Cultural venues
  `node["amenity"="theatre"](around:${RADIUS_KM * 1000},${CENTER.lat},${CENTER.lng});way["amenity"="theatre"](around:${RADIUS_KM * 1000},${CENTER.lat},${CENTER.lng});node["amenity"="cinema"](around:${RADIUS_KM * 1000},${CENTER.lat},${CENTER.lng});way["amenity"="cinema"](around:${RADIUS_KM * 1000},${CENTER.lat},${CENTER.lng});node["amenity"="museum"](around:${RADIUS_KM * 1000},${CENTER.lat},${CENTER.lng});way["amenity"="museum"](around:${RADIUS_KM * 1000},${CENTER.lat},${CENTER.lng});node["amenity"="arts_centre"](around:${RADIUS_KM * 1000},${CENTER.lat},${CENTER.lng});way["amenity"="arts_centre"](around:${RADIUS_KM * 1000},${CENTER.lat},${CENTER.lng});node["amenity"="community_centre"](around:${RADIUS_KM * 1000},${CENTER.lat},${CENTER.lng});way["amenity"="community_centre"](around:${RADIUS_KM * 1000},${CENTER.lat},${CENTER.lng});node["amenity"="library"](around:${RADIUS_KM * 1000},${CENTER.lat},${CENTER.lng});way["amenity"="library"](around:${RADIUS_KM * 1000},${CENTER.lat},${CENTER.lng});node["tourism"="gallery"](around:${RADIUS_KM * 1000},${CENTER.lat},${CENTER.lng});way["tourism"="gallery"](around:${RADIUS_KM * 1000},${CENTER.lat},${CENTER.lng});`,
  // Heritage/Religious
  `node["amenity"="place_of_worship"](around:${RADIUS_KM * 1000},${CENTER.lat},${CENTER.lng});way["amenity"="place_of_worship"](around:${RADIUS_KM * 1000},${CENTER.lat},${CENTER.lng});node["historic"="monument"](around:${RADIUS_KM * 1000},${CENTER.lat},${CENTER.lng});way["historic"="monument"](around:${RADIUS_KM * 1000},${CENTER.lat},${CENTER.lng});node["historic"="building"](around:${RADIUS_KM * 1000},${CENTER.lat},${CENTER.lng});way["historic"="building"](around:${RADIUS_KM * 1000},${CENTER.lat},${CENTER.lng});`,
  // Water infrastructure
  `node["man_made"="water_tower"](around:${RADIUS_KM * 1000},${CENTER.lat},${CENTER.lng});way["man_made"="water_tower"](around:${RADIUS_KM * 1000},${CENTER.lat},${CENTER.lng});node["man_made"="water_works"](around:${RADIUS_KM * 1000},${CENTER.lat},${CENTER.lng});way["man_made"="water_works"](around:${RADIUS_KM * 1000},${CENTER.lat},${CENTER.lng});node["man_made"="wastewater_plant"](around:${RADIUS_KM * 1000},${CENTER.lat},${CENTER.lng});way["man_made"="wastewater_plant"](around:${RADIUS_KM * 1000},${CENTER.lat},${CENTER.lng});`,
  // Indigenous communities
  `node["place"="village"]["name"~"Aldeia|Indígena|Terra Indígena",i](around:${RADIUS_KM * 1000},${CENTER.lat},${CENTER.lng});way["place"="village"]["name"~"Aldeia|Indígena|Terra Indígena",i](around:${RADIUS_KM * 1000},${CENTER.lat},${CENTER.lng});`,
];

function buildQuery(q) {
  return `[out:json][timeout:120];(${q});out center meta;`;
}

function fetchOverpass(query) {
  const url = 'https://overpass-api.de/api/interpreter';
  const postData = `data=${encodeURIComponent(query)}`;
  
  return new Promise((resolve, reject) => {
    console.log('Fetching from Overpass API (POST)...');
    const req = https.request(url, {
      method: 'POST',
      timeout: 300000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'Accept': 'application/json',
        'User-Agent': 'EG-Maps/1.0'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          reject(new Error(`Failed to parse JSON: ${e.message}\nResponse: ${data.slice(0, 500)}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    req.write(postData);
    req.end();
  });
}

function classifyFeature(tags) {
  // Schools
  if (tags.amenity === 'school') return { type: 'school', subtype: 'school' };
  if (tags.amenity === 'university') return { type: 'school', subtype: 'university' };
  if (tags.amenity === 'college') return { type: 'school', subtype: 'college' };
  
  // Health
  if (tags.amenity === 'hospital') return { type: 'health', subtype: 'hospital' };
  if (tags.amenity === 'clinic') return { type: 'health', subtype: 'clinic' };
  if (tags.amenity === 'doctors') return { type: 'health', subtype: 'clinic' };
  if (tags.healthcare === 'centre') return { type: 'health', subtype: 'health_center' };
  
  // Cultural
  if (tags.amenity === 'theatre') return { type: 'cultural', subtype: 'theatre' };
  if (tags.amenity === 'cinema') return { type: 'cultural', subtype: 'cinema' };
  if (tags.amenity === 'museum') return { type: 'cultural', subtype: 'museum' };
  if (tags.amenity === 'arts_centre') return { type: 'cultural', subtype: 'arts_center' };
  if (tags.amenity === 'community_centre') return { type: 'cultural', subtype: 'community_center' };
  if (tags.amenity === 'library') return { type: 'cultural', subtype: 'library' };
  if (tags.tourism === 'gallery') return { type: 'cultural', subtype: 'gallery' };
  
  // Heritage/Religious
  if (tags.amenity === 'place_of_worship') {
    const religion = tags.religion || 'unknown';
    const denomination = tags.denomination || '';
    return { type: 'cultural', subtype: 'place_of_worship', religion, denomination };
  }
  if (tags.historic === 'monument') return { type: 'cultural', subtype: 'monument' };
  if (tags.historic === 'building') return { type: 'cultural', subtype: 'historic_building' };
  
  // Water
  if (tags.man_made === 'water_tower') return { type: 'water_access', subtype: 'water_tower' };
  if (tags.man_made === 'water_works') return { type: 'water_access', subtype: 'water_works' };
  if (tags.man_made === 'wastewater_plant') return { type: 'water_access', subtype: 'wastewater_plant' };
  
  // Indigenous
  if (tags.place === 'village' && /aldeia|indígena|terra indígena/i.test(tags.name || '')) {
    return { type: 'community', subtype: 'indigenous_village' };
  }
  
  return null;
}

function getCoordinates(el) {
  if (el.type === 'node') {
    return [el.lon, el.lat];
  }
  if (el.center) {
    return [el.center.lon, el.center.lat];
  }
  return null;
}

async function fetchWithRetry(query, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const data = await fetchOverpass(buildQuery(query));
      return data;
    } catch (err) {
      console.warn(`Attempt ${attempt}/${maxRetries} failed: ${err.message}`);
      if (attempt < maxRetries) {
        const wait = Math.pow(2, attempt) * 1000;
        console.log(`Waiting ${wait}ms before retry...`);
        await new Promise(r => setTimeout(r, wait));
      }
    }
  }
  throw new Error(`All ${maxRetries} attempts failed`);
}

async function main() {
  try {
    const allElements = [];
    
    for (let i = 0; i < QUERIES.length; i++) {
      console.log(`\nQuery ${i + 1}/${QUERIES.length}...`);
      const data = await fetchWithRetry(QUERIES[i]);
      const elements = data.elements || [];
      console.log(`  Got ${elements.length} elements`);
      allElements.push(...elements);
    }
    
    console.log(`\nTotal elements: ${allElements.length}`);
    
    const features = [];
    const seen = new Set();
    
    for (const el of allElements) {
      const coords = getCoordinates(el);
      if (!coords) continue;
      
      const tags = el.tags || {};
      const name = tags.name || tags['name:pt'] || tags['name:en'] || tags['official_name'] || '';
      if (!name) continue;
      
      const classification = classifyFeature(tags);
      if (!classification) continue;
      
      const key = `${name.toLowerCase()}|${coords[0].toFixed(4)}|${coords[1].toFixed(4)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      
      const municipality = tags['addr:city'] || tags['addr:municipality'] || tags.city || tags['is_in:city'] || tags['is_in:municipality'] || tags['is_in'] || '';
      const state = tags['addr:state'] || tags.state || 'MG';
      
      const props = {
        name,
        type: classification.type,
        subtype: classification.subtype,
        description: tags.description || '',
        municipality,
        state,
        status: 'active',
        osm_id: String(el.id),
        source: 'OpenStreetMap',
        source_date: new Date().toISOString().split('T')[0],
        ...(classification.religion && { religion: classification.religion }),
        ...(classification.denomination && { denomination: classification.denomination }),
      };
      
      features.push({
        type: 'Feature',
        properties: props,
        geometry: { type: 'Point', coordinates: coords },
      });
    }
    
    console.log(`Filtered to ${features.length} named features`);
    
    // Group by type
    const byType = {};
    for (const f of features) {
      byType[f.properties.type] = (byType[f.properties.type] || 0) + 1;
    }
    console.log('By type:', byType);
    
    // Group by municipality
    const byMunicipality = {};
    for (const f of features) {
      const m = f.properties.municipality || 'Unknown';
      byMunicipality[m] = (byMunicipality[m] || 0) + 1;
    }
    console.log('By municipality:', byMunicipality);
    
    // Save raw OSM data
    const output = {
      type: 'FeatureCollection',
      features,
      metadata: {
        source: 'OpenStreetMap via Overpass API',
        license: 'ODbL',
        query_center: CENTER,
        query_radius_km: RADIUS_KM,
        generated: new Date().toISOString(),
        total_features: features.length,
        by_type: byType,
        by_municipality: byMunicipality,
      },
    };
    
    const fs = await import('fs');
    const path = await import('path');
    const outDir = path.join(process.cwd(), 'scripts', 'output');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    
    const outPath = path.join(outDir, `osm-amenities-${Date.now()}.geojson`);
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
    console.log(`\nSaved to: ${outPath}`);
    
    // Also save a latest symlink/copy
    const latestPath = path.join(outDir, 'osm-amenities-latest.geojson');
    fs.writeFileSync(latestPath, JSON.stringify(output, null, 2));
    console.log(`Saved latest to: ${latestPath}`);
    
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();