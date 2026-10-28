import { useI18n } from '../../i18n/index.jsx';
import { fmtMiles, usd } from '../../lib/format.js';
import { truckName, useData } from '../../state/DataContext.jsx';
import { useLoadUi } from '../../state/LoadUiContext.jsx';
import { DeleteButton } from '../common.jsx';
import { IconChevron, IconEdit, IconTruckMini } from '../Icons.jsx';
import QuickPay from './QuickPay.jsx';
import { stopParts } from './stops.js';
import { useLoadActions } from './useLoadActions.js';

export default function LoadCard({ load: l }) {
  const i18n = useI18n();
  const { t } = i18n;
  const { truckById } = useData();
  const { openSheet, openEdit } = useLoadUi();
  const { remove } = useLoadActions();
  const p = stopParts(l, 'pickup', i18n), d = stopParts(l, 'delivery', i18n);
  const nopay = !(l.pay > 0);
  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };

  return (
    <article className="load" onClick={() => openSheet(l.id)}>
      <div className="lt">
        <span className="tag"><i className="tav" aria-hidden="true"><IconTruckMini /></i>{truckName(truckById.get(l.truck))}</span>
        {nopay ? <span className="badge warn">{t('Pul kiritilmagan')}</span> : <b className="num pay">{usd(l.pay)}</b>}
      </div>
      <div className="route">
        <div className="leg"><span className="k">Pickup</span><b>{p.date}</b><span className="s">{p.sub}</span></div>
        <div className="conn"><i className="d1" /><i className="d2" /><span className="mi num">{fmtMiles(l.miles)} mile</span></div>
        <div className="leg r"><span className="k">Delivery</span><b>{d.date}</b><span className="s">{d.sub}</span></div>
      </div>
      <div className="lb">
        {nopay ? <QuickPay load={l} /> : <span className="chip num">{usd(l.pay / l.miles)} / mile</span>}
        <span className="sp" />
        <span className="lacts">
          <button className="more-b" type="button" aria-label={t("Batafsil ma'lumot")} title={t('Batafsil')} onClick={stop(() => openSheet(l.id))}><IconChevron /></button>
          <button className="ib" type="button" aria-label={t('Tahrirlash')} onClick={stop(() => openEdit(l.id))}><IconEdit /></button>
          <span onClick={(e) => e.stopPropagation()}><DeleteButton onConfirm={() => remove(l)} /></span>
        </span>
      </div>
    </article>
  );
}
