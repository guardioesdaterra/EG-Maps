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
  status: string;        // open/closed/unknown (grant's temporal state)
  grant_status?: string; // alias for status
  is_standing?: boolean;
  grant_type?: string;
  grant_types?: string[];
  highlights?: string[];
  urgency?: string;
  deadline_days?: number | null;
  amount_usd?: number | null;
  priority_score?: number;
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

function recordHash(r: Record<string, unknown>): string {
  const parts = [
    r.title,
    r.funder,
    r.url,
    r.description,
    r.deadline,
    r.amount_max,
    r.amount_min,
    r.currency,
    r.country,
    r.region,
    r.categories,
  ];
  return parts.join("||");
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
      console.warn("No grants to sync.");
      return;
    }

    console.warn(`Loaded ${grants.length} grants from ${filePath || "stdin"}`);

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
        currency: g.currency || null,
        country: g.country || "GLOBAL",
        region: g.region || null,
        categories: Array.isArray(g.categories) ? g.categories.filter(Boolean) : [],
        language: g.language || "en",
        relevance: typeof g.relevance === "number" ? Math.max(0, Math.min(100, g.relevance)) : 0,
        status: "pending",                         // moderation pipeline: pending/approved/rejected
        fetched_at: g.fetched_at || new Date().toISOString(),
      }));

      const ids = records.map((r) => r.id);
      const { data: existing } = await supabase
        .from("scraped_grants")
        .select("id, title, funder, url, description, deadline, amount_max, amount_min, currency, country, region, categories")
        .in("id", ids);

      const existingMap = new Map<string, Record<string, unknown>>();
      for (const e of existing ?? []) {
        existingMap.set(e.id, e);
      }

      const toUpsert: typeof records = [];
      let batchInserted = 0;
      let batchUpdated = 0;
      let batchSkipped = 0;

      for (const r of records) {
        const ex = existingMap.get(r.id);
        if (!ex) {
          toUpsert.push(r);
          batchInserted++;
          continue;
        }

        const exHash = recordHash(ex);
        const newHash = recordHash(r);
        if (exHash === newHash) {
          batchSkipped++;
          continue;
        }

        toUpsert.push(r);
        batchUpdated++;
      }

      if (toUpsert.length > 0) {
        const { error } = await supabase
          .from("scraped_grants")
          .upsert(toUpsert as never, { onConflict: "id", ignoreDuplicates: false });

        if (error) {
          process.stdout.write(`[FAIL] ${error.message}\n`);
          allErrors.push(`Batch ${batchNum}: ${error.message}`);
          batchSkipped += toUpsert.length;
          batchInserted = 0;
          batchUpdated = 0;
        }
      }

      totalInserted += batchInserted;
      totalUpdated += batchUpdated;
      totalSkipped += batchSkipped;
      process.stdout.write(`✓ ${batchInserted} inserted, ${batchUpdated} updated, ${batchSkipped} skipped\n`);
    }

    console.warn(`\n─── Result ───`);
    console.warn(`  Inserted: ${totalInserted}`);
    console.warn(`  Updated:  ${totalUpdated}`);
    console.warn(`  Skipped:  ${totalSkipped}`);
    console.warn(`  Total:    ${grants.length}`);
    console.warn(`  Errors:   ${allErrors.length}`);

    if (allErrors.length > 0) {
      for (const e of allErrors.slice(0, 10)) {
        console.warn(`  • ${e}`);
      }
      process.exit(2);
    }
  } catch (err) {
    console.error("Fatal error:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
