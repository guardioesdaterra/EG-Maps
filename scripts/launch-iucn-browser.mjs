/* eslint-disable no-console */
import { chromium } from 'playwright'
import { spawn } from 'child_process'
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

const DOWNLOAD_DIR = '/tmp/iucn-downloads'
mkdirSync(DOWNLOAD_DIR, { recursive: true })

const DISPLAY = process.env.DISPLAY || ':99'
process.env.DISPLAY = DISPLAY

function escapeHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }

const GROUPS = [
  {
    category: 'Main Groups (Polygons)',
    items: [
      { name: 'Mammals',         uuid: '69dda226-01ad-4b0c-a8df-226f0f96db4a', size: '1.21 GB' },
      { name: 'Amphibians',      uuid: 'af13f6f5-11dd-4c83-9c84-ba79dc108a8c', size: '1.69 GB' },
      { name: 'Reptiles',        uuid: '260a913f-f6f4-4dae-8571-a371fb07fadf', size: '1.39 GB' },
      { name: 'Plants',          uuid: 'fe632352-ab7b-431e-9ece-6dbc4435696d', size: '3.13 GB' },
    ]
  },
  {
    category: 'Mammal Subgroups (Polygons)',
    items: [
      { name: 'Freshwater Mammals',       uuid: 'e35dd670-a358-4abf-a7ea-3ece12913e40', size: '<100 MB' },
      { name: 'Marine Mammals',           uuid: '447873ab-e972-416f-9406-5d70febba6a3', size: '<500 MB' },
      { name: 'Marine & Terrestrial Mammals', uuid: '1e70be03-08f3-4c0c-86b2-0ed6f641840a', size: '<50 MB' },
      { name: 'Terrestrial Mammals',      uuid: '7864a4a2-f7ed-422f-8a43-7fc42e3883c9', size: '815 MB' },
    ]
  },
  {
    category: 'Amphibian Subgroups (Polygons)',
    items: [
      { name: 'Tailless Amphibians (Anura)',    uuid: '85f90bd7-1b17-467e-9936-f829578aa887', size: '1.52 GB' },
      { name: 'Tailed Amphibians (Caudata)',     uuid: '9fc64803-e0dd-4db1-957e-13f0f25141a9', size: '<250 MB' },
      { name: 'Caecilian Amphibians (Gymnophiona)', uuid: '6cb875af-cfd3-4361-9ed5-7176ce336480', size: '<50 MB' },
    ]
  },
  {
    category: 'Reptile Subgroups (Polygons)',
    items: [
      { name: 'Crocodiles & Alligators', uuid: '9583ae1f-630f-4069-bece-faa16aa29ed5', size: '<50 MB' },
      { name: 'Scaled Reptiles (Squamata)',  uuid: '79eeaa1f-cec5-45f1-85d1-59b03843d61b', size: '1.31 GB' },
      { name: 'Turtles (Testudines)',     uuid: 'ffefef96-3ee8-4a29-ba13-fcabc5ae4332', size: '<50 MB' },
    ]
  },
  {
    category: 'Fish Groups (Polygons)',
    items: [
      { name: 'Chondrichthyes (Sharks, Rays)', uuid: '8a596e26-473f-4776-8f36-bdc59f7e8e04', size: '<500 MB' },
      { name: 'Croakers & Drums',       uuid: '79c7523d-e9aa-4edf-a9f2-604cf0570723', size: '<250 MB' },
      { name: 'Eels',                  uuid: '069c577b-5700-4055-868c-222c9b68a15c', size: '<500 MB' },
      { name: 'Groupers',              uuid: 'd5cde06c-7e69-4ec5-8680-6b0858db2e93', size: '<500 MB' },
      { name: 'Hagfishes',             uuid: 'e4fea22d-47af-4d6c-a503-fcccb192b9a7', size: '<500 MB' },
      { name: 'Salmonids',             uuid: 'c1a31e2e-eb46-41a7-88c3-2f4fb3ec9f27', size: '<250 MB' },
      { name: 'Seabreams, Snappers, Grunts', uuid: '6034c7a1-8fcf-490c-80ff-6d055d9bc12c', size: '542 MB' },
      { name: 'Sturgeons & Paddlefishes', uuid: '9326f049-f8c5-4dfb-bbaa-0053dab3e965', size: '<50 MB' },
      { name: 'Syngnathiform Fishes',  uuid: '07355d78-ed22-4481-b9f9-7db929380988', size: '<500 MB' },
      { name: 'Tunas, Billfishes, Swordfishes', uuid: '2d0b4b04-af89-4f8f-a925-5fa0daff2aff', size: '<250 MB' },
      { name: 'Wrasses & Parrotfishes', uuid: 'c99dfe45-9419-4baa-ba44-ec1e810fc153', size: '<500 MB' },
      { name: 'Marine Fishes',         uuid: '3f4d2be7-5c60-4e10-bb58-6ba0ab86c8a7', size: '9.87 GB' },
    ]
  },
  {
    category: 'Marine Groups (Polygons)',
    items: [
      { name: 'Reef-forming Corals',   uuid: '88f8addb-7d89-4e2a-9284-5862824797c3', size: '1.76 GB' },
      { name: 'Mangroves',             uuid: '0f712c2f-1de0-4a4a-8e53-62bf3f6697e6', size: '<100 MB' },
      { name: 'Seagrasses',            uuid: '28bbd04b-4491-4d5c-8b83-5bec9b62a0a4', size: '<100 MB' },
      { name: 'Lobsters',              uuid: '073b6786-beb2-4b65-93a9-e6c3b8f0e0f3', size: '<250 MB' },
      { name: 'Abalones',              uuid: '4062b076-a16c-4e30-8042-7e68dee4cefc', size: '<50 MB' },
      { name: 'Cone Snails',           uuid: '76e303ae-505f-4007-961e-d200347241b9', size: '<500 MB' },
    ]
  },
  {
    category: 'Plant Subgroups (Polygons)',
    items: [
      { name: 'Trees',                 uuid: 'e83c8a67-3c31-420d-a808-2ae5240384c4', size: '1.46 GB' },
      { name: 'Birches',               uuid: '44e826d7-6768-491e-b6e5-bbb73466bf46', size: '<10 MB' },
      { name: 'Magnolias',             uuid: '9cfb9d03-9184-45df-bb96-e056de56d3ae', size: '<10 MB' },
      { name: 'Maples',                uuid: '0df81c0c-dda9-44cb-aae5-593ab1b5a481', size: '<10 MB' },
      { name: 'Teas',                  uuid: '99a2fda3-71de-4370-b2ab-b0a2fb0d0fc2', size: '<10 MB' },
    ]
  },
  {
    category: 'Freshwater Groups (Polygons)',
    items: [
      { name: 'Freshwater Fishes',     uuid: '424bc197-b56e-4c6c-acca-0c072616d2d9', size: '2.37 GB' },
      { name: 'Freshwater Molluscs',   uuid: '733994f7-6db3-4787-a014-5260645ec86d', size: '<500 MB' },
      { name: 'Odonata (Dragonflies)', uuid: '2ad9dd7b-a2c4-405a-b9f4-51d3e0745758', size: '790 MB' },
      { name: 'Freshwater Plants',     uuid: 'ba643f3d-56b4-4bb1-b6b4-81791f2a1c88', size: '1.03 GB' },
      { name: 'Freshwater Crabs',      uuid: '6cea071e-084c-41a9-94dd-5929597b3140', size: '<100 MB' },
      { name: 'Crayfishes',            uuid: '14a9016b-1f85-4337-bad8-dc79be279779', size: '<50 MB' },
      { name: 'Freshwater Shrimps',    uuid: '3a4bc57b-5d74-45a4-9e2c-94c16f147c9d', size: '<100 MB' },
      { name: 'Other Freshwater',      uuid: 'c8523c93-7d19-4b3b-ae9b-5b76c5631972', size: '3.37 GB' },
    ]
  },
  {
    category: 'Point Data (CSV)',
    items: [
      { name: 'Chondrichthyes Points', uuid: '90c10dae-197b-45ca-8421-9a21d05d7653', size: '<1 MB' },
      { name: 'Salmonids Points',      uuid: 'c6a08c37-b241-4a22-973f-6083063befcf', size: '<5 MB' },
      { name: 'Syngnathiform Points',  uuid: 'c448db27-dd92-409f-8389-a3e0c9d4a273', size: '<1 MB' },
      { name: 'Trees Points',          uuid: '120d01e5-b59b-43ad-890e-a064b2a4a855', size: '<200 MB' },
      { name: 'Birds Data (via BirdLife)', url: 'https://datazone.birdlife.org/species/requestdis', size: 'external' },
    ]
  },
  {
    category: 'HydroBASIN Tables (CSV)',
    items: [
      { name: 'Reptiles HydroBASIN',   uuid: '4591738e-2d0c-4fc0-b4de-5413ec5bab26', size: '<5 MB' },
      { name: 'Salmonids HydroBASIN',  uuid: 'ab64962f-2f3c-43d3-97a9-2aff8f6f5807', size: '<5 MB' },
    ]
  },
]

function buildDashboardHTML() {
  var rows = ''
  GROUPS.forEach(function(g) {
    rows += '<tr class="group-header"><td colspan="4">' + escapeHtml(g.category) + '</td></tr>'
    g.items.forEach(function(item) {
      var url = item.url || 'https://www.iucnredlist.org/resources/files/' + item.uuid
      var statusId = 'status-' + (item.uuid || item.name.replace(/[^a-z0-9]/gi, ''))
      rows += '<tr class="download-row" data-url="' + url + '" data-name="' + escapeHtml(item.name) + '">'
      rows += '<td class="name">' + escapeHtml(item.name) + '</td>'
      rows += '<td class="size">' + escapeHtml(item.size) + '</td>'
      rows += '<td><button class="dl-btn" data-url="' + url + '" data-name="' + escapeHtml(item.name) + '" onclick="startDownload(this)">⬇ Download</button></td>'
      rows += '<td class="status" id="' + statusId + '">waiting</td>'
      rows += '</tr>'
    })
  })
  
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>IUCN Spatial Data Downloader</title>'
    + '<style>'
    + '*{box-sizing:border-box;margin:0;padding:0}'
    + 'body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#0a0e17;color:#e0e0e0;padding:20px}'
    + 'h1{color:#4fc3f7;font-size:22px;margin-bottom:5px}'
    + '.sub{color:#888;font-size:13px;margin-bottom:20px}'
    + 'table{width:100%;border-collapse:collapse}'
    + 'th{text-align:left;padding:8px 12px;color:#4fc3f7;font-size:12px;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #1a2744}'
    + '.group-header td{background:#0d1527;color:#4fc3f7;font-weight:bold;padding:10px 12px;font-size:13px;border-top:2px solid #1a2744}'
    + '.download-row td{padding:6px 12px;border-bottom:1px solid #111927}'
    + '.download-row:hover{background:#0d1527}'
    + '.name{font-size:14px}'
    + '.size{color:#888;font-size:12px;width:80px}'
    + '.dl-btn{background:#1a6b3c;color:#fff;border:none;padding:5px 14px;border-radius:4px;cursor:pointer;font-size:13px;transition:background .2s}'
    + '.dl-btn:hover{background:#228b4e}'
    + '.dl-btn:disabled{background:#333;color:#666;cursor:not-allowed}'
    + '.dl-btn.running{background:#b8860b}'
    + '.dl-btn.done{background:#2d5a2d}'
    + '.status{font-size:12px;width:100px}'
    + '.status.downloading{color:#ffd700}'
    + '.status.done{color:#4caf50}'
    + '.status.error{color:#f44336}'
    + '#actions{margin:15px 0;display:flex;gap:10px;flex-wrap:wrap}'
    + '#actions button{background:#1a2744;color:#4fc3f7;border:1px solid #2a3f6a;padding:8px 16px;border-radius:4px;cursor:pointer;font-size:13px}'
    + '#actions button:hover{background:#2a3f6a}'
    + '#log{background:#050810;border:1px solid #1a2744;border-radius:4px;padding:10px;margin-top:15px;max-height:120px;overflow-y:auto;font-family:monospace;font-size:12px;color:#888}'
    + '</style></head><body>'
    + '<h1>🌍 IUCN Red List Spatial Data Downloader</h1>'
    + '<p class="sub">Click any download button — files save to /tmp/iucn-downloads/ on the server. Cloudflare challenge may appear: solve once, then all downloads work.</p>'
    + '<div id="actions"><button onclick="downloadAll()">⬇ Download ALL</button><button onclick="downloadSelected()">⬇ Download Selected</button></div>'
    + '<table><thead><tr><th style="width:30%">Dataset</th><th>Size</th><th style="width:100px">Action</th><th>Status</th></tr></thead><tbody>'
    + rows
    + '</tbody></table>'
    + '<div id="log">Ready. Click a download button to start.</div>'
    + '<script>'
    + 'var activeDownloads = 0;'
    + 'function log(msg){var el=document.getElementById("log");el.innerHTML+="<br>"+msg;el.scrollTop=el.scrollHeight}'
    + 'function startDownload(btn){'
    + '  var url=btn.getAttribute("data-url");var name=btn.getAttribute("data-name");'
    + '  var row=btn.closest("tr");var statusCell=row.querySelector(".status");'
    + '  btn.disabled=true;btn.className="dl-btn running";btn.textContent="⏳";'
    + '  statusCell.textContent="downloading";statusCell.className="status downloading";'
    + '  activeDownloads++;'
    + '  log("Starting: "+name);'
    + '  var a=document.createElement("a");a.href=url;a.download="";a.style.display="none";'
    + '  document.body.appendChild(a);a.click();document.body.removeChild(a);'
    + '  setTimeout(function(){'
    + '    btn.disabled=false;btn.className="dl-btn done";btn.textContent="✓";'
    + '    statusCell.textContent="done";statusCell.className="status done";'
    + '    activeDownloads--;'
    + '    log("Done: "+name);'
    + '  },3000);'
    + '}'
    + 'function downloadAll(){'
    + '  var btns=document.querySelectorAll(".dl-btn:not(:disabled)");'
    + '  btns.forEach(function(b,i){setTimeout(function(){b.click()},i*2000)});'
    + '  log("Starting batch download of "+btns.length+" datasets");'
    + '}'
    + '</script></body></html>'
}

async function main() {
  console.log('=== IUCN Browser Launcher ===')
  console.log('Display:', DISPLAY)
  console.log('Download dir:', DOWNLOAD_DIR)
  console.log('')
  
  spawn('x11vnc', [
    '-display', DISPLAY,
    '-rfbport', '5900',
    '-localhost',
    '-forever',
    '-shared',
    '-bg',
    '-nopw',
    '-quiet',
  ], { stdio: 'inherit' })
  
  console.log('x11vnc started on port 5900 (localhost only)')
  console.log('Launching Chrome...')
  
  var browser = await chromium.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1920,900',
      '--disable-blink-features=AutomationControlled',
    ],
  })
  
  var page = await browser.newPage({
    viewport: { width: 1920, height: 900 },
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  })
  
  // Step 1: Navigate to IUCN page to establish session
  console.log('Navigating to IUCN spatial data page...')
  await page.goto('https://www.iucnredlist.org/resources/spatial-data-download', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  }).catch(function(e) { console.log('Nav warning:', e.message) })
  
  console.log('Page loaded:', await page.title())
  
  // Step 2: Inject the curated download dashboard
  var dashboardHTML = buildDashboardHTML()
  var dashboardPath = '/tmp/iucn-dashboard.html'
  writeFileSync(dashboardPath, dashboardHTML)
  
  console.log('Navigating to curated download dashboard...')
  await page.goto('file://' + dashboardPath, {
    waitUntil: 'domcontentloaded',
    timeout: 10000,
  })
  
  console.log('\n=======================================================')
  console.log('BROWSER READY — connect via VNC:')
  console.log('=======================================================')
  console.log('')
  console.log('  ssh -N -L 5900:localhost:5900 ubuntu@3.145.167.126')
  console.log('')
  console.log('  Then VNC client -> localhost:5900')
  console.log('')
  console.log('  If Cloudflare challenge appears:')
  console.log('  - Switch to the IUCN tab, solve it')
  console.log('  - Then come back and click downloads')
  console.log('')
  console.log('  Files save to: /tmp/iucn-downloads/')
  console.log('=======================================================\n')
  
  // Monitor all pages for downloads
  browser.on('page', function(p) {
    p.on('download', async function(download) {
      var dest = join(DOWNLOAD_DIR, download.suggestedFilename())
      await download.saveAs(dest)
      console.log('\n*** DOWNLOAD COMPLETE: ' + dest + ' (' + download.suggestedFilename() + ') ***\n')
    })
  })
  
  // Also monitor the main page
  page.on('download', async function(download) {
    var dest = join(DOWNLOAD_DIR, download.suggestedFilename())
    await download.saveAs(dest)
    console.log('\n*** DOWNLOAD COMPLETE: ' + dest + ' (' + download.suggestedFilename() + ') ***\n')
  })
  
  await new Promise(function() {})
}

main().catch(function(err) {
  console.error('Fatal:', err)
  process.exit(1)
})
