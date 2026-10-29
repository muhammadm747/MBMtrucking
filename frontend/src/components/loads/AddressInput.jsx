import { useEffect, useId, useRef, useState } from 'react';
import { useI18n } from '../../i18n/index.jsx';
import { suggest } from '../../lib/miles.js';

/**
 * Address field with a Google-Maps-like suggestion list.
 * onChange(text) on every keystroke; onPick({label, lat, lon}) when a suggestion is chosen.
 */
export default function AddressInput({ id, label, value, onChange, onPick, onBlur }) {
  const { t } = useI18n();
  const listId = useId();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const typed = useRef(false);
  const ctrl = useRef(null);

  useEffect(() => {
    const q = value.trim();
    if (!typed.current || q.length < 3) { setItems([]); setLoading(false); return undefined; }
    const timer = setTimeout(async () => {
      if (ctrl.current) ctrl.current.abort();
      ctrl.current = new AbortController();
      setLoading(true);
      try {
        const res = await suggest(q, ctrl.current.signal);
        setItems(res);
        setActive(-1);
        setOpen(true);
        setLoading(false);
      } catch (e) {
        if (e.name !== 'AbortError') { setItems([]); setLoading(false); }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [value]);

  useEffect(() => () => ctrl.current && ctrl.current.abort(), []);

  const pick = (it) => {
    typed.current = false;
    setOpen(false);
    setItems([]);
    onPick(it);
  };

  const onKeyDown = (e) => {
    if (!open || !items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (i + 1) % items.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (i <= 0 ? items.length - 1 : i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); pick(items[active >= 0 ? active : 0]); }
    else if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
  };

  const showList = open && value.trim().length >= 3 && (items.length > 0 || !loading);

  return (
    <div className="fld addr">
      <label htmlFor={id}>{label}</label>
      <span className="addr-box">
        <input id={id} type="text" maxLength={200} autoComplete="off" placeholder={t('masalan Dallas, TX')} value={value}
          role="combobox" aria-expanded={showList} aria-controls={listId} aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          onChange={(e) => { typed.current = true; onChange(e.target.value); }}
          onKeyDown={onKeyDown}
          onFocus={() => items.length && setOpen(true)}
          onBlur={() => { if (onBlur) onBlur(); setTimeout(() => setOpen(false), 150); }} />
        {loading && <i className="addr-spin" aria-hidden="true" />}
        {showList && (
          <ul className="addr-list" id={listId} role="listbox">
            {items.length ? items.map((it, i) => (
              <li key={it.label} id={`${listId}-${i}`} role="option" aria-selected={i === active}
                className={i === active ? 'on' : ''}
                onMouseDown={(e) => { e.preventDefault(); pick(it); }} onMouseEnter={() => setActive(i)}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
                  <path fill="currentColor" fillOpacity=".16" d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0c0 5.4-6.5 11-6.5 11z" />
                  <circle cx="12" cy="10" r="2.3" />
                </svg>
                <span><b>{it.label}</b>{it.sub && <small>{it.sub}</small>}</span>
              </li>
            )) : <li className="addr-empty">{t('Manzil topilmadi')}</li>}
          </ul>
        )}
      </span>
    </div>
  );
}
