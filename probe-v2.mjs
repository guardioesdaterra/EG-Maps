import { chromium } from 'playwright'

const browser = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'],
})
const page = await browser.newPage()
const logs = []
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text().slice(0, 220)}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${String(e).slice(0, 220)}`))
page.on('requestfailed', (r) => logs.push(`[reqfail] ${r.url().slice(0, 140)} :: ${r.failure()?.errorText}`))

await page.goto('http://127.0.0.1:3100/vulcan-observatory', { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForTimeout(60000)

const state = await page.evaluate(async () => {
  const out = {}
  try {
    const r = await fetch('/data/cultural-agents/cultural-agents.json')
    const j = await r.json()
    out.fetchOk = r.ok
    out.fetchCount = j.features?.length
  } catch (e) { out.fetchErr = String(e).slice(0, 120) }
  out.canvasCount = document.querySelectorAll('canvas.maplibregl-canvas').length
  out.canvasPx = [...document.querySelectorAll('canvas.maplibregl-canvas')].map(c => `${c.width}x${c.height}`)
  out.mapOverlayLoading = document.body.innerText.includes('Preparing vulcan observatory')
  out.cultureVisible = document.body.innerText.includes('Cultural Agents') || document.body.innerText.includes('CULTURE')
  return out
})
console.log('STATE:', JSON.stringify(state, null, 2))
console.log('--- relevant console ---')
const seen = new Set()
for (const l of logs) {
  const k = l.slice(0, 90)
  if (seen.has(k)) continue
  seen.add(k)
  if (/cultural|tile-provider|error|fail|idle|glyph|ree-cultural|setStyle|style/i.test(l)) console.log(l)
}
console.log(`--- total console lines: ${logs.length} ---`)
await browser.close()
