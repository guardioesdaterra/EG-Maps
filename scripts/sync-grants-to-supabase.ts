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
  // v2.1: job postings are never grants (fellowships/scholarships exempt).
  // Mirrors scripts/grants.py:is_likely_job.
  if (!/(fellowship|scholarship|bolsa|bourse|beca|stipendium|\bgrant\b)/i.test(title) &&
      /(hiring|now hiring|career opportunit|job opportunit|remote jobs?|vacanc|open position|we are hiring|we're hiring|trabalhe conosco|is hiring an?)(\b| )/i.test(title + " "))
    return "job-posting";
  if (/call for papers|call for abstracts|submit your abstract/i.test(title) && !g.is_standing)
    return "call-for-papers";
  const blob = `${g.title} ${g.description} ${g.funder}`.toLowerCase();
  if (/my account|register or sign in|page not found|the page you are looking for|file not found|sign in to continue|access denied/i.test(blob))
    return "login-wall-or-404";
  const hasTerms = /(edital|chamada|open call|call for|request for proposals|\brfp\b|grant|fellowship|bolsa|subvenç|convocat|appel à projets?|bando|prize|award|scholarship|microgrant|seed fund|inscreva-se|candidatura|apply (now|here|today|by))/i.test(blob);
  const hasBoth = Boolean(g.deadline) && Boolean(g.amount_max);
  if (!hasTerms && !hasBoth && !g.is_standing) return "no-grant-terms";
  if (typeof g.relevance === "number" && g.relevance < 5 && !g.is_standing && !hasBoth)
    return "low-relevance";
  // v2.4 temporal gate (defense in depth — grants.py already excludes these,
  // but stale/hand-made exports must never be INSERTED): closed calls and
  // deadlines already gone as of right now are skipped. Rolling/dateless
  // grants (unknown, including legacy "pending" values) PASS the gate —
  // absence of a date is not evidence of closure — and the record builder
  // below normalizes them to status=open. Standing entries are curated refs.
  if (!g.is_standing) {
    const temporal = String(g.grant_status ?? g.status ?? "").toLowerCase().trim();
    if (temporal === "closed") return "closed";
    if ((g.urgency || "").toLowerCase() === "expired") return "deadline-passed";
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(g.deadline || "");
    if (m) {
      const today = new Date().toISOString().slice(0, 10);
      if (`${m[1]}-${m[2]}-${m[3]}` < today) return "deadline-passed";
    }
  }
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
  // v2.2: conflict-target config. Grants use the natural key
  // (source_id, source) — legacy rows carry pre-UUID ids, so id-based
  // matching misses them and the whole batch dies on idx_scraped_source.
  // Matching on the UNIQUE index heals legacy rows in place (ids stable).
  keyOf: (r: Record<string, unknown>) => string = (r) => String(r.id ?? ""),
  fetchExisting?: (batch: Record<string, unknown>[]) => Promise<Record<string, unknown>[]>,
  onConflict = "id",
) {
  const BATCH_SIZE = 200;
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  const hashFn = (r: Record<string, unknown>) => JSON.stringify(hashFields.map((f) => r[f] ?? ''));

  const defaultFetch = async (batch: Record<string, unknown>[]) => {
    const ids = batch.map((r) => (r as Record<string, unknown>).id as string);
    const { data }: { data: SupabaseTable[] | null } = await supabase.from(table).select(selectCols).in("id", ids);
    return (data ?? []) as unknown as Record<string, unknown>[];
  };

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(records.length / BATCH_SIZE);

    process.stdout.write(`Batch ${batchNum}/${totalBatches} (${batch.length})... `);

    const existing = await (fetchExisting ?? defaultFetch)(batch as Record<string, unknown>[]);

    const existMap = new Map<string, Record<string, unknown>>();
    for (const e of existing ?? []) existMap.set(keyOf(e), e);

    const toUpsert: Record<string, unknown>[] = [];
    let bIns = 0, bUpd = 0, bSki = 0;

    for (const r of batch) {
      const ex = existMap.get(keyOf(r));
      if (!ex) { toUpsert.push(r); bIns++; continue; }
      if (hashFn(ex) === hashFn(r)) { bSki++; continue; }
      toUpsert.push(r); bUpd++;
    }

    if (toUpsert.length > 0) {
      const { error } = await supabase.from(table).upsert(toUpsert as never, { onConflict, ignoreDuplicates: false });
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
  const reasonCounts = new Map<string, number>();
  const grants = grantsRaw.filter((g) => {
    const reason = grantRejectReason(g);
    if (reason) {
      reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
      if (quarantined.length < 50)
        quarantined.push({ title: (g.title || "(untitled)").slice(0, 80), reason });
      return false;
    }
    return true;
  });
  console.warn(`Quality gate: ${grantsRaw.length - grants.length} quarantined, ${grants.length} accepted`);
  if (reasonCounts.size > 0)
    console.warn(`  Reasons: ${[...reasonCounts.entries()].map(([r, n]) => `${r}=${n}`).join(", ")}`);
  for (const q of quarantined.slice(0, 20))
    console.warn(`  ⛔ [${q.reason}] ${q.title}`);

  const records: Record<string, unknown>[] = [];
  const nowIso = new Date().toISOString();
  for (const g of grants) {
    const r: Record<string, unknown> = {};
    // NOTE: no r.id — inserts use the DB gen_random_uuid() default and
    // matching runs on the (source_id, source) natural key (see below).
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
      // Temporal state for SCRAPED grants: open/closed only.
      // "pending" is NOT a scraped-grant state — it belongs exclusively to
      // the manager manual-insert review workflow (review_status pending/
      // approved on the grants table, a separate column from open/closed).
      // Legacy "pending"/"unknown" scraper values mean "rolling/dateless but
      // live" → normalize to open (absence of a date is not evidence of
      // closure, same rule as the v2.4 temporal gate in grants.py).
      const s = (g.status || "").toLowerCase();
      r.status = s === "closed" ? "closed" : "open";
    }
    if (cols.has("grant_status")) {
      // Temporal mirror of status: open/closed only (no unknown — unknown
      // source values are live rolling calls, i.e. open).
      const s = String(g.grant_status ?? g.status ?? "").toLowerCase();
      r.grant_status = s === "closed" ? "closed" : "open";
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
  const selectCols = "id, " + hashFields.join(", ") + ", is_standing, source_id";

  // Natural-key matching on UNIQUE idx_scraped_source (source_id, source).
  const keyOf = (r: Record<string, unknown>) => `${r.source ?? ""}::${r.source_id ?? ""}`;
  const fetchExisting = async (batch: Record<string, unknown>[]) => {
    const sources = [...new Set(batch.map((r) => String(r.source ?? "")))];
    const sids = [...new Set(batch.map((r) => String(r.source_id ?? "")))];
    const { data } = await supabase.from("scraped_grants").select(selectCols)
      .in("source", sources).in("source_id", sids) as unknown as { data: Record<string, unknown>[] | null };
    return (data ?? []).filter((e) =>
      batch.some((r) => keyOf(r) === keyOf(e)));
  };

  const { inserted, updated, skipped, errors } = await batchUpsert(
    supabase, "scraped_grants", records,
    hashFields,
    selectCols,
    keyOf,
    fetchExisting,
    "source_id,source",
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
