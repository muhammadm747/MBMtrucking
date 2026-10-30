import { useState } from 'react';
import { endpoints } from '../api/client.js';
import { useI18n } from '../i18n/index.jsx';
import { authError } from '../lib/authErrors.js';
import { useAuth } from '../state/AuthContext.jsx';
import { useToast } from '../state/ToastContext.jsx';

/** One settings line: label and current value, with its edit form opening underneath. */
function Row({ label, value, muted, open, onToggle, children }) {
  const { t } = useI18n();
  return (
    <div className={'acc-row' + (open ? ' open' : '')}>
      <div className="acc-line">
        <div className="acc-info">
          <span>{label}</span>
          <b className={muted ? 'muted' : ''}>{value}</b>
        </div>
        <button className="acc-edit" type="button" aria-expanded={open} onClick={onToggle}>
          {t(open ? 'Bekor qilish' : "O'zgartirish")}
        </button>
      </div>
      {open && children}
    </div>
  );
}

function EmailForm({ onDone }) {
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
      onDone();
    } catch (err) {
      setError(authError(err, ['email']));
      setBusy(false);
    }
  }

  return (
    <form className="acc-form" onSubmit={save} noValidate>
      <label className="fld"><span>{t('Yangi email')}</span>
        <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoFocus />
      </label>
      <p className="hint">{t('Parolni tiklash kodi shu manzilga yuboriladi, xatosiz yozilganini tekshiring.')}</p>
      {error && <p className="calcmsg bad" role="alert">{t(error)}</p>}
      <div className="actions"><button className="btn primary" type="submit" disabled={busy || !changed}>{t('Saqlash')}</button></div>
    </form>
  );
}

function PasswordForm({ onDone }) {
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
      toast("Parol o'zgartirildi");
      onDone();
    } catch (err) {
      setError(authError(err, ['current_password', 'new_password']));
      setBusy(false);
    }
  }

  return (
    <form className="acc-form" onSubmit={save} noValidate>
      <label className="fld"><span>{t('Hozirgi parol')}</span>
        <input type="password" autoComplete="current-password" value={f.current} onChange={set('current')} autoFocus />
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
      <div className="actions"><button className="btn primary" type="submit" disabled={busy || !ready}>{t('Saqlash')}</button></div>
    </form>
  );
}

export default function AccountPage() {
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(null);
  const toggle = (name) => setOpen((cur) => (cur === name ? null : name));
  const close = () => setOpen(null);

  return (
    <section className="panel acc">
      <div className="card acc-card">
        <header className="acc-head">
          <span className="acct-avatar" aria-hidden="true">{user.username.slice(0, 1).toUpperCase()}</span>
          <div className="acc-id">
            <h2>{user.username}</h2>
            <small>{t('Akkaunt sozlamalari')}</small>
          </div>
        </header>

        <Row label="Email" value={user.email || t('Email kiritilmagan')} muted={!user.email}
          open={open === 'email'} onToggle={() => toggle('email')}>
          <EmailForm onDone={close} />
        </Row>
        <Row label={t('Parol')} value="••••••••"
          open={open === 'password'} onToggle={() => toggle('password')}>
          <PasswordForm onDone={close} />
        </Row>

        <footer className="acc-foot">
          <button className="btn" type="button" onClick={logout}>{t('Boshqa akkauntga kirish')}</button>
          <button className="btn acc-out" type="button" onClick={logout}>{t('Chiqish')}</button>
        </footer>
      </div>
    </section>
  );
}
