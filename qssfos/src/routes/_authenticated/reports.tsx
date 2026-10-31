import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports — QSSF OS" },
      { name: "description", content: "Access business reports for your street food shop in QSSF OS." },
      { property: "og:title", content: "Reports — QSSF OS" },
      { property: "og:description", content: "Access business reports for your street food shop in QSSF OS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PlaceholderPage
      title="Reports"
      description="Daily, weekly, and monthly reports for owners and finance."
      icon={FileText}
      items={["DSR", "GST", "P&L", "Waste", "Custom", "Exports"]}
    />
  ),
});
