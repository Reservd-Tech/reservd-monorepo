import { describe, expect, test } from "bun:test";
import { isActiveStage, selectedAtStage } from "../src/lib/pos/queue";

describe("peak-hour order selection", () => {
  test("bulk stage actions target only selected orders at that stage", () => {
    const orders = [
      { id: "new", status: "pending" as const },
      { id: "cooking", status: "preparing" as const },
      { id: "pickup", status: "ready" as const },
      { id: "unselected", status: "pending" as const },
    ];
    const selected = new Set(["new", "cooking", "pickup"]);
    expect(selectedAtStage(orders, selected, "pending").map((o) => o.id)).toEqual(["new"]);
    expect(selectedAtStage(orders, selected, "preparing").map((o) => o.id)).toEqual(["cooking"]);
    expect(selectedAtStage(orders, selected, "ready").map((o) => o.id)).toEqual(["pickup"]);
  });
  test("completed and cancelled orders stay out of the live queue", () => {
    expect(isActiveStage("completed")).toBe(false);
    expect(isActiveStage("cancelled")).toBe(false);
    expect(isActiveStage("pending")).toBe(true);
    expect(isActiveStage("preparing")).toBe(true);
    expect(isActiveStage("ready")).toBe(true);
  });
});
