import type { OrderItem, OrderWithItems } from "./types";

/** One aggregated row of the production queue: a menu item across all accepted orders. */
export interface ProductionLine {
  key: string;
  productId: string | null;
  name: string;
  /** Total units required across accepted, unfulfilled orders. */
  required: number;
  /** Units currently being prepared. */
  preparing: number;
  /** Units already prepared. */
  prepared: number;
  /** Units not yet started: required − prepared − preparing. */
  remaining: number;
  /** Distinct orders still contributing outstanding units. */
  orderCount: number;
  /** created_at of the oldest order with outstanding units. */
  oldestAt: string;
  orderIds: string[];
}

export interface ContributingOrder {
  orderId: string;
  orderNumber: number;
  createdAt: string;
  quantity: number;
  preparing: number;
  prepared: number;
  remaining: number;
}

export type ProductionSort = "oldest" | "remaining" | "name";

function itemKey(item: OrderItem): string {
  return item.product_id ?? `name:${item.product_name.trim().toLowerCase()}`;
}

/** Accepted orders whose items still count as active production demand. */
export function productionOrders(orders: OrderWithItems[]): OrderWithItems[] {
  return orders.filter((order) => order.status === "preparing" && !order.archived_at);
}

/**
 * Aggregates outstanding order-item quantities by menu item.
 * Cancelled, rejected, completed and ready orders are excluded because only
 * "preparing" orders are considered. remaining is never negative and never
 * double-counts: required = prepared + preparing + remaining per line.
 */
export function aggregateProduction(orders: OrderWithItems[], sort: ProductionSort = "oldest"): ProductionLine[] {
  const lines = new Map<string, ProductionLine>();
  const contributing = new Map<string, Set<string>>();
  for (const order of productionOrders(orders)) {
    for (const item of order.order_items) {
      const key = itemKey(item);
      const prepared = Math.min(item.quantity_prepared, item.quantity);
      const preparing = Math.min(item.quantity_preparing, item.quantity - prepared);
      const remaining = Math.max(0, item.quantity - prepared - preparing);
      let line = lines.get(key);
      if (!line) {
        line = {
          key,
          productId: item.product_id,
          name: item.product_name,
          required: 0,
          preparing: 0,
          prepared: 0,
          remaining: 0,
          orderCount: 0,
          oldestAt: order.created_at,
          orderIds: [],
        };
        lines.set(key, line);
        contributing.set(key, new Set());
      }
      line.required += item.quantity;
      line.preparing += preparing;
      line.prepared += prepared;
      line.remaining += remaining;
      if (preparing + remaining > 0) {
        const ordersForItem = contributing.get(key)!;
        if (!ordersForItem.has(order.id)) {
          ordersForItem.add(order.id);
          line.orderIds.push(order.id);
          if (order.created_at < line.oldestAt) line.oldestAt = order.created_at;
        }
      }
    }
  }
  const result = [...lines.values()].filter((line) => line.remaining + line.preparing > 0);
  for (const line of result) line.orderCount = line.orderIds.length;
  result.sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "remaining") return b.remaining - a.remaining || a.oldestAt.localeCompare(b.oldestAt);
    // Default: oldest outstanding work first — never priority by batch size alone.
    return a.oldestAt.localeCompare(b.oldestAt) || a.name.localeCompare(b.name);
  });
  return result;
}

/** Per-order quantity breakdown for one aggregated production line. */
export function contributingOrders(orders: OrderWithItems[], line: ProductionLine): ContributingOrder[] {
  return productionOrders(orders)
    .filter((order) => line.orderIds.includes(order.id))
    .map((order) => {
      const items = order.order_items.filter((item) => itemKey(item) === line.key);
      const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
      const prepared = items.reduce((sum, item) => sum + Math.min(item.quantity_prepared, item.quantity), 0);
      const preparing = items.reduce((sum, item) => sum + Math.min(item.quantity_preparing, item.quantity), 0);
      return {
        orderId: order.id,
        orderNumber: order.order_number,
        createdAt: order.created_at,
        quantity,
        preparing,
        prepared,
        remaining: Math.max(0, quantity - prepared - preparing),
      };
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Item demand in orders not yet accepted — informational only, never part of production. */
export function aggregatePendingDemand(orders: OrderWithItems[]): Array<{ name: string; units: number }> {
  const demand = new Map<string, number>();
  for (const order of orders) {
    if (order.status !== "pending" || order.archived_at) continue;
    for (const item of order.order_items) {
      demand.set(item.product_name, (demand.get(item.product_name) ?? 0) + item.quantity);
    }
  }
  return [...demand.entries()].map(([name, units]) => ({ name, units })).sort((a, b) => b.units - a.units);
}

/** Compact item summary, e.g. "Tea × 3 · Samosa × 2". */
export function summarizeItems(order: OrderWithItems): string {
  return order.order_items.map((item) => `${item.product_name} × ${item.quantity}`).join(" · ");
}

export function totalUnits(order: OrderWithItems): number {
  return order.order_items.reduce((sum, item) => sum + item.quantity, 0);
}

/** Whole minutes elapsed since an ISO timestamp; never negative. */
export function elapsedMinutes(iso: string, now: number = Date.now()): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
}

export function formatElapsed(minutes: number): string {
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

/** An order is ready only when every unit of every line is prepared. */
export function isFullyPrepared(order: OrderWithItems): boolean {
  return order.order_items.every((item) => item.quantity_prepared >= item.quantity);
}
