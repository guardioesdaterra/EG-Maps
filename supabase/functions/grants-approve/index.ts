import {
  getCorsHeaders,
  getManagerUser,
  getAdminClient,
  jsonResponse,
  isValidUUID,
  sanitizeString,
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

    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405, origin);
    }

    const bodyText = await req.text();
    if (bodyText.length > 10_000) {
      return jsonResponse({ error: "Request body too large" }, 413, origin);
    }
    const body = JSON.parse(bodyText);
    const { grant_id, decision, notes } = body;

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

    // Fetch the scraped grant
    const { data: scraped, error: fetchError } = await admin
      .from("scraped_grants")
      .select("*")
      .eq("id", grant_id)
      .maybeSingle();

    if (fetchError) {
      return jsonResponse({ error: fetchError.message }, 500, origin);
    }

    if (!scraped) {
      return jsonResponse({ error: "Scraped grant not found" }, 404, origin);
    }

    // Map scraped_grants → grants table columns
    if (decision === "approved") {
      const categories = Array.isArray(scraped.categories) ? scraped.categories : [];
      const categoryMap: Record<string, string> = {
        climate: "environment",
        environment: "environment",
        conservation: "environment",
        biodiversity: "environment",
        social: "social",
        community: "social",
        human_rights: "social",
        art: "art",
        artistic: "art",
        education: "education",
        health: "health",
      };

      let category = "environment";
      for (const c of categories) {
        const mapped = categoryMap[String(c).toLowerCase()];
        if (mapped) { category = mapped; break; }
      }

      const locationParts = [scraped.country, scraped.region].filter(Boolean);
      const locationName = locationParts.join(", ") || "Global";

      const cleanNotes = notes ? sanitizeString(notes, 2000) : null;

      // Check for duplicate URL in grants table
      const { data: existingGrant } = await admin
        .from("grants")
        .select("id")
        .eq("url", scraped.url || "")
        .maybeSingle();

      if (!existingGrant) {
        // Insert into grants table
        const { error: insertError } = await admin
          .from("grants")
          .insert({
            title: scraped.title,
            description: scraped.description || "",
            location_name: locationName,
            latitude: null,
            longitude: null,
            category,
            url: scraped.url,
            status: "approved",
            submitted_by: user!.id,
            reviewed_by: user!.id,
            reviewed_at: new Date().toISOString(),
            rejection_reason: null,
          });

        if (insertError) {
          return jsonResponse({ error: insertError.message }, 500, origin);
        }
      }
    }

    // Update scraped_grants status
    const { error: updateError } = await admin
      .from("scraped_grants")
      .update({ status: decision })
      .eq("id", grant_id);

    if (updateError) {
      return jsonResponse({ error: updateError.message }, 500, origin);
    }

    // Create audit trail
    const { error: decisionError } = await admin.from("grant_decisions").insert({
      grant_id,
      manager_id: user!.id,
      decision,
      notes: notes ? sanitizeString(notes, 2000) : null,
    });

    if (decisionError) {
      console.error("Failed to create decision audit:", decisionError.message);
    }

    return jsonResponse({ grant_id, decision }, 200, origin);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return jsonResponse({ error: message }, 500, origin);
  }
});
