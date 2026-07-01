import {
  getCorsHeaders,
  getManagerUser,
  getAdminClient,
  jsonResponse,
  sanitizeString,
  isValidUUID,
} from "../_shared/auth.ts";

const VALID_DECISIONS = ["approved", "rejected", "hidden", "pending"];

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(origin) });
  }

  try {
    const { user, error: managerError, status } = await getManagerUser(
      req.headers.get("Authorization"),
    );
    if (managerError) {
      return jsonResponse({ error: managerError }, status, origin);
    }

    const bodyText = await req.text();
    if (bodyText.length > 10_000) {
      return jsonResponse({ error: "Request body too large" }, 413, origin);
    }
    const body = JSON.parse(bodyText);
    const { grant_id, decision } = body;

    if (!grant_id || !decision) {
      return jsonResponse(
        { error: "Missing required fields: grant_id, decision" },
        400,
        origin,
      );
    }

    if (!isValidUUID(grant_id)) {
      return jsonResponse({ error: "Invalid grant_id format" }, 400, origin);
    }

    if (!VALID_DECISIONS.includes(decision)) {
      return jsonResponse(
        { error: `decision must be one of: ${VALID_DECISIONS.join(", ")}` },
        400,
        origin,
      );
    }

    const admin = getAdminClient();

    const { data: grant, error: updateError } = await admin
      .from("scraped_grants")
      .update({ status: decision })
      .eq("id", grant_id)
      .select()
      .single();

    if (updateError) {
      return jsonResponse({ error: updateError.message }, 500, origin);
    }

    return jsonResponse({ grant }, 200, origin);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return jsonResponse({ error: message }, 500, origin);
  }
});
