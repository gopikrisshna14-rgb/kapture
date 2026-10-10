export function relativeTime(iso: string, now = Date.now()): string {
  const diff = Math.max(0, now - Date.parse(iso)) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  const d = Math.floor(diff / 86400);
  if (d === 1) return "yesterday";
  if (d < 7) return `${d} days ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function shortDate(isoDate: string): string {
  const d = new Date(isoDate.length === 10 ? isoDate + "T12:00:00" : isoDate);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export function addDaysIso(days: number, from = new Date()): string {
  const d = new Date(from.getTime() + days * 86400_000);
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
}
