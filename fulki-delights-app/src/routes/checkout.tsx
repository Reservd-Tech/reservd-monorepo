import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueries } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, ChevronLeft, Clock, Minus, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { placePublicOrder } from "@/lib/storefront/orders.functions";
// Slots are generated in IST and update live; orders go straight to Street Vendor OS.
import { money, nearbyStorefrontsQuery, sfKeys, TAX_RATE } from "@/lib/storefront/queries";
import { useCustomer } from "@/lib/customer";
import { getMenu } from "@/lib/storefront/catalog.functions";
import { UpiPaymentSheet } from "@/components/UpiPaymentSheet";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Reservd" },
      { name: "description", content: "Confirm your order, choose dine in or takeaway, and pay by UPI." },
      { property: "og:title", content: "Checkout — Reservd" },
      { property: "og:description", content: "Confirm your order in seconds." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Checkout,
});

const SLUG_FALLBACK = "fulki";


const SLOT_MINUTES = 15;
const LEAD_MINUTES = 10;
const OPEN_HOUR = 9; // 9:00 AM IST
const CLOSE_HOUR = 22; // last slot starts before 10:00 PM IST

/** A Date shifted so local getters read as IST wall-clock time. */
function toIst(date: Date) {
  return new Date(date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
}

type DayOption = { key: string; label: string; sub: string; date: Date };

function buildDays(nowIst: Date): DayOption[] {
  return [0, 1].map((offset) => {
    const date = new Date(nowIst);
    date.setDate(date.getDate() + offset);
    return {
      key: date.toDateString(),
      label: offset === 0 ? "Today" : "Tomorrow",
      sub: date.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      date,
    };
  });
}

/** All 15-minute slots for a day, dropping past/too-soon slots for today. */
function buildSlots(day: Date, nowIst: Date, isToday: boolean) {
  const earliest = new Date(nowIst.getTime() + LEAD_MINUTES * 60_000);
  const slots: Date[] = [];
  const start = new Date(day);
  start.setHours(OPEN_HOUR, 0, 0, 0);
  const end = new Date(day);
  end.setHours(CLOSE_HOUR, 0, 0, 0);
  for (let t = start.getTime(); t < end.getTime(); t += SLOT_MINUTES * 60_000) {
    const slot = new Date(t);
    if (isToday && slot < earliest) continue;
    slots.push(slot);
  }
  return slots;
}

function slotLabel(date: Date) {
  return date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
}

function Checkout() {
  const navigate = useNavigate();
  const { cart, cartSubtotal, setQuantity, clearCart, profile, saveProfile, rememberOrder, hydrated } =
    useCustomer();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [orderType, setOrderType] = useState<"dine_in" | "takeaway">("dine_in");
  const paymentMethod = "upi" as const;
  const { data: storefronts } = useQuery(nearbyStorefrontsQuery());
  const fetchMenu = useServerFn(getMenu);
  const menus = useQueries({ queries: (storefronts ?? []).map((storefront) => ({
    queryKey: sfKeys.menu(storefront.slug),
    queryFn: () => fetchMenu({ data: { slug: storefront.slug } }),
    staleTime: 5_000,
  })) });
  const paymentMenu = menus.find((menu) => cart.length > 0 && cart.every((line) => menu.data?.products.some((product) => product.id === line.productId)))?.data;
  const slug = paymentMenu?.storefront?.slug ?? storefronts?.[0]?.slug ?? SLUG_FALLBACK;
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<string | undefined>();
  const [receipt, setReceipt] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | null>(null);
  const kitchen = paymentMenu?.storefront;
  const hasPayment = Boolean(kitchen?.upi_id || kitchen?.upi_qr_url);
  const kitchenMatchesCart = cart.every((line) => paymentMenu?.products.some((product) => product.id === line.productId && product.is_available && Number(product.price) === line.price));

  const [clientRef] = useState(() => crypto.randomUUID());
  const [now, setNow] = useState<Date | null>(null);
  const [dayKey, setDayKey] = useState<string | null>(null);
  const [slotIso, setSlotIso] = useState<string | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const nowIst = now ? toIst(now) : null;
  const days = nowIst ? buildDays(nowIst) : [];
  const selectedDay = days.find((d) => d.key === dayKey) ?? days[0] ?? null;
  const slots =
    selectedDay && nowIst ? buildSlots(selectedDay.date, nowIst, selectedDay.key === days[0]?.key) : [];
  const slotKey = slots.map((s) => s.toISOString()).join(",");

  useEffect(() => {
    if (!slotKey) return;
    const isos = slotKey.split(",");
    setSlotIso((prev) => (prev && isos.includes(prev) ? prev : isos[0] ?? null));
  }, [slotKey]);


  useEffect(() => {
    if (hydrated) {
      setName(profile.name);
      setPhone(profile.phone);
    }
  }, [hydrated, profile.name, profile.phone]);

  const placeOrder = useServerFn(placePublicOrder);
  const mutation = useMutation({
    mutationFn: placeOrder,
    onSuccess: (result) => {
      if (receipt && !result.paymentClaimSaved) toast.error("Your order was sent, but the payment reference couldn't be saved. Add it on the tracking screen; do not pay again.");
      saveProfile({ name: name.trim(), phone: phone.trim() });
      rememberOrder(result.orderId);
      clearCart();
      navigate({ to: "/order/$orderId", params: { orderId: result.orderId } });
    },
    onError: (error: Error) => toast.error(error.message || "Could not place your order"),
    retry: false,
  });

  const tax = Math.round(cartSubtotal * TAX_RATE * 100) / 100;
  const total = Math.round((cartSubtotal + tax) * 100) / 100;
  const canSubmit =
    cart.length > 0 && hasPayment && kitchenMatchesCart &&
    Boolean(slotIso) &&
    name.trim().length > 1 &&
    /^\d{7,15}$/.test(phone.replace(/\D/g, ""));

  const submit = (reference?: string) => {
    if (!canSubmit || mutation.isPending) return Promise.reject(new Error("Review your details and selected slot before submitting."));
    setReceipt(reference ?? "");
    return mutation.mutateAsync({
      data: {
        clientRef,
        slug,
        orderType,
        paymentMethod,
        payment: { ...(reference ? { reference } : { declaredPaid: true as const }), app: selectedApp, amount: paymentAmount ?? total },
        customerName: name.trim(),
        customerPhone: phone.trim(),
        notes: slotIso ? `Pickup slot: ${slotLabel(new Date(slotIso))}` : undefined,
        items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      },
    });
  };



  return (
    <div className="min-h-screen px-5 pb-40 pt-6">
      <header className="flex items-center gap-3">
        <Link
          to="/"
          className="press glass-panel grid h-10 w-10 shrink-0 place-items-center rounded-full"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="truncate text-2xl font-extrabold">Checkout</h1>
      </header>

      {cart.length === 0 ? (
        <div className="glass-panel mt-8 rounded-lg p-6 text-center">
          <p className="text-sm text-muted-foreground">Your cart is empty.</p>
          <Link
            to="/menu/$slug"
            params={{ slug }}
            className="press mt-4 inline-block rounded-lg bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
          >
            Browse menu
          </Link>
        </div>
      ) : (
        <>
          <section className="stagger mt-6 space-y-3">
            {cart.map((line) => (
              <div key={line.productId} className="lift flex items-center gap-3 rounded-lg bg-card p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{line.name}</p>
                  <p className="text-sm text-muted-foreground">{money(line.price)} each</p>
                </div>
                <div className="flex shrink-0 items-center gap-1 rounded-lg bg-accent p-1">
                  <Button
                    onClick={() => setQuantity(line.productId, line.quantity - 1)}
                    variant="ghost" size="icon" className="press grid h-9 w-9 place-items-center rounded-xl"
                    aria-label="Decrease quantity"
                  >
                    {line.quantity === 1 ? <Trash2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                  </Button>
                  <span className="w-6 text-center font-bold tabular-nums">{line.quantity}</span>
                  <Button
                    onClick={() => setQuantity(line.productId, line.quantity + 1)}
                    variant="ghost" size="icon" className="press grid h-9 w-9 place-items-center rounded-xl"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </section>

          <section className="mt-6 space-y-4">
            <Field label="Your name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Aditi Sharma"
                className="h-13 w-full rounded-md border border-input bg-background px-4 py-3.5 text-base outline-none ring-ring/60 placeholder:text-muted-foreground focus:ring-2"
              />
            </Field>
            <Field label="Phone number">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                placeholder="98765 43210"
                className="w-full rounded-md border border-input bg-background px-4 py-3.5 text-base outline-none ring-ring/60 placeholder:text-muted-foreground focus:ring-2"
              />
            </Field>

            <Field label="Order type">
              <Segmented
                value={orderType}
                onChange={setOrderType}
                options={[
                  { value: "dine_in", label: "Dine in" },
                  { value: "takeaway", label: "Takeaway" },
                ]}
              />
            </Field>

            <Field label="Payment method">
              <div className="rounded-md bg-accent px-4 py-3.5 text-sm font-bold text-accent-foreground">
                UPI — pay before submitting your order
              </div>
            </Field>


            <Field label="Select date">
              <div className="grid grid-cols-2 gap-2">
                {days.map((day) => {
                  const active = selectedDay?.key === day.key;
                  return (
                    <Button
                      key={day.key}
                      type="button"
                      onClick={() => setDayKey(day.key)}
                      className={
                        "press flex h-auto flex-col items-center gap-0.5 rounded-full border py-3 " +
                        (active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-line bg-card text-muted-foreground")
                      }
                    >
                      <span className="text-sm font-bold">{day.label}</span>
                      <span className={active ? "text-xs text-primary-foreground/80" : "text-xs text-muted-foreground"}>{day.sub}</span>
                    </Button>
                  );
                })}
              </div>
            </Field>

            <Field label="Select time (IST)">
              {slots.length === 0 ? (
                nowIst ? (
                  <div className="rounded-lg bg-accent p-4 text-center text-sm text-muted-foreground">
                    No more slots today — pick tomorrow.
                  </div>
                ) : (
                  <div className="h-[120px] w-full animate-pulse rounded-lg bg-accent" />
                )
              ) : (
                <div className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto pr-1">
                  {slots.map((slot) => {
                    const iso = slot.toISOString();
                    const active = iso === slotIso;
                    return (
                      <Button
                        key={iso}
                        type="button"
                        onClick={() => setSlotIso(iso)}
                        className={
                          "press flex h-auto items-center justify-center gap-1.5 rounded-full border px-2 py-3 text-sm font-bold tabular-nums " +
                          (active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-line bg-card text-muted-foreground")
                        }
                      >
                        <Clock className="h-3.5 w-3.5 opacity-70" />
                        {slotLabel(slot)}
                      </Button>
                    );
                  })}
                </div>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                15-minute slots · today’s slots start at least 10 minutes from now
              </p>
            </Field>
          </section>


          <section className="glass-panel mt-6 space-y-2 rounded-lg p-5 text-sm">
            <Row label="Subtotal" value={money(cartSubtotal)} />
            <Row label="Taxes" value={money(tax)} />
            <div className="mt-2 flex items-center justify-between border-t border-border pt-3 text-lg font-extrabold">
              <span>Total</span>
              <span className="text-primary">{money(total)}</span>
            </div>
          </section>

          {mutation.isError ? (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-4"
            >
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-destructive">Order not placed</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {mutation.error?.message || "We couldn't send your order to the kitchen."}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    If you completed UPI payment, do not pay again. Your cart is safe; retry with the same receipt.
                  </p>
                  <Button
                    type="button"
                    onClick={() => { if (receipt !== null) void submit(receipt || undefined).catch(() => {}); }}
                    disabled={mutation.isPending}
                    className="press mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
                  >
                    <RefreshCw className={"h-4 w-4 " + (mutation.isPending ? "animate-spin" : "")} />
                    Try again
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {!hasPayment && paymentMenu ? <p role="alert" className="mt-4 text-sm text-destructive">This kitchen hasn't enabled online payment. Ordering is unavailable.</p> : null}
          {paymentOpen && kitchen && hasPayment ? (
            <div className="mt-6">
              <UpiPaymentSheet
                beforeOrder
                orderId={clientRef}
                upiId={kitchen.upi_id ?? null}
                payeeName={kitchen.upi_payee_name ?? kitchen.brand_name}
                qrImageUrl={kitchen.upi_qr_url ?? null}
                amount={paymentAmount ?? total}
                note={`Reservd ${clientRef.slice(0, 8)}`}
                brandName={kitchen.brand_name}
                onAppSelected={setSelectedApp}
                onPaidWithoutReference={async () => { await submit(); }}
                onSaveReference={async (reference) => { await submit(reference); }}
              />
            </div>
          ) : null}
          <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button
              disabled={!canSubmit || mutation.isPending}
              onClick={() => { setPaymentAmount((prev) => prev ?? total); setPaymentOpen(true); }}
              className="press glow h-auto w-full rounded-lg py-4 text-base font-extrabold disabled:opacity-50 disabled:shadow-none"
            >
              {mutation.isPending
                ? "Placing order…"
                : paymentOpen ? "Complete payment above" : `Pay · ${money(total)}`}
            </Button>
          </div>

        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block rounded-lg border border-line bg-card p-5 shadow-food">
      <span className="mb-2 block text-xs font-bold uppercase tracking-normal text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-lg bg-accent p-1.5">
      {options.map((option) => (
        <Button
          variant="ghost"
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={
            "press h-auto rounded-md py-3 text-sm font-bold " +
            (value === option.value
              ? "bg-primary text-primary-foreground"
              : "bg-transparent text-muted-foreground")
          }
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}