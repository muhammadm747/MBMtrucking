import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Delta, Kpi, Skeleton } from '../components/common.jsx';
import TrendChart, { trendData } from '../components/report/TrendChart.jsx';
import TruckBars from '../components/report/TruckBars.jsx';
import { useI18n } from '../i18n/index.jsx';
import { addDays, daysBetween, nextPayDate, periodOf, todayNY } from '../lib/dates.js';
import { compute, totals } from '../lib/engine.js';
import { fmtMiles, rpm, usd, usd0 } from '../lib/format.js';
import { truckName, useData } from '../state/DataContext.jsx';
import { useLoadUi } from '../state/LoadUiContext.jsx';

export default function HomePage() {
  const i18n = useI18n();
  const { t, fmtDM, fmtDMY } = i18n;
  const { status, trucks, loads, expenses } = useData();
  const { openNew } = useLoadUi();
  const navigate = useNavigate();
  const [hMode, setHMode] = useState('week');

  if (status === 'loading') return <section className="panel"><Skeleton n={3} /></section>;

  const today = todayNY();
  const wk = periodOf('week', today), pw = periodOf('week', addDays(wk.start, -1)), mo = periodOf('month', today);
  const rows = compute(trucks, loads, expenses, 'week', wk.start, wk.end);
  const T = totals(rows);
  const P = totals(compute(trucks, loads, expenses, 'week', pw.start, pw.end));
  const M = totals(compute(trucks, loads, expenses, 'month', mo.start, mo.end));
  const cls = T.net > 0.005 ? '' : T.net < -0.005 ? ' loss' : ' zero';
  const verdict = t(T.net > 0.005 ? 'Foyda qildingiz' : T.net < -0.005 ? "Zarar bo'ldi" : T.gross > 0 || T.exp > 0 ? "Foyda ham, zarar ham yo'q" : "Bu haftada hali yozuv yo'q");
  const d = T.net - P.net;
  const perMile = (g, m) => (m > 0 ? g / m : 0);

  const alerts = [];
  const noPay = loads.filter((l) => !(l.pay > 0));
  if (noPay.length) {
    alerts.push(
      <div key="np" className="al warn"><i />
        <span>{t('{n} ta yukda pul kiritilmagan', { n: noPay.length })}<small>{t('{n} ta truckda', { n: new Set(noPay.map((l) => l.truck)).size })} · {t('hisobotda $0 deb olinadi')}</small></span>
        <button className="linkbtn" type="button" onClick={() => navigate('/loads?nopay=1')}>{t("Ko'rish")}</button>
      </div>,
    );
  }
  for (const tk of trucks) {
    if (!(tk.monthly_rent > 0) || !tk.rent_day) continue;
    const nd = nextPayDate(tk.rent_day, today), df = daysBetween(today, nd);
    if (df <= 7) {
      alerts.push(
        <div key={'r' + tk.id} className={'al' + (df <= 2 ? ' warn' : '')}><i />
          <span>{t('Rent: {x}, {a}', { x: truckName(tk), a: usd(tk.monthly_rent) })}<small>{fmtDMY(nd)} · {df === 0 ? t('bugun') : t('{n} kundan keyin', { n: df })}</small></span>
        </div>,
      );
    }
  }
  if (trucks.length && rows.every((p) => p.count === 0)) {
    alerts.push(<div key="idle" className="al"><i /><span>{t('Bu hafta hali yuk kiritilmagan')}<small>{t("Yangi yuk qo'shish uchun yuqoridagi tugmani bosing")}</small></span></div>);
  }

  return (
    <section className="panel" aria-labelledby="homeTitle">
      <h2 id="homeTitle" hidden>{t('Bosh')}</h2>
      <div className="home">
        <div className="hgrid">
          <div className="hmain">
            <div className={'net' + cls}>
              <div className="nethd"><span className="tag2">{t('Bu hafta')}</span><span className="per">{fmtDM(wk.start)} – {fmtDM(wk.end)}</span></div>
              <div className="netrow"><b className="big num">{(T.net > 0.005 ? '+' : '') + usd0(T.net)}</b><span className="verd">{verdict}</span></div>
              <span className="sub">{t('Daromad {a} − rasxod {b}', { a: usd0(T.gross), b: usd0(T.exp) })}</span>
              {(P.gross > 0 || P.exp > 0) && (
                <span className={'cmp ' + (d > 0.005 ? 'up' : d < -0.005 ? 'down' : '')}>
                  {Math.abs(d) < 0.005 ? t("O'tgan hafta bilan bir xil") : (d > 0 ? '▲ ' : '▼ ') + t(d > 0 ? "O'tgan haftadan {a} ko'p" : "O'tgan haftadan {a} kam", { a: usd0(Math.abs(d)) })}
                </span>
              )}
            </div>
            <div className="qa">
              <button className="btn primary" type="button" onClick={() => { navigate('/loads'); openNew(); }}>+ {t('Yangi yuk')}</button>
              <button className="btn" type="button" onClick={() => navigate('/expenses')}>+ {t('Yangi rasxod')}</button>
            </div>
            <div className="kg3">
              <Kpi label="Daromad" value={usd0(T.gross)} delta={<Delta cur={T.gross} prev={P.gross} dir={1} />} />
              <Kpi label="Rasxod" value={usd0(T.exp)} delta={<Delta cur={T.exp} prev={P.exp} dir={-1} />} />
              <Kpi label="Bu oy sof" value={(M.net < 0 ? '−' : '') + usd0(Math.abs(M.net))} cls={M.net > 0.005 ? 'pos' : M.net < -0.005 ? 'neg' : ''} />
              <Kpi label="Yuklar" value={String(T.count)} delta={<Delta cur={T.count} prev={P.count} dir={1} />} />
              <Kpi label="Mile" value={fmtMiles(T.miles)} delta={<Delta cur={T.miles} prev={P.miles} dir={1} />} />
              <Kpi label="RPM" value={rpm(T.gross, T.miles)} delta={<Delta cur={perMile(T.gross, T.miles)} prev={perMile(P.gross, P.miles)} dir={1} />} />
            </div>
            <div className="card tcard">
              <div className="sech">
                <h2>{t('Sof foyda')}</h2>
                <div className="seg sm" role="group" aria-label={t('Davr turi')}>
                  <button type="button" aria-pressed={hMode === 'week'} onClick={() => setHMode('week')}>{t('12 hafta')}</button>
                  <button type="button" aria-pressed={hMode === 'month'} onClick={() => setHMode('month')}>{t('6 oy')}</button>
                </div>
              </div>
              <TrendChart pts={trendData({ trucks, loads, expenses, mode: hMode, end: today, single: null, n: hMode === 'week' ? 12 : 6, i18n })} />
            </div>
          </div>
          <div className="hside">
            <div className="sech"><h2>{t('Diqqat')}</h2></div>
            <div className="alerts">
              {alerts.length ? alerts : <div className="al ok"><i /><span>{t("Hammasi joyida: pulsiz yuk yo'q, yaqin kunlarda rent to'lovi yo'q.")}</span></div>}
            </div>
            <div className="sech"><h2>{t("Truck'lar bu hafta")}</h2><small>{t('bosing — hisobot')}</small></div>
            <TruckBars rows={rows} quietLabel="Bu hafta yuksiz: {x}" onPick={(id) => navigate(`/report?truck=${id}`)} />
          </div>
        </div>
      </div>
    </section>
  );
}
