#!/usr/bin/env -S npx tsx

import { readFileSync, readdirSync } from "node:fs";
import { createInterface } from "node:readline";
import { createClient } from "@supabase/supabase-js";

// ── Types ────────────────────────────────────────────────────
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
  grant_status?: string;
  is_standing?: boolean;
  grant_type?: string;
  grant_types?: string[];
  highlights?: string[];
  urgency?: string;
  deadline_days?: number | null;
  amount_usd?: number | null;
  priority_score?: number;
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

interface VulcanRow {
  id: string;
  type: string;
  name: string;
  source: string;
  external_id: string;
  latitude: number;
  longitude: number;
  single_url: string;
  status: string;
  synced_at: string;
}

// ── Grants helpers ───────────────────────────────────────────
function loadGrants(filePath: string): Grant[] {
  const raw = readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw);
  if (parsed.grants && Array.isArray(parsed.grants)) return parsed.grants;
  if (Array.isArray(parsed)) return parsed;
  throw new Error("Unknown JSON structure — expected { grants: [...] } or an array");
}

function toUUID(shortId: string): string {
  if (shortId.length === 12) return `00000000-0000-0000-0000-${shortId}`;
  return shortId;
}

function grantHash(r: Record<string, unknown>): string {
  return [r.title, r.funder, r.url, r.description, r.deadline, r.amount_max, r.amount_min, r.currency, r.country, r.region, r.categories].join("||");
}

// ── Cultural agents helpers ──────────────────────────────────
function loadAgents(filePath: string): CulturalAgent[] {
  const raw = readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw);
  if (parsed.agents && Array.isArray(parsed.agents)) return parsed.agents;
  if (Array.isArray(parsed)) return parsed;
  throw new Error("Unknown JSON structure — expected { agents: [...] } or an array");
}

function mapSource(source: string): string {
  if (source === "mapa_cultura") return "minc";
  if (source === "floresta_ativista") return "midia_ninja";
  return source;
}

function agentHash(r: Record<string, unknown>): string {
  return [r.name, r.source, r.latitude, r.longitude].join("||");
}

function toVulcanRow(agent: CulturalAgent): VulcanRow {
  const src = mapSource(agent.source);
  return {
    id: `${src}-${agent.external_id}`,
    type: "cultural_agent",
    name: (agent.name || "Unknown").trim(),
    source: src,
    external_id: agent.external_id || "",
    latitude: typeof agent.lat === "number" ? agent.lat : 0,
    longitude: typeof agent.lng === "number" ? agent.lng : 0,
    single_url: agent.single_url || "",
    status: "active",
    synced_at: new Date().toISOString(),
  };
}

// ── Batch upsert core ────────────────────────────────────────
async function batchUpsert(
  supabase: any,
  table: string,
  records: Record<string, unknown>[],
  hashFields: string[],
  selectCols: string,
) {
  const BATCH_SIZE = 200;
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  const hashFn = (r: Record<string, unknown>) => hashFields.map((f) => r[f]).join("||");

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(records.length / BATCH_SIZE);

    process.stdout.write(`Batch ${batchNum}/${totalBatches} (${batch.length})... `);

    const ids = batch.map((r) => r.id as string);
    const { data: existing }: { data: any[] } = await supabase.from(table).select(selectCols).in("id", ids);

    const existMap = new Map<string, Record<string, unknown>>();
    for (const e of existing ?? []) existMap.set(e.id as string, e);

    const toUpsert: Record<string, unknown>[] = [];
    let bIns = 0, bUpd = 0, bSki = 0;

    for (const r of batch) {
      const ex = existMap.get(r.id as string);
      if (!ex) { toUpsert.push(r); bIns++; continue; }
      if (hashFn(ex) === hashFn(r)) { bSki++; continue; }
      toUpsert.push(r); bUpd++;
    }

    if (toUpsert.length > 0) {
      const { error } = await supabase.from(table).upsert(toUpsert as never, { onConflict: "id", ignoreDuplicates: false });
      if (error) {
        process.stdout.write(`[FAIL] ${error.message}\n`);
        errors.push(`Batch ${batchNum}: ${error.message}`);
        bSki += toUpsert.length; bIns = 0; bUpd = 0;
      }
    }

    inserted += bIns;
    updated += bUpd;
    skipped += bSki;
    process.stdout.write(`✓ ${bIns} inserted, ${bUpd} updated, ${bSki} skipped\n`);
  }

  return { inserted, updated, skipped, errors };
}

// ── Sync grants ──────────────────────────────────────────────
async function syncGrants(supabase: any, filePath: string) {
  const grants = loadGrants(filePath);
  if (grants.length === 0) { console.warn("No grants to sync."); return; }

  console.warn(`Loaded ${grants.length} grants from ${filePath}`);

  const records = grants.map((g) => ({
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
    currency: g.currency || "",
    country: g.country || "GLOBAL",
    region: g.region || null,
    categories: Array.isArray(g.categories) ? g.categories.filter(Boolean) : [],
    language: g.language || "en",
    relevance: typeof g.relevance === "number" ? Math.max(0, Math.min(100, g.relevance)) : 0,
    status: "pending",
    fetched_at: g.fetched_at || new Date().toISOString(),
  }));

  const { inserted, updated, skipped, errors } = await batchUpsert(
    supabase, "scraped_grants", records,
    ["title", "funder", "url", "description", "deadline", "amount_max", "amount_min", "currency", "country", "region", "categories"],
    "id, title, funder, url, description, deadline, amount_max, amount_min, currency, country, region, categories",
  );

  printResult("Grants", inserted, updated, skipped, grants.length, errors);
  if (errors.length > 0) process.exit(2);
}

// ── Sync cultural agents ─────────────────────────────────────
async function syncAgents(supabase: any, filePath: string) {
  const agents = loadAgents(filePath);
  if (agents.length === 0) { console.warn("No cultural agents to sync."); return; }

  console.warn(`Loaded ${agents.length} cultural agents from ${filePath}`);

  const records = agents.map(toVulcanRow).map((r) => r as unknown as Record<string, unknown>);

  const { inserted, updated, skipped, errors } = await batchUpsert(
    supabase, "vulcan_observatory", records,
    ["name", "source", "latitude", "longitude"],
    "id, name, source, latitude, longitude",
  );

  printResult("Cultural agents", inserted, updated, skipped, agents.length, errors);
  if (errors.length > 0) process.exit(2);
}

// ── Shared ───────────────────────────────────────────────────
function printResult(label: string, inserted: number, updated: number, skipped: number, total: number, errors: string[]) {
  console.warn(`\n─── ${label} Result ───`);
  console.warn(`  Inserted: ${inserted}`);
  console.warn(`  Updated:  ${updated}`);
  console.warn(`  Skipped:  ${skipped}`);
  console.warn(`  Total:    ${total}`);
  console.warn(`  Errors:   ${errors.length}`);
  for (const e of errors.slice(0, 10)) console.warn(`  • ${e}`);
}

function findLatest(pattern: string): string | null {
  const outputDir = new URL("./output", import.meta.url).pathname;
  try {
    const files = readdirSync(outputDir).filter((f: string) => f.startsWith(pattern) && f.endsWith(".json")).sort().reverse();
    return files.length > 0 ? `${outputDir}/${files[0]}` : null;
  } catch { return null; }
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  const mode = process.argv[2]; // "grants" or "agents"
  const filePath = process.argv[3];

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) { console.error("ERROR: SUPABASE_URL required"); process.exit(1); }
  if (!serviceRoleKey) { console.error("ERROR: SUPABASE_SERVICE_ROLE_KEY required"); process.exit(1); }
  if (!mode || (mode !== "grants" && mode !== "agents")) {
    console.error("Usage: sync-grants-to-supabase.ts <grants|agents> [file]");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  try {
    if (mode === "grants") {
      const path = filePath || findLatest("grants_export_");
      if (!path) { console.error("No grants export file found"); process.exit(1); }
      await syncGrants(supabase, path);
    } else {
      const path = filePath || findLatest("cultural_agents_export_");
      if (!path) { console.error("No cultural agents export file found"); process.exit(1); }
      await syncAgents(supabase, path);
    }
  } catch (err) {
    console.error("Fatal error:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
