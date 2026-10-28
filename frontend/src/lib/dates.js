// Calendar math on ISO "YYYY-MM-DD" strings. The business runs on New York time.
export const TZ = 'America/New_York';

const nyFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const nyTs = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

function parts(fmt, date) {
  const p = {};
  for (const x of fmt.formatToParts(date)) p[x.type] = x.value;
  return p;
}

export function todayNY(now) {
  const p = parts(nyFmt, now || new Date());
  return `${p.year}-${p.month}-${p.day}`;
}

/** {y, m, d, hh, mm} of a timestamp in New York. */
export function nyParts(date) {
  const p = parts(nyTs, date);
  return { y: +p.year, m: +p.month, d: +p.day, hh: p.hour, mm: p.minute };
}

export const pISO = (s) => [+s.slice(0, 4), +s.slice(5, 7), +s.slice(8, 10)];
export const mkISO = (y, m, d) =>
  String(y).padStart(4, '0') + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
export const dim = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

export function addDays(iso, n) {
  const a = pISO(iso);
  const t = new Date(Date.UTC(a[0], a[1] - 1, a[2] + n));
  return mkISO(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}
export function dowOf(iso) {
  const a = pISO(iso);
  return new Date(Date.UTC(a[0], a[1] - 1, a[2])).getUTCDay();
}
export function daysBetween(a, b) {
  const x = pISO(a), y = pISO(b);
  return Math.round((Date.UTC(y[0], y[1] - 1, y[2]) - Date.UTC(x[0], x[1] - 1, x[2])) / 86400000);
}
export const weekStart = (iso) => addDays(iso, -((dowOf(iso) + 6) % 7));

/** Monday–Sunday week, or calendar month, containing `anchor`. */
export function periodOf(mode, anchor) {
  if (mode === 'week') {
    const s = weekStart(anchor);
    return { start: s, end: addDays(s, 6) };
  }
  const a = pISO(anchor);
  return { start: mkISO(a[0], a[1], 1), end: mkISO(a[0], a[1], dim(a[0], a[1])) };
}
export function shiftAnchor(mode, anchor, dir) {
  if (mode === 'week') return addDays(anchor, 7 * dir);
  const a = pISO(anchor);
  const t = new Date(Date.UTC(a[0], a[1] - 1 + dir, 1));
  return mkISO(t.getUTCFullYear(), t.getUTCMonth() + 1, 1);
}

export const payDate = (y, m, day) => mkISO(y, m, Math.min(day, dim(y, m)));
export function nextPayDate(day, today) {
  const a = pISO(today);
  const c = payDate(a[0], a[1], day);
  if (c >= today) return c;
  const t = new Date(Date.UTC(a[0], a[1], 1));
  return payDate(t.getUTCFullYear(), t.getUTCMonth() + 1, day);
}

export function isDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const a = pISO(s);
  return a[1] >= 1 && a[1] <= 12 && a[2] >= 1 && a[2] <= dim(a[0], a[1]);
}
