#!/usr/bin/env -S npx tsx

import { readFileSync, readdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

interface CulturalAgentExport {
  synced_at: string;
  total_agents: number;
  mapa_cultura_count: number;
  floresta_ativista_count: number;
  agents: CulturalAgent[];
}

interface CulturalAgent {
  id: string;
  name: string;
  type_name: string;
  lat: number;
  lng: number;
  single_url: string;
  source: string;
  external_id: string;
}

interface CulturalAgentRow {
  id: string;
  name: string;
  agent_type: string;
  source: string;
  external_id: string;
  latitude: number;
  longitude: number;
  single_url: string;
  status: string;
  synced_at: string;
}

function loadAgents(filePath: string): CulturalAgent[] {
  const raw = readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw);

  if (parsed.agents && Array.isArray(parsed.agents)) {
    return parsed.agents;
  }
  if (Array.isArray(parsed)) {
    return parsed;
  }
  throw new Error(
    'Unknown JSON structure — expected { agents: [...] } or an array',
  );
}

function findLatestExport(): string | null {
  const outputDir = new URL(".", import.meta.url).pathname + "/output";
  try {
    const files = readdirSync(outputDir)
      .filter((f) => f.startsWith("cultural_agents_export_") && f.endsWith(".json"))
      .sort()
      .reverse();
    return files.length > 0 ? `${outputDir}/${files[0]}` : null;
  } catch {
    return null;
  }
}

function recordHash(r: Record<string, unknown>): string {
  return [r.name, r.source, r.latitude, r.longitude].join("||");
}

function toRow(agent: CulturalAgent): CulturalAgentRow {
  return {
    id: agent.id,
    name: (agent.name || "Unknown").trim(),
    agent_type: agent.type_name || "unknown",
    source: agent.source,
    external_id: agent.external_id || "",
    latitude: typeof agent.lat === "number" ? agent.lat : 0,
    longitude: typeof agent.lng === "number" ? agent.lng : 0,
    single_url: agent.single_url || "",
    status: "active",
    synced_at: new Date().toISOString(),
  };
}

async function main() {
  const filePath = process.argv[2] || findLatestExport();

  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    console.error("ERROR: SUPABASE_URL environment variable is required");
    process.exit(1);
  }
  if (!serviceRoleKey) {
    console.error(
      "ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is required",
    );
    process.exit(1);
  }
  if (!filePath) {
    console.error(
      "ERROR: No cultural agents export file found. Provide a path or run sync-cultural-agents.py first.",
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    const agents = loadAgents(filePath);
    if (agents.length === 0) {
      console.warn("No cultural agents to sync.");
      return;
    }

    console.warn(
      `Loaded ${agents.length} cultural agents from ${filePath}`,
    );

    const BATCH_SIZE = 200;
    let totalInserted = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    const allErrors: string[] = [];

    for (let i = 0; i < agents.length; i += BATCH_SIZE) {
      const batch = agents.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(agents.length / BATCH_SIZE);

      process.stdout.write(
        `Batch ${batchNum}/${totalBatches} (${batch.length} agents)... `,
      );

      const records = batch.map(toRow);

      const ids = records.map((r) => r.id);
      const { data: existing } = await supabase
        .from("cultural_agents")
        .select("id, name, source, latitude, longitude")
        .in("id", ids);

      const existingMap = new Map<string, Record<string, unknown>>();
      for (const e of existing ?? []) {
        existingMap.set(e.id as string, e);
      }

      const toUpsert: CulturalAgentRow[] = [];
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
          .from("cultural_agents")
          .upsert(toUpsert, {
            onConflict: "id",
            ignoreDuplicates: false,
          });

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
      process.stdout.write(
        `✓ ${batchInserted} inserted, ${batchUpdated} updated, ${batchSkipped} skipped\n`,
      );
    }

    console.warn(`\n─── Result ───`);
    console.warn(`  Inserted: ${totalInserted}`);
    console.warn(`  Updated:  ${totalUpdated}`);
    console.warn(`  Skipped:  ${totalSkipped}`);
    console.warn(`  Total:    ${agents.length}`);
    console.warn(`  Errors:   ${allErrors.length}`);

    if (allErrors.length > 0) {
      for (const e of allErrors.slice(0, 10)) {
        console.warn(`  • ${e}`);
      }
      process.exit(2);
    }
  } catch (err) {
    console.error(
      "Fatal error:",
      err instanceof Error ? err.message : String(err),
    );
    process.exit(1);
  }
}

main();
