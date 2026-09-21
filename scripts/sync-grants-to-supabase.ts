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
  source_link?: string;
  grant_link?: string;
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
  // Origin flag — manager manual inserts arrive with manual_inserted=true
  // (auto-approved). Scraper exports always carry false.
  manual_inserted?: boolean;
  // NOTE: no url column — the merged grants table stores the v2.6 dual-link
  // pair only. `url` below is the export's primary action URL
  // (grant_link || source_link), used for gating + fallbacks.
  grant_type?: string;
  grant_types?: string[];
  highlights?: string[];
  urgency?: string;
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
// are SKIPPED (counted + reported) instead of polluting grants.
const NAV_TITLES = new Set([
  "overview", "our work", "about us", "about", "contact", "home", "news",
  "blog", "stories", "read more", "learn more", "see all", "view all",
  "what we do", "who we are", "where we work", "annual report",
]);

function isValidGrantUrl(url: string): boolean {
  // v2.7: homepage-only URLs are ACCEPTED (mirrors grants.py) — funders
  // sometimes run the call from their root domain. Depth is still
  // rewarded in ranking, but a bare homepage is not a validity failure.
  if (!url || typeof url !== "string") return false;
  const u = url.trim();
  if (!/^https?:\/\//i.test(u) || u.length < 15 || u.includes(" ")) return false;
  try {
    const p = new URL(u);
    if (!p.hostname.includes(".")) return false;
    return true;
  } catch { return false; }
}

function grantRejectReason(g: Grant): string | null {
  const title = (g.title || "").trim();
  if (title.length < 15) return "title-too-short";
  if (NAV_TITLES.has(title.toLowerCase())) return "nav-heading";
  if (!isValidGrantUrl(g.url || "")) return "bad-url";
  if (g.url_status === "broken" || g.url_status === "login_wall")
    return `url-${g.url_status}`;
  // v2.1: job postings are never grants (fellowships/scholarships exempt).
  // Mirrors scripts/grants.py:is_likely_job.
  if (!/(fellowship|scholarship|bolsa|bourse|beca|stipendium|\bgrant\b)/i.test(title) &&
      /(hiring|now hiring|career opportunit|job opportunit|remote jobs?|vacanc|open position|we are hiring|we're hiring|trabalhe conosco|is hiring an?)(\b| )/i.test(title + " "))
    return "job-posting";
  if (/call for papers|call for abstracts|submit your abstract/i.test(title))
    return "call-for-papers";
  const blob = `${g.title} ${g.description} ${g.funder}`.toLowerCase();
  if (/my account|register or sign in|page not found|the page you are looking for|file not found|sign in to continue|access denied/i.test(blob))
    return "login-wall-or-404";
  const hasTerms = /(edital|chamada|open call|call for|request for proposals|\brfp\b|grant|fellowship|bolsa|subvenç|convocat|appel à projets?|bando|prize|award|scholarship|microgrant|seed fund|inscreva-se|candidatura|apply (now|here|today|by))/i.test(blob);
  const hasBoth = Boolean(g.deadline) && Boolean(g.amount_max);
  if (!hasTerms && !hasBoth) return "no-grant-terms";
  if (typeof g.relevance === "number" && g.relevance < 5 && !hasBoth)
    return "low-relevance";
  // v2.4 temporal gate (defense in depth — grants.py already excludes these,
  // but stale/hand-made exports must never be INSERTED): closed calls and
  // deadlines already gone as of right now are skipped. Rolling/dateless
  // grants PASS the gate — absence of a date is not evidence of closure —
  // and the record builder below stores them as status=open.
  {
    const temporal = String(g.status ?? "").toLowerCase().trim();
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
    // Merged grants table (ex-scraped_grants): single temporal `status`
    // (open/closed/expired/hidden), single text `deadline`, dual-link pair
    // (grant_link/source_link, no url column), manual_inserted origin flag.
    // Dropped columns are NOT listed: url, is_standing, grant_status,
    // deadline_days, deadline_date, reviewed/review_notes/viewed.
    "id", "title", "funder", "source", "source_id", "source_link", "grant_link", "description",
    "deadline", "amount_max", "amount_min", "currency", "country", "region",
    "categories", "language", "relevance", "status",
    "fetched_at", "grant_type", "grant_types", "highlights", "urgency",
    "amount_usd", "priority_score", "manual_inserted",
    "content_hash", "quality_score", "url_status", "url_status_code",
    "url_checked_at", "last_seen_at", "updated_at",
  ]);
  const cols = await existingColumns(supabase, "grants", allWanted);

  // Fail-loud helper: silently-dropped columns hid the missing
  // source_link/grant_link columns for months. Never again.
  {
    const missing = [...allWanted].filter((c) => c !== "id" && !cols.has(c));
    if (missing.length > 0)
      console.warn(`  ⚠️ columns missing in DB (values skipped — run scripts/grants-manual-inserted-links.sql): ${missing.join(", ")}`);
  }

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
    // v2.6 dual-link model (grants.py emits both; legacy exports carry
    // neither — fall back to the export's primary url so columns are
    // never empty). There is no url column on the merged table.
    if (cols.has("source_link"))       r.source_link = g.source_link || g.url || "";
    if (cols.has("grant_link"))        r.grant_link = g.grant_link || "";
    if (cols.has("description"))       r.description = (g.description || "").slice(0, 5000);
    if (cols.has("deadline"))          r.deadline = g.deadline || "";
    if (cols.has("amount_max"))        r.amount_max = String(g.amount_max ?? "");
    if (cols.has("amount_min"))        r.amount_min = String(g.amount_min ?? "");
    if (cols.has("currency"))          r.currency = g.currency || "";
    if (cols.has("country"))           r.country = g.country || "GLOBAL";
    if (cols.has("region"))            r.region = g.region || "";
    if (cols.has("categories"))        r.categories = Array.isArray(g.categories) ? g.categories.filter(Boolean) : [];
    if (cols.has("language"))          r.language = g.language || "en";
    if (cols.has("relevance"))         r.relevance = typeof g.relevance === "number" ? Math.max(0, Math.min(100, g.relevance)) : 0;
    if (cols.has("status")) {
      // Single temporal column: open/closed/expired (+hidden quarantine).
      // Rolling/dateless rows that pass the gate land as open. Expired rows
      // are dropped by the gate above, but hand-made exports carrying
      // status=expired are stored as-is (managers can expire via edit).
      const s = (g.status || "").toLowerCase();
      r.status = s === "closed" ? "closed" : s === "expired" ? "expired" : "open";
    }
    if (cols.has("fetched_at"))        r.fetched_at = g.fetched_at || new Date().toISOString();
    if (cols.has("grant_type"))        r.grant_type = g.grant_type || "general";
    if (cols.has("grant_types"))       r.grant_types = Array.isArray(g.grant_types) ? g.grant_types : [];
    if (cols.has("highlights"))        r.highlights = Array.isArray(g.highlights) ? g.highlights : [];
    if (cols.has("urgency"))           r.urgency = g.urgency || "unknown";
    if (cols.has("amount_usd"))        r.amount_usd = g.amount_usd ?? null;
    // Clamp to the v2.9 0-100 scale — legacy rows predate normalization
    // (e.g. priority_score=122) and would otherwise rank above everything.
    // The clamp changes the stored value, so healing flows through the
    // normal hash-based update path below.
    if (cols.has("priority_score"))    r.priority_score = typeof g.priority_score === "number" ? Math.max(0, Math.min(100, Math.round(g.priority_score))) : 0;
    // Origin flag: scraper exports carry false; manager manual inserts
    // arrive with manual_inserted=true and are auto-approved.
    if (cols.has("manual_inserted"))   r.manual_inserted = Boolean(g.manual_inserted);
    // ── v2 quality / URL-health columns ──
    if (cols.has("content_hash"))      r.content_hash = g.content_hash || null;
    if (cols.has("quality_score"))     r.quality_score = typeof g.quality_score === "number" ? Math.max(0, Math.min(100, g.quality_score)) : 0;
    if (cols.has("url_status"))        r.url_status = ["ok", "broken", "login_wall", "timeout", "blocked"].includes(g.url_status || "") ? g.url_status! : "unchecked";
    if (cols.has("url_status_code"))   r.url_status_code = typeof g.url_status_code === "number" ? g.url_status_code : null;
    if (cols.has("url_checked_at"))    r.url_checked_at = g.url_checked_at || null;
    if (cols.has("last_seen_at"))      r.last_seen_at = nowIso;
    records.push(r);
  }

  // Fields used for change detection — excludes fetched_at/last_seen_at
  // (change every run) and manual_inserted (static origin flag)
  const hashFields = ["title", "funder", "source", "source_link", "grant_link", "description", "deadline", "amount_max", "amount_min", "currency", "country", "region", "categories", "language", "relevance", "status", "grant_type", "grant_types", "highlights", "urgency", "amount_usd", "priority_score", "quality_score", "url_status"];
  const selectCols = "id, " + hashFields.join(", ") + ", source_id";

  // Natural-key matching on UNIQUE (source_id, source) — legacy rows carry
  // pre-UUID ids, so id-based matching misses them. Matching on the UNIQUE
  // index heals legacy rows in place (ids stable).
  const keyOf = (r: Record<string, unknown>) => `${r.source ?? ""}::${r.source_id ?? ""}`;
  const fetchExisting = async (batch: Record<string, unknown>[]) => {
    const sources = [...new Set(batch.map((r) => String(r.source ?? "")))];
    const sids = [...new Set(batch.map((r) => String(r.source_id ?? "")))];
    const { data } = await supabase.from("grants").select(selectCols)
      .in("source", sources).in("source_id", sids) as unknown as { data: Record<string, unknown>[] | null };
    return (data ?? []).filter((e) =>
      batch.some((r) => keyOf(r) === keyOf(e)));
  };

  const { inserted, updated, skipped, errors } = await batchUpsert(
    supabase, "grants", records,
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

async function markDead(
  supabase: SupabaseClient<SupabaseDB>,
  filePath: string,
  opts: { dryRun: boolean },
): Promise<void> {
  // Reconcile funder-page-closed rows: the scraper drops them from the
  // export (temporal gate) and records a dead_*.json sidecar carrying the
  // export id (= DB source_id natural key). Flip matching open DB rows to
  // closed so stale calls stop showing live "remaining days". Rows with no
  // DB match, or already non-open, are skipped (never inserted).
  const raw = readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw);
  const dead: { source?: string; source_id?: string }[] = parsed.dead || parsed;
  if (!Array.isArray(dead) || dead.length === 0) {
    console.warn("mark-dead: sidecar empty, nothing to do.");
    return;
  }
  console.warn(`mark-dead: loaded ${dead.length} entries from ${filePath}`);

  let flipped = 0;
  let skipped = 0;
  const errors: string[] = [];
  const nowIso = new Date().toISOString();
  for (const entry of dead) {
    const source = String(entry.source || "");
    const sid = String(entry.source_id || "");
    if (!source || !sid) { skipped++; continue; }
    if (opts.dryRun) { skipped++; continue; }
    const { data, error } = await supabase
      .from("grants")
      .select("id, status")
      .eq("source", source)
      .eq("source_id", sid)
      .maybeSingle();
    if (error) {
      errors.push(`${source}::${sid}: ${error.message}`);
      continue;
    }
    const row = data as unknown as { id: string; status: string } | null;
    if (!row || row.status !== "open") { skipped++; continue; }
    const { error: upErr } = await supabase
      .from("grants")
      .update({ status: "closed", updated_at: nowIso } as never)
      .eq("id", row.id);
    if (upErr) {
      errors.push(`${source}::${sid}: ${upErr.message}`);
    } else {
      flipped++;
    }
  }
  if (opts.dryRun) {
    console.warn(`mark-dead dry-run: ${dead.length} entries (no writes performed)`);
    return;
  }
  console.warn(`mark-dead: flipped=${flipped} skipped=${skipped} errors=${errors.length}`);
  for (const e of errors.slice(0, 10)) console.warn(`  • ${e}`);
  if (errors.length > 0) process.exit(2);
}

async function closeExpired(
  supabase: SupabaseClient<SupabaseDB>,
  opts: { dryRun: boolean },
): Promise<void> {
  // Daily expiry sweep: flip status=open rows whose deadline (YYYY-MM-DD
  // prefix) is before today (UTC) to status=expired. Dateless rows are
  // rolling calls — absence of a date is not evidence of closure — and
  // unparseable deadlines are reported, never flipped.
  const today = new Date().toISOString().slice(0, 10);
  const pageSize = 1000;
  let from = 0;
  let scanned = 0;
  let dateless = 0;
  let unparseable = 0;
  const toExpire: string[] = [];

  for (;;) {
    const { data, error } = await supabase
      .from("grants")
      .select("id, deadline")
      .eq("status", "open")
      .range(from, from + pageSize - 1);
    if (error) {
      console.error("close-expired fetch failed:", error.message);
      process.exit(2);
    }
    const rows = (data ?? []) as { id: string; deadline: string | null }[];
    if (rows.length === 0) break;
    scanned += rows.length;
    for (const r of rows) {
      const d = (r.deadline || "").trim();
      if (!d) { dateless++; continue; }
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
      if (!m) { unparseable++; continue; }
      if (`${m[1]}-${m[2]}-${m[3]}` < today) toExpire.push(r.id);
    }
    if (rows.length < pageSize) break;
    from += pageSize;
  }

  console.warn(`close-expired: scanned=${scanned} dateless=${dateless} unparseable=${unparseable} past-deadline=${toExpire.length}`);

  if (toExpire.length === 0 || opts.dryRun) {
    if (opts.dryRun) console.warn("dry-run: no writes performed");
    return;
  }

  const nowIso = new Date().toISOString();
  let expired = 0;
  const errors: string[] = [];
  for (let i = 0; i < toExpire.length; i += 200) {
    const chunk = toExpire.slice(i, i + 200);
    const { error } = await supabase
      .from("grants")
      .update({ status: "expired", updated_at: nowIso } as never)
      .in("id", chunk);
    if (error) {
      errors.push(`chunk@${i}: ${error.message}`);
    } else {
      expired += chunk.length;
    }
  }
  console.warn(`close-expired: expired=${expired} errors=${errors.length}`);
  for (const e of errors.slice(0, 10)) console.warn(`  • ${e}`);
  if (errors.length > 0) process.exit(2);
}

async function main() {
  const mode = process.argv[2];
  const filePath = process.argv[3];
  const dryRun = process.argv.includes("--dry-run");

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) { console.error("ERROR: SUPABASE_URL required"); process.exit(1); }
  if (!serviceRoleKey) { console.error("ERROR: SUPABASE_SERVICE_ROLE_KEY required"); process.exit(1); }
  if (!mode || (mode !== "grants" && mode !== "agents" && mode !== "close-expired" && mode !== "mark-dead")) {
    console.error("Usage: sync-grants-to-supabase.ts <grants|agents|close-expired|mark-dead> [file] [--dry-run]");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  try {
    if (mode === "close-expired") {
      await closeExpired(supabase, { dryRun });
    } else if (mode === "mark-dead") {
      const path = filePath || findLatest("dead_");
      if (!path) { console.error("No dead-grants sidecar file found"); process.exit(1); }
      await markDead(supabase, path, { dryRun });
    } else if (mode === "grants") {
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
