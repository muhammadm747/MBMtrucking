import { describe, expect, it } from 'vitest';
import { EMPTY_TRUCK_FORM, readTruckForm, toForm } from './truckForm.js';

const form = (over) => ({ ...EMPTY_TRUCK_FORM, name: '1365', ...over });

describe('readTruckForm', () => {
  it('treats blank optional fields as zero', () => {
    expect(readTruckForm(form()).data).toEqual({
      monthly_rent: 0, rent_day: 0, driver_pay_type: 'none', driver_rate: 0, dispatch_percent: 0,
    });
  });

  it('reads a fully filled form', () => {
    const { data } = readTruckForm(form({ rent: '2500', day: '15', dt: 'mile', dr: '0.65', dp: '10' }));
    expect(data).toEqual({
      monthly_rent: 2500, rent_day: 15, driver_pay_type: 'mile', driver_rate: 0.65, dispatch_percent: 10,
    });
  });

  it('rejects out-of-range values', () => {
    expect(readTruckForm(form({ rent: '-1' })).error).toBeTruthy();
    expect(readTruckForm(form({ day: '32' })).error).toBeTruthy();
    expect(readTruckForm(form({ dp: '101' })).error).toBeTruthy();
  });

  it('requires a driver rate within the limit of the chosen pay type', () => {
    expect(readTruckForm(form({ dt: 'mile' })).error).toBeTruthy();
    expect(readTruckForm(form({ dt: 'mile', dr: '51' })).error).toBeTruthy();
    expect(readTruckForm(form({ dt: 'pct', dr: '51' })).data.driver_rate).toBe(51);
  });
});

describe('toForm', () => {
  it('shows zero amounts as empty fields', () => {
    const f = toForm({ name: '1365', monthly_rent: 0, rent_day: 0, driver_pay_type: 'none', driver_rate: 0, dispatch_percent: 0 });
    expect(f).toEqual(form());
  });
});
