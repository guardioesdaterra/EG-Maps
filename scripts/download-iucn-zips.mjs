/* eslint-disable no-console */
import { chromium } from 'playwright'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const DOWNLOAD_DIR = '/tmp/iucn-downloads'
mkdirSync(DOWNLOAD_DIR, { recursive: true })

const TARGETS = [
  { name: 'MAMMALS', url: 'https://sdownloads.iucnredlist.org/groups/MAMMALS.zip' },
  { name: 'AMPHIBIANS', url: 'https://sdownloads.iucnredlist.org/groups/AMPHIBIANS.zip' },
  // Small ones first for testing
  { name: 'MAMMALS_MARINE_TERRESTRIAL', uuid: '1e70be03-08f3-4c0c-86b2-0ed6f641840a' },
  { name: 'CAECILIAN_AMPHIBIANS', uuid: '6cb875af-cfd3-4361-9ed5-7176ce336480' },
]

async function downloadViaRedirect(browser, target) {
  const page = await browser.newPage()
  
  try {
    // Try direct download URL first
    const dlUrl = target.uuid
      ? `https://www.iucnredlist.org/resources/files/${target.uuid}`
      : target.url
    
    console.log(`Attempting: ${target.name} from ${dlUrl}`)
    
    // Set up download listener before navigation
    const downloadPromise = page.waitForEvent('download', { timeout: 60000 }).catch(() => null)
    
    // Navigate to the IUCN spatial data page first to get cookies
    await page.goto('https://www.iucnredlist.org/resources/spatial-data-download', {
      waitUntil: 'networkidle',
      timeout: 30000
    })
    console.log(`  Page loaded, title: ${await page.title()}`)
    
    // Now try to navigate to download
    await page.goto(dlUrl, {
      waitUntil: 'networkidle',
      timeout: 30000
    })
    
    console.log(`  Status after navigating to download: ${page.url()}`)
    
    // Check if we got a challenge
    const content = await page.content()
    if (content.includes('challenge') || content.includes('cf-browser-verification') || content.includes('cloudflare')) {
      console.log(`  Cloudflare challenge detected, trying to wait...`)
      await page.waitForTimeout(10000)
      console.log(`  After wait, URL: ${page.url()}`)
      const content2 = await page.content()
      console.log(`  Content length: ${content2.length}`)
    }
    
    const download = await downloadPromise
    if (download) {
      const dest = join(DOWNLOAD_DIR, `${target.name}.zip`)
      await download.saveAs(dest)
      console.log(`  Downloaded: ${dest}`)
      return true
    }
    
    // Try to capture response
    const resp = await page.waitForResponse(r =>
      r.url().includes('.zip') && r.status() === 200,
      { timeout: 15000 }
    ).catch(() => null)
    
    if (resp) {
      const buffer = await resp.body()
      const dest = join(DOWNLOAD_DIR, `${target.name}.zip`)
      writeFileSync(dest, buffer)
      console.log(`  Captured via response: ${dest} (${buffer.length} bytes)`)
      return true
    }
    
    console.log(`  Failed to download ${target.name}`)
    return false
  } catch (err) {
    console.log(`  Error: ${err.message}`)
    return false
  } finally {
    await page.close()
  }
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ]
  })
  
  // Try the small ones first
  for (const target of TARGETS) {
    await downloadViaRedirect(browser, target)
  }
  
  await browser.close()
  console.log('\nDone. Files in:', DOWNLOAD_DIR)
}

main().catch(console.error)
