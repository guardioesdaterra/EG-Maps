#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * MapTiler Satellite Tile Downloader
 *
 * Downloads tiles for offline use from MapTiler.
 * Usage:
 *   node scripts/download-tiles.mjs --bbox -10 35 30 60 --zoom 0-10
 *   node scripts/download-tiles.mjs --bbox -180 -90 180 90 --zoom 0-8  (full world, low zoom)
 *   node scripts/download-tiles.mjs --bbox -10 35 30 60 --zoom 5-15 --concurrency 10
 *
 * Output: public/tiles/{z}/{x}/{y}.jpg
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync, createWriteStream, readdirSync, rmSync  } from 'fs'
import { resolve, dirname } from 'path'
import { get } from 'https'


function loadEnv() {
  const envPath = resolve(process.cwd(), '.env')
  if (!existsSync(envPath)) {
    console.error('.env file not found')
    process.exit(1)
  }
  const content = readFileSync(envPath, 'utf-8')
  const match = content.match(/NUXT_PUBLIC_MAPTILER_API_KEY=(\S+)/)
  if (!match) {
    console.error('MAPTILER_API_KEY not found in .env')
    process.exit(1)
  }
  return match[1]
}

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = { bbox: [], zoom: null, concurrency: 6, output: 'public/tiles', tileFormat: 'jpg' }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--bbox':
        opts.bbox = args.slice(i + 1, i + 5).map(Number)
        i += 4
        break
      case '--zoom':
        opts.zoom = args[i + 1]
        i += 1
        break
      case '--concurrency':
        opts.concurrency = parseInt(args[i + 1], 10)
        i += 1
        break
      case '--output':
        opts.output = args[i + 1]
        i += 1
        break
      case '--format':
        opts.tileFormat = args[i + 1]
        i += 1
        break
      case '--help':
        printHelp()
        process.exit(0)
    }
  }

  if (opts.bbox.length !== 4) {
    console.error('Error: --bbox requires 4 values: minLon minLat maxLon maxLat')
    printHelp()
    process.exit(1)
  }
  if (!opts.zoom) {
    console.error('Error: --zoom is required (e.g. 0-10)')
    printHelp()
    process.exit(1)
  }

  const [minZoom, maxZoom] = opts.zoom.split('-').map(Number)
  if (isNaN(minZoom) || isNaN(maxZoom)) {
    console.error('Error: --zoom must be in format min-max (e.g. 0-10)')
    process.exit(1)
  }

  return { ...opts, minZoom, maxZoom }
}

function printHelp() {
  console.log(`
MapTiler Satellite Tile Downloader

Usage:
  node scripts/download-tiles.mjs --bbox <minLon> <minLat> <maxLon> <maxLat> --zoom <min>-<max> [options]

Options:
  --bbox <minLon> <minLat> <maxLon> <maxLat>  Bounding box (required)
  --zoom <min>-<max>                            Zoom range (required, e.g. 0-10)
  --concurrency <n>                             Parallel downloads (default: 6)
  --output <dir>                                Output directory (default: public/tiles)
  --format <ext>                                Tile format extension (default: jpg)
  --help                                        Show this help

Examples:
  # Continental Europe at low-medium zoom
  node scripts/download-tiles.mjs --bbox -10 35 30 60 --zoom 0-10

  # Small region at high zoom
  node scripts/download-tiles.mjs --bbox -0.5 51.3 0.2 51.7 --zoom 10-16

  # Full world (low zoom only - ~85MB total)
  node scripts/download-tiles.mjs --bbox -180 -85 180 85 --zoom 0-8
`)
}

function lonToTileX(lon, zoom) {
  return Math.floor((lon + 180) / 360 * Math.pow(2, zoom))
}

function latToTileY(lat, zoom) {
  return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))
}

function downloadTile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const dir = dirname(outputPath)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

    const file = createWriteStream(outputPath)
    get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file)
        file.on('finish', () => { file.close(); resolve(true) })
      } else if (response.statusCode === 404) {
        file.close()
        existsSync(outputPath) && rmSync(outputPath)
        resolve(false)
      } else {
        file.close()
        reject(new Error(`HTTP ${response.statusCode} for ${url}`))
      }
    }).on('error', (err) => {
      file.close()
      reject(err)
    })
  })
}

function estimateTileCount(minLon, minLat, maxLon, maxLat, minZoom, maxZoom) {
  let total = 0
  for (let z = minZoom; z <= maxZoom; z++) {
    const x1 = lonToTileX(minLon, z)
    const x2 = lonToTileX(maxLon, z)
    const y1 = latToTileY(maxLat, z)
    const y2 = latToTileY(minLat, z)
    const tilesX = Math.abs(x2 - x1) + 1
    const tilesY = Math.abs(y2 - y1) + 1
    total += tilesX * tilesY
  }
  return total
}

async function main() {
  const apiKey = loadEnv()
  const opts = parseArgs()

  const { bbox, minZoom, maxZoom, concurrency, output, tileFormat } = opts
  const [minLon, minLat, maxLon, maxLat] = bbox
  const totalEstimated = estimateTileCount(minLon, minLat, maxLon, maxLat, minZoom, maxZoom)

  console.log(`\nMapTiler Satellite Tile Downloader`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`  Bounding box: ${bbox.join(', ')}`)
  console.log(`  Zoom range:   ${minZoom}-${maxZoom}`)
  console.log(`  Output:       ${output}/`)
  console.log(`  Concurrency:  ${concurrency}`)
  console.log(`  Est. tiles:   ${totalEstimated.toLocaleString()}`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

  let totalDownloaded = 0
  let totalSkipped = 0
  let totalErrors = 0
  const startTime = Date.now()

  for (let z = minZoom; z <= maxZoom; z++) {
    const x1 = lonToTileX(minLon, z)
    const x2 = lonToTileX(maxLon, z)
    const y1 = latToTileY(maxLat, z)
    const y2 = latToTileY(minLat, z)

    const minX = Math.min(x1, x2)
    const maxX = Math.max(x1, x2)
    const minY = Math.min(y1, y2)
    const maxY = Math.max(y1, y2)

    const tilesInZoom = (maxX - minX + 1) * (maxY - minY + 1)
    console.log(`Zoom ${z}: ${tilesInZoom.toLocaleString()} tiles (x: ${minX}-${maxX}, y: ${minY}-${maxY})`)

    const tiles = []
    for (let x = minX; x <= maxX; x++) {
      // Clamp x to valid range
      const clampedX = ((x % Math.pow(2, z)) + Math.pow(2, z)) % Math.pow(2, z)
      for (let y = minY; y <= maxY; y++) {
        if (y < 0 || y >= Math.pow(2, z)) continue
        tiles.push({ z, x: clampedX, y })
      }
    }

    // Process with limited concurrency
    let zoomDownloaded = 0
    let zoomSkipped = 0
    let zoomErrors = 0
    const zoomStart = Date.now()

    for (let i = 0; i < tiles.length; i += concurrency) {
      const batch = tiles.slice(i, i + concurrency)
      const results = await Promise.allSettled(
        batch.map(async ({ z, x, y }) => {
          const outputPath = resolve(process.cwd(), output, String(z), String(x), `${y}.${tileFormat}`)
          if (existsSync(outputPath)) {
            return 'skipped'
          }
          const url = `https://api.maptiler.com/tiles/satellite/${z}/${x}/${y}.${tileFormat}?key=${apiKey}`
          const downloaded = await downloadTile(url, outputPath)
          return downloaded ? 'downloaded' : 'nodata'
        })
      )

      for (const r of results) {
        if (r.status === 'fulfilled') {
          if (r.value === 'downloaded') { zoomDownloaded++; totalDownloaded++ }
          else if (r.value === 'skipped') { zoomSkipped++; totalSkipped++ }
        } else {
          zoomErrors++; totalErrors++
        }
      }

      const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1)
      const pct = ((i + batch.length) / tiles.length * 100).toFixed(1)
      const rate = (totalDownloaded / ((Date.now() - startTime) / 1000)).toFixed(1)
      process.stdout.write(`\r  ${pct}% | downloaded: ${totalDownloaded.toLocaleString()} | skipped: ${totalSkipped.toLocaleString()} | errors: ${totalErrors} | ${rate} tiles/s | ${elapsed} min`)
    }

    const zoomElapsed = ((Date.now() - zoomStart) / 1000).toFixed(1)
    console.log(`\n  Zoom ${z} done in ${zoomElapsed}s (downloaded: ${zoomDownloaded}, skipped: ${zoomSkipped}, errors: ${zoomErrors})\n`)
  }

  const totalElapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1)
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`Complete!`)
  console.log(`  Downloaded: ${totalDownloaded.toLocaleString()} tiles`)
  console.log(`  Skipped:    ${totalSkipped.toLocaleString()} tiles`)
  console.log(`  Errors:     ${totalErrors} tiles`)
  console.log(`  Time:       ${totalElapsed} minutes`)
  console.log(`  Output:     ${output}/`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

  // Generate tile index for the web app
  generateTileIndex(output, minZoom, maxZoom)
}

function generateTileIndex(outputDir, minZoom, maxZoom) {
  const indexPath = resolve(process.cwd(), outputDir, 'tile-index.json')
  const index = {
    generated: new Date().toISOString(),
    tileFormat: 'jpg',
    minZoom,
    maxZoom,
    tiles: {}
  }

  for (let z = minZoom; z <= maxZoom; z++) {
    const zDir = resolve(process.cwd(), outputDir, String(z))
    if (!existsSync(zDir)) continue
    const xDirs = readdirSync(zDir).filter(d => /^\d+$/.test(d))
    for (const x of xDirs) {
      const xPath = resolve(zDir, x)
      const yFiles = readdirSync(xPath).filter(f => f.endsWith('.jpg'))
      const yNums = yFiles.map(f => parseInt(f.replace('.jpg', ''), 10))
      index.tiles[`${z}`] = index.tiles[`${z}`] || {}
      index.tiles[`${z}`][x] = yNums.sort((a, b) => a - b)
    }
  }

  writeFileSync(indexPath, JSON.stringify(index))
  console.log(`Tile index written to ${indexPath}`)
}
main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
