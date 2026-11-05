import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { TruckPicker } from '../components/common.jsx';
import { AddTruckSheet, TruckFields } from '../components/TruckForm.jsx';
import { IconTruckMini } from '../components/Icons.jsx';
import { endpoints } from '../api/client.js';
import { useI18n } from '../i18n/index.jsx';
import { usd, usd0 } from '../lib/format.js';
import { readTruckForm, toForm } from '../lib/truckForm.js';
import { useAuth } from '../state/AuthContext.jsx';
import { errorText, truckName, useData } from '../state/DataContext.jsx';
import { LOOKS, usePrefs } from '../state/PrefsContext.jsx';
import { useToast } from '../state/ToastContext.jsx';

function TrucksCard() {
  const { t } = useI18n();
  const toast = useToast();
  const { trucks, saveTruck, setDispatchAll, busy } = useData();
  const [cur, setCur] = useState(null);
  const [f, setF] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [adding, setAdding] = useState(false);

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
    const { error, data } = readTruckForm(f);
    if (error) { toast(error, true); return null; }
    return { name: f.name.trim().slice(0, 30) || truck.name, ...data };
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

  const closeAdd = () => setAdding(false);
  function onAdded(row) {
    setAdding(false);
    // unsaved edits of the current truck stay in the form; otherwise show the new truck
    if (!dirty) { setCur(row.id); setF(toForm(row)); }
    toast("Truck qo'shildi");
  }
  const addBtn = <button className="btn primary sm" type="button" disabled={busy} onClick={() => setAdding(true)}>+ {t('Add truck')}</button>;
  const addSheet = adding && <AddTruckSheet onClose={closeAdd} onAdded={onAdded} />;

  if (!truck || !f) {
    return (
      <div className="card">
        <div className="sh"><div className="sech tkhead"><h2>{t("Truck'lar")}</h2>{addBtn}</div><p className="hint">{t("Hali truck yo'q. Avval truck qo'shing.")}</p></div>
        {addSheet}
      </div>
    );
  }

  const drvText = (tk) => (tk.driver_pay_type === 'mile' ? usd(tk.driver_rate) + '/mi' : tk.driver_pay_type === 'pct' ? tk.driver_rate + '%' : '—');
  const totalRent = trucks.reduce((s, tk) => s + tk.monthly_rent, 0);
  const onEnter = (e) => { if (e.key === 'Enter') save(false); };

  return (
    <div className="card" id="tkCard">
      <div className="sh">
        <div className="sech tkhead"><h2>{t("Truck'lar")}</h2>{addBtn}</div>
        <p className="hint">{t('Truckni tanlang va uning nomi, rent, driver maoshi va dispatch foizini kiriting. Hisobot shularga qarab avtomatik hisoblanadi.')}</p>
      </div>
      <TruckPicker id="tkTruck" label={t('Qaysi truck?')} trucks={trucks} value={truck.id} onChange={switchTo} />
      <TruckFields
        f={f} set={set} onEnter={onEnter}
        dispatchExtra={<div className="fld tkall"><button className="linkbtn" type="button" disabled={busy} onClick={() => save(true)}>{t("Shu foizni hamma truckka qo'llash")}</button></div>}
      />
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
      {addSheet}
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
