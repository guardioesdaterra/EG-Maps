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
