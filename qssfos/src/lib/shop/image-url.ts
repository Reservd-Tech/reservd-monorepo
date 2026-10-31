/**
 * Appends a cache-busting version marker to an image URL so browsers and the
 * consumer app never render a stale copy after a vendor uploads a new photo.
 */
export function withVersion(url: string | null | undefined, stamp?: string | number | null) {
  if (!url) return url ?? null;
  const version = stamp
    ? String(new Date(stamp).getTime() || stamp).replace(/[^0-9a-zA-Z]/g, "")
    : String(Date.now());
  if (!version) return url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("v", version);
    return parsed.toString();
  } catch {
    return url.includes("?") ? `${url}&v=${version}` : `${url}?v=${version}`;
  }
}
