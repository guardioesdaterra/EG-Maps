import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-sync-key",
};

// ── Community pin payload ────────────────────────────────────
interface PinPayload {
  pin_type: string;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  source_url?: string;
}

const VALID_PIN_TYPES = [
  "cultural_agent",
  "cultural_avenue",
  "show_event",
  "action",
  "point_of_attention",
];

// ── Cultural agent batch payload ─────────────────────────────
interface AgentRow {
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

interface SyncPayload {
  agents: AgentRow[];
}

// ── Helpers ──────────────────────────────────────────────────
function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

function jsonResp(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Main handler ─────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const body = await req.json();

    // ── Route: Batch cultural agent sync (CI → service role) ──
    if (body.agents && Array.isArray(body.agents)) {
      const syncKey = req.headers.get("x-sync-key");
      if (!syncKey || syncKey !== supabaseKey) {
        return jsonResp({ error: "Invalid sync key" }, 401);
      }

      const adminClient = createClient(supabaseUrl, supabaseKey);
      const agents: AgentRow[] = body.agents;
      const BATCH = 200;
      let inserted = 0;
      let updated = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (let i = 0; i < agents.length; i += BATCH) {
        const batch = agents.slice(i, i + BATCH);

        const ids = batch.map((a) => a.id);
        const { data: existing } = await adminClient
          .from("vulcan_observatory")
          .select("id, name, source, latitude, longitude")
          .in("id", ids);

        const existMap = new Map<string, Record<string, unknown>>();
        for (const e of existing ?? []) existMap.set(e.id as string, e);

        const toUpsert: AgentRow[] = [];
        for (const a of batch) {
          const ex = existMap.get(a.id);
          if (!ex) {
            toUpsert.push(a);
            inserted++;
            continue;
          }
          const exHash = [ex.name, ex.source, ex.latitude, ex.longitude].join("||");
          const newHash = [a.name, a.source, a.latitude, a.longitude].join("||");
          if (exHash === newHash) {
            skipped++;
            continue;
          }
          toUpsert.push(a);
          updated++;
        }

        if (toUpsert.length > 0) {
          const { error } = await adminClient
            .from("vulcan_observatory")
            .upsert(toUpsert, { onConflict: "id", ignoreDuplicates: false });
          if (error) errors.push(error.message);
        }
      }

      return jsonResp({
        message: "Cultural agents synced",
        inserted,
        updated,
        skipped,
        total: agents.length,
        errors,
      }, 200);
    }

    // ── Route: Community pin (user → JWT auth) ────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResp({ error: "Missing authorization header" }, 401);
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return jsonResp({ error: "Unauthorized", details: authError?.message }, 401);
    }

    const pin: PinPayload = body;

    if (!pin.pin_type || !VALID_PIN_TYPES.includes(pin.pin_type)) {
      return jsonResp({ error: "Invalid pin_type", valid: VALID_PIN_TYPES }, 400);
    }

    if (!pin.name || pin.name.trim().length < 2) {
      return jsonResp({ error: "Name must be at least 2 characters" }, 400);
    }

    if (!isValidCoordinate(pin.latitude, pin.longitude)) {
      return jsonResp({ error: "Invalid coordinates (lat/lng)" }, 400);
    }

    // Rate limit: 10 pins per user per day
    const adminClient = createClient(supabaseUrl, supabaseKey);
    const oneDayAgo = new Date(Date.now() - 86400000).toISOString();

    const { count } = await adminClient
      .from("community_pins")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", oneDayAgo);

    if (count && count >= 10) {
      return jsonResp({ error: "Rate limit: max 10 pins per day" }, 429);
    }

    const { data, error: insertError } = await adminClient
      .from("community_pins")
      .insert({
        user_id: user.id,
        pin_type: pin.pin_type,
        name: pin.name.trim(),
        description: pin.description?.trim() || null,
        latitude: pin.latitude,
        longitude: pin.longitude,
        source_url: pin.source_url || null,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return jsonResp({ error: "Failed to create pin", details: insertError.message }, 500);
    }

    return jsonResp({ pin: data, message: "Pin created — pending approval" }, 201);
  } catch (err) {
    console.error("Unexpected error:", err);
    return jsonResp({ error: "Internal server error" }, 500);
  }
});
