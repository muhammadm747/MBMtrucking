// Which load dialog is open (form or detail sheet). Lets any page open them.
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const LoadUiContext = createContext(null);

export function LoadUiProvider({ children }) {
  // form: null | {mode: 'new'} | {mode: 'edit', id} | {mode: 'dup', id}
  const [form, setForm] = useState(null);
  const [sheetId, setSheetId] = useState(null);

  const openNew = useCallback(() => { setSheetId(null); setForm({ mode: 'new', key: Date.now() }); }, []);
  const openEdit = useCallback((id) => { setSheetId(null); setForm({ mode: 'edit', id, key: Date.now() }); }, []);
  const openDup = useCallback((id) => { setSheetId(null); setForm({ mode: 'dup', id, key: Date.now() }); }, []);
  const closeForm = useCallback(() => setForm(null), []);
  const openSheet = useCallback((id) => setSheetId(id), []);
  const closeSheet = useCallback(() => setSheetId(null), []);

  const value = useMemo(
    () => ({ form, sheetId, openNew, openEdit, openDup, closeForm, openSheet, closeSheet }),
    [form, sheetId, openNew, openEdit, openDup, closeForm, openSheet, closeSheet],
  );
  return <LoadUiContext.Provider value={value}>{children}</LoadUiContext.Provider>;
}

export function useLoadUi() {
  return useContext(LoadUiContext);
}
