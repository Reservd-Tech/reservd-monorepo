import { z } from "zod";

// A customer's receipt is a claim for reconciliation, never proof of payment.
export const checkoutPaymentSchema = z.object({
  reference: z.string().trim().min(6, "Enter the UPI reference from your payment receipt.").max(32).regex(/^[a-zA-Z0-9]+$/, "Use the reference from your UPI receipt.").optional(),
  declaredPaid: z.literal(true).optional(),
  app: z.string().max(40).optional(),
  amount: z.number().finite().positive(),
}).refine((payment) => Boolean(payment.reference) || payment.declaredPaid === true, "Confirm you've paid or enter your UPI receipt reference.");

export function checkoutPaymentNote(payment: z.infer<typeof checkoutPaymentSchema>) {
  return payment.reference ? `UPI ref: ${payment.reference}` : "Customer reports UPI paid; UTR not provided (showcase); payment unverified";
}

export function paymentAmountMatches(paidAmount: number, total: number) {
  return Math.round(paidAmount * 100) === Math.round(total * 100);
}