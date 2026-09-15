/**
 * TEMP repro spec — Squarespace region filter: reload vs viewport-only.
 * DELETE BEFORE COMMITTING.
 */
import { test, expect } from '@playwright/test'

test('region filter does not reload iframe and viewports region', async ({ page }) => {
  const logs: string[] = []
  page.on('console', (msg) => {
    const t = `[${msg.type()}] ${msg.text()}`
    if (/tile-provider|initMap|EG Maps|crew-map|map-ready|error/i.test(msg.text())) logs.push(t.slice(0, 300))
  })
  page.on('pageerror', (err) => logs.push(`PAGEERROR: ${String(err).slice(0, 300)}`))

  await page.goto('http://localhost:3001/', { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForFunction(() => (window as unknown as { __isReady: boolean }).__isReady === true, null, { timeout: 45000 })
  // let map settle
  await page.waitForTimeout(4000)
  const loadsBefore: number = await page.evaluate(() => (window as unknown as { __getLoads: () => number }).__getLoads())
  await page.screenshot({ path: '/tmp/opencode/sq-before.png' })

  await page.evaluate(() => (window as unknown as { __send: (r: string) => void }).__send('africa'))
  await page.waitForTimeout(5000)

  const loadsAfter: number = await page.evaluate(() => (window as unknown as { __getLoads: () => number }).__getLoads())
  await page.screenshot({ path: '/tmp/opencode/sq-after.png' })

  // iframe URL reflects replaceState sync (proves applyFilters ran in-frame)
  const frame = page.frame({ url: /localhost:3000\/active-crews/ })
  const frameUrl = frame?.url() ?? 'NO FRAME'

  console.log(`LOADS before=${loadsBefore} after=${loadsAfter}`)
  console.log(`FRAME URL: ${frameUrl}`)
  console.log('--- captured logs ---')
  for (const l of logs.slice(-60)) console.log(l)

  expect(loadsAfter).toBe(loadsBefore)
  expect(frameUrl).toContain('region=africa')
})
