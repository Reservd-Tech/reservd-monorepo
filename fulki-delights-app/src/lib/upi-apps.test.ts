import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { targetedUpiLink, UPI_APPS } from "./upi";

describe("UPI app targeting", () => {
  it("targets the selected Android package instead of the generic WhatsApp-capable handler", () => {
    for (const app of UPI_APPS) {
      const link = targetedUpiLink("pa=merchant%40bank&am=105.00&cu=INR", app.key, "android");
      assert.ok(link?.includes(`package=${app.pkg};`));
      assert.equal(link?.startsWith("upi://"), false);
      assert.equal(link?.includes("com.whatsapp"), false);
    }
  });
  it("opens the named app's own UPI scheme on iOS", () => {
    for (const app of UPI_APPS) {
      const link = targetedUpiLink("pa=merchant%40bank&am=105.00&cu=INR", app.key, "ios");
      assert.ok(link?.startsWith(`${app.ios}?`));
      assert.ok(link?.includes("pa=merchant%40bank"));
      assert.equal(link?.includes("com.whatsapp"), false);
    }
  });
  it("uses QR fallback on other devices rather than opening an arbitrary UPI handler", () => {
    for (const app of UPI_APPS) assert.equal(targetedUpiLink("pa=merchant%40bank", app.key, "other"), null);
  });
});
