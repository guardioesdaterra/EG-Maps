import {
  getCorsHeaders,
  jsonResponse,
  clampPagination,
} from "../_shared/auth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MAX_FETCH = 200;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(origin) });
  }

  try {
    const url = new URL(req.url);
    const { page, limit, offset } = clampPagination(
      url.searchParams.get("page"),
      url.searchParams.get("limit"), 50,
    );

    const type = url.searchParams.get("type") || "all";
    const status = url.searchParams.get("status") || "approved";

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const results: Record<string, unknown>[] = [];

    if (type === "scraped" || type === "all") {
      const { data: scraped, error: sErr } = await supabase
        .from("scraped_grants")
        .select("*")
        .eq("status", status)
        .order("relevance", { ascending: false })
        .limit(MAX_FETCH);

      if (!sErr && scraped) {
        for (const g of scraped) {
          results.push({
            ...g,
            source_type: "scraped",
          });
        }
      }
    }

    if (type === "internal" || type === "all") {
      const { data: internal, error: iErr } = await supabase
        .from("grants")
        .select("*")
        .eq("status", status)
        .order("created_at", { ascending: false })
        .limit(MAX_FETCH);

      if (!iErr && internal) {
        for (const g of internal) {
          results.push({
            ...g,
            source_type: "internal",
          });
        }
      }
    }

    results.sort(
      (a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime(),
    );

    const paged = results.slice(offset, offset + limit);
    const total = results.length;

    return jsonResponse({
      grants: paged,
      total,
      page,
      limit,
    }, 200, origin);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return jsonResponse({ error: message }, 500, origin);
  }
});
