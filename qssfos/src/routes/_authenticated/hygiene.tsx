import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/hygiene")({
  head: () => ({
    meta: [
      { title: "Hygiene — QSSF OS" },
      { name: "description", content: "Manage kitchen hygiene and safety records in QSSF OS." },
      { property: "og:title", content: "Hygiene — QSSF OS" },
      { property: "og:description", content: "Manage kitchen hygiene and safety records in QSSF OS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PlaceholderPage
      title="Hygiene"
      description="Daily checklists, audits, and temperature logs to keep every outlet safe."
      icon={ShieldCheck}
      items={["Checklists", "Audits", "Temp logs", "Incidents", "Training", "Certifications"]}
    />
  ),
});
