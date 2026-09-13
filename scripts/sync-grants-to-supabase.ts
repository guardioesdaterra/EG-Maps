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
  // v2 quality / URL-health fields (emitted by grants.py, read by migration)
  content_hash?: string;
  quality_score?: number;
  url_status?: string;
  url_status_code?: number | null;
  url_checked_at?: string;
}

// ── v2 quality gate ──────────────────────────────────────────────
// Mirrors scripts/grants.py:is_valid_grant_candidate. Records that fail
// are SKIPPED (counted + reported) instead of polluting scraped_grants.
const NAV_TITLES = new Set([
  "overview", "our work", "about us", "about", "contact", "home", "news",
  "blog", "stories", "read more", "learn more", "see all", "view all",
  "what we do", "who we are", "where we work", "annual report",
]);

function isValidGrantUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const u = url.trim();
  if (!/^https?:\/\//i.test(u) || u.length < 15 || u.includes(" ")) return false;
  try {
    const p = new URL(u);
    if (!p.hostname.includes(".")) return false;
    if ((p.pathname === "" || p.pathname === "/") && !p.search) return false;
    return true;
  } catch { return false; }
}

function grantRejectReason(g: Grant): string | null {
  const title = (g.title || "").trim();
  if (title.length < 15) return "title-too-short";
  if (NAV_TITLES.has(title.toLowerCase())) return "nav-heading";
  if (!isValidGrantUrl(g.url || "")) return "bad-url";
  if ((g.url_status === "broken" || g.url_status === "login_wall") && !g.is_standing)
    return `url-${g.url_status}`;
  const blob = `${g.title} ${g.description} ${g.funder}`.toLowerCase();
  if (/my account|register or sign in|page not found|the page you are looking for|file not found|sign in to continue|access denied/i.test(blob))
    return "login-wall-or-404";
  const hasTerms = /(edital|chamada|open call|call for|request for proposals|\brfp\b|grant|fellowship|bolsa|subvenç|convocat|appel à projets?|bando|prize|award|scholarship|microgrant|seed fund|inscreva-se|candidatura|apply (now|here|today|by))/i.test(blob);
  const hasBoth = Boolean(g.deadline) && Boolean(g.amount_max);
  if (!hasTerms && !hasBoth && !g.is_standing) return "no-grant-terms";
  if (typeof g.relevance === "number" && g.relevance < 5 && !g.is_standing && !hasBoth)
    return "low-relevance";
  return null;
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
  const grantsRaw = loadGrants(filePath);
  if (grantsRaw.length === 0) { console.warn("No grants to sync."); return; }

  console.warn(`Loaded ${grantsRaw.length} grants from ${filePath}`);

  const allWanted = new Set([
    "id", "title", "funder", "source", "source_id", "url", "description",
    "deadline", "amount_max", "amount_min", "currency", "country", "region",
    "categories", "language", "relevance", "status", "grant_status",
    "fetched_at", "grant_type", "grant_types", "highlights", "urgency",
    "deadline_days", "amount_usd", "priority_score", "is_standing",
    // v2 columns (see supabase/migrations/20260914000000_scraped_grants_v2.sql)
    "content_hash", "quality_score", "url_status", "url_status_code",
    "url_checked_at", "last_seen_at", "updated_at", "deadline_date",
    "review_notes", "reviewed_at",
  ]);
  const cols = await existingColumns(supabase, "scraped_grants", allWanted);

  // ── Quality gate: skip junk BEFORE building records ──
  const quarantined: { title: string; reason: string }[] = [];
  const grants = grantsRaw.filter((g) => {
    const reason = grantRejectReason(g);
    if (reason) {
      if (quarantined.length < 50)
        quarantined.push({ title: (g.title || "(untitled)").slice(0, 80), reason });
      return false;
    }
    return true;
  });
  console.warn(`Quality gate: ${grantsRaw.length - grants.length} quarantined, ${grants.length} accepted`);
  for (const q of quarantined.slice(0, 20))
    console.warn(`  ⛔ [${q.reason}] ${q.title}`);

  const records: Record<string, unknown>[] = [];
  const nowIso = new Date().toISOString();
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
    if (cols.has("status")) {
      // Live DB check: status IN (pending, open, closed, hidden).
      // "pending" = fresh scrape awaiting manager review — preserve it.
      const s = (g.status || "").toLowerCase();
      r.status = ["open", "closed", "hidden", "pending"].includes(s) ? s : "pending";
    }
    if (cols.has("grant_status")) {
      // Temporal alias: open/closed/unknown only (pending/hidden → unknown)
      const s = String(g.grant_status ?? g.status ?? "").toLowerCase();
      r.grant_status = s === "open" || s === "closed" ? s : "unknown";
    }
    if (cols.has("fetched_at"))        r.fetched_at = g.fetched_at || new Date().toISOString();
    if (cols.has("grant_type"))        r.grant_type = g.grant_type || "general";
    if (cols.has("grant_types"))       r.grant_types = Array.isArray(g.grant_types) ? g.grant_types : [];
    if (cols.has("highlights"))        r.highlights = Array.isArray(g.highlights) ? g.highlights : [];
    if (cols.has("urgency"))           r.urgency = g.urgency || "unknown";
    if (cols.has("deadline_days"))     r.deadline_days = g.deadline_days ?? null;
    if (cols.has("amount_usd"))        r.amount_usd = g.amount_usd ?? null;
    if (cols.has("priority_score"))    r.priority_score = typeof g.priority_score === "number" ? g.priority_score : 0;
    if (cols.has("is_standing"))       r.is_standing = Boolean(g.is_standing);
    // ── v2 quality / URL-health columns ──
    if (cols.has("content_hash"))      r.content_hash = g.content_hash || null;
    if (cols.has("quality_score"))     r.quality_score = typeof g.quality_score === "number" ? Math.max(0, Math.min(100, g.quality_score)) : 0;
    if (cols.has("url_status"))        r.url_status = ["ok", "broken", "login_wall", "timeout", "blocked"].includes(g.url_status || "") ? g.url_status! : "unchecked";
    if (cols.has("url_status_code"))   r.url_status_code = typeof g.url_status_code === "number" ? g.url_status_code : null;
    if (cols.has("url_checked_at"))    r.url_checked_at = g.url_checked_at || null;
    if (cols.has("last_seen_at"))      r.last_seen_at = nowIso;
    if (cols.has("deadline_date")) {
      const m = /^(\d{4}-\d{2}-\d{2})/.exec(g.deadline || "");
      r.deadline_date = m ? m[1] : null;
    }
    records.push(r);
  }

  // Fields used for change detection — excludes fetched_at/last_seen_at
  // (change every run) and is_standing (static after filtering)
  const hashFields = ["title", "funder", "source", "url", "description", "deadline", "amount_max", "amount_min", "currency", "country", "region", "categories", "language", "relevance", "status", "grant_status", "grant_type", "grant_types", "highlights", "urgency", "deadline_days", "amount_usd", "priority_score", "quality_score", "url_status"];
  const selectCols = "id, " + hashFields.join(", ") + ", is_standing";

  const { inserted, updated, skipped, errors } = await batchUpsert(
    supabase, "scraped_grants", records,
    hashFields,
    selectCols,
  );

  printResult("Grants", inserted, updated, skipped, grantsRaw.length, errors);
  if (quarantined.length > 0)
    console.warn(`  Quarantined (quality gate): ${grantsRaw.length - grants.length}`);
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
