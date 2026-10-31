import { supabase } from "@/integrations/supabase/client";

const BUCKET = "vendor-documents";

/**
 * Uploads a compliance document (FSSAI certificate, ID proof) to the private
 * bucket and returns its storage path. Paths are stored in the database — the
 * file itself is only reachable through a short-lived signed link.
 */
export async function uploadVendorDocument(file: File, folder: string): Promise<string> {
  const okTypes = ["image/", "application/pdf"];
  if (!okTypes.some((t) => file.type.startsWith(t))) {
    throw new Error("Please upload an image or a PDF");
  }
  if (file.size > 10 * 1024 * 1024) throw new Error("File must be under 10MB");

  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) throw new Error("You must be signed in");

  const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
  const path = `${uid}/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  return path;
}

/** Creates a 5-minute signed link so a vendor or admin can view a document. */
export async function signedDocumentUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 300);
  if (error) throw error;
  return data.signedUrl;
}
