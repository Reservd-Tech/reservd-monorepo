export function formatQty(n: number | string, unit?: string | null) {
  const v = typeof n === "string" ? Number(n) : n;
  const formatted = Number.isInteger(v) ? v.toString() : v.toFixed(2);
  return unit ? `${formatted} ${unit}` : formatted;
}

export function daysUntil(dateISO: string | null): number | null {
  if (!dateISO) return null;
  const d = new Date(dateISO);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / 86400000);
}

export function stockLevel(current: number, min: number): "out" | "low" | "ok" {
  if (current <= 0) return "out";
  if (min > 0 && current <= min) return "low";
  return "ok";
}
