import {
  getCorsHeaders,
  getAdminClient,
  getUser,
  jsonResponse,
} from "../_shared/auth.ts";

const BATCH_SIZE = 100;
const MAX_BATCHES = 100;

function sanitize(val: unknown, maxLen = 2000): string {
  if (typeof val !== "string") return "";
  return val.split("").filter((ch) => {
    const code = ch.charCodeAt(0);
    return !(code <= 0x08 || code === 0x0B || code === 0x0C || (code >= 0x0E && code <= 0x1F) || code === 0x7F);
  }).join("").replace(/\s+/g, " ").trim().slice(0, maxLen);
}

function toUUID(shortId: string): string {
  if (shortId.length === 12) return `00000000-0000-0000-0000-${shortId}`;
  return shortId;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, origin);
  }

  const authHeader = req.headers.get("Authorization");
  const { user, error: authError } = await getUser(authHeader);
  if (authError || !user) {
    return jsonResponse({ error: authError || "Unauthorized" }, 401, origin);
  }

  try {
    const body = await req.json();
    const grants: Record<string, unknown>[] = Array.isArray(body) ? body : body.grants;

    if (!Array.isArray(grants) || grants.length === 0) {
      return jsonResponse({ inserted: 0, updated: 0, skipped: 0, total: 0 }, 200, origin);
    }

    if (grants.length > BATCH_SIZE * MAX_BATCHES) {
      return jsonResponse({ error: `Too many grants. Max: ${BATCH_SIZE * MAX_BATCHES}` }, 400, origin);
    }

    const admin = getAdminClient();
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < grants.length; i += BATCH_SIZE) {
      const batch = grants.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;

      const records: Record<string, unknown>[] = [];
      for (const g of batch) {
        const id = sanitize(g.id, 64);
        const title = sanitize(g.title, 500) || "Untitled Grant";
        const source = sanitize(g.source, 200);
        const url = sanitize(g.url, 2000);
        if (!id || !title || !source || !url) { skipped++; continue; }

        const uuid = toUUID(id);

        records.push({
          id: uuid,
          title,
          source,
          source_id: sanitize(g.source_id, 200),
          url,
          funder: sanitize(g.funder, 300),
          description: sanitize(g.description, 5000),
          deadline: sanitize(g.deadline, 50),
          amount_max: sanitize(String(g.amount_max ?? ""), 100),
          amount_min: sanitize(String(g.amount_min ?? ""), 100),
          currency: sanitize(g.currency, 20) || "USD",
          country: sanitize(g.country, 100) || "GLOBAL",
          region: sanitize(g.region, 200),
          categories: Array.isArray(g.categories) ? g.categories.map(String).filter(Boolean) : [],
          language: sanitize(g.language, 10) || "en",
          relevance: typeof g.relevance === "number" ? Math.max(0, Math.min(100, g.relevance)) : 0,
          grant_type: sanitize(g.grant_type, 50),
          status: "pending",
          fetched_at: g.fetched_at ? String(g.fetched_at) : new Date().toISOString(),
        });
      }

      if (records.length === 0) continue;

      const { data: existing } = await admin
        .from("scraped_grants")
        .select("id")
        .in("id", records.map((r) => String(r.id)));
      const existingIds = new Set((existing || []).map((r: { id: string }) => r.id));

      const { error } = await admin
        .from("scraped_grants")
        .upsert(records as never, { onConflict: "id", ignoreDuplicates: false });

      if (error) {
        errors.push(`Batch ${batchNum}: ${error.message}`);
        skipped += records.length;
      } else {
        for (const r of records) {
          if (existingIds.has(String(r.id))) updated++;
          else inserted++;
        }
      }
    }

    return jsonResponse(
      { inserted, updated, skipped, total: grants.length, errors: errors.length > 0 ? errors : undefined },
      errors.length > 0 ? 207 : 200,
      origin,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return jsonResponse({ error: message }, 500, origin);
  }
});
