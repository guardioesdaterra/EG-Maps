import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || Deno.env.get("NUXT_PUBLIC_SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY") || "";

export function getCorsHeaders(origin?: string | null): Record<string, string> {
  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:4321",
    "https://guardioesdaterra.github.io",
    "https://guardioesdaterra.org",
    "https://eg-maps.vercel.app",
  ];
  const origin_header = origin && allowedOrigins.includes(origin) ? origin : "https://guardioesdaterra.github.io";
  return {
    "Access-Control-Allow-Origin": origin_header,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Ingest-Token, X-Manager-Secret",
    "Access-Control-Max-Age": "86400",
  };
}

export function jsonResponse(data: Record<string, unknown>, status: number, origin?: string | null): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...getCorsHeaders(origin),
    },
  });
}

export function getAdminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

export async function getUser(authHeader: string | null): Promise<{ user: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null; error: string | null }> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { user: null, error: "Missing or invalid Authorization header" };
  }

  const token = authHeader.slice(7);
  const admin = getAdminClient();
  const { data: { user }, error } = await admin.auth.getUser(token);

  if (error || !user) {
    return { user: null, error: error?.message || "Invalid token" };
  }

  return { user: { id: user.id, email: user.email, user_metadata: user.user_metadata as Record<string, unknown> }, error: null };
}

export function sanitizeString(input: string | undefined | null, maxLen = 500): string {
  if (!input) return "";
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/[<>"'&]/g, "")
    .slice(0, maxLen)
    .trim();
}

const EG_EMAIL_DOMAIN = "earthguardians.org";

export function isEarthGuardiansEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return email.toLowerCase().endsWith(`@${EG_EMAIL_DOMAIN}`);
}

export function clampPagination(
  pageRaw: string | null,
  limitRaw: string | null,
  defaultLimit = 50,
): { page: number; limit: number; offset: number } {
  const page = Math.max(1, parseInt(pageRaw || "1", 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(String(defaultLimit), 10) || defaultLimit));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export function isValidUUID(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function isValidCoordinate(lat: unknown, lng: unknown): boolean {
  const la = Number(lat);
  const lo = Number(lng);
  return Number.isFinite(la) && Number.isFinite(lo) && la >= -90 && la <= 90 && lo >= -180 && lo <= 180;
}

export async function getManagerUser(
  authHeader: string | null,
): Promise<{ user: { id: string; email?: string } | null; error: string | null; status: number }> {
  const { user, error } = await getUser(authHeader);
  if (error || !user) {
    return { user: null, error: error || "Unauthorized", status: 401 };
  }

  const admin = getAdminClient();
  const { data: crew, error: crewError } = await admin
    .from("crews")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (crewError || !crew || crew.role !== "manager") {
    return { user: null, error: "Manager access required", status: 403 };
  }

  return { user, error: null, status: 200 };
}
