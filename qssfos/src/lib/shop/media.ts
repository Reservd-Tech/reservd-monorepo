import { supabase } from "@/integrations/supabase/client";
import { withVersion } from "@/lib/shop/image-url";

const BUCKET = "shop-media";
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

/** Uploads an image and returns a long-lived signed URL for display. */
export async function uploadShopImage(file: File, folder: string): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file");
  if (file.size > 10 * 1024 * 1024) throw new Error("Image must be under 10MB");

  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id ?? "anon";
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${uid}/${folder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;

  const { data, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, TEN_YEARS);
  if (signErr) throw signErr;
  // Version marker guarantees fresh renders everywhere the URL is shown.
  return withVersion(data.signedUrl) as string;
}
