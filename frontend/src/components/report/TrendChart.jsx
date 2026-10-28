import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n/index.jsx';
import { periodOf, shiftAnchor, todayNY } from '../../lib/dates.js';
import { compute, totals } from '../../lib/engine.js';
import { cmpUsd, niceUp, usd, usd0 } from '../../lib/format.js';

/** Net result for the last n weeks/months ending at `end`, optionally for one truck index. */
export function trendData({ trucks, loads, expenses, mode, end, single, n, i18n }) {
  const { fmtDM, MON, MONF } = i18n;
  const year = +todayNY().slice(0, 4);
  const pts = [];
  for (let k = n - 1; k >= 0; k--) {
    const per = periodOf(mode, shiftAnchor(mode, end, -k));
    const rows = compute(trucks, loads, expenses, mode, per.start, per.end);
    const T = totals(single == null ? rows : [rows[single]]);
    const a = per.start, b = per.end, am = +a.slice(5, 7), bm = +b.slice(5, 7), ay = +a.slice(0, 4);
    pts.push({
      lab: mode === 'week' ? fmtDM(a) : MON[am - 1],
      full: mode === 'week' ? `${fmtDM(a)} – ${fmtDM(b)} ${b.slice(0, 4)}` : `${MONF[am - 1]} ${ay}`,
      short: mode === 'week'
        ? (am === bm ? `${+a.slice(8, 10)}–${+b.slice(8, 10)} ${MON[bm - 1]}` : `${fmtDM(a)} – ${fmtDM(b)}`)
        : MONF[am - 1] + (ay !== year ? ' ' + ay : ''),
      g: T.gross, x: T.exp, n: T.net, c: T.count,
    });
  }
  return pts;
}

function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(600);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

export default function TrendChart({ pts }) {
  const { t } = useI18n();
  const [ref, W] = useWidth();
  const [hover, setHover] = useState(null);

  const H = 200, pt = 24, pb = 26, pl = 48, pr = 8, ph = H - pt - pb, pw = W - pl - pr, n = pts.length;
  let mx = 0, mn = 0;
  pts.forEach((p) => { mx = Math.max(mx, p.n); mn = Math.min(mn, p.n); });
  let top = niceUp(mx), bot = -niceUp(-mn);
  if (!top && !bot) top = 1000;
  const y = (v) => pt + ((top - v) / (top - bot)) * ph;
  const y0 = y(0), slot = pw / n, bw = Math.max(6, Math.min(24, slot * 0.6));
  const step = slot < 30 ? 3 : slot < 46 ? 2 : 1;

  const bar = (p, i) => {
    const cx = pl + slot * (i + 0.5), x0 = cx - bw / 2, x1 = cx + bw / 2, v = p.n;
    const dim = hover !== null && hover !== i ? ' dim' : '';
    if (Math.abs(v) < 0.005) return <rect key={'b' + i} className={'tc-bar z' + dim} x={x0} y={y0 - 1} width={bw} height="2" rx="1" />;
    const y1 = y(v), r = Math.min(4, bw / 2, Math.abs(y1 - y0));
    const d = v > 0
      ? `M${x0} ${y0}V${y1 + r}Q${x0} ${y1} ${x0 + r} ${y1}H${x1 - r}Q${x1} ${y1} ${x1} ${y1 + r}V${y0}Z`
      : `M${x0} ${y0}V${y1 - r}Q${x0} ${y1} ${x0 + r} ${y1}H${x1 - r}Q${x1} ${y1} ${x1} ${y1 - r}V${y0}Z`;
    return <path key={'b' + i} className={'tc-bar ' + (v > 0 ? 'p' : 'l') + dim} d={d} />;
  };

  const last = pts[n - 1];
  const lastCx = pl + slot * (n - 0.5);
  const hp = hover !== null ? pts[hover] : null;
  const ttLeft = hp ? Math.max(0, Math.min(W - 190, pl + slot * (hover + 0.5) - 95)) : 0;
  const rows = pts.map((p, i) => ({ p, i })).reverse().filter(({ p }) => Math.abs(p.g) >= 0.005 || Math.abs(p.x) >= 0.005);
  const hidden = n - rows.length;

  return (
    <>
      <div className="trend" ref={ref}>
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="group" aria-label={t('Sof foyda grafigi')}>
          {[top, bot].filter(Boolean).map((v) => (
            <g key={'g' + v}>
              <line className="tc-grid" x1={pl} x2={W - pr} y1={y(v)} y2={y(v)} />
              <text className="tc-ax" x={pl - 8} y={y(v)} dy="4" textAnchor="end">{cmpUsd(v)}</text>
            </g>
          ))}
          <line className="tc-zero" x1={pl} x2={W - pr} y1={y0} y2={y0} />
          <text className="tc-ax" x={pl - 8} y={y0} dy="4" textAnchor="end">$0</text>
          {pts.map(bar)}
          {pts.map((p, i) => ((n - 1 - i) % step === 0 ? (
            <text key={'x' + i} className={'tc-ax' + (i === n - 1 ? ' cur' : '')} x={pl + slot * (i + 0.5)} y={H - 8} textAnchor="middle">{p.lab}</text>
          ) : null))}
          {last && Math.abs(last.n) >= 0.005 && (
            <text className="tc-val" x={Math.min(lastCx, W - pr - 4)} y={last.n > 0 ? y(last.n) - 6 : y(last.n) + 14}
              textAnchor={lastCx + 30 > W ? 'end' : 'middle'}>{(last.n > 0 ? '+' : '') + cmpUsd(last.n)}</text>
          )}
          {pts.map((p, i) => (
            <rect key={'h' + i} className="tc-hit" tabIndex={0} role="img" x={pl + slot * i} y={pt} width={slot} height={ph}
              aria-label={`${p.full}: ${t('sof')} ${usd(p.n)}, ${t('daromad')} ${usd(p.g)}, ${t('rasxod')} ${usd(p.x)}`}
              onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(i)} onBlur={() => setHover(null)} />
          ))}
        </svg>
        {hp && (
          <div className="tt" style={{ left: ttLeft }}>
            <span className="tth">{hp.full}</span>
            <div className="ttr big"><span><i style={{ background: hp.n < 0 ? 'var(--bar-l)' : 'var(--bar-p)' }} />{t('Sof foyda')}</span><b>{usd(hp.n)}</b></div>
            <div className="ttr"><span>{t('Daromad')}</span><b>{usd(hp.g)}</b></div>
            <div className="ttr"><span>{t('Rasxod')}</span><b>{usd(hp.x)}</b></div>
            <div className="ttr"><span>{t('Yuklar')}</span><b>{hp.c}</b></div>
          </div>
        )}
      </div>
      <details className="more tview">
        <summary>{t("Jadval ko'rinishi")}</summary>
        <div className="moreb">
          <table className="ttab">
            <thead><tr><th className="l">{t('Davr')}</th><th>{t('Daromad')}</th><th>{t('Rasxod')}</th><th>{t('Sof foyda')}</th></tr></thead>
            <tbody>
              {rows.map(({ p, i }) => (
                <tr key={i}>
                  <td className="l">{p.short}{p.c > 0 && <small>{t('{n} ta yuk', { n: p.c })}</small>}</td>
                  <td data-k={t('Daromad')}>{usd0(p.g)}</td>
                  <td data-k={t('Rasxod')}>{usd0(p.x)}</td>
                  <td className={p.n > 0.005 ? 'pos' : p.n < -0.005 ? 'neg' : ''}><b>{(p.n > 0.005 ? '+' : '') + usd0(p.n)}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
          {hidden > 0 && <p className="quiet">{t("Yozuvsiz davrlar ko'rsatilmadi: {n} ta", { n: hidden })}</p>}
        </div>
      </details>
    </>
  );
}
