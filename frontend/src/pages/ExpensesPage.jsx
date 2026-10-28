import { useEffect, useMemo, useRef, useState } from 'react';
import { DeleteButton, EmptyBox, Skeleton, TruckPicker } from '../components/common.jsx';
import { IconEdit, IconTruckMini } from '../components/Icons.jsx';
import { useI18n } from '../i18n/index.jsx';
import { isDate, todayNY } from '../lib/dates.js';
import { TYPE_KEYS } from '../lib/engine.js';
import { parseNum, usd } from '../lib/format.js';
import { errorText, truckName, useData } from '../state/DataContext.jsx';
import { useToast } from '../state/ToastContext.jsx';

const PAGE = 30;

export default function ExpensesPage() {
  const { t, fmtDMY, typeLabel } = useI18n();
  const toast = useToast();
  const { status, trucks, expenses, truckById, saveExpense, deleteExpense, busy } = useData();
  const [editId, setEditId] = useState(null);
  const [truck, setTruck] = useState(null);
  const [date, setDate] = useState(todayNY());
  const [category, setCategory] = useState('fuel');
  const [amount, setAmount] = useState('');
  const [filter, setFilter] = useState('all');
  const [shown, setShown] = useState(PAGE);
  const formRef = useRef(null);
  const amountRef = useRef(null);

  useEffect(() => {
    if (truck === null && trucks.length) setTruck(trucks[0].id);
  }, [trucks, truck]);

  const selected = truckById.get(truck);
  const driverHint = category === 'driver' && selected && selected.driver_pay_type !== 'none';

  const list = useMemo(
    () => expenses
      .filter((e) => filter === 'all' || e.truck === filter)
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.created_at || '').localeCompare(a.created_at || ''))),
    [expenses, filter],
  );

  const reset = () => { setEditId(null); setAmount(''); setDate(todayNY()); };

  const startEdit = (e) => {
    setEditId(e.id); setTruck(e.truck); setDate(e.date); setCategory(e.category); setAmount(String(e.amount));
    formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    try { amountRef.current.focus({ preventScroll: true }); } catch { /* ignore */ }
  };

  async function save() {
    if (busy) { toast('Oldingi amal tugashini kuting', true); return; }
    if (!selected) { toast("Hali truck yo'q. Avval truck qo'shing.", true); return; }
    const n = parseNum(amount);
    if (!(n > 0) || n > 1000000) { toast('Summani kiriting (0 dan katta son)', true); amountRef.current.focus(); return; }
    if (!isDate(date)) { toast('Sanani kiriting', true); return; }
    try {
      await saveExpense(editId, { truck, date, category, amount: n });
      toast(editId ? "O'zgarish saqlandi" : "Rasxod qo'shildi");
      reset();
    } catch (e) {
      toast(errorText(e), true);
    }
  }

  async function remove(e) {
    if (editId === e.id) reset();
    try {
      await deleteExpense(e.id);
      toast("Rasxod o'chirildi", false, {
        label: 'Qaytarish',
        fn: async () => {
          try {
            await saveExpense(null, { truck: e.truck, date: e.date, category: e.category, amount: e.amount });
            toast('Rasxod qaytarildi');
          } catch (err) { toast(errorText(err), true); }
        },
      });
    } catch (err) {
      toast(errorText(err), true);
    }
  }

  let body;
  if (status === 'loading') body = <Skeleton n={1} />;
  else if (!list.length) {
    body = <EmptyBox>{t(expenses.length ? "Bu truck uchun rasxod yo'q." : "Hali rasxod yo'q. Yuqoridagi formadan yoqilg'i, ta'mirlash va boshqa xarajatlarni qo'shing.")}</EmptyBox>;
  } else {
    body = (
      <>
        <div className="elist">
          {list.slice(0, shown).map((e) => (
            <div key={e.id} className={'erow' + (editId === e.id ? ' editing' : '')}>
              <i className="tav" aria-hidden="true"><IconTruckMini /></i>
              <div className="et"><b>{typeLabel[e.category]}</b><small>{truckName(truckById.get(e.truck))} · {fmtDMY(e.date)}</small></div>
              <span className="eside">
                <b className="num ea">{usd(e.amount)}</b>
                <span className="eacts">
                  <button className="ib" type="button" aria-label={t('Tahrirlash')} onClick={() => startEdit(e)}><IconEdit /></button>
                  <DeleteButton onConfirm={() => remove(e)} />
                </span>
              </span>
            </div>
          ))}
        </div>
        {list.length > shown && (
          <button className="btn" type="button" onClick={() => setShown((n) => n + PAGE)}>{t("Yana ko'rsatish ({n})", { n: list.length - shown })}</button>
        )}
      </>
    );
  }

  return (
    <section className="panel">
      <div className={'card' + (editId ? ' editing' : '')} id="expForm" ref={formRef}>
        <div className="sh">
          <div className="sech"><h2>{t(editId ? 'Rasxodni tahrirlash' : 'Yangi rasxod')}</h2></div>
          <p className="hint">{t("Rasxod qaysi truckka tegishli bo'lsa shuni tanlang. Rent alohida, Rent bo'limida kiritiladi.")}</p>
        </div>
        <div className="row2">
          <TruckPicker id="eTruck" label={t('Qaysi truck?')} trucks={trucks} value={truck} onChange={setTruck} />
          <label className="fld"><span>{t('Sana')}</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <label className="fld"><span>{t('Rasxod turi')}</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {TYPE_KEYS.map((k) => <option key={k} value={k}>{typeLabel[k]}</option>)}
            </select>
          </label>
          <label className="fld"><span>{t('Summa ($)')}</span>
            <input ref={amountRef} type="text" inputMode="decimal" autoComplete="off" placeholder={t('masalan 100')} value={amount}
              onChange={(e) => setAmount(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') save(); }} />
          </label>
        </div>
        {driverHint && (
          <p className="notice">{t("{x} uchun driver maoshi Sozlamadagi stavka bo'yicha avtomatik hisoblanadi. Bu yerga ham yozsangiz, ikki marta hisoblanadi.", { x: truckName(selected) })}</p>
        )}
        <div className="actions">
          <button className="btn primary" type="button" disabled={busy} onClick={save}>{t(editId ? "O'zgarishni saqlash" : "Rasxodni qo'shish")}</button>
          {editId && <button className="btn" type="button" onClick={reset}>{t('Bekor qilish')}</button>}
        </div>
      </div>
      <div className="sech"><h2>{t('Oxirgi rasxodlar')}</h2>{list.length > 0 && <small className="cnt">{t('{n} ta rasxod', { n: list.length })}</small>}</div>
      <TruckPicker id="eFilter" label={t("Qaysi truck rasxodlarini ko'rsatay?")} trucks={trucks} value={filter} withAll small
        onChange={(v) => { setFilter(v); setShown(PAGE); }} />
      {body}
    </section>
  );
}
