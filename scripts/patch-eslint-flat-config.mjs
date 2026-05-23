/**
 * Patch eslint-flat-config-utils to add Object.groupBy polyfill
 * This is needed for Node.js versions that don't support Object.groupBy natively
 * (This is a temporary fix until eslint-flat-config-utils is updated)
 */
import { existsSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const polyfill = `// Polyfill for older Node versions
if (!Object.groupBy) { Object.groupBy = (arr, fn) => Object.entries(arr.reduce((acc, item) => { const key = fn(item); (acc[key] = acc[key] || []).push(item); return acc; }, {})).reduce((acc, [key, value]) => { acc[key] = value; return acc; }, {}); }
`;

// Find eslint-flat-config-utils in node_modules
function findModule(basePath, name) {
  const modulePath = resolve(basePath, 'node_modules', name);
  if (existsSync(modulePath)) return modulePath;

  // Check pnpm store
  const pnpmPath = resolve(basePath, 'node_modules', '.pnpm');
  if (existsSync(pnpmPath)) {
    const entries = readdirSync(pnpmPath).filter(e => e.startsWith(name));
    for (const entry of entries) {
      const distPath = resolve(pnpmPath, entry, 'node_modules', name, 'dist', 'index.mjs');
      if (existsSync(distPath)) return resolve(pnpmPath, entry, 'node_modules', name);
    }
  }
  return null;
}

const rootDir = resolve(__dirname, '..');
const modulePath = findModule(rootDir, 'eslint-flat-config-utils');
const indexPath = modulePath ? resolve(modulePath, 'dist', 'index.mjs') : null;

if (indexPath && existsSync(indexPath)) {
  let content = readFileSync(indexPath, 'utf-8');

  // Check if polyfill already exists
  if (!content.includes('Object.groupBy polyfill')) {
    // Add polyfill at the beginning
    content = polyfill + content;
    writeFileSync(indexPath, content);
    console.log('✓ Patched eslint-flat-config-utils with Object.groupBy polyfill');
  } else {
    console.log('✓ eslint-flat-config-utils already patched');
  }
} else {
  console.log('! eslint-flat-config-utils not found, skipping patch');
}
