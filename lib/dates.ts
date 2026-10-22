const monthName = (d: Date) => d.toLocaleDateString("es-ES", { month: "long", timeZone: "UTC" });

/** "19 – 25 octubre 2026", or "28 septiembre – 4 octubre 2026" when the week spans two months */
function weekRange(monday: Date, sunday: Date) {
  const from: (string | number)[] = [monday.getUTCDate()];
  if (monday.getUTCMonth() !== sunday.getUTCMonth()) from.push(monthName(monday));
  if (monday.getUTCFullYear() !== sunday.getUTCFullYear()) from.push(monday.getUTCFullYear());
  return `${from.join(" ")} – ${sunday.getUTCDate()} ${monthName(sunday)} ${sunday.getUTCFullYear()}`;
}

export function isoWeek(iso: string) {
  const d = new Date(iso);
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  // ISO weeks belong to the year of their Thursday
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const week = Math.ceil(((t.getTime() - Date.UTC(t.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7);
  const monday = new Date(t.getTime() - 3 * 864e5);
  const sunday = new Date(t.getTime() + 3 * 864e5);
  return { key: `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`, label: weekRange(monday, sunday) };
}

export function month(iso: string) {
  const d = new Date(iso);
  return { key: iso.slice(0, 7), label: `${monthName(d)} ${d.getUTCFullYear()}` };
}
