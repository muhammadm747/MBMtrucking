import { useState } from 'react';
import { endpoints } from '../api/client.js';
import { useI18n } from '../i18n/index.jsx';
import { authError } from '../lib/authErrors.js';
import { useAuth } from '../state/AuthContext.jsx';
import { useToast } from '../state/ToastContext.jsx';

function ProfileCard() {
  const { t } = useI18n();
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState(user.email || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const changed = email.trim() !== (user.email || '');

  async function save(e) {
    e.preventDefault();
    if (busy || !changed) return;
    setBusy(true);
    setError('');
    try {
      await updateProfile({ email: email.trim() });
      toast('Saqlandi');
    } catch (err) {
      setError(authError(err, ['email']));
    }
    setBusy(false);
  }

  return (
    <form className="card" onSubmit={save} noValidate>
      <div className="sech"><h2>{t('Profil')}</h2></div>
      <label className="fld"><span>{t('Login')}</span>
        <input type="text" value={user.username} readOnly disabled />
      </label>
      <label className="fld"><span>Email</span>
        <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
      </label>
      {!user.email && <p className="hint">{t("Email kiriting: parolni unutsangiz, tiklash kodi shu manzilga yuboriladi.")}</p>}
      {error && <p className="calcmsg bad" role="alert">{t(error)}</p>}
      <div className="actions"><button className="btn primary" type="submit" disabled={busy || !changed}>{t('Saqlash')}</button></div>
    </form>
  );
}

function PasswordCard() {
  const { t } = useI18n();
  const toast = useToast();
  const [f, setF] = useState({ current: '', password: '', password2: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const mismatch = f.password2 !== '' && f.password !== f.password2;
  const ready = f.current && f.password.length >= 8 && f.password === f.password2;

  async function save(e) {
    e.preventDefault();
    if (busy || !ready) return;
    setBusy(true);
    setError('');
    try {
      await endpoints.changePassword({ current_password: f.current, new_password: f.password });
      setF({ current: '', password: '', password2: '' });
      toast("Parol o'zgartirildi");
    } catch (err) {
      setError(authError(err, ['current_password', 'new_password']));
    }
    setBusy(false);
  }

  return (
    <form className="card" onSubmit={save} noValidate>
      <div className="sech"><h2>{t("Parolni o'zgartirish")}</h2></div>
      <label className="fld"><span>{t('Hozirgi parol')}</span>
        <input type="password" autoComplete="current-password" value={f.current} onChange={set('current')} />
      </label>
      <div className="row2 stack-sm">
        <label className="fld"><span>{t('Yangi parol')} <small>({t('kamida 8 belgi')})</small></span>
          <input type="password" autoComplete="new-password" value={f.password} onChange={set('password')} />
        </label>
        <label className="fld"><span>{t('Parolni takrorlang')}</span>
          <input type="password" autoComplete="new-password" value={f.password2} onChange={set('password2')} aria-invalid={mismatch} />
        </label>
      </div>
      {(error || mismatch) && <p className="calcmsg bad" role="alert">{t(error || 'Parollar bir xil emas.')}</p>}
      <div className="actions"><button className="btn primary" type="submit" disabled={busy || !ready}>{t("Parolni o'zgartirish")}</button></div>
    </form>
  );
}

export default function AccountPage() {
  const { t } = useI18n();
  const { user, logout } = useAuth();
  return (
    <section className="panel">
      <ProfileCard key={user.email} />
      <PasswordCard />
      <div className="card">
        <div className="sech"><h2>{t('Kirish')}</h2></div>
        <p className="hint">{t('Kirgan: {x}', { x: user.username })}. {t("Boshqa akkauntga kirish uchun shu akkauntdan chiqasiz va boshqa login hamda parolni kiritasiz. Ma'lumotlaringiz serverda saqlanib qoladi.")}</p>
        <div className="actions">
          <button className="btn" type="button" onClick={logout}>{t('Boshqa akkauntga kirish')}</button>
          <button className="btn" type="button" onClick={logout}>{t('Chiqish')}</button>
        </div>
      </div>
    </section>
  );
}
