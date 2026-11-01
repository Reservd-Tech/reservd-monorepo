import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

export const grantVerifiedLocationSession = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        accessToken: z.string().min(1),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const supabaseUrl = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
    const supabaseKey =
      process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_ANON_KEY"];
    const secret = process.env["OTP_SIGNING_SECRET"];

    if (!supabaseUrl || !supabaseKey || !secret) {
      throw new Error("Supabase auth and OTP_SIGNING_SECRET must be configured on the server");
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: claims, error } = await supabase.auth.getClaims(data.accessToken);
    if (error || !claims?.claims?.sub) {
      throw new Error("A valid Supabase session is required to grant location access");
    }

    const { grantLocationSession } = await import("./location-session.server");
    const { getRequest } = await import("@tanstack/react-start/server");
    await grantLocationSession(secret, new URL(getRequest().url).protocol === "https:");
    return { ok: true as const };
  });
