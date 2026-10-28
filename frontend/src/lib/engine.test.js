import { describe, expect, it } from 'vitest';
import { addDays, nextPayDate, periodOf, shiftAnchor } from './dates.js';
import { compute, loadCut, rentIn, totals } from './engine.js';
import { parseNum, usd } from './format.js';

const truck = (over = {}) => ({ id: 1, name: '1364', monthly_rent: 0, rent_day: 0, driver_pay_type: 'none', driver_rate: 0, dispatch_percent: 0, ...over });
const load = (over = {}) => ({ id: 'l', truck: 1, miles: 1000, pay: 2500, pickup_date: '2026-10-12', delivery_date: '2026-10-13', ...over });

describe('dates', () => {
  it('weeks run Monday to Sunday', () => {
    expect(periodOf('week', '2026-10-15')).toEqual({ start: '2026-10-12', end: '2026-10-18' });
    expect(periodOf('week', '2026-10-18')).toEqual({ start: '2026-10-12', end: '2026-10-18' });
  });
  it('months and shifting', () => {
    expect(periodOf('month', '2026-02-10')).toEqual({ start: '2026-02-01', end: '2026-02-28' });
    expect(shiftAnchor('month', '2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
  });
  it('pay day clamps to short months', () => {
    expect(nextPayDate(31, '2026-02-10')).toBe('2026-02-28');
    expect(nextPayDate(5, '2026-10-27')).toBe('2026-11-05');
  });
});

describe('rentIn', () => {
  it('month: full rent once', () => {
    expect(rentIn(truck({ monthly_rent: 1500, rent_day: 5 }), 'month', '2026-10-01', '2026-10-31')).toEqual({ amount: 1500, date: '2026-10-05' });
  });
  it('week: full when the pay day falls inside, else nothing', () => {
    const tk = truck({ monthly_rent: 1500, rent_day: 14 });
    expect(rentIn(tk, 'week', '2026-10-12', '2026-10-18')).toEqual({ amount: 1500, date: '2026-10-14' });
    expect(rentIn(tk, 'week', '2026-10-19', '2026-10-25')).toBeNull();
  });
  it('week spanning two months finds the pay day', () => {
    expect(rentIn(truck({ monthly_rent: 900, rent_day: 1 }), 'week', '2026-09-28', '2026-10-04').date).toBe('2026-10-01');
  });
  it('no pay day: 12/52 every week', () => {
    expect(rentIn(truck({ monthly_rent: 5200 }), 'week', '2026-10-12', '2026-10-18').amount).toBeCloseTo(1200);
  });
});

describe('loadCut and compute', () => {
  it('percent driver pay and dispatch', () => {
    const c = loadCut(truck({ driver_pay_type: 'pct', driver_rate: 32, dispatch_percent: 5 }), load());
    expect(c).toEqual({ drv: 800, disp: 125, net: 1575 });
  });
  it('per-mile driver pay', () => {
    expect(loadCut(truck({ driver_pay_type: 'mile', driver_rate: 0.65 }), load()).drv).toBeCloseTo(650);
  });
  it('net = gross − expenses − rent − driver − dispatch, by pickup date', () => {
    const trucks = [truck({ driver_pay_type: 'pct', driver_rate: 32 }), truck({ id: 2, name: '1365', monthly_rent: 5200 })];
    const loads = [load(), load({ id: 'x', pickup_date: '2026-10-19', delivery_date: '2026-10-20' }), load({ id: 'y', truck: 2, pay: 1000, miles: 500 })];
    const exps = [{ id: 'e', truck: 1, date: '2026-10-13', category: 'fuel', amount: 300 }];
    const rows = compute(trucks, loads, exps, 'week', '2026-10-12', '2026-10-18');
    expect(rows[0]).toMatchObject({ count: 1, gross: 2500, drv: 800, other: 300, exp: 1100, net: 1400 });
    expect(rows[1].rent).toBeCloseTo(1200);
    expect(rows[1].net).toBeCloseTo(-200);
    const T = totals(rows);
    expect(T.count).toBe(2);
    expect(T.profit).toBeCloseTo(1400);
    expect(T.loss).toBeCloseTo(200);
    expect(T.net).toBeCloseTo(1200);
  });
});

describe('format', () => {
  it('parses loose money input', () => {
    expect(parseNum('2,000')).toBe(2000);
    expect(parseNum('$1 500.50')).toBe(1500.5);
    expect(parseNum('2.000,75')).toBe(2000.75);
    expect(parseNum('abc')).toBeNaN();
  });
  it('formats dollars with a real minus sign', () => {
    expect(usd(-1234.5)).toBe('−$1,234.50');
  });
});
