import {
  getCorsHeaders,
  getAdminClient,
  jsonResponse,
  getUser,
  isEarthGuardiansEmail,
  sanitizeString,
} from "../_shared/auth.ts";

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(origin) });
  }

  try {
    const auth = await getUser(req.headers.get("Authorization"));
    if (auth.error || !auth.user) {
      return jsonResponse({ error: "Authentication required" }, 401, origin);
    }
    if (!isEarthGuardiansEmail(auth.user.email)) {
      return jsonResponse({ error: "Only @earthguardians.org users can edit grants" }, 403, origin);
    }

    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405, origin);
    }

    const body = await req.json();
    const { grant_id, ...fields } = body;

    if (!grant_id) {
      return jsonResponse({ error: "Missing grant_id" }, 400, origin);
    }

    // Build update object with only allowed fields, sanitized
    const ALLOWED_FIELDS = [
      "title", "funder", "source", "url", "description",
      "deadline", "amount_max", "amount_min", "currency",
      "country", "region", "categories", "language",
      "status", "grant_type",
    ] as const;

    const updateData: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in fields) {
        if (key === "description" || key === "title" || key === "funder") {
          updateData[key] = sanitizeString(fields[key], key === "description" ? 2000 : 500);
        } else if (key === "categories") {
          updateData[key] = Array.isArray(fields[key])
            ? fields[key].map((c: string) => sanitizeString(c, 100)).filter(Boolean)
            : [];
        } else {
          updateData[key] = fields[key];
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return jsonResponse({ error: "No valid fields to update" }, 400, origin);
    }

    const admin = getAdminClient();

    const { data: updated, error: updateError } = await admin
      .from("scraped_grants")
      .update(updateData)
      .eq("id", grant_id)
      .select()
      .maybeSingle();

    if (updateError) {
      return jsonResponse({ error: updateError.message }, 500, origin);
    }

    if (!updated) {
      return jsonResponse({ error: "Grant not found" }, 404, origin);
    }

    return jsonResponse({ grant: updated }, 200, origin);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return jsonResponse({ error: message }, 500, origin);
  }
});
