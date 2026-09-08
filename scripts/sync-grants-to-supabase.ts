#!/usr/bin/env -S npx tsx
/**
 * scripts/sync-grants-to-supabase.ts
 * @why CLI sync tool — reads grant/agent JSON exports, upserts to Supabase with hash-based change detection
 * @deps node:fs (readFileSync, readdirSync); @supabase/supabase-js (createClient, type SupabaseClient)
 */

import { readFileSync, readdirSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type SupabaseDB = Record<string, never>;
type SupabaseTable = { id: string } & Record<string, unknown>;
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

function loadGrants(filePath: string): Grant[] {
  const raw = readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw);
  if (parsed.grants && Array.isArray(parsed.grants)) return parsed.grants;
  if (Array.isArray(parsed)) return parsed;
  throw new Error("Unknown JSON structure — expected { grants: [...] } or an array");
}

/**
 * Generate a deterministic UUID v5 from a namespace + name.
 * Uses crypto.subtle for cross-platform support.
 */
const UUID_V5_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // RFC 4122 DNS namespace
async function toUUID(name: string): Promise<string> {
  const encoder = new TextEncoder();
  const nameBytes = encoder.encode(name);
  const namespaceBytes = Uint8Array.from(
    UUID_V5_NAMESPACE.replace(/-/g, '').match(/.{2}/g)!.map(h => parseInt(h, 16))
  );
  // Concatenate namespace + name for SHA-1 hashing
  const data = new Uint8Array(namespaceBytes.length + nameBytes.length);
  data.set(namespaceBytes);
  data.set(nameBytes, namespaceBytes.length);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hash = new Uint8Array(hashBuffer);
  // Set version 5 and variant bits per RFC 4122
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = Array.from(hash.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;
}

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

async function existingColumns(
  supabase: SupabaseClient<SupabaseDB>,
  table: string,
  wanted: Set<string>,
): Promise<Set<string>> {
  // Single-query approach: try selecting all wanted columns at once.
  // If it succeeds, all exist. If it fails, probe individually (rare fallback).
  const cols = [...wanted];
  const { error } = await supabase.from(table).select(cols.join(",")).limit(1);
  if (!error) {
    return new Set<string>(["id", ...cols]);
  }
  // Fallback: individual probes (only on schema mismatch)
  const results = await Promise.all(
    cols.map(async (col) => {
      const { error: e } = await supabase.from(table).select(col).limit(0);
      return { col, exists: !e || !/(column|does not exist)/i.test(e.message) };
    }),
  );
  const existing = new Set<string>(["id"]);
  for (const r of results) {
    if (r.exists) existing.add(r.col);
  }
  return existing;
}

async function batchUpsert(
  supabase: SupabaseClient<SupabaseDB>,
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

  const hashFn = (r: Record<string, unknown>) => JSON.stringify(hashFields.map((f) => r[f] ?? ''));

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(records.length / BATCH_SIZE);

    process.stdout.write(`Batch ${batchNum}/${totalBatches} (${batch.length})... `);

    const ids = batch.map((r) => r.id as string);
    const { data: existing }: { data: SupabaseTable[] | null } = await supabase.from(table).select(selectCols).in("id", ids);

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

async function syncGrants(supabase: SupabaseClient<SupabaseDB>, filePath: string) {
  const grants = loadGrants(filePath);
  if (grants.length === 0) { console.warn("No grants to sync."); return; }

  console.warn(`Loaded ${grants.length} grants from ${filePath}`);

  const allWanted = new Set([
    "id", "title", "funder", "source", "source_id", "url", "description",
    "deadline", "amount_max", "amount_min", "currency", "country", "region",
    "categories", "language", "relevance", "status", "grant_status",
    "fetched_at", "grant_type", "grant_types", "highlights", "urgency",
    "deadline_days", "amount_usd", "priority_score", "is_standing",
  ]);
  const cols = await existingColumns(supabase, "scraped_grants", allWanted);

  const records: Record<string, unknown>[] = [];
  for (const g of grants) {
    const r: Record<string, unknown> = {};
    if (cols.has("id"))                r.id = await toUUID(g.id);
    if (cols.has("title"))             r.title = g.title || "Untitled Grant";
    if (cols.has("funder"))            r.funder = g.funder || "";
    if (cols.has("source"))            r.source = g.source || "";
    if (cols.has("source_id"))         r.source_id = g.id || "";
    if (cols.has("url"))               r.url = g.url || "";
    if (cols.has("description"))       r.description = (g.description || "").slice(0, 5000);
    if (cols.has("deadline"))          r.deadline = g.deadline || "";
    if (cols.has("amount_max"))        r.amount_max = String(g.amount_max ?? "");
    if (cols.has("amount_min"))        r.amount_min = String(g.amount_min ?? "");
    if (cols.has("currency"))          r.currency = g.currency || "";
    if (cols.has("country"))           r.country = g.country || "GLOBAL";
    if (cols.has("region"))            r.region = g.region || null;
    if (cols.has("categories"))        r.categories = Array.isArray(g.categories) ? g.categories.filter(Boolean) : [];
    if (cols.has("language"))          r.language = g.language || "en";
    if (cols.has("relevance"))         r.relevance = typeof g.relevance === "number" ? Math.max(0, Math.min(100, g.relevance)) : 0;
    if (cols.has("status"))            r.status = ["open", "closed", "unknown", "pending"].includes(g.status) ? g.status : "unknown";
    if (cols.has("grant_status"))      r.grant_status = g.status || "unknown";
    if (cols.has("fetched_at"))        r.fetched_at = g.fetched_at || new Date().toISOString();
    if (cols.has("grant_type"))        r.grant_type = g.grant_type || "general";
    if (cols.has("grant_types"))       r.grant_types = Array.isArray(g.grant_types) ? g.grant_types : [];
    if (cols.has("highlights"))        r.highlights = Array.isArray(g.highlights) ? g.highlights : [];
    if (cols.has("urgency"))           r.urgency = g.urgency || "unknown";
    if (cols.has("deadline_days"))     r.deadline_days = g.deadline_days ?? null;
    if (cols.has("amount_usd"))        r.amount_usd = g.amount_usd ?? null;
    if (cols.has("priority_score"))    r.priority_score = typeof g.priority_score === "number" ? g.priority_score : 0;
    if (cols.has("is_standing"))       r.is_standing = Boolean(g.is_standing);
    records.push(r);
  }

  // Fields used for change detection — excludes fetched_at (changes every run)
  // and is_standing (always false after filtering, wastes hash space)
  const hashFields = ["title", "funder", "source", "url", "description", "deadline", "amount_max", "amount_min", "currency", "country", "region", "categories", "language", "relevance", "status", "grant_status", "grant_type", "grant_types", "highlights", "urgency", "deadline_days", "amount_usd", "priority_score"];
  const selectCols = "id, " + hashFields.join(", ") + ", is_standing";

  const { inserted, updated, skipped, errors } = await batchUpsert(
    supabase, "scraped_grants", records,
    hashFields,
    selectCols,
  );

  printResult("Grants", inserted, updated, skipped, grants.length, errors);
  if (errors.length > 0) process.exit(2);
}

async function syncAgents(supabase: SupabaseClient<SupabaseDB>, filePath: string) {
  const agents = loadAgents(filePath);
  if (agents.length === 0) { console.warn("No cultural agents to sync."); return; }

  console.warn(`Loaded ${agents.length} cultural agents from ${filePath}`);

  const records = agents.map(toVulcanRow).map((r) => r as unknown as Record<string, unknown>);

  const { inserted, updated, skipped, errors } = await batchUpsert(
    supabase, "vulcan_observatory", records,
    ["name", "source", "external_id", "latitude", "longitude", "single_url", "status", "synced_at"],
    "id, type, name, source, external_id, latitude, longitude, single_url, status, synced_at",
  );

  printResult("Cultural agents", inserted, updated, skipped, agents.length, errors);
  if (errors.length > 0) process.exit(2);
}

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

async function main() {
  const mode = process.argv[2];
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
