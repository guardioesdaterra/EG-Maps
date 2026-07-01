import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const BATCH_SIZE = 100;
const MAX_BATCHES = 100;

function corsHeaders(origin?: string | null) {
  const allowed = [
    "https://guardioesdaterra.github.io",
    "https://earthguardians.org",
  ];
  const o = origin && allowed.some((a) => origin.startsWith(a)) ? origin : allowed[0];
  return {
    "Access-Control-Allow-Origin": o,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-sync-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  };
}

function jsonResponse(data: Record<string, unknown>, status = 200, origin?: string | null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

function sanitize(val: unknown, maxLen = 2000): string {
  if (typeof val !== "string") return "";
  const cleaned = val.split("").filter((ch) => {
    const code = ch.charCodeAt(0);
    return !((code <= 0x08) || (code === 0x0B) || (code === 0x0C) || (code >= 0x0E && code <= 0x1F) || (code === 0x7F));
  }).join("");
  return cleaned.replace(/\s+/g, " ").trim().slice(0, maxLen);
}

function parseNumber(val: unknown): number {
  const n = typeof val === "number" ? val : Number(val);
  return Number.isFinite(n) ? n : 0;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, origin);
  }

  // Validate sync secret
  const syncSecret = Deno.env.get("GRANTS_INGEST_TOKEN") || Deno.env.get("SYNC_SECRET");
  const providedSecret = req.headers.get("x-sync-secret");
  if (syncSecret && providedSecret !== syncSecret) {
    return jsonResponse({ error: "Invalid sync secret" }, 401, origin);
  }

  try {
    const body = await req.json();
    let grants: Record<string, unknown>[] = [];

    if (Array.isArray(body)) {
      grants = body;
    } else if (body.grants && Array.isArray(body.grants)) {
      grants = body.grants;
    } else {
      return jsonResponse({ error: "Request body must be an array or { grants: [...] }" }, 400, origin);
    }

    if (grants.length === 0) {
      return jsonResponse({ inserted: 0, skipped: 0, total: 0 }, 200, origin);
    }

    if (grants.length > BATCH_SIZE * MAX_BATCHES) {
      return jsonResponse({ error: `Too many grants. Max: ${BATCH_SIZE * MAX_BATCHES}` }, 400, origin);
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Fetch existing IDs once to report inserted vs updated counts
    const { data: existing } = await admin
      .from("grants_catalog")
      .select("id")
      .in("id", grants.map((g) => String(g.id || "")).filter(Boolean));
    const existingIds = new Set((existing || []).map((r: { id: string }) => r.id));

    // Process in batches using UPSERT (insert-or-update)
    for (let i = 0; i < grants.length; i += BATCH_SIZE) {
      const batch = grants.slice(i, i + BATCH_SIZE);

      // Skip grants with no valid ID
      const valid = batch.filter((g) => {
        const id = String(g.id || "").trim();
        if (!id) { skipped++; return false; }
        return true;
      });

      if (valid.length === 0) continue;

      const records = valid.map((g) => {
        const id = sanitize(g.id, 64) || crypto.randomUUID();
        return {
          id,
          title: sanitize(g.title, 500) || "Untitled Grant",
          funder: sanitize(g.funder, 300),
          source: sanitize(g.source, 200),
          url: sanitize(g.url, 2000) || "#",
          description: sanitize(g.description, 5000),
          deadline: sanitize(g.deadline, 50),
          amount_max: sanitize(String(g.amount_max ?? ""), 100),
          amount_min: sanitize(String(g.amount_min ?? ""), 100),
          currency: sanitize(g.currency, 20) || "USD",
          country: sanitize(g.country, 100) || "GLOBAL",
          region: sanitize(g.region, 200),
          categories: Array.isArray(g.categories)
            ? g.categories.map((c: unknown) => String(c)).filter(Boolean)
            : [],
          language: sanitize(g.language, 10) || "en",
          relevance: typeof g.relevance === "number" ? Math.max(0, Math.min(100, g.relevance)) : 0,
          status: "pending",
          fetched_at: g.fetched_at ? String(g.fetched_at) : new Date().toISOString(),
        };
      });

      // UPSERT: insert new rows, update existing ones on id conflict
      const { error } = await admin
        .from("grants_catalog")
        .upsert(records as never, { onConflict: "id", ignoreDuplicates: false });

      if (error) {
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
        skipped += records.length;
      } else {
        for (const r of records) {
          if (existingIds.has(r.id)) updated++;
          else inserted++;
        }
      }
    }

    return jsonResponse(
      {
        inserted,
        updated,
        skipped,
        total: grants.length,
        errors: errors.length > 0 ? errors : undefined,
      },
      errors.length > 0 ? 207 : 200,
      origin,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return jsonResponse({ error: message }, 500, origin);
  }
});
