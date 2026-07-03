#!/usr/bin/env -S npx tsx

import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { createClient } from "@supabase/supabase-js";

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

function loadGrants(filePath?: string): Grant[] {
  let raw: string;

  if (filePath) {
    raw = readFileSync(filePath, "utf-8");
  } else {
    const rl = createInterface({ input: process.stdin });
    let buf = "";
    rl.on("line", (line) => { buf += line + "\n"; });
    return new Promise((resolve, reject) => {
      rl.on("close", () => {
        try { resolve(parseGrantsJson(buf)); } catch (e) { reject(e); }
      });
      rl.on("error", reject);
    }) as unknown as Grant[];
  }

  return parseGrantsJson(raw);
}

function parseGrantsJson(raw: string): Grant[] {
  const parsed = JSON.parse(raw);
  if (parsed.grants && Array.isArray(parsed.grants)) return parsed.grants;
  if (Array.isArray(parsed)) return parsed;
  throw new Error("Unknown JSON structure — expected { grants: [...] } or an array");
}

function toUUID(shortId: string): string {
  if (shortId.length === 12) return `00000000-0000-0000-0000-${shortId}`;
  return shortId;
}

async function main() {
  const filePath = process.argv[2];

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    console.error("ERROR: SUPABASE_URL environment variable is required");
    process.exit(1);
  }
  if (!serviceRoleKey) {
    console.error("ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is required");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    const grants = loadGrants(filePath);
    if (grants.length === 0) {
      console.log("No grants to sync.");
      return;
    }

    console.log(`Loaded ${grants.length} grants from ${filePath || "stdin"}`);

    const BATCH_SIZE = 200;
    let totalInserted = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    const allErrors: string[] = [];

    for (let i = 0; i < grants.length; i += BATCH_SIZE) {
      const batch = grants.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(grants.length / BATCH_SIZE);

      process.stdout.write(`Batch ${batchNum}/${totalBatches} (${batch.length} grants)... `);

      const records = batch.map((g) => ({
        id: toUUID(g.id),
        title: g.title || "Untitled Grant",
        funder: g.funder || "",
        source: g.source || "",
        source_id: g.id || "",
        url: g.url || "",
        description: (g.description || "").slice(0, 5000),
        deadline: g.deadline || "",
        amount_max: String(g.amount_max ?? ""),
        amount_min: String(g.amount_min ?? ""),
        currency: g.currency || "USD",
        country: g.country || "GLOBAL",
        region: g.region || "",
        categories: Array.isArray(g.categories) ? g.categories.filter(Boolean) : [],
        language: g.language || "en",
        relevance: typeof g.relevance === "number" ? Math.max(0, Math.min(100, g.relevance)) : 0,
        status: "pending",
        fetched_at: g.fetched_at || new Date().toISOString(),
      }));

      const { data: existing } = await supabase
        .from("scraped_grants")
        .select("id")
        .in("id", records.map((r) => r.id));
      const existingIds = new Set((existing || []).map((r: { id: string }) => r.id));

      const { error } = await supabase
        .from("scraped_grants")
        .upsert(records as never, { onConflict: "id", ignoreDuplicates: false });

      if (error) {
        process.stdout.write(`[FAIL] ${error.message}\n`);
        allErrors.push(`Batch ${batchNum}: ${error.message}`);
        totalSkipped += batch.length;
      } else {
        let insertCount = 0;
        let updateCount = 0;
        for (const r of records) {
          if (existingIds.has(r.id)) updateCount++;
          else insertCount++;
        }
        totalInserted += insertCount;
        totalUpdated += updateCount;
        process.stdout.write(`✓ ${insertCount} inserted, ${updateCount} updated\n`);
      }
    }

    console.log(`\n─── Result ───`);
    console.log(`  Inserted: ${totalInserted}`);
    console.log(`  Updated:  ${totalUpdated}`);
    console.log(`  Skipped:  ${totalSkipped}`);
    console.log(`  Total:    ${grants.length}`);
    console.log(`  Errors:   ${allErrors.length}`);

    if (allErrors.length > 0) {
      for (const e of allErrors.slice(0, 10)) {
        console.log(`  • ${e}`);
      }
      process.exit(2);
    }
  } catch (err) {
    console.error("Fatal error:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
