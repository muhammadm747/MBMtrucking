import { useState } from 'react';
import { BrandMark } from '../components/Icons.jsx';
import { useI18n } from '../i18n/index.jsx';
import { authError, NETWORK_ERROR } from '../lib/authErrors.js';
import { endpoints } from '../api/client.js';
import { useAuth } from '../state/AuthContext.jsx';

function PasswordPair({ value, onChange, label = 'Parol' }) {
  const { t } = useI18n();
  const mismatch = value.password2 !== '' && value.password !== value.password2;
  return (
    <>
      <label className="fld"><span>{t(label)} <small>({t('kamida 8 belgi')})</small></span>
        <input type="password" name="new-password" autoComplete="new-password" required minLength={8}
          value={value.password} onChange={(e) => onChange({ ...value, password: e.target.value })} />
      </label>
      <label className="fld"><span>{t('Parolni takrorlang')}</span>
        <input type="password" name="new-password2" autoComplete="new-password" required aria-invalid={mismatch}
          value={value.password2} onChange={(e) => onChange({ ...value, password2: e.target.value })} />
      </label>
      {mismatch && <p className="calcmsg bad" role="alert">{t('Parollar bir xil emas.')}</p>}
    </>
  );
}

const pairReady = (p) => p.password.length >= 8 && p.password === p.password2;

function LoginForm({ go }) {
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
        : err.status === 0 || err.status >= 500 ? NETWORK_ERROR : "Login yoki parol noto'g'ri");
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
      {error && (
        <p className="calcmsg bad" role="alert">
          {t(error)}
          {error === "Login yoki parol noto'g'ri" && (
            <> <button type="button" className="linkish" onClick={() => go('forgot', username.trim())}>{t('Parolni tiklash')}</button></>
          )}
        </p>
      )}
      <button className="btn primary" type="submit" disabled={busy || !username.trim() || !password}>{t('Kirish')}</button>
      <p className="login-switch"><button type="button" className="linkish" onClick={() => go('forgot', username.trim())}>{t('Parolni unutdingizmi?')}</button></p>
      {signup && (
        <p className="login-switch">{t("Hisobingiz yo'qmi?")} <button type="button" className="linkish" onClick={() => go('register')}>{t("Ro'yxatdan o'tish")}</button></p>
      )}
    </form>
  );
}

function RegisterForm({ go }) {
  const { t } = useI18n();
  const { register } = useAuth();
  const [f, setF] = useState({ username: '', email: '' });
  const [pw, setPw] = useState({ password: '', password2: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (busy || !pairReady(pw)) return;
    setBusy(true);
    setError('');
    try {
      await register({ username: f.username.trim(), email: f.email.trim(), password: pw.password });
    } catch (err) {
      setError(err.status === 403 ? "Ro'yxatdan o'tish hozir yopiq." : authError(err, ['username', 'email', 'password']));
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
      <label className="fld"><span>Email <small>({t('parolni tiklash uchun kerak')})</small></span>
        <input type="email" name="email" autoComplete="email" value={f.email} onChange={set('email')} />
      </label>
      <PasswordPair value={pw} onChange={setPw} />
      {error && <p className="calcmsg bad" role="alert">{t(error)}</p>}
      <button className="btn primary" type="submit" disabled={busy || f.username.trim().length < 3 || !pairReady(pw)}>
        {t('Hisob ochish')}
      </button>
      <p className="login-switch">{t('Hisobingiz bormi?')} <button type="button" className="linkish" onClick={() => go('login')}>{t('Kirish')}</button></p>
    </form>
  );
}

/** Two steps: send a 6-digit code to the account's email, then enter it with a new password. */
function ForgotForm({ go, initialLogin }) {
  const { t } = useI18n();
  const { resetPassword } = useAuth();
  const [step, setStep] = useState('ask');
  const [loginValue, setLoginValue] = useState(initialLogin || '');
  const [code, setCode] = useState('');
  const [pw, setPw] = useState({ password: '', password2: '' });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  async function send(e) {
    if (e) e.preventDefault();
    if (busy || !loginValue.trim()) return;
    setBusy(true);
    setError('');
    try {
      await endpoints.forgotPassword(loginValue.trim());
      setStep('code');
      setInfo("Agar bu akkauntga email biriktirilgan bo'lsa, 6 xonali kod yuborildi. Pochtangizni (Spam papkasini ham) tekshiring.");
    } catch (err) {
      setError(authError(err));
    }
    setBusy(false);
  }

  async function reset(e) {
    e.preventDefault();
    if (busy || !pairReady(pw)) return;
    setBusy(true);
    setError('');
    try {
      await resetPassword({ login: loginValue.trim(), code: code.trim(), password: pw.password });
    } catch (err) {
      setError(authError(err, ['code', 'password']));
      setBusy(false);
    }
  }

  if (step === 'ask') {
    return (
      <form className="card login-card" onSubmit={send} noValidate>
        <h2>{t('Parolni tiklash')}</h2>
        <p className="login-note">{t('Login yoki emailingizni kiriting. Akkauntga biriktirilgan emailga tasdiqlash kodi yuboramiz.')}</p>
        <label className="fld"><span>{t('Login yoki email')}</span>
          <input type="text" name="username" autoComplete="username" autoCapitalize="none" required value={loginValue} onChange={(e) => setLoginValue(e.target.value)} autoFocus />
        </label>
        {error && <p className="calcmsg bad" role="alert">{t(error)}</p>}
        <button className="btn primary" type="submit" disabled={busy || !loginValue.trim()}>{t('Kod yuborish')}</button>
        <p className="login-switch"><button type="button" className="linkish" onClick={() => go('login')}>{t('Kirish sahifasiga qaytish')}</button></p>
      </form>
    );
  }

  return (
    <form className="card login-card" onSubmit={reset} noValidate>
      <h2>{t('Yangi parol')}</h2>
      {info && <p className="login-note">{t(info)}</p>}
      <label className="fld"><span>{t('Emaildagi kod')}</span>
        <input className="code-input" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required
          value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} autoFocus placeholder="••••••" />
      </label>
      <PasswordPair value={pw} onChange={setPw} label="Yangi parol" />
      {error && <p className="calcmsg bad" role="alert">{t(error)}</p>}
      <button className="btn primary" type="submit" disabled={busy || code.length !== 6 || !pairReady(pw)}>{t('Parolni saqlash va kirish')}</button>
      <p className="login-switch">
        {t('Kod kelmadimi?')} <button type="button" className="linkish" disabled={busy} onClick={() => send()}>{t('Qayta yuborish')}</button>
      </p>
      <p className="login-switch"><button type="button" className="linkish" onClick={() => go('login')}>{t('Kirish sahifasiga qaytish')}</button></p>
    </form>
  );
}

export default function LoginPage() {
  const { t, lang, setLang } = useI18n();
  const { signup } = useAuth();
  const [view, setView] = useState({ mode: 'login', login: '' });
  const go = (mode, login = '') => setView({ mode, login });
  const mode = view.mode === 'register' && !signup ? 'login' : view.mode;
  const subtitle = { login: 'Hisobga kiring', register: 'Yangi hisob oching', forgot: 'Parolni tiklash' }[mode];

  return (
    <div className="login">
      <div className="band">
        <div className="wrap">
          <header className="hdr">
            <span className="mark" aria-hidden="true"><BrandMark /></span>
            <div className="htxt"><h1>MBM Trucking</h1><p>{t(subtitle)}</p></div>
            <div className="hdr-tools">
              <button className="tool" type="button" onClick={() => setLang(lang === 'en' ? 'uz' : 'en')}>{lang === 'en' ? 'UZ' : 'EN'}</button>
            </div>
          </header>
        </div>
      </div>
      <main className="wrap">
        {mode === 'register' && <RegisterForm go={go} />}
        {mode === 'forgot' && <ForgotForm go={go} initialLogin={view.login} />}
        {mode === 'login' && <LoginForm go={go} />}
      </main>
    </div>
  );
}
