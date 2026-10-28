import { useI18n } from '../../i18n/index.jsx';
import { daysBetween, todayNY } from '../../lib/dates.js';
import { fmtMiles, usd0 } from '../../lib/format.js';
import { truckName, useData } from '../../state/DataContext.jsx';
import { useLoadUi } from '../../state/LoadUiContext.jsx';
import { IconTruckMini } from '../Icons.jsx';

const ORDER = ['road', 'wait', 'empty'];

/** Where every truck is today: on the road, waiting for a booked pickup, or empty. */
export default function LiveBox() {
  const { t, fmtDM } = useI18n();
  const { trucks, loads } = useData();
  const { openSheet } = useLoadUi();
  const today = todayNY();
  const rel = (d) => {
    const n = daysBetween(today, d);
    return n === 0 ? t('bugun') : n === 1 ? t('ertaga') : n > 0 ? t('{n} kundan keyin', { n }) : t('{n} kun oldin', { n: -n });
  };
  const LBL = { road: t("Yo'lda"), wait: t('Yuk kutmoqda'), empty: t("Bo'sh") };

  const cards = trucks.map((tk) => {
    const mine = loads.filter((l) => l.truck === tk.id);
    const cur = mine.filter((l) => l.pickup_date <= today && l.delivery_date >= today).sort((a, b) => (a.pickup_date < b.pickup_date ? 1 : -1))[0];
    if (cur) return { k: 'road', tk, load: cur };
    const next = mine.filter((l) => l.pickup_date > today).sort((a, b) => (a.pickup_date < b.pickup_date ? -1 : 1))[0];
    const last = mine.filter((l) => l.delivery_date < today).sort((a, b) => (a.delivery_date < b.delivery_date ? 1 : -1))[0];
    return next ? { k: 'wait', tk, load: next, last } : { k: 'empty', tk, load: last, last };
  });
  const groups = Object.fromEntries(ORDER.map((k) => [k, cards.filter((c) => c.k === k)]));

  const head = (c) => (
    <span className="lvtop">
      <i className="lvav" aria-hidden="true"><IconTruckMini /></i>
      <b className="lvname">{truckName(c.tk)}</b>
      <span className="lvpill">{LBL[c.k]}</span>
    </span>
  );
  const idleText = (last) => (last ? t("{n} kundan beri bo'sh", { n: daysBetween(last.delivery_date, today) }) : t("Hali yuk yo'q"));

  const body = (c) => {
    if (c.k === 'road') {
      const l = c.load, tot = daysBetween(l.pickup_date, l.delivery_date), el = daysBetween(l.pickup_date, today);
      const pct = Math.max(8, Math.min(100, Math.round(((el + 1) / (tot + 1)) * 100)));
      const dn = daysBetween(today, l.delivery_date);
      const stop = (cls, lab, d, addr) => (
        <li className={cls}><span className="lvdot" aria-hidden="true" /><span className="lvsl">{lab}</span><span className="lvsv"><b>{fmtDM(d)}</b>{addr ? ' · ' + addr : ''}</span></li>
      );
      return (
        <>
          <ul className="lvroute">{stop('p', 'Pickup', l.pickup_date, l.pickup_address)}{stop('d', 'Delivery', l.delivery_date, l.delivery_address)}</ul>
          <span className="lvprog" aria-hidden="true"><span style={{ width: pct + '%' }} /></span>
          <span className="lvfoot">
            <span className={'lveta' + (dn === 0 ? ' now' : '')}>{dn === 0 ? t('Bugun yetkazadi') : t('Yetkazish: {w}', { w: rel(l.delivery_date) })}</span>
            <span className="lvnum">{fmtMiles(l.miles)} mi · <b>{l.pay > 0 ? usd0(l.pay) : t('Pul kiritilmagan')}</b></span>
          </span>
        </>
      );
    }
    if (c.k === 'wait') {
      const l = c.load;
      return (
        <>
          <span className="lvbig">{t('Pickup {w}', { w: rel(l.pickup_date) })}</span>
          <span className="lvsub">{fmtDM(l.pickup_date) + (l.pickup_address ? ' · ' + l.pickup_address : '') + ' · ' + idleText(c.last)}</span>
        </>
      );
    }
    return (
      <>
        <span className="lvbig">{idleText(c.last)}</span>
        <span className="lvsub">{c.last ? t('Oxirgi delivery: {d}', { d: fmtDM(c.last.delivery_date) }) + (c.last.delivery_address ? ' · ' + c.last.delivery_address : '') : t("Yangi yuk qo'shing")}</span>
      </>
    );
  };

  const card = (c) => (c.load
    ? <button key={c.tk.id} type="button" className={'lvc k-' + c.k} onClick={() => openSheet(c.load.id)}>{head(c)}{body(c)}</button>
    : <div key={c.tk.id} className={'lvc k-' + c.k}>{head(c)}{body(c)}</div>);

  const groupTitle = { empty: t("Bo'sh truck'lar"), wait: t('Yuk kutayotganlar'), road: t("Yo'ldagilar") };

  return (
    <div className="live card">
      <div className="lvhd"><div><h2>{t("Truck'lar hozir")}</h2><p className="lvdate">{t('Bugun, {d}', { d: fmtDM(today) })}</p></div></div>
      <div className="lvstats">
        {ORDER.map((k) => <span key={k} className={'lvst k-' + k}><b>{groups[k].length}</b><small>{LBL[k]}</small></span>)}
      </div>
      <div className="lvbar" role="img" aria-label={t("Yo'lda: {n}", { n: groups.road.length }) + ', ' + t("Bo'sh: {n}", { n: groups.empty.length })}>
        {ORDER.flatMap((k) => groups[k].map((c) => <span key={c.tk.id} className={'k-' + k} title={truckName(c.tk) + ' — ' + LBL[k]} />))}
      </div>
      {['empty', 'wait', 'road'].map((k) => groups[k].length > 0 && (
        <section key={k} className={'lvg k-' + k}>
          <h3>{groupTitle[k]} <span>{groups[k].length}</span></h3>
          <div className="lvgrid">{groups[k].map(card)}</div>
        </section>
      ))}
    </div>
  );
}
