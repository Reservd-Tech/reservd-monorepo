import type { StreetOsOrderAck } from "./client.server";

/**
 * Short-lived, in-isolate record of orders already accepted by Street OS,
 * keyed by the client-generated order reference. A retry of the exact same
 * checkout returns the original acknowledgement instead of creating a second
 * vendor order.
 */
type Entry = { expires: number; ack?: StreetOsOrderAck; inflight?: Promise<StreetOsOrderAck> };

const TTL_MS = 10 * 60 * 1000;
const store = new Map<string, Entry>();

function sweep() {
  const now = Date.now();
  for (const [key, entry] of store) if (entry.expires < now) store.delete(key);
}

export function getRecorded(ref: string): Entry | undefined {
  sweep();
  return store.get(ref);
}

export function recordInflight(ref: string, promise: Promise<StreetOsOrderAck>) {
  store.set(ref, { expires: Date.now() + TTL_MS, inflight: promise });
}

export function recordAck(ref: string, ack: StreetOsOrderAck) {
  store.set(ref, { expires: Date.now() + TTL_MS, ack });
}

export function forget(ref: string) {
  store.delete(ref);
}
