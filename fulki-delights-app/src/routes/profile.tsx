import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { LogOut, ReceiptText, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { useCustomer } from "@/lib/customer";
import { syncCustomer } from "@/lib/customer.functions";
import { endLocationSession } from "@/lib/location.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — Reservd" },
      {
        name: "description",
        content: "Manage your name and phone number for faster Fulki checkout.",
      },
      { property: "og:title", content: "Your profile — Reservd" },
      { property: "og:description", content: "Manage your Reservd ordering details." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { profile, saveProfile, orderIds, signOut, hydrated } = useCustomer();
  const sync = useServerFn(syncCustomer);
  const endSession = useServerFn(endLocationSession);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await endSession();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      signOut();
      setName("");
      setPhone("");
      setEmail("");
      toast.success("Signed out on this device");
    } catch (error) {
      console.error("[auth] sign-out failed", error);
      toast.error("Couldn't sign out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  };

  useEffect(() => {
    if (hydrated) {
      setName(profile.name);
      setPhone(profile.phone);
      setEmail(profile.email);
    }
  }, [hydrated, profile.name, profile.phone, profile.email]);

  return (
    <div className="min-h-screen px-5 pb-32 pt-10">
      <header className="flex min-w-0 items-center gap-3">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
          <UserRound className="h-7 w-7" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-extrabold">{profile.name || "Guest"}</h1>
          <p className="truncate text-sm text-muted-foreground">
            {profile.phone || profile.email || "Add your details"}
          </p>
        </div>
      </header>

      <section className="lift border border-line mt-8 space-y-4 rounded-lg bg-card p-5">
        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-normal text-muted-foreground">
            Name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-md border border-input bg-background px-4 py-3.5 text-base outline-none ring-ring/60 placeholder:text-muted-foreground focus:ring-2"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-normal text-muted-foreground">
            Email
          </span>
          <input
            value={email}
            type="email"
            inputMode="email"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="w-full rounded-md border border-input bg-background px-4 py-3.5 text-base outline-none ring-ring/60 placeholder:text-muted-foreground focus:ring-2"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-normal text-muted-foreground">
            Phone
          </span>
          <input
            value={phone}
            inputMode="tel"
            onChange={(e) => setPhone(e.target.value)}
            placeholder="98765 43210"
            className="w-full rounded-md border border-input bg-background px-4 py-3.5 text-base outline-none ring-ring/60 placeholder:text-muted-foreground focus:ring-2"
          />
        </label>
        <Button
          onClick={() => {
            const trimmed = { name: name.trim(), phone: phone.trim(), email: email.trim() };
            saveProfile(trimmed);
            if (trimmed.name && trimmed.phone.length >= 7) {
              void sync({ data: { name: trimmed.name, phone: trimmed.phone } }).catch(() => {});
            }
            toast.success("Details saved");
          }}
          className="press glow h-auto w-full rounded-lg bg-primary py-3.5 text-sm font-extrabold text-primary-foreground"
        >
          Save details
        </Button>
      </section>

      <Link
        to="/orders"
        className="press lift mt-4 flex items-center justify-between rounded-lg bg-card p-5"
      >
        <span className="flex items-center gap-3 font-bold">
          <ReceiptText className="h-5 w-5 text-primary" /> Order history
        </span>
        <span className="text-sm text-muted-foreground">{orderIds.length}</span>
      </Link>

      <Button
        variant="secondary"
        disabled={signingOut}
        onClick={() => void handleSignOut()}
        className="press mt-4 flex h-auto w-full items-center justify-center gap-2 rounded-lg bg-accent py-4 text-sm font-bold text-destructive"
      >
        <LogOut className="h-4 w-4" /> {signingOut ? "Signing out…" : "Log out"}
      </Button>
    </div>
  );
}
