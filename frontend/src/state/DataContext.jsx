/*
 * Server data for the signed-in user: trucks, loads, expenses.
 * Loaded once, refreshed when the tab becomes visible again (another device may have
 * changed something), and updated in place from each write's response.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, endpoints } from '../api/client.js';

const DataContext = createContext(null);

const upsert = (list, item) => {
  const i = list.findIndex((x) => x.id === item.id);
  if (i < 0) return [item, ...list];
  const next = list.slice();
  next[i] = item;
  return next;
};

/** Uzbek source message for a failed write. */
export function errorText(e) {
  if (e instanceof ApiError) {
    if (e.status === 0) return "Saqlab bo'lmadi. Aloqani tekshirib, qayta urinib ko'ring.";
    if (e.status === 400) return "Saqlab bo'lmadi: sizda yozish huquqi yo'q yoki ma'lumot noto'g'ri.";
    if (e.status === 429) return "So'rovlar juda tez. Biroz kutib, qayta urinib ko'ring.";
    if (e.status === 401 || e.status === 403) return 'Sessiya tugadi. Qaytadan kiring.';
  }
  return "Saqlab bo'lmadi. Aloqani tekshirib, qayta urinib ko'ring.";
}

export function DataProvider({ children }) {
  const [status, setStatus] = useState('loading');
  const [trucks, setTrucks] = useState([]);
  const [loads, setLoads] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const [t, l, e] = await Promise.all([endpoints.trucks(), endpoints.loads(), endpoints.expenses()]);
      setTrucks(t);
      setLoads(l);
      setExpenses(e);
      setStatus('ready');
    } catch {
      setStatus((s) => (s === 'ready' ? s : 'error'));
    }
  }, []);

  useEffect(() => {
    refresh();
    const onVis = () => { if (!document.hidden && !busyRef.current) refresh(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [refresh]);

  /** Run one write at a time; returns the result or throws. */
  const run = useCallback(async (fn) => {
    if (busyRef.current) throw new Error('busy');
    busyRef.current = true;
    setBusy(true);
    try { return await fn(); } finally { busyRef.current = false; setBusy(false); }
  }, []);

  const actions = useMemo(() => ({
    saveLoad: (id, data) => run(async () => {
      const row = id ? await endpoints.updateLoad(id, data) : await endpoints.createLoad(data);
      setLoads((xs) => upsert(xs, row));
      return row;
    }),
    deleteLoad: (id) => run(async () => {
      await endpoints.deleteLoad(id);
      setLoads((xs) => xs.filter((x) => x.id !== id));
    }),
    saveExpense: (id, data) => run(async () => {
      const row = id ? await endpoints.updateExpense(id, data) : await endpoints.createExpense(data);
      setExpenses((xs) => upsert(xs, row));
      return row;
    }),
    deleteExpense: (id) => run(async () => {
      await endpoints.deleteExpense(id);
      setExpenses((xs) => xs.filter((x) => x.id !== id));
    }),
    saveTruck: (id, data) => run(async () => {
      const row = id ? await endpoints.updateTruck(id, data) : await endpoints.createTruck(data);
      setTrucks((xs) => upsert(xs, row).sort((a, b) => a.slot - b.slot));
      return row;
    }),
    /** Apply the same dispatch % to every truck. */
    setDispatchAll: (pct) => run(async () => {
      const rows = [];
      for (const tk of trucks) rows.push(await endpoints.updateTruck(tk.id, { dispatch_percent: pct }));
      setTrucks(rows);
    }),
    importBackup: (file) => run(async () => {
      const r = await endpoints.importBackup(file);
      await refresh();
      return r;
    }),
  }), [run, refresh, trucks]);

  const truckById = useMemo(() => new Map(trucks.map((tk) => [tk.id, tk])), [trucks]);

  const value = useMemo(() => ({
    status, trucks, loads, expenses, busy, truckById, refresh, ...actions,
  }), [status, trucks, loads, expenses, busy, truckById, refresh, actions]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  return useContext(DataContext);
}

/** "1364" -> "Truck 1364"; named trucks stay as typed. */
export const truckName = (tk) => (tk ? tk.display_name : '—');
/** Chip label: name without a leading "Truck ". */
export const truckShort = (tk) => (tk ? String(tk.name).replace(/^truck\s+/i, '') : '—');
