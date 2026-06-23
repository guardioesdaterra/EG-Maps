export interface BrazilianCity {
  name: string
  state: string
  lat: number
  lng: number
  population: number
}

export const BRAZILIAN_CITIES: BrazilianCity[] = [
  { name: 'São Paulo', state: 'SP', lat: -23.5505, lng: -46.6333, population: 12300000 },
  { name: 'Rio de Janeiro', state: 'RJ', lat: -22.9068, lng: -43.1729, population: 6748000 },
  { name: 'Brasília', state: 'DF', lat: -15.7975, lng: -47.8919, population: 3055000 },
  { name: 'Salvador', state: 'BA', lat: -12.9714, lng: -38.5014, population: 2887000 },
  { name: 'Fortaleza', state: 'CE', lat: -3.7319, lng: -38.5267, population: 2687000 },
  { name: 'Belo Horizonte', state: 'MG', lat: -19.9167, lng: -43.9345, population: 2522000 },
  { name: 'Manaus', state: 'AM', lat: -3.1190, lng: -60.0217, population: 2219000 },
  { name: 'Curitiba', state: 'PR', lat: -25.4290, lng: -49.2671, population: 1948000 },
  { name: 'Recife', state: 'PE', lat: -8.0476, lng: -34.8770, population: 1654000 },
  { name: 'Goiânia', state: 'GO', lat: -16.6869, lng: -49.2648, population: 1536000 },
  { name: 'Belém', state: 'PA', lat: -1.4558, lng: -48.4902, population: 1499000 },
  { name: 'Porto Alegre', state: 'RS', lat: -30.0346, lng: -51.2177, population: 1485000 },
  { name: 'Guarulhos', state: 'SP', lat: -23.4628, lng: -46.5333, population: 1392000 },
  { name: 'Campinas', state: 'SP', lat: -22.9056, lng: -47.0608, population: 1214000 },
  { name: 'São Luís', state: 'MA', lat: -2.5307, lng: -44.3068, population: 1109000 },
  { name: 'Maceió', state: 'AL', lat: -9.6663, lng: -35.7350, population: 1029000 },
  { name: 'Campo Grande', state: 'MS', lat: -20.4697, lng: -54.6201, population: 906000 },
  { name: 'Natal', state: 'RN', lat: -5.7793, lng: -35.2009, population: 890000 },
  { name: 'Teresina', state: 'PI', lat: -5.0892, lng: -42.8016, population: 868000 },
  { name: 'João Pessoa', state: 'PB', lat: -7.1195, lng: -34.8450, population: 817000 },
  { name: 'Aracaju', state: 'SE', lat: -10.9472, lng: -37.0731, population: 664000 },
  { name: 'Cuiabá', state: 'MT', lat: -15.6010, lng: -56.0974, population: 618000 },
  { name: 'Florianópolis', state: 'SC', lat: -27.5954, lng: -48.5480, population: 508000 },
  { name: 'Vitória', state: 'ES', lat: -20.3194, lng: -40.3378, population: 365000 },
  { name: 'Palmas', state: 'TO', lat: -10.2491, lng: -48.3243, population: 302000 },
  { name: 'Macapá', state: 'AP', lat: 0.0346, lng: -51.0694, population: 512000 },
  { name: 'Rio Branco', state: 'AC', lat: -9.9740, lng: -67.8076, population: 419000 },
  { name: 'Porto Velho', state: 'RO', lat: -8.7608, lng: -63.9039, population: 540000 },
  { name: 'Boa Vista', state: 'RR', lat: 2.8195, lng: -60.6733, population: 436000 },
  { name: 'Santos', state: 'SP', lat: -23.9535, lng: -46.3350, population: 434000 },
  { name: 'Uberlândia', state: 'MG', lat: -18.9128, lng: -48.2756, population: 706000 },
  { name: 'São José dos Campos', state: 'SP', lat: -23.1896, lng: -45.8841, population: 737000 },
  { name: 'Ribeirão Preto', state: 'SP', lat: -21.1775, lng: -47.8103, population: 711000 },
  { name: 'Sorocaba', state: 'SP', lat: -23.5017, lng: -47.4527, population: 687000 },
  { name: 'Feira de Santana', state: 'BA', lat: -12.2664, lng: -38.9663, population: 619000 },
  { name: 'Londrina', state: 'PR', lat: -23.3103, lng: -51.1654, population: 575000 },
  { name: 'Juiz de Fora', state: 'MG', lat: -21.7595, lng: -43.3398, population: 573000 },
  { name: 'Joinville', state: 'SC', lat: -26.3045, lng: -48.8487, population: 597000 },
  { name: 'Niterói', state: 'RJ', lat: -22.8832, lng: -43.1034, population: 515000 },
  { name: 'São Bernardo do Campo', state: 'SP', lat: -23.6939, lng: -46.5650, population: 849000 },
  { name: 'Santo André', state: 'SP', lat: -23.6637, lng: -46.5383, population: 721000 },
  { name: 'Osasco', state: 'SP', lat: -23.5325, lng: -46.7916, population: 701000 },
  { name: 'Contagem', state: 'MG', lat: -19.9317, lng: -44.0536, population: 668000 },
  { name: 'Duque de Caxias', state: 'RJ', lat: -22.7858, lng: -43.3049, population: 919000 },
  { name: 'Nova Iguaçu', state: 'RJ', lat: -22.7592, lng: -43.4506, population: 823000 },
  { name: 'Caxias do Sul', state: 'RS', lat: -29.1681, lng: -51.1794, population: 516000 },
  { name: 'Pelotas', state: 'RS', lat: -31.7719, lng: -52.3425, population: 343000 },
  { name: 'Ilhéus', state: 'BA', lat: -14.7890, lng: -39.0480, population: 180000 },
  { name: 'Poços de Caldas', state: 'MG', lat: -21.7869, lng: -46.5614, population: 168000 },
  { name: 'Araxá', state: 'MG', lat: -19.5900, lng: -46.9400, population: 108000 },
  { name: 'Jequié', state: 'BA', lat: -13.8580, lng: -40.0810, population: 155000 },
  { name: 'Catalão', state: 'GO', lat: -18.1667, lng: -47.9333, population: 112000 },
  { name: 'Patos de Minas', state: 'MG', lat: -18.5800, lng: -46.5200, population: 153000 },
  { name: 'Uberaba', state: 'MG', lat: -19.7481, lng: -47.9386, population: 337000 },
  { name: 'Governador Valadares', state: 'MG', lat: -18.8500, lng: -41.9500, population: 281000 },
  { name: 'Montes Claros', state: 'MG', lat: -16.7350, lng: -43.8617, population: 417000 },
  { name: 'Teófilo Otoni', state: 'MG', lat: -17.8578, lng: -41.5050, population: 140000 },
  { name: 'Caratinga', state: 'MG', lat: -19.7900, lng: -42.1400, population: 93000 },
  { name: 'Itabira', state: 'MG', lat: -19.6200, lng: -43.3300, population: 120000 },
  { name: 'Ouro Preto', state: 'MG', lat: -20.3850, lng: -43.5036, population: 75000 },
  { name: 'Mariana', state: 'MG', lat: -20.3800, lng: -43.4200, population: 61000 },
  { name: 'Diamantina', state: 'MG', lat: -18.2500, lng: -43.6000, population: 48000 },
  { name: 'Serra do Navio', state: 'AP', lat: 0.9014, lng: -52.0036, population: 5000 },
  { name: 'São João del-Rei', state: 'MG', lat: -21.1400, lng: -44.2600, population: 90000 },
  { name: 'Conselheiro Lafaiete', state: 'MG', lat: -20.6600, lng: -43.7800, population: 130000 },
  { name: 'Barbacena', state: 'MG', lat: -21.2200, lng: -43.7700, population: 140000 },
  { name: 'Alfenas', state: 'MG', lat: -21.4300, lng: -45.9500, population: 80000 },
  { name: 'Paracatu', state: 'MG', lat: -17.2200, lng: -46.8700, population: 93000 },
  { name: 'Ipatinga', state: 'MG', lat: -19.4700, lng: -42.5300, population: 268000 },
]

export function citiesToGeoJSON(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: BRAZILIAN_CITIES.map(c => ({
      type: 'Feature',
      properties: {
        name: c.name,
        state: c.state,
        population: c.population,
      },
      geometry: {
        type: 'Point',
        coordinates: [c.lng, c.lat],
      },
    })),
  }
}

export function searchCities(query: string): BrazilianCity[] {
  const q = query.toLowerCase().trim()
  if (q.length < 2) return []
  return BRAZILIAN_CITIES.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.state.toLowerCase().includes(q)
  ).slice(0, 20)
}
