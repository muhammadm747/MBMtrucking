/* Truck form state: the text fields of the Settings form and the new-truck sheet. */
import { parseNum } from './format.js';

const numOrEmpty = (v) => (v ? String(v) : '');

export const EMPTY_TRUCK_FORM = { name: '', rent: '', day: '', dt: 'none', dr: '', dp: '' };

export const toForm = (tk) => ({
  name: tk.name, rent: numOrEmpty(tk.monthly_rent), day: numOrEmpty(tk.rent_day),
  dt: tk.driver_pay_type, dr: numOrEmpty(tk.driver_rate), dp: numOrEmpty(tk.dispatch_percent),
});

/** Validate everything but the name. Returns { error } (an Uzbek source message) or { data } for the API. */
export function readTruckForm(f) {
  const rent = f.rent.trim() ? parseNum(f.rent) : 0;
  if (!Number.isFinite(rent) || rent < 0 || rent > 1000000) return { error: "Rent summasi noto'g'ri" };
  let day = 0;
  if (f.day.trim()) {
    day = /^\d{1,2}$/.test(f.day.trim()) ? +f.day.trim() : NaN;
    if (!(day >= 1 && day <= 31)) return { error: "To'lov kuni 1 dan 31 gacha bo'lsin" };
  }
  let rate = 0;
  if (f.dt !== 'none') {
    rate = f.dr.trim() ? parseNum(f.dr) : NaN;
    const max = f.dt === 'mile' ? 50 : 100;
    if (!Number.isFinite(rate) || rate <= 0 || rate > max) {
      return { error: f.dt === 'mile' ? 'Driver stavkasini kiriting ($ / mile, masalan 0.65)' : 'Driver foizini kiriting (1 dan 100 gacha)' };
    }
  }
  const dp = f.dp.trim() ? parseNum(f.dp) : 0;
  if (!Number.isFinite(dp) || dp < 0 || dp > 100) return { error: "Dispatch foizi 0 dan 100 gacha bo'lsin" };
  return { data: { monthly_rent: rent, rent_day: day, driver_pay_type: f.dt, driver_rate: rate, dispatch_percent: dp } };
}
