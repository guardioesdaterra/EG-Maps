
/* eslint-disable no-console */
/**
 * Build per-species icon mappings using the multi-algorithm
 * matching system from lib/game-icons-map.
 *
 * Usage:
 *   node scripts/build-species-icon-mapping.mjs [species-dir] [output-dir]
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DATA_DIR = resolve(ROOT, 'public/data/species')
const OUTPUT_PATH = resolve(DATA_DIR, 'species-icon-mapping.json')

const TAXONOMIC_GROUP_ICONS = {
  Mammal: "paw", Bird: "bird-claw", Amphibian: "frog",
  Reptile: "snake", Fish: "fish-escape", Plant: "plant-seed",
  Invertebrate: "spider-alt", Default: "leaf-skeleton",
}
const ECOSYSTEM_ICONS = {
  Forest: "pine-tree", Marine: "fish-escape", Freshwater: "fish-escape",
  Ocean: "whale-tail", Desert: "sand-snake", Grassland: "grass-mushroom",
  Mountain: "mountain-cave", Wetland: "frog", Tundra: "polar-bear",
  Savanna: "elephant-head", Coral: "coral", Cave: "bat", Urban: "bird-house",
}

function normalize(text) {
  return text.toLowerCase().normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ").trim()
}

function extractKeywords(species) {
  const tokens = new Set()
  const fields = [species.commonName, species.scientificName,
    species.taxonomicGroup, species.ecosystem, species.region]
  for (const f of fields) {
    if (f) for (const w of normalize(f).split(" ")) { if (w.length >= 2) tokens.add(w) }
  }
  if (species.threatTypes) {
    for (const t of species.threatTypes) {
      for (const w of normalize(t).split(" ")) { if (w.length >= 3) tokens.add(w) }
    }
  }
  if (species.description) {
    const stop = new Set(["the","and","for","are","has","its","was","with","from","that","this"])
    for (const w of normalize(species.description).split(" ")) {
      if (w.length >= 4 && !stop.has(w)) tokens.add(w)
    }
  }
  return [...tokens]
}

function findBestIcon(species) {
  const KEYWORD_ICON_MAP = {
    leopard: "lion", panther: "lion", cat: "cat", tiger: "saber-toothed-cat-head",
    lion: "lion", jaguar: "lion", cheetah: "lion", wildcat: "cat",
    orangutan: "monkey", monkey: "monkey", ape: "gorilla", gorilla: "gorilla",
    chimpanzee: "monkey", primate: "monkey", elephant: "elephant-head",
    rhino: "rhinoceros-horn", rhinoceros: "rhinoceros-horn", hippo: "boar",
    bear: "bear-head", polar: "polar-bear", wolf: "wolf-head", fox: "fox-head",
    dog: "sitting-dog", deer: "deer-head", elk: "deer", moose: "deer",
    antelope: "deer", gazelle: "deer", buffalo: "cow", bison: "cow",
    cow: "cow", cattle: "cow", pig: "boar", boar: "boar", peccary: "boar",
    tapir: "boar", horse: "horse-head", zebra: "horse-head", donkey: "horse-head",
    whale: "whale-tail", dolphin: "whale-tail", porpoise: "whale-tail",
    seal: "whale-tail", otter: "whale-tail", walrus: "boar-tusks",
    manatee: "whale-tail", bat: "bat", rabbit: "rabbit-head", hare: "rabbit",
    rodent: "rat", rat: "rat", mouse: "rat", squirrel: "paw", beaver: "rat",
    porcupine: "porcupinefish", hedgehog: "porcupinefish", armadillo: "turtle-shell",
    sloth: "snout", anteater: "anteater", pangolin: "reptile-tail",
    opossum: "rat", kangaroo: "rabbit", koala: "bear-head", ocelot: "cat",
    lynx: "cat", caracal: "cat", puma: "lion", llama: "snout", camel: "snout",
    alpaca: "snout", weasel: "fox-tail", ferret: "fox-tail", mink: "fox-tail",
    badger: "bear-face", skunk: "fox-tail", raccoon: "fox-head", mongoose: "fox-tail",
    hyena: "wolf-head", aardvark: "snout",
    bird: "bird-claw", parrot: "parrot-head", macaw: "parrot-head",
    toucan: "bird-claw", owl: "owl", eagle: "eagle-head", hawk: "eagle-head",
    falcon: "eagle-head", vulture: "bird-claw", stork: "bird-claw",
    heron: "bird-claw", crane: "bird-claw", flamingo: "bird-claw",
    swan: "swan", duck: "duck", goose: "duck", pelican: "duck",
    penguin: "duck", sparrow: "bird-twitter", finch: "bird-twitter",
    cardinal: "bird-twitter", woodpecker: "bird-claw", hummingbird: "hummingbird",
    kingfisher: "bird-claw", raven: "bird-claw", crow: "bird-claw",
    magpie: "bird-claw", jay: "bird-twitter", kiwi: "kiwi-bird",
    ostrich: "bird-claw", rhea: "bird-claw", emu: "bird-claw",
    cassowary: "bird-claw", pheasant: "feather", peacock: "feather",
    grouse: "bird-claw", quail: "bird-claw", pigeon: "bird-twitter",
    dove: "bird-twitter", cuckoo: "bird-twitter", nightingale: "bird-twitter",
    swallow: "bird-twitter", swift: "bird-twitter", tanager: "bird-twitter",
    condor: "eagle-head",
    reptile: "snake", snake: "snake", serpent: "snake", viper: "snake",
    rattlesnake: "rattlesnake", python: "snake", cobra: "snake",
    lizard: "lizardman", iguana: "lizardman", gecko: "lizardman", chameleon: "lizardman",
    skink: "lizardman", turtle: "turtle", tortoise: "turtle-shell", terrapin: "turtle",
    crocodile: "horned-reptile", alligator: "horned-reptile", caiman: "horned-reptile",
    gharial: "horned-reptile",
    amphibian: "frog", frog: "frog", toad: "frog", salamander: "frog", newt: "frog",
    axolotl: "frog",
    fish: "fish-escape", shark: "shark-jaws", ray: "flatfish", skate: "flatfish",
    salmon: "fish-escape", trout: "fish-escape", tuna: "fish-escape",
    cod: "fish-escape", bass: "fish-escape", perch: "fish-escape", catfish: "fish-escape",
    eel: "snake", piranha: "shark-jaws", angelfish: "angler-fish",
    clownfish: "clownfish", seahorse: "seahorse",
    pufferfish: "porcupinefish", jellyfish: "jellyfish",
    squid: "giant-squid", nautilus: "nautilus-shell",
    invertebrate: "spider-alt", insect: "spider-alt", spider: "spider-alt",
    scorpion: "spider-alt", beetle: "beetle-shell", butterfly: "butterfly",
    moth: "butterfly", dragonfly: "dragonfly", bee: "bee", wasp: "wasp-sting",
    ant: "ant", ladybug: "ladybug", worm: "earth-worm", snail: "snail",
    crab: "crab", lobster: "crab", shrimp: "shrimp", coral: "coral",
    starfish: "starfish",
    plant: "plant-seed", tree: "pine-tree", flower: "flower-star",
    leaf: "leaf-skeleton", seed: "seedling", root: "plant-roots",
    grass: "grass-mushroom", fern: "vine-leaf", moss: "vine-leaf",
    mangrove: "plant-roots", cactus: "plant-seed", palm: "palm-tree",
    pine: "pine-tree", oak: "oak-leaf", maple: "maple-leaf", bamboo: "pine-tree",
    mushroom: "mushroom", fruit: "fruit-tree",
    nature: "leaf-skeleton", wildlife: "paw-print", fauna: "paw-print",
    flora: "flower-star", forest: "pine-tree", ocean: "fish-escape",
    river: "fish-escape", wetland: "frog", desert: "sand-snake",
    mountain: "mountain-cave", cave: "bat",
    grassland: "grass-mushroom", savanna: "elephant-head", tundra: "polar-bear",
    arctic: "polar-bear", tropical: "palm-tree",
    amazon: "palm-tree", pantanal: "frog",
    cerrado: "grass", caatinga: "cactus", marine: "fish-escape",
    freshwater: "fish-escape", rainforest: "palm-tree", woodland: "oak-leaf",
    jungle: "palm-tree", alpine: "mountain-cave", island: "palm-tree",
    reef: "coral", swamp: "frog", marsh: "frog",
    paw: "paw-print", claw: "claw", feather: "feather", fur: "paw",
    scale: "fish-scales", shell: "spiral-shell", wing: "feathered-wing",
    horn: "bull-horns", fin: "shark-fin", beak: "bird-claw", snout: "snout",
    hoof: "horse-head", egg: "egg-defense",
    endangered: "extinction", poaching: "hunting-horn",
    deforestation: "burning-tree", invasive: "alien-bug",
  }
  const tokens = extractKeywords(species)
  const taxonomicFallback = TAXONOMIC_GROUP_ICONS[species.taxonomicGroup] || TAXONOMIC_GROUP_ICONS.Default

  function directMatch(tokens) {
    let best = null
    for (const token of tokens) {
      if (KEYWORD_ICON_MAP[token]) {
        const s = token.length * 3
        if (!best || s > best.score) best = { icon: KEYWORD_ICON_MAP[token], score: s }
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

  function genusMatch(scientificName) {
    if (!scientificName) return null
    const genus = normalize(scientificName).split(" ")[0]
    if (!genus || genus.length < 3) return null
    if (KEYWORD_ICON_MAP[genus]) return { icon: KEYWORD_ICON_MAP[genus], score: 20 }
    return null
  }

  function ecosystemGroup(taxonomicGroup, ecosystem) {
    const g = TAXONOMIC_GROUP_ICONS[taxonomicGroup]
    if (g) {
      const e = ECOSYSTEM_ICONS[ecosystem]
      if (e) return { icon: e, score: 12 }
      return { icon: g, score: 10 }
    }
    return null
  }

  function commonNameBigram(commonName) {
    if (!commonName) return null
    const words = normalize(commonName).split(" ")
    let best = null
    for (const word of words) {
      if (word.length < 3) continue
      if (KEYWORD_ICON_MAP[word]) {
        const s = 25 + word.length
        if (!best || s > best.score) best = { icon: KEYWORD_ICON_MAP[word], score: s }
      } else {
        for (const [kw, icon] of Object.entries(KEYWORD_ICON_MAP)) {
          if (word.includes(kw) && kw.length >= 3) {
            const s = 18 + kw.length
            if (!best || s > best.score) best = { icon, score: s }
          }
        }
      }
    }
    return best
  }

  const algos = [
    { name: "bigram", fn: () => commonNameBigram(species.commonName) },
    { name: "keyword", fn: () => directMatch(tokens) },
    { name: "genus", fn: () => genusMatch(species.scientificName) },
    { name: "ecosystem", fn: () => ecosystemGroup(species.taxonomicGroup, species.ecosystem) },
  ]

  let best = null
  for (const algo of algos) {
    const r = algo.fn()
    if (r && (!best || r.score > best.score)) best = { ...r, algorithm: algo.name }
  }

  if (best) return { icon: best.icon, iconifyName: "game-icons:" + best.icon, algorithm: best.algorithm, score: best.score, taxonomicFallback }
  return { icon: taxonomicFallback, iconifyName: "game-icons:" + taxonomicFallback, algorithm: "fallback", score: 1, taxonomicFallback }
}

function main() {
  console.log("\ud83c\udf3f Building species icon mapping...")
  if (!existsSync(DATA_DIR)) {
    console.error("ERROR: Data directory not found: " + DATA_DIR)
    process.exit(1)
  }
  const files = readdirSync(DATA_DIR)
    .filter(f => f.endsWith(".json") && f !== "index.json" && f !== "species-icon-mapping.json")
    .map(f => resolve(DATA_DIR, f))
  if (files.length === 0) { console.error("No species files found!"); process.exit(1) }

  console.log("Found " + files.length + " file(s): " + files.map(f => f.split("/").pop()).join(", "))
  const allMappings = {}
  let total = 0

  for (const file of files) {
    const list = JSON.parse(readFileSync(file, "utf-8"))
    if (!Array.isArray(list)) continue
    for (const s of list) {
      if (!s.id) continue
      allMappings[s.id] = findBestIcon(s)
      total++
    }
  }

  const output = JSON.stringify(allMappings, null, 2)
  writeFileSync(OUTPUT_PATH, output, "utf-8")
  console.log("Done! Processed " + total + " species.")
  console.log("Output: " + OUTPUT_PATH)
  console.log("Size: " + (Buffer.byteLength(output) / 1024).toFixed(1) + " KB")

  const samples = Object.keys(allMappings).slice(0, 5)
  for (const key of samples) {
    const m = allMappings[key]
    console.log("  " + key + " -> " + m.iconifyName + " (" + m.algorithm + " score:" + m.score + ")")
  }
}

main()
