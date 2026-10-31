import { Clock, Copy, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  DAY_LABELS,
  humanizeHours,
  isOpenAt,
  nextOpening,
  type HoursInterval,
  type WeeklyHours,
} from "@/lib/shop/hours";

interface Props {
  value: WeeklyHours;
  onChange: (next: WeeklyHours) => void;
}

export function HoursEditor({ value, onChange }: Props) {
  const openNow = isOpenAt(value);
  const next = nextOpening(value);
  const summary = humanizeHours(value);

  function patchDay(day: number, patch: Partial<WeeklyHours["days"][number]>) {
    onChange({
      ...value,
      days: value.days.map((d) => (d.day === day ? { ...d, ...patch } : d)),
    });
  }

  function setInterval(day: number, index: number, patch: Partial<HoursInterval>) {
    const target = value.days[day];
    patchDay(day, {
      intervals: target.intervals.map((i, idx) => (idx === index ? { ...i, ...patch } : i)),
    });
  }

  function addInterval(day: number) {
    const target = value.days[day];
    patchDay(day, {
      closed: false,
      intervals: [...target.intervals, { open: "16:00", close: "23:00" }].slice(0, 3),
    });
  }

  function removeInterval(day: number, index: number) {
    const target = value.days[day];
    const intervals = target.intervals.filter((_, idx) => idx !== index);
    patchDay(day, { intervals, closed: intervals.length === 0 });
  }

  function copyToAll(day: number) {
    const source = value.days[day];
    onChange({
      ...value,
      days: value.days.map((d) => ({
        ...d,
        closed: source.closed,
        intervals: source.intervals.map((i) => ({ ...i })),
      })),
    });
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border/60 bg-card/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-medium">Opening hours</p>
            <p className="text-xs text-muted-foreground">
              Your customer app uses these slots to show “open now” and take orders.
            </p>
          </div>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs ${
            openNow === null
              ? "border-border/60 text-muted-foreground"
              : openNow
                ? "border-primary/40 text-primary"
                : "border-destructive/40 text-destructive"
          }`}
        >
          {openNow === null
            ? "No hours set"
            : openNow
              ? "Open right now"
              : next
                ? `Closed · opens ${next}`
                : "Closed"}
        </span>
      </div>

      <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60">
        {value.days.map((day) => (
          <div
            key={day.day}
            className="flex flex-wrap items-center gap-3 px-3 py-2.5 sm:flex-nowrap"
          >
            <div className="flex w-36 shrink-0 items-center gap-2">
              <Switch
                checked={!day.closed && day.intervals.length > 0}
                onCheckedChange={(on) =>
                  patchDay(day.day, {
                    closed: !on,
                    intervals: on
                      ? day.intervals.length
                        ? day.intervals
                        : [{ open: "16:00", close: "23:00" }]
                      : day.intervals,
                  })
                }
              />
              <span className="text-sm font-medium">{DAY_LABELS[day.day]}</span>
            </div>

            {day.closed || day.intervals.length === 0 ? (
              <span className="flex-1 text-sm text-muted-foreground">Closed</span>
            ) : (
              <div className="flex flex-1 flex-wrap items-center gap-2">
                {day.intervals.map((interval, index) => (
                  <div key={index} className="flex items-center gap-1.5">
                    <Input
                      type="time"
                      value={interval.open}
                      onChange={(e) => setInterval(day.day, index, { open: e.target.value })}
                      className="h-9 w-[7.5rem]"
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={interval.close}
                      onChange={(e) => setInterval(day.day, index, { close: e.target.value })}
                      className="h-9 w-[7.5rem]"
                    />
                    {day.intervals.length > 1 ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => removeInterval(day.day, index)}
                        aria-label="Remove slot"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                  </div>
                ))}
                {day.intervals.length < 3 ? (
                  <Button size="sm" variant="ghost" onClick={() => addInterval(day.day)}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Slot
                  </Button>
                ) : null}
              </div>
            )}

            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => copyToAll(day.day)}
            >
              <Copy className="mr-1 h-3.5 w-3.5" /> All days
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label>Hours note (optional)</Label>
        <Input
          value={value.note ?? ""}
          onChange={(e) => onChange({ ...value, note: e.target.value || null })}
          placeholder="Closed on rainy days · Last order 30 mins before close"
        />
        {summary ? <p className="text-xs text-muted-foreground">Customers see: {summary}</p> : null}
      </div>
    </div>
  );
}
