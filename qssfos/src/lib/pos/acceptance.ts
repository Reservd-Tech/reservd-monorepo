import type { OrderWithItems } from './types';

export interface IncomingDemand {
  key: string;
  productId: string | null;
  name: string;
  units: number;
  orders: OrderWithItems[];
  oldestAt: string;
}

export function incomingDemand(orders: OrderWithItems[]): IncomingDemand[] {
  const rows = new Map<string, IncomingDemand>();
  for (const order of orders) {
    if (order.status !== 'pending' || order.archived_at) continue;
    for (const item of order.order_items) {
      const key = item.product_id ?? `name:${item.product_name}`;
      const row = rows.get(key) ?? { key, productId: item.product_id, name: item.product_name, units: 0, orders: [], oldestAt: order.created_at };
      row.units += item.quantity;
      if (!row.orders.some((o) => o.id === order.id)) row.orders.push(order);
      if (order.created_at < row.oldestAt) row.oldestAt = order.created_at;
      rows.set(key, row);
    }
  }
  return [...rows.values()].sort((a, b) => a.oldestAt.localeCompare(b.oldestAt) || a.key.localeCompare(b.key));
}

/** Strict FIFO: never skip an older complete order to fit newer demand. */
export function allocateWholeOrders(row: IncomingDemand, capacity: number) {
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > row.units) return { orders: [], quantity: 0 };
  const selected: OrderWithItems[] = [];
  let quantity = 0;
  for (const order of [...row.orders].sort((a,b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))) {
    const units = order.order_items.filter((i) => (i.product_id ?? `name:${i.product_name}`) === row.key).reduce((sum,i) => sum+i.quantity,0);
    if (quantity + units > capacity) break;
    quantity += units;
    selected.push(order);
  }
  return { orders: selected, quantity };
}