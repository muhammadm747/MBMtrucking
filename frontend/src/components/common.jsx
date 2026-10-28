import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/index.jsx';
import { truckShort } from '../state/DataContext.jsx';
import { EmptyTruck, IconCheck, IconDelete } from './Icons.jsx';

/** Chip group for picking a truck (or "all"). value is a truck id, or 'all'. */
export function TruckPicker({ id, label, trucks, value, onChange, withAll = false, small = false }) {
  const { t } = useI18n();
  const options = [
    ...(withAll ? [{ v: 'all', label: t(small ? 'Hamma' : 'Hamma truck') }] : []),
    ...trucks.map((tk) => ({ v: String(tk.id), label: truckShort(tk) })),
  ];
  const cls = 'pick' + (small ? ' sm' : '') + (withAll ? ' hasall' : '');
  return (
    <div className="fld">
      <span id={id + 'L'}>{label}</span>
      <div className={cls} role="group" aria-labelledby={id + 'L'}>
        {options.map((o) => {
          const on = String(value) === o.v;
          return (
            <button key={o.v} type="button" className={'chipb' + (on ? ' on' : '')} aria-pressed={on}
              data-v={o.v} title={o.label} onClick={() => onChange(o.v === 'all' ? 'all' : Number(o.v))}>
              <span>{o.label}</span>
              {on && <IconCheck />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function EmptyBox({ children }) {
  return (
    <div className="empty">
      <EmptyTruck />
      {typeof children === 'string' ? <p>{children}</p> : children}
    </div>
  );
}

export function Skeleton({ n = 2 }) {
  const { t } = useI18n();
  return (
    <div className="skel" aria-label={t('Yuklanmoqda')} role="status">
      {Array.from({ length: n }, (_, i) => <i key={i} />)}
    </div>
  );
}

export function Kpi({ label, value, cls, delta }) {
  const { t } = useI18n();
  return (
    <div className="kpi">
      <span className="k">{t(label)}</span>
      <b className={'num' + (cls ? ' ' + cls : '')}>{value}</b>
      {delta}
    </div>
  );
}

/** Week-over-week change badge; dir = +1 when up is good, -1 when up is bad. */
export function Delta({ cur, prev, dir }) {
  const { t } = useI18n();
  if (!(prev > 0.005) || !Number.isFinite(cur)) return null;
  const pc = Math.round(((cur - prev) / prev) * 100);
  if (pc === 0) return <small className="dl">0%</small>;
  const good = pc * dir > 0;
  return (
    <small className={'dl ' + (good ? 'good' : 'bad')} title={t("O'tgan haftaga nisbatan")}>
      {(pc > 0 ? '▲ ' : '▼ ') + Math.abs(pc) + '%'}
    </small>
  );
}

/**
 * Two-step delete: first press arms the button for 3 s, second press confirms.
 * `variant="btn"` renders a full-width text button (detail sheet), default an icon button.
 */
export function DeleteButton({ onConfirm, variant = 'icon' }) {
  const { t } = useI18n();
  const [armed, setArmed] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  const click = (e) => {
    e.stopPropagation();
    if (!armed) {
      setArmed(true);
      timer.current = setTimeout(() => setArmed(false), 3000);
      return;
    }
    clearTimeout(timer.current);
    setArmed(false);
    onConfirm();
  };
  if (variant === 'btn') {
    return (
      <button className={'btn' + (armed ? ' armed' : '')} type="button" onClick={click}>
        {t(armed ? "Ha, o'chir" : "O'chirish")}
      </button>
    );
  }
  return (
    <button className={'ib' + (armed ? ' armed' : '')} type="button" onClick={click}
      aria-label={t(armed ? "O'chirishni tasdiqlash" : "O'chirish")}>
      {armed ? t("Ha, o'chir") : <IconDelete />}
    </button>
  );
}

/** Lock page scroll and close on Escape while a dialog is open. */
export function useDialog(open, onClose) {
  useEffect(() => {
    if (!open) return undefined;
    document.body.classList.add('noscroll');
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('noscroll');
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);
}
