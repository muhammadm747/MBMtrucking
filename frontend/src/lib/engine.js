/*
 * Profit engine. Pure functions over API records:
 *   truck   {id, monthly_rent, rent_day, driver_pay_type, driver_rate, dispatch_percent}
 *   load    {truck, miles, pay, pickup_date, …}   (truck = truck id)
 *   expense {truck, date, category, amount}
 * Loads fall into a period by pickup date, expenses by their own date.
 */
import { pISO, payDate } from './dates.js';

export const TYPE_KEYS = ['fuel', 'driver', 'repair', 'insurance', 'lease', 'toll', 'parking', 'other'];

/**
 * Rent charged to one truck in [start, end].
 * Month: once, in full. Week: in full if the pay day falls inside, else nothing;
 * with no pay day set, 12/52 of the monthly rent every week.
 */
export function rentIn(truck, mode, start, end) {
  const rent = truck.monthly_rent;
  if (!(rent > 0)) return null;
  const day = truck.rent_day;
  if (mode === 'month') {
    const a = pISO(start);
    return { amount: rent, date: day ? payDate(a[0], a[1], day) : null };
  }
  if (!day) return { amount: (rent * 12) / 52, date: null };
  const s = pISO(start), e = pISO(end);
  const months = [[s[0], s[1]]];
  if (e[0] !== s[0] || e[1] !== s[1]) months.push([e[0], e[1]]);
  for (const m of months) {
    const pd = payDate(m[0], m[1], day);
    if (pd >= start && pd <= end) return { amount: rent, date: pd };
  }
  return null;
}

/** Driver pay and dispatch taken from one load, at the truck's current rates. */
export function loadCut(truck, load) {
  const t = truck.driver_pay_type, r = truck.driver_rate;
  const drv = t === 'mile' ? r * load.miles : t === 'pct' ? (load.pay * r) / 100 : 0;
  const disp = (load.pay * truck.dispatch_percent) / 100;
  return { drv, disp, net: load.pay - drv - disp };
}

/** One row per truck (same order as `trucks`) for the period. */
export function compute(trucks, loads, exps, mode, start, end) {
  const index = new Map();
  const per = trucks.map((truck, i) => {
    index.set(truck.id, i);
    const by = {};
    TYPE_KEYS.forEach((k) => { by[k] = 0; });
    return { i, truck, count: 0, miles: 0, gross: 0, by, rent: 0, rentDate: null, other: 0, drv: 0, disp: 0, exp: 0, net: 0 };
  });
  for (const l of loads) {
    if (l.pickup_date < start || l.pickup_date > end) continue;
    const p = per[index.get(l.truck)];
    if (!p) continue;
    p.count++; p.miles += l.miles; p.gross += l.pay;
    const c = loadCut(p.truck, l);
    p.drv += c.drv; p.disp += c.disp;
  }
  for (const e of exps) {
    if (e.date < start || e.date > end) continue;
    const p = per[index.get(e.truck)];
    if (p) p.by[e.category] += e.amount;
  }
  for (const p of per) {
    const r = rentIn(p.truck, mode, start, end);
    if (r) { p.rent = r.amount; p.rentDate = r.date; }
    let o = 0;
    TYPE_KEYS.forEach((k) => { o += p.by[k]; });
    p.other = o;
    p.exp = o + p.rent + p.drv + p.disp;
    p.net = p.gross - p.exp;
  }
  return per;
}

export function totals(rows) {
  const t = { count: 0, miles: 0, gross: 0, exp: 0, rent: 0, drv: 0, disp: 0, profit: 0, loss: 0, net: 0, by: {} };
  TYPE_KEYS.forEach((k) => { t.by[k] = 0; });
  for (const p of rows) {
    t.count += p.count; t.miles += p.miles; t.gross += p.gross; t.exp += p.exp;
    t.rent += p.rent; t.drv += p.drv; t.disp += p.disp;
    TYPE_KEYS.forEach((k) => { t.by[k] += p.by[k]; });
    if (p.net > 0.005) t.profit += p.net;
    else if (p.net < -0.005) t.loss += -p.net;
  }
  t.net = t.gross - t.exp;
  return t;
}

export const byGross = (a, b) => b.gross - a.gross || a.i - b.i;

/** Newest pickup first; same day: later pickup time first, then newest created. */
export function cmpLoads(a, b) {
  if (a.pickup_date !== b.pickup_date) return a.pickup_date < b.pickup_date ? 1 : -1;
  const ta = a.pickup_type === 'exact' ? a.pickup_time || '' : a.pickup_type === 'fcfs' ? a.pickup_from || '' : '';
  const tb = b.pickup_type === 'exact' ? b.pickup_time || '' : b.pickup_type === 'fcfs' ? b.pickup_from || '' : '';
  if (ta !== tb) return ta < tb ? 1 : -1;
  return (b.created_at || '').localeCompare(a.created_at || '');
}
