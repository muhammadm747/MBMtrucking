import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n/index.jsx';
import { addDays, daysBetween, isDate, todayNY } from '../../lib/dates.js';
import { cmpLoads } from '../../lib/engine.js';
import { fmtMiles, parseNum, usd } from '../../lib/format.js';
import { geocode, mapsUrl, routeMiles, shortPlace } from '../../lib/miles.js';
import { errorText, truckName, useData } from '../../state/DataContext.jsx';
import { useLoadUi } from '../../state/LoadUiContext.jsx';
import { useToast } from '../../state/ToastContext.jsx';
import { TruckPicker, useDialog } from '../common.jsx';
import { IconClose } from '../Icons.jsx';
import AddressInput from './AddressInput.jsx';

const MAX_MILES = 20000;
const MAX_AMOUNT = 1000000;
const STOPS = ['pickup', 'delivery'];

function blankForm(truck) {
  const today = todayNY();
  const f = { truck, miles: '', pay: '' };
  for (const p of STOPS) Object.assign(f, { [p + '_date']: today, [p + '_type']: 'exact', [p + '_time']: '', [p + '_from']: '', [p + '_to']: '', [p + '_address']: '' });
  return f;
}

function fromLoad(l, keepDates) {
  const f = { truck: l.truck, miles: String(l.miles), pay: l.pay ? String(l.pay) : '' };
  for (const p of STOPS) {
    for (const k of ['_type', '_address']) f[p + k] = l[p + k] || '';
    for (const k of ['_time', '_from', '_to']) f[p + k] = l[p + k] || '';
    f[p + '_date'] = l[p + '_date'];
  }
  if (!keepDates) {
    const today = todayNY();
    f.pickup_date = today;
    f.delivery_date = addDays(today, Math.max(0, daysBetween(l.pickup_date, l.delivery_date)));
  }
  return f;
}

/** The time a stop happens at: exact time, or the FCFS window edge. */
const stopTime = (f, p) => (f[p + '_type'] === 'exact' ? f[p + '_time'] : f[p + '_type'] === 'fcfs' ? (p === 'pickup' ? f.pickup_from : f.delivery_to) : '');

export default function LoadForm() {
  const { t } = useI18n();
  const toast = useToast();
  const { trucks, loads, saveLoad, truckById, busy } = useData();
  const { form: req, closeForm, openDup } = useLoadUi();
  const [f, setF] = useState(null);
  const fRef = useRef(null);
  fRef.current = f;
  const coords = useRef({ pickup: null, delivery: null });
  const lastKey = useRef('');
  const [calc, setCalc] = useState({ msg: '', cls: '', sub: '', running: false });
  const autoMiles = useRef('');
  const calcId = useRef(0);
  const payRef = useRef(null);
  const lastTruck = useRef(null);

  const editing = req && req.mode === 'edit' ? req.id : null;
  const open = !!req && !!f;
  const close = useCallback(() => { calcId.current++; closeForm(); }, [closeForm]);
  useDialog(open, close);

  useEffect(() => {
    if (!req) { setF(null); return; }
    const src = req.id ? loads.find((x) => x.id === req.id) : null;
    const fallback = lastTruck.current && truckById.has(lastTruck.current) ? lastTruck.current : trucks[0] && trucks[0].id;
    const next = src ? fromLoad(src, req.mode === 'edit') : blankForm(fallback);
    setF(next);
    coords.current = { pickup: null, delivery: null };
    lastKey.current = next.pickup_address.trim() + '|' + next.delivery_address.trim();
    setCalc({ msg: '', cls: '', sub: '', running: false });
    autoMiles.current = '';
    calcId.current++;
    if (req.mode === 'dup' && src) toast(t("{x} yukidan nusxa olindi. Sana bugunga qo'yildi: tekshirib, \"Yukni qo'shish\"ni bosing.", { x: truckName(truckById.get(src.truck)) }));
    setTimeout(() => { try { payRef.current && payRef.current.focus({ preventScroll: true }); if (req.mode === 'dup') payRef.current.select(); } catch { /* ignore */ } }, 40);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req]);

  if (!open) return null;

  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const setPickupDate = (v) => setF((s) => ({ ...s, pickup_date: v, delivery_date: s.delivery_date < v ? v : s.delivery_date }));

  const milesN = parseNum(f.miles);
  const payN = f.pay.trim() ? parseNum(f.pay) : 0;
  const rpmText = milesN > 0 && Number.isFinite(payN) ? usd(payN / milesN) : '—';
  const bothAddr = f.pickup_address.trim() && f.delivery_address.trim();

  /** Driving miles between the two addresses. Uses the coordinates of picked suggestions; geocodes typed text. */
  async function calcMiles(manual, override = {}, quiet = false) {
    const cur = { ...fRef.current, ...override };
    const a = cur.pickup_address.trim(), b = cur.delivery_address.trim();
    if (!a || !b) {
      if (manual && !quiet) setCalc({ msg: t('Ikkala manzilni yozing'), cls: 'bad', sub: '', running: false });
      return;
    }
    const key = a + '|' + b;
    if (!manual && key === lastKey.current) return; // already calculated for these two addresses
    lastKey.current = key;
    const my = ++calcId.current;
    setCalc({ msg: t('Hisoblanmoqda...'), cls: '', sub: '', running: true });
    const done = (msg, cls, sub = '') => { if (my === calcId.current) setCalc({ msg, cls, sub, running: false }); };
    try {
      const known = (p, text) => (coords.current[p] ? { ...coords.current[p], name: text } : null);
      const ga = known('pickup', a) || await geocode(a);
      if (my !== calcId.current) return;
      if (!ga) return done(t('"{x}" topilmadi. Shahar va shtatni yozing (Dallas, TX).', { x: a }), 'bad');
      const gb = known('delivery', b) || await geocode(b);
      if (my !== calcId.current) return;
      if (!gb) return done(t('"{x}" topilmadi. Shahar va shtatni yozing (Dallas, TX).', { x: b }), 'bad');
      const mi = await routeMiles(ga, gb);
      if (my !== calcId.current) return;
      if (!(mi > 0)) return done(t("Yo'l topilmadi."), 'bad');
      const v = String(Math.round(mi * 10) / 10);
      const route = shortPlace(ga.name) + ' → ' + shortPlace(gb.name);
      const cur = fRef.current.miles.trim();
      const kept = !manual && cur && cur !== autoMiles.current;
      if (!kept) {
        autoMiles.current = v;
        setF((s) => ({ ...s, miles: v }));
      }
      if (kept) done(t("Hisoblangan: {n} mile. Siz yozgan mile o'zgartirilmadi.", { n: fmtMiles(+v) }), '', route);
      else done(t("{n} mile hisoblandi (yengil mashina yo'li, taxminiy)", { n: fmtMiles(+v) }), 'ok', route);
    } catch (e) {
      done(t("Hisoblab bo'lmadi. Google Maps'dan ko'rib, qo'lda kiriting."), 'bad',
        e && e.name === 'AbortError' ? t('vaqt tugadi') : String((e && e.message) || e).slice(0, 60));
    }
  }

  const setAddress = (p, v) => {
    coords.current[p] = null;
    set(p + '_address', v);
  };

  /** A suggestion was chosen: keep its coordinates and, once both stops are known, fill in the miles. */
  const pickAddress = (p, it) => {
    coords.current[p] = it.lat != null ? { lat: it.lat, lon: it.lon } : null;
    set(p + '_address', it.label);
    calcMiles(true, { [p + '_address']: it.label }, true);
  };

  const onAddrBlur = () => {
    const cur = fRef.current.miles.trim();
    if (!cur || cur === autoMiles.current) calcMiles(false);
  };

  function validate() {
    const focus = (id) => { const el = document.getElementById(id); if (el) el.focus(); };
    if (!truckById.has(f.truck)) { toast("Hali truck yo'q. Avval truck qo'shing.", true); return null; }
    if (!(milesN > 0)) { toast('Mile kiriting (0 dan katta son)', true); focus('lMiles'); return null; }
    if (milesN > MAX_MILES) { toast(t("Mile juda katta (eng ko'pi {n})", { n: fmtMiles(MAX_MILES) }), true); focus('lMiles'); return null; }
    if (!Number.isFinite(payN) || payN < 0 || payN > MAX_AMOUNT) { toast("Yuk puli noto'g'ri", true); focus('lPay'); return null; }
    const data = { truck: f.truck, miles: milesN, pay: payN };
    for (const p of STOPS) {
      if (!isDate(f[p + '_date'])) { toast(t('{x} sanasini kiriting', { x: p === 'pickup' ? 'Pickup' : 'Delivery' }), true); focus(p + 'Date'); return null; }
      const ty = f[p + '_type'];
      data[p + '_date'] = f[p + '_date'];
      data[p + '_type'] = ty;
      data[p + '_address'] = f[p + '_address'].trim().slice(0, 200);
      data[p + '_time'] = ty === 'exact' && f[p + '_time'] ? f[p + '_time'] : null;
      data[p + '_from'] = ty === 'fcfs' && f[p + '_from'] ? f[p + '_from'] : null;
      data[p + '_to'] = ty === 'fcfs' && f[p + '_to'] ? f[p + '_to'] : null;
    }
    if (data.delivery_date < data.pickup_date) { toast("Delivery sanasi pickup sanasidan oldin bo'lmasin", true); focus('deliveryDate'); return null; }
    if (data.delivery_date === data.pickup_date) {
      const a = stopTime(f, 'pickup'), b = stopTime(f, 'delivery');
      if (a && b && b < a) { toast("Delivery vaqti pickup vaqtidan oldin bo'lmasin", true); return null; }
    }
    return data;
  }

  async function submit() {
    if (busy) { toast('Oldingi amal tugashini kuting', true); return; }
    const data = validate();
    if (!data) return;
    try {
      await saveLoad(editing, data);
      lastTruck.current = data.truck;
      toast(editing ? "O'zgarish saqlandi" : "Yuk qo'shildi");
      close();
    } catch (e) {
      toast(errorText(e), true);
    }
  }

  const dupLast = () => {
    const sorted = loads.slice().sort(cmpLoads);
    const l = sorted.find((x) => x.truck === f.truck) || sorted[0];
    if (l) openDup(l.id);
  };

  const onEnter = (e) => { if (e.key === 'Enter') submit(); };

  const stopTimeFields = (p) => {
    const ty = f[p + '_type'];
    return (
      <div className="tbox">
        {ty === 'exact' && (
          <label className="fld"><span>{t('Soat')}</span><input type="time" value={f[p + '_time']} onChange={(e) => set(p + '_time', e.target.value)} /></label>
        )}
        {ty === 'fcfs' && (
          <div className="ft">
            <label className="fld"><span>{t('Qachondan')}</span><input type="time" value={f[p + '_from']} onChange={(e) => set(p + '_from', e.target.value)} /></label>
            <label className="fld"><span>{t('Qachongacha')}</span><input type="time" value={f[p + '_to']} onChange={(e) => set(p + '_to', e.target.value)} /></label>
          </div>
        )}
      </div>
    );
  };

  const typeSelect = (p, label) => (
    <label className="fld"><span>{t(label)}</span>
      <select value={f[p + '_type']} onChange={(e) => set(p + '_type', e.target.value)}>
        <option value="exact">{t('Aniq vaqt')}</option>
        <option value="fcfs">FCFS</option>
        <option value="asap">ASAP</option>
      </select>
    </label>
  );

  return (
    <div className="fbg" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className={'card fsheet' + (editing ? ' editing' : '')} role="dialog" aria-modal="true" aria-labelledby="lTitle" tabIndex={-1}>
        <div className="sh">
          <div className="sech">
            <h2 id="lTitle">{t(editing ? 'Yukni tahrirlash' : 'Yangi yuk')}</h2>
            <span className="fhd-r">
              {!editing && loads.length > 0 && (
                <button className="linkbtn" id="lDupLast" type="button" onClick={dupLast}>{t('Oxirgi yukdan nusxa')}</button>
              )}
              <button className="ib" type="button" aria-label={t('Yopish')} onClick={close}><IconClose /></button>
            </span>
          </div>
        </div>

        <TruckPicker id="lTruck" label={t('Qaysi truck?')} trucks={trucks} value={f.truck} onChange={(v) => set('truck', v)} />

        <div className="row2 addrs">
          {STOPS.map((p) => (
            <AddressInput key={p} id={p + 'Addr'} label={t(p === 'pickup' ? 'Pickup manzili' : 'Delivery manzili')}
              value={f[p + '_address']} onChange={(v) => setAddress(p, v)} onPick={(it) => pickAddress(p, it)} onBlur={onAddrBlur} />
          ))}
        </div>
        <div className="calcbar">
          {(calc.msg || bothAddr) && (
            <div className="calcline">
              <p className={'calcmsg' + (calc.cls ? ' ' + calc.cls : '')} role="status" aria-live="polite">
                {calc.running && <i className="addr-spin inline" aria-hidden="true" />}
                {calc.msg}{calc.sub && <small>{calc.sub}</small>}
              </p>
              {bothAddr && (
                <span className="calcacts">
                  <button className="linkbtn" type="button" disabled={calc.running} onClick={() => calcMiles(true)}>{t('Mileni hisoblash')}</button>
                  <a className="linkbtn" href={mapsUrl(f.pickup_address.trim(), f.delivery_address.trim())} target="_blank" rel="noopener noreferrer">Google Maps</a>
                </span>
              )}
            </div>
          )}
        </div>

        <div className="row2">
          <label className="fld"><span>{t('Masofa (mile)')}</span>
            <input id="lMiles" type="text" inputMode="decimal" autoComplete="off" placeholder="850" value={f.miles} onChange={(e) => set('miles', e.target.value)} onKeyDown={onEnter} />
          </label>
          <label className="fld"><span>{t('Yuk puli ($)')}</span>
            <input id="lPay" ref={payRef} type="text" inputMode="decimal" autoComplete="off" placeholder="2000" value={f.pay} onChange={(e) => set('pay', e.target.value)} onKeyDown={onEnter} />
          </label>
        </div>
        <div className="rpm"><span>{t('Bir mile uchun narx (RPM)')}</span><b className="num">{rpmText}</b></div>

        <div className="ptgrid">
          <label className="fld"><span>{t('Pickup sanasi')}</span><input id="pickupDate" type="date" value={f.pickup_date} onChange={(e) => setPickupDate(e.target.value)} /></label>
          <label className="fld"><span>{t('Delivery sanasi')}</span><input id="deliveryDate" type="date" value={f.delivery_date} onChange={(e) => set('delivery_date', e.target.value)} /></label>
          {typeSelect('pickup', 'Pickup vaqti')}
          {typeSelect('delivery', 'Delivery vaqti')}
          {stopTimeFields('pickup')}
          {stopTimeFields('delivery')}
        </div>

        <div className="actions">
          <button className="btn primary" type="button" disabled={busy} onClick={submit}>{t(editing ? "O'zgarishni saqlash" : "Yukni qo'shish")}</button>
          {editing && <button className="btn" type="button" onClick={close}>{t('Bekor qilish')}</button>}
        </div>
      </div>
    </div>
  );
}
