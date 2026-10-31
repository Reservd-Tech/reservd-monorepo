/**
 * Structured opening hours.
 *
 * The `storefronts.opening_hours` column stays a text column for backwards
 * compatibility, but we now store a canonical JSON document inside it so the
 * consumer app (Reservd OS) can reason about the hours — "open now", next
 * opening time, per-day slots — instead of parsing free text.
 *
 * Legacy free-text values still load fine: they are surfaced as `note`.
 */

export const HOURS_VERSION = 1;
export const DEFAULT_TZ = "Asia/Kolkata";

export const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export interface HoursInterval {
  open: string; // "HH:MM" 24h
  close: string; // "HH:MM" 24h — may be <= open, meaning it closes after midnight
}

export interface HoursDay {
  /** 0 = Sunday … 6 = Saturday */
  day: number;
  closed: boolean;
  intervals: HoursInterval[];
}

export interface WeeklyHours {
  version: number;
  timezone: string;
  days: HoursDay[];
  /** Free-text extra note, or a legacy free-text hours string. */
  note?: string | null;
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function emptyHours(timezone = DEFAULT_TZ): WeeklyHours {
  return {
    version: HOURS_VERSION,
    timezone,
    days: DAY_LABELS.map((_, day) => ({ day, closed: true, intervals: [] })),
    note: null,
  };
}

export function defaultHours(timezone = DEFAULT_TZ): WeeklyHours {
  return {
    version: HOURS_VERSION,
    timezone,
    days: DAY_LABELS.map((_, day) => ({
      day,
      closed: false,
      intervals: [{ open: "16:00", close: "23:00" }],
    })),
    note: null,
  };
}

function normaliseTime(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (TIME_RE.test(trimmed)) return trimmed;
  const short = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (short) {
    const h = Math.min(23, Number(short[1]));
    return `${String(h).padStart(2, "0")}:${short[2]}`;
  }
  return fallback;
}

/** Parse whatever is in the column. Never throws. */
export function parseHours(raw: string | null | undefined): WeeklyHours {
  if (!raw || !raw.trim()) return emptyHours();
  const text = raw.trim();
  if (!text.startsWith("{")) {
    const hours = emptyHours();
    hours.note = text;
    return hours;
  }
  try {
    const parsed = JSON.parse(text) as Partial<WeeklyHours> & { days?: unknown };
    const base = emptyHours(
      typeof parsed.timezone === "string" && parsed.timezone ? parsed.timezone : DEFAULT_TZ,
    );
    const days = Array.isArray(parsed.days) ? (parsed.days as HoursDay[]) : [];
    for (const entry of days) {
      const index = Number(entry?.day);
      if (!Number.isInteger(index) || index < 0 || index > 6) continue;
      const intervals = Array.isArray(entry.intervals) ? entry.intervals : [];
      base.days[index] = {
        day: index,
        closed: Boolean(entry.closed) || intervals.length === 0,
        intervals: intervals
          .map((i) => ({
            open: normaliseTime(i?.open, "09:00"),
            close: normaliseTime(i?.close, "21:00"),
          }))
          .slice(0, 3),
      };
    }
    base.note = typeof parsed.note === "string" && parsed.note.trim() ? parsed.note.trim() : null;
    return base;
  } catch {
    const hours = emptyHours();
    hours.note = text;
    return hours;
  }
}

/** Serialise for storage. Returns null when nothing has been configured. */
export function serialiseHours(hours: WeeklyHours): string | null {
  const anyOpen = hours.days.some((d) => !d.closed && d.intervals.length > 0);
  if (!anyOpen && !hours.note) return null;
  return JSON.stringify({
    version: HOURS_VERSION,
    timezone: hours.timezone || DEFAULT_TZ,
    days: hours.days.map((d) => ({
      day: d.day,
      closed: d.closed || d.intervals.length === 0,
      intervals: d.closed ? [] : d.intervals,
    })),
    note: hours.note ?? null,
  });
}

export function hasHours(hours: WeeklyHours): boolean {
  return hours.days.some((d) => !d.closed && d.intervals.length > 0) || Boolean(hours.note);
}

function to12h(value: string): string {
  const [h, m] = value.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour} ${period}` : `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

function dayText(day: HoursDay): string {
  if (day.closed || day.intervals.length === 0) return "Closed";
  return day.intervals.map((i) => `${to12h(i.open)} – ${to12h(i.close)}`).join(", ");
}

/** Human summary, grouping consecutive days that share the same hours. */
export function humanizeHours(hours: WeeklyHours): string {
  if (!hasHours(hours)) return "";
  const order = [1, 2, 3, 4, 5, 6, 0];
  const parts: string[] = [];
  let runStart = 0;
  while (runStart < order.length) {
    const text = dayText(hours.days[order[runStart]]);
    let runEnd = runStart;
    while (runEnd + 1 < order.length && dayText(hours.days[order[runEnd + 1]]) === text) runEnd += 1;
    const label =
      runStart === runEnd
        ? DAY_SHORT[order[runStart]]
        : `${DAY_SHORT[order[runStart]]}–${DAY_SHORT[order[runEnd]]}`;
    parts.push(`${label}: ${text}`);
    runStart = runEnd + 1;
  }
  const summary = parts.join(" · ");
  return hours.note ? `${summary} · ${hours.note}` : summary;
}

function minutesInZone(date: Date, timezone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour12: false,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  const weekdayIndex = DAY_SHORT.indexOf(
    (parts.weekday ?? "Sun") as (typeof DAY_SHORT)[number],
  );
  const hour = Number(parts.hour === "24" ? "0" : parts.hour ?? "0");
  const minute = Number(parts.minute ?? "0");
  return { day: weekdayIndex < 0 ? 0 : weekdayIndex, minutes: hour * 60 + minute };
}

function toMinutes(value: string) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Is the shop inside a configured serving window right now?
 * Returns null when no structured hours are configured (caller should fall back
 * to the manual open/closed switch).
 */
export function isOpenAt(hours: WeeklyHours, at: Date = new Date()): boolean | null {
  const configured = hours.days.some((d) => !d.closed && d.intervals.length > 0);
  if (!configured) return null;
  const tz = hours.timezone || DEFAULT_TZ;
  const now = minutesInZone(at, tz);
  const yesterday = (now.day + 6) % 7;

  for (const interval of hours.days[now.day].intervals) {
    if (hours.days[now.day].closed) break;
    const open = toMinutes(interval.open);
    const close = toMinutes(interval.close);
    if (close > open ? now.minutes >= open && now.minutes < close : now.minutes >= open) {
      return true;
    }
  }
  // Overnight window that started yesterday.
  const prev = hours.days[yesterday];
  if (!prev.closed) {
    for (const interval of prev.intervals) {
      const open = toMinutes(interval.open);
      const close = toMinutes(interval.close);
      if (close <= open && now.minutes < close) return true;
    }
  }
  return false;
}

/** Next opening time as "Mon 16:00", or null when never / already open. */
export function nextOpening(hours: WeeklyHours, at: Date = new Date()): string | null {
  const configured = hours.days.some((d) => !d.closed && d.intervals.length > 0);
  if (!configured) return null;
  const now = minutesInZone(at, hours.timezone || DEFAULT_TZ);
  for (let offset = 0; offset < 8; offset += 1) {
    const day = hours.days[(now.day + offset) % 7];
    if (day.closed) continue;
    for (const interval of [...day.intervals].sort((a, b) => a.open.localeCompare(b.open))) {
      if (offset === 0 && toMinutes(interval.open) <= now.minutes) continue;
      return `${DAY_SHORT[day.day]} ${interval.open}`;
    }
  }
  return null;
}

/** Payload shape handed to the consumer app over the public API. */
export function hoursPayload(raw: string | null | undefined, at: Date = new Date()) {
  const hours = parseHours(raw);
  return {
    timezone: hours.timezone,
    days: hours.days,
    note: hours.note ?? null,
    text: humanizeHours(hours),
    open_now: isOpenAt(hours, at),
    next_open: nextOpening(hours, at),
  };
}
