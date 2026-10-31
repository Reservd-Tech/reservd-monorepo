import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/customers")({
  head: () => ({
    meta: [
      { title: "Customers — QSSF OS" },
      { name: "description", content: "Manage customer relationships for your street food business in QSSF OS." },
      { property: "og:title", content: "Customers — QSSF OS" },
      { property: "og:description", content: "Manage customer relationships for your street food business in QSSF OS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PlaceholderPage
      title="Customers"
      description="Loyalty tiers, campaigns, and lifetime value for every regular."
      icon={Users}
      items={["Profiles", "Loyalty", "Tiers", "Campaigns", "Feedback", "LTV"]}
    />
  ),
});
