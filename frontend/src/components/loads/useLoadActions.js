import { useCallback } from 'react';
import { useI18n } from '../../i18n/index.jsx';
import { parseNum, usd } from '../../lib/format.js';
import { errorText, useData } from '../../state/DataContext.jsx';
import { useToast } from '../../state/ToastContext.jsx';

const WRITABLE = [
  'truck', 'miles', 'pay',
  'pickup_date', 'pickup_type', 'pickup_time', 'pickup_from', 'pickup_to', 'pickup_address',
  'delivery_date', 'delivery_type', 'delivery_time', 'delivery_from', 'delivery_to', 'delivery_address',
];
const writable = (rec) => Object.fromEntries(WRITABLE.map((k) => [k, rec[k]]));

export function useLoadActions() {
  const { t } = useI18n();
  const toast = useToast();
  const { saveLoad, deleteLoad, busy } = useData();

  const quickPay = useCallback(async (load, raw) => {
    if (busy) { toast('Oldingi amal tugashini kuting', true); return false; }
    const v = parseNum(String(raw || '').trim());
    if (!(v > 0) || v > 1000000) { toast('Yuk pulini kiriting (0 dan katta son)', true); return false; }
    try {
      await saveLoad(load.id, { pay: v });
      toast(t('Yuk puli saqlandi: {a}', { a: usd(v) }));
      return true;
    } catch (e) {
      toast(errorText(e), true);
      return false;
    }
  }, [busy, saveLoad, toast, t]);

  const remove = useCallback(async (load) => {
    try {
      await deleteLoad(load.id);
      toast("Yuk o'chirildi", false, {
        label: 'Qaytarish',
        fn: async () => {
          try { await saveLoad(null, writable(load)); toast('Yuk qaytarildi'); } catch (e) { toast(errorText(e), true); }
        },
      });
    } catch (e) {
      toast(errorText(e), true);
    }
  }, [deleteLoad, saveLoad, toast]);

  return { quickPay, remove };
}
