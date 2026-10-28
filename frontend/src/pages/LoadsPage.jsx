import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EmptyBox, Skeleton, TruckPicker } from '../components/common.jsx';
import { IconPlus } from '../components/Icons.jsx';
import LoadCard from '../components/loads/LoadCard.jsx';
import { useI18n } from '../i18n/index.jsx';
import { cmpLoads } from '../lib/engine.js';
import { useData } from '../state/DataContext.jsx';
import { useLoadUi } from '../state/LoadUiContext.jsx';

const PAGE = 25;

export default function LoadsPage() {
  const { t } = useI18n();
  const { status, trucks, loads } = useData();
  const { openNew } = useLoadUi();
  const [params, setParams] = useSearchParams();
  const [shown, setShown] = useState(PAGE);

  const truck = params.get('truck') ? Number(params.get('truck')) : 'all';
  const noPay = params.get('nopay') === '1';
  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value === null) next.delete(key); else next.set(key, value);
    setParams(next, { replace: true });
    setShown(PAGE);
  };

  const list = useMemo(
    () => loads.filter((l) => (truck === 'all' || l.truck === truck) && (!noPay || !(l.pay > 0))).sort(cmpLoads),
    [loads, truck, noPay],
  );

  let body;
  if (status === 'loading') body = <Skeleton n={2} />;
  else if (!list.length) {
    body = loads.length
      ? <EmptyBox>{t(noPay ? "Puli kiritilmagan yuk yo'q." : "Bu truck uchun yuk yo'q.")}</EmptyBox>
      : (
        <EmptyBox>
          <p>{t("Hali yuk yo'q. Boshlash uchun:")}</p>
          <ol className="steps">
            <li>{t('Truck, mile va yuk pulini kiriting.')}</li>
            <li>{t('Pickup va Delivery sanasini tanlang.')}</li>
            <li>{t('"Yukni qo\'shish" tugmasini bosing.')}</li>
          </ol>
        </EmptyBox>
      );
  } else {
    body = (
      <>
        <div className="cards">{list.slice(0, shown).map((l) => <LoadCard key={l.id} load={l} />)}</div>
        {list.length > shown && (
          <button className="btn" type="button" onClick={() => setShown((n) => n + PAGE)}>{t("Yana ko'rsatish ({n})", { n: list.length - shown })}</button>
        )}
      </>
    );
  }

  return (
    <section className="panel" id="tab-loads">
      <div className="lhead">
        <div className="sech"><h2>{t('Yuklar')}</h2>{list.length > 0 && <small className="cnt">{t('{n} ta yuk', { n: list.length })}</small>}</div>
        <button className="btn primary" id="lNew" type="button" onClick={openNew}>+ <span>{t('Yangi yuk')}</span></button>
      </div>
      <TruckPicker id="lFilter" label={t("Qaysi truck yuklarini ko'rsatay?")} trucks={trucks} value={truck} withAll small
        onChange={(v) => setFilter('truck', v === 'all' ? null : String(v))} />
      <button className="tgl" type="button" aria-pressed={noPay} onClick={() => setFilter('nopay', noPay ? null : '1')}>
        <i aria-hidden="true" /><span>{t('Faqat puli kiritilmaganlar')}</span>
      </button>
      {body}
      <button className="fab" type="button" aria-label={t('Yangi yuk')} onClick={openNew}><IconPlus /></button>
    </section>
  );
}
