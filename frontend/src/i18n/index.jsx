/*
 * Uzbek is the source language (strings are written in Uzbek in the code);
 * English comes from en.json. Plural forms: "one|many", picked by params.n.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import EN_BASE from './en.json';
import { storage } from '../lib/storage.js';

const EN = {
  ...EN_BASE,
  'Kirish': 'Sign in',
  'Login': 'Username',
  'Parol': 'Password',
  'Login yoki parol noto\'g\'ri': 'Wrong username or password',
  'Juda ko\'p urinish. Bir daqiqadan keyin qayta urinib ko\'ring.': 'Too many attempts. Try again in a minute.',
  'Serverga ulanib bo\'lmadi. Internetni tekshiring.': 'Could not reach the server. Check your connection.',
  'Hisobga kiring': 'Sign in to your account',
  'Chiqish': 'Sign out',
  'Hisob': 'Account',
  'Kirgan: {x}': 'Signed in as {x}',
  'Serverga saqlanadi': 'Saved to server',
  'Ma\'lumot serverdagi bazada saqlanadi va har qanday qurilmadan bir xil ko\'rinadi.': 'Data is stored in the server database and looks the same on every device.',
  'Serverda hozir: {l} ta yuk, {e} ta rasxod.': 'On the server now: {l} loads, {e} expenses.',
  'Sessiya tugadi. Qaytadan kiring.': 'Your session has ended. Please sign in again.',
  'Ma\'lumotni yuklab bo\'lmadi': 'Could not load data',
  'Qayta urinish': 'Try again',
  'Yangi truck qo\'shish': 'Add truck',
  'Truck qo\'shildi': 'Truck added',
  'Hali truck yo\'q. Avval truck qo\'shing.': 'No trucks yet. Add a truck first.',
  'Sahifa topilmadi': 'Page not found',
  '{t} ta truck yaratildi': '{t} trucks created',
};

const DATA = {
  uz: {
    MON: ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'],
    MONF: ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'],
    DOWF: ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'],
    TL: { fuel: "Yoqilg'i", driver: 'Driver maoshi', repair: "Ta'mirlash", insurance: 'Insurance', lease: "Truck to'lovi (lease)", toll: 'Toll', parking: 'Parking', other: 'Boshqa' },
    TS: { fuel: "Yoqilg'i", driver: 'Driver', repair: "Ta'mirlash", insurance: 'Insurance', lease: 'Lease', toll: 'Toll', parking: 'Parking', other: 'Boshqa' },
  },
  en: {
    MON: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    MONF: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    DOWF: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    TL: { fuel: 'Fuel', driver: 'Driver pay', repair: 'Repairs', insurance: 'Insurance', lease: 'Truck payment (lease)', toll: 'Toll', parking: 'Parking', other: 'Other' },
    TS: { fuel: 'Fuel', driver: 'Driver', repair: 'Repairs', insurance: 'Insurance', lease: 'Lease', toll: 'Toll', parking: 'Parking', other: 'Other' },
  },
};

export function translate(lang, s, p) {
  let r = lang === 'en' && EN[s] !== undefined ? EN[s] : s;
  if (p && r.indexOf('|') >= 0 && p.n !== undefined) {
    const f = r.split('|');
    r = Number(p.n) === 1 ? f[0] : f[1];
  }
  if (p) r = r.replace(/\{(\w+)\}/g, (m, k) => (p[k] !== undefined ? p[k] : m));
  return r;
}

function makeLocale(lang) {
  const D = DATA[lang];
  const t = (s, p) => translate(lang, s, p);
  const fmtDM = (iso) => +iso.slice(8, 10) + ' ' + D.MON[+iso.slice(5, 7) - 1];
  const fmtDMY = (iso) => fmtDM(iso) + ' ' + iso.slice(0, 4);
  const monl = (i) => (lang === 'en' ? D.MONF[i] : D.MONF[i].toLowerCase());
  return { lang, t, fmtDM, fmtDMY, monl, MON: D.MON, MONF: D.MONF, DOWF: D.DOWF, typeLabel: D.TL, typeShort: D.TS };
}

const LANG_KEY = 'mbm.lang';
const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => (storage.get(LANG_KEY) === 'en' ? 'en' : 'uz'));
  const setLang = useCallback((l) => {
    const next = l === 'en' ? 'en' : 'uz';
    storage.set(LANG_KEY, next);
    setLangState(next);
  }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const value = useMemo(() => ({ ...makeLocale(lang), setLang }), [lang, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
