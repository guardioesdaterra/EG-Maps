/**
 * scripts/scan-i18n.ts
 * @why i18n scanner — scans .vue/.ts files for t() calls, reports missing translation keys
 */
import fs from 'fs'
import path from 'path'

const IGNORE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /\.nuxt/,
  /dist/,
  /public\/data/,
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

  const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/)
  if (templateMatch) {
    lines.forEach((line, index) => {
      if (line.includes('t(') && !line.match(/t\(['"][a-z_]+\.[a-z_]+['"]/)) {
        return
      }

      if (line.includes('iconify-icon') || line.includes('<Icon')) {
        return
      }

      if (line.match(/class=['"][a-z_\-\s]+['"]/)) {
        return
      }

      const textMatches = line.match(/"[^"]{4,100}"/g)
      if (textMatches) {
        textMatches.forEach(match => {
          const text = match.slice(1, -1)
          if (text.includes('{{') || text.includes('${') || text.includes('/') || text.includes(':')) {
            return
          }
          if (text.match(/^(https?:\/\/|mailto:|#|\/)/)) {
            return
          }
          if (text.split(' ').length < 2 && text === text.toLowerCase()) {
            return
          }
          if (text.match(/^(Earth|Guardians|Project|Grants|Species|Map|Globe)$/i)) {
            return
          }

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

const srcDir = path.join(process.cwd(), 'components')
const pagesDir = path.join(process.cwd(), 'pages')
const layoutsDir = path.join(process.cwd(), 'layouts')

console.log('🔍 Scanning for hardcoded text in Vue components...\n')

const allResults: HardcodedText[] = []
if (fs.existsSync(srcDir)) allResults.push(...scanDirectory(srcDir))
if (fs.existsSync(pagesDir)) allResults.push(...scanDirectory(pagesDir))
if (fs.existsSync(layoutsDir)) allResults.push(...scanDirectory(layoutsDir))

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

export type { HardcodedText }
export { scanFile, scanDirectory }