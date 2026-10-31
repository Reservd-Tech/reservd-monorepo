/**
 * Shared helpers for the public consumer-app API (`/api/public/*`).
 * Every endpoint is authenticated with a shared secret (CONSUMER_API_KEY)
 * sent as `x-api-key`. The service role key never leaves the server.
 */

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, x-api-key",
  "Access-Control-Max-Age": "86400",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...corsHeaders },
  });
}

export function preflight() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Returns a 401/500 Response when the caller is not authorized, otherwise null. */
export function requireApiKey(request: Request): Response | null {
  const expected = process.env["CONSUMER_API_KEY"];
  if (!expected) return json({ error: "API not configured" }, 500);
  const provided =
    request.headers.get("x-api-key") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  if (!provided || !timingSafeEqual(provided, expected)) {
    return json({ error: "Unauthorized" }, 401);
  }
  return null;
}
