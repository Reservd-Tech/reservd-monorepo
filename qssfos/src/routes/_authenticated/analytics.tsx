import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — QSSF OS" },
      { name: "description", content: "Review street food shop sales and performance in QSSF OS." },
      { property: "og:title", content: "Analytics — QSSF OS" },
      { property: "og:description", content: "Review street food shop sales and performance in QSSF OS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PlaceholderPage
      title="Analytics"
      description="Sales, footfall, unit economics, and cohorts across outlets."
      icon={BarChart3}
      items={["Sales", "Footfall", "Margins", "Cohorts", "Menu mix", "Peak hours"]}
    />
  ),
});
