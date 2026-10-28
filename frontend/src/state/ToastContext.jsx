import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/index.jsx';

const ToastContext = createContext(null);

/** toast(message, isError?, action?) — message is an Uzbek source string (translated here) or already-translated text. */
export function ToastProvider({ children }) {
  const { t } = useI18n();
  const [toast, setToast] = useState(null);
  const timer = useRef(0);

  const show = useCallback((msg, err = false, action = null) => {
    clearTimeout(timer.current);
    setToast({ msg, err, action, key: Date.now() });
    timer.current = setTimeout(() => setToast(null), action ? 8000 : err ? 4200 : 2600);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={'toast' + (toast && toast.err ? ' err' : '')} role="status" aria-live="polite" hidden={!toast}>
        {toast && (
          <>
            <span className="ti" aria-hidden="true">{toast.err ? '!' : '✓'}</span>
            <span>{t(toast.msg)}</span>
            {toast.action && (
              <button type="button" onClick={() => { setToast(null); toast.action.fn(); }}>{t(toast.action.label)}</button>
            )}
          </>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
