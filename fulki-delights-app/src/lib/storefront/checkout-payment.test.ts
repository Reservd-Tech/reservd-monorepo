import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkoutPaymentSchema, checkoutPaymentNote, paymentAmountMatches } from "./checkout-payment";

describe("payment before order submission", () => {
  it("requires a receipt or an explicit paid declaration before submission", () => {
    assert.equal(checkoutPaymentSchema.safeParse({ amount: 105 }).success, false);
    assert.equal(checkoutPaymentSchema.safeParse({ amount: 105, reference: "" }).success, false);
    assert.equal(checkoutPaymentSchema.safeParse({ amount: 105, reference: "412345678901" }).success, true);
  });
  it("temporarily permits I've paid without inventing a UTR or proof of payment", () => {
    const payment = checkoutPaymentSchema.parse({ amount: 105, declaredPaid: true });
    assert.equal(payment.reference, undefined);
    assert.equal(checkoutPaymentSchema.safeParse({ amount: 105, declaredPaid: false }).success, false);
    assert.equal(checkoutPaymentNote(payment), "Customer reports UPI paid; UTR not provided (showcase); payment unverified");
  });
  it("rejects a payment amount different from the current kitchen total", () => {
    assert.equal(paymentAmountMatches(105, 105), true);
    assert.equal(paymentAmountMatches(100, 105), false);
  });
});