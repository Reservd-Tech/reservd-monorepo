import { createFileRoute } from "@tanstack/react-router";
import { CreditCard } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";
import { StorefrontSettings } from "@/components/storefront/storefront-settings";

export const Route = createFileRoute("/_authenticated/payments")({
  head: () => ({
    meta: [
      { title: "Payments — QSSF OS" },
      { name: "description", content: "Review shop payments and reconciliation in QSSF OS." },
      { property: "og:title", content: "Payments — QSSF OS" },
      { property: "og:description", content: "Review shop payments and reconciliation in QSSF OS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaymentsPage,
});

function PaymentsPage() {
  return (
    <div className="space-y-6">
      <StorefrontSettings />
      <PlaceholderPage
        title="Payments"
        description="UPI and card reconciliation with automatic settlement tracking."
        icon={CreditCard}
        items={["UPI", "Cards", "Settlements", "Refunds", "Payouts"]}
      />
    </div>
  );
}
