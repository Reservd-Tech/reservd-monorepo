import { describe, it as test } from "node:test";
import assert from "node:assert/strict";
import { cartSuggestions, filterDiet, prepareReorder } from "./consumer-catalog";
import type { MenuProduct } from "./queries";

const product = (id: string, isVeg: boolean | null, available = true): MenuProduct => ({
  id, name: id, price: 80, image_url: `/images/${id}.jpg`, description: null,
  category_id: null, is_available: available, is_veg: isVeg,
});

describe("consumer catalog rules", () => {
  test("Veg only accepts true, excluding false, null and missing classifications", () => {
    const unknown = product("unknown", null);
    delete unknown.is_veg;
    assert.deepEqual(filterDiet([product("veg", true), product("meat", false), product("null", null), unknown], true).map((p) => p.id), ["veg"]);
  });
  test("turning Veg only off restores all available products", () => {
    assert.deepEqual(filterDiet([product("veg", true), product("meat", false), product("sold", true, false)], false).map((p) => p.id), ["veg", "meat"]);
  });
  test("upsell excludes unavailable products and existing cart IDs", () => {
    assert.deepEqual(cartSuggestions([product("cart", true), product("extra", true), product("sold", true, false)], [{ productId: "cart" }]).map((p) => p.id), ["extra"]);
  });
  test("reorder preserves historical fields and quantity but uses current product image", () => {
    const result = prepareReorder([{ product_id: "a", product_name: "Original name", unit_price: 60, quantity: 3 }], [product("a", true)]);
    assert.deepEqual(result.lines, [{ productId: "a", name: "Original name", price: 60, quantity: 3, imageUrl: "/images/a.jpg" }]);
  });
  test("reorder skips removed, unavailable, and unidentifiable products by name", () => {
    const result = prepareReorder([
      { product_id: "removed", product_name: "Removed dish", unit_price: 60, quantity: 1 },
      { product_id: "sold", product_name: "Sold out dish", unit_price: 60, quantity: 1 },
      { product_name: "Missing ID dish", unit_price: 60, quantity: 1 },
    ], [product("sold", true, false)]);
    assert.deepEqual(result.lines, []);
    assert.deepEqual(result.skipped, ["Removed dish", "Sold out dish", "Missing ID dish"]);
  });
});