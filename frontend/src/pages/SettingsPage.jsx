import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { TruckPicker } from '../components/common.jsx';
import { IconTruckMini } from '../components/Icons.jsx';
import { endpoints } from '../api/client.js';
import { useI18n } from '../i18n/index.jsx';
import { daysBetween, nextPayDate, todayNY } from '../lib/dates.js';
import { fmtMiles, parseNum, usd, usd0 } from '../lib/format.js';
import { useAuth } from '../state/AuthContext.jsx';
import { errorText, truckName, useData } from '../state/DataContext.jsx';
import { LOOKS, usePrefs } from '../state/PrefsContext.jsx';
import { useToast } from '../state/ToastContext.jsx';

const numOrEmpty = (v) => (v ? String(v) : '');
const toForm = (tk) => ({
  name: tk.name, rent: numOrEmpty(tk.monthly_rent), day: numOrEmpty(tk.rent_day),
  dt: tk.driver_pay_type, dr: numOrEmpty(tk.driver_rate), dp: numOrEmpty(tk.dispatch_percent),
});

function TrucksCard() {
  const { t, fmtDMY } = useI18n();
  const toast = useToast();
  const { trucks, saveTruck, setDispatchAll, busy } = useData();
  const [cur, setCur] = useState(null);
  const [f, setF] = useState(null);
  const [dirty, setDirty] = useState(false);

  const truck = trucks.find((x) => x.id === cur) || trucks[0];
  useEffect(() => {
    if (truck && (!dirty || truck.id !== cur)) { setCur(truck.id); setF(toForm(truck)); setDirty(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [truck]);

  const set = (k, v) => { setF((s) => ({ ...s, [k]: v })); setDirty(true); };

  const switchTo = (id) => {
    if (id === cur) return;
    if (dirty) {
      toast(t("{x} o'zgarishlari saqlanmagan", { x: truckName(truck) }), true, {
        label: "Saqlamasdan o'tish",
        fn: () => { setDirty(false); setCur(id); setF(toForm(trucks.find((x) => x.id === id))); },
      });
      return;
    }
    setCur(id);
    setF(toForm(trucks.find((x) => x.id === id)));
  };

  function read() {
    const rent = f.rent.trim() ? parseNum(f.rent) : 0;
    if (!Number.isFinite(rent) || rent < 0 || rent > 1000000) { toast("Rent summasi noto'g'ri", true); return null; }
    let day = 0;
    if (f.day.trim()) {
      day = /^\d{1,2}$/.test(f.day.trim()) ? +f.day.trim() : NaN;
      if (!(day >= 1 && day <= 31)) { toast("To'lov kuni 1 dan 31 gacha bo'lsin", true); return null; }
    }
    let rate = 0;
    if (f.dt !== 'none') {
      rate = f.dr.trim() ? parseNum(f.dr) : NaN;
      const max = f.dt === 'mile' ? 50 : 100;
      if (!Number.isFinite(rate) || rate <= 0 || rate > max) {
        toast(f.dt === 'mile' ? 'Driver stavkasini kiriting ($ / mile, masalan 0.65)' : 'Driver foizini kiriting (1 dan 100 gacha)', true);
        return null;
      }
    }
    const dp = f.dp.trim() ? parseNum(f.dp) : 0;
    if (!Number.isFinite(dp) || dp < 0 || dp > 100) { toast("Dispatch foizi 0 dan 100 gacha bo'lsin", true); return null; }
    return {
      name: f.name.trim().slice(0, 30) || truck.name, monthly_rent: rent, rent_day: day,
      driver_pay_type: f.dt, driver_rate: rate, dispatch_percent: dp,
    };
  }

  async function save(all) {
    if (busy) { toast('Oldingi amal tugashini kuting', true); return; }
    const v = read();
    if (!v) return;
    try {
      const row = await saveTruck(truck.id, v);
      if (all) await setDispatchAll(v.dispatch_percent);
      setDirty(false);
      setF(toForm(row));
      toast(all ? t("Dispatch {p}% hamma truckka qo'llandi", { p: v.dispatch_percent }) : t('{x} saqlandi', { x: row.display_name }));
    } catch (e) {
      toast(errorText(e), true);
    }
  }

  async function addTruck() {
    try {
      const row = await saveTruck(null, { name: 'Truck ' + (trucks.length + 1) });
      setDirty(false); setCur(row.id); setF(toForm(row));
      toast("Truck qo'shildi");
    } catch (e) {
      toast(errorText(e), true);
    }
  }

  if (!truck || !f) {
    return (
      <div className="card">
        <div className="sh"><div className="sech"><h2>{t("Truck'lar")}</h2></div><p className="hint">{t("Hali truck yo'q. Avval truck qo'shing.")}</p></div>
        <div className="actions"><button className="btn primary" type="button" onClick={addTruck}>+ {t("Yangi truck qo'shish")}</button></div>
      </div>
    );
  }

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
  const drvText = (tk) => (tk.driver_pay_type === 'mile' ? usd(tk.driver_rate) + '/mi' : tk.driver_pay_type === 'pct' ? tk.driver_rate + '%' : '—');
  const totalRent = trucks.reduce((s, tk) => s + tk.monthly_rent, 0);
  const onEnter = (e) => { if (e.key === 'Enter') save(false); };

  return (
    <div className="card" id="tkCard">
      <div className="sh">
        <div className="sech"><h2>{t("Truck'lar")}</h2></div>
        <p className="hint">{t('Truckni tanlang va uning nomi, rent, driver maoshi va dispatch foizini kiriting. Hisobot shularga qarab avtomatik hisoblanadi.')}</p>
      </div>
      <TruckPicker id="tkTruck" label={t('Qaysi truck?')} trucks={trucks} value={truck.id} onChange={switchTo} />
      <div className="tkform">
        <label className="fld"><span>{t('Truck nomi')}</span><input type="text" maxLength={30} autoComplete="off" value={f.name} onChange={(e) => set('name', e.target.value)} onKeyDown={onEnter} /></label>
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
            <div className="fld tkall"><button className="linkbtn" type="button" disabled={busy} onClick={() => save(true)}>{t("Shu foizni hamma truckka qo'llash")}</button></div>
          </div>
        </div>
        {example && <p className="tkex">{example}</p>}
      </div>
      <div className="actions">
        <button className="btn primary" type="button" disabled={busy} onClick={() => save(false)}>{t('Saqlash')}</button>
        {dirty && <button className="btn" type="button" onClick={() => { setDirty(false); setF(toForm(truck)); }}>{t('Bekor qilish')}</button>}
      </div>
      <div className="tklist">
        {trucks.map((tk) => {
          const bits = [
            tk.monthly_rent > 0 ? usd0(tk.monthly_rent) + (tk.rent_day ? ' · ' + t('{d}-kuni', { d: tk.rent_day }) : '') : t("Rent yo'q"),
            'Driver ' + drvText(tk),
            'Dispatch ' + (tk.dispatch_percent > 0 ? tk.dispatch_percent + '%' : '—'),
          ];
          return (
            <button key={tk.id} type="button" className={'tkrow' + (tk.id === truck.id ? ' cur' : '')} aria-pressed={tk.id === truck.id} onClick={() => switchTo(tk.id)}>
              <i className="tav" aria-hidden="true"><IconTruckMini /></i>
              <span className="tkn"><b>{truckName(tk)}</b><small>{bits.join(' · ')}</small></span>
            </button>
          );
        })}
        <div className="tktot"><span>{t('Jami rent')}</span><b className="num">{usd(totalRent)}</b></div>
      </div>
      <div className="actions"><button className="btn" type="button" disabled={busy} onClick={addTruck}>+ {t("Yangi truck qo'shish")}</button></div>
    </div>
  );
}

function BackupCard() {
  const { t } = useI18n();
  const toast = useToast();
  const { loads, expenses, importBackup, busy } = useData();
  const fileRef = useRef(null);

  async function onFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    toast('Tiklanmoqda');
    try {
      const r = await importBackup(file);
      let m = t("{l} yuk va {e} rasxod qo'shildi", { l: r.loads_added, e: r.expenses_added });
      if (r.trucks_created) m += ', ' + t('{t} ta truck yaratildi', { t: r.trucks_created });
      if (r.skipped) m += t(', {n} ta allaqachon bor edi', { n: r.skipped });
      if (r.invalid) m += t(", {n} ta noto'g'ri yozuv o'tkazib yuborildi", { n: r.invalid });
      toast(m);
    } catch (err) {
      const detail = err && err.data && err.data.detail;
      toast(detail === 'invalid_json' ? 'Fayl JSON emas yoki buzilgan' : detail === 'nothing_to_restore' ? "Faylda tiklanadigan ma'lumot topilmadi" : errorText(err), true);
    }
  }

  return (
    <div className="card">
      <div className="sech"><h2>{t('Zaxira nusxa')}</h2></div>
      <p className="hint">{t("Ma'lumot serverdagi bazada saqlanadi va har qanday qurilmadan bir xil ko'rinadi.")}</p>
      <p className="hint">{t('Serverda hozir: {l} ta yuk, {e} ta rasxod.', { l: loads.length, e: expenses.length })}</p>
      <div className="actions">
        <a className="btn primary" href={endpoints.exportUrl} download>{t('Yuklab olish')}</a>
        <button className="btn" type="button" disabled={busy} onClick={() => fileRef.current.click()}>{t('Tiklash')}</button>
      </div>
      <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={onFile} />
      <p className="hint" dangerouslySetInnerHTML={{ __html: t("<b>Yuklab olish</b>: barcha yuk, rasxod, truck nomi va rentni bitta fayl qiladi. <b>Tiklash</b>: fayldagi yozuvlarni qo'shadi, mavjudlarini o'zgartirmaydi va hech narsani o'chirmaydi. Truck nomlari va rent faqat hali saqlanmagan bo'lsa tiklanadi.") }} />
    </div>
  );
}

export default function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme, look, setLook } = usePrefs();
  const { user, logout } = useAuth();
  return (
    <section className="panel">
      <TrucksCard />
      <div className="card">
        <div className="sech"><h2>Til / Language</h2></div>
        <div className="seg" role="group" aria-label="Til / Language">
          <button type="button" aria-pressed={lang === 'uz'} onClick={() => setLang('uz')}>O'zbekcha</button>
          <button type="button" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>English</button>
        </div>
      </div>
      <div className="card">
        <div className="sech"><h2>{t('Rejim')}</h2></div>
        <div className="seg s3" role="group" aria-label={t('Rejim')}>
          {[['auto', 'Avto'], ['light', "Yorug'"], ['dark', 'Tungi']].map(([v, l]) => (
            <button key={v} type="button" aria-pressed={theme === v} onClick={() => setTheme(v)}>{t(l)}</button>
          ))}
        </div>
        <p className="hint">{t('Avto: qurilmangiz sozlamasiga qarab o\'zi almashadi.')}</p>
      </div>
      <div className="card">
        <div className="sech"><h2>{t("Ko'rinish")}</h2></div>
        <div className="looks">
          {LOOKS.map(([key, name, desc]) => (
            <button key={key} className="lookbtn" type="button" aria-pressed={look === key} onClick={() => setLook(key)}>
              <span className="sw" data-look={key} aria-hidden="true"><i /><i /><i /></span>
              <span className="ln">{name}</span>
              <span className="ld">{t(desc)}</span>
            </button>
          ))}
        </div>
        <p className="hint">{t("Faqat rang va shakl o'zgaradi, ma'lumotingizga ta'sir qilmaydi.")}</p>
      </div>
      <BackupCard />
      <div className="card">
        <div className="sech"><h2>{t('Hisob')}</h2></div>
        <p className="hint">{t('Kirgan: {x}', { x: user ? user.name : '—' })}</p>
        <div className="actions">
          <Link className="btn" to="/account">{t('Akkaunt sozlamalari')}</Link>
          <button className="btn" type="button" onClick={logout}>{t('Chiqish')}</button>
        </div>
      </div>
    </section>
  );
}
