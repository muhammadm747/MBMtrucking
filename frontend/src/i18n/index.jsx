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
  'Manzil topilmadi': 'No address found',
  "Hisobingiz yo'qmi?": "Don't have an account?",
  "Ro'yxatdan o'tish": "Sign up",
  "Hisobingiz bormi?": "Already have an account?",
  "Yangi hisob oching": "Create a new account",
  "Hisob ochish": "Create account",
  "ixtiyoriy": "optional",
  "kamida 8 belgi": "at least 8 characters",
  "Parolni takrorlang": "Repeat password",
  "Parollar bir xil emas.": "Passwords do not match.",
  "Yangi hisob bo'sh boshlanadi: trucklaringizni o'zingiz qo'shasiz. Ma'lumotlaringizni faqat siz ko'rasiz.": "A new account starts empty: you add your own trucks. Only you can see your data.",
  "Bu login band. Boshqasini tanlang.": "This username is taken. Choose another one.",
  "Login faqat harf, raqam va @ . + - _ belgilaridan iborat bo'lsin.": "Use only letters, digits and @ . + - _ in the username.",
  "Parol kamida 8 belgidan iborat bo'lsin.": "The password must be at least 8 characters.",
  "Bu parol juda oddiy.": "This password is too common.",
  "Parol faqat raqamlardan iborat bo'lmasin.": "The password cannot be only digits.",
  "Parol loginga juda o'xshash.": "The password is too similar to the username.",
  "Email noto'g'ri.": "The email address is not valid.",
  "Juda ko'p urinish. Keyinroq qayta urinib ko'ring.": "Too many attempts. Try again later.",
  "Ro'yxatdan o'tish hozir yopiq.": "Sign-up is closed right now.",
  "Ma'lumotlarni tekshiring.": "Please check the details.",
  "Akkaunt": "Account",
  "Saqlandi": "Saved",
  "Akkaunt sozlamalari": "Account settings",
  "Boshqa akkauntga kirish": "Sign in to another account",
  "Email kiritilmagan": "No email added",
  "Profil": "Profile",
  "Saqlash": "Save",
  "Hozirgi parol": "Current password",
  "Yangi parol": "New password",
  "Parolni o'zgartirish": "Change password",
  "Parol o'zgartirildi": "Password changed",
  "Email kiriting: parolni unutsangiz, tiklash kodi shu manzilga yuboriladi.": "Add an email: if you forget your password, the reset code is sent there.",
  "Boshqa akkauntga kirish uchun shu akkauntdan chiqasiz va boshqa login hamda parolni kiritasiz. Ma'lumotlaringiz serverda saqlanib qoladi.": "To use another account, sign out of this one and enter the other username and password. Your data stays saved on the server.",
  "Parolni unutdingizmi?": "Forgot your password?",
  "Parolni tiklash": "Reset password",
  "Login yoki emailingizni kiriting. Akkauntga biriktirilgan emailga tasdiqlash kodi yuboramiz.": "Enter your username or email. We will send a code to the email on the account.",
  "Login yoki email": "Username or email",
  "Kod yuborish": "Send code",
  "Kirish sahifasiga qaytish": "Back to sign in",
  "Agar bu akkauntga email biriktirilgan bo'lsa, 6 xonali kod yuborildi. Pochtangizni (Spam papkasini ham) tekshiring.": "If this account has an email, a 6-digit code has been sent. Check your inbox (and the Spam folder).",
  "Emaildagi kod": "Code from the email",
  "Parolni saqlash va kirish": "Save password and sign in",
  "Kod kelmadimi?": "No code?",
  "Qayta yuborish": "Send again",
  "parolni tiklash uchun kerak": "needed to reset the password",
  "Hozirgi parol noto'g'ri.": "The current password is wrong.",
  "Kod noto'g'ri yoki muddati o'tgan.": "The code is wrong or has expired.",
  "Email yuborib bo'lmadi. Birozdan keyin qayta urinib ko'ring.": "Could not send the email. Try again in a little while.",
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
