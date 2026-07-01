import { getAdminClient, jsonResponse, getCorsHeaders } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(origin) });
  }

  try {
    const admin = getAdminClient();

    const [
      pendingInternal,
      approvedInternal,
      rejectedInternal,
      pendingScraped,
      approvedScraped,
      rejectedScraped,
      hiddenScraped,
    ] = await Promise.all([
      admin.from("grants").select("id", { count: "exact", head: true }).eq("status", "pending"),
      admin.from("grants").select("id", { count: "exact", head: true }).eq("status", "approved"),
      admin.from("grants").select("id", { count: "exact", head: true }).eq("status", "rejected"),
      admin.from("scraped_grants").select("id", { count: "exact", head: true }).eq("status", "pending"),
      admin.from("scraped_grants").select("id", { count: "exact", head: true }).eq("status", "approved"),
      admin.from("scraped_grants").select("id", { count: "exact", head: true }).eq("status", "rejected"),
      admin.from("scraped_grants").select("id", { count: "exact", head: true }).eq("status", "hidden"),
    ]);

    const pending = (pendingInternal.count || 0) + (pendingScraped.count || 0);
    const approved = (approvedInternal.count || 0) + (approvedScraped.count || 0);
    const rejected = (rejectedInternal.count || 0) + (rejectedScraped.count || 0);

    return jsonResponse(
      {
        pending,
        approved,
        rejected,
        hidden: hiddenScraped.count || 0,
        total: pending + approved + rejected + (hiddenScraped.count || 0),
        internal: {
          pending: pendingInternal.count || 0,
          approved: approvedInternal.count || 0,
          rejected: rejectedInternal.count || 0,
        },
        scraped: {
          pending: pendingScraped.count || 0,
          approved: approvedScraped.count || 0,
          rejected: rejectedScraped.count || 0,
          hidden: hiddenScraped.count || 0,
        },
      },
      200,
      origin,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return jsonResponse({ error: message }, 500, origin);
  }
});
