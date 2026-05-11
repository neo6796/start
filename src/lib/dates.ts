// Helpers for working with "menu day" - a day at local 00:00 stored in UTC.
// We treat dates as Bratislava local for cutoff purposes.

export function startOfLocalDay(d: Date = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function todayKey(): Date {
  return startOfLocalDay();
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function isPastCutoff(menuDate: Date, cutoffHour: number): boolean {
  const now = new Date();
  const today = startOfLocalDay(now);
  const day = startOfLocalDay(menuDate);
  if (day.getTime() < today.getTime()) return true;
  if (day.getTime() > today.getTime()) return false;
  return now.getHours() >= cutoffHour;
}

export function formatDateSk(d: Date): string {
  return new Intl.DateTimeFormat("sk-SK", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("sk-SK", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );
}

export function startOfMonth(d: Date = new Date()): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfMonth(d: Date = new Date()): Date {
  const x = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  x.setHours(0, 0, 0, 0);
  return x;
}
