import { ThemeToggle } from "@/components/theme-toggle";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ShoppingBag,
  Package,
  CreditCard,
  ShieldCheck,
  BarChart3,
  Users,
  UserCog,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QSSF OS — The operating system for street food" },
      {
        name: "description",
        content:
          "QSSF OS powers premium street food brands. Orders, inventory, hygiene, staff, loyalty, and analytics — one platform.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "QSSF OS — The operating system for street food" },
      {
        property: "og:description",
        content:
          "QSSF OS powers premium street food brands. Orders, inventory, hygiene, staff, loyalty, and analytics — one platform.",
      },
    ],
  }),
  component: Landing,
});

const modules = [
  { icon: ShoppingBag, name: "Orders", desc: "Queue, kitchen display, and receipts." },
  { icon: Package, name: "Inventory", desc: "Live stock, waste, and reorder alerts." },
  { icon: CreditCard, name: "Payments", desc: "UPI and card reconciliation." },
  { icon: ShieldCheck, name: "Hygiene", desc: "Daily checklists and audits." },
  { icon: BarChart3, name: "Analytics", desc: "Sales, footfall, unit economics." },
  { icon: Users, name: "Customers", desc: "Loyalty, tiers, and campaigns." },
  { icon: UserCog, name: "Staff", desc: "Shifts, attendance, payroll." },
  { icon: Sparkles, name: "AI", desc: "Forecasts, insights, and copilots." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg gradient-heat" />
            <span className="text-lg font-semibold tracking-tight">QSSF OS</span>
          </div>
          <nav className="flex items-center gap-3">
            <ThemeToggle />
            <Link

              to="/auth"
              className="text-sm text-muted-foreground transition hover:text-foreground"
            >
              Sign in
            </Link>

            <Link
              to="/auth"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              Get started <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 pt-24 pb-20 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Onboarding platform for street food vendors
          </div>
          <h1 className="mx-auto mt-6 max-w-3xl text-5xl font-semibold tracking-tight md:text-7xl">
            The operating system for{" "}
            <span className="bg-clip-text text-transparent gradient-heat">street food</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Orders, inventory, payments, hygiene, staff, loyalty, and analytics — in a single,
            beautifully fast platform designed for vendors who care about the craft.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              Start free <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#modules"
              className="inline-flex items-center rounded-full border border-border px-6 py-3 text-sm font-medium transition hover:bg-accent"
            >
              Explore modules
            </a>
          </div>
        </section>

        <section id="modules" className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {modules.map((m) => (
              <div
                key={m.name}
                className="group rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40 hover:bg-card/80"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <m.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{m.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{m.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border/40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} QSSF OS</span>
          <span>Built for vendors, by vendors.</span>
        </div>
      </footer>
    </div>
  );
}
