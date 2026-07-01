import {
  getCorsHeaders,
  getAdminClient,
  jsonResponse,
} from "../_shared/auth.ts";

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(origin) });
  }

  try {
    const ingestToken = Deno.env.get("GRANTS_INGEST_TOKEN");
    if (!ingestToken) {
      return jsonResponse({ error: "Server misconfiguration: GRANTS_INGEST_TOKEN not set" }, 500, origin);
    }

    const provided = req.headers.get("X-Ingest-Token");
    if (!provided || provided !== ingestToken) {
      return jsonResponse({ error: "Invalid or missing ingest token" }, 401, origin);
    }

    const admin = getAdminClient();

    // GET — return existing scraped_grants IDs + URLs so the client can pre-filter
    if (req.method === "GET") {
      const { data: rows, error } = await admin
        .from("scraped_grants")
        .select("id, url");

      if (error) {
        return jsonResponse({ error: error.message }, 500, origin);
      }

      const ids: string[] = [];
      const urls: Record<string, string> = {};
      for (const r of (rows || [])) {
        const short = r.id.replace(/^00000000-0000-0000-0000-/, "");
        const sid = short.length === 12 ? short : r.id;
        ids.push(sid);
        if (r.url) urls[r.url] = sid;
      }

      return jsonResponse({ ids, urls }, 200, origin);
    }

    // POST — ingest grants
    const bodyText = await req.text();
    if (bodyText.length > 500_000) {
      return jsonResponse({ error: "Request body too large" }, 413, origin);
    }
    const body = JSON.parse(bodyText);
    const { grants } = body;

    if (!Array.isArray(grants) || grants.length === 0) {
      return jsonResponse({ error: "Missing or empty grants array" }, 400, origin);
    }

    let inserted = 0;
    let skipped = 0;

    for (const grant of grants) {
      const { id, title, source, url, description, deadline, amount_max, amount_min, currency, country, region, categories, language, relevance, funder } = grant;

      if (!id || !title || !source) {
        skipped++;
        continue;
      }

      // Convert short hash ID to proper UUID format for Postgres UUID column
      const uuid = id.length === 12
        ? `00000000-0000-0000-0000-${id}`
        : id;
      const sourceId = grant.source_id || source;

      // Check for existing grant by id (UUID format)
      const { data: existing } = await admin
        .from("scraped_grants")
        .select("id")
        .eq("id", uuid)
        .maybeSingle();

      // Skip if the same URL already exists in scraped_grants (cross-source) or internal grants
      if (!existing && url) {
        const { data: urlGrant } = await admin
          .from("scraped_grants")
          .select("id, status")
          .eq("url", url)
          .maybeSingle();

        if (urlGrant) {
          skipped++;
          continue;
        }

        const { data: userGrant } = await admin
          .from("grants")
          .select("id")
          .eq("url", url)
          .maybeSingle();

        if (userGrant) {
          skipped++;
          continue;
        }
      }

      if (existing) {
        // Preserve review status — don't reset approved/rejected to pending
        const { data: current } = await admin
          .from("scraped_grants")
          .select("status")
          .eq("id", uuid)
          .single();

        const preservedStatus =
          current?.status === "approved" || current?.status === "rejected"
            ? current.status
            : "pending";

        await admin
          .from("scraped_grants")
          .update({
            title,
            source,
            source_id: sourceId,
            url,
            description: description?.slice(0, 2000),
            deadline,
            amount_max,
            amount_min,
            currency,
            country,
            region,
            categories: categories || [],
            language: language || "en",
            relevance: relevance || 0,
            funder,
            status: preservedStatus,
          })
          .eq("id", uuid);
        skipped++;
      } else {
        const { error } = await admin
          .from("scraped_grants")
          .insert({
            id: uuid,
            title,
            source,
            source_id: sourceId,
            url,
            description: description?.slice(0, 2000),
            deadline,
            amount_max,
            amount_min,
            currency,
            country,
            region,
            categories: categories || [],
            language: language || "en",
            relevance: relevance || 0,
            funder: funder || "",
            status: "pending",
          });

        if (error) {
          skipped++;
        } else {
          inserted++;
        }
      }
    }

    return jsonResponse({ inserted, skipped, total: grants.length }, 200, origin);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return jsonResponse({ error: message }, 500, origin);
  }
});
