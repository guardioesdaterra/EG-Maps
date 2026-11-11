#!/usr/bin/env node
/**
 * Cleanup cultural-features.geojson - remove template-generated hallucinated entries
 * Keep only OSM-verified entries and specific named institutions/communities
 */

import { readFileSync, writeFileSync } from 'fs';

const inputPath = 'public/data/rare-earth/pococaldas/cultural-features.geojson';
const outputPath = 'public/data/rare-earth/pococaldas/cultural-features.geojson';

const data = JSON.parse(readFileSync(inputPath, 'utf8'));

// Names of features to KEEP (verified or specific named entities)
const keepNames = new Set([
  // OSM-verified (14 entries)
  'Aldeia Kiriri Caldas-MG',
  'Complexo Cultural da Urca',
  'Estação das Artes',
  'Espaço Cultural Boca do Leão',
  'Casa da Cultura — Vargem Grande do Sul',
  'Museu da Revolução de 1932',
  'Museu Boca do Leão',
  'Museu de Botelhos — Museu do Café',
  'Museu Prefeito Araken Cruz',
  'Centro Municipal de Saúde — Andradas',
  'Biblioteca Universitária — UNIFAL-MG',
  'Biblioteca Comunitária Wolgran Junqueira Ferreira',
  'Capela Santa Rita',
  'Gruta Nossa Senhora de Lourdes',
  
  // Specific named cultural institutions in Poços de Caldas
  'Instituto Moreira Salles (IMS)',
  'Cooperativa Eita — Centro de Artes',
  'Espaço Cultural da Urca',
  'CEU — Centro de Artes e Esportes Unificados',
  'Box Cultural',
  'Coreto da Praça Pedro Sanches',
  'Museu Histórico e Geográfico de Poços de Caldas',
  'Biblioteca Pública Centenário',
  'Termas Antônio Carlos — Museu do Termalismo',
  'Lavanda Cultural',
  'Biblioteca Pública Julio Bonazzi',
  'Biblioteca Pública COHAB',
  'Biblioteca Pública Vila Nova',
  'Mirante São José',
  'Festival de Inverno de Poços de Caldas',
  'Grupo de Catira Poços-caldense',
  'Associação Grupo Entre Nós',
  'Associação dos Artesãos e Artistas Plásticos (Armazém das Artes)',
  'Associação Ternos de Congos e Caiapós',
  'Associação dos Violeiros de Poços de Caldas',
  'ONG Trilhos',
  'Associação Afro Ancestral de Poços de Caldas',
  'Grupo Dança pra Criança',
  
  // Specific schools with unique names (not generic templates)
  'Escola Municipal Pedro Lessa',
  'Escola Estadual Newton de Mello',
  'Escola Municipal Tiradentes',
  'UEMG Poços de Caldas',
  'PUC Minas Poços de Caldas',
  'Escola Municipal Dr. Delvo Stivanin',
  'Polo UAB Santa Rita de Caldas',
  'Escola Indígena Xucuru Kariri Warkana de Aruana',
  'Escola Indígena Xucuru-Kariri Wakonã (Caldas)',
  
  // Specific health facilities in major city
  'Hospital Municipal de Poços de Caldas',
  'UPA 24h Poços de Caldas',
  
  // Specific cultural landmarks in Poços de Caldas
  'Igreja Matriz de Nossa Senhora do Rosário',
  'Museu Municipal de Poços de Caldas',
  'Teatro Municipal',
  'Parque Municipal das Águas',
  'Bairro Caldas Velhas',
  
  // Specific water infrastructure in Poços de Caldas
  'Captação de Água Municipal',
  'Estação de Tratamento de Água',
  'Nascente do Ribeirão Caldas',
  'Ponto de Monitoramento — Rio Caldas',
  
  // Specific communities
  'Comunidade Rural do Bairro Gouvêa',
  'Posto de Saúde da Zona Rural',
  'Posto de Saúde Indígena Xucuru Kariri',
  'Quadra Poliesportiva Indígena',
  'Igreja Comunitária Xucuru-Kariri (Fazenda Boa Vista)',
  'Comunidade Rural Rio Verde',
  'Ponto de Captação — Rio Verde',
  'Igreja Matriz de Caldas',
  'Comunidade Rural de Campestrinho',
  'Estância Hidromineral de Águas da Prata',
  
  // Andradas specific (some OSM-mapped)
  'Museu Municipal de Andradas',
  'Igreja Matriz de Andradas',
  'Distrito de Campestrinho',
  'Comunidade Rural de Campestrinho — Andradas',
  'Centro Municipal de Saúde — Andradas',
  
  // Caconde specific
  'Coreto de Caconde',
  'Igreja Matriz de Caconde',
  'Represa de Caconde',
  'Comunidade Rural de Itaipu',
  
  // Santa Rita specific
  'Igreja Matriz de Santa Rita',
  
  // Divinolândia specific
  'Igreja Matriz de Divinolândia',
  
  // Other municipalities specific
  'Comunidade Rural de Itaipu — Caconde',
  'Aldeia Ibiramã Kiriri do Acre',
  'Aldeia Xucuru Kariri',
  'Aldeia Kariri Wakonã — Taquari',
  
  // Additional specific entries from end of file
  'Vila Samambaia',
  'Jardim Panorama',
  'Vila Graziani',
  'Vila Mosconi',
  'Jardim Nova Andradas',
  'Vila Garibaldi',
  'Jardim Bela Vista',
  'Jardim Portal do Sol',
  'Vila Santa Cruz',
  'Vila Buzato',
  'Vila Martinelli',
  'Vila Caracol',
  'Vila Santo Afonso',
]);

// Filter features
const originalCount = data.features.length;
data.features = data.features.filter(f => keepNames.has(f.properties.name));

console.log(`Original features: ${originalCount}`);
console.log(`Kept features: ${data.features.length}`);
console.log(`Removed: ${originalCount - data.features.length}`);

// List removed names for verification
const keptNames = new Set(data.features.map(f => f.properties.name));
const allNames = new Set(data.features.map(f => f.properties.name));
// Actually, let's show what was removed
const originalNames = JSON.parse(readFileSync(inputPath, 'utf8')).features.map(f => f.properties.name);
const removed = originalNames.filter(n => !keptNames.has(n));
console.log('\nRemoved entries:');
removed.forEach(n => console.log(`  - ${n}`));

// Write cleaned file
writeFileSync(outputPath, JSON.stringify(data, null, 2));
console.log('\nCleaned file written to:', outputPath);