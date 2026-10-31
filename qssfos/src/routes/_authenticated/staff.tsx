import { createFileRoute } from "@tanstack/react-router";
import { UserCog } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({
    meta: [
      { title: "Staff — QSSF OS" },
      { name: "description", content: "Manage your street food shop team in QSSF OS." },
      { property: "og:title", content: "Staff — QSSF OS" },
      { property: "og:description", content: "Manage your street food shop team in QSSF OS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PlaceholderPage
      title="Staff"
      description="Shifts, attendance, payroll, and training records."
      icon={UserCog}
      items={["Roster", "Shifts", "Attendance", "Payroll", "Training", "Roles"]}
    />
  ),
});
