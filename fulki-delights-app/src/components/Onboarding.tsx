import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Clock, MapPin, Minus, Plus, Store, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BrandLogo } from "@/components/BrandLogo";
import bowl from "@/assets/onboarding-bowl.png";
import matcha from "@/assets/onboarding-matcha.png";

export const ONBOARDING_KEY = "reservd:onboarding-seen";

const STEPS = [
  { tag: "Welcome", title: "Order ahead. Skip the wait.", body: "Food from kitchens near you — ready by the time you reach." },
  { tag: "1 · Browse", title: "Kitchens near you", body: "See what’s open and how close — in real time." },
  { tag: "2 · Order & pay", title: "Add, then pay by UPI", body: "Pick your dishes and pay directly — your money, straight to the kitchen." },
  { tag: "3 · Collect", title: "Skip the queue", body: "Track it live and walk up when it’s ready." },
];

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const touchX = useRef<number | null>(null);
  const last = step === STEPS.length - 1;
  const finish = () => {
    try {
      localStorage.setItem(ONBOARDING_KEY, "1");
    } catch {}
    onDone();
  };
  const go = (n: number) => setStep(Math.max(0, Math.min(STEPS.length - 1, n)));
  const slide = STEPS[step];
  if (!slide) return null;

  return (
    <div className="onboarding-flow flex min-h-svh flex-col bg-background px-6 pb-7 pt-6 sm:px-8"
      onTouchStart={(e) => { touchX.current = e.touches[0]?.clientX ?? null; }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = (e.changedTouches[0]?.clientX ?? touchX.current) - touchX.current;
        if (Math.abs(dx) > 50) go(step + (dx < 0 ? 1 : -1));
        touchX.current = null;
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") { e.preventDefault(); go(step + 1); }
        if (e.key === "ArrowLeft") { e.preventDefault(); go(step - 1); }
      }}>
      <header className="flex h-11 shrink-0 items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">{String(step + 1).padStart(2, "0")} / 04</span>
        <Button variant="ghost" onClick={finish} className="h-11 text-sm font-bold text-muted-foreground">Skip</Button>
      </header>

      <section aria-live="polite" aria-atomic="true" aria-label="Welcome slides" className="flex flex-1 flex-col justify-center py-5">
        <div key={step} className="onboarding-slide">
          <div className="onboarding-entrance onboarding-visual relative mx-auto w-full max-w-sm" aria-hidden="true">
            {step === 0 && <WelcomeVisual />}
            {step === 1 && <BrowseVisual />}
            {step === 2 && <OrderVisual />}
            {step === 3 && <CollectVisual />}
          </div>
          <div className="onboarding-entrance onboarding-copy mx-auto mt-7 max-w-sm text-center">
            <span className="text-xs font-bold text-primary">{slide.tag}</span>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight">
              {step === 0 ? <>Order ahead.<br /><span className="text-primary">Skip the wait.</span></> : slide.title}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{slide.body}</p>
          </div>
        </div>
      </section>

      <footer className="shrink-0">
        <p className="mx-auto max-w-sm text-center text-[11px] leading-relaxed text-muted-foreground">Preview only — nothing here is ordered or paid.</p>
        <div className="my-4 flex justify-center" role="group" aria-label="Welcome progress">
          {STEPS.map((s, i) => (
            <Button key={s.tag} variant="ghost" size="icon" className="h-10 w-10 rounded-full" aria-label={`Go to slide ${i + 1}: ${s.tag}`} aria-current={i === step ? "step" : undefined} onClick={() => go(i)}>
              <span className={`h-2.5 w-2.5 rounded-full transition-colors ${i === step ? "bg-primary" : "bg-border"}`} />
            </Button>
          ))}
        </div>
        <div className="flex gap-3">
          <Button variant="outline" disabled={step === 0} onClick={() => go(step - 1)} className="h-13 rounded-lg bg-card px-5"><ArrowLeft className="h-4 w-4" />Back</Button>
          <Button onClick={() => last ? finish() : go(step + 1)} className="h-13 flex-1 rounded-lg font-bold">{last ? "Get started" : "Next"}<ArrowRight className="h-4 w-4" /></Button>
        </div>
      </footer>
    </div>
  );
}

function WelcomeVisual() {
  return <div className="relative flex h-full flex-col items-center justify-center">
    <BrandLogo className="absolute top-0 z-10 w-44" />
    <div className="onboarding-food-bowl absolute bottom-0 left-0 grid h-36 w-36 place-items-center rounded-lg border border-line bg-card shadow-food">
      <img src={bowl} width={816} height={816} decoding="async" alt="" className="h-32 w-32 object-contain" />
    </div>
    <div className="onboarding-food-matcha absolute bottom-1 right-0 grid h-32 w-28 place-items-center rounded-lg border border-line bg-accent shadow-food">
      <img src={matcha} width={816} height={816} decoding="async" alt="" className="h-28 w-24 object-contain" />
    </div>
  </div>;
}
function BrowseVisual() {
  return <div className="relative flex h-full items-center justify-center px-3">
    <div className="w-full overflow-hidden rounded-lg border border-line bg-card shadow-food">
      <div className="relative flex h-36 items-center justify-center bg-accent">
        <img src={bowl} width={816} height={816} loading="lazy" decoding="async" alt="" className="h-36 w-36 object-contain" />
        <Badge className="absolute left-4 top-4 border-0 bg-card text-primary">OPEN</Badge>
      </div>
      <div className="p-5"><p className="flex items-center gap-2 font-display text-lg font-bold"><Store className="h-4 w-4 text-primary" />Your neighbourhood kitchen</p>
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground"><Clock className="h-3.5 w-3.5" />5 min walk</span>
      </div>
    </div>
    <span className="onboarding-location absolute bottom-3 right-0 grid h-14 w-14 place-items-center rounded-full border-4 border-background bg-primary text-primary-foreground shadow-food"><MapPin className="h-6 w-6" /></span>
  </div>;
}
function OrderVisual() {
  return <div className="flex h-full flex-col justify-center gap-4 px-1">
    <div className="flex items-center gap-3 rounded-lg border border-line bg-card p-4 shadow-food">
      <img src={matcha} width={816} height={816} loading="lazy" decoding="async" alt="" className="h-24 w-20 rounded-md bg-accent object-contain" />
      <div className="min-w-0 flex-1"><p className="font-display text-lg font-bold">Matcha Latte</p><p className="mt-1 text-sm font-semibold">₹180</p>
        <div className="mt-3 flex h-9 w-28 items-center justify-between rounded-md border border-primary px-2 text-primary"><Minus className="h-4 w-4" /><span className="text-sm font-bold">1</span><Plus className="h-4 w-4" /></div>
      </div>
    </div>
    <div className="flex h-17 items-center gap-3 rounded-lg border border-line bg-card px-5 shadow-food"><UtensilsCrossed className="h-5 w-5 text-primary" /><span className="flex-1 text-sm font-bold">Pay by UPI</span><span className="onboarding-payment-check grid h-8 w-8 place-items-center rounded-full bg-success text-success-foreground"><Check className="h-4 w-4" /></span></div>
  </div>;
}
function CollectVisual() {
  return <div className="flex h-full items-center px-1">
    <div className="w-full rounded-lg border border-line bg-card p-6 shadow-food">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-accent text-primary"><UtensilsCrossed className="h-6 w-6" /></span>
      <p className="mt-4 font-display text-xl font-bold">Your order</p>
      <div className="relative mt-6 h-2 overflow-hidden rounded-full bg-muted"><div className="onboarding-status-fill absolute inset-0 rounded-full bg-success" /></div>
      <div className="mt-3 flex justify-between text-[11px] font-semibold text-muted-foreground"><span>Placed</span><span>Preparing</span><span className="text-success">Ready</span></div>
      <Badge className="onboarding-ready mt-6 gap-2 rounded-full border-0 bg-success px-3 py-2 text-success-foreground"><Check className="h-4 w-4" />Ready to collect</Badge>
    </div>
  </div>;
}
