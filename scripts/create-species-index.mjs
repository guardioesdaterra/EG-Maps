import { readFileSync, writeFileSync } from 'fs';

// Read the full species data
const fullData = JSON.parse(readFileSync('./public/data/species/icmbio-brazil.json', 'utf8'));

// Create lightweight index - only marker data + English text for popup
const lightweight = fullData.map(s => ({
  id: s.id,
  commonName: s.commonName,
  scientificName: s.scientificName,
  taxonomicGroup: s.taxonomicGroup,
  category: s.category,
  lat: s.lat,
  lng: s.lng,
  imageUrl: s.imageUrl || null,
  // Only include English content for basic info
  description: s.content?.en?.description || '',
  endangerment: s.content?.en?.endangerment || '',
  threatTypes: s.threatTypes || [],
}));

// Write lightweight index
writeFileSync('./public/data/species/icmbio-brazil-index.json', JSON.stringify(lightweight, null, 0));

// Report sizes
console.log('Original file size:', (readFileSync('./public/data/species/icmbio-brazil.json').length / 1024 / 1024).toFixed(2), 'MB');
console.log('Lightweight index:', (readFileSync('./public/data/species/icmbio-brazil-index.json').length / 1024).toFixed(0), 'KB');
console.log('Species count:', lightweight.length);
