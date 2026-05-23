/**
 * i18n Scanner Script
 * Scans all Vue and TS files for hardcoded text strings that should use i18n keys
 * 
 * Usage: node scripts/scan-i18n.ts
 */

import fs from 'fs'
import path from 'path'

const ROOT_DIR = path.join(process.cwd(), 'src')

// Patterns to detect hardcoded text (exclude i18n t() calls and code)
const HARDCODED_PATTERNS = [
  // Template literals and text in quotes (simplified detection)
  /\{[^}]*\{?\s*['"][^'"{}]+['"]/g,  // Complex template expressions
  /[^t]\(['"](?![a-z_]+\.[a-z_])[A-Z][^'"]{3,80}['"]\)/g,  // Regular function calls with text
  /text=['"](?![{t(])[A-Z][^'"]{3,80}['"]/g,  // text= attributes
  /placeholder=['"](?![{t(])[A-Z][^'"]{3,80}['"]/g,  // placeholders
  /title=['"](?![{t(])[A-Z][^'"]{3,80}['"]/g,  // title attributes
  /aria-label=['"](?![{t(])[A-Z][^'"]{3,80}['"]/g,  // aria-label
  /class=['"][^'"]*\b(?!t\()[A-Z][a-z]+(?:\s+[^"]*)?\b['"]/g,  // CSS classes starting with uppercase
]

// Files to ignore
const IGNORE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /\.nuxt/,
  /dist/,
  /public\/data\//,  // JSON data files
  /\.test\./,
  /\.spec\./,
]

interface HardcodedText {
  file: string
  line: number
  text: string
  context: string
}

function scanFile(filePath: string): HardcodedText[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const results: HardcodedText[] = []

  // Check for hardcoded strings in template
  const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/)
  if (templateMatch) {
    const template = templateMatch[1]
    lines.forEach((line, index) => {
      // Skip if already using t() function
      if (line.includes('t(') && !line.match(/t\(['"][a-z_]+\.[a-z_]+['"]/)) {
        return
      }
      
      // Skip iconify-icon and Icon components
      if (line.includes('iconify-icon') || line.includes('<Icon')) {
        return
      }
      
      // Skip class attributes with static classes (not text)
      if (line.match(/class=['"][a-z_\-\s]+['"]/)) {
        return
      }

      // Check for patterns like "Some Text" that should be translated
      const textMatches = line.match(/"[^"]{4,100}"/g)
      if (textMatches) {
        textMatches.forEach(match => {
          const text = match.slice(1, -1)
          // Skip if it's a variable, path, or already a key
          if (text.includes('{{') || text.includes('${') || text.includes('/') || text.includes(':')) {
            return
          }
          // Skip if starts with common non-translatable patterns
          if (text.match(/^(https?:\/\/|mailto:|#|\/)/)) {
            return
          }
          // Skip if all lowercase or single word
          if (text.split(' ').length < 2 && text === text.toLowerCase()) {
            return
          }
          // Skip if it's a proper noun or technical term
          if (text.match(/^(Earth|Guardians|Project|Grants|Species|Map|Globe)$/i)) {
            return
          }
          
          // Found potential hardcoded text
          results.push({
            file: filePath,
            line: index + 1,
            text: text.substring(0, 60),
            context: line.trim().substring(0, 100)
          })
        })
      }
    })
  }

  return results
}

function scanDirectory(dir: string): HardcodedText[] {
  const results: HardcodedText[] = []
  
  if (!fs.existsSync(dir)) {
    console.log(`Directory not found: ${dir}`)
    return results
  }

  const files = fs.readdirSync(dir, { withFileTypes: true })
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name)
    
    // Skip ignored patterns
    if (IGNORE_PATTERNS.some(p => p.test(fullPath))) {
      continue
    }
    
    if (file.isDirectory()) {
      results.push(...scanDirectory(fullPath))
    } else if (file.name.endsWith('.vue') || file.name.endsWith('.ts')) {
      try {
        const fileResults = scanFile(fullPath)
        results.push(...fileResults)
      } catch (e) {
        console.error(`Error scanning ${fullPath}:`, e)
      }
    }
  }
  
  return results
}

// Main execution
const srcDir = path.join(process.cwd(), 'components')
const pagesDir = path.join(process.cwd(), 'pages')
const layoutsDir = path.join(process.cwd(), 'layouts')

console.log('🔍 Scanning for hardcoded text in Vue components...\n')

const allResults: HardcodedText[] = []
if (fs.existsSync(srcDir)) allResults.push(...scanDirectory(srcDir))
if (fs.existsSync(pagesDir)) allResults.push(...scanDirectory(pagesDir))
if (fs.existsSync(layoutsDir)) allResults.push(...scanDirectory(layoutsDir))

// Group by file
const byFile = new Map<string, HardcodedText[]>()
allResults.forEach(r => {
  const key = r.file
  if (!byFile.has(key)) byFile.set(key, [])
  byFile.get(key)!.push(r)
})

console.log(`Found ${allResults.length} potential hardcoded texts:\n`)

byFile.forEach((items, file) => {
  const relativePath = file.replace(process.cwd(), '')
  console.log(`📄 ${relativePath}`)
  items.forEach(item => {
    console.log(`   Line ${item.line}: "${item.text}"`)
  })
  console.log('')
})

// Export for use in fix script
export type { HardcodedText }
export { scanFile, scanDirectory }