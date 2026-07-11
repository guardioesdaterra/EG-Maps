export const RARE_EARTH_GEO_BOUNDARIES: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { name: 'São Francisco Basin', type: 'basin' }, geometry: { type: 'Polygon', coordinates: [[[-47, -12], [-44, -12], [-42, -13], [-40, -14], [-39, -15.5], [-39.5, -17], [-40, -18.5], [-42, -19.5], [-44, -20], [-46, -20.5], [-48, -19], [-49, -17], [-48.5, -15], [-47.5, -13.5], [-47, -12]]] } },
    { type: 'Feature', properties: { name: 'Paranaíba Basin', type: 'basin' }, geometry: { type: 'Polygon', coordinates: [[[-49, -17], [-47.5, -17.5], [-46.5, -18.5], [-46, -19.5], [-47, -20.5], [-48.5, -20.5], [-50, -20], [-51.5, -19], [-51, -17.5], [-50, -17], [-49, -17]]] } },
    { type: 'Feature', properties: { name: 'Jequitinhonha Basin', type: 'basin' }, geometry: { type: 'Polygon', coordinates: [[[-42, -15.5], [-40.5, -15.5], [-39.5, -16], [-39.5, -17.5], [-40.5, -18], [-42, -17.5], [-43, -16.5], [-42, -15.5]]] } },
    { type: 'Feature', properties: { name: 'Bambuí Aquifer', type: 'aquifer' }, geometry: { type: 'Polygon', coordinates: [[[-49, -15], [-47, -15], [-45, -16], [-44, -18], [-44.5, -20], [-46, -21], [-48.5, -21], [-50, -20], [-51, -18], [-50.5, -16], [-49, -15]]] } },
    { type: 'Feature', properties: { name: 'Urucuia Aquifer', type: 'aquifer' }, geometry: { type: 'Polygon', coordinates: [[[-46, -13], [-43.5, -13], [-42, -14.5], [-42.5, -16.5], [-44, -17.5], [-46, -17.5], [-47, -16], [-46, -13]]] } },
    { type: 'Feature', properties: { name: 'Poços de Caldas Conflict', type: 'conflict' }, geometry: { type: 'Polygon', coordinates: [[[-47.2, -21.2], [-46, -21.2], [-45.8, -21.8], [-46.2, -22.2], [-47.2, -22.2], [-47.5, -21.8], [-47.2, -21.2]]] } },
    { type: 'Feature', properties: { name: 'INB Caldas Nuclear', type: 'nuclear' }, geometry: { type: 'Polygon', coordinates: [[[-47, -21.4], [-46.3, -21.4], [-46.1, -21.9], [-46.5, -22.1], [-47, -22], [-47.2, -21.7], [-47, -21.4]]] } },
  ],
}

export const RARE_EARTH_CONFLICT_SITES: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { name: 'Poços de Caldas', danger: 9.5, tag: 'CONFLICT' }, geometry: { type: 'Point', coordinates: [-46.57, -21.55] } },
    { type: 'Feature', properties: { name: 'Araxá', danger: 8.5, tag: 'REE + CBMM' }, geometry: { type: 'Point', coordinates: [-46.94, -19.59] } },
    { type: 'Feature', properties: { name: 'Jequié Corridor', danger: 7.5, tag: 'SPECULATION' }, geometry: { type: 'Point', coordinates: [-40.48, -13.85] } },
    { type: 'Feature', properties: { name: 'Serra Verde', danger: 9, tag: 'US DFC $565M' }, geometry: { type: 'Point', coordinates: [-48.1, -14.25] } },
    { type: 'Feature', properties: { name: 'Aclara Carina', danger: 7, tag: 'State Dept $5M' }, geometry: { type: 'Point', coordinates: [-49.1, -16.7] } },
    { type: 'Feature', properties: { name: 'Bambuí Aquifer', danger: 9, tag: 'CONTAMINATION' }, geometry: { type: 'Point', coordinates: [-47, -17.5] } },
  ],
}
