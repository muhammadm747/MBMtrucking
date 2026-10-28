import { useNavigate, useSearchParams } from 'react-router-dom';
import { EmptyBox, Kpi, Skeleton, TruckPicker } from '../components/common.jsx';
import { IconChevron } from '../components/Icons.jsx';
import LiveBox from '../components/report/LiveBox.jsx';
import TrendChart, { trendData } from '../components/report/TrendChart.jsx';
import TruckBars from '../components/report/TruckBars.jsx';
import { useI18n } from '../i18n/index.jsx';
import { isDate, periodOf, shiftAnchor, todayNY } from '../lib/dates.js';
import { byGross, compute, totals, TYPE_KEYS } from '../lib/engine.js';
import { fmtMiles, rpm, usd, usd0 } from '../lib/format.js';
import { truckName, truckShort, useData } from '../state/DataContext.jsx';
import { stopParts } from '../components/loads/stops.js';

export default function ReportPage() {
  const i18n = useI18n();
  const { t, fmtDM, MONF, typeLabel, typeShort } = i18n;
  const { status, trucks, loads, expenses } = useData();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const mode = params.get('mode') === 'month' ? 'month' : 'week';
  const anchor = isDate(params.get('date')) ? params.get('date') : todayNY();
  const truckParam = params.get('truck') ? Number(params.get('truck')) : 'all';
  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v === null ? next.delete(k) : next.set(k, v)));
    setParams(next, { replace: true });
  };

  const { start, end } = periodOf(mode, anchor);
  const sy = start.slice(0, 4), ey = end.slice(0, 4);
  const label = mode === 'week'
    ? `${fmtDM(start)}${sy !== ey ? ' ' + sy : ''} – ${fmtDM(end)} ${ey}`
    : `${MONF[+start.slice(5, 7) - 1]} ${sy}`;
  const sub = mode === 'week' ? t('Dushanba–yakshanba') : `${fmtDM(start)} – ${fmtDM(end)} ${ey}`;
  const today = todayNY();
  const isNow = today >= start && today <= end;

  const controls = (
    <div className="card ctl">
      <div className="seg" role="group" aria-label={t('Davr turi')}>
        <button type="button" aria-pressed={mode === 'week'} onClick={() => update({ mode: null })}>{t('Hafta')}</button>
        <button type="button" aria-pressed={mode === 'month'} onClick={() => update({ mode: 'month' })}>{t('Oy')}</button>
      </div>
      <div className="pnav">
        <button className="ib" type="button" aria-label={t('Oldingi davr')} onClick={() => update({ date: shiftAnchor(mode, anchor, -1) })}><IconChevron dir="left" size={22} /></button>
        <div className="plabel"><b>{label}</b><span>{sub}</span>{isNow && <span className="now">{t('Joriy davr')}</span>}</div>
        <button className="ib" type="button" aria-label={t('Keyingi davr')} onClick={() => update({ date: shiftAnchor(mode, anchor, 1) })}><IconChevron size={22} /></button>
      </div>
      {!isNow && <button className="linkbtn" type="button" onClick={() => update({ date: null })}>{t('Bugungi davrga qaytish')}</button>}
      <TruckPicker id="rTruck" label={t('Qaysi truck hisoboti?')} trucks={trucks} value={truckParam} withAll small
        onChange={(v) => update({ truck: v === 'all' ? null : String(v) })} />
    </div>
  );

  if (status === 'loading') return <section className="panel">{controls}<Skeleton n={3} /></section>;

  const rows = compute(trucks, loads, expenses, mode, start, end);
  const singleIdx = truckParam === 'all' ? -1 : rows.findIndex((r) => r.truck.id === truckParam);
  const single = singleIdx >= 0 ? rows[singleIdx] : null;
  const view = single ? [single] : rows;
  const sorted = view.slice().sort(byGross);
  const T = totals(view);

  const cls = T.net > 0.005 ? '' : T.net < -0.005 ? ' loss' : ' zero';
  const verdict = t(T.net > 0.005 ? 'Foyda qildingiz' : T.net < -0.005 ? "Zarar bo'ldi" : T.gross > 0 || T.exp > 0 ? "Foyda ham, zarar ham yo'q" : "Bu davrda yozuv yo'q");
  const perTx = `${t(mode === 'week' ? 'Hafta' : 'Oy')}: ${label}${single ? ' · ' + truckName(single.truck) : ''}`;

  // trucks whose loads in this period have no rate entered
  const miss = new Map();
  let missLoads = 0;
  for (const l of loads) {
    if (l.pickup_date < start || l.pickup_date > end || (single && l.truck !== single.truck.id) || l.pay > 0) continue;
    miss.set(l.truck, (miss.get(l.truck) || 0) + 1);
    missLoads++;
  }
  const missTrucks = rows.filter((r) => miss.has(r.truck.id));
  const noLoad = view.filter((p) => p.count === 0).map((p) => truckName(p.truck));
  const noLoadNote = noLoad.length && !single ? t("Bu davrda yuk yo'q: {x}", { x: noLoad.join(', ') }) : '';

  const cell = (v, c) => <td className={v > 0.005 ? c + (c === 'pos' ? ' tp' : ' tl') : c}>{v > 0.005 ? usd(v) : '—'}</td>;
  const z = (v) => (v > 0.005 ? usd(v) : '—');
  const hasDrv = T.drv > 0.004, hasDisp = T.disp > 0.004;

  let detail = null;
  if (single) {
    const items = [];
    const tk = single.truck;
    for (const l of loads) {
      if (l.truck !== tk.id || l.pickup_date < start || l.pickup_date > end) continue;
      const p = stopParts(l, 'pickup', i18n), d = stopParts(l, 'delivery', i18n);
      items.push({ key: 'l' + l.id, date: l.pickup_date, ord: 0, title: t('Yuk'), sub: `${fmtMiles(l.miles)} mile, ${rpm(l.pay, l.miles)} / mile. ${p.date} ${p.sub} → ${d.date} ${d.sub}`, amt: l.pay, pos: true });
    }
    for (const e of expenses) {
      if (e.truck !== tk.id || e.date < start || e.date > end) continue;
      items.push({ key: 'e' + e.id, date: e.date, ord: 1, title: typeLabel[e.category], sub: '', amt: e.amount, pos: false });
    }
    if (single.drv > 0.004) items.push({ key: 'drv', date: '9999-12-30', none: true, ord: 3, title: t('Driver maoshi (avto)'), sub: tk.driver_pay_type === 'mile' ? `${fmtMiles(single.miles)} mi × ${usd(tk.driver_rate)}` : `${tk.driver_rate}% ${t('yuk pulidan')}`, amt: single.drv, pos: false });
    if (single.disp > 0.004) items.push({ key: 'disp', date: '9999-12-30', none: true, ord: 4, title: 'Dispatch', sub: `${tk.dispatch_percent}% ${t('yuk pulidan')}`, amt: single.disp, pos: false });
    if (single.rent > 0) items.push({ key: 'rent', date: single.rentDate || '9999-12-31', none: !single.rentDate, ord: 2, title: 'Rent', sub: single.rentDate ? '' : t('Oylik rentning 12/52 qismi'), amt: single.rent, pos: false });
    items.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.ord - b.ord));
    detail = (
      <>
        <div className="sech"><h2>{t('Yuk va rasxodlar')}</h2><small>{truckName(tk)}</small></div>
        {items.length ? (
          <ul className="detail">
            {items.map((i) => (
              <li key={i.key}>
                <span className="d">{i.none ? '—' : fmtDM(i.date)}</span>
                <span className="t">{i.title}{i.sub && <small>{i.sub}</small>}</span>
                <span className={'a num ' + (i.pos ? 'pos' : 'neg')}>{(i.pos ? '+' : '−') + usd(i.amt)}</span>
              </li>
            ))}
          </ul>
        ) : <EmptyBox>{t("Bu davrda yozuv yo'q.")}</EmptyBox>}
      </>
    );
  }

  return (
    <section className="panel" id="tab-report">
      {controls}
      <div className="rep">
        <div className={'net' + cls}>
          <div className="nethd"><span className="tag2">{t('Sof natija')}</span><span className="per">{perTx}</span></div>
          <div className="netrow"><b className="big num">{(T.net > 0.005 ? '+' : '') + usd0(T.net)}</b><span className="verd">{verdict}</span></div>
          <span className="sub">{t('Daromad {a} − rasxod {b}', { a: usd0(T.gross), b: usd0(T.exp) })}</span>
        </div>

        <LiveBox />

        {missTrucks.length > 0 ? (
          <div className="miss">
            <div className="misshd"><b>{t('{n} ta truckda yuk puli (rate) kiritilmagan', { n: missTrucks.length })}</b><span>{t('{n} ta yuk', { n: missLoads })}</span></div>
            <div className="missl">
              {missTrucks.map((r) => (
                <button key={r.truck.id} type="button" className="mchip" onClick={() => navigate(`/loads?truck=${r.truck.id}&nopay=1`)}>
                  <b>{truckShort(r.truck)}</b><span>{t('{n} ta yuk', { n: miss.get(r.truck.id) })}</span>
                </button>
              ))}
            </div>
            <p className="missn">{t('Truckni bosing, uning yuklari ochiladi. Pul kiritilmagan yuklar $0 deb hisoblanadi.')}{noLoadNote && ' ' + noLoadNote}</p>
          </div>
        ) : T.count > 0 ? (
          <div className="miss ok">{t('Hamma truckda yuk puli kiritilgan')}{noLoadNote && ' · ' + noLoadNote}</div>
        ) : null}

        <div className="kg3">
          <Kpi label="Daromad" value={usd0(T.gross)} />
          <Kpi label="Rasxod" value={usd0(T.exp)} />
          <Kpi label="Mile" value={fmtMiles(T.miles)} />
          <Kpi label="RPM" value={rpm(T.gross, T.miles)} />
          <Kpi label="Rasxod / mile" value={rpm(T.exp, T.miles)} />
          <Kpi label="Yuk soni" value={String(T.count)} />
        </div>

        <div className="card tcard">
          <div className="sech"><h2>{t('Sof foyda')}</h2><small>{t(mode === 'week' ? 'oxirgi 12 hafta' : 'oxirgi 6 oy') + (single ? ' · ' + truckName(single.truck) : '')}</small></div>
          <TrendChart pts={trendData({ trucks, loads, expenses, mode, end: anchor, single: single ? singleIdx : null, n: mode === 'week' ? 12 : 6, i18n })} />
        </div>

        {!single && view.some((p) => Math.abs(p.net) > 0.005) && (
          <>
            <div className="sh"><div className="sech"><h2>{t('Truck natijasi')}</h2><small>{t('yashil — foyda, qizil — zarar')}</small></div></div>
            <TruckBars rows={view} quietLabel="Yozuvsiz: {x}" />
          </>
        )}

        <div className="sh"><div className="sech"><h2>{t("Truck bo'yicha")}</h2></div></div>
        <div className="tcards">
          {sorted.map((p) => (
            <div key={p.i} className="tcrow">
              <div className="tcl">
                <b>{truckName(p.truck)}</b>
                <small>{t('{n} ta yuk', { n: p.count })} · {fmtMiles(p.miles)} mi · RPM {rpm(p.gross, p.miles)}</small>
                <small>{t('Daromad')} {usd(p.gross)} · {t('Rasxod')} {usd(p.exp)}</small>
              </div>
              <b className={'num ' + (p.net > 0.005 ? 'pos' : p.net < -0.005 ? 'neg' : 'dim')}>{(p.net > 0.005 ? '+' : '') + usd(p.net)}</b>
            </div>
          ))}
        </div>
        <div className="tscroll twide">
          <table>
            <thead><tr><th className="l">Truck</th><th>{t('Yuk soni')}</th><th>Mile</th><th>{t('Daromad (gross)')}</th><th>RPM</th><th>{t('Rasxod')}</th><th>{t('Foyda')}</th><th>{t('Zarar')}</th></tr></thead>
            <tbody>
              {sorted.map((p) => (
                <tr key={p.i}>
                  <td className="l">{truckName(p.truck)}</td><td>{p.count}</td><td>{fmtMiles(p.miles)}</td><td>{usd(p.gross)}</td><td>{rpm(p.gross, p.miles)}</td><td>{usd(p.exp)}</td>
                  {cell(p.net > 0.005 ? p.net : 0, 'pos')}{cell(p.net < -0.005 ? -p.net : 0, 'neg')}
                </tr>
              ))}
            </tbody>
            {!single && (
              <tfoot><tr><td className="l">{t('JAMI')}</td><td>{T.count}</td><td>{fmtMiles(T.miles)}</td><td>{usd(T.gross)}</td><td>{rpm(T.gross, T.miles)}</td><td>{usd(T.exp)}</td><td className="pos">{usd(T.profit)}</td><td className="neg">{usd(T.loss)}</td></tr></tfoot>
            )}
          </table>
        </div>

        {detail}

        <details className="more">
          <summary>{t('Rasxodlar tafsiloti')}</summary>
          <div className="moreb">
            <div className="tscroll">
              <table>
                <thead><tr><th className="l">Truck</th>{TYPE_KEYS.map((k) => <th key={k}>{typeShort[k]}</th>)}{hasDrv && <th>{t('Driver (avto)')}</th>}{hasDisp && <th>Dispatch</th>}<th>Rent</th><th>{t('Jami')}</th></tr></thead>
                <tbody>
                  {sorted.map((p) => (
                    <tr key={p.i}>
                      <td className="l">{truckName(p.truck)}</td>{TYPE_KEYS.map((k) => <td key={k}>{z(p.by[k])}</td>)}
                      {hasDrv && <td>{z(p.drv)}</td>}{hasDisp && <td>{z(p.disp)}</td>}<td>{z(p.rent)}</td><td><b>{usd(p.exp)}</b></td>
                    </tr>
                  ))}
                </tbody>
                {!single && (
                  <tfoot><tr><td className="l">{t('JAMI')}</td>{TYPE_KEYS.map((k) => <td key={k}>{z(T.by[k])}</td>)}{hasDrv && <td>{z(T.drv)}</td>}{hasDisp && <td>{z(T.disp)}</td>}<td>{z(T.rent)}</td><td>{usd(T.exp)}</td></tr></tfoot>
                )}
              </table>
            </div>
          </div>
        </details>
        <p className="note">
          {t("Yuklar pickup sanasi bo'yicha, rasxodlar o'z sanasi bo'yicha davrga kiradi.")}{' '}
          {t(mode === 'week' ? "Rent to'lov kuni tushgan haftada to'liq olinadi, kun yozilmagan bo'lsa oylik rentning 12/52 qismi." : "Rent oylik hisobotda to'liq bir marta olinadi.")}
        </p>
        {(hasDrv || hasDisp) && <p className="note">{t("Driver maoshi va dispatch Sozlama → Truck'lar bo'limidagi stavkalar bo'yicha avtomatik hisoblanadi.")}</p>}
      </div>
    </section>
  );
}
