// Per-device display preferences: light/dark mode and colour look. Never business data.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { storage } from '../lib/storage.js';

export const LOOKS = [
  ['qahrabo', 'Qahrabo', "To'q ko'k va qahrabo, aniq va yorqin"],
  ['elegant', 'Elegant', "Qora-ko'k va oltin, nafis"],
  ['osmon', 'Osmon', 'Moviy, yengil va toza'],
  ['zumrad', 'Zumrad', 'Yashil, tinch va ravshan'],
  ['qum', 'Qum', 'Iliq qum rang, yumshoq'],
];

const PrefsContext = createContext(null);

function systemDark() {
  try { return window.matchMedia('(prefers-color-scheme: dark)').matches; } catch { return false; }
}

export function PrefsProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    const v = storage.get('mbm.theme');
    return v === 'light' || v === 'dark' ? v : 'auto';
  });
  const [look, setLookState] = useState(() => {
    const v = storage.get('mbm.look');
    return LOOKS.some((l) => l[0] === v) ? v : 'qahrabo';
  });
  const [sysDark, setSysDark] = useState(systemDark);

  useEffect(() => {
    let mq;
    try { mq = window.matchMedia('(prefers-color-scheme: dark)'); } catch { return undefined; }
    const on = () => setSysDark(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => { document.documentElement.setAttribute('data-look', look); }, [look]);

  const setTheme = useCallback((m) => { storage.set('mbm.theme', m); setThemeState(m); }, []);
  const setLook = useCallback((l) => { storage.set('mbm.look', l); setLookState(l); }, []);
  const isDark = theme === 'dark' || (theme === 'auto' && sysDark);

  const value = useMemo(() => ({ theme, setTheme, look, setLook, isDark }), [theme, setTheme, look, setLook, isDark]);
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs() {
  return useContext(PrefsContext);
}
