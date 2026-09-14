/**
 * scripts/sniff-anm.mjs
 * Playwright network sniffer for ANM source recon.
 * @why Loads each ANM source page fully rendered in headless Chrome and
 *      records every request/response, proving exactly which endpoints each
 *      page's infos come from (portal item JSON, MapServer/FeatureServer
 *      metadata, export tiles, statistic queries, pbf geometry tiles).
 * @deps @playwright/test (chromium); node:fs; node:path; node:url
 *      (system google-chrome-stable via executablePath — no pw download)
 * @connections docs/anm-sync.md (findings feed the daily sync job design)
 */
import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = '/tmp/opencode/sniff';
mkdirSync(OUT, { recursive: true });

const TARGETS = [
  { id: 'dadosabertos', url: 'https://dadosabertos.anm.gov.br/SIGMINE/PROCESSOS_MINERARIOS/', waitMs: 8000 },
  { id: 'sigmine-webapp', url: 'https://geo.anm.gov.br/portal/apps/webappviewer/index.html?id=6a8f5ccc4b6a4c2bba79759aa952d908', waitMs: 45000 },
  { id: 'disponibilidade-dash', url: 'https://geo.anm.gov.br/portal/apps/dashboards/2706303fec9541bdafdad76eb5c1da7f', waitMs: 45000 },
];

const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;

const browser = await chromium.launch({
  headless: true,
  executablePath: '/usr/bin/google-chrome-stable',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

for (const t of TARGETS) {
  if (only && t.id !== only) continue;
  console.log('[sniff] ' + t.id + ' :: ' + t.url);
  const entries = [];
  const page = await browser.newPage();
  page.on('response', async (res) => {
    try {
      const req = res.request();
      const url = req.url();
      if (url.startsWith('data:') || url.startsWith('blob:')) return;
      let bytes = -1;
      try { const buf = await res.body().catch(() => null); if (buf) bytes = buf.length; } catch { /* body unreadable — keep bytes=-1 */ }
      entries.push({ method: req.method(), url: url.slice(0, 600), status: res.status(), bytes, type: req.resourceType() });
    } catch { /* malformed response — skip entry */ }
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
  let title = '';
  try {
    await page.goto(t.url, { timeout: 90000, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(t.waitMs);
    try { await page.waitForLoadState('networkidle', { timeout: 15000 }); } catch { /* heavy apps never idle — continue */ }
    title = await page.title().catch(() => '');
  } catch (e) { errors.push('[nav] ' + String(e).split('\n')[0].slice(0, 300)); }
  const byHost = {};
  for (const e of entries) {
    let h = '(invalid)';
    try { h = new URL(e.url).host; } catch { /* keep '(invalid)' label */ }
    byHost[h] = byHost[h] || { count: 0, bytes: 0 };
    byHost[h].count++;
    if (e.bytes > 0) byHost[h].bytes += e.bytes;
  }
  const interesting = entries.filter((e) => /MapServer|FeatureServer|query|sharing\/rest|export|download|\.zip|\.kmz|\.kml|portalpublico|sople/i.test(e.url));
  const report = { id: t.id, url: t.url, title, totalRequests: entries.length, byHost, interesting: interesting.slice(0, 250), errors: errors.slice(0, 10) };
  writeFileSync(OUT + '/' + t.id + '.json', JSON.stringify(report, null, 1));
  console.log('[' + t.id + '] title=' + JSON.stringify(title) + ' requests=' + entries.length + ' interesting=' + interesting.length);
  for (const e of interesting.slice(0, 45)) console.log('  ' + e.status + ' ' + e.bytes + 'B ' + e.method + ' ' + e.url.slice(0, 190));
  await page.close().catch(() => {});
}
await browser.close();
console.log('reports in ' + OUT);
