import { describe, expect, test } from "bun:test";
import { aggregatePendingDemand, aggregateProduction, contributingOrders, isFullyPrepared } from "../src/lib/pos/production";
import type { OrderItem, OrderWithItems } from "../src/lib/pos/types";

let seq = 0;
function item(over: Partial<OrderItem>): OrderItem {
  seq += 1;
  return {
    id: `item-${seq}`, order_id: "o", product_id: "p-tea", product_name: "Tea",
    unit_price: 10, quantity: 1, line_total: 10, created_at: "2026-10-28T08:00:00Z",
    quantity_preparing: 0, quantity_prepared: 0, ...over,
  } as OrderItem;
}

function order(status: string, items: OrderItem[], created = "2026-10-28T08:00:00Z"): OrderWithItems {
  seq += 1;
  return {
    id: `o-${seq}`, order_number: seq, status, created_at: created, archived_at: null,
    order_items: items.map((i) => ({ ...i, order_id: `o-${seq}` })), customers: null,
  } as unknown as OrderWithItems;
}

describe("aggregateProduction", () => {
  test("sums outstanding quantities of the same item across orders (Test 1)", () => {
    const orders = [
      order("preparing", [item({ quantity: 3 })]),
      order("preparing", [item({ quantity: 2 })]),
      order("preparing", [item({ quantity: 5 })]),
    ];
    const lines = aggregateProduction(orders);
    expect(lines).toHaveLength(1);
    expect(lines[0].required).toBe(10);
    expect(lines[0].remaining).toBe(10);
    expect(lines[0].orderCount).toBe(3);
  });

  test("partial preparation keeps required = prepared + preparing + remaining (Test 2)", () => {
    const orders = [order("preparing", [item({ quantity: 10, quantity_preparing: 4, quantity_prepared: 3 })])];
    const line = aggregateProduction(orders)[0];
    expect(line.prepared).toBe(3);
    expect(line.preparing).toBe(4);
    expect(line.remaining).toBe(3);
    expect(line.required).toBe(line.prepared + line.preparing + line.remaining);
  });

  test("fully prepared items drop out of the queue", () => {
    const orders = [order("preparing", [item({ quantity: 2, quantity_prepared: 2 })])];
    expect(aggregateProduction(orders)).toHaveLength(0);
  });

  test("cancelled, completed and ready orders are excluded (Test 5)", () => {
    const orders = [
      order("cancelled", [item({ quantity: 5 })]),
      order("completed", [item({ quantity: 5 })]),
      order("ready", [item({ quantity: 5 })]),
      order("pending", [item({ quantity: 5 })]),
      order("preparing", [item({ quantity: 2 })]),
    ];
    const lines = aggregateProduction(orders);
    expect(lines).toHaveLength(1);
    expect(lines[0].required).toBe(2);
  });

  test("clamps impossible persisted values so quantities never go negative", () => {
    const orders = [
      order("preparing", [item({ quantity: 2, quantity_preparing: 5, quantity_prepared: 5 })]),
      order("preparing", [item({ quantity: 4, quantity_preparing: 9, product_id: "p-sam", product_name: "Samoosa" })]),
    ];
    const lines = aggregateProduction(orders);
    // The impossible Tea line has no outstanding work and drops out entirely.
    expect(lines).toHaveLength(1);
    const line = lines[0];
    expect(line.remaining).toBe(0);
    expect(line.prepared + line.preparing).toBeLessThanOrEqual(4);
  });

  test("oldest-first sort does not prioritize larger batches (Phase 3A)", () => {
    const orders = [
      order("preparing", [item({ quantity: 20, product_id: "p-new", product_name: "Samoosa" })], "2026-10-28T09:00:00Z"),
      order("preparing", [item({ quantity: 1 })], "2026-10-28T08:00:00Z"),
    ];
    const lines = aggregateProduction(orders, "oldest");
    expect(lines[0].name).toBe("Tea");
  });

  test("contributing orders map every allocated unit back to its order (Test 3)", () => {
    const a = order("preparing", [item({ quantity: 3 })], "2026-10-28T08:00:00Z");
    const b = order("preparing", [item({ quantity: 2, quantity_preparing: 1 })], "2026-10-28T08:05:00Z");
    const line = aggregateProduction([a, b])[0];
    const rows = contributingOrders([a, b], line);
    expect(rows).toHaveLength(2);
    expect(rows[0].orderId).toBe(a.id);
    expect(rows.reduce((sum, row) => sum + row.remaining + row.preparing, 0)).toBe(line.remaining + line.preparing);
  });
});

describe("aggregatePendingDemand", () => {
  test("counts only unaccepted orders", () => {
    const orders = [
      order("pending", [item({ quantity: 3 })]),
      order("preparing", [item({ quantity: 7 })]),
    ];
    expect(aggregatePendingDemand(orders)).toEqual([{ name: "Tea", units: 3 }]);
  });
});

describe("isFullyPrepared", () => {
  test("one unfinished item keeps the order out of ready (Test 4)", () => {
    const multi = order("preparing", [
      item({ quantity: 3, quantity_prepared: 3 }),
      item({ product_id: "p-sam", product_name: "Samoosa", quantity: 2, quantity_prepared: 1 }),
    ]);
    expect(isFullyPrepared(multi)).toBe(false);
    const done = order("preparing", [item({ quantity: 2, quantity_prepared: 2 })]);
    expect(isFullyPrepared(done)).toBe(true);
  });
});
