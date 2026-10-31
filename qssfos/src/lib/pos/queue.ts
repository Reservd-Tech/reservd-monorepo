import type { OrderStatus } from "./types";

export type ActiveStage = "pending" | "preparing" | "ready";

export const STAGES: Array<{ status: ActiveStage; label: string; action: string }> = [
  { status: "pending", label: "New", action: "Accept" },
  { status: "preparing", label: "Preparing", action: "Mark ready" },
  { status: "ready", label: "Ready", action: "Complete" },
];

export function isActiveStage(status: OrderStatus): status is ActiveStage {
  return status === "pending" || status === "preparing" || status === "ready";
}

export function selectedAtStage<T extends { id: string; status: OrderStatus }>(
  orders: T[], selected: ReadonlySet<string>, stage: ActiveStage,
): T[] {
  return orders.filter((order) => selected.has(order.id) && order.status === stage);
}