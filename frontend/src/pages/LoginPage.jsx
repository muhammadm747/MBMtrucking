import { useState } from 'react';
import { BrandMark } from '../components/Icons.jsx';
import { useI18n } from '../i18n/index.jsx';
import { useAuth } from '../state/AuthContext.jsx';

export default function LoginPage() {
  const { t, lang, setLang } = useI18n();
  const { login } = useAuth();
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
        : err.status === 0 || err.status >= 500 ?"Serverga ulanib bo'lmadi. Internetni tekshiring." : "Login yoki parol noto'g'ri");
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <div className="band">
        <div className="wrap">
          <header className="hdr">
            <span className="mark" aria-hidden="true"><BrandMark /></span>
            <div className="htxt"><h1>MBM Trucking</h1><p>{t('Hisobga kiring')}</p></div>
            <div className="hdr-tools">
              <button className="tool" type="button" onClick={() => setLang(lang === 'en' ? 'uz' : 'en')}>{lang === 'en' ? 'UZ' : 'EN'}</button>
            </div>
          </header>
        </div>
      </div>
      <main className="wrap">
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
        </form>
      </main>
    </div>
  );
}
