/**
 * Game Icons — Iconify Collection (game-icons)
 * Master keyword-to-icon mapping with multi-algorithm species match system.
 *
 * Collection: https://icon-sets.iconify.design/game-icons/
 * Author: GameIcons (CC BY 3.0)
 * Total: 4,133 icons
 *
 * This file powers the SSG build-time icon selection for species markers.
 */

// ---------------------------------------------------------------------------
// TAXONOMIC GROUP FALLBACKS — used when per-species matching fails
// ---------------------------------------------------------------------------
export const TAXONOMIC_GROUP_ICONS: Record<string, string> = {
  Mammal:       'paw',
  Bird:         'bird-claw',
  Amphibian:    'frog',
  Reptile:      'snake',
  Fish:         'fish-escape',
  Plant:        'plant-seed',
  Invertebrate: 'spider-alt',
  Default:      'leaf-skeleton',
}

// ---------------------------------------------------------------------------
// ECOSYSTEM FALLBACKS
// ---------------------------------------------------------------------------
export const ECOSYSTEM_ICONS: Record<string, string> = {
  Forest:      'pine-tree',
  Marine:      'fish-escape',
  Freshwater:  'fish-escape',
  Ocean:       'whale-tail',
  Desert:      'sand-snake',
  Grassland:   'grass-mushroom',
  Mountain:    'mountain-cave',
  Wetland:     'frog',
  Tundra:      'polar-bear',
  Savanna:     'elephant-head',
  Coral:       'coral',
  Cave:        'bat',
  Urban:       'bird-house',
}
// ---------------------------------------------------------------------------
// MASTER KEYWORD → ICON MAPPING
// ---------------------------------------------------------------------------
export const KEYWORD_ICON_MAP: Record<string, string> = {
  // ---- Mammals ----
  leopard: 'lion', panther: 'lion', cat: 'cat', tiger: 'saber-toothed-cat-head',
  lion: 'lion', jaguar: 'lion', cheetah: 'lion', wildcat: 'cat',
  orangutan: 'monkey', monkey: 'monkey', ape: 'gorilla', gorilla: 'gorilla',
  chimpanzee: 'monkey', primate: 'monkey', elephant: 'elephant-head',
  rhino: 'rhinoceros-horn', rhinoceros: 'rhinoceros-horn', hippo: 'boar',
  bear: 'bear-head', polar: 'polar-bear', wolf: 'wolf-head', fox: 'fox-head',
  dog: 'sitting-dog', deer: 'deer-head', elk: 'deer', moose: 'deer',
  antelope: 'deer', gazelle: 'deer', buffalo: 'cow', bison: 'cow',
  cow: 'cow', cattle: 'cow', pig: 'boar', boar: 'boar', peccary: 'boar',
  tapir: 'boar', horse: 'horse-head', zebra: 'horse-head', donkey: 'horse-head',
  whale: 'whale-tail', dolphin: 'whale-tail', porpoise: 'whale-tail',
  seal: 'whale-tail', otter: 'whale-tail', walrus: 'boar-tusks',
  manatee: 'whale-tail', bat: 'bat', rabbit: 'rabbit-head', hare: 'rabbit',
  rodent: 'rat', rat: 'rat', mouse: 'rat', squirrel: 'paw', beaver: 'rat',
  porcupine: 'porcupinefish', hedgehog: 'porcupinefish', armadillo: 'turtle-shell',
  sloth: 'snout', anteater: 'anteater', pangolin: 'reptile-tail',
  opossum: 'rat', kangaroo: 'rabbit', koala: 'bear-head', ocelot: 'cat',
  lynx: 'cat', caracal: 'cat', puma: 'lion', llama: 'snout', camel: 'snout',
  alpaca: 'snout', weasel: 'fox-tail', ferret: 'fox-tail', mink: 'fox-tail',
  badger: 'bear-face', skunk: 'fox-tail', raccoon: 'fox-head', mongoose: 'fox-tail',
  hyena: 'wolf-head', aardvark: 'snout',

  // ---- Birds ----
  bird: 'bird-claw', parrot: 'parrot-head', macaw: 'parrot-head',
  toucan: 'bird-claw', owl: 'owl', eagle: 'eagle-head', hawk: 'eagle-head',
  falcon: 'eagle-head', vulture: 'bird-claw', stork: 'bird-claw',
  heron: 'bird-claw', crane: 'bird-claw', flamingo: 'bird-claw',
  swan: 'swan', duck: 'duck', goose: 'duck', pelican: 'duck',
  penguin: 'duck', sparrow: 'bird-twitter', finch: 'bird-twitter',
  cardinal: 'bird-twitter', woodpecker: 'bird-claw', hummingbird: 'hummingbird',
  kingfisher: 'bird-claw', raven: 'bird-claw', crow: 'bird-claw',
  magpie: 'bird-claw', jay: 'bird-twitter', kiwi: 'kiwi-bird',
  ostrich: 'bird-claw', rhea: 'bird-claw', emu: 'bird-claw',
  cassowary: 'bird-claw', pheasant: 'feather', peacock: 'feather',
  grouse: 'bird-claw', quail: 'bird-claw', pigeon: 'bird-twitter',
  dove: 'bird-twitter', cuckoo: 'bird-twitter', nightingale: 'bird-twitter',
  swallow: 'bird-twitter', swift: 'bird-twitter', tanager: 'bird-twitter',
  condor: 'eagle-head',

  // ---- Reptiles ----
  reptile: 'snake', snake: 'snake', serpent: 'snake', viper: 'snake',
  rattlesnake: 'rattlesnake', python: 'snake', cobra: 'snake',
  lizard: 'lizardman', iguana: 'lizardman', gecko: 'lizardman',
  chameleon: 'lizardman', skink: 'lizardman', turtle: 'turtle',
  tortoise: 'turtle-shell', terrapin: 'turtle', crocodile: 'horned-reptile',
  alligator: 'horned-reptile', caiman: 'horned-reptile', gharial: 'horned-reptile',
  tuatara: 'horned-reptile', amphisbaena: 'worm-mouth',

  // ---- Amphibians ----
  amphibian: 'frog', frog: 'frog', toad: 'frog', salamander: 'frog',
  newt: 'frog', caecilian: 'worm-mouth', axolotl: 'frog',

  // ---- Fish ----
  fish: 'fish-escape', shark: 'shark-jaws', ray: 'flatfish', skate: 'flatfish',
  salmon: 'fish-escape', trout: 'fish-escape', tuna: 'fish-escape',
  cod: 'fish-escape', bass: 'fish-escape', perch: 'fish-escape',
  catfish: 'fish-escape', eel: 'snake', piranha: 'shark-jaws',
  angelfish: 'angler-fish', clownfish: 'clownfish', seahorse: 'seahorse',
  sturgeon: 'fish-escape', pufferfish: 'porcupinefish',
  triggerfish: 'tropical-fish', parrotfish: 'tropical-fish',
  jellyfish: 'jellyfish', octopus: 'spyglass', squid: 'giant-squid',
  cuttlefish: 'spiral-shell', nautilus: 'nautilus-shell',

  // ---- Invertebrates ----
  invertebrate: 'spider-alt', insect: 'spider-alt', spider: 'spider-alt',
  scorpion: 'spider-alt', beetle: 'beetle-shell', butterfly: 'butterfly',
  moth: 'butterfly', dragonfly: 'dragonfly', bee: 'bee', wasp: 'wasp-sting',
  hornet: 'wasp-sting', ant: 'ant', termite: 'ant', grasshopper: 'spider-alt',
  cricket: 'spider-alt', locust: 'spider-alt', mantis: 'spider-alt',
  cockroach: 'beetle-shell', ladybug: 'ladybug', firefly: 'butterfly',
  mosquito: 'spider-alt', fly: 'spider-alt', worm: 'earth-worm',
  leech: 'leeching-worm', snail: 'snail', slug: 'snail', clam: 'opening-shell',
  oyster: 'oyster', mussel: 'opening-shell', scallop: 'opening-shell',
  crab: 'crab', lobster: 'crab', shrimp: 'shrimp', krill: 'shrimp',
  barnacle: 'shell', coral: 'coral', anemone: 'tentacles', starfish: 'starfish',
  sponge: 'coral', centipede: 'worm-mouth', millipede: 'worm-mouth',

  // ---- Plants ----
  plant: 'plant-seed', tree: 'pine-tree', flower: 'flower-star',
  leaf: 'leaf-skeleton', seed: 'seedling', root: 'plant-roots',
  grass: 'grass-mushroom', fern: 'vine-leaf', moss: 'vine-leaf',
  algae: 'vine-leaf', seaweed: 'vine-leaf', kelp: 'vine-leaf',
  mangrove: 'plant-roots', cactus: 'plant-seed', succulent: 'plant-seed',
  orchid: 'vanilla-flower', bromeliad: 'flower-star', palm: 'palm-tree',
  pine: 'pine-tree', oak: 'oak-leaf', maple: 'maple-leaf', bamboo: 'pine-tree',
  mushroom: 'mushroom', fungus: 'mushroom', lichen: 'mushroom',
  vine: 'vine-leaf', shrub: 'plant-seed', herb: 'plant-seed',
  fruit: 'fruit-tree', nut: 'acorn', berry: 'berries-bowl',
  carnivorous: 'carnivorous-plant',

  // ---- Generic Nature / Regions ----
  nature: 'leaf-skeleton', wildlife: 'paw-print', fauna: 'paw-print',
  flora: 'flower-star', forest: 'pine-tree', ocean: 'fish-escape',
  river: 'fish-escape', lake: 'fish-escape', wetland: 'frog',
  desert: 'sand-snake', mountain: 'mountain-cave', cave: 'bat',
  grassland: 'grass-mushroom', savanna: 'elephant-head', tundra: 'polar-bear',
  arctic: 'polar-bear', antarctic: 'penguin', tropical: 'palm-tree',
  temperate: 'pine-tree', boreal: 'pine-tree', mammal: 'paw',
  egg: 'egg-defense', claw: 'claw', feather: 'feather', fur: 'paw',
  scale: 'fish-scales', shell: 'spiral-shell', wing: 'feathered-wing',
  horn: 'bull-horns', tusk: 'boar-tusks', tail: 'reptile-tail',
  fin: 'shark-fin', beak: 'bird-claw', snout: 'snout', paw: 'paw-print',
  hoof: 'horse-head',

  // ---- Regional Ecosystems ----
  amazon: 'palm-tree', atlantic: 'fish-escape', pantanal: 'frog',
  cerrado: 'grass-mushroom', caatinga: 'cactus', pampa: 'grass-mushroom',
  mata: 'pine-tree', costal: 'coral', marine: 'fish-escape',
  freshwater: 'fish-escape', terrestrial: 'paw-print', arboreal: 'pine-tree',
  aquatic: 'fish-escape', rainforest: 'palm-tree', woodland: 'oak-leaf',
  jungle: 'palm-tree', alpine: 'mountain-cave', island: 'palm-tree',
  reef: 'coral', estuary: 'fish-escape', lagoon: 'fish-escape',
  swamp: 'frog', marsh: 'frog', bog: 'frog', riverine: 'fish-escape',
  riparian: 'oak-leaf', coastal: 'coral', pelagic: 'whale-tail',
  benthic: 'flatfish',

  // ---- Threat keywords ----
  threat: 'warning-triangle', endangered: 'extinction', extinct: 'extinction',
  poaching: 'hunting-horn', habitat: 'tree-house', deforestation: 'burning-tree',
  pollution: 'waste', climate: 'lightning-tree', invasive: 'alien-bug',
  overfishing: 'fishing-net', bycatch: 'fishing-net', hunting: 'hunting-horn',
  trafficking: 'shackle',
}
// ---------------------------------------------------------------------------
// MATCHING ALGORITHMS
// ---------------------------------------------------------------------------

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ').trim()
}

function extractKeywords(species: {
  commonName: string; scientificName: string; taxonomicGroup: string
  ecosystem: string; region: string; threatTypes?: string[]; description?: string
}): string[] {
  const tokens = new Set<string>()
  const fields = [species.commonName, species.scientificName,
    species.taxonomicGroup, species.ecosystem, species.region]
  for (const f of fields) {
    for (const w of normalize(f).split(' ')) { if (w.length >= 2) tokens.add(w) }
  }
  if (species.threatTypes) {
    for (const t of species.threatTypes) {
      for (const w of normalize(t).split(' ')) { if (w.length >= 3) tokens.add(w) }
    }
  }
  if (species.description) {
    const stop = new Set(['the','and','for','are','has','its','was','with','from','that','this'])
    for (const w of normalize(species.description).split(' ')) {
      if (w.length >= 4 && !stop.has(w)) tokens.add(w)
    }
  }
  return [...tokens]
}

function algoDirectMatch(tokens: string[]): { icon: string; score: number } | null {
  let best: { icon: string; score: number } | null = null
  for (const token of tokens) {
    if (KEYWORD_ICON_MAP[token]) {
      const s = token.length * 3; if (!best || s > best.score) best = { icon: KEYWORD_ICON_MAP[token], score: s }
    }
    for (const [kw, icon] of Object.entries(KEYWORD_ICON_MAP)) {
      if (token.includes(kw) || kw.includes(token)) {
        const s = Math.min(token.length, kw.length) * 2
        if (!best || s > best.score) best = { icon, score: s }
      }
    }
  }
  return best
}

function algoScientificGenus(scientificName: string): { icon: string; score: number } | null {
  const genus = normalize(scientificName).split(' ')[0]
  if (!genus || genus.length < 3) return null
  if (KEYWORD_ICON_MAP[genus]) return { icon: KEYWORD_ICON_MAP[genus], score: 20 }
  for (const [kw, icon] of Object.entries(KEYWORD_ICON_MAP)) {
    if (genus.includes(kw) || kw.includes(genus)) return { icon, score: 15 }
  }
  return null
}

function algoEcosystemGroup(taxonomicGroup: string, ecosystem: string): { icon: string; score: number } | null {
  const g = taxonomicGroup as keyof typeof TAXONOMIC_GROUP_ICONS
  if (g && TAXONOMIC_GROUP_ICONS[g]) {
    const e = ecosystem as keyof typeof ECOSYSTEM_ICONS
    if (e && ECOSYSTEM_ICONS[e]) return { icon: ECOSYSTEM_ICONS[e], score: 12 }
    return { icon: TAXONOMIC_GROUP_ICONS[g], score: 10 }
  }
  return null
}

function algoCommonNameBigram(commonName: string): { icon: string; score: number } | null {
  const words = normalize(commonName).split(' ')
  let best: { icon: string; score: number } | null = null
  for (const word of words) {
    if (word.length < 3) continue
    for (const [kw, icon] of Object.entries(KEYWORD_ICON_MAP)) {
      if (word === kw) { const s = 25 + word.length; if (!best || s > best.score) best = { icon, score: s } }
      else if (word.includes(kw) && kw.length >= 3) { const s = 18 + kw.length; if (!best || s > best.score) best = { icon, score: s } }
    }
  }
  return best
}

// ---------------------------------------------------------------------------
// PUBLIC API
// ---------------------------------------------------------------------------

export interface SpeciesIconMatch {
  icon: string              // e.g., "paw"
  iconifyName: string       // e.g., "game-icons:paw"
  algorithm: string         // Which algo matched
  score: number
  taxonomicFallback: string
}

export function findBestIcon(species: {
  commonName: string; scientificName: string; taxonomicGroup: string
  ecosystem: string; region: string; threatTypes?: string[]; description?: string
}): SpeciesIconMatch {
  const tokens = extractKeywords(species)
  const g = species.taxonomicGroup as keyof typeof TAXONOMIC_GROUP_ICONS
  const taxonomicFallback = TAXONOMIC_GROUP_ICONS[g] || TAXONOMIC_GROUP_ICONS.Default

  const algos: Array<{ name: string; fn: () => { icon: string; score: number } | null }> = [
    { name: 'commonName_bigram', fn: () => algoCommonNameBigram(species.commonName) },
    { name: 'direct_keyword',    fn: () => algoDirectMatch(tokens) },
    { name: 'scientific_genus',  fn: () => algoScientificGenus(species.scientificName) },
    { name: 'ecosystem_group',   fn: () => algoEcosystemGroup(species.taxonomicGroup, species.ecosystem) },
  ]

  let best: { icon: string; score: number; algorithm: string } | null = null
  for (const algo of algos) {
    const r = algo.fn()
    if (r && (!best || r.score > best.score)) best = { ...r, algorithm: algo.name }
  }

  if (best) return { icon: best.icon, iconifyName: `game-icons:${best.icon}`, algorithm: best.algorithm, score: best.score, taxonomicFallback }
  return { icon: taxonomicFallback, iconifyName: `game-icons:${taxonomicFallback}`, algorithm: 'taxonomic_fallback', score: 1, taxonomicFallback }
}

// ---------------------------------------------------------------------------
// BUILD-TIME BATCH PROCESSOR
// ---------------------------------------------------------------------------

export interface SpeciesIconMapping {
  [speciesId: string]: SpeciesIconMatch
}

export function buildIconMapping(speciesList: Array<{
  id: string; commonName: string; scientificName: string
  taxonomicGroup: string; ecosystem: string; region: string
  threatTypes?: string[]; description?: string
}>): SpeciesIconMapping {
  const mapping: SpeciesIconMapping = {}
  for (const s of speciesList) mapping[s.id] = findBestIcon(s)
  return mapping
}

