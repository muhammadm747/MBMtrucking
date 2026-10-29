import { useState } from 'react';
import { BrandMark } from '../components/Icons.jsx';
import { useI18n } from '../i18n/index.jsx';
import { useAuth } from '../state/AuthContext.jsx';

const NETWORK = "Serverga ulanib bo'lmadi. Internetni tekshiring.";

// Server error codes from /api/auth/register/ -> messages (Uzbek source strings, translated by t()).
const FIELD_ERRORS = {
  username_taken: 'Bu login band. Boshqasini tanlang.',
  username_invalid: "Login faqat harf, raqam va @ . + - _ belgilaridan iborat bo'lsin.",
  password_too_short: "Parol kamida 8 belgidan iborat bo'lsin.",
  password_too_common: 'Bu parol juda oddiy.',
  password_entirely_numeric: "Parol faqat raqamlardan iborat bo'lmasin.",
  password_too_similar: 'Parol loginga juda o\'xshash.',
  invalid: "Email noto'g'ri.",
};

function firstError(data) {
  if (!data || typeof data !== 'object') return '';
  for (const key of ['username', 'email', 'password']) {
    const list = data[key];
    if (Array.isArray(list) && list.length) return FIELD_ERRORS[list[0]] || (key === 'email' ? FIELD_ERRORS.invalid : list[0]);
  }
  return '';
}

function LoginForm({ onSwitch }) {
  const { t } = useI18n();
  const { login, signup } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err.status === 429 ? "Juda ko'p urinish. Bir daqiqadan keyin qayta urinib ko'ring."
        : err.status === 0 || err.status >= 500 ? NETWORK : "Login yoki parol noto'g'ri");
      setBusy(false);
    }
  }

  return (
    <form className="card login-card" onSubmit={submit} noValidate>
      <h2>{t('Kirish')}</h2>
      <label className="fld"><span>{t('Login')}</span>
        <input type="text" name="username" autoComplete="username" autoCapitalize="none" required value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
      </label>
      <label className="fld"><span>{t('Parol')}</span>
        <input type="password" name="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      {error && <p className="calcmsg bad" role="alert">{t(error)}</p>}
      <button className="btn primary" type="submit" disabled={busy || !username.trim() || !password}>{t('Kirish')}</button>
      {signup && (
        <p className="login-switch">{t("Hisobingiz yo'qmi?")} <button type="button" className="linkish" onClick={onSwitch}>{t("Ro'yxatdan o'tish")}</button></p>
      )}
    </form>
  );
}

function RegisterForm({ onSwitch }) {
  const { t } = useI18n();
  const { register } = useAuth();
  const [f, setF] = useState({ username: '', email: '', password: '', password2: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const mismatch = f.password2 !== '' && f.password !== f.password2;

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    if (f.password !== f.password2) { setError('Parollar bir xil emas.'); return; }
    setBusy(true);
    setError('');
    try {
      await register({ username: f.username.trim(), email: f.email.trim(), password: f.password });
    } catch (err) {
      setError(err.status === 429 ? "Juda ko'p urinish. Keyinroq qayta urinib ko'ring."
        : err.status === 403 ? "Ro'yxatdan o'tish hozir yopiq."
        : err.status === 0 || err.status >= 500 ? NETWORK
        : firstError(err.data) || "Ma'lumotlarni tekshiring.");
      setBusy(false);
    }
  }

  return (
    <form className="card login-card" onSubmit={submit} noValidate>
      <h2>{t("Ro'yxatdan o'tish")}</h2>
      <p className="login-note">{t("Yangi hisob bo'sh boshlanadi: trucklaringizni o'zingiz qo'shasiz. Ma'lumotlaringizni faqat siz ko'rasiz.")}</p>
      <label className="fld"><span>{t('Login')}</span>
        <input type="text" name="username" autoComplete="username" autoCapitalize="none" required minLength={3} maxLength={150} value={f.username} onChange={set('username')} autoFocus />
      </label>
      <label className="fld"><span>Email <small>({t('ixtiyoriy')})</small></span>
        <input type="email" name="email" autoComplete="email" value={f.email} onChange={set('email')} />
      </label>
      <label className="fld"><span>{t('Parol')} <small>({t('kamida 8 belgi')})</small></span>
        <input type="password" name="new-password" autoComplete="new-password" required minLength={8} value={f.password} onChange={set('password')} />
      </label>
      <label className="fld"><span>{t('Parolni takrorlang')}</span>
        <input type="password" name="new-password2" autoComplete="new-password" required value={f.password2} onChange={set('password2')} aria-invalid={mismatch} />
      </label>
      {(error || mismatch) && <p className="calcmsg bad" role="alert">{t(error || 'Parollar bir xil emas.')}</p>}
      <button className="btn primary" type="submit" disabled={busy || f.username.trim().length < 3 || f.password.length < 8 || mismatch || !f.password2}>
        {t("Hisob ochish")}
      </button>
      <p className="login-switch">{t('Hisobingiz bormi?')} <button type="button" className="linkish" onClick={onSwitch}>{t('Kirish')}</button></p>
    </form>
  );
}

export default function LoginPage() {
  const { t, lang, setLang } = useI18n();
  const { signup } = useAuth();
  const [mode, setMode] = useState('login');
  const registering = signup && mode === 'register';

  return (
    <div className="login">
      <div className="band">
        <div className="wrap">
          <header className="hdr">
            <span className="mark" aria-hidden="true"><BrandMark /></span>
            <div className="htxt"><h1>MBM Trucking</h1><p>{t(registering ? 'Yangi hisob oching' : 'Hisobga kiring')}</p></div>
            <div className="hdr-tools">
              <button className="tool" type="button" onClick={() => setLang(lang === 'en' ? 'uz' : 'en')}>{lang === 'en' ? 'UZ' : 'EN'}</button>
            </div>
          </header>
        </div>
      </div>
      <main className="wrap">
        {registering
          ? <RegisterForm onSwitch={() => setMode('login')} />
          : <LoginForm onSwitch={() => setMode('register')} />}
      </main>
    </div>
  );
}
