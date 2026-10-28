import { useI18n } from '../../i18n/index.jsx';
import { daysBetween, dowOf, nyParts, periodOf } from '../../lib/dates.js';
import { loadCut } from '../../lib/engine.js';
import { fmtMiles, usd } from '../../lib/format.js';
import { truckName, useData } from '../../state/DataContext.jsx';
import { useLoadUi } from '../../state/LoadUiContext.jsx';
import { DeleteButton, Kpi, useDialog } from '../common.jsx';
import { IconClose } from '../Icons.jsx';
import QuickPay from './QuickPay.jsx';
import { stopFull } from './stops.js';
import { useLoadActions } from './useLoadActions.js';

function CutBox({ load: l, truck }) {
  const { t } = useI18n();
  const c = loadCut(truck, l);
  if (!(c.drv > 0.004 || c.disp > 0.004)) return null;
  const type = truck.driver_pay_type, r = truck.driver_rate;
  const dsub = type === 'mile' ? fmtMiles(l.miles) + ' mi × ' + usd(r) : type === 'pct' ? r + '%' : '';
  return (
    <dl className="sh-info">
      <div><dt>{t('Yuk puli')}</dt><dd>{usd(l.pay)}</dd></div>
      {c.drv > 0.004 && <div><dt>{t('Driver maoshi')} {dsub && <small>({dsub})</small>}</dt><dd className="neg">−{usd(c.drv)}</dd></div>}
      {c.disp > 0.004 && <div><dt>Dispatch <small>({truck.dispatch_percent}%)</small></dt><dd className="neg">−{usd(c.disp)}</dd></div>}
      <div><dt><b>{t('Sizga qoladi')}</b></dt><dd><b className={c.net >= 0 ? 'pos' : 'neg'}>{usd(c.net)}</b></dd></div>
    </dl>
  );
}

export default function LoadSheet() {
  const i18n = useI18n();
  const { t, fmtDM, MON, MONF } = i18n;
  const { loads, truckById } = useData();
  const { sheetId, closeSheet, openEdit, openDup } = useLoadUi();
  const { remove } = useLoadActions();
  const l = sheetId ? loads.find((x) => x.id === sheetId) : null;
  useDialog(!!l, closeSheet);
  if (!l) return null;

  const truck = truckById.get(l.truck);
  const p = stopFull(l, 'pickup', i18n, dowOf), d = stopFull(l, 'delivery', i18n, dowOf);
  const nopay = !(l.pay > 0);
  const days = daysBetween(l.pickup_date, l.delivery_date);
  const wk = periodOf('week', l.pickup_date);
  const created = l.created_at ? nyParts(new Date(l.created_at)) : null;

  return (
    <div className="sheetbg" onMouseDown={(e) => { if (e.target === e.currentTarget) closeSheet(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="shTitle" tabIndex={-1}>
        <div className="sh-top">
          <div><h2 id="shTitle">{truckName(truck)}</h2><p>{fmtDM(l.pickup_date)} → {fmtDM(l.delivery_date)}</p></div>
          <button className="ib" type="button" aria-label={t('Yopish')} onClick={closeSheet} autoFocus><IconClose /></button>
        </div>
        <div className={'sh-pay' + (nopay ? ' np' : '')}>
          <span>{t('Yuk puli')}</span>
          <b className="num">{nopay ? t('Pul kiritilmagan') : usd(l.pay)}</b>
          {nopay && <QuickPay load={l} />}
        </div>
        <div className="sh-stats">
          <Kpi label="Masofa" value={fmtMiles(l.miles) + ' mi'} />
          <Kpi label="Bir mile" value={nopay ? '—' : usd(l.pay / l.miles)} />
          <Kpi label="Muddat" value={days <= 0 ? t('Shu kuni') : t('{n} kun', { n: days + 1 })} />
        </div>
        {truck && <CutBox load={l} truck={truck} />}
        <div className="sh-stops">
          <div className="sh-stop"><h3><span className="bdg" aria-hidden="true">1</span>Pickup</h3><b>{p.big}</b><span>{p.what}</span>{l.pickup_address && <span>{l.pickup_address}</span>}</div>
          <div className="sh-stop"><h3><span className="bdg" aria-hidden="true">2</span>Delivery</h3><b>{d.big}</b><span>{d.what}</span>{l.delivery_address && <span>{l.delivery_address}</span>}</div>
        </div>
        <dl className="sh-info">
          <div><dt>{t('Haftalik hisobot')}</dt><dd>{fmtDM(wk.start)} – {fmtDM(wk.end)}</dd></div>
          <div><dt>{t('Oylik hisobot')}</dt><dd>{MONF[+l.pickup_date.slice(5, 7) - 1]} {l.pickup_date.slice(0, 4)}</dd></div>
          <div><dt>{t("Qo'shilgan vaqt")}</dt><dd>{created ? `${created.d} ${MON[created.m - 1]} ${created.y}, ${created.hh}:${created.mm} (New York)` : '—'}</dd></div>
        </dl>
        <div className="sh-act">
          <button className="btn primary" type="button" onClick={() => openEdit(l.id)}>{t('Tahrirlash')}</button>
          <button className="btn" type="button" onClick={() => openDup(l.id)}>{t('Nusxa')}</button>
          <DeleteButton variant="btn" onConfirm={() => { closeSheet(); remove(l); }} />
        </div>
      </div>
    </div>
  );
}
