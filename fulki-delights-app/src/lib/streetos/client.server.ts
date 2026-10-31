/**
 * Server-only client for the Street OS (vendor app) public order API.
 * The shared secret CONSUMER_API_KEY is read inside each call and is never
 * exposed to the browser.
 */

// Street OS deployments. The order intake endpoint currently only exists on the
// preview (dev) deployment; the published one 404s until Street OS is published.
const TIMEOUT_MS = 15000;

export class StreetOsError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function friendly(status: number, serverMessage?: string): string {
  if (status === 401 || status === 403) return "We couldn't reach the kitchen right now. Please try again shortly.";
  if (status === 404) return "That item or kitchen is no longer available.";
  if (status === 409) return serverMessage?.startsWith("Item unavailable") ? "An item in your cart is no longer available." : "The kitchen isn't accepting orders right now.";
  if (status === 400) return "Something in your order looks off. Please review your cart and try again.";
  if (status === 408) return "The kitchen took too long to respond. Please try again.";
  return "We couldn't send your order to the kitchen. Please try again.";
}

async function callStreetOs<T>(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown },
): Promise<T> {
  const apiKey = process.env["CONSUMER_API_KEY"];
  const baseUrl = process.env["STREET_OS_BASE_URL"] ?? "https://project--37c67ab8-188d-415f-8ada-5ea01131d8a9-dev.lovable.app";
  if (!apiKey) throw new StreetOsError("Ordering is temporarily unavailable.", 500);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: init.method,
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
      },
      ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
      signal: controller.signal,
    });
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    throw new StreetOsError(friendly(aborted ? 408 : 503), aborted ? 408 : 503);
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const serverMessage =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error: unknown }).error)
        : undefined;
    // Log details server-side only; the customer never sees API internals.
    console.error("[street-os]", init.method, path.replace(/\/orders\/[^/]+/, '/orders/[redacted]'), response.status);
    throw new StreetOsError(friendly(response.status, serverMessage), response.status);
  }

  return payload as T;
}

export type StreetOsOrderAck = {
  orderId: string;
  orderNumber: number;
  status: string;
  paymentStatus: string;
  subtotal: number;
  tax: number;
  total: number;
  createdAt: string;
};

export type StreetOsOrderPayload = {
  slug: string;
  orderType: "dine_in" | "takeaway";
  paymentMethod: "cash" | "upi";
  paymentStatus: "pending" | "paid";
  customerName?: string | undefined;
  customerPhone?: string | undefined;
  notes?: string | undefined;
  items: { productId: string; quantity: number }[];
};

export function submitOrderToStreetOs(payload: StreetOsOrderPayload) {
  return callStreetOs<StreetOsOrderAck>("/api/public/orders", { method: "POST", body: payload });
}

export type StreetOsOrder = {
  id: string;
  /** Scoped capability issued by Street OS only when rating support is enabled. */
  rating_token?: string | null;
  order_number: number;
  status: string;
  payment_status: string;
  payment_method: string;
  order_type: string;
  subtotal: number;
  tax: number;
  total: number;
  created_at: string;
  updated_at?: string;
  customer_name: string | null;
  payment_reference?: string | null;
  payment_app?: string | null;
  payment_claimed_at?: string | null;
  payment_confirmed_at?: string | null;
  storefronts: {
    slug: string;
    brand_name: string;
    upi_id: string | null;
    upi_payee_name: string | null;
    /** Optional vendor-uploaded QR image (Street OS). Absent on older backends. */
    upi_qr_url?: string | null;
  } | null;
  order_items: { id: string; product_id?: string | null; product_name: string; quantity: number; unit_price: number; line_total: number; rating?: number | null; rating_comment?: string | null }[];
};

export function submitFoodRating(data: { orderId: string; itemId: string; rating: number; token: string; comment?: string | undefined }) {
  return callStreetOs<{ itemId: string; rating: number; comment?: string | null }>(`/api/public/orders/${data.orderId}/ratings`, {
    method: 'POST', body: { itemId: data.itemId, rating: data.rating, token: data.token, ...(data.comment ? { comment: data.comment } : {}) },
  });
}

/** Customer claims they paid: attaches the UPI reference to the order in Street OS. */
export function claimOrderPayment(
  orderId: string,
  body: { reference: string; app?: string },
) {
  return callStreetOs<{ order: StreetOsOrder }>(`/api/public/orders/${orderId}/payment-claim`, {
    method: "POST",
    body,
  });
}

export async function fetchStreetOsOrder(orderId: string): Promise<StreetOsOrder | null> {
  try {
    const result = await callStreetOs<{ order: StreetOsOrder }>(`/api/public/orders/${orderId}`, {
      method: "GET",
    });
    return result?.order ?? null;
  } catch (error) {
    if (error instanceof StreetOsError && error.status === 404) return null;
    throw error;
  }
}

export type StreetOsStorefront = {
  id: string;
  slug: string;
  brand_name: string;
  upi_id?: string | null;
  upi_payee_name?: string | null;
  upi_qr_url?: string | null;
  tagline: string | null;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  opening_hours?: string | null;
  logo_url: string | null;
  cover_url: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_open: boolean;
  archived_at?: string | null;
};

export type StreetOsMenuProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category_id: string | null;
  is_available: boolean;
  is_veg?: boolean | null;
  avg_rating?: number | string | null;
  rating_count?: number | null;
};

export type StreetOsCategory = { id: string; name: string; sort_order: number };

/** All kitchens the vendor app exposes to consumers. */
export async function fetchStreetOsStorefronts(): Promise<StreetOsStorefront[]> {
  const result = await callStreetOs<{ storefronts: StreetOsStorefront[] }>(
    "/api/public/storefronts",
    { method: "GET" },
  );
  return result?.storefronts ?? [];
}

/** Storefront details plus its categories and available products. */
export async function fetchStreetOsMenu(slug: string): Promise<{
  storefront: StreetOsStorefront | null;
  categories: StreetOsCategory[];
  products: StreetOsMenuProduct[];
} | null> {
  try {
    const result = await callStreetOs<{
      storefront: StreetOsStorefront;
      categories: StreetOsCategory[];
      products: StreetOsMenuProduct[];
    }>(`/api/public/menu?slug=${encodeURIComponent(slug)}`, { method: "GET" });
    if (!result?.storefront) return null;
    return {
      storefront: result.storefront,
      categories: result.categories ?? [],
      products: result.products ?? [],
    };
  } catch (error) {
    if (error instanceof StreetOsError && error.status === 404) return null;
    throw error;
  }
}
