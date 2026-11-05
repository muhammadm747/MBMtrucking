import { useState } from 'react';
import { useI18n } from '../i18n/index.jsx';
import { daysBetween, nextPayDate, todayNY } from '../lib/dates.js';
import { fmtMiles, parseNum, usd } from '../lib/format.js';
import { EMPTY_TRUCK_FORM, readTruckForm } from '../lib/truckForm.js';
import { errorText, truckShort, useData } from '../state/DataContext.jsx';
import { useToast } from '../state/ToastContext.jsx';
import { useDialog } from './common.jsx';
import { IconClose } from './Icons.jsx';

/** The truck's name, rent, driver pay and dispatch inputs. `dispatchExtra` sits beside the dispatch field. */
export function TruckFields({ f, set, onEnter, dispatchExtra, autoFocusName = false }) {
  const { t, fmtDMY } = useI18n();

  const rentN = parseNum(f.rent.trim() || '0'), dayN = /^\d{1,2}$/.test(f.day.trim()) ? +f.day.trim() : 0;
  let rentInfo = '';
  if (rentN > 0 && dayN >= 1 && dayN <= 31) {
    const today = todayNY(), nd = nextPayDate(dayN, today), df = daysBetween(today, nd);
    rentInfo = t("Keyingi to'lov: {d} ({w})", { d: fmtDMY(nd), w: df === 0 ? t('bugun') : t('{n} kundan keyin', { n: df }) });
  } else if (rentN > 0) rentInfo = t("To'lov kuni yozilmasa, haftalik hisobotga har hafta oylik rentning 12/52 qismi qo'shiladi.");

  const r = parseNum(f.dr.trim() || '0'), d = parseNum(f.dp.trim() || '0'), M = 1000, P = 2500;
  let example = '';
  if (((f.dt !== 'none' && r > 0) || d > 0) && Number.isFinite(r) && Number.isFinite(d)) {
    const drv = f.dt === 'mile' ? r * M : f.dt === 'pct' ? (P * r) / 100 : 0, disp = (P * d) / 100;
    example = t('Misol: {m} mile, {p} yuk → driver {a}, dispatch {b}, sizga {c} qoladi.', { m: fmtMiles(M), p: usd(P), a: usd(drv), b: usd(disp), c: usd(P - drv - disp) });
  }

  return (
    <div className="tkform">
      <label className="fld"><span>{t('Truck nomi')}</span><input type="text" maxLength={30} autoComplete="off" autoFocus={autoFocusName} value={f.name} onChange={(e) => set('name', e.target.value)} onKeyDown={onEnter} /></label>
      <div className="tkgrp">
        <h3>{t('Rent')}</h3>
        <div className="row2">
          <label className="fld"><span>{t('Oylik rent ($)')}</span><input type="text" inputMode="decimal" autoComplete="off" placeholder="0" value={f.rent} onChange={(e) => set('rent', e.target.value)} onKeyDown={onEnter} /></label>
          <label className="fld"><span>{t("To'lov kuni (1–31)")}</span><input type="text" inputMode="numeric" maxLength={2} autoComplete="off" placeholder={t('yozilmagan')} value={f.day} onChange={(e) => set('day', e.target.value)} onKeyDown={onEnter} /></label>
        </div>
        {rentInfo && <p className="hint">{rentInfo}</p>}
      </div>
      <div className="tkgrp">
        <h3>{t('Driver maoshi')}</h3>
        <div className="row2">
          <label className="fld"><span>{t('Qanday hisoblanadi')}</span>
            <select value={f.dt} onChange={(e) => set('dt', e.target.value)}>
              <option value="none">{t("Yo'q")}</option>
              <option value="mile">{t('Har mile ($)')}</option>
              <option value="pct">{t('Foiz (%)')}</option>
            </select>
          </label>
          {f.dt !== 'none' && (
            <label className="fld"><span>{t(f.dt === 'mile' ? 'Stavka ($ / mile)' : 'Stavka (%)')}</span><input type="text" inputMode="decimal" autoComplete="off" placeholder="0" value={f.dr} onChange={(e) => set('dr', e.target.value)} onKeyDown={onEnter} /></label>
          )}
        </div>
      </div>
      <div className="tkgrp">
        <h3>{t('Dispatch / factoring')}</h3>
        <div className="row2">
          <label className="fld"><span>{t('Yuk pulidan (%)')}</span><input type="text" inputMode="decimal" autoComplete="off" placeholder="0" value={f.dp} onChange={(e) => set('dp', e.target.value)} onKeyDown={onEnter} /></label>
          {dispatchExtra}
        </div>
      </div>
      {example && <p className="tkex">{example}</p>}
    </div>
  );
}

/** Dialog for a new truck: nothing is created until Save. Mount it only while open. */
export function AddTruckSheet({ onClose, onAdded }) {
  const { t } = useI18n();
  const toast = useToast();
  const { trucks, saveTruck, busy } = useData();
  const [f, setF] = useState(EMPTY_TRUCK_FORM);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  useDialog(true, onClose);

  async function submit(e) {
    e.preventDefault();
    if (busy) { toast('Oldingi amal tugashini kuting', true); return; }
    const name = f.name.trim().slice(0, 30);
    if (!name) { toast('Truck nomini kiriting', true); return; }
    const short = truckShort({ name }).toLowerCase();
    if (trucks.some((tk) => truckShort(tk).toLowerCase() === short)) { toast('Bu nomli truck allaqachon bor', true); return; }
    const { error, data } = readTruckForm(f);
    if (error) { toast(error, true); return; }
    try {
      onAdded(await saveTruck(null, { name, ...data }));
    } catch (err) {
      toast(errorText(err), true);
    }
  }

  return (
    <div className="sheetbg" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="sheet" role="dialog" aria-modal="true" aria-labelledby="addTruckTitle" tabIndex={-1} noValidate onSubmit={submit}>
        <div className="sh-top">
          <h2 id="addTruckTitle">{t('Add truck')}</h2>
          <button className="ib" type="button" aria-label={t('Yopish')} onClick={onClose}><IconClose /></button>
        </div>
        <TruckFields f={f} set={set} autoFocusName />
        <div className="sh-act">
          <button className="btn primary" type="submit" disabled={busy}>{t('Saqlash')}</button>
          <button className="btn" type="button" onClick={onClose}>{t('Bekor qilish')}</button>
        </div>
      </form>
    </div>
  );
}
