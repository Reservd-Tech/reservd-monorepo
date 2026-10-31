import { useEffect, useState } from "react";

export type Coords = { latitude: number; longitude: number };
export type NearbyStatus = "idle" | "asking" | "ready" | "denied" | "unavailable";

const CACHE_KEY = "reservd:coords";
const CACHE_TTL_MS = 10 * 60 * 1000;

type Cached = Coords & { timestamp: number };

function readCache(): Coords | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) return null;
    return { latitude: parsed.latitude, longitude: parsed.longitude };
  } catch {
    return null;
  }
}

export function useNearby(): { coords: Coords | null; status: NearbyStatus } {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [status, setStatus] = useState<NearbyStatus>("idle");

  useEffect(() => {
    const cached = readCache();
    if (cached) {
      setCoords(cached);
      setStatus("ready");
      return;
    }
    if (!("geolocation" in navigator)) {
      setStatus("unavailable");
      return;
    }
    setStatus("asking");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ ...next, timestamp: Date.now() }));
        } catch {
          /* ignore */
        }
        setCoords(next);
        setStatus("ready");
      },
      (err) => {
        setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable");
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }, []);

  return { coords, status };
}
