import { useState } from 'react';
import { useI18n } from '../../i18n/index.jsx';
import { useLoadActions } from './useLoadActions.js';

/** Inline "enter the rate" field for a load that has no pay yet. */
export default function QuickPay({ load }) {
  const { t } = useI18n();
  const { quickPay } = useLoadActions();
  const [value, setValue] = useState('');
  const label = t('Yuk puli ($)');
  const save = async () => { if (await quickPay(load, value)) setValue(''); };
  return (
    <span className="qpay" onClick={(e) => e.stopPropagation()}>
      <input type="text" inputMode="decimal" autoComplete="off" placeholder={label} aria-label={label} value={value}
        onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } }} />
      <button className="btn primary sm" type="button" onClick={save}>{t('Saqlash')}</button>
    </span>
  );
}
