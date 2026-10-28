#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

function fail(message) {
  throw new Error(message)
}

function getProjectRef() {
  const projectRef = process.env.SUPABASE_PROJECT_REF?.trim()
  if (!projectRef || /your[-_ ]|placeholder|replace[-_ ]?me/i.test(projectRef)) {
    fail('SUPABASE_PROJECT_REF is missing or still a placeholder. Set the intended project reference locally; its value is never printed.')
  }
  return projectRef
}

function discoverFunctions() {
  const functionsRoot = resolve('supabase/functions')
  let entries
  try {
    entries = readdirSync(functionsRoot, { withFileTypes: true })
  } catch {
    fail(`Edge Function source directory not found: ${functionsRoot}. This checkout does not include function sources (the supabase/ directory is ignored); obtain the authorized sources before deploying.`)
  }

  const functionDirectories = entries
    .filter((entry) => entry.isDirectory() && /^[a-z0-9_-]+$/i.test(entry.name) && !entry.name.startsWith('_'))
  const missingEntrypoints = functionDirectories.filter((entry) => {
    try {
      return !statSync(join(functionsRoot, entry.name, 'index.ts')).isFile()
    } catch {
      return true
    }
  })
  if (missingEntrypoints.length > 0) {
    fail(`missing index.ts in Edge Function director${missingEntrypoints.length === 1 ? 'y' : 'ies'}: ${missingEntrypoints.map((entry) => entry.name).join(', ')}.`)
  }

  const functions = functionDirectories
    .map((entry) => entry.name)
    .sort()

  if (functions.length === 0) {
    fail(`no deployable Edge Functions (expected supabase/functions/<name>/index.ts) under ${functionsRoot}.`)
  }
  return functions
}

function deployFunction(projectRef, name) {
  const result = spawnSync('supabase', ['functions', 'deploy', name, '--project-ref', projectRef], {
    stdio: 'inherit',
    shell: false,
  })
  if (result.error) {
    if (result.error.code === 'ENOENT') {
      fail('Supabase CLI not found on PATH. Install and authenticate the CLI, then retry.')
    }
    fail(`could not start Supabase CLI: ${result.error.message}`)
  }
  if (result.status !== 0) {
    fail(`Supabase CLI exited with status ${result.status ?? 'unknown'} while deploying function ${name}.`)
  }
}

function main() {
  const projectRef = getProjectRef()
  const functions = discoverFunctions()

  for (const name of functions) {
    console.log(`[supabase:deploy] Deploying function: ${name}`)
    deployFunction(projectRef, name)
  }

  console.log(`[supabase:deploy] Deployed ${functions.length} function(s). No secrets were changed.`)
}

try {
  main()
} catch (error) {
  console.error(`[supabase:deploy] ERROR: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}
