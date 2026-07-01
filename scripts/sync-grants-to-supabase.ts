#!/usr/bin/env -S npx tsx
/**
 * sync-grants-to-supabase.ts
 *
 * Reads output JSON from grants.py and batch-upserts into Supabase
 * via the grants-catalog-sync edge function.
 *
 * Usage:
 *   # From EG-Maps root:
 *   python scripts/grants.py -o grants_export
 *   npx tsx scripts/sync-grants-to-supabase.ts scripts/output/grants_export_20260701_120000.json
 *
 *   # Or pipe from stdin:
 *   cat scripts/output/grants_radar_*.json | npx tsx scripts/sync-grants-to-supabase.ts
 *
 * Env:
 *   SUPABASE_URL              — Supabase project URL
 *   SUPABASE_ANON_KEY         — Supabase anon key (used as fallback)
 *   SUPABASE_SYNC_SECRET      — Shared secret for x-sync-secret header
 *   SUPABASE_EDGE_FUNCTION_URL — Optional override, defaults to {SUPABASE_URL}/functions/v1/grants-catalog-sync
 */

import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";

interface Grant {
  id: string;
  title: string;
  funder: string;
  source: string;
  url: string;
  description: string;
  deadline: string;
  amount_max: string;
  amount_min: string;
  currency: string;
  country: string;
  region: string;
  categories: string[];
  language: string;
  relevance: number;
  fetched_at: string;
  status: string;
}

interface SyncResponse {
  inserted: number;
  updated: number;
  skipped: number;
  total: number;
  errors?: string[];
}

function loadGrants(filePath?: string): Grant[] {
  let raw: string;

  if (filePath) {
    raw = readFileSync(filePath, "utf-8");
  } else {
    // Read from stdin
    const rl = createInterface({ input: process.stdin });
    let buf = "";
    rl.on("line", (line) => { buf += line + "\n"; });
    return new Promise((resolve, reject) => {
      rl.on("close", () => {
        try {
          resolve(parseGrantsJson(buf));
        } catch (e) {
          reject(e);
        }
      });
      rl.on("error", reject);
    }) as unknown as Grant[];
  }

  return parseGrantsJson(raw);
}

function parseGrantsJson(raw: string): Grant[] {
  const parsed = JSON.parse(raw);

  // grants.py wraps in { generated, total, grants: [...] }
  if (parsed.grants && Array.isArray(parsed.grants)) {
    return parsed.grants;
  }

  // Accept raw array too
  if (Array.isArray(parsed)) {
    return parsed;
  }

  throw new Error("Unknown JSON structure — expected { grants: [...] } or an array");
}

async function syncBatch(
  grants: Grant[],
  edgeUrl: string,
  syncSecret: string,
  batchSize = 200,
): Promise<{ inserted: number; skipped: number; errors: string[] }> {
  const total = grants.length;
  let totalInserted = 0;
  let totalSkipped = 0;
  const allErrors: string[] = [];

  console.log(`Syncing ${total} grants to ${edgeUrl} (batch size: ${batchSize})...\n`);

  for (let i = 0; i < total; i += batchSize) {
    const batch = grants.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(total / batchSize);

    process.stdout.write(`Batch ${batchNum}/${totalBatches} (${batch.length} grants)... `);

    try {
      const res = await fetch(edgeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-sync-secret": syncSecret,
        },
        body: JSON.stringify({ grants: batch }),
      });

      const data: SyncResponse & { error?: string } = await res.json();

      if (!res.ok) {
        const msg = data.error || `HTTP ${res.status}`;
        process.stdout.write(`[FAIL] ${msg}\n`);
        allErrors.push(`Batch ${batchNum}: ${msg}`);
        totalSkipped += batch.length;
        continue;
      }

      totalInserted += data.inserted || 0;
      totalSkipped += data.skipped || 0;

      const parts = [];
      if (data.inserted) parts.push(`${data.inserted} inserted`);
      if (data.updated) parts.push(`${data.updated} updated`);
      if (data.skipped) parts.push(`${data.skipped} skipped`);

      process.stdout.write(
        `✓ ${parts.join(", ") || "nothing to do"}` +
        (data.errors?.length ? ` ⚠ ${data.errors.length} errors` : "") +
        "\n",
      );

      if (data.errors?.length) {
        allErrors.push(...data.errors.map((e) => `Batch ${batchNum}: ${e}`));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stdout.write(`[NETWORK ERROR] ${msg}\n`);
      allErrors.push(`Batch ${batchNum}: ${msg}`);
      totalSkipped += batch.length;
    }
  }

  console.log(`\n─── Result ───`);
  console.log(`  Inserted: ${totalInserted}`);
  console.log(`  Skipped:  ${totalSkipped}`);
  console.log(`  Total:    ${total}`);
  console.log(`  Errors:   ${allErrors.length}`);

  if (allErrors.length > 0) {
    console.log(`\nFirst ${Math.min(allErrors.length, 10)} errors:`);
    for (const e of allErrors.slice(0, 10)) {
      console.log(`  • ${e}`);
    }
  }

  return { inserted: totalInserted, skipped: totalSkipped, errors: allErrors };
}

async function main() {
  const filePath = process.argv[2];

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NUXT_PUBLIC_SUPABASE_KEY;
  const syncSecret = process.env.SUPABASE_SYNC_SECRET || supabaseKey || "";

  if (!supabaseUrl) {
    console.error("ERROR: SUPABASE_URL environment variable is required");
    console.error("Set SUPABASE_URL or NUXT_PUBLIC_SUPABASE_URL");
    process.exit(1);
  }

  const edgeUrl = process.env.SUPABASE_EDGE_FUNCTION_URL ||
    `${supabaseUrl.replace(/\/$/, "")}/functions/v1/grants-catalog-sync`;

  if (!syncSecret) {
    console.error("ERROR: SUPABASE_SYNC_SECRET environment variable is required");
    process.exit(1);
  }

  try {
    const grants = loadGrants(filePath);

    if (grants.length === 0) {
      console.log("No grants to sync.");
      return;
    }

    console.log(`Loaded ${grants.length} grants from ${filePath || "stdin"}`);

    const result = await syncBatch(grants, edgeUrl, syncSecret);

    if (result.errors.length > 0) {
      process.exit(2);
    }
  } catch (err) {
    console.error("Fatal error:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
