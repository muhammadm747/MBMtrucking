import { useI18n } from '../../i18n/index.jsx';
import { fmtMiles, usd } from '../../lib/format.js';
import { truckName, truckShort } from '../../state/DataContext.jsx';

/** Net per truck as bars diverging from zero (green right = profit, red left = loss). */
export default function TruckBars({ rows, onPick, quietLabel }) {
  const { t } = useI18n();
  const nets = rows.filter((p) => p.count > 0 || Math.abs(p.net) >= 0.005).sort((a, b) => b.net - a.net || a.i - b.i);
  const quiet = rows.filter((p) => p.count === 0 && Math.abs(p.net) < 0.005).map((p) => truckShort(p.truck));
  const mx = nets.reduce((m, p) => Math.max(m, Math.abs(p.net)), 0);

  return (
    <div className="bars">
      {nets.map((p) => {
        const pos = p.net > 0.005, neg = p.net < -0.005, w = mx > 0 ? ((Math.abs(p.net) / mx) * 50).toFixed(1) : 0;
        const inner = (
          <>
            <span className="bn">{truckName(p.truck)}{onPick && <small>{t('{n} ta yuk', { n: p.count })}{p.miles ? ' · ' + fmtMiles(p.miles) + ' mi' : ''}</small>}</span>
            <span className="bt">{pos ? <i className="p" style={{ width: w + '%' }} /> : neg ? <i className="l" style={{ width: w + '%' }} /> : null}</span>
            <b className={'bv num ' + (pos ? 'pos' : neg ? 'neg' : 'dim')}>{(pos ? '+' : neg ? '−' : '') + usd(Math.abs(p.net))}</b>
          </>
        );
        return onPick
          ? <button key={p.i} type="button" className="br brb" onClick={() => onPick(p.truck.id)}>{inner}</button>
          : <div key={p.i} className="br">{inner}</div>;
      })}
      {quiet.length > 0 && <p className="quiet">{t(quietLabel, { x: quiet.join(', ') })}</p>}
    </div>
  );
}
